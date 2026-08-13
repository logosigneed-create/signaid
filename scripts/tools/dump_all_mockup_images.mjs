import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const app = initializeApp({ apiKey: 'AIzaSyCSBJf55JkrUtB844YXKlGypj2TkRDwUIY', authDomain: 'signaid-d2d08.firebaseapp.com', projectId: 'signaid-d2d08' });
const db = getFirestore(app);

async function checkAll() {
    console.log("=== ANONYMOUS PREVIEWS ===");
    const prevSnap = await getDocs(collection(db, 'anonymous_previews'));
    prevSnap.forEach(d => {
        const data = d.data();
        console.log(`PREVIEW ID: ${d.id} | companyName: ${data.companyName} | logoUrl: ${data.logoUrl?.substring(0, 60)}`);
        (data.items || []).forEach((it: any) => {
            console.log(`   Item: ${it.id} (${it.garment}/${it.view})`);
            console.log(`      ai: ${it.ai?.substring(0, 70)}`);
            console.log(`      imageStudio: ${it.imageStudio?.substring(0, 70)}`);
            console.log(`      imageFront: ${it.imageFront?.substring(0, 70)}`);
            console.log(`      mechanical: ${it.mechanical?.substring(0, 70)}`);
            console.log(`      imageBat: ${it.imageBat?.substring(0, 70)}`);
            console.log(`      imageBack: ${it.imageBack?.substring(0, 70)}`);
        });
    });

    console.log("\n=== BTP PROJECTS ===");
    const projSnap = await getDocs(collection(db, 'btp_projects'));
    projSnap.forEach(d => {
        const data = d.data();
        console.log(`PROJECT ID: ${d.id} | projectId: ${data.projectId} | companyName: ${data.userData?.companyName}`);
        (data.mockups || []).forEach((m: any) => {
            console.log(`   Mockup: ${m.id} (${m.garment}/${m.view})`);
            console.log(`      ai: ${m.ai?.substring(0, 70)}`);
            console.log(`      mechanical: ${m.mechanical?.substring(0, 70)}`);
            console.log(`      base: ${m.base?.substring(0, 70)}`);
        });
    });
}

checkAll().catch(console.error);
