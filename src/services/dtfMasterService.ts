import { getFunctions, httpsCallable } from 'firebase/functions';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { app } from '../firebaseConfig';
import jsPDF from 'jspdf';

export interface DtfOptions {
  targetDimension?: number;
  dpi?: number;
  alphaThreshold?: number;
  trimThreshold?: number;
  enhanceContrast?: boolean;
  sharpenAmount?: boolean;
}

export interface DtfMasterResult {
  success: boolean;
  masterUrl: string;
  pngUrl?: string;
  pdfUrl?: string;
  pngBase64?: string;
  pdfBase64?: string;
  width: number;
  height: number;
  dpi: number;
  sizePngBytes?: number;
  sizePdfBytes?: number;
}

export interface MockupSuiteResult {
  tshirtFront: string;
  poloFront: string;
  hoodieFront: string;
  tshirtBack?: string;
  poloBack?: string;
  hoodieBack?: string;
}

/**
 * Traite un logo ou extrait de flyer pour générer un fichier Master DTF 300 DPI (PNG Transparent & PDF Haute Définition)
 */
export async function cleanAndProcessDtfMaster(
  imageInput: string,
  options: DtfOptions = {},
  uid?: string
): Promise<DtfMasterResult> {
  if (!imageInput) {
    throw new Error("L'image d'entrée est vide.");
  }

  // 1. Récupération du token Auth de l'utilisateur connecté ou initialisation
  const auth = getAuth(app);
  let authToken: string | undefined = undefined;
  try {
    if (!auth.currentUser) {
      // Attendre l'état onAuthStateChanged initial
      await new Promise<void>((resolve) => {
        const unsub = auth.onAuthStateChanged(() => {
          unsub();
          resolve();
        });
        setTimeout(() => { unsub(); resolve(); }, 1200);
      });
    }

    if (!auth.currentUser) {
      try {
        await signInAnonymously(auth);
      } catch (authErr) {
        console.warn("[DTF Master] Anonymous auth fallback:", authErr);
      }
    }

    if (auth.currentUser) {
      authToken = await auth.currentUser.getIdToken(false);
    }
  } catch (tokenErr) {
    console.warn("[DTF Master] Auth token acquisition notice:", tokenErr);
  }

  // 2. Tenter le traitement haute précision Sharp + Potrace via Cloud Function
  try {
    const functions = getFunctions(app, 'us-central1');
    const processDtf = httpsCallable<any, DtfMasterResult>(functions, 'processDtfMaster');

    const res = await processDtf({
      imageInput,
      authToken,
      token: authToken,
      options: {
        targetDimension: options.targetDimension || 4000,
        dpi: options.dpi || 300,
        alphaThreshold: options.alphaThreshold || 40,
        trimThreshold: options.trimThreshold || 5,
        enhanceContrast: options.enhanceContrast !== false,
        sharpenAmount: options.sharpenAmount !== false
      },
      uid: uid || (auth.currentUser ? auth.currentUser.uid : 'master')
    });

    if (res.data && res.data.success) {
      return res.data;
    }
  } catch (backendErr: any) {
    // Si erreur 401 ou 500, journaliser une seule fois et basculer sur le canvas client (sans boucle)
    console.warn("[DTF Master] Backend processing notice (fallback to high-res client canvas):", backendErr?.message || backendErr);
  }

  // 3. Fallback Prépresse Canvas Client (Anti-Halo, Trimming & Génération PDF)
  return await processClientCanvasDtfMaster(imageInput, options);
}

/**
 * Fallback Canvas Client-Side Haute Résolution pour l'anti-bavure Alpha, l'auto-trim et l'export PDF
 */
async function processClientCanvasDtfMaster(
  imageInput: string,
  options: DtfOptions = {}
): Promise<DtfMasterResult> {
  const alphaThreshold = options.alphaThreshold || 40;
  const targetDimension = options.targetDimension || 4000;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const offCanvas = document.createElement('canvas');
        offCanvas.width = img.naturalWidth || img.width;
        offCanvas.height = img.naturalHeight || img.height;
        const ctx = offCanvas.getContext('2d');
        if (!ctx) return reject(new Error('Contexte 2D indisponible'));

        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, offCanvas.width, offCanvas.height);
        const d = imgData.data;

        // Détection du fond blanc ou noir
        let cornerWhite = 0, cornerBlack = 0;
        const corners = [0, (offCanvas.width - 1) * 4, (offCanvas.height - 1) * offCanvas.width * 4];
        corners.forEach(idx => {
          if (d[idx + 3] > 50) {
            if (d[idx] > 220 && d[idx + 1] > 220 && d[idx + 2] > 220) cornerWhite++;
            if (d[idx] < 40 && d[idx + 1] < 40 && d[idx + 2] < 40) cornerBlack++;
          }
        });

        const isWhiteBg = cornerWhite >= 2;
        const isBlackBg = cornerBlack >= 2;

        let minX = offCanvas.width, minY = offCanvas.height, maxX = 0, maxY = 0;
        let hasContent = false;

        // Seuil Alpha anti-halo, suppression du fond et calcul de la Bounding Box
        for (let y = 0; y < offCanvas.height; y++) {
          for (let x = 0; x < offCanvas.width; x++) {
            const idx = (y * offCanvas.width + x) * 4;
            const r = d[idx], g = d[idx + 1], b = d[idx + 2];
            const a = d[idx + 3];
            const lum = 0.299 * r + 0.587 * g + 0.114 * b;

            let isBg = false;
            if (isWhiteBg && lum > 215 && Math.abs(r - g) < 25 && Math.abs(g - b) < 25) isBg = true;
            if (isBlackBg && lum < 35 && r < 40 && g < 40 && b < 40) isBg = true;

            if (a < alphaThreshold || isBg) {
              d[idx] = 0;
              d[idx + 1] = 0;
              d[idx + 2] = 0;
              d[idx + 3] = 0;
            } else {
              hasContent = true;
              if (a > 200) d[idx + 3] = 255;
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
            }
          }
        }

        ctx.putImageData(imgData, 0, 0);

        if (!hasContent) {
          minX = 0;
          minY = 0;
          maxX = offCanvas.width;
          maxY = offCanvas.height;
        }

        const trimmedW = Math.max(1, maxX - minX + 1);
        const trimmedH = Math.max(1, maxY - minY + 1);

        // Canvas Master Haute Définition
        const masterCanvas = document.createElement('canvas');
        const scaleFactor = Math.min(targetDimension / trimmedW, targetDimension / trimmedH, 4);
        masterCanvas.width = Math.round(trimmedW * scaleFactor);
        masterCanvas.height = Math.round(trimmedH * scaleFactor);

        const masterCtx = masterCanvas.getContext('2d');
        if (!masterCtx) return reject(new Error('Contexte master indisponible'));

        masterCtx.imageSmoothingEnabled = true;
        masterCtx.imageSmoothingQuality = 'high';
        masterCtx.drawImage(
          offCanvas,
          minX, minY, trimmedW, trimmedH,
          0, 0, masterCanvas.width, masterCanvas.height
        );

        const pngBase64 = masterCanvas.toDataURL('image/png');

        // Générer le PDF client avec jsPDF (sans fond blanc)
        let pdfBase64 = '';
        try {
          const widthMm = (masterCanvas.width / 300) * 25.4;
          const heightMm = (masterCanvas.height / 300) * 25.4;
          const pdf = new jsPDF({
            orientation: widthMm > heightMm ? 'l' : 'p',
            unit: 'mm',
            format: [widthMm, heightMm]
          });
          pdf.addImage(pngBase64, 'PNG', 0, 0, widthMm, heightMm, undefined, 'FAST');
          pdfBase64 = pdf.output('datauristring');
        } catch (pdfErr) {
          console.warn("Client jsPDF generation notice:", pdfErr);
        }

        resolve({
          success: true,
          masterUrl: pngBase64,
          pngUrl: pngBase64,
          pdfUrl: pdfBase64 || undefined,
          pngBase64,
          pdfBase64: pdfBase64 || undefined,
          width: masterCanvas.width,
          height: masterCanvas.height,
          dpi: 300
        });
      } catch (e) {
        reject(e);
      }
    };

    img.onerror = () => reject(new Error("Impossible de charger l'image source"));
    img.src = imageInput;
  });
}

/**
 * Génère une maquette textile individuelle (T-Shirt, Polo, Hoodie) avec positionnement réaliste
 */
export async function generateGarmentMockup(
  garmentBaseUrl: string,
  logoUrl: string,
  type: 'tshirt' | 'polo' | 'hoodie' = 'tshirt'
): Promise<string> {
  if (!logoUrl) return garmentBaseUrl;

  return new Promise((resolve) => {
    const imgGarment = new Image();
    const imgLogo = new Image();
    imgGarment.crossOrigin = 'anonymous';
    imgLogo.crossOrigin = 'anonymous';

    let loaded = 0;
    const onLoaded = () => {
      loaded++;
      if (loaded < 2) return;

      try {
        const canvas = document.createElement('canvas');
        canvas.width = 1200;
        canvas.height = 1200;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(garmentBaseUrl);

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // 1. Fond Vêtement
        ctx.drawImage(imgGarment, 0, 0, 1200, 1200);

        // 2. Coordonnées & Échelle Textile Précise (VUE FACE : Cœur / Poitrine gauche)
        let posX = 0.63;
        let posY = 0.30;
        let scale = 0.18;

        if (type === 'polo') {
          posX = 0.64;
          posY = 0.32;
          scale = 0.16;
        } else if (type === 'hoodie') {
          posX = 0.63;
          posY = 0.34;
          scale = 0.18;
        }

        const logoW = canvas.width * scale;
        const logoH = logoW * (imgLogo.height / imgLogo.width);
        const logoX = (canvas.width * posX) - (logoW / 2);
        const logoY = (canvas.height * posY) - (logoH / 2);

        // 3. Ombre portée réaliste du flocage / sérigraphie
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetY = 4;
        ctx.drawImage(imgLogo, logoX, logoY, logoW, logoH);
        ctx.restore();

        resolve(canvas.toDataURL('image/png', 0.92));
      } catch (err) {
        console.warn('Mockup composition error:', err);
        resolve(garmentBaseUrl);
      }
    };

    imgGarment.onload = onLoaded;
    imgGarment.onerror = () => resolve(garmentBaseUrl);
    imgLogo.onload = onLoaded;
    imgLogo.onerror = () => resolve(garmentBaseUrl);

    imgGarment.src = garmentBaseUrl;
    imgLogo.src = logoUrl;
  });
}

/**
 * Rendu fidèle du logo textile - Strictement aucune typographie synthétique ajoutée.
 * Le vêtement affiche UNIQUEMENT le fichier image du logo importé/détouré via ctx.drawImage.
 * Ne déclenche aucun fallback textuel (nom du prospect, slug, marque) même pour un symbole ou une icône seule (ex: abeille).
 */
export const drawLogoOnGarment = generateGarmentMockup;
export const renderMockup = generateGarmentMockup;
export const generateMockup = generateGarmentMockup;



/**
 * Génère une maquette DOS (logo grand format centré au dos du vêtement)
 */
export async function generateGarmentMockupBack(
  garmentBaseUrl: string,
  logoUrl: string,
  type: 'tshirt' | 'polo' | 'hoodie' = 'tshirt'
): Promise<string> {
  if (!logoUrl) return garmentBaseUrl;

  return new Promise((resolve) => {
    const imgGarment = new Image();
    const imgLogo = new Image();
    imgGarment.crossOrigin = 'anonymous';
    imgLogo.crossOrigin = 'anonymous';

    let loaded = 0;
    const onLoaded = () => {
      loaded++;
      if (loaded < 2) return;

      try {
        const canvas = document.createElement('canvas');
        canvas.width = 1200;
        canvas.height = 1200;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(garmentBaseUrl);

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // 1. Fond Vêtement (dos)
        ctx.drawImage(imgGarment, 0, 0, 1200, 1200);

        // 2. Positionnement dos : logo grand format centré
        // T-shirt/Sweat : centré, haut du dos (~38%). Polo : centré (~40%). Hoodie : (~44%)
        let posX = 0.50;
        let posY = type === 'polo' ? 0.40 : (type === 'hoodie' ? 0.44 : 0.38);
        let scale = type === 'polo' ? 0.34 : (type === 'hoodie' ? 0.36 : 0.38);

        const logoW = canvas.width * scale;
        const logoH = logoW * (imgLogo.height / imgLogo.width);
        const logoX = (canvas.width * posX) - (logoW / 2);
        const logoY = (canvas.height * posY) - (logoH / 2);

        // 3. Ombre portée réaliste
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetY = 4;
        ctx.drawImage(imgLogo, logoX, logoY, logoW, logoH);
        ctx.restore();

        resolve(canvas.toDataURL('image/png', 0.92));
      } catch (err) {
        console.warn('Back mockup composition error:', err);
        resolve(garmentBaseUrl);
      }
    };

    imgGarment.onload = onLoaded;
    imgGarment.onerror = () => resolve(garmentBaseUrl);
    imgLogo.onload = onLoaded;
    imgLogo.onerror = () => resolve(garmentBaseUrl);

    imgGarment.src = garmentBaseUrl;
    imgLogo.src = logoUrl;
  });
}

/**
 * Génère la suite complète de 6 mockups aplatis (T-Shirt, Polo, Hoodie × FACE + DOS)
 */
export async function generateGarmentMockupSuite(
  logoFrontUrl: string,
  logoBackUrl?: string,
  isDark = true
): Promise<MockupSuiteResult> {
  const backLogo = logoBackUrl || logoFrontUrl;
  const tshirtBase = isDark ? '/assets/tshirt-black-JHK170.png' : '/assets/tshirt-black-JHK170.png';
  const poloBase = isDark ? '/assets/polo-black-JHK510.png' : '/assets/polo-black-JHK510.png';
  const hoodieBase = isDark ? '/assets/hoodie-black-JHK421.png' : '/assets/hoodie-black-JHK421.png';

  const tshirtBaseBack = '/assets/tshirt-black-JHK170-dos.png';
  const poloBaseBack = '/assets/polo-black-JHK510-dos.png';
  const hoodieBaseBack = '/assets/hoodie-black-JHK421-dos.png';

  const [tshirtFront, poloFront, hoodieFront, tshirtBack, poloBack, hoodieBack] = await Promise.all([
    generateGarmentMockup(tshirtBase, logoFrontUrl, 'tshirt'),
    generateGarmentMockup(poloBase, logoFrontUrl, 'polo'),
    generateGarmentMockup(hoodieBase, logoFrontUrl, 'hoodie'),
    generateGarmentMockupBack(tshirtBaseBack, backLogo, 'tshirt'),
    generateGarmentMockupBack(poloBaseBack, backLogo, 'polo'),
    generateGarmentMockupBack(hoodieBaseBack, backLogo, 'hoodie'),
  ]);

  return { tshirtFront, poloFront, hoodieFront, tshirtBack, poloBack, hoodieBack };
}

/**
 * Télécharge le fichier Master DTF PNG transparent 300 DPI
 */
export function downloadMasterDtfFile(
  masterUrlOrBase64: string,
  fileName = 'Master_DTF_300DPI.png'
) {
  const link = document.createElement('a');
  link.href = masterUrlOrBase64;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Télécharge le fichier Master DTF PDF Haute Définition
 */
export async function downloadMasterPdfFile(
  pngOrPdfInput: string,
  fileName = 'Master_DTF_Print.pdf'
) {
  if (pngOrPdfInput.startsWith('data:application/pdf') || pngOrPdfInput.endsWith('.pdf')) {
    const link = document.createElement('a');
    link.href = pngOrPdfInput;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return;
  }

  // Si on reçoit un PNG, générer instantanément le PDF d'impression aux dimensions 300 DPI
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const widthMm = (img.naturalWidth / 300) * 25.4;
      const heightMm = (img.naturalHeight / 300) * 25.4;
      const pdf = new jsPDF({
        orientation: widthMm > heightMm ? 'l' : 'p',
        unit: 'mm',
        format: [Math.max(10, widthMm), Math.max(10, heightMm)]
      });
      pdf.addImage(pngOrPdfInput, 'PNG', 0, 0, widthMm, heightMm, undefined, 'FAST');
      pdf.save(fileName);
    };
    img.src = pngOrPdfInput;
  } catch (err) {
    console.error("PDF download error:", err);
    alert("Erreur lors de la génération du PDF d'impression.");
  }
}
