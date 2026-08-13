require('dotenv').config({ path: '.env.local' });
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc, serverTimestamp } = require('firebase/firestore');
const { getStorage, ref, uploadBytes, getDownloadURL } = require('firebase/storage');
const fs = require('fs');

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

async function run() {
  try {
    const session_id = "guest_dj_moli_" + Date.now().toString(36);
    
    // Upload logo
    const logoPath = "C:\\Users\\Asus\\.gemini\\antigravity\\brain\\288c9fb1-be90-4cbf-8187-57de988238c1\\.tempmediaStorage\\media_288c9fb1-be90-4cbf-8187-57de988238c1_1779203638921.png";
    const fileBuffer = fs.readFileSync(logoPath);
    const storageRef = ref(storage, `logos/leads/${session_id}_logo.png`);
    
    await uploadBytes(storageRef, fileBuffer, { contentType: 'image/png' });
    const finalLogoUrl = await getDownloadURL(storageRef);
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

    await setDoc(doc(db, 'SiteConfigs', session_id), {
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
      createdAt: serverTimestamp(),
      presentation: generatedPresentation,
      rawPitch: JSON.stringify({
        q1: "Des sets de DJ et performances musicales",
        q2: "Le public et les organisateurs de soirées",
        q3: "Apporter ce que les gens veulent, me supporter et me faire découvrir à leurs entourages",
        q4: "Créer une ambiance inoubliable"
      })
    });

    console.log("Success! UID:", session_id);
    console.log("URL:", `http://localhost:5173/vitrine-admin/dashboard?uid=${session_id}`);
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}

run();
