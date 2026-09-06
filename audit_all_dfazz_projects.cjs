const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, getDoc } = require('firebase/firestore');

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

async function main() {
  console.log("=================================================");
  console.log("AUDIT ET COMPARATIF DES PROJETS DJ D-FAZZ DANS FIRESTORE");
  console.log("=================================================\n");

  const results = {};

  for (const cfg of firebaseConfigs) {
    const app = initializeApp(cfg, `${cfg.name}_audit_compare`);
    const db = getFirestore(app);
    results[cfg.name] = {};

    const collections = ['SiteConfigs', 'btp_projects', 'anonymous_previews', 'users', 'products'];

    for (const col of collections) {
      results[cfg.name][col] = [];
      try {
        const snap = await getDocs(collection(db, col));
        snap.forEach(d => {
          const data = d.data();
          const jsonStr = JSON.stringify(data).toLowerCase();
          if (
            d.id.includes('fabrizio') || 
            d.id.includes('guest_ms3ijgnco2xnid') || 
            d.id.includes('audit-8f198p5') || 
            jsonStr.includes('fazz') || 
            jsonStr.includes('fabrizio')
          ) {
            results[cfg.name][col].push({
              id: d.id,
              companyName: data.companyName || data.userData?.companyName || data.name,
              slug: data.slug,
              uid: data.uid,
              actuationKey: data.actuationKey,
              generatedKey: data.generatedKey,
              previewId: data.previewId,
              projectId: data.projectId,
              logoUrl: data.logoUrl || data.auditLogoUrl,
              updatedAt: data.updatedAt,
              createdAt: data.createdAt,
              mockupsCount: (data.items?.length || 0) || (data.mockups?.length || 0) || (data.products ? Object.keys(data.products).length : 0),
              customLinksCount: data.customLinks?.length || 0,
              hasPresentation: !!(data.presentation || data.photoDescription),
              fullData: data
            });
          }
        });
      } catch (e) {
        console.log(`Error auditing ${col} in ${cfg.name}:`, e.message);
      }
    }
  }

  console.log(JSON.stringify(results, null, 2));
  process.exit(0);
}

main().catch(console.error);
