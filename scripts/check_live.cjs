const https = require('https');
https.get('https://signaid.eu/2000theparty', (res) => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    const urls = data.match(/https?:\/\/[^\s"'<>]+\.(?:png|jpg|webp)[^\s"'<>]*/gi) || [];
    console.log('Found URLs:', [...new Set(urls)]);
  });
});
