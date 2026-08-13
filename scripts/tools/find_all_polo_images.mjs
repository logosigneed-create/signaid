import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyCSBJf55JkrUtB844YXKlGypj2TkRDwUIY",
    authDomain: "signaid-d2d08.firebaseapp.com",
    projectId: "signaid-d2d08"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function findAllPoloImages() {
    console.log("=== SEARCHING FOR ALL POLO IMAGES IN FIRESTORE ===");
    
    // 1. Check all btp_projects
    const projectsSnap = await getDocs(collection(db, 'btp_projects'));
    console.log(`Found ${projectsSnap.size} projects in btp_projects`);
    projectsSnap.forEach(dSnap => {
        const data = dSnap.data();
        const mockups = data.mockups || [];
        mockups.forEach(m => {
            if (m.garment === 'polo' || m.id?.includes('polo') || m.id === 'pFront' || m.id === 'pBack' || m.title?.toLowerCase().includes('polo')) {
                console.log(`[btp_projects ${dSnap.id}] id:${m.id} garment:${m.garment} view:${m.view}`);
                console.log(`  ai: ${m.ai?.substring(0, 100)}`);
                console.log(`  mechanical: ${m.mechanical?.substring(0, 100)}`);
                console.log(`  base: ${m.base?.substring(0, 100)}`);
            }
        });
    });

    // 2. Check all anonymous_previews
    const previewsSnap = await getDocs(collection(db, 'anonymous_previews'));
    console.log(`\nFound ${previewsSnap.size} previews in anonymous_previews`);
    previewsSnap.forEach(dSnap => {
        const data = dSnap.data();
        const items = data.items || [];
        items.forEach(i => {
            if (i.garment === 'polo' || i.id?.includes('polo') || i.id === 'pFront' || i.id === 'pBack' || i.title?.toLowerCase().includes('polo')) {
                console.log(`[anonymous_previews ${dSnap.id}] id:${i.id} garment:${i.garment} view:${i.view}`);
                console.log(`  imageFront: ${i.imageFront?.substring(0, 100)}`);
                console.log(`  imageBack: ${i.imageBack?.substring(0, 100)}`);
                console.log(`  imageStudio: ${i.imageStudio?.substring(0, 100)}`);
                console.log(`  imageBat: ${i.imageBat?.substring(0, 100)}`);
            }
        });
    });

    // 3. Check portail-config collections
    try {
        const configSnap = await getDocs(collection(db, 'portail-config'));
        configSnap.forEach(dSnap => {
            console.log(`[portail-config ${dSnap.id}]`, dSnap.data());
        });
    } catch(e) {}
}

findAllPoloImages().catch(console.error);
