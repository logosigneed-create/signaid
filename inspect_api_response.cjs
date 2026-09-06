async function main() {
  const url = 'https://getuserbyslug-r5zxdnaotq-uc.a.run.app?slug=fabrizio';
  console.log(`Fetching ${url}...`);
  const res = await fetch(url);
  const data = await res.json();
  console.log("API Response Status:", res.status);
  console.log("API Response Keys:", Object.keys(data));
  console.log("Full API Response Payload:");
  console.log(JSON.stringify(data, null, 2));
}

main().catch(console.error);
