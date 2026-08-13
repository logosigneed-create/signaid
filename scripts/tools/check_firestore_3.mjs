import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyCSBJf55JkrUtB844YXKlGypj2TkRDwUIY",
    authDomain: "signaid-d2d08.firebaseapp.com",
    projectId: "signaid-d2d08"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkDoc() {
    const q = query(collection(db, 'btp_projects'), where('projectId', '==', 'audit-5grp9wu'));
    const snap = await getDocs(q);
    if (!snap.empty) {
        console.log("BTP PROJECT FOUND BY QUERY! previewId is:", snap.docs[0].data().previewId);
    } else {
        console.log("BTP PROJECT NOT FOUND BY QUERY.");
    }
}

checkDoc().catch(console.error);
