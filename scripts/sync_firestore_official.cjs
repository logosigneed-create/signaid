const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc } = require('firebase/firestore');

const firebaseConfigs = [
  {
    name: 'signaid-prod',
    apiKey: 'AIzaSyDTSKpVei8lCANIQJBZmuKcsjEDIubnvcs',
    authDomain: 'signaid-prod.firebaseapp.com',
    projectId: 'signaid-prod',
    storageBucket: 'signaid-prod.firebasestorage.app'
  },
  {
    name: 'signaid-d2d08',
    apiKey: 'AIzaSyCSBJf55JkrUtB844YXKlGypj2TkRDwUIY',
    authDomain: 'signaid-d2d08.firebaseapp.com',
    projectId: 'signaid-d2d08',
    storageBucket: 'signaid-d2d08.firebasestorage.app'
  }
];

const LOGO_ACTIVE = 'https://firebasestorage.googleapis.com/v0/b/signaid-prod.firebasestorage.app/o/btp_mockups%2F2000theparty%2Fweb%2Flogo_A_active.png?alt=media&token=33bc2147-0ae9-4e03-9de3-f6118e31376e';

const MOCKUPS = {
  tFront: 'https://firebasestorage.googleapis.com/v0/b/signaid-prod.firebasestorage.app/o/btp_mockups%2F2000theparty%2Fweb%2FtFront.png?alt=media&token=e61c81aa-e34e-4d0e-a6f9-f9c9cf820d60',
  tBack: 'https://firebasestorage.googleapis.com/v0/b/signaid-prod.firebasestorage.app/o/btp_mockups%2F2000theparty%2Fweb%2FtBack.png?alt=media&token=e1ed941d-2919-4599-aa93-1cb08eee05e1',
  pFront: 'https://firebasestorage.googleapis.com/v0/b/signaid-prod.firebasestorage.app/o/btp_mockups%2F2000theparty%2Fweb%2FpFront.png?alt=media&token=5d211d11-85e0-464d-85ed-1c787d17de25',
  pBack: 'https://firebasestorage.googleapis.com/v0/b/signaid-prod.firebasestorage.app/o/btp_mockups%2F2000theparty%2Fweb%2FpBack.png?alt=media&token=991a8e51-cdd5-4d78-8c1e-677d27fb8af9',
  hFront: 'https://firebasestorage.googleapis.com/v0/b/signaid-prod.firebasestorage.app/o/btp_mockups%2F2000theparty%2Fweb%2FhFront.png?alt=media&token=14255116-e180-4c3a-80b3-e445b021fff4',
  hBack: 'https://firebasestorage.googleapis.com/v0/b/signaid-prod.firebasestorage.app/o/btp_mockups%2F2000theparty%2Fweb%2FhBack.png?alt=media&token=7126610f-3f0b-4d55-8a6f-3c149a3a5ba7'
};

const productsList = [
  {
    id: '2000theparty-tshirt',
    title: 'T-Shirt Unisexe - 2000 the PARTY',
    name: 'T-Shirt Unisexe - 2000 the PARTY',
    price: 30,
    garment: 'tshirt',
    category: 'tshirt',
    color: 'Noir',
    colors: ['Noir'],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    frontImageUrl: MOCKUPS.tFront,
    imageFront: MOCKUPS.tFront,
    imageUrl: MOCKUPS.tFront,
    ai: MOCKUPS.tFront,
    aiRemastered: MOCKUPS.tFront,
    backImageUrl: MOCKUPS.tBack,
    imageBack: MOCKUPS.tBack,
    aiBack: MOCKUPS.tBack,
    aiRemasteredBack: MOCKUPS.tBack
  },
  {
    id: '2000theparty-polo',
    title: 'Polo Piqué - 2000 the PARTY',
    name: 'Polo Piqué - 2000 the PARTY',
    price: 35,
    garment: 'polo',
    category: 'polo',
    color: 'Noir',
    colors: ['Noir'],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    frontImageUrl: MOCKUPS.pFront,
    imageFront: MOCKUPS.pFront,
    imageUrl: MOCKUPS.pFront,
    ai: MOCKUPS.pFront,
    aiRemastered: MOCKUPS.pFront,
    backImageUrl: MOCKUPS.pBack,
    imageBack: MOCKUPS.pBack,
    aiBack: MOCKUPS.pBack,
    aiRemasteredBack: MOCKUPS.pBack
  },
  {
    id: '2000theparty-hoodie',
    title: 'Sweat à Capuche - 2000 the PARTY',
    name: 'Sweat à Capuche - 2000 the PARTY',
    price: 50,
    garment: 'hoodie',
    category: 'hoodie',
    color: 'Noir',
    colors: ['Noir'],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    frontImageUrl: MOCKUPS.hFront,
    imageFront: MOCKUPS.hFront,
    imageUrl: MOCKUPS.hFront,
    ai: MOCKUPS.hFront,
    aiRemastered: MOCKUPS.hFront,
    backImageUrl: MOCKUPS.hBack,
    imageBack: MOCKUPS.hBack,
    aiBack: MOCKUPS.hBack,
    aiRemasteredBack: MOCKUPS.hBack
  }
];

const mockupsArray = [
  { id: 'tFront', title: 'T-Shirt Unisexe Face', garment: 'tshirt', frontImageUrl: MOCKUPS.tFront, imageUrl: MOCKUPS.tFront, view: 'front' },
  { id: 'tBack', title: 'T-Shirt Unisexe Dos', garment: 'tshirt', backImageUrl: MOCKUPS.tBack, imageUrl: MOCKUPS.tBack, view: 'back' },
  { id: 'pFront', title: 'Polo Piqué Face', garment: 'polo', frontImageUrl: MOCKUPS.pFront, imageUrl: MOCKUPS.pFront, view: 'front' },
  { id: 'pBack', title: 'Polo Piqué Dos', garment: 'polo', backImageUrl: MOCKUPS.pBack, imageUrl: MOCKUPS.pBack, view: 'back' },
  { id: 'hFront', title: 'Sweat à Capuche Face', garment: 'hoodie', frontImageUrl: MOCKUPS.hFront, imageUrl: MOCKUPS.hFront, view: 'front' },
  { id: 'hBack', title: 'Sweat à Capuche Dos', garment: 'hoodie', backImageUrl: MOCKUPS.hBack, imageUrl: MOCKUPS.hBack, view: 'back' }
];

const garmentMockupsObj = {
  tshirt_front: MOCKUPS.tFront,
  tshirt_back: MOCKUPS.tBack,
  tshirt: MOCKUPS.tFront,
  tFront: MOCKUPS.tFront,
  tBack: MOCKUPS.tBack,
  polo_front: MOCKUPS.pFront,
  polo_back: MOCKUPS.pBack,
  polo: MOCKUPS.pFront,
  pFront: MOCKUPS.pFront,
  pBack: MOCKUPS.pBack,
  hoodie_front: MOCKUPS.hFront,
  hoodie_back: MOCKUPS.hBack,
  hoodie: MOCKUPS.hFront,
  sweat_front: MOCKUPS.hFront,
  sweat_back: MOCKUPS.hBack,
  sweat: MOCKUPS.hFront
};

const profilePayload = {
  companyName: '2000 the PARTY',
  slug: '2000theparty',
  logoUrl: LOGO_ACTIVE,
  avatarUrl: LOGO_ACTIVE,
  logoA: LOGO_ACTIVE,
  logoB: LOGO_ACTIVE,
  logoAdaptedUrl: LOGO_ACTIVE,
  auditLogoUrl: LOGO_ACTIVE,
  accentColor: '#9333ea',
  theme: 'dark',
  products: productsList,
  items: productsList,
  mockups: mockupsArray,
  garmentMockups: garmentMockupsObj,
  enabledProductIds: [
    '2000theparty-tshirt', '2000theparty-polo', '2000theparty-hoodie',
    'tFront', 'pFront', 'hFront',
    'tshirt', 'polo', 'hoodie', 'sweat',
    'jhk170-classic-tshirt', 'jhk510-polo-premium', 'jhk421-hoodie'
  ],
  previewUrls: [MOCKUPS.tFront, MOCKUPS.tBack, MOCKUPS.pFront, MOCKUPS.pBack, MOCKUPS.hFront, MOCKUPS.hBack],
  updatedAt: new Date().toISOString()
};

async function syncAll() {
  for (const cfg of firebaseConfigs) {
    console.log(`\n=== Syncing Firestore to ${cfg.name} ===`);
    const app = initializeApp(cfg, 'firestore_' + cfg.name);
    const db = getFirestore(app);

    const docsToUpdate = [
      { col: 'SiteConfigs', id: '2000theparty' },
      { col: 'SiteConfigs', id: 'audit-2000theparty-eyem' },
      { col: 'anonymous_previews', id: '2000theparty' },
      { col: 'anonymous_previews', id: 'audit-2000theparty-eyem' },
      { col: 'anonymous_previews', id: '661602a1-a52d-4eb9-b588-f9a6108afd65' },
      { col: 'configs', id: '2000theparty' },
      { col: 'configs', id: 'audit-2000theparty-eyem' },
      { col: 'btp_projects', id: '2000theparty' }
    ];

    for (const d of docsToUpdate) {
      try {
        await setDoc(doc(db, d.col, d.id), profilePayload, { merge: true });
        console.log(`  ✅ [${cfg.name}] ${d.col}/${d.id} updated.`);
      } catch (err) {
        console.warn(`  ⚠️ [${cfg.name}] ${d.col}/${d.id} error:`, err.message);
      }
    }
  }
}

syncAll().then(() => {
  console.log('\n✅ All Firestore documents successfully updated!');
  process.exit(0);
}).catch(err => {
  console.error('Fatal sync error:', err);
  process.exit(1);
});
