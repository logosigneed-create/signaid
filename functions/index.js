// Mise à jour forcée - Mars 2026 - Version Stable Intégrale
const cors = require('cors')({ origin: true });
const crypto = require('crypto');
const functions = require('firebase-functions');
const { defineSecret } = require('firebase-functions/params');
const { onRequest } = require('firebase-functions/v2/https');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const admin = require('firebase-admin');
admin.initializeApp();

// Configuration des secrets
const geminiApiKey = defineSecret('GEMINI_API_KEY');
const removeBgApiKey = defineSecret('REMOVE_BG_API_KEY');
const smtpPass = defineSecret('SMTP_PASS');
const stripeSecretKey = defineSecret('STRIPE_SECRET_KEY');
const stripeWebhookSecret = defineSecret('STRIPE_WEBHOOK_SECRET');
const fbAccessToken = defineSecret('FB_ACCESS_TOKEN');
const fbPixelId = defineSecret('FB_PIXEL_ID');


const getTransporter = () => {
  const nodemailer = require('nodemailer');
  let pass = process.env.SMTP_PASS || '';
  try {
    if (smtpPass && typeof smtpPass.value === 'function' && smtpPass.value()) {
      pass = smtpPass.value();
    }
  } catch (e) {
    console.warn('[SMTP Auth] Secret smtpPass fallback');
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'logosigneed@gmail.com',
      pass: pass
    }
  });
};

exports.sendQuoteEmail = onRequest({ cors: true, invoker: 'public' }, async (req, res) => {
  cors(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).send('Méthode non autorisée');
    }

    try {
      const cartItems = req.body.cartItems || [];
      const email = req.body.email;
      const name = req.body.name || 'Client';
      const phone = req.body.phone || 'Non renseigné';
      const address = req.body.address || '';
      const city = req.body.city || '';
      const zip = req.body.zip || '';
      const message = req.body.message || '';
      const total = req.body.total || '0';
      const logoAttachments = req.body.logoAttachments || [];
      const quoteId = req.body.quoteId;

      if (!email) {
        throw new Error('L\'adresse email est manquante.');
      }

      const getEmailTemplate = (isClient, content) => `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f3f4f6; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
            .header { background-color: #111827; color: #ffffff; padding: 30px 20px; text-align: center; }
            .header h1 { margin: 0; font-size: 24px; font-weight: 900; letter-spacing: 1px; }
            .content { padding: 30px 20px; color: #374151; line-height: 1.6; }
            .section { margin-bottom: 25px; border-bottom: 1px solid #e5e7eb; padding-bottom: 20px; }
            .section:last-child { border-bottom: none; }
            .label { font-size: 12px; text-transform: uppercase; color: #6b7280; font-weight: 700; margin-bottom: 4px; display: block; }
            .value { font-size: 16px; font-weight: 500; color: #111827; margin: 0; }
            .item { display: flex; gap: 15px; margin-bottom: 15px; background: #f9fafb; padding: 10px; border-radius: 8px; }
            .item-img { width: 80px; height: 80px; object-fit: contain; background: #fff; border: 1px solid #e5e7eb; border-radius: 6px; }
            .item-details { flex: 1; }
            .btn { display: inline-block; background-color: #f97316; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 20px; }
            .footer { background-color: #f3f4f6; color: #6b7280; padding: 20px; text-align: center; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>SIGNAID</h1>
              <p style="margin: 5px 0 0; font-weight: 300; font-size: 14px;">AI FASHION STUDIO</p>
            </div>
            <div class="content">
              ${content}
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Signaid. Tous droits réservés.</p>
              <p>Ceci est un email automatique, merci de ne pas répondre directement si ce n'est pas nécessaire.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const itemsHtml = cartItems.map(item => `
        <div class="item" style="display: flex; gap: 15px; margin-bottom: 20px; background: #ffffff; padding: 15px; border-radius: 12px; border: 1px solid #e5e7eb;">
           <div style="display: flex; gap: 10px;">
              <div style="text-align: center;">
                <img src="${item.previewImageUrl}" class="item-img" style="width: 100px; height: 100px; object-fit: contain; background: #f9fafb; border: 1px solid #f3f4f6; border-radius: 8px;" alt="Face"/>
                <div style="font-size: 10px; color: #9ca3af; margin-top: 4px; font-weight: bold; text-transform: uppercase;">Face</div>
              </div>
              ${item.previewImageUrlBack ? `
              <div style="text-align: center;">
                <img src="${item.previewImageUrlBack}" class="item-img" style="width: 100px; height: 100px; object-fit: contain; background: #f9fafb; border: 1px solid #f3f4f6; border-radius: 8px;" alt="Dos"/>
                <div style="font-size: 10px; color: #9ca3af; margin-top: 4px; font-weight: bold; text-transform: uppercase;">Dos</div>
              </div>` : ''}
           </div>
           <div class="item-details" style="flex: 1; padding-left: 10px; border-left: 2px solid #f3f4f6;">
             <div style="font-weight: 800; color: #111827; font-size: 16px; margin-bottom: 4px;">${item.name || 'Article Personnalisé'}</div>
             <div style="font-size: 13px; color: #4b5563; margin-bottom: 2px;">
                <span style="font-weight: 600; color: #6b7280;">Taille(s):</span> ${item.size || 'Unique'}
             </div>
             <div style="font-size: 13px; color: #4b5563; margin-bottom: 2px;">
                <span style="font-weight: 600; color: #6b7280;">Quantité:</span> <span style="display: inline-block; background: #fef3c7; color: #92400e; padding: 1px 6px; border-radius: 4px; font-weight: 700;">${item.quantity || 1}</span>
             </div>

             ${item.isModernizationService && item.activityName ? `
               <div style="margin-top: 15px; padding: 12px; background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px;">
                   <div style="color: #166534; font-weight: bold; font-size: 13px; text-transform: uppercase; margin-bottom: 5px; display: flex; align-items: center; gap: 6px;">
                       <span style="font-size: 14px;">🖌️</span> Option : Refonte de Logo
                   </div>
                   <div style="font-size: 13px; color: #15803d;">
                       <strong style="color: #14532d;">Activité :</strong> ${item.activityName}<br/>
                       <strong style="color: #14532d;">Description :</strong> ${item.description || 'Non renseignée'}<br/>
                       ${item.catalogReferences ? `<strong style="color: #14532d;">Références Catalogue :</strong> ${item.catalogReferences}` : ''}
                       ${item.referenceLogoCid ? `<div style="margin-top:10px; border-top:1px dashed #bbf7d0; padding-top:8px;"><strong style="color: #14532d;">Fichier joint :</strong><br/><img src="${item.referenceLogoCid}" style="width:100px; height:100px; object-fit:contain; background:white; border:1px solid #bbf7d0; border-radius:4px; margin-top:4px;" /></div>` : ''}
                   </div>
               </div>
             ` : ''}
             </div>
           </div>
        </div>
      `).join('');

      const adminContent = `
        <h2 style="color: #f97316; margin-top: 0;">Nouvelle Demande de Devis</h2>
        
        <div class="section">
          <span class="label">Client</span>
          <p class="value">${name}</p>
          <p style="margin: 2px 0;"><a href="mailto:${email}" style="color: #f97316; text-decoration: none;">${email}</a></p>
          <p style="margin: 2px 0;">${phone}</p>
          <p style="margin: 2px 0;">${address} ${zip} ${city}</p>
        </div>

        ${message ? `
        <div class="section">
           <span class="label">Message du client</span>
           <p style="background: #fff7ed; padding: 10px; border-radius: 6px; border: 1px solid #ffedd5; color: #9a3412;">${message}</p>
        </div>` : ''}

        <div class="section">
           <span class="label">Commande</span>
           <div style="margin-top: 10px;">
             ${itemsHtml}
           </div>
        </div>

        <div style="text-align: right; font-size: 18px; font-weight: bold; margin-top: 10px;">
           Total Estimé: <span style="color: #f97316;">${total} &euro;</span>
        </div>

        ${quoteId ? `
        <div style="text-align: center; margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
            <a href="https://signaid-d2d08.web.app/?view=admin&quoteId=${quoteId}" style="background-color: #111827; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
               <span style="font-size: 18px; vertical-align: middle; margin-right: 5px;">⚙️</span> Gérer dans l'Admin
            </a>
            <p style="font-size: 11px; color: #9ca3af; margin-top: 8px;">Lien réservé aux administrateurs connectés.</p>
        </div>
        ` : ''}
      `;

      const adminMailOptions = {
        from: '"Signaid Robot" <contact@signeedclub.com>',
        to: 'logosigneed@gmail.com',
        replyTo: email,
        subject: `[Devis] Nouvelle demande de ${name}`,
        html: getEmailTemplate(false, adminContent),
        attachments: logoAttachments
      };

      const clientContent = `
        <h2 style="color: #111; margin-top: 0;">Bonjour ${name},</h2>
        <p>Nous avons bien reçu votre demande de devis sur <strong>Signaid</strong>.</p>
        <p>Voici le récapitulatif de votre projet :</p>

        <div class="section" style="margin-top: 20px;">
           ${itemsHtml}
        </div>

        <div class="section" style="text-align: right;">
           <span class="label">Estimation</span>
           <p class="value" style="color: #f97316; font-size: 20px;">${total} &euro;</p>
        </div>

        <div class="section">
           <p><strong>Prochaine étape :</strong></p>
           <p>Notre équipe va analyser votre demande (faisabilité, stocks) et reviendra vers vous sous 24h ouvrées pour valider la production.</p>
           <a href="https://signaid-d2d08.web.app/" class="btn">Retourner au Studio</a>
        </div>
      `;

      const clientMailOptions = {
        from: '"L\'équipe Signaid" <contact@signeedclub.com>',
        to: email,
        replyTo: 'contact@signeedclub.com',
        subject: 'Votre demande de devis Signaid',
        html: getEmailTemplate(true, clientContent),
        attachments: logoAttachments
      };

      const FB_ACCESS_TOKEN = fbAccessToken.value() || '';
      const FB_PIXEL_ID = fbPixelId.value() || '';

      const trackFacebookEvent = async () => {
        const axios = require('axios');
        if (FB_PIXEL_ID === 'REMPLACER_PAR_VOTRE_PIXEL_ID') {
          console.warn("Facebook Pixel ID non configuré. Tracking ignoré.");
          return;
        }

        const eventData = {
          data: [
            {
              event_name: "Purchase",
              event_time: Math.floor(Date.now() / 1000),
              action_source: "website",
              user_data: {
                em: [crypto.createHash('sha256').update(email.toLowerCase()).digest('hex')],
                ph: [phone !== 'Non renseigné' ? crypto.createHash('sha256').update(phone.replace(/[^0-9]/g, '')).digest('hex') : null]
              },
              custom_data: {
                currency: "EUR",
                value: total.toString()
              }
            }
          ]
        };

        try {
          await axios.post(`https://graph.facebook.com/v19.0/${FB_PIXEL_ID}/events?access_token=${FB_ACCESS_TOKEN}`, eventData);
          console.log("Facebook Event sent successfully");
        } catch (error) {
          console.error("Error sending Facebook Event:", error.response ? error.response.data : error.message);
        }
      };

      const transporter = getTransporter();
      await transporter.sendMail(adminMailOptions);
      transporter.sendMail(clientMailOptions, (error, info) => {
        if (error) {
          console.error('Erreur email client:', error);
          res.status(500).send(error.toString());
        } else {
          trackFacebookEvent();
          res.status(200).json({ success: true, message: 'Email envoyé avec succès' });
        }
      });

    } catch (error) {
      console.error('Erreur générale:', error);
      res.status(500).send(error.toString());
    }
  });
});



exports.getCurrentBatchSession = onRequest({ cors: true }, async (req, res) => {
  try {
    const db = admin.firestore();
    const now = admin.firestore.Timestamp.now();
    const snapshot = await db.collection('batchSessions')
      .where('status', '==', 'OPEN')
      .where('endDate', '>', now)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return res.status(404).json({ message: 'Aucune session active' });
    }

    const doc = snapshot.docs[0];
    const session = doc.data();
    session.id = doc.id;

    const currentQty = session.currentTotalQuantity || 0;
    let currentTier = session.tiers && session.tiers.length > 0 ? session.tiers[0] : { price: 0, minQty: 0 };
    let nextTier = null;

    if (session.tiers) {
      for (let i = 0; i < session.tiers.length; i++) {
        if (currentQty >= session.tiers[i].minQty) {
          currentTier = session.tiers[i];
          nextTier = session.tiers[i + 1] || null;
        }
      }
    }

    const timeLeftMs = (session.endDate && typeof session.endDate.toMillis === 'function')
      ? session.endDate.toMillis() - now.toMillis()
      : 0;

    return res.status(200).json({
      session, currentQty, currentPrice: currentTier.price,
      nextTier: nextTier ? { qtyNeeded: nextTier.minQty - currentQty, price: nextTier.price } : null,
      timeLeftMs
    });
  } catch (error) {
    return res.status(500).send(error.toString());
  }
});

exports.onNewOrder = onDocumentCreated('orders/{orderId}', async (event) => {
  const order = event.data.data();
  if (order && order.batchSessionId) {
    const batchRef = admin.firestore().collection('batchSessions').doc(order.batchSessionId);
    try {
      await admin.firestore().runTransaction(async (transaction) => {
        const batchDoc = await transaction.get(batchRef);
        if (!batchDoc.exists) return;
        const newQty = (batchDoc.data().currentTotalQuantity || 0) + (order.totalQuantity || 1);
        transaction.update(batchRef, { currentTotalQuantity: newQty });
      });
    } catch (e) {
      console.error('Transaction failed:', e);
    }
  }
});

// --- GEMINI V2 STABLE (Appel Direct API V1) ---
exports.generateTryOnImageV2 = onCall({ cors: true, invoker: 'public', secrets: [geminiApiKey] }, async (request) => {
  const data = request.data;
  let apiKey = process.env.GEMINI_API_KEY || '';
  try {
    if (geminiApiKey && typeof geminiApiKey.value === 'function' && geminiApiKey.value()) {
      apiKey = geminiApiKey.value() || apiKey;
    }
  } catch (e) {}
  if (!apiKey) throw new HttpsError('failed-precondition', 'API Key Gemini non configurée dans l\'environnement.');

  try {
    const { userPhotoBase64, garmentPreviewBase64, designCompositeBase64, prompt, pose, uploadedGarmentBase64, glassesPrompt } = data;
    const cleanB64 = (s) => (s && s.includes(',')) ? s.split(',')[1].replace(/\s/g, '') : (s || "").replace(/\s/g, '');

    const fetch = require('node-fetch');
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`;
    const bodyIA = {
      contents: [{
        parts: [
          { text: `Task: Dress person from Input 1 in garment from Input 2. Fidelity: 100%. Identity: Preserve Input 1 features.
Instruction: You must accurately replicate the design elements (logos and texts) shown in Input 2. 
${designCompositeBase64 ? "Input 3 is a clear view of the design composite that must be reproduced on the garment." : ""}
Setting: ${prompt}. Glasses: ${glassesPrompt}. Pose: ${pose}. Ratio: 9:16.` },
          { inlineData: { mimeType: 'image/jpeg', data: cleanB64(userPhotoBase64) } },
          { inlineData: { mimeType: 'image/webp', data: cleanB64(garmentPreviewBase64) } }
        ]
      }]
    };

    if (designCompositeBase64) {
      bodyIA.contents[0].parts.push({ inlineData: { mimeType: 'image/webp', data: cleanB64(designCompositeBase64) } });
    }

    if (uploadedGarmentBase64) {
      bodyIA.contents[0].parts.push({ inlineData: { mimeType: 'image/png', data: cleanB64(uploadedGarmentBase64) } });
    }

    const responseIA = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyIA)
    });

    const resJSON = await responseIA.json();
    console.log('Gemini API Response Status:', responseIA.status);
    if (!responseIA.ok) {
      console.error('Gemini API Error details:', JSON.stringify(resJSON));
      throw new Error(resJSON.error ? resJSON.error.message : `Gemini Error ${responseIA.status}`);
    }

    if (resJSON.candidates && resJSON.candidates[0]?.content?.parts) {
      const part = resJSON.candidates[0].content.parts.find(p => p.inlineData);
      if (part) return { imageBase64: `data:image/png;base64,${part.inlineData.data}` };
    }
    
    console.warn('Gemini response format unexpected:', JSON.stringify(resJSON));
    throw new Error("Réponse Gemini vide ou format inattendu.");
  } catch (error) {
    console.error('Function execution failed:', error);
    throw new HttpsError('internal', error.message);
  }
});

exports.removeBgProxy = onCall({ cors: true, invoker: 'public' }, async (request) => {
  let apiKey = process.env.REMOVE_BG_API_KEY;
  try {
    if (removeBgApiKey && typeof removeBgApiKey.value === 'function' && removeBgApiKey.value()) {
      apiKey = removeBgApiKey.value();
    }
  } catch (e) {}
  const { imageBase64 } = request.data;
  const axios = require('axios');
  try {
    const response = await axios.post('https://api.remove.bg/v1.0/removebg',
      { image_file_b64: imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64, size: 'auto' },
      { headers: { 'X-Api-Key': apiKey }, responseType: 'arraybuffer' }
    );
    return { imageBase64: `data:image/png;base64,${Buffer.from(response.data, 'binary').toString('base64')}` };
  } catch (error) {
    throw new HttpsError('internal', error.message);
  }
});

// --- DYNAMIC SEO FUNCTION FOR SOCIAL MEDIA BOTS ---
const fs = require('fs');
const path = require('path');
const express = require('express');

const seoApp = express();

const botUserAgents = [
  "facebookexternalhit",
  "twitterbot",
  "slackbot",
  "linkedinbot",
  "whatsapp",
  "telegrambot",
  "discordbot",
  "pinterest",
  "skypeuripreview"
];

const isBot = (userAgent) => {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  return botUserAgents.some((bot) => ua.includes(bot));
};

seoApp.use(async (req, res) => {
  if (req.path.startsWith('/assets/')) {
    return res.status(404).send('Asset not found');
  }

  const indexPath = path.resolve(__dirname, "./index.html");
  let html = "";
  
  try {
    html = fs.readFileSync(indexPath, "utf8");
  } catch (err) {
    console.error("Impossible de lire index.html", err);
    return res.status(500).send("Erreur serveur");
  }

  const userAgent = req.headers["user-agent"];
  const uid = req.query.uid;

  if (!isBot(userAgent) || !uid) {
    res.set("Cache-Control", "no-cache, no-store, must-revalidate, max-age=0");
    return res.status(200).send(html);
  }

  try {
    const siteConfigDoc = await admin.firestore().collection("SiteConfigs").doc(uid).get();
    
    if (siteConfigDoc.exists) {
      const data = siteConfigDoc.data();
      
      const artistName = data.companyName || "Artiste Signaid";
      const mainVisual = data.logoUrl || data.livePhotoUrl || "https://signaid.eu/default-og.jpg";
      const description = data.rawPitch?.what || "Découvrez le merchandising officiel sur Signaid.";
      
      const title = `${artistName} - Boutique & Infrastructure Officielle`;

      html = html.replace(/<title>.*<\/title>/i, `<title>${title}</title>`);
      html = html.replace(/<meta property="og:.*?".*?>/gi, "");
      html = html.replace(/<meta name="twitter:.*?".*?>/gi, "");

      const ogTags = `
        <meta property="og:title" content="${title}" />
        <meta property="og:description" content="${description}" />
        <meta property="og:image" content="${mainVisual}" />
        <meta property="og:url" content="https://signaid.eu${req.originalUrl}" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="${title}" />
        <meta name="twitter:description" content="${description}" />
        <meta name="twitter:image" content="${mainVisual}" />
      `;

      html = html.replace("</head>", `${ogTags}</head>`);
    }

    res.set("Cache-Control", "public, max-age=300, s-maxage=3600");
    return res.status(200).send(html);
    
  } catch (error) {
    console.error("Erreur lors de la récupération Firestore pour OG tags", error);
    return res.status(200).send(html);
  }
});

exports.renderSEO = onRequest({ cors: true }, seoApp);

// Helper pour extraire la meilleure URL d'image vêtement (privilégie les visuels générés ai/imageFront/imageStudio)
function extractBestImageUrl(item, preferredView) {
  if (!item) return '';
  if (typeof item === 'string') return item.trim();

  let candidates = [];
  if (preferredView === 'back') {
    candidates = [item.imageBack, item.mechanical, item.imageStudio, item.ai, item.imageUrl];
  } else if (preferredView === 'front') {
    candidates = [item.imageFront, item.ai, item.imageStudio, item.imageUrl];
  } else {
    candidates = [item.imageFront, item.ai, item.imageStudio, item.imageUrl, item.imageBack, item.mechanical];
  }

  if (item.items && Array.isArray(item.items)) {
    const sub = (preferredView && item.items.find(i => i.view === preferredView)) || item.items[0];
    if (sub) {
      candidates.unshift(sub.imageFront, sub.ai, sub.imageStudio, sub.imageUrl, sub.imageBack, sub.mechanical);
    }
  }

  for (const c of candidates) {
    if (typeof c === 'string' && c.trim() !== '' && c.trim() !== '""') {
      return c.trim();
    }
  }

  if (typeof item.url === 'string' && item.url.trim() !== '' && item.url.trim() !== '""') {
    return item.url.trim();
  }

  return '';
}

// ==========================================
// 1. ROUTE SLUG : GET /api/user-by-slug/:slug
// ==========================================
exports.getUserBySlug = onRequest({ cors: true, invoker: 'public', minInstances: 1 }, async (req, res) => {
  cors(req, res, async () => {
    try {
      let rawSlug = req.query.slug || req.params.slug || req.params[0] || req.path || '';
      let slug = String(rawSlug).split('?')[0].split('/').filter(Boolean).pop() || '';
      if (slug === 'user-by-slug' || slug === 'api') slug = '';

      if (!slug) {
        return res.status(400).json({ error: 'Slug manquant' });
      }

      const db = admin.firestore();

      // 1. Chercher dans SiteConfigs par slug ou par domaine personnalisé
      let snapshot = await db.collection('SiteConfigs').where('slug', '==', slug).limit(1).get();
      if (snapshot.empty) {
        snapshot = await db.collection('SiteConfigs').where('customDomain', '==', slug).limit(1).get();
      }
      if (snapshot.empty) {
        snapshot = await db.collection('SiteConfigs').where('domain', '==', slug).limit(1).get();
      }
      if (snapshot.empty) {
        snapshot = await db.collection('SiteConfigs').where('customDomains', 'array-contains', slug).limit(1).get();
      }
      
      // 2. Fallback direct par doc ID (UID) dans SiteConfigs
      if (snapshot.empty) {
        const docById = await db.collection('SiteConfigs').doc(slug).get();
        if (docById.exists) {
          snapshot = { empty: false, docs: [docById] };
        }
      }

      // 3. Fallback dans users par slug
      if (snapshot.empty) {
        snapshot = await db.collection('users').where('slug', '==', slug).limit(1).get();
      }

      // 5. Fallback spécifique pour fabrizio / djdfazz.be -> guest_ms3ijgnco2xnid
      if (snapshot.empty && (slug === 'fabrizio' || slug === 'guest_ms3ijgnco2xnid' || slug.includes('djdfazz'))) {
        const fabrizioDoc = await db.collection('SiteConfigs').doc('guest_ms3ijgnco2xnid').get();
        if (fabrizioDoc.exists) {
          snapshot = { empty: false, docs: [fabrizioDoc] };
        }
      }

      if (snapshot.empty) {
        return res.status(404).json({ error: 'Utilisateur / DJ non trouvé pour ce slug', slug });
      }

      const userDoc = snapshot.docs[0];
      const userData = userDoc.data();
      userData.id = userDoc.id;

      // Récupérer les produits et vêtements réels associés au DJ / Artiste
      let productsList = [];

      // Si la requête concerne Fabrizio / guest_ms3ijgnco2xnid, charger directement l'audit studio shop audit-8f198p5
      if (slug === 'fabrizio' || userDoc.id === 'guest_ms3ijgnco2xnid' || slug.includes('djdfazz')) {
        let auditDoc = await db.collection('anonymous_previews').doc('audit-8f198p5').get();
        let aData = auditDoc.exists ? auditDoc.data() : null;

        if (!aData) {
          const projSnap = await db.collection('btp_projects').where('previewId', '==', 'audit-8f198p5').get();
          if (!projSnap.empty) {
            aData = projSnap.docs[0].data();
          }
        }

        if (aData) {
          if (aData.logoUrl || aData.logoAdaptedUrl) {
            userData.logoUrl = aData.logoUrl || aData.logoAdaptedUrl;
            userData.auditLogoUrl = aData.logoUrl || aData.logoAdaptedUrl;
          }
          const auditItems = aData.items || aData.mockups || [];
          if (auditItems.length > 0) {
            productsList = [...auditItems];
          }
        }
      }

      if (productsList.length === 0) {
        // 1. Mockups directs dans le document SiteConfigs (userData.mockups ou userData.items)
        if (userData.mockups && Array.isArray(userData.mockups) && userData.mockups.length > 0) {
          productsList.push(...userData.mockups);
        }
        if (userData.items && Array.isArray(userData.items) && userData.items.length > 0) {
          productsList.push(...userData.items);
        }
      }

      // 2. Chercher également dans btp_projects et anonymous_previews
      const keysToTry = [...new Set([userDoc.id, userData.actuationKey, userData.generatedKey, 'audit-8f198p5'])].filter(Boolean);
      for (const k of keysToTry) {
        let projSnap = await db.collection('btp_projects').where('projectId', '==', k).get();
        if (projSnap.empty) {
          projSnap = await db.collection('btp_projects').where('previewId', '==', k).get();
        }
        if (!projSnap.empty) {
          const pData = projSnap.docs[0].data();
          if (pData.logoUrl || pData.logoAdaptedUrl) {
            userData.auditLogoUrl = pData.logoUrl || pData.logoAdaptedUrl;
          }
          const foundItems = pData.mockups || pData.items || [];
          if (foundItems.length > 0) {
            productsList.unshift(...foundItems);
          }
        }
        const prevDoc = await db.collection('anonymous_previews').doc(k).get();
        if (prevDoc.exists) {
          const pData = prevDoc.data();
          if (pData.logoUrl || pData.logoAdaptedUrl) {
            userData.auditLogoUrl = pData.logoUrl || pData.logoAdaptedUrl;
          }
          const pItems = pData.items || pData.mockups || [];
          if (pItems.length > 0) {
            productsList.unshift(...pItems);
          }
        }
      }

      // 3. Fallback collection `products`
      const productsSnap = await db.collection('products')
        .where('userId', '==', userDoc.id)
        .get();
      
      const dbProducts = productsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      productsList.push(...dbProducts);

      // 4. Fallback catalogue vêtements par défaut (T-Shirt, Hoodie, Polo, Sweat) si aucun mockup spécifique n'a été créé
      if (productsList.length === 0) {
        const company = userData.companyName || userData.username || 'Artiste';
        const logo = extractBestImageUrl({ imageUrl: userData.auditLogoUrl || userData.logoUrl, url: userData.avatarUrl }) || '/logo.png';

        productsList.push(
          {
            id: 'item-tshirt',
            title: `T-Shirt Premium ${company}`,
            price: 29.90,
            imageUrl: logo,
            garment: 'tshirt',
            sizes: ['S', 'M', 'L', 'XL'],
            colors: ['Noir', 'Blanc']
          },
          {
            id: 'item-hoodie',
            title: `Hoodie Officiel ${company}`,
            price: 49.90,
            imageUrl: logo,
            garment: 'hoodie',
            sizes: ['S', 'M', 'L', 'XL'],
            colors: ['Noir']
          },
          {
            id: 'item-polo',
            title: `Polo Piqué ${company}`,
            price: 39.90,
            imageUrl: logo,
            garment: 'polo',
            sizes: ['S', 'M', 'L', 'XL'],
            colors: ['Noir', 'Blanc']
          },
          {
            id: 'item-sweat',
            title: `Sweatshirt Crewneck ${company}`,
            price: 44.90,
            imageUrl: logo,
            garment: 'sweat',
            sizes: ['S', 'M', 'L', 'XL'],
            colors: ['Noir', 'Gris']
          }
        );
      }

      // 1. Filtrer les cartes de visite (business_card)
      const filteredItems = productsList.filter(item => {
        const garment = String(item.garment || item.category || '').toLowerCase();
        const title = String(item.title || item.name || '').toLowerCase();
        return garment !== 'business_card' && !title.includes('carte de visite') && !title.includes('visite');
      });

      // 2. Regrouper les vues Face et Dos par type de vêtement
      const groupedMap = {};

      filteredItems.forEach((item, index) => {
        const garmentKey = (item.garment || item.category || `item-${index}`).toLowerCase();
        
        const frontCandidate = extractBestImageUrl(item, 'front');
        const backCandidate = extractBestImageUrl(item, 'back');

        if (!groupedMap[garmentKey]) {
          const title = item.title || item.name || item.info?.title || `Produit Merch ${garmentKey.toUpperCase()}`;
          const defaultPriceMap = {
            tshirt: 29.90,
            polo: 39.90,
            sweat: 44.90,
            sweatshirt: 44.90,
            hoodie: 49.90
          };
          const stdPrice = defaultPriceMap[garmentKey] || 29.90;
          const priceRaw = item.price || item.info?.price;
          const price = typeof priceRaw === 'number' ? priceRaw : (parseFloat(String(priceRaw || '').replace(/[^\d.]/g, '')) || stdPrice);

          let initialFront = frontCandidate;
          if (initialFront && initialFront.includes('logo_')) {
            initialFront = '';
          }
          let initialBack = backCandidate;
          if (initialBack && initialBack.includes('logo_')) {
            initialBack = '';
          }

          groupedMap[garmentKey] = {
            id: String(item.id || `garment-${garmentKey}`),
            name: String(title),
            price: price,
            garment: garmentKey,
            frontImageUrl: initialFront,
            backImageUrl: initialBack,
            sizes: Array.isArray(item.sizes) ? item.sizes : ['S', 'M', 'L', 'XL'],
            colors: Array.isArray(item.colors) ? item.colors : ['Noir', 'Blanc']
          };
        } else {
          if (frontCandidate && (!groupedMap[garmentKey].frontImageUrl || frontCandidate.startsWith('data:') || frontCandidate.includes('btp_mockups') || groupedMap[garmentKey].frontImageUrl.includes('logo_'))) {
            groupedMap[garmentKey].frontImageUrl = frontCandidate;
          }
          if (backCandidate && (!groupedMap[garmentKey].backImageUrl || backCandidate.startsWith('data:') || backCandidate.includes('btp_mockups') || groupedMap[garmentKey].backImageUrl.includes('logo_'))) {
            groupedMap[garmentKey].backImageUrl = backCandidate;
          }
        }
      });

      let lastStorageError = null;
      const uploadBase64ToStorage = async (base64Str, assetPath) => {
        if (!base64Str || typeof base64Str !== 'string' || !base64Str.startsWith('data:')) {
          return base64Str || '';
        }
        try {
          const commaIdx = base64Str.indexOf(',');
          if (commaIdx === -1) return base64Str;

          const header = base64Str.substring(0, commaIdx);
          const base64Data = base64Str.substring(commaIdx + 1);

          const mimeMatch = header.match(/data:(.*?);/);
          const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
          const buffer = Buffer.from(base64Data.trim(), 'base64');

          const bucket = admin.storage().bucket('signaid-prod-assets');
          const file = bucket.file(assetPath);
          const token = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);

          await file.save(buffer, {
            metadata: {
              contentType: mimeType,
              metadata: { firebaseStorageDownloadTokens: token }
            },
            resumable: false
          });

          const encodedPath = encodeURIComponent(assetPath);
          return `https://firebasestorage.googleapis.com/v0/b/signaid-prod-assets/o/${encodedPath}?alt=media&token=${token}`;
        } catch (err) {
          console.error('[Storage Upload Error]', err);
          lastStorageError = String(err.message || err);
          return base64Str;
        }
      };

      let needsFirestoreUpdate = false;

      let cleanLogoUrl = extractBestImageUrl({ imageUrl: userData.auditLogoUrl || userData.logoUrl, url: userData.avatarUrl }) || '';
      if (cleanLogoUrl.startsWith('data:image/')) {
        cleanLogoUrl = await uploadBase64ToStorage(cleanLogoUrl, `btp_mockups/${userDoc.id}/web/logo_${Date.now()}.png`);
        needsFirestoreUpdate = true;
      }

      let cleanLivePhotoUrl = extractBestImageUrl({ imageUrl: userData.livePhotoUrl }) || '';
      if (cleanLivePhotoUrl.startsWith('data:image/')) {
        cleanLivePhotoUrl = await uploadBase64ToStorage(cleanLivePhotoUrl, `btp_mockups/${userDoc.id}/web/live_${Date.now()}.png`);
        needsFirestoreUpdate = true;
      }

      const fallbackLogo = cleanLogoUrl || 'https://signaid-prod.web.app/logo.png';

      const defaultGarmentImages = {
        tshirt: 'https://signaid-prod.web.app/assets/tshirt-black-JHK170.png',
        polo: 'https://signaid-prod.web.app/assets/polo-black-JHK510.png',
        sweat: 'https://signaid-prod.web.app/assets/hoodie-black-JHK421.png',
        hoodie: 'https://signaid-prod.web.app/assets/hoodie-black-JHK421.png',
        sweatshirt: 'https://signaid-prod.web.app/assets/hoodie-black-JHK421.png'
      };

      const normalizedProducts = await Promise.all(Object.values(groupedMap).map(async (p, idx) => {
        let fImg = p.frontImageUrl || p.imageUrl || '';
        let bImg = p.backImageUrl || '';

        // Si l'image de face est totalement absente ou pointe vers le logo brut, utiliser l'image de vêtement appropriée
        if (!fImg || fImg === cleanLogoUrl || fImg.includes('logo_')) {
          const garmentKey = String(p.garment || p.category || p.id || '').toLowerCase();
          if (garmentKey.includes('polo') || p.id === 'pFront') {
            fImg = defaultGarmentImages.polo;
          } else if (garmentKey.includes('hoodie') || garmentKey.includes('sweat') || p.id === 'hFront') {
            fImg = defaultGarmentImages.hoodie;
          } else {
            fImg = defaultGarmentImages.tshirt;
          }
        }

        if (bImg === cleanLogoUrl || bImg.includes('logo_')) {
          bImg = '';
        }

        if (fImg.startsWith('data:')) {
          fImg = await uploadBase64ToStorage(fImg, `btp_mockups/${userDoc.id}/web/${p.id}_front_${Date.now()}_${idx}.png`);
          needsFirestoreUpdate = true;
        }
        if (bImg.startsWith('data:')) {
          bImg = await uploadBase64ToStorage(bImg, `btp_mockups/${userDoc.id}/web/${p.id}_back_${Date.now()}_${idx}.png`);
          needsFirestoreUpdate = true;
        }

        const mainImg = fImg || bImg || fallbackLogo;

        return {
          id: String(p.id),
          name: String(p.name),
          price: Number(p.price) || 0,
          garment: String(p.garment || 'tshirt'),
          frontImageUrl: fImg,
          backImageUrl: bImg,
          imageUrl: mainImg,
          sizes: p.sizes || ["S", "M", "L", "XL"],
          colors: p.colors || ["Noir", "Blanc"]
        };
      }));

      // Si des chaînes Base64 ont été migrées vers Firebase Storage, persistez les nouvelles URLs dans Firestore
      if (needsFirestoreUpdate) {
        try {
          const updateData = {};
          if (cleanLogoUrl.startsWith('http')) updateData.logoUrl = cleanLogoUrl;
          if (cleanLivePhotoUrl.startsWith('http')) updateData.livePhotoUrl = cleanLivePhotoUrl;

          updateData.mockups = normalizedProducts.map(p => ({
            id: p.id,
            title: p.name,
            garment: p.garment,
            price: p.price,
            imageFront: p.frontImageUrl,
            imageBack: p.backImageUrl,
            imageUrl: p.imageUrl,
            url: p.imageUrl
          }));

          await db.collection('SiteConfigs').doc(userDoc.id).set(updateData, { merge: true });
          console.log(`[Base64 Migration] SiteConfigs/${userDoc.id} updated with Cloud Storage URLs.`);
        } catch (updateErr) {
          console.warn('[Base64 Migration Error]', updateErr);
        }
      }

      // Filtrer strictement les champs publics de l'artiste pour minimiser le payload
      const cleanSocials = Array.isArray(userData.socials)
        ? userData.socials.map(s => ({
            platform: String(s?.platform || ''),
            url: String(s?.url || '')
          })).filter(s => s.platform || s.url)
        : [];

      const cleanCustomLinks = Array.isArray(userData.customLinks)
        ? userData.customLinks.map(l => ({
            id: String(l?.id || ''),
            title: String(l?.title || ''),
            type: String(l?.type || ''),
            url: String(l?.url || ''),
            platform: String(l?.platform || ''),
            icon: String(l?.icon || ''),
            bgColor: String(l?.bgColor || ''),
            textColor: String(l?.textColor || ''),
            enabled: l?.enabled !== false
          })).filter(l => l.title || l.url || l.type)
        : [];

      const responseData = {
        success: true,
        artist: {
          id: String(userData.id),
          companyName: String(userData.companyName || userData.username || 'Artiste'),
          slug: String(userData.slug || ''),
          logoUrl: cleanLogoUrl,
          presentation: String(userData.presentation || userData.bio || ''),
          whatsapp: String(userData.whatsappNumber || userData.whatsapp || ''),
          contactEmail: String(userData.contactEmail || userData.email || ''),
          socials: cleanSocials,
          customLinks: cleanCustomLinks,
          theme: String(userData.theme || 'auto'),
          accentColor: String(userData.accentColor || '#ff3366'),
          livePhotoUrl: cleanLivePhotoUrl,
          invertLogoInLightMode: Boolean(userData.invertLogoInLightMode === true)
        },
        products: normalizedProducts,
        storageError: lastStorageError
      };

      console.log('[PAYLOAD CHECK] Size:', Buffer.byteLength(JSON.stringify(responseData)), 'bytes');
      res.set('Cache-Control', 'public, max-age=300, s-maxage=600, stale-while-revalidate=120');
      return res.status(200).json(responseData);
    } catch (error) {
      console.error('Erreur getUserBySlug:', error);
      return res.status(500).json({ error: error.message });
    }
  });
});

// Helper pour créer une session Stripe de manière 100% robuste (résout les problèmes de DNS/Sockets Node 20 sur Cloud Run)
async function createStripeCheckoutSession(key, sessionData) {
  const Stripe = require('stripe');
  
  // Stratégie 1 : SDK Stripe avec client Fetch natif (contourne les sockets HTTP Node 20)
  try {
    const stripe = new Stripe(key, {
      httpClient: Stripe.createFetchHttpClient(),
      maxNetworkRetries: 2,
      timeout: 10000
    });
    return await stripe.checkout.sessions.create(sessionData);
  } catch (err1) {
    console.warn('[Stripe SDK Fetch Warn] Tentative avec API REST directe:', err1.message);
  }

  // Stratégie 2 : Appel REST direct avec l'API Web standard fetch()
  const bodyParams = new URLSearchParams();
  bodyParams.append('mode', sessionData.mode || 'payment');
  bodyParams.append('success_url', sessionData.success_url);
  bodyParams.append('cancel_url', sessionData.cancel_url);

  if (sessionData.customer_email) {
    bodyParams.append('customer_email', sessionData.customer_email);
  }

  if (sessionData.invoice_creation && sessionData.invoice_creation.enabled) {
    bodyParams.append('invoice_creation[enabled]', 'true');
  }

  if (sessionData.tax_id_collection && sessionData.tax_id_collection.enabled) {
    bodyParams.append('tax_id_collection[enabled]', 'true');
  }

  if (sessionData.custom_fields && Array.isArray(sessionData.custom_fields)) {
    sessionData.custom_fields.forEach((cf, idx) => {
      bodyParams.append(`custom_fields[${idx}][key]`, cf.key);
      bodyParams.append(`custom_fields[${idx}][label][type]`, cf.label.type);
      bodyParams.append(`custom_fields[${idx}][label][custom]`, cf.label.custom);
      bodyParams.append(`custom_fields[${idx}][type]`, cf.type);
      if (cf.optional) bodyParams.append(`custom_fields[${idx}][optional]`, 'true');
    });
  }

  (sessionData.payment_method_types || ['card', 'bancontact']).forEach((pm, idx) => {
    bodyParams.append(`payment_method_types[${idx}]`, pm);
  });

  (sessionData.line_items || []).forEach((item, idx) => {
    bodyParams.append(`line_items[${idx}][price_data][currency]`, item.price_data.currency || 'eur');
    bodyParams.append(`line_items[${idx}][price_data][product_data][name]`, item.price_data.product_data.name || 'Article Merch');
    if (item.price_data.product_data.description) {
      bodyParams.append(`line_items[${idx}][price_data][product_data][description]`, item.price_data.product_data.description);
    }
    if (item.price_data.product_data.images && item.price_data.product_data.images.length > 0) {
      bodyParams.append(`line_items[${idx}][price_data][product_data][images][0]`, item.price_data.product_data.images[0]);
    }
    bodyParams.append(`line_items[${idx}][price_data][unit_amount]`, String(item.price_data.unit_amount));
    bodyParams.append(`line_items[${idx}][quantity]`, String(item.quantity || 1));
  });

  if (sessionData.metadata) {
    Object.entries(sessionData.metadata).forEach(([k, v]) => {
      bodyParams.append(`metadata[${k}]`, String(v));
    });
  }

  const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: bodyParams.toString()
  });

  const resJson = await response.json();
  if (!response.ok) {
    throw new Error(resJson.error?.message || `Erreur Stripe REST API (${response.status})`);
  }

  return resJson;
}

// ==========================================
// 2. MODULE PAIEMENT STRIPE (CHECKOUT) : POST /api/checkout
// ==========================================
exports.createCheckout = onRequest({ cors: true, invoker: 'public' }, async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Méthode non autorisée' });
  }

  try {
    const { items, artistSlug, artistId, customerInfo } = req.body || {};

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'Le panier est vide' });
    }

    // Safe extraction of Stripe secret key
    let key = null;
    try {
      if (stripeSecretKey && typeof stripeSecretKey.value === 'function') {
        key = stripeSecretKey.value();
      }
    } catch (e) {
      console.warn('[Stripe Key Warn] Could not read secret value:', e.message);
    }

    if (!key) key = process.env.STRIPE_SECRET_KEY;
    if (!key && functions.config().stripe) key = functions.config().stripe.secret;
    if (!key && functions.config().stripe_secret_key) key = functions.config().stripe_secret_key;

    if (!key) {
      console.error('[Stripe Error] Clé secrète STRIPE_SECRET_KEY introuvable ou non configurée');
      return res.status(500).json({ success: false, error: 'Clé de paiement Stripe non configurée sur le serveur' });
    }

    // Construction des line_items au format Stripe
    const line_items = items.map(item => {
      const hasValidHttpImage = typeof item.previewImageUrl === 'string' &&
        item.previewImageUrl.startsWith('http') &&
        item.previewImageUrl.length < 2000;

      return {
        price_data: {
          currency: 'eur',
          product_data: {
            name: item.name || 'Article Merch Officiel',
            description: `Taille: ${item.size || 'Unique'} | Couleur: ${item.color || 'Standard'}`,
            images: hasValidHttpImage ? [item.previewImageUrl] : []
          },
          unit_amount: Math.round(Number(item.price || 0) * 100)
        },
        quantity: Number(item.quantity || 1)
      };
    });

    const origin = req.headers.origin || 'https://signaid.eu';

    const email = customerInfo?.email || req.body.customerEmail || '';
    const name = customerInfo?.name || '';
    const address = customerInfo?.address || '';
    const zip = customerInfo?.zip || '';
    const city = customerInfo?.city || '';
    const phone = customerInfo?.phone || '';
    const notes = customerInfo?.notes || '';

    const sessionPayload = {
      payment_method_types: ['card', 'bancontact'],
      line_items,
      mode: 'payment',
      customer_email: email || undefined,
      success_url: `${origin}/${artistSlug || ''}?payment_success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/${artistSlug || ''}?payment_canceled=true`,
      metadata: {
        artistSlug: artistSlug || '',
        artistId: artistId || '',
        customerName: name,
        customerEmail: email,
        customerPhone: phone,
        customerAddress: address,
        customerZip: zip,
        customerCity: city,
        customerNotes: notes,
        itemsSummary: JSON.stringify(items.map(i => ({ id: i.id, name: i.name, size: i.size, qty: i.quantity, price: i.price }))).substring(0, 450)
      }
    };

    const session = await createStripeCheckoutSession(key, sessionPayload);

    return res.status(200).json({
      success: true,
      checkoutUrl: session.url || session.checkoutUrl,
      sessionId: session.id
    });
  } catch (error) {
    console.error('Erreur createCheckout (Stripe):', error);
    return res.status(400).json({ 
      success: false, 
      error: error.raw?.message || error.message || 'Impossible de créer la session de paiement Stripe.' 
    });
  }
});

// Endpoint dédié : Génération Session Stripe Pack Nom de Domaine Pro (60€)
exports.createDomainCheckout = onRequest({ cors: true, invoker: 'public' }, async (req, res) => {
  try {
    const { artistSlug = 'fabrizio', domains = 'djdfazz.com + djdfazz.be' } = req.body || req.query || {};

    let key = null;
    try {
      if (stripeSecretKey && typeof stripeSecretKey.value === 'function') {
        key = stripeSecretKey.value();
      }
    } catch (e) {}
    if (!key) key = process.env.STRIPE_SECRET_KEY;
    if (!key && functions.config().stripe) key = functions.config().stripe.secret;

    if (!key) {
      return res.status(500).json({ success: false, error: 'Clé Stripe non configurée' });
    }

    const session = await createStripeCheckoutSession(key, {
      payment_method_types: ['card', 'bancontact'],
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: {
            name: `Pack Nom de Domaine Pro (${domains}) - ${artistSlug.toUpperCase()} (1 an) + Setup Signaid`,
            description: `Réservation des noms de domaine ${domains} pour 1 an + Configuration DNS et redirection sur la vitrine officielle.`
          },
          unit_amount: 6000
        },
        quantity: 1
      }],
      mode: 'payment',
      invoice_creation: {
        enabled: true
      },
      tax_id_collection: {
        enabled: true
      },
      custom_fields: [
        {
          key: 'peppol_bce',
          label: { type: 'custom', custom: 'N° d\'entreprise / BCE Peppol' },
          type: 'text',
          optional: true
        }
      ],
      success_url: 'https://signaid.eu/merci-domaine?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: `https://signaid.eu/${artistSlug}`,
      metadata: {
        option: 'domain_pack',
        artistSlug,
        domains
      }
    });

    return res.status(200).json({
      success: true,
      checkoutUrl: session.url || session.checkoutUrl,
      sessionId: session.id
    });
  } catch (error) {
    console.error('Erreur createDomainCheckout:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Helper de génération de facture au format officiel UBL 2.1 PEPPOL BIS Billing 3.0
function generatePeppolUBLInvoice(invoiceData) {
  const {
    invoiceNumber = `INV-${Date.now()}`,
    issueDate = new Date().toISOString().split('T')[0],
    sellerName = 'Signaid / Signeed Club',
    sellerBce = '0123456789',
    buyerName = 'Client',
    buyerEmail = 'client@signaid.eu',
    buyerBce = '',
    totalAmount = 60.00,
    currency = 'EUR',
    description = 'Pack Nom de Domaine Pro (1 an) + Setup Signaid'
  } = invoiceData;

  const vatRate = 0.21;
  const netAmount = (totalAmount / (1 + vatRate)).toFixed(2);
  const vatAmount = (totalAmount - parseFloat(netAmount)).toFixed(2);
  const cleanBuyerBce = String(buyerBce || '').replace(/[^\d]/g, '');

  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:CustomizationID>urn:cen.eu:en16931:2017#compliant#urn:fdc:peppol.eu:2017:poacc:billing:3.0</cbc:CustomizationID>
  <cbc:ProfileID>urn:fdc:peppol.eu:2017:poacc:billing:01:1.0</cbc:ProfileID>
  <cbc:ID>${invoiceNumber}</cbc:ID>
  <cbc:IssueDate>${issueDate}</cbc:IssueDate>
  <cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>${currency}</cbc:DocumentCurrencyCode>
  <cbc:BuyerReference>${buyerEmail}</cbc:BuyerReference>

  <cac:AccountingSupplierParty>
    <cac:Party>
      <cbc:EndpointID schemeID="0208">BE${sellerBce}</cbc:EndpointID>
      <cac:PartyName>
        <cbc:Name>${sellerName}</cbc:Name>
      </cac:PartyName>
      <cac:PostalAddress>
        <cac:Country>
          <cbc:IdentificationCode>BE</cbc:IdentificationCode>
        </cac:Country>
      </cac:PostalAddress>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>BE${sellerBce}</cbc:CompanyID>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:PartyTaxScheme>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${sellerName}</cbc:RegistrationName>
        <cbc:CompanyID schemeID="0208">${sellerBce}</cbc:CompanyID>
      </cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingSupplierParty>

  <cac:AccountingCustomerParty>
    <cac:Party>
      ${cleanBuyerBce ? `<cbc:EndpointID schemeID="0208">BE${cleanBuyerBce}</cbc:EndpointID>` : ''}
      <cac:PartyName>
        <cbc:Name>${buyerName}</cbc:Name>
      </cac:PartyName>
      <cac:Contact>
        <cbc:ElectronicMail>${buyerEmail}</cbc:ElectronicMail>
      </cac:Contact>
      ${cleanBuyerBce ? `
      <cac:PartyTaxScheme>
        <cbc:CompanyID>BE${cleanBuyerBce}</cbc:CompanyID>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:PartyTaxScheme>` : ''}
    </cac:Party>
  </cac:AccountingCustomerParty>

  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="${currency}">${vatAmount}</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="${currency}">${netAmount}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="${currency}">${vatAmount}</cbc:TaxAmount>
      <cac:TaxCategory>
        <cbc:ID>S</cbc:ID>
        <cbc:Percent>21</cbc:Percent>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>
  </cac:TaxTotal>

  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="${currency}">${netAmount}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="${currency}">${netAmount}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="${currency}">${totalAmount.toFixed(2)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="${currency}">${totalAmount.toFixed(2)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>

  <cac:InvoiceLine>
    <cbc:ID>1</cbc:ID>
    <cbc:InvoicedQuantity unitCode="C62">1</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="${currency}">${netAmount}</cbc:LineExtensionAmount>
    <cac:Item>
      <cbc:Name>${description}</cbc:Name>
      <cac:ClassifiedTaxCategory>
        <cbc:ID>S</cbc:ID>
        <cbc:Percent>21</cbc:Percent>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:ClassifiedTaxCategory>
    </cac:Item>
    <cac:Price>
      <cbc:PriceAmount currencyID="${currency}">${netAmount}</cbc:PriceAmount>
    </cac:Price>
  </cac:InvoiceLine>
</Invoice>`;
}

// Endpoint API pour obtenir le fichier XML UBL 2.1 PEPPOL d'une commande
exports.getPeppolInvoice = onRequest({ cors: true, invoker: 'public' }, async (req, res) => {
  try {
    const { orderId, amount = 60.00, customerName, customerEmail, bce } = req.query || req.body || {};

    const ublXml = generatePeppolUBLInvoice({
      invoiceNumber: orderId ? `PEPPOL-${orderId.substring(0, 10)}` : `PEPPOL-${Date.now()}`,
      buyerName: customerName || 'Client',
      buyerEmail: customerEmail || 'client@signaid.eu',
      buyerBce: bce || '',
      totalAmount: parseFloat(amount) || 60.00
    });

    if (req.query.format === 'xml') {
      res.setHeader('Content-Type', 'application/xml');
      res.setHeader('Content-Disposition', `attachment; filename="invoice-peppol.xml"`);
      return res.status(200).send(ublXml);
    }

    return res.status(200).json({
      success: true,
      format: 'PEPPOL BIS Billing 3.0 (UBL 2.1)',
      ublXml
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Helper pour simuler / appeler l'API de l'usine d'impression
async function triggerPrintFactoryOrder(orderData) {
  console.log('[PRINT FACTORY API] Ordre d\'impression transmis à l\'usine :', {
    orderId: orderData.orderId,
    customerName: orderData.customerName,
    customerEmail: orderData.customerEmail,
    shippingAddress: `${orderData.customerAddress}, ${orderData.customerZip} ${orderData.customerCity}`,
    phone: orderData.customerPhone,
    notes: orderData.customerNotes,
    itemsCount: orderData.items ? orderData.items.length : 0,
    timestamp: new Date().toISOString()
  });
  return { status: 'SENT_TO_FACTORY', factoryRef: `PF-${Date.now()}` };
}

// ==========================================
// 3. WEBHOOK PAIEMENT STRIPE : POST /api/webhook & /stripeWebhook
// ==========================================
exports.stripeWebhook = onRequest({ cors: true, invoker: 'public' }, async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let key = null;
  try {
    if (stripeSecretKey && typeof stripeSecretKey.value === 'function') {
      key = stripeSecretKey.value();
    }
  } catch (e) {}
  if (!key) key = process.env.STRIPE_SECRET_KEY;
  if (!key && functions.config().stripe) key = functions.config().stripe.secret;

  let endpointSecret = null;
  try {
    if (stripeWebhookSecret && typeof stripeWebhookSecret.value === 'function') {
      endpointSecret = stripeWebhookSecret.value();
    }
  } catch (e) {}
  if (!endpointSecret) endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    if (endpointSecret && sig) {
      const stripe = require('stripe')(key);
      event = stripe.webhooks.constructEvent(req.rawBody || req.body, sig, endpointSecret);
    } else {
      event = req.body;
    }
  } catch (err) {
    console.error(`[Webhook Error] Vérification signature échouée:`, err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Traitement de la confirmation de paiement Stripe
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const metadata = session.metadata || {};
    const artistId = metadata.artistId;
    const totalAmount = (session.amount_total || 0) / 100;
    const customerEmail = metadata.customerEmail || session.customer_details?.email || session.customer_email || 'client@signaid.eu';

    console.log(`[STRIPE SUCCESS] Session ${session.id} validée pour ${totalAmount} EUR (DJ: ${artistId})`);

    const db = admin.firestore();

    // 1. Incrémenter le Dashboard du DJ
    if (artistId) {
      try {
        const siteConfigRef = db.collection('SiteConfigs').doc(artistId);
        await siteConfigRef.set({
          totalSales: admin.firestore.FieldValue.increment(1),
          revenue: admin.firestore.FieldValue.increment(totalAmount),
          ordersCount: admin.firestore.FieldValue.increment(1)
        }, { merge: true });

        console.log(`[DASHBOARD UPDATE] Metric incremented for DJ ${artistId}`);
      } catch (err) {
        console.error(`[DASHBOARD ERROR] Failed to update DJ metrics:`, err);
      }
    }

    // 2. Déclencher l'API de l'usine d'impression avec les coordonnées de livraison
    let factoryStatus = null;
    try {
      factoryStatus = await triggerPrintFactoryOrder({
        orderId: session.id,
        customerName: metadata.customerName || session.customer_details?.name || 'Client',
        customerEmail,
        customerPhone: metadata.customerPhone || session.customer_details?.phone || '',
        customerAddress: metadata.customerAddress || session.customer_details?.address?.line1 || '',
        customerZip: metadata.customerZip || session.customer_details?.address?.postal_code || '',
        customerCity: metadata.customerCity || session.customer_details?.address?.city || '',
        customerNotes: metadata.customerNotes || '',
        items: metadata.itemsSummary ? JSON.parse(metadata.itemsSummary) : [],
        totalAmount
      });
    } catch (err) {
      console.error(`[FACTORY API ERROR]`, err);
    }

    // 3. Sauvegarder la commande en BDD (collection orders)
    try {
      await db.collection('orders').doc(session.id).set({
        stripeSessionId: session.id,
        artistId: artistId || 'unknown',
        customer: {
          name: metadata.customerName || session.customer_details?.name || 'Client',
          email: customerEmail,
          phone: metadata.customerPhone || session.customer_details?.phone || '',
          address: metadata.customerAddress || session.customer_details?.address?.line1 || '',
          zip: metadata.customerZip || session.customer_details?.address?.postal_code || '',
          city: metadata.customerCity || session.customer_details?.address?.city || '',
          notes: metadata.customerNotes || ''
        },
        amountTotal: totalAmount,
        currency: session.currency || 'eur',
        status: 'PAID',
        factoryStatus: factoryStatus?.status || 'PENDING',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    } catch (err) {
      console.error(`[ORDER SAVE ERROR]`, err);
    }
  }

  return res.status(200).json({ received: true });
});

// ==========================================
// 4. MODULE BOOKING & GÉNÉRATION DE LEADS : POST /api/booking & /sendBookingEmail
// ==========================================
exports.sendBookingEmail = onRequest({ cors: true, invoker: 'public' }, async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Méthode non autorisée' });
  }

  try {
    const { artistSlug, artistId, name, email, phone, date, location, message } = req.body || {};

    if (!name || (!email && !phone)) {
      return res.status(400).json({ success: false, error: 'Veuillez renseigner au moins votre nom et un moyen de contact (Email ou Téléphone).' });
    }

    const db = admin.firestore();
    let recipientEmail = null;
    let artistName = 'Artiste';

    // 1. Recherche de l'email de l'artiste dans Firestore (collection SiteConfigs / users)
    const targetSlug = String(artistSlug || '').toLowerCase();
    
    if (targetSlug === 'fabrizio' || artistId === 'guest_ms3ijgnco2xnid') {
      const docSnap = await db.collection('SiteConfigs').doc('guest_ms3ijgnco2xnid').get();
      if (docSnap.exists) {
        const d = docSnap.data();
        recipientEmail = d.contactEmail || d.email || 'Fabriziomagistro89@gmail.com';
        artistName = d.companyName || 'D-FAZZ / Fabrizio';
      } else {
        recipientEmail = 'Fabriziomagistro89@gmail.com';
        artistName = 'Fabrizio';
      }
      // Mettre à jour l'email de Fabrizio en BDD s'il n'était pas défini
      await db.collection('SiteConfigs').doc('guest_ms3ijgnco2xnid').set({
        contactEmail: 'Fabriziomagistro89@gmail.com',
        email: 'Fabriziomagistro89@gmail.com'
      }, { merge: true });
    } else if (artistId) {
      const docSnap = await db.collection('SiteConfigs').doc(artistId).get();
      if (docSnap.exists) {
        const d = docSnap.data();
        recipientEmail = d.contactEmail || d.email;
        artistName = d.companyName || 'Artiste';
      }
    }

    if (!recipientEmail && targetSlug) {
      const querySnap = await db.collection('SiteConfigs').where('slug', '==', targetSlug).limit(1).get();
      if (!querySnap.empty) {
        const d = querySnap.docs[0].data();
        recipientEmail = d.contactEmail || d.email;
        artistName = d.companyName || targetSlug;
      }
    }

    if (!recipientEmail) {
      recipientEmail = 'Fabriziomagistro89@gmail.com';
    }

    // 2. Enregistrement du Lead Booking dans Firestore (collection BookingRequests)
    const bookingRef = await db.collection('BookingRequests').add({
      artistSlug: targetSlug || '',
      artistId: artistId || '',
      artistName,
      promoterName: name,
      promoterEmail: email || '',
      promoterPhone: phone || '',
      eventDate: date || '',
      eventLocation: location || '',
      message: message || '',
      recipientEmail,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      status: 'PENDING'
    });

    // Déterminer la liste des destinataires : Uniquement l'email de Fabrizio pour son profil
    let targetRecipients = [];
    if (targetSlug === 'fabrizio' || artistId === 'guest_ms3ijgnco2xnid') {
      targetRecipients = ['Fabriziomagistro89@gmail.com'];
    } else {
      targetRecipients = Array.from(new Set([recipientEmail, 'logosigneed@gmail.com', 'contact@signeedclub.com'])).filter(Boolean);
    }

    // 3. Envoi de l'e-mail d'alerte à l'artiste via Nodemailer
    try {
      const transporter = getTransporter();
      const mailOptions = {
        from: '"Signaid Booking System" <logosigneed@gmail.com>',
        to: targetRecipients.join(', '),
        replyTo: email || undefined,
        subject: `⚡ DEMANDE DE BOOKING / ÉVÉNEMENT pour ${artistName} [${date || 'Date à confirmer'}]`,
        html: `
          <div style="font-family: Arial, sans-serif; background-color: #0d0d0d; color: #ffffff; padding: 25px; border-radius: 12px; max-width: 600px; margin: 0 auto; border: 1px solid #333;">
            <h2 style="color: #ff3366; text-transform: uppercase; margin-top: 0; border-bottom: 2px solid #ff3366; padding-bottom: 10px;">
              ⚡ Nouvelle Demande de Booking !
            </h2>
            <p style="font-size: 15px; color: #ddd;">Vous avez reçu une demande d'événement direct depuis le profil officiel <strong>${artistName}</strong>.</p>
            
            <table style="width: 100%; border-collapse: collapse; margin-top: 20px; background: #181818; border-radius: 8px; overflow: hidden;">
              <tr>
                <td style="padding: 12px 15px; font-weight: bold; color: #888; border-bottom: 1px solid #282828;">Promoteur / Client :</td>
                <td style="padding: 12px 15px; color: #fff; border-bottom: 1px solid #282828;">${name}</td>
              </tr>
              <tr>
                <td style="padding: 12px 15px; font-weight: bold; color: #888; border-bottom: 1px solid #282828;">Email :</td>
                <td style="padding: 12px 15px; color: #38bdf8; border-bottom: 1px solid #282828;"><a href="mailto:${email}" style="color: #38bdf8; text-decoration: none;">${email || 'Non renseigné'}</a></td>
              </tr>
              <tr>
                <td style="padding: 12px 15px; font-weight: bold; color: #888; border-bottom: 1px solid #282828;">Téléphone :</td>
                <td style="padding: 12px 15px; color: #fff; border-bottom: 1px solid #282828;">${phone || 'Non renseigné'}</td>
              </tr>
              <tr>
                <td style="padding: 12px 15px; font-weight: bold; color: #888; border-bottom: 1px solid #282828;">Date de l'événement :</td>
                <td style="padding: 12px 15px; color: #ff3366; font-weight: bold; border-bottom: 1px solid #282828;">${date || 'À déterminer'}</td>
              </tr>
              <tr>
                <td style="padding: 12px 15px; font-weight: bold; color: #888; border-bottom: 1px solid #282828;">Lieu / Ville / Club :</td>
                <td style="padding: 12px 15px; color: #fff; border-bottom: 1px solid #282828;">${location || 'Non précisé'}</td>
              </tr>
            </table>

            <div style="margin-top: 20px; background: #181818; padding: 15px; border-radius: 8px; border-left: 4px solid #ff3366;">
              <strong style="color: #888; display: block; margin-bottom: 5px;">Message du promoteur :</strong>
              <p style="margin: 0; color: #eee; font-style: italic; white-space: pre-wrap;">${message || 'Aucun message particulier.'}</p>
            </div>

            <div style="margin-top: 25px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #222; padding-top: 15px;">
              Propulsé par Signaid Lead Manager | Réf Lead: ${bookingRef.id}
            </div>
          </div>
        `
      };

      await transporter.sendMail(mailOptions);
      console.log(`[Booking Email] Alert successfully sent to ${recipientEmail} and logosigneed@gmail.com for booking ${bookingRef.id}`);
    } catch (mailErr) {
      console.error('[Booking Email Error] Could not send email via Nodemailer:', mailErr);
    }

    return res.status(200).json({
      success: true,
      message: "Demande envoyée avec succès à l'artiste",
      bookingId: bookingRef.id
    });

  } catch (error) {
    console.error('Erreur sendBookingEmail:', error);
    return res.status(500).json({ success: false, error: error.message || 'Erreur serveur lors de la demande de booking.' });
  }
});

// ==========================================
// 5. MODULE DEMANDES D'ACCÈS SITE PRINCIPAL (signaid.eu)
// ==========================================
exports.sendAccessRequestEmail = onRequest({ cors: true, invoker: 'public' }, async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Méthode non autorisée' });
  }

  try {
    const { artistName, email, logoBase64 } = req.body || {};

    if (!artistName || !email) {
      return res.status(400).json({ success: false, error: 'Nom et Email obligatoires.' });
    }

    const transporter = getTransporter();
    const mailOptions = {
      from: '"Signaid Notification" <logosigneed@gmail.com>',
      to: 'logosigneed@gmail.com, contact@signeedclub.com',
      replyTo: email,
      subject: `🚨 NOUVELLE DEMANDE D'INFRASTRUCTURE : ${artistName}`,
      html: `
        <div style="font-family: Arial, sans-serif; background-color: #050505; color: #ffffff; padding: 25px; border-radius: 12px; max-width: 600px; margin: 0 auto; border: 1.5px solid #ff3366;">
          <h2 style="color: #ff3366; text-transform: uppercase; margin-top: 0; border-bottom: 2px solid #ff3366; padding-bottom: 10px;">
            🚨 Demande d'Infrastructure Réclamée !
          </h2>
          <p style="font-size: 15px; color: #ddd;">Un nouvel artiste / créateur vient de soumettre une demande depuis la page d'accueil <strong>signaid.eu</strong>.</p>
          
          <table style="width: 100%; border-collapse: collapse; margin-top: 20px; background: #111111; border-radius: 8px; overflow: hidden;">
            <tr>
              <td style="padding: 12px 15px; font-weight: bold; color: #888; border-bottom: 1px solid #222;">Nom d'Artiste / Marque :</td>
              <td style="padding: 12px 15px; color: #fff; font-weight: bold; font-size: 16px; border-bottom: 1px solid #222;">${artistName}</td>
            </tr>
            <tr>
              <td style="padding: 12px 15px; font-weight: bold; color: #888; border-bottom: 1px solid #222;">Email de contact :</td>
              <td style="padding: 12px 15px; color: #38bdf8; border-bottom: 1px solid #222;"><a href="mailto:${email}" style="color: #38bdf8; text-decoration: none;">${email}</a></td>
            </tr>
            <tr>
              <td style="padding: 12px 15px; font-weight: bold; color: #888;">Logo transmis :</td>
              <td style="padding: 12px 15px; color: #fff;">${logoBase64 ? '✓ Visuel joint' : '✕ Aucun logo joint'}</td>
            </tr>
          </table>

          ${logoBase64 ? `
            <div style="margin-top: 20px; text-align: center; background: #111; padding: 15px; border-radius: 8px; border: 1px solid #222;">
              <span style="color: #888; display: block; font-size: 12px; margin-bottom: 10px;">Aperçu du visuel soumis :</span>
              <img src="${logoBase64}" alt="Logo Artiste" style="max-height: 140px; max-width: 100%; object-fit: contain; border-radius: 6px;" />
            </div>
          ` : ''}

          <div style="margin-top: 25px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #222; padding-top: 15px;">
            Signaid Lead Dispatcher • Destinataire : logosigneed@gmail.com
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`[Access Request Email] Sent for ${artistName} (${email}) to logosigneed@gmail.com`);

    return res.status(200).json({ success: true, message: "Email envoyé à logosigneed@gmail.com" });
  } catch (err) {
    console.error('Erreur sendAccessRequestEmail:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

exports.listStorageFiles = onRequest({ cors: true }, async (req, res) => {
  try {
    const bucket = admin.storage().bucket('signaid-prod-assets');
    const [files] = await bucket.getFiles({ prefix: 'btp_mockups/' });
    const fileList = files.map(f => f.name);

    const bucketDefault = admin.storage().bucket();
    const [filesDefault] = await bucketDefault.getFiles({ prefix: 'users/guest_ms3ijgnco2xnid/' });
    const fileListDefault = filesDefault.map(f => f.name);

    return res.json({
      signaidProdAssets: fileList,
      defaultBucket: fileListDefault
    });
  } catch (err) {
    return res.status(500).json({ error: String(err.message || err) });
  }
});