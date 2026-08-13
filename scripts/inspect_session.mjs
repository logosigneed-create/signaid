import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';

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
    const sid = 'audit-8f198p5';
    let q = query(collection(db, 'btp_projects'), where('projectId', '==', sid));
    let snapshot = await getDocs(q);
    if (snapshot.empty) {
        q = query(collection(db, 'btp_projects'), where('previewId', '==', sid));
        snapshot = await getDocs(q);
    }

    const data = snapshot.docs[0].data();
    console.log('userData:', data.userData);
    process.exit(0);
}

main().catch(console.error);
