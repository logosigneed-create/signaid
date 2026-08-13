import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, limit, query } from 'firebase/firestore';

const app = initializeApp({ apiKey: 'AIzaSyCSBJf55JkrUtB844YXKlGypj2TkRDwUIY', authDomain: 'signaid-d2d08.firebaseapp.com', projectId: 'signaid-d2d08' });
const db = getFirestore(app);

async function check() {
    const snap = await getDocs(query(collection(db, 'anonymous_previews'), limit(3)));
    snap.forEach(d => {
        const data = d.data();
        console.log("=== DOC:", d.id);
        console.log("companyName:", data.companyName);
        console.log("items:", data.items);
    });
}
check().catch(console.error);
