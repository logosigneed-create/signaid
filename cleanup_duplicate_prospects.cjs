const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, deleteDoc, doc } = require('firebase/firestore');

const firebaseConfig = {
  name: 'signaid-prod',
  apiKey: 'AIzaSyDTSKpVei8lCANIQJBZmuKcsjEDIubnvcs',
  authDomain: 'signaid-prod.firebaseapp.com',
  projectId: 'signaid-prod',
  storageBucket: 'signaid-prod.firebasestorage.app'
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Official IDs to PRESERVE (DO NOT DELETE)
const PRESERVED_IDS = new Set([
  'guest_ms3ijgnco2xnid',
  'fabrizio',
  'audit-8f198p5',
  'djdfazz',
  'XisMrk9V9ubuJtSf6D9iXPCNWA12',
  'master_admin_logosigneed',
  'MoliAlmeria',
  'guest_moli_almeria_9257',
  'JqVee368N5WK2gti0kv7EKdtVJg1',
  'guest_mr8yxvmaijx85f'
]);

async function cleanCollection(colName) {
  console.log(`--- Nettoyage de la collection: ${colName} ---`);
  const snap = await getDocs(collection(db, colName));
  let deletedCount = 0;
  let preservedCount = 0;

  for (const d of snap.docs) {
    const id = d.id;
    if (!PRESERVED_IDS.has(id)) {
      try {
        await deleteDoc(doc(db, colName, id));
        console.log(`  🗑️ Supprimé ${colName}/${id}`);
        deletedCount++;
      } catch (e) {
        console.warn(`  ⚠️ Erreur suppression ${colName}/${id}:`, e.message);
      }
    } else {
      console.log(`  ✅ Conservé ${colName}/${id}`);
      preservedCount++;
    }
  }

  console.log(`Résultat ${colName}: ${deletedCount} supprimé(s), ${preservedCount} conservé(s).\n`);
}

async function runCleanup() {
  console.log("=================================================");
  console.log("NETTOYAGE DES PROSPECTS TEST DOUBLONS DANS FIRESTORE");
  console.log("=================================================");

  await cleanCollection('SiteConfigs');
  await cleanCollection('btp_projects');
  await cleanCollection('anonymous_previews');

  console.log("✨ Nettoyage terminé avec succès !");
  process.exit(0);
}

runCleanup().catch(err => {
  console.error("❌ Erreur:", err);
  process.exit(1);
});
