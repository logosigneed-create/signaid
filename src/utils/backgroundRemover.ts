export interface RemoveBackgroundOptions {
  type?: 'subject' | 'logo';
  applyBottomFade?: boolean;
  tolerance?: number;
}

/**
 * Traitement local de détourage haute performance via Canvas 2D HTML5.
 * Utilisé en repli local (fallback) immédiat lorsque l'API distante (/api/segment-subject)
 * renvoie une erreur ou est indisponible.
 */
export async function removeBackgroundWithCanvas(
  imageSrc: string,
  options: RemoveBackgroundOptions = {}
): Promise<string> {
  const { type = 'subject', applyBottomFade = false, tolerance = 38 } = options;

  if (!imageSrc) return imageSrc;

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageSrc;

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          resolve(imageSrc);
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;
        const width = canvas.width;
        const height = canvas.height;
        const totalPixels = width * height;

        // 1. Échantillonnage du périmètre étendu pour identifier la teinte du fond (fond blanc pur cyclorama, sombre ou unie)
        const sampleCoords: [number, number][] = [];
        const sampleSteps = 8;
        for (let s = 0; s <= sampleSteps; s++) {
          const sx = Math.round((s / sampleSteps) * (width - 1));
          const sy = Math.round((s / sampleSteps) * (height - 1));
          sampleCoords.push([sx, 0]);
          sampleCoords.push([sx, height - 1]);
          sampleCoords.push([0, sy]);
          sampleCoords.push([width - 1, sy]);
        }

        let sumR = 0;
        let sumG = 0;
        let sumB = 0;
        let validSamples = 0;

        for (const [cx, cy] of sampleCoords) {
          const cIdx = (cy * width + cx) * 4;
          const a = data[cIdx + 3];
          if (a > 20) {
            sumR += data[cIdx];
            sumG += data[cIdx + 1];
            sumB += data[cIdx + 2];
            validSamples++;
          }
        }

        const avgR = validSamples > 0 ? sumR / validSamples : 255;
        const avgG = validSamples > 0 ? sumG / validSamples : 255;
        const avgB = validSamples > 0 ? sumB / validSamples : 255;
        const cornerLum = 0.299 * avgR + 0.587 * avgG + 0.114 * avgB;
        const isPureWhiteStudio = avgR >= 235 && avgG >= 235 && avgB >= 235;
        const isDarkBg = cornerLum < 45;
        const isLightBg = cornerLum > 175;

        // 2. Inondation (Flood Fill / BFS) à partir des bordures extérieures
        // Protège rigoureusement les hautes lumières du sujet (dents, reflets, peau, vêtements clairs)
        const visited = new Uint8Array(totalPixels);
        const queue: number[] = [];
        let removedPixels = 0;

        const isBgPixel = (r: number, g: number, b: number, a: number): boolean => {
          if (a < 20) return true; // Déjà transparent

          const maxDiff = Math.max(Math.abs(r - g), Math.abs(r - b), Math.abs(g - b));

          // Cas A : Fond blanc pur studio (#FFFFFF cyclorama / RGB > 240)
          if (isPureWhiteStudio) {
            // Strictement RGB > 240 et neutralité chromatique (maxDiff <= 18)
            // Évite formellement de ronger les hautes lumières cutanées (chaudes) ou textiles
            if (r >= 240 && g >= 240 && b >= 240 && maxDiff <= 18) return true;
            // Zone de transition douce le long des contours
            if (r >= 232 && g >= 232 && b >= 232 && maxDiff <= 14) return true;
            return false;
          }

          // CLOISONNEMENT STRICT : Pour le Sujet humain (type === 'subject'), interdiction formelle
          // d'effacer les noirs (vêtements sombres, bonnets, lunettes, cheveux).
          // Ne jamais hériter de la logique « Noirs Découpés » du Logo !
          if (type === 'subject') {
            return false;
          }

          const lum = 0.299 * r + 0.587 * g + 0.114 * b;

          // Cas B : Fond sombre / logo sur fond noir (« Noirs Découpés » strictement réservé au calque Logo)
          if (isDarkBg && lum < 45) return true;
          if (lum < 28) return true;

          // Cas C : Fond studio clair standard
          if (isLightBg) {
            if (r >= 240 && g >= 240 && b >= 240 && maxDiff <= 18) return true;
            if (lum > 225 && maxDiff < 20) return true;
          }

          // Teinte proche de la moyenne des bordures
          const dr = r - avgR;
          const dg = g - avgG;
          const db = b - avgB;
          const dist = Math.sqrt(dr * dr + dg * dg + db * db);
          return dist <= (isLightBg ? Math.min(tolerance, 36) : tolerance);
        };

        const addIfBg = (x: number, y: number) => {
          const idx = y * width + x;
          if (visited[idx]) return;
          visited[idx] = 1;

          const pIdx = idx * 4;
          const r = data[pIdx];
          const g = data[pIdx + 1];
          const b = data[pIdx + 2];
          const a = data[pIdx + 3];

          if (isBgPixel(r, g, b, a)) {
            queue.push(idx);
          }
        };

        // Amorçage strictement sur les 4 bordures extérieures
        for (let x = 0; x < width; x++) {
          addIfBg(x, 0);
          addIfBg(x, height - 1);
        }
        for (let y = 0; y < height; y++) {
          addIfBg(0, y);
          addIfBg(width - 1, y);
        }

        while (queue.length > 0) {
          const idx = queue.pop()!;
          const pIdx = idx * 4;
          const r = data[pIdx];
          const g = data[pIdx + 1];
          const b = data[pIdx + 2];

          if (isPureWhiteStudio) {
            const minVal = Math.min(r, g, b);
            if (minVal >= 242) {
              data[pIdx + 3] = 0; // Transparence totale sur fond blanc pur
            } else {
              // Adoucissement anti-crénelage progressif aux abords immédiats du sujet
              const softAlpha = Math.max(0, Math.min(255, Math.round(((242 - minVal) / 10) * 255)));
              data[pIdx + 3] = softAlpha;
            }
          } else {
            data[pIdx + 3] = 0; // Transparence alpha
          }
          removedPixels++;

          const x = idx % width;
          const y = Math.floor(idx / width);

          if (x > 0) addIfBg(x - 1, y);
          if (x < width - 1) addIfBg(x + 1, y);
          if (y > 0) addIfBg(x, y - 1);
          if (y < height - 1) addIfBg(x, y + 1);
        }

        // Si BFS n'a rien retiré ou moins de 2%, repli sécurisé sans ronger les hautes lumières
        if (removedPixels < totalPixels * 0.02 && isPureWhiteStudio) {
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const maxDiff = Math.max(Math.abs(r - g), Math.abs(r - b), Math.abs(g - b));
            // Tolérance stricte fond blanc pur (RGB > 245, maxDiff <= 10) pour préserver les yeux et reflets
            if (r >= 246 && g >= 246 && b >= 246 && maxDiff <= 10) {
              data[i + 3] = 0;
              removedPixels++;
            }
          }
        }

        // Sécurité : si aucun pixel n'a été retiré ou si > 95% a été effacé,
        // conserver l'image originale sans altération
        if (removedPixels === 0 || removedPixels > totalPixels * 0.95) {
          resolve(imageSrc);
          return;
        }

        // 3. Traitement automatisé des bords du sujet (Defringe : Érosion 1px + Blur 0.5px)
        if (type === 'subject') {
          const alphaChannel = new Uint8ClampedArray(totalPixels);
          for (let i = 0; i < data.length; i += 4) {
            alphaChannel[i / 4] = data[i + 3];
          }

          // Étape A : Érosion de masque de 1px sur le canal alpha pour éliminer les résidus blancs/clairs
          const erodedAlpha = new Uint8ClampedArray(alphaChannel);
          for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
              const idx = y * width + x;
              if (alphaChannel[idx] > 0) {
                let minA = alphaChannel[idx];
                minA = Math.min(minA, alphaChannel[idx - 1]);
                minA = Math.min(minA, alphaChannel[idx + 1]);
                minA = Math.min(minA, alphaChannel[idx - width]);
                minA = Math.min(minA, alphaChannel[idx + width]);
                erodedAlpha[idx] = minA;
              }
            }
          }

          // Étape B : Adoucissement léger des contours (blur 0.5px) pour éviter les découpes dures d'emporte-pièce
          const smoothedAlpha = new Uint8ClampedArray(erodedAlpha);
          for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
              const idx = y * width + x;
              if (erodedAlpha[idx] > 0 && erodedAlpha[idx] < 255) {
                const sum =
                  erodedAlpha[idx] * 4 +
                  (erodedAlpha[idx - 1] + erodedAlpha[idx + 1] + erodedAlpha[idx - width] + erodedAlpha[idx + width]) * 2 +
                  (erodedAlpha[idx - width - 1] + erodedAlpha[idx - width + 1] + erodedAlpha[idx + width - 1] + erodedAlpha[idx + width + 1]) * 1;
                smoothedAlpha[idx] = Math.round(sum / 16);
              }
            }
          }

          for (let i = 0; i < data.length; i += 4) {
            data[i + 3] = smoothedAlpha[i / 4];
          }
        }

        // 4. Préservation de l'opacité à 100% : aucun fondu destructeur sur le torse ou les bras
        // La lisibilité des textes inférieurs est assurée par le calque Scrim de contraste dédié

        ctx.putImageData(imgData, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch (procErr) {
        console.warn('[removeBackgroundWithCanvas] Erreur traitement local :', procErr);
        resolve(imageSrc);
      }
    };

    img.onerror = () => {
      resolve(imageSrc);
    };
  });
}

export interface ChromakeyOptions {
  contiguous?: boolean;
  startX?: number;
  startY?: number;
  floodFromCorners?: boolean;
}

/**
 * Détourage interactif sur mesure par Pipette / Chroma Key (Color Keying)
 * Permet de retirer n'importe quelle couleur (blanc, noir, vert, etc.)
 * avec calcul de distance euclidienne et inondation contiguë (Flood-Fill BFS)
 * pour ne jamais vider l'intérieur du corps (ex: t-shirt noir sur fond noir).
 */
export async function applyChromakey(
  imageSrc: string,
  targetColor: { r: number; g: number; b: number },
  tolerance: number = 20,
  options: ChromakeyOptions = {}
): Promise<string> {
  const {
    contiguous = true,
    startX,
    startY,
    floodFromCorners = true,
  } = options;

  if (!imageSrc) return imageSrc;

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageSrc;

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const width = img.naturalWidth || img.width;
        const height = img.naturalHeight || img.height;
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          resolve(imageSrc);
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0);

        const imgData = ctx.getImageData(0, 0, width, height);
        const data = imgData.data;
        const totalPixels = width * height;

        // Tolérance (0 à 100) mappée sur l'espace de distance RGB
        // Plage dynamique progressive adaptée (0 à 320) pour capturer les nuances et dégradés
        const maxDist = Math.max(6, tolerance * 3.2);
        const featherRange = Math.min(16, maxDist * 0.25);
        const minDist = Math.max(0, maxDist - featherRange);

        const isMatch = (r: number, g: number, b: number, a: number): boolean => {
          if (a < 15) return true; // Déjà transparent
          const dr = r - targetColor.r;
          const dg = g - targetColor.g;
          const db = b - targetColor.b;
          const dist = Math.sqrt(dr * dr + dg * dg + db * db);
          return dist <= maxDist;
        };

        const computeAlpha = (r: number, g: number, b: number, existingAlpha: number = 255): number => {
          if (existingAlpha === 0) return 0; // Conservation stricte de la transparence acquise
          const dr = r - targetColor.r;
          const dg = g - targetColor.g;
          const db = b - targetColor.b;
          const dist = Math.sqrt(dr * dr + dg * dg + db * db);
          if (dist <= minDist) return 0; // Transparence totale
          if (dist >= maxDist) return existingAlpha;
          // Adoucissement linéaire sur la bordure de transition
          const feathered = Math.round(((dist - minDist) / (maxDist - minDist)) * 255);
          return Math.min(existingAlpha, feathered);
        };

        if (contiguous) {
          // BFS Flood-fill : Ne propage la découpe que depuis les zones connectées
          const visited = new Uint8Array(totalPixels);
          const queue: number[] = [];

          const tryEnqueue = (x: number, y: number) => {
            if (x < 0 || x >= width || y < 0 || y >= height) return;
            const idx = y * width + x;
            if (visited[idx]) return;
            visited[idx] = 1;

            const pIdx = idx * 4;
            if (isMatch(data[pIdx], data[pIdx + 1], data[pIdx + 2], data[pIdx + 3])) {
              queue.push(idx);
            }
          };

          // 1. Amorçage depuis le point cliqué par la pipette
          if (typeof startX === 'number' && typeof startY === 'number') {
            const sx = Math.max(0, Math.min(width - 1, Math.round(startX)));
            const sy = Math.max(0, Math.min(height - 1, Math.round(startY)));
            tryEnqueue(sx, sy);
          }

          // 2. Amorçage depuis les bordures extérieures
          if (floodFromCorners || queue.length === 0) {
            // Bordure supérieure complète (le ciel / haut du studio est toujours du fond)
            for (let x = 0; x < width; x += 2) {
              tryEnqueue(x, 0);
            }
            // Bordures latérales gauche et droite
            for (let y = 0; y < height; y += 2) {
              tryEnqueue(0, y);
              tryEnqueue(width - 1, y);
            }
            // Coins inférieurs uniquement (protège le corps/torse qui touche le bas)
            tryEnqueue(0, height - 1);
            tryEnqueue(width - 1, height - 1);
          }

          // 3. Repli automatique si aucun point connecté n'a été trouvé
          if (queue.length === 0) {
            for (let i = 0; i < totalPixels; i++) {
              const pIdx = i * 4;
              if (isMatch(data[pIdx], data[pIdx + 1], data[pIdx + 2], data[pIdx + 3])) {
                data[pIdx + 3] = computeAlpha(data[pIdx], data[pIdx + 1], data[pIdx + 2], data[pIdx + 3]);
              }
            }
          }

          let head = 0;
          while (head < queue.length) {
            const idx = queue[head++];
            const pIdx = idx * 4;
            const r = data[pIdx];
            const g = data[pIdx + 1];
            const b = data[pIdx + 2];

            data[pIdx + 3] = computeAlpha(r, g, b, data[pIdx + 3]);

            const x = idx % width;
            const y = Math.floor(idx / width);

            // 4 directions cardinales
            tryEnqueue(x - 1, y);
            tryEnqueue(x + 1, y);
            tryEnqueue(x, y - 1);
            tryEnqueue(x, y + 1);
          }
        } else {
          // Mode non-contigu : efface tous les pixels de l'image correspondant à la couleur
          for (let i = 0; i < totalPixels; i++) {
            const pIdx = i * 4;
            const r = data[pIdx];
            const g = data[pIdx + 1];
            const b = data[pIdx + 2];
            const a = data[pIdx + 3];

            if (isMatch(r, g, b, a)) {
              data[pIdx + 3] = computeAlpha(r, g, b, a);
            }
          }
        }

        ctx.putImageData(imgData, 0, 0);

        // Export WebP transparent (< 500 Ko) avec repli PNG
        let output = canvas.toDataURL('image/webp', 0.88);
        if (!output.startsWith('data:image/webp') || output.length > 500 * 1024) {
          output = canvas.toDataURL('image/png');
        }
        resolve(output);
      } catch (err) {
        console.warn('[applyChromakey] Erreur lors du chroma key :', err);
        resolve(imageSrc);
      }
    };

    img.onerror = () => resolve(imageSrc);
  });
}

export interface RemovedColorItem {
  id: string;
  r: number;
  g: number;
  b: number;
  tolerance: number;
  startX?: number;
  startY?: number;
  isContiguous?: boolean;
}

/**
 * Détourage cumulatif multi-teintes par Pipette / Chroma Key.
 * Permet de supprimer successivement plusieurs couleurs et nuances (fond blanc, puis ombres grises, puis reflets)
 * sans jamais réinitialiser ni dégrader les zones déjà rendues transparentes.
 * Traite l'ensemble de la liste en un seul passage en mémoire à partir de la photo source d'origine.
 */
export async function applyCumulativeChromakey(
  rawImageSrc: string,
  colorItems: RemovedColorItem[],
  defaultOptions: { floodFromCorners?: boolean } = {}
): Promise<string> {
  if (!rawImageSrc) return rawImageSrc;
  if (!colorItems || colorItems.length === 0) return rawImageSrc;

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = rawImageSrc;

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const width = img.naturalWidth || img.width;
        const height = img.naturalHeight || img.height;
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          resolve(rawImageSrc);
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0);

        const imgData = ctx.getImageData(0, 0, width, height);
        const data = imgData.data;
        const totalPixels = width * height;

        // Application successive de chaque teinte de la liste dans le même buffer
        for (const item of colorItems) {
          const { r: tr, g: tg, b: tb, tolerance, startX, startY, isContiguous = true } = item;
          const maxDist = Math.max(6, tolerance * 3.2);
          const featherRange = Math.min(16, maxDist * 0.25);
          const minDist = Math.max(0, maxDist - featherRange);

          const isMatch = (r: number, g: number, b: number, a: number): boolean => {
            if (a < 15) return true; // Déjà transparent : le flood-fill peut circuler librement
            const dr = r - tr;
            const dg = g - tg;
            const db = b - tb;
            const dist = Math.sqrt(dr * dr + dg * dg + db * db);
            return dist <= maxDist;
          };

          const computeAlpha = (r: number, g: number, b: number, existingAlpha: number): number => {
            if (existingAlpha === 0) return 0; // Conservation stricte de la transparence acquise
            const dr = r - tr;
            const dg = g - tg;
            const db = b - tb;
            const dist = Math.sqrt(dr * dr + dg * dg + db * db);
            if (dist <= minDist) return 0;
            if (dist >= maxDist) return existingAlpha;
            const feathered = Math.round(((dist - minDist) / (maxDist - minDist)) * 255);
            return Math.min(existingAlpha, feathered);
          };

          if (isContiguous) {
            const visited = new Uint8Array(totalPixels);
            const queue: number[] = [];

            const tryEnqueue = (x: number, y: number) => {
              if (x < 0 || x >= width || y < 0 || y >= height) return;
              const idx = y * width + x;
              if (visited[idx]) return;
              visited[idx] = 1;

              const pIdx = idx * 4;
              if (isMatch(data[pIdx], data[pIdx + 1], data[pIdx + 2], data[pIdx + 3])) {
                queue.push(idx);
              }
            };

            // 1. Amorçage depuis le point cliqué pour cette teinte
            if (typeof startX === 'number' && typeof startY === 'number') {
              const sx = Math.max(0, Math.min(width - 1, Math.round(startX)));
              const sy = Math.max(0, Math.min(height - 1, Math.round(startY)));
              tryEnqueue(sx, sy);
            }

            // 2. Amorçage depuis les bordures si aucun point ou pour compléter
            if (defaultOptions.floodFromCorners !== false || queue.length === 0) {
              for (let x = 0; x < width; x += 2) tryEnqueue(x, 0);
              for (let y = 0; y < height; y += 2) {
                tryEnqueue(0, y);
                tryEnqueue(width - 1, y);
              }
              tryEnqueue(0, height - 1);
              tryEnqueue(width - 1, height - 1);
            }

            // 3. Repli automatique
            if (queue.length === 0) {
              for (let i = 0; i < totalPixels; i++) {
                const pIdx = i * 4;
                if (isMatch(data[pIdx], data[pIdx + 1], data[pIdx + 2], data[pIdx + 3])) {
                  data[pIdx + 3] = computeAlpha(data[pIdx], data[pIdx + 1], data[pIdx + 2], data[pIdx + 3]);
                }
              }
            }

            let head = 0;
            while (head < queue.length) {
              const idx = queue[head++];
              const pIdx = idx * 4;
              const r = data[pIdx];
              const g = data[pIdx + 1];
              const b = data[pIdx + 2];
              data[pIdx + 3] = computeAlpha(r, g, b, data[pIdx + 3]);

              const x = idx % width;
              const y = Math.floor(idx / width);
              tryEnqueue(x - 1, y);
              tryEnqueue(x + 1, y);
              tryEnqueue(x, y - 1);
              tryEnqueue(x, y + 1);
            }
          } else {
            // Mode non-contigu : efface tous les pixels correspondants
            for (let i = 0; i < totalPixels; i++) {
              const pIdx = i * 4;
              const r = data[pIdx];
              const g = data[pIdx + 1];
              const b = data[pIdx + 2];
              const a = data[pIdx + 3];
              if (isMatch(r, g, b, a)) {
                data[pIdx + 3] = computeAlpha(r, g, b, a);
              }
            }
          }
        }

        ctx.putImageData(imgData, 0, 0);

        // Export PNG pour garantir la préservation absolue du canal Alpha sans artefact de compression
        const output = canvas.toDataURL('image/png');
        resolve(output);
      } catch (err) {
        console.warn('[applyCumulativeChromakey] Erreur lors du chroma key cumulatif :', err);
        resolve(rawImageSrc);
      }
    };

    img.onerror = () => resolve(rawImageSrc);
  });
}
