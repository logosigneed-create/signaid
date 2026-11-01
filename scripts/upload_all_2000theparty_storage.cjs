const { initializeApp } = require('firebase/app');
const { getStorage, ref, uploadBytes, getDownloadURL } = require('firebase/storage');
const fs = require('fs');

const projects = [
  {
    name: 'signaid-prod',
    config: {
      apiKey: 'AIzaSyDTSKpVei8lCANIQJBZmuKcsjEDIubnvcs',
      authDomain: 'signaid-prod.firebaseapp.com',
      projectId: 'signaid-prod',
      storageBucket: 'signaid-prod.firebasestorage.app'
    }
  },
  {
    name: 'signaid-d2d08',
    config: {
      apiKey: 'AIzaSyCSBJf55JkrUtB844YXKlGypj2TkRDwUIY',
      authDomain: 'signaid-d2d08.firebaseapp.com',
      projectId: 'signaid-d2d08',
      storageBucket: 'signaid-d2d08.firebasestorage.app'
    }
  }
];

const items = [
  { path: 'btp_mockups/2000theparty/web/tFront.png', file: 'public/merch/2000theparty/tFront.png' },
  { path: 'btp_mockups/2000theparty/web/tBack.png', file: 'public/merch/2000theparty/tBack.png' },
  { path: 'btp_mockups/2000theparty/web/pFront.png', file: 'public/merch/2000theparty/pFront.png' },
  { path: 'btp_mockups/2000theparty/web/pBack.png', file: 'public/merch/2000theparty/pBack.png' },
  { path: 'btp_mockups/2000theparty/web/hFront.png', file: 'public/merch/2000theparty/hFront.png' },
  { path: 'btp_mockups/2000theparty/web/hBack.png', file: 'public/merch/2000theparty/hBack.png' },
  { path: 'btp_mockups/2000theparty/web/logo_A_active.png', file: 'public/logo_2000theparty_active.png' }
];

async function main() {
  const finalUrls = {};
  for (const proj of projects) {
    console.log(`\n=== Uploading to ${proj.name} ===`);
    const app = initializeApp(proj.config, proj.name);
    const storage = getStorage(app);
    for (const item of items) {
      const fileBuf = fs.readFileSync(item.file);
      const fileRef = ref(storage, item.path);
      const snap = await uploadBytes(fileRef, fileBuf, { contentType: 'image/png' });
      const url = await getDownloadURL(snap.ref);
      console.log(`  ✅ [${item.path}] -> ${url}`);
      if (proj.name === 'signaid-prod') {
        finalUrls[item.path] = url;
      }
    }
  }

  fs.writeFileSync('scripts/uploaded_2000theparty_urls.json', JSON.stringify(finalUrls, null, 2));
  console.log('\nSaved URLs to scripts/uploaded_2000theparty_urls.json');
}

main().then(() => process.exit(0)).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
