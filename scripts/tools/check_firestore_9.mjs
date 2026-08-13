import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, updateDoc } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyCSBJf55JkrUtB844YXKlGypj2TkRDwUIY",
    authDomain: "signaid-d2d08.firebaseapp.com",
    projectId: "signaid-d2d08"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function updatePreviewDoc() {
    const previewRef = doc(db, 'anonymous_previews', '121df054-c45b-4b2e-a647-14f469c82862');
    const snap = await getDoc(previewRef);
    if (snap.exists()) {
        const data = snap.data();
        const updatedItems = (data.items || []).map((item) => ({
            ...item,
            imageStudio: item.imageStudio || item.imageFront || "",
            imageBat: item.imageBat || item.imageBack || item.imageFront || ""
        }));
        await updateDoc(previewRef, { items: updatedItems });
        console.log("UPDATED PREVIEW DOC ITEMS FOR STUDIO & BAT!");
    } else {
        console.log("PREVIEW DOC NOT FOUND");
    }
}

updatePreviewDoc().catch(console.error);
