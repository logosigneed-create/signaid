const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc, getDoc } = require('firebase/firestore');

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

const officialWhiteLogoUrl = "https://firebasestorage.googleapis.com/v0/b/signaid-d2d08.firebasestorage.app/o/shared_media%2Fbtp_mockups%2Faudit-8f198p5%2Flogo_dfazz_official_1786740602971.png?alt=media&token=5c1c6d86-a2b1-4d3d-82d0-d1c91a136ef0";
const tshirtUrl = "https://firebasestorage.googleapis.com/v0/b/signaid-d2d08.firebasestorage.app/o/shared_media%2Fbtp_mockups%2Faudit-8f198p5%2Ftshirt_dfazz_isolated_1786740001609.png?alt=media&token=02459724-a44b-4068-b968-8eff724a391f";
const poloUrl = "https://firebasestorage.googleapis.com/v0/b/signaid-d2d08.firebasestorage.app/o/shared_media%2Fbtp_mockups%2Faudit-8f198p5%2Fpolo_dfazz_isolated_1786740001609.png?alt=media&token=807da046-8655-4157-9275-5461cab244bf";
const hoodieUrl = "https://firebasestorage.googleapis.com/v0/b/signaid-d2d08.firebasestorage.app/o/shared_media%2Fbtp_mockups%2Faudit-8f198p5%2Fhoodie_dfazz_isolated_1786740001609.png?alt=media&token=0ec93151-5e8d-429a-bb32-baa53f882603";

async function main() {
  console.log("=== VERROUILLAGE DU LOGO BLANC OFFICIEL DJ D-FAZZ ET MOCKUPS EN BASE ===");

  const logoPayload = {
    original: officialWhiteLogoUrl,
    adapted: officialWhiteLogoUrl,
    activeUrl: officialWhiteLogoUrl,
    processed: officialWhiteLogoUrl,
    remastered: officialWhiteLogoUrl,
    mode: 'original'
  };

  const updatePayload = {
    logoUrl: officialWhiteLogoUrl,
    auditLogoUrl: officialWhiteLogoUrl,
    logoAdaptedUrl: officialWhiteLogoUrl,
    logoOriginalUrl: officialWhiteLogoUrl,
    logoRemasteredUrl: officialWhiteLogoUrl,
    "logos.logoA": logoPayload,
    "logos.logoB": logoPayload,
    logos: {
      logoA: logoPayload,
      logoB: logoPayload
    },
    items: [
      { id: "tFront", garment: "tshirt", title: "T-shirt Noir DJ D-FAZZ Official", price: 29.99, imageFront: tshirtUrl, imageUrl: tshirtUrl, aiImageUrl: tshirtUrl },
      { id: "pFront", garment: "polo", title: "Polo Premium DJ D-FAZZ Official", price: 39.99, imageFront: poloUrl, imageUrl: poloUrl, aiImageUrl: poloUrl },
      { id: "hFront", garment: "sweat", title: "Hoodie Premium DJ D-FAZZ Official", price: 59.99, imageFront: hoodieUrl, imageUrl: hoodieUrl, aiImageUrl: hoodieUrl }
    ]
  };

  for (const cfg of firebaseConfigs) {
    console.log(`🔥 Synchronisation dans '${cfg.name}'...`);
    const app = initializeApp(cfg, `${cfg.name}_logo_fix`);
    const db = getFirestore(app);

    await setDoc(doc(db, 'anonymous_previews', 'audit-8f198p5'), updatePayload, { merge: true });
    console.log(`  ✅ anonymous_previews/audit-8f198p5 mis a jour avec le logo blanc officiel.`);

    await setDoc(doc(db, 'btp_projects', 'VyabChQKvW8AkqX0Dykz'), updatePayload, { merge: true });
    console.log(`  ✅ btp_projects/VyabChQKvW8AkqX0Dykz mis a jour.`);

    await setDoc(doc(db, 'SiteConfigs', 'guest_ms3ijgnco2xnid'), updatePayload, { merge: true });
    console.log(`  ✅ SiteConfigs/guest_ms3ijgnco2xnid mis a jour.`);

    await setDoc(doc(db, 'SiteConfigs', 'fabrizio'), updatePayload, { merge: true });
    console.log(`  ✅ SiteConfigs/fabrizio mis a jour.`);
  }

  process.exit(0);
}

main().catch(console.error);
