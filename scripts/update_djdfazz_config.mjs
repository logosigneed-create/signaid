import { initializeApp } from 'firebase/app';
import { getFirestore, doc, updateDoc, getDoc } from 'firebase/firestore';

const configs = [
    {
        name: "signaid-prod",
        apiKey: process.env.VITE_FIREBASE_API_KEY || "AIzaSyDTSKpVei8lCANIQJBZmuKcsjEDIubnvcs",
        authDomain: "signaid-prod.firebaseapp.com",
        projectId: "signaid-prod",
        storageBucket: "signaid-prod.firebasestorage.app",
        messagingSenderId: "244540314192",
        appId: "1:244540314192:web:814f987d2a6ece8ac67755"
    },
    {
        name: "signaid-d2d08",
        apiKey: "AIzaSyCSBJf55JkrUtB844YXKlGypj2TkRDwUIY",
        authDomain: "signaid-d2d08.firebaseapp.com",
        projectId: "signaid-d2d08"
    }
];

const descriptionText = "DJ résident sur KIF.be (radio), où il anime sa propre émission tous les mercredis de 19h à 20h. Retrouvez chaque semaine une sélection des meilleurs sons, des exclusivités et des mixes 100 % DJ D-FAZZ";

async function main() {
    const uid = 'guest_ms3ijgnco2xnid';
    
    for (const cfg of configs) {
        try {
            console.log(`Checking ${cfg.name}...`);
            const app = initializeApp(cfg, cfg.name);
            const db = getFirestore(app);
            const docRef = doc(db, 'SiteConfigs', uid);
            const snap = await getDoc(docRef);
            
            if (snap.exists()) {
                await updateDoc(docRef, {
                    presentation: descriptionText,
                    photoDescription: descriptionText,
                    isPremium: true,
                    updatedAt: new Date().toISOString()
                });
                console.log(`✅ Updated Firestore SiteConfigs in ${cfg.name}!`);
            } else {
                console.log(`ℹ️ Document ${uid} not found in ${cfg.name}`);
            }
        } catch (e) {
            console.error(`❌ Error on ${cfg.name}:`, e.message);
        }
    }
    process.exit(0);
}

main().catch(err => {
    console.error("❌ Fatal Error:", err);
    process.exit(1);
});
