import fs from 'fs';
import os from 'os';
import path from 'path';
import https from 'https';
import crypto from 'crypto';

const configPath = path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json');
if (!fs.existsSync(configPath)) {
  console.error('❌ firebase-tools.json not found');
  process.exit(1);
}
const fbConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const accessToken = fbConfig.tokens?.access_token;
if (!accessToken) {
  console.error('❌ access token not found');
  process.exit(1);
}

const assets = [
  { id: 'tFront', file: 'public/clubvision_tshirt_front.png' },
  { id: 'tBack', file: 'public/clubvision_tshirt_back.png' },
  { id: 'pFront', file: 'public/clubvision_polo_front.png' },
  { id: 'pBack', file: 'public/clubvision_polo_back.png' },
  { id: 'hFront', file: 'public/clubvision_hoodie_front.png' },
  { id: 'hBack', file: 'public/clubvision_hoodie_back.png' },
  { id: 'tankFront', file: 'public/merch/visionroom/tank-front.png' },
  { id: 'tankBack', file: 'public/merch/visionroom/tank-back.png' },
  { id: 'tankWhiteFront', file: 'public/merch/visionroom/tank-white-front.png' },
  { id: 'tankWhiteBack', file: 'public/merch/visionroom/tank-white-back.png' },
  { id: 'heavyFront', file: 'temp_inspect/generated/heavyFront_fixed.png' },
  { id: 'heavyBack', file: 'public/merch/visionroom/oversize-back.png' },
  { id: 'heavyWhiteFront', file: 'temp_inspect/generated/heavyWhiteFront_fixed.png' },
  { id: 'heavyWhiteBack', file: 'temp_inspect/generated/heavyWhiteBack.png' }
];

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
              const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(storagePath)}?alt=media`;
              resolve({ publicUrl, downloadToken });
            });
          });
          metaReq.on('error', reject);
          metaReq.write(JSON.stringify({
            cacheControl: 'public, max-age=3600, must-revalidate',
            metadata: { firebaseStorageDownloadTokens: downloadToken }
          }));
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

async function main() {
  const buckets = ['signaid-prod.firebasestorage.app', 'signaid-d2d08.firebasestorage.app'];
  console.log(`Starting upload of ${assets.length} assets for clubvisionroom...`);

  for (const item of assets) {
    const storagePath = `btp_mockups/clubvisionroom/web/${item.id}.png`;
    console.log(`\nProcessing ${item.id} (${item.file})...`);
    for (const bucket of buckets) {
      try {
        const result = await uploadFileToBucket(bucket, storagePath, item.file);
        console.log(`  ✅ [${bucket}] -> ${result.publicUrl}`);
      } catch (err) {
        console.warn(`  ⚠️ [${bucket}] error:`, err.message);
      }
    }
  }

  console.log('\nVerifying URLs via HTTP GET...');
  for (const item of assets) {
    const url = `https://firebasestorage.googleapis.com/v0/b/signaid-prod.firebasestorage.app/o/btp_mockups%2Fclubvisionroom%2Fweb%2F${item.id}.png?alt=media`;
    await new Promise((res) => {
      https.get(url, (resp) => {
        console.log(`  [${item.id}] Status: ${resp.statusCode} (length: ${resp.headers['content-length']} bytes)`);
        res();
      }).on('error', (e) => {
        console.error(`  [${item.id}] GET error:`, e.message);
        res();
      });
    });
  }
}

main().catch(console.error);
