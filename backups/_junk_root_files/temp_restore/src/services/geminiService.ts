import { STYLE_MATRIX } from '../constants';

// Dynamic import helper
const getClient = async () => {
    // Shared API Key - retrieval from Vite environment variables
    const SHARED_API_KEY = (import.meta as any).env.VITE_GEMINI_API_KEY;

    // Use @google/genai which is the proven SDK from Hostinger version
    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey: SHARED_API_KEY });
    return ai;
};

export const generateTryOnImage = async (
    userPhotoBase64: string,
    garmentPreviewBase64: string,
    garmentDescription: string,
    prompt: string,
    styleCategory: string,
    pose: 'front' | 'back',
    uploadedGarmentBase64: string | null = null,
    explicitGlassesPrompt: string | null = null
): Promise<string> => {
    const ai: any = await getClient();

    // Clean base64 strings
    const cleanUserPhoto = userPhotoBase64.split(',')[1] || userPhotoBase64;
    const cleanGarmentPreview = garmentPreviewBase64.split(',')[1] || garmentPreviewBase64;

    // VALIDATION: Ensure Garment Preview is valid (Input 2)
    if (!cleanGarmentPreview || cleanGarmentPreview.length < 100) {
        throw new Error("Garment Design Capture Failed. The AI did not receive the design layer.");
    }

    // --- GLASSES LOGIC ---
    let glassesPrompt = "";
    if (explicitGlassesPrompt) {
        glassesPrompt = explicitGlassesPrompt;
    } else {
        let foundStyle = null;
        for (const cat in STYLE_MATRIX) {
            const match = STYLE_MATRIX[cat].find(s => s.name.toLowerCase() === styleCategory.toLowerCase() || s.name.toLowerCase().includes(styleCategory.toLowerCase()));
            if (match) {
                foundStyle = match;
                break;
            }
        }
        if (foundStyle && foundStyle.glasses) {
            glassesPrompt = foundStyle.glasses + " with smoked lenses to hide the eyes";
        } else if (styleCategory === 'Réaliste' || styleCategory === 'Paparazzi') {
            glassesPrompt = "wearing stylish sunglasses with smoked lenses to hide the eyes";
        }
    }

    // Working Prompt Principle from Hostinger - REINFORCED
    let fullPrompt = `
    You are an expert fashion AI and celebrity stylist.
    Task: Generate a high-quality, photorealistic image of the subject.
    
    Input 1: Person (Identity, pose, and body shape must be PRESERVED EXACTLY).
    Input 2: Garment design (This is the reference clothing WITH THE USER'S DESIGN. The logo/text/print from this input must be VISIBLE and SUPERIMPOSED exactly as shown).
    ${uploadedGarmentBase64 ? 'Input 3: Garment Reference (Texture and cut reference).' : ''}
    
    INSTRUCTIONS:
    1.  **ACTION**: Dress the person in Input 1 with the garment design from Input 2.
    2.  **SUPERIMPOSITION**: The logo, branding, text, or print visible in Input 2 MUST be reproduced on the final garment. Do not ignore the print.
    3.  **FIDELITY**: The design elements (logos, text) must be perfectly clear, readable, and placed exactly as in Input 2.
    4.  **IDENTITY**: Keep the face and features of the person from Input 1 unchanged.
    5.  **SETTING**: ${prompt}. ${glassesPrompt ? `The subject is ${glassesPrompt}.` : ''}
    6.  **POSE**: ${pose === 'front' ? 'Subject is facing the camera directly.' : 'Subject is facing away from the camera, showing the back.'}.
    7.  **QUALITY**: Photorealistic, 8k resolution, cinematic lighting, professional fashion photography.
    8.  **OUTPUT**: Return ONLY the generated image. No text.
    `;

    const parts: any[] = [
        { inlineData: { mimeType: 'image/jpeg', data: cleanUserPhoto } },
        { inlineData: { mimeType: 'image/png', data: cleanGarmentPreview } },
        { text: fullPrompt }
    ];

    if (uploadedGarmentBase64) {
        const cleanUploaded = uploadedGarmentBase64.split(',')[1] || uploadedGarmentBase64;
        parts.splice(2, 0, { inlineData: { mimeType: 'image/jpeg', data: cleanUploaded } });
    }

    // --- CASCADE LOGIC (Proven Working Models) ---
    const geminiModels = [
        'gemini-3-pro-image-preview', // Working on Hostinger
        'gemini-2.0-flash',           // Confirmed by diagnostic
        'gemini-flash-latest',        // Confirmed stability
        'gemini-2.0-flash-exp'        // Experimental power
    ];

    let lastError = null;

    for (const modelName of geminiModels) {
        try {
            console.log(`🔄 Attempting with Hostinger logic - Model: ${modelName}...`);

            // Syntax from working backup
            const response = await ai.models.generateContent({
                model: modelName,
                contents: {
                    parts: parts
                },
                // config: {
                //     imageConfig: {
                //         aspectRatio: '9:16'
                //     }
                // }
            });

            if (response.candidates && response.candidates.length > 0) {
                const candidate = response.candidates[0];
                if (candidate.content && candidate.content.parts) {
                    for (const part of candidate.content.parts) {
                        if (part.inlineData && part.inlineData.data) {
                            console.log(`✅ Success with ${modelName}!`);
                            return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
                        }
                    }
                }
            }
            console.warn(`⚠️ ${modelName} returned no image content.`);
        } catch (error: any) {
            console.warn(`❌ Failed with ${modelName} syntax: [${error.status || 'Error'}] ${error.message}`);
            lastError = error;
        }
    }

    throw lastError || new Error("All working models from Hostinger failed in local environment.");
};

export const geminiService = {
    generateTryOnImage
};