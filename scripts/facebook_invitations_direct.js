/**
 * ==============================================================================
 * 🎯 SIGNAID - EXTRACTEUR DIRECT D'INVITATIONS (Sans CSV)
 * ==============================================================================
 * Ne retient QUE les invitations à aimer des pages.
 * Affiche directement à l'écran les 3 seuls liens demandés :
 * 1. 🔗 Lien vers la Page
 * 2. 👤 Lien vers le Profil de l'inviteur
 * 3. 💬 Lien vers lui envoyer un Message Messenger
 * ==============================================================================
 */

(function() {
  if (window.__SIGNAID_DIRECT_ACTIVE__) {
    alert("Extracteur déjà actif !");
    return;
  }
  window.__SIGNAID_DIRECT_ACTIVE__ = true;

  const collected = new Map();
  let isScrolling = true;
  let idleCount = 0;

  // Création du widget visuel flottant avec liste en direct
  const widget = document.createElement('div');
  widget.id = 'signaid-direct-hud';
  widget.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 420px;
    max-height: 85vh;
    background: #0f172a;
    color: #f8fafc;
    border: 1px solid #334155;
    border-radius: 12px;
    box-shadow: 0 20px 35px rgba(0,0,0,0.6);
    z-index: 9999999;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 13px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  `;

  widget.innerHTML = `
    <div style="background:#1e293b; padding:12px 16px; border-bottom:1px solid #334155; display:flex; justify-content:space-between; align-items:center;">
      <div>
        <strong style="color:#38bdf8; font-size:15px;">🎯 Invitations Pages Détectées</strong>
        <span id="s-count" style="background:#059669; color:white; padding:2px 8px; border-radius:12px; font-size:12px; margin-left:8px; font-weight:bold;">0</span>
      </div>
      <div style="display:flex; gap:8px; align-items:center;">
        <button id="s-pause" style="background:#334155; color:#cbd5e1; border:none; padding:4px 8px; border-radius:4px; font-size:11px; cursor:pointer;">⏸ Pause</button>
        <span id="s-close" style="cursor:pointer; color:#94a3b8; font-size:16px; font-weight:bold;">✕</span>
      </div>
    </div>

    <div id="s-status" style="padding:6px 16px; background:#0b1329; font-size:11px; color:#fde047; border-bottom:1px solid #1e293b;">
      Défilement et scan des notifications en cours...
    </div>

    <div id="s-list" style="padding:12px; overflow-y:auto; flex:1; display:flex; flex-direction:column; gap:10px; max-height:60vh;">
      <div style="text-align:center; color:#64748b; padding:20px;">
        Recherche des invitations en cours... Faites défiler si nécessaire.
      </div>
    </div>

    <div style="padding:10px 16px; background:#1e293b; border-top:1px solid #334155; display:flex; justify-content:space-between; align-items:center;">
      <span style="color:#94a3b8; font-size:11px;">100% Invitations de pages</span>
      <button id="s-copy-all" style="background:#2563eb; color:white; border:none; padding:6px 12px; border-radius:6px; font-size:12px; font-weight:600; cursor:pointer;">📋 Copier tous les liens</button>
    </div>
  `;

  document.body.appendChild(widget);

  const listEl = document.getElementById('s-list');
  const countEl = document.getElementById('s-count');
  const statusEl = document.getElementById('s-status');
  const pauseBtn = document.getElementById('s-pause');

  document.getElementById('s-close').onclick = () => {
    isScrolling = false;
    widget.remove();
    window.__SIGNAID_DIRECT_ACTIVE__ = false;
  };

  pauseBtn.onclick = () => {
    isScrolling = !isScrolling;
    pauseBtn.textContent = isScrolling ? "⏸ Pause" : "▶ Reprendre";
    statusEl.textContent = isScrolling ? "Défilement en cours..." : "Scan en pause.";
  };

  function parseNotification(text) {
    if (!text) return null;
    const clean = text.replace(/\s+/g, ' ').trim();

    // Rejeter strictement les notifications non-invitations
    if (/a commenté|aime votre reel|a réagi|a commencé à vous suivre|vous suit à présent|a publié dans|a partagé|nouvelle publication|a mentionné/i.test(clean)) {
      return null;
    }

    // Doit contenir au moins 'invit' ou 'aimer'
    if (!/invit/i.test(clean) || !/aimer/i.test(clean)) {
      return null;
    }

    let inviterName = '';
    let pageName = '';

    // Regex 1 : classique "X vous a invité(e) à aimer la Page Y"
    const m1 = clean.match(/(?:Non lu\s+)?(.*?)\s+vous\s+a\s+(?:envoyé\s+une\s+invitation\s+[àa]\s+aimer|invit[ée\(\)]*\s+[àa]\s+aimer)\s+(?:la\s+[Pp]age\s+|une\s+[Pp]age\s*:\s*)?(.*?)(?:[\.·]|\s+il\s+y\s+a|\s*$)/i);
    if (m1) {
      inviterName = m1[1].trim();
      pageName = m1[2].trim().replace(/^["'«\s]+|["'»\.\,\s]+$/g, '');
    } else {
      // Regex 2 : flexible
      const parts = clean.split(/invit[ée\(\)]*\s+[àa]\s+aimer/i);
      if (parts.length >= 2) {
        inviterName = parts[0].replace(/Non lu/gi, '').trim();
        pageName = parts[1].replace(/(?:la\s+page|sa\s+page|une\s+page)/gi, '').split(/[\.·]|il y a/)[0].trim();
      }
    }

    // Cas où la page s'appelle comme l'inviteur ou "sa Page" (ex: AFAD vous a invité à aimer sa Page)
    if (!pageName || pageName.toLowerCase() === 'sa page' || pageName.toLowerCase() === 'sa') {
      pageName = inviterName;
    }

    if (!pageName || pageName.length < 2 || pageName.toLowerCase().startsWith('non lu')) {
      return null;
    }

    return { inviterName: inviterName || 'Contact', pageName };
  }

  function addProspectCard(item) {
    if (collected.size === 1) {
      listEl.innerHTML = '';
    }

    const card = document.createElement('div');
    card.style.cssText = `
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 8px;
      padding: 10px 12px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    `;

    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:flex-start;">
        <div>
          <strong style="color:#60a5fa; font-size:14px;">🏢 ${escapeHtml(item.pageName)}</strong>
          <div style="color:#94a3b8; font-size:12px; margin-top:2px;">
            Invité par : <strong style="color:#f1f5f9;">👤 ${escapeHtml(item.inviterName)}</strong>
          </div>
        </div>
      </div>
      <div style="display:flex; gap:6px; margin-top:4px;">
        <a href="${item.pageUrl}" target="_blank" style="background:#2563eb; color:white; text-decoration:none; padding:5px 10px; border-radius:6px; font-size:12px; font-weight:600; display:inline-flex; align-items:center; gap:4px;">
          🔗 Page
        </a>
        <a href="${item.inviterUrl}" target="_blank" style="background:#334155; color:#cbd5e1; text-decoration:none; padding:5px 10px; border-radius:6px; font-size:12px; font-weight:600; display:inline-flex; align-items:center; gap:4px;">
          👤 Profil
        </a>
        <a href="${item.messengerUrl}" target="_blank" style="background:#059669; color:white; text-decoration:none; padding:5px 10px; border-radius:6px; font-size:12px; font-weight:600; display:inline-flex; align-items:center; gap:4px;">
          💬 Message
        </a>
      </div>
    `;

    listEl.prepend(card);
  }

  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function scanDOM() {
    let added = 0;
    const containers = document.querySelectorAll('div[role="listitem"], div[data-visualcompletion="ignore-dynamic-hydration"], a[role="link"]');

    containers.forEach(el => {
      const text = el.innerText || '';
      const parsed = parseNotification(text);
      if (!parsed) return;

      // Chercher les liens
      const links = Array.from(el.querySelectorAll('a[href]'));
      if (el.tagName === 'A') links.push(el);

      let pageUrl = '';
      let inviterUrl = '';

      for (const a of links) {
        const h = a.href;
        if (!h || h.includes('/notifications') || h.includes('/help/') || h.includes('/settings')) continue;
        const cleanH = h.split('?')[0].replace(/\/$/, '');

        if (/profile\.php\?id=|\/user\//.test(h)) {
          inviterUrl = cleanH;
        } else if (!pageUrl && !cleanH.includes('/groups/')) {
          pageUrl = cleanH;
        } else if (!inviterUrl && cleanH !== pageUrl && !cleanH.includes('/groups/')) {
          inviterUrl = cleanH;
        }
      }

      if (!pageUrl) {
        pageUrl = 'https://www.facebook.com/search/pages/?q=' + encodeURIComponent(parsed.pageName);
      }
      if (!inviterUrl) {
        inviterUrl = 'https://www.facebook.com/search/people/?q=' + encodeURIComponent(parsed.inviterName);
      }

      // Génération du lien Messenger
      let messengerUrl = 'https://www.facebook.com/messages/';
      if (inviterUrl && !inviterUrl.includes('/search/')) {
        const idMatch = inviterUrl.match(/id=(\d+)/);
        if (idMatch) {
          messengerUrl = 'https://www.facebook.com/messages/t/' + idMatch[1];
        } else {
          const user = inviterUrl.split('facebook.com/')[1]?.replace(/\/$/, '');
          if (user) {
            messengerUrl = 'https://www.facebook.com/messages/t/' + user;
          }
        }
      }

      const key = (pageUrl + '|' + parsed.inviterName).toLowerCase();
      if (!collected.has(key)) {
        const item = {
          pageName: parsed.pageName,
          pageUrl,
          inviterName: parsed.inviterName,
          inviterUrl,
          messengerUrl
        };
        collected.set(key, item);
        addProspectCard(item);
        added++;
        console.log(`🎯 Trouvé : ${parsed.pageName} (par ${parsed.inviterName})`);
      }
    });

    countEl.textContent = collected.size;
    return added;
  }

  function loop() {
    if (!isScrolling) return;
    const n = scanDOM();
    window.scrollBy({ top: 900, behavior: 'smooth' });

    if (n === 0) {
      idleCount++;
      if (idleCount >= 10) {
        statusEl.textContent = `✅ Scan terminé ! ${collected.size} invitation(s) de page trouvée(s).`;
        statusEl.style.color = '#34d399';
        isScrolling = false;
        pauseBtn.textContent = "▶ Re-scanner";
        return;
      }
    } else {
      idleCount = 0;
      statusEl.textContent = `Scan en cours... (${collected.size} pages trouvées)`;
    }

    setTimeout(loop, 1400);
  }

  setTimeout(loop, 600);

  // Copier tous les liens au format clair
  document.getElementById('s-copy-all').onclick = () => {
    const list = Array.from(collected.values());
    if (!list.length) return alert("Aucune invitation trouvée pour le moment !");
    
    let text = "🎯 PROSPECTS FACEBOOK - INVITATIONS DE PAGES\n\n";
    list.forEach(p => {
      text += `🏢 Page : ${p.pageName}\n`;
      text += `🔗 Lien Page : ${p.pageUrl}\n`;
      text += `👤 Invité par : ${p.inviterName} (${p.inviterUrl})\n`;
      text += `💬 Message direct : ${p.messengerUrl}\n`;
      text += "----------------------------------------\n";
    });

    navigator.clipboard.writeText(text).then(() => {
      alert(`📋 ${list.length} prospects copiés dans le presse-papier !`);
    });
  };
})();
