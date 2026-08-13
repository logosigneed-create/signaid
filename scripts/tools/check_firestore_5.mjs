import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, orderBy, query, limit } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyCSBJf55JkrUtB844YXKlGypj2TkRDwUIY",
    authDomain: "signaid-d2d08.firebaseapp.com",
    projectId: "signaid-d2d08"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkDocs() {
    const q = query(collection(db, 'anonymous_previews'), orderBy('createdAt', 'desc'), limit(5));
    const snap = await getDocs(q);
    snap.forEach(doc => {
        console.log("FOUND DOC:", doc.id, doc.data().createdAt);
    });
}

checkDocs().catch(console.error);
