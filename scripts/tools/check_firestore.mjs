import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBJC_Rg_bfzjJdRe4fmNmlAp2FbBrl0iYI",
  authDomain: "signaid-d2d08.firebaseapp.com",
  projectId: "signaid-d2d08",
  storageBucket: "signaid-d2d08.firebasestorage.app",
  messagingSenderId: "596135804498",
  appId: "1:596135804498:web:764d22c7dbdc07b32f6e86"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const sid = 'audit-8f198p5';

async function check() {
  console.log(`\n=== Checking btp_projects for projectId='${sid}' ===`);
  
  let q = query(collection(db, 'btp_projects'), where('projectId', '==', sid));
  let snap = await getDocs(q);
  
  if (snap.empty) {
    console.log('  Not found by projectId, trying previewId...');
    q = query(collection(db, 'btp_projects'), where('previewId', '==', sid));
    snap = await getDocs(q);
  }
  
  if (!snap.empty) {
    const data = snap.docs[0].data();
    console.log(`  Found! Doc ID: ${snap.docs[0].id}`);
    console.log(`  userData.companyName: ${data.userData?.companyName}`);
    console.log(`  logoUrl: ${data.logoUrl ? data.logoUrl.substring(0, 80) + '...' : 'NULL'}`);
    console.log(`  mockups count: ${(data.mockups || []).length}`);
    
    (data.mockups || []).forEach((m, i) => {
      console.log(`\n  Mockup ${i}: id=${m.id}, garment=${m.garment}, view=${m.view}`);
      console.log(`    ai: ${m.ai ? (m.ai.substring(0, 80) + '...') : 'NULL'}`);
      console.log(`    mechanical: ${m.mechanical ? (m.mechanical.substring(0, 80) + '...') : 'NULL'}`);
      console.log(`    selected: ${m.selected}`);
    });
  } else {
    console.log('  NOT FOUND in btp_projects');
  }

  console.log(`\n=== Checking anonymous_previews for '${sid}' ===`);
  const prevRef = doc(db, 'anonymous_previews', sid);
  const prevSnap = await getDoc(prevRef);
  if (prevSnap.exists()) {
    const pData = prevSnap.data();
    console.log(`  Found! companyName: ${pData.companyName}`);
    console.log(`  logoUrl: ${pData.logoUrl ? pData.logoUrl.substring(0, 80) + '...' : 'NULL'}`);
    console.log(`  items count: ${(pData.items || []).length}`);
    (pData.items || []).forEach((m, i) => {
      console.log(`\n  Item ${i}: id=${m.id}, garment=${m.garment}`);
      console.log(`    imageFront: ${m.imageFront ? (m.imageFront.substring(0, 80) + '...') : 'NULL'}`);
      console.log(`    imageBack: ${m.imageBack ? (m.imageBack.substring(0, 80) + '...') : 'NULL'}`);
    });
  } else {
    console.log('  NOT FOUND in anonymous_previews');
  }
  
  process.exit(0);
}

check().catch(e => { console.error(e); process.exit(1); });
