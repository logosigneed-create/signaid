import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';

const app = initializeApp({ apiKey: 'AIzaSyCSBJf55JkrUtB844YXKlGypj2TkRDwUIY', authDomain: 'signaid-d2d08.firebaseapp.com', projectId: 'signaid-d2d08' });
const db = getFirestore(app);

async function checkAudit() {
    console.log("=== CHECKING AUDIT audit-cq9138d IN FIRESTORE ===");
    
    // 1. Check btp_projects
    const q1 = query(collection(db, 'btp_projects'), where('projectId', '==', 'audit-cq9138d'));
    const s1 = await getDocs(q1);
    if (!s1.empty) {
        console.log("Found in btp_projects:", s1.docs[0].id);
        const data = s1.docs[0].data();
        console.log("userData:", data.userData);
        console.log("logoUrl:", data.logoUrl);
        console.log("mockups/items:", JSON.stringify(data.mockups || data.items, null, 2));
    } else {
        console.log("Not found in btp_projects with projectId == audit-cq9138d");
    }

    // 2. Check anonymous_previews
    const docRef = doc(db, 'anonymous_previews', 'audit-cq9138d');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        console.log("Found in anonymous_previews:", docSnap.id);
        const data = docSnap.data();
        console.log("companyName:", data.companyName);
        console.log("items:", JSON.stringify(data.items, null, 2));
    } else {
        console.log("Not found in anonymous_previews with id == audit-cq9138d");
    }

    // 3. Search all btp_projects for any previewId or projectId matching cq9138d
    const q3 = query(collection(db, 'btp_projects'));
    const s3 = await getDocs(q3);
    s3.forEach(d => {
        const data = d.data();
        if (d.id.includes('cq9138d') || data.projectId?.includes('cq9138d') || data.previewId?.includes('cq9138d')) {
            console.log("Match in btp_projects:", d.id, data.projectId, data.userData?.companyName);
            console.log("mockups:", JSON.stringify(data.mockups, null, 2));
        }
    });
}

checkAudit().catch(console.error);
