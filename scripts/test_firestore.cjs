require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

console.log('Testing Firestore with config:', { projectId: firebaseConfig.projectId, hasApiKey: !!firebaseConfig.apiKey });

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function testWrite() {
  const testId = 'test_connection_' + Date.now();
  console.log('Writing test document:', testId);
  await setDoc(doc(db, 'prospects', testId), {
    test: true,
    createdAt: new Date().toISOString()
  });
  console.log('✅ Firestore Write SUCCESS to collection "prospects"!');
  process.exit(0);
}

testWrite().catch(err => {
  console.error('❌ Firestore Write Error:', err);
  process.exit(1);
});
