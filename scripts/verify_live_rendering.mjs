import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

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

const TARGET_UID = 'guest_ms3ijgnco2xnid';

async function main() {
    console.log(`\n🧪 Verifying Live Data Resolution for ${TARGET_UID}...`);

    // 1. Fetch SiteConfig
    const siteSnap = await getDoc(doc(db, 'SiteConfigs', TARGET_UID));
    if (!siteSnap.exists()) {
        console.log("❌ SiteConfig not found!");
        return;
    }
    const config = siteSnap.data();
    console.log("Theme:", config.theme);
    console.log("ActuationKey:", config.actuationKey);
    console.log("MerchUrl:", config.merchUrl);

    // 2. Fetch mockups using page.tsx logic
    const keysToTry = Array.from(new Set([
        config.actuationKey,
        config.generatedKey,
        config.uid,
        'audit-8f198p5'
    ])).filter(Boolean);

    let mockups = [];
    for (const k of keysToTry) {
        let q = query(collection(db, 'btp_projects'), where('projectId', '==', k));
        let snap = await getDocs(q);
        if (!snap.empty) {
            mockups = snap.docs[0].data().mockups || snap.docs[0].data().items || [];
            if (mockups.length > 0) break;
        }
    }

    console.log(`\n✅ Loaded ${mockups.length} mockups from Firestore.`);

    // 3. Run MerchProductsCarousel filtering logic
    const garmentMap = {};
    mockups.forEach(m => {
        const g = m.garment || 'item';
        const img = m.ai || m.imageStudio || m.imageFront || m.base || m.url;
        if (!img) return;
        if (!garmentMap[g] || m.view === 'front') {
            garmentMap[g] = { ...m, displayUrl: img };
        }
    });

    const studioItems = Object.values(garmentMap);
    console.log(`\n🎉 MerchProductsCarousel studioItems count: ${studioItems.length}`);
    studioItems.forEach((item, i) => {
        console.log(`  Product ${i + 1} (${item.garment}): ${item.displayUrl}`);
    });
}

main().catch(console.error);
