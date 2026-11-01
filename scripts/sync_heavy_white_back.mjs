import fs from 'fs';
import os from 'os';
import path from 'path';
import https from 'https';
import crypto from 'crypto';

const configPath = path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json');
const fbConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const accessToken = fbConfig.tokens?.access_token;
const localImagePath = path.resolve('temp_inspect/heavyWhiteBack.png');
const fileBuffer = fs.readFileSync(localImagePath);

const BUCKET = 'signaid-d2d08.firebasestorage.app';
const STORAGE_PATH = 'prospects/clubvisionroom/mockups/heavyWhiteBack.png';

function uploadToStorage() {
  return new Promise((resolve, reject) => {
    const downloadToken = crypto.randomUUID();
    console.log(`📤 Upload vers Firebase Storage: gs://${BUCKET}/${STORAGE_PATH}...`);
    
    const uploadUrl = `https://storage.googleapis.com/upload/storage/v1/b/${BUCKET}/o?uploadType=media&name=${encodeURIComponent(STORAGE_PATH)}`;
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
          const metaUrl = `https://storage.googleapis.com/storage/v1/b/${BUCKET}/o/${encodeURIComponent(STORAGE_PATH)}`;
          const metaReq = https.request(metaUrl, {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            }
          }, (metaRes) => {
            let mData = '';
            metaRes.on('data', c => mData += c);
            metaRes.on('end', () => {
              const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(STORAGE_PATH)}?alt=media&token=${downloadToken}`;
              console.log(`🔗 URL Publique: ${publicUrl}`);
              resolve(publicUrl);
            });
          });
          metaReq.write(JSON.stringify({ metadata: { firebaseStorageDownloadTokens: downloadToken } }));
          metaReq.end();
        } else {
          reject(new Error(`Upload status ${res.statusCode}: ${data}`));
        }
      });
    });
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
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ status: res.statusCode, data: JSON.parse(respData || '{}') });
        } else {
          resolve({ status: res.statusCode, error: respData });
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

async function updateFirestoreDoc(projectId, collection, docId, updates) {
  const getUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collection}/${docId}`;
  const getRes = await firestoreRequest('GET', getUrl);
  let existingFields = {};
  if (getRes.status === 200 && getRes.data.fields) {
    for (const [k, v] of Object.entries(getRes.data.fields)) {
      existingFields[k] = fromFirestoreValue(v);
    }
  }

  const merged = { ...existingFields };
  for (const [k, v] of Object.entries(updates)) {
    if (typeof v === 'object' && v !== null && !Array.isArray(v) && typeof merged[k] === 'object' && merged[k] !== null && !Array.isArray(merged[k])) {
      merged[k] = { ...merged[k], ...v };
    } else {
      merged[k] = v;
    }
  }

  const firestorePayload = { fields: {} };
  for (const [k, v] of Object.entries(merged)) {
    firestorePayload.fields[k] = toFirestoreValue(v);
  }

  const patchUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collection}/${docId}`;
  const patchRes = await firestoreRequest('PATCH', patchUrl, firestorePayload);

  if (patchRes.status === 200) {
    console.log(`✅ [${projectId}] ${collection}/${docId} synchronisé.`);
    return true;
  } else {
    console.error(`❌ [${projectId}] Erreur ${collection}/${docId}:`, patchRes.error);
    return false;
  }
}

async function main() {
  const publicUrl = await uploadToStorage();
  const nowIso = new Date().toISOString();

  for (const proj of ['signaid-d2d08', 'signaid-prod']) {
    console.log(`\n--- Projet: ${proj} ---`);

    // 1. profiles/clubvisionroom
    await updateFirestoreDoc(proj, 'profiles', 'clubvisionroom', {
      products: {
        'NX7200-WHT': {
          id: 'visionroom-heavyweight-tee-white',
          sku: 'NX7200-WHT',
          backImage: publicUrl,
          backImageUrl: publicUrl,
          imageBack: publicUrl,
          supplierRef: 'NX7200',
          color: 'Blanc'
        }
      },
      garmentMockups: {
        heavyWhiteBack: publicUrl,
        heavy_white_back: publicUrl
      },
      dynamicMockups: {
        heavyWhiteBack: publicUrl,
        tshirt_oversize_white_back: publicUrl
      },
      updatedAt: nowIso
    });

    // 2. prospects/clubvisionroom
    await updateFirestoreDoc(proj, 'prospects', 'clubvisionroom', {
      products: {
        'NX7200-WHT': {
          id: 'visionroom-heavyweight-tee-white',
          sku: 'NX7200-WHT',
          backImage: publicUrl,
          backImageUrl: publicUrl,
          imageBack: publicUrl,
          supplierRef: 'NX7200',
          color: 'Blanc'
        }
      },
      garmentMockups: {
        heavyWhiteBack: publicUrl,
        heavy_white_back: publicUrl
      },
      dynamicMockups: {
        heavyWhiteBack: publicUrl,
        tshirt_oversize_white_back: publicUrl
      },
      updatedAt: nowIso
    });

    // 3. SiteConfigs/clubvisionroom
    const scUrl = `https://firestore.googleapis.com/v1/projects/${proj}/databases/(default)/documents/SiteConfigs/clubvisionroom`;
    const scRes = await firestoreRequest('GET', scUrl);
    if (scRes.status === 200) {
      const existingSC = {};
      for (const [k, v] of Object.entries(scRes.data.fields || {})) {
        existingSC[k] = fromFirestoreValue(v);
      }

      let updatedProducts = existingSC.products || {};
      if (Array.isArray(updatedProducts)) {
        let foundNx = false;
        updatedProducts = updatedProducts.map(p => {
          if (p.id === 'heavyWhiteFront' || p.sku === 'NX7200-WHT' || (p.supplierRef === 'NX7200' && p.color === 'Blanc')) {
            foundNx = true;
            return {
              ...p,
              sku: 'NX7200-WHT',
              supplierRef: 'NX7200',
              color: 'Blanc',
              backImage: publicUrl,
              backImageUrl: publicUrl,
              imageBack: publicUrl,
              aiRemasteredBack: publicUrl
            };
          }
          return p;
        });
        if (!foundNx) {
          updatedProducts.push({
            id: 'visionroom-heavyweight-tee-white',
            sku: 'NX7200-WHT',
            name: 'T-Shirt Heavyweight Oversize Blanc',
            supplierRef: 'NX7200',
            color: 'Blanc',
            frontImage: '/assets/tshirt-white-NX7200.png',
            frontImageUrl: '/assets/tshirt-white-NX7200.png',
            backImage: publicUrl,
            backImageUrl: publicUrl,
            imageBack: publicUrl,
            aiRemasteredBack: publicUrl,
            price: 34.99
          });
        }
      } else if (typeof updatedProducts === 'object' && updatedProducts !== null) {
        updatedProducts['NX7200-WHT'] = {
          id: 'visionroom-heavyweight-tee-white',
          sku: 'NX7200-WHT',
          supplierRef: 'NX7200',
          color: 'Blanc',
          frontImage: '/assets/tshirt-white-NX7200.png',
          frontImageUrl: '/assets/tshirt-white-NX7200.png',
          backImage: publicUrl,
          backImageUrl: publicUrl,
          imageBack: publicUrl,
          aiRemasteredBack: publicUrl,
          price: 34.99
        };
        updatedProducts['heavyweight_tee_white'] = {
          id: 'visionroom-heavyweight-tee-white',
          sku: 'NX7200-WHT',
          supplierRef: 'NX7200',
          color: 'Blanc',
          frontImage: '/assets/tshirt-white-NX7200.png',
          frontImageUrl: '/assets/tshirt-white-NX7200.png',
          backImage: publicUrl,
          backImageUrl: publicUrl,
          imageBack: publicUrl,
          aiRemasteredBack: publicUrl,
          price: 34.99
        };
      }

      const garmentMockups = existingSC.garmentMockups || {};
      garmentMockups.heavyWhiteBack = publicUrl;
      garmentMockups.heavy_white_back = publicUrl;

      const dynamicMockups = existingSC.dynamicMockups || {};
      dynamicMockups.heavyWhiteBack = publicUrl;
      dynamicMockups.tshirt_oversize_white_back = publicUrl;

      const productsMap = existingSC.productsMap || {};
      productsMap['NX7200-WHT'] = {
        id: 'visionroom-heavyweight-tee-white',
        sku: 'NX7200-WHT',
        supplierRef: 'NX7200',
        color: 'Blanc',
        backImage: publicUrl,
        backImageUrl: publicUrl,
        imageBack: publicUrl,
        aiRemasteredBack: publicUrl
      };

      await updateFirestoreDoc(proj, 'SiteConfigs', 'clubvisionroom', {
        products: updatedProducts,
        productsMap: productsMap,
        garmentMockups: garmentMockups,
        dynamicMockups: dynamicMockups,
        updatedAt: nowIso
      });
    }
  }

  console.log(`\n🎉 TERMINÉ ! URL Storage: ${publicUrl}`);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });

