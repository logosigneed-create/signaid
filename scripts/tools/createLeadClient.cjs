const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc, serverTimestamp } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyCSBJf55JkrUtB844YXKlGypj2TkRDwUIY",
  authDomain: "signaid-d2d08.firebaseapp.com",
  projectId: "signaid-d2d08",
  storageBucket: "signaid-d2d08.firebasestorage.app",
  messagingSenderId: "214213761718",
  appId: "1:214213761718:web:2545a0dc2f796e1d9e6417"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  try {
    const session_id = "guest_dj_moli_" + Date.now().toString(36);
    
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
      logoUrl: "", // skipping logo for now
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
