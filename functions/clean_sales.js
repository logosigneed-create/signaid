const admin = require('firebase-admin');

// Initialize admin with default credentials
if (!admin.apps.length) {
    admin.initializeApp({
        projectId: "signaid-prod"
    });
}
const db = admin.firestore();

const TARGET_UID = 'guest_ms3ijgnco2xnid';

async function main() {
    console.log(`\n🧹 Cleaning sales for ${TARGET_UID}...`);

    const salesSnap = await db.collection('dj_sales').where('userId', '==', TARGET_UID).get();
    let count = 0;
    for (const d of salesSnap.docs) {
        await d.ref.delete();
        count++;
    }
    console.log(`✅ Deleted ${count} sales docs.`);

    await db.collection('SiteConfigs').doc(TARGET_UID).update({
        totalMarginAvailable: 0
    });
    console.log(`✅ Reset totalMarginAvailable to 0 €.`);
    process.exit(0);
}

main().catch(err => {
    console.error("❌ Error cleaning sales:", err);
    process.exit(1);
});
