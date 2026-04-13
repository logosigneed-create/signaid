# 🎯 Initialisation de la Session Batch

## Option 1 : Via la Console Firebase (Recommandé)

1. Allez sur [Firebase Console](https://console.firebase.google.com/)
2. Sélectionnez votre projet `signaid-d2d08`
3. Allez dans **Firestore Database**
4. Créez une nouvelle collection `batchSessions`
5. Ajoutez un document avec ces champs :

```
startDate: 17 février 2026 à 08:00:00 UTC+1
endDate: 20 février 2026 à 12:00:00 UTC+1
currentTotalQuantity: 15
status: "OPEN"
tiers: [
  { minQty: 0, maxQty: 19, price: 15.00 },
  { minQty: 20, maxQty: 49, price: 13.50 },
  { minQty: 50, maxQty: null, price: 11.00 }
]
```

## Option 2 : Via le Script (Nécessite firebase-admin)

### Prérequis
```bash
npm install firebase-admin
```

### Lancement
```bash
node scripts/init-batch-session.js
```

## ✅ Vérification

Après la création, le widget sera visible sur :
- **Local** : http://localhost:5173/
- **Production** : https://signaid-d2d08.web.app/
