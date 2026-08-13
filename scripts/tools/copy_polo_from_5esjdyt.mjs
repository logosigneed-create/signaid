import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyCSBJf55JkrUtB844YXKlGypj2TkRDwUIY",
    authDomain: "signaid-d2d08.firebaseapp.com",
    projectId: "signaid-d2d08"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function copyPoloFrom5esjdyt() {
    console.log("=== COPYING POLO IMAGES FROM AUDIT-5ESJDYT ===");
    
    // 1. Get audit-5esjdyt Polo items
    const q5 = query(collection(db, 'btp_projects'), where('projectId', '==', 'audit-5esjdyt'));
    const snap5 = await getDocs(q5);
    if (snap5.empty) {
        console.error("audit-5esjdyt not found!");
        return;
    }
    const data5 = snap5.docs[0].data();
    const mockups5 = data5.mockups || [];
    const pFront5 = mockups5.find(m => m.id === 'pFront' || (m.garment === 'polo' && m.view === 'front'));
    const pBack5 = mockups5.find(m => m.id === 'pBack' || (m.garment === 'polo' && m.view === 'back'));

    console.log("Found pFront5 AI:", pFront5?.ai);
    console.log("Found pFront5 MECH:", pFront5?.mechanical);
    console.log("Found pBack5 AI:", pBack5?.ai);
    console.log("Found pBack5 MECH:", pBack5?.mechanical);

    if (!pFront5 || !pBack5) {
        console.error("Polo items not found in audit-5esjdyt!");
        return;
    }

    // 2. Update audit-78wajdu in btp_projects
    const q78 = query(collection(db, 'btp_projects'), where('projectId', '==', 'audit-78wajdu'));
    const snap78 = await getDocs(q78);
    for (const docSnap of snap78.docs) {
        const d = docSnap.data();
        const mockups = d.mockups || [];
        mockups.forEach(m => {
            if (m.id === 'pFront' || (m.garment === 'polo' && m.view === 'front')) {
                m.ai = pFront5.ai || m.ai;
                m.mechanical = pFront5.mechanical || m.mechanical;
                m.base = pFront5.base || '/assets/polo-black-JHK510.png';
            }
            if (m.id === 'pBack' || (m.garment === 'polo' && m.view === 'back')) {
                m.ai = pBack5.ai || m.ai;
                m.mechanical = pBack5.mechanical || m.mechanical;
                m.base = pBack5.base || '/assets/polo-black-JHK510-dos.png';
            }
        });
        await updateDoc(docSnap.ref, { mockups });
        console.log("SUCCESS: Updated audit-78wajdu in btp_projects with polo AI & Mech from audit-5esjdyt");
    }

    // 3. Update deba37d2-9281-4fe3-b965-64f2f7bf5499 in anonymous_previews
    const prevRef = doc(db, 'anonymous_previews', 'deba37d2-9281-4fe3-b965-64f2f7bf5499');
    const prevSnap = await getDoc(prevRef);
    if (prevSnap.exists()) {
        const d = prevSnap.data();
        const items = d.items || [];
        items.forEach(i => {
            if (i.id === 'pFront' || (i.garment === 'polo' && i.view === 'front')) {
                i.imageFront = pFront5.ai || pFront5.mechanical || '/assets/polo-black-JHK510.png';
                i.imageStudio = pFront5.ai || pFront5.mechanical || '/assets/polo-black-JHK510.png';
                i.imageBat = pFront5.mechanical || pFront5.ai || '/assets/polo-black-JHK510.png';
                i.ai = pFront5.ai;
                i.mechanical = pFront5.mechanical;
            }
            if (i.id === 'pBack' || (i.garment === 'polo' && i.view === 'back')) {
                i.imageBack = pBack5.ai || pBack5.mechanical || '/assets/polo-black-JHK510-dos.png';
                i.imageStudio = pBack5.ai || pBack5.mechanical || '/assets/polo-black-JHK510-dos.png';
                i.imageBat = pBack5.mechanical || pBack5.ai || '/assets/polo-black-JHK510-dos.png';
                i.ai = pBack5.ai;
                i.mechanical = pBack5.mechanical;
            }
        });
        await updateDoc(prevRef, { items });
        console.log("SUCCESS: Updated deba37d2-9281-4fe3-b965-64f2f7bf5499 in anonymous_previews with polo AI & Mech");
    }
}

copyPoloFrom5esjdyt().catch(console.error);
