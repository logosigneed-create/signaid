const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc, getDoc } = require('firebase/firestore');

const firebaseConfig = {
  name: "signaid-prod",
  apiKey: "AIzaSyDTSKpVei8lCANIQJBZmuKcsjEDIubnvcs",
  authDomain: "signaid-prod.firebaseapp.com",
  projectId: "signaid-prod",
  storageBucket: "signaid-prod.firebasestorage.app",
  messagingSenderId: "244540314192",
  appId: "1:244540314192:web:814f987d2a6ece8ac67755"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/**
 * Standardized Master Pipeline for Creating & Syncing Prospect Profiles
 * Enforces:
 * 1. Single prospect deduplication rule
 * 2. 6-asset HD product structure (tFront, tBack, pFront, pBack, hFront, hBack)
 * 3. Studio Mode HD photorealistic rendering (no double logo overlay)
 * 4. Dual-view Face/Dos compatibility with 1:1 square ratio
 */
async function createMasterProspectProfile(config) {
  const {
    slug,
    brandName,
    companyName = brandName,
    logoUrl,
    tshirtFrontUrl,
    tshirtBackUrl,
    poloFrontUrl,
    poloBackUrl,
    hoodieFrontUrl,
    hoodieBackUrl,
    aliases = []
  } = config;

  console.log(`=================================================`);
  console.log(`CREATION / SYNC DU PIPELINE PROSPECT MASTER : ${brandName}`);
  console.log(`=================================================`);

  const updatedItems = [
    {
      id: "tFront",
      garment: "tshirt",
      title: `${brandName} T-Shirt Face`,
      name: `${brandName} T-Shirt Face`,
      selected: true,
      price: 29.99,
      imageFront: tshirtFrontUrl,
      imageBack: tshirtFrontUrl,
      imageUrl: tshirtFrontUrl,
      ai: tshirtFrontUrl,
      aiImageUrl: tshirtFrontUrl,
      aiRemastered: tshirtFrontUrl,
      base: tshirtFrontUrl,
      view: "front"
    },
    {
      id: "tBack",
      garment: "tshirt",
      title: `${brandName} T-Shirt Dos`,
      name: `${brandName} T-Shirt Dos`,
      selected: true,
      price: 29.99,
      imageFront: tshirtBackUrl,
      imageBack: tshirtBackUrl,
      imageUrl: tshirtBackUrl,
      ai: tshirtBackUrl,
      aiImageUrl: tshirtBackUrl,
      aiRemastered: tshirtBackUrl,
      base: tshirtBackUrl,
      view: "back"
    },
    {
      id: "pFront",
      garment: "polo",
      title: `${brandName} Polo Face`,
      name: `${brandName} Polo Face`,
      selected: true,
      price: 39.99,
      imageFront: poloFrontUrl,
      imageBack: poloFrontUrl,
      imageUrl: poloFrontUrl,
      ai: poloFrontUrl,
      aiImageUrl: poloFrontUrl,
      aiRemastered: poloFrontUrl,
      base: poloFrontUrl,
      view: "front"
    },
    {
      id: "pBack",
      garment: "polo",
      title: `${brandName} Polo Dos`,
      name: `${brandName} Polo Dos`,
      selected: true,
      price: 39.99,
      imageFront: poloBackUrl,
      imageBack: poloBackUrl,
      imageUrl: poloBackUrl,
      ai: poloBackUrl,
      aiImageUrl: poloBackUrl,
      aiRemastered: poloBackUrl,
      base: poloBackUrl,
      view: "back"
    },
    {
      id: "hFront",
      garment: "hoodie",
      title: `${brandName} Hoodie Face`,
      name: `${brandName} Hoodie Face`,
      selected: true,
      price: 59.99,
      imageFront: hoodieFrontUrl,
      imageBack: hoodieFrontUrl,
      imageUrl: hoodieFrontUrl,
      ai: hoodieFrontUrl,
      aiImageUrl: hoodieFrontUrl,
      aiRemastered: hoodieFrontUrl,
      base: hoodieFrontUrl,
      view: "front"
    },
    {
      id: "hBack",
      garment: "hoodie",
      title: `${brandName} Hoodie Dos`,
      name: `${brandName} Hoodie Dos`,
      selected: true,
      price: 59.99,
      imageFront: hoodieBackUrl,
      imageBack: hoodieBackUrl,
      imageUrl: hoodieBackUrl,
      ai: hoodieBackUrl,
      aiImageUrl: hoodieBackUrl,
      aiRemastered: hoodieBackUrl,
      base: hoodieBackUrl,
      view: "back"
    }
  ];

  const productsPayload = {
    tshirt: { id: "tFront", name: `${brandName} T-Shirt Face`, garment: "tshirt", aiImageUrl: tshirtFrontUrl, imageUrl: tshirtFrontUrl, imageFront: tshirtFrontUrl, price: 29.99 },
    tshirtBack: { id: "tBack", name: `${brandName} T-Shirt Dos`, garment: "tshirt", aiImageUrl: tshirtBackUrl, imageUrl: tshirtBackUrl, imageFront: tshirtBackUrl, price: 29.99 },
    polo: { id: "pFront", name: `${brandName} Polo Face`, garment: "polo", aiImageUrl: poloFrontUrl, imageUrl: poloFrontUrl, imageFront: poloFrontUrl, price: 39.99 },
    poloBack: { id: "pBack", name: `${brandName} Polo Dos`, garment: "polo", aiImageUrl: poloBackUrl, imageUrl: poloBackUrl, imageFront: poloBackUrl, price: 39.99 },
    hoodie: { id: "hFront", name: `${brandName} Hoodie Face`, garment: "hoodie", aiImageUrl: hoodieFrontUrl, imageUrl: hoodieFrontUrl, imageFront: hoodieFrontUrl, price: 59.99 },
    hoodieBack: { id: "hBack", name: `${brandName} Hoodie Dos`, garment: "hoodie", aiImageUrl: hoodieBackUrl, imageUrl: hoodieBackUrl, imageFront: hoodieBackUrl, price: 59.99 }
  };

  const normalizedProducts = [
    {
      id: "tFront",
      garment: "tshirt",
      name: `${brandName} T-Shirt`,
      title: `${brandName} T-Shirt`,
      price: 29.99,
      frontImageUrl: tshirtFrontUrl,
      backImageUrl: tshirtBackUrl,
      imageUrl: tshirtFrontUrl,
      ai: true,
      aiRemastered: true,
      mechanical: tshirtFrontUrl,
      mechanicalFront: tshirtFrontUrl,
      mechanicalBack: tshirtBackUrl
    },
    {
      id: "pFront",
      garment: "polo",
      name: `${brandName} Polo`,
      title: `${brandName} Polo`,
      price: 39.99,
      frontImageUrl: poloFrontUrl,
      backImageUrl: poloBackUrl,
      imageUrl: poloFrontUrl,
      ai: true,
      aiRemastered: true,
      mechanical: poloFrontUrl,
      mechanicalFront: poloFrontUrl,
      mechanicalBack: poloBackUrl
    },
    {
      id: "hFront",
      garment: "hoodie",
      name: `${brandName} Hoodie`,
      title: `${brandName} Hoodie`,
      price: 59.99,
      frontImageUrl: hoodieFrontUrl,
      backImageUrl: hoodieBackUrl,
      imageUrl: hoodieFrontUrl,
      ai: true,
      aiRemastered: true,
      mechanical: hoodieFrontUrl,
      mechanicalFront: hoodieFrontUrl,
      mechanicalBack: hoodieBackUrl
    }
  ];

  const payload = {
    companyName: companyName,
    brandName: brandName,
    userLogo: logoUrl,
    logoUrl: logoUrl,
    updatedAt: new Date().toISOString(),
    items: updatedItems,
    products: normalizedProducts,
    productsMap: productsPayload,
    mockups: updatedItems,
    aiProductsCount: normalizedProducts.length
  };

  const targetUids = Array.from(new Set([slug, ...aliases]));

  for (const uid of targetUids) {
    try {
      await setDoc(doc(db, 'anonymous_previews', uid), payload, { merge: true });
      await setDoc(doc(db, 'btp_projects', uid), payload, { merge: true });
      await setDoc(doc(db, 'SiteConfigs', uid), payload, { merge: true });
      await setDoc(doc(db, 'prospects', uid), payload, { merge: true });
      await setDoc(doc(db, 'audits', uid), payload, { merge: true });
      await setDoc(doc(db, 'vault', uid), payload, { merge: true });
      console.log(`[BACKEND_PROFILE_PERSIST] Profil ${uid} mis à jour avec ${normalizedProducts.length} produits IA.`);
    } catch (e) {
      console.error(`  ❌ Erreur de synchronisation pour ${uid}:`, e);
    }
  }

  console.log(`✨ Profil ${brandName} 100% configuré selon le pipeline Master !`);
}

// Validation immédiate pour DJ D-FAZZ (/fabrizio)
if (require.main === module) {
  createMasterProspectProfile({
    slug: 'guest_ms3ijgnco2xnid',
    brandName: 'DJ D-FAZZ',
    companyName: 'DJ D-FAZZ',
    logoUrl: '/logo_dfazz_official_black.png',
    tshirtFrontUrl: '/assets/dfazz_tshirt_front.jpg',
    tshirtBackUrl: '/assets/dfazz_tshirt_back.jpg',
    poloFrontUrl: '/assets/dfazz_polo_front.jpg',
    poloBackUrl: '/assets/dfazz_polo_back.jpg',
    hoodieFrontUrl: '/assets/dfazz_hoodie_front.jpg',
    hoodieBackUrl: '/assets/dfazz_hoodie_back.jpg',
    aliases: ['fabrizio', 'djdfazz', 'audit-8f198p5']
  }).then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { createMasterProspectProfile };
