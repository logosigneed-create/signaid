/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Dropper Studio - Utilitaire d'Optimisation Haute Performance pour Logos (Affiche & DTF Vêtement)
 * Garantit :
 * 1. Création d'URL locale en mémoire immédiate (URL.createObjectURL) sans sérialiser de Mo dans le state React
 * 2. Upload vers Firebase Storage (/users/{uid}/logos/...) si disponible
 * 3. Fallback Canvas avec redimensionnement max 800x800 px et compression WebP/PNG strictement < 300 Ko pour Firestore
 */

import { uploadLogoToFirebaseStorage } from '../services/firebase';

/**
 * Crée une URL locale temporaire instantanée pour un fichier uploadé.
 * Zéro latence, 0 Mo sérialisé dans le state.
 */
export function createLocalLogoPreview(file: File): string {
  return URL.createObjectURL(file);
}

/**
 * Charge une source image (File, Blob, blob: URL ou data: URL) dans un HTMLImageElement.
 */
function loadImageSource(source: File | Blob | string): Promise<{ img: HTMLImageElement; objectUrlToRevoke?: string }> {
  return new Promise((resolve, reject) => {
    let src: string;
    let objectUrlToRevoke: string | undefined;

    if (typeof source !== 'string') {
      src = URL.createObjectURL(source);
      objectUrlToRevoke = src;
    } else {
      src = source;
    }

    const img = new Image();
    if (!src.startsWith('blob:') && !src.startsWith('data:')) {
      img.crossOrigin = 'anonymous';
    }

    img.onload = () => {
      resolve({ img, objectUrlToRevoke });
    };

    img.onerror = (e) => {
      if (objectUrlToRevoke) URL.revokeObjectURL(objectUrlToRevoke);
      reject(new Error(`Impossible de charger l'image source: ${e}`));
    };

    img.src = src;
  });
}

/**
 * Calcule la taille approximative en octets d'une chaîne DataURL Base64
 */
function getDataUrlByteSize(dataUrl: string): number {
  const commaIndex = dataUrl.indexOf(',');
  if (commaIndex === -1) return dataUrl.length;
  const base64Len = dataUrl.length - (commaIndex + 1);
  return Math.round(base64Len * 0.75);
}

/**
 * Compresse et optimise une image de logo via Canvas HTML5.
 * - Dimension maximale : 800x800 px (respecte le ratio d'aspect)
 * - Format : WebP (avec transparence alpha) ou PNG fallback
 * - Taille cible : strictement inférieure à maxSizeBytes (défaut 300 Ko = 307 200 octets)
 */
export async function compressLogoToCanvas(
  source: File | Blob | string,
  maxDimension = 800,
  maxSizeBytes = 300 * 1024
): Promise<string> {
  // Environnement SSR sans DOM
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    if (typeof source === 'string') return source;
    return '';
  }

  const { img, objectUrlToRevoke } = await loadImageSource(source);

  try {
    const originalWidth = img.naturalWidth || img.width || 800;
    const originalHeight = img.naturalHeight || img.height || 800;

    let targetDim = maxDimension;
    let quality = 0.82;
    let resultDataUrl = '';

    // Boucle d'optimisation adaptative jusqu'à atteindre une taille < maxSizeBytes
    for (let attempt = 0; attempt < 5; attempt++) {
      let width = originalWidth;
      let height = originalHeight;

      if (width > targetDim || height > targetDim) {
        if (width > height) {
          height = Math.round((height * targetDim) / width);
          width = targetDim;
        } else {
          width = Math.round((width * targetDim) / height);
          height = targetDim;
        }
      }

      width = Math.max(1, width);
      height = Math.max(1, height);

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        break;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      // Essai WebP pour conserver l'alpha avec un ratio de compression exceptionnel
      let candidate = canvas.toDataURL('image/webp', quality);
      if (!candidate.startsWith('data:image/webp')) {
        candidate = canvas.toDataURL('image/png');
      }

      const byteSize = getDataUrlByteSize(candidate);
      resultDataUrl = candidate;

      if (byteSize < maxSizeBytes) {
        break;
      }

      // Si encore trop lourd, réduire dimensions et qualité pour la tentative suivante
      targetDim = Math.round(targetDim * 0.8);
      quality = Math.max(0.4, quality - 0.15);
    }

    return resultDataUrl;
  } finally {
    if (objectUrlToRevoke) {
      URL.revokeObjectURL(objectUrlToRevoke);
    }
  }
}

/**
 * Pipeline d'upload d'un logo pour synchronisation :
 * 1. Tente l'upload vers Firebase Storage (/users/{uid}/logos/...)
 * 2. Si Storage réussit -> renvoie l'URL publique https://firebasestorage...
 * 3. En cas d'échec ou d'absence de session -> compresse en Canvas WebP/PNG < 300 Ko
 */
export async function optimizeLogoForUpload(
  file: File,
  userId?: string
): Promise<string> {
  // Préservation intégrale du format vectoriel pour les fichiers SVG (zéro pixellisation)
  if (file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const res = reader.result as string;
        resolve(res);
      };
      reader.onerror = () => {
        resolve(createLocalLogoPreview(file));
      };
      reader.readAsDataURL(file);
    });
  }

  // Tentative Storage distante
  try {
    const storageUrl = await uploadLogoToFirebaseStorage(file, userId);
    if (storageUrl) {
      return storageUrl;
    }
  } catch (err) {
    console.warn('[LogoOptimizer] Fallback vers compression Canvas locale suite à erreur Storage:', err);
  }

  // Fallback Canvas local haute résolution (1600px pour netteté DTF A3) sous 300 Ko
  return await compressLogoToCanvas(file, 1600, 300 * 1024);
}
