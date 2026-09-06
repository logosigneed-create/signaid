const admin = require('firebase-admin');
const fs = require('fs');

// Initialize Firebase Admin (will use application default credentials if available, or FIREBASE_CONFIG)
admin.initializeApp({
  projectId: "signaid-prod",
});

async function run() {
  try {
    const db = admin.firestore();
    const storage = admin.storage().bucket('signaid-prod-assets');
    const crypto = require('crypto');
    
    const session_id = "guest_dj_moli_" + Date.now().toString(36);
    
    // Upload logo
    const logoPath = "C:\\Users\\Asus\\.gemini\\antigravity\\brain\\288c9fb1-be90-4cbf-8187-57de988238c1\\.tempmediaStorage\\media_288c9fb1-be90-4cbf-8187-57de988238c1_1779203638921.png";
    const fileName = `logos/leads/${session_id}_logo.png`;
    const file = storage.file(fileName);
    
    await file.save(fs.readFileSync(logoPath), {
      metadata: { contentType: 'image/png' },
    });
    const [finalLogoUrl] = await file.getSignedUrl({ action: 'read', expires: '03-01-2100' });
    console.log("Logo uploaded:", finalLogoUrl);

    // Create SiteConfig
    const company_name = "Moli Almeria";
    const business_keyword = "DJ";
    const email = "Molialmeriamgmt@gmail.com";
    
    const generatedPresentation = `
      <p><b>Moli Almeria</b>, spécialiste en DJ.</p>
      <p><b>Notre cible :</b> Les auditeurs et organisateurs d'événements</p>
      <p><b>Notre atout :</b> Apporter c'est que les gens veulent me supporter et me faire découvrir à leurs entourages</p>
      <p><b>Notre promesse :</b> Une expérience musicale unique</p>
    `;

    await db.collection('SiteConfigs').doc(session_id).set({
      uid: session_id,
      isGuest: true,
      is_claimed: false,
      status: "generated_from_webhook",
      companyName: company_name,
      contactEmail: email,
      whatsappNumber: "+32492104603",
      address: "4300 Waremme",
      sector: business_keyword,
      activitySector: business_keyword,
      logoUrl: finalLogoUrl,
      socials: [{ platform: "Website", url: "https://Molialmeriamusic.com" }],
      theme: "dark",
      accentColor: "rgb(214, 106, 174)", // Pink/Purple gradient match
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      presentation: generatedPresentation,
      rawPitch: JSON.stringify({
        q1: "Des sets de DJ et performances musicales",
        q2: "Le public et les organisateurs de soirées",
        q3: "Apporter ce que les gens veulent, me supporter et me faire découvrir à leurs entourages",
        q4: "Créer une ambiance inoubliable"
      })
    });

    console.log("Success! UID:", session_id);
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}

run();
