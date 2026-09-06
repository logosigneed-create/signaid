const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc, getDoc } = require('firebase/firestore');

const firebaseConfigs = [
  {
    name: "signaid-prod",
    apiKey: "AIzaSyDTSKpVei8lCANIQJBZmuKcsjEDIubnvcs",
    authDomain: "signaid-prod.firebaseapp.com",
    projectId: "signaid-prod",
    storageBucket: "signaid-prod.firebasestorage.app",
    messagingSenderId: "244540314192",
    appId: "1:244540314192:web:814f987d2a6ece8ac67755"
  }
];

const logoUrl = "https://firebasestorage.googleapis.com/v0/b/signaid-prod.firebasestorage.app/o/shared_media%2Fbtp_mockups%2Faudit-8f198p5%2Flogo_dfazz_official_1786740602971.png?alt=media&token=5c1c6d86-a2b1-4d3d-82d0-d1c91a136ef0";
const tshirtUrl = "https://firebasestorage.googleapis.com/v0/b/signaid-prod.firebasestorage.app/o/shared_media%2Fbtp_mockups%2Faudit-8f198p5%2Ftshirt_dfazz_isolated_1786740001609.png?alt=media&token=02459724-a44b-4068-b968-8eff724a391f";
const poloUrl = "https://firebasestorage.googleapis.com/v0/b/signaid-prod.firebasestorage.app/o/shared_media%2Fbtp_mockups%2Faudit-8f198p5%2Fpolo_dfazz_isolated_1786740001609.png?alt=media&token=807da046-8655-4157-9275-5461cab244bf";
const hoodieUrl = "https://firebasestorage.googleapis.com/v0/b/signaid-prod.firebasestorage.app/o/shared_media%2Fbtp_mockups%2Faudit-8f198p5%2Fhoodie_dfazz_isolated_1786740001609.png?alt=media&token=0ec93151-5e8d-429a-bb32-baa53f882603";
const shopUrl = "https://signaid.eu/portail-shop?audit=audit-8f198p5";

const shopItems = [
  {
    id: "tFront",
    garment: "tshirt",
    title: "T-shirt Noir DJ D-FAZZ Official",
    name: "T-shirt Noir DJ D-FAZZ Official",
    selected: true,
    price: 29.99,
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
    name: "Polo Premium DJ D-FAZZ Official",
    selected: true,
    price: 39.99,
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
    name: "Hoodie Premium DJ D-FAZZ Official",
    selected: true,
    price: 59.99,
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
  console.log("ASSOCIATION DU SHOP audit-8f198p5 A guest_ms3ijgnco2xnid / /fabrizio");
  console.log("=================================================\n");

  const nowIso = new Date().toISOString();

  const updateData = {
    actuationKey: "audit-8f198p5",
    generatedKey: "audit-8f198p5",
    previewId: "audit-8f198p5",
    projectId: "audit-8f198p5",
    auditKey: "audit-8f198p5",
    shopUrl: shopUrl,
    merchUrl: shopUrl,
    logoUrl: logoUrl,
    auditLogoUrl: logoUrl,
    logoAdaptedUrl: logoUrl,
    companyName: "DJ D-FAZZ",
    slug: "fabrizio",
    canonicalUid: "guest_ms3ijgnco2xnid",
    items: shopItems,
    mockups: shopItems,
    products: productsPayload,
    updatedAt: nowIso
  };

  for (const cfg of firebaseConfigs) {
    console.log(`🔥 Synchronisation dans '${cfg.name}'...`);
    const app = initializeApp(cfg, `${cfg.name}_shop_link`);
    const db = getFirestore(app);

    // 1. SiteConfigs/guest_ms3ijgnco2xnid
    const guestRef = doc(db, 'SiteConfigs', 'guest_ms3ijgnco2xnid');
    await setDoc(guestRef, { ...updateData, uid: 'guest_ms3ijgnco2xnid' }, { merge: true });
    console.log(`  ✅ SiteConfigs/guest_ms3ijgnco2xnid associe avec le shop portail-shop?audit=audit-8f198p5.`);

    // 2. SiteConfigs/fabrizio
    const fabRef = doc(db, 'SiteConfigs', 'fabrizio');
    await setDoc(fabRef, { ...updateData, id: 'fabrizio', aliasFor: 'guest_ms3ijgnco2xnid' }, { merge: true });
    console.log(`  ✅ SiteConfigs/fabrizio associe.`);

    // 3. anonymous_previews/audit-8f198p5
    const auditRef = doc(db, 'anonymous_previews', 'audit-8f198p5');
    await setDoc(auditRef, updateData, { merge: true });
    console.log(`  ✅ anonymous_previews/audit-8f198p5 associe.`);

    // 4. btp_projects/VyabChQKvW8AkqX0Dykz
    const btpRef = doc(db, 'btp_projects', 'VyabChQKvW8AkqX0Dykz');
    await setDoc(btpRef, updateData, { merge: true });
    console.log(`  ✅ btp_projects/VyabChQKvW8AkqX0Dykz associe.`);
  }

  process.exit(0);
}

main().catch(console.error);
