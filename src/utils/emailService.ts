import emailjs from '@emailjs/browser';

const EMAILJS_CONFIG = {
    SERVICE_ID: "service_e0xn0lc",
    TEMPLATE_ID: "template_yujevvw",
    PUBLIC_KEY: "6B9hT2cj9B_3tFtKd"
};

/**
 * Envoie un email au client avec le lien de son portail BTP
 */
export async function sendPortalReadyEmail(clientName: string, clientEmail: string, portalUrl: string) {
    if (!clientEmail) return;
    try {
        await emailjs.send(
            EMAILJS_CONFIG.SERVICE_ID,
            EMAILJS_CONFIG.TEMPLATE_ID,
            {
                from_name: "Signaid BTP",
                from_email: "contact@signaid.eu",
                to_email: clientEmail,
                message: `Bonjour ${clientName || 'Client'},\n\nVotre page de commande BTP (Dotations & Équipements) est prête.\nVous pouvez y accéder et valider vos tailles via ce lien sécurisé :\n\n${portalUrl}\n\nL'équipe Signaid.`
            },
            EMAILJS_CONFIG.PUBLIC_KEY
        );
        console.log("Email 'Portail Prêt' envoyé à", clientEmail);
    } catch (e) {
        console.error("Erreur envoi email portail:", e);
    }
}

/**
 * Envoie un email de confirmation de dotation (client + admin)
 */
export async function sendOrderConfirmationEmail(clientName: string, clientEmail: string, totalItems: number, totalAmount: number) {
    // 1. Email Client
    if (clientEmail) {
        try {
            await emailjs.send(
                EMAILJS_CONFIG.SERVICE_ID,
                EMAILJS_CONFIG.TEMPLATE_ID,
                {
                    from_name: "Signaid BTP",
                    from_email: "contact@signaid.eu",
                    to_email: clientEmail,
                    message: `Bonjour ${clientName || 'Client'},\n\nNous avons bien reçu votre soumission de dotation (${totalItems} articles pour un total de ${totalAmount.toFixed(2)}€).\n\nMerci de votre confiance.\nL'équipe Signaid.`
                },
                EMAILJS_CONFIG.PUBLIC_KEY
            );
        } catch (e) {
            console.error("Erreur envoi email client:", e);
        }
    }

    // 2. Email Admin
    try {
        await emailjs.send(
            EMAILJS_CONFIG.SERVICE_ID,
            EMAILJS_CONFIG.TEMPLATE_ID,
            {
                from_name: "Système BTP",
                from_email: "system@signaid.eu",
                to_email: "logosigneed@gmail.com",
                message: `Nouvelle commande de dotation soumise par ${clientName} (${clientEmail}).\nTotal : ${totalItems} articles, Montant : ${totalAmount.toFixed(2)}€.\nConnectez-vous à l'espace Admin pour consulter le projet.`
            },
            EMAILJS_CONFIG.PUBLIC_KEY
        );
    } catch (e) {
        console.error("Erreur envoi email admin:", e);
    }
}
