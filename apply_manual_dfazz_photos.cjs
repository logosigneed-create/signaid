const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc } = require('firebase/firestore');

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

const tshirtFrontUrl = "/assets/dfazz_tshirt_front.jpg";
const tshirtBackUrl = "/assets/dfazz_tshirt_back.jpg";
const poloFrontUrl = "/assets/dfazz_polo_front.jpg";
const poloBackUrl = "/assets/dfazz_polo_back.jpg";
const hoodieFrontUrl = "/assets/dfazz_hoodie_front.jpg";
const hoodieBackUrl = "/assets/dfazz_hoodie_back.jpg";
const blackLogoUrl = "/logo_dfazz_official_black.png";

async function updateProjects() {
  console.log("=================================================");
  console.log("AJOUT DU HOODIE PULL FACE & SYNCHRONISATION FIRESTORE");
  console.log("=================================================");

  const targetUids = ['audit-8f198p5', 'guest_ms3ijgnco2xnid', 'fabrizio', 'djdfazz'];

  const updatedItems = [
    {
      id: "tFront",
      garment: "tshirt",
      title: "T-shirt Noir Face DJ D-FAZZ Official",
      name: "T-shirt Noir Face DJ D-FAZZ Official",
      selected: true,
      price: 29.99,
      imageFront: tshirtFrontUrl,
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
      title: "T-shirt Noir Dos DJ D-FAZZ Official",
      name: "T-shirt Noir Dos DJ D-FAZZ Official",
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
      title: "Polo Premium Face DJ D-FAZZ Official",
      name: "Polo Premium Face DJ D-FAZZ Official",
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
      title: "Polo Premium Dos DJ D-FAZZ Official",
      name: "Polo Premium Dos DJ D-FAZZ Official",
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
      title: "Hoodie Premium Face DJ D-FAZZ Official",
      name: "Hoodie Premium Face DJ D-FAZZ Official",
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
      title: "Hoodie Premium Dos DJ D-FAZZ Official",
      name: "Hoodie Premium Dos DJ D-FAZZ Official",
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
    },
  ];

  const productsPayload = {
    tshirt: {
      id: "tFront",
      name: "T-shirt Noir Face DJ D-FAZZ Official",
      garment: "tshirt",
      aiImageUrl: tshirtFrontUrl,
      imageUrl: tshirtFrontUrl,
      imageFront: tshirtFrontUrl,
      price: 29.99
    },
    tshirtBack: {
      id: "tBack",
      name: "T-shirt Noir Dos DJ D-FAZZ Official",
      garment: "tshirt",
      aiImageUrl: tshirtBackUrl,
      imageUrl: tshirtBackUrl,
      imageFront: tshirtBackUrl,
      price: 29.99
    },
    polo: {
      id: "pFront",
      name: "Polo Premium Face DJ D-FAZZ Official",
      garment: "polo",
      aiImageUrl: poloFrontUrl,
      imageUrl: poloFrontUrl,
      imageFront: poloFrontUrl,
      price: 39.99
    },
    poloBack: {
      id: "pBack",
      name: "Polo Premium Dos DJ D-FAZZ Official",
      garment: "polo",
      aiImageUrl: poloBackUrl,
      imageUrl: poloBackUrl,
      imageFront: poloBackUrl,
      price: 39.99
    },
    hoodie: {
      id: "hFront",
      name: "Hoodie Premium Face DJ D-FAZZ Official",
      garment: "hoodie",
      aiImageUrl: hoodieFrontUrl,
      imageUrl: hoodieFrontUrl,
      imageFront: hoodieFrontUrl,
      price: 59.99
    },
    hoodieBack: {
      id: "hBack",
      name: "Hoodie Premium Dos DJ D-FAZZ Official",
      garment: "hoodie",
      aiImageUrl: hoodieBackUrl,
      imageUrl: hoodieBackUrl,
      imageFront: hoodieBackUrl,
      price: 59.99
    }
  };

  for (const uid of targetUids) {
    // 1. Update anonymous_previews
    const anonRef = doc(db, 'anonymous_previews', uid);
    try {
      await setDoc(anonRef, {
        logoUrl: blackLogoUrl,
        logoAdaptedUrl: blackLogoUrl,
        items: updatedItems,
        mockups: updatedItems,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      console.log(`  ✅ anonymous_previews/${uid} mis à jour avec Hoodie Face + Dos.`);
    } catch (e) {
      console.warn(`  ⚠️ Error updating anonymous_previews/${uid}:`, e.message);
    }

    // 2. Update btp_projects
    const projRef = doc(db, 'btp_projects', uid);
    try {
      await setDoc(projRef, {
        logoUrl: blackLogoUrl,
        logoAdaptedUrl: blackLogoUrl,
        items: updatedItems,
        mockups: updatedItems,
        productsSchema: productsPayload,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      console.log(`  ✅ btp_projects/${uid} mis à jour avec Hoodie Face + Dos.`);
    } catch (e) {
      console.warn(`  ⚠️ Error updating btp_projects/${uid}:`, e.message);
    }

    // 3. Update SiteConfigs
    const configRef = doc(db, 'SiteConfigs', uid);
    try {
      await setDoc(configRef, {
        logoUrl: blackLogoUrl,
        logoAdaptedUrl: blackLogoUrl,
        items: updatedItems,
        mockups: updatedItems,
        productsSchema: productsPayload,
        associatedShopUrl: "https://signaid.eu/portail-shop?audit=audit-8f198p5",
        updatedAt: new Date().toISOString()
      }, { merge: true });
      console.log(`  ✅ SiteConfigs/${uid} mis à jour avec Hoodie Face + Dos.`);
    } catch (e) {
      console.warn(`  ⚠️ Error updating SiteConfigs/${uid}:`, e.message);
    }
  }

  console.log("✨ Hoodie Face + Dos et visuels 100% synchronisés !");
  process.exit(0);
}

updateProjects().catch(err => {
  console.error("❌ Erreur:", err);
  process.exit(1);
});
