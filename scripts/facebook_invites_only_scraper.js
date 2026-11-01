/**
 * ==============================================================================
 * 🎯 SIGNAID - EXTRACTEUR STRICT : UNIQUEMENT LES INVITATIONS DE PAGES
 * ==============================================================================
 * Ce script filtre rigoureusement et IGNORE tous les commentaires, likes, reels,
 * nouveaux abonnés ou groupes. Il ne conserve QUE les invitations à aimer des pages.
 * ==============================================================================
 */

(function() {
  if (window.__SIGNAID_INVITES_ONLY_ACTIVE__) {
    alert("Extracteur déjà actif sur cette page !");
    return;
  }
  window.__SIGNAID_INVITES_ONLY_ACTIVE__ = true;

  const collectedPages = new Map();
  let ignoredCount = 0;
  let isScrolling = true;
  let idleCount = 0;
  const SCROLL_STEP = 900;
  const SCROLL_INTERVAL = 1500;

  // Détection des besoins textiles Signaid
  function detectTextileNeeds(name, category = '') {
    const t = `${name} ${category}`.toLowerCase();
    if (/(toiture|couverture|zinguerie|charpente|ardois)/.test(t)) {
      return { s: 'Toitures & Rénovation', n: 'Hoodies chauds, T-shirts chantier, Polos' };
    }
    if (/(construct|macon|renov|batiment|chassis|terrassement|demolition|facade)/.test(t)) {
      return { s: 'BTP & Construction', n: 'T-shirts haute résistance, Polos pro, Softshells brodés' };
    }
    if (/(plomb|chauff|sanit|electr|clim|chauffage)/.test(t)) {
      return { s: 'Électricité & Chauffage / Sanitaire', n: 'Polos floqués, Vestes de travail, Sweats' };
    }
    if (/(peint|decor|carrel|menuiserie|bois)/.test(t)) {
      return { s: 'Finitions & Menuiserie', n: 'T-shirts coton dos XL, Tabliers de travail' };
    }
    if (/(jardin|paysag|piscine|espace vert|elag)/.test(t)) {
      return { s: 'Parcs & Jardins', n: 'T-shirts respirants, Polos verts/noirs, Casquettes' };
    }
    if (/(auto|garage|mecan|detailing|lavage|depannage|carrosserie)/.test(t)) {
      return { s: 'Automobile & Detailing', n: 'T-shirts noirs anti-tâches, Polos, Casquettes' };
    }
    if (/(resto|restaurant|snack|pizza|burger|traiteur|cafe|bar|bistrot)/.test(t)) {
      return { s: 'Horeca & Restauration', n: 'Polos service brodés, Tabliers de cuisine, T-shirts équipe' };
    }
    if (/(coiff|barber|esthet|ongle|spa|tattoo|tatouage|beaute)/.test(t)) {
      return { s: 'Beauté & Salons / Barber', n: 'T-shirts coupe stylée noir mat, Tabliers personnalisés' };
    }
    if (/(fit|coach|sport|boxe|gym|club|foot|crossfit)/.test(t)) {
      return { s: 'Sport & Fitness / Coaching', n: 'T-shirts techniques respirants, Sweats zippés, Casquettes' };
    }
    if (/(event|evenement|dj|fest|musique|photo|prod)/.test(t)) {
      return { s: 'Événementiel & Audiovisuel', n: 'Hoodies oversize, T-shirts crew dos XL, Bonnets' };
    }
    return { s: category || 'Commerce & Artisanat Indépendant', n: 'T-shirts promotionnels, Polos brodés' };
  }

  // Filtrage strict : retourne les infos UNIQUEMENT si c'est une invitation de page
  function parsePageInviteNotification(rawText) {
    if (!rawText) return null;
    const clean = rawText.replace(/\s+/g, ' ').trim();

    // Rejeter immédiatement les commentaires, reels, abonnés, groupes
    if (/a commenté|aime votre reel|a réagi|a commencé à vous suivre|vous suit à présent|a publié dans|a partagé|nouvelle publication/i.test(clean)) {
      return null;
    }

    // Motif strict français : "X vous a invité(e) à aimer la Page Y"
    const patternFR = /(?:Non lu\s+)?(.*?)\s+vous\s+a\s+(?:envoyé\s+une\s+invitation\s+[àa]\s+aimer|invit[ée\(\)]*\s+[àa]\s+aimer)\s+(?:la\s+[Pp]age\s+|une\s+[Pp]age\s*:\s*)?(.*?)(?:[\.·]|\s+il\s+y\s+a|\s*$)/i;
    // Motif anglais
    const patternEN = /(?:Unread\s+)?(.*?)\s+invited\s+you\s+to\s+like\s+(?:the\s+[Pp]age\s+)?(.*?)(?:[\.·]|\s*$)/i;

    const match = clean.match(patternFR) || clean.match(patternEN);
    if (match && match[2]) {
      let pageName = match[2].trim();
      let inviter = match[1].trim();
      // Nettoyer pageName
      pageName = pageName.replace(/^["'«\s]+|["'»\.\,\s]+$/g, '');
      if (pageName.length > 1 && !pageName.toLowerCase().startsWith('non lu')) {
        return { pageName, inviter };
      }
    }

    return null;
  }

  // Création du widget visuel flottant
  const hud = document.createElement('div');
  hud.id = 'signaid-invites-hud';
  hud.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    width: 360px;
    background: #0f172a;
    color: #f8fafc;
    padding: 16px;
    border-radius: 12px;
    box-shadow: 0 20px 30px rgba(0,0,0,0.6);
    z-index: 9999999;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 13px;
    border: 1px solid #334155;
  `;

  hud.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; border-bottom:1px solid #334155; padding-bottom:8px;">
      <span style="font-weight:bold; color:#38bdf8; font-size:15px;">🎯 Signaid • Invitations Pages Uniquement</span>
      <span id="s-close" style="cursor:pointer; color:#94a3b8; font-size:16px;">✕</span>
    </div>

    <div style="margin-bottom:10px;">
      <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
        <span style="color:#94a3b8;">Invitations de pages trouvées :</span>
        <strong id="s-count" style="color:#4ade80; font-size:18px;">0</strong>
      </div>
      <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
        <span style="color:#64748b; font-size:11px;">Autres notifications ignorées :</span>
        <span id="s-ignored" style="color:#94a3b8; font-size:11px;">0</span>
      </div>
      <div id="s-status" style="color:#fde047; font-size:11px;">Recherche et défilement en cours...</div>
    </div>

    <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
      <button id="s-csv" style="background:#16a34a; color:white; border:none; padding:10px; border-radius:6px; cursor:pointer; font-weight:bold;">📥 Télécharger CSV</button>
      <button id="s-sync" style="background:#2563eb; color:white; border:none; padding:10px; border-radius:6px; cursor:pointer; font-weight:bold;">🚀 Vers Signaid</button>
    </div>
  `;

  document.body.appendChild(hud);

  const countEl = document.getElementById('s-count');
  const ignoredEl = document.getElementById('s-ignored');
  const statusEl = document.getElementById('s-status');

  document.getElementById('s-close').onclick = () => {
    isScrolling = false;
    hud.remove();
    window.__SIGNAID_INVITES_ONLY_ACTIVE__ = false;
  };

  function scanNotifications() {
    let newFound = 0;
    // Sélectionner tous les conteneurs de notification
    const items = document.querySelectorAll('div[role="listitem"], div[data-visualcompletion="ignore-dynamic-hydration"], a[role="link"]');

    items.forEach(el => {
      const text = el.innerText || '';
      if (!text || text.length < 5) return;

      const parsed = parsePageInviteNotification(text);
      if (parsed) {
        // C'est une invitation de page valide !
        const link = el.querySelector('a[href]') || (el.tagName === 'A' ? el : null);
        let href = link ? link.href : '';
        if (href) href = href.split('?')[0];

        const key = href || parsed.pageName.toLowerCase();
        if (!collectedPages.has(key)) {
          const img = el.querySelector('img[src*="scontent"], img[src*="fbcdn"], img');
          const textile = detectTextileNeeds(parsed.pageName);
          const slug = parsed.pageName.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 15);

          collectedPages.set(key, {
            name: parsed.pageName,
            inviter: parsed.inviter,
            url: href || `https://www.facebook.com/search/pages/?q=${encodeURIComponent(parsed.pageName)}`,
            sector: textile.s,
            needs: textile.n,
            logoUrl: img ? img.src : '',
            auditKey: `audit-${slug}-${Math.random().toString(36).substring(2, 6)}`
          });
          newFound++;
          console.log(`🎯 Invitation Page trouvée : [${parsed.pageName}] (invité par ${parsed.inviter})`);
        }
      } else if (/a commenté|aime votre reel|a réagi|suit à présent|a publié/i.test(text)) {
        ignoredCount++;
      }
    });

    countEl.textContent = collectedPages.size;
    ignoredEl.textContent = ignoredCount;
    return newFound;
  }

  function loop() {
    if (!isScrolling) return;

    const n = scanNotifications();
    window.scrollBy({ top: SCROLL_STEP, behavior: 'smooth' });

    if (n === 0) {
      idleCount++;
      if (idleCount >= 10) {
        statusEl.textContent = `✅ Scan terminé ! ${collectedPages.size} invitations de pages extraites.`;
        statusEl.style.color = '#4ade80';
        isScrolling = false;
        return;
      }
    } else {
      idleCount = 0;
      statusEl.textContent = `Extraction... (${collectedPages.size} invitations de pages trouvées)`;
    }

    setTimeout(loop, SCROLL_INTERVAL);
  }

  setTimeout(loop, 600);

  // Export CSV
  document.getElementById('s-csv').onclick = () => {
    const list = Array.from(collectedPages.values());
    if (!list.length) {
      alert("Aucune invitation à aimer une page n'a été trouvée pour l'instant.\nLaissez le défilement se poursuivre vers le bas !");
      return;
    }

    let csv = '\uFEFFNom Entreprise,Cle Audit,Lien Facebook,Secteur d\'activite,Nom Inviteur,Besoins Textiles,Logo URL\n';
    list.forEach(p => {
      csv += `"${p.name.replace(/"/g, '""')}","${p.auditKey}","${p.url}","${p.sector}","${p.inviter}","${p.needs}","${p.logoUrl}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `facebook_invitations_pages_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    console.log(`📥 Fichier CSV généré avec ${list.length} vraies pages d'entreprises !`);
  };

  // Sync Signaid
  document.getElementById('s-sync').onclick = async () => {
    const list = Array.from(collectedPages.values());
    if (!list.length) {
      alert("Aucune invitation de page à synchroniser !");
      return;
    }

    try {
      const res = await fetch('http://localhost:3847/api/prospects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(list)
      });
      const d = await res.json();
      alert(`🎉 ${d.count} nouvelles pages de prospects synchronisées dans Signaid !`);
    } catch (e) {
      alert("Sauvegarde locale en CSV déclenchée !");
      document.getElementById('s-csv').click();
    }
  };
})();
