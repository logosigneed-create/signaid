/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Dropper Studio - Utilitaires de Téléchargement & Calibration 300 DPI Print Ready
 */

/**
 * Modifie ou injecte le chunk pHYs dans un flux PNG base64 / data-URL pour lui conférer
 * une résolution physique native (ex: 300 DPI, soit 11811 pixels/mètre).
 * Conforme aux spécifications PNG ISO/IEC 15948:2004.
 *
 * @param base64Data Le PNG en base64 pur ou data-URL (data:image/png;base64,...)
 * @param dpi Résolution en points par pouce (300 DPI par défaut)
 * @returns Le PNG avec métadonnées pHYs 300 DPI
 */
export function setPngDpi(base64Data: string, dpi = 300): string {
  if (!base64Data) return base64Data;

  const isDataUrl = base64Data.startsWith('data:');
  const base64String = isDataUrl ? base64Data.slice(base64Data.indexOf(',') + 1) : base64Data;

  // Décodage base64 multi-environnements (Navigateur & Node)
  let bytes: Uint8Array;
  try {
    if (typeof Buffer !== 'undefined') {
      bytes = new Uint8Array(Buffer.from(base64String, 'base64'));
    } else {
      const binStr = atob(base64String);
      bytes = new Uint8Array(binStr.length);
      for (let i = 0; i < binStr.length; i++) {
        bytes[i] = binStr.charCodeAt(i);
      }
    }
  } catch (decodeErr) {
    console.warn('[setPngDpi] Impossible de décoder le base64:', decodeErr);
    return base64Data;
  }

  // Vérification de la signature PNG : 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes.length < 8 ||
    bytes[0] !== 0x89 ||
    bytes[1] !== 0x50 ||
    bytes[2] !== 0x4e ||
    bytes[3] !== 0x47 ||
    bytes[4] !== 0x0d ||
    bytes[5] !== 0x0a ||
    bytes[6] !== 0x1a ||
    bytes[7] !== 0x0a
  ) {
    return base64Data;
  }

  // 300 DPI = ~11811 pixels par mètre (300 / 0.0254 = 11811.02)
  const ppm = Math.round(dpi / 0.0254);

  // Construction du chunk pHYs : 4 (longueur) + 4 (type pHYs) + 9 (données) + 4 (CRC) = 21 octets
  const physChunk = new Uint8Array(21);
  const view = new DataView(physChunk.buffer);

  // Longueur des données = 9 octets
  view.setUint32(0, 9, false);

  // Type = 'pHYs' (0x70, 0x48, 0x59, 0x73)
  physChunk[4] = 0x70; // 'p'
  physChunk[5] = 0x48; // 'H'
  physChunk[6] = 0x59; // 'Y'
  physChunk[7] = 0x73; // 's'

  // Pixels par mètre sur l'axe X (4 octets BE) et axe Y (4 octets BE)
  view.setUint32(8, ppm, false);
  view.setUint32(12, ppm, false);

  // Spécificateur d'unité : 1 = mètre (0 = ratio inconnu)
  physChunk[16] = 1;

  // Calcul du CRC-32 (ISO 3309 / ITU-T V.42) sur Type + Données (13 octets)
  const crcTable = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    crcTable[n] = c;
  }

  let crc = 0xffffffff;
  for (let i = 4; i < 17; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ physChunk[i]) & 0xff];
  }
  const crcVal = (crc ^ 0xffffffff) >>> 0;
  view.setUint32(17, crcVal, false);

  // Recherche d'un chunk pHYs existant ou du premier IDAT
  let pos = 8;
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let existingPhysOffset = -1;
  let existingPhysLen = 0;
  let insertPos = 33; // Immédiatement après IHDR (8 signature + 4 len + 4 type + 13 data + 4 crc = 33)

  while (pos < bytes.length - 8) {
    const chunkLen = dv.getUint32(pos, false);
    const typeStr = String.fromCharCode(
      bytes[pos + 4],
      bytes[pos + 5],
      bytes[pos + 6],
      bytes[pos + 7]
    );

    if (typeStr === 'pHYs') {
      existingPhysOffset = pos;
      existingPhysLen = chunkLen + 12; // 4 + 4 + chunkLen + 4
      break;
    }
    if (typeStr === 'IDAT') {
      insertPos = pos;
      break;
    }
    pos += chunkLen + 12;
  }

  let finalBytes: Uint8Array;
  if (existingPhysOffset >= 0) {
    finalBytes = new Uint8Array(bytes.length - existingPhysLen + 21);
    finalBytes.set(bytes.subarray(0, existingPhysOffset), 0);
    finalBytes.set(physChunk, existingPhysOffset);
    finalBytes.set(
      bytes.subarray(existingPhysOffset + existingPhysLen),
      existingPhysOffset + 21
    );
  } else {
    finalBytes = new Uint8Array(bytes.length + 21);
    finalBytes.set(bytes.subarray(0, insertPos), 0);
    finalBytes.set(physChunk, insertPos);
    finalBytes.set(bytes.subarray(insertPos), insertPos + 21);
  }

  // Ré-encodage base64 sans débordement de pile
  let finalBase64 = '';
  if (typeof Buffer !== 'undefined') {
    finalBase64 = Buffer.from(finalBytes).toString('base64');
  } else {
    const chunkSize = 8192;
    const pieces: string[] = [];
    for (let i = 0; i < finalBytes.length; i += chunkSize) {
      const slice = finalBytes.subarray(i, Math.min(i + chunkSize, finalBytes.length));
      pieces.push(String.fromCharCode.apply(null, slice as unknown as number[]));
    }
    finalBase64 = btoa(pieces.join(''));
  }

  return (isDataUrl ? 'data:image/png;base64,' : '') + finalBase64;
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const commaIdx = dataUrl.indexOf(',');
  if (commaIdx === -1) {
    return new Blob([dataUrl], { type: 'application/octet-stream' });
  }
  const header = dataUrl.slice(0, commaIdx);
  const rawBody = dataUrl.slice(commaIdx + 1);
  const mimeMatch = header.match(/data:([^;]+)/);
  const mimeType = mimeMatch ? mimeMatch[1] : 'application/octet-stream';

  if (header.includes(';base64')) {
    const binStr = atob(rawBody);
    const bytes = new Uint8Array(binStr.length);
    for (let i = 0; i < binStr.length; i++) {
      bytes[i] = binStr.charCodeAt(i);
    }
    return new Blob([bytes], { type: mimeType });
  }

  const decoded = decodeURIComponent(rawBody);
  return new Blob([decoded], { type: `${mimeType};charset=utf-8` });
}

export async function exportAndSaveImage(blob: Blob, filename: string): Promise<void> {
  // Téléchargement direct instantané (Desktop & Mobile) sans menu de partage superflu
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function downloadSvgAsFile(svgContent: string, fileName: string) {
  const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName.endsWith('.svg') ? fileName : `${fileName}.svg`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadSvgAsPng(
  svgContent: string,
  fileName: string,
  width = 1200,
  height = 1600,
  dpi = 300
) {
  const svgBlob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);
  const img = new Image();

  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, width, height);
    URL.revokeObjectURL(url);

    canvas.toBlob((blob) => {
      if (blob) {
        exportAndSaveImage(blob, fileName.endsWith('.png') ? fileName : `${fileName}.png`);
      }
    }, 'image/png', 1.0);
  };

  img.src = url;
}

export function copyToClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text).then(() => true).catch(() => false);
  } else {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    return new Promise((resolve) => {
      document.execCommand('copy');
      textArea.remove();
      resolve(true);
    });
  }
}

const urlBase64Cache = new Map<string, string>();

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Convertit une URL d'image (distante Firebase Storage ou locale) en Data URL Base64.
 * Tente d'abord un fetch direct avec CORS, puis bascule en cas d'échec sur le proxy /api/proxy-image.
 */
export async function convertImageUrlToBase64(url: string): Promise<string> {
  if (!url || typeof url !== 'string') return url;
  if (url.startsWith('data:')) return url;
  if (urlBase64Cache.has(url)) return urlBase64Cache.get(url)!;

  // 1. Essai direct avec fetch CORS côté client
  try {
    const directRes = await fetch(url, { mode: 'cors', signal: AbortSignal.timeout(4000) });
    if (directRes.ok) {
      const blob = await directRes.blob();
      const base64 = await blobToDataUrl(blob);
      if (base64 && base64.startsWith('data:')) {
        urlBase64Cache.set(url, base64);
        return base64;
      }
    }
  } catch (_err) {
    // Si échec CORS direct (notamment Firebase Storage en production), passage au proxy serveur
  }

  // 2. Repli sur le proxy interne /api/proxy-image
  if (url.startsWith('http://') || url.startsWith('https://')) {
    try {
      const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(url)}`;
      const proxyRes = await fetch(proxyUrl, { signal: AbortSignal.timeout(4000) });
      if (proxyRes.ok) {
        const blob = await proxyRes.blob();
        const base64 = await blobToDataUrl(blob);
        if (base64 && base64.startsWith('data:')) {
          urlBase64Cache.set(url, base64);
          return base64;
        }
      }
    } catch (proxyErr) {
      console.warn('[downloadHelpers] Échec proxy image pour:', url, proxyErr);
    }
  }

  return url;
}

/**
 * Prépare toutes les balises <img> contenues dans l'élément exporté :
 * 1. Applique crossOrigin="anonymous" impératif.
 * 2. Convertit temporairement les URLs distantes en Data URLs Base64 pour contourner tout blocage CORS.
 * 3. Attend le décodage complet en mémoire des images avant la capture.
 * Retourne une fonction de nettoyage pour restaurer les URLs d'origine.
 */
export async function prepareNodeImagesForExport(node: HTMLElement): Promise<() => void> {
  const images = Array.from(node.querySelectorAll('img'));
  const originalSrcMap = new Map<HTMLImageElement, string>();

  await Promise.all(
    images.map(async (img) => {
      // Force l'attribut crossOrigin sur chaque balise
      if (img.getAttribute('crossorigin') !== 'anonymous') {
        img.setAttribute('crossorigin', 'anonymous');
      }

      const currentSrc = img.currentSrc || img.src || img.getAttribute('src');
      if (currentSrc && !currentSrc.startsWith('data:')) {
        originalSrcMap.set(img, currentSrc);
        const base64Src = await convertImageUrlToBase64(currentSrc);
        if (base64Src && base64Src.startsWith('data:')) {
          img.src = base64Src;
        }
      }
    })
  );

  // Attente du décodage effectif dans le DOM (avec garde-fou timeout pour éviter tout blocage infini)
  await Promise.all(
    images.map(async (img) => {
      if (img.complete && img.naturalWidth > 0) return;
      try {
        if ('decode' in img) {
          await Promise.race([
            img.decode(),
            new Promise<void>((r) => setTimeout(r, 1200)),
          ]);
        }
      } catch {
        if (img.complete) return;
        await new Promise<void>((resolve) => {
          const timer = setTimeout(resolve, 1200);
          img.onload = () => {
            clearTimeout(timer);
            resolve();
          };
          img.onerror = () => {
            clearTimeout(timer);
            resolve();
          };
        });
      }
    })
  );

  return () => {
    // Restauration des sources originales
    for (const [img, orig] of originalSrcMap.entries()) {
      img.src = orig;
    }
  };
}
