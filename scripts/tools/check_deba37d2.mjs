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
    const docRef = doc(db, 'anonymous_previews', 'deba37d2-9281-4fe3-b965-64f2f7bf5499');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
        console.log("PREVIEW DATA FOR deba37d2:", JSON.stringify(snap.data(), null, 2));
    } else {
        console.log("DOCUMENT deba37d2 NOT FOUND");
    }
}

inspectDoc().catch(console.error);
