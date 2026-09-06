const sharp = require('sharp');
const PDFDocument = require('pdfkit');
const fetch = require('node-fetch');

/**
 * Étape 1 : Reconstruction IA (Prompt Gemini Vision Multimodal)
 */
async function reconstructLogoWithGeminiAI(inputBuffer, apiKey) {
  if (!apiKey) {
    return null;
  }

  const promptText = "Redessine ce logo exactement : supprime tous les effets 3D, biseaux, ombres, lueurs néon et reflets. Produis une version vectorielle/plate parfaite (Flat 2D Vector) sur fond blanc pur (#FFFFFF), en conservant strictement la géométrie, l'inclinaison des lettres et les teintes unies originales. Retourne uniquement l'image du logo.";

  const base64Input = inputBuffer.toString('base64');

  const GEMINI_MODELS = [
    'gemini-3.6-flash',
    'gemini-flash-latest',
    'gemini-3.5-flash',
    'gemini-pro-latest',
    'gemini-3.1-pro-preview'
  ];
  for (const rawModel of GEMINI_MODELS) {
    const cleanModel = String(rawModel || 'gemini-3.6-flash').replace(/^models\//, '').trim();
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:generateContent?key=${apiKey}`;
      console.log(`[DTF AI Request] Calling: ${url.replace(apiKey, 'HIDDEN_KEY')}`);
      const payload = {
        contents: [{
          parts: [
            { text: promptText },
            { inlineData: { mimeType: 'image/png', data: base64Input } }
          ]
        }]
      };

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const json = await res.json();
        if (json.candidates && json.candidates[0]?.content?.parts) {
          for (const part of json.candidates[0].content.parts) {
            if (part.inlineData && part.inlineData.data) {
              console.log(`[DTF AI] Logo reconstruit par ${cleanModel}.`);
              return Buffer.from(part.inlineData.data, 'base64');
            }
          }
        }
      } else {
        const errJson = await res.json().catch(() => ({}));
        console.error(`[DTF AI RAW ERROR] Model: ${cleanModel} - Status: ${res.status}`, JSON.stringify(errJson, null, 2));
        if (res.status === 429) {
          break;
        }
      }
    } catch (err) {
      console.error(`[DTF AI EXCEPTION] Model: ${cleanModel}`, err);
    }
  }

  return null;
}

/**
 * Génère un document PDF d'impression haute définition 300 DPI sans fond
 */
function generateMasterPdfBuffer(pngBuffer, widthPx, heightPx, dpi = 300) {
  return new Promise((resolve, reject) => {
    try {
      const widthPt = (widthPx / dpi) * 72;
      const heightPt = (heightPx / dpi) * 72;

      const doc = new PDFDocument({
        size: [widthPt, heightPt],
        margin: 0,
        info: {
          Title: 'Master DTF Print 300 DPI',
          Author: 'Signaid Prepress Engine',
          Subject: 'Print-Ready Direct-to-Film Master'
        }
      });

      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.image(pngBuffer, 0, 0, {
        width: widthPt,
        height: heightPt
      });

      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}

/**
 * Pipeline Prépresse Textile DTF Master (Anti-Bavure, Lissage Typographique & 300 DPI)
 */
async function processDtfMasterImage(inputBufferOrBase64, options = {}) {
  const {
    targetDimension = 4000,
    dpi = 300,
    apiKey = process.env.GEMINI_API_KEY || ''
  } = options;

  let buffer;
  if (typeof inputBufferOrBase64 === 'string') {
    const trimmed = inputBufferOrBase64.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      const res = await fetch(trimmed);
      if (!res.ok) throw new Error(`Échec de récupération de l'image depuis ${trimmed} (status ${res.status})`);
      const arrayBuf = await res.arrayBuffer();
      buffer = Buffer.from(arrayBuf);
    } else {
      const cleanB64 = trimmed.includes(',') 
        ? trimmed.split(',')[1] 
        : trimmed;
      buffer = Buffer.from(cleanB64.replace(/\s/g, ''), 'base64');
    }
  } else if (Buffer.isBuffer(inputBufferOrBase64)) {
    buffer = inputBufferOrBase64;
  } else {
    throw new Error("Format d'entrée invalide : attendu Buffer, URL ou chaîne Base64.");
  }

  // 1. Essai de reconstruction IA si clé API configurée
  let aiReconstructedBuffer = null;
  try {
    aiReconstructedBuffer = await reconstructLogoWithGeminiAI(buffer, apiKey);
  } catch (aiErr) {
    console.warn("[DTF Pipeline] IA reconstruction fallback to direct prepress:", aiErr.message);
  }

  const workingBuffer = aiReconstructedBuffer || buffer;

  // 2. Nettoyage prépresse & anti-aliasing haute fidélité
  const initialPipeline = sharp(workingBuffer, { failOnError: false }).ensureAlpha();
  const { data: rawData, info } = await initialPipeline.raw().toBuffer({ resolveWithObject: true });
  const rawBytes = Buffer.from(rawData);
  const w = info.width;
  const h = info.height;

  // Analyse des coins
  let cornerWhiteCount = 0;
  let cornerDarkCount = 0;
  const corners = [0, (w - 1) * 4, (h - 1) * w * 4, ((h - 1) * w + (w - 1)) * 4];
  corners.forEach(idx => {
    const r = rawBytes[idx], g = rawBytes[idx + 1], b = rawBytes[idx + 2], a = rawBytes[idx + 3];
    if (a < 40) return;
    if (r > 200 && g > 200 && b > 200) cornerWhiteCount++;
    if (r < 50 && g < 50 && b < 50) cornerDarkCount++;
  });

  const isWhiteBg = cornerWhiteCount >= 2 || aiReconstructedBuffer !== null;
  const isDarkBg = cornerDarkCount >= 2 && !isWhiteBg;

  // Détourage avec anti-aliasing progressif sur les arêtes pour éviter le crénelage
  for (let i = 0; i < rawBytes.length; i += 4) {
    const r = rawBytes[i];
    const g = rawBytes[i + 1];
    const b = rawBytes[i + 2];
    let a = rawBytes[i + 3];

    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    const maxDiff = Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(r - b));

    let isBg = false;
    let edgeAlpha = 255;

    if (isWhiteBg) {
      if (lum > 230 && maxDiff < 30) {
        isBg = true;
      } else if (lum > 200 && maxDiff < 40) {
        // Zone de transition anti-aliasing sur fond clair
        edgeAlpha = Math.round(((230 - lum) / 30) * 255);
      }
    } else if (isDarkBg) {
      if (lum < 35 && r < 45 && g < 45 && b < 45) {
        isBg = true;
      } else if (lum < 60 && r < 70 && g < 70 && b < 70) {
        // Zone de transition anti-aliasing sur fond sombre
        edgeAlpha = Math.round(((lum - 35) / 25) * 255);
      }
    }

    if (isBg || a < 30) {
      rawBytes[i] = 0;
      rawBytes[i + 1] = 0;
      rawBytes[i + 2] = 0;
      rawBytes[i + 3] = 0;
    } else {
      // Renforcer la saturation des couleurs d'origine pour un aplat textile vibrant
      if (r > g && r > b && r > 100) {
        // Rouge franc
        rawBytes[i] = Math.min(255, Math.round(r * 1.15));
        rawBytes[i + 1] = Math.round(g * 0.7);
        rawBytes[i + 2] = Math.round(b * 0.7);
      } else if (g > r && g > b && g > 80) {
        // Vert franc
        rawBytes[i] = Math.round(r * 0.7);
        rawBytes[i + 1] = Math.min(255, Math.round(g * 1.15));
        rawBytes[i + 2] = Math.round(b * 0.7);
      }
      rawBytes[i + 3] = Math.min(a, edgeAlpha);
    }
  }

  // 3. Auto-trim Bounding Box au pixel près
  const trimmed = await sharp(rawBytes, {
    raw: { width: w, height: h, channels: 4 }
  })
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 4 })
    .toBuffer({ resolveWithObject: true });

  const trimmedW = trimmed.info.width;
  const trimmedH = trimmed.info.height;

  // 4. Échantillonnage 4000px avec Lanczos3 et affûtage bilatéral
  const scale = Math.min(targetDimension / trimmedW, targetDimension / trimmedH);
  const targetW = Math.round(trimmedW * scale);
  const targetH = Math.round(trimmedH * scale);

  const masterPng = await sharp(trimmed.data, {
    raw: { width: trimmedW, height: trimmedH, channels: 4 }
  })
    .resize(targetW, targetH, {
      fit: 'fill',
      kernel: sharp.kernel.lanczos3,
      withoutEnlargement: false
    })
    .sharpen({ sigma: 0.8, m1: 0.5, m2: 1.5 })
    .withMetadata({ density: dpi })
    .png({ compressionLevel: 6, adaptiveFiltering: true, force: true })
    .toBuffer();

  const finalMeta = await sharp(masterPng).metadata();

  // 5. Génération du PDF Master Print
  const masterPdf = await generateMasterPdfBuffer(masterPng, finalMeta.width, finalMeta.height, dpi);

  return {
    pngBuffer: masterPng,
    pdfBuffer: masterPdf,
    pngBase64: `data:image/png;base64,${masterPng.toString('base64')}`,
    pdfBase64: `data:application/pdf;base64,${masterPdf.toString('base64')}`,
    width: finalMeta.width,
    height: finalMeta.height,
    dpi: dpi,
    sizePngBytes: masterPng.length,
    sizePdfBytes: masterPdf.length
  };
}

module.exports = {
  processDtfMasterImage,
  reconstructLogoWithGeminiAI,
  generateMasterPdfBuffer
};
