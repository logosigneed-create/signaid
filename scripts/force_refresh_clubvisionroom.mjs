import fs from 'fs';
import os from 'os';
import path from 'path';
import https from 'https';
import crypto from 'crypto';
import { execSync } from 'child_process';

const configPath = path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json');
if (!fs.existsSync(configPath)) {
  console.error('❌ Fichier firebase-tools.json introuvable.');
  process.exit(1);
}
const fbConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const accessToken = fbConfig.tokens?.access_token;
if (!accessToken) {
  console.error('❌ Token Firebase introuvable.');
  process.exit(1);
}
console.log('🔑 Authentification Firebase OK.');

console.log('\n🎨 Étape 1 : Génération haute fidélité des assets graphiques...');
// Exécution du script de génération Python
execSync('python scripts/generate_all_clubvision_assets.py', { stdio: 'inherit' });

fs.copyFileSync('temp_inspect/generated/tFront_fixed.png', 'public/clubvision_tshirt_front.png');
fs.copyFileSync('temp_inspect/generated/pFront_fixed.png', 'public/clubvision_polo_front.png');
fs.copyFileSync('temp_inspect/generated/hFront_fixed.png', 'public/clubvision_hoodie_front.png');
console.log('✅ Synchronisation des assets locaux terminée.');

function uploadFileToBucket(bucket, storagePath, filePath) {
  return new Promise((resolve, reject) => {
    const fileBuffer = fs.readFileSync(filePath);
    const downloadToken = crypto.randomUUID();
    const uploadUrl = `https://storage.googleapis.com/upload/storage/v1/b/${bucket}/o?uploadType=media&name=${encodeURIComponent(storagePath)}`;
    
    const req = https.request(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'image/png',
        'Content-Length': fileBuffer.length
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const metaUrl = `https://storage.googleapis.com/storage/v1/b/${bucket}/o/${encodeURIComponent(storagePath)}`;
          const metaReq = https.request(metaUrl, {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            }
          }, (metaRes) => {
            metaRes.on('data', () => {});
            metaRes.on('end', () => {
              const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(storagePath)}?alt=media&token=${downloadToken}`;
              resolve({ publicUrl, downloadToken });
            });
          });
          metaReq.on('error', reject);
          metaReq.write(JSON.stringify({ metadata: { firebaseStorageDownloadTokens: downloadToken } }));
          metaReq.end();
        } else {
          reject(new Error(`Upload failed on ${bucket} (${res.statusCode}): ${data}`));
        }
      });
    });
    req.on('error', reject);
    req.write(fileBuffer);
    req.end();
  });
}

function firestoreRequest(method, url, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      method: method,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    }, (res) => {
      let respData = '';
      res.on('data', c => respData += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(respData || '{}');
          resolve({ status: res.statusCode, data: json });
        } catch {
          resolve({ status: res.statusCode, data: respData });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function toFirestoreValue(val) {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'string') return { stringValue: val };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') {
    if (Number.isInteger(val)) return { integerValue: val.toString() };
    return { doubleValue: val };
  }
  if (Array.isArray(val)) return { arrayValue: { values: val.map(toFirestoreValue) } };
  if (typeof val === 'object') {
    const fields = {};
    for (const [k, v] of Object.entries(val)) fields[k] = toFirestoreValue(v);
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

function fromFirestoreValue(val) {
  if (!val) return null;
  if ('stringValue' in val) return val.stringValue;
  if ('booleanValue' in val) return val.booleanValue;
  if ('integerValue' in val) return parseInt(val.integerValue, 10);
  if ('doubleValue' in val) return parseFloat(val.doubleValue);
  if ('nullValue' in val) return null;
  if ('arrayValue' in val) return (val.arrayValue.values || []).map(fromFirestoreValue);
  if ('mapValue' in val) {
    const obj = {};
    for (const [k, v] of Object.entries(val.mapValue.fields || {})) obj[k] = fromFirestoreValue(v);
    return obj;
  }
  return val;
}
console.log('\n☁️  Étape 2 : Upload vers Cloud Storage...');

const assetsToUpload = [
  { name: 'tFront', file: 'temp_inspect/generated/tFront_fixed.png', path: 'btp_mockups/clubvisionroom/web/tFront_fixed.png' },
  { name: 'pFront', file: 'temp_inspect/generated/pFront_fixed.png', path: 'btp_mockups/clubvisionroom/web/pFront_fixed.png' },
  { name: 'hFront', file: 'temp_inspect/generated/hFront_fixed.png', path: 'btp_mockups/clubvisionroom/web/hFront_fixed.png' },
  { name: 'heavyFront', file: 'temp_inspect/generated/heavyFront_fixed.png', path: 'btp_mockups/clubvisionroom/web/heavyFront_fixed.png' },
  { name: 'heavyWhiteFront', file: 'temp_inspect/generated/heavyWhiteFront_fixed.png', path: 'btp_mockups/clubvisionroom/web/heavyWhiteFront_fixed.png' },
  { name: 'heavyWhiteBack', file: 'temp_inspect/generated/heavyWhiteBack.png', path: 'prospects/clubvisionroom/mockups/heavyWhiteBack.png' }
];

const uploadedUrls = {};

for (const item of assetsToUpload) {
  // Uploader sur signaid-d2d08.firebasestorage.app
  const resD2d08 = await uploadFileToBucket('signaid-d2d08.firebasestorage.app', item.path, item.file);
  // Uploader aussi sur signaid-prod-assets pour URL CDN statique
  await uploadFileToBucket('signaid-prod-assets', item.path, item.file).catch(() => {});
  // Uploader aussi sur signaid-prod.firebasestorage.app
  await uploadFileToBucket('signaid-prod.firebasestorage.app', item.path, item.file).catch(() => {});
  
  uploadedUrls[item.name] = resD2d08.publicUrl;
  console.log(`  🔗 ${item.name} -> ${resD2d08.publicUrl}`);
}
console.log('\n🔥 Étape 3 : Écrasement Firestore (signaid-prod et signaid-d2d08)...');

const urlTFront = uploadedUrls.tFront;
const urlPFront = uploadedUrls.pFront;
const urlHFront = uploadedUrls.hFront;
const urlHeavyFront = uploadedUrls.heavyFront;
const urlHeavyWhiteFront = uploadedUrls.heavyWhiteFront;
const urlHeavyWhiteBack = uploadedUrls.heavyWhiteBack;

const newGarmentMockups = {
  tFront: urlTFront,
  pFront: urlPFront,
  hFront: urlHFront,
  heavyFront: urlHeavyFront,
  heavyWhiteFront: urlHeavyWhiteFront,
  heavy_white_front: urlHeavyWhiteFront,
  heavyWhiteBack: urlHeavyWhiteBack,
  heavy_white_back: urlHeavyWhiteBack,
  tshirt_oversize_white_back: urlHeavyWhiteBack,
  tshirt_front: urlTFront,
  polo_front: urlPFront,
  sweat_front: urlHFront,
  hoodie_front: urlHFront,
  heavy_front: urlHeavyFront
};

const newDynamicMockups = {
  tFront: urlTFront,
  pFront: urlPFront,
  hFront: urlHFront,
  heavyFront: urlHeavyFront,
  heavyWhiteFront: urlHeavyWhiteFront,
  heavy_white_front: urlHeavyWhiteFront,
  heavyWhiteBack: urlHeavyWhiteBack,
  heavy_white_back: urlHeavyWhiteBack,
  tshirt_oversize_white_back: urlHeavyWhiteBack,
  tshirt_front: urlTFront,
  polo_front: urlPFront,
  sweat_front: urlHFront,
  hoodie_front: urlHFront,
  heavy_front: urlHeavyFront
};

function updateProductsStructure(existingProducts) {
  if (Array.isArray(existingProducts)) {
    return existingProducts.map(p => {
      const pid = p.id || '';
      const pgarment = p.garment || '';
      if (pid === 'tFront' || pgarment === 'tshirt' || pid.includes('tshirt')) {
        return { ...p, frontImage: urlTFront, frontImageUrl: urlTFront, imageFront: urlTFront, imageUrl: urlTFront };
      }
      if (pid === 'pFront' || pgarment === 'polo' || pid.includes('polo')) {
        return { ...p, frontImage: urlPFront, frontImageUrl: urlPFront, imageFront: urlPFront, imageUrl: urlPFront };
      }
      if (pid === 'hFront' || pgarment === 'sweat' || pgarment === 'hoodie' || pid.includes('hoodie')) {
        return { ...p, frontImage: urlHFront, frontImageUrl: urlHFront, imageFront: urlHFront, imageUrl: urlHFront };
      }
      if (pid === 'heavyFront' || (pgarment === 'tshirt_oversize' && (!p.color || p.color !== 'Blanc'))) {
        return { ...p, frontImage: urlHeavyFront, frontImageUrl: urlHeavyFront, imageFront: urlHeavyFront, imageUrl: urlHeavyFront };
      }
      if (pid === 'NX7200-WHT' || pid === 'heavyWhiteFront' || (pgarment === 'tshirt_oversize' && (p.color === 'Blanc' || pid.includes('white')))) {
        return {
          ...p,
          frontImage: urlHeavyWhiteFront,
          frontImageUrl: urlHeavyWhiteFront,
          imageFront: urlHeavyWhiteFront,
          imageUrl: urlHeavyWhiteFront,
          backImage: urlHeavyWhiteBack,
          backImageUrl: urlHeavyWhiteBack,
          imageBack: urlHeavyWhiteBack,
          aiRemasteredBack: urlHeavyWhiteBack
        };
      }
      return p;
    });
  } else if (typeof existingProducts === 'object' && existingProducts !== null) {
    const updated = { ...existingProducts };
    if (updated.tshirt) {
      updated.tshirt = { ...updated.tshirt, frontImage: urlTFront, frontImageUrl: urlTFront, imageFront: urlTFront, imageUrl: urlTFront };
    }
    if (updated.polo) {
      updated.polo = { ...updated.polo, frontImage: urlPFront, frontImageUrl: urlPFront, imageFront: urlPFront, imageUrl: urlPFront };
    }
    if (updated.hoodie) {
      updated.hoodie = { ...updated.hoodie, frontImage: urlHFront, frontImageUrl: urlHFront, imageFront: urlHFront, imageUrl: urlHFront };
    }
    if (updated.heavyweight_tee) {
      updated.heavyweight_tee = { ...updated.heavyweight_tee, frontImage: urlHeavyFront, frontImageUrl: urlHeavyFront, imageFront: urlHeavyFront, imageUrl: urlHeavyFront };
    }
    if (updated['NX7200-WHT']) {
      updated['NX7200-WHT'] = {
        ...updated['NX7200-WHT'],
        frontImage: urlHeavyWhiteFront,
        frontImageUrl: urlHeavyWhiteFront,
        imageFront: urlHeavyWhiteFront,
        imageUrl: urlHeavyWhiteFront,
        backImage: urlHeavyWhiteBack,
        backImageUrl: urlHeavyWhiteBack,
        imageBack: urlHeavyWhiteBack,
        aiRemasteredBack: urlHeavyWhiteBack
      };
    }
    if (updated.heavyweight_tee_white) {
      updated.heavyweight_tee_white = {
        ...updated.heavyweight_tee_white,
        frontImage: urlHeavyWhiteFront,
        frontImageUrl: urlHeavyWhiteFront,
        imageFront: urlHeavyWhiteFront,
        imageUrl: urlHeavyWhiteFront,
        backImage: urlHeavyWhiteBack,
        backImageUrl: urlHeavyWhiteBack,
        imageBack: urlHeavyWhiteBack,
        aiRemasteredBack: urlHeavyWhiteBack
      };
    }
    return updated;
  }
  return existingProducts;
}

async function patchFirestoreDocument(projectId, collection, docId) {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collection}/${docId}`;
  const getRes = await firestoreRequest('GET', url);
  
  let existingFields = {};
  if (getRes.status === 200 && getRes.data.fields) {
    for (const [k, v] of Object.entries(getRes.data.fields)) {
      existingFields[k] = fromFirestoreValue(v);
    }
  }

  const mergedGarmentMockups = { ...(existingFields.garmentMockups || {}), ...newGarmentMockups };
  const mergedDynamicMockups = { ...(existingFields.dynamicMockups || {}), ...newDynamicMockups };
  const updatedProducts = updateProductsStructure(existingFields.products);

  const payloadData = {
    ...existingFields,
    garmentMockups: mergedGarmentMockups,
    dynamicMockups: mergedDynamicMockups,
    products: updatedProducts,
    updatedAt: new Date().toISOString()
  };

  const firestorePayload = { fields: {} };
  for (const [k, v] of Object.entries(payloadData)) {
    firestorePayload.fields[k] = toFirestoreValue(v);
  }

  const patchRes = await firestoreRequest('PATCH', url, firestorePayload);
  if (patchRes.status === 200) {
    console.log(`  ✅ [${projectId}] ${collection}/${docId} synchronisé.`);
  } else {
    console.error(`  ❌ [${projectId}] Erreur ${collection}/${docId}:`, patchRes.data);
  }
}

for (const proj of ['signaid-prod', 'signaid-d2d08']) {
  console.log(`\n📌 Traitement du projet ${proj}...`);
  for (const coll of ['SiteConfigs', 'profiles', 'prospects']) {
    await patchFirestoreDocument(proj, coll, 'clubvisionroom');
  }
  await patchFirestoreDocument(proj, 'SiteConfigs', 'clubvision').catch(() => {});
}

console.log('\n🎉 Pipeline de synchronisation Firestore terminée avec succès !');


