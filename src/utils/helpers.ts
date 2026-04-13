// import { Area } from 'react-easy-crop/types';
export interface Area { x: number; y: number; width: number; height: number; }
import { getFunctions, httpsCallable, httpsCallableFromURL } from 'firebase/functions';
import app from '../firebaseConfig';

// --- HELPER ---
export function getProxiedUrl(url: string | null | undefined, options: { width?: number, height?: number, fit?: 'contain' | 'cover', quality?: number } = {}) {
    if (!url || url === 'null' || url === 'undefined' || url.startsWith('data:')) return url || '';

    // Auto-proxy local assets via production domain
    // BYPASS PROXY ON LOCALHOST to ensure we see local changes
    if (url.startsWith('/')) {
        // @ts-ignore
        if (import.meta.env.DEV) {
            return url;
        }

        if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
            return url;
        }

        const prodUrl = `https://signaid-d2d08.web.app${url}`;
        const { width, quality } = options;
        let params = `output=webp&q=${quality || 60}&l=5`;
        if (width) params += `&w=${width}`;
        return `https://images.weserv.nl/?url=${encodeURIComponent(prodUrl)}&${params}`;
    }

    let cleanUrl = url;
    if (url.startsWith('https://')) {
        cleanUrl = 'ssl:' + url.substring(8);
    } else if (url.startsWith('http://')) {
        cleanUrl = url.substring(7);
    }

    const { width, height, fit, quality } = options;
    let params = `output=webp&q=${quality || 60}`;
    if (width) params += `&w=${width}`;
    else params += `&w=800`; // Default if not specified

    if (height) params += `&h=${height}`;
    if (fit) params += `&fit=${fit}`;

    return `https://images.weserv.nl/?url=${encodeURIComponent(cleanUrl)}&${params}`;
}

export function resizeImage(base64Str: string, maxWidth = 800, quality = 0.7, aspectRatio?: number): Promise<string> {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = base64Str;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            if (aspectRatio) {
                // Calculate target dimensions to match aspect ratio while at least fitting the original image
                let targetWidth = width;
                let targetHeight = height;

                if (width / height > aspectRatio) {
                    // Too wide: add height
                    targetHeight = width / aspectRatio;
                } else {
                    // Too thin: add width
                    targetWidth = height * aspectRatio;
                }

                canvas.width = targetWidth;
                canvas.height = targetHeight;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    // Fill with white background
                    ctx.fillStyle = "#ffffff";
                    ctx.fillRect(0, 0, targetWidth, targetHeight);
                    // Center the image
                    ctx.drawImage(img, (targetWidth - width) / 2, (targetHeight - height) / 2, width, height);
                }

                // If the padded canvas is larger than maxWidth, downscale it proportionally
                if (targetWidth > maxWidth) {
                    const finalHeight = maxWidth / aspectRatio;
                    const finalCanvas = document.createElement('canvas');
                    finalCanvas.width = maxWidth;
                    finalCanvas.height = finalHeight;
                    const fctx = finalCanvas.getContext('2d');
                    fctx?.drawImage(canvas, 0, 0, maxWidth, finalHeight);
                    resolve(finalCanvas.toDataURL('image/jpeg', quality));
                    return;
                }
                resolve(canvas.toDataURL('image/jpeg', quality));
                return;
            }

            if (width > maxWidth) {
                height *= maxWidth / width;
                width = maxWidth;
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => resolve(base64Str);
    });
}

// Helper to Compress Cart Images for Storage (Async)
export async function compressCartForStorage(cartItems: any[]): Promise<any[]> {
    return Promise.all(cartItems.map(async (item) => {
        const newItem = { ...item };
        // Compress AI Image
        if (newItem.aiImageUrl && newItem.aiImageUrl.startsWith('data:')) {
            newItem.aiImageUrl = await resizeImage(newItem.aiImageUrl, 150, 0.6);
        }
        // Compress Previews
        if (newItem.previewImageUrlFront && newItem.previewImageUrlFront.startsWith('data:')) {
            newItem.previewImageUrlFront = await resizeImage(newItem.previewImageUrlFront, 150, 0.6);
        }
        if (newItem.previewImageUrlBack && newItem.previewImageUrlBack.startsWith('data:')) {
            newItem.previewImageUrlBack = await resizeImage(newItem.previewImageUrlBack, 150, 0.6);
        }
        // Remove uploaded images to save space (they should be re-uploaded or just kept in session if possible, but for localStorage persistence we might lose them if we strip. Better to resize them too if they are base64)
        if (newItem.uploadedImage && newItem.uploadedImage.startsWith('data:')) {
            newItem.uploadedImage = await resizeImage(newItem.uploadedImage, 150, 0.6);
        }

        return newItem;
    }));
}

export function dataURLtoBlob(dataurl: string): Blob | null {
    if (!dataurl || typeof dataurl !== 'string' || !dataurl.includes(',')) return null;
    const arr = dataurl.split(',');
    const match = arr[0].match(/:(.*?);/);
    if (!match) return null;
    const mime = match[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
}

// Helper to separate RGB from Hex
export function hexToRgb(hex: string) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

// Tint Image Helper
export function tintImage(base64Icon: string, color: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.src = base64Icon;
        img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext("2d");
            if (!ctx) return reject("Canvas context error");

            // Use a temporary canvas to generate the color mask
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = canvas.width;
            tempCanvas.height = canvas.height;
            const tctx = tempCanvas.getContext('2d');
            if (!tctx) return reject("Temp canvas context error");

            // Fill with target color
            tctx.fillStyle = color;
            tctx.fillRect(0, 0, canvas.width, canvas.height);

            // Destination-in: keeps source color only where the image has pixels
            tctx.globalCompositeOperation = 'destination-in';
            tctx.drawImage(img, 0, 0);

            // Draw result to main canvas
            ctx.drawImage(tempCanvas, 0, 0);

            resolve(canvas.toDataURL("image/png"));
        };
        img.onerror = reject;
    });
}

export function removeSpecificColor(imageUrl: string, targetColorHex: string, tolerance: number = 30): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.src = imageUrl;
        img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext("2d");
            if (!ctx) return reject("Canvas context error");

            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

            const targetRgb = hexToRgb(targetColorHex);
            if (!targetRgb) return reject("Invalid target color");

            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];

                const distance = Math.sqrt(
                    Math.pow(r - targetRgb.r, 2) +
                    Math.pow(g - targetRgb.g, 2) +
                    Math.pow(b - targetRgb.b, 2)
                );

                if (distance <= tolerance) {
                    data[i + 3] = 0; // Set alpha to 0
                }
            }

            ctx.putImageData(imageData, 0, 0);
            resolve(canvas.toDataURL("image/png"));
        };
        img.onerror = reject;
    });
}

// Enhanced Background Removal (White or Black)
// Remove.bg API integration
export async function removeBackground(inputStr: string, mode: 'white' | 'black' = 'white'): Promise<string> {
    try {
        let base64String = inputStr;

        if (inputStr.startsWith('http') || inputStr.startsWith('/')) {
            // First fetch the URL and convert to base64
            const response = await fetch(inputStr);
            const blob = await response.blob();
            base64String = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        }

        if (!base64String) return inputStr;

        const functions = getFunctions(app);
        const removeBgProxy = httpsCallableFromURL(functions, 'https://removebgproxy-l7t746ydma-uc.a.run.app');

        const result = await removeBgProxy({
            imageBase64: base64String
        });

        const data = result.data as any;
        if (data && data.imageBase64) {
            return data.imageBase64;
        } else {
            throw new Error("Invalid response format from remove.bg proxy.");
        }

    } catch (error: any) {
        console.error("Remove.bg Proxy Exception:", error);
        return inputStr; // Fallback to original image on error
    }
}

// Image Cropping Helper
export function getCroppedImg(imageSrc: string, pixelCrop: Area): Promise<string> {
    const createImage = (url: string) =>
        new Promise<HTMLImageElement>((resolve, reject) => {
            const image = new Image();
            image.addEventListener('load', () => resolve(image));
            image.addEventListener('error', (error) => reject(error));
            image.setAttribute('crossOrigin', 'anonymous');
            image.src = url;
        });

    return new Promise(async (resolve, reject) => {
        try {
            const image = await createImage(imageSrc);
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            if (!ctx) {
                return reject(new Error('No 2d context'));
            }

            canvas.width = pixelCrop.width;
            canvas.height = pixelCrop.height;

            ctx.drawImage(
                image,
                pixelCrop.x,
                pixelCrop.y,
                pixelCrop.width,
                pixelCrop.height,
                0,
                0,
                pixelCrop.width,
                pixelCrop.height
            );

            resolve(canvas.toDataURL('image/png'));
        } catch (e) {
            reject(e);
        }
    });
}

/**
 * Automatically crops an image by finding its non-empty bounding box.
 * Handles both transparency and background colors (white/black).
 * Returns both the dataUrl and the crop ratios for scaling compensation.
 */
export async function trimImage(imageSrc: string, tolerance: number = 20): Promise<{ 
    dataUrl: string, 
    blobUrl: string,
    widthRatio: number, 
    heightRatio: number,
    cropTop: number,
    cropLeft: number,
    originalWidth: number,
    originalHeight: number
}> {
    const createImage = (url: string) =>
        new Promise<HTMLImageElement>((resolve, reject) => {
            const image = new Image();
            image.addEventListener('load', () => resolve(image));
            image.addEventListener('error', (error) => reject(error));
            image.setAttribute('crossOrigin', 'anonymous');
            image.src = url;
        });

    try {
        const image = await createImage(imageSrc);
        const originalWidth = image.width;
        const originalHeight = image.height;
        const canvas = document.createElement('canvas');
        canvas.width = originalWidth;
        canvas.height = originalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return { 
            dataUrl: imageSrc, 
            blobUrl: imageSrc, 
            widthRatio: 1, 
            heightRatio: 1, 
            cropTop: 0, 
            cropLeft: 0, 
            originalWidth, 
            originalHeight 
        };
        ctx.drawImage(image, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;
        let found = false;

        // Check if the image has transparency
        let hasAlpha = false;
        for (let i = 3; i < data.length; i += 4) {
            if (data[i] < 255) {
                hasAlpha = true;
                break;
            }
        }

        for (let y = 0; y < canvas.height; y++) {
            for (let x = 0; x < canvas.width; x++) {
                const i = (y * canvas.width + x) * 4;
                const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];

                let isContent = false;
                if (hasAlpha) {
                    isContent = a > tolerance;
                } else {
                    const bgR = data[0], bgG = data[1], bgB = data[2];
                    const dist = Math.sqrt(Math.pow(r - bgR, 2) + Math.pow(g - bgG, 2) + Math.pow(b - bgB, 2));
                    isContent = dist > tolerance;
                }

                if (isContent) {
                    if (x < minX) minX = x;
                    if (y < minY) minY = y;
                    if (x > maxX) maxX = x;
                    if (y > maxY) maxY = y;
                    found = true;
                }
            }
        }

        if (!found) {
            return { 
                dataUrl: imageSrc, 
                blobUrl: imageSrc, 
                widthRatio: 1, 
                heightRatio: 1, 
                cropTop: 0, 
                cropLeft: 0, 
                originalWidth, 
                originalHeight 
            };
        }

        const width = maxX - minX + 1;
        const height = maxY - minY + 1;

        // Add 2px padding for safety
        const pad = 2;
        const finalMinX = Math.max(0, minX - pad);
        const finalMinY = Math.max(0, minY - pad);
        const finalWidth = Math.min(canvas.width - finalMinX, width + pad * 2);
        const finalHeight = Math.min(canvas.height - finalMinY, height + pad * 2);

        const cropCanvas = document.createElement('canvas');
        cropCanvas.width = finalWidth;
        cropCanvas.height = finalHeight;
        const cropCtx = cropCanvas.getContext('2d');
        
        if (!cropCtx) {
            return { 
                dataUrl: imageSrc, 
                blobUrl: imageSrc,
                widthRatio: 1, 
                heightRatio: 1, 
                cropTop: 0, 
                cropLeft: 0, 
                originalWidth, 
                originalHeight 
            };
        }

        cropCtx.drawImage(canvas, finalMinX, finalMinY, finalWidth, finalHeight, 0, 0, finalWidth, finalHeight);
        
        const dataUrl = cropCanvas.toDataURL('image/png');
        
        // --- PERFORMANCE OPTIMIZATION: BLOB URL ---
        // Creating a Blob URL avoids bloating the DOM with massive Base64 strings (LCP fix)
        let blobUrl = dataUrl;
        try {
            const blob = dataURLtoBlob(dataUrl);
            if (blob) {
                blobUrl = URL.createObjectURL(blob);
            }
        } catch (e) {
            console.warn("Failed to create Blob URL for trimmed image:", e);
        }

        return {
            dataUrl,
            blobUrl,
            widthRatio: finalWidth / originalWidth,
            heightRatio: finalHeight / originalHeight,
            cropTop: finalMinY,
            cropLeft: finalMinX,
            originalWidth,
            originalHeight
        };
    } catch (e) {
        console.error("Auto-crop failed:", e);
        return { 
            dataUrl: imageSrc, 
            blobUrl: imageSrc,
            widthRatio: 1, 
            heightRatio: 1, 
            cropTop: 0, 
            cropLeft: 0, 
            originalWidth: 2000, 
            originalHeight: 2000 
        };
    }
}

export async function urlToBase64(url: string): Promise<string> {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const blob = await response.blob();
        if (!blob.type.startsWith('image/')) {
            console.warn(`urlToBase64: Expected image, got ${blob.type} - URL: ${url}`);
            return "";
        }

        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const res = reader.result as string;
                resolve(res);
            };
            reader.onerror = () => resolve("");
            reader.readAsDataURL(blob);
        });
    } catch (e) {
        console.error("urlToBase64 failure:", e);
        return "";
    }
}

export async function addWatermark(imageUrl: string): Promise<string> {
    // WATERMARK DISABLED BY USER REQUEST
    return Promise.resolve(imageUrl);

    /* 
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) { resolve(imageUrl); return; }

            // Draw original image
            ctx.drawImage(img, 0, 0);

            // Draw Logo Watermark
            const logo = new Image();
            logo.crossOrigin = "anonymous";
            // Use local asset for reliability
            logo.src = '/assets/logo.PNG';

            logo.onload = () => {
                // Resize logo to be reasonable (e.g., 20% of canvas width)
                const logoWidth = canvas.width * 0.25;
                const logoHeight = (logo.height / logo.width) * logoWidth;
                const x = 20; // Top Left padding
                const y = 20; // Top Left padding

                ctx.globalAlpha = 0.9;
                ctx.drawImage(logo, x, y, logoWidth, logoHeight);
                try {
                    resolve(canvas.toDataURL('image/jpeg', 0.9));
                } catch (e) {
                    console.error("Watermark export failed", e);
                    resolve(imageUrl);
                }
            };

            logo.onerror = () => {
                // Fallback text if image fails
                const x = canvas.width / 2;
                const y = 60;
                ctx.globalAlpha = 0.5;
                ctx.font = `bold ${canvas.width * 0.1}px Inter, sans-serif`;
                ctx.textAlign = 'center';
                ctx.fillStyle = '#ffffff';
                ctx.shadowColor = 'rgba(0,0,0,0.5)';
                ctx.shadowBlur = 10;
                ctx.fillText("SIGNAID", x, y);
                try {
                    resolve(canvas.toDataURL('image/jpeg', 0.9));
                } catch (e) {
                    resolve(imageUrl);
                }
            }
        };
        img.onerror = () => resolve(imageUrl);
        img.src = imageUrl;
    });
    */
};

export function cleanCartItem(obj: any, key?: string): any {
    if (obj === undefined || obj === null) return obj;

    // Recursively clean objects and arrays
    if (Array.isArray(obj)) {
        return obj.map(item => cleanCartItem(item));
    }

    if (typeof obj === 'object') {
        const newObj: any = {};
        for (const k in obj) {
            // Pass the key down to the recursive call
            newObj[k] = cleanCartItem(obj[k], k);
        }
        return newObj;
    }

    // Clean string values (base64)
    if (typeof obj === 'string') {
        // 1. Aggressively clean PREVIEW images (generated mockups) - we can regenerate these
        if (key && (key.includes('preview') || key.includes('screenshot'))) {
            if (obj.startsWith('data:image') && obj.length > 5000) {
                return '';
            }
        }

        // 2. Preserve USER ASSETS (Logos, Uploads) as much as possible
        // Aggressively clean if too large (> 800KB) to prevent crashing the browser/session
        if (key && (key.includes('originalLogo') || key.includes('originalUrl') || key.includes('processedLogo') || key.includes('processedUrl') || key.includes('customImage') || key.includes('aiResult') || key.includes('capturedImage'))) {
            if (obj.startsWith('data:image') && obj.length > 800000) {
                console.warn(`[Storage] Cleaning large asset: ${key} (${Math.round(obj.length / 1024)}KB)`);
                return ''; // Remove from storage to save quota
            }
            return obj;
        }

        // 3. General catch-all for other large strings
        if (obj.startsWith('data:image') && obj.length > 200000) { 
            return '';
        }

        return obj;
    }


    return obj;
}

export function isSameModel(item1: any, item2: any): boolean {
    if (!item1 || !item2) return false;
    if (item1.productType !== item2.productType) return false;
    if (item1.color !== item2.color) return false;

    // Logos
    const logoFields = [
        'originalLogoUrlFront', 'originalLogoUrlBack',
        'predefinedLogoUrlFront', 'predefinedLogoUrlBack',
        'logoPositionXFront', 'logoPositionYFront',
        'logoPositionXBack', 'logoPositionYBack',
        'logoSizeFront', 'logoSizeBack',
        'activeLogoColorFront', 'activeLogoColorBack',
        'logoInvertedFront', 'logoInvertedBack',
        'backgroundRemovedFront', 'backgroundRemovedBack',
        'logoFront2', 'logoBack2', 'logoFront3', 'logoBack3'
    ];

    for (const field of logoFields) {
        if (typeof item1[field] === 'object' || typeof item2[field] === 'object') {
            if (JSON.stringify(item1[field]) !== JSON.stringify(item2[field])) return false;
        } else if (item1[field] !== item2[field]) return false;
    }

    // Texts
    if (!areTextsEqual(item1.textFront, item2.textFront)) return false;
    if (!areTextsEqual(item1.textBack, item2.textBack)) return false;
    if (!areTextsEqual(item1.textFront2, item2.textFront2)) return false;
    if (!areTextsEqual(item1.textBack2, item2.textBack2)) return false;

    // Services
    if (item1.serviceRetouche !== item2.serviceRetouche) return false;
    if (item1.serviceModernisation !== item2.serviceModernisation) return false;
    if (item1.isRetouchingService !== item2.isRetouchingService) return false;
    if (item1.isModernizationService !== item2.isModernizationService) return false;

    return true;
}

function areTextsEqual(t1: any, t2: any): boolean {
    if (!t1 && !t2) return true;
    if (!t1 || !t2) return false;

    const textFields = [
        'text', 'fontSize', 'fontFamily', 'fontWeight',
        'textTransform', 'color', 'letterSpacing', 'lineHeight',
        'shadow', 'outline', 'curve', 'curveStyle'
    ];

    for (const field of textFields) {
        if (t1[field] !== t2[field]) return false;
    }

    // Position
    if (t1.position?.x !== t2.position?.x || t1.position?.y !== t2.position?.y) return false;

    return true;
}
export function shuffleArray<T>(array: T[]): T[] {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

/**
 * Calculates the marking fee (Production + Forfait Impression) based on item content.
 * Returns 0, 15, or 20.
 */
export function calculateMarkingFee(item: any): number {
    if (!item) return 0;

    const A5_THRESHOLD_MM = 210;
    const MM_FACTOR = 5.3;

    const logos: number[] = [];
    const texts: string[] = [];

    const isLogoActive = (logo: any): boolean => {
        if (!logo) return false;
        if (typeof logo === 'string') return logo.length > 0;
        if (typeof logo === 'object') return !!(logo.originalUrl || logo.predefinedUrl || logo.content || logo.url);
        return false;
    };

    // Front
    if (isLogoActive(item.originalLogoUrlFront || item.predefinedLogoUrlFront)) logos.push(item.logoSizeFront || 0);
    if (isLogoActive(item.logoFront2)) logos.push(item.logoFront2.size || 0);
    if (isLogoActive(item.logoFront3)) logos.push(item.logoFront3.size || 0);
    if (item.textFront?.text?.trim()) texts.push(item.textFront.text);
    if (item.textFront2?.text?.trim()) texts.push(item.textFront2.text);
    if (item.textFront3?.text?.trim()) texts.push(item.textFront3.text);

    // Back
    if (isLogoActive(item.originalLogoUrlBack || item.predefinedLogoUrlBack)) logos.push(item.logoSizeBack || 0);
    if (isLogoActive(item.logoBack2)) logos.push(item.logoBack2.size || 0);
    if (isLogoActive(item.logoBack3)) logos.push(item.logoBack3.size || 0);
    if (item.textBack?.text?.trim()) texts.push(item.textBack.text);
    if (item.textBack2?.text?.trim()) texts.push(item.textBack2.text);
    if (item.textBack3?.text?.trim()) texts.push(item.textBack3.text);

    const totalElements = logos.length + texts.length;
    if (totalElements === 0) return 0;

    // 1. Base Fee based on largest logo
    const maxLogoSizeMm = logos.length > 0 ? Math.max(...logos) * MM_FACTOR : 0;
    let totalFee = (maxLogoSizeMm > A5_THRESHOLD_MM) ? 15 : 10;

    // 2. Standard Surcharge for additional elements (+5€ per element)
    const additionalSurcharge = (totalElements - 1) * 5;
    totalFee += additionalSurcharge;

    // 3. APPLY 5€ REDUCTION if we have 2 logos and at least one is <= A5
    // User request: "la réduction de 5 euro doit etre faite lorsqu'un 2 ième logo chargé est réduit moins de la dimension d'une A5"
    // Interpretation: If there's a 1st logo and a 2nd logo (front/back), and the 2nd one is small, subtract 5€.
    if (logos.length >= 2) {
        const sortedLogos = [...logos].sort((a, b) => b - a);
        const secondaryLogos = sortedLogos.slice(1);

        // If any secondary logo is smaller than A5, apply 5€ discount once (as commonly expected for "a 2nd logo")
        // or per small logo? User said "un 2 ième logo", usually implies a flat reduction for adding a small one.
        const hasSmallSecondary = secondaryLogos.some(size => size * MM_FACTOR <= A5_THRESHOLD_MM);
        if (hasSmallSecondary) {
            totalFee -= 5;
        }
    }

    return totalFee;
}

/**
 * Calculates the base textile price for a specific size and color,
 * accounting for lot pricing (boxQuantity/boxPrice) and specific rules.
 */
export function calculateBaseUnitPrice(product: any, size: string, color: string, pricingRules: any, totalQty: number): number {
    if (!product) return 0;

    // 1. Check for Lot Pricing (Bulk discount)
    const isLotApplied = product.boxQuantity !== undefined && totalQty >= product.boxQuantity;
    let price = (isLotApplied && product.boxPrice !== undefined) ? product.boxPrice : (product.price || 0);

    // 2. Size-based price override
    if (product.sizePrices && product.sizePrices[size]) {
        price = product.sizePrices[size];
    }
    // 3. Pricing Rules from Firestore (Rules by product type/ID)
    else if (pricingRules) {
        // Use productType if provided, else fall back to ID/Reference
        const key = product.type || product.id || product.reference;
        const rule = pricingRules[key];

        if (rule !== undefined) {
            if (typeof rule === 'number') {
                price = rule;
            } else if (typeof rule === 'object' && rule[size] && rule[size][color]) {
                price = rule[size][color];
            }
        }
    }

    return price;
}
