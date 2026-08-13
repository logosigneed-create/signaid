import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyCSBJf55JkrUtB844YXKlGypj2TkRDwUIY",
    authDomain: "signaid-d2d08.firebaseapp.com",
    projectId: "signaid-d2d08"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkPolo() {
    console.log("=== CHECKING BTP_PROJECTS (projectId == audit-78wajdu) ===");
    const q = query(collection(db, 'btp_projects'), where('projectId', '==', 'audit-78wajdu'));
    const snap = await getDocs(q);
    snap.forEach(docSnap => {
        const d = docSnap.data();
        console.log("DOC ID:", docSnap.id);
        console.log("projectId:", d.projectId);
        console.log("previewId:", d.previewId);
        console.log("companyName:", d.userData?.companyName || d.companyName);
        console.log("MOCKUPS ARRAY:");
        (d.mockups || []).forEach((m, idx) => {
            console.log(`  [${idx}] id: ${m.id}, garment: ${m.garment}, view: ${m.view}, title: ${m.title}`);
        });
    });

    console.log("\n=== CHECKING ANONYMOUS_PREVIEWS (previewId == deba37d2-9281-4fe3-b965-64f2f7bf5499) ===");
    const prevRef = doc(db, 'anonymous_previews', 'deba37d2-9281-4fe3-b965-64f2f7bf5499');
    const prevSnap = await getDoc(prevRef);
    if (prevSnap.exists()) {
        const d = prevSnap.data();
        console.log("companyName:", d.companyName);
        console.log("ITEMS ARRAY:");
        (d.items || []).forEach((m, idx) => {
            console.log(`  [${idx}] id: ${m.id}, garment: ${m.garment}, title: ${m.title}`);
        });
    }
}

checkPolo().catch(console.error);
