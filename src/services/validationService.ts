
export interface ValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
}

export interface FileSpecs {
    width: number;
    height: number;
    hasAlpha: boolean;
    fileSizeKB: number;
}

export const validationService = {
    /**
     * Get image specifications from base64
     */
    getImageSpecs: (base64: string): Promise<FileSpecs> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error("Canvas context failed"));
                    return;
                }
                ctx.drawImage(img, 0, 0);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
                
                let hasAlpha = false;
                for (let i = 3; i < imageData.length; i += 4) {
                    if (imageData[i] < 255) {
                        hasAlpha = true;
                        break;
                    }
                }

                const fileSizeKB = Math.round((base64.length * 0.75) / 1024);

                resolve({
                    width: img.width,
                    height: img.height,
                    hasAlpha,
                    fileSizeKB
                });
            };
            img.onerror = () => reject(new Error("Failed to load image for validation"));
            img.src = base64;
        });
    },

    /**
     * Validate a single logo for DTF production
     */
    validateLogo: async (base64: string, name: string = "Logo"): Promise<ValidationResult> => {
        const result: ValidationResult = { isValid: true, errors: [], warnings: [] };
        
        try {
            const specs = await validationService.getImageSpecs(base64);

            // 1. RESOLUTION CHECK
            // DTF Standard: Minimum 1000px on smallest side for decent quality, 2000px for HD
            const minSide = Math.min(specs.width, specs.height);
            if (minSide < 800) {
                result.isValid = false;
                result.errors.push(`${name} : Résolution trop basse (${specs.width}x${specs.height}px). Minimum 1000px recommandé pour une impression nette.`);
            } else if (minSide < 1500) {
                result.warnings.push(`${name} : Résolution moyenne. Pour un résultat optimal, préférez un fichier > 2000px.`);
            }

            // 2. DTF COMPATIBILITY (Transparency)
            if (!specs.hasAlpha) {
                result.isValid = false;
                result.errors.push(`${name} : Pas de transparence détectée. Le DTF nécessite un fond transparent (PNG).`);
            }

            // 3. FILE SIZE (Sanity check)
            if (specs.fileSizeKB < 20) {
                result.warnings.push(`${name} : Fichier suspectement léger (${specs.fileSizeKB}KB). Vérifiez la qualité.`);
            }

        } catch (error) {
            result.isValid = false;
            result.errors.push(`${name} : Échec de l'analyse technique.`);
        }

        return result;
    },

    /**
     * Validate all items in the cart
     */
    validateOrder: async (cart: any[]): Promise<ValidationResult> => {
        const globalResult: ValidationResult = { isValid: true, errors: [], warnings: [] };

        for (let i = 0; i < cart.length; i++) {
            const item = cart[i];
            const itemName = `Article ${i + 1} (${item.name || item.productType})`;

            // Validate Front Logo
            const frontLogo = item.originalLogoUrlFront || item.predefinedLogoUrlFront;
            if (frontLogo && frontLogo.startsWith('data:')) {
                const res = await validationService.validateLogo(frontLogo, `${itemName} - Logo Face`);
                if (!res.isValid) {
                    globalResult.isValid = false;
                    globalResult.errors.push(...res.errors);
                }
                globalResult.warnings.push(...res.warnings);
            }

            // Validate Back Logo
            const backLogo = item.originalLogoUrlBack || item.predefinedLogoUrlBack;
            if (backLogo && backLogo.startsWith('data:')) {
                const res = await validationService.validateLogo(backLogo, `${itemName} - Logo Dos`);
                if (!res.isValid) {
                    globalResult.isValid = false;
                    globalResult.errors.push(...res.errors);
                }
                globalResult.warnings.push(...res.warnings);
            }
        }

        return globalResult;
    }
};
