const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3847;
const OUTPUT_JSON = path.join(__dirname, '..', 'facebook_prospects_invites.json');
const OUTPUT_CSV = path.join(__dirname, '..', 'prospect_links_facebook.csv');
const MASTER_CSV = path.join(__dirname, '..', 'prospect_links.csv');

/**
 * Generate a clean audit slug from business name
 */
function generateAuditKey(name) {
  const clean = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 15);
  const randomSuffix = Math.random().toString(36).substring(2, 6);
  return `audit-${clean || 'prospect'}-${randomSuffix}`;
}

/**
 * Categorize and estimate textile needs based on business name and category
 */
function detectTextileNeeds(name, category = '') {
  const text = `${name} ${category}`.toLowerCase();
  
  if (/(toiture|couverture|zinguerie|charpente|ardois)/.test(text)) {
    return { sector: 'Toitures & Rénovation', needs: 'Hoodies chauds, T-shirts de chantier, Polos' };
  }
  if (/(construct|macon|renov|batiment|chassis|facade|terrassement|demolition)/.test(text)) {
    return { sector: 'BTP & Construction Générale', needs: 'T-shirts haute résistance, Polos pro, Softshells brodés' };
  }
  if (/(plomb|chauff|sanit|electr|clim|chauffage)/.test(text)) {
    return { sector: 'Électricité & Sanitaire / Chauffage', needs: 'Polos floqués, Vestes de travail, Sweatshirts' };
  }
  if (/(peint|decor|carrel|parquet|menuiserie|bois)/.test(text)) {
    return { sector: 'Finitions & Menuiserie', needs: 'T-shirts 100% coton logo poitrine + dos, Pantalons/Tabliers' };
  }
  if (/(jardin|paysag|espace vert|piscine|elag)/.test(text)) {
    return { sector: 'Parcs & Jardins / Paysagiste', needs: 'T-shirts respirants, Polos verts/noirs, Casquettes brodées' };
  }
  if (/(auto|carrosserie|garage|mecan|detailing|lavage|depannage)/.test(text)) {
    return { sector: 'Automobile & Detailing', needs: 'T-shirts noirs anti-tâches, Polos, Casquettes' };
  }
  if (/(restaurant|resto|snack|brasserie|bistrot|pizza|burger|traiteur|bar|cafe)/.test(text)) {
    return { sector: 'Horeca & Restauration', needs: 'Polos service brodés, Tabliers de cuisine, T-shirts équipe' };
  }
  if (/(coiff|barber|barbier|esthet|beaute|ongle|spa|tattoo|tatouage)/.test(text)) {
    return { sector: 'Beauté & Salons / Barber', needs: 'T-shirts coupe stylée noir mat, Tabliers personnalisés' };
  }
  if (/(fit|coach|sport|boxe|crossfit|club|foot|gym|danse)/.test(text)) {
    return { sector: 'Sport & Coaching / Fitness', needs: 'T-shirts techniques respirants, Sweats zippés, Casquettes' };
  }
  if (/(securit|gardien|protection)/.test(text)) {
    return { sector: 'Sécurité & Gardiennage', needs: 'Polos noirs brodés, Vestes Softshell badge' };
  }
  if (/(event|evenement|dj|fest|musique|photo|prod)/.test(text)) {
    return { sector: 'Événementiel & Audiovisuel', needs: 'Hoodies oversize, T-shirts crew dos XL, Bonnets/Casquettes' };
  }
  
  return { sector: category || 'Commerce & Service Indépendant', needs: 'T-shirts promotionnels, Polos corporate brodés' };
}

/**
 * Save prospects to JSON and CSV files
 */
function saveProspects(prospects) {
  console.log(`\n📦 Réception de ${prospects.length} prospects Facebook...`);

  // Enrich data
  const enriched = prospects.map(p => {
    const { sector, needs } = detectTextileNeeds(p.name, p.category);
    return {
      name: p.name.trim(),
      auditKey: generateAuditKey(p.name),
      facebookUrl: p.url,
      category: p.category || sector,
      sector: sector,
      inviter: p.inviter || 'Invitation directe',
      logoUrl: p.logoUrl || '',
      textileNeeds: needs,
      dateScraped: new Date().toISOString()
    };
  });

  // 1. Write JSON
  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(enriched, null, 2), 'utf-8');
  console.log(`✅ Fichier JSON enregistré : ${OUTPUT_JSON}`);

  // 2. Write specific Facebook CSV (with Excel UTF-8 BOM)
  const csvRows = [
    ['Nom Entreprise', 'Cle Audit', 'Lien Facebook', 'Secteur d\'activite', 'Nom Inviteur', 'Besoins Textiles', 'Logo URL']
  ];

  for (const item of enriched) {
    csvRows.push([
      `"${item.name.replace(/"/g, '""')}"`,
      `"${item.auditKey}"`,
      `"${item.facebookUrl}"`,
      `"${item.sector.replace(/"/g, '""')}"`,
      `"${item.inviter.replace(/"/g, '""')}"`,
      `"${item.textileNeeds.replace(/"/g, '""')}"`,
      `"${item.logoUrl}"`
    ]);
  }

  const csvContent = '\uFEFF' + csvRows.map(r => r.join(',')).join('\n');
  fs.writeFileSync(OUTPUT_CSV, csvContent, 'utf-8');
  console.log(`✅ Fichier CSV enregistré : ${OUTPUT_CSV}`);

  // 3. Optionally append new prospects to master prospect_links.csv
  let appendedCount = 0;
  if (fs.existsSync(MASTER_CSV)) {
    let masterContent = fs.readFileSync(MASTER_CSV, 'utf-8');
    for (const item of enriched) {
      if (!masterContent.includes(item.name)) {
        const dummyVitrine = `https://signaid.eu/profil?slug=${item.auditKey}&showcase=true`;
        const newRow = `\n"${item.name.replace(/"/g, '""')}","${item.auditKey}","${dummyVitrine}","${item.sector.replace(/"/g, '""')}"`;
        masterContent += newRow;
        appendedCount++;
      }
    }
    fs.writeFileSync(MASTER_CSV, masterContent, 'utf-8');
    console.log(`✅ ${appendedCount} nouveaux prospects ajoutés au fichier principal prospect_links.csv`);
  }

  return { count: enriched.length, appended: appendedCount };
}

// HTTP Server to receive prospects directly from the browser
const server = http.createServer((req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.method === 'POST' && req.url === '/api/prospects') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        let data = JSON.parse(body);
        let list = [];
        if (Array.isArray(data)) {
          list = data;
        } else if (data.prospects && Array.isArray(data.prospects)) {
          list = data.prospects;
        } else if (typeof data === 'object' && data !== null) {
          list = [data];
        }
        const result = saveProspects(list);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, ...result }));
      } catch (err) {
        console.error('Erreur traitement données:', err);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  if (req.method === 'POST' && req.url === '/api/create-profile') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const { url } = JSON.parse(body);
        if (!url) throw new Error("URL requise");
        const { createProspectFromFacebook } = require('./create_prospect_from_fb.cjs');
        const resData = await createProspectFromFacebook(url);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(resData));
      } catch (err) {
        console.error('Erreur create-profile:', err.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', time: new Date().toISOString() }));
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
});

server.listen(PORT, () => {
  console.log(`================================================================`);
  console.log(`🚀 SERVEUR DE SYNCHRONISATION SIGNAID ACTIF`);
  console.log(`👉 Écoute sur http://localhost:${PORT}`);
  console.log(`👉 Prêt à recevoir les prospects Facebook scrapés depuis le navigateur`);
  console.log(`================================================================`);
});
