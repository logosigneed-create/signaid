const { initializeApp } = require('firebase/app');
const { getFirestore, doc, deleteDoc, setDoc, getDoc } = require('firebase/firestore');

const firebaseConfigs = [
  {
    name: "signaid-prod",
    apiKey: "AIzaSyDTSKpVei8lCANIQJBZmuKcsjEDIubnvcs",
    authDomain: "signaid-prod.firebaseapp.com",
    projectId: "signaid-prod",
    storageBucket: "signaid-d2d08.firebasestorage.app",
    messagingSenderId: "244540314192",
    appId: "1:244540314192:web:814f987d2a6ece8ac67755"
  },
  {
    name: "signaid-d2d08",
    apiKey: "AIzaSyCSBJf55JkrUtB844YXKlGypj2TkRDwUIY",
    authDomain: "signaid-d2d08.firebaseapp.com",
    projectId: "signaid-d2d08",
    storageBucket: "signaid-d2d08.firebasestorage.app",
    messagingSenderId: "214213761718",
    appId: "1:2545a0dc2f796e1d9e6417"
  }
];

const logoUrl = "https://firebasestorage.googleapis.com/v0/b/signaid-d2d08.firebasestorage.app/o/shared_media%2Fbtp_mockups%2Faudit-8f198p5%2Flogo_dfazz_official_1786740602971.png?alt=media&token=5c1c6d86-a2b1-4d3d-82d0-d1c91a136ef0";
const tshirtUrl = "https://firebasestorage.googleapis.com/v0/b/signaid-d2d08.firebasestorage.app/o/shared_media%2Fbtp_mockups%2Faudit-8f198p5%2Ftshirt_dfazz_isolated_1786740001609.png?alt=media&token=02459724-a44b-4068-b968-8eff724a391f";
const poloUrl = "https://firebasestorage.googleapis.com/v0/b/signaid-d2d08.firebasestorage.app/o/shared_media%2Fbtp_mockups%2Faudit-8f198p5%2Fpolo_dfazz_isolated_1786740001609.png?alt=media&token=807da046-8655-4157-9275-5461cab244bf";
const hoodieUrl = "https://firebasestorage.googleapis.com/v0/b/signaid-d2d08.firebasestorage.app/o/shared_media%2Fbtp_mockups%2Faudit-8f198p5%2Fhoodie_dfazz_isolated_1786740001609.png?alt=media&token=0ec93151-5e8d-429a-bb32-baa53f882603";

const items = [
  {
    id: "tFront",
    garment: "tshirt",
    title: "T-shirt Noir DJ D-FAZZ Official",
    selected: true,
    imageFront: tshirtUrl,
    imageUrl: tshirtUrl,
    ai: tshirtUrl,
    aiImageUrl: tshirtUrl,
    base: tshirtUrl,
    view: "front"
  },
  {
    id: "pFront",
    garment: "polo",
    title: "Polo Premium DJ D-FAZZ Official",
    selected: true,
    imageFront: poloUrl,
    imageUrl: poloUrl,
    ai: poloUrl,
    aiImageUrl: poloUrl,
    base: poloUrl,
    view: "front"
  },
  {
    id: "hFront",
    garment: "sweat",
    title: "Hoodie Premium DJ D-FAZZ Official",
    selected: true,
    imageFront: hoodieUrl,
    imageUrl: hoodieUrl,
    ai: hoodieUrl,
    aiImageUrl: hoodieUrl,
    base: hoodieUrl,
    view: "front"
  }
];

const productsPayload = {
  tshirt: {
    id: "tFront",
    name: "T-shirt Noir DJ D-FAZZ Official",
    garment: "tshirt",
    aiImageUrl: tshirtUrl,
    imageUrl: tshirtUrl,
    imageFront: tshirtUrl,
    price: 29.99
  },
  polo: {
    id: "pFront",
    name: "Polo Premium DJ D-FAZZ Official",
    garment: "polo",
    aiImageUrl: poloUrl,
    imageUrl: poloUrl,
    imageFront: poloUrl,
    price: 39.99
  },
  hoodie: {
    id: "hFront",
    name: "Hoodie Premium DJ D-FAZZ Official",
    garment: "sweat",
    aiImageUrl: hoodieUrl,
    imageUrl: hoodieUrl,
    imageFront: hoodieUrl,
    price: 59.99
  }
};

async function main() {
  console.log("=================================================");
  console.log("CONSOLIDATION UNIQUE : GUEST_MS3IJGNCO2XNID");
  console.log("=================================================\n");

  const nowIso = new Date().toISOString();

  const masterPayload = {
    id: "guest_ms3ijgnco2xnid",
    uid: "guest_ms3ijgnco2xnid",
    canonicalUid: "guest_ms3ijgnco2xnid",
    companyName: "DJ D-FAZZ",
    slug: "fabrizio",
    customDomain: "djdfazz.be",
    customDomains: ["fabrizio", "djdfazz", "djdfazz.be"],
    logoUrl: logoUrl,
    auditLogoUrl: logoUrl,
    avatarUrl: logoUrl,
    frontImageUrl: tshirtUrl,
    actuationKey: "audit-8f198p5",
    generatedKey: "audit-8f198p5",
    items: items,
    mockups: items,
    products: productsPayload,
    updatedAt: nowIso
  };

  for (const cfg of firebaseConfigs) {
    console.log(`\n🔥 Traitement dans '${cfg.name}'...`);
    const app = initializeApp(cfg, `${cfg.name}_cleanup_app`);
    const db = getFirestore(app);

    // 1. Verrouiller SiteConfigs/guest_ms3ijgnco2xnid comme Projet Unique SSOT
    const masterRef = doc(db, 'SiteConfigs', 'guest_ms3ijgnco2xnid');
    await setDoc(masterRef, masterPayload, { merge: true });
    console.log(`  ✅ Master Document 'SiteConfigs/guest_ms3ijgnco2xnid' verrouillé.`);

    // 2. Maintenir SiteConfigs/fabrizio comme pointeur miroir parfait
    const aliasRef = doc(db, 'SiteConfigs', 'fabrizio');
    await setDoc(aliasRef, {
      ...masterPayload,
      id: 'fabrizio',
      aliasFor: 'guest_ms3ijgnco2xnid'
    }, { merge: true });
    console.log(`  ✅ Pointeur Alias 'SiteConfigs/fabrizio' mis à jour.`);

    // 3. Supprimer les documents résiduels et brouillons inutiles
    const docsToDelete = [
      { col: 'btp_projects', id: 'ZUnKqi6O6h5wzIkR1c5b' },
      { col: 'SiteConfigs', id: 'aaKw5rbj0WT17B5dLhvSPz0IU3Q2' },
      { col: 'SiteConfigs', id: 'audit-8f198p5' }
    ];

    for (const d of docsToDelete) {
      try {
        const dRef = doc(db, d.col, d.id);
        const dSnap = await getDoc(dRef);
        if (dSnap.exists()) {
          await deleteDoc(dRef);
          console.log(`  🗑️ Supprimé : ${d.col}/${d.id}`);
        } else {
          console.log(`  ℹ️ Déjà inexistant : ${d.col}/${d.id}`);
        }
      } catch (err) {
        console.log(`  ⚠️ Erreur lors de la suppression de ${d.col}/${d.id}:`, err.message);
      }
    }
  }

  console.log("\n🔍 Vérification finale de l'API /getUserBySlug?slug=fabrizio...");
  try {
    const res = await fetch('https://getuserbyslug-r5zxdnaotq-uc.a.run.app?slug=fabrizio');
    const data = await res.json();
    console.log("  Status API:", res.status);
    console.log("  ID Artiste:", data.artist?.id);
    console.log("  Nom Artiste:", data.artist?.companyName);
    console.log("  Logo URL:", data.artist?.logoUrl);
    console.log("  Nombre de produits:", data.products?.length);
  } catch (e) {
    console.log("  ⚠️ Erreur test API:", e.message);
  }

  process.exit(0);
}

main().catch(console.error);
