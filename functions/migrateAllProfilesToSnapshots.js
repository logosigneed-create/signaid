const sharp = require('sharp');
const path = require('path');
const https = require('https');
const http = require('http');
const fs = require('fs');

/**
 * Télécharge un buffer d'image depuis une URL HTTP/HTTPS ou décode une chaîne Base64
 */
function downloadImageBuffer(url) {
  if (!url || typeof url !== 'string') return Promise.resolve(null);
  const cleanUrl = url.trim();
  if (!cleanUrl || cleanUrl === '""') return Promise.resolve(null);

  if (cleanUrl.startsWith('data:image/')) {
    try {
      const commaIdx = cleanUrl.indexOf(',');
      if (commaIdx !== -1) {
        return Promise.resolve(Buffer.from(cleanUrl.substring(commaIdx + 1), 'base64'));
      }
    } catch (e) {
      return Promise.resolve(null);
    }
  }

  // Si c'est un chemin relatif local
  if (cleanUrl.startsWith('/assets/')) {
    const publicAssetsPath = path.resolve(__dirname, '../public', cleanUrl.replace(/^\//, ''));
    if (fs.existsSync(publicAssetsPath)) {
      try {
        return Promise.resolve(fs.readFileSync(publicAssetsPath));
      } catch (e) {}
    }
  }

  const targetUrl = cleanUrl.startsWith('/') ? `https://signaid.eu${cleanUrl}` : cleanUrl;

  return new Promise((resolve) => {
    try {
      const client = targetUrl.startsWith('https') ? https : http;
      const req = client.get(targetUrl, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return downloadImageBuffer(res.headers.location).then(resolve);
        }
        if (res.statusCode !== 200) {
          return resolve(null);
        }
        const chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => resolve(Buffer.concat(chunks)));
        res.on('error', () => resolve(null));
      });
      req.on('error', () => resolve(null));
      req.setTimeout(8000, () => {
        req.destroy();
        resolve(null);
      });
    } catch (err) {
      resolve(null);
    }
  });
}

/**
 * Composite le vêtement neutre avec le logo selon les coordonnées exactes
 */
async function compositeGarment({ garmentPath, logoBuffer, posX, posY, scale }) {
  if (!fs.existsSync(garmentPath) || !logoBuffer) return null;

  try {
    const garmentMeta = await sharp(garmentPath).metadata();
    const width = garmentMeta.width || 1200;
    const height = garmentMeta.height || 1200;

    const targetLogoWidth = Math.max(10, Math.round(width * scale));
    const resizedLogo = await sharp(logoBuffer)
      .resize({ width: targetLogoWidth, fit: 'inside' })
      .toBuffer();

    const logoMeta = await sharp(resizedLogo).metadata();
    const left = Math.round((width * posX) - (targetLogoWidth / 2));
    const top = Math.round((height * posY) - ((logoMeta.height || targetLogoWidth) / 2));

    return await sharp(garmentPath)
      .composite([
        {
          input: resizedLogo,
          top: Math.max(0, top),
          left: Math.max(0, left),
        }
      ])
      .png({ quality: 90 })
      .toBuffer();
  } catch (err) {
    console.warn(`[Composite Error]:`, err.message);
    return null;
  }
}

/**
 * Upload un buffer PNG dans Google Cloud Storage et renvoie l'URL publique HTTPS
 */
async function uploadPngToStorage(bucket, buffer, storagePath) {
  const file = bucket.file(storagePath);
  await file.save(buffer, {
    metadata: {
      contentType: 'image/png',
      cacheControl: 'public, max-age=86400'
    },
    resumable: false
  });
  await file.makePublic().catch(() => {});
  return `https://storage.googleapis.com/${bucket.name}/${storagePath}`;
}

/**
 * Traite unitairement un profil
 */
async function migrateSingleDoc(db, bucket, templateFiles, docId, entry, force) {
  const docData = entry.data || {};
  const slug = (docData.slug || docData.companySlug || docData.cleanUid || docId).toLowerCase().trim();
  const companyName = docData.companyName || docData.userData?.companyName || docId.toUpperCase();
  const cleanSlug = slug.replace(/[^a-z0-9]/g, '') || docId;

  // Déterminer les URLs de logos (pour les vêtements, l'audit prime)
  const rawLogoA = docData.auditLogoUrl || docData.logoA || docData.logoUrl || docData.userData?.logoUrl || docData.avatarUrl;
  const rawLogoB = docData.logoB || docData.logoAdaptedUrl || docData.auditLogoUrl || docData.userData?.logoAdaptedUrl || rawLogoA;

  if (!rawLogoA && !rawLogoB) {
    return { status: 'skipped', reason: 'no_logo', docId };
  }

  // Vérifier si des snapshots valides existent déjà
  const currentTshirtFront = docData.products?.tshirt?.frontImageUrl || docData.products?.tshirt?.imageFront || '';
  const currentTshirtBack = docData.products?.tshirt?.backImageUrl || docData.products?.tshirt?.imageBack || '';
  const isAlreadyMigrated = !force && 
    currentTshirtFront && 
    currentTshirtBack && 
    (currentTshirtFront.includes('_snapshot_') || currentTshirtFront.includes('clubvision') || currentTshirtFront.includes('dfazz') || currentTshirtFront.includes('aaronh')) &&
    !currentTshirtFront.includes('JHK') && 
    !currentTshirtBack.includes('JHK');

  if (isAlreadyMigrated) {
    return { status: 'skipped', reason: 'already_migrated', docId };
  }

  // Télécharger les logos en mémoire
  const [logoA_buf, logoB_buf] = await Promise.all([
    downloadImageBuffer(rawLogoA),
    downloadImageBuffer(rawLogoB)
  ]);

  const effectiveLogoFront = logoB_buf || logoA_buf;
  const effectiveLogoBack = logoA_buf || logoB_buf;

  if (!effectiveLogoFront && !effectiveLogoBack) {
    return { status: 'skipped', reason: 'logo_download_failed', docId };
  }

  // Générer les 6 PNGs composites
  const [tFrontBuf, tBackBuf, pFrontBuf, pBackBuf, hFrontBuf, hBackBuf] = await Promise.all([
    compositeGarment({ garmentPath: templateFiles.tshirtFront, logoBuffer: effectiveLogoFront, posX: 0.63, posY: 0.30, scale: 0.18 }),
    compositeGarment({ garmentPath: templateFiles.tshirtBack, logoBuffer: effectiveLogoBack, posX: 0.50, posY: 0.38, scale: 0.38 }),
    compositeGarment({ garmentPath: templateFiles.poloFront, logoBuffer: effectiveLogoFront, posX: 0.64, posY: 0.32, scale: 0.16 }),
    compositeGarment({ garmentPath: templateFiles.poloBack, logoBuffer: effectiveLogoBack, posX: 0.50, posY: 0.40, scale: 0.34 }),
    compositeGarment({ garmentPath: templateFiles.hoodieFront, logoBuffer: effectiveLogoFront, posX: 0.63, posY: 0.34, scale: 0.18 }),
    compositeGarment({ garmentPath: templateFiles.hoodieBack, logoBuffer: effectiveLogoBack, posX: 0.50, posY: 0.44, scale: 0.36 })
  ]);

  const ts = Date.now();
  const uploadJobs = [];

  if (tFrontBuf) uploadJobs.push(uploadPngToStorage(bucket, tFrontBuf, `btp_mockups/${cleanSlug}/web/tFront_snapshot_${ts}.png`));
  else uploadJobs.push(Promise.resolve('/assets/tshirt-black-JHK170.png'));

  if (tBackBuf) uploadJobs.push(uploadPngToStorage(bucket, tBackBuf, `btp_mockups/${cleanSlug}/web/tBack_snapshot_${ts}.png`));
  else uploadJobs.push(Promise.resolve('/assets/tshirt-black-JHK170-dos.png'));

  if (pFrontBuf) uploadJobs.push(uploadPngToStorage(bucket, pFrontBuf, `btp_mockups/${cleanSlug}/web/pFront_snapshot_${ts}.png`));
  else uploadJobs.push(Promise.resolve('/assets/polo-black-JHK510.png'));

  if (pBackBuf) uploadJobs.push(uploadPngToStorage(bucket, pBackBuf, `btp_mockups/${cleanSlug}/web/pBack_snapshot_${ts}.png`));
  else uploadJobs.push(Promise.resolve('/assets/polo-black-JHK510-dos.png'));

  if (hFrontBuf) uploadJobs.push(uploadPngToStorage(bucket, hFrontBuf, `btp_mockups/${cleanSlug}/web/hFront_snapshot_${ts}.png`));
  else uploadJobs.push(Promise.resolve('/assets/hoodie-black-JHK421.png'));

  if (hBackBuf) uploadJobs.push(uploadPngToStorage(bucket, hBackBuf, `btp_mockups/${cleanSlug}/web/hBack_snapshot_${ts}.png`));
  else uploadJobs.push(Promise.resolve('/assets/hoodie-black-JHK421-dos.png'));

  const [tFrontUrl, tBackUrl, pFrontUrl, pBackUrl, hFrontUrl, hBackUrl] = await Promise.all(uploadJobs);

  const productsSchema = {
    tshirt: {
      id: 'tFront',
      name: docData.products?.tshirt?.name || `T-Shirt ${companyName}`,
      price: docData.products?.tshirt?.price || 29.90,
      garment: 'tshirt',
      frontImageUrl: tFrontUrl,
      imageFront: tFrontUrl,
      backImageUrl: tBackUrl,
      imageBack: tBackUrl,
      imageUrl: tFrontUrl,
      aiImageUrl: tFrontUrl
    },
    polo: {
      id: 'pFront',
      name: docData.products?.polo?.name || `Polo ${companyName}`,
      price: docData.products?.polo?.price || 39.90,
      garment: 'polo',
      frontImageUrl: pFrontUrl,
      imageFront: pFrontUrl,
      backImageUrl: pBackUrl,
      imageBack: pBackUrl,
      imageUrl: pFrontUrl,
      aiImageUrl: pFrontUrl
    },
    hoodie: {
      id: 'hFront',
      name: docData.products?.hoodie?.name || `Hoodie ${companyName}`,
      price: docData.products?.hoodie?.price || 49.90,
      garment: 'sweat',
      frontImageUrl: hFrontUrl,
      imageFront: hFrontUrl,
      backImageUrl: hBackUrl,
      imageBack: hBackUrl,
      imageUrl: hFrontUrl,
      aiImageUrl: hFrontUrl
    }
  };

  const updatedItems = [
    {
      id: 'tFront',
      name: docData.products?.tshirt?.name || `T-Shirt ${companyName}`,
      title: docData.products?.tshirt?.name || `T-Shirt ${companyName}`,
      price: 29.90,
      garment: 'tshirt',
      frontImageUrl: tFrontUrl,
      imageFront: tFrontUrl,
      backImageUrl: tBackUrl,
      imageBack: tBackUrl,
      imageUrl: tFrontUrl,
      ai: true,
      aiRemastered: true,
      mechanical: templateFiles.tshirtFront,
      mechanicalFront: templateFiles.tshirtFront,
      mechanicalBack: templateFiles.tshirtBack
    },
    {
      id: 'pFront',
      name: docData.products?.polo?.name || `Polo ${companyName}`,
      title: docData.products?.polo?.name || `Polo ${companyName}`,
      price: 39.90,
      garment: 'polo',
      frontImageUrl: pFrontUrl,
      imageFront: pFrontUrl,
      backImageUrl: pBackUrl,
      imageBack: pBackUrl,
      imageUrl: pFrontUrl,
      ai: true,
      aiRemastered: true,
      mechanical: templateFiles.poloFront,
      mechanicalFront: templateFiles.poloFront,
      mechanicalBack: templateFiles.poloBack
    },
    {
      id: 'hFront',
      name: docData.products?.hoodie?.name || `Hoodie ${companyName}`,
      title: docData.products?.hoodie?.name || `Hoodie ${companyName}`,
      price: 49.90,
      garment: 'hoodie',
      frontImageUrl: hFrontUrl,
      imageFront: hFrontUrl,
      backImageUrl: hBackUrl,
      imageBack: hBackUrl,
      imageUrl: hFrontUrl,
      ai: true,
      aiRemastered: true,
      mechanical: templateFiles.hoodieFront,
      mechanicalFront: templateFiles.hoodieFront,
      mechanicalBack: templateFiles.hoodieBack
    }
  ];

  const patch = {
    products: updatedItems,
    items: updatedItems,
    mockups: updatedItems,
    productsMap: productsSchema,
    aiProductsCount: updatedItems.length,
    updatedAt: new Date().toISOString()
  };

  // Persistance normalisée dans SiteConfigs, prospects, audits, vault
  const targetDocIds = Array.from(new Set([docId, slug, cleanSlug].filter(Boolean)));
  for (const tid of targetDocIds) {
    await Promise.all([
      db.collection('SiteConfigs').doc(tid).set(patch, { merge: true }),
      db.collection('prospects').doc(tid).set(patch, { merge: true }),
      db.collection('audits').doc(tid).set(patch, { merge: true }),
      db.collection('vault').doc(tid).set(patch, { merge: true }),
      db.collection('anonymous_previews').doc(tid).set(patch, { merge: true }).catch(() => {}),
      db.collection('btp_projects').doc(tid).set(patch, { merge: true }).catch(() => {})
    ]);
  }

  // Contrôle de sortie
  console.log(`[BACKEND_PROFILE_PERSIST] Profil ${cleanSlug} mis à jour avec ${updatedItems.length} produits IA.`);

  return { status: 'migrated', docId, companyName };
}

/**
 * Moteur principal de migration des profils vers snapshots statiques
 */
async function runMigrationPipeline(admin, options = {}) {
  const db = admin.firestore();
  const bucket = admin.storage().bucket('signaid-prod-assets');
  const force = !!options.force;
  const targetSingleSlug = options.slug ? String(options.slug).toLowerCase().trim() : null;
  const limit = parseInt(options.limit, 10) || 50;

  const assetsDir = path.resolve(__dirname, 'assets');
  const templateFiles = {
    tshirtFront: path.join(assetsDir, 'tshirt-black-JHK170.png'),
    tshirtBack: path.join(assetsDir, 'tshirt-black-JHK170-dos.png'),
    poloFront: path.join(assetsDir, 'polo-black-JHK510.png'),
    poloBack: path.join(assetsDir, 'polo-black-JHK510-dos.png'),
    hoodieFront: path.join(assetsDir, 'hoodie-black-JHK421.png'),
    hoodieBack: path.join(assetsDir, 'hoodie-black-JHK421-dos.png')
  };

  const results = {
    totalScanned: 0,
    migrated: 0,
    skipped: 0,
    errors: []
  };

  console.log(`[MIGRATION] Démarrage du pipeline de compilation des snapshots... (force=${force}, limit=${limit}, target=${targetSingleSlug || 'TOUS'})`);

  // Rassembler tous les documents de SiteConfigs, anonymous_previews et btp_projects
  const [siteSnap, anonSnap, btpSnap] = await Promise.all([
    db.collection('SiteConfigs').get(),
    db.collection('anonymous_previews').get(),
    db.collection('btp_projects').get()
  ]);

  const docMap = new Map();

  siteSnap.forEach(d => docMap.set(d.id, { id: d.id, collection: 'SiteConfigs', data: d.data() }));
  anonSnap.forEach(d => {
    if (!docMap.has(d.id)) {
      docMap.set(d.id, { id: d.id, collection: 'anonymous_previews', data: d.data() });
    }
  });
  btpSnap.forEach(d => {
    if (!docMap.has(d.id)) {
      docMap.set(d.id, { id: d.id, collection: 'btp_projects', data: d.data() });
    }
  });

  const candidates = [];
  for (const [docId, entry] of docMap.entries()) {
    const docData = entry.data || {};
    const slug = (docData.slug || docData.companySlug || docData.cleanUid || docId).toLowerCase().trim();

    if (targetSingleSlug && slug !== targetSingleSlug && docId.toLowerCase() !== targetSingleSlug) {
      continue;
    }

    const rawLogoA = docData.auditLogoUrl || docData.logoA || docData.logoUrl || docData.userData?.logoUrl || docData.avatarUrl;
    const rawLogoB = docData.logoB || docData.logoAdaptedUrl || docData.auditLogoUrl || docData.userData?.logoAdaptedUrl || rawLogoA;
    if (!rawLogoA && !rawLogoB) {
      results.skipped++;
      continue;
    }

    const currentTshirtFront = docData.products?.tshirt?.frontImageUrl || docData.products?.tshirt?.imageFront || '';
    const currentTshirtBack = docData.products?.tshirt?.backImageUrl || docData.products?.tshirt?.imageBack || '';
    const isAlreadyMigrated = !force && 
      currentTshirtFront && 
      currentTshirtBack && 
      (currentTshirtFront.includes('_snapshot_') || currentTshirtFront.includes('clubvision') || currentTshirtFront.includes('dfazz') || currentTshirtFront.includes('aaronh')) &&
      !currentTshirtFront.includes('JHK') && 
      !currentTshirtBack.includes('JHK');

    if (isAlreadyMigrated) {
      results.skipped++;
      continue;
    }

    candidates.push({ docId, entry });
  }

  console.log(`[MIGRATION] ${candidates.length} profils NON MIGRÉS détectés à compiler.`);

  // Exécuter par lots parallèles de 4
  const CONCURRENCY = 4;
  let processedCount = 0;

  for (let i = 0; i < candidates.length && processedCount < limit; i += CONCURRENCY) {
    const chunk = candidates.slice(i, Math.min(i + CONCURRENCY, candidates.length));
    const chunkPromises = chunk.map(async ({ docId, entry }) => {
      try {
        const res = await migrateSingleDoc(db, bucket, templateFiles, docId, entry, force);
        if (res.status === 'migrated') {
          results.migrated++;
          console.log(`[MIGRATION SUCCÈS] ✅ ${res.companyName} (${res.docId})`);
        } else {
          results.skipped++;
        }
      } catch (err) {
        console.error(`[MIGRATION ERREUR] ${docId}:`, err.message);
        results.errors.push({ docId, error: err.message });
      }
    });

    await Promise.all(chunkPromises);
    processedCount += chunk.length;
  }

  console.log(`[MIGRATION TERMINÉE] Total: ${results.totalScanned}, Migrés: ${results.migrated}, Ignorés: ${results.skipped}, Erreurs: ${results.errors.length}`);
  return results;
}

module.exports = {
  runMigrationPipeline,
  compositeGarment,
  downloadImageBuffer
};
