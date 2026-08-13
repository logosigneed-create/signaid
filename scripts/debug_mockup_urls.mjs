import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyCSBJf55JkrUtB844YXKlGypj2TkRDwUIY",
    authDomain: "signaid-d2d08.firebaseapp.com",
    projectId: "signaid-d2d08",
    storageBucket: "signaid-d2d08.firebasestorage.app",
    messagingSenderId: "214213761718",
    appId: "1:214213761718:web:2545a0dc2f796e1d9e6417"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function main() {
    console.log("🔍 Fetching btp_projects where projectId == 'audit-8f198p5'...");
    const q = query(collection(db, 'btp_projects'), where('projectId', '==', 'audit-8f198p5'));
    const snap = await getDocs(q);
    if (snap.empty) {
        console.log("❌ No document found for audit-8f198p5 in btp_projects!");
        return;
    }
    const docData = snap.docs[0].data();
    console.log("Document keys:", Object.keys(docData));
    const items = docData.mockups || docData.items || [];
    console.log(`Found ${items.length} items/mockups.`);
    items.forEach((item, index) => {
        console.log(`\n--- Item ${index + 1} ---`);
        console.log("Keys:", Object.keys(item));
        console.log("garment:", item.garment);
        console.log("view:", item.view);
        console.log("imageStudio:", item.imageStudio);
        console.log("imageFront:", item.imageFront);
        console.log("imageBack:", item.imageBack);
        console.log("ai:", item.ai);
        console.log("url:", item.url);
        console.log("image:", item.image);
    });
}

main().catch(console.error);
