import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyCSBJf55JkrUtB844YXKlGypj2TkRDwUIY",
    authDomain: "signaid-d2d08.firebaseapp.com",
    projectId: "signaid-d2d08"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function inspectItems() {
    const docRef = doc(db, 'anonymous_previews', 'deba37d2-9281-4fe3-b965-64f2f7bf5499');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
        const items = snap.data().items || [];
        console.log("ITEMS COUNT:", items.length);
        items.forEach((item, idx) => {
            console.log(`ITEM ${idx}:`, {
                id: item.id,
                title: item.title,
                garment: item.garment,
                view: item.view,
                hasImageFront: !!item.imageFront,
                hasImageBack: !!item.imageBack,
                hasImageStudio: !!item.imageStudio,
                hasImageBat: !!item.imageBat,
                imageFrontStart: (item.imageFront || '').substring(0, 50),
                imageBackStart: (item.imageBack || '').substring(0, 50),
                imageStudioStart: (item.imageStudio || '').substring(0, 50),
                imageBatStart: (item.imageBat || '').substring(0, 50)
            });
        });
    }
}

inspectItems().catch(console.error);
