/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Droppaid.ai - Webhook Stripe & Automatisation Partenaire Imprimeur / Atelier Local (Zéro Artisanat)
 * Traitement automatisé des commandes :
 * - "Pack d'Activation Physique" (500 Flyers A6 300 DPI)
 * - "Pack Merch Physique" (T-Shirt DTF 300 DPI)
 * - "Box Merch 50" (50x T-Shirts DTF 300 DPI)
 */

import { db } from '../firebaseConfig';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

export interface StripeCustomerShippingDetails {
  name?: string;
  email?: string;
  phone?: string;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    postal_code?: string;
    country?: string;
    state?: string;
  };
}

export type AutomatedProductType =
  | 'pack_activation_flyers_a6_500'
  | 'physical_merch_pack'
  | 'box_merch_50';

export interface PrintPartnerOrderPayload {
  orderId: string;
  product: AutomatedProductType;
  quantity: number;
  format: 'A6' | 'DTF_TEXTILE_MASTER';
  finish: string;
  printAssetUrl: string;
  backPrintAssetUrl?: string;
  resolution: '300 DPI';
  textileSpecs?: {
    tshirtSize: 'S' | 'M' | 'L' | 'XL' | 'XXL';
    tshirtColor: string;
    pressTemperatureC: number;
    pressDurationSeconds: number;
    peelType: 'Chaud (Hot Peel)' | 'Froid (Cold Peel)';
    frontPlacement: { x: number; y: number; scale: number };
    backPlacement: { x: number; y: number; scale: number };
  };
  hasLogoRedesign?: boolean;
  logoRedesignPriceEur?: number;
  dispatchConfirmationUrl?: string;
  shipping: {
    recipientName: string;
    senderWhiteLabelName: string;
    email: string;
    phone?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    postalCode?: string;
    country?: string;
  };
  metadata: {
    projectId: string;
    eventSlug?: string;
    stripeSessionId: string;
    stripePaymentIntentId?: string;
    timestamp: string;
  };
}

/**
 * 1. Extraire le fichier haute résolution 300 DPI (Flyer ou Logo/Visuel T-Shirt) depuis Firestore / Storage
 */
export async function extractHighResFlyerAsset(projectId: string, projectData?: any): Promise<string> {
  if (projectData?.flyer300DpiUrl) {
    return projectData.flyer300DpiUrl;
  }
  if (projectData?.flyerImageUrl && !projectData.flyerImageUrl.startsWith('data:')) {
    return projectData.flyerImageUrl;
  }
  if (projectData?.previewImages?.a3 && !projectData.previewImages.a3.startsWith('data:')) {
    return projectData.previewImages.a3;
  }

  if (projectId) {
    try {
      const projectDoc = await getDoc(doc(db, 'projects', projectId));
      if (projectDoc.exists()) {
        const data = projectDoc.data();
        if (data.flyer300DpiUrl) return data.flyer300DpiUrl;
        if (data.flyerImageUrl && !data.flyerImageUrl.startsWith('data:')) return data.flyerImageUrl;
        if (data.previewImages?.a3 && !data.previewImages.a3.startsWith('data:')) return data.previewImages.a3;
      }
    } catch (e) {
      console.warn('[StripeWebhook] Impossible de lire le projet dans Firestore pour le flyer:', e);
    }
  }

  const bucket = process.env.VITE_FIREBASE_STORAGE_BUCKET || 'signaid-prod.firebasestorage.app';
  return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/projects%2F${encodeURIComponent(projectId)}%2Fflyer_300dpi.png?alt=media`;
}

/**
 * 1B. Extraire les assets DTF 300 DPI (Poitrine & Dos) pour le textile
 */
export async function extractHighResTextileAssets(
  projectId: string,
  projectData?: any
): Promise<{ frontUrl: string; backUrl: string; artistBrandName: string }> {
  let frontUrl = '';
  let backUrl = '';
  let artistBrandName = 'Collection Officielle Artiste';

  const extractFromObj = (data: any) => {
    if (!data) return;
    if (data.input?.djName) artistBrandName = data.input.djName;
    if (data.djName) artistBrandName = data.djName;
    if (data.dtfFront300DpiUrl) frontUrl = data.dtfFront300DpiUrl;
    if (data.dtfBack300DpiUrl) backUrl = data.dtfBack300DpiUrl;
    if (!frontUrl && data.input?.logoUrl) frontUrl = data.input.logoUrl;
    if (!frontUrl && data.logoUrl) frontUrl = data.logoUrl;
    if (!backUrl && data.flyer300DpiUrl) backUrl = data.flyer300DpiUrl;
    if (!backUrl && data.flyerImageUrl) backUrl = data.flyerImageUrl;
  };

  extractFromObj(projectData);

  if (projectId && (!frontUrl || !backUrl)) {
    try {
      const projectDoc = await getDoc(doc(db, 'projects', projectId));
      if (projectDoc.exists()) {
        extractFromObj(projectDoc.data());
      }
    } catch (e) {
      console.warn('[StripeWebhook] Lecture Firestore textile ignorée ou hors-ligne:', e);
    }
  }

  const bucket = process.env.VITE_FIREBASE_STORAGE_BUCKET || 'signaid-prod.firebasestorage.app';
  if (!frontUrl) {
    frontUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/projects%2F${encodeURIComponent(projectId)}%2Fdtf_front_300dpi.png?alt=media`;
  }
  if (!backUrl) {
    backUrl = frontUrl;
  }

  return { frontUrl, backUrl, artistBrandName };
}

/**
 * 2. Générer le Bon de Production HTML (Marque Blanche) destiné à l'Atelier Local par email
 */
export function buildLocalWorkshopEmailHtml(payload: PrintPartnerOrderPayload): string {
  const isTextile = payload.product === 'physical_merch_pack' || payload.product === 'box_merch_50';
  const productLabel =
    payload.product === 'box_merch_50'
      ? 'BOX MERCH PRO — 50x T-SHIRTS DTF 300 DPI'
      : payload.product === 'physical_merch_pack'
        ? 'PACK MERCH UNITE — 1x T-SHIRT DTF 300 DPI'
        : 'PACK ACTIVATION — 500x FLYERS A6 MAT 300 DPI';

  const specsHtml = isTextile && payload.textileSpecs
    ? `
      <div style="background:#111827;color:#f9fafb;padding:18px;border-radius:8px;margin:16px 0;border-left:4px solid #ff6b00;">
        <h3 style="margin:0 0 10px 0;color:#ff6b00;text-transform:uppercase;font-size:14px;">Instructions Techniques de Pressage DTF</h3>
        <table style="width:100%;font-size:14px;line-height:1.7;color:#e5e7eb;">
          <tr><td><strong>Taille du vêtement :</strong></td><td><span style="font-size:18px;font-weight:bold;color:#ffffff;">${payload.textileSpecs.tshirtSize}</span></td></tr>
          <tr><td><strong>Couleur textile :</strong></td><td>${payload.textileSpecs.tshirtColor.toUpperCase()}</td></tr>
          <tr><td><strong>Quantité à presser :</strong></td><td><strong>${payload.quantity} pièce(s)</strong></td></tr>
          <tr><td><strong>Température & Durée :</strong></td><td>${payload.textileSpecs.pressTemperatureC}°C pendant ${payload.textileSpecs.pressDurationSeconds} secondes</td></tr>
          <tr><td><strong>Pelure (Peel) :</strong></td><td>${payload.textileSpecs.peelType}</td></tr>
          <tr><td><strong>Placement Poitrine :</strong></td><td>X: ${payload.textileSpecs.frontPlacement.x}% | Y: ${payload.textileSpecs.frontPlacement.y}% (Échelle: ${payload.textileSpecs.frontPlacement.scale})</td></tr>
          <tr><td><strong>Placement Dos :</strong></td><td>X: ${payload.textileSpecs.backPlacement.x}% | Y: ${payload.textileSpecs.backPlacement.y}% (Échelle: ${payload.textileSpecs.backPlacement.scale})</td></tr>
        </table>
      </div>
    `
    : `
      <div style="background:#111827;color:#f9fafb;padding:18px;border-radius:8px;margin:16px 0;border-left:4px solid #00f0ff;">
        <h3 style="margin:0 0 10px 0;color:#00f0ff;text-transform:uppercase;font-size:14px;">Spécifications Imprimerie A6</h3>
        <p style="margin:4px 0;"><strong>Format :</strong> A6 (105 x 148 mm) — <strong>Quantité :</strong> ${payload.quantity} ex.</p>
        <p style="margin:4px 0;"><strong>Finition :</strong> ${payload.finish} — <strong>Résolution :</strong> ${payload.resolution}</p>
      </div>
    `;

  const confirmBtnHtml = payload.dispatchConfirmationUrl
    ? `
      <div style="margin:28px 0;text-align:center;">
        <a href="${payload.dispatchConfirmationUrl}" style="background:#22c55e;color:#000000;padding:14px 28px;text-decoration:none;font-weight:bold;border-radius:6px;display:inline-block;font-size:15px;">
          📦 CONFIRMER L'EXPÉDITION & SAISIR LE NUMÉRO DE SUIVI
        </a>
        <p style="font-size:12px;color:#6b7280;margin-top:8px;">Un seul clic depuis votre mobile ou PC une fois le colis remis au transporteur.</p>
      </div>
    `
    : '';

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <title>Bon de Production #${payload.orderId}</title>
</head>
<body style="font-family:Arial,Helvetica,sans-serif;background:#f3f4f6;margin:0;padding:24px;color:#111827;">
  <div style="max-width:680px;margin:0 auto;background:#ffffff;border-radius:10px;padding:28px;box-shadow:0 4px 14px rgba(0,0,0,0.08);">
    <div style="border-bottom:2px solid #111827;padding-bottom:14px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:center;">
      <div>
        <span style="background:#111827;color:#ff6b00;padding:4px 10px;border-radius:4px;font-size:12px;font-weight:bold;">ORDRE DE PRODUCTION AUTOMATISÉ</span>
        <h1 style="margin:8px 0 0 0;font-size:22px;">Commande #${payload.orderId}</h1>
      </div>
      <div style="text-align:right;font-size:12px;color:#4b5563;">
        <div>Date : ${new Date(payload.metadata.timestamp).toLocaleString('fr-BE')}</div>
        <div>Expéditeur Marque Blanche : <strong>${payload.shipping.senderWhiteLabelName}</strong></div>
      </div>
    </div>

    <p style="font-size:15px;margin:0 0 12px 0;">
      <strong>Produit commandé :</strong> ${productLabel}
    </p>

    ${specsHtml}

    <div style="background:#f9fafb;border:1px solid #d1d5db;padding:16px;border-radius:8px;margin:16px 0;">
      <h3 style="margin:0 0 10px 0;font-size:14px;text-transform:uppercase;color:#111827;">Fichiers Master 300 DPI Prêts à Imprimer / Presser</h3>
      <p style="margin:6px 0;">
        👉 <a href="${payload.printAssetUrl}" target="_blank" style="color:#2563eb;font-weight:bold;font-size:15px;">TÉLÉCHARGER LE MASTER PRINCIPAL 300 DPI (PNG HD)</a>
      </p>
      ${payload.backPrintAssetUrl && payload.backPrintAssetUrl !== payload.printAssetUrl
      ? `<p style="margin:6px 0;">👉 <a href="${payload.backPrintAssetUrl}" target="_blank" style="color:#2563eb;font-weight:bold;font-size:15px;">TÉLÉCHARGER LE MASTER DOS 300 DPI (PNG HD)</a></p>`
      : ''
    }
    </div>

    <div style="background:#eff6ff;border:1px solid #bfdbfe;padding:16px;border-radius:8px;margin:16px 0;">
      <h3 style="margin:0 0 8px 0;font-size:14px;text-transform:uppercase;color:#1e3a8a;">Bordereau d'Expédition Client Final (Marque Blanche)</h3>
      <p style="margin:4px 0;font-size:14px;"><strong>Expéditeur à afficher sur l'étiquette :</strong> ${payload.shipping.senderWhiteLabelName}</p>
      <hr style="border:none;border-top:1px solid #bfdbfe;margin:8px 0;" />
      <p style="margin:4px 0;font-size:15px;"><strong>Destinataire :</strong> ${payload.shipping.recipientName}</p>
      <p style="margin:4px 0;font-size:14px;"><strong>Adresse :</strong> ${payload.shipping.addressLine1 || ''} ${payload.shipping.addressLine2 || ''}</p>
      <p style="margin:4px 0;font-size:14px;"><strong>Ville / CP / Pays :</strong> ${payload.shipping.postalCode || ''} ${payload.shipping.city || ''} (${payload.shipping.country || 'BE'})</p>
      <p style="margin:4px 0;font-size:13px;color:#374151;"><strong>Contact transporteur :</strong> ${payload.shipping.phone || 'Non renseigné'} | ${payload.shipping.email}</p>
    </div>

    ${confirmBtnHtml}

    <div style="border-top:1px solid #e5e7eb;margin-top:24px;padding-top:12px;font-size:11px;color:#6b7280;text-align:center;">
      Pipeline Automatisé Signaid / Droppaid — Zéro intervention manuelle requise.
    </div>
  </div>
</body>
</html>`;
}

/**
 * 3. Déclencher l'envoi automatique à l'Atelier Local (Email API Resend / Brevo + Webhook + Archivage local)
 */
export async function dispatchOrderToPrintPartner(
  payload: PrintPartnerOrderPayload
): Promise<{ success: boolean; mode: string; response?: any }> {
  // Si la commande comporte une refonte de logo manuelle par Nicolas, on ne l'envoie PAS encore à l'atelier !
  if (payload.hasLogoRedesign) {
    console.info(
      `[StripeWebhook] 🎨 PAUSE ARTISANALE ACTIVÉE pour ${payload.orderId} : Refonte de logo demandée par le client. Envoi atelier suspendu jusqu'à validation du nouveau logo.`
    );
    return {
      success: true,
      mode: 'paused_for_logo_redesign',
      response: {
        status: 'awaiting_logo_redesign',
        notice: 'Commande mise en attente de la création du logo par Nicolas.',
        orderId: payload.orderId,
      },
    };
  }

  const workshopEmail =
    process.env.ATELIER_EMAIL ||
    process.env.PRINTER_PARTNER_EMAIL ||
    process.env.SUPER_ADMIN_EMAIL ||
    'logosigneed@gmail.com';
  const adminCopyEmail = 'logosigneed@gmail.com';
  const emailHtml = buildLocalWorkshopEmailHtml(payload);
  const emailSubject = `🔥 [BON DE PRODUCTION #${payload.orderId}] ${payload.quantity}x ${payload.product} — ${payload.shipping.recipientName}`;

  // A. Envoi par API Email directe (Resend API si RESEND_API_KEY est défini dans .env)
  const resendApiKey = (process.env.RESEND_API_KEY || '').trim();
  if (resendApiKey) {
    try {
      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM || 'Production Signaid <production@signaid.eu>',
          to: [workshopEmail],
          cc: workshopEmail.toLowerCase() !== adminCopyEmail ? [adminCopyEmail] : undefined,
          subject: emailSubject,
          html: emailHtml,
        }),
      });

      if (emailRes.ok) {
        const resData = await emailRes.json();
        console.info(`[StripeWebhook] 📧 Email de production envoyé à l'atelier (${workshopEmail}) via Resend:`, resData);
        return { success: true, mode: 'email_resend', response: resData };
      } else {
        const errTxt = await emailRes.text();
        console.warn('[StripeWebhook] Avertissement Resend API:', errTxt);
      }
    } catch (e: any) {
      console.warn('[StripeWebhook] Exception Resend API:', e?.message);
    }
  }

  // B. Envoi par API Brevo (Sendinblue) si BREVO_API_KEY est défini dans .env
  const brevoApiKey = (process.env.BREVO_API_KEY || '').trim();
  if (brevoApiKey) {
    try {
      const brevoRes = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': brevoApiKey,
        },
        body: JSON.stringify({
          sender: { name: 'Signaid Automated Production', email: process.env.EMAIL_FROM || 'logosigneed@gmail.com' },
          to: [{ email: workshopEmail, name: 'Atelier Production Partenaire' }],
          cc: workshopEmail.toLowerCase() !== adminCopyEmail ? [{ email: adminCopyEmail }] : undefined,
          subject: emailSubject,
          htmlContent: emailHtml,
        }),
      });

      if (brevoRes.ok) {
        const brevoData = await brevoRes.json();
        console.info(`[StripeWebhook] 📧 Email de production envoyé à l'atelier (${workshopEmail}) via Brevo:`, brevoData);
        return { success: true, mode: 'email_brevo', response: brevoData };
      } else {
        const errTxt = await brevoRes.text();
        console.warn('[StripeWebhook] Avertissement Brevo API:', errTxt);
      }
    } catch (e: any) {
      console.warn('[StripeWebhook] Exception Brevo API:', e?.message);
    }
  }

  // C. Envoi vers un Webhook Partenaire / Make / Zapier / Serveur local (`PRINTER_API_WEBHOOK_URL`)
  const printerWebhookUrl = process.env.PRINTER_API_WEBHOOK_URL || process.env.PRINT_PARTNER_WEBHOOK_URL;
  if (printerWebhookUrl) {
    try {
      const response = await fetch(printerWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.PRINTER_API_KEY || 'automated-print-token'}`,
          'X-Droppaid-Signature': `sig_${Date.now()}`,
        },
        body: JSON.stringify({
          ...payload,
          workshopEmail,
          emailSubject,
          emailHtml,
        }),
      });

      if (response.ok) {
        const resJson = await response.json();
        return { success: true, mode: 'webhook_partner', response: resJson };
      }
    } catch (netErr: any) {
      console.error('[StripeWebhook] Erreur réseau lors de l’appel webhook imprimeur:', netErr.message);
    }
  }

  // D. Fallback autonome : retourne le Bon de Production HTML complet pour archivage disque par server.ts
  console.info(
    `[StripeWebhook] ✅ Bon de production #${payload.orderId} généré pour l'atelier (${workshopEmail}). Prêt dans la boîte d'envoi serveur.`
  );
  return {
    success: true,
    mode: 'local_outbox_spool',
    response: {
      status: 'spooled_for_workshop',
      workshopEmail,
      orderId: payload.orderId,
      emailSubject,
      emailHtml,
    },
  };
}

/**
 * 4. Mettre à jour le statut Firestore du projet et de la collection 'orders'
 */
export async function updateFirestoreProjectPrintOrder(
  projectId: string,
  eventSlug?: string,
  orderMeta?: Partial<PrintPartnerOrderPayload>
): Promise<void> {
  const effectiveStatus = orderMeta?.hasLogoRedesign ? 'awaiting_logo_redesign' : 'in_production';

  const printOrderData = {
    orderId: orderMeta?.orderId || `ORD-${Date.now()}`,
    status: effectiveStatus,
    trackingUrl: null,
    trackingNumber: null,
    orderedAt: new Date().toISOString(),
    packageType: orderMeta?.product || 'activation_pack_500',
    quantity: orderMeta?.quantity || 1,
    printAssetUrl: orderMeta?.printAssetUrl || null,
    backPrintAssetUrl: orderMeta?.backPrintAssetUrl || null,
    textileSpecs: orderMeta?.textileSpecs || null,
    hasLogoRedesign: Boolean(orderMeta?.hasLogoRedesign),
    stripeSessionId: orderMeta?.metadata?.stripeSessionId || null,
    shippingDetails: orderMeta?.shipping || null,
    dispatchConfirmationUrl: orderMeta?.dispatchConfirmationUrl || null,
  };

  // Enregistrement dans la collection dédiée 'orders'
  if (orderMeta?.orderId) {
    try {
      const orderRef = doc(db, 'orders', orderMeta.orderId);
      await setDoc(
        orderRef,
        {
          ...printOrderData,
          projectId: projectId || null,
          eventSlug: eventSlug || null,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (e) {
      console.warn(`[StripeWebhook] Écriture Firestore orders/${orderMeta.orderId} ignorée:`, e);
    }
  }

  if (!projectId) {
    return;
  }

  try {
    const projectRef = doc(db, 'projects', projectId);
    await setDoc(
      projectRef,
      {
        printOrder: {
          status: effectiveStatus,
          trackingUrl: null,
          orderId: printOrderData.orderId,
        },
        fullPrintOrder: printOrderData,
        isDeployed: true,
        status: effectiveStatus,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    console.info(
      `[StripeWebhook] ✅ Statut Firestore projet '${projectId}' mis à jour : status='${effectiveStatus}'`
    );
  } catch (err) {
    console.error(`[StripeWebhook] Erreur mise à jour Firestore projet '${projectId}':`, err);
  }

  if (eventSlug) {
    try {
      const eventRef = doc(db, 'events', eventSlug);
      await setDoc(
        eventRef,
        {
          printOrder: {
            status: effectiveStatus,
            trackingUrl: null,
            orderId: printOrderData.orderId,
          },
          isDeployed: true,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (e) {
      console.warn(`[StripeWebhook] Erreur miroir Firestore events/${eventSlug}:`, e);
    }
  }
}

/**
 * 5. Gestionnaire principal de Webhook Stripe (Flyers A6 + Textile Merch Unitaire + Box 50 T-Shirts)
 */
export async function handleStripeWebhookEvent(
  event: any,
  serverBaseUrl: string = process.env.PUBLIC_SERVER_URL || 'https://signaid.eu'
): Promise<{ handled: boolean; message: string; data?: any }> {
  if (!event || !event.type) {
    return { handled: false, message: 'Événement invalide ou vide' };
  }

  console.info(`[StripeWebhook] Événement reçu : ${event.type}`);

  if (event.type === 'checkout.session.completed') {
    const session = event.data?.object || {};
    const metadata = session.metadata || {};
    const rawType = metadata.type || metadata.packageType || 'activation_pack_500';
    const projectId = metadata.projectId || metadata.id || session.client_reference_id || `proj_${Date.now()}`;
    const eventSlug = metadata.eventSlug || metadata.currentEventSlug || 'portail-interactif-signaid';

    const customerShipping = session.shipping_details || session.customer_details || {};
    const addr = customerShipping.address || {};

    // Normalisation du type de produit
    let productType: AutomatedProductType = 'pack_activation_flyers_a6_500';
    let quantity = 500;
    let format: 'A6' | 'DTF_TEXTILE_MASTER' = 'A6';
    let finish = 'Finition Mat Premium';
    let printAssetUrl = '';
    let backPrintAssetUrl: string | undefined = undefined;
    let senderWhiteLabelName = metadata.artistBrandName || 'Signaid Official Merch';
    let textileSpecs: PrintPartnerOrderPayload['textileSpecs'] = undefined;

    if (rawType === 'physical_merch_pack' || rawType === 'box_merch_50') {
      productType = rawType;
      quantity = rawType === 'box_merch_50' ? 50 : Number(metadata.tshirtQty || 1);
      format = 'DTF_TEXTILE_MASTER';
      finish = 'Transfert DTF Haute Densité 300 DPI + Pressage';

      const extracted = await extractHighResTextileAssets(projectId);
      printAssetUrl = metadata.frontAssetUrl || extracted.frontUrl;
      backPrintAssetUrl = metadata.backAssetUrl || extracted.backUrl;
      senderWhiteLabelName = metadata.artistBrandName || extracted.artistBrandName;

      textileSpecs = {
        tshirtSize: (metadata.tshirtSize as any) || 'L',
        tshirtColor: metadata.tshirtColor || 'black',
        pressTemperatureC: 160,
        pressDurationSeconds: 15,
        peelType: 'Chaud (Hot Peel)',
        frontPlacement: {
          x: Number(metadata.frontX ?? 68),
          y: Number(metadata.frontY ?? 34),
          scale: Number(metadata.frontScale ?? 1),
        },
        backPlacement: {
          x: Number(metadata.backX ?? 50),
          y: Number(metadata.backY ?? 38),
          scale: Number(metadata.backScale ?? 1),
        },
      };
    } else {
      productType = 'pack_activation_flyers_a6_500';
      quantity = 500;
      format = 'A6';
      finish = 'Finition Mat Premium';
      printAssetUrl = await extractHighResFlyerAsset(projectId);
    }

    const orderId = metadata.orderId || `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const hasLogoRedesign = metadata.hasLogoRedesign === 'true' || metadata.hasLogoRedesign === true;
    const dispatchConfirmationUrl = `${serverBaseUrl.replace(/\/$/, '')}/api/printer/confirm-dispatch?orderId=${encodeURIComponent(orderId)}&projectId=${encodeURIComponent(projectId)}`;

    const orderPayload: PrintPartnerOrderPayload = {
      orderId,
      product: productType,
      quantity,
      format,
      finish,
      printAssetUrl,
      backPrintAssetUrl,
      resolution: '300 DPI',
      textileSpecs,
      hasLogoRedesign,
      logoRedesignPriceEur: metadata.logoRedesignPriceEur ? Number(metadata.logoRedesignPriceEur) : undefined,
      dispatchConfirmationUrl,
      shipping: {
        recipientName: customerShipping.name || session.customer_details?.name || 'Client Droppaid',
        senderWhiteLabelName,
        email: session.customer_details?.email || session.customer_email || '',
        phone: customerShipping.phone || session.customer_details?.phone || '',
        addressLine1: addr.line1 || metadata.shippingAddress || 'Adresse fournie lors du paiement',
        addressLine2: addr.line2 || '',
        city: addr.city || 'Fosses-la-Ville',
        postalCode: addr.postal_code || '5070',
        country: addr.country || 'BE',
      },
      metadata: {
        projectId,
        eventSlug,
        stripeSessionId: session.id || `sim_${Date.now()}`,
        stripePaymentIntentId: session.payment_intent || undefined,
        timestamp: new Date().toISOString(),
      },
    };

    const dispatchResult = await dispatchOrderToPrintPartner(orderPayload);
    await updateFirestoreProjectPrintOrder(projectId, eventSlug, orderPayload);

    return {
      handled: true,
      message: hasLogoRedesign
        ? 'Commande enregistrée et mise en pause pour refonte logo par Nicolas'
        : `Commande ${productType} transmise automatiquement à l'atelier`,
      data: {
        projectId,
        orderId: orderPayload.orderId,
        dispatchMode: dispatchResult.mode,
        dispatchResponse: dispatchResult.response,
        orderPayload,
      },
    };
  }

  return { handled: false, message: `Événement ${event.type} non ciblé` };
}

export default handleStripeWebhookEvent;