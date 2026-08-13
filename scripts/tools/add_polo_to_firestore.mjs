import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyCSBJf55JkrUtB844YXKlGypj2TkRDwUIY",
    authDomain: "signaid-d2d08.firebaseapp.com",
    projectId: "signaid-d2d08"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function addPolo() {
    const poloFront = {
        id: 'pFront',
        title: 'Polo Premium FACE',
        garment: 'polo',
        view: 'front',
        selected: true,
        base: '/assets/polo-black-JHK510.png',
        ai: '/assets/polo-black-JHK510.png',
        mechanical: '/assets/polo-black-JHK510.png',
        imageFront: '/assets/polo-black-JHK510.png',
        imageBack: '/assets/polo-black-JHK510.png',
        imageStudio: '/assets/polo-black-JHK510.png',
        imageBat: '/assets/polo-black-JHK510.png'
    };

    const poloBack = {
        id: 'pBack',
        title: 'Polo Premium DOS',
        garment: 'polo',
        view: 'back',
        selected: true,
        base: '/assets/polo-black-JHK510-dos.png',
        ai: '/assets/polo-black-JHK510-dos.png',
        mechanical: '/assets/polo-black-JHK510-dos.png',
        imageFront: '/assets/polo-black-JHK510-dos.png',
        imageBack: '/assets/polo-black-JHK510-dos.png',
        imageStudio: '/assets/polo-black-JHK510-dos.png',
        imageBat: '/assets/polo-black-JHK510-dos.png'
    };

    // 1. UPDATE BTP_PROJECTS (audit-78wajdu)
    console.log("Updating btp_projects for audit-78wajdu...");
    const q = query(collection(db, 'btp_projects'), where('projectId', '==', 'audit-78wajdu'));
    const snap = await getDocs(q);
    for (const docSnap of snap.docs) {
        const d = docSnap.data();
        const mockups = d.mockups || [];
        if (!mockups.some(m => m.id === 'pFront')) {
            // Copy AI/Mechanical images from tFront if available to place logo on Polo
            const tFront = mockups.find(m => m.id === 'tFront');
            const tBack = mockups.find(m => m.id === 'tBack');
            
            const updatedPoloFront = { ...poloFront, ai: tFront?.ai || poloFront.ai, mechanical: tFront?.mechanical || poloFront.mechanical };
            const updatedPoloBack = { ...poloBack, ai: tBack?.ai || poloBack.ai, mechanical: tBack?.mechanical || poloBack.mechanical };
            
            mockups.push(updatedPoloFront, updatedPoloBack);
            await updateDoc(docSnap.ref, { mockups });
            console.log("SUCCESS: Added Polo mockups to btp_projects", docSnap.id);
        } else {
            console.log("Polo already exists in btp_projects");
        }
    }

    // 2. UPDATE ANONYMOUS_PREVIEWS (deba37d2-9281-4fe3-b965-64f2f7bf5499)
    console.log("Updating anonymous_previews for deba37d2-9281-4fe3-b965-64f2f7bf5499...");
    const prevRef = doc(db, 'anonymous_previews', 'deba37d2-9281-4fe3-b965-64f2f7bf5499');
    const prevSnap = await getDoc(prevRef);
    if (prevSnap.exists()) {
        const d = prevSnap.data();
        const items = d.items || [];
        if (!items.some(i => i.id === 'pFront')) {
            const tFront = items.find(i => i.id === 'tFront');
            const tBack = items.find(i => i.id === 'tBack');

            const pFrontItem = {
                id: 'pFront',
                title: 'Polo Premium FACE',
                garment: 'polo',
                view: 'front',
                selected: true,
                imageFront: tFront?.imageFront || poloFront.imageFront,
                imageBack: tFront?.imageBack || poloFront.imageBack,
                imageStudio: tFront?.imageStudio || tFront?.imageFront || poloFront.imageStudio,
                imageBat: tFront?.imageBat || tFront?.imageBack || poloFront.imageBat
            };
            const pBackItem = {
                id: 'pBack',
                title: 'Polo Premium DOS',
                garment: 'polo',
                view: 'back',
                selected: true,
                imageFront: tBack?.imageFront || poloBack.imageFront,
                imageBack: tBack?.imageBack || poloBack.imageBack,
                imageStudio: tBack?.imageStudio || tBack?.imageFront || poloBack.imageStudio,
                imageBat: tBack?.imageBat || tBack?.imageBack || poloBack.imageBat
            };

            items.push(pFrontItem, pBackItem);
            await updateDoc(prevRef, { items });
            console.log("SUCCESS: Added Polo items to anonymous_previews");
        } else {
            console.log("Polo already exists in anonymous_previews");
        }
    }
}

addPolo().catch(console.error);
