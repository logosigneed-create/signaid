
import fetch from 'node-fetch';

async function listModels() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error("No API key found");
        return;
    }
    const url = `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        console.log("Models (v1):", JSON.stringify(data, null, 2));
    } catch (e) {
        console.error("Error v1:", e);
    }

    const urlBeta = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    try {
        const responseBeta = await fetch(urlBeta);
        const dataBeta = await responseBeta.json();
        console.log("Models (v1beta):", JSON.stringify(dataBeta, null, 2));
    } catch (e) {
        console.error("Error v1beta:", e);
    }
}

listModels();
