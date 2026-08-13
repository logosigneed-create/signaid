import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

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

async function checkDoc() {
    const docRef = doc(db, 'anonymous_previews', 'audit-5grp9wu');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
        console.log("DOCUMENT 'audit-5grp9wu' FOUND!");
    } else {
        console.log("DOCUMENT 'audit-5grp9wu' NOT FOUND.");
    }

    const btpRef = doc(db, 'btp_projects', 'audit-5grp9wu');
    const btpSnap = await getDoc(btpRef);
    if (btpSnap.exists()) {
         console.log("BTP PROJECT FOUND BY DOC ID!");
    } else {
         console.log("BTP PROJECT NOT FOUND BY DOC ID.");
    }
}

checkDoc().catch(console.error);
