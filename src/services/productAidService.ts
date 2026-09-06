import { GoogleGenAI, Modality } from "@google/genai";
import { AuditProductEntry } from "../config/audit-portail";

export const getGeminiApiKey = (): string => {
    if (typeof window !== 'undefined') {
        const custom = localStorage.getItem('signaid_gemini_api_key');
        if (custom && custom.trim().length > 10) return custom.trim();
    }
    const metaEnv = (typeof import.meta !== 'undefined' && (import.meta as any)?.env) ? (import.meta as any).env : {};
    const envKey = metaEnv.VITE_GEMINI_API_KEY || 
                   metaEnv.VITE_GOOGLE_GENAI_API_KEY || 
                   metaEnv.GEMINI_API_KEY || 
                   metaEnv.NEXT_PUBLIC_GEMINI_API_KEY || 
                   (typeof process !== 'undefined' && process.env ? (process.env.VITE_GEMINI_API_KEY || process.env.VITE_GOOGLE_GENAI_API_KEY || process.env.GEMINI_API_KEY) : '') ||
                   "";
    return (envKey || "").trim();
};

export const setGeminiApiKey = (key: string) => {
    if (typeof window !== 'undefined') {
        localStorage.setItem('signaid_gemini_api_key', key.trim());
    }
};

/**
 * Garde de sécurité : vérifie si la clé API est exploitable
 * (évite les requêtes réseau superflues causant un crash HTTP 400 API_KEY_INVALID)
 */
export const isApiKeyUsable = (key?: string): boolean => {
    if (!key) return false;
    const clean = key.trim();
    if (clean.length < 20) return false;
    if (
        clean.includes('PLACEHOLDER') || 
        clean.includes('votre_') || 
        clean.includes('MY_GEMINI_API_KEY') ||
        clean.includes('YOUR_API_KEY')
    ) {
        return false;
    }
    // Clé historique révoquée générant HTTP 400 (API_KEY_INVALID)
    if (clean === 'AIzaSyA72FVAbnQqyybCS6NMAesXVkjyV7D6ozc') {
        return false;
    }
    return true;
};

export const testGeminiApiKey = async (customKey?: string): Promise<{ success: boolean; message: string }> => {
    const keyToTest = (customKey || getGeminiApiKey()).trim();
    if (!keyToTest) {
        return { success: false, message: "Aucune clé API fournie." };
    }
    if (!isApiKeyUsable(keyToTest)) {
        return { 
            success: false, 
            message: "Clé API non configurée ou révoquée (API_KEY_INVALID). Veuillez fournir une clé Google AI Studio active." 
        };
    }
    try {
        const ai = new GoogleGenAI({ apiKey: keyToTest });
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: 'Dis "OK"'
        });
        if (response.text) {
            return { success: true, message: "Clé API valide et connectée à Gemini 2.5 !" };
        }
        return { success: false, message: "Réponse vide de l'API Google." };
    } catch (err: any) {
        return { 
            success: false, 
            message: err?.message || "Échec de validation de la clé API. Vérifiez vos quotas ou restrictions Google AI Studio." 
        };
    }
};

export interface ProductAidImage {
    base64: string;
    mimeType: string;
    previewUrl?: string;
}

/**
 * Analyse locale déterministe et instantanée d'un descriptif ou fiche fournisseur
 */
export const parseSupplierSpecsLocally = (rawText: string): Partial<AuditProductEntry> => {
    const text = rawText || "";
    
    // 1. Détection SKU / Réf
    const skuMatch = text.match(/\b([A-Z0-9]{3,8}(?:-[A-Z0-9]{2,6})?)\b/i) || text.match(/R[ée]f[ée]rence\s*[:\s]\s*([A-Z0-9-]+)/i);
    const sku = skuMatch ? skuMatch[1].toUpperCase() : "PROD-" + Date.now().toString(36).toUpperCase();

    // 2. Détection Grammage (g/m²)
    const gsmMatch = text.match(/(\d{2,3})\s*(?:g\/m²|g\/m2|gsm|g\b|gr)/i);
    const weightGsm = gsmMatch ? parseInt(gsmMatch[1], 10) : 180;

    // 3. Détection Composition
    let composition = "100% Coton peigné";
    if (/coton\s+peign[ée]/i.test(text)) composition = "100% Coton peigné (Jersey simple)";
    else if (/ringspun/i.test(text)) composition = "100% Coton Ringspun prérétréci";
    else if (/polyester/i.test(text) && /coton/i.test(text)) composition = "65% Polyester, 35% Coton";
    else if (/polyester/i.test(text)) composition = "100% Polyester respirant";
    else if (/coton/i.test(text)) composition = "100% Coton";

    // 4. Détection Marque
    let brand = "Marque Textile";
    if (/build\s*your\s*brand/i.test(text)) brand = "Build Your Brand";
    else if (/next\s*level/i.test(text)) brand = "Next Level Apparel";
    else if (/stanley\s*\/?\s*stella/i.test(text)) brand = "Stanley/Stella";
    else if (/b&c|b\s*and\s*c/i.test(text)) brand = "B&C Collection";
    else if (/fruit\s*of\s*the\s*loom/i.test(text)) brand = "Fruit of the Loom";
    else if (/gildan/i.test(text)) brand = "Gildan";
    else if (/jhk/i.test(text)) brand = "JHK";
    else if (/mantis/i.test(text)) brand = "Mantis";

    // 5. Détection Fournisseur
    let supplierName = "L-Shop-Team";
    if (/printwear/i.test(text)) supplierName = "Printwear";
    else if (/toptex/i.test(text)) supplierName = "TopTex";
    else if (/falk/i.test(text)) supplierName = "Falk&Ross";

    // 6. Détection Modèle & Catégorie
    let garmentType: AuditProductEntry['garmentType'] = 'tshirt';
    let title = "T-Shirt Textile";
    let category = "Textile / Streetwear";
    let fit = "Coupe standard (Regular fit)";

    if (/tank|d[ée]bardeur|sans\s+manches/i.test(text)) {
        garmentType = 'tank_top';
        title = "Débardeur " + (brand !== "Marque Textile" ? brand : "Vision Room");
        category = "Textile / Sans Manches";
        fit = "Coupe standard sans manches, col ras du cou";
    } else if (/heavyweight|oversize|boxy|drop\s*shoulder/i.test(text)) {
        garmentType = 'tshirt_oversize';
        title = "T-Shirt Heavyweight Oversize";
        category = "Streetwear / Boxy Cut";
        fit = "Coupe oversize avec épaules tombantes";
    } else if (/polo/i.test(text)) {
        garmentType = 'polo';
        title = "Polo Premium";
        category = "Textile / Polo";
        fit = "Coupe ajustée avec col 3 boutons";
    } else if (/hoodie|sweat|capuche/i.test(text)) {
        garmentType = 'sweat';
        title = "Hoodie Sweat Premium";
        category = "Textile / Sweatshirt";
        fit = "Coupe confort avec capuche doublée";
    } else if (/carte|visite|card/i.test(text)) {
        garmentType = 'business_card';
        title = "Carte de Visite Pro";
        category = "Papeterie & Print";
        fit = "Format standard 85x55mm 350g";
    }

    // 7. Détection Prix
    const priceMatch = text.match(/(\d+[.,]\d{2})\s*€?/);
    const costPriceHt = priceMatch ? parseFloat(priceMatch[1].replace(',', '.')) : (garmentType === 'tank_top' ? 4.85 : garmentType === 'tshirt_oversize' ? 7.50 : 5.00);
    const retailPriceTtc = parseFloat((costPriceHt * 2.8 + 8).toFixed(2));

    // 8. Tailles
    const sizes: string[] = [];
    ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL', '5XL'].forEach(sz => {
        const regex = new RegExp(`\\b${sz}\\b`, 'i');
        if (regex.test(text)) sizes.push(sz);
    });
    const finalSizes = sizes.length > 0 ? sizes : ['S', 'M', 'L', 'XL', 'XXL'];

    // 9. Features
    const features = [
        "Sans étiquette de marque au col (Tear-away label)",
        `Maille fine ${weightGsm} g/m² idéale pour marquage DTG / Sérigraphie`,
        "Finitions renforcées et coutures doublées haute tenue"
    ];

    return {
        id: `prod_${sku.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now().toString(36)}`,
        sku,
        supplierRef: sku,
        supplierName,
        brand,
        model: title,
        title,
        category,
        garmentType,
        composition,
        weightGsm,
        fit,
        features,
        sizes: finalSizes,
        colors: [
            { name: "Noir", hex: "#000000", isPrimary: true },
            { name: "Blanc", hex: "#ffffff", isPrimary: false }
        ],
        pricing: {
            costPriceHt,
            retailPriceTtc,
            currency: "EUR",
            marginEstimated: parseFloat((retailPriceTtc / 1.2 - costPriceHt).toFixed(2))
        },
        mockups: {
            front: garmentType === 'tank_top' ? '/merch/visionroom/tank-front.png' : garmentType === 'tshirt_oversize' ? '/merch/visionroom/oversize-front.png' : '/assets/tshirt-black-JHK170.png',
            back: garmentType === 'tank_top' ? '/merch/visionroom/tank-back.png' : garmentType === 'tshirt_oversize' ? '/merch/visionroom/oversize-back.png' : '/assets/tshirt-black-JHK170-dos.png'
        },
        printSpecs: {
            printableAreas: ['front', 'back', 'chest_left'],
            recommendedTechnique: 'DTG',
            maxPrintWidthMm: 300,
            maxPrintHeightMm: 400
        },
        status: 'active'
    };
};

/**
 * Optimise un prompt utilisateur pour le rendu textile avec Gemini
 */
export const refinePromptWithAI = async (rawPrompt: string): Promise<string> => {
    if (!rawPrompt.trim()) return rawPrompt;
    const apiKey = getGeminiApiKey();
    if (!apiKey || !isApiKeyUsable(apiKey)) {
        console.warn("[ProductAid] Clé API Gemini non configurée ou non valide pour l'optimisation. Utilisation du prompt brut.");
        return rawPrompt;
    }
    
    try {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `You are an expert fashion designer and commercial apparel mockup specialist for Signaid.
Refine and optimize this prompt into a highly detailed photorealistic prompt: "${rawPrompt}". Output only the prompt in a single concise paragraph.`
        });
        return response.text?.trim() || rawPrompt;
    } catch (err) {
        console.warn("[ProductAid] AI prompt refinement fallback:", err);
        return rawPrompt;
    }
};

/**
 * Mockup local instantané sur Canvas quand Gemini n'est pas disponible ou sans clé valide
 */
export const generateLocalMockupFallback = async (
    garmentImage: ProductAidImage,
    shapeReference?: ProductAidImage | null,
    color?: string
): Promise<string> => {
    const defaultDataUrl = () => {
        const target = shapeReference?.base64 || garmentImage.base64;
        if (!target) return '';
        return target.startsWith('data:') 
            ? target 
            : `data:${garmentImage.mimeType || 'image/png'};base64,${target}`;
    };

    if (typeof window === 'undefined' || typeof document === 'undefined' || !document.createElement) {
        return defaultDataUrl();
    }

    return new Promise((resolve) => {
        try {
            const canvas = document.createElement('canvas');
            canvas.width = 1000;
            canvas.height = 1000;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                resolve(defaultDataUrl());
                return;
            }

            // Dégradé studio photo professionnel épuré
            const grad = ctx.createRadialGradient(500, 500, 80, 500, 500, 600);
            grad.addColorStop(0, '#ffffff');
            grad.addColorStop(1, '#f1f5f9');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, 1000, 1000);

            const img = new Image();
            img.crossOrigin = 'anonymous';

            img.onload = () => {
                try {
                    // Ombre portée naturelle studio
                    ctx.shadowColor = 'rgba(0, 0, 0, 0.12)';
                    ctx.shadowBlur = 40;
                    ctx.shadowOffsetX = 0;
                    ctx.shadowOffsetY = 20;

                    const maxDim = 820;
                    const scale = Math.min(maxDim / img.width, maxDim / img.height);
                    const w = img.width * scale;
                    const h = img.height * scale;
                    const x = (1000 - w) / 2;
                    const y = (1000 - h) / 2;

                    ctx.drawImage(img, x, y, w, h);

                    // Badge de couleur si spécifiée
                    if (color && color !== '#F97316' && color !== '#000000' && color !== '#ffffff') {
                        ctx.shadowColor = 'transparent';
                        ctx.fillStyle = color;
                        ctx.beginPath();
                        ctx.arc(920, 80, 20, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.strokeStyle = '#ffffff';
                        ctx.lineWidth = 4;
                        ctx.stroke();
                    }

                    resolve(canvas.toDataURL('image/png'));
                } catch (e) {
                    resolve(defaultDataUrl());
                }
            };

            img.onerror = () => {
                resolve(defaultDataUrl());
            };

            const src = shapeReference?.base64 || garmentImage.base64;
            img.src = src.startsWith('data:') ? src : `data:${garmentImage.mimeType || 'image/png'};base64,${src}`;
        } catch (e) {
            resolve(defaultDataUrl());
        }
    });
};

/**
 * Génère une image produit haute fidélité via Gemini 2.5 Image avec fallback local résilient
 */
export const generateProductAidImage = async (
    garmentImage: ProductAidImage,
    prompt: string,
    shapeReference?: ProductAidImage | null,
    position?: string,
    color?: string
): Promise<string> => {
    const apiKey = getGeminiApiKey();

    // Garde explicite : si apiKey est vide ou non définie (ou invalide), ne pas tenter l'appel réseau qui crashe en 400
    if (!apiKey || !isApiKeyUsable(apiKey)) {
        console.warn("[ProductAid] Clé API Gemini non configurée ou non valide. Bascule immédiate sur le fallback local instantané.");
        return generateLocalMockupFallback(garmentImage, shapeReference, color);
    }

    try {
        const ai = new GoogleGenAI({ apiKey });

        let fullPrompt = prompt;
        if (shapeReference) {
            fullPrompt = `Strictly preserve and conform to the silhouette, shape, contour and outline of the template image. Apply the garment styling, texture and materials from the primary garment image. ${fullPrompt}`;
        }
        if (position) {
            fullPrompt += ` View perspective: ${position}.`;
        }
        if (color) {
            fullPrompt += ` Primary color palette: ${color}.`;
        }

        const cleanBase64 = (b64: string) => {
            return b64.includes(',') ? b64.split(',')[1] : b64;
        };

        const parts: any[] = [
            {
                inlineData: {
                    data: cleanBase64(garmentImage.base64),
                    mimeType: garmentImage.mimeType || 'image/png',
                },
            },
        ];

        if (shapeReference && shapeReference.base64) {
            parts.push({
                inlineData: {
                    data: cleanBase64(shapeReference.base64),
                    mimeType: shapeReference.mimeType || 'image/png',
                },
            });
        }

        parts.push({ text: fullPrompt });

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });

        for (const candidate of response.candidates || []) {
            for (const part of candidate.content?.parts || []) {
                if (part.inlineData && part.inlineData.data) {
                    const mime = part.inlineData.mimeType || 'image/png';
                    return `data:${mime};base64,${part.inlineData.data}`;
                }
            }
        }

        throw new Error("Aucune image n'a été retournée par l'IA.");
    } catch (error: any) {
        console.warn("[ProductAid] Erreur lors de la génération IA, bascule sur le fallback local instantané:", error);
        return generateLocalMockupFallback(garmentImage, shapeReference, color);
    }
};

/**
 * Extrait automatiquement une fiche technique textile complète (avec fallback local résilient)
 */
export const extractProductSpecsFromText = async (rawText: string): Promise<Partial<AuditProductEntry>> => {
    if (!rawText.trim()) throw new Error("Le texte fournisseur est vide.");

    const apiKey = getGeminiApiKey();

    // Garde explicite : si apiKey est vide ou non définie (ou invalide), ne pas tenter l'appel réseau qui crashe en 400
    if (!apiKey || !isApiKeyUsable(apiKey)) {
        console.warn("[ProductAid] Clé API Gemini non configurée ou non valide. Bascule immédiate sur l'instant local parser fallback.");
        return parseSupplierSpecsLocally(rawText);
    }

    try {
        const ai = new GoogleGenAI({ apiKey });
        const prompt = `Tu es un expert textile et data architect e-commerce pour Signaid.
Analyse la description / fiche technique fournisseur ci-dessous et extrais toutes les caractéristiques au format JSON strict (sans balises markdown supplémentaires).

Texte fournisseur :
"""
${rawText}
"""

Format JSON attendu :
{
  "sku": "Référence SKU courte (ex: BYBB011-BLK ou NX7200)",
  "supplierRef": "Référence fabricant (ex: BYBB011)",
  "supplierName": "Nom du fournisseur (ex: L-Shop-Team, Printwear, B&C)",
  "brand": "Marque textile (ex: Build Your Brand, Next Level, Stanley/Stella)",
  "model": "Nom du modèle (ex: Basic Tank, Unisex Heavyweight T-Shirt)",
  "title": "Titre commercial propre en français (ex: Débardeur Vision Room)",
  "category": "Catégorie (ex: Textile / Sans Manches, Streetwear / Boxy Cut)",
  "garmentType": "tank_top" | "tshirt_oversize" | "tshirt" | "polo" | "sweat" | "business_card",
  "composition": "Composition exacte (ex: 100% Coton peigné)",
  "weightGsm": 200,
  "fit": "Description de la coupe",
  "features": ["point 1", "point 2", "point 3"],
  "sizes": ["S", "M", "L", "XL", "XXL"],
  "colors": [
    { "name": "Noir", "hex": "#000000", "isPrimary": true },
    { "name": "Blanc", "hex": "#ffffff", "isPrimary": false }
  ],
  "costPriceHt": 4.50,
  "retailPriceTtc": 29.99
}`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt
        });

        const rawJson = response.text?.replace(/```json/g, '').replace(/```/g, '').trim() || '{}';
        const parsed = JSON.parse(rawJson);

        const pricing = {
            costPriceHt: Number(parsed.costPriceHt) || 5.00,
            retailPriceTtc: Number(parsed.retailPriceTtc) || 29.99,
            currency: "EUR",
            marginEstimated: Math.max(0, Number(((Number(parsed.retailPriceTtc) || 29.99) / 1.2 - (Number(parsed.costPriceHt) || 5.00)).toFixed(2)))
        };

        return {
            id: `prod_${(parsed.sku || parsed.supplierRef || 'item').toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now().toString(36)}`,
            sku: parsed.sku || 'REF-CUSTOM',
            supplierRef: parsed.supplierRef || parsed.sku || 'REF',
            supplierName: parsed.supplierName || 'Fournisseur Textile',
            brand: parsed.brand || 'Marque',
            model: parsed.model || 'Modèle',
            title: parsed.title || parsed.model || 'Nouveau Produit',
            category: parsed.category || 'Textile',
            garmentType: (['tank_top', 'tshirt_oversize', 'tshirt', 'polo', 'sweat', 'business_card'].includes(parsed.garmentType) ? parsed.garmentType : 'tshirt'),
            composition: parsed.composition || '100% Coton',
            weightGsm: Number(parsed.weightGsm) || 180,
            fit: parsed.fit || 'Coupe standard',
            features: Array.isArray(parsed.features) ? parsed.features : ['Qualité premium'],
            sizes: Array.isArray(parsed.sizes) && parsed.sizes.length > 0 ? parsed.sizes : ['S', 'M', 'L', 'XL', 'XXL'],
            colors: Array.isArray(parsed.colors) && parsed.colors.length > 0 ? parsed.colors : [{ name: 'Noir', hex: '#000000', isPrimary: true }],
            pricing,
            mockups: {
                front: '',
                back: ''
            },
            printSpecs: {
                printableAreas: ['front', 'back', 'chest_left'],
                recommendedTechnique: 'DTG',
                maxPrintWidthMm: 300,
                maxPrintHeightMm: 400
            },
            status: 'active'
        };
    } catch (err: any) {
        console.warn("[ProductAid] Gemini extraction notice, using instant local parser fallback:", err);
        return parseSupplierSpecsLocally(rawText);
    }
};

/**
 * Extrait la couleur dominante d'une image
 */
export const extractDominantColor = async (base64Image: string): Promise<string> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.src = base64Image.startsWith('data:') ? base64Image : `data:image/png;base64,${base64Image}`;
        
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                resolve('#F97316');
                return;
            }
            canvas.width = 50;
            canvas.height = 50;
            ctx.drawImage(img, 0, 0, 50, 50);
            const imageData = ctx.getImageData(0, 0, 50, 50).data;
            let r = 0, g = 0, b = 0, count = 0;
            for (let i = 0; i < imageData.length; i += 4) {
                const alpha = imageData[i + 3];
                const red = imageData[i];
                const green = imageData[i + 1];
                const blue = imageData[i + 2];
                if (alpha > 128 && !(red > 240 && green > 240 && blue > 240) && !(red < 15 && green < 15 && blue < 15)) {
                    r += red;
                    g += green;
                    b += blue;
                    count++;
                }
            }
            if (count === 0) {
                resolve('#F97316');
                return;
            }
            r = Math.round(r / count);
            g = Math.round(g / count);
            b = Math.round(b / count);
            const hex = "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
            resolve(hex);
        };

        img.onerror = () => resolve('#F97316');
    });
};
