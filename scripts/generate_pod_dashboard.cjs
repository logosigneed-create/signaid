const fs = require('fs');
const path = require('path');

const JSON_FILE = path.join(__dirname, '..', 'facebook_prospects_invites.json');
const HTML_FILE = path.join(__dirname, '..', 'prospects_viewer.html');

const prospects = JSON.parse(fs.readFileSync(JSON_FILE, 'utf-8'));

const htmlContent = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Signaid • Pipeline Automatisé Merchandising & POD (${prospects.length} Prospects)</title>
  <style>
    :root {
      --bg: #090e1a;
      --card-bg: #121c2d;
      --border: #1e2f47;
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --primary: #2563eb;
      --primary-hover: #1d4ed8;
      --success: #10b981;
      --accent: #f59e0b;
      --star: #ec4899;
      --event: #a855f7;
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
      color: #38bdf8;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .title-area p {
      color: var(--text-muted);
      font-size: 14px;
      margin-top: 4px;
    }
    .badge-count {
      background: var(--star);
      color: white;
      font-size: 13px;
      font-weight: bold;
      padding: 4px 12px;
      border-radius: 20px;
    }
    .generator-box {
      max-width: 1400px;
      margin: 0 auto 20px;
      background: linear-gradient(135deg, #1e293b, #0f172a);
      border: 1px solid #3b82f6;
      border-radius: 12px;
      padding: 16px 20px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.4);
    }
    .generator-title {
      font-size: 14px;
      font-weight: 700;
      color: #60a5fa;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .generator-form {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }
    .generator-input {
      flex: 1;
      min-width: 320px;
      background: #090e1a;
      border: 1px solid #334155;
      color: white;
      padding: 10px 16px;
      border-radius: 8px;
      font-size: 14px;
      outline: none;
    }
    .generator-input:focus { border-color: #38bdf8; }
    .generator-btn {
      background: #2563eb;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: background 0.15s ease;
    }
    .generator-btn:hover { background: #1d4ed8; }
    .generator-result {
      font-size: 13px;
      padding: 8px 12px;
      background: #064e3b;
      color: #a7f3d0;
      border-radius: 6px;
      border: 1px solid #059669;
      display: none;
    }
    .filters {
      max-width: 1400px;
      margin: 0 auto 16px;
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    .filter-btn {
      background: var(--card-bg);
      border: 1px solid var(--border);
      color: var(--text-muted);
      padding: 7px 14px;
      border-radius: 20px;
      font-size: 13px;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.2s ease;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .filter-btn:hover {
      border-color: #38bdf8;
      color: white;
    }
    .filter-btn.active {
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
      grid-template-columns: repeat(auto-fill, minmax(330px, 1fr));
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
      border-color: #38bdf8;
    }
    .card.profile-created {
      border-color: #059669;
      background: linear-gradient(180deg, #121c2d, #06281e);
    }
    .card-head {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 12px;
    }
    .avatar {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: #1e293b;
      object-fit: cover;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      color: #94a3b8;
      border: 1px solid var(--border);
      flex-shrink: 0;
    }
    .name-area {
      overflow: hidden;
      flex: 1;
    }
    .name-area h3 {
      font-size: 15px;
      font-weight: 700;
      color: #fff;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .tier-badge {
      display: inline-block;
      font-size: 11px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 10px;
      margin-top: 4px;
    }
    .pitch-box {
      background: rgba(15, 23, 42, 0.7);
      border: 1px solid #1e293b;
      border-radius: 8px;
      padding: 10px;
      margin-bottom: 12px;
    }
    .pitch-title {
      font-size: 11px;
      color: #94a3b8;
      text-transform: uppercase;
      font-weight: 700;
      margin-bottom: 4px;
      display: flex;
      justify-content: space-between;
    }
    .pitch-text {
      font-size: 12px;
      color: #fde047;
      line-height: 1.4;
    }
    .card-actions {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }
    .btn {
      text-align: center;
      text-decoration: none;
      padding: 9px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      cursor: pointer;
      border: none;
      transition: all 0.15s ease;
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
    .btn-create-profile {
      grid-column: 1 / -1;
      background: #7c3aed;
      color: white;
      font-weight: 700;
      margin-top: 4px;
    }
    .btn-create-profile:hover { background: #6d28d9; }
    .btn-showcase {
      grid-column: 1 / -1;
      background: #10b981;
      color: #064e3b;
      font-weight: 800;
      margin-top: 4px;
    }
    .btn-showcase:hover { background: #34d399; }
    .btn-copy-pitch {
      grid-column: 1 / -1;
      background: #1e293b;
      color: #cbd5e1;
      border: 1px solid var(--border);
      padding: 6px 10px;
      font-size: 11px;
      margin-top: 2px;
    }
    .btn-copy-pitch:hover {
      background: #334155;
      color: white;
    }
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
      <h1>🎯 Signaid • Pipeline Automatisé Merchandising & POD <span class="badge-count" id="countDisplay">${prospects.length}</span></h1>
      <p>Extraction automatique du logo, création du profil Signaid et génération de la vitrine en 1 clic</p>
    </div>
  </div>

  <div class="generator-box">
    <div class="generator-title">
      <span>⚡ Ingestion Instantanée : Créer un profil & récupérer le logo depuis n'importe quelle URL Facebook</span>
    </div>
    <div class="generator-form">
      <input type="text" id="manualFbUrl" class="generator-input" placeholder="Collez l'URL de la page Facebook (ex: https://www.facebook.com/profile.php?id=61566467420783#)..." value="https://www.facebook.com/profile.php?id=61566467420783#">
      <button class="generator-btn" id="generateBtn" onclick="generateFromInput()">🚀 Créer Profil Signaid</button>
    </div>
    <div class="generator-result" id="generatorResult"></div>
  </div>

  <div class="search-bar">
    <input type="text" id="search" class="search-input" placeholder="🔍 Rechercher par nom, mot-clé (ex: DJ, Festival, Toitures, Boxe, Tattoo)...">
  </div>

  <div class="filters" id="filters">
    <button class="filter-btn active" data-cat="all">⭐ Tous (${prospects.length})</button>
    <button class="filter-btn" data-cat="POD_STAR">🎧 Musique, DJs & Labels (580)</button>
    <button class="filter-btn" data-cat="POD_EVENT">🎉 Festivals & Soirées (45)</button>
    <button class="filter-btn" data-cat="POD_SPORT">🥊 Clubs Sportifs (52)</button>
    <button class="filter-btn" data-cat="POD_CREATOR">🎨 Artistes & Tatoueurs (54)</button>
    <button class="filter-btn" data-cat="B2B_WORKWEAR">🏗️ BTP & Travaux (20)</button>
    <button class="filter-btn" data-cat="B2B_AUTO">🚗 Automobile & Detailing (19)</button>
    <button class="filter-btn" data-cat="HORECA">🍽️ Horeca & Restauration (53)</button>
  </div>

  <div class="grid" id="grid"></div>

  <script>
    const data = ${JSON.stringify(prospects)};
    let activeCategory = 'all';
    let searchQuery = '';

    function render() {
      const grid = document.getElementById('grid');
      let filtered = data.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchQuery) || 
                              p.sector.toLowerCase().includes(searchQuery) ||
                              (p.pitch && p.pitch.toLowerCase().includes(searchQuery));
        if (!matchesSearch) return false;
        if (activeCategory === 'all') return true;
        return p.tier === activeCategory;
      });

      document.getElementById('countDisplay').textContent = filtered.length;

      if (!filtered.length) {
        grid.innerHTML = '<div class="empty-state">Aucun prospect ne correspond à vos filtres.</div>';
        return;
      }

      grid.innerHTML = filtered.map((p, idx) => {
        const imgTag = p.logoUrl 
          ? '<img class="avatar" src="' + p.logoUrl + '" alt="' + escapeHtml(p.name) + '">'
          : '<div class="avatar">🏢</div>';

        const profileActionBtn = p.showcaseUrl || p.isProfileCreated
          ? '<a href="' + (p.showcaseUrl || 'https://signaid.eu/profil?slug=' + p.auditKey + '&showcase=true') + '" target="_blank" class="btn btn-showcase">🛍️ Voir Vitrine Signaid Active ↗</a>'
          : '<button class="btn btn-create-profile" id="btn-create-' + idx + '" onclick="createProfileForCard(' + idx + ', \\'' + escapeJs(p.url) + '\\')">⚡ Récupérer Logo & Créer Profil</button>';

        return \`
          <div class="card \${p.showcaseUrl || p.isProfileCreated ? 'profile-created' : ''}" id="card-\${idx}">
            <div>
              <div class="card-head">
                <div id="avatar-container-\${idx}">\${imgTag}</div>
                <div class="name-area">
                  <h3 title="\${escapeHtml(p.name)}">\${escapeHtml(p.name)}</h3>
                  <span class="tier-badge" style="background:\${p.tagColor}22; color:\${p.tagColor}; border:1px solid \${p.tagColor};">
                    \${p.badge}
                  </span>
                </div>
              </div>
              <div class="pitch-box">
                <div class="pitch-title">
                  <span>💡 Pitch Suggéré Signaid</span>
                </div>
                <div class="pitch-text">
                  "\${escapeHtml(p.pitch)}"
                </div>
              </div>
            </div>
            <div>
              <div class="card-actions">
                <a href="\${p.url}" target="_blank" class="btn btn-page">
                  🔗 Voir la Page
                </a>
                <a href="\${p.messengerUrl}" target="_blank" class="btn btn-msg">
                  💬 Message
                </a>
                \${profileActionBtn}
                <button class="btn btn-copy-pitch" onclick="copyPitch('\${escapeJs(p.name)}', '\${escapeJs(p.pitch)}', '\${p.showcaseUrl || ''}')">
                  📋 Copier le Message + Lien Vitrine
                </button>
              </div>
            </div>
          </div>
        \`;
      }).join('');
    }

    function escapeHtml(str) {
      return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function escapeJs(str) {
      return (str || '').replace(/'/g, "\\\\'").replace(/"/g, '&quot;');
    }

    function copyPitch(name, pitch, showcaseUrl) {
      let fullText = "Salut " + name + " ! " + pitch;
      if (showcaseUrl) {
        fullText += " Regarde l'aperçu de ta boutique de merch personnalisée ici : " + showcaseUrl;
      } else {
        fullText += " Tu as 2 minutes pour voir un aperçu de ta boutique de merch ?";
      }
      navigator.clipboard.writeText(fullText).then(() => {
        alert("📋 Message d'accroche copié ! Vous pouvez directement le coller dans Messenger.");
      });
    }

    async function createProfileForCard(idx, url) {
      const btn = document.getElementById('btn-create-' + idx);
      if (btn) {
        btn.disabled = true;
        btn.textContent = "⏳ Extraction du logo...";
      }

      try {
        const res = await fetch('http://localhost:3847/api/create-profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url })
        });
        const d = await res.json();
        if (d.success) {
          data[idx].logoUrl = d.logoUrl;
          data[idx].showcaseUrl = d.showcaseUrl;
          data[idx].isProfileCreated = true;
          render();
          alert("🎉 Profil créé avec succès pour " + d.pageName + " !\\nVitrine active : " + d.showcaseUrl);
        } else {
          alert("⚠️ Erreur : " + (d.error || "Échec"));
          if (btn) { btn.disabled = false; btn.textContent = "⚡ Récupérer Logo & Créer Profil"; }
        }
      } catch (e) {
        alert("ℹ️ Assurez-vous que le serveur Signaid tourne sur le port 3847.");
        if (btn) { btn.disabled = false; btn.textContent = "⚡ Récupérer Logo & Créer Profil"; }
      }
    }

    async function generateFromInput() {
      const input = document.getElementById('manualFbUrl');
      const url = input.value.trim();
      if (!url) return alert("Veuillez saisir une URL Facebook");

      const btn = document.getElementById('generateBtn');
      const resBox = document.getElementById('generatorResult');
      btn.disabled = true;
      btn.textContent = "⏳ Récupération du logo et création...";

      try {
        const res = await fetch('http://localhost:3847/api/create-profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url })
        });
        const d = await res.json();
        if (d.success) {
          resBox.style.display = 'block';
          resBox.innerHTML = '🎉 <b>' + escapeHtml(d.pageName) + '</b> ajouté avec succès !<br>Logo récupéré • Profil Firestore créé • Vitrine active : <a href="' + d.showcaseUrl + '" target="_blank" style="color:#6ee7b7; font-weight:bold;">' + d.showcaseUrl + ' ↗</a>';
          
          // Add to data array at the beginning
          data.unshift({
            name: d.pageName,
            url: d.canonicalUrl || url,
            auditKey: d.auditKey,
            sector: d.sector,
            logoUrl: d.logoUrl,
            showcaseUrl: d.showcaseUrl,
            isProfileCreated: true,
            score: 95,
            tier: 'POD_STAR',
            badge: '⭐ Cible Star Merch',
            pitch: 'Portail Merch officiel : T-shirts, Hoodies, Casquettes sans gestion de stock.',
            messengerUrl: 'https://www.facebook.com/messages/'
          });
          render();
        } else {
          alert("Erreur : " + (d.error || "Inconnue"));
        }
      } catch (err) {
        alert("Erreur de connexion au serveur local Signaid (port 3847).");
      } finally {
        btn.disabled = false;
        btn.textContent = "🚀 Créer Profil Signaid";
      }
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

fs.writeFileSync(HTML_FILE, htmlContent, 'utf-8');
console.log("✅ Dashboard interactif enrichi avec l'action de création de profil !");
