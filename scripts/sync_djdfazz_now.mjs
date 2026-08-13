import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDocs, collection, query, where, serverTimestamp } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyCSBJf55JkrUtB844YXKlGypj2TkRDwUIY",
    authDomain: "signaid-d2d08.firebaseapp.com",
    projectId: "signaid-d2d08",
    storageBucket: "signaid-d2d08.firebasestorage.app",
    messagingSenderId: "214213761718",
    appId: "1:214213761718:web:2545a0dc2f796e1d9e6417"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function main() {
    console.log("Fetching mockups from btp_projects for audit-8f198p5...");
    const q = query(collection(db, 'btp_projects'), where('projectId', '==', 'audit-8f198p5'));
    const qSnap = await getDocs(q);

    if (qSnap.empty) {
        console.error("No btp_projects doc found for audit-8f198p5!");
        process.exit(1);
    }

    const btpData = qSnap.docs[0].data();
    const mockups = btpData.mockups || [];
    console.log(`Found ${mockups.length} mockups in btp_projects.`);

    const tshirt = mockups.find(m => m.id === 'tFront' || m.garment === 'tshirt');
    const polo = mockups.find(m => m.id === 'pFront' || m.garment === 'polo');
    const hoodie = mockups.find(m => m.id === 'hFront' || m.garment === 'sweat');

    const tshirtUrl = tshirt?.ai || tshirt?.mechanical || "";
    const poloUrl = polo?.ai || polo?.mechanical || "";
    const hoodieUrl = hoodie?.ai || hoodie?.mechanical || "";

    console.log("tshirtUrl:", tshirtUrl);
    console.log("poloUrl:", poloUrl);
    console.log("hoodieUrl:", hoodieUrl);

    const payload = {
        companyName: "Fabrizio (DJ & Producteur - D-FAZZ)",
        presentation: "DJ, Producteur & Artiste Électro",
        logoUrl: btpData.logoUrl || btpData.logos?.logoA?.activeUrl || "",
        logoAdaptedUrl: btpData.logoUrl || btpData.logos?.logoA?.activeUrl || "",
        products: {
            tshirt: { aiImageUrl: tshirtUrl },
            polo: { aiImageUrl: poloUrl },
            hoodie: { aiImageUrl: hoodieUrl }
        },
        mockups: mockups,
        items: mockups,
        updatedAt: new Date().toISOString(),
        lastUpdated: serverTimestamp()
    };

    const keysToSync = ['guest_ms3ijgnco2xnid', 'fabrizio', 'djdfazz', 'audit-8f198p5'];

    for (const key of keysToSync) {
        console.log(`Writing SiteConfigs/${key}...`);
        await setDoc(doc(db, 'SiteConfigs', key), payload, { merge: true });
    }

    console.log("Successfully synced all SiteConfigs for djdfazz & fabrizio!");
    process.exit(0);
}

main().catch(console.error);
