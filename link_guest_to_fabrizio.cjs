const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc, setDoc } = require('firebase/firestore');

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
  console.log("SYNCHRONISATION COMPLETE ET FORCÉE FIRESTORE");
  console.log("=================================================\n");

  const nowIso = new Date().toISOString();

  for (const cfg of firebaseConfigs) {
    console.log(`🔥 Synchronisation dans '${cfg.name}'...`);
    const app = initializeApp(cfg, `${cfg.name}_force_link`);
    const db = getFirestore(app);

    const fullPayload = {
      logoUrl: logoUrl,
      auditLogoUrl: logoUrl,
      avatarUrl: logoUrl,
      frontImageUrl: tshirtUrl,
      companyName: "DJ D-FAZZ",
      slug: "fabrizio",
      canonicalUid: "guest_ms3ijgnco2xnid",
      customDomain: "djdfazz.be",
      customDomains: ["fabrizio", "djdfazz", "djdfazz.be"],
      actuationKey: "audit-8f198p5",
      generatedKey: "audit-8f198p5",
      items: items,
      mockups: items,
      products: productsPayload,
      updatedAt: nowIso
    };

    // 1. SiteConfigs/guest_ms3ijgnco2xnid
    const guestRef = doc(db, 'SiteConfigs', 'guest_ms3ijgnco2xnid');
    await setDoc(guestRef, { ...fullPayload, uid: 'guest_ms3ijgnco2xnid' }, { merge: true });
    console.log(`✅ SiteConfigs/guest_ms3ijgnco2xnid synchronisé.`);

    // 2. SiteConfigs/fabrizio
    const fabRef = doc(db, 'SiteConfigs', 'fabrizio');
    await setDoc(fabRef, { ...fullPayload, id: 'fabrizio', aliasFor: 'guest_ms3ijgnco2xnid' }, { merge: true });
    console.log(`✅ SiteConfigs/fabrizio synchronisé.`);

    // 3. anonymous_previews/audit-8f198p5
    const auditRef = doc(db, 'anonymous_previews', 'audit-8f198p5');
    await setDoc(auditRef, {
      ...fullPayload,
      previewId: 'audit-8f198p5',
      projectId: 'audit-8f198p5'
    }, { merge: true });
    console.log(`✅ anonymous_previews/audit-8f198p5 synchronisé.`);

    // 4. btp_projects/VyabChQKvW8AkqX0Dykz
    const btpRef = doc(db, 'btp_projects', 'VyabChQKvW8AkqX0Dykz');
    await setDoc(btpRef, fullPayload, { merge: true });
    console.log(`✅ btp_projects/VyabChQKvW8AkqX0Dykz synchronisé.`);
  }

  console.log("\n🔍 Verification finale de l'API Cloud Function...");
  const res = await fetch('https://getuserbyslug-r5zxdnaotq-uc.a.run.app?slug=fabrizio');
  const data = await res.json();
  console.log("Status:", res.status);
  console.log("Company:", data.artist?.companyName);
  console.log("Logo:", data.artist?.logoUrl);
  console.log("T-Shirt Front URL:", data.products?.find(p => p.garment === 'tshirt')?.frontImageUrl);

  process.exit(0);
}

main().catch(console.error);
