const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc, getDoc } = require('firebase/firestore');

const firebaseConfigs = [
  {
    name: 'signaid-prod',
    apiKey: 'AIzaSyDTSKpVei8lCANIQJBZmuKcsjEDIubnvcs',
    authDomain: 'signaid-prod.firebaseapp.com',
    projectId: 'signaid-prod',
    storageBucket: 'signaid-d2d08.firebasestorage.app',
    messagingSenderId: '244540314192',
    appId: '1:244540314192:web:814f987d2a6ece8ac67755'
  },
  {
    name: 'signaid-d2d08',
    apiKey: 'AIzaSyCSBJf55JkrUtB844YXKlGypj2TkRDwUIY',
    authDomain: 'signaid-d2d08.firebaseapp.com',
    projectId: 'signaid-d2d08',
    storageBucket: 'signaid-d2d08.firebasestorage.app',
    messagingSenderId: '214213761718',
    appId: '1:2545a0dc2f796e1d9e6417'
  }
];

const LOGO_ACTIVE_URL = 'https://firebasestorage.googleapis.com/v0/b/signaid-prod.firebasestorage.app/o/btp_mockups%2F2000theparty%2Fweb%2Flogo_A_active.png?alt=media&token=a540975a-0398-498b-9c9b-982d813b4fd9';

const MOCKUPS = {
  tFront: 'https://firebasestorage.googleapis.com/v0/b/signaid-prod.firebasestorage.app/o/btp_mockups%2F2000theparty%2Fweb%2FtFront.png?alt=media&token=92aa507e-7dfc-45ec-b7a9-abaf2693e041',
  tBack: 'https://firebasestorage.googleapis.com/v0/b/signaid-prod.firebasestorage.app/o/btp_mockups%2F2000theparty%2Fweb%2FtBack.png?alt=media&token=86369047-4ddd-4baf-bd2c-0f17479ce7fa',
  pFront: 'https://firebasestorage.googleapis.com/v0/b/signaid-prod.firebasestorage.app/o/btp_mockups%2F2000theparty%2Fweb%2FpFront.png?alt=media&token=ef80ea01-e21b-4953-8eb9-4d7fe9cb521b',
  pBack: 'https://firebasestorage.googleapis.com/v0/b/signaid-prod.firebasestorage.app/o/btp_mockups%2F2000theparty%2Fweb%2FpBack.png?alt=media&token=65b99ce2-11e9-4fa1-b58c-bab1c4888421',
  hFront: 'https://firebasestorage.googleapis.com/v0/b/signaid-prod.firebasestorage.app/o/btp_mockups%2F2000theparty%2Fweb%2FhFront.png?alt=media&token=7ea1d5c8-f17b-47fe-bb08-8fd26bc92c2d',
  hBack: 'https://firebasestorage.googleapis.com/v0/b/signaid-prod.firebasestorage.app/o/btp_mockups%2F2000theparty%2Fweb%2FhBack.png?alt=media&token=69b64855-9e64-4073-a31e-990bc40eb098'
};

const productsMap = {
  tshirt: {
    id: 'tFront',
    name: 'T-Shirt Noir 2000 the PARTY',
    title: 'T-Shirt Noir 2000 the PARTY',
    price: 30,
    garment: 'tshirt',
    color: 'Noir',
    imageFront: MOCKUPS.tFront,
    frontImageUrl: MOCKUPS.tFront,
    imageUrl: MOCKUPS.tFront,
    imageBack: MOCKUPS.tBack,
    backImageUrl: MOCKUPS.tBack,
    ai: MOCKUPS.tFront,
    aiRemastered: MOCKUPS.tFront,
    aiBack: MOCKUPS.tBack,
    aiRemasteredBack: MOCKUPS.tBack,
    sizes: ['S', 'M', 'L', 'XL'],
    colors: ['Noir']
  },
  polo: {
    id: 'pFront',
    name: 'Polo Premium 2000 the PARTY',
    title: 'Polo Premium 2000 the PARTY',
    price: 35,
    garment: 'polo',
    color: 'Noir',
    imageFront: MOCKUPS.pFront,
    frontImageUrl: MOCKUPS.pFront,
    imageUrl: MOCKUPS.pFront,
    imageBack: MOCKUPS.pBack,
    backImageUrl: MOCKUPS.pBack,
    ai: MOCKUPS.pFront,
    aiRemastered: MOCKUPS.pFront,
    aiBack: MOCKUPS.pBack,
    aiRemasteredBack: MOCKUPS.pBack,
    sizes: ['S', 'M', 'L', 'XL'],
    colors: ['Noir']
  },
  hoodie: {
    id: 'hFront',
    name: 'Hoodie Premium 2000 the PARTY',
    title: 'Hoodie Premium 2000 the PARTY',
    price: 45,
    garment: 'sweat',
    color: 'Noir',
    imageFront: MOCKUPS.hFront,
    frontImageUrl: MOCKUPS.hFront,
    imageUrl: MOCKUPS.hFront,
    imageBack: MOCKUPS.hBack,
    backImageUrl: MOCKUPS.hBack,
    ai: MOCKUPS.hFront,
    aiRemastered: MOCKUPS.hFront,
    aiBack: MOCKUPS.hBack,
    aiRemasteredBack: MOCKUPS.hBack,
    sizes: ['S', 'M', 'L', 'XL'],
    colors: ['Noir']
  }
};

const itemsList = [
  {
    id: 'tFront',
    name: 'T-Shirt Noir 2000 the PARTY',
    title: 'T-Shirt Noir 2000 the PARTY',
    price: 30,
    garment: 'tshirt',
    color: 'Noir',
    imageFront: MOCKUPS.tFront,
    frontImageUrl: MOCKUPS.tFront,
    imageUrl: MOCKUPS.tFront,
    imageBack: MOCKUPS.tBack,
    backImageUrl: MOCKUPS.tBack,
    ai: MOCKUPS.tFront,
    aiRemastered: MOCKUPS.tFront,
    aiBack: MOCKUPS.tBack,
    aiRemasteredBack: MOCKUPS.tBack,
    sizes: ['S', 'M', 'L', 'XL'],
    colors: ['Noir'],
    view: 'front',
    selected: true
  },
  {
    id: 'pFront',
    name: 'Polo Premium 2000 the PARTY',
    title: 'Polo Premium 2000 the PARTY',
    price: 35,
    garment: 'polo',
    color: 'Noir',
    imageFront: MOCKUPS.pFront,
    frontImageUrl: MOCKUPS.pFront,
    imageUrl: MOCKUPS.pFront,
    imageBack: MOCKUPS.pBack,
    backImageUrl: MOCKUPS.pBack,
    ai: MOCKUPS.pFront,
    aiRemastered: MOCKUPS.pFront,
    aiBack: MOCKUPS.pBack,
    aiRemasteredBack: MOCKUPS.pBack,
    sizes: ['S', 'M', 'L', 'XL'],
    colors: ['Noir'],
    view: 'front',
    selected: true
  },
  {
    id: 'hFront',
    name: 'Hoodie Premium 2000 the PARTY',
    title: 'Hoodie Premium 2000 the PARTY',
    price: 45,
    garment: 'sweat',
    color: 'Noir',
    imageFront: MOCKUPS.hFront,
    frontImageUrl: MOCKUPS.hFront,
    imageUrl: MOCKUPS.hFront,
    imageBack: MOCKUPS.hBack,
    backImageUrl: MOCKUPS.hBack,
    ai: MOCKUPS.hFront,
    aiRemastered: MOCKUPS.hFront,
    aiBack: MOCKUPS.hBack,
    aiRemasteredBack: MOCKUPS.hBack,
    sizes: ['S', 'M', 'L', 'XL'],
    colors: ['Noir'],
    view: 'front',
    selected: true
  }
];

const mockupsList = [
  {
    id: 'tFront',
    name: 'T-Shirt Noir 2000 the PARTY Face',
    title: 'T-Shirt Noir 2000 the PARTY Face',
    garment: 'tshirt',
    view: 'front',
    color: 'Noir',
    imageUrl: MOCKUPS.tFront,
    frontImageUrl: MOCKUPS.tFront,
    ai: MOCKUPS.tFront,
    aiRemastered: MOCKUPS.tFront,
    hasAi: true,
    selected: true
  },
  {
    id: 'tBack',
    name: 'T-Shirt Noir 2000 the PARTY Dos',
    title: 'T-Shirt Noir 2000 the PARTY Dos',
    garment: 'tshirt',
    view: 'back',
    color: 'Noir',
    imageUrl: MOCKUPS.tBack,
    backImageUrl: MOCKUPS.tBack,
    ai: MOCKUPS.tBack,
    aiRemastered: MOCKUPS.tBack,
    hasAi: true,
    selected: true
  },
  {
    id: 'pFront',
    name: 'Polo Premium 2000 the PARTY Face',
    title: 'Polo Premium 2000 the PARTY Face',
    garment: 'polo',
    view: 'front',
    color: 'Noir',
    imageUrl: MOCKUPS.pFront,
    frontImageUrl: MOCKUPS.pFront,
    ai: MOCKUPS.pFront,
    aiRemastered: MOCKUPS.pFront,
    hasAi: true,
    selected: true
  },
  {
    id: 'pBack',
    name: 'Polo Premium 2000 the PARTY Dos',
    title: 'Polo Premium 2000 the PARTY Dos',
    garment: 'polo',
    view: 'back',
    color: 'Noir',
    imageUrl: MOCKUPS.pBack,
    backImageUrl: MOCKUPS.pBack,
    ai: MOCKUPS.pBack,
    aiRemastered: MOCKUPS.pBack,
    hasAi: true,
    selected: true
  },
  {
    id: 'hFront',
    name: 'Hoodie Premium 2000 the PARTY Face',
    title: 'Hoodie Premium 2000 the PARTY Face',
    garment: 'sweat',
    view: 'front',
    color: 'Noir',
    imageUrl: MOCKUPS.hFront,
    frontImageUrl: MOCKUPS.hFront,
    ai: MOCKUPS.hFront,
    aiRemastered: MOCKUPS.hFront,
    hasAi: true,
    selected: true
  },
  {
    id: 'hBack',
    name: 'Hoodie Premium 2000 the PARTY Dos',
    title: 'Hoodie Premium 2000 the PARTY Dos',
    garment: 'sweat',
    view: 'back',
    color: 'Noir',
    imageUrl: MOCKUPS.hBack,
    backImageUrl: MOCKUPS.hBack,
    ai: MOCKUPS.hBack,
    aiRemastered: MOCKUPS.hBack,
    hasAi: true,
    selected: true
  }
];

const previewUrls = Object.values(MOCKUPS);

async function syncAll() {
  console.log('=== Synchronisation 2000 the PARTY ===\n');
  const nowIso = new Date().toISOString();

  for (const cfg of firebaseConfigs) {
    console.log('Synchronisation dans ' + cfg.name);
    const app = initializeApp(cfg, cfg.name + '_party_sync');
    const db = getFirestore(app);

    const basePayload = {
      logoUrl: LOGO_ACTIVE_URL,
      avatarUrl: LOGO_ACTIVE_URL,
      avatar: LOGO_ACTIVE_URL,
      logo: LOGO_ACTIVE_URL,
      logoA: LOGO_ACTIVE_URL,
      logoAdaptedUrl: LOGO_ACTIVE_URL,
      auditLogoUrl: LOGO_ACTIVE_URL,
      visualLogoUrl: LOGO_ACTIVE_URL,
      refinedLogoUrl: LOGO_ACTIVE_URL,
      cleanLogo: LOGO_ACTIVE_URL,
      remasteredLogo: LOGO_ACTIVE_URL,
      logos: {
        logoA: {
          original: LOGO_ACTIVE_URL,
          adapted: LOGO_ACTIVE_URL,
          activeUrl: LOGO_ACTIVE_URL,
          remastered: LOGO_ACTIVE_URL,
          mode: 'remastered'
        }
      },
      products: productsMap,
      productsMap: productsMap,
      items: itemsList,
      mockups: mockupsList,
      mockupsList: mockupsList,
      previewUrls: previewUrls,
      garmentMockups: {
        tshirt_front: MOCKUPS.tFront,
        tshirt_back: MOCKUPS.tBack,
        tFront: MOCKUPS.tFront,
        tBack: MOCKUPS.tBack,
        tshirt: MOCKUPS.tFront,
        polo_front: MOCKUPS.pFront,
        polo_back: MOCKUPS.pBack,
        pFront: MOCKUPS.pFront,
        pBack: MOCKUPS.pBack,
        polo: MOCKUPS.pFront,
        hoodie_front: MOCKUPS.hFront,
        hoodie_back: MOCKUPS.hBack,
        hFront: MOCKUPS.hFront,
        hBack: MOCKUPS.hBack,
        hoodie: MOCKUPS.hFront,
        sweat_front: MOCKUPS.hFront,
        sweat_back: MOCKUPS.hBack,
        sweat: MOCKUPS.hFront
      },
      companyName: '2000 the PARTY',
      activitySector: 'Événementiel, Musique & DJ',
      accentColor: '#ec4899',
      theme: 'dark',
      presentation: 'La soirée référence pour se replonger dans les années 2000! Reste connecté..',
      shopUrl: 'https://signaid.eu/portail-shop/2000theparty',
      merchUrl: 'https://signaid.eu/portail-shop/2000theparty',
      livePhotoUrl: null,
      livePhotoUrls: [],
      coverUrl: null,
      bannerUrl: null,
      coverImage: null,
      photos: [],
      isBannerRemoved: true,
      updatedAt: nowIso
    };

    // Target documents
    const targets = [
      { col: 'SiteConfigs', id: '2000theparty' },
      { col: 'SiteConfigs', id: 'audit-2000theparty-eyem' },
      { col: 'SiteConfigs', id: '2000theparty-eyem' },
      { col: 'anonymous_previews', id: 'audit-2000theparty-eyem' },
      { col: 'anonymous_previews', id: '661602a1-a52d-4eb9-b588-f9a6108afd65' },
      { col: 'btp_projects', id: '2000theparty' },
      { col: 'btp_projects', id: 'audit-2000theparty-eyem' },
      { col: 'prospects', id: '2000theparty' },
      { col: 'prospects', id: 'audit-2000theparty-eyem' }
    ];

    for (const t of targets) {
      try {
        const ref = doc(db, t.col, t.id);
        await setDoc(ref, basePayload, { merge: true });
        console.log('  OK: ' + t.col + '/' + t.id);
      } catch (err) {
        console.warn('  Erreur sur ' + t.col + '/' + t.id + ':', err.message);
      }
    }
  }

  console.log('\nSynchronisation terminee avec succes!');
  process.exit(0);
}

syncAll().catch(console.error);
