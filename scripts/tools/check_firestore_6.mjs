import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, doc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyCSBJf55JkrUtB844YXKlGypj2TkRDwUIY",
    authDomain: "signaid-d2d08.firebaseapp.com",
    projectId: "signaid-d2d08"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function fixIt() {
    const q = query(collection(db, 'btp_projects'), where('projectId', '==', 'audit-5grp9wu'));
    const snap = await getDocs(q);
    if (!snap.empty) {
        const projectData = snap.docs[0].data();
        const pId = projectData.previewId;
        const uData = projectData.userData || {};
        
        const previewData = {
            previewId: pId,
            companyName: uData.companyName || "Auditeur",
            logoUrl: projectData.logoUrl || "",
            logoOriginalUrl: "",
            logoAdaptedUrl: projectData.logoUrl || "",
            accentColor: "#ea580c",
            items: (projectData.mockups || []).map(m => ({
                id: m.id,
                title: m.title,
                price: m.id.includes('basic') ? 25 : 39,
                imageFront: m.ai || m.base || "",
                imageBack: m.mechanical || "",
                selected: !!m.selected,
                garment: m.garment || ""
            })),
            status: 'pending',
            userEmail: uData.email || null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        await setDoc(doc(db, 'anonymous_previews', pId), previewData, { merge: true });
        console.log("FIXED PREVIEW DOC FOR:", pId);
    } else {
        console.log("PROJECT NOT FOUND");
    }
}

fixIt().catch(console.error);
