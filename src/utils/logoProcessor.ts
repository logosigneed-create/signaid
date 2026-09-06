/**
 * Advanced Client-Side Logo Processing Utility:
 * 1. Automatic background removal (chroma keying with smooth feathering for white/light boxes)
 * 2. Smart contrast adaptation (inverts dark/black text to white on dark textiles while preserving vibrant colors like red, gold, blue, etc.)
 */

export interface ProcessLogoOptions {
  removeWhiteBg?: boolean;
  invertBlackToWhiteOnDark?: boolean;
  tolerance?: number;
  edgeFeathering?: number;
}

export const processLogoImage = (
  imgSrc: string,
  isDarkGarment: boolean = true,
  options: ProcessLogoOptions = {}
): Promise<string> => {
  const {
    removeWhiteBg = true,
    invertBlackToWhiteOnDark = true,
    tolerance = 45,
    edgeFeathering = 25
  } = options;

  return new Promise((resolve) => {
    if (!imgSrc || typeof imgSrc !== 'string' || imgSrc.trim() === '') {
      return resolve('');
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return resolve(imgSrc);

        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;

        // Step 1: Detect background color from sample border pixels
        const sampleCoords = [
          [0, 0],
          [canvas.width - 1, 0],
          [0, canvas.height - 1],
          [canvas.width - 1, canvas.height - 1],
          [Math.floor(canvas.width / 2), 0],
          [0, Math.floor(canvas.height / 2)],
          [canvas.width - 1, Math.floor(canvas.height / 2)],
          [Math.floor(canvas.width / 2), canvas.height - 1]
        ];

        let sumR = 0, sumG = 0, sumB = 0, validSamples = 0;
        sampleCoords.forEach(([cx, cy]) => {
          const idx = (cy * canvas.width + cx) * 4;
          if (data[idx + 3] > 10) {
            sumR += data[idx];
            sumG += data[idx + 1];
            sumB += data[idx + 2];
            validSamples++;
          }
        });

        let bgR = 255, bgG = 255, bgB = 255;
        let isSolidBg = false;

        if (validSamples > 0) {
          bgR = Math.round(sumR / validSamples);
          bgG = Math.round(sumG / validSamples);
          bgB = Math.round(sumB / validSamples);
          // If average border is near-white or light gray
          isSolidBg = (bgR + bgG + bgB) / 3 > 185;
        }

        // Step 2: Pixel-by-pixel color transformation
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];

          if (a === 0) continue;

          // A. Background transparency removal
          if (removeWhiteBg && isSolidBg) {
            const distFromBg = Math.sqrt(
              Math.pow(r - bgR, 2) + Math.pow(g - bgG, 2) + Math.pow(b - bgB, 2)
            );

            if (distFromBg <= tolerance) {
              data[i + 3] = 0; // Transparent
              continue;
            } else if (distFromBg < tolerance + edgeFeathering) {
              const alphaRatio = (distFromBg - tolerance) / edgeFeathering;
              data[i + 3] = Math.round(a * alphaRatio);
            }
          }

          // B. Smart text inversion (black/dark neutral -> white on dark garments)
          if (isDarkGarment && invertBlackToWhiteOnDark && data[i + 3] > 20) {
            const brightness = (r * 299 + g * 587 + b * 114) / 1000;
            const maxC = Math.max(r, g, b);
            const minC = Math.min(r, g, b);
            const saturation = maxC - minC;

            // Pure black or dark neutral tones (like text/outlines), keeping vibrant colors (red, gold, cyan) intact
            if (brightness < 80 && saturation < 40) {
              data[i] = 255;
              data[i + 1] = 255;
              data[i + 2] = 255;
            }
          }
        }

        ctx.putImageData(imgData, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch (err) {
        console.warn('processLogoImage canvas exception:', err);
        resolve(imgSrc);
      }
    };

    img.onerror = () => resolve(imgSrc);
    img.src = imgSrc;
  });
};
