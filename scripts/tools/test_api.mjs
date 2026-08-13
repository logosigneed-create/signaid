import fs from 'fs';

async function test() {
  const envFile = fs.readFileSync('.env', 'utf8');
  const apiKeyMatch = envFile.match(/VITE_GEMINI_API_KEY=(.*)/);
  const apiKey = apiKeyMatch[1].trim();

  const models = ['gemini-2.5-flash', 'gemini-3.5-flash'];
  const toolFormats = [
    [{ googleSearch: {} }],
    [{ google_search: {} }]
  ];

  for (const m of models) {
    for (const format of toolFormats) {
      console.log(`\nTesting ${m} with tool format:`, JSON.stringify(format));
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            contents: [{ parts: [{ text: "Bonjour" }] }],
            tools: format
          })
        });
        const data = await response.json();
        if (response.ok) {
          console.log(`SUCCESS`);
          return;
        } else {
          console.log(`FAILED:`, data.error?.message);
        }
      } catch (err) {
        console.log(`ERROR:`, err.message);
      }
    }
  }
}
test();
