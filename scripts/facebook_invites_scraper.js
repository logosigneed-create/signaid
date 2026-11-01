/**
 * ==============================================================================
 * 🎯 SIGNAID - EXTRACTEUR DE PROSPECTS FACEBOOK INVITES (Desktop)
 * ==============================================================================
 * Ce script s'exécute directement dans la console de votre navigateur (F12)
 * sur la page : https://www.facebook.com/pages/?category=invites&ref=bookmarks
 * 
 * FONCTIONNALITÉS :
 * 1. Défilement automatique fluide (Auto-Scroll) pour charger toutes les invitations
 * 2. Extraction des Noms d'entreprises, Liens directs, Catégories, Inviteurs et Logos
 * 3. Détection automatique des besoins en vêtements professionnels (T-shirts, Polos, Hoodies)
 * 4. Widget visuel flottant avec compteurs en direct
 * 5. Export 1-Clic en CSV UTF-8 (compatible Excel), JSON, et Envoi direct à Signaid (port 3847)
 * ==============================================================================
 */

(function() {
  // Empêcher l'exécution multiple
  if (window.__SIGNAID_EXTRACTOR_ACTIVE__) {
    alert("⚠️ L'extracteur Signaid est déjà en cours d'exécution sur cette page !");
    return;
  }
  window.__SIGNAID_EXTRACTOR_ACTIVE__ = true;

  console.log("%c🚀 Initialisation du Scraper Signaid...", "background: #2563eb; color: white; font-size: 14px; padding: 4px 8px; border-radius: 4px;");

  const collectedProspects = new Map();
  let isScrolling = true;
  let scrollAttemptsWithoutNew = 0;
  const MAX_IDLE_SCROLLS = 6;
  const SCROLL_INTERVAL_MS = 1400;

  // Détection des besoins textiles en fonction du nom et de la catégorie
  function detectTextileNeeds(name, category = '') {
    const text = `${name} ${category}`.toLowerCase();
    
    if (/(toiture|couverture|zinguerie|charpente|ardois)/.test(text)) {
      return { sector: 'Toitures & Rénovation', needs: 'Hoodies chauds, T-shirts de chantier, Polos' };
    }
    if (/(construct|macon|renov|batiment|chassis|facade|terrassement|demolition)/.test(text)) {
      return { sector: 'BTP & Construction Générale', needs: 'T-shirts haute résistance, Polos pro, Softshells brodés' };
    }
    if (/(plomb|chauff|sanit|electr|clim|chauffage)/.test(text)) {
      return { sector: 'Électricité & Chauffage / Sanitaire', needs: 'Polos floqués, Vestes de travail, Sweatshirts' };
    }
    if (/(peint|decor|carrel|parquet|menuiserie|bois)/.test(text)) {
      return { sector: 'Finitions & Menuiserie', needs: 'T-shirts 100% coton logo poitrine + dos, Tabliers' };
    }
    if (/(jardin|paysag|espace vert|piscine|elag)/.test(text)) {
      return { sector: 'Parcs & Jardins / Paysagiste', needs: 'T-shirts respirants, Polos pro, Casquettes brodées' };
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
    return { sector: category || 'Commerce & Activité Indépendante', needs: 'T-shirts promotionnels, Polos corporate brodés' };
  }

  // Nettoyage de l'URL Facebook
  function cleanFacebookUrl(rawUrl) {
    if (!rawUrl) return '';
    try {
      const u = new URL(rawUrl, window.location.origin);
      // Supprimer les query params inutiles de tracking
      u.searchParams.delete('notif_id');
      u.searchParams.delete('notif_t');
      u.searchParams.delete('ref');
      u.searchParams.delete('ref_notif_type');
      u.searchParams.delete('category');
      u.searchParams.delete('__tn__');
      u.searchParams.delete('__cft__');
      return u.origin + u.pathname;
    } catch (e) {
      return rawUrl.split('?')[0];
    }
  }

  // Création du widget d'interface flottant
  const widget = document.createElement('div');
  widget.id = 'signaid-scraper-hud';
  widget.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    width: 380px;
    background: #111827;
    color: #f3f4f6;
    border: 1px solid #374151;
    border-radius: 12px;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.4);
    z-index: 9999999;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    padding: 16px;
    line-height: 1.4;
    transition: all 0.3s ease;
  `;

  widget.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; border-bottom:1px solid #374151; padding-bottom:8px;">
      <div style="display:flex; align-items:center; gap:8px;">
        <span style="font-size:18px;">👕</span>
        <strong style="font-size:15px; color:#60a5fa;">Signaid Prospector</strong>
      </div>
      <button id="signaid-close-btn" style="background:transparent; border:none; color:#9ca3af; cursor:pointer; font-size:16px;">✕</button>
    </div>
    
    <div style="margin-bottom:12px;">
      <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
        <span style="color:#9ca3af; font-size:13px;">Prospects détectés :</span>
        <strong id="signaid-count" style="font-size:16px; color:#34d399;">0</strong>
      </div>
      <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
        <span style="color:#9ca3af; font-size:12px;">Statut :</span>
        <span id="signaid-status" style="font-size:12px; color:#fbbf24;">Défilement automatique en cours...</span>
      </div>
    </div>

    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px; margin-bottom:8px;">
      <button id="signaid-pause-btn" style="background:#374151; color:white; border:none; padding:8px 12px; border-radius:6px; font-size:12px; cursor:pointer; font-weight:600;">⏸ Pause</button>
      <button id="signaid-sync-btn" style="background:#2563eb; color:white; border:none; padding:8px 12px; border-radius:6px; font-size:12px; cursor:pointer; font-weight:600;">🚀 Vers Signaid</button>
    </div>

    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px;">
      <button id="signaid-csv-btn" style="background:#059669; color:white; border:none; padding:8px 12px; border-radius:6px; font-size:12px; cursor:pointer; font-weight:600;">📥 Télécharger CSV</button>
      <button id="signaid-json-btn" style="background:#4b5563; color:white; border:none; padding:8px 12px; border-radius:6px; font-size:12px; cursor:pointer; font-weight:600;">💾 Export JSON</button>
    </div>

    <div style="margin-top:10px; font-size:11px; color:#6b7280; text-align:center;">
      Cible : Nouveaux commerces, artisans & BTP
    </div>
  `;

  document.body.appendChild(widget);

  const countEl = document.getElementById('signaid-count');
  const statusEl = document.getElementById('signaid-status');
  const pauseBtn = document.getElementById('signaid-pause-btn');
  const syncBtn = document.getElementById('signaid-sync-btn');
  const csvBtn = document.getElementById('signaid-csv-btn');
  const jsonBtn = document.getElementById('signaid-json-btn');
  const closeBtn = document.getElementById('signaid-close-btn');

  closeBtn.onclick = () => {
    isScrolling = false;
    widget.remove();
    window.__SIGNAID_EXTRACTOR_ACTIVE__ = false;
  };

  pauseBtn.onclick = () => {
    isScrolling = !isScrolling;
    pauseBtn.textContent = isScrolling ? "⏸ Pause" : "▶ Reprendre";
    statusEl.textContent = isScrolling ? "Défilement automatique..." : "Scan en pause.";
    statusEl.style.color = isScrolling ? "#fbbf24" : "#9ca3af";
  };

  // Logique d'extraction du DOM Facebook
  function scanVisibleInvites() {
    let initialSize = collectedProspects.size;

    // Stratégie 1 : Trouver tous les boutons d'action d'invitation (Accepter, Refuser, Confirmer, J'aime)
    // et remonter au conteneur de la carte
    const buttons = Array.from(document.querySelectorAll('div[role="button"], button, span[role="button"]'));
    const inviteActionButtons = buttons.filter(b => {
      const txt = (b.innerText || b.getAttribute('aria-label') || '').trim().toLowerCase();
      return txt === 'accepter' || txt === 'confirmer' || txt === "j'aime" || txt === 'suivre' || txt === 'refuser';
    });

    for (const btn of inviteActionButtons) {
      // Remonter de 3 à 8 niveaux pour trouver la carte
      let card = btn;
      for (let i = 0; i < 6; i++) {
        if (!card.parentElement) break;
        card = card.parentElement;
        // Si la carte contient au moins un lien et une image
        const links = card.querySelectorAll('a[href]');
        if (links.length > 0 && links.length <= 5) {
          extractFromCard(card);
          break;
        }
      }
    }

    // Stratégie 2 : Trouver tous les liens pertinents dans la zone principale (role="main")
    const mainContainer = document.querySelector('div[role="main"]') || document.body;
    const links = mainContainer.querySelectorAll('a[href]');

    for (const link of links) {
      const href = link.getAttribute('href') || '';
      // Filtrer les liens non pertinents
      if (
        !href || 
        href.startsWith('#') || 
        href.includes('/messages/') || 
        href.includes('/groups/') || 
        href.includes('/events/') || 
        href.includes('/notifications') || 
        href.includes('/friends/') ||
        href.includes('/settings') ||
        href.includes('/help/') ||
        href.includes('category=invites')
      ) {
        continue;
      }

      // Vérifier le texte du lien
      const linkText = (link.innerText || '').trim();
      if (!linkText || linkText.length < 2 || linkText.length > 70) continue;
      if (['accepter', 'refuser', 'confirmer', 'voir plus', "j'aime", 'suivre', 'invitation'].includes(linkText.toLowerCase())) continue;

      // Remonter au conteneur parent pour trouver le logo et l'inviteur
      const card = link.closest('div[role="listitem"]') || link.closest('div[data-visualcompletion="ignore-dynamic-hydration"]') || link.parentElement?.parentElement?.parentElement;
      if (card) {
        extractFromCard(card, link, linkText);
      }
    }

    const newFound = collectedProspects.size - initialSize;
    countEl.textContent = collectedProspects.size;
    return newFound;
  }

  function extractFromCard(card, primaryLink = null, knownName = '') {
    if (!card) return;

    // 1. Trouver le lien de la page
    let pageLink = primaryLink;
    if (!pageLink) {
      const candidates = Array.from(card.querySelectorAll('a[href]')).filter(a => {
        const h = a.getAttribute('href') || '';
        const txt = (a.innerText || '').trim();
        return !h.includes('/settings') && !h.includes('/help/') && !h.includes('category=invites') && txt.length > 2;
      });
      if (candidates.length > 0) {
        pageLink = candidates[0];
      }
    }

    if (!pageLink) return;

    const rawUrl = pageLink.getAttribute('href') || pageLink.href;
    const cleanUrl = cleanFacebookUrl(rawUrl);
    if (!cleanUrl || cleanUrl === window.location.origin || cleanUrl === window.location.origin + '/') return;

    // 2. Extraire le nom de la page
    let name = knownName || (pageLink.innerText || '').split('\n')[0].trim();
    if (!name || name.length < 2) {
      const heading = card.querySelector('h2, h3, h4, strong, span[dir="auto"]');
      if (heading) name = heading.innerText.trim();
    }
    if (!name || name.length < 2) return;

    // Ignorer les faux positifs
    const lowerName = name.toLowerCase();
    if (lowerName === 'facebook' || lowerName.includes('invitation') || lowerName === 'accueil' || lowerName === 'pages') return;

    // 3. Extraire le texte contextuel pour la catégorie et l'inviteur
    const allCardText = (card.innerText || '').split('\n').map(t => t.trim()).filter(Boolean);
    let category = '';
    let inviter = '';

    for (const line of allCardText) {
      // Détection de l'inviteur : "X vous a invité(e) à aimer cette Page" ou "Invité(e) par X"
      if (/vous a invité|invité par|invited you/i.test(line)) {
        inviter = line;
      } else if (line !== name && !category && line.length < 50 && !/^(accepter|refuser|confirmer|j'aime|suivre)$/i.test(line)) {
        category = line;
      }
    }

    // 4. Extraire l'avatar / Logo
    let logoUrl = '';
    const img = card.querySelector('img[src*="scontent"], img[src*="fbcdn"], img');
    if (img && img.src && !img.src.includes('emoji') && !img.src.includes('rsrc.php')) {
      logoUrl = img.src;
    }

    // Déterminer les besoins textiles
    const { sector, needs } = detectTextileNeeds(name, category);

    // Enregistrer s'il n'est pas déjà présent
    if (!collectedProspects.has(cleanUrl)) {
      collectedProspects.set(cleanUrl, {
        name,
        url: cleanUrl,
        category: category || sector,
        sector,
        inviter: inviter || 'Invitation directe',
        logoUrl,
        textileNeeds: needs,
        timestamp: new Date().toISOString()
      });
      console.log(`🎯 Nouveau prospect trouvé : [${name}] - ${sector}`);
    }
  }

  // Boucle de défilement et de scan
  function scrollStep() {
    if (!isScrolling) {
      setTimeout(scrollStep, 1000);
      return;
    }

    const newFound = scanVisibleInvites();
    
    // Défiler vers le bas
    const currentScroll = window.scrollY || document.documentElement.scrollTop;
    window.scrollBy({ top: 900, behavior: 'smooth' });

    if (newFound === 0) {
      scrollAttemptsWithoutNew++;
      if (scrollAttemptsWithoutNew >= MAX_IDLE_SCROLLS) {
        statusEl.textContent = `✅ Scan terminé ! ${collectedProspects.size} prospects collectés.`;
        statusEl.style.color = "#34d399";
        isScrolling = false;
        pauseBtn.textContent = "▶ Re-scanner";
        return;
      } else {
        statusEl.textContent = `Recherche de nouvelles invitations (${scrollAttemptsWithoutNew}/${MAX_IDLE_SCROLLS})...`;
      }
    } else {
      scrollAttemptsWithoutNew = 0;
      statusEl.textContent = `Extraction en cours... (${collectedProspects.size} trouvés)`;
    }

    setTimeout(scrollStep, SCROLL_INTERVAL_MS);
  }

  // Démarrer le défilement
  setTimeout(scrollStep, 800);

  // Fonction d'export CSV (avec BOM UTF-8 pour Excel)
  function downloadCSV() {
    const list = Array.from(collectedProspects.values());
    if (list.length === 0) {
      alert("Aucun prospect n'a encore été collecté !");
      return;
    }

    const rows = [
      ['Nom Entreprise', 'Cle Audit', 'Lien Facebook', 'Secteur d\'activite', 'Nom Inviteur', 'Besoins Textiles', 'Logo URL']
    ];

    list.forEach(p => {
      const cleanSlug = p.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '').substring(0, 15);
      const auditKey = `audit-${cleanSlug || 'prospect'}-${Math.random().toString(36).substring(2, 6)}`;
      rows.push([
        `"${p.name.replace(/"/g, '""')}"`,
        `"${auditKey}"`,
        `"${p.url}"`,
        `"${p.sector.replace(/"/g, '""')}"`,
        `"${p.inviter.replace(/"/g, '""')}"`,
        `"${p.textileNeeds.replace(/"/g, '""')}"`,
        `"${p.logoUrl}"`
      ]);
    });

    const csvContent = '\uFEFF' + rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `facebook_prospects_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    console.log(`📥 CSV téléchargé avec ${list.length} prospects !`);
  }

  // Fonction d'export JSON
  function downloadJSON() {
    const list = Array.from(collectedProspects.values());
    if (list.length === 0) {
      alert("Aucun prospect n'a encore été collecté !");
      return;
    }
    const blob = new Blob([JSON.stringify(list, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `facebook_prospects_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  }

  // Envoi direct au serveur Signaid (port 3847)
  async function syncToSignaid() {
    const list = Array.from(collectedProspects.values());
    if (list.length === 0) {
      alert("Aucun prospect n'a encore été collecté !");
      return;
    }

    syncBtn.disabled = true;
    syncBtn.textContent = "⏳ Envoi...";

    try {
      const res = await fetch('http://localhost:3847/api/prospects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(list)
      });
      const data = await res.json();
      if (data.success) {
        alert(`🎉 Succès ! ${data.count} prospects enregistrés dans Signaid (dont ${data.appended} ajoutés à prospect_links.csv) !`);
        syncBtn.textContent = "✅ Synchronisé !";
      } else {
        alert("⚠️ Erreur serveur Signaid : " + (data.error || "Inconnue"));
        syncBtn.textContent = "🚀 Vers Signaid";
      }
    } catch (err) {
      alert("ℹ️ Le serveur local Signaid n'est pas encore démarré.\nLancez 'node scripts/sync_fb_prospects.cjs' dans votre terminal pour recevoir directement les données, ou cliquez sur 'Télécharger CSV' !");
      syncBtn.textContent = "🚀 Vers Signaid";
    } finally {
      syncBtn.disabled = false;
    }
  }

  csvBtn.onclick = downloadCSV;
  jsonBtn.onclick = downloadJSON;
  syncBtn.onclick = syncToSignaid;

})();
