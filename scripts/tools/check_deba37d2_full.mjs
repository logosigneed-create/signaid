import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyCSBJf55JkrUtB844YXKlGypj2TkRDwUIY",
    authDomain: "signaid-d2d08.firebaseapp.com",
    projectId: "signaid-d2d08"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function inspectItemsFull() {
    const docRef = doc(db, 'anonymous_previews', 'deba37d2-9281-4fe3-b965-64f2f7bf5499');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
        const items = snap.data().items || [];
        items.forEach((item, idx) => {
            console.log(`--- ITEM ${idx} (${item.id}) ---`);
            console.log("title:", item.title);
            console.log("garment:", item.garment);
            console.log("imageFront:", item.imageFront?.substring(0, 70));
            console.log("imageBack:", item.imageBack?.substring(0, 70));
            console.log("imageStudio:", item.imageStudio?.substring(0, 70));
            console.log("imageBat:", item.imageBat?.substring(0, 70));
        });
    }
}

inspectItemsFull().catch(console.error);
