const { spawnSync } = require('child_process');
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc } = require('firebase/firestore');
const fs = require('fs');
const path = require('path');

const firebaseConfig = {
  apiKey: "AIzaSyDTSKpVei8lCANIQJBZmuKcsjEDIubnvcs",
  authDomain: "signaid-prod.firebaseapp.com",
  projectId: "signaid-prod",
  storageBucket: "signaid-prod.firebasestorage.app",
  messagingSenderId: "244540314192",
  appId: "1:244540314192:web:814f987d2a6ece8ac67755"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const MASTER_CSV = path.join(__dirname, '..', 'prospect_links.csv');
const JSON_FILE = path.join(__dirname, '..', 'facebook_prospects_invites.json');

/**
 * Automate extraction and prospect profile creation from a Facebook URL
 */
async function createProspectFromFacebook(fbUrl) {
  console.log(`\n=================================================`);
  console.log(`🚀 EXTRACTION ET CREATION DU PROSPECT SIGNAID`);
  console.log(`🌐 URL cible : ${fbUrl}`);
  console.log(`=================================================`);

  // 1. Run python extractor
  const pyScript = path.join(__dirname, 'extract_fb_page_info.py');
  const res = spawnSync('python', [pyScript, fbUrl], { encoding: 'utf-8' });

  if (res.error || res.status !== 0) {
    throw new Error(`Erreur python: ${res.stderr || res.stdout}`);
  }

  let data;
  try {
    data = JSON.parse(res.stdout);
  } catch (e) {
    throw new Error(`Erreur JSON parser: ${res.stdout}`);
  }

  if (!data.success) {
    throw new Error(`Échec de l'extraction: ${data.error}`);
  }

  const { pageName, logoUrl, canonicalUrl, slug, description } = data;
  console.log(`✅ Page identifiée : "${pageName}"`);
  console.log(`📸 Logo trouvé : ${logoUrl ? logoUrl.substring(0, 80) + '...' : 'Aucun'}`);

  // 2. Determine Sector and Textile recommendations
  const text = `${pageName} ${canonicalUrl}`.toLowerCase();
  let sector = 'Événementiel, Musique & DJ';
  let needs = 'Hoodies oversize, T-shirts crew dos XL, Bonnets';

  if (/(toiture|couverture|charpente)/.test(text)) {
    sector = 'Toitures & Rénovation';
    needs = 'Hoodies chauds, T-shirts chantier, Polos';
  } else if (/(construct|renov|batiment|macon)/.test(text)) {
    sector = 'BTP & Construction Générale';
    needs = 'T-shirts haute résistance, Polos pro, Softshells';
  } else if (/(auto|garage|detailing|carrosserie)/.test(text)) {
    sector = 'Automobile & Detailing';
    needs = 'T-shirts noirs anti-tâches, Polos, Casquettes';
  } else if (/(bar|resto|restaurant|snack|pizza|burger)/.test(text)) {
    sector = 'Horeca & Restauration';
    needs = 'Polos service brodés, Tabliers, T-shirts équipe';
  }

  // 3. Generate Unique Audit Key and Showcase Link
  const randomSuffix = Math.random().toString(36).substring(2, 6);
  const auditKey = `audit-${slug || 'prospect'}-${randomSuffix}`;
  const showcaseUrl = `https://signaid.eu/profil?slug=${auditKey}&showcase=true`;

  console.log(`🔑 Clé Audit : ${auditKey}`);
  console.log(`🔗 Lien Vitrine Signaid : ${showcaseUrl}`);

  // 4. Save to Firestore (Master Pipeline)
  const authenticBio = (slug && slug.includes('2000theparty')) || (pageName && pageName.toLowerCase().includes('2000 the party'))
    ? "La soirée référence pour se replonger dans les années 2000! Reste connecté.."
    : (description && description.trim().length > 10 ? description.trim() : null);

  const presentationText = authenticBio || `
    <p><b>${pageName}</b>, boutique officielle de merchandising.</p>
    <p><b>Produits disponibles :</b> T-shirts, Hoodies, Sweats à capuche et Casquettes personnalisées.</p>
    <p><b>Impression & Expédition :</b> À la demande en Belgique et en Europe.</p>
  `;

  const payload = {
    uid: auditKey,
    slug: auditKey,
    canonicalUid: auditKey,
    companyName: pageName,
    brandName: pageName,
    userLogo: logoUrl,
    logoUrl: logoUrl,
    visualLogoUrl: logoUrl,
    isGuest: true,
    is_claimed: false,
    status: "generated_from_facebook_pipeline",
    sector: sector,
    activitySector: sector,
    theme: "dark",
    presentation: presentationText,
    description: presentationText,
    bio: presentationText,
    showcaseUrl: showcaseUrl,
    merchUrl: showcaseUrl,
    facebookUrl: canonicalUrl,
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString()
  };

  const collections = ['SiteConfigs', 'btp_projects', 'prospects', 'audits', 'anonymous_previews'];
  for (const colName of collections) {
    try {
      await setDoc(doc(db, colName, auditKey), payload, { merge: true });
    } catch (err) {
      console.warn(`  ⚠️ Avertissement setDoc ${colName}:`, err.message);
    }
  }
  console.log(`💾 Profil enregistré dans Firestore (collections: ${collections.join(', ')})`);

  // 5. Append to prospect_links.csv
  let appendedToCsv = false;
  if (fs.existsSync(MASTER_CSV)) {
    let csvContent = fs.readFileSync(MASTER_CSV, 'utf-8');
    if (!csvContent.includes(pageName)) {
      const newRow = `\n"${pageName.replace(/"/g, '""')}","${auditKey}","${showcaseUrl}","${sector.replace(/"/g, '""')}"`;
      fs.writeFileSync(MASTER_CSV, csvContent + newRow, 'utf-8');
      appendedToCsv = true;
      console.log(`📝 Ajouté au fichier master prospect_links.csv`);
    }
  }

  // 6. Update facebook_prospects_invites.json with the logo and auditKey
  if (fs.existsSync(JSON_FILE)) {
    const list = JSON.parse(fs.readFileSync(JSON_FILE, 'utf-8'));
    let found = false;
    for (const item of list) {
      if (item.name.toLowerCase() === pageName.toLowerCase() || item.url.includes(slug)) {
        item.logoUrl = logoUrl;
        item.auditKey = auditKey;
        item.showcaseUrl = showcaseUrl;
        item.isProfileCreated = true;
        found = true;
        break;
      }
    }
    if (!found) {
      list.unshift({
        name: pageName,
        auditKey: auditKey,
        url: canonicalUrl,
        sector: sector,
        needs: needs,
        logoUrl: logoUrl,
        showcaseUrl: showcaseUrl,
        isProfileCreated: true,
        score: 95,
        tier: 'POD_STAR',
        badge: '⭐ Cible Star Merch (Musique & Fans)',
        pitch: 'Portail Merch officiel pour tes fans : T-shirts, Hoodies, Casquettes sans gestion de stock ni avance.'
      });
    }
    fs.writeFileSync(JSON_FILE, JSON.stringify(list, null, 2), 'utf-8');
  }

  console.log(`\n🎉 PROFIL CREE AVEC SUCCES POUR : ${pageName}`);
  console.log(`👉 Vitrine client : ${showcaseUrl}`);

  return {
    success: true,
    pageName,
    logoUrl,
    auditKey,
    showcaseUrl,
    sector,
    canonicalUrl
  };
}

// Execution en ligne de commande
if (require.main === module) {
  const targetUrl = process.argv[2] || "https://www.facebook.com/profile.php?id=61566467420783#";
  createProspectFromFacebook(targetUrl)
    .then(r => {
      console.log("\nRésultat JSON :", JSON.stringify(r, null, 2));
      process.exit(0);
    })
    .catch(err => {
      console.error("\n❌ ERREUR :", err.message);
      process.exit(1);
    });
}

module.exports = { createProspectFromFacebook };
