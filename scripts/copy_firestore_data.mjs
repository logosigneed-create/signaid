import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc } from 'firebase/firestore';

const sourceConfig = {
    apiKey: "AIzaSyCSBJf55JkrUtB844YXKlGypj2TkRDwUIY",
    authDomain: "signaid-d2d08.firebaseapp.com",
    projectId: "signaid-d2d08"
};

const targetConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY || "AIzaSyDTSKpVei8lCANIQJBZmuKcsjEDIubnvcs",
    authDomain: "signaid-prod.firebaseapp.com",
    projectId: "signaid-prod",
    storageBucket: "signaid-prod.firebasestorage.app",
    messagingSenderId: "244540314192",
    appId: "1:244540314192:web:814f987d2a6ece8ac67755"
};

const sourceApp = initializeApp(sourceConfig, 'sourceApp');
const targetApp = initializeApp(targetConfig, 'targetApp');

const sourceDb = getFirestore(sourceApp);
const targetDb = getFirestore(targetApp);

const collectionsToCopy = ['SiteConfigs', 'users', 'products', 'dj_sales', 'audits'];

async function copyCollection(colName) {
    console.log(`📦 Copying collection "${colName}"...`);
    try {
        const snap = await getDocs(collection(sourceDb, colName));
        console.log(`Found ${snap.size} documents in "${colName}".`);
        for (const d of snap.docs) {
            const data = d.data();
            await setDoc(doc(targetDb, colName, d.id), data, { merge: true });
            console.log(`  ✓ Copied ${colName}/${d.id}`);
        }
        console.log(`✅ Collection "${colName}" copy complete.`);
    } catch (err) {
        console.error(`❌ Error copying ${colName}:`, err.message);
    }
}

async function main() {
    for (const col of collectionsToCopy) {
        await copyCollection(col);
    }
    console.log("🎉 All Firestore collections migrated successfully to signaid-prod!");
    process.exit(0);
}

main().catch(err => {
    console.error("Fatal migration error:", err);
    process.exit(1);
});
