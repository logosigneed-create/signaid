(function(){
  if(window.__SIGNAID_ACTIVE__){alert("Extracteur déjà actif !");return;}
  window.__SIGNAID_ACTIVE__=true;
  const prospects=new Map();
  let scrolling=true,idle=0;

  function detectNeeds(name,cat){
    const t=(name+' '+cat).toLowerCase();
    if(/(toiture|couverture|zinguerie|charpente|ardois)/.test(t))return{s:'Toitures & Rénovation',n:'Hoodies chauds, T-shirts chantier, Polos'};
    if(/(construct|macon|renov|batiment|chassis|terrassement|demolition)/.test(t))return{s:'BTP & Construction',n:'T-shirts haute résistance, Polos pro, Softshells'};
    if(/(plomb|chauff|sanit|electr|clim|chauffage)/.test(t))return{s:'Électricité & Chauffage',n:'Polos floqués, Vestes travail, Sweats'};
    if(/(peint|decor|carrel|menuiserie|bois)/.test(t))return{s:'Finitions & Menuiserie',n:'T-shirts coton dos XL, Tabliers'};
    if(/(jardin|paysag|piscine|espace vert|elag)/.test(t))return{s:'Parcs & Jardins',n:'T-shirts respirants, Polos pro, Casquettes'};
    if(/(auto|garage|mecan|detailing|lavage|depannage)/.test(t))return{s:'Automobile & Detailing',n:'T-shirts noirs anti-tâches, Polos, Casquettes'};
    if(/(resto|restaurant|snack|pizza|burger|traiteur|cafe|bar|bistrot)/.test(t))return{s:'Horeca & Restauration',n:'Polos service, Tabliers brodés, T-shirts équipe'};
    if(/(coiff|barber|esthet|ongle|spa|tattoo|tatouage|beaute)/.test(t))return{s:'Beauté & Salons / Barber',n:'T-shirts coupe stylée, Tabliers'};
    if(/(fit|coach|sport|boxe|gym|club|foot|crossfit)/.test(t))return{s:'Sport & Fitness',n:'T-shirts respirants, Sweats, Casquettes'};
    if(/(event|evenement|dj|fest|musique|photo|prod)/.test(t))return{s:'Événementiel & Audiovisuel',n:'Hoodies oversize, T-shirts crew dos XL, Bonnets'};
    return{s:cat||'Commerce & Artisanat',n:'T-shirts promotionnels, Polos brodés'};
  }

  const hud=document.createElement('div');
  hud.style.cssText='position:fixed;bottom:20px;right:20px;width:350px;background:#111827;color:#f3f4f6;padding:16px;border-radius:12px;box-shadow:0 15px 30px rgba(0,0,0,0.6);z-index:999999;font-family:-apple-system,sans-serif;font-size:13px;border:1px solid #374151;';
  hud.innerHTML=`
    <div style="font-weight:bold;color:#60a5fa;margin-bottom:8px;font-size:15px;display:flex;justify-content:space-between;">
      <span>👕 Signaid Prospector</span>
      <span id="s-close" style="cursor:pointer;color:#9ca3af;">✕</span>
    </div>
    <div style="margin-bottom:8px;display:flex;justify-content:space-between;">
      <span>Prospects qualifiés :</span>
      <b id="s-count" style="color:#34d399;font-size:16px;">0</b>
    </div>
    <div id="s-status" style="color:#fbbf24;font-size:11px;margin-bottom:12px;">Défilement automatique en cours...</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
      <button id="s-csv" style="background:#059669;color:#fff;border:none;padding:9px;border-radius:6px;cursor:pointer;font-weight:bold;">📥 Télécharger CSV</button>
      <button id="s-sync" style="background:#2563eb;color:#fff;border:none;padding:9px;border-radius:6px;cursor:pointer;font-weight:bold;">🚀 Vers Signaid</button>
    </div>
  `;
  document.body.appendChild(hud);

  const countEl=document.getElementById('s-count'), statusEl=document.getElementById('s-status');
  document.getElementById('s-close').onclick=()=>{scrolling=false;hud.remove();window.__SIGNAID_ACTIVE__=false;};

  function scan(){
    let added=0;
    
    // Cas 1: Page Invitations (/pages/...)
    const inviteButtons = Array.from(document.querySelectorAll('div[role="button"], button')).filter(b => {
      const t = (b.innerText||'').trim().toLowerCase();
      return ['accepter','confirmer','suivre',"j'aime"].includes(t);
    });

    for(const btn of inviteButtons){
      let card = btn.parentElement;
      for(let i=0; i<6; i++){
        if(!card) break;
        const link = card.querySelector('a[href*="facebook.com/"]:not([href*="category=invites"]):not([href*="/help/"])');
        if(link){
          const cleanUrl = link.href.split('?')[0];
          const name = (link.innerText||'').split('\n')[0].trim();
          if(name && name.length > 2 && !prospects.has(cleanUrl)){
            const img = card.querySelector('img[src*="scontent"], img[src*="fbcdn"]');
            const info = detectNeeds(name, '');
            prospects.set(cleanUrl, { name, url: cleanUrl, sector: info.s, needs: info.n, logoUrl: img?img.src:'' });
            added++;
          }
          break;
        }
        card = card.parentElement;
      }
    }

    // Cas 2: Notifications (/notifications)
    const notifLinks = document.querySelectorAll('a[href*="/"]');
    notifLinks.forEach(a => {
      const text = (a.innerText||'');
      // Détecter si c'est une invitation de page
      if(/invit(é|e|ation).*aimer.*page/i.test(text) || /invited you to like/i.test(text)){
        // Extraire le nom de la page : généralement après "la Page " ou entre guillemets
        let pageName = '';
        const match = text.match(/(?:la Page|la page|page)\s+([^\n\.\,]+)/i);
        if(match && match[1]){
          pageName = match[1].trim();
        } else {
          // Alternative : première ligne en gras ou texte principal
          const bold = a.querySelector('strong, b, span[dir="auto"]');
          if(bold) pageName = bold.innerText.trim();
        }

        const href = a.href;
        if(pageName && pageName.length > 2 && !prospects.has(href)){
          const img = a.querySelector('img[src*="scontent"], img[src*="fbcdn"]');
          const info = detectNeeds(pageName, '');
          prospects.set(href, { name: pageName, url: href, sector: info.s, needs: info.n, logoUrl: img?img.src:'' });
          added++;
        }
      }
    });

    countEl.textContent = prospects.size;
    return added;
  }

  function loop(){
    if(!scrolling) return;
    const n = scan();
    window.scrollBy({ top: 800, behavior: 'smooth' });
    if(n === 0){
      idle++;
      if(idle >= 6){
        statusEl.textContent = '✅ Scan terminé ! (' + prospects.size + ' prospects)';
        statusEl.style.color = '#34d399';
        scrolling = false;
        return;
      }
    } else {
      idle = 0;
      statusEl.textContent = 'Extraction en cours (' + prospects.size + ' trouvés)...';
    }
    setTimeout(loop, 1400);
  }
  setTimeout(loop, 800);

  document.getElementById('s-csv').onclick = () => {
    const arr = Array.from(prospects.values());
    if(!arr.length) return alert('Aucun prospect trouvé pour l\'instant !');
    let csv = '\uFEFFNom Entreprise,Cle Audit,Lien Facebook,Secteur d\'activite,Besoins Textiles,Logo URL\n';
    arr.forEach(p => {
      const slug = p.name.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 15);
      csv += `"${p.name.replace(/"/g, '""')}","audit-${slug}-${Math.random().toString(36).substring(2, 6)}","${p.url}","${p.sector}","${p.needs}","${p.logoUrl}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'facebook_prospects_invites.csv';
    link.click();
  };

  document.getElementById('s-sync').onclick = async () => {
    const arr = Array.from(prospects.values());
    if(!arr.length) return alert('Aucun prospect trouvé pour l\'instant !');
    try {
      const res = await fetch('http://localhost:3847/api/prospects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(arr)
      });
      const d = await res.json();
      alert('🎉 ' + d.count + ' prospects synchronisés dans Signaid (prospect_links.csv mis à jour) !');
    } catch(e) {
      alert('Sauvegarde CSV directe déclenchée...');
      document.getElementById('s-csv').click();
    }
  };
})();
