/**
 * ==============================================================================
 * 🎯 SIGNAID - EXTRACTEUR BASE SUR LES BOUTONS "ACCEPTER"
 * ==============================================================================
 * Détecte instantanément toutes les invitations avec bouton "Accepter" / "Refuser"
 * (Exemple: "Wim Verreyken vous invite à suivre Diamantwerp")
 * Affiche directement les 3 liens demandés :
 * 1. 🔗 Page
 * 2. 👤 Profil
 * 3. 💬 Message
 * ==============================================================================
 */

(function() {
  if (window.__SIGNAID_ACCEPTER_ACTIVE__) {
    alert("Extracteur déjà actif !");
    return;
  }
  window.__SIGNAID_ACCEPTER_ACTIVE__ = true;

  const collected = new Map();
  let isScrolling = true;
  let idleCount = 0;

  // Widget visuel flottant
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
        <strong style="color:#38bdf8; font-size:15px;">🎯 Invitations Pages</strong>
        <span id="s-count" style="background:#059669; color:white; padding:2px 8px; border-radius:12px; font-size:12px; margin-left:8px; font-weight:bold;">0</span>
      </div>
      <div style="display:flex; gap:8px; align-items:center;">
        <button id="s-pause" style="background:#334155; color:#cbd5e1; border:none; padding:4px 8px; border-radius:4px; font-size:11px; cursor:pointer;">⏸ Pause</button>
        <span id="s-close" style="cursor:pointer; color:#94a3b8; font-size:16px; font-weight:bold;">✕</span>
      </div>
    </div>

    <div id="s-status" style="padding:6px 16px; background:#0b1329; font-size:11px; color:#fde047; border-bottom:1px solid #1e293b;">
      Scan des invitations avec bouton Accepter...
    </div>

    <div id="s-list" style="padding:12px; overflow-y:auto; flex:1; display:flex; flex-direction:column; gap:10px; max-height:60vh;">
      <div id="s-empty" style="text-align:center; color:#64748b; padding:20px;">
        Recherche des boutons « Accepter » en cours...
      </div>
    </div>

    <div style="padding:10px 16px; background:#1e293b; border-top:1px solid #334155; display:flex; justify-content:space-between; align-items:center;">
      <span style="color:#94a3b8; font-size:11px;">100% Boutons d'action directs</span>
      <button id="s-copy-all" style="background:#2563eb; color:white; border:none; padding:6px 12px; border-radius:6px; font-size:12px; font-weight:600; cursor:pointer;">📋 Copier les liens</button>
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
    window.__SIGNAID_ACCEPTER_ACTIVE__ = false;
  };

  pauseBtn.onclick = () => {
    isScrolling = !isScrolling;
    pauseBtn.textContent = isScrolling ? "⏸ Pause" : "▶ Reprendre";
    statusEl.textContent = isScrolling ? "Défilement en cours..." : "Scan en pause.";
  };

  function addProspectCard(item) {
    const emptyEl = document.getElementById('s-empty');
    if (emptyEl) emptyEl.remove();

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
      <div>
        <strong style="color:#60a5fa; font-size:14px;">🏢 ${escapeHtml(item.pageName)}</strong>
        <div style="color:#94a3b8; font-size:12px; margin-top:2px;">
          Invité par : <strong style="color:#f1f5f9;">👤 ${escapeHtml(item.inviterName)}</strong>
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
    return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function scanForAcceptButtons() {
    let newFound = 0;

    // Trouver tous les boutons ou éléments avec le texte "Accepter"
    const allElements = Array.from(document.querySelectorAll('div[role="button"], button, span[role="button"], a[role="button"], div, span'));
    const acceptElements = allElements.filter(el => {
      const txt = (el.innerText || '').trim().toLowerCase();
      // On cherche exactement "accepter" sur un élément bouton ou petit conteneur
      return (txt === 'accepter' || txt === 'accept') && el.children.length === 0;
    });

    acceptElements.forEach(btn => {
      // Remonter au conteneur parent (la carte de notification complète)
      let card = btn.parentElement;
      for (let i = 0; i < 6; i++) {
        if (!card || !card.parentElement) break;
        // Si la carte contient du texte comme "vous invite" ou "suivre" ou "aimer"
        const cardText = card.innerText || '';
        if (/vous invite|invite à|invité|suivre|aimer/i.test(cardText)) {
          break;
        }
        card = card.parentElement;
      }

      if (!card) return;
      const fullText = (card.innerText || '').replace(/\s+/g, ' ').trim();

      // Extraction : "Wim Verreyken vous invite à suivre Diamantwerp"
      let inviterName = '';
      let pageName = '';

      // Regex spécifique : "X vous invite à suivre Y" ou "X vous invite à aimer Y"
      const match = fullText.match(/(?:Non lu\s+)?(.*?)\s+vous\s+(?:a\s+)?invit[ée\(\)]*\s+[àa]\s+(?:suivre|aimer)\s+(?:la\s+[Pp]age\s+)?(.*?)(?:\.|\s*\n|\s+il\s+y\s+a|\s+\d+\s*(?:sem|j|h|min|m)|\s+Accepter|\s*$)/i);
      if (match) {
        inviterName = match[1].trim();
        pageName = match[2].trim().replace(/^["'«\s]+|["'»\.\,\s]+$/g, '');
      } else {
        // Fallback découpage
        const parts = fullText.split(/vous\s+(?:a\s+)?invit[ée\(\)]*\s+[àa]\s+(?:suivre|aimer)/i);
        if (parts.length >= 2) {
          inviterName = parts[0].replace(/Non lu/gi, '').trim();
          pageName = parts[1].split(/[\.·\n]|Accepter|Refuser|\d+\s*(?:sem|j|h)/i)[0].replace(/(?:la\s+page|sa\s+page)/gi, '').trim();
        }
      }

      if (!pageName || pageName.length < 2) return;
      if (!inviterName || inviterName.length < 2) inviterName = 'Contact';

      // Recherche des liens
      const links = Array.from(card.querySelectorAll('a[href]'));
      let pageUrl = '';
      let inviterUrl = '';

      for (const a of links) {
        const h = a.href;
        if (!h || h.includes('/notifications') || h.includes('/help/')) continue;
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
        pageUrl = 'https://www.facebook.com/search/pages/?q=' + encodeURIComponent(pageName);
      }
      if (!inviterUrl) {
        inviterUrl = 'https://www.facebook.com/search/people/?q=' + encodeURIComponent(inviterName);
      }

      // Lien Messenger direct
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

      const key = (pageName + '|' + inviterName).toLowerCase();
      if (!collected.has(key)) {
        const item = { pageName, inviterName, pageUrl, inviterUrl, messengerUrl };
        collected.set(key, item);
        addProspectCard(item);
        newFound++;
        console.log(`🎯 Invitation détectée : [${pageName}] par [${inviterName}]`);
      }
    });

    countEl.textContent = collected.size;
    return newFound;
  }

  function loop() {
    if (!isScrolling) return;

    const n = scanForAcceptButtons();
    window.scrollBy({ top: 700, behavior: 'smooth' });

    if (n === 0) {
      idleCount++;
      if (idleCount >= 12) {
        statusEl.textContent = `✅ Scan terminé ! ${collected.size} invitation(s) trouvée(s).`;
        statusEl.style.color = '#34d399';
        isScrolling = false;
        pauseBtn.textContent = '▶';
        return;
      }
    } else {
      idleCount = 0;
      statusEl.textContent = `Scan en cours (${collected.size} pages trouvées)...`;
    }

    setTimeout(loop, 1500);
  }

  setTimeout(loop, 400);

  // Copier tous les liens
  document.getElementById('s-copy-all').onclick = () => {
    const list = Array.from(collected.values());
    if (!list.length) return alert("Aucune invitation trouvée pour le moment !");
    let t = '';
    list.forEach(it => {
      t += `🏢 Page : ${it.pageName}\n🔗 Lien : ${it.pageUrl}\n👤 Invité par : ${it.inviterName} (${it.inviterUrl})\n💬 Message : ${it.messengerUrl}\n\n`;
    });
    navigator.clipboard.writeText(t).then(() => alert(`📋 ${list.length} invitations copiées dans le presse-papier !`));
  };
})();
