const fs = require('fs');
const path = require('path');

const CSV_INPUT = path.join(process.env.USERPROFILE, 'Downloads', 'facebook_prospects_invites (1).csv');
const PROJECT_CSV = path.join(__dirname, '..', 'facebook_prospects_invites.csv');
const PROJECT_JSON = path.join(__dirname, '..', 'facebook_prospects_invites.json');
const HTML_VIEWER = path.join(__dirname, '..', 'prospects_viewer.html');

if (!fs.existsSync(CSV_INPUT)) {
  console.error("Fichier CSV introuvable dans Téléchargements :", CSV_INPUT);
  process.exit(1);
}

// Copy to project
fs.copyFileSync(CSV_INPUT, PROJECT_CSV);
console.log("✅ CSV copié dans le projet :", PROJECT_CSV);

// Parse CSV
const rawContent = fs.readFileSync(PROJECT_CSV, 'utf-8');
const lines = rawContent.split(/\r?\n/).filter(Boolean);

console.log(`📊 Lignes détectées : ${lines.length}`);

// Category refinement
function refineCategory(name, cat = '') {
  const text = `${name} ${cat}`.toLowerCase();
  if (/(toiture|couverture|zinguerie|charpente|ardois)/.test(text)) return { s: 'Toitures & Rénovation', n: 'Hoodies chauds, T-shirts chantier, Polos' };
  if (/(construct|macon|renov|batiment|chassis|terrassement|demolition|facade|plafond|menuiserie|bois)/.test(text)) return { s: 'BTP & Construction', n: 'T-shirts haute résistance, Polos pro, Softshells' };
  if (/(plomb|chauff|sanit|electr|clim|chauffage)/.test(text)) return { s: 'Électricité & Chauffage / Sanitaire', n: 'Polos floqués, Vestes travail, Sweats' };
  if (/(auto|garage|mecan|detailing|lavage|depannage|carrosserie|pneu)/.test(text)) return { s: 'Automobile & Detailing', n: 'T-shirts noirs anti-tâches, Polos, Casquettes' };
  if (/(resto|restaurant|snack|pizza|burger|traiteur|cafe|bar|bistrot|friterie|frituur|boucherie)/.test(text)) return { s: 'Horeca & Restauration', n: 'Polos service brodés, Tabliers de cuisine, T-shirts équipe' };
  if (/(coiff|barber|esthet|ongle|spa|tattoo|tatouage|beaute|lashes|tanning|pedicure)/.test(text)) return { s: 'Beauté & Coiffure / Barber', n: 'T-shirts coupe stylée noir mat, Tabliers' };
  if (/(fit|coach|sport|boxe|gym|club|foot|crossfit|equigala|rally)/.test(text)) return { s: 'Sport & Fitness / Clubs', n: 'T-shirts techniques respirants, Sweats zippés, Casquettes' };
  if (/(jardin|paysag|piscine|espace vert|elag|tuin)/.test(text)) return { s: 'Parcs & Jardins / Paysagiste', n: 'T-shirts respirants, Polos pro, Casquettes' };
  if (/(dj|musique|music|records|event|evenement|festival|fest|sono|audio|party|light|disco|band)/.test(text)) return { s: 'Événementiel, Musique & DJ', n: 'Hoodies oversize, T-shirts crew dos XL, Bonnets' };
  if (/(immo|immobili|estate)/.test(text)) return { s: 'Immobilier & Services', n: 'Polos corpo brodés, Chemises' };
  return { s: 'Commerce & Artisanat', n: 'T-shirts promotionnels, Polos brodés' };
}

const prospects = [];
const seenUrls = new Set();

// Skip header
for (let i = 1; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;

  // CSV regex parser matching quoted values
  const regex = /(".*?"|[^",]+)(?=\s*,|\s*$)/g;
  const matches = line.match(regex);
  if (!matches || matches.length < 3) continue;

  const cleanMatches = matches.map(m => m.replace(/^"|"$/g, '').replace(/""/g, '"').trim());
  const name = cleanMatches[0];
  const auditKey = cleanMatches[1] || '';
  const url = cleanMatches[2] || '';
  const initialCategory = cleanMatches[3] || '';
  const initialNeeds = cleanMatches[4] || '';
  const logoUrl = cleanMatches[5] || '';

  // Exclude system pages
  if (['Meta Business Suite', 'Messagerie', 'Statistiques'].includes(name)) continue;
  if (!url || seenUrls.has(url)) continue;
  seenUrls.add(url);

  const refined = refineCategory(name, initialCategory);

  // Generate messenger URL
  let messengerUrl = 'https://www.facebook.com/messages/';
  const slugMatch = url.match(/facebook\.com\/([^\/\?]+)/);
  if (slugMatch && !slugMatch[1].startsWith('search')) {
    messengerUrl = `https://www.facebook.com/messages/t/${slugMatch[1]}`;
  }

  prospects.push({
    name,
    auditKey,
    url,
    sector: refined.s,
    needs: refined.n,
    logoUrl,
    messengerUrl
  });
}

console.log(`🎯 Total prospects uniques qualifiés : ${prospects.length}`);

// Write JSON
fs.writeFileSync(PROJECT_JSON, JSON.stringify(prospects, null, 2), 'utf-8');
console.log("✅ JSON enregistré :", PROJECT_JSON);

// Generate standalone HTML viewer with embedded JSON
const htmlContent = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Signaid • Dashboard Prospects Facebook (${prospects.length} Entreprises)</title>
  <style>
    :root {
      --bg: #0b1329;
      --card-bg: #152238;
      --border: #24344d;
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --primary: #2563eb;
      --primary-hover: #1d4ed8;
      --success: #10b981;
      --accent: #f59e0b;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      padding: 24px;
      line-height: 1.5;
    }
    .header {
      max-width: 1400px;
      margin: 0 auto 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
    }
    .title-area h1 {
      font-size: 26px;
      font-weight: 800;
      color: #60a5fa;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .title-area p {
      color: var(--text-muted);
      font-size: 14px;
    }
    .badge-count {
      background: #059669;
      color: white;
      font-size: 14px;
      font-weight: bold;
      padding: 4px 12px;
      border-radius: 20px;
    }
    .filters {
      max-width: 1400px;
      margin: 0 auto 20px;
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    .filter-btn {
      background: var(--card-bg);
      border: 1px solid var(--border);
      color: var(--text-muted);
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 13px;
      cursor: pointer;
      font-weight: 500;
      transition: all 0.2s ease;
    }
    .filter-btn:hover, .filter-btn.active {
      background: var(--primary);
      color: white;
      border-color: var(--primary);
    }
    .search-bar {
      max-width: 1400px;
      margin: 0 auto 20px;
      display: flex;
      gap: 12px;
    }
    .search-input {
      flex: 1;
      background: var(--card-bg);
      border: 1px solid var(--border);
      color: var(--text);
      padding: 12px 18px;
      border-radius: 10px;
      font-size: 15px;
      outline: none;
    }
    .search-input:focus { border-color: var(--primary); }
    .grid {
      max-width: 1400px;
      margin: 0 auto;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 16px;
    }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      transition: transform 0.15s ease, border-color 0.15s ease;
    }
    .card:hover {
      transform: translateY(-2px);
      border-color: #3b82f6;
    }
    .card-head {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
    }
    .avatar {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: #1e293b;
      object-fit: cover;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      color: #94a3b8;
      border: 1px solid var(--border);
      flex-shrink: 0;
    }
    .name-area {
      overflow: hidden;
    }
    .name-area h3 {
      font-size: 15px;
      font-weight: 700;
      color: #fff;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .sector-tag {
      font-size: 11px;
      color: #38bdf8;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .needs-box {
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid #1e293b;
      border-radius: 6px;
      padding: 8px 10px;
      font-size: 12px;
      color: #fbbf24;
      margin-bottom: 12px;
    }
    .card-actions {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }
    .btn {
      text-align: center;
      text-decoration: none;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: background 0.15s ease;
    }
    .btn-page {
      background: #2563eb;
      color: white;
    }
    .btn-page:hover { background: #1d4ed8; }
    .btn-msg {
      background: #059669;
      color: white;
    }
    .btn-msg:hover { background: #047857; }
    .empty-state {
      grid-column: 1 / -1;
      text-align: center;
      padding: 60px;
      color: var(--text-muted);
    }
  </style>
</head>
<body>

  <div class="header">
    <div class="title-area">
      <h1>👕 Signaid • Prospects Invitations Facebook <span class="badge-count" id="countDisplay">${prospects.length}</span></h1>
      <p>Accès direct 1-clic aux Pages Facebook et Messagerie pour proposer vos vêtements floqués</p>
    </div>
  </div>

  <div class="search-bar">
    <input type="text" id="search" class="search-input" placeholder="🔍 Rechercher une entreprise, un artisan, une ville...">
  </div>

  <div class="filters" id="filters">
    <button class="filter-btn active" data-cat="all">Tous (${prospects.length})</button>
    <button class="filter-btn" data-cat="BTP">🏗️ BTP & Toitures</button>
    <button class="filter-btn" data-cat="Automobile">🚗 Automobile & Detailing</button>
    <button class="filter-btn" data-cat="Horeca">🍽️ Restauration & Horeca</button>
    <button class="filter-btn" data-cat="Beauté">✂️ Beauté & Salons</button>
    <button class="filter-btn" data-cat="Événementiel">🎧 Événementiel & DJ</button>
    <button class="filter-btn" data-cat="Sport">🥊 Sport & Fitness</button>
    <button class="filter-btn" data-cat="Parcs">🌿 Parcs & Jardins</button>
  </div>

  <div class="grid" id="grid"></div>

  <script>
    const data = ${JSON.stringify(prospects)};
    let activeCategory = 'all';
    let searchQuery = '';

    function render() {
      const grid = document.getElementById('grid');
      let filtered = data.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchQuery) || p.sector.toLowerCase().includes(searchQuery);
        if (!matchesSearch) return false;
        if (activeCategory === 'all') return true;
        if (activeCategory === 'BTP') return /BTP|Toiture/i.test(p.sector);
        if (activeCategory === 'Automobile') return /Automobile/i.test(p.sector);
        if (activeCategory === 'Horeca') return /Horeca|Restauration/i.test(p.sector);
        if (activeCategory === 'Beauté') return /Beauté|Coiffure/i.test(p.sector);
        if (activeCategory === 'Événementiel') return /Événementiel|Musique|DJ/i.test(p.sector);
        if (activeCategory === 'Sport') return /Sport|Fitness/i.test(p.sector);
        if (activeCategory === 'Parcs') return /Parcs|Jardins/i.test(p.sector);
        return true;
      });

      document.getElementById('countDisplay').textContent = filtered.length;

      if (!filtered.length) {
        grid.innerHTML = '<div class="empty-state">Aucun prospect ne correspond à vos filtres.</div>';
        return;
      }

      grid.innerHTML = filtered.map(p => {
        const imgTag = p.logoUrl 
          ? '<img class="avatar" src="' + p.logoUrl + '" alt="' + escapeHtml(p.name) + '">'
          : '<div class="avatar">🏢</div>';

        return \`
          <div class="card">
            <div>
              <div class="card-head">
                \${imgTag}
                <div class="name-area">
                  <h3 title="\${escapeHtml(p.name)}">\${escapeHtml(p.name)}</h3>
                  <div class="sector-tag">\${escapeHtml(p.sector)}</div>
                </div>
              </div>
              <div class="needs-box">
                👕 \${escapeHtml(p.needs)}
              </div>
            </div>
            <div class="card-actions">
              <a href="\${p.url}" target="_blank" class="btn btn-page">
                🔗 Ouvrir Page
              </a>
              <a href="\${p.messengerUrl}" target="_blank" class="btn btn-msg">
                💬 Message
              </a>
            </div>
          </div>
        \`;
      }).join('');
    }

    function escapeHtml(str) {
      return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    // Search
    document.getElementById('search').addEventListener('input', (e) => {
      searchQuery = e.target.value.toLowerCase().trim();
      render();
    });

    // Filters
    document.getElementById('filters').addEventListener('click', (e) => {
      if (e.target.classList.contains('filter-btn')) {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        activeCategory = e.target.dataset.cat;
        render();
      }
    });

    render();
  </script>
</body>
</html>`;

fs.writeFileSync(HTML_VIEWER, htmlContent, 'utf-8');
console.log("✅ Dashboard interactif mis à jour :", HTML_VIEWER);
