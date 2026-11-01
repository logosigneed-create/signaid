import { removeBackground as removeBackgroundImgly } from '@imgly/background-removal';
import { dataUrlToBlob } from '../utils/downloadHelpers';

export interface CutoutResult {
  dataUrl: string;
  blob: Blob;
  download: (name?: string) => void;
}

/**
 * Détourage neuronal IA haute fidélité pour le Sujet (100% Client-Side via @imgly/background-removal)
 * avec repli automatique sur le backend API /api/remove-background.
 * Préserve scrupuleusement les vêtements sombres, cheveux, bonnets et lunettes sans aucun seuillage inversé.
 */
export async function removeBackground(source: File | Blob | string): Promise<CutoutResult> {
  let imageBlob: Blob;

  if (source instanceof Blob) {
    imageBlob = source;
  } else if (typeof source === 'string' && source.startsWith('data:')) {
    imageBlob = dataUrlToBlob(source);
  } else if (typeof source === 'string' && (source.startsWith('blob:') || source.startsWith('/') || source.startsWith('http'))) {
    try {
      const res = await fetch(source);
      imageBlob = await res.blob();
    } catch {
      imageBlob = dataUrlToBlob(source);
    }
  } else if (typeof source === 'string') {
    imageBlob = dataUrlToBlob(source);
  } else {
    throw new Error('Format de source image non pris en charge.');
  }

  let finalBlob: Blob | null = null;

  // 1. Moteur neuronal principal : @imgly/background-removal (U2-Net / ONNX WebAssembly)
  try {
    finalBlob = await removeBackgroundImgly(imageBlob, {
      output: {
        format: 'image/png',
        quality: 1.0,
      },
    });
  } catch (imglyErr: any) {
    console.warn('[autoCutout] @imgly/background-removal indisponible, bascule sur API backend /api/remove-background :', imglyErr?.message || imglyErr);
  }

  // 2. Repli serveur API /api/remove-background (Photoroom / rembg serveur)
  if (!finalBlob) {
    try {
      const formData = new FormData();
      formData.append('image', imageBlob, 'subject.png');
      formData.append('size', 'full');
      formData.append('type', 'person');
      formData.append('format', 'png');

      const apiRes = await fetch('/api/remove-background', {
        method: 'POST',
        body: formData,
      });

      if (apiRes.ok) {
        const ct = apiRes.headers.get('content-type') || '';
        if (ct.includes('application/json')) {
          const json = await apiRes.json();
          const b64 = json.processedImageBase64 || json.image || json.imageUrl;
          if (b64) {
            finalBlob = dataUrlToBlob(b64.startsWith('data:') ? b64 : `data:image/png;base64,${b64}`);
          }
        } else {
          finalBlob = await apiRes.blob();
        }
      }
    } catch (apiErr: any) {
      console.warn('[autoCutout] Échec repli API /api/remove-background :', apiErr?.message || apiErr);
    }
  }

  if (!finalBlob) {
    throw new Error('Échec du détourage : impossible de contacter le service de segmentation.');
  }

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('Erreur lors de la lecture du résultat Blob'));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(finalBlob!);
  });

  return {
    dataUrl,
    blob: finalBlob,
    download: (name = 'sujet-detoure.png') => {
      const anchor = document.createElement('a');
      anchor.download = name;
      anchor.href = dataUrl;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
    },
  };
}
