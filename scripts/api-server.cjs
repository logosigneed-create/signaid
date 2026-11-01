/**
 * api-server.cjs - Signaid Local API Server (port 3848)
 * Proxifie par Vite sur /api depuis http://localhost:3847
 *
 * POST /api/create-profile  -> scrape og:title+og:image depuis URL Facebook,
 *                              cree SiteConfig Firestore, retourne showcaseUrl
 * POST /api/prospects       -> batch-persist un tableau de prospects
 * GET  /api/health          -> health check
 */
'use strict';

try { require('dotenv').config({ path: '.env.local' }); } catch(e) {}

const express = require('express');
const cors    = require('cors');
const https   = require('https');
const http    = require('http');
const { initializeApp, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getStorage }   = require('firebase-admin/storage');

if (getApps().length === 0) {
  initializeApp({ projectId: 'signaid-prod' });
}
const db   = getFirestore();
const app  = express();
const PORT = 3848;

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));

/* helpers */

function makeAuditKey(name, fbUrl) {
  const base = name || fbUrl || 'unknown';
  return base
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 60) || 'unknown';
}

function fetchBuffer(rawUrl, timeoutMs) {
  timeoutMs = timeoutMs || 8000;
  return new Promise(function(resolve) {
    try {
      const parsed = new URL(rawUrl);
      const lib = parsed.protocol === 'https:' ? https : http;
      const req = lib.get(rawUrl, { timeout: timeoutMs }, function(res) {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return fetchBuffer(res.headers.location, timeoutMs).then(resolve);
        }
        const chunks = [];
        res.on('data', function(c) { chunks.push(c); });
        res.on('end',  function() { resolve(Buffer.concat(chunks)); });
        res.on('error',function() { resolve(null); });
      });
      req.on('error',   function() { resolve(null); });
      req.on('timeout', function() { req.destroy(); resolve(null); });
    } catch(e) { resolve(null); }
  });
}

function extractFbPageName(fbUrl) {
  try {
    const u     = new URL(fbUrl);
    const parts = u.pathname.split('/').filter(Boolean);
    const idx   = parts.indexOf('pages');
    const name  = idx >= 0 ? parts[idx + 1] : parts[0];
    return (name || 'Prospect')
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, function(c) { return c.toUpperCase(); });
  } catch(e) { return 'Prospect'; }
}

async function scrapeFacebookPage(fbUrl) {
  let cleanUrl = fbUrl;
  try {
    const u = new URL(fbUrl);
    cleanUrl = u.protocol + '//' + u.hostname + u.pathname;
    cleanUrl = cleanUrl.replace(/\/$/, '');
  } catch(e) {}
  console.log('[scrape] Fetching: ' + cleanUrl);
  const buf = await fetchBuffer(cleanUrl);
  if (!buf) { console.warn('[scrape] Echec: ' + cleanUrl); return null; }
  const html = buf.toString('utf-8');
  /* og:title */
  const tR1    = /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i;
  const tR2    = /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i;
  const titleM = html.match(tR1) || html.match(tR2);
  const pageName = titleM
    ? titleM[1].trim().replace(/&amp;/g, '&').replace(/&#039;/g, "'")
    : extractFbPageName(cleanUrl);
  /* og:image */
  const iR1  = /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i;
  const iR2  = /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i;
  const imgM = html.match(iR1) || html.match(iR2);
  const logoUrl = imgM ? imgM[1].replace(/&amp;/g, '&') : null;
  return { pageName: pageName, logoUrl: logoUrl, cleanUrl: cleanUrl };
}

async function uploadLogoToStorage(logoBuf, contentType, slug) {
  try {
    const bucket = getStorage().bucket('signaid-prod.firebasestorage.app');
    const ext    = contentType.includes('png') ? 'png' : 'jpg';
    const file   = bucket.file('logos/prospects/' + slug + '_logo.' + ext);
    await file.save(logoBuf, { metadata: { contentType: contentType } });
    const signed = await file.getSignedUrl({ action: 'read', expires: '03-01-2100' });
    return signed[0];
  } catch(err) { console.warn('[uploadLogo] Erreur Storage:', err.message); return null; }
}

/* routes */

app.get('/api/health', function(_req, res) {
  res.json({ ok: true, port: PORT, ts: new Date().toISOString() });
});

const { createProfile } = require('./profileCreatorService.cjs');

app.post('/api/create-profile', async function(req, res) {
  const fbUrl = (req.body || {}).url;
  if (!fbUrl) return res.status(400).json({ success: false, error: 'url manquant' });
  try {
    const result = await createProfile(fbUrl);
    return res.json(result);
  } catch(err) {
    console.error('[create-profile] ERR ' + err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/prospects', async function(req, res) {
  const prospects = (req.body || {}).prospects;
  if (!Array.isArray(prospects) || prospects.length === 0)
    return res.status(400).json({ success: false, error: 'Tableau prospects vide.' });
  try {
    const batch = db.batch();
    prospects.forEach(function(p) {
      const slug = makeAuditKey(p.name || p.pageName, p.url || p.facebookUrl);
      if (!slug || slug === 'unknown') return;
      batch.set(
        db.collection('prospects').doc(slug),
        Object.assign({}, p, { slug: slug, auditKey: slug,
          updatedAt: new Date().toISOString(), source: 'facebook_scraper' }),
        { merge: true }
      );
    });
    await batch.commit();
    return res.json({ success: true, count: prospects.length });
  } catch(err) {
    console.error('[prospects] ERR ' + err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/* start */
app.listen(PORT, '127.0.0.1', function() {
  console.log('');
  console.log('  OK  Signaid API Server port ' + PORT);
  console.log('  ->  http://127.0.0.1:' + PORT + '/api/health');
  console.log('  ->  Proxifie Vite -> http://localhost:3847/api/...');
  console.log('');
});
