const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyDTSKpVei8lCANIQJBZmuKcsjEDIubnvcs",
  authDomain: "signaid-prod.firebaseapp.com",
  projectId: "signaid-prod",
  storageBucket: "signaid-d2d08.firebasestorage.app",
  messagingSenderId: "244540314192",
  appId: "1:244540314192:web:814f987d2a6ece8ac67755"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function main() {
  const collections = ['SiteConfigs', 'btp_projects', 'anonymous_previews', 'users', 'products'];
  
  console.log("==========================================");
  console.log("RECAPITULATIF DES DOCUMENTS FIRESTORE DJ D-FAZZ");
  console.log("==========================================\n");

  for (const col of collections) {
    console.log(`\n📁 Collection: ${col}`);
    const snap = await getDocs(collection(db, col));
    snap.forEach(d => {
      const data = d.data();
      const str = JSON.stringify(data).toLowerCase();
      if (d.id.includes('fabrizio') || d.id.includes('guest_ms3ijgnco2xnid') || d.id.includes('audit-8f198p5') || str.includes('dfazz') || str.includes('fazz') || str.includes('fabrizio')) {
        console.log(`\n  📄 Document ID: ${d.id}`);
        console.log(`     - companyName: ${data.companyName || data.userData?.companyName}`);
        console.log(`     - slug: ${data.slug}`);
        console.log(`     - uid / canonicalUid: ${data.uid || data.canonicalUid}`);
        console.log(`     - actuationKey: ${data.actuationKey}`);
        console.log(`     - generatedKey: ${data.generatedKey}`);
        console.log(`     - projectId / previewId: ${data.projectId || data.previewId}`);
        console.log(`     - logoUrl: ${data.logoUrl || data.auditLogoUrl ? 'PRESENT' : 'ABSENT'}`);
        console.log(`     - customLinks count: ${data.customLinks?.length || 0}`);
        console.log(`     - mockups/items count: ${(data.items?.length || 0) || (data.mockups?.length || 0)}`);
        console.log(`     - updatedAt: ${data.updatedAt}`);
      }
    });
  }

  process.exit(0);
}

main().catch(console.error);
