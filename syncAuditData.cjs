const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc, setDoc } = require('firebase/firestore');
const { getStorage, ref, uploadBytes, getDownloadURL } = require('firebase/storage');
const fs = require('fs');
const path = require('path');

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
    appId: "1:214213761718:web:2545a0dc2f796e1d9e6417"
  }
];

async function uploadFileToStorage(storage, localPath, storagePath) {
  try {
    const buffer = fs.readFileSync(localPath);
    const blob = new Blob([buffer], { type: 'image/png' });
    const storageRef = ref(storage, storagePath);
    await uploadBytes(storageRef, blob, { contentType: 'image/png' });
    const url = await getDownloadURL(storageRef);
    return url;
  } catch (err) {
    console.error(`❌ Erreur upload (${storagePath}):`, err.message);
    return null;
  }
}

async function main() {
  console.log("=================================================");
  console.log("SYNCHRONISATION PROPRE DES VISUELS ET LOGO D-FAZZ ORIGINAUX");
  console.log("=================================================\n");

  const primaryApp = initializeApp(firebaseConfigs[0], firebaseConfigs[0].name);
  const storage = getStorage(primaryApp);

  const logoLocal = path.resolve(__dirname, 'public/logo_dfazz_avatar_final.png');
  const tshirtLocal = path.resolve(__dirname, 'public/tshirt_dfazz_original_mockup.png');
  const poloLocal = path.resolve(__dirname, 'public/polo_dfazz_original_mockup.png');
  const hoodieLocal = path.resolve(__dirname, 'public/hoodie_dfazz_original_mockup.png');

  console.log("📤 Upload des vraies images d'origine vers Firebase Storage...");
  const ts = Date.now();
  const logoUrl = await uploadFileToStorage(storage, logoLocal, `shared_media/btp_mockups/audit-8f198p5/logo_dfazz_original_${ts}.png`);
  const tshirtUrl = await uploadFileToStorage(storage, tshirtLocal, `shared_media/btp_mockups/audit-8f198p5/tshirt_dfazz_isolated_${ts}.png`);
  const poloUrl = await uploadFileToStorage(storage, poloLocal, `shared_media/btp_mockups/audit-8f198p5/polo_dfazz_isolated_${ts}.png`);
  const hoodieUrl = await uploadFileToStorage(storage, hoodieLocal, `shared_media/btp_mockups/audit-8f198p5/hoodie_dfazz_isolated_${ts}.png`);

  console.log("\n=================================================");
  console.log("📌 URL EXACTE DU FICHIER LOGO TROUVÉ POUR audit-8f198p5 :");
  console.log(`>>> ${logoUrl}`);
  console.log("=================================================\n");

  console.log("URLs Firebase Storage obtenues pour les vêtements :");
  console.log("  - tshirtUrl:", tshirtUrl);
  console.log("  - poloUrl:", poloUrl);
  console.log("  - hoodieUrl:", hoodieUrl);

  const items = [
    {
      id: "tFront",
      garment: "tshirt",
      title: "T-shirt Noir DJ D-FAZZ",
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
      title: "Polo Premium DJ D-FAZZ",
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
      title: "Hoodie Premium DJ D-FAZZ",
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
      name: "T-shirt Noir DJ D-FAZZ",
      garment: "tshirt",
      aiImageUrl: tshirtUrl,
      imageUrl: tshirtUrl,
      imageFront: tshirtUrl,
      price: 29.99
    },
    polo: {
      id: "pFront",
      name: "Polo Premium DJ D-FAZZ",
      garment: "polo",
      aiImageUrl: poloUrl,
      imageUrl: poloUrl,
      imageFront: poloUrl,
      price: 39.99
    },
    hoodie: {
      id: "hFront",
      name: "Hoodie Premium DJ D-FAZZ",
      garment: "sweat",
      aiImageUrl: hoodieUrl,
      imageUrl: hoodieUrl,
      imageFront: hoodieUrl,
      price: 59.99
    }
  };

  const nowIso = new Date().toISOString();

  for (const cfg of firebaseConfigs) {
    console.log(`\n=================================================`);
    console.log(`📝 Synchronisation dans '${cfg.name}'...`);
    console.log(`=================================================`);

    let app;
    try {
      app = initializeApp(cfg, `${cfg.name}_db_app_v4`);
    } catch (e) {
      app = primaryApp;
    }
    const db = getFirestore(app);

    const docPayload = {
      logoUrl: logoUrl,
      auditLogoUrl: logoUrl,
      avatarUrl: logoUrl,
      frontImageUrl: tshirtUrl,
      companyName: "DJ D-FAZZ",
      slug: "fabrizio",
      items: items,
      mockups: items,
      products: productsPayload,
      actuationKey: 'audit-8f198p5',
      generatedKey: 'audit-8f198p5',
      updatedAt: nowIso
    };

    // 1. SiteConfigs/guest_ms3ijgnco2xnid
    const guestRef = doc(db, 'SiteConfigs', 'guest_ms3ijgnco2xnid');
    await setDoc(guestRef, docPayload, { merge: true });
    console.log(`✅ SiteConfigs/guest_ms3ijgnco2xnid synchronisé.`);

    // 2. SiteConfigs/fabrizio
    const fabRef = doc(db, 'SiteConfigs', 'fabrizio');
    await setDoc(fabRef, docPayload, { merge: true });
    console.log(`✅ SiteConfigs/fabrizio synchronisé.`);

    // 3. anonymous_previews/audit-8f198p5
    const auditRef = doc(db, 'anonymous_previews', 'audit-8f198p5');
    await setDoc(auditRef, {
      ...docPayload,
      previewId: 'audit-8f198p5',
      projectId: 'audit-8f198p5'
    }, { merge: true });
    console.log(`✅ anonymous_previews/audit-8f198p5 synchronisé.`);

    // 4. btp_projects/VyabChQKvW8AkqX0Dykz
    const btpRef = doc(db, 'btp_projects', 'VyabChQKvW8AkqX0Dykz');
    await setDoc(btpRef, docPayload, { merge: true });
    console.log(`✅ btp_projects/VyabChQKvW8AkqX0Dykz synchronisé.`);

    // Affichage des JSON exacts
    const finalGuestSnap = await getDoc(guestRef);
    console.log(`\n📄 JSON SiteConfigs/guest_ms3ijgnco2xnid (${cfg.name}) :`);
    console.log(JSON.stringify(finalGuestSnap.data(), null, 2));

    const finalFabSnap = await getDoc(fabRef);
    console.log(`\n📄 JSON SiteConfigs/fabrizio (${cfg.name}) :`);
    console.log(JSON.stringify(finalFabSnap.data(), null, 2));

    const finalAuditSnap = await getDoc(auditRef);
    console.log(`\n📄 JSON anonymous_previews/audit-8f198p5 (${cfg.name}) :`);
    console.log(JSON.stringify(finalAuditSnap.data(), null, 2));
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Erreur fatale dans syncAuditData.cjs :", err);
  process.exit(1);
});
