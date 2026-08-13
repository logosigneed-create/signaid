import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyCSBJf55JkrUtB844YXKlGypj2TkRDwUIY",
    authDomain: "signaid-d2d08.firebaseapp.com",
    projectId: "signaid-d2d08"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function resetPoloFirestore() {
    console.log("=== RESETTING POLO MOCKUPS IN FIRESTORE TO TRIGGER FRESH AUTO-GENERATION ===");

    // 1. UPDATE BTP_PROJECTS for audit-78wajdu
    const q = query(collection(db, 'btp_projects'), where('projectId', '==', 'audit-78wajdu'));
    const snap = await getDocs(q);
    for (const docSnap of snap.docs) {
        const d = docSnap.data();
        const mockups = d.mockups || [];
        mockups.forEach(m => {
            if (m.id === 'pFront' || (m.garment === 'polo' && m.view === 'front')) {
                m.ai = null;
                m.mechanical = null;
                m.base = '/assets/polo-black-JHK510.png';
            }
            if (m.id === 'pBack' || (m.garment === 'polo' && m.view === 'back')) {
                m.ai = null;
                m.mechanical = null;
                m.base = '/assets/polo-black-JHK510-dos.png';
            }
        });
        await updateDoc(docSnap.ref, { mockups });
        console.log("SUCCESS: Reset Polo mockups in btp_projects for audit-78wajdu");
    }

    // 2. UPDATE ANONYMOUS_PREVIEWS for deba37d2-9281-4fe3-b965-64f2f7bf5499
    const prevRef = doc(db, 'anonymous_previews', 'deba37d2-9281-4fe3-b965-64f2f7bf5499');
    const prevSnap = await getDoc(prevRef);
    if (prevSnap.exists()) {
        const d = prevSnap.data();
        const items = d.items || [];
        items.forEach(i => {
            if (i.id === 'pFront' || (i.garment === 'polo' && i.view === 'front')) {
                i.imageFront = '/assets/polo-black-JHK510.png';
                i.imageStudio = '/assets/polo-black-JHK510.png';
                i.imageBat = null;
                i.mechanical = null;
                i.ai = null;
            }
            if (i.id === 'pBack' || (i.garment === 'polo' && i.view === 'back')) {
                i.imageBack = '/assets/polo-black-JHK510-dos.png';
                i.imageStudio = '/assets/polo-black-JHK510-dos.png';
                i.imageBat = null;
                i.mechanical = null;
                i.ai = null;
            }
        });
        await updateDoc(prevRef, { items });
        console.log("SUCCESS: Reset Polo items in anonymous_previews for deba37d2-9281-4fe3-b965-64f2f7bf5499");
    }
}

resetPoloFirestore().catch(console.error);
