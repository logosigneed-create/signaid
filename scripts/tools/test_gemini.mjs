import fetch from 'node-fetch';

async function testGemini() {
  const apiKey = process.env.VITE_GEMINI_API_KEY;
  if (!apiKey) throw new Error("Clé API Gemini manquante.");

  const queryStr = "https://www.facebook.com/mbmimmo";
  const prompt = `Tu es un expert en marketing d'entreprise. Fais une recherche sur l'entreprise ou le site web suivant : "${queryStr}".
En te basant UNIQUEMENT sur les informations trouvées sur internet concernant cette entreprise, génère une présentation marketing courte et percutante (1 phrase max par champ).
Si tu ne trouves rien de précis sur l'entreprise, déduis les informations les plus logiques en te basant sur le nom ou le domaine.

Formatte ta réponse EXACTEMENT avec ce JSON valide et rien d'autre :
{
  "what": "Ce que vend l'entreprise (ex: Des sites vitrine sur mesure)",
  "who": "Cible principale de l'entreprise (ex: Entrepreneurs, PME et artisans)",
  "difference": "Différence unique / Valeur ajoutée (ex: Design unique, service clé en main)",
  "service": "Bénéfice principal pour le client (ex: Impact maximal pour booster l'activité)"
}`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        contents: [{ parts: [{ text: prompt }] }],
        tools: [{ googleSearch: {} }]
      })
    });
    
    const data = await response.json();
    console.log(JSON.stringify(data, null, 2));
    if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
      const text = data.candidates[0].content.parts[0].text;
      console.log("TEXT:", text);
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        console.log("PARSED:", JSON.parse(jsonMatch[0]));
      }
    }
  } catch (err) {
    console.error("Web search AI error:", err);
  }
}

testGemini();
