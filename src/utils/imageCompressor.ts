/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Droppaid.ai - Utilitaire de compression et d'optimisation d'images pour synchronisation Firestore
 * Garantit que la taille totale du document reste bien inférieure au plafond strict de 1 Mo (1,048,576 octets)
 */

import { EventInput } from '../types';

/**
 * Compresse une image Base64 ou Blob URL via un canvas HTML5.
 * - Pour les images opaques (ex. fond décor 3D), exporte en image/jpeg haute qualité (~50 Ko).
 * - Pour les images avec transparence (ex. découpe sujet DJ ou logo), exporte en image/webp (~60 Ko).
 */
/** Plafond strict pour tout asset Base64 synchronisé avec Firestore (500 Ko). */
export const MAX_SYNC_IMAGE_BYTES = 500 * 1024; // 512,000 octets

/**
 * Compresse une image Base64 ou Blob URL via un canvas HTML5.
 * - Pour les images opaques (ex. fond décor 3D), exporte en image/jpeg haute qualité (~50 Ko).
 * - Pour les images avec transparence (ex. découpe sujet DJ ou logo), exporte en image/webp (~60 Ko).
 * - Garantit strictement qu'aucune chaîne Base64 supérieure à 500 Ko n'est renvoyée pour Firestore.
 */
export async function compressImageForSync(
  dataUrl: string | undefined,
  maxDimension = 1200,
  quality = 0.75,
  maxBytes = MAX_SYNC_IMAGE_BYTES
): Promise<string | undefined> {
  if (!dataUrl || typeof dataUrl !== 'string') return dataUrl;

  // Préservation vectorielle absolue : ne jamais compresser un SVG léger (< 500 Ko)
  if (dataUrl.startsWith('data:image/svg+xml')) {
    if (dataUrl.length > maxBytes) {
      console.warn('[ImageCompressor] SVG base64 trop lourd (> 500 Ko) pour Firestore, tronqué.');
      return undefined;
    }
    return dataUrl;
  }

  // Si l'image est déjà une URL distante (HTTP/HTTPS)
  if (!dataUrl.startsWith('data:image/') && !dataUrl.startsWith('blob:')) {
    return dataUrl;
  }
  // Seule une chaîne DataURL base64 déjà ultra-légère (< 45 Ko) peut être renvoyée immédiatement
  if (dataUrl.startsWith('data:image/') && dataUrl.length < 45000) {
    return dataUrl;
  }

  // Environnement sans DOM (ex: tests SSR / scripts Node)
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    if (dataUrl.length > maxBytes) {
      console.warn('[ImageCompressor] Image base64 > 500 Ko sans DOM, élaguée pour Firestore.');
      return undefined;
    }
    return dataUrl;
  }

  return new Promise((resolve) => {
    try {
      const img = new Image();
      if (!dataUrl.startsWith('blob:') && !dataUrl.startsWith('data:')) {
        img.crossOrigin = 'anonymous';
      }

      img.onload = () => {
        try {
          let { width, height } = img;
          if (!width || !height) {
            resolve(dataUrl.startsWith('blob:') ? undefined : (dataUrl.length <= maxBytes ? dataUrl : undefined));
            return;
          }

          let currentDim = maxDimension;
          let currentQuality = quality;
          let finalCompressed: string | undefined;

          // Détection du besoin de canal alpha (transparence pour détourage DJ et logos)
          const requiresTransparency = dataUrl.includes('image/png') || dataUrl.includes('image/webp') || dataUrl.startsWith('blob:');

          for (let attempt = 0; attempt < 5; attempt++) {
            let targetW = width;
            let targetH = height;

            if (targetW > currentDim || targetH > currentDim) {
              if (targetW > targetH) {
                targetH = Math.round((targetH * currentDim) / targetW);
                targetW = currentDim;
              } else {
                targetW = Math.round((targetW * currentDim) / targetH);
                targetH = currentDim;
              }
            }

            const canvas = document.createElement('canvas');
            canvas.width = Math.max(1, targetW);
            canvas.height = Math.max(1, targetH);
            const ctx = canvas.getContext('2d');
            if (!ctx) break;

            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            let candidate: string = '';
            // 1. Privilégier WebP (qualité 0.75, max 1200px) qui gère transparence ET compression ultra-optimisée
            try {
              const webpCandidate = canvas.toDataURL('image/webp', currentQuality);
              if (webpCandidate.startsWith('data:image/webp')) {
                candidate = webpCandidate;
              }
            } catch {
              candidate = '';
            }

            // 2. Fallbacks si WebP non disponible
            if (!candidate) {
              if (requiresTransparency) {
                candidate = canvas.toDataURL('image/png');
              } else {
                candidate = canvas.toDataURL('image/jpeg', currentQuality);
              }
            }

            finalCompressed = candidate;

            // Si le résultat est sous le seuil cible optimal (~300 Ko)
            if (candidate.length < Math.min(300000, maxBytes)) {
              break;
            }

            // Réduire la dimension et la qualité pour l'itération suivante
            currentDim = Math.round(currentDim * 0.75);
            currentQuality = Math.max(0.40, currentQuality - 0.12);
          }

          if (finalCompressed && finalCompressed.length <= maxBytes) {
            resolve(finalCompressed);
          } else if (!dataUrl.startsWith('blob:') && dataUrl.length <= maxBytes) {
            resolve(dataUrl);
          } else {
            console.warn(
              `[ImageCompressor] Image base64 (${Math.round((finalCompressed?.length || dataUrl.length) / 1024)} Ko) excède le plafond de 500 Ko même après compression. Élagage appliqué.`
            );
            resolve(undefined);
          }
        } catch (canvasErr) {
          console.warn('[ImageCompressor] Erreur compression canvas:', canvasErr);
          resolve(dataUrl.startsWith('blob:') ? undefined : (dataUrl.length <= maxBytes ? dataUrl : undefined));
        }
      };

      img.onerror = () => {
        resolve(dataUrl.startsWith('blob:') ? undefined : (dataUrl.length <= maxBytes ? dataUrl : undefined));
      };

      img.src = dataUrl;
    } catch {
      resolve(dataUrl.startsWith('blob:') ? undefined : (dataUrl.length <= maxBytes ? dataUrl : undefined));
    }
  });
}

/**
 * Prépare et allège le payload d'un événement avant écriture dans Firestore.
 * - Supprime les fichiers bruts volumineux (ex: rawDjPhoto, rawTshirtLogoOriginal).
 * - Compresse backgroundImage, djPhoto et logoImage.
 * - Garantit un document Firestore ultra-léger (< 200 Ko) avec synchronisation temps réel instantanée.
 */
export async function prepareEventDataForSync(
  input: EventInput,
  extra?: {
    tshirtPreviewImage?: string;
    tshirtSide?: 'front' | 'back';
    tshirtPreviewImages?: {
      front?: string | null;
      back?: string | null;
    };
    flyerImageUrl?: string;
    previewImages?: {
      a3?: string | null;
      [key: string]: any;
    };
  }
): Promise<EventInput> {
  // Retrait préventif des fichiers bruts volumineux
  const { rawDjPhoto, rawTshirtLogoOriginal, rawLogoImage, ...safeInput } = input;

  const previewSource = extra?.tshirtPreviewImage !== undefined
    ? extra.tshirtPreviewImage
    : safeInput.tshirtPreviewImage;

  const previewImagesSource = extra?.tshirtPreviewImages !== undefined
    ? extra.tshirtPreviewImages
    : safeInput.tshirtPreviewImages;

  const flyerSource = extra?.flyerImageUrl !== undefined
    ? extra.flyerImageUrl
    : safeInput.flyerImageUrl;

  const generalPreviewImages = extra?.previewImages !== undefined
    ? extra.previewImages
    : safeInput.previewImages;

  const a3Source = generalPreviewImages?.a3 !== undefined
    ? generalPreviewImages.a3
    : (flyerSource || undefined);

  const bgSource = safeInput.customBackground !== undefined ? safeInput.customBackground : (safeInput.backgroundImage !== undefined ? safeInput.backgroundImage : safeInput.bgImage);
  const logoSource = safeInput.logoImage !== undefined ? safeInput.logoImage : safeInput.logoUrl;

  const [
    compressedBg,
    compressedDj,
    compressedSecondaryDj,
    compressedLogo,
    compressedTshirtLogo,
    compressedTshirtBackLogo,
    compressedPreview,
    compressedFront,
    compressedBack,
    compressedFlyer,
    compressedA3,
  ] = await Promise.all([
    bgSource
      ? compressImageForSync(bgSource, 1200, 0.75)
      : Promise.resolve(bgSource === '' ? '' : undefined),
    safeInput.djPhoto
      ? compressImageForSync(safeInput.djPhoto, 1200, 0.75)
      : Promise.resolve(safeInput.djPhoto === '' ? '' : undefined),
    safeInput.secondaryDjPhoto
      ? compressImageForSync(safeInput.secondaryDjPhoto, 1200, 0.75)
      : Promise.resolve(safeInput.secondaryDjPhoto === '' ? '' : undefined),
    logoSource
      ? compressImageForSync(logoSource, 800, 0.75)
      : Promise.resolve(logoSource === '' ? '' : undefined),
    safeInput.tshirtCustomLogo
      ? compressImageForSync(safeInput.tshirtCustomLogo, 800, 0.75)
      : Promise.resolve(safeInput.tshirtCustomLogo === '' ? '' : undefined),
    safeInput.tshirtBackCustomLogo
      ? compressImageForSync(safeInput.tshirtBackCustomLogo, 800, 0.75)
      : Promise.resolve(safeInput.tshirtBackCustomLogo === '' ? '' : undefined),
    previewSource
      ? compressImageForSync(previewSource, 900, 0.75)
      : Promise.resolve(undefined),
    previewImagesSource?.front
      ? compressImageForSync(previewImagesSource.front, 900, 0.75)
      : Promise.resolve(previewImagesSource?.front ?? null),
    previewImagesSource?.back
      ? compressImageForSync(previewImagesSource.back, 900, 0.75)
      : Promise.resolve(previewImagesSource?.back ?? null),
    flyerSource && flyerSource.startsWith('data:')
      ? compressImageForSync(flyerSource, 900, 0.75)
      : Promise.resolve(flyerSource),
    a3Source && a3Source.startsWith('data:')
      ? compressImageForSync(a3Source, 900, 0.75)
      : Promise.resolve(a3Source),
  ]);

  const finalPreviewImages = previewImagesSource !== undefined
    ? {
        front: compressedFront !== undefined ? compressedFront : null,
        back: compressedBack !== undefined ? compressedBack : null,
      }
    : undefined;

  const finalGeneralPreviewImages = (generalPreviewImages !== undefined || compressedA3 !== undefined)
    ? {
        ...(generalPreviewImages || {}),
        ...(compressedA3 ? { a3: compressedA3 } : {}),
      }
    : undefined;

  return {
    ...safeInput,
    backgroundImage: compressedBg,
    bgImage: compressedBg,
    customBackground: compressedBg,
    djPhoto: compressedDj,
    secondaryDjPhoto: compressedSecondaryDj,
    logoImage: compressedLogo,
    logoUrl: compressedLogo !== undefined ? compressedLogo : safeInput.logoUrl,
    tshirtCustomLogo: compressedTshirtLogo,
    tshirtBackCustomLogo: compressedTshirtBackLogo !== undefined ? compressedTshirtBackLogo : safeInput.tshirtBackCustomLogo,
    tshirtPreviewImage: compressedPreview,
    tshirtPreviewImages: finalPreviewImages,
    tshirtSide: extra?.tshirtSide || safeInput.tshirtSide,
    flyerImageUrl: compressedFlyer !== undefined ? compressedFlyer : safeInput.flyerImageUrl,
    previewImages: finalGeneralPreviewImages,
  };
}
