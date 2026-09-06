const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, setDoc, updateDoc } = require('firebase/firestore');

const firebaseConfigs = [
  {
    name: "signaid-prod",
    apiKey: "AIzaSyDTSKpVei8lCANIQJBZmuKcsjEDIubnvcs",
    authDomain: "signaid-prod.firebaseapp.com",
    projectId: "signaid-prod",
    storageBucket: "signaid-d2d08.firebasestorage.app",
    messagingSenderId: "244540314192",
    appId: "1:244540314192:web:814f987d2a6ece8ac67755"
  },
  {
    name: "signaid-d2d08",
    apiKey: "AIzaSyCSBJf55JkrUtB844YXKlGypj2TkRDwUIY",
    authDomain: "signaid-d2d08.firebaseapp.com",
    projectId: "signaid-d2d08",
    storageBucket: "signaid-d2d08.firebasestorage.app",
    messagingSenderId: "214213761718",
    appId: "1:2545a0dc2f796e1d9e6417"
  }
];

const targetAuditKey = "audit-8f198p5";

async function inspectAndFix() {
  for (const cfg of firebaseConfigs) {
    console.log(`\n🔍 Inspection dans Firestore '${cfg.name}'...`);
    const app = initializeApp(cfg, `fix_${cfg.name}`);
    const db = getFirestore(app);

    const collections = ['SiteConfigs', 'configs', 'anonymous_previews', 'btp_projects'];
    for (const colName of collections) {
      const snap = await getDocs(collection(db, colName));
      snap.forEach(async (d) => {
        const data = d.data();
        const strData = JSON.stringify(data);
        if (strData.includes('audit-9c3yexa')) {
          console.log(`  ❌ Trouvé 'audit-9c3yexa' dans ${colName}/${d.id}!`);
          const fixedData = JSON.parse(strData.replace(/audit-9c3yexa/g, targetAuditKey));
          await setDoc(doc(db, colName, d.id), fixedData, { merge: true });
          console.log(`  ✅ Corrige avec '${targetAuditKey}' dans ${colName}/${d.id}.`);
        }
      });
    }

    // Explicitly update guest_ms3ijgnco2xnid & fabrizio
    const guestRef = doc(db, 'SiteConfigs', 'guest_ms3ijgnco2xnid');
    await setDoc(guestRef, {
      actuationKey: targetAuditKey,
      generatedKey: targetAuditKey,
      previewId: targetAuditKey,
      projectId: targetAuditKey,
      auditKey: targetAuditKey,
      shopUrl: `https://signaid.eu/portail-shop?audit=${targetAuditKey}`,
      merchUrl: `https://signaid.eu/portail-shop?audit=${targetAuditKey}`,
      auditUrl: `/portail-audit?uid=guest_ms3ijgnco2xnid&audit=${targetAuditKey}`
    }, { merge: true });
    console.log(`  ✅ Locked SiteConfigs/guest_ms3ijgnco2xnid to ${targetAuditKey}.`);

    const fabRef = doc(db, 'SiteConfigs', 'fabrizio');
    await setDoc(fabRef, {
      actuationKey: targetAuditKey,
      generatedKey: targetAuditKey,
      previewId: targetAuditKey,
      projectId: targetAuditKey,
      auditKey: targetAuditKey,
      shopUrl: `https://signaid.eu/portail-shop?audit=${targetAuditKey}`,
      merchUrl: `https://signaid.eu/portail-shop?audit=${targetAuditKey}`,
      auditUrl: `/portail-audit?uid=guest_ms3ijgnco2xnid&audit=${targetAuditKey}`
    }, { merge: true });
    console.log(`  ✅ Locked SiteConfigs/fabrizio to ${targetAuditKey}.`);
  }
}

inspectAndFix().then(() => {
  console.log("\nDone!");
  process.exit(0);
}).catch(console.error);
