import QRCode from 'qrcode';
import { getStoredConfig } from '../lib/store';
import { LogoColorMode, UserData } from '../types/audit';

// Canvas memoization cache for rendering performance
const memoCanvasCache = new Map<string, string>();

export const clearImageMemoCache = () => {
    memoCanvasCache.clear();
};

export const DEFAULT_PLACEMENTS = {
    tshirt: {
        front: { x: 0.64, y: 0.30, scale: 0.20 },
        back: { x: 0.50, y: 0.38, scale: 0.35 }
    },
    tshirt_basic: {
        front: { x: 0.64, y: 0.30, scale: 0.20 },
        back: { x: 0.50, y: 0.38, scale: 0.35 }
    },
    polo: {
        front: { x: 0.64, y: 0.32, scale: 0.18 },
        back: { x: 0.50, y: 0.38, scale: 0.35 }
    },
    tshirt_bicolore: {
        front: { x: 0.64, y: 0.32, scale: 0.20 },
        back: { x: 0.50, y: 0.32, scale: 0.35 }
    },
    sweat: {
        front: { x: 0.64, y: 0.34, scale: 0.20 },
        back: { x: 0.50, y: 0.46, scale: 0.35 }
    },
    veste: {
        front: { x: 0.50, y: 0.45, scale: 0.15 },
        back: { x: 0.50, y: 0.40, scale: 0.35 }
    },
    tank_top: {
        front: { x: 0.50, y: 0.42, scale: 0.28 },
        back: { x: 0.50, y: 0.38, scale: 0.35 }
    },
    tshirt_oversize: {
        front: { x: 0.50, y: 0.40, scale: 0.28 },
        back: { x: 0.50, y: 0.38, scale: 0.35 }
    }
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

export const processLogoDeterministic = (base64: string, shouldInvert: boolean | 'white' | 'black' = true, removeBackground: boolean = true): Promise<string> => {
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
                    const contentWidth = maxX - minX + 1;
                    const contentHeight = maxY - minY + 1;
                    const croppedData = tempCtx.getImageData(minX, minY, contentWidth, contentHeight);

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
                        if (alpha < 130) d[i + 3] = 0; // Kill semi-transparent noise
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

export const generateMechanicalMockup = async (garmentUrl: string, logoUrl: string, view: 'front' | 'back', customScale?: number, garmentType?: string, colorMode?: LogoColorMode, userDataParam?: Partial<UserData>, assetColorParam?: string, isLightModeParam?: boolean) => {
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

            // 3. Positionnement définitif du logo graphique pur
            const logoW = canvas.width * scale;
            const logoH = logoW * (imgLogo.height / imgLogo.width);

            ctx.globalAlpha = 1.0;
            ctx.drawImage(
                imgLogo,
                (canvas.width * pos.x) - (logoW / 2),
                (canvas.height * pos.y) - (logoH / 2),
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
                const resultUrl = canvas.toDataURL('image/jpeg', 0.85);
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

