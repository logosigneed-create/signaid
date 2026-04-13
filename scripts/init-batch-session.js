// Simple script to initialize a Batch Session in Firestore
// Run with: node scripts/init-batch-session.js

import admin from 'firebase-admin';

// Initialize Firebase Admin with default credentials
// Make sure you're authenticated with: firebase login
if (!admin.apps.length) {
    admin.initializeApp({
        projectId: 'signaid-d2d08'
    });
}

const db = admin.firestore();

async function createBatchSession() {
    try {
        console.log('🚀 Création d\'une session de commande groupée...\n');

        // Définir les dates de session (du lundi 17 février 8h au jeudi 20 février 12h)
        const startDate = admin.firestore.Timestamp.fromDate(new Date('2026-02-17T08:00:00'));
        const endDate = admin.firestore.Timestamp.fromDate(new Date('2026-02-20T12:00:00'));

        const batchSession = {
            startDate: startDate,
            endDate: endDate,
            currentTotalQuantity: 15, // Quantité de départ pour simulation
            status: 'OPEN',
            tiers: [
                { minQty: 0, maxQty: 19, price: 15.00 },
                { minQty: 20, maxQty: 49, price: 13.50 },
                { minQty: 50, maxQty: null, price: 11.00 }
            ]
        };

        const docRef = await db.collection('batchSessions').add(batchSession);

        console.log('✅ Session créée avec succès !');
        console.log(`📋 ID: ${docRef.id}`);
        console.log(`📅 Début: ${startDate.toDate().toLocaleString('fr-FR')}`);
        console.log(`📅 Fin: ${endDate.toDate().toLocaleString('fr-FR')}`);
        console.log(`📦 Quantité initiale: ${batchSession.currentTotalQuantity} pcs`);
        console.log(`💰 Paliers:`);
        batchSession.tiers.forEach((tier, idx) => {
            const range = tier.maxQty ? `${tier.minQty}-${tier.maxQty}` : `${tier.minQty}+`;
            console.log(`   ${idx + 1}. ${range} pcs → ${tier.price}€`);
        });

        console.log('\n🌐 Vous pouvez maintenant voir le widget sur votre page d\'accueil !');
        process.exit(0);
    } catch (error) {
        console.error('❌ Erreur lors de la création:', error);
        process.exit(1);
    }
}

createBatchSession();
