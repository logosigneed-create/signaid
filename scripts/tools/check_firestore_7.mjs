import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyCSBJf55JkrUtB844YXKlGypj2TkRDwUIY",
    authDomain: "signaid-d2d08.firebaseapp.com",
    projectId: "signaid-d2d08"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function inspectDoc() {
    const docRef = doc(db, 'anonymous_previews', '121df054-c45b-4b2e-a647-14f469c82862');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
        console.log("PREVIEW DATA:", JSON.stringify(snap.data(), null, 2));
    } else {
        console.log("NOT FOUND");
    }
}

inspectDoc().catch(console.error);
