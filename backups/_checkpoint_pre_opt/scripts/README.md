# Base64 to Firebase Storage Migration

Ce script migre toutes les images Base64 stockées dans Firestore vers Firebase Storage pour améliorer les performances (LCP).

## Prérequis

1. **Télécharger la clé de service Firebase Admin**:
   - Allez sur [Firebase Console](https://console.firebase.google.com/project/signaid-d2d08/settings/serviceaccounts/adminsdk)
   - Cliquez sur "Générer une nouvelle clé privée"
   - Téléchargez le fichier JSON
   - Renommez-le en `serviceAccountKey.json` 
   - Placez-le dans le dossier `scripts/`

2. **Le fichier doit ressembler à**:
   ```json
   {
     "type": "service_account",
     "project_id": "signaid-d2d08",
     "private_key_id": "...",
     "private_key": "-----BEGIN PRIVATE KEY-----\n...",
     "client_email": "...",
     ...
   }
   ```

## Exécution

```bash
# Depuis la racine du projet
npx ts-node scripts/migrateBase64ToStorage.ts
```

## Ce que fait le script

1. ✅ Récupère tous les posts depuis Firestore
2. ✅ Identifie ceux avec une imageUrl en Base64 (`data:...`)
3. ✅ Upload chaque image vers Firebase Storage (`posts/{postId}/image.png`)
4. ✅ Met à jour le document Firestore avec la nouvelle URL Storage
5. ✅ Garde une sauvegarde de la référence originale

## Résultat attendu

- **Avant**: `imageUrl: "data:image/png;base64,iVBORw0KGgo..."`
- **Après**: `imageUrl: "https://storage.googleapis.com/signaid-d2d08.appspot.com/posts/abc123/image.png"`

## ⚠️ Important

- **NE COMMITEZ JAMAIS** le fichier `serviceAccountKey.json`
- Le script est idempotent : il ne re-migrera pas les images déjà migrées
- Faites une sauvegarde de Firestore avant d'exécuter
