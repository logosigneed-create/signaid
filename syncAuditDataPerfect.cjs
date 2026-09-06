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

function sanitizeForFirestore(obj) {
  if (!obj) return obj;
  if (typeof obj === 'string') {
    if (obj.startsWith('data:image')) {
      console.log('   ⚠️ Base64 data string detected and sanitized out!');
      return null;
    }
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitizeForFirestore).filter(Boolean);
  }
  if (typeof obj === 'object') {
    const cleanObj = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const val = sanitizeForFirestore(obj[key]);
        if (val !== null && val !== undefined) {
          cleanObj[key] = val;
        }
      }
    }
    return cleanObj;
  }
  return obj;
}

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
  console.log("SYNCHRONISATION ET TELEVERSEMENT DES VISUELS FUSIONNÉS FIRESTORE");
  console.log("=================================================\n");

  const primaryApp = initializeApp(firebaseConfigs[0], firebaseConfigs[0].name);
  const storage = getStorage(primaryApp);

  const logoLocal = path.resolve(__dirname, 'public/logo_dfazz_white_perfect.png');
  const tshirtLocal = path.resolve(__dirname, 'public/tshirt_dfazz_merged_perfect.png');
  const poloLocal = path.resolve(__dirname, 'public/polo_dfazz_merged_perfect.png');
  const hoodieLocal = path.resolve(__dirname, 'public/hoodie_dfazz_merged_perfect.png');

  const ts = Date.now();
  console.log("1. Upload du logo blanc d'origine vers shared_media/btp_mockups/audit-8f198p5/...");
  const logoUrl = await uploadFileToStorage(
    storage, 
    logoLocal, 
    `shared_media/btp_mockups/audit-8f198p5/logo_dfazz_white_${ts}.png`
  );

  console.log("2. Upload des maquettes textiles fusionnées et vérifiées vers /web/...");
  const tshirtUrl = await uploadFileToStorage(storage, tshirtLocal, `web/tshirt_dfazz_${ts}.png`);
  const poloUrl = await uploadFileToStorage(storage, poloLocal, `web/polo_dfazz_${ts}.png`);
  const hoodieUrl = await uploadFileToStorage(storage, hoodieLocal, `web/hoodie_dfazz_${ts}.png`);

  console.log("\n=================================================");
  console.log("📌 URLs FIREBASE STORAGE PUBLIQUES OBTENUES :");
  console.log(`  - logoUrl: ${logoUrl}`);
  console.log(`  - tshirtUrl: ${tshirtUrl}`);
  console.log(`  - poloUrl: ${poloUrl}`);
  console.log(`  - hoodieUrl: ${hoodieUrl}`);
  console.log("=================================================\n");

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

  const nowIso = new Date().toISOString();

  const baseDocPayload = {
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

  const sanitizedPayload = sanitizeForFirestore(baseDocPayload);

  for (const cfg of firebaseConfigs) {
    console.log(`\n=================================================`);
    console.log(`📝 Synchronisation Firestore dans '${cfg.name}'...`);
    console.log(`=================================================`);

    let app;
    try {
      app = initializeApp(cfg, `${cfg.name}_db_app_v6`);
    } catch (e) {
      app = primaryApp;
    }
    const db = getFirestore(app);

    // 1. SiteConfigs/fabrizio
    const fabRef = doc(db, 'SiteConfigs', 'fabrizio');
    await setDoc(fabRef, sanitizedPayload, { merge: true });
    console.log(`✅ Document 'SiteConfigs/fabrizio' mis à jour.`);

    // 2. SiteConfigs/guest_ms3ijgnco2xnid
    const guestRef = doc(db, 'SiteConfigs', 'guest_ms3ijgnco2xnid');
    await setDoc(guestRef, sanitizedPayload, { merge: true });
    console.log(`✅ Document 'SiteConfigs/guest_ms3ijgnco2xnid' mis à jour.`);

    // 3. anonymous_previews/audit-8f198p5
    const auditRef = doc(db, 'anonymous_previews', 'audit-8f198p5');
    await setDoc(auditRef, {
      ...sanitizedPayload,
      previewId: 'audit-8f198p5',
      projectId: 'audit-8f198p5'
    }, { merge: true });
    console.log(`✅ Document 'anonymous_previews/audit-8f198p5' mis à jour.`);

    // 4. btp_projects/VyabChQKvW8AkqX0Dykz
    const btpRef = doc(db, 'btp_projects', 'VyabChQKvW8AkqX0Dykz');
    await setDoc(btpRef, sanitizedPayload, { merge: true });
    console.log(`✅ Document 'btp_projects/VyabChQKvW8AkqX0Dykz' mis à jour.`);

    // Affichage des JSON exacts
    const finalFabSnap = await getDoc(fabRef);
    console.log(`\n📄 JSON SANITIZÉ FIRESTORE [SiteConfigs/fabrizio] (${cfg.name}) :`);
    console.log(JSON.stringify(finalFabSnap.data(), null, 2));

    const finalAuditSnap = await getDoc(auditRef);
    console.log(`\n📄 JSON SANITIZÉ FIRESTORE [anonymous_previews/audit-8f198p5] (${cfg.name}) :`);
    console.log(JSON.stringify(finalAuditSnap.data(), null, 2));
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Erreur fatale dans syncAuditDataPerfect.cjs :", err);
  process.exit(1);
});
