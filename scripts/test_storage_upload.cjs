const { initializeApp } = require('firebase/app');
const { getStorage, ref, uploadBytes, getDownloadURL } = require('firebase/storage');
const fs = require('fs');

const firebaseConfig = {
  apiKey: 'AIzaSyDTSKpVei8lCANIQJBZmuKcsjEDIubnvcs',
  authDomain: 'signaid-prod.firebaseapp.com',
  projectId: 'signaid-prod',
  storageBucket: 'signaid-prod.firebasestorage.app'
};

const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

async function testUpload() {
  const fileBuf = fs.readFileSync('public/merch/2000theparty/tFront.png');
  const fileRef = ref(storage, 'btp_mockups/2000theparty/web/tFront.png');
  console.log('Uploading tFront.png to signaid-prod...');
  const snap = await uploadBytes(fileRef, fileBuf, { contentType: 'image/png' });
  const url = await getDownloadURL(snap.ref);
  console.log('✅ Uploaded successfully! URL:', url);
}

testUpload().then(() => process.exit(0)).catch(err => {
  console.error('❌ Upload failed:', err);
  process.exit(1);
});
