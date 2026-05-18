import { STYLE_MATRIX } from '../constants';
import { getFunctions, httpsCallable, httpsCallableFromURL } from 'firebase/functions';
import app from '../firebaseConfig';

export const generateTryOnImage = async (
    userPhotoBase64: string,
    garmentPreviewBase64: string,
    garmentDescription: string,
    prompt: string,
    styleCategory: string,
    pose: 'front' | 'back',
    uploadedGarmentBase64: string | null = null,
    explicitGlassesPrompt: string | null = null,
    designCompositeBase64: string | null = null,
    designLayout: string = "",
    logoColor: string = ""
): Promise<string> => {
    // Aggressively clean base64 helper to avoid 400 Bad Request errors
    const cleanBase64 = (str: string, name: string) => {
        if (!str) return "";
        let cleaned = str;
        if (str.includes(',')) cleaned = str.split(',')[1];
        // Remove ANY whitespace (newlines, spaces, etc.) that common base64 encoders might include
        cleaned = cleaned.replace(/\s/g, '');

        console.log(`[Gemini] ${name} size: ${Math.round(cleaned.length / 1024)} KB. Header: ${cleaned.substring(0, 20)}...`);
        return cleaned;
    };

    const cleanUserPhoto = cleanBase64(userPhotoBase64, "User Photo");
    const cleanGarmentPreview = cleanBase64(garmentPreviewBase64, "Garment Design");

    // VALIDATION: Ensure Garment Preview is valid (Input 2)
    if (!cleanGarmentPreview || cleanGarmentPreview.length < 500) {
        console.error("Garment preview too short or empty:", cleanGarmentPreview?.substring(0, 50));
        throw new Error("Garment Design Capture Failed. The AI did not receive a valid design layer.");
    }

    if (!cleanUserPhoto || cleanUserPhoto.length < 500) {
        throw new Error("User Photo Capture Failed. The AI did not receive a valid person's photo.");
    }

    // --- GLASSES LOGIC ---
    let glassesPrompt = "";
    if (explicitGlassesPrompt) {
        glassesPrompt = explicitGlassesPrompt;
    } else {
        let foundStyle = null;
        if (styleCategory) {
            for (const cat in STYLE_MATRIX) {
                if (Array.isArray(STYLE_MATRIX[cat])) {
                    const match = (STYLE_MATRIX[cat] as any[]).find(s => s && s.name && (s.name.toLowerCase() === styleCategory.toLowerCase() || s.name.toLowerCase().includes(styleCategory.toLowerCase())));
                    if (match) {
                        foundStyle = match;
                        break;
                    }
                }
            }
        }
        if (foundStyle && foundStyle.glasses) {
            glassesPrompt = foundStyle.glasses + " with smoked lenses to hide the eyes";
        } else if (styleCategory === 'Réaliste' || styleCategory === 'Paparazzi' || styleCategory === 'Sans Filtre' || styleCategory === 'Standard V-TON') {
            glassesPrompt = "wearing stylish sunglasses with smoked lenses to hide the eyes";
        }
    }

    // --- PROMPT CONSTRUCTION (Restore V23 Excellence) ---
    const itemType = garmentDescription ? garmentDescription.toLowerCase() : "custom garment";
    let finalPrompt = "";

    // CASE 1: Specialized V-TON Prompt (Sans Filtre / Direct)
    if (prompt.toLowerCase().includes("v-ton_direct") || prompt.toLowerCase().includes("exclusive virtual try-on") || styleCategory === 'Sans Filtre') {
        const isBackView = prompt.toLowerCase().includes("back view");
        let finalPrompt = `Professional fashion photography task (STORY FORMAT 9:16).
        The person from the FIRST IMAGE is now wearing the garment design from the SECOND IMAGE.
        ${isBackView ? 'CRITICAL: This is the BACK VIEW. The person MUST face away from the camera. IGNORE the front-facing pose of Input 1.' : 'VIEW: Front view.'}
        LOGO FIDELITY: Input 3 is the ABSOLUTE SOURCE OF TRUTH for the design. YOU MUST reproduce the FULL text exactly, including the prefix 'Ets.' (e.g. "Ets. Antoine David"). Do not alter the font or wording.
        ${designLayout ? `Logo placement: ${designLayout}.` : ''}
        ${logoColor ? `Logo color: ${logoColor}.` : ''}
        Final output: ONE SINGLE HIGH-QUALITY VERTICAL STORY (9:16). NO landscape padding.`;
    } else {
        // CASE 2: Artistic / Creative Styles (Standard Style Hub)
        const isBackView = prompt.toLowerCase().includes("back view");
        finalPrompt = `Artistic High-End Fashion Task (STORY FORMAT 9:16).
        Style: ${prompt}
        The person from Input 1 is now wearing the creation from Input 2. 
        ${isBackView ? 'CRITICAL BACK VIEW: The person MUST be seen from BEHIND. IGNORE the front-facing pose of the original person.' : 'VIEW: Front view.'}
        LOGO FIDELITY: Input 3 is the ABSOLUTE SOURCE OF TRUTH. Transfer the full design including 'Ets.' prefix exactly.
        ${designLayout ? `Placement: ${designLayout}.` : ''}
        ${logoColor ? `Color: ${logoColor}.` : ''}
        Final Output: ONE SINGLE HIGH-QUALITY VERTICAL STORY (9:16). NO horizontal padding.`;
    }

    if (glassesPrompt) {
        finalPrompt += ` Additionally, the person is ${glassesPrompt}.`;
    }

    console.log("🚀 [Gemini Proxy] Sending Prompt:", finalPrompt.substring(0, 100) + "...");

    try {
        const functions = getFunctions(app, 'us-central1');
        const generateImageProxy = httpsCallable(functions, 'generateTryOnImageV2');

        const result = await generateImageProxy({
            userPhotoBase64: cleanUserPhoto,
            garmentPreviewBase64: cleanGarmentPreview,
            designCompositeBase64: designCompositeBase64 ? cleanBase64(designCompositeBase64, "Design Composite") : null,
            prompt: finalPrompt,
            pose: pose,
            uploadedGarmentBase64: uploadedGarmentBase64 ? cleanBase64(uploadedGarmentBase64, "Logo") : null,
            glassesPrompt: glassesPrompt,
            styleCategory: styleCategory,
            designLayout: designLayout,
            logoColor: logoColor,
            aspectRatio: "9:16"
        });

        const data = result.data as any;
        if (data && data.imageBase64) {
            let image = data.imageBase64;
            // SECURITY: Ensure the returned image is a valid Data URL
            if (!image.startsWith('data:image')) {
                // Determine format based on first char of base64
                // / -> JPEG, i -> PNG, R -> GIF, U -> WebP
                let format = 'png';
                const firstChar = image.charAt(0);
                if (firstChar === '/') format = 'jpeg';
                else if (firstChar === 'i') format = 'png';
                else if (firstChar === 'R') format = 'gif';
                else if (firstChar === 'U') format = 'webp';
                
                image = `data:image/${format};base64,${image}`;
                console.log(`[Gemini] Auto-prefixed image result as ${format}.`);
            }
            console.log(`[Gemini] AI result received. Length: ${Math.round(image.length / 1024)} KB.`);
            return image;
        } else {
            console.error("Gemini Proxy Error: empty payload.", data);
            throw new Error("L'IA n'a pas renvoyé d'image (Réponse vide).");
        }
    } catch (error: any) {
        console.error("Error calling Gemini Proxy:", error);
        let userMessage = error.message || "Failed to generate image via proxy.";


        // Detect Quota / Resource Exhausted errors
        const isQuotaError =
            error.message?.toLowerCase().includes('resource-exhausted') ||
            error.message?.toLowerCase().includes('quota') ||
            error.message?.toLowerCase().includes('429') ||
            error.code === 'resource-exhausted' ||
            error.code === 'functions/resource-exhausted';

        if (isQuotaError) {
            userMessage = "Le service de génération IA est actuellement saturé (quota atteint). Veuillez réessayer dans quelques instants ou plus tard dans la journée. Merci de votre patience.";
        }

        throw new Error(userMessage);
    }
};

export const generateProductStudio = async (
    productImageBase64: string,
    pose: 'front' | 'back',
    garmentName: string = 'clothing'
): Promise<string> => {
    const cleanBase64 = (str: string) => {
        if (!str) return "";
        let cleaned = str;
        if (str.includes(',')) cleaned = str.split(',')[1];
        return cleaned.replace(/\s/g, '');
    };

    try {
        const functions = getFunctions(app, 'us-central1');
        const generateImageProxy = httpsCallable(functions, 'generateTryOnImageV2');

        const isHeathered = garmentName.toLowerCase().includes('chiné') || garmentName.toLowerCase().includes('heather');

        const basePrompt = `High-end studio product photography in 9:16 portrait aspect ratio. ${garmentName.toUpperCase()} garment. 
        CRITICAL: The output MUST be a strictly STRAIGHT front/back view. NO ROTATION. NO TILT. Perfectly perpendicular to the camera.
        CRITICAL: The texture must match the reference image. ${isHeathered ? 'The fabric is CHINÉ / HEATHERED (mélange texture). You MUST reproduce this specific dual-tone textured look.' : (garmentName.toLowerCase().includes('softshell') ? 'This is a SOFTSHELL technical jacket: matte, semi-rigid, water-repellent texture.' : 'High-quality realistic fabric texture.')}
        COLOR: Maintain the EXACT color of the provided reference image. No variations. 
        GHOST MANNEQUIN style (empty inside/hollow). Perfectly centered. One single garment. Clean white background.`;

        const posePrompt = pose === 'front' 
            ? "VIEW: Front view. Strictly straight, vertical, no rotation. Show the inner neck collar."
            : `VIEW: Back view. GENERATE the back for this exact garment. Maintain the same color, texture, and straight vertical alignment. NO rotation.`;

        const prompt = `${basePrompt} ${posePrompt}`;

        const result = await generateImageProxy({
            userPhotoBase64: cleanBase64(productImageBase64), 
            garmentPreviewBase64: cleanBase64(productImageBase64), 
            prompt: prompt,
            pose: pose,
            uploadedGarmentBase64: null,
            glassesPrompt: "",
            styleCategory: "Studio",
            designLayout: "",
            logoColor: "",
            aspectRatio: "9:16"
        });

        const data = result.data as any;
        if (data && data.imageBase64) {
            let image = data.imageBase64;
            if (!image.startsWith('data:image')) {
                const firstChar = image.charAt(0);
                let format = 'png';
                if (firstChar === '/') format = 'jpeg';
                else if (firstChar === 'i') format = 'png';
                else if (firstChar === 'R') format = 'gif';
                else if (firstChar === 'U') format = 'webp';
                image = `data:image/${format};base64,${image}`;
            }
            return image;
        } else {
            throw new Error("L'IA n'a pas renvoyé d'image (Product Studio).");
        }
    } catch (error: any) {
        console.error("Error in generateProductStudio:", error);
        throw error;
    }
};

export const geminiService = {
    generateTryOnImage,
    generateProductStudio
};