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
    console.log(`🔍 Inspecting SiteConfigs/${TARGET_UID}...`);
    const siteSnap = await getDoc(doc(db, 'SiteConfigs', TARGET_UID));
    if (siteSnap.exists()) {
        const siteData = siteSnap.data();
        console.log("SiteConfig keys:", Object.keys(siteData));
        console.log("actuationKey:", siteData.actuationKey);
        console.log("generatedKey:", siteData.generatedKey);
        console.log("mockups count on siteConfig:", siteData.mockups?.length || 0);

        const candidateKeys = [
            siteData.actuationKey,
            siteData.generatedKey,
            TARGET_UID,
            'audit-8f198p5'
        ].filter(Boolean);

        for (const k of candidateKeys) {
            console.log(`\nChecking key '${k}'...`);
            let q1 = query(collection(db, 'btp_projects'), where('projectId', '==', k));
            let s1 = await getDocs(q1);
            if (!s1.empty) {
                console.log(`Found in btp_projects (projectId==${k}):`, s1.docs[0].data().mockups?.length || s1.docs[0].data().items?.length || 0, "mockups");
            }
            let q2 = query(collection(db, 'btp_projects'), where('previewId', '==', k));
            let s2 = await getDocs(q2);
            if (!s2.empty) {
                console.log(`Found in btp_projects (previewId==${k}):`, s2.docs[0].data().mockups?.length || s2.docs[0].data().items?.length || 0, "mockups");
            }
            let prevSnap = await getDoc(doc(db, 'anonymous_previews', k));
            if (prevSnap.exists()) {
                console.log(`Found in anonymous_previews (${k}):`, prevSnap.data().items?.length || 0, "items");
            }
        }
    } else {
        console.log("SiteConfig not found.");
    }
}

main().catch(console.error);
