import { GoogleGenerativeAI } from "@google/generative-ai";
import fetch from "node-fetch";

// Clé partagée utilisée dans le projet
const API_KEY = "AIzaSyBvd07dBlJNv3MbxXxzcqwAvZkNfxiQRug";

console.log(`🔑 Test de la clé : ${API_KEY.substring(0, 10)}...`);

const genAI = new GoogleGenerativeAI(API_KEY);

async function checkPermissions() {
    try {
        console.log("📡 Interrogation de Google...");

        // Tester avec gemini-1.5-flash-latest qui est souvent le défaut
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        // 1. Test simple de génération de texte
        console.log("1️⃣ Test TEXTE (Gemini Flash)...");
        try {
            const result = await model.generateContent("Hello, are you working?");
            console.log("✅ TEXTE : Succès ! La clé est valide.");
            console.log("   Réponse :", result.response.text());
        } catch (e) {
            console.log("❌ TEXTE : Échec avec ce modèle.", e.message);
        }

        // 2. Demander la liste officielle des modèles disponibles
        console.log("\n2️⃣ Liste des modèles autorisés pour cette clé :");
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`);
        const data = await response.json();

        if (data.models) {
            console.log(`🔍 Trouvé ${data.models.length} modèles.`);

            console.log("\n--- Modèles supportant generateContent (Vision/Texte) ---");
            data.models.forEach(m => {
                if (m.supportedGenerationMethods.includes('generateContent')) {
                    console.log(`   - ${m.name}`);
                }
            });

            console.log("\n--- Modèles de génération d'IMAGES (Imagen) ---");
            const imageModels = data.models.filter(m => m.name.includes('imagen') || m.supportedGenerationMethods.includes('generateImage'));

            if (imageModels.length > 0) {
                console.log("🎉 VICTOIRE ! Ta clé a accès à ces modèles d'images :");
                imageModels.forEach(m => console.log(`   - ${m.name}`));
            } else {
                console.log("⛔ RÉSULTAT NÉGATIF : Aucun modèle de génération d'image trouvé.");
                console.log("   Ta clé ne permet probablement que le TEXTE (Chat) et la VISION (Voir des images).");
                console.log("   Elle ne peut PAS CRÉER d'images avec Imagen.");
            }
        } else {
            console.log("❌ Impossible de lire la liste des modèles.", data);
        }

    } catch (error) {
        console.error("❌ ERREUR CRITIQUE :", error.message);
    }
}

checkPermissions();
