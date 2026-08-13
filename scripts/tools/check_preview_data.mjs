import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyCSBJf55JkrUtB844YXKlGypj2TkRDwUIY",
    authDomain: "signaid-d2d08.firebaseapp.com",
    projectId: "signaid-d2d08"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkData() {
    const previewId = 'deba37d2-9281-4fe3-b965-64f2f7bf5499';
    console.log("=== CHECKING ANONYMOUS PREVIEWS ===");
    const prevRef = doc(db, 'anonymous_previews', previewId);
    const prevSnap = await getDoc(prevRef);
    if (prevSnap.exists()) {
        const d = prevSnap.data();
        console.log("companyName:", d.companyName);
        console.log("logoUrl:", d.logoUrl);
        console.log("items count:", d.items?.length);
    } else {
        console.log("NOT FOUND in anonymous_previews");
    }

    console.log("\n=== CHECKING BTP_PROJECTS (previewId ==) ===");
    const q1 = query(collection(db, 'btp_projects'), where('previewId', '==', previewId));
    const snap1 = await getDocs(q1);
    snap1.forEach(doc => {
        const d = doc.data();
        console.log("DOC ID:", doc.id);
        console.log("companyName:", d.userData?.companyName || d.companyName);
        console.log("logoUrl:", d.logoUrl);
        console.log("mockups count:", d.mockups?.length);
    });

    console.log("\n=== CHECKING BTP_PROJECTS (audit-5grp9wu) ===");
    const q2 = query(collection(db, 'btp_projects'), where('projectId', '==', 'audit-5grp9wu'));
    const snap2 = await getDocs(q2);
    snap2.forEach(doc => {
        const d = doc.data();
        console.log("DOC ID:", doc.id);
        console.log("companyName:", d.userData?.companyName || d.companyName);
        console.log("logoUrl:", d.logoUrl);
        console.log("mockups count:", d.mockups?.length);
    });
}

checkData().catch(console.error);
