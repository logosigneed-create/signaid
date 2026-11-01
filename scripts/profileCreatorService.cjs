const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// Charger les variables d'environnement
function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

loadEnvFile('.env.local');
loadEnvFile('.env');

// Initialiser Firebase Client SDK
const { initializeApp, getApps } = require('firebase/app');
const { getFirestore, doc, setDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || 'signaid-prod.firebaseapp.com',
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'signaid-prod',
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || 'signaid-prod.firebasestorage.app',
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '244540314192',
  appId: process.env.VITE_FIREBASE_APP_ID
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

// Index en mémoire des prospects existants
let prospectCatalog = null;
function getProspectCatalog() {
  if (prospectCatalog) return prospectCatalog;
  try {
    const jsonPath = path.resolve(__dirname, '../facebook_prospects_invites.json');
    if (fs.existsSync(jsonPath)) {
      prospectCatalog = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      return prospectCatalog;
    }
  } catch (e) {}
  return [];
}

function normalizeUrl(rawUrl) {
  if (!rawUrl) return '';
  return rawUrl.trim().toLowerCase().replace(/\/+$/, '').replace(/^https?:\/\/(www\.)?/, '');
}

function makeAuditKey(name, fbUrl) {
  const base = name || fbUrl || 'unknown';
  return base
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 60) || 'unknown';
}

function extractFbPageName(fbUrl) {
  try {
    const u = new URL(fbUrl);
    const parts = u.pathname.split('/').filter(Boolean);
    const idx = parts.indexOf('pages');
    const name = idx >= 0 ? parts[idx + 1] : parts[0];
    if (name && !/^\d+$/.test(name)) {
      return name.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    }
    return 'Prospect ' + (name || 'Page');
  } catch {
    return 'Prospect';
  }
}

async function scrapeMetadata(targetUrl) {
  return new Promise((resolve) => {
    try {
      const parsed = new URL(targetUrl);
      const lib = parsed.protocol === 'https:' ? https : http;
      const req = lib.get(targetUrl, {
        timeout: 6000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      }, (res) => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          const titleM = data.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ||
                         data.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i);
          const imgM = data.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
                       data.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
          resolve({
            title: titleM ? titleM[1].replace(/&amp;/g, '&').replace(/&#039;/g, "'") : null,
            image: imgM ? imgM[1].replace(/&amp;/g, '&') : null
          });
        });
      });
      req.on('error', () => resolve({ title: null, image: null }));
      req.on('timeout', () => { req.destroy(); resolve({ title: null, image: null }); });
    } catch {
      resolve({ title: null, image: null });
    }
  });
}

async function createProfile(rawFbUrl) {
  if (!rawFbUrl) throw new Error('URL Facebook manquante.');

  const cleanInputUrl = rawFbUrl.trim();
  const normalizedInput = normalizeUrl(cleanInputUrl);

  // 1. Chercher dans le catalogue de 2157 prospects
  const catalog = getProspectCatalog();
  const matched = catalog.find(p => {
    if (!p.url) return false;
    const norm = normalizeUrl(p.url);
    return norm === normalizedInput || norm.includes(normalizedInput) || normalizedInput.includes(norm);
  });

  let pageName = matched?.name || matched?.pageName;
  let logoUrl = matched?.logoUrl || '';
  let auditKey = matched?.auditKey ? matched.auditKey.replace(/^audit-/, '').replace(/-[a-z0-9]{4}$/i, '') : null;
  let sector = matched?.sector || 'Musique, DJs & Événementiel';

  // 2. Si non trouvé dans le catalogue, tenter le scraping léger
  if (!pageName || !logoUrl) {
    const scraped = await scrapeMetadata(cleanInputUrl);
    if (!pageName) pageName = scraped.title || extractFbPageName(cleanInputUrl);
    if (!logoUrl) logoUrl = scraped.image || '';
  }

  if (!auditKey) {
    auditKey = makeAuditKey(pageName, cleanInputUrl);
  }

  const showcaseUrl = `https://signaid.eu/portail-shop?slug=${auditKey}`;
  const now = new Date().toISOString();

  const payload = {
    uid: auditKey,
    slug: auditKey,
    companySlug: auditKey,
    cleanUid: auditKey,
    auditKey: auditKey,
    companyName: pageName,
    facebookUrl: cleanInputUrl,
    logoUrl: logoUrl,
    showcaseUrl: showcaseUrl,
    status: 'prospect_created',
    isGuest: true,
    is_claimed: false,
    sector: sector,
    theme: 'dark',
    accentColor: '#2563eb',
    pitch: `Portail Merch officiel ${pageName} : T-shirts, Hoodies, Casquettes sans gestion de stock.`,
    createdAt: now,
    updatedAt: now,
    source: 'prospects_viewer'
  };

  // 3. Persistance Firestore via Client SDK (avec permissions publiques)
  await Promise.all([
    setDoc(doc(db, 'prospects', auditKey), payload, { merge: true }),
    setDoc(doc(db, 'SiteConfigs', auditKey), payload, { merge: true }),
    setDoc(doc(db, 'audits', auditKey), payload, { merge: true })
  ]);

  console.log(`[createProfile] ✅ Profil créé: ${pageName} (${auditKey})`);

  return {
    success: true,
    pageName: pageName,
    auditKey: auditKey,
    logoUrl: logoUrl,
    showcaseUrl: showcaseUrl,
    canonicalUrl: cleanInputUrl
  };
}

module.exports = { createProfile };
