import QRCode from 'qrcode';
import { getStoredConfig } from '../lib/store';
import { LogoColorMode, UserData } from '../types/audit';
import { invokeGeminiCloudFunction } from './geminiService';
import { removeBackgroundWithCanvas } from '../utils/backgroundRemover';
import { computeToneOverlay } from '../types';
import { getCurrentUserEmail } from '../utils/adminAuth';

// Canvas memoization cache for rendering performance
const memoCanvasCache = new Map<string, string>();

export const clearImageMemoCache = () => {
    memoCanvasCache.clear();
};

export const DEFAULT_PLACEMENTS = {
    tshirt: {
        front: { placement: 'chest_left', x: 0.64, y: 0.34, scale: 0.16 },
        back: { x: 0.50, y: 0.38, scale: 0.35 }
    },
    tshirt_basic: {
        front: { placement: 'chest_left', x: 0.64, y: 0.34, scale: 0.16 },
        back: { x: 0.50, y: 0.38, scale: 0.35 }
    },
    polo: {
        front: { placement: 'chest_left', x: 0.64, y: 0.34, scale: 0.16 },
        back: { x: 0.50, y: 0.38, scale: 0.35 }
    },
    tshirt_bicolore: {
        front: { placement: 'chest_left', x: 0.64, y: 0.34, scale: 0.16 },
        back: { x: 0.50, y: 0.32, scale: 0.35 }
    },
    sweat: {
        front: { placement: 'chest_left', x: 0.64, y: 0.34, scale: 0.16 },
        back: { x: 0.50, y: 0.46, scale: 0.35 }
    },
    veste: {
        front: { placement: 'chest_left', x: 0.64, y: 0.34, scale: 0.16 },
        back: { x: 0.50, y: 0.40, scale: 0.35 }
    },
    tank_top: {
        front: { placement: 'chest_left', x: 0.64, y: 0.34, scale: 0.16 },
        back: { x: 0.50, y: 0.38, scale: 0.35 }
    },
    tshirt_oversize: {
        front: { placement: 'chest_left', x: 0.64, y: 0.34, scale: 0.16 },
        back: { x: 0.50, y: 0.39, scale: 0.36 }
    },
    heavyFront: {
        front: { placement: 'chest_left', x: 0.64, y: 0.34, scale: 0.16 }
    },
    heavyWhiteFront: {
        front: { placement: 'chest_left', x: 0.64, y: 0.34, scale: 0.16 }
    },
    tankFront: {
        front: { placement: 'chest_left', x: 0.64, y: 0.34, scale: 0.16 }
    },
    tankWhiteFront: {
        front: { placement: 'chest_left', x: 0.64, y: 0.34, scale: 0.16 }
    },
    heavy_front: {
        front: { placement: 'chest_left', x: 0.64, y: 0.34, scale: 0.16 }
    },
    heavy_white_front: {
        front: { placement: 'chest_left', x: 0.64, y: 0.34, scale: 0.16 }
    },
    tank_front: {
        front: { placement: 'chest_left', x: 0.64, y: 0.34, scale: 0.16 }
    },
    tank_white_front: {
        front: { placement: 'chest_left', x: 0.64, y: 0.34, scale: 0.16 }
    }
};

export const DEFAULT_FALLBACK_PLACEMENTS = DEFAULT_PLACEMENTS;

export const HARDCODED_FRONT_PLACEMENTS: Record<string, { placement: 'chest_left'; x: number; y: number; scale: number }> = {
    tank_top: { placement: 'chest_left', x: 0.64, y: 0.34, scale: 0.16 },
    tshirt_oversize: { placement: 'chest_left', x: 0.64, y: 0.34, scale: 0.16 },
    heavy_front: { placement: 'chest_left', x: 0.64, y: 0.34, scale: 0.16 },
    heavy_white_front: { placement: 'chest_left', x: 0.64, y: 0.34, scale: 0.16 },
    tank_front: { placement: 'chest_left', x: 0.64, y: 0.34, scale: 0.16 },
    tank_white_front: { placement: 'chest_left', x: 0.64, y: 0.34, scale: 0.16 },
    heavyFront: { placement: 'chest_left', x: 0.64, y: 0.34, scale: 0.16 },
    heavyWhiteFront: { placement: 'chest_left', x: 0.64, y: 0.34, scale: 0.16 },
    tankFront: { placement: 'chest_left', x: 0.64, y: 0.34, scale: 0.16 },
    tankWhiteFront: { placement: 'chest_left', x: 0.64, y: 0.34, scale: 0.16 },
    tshirt: { placement: 'chest_left', x: 0.64, y: 0.34, scale: 0.16 },
    tshirt_basic: { placement: 'chest_left', x: 0.64, y: 0.34, scale: 0.16 },
    polo: { placement: 'chest_left', x: 0.64, y: 0.34, scale: 0.16 },
    sweat: { placement: 'chest_left', x: 0.64, y: 0.34, scale: 0.16 },
    tshirt_bicolore: { placement: 'chest_left', x: 0.64, y: 0.34, scale: 0.16 },
    veste: { placement: 'chest_left', x: 0.64, y: 0.34, scale: 0.16 }
};
export let PLACEMENTS = DEFAULT_PLACEMENTS;

export const updateActivePlacements = (newPlacements: typeof DEFAULT_PLACEMENTS) => {
    PLACEMENTS = newPlacements;
};

export const getActivePlacements = () => PLACEMENTS;

export const compressBase64Image = (base64Str: string, maxWidth = 800, quality = 0.82): Promise<string> => {
    return new Promise((resolve) => {
        if (!base64Str || typeof base64Str !== 'string' || !base64Str.startsWith('data:image')) {
            return resolve(base64Str);
        }
        if (base64Str.length < 200000) {
            return resolve(base64Str);
        }
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            let width = img.width;
            let height = img.height;
            if (width > maxWidth) {
                height = Math.round((height * maxWidth) / width);
                width = maxWidth;
            }
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(img, 0, 0, width, height);
                const compressed = canvas.toDataURL('image/webp', quality);
                resolve(compressed.length < base64Str.length ? compressed : base64Str);
            } else {
                resolve(base64Str);
            }
        };
        img.onerror = () => resolve(base64Str);
        img.src = base64Str;
    });
};

export const loadImage = (url: string): Promise<HTMLImageElement> => {
        return new Promise((resolve, reject) => {
            if (!url || typeof url !== 'string' || !url.trim()) {
                return reject(new Error("Image URL is empty"));
            }
            const timeout = setTimeout(() => reject(new Error(`Timeout loading image at ${url.substring(0, 100)}`)), 15000);
            const img = new Image();
            if (url.startsWith('http://') || url.startsWith('https://')) {
                img.crossOrigin = 'anonymous';
            }
            img.onload = () => { clearTimeout(timeout); resolve(img); };
            img.onerror = () => {
                if (img.crossOrigin) {
                    const fallbackImg = new Image();
                    fallbackImg.onload = () => { clearTimeout(timeout); resolve(fallbackImg); };
                    fallbackImg.onerror = () => { clearTimeout(timeout); reject(new Error(`Failed to load image at ${url.substring(0, 100)}`)); };
                    fallbackImg.src = url;
                } else {
                    clearTimeout(timeout);
                    reject(new Error(`Failed to load image at ${url.substring(0, 100)}`));
                }
            };
            img.src = url;
        });
    };

export interface ProcessLogoOptions {
    removeBackground?: boolean;
    knockoutBlack?: boolean;
    makePureWhite?: boolean;
    makePureBlack?: boolean;
}

export const processLogoDeterministic = (
    base64: string,
    options?: boolean | string | {
        removeBackground?: boolean;
        knockoutBlack?: boolean;
        makePureWhite?: boolean;
        makePureBlack?: boolean;
    },
    removeBackgroundParam: boolean = true
): Promise<string> => {
    let removeBackground = removeBackgroundParam;
    let shouldInvert: boolean | 'white' | 'black' = true;
    let knockoutBlack = false;

    if (typeof options === 'object' && options !== null) {
        removeBackground = options.removeBackground ?? true;
        shouldInvert = options.makePureBlack ? 'black' : (options.makePureWhite ? 'white' : false);
        knockoutBlack = Boolean(options.knockoutBlack);
    } else if (typeof options === 'boolean' || typeof options === 'string') {
        shouldInvert = options as any;
        removeBackground = removeBackgroundParam;
    }
        if (!removeBackground) {
            return Promise.resolve(base64);
        }
        const isWhiteInversion = shouldInvert === 'white' || shouldInvert === true;
        const isBlackInversion = shouldInvert === 'black';

        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.src = base64;
            img.onload = () => {
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = img.width; tempCanvas.height = img.height;
                const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true })!;
                tempCtx.drawImage(img, 0, 0);

                let imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
                let data = imageData.data;
                let width = tempCanvas.width;
                let height = tempCanvas.height;

                // 0. AUTO-CROP: Find real content boundaries to eliminate useless whitespace
                let minX = width, minY = height, maxX = 0, maxY = 0;
                let hasContent = false;
                for (let y = 0; y < height; y++) {
                    for (let x = 0; x < width; x++) {
                        if (data[(y * width + x) * 4 + 3] > 0) {
                            if (x < minX) minX = x; if (x > maxX) maxX = x;
                            if (y < minY) minY = y; if (y > maxY) maxY = y;
                            hasContent = true;
                        }
                    }
                }

                if (hasContent) {
                    // Marge de sécurité (safe padding) de 6px pour éviter tout rognage au ras du texte/sous-titres fins
                    const pad = 6;
                    const safeMinX = Math.max(0, minX - pad);
                    const safeMinY = Math.max(0, minY - pad);
                    const safeMaxX = Math.min(width - 1, maxX + pad);
                    const safeMaxY = Math.min(height - 1, maxY + pad);
                    const contentWidth = safeMaxX - safeMinX + 1;
                    const contentHeight = safeMaxY - safeMinY + 1;
                    const croppedData = tempCtx.getImageData(safeMinX, safeMinY, contentWidth, contentHeight);

                    // Update dimensions and data for subsequent stages
                    tempCanvas.width = contentWidth;
                    tempCanvas.height = contentHeight;
                    tempCtx.putImageData(croppedData, 0, 0);
                    imageData = tempCtx.getImageData(0, 0, contentWidth, contentHeight);
                    data = imageData.data;
                    width = contentWidth;
                    height = contentHeight;
                }

                // 1. SMART BACKGROUND REMOVAL (Detect White or Black based on corners)
                const getPixel = (x: number, y: number) => {
                    const i = (y * width + x) * 4;
                    return [data[i], data[i+1], data[i+2], data[i+3]];
                };
                
                // Sample 4 corners slightly inside (5%) to avoid screenshot bars
                const offsetX = Math.floor(width * 0.05);
                const offsetY = Math.floor(height * 0.05);
                const corners = [
                    getPixel(offsetX, offsetY),
                    getPixel(width - 1 - offsetX, offsetY),
                    getPixel(offsetX, height - 1 - offsetY),
                    getPixel(width - 1 - offsetX, height - 1 - offsetY)
                ];
                const avgA = corners.reduce((acc, c) => acc + c[3], 0) / 4;
                const avgR = corners.reduce((acc, c) => acc + c[0], 0) / 4;
                const avgG = corners.reduce((acc, c) => acc + c[1], 0) / 4;
                const avgB = corners.reduce((acc, c) => acc + c[2], 0) / 4;

                // If corners are mostly transparent, it already has no background!
                const hasTransparentBg = avgA < 50;

                if (!hasTransparentBg) {
                    const isBlackBg = avgR < 60 && avgG < 60 && avgB < 60;
                    const isWhiteBg = avgR > 190 && avgG > 190 && avgB > 190;

                    if (isBlackBg || isWhiteBg) {
                        const targetR = isBlackBg ? 0 : 255;
                        const targetG = isBlackBg ? 0 : 255;
                        const targetB = isBlackBg ? 0 : 255;
                        const tolerance = isBlackBg ? 45 : 50; 

                        // FLOOD-FILL (BFS from perimeter borders only)
                        // This prevents erasing internal black/white elements (e.g., character's beard, cap, or glasses inside a badge circle)
                        const visited = new Uint8Array(width * height);
                        const queue: number[] = [];

                        // Push top & bottom borders
                        for (let x = 0; x < width; x++) {
                            queue.push(x, 0);
                            queue.push(x, height - 1);
                            visited[0 * width + x] = 1;
                            visited[(height - 1) * width + x] = 1;
                        }
                        // Push left & right borders
                        for (let y = 1; y < height - 1; y++) {
                            queue.push(0, y);
                            queue.push(width - 1, y);
                            visited[y * width + 0] = 1;
                            visited[y * width + (width - 1)] = 1;
                        }

                        let head = 0;
                        while (head < queue.length) {
                            const px = queue[head++];
                            const py = queue[head++];
                            const idx = (py * width + px) * 4;
                            const r = data[idx], g = data[idx+1], b = data[idx+2], a = data[idx+3];

                            if (a === 0) continue;

                            const dist = Math.sqrt(Math.pow(r - targetR, 2) + Math.pow(g - targetG, 2) + Math.pow(b - targetB, 2));
                            const isNoisyDark = isBlackBg && (r + g + b < 40);

                            if (dist < tolerance || isNoisyDark) {
                                data[idx + 3] = 0;

                                // Propagate to 4-connected neighbors
                                if (px + 1 < width && !visited[py * width + (px + 1)]) { visited[py * width + (px + 1)] = 1; queue.push(px + 1, py); }
                                if (px - 1 >= 0 && !visited[py * width + (px - 1)]) { visited[py * width + (px - 1)] = 1; queue.push(px - 1, py); }
                                if (py + 1 < height && !visited[(py + 1) * width + px]) { visited[(py + 1) * width + px] = 1; queue.push(px, py + 1); }
                                if (py - 1 >= 0 && !visited[(py - 1) * width + px]) { visited[(py - 1) * width + px] = 1; queue.push(px, py - 1); }
                            }
                        }
                    }
                }

                if (knockoutBlack) {
                    for (let i = 0; i < data.length; i += 4) {
                        const r = data[i], g = data[i+1], b = data[i+2];
                        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
                        if (lum <= 45) {
                            data[i + 3] = 0;
                        }
                    }
                }

                // 2. SOLID WHITE / BLACK CONVERSION (Smart Monochrome Refonte)
                if (isWhiteInversion || isBlackInversion) {
                    let hasLightPixels = false;
                    let hasDarkPixels = false;
                    for (let i = 0; i < data.length; i += 4) {
                        if (data[i + 3] > 30) {
                            const lum = 0.299 * data[i] + 0.587 * data[i+1] + 0.114 * data[i+2];
                            if (lum > 180) hasLightPixels = true;
                            if (lum < 90) hasDarkPixels = true;
                        }
                    }

                    const isContrastLogo = hasLightPixels && hasDarkPixels;

                    for (let i = 0; i < data.length; i += 4) {
                        if (data[i + 3] > 30) {
                            const lum = 0.299 * data[i] + 0.587 * data[i+1] + 0.114 * data[i+2];

                            if (isWhiteInversion) {
                                if (isContrastLogo) {
                                    // Contrast logo (dark motif in light badge): convert dark motif to solid WHITE, erase light background badge!
                                    if (lum < 150) {
                                        data[i] = 255; data[i + 1] = 255; data[i + 2] = 255; data[i + 3] = 255;
                                    } else {
                                        data[i + 3] = 0;
                                    }
                                } else {
                                    data[i] = 255; data[i + 1] = 255; data[i + 2] = 255; data[i + 3] = 255;
                                }
                            } else if (isBlackInversion) {
                                if (isContrastLogo) {
                                    if (lum < 150) {
                                        data[i] = 0; data[i + 1] = 0; data[i + 2] = 0; data[i + 3] = 255;
                                    } else {
                                        data[i + 3] = 0;
                                    }
                                } else {
                                    data[i] = 0; data[i + 1] = 0; data[i + 2] = 0; data[i + 3] = 255;
                                }
                            }
                        }
                    }
                }

                // 4. SMART VECTOR UPSCALING (SMOOTHING PIXELATED EDGES)
                tempCtx.putImageData(imageData, 0, 0);

                const canvas = document.createElement('canvas');
                const maxDim = 2000;
                let w = width, h = height;
                if (w > h) { h = (maxDim / w) * h; w = maxDim; } else { w = (maxDim / h) * w; h = maxDim; }

                canvas.width = w; canvas.height = h;
                const ctx = canvas.getContext('2d')!;

                // STAGE 1: SMOOTHING PASS
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.filter = 'blur(0.4px)'; // Sub-pixel smoothing to merge artifacts
                ctx.drawImage(tempCanvas, 0, 0, w, h);

                // STAGE 2: EDGE SHARPENING (VECTOR-LIKE SNAP)
                const finalData = ctx.getImageData(0, 0, w, h);
                const d = finalData.data;
                for (let i = 0; i < d.length; i += 4) {
                    if (d[i + 3] > 0) {
                        const alpha = d[i + 3];
                        if (alpha < 80) d[i + 3] = 0; // Seuil préservant le texte fin et la typographie
                        else d[i + 3] = 255;          // Snap to solid
                    }
                }
                ctx.putImageData(finalData, 0, 0);

                resolve(canvas.toDataURL('image/png', 1.0));
            };
        });
    };

export const knockoutBlackFromLogo = (base64: string): Promise<string> => {
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.src = base64;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
                ctx.drawImage(img, 0, 0);
                const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imgData.data;
                const len = data.length;

                for (let i = 0; i < len; i += 4) {
                    const a = data[i + 3];
                    if (a > 0) {
                        const r = data[i];
                        const g = data[i + 1];
                        const b = data[i + 2];
                        const maxC = Math.max(r, g, b);
                        const k = maxC / 255.0;

                        if (k < 0.10) {
                            data[i + 3] = 0; // Pure / near black is completely knocked out
                        } else {
                            const factor = (k - 0.10) / (1.0 - 0.10);
                            data[i] = Math.min(255, Math.round(r / Math.max(0.15, factor)));
                            data[i + 1] = Math.min(255, Math.round(g / Math.max(0.15, factor)));
                            data[i + 2] = Math.min(255, Math.round(b / Math.max(0.15, factor)));
                        }
                    }
                }
                ctx.putImageData(imgData, 0, 0);
                const res = canvas.toDataURL('image/png', 1.0);
                canvas.width = 0;
                canvas.height = 0;
                img.src = '';
                resolve(res);
            };
        });
    };

export interface MockupOptions {
    position?: 'chest_left' | 'center' | string;
    colorMode?: 'original' | 'white' | 'black' | 'knockout_black' | string;
    garmentType?: string;
    isModel?: boolean;
    scale?: number;
    offsetY?: number;
    customX?: number;
    customY?: number;
}

export const generateMechanicalMockup = async (garmentUrl: string, logoUrl: string, view: 'front' | 'back', customScaleOrOptions?: number | MockupOptions, garmentTypeParam?: string, colorModeParam?: LogoColorMode, userDataParam?: Partial<UserData>, assetColorParam?: string, isLightModeParam?: boolean) => {
        const isOptionsObject = typeof customScaleOrOptions === 'object' && customScaleOrOptions !== null;
        const options: MockupOptions = isOptionsObject ? customScaleOrOptions : {};
        const customScale: number | undefined = isOptionsObject ? options.scale : (customScaleOrOptions as number | undefined);
        const garmentType: string | undefined = isOptionsObject ? (options.garmentType || garmentTypeParam) : garmentTypeParam;
        const colorMode: LogoColorMode | undefined = isOptionsObject ? (options.colorMode as LogoColorMode || colorModeParam) : colorModeParam;
        const userData = userDataParam || {};
        const assetColor = assetColorParam || '#f97316';
        if (!garmentUrl) return logoUrl || "";
        if (!logoUrl && garmentType !== 'business_card') {
            try {
                const imgGarment = await loadImage(garmentUrl);
                const targetSize = 1024;
                const canvas = document.createElement('canvas');
                canvas.width = targetSize;
                canvas.height = targetSize;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';
                    ctx.clearRect(0, 0, targetSize, targetSize);
                    const scaleFactor = Math.max(targetSize / imgGarment.width, targetSize / imgGarment.height);
                    const scaledW = imgGarment.width * scaleFactor;
                    const scaledH = imgGarment.height * scaleFactor;
                    const dx = (targetSize - scaledW) / 2;
                    const dy = (targetSize - scaledH) / 2;
                    ctx.drawImage(imgGarment, dx, dy, scaledW, scaledH);
                    return canvas.toDataURL('image/png', 1.0);
                }
            } catch {}
            return garmentUrl || "";
        }
        const isLightMode = isLightModeParam ?? false;

        const getAccentColor = (opacity: number = 1.0) => {
            const base = assetColor || '#f97316';
            if (base.startsWith('rgb')) {
                return base.replace('rgb(', 'rgba(').replace(')', `, ${opacity})`);
            }
            if (base.startsWith('#')) {
                const hex = base.replace('#', '');
                const r = parseInt(hex.substring(0, 2) || '249', 16);
                const g = parseInt(hex.substring(2, 4) || '115', 16);
                const b = parseInt(hex.substring(4, 6) || '22', 16);
                return `rgba(${r}, ${g}, ${b}, ${opacity})`;
            }
            return base;
        };
        try {
            let imgGarment: HTMLImageElement | null = null;
            let rawImgLogo: HTMLImageElement | null = null;

            if (garmentType === 'business_card' || garmentType === 'banner') {
                if (logoUrl) {
                    try { rawImgLogo = await loadImage(logoUrl); } catch (e) { console.warn("Card logo load notice:", e); }
                }
            } else {
                [imgGarment, rawImgLogo] = await Promise.all([
                    loadImage(garmentUrl),
                    loadImage(logoUrl)
                ]);
            }

            let imgLogo: HTMLImageElement | HTMLCanvasElement | null = rawImgLogo;
            if (rawImgLogo && colorMode && colorMode !== 'original') {
                const lCanvas = document.createElement('canvas');
                lCanvas.width = rawImgLogo.width;
                lCanvas.height = rawImgLogo.height;
                const lCtx = lCanvas.getContext('2d', { willReadFrequently: true })!;
                lCtx.drawImage(rawImgLogo, 0, 0);
                const lData = lCtx.getImageData(0, 0, lCanvas.width, lCanvas.height);
                const pixels = lData.data;

                if (colorMode === 'white' || colorMode === 'black') {
                    const targetRgb = colorMode === 'white' ? 255 : 0;
                    for (let i = 0; i < pixels.length; i += 4) {
                        if (pixels[i + 3] > 0) {
                            pixels[i] = targetRgb;
                            pixels[i + 1] = targetRgb;
                            pixels[i + 2] = targetRgb;
                        }
                    }
                } else if (colorMode === 'knockout_black') {
                    for (let i = 0; i < pixels.length; i += 4) {
                        const a = pixels[i + 3];
                        if (a > 0) {
                            const r = pixels[i];
                            const g = pixels[i + 1];
                            const b = pixels[i + 2];
                            const maxC = Math.max(r, g, b);
                            const k = maxC / 255.0;

                            if (k < 0.10) {
                                pixels[i + 3] = 0;
                            } else {
                                const factor = (k - 0.10) / (1.0 - 0.10);
                                pixels[i + 3] = Math.round(a * Math.pow(factor, 0.85));
                                pixels[i] = Math.min(255, Math.round(r / Math.max(0.15, factor)));
                                pixels[i + 1] = Math.min(255, Math.round(g / Math.max(0.15, factor)));
                                pixels[i + 2] = Math.min(255, Math.round(b / Math.max(0.15, factor)));
                            }
                        }
                    }
                }
                lCtx.putImageData(lData, 0, 0);
                imgLogo = lCanvas;
            }
            // SPECIAL HANDLING FOR CARDS AND BANNERS
            if (garmentType === 'business_card' || garmentType === 'banner') {
                const canvas = document.createElement('canvas');
                canvas.width = 1024;
                canvas.height = 1024;
                const ctx = canvas.getContext('2d')!;
                
                // Background: Remplit 100% de la zone sans bandes de padding
                ctx.clearRect(0, 0, 1024, 1024);
                ctx.fillStyle = '#0a0a0a';
                ctx.fillRect(0, 0, 1024, 1024);
                
                const baseColor = assetColor || '#050505';

                const isCard = garmentType === 'business_card';
                const isBanner = garmentType === 'banner';
                const cardW = isCard ? 850 : 900;  // 85mm
                const cardH = isCard ? 550 : 300;  // 55mm
                const x = (1024 - cardW) / 2;
                const y = (1024 - cardH) / 2;

                let config: any = null;
                try {
                    const urlParams = new URLSearchParams(window.location.search);
                    const uid = urlParams.get('uid');
                    config = await getStoredConfig(uid || undefined);
                } catch (e) {
                    console.warn('Could not load config for card', e);
                }

                // The Card/Banner Shape
                if (isCard) {
                    // PREMIUM FLAT BASE FOR AI
                    ctx.fillStyle = '#0c0c0c'; // Plain solid matte black color as requested
                    ctx.fillRect(x, y, cardW, cardH);
                    
                    // Subtle inner glow to define the premium feel
                    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(x, y, cardW, cardH);
                } else {
                    ctx.fillStyle = baseColor;
                    ctx.fillRect(x, y, cardW, cardH);
                }

                // === BUSINESS CARD RECTO (FRONT): Logo centered with emboss ===
                if (isCard && view === 'front') {
                    // Centered Logo with EMBOSS / RELIEF effect
                    if (logoUrl) {
                        const imgLogo = await loadImage(logoUrl);
                        const maxLogoW = cardW * 0.60;
                        const maxLogoH = cardH * 0.60;
                        const logoRatio = imgLogo.width / imgLogo.height;
                        let logoW = maxLogoW;
                        let logoH = logoW / logoRatio;
                        if (logoH > maxLogoH) { logoH = maxLogoH; logoW = logoH * logoRatio; }
                        const logoX = x + (cardW - logoW) / 2;
                        const logoY = y + (cardH - logoH) / 2;

                        ctx.save();
                        ctx.shadowColor = 'rgba(255,255,255,0.15)';
                        ctx.shadowBlur = 2;
                        ctx.shadowOffsetX = -1;
                        ctx.shadowOffsetY = -1;
                        ctx.globalAlpha = 0.8;
                        ctx.drawImage(imgLogo, logoX, logoY, logoW, logoH);
                        ctx.restore();

                        ctx.save();
                        ctx.shadowColor = 'rgba(0,0,0,0.8)';
                        ctx.shadowBlur = 15;
                        ctx.shadowOffsetX = 0;
                        ctx.shadowOffsetY = 8;
                        ctx.globalAlpha = 1.0;
                        ctx.drawImage(imgLogo, logoX, logoY, logoW, logoH);
                        ctx.restore();
                    }
                }

                // === BUSINESS CARD VERSO (BACK): Company info + QR code ===
                else if (isCard && view === 'back') {
                    let textY = y + 80;
                    ctx.textAlign = 'left';
                    
                    const name = config?.companyName || userData.companyName || "VOTRE ENTREPRISE";
                    const sector = config?.activitySector || userData.activity || "Secteur d'activité";
                    const phone = config?.whatsappNumber || userData.phone || "01 23 45 67 89";
                    const email = config?.contactEmail || userData.email || "contact@entreprise.com";
                    const website = userData.website || config?.address || "www.entreprise.com";

                    // Verso Text: Always light since card is dark (#111111)
                    ctx.fillStyle = '#ffffff';
                    ctx.font = `900 36px Inter, sans-serif`;
                    ctx.fillText(name.toUpperCase(), x + 50, textY);
                    textY += 40;

                    ctx.fillStyle = getAccentColor();
                    ctx.font = `italic 700 18px Inter, sans-serif`;
                    ctx.fillText(sector.toUpperCase(), x + 50, textY);
                    textY += 35;

                    ctx.strokeStyle = isLightMode ? '#dddddd' : '#333333';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(x + 50, textY);
                    ctx.lineTo(x + 450, textY);
                    ctx.stroke();
                    textY += 40;

                    const drawIcon = (type: string, cx: number, cy: number) => {
                        ctx.save();
                        ctx.translate(cx, cy);
                        ctx.strokeStyle = getAccentColor();
                        ctx.lineWidth = 2;
                        ctx.lineJoin = 'round';
                        ctx.lineCap = 'round';
                        ctx.beginPath();
                        if (type === 'phone') {
                            ctx.rect(-6, -10, 12, 20);
                            ctx.moveTo(-2, 6); ctx.lineTo(2, 6);
                        } else if (type === 'email') {
                            ctx.rect(-10, -7, 20, 14);
                            ctx.moveTo(-10, -7); ctx.lineTo(0, 2); ctx.lineTo(10, -7);
                        } else if (type === 'website') {
                            ctx.arc(0, 0, 7, 0, Math.PI * 2);
                            ctx.moveTo(-7, 0); ctx.lineTo(7, 0);
                            ctx.stroke();
                            ctx.beginPath();
                            ctx.ellipse(0, 0, 3, 7, 0, 0, Math.PI * 2);
                        } else if (type === 'address') {
                            ctx.arc(0, -5, 6, 0, Math.PI * 2);
                            ctx.moveTo(-6, -5); ctx.lineTo(0, 8); ctx.lineTo(6, -5);
                            ctx.moveTo(0, -5); ctx.arc(0, -5, 2, 0, Math.PI * 2);
                        } else if (type === 'service') {
                            ctx.rect(-8, -10, 16, 20);
                            ctx.moveTo(-8, 10); ctx.lineTo(8, 10);
                            for(let i=-4; i<=4; i+=8) {
                                for(let j=-6; j<=2; j+=6) {
                                    ctx.rect(i-1, j-1, 2, 2);
                                }
                            }
                        }
                        ctx.stroke();
                        ctx.restore();
                    };

                    const drawIconAndText = (type: string, text: string) => {
                        drawIcon(type, x + 65, textY - 6);
                        ctx.fillStyle = '#cccccc'; // Light gray text for dark card
                        ctx.font = `600 16px Inter, sans-serif`;
                        
                        const maxChars = 35;
                        if(text.length > maxChars) {
                            const words = text.split(' ');
                            let line = '';
                            let currentY = textY;
                            for(let i=0; i<words.length; i++) {
                                if((line + words[i]).length > maxChars) {
                                    ctx.fillText(line, x + 100, currentY);
                                    line = words[i] + ' ';
                                    currentY += 24;
                                } else {
                                    line += words[i] + ' ';
                                }
                            }
                            ctx.fillText(line, x + 100, currentY);
                            textY = currentY + 35;
                        } else {
                            ctx.fillText(text, x + 100, textY);
                            textY += 35;
                        }
                    };

                    drawIconAndText('service', "Direction Générale");
                    drawIconAndText('phone', phone);
                    drawIconAndText('email', email);
                    drawIconAndText('website', website);

                    try {
                        const urlParams = new URLSearchParams(window.location.search);
                        const uid = urlParams.get('uid');
                        const portalUrl = uid ? `${window.location.origin}/?uid=${uid}` : window.location.origin;
                        
                        // LOCAL GENERATION (Avoids net::ERR_BLOCKED_BY_CLIENT)
                        const qrUrl = await QRCode.toDataURL(portalUrl, {
                            margin: 1,
                            width: 250,
                            color: {
                                dark: '#ffffff',
                                light: '#111111'
                            }
                        });
                        
                        const qrSize = 180;
                        const qrX = x + cardW - qrSize - 50;
                        const qrY = y + (cardH - qrSize) / 2;
                        
                        const qrImg = await loadImage(qrUrl);
                        ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
                        
                        ctx.fillStyle = isLightMode ? '#aaaaaa' : '#666666';
                        ctx.font = `800 10px Inter, sans-serif`;
                        ctx.textAlign = 'center';
                        ctx.letterSpacing = '1px';
                        ctx.fillText('SCANNER POUR ACCÉDER', x + cardW - qrSize / 2 - 50, y + (cardH + qrSize) / 2 + 25);
                        ctx.textAlign = 'left';
                    } catch (qrErr) { console.warn('QR Code generation failed:', qrErr); }
                }

                // === BANNER ===
                else if (isBanner) {
                    ctx.fillStyle = getAccentColor();
                    ctx.fillRect(x, y, 15, cardH);
                    if (logoUrl) {
                        const imgLogo = await loadImage(logoUrl);
                        const logoW = cardW * 0.25;
                        const logoH = logoW * (imgLogo.height / imgLogo.width);
                        ctx.drawImage(imgLogo, x + 50, y + (cardH - logoH) / 2, logoW, logoH);
                    }
                    ctx.fillStyle = isLightMode ? '#111111' : '#f0f0f0';
                    ctx.textAlign = 'right';
                    let textY = y + 90;
                    if (userData.companyName) {
                        ctx.font = `900 55px Inter, sans-serif`;
                        ctx.fillText(userData.companyName.toUpperCase(), x + cardW - 50, textY);
                        textY += 70;
                    }
                    if (userData.activity) {
                        ctx.fillStyle = getAccentColor();
                        ctx.font = `italic 800 28px Inter, sans-serif`;
                        ctx.fillText(userData.activity.toUpperCase(), x + cardW - 50, textY);
                        textY += 65;
                    }
                    ctx.fillStyle = isLightMode ? '#555555' : '#888888';
                    ctx.font = `600 24px Inter, sans-serif`;
                    if (userData.phone) { ctx.fillText(userData.phone, x + cardW - 50, textY); textY += 55; }
                    if (userData.email) { ctx.fillText(userData.email.toLowerCase(), x + cardW - 50, textY); }
                }

                return canvas.toDataURL('image/png');
            }

            const canvas = document.createElement('canvas');
            const ratio = imgGarment.height / imgGarment.width;
            canvas.width = 2000;
            canvas.height = 2000 * ratio;

            const ctx = canvas.getContext('2d');
            if (!ctx) return logoUrl;

            // CRITICAL: High-quality smoothing for professional results
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';

            // 1. Dessiner le vêtement
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(imgGarment, 0, 0, canvas.width, canvas.height);

            // 2. Détecter le type de vêtement pour le placement
            const isSweat = garmentUrl.includes('hoodie');
            const isPolo = garmentUrl.includes('polo');
            const isTank = garmentUrl.includes('tank') || garmentUrl.includes('debardeur');
            const isOversize = garmentUrl.includes('oversize') || garmentUrl.includes('NX7200');
            const isHeavyWhite = isOversize && (garmentUrl.includes('white') || garmentUrl.includes('blanc'));
            const rawType = garmentType || (isPolo ? 'polo' : (isSweat ? 'sweat' : (isTank ? 'tank_top' : (isOversize ? 'tshirt_oversize' : 'tshirt'))));
            const typeGroup = PLACEMENTS[rawType as keyof typeof PLACEMENTS] || PLACEMENTS.tshirt;
            const pos = typeGroup[view] || typeGroup.front;
            
            let scale = pos.scale;
            if (customScale !== undefined) {
                if (customScale === 1.0) {
                    scale = pos.scale;
                } else {
                    const defaultSliderVal = view === 'front' ? 0.20 : 0.35;
                    const multiplier = customScale / defaultSliderVal;
                    scale = pos.scale * multiplier;
                }
            }

            // DÉVERROUILLAGE PRINTABLE AREA / BOUNDING BOX DOS :
            // Permet d'accueillir le visuel complet vertical (abeille + 2 lignes de texte "CLUB VISION ROOM")
            // sans crop ni padding excessif qui forcerait un zoom destructeur.
            const maxBoxW = canvas.width * (isHeavyWhite && view === 'back' ? Math.max(scale, 0.36) : scale);
            const maxBoxH = canvas.height * (view === 'back' ? Math.min(0.48, scale * 1.35) : scale * 1.25);
            const logoRatio = imgLogo.width / imgLogo.height;

            let logoW = maxBoxW;
            let logoH = logoW / logoRatio;

            // Si le visuel est vertical (hauteur > largeur), contraindre par la hauteur max pour garantir l'intégrité du texte
            if (logoH > maxBoxH) {
                logoH = maxBoxH;
                logoW = logoH * logoRatio;
            }

            // RECENTRAGE STRICT SUR LE CŒUR POUR LES SLOTS FACE CLASSIQUES :
            // Pour tous les vêtements textiles en vue front (tshirt, oversize, tank, polo, sweat, etc.),
            // s'assurer que le placement est strictement chest_left (x: 0.60 à 0.68, y: 0.30 à 0.40) et JAMAIS au centre horizontal.
            const isClassicFrontChest = view === 'front' && rawType !== 'business_card' && rawType !== 'banner';
            const defaultPosX = isClassicFrontChest ? (pos.x >= 0.58 ? pos.x : 0.64) : pos.x;
            const posX = (isOptionsObject && typeof options.customX === 'number') ? options.customX : defaultPosX;
            const defaultPosY = isClassicFrontChest ? (pos.y >= 0.30 && pos.y <= 0.40 ? pos.y : 0.34) : ((isHeavyWhite && view === 'back') ? 0.39 : pos.y);
            const posY = (isOptionsObject && typeof options.customY === 'number') ? (options.customY + (options.offsetY ? options.offsetY / 100 : 0)) : defaultPosY;

            ctx.globalAlpha = 1.0;
            ctx.drawImage(
                imgLogo,
                (canvas.width * posX) - (logoW / 2),
                (canvas.height * posY) - (logoH / 2),
                logoW,
                logoH
            );

            // PURGE ABSOLUE TEXTE / BRANDING INVOLONTAIRE SUR LE TEXTILE :
            // Strictement AUCUN fillText, strokeText ou dessin textuel (companyName, prospectName, slug, title, uid) n'est injecté sur le textile.
            // Le vêtement source envoyé à l'IA ne contient strictement que le fichier graphique du logo (l'abeille) centré sur le textile, sans aucun lettrage ajouté par le code.

            // 5. EXPORT AT UNIFIED SQUARE (1024x1024)
            const targetSize = 1024;
            const exportCanvas = document.createElement('canvas');
            exportCanvas.width = targetSize;
            exportCanvas.height = targetSize;
            const exportCtx = exportCanvas.getContext('2d')!;
            
            // CRITICAL: Force high-quality interpolation for the final downscale
            exportCtx.imageSmoothingEnabled = true;
            exportCtx.imageSmoothingQuality = 'high';
            
            // Fond transparent sans bandes de padding blanches
            exportCtx.clearRect(0, 0, targetSize, targetSize);

            // Remplir 100% de la zone 1024x1024 sans bandes de padding
            const scaleFactor = Math.max(targetSize / canvas.width, targetSize / canvas.height);
            const scaledW = canvas.width * scaleFactor;
            const scaledH = canvas.height * scaleFactor;
            const dx = (targetSize - scaledW) / 2;
            const dy = (targetSize - scaledH) / 2;

            exportCtx.drawImage(canvas, 0, 0, canvas.width, canvas.height, dx, dy, scaledW, scaledH);
            const resultUrl = exportCanvas.toDataURL('image/png', 1.0);
            canvas.width = 0;
            canvas.height = 0;
            exportCanvas.width = 0;
            exportCanvas.height = 0;
            return resultUrl;
        } catch (e) {
            console.error("Mechanical Mockup Error:", e);
            return garmentUrl || logoUrl;
        }
    };

export const compressImage = (base64: string, maxEdge: number = 800, forceSquare: boolean = false): Promise<string> => {
        return new Promise((resolve, reject) => {
            if (!base64 || typeof base64 !== 'string') {
                return reject(new Error("Image source invalide ou vide"));
            }
            const timeout = setTimeout(() => reject(new Error("Timeout compression image")), 15000);
            const img = new Image();
            if (base64.startsWith('http://') || base64.startsWith('https://')) {
                img.crossOrigin = 'anonymous';
            }
            img.onerror = () => { clearTimeout(timeout); reject(new Error(`Erreur chargement image: ${base64.substring(0, 60)}...`)); };
            img.onload = () => {
                clearTimeout(timeout);
                const canvas = document.createElement('canvas');
                let w = img.width;
                let h = img.height;
                let sx = 0;
                let sy = 0;

                if (forceSquare) {
                    const size = Math.min(w, h);
                    sx = (w - size) / 2;
                    sy = (h - size) / 2;
                    w = size;
                    h = size;
                }

                const scale = Math.min(maxEdge / w, maxEdge / h);
                canvas.width = Math.round(w * scale);
                canvas.height = Math.round(h * scale);
                const ctx = canvas.getContext('2d')!;
                ctx.drawImage(img, sx, sy, w, h, 0, 0, canvas.width, canvas.height);
                const isPng = base64.startsWith('data:image/png') || base64.toLowerCase().includes('.png');
                const mime = isPng ? 'image/png' : 'image/jpeg';
                const resultUrl = canvas.toDataURL(mime, isPng ? 1.0 : 0.85);
                canvas.width = 0;
                canvas.height = 0;
                img.src = '';
                resolve(resultUrl);
            };
            img.src = base64;
        });
    };

/**
 * Rendu fidèle du logo textile - Strictement aucune typographie synthétique ajoutée.
 * Le vêtement affiche UNIQUEMENT le fichier image du logo importé/détouré via ctx.drawImage.
 * Ne déclenche aucun fallback textuel (nom du prospect, slug, marque) même pour un symbole ou une icône seule (ex: abeille).
 */
export const drawLogoOnGarment = generateMechanicalMockup;
export const renderMockup = generateMechanicalMockup;
export const generateMockup = generateMechanicalMockup;

function safeLoadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    if (!src) return reject(new Error('Source image vide'));
    const img = new Image();
    if (src.startsWith('http://') || src.startsWith('https://')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
    if (img.complete && img.naturalWidth > 0) resolve(img);
  });
}

export async function splitSubjectAlphaAndColor(
  sourceImage: string | HTMLImageElement
): Promise<{
  hasAlpha: boolean;
  opaqueImageBase64: string;
  alphaMaskCanvas: HTMLCanvasElement | null;
  originalWidth: number;
  originalHeight: number;
}> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    const rawStr = typeof sourceImage === 'string' ? sourceImage : '';
    return {
      hasAlpha: false,
      opaqueImageBase64: rawStr,
      alphaMaskCanvas: null,
      originalWidth: 800,
      originalHeight: 800,
    };
  }

  const img = typeof sourceImage === 'string' ? await safeLoadImage(sourceImage) : sourceImage;
  const w = img.naturalWidth || img.width || 800;
  const h = img.naturalHeight || img.height || 800;

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    const rawStr = typeof sourceImage === 'string' ? sourceImage : '';
    return {
      hasAlpha: false,
      opaqueImageBase64: rawStr,
      alphaMaskCanvas: null,
      originalWidth: w,
      originalHeight: h,
    };
  }

  ctx.drawImage(img, 0, 0, w, h);
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  let hasAlpha = false;
  const len = data.length;
  for (let i = 3; i < len; i += 4) {
    if (data[i] < 250) {
      hasAlpha = true;
      break;
    }
  }

  if (!hasAlpha) {
    const rawStr = typeof sourceImage === 'string' ? sourceImage : canvas.toDataURL('image/png');
    return {
      hasAlpha: false,
      opaqueImageBase64: rawStr,
      alphaMaskCanvas: null,
      originalWidth: w,
      originalHeight: h,
    };
  }

  const alphaMaskCanvas = document.createElement('canvas');
  alphaMaskCanvas.width = w;
  alphaMaskCanvas.height = h;
  const alphaCtx = alphaMaskCanvas.getContext('2d', { willReadFrequently: true });
  if (!alphaCtx) throw new Error("Impossible d'initialiser le contexte Canvas du masque alpha");

  const maskImageData = alphaCtx.createImageData(w, h);
  const maskData = maskImageData.data;
  for (let i = 0; i < len; i += 4) {
    const a = data[i + 3];
    maskData[i] = a;
    maskData[i + 1] = a;
    maskData[i + 2] = a;
    maskData[i + 3] = a;
  }
  alphaCtx.putImageData(maskImageData, 0, 0);

  const silhouetteCanvas = document.createElement('canvas');
  silhouetteCanvas.width = w;
  silhouetteCanvas.height = h;
  const silCtx = silhouetteCanvas.getContext('2d');
  if (!silCtx) throw new Error("Impossible d'initialiser le canvas silhouette");

  silCtx.fillStyle = '#FFFFFF';
  silCtx.fillRect(0, 0, w, h);
  silCtx.drawImage(img, 0, 0, w, h);
  const opaqueImageBase64 = silhouetteCanvas.toDataURL('image/png');

  return {
    hasAlpha: true,
    opaqueImageBase64,
    alphaMaskCanvas,
    originalWidth: w,
    originalHeight: h,
  };
}

export function applyCanvasMultiScaleSharpening(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  macroStrength: number = 0.85,
  microStrength: number = 1.35,
  contrastBoost: number = 1.05
): void {
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;
  const copy = new Uint8ClampedArray(data);
  const stride = width * 4;

  for (let y = 2; y < height - 2; y++) {
    const rowOffset = y * stride;
    const rPrev1 = (y - 1) * stride;
    const rNext1 = (y + 1) * stride;
    const rPrev2 = (y - 2) * stride;
    const rNext2 = (y + 2) * stride;

    for (let x = 2; x < width - 2; x++) {
      const idx = rowOffset + x * 4;
      const alpha = copy[idx + 3];
      if (alpha === 0) continue;

      for (let c = 0; c < 3; c++) {
        const center = copy[idx + c];
        const up1 = copy[rPrev1 + x * 4 + c];
        const down1 = copy[rNext1 + x * 4 + c];
        const left1 = copy[rowOffset + (x - 1) * 4 + c];
        const right1 = copy[rowOffset + (x + 1) * 4 + c];
        const laplacian1 = 4 * center - (up1 + down1 + left1 + right1);

        const up2 = copy[rPrev2 + x * 4 + c];
        const down2 = copy[rNext2 + x * 4 + c];
        const left2 = copy[rowOffset + (x - 2) * 4 + c];
        const right2 = copy[rowOffset + (x + 2) * 4 + c];
        const laplacian2 = 4 * center - (up2 + down2 + left2 + right2);

        let val = center + microStrength * (laplacian1 / 4) + macroStrength * (laplacian2 / 4);
        if (contrastBoost !== 1.0) {
          val = (val - 128) * contrastBoost + 128;
        }

        data[idx + c] = val < 0 ? 0 : val > 255 ? 255 : Math.round(val);
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
}

export async function mergeUpscaledWithAlphaMask(
  upscaledSource: string | HTMLImageElement,
  alphaMaskCanvas: HTMLCanvasElement | null,
  originalWidth: number,
  originalHeight: number
): Promise<string> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return typeof upscaledSource === 'string' ? upscaledSource : '';
  }

  const upscaledImg = typeof upscaledSource === 'string'
    ? await safeLoadImage(upscaledSource)
    : upscaledSource;

  const targetW = upscaledImg.naturalWidth || upscaledImg.width || originalWidth;
  const targetH = upscaledImg.naturalHeight || upscaledImg.height || originalHeight;

  const finalCanvas = document.createElement('canvas');
  finalCanvas.width = targetW;
  finalCanvas.height = targetH;
  const finalCtx = finalCanvas.getContext('2d', { willReadFrequently: true });
  if (!finalCtx) throw new Error('Impossible de créer le contexte du Canvas final HD');

  finalCtx.drawImage(upscaledImg, 0, 0, targetW, targetH);

  if (alphaMaskCanvas) {
    const resizedMaskCanvas = document.createElement('canvas');
    resizedMaskCanvas.width = targetW;
    resizedMaskCanvas.height = targetH;
    const rMaskCtx = resizedMaskCanvas.getContext('2d', { willReadFrequently: true });
    if (!rMaskCtx) throw new Error('Impossible de redimensionner le masque alpha');

    rMaskCtx.imageSmoothingEnabled = true;
    rMaskCtx.imageSmoothingQuality = 'high';
    rMaskCtx.drawImage(alphaMaskCanvas, 0, 0, targetW, targetH);

    const maskImgData = rMaskCtx.getImageData(0, 0, targetW, targetH);
    const maskData = maskImgData.data;

    const finalImgData = finalCtx.getImageData(0, 0, targetW, targetH);
    const finalData = finalImgData.data;
    const len = finalData.length;

    for (let i = 0; i < len; i += 4) {
      finalData[i + 3] = maskData[i + 3];
    }
    finalCtx.putImageData(finalImgData, 0, 0);
  }

  applyCanvasMultiScaleSharpening(finalCtx, targetW, targetH);

  const MAX_SAFE_ASSET_LENGTH = 500 * 1024;
  let outputDataUrl = finalCanvas.toDataURL('image/webp', 0.94);

  if (outputDataUrl.length > MAX_SAFE_ASSET_LENGTH) {
    outputDataUrl = finalCanvas.toDataURL('image/webp', 0.88);
  }
  if (outputDataUrl.length > MAX_SAFE_ASSET_LENGTH) {
    outputDataUrl = finalCanvas.toDataURL('image/webp', 0.80);
  }

  if (outputDataUrl.length > MAX_SAFE_ASSET_LENGTH && (targetW > 2048 || targetH > 2048)) {
    const maxBound = 2048;
    const factor = maxBound / Math.max(targetW, targetH);
    const boundW = Math.round(targetW * factor);
    const boundH = Math.round(targetH * factor);

    const boundCanvas = document.createElement('canvas');
    boundCanvas.width = boundW;
    boundCanvas.height = boundH;
    const boundCtx = boundCanvas.getContext('2d');
    if (boundCtx) {
      boundCtx.imageSmoothingEnabled = true;
      boundCtx.imageSmoothingQuality = 'high';
      boundCtx.drawImage(finalCanvas, 0, 0, boundW, boundH);
      outputDataUrl = boundCanvas.toDataURL('image/webp', 0.85);
    }
  }

  return outputDataUrl;
}

export async function remasterSubjectAi(imageBase64: string, explicitEmail?: string): Promise<string> {
  if (!imageBase64) return '';

  let splitResult: {
    hasAlpha: boolean;
    opaqueImageBase64: string;
    alphaMaskCanvas: HTMLCanvasElement | null;
    originalWidth: number;
    originalHeight: number;
  } | null = null;

  try {
    splitResult = await splitSubjectAlphaAndColor(imageBase64);
  } catch (splitErr) {
    console.warn('[remasterSubjectAi] Erreur lors du split alpha/couleur :', splitErr);
  }

  const payloadImage = splitResult ? splitResult.opaqueImageBase64 : imageBase64;
  let upscaledImageOutput: string | null = null;

  try {
    const res = await fetch('/api/remaster-subject', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(explicitEmail ? { 'X-User-Email': explicitEmail } : {}),
      },
      body: JSON.stringify({
        imageBase64: payloadImage,
        userEmail: explicitEmail,
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok) {
      const data = await res.json();
      const output = data.remasteredImage || data.processedImageBase64 || data.imageUrl || data.image;
      if (output && typeof output === 'string' && output.length > 100) {
        upscaledImageOutput = output;
      }
    }
  } catch (apiErr: any) {
    console.info('[remasterSubjectAi] API locale notice:', apiErr?.message || apiErr);
  }

  if (!upscaledImageOutput && explicitEmail) {
    try {
      const data = await invokeGeminiCloudFunction<{
        success: boolean;
        remasteredImage?: string;
        processedImageBase64?: string;
        imageUrl?: string;
        image?: string;
        result?: string;
      }>({
        action: 'remaster-subject',
        model: 'gemini-4-argon',
        image: payloadImage,
        imageBase64: payloadImage,
        userEmail: explicitEmail,
      }, 15000);

      const output =
        data.remasteredImage ||
        data.processedImageBase64 ||
        data.imageUrl ||
        data.image ||
        data.result;

      if (output && typeof output === 'string' && output.length > 100) {
        upscaledImageOutput = output;
      }
    } catch (cloudErr: any) {
      console.info('[remasterSubjectAi] Cloud Function notice, repli vers local :', cloudErr?.message || cloudErr);
    }
  }

  if (upscaledImageOutput && splitResult && splitResult.hasAlpha && splitResult.alphaMaskCanvas) {
    try {
      return await mergeUpscaledWithAlphaMask(
        upscaledImageOutput,
        splitResult.alphaMaskCanvas,
        splitResult.originalWidth,
        splitResult.originalHeight
      );
    } catch (mergeErr) {
      console.error('[remasterSubjectAi] Erreur ré-assemblage alpha post-upscale :', mergeErr);
    }
  } else if (upscaledImageOutput) {
    try {
      return await mergeUpscaledWithAlphaMask(
        upscaledImageOutput,
        null,
        splitResult ? splitResult.originalWidth : 800,
        splitResult ? splitResult.originalHeight : 800
      );
    } catch {
      return upscaledImageOutput;
    }
  }

  if (splitResult && typeof window !== 'undefined') {
    try {
      const localUpscaleCanvas = document.createElement('canvas');
      const origW = splitResult.originalWidth;
      const origH = splitResult.originalHeight;
      const maxDim = Math.max(origW, origH);
      const scaleFactor = Math.min(4, Math.max(2, 2048 / maxDim));
      const targetW = Math.round(origW * scaleFactor);
      const targetH = Math.round(origH * scaleFactor);

      localUpscaleCanvas.width = targetW;
      localUpscaleCanvas.height = targetH;
      const localCtx = localUpscaleCanvas.getContext('2d');
      if (localCtx) {
        localCtx.imageSmoothingEnabled = true;
        localCtx.imageSmoothingQuality = 'high';
        const srcImg = await safeLoadImage(payloadImage);
        localCtx.drawImage(srcImg, 0, 0, targetW, targetH);
        applyCanvasMultiScaleSharpening(localCtx, targetW, targetH, 0.9, 1.4, 1.06);
        const localUpscaledBase64 = localUpscaleCanvas.toDataURL('image/png');

        return await mergeUpscaledWithAlphaMask(
          localUpscaledBase64,
          splitResult.alphaMaskCanvas,
          origW,
          origH
        );
      }
    } catch (localErr) {
      console.warn('[remasterSubjectAi] Échec repli upscale local :', localErr);
    }
  }

  return imageBase64;
}

export interface HarmonizeSubjectOptions {
  currentTone?: number;
  explicitEmail?: string;
  format?: string;
}

export interface HarmonizeSubjectLightingAnalysis {
  lightDirection: string;
  intensity: string;
  colorTemperature: string;
  dominantColor?: string;
  ambientColor?: string;
  summary: string;
}

export interface HarmonizeSubjectResult {
  success: boolean;
  harmonizedSubjectImage?: string;
  compositeImageUrl?: string;
  wasCutout?: boolean;
  brightness: number;
  contrast: number;
  saturation: number;
  hueRotate: number;
  opacity: number;
  suggestedBackgroundTone?: number;
  shadow: {
    offsetX: number;
    offsetY: number;
    blur: number;
    color: string;
    opacity: number;
  };
  blendMode?: 'normal' | 'overlay' | 'soft-light' | 'multiply';
  analysis: HarmonizeSubjectLightingAnalysis;
  filterCss: string;
  source?: string;
}

export async function prepareImageForAiAnalysis(
  sourceUrlOrBase64: string,
  maxDimension = 768,
  preferWebp = true
): Promise<string> {
  if (!sourceUrlOrBase64) return '';
  try {
    const img = await safeLoadImage(sourceUrlOrBase64);
    const naturalW = img.naturalWidth || 512;
    const naturalH = img.naturalHeight || 512;
    const scale = Math.min(1, maxDimension / Math.max(naturalW, naturalH));
    const targetW = Math.max(64, Math.round(naturalW * scale));
    const targetH = Math.max(64, Math.round(naturalH * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return sourceUrlOrBase64;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'medium';
    ctx.drawImage(img, 0, 0, targetW, targetH);

    if (preferWebp) {
      try {
        const webp = canvas.toDataURL('image/webp', 0.82);
        if (webp && webp.startsWith('data:image/webp')) return webp;
      } catch {}
    }
    return canvas.toDataURL('image/png');
  } catch (err) {
    console.warn('[prepareImageForAiAnalysis] Repli direct sur la source:', err);
    return sourceUrlOrBase64;
  }
}

export function isImageCutoutCanvas(img: HTMLImageElement | HTMLCanvasElement): boolean {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return false;
    ctx.drawImage(img, 0, 0, 64, 64);
    const data = ctx.getImageData(0, 0, 64, 64).data;
    let transparent = 0;
    const total = 64 * 64;
    for (let i = 0; i < total; i++) {
      if (data[i * 4 + 3] < 240) transparent++;
    }
    return (transparent / total) > 0.03;
  } catch {
    return false;
  }
}

function analyzeLightingLocallyViaCanvas(
  decorImg: HTMLImageElement,
  currentTone = 0.5
): HarmonizeSubjectResult {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  let rAvg = 128, gAvg = 128, bAvg = 128;
  let leftLum = 128, rightLum = 128, topLum = 128, bottomLum = 128;

  if (ctx) {
    try {
      ctx.drawImage(decorImg, 0, 0, 32, 32);
      const imgData = ctx.getImageData(0, 0, 32, 32).data;
      let totalR = 0, totalG = 0, totalB = 0;
      let leftL = 0, rightL = 0, topL = 0, bottomL = 0;
      const count = 32 * 32;
      const halfCount = count / 2;

      for (let y = 0; y < 32; y++) {
        for (let x = 0; x < 32; x++) {
          const idx = (y * 32 + x) * 4;
          const r = imgData[idx];
          const g = imgData[idx + 1];
          const b = imgData[idx + 2];
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;

          totalR += r;
          totalG += g;
          totalB += b;

          if (x < 16) leftL += lum; else rightL += lum;
          if (y < 16) topL += lum; else bottomL += lum;
        }
      }

      rAvg = totalR / count;
      gAvg = totalG / count;
      bAvg = totalB / count;
      leftLum = leftL / halfCount;
      rightLum = rightL / halfCount;
      topLum = topL / halfCount;
      bottomLum = bottomL / halfCount;
    } catch {}
  }

  const overallLum = 0.299 * rAvg + 0.587 * gAvg + 0.114 * bAvg;
  const isWarm = rAvg > bAvg + 12;
  const isCool = bAvg > rAvg + 12;
  const diffX = rightLum - leftLum;
  const diffY = topLum - bottomLum;

  let lightDir = 'top';
  let shadowOffsetX = 0;
  if (diffX > 10) {
    lightDir = 'top-right';
    shadowOffsetX = -10;
  } else if (diffX < -10) {
    lightDir = 'top-left';
    shadowOffsetX = 10;
  }

  const shadowOffsetY = diffY > 8 ? 22 : 16;
  const shadowBlur = overallLum < 90 ? 32 : 24;
  const shadowOpacity = overallLum < 90 ? 0.75 : 0.55;
  const shadowColor = `rgba(0, 0, 0, ${shadowOpacity})`;

  const brightness = overallLum < 80 ? 0.94 : overallLum > 180 ? 1.05 : 0.98;
  const contrast = overallLum < 80 ? 1.15 : 1.08;
  const saturation = isWarm ? 1.12 : isCool ? 1.05 : 1.08;
  const hueRotate = isWarm ? 4 : isCool ? -4 : 0;
  const opacity = 0.98;
  const suggestedTone = overallLum < 90 ? 0.75 : overallLum > 175 ? 0.35 : currentTone;

  const tempLabel = isWarm ? 'Chaude' : isCool ? 'Froide' : 'Neutre';
  const summary = `Lumière ${lightDir.replace('-', ' ')} • Ambiance ${tempLabel.toLowerCase()} (calibrage local)`;

  const filterCss = `drop-shadow(${shadowOffsetX}px ${shadowOffsetY}px ${shadowBlur}px ${shadowColor}) contrast(${contrast}) brightness(${brightness}) saturate(${saturation})${hueRotate ? ` hue-rotate(${hueRotate}deg)` : ''}`;

  return {
    success: true,
    brightness,
    contrast,
    saturation,
    hueRotate,
    opacity,
    suggestedBackgroundTone: suggestedTone,
    shadow: {
      offsetX: shadowOffsetX,
      offsetY: shadowOffsetY,
      blur: shadowBlur,
      color: shadowColor,
      opacity: shadowOpacity,
    },
    blendMode: 'normal',
    analysis: {
      lightDirection: lightDir,
      intensity: 'soft',
      colorTemperature: isWarm ? 'warm' : isCool ? 'cool' : 'neutral',
      dominantColor: `rgb(${Math.round(rAvg)}, ${Math.round(gAvg)}, ${Math.round(bAvg)})`,
      summary,
    },
    filterCss,
    source: 'canvas-local-heuristic',
  };
}

async function composeSubjectLocallyViaCanvas(
  subjectSrc: string,
  analysis: HarmonizeSubjectResult
): Promise<{ harmonizedSubjectImage: string; wasCutout: boolean }> {
  let wasCutout = false;
  let sourceToDraw = subjectSrc;

  try {
    const subImg = await safeLoadImage(subjectSrc);
    const alreadyCutout = isImageCutoutCanvas(subImg);
    if (!alreadyCutout) {
      const localCutout = await removeBackgroundWithCanvas(subjectSrc, { type: 'subject' });
      if (localCutout && localCutout !== subjectSrc && localCutout.length > 50) {
        sourceToDraw = localCutout;
        wasCutout = true;
      }
    }
  } catch {}

  try {
    const cutImg = await safeLoadImage(sourceToDraw);
    const sw = cutImg.naturalWidth || 800;
    const sh = cutImg.naturalHeight || 800;

    const padX = Math.abs(analysis.shadow.offsetX) + Math.round(analysis.shadow.blur * 0.6);
    const padTop = Math.round(analysis.shadow.blur * 0.3);
    const padBottom = Math.max(0, analysis.shadow.offsetY) + Math.round(analysis.shadow.blur * 0.6);
    const outW = sw + padX * 2;
    const outH = sh + padTop + padBottom;

    const canvas = document.createElement('canvas');
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return { harmonizedSubjectImage: sourceToDraw, wasCutout };

    ctx.save();
    ctx.shadowColor = analysis.shadow.color || 'rgba(0, 0, 0, 0.65)';
    ctx.shadowBlur = analysis.shadow.blur || 25;
    ctx.shadowOffsetX = analysis.shadow.offsetX;
    ctx.shadowOffsetY = analysis.shadow.offsetY;
    ctx.drawImage(cutImg, padX, padTop, sw, sh);
    ctx.restore();

    ctx.save();
    const b = analysis.brightness ?? 0.98;
    const c = analysis.contrast ?? 1.10;
    const s = analysis.saturation ?? 1.08;
    const h = analysis.hueRotate ?? 0;
    ctx.filter = `contrast(${c}) brightness(${b}) saturate(${s})${h ? ` hue-rotate(${h}deg)` : ''}`;
    ctx.drawImage(cutImg, padX, padTop, sw, sh);
    ctx.restore();

    return {
      harmonizedSubjectImage: canvas.toDataURL('image/png'),
      wasCutout,
    };
  } catch {
    return { harmonizedSubjectImage: sourceToDraw, wasCutout };
  }
}

export async function harmonizeSubjectWithAi(
  decorUrlOrBase64: string,
  subjectUrlOrBase64: string,
  options?: HarmonizeSubjectOptions
): Promise<HarmonizeSubjectResult> {
  if (!subjectUrlOrBase64) {
    throw new Error("Image du sujet requise pour l'harmonisation.");
  }

  const [preparedDecor, preparedSubject] = await Promise.all([
    decorUrlOrBase64 ? prepareImageForAiAnalysis(decorUrlOrBase64, 1024, true) : Promise.resolve(''),
    prepareImageForAiAnalysis(subjectUrlOrBase64, 1600, false),
  ]);

  const payload = {
    action: 'harmonize-subject' as const,
    backgroundImage: preparedDecor,
    subjectImage: preparedSubject,
    currentTone: options?.currentTone ?? 0.5,
    format: options?.format || 'post',
    userEmail: options?.explicitEmail || getCurrentUserEmail(),
  };

  try {
    const response = await invokeGeminiCloudFunction<any>(payload, 30000);
    if (response && response.success) {
      const harmonizedImg =
        response.harmonizedSubjectImage ||
        response.processedImageBase64 ||
        response.imageUrl ||
        response.image;

      const b = Math.max(0.5, Math.min(1.5, Number(response.brightness) || 1.0));
      const c = Math.max(0.5, Math.min(1.5, Number(response.contrast) || 1.0));
      const s = Math.max(0.0, Math.min(2.0, Number(response.saturation) || 1.0));
      const h = Math.max(-180, Math.min(180, Number(response.hueRotate) || 0));
      const op = Math.max(0.2, Math.min(1.0, Number(response.opacity) || 0.98));

      const shadow = response.shadow || {};
      const sX = Math.max(-50, Math.min(50, Number(shadow.offsetX) || 0));
      const sY = Math.max(0, Math.min(60, Number(shadow.offsetY) || 20));
      const sBlur = Math.max(0, Math.min(60, Number(shadow.blur) || 30));
      const sOpacity = Math.max(0.1, Math.min(1.0, Number(shadow.opacity) || 0.65));
      const sColor = shadow.color || `rgba(0, 0, 0, ${sOpacity})`;

      const filterCss = (sBlur > 0 || sOpacity > 0)
        ? `drop-shadow(${sX}px ${sY}px ${sBlur}px ${sColor}) contrast(${c}) brightness(${b}) saturate(${s})${h ? ` hue-rotate(${h}deg)` : ''}`
        : `contrast(${c}) brightness(${b}) saturate(${s})${h ? ` hue-rotate(${h}deg)` : ''}`;

      return {
        success: true,
        harmonizedSubjectImage: harmonizedImg,
        compositeImageUrl: response.compositeImageUrl || response.compositeImage,
        wasCutout: Boolean(response.wasCutout),
        brightness: Number(b.toFixed(2)),
        contrast: Number(c.toFixed(2)),
        saturation: Number(s.toFixed(2)),
        hueRotate: Math.round(h),
        opacity: Number(op.toFixed(2)),
        suggestedBackgroundTone: typeof response.suggestedBackgroundTone === 'number' ? response.suggestedBackgroundTone : undefined,
        shadow: {
          offsetX: Math.round(sX),
          offsetY: Math.round(sY),
          blur: Math.round(sBlur),
          color: sColor,
          opacity: Number(sOpacity.toFixed(2)),
        },
        blendMode: response.blendMode || 'normal',
        analysis: {
          lightDirection: response.analysis?.lightDirection || 'top',
          intensity: response.analysis?.intensity || 'soft',
          colorTemperature: response.analysis?.colorTemperature || 'neutral',
          dominantColor: response.analysis?.dominantColor,
          ambientColor: response.analysis?.ambientColor,
          summary: response.analysis?.summary || 'Éclairage et ombres calibrés par IA',
        },
        filterCss,
        source: response.source || 'gemini-cloud-function',
      };
    }
  } catch (cloudErr) {
    console.warn('[harmonizeSubjectWithAi] Cloud Function notice, repli local :', cloudErr);
  }

  try {
    const directRes = await fetch('/api/harmonize-subject', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(options?.explicitEmail ? { 'X-User-Email': options.explicitEmail } : {}),
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(20000),
    });

    if (directRes.ok) {
      const directJson = await directRes.json();
      if (directJson && directJson.success) {
        return {
          ...directJson,
          harmonizedSubjectImage: directJson.harmonizedSubjectImage || directJson.processedImageBase64,
          compositeImageUrl: directJson.compositeImageUrl,
          wasCutout: Boolean(directJson.wasCutout),
        } as HarmonizeSubjectResult;
      }
    }
  } catch (directErr) {
    console.warn('[harmonizeSubjectWithAi] /api/harmonize-subject notice:', directErr);
  }

  try {
    const decorImg = await safeLoadImage(decorUrlOrBase64 || '/demo/signaid-backgroundImage.webp');
    const localAnalysis = analyzeLightingLocallyViaCanvas(decorImg, options?.currentTone ?? 0.5);
    const composed = await composeSubjectLocallyViaCanvas(subjectUrlOrBase64, localAnalysis);

    return {
      ...localAnalysis,
      harmonizedSubjectImage: composed.harmonizedSubjectImage,
      wasCutout: composed.wasCutout,
      brightness: 1.0,
      contrast: 1.0,
      saturation: 1.0,
      hueRotate: 0,
      shadow: {
        offsetX: 0,
        offsetY: 0,
        blur: 0,
        color: 'transparent',
        opacity: 0,
      },
      source: 'canvas-local-heuristic',
    };
  } catch {
    return {
      success: true,
      brightness: 1.0,
      contrast: 1.0,
      saturation: 1.0,
      hueRotate: 0,
      opacity: 0.98,
      suggestedBackgroundTone: options?.currentTone ?? 0.5,
      shadow: {
        offsetX: 0,
        offsetY: 0,
        blur: 0,
        color: 'transparent',
        opacity: 0,
      },
      blendMode: 'normal',
      analysis: {
        lightDirection: 'top',
        intensity: 'soft',
        colorTemperature: 'neutral',
        summary: 'Éclairage studio équilibré par défaut',
      },
      filterCss: 'contrast(1.0) brightness(1.0)',
      source: 'deterministic-fallback',
    };
  }
}

export interface HarmonizeWithImagen3Options {
  explicitEmail?: string;
  prompt?: string;
}

export interface HarmonizeWithImagen3Result {
  success: boolean;
  imageUrl: string;
  source?: string;
  model?: string;
  error?: string;
}

export interface CreateStudioCompositeOptions {
  decorUrl: string;
  subjectUrl: string;
  previewContainer?: HTMLElement | null;
  targetWidth?: number;
  targetHeight?: number;
  formatTransforms?: {
    scale?: number;
    offsetX?: number;
    offsetY?: number;
    alignX?: string;
  };
  backgroundOpacity?: number;
  backgroundBrightness?: number;
  canvasBgColor?: string;
  currentTone?: number;
  isToneActive?: boolean;
}

export async function createStudioCompositeCanvas(
  options: CreateStudioCompositeOptions
): Promise<HTMLCanvasElement> {
  const targetWidth = options.targetWidth || 1080;
  const targetHeight = options.targetHeight || 1080;

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error("Impossible d'obtenir le contexte 2D pour le canvas composite.");
  }

  ctx.fillStyle = options.canvasBgColor || '#000000';
  ctx.fillRect(0, 0, targetWidth, targetHeight);

  if (options.decorUrl) {
    try {
      const decorImg = await safeLoadImage(options.decorUrl);
      const sRatio = decorImg.naturalWidth / decorImg.naturalHeight;
      const dRatio = targetWidth / targetHeight;
      let sx = 0;
      let sy = 0;
      let sWidth = decorImg.naturalWidth;
      let sHeight = decorImg.naturalHeight;

      if (sRatio > dRatio) {
        sWidth = decorImg.naturalHeight * dRatio;
        sx = (decorImg.naturalWidth - sWidth) / 2;
      } else {
        sHeight = decorImg.naturalWidth / dRatio;
        sy = (decorImg.naturalHeight - sHeight) / 2;
      }

      ctx.save();
      if (typeof options.backgroundOpacity === 'number') {
        ctx.globalAlpha = options.backgroundOpacity;
      }
      const toneOverlay = computeToneOverlay(options.currentTone, options.isToneActive, options.backgroundBrightness);
      if (!toneOverlay.isNeutral && toneOverlay.filterCss !== 'none') {
        ctx.filter = toneOverlay.filterCss;
      }
      ctx.drawImage(decorImg, sx, sy, sWidth, sHeight, 0, 0, targetWidth, targetHeight);
      ctx.restore();
    } catch (decorErr) {
      console.warn('[createStudioCompositeCanvas] Impossible de charger le décor de fond :', decorErr);
    }
  }

  const toneOverlay = computeToneOverlay(options.currentTone, options.isToneActive, options.backgroundBrightness);
  if (options.isToneActive && !toneOverlay.isNeutral && toneOverlay.opacity > 0) {
    ctx.save();
    ctx.fillStyle = toneOverlay.color;
    ctx.globalAlpha = toneOverlay.opacity;
    ctx.fillRect(0, 0, targetWidth, targetHeight);
    ctx.restore();
  }

  if (options.subjectUrl) {
    try {
      const subImg = await safeLoadImage(options.subjectUrl);

      let destX = 0;
      let destY = 0;
      let destW = targetWidth;
      let destH = targetHeight;
      let resolvedViaDom = false;

      const container = options.previewContainer || document.querySelector('[data-poster-container="true"]');
      const subjectEl = container?.querySelector('img[alt="Sujet DJ"]') as HTMLImageElement | null;

      if (container && subjectEl) {
        const cRect = container.getBoundingClientRect();
        const sRect = subjectEl.getBoundingClientRect();
        if (cRect.width > 0 && cRect.height > 0 && sRect.width > 0 && sRect.height > 0) {
          const relX = (sRect.left - cRect.left) / cRect.width;
          const relY = (sRect.top - cRect.top) / cRect.height;
          const relW = sRect.width / cRect.width;
          const relH = sRect.height / cRect.height;

          destX = Math.round(relX * targetWidth);
          destY = Math.round(relY * targetHeight);
          destW = Math.round(relW * targetWidth);
          destH = Math.round(relH * targetHeight);
          resolvedViaDom = true;
        }
      }

      if (!resolvedViaDom) {
        const tr = options.formatTransforms || {};
        const scale = tr.scale ?? 1.0;
        const offsetX = (tr.offsetX ?? 0) / 100;
        const offsetY = (tr.offsetY ?? 0) / 100;
        const alignX = tr.alignX ?? 'center';

        const subAspect = (subImg.naturalWidth || 800) / (subImg.naturalHeight || 1000);
        const availH = targetHeight * 0.93;
        const availW = targetWidth;

        let baseW = availH * subAspect;
        let baseH = availH;
        if (baseW > availW) {
          baseW = availW;
          baseH = availW / subAspect;
        }

        const scaledW = baseW * scale;
        const scaledH = baseH * scale;

        let originX = (targetWidth - scaledW) / 2;
        if (alignX === 'left') originX = targetWidth * 0.08;
        if (alignX === 'right') originX = targetWidth * 0.92 - scaledW;

        destX = Math.round(originX + offsetX * targetWidth);
        destY = Math.round((targetHeight - scaledH) + offsetY * targetHeight);
        destW = Math.round(scaledW);
        destH = Math.round(scaledH);
      }

      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(subImg, destX, destY, destW, destH);
      ctx.restore();
    } catch (subErr) {
      console.warn('[createStudioCompositeCanvas] Erreur chargement sujet :', subErr);
    }
  }

  return canvas;
}

export async function harmonizeWithImagen3(
  compositeCanvasOrDataUrl: HTMLCanvasElement | string,
  options?: HarmonizeWithImagen3Options
): Promise<HarmonizeWithImagen3Result> {
  const base64Data =
    typeof compositeCanvasOrDataUrl === 'string'
      ? compositeCanvasOrDataUrl
      : compositeCanvasOrDataUrl.toDataURL('image/jpeg', 0.95);

  if (!base64Data || base64Data.length < 50) {
    throw new Error("Canvas composite invalide ou vide pour l'harmonisation Imagen 3.");
  }

  const payload = {
    compositeImage: base64Data,
    image: base64Data,
    prompt:
      options?.prompt ||
      'Harmonize and seamlessly blend the foreground subject into the background scene with matching lighting, photorealistic contact shadows, natural depth of field, and unified color grading. Studio commercial poster quality.',
    userEmail: options?.explicitEmail,
  };

  const CLOUD_FUNCTION_URL = 'https://us-central1-signaid-prod.cloudfunctions.net/harmonizeSubject';

  try {
    const res = await fetch(CLOUD_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(options?.explicitEmail ? { 'X-User-Email': options.explicitEmail } : {}),
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(65000),
    });

    if (res.ok) {
      const json = await res.json();
      const data = json.result || json.data || json;
      const imageUrl = data.imageUrl || data.image || data.harmonizedSubjectImage || data.compositeImageUrl || data.url;
      if (imageUrl && typeof imageUrl === 'string') {
        return {
          success: true,
          imageUrl,
          source: data.source || 'vertexai-imagen-3.0-capability-001',
          model: data.model || 'imagen-3.0-capability-001',
        };
      }
    }
  } catch (err: any) {
    console.warn('[harmonizeWithImagen3] Cloud function direct notice:', err?.message || err);
  }

  try {
    const data = await invokeGeminiCloudFunction<any>({
      action: 'harmonize-subject',
      ...payload,
    }, 65000);

    const imageUrl = data?.imageUrl || data?.image || data?.harmonizedSubjectImage || data?.compositeImageUrl || data?.result?.imageUrl;
    if (imageUrl && typeof imageUrl === 'string') {
      return {
        success: true,
        imageUrl,
        source: data?.source || 'gemini-cloud-function',
        model: 'gemini-vision-harmonize',
      };
    }
  } catch (cloudErr: any) {
    console.warn('[harmonizeWithImagen3] invokeGeminiCloudFunction notice:', cloudErr?.message || cloudErr);
  }

  return {
    success: true,
    imageUrl: base64Data,
    source: 'fallback-composite-canvas',
  };
}

