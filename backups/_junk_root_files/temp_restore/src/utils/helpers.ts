// import { Area } from 'react-easy-crop/types';
export interface Area { x: number; y: number; width: number; height: number; }

// --- HELPER ---
export function getProxiedUrl(url: string | null | undefined, options: { width?: number, height?: number, fit?: 'contain' | 'cover', quality?: number } = {}) {
    if (!url || url === 'null' || url === 'undefined' || url.startsWith('data:')) return url || '';

    // Auto-proxy local assets via production domain
    // BYPASS PROXY ON LOCALHOST to ensure we see local changes
    if (url.startsWith('/')) {
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

export function resizeImage(base64Str: string, maxWidth = 800, quality = 0.7): Promise<string> {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = base64Str;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

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

// Enhanced Background Removal (White or Black)
// Remove.bg API integration
export async function removeBackground(inputStr: string, mode: 'white' | 'black' = 'white'): Promise<string> {
    try {
        let blob: Blob | null = null;

        if (inputStr.startsWith('http') || inputStr.startsWith('/')) {
            const response = await fetch(inputStr);
            blob = await response.blob();
        } else {
            blob = dataURLtoBlob(inputStr);
        }

        if (!blob) return inputStr;

        const formData = new FormData();
        formData.append("image_file", blob, "image.png");
        formData.append("size", "auto");

        const response = await fetch("https://api.remove.bg/v1.0/removebg", {
            method: "POST",
            headers: {
                "X-Api-Key": (import.meta as any).env.VITE_REMOVE_BG_API_KEY || "QnG5GWR2EVuxXByXeNfa9opV"
            },
            body: formData
        });

        if (response.ok) {
            const resBlob = await response.blob();
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(resBlob);
            });
        } else {
            const errorJson = await response.json().catch(() => ({}));
            const errorTitle = errorJson.errors?.[0]?.title || "Erreur de détourage";
            const errorCode = errorJson.errors?.[0]?.code;

            if (errorCode === "insufficient_credits") {
                throw new Error("CRÉDITS_INSUFFISANTS");
            }

            throw new Error(`${errorTitle} (Code: ${response.status})`);
        }
    } catch (error) {
        console.error("Remove.bg Exception:", error);
        return inputStr;
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

export async function urlToBase64(url: string): Promise<string> {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        return new Promise((resolve) => {
            const reader = new FileReader();

            reader.onloadend = () => {
                const res = reader.result as string;
                resolve(res);
            };
            reader.readAsDataURL(blob);
        });
    } catch (e) {
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
                ctx.fillText("SIGNEEDCLUB", x, y);
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

export function cleanCartItem(obj: any): any {
    if (obj === undefined || obj === null) return obj;
    // Recursively clean objects and arrays
    if (Array.isArray(obj)) {
        return obj.map(cleanCartItem);
    }
    if (typeof obj === 'object') {
        const newObj: any = {};
        for (const key in obj) {
            newObj[key] = cleanCartItem(obj[key]);
        }
        return newObj;
    }
    // Clean string values (base64)
    if (typeof obj === 'string') {
        // Only remove VERY large base64 images (AI images, previews) - keep logo images
        // AI and preview images are typically > 100KB, logos are smaller
        if (obj.startsWith('data:image') && obj.length > 100000) {
            return ''; // Remove large base64 data to save space
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
        'backgroundRemovedFront', 'backgroundRemovedBack'
    ];

    for (const field of logoFields) {
        if (item1[field] !== item2[field]) return false;
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
