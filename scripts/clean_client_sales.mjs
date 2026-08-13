import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

const firebaseConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY || "AIzaSyCSBJf55JkrUtB844YXKlGypj2TkRDwUIY",
    authDomain: "signaid-d2d08.firebaseapp.com",
    projectId: "signaid-d2d08",
    storageBucket: "signaid-d2d08.firebasestorage.app",
    messagingSenderId: "214213761718",
    appId: "1:214213761718:web:2545a0dc2f796e1d9e6417"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const TARGET_UID = 'guest_ms3ijgnco2xnid';

async function main() {
    const email = process.argv[2] || process.env.ADMIN_EMAIL;
    const password = process.argv[3] || process.env.ADMIN_PASS;

    if (!email || !password) {
        console.error('❌ Usage: node clean_client_sales.mjs <email> <password>');
        process.exit(1);
    }

    console.log(`\n🔐 Authenticating as ${email}...`);
    await signInWithEmailAndPassword(auth, email, password);
    console.log(`✅ Authenticated!`);

    console.log(`\n🧹 Cleaning test sales for profile: ${TARGET_UID}...`);

    // 1. Delete all dj_sales documents for this UID
    const salesQ = query(collection(db, 'dj_sales'), where('userId', '==', TARGET_UID));
    const salesSnap = await getDocs(salesQ);

    let count = 0;
    for (const d of salesSnap.docs) {
        await deleteDoc(d.ref);
        count++;
    }
    console.log(`✅ Deleted ${count} test sales documents.`);

    // 2. Reset totalMarginAvailable to 0 on SiteConfigs
    const siteConfigRef = doc(db, 'SiteConfigs', TARGET_UID);
    await updateDoc(siteConfigRef, {
        totalMarginAvailable: 0
    });
    console.log(`✅ Reset totalMarginAvailable to 0 € on SiteConfigs/${TARGET_UID}.`);
    process.exit(0);
}

main().catch(err => {
    console.error("❌ Error cleaning sales:", err);
    process.exit(1);
});
