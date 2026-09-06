const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

const firebaseConfigs = [
  {
    name: "signaid-prod",
    apiKey: "AIzaSyDTSKpVei8lCANIQJBZmuKcsjEDIubnvcs",
    authDomain: "signaid-prod.firebaseapp.com",
    projectId: "signaid-prod",
    storageBucket: "signaid-d2d08.firebasestorage.app",
    messagingSenderId: "244540314192",
    appId: "1:244540314192:web:814f987d2a6ece8ac67755"
  }
];

async function main() {
  const app = initializeApp(firebaseConfigs[0], 'inspect_prospects');
  const db = getFirestore(app);

  console.log("=== LECTURE DE LA LISTE DES PROSPECTS & PROMPTS ASOCIÉS ===");

  const prospectMap = new Map();

  // 1. SiteConfigs
  const snapSiteConfigs = await getDocs(collection(db, "SiteConfigs"));
  snapSiteConfigs.forEach(d => {
    const data = d.data();
    const id = d.id;
    prospectMap.set(id, { id, source: 'SiteConfigs', data });
  });

  // 2. anonymous_previews
  const snapPrev = await getDocs(collection(db, "anonymous_previews"));
  snapPrev.forEach(d => {
    const data = d.data();
    const id = d.id;
    if (!prospectMap.has(id)) {
      prospectMap.set(id, { id, source: 'anonymous_previews', data });
    }
  });

  // 3. btp_projects
  const snapBtp = await getDocs(collection(db, "btp_projects"));
  snapBtp.forEach(d => {
    const data = d.data();
    const id = d.id;
    if (!prospectMap.has(id)) {
      prospectMap.set(id, { id, source: 'btp_projects', data });
    }
  });

  console.log(`\nNombre total d'entrées prospects trouvées: ${prospectMap.size}\n`);

  for (const [id, item] of prospectMap.entries()) {
    const d = item.data;
    const company = d.companyName || d.userData?.companyName || d.name || id;
    const activity = d.activitySector || d.userData?.activity || d.sector || "N/A";
    const prompt = d.prompt || d.aiPrompt || d.stylePrompt || d.styleCategory || d.theme || "Prompt par défaut (V-TON Standard / High-End Studio)";
    const logoUrl = d.logoUrl || d.logoAdaptedUrl || d.logos?.logoA?.activeUrl || "Aucun";

    console.log(`📌 ID/UID: ${id}`);
    console.log(`   Société / Client: ${company}`);
    console.log(`   Secteur: ${activity}`);
    console.log(`   Source: ${item.source}`);
    console.log(`   Prompt / Style: ${prompt}`);
    console.log(`   Logo URL: ${logoUrl.substring(0, 80)}...`);
    console.log("--------------------------------------------------");
  }

  process.exit(0);
}

main().catch(console.error);
