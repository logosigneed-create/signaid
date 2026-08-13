// Script to update Firestore session images using Firebase CLI token
// Uses firebase/firestore with authenticated user via REST API

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

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
const storage = getStorage(app);
const auth = getAuth(app);

const SESSION_ID = 'audit-8f198p5';

// Map of mockup IDs to preset image files
const PRESET_IMAGES = [
    { id: 'tBack',     garment: 'tshirt', view: 'back',  file: resolve(__dirname, '../public/assets/presets/tshirt_back_dfazz.png') },
    { id: 'pFront',    garment: 'polo',   view: 'front', file: resolve(__dirname, '../public/assets/presets/polo_front_dfazz.png') },
    { id: 'pBack',     garment: 'polo',   view: 'back',  file: resolve(__dirname, '../public/assets/presets/polo_back_dfazz.png') },
    { id: 'hBack',     garment: 'sweat',  view: 'back',  file: resolve(__dirname, '../public/assets/presets/hoodie_back_dfazz.png') },
    { id: 'cardFront', garment: 'business_card', view: 'front', file: resolve(__dirname, '../public/assets/presets/card_dfazz.png') },
    { id: 'cardBack',  garment: 'business_card', view: 'back',  file: resolve(__dirname, '../public/assets/presets/card_dfazz.png') },
];

// Check preset files exist
console.log('\n📁 Checking preset files...');
for (const p of PRESET_IMAGES) {
    console.log(`  ${existsSync(p.file) ? '✅' : '❌'} ${p.id}: ${p.file}`);
}

async function uploadImage(localPath, storagePath) {
    const buffer = readFileSync(localPath);
    const blob = new Blob([buffer], { type: 'image/png' });
    const storageRef = ref(storage, storagePath);
    await uploadBytes(storageRef, blob, { contentType: 'image/png' });
    const url = await getDownloadURL(storageRef);
    console.log(`✅ Uploaded → ${url}`);
    return url;
}

async function main() {
    // Sign in with email/password (admin account)
    const email = process.argv[2];
    const password = process.argv[3];
    
    if (!email || !password) {
        console.error('\n❌ Usage: node update_session_images.mjs <email> <password>');
        process.exit(1);
    }

    console.log(`\n🔐 Signing in as ${email}...`);
    await signInWithEmailAndPassword(auth, email, password);
    console.log('✅ Authenticated!');

    console.log(`\n🚀 Updating session: ${SESSION_ID}\n`);

    // Upload all preset images and get their URLs
    const urlMap = {};
    for (const preset of PRESET_IMAGES) {
        const storagePath = `btp_mockups/${SESSION_ID}/${preset.id}_ai_preset.png`;
        try {
            console.log(`📤 Uploading ${preset.id}...`);
            const url = await uploadImage(preset.file, storagePath);
            urlMap[preset.id] = url;
        } catch (e) {
            console.error(`❌ Failed to upload ${preset.id}:`, e.message);
        }
    }

    // Query Firestore for the session
    console.log(`\n🔍 Looking up Firestore session...`);
    let q = query(collection(db, 'btp_projects'), where('projectId', '==', SESSION_ID));
    let snapshot = await getDocs(q);
    
    if (snapshot.empty) {
        q = query(collection(db, 'btp_projects'), where('previewId', '==', SESSION_ID));
        snapshot = await getDocs(q);
    }

    if (snapshot.empty) {
        console.error(`❌ No Firestore document found for session: ${SESSION_ID}`);
        process.exit(1);
    }

    const docSnap = snapshot.docs[0];
    const data = docSnap.data();
    console.log(`✅ Found document: ${docSnap.id}`);
    
    const existingMockups = data.mockups || data.items || [];
    console.log(`📄 Existing mockups: ${existingMockups.length}`);

    // Update mockups with preset URLs
    let updatedCount = 0;
    const updatedMockups = existingMockups.map((m) => {
        const url = urlMap[m.id];
        if (url) {
            console.log(`  🎨 Updating ${m.id} → preset image`);
            updatedCount++;
            return { ...m, ai: url, imageStudio: url, imageFront: url, hasAi: true };
        }
        return m;
    });

    await updateDoc(docSnap.ref, {
        mockups: updatedMockups,
        items: updatedMockups,
        updatedAt: new Date().toISOString()
    });

    console.log(`\n✅ Updated ${updatedCount} mockups in Firestore!`);
    console.log(`🔗 Check: https://signaid.eu/portail-shop?audit=${SESSION_ID}`);
    process.exit(0);
}

main().catch(e => {
    console.error('Fatal error:', e.message || e);
    process.exit(1);
});
