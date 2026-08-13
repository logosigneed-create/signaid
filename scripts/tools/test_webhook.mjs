import fetch from 'node-fetch';

// Remplacez cette URL par l'URL locale (émulateur) ou l'URL de production après déploiement
// Exemple Local: 'http://127.0.0.1:5001/signaid-d2d08/us-central1/facebookLeadWebhook'
// Exemple Prod: 'https://us-central1-signaid-d2d08.cloudfunctions.net/facebookLeadWebhook'
const WEBHOOK_URL = 'https://us-central1-signaid-d2d08.cloudfunctions.net/facebookLeadWebhook';

const testPayload = {
    email: "logosigneed@gmail.com",
    company_name: "Bâti-Rénov Express",
    business_keyword: "Rénovation et construction BTP",
    logo_url: "https://upload.wikimedia.org/wikipedia/commons/4/4b/McDonald%27s_logo.svg", // Logo générique pour le test
    phone_number: "+32490000000",
    address: "Bruxelles, Belgique"
};

async function runTest() {
    console.log(`🚀 Envoi du test Webhook vers: ${WEBHOOK_URL}`);
    console.log("📦 Payload:", JSON.stringify(testPayload, null, 2));

    try {
        const response = await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(testPayload)
        });

        const data = await response.json();
        console.log(`\n✅ Réponse du serveur (Status: ${response.status}):`);
        console.log(data);

        if (data.session_id) {
            console.log(`\n🔗 Lien généré (à ouvrir dans le navigateur) :`);
            console.log(`http://localhost:3000/portail-audit?uid=${data.session_id}`);
        }
    } catch (error) {
        console.error("\n❌ Erreur lors du test:", error.message);
    }
}

runTest();
