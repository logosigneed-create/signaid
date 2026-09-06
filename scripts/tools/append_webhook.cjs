const fs = require('fs');

const webhookCode = `

/**
 * ============================================================================
 * MISSION : SYSTEME AUTONOME B2B (FACEBOOK LEAD ADS WEBHOOK)
 * Description : Écoute les leads, génère le hub via IA et envoie l'email magique.
 * Zéro intervention manuelle requise.
 * ============================================================================
 */
exports.facebookLeadWebhook = onRequest({ secrets: [geminiApiKey, smtpPass], cors: true }, async (req, res) => {
  cors(req, res, async () => {
    // 1. Validation de la méthode
    if (req.method !== 'POST' && req.method !== 'GET') {
      return res.status(405).json({ status: 'ERROR', message: 'Method Not Allowed' });
    }

    // Gestion du Webhook Challenge de Facebook (Verification GET obligatoire)
    if (req.method === 'GET') {
      const mode = req.query['hub.mode'];
      const challenge = req.query['hub.challenge'];
      if (mode === 'subscribe') {
        return res.status(200).send(challenge);
      }
      return res.status(403).send('Forbidden');
    }

    try {
      const payload = req.body;
      
      // Extraction sécurisée des données du Lead
      const email = payload.email || (payload.entry && payload.entry[0]?.changes[0]?.value?.email);
      const company_name = payload.company_name || "Votre Entreprise";
      const business_keyword = payload.business_keyword || "";
      const logo_url = payload.logo_url || "";

      if (!email) {
         return res.status(400).json({ status: 'ERROR', message: 'Payload invalide: email manquant.' });
      }

      console.log(\`[Webhook] Réception lead: \${email} | Entreprise: \${company_name}\`);

      const axios = require('axios');
      const crypto = require('crypto');
      const db = admin.firestore();
      
      // Bucket Storage par défaut
      const storage = admin.storage().bucket('signaid-d2d08.firebasestorage.app');

      // Création de l'ID de session unique (Mode Invité propre basé sur le nom d'entreprise)
      const baseName = (company_name || 'entreprise')
        .split(/\s+/)
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join('')
        .replace(/[^a-zA-Z0-9]/g, '');

      let session_id = baseName;
      let counter = 1;
      let docExists = true;

      while (docExists) {
        const docSnap = await db.collection('SiteConfigs').doc(session_id).get();
        if (!docSnap.exists) {
          docExists = false;
        } else {
          counter++;
          session_id = baseName + counter;
        }
      }

      // ==========================================
      // 2. TÉLÉCHARGEMENT ET STOCKAGE DU LOGO
      // ==========================================
      let finalLogoUrl = "";
      if (logo_url) {
        try {
          console.log(\`[Webhook] Téléchargement du logo depuis \${logo_url}\`);
          const imageResponse = await axios.get(logo_url, { responseType: 'arraybuffer' });
          const buffer = Buffer.from(imageResponse.data, 'binary');
          
          const fileName = \`logos/leads/\${session_id}_logo.jpg\`;
          const file = storage.file(fileName);
          
          await file.save(buffer, {
            metadata: { contentType: imageResponse.headers['content-type'] || 'image/jpeg' },
          });
          
          // Génération d'une URL signée valide 100 ans pour affichage public
          const [url] = await file.getSignedUrl({ action: 'read', expires: '03-01-2100' });
          finalLogoUrl = url;
          console.log(\`[Webhook] Logo sauvegardé avec succès dans Storage.\`);
        } catch (logoErr) {
          console.error(\`[Webhook] Échec du traitement du logo, mode fallback activé: \`, logoErr.message);
        }
      }

      // ==========================================
      // 3. GÉNÉRATION IA DU PITCH MARKETING
      // ==========================================
      let aiPitch = {
        what: business_keyword ? \`Des services et produits pour \${business_keyword}\` : "Des services professionnels sur-mesure",
        who: "Professionnels, PME et Particuliers",
        difference: "Une approche moderne et une qualité irréprochable",
        service: "Un accompagnement dédié pour donner vie à vos projets"
      };

      try {
        console.log(\`[Webhook] Appel API Gemini pour le pitch de \${company_name}\`);
        const apiKey = geminiApiKey.value();
        const promptText = \`Tu es un expert en marketing d'entreprise. On a reçu un nouveau prospect appelé "\${company_name}" dont le secteur est "\${business_keyword || 'Non spécifié'}".
Génère une présentation marketing courte et percutante (1 phrase max par champ). Formatte ta réponse EXACTEMENT avec ce JSON valide et rien d'autre :
{
  "what": "Ce que vend l'entreprise",
  "who": "Cible principale de l'entreprise",
  "difference": "Différence unique / Valeur ajoutée",
  "service": "Bénéfice principal pour le client"
}\`;

        const geminiRes = await axios.post(
          \`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=\${apiKey}\`,
          { contents: [{ parts: [{ text: promptText }] }] },
          { headers: { 'Content-Type': 'application/json' } }
        );

        const aiText = geminiRes.data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        const jsonMatch = aiText.match(/\\{[\\s\\S]*\\}/);
        if (jsonMatch) {
          aiPitch = JSON.parse(jsonMatch[0]);
          console.log(\`[Webhook] Pitch généré par IA avec succès.\`);
        }
      } catch (aiErr) {
        console.error(\`[Webhook] Échec de l'IA, utilisation du pitch fallback: \`, aiErr.message);
      }

      // ==========================================
      // 4. PERSISTANCE EN BASE (MODE INVITE)
      // ==========================================
      console.log(\`[Webhook] Sauvegarde de la session \${session_id} dans Firestore\`);
      await db.collection('SiteConfigs').doc(session_id).set({
        uid: session_id,
        isGuest: true,
        is_claimed: false,
        status: "generated_from_webhook",
        companyName: company_name,
        contactEmail: email,
        sector: business_keyword || "Autre",
        activitySector: business_keyword || "Autre",
        logoUrl: finalLogoUrl,
        theme: "dark",
        accentColor: "rgb(249, 115, 22)", // Orange Signaid 
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        // Pré-remplissage du pitch généré par l'IA
        rawPitch: JSON.stringify({
          q1: aiPitch.what,
          q2: aiPitch.who,
          q3: aiPitch.difference,
          q4: aiPitch.service
        })
      });

      // ==========================================
      // 5. EMAIL AUTOMATISÉ (TEMPLATE PREMIUM)
      // ==========================================
      console.log(\`[Webhook] Envoi de l'email transactionnel à \${email}\`);
      const transporter = getTransporter(); 
      const previewLink = \`https://signaid-d2d08.web.app/portail-audit?uid=\${session_id}\`;
      
      const emailHtml = \`
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Votre Hub Digital Signaid</title>
      </head>
      <body style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 0; -webkit-font-smoothing: antialiased;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f4f4f5; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="100%" max-width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); max-width: 600px;">
                
                <!-- En-tête -->
                <tr>
                  <td style="background-color: #18181b; padding: 40px 30px; text-align: center;">
                    <h1 style="color: #ffffff; font-size: 28px; font-weight: 900; margin: 0; letter-spacing: 1px; text-transform: uppercase;">SIGNAID</h1>
                    <p style="color: #ea580c; font-size: 14px; font-weight: bold; margin: 8px 0 0 0; text-transform: uppercase; letter-spacing: 2px;">Studio Digital Automatisé</p>
                  </td>
                </tr>

                <!-- Contenu Principal -->
                <tr>
                  <td style="padding: 40px 30px;">
                    <h2 style="color: #18181b; font-size: 22px; font-weight: 800; margin: 0 0 20px 0;">Bonjour,</h2>
                    <p style="color: #52525b; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                      Nous avons analysé l'activité de <strong>\${company_name}</strong>. En nous basant sur votre profil, notre Intelligence Artificielle a pré-configuré votre identité visuelle et modélisé vos produits.
                    </p>
                    
                    <div style="background-color: #fefce8; border-left: 4px solid #f97316; padding: 15px 20px; border-radius: 0 8px 8px 0; margin-bottom: 30px;">
                      <p style="color: #9a3412; font-size: 14px; font-weight: 600; margin: 0;">
                        ✨ Tout est prêt et 100% gratuit. Aucune configuration technique n'est requise de votre côté.
                      </p>
                    </div>

                    \${finalLogoUrl ? \`
                    <div style="text-align: center; margin-bottom: 30px;">
                      <p style="color: #a1a1aa; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 10px 0;">Aperçu de votre logo</p>
                      <img src="\${finalLogoUrl}" alt="Logo \${company_name}" style="max-width: 140px; max-height: 140px; border-radius: 12px; border: 1px solid #e4e4e7; padding: 10px; background-color: #ffffff; object-fit: contain;" />
                    </div>
                    \` : ''}

                    <!-- Call To Action -->
                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 30px; margin-bottom: 30px;">
                      <tr>
                        <td align="center">
                          <a href="\${previewLink}" target="_blank" style="display: inline-block; background-color: #ea580c; color: #ffffff; font-size: 16px; font-weight: bold; text-decoration: none; padding: 18px 36px; border-radius: 50px; text-transform: uppercase; letter-spacing: 1px; box-shadow: 0 10px 20px rgba(234, 88, 12, 0.3);">
                            Découvrir mon Hub Digital
                          </a>
                        </td>
                      </tr>
                    </table>

                    <p style="color: #52525b; font-size: 15px; line-height: 1.6; margin: 0;">
                      Cliquez sur le bouton ci-dessus pour découvrir vos produits générés en 3D. Si vous souhaitez modifier une information, vous pourrez le faire directement depuis votre espace privé.
                    </p>
                  </td>
                </tr>

                <!-- Pied de page -->
                <tr>
                  <td style="background-color: #fafafa; padding: 30px; text-align: center; border-top: 1px solid #e4e4e7;">
                    <p style="color: #a1a1aa; font-size: 12px; margin: 0 0 10px 0;">
                      Ceci est un email automatique de votre assistant virtuel Signaid.
                    </p>
                    <p style="color: #d4d4d8; font-size: 12px; margin: 0;">
                      &copy; \${new Date().getFullYear()} Signaid. Tous droits réservés.
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
      \`;

      await transporter.sendMail({
        from: '"L\\'équipe Signaid" <contact@signeedclub.com>',
        to: email,
        subject: \`Ton espace digital et tes produits personnalisés pour \${company_name} sont prêts !\`,
        html: emailHtml
      });

      console.log(\`[Webhook] Traitement 100% réussi pour \${email}\`);
      
      // On répond 200 OK à Facebook avec le Session ID pour traçabilité
      return res.status(200).json({ status: 'SUCCESS', session_id: session_id });

    } catch (error) {
      console.error('[Webhook] ERREUR CRITIQUE:', error);
      // Fallback: On répond 200 à FB pour ne pas bloquer le Webhook / déclencher des retries infinis
      return res.status(200).json({ status: 'ERROR', message: 'Internal logic error handled to prevent retries' });
    }
  });
});
`;

fs.appendFileSync('c:/Partage/Projet/signaid-studio/functions/index.js', webhookCode);
console.log('Webhook code appended successfully.');
