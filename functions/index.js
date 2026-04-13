// Mise à jour forcée - Mars 2026 - Version Stable Intégrale
const cors = require('cors')({ origin: true });
const crypto = require('crypto');
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
const mollieApiKey = defineSecret('MOLLIE_API_KEY');
const fbAccessToken = defineSecret('FB_ACCESS_TOKEN');
const fbPixelId = defineSecret('FB_PIXEL_ID');

// Helper for configuring nodemailer
const getTransporter = () => {
  const nodemailer = require('nodemailer');
  return nodemailer.createTransport({
    host: 'smtp.hostinger.com',
    port: 465,
    secure: true,
    auth: {
      user: 'contact@signeedclub.com',
      pass: smtpPass.value()
    }
  });
};

exports.sendQuoteEmail = onRequest({ secrets: [smtpPass, fbAccessToken, fbPixelId], cors: true }, async (req, res) => {
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

exports.createMolliePayment = onRequest({ secrets: [mollieApiKey], cors: true }, async (req, res) => {
  if (req.method !== 'POST') return res.status(405).send('Méthode non autorisée');
  try {
    const { items, totalAmount, description } = req.body;
    const formattedAmount = Number(totalAmount).toFixed(2);
    const mollie = require('@mollie/api-client');
    const createMollieClient = mollie.default || mollie.createMollieClient;
    const mollieClient = createMollieClient({ apiKey: mollieApiKey.value() });

    const payment = await mollieClient.payments.create({
      amount: { currency: 'EUR', value: formattedAmount },
      description: description || 'Commande Signeed Club',
      redirectUrl: 'https://signaid-d2d08.web.app/?payment_success=true',
      webhookUrl: 'https://us-central1-signaid-d2d08.cloudfunctions.net/mollieWebhook',
      metadata: { items: JSON.stringify(items.map(i => i.name)) }
    });
    res.json({ checkoutUrl: payment.getCheckoutUrl() });
  } catch (error) {
    console.error('Mollie Error:', error);
    res.status(500).send(error.message);
  }
});

exports.mollieWebhook = onRequest({ cors: true }, async (req, res) => {
  res.status(200).send('OK');
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
exports.generateTryOnImageV2 = onCall({ secrets: [geminiApiKey], cors: true }, async (request) => {
  const data = request.data;
  const apiKey = geminiApiKey.value();
  if (!apiKey) throw new HttpsError('failed-precondition', 'API Key manquante.');

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

exports.removeBgProxy = onCall({ secrets: [removeBgApiKey], cors: true }, async (request) => {
  const apiKey = removeBgApiKey.value();
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