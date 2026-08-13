import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyCSBJf55JkrUtB844YXKlGypj2TkRDwUIY",
    authDomain: "signaid-d2d08.firebaseapp.com",
    projectId: "signaid-d2d08"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function fixPoloGabarit() {
    console.log("Fixing Polo Gabarit BAT in Firestore...");

    // 1. UPDATE BTP_PROJECTS (audit-78wajdu)
    const q = query(collection(db, 'btp_projects'), where('projectId', '==', 'audit-78wajdu'));
    const snap = await getDocs(q);
    for (const docSnap of snap.docs) {
        const d = docSnap.data();
        const mockups = d.mockups || [];
        const tFront = mockups.find(m => m.id === 'tFront');
        const tBack = mockups.find(m => m.id === 'tBack');
        
        let updated = false;
        mockups.forEach(m => {
            if (m.garment === 'polo' || m.id === 'pFront' || m.id === 'pBack') {
                const refItem = m.view === 'back' || m.id === 'pBack' ? tBack : tFront;
                if (refItem) {
                    m.mechanical = refItem.mechanical || refItem.ai || m.mechanical || m.base;
                    m.ai = m.ai || refItem.ai || refItem.mechanical;
                    updated = true;
                }
            }
        });
        if (updated) {
            await updateDoc(docSnap.ref, { mockups });
            console.log("Updated btp_projects Polo mechanical BAT images");
        }
    }

    // 2. UPDATE ANONYMOUS_PREVIEWS (deba37d2-9281-4fe3-b965-64f2f7bf5499)
    const prevRef = doc(db, 'anonymous_previews', 'deba37d2-9281-4fe3-b965-64f2f7bf5499');
    const prevSnap = await getDoc(prevRef);
    if (prevSnap.exists()) {
        const d = prevSnap.data();
        const items = d.items || [];
        const tFront = items.find(i => i.id === 'tFront' || i.garment === 'tshirt');
        const tBack = items.find(i => i.id === 'tBack' || (i.garment === 'tshirt' && i.view === 'back'));

        items.forEach(i => {
            if (i.garment === 'polo' || i.id === 'pFront' || i.id === 'pBack') {
                const refItem = i.view === 'back' || i.id === 'pBack' ? tBack : tFront;
                if (refItem) {
                    i.imageBack = refItem.imageBack || refItem.imageFront || refItem.mechanical || i.imageBack;
                    i.imageBat = refItem.imageBat || refItem.imageBack || refItem.imageFront || i.imageBat;
                    i.imageFront = i.imageFront || refItem.imageFront;
                    i.imageStudio = i.imageStudio || refItem.imageStudio || refItem.imageFront;
                    i.mechanical = refItem.mechanical || refItem.imageBat || refItem.imageBack || i.mechanical;
                }
            }
        });
        await updateDoc(prevRef, { items });
        console.log("Updated anonymous_previews Polo mechanical BAT images");
    }
}

fixPoloGabarit().catch(console.error);
