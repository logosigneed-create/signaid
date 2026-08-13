import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, doc, setDoc } from 'firebase/firestore';

const app = initializeApp({ apiKey: 'AIzaSyCSBJf55JkrUtB844YXKlGypj2TkRDwUIY', authDomain: 'signaid-d2d08.firebaseapp.com', projectId: 'signaid-d2d08' });
const db = getFirestore(app);

async function syncAuditCq9138d() {
    console.log("Syncing audit-cq9138d to anonymous_previews...");
    const q = query(collection(db, 'btp_projects'), where('projectId', '==', 'audit-cq9138d'));
    const snap = await getDocs(q);
    if (!snap.empty) {
        const data = snap.docs[0].data();
        const previewData = {
            previewId: 'audit-cq9138d',
            companyName: data.userData?.companyName || "D-FAZZ",
            logoUrl: data.logoUrl || "",
            logoAdaptedUrl: data.logoUrl || "",
            accentColor: "#ea580c",
            items: (data.mockups || []).map(m => ({
                id: m.id,
                title: m.title,
                price: m.id.includes('basic') ? 25 : 39,
                imageFront: m.ai || m.base || "",
                imageBack: m.mechanical || "",
                imageStudio: m.ai || "",
                imageBat: m.mechanical || "",
                selected: !!m.selected,
                garment: m.garment || ""
            })),
            status: 'pending',
            userEmail: data.userData?.email || null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        await setDoc(doc(db, 'anonymous_previews', 'audit-cq9138d'), previewData, { merge: true });
        console.log("SUCCESS: Synced audit-cq9138d into anonymous_previews!");
    }
}

syncAuditCq9138d().catch(console.error);
