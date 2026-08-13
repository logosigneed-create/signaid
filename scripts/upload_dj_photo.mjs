import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, updateDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { readFileSync, existsSync } from 'fs';

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
const storage = getStorage(app);
const auth = getAuth(app);

const UID = 'guest_ms3ijgnco2xnid';
const LOCAL_PHOTO_PATH = 'C:/Users/Asus/.gemini/antigravity/brain/288c9fb1-be90-4cbf-8187-57de988238c1/media__1785418332679.jpg';

async function main() {
    const email = process.argv[2] || process.env.ADMIN_EMAIL;
    const password = process.argv[3] || process.env.ADMIN_PASS;

    if (!email || !password) {
        console.error('❌ Usage: node upload_dj_photo.mjs <email> <password>');
        process.exit(1);
    }

    console.log(`Checking photo file: ${LOCAL_PHOTO_PATH}`);
    if (!existsSync(LOCAL_PHOTO_PATH)) {
        console.error(`❌ Photo file does not exist at: ${LOCAL_PHOTO_PATH}`);
        process.exit(1);
    }

    console.log(`🔐 Signing in as ${email}...`);
    await signInWithEmailAndPassword(auth, email, password);
    console.log(`✅ Authenticated!`);

    const buffer = readFileSync(LOCAL_PHOTO_PATH);
    const blob = new Blob([buffer], { type: 'image/jpeg' });
    const storagePath = `users/${UID}/gallery/dj_dfazz_live.jpg`;
    const storageRef = ref(storage, storagePath);

    console.log(`📤 Uploading photo to Firebase Storage: ${storagePath}...`);
    await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' });
    const downloadUrl = await getDownloadURL(storageRef);
    console.log(`✅ Uploaded successfully! URL: ${downloadUrl}`);

    // Update the SiteConfig document in Firestore
    const configRef = doc(db, 'SiteConfigs', UID);
    const configSnap = await getDoc(configRef);

    if (!configSnap.exists()) {
        console.error(`❌ SiteConfigs document not found for UID: ${UID}`);
        process.exit(1);
    }

    const data = configSnap.data();
    console.log(`📄 Found SiteConfigs document for ${data.companyName}`);

    // Add a custom section "PHOTOS LIVE"
    const customSections = data.customSections || [];
    
    // Check if section already exists, if so update it, otherwise add new
    const sectionIndex = customSections.findIndex((s) => s.title === 'PHOTOS LIVE' || s.title === 'Photos Live');
    const newSectionContent = `
        <div style="display: flex; flex-direction: column; align-items: center; gap: 1rem; margin-top: 1rem;">
            <p style="text-align: center; font-style: italic; opacity: 0.8; font-size: 0.9rem;">DJ D-FAZZ en mix live derrière les platines.</p>
            <div style="position: relative; border-radius: 20px; overflow: hidden; border: 1px solid var(--border-color); box-shadow: 0 10px 30px rgba(0,0,0,0.5); max-width: 100%;">
                <img src="${downloadUrl}" alt="DJ D-FAZZ Live" style="display: block; width: 100%; height: auto; max-height: 500px; object-fit: contain;" />
            </div>
        </div>
    `;

    if (sectionIndex >= 0) {
        console.log(`Updating existing custom section...`);
        customSections[sectionIndex].content = newSectionContent;
    } else {
        console.log(`Adding new custom section "PHOTOS LIVE"...`);
        customSections.push({
            title: 'PHOTOS LIVE',
            content: newSectionContent
        });
    }

    // Ensure 'socials' or order has 'custom_X' section if sectionOrder exists
    const sectionOrder = data.sectionOrder || ['presentation', 'address', 'contact', 'socials', 'products'];
    const newSectionId = `custom_${customSections.length - 1}`;
    if (!sectionOrder.includes(newSectionId)) {
        // Place custom section before products or socials
        const insertIndex = sectionOrder.indexOf('products');
        if (insertIndex >= 0) {
            sectionOrder.splice(insertIndex, 0, newSectionId);
        } else {
            sectionOrder.push(newSectionId);
        }
    }

    await updateDoc(configRef, {
        customSections: customSections,
        sectionOrder: sectionOrder,
        updatedAt: new Date().toISOString()
    });

    console.log(`\n✅ SiteConfig updated in Firestore! Custom section added/updated.`);
    console.log(`🔗 Public Hub: https://signaid.eu/profil?uid=${UID}`);
    process.exit(0);
}

main().catch(e => {
    console.error('Fatal error:', e);
    process.exit(1);
});
