import { initializeApp } from 'firebase/app';
import { getFirestore, doc, updateDoc } from 'firebase/firestore';
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
        console.error('❌ Usage: node link_dj_mockups.mjs <email> <password>');
        process.exit(1);
    }

    console.log(`🔐 Authenticating as ${email}...`);
    await signInWithEmailAndPassword(auth, email, password);
    
    console.log(`🔗 Linking audit-8f198p5 mockups to SiteConfigs/${TARGET_UID}...`);
    const siteConfigRef = doc(db, 'SiteConfigs', TARGET_UID);
    await updateDoc(siteConfigRef, {
        actuationKey: 'audit-8f198p5',
        generatedKey: 'audit-8f198p5',
        merchUrl: 'https://signaid.eu/portail-shop?audit=audit-8f198p5'
    });
    console.log(`✅ Successfully updated SiteConfigs/${TARGET_UID} actuationKey to audit-8f198p5!`);
    process.exit(0);
}

main().catch(err => {
    console.error("❌ Error linking mockups:", err);
    process.exit(1);
});
