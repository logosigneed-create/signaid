import https from 'https';

const url = 'https://getuserbyslug-r5zxdnaotq-uc.a.run.app?slug=fabrizio';

console.log('[TEST PAYLOAD] Interrogation de :', url);

https.get(url, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    const sizeInBytes = Buffer.byteLength(data, 'utf8');
    const sizeInKb = (sizeInBytes / 1024).toFixed(2);
    console.log(`[TEST PAYLOAD] Status HTTP : ${res.statusCode}`);
    console.log(`[TEST PAYLOAD] Taille finale : ${sizeInBytes} octets (${sizeInKb} KB)`);
    
    if (sizeInBytes < 40000) {
      console.log('✅ SUCCÈS : Le payload fait MOINS DE 40 KB !');
      process.exit(0);
    } else {
      console.error(`❌ ÉCHEC : Le payload dépasse 40 KB (${sizeInKb} KB) !`);
      process.exit(1);
    }
  });
}).on('error', (err) => {
  console.error('❌ ERREUR HTTP :', err.message);
  process.exit(1);
});
