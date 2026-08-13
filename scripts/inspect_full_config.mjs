import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

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

async function inspectDoc(coll, id) {
    console.log(`\n--- Inspecting ${coll}/${id} ---`);
    const snap = await getDoc(doc(db, coll, id));
    if (snap.exists()) {
        const d = snap.data();
        console.log(`Document exists!`);
        console.log(`logoUrl:`, d.logoUrl);
        console.log(`logoAdaptedUrl:`, d.logoAdaptedUrl);
        console.log(`products:`, JSON.stringify(d.products, null, 2));
        console.log(`mockups count:`, d.mockups?.length || 0);
        if (d.mockups) {
            console.log(`mockups summary:`, d.mockups.map(m => ({ id: m.id, garment: m.garment, ai: m.ai, mechanical: m.mechanical })));
        }
    } else {
        console.log(`Document ${coll}/${id} DOES NOT EXIST!`);
    }
}

async function main() {
    await inspectDoc('SiteConfigs', 'guest_ms3ijgnco2xnid');
    await inspectDoc('SiteConfigs', 'fabrizio');
    await inspectDoc('SiteConfigs', 'djdfazz');
    await inspectDoc('btp_projects', 'audit-8f198p5');

    const q = query(collection(db, 'btp_projects'), where('projectId', '==', 'audit-8f198p5'));
    const qSnap = await getDocs(q);
    if (!qSnap.empty) {
        console.log(`\nFound btp_projects via query projectId=='audit-8f198p5':`, qSnap.docs[0].id);
        const d = qSnap.docs[0].data();
        console.log(`mockups summary:`, d.mockups?.map(m => ({ id: m.id, garment: m.garment, ai: m.ai, mechanical: m.mechanical })));
    } else {
        console.log(`\nQuery btp_projects projectId=='audit-8f198p5' returned EMPTY!`);
    }

    process.exit(0);
}

main().catch(console.error);
