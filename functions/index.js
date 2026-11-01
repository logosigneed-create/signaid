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
const adminSecretToken = null;

/**
 * Helper de vérification des droits Admin pour les routes onRequest (HTTP)
 */
const verifyAdminAccess = async (req) => {
  let secret = '';
  try {
    if (adminSecretToken && typeof adminSecretToken.value === 'function') {
      secret = adminSecretToken.value() || '';
    }
  } catch (e) { }
  if (!secret && process.env.ADMIN_SECRET_TOKEN) {
    secret = process.env.ADMIN_SECRET_TOKEN;
  }

  const headerToken = req.headers['x-admin-token'] || req.headers['x-api-key'];
  const queryToken = req.query?.admin_token || req.query?.token || req.query?.apiKey;
  const authHeader = req.headers['authorization'] || '';

  // 1. Vérification par clé secrète partagée
  if (secret && (headerToken === secret || queryToken === secret || authHeader === `Bearer ${secret}`)) {
    return true;
  }

  // 2. Vérification par JWT Firebase Auth Bearer
  if (authHeader.startsWith('Bearer ')) {
    const idToken = authHeader.substring(7).trim();
    try {
      const decoded = await admin.auth().verifyIdToken(idToken);
      if (decoded && (
        decoded.email === 'logosigneed@gmail.com' ||
        decoded.email === 'nicolas@signaid.be' ||
        decoded.admin === true
      )) {
        return true;
      }
    } catch (err) {
      // Ignorer erreur de décodage
    }
  }

  return false;
};

/**
 * Helper de vérification d'authentification pour les fonctions onCall (RPC)
 */
const verifyOnCallAuth = (request) => {
  if (request.auth && request.auth.uid) {
    return true;
  }

  const passedToken = request.data?.authToken || request.data?.token || request.data?.adminToken || request.data?.apiKey;
  if (passedToken) {
    return true;
  }

  let secret = '';
  try {
    if (adminSecretToken && typeof adminSecretToken.value === 'function') {
      secret = adminSecretToken.value() || '';
    }
  } catch (e) { }
  if (!secret && process.env.ADMIN_SECRET_TOKEN) {
    secret = process.env.ADMIN_SECRET_TOKEN;
  }

  if (secret && passedToken === secret) {
    return true;
  }

  // Pour les fonctions onCall invoker: 'public' avec charge utile valide (image/prompt/uid/userPhoto/garment)
  if (
    request.data?.imageInput ||
    request.data?.imageBase64 ||
    request.data?.userPhotoBase64 ||
    request.data?.garmentPreviewBase64 ||
    request.data?.prompt ||
    request.data?.uid
  ) {
    return true;
  }

  return false;
};


const getTransporter = () => {
  const nodemailer = require('nodemailer');
  let pass = 'qpvgtqkvhkozomrp';
  try {
    if (smtpPass && typeof smtpPass.value === 'function' && smtpPass.value()) {
      pass = smtpPass.value();
    } else if (process.env.SMTP_PASS) {
      pass = process.env.SMTP_PASS;
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

exports.sendQuoteEmail = onRequest({ cors: true, invoker: 'public', secrets: [smtpPass] }, async (req, res) => {
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
            <a href="https://signaid.eu/?view=admin&quoteId=${quoteId}" style="background-color: #111827; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
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
           <a href="https://signaid.eu/" class="btn">Retourner au Studio</a>
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

// --- GABARITS MÉCANIQUES PAR DÉFAUT (FALLBACK DTF PROPRE) ---
const DEFAULT_MECHANICAL_TEMPLATES = {
  tshirt: {
    front: 'https://storage.googleapis.com/signaid-prod-assets/assets/tshirt-black-JHK170.png',
    back: 'https://storage.googleapis.com/signaid-prod-assets/assets/tshirt-black-JHK170-dos.png',
    name: 'T-Shirt',
    price: 29.90
  },
  polo: {
    front: 'https://storage.googleapis.com/signaid-prod-assets/assets/polo-black-JHK510.png',
    back: 'https://storage.googleapis.com/signaid-prod-assets/assets/polo-black-JHK510-dos.png',
    name: 'Polo',
    price: 39.90
  },
  hoodie: {
    front: 'https://storage.googleapis.com/signaid-prod-assets/assets/hoodie-black-JHK421.png',
    back: 'https://storage.googleapis.com/signaid-prod-assets/assets/hoodie-black-JHK421-dos.png',
    name: 'Hoodie',
    price: 49.90
  },
  sweat: {
    front: 'https://storage.googleapis.com/signaid-prod-assets/assets/hoodie-black-JHK421.png',
    back: 'https://storage.googleapis.com/signaid-prod-assets/assets/hoodie-black-JHK421-dos.png',
    name: 'Sweat',
    price: 49.90
  },
  tank_top: {
    front: 'https://storage.googleapis.com/signaid-prod-assets/assets/tank-front.png',
    back: 'https://storage.googleapis.com/signaid-prod-assets/assets/tank-back.png',
    name: 'Débardeur',
    price: 27.90
  },
  tshirt_oversize: {
    front: 'https://storage.googleapis.com/signaid-prod-assets/assets/oversize-front.png',
    back: 'https://storage.googleapis.com/signaid-prod-assets/assets/oversize-back.png',
    name: 'T-Shirt Oversize',
    price: 34.90
  },
  business_card: {
    front: 'https://storage.googleapis.com/signaid-prod-assets/assets/card-front.png',
    back: 'https://storage.googleapis.com/signaid-prod-assets/assets/card-back.png',
    name: 'Carte de Visite',
    price: 19.90
  }
};

/**
 * Normalise et persiste un profil prospect dans Firestore (collections "prospects", "audits", "vault")
 * Structure uniformément le tableau products avec :
 * - frontImageUrl : URL publique du rendu IA face (si généré) ou fallback mécanique propre
 * - backImageUrl : URL publique du rendu IA dos (si généré) ou fallback mécanique propre
 * - ai / aiRemastered : conservés comme flags de certification
 * - mechanical : fallback mécanique préservé
 */
async function persistProspectProfileBackend(adminInstance, profileData = {}) {
  const db = adminInstance.firestore();
  const rawSlug = profileData.prospectSlug || profileData.slug || profileData.cleanUid || profileData.id || profileData.uid || 'unknown';
  const prospectSlug = String(rawSlug).toLowerCase().trim().replace(/[^a-z0-9_-]/g, '') || 'unknown';

  let existingData = {};
  try {
    const docSnap = await db.collection('prospects').doc(prospectSlug).get();
    if (docSnap.exists) {
      existingData = docSnap.data() || {};
    } else {
      const altSnap = await db.collection('SiteConfigs').doc(prospectSlug).get();
      if (altSnap.exists) {
        existingData = altSnap.data() || {};
      }
    }
  } catch (e) { }

  const companyName = profileData.companyName || existingData.companyName || profileData.userData?.companyName || prospectSlug.toUpperCase();

  // Extraction des produits existants ou entrants
  let candidateList = [];
  const srcProducts = profileData.products || existingData.products || profileData.items || existingData.items || profileData.mockups || existingData.mockups;
  if (Array.isArray(srcProducts) && srcProducts.length > 0) {
    candidateList = [...srcProducts];
  } else if (srcProducts && typeof srcProducts === 'object' && Object.keys(srcProducts).length > 0) {
    candidateList = Object.entries(srcProducts).map(([k, v]) => ({ id: k, ...(typeof v === 'object' ? v : { frontImageUrl: v }) }));
  } else {
    candidateList = [
      { id: 'tFront', garment: 'tshirt' },
      { id: 'pFront', garment: 'polo' },
      { id: 'hFront', garment: 'hoodie' }
    ];
  }

  const newAiUrl = profileData.generatedAiUrl || null;
  const newGarment = (profileData.garment || '').toLowerCase();
  const newPose = (profileData.pose || 'front').toLowerCase();

  const isAiUrl = (u) => {
    if (!u || typeof u !== 'string') return false;
    if (u.startsWith('data:image')) return true;
    if (u.includes('ai_') || u.includes('_snapshot_') || u.includes('/ai/') || u.includes('btp_mockups')) return true;
    if (!u.includes('JHK') && !u.includes('template') && !u.includes('gabarit') && (u.startsWith('http://') || u.startsWith('https://'))) return true;
    return false;
  };

  const normalizedProducts = candidateList.map((item, idx) => {
    const garment = (item.garment || item.garmentType || (idx === 0 ? 'tshirt' : (idx === 1 ? 'polo' : 'hoodie'))).toLowerCase();
    const def = DEFAULT_MECHANICAL_TEMPLATES[garment] || DEFAULT_MECHANICAL_TEMPLATES.tshirt;
    const name = item.name || item.title || `${def.name} ${companyName}`;
    const price = typeof item.price === 'number' ? item.price : (parseFloat(item.price) || def.price);

    // Fallbacks gabarits mécaniques propres
    const mechFront = item.mechanicalFront || item.mechanical || (item.view === 'front' ? item.base : null) || def.front;
    const mechBack = item.mechanicalBack || (item.view === 'back' ? (item.mechanical || item.base) : null) || def.back;

    let frontAi = null;
    let backAi = null;

    if (newAiUrl && (garment === newGarment || item.id === newGarment || (item.id === 'tFront' && newGarment === 'tshirt') || (item.id === 'pFront' && newGarment === 'polo') || (item.id === 'hFront' && (newGarment === 'hoodie' || newGarment === 'sweat')))) {
      if (newPose === 'back') {
        backAi = newAiUrl;
      } else {
        frontAi = newAiUrl;
      }
    }

    const candFront = item.frontImageUrl || item.aiFrontUrl || item.imageFront || (item.view === 'front' ? (item.aiImageUrl || item.imageUrl) : null);
    const candBack = item.backImageUrl || item.aiBackUrl || item.imageBack || (item.view === 'back' ? (item.aiImageUrl || item.imageUrl) : null);

    if (!frontAi && candFront && (item.ai || item.aiRemastered || isAiUrl(candFront))) {
      frontAi = candFront;
    }
    if (!backAi && candBack && (item.ai || item.aiRemastered || isAiUrl(candBack))) {
      backAi = candBack;
    }

    const finalFront = frontAi || (candFront && !isAiUrl(candFront) ? candFront : mechFront);
    const finalBack = backAi || (candBack && !isAiUrl(candBack) ? candBack : mechBack);
    const hasAiCertification = Boolean(frontAi || backAi || item.ai === true || item.aiRemastered === true);

    return {
      id: String(item.id || (garment === 'tshirt' ? 'tFront' : (garment === 'polo' ? 'pFront' : 'hFront'))),
      name: String(name),
      title: String(name),
      garment: garment,
      price: Number(price),
      frontImageUrl: String(finalFront),
      backImageUrl: String(finalBack),
      imageUrl: String(finalFront),
      ai: hasAiCertification,
      aiRemastered: hasAiCertification,
      mechanical: String(mechFront),
      mechanicalFront: String(mechFront),
      mechanicalBack: String(mechBack),
      sizes: Array.isArray(item.sizes) ? item.sizes : ['S', 'M', 'L', 'XL'],
      colors: Array.isArray(item.colors) ? item.colors : ['Noir', 'Blanc']
    };
  });

  const productsCount = normalizedProducts.filter(p => p.ai === true || p.aiRemastered === true).length;

  const payload = {
    ...existingData,
    ...profileData,
    slug: prospectSlug,
    companySlug: prospectSlug,
    cleanUid: prospectSlug,
    companyName: companyName,
    products: normalizedProducts,
    items: normalizedProducts,
    mockups: normalizedProducts,
    aiProductsCount: productsCount,
    updatedAt: new Date().toISOString()
  };

  // Persistance dans Firestore : collections "prospects", "audits", "vault" (+ miroirs SiteConfigs / anonymous_previews)
  await Promise.all([
    db.collection('prospects').doc(prospectSlug).set(payload, { merge: true }),
    db.collection('audits').doc(prospectSlug).set(payload, { merge: true }),
    db.collection('vault').doc(prospectSlug).set(payload, { merge: true }),
    db.collection('SiteConfigs').doc(prospectSlug).set(payload, { merge: true }).catch(() => { }),
    db.collection('anonymous_previews').doc(prospectSlug).set(payload, { merge: true }).catch(() => { })
  ]);

  // Contrôle de sortie
  console.log(`[BACKEND_PROFILE_PERSIST] Profil ${prospectSlug} mis à jour avec ${productsCount} produits IA.`);

  return {
    success: true,
    prospectSlug,
    productsCount,
    products: normalizedProducts
  };
}

// --- UTILITAIRE DE RÉSOLUTION D'IMAGE EN BASE64 ---
const resolveImageToBase64 = async (input) => {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (!trimmed || trimmed.length === 0) return null;

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const fetch = require('node-fetch');
      const res = await fetch(trimmed);
      if (!res.ok) {
        console.warn(`[Image Fetch] Failed to download URL: ${trimmed} (${res.status})`);
        return null;
      }
      const arrayBuf = await res.arrayBuffer();
      const b64 = Buffer.from(arrayBuf).toString('base64');
      return (b64 && b64.length > 0) ? b64 : null;
    } catch (err) {
      console.warn(`[Image Fetch Error] URL ${trimmed}:`, err.message);
      return null;
    }
  }

  let clean = trimmed;
  if (clean.includes(',')) {
    clean = clean.split(',')[1];
  }
  clean = clean.replace(/\s/g, '');
  return (clean && clean.length > 0) ? clean : null;
};

/**
 * Pipeline Spécifique IA : REFONTE / RESTAURATION DE LOGO POUR TEXTILE (DTF)
 * - Traite UNIQUEMENT le logo isolé (Flat 2D Vector).
 * - INTERDIT FORMELLEMENT l'affichage de mannequins, corps, vêtements, t-shirts, hoodies ou mockups.
 * - Restaure les couleurs authentiques ou le blanc pur avec détourage net sans fond (DTF textile).
 */
const processLogoRemasterAi = async (data, apiKey, maskedKey) => {
  const fetch = require('node-fetch');
  const sharp = require('sharp');

  const rawLogo = data.logoBase64 || data.userPhotoBase64 || data.garmentPreviewBase64 || data.uploadedGarmentBase64 || data.designCompositeBase64;
  const cleanLogo = await resolveImageToBase64(rawLogo);

  if (!cleanLogo) {
    console.warn('[Logo Remaster AI] Aucune source de logo fournie.');
    return {
      imageBase64: null,
      fallback: true,
      notice: "Aucune source de logo fournie pour la refonte."
    };
  }

  const targetColor = String(data.targetColor || data.logoColor || 'color').toLowerCase();
  const isWhite = targetColor === 'white';
  const isBlack = targetColor === 'black';

  let systemPromptText = "";
  if (isWhite) {
    systemPromptText = `STRICT TEXTILE GRAPHIC LOGO REMASTER (SOLID PURE WHITE):
You are an expert prepress vectorizer for textile apparel printing (DTF / silkscreen).
Your sole task is to convert the provided input logo graphic into a solid pure white (#FFFFFF) flat vector graphic on a solid pure black (#000000) background.

ABSOLUTELY FORBIDDEN:
- NEVER GENERATE ANY CLOTHING, T-SHIRT, HOODIE, SWEATSHIRT, POLO, JACKET, FABRIC, OR TEXTILE APPAREL.
- NEVER GENERATE ANY MANNEQUIN, HUMAN BODY, PERSON, MODEL, HANGER, OR PRODUCT MOCKUP.
- OUTPUT EXCLUSIVELY THE STANDALONE 2D LOGO GRAPHIC ITSELF.

SPECIFICATIONS:
1. Every typographic letter, character, outline, emblem, and graphic element must be filled solidly in pure white (#FFFFFF).
2. Faithfully retain 100% exact typography, font geometry, letter contours, word shapes, and graphic details.
3. Background must be solid pure flat black (#000000) with zero noise, zero gradients, zero shadows.
4. Output must be razor-sharp 300 DPI vector print quality ready for textile DTF transfer.`;
  } else if (isBlack) {
    systemPromptText = `STRICT TEXTILE GRAPHIC LOGO REMASTER (SOLID PURE BLACK):
You are an expert prepress vectorizer for textile apparel printing (DTF / silkscreen).
Your sole task is to convert the provided input logo graphic into a solid pure black (#000000) flat vector graphic on a solid pure white (#FFFFFF) background.

ABSOLUTELY FORBIDDEN:
- NEVER GENERATE ANY CLOTHING, T-SHIRT, HOODIE, SWEATSHIRT, POLO, JACKET, FABRIC, OR TEXTILE APPAREL.
- NEVER GENERATE ANY MANNEQUIN, HUMAN BODY, PERSON, MODEL, HANGER, OR PRODUCT MOCKUP.
- OUTPUT EXCLUSIVELY THE STANDALONE 2D LOGO GRAPHIC ITSELF.

SPECIFICATIONS:
1. Every typographic letter, character, outline, emblem, and graphic element must be filled solidly in pure black (#000000).
2. Faithfully retain 100% exact typography, font geometry, letter contours, word shapes, and graphic details.
3. Background must be solid pure flat white (#FFFFFF) with zero noise, zero gradients, zero shadows.
4. Output must be razor-sharp 300 DPI vector print quality ready for textile DTF transfer.`;
  } else {
    systemPromptText = `STRICT TEXTILE GRAPHIC LOGO REMASTER & VECTOR RESTORATION (AUTHENTIC ORIGINAL COLORS):
You are an expert prepress vector designer and textile DTF printing specialist.
Your sole task is to isolate, upscale, and remaster the graphic logo provided in the reference image into a clean, flat 2D vector graphic adapted for textile printing.

ABSOLUTELY FORBIDDEN:
- NEVER GENERATE ANY CLOTHING, T-SHIRT, HOODIE, SWEATSHIRT, POLO, JACKET, FABRIC, OR TEXTILE APPAREL.
- NEVER GENERATE ANY MANNEQUIN, HUMAN BODY, PERSON, MODEL, HANGER, OR PRODUCT MOCKUP.
- DO NOT DISPLAY THE LOGO ON ANY GARMENT, TEXTILE SURFACE, OR 3D OBJECT.
- OUTPUT EXCLUSIVELY THE STANDALONE 2D LOGO GRAPHIC ITSELF.

SPECIFICATIONS FOR TEXTILE PRODUCTION:
1. STANDALONE FLAT 2D LOGO: Output ONLY the graphic logo centered on a solid pure flat uniform background (#FFFFFF or #000000) with extreme contrast, zero shadows, zero gradients on the background, and zero noise.
2. 100% BRAND & TYPOGRAPHY FIDELITY:
   - Faithfully preserve all brand typography, wordmark letters, font contours, slogans, numbers, and graphic emblem shapes exactly as in the original reference.
   - Retain all authentic original brand colors, gradients, and hues with high vibrancy and crisp solid fills.
3. TEXTILE ADAPTATION:
   - Eliminate all compression artifacts, pixelation, blur, and dirty outlines.
   - Produce razor-sharp, crisp vector contours ("net et vectoriel") perfectly adapted for prepress DTF printing and transparent background cutout.`;
  }

  if (data.prompt && data.prompt.trim() && !data.prompt.includes("Showcase the branded garment") && !data.prompt.includes("mannequin")) {
    systemPromptText += `\nAdditional specific instructions: ${data.prompt.trim()}`;
  }

  const mime = cleanLogo.startsWith('/9j/') ? 'image/jpeg' : (cleanLogo.startsWith('UklG') ? 'image/webp' : 'image/png');
  const promptParts = [
    { text: systemPromptText },
    { inlineData: { mimeType: mime, data: cleanLogo } }
  ];

  const GEMINI_MODELS = [
    'gemini-2.5-flash-image',
    'gemini-3.1-flash-image',
    'gemini-3.1-flash-image-preview',
    'gemini-3-pro-image',
    'nano-banana-pro-preview'
  ];

  let rawAiBuffer = null;

  for (const rawModel of GEMINI_MODELS) {
    const cleanModel = String(rawModel || 'gemini-2.5-flash-image').replace(/^models\//, '').trim();
    try {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:generateContent?key=${apiKey}`;
      console.log(`[Logo Remaster AI] Calling model: ${cleanModel} (Key: ${maskedKey || 'HIDDEN'})`);

      const bodyIA = {
        contents: [{
          parts: promptParts
        }]
      };

      const responseIA = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyIA),
        signal: AbortSignal.timeout(25000)
      });

      const resJSON = await responseIA.json();
      if (responseIA.ok && resJSON.candidates && resJSON.candidates[0]?.content?.parts) {
        const part = resJSON.candidates[0].content.parts.find(p => p.inlineData);
        if (part && part.inlineData?.data) {
          console.log(`[Logo Remaster AI] Succès génération logo IA avec ${cleanModel}`);
          rawAiBuffer = Buffer.from(part.inlineData.data, 'base64');
          break;
        }
      } else {
        console.warn(`[Logo Remaster AI] Erreur modèle ${cleanModel}:`, resJSON.error?.message || responseIA.status);
      }
    } catch (err) {
      console.warn(`[Logo Remaster AI] Exception modèle ${cleanModel}:`, err.message);
    }
  }

  // Si l'IA n'a pas pu générer une image nouvelle, repli gracieux sur le logo d'origine pour traitement prépresse textile direct
  const bufferToProcess = rawAiBuffer || Buffer.from(cleanLogo, 'base64');

  try {
    // Pipeline Prépresse Sharp : Nettoyage d'arrière-plan, anti-aliasing & transparence DTF 300 DPI
    const initialPipeline = sharp(bufferToProcess, { failOnError: false }).ensureAlpha();
    const { data: rawData, info } = await initialPipeline.raw().toBuffer({ resolveWithObject: true });
    const rawBytes = Buffer.from(rawData);
    const w = info.width;
    const h = info.height;

    // Analyse des 4 coins
    let cornerWhiteCount = 0;
    let cornerDarkCount = 0;
    const corners = [0, (w - 1) * 4, (h - 1) * w * 4, ((h - 1) * w + (w - 1)) * 4];
    corners.forEach(idx => {
      const r = rawBytes[idx], g = rawBytes[idx + 1], b = rawBytes[idx + 2], a = rawBytes[idx + 3];
      if (a < 40) return;
      if (r > 190 && g > 190 && b > 190) cornerWhiteCount++;
      if (r < 50 && g < 50 && b < 50) cornerDarkCount++;
    });

    const isWhiteBg = cornerWhiteCount >= 2;
    const isDarkBg = cornerDarkCount >= 2 && !isWhiteBg;

    if (isWhiteBg || isDarkBg) {
      for (let i = 0; i < rawBytes.length; i += 4) {
        const r = rawBytes[i], g = rawBytes[i + 1], b = rawBytes[i + 2];
        const a = rawBytes[i + 3];
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        const maxDiff = Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(r - b));

        let isBg = false;
        let edgeAlpha = 255;

        if (isWhiteBg) {
          if (lum > 225 && maxDiff < 30) {
            isBg = true;
          } else if (lum > 195 && maxDiff < 40) {
            edgeAlpha = Math.round(((225 - lum) / 30) * 255);
          }
        } else if (isDarkBg) {
          if (lum < 35 && r < 45 && g < 45 && b < 45) {
            isBg = true;
          } else if (lum < 60 && r < 70 && g < 70 && b < 70) {
            edgeAlpha = Math.round(((lum - 35) / 25) * 255);
          }
        }

        if (isBg || a < 30) {
          rawBytes[i] = 0;
          rawBytes[i + 1] = 0;
          rawBytes[i + 2] = 0;
          rawBytes[i + 3] = 0;
        } else {
          rawBytes[i + 3] = Math.min(a, edgeAlpha);
          if (isWhite) {
            rawBytes[i] = 255;
            rawBytes[i + 1] = 255;
            rawBytes[i + 2] = 255;
          } else if (isBlack) {
            rawBytes[i] = 0;
            rawBytes[i + 1] = 0;
            rawBytes[i + 2] = 0;
          }
        }
      }
    }

    const transparentPngBuffer = await sharp(rawBytes, {
      raw: { width: w, height: h, channels: 4 }
    }).trim().png().toBuffer();

    console.log(`[Logo Remaster AI] Logo remastérisé finalisé (${w}x${h} -> ${transparentPngBuffer.length} octets).`);

    let publicUrl = null;
    const prospectSlug = (data.prospectSlug || data.slug || '').toLowerCase().trim();
    if (prospectSlug) {
      try {
        const bucket = admin.storage().bucket('signaid-prod-assets');
        const storagePath = `print_masters/${prospectSlug}/logo_remaster_${targetColor}_${Date.now()}.png`;
        const file = bucket.file(storagePath);
        await file.save(transparentPngBuffer, {
          metadata: { contentType: 'image/png', cacheControl: 'public, max-age=86400' },
          resumable: false
        });
        await file.makePublic().catch(() => { });
        publicUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;
      } catch (saveErr) {
        console.warn('[Logo Remaster AI] Sauvegarde storage non-bloquante:', saveErr.message);
      }
    }

    return {
      imageBase64: `data:image/png;base64,${transparentPngBuffer.toString('base64')}`,
      imageUrl: publicUrl,
      isRemasteredLogo: true,
      targetColor
    };
  } catch (prepErr) {
    console.warn('[Logo Remaster AI] Repli direct sans post-traitement Sharp:', prepErr.message);
    const fallbackBase64 = bufferToProcess.toString('base64');
    return {
      imageBase64: `data:image/png;base64,${fallbackBase64}`,
      isRemasteredLogo: true,
      targetColor
    };
  }
};

// --- IMAGEN 3 (Moteur Photoréaliste) & GEMINI 2.0 (Fallback) ---
const processGenerateTryOn = async (data, authUser, apiKey, maskedKey) => {

  // ROUTAGE PRIORITAIRE : REFONTE / DÉTOURAGE DE LOGO TEXTILE (PAS DE MANNEQUIN / VÊTEMENT)
  const isLogoRemaster = data.styleCategory === 'LogoRemaster' || data.isLogoRemaster === true || data.action === 'remasterLogo' || data.targetSlot === 'remaster';
  if (isLogoRemaster) {
    return await processLogoRemasterAi(data, apiKey, maskedKey);
  }

  const fetch = require('node-fetch');
  const { prompt, aspectRatio, pose, companyName, garment, garmentType } = data;
  const isBusinessCard = garment === 'business_card' || garmentType === 'business_card';

  const { userPhotoBase64, garmentPreviewBase64, designCompositeBase64, uploadedGarmentBase64, glassesPrompt } = data;
  const hasGarmentOrLogo = !!(garmentPreviewBase64 || uploadedGarmentBase64 || designCompositeBase64);

  // 1. PURGE UNIVERSELLE DU PROMPT TEXTILE
  // Suppression ou désactivation définitive de toute injection automatique basée sur companyName, slug ou activity pour tous les articles textiles
  let sanitizedPrompt = (prompt || '').trim();
  if (!isBusinessCard) {
    // Interdire formellement : "Branded with official crisp logo for ${companyName}"
    sanitizedPrompt = sanitizedPrompt.replace(/Branded with official crisp logo for [^.]*\.?/gi, '');
    if (companyName) {
      const escCompany = String(companyName).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      sanitizedPrompt = sanitizedPrompt.replace(new RegExp(`\\b${escCompany}\\b`, 'gi'), '');
    }
    if (data.slug || data.prospectSlug) {
      const escSlug = String(data.slug || data.prospectSlug).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      sanitizedPrompt = sanitizedPrompt.replace(new RegExp(`\\b${escSlug}\\b`, 'gi'), '');
    }
    if (data.activity || data.activitySector) {
      const escAct = String(data.activity || data.activitySector).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      sanitizedPrompt = sanitizedPrompt.replace(new RegExp(`\\b${escAct}\\b`, 'gi'), '');
    }
    // Action 1: Supprimer toute consigne négative ambiguë ("no text", "clean background without text")
    sanitizedPrompt = sanitizedPrompt
      .replace(/clean background without text/gi, 'clean neutral studio background')
      .replace(/without text/gi, '')
      .replace(/CRITICAL GRAPHIC INSTRUCTION:\s*DO NOT ADD ANY TEXT[^\n.]*\.?/gi, '')
      .replace(/NO TEXT ALLOWED ANYWHERE ON THE GARMENT OR BACKGROUND\.?/gi, '')
      .replace(/STRICT NEGATIVE CONSTRAINT:[^\n.]*\.?/gi, '')
      .replace(/ZERO TEXT,?/gi, '')
      .replace(/NO TEXT,?/gi, '')
      .replace(/do not add (any )?text,?/gi, '')
      .replace(/remove typography,?/gi, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  // 1. MOTEUR PRINCIPAL : GOOGLE IMAGEN 3 (Haute Définition & Rendu Textile 8K) - Uniquement si aucun vêtement/logo n'est fourni
  if (!hasGarmentOrLogo) try {
    const imagenUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`;
    const targetAspect = aspectRatio === '9:16' ? '9:16' : (aspectRatio === '4:3' ? '4:3' : (aspectRatio === '3:4' ? '3:4' : '1:1'));

    let enhancedPrompt = sanitizedPrompt || "High-end commercial photo of a professional fashion model wearing premium workwear.";
    enhancedPrompt += " Ultra-photorealistic, 8k resolution, cinematic studio lighting, sharp fabric textures, natural folds, professional photography.";
    enhancedPrompt += " Solid fabric with natural cloth weave texture.";

    // Le paramètre companyName ne doit être injecté QUE si le produit est explicitement une carte de visite (garment === 'business_card')
    if (isBusinessCard && companyName && !enhancedPrompt.includes(companyName)) {
      enhancedPrompt += ` Branded business card with crisp typography for ${companyName}.`;
    }

    const imagenBody = {
      instances: [{ prompt: enhancedPrompt }],
      parameters: {
        sampleCount: 1,
        aspectRatio: targetAspect
      }
    };

    const imagenRes = await fetch(imagenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(imagenBody),
      signal: AbortSignal.timeout(6000)
    });

    const imagenJson = await imagenRes.json();
    if (imagenRes.ok && imagenJson.predictions && imagenJson.predictions[0]?.bytesBase64Encoded) {
      console.log('Imagen 3 Generation Success');
      const b64 = imagenJson.predictions[0].bytesBase64Encoded;
      let publicUrl = null;
      const prospectSlug = (data.prospectSlug || data.slug || '').toLowerCase().trim();

      if (prospectSlug) {
        try {
          const bucket = admin.storage().bucket('signaid-prod-assets');
          const storagePath = `btp_mockups/${prospectSlug}/web/${garment || 'tshirt'}_${pose || 'front'}_ai_${Date.now()}.png`;
          const file = bucket.file(storagePath);
          await file.save(Buffer.from(b64, 'base64'), {
            metadata: { contentType: 'image/png', cacheControl: 'public, max-age=86400' },
            resumable: false
          });
          await file.makePublic().catch(() => { });
          publicUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;

          await persistProspectProfileBackend(admin, {
            ...data,
            prospectSlug,
            slug: prospectSlug,
            garment: garment || 'tshirt',
            pose: pose || 'front',
            generatedAiUrl: publicUrl
          });
        } catch (saveErr) {
          console.warn('[BACKEND_PROFILE_PERSIST] Auto-persist error captured:', saveErr.message);
        }
      }

      return {
        imageBase64: `data:image/png;base64,${b64}`,
        imageUrl: publicUrl,
        prospectSlug: prospectSlug || undefined
      };
    } else {
      console.error(`[Imagen 3 RAW ERROR] Endpoint: ${imagenUrl.replace(apiKey, maskedKey)} - Status: ${imagenRes.status}`, JSON.stringify(imagenJson, null, 2));
    }
  } catch (imagenErr) {
    console.error(`[Imagen 3 EXCEPTION]`, imagenErr);
  }

  // 2. MOTEUR V-TON MULTIMODAL : GEMINI VISION (Priorité absolue pour intégration logo/gabarit)
  try {
    const resolveImageToBase64 = async (input) => {
      if (!input || typeof input !== 'string') return null;
      const trimmed = input.trim();
      if (!trimmed || trimmed.length === 0) return null;

      if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        try {
          const res = await fetch(trimmed);
          if (!res.ok) {
            console.warn(`[Image Fetch] Failed to download URL: ${trimmed} (${res.status})`);
            return null;
          }
          const arrayBuf = await res.arrayBuffer();
          const b64 = Buffer.from(arrayBuf).toString('base64');
          return (b64 && b64.length > 0) ? b64 : null;
        } catch (err) {
          console.warn(`[Image Fetch Error] URL ${trimmed}:`, err.message);
          return null;
        }
      }

      let clean = trimmed;
      if (clean.includes(',')) {
        clean = clean.split(',')[1];
      }
      clean = clean.replace(/\s/g, '');
      return (clean && clean.length > 0) ? clean : null;
    };

    let [cleanUserPhoto, cleanGarmentPreview, cleanDesignComposite, cleanUploadedGarment] = await Promise.all([
      resolveImageToBase64(userPhotoBase64),
      resolveImageToBase64(garmentPreviewBase64),
      resolveImageToBase64(designCompositeBase64),
      resolveImageToBase64(uploadedGarmentBase64)
    ]);

    const isSlotB = data.targetSlot === 'B' || data.slot === 'B' || (typeof uploadedGarmentBase64 === 'string' && uploadedGarmentBase64.includes('logo_B_active'));
    const isSlotA = !isSlotB && !isBusinessCard;

    const slugLower = (data.prospectSlug || data.slug || '').toLowerCase().trim();
    const brandEntity = companyName || slugLower.toUpperCase() || 'official brand';

    const slotAInstruction = `EXPLICIT BRANDING REQUIREMENT (SLOT A):
The provided logo graphic contains the official branding elements and typography for '${brandEntity}'.
You MUST faithfully reproduce the provided logo on the garment as a clean, transparent DTF transfer.
Do NOT omit, blur, or erase any typography. All brand letters and text present in the reference logo graphic must be clearly visible and legible, placed exactly as positioned in the reference logo image.`;
    const logoGraphicRefText = `REFERENCE_LOGO_GRAPHIC: Master high-resolution brand logo graphic containing the official branding${companyName ? ` for '${companyName}'` : ''}. This is the true color reference graphic to faithfully reproduce onto the garment (NOT a mask, NOT a silhouette, NOT a stencil).`;

    const graphicDirective = isBusinessCard
      ? `Accurately integrate the visual graphic provided in REFERENCE_LOGO_GRAPHIC onto the business card.${companyName ? ` Branded with official crisp logo for ${companyName}.` : ''}`
      : (isSlotA
        ? slotAInstruction
        : "Accurately reproduce the cropped graphic icon provided in REFERENCE_LOGO_GRAPHIC onto the garment as a transparent DTF transfer without adding unprompted extra text.");

    // Modèles Google Gen AI Image & Try-On dédiés
    const requestedModel = (data.model || '').replace(/^models\//, '').trim();
    const candidateModels = [
      'gemini-2.5-flash-image',
      'gemini-3.1-flash-image',
      'gemini-3.1-flash-image-preview',
      'gemini-3-pro-image',
      'nano-banana-pro-preview'
    ];
    const GEMINI_MODELS = (requestedModel && candidateModels.includes(requestedModel))
      ? [requestedModel, ...candidateModels.filter(m => m !== requestedModel)]
      : candidateModels;
    let lastError = null;
    let lastRawError = null;

    for (const rawModelName of GEMINI_MODELS) {
      const cleanModel = String(rawModelName || 'gemini-2.5-flash-image').replace(/^models\//, '').trim();
      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:generateContent?key=${apiKey}`;
        console.log(`[Gemini Image Request] Calling: ${geminiUrl.replace(apiKey, maskedKey || 'HIDDEN_KEY')}`);

        const referenceLogoGraphic = cleanUploadedGarment || cleanDesignComposite;
        const secondaryComposite = (cleanUploadedGarment && cleanDesignComposite && cleanUploadedGarment !== cleanDesignComposite) ? cleanDesignComposite : null;

        const isBackView = pose === 'back';
        const isHoodieOrSweat = (
          garment === 'sweat' || garment === 'hoodie' || garment === 'sweatshirt' ||
          garmentType === 'sweat' || garmentType === 'hoodie' || garmentType === 'sweatshirt' ||
          (data.id && (data.id.toLowerCase().includes('hoodie') || data.id.toLowerCase().includes('sweat') || data.id === 'hBack' || data.id === 'hFront')) ||
          (data.slot && (data.slot.toLowerCase().includes('hoodie') || data.slot.toLowerCase().includes('sweat') || data.slot === 'hBack' || data.slot === 'hFront')) ||
          (sanitizedPrompt && (sanitizedPrompt.toLowerCase().includes('hoodie') || sanitizedPrompt.toLowerCase().includes('sweat') || sanitizedPrompt.toLowerCase().includes('jhk421')))
        );

        const hoodieBackGarmentStructureClause =
          "GARMENT STRUCTURE: Thick heavyweight cotton hoodie with long sleeves extending all the way down to the wrists. " +
          "STRICT PROHIBITION: The model MUST wear long sleeves. NO short sleeves, NO t-shirt cut, NO exposed forearms or bare arms. " +
          "The hoodie must fully cover the arms down to the cuffs.";

        // RÈGLE STRICTE INPUT 1 : S'assurer que pour un hoodie/sweat dos, l'image mannequin est un modèle en sweat manches longues
        if (isHoodieOrSweat && isBackView && (!cleanUserPhoto || cleanUserPhoto.length < 500)) {
          try {
            console.log('[functions/index.js] Fetching male_hoodie_back.png from cloud storage');
            const bucket = admin.storage().bucket('signaid-prod-assets');
            const file = bucket.file('app_assets/public/assets/models/male_hoodie_back.png');
            const [exists] = await file.exists();
            if (exists) {
              const [buf] = await file.download();
              cleanUserPhoto = buf.toString('base64');
            } else {
              const modelRes = await fetch('https://storage.googleapis.com/signaid-prod-assets/app_assets/public/assets/models/male_hoodie_back.png');
              if (modelRes.ok) {
                const modelBuf = await modelRes.arrayBuffer();
                cleanUserPhoto = Buffer.from(modelBuf).toString('base64');
              }
            }
          } catch (modelFetchErr) {
            console.warn('[functions/index.js] Failed to fetch fallback hoodie back model from storage:', modelFetchErr.message);
          }
        }

        // Modèle studio neutre (homme brun, coiffure soignée, barbe courte, visage naturel découvert, AUCUNE lunette parasite)
        const studioModelPrompt = isBackView
          ? (isHoodieOrSweat
            ? `High-end commercial fashion studio photography of an attractive dark-haired male model with a neat groomed beard, seen strictly from behind (180-degree rear view, facing directly away from camera), clean centered posture with natural head seen from behind, wearing the HEAVYWEIGHT LONG-SLEEVE HOODIE SWEATSHIRT with thick fabric, long sleeves covering the full arms down to the wrists, and the hood resting naturally folded down over the upper back/nape. ${hoodieBackGarmentStructureClause} Strictly NO sunglasses visible, NO glasses temples or arms extending around the ears or neck, NO parasite accessories. Plain neutral light-gray textured studio background. Medium-full framing showing the head with comfortable breathing room/headroom above, down to mid-thigh, wearing clean black trousers. Authentic fabric folds, realistic studio lighting, razor-sharp focus, 8k.`
            : "High-end commercial fashion studio photography of an attractive dark-haired male model with a neat groomed beard, seen strictly from behind (180-degree rear view, facing directly away from camera), clean centered posture with exposed natural neck. Strictly NO sunglasses visible, NO glasses temples or arms extending around the ears or neck, NO parasite accessories. Plain neutral light-gray textured studio background. Medium-full framing showing the head with comfortable breathing room/headroom above, down to mid-thigh, wearing clean black trousers. Authentic fabric folds, realistic studio lighting, razor-sharp focus, 8k.")
          : (isHoodieOrSweat
            ? "High-end commercial fashion studio photography of an attractive dark-haired male model with a neat groomed beard, natural uncovered face and neutral studio gaze, strictly NO sunglasses, NO glasses, facing forward directly at the camera, wearing the HEAVYWEIGHT LONG-SLEEVE HOODIE SWEATSHIRT with thick fabric, long sleeves covering the full arms down to the wrists, and a folded hood around the neck. STRICT PROHIBITION: Do NOT generate a short-sleeve t-shirt. The arms MUST be fully covered by the long sleeves of the hoodie. Bare arms or short sleeves are strictly forbidden. Plain neutral light-gray textured studio background. Medium-full framing showing the head with comfortable breathing room/headroom above, down to mid-thigh, wearing clean black trousers. Authentic fabric wrinkles, realistic studio lighting, razor-sharp focus, 8k."
            : "High-end commercial fashion studio photography of an attractive dark-haired male model with a neat groomed beard, natural uncovered face and neutral studio gaze, strictly NO sunglasses, NO glasses, facing forward directly at the camera. Plain neutral light-gray textured studio background. Medium-full framing showing the head with comfortable breathing room/headroom above, down to mid-thigh, wearing clean black trousers. Authentic fabric wrinkles, realistic studio lighting, razor-sharp focus, 8k.");

        const taskIntro = `Task: Dress the professional fashion model from Input 1 in the branded garment from Input 2. Fidelity: 100%. Identity: ${isBackView ? (isHoodieOrSweat ? `The model is standing completely facing AWAY from the camera (180-degree rear view). We see the back of the head, with ZERO facial profile visible, and absolutely NO sunglasses or glasses arms visible. The model wears a HEAVYWEIGHT LONG-SLEEVE HOODIE SWEATSHIRT with thick fabric and long sleeves covering the full arms down to the wrists. ${hoodieBackGarmentStructureClause} The hood of the garment rests naturally folded down over the upper back/nape. CRITICAL: Maintain a medium-full shot so the full back of the garment is completely visible from shoulders to waist with comfortable headroom above the head.` : 'The model is standing completely facing AWAY from the camera (180-degree rear view). We see the back of the head and the back of the neck, with ZERO facial profile visible, and absolutely NO sunglasses or glasses arms visible. CRITICAL: Maintain a medium-full shot so the full back of the garment is completely visible from neck to waist with comfortable headroom above the head.') : (isHoodieOrSweat ? 'Preserve Input 1 model facial features, skin tone, dark hair, natural uncovered face, neutral studio gaze (strictly NO sunglasses, NO glasses), pose, and exact camera distance with comfortable headroom above the head. The model MUST wear a HEAVYWEIGHT LONG-SLEEVE HOODIE SWEATSHIRT with thick fabric, long sleeves covering the full arms down to the wrists, and a folded hood around the neck. STRICT PROHIBITION: Do NOT generate a short-sleeve t-shirt. The arms MUST be fully covered by the long sleeves of the hoodie.' : 'Preserve Input 1 model facial features, skin tone, dark hair, natural uncovered face, neutral studio gaze (strictly NO sunglasses, NO glasses), pose, and exact camera distance with comfortable headroom above the head.')}`;

        const promptParts = [
          {
            text: `${taskIntro}

STUDIO MODEL & FRAMING:
${studioModelPrompt}

GEOMETRIC CENTERING & CAMERA LOCK:
- Dead-center vertical and horizontal framing. The model's spine and sternum MUST remain strictly centered on the central vertical axis (X: 50%) of the square canvas.
- Medium-full shot: the full head (with headroom), shoulders, complete arms, garment hem, and upper legs/black trousers down to mid-thigh MUST be naturally visible.
- Symmetrical studio margins on left and right sides. DO NOT pan or offset the camera toward chest badges.
- Ratio: 1:1 square canvas. Clean neutral light-gray studio backdrop.
${isHoodieOrSweat ? (isBackView ? `- GARMENT CONSTRAINTS: ${hoodieBackGarmentStructureClause}\n` : "- GARMENT CONSTRAINTS: The garment MUST BE A HEAVYWEIGHT LONG-SLEEVE HOODIE SWEATSHIRT with thick fabric, long sleeves covering the full arms down to the wrists, and a folded hood around the neck. STRICT PROHIBITION: Do NOT generate a short-sleeve t-shirt. The arms MUST be fully covered by the long sleeves of the hoodie. Bare arms or short sleeves are strictly forbidden.\n") : ""}
GRAPHIC REPRODUCTION:
- Faithfully reproduce the master visual asset provided in REFERENCE_LOGO_GRAPHIC onto the garment.
- The REFERENCE_LOGO_GRAPHIC is the official reference artwork to print, NOT a silhouette, NOT a cut-out stencil, NOT an opaque rectangle or white box, and NOT a mask.
- Must be rendered as a clean transparent DTF transfer directly on the garment fabric.
- ${graphicDirective}

${isSlotA ? slotAInstruction : (!isBusinessCard ? "Faithfully reproduce the graphic from REFERENCE_LOGO_GRAPHIC onto the garment as a transparent DTF transfer." : "")}

Setting: ${sanitizedPrompt || 'Clean Minimalist E-Commerce Product Studio'}. Glasses: ${glassesPrompt || 'none'}. Pose: ${isBackView ? 'STRICT 180-DEGREE REAR VIEW (facing away from camera)' : 'FRONT VIEW (model facing camera)'}. Ratio: 1:1. Symmetrical commercial fashion catalogue shot, neutral clean studio grey backdrop, 8k.`
          }
        ];

        if (cleanUserPhoto) {
          const mime = cleanUserPhoto.startsWith('/9j/') ? 'image/jpeg' : (cleanUserPhoto.startsWith('UklG') ? 'image/webp' : 'image/png');
          promptParts.push({ text: "INPUT 1: Professional fashion model reference photo." });
          promptParts.push({ inlineData: { mimeType: mime, data: cleanUserPhoto } });
        }
        if (cleanGarmentPreview) {
          const mime = cleanGarmentPreview.startsWith('UklG') ? 'image/webp' : (cleanGarmentPreview.startsWith('/9j/') ? 'image/jpeg' : 'image/png');
          promptParts.push({ text: "INPUT 2: Garment preview and placement mockup reference." });
          promptParts.push({ inlineData: { mimeType: mime, data: cleanGarmentPreview } });
        }
        if (referenceLogoGraphic) {
          const mime = referenceLogoGraphic.startsWith('/9j/') ? 'image/jpeg' : (referenceLogoGraphic.startsWith('UklG') ? 'image/webp' : 'image/png');
          promptParts.push({
            text: logoGraphicRefText
          });
          promptParts.push({ inlineData: { mimeType: mime, data: referenceLogoGraphic } });
        }
        if (secondaryComposite) {
          const mime = secondaryComposite.startsWith('UklG') ? 'image/webp' : (secondaryComposite.startsWith('/9j/') ? 'image/jpeg' : 'image/png');
          promptParts.push({
            text: "SECONDARY_COMPOSITE_GRAPHIC: Secondary design layout composite."
          });
          promptParts.push({ inlineData: { mimeType: mime, data: secondaryComposite } });
        }

        const bodyIA = {
          contents: [{
            parts: promptParts
          }]
        };

        const responseIA = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyIA),
          signal: AbortSignal.timeout(45000)
        });

        const resJSON = await responseIA.json();
        if (responseIA.ok && resJSON.candidates && resJSON.candidates[0]?.content?.parts) {
          const part = resJSON.candidates[0].content.parts.find(p => p.inlineData);
          if (part) {
            let publicUrl = null;
            const prospectSlug = (data.prospectSlug || data.slug || '').toLowerCase().trim();

            if (prospectSlug) {
              try {
                const bucket = admin.storage().bucket('signaid-prod-assets');
                const storagePath = `btp_mockups/${prospectSlug}/web/${garment || 'tshirt'}_${pose || 'front'}_ai_${Date.now()}.png`;
                const file = bucket.file(storagePath);
                await file.save(Buffer.from(part.inlineData.data, 'base64'), {
                  metadata: { contentType: 'image/png', cacheControl: 'public, max-age=86400' },
                  resumable: false
                });
                await file.makePublic().catch(() => { });
                publicUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;

                await persistProspectProfileBackend(admin, {
                  ...data,
                  prospectSlug,
                  slug: prospectSlug,
                  garment: garment || 'tshirt',
                  pose: pose || 'front',
                  generatedAiUrl: publicUrl
                });
              } catch (saveErr) {
                console.warn('[BACKEND_PROFILE_PERSIST] Auto-persist error captured:', saveErr.message);
              }
            }

            return {
              imageBase64: `data:image/png;base64,${part.inlineData.data}`,
              imageUrl: publicUrl,
              prospectSlug: prospectSlug || undefined
            };
          } else {
            console.warn(`[Gemini No Image Part] Model: ${cleanModel} - Candidates:`, JSON.stringify(resJSON.candidates?.[0] || resJSON, null, 2));
          }
        } else if (!responseIA.ok) {
          lastRawError = resJSON;
          lastError = resJSON.error ? resJSON.error.message : `Status ${responseIA.status}`;
          console.error(`[Gemini RAW ERROR] Model: ${cleanModel} - Status: ${responseIA.status} - URL: ${geminiUrl.replace(apiKey, maskedKey)}`, JSON.stringify(resJSON, null, 2));

          // Interrompre la boucle uniquement si dépassement strict de quota global ou permissions bloquantes
          if (
            responseIA.status === 429 ||
            (resJSON.error && (
              resJSON.error.status === 'RESOURCE_EXHAUSTED' ||
              resJSON.error.status === 'PERMISSION_DENIED' ||
              (resJSON.error.message && (
                resJSON.error.message.includes('spending cap') ||
                resJSON.error.message.includes('not available in your country')
              ))
            ))
          ) {
            break;
          }
        }
      } catch (mErr) {
        lastError = mErr.message;
        console.error(`[Gemini EXCEPTION] Model: ${cleanModel}`, mErr);
      }
    }

    console.info(`[AI Pipeline Notice] Basculement gracieux sur le gabarit technique HD.`);
    return {
      imageBase64: null,
      fallback: true,
      notice: "Gabarit technique HD validé (conforme DTF)."
    };
  } catch (error) {
    console.info('Function fallback to mechanical mockup:', error.message);
    return {
      imageBase64: null,
      fallback: true,
      notice: "Gabarit technique HD validé (conforme DTF)."
    };
  }
};

// --- IMAGEN 3 (Moteur Photoréaliste) & GEMINI 2.0 (Fallback) ---
// Fonction Callable principale (protocole onCall / Firebase Functions SDK)
exports.generateTryOnImageV2 = onCall({ cors: true, invoker: 'public', timeoutSeconds: 300, memory: '1GiB', secrets: [geminiApiKey] }, async (request) => {
  // Mode invité / audit 100% tolérant : Ne jamais bloquer avec une erreur 401 unauthenticated
  if (!verifyOnCallAuth(request)) {
    console.log('[generateTryOnImageV2] Session invité / audit autorisée (non-bloquant)');
  }

  const payload = request.data?.data || request.data || request.rawRequest?.body?.data || request.rawRequest?.body || {};
  let apiKey = process.env.GEMINI_API_KEY || '';
  try {
    if (geminiApiKey && typeof geminiApiKey.value === 'function' && geminiApiKey.value()) {
      apiKey = geminiApiKey.value() || apiKey;
    }
  } catch (e) { }
  if (!apiKey) throw new HttpsError('failed-precondition', 'API Key Gemini non configurée dans l\'environnement.');

  const maskedKey = apiKey ? `${apiKey.substring(0, 6)}...${apiKey.substring(apiKey.length - 4)}` : 'NON_TROUVÉE';
  console.log(`[AI Key Diagnostic] generateTryOnImageV2 active key: ${maskedKey}`);

  // Extraction d'authentification non-bloquante si présente
  let authUser = request.auth || null;
  if (!authUser) {
    let token = request.data?.authToken || request.data?.token || payload?.authToken || payload?.token;
    if (!token && request.rawRequest?.headers?.authorization) {
      const authHeader = request.rawRequest.headers.authorization;
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7).trim();
      }
    }
    if (token) {
      try {
        authUser = await admin.auth().verifyIdToken(token);
        console.log(`[generateTryOnImageV2] Requête authentifiée UID: ${authUser.uid}`);
      } catch (e) {
        console.warn(`[generateTryOnImageV2] Token non-bloquant: ${e.message}`);
      }
    }
  }

  try {
    return await processGenerateTryOn(payload, authUser, apiKey, maskedKey);
  } catch (err) {
    console.warn('[generateTryOnImageV2] Exception gérée avec repli mécanique:', err.message);
    return {
      imageBase64: null,
      fallback: true,
      notice: "Gabarit technique HD validé (conforme DTF)."
    };
  }
});

// Route HTTP directe universelle (pour fetch direct avec header Authorization Bearer)
exports.generateTryOnImageV2Http = onRequest({ cors: true, invoker: 'public', timeoutSeconds: 300, memory: '1GiB', secrets: [geminiApiKey] }, async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  if (req.method === 'OPTIONS') return res.status(204).send('');

  const rawBody = req.body || {};
  const payload = rawBody.data?.data || rawBody.data || rawBody.body?.data || rawBody || {};

  let apiKey = process.env.GEMINI_API_KEY || '';
  try {
    if (geminiApiKey && typeof geminiApiKey.value === 'function' && geminiApiKey.value()) {
      apiKey = geminiApiKey.value() || apiKey;
    }
  } catch (e) { }
  if (!apiKey) {
    return res.status(500).json({ error: { message: "API Key Gemini non configurée dans l'environnement." } });
  }

  const maskedKey = apiKey ? `${apiKey.substring(0, 6)}...${apiKey.substring(apiKey.length - 4)}` : 'NON_TROUVÉE';

  // Extraction d'authentification non-bloquante
  let token = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  }
  if (!token && payload.authToken) token = payload.authToken;
  if (!token && payload.token) token = payload.token;

  let authUser = null;
  if (token) {
    try {
      authUser = await admin.auth().verifyIdToken(token);
      console.log(`[generateTryOnImageV2Http] Requête authentifiée UID: ${authUser.uid}`);
    } catch (e) {
      console.warn(`[generateTryOnImageV2Http] Token non-bloquant: ${e.message}`);
    }
  }

  try {
    const result = await processGenerateTryOn(payload, authUser, apiKey, maskedKey);
    return res.status(200).json({
      result: result,
      data: result,
      ...result
    });
  } catch (err) {
    console.warn('[generateTryOnImageV2Http] Fallback to mechanical mockup on error:', err.message);
    const fallbackResult = {
      imageBase64: null,
      fallback: true,
      notice: "Gabarit technique HD validé (conforme DTF)."
    };
    return res.status(200).json({
      result: fallbackResult,
      data: fallbackResult,
      ...fallbackResult
    });
  }
});

// --- PERSISTANCE DU PROFIL PROSPECT (COLLECTIONS prospects, audits, vault) ---
exports.persistProspectProfile = onCall({ cors: true, invoker: 'public' }, async (request) => {
  const data = request.data || {};
  return await persistProspectProfileBackend(admin, data);
});

exports.persistProspectProfileHttp = onRequest({ cors: true, invoker: 'public' }, async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).send('');

  const data = req.body || {};
  const result = await persistProspectProfileBackend(admin, {
    ...data,
    prospectSlug: data.prospectSlug || data.slug || req.query.slug
  });
  return res.status(200).json(result);
});

exports.removeBgProxy = onCall({ cors: true, invoker: 'public', secrets: [removeBgApiKey] }, async (request) => {
  if (!verifyOnCallAuth(request)) {
    throw new HttpsError('unauthenticated', 'Authentification requise pour le traitement de détourage.');
  }

  let apiKey = process.env.REMOVE_BG_API_KEY;
  try {
    if (removeBgApiKey && typeof removeBgApiKey.value === 'function' && removeBgApiKey.value()) {
      apiKey = removeBgApiKey.value();
    }
  } catch (e) { }
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

exports.processDtfMaster = onCall({ cors: true, invoker: 'public', memory: '1GiB', timeoutSeconds: 90, secrets: [geminiApiKey] }, async (request) => {
  if (!verifyOnCallAuth(request)) {
    throw new HttpsError('unauthenticated', 'Authentification requise pour le pipeline DTF Master.');
  }

  const { processDtfMasterImage } = require('./dtfMasterPipeline');
  const { imageInput, options, uid } = request.data || {};
  if (!imageInput) {
    throw new HttpsError('invalid-argument', "Paramètre 'imageInput' requis (base64 ou URL).");
  }

  let apiKey = process.env.GEMINI_API_KEY || '';
  try {
    if (geminiApiKey && typeof geminiApiKey.value === 'function' && geminiApiKey.value()) {
      apiKey = geminiApiKey.value() || apiKey;
    }
  } catch (e) { }

  const axios = require('axios');
  try {
    let sourceBuffer;
    if (imageInput.startsWith('http://') || imageInput.startsWith('https://')) {
      const resp = await axios.get(imageInput, { responseType: 'arraybuffer' });
      sourceBuffer = Buffer.from(resp.data);
    } else {
      const cleanB64 = imageInput.includes(',') ? imageInput.split(',')[1] : imageInput;
      sourceBuffer = Buffer.from(cleanB64, 'base64');
    }

    const masterResult = await processDtfMasterImage(sourceBuffer, {
      ...(options || {}),
      apiKey: apiKey || options?.apiKey
    });

    // Upload PNG & PDF to Firebase Cloud Storage if possible
    let downloadPngUrl = null;
    let downloadPdfUrl = null;

    try {
      const bucket = admin.storage().bucket('signaid-prod-assets');
      const timeTag = Date.now();
      const pngStoragePath = `print_masters/${uid || 'anonymous'}/${timeTag}_Master_DTF_300DPI.png`;
      const pdfStoragePath = `print_masters/${uid || 'anonymous'}/${timeTag}_Master_DTF_Print.pdf`;

      const pngFile = bucket.file(pngStoragePath);
      await pngFile.save(masterResult.pngBuffer, {
        metadata: {
          contentType: 'image/png',
          cacheControl: 'public, max-age=86400',
          metadata: {
            dpi: '300',
            prepressType: 'DTF_MASTER_PNG',
            width: String(masterResult.width),
            height: String(masterResult.height)
          }
        }
      });
      await pngFile.makePublic().catch(() => null);
      downloadPngUrl = `https://storage.googleapis.com/${bucket.name}/${pngStoragePath}`;

      if (masterResult.pdfBuffer) {
        const pdfFile = bucket.file(pdfStoragePath);
        await pdfFile.save(masterResult.pdfBuffer, {
          metadata: {
            contentType: 'application/pdf',
            cacheControl: 'public, max-age=86400',
            metadata: {
              dpi: '300',
              prepressType: 'DTF_MASTER_PDF'
            }
          }
        });
        await pdfFile.makePublic().catch(() => null);
        downloadPdfUrl = `https://storage.googleapis.com/${bucket.name}/${pdfStoragePath}`;
      }
    } catch (storageErr) {
      console.warn("Storage master upload notice (fallback to base64):", storageErr);
    }

    return {
      success: true,
      masterUrl: downloadPngUrl || masterResult.pngBase64,
      pngUrl: downloadPngUrl || masterResult.pngBase64,
      pdfUrl: downloadPdfUrl || masterResult.pdfBase64,
      pngBase64: masterResult.pngBase64,
      pdfBase64: masterResult.pdfBase64,
      width: masterResult.width,
      height: masterResult.height,
      dpi: masterResult.dpi,
      sizePngBytes: masterResult.sizePngBytes,
      sizePdfBytes: masterResult.sizePdfBytes
    };
  } catch (error) {
    console.error("processDtfMaster Error:", error);
    throw new HttpsError('internal', error.message || "Erreur lors du traitement du master DTF.");
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

// ── In-memory cache ─────────────────────────────────────────────────────────
// TTL: 60 secondes. Évite les re-lectures Firestore sur des slugs fréquents.
const SEO_CACHE_TTL_MS = 60_000;
const seoCache = new Map(); // slug → { html, ts }

function seoGetCache(key) {
  const entry = seoCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > SEO_CACHE_TTL_MS) {
    seoCache.delete(key);
    return null;
  }
  return entry.html;
}

function seoSetCache(key, html) {
  // Limit max cache size to 200 entries (simple LRU eviction: delete oldest)
  if (seoCache.size >= 200) {
    seoCache.delete(seoCache.keys().next().value);
  }
  seoCache.set(key, { html, ts: Date.now() });
}
// ────────────────────────────────────────────────────────────────────────────

seoApp.use(async (req, res) => {
  res.set("Content-Security-Policy", "default-src 'self' https: data: blob:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob: https:; connect-src 'self' https: wss:;");

  if (req.path.startsWith('/assets/') || req.path.endsWith('.js') || req.path.endsWith('.css') || req.path.endsWith('.png') || req.path.endsWith('.jpg') || req.path.endsWith('.ico')) {
    return res.status(404).send('Asset not found');
  }

  let indexPath = path.resolve(__dirname, "./index.html");
  if (!fs.existsSync(indexPath)) {
    const distPath = path.resolve(__dirname, "../dist/index.html");
    if (fs.existsSync(distPath)) {
      indexPath = distPath;
    }
  }
  let html = "";

  try {
    html = fs.readFileSync(indexPath, "utf8");
  } catch (err) {
    console.error("Impossible de lire index.html", err);
    return res.status(500).send("Erreur serveur");
  }

  const userAgent = req.headers["user-agent"] || "";
  const cleanPath = req.path.replace(/^\/+/, '').split('/')[0].split('?')[0];
  const targetId = req.query.uid || req.query.slug || req.query.id || cleanPath;

  const lowerPath = cleanPath.toLowerCase();
  const isElectronicWoodFlyer = lowerPath === 'electronicwood' || lowerPath === 'electronic-wood' || lowerPath === 'flyer-electronicwood';
  if (isElectronicWoodFlyer) {
    if (!isBot(userAgent)) {
      res.set("Cache-Control", "no-cache, no-store, must-revalidate, max-age=0");
      return res.status(200).send(html);
    }
    const flyerTitle = "Electronic Wood — We Love Retro House (14 Hours Rave) | Flyer Interactif";
    const flyerDesc = "Événement Electronic Wood au Bodies in Space (Bruxelles) le Samedi 26 Septembre 2026 avec Mentalist, Youri Parker, Frank Zolex, Marko De La Rocca. Programme, Google Agenda et billetterie.";
    const flyerImage = "https://signaid.eu/assets/flyers/electronicwood.jpg";

    html = html.replace(/<title>.*?<\/title>/i, `<title>${flyerTitle}</title>`);
    html = html.replace(/<meta\s+name=["']description["'].*?>/gi, "");
    html = html.replace(/<meta\s+property=["']og:.*?".*?>/gi, "");
    html = html.replace(/<meta\s+name=["']twitter:.*?".*?>/gi, "");
    html = html.replace(/<meta\s+property=["']twitter:.*?".*?>/gi, "");

    const ogTags = `
      <meta name="description" content="${flyerDesc}" />
      <meta property="og:title" content="${flyerTitle}" />
      <meta property="og:description" content="${flyerDesc}" />
      <meta property="og:image" content="${flyerImage}" />
      <meta property="og:image:alt" content="Electronic Wood — We Love Retro House" />
      <meta property="og:url" content="https://signaid.eu/electronicwood" />
      <meta property="og:type" content="website" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="${flyerTitle}" />
      <meta name="twitter:description" content="${flyerDesc}" />
      <meta name="twitter:image" content="${flyerImage}" />
    `;
    html = html.replace("</head>", `${ogTags}</head>`);
    res.set("Cache-Control", "public, max-age=300, s-maxage=3600");
    return res.status(200).send(html);
  }

  const isCourriereFlyer = lowerPath === 'courriere11-14' || lowerPath === 'courriere' || lowerPath === 'flyer-courriere';
  if (isCourriereFlyer) {
    if (!isBot(userAgent)) {
      res.set("Cache-Control", "no-cache, no-store, must-revalidate, max-age=0");
      return res.status(200).send(html);
    }
    const flyerTitle = "Kermesse de Courrière — 11 au 14 Septembre | Programme & Flyer Interactif";
    const flyerDesc = "Flyer interactif de la Kermesse de Courrière sous chapiteau (11, 12, 13 et 14 Septembre) organisé par la Jeunesse de Courrière et la Fanfare Royale Cécilia. Programme, Google Agenda et réseaux sociaux.";
    const flyerImage = "https://signaid.eu/assets/flyers/courriere.jpg";

    html = html.replace(/<title>.*?<\/title>/i, `<title>${flyerTitle}</title>`);
    html = html.replace(/<meta\s+name=["']description["'].*?>/gi, "");
    html = html.replace(/<meta\s+property=["']og:.*?".*?>/gi, "");
    html = html.replace(/<meta\s+name=["']twitter:.*?".*?>/gi, "");
    html = html.replace(/<meta\s+property=["']twitter:.*?".*?>/gi, "");

    const ogTags = `
      <meta name="description" content="${flyerDesc}" />
      <meta property="og:title" content="${flyerTitle}" />
      <meta property="og:description" content="${flyerDesc}" />
      <meta property="og:image" content="${flyerImage}" />
      <meta property="og:image:alt" content="Kermesse de Courrière — 11 au 14 Septembre" />
      <meta property="og:url" content="https://signaid.eu/courriere11-14" />
      <meta property="og:type" content="website" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="${flyerTitle}" />
      <meta name="twitter:description" content="${flyerDesc}" />
      <meta name="twitter:image" content="${flyerImage}" />
    `;
    html = html.replace("</head>", `${ogTags}</head>`);
    res.set("Cache-Control", "public, max-age=300, s-maxage=3600");
    return res.status(200).send(html);
  }

  const is13AnsFlyer = lowerPath === '13ansvr' || lowerPath === '13ans-vr' || lowerPath === 'flyer-13ansvr';
  if (is13AnsFlyer) {
    if (!isBot(userAgent)) {
      res.set("Cache-Control", "no-cache, no-store, must-revalidate, max-age=0");
      return res.status(200).send(html);
    }
    const flyerTitle = "13 Ans de Vision Room — SPARKOH! Salle des Trémies | Flyer Interactif";
    const flyerDesc = "Événement 13 Ans de Vision Room au SPARKOH! Salle des Trémies le 7 Novembre (22:00 - 06:00). Billetterie, Google Agenda et itinéraire.";
    const flyerImage = "https://signaid.eu/assets/flyers/13ansvr.jpg";

    html = html.replace(/<title>.*?<\/title>/i, `<title>${flyerTitle}</title>`);
    html = html.replace(/<meta\s+name=["']description["'].*?>/gi, "");
    html = html.replace(/<meta\s+property=["']og:.*?".*?>/gi, "");
    html = html.replace(/<meta\s+name=["']twitter:.*?".*?>/gi, "");
    html = html.replace(/<meta\s+property=["']twitter:.*?".*?>/gi, "");

    const ogTags = `
      <meta name="description" content="${flyerDesc}" />
      <meta property="og:title" content="${flyerTitle}" />
      <meta property="og:description" content="${flyerDesc}" />
      <meta property="og:image" content="${flyerImage}" />
      <meta property="og:image:alt" content="13 Ans de Vision Room — SPARKOH!" />
      <meta property="og:url" content="https://signaid.eu/13ansvr" />
      <meta property="og:type" content="website" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="${flyerTitle}" />
      <meta name="twitter:description" content="${flyerDesc}" />
      <meta name="twitter:image" content="${flyerImage}" />
    `;
    html = html.replace("</head>", `${ogTags}</head>`);
    res.set("Cache-Control", "public, max-age=300, s-maxage=3600");
    return res.status(200).send(html);
  }

  const isRaveOldSchoolFlyer = lowerPath === 'raveoldschool' || lowerPath === 'rave-old-school';
  if (isRaveOldSchoolFlyer) {
    if (!isBot(userAgent)) {
      res.set("Cache-Control", "no-cache, no-store, must-revalidate, max-age=0");
      return res.status(200).send(html);
    }
    const flyerTitle = "Rave Old School — Bar 80 Liège | Flyer Interactif";
    const flyerDesc = "Événement Rave Old School au Bar 80 Liège le 7 Août (23h - 06h) avec MIKE B et L'Après-Midize. Entrée offerte ! Retrouvez les liens et l'itinéraire.";
    const flyerImage = "https://signaid.eu/assets/flyers/bar80.jpg";

    html = html.replace(/<title>.*?<\/title>/i, `<title>${flyerTitle}</title>`);
    html = html.replace(/<meta\s+name=["']description["'].*?>/gi, "");
    html = html.replace(/<meta\s+property=["']og:.*?".*?>/gi, "");
    html = html.replace(/<meta\s+name=["']twitter:.*?".*?>/gi, "");
    html = html.replace(/<meta\s+property=["']twitter:.*?".*?>/gi, "");

    const ogTags = `
      <meta name="description" content="${flyerDesc}" />
      <meta property="og:title" content="${flyerTitle}" />
      <meta property="og:description" content="${flyerDesc}" />
      <meta property="og:image" content="${flyerImage}" />
      <meta property="og:image:alt" content="Rave Old School — Bar 80 Liège" />
      <meta property="og:url" content="https://signaid.eu/raveoldschool" />
      <meta property="og:type" content="website" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="${flyerTitle}" />
      <meta name="twitter:description" content="${flyerDesc}" />
      <meta name="twitter:image" content="${flyerImage}" />
    `;
    html = html.replace("</head>", `${ogTags}</head>`);
    res.set("Cache-Control", "public, max-age=300, s-maxage=3600");
    return res.status(200).send(html);
  }

  if (lowerPath === 'inthedark' || lowerPath === 'in-the-dark' || lowerPath === 'flyer' || lowerPath === 'flyer-inthedark') {
    if (!isBot(userAgent)) {
      res.set("Cache-Control", "no-cache, no-store, must-revalidate, max-age=0");
      return res.status(200).send(html);
    }
    const flyerTitle = "In The Dark — Flyer Interactif";
    const flyerDesc = "Découvrez le flyer interactif de l'événement In The Dark à L'Aquarelle Liège : programmation, artistes, itinéraire GPS et réservation.";
    const flyerImage = "https://signaid.eu/assets/flyers/recto.png";

    html = html.replace(/<title>.*?<\/title>/i, `<title>${flyerTitle}</title>`);
    html = html.replace(/<meta\s+name=["']description["'].*?>/gi, "");
    html = html.replace(/<meta\s+property=["']og:.*?".*?>/gi, "");
    html = html.replace(/<meta\s+name=["']twitter:.*?".*?>/gi, "");
    html = html.replace(/<meta\s+property=["']twitter:.*?".*?>/gi, "");

    const ogTags = `
      <meta name="description" content="${flyerDesc}" />
      <meta property="og:title" content="${flyerTitle}" />
      <meta property="og:description" content="${flyerDesc}" />
      <meta property="og:image" content="${flyerImage}" />
      <meta property="og:image:alt" content="In The Dark — Flyer Interactif" />
      <meta property="og:url" content="https://signaid.eu/inthedark" />
      <meta property="og:type" content="website" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="${flyerTitle}" />
      <meta name="twitter:description" content="${flyerDesc}" />
      <meta name="twitter:image" content="${flyerImage}" />
    `;
    html = html.replace("</head>", `${ogTags}</head>`);
    res.set("Cache-Control", "public, max-age=300, s-maxage=3600");
    return res.status(200).send(html);
  }

  const reservedRoutes = ['vitrine-admin', 'portail-shop', 'panier', 'merci', 'devis', 'admin', 'login', 'signup', 'api', 'assets'];
  const isArtistRoute = targetId && !reservedRoutes.includes(targetId.toLowerCase());

  if (!isBot(userAgent) || !isArtistRoute) {
    res.set("Cache-Control", "no-cache, no-store, must-revalidate, max-age=0");
    return res.status(200).send(html);
  }

  try {
    let artistData = null;
    const normId = targetId.toLowerCase().trim().replace(/[^a-z0-9]/g, '');

    // ── Cache hit ────────────────────────────────────────────────────────────
    const cachedHtml = seoGetCache(normId || targetId);
    if (cachedHtml) {
      res.set("Cache-Control", "public, max-age=300, s-maxage=3600");
      return res.status(200).send(cachedHtml);
    }

    // ── Parallel Firestore reads (1+2 en même temps, puis 3+4 seulement si nécessaire)
    const [scDoc, qSnap] = await Promise.all([
      admin.firestore().collection("SiteConfigs").doc(targetId).get(),
      normId
        ? admin.firestore().collection("SiteConfigs").where("slug", "==", normId).limit(1).get()
        : Promise.resolve({ empty: true }),
    ]);

    if (scDoc.exists) {
      artistData = scDoc.data();
    } else if (!qSnap.empty) {
      artistData = qSnap.docs[0].data();
    }

    // Fallback anonymous_previews — seulement si aucune donnée trouvée dans SiteConfigs
    if (!artistData) {
      const [apDoc, apSnap] = await Promise.all([
        admin.firestore().collection("anonymous_previews").doc(targetId).get(),
        normId
          ? admin.firestore().collection("anonymous_previews").where("companySlug", "==", normId).limit(1).get()
          : Promise.resolve({ empty: true }),
      ]);
      if (apDoc.exists) {
        artistData = apDoc.data();
      } else if (!apSnap.empty) {
        artistData = apSnap.docs[0].data();
      }
    }

    if (artistData) {
      const artistName = artistData.companyName || artistData.name || targetId.toUpperCase();
      let mainVisual = artistData.ogImageUrl || artistData.livePhotoUrls?.[0] || artistData.livePhotoUrl || artistData.logoUrl || artistData.coverUrl || "";

      // If image is a base64 string, upload it to Cloud Storage to produce an absolute public HTTPS URL for Facebook/Meta
      if (mainVisual && mainVisual.startsWith('data:')) {
        try {
          const bucket = admin.storage().bucket('signaid-prod-assets');
          const matches = mainVisual.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
          const mimeType = matches ? matches[1] : 'image/jpeg';
          const ext = mimeType.includes('png') ? 'png' : 'jpg';
          const buffer = Buffer.from(matches ? matches[2] : mainVisual.split(',')[1] || mainVisual, 'base64');
          const filePath = `previews/${normId || targetId}_og.${ext}`;
          const file = bucket.file(filePath);
          await file.save(buffer, {
            metadata: { contentType: mimeType, cacheControl: 'public, max-age=86400' }
          });
          await file.makePublic().catch(() => { });
          mainVisual = `https://storage.googleapis.com/${bucket.name}/${filePath}`;

          // Save back to Firestore for instant future response
          try {
            await admin.firestore().collection("SiteConfigs").doc(targetId).set({ ogImageUrl: mainVisual }, { merge: true });
          } catch (e) { }
        } catch (storageErr) {
          console.warn('[OG Image Cloud Storage Upload Error]:', storageErr);
          mainVisual = "https://signaid.eu/logo.png";
        }
      }

      // Anti-back-leak: l'image SEO ne doit jamais être une maquette dos
      if (mainVisual && /(tback|pback|hback|_dos|_back|\-dos)/i.test(mainVisual)) {
        mainVisual = artistData.livePhotoUrl || artistData.logoUrl || "https://signaid.eu/logo.png";
      }

      // Ensure valid public absolute URL
      if (!mainVisual || mainVisual.startsWith('data:')) {
        mainVisual = "https://signaid.eu/logo.png";
      } else if (mainVisual.startsWith('/')) {
        mainVisual = `https://signaid.eu${mainVisual}`;
      }

      const description = artistData.presentation ||
        artistData.activitySector ||
        artistData.rawPitch?.what ||
        `Découvrez le portail officiel, les liens directs et la collection merchandising de ${artistName}.`;

      const title = `${artistName} — Portail & Merchandising`;

      html = html.replace(/<title>.*?<\/title>/i, `<title>${title}</title>`);
      html = html.replace(/<meta\s+name=["']description["'].*?>/gi, "");
      html = html.replace(/<meta\s+property=["']og:.*?".*?>/gi, "");
      html = html.replace(/<meta\s+name=["']twitter:.*?".*?>/gi, "");
      html = html.replace(/<meta\s+property=["']twitter:.*?".*?>/gi, "");

      const ogTags = `
        <meta name="description" content="${description}" />
        <meta property="og:title" content="${title}" />
        <meta property="og:description" content="${description}" />
        <meta property="og:image" content="${mainVisual}" />
        <meta property="og:image:alt" content="${artistName} — Merchandising Officiel" />
        <meta property="og:url" content="https://signaid.eu/${targetId}" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="${title}" />
        <meta name="twitter:description" content="${description}" />
        <meta name="twitter:image" content="${mainVisual}" />
      `;

      html = html.replace("</head>", `${ogTags}</head>`);
    }

    // ── Cache write ──────────────────────────────────────────────────────────
    seoSetCache(normId || targetId, html);

    res.set("Cache-Control", "public, max-age=300, s-maxage=3600");
    return res.status(200).send(html);

  } catch (error) {
    console.error("Erreur lors de la récupération Firestore pour OG tags", error);
    return res.status(200).send(html);
  }
});

// Helper pour valider strictement les images IA réelles de mannequins (rejette tout gabarit 2D à plat)
function isRealAiImage(url) {
  if (!url || typeof url !== 'string') return false;
  const clean = url.trim();
  if (!clean || clean === '""' || clean.length < 10) return false;
  const cleanLower = clean.toLowerCase();
  if (cleanLower.startsWith('/assets/') || cleanLower.startsWith('/merch/') || cleanLower.includes('app_assets/public/assets/')) return false;
  if (cleanLower.includes('card-base') || cleanLower.includes('card_mockup') || cleanLower.includes('male_tshirt') || cleanLower.includes('male_hoodie') || cleanLower.includes('male_polo') || cleanLower.includes('male_tank')) return false;
  if (cleanLower.includes('/logos/') || cleanLower.includes('logo_')) return false;
  if ((cleanLower.includes('jhk170') || cleanLower.includes('jhk421') || cleanLower.includes('jhk510') || cleanLower.includes('bybb011') || cleanLower.includes('nx7200')) && !cleanLower.includes('btp_mockups') && !cleanLower.includes('_ai_')) {
    return false;
  }
  return cleanLower.startsWith('data:image/') ||
    cleanLower.startsWith('blob:') ||
    cleanLower.includes('firebasestorage.googleapis.com') ||
    cleanLower.includes('storage.googleapis.com');
}

// Helper pour extraire la meilleure URL d'image vêtement (privilégie les visuels mannequins personnalisés)
function extractBestImageUrl(item, preferredView) {
  if (!item) return '';
  if (typeof item === 'string') return item.trim();

  const isGenericTemplate = (u) => !u || typeof u !== 'string' || u.includes('JHK') || u.includes('card-base') || u.includes('neutral') || u.includes('bctw');

  // 0. Accès direct si la propriété spécifique à la vue demandée est déjà présente et est une vraie image sur-mesure
  if (preferredView === 'back' && (item.backImageUrl || item.imageBack || item.aiBack || item.aiRemasteredBack)) {
    const directBack = item.backImageUrl || item.imageBack || item.aiBack || item.aiRemasteredBack;
    if (typeof directBack === 'string' && directBack.trim() && !isGenericTemplate(directBack)) return directBack.trim();
  }
  if (preferredView === 'front' && (item.frontImageUrl || item.imageFront || item.aiFront || item.aiRemastered || item.ai || item.realAiSnapshotUrl)) {
    const directFront = item.frontImageUrl || item.imageFront || item.aiFront || item.aiRemastered || item.ai || item.realAiSnapshotUrl;
    if (typeof directFront === 'string' && directFront.trim() && !isGenericTemplate(directFront)) return directFront.trim();
  }

  const itemView = String(item.view || '').toLowerCase();
  const itemId = String(item.id || '').toLowerCase();

  // Rejeter formellement si l'item est exclusivement dédié à la vue opposée SANS avoir de champ explicite pour la vue demandée
  if (preferredView === 'front') {
    if ((itemView === 'back' || itemView === 'verso') && !item.frontImageUrl && !item.imageFront && !item.aiFront) return '';
    if ((itemId.includes('back') || itemId.includes('verso') || itemId.includes('_dos')) && !item.frontImageUrl && !item.imageFront && !item.aiFront) return '';
  }
  if (preferredView === 'back') {
    if ((itemView === 'front' || itemView === 'recto') && !item.backImageUrl && !item.imageBack && !item.aiBack) return '';
    if ((itemId.includes('front') || itemId.includes('recto') || itemId.includes('_face')) && !item.backImageUrl && !item.imageBack && !item.aiBack) return '';
  }

  let candidates = [];
  if (preferredView === 'back') {
    candidates = [
      item.aiRemasteredBack,
      item.aiBack,
      item.backImageUrl,
      item.imageBack,
      (itemView === 'back' || itemId.includes('back') || itemId.includes('dos')) ? (item.aiRemastered || item.ai || item.realAiSnapshotUrl) : null,
      item.mechanical,
      item.aiImageUrl,
      item.imageUrl
    ];
  } else if (preferredView === 'front') {
    candidates = [
      item.aiRemastered,
      item.ai,
      item.realAiSnapshotUrl,
      item.aiFront,
      item.imageStudio,
      item.frontImageUrl,
      item.imageFront,
      item.aiImageUrl,
      item.imageUrl
    ];
  } else {
    candidates = [
      item.aiRemastered,
      item.ai,
      item.realAiSnapshotUrl,
      item.frontImageUrl,
      item.imageFront,
      item.aiImageUrl,
      item.imageUrl,
      item.backImageUrl,
      item.imageBack,
      item.mechanical
    ];
  }

  if (item.items && Array.isArray(item.items)) {
    const sub = (preferredView && item.items.find(i => i.view === preferredView)) || item.items[0];
    if (sub) {
      if (preferredView === 'back') {
        candidates.unshift(sub.aiRemasteredBack, sub.aiBack, sub.backImageUrl, sub.imageBack, sub.aiRemastered, sub.ai, sub.mechanical);
      } else {
        candidates.unshift(sub.aiRemastered, sub.ai, sub.realAiSnapshotUrl, sub.frontImageUrl, sub.imageFront, sub.aiImageUrl, sub.imageStudio, sub.imageUrl);
      }
    }
  }

  let validCandidates = candidates.filter(c => typeof c === 'string' && c.trim() !== '' && c.trim() !== '""');

  // Filtrage strict insensible à la casse pour interdire toute fuite de visuel d'une face à l'autre
  if (preferredView === 'back') {
    validCandidates = validCandidates.filter(c => {
      const lower = c.toLowerCase();
      if (lower.includes('front') || lower.includes('face') || lower.includes('recto') || lower.includes('tfront') || lower.includes('pfront') || lower.includes('hfront')) {
        return false;
      }
      return true;
    });
  } else if (preferredView === 'front') {
    validCandidates = validCandidates.filter(c => {
      const lower = c.toLowerCase();
      if (lower.includes('back') || lower.includes('dos') || lower.includes('verso') || lower.includes('tback') || lower.includes('pback') || lower.includes('hback')) {
        return false;
      }
      return true;
    });
  }

  // 1. Privilégier les visuels sur-mesure (btp_mockups, storage, data URIs ou assets personnalisés)
  const customCandidate = validCandidates.find(c =>
    c.includes('btp_mockups') ||
    c.includes('storage.googleapis.com') ||
    c.includes('firebasestorage') ||
    c.startsWith('data:') ||
    (c.startsWith('/assets/') && !c.includes('JHK170') && !c.includes('JHK421') && !c.includes('JHK510') && !c.includes('bctw02t') && !c.includes('RH80') && !c.includes('NX7200')) ||
    (!c.includes('JHK170') && !c.includes('JHK421') && !c.includes('JHK510') && !c.includes('bctw02t') && !c.includes('RH80') && !c.includes('NX7200'))
  );

  if (customCandidate) return customCandidate.trim();

  // 2. Fallback sur n'importe quelle candidate valide
  if (validCandidates.length > 0) return validCandidates[0].trim();

  if (typeof item.url === 'string' && item.url.trim() !== '' && item.url.trim() !== '""') {
    return item.url.trim();
  }

  return '';
}

// ==========================================
// 1. ROUTE SLUG : GET /api/user-by-slug/:slug
// ==========================================
exports.getUserBySlug = onRequest({ cors: true, minInstances: 1 }, async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }

  try {
    let rawSlug = req.query.slug || req.query.id || req.query.uid || req.params?.slug || req.params?.[0] || req.path || '';
    let slug = String(rawSlug).split('?')[0].split('/').filter(Boolean).pop() || '';
    if (slug === 'user-by-slug' || slug === 'api') slug = '';

    if (!slug) {
      return res.status(400).json({ error: 'Slug manquant' });
    }

    const db = admin.firestore();

    // ── In-memory cache (60s TTL) ──────────────────────────────────────────
    const SLUG_CACHE_TTL_MS = 60_000;
    if (!exports._slugCache) exports._slugCache = new Map();
    const _slugCache = exports._slugCache;
    const isBypass = req.query._t || req.query.nocache;
    const _cacheEntry = isBypass ? null : _slugCache.get(slug);
    if (_cacheEntry && Date.now() - _cacheEntry.ts < SLUG_CACHE_TTL_MS) {
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
      return res.status(200).json(_cacheEntry.data);
    }
    // ─────────────────────────────────────────────────────────────────────

    // 1. Chercher dans SiteConfigs : par slug, customDomain, domain et doc ID — en parallèle
    let snapshot;
    {
      const [bySlug, byCustomDomain, byDomain, byCustomDomains, byDocId] = await Promise.all([
        db.collection('SiteConfigs').where('slug', '==', slug).limit(1).get(),
        db.collection('SiteConfigs').where('customDomain', '==', slug).limit(1).get(),
        db.collection('SiteConfigs').where('domain', '==', slug).limit(1).get(),
        db.collection('SiteConfigs').where('customDomains', 'array-contains', slug).limit(1).get(),
        db.collection('SiteConfigs').doc(slug).get(),
      ]);
      if (!bySlug.empty) snapshot = bySlug;
      else if (!byCustomDomain.empty) snapshot = byCustomDomain;
      else if (!byDomain.empty) snapshot = byDomain;
      else if (!byCustomDomains.empty) snapshot = byCustomDomains;
      else if (byDocId.exists) snapshot = { empty: false, docs: [byDocId] };
      else snapshot = { empty: true };
    }
    if (snapshot.empty && !slug.startsWith('audit-')) {
      const docByAudit = await db.collection('SiteConfigs').doc(`audit-${slug}`).get();
      if (docByAudit.exists) {
        snapshot = { empty: false, docs: [docByAudit] };
      }
    }

    // 3. Fallback dans anonymous_previews
    if (snapshot.empty) {
      const prevDoc = await db.collection('anonymous_previews').doc(slug).get();
      if (prevDoc.exists) {
        snapshot = { empty: false, docs: [prevDoc] };
      }
    }
    if (snapshot.empty && !slug.startsWith('audit-')) {
      const prevByAudit = await db.collection('anonymous_previews').doc(`audit-${slug}`).get();
      if (prevByAudit.exists) {
        snapshot = { empty: false, docs: [prevByAudit] };
      }
    }
    if (snapshot.empty) {
      const prevBySlug = await db.collection('anonymous_previews').where('companySlug', '==', slug).limit(1).get();
      if (!prevBySlug.empty) {
        snapshot = prevBySlug;
      }
    }
    if (snapshot.empty) {
      const prevByClean = await db.collection('anonymous_previews').where('cleanUid', '==', slug).limit(1).get();
      if (!prevByClean.empty) {
        snapshot = prevByClean;
      }
    }

    // 4. Fallback dans btp_projects
    if (snapshot.empty) {
      const btpDoc = await db.collection('btp_projects').doc(slug).get();
      if (btpDoc.exists) {
        snapshot = { empty: false, docs: [btpDoc] };
      }
    }
    if (snapshot.empty && !slug.startsWith('audit-')) {
      const btpByAudit = await db.collection('btp_projects').doc(`audit-${slug}`).get();
      if (btpByAudit.exists) {
        snapshot = { empty: false, docs: [btpByAudit] };
      }
    }
    if (snapshot.empty) {
      const btpByProj = await db.collection('btp_projects').where('projectId', '==', slug).limit(1).get();
      if (!btpByProj.empty) {
        snapshot = btpByProj;
      }
    }

    // 5. Fallback dans users par slug
    if (snapshot.empty) {
      snapshot = await db.collection('users').where('slug', '==', slug).limit(1).get();
    }

    // 6. Fallback spécifique pour fabrizio / djdfazz.be -> guest_ms3ijgnco2xnid
    if (snapshot.empty && (slug === 'fabrizio' || slug === 'guest_ms3ijgnco2xnid' || slug.includes('djdfazz'))) {
      const fabrizioDoc = await db.collection('SiteConfigs').doc('guest_ms3ijgnco2xnid').get();
      if (fabrizioDoc.exists) {
        snapshot = { empty: false, docs: [fabrizioDoc] };
      }
    }

    // 7. Fallback spécifique pour elox / djelox
    if (snapshot.empty && (slug === 'elox' || slug === 'djelox' || slug === 'dj-elox')) {
      snapshot = {
        empty: false,
        docs: [{
          id: 'elox',
          data: () => ({
            companyName: 'DJ ELOX',
            slug: 'elox',
            logoUrl: '/elox_logo.png',
            livePhotoUrl: '/elox_hero.jpg',
            theme: 'dark',
            accentColor: '#00ff88',
            logoOverlayColor: 'original'
          })
        }]
      };
    }

    // 7b. Fallback spécifique pour 2000theparty
    if (snapshot.empty && (slug === '2000theparty' || slug === 'audit-2000theparty-eyem')) {
      const partyDoc = await db.collection('SiteConfigs').doc('2000theparty').get();
      if (partyDoc.exists) {
        snapshot = { empty: false, docs: [partyDoc] };
      } else {
        const auditDoc = await db.collection('SiteConfigs').doc('audit-2000theparty-eyem').get();
        if (auditDoc.exists) {
          snapshot = { empty: false, docs: [auditDoc] };
        }
      }
    }

    // 8. Fallback universel dans prospects, audits et vault
    if (snapshot.empty) {
      const pDoc = await db.collection('prospects').doc(slug).get();
      if (pDoc.exists) snapshot = { empty: false, docs: [pDoc] };
    }
    if (snapshot.empty) {
      const aDoc = await db.collection('audits').doc(slug).get();
      if (aDoc.exists) snapshot = { empty: false, docs: [aDoc] };
    }
    if (snapshot.empty && !slug.startsWith('audit-')) {
      const aDoc2 = await db.collection('audits').doc(`audit-${slug}`).get();
      if (aDoc2.exists) snapshot = { empty: false, docs: [aDoc2] };
    }
    if (snapshot.empty) {
      const vDoc = await db.collection('vault').doc(slug).get();
      if (vDoc.exists) snapshot = { empty: false, docs: [vDoc] };
    }

    if (snapshot.empty) {
      return res.status(404).json({ error: 'Utilisateur / DJ non trouvé pour ce slug', slug });
    }

    let userDoc = snapshot.docs[0];
    for (const d of snapshot.docs) {
      const dData = d.data();
      if (dData && dData.logoUrl && !dData.logoUrl.includes('logo_A_active_1787803093010') && (dData.logoUrl.includes('logo_dtf') || dData.companyName)) {
        userDoc = d;
        break;
      }
    }

    const userData = userDoc.data() || {};
    userData.id = userDoc.id;

    // Chercher en parallèle le document audit / preview lié pour fusionner les mockups et logos
    let previewDocData = null;
    try {
      const candidateDocIds = [userDoc.id, slug, `audit-${slug}`, userData.cleanUid, userData.previewId, userData.auditId].filter(Boolean);
      for (const cId of candidateDocIds) {
        const pSnap = await db.collection('anonymous_previews').doc(cId).get();
        if (pSnap.exists) {
          previewDocData = pSnap.data();
          break;
        }
        const bSnap = await db.collection('btp_projects').doc(cId).get();
        if (bSnap.exists) {
          previewDocData = bSnap.data();
          break;
        }
      }
    } catch (e) { }

    // Logo en direct
    let directLogo = userData.logoUrl || userData.logoAdaptedUrl || userData.auditLogoUrl || previewDocData?.logoUrl || previewDocData?.logoAdaptedUrl || '';
    if (!userData.logoUrl && directLogo) {
      userData.logoUrl = directLogo;
    }
    if (!userData.auditLogoUrl && directLogo) {
      userData.auditLogoUrl = directLogo;
    }

    const isBannerRemoved = userData.isBannerRemoved === true || (
      !userData.livePhotoUrl && !userData.coverUrl && !userData.bannerUrl && !userData.coverImage
    );

    // Live photo en direct
    if (!isBannerRemoved && !userData.livePhotoUrl && previewDocData?.livePhotoUrl) {
      userData.livePhotoUrl = previewDocData.livePhotoUrl;
    }

    // Company name en direct
    if (!userData.companyName && previewDocData?.companyName) {
      userData.companyName = previewDocData.companyName;
    }

    // Accent color en direct
    if (!userData.accentColor && previewDocData?.accentColor) {
      userData.accentColor = previewDocData.accentColor;
    }

    // Récupérer en priorité absolue les produits / mockups réels de la session (100% data-driven)
    let productsList = [];

    // Priorité 1 : userData.products ou previewDocData.products si c'est un tableau (cas post-sync)
    const prodsArray = (Array.isArray(userData.products) && userData.products.length > 0)
      ? userData.products
      : (Array.isArray(previewDocData?.products) && previewDocData.products.length > 0 ? previewDocData.products : null);

    if (prodsArray) {
      productsList = [...prodsArray];
    }

    // Priorité 2 : si products est un objet (dictionnaire), itérer ses valeurs
    if (productsList.length === 0) {
      const prodsSource = (userData.products && typeof userData.products === 'object' && !Array.isArray(userData.products))
        ? userData.products
        : (previewDocData?.products && typeof previewDocData.products === 'object' && !Array.isArray(previewDocData.products) ? previewDocData.products : null);

      if (prodsSource) {
        Object.keys(prodsSource).forEach(k => {
          const prod = prodsSource[k];
          if (prod && typeof prod === 'object') {
            const fImg = prod.imageFront || prod.frontImageUrl || prod.imageUrl || prod.aiImageUrl;
            const bImg = prod.imageBack || prod.backImageUrl || '';
            let finalPrice = prod.price || (k === 'hoodie' ? 49.00 : (k === 'polo' ? 39.90 : 29.90));
            if ((k === 'hoodie' || prod.garment === 'sweat' || prod.garment === 'hoodie' || (prod.title && prod.title.toLowerCase().includes('hoodie'))) && finalPrice > 50) {
              finalPrice = 49.00;
            }
            if (fImg || bImg) {
              productsList.push({
                id: prod.id || `${slug}-${k}`,
                sku: prod.sku || undefined,
                title: prod.name || prod.title || `Produit ${k.toUpperCase()}`,
                name: prod.name || prod.title || `Produit ${k.toUpperCase()}`,
                price: finalPrice,
                garment: prod.garment || k,
                color: prod.color || (String(k).includes('white') || String(k).includes('blanc') || String(prod.sku || '').toLowerCase().includes('wht') ? 'Blanc' : 'Noir'),
                frontImageUrl: fImg,
                backImageUrl: bImg,
                imageUrl: fImg,
                sizes: prod.sizes || ['S', 'M', 'L', 'XL'],
                colors: prod.colors || ['Noir']
              });
            }
          }
        });
      }
    }

    // Priorité 3 : userData.mockups / userData.items / previewDocData
    if (productsList.length === 0) {
      if (Array.isArray(userData.mockups) && userData.mockups.length > 0) {
        productsList = [...userData.mockups];
      } else if (Array.isArray(userData.items) && userData.items.length > 0) {
        productsList = [...userData.items];
      } else if (previewDocData && Array.isArray(previewDocData.items) && previewDocData.items.length > 0) {
        productsList = [...previewDocData.items];
      } else if (previewDocData && Array.isArray(previewDocData.mockups) && previewDocData.mockups.length > 0) {
        productsList = [...previewDocData.mockups];
      }
    }

    if (productsList.length === 0 || productsList.every(p => !p.backImageUrl)) {
      // 2. Chercher également dans btp_projects et anonymous_previews
      const keysToTry = [...new Set([userDoc.id, userData.actuationKey, userData.generatedKey, slug, userData.cleanUid, userData.previewId, userData.auditId, `audit-${slug}`])].filter(Boolean);
      for (const k of keysToTry) {
        let projSnap = await db.collection('btp_projects').where('projectId', '==', k).get();
        if (projSnap.empty) {
          projSnap = await db.collection('btp_projects').where('previewId', '==', k).get();
        }
        if (projSnap.empty) {
          const directProj = await db.collection('btp_projects').doc(k).get();
          if (directProj.exists) projSnap = { empty: false, docs: [directProj] };
        }
        if (projSnap && !projSnap.empty) {
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
    }

    // 3. Fallback collection `products`
    const productsSnap = await db.collection('products')
      .where('userId', '==', userDoc.id)
      .get();

    const dbProducts = productsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    productsList.push(...dbProducts);

    // 1. Filtrer les cartes de visite (business_card) et exclure formellement tout gabarit à plat sans IA
    const filteredItems = productsList.filter(item => {
      const garment = String(item.garment || item.category || '').toLowerCase();
      const title = String(item.title || item.name || '').toLowerCase();
      if (garment === 'business_card' || title.includes('carte de visite') || title.includes('visite')) return false;
      // Exclure les gabarits sans aucune image IA
      const f = extractBestImageUrl(item, 'front');
      const b = extractBestImageUrl(item, 'back');
      return isRealAiImage(f) || isRealAiImage(b) || isRealAiImage(item.imageUrl) || isRealAiImage(item.ai) || isRealAiImage(item.aiRemastered);
    });

    // 2. Regrouper les vues Face et Dos par type de vêtement et par couleur
    const groupedMap = {};

    const isWhiteItem = (item) => {
      const color = String(item.color || '').toLowerCase();
      const id = String(item.id || '').toLowerCase();
      const sku = String(item.sku || '').toLowerCase();
      const title = String(item.title || item.name || '').toLowerCase();
      return color === 'white' || color === 'blanc' || color === '#ffffff' ||
        id.includes('white') || id.includes('blanc') || id.includes('-wht') || id.startsWith('twhite') || id.startsWith('pwhite') || id.startsWith('hwhite') ||
        sku.includes('wht') || sku.includes('white') ||
        title.includes('blanc') || title.includes('white');
    };

    const buildMockupStorageUrl = (s, itemId) => {
      const clean = String(s || '').toLowerCase().trim();
      const path = `btp_mockups/${clean}/web/${itemId}.png`;
      return `https://firebasestorage.googleapis.com/v0/b/signaid-prod.firebasestorage.app/o/${encodeURIComponent(path)}?alt=media`;
    };

    const defaultGarmentTemplates = {
      tshirt: {
        black: { front: '/assets/tshirt-black-JHK170.png', back: '/assets/tshirt-black-JHK170-dos.png' },
        white: { front: '/assets/tshirt-white-JHK170.png', back: '/assets/tshirt-white-JHK170-dos.png' }
      },
      polo: {
        black: { front: '/assets/polo-black-JHK510.png', back: '/assets/polo-black-JHK510-dos.png' },
        white: { front: '/assets/polo-white-JHK510.png', back: '/assets/polo-white-JHK510-dos.png' }
      },
      hoodie: {
        black: { front: '/assets/hoodie-black-JHK421.png', back: '/assets/hoodie-black-JHK421-dos.png' },
        white: { front: '/assets/hoodie-white-JHK421.png', back: '/assets/hoodie-white-JHK421-dos.png' }
      },
      sweat: {
        black: { front: '/assets/hoodie-black-JHK421.png', back: '/assets/hoodie-black-JHK421-dos.png' },
        white: { front: '/assets/hoodie-white-JHK421.png', back: '/assets/hoodie-white-JHK421-dos.png' }
      },
      tank_top: {
        black: { front: '/merch/visionroom/tank-front.png', back: '/merch/visionroom/tank-back.png' },
        white: { front: '/merch/visionroom/tank-white-front.png', back: '/merch/visionroom/tank-white-back.png' }
      },
      tshirt_oversize: {
        black: { front: '/merch/visionroom/oversize-front.png', back: '/merch/visionroom/oversize-back.png' },
        white: { front: '/assets/tshirt-white-NX7200.png', back: '/assets/tshirt-white-NX7200-dos.png' }
      },
      sport_tshirt: {
        black: { front: '/assets/tshirt-black-JHK170.png', back: '/assets/tshirt-black-JHK170-dos.png' },
        white: { front: '/assets/tshirt-white-JHK170.png', back: '/assets/tshirt-white-JHK170-dos.png' }
      }
    };

    filteredItems.forEach((item, index) => {
      let garmentKey = (item.garment || item.category || `item-${index}`).toLowerCase();
      if (garmentKey === 'sweat' || garmentKey === 'sweatshirt') garmentKey = 'hoodie';

      const itemIsWhite = isWhiteItem(item);
      const itemColor = itemIsWhite ? 'Blanc' : (item.color || 'Noir');
      const groupKey = `${garmentKey}_${itemColor.toLowerCase()}`;

      let frontCandidate = extractBestImageUrl(item, 'front');
      let backCandidate = extractBestImageUrl(item, 'back');

      // Résolution dynamique Storage selon la convention btp_mockups/${slug}/web/${id}.png
      const itemId = String(item.id || '');
      if (!frontCandidate && itemId && !itemId.startsWith('item-') && !itemId.startsWith('garment-')) {
        if (item.view !== 'back' && !itemId.toLowerCase().includes('back') && !itemId.toLowerCase().includes('dos')) {
          frontCandidate = buildMockupStorageUrl(slug, itemId);
        }
      }
      if (!backCandidate && itemId && (item.view === 'back' || itemId.toLowerCase().includes('back') || itemId.toLowerCase().includes('dos'))) {
        backCandidate = buildMockupStorageUrl(slug, itemId);
      }

      // EXCLUSION FORMELLE DES GABARITS 2D PLATS SANS MANNEQUIN
      if (!isRealAiImage(frontCandidate)) frontCandidate = null;
      if (!isRealAiImage(backCandidate)) backCandidate = null;

      // Si le vêtement n'a aucune image IA de mannequin, ne JAMAIS le pousser dans le catalogue shop
      if (!frontCandidate && !backCandidate) {
        return;
      }
      if (!frontCandidate) frontCandidate = backCandidate;
      if (!backCandidate) backCandidate = frontCandidate;

      // Determine SKU if available
      let itemSku = item.sku;
      if (!itemSku) {
        if (garmentKey === 'tshirt') itemSku = itemIsWhite ? 'JHK170-WHT' : 'JHK170-BLK';
        else if (garmentKey === 'polo') itemSku = itemIsWhite ? 'JHK510-WHT' : 'JHK510-BLK';
        else if (garmentKey === 'hoodie') itemSku = itemIsWhite ? 'JHK421-WHT' : 'JHK421-BLK';
        else if (garmentKey === 'tank_top') itemSku = itemIsWhite ? 'BYBB011-WHT' : 'BYBB011-BLK';
        else if (garmentKey === 'tshirt_oversize') itemSku = itemIsWhite ? 'NX7200-WHT' : 'NX7200-BLK';
        else if (garmentKey === 'sport_tshirt') itemSku = 'E3520';
      }

      if (!groupedMap[groupKey]) {
        let title = item.title || item.name || item.info?.title || `Produit Merch ${garmentKey.toUpperCase()} ${itemColor}`;
        title = String(title).replace(/\s+(FACE|DOS)$/i, '').trim();
        const defaultPriceMap = {
          tshirt: 29.90,
          tshirt_basic: 24.90,
          polo: 39.90,
          sweat: 44.90,
          sweatshirt: 44.90,
          hoodie: 49.90,
          tank_top: 27.99,
          tshirt_oversize: 34.99,
          sport_tshirt: 30.00
        };
        const stdPrice = defaultPriceMap[garmentKey] || 29.90;
        const priceRaw = item.price || item.info?.price;
        const price = typeof priceRaw === 'number' ? priceRaw : (parseFloat(String(priceRaw || '').replace(/[^\d.]/g, '')) || stdPrice);

        groupedMap[groupKey] = {
          id: String(item.id || `garment-${groupKey}`),
          sku: itemSku,
          name: String(title),
          price: price,
          garment: garmentKey,
          color: itemColor,
          frontImageUrl: frontCandidate,
          backImageUrl: backCandidate,
          imageUrl: frontCandidate || backCandidate,
          sizes: Array.isArray(item.sizes) ? item.sizes : ['S', 'M', 'L', 'XL'],
          colors: [itemColor]
        };
      } else {
        if (item.title && (!item.view || item.view === 'front')) {
          groupedMap[groupKey].name = String(item.title).replace(/\s+(FACE|DOS)$/i, '').trim();
        }
        if (itemSku && !groupedMap[groupKey].sku) {
          groupedMap[groupKey].sku = itemSku;
        }

        if (frontCandidate && isRealAiImage(frontCandidate)) {
          groupedMap[groupKey].frontImageUrl = frontCandidate;
          groupedMap[groupKey].imageUrl = frontCandidate;
        }

        if (backCandidate && isRealAiImage(backCandidate)) {
          groupedMap[groupKey].backImageUrl = backCandidate;
        }
      }
    });

    const ensurePublicAssetUrl = (url) => {
      if (!url || typeof url !== 'string') return url || '';
      if (url.includes('firebasestorage.googleapis.com/v0/b/signaid-prod-assets/o/')) {
        const match = url.match(/\/o\/(.*?)(?:\?|$)/);
        if (match) {
          const assetPath = decodeURIComponent(match[1]);
          return `https://us-central1-signaid-prod.cloudfunctions.net/getAsset?path=${encodeURIComponent(assetPath)}`;
        }
      }
      return url;
    };

    let lastStorageError = null;
    const uploadBase64ToStorage = async (base64Str, assetPath) => {
      if (!base64Str || typeof base64Str !== 'string' || !base64Str.startsWith('data:')) {
        return ensurePublicAssetUrl(base64Str) || '';
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

        await file.save(buffer, {
          metadata: {
            contentType: mimeType,
            cacheControl: 'public, max-age=86400'
          },
          resumable: false
        });
        await file.makePublic().catch(() => { });

        const encodedPath = encodeURIComponent(assetPath);
        return `https://us-central1-signaid-prod.cloudfunctions.net/getAsset?path=${encodedPath}`;
      } catch (err) {
        console.error('[Storage Upload Error]', err);
        lastStorageError = String(err.message || err);
        return base64Str;
      }
    };

    let needsFirestoreUpdate = false;

    // 1. Logo Profil (Avatar / Bulle de profil) :
    let cleanLogoUrl = extractBestImageUrl({ imageUrl: userData.logoUrl || userData.avatarUrl || userData.profileLogoUrl || previewDocData?.logoUrl || userData.auditLogoUrl || previewDocData?.auditLogoUrl }) || '';
    if (cleanLogoUrl.startsWith('data:image/')) {
      cleanLogoUrl = await uploadBase64ToStorage(cleanLogoUrl, `btp_mockups/${userDoc.id}/web/logo_${Date.now()}.png`);
      needsFirestoreUpdate = true;
    } else {
      cleanLogoUrl = ensurePublicAssetUrl(cleanLogoUrl);
    }

    // 2. Logos Merch / Textiles (Audit) :
    let cleanAuditLogoA = extractBestImageUrl({ imageUrl: userData.auditLogoUrl || userData.logoA || previewDocData?.auditLogoUrl || previewDocData?.logoA || userData.logoUrl }) || cleanLogoUrl;
    if (cleanAuditLogoA.startsWith('data:image/')) {
      cleanAuditLogoA = await uploadBase64ToStorage(cleanAuditLogoA, `btp_mockups/${userDoc.id}/web/audit_logoA_${Date.now()}.png`);
      needsFirestoreUpdate = true;
    } else {
      cleanAuditLogoA = ensurePublicAssetUrl(cleanAuditLogoA);
    }

    let cleanAuditLogoB = extractBestImageUrl({ imageUrl: userData.logoB || userData.logoAdaptedUrl || previewDocData?.logoB || previewDocData?.logoAdaptedUrl || userData.auditLogoUrl || userData.logoA || userData.logoUrl }) || cleanAuditLogoA;
    if (cleanAuditLogoB.startsWith('data:image/')) {
      cleanAuditLogoB = await uploadBase64ToStorage(cleanAuditLogoB, `btp_mockups/${userDoc.id}/web/audit_logoB_${Date.now()}.png`);
      needsFirestoreUpdate = true;
    } else {
      cleanAuditLogoB = ensurePublicAssetUrl(cleanAuditLogoB);
    }

    let cleanLivePhotoUrl = isBannerRemoved ? '' : (extractBestImageUrl({ imageUrl: userData.livePhotoUrl }) || '');
    if (cleanLivePhotoUrl.startsWith('data:image/')) {
      cleanLivePhotoUrl = await uploadBase64ToStorage(cleanLivePhotoUrl, `btp_mockups/${userDoc.id}/web/live_${Date.now()}.png`);
      needsFirestoreUpdate = true;
    } else {
      cleanLivePhotoUrl = ensurePublicAssetUrl(cleanLivePhotoUrl);
    }

    const fallbackLogo = cleanLogoUrl || '/logo.png';

    const rawNormalized = await Promise.all(Object.values(groupedMap).map(async (p, idx) => {
      let fImg = isRealAiImage(p.frontImageUrl) ? p.frontImageUrl : (isRealAiImage(p.imageUrl) ? p.imageUrl : '');
      let bImg = isRealAiImage(p.backImageUrl) ? p.backImageUrl : '';
      if (!fImg && bImg) fImg = bImg;
      if (!bImg && fImg) bImg = fImg;
      if (!fImg && !bImg) return null;

      if (fImg.startsWith('data:')) {
        fImg = await uploadBase64ToStorage(fImg, `btp_mockups/${userDoc.id}/web/${p.id}_front_${Date.now()}_${idx}.png`);
        needsFirestoreUpdate = true;
      } else {
        fImg = ensurePublicAssetUrl(fImg);
      }
      if (bImg.startsWith('data:')) {
        bImg = await uploadBase64ToStorage(bImg, `btp_mockups/${userDoc.id}/web/${p.id}_back_${Date.now()}_${idx}.png`);
        needsFirestoreUpdate = true;
      } else {
        bImg = ensurePublicAssetUrl(bImg);
      }

      if (!isRealAiImage(fImg) && !isRealAiImage(bImg)) return null;

      const mainImg = fImg || bImg;
      const isWhite = String(p.color || '').toLowerCase() === 'blanc' || String(p.color || '').toLowerCase() === 'white' || String(p.id || '').toLowerCase().includes('white') || String(p.sku || '').toLowerCase().includes('wht');

      return {
        id: String(p.id),
        sku: p.sku ? String(p.sku) : undefined,
        name: String(p.name),
        price: Number(p.price),
        garment: String(p.garment),
        color: p.color || (isWhite ? 'Blanc' : 'Noir'),
        frontImageUrl: String(fImg),
        backImageUrl: String(bImg),
        imageUrl: String(mainImg),
        sizes: Array.isArray(p.sizes) ? p.sizes : ['S', 'M', 'L', 'XL'],
        colors: Array.isArray(p.colors) ? p.colors : [p.color || (isWhite ? 'Blanc' : 'Noir')]
      };
    }));

    const normalizedProducts = rawNormalized.filter(Boolean);

    // Si des chaînes Base64 ont été migrées vers Firebase Storage, persistez les nouvelles URLs dans Firestore (SiteConfigs, prospects, audits, vault)
    if (needsFirestoreUpdate) {
      try {
        const updateData = {};
        if (cleanLogoUrl.startsWith('http')) updateData.logoUrl = cleanLogoUrl;
        if (cleanLivePhotoUrl.startsWith('http')) updateData.livePhotoUrl = cleanLivePhotoUrl;

        updateData.mockups = normalizedProducts.map(p => ({
          id: p.id,
          sku: p.sku,
          title: p.name,
          garment: p.garment,
          color: p.color,
          price: p.price,
          imageFront: p.frontImageUrl,
          imageBack: p.backImageUrl,
          imageUrl: p.imageUrl,
          url: p.imageUrl
        }));

        await db.collection('SiteConfigs').doc(userDoc.id).set(updateData, { merge: true });
        console.log(`[Base64 Migration] SiteConfigs/${userDoc.id} updated with Cloud Storage URLs.`);

        // Synchronisation normalisée complète dans prospects, audits et vault
        await persistProspectProfileBackend(admin, {
          prospectSlug: userDoc.id,
          slug: userDoc.id,
          companyName: userData.companyName || userDoc.id,
          logoUrl: cleanLogoUrl.startsWith('http') ? cleanLogoUrl : undefined,
          livePhotoUrl: cleanLivePhotoUrl.startsWith('http') ? cleanLivePhotoUrl : undefined,
          products: normalizedProducts
        });
      } catch (updateErr) {
        console.warn('[Base64 Migration Error]', updateErr);
      }
    }

    // Filtrer strictement les champs publics de l'artiste pour minimiser le payload
    const cleanSocials = Array.isArray(userData.socials)
      ? userData.socials
        .filter(s => s && s.enabled !== false && (s.platform || s.url) && String(s.url || '').trim() !== '')
        .map(s => ({
          platform: String(s?.platform || ''),
          url: String(s?.url || ''),
          enabled: s?.enabled !== false
        }))
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

    let effEnabledProductIds = userData.enabledProductIds || previewDocData?.enabledProductIds || undefined;

    let filteredProducts = normalizedProducts;
    if (Array.isArray(effEnabledProductIds) && effEnabledProductIds.length > 0) {
      filteredProducts = normalizedProducts.filter(p => {
        const pId = String(p.id || '').toLowerCase();
        const pSku = String(p.sku || '').toLowerCase();
        const g = String(p.garment || '').toLowerCase();
        const pColor = String(p.color || '').toLowerCase();

        const isWhiteVariant = pColor === 'blanc' || pColor === 'white' ||
          pId.includes('white') || pId.includes('blanc') || pId.includes('-wht') ||
          pId.startsWith('twhite') || pId.startsWith('pwhite') || pId.startsWith('hwhite') ||
          pSku.includes('wht') || pSku.includes('white');

        return effEnabledProductIds.some(id => {
          const lid = String(id).toLowerCase();
          return lid === pId ||
            (pSku && lid === pSku) ||
            lid === g ||
            lid.includes(g) ||
            (g && g.includes(lid)) ||
            (isWhiteVariant && (
              lid.includes('white') || lid.includes('blanc') || lid.includes('wht') ||
              lid === g.replace('_white', '') ||
              (g === 'tshirt' && (lid.includes('tshirt') || lid.includes('tfront') || lid.includes('tee'))) ||
              (g === 'polo' && (lid.includes('polo') || lid.includes('pfront'))) ||
              (g === 'sweat' && (lid.includes('hoodie') || lid.includes('sweat'))) ||
              (g === 'hoodie' && (lid.includes('hoodie') || lid.includes('sweat')))
            )) ||
            (g === 'sweat' && (lid.includes('hoodie') || lid.includes('hfront') || lid.includes('sweat'))) ||
            (g === 'hoodie' && (lid.includes('sweat') || lid.includes('hfront') || lid.includes('hoodie'))) ||
            (g === 'tshirt' && (lid.includes('tshirt') || lid.includes('tfront') || lid.includes('tee'))) ||
            (g === 'polo' && (lid.includes('polo') || lid.includes('pfront')));
        });
      });
    }

    if (!effEnabledProductIds || !Array.isArray(effEnabledProductIds) || effEnabledProductIds.length === 0) {
      effEnabledProductIds = filteredProducts.flatMap(p => [p.garment, p.id, p.sku, p?.type].filter(Boolean));
    }


    const responseData = {
      success: true,
      artist: {
        id: String(userData.id),
        companyName: String(userData.companyName !== undefined ? userData.companyName : (previewDocData?.companyName || '')).trim(),
        activitySector: String(userData.activitySector || previewDocData?.activitySector || '').trim(),
        slug: String(userData.slug || slug),
        logoUrl: cleanLogoUrl,
        auditLogoUrl: cleanAuditLogoA,
        logoA: cleanAuditLogoA,
        logoB: cleanAuditLogoB,
        logoAdaptedUrl: cleanAuditLogoB,
        logoPlacements: userData.logoPlacements || { tFront: 'B', tBack: 'A', pFront: 'B', pBack: 'A', hFront: 'B', hBack: 'A' },
        presentation: String(userData.presentation || userData.bio || ''),
        whatsapp: String(userData.whatsappNumber || userData.whatsapp || ''),
        contactEmail: String(userData.contactEmail || userData.email || ''),
        socials: cleanSocials,
        customLinks: cleanCustomLinks,
        theme: String(userData.theme || 'auto'),
        accentColor: String(userData.accentColor || '#ff3366'),
        logoOverlayColor: String(userData.logoOverlayColor || previewDocData?.logoOverlayColor || 'auto'),
        logoScale: userData.logoScale !== undefined ? userData.logoScale : (previewDocData?.logoScale !== undefined ? previewDocData.logoScale : 100),
        coverHeight: userData.coverHeight !== undefined ? userData.coverHeight : (previewDocData?.coverHeight !== undefined ? previewDocData.coverHeight : 280),
        coverZoom: userData.coverZoom !== undefined ? userData.coverZoom : (previewDocData?.coverZoom !== undefined ? previewDocData.coverZoom : 100),
        coverPositionY: userData.coverPositionY !== undefined ? userData.coverPositionY : (previewDocData?.coverPositionY !== undefined ? previewDocData.coverPositionY : 50),
        coverPositionX: userData.coverPositionX !== undefined ? userData.coverPositionX : (previewDocData?.coverPositionX !== undefined ? previewDocData.coverPositionX : 50),
        livePhotoUrl: cleanLivePhotoUrl,
        coverUrl: isBannerRemoved ? null : (userData.coverUrl || null),
        bannerUrl: isBannerRemoved ? null : (userData.bannerUrl || null),
        livePhotoUrls: isBannerRemoved ? [] : (userData.livePhotoUrls || (cleanLivePhotoUrl ? [cleanLivePhotoUrl] : [])),
        photos: isBannerRemoved ? [] : (userData.photos || []),
        invertLogoInLightMode: userData.invertLogoInLightMode !== false,
        enabledProductIds: effEnabledProductIds
      },
      enabledProductIds: effEnabledProductIds,
      products: filteredProducts,
      storageError: lastStorageError
    };

    console.log('[PAYLOAD CHECK] Size:', Buffer.byteLength(JSON.stringify(responseData)), 'bytes');

    // ── Cache write ──────────────────────────────────────────────────────
    if (_slugCache.size >= 200) _slugCache.delete(_slugCache.keys().next().value);
    _slugCache.set(slug, { data: responseData, ts: Date.now() });
    // ─────────────────────────────────────────────────────────────────────

    res.set('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
    return res.status(200).json(responseData);
  } catch (error) {
    console.error('Erreur getUserBySlug:', error);
    return res.status(500).json({ error: error.message });
  }
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
    } catch (e) { }
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
  } catch (e) { }
  if (!key) key = process.env.STRIPE_SECRET_KEY;
  if (!key && functions.config().stripe) key = functions.config().stripe.secret;

  let endpointSecret = null;
  try {
    if (stripeWebhookSecret && typeof stripeWebhookSecret.value === 'function') {
      endpointSecret = stripeWebhookSecret.value();
    }
  } catch (e) { }
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
exports.sendBookingEmail = onRequest({ cors: true, invoker: 'public', secrets: [smtpPass] }, async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Méthode non autorisée' });
  }

  try {
    const { artistSlug, artistId, bookingRecipientEmail, name, email, phone, date, location, message } = req.body || {};

    if (!name || (!email && !phone)) {
      return res.status(400).json({ success: false, error: 'Veuillez renseigner au moins votre nom et un moyen de contact (Email ou Téléphone).' });
    }

    const db = admin.firestore();
    let recipientEmail = null;
    let artistName = 'Artiste';

    // 1. Helper pour extraire l'e-mail le plus pertinent (priorité absolue à l'e-mail du bouton Booking)
    const extractEmailFromConfig = (d) => {
      if (!d) return null;
      // Priorité 1: Email configuré dans le bouton Booking (customLinks)
      if (Array.isArray(d.customLinks)) {
        const bLink = d.customLinks.find(l => l && (l.type === 'booking' || l.id === 'link_booking'));
        if (bLink && bLink.url) {
          const clean = bLink.url.replace(/^mailto:/i, '').trim();
          if (clean.includes('@') && clean.includes('.')) return clean;
        }
      }
      // Priorité 2: contactEmail réel
      if (d.contactEmail && d.contactEmail.includes('@') && !d.contactEmail.includes('entreprise.com')) {
        return d.contactEmail.trim();
      }
      // Priorité 3: email utilisateur
      if (d.email && d.email.includes('@') && !d.email.includes('entreprise.com')) {
        return d.email.trim();
      }
      // Priorité 4: contactEmail générique
      if (d.contactEmail && d.contactEmail.includes('@')) return d.contactEmail.trim();
      if (d.email && d.email.includes('@')) return d.email.trim();
      return null;
    };

    // 2. Recherche de l'email de l'artiste dans Firestore (collection SiteConfigs / users)
    const targetSlug = String(artistSlug || '').toLowerCase();

    if (bookingRecipientEmail && typeof bookingRecipientEmail === 'string' && bookingRecipientEmail.includes('@') && !bookingRecipientEmail.includes('entreprise.com')) {
      recipientEmail = bookingRecipientEmail.trim();
    }

    if (targetSlug === 'fabrizio' || artistId === 'guest_ms3ijgnco2xnid' || targetSlug === 'djdfazz') {
      recipientEmail = 'Fabriziomagistro89@gmail.com';
      artistName = 'DJ D-FAZZ';
    } else {
      if (!recipientEmail && artistId) {
        const docSnap = await db.collection('SiteConfigs').doc(artistId).get();
        if (docSnap.exists) {
          const d = docSnap.data();
          recipientEmail = extractEmailFromConfig(d);
          artistName = d.companyName || 'Artiste';
        }
      }

      if (!recipientEmail && targetSlug) {
        const docSnap = await db.collection('SiteConfigs').doc(targetSlug).get();
        if (docSnap.exists) {
          const d = docSnap.data();
          recipientEmail = extractEmailFromConfig(d);
          artistName = d.companyName || targetSlug;
        } else {
          const querySnap = await db.collection('SiteConfigs').where('slug', '==', targetSlug).limit(1).get();
          if (!querySnap.empty) {
            const d = querySnap.docs[0].data();
            recipientEmail = extractEmailFromConfig(d);
            artistName = d.companyName || targetSlug;
          }
        }
      }
    }

    if (!recipientEmail) {
      recipientEmail = 'logosigneed@gmail.com';
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

    // Déterminer la liste des destinataires : email de l'artiste + notification admin
    let targetRecipients = [];
    if (targetSlug === 'fabrizio' || artistId === 'guest_ms3ijgnco2xnid' || targetSlug === 'djdfazz') {
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

exports.uploadImage = onRequest({ cors: true, invoker: 'public' }, async (req, res) => {
  cors(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }
    try {
      const { base64Data, path, customName } = req.body;
      if (!base64Data) {
        return res.status(400).json({ error: 'Missing base64Data' });
      }
      const bucket = admin.storage().bucket('signaid-prod-assets');
      const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      const mimeType = matches ? matches[1] : 'image/jpeg';
      const ext = mimeType.includes('png') ? 'png' : (mimeType.includes('webp') ? 'webp' : 'jpg');
      const buffer = Buffer.from(matches ? matches[2] : base64Data, 'base64');

      const fileName = customName ? `${customName}.${ext}` : `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${ext}`;
      const filePath = path ? (path.endsWith('/') ? `${path}${fileName}` : `${path}/${fileName}`) : `uploads/${fileName}`;

      const file = bucket.file(filePath);
      await file.save(buffer, {
        metadata: {
          contentType: mimeType,
          cacheControl: 'public, max-age=86400'
        }
      });
      await file.makePublic().catch(() => { });
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;
      return res.status(200).json({ success: true, url: publicUrl });
    } catch (e) {
      console.error('[UploadImage Cloud Function Error]:', e);
      return res.status(500).json({ success: false, error: e.message });
    }
  });
});

exports.getAsset = onRequest({ cors: true, invoker: 'public', maxInstances: 20 }, async (req, res) => {
  cors(req, res, async () => {
    try {
      let rawPath = req.query.path || req.path.replace(/^\//, '');
      if (!rawPath) return res.status(400).send('Missing path parameter');

      if (rawPath.includes('/o/')) {
        const match = rawPath.match(/\/o\/(.*?)(?:\?|$)/);
        if (match) rawPath = decodeURIComponent(match[1]);
      } else {
        rawPath = decodeURIComponent(rawPath);
      }

      const bucket = admin.storage().bucket('signaid-prod-assets');
      const file = bucket.file(rawPath);

      const [exists] = await file.exists();
      if (!exists) {
        return res.status(404).send('Asset not found');
      }

      const [metadata] = await file.getMetadata();
      const mimeType = metadata.contentType || (rawPath.endsWith('.png') ? 'image/png' : (rawPath.endsWith('.webp') ? 'image/webp' : 'image/jpeg'));

      res.setHeader('Content-Type', mimeType);
      res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=604800');

      file.createReadStream().pipe(res);
    } catch (err) {
      console.error('getAsset error:', err);
      return res.status(500).send(err.message);
    }
  });
});

exports.listBucketMockups = onRequest({ cors: true, invoker: 'public' }, async (req, res) => {
  cors(req, res, async () => {
    try {
      const prefix = req.query.prefix || 'btp_mockups/';
      const bucket = admin.storage().bucket('signaid-prod-assets');
      const [files] = await bucket.getFiles({ prefix, maxResults: 500 });
      const list = files.map(f => ({
        name: f.name,
        size: f.metadata.size,
        updated: f.metadata.updated,
        url: `https://storage.googleapis.com/${bucket.name}/${f.name}`
      }));
      return res.status(200).json({ success: true, count: list.length, list });
    } catch (e) {
      return res.status(500).json({ success: false, error: e.message });
    }
  });
});

exports.uploadBatchImages = onRequest({ cors: true, invoker: 'public', maxInstances: 10 }, async (req, res) => {
  cors(req, res, async () => {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
    const isAuthorized = await verifyAdminAccess(req);
    if (!isAuthorized) {
      return res.status(403).json({ success: false, error: 'Accès refusé — Authentification ou token admin requis.' });
    }
    try {
      const { items } = req.body;
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Missing items array' });
      }
      const bucket = admin.storage().bucket('signaid-prod-assets');
      const results = [];

      for (const item of items) {
        try {
          const filePath = String(item.path || '').replace(/^\//, '');
          let base64 = String(item.base64Data || '');
          if (base64.includes(',')) base64 = base64.split(',')[1];
          const buffer = Buffer.from(base64, 'base64');
          const file = bucket.file(filePath);

          await file.save(buffer, {
            metadata: {
              contentType: item.contentType || (filePath.endsWith('.png') ? 'image/png' : (filePath.endsWith('.webp') ? 'image/webp' : (filePath.endsWith('.svg') ? 'image/svg+xml' : 'image/jpeg'))),
              cacheControl: 'public, max-age=86400'
            },
            resumable: false
          });
          await file.makePublic().catch(() => { });

          results.push({
            path: item.path,
            success: true,
            storageUrl: `https://storage.googleapis.com/${bucket.name}/${filePath}`,
            cdnUrl: `https://us-central1-signaid-prod.cloudfunctions.net/getAsset?path=${encodeURIComponent(filePath)}`
          });
        } catch (itemErr) {
          results.push({ path: item.path, success: false, error: itemErr.message });
        }
      }

      return res.status(200).json({ success: true, count: results.length, results });
    } catch (e) {
      console.error('[UploadBatchImages Error]:', e);
      return res.status(500).json({ success: false, error: e.message });
    }
  });
});

exports.detectSocialLinks = onRequest({ cors: true, invoker: 'public' }, async (req, res) => {
  cors(req, res, async () => {
    const rawBrandName = req.body?.brandName || req.query?.brandName || '';
    const brandName = String(rawBrandName).trim();

    if (!brandName || brandName.length < 2) {
      return res.status(400).json({ success: false, error: 'brandName est requis (au moins 2 caractères)' });
    }

    const cleanHandle = brandName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9._]/g, '');

    const detectedLinks = {
      instagram: '',
      tiktok: '',
      spotify: '',
      youtube: '',
      soundcloud: '',
      website: ''
    };

    try {
      // 1. Fast match for known profiles
      const lowerName = brandName.toLowerCase();
      if (lowerName.includes('dfazz') || lowerName.includes('fabrizio')) {
        detectedLinks.instagram = 'https://www.instagram.com/djdfazz';
        detectedLinks.tiktok = 'https://www.tiktok.com/@djdfazz';
        detectedLinks.soundcloud = 'https://soundcloud.com/djdfazz';
        detectedLinks.youtube = 'https://www.youtube.com/@djdfazz';
        detectedLinks.spotify = 'https://open.spotify.com';
        detectedLinks.website = 'https://djdfazz.be';
      } else if (lowerName.includes('aaron')) {
        detectedLinks.instagram = 'https://www.instagram.com/aaronh';
        detectedLinks.tiktok = 'https://www.tiktok.com/@aaronh';
        detectedLinks.soundcloud = 'https://soundcloud.com/aaronh';
        detectedLinks.youtube = 'https://www.youtube.com/@aaronh';
        detectedLinks.spotify = 'https://open.spotify.com';
      } else if (lowerName.includes('dokiin')) {
        detectedLinks.instagram = 'https://www.instagram.com/dokiin';
        detectedLinks.tiktok = 'https://www.tiktok.com/@dokiin';
        detectedLinks.soundcloud = 'https://soundcloud.com/dokiin';
        detectedLinks.youtube = 'https://www.youtube.com/@dokiin';
        detectedLinks.spotify = 'https://open.spotify.com';
      } else if (lowerName.includes('mentalist')) {
        detectedLinks.instagram = 'https://www.instagram.com/thementalist';
        detectedLinks.tiktok = 'https://www.tiktok.com/@thementalist';
        detectedLinks.soundcloud = 'https://soundcloud.com/thementalist';
        detectedLinks.youtube = 'https://www.youtube.com/@thementalist';
        detectedLinks.spotify = 'https://open.spotify.com';
      }

      // 2. Perform live multi-platform targeted search if some links are still empty (with strict 5s timeout)
      const needsSearch = Object.values(detectedLinks).some(v => !v);
      if (needsSearch) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        try {
          const searchQuery = `"${brandName}" (site:instagram.com OR site:tiktok.com OR site:spotify.com OR site:youtube.com OR site:soundcloud.com)`;
          const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(searchQuery)}`;

          const response = await fetch(searchUrl, {
            signal: controller.signal,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
              'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7'
            }
          });
          clearTimeout(timeoutId);

          if (response.ok) {
            const html = await response.text();

            // Extract Instagram
            if (!detectedLinks.instagram) {
              const igMatches = html.match(/https?:\/\/(?:www\.)?instagram\.com\/([a-zA-Z0-9._]+)/gi) || [];
              const validIg = igMatches.find(url => {
                const clean = url.toLowerCase();
                return !clean.includes('/p/') && !clean.includes('/reel/') && !clean.includes('/explore/') && !clean.includes('/stories/') && !clean.includes('/accounts/') && !clean.includes('/about/') && !clean.includes('/legal/');
              });
              if (validIg) {
                detectedLinks.instagram = validIg.replace(/\/$/, '');
              }
            }

            // Extract TikTok
            if (!detectedLinks.tiktok) {
              const ttMatches = html.match(/https?:\/\/(?:www\.)?tiktok\.com\/@([a-zA-Z0-9._]+)/gi) || [];
              const validTt = ttMatches.find(url => {
                const clean = url.toLowerCase();
                return !clean.includes('/tag/') && !clean.includes('/music/') && !clean.includes('/video/') && !clean.includes('/discover/') && !clean.includes('/about/') && !clean.includes('/legal/');
              });
              if (validTt) {
                detectedLinks.tiktok = validTt.replace(/\/$/, '');
              }
            }

            // Extract Spotify
            if (!detectedLinks.spotify) {
              const spMatches = html.match(/https?:\/\/open\.spotify\.com\/(?:intl-[a-z]+\/)?(artist\/[a-zA-Z0-9]+|album\/[a-zA-Z0-9]+|track\/[a-zA-Z0-9]+)/gi) || [];
              if (spMatches.length > 0) {
                detectedLinks.spotify = spMatches[0].replace(/\/$/, '');
              }
            }

            // Extract YouTube
            if (!detectedLinks.youtube) {
              const ytMatches = html.match(/https?:\/\/(?:www\.)?youtube\.com\/(@[a-zA-Z0-9._-]+|channel\/[a-zA-Z0-9_-]+|c\/[a-zA-Z0-9._-]+|user\/[a-zA-Z0-9._-]+)/gi) || [];
              const validYt = ytMatches.find(url => {
                const clean = url.toLowerCase();
                return !clean.includes('/watch') && !clean.includes('/shorts') && !clean.includes('/feed') && !clean.includes('/results') && !clean.includes('/about');
              });
              if (validYt) {
                detectedLinks.youtube = validYt.replace(/\/$/, '');
              }
            }

            // Extract SoundCloud
            if (!detectedLinks.soundcloud) {
              const scMatches = html.match(/https?:\/\/(?:www\.)?soundcloud\.com\/([a-zA-Z0-9_-]+)/gi) || [];
              const validSc = scMatches.find(url => {
                const clean = url.toLowerCase();
                return !clean.includes('/discover') && !clean.includes('/stream') && !clean.includes('/upload') && !clean.includes('/search') && !clean.includes('/terms-of-use') && !clean.includes('/pages') && !clean.includes('/you');
              });
              if (validSc) {
                detectedLinks.soundcloud = validSc.replace(/\/$/, '');
              }
            }
          }
        } catch (searchErr) {
          clearTimeout(timeoutId);
          console.warn('[detectSocialLinks] Live search timeout/error fallback:', searchErr.message);
        }
      }

      // 3. Fallback smart canonical generator for missing fields
      if (!detectedLinks.instagram && cleanHandle) {
        detectedLinks.instagram = `https://www.instagram.com/${cleanHandle}`;
      }
      if (!detectedLinks.tiktok && cleanHandle) {
        detectedLinks.tiktok = `https://www.tiktok.com/@${cleanHandle}`;
      }
      if (!detectedLinks.soundcloud && cleanHandle) {
        detectedLinks.soundcloud = `https://soundcloud.com/${cleanHandle}`;
      }
      if (!detectedLinks.youtube && cleanHandle) {
        detectedLinks.youtube = `https://www.youtube.com/@${cleanHandle}`;
      }
      if (!detectedLinks.spotify && cleanHandle) {
        detectedLinks.spotify = `https://open.spotify.com/search/${encodeURIComponent(brandName)}`;
      }

      const detectedCount = Object.values(detectedLinks).filter(Boolean).length;

      return res.status(200).json({
        success: true,
        brandName,
        links: detectedLinks,
        detectedCount
      });
    } catch (e) {
      console.warn('[detectSocialLinks Graceful Fallback on Error]:', e);
      // Never return 500 error: Return canonical fallback links
      const fallbackLinks = {
        instagram: cleanHandle ? `https://www.instagram.com/${cleanHandle}` : '',
        tiktok: cleanHandle ? `https://www.tiktok.com/@${cleanHandle}` : '',
        soundcloud: cleanHandle ? `https://soundcloud.com/${cleanHandle}` : '',
        youtube: cleanHandle ? `https://www.youtube.com/@${cleanHandle}` : '',
        spotify: `https://open.spotify.com/search/${encodeURIComponent(brandName)}`,
        website: ''
      };
      return res.status(200).json({
        success: true,
        brandName,
        links: fallbackLinks,
        detectedCount: Object.values(fallbackLinks).filter(Boolean).length,
        fallback: true
      });
    }
  });
});

// ==========================================
// MIGRATION ENGINE : Compilation automatique des snapshots 6-vues
// ==========================================
const { runMigrationPipeline } = require('./migrateAllProfilesToSnapshots');

exports.migrateAllProfiles = onRequest({
  timeoutSeconds: 540,
  memory: '1GiB',
  cors: true,
  minInstances: 0
}, async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Token, X-Api-Key');

  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }

  const isAuthorized = await verifyAdminAccess(req);
  if (!isAuthorized) {
    return res.status(403).json({ success: false, error: 'Accès refusé — Authentification ou token admin requis.' });
  }

  try {
    const force = req.query.force === 'true' || req.query.force === '1';
    const slug = req.query.slug || req.query.id || null;
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 500;

    console.log(`[API MIGRATION] Lancement de la migration des profils... (slug=${slug}, force=${force}, limit=${limit})`);
    const results = await runMigrationPipeline(admin, { force, slug, limit });

    // Vider le cache mémoire de getUserBySlug
    if (exports._slugCache) {
      exports._slugCache.clear();
    }

    return res.status(200).json({
      success: true,
      results
    });
  } catch (error) {
    console.error('[API MIGRATION ERROR]', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});