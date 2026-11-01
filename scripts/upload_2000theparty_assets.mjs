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
  { storagePath: 'btp_mockups/2000theparty/web/tFront.png', file: 'public/merch/2000theparty/tFront.png' },
  { storagePath: 'btp_mockups/2000theparty/web/tBack.png', file: 'public/merch/2000theparty/tBack.png' },
  { storagePath: 'btp_mockups/2000theparty/web/pFront.png', file: 'public/merch/2000theparty/pFront.png' },
  { storagePath: 'btp_mockups/2000theparty/web/pBack.png', file: 'public/merch/2000theparty/pBack.png' },
  { storagePath: 'btp_mockups/2000theparty/web/hFront.png', file: 'public/merch/2000theparty/hFront.png' },
  { storagePath: 'btp_mockups/2000theparty/web/hBack.png', file: 'public/merch/2000theparty/hBack.png' },
  { storagePath: 'btp_mockups/2000theparty/web/logo_A_active.png', file: 'public/logo_2000theparty_active.png' },
  { storagePath: 'users/audit-2000theparty-eyem/logos/logo_A_active.png', file: 'public/logo_2000theparty_active.png' }
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
              const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(storagePath)}?alt=media&token=${downloadToken}`;
              resolve({ publicUrl, downloadToken });
            });
          });
          metaReq.on('error', reject);
          metaReq.write(JSON.stringify({
            cacheControl: 'public, max-age=60, must-revalidate',
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
  console.log(`Starting upload of ${assets.length} assets for 2000theparty...`);
  const uploadedUrls = {};

  for (const item of assets) {
    console.log(`\nProcessing ${item.storagePath} (${item.file})...`);
    for (const bucket of buckets) {
      try {
        const result = await uploadFileToBucket(bucket, item.storagePath, item.file);
        console.log(`  ✅ [${bucket}] -> ${result.publicUrl}`);
        if (bucket === 'signaid-prod.firebasestorage.app') {
          uploadedUrls[item.storagePath] = result.publicUrl;
        }
      } catch (err) {
        console.warn(`  ⚠️ [${bucket}] error:`, err.message);
      }
    }
  }

  fs.writeFileSync('scripts/uploaded_2000theparty_urls.json', JSON.stringify(uploadedUrls, null, 2));
  console.log('\nSaved URLs to scripts/uploaded_2000theparty_urls.json');
}

main();
