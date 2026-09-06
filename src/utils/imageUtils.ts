/**
 * Utility to optimize image files for web before uploading to Firebase Storage or saving locally.
 */

export interface CompressionOptions {
  maxDimension?: number;
  quality?: number;
  outputType?: 'image/jpeg' | 'image/png' | 'image/webp';
}

/**
 * Resizes and compresses an image File or Blob for optimal web upload.
 * Reduces raw 5MB-20MB camera photos down to 100KB-300KB without visible quality loss.
 */
export const compressImageFile = (
  file: File | Blob,
  options: CompressionOptions = {}
): Promise<Blob> => {
  const { maxDimension = 1600, quality = 0.8, outputType = 'image/jpeg' } = options;

  return new Promise((resolve, reject) => {
    // Keep SVGs untouched
    if (file.type === 'image/svg+xml') {
      resolve(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Skip resizing if image is already smaller than maxDimension and file size is small (< 300KB)
        if (width <= maxDimension && height <= maxDimension && file.size < 300 * 1024) {
          resolve(file);
          return;
        }

        // Calculate responsive dimensions keeping aspect ratio
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }

        // Fill background with white for JPEG format if input was PNG with transparency
        if (outputType === 'image/jpeg') {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob && blob.size < file.size) {
              resolve(blob);
            } else {
              // If compressed blob is somehow larger or failed, return original file
              resolve(file);
            }
          },
          outputType,
          quality
        );
      };
      img.onerror = (err) => reject(err);
      img.src = e.target?.result as string;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
};

/**
 * Resizes and compresses a Base64 data URL string for web display/upload.
 */
export const compressDataUrl = (
  dataUrl: string,
  maxDimension = 1600,
  quality = 0.8,
  outputType: 'image/jpeg' | 'image/png' = 'image/jpeg'
): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!dataUrl || !dataUrl.startsWith('data:image')) {
      resolve(dataUrl);
      return;
    }

    const img = new Image();
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }

      if (outputType === 'image/jpeg') {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
      }

      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL(outputType, quality));
    };
    img.onerror = (err) => reject(err);
    img.src = dataUrl;
  });
};

export const getOptimizedImageUrl = (url: string, _width: number): string => {
  return url;
};
