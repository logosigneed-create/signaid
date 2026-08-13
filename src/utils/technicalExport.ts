import { CartItem, ProductDatabase } from '../types';
import { getProxiedUrl } from './helpers';

export const downloadTechnicalPackage = async (
    item: CartItem, 
    productDatabase: ProductDatabase,
    options: { front: boolean, back: boolean, size: string, elements?: string[] }
) => {
    const productType = item.productType;
    const product = productDatabase[productType];
    const useManual = !!(options.elements && options.elements.length > 0);
    const shouldInclude = (id: string, face: 'front' | 'back') => {
        if (useManual) return options.elements?.includes(id);
        return face === 'front' ? options.front : options.back;
    };
    
    // Calculate Scale base using the SELECTED size
    const defaultHeight = 71;
    const realHeightCm = product ? parseFloat(product.sizeChart?.[options.size] || product.sizeChart?.['L'] || '71') : defaultHeight;
    
    // Dynamic width ratio based on size for better accuracy
    const sizeRatios: Record<string, number> = {
        'XS': 0.7, 'S': 0.72, 'M': 0.75, 'L': 0.78, 'XL': 0.8, 'XXL': 0.82, '3XL': 0.84, '4XL': 0.86
    };
    const ratio = sizeRatios[options.size] || 0.75;
    const realWidthCm = realHeightCm * ratio;
    
    const DPI = 300;
    const CM_TO_PX = (DPI / 2.54);

    const safeDownload = (blob: Blob, filename: string) => {
        try {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            link.style.display = 'none';
            document.body.appendChild(link);
            
            const clickEvent = new MouseEvent('click', {
                view: window, bubbles: true, cancelable: true
            });
            link.dispatchEvent(clickEvent);
            
            console.log(`[TechnicalExport] Triggering download: ${filename}`);
            
            setTimeout(() => {
                if (document.body.contains(link)) document.body.removeChild(link);
                setTimeout(() => URL.revokeObjectURL(url), 60000);
            }, 1000);
        } catch (e) {
            console.error("Manual download trigger failed:", e);
        }
    };

    const downloadElement = async (url: string, widthPercent: number, partName: string, elemName: string) => {
        try {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.src = getProxiedUrl(url);
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = () => reject(new Error(`Impossible de charger l'image ${url}`));
            });

            const targetWidthCm = (widthPercent / 100) * realWidthCm;
            const targetWidthPx = Math.round(targetWidthCm * CM_TO_PX);
            const targetHeightPx = Math.round((img.height * targetWidthPx) / img.width);

            const canvas = document.createElement('canvas');
            canvas.width = targetWidthPx;
            canvas.height = targetHeightPx;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(img, 0, 0, targetWidthPx, targetHeightPx);
                return new Promise<void>((resolve) => {
                    canvas.toBlob((blob) => {
                        if (blob) safeDownload(blob, `${elemName}_${partName}_${targetWidthCm.toFixed(1)}cm.png`);
                        resolve();
                    }, 'image/png');
                });
            }
        } catch (e: any) {
            console.error("[TechnicalExport] Error downloading element:", e);
        }
    };

    const FONT_MAP: Record<string, string> = {
        'College': "Graduate",
        'College Block': "Graduate",
        'Bebas': "Bebas Neue"
    };

    const getFontFamily = (family: string) => {
        const mapped = FONT_MAP[family] || family;
        // Quoting only multi-word families without quotes already
        if (mapped.includes(' ') && !mapped.includes("'") && !mapped.includes('"')) {
            return `'${mapped}'`;
        }
        return mapped;
    };

    const downloadTextPNG = async (textCfg: any, partName: string, elemName: string) => {
        if (!textCfg || !textCfg.text) return;
        try {
            const fontFamily = getFontFamily(textCfg.fontFamily || 'Inter');
            await document.fonts.ready;
            
            // FORCED FONT LOAD FOR EXPORT
            const fontCheckString = `${textCfg.fontWeight || '700'} 120px ${fontFamily}`;
            await document.fonts.load(fontCheckString);
            
            const baseFontSize = textCfg.fontSize || 24;
            const targetFontSize = 120 * (DPI / 72); 
            const scaleRatio = targetFontSize / baseFontSize;
            
            const fontSize = targetFontSize;
            const spacing = (textCfg.letterSpacing || 0) * scaleRatio;
            const scX = textCfg.scaleX || 1;
            const scY = textCfg.scaleY || 1;

            const curve = textCfg.curve || 0;
            const isCurved = curve !== 0 && textCfg.curveStyle !== 'flat';

            // PRE-MEASURE
            const mCanvas = document.createElement('canvas');
            const mCtx = mCanvas.getContext('2d');
            if (!mCtx) return;
            mCtx.font = `${textCfg.fontWeight || '700'} ${fontSize}px ${fontFamily}`;
            if (mCtx && 'letterSpacing' in mCtx) (mCtx as any).letterSpacing = '0px';

            const chars = textCfg.text.split('');
            const charWidths = chars.map((c: string) => mCtx.measureText(c).width);
            const totalWidthAtBaseScale = charWidths.reduce((a, b) => a + b, 0) + (spacing * (chars.length - 1));
            const scaledTotalWidth = totalWidthAtBaseScale * Math.abs(scX);
            
            const canvasWidth = scaledTotalWidth + 400;
            const canvasHeight = fontSize * 3 + Math.abs(curve * 4);

            const canvas = document.createElement('canvas');
            canvas.width = canvasWidth;
            canvas.height = canvasHeight;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            ctx.font = `${textCfg.fontWeight || '700'} ${fontSize}px ${fontFamily}`;
            ctx.fillStyle = textCfg.noFill ? 'transparent' : (textCfg.color || '#000000');
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            const drawX = canvasWidth / 2;
            const drawY = canvasHeight / 2;

            if (isCurved) {
                const P0 = { x: drawX - scaledTotalWidth/2, y: drawY };
                const P1 = { x: drawX, y: drawY + (curve * 3) };
                const P2 = { x: drawX + scaledTotalWidth/2, y: drawY };
                
                const getQuadraticBezierPoint = (time: number, p0: any, p1: any, p2: any) => {
                    const x = (1 - time) * (1 - time) * p0.x + 2 * (1 - time) * time * p1.x + time * time * p2.x;
                    const y = (1 - time) * (1 - time) * p0.y + 2 * (1 - time) * time * p1.y + time * time * p2.y;
                    return { x, y };
                };

                let currentWidthSum = 0;
                chars.forEach((char: string, i: number) => {
                    const w = charWidths[i] * Math.abs(scX);
                    const charCenter = currentWidthSum + w/2;
                    const time = charCenter / (scaledTotalWidth || 1);
                    const point = getQuadraticBezierPoint(time, P0, P1, P2);
                    const dc_x = 2 * ((1 - time) * (P1.x - P0.x) + time * (P2.x - P1.x));
                    const dc_y = 2 * ((1 - time) * (P1.y - P0.y) + time * (P2.y - P1.y));
                    const angle = Math.atan2(dc_y, dc_x);

                    ctx.save();
                    ctx.translate(point.x, point.y);
                    ctx.rotate(angle);
                    ctx.scale(scX, scY);
                    if (textCfg.outline) {
                        ctx.strokeStyle = textCfg.outlineColor || 'black';
                        ctx.lineWidth = (textCfg.outlineWidth || 1) * 2 * (fontSize / 24);
                        ctx.strokeText(char, 0, 0);
                    }
                    if (!textCfg.noFill) ctx.fillText(char, 0, 0);
                    ctx.restore();
                    currentWidthSum += w + (spacing * Math.abs(scX));
                });
            } else {
                let currentWidthSum = 0;
                chars.forEach((char: string, i: number) => {
                    const w = charWidths[i] * Math.abs(scX);
                    const sp = spacing * Math.abs(scX);

                    ctx.save();
                    const xPos = (drawX - scaledTotalWidth / 2) + currentWidthSum + w / 2;
                    ctx.translate(xPos, drawY);
                    ctx.scale(scX, scY);
                    
                    if (textCfg.outline) {
                        ctx.strokeStyle = textCfg.outlineColor || 'black';
                        ctx.lineWidth = (textCfg.outlineWidth || 1) * 2 * (fontSize / 24);
                        ctx.strokeText(char, 0, 0);
                    }
                    if (!textCfg.noFill) ctx.fillText(char, 0, 0);
                    ctx.restore();
                    
                    currentWidthSum += w + sp;
                });
            }

            return new Promise<void>((resolve) => {
                canvas.toBlob((blob) => {
                    if (blob) safeDownload(blob, `${elemName}_${partName}_TEXT.png`);
                    resolve();
                }, 'image/png');
            });
        } catch (e) {
            console.log("[TechnicalExport] PNG Text error:", e);
        }
    };


    const generateCompositedFace = async (face: 'RECTO' | 'VERSO') => {
        try {
            await document.fonts.ready;
            const width = Math.round(realWidthCm * CM_TO_PX);
            // ASPECT RATIO SYNC: The editor canvas is fixed at 373x497. 
            // We must use this ratio to ensure vertical positioning parity.
            const height = Math.round(width * (497 / 373));
            
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            const isRecto = face === 'RECTO';
            const faceLogos = isRecto ? [
                { url: item.processedLogoUrlFront_original || item.originalLogoUrlFront, size: item.logoSizeFront, x: item.logoPositionXFront, y: item.logoPositionYFront },
                { url: item.logoFront2?.processedUrl_original || item.logoFront2?.originalUrl, size: item.logoFront2?.size, x: item.logoFront2?.position?.x, y: item.logoFront2?.position?.y },
                { url: item.logoFront3?.processedUrl_original || item.originalLogoUrlFront, size: item.logoFront3?.size, x: item.logoFront3?.position?.x, y: item.logoFront3?.position?.y },
            ] : [
                { url: item.processedLogoUrlBack_original || item.originalLogoUrlBack, size: item.logoSizeBack, x: item.logoPositionXBack, y: item.logoPositionYBack },
                { url: item.logoBack2?.processedUrl_original || item.originalLogoUrlBack, size: item.logoBack2?.size, x: item.logoBack2?.position?.x, y: item.logoBack2?.position?.y },
                { url: item.logoBack3?.processedUrl_original || item.originalLogoUrlBack, size: item.logoBack3?.size, x: item.logoBack3?.position?.x, y: item.logoBack3?.position?.y },
            ];

            for (const log of faceLogos) {
                if (log.url && log.size && log.x != null && log.y != null) {
                    try {
                        const img = new Image();
                        img.crossOrigin = "anonymous";
                        img.src = getProxiedUrl(log.url);
                        await new Promise((res) => { img.onload = res; img.onerror = () => res(null); });
                        if (img.complete && img.naturalWidth) {
                            const w = (log.size / 100) * width;
                            const h = (img.height * w) / img.width;
                            const dx = (log.x / 100) * width - w/2;
                            const dy = (log.y / 100) * height - h/2;
                            ctx.drawImage(img, dx, dy, w, h);
                        }
                    } catch(e) {}
                }
            }

            const faceTexts = isRecto ? [item.textFront, item.textFront2] : [item.textBack, item.textBack2];
            for (const t of faceTexts) {
                if (t?.text && t.position) {
                    const fontFamily = getFontFamily(t.fontFamily || 'Inter');
                    
                    // FORCE LOAD FONT FOR COMPOSITE
                    const fontCheck = `${t.fontWeight || '700'} 24px ${fontFamily}`;
                    await document.fonts.load(fontCheck);

                    const scRatio = width / 400;
                    const fontSize = (t.fontSize || 24) * scRatio;
                    const letterSpacing = (t.letterSpacing || 0) * scRatio;
                    
                    const scX = Math.abs(t.scaleX || 1);
                    const drawX = (t.position.x / 100) * width;
                    const drawY = (t.position.y / 100) * height;

                    const curve = t.curve || 0;
                    const isCurved = curve !== 0 && t.curveStyle !== 'flat';

                    ctx.save();
                    ctx.font = `${t.fontWeight || '700'} ${fontSize}px ${fontFamily}, sans-serif`;
                    // Ensure NO native spacing here to avoid duplication
                    if ('letterSpacing' in ctx) (ctx as any).letterSpacing = '0px';
                    
                    const chars = t.text.split('');
                    const charWidths = chars.map((c: string) => ctx.measureText(c).width);
                    const baseTotalWidth = charWidths.reduce((a, b) => a + b, 0) + (letterSpacing * (chars.length - 1));
                    const scaledTotalWidth = baseTotalWidth * scX;

                    ctx.fillStyle = t.color || '#000000';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';

                    if (isCurved) {
                        const chars = t.text.split('');
                        const charWidths = chars.map((c: string) => ctx.measureText(c).width);
                        
                        const P0 = { x: drawX - scaledTotalWidth/2, y: drawY };
                        const P1 = { x: drawX, y: drawY + (curve * 3) * scRatio };
                        const P2 = { x: drawX + scaledTotalWidth/2, y: drawY };
                        
                        const getQuadraticBezierPoint = (time: number, p0: any, p1: any, p2: any) => {
                            const x = (1 - time) * (1 - time) * p0.x + 2 * (1 - time) * time * p1.x + time * time * p2.x;
                            const y = (1 - time) * (1 - time) * p0.y + 2 * (1 - time) * time * p1.y + time * time * p2.y;
                            return { x, y };
                        };

                        let currentWidthSum = 0;
                        chars.forEach((char: string, i: number) => {
                            const w = charWidths[i] * scX;
                            const charCenter = currentWidthSum + w/2;
                            const time = charCenter / (scaledTotalWidth || 1);
                            
                            const point = getQuadraticBezierPoint(time, P0, P1, P2);
                            const dx_c = 2 * ((1 - time) * (P1.x - P0.x) + time * (P2.x - P1.x));
                            const dy_c = 2 * ((1 - time) * (P1.y - P0.y) + time * (P2.y - P1.y));
                            const angle = Math.atan2(dy_c, dx_c);

                            ctx.save();
                            ctx.translate(point.x, point.y);
                            ctx.rotate(angle);
                            ctx.scale(t.scaleX || 1, t.scaleY || 1);
                            
                            if (t.outline) {
                                ctx.strokeStyle = t.outlineColor || 'black';
                                ctx.lineWidth = (t.outlineWidth || 1) * 2 * (fontSize/24);
                                ctx.strokeText(char, 0, 0);
                            }
                            if (!t.noFill) ctx.fillText(char, 0, 0);
                            ctx.restore();
                            
                            currentWidthSum += (w + (letterSpacing * scX));
                        });
                        } else {
                        // STRAIGHT TEXT IN COMPOSITE via Native Loop
                        let currentWidthSum = 0;
                        const chars = t.text.split('');
                        const charWidths = chars.map((c: string) => ctx.measureText(c).width);

                        chars.forEach((char: string, i: number) => {
                            const w = charWidths[i] * scX;
                            const sp = letterSpacing * Math.abs(scX);

                            ctx.save();
                            const xPos = (drawX - scaledTotalWidth / 2) + currentWidthSum + w / 2;
                            ctx.translate(xPos, drawY);
                            ctx.scale(scX, t.scaleY || 1);
                            
                            if (t.outline) {
                                ctx.strokeStyle = t.outlineColor || 'black';
                                ctx.lineWidth = (t.outlineWidth || 1) * 2 * (fontSize/24);
                                ctx.strokeText(char, 0, 0);
                            }
                            if (!t.noFill) ctx.fillText(char, 0, 0);
                            ctx.restore();

                            currentWidthSum += w + sp;
                        });
                    }
                    ctx.restore();
                }
            }

            return new Promise<void>((resolve) => {
                canvas.toBlob((blob) => {
                    if (blob) safeDownload(blob, `COMBINE_${face}_${options.size}.png`);
                    resolve();
                }, 'image/png');
            });
        } catch (e) {
            console.error("[TechnicalExport] Composite error:", e);
        }
    };

    const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    try {
        if (product) {
            const colorKey = item.color || '#000000';
            const frontUrl = product.images?.[colorKey] || Object.values(product.images || {})[0];
            const backUrl = product.backImages?.[colorKey] || Object.values(product.backImages || {})[0];
            if (options.front && frontUrl) { await downloadElement(frontUrl as string, 100, "VETEMENT_NU", "Recto"); await wait(1000); }
            if (options.back && backUrl) { await downloadElement(backUrl as string, 100, "VETEMENT_NU", "Verso"); await wait(1000); }
        }
        if (options.front) { await generateCompositedFace('RECTO'); await wait(500); }
        if (options.back) { await generateCompositedFace('VERSO'); await wait(500); }

        if (useManual) {
            if (shouldInclude('LOGO_F1', 'front')) {
                const url = item.processedLogoUrlFront_original || item.originalLogoUrlFront;
                if (url && item.logoSizeFront) await downloadElement(url, item.logoSizeFront, "RECTO", "Logo1");
                await wait(500);
            }
            if (shouldInclude('LOGO_F2', 'front')) {
                if (item.logoFront2?.originalUrl) await downloadElement(item.logoFront2.processedUrl_original || item.logoFront2.originalUrl, item.logoFront2.size || 100, "RECTO", "Logo2");
                await wait(500);
            }
            if (shouldInclude('LOGO_F3', 'front')) {
                if (item.logoFront3?.originalUrl) await downloadElement(item.logoFront3.processedUrl_original || item.logoFront3.originalUrl, item.logoFront3.size || 100, "RECTO", "Logo3");
                await wait(500);
            }
            if (shouldInclude('LOGO_B1', 'back')) {
                const url = item.processedLogoUrlBack_original || item.originalLogoUrlBack;
                if (url && item.logoSizeBack) await downloadElement(url, item.logoSizeBack, "VERSO", "Logo1");
                await wait(500);
            }
            if (shouldInclude('LOGO_B2', 'back')) {
                if (item.logoBack2?.originalUrl) await downloadElement(item.logoBack2.processedUrl_original || item.logoBack2.originalUrl, item.logoBack2.size || 100, "VERSO", "Logo2");
                await wait(500);
            }
            if (shouldInclude('LOGO_B3', 'back')) {
                if (item.logoBack3?.originalUrl) await downloadElement(item.logoBack3.processedUrl_original || item.logoBack3.originalUrl, item.logoBack3.size || 100, "VERSO", "Logo3");
                await wait(500);
            }
            if (shouldInclude('TEXT_F1', 'front')) {
                if (item.textFront) await downloadTextPNG(item.textFront, "RECTO", "Texte1");
                await wait(500);
            }
            if (shouldInclude('TEXT_F2', 'front')) {
                if (item.textFront2) await downloadTextPNG(item.textFront2, "RECTO", "Texte2");
                await wait(500);
            }
            if (shouldInclude('TEXT_B1', 'back')) {
                if (item.textBack) await downloadTextPNG(item.textBack, "VERSO", "Texte1");
                await wait(500);
            }
            if (shouldInclude('TEXT_B2', 'back')) {
                if (item.textBack2) await downloadTextPNG(item.textBack2, "VERSO", "Texte2");
                await wait(500);
            }
        }
    } catch (e) {
        console.error("[TechnicalExport] Global error:", e);
    }

    alert("Pack technique généré avec succès. (v1.2)");
};
