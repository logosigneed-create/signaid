import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyCSBJf55JkrUtB844YXKlGypj2TkRDwUIY",
    authDomain: "signaid-d2d08.firebaseapp.com",
    projectId: "signaid-d2d08"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function dumpPoloUrls() {
    const snap = await getDocs(collection(db, 'btp_projects'));
    snap.forEach(d => {
        const data = d.data();
        const mockups = data.mockups || [];
        mockups.forEach(m => {
            if ((m.garment === 'polo' || m.id?.includes('p') || m.id?.includes('polo')) && (m.ai || m.mechanical)) {
                console.log(`Doc: ${d.id} | ProjectId: ${data.projectId} | ItemId: ${m.id} | Garment: ${m.garment}`);
                if (m.ai) console.log(`  AI: ${m.ai}`);
                if (m.mechanical) console.log(`  MECH: ${m.mechanical}`);
            }
        });
    });

    const prevSnap = await getDocs(collection(db, 'anonymous_previews'));
    prevSnap.forEach(d => {
        const data = d.data();
        const items = data.items || [];
        items.forEach(i => {
            if ((i.garment === 'polo' || i.id?.includes('p') || i.id?.includes('polo')) && (i.imageFront || i.imageStudio || i.imageBat || i.mechanical || i.ai)) {
                console.log(`PreviewDoc: ${d.id} | ItemId: ${i.id} | Garment: ${i.garment}`);
                if (i.imageFront) console.log(`  imageFront: ${i.imageFront}`);
                if (i.imageStudio) console.log(`  imageStudio: ${i.imageStudio}`);
                if (i.imageBat) console.log(`  imageBat: ${i.imageBat}`);
                if (i.mechanical) console.log(`  mechanical: ${i.mechanical}`);
                if (i.ai) console.log(`  ai: ${i.ai}`);
            }
        });
    });
}

dumpPoloUrls().catch(console.error);
