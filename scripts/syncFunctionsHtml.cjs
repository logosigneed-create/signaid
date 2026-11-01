const fs = require('fs');
const path = require('path');

const srcHtml = path.resolve(__dirname, '../dist/index.html');
const destHtml = path.resolve(__dirname, '../functions/index.html');

if (fs.existsSync(srcHtml)) {
  fs.copyFileSync(srcHtml, destHtml);
  console.log('✅ [Predeploy] Synchronisé dist/index.html -> functions/index.html');
} else {
  console.warn('⚠️ [Predeploy] dist/index.html introuvable, synchronisation ignorée');
}
