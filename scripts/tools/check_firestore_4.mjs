import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyCSBJf55JkrUtB844YXKlGypj2TkRDwUIY",
    authDomain: "signaid-d2d08.firebaseapp.com",
    projectId: "signaid-d2d08"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function testSave() {
    const previewData = {
        previewId: 'test-123',
        companyName: "Test",
        logoUrl: "",
        logoOriginalUrl: "",
        logoAdaptedUrl: "",
        accentColor: "#ea580c",
        items: [],
        status: 'pending',
        userEmail: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    try {
        await setDoc(doc(db, 'anonymous_previews', 'test-123'), previewData, { merge: true });
        console.log("SAVE SUCCESS");
    } catch (e) {
        console.log("SAVE FAILED:", e);
    }
}

testSave().catch(console.error);
