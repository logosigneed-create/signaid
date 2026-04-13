import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import * as dotenv from 'dotenv';

dotenv.config({ path: 'C:/Partage/Projet/Signaid V7/.env' });

const firebaseConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID,
    measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkPricing() {
    console.log("Fetching pricing rules...");
    const docRef = doc(db, 'settings', 'pricing_rules_v2');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.bundledData) {
            const rules = JSON.parse(data.bundledData);
            console.log("JHK170 rules:", rules['JHK170']);
        } else {
            console.log("Raw pricing data:", data);
        }
    } else {
        console.log("No rules found!");
    }
}

checkPricing();
