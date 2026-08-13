import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyCSBJf55JkrUtB844YXKlGypj2TkRDwUIY",
    authDomain: "signaid-d2d08.firebaseapp.com",
    projectId: "signaid-d2d08"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function inspectProject() {
    const q = query(collection(db, 'btp_projects'), where('projectId', '==', 'audit-5grp9wu'));
    const snap = await getDocs(q);
    if (!snap.empty) {
        const data = snap.docs[0].data();
        console.log("PROJECT MOCKUPS:", JSON.stringify(data.mockups, null, 2));
    } else {
        console.log("NOT FOUND");
    }
}

inspectProject().catch(console.error);
