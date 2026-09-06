const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc, collection, getDocs, query, where } = require('firebase/firestore');

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
  console.log("==========================================");
  console.log("SEARCHING FIRESTORE FOR ORIGINAL AUDIT-8F198P5 DATA");
  console.log("==========================================");

  // 1. Check btp_projects for audit-8f198p5
  console.log("\n1. Querying btp_projects where previewId == 'audit-8f198p5' or projectId == 'audit-8f198p5'...");
  let q1 = query(collection(db, 'btp_projects'), where('previewId', '==', 'audit-8f198p5'));
  let snap1 = await getDocs(q1);
  console.log(`   Found ${snap1.size} docs by previewId:`);
  snap1.forEach(d => console.log(`   Doc ID [${d.id}]:`, JSON.stringify(d.data(), null, 2)));

  let q2 = query(collection(db, 'btp_projects'), where('projectId', '==', 'audit-8f198p5'));
  let snap2 = await getDocs(q2);
  console.log(`   Found ${snap2.size} docs by projectId:`);
  snap2.forEach(d => console.log(`   Doc ID [${d.id}]:`, JSON.stringify(d.data(), null, 2)));

  // 2. Read all btp_projects docs
  console.log("\n2. Reading ALL btp_projects docs...");
  let allBtp = await getDocs(collection(db, 'btp_projects'));
  allBtp.forEach(d => {
    const data = d.data();
    console.log(`   btp_project [${d.id}]: logoUrl=${data.logoUrl}, auditLogoUrl=${data.auditLogoUrl}, logos=${JSON.stringify(data.logos)}`);
  });

  // 3. Read SiteConfigs/fabrizio and SiteConfigs/guest_ms3ijgnco2xnid
  console.log("\n3. Reading SiteConfigs/fabrizio...");
  const fabSnap = await getDoc(doc(db, 'SiteConfigs', 'fabrizio'));
  if (fabSnap.exists()) {
    console.log("   SiteConfigs/fabrizio:", JSON.stringify(fabSnap.data(), null, 2));
  } else {
    console.log("   SiteConfigs/fabrizio does NOT exist yet.");
  }

  console.log("\n4. Reading SiteConfigs/guest_ms3ijgnco2xnid...");
  const guestSnap = await getDoc(doc(db, 'SiteConfigs', 'guest_ms3ijgnco2xnid'));
  if (guestSnap.exists()) {
    console.log("   SiteConfigs/guest_ms3ijgnco2xnid logoUrl:", guestSnap.data().logoUrl);
  }

  process.exit(0);
}

main().catch(console.error);
