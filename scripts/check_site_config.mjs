import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

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
    const siteConfigRef = doc(db, 'SiteConfigs', 'guest_ms3ijgnco2xnid');
    const siteConfigSnap = await getDoc(siteConfigRef);
    if (siteConfigSnap.exists()) {
        console.log('SiteConfig data:', siteConfigSnap.data());
    } else {
        console.log('No SiteConfig found for guest_ms3ijgnco2xnid');
    }
    process.exit(0);
}

main().catch(console.error);
