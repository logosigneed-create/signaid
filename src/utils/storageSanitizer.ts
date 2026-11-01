/**
 * storageSanitizer.ts
 * Protection anti-QuotaExceededError et persistance multi-niveaux (LocalStorage, SessionStorage, IndexedDB).
 * Assainit les données pour éliminer :
 * 1. L'imbrication récursive 'input' dans 'input' (cause de "Property input contains an invalid nested entity")
 * 2. Les références circulaires et valeurs non-sérialisables (undefined, fonctions, symboles)
 * 3. Les dépassements de quota LocalStorage (déport vers IndexedDB haute capacité)
 */

import { saveProjectToIndexedDB, getLatestProjectFromIndexedDB } from './indexedDbStorage';
import { showToast } from './toastEmitter';
import { compressImageForSync } from './imageCompressor';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

/** Taille max (en caractères) d'une Data URL autorisée en localStorage (~90-120 Ko). */
export const MAX_LOCAL_DATA_URI_LENGTH = 120000;

/** Taille maximale (en octets/caractères) d'un asset base64 synchronisé avec Firestore (500 Ko). */
export const MAX_FIRESTORE_BASE64_ASSET_LENGTH = 500 * 1024; // 512,000 octets

/** Taille maximale de sécurité du document Firestore complet (900 Ko). */
export const MAX_FIRESTORE_DOCUMENT_SIZE = 900 * 1024; // 921,600 octets

/** Limite physique absolue Firestore par document (1,048,576 octets). */
export const FIRESTORE_DOCUMENT_HARD_LIMIT = 1048576;

/** Clés temporaires ou orphelines à purger en priorité si le quota LocalStorage est saturé. */
export const HEAVY_PROJECT_STORAGE_KEYS = [
  'signaid_pending_deploy_project',
  '__quota_test__',
];

const purgeLargeDataUri = (val: any) => {
  if (typeof val === 'string' && val.startsWith('data:') && val.length > MAX_LOCAL_DATA_URI_LENGTH) {
    return undefined; // Ne pas stocker les images géantes en localStorage local (réservées à IndexedDB et Cloud)
  }
  if (typeof val === 'string' && val.startsWith('blob:')) {
    return undefined; // URL locale éphémère, invalide après rechargement
  }
  return val;
};

/**
 * Assainit un objet projet pour éliminer :
 * 1. Toute récursion ou imbrication de la clé 'input' (ex: input.input.input)
 * 2. Les références circulaires
 * 3. Les valeurs 'undefined', fonctions, ou nœuds DOM/événements
 * 4. Les buffers volumineux éphémères (rawDjPhoto, rawTshirtLogoOriginal, rawLogoImage)
 */
export function cleanProjectForSerialization(data: any): Record<string, any> {
  if (!data || typeof data !== 'object') return {};

  const seen = new WeakSet();
  seen.add(data);
  if (data.input && typeof data.input === 'object') {
    seen.add(data.input);
  }

  function sanitizeRecursive(val: any, depth = 0): any {
    if (depth > 12 || val === null || val === undefined) return undefined;
    if (typeof val === 'function' || typeof val === 'symbol') return undefined;
    if (typeof val !== 'object') return val;

    // Protection stricte anti-références circulaires
    if (seen.has(val)) return undefined;
    seen.add(val);

    if (Array.isArray(val)) {
      return val
        .map((item) => sanitizeRecursive(item, depth + 1))
        .filter((item) => item !== undefined);
    }

    // Objets Firestore Timestamp / FieldValue
    if (typeof val.toMillis === 'function' || typeof val.isEqual === 'function') {
      return val;
    }
    if (val instanceof Date) {
      return val;
    }

    const out: Record<string, any> = {};
    for (const key of Object.keys(val)) {
      // Ignorer les champs temporaires et buffers bruts
      if (key === 'rawDjPhoto' || key === 'rawTshirtLogoOriginal' || key === 'rawLogoImage') {
        continue;
      }

      // RÈGLE CRUCIALE : Éliminer l'imbrication récursive 'input' dans l'objet input
      // Si on est à l'intérieur de l'objet, ne jamais créer input.input.input...
      if (key === 'input') {
        continue;
      }

      const cleanedChild = sanitizeRecursive(val[key], depth + 1);
      if (cleanedChild !== undefined) {
        out[key] = cleanedChild;
      }
    }

    return out;
  }

  // Si l'objet passé contient lui-même un sous-objet 'input', extraire et fusionner
  const baseObject = (data && typeof data === 'object' && data.input && typeof data.input === 'object')
    ? { ...data.input, ...data }
    : { ...data };

  // Supprimer explicitement toute clé 'input' résiduelle avant la traversée
  delete baseObject.input;

  return sanitizeRecursive(baseObject, 0) || {};
}

/** Parcours récursif pour LocalStorage : purge toute Data URL géante (> 120 Ko). */
const deepPurgeLocalStorage = (value: any, depth = 0): any => {
  if (depth > 8 || value === null || value === undefined) return value;
  if (typeof value === 'string') return purgeLargeDataUri(value);
  if (Array.isArray(value)) return value.map((item) => deepPurgeLocalStorage(item, depth + 1));
  if (typeof value === 'object') {
    const proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null) return value;
    const out: Record<string, any> = {};
    for (const key of Object.keys(value)) {
      const cleaned = deepPurgeLocalStorage(value[key], depth + 1);
      if (cleaned !== undefined) out[key] = cleaned;
    }
    return out;
  }
  return value;
};

/**
 * Sérialise un projet pour le localStorage en excluant les images Base64 > 120 Ko.
 * Le state React en mémoire n'est jamais altéré.
 */
export function sanitizeProjectForLocalStorage(data: any): string {
  if (!data || typeof data !== 'object') return JSON.stringify(data ?? null);

  // 1. Assainissement structurel (sans imbrications circulaires ni 'input.input')
  const cleanData = cleanProjectForSerialization(data);

  // 2. Nettoyage spécifique des images lourdes pour le quota LocalStorage
  cleanData.djPhoto = purgeLargeDataUri(cleanData.djPhoto);
  cleanData.backgroundImage = purgeLargeDataUri(cleanData.backgroundImage);
  cleanData.logoImage = purgeLargeDataUri(cleanData.logoImage);
  cleanData.tshirtCustomLogo = purgeLargeDataUri(cleanData.tshirtCustomLogo);

  if (cleanData.tshirtPreviewImages) {
    cleanData.tshirtPreviewImages = {
      front: purgeLargeDataUri(cleanData.tshirtPreviewImages.front),
      back: purgeLargeDataUri(cleanData.tshirtPreviewImages.back),
    };
  }

  delete cleanData.rawDjPhoto;
  delete cleanData.rawTshirtLogoOriginal;
  delete cleanData.rawLogoImage;

  return JSON.stringify(deepPurgeLocalStorage(cleanData));
}

/**
 * Construit un payload de document Firestore garanti valide sans structure imbriquée invalide :
 * Résout "Property input contains an invalid nested entity" en assurant que doc.input
 * est un objet plat assaini de profondeur 1 sans récursion.
 */
export function buildFirestoreProjectDoc(data: any, metadata: Record<string, any> = {}): Record<string, any> {
  const cleanInput = cleanProjectForSerialization(data);
  delete cleanInput.input;

  const docPayload: Record<string, any> = {
    ...cleanInput,
    ...metadata,
    input: { ...cleanInput },
  };

  // Garantir que docPayload.input ne contient JAMAIS de sous-clé input
  delete docPayload.input.input;

  // Anti-duplication : si des images base64 volumineuses existent déjà au niveau racine,
  // ne pas les dupliquer dans docPayload.input pour éviter de dépasser inutilement la limite Firestore de 1 Mo
  const heavyImageKeys = [
    'djPhoto',
    'backgroundImage',
    'bgImage',
    'customBackground',
    'logoImage',
    'logoUrl',
    'tshirtCustomLogo',
    'tshirtBackCustomLogo',
    'tshirtPreviewImage',
    'flyerImageUrl',
  ];
  for (const k of heavyImageKeys) {
    if (docPayload[k] && typeof docPayload[k] === 'string' && docPayload[k].startsWith('data:') && docPayload[k].length > 45000) {
      delete docPayload.input[k];
    }
  }
  if (docPayload.previewImages) {
    delete docPayload.input.previewImages;
  }
  if (docPayload.tshirtPreviewImages) {
    delete docPayload.input.tshirtPreviewImages;
  }

  return docPayload;
}

/**
 * Retire les clés temporaires/orphelines de projets volumineuses en cas de saturation de quota.
 * IMPORTANT : Ne supprime JAMAIS le projet actif ('signaid_studio_current_project' / 'droppaid_last_event_input').
 */
export function purgeHeavyProjectStorage(): void {
  try {
    for (const key of HEAVY_PROJECT_STORAGE_KEYS) {
      localStorage.removeItem(key);
    }
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      // Supprimer les vieux caches d'événements de démonstration ou drafts obsolètes sans toucher au projet actif
      if (key && (key.startsWith('signaid_studio_draft_old_') || key.startsWith('droppaid_hub_event_demo'))) {
        localStorage.removeItem(key);
      }
    }
    compactLocalProjectsList();
  } catch {
    /* ignore */
  }
}

/**
 * Détecte si un objet projet contient des images en Base64 ou du contenu multimédia lourd.
 */
export function hasBase64Images(obj: any): boolean {
  if (!obj || typeof obj !== 'object') return false;

  const candidateKeys = [
    'backgroundImage', 'customBackground', 'bgImage',
    'djPhoto', 'logoImage', 'logoUrl', 'rawLogoImage',
    'tshirtCustomLogo', 'tshirtBackCustomLogo',
    'flyerImageUrl', 'processedImageBase64', 'imageBase64'
  ];
  for (const k of candidateKeys) {
    if (typeof obj[k] === 'string' && obj[k].startsWith('data:image/')) {
      return true;
    }
  }

  if (obj.tshirtPreviewImages) {
    if (typeof obj.tshirtPreviewImages.front === 'string' && obj.tshirtPreviewImages.front.startsWith('data:image/')) return true;
    if (typeof obj.tshirtPreviewImages.back === 'string' && obj.tshirtPreviewImages.back.startsWith('data:image/')) return true;
  }
  if (obj.previewImages) {
    for (const k of Object.keys(obj.previewImages)) {
      if (typeof obj.previewImages[k] === 'string' && obj.previewImages[k].startsWith('data:image/')) return true;
    }
  }

  if (obj.input && typeof obj.input === 'object') {
    return hasBase64Images(obj.input);
  }

  try {
    const serialized = JSON.stringify(obj);
    if (serialized.includes('"data:image/')) {
      return true;
    }
  } catch {}

  return false;
}

/**
 * Écrit un projet assaini dans le LocalStorage ET dans IndexedDB (secours haute capacité).
 * Si le projet contient des images Base64, désactive le LocalStorage et force l'utilisation exclusive d'IndexedDB.
 * Ne lève jamais d'exception et garantit la persistance durable.
 */
export function safeSaveProjectToLocalStorage(keys: string | string[], data: any): boolean {
  if (!data || typeof data !== 'object') return false;
  const keyList = Array.isArray(keys) ? keys : [keys];

  // 1. Nettoyage structurel préalable (sans imbrications circulaires)
  const cleanData = cleanProjectForSerialization(data);

  // 2. Ancrage immédiat en SessionStorage (sécurité onglet actif avec images VTON haute fidélité)
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('signaid_studio_current_project', JSON.stringify(cleanData));

      if (cleanData.tshirtPreviewImages && (cleanData.tshirtPreviewImages.front || cleanData.tshirtPreviewImages.back)) {
        sessionStorage.setItem('droppaid_vton_preview_images', JSON.stringify(cleanData.tshirtPreviewImages));
        const slug = cleanData.slug || (typeof cleanData.eventName === 'string' ? cleanData.eventName.toLowerCase().replace(/[^a-z0-9]+/g, '-') : '');
        if (slug) {
          sessionStorage.setItem(`droppaid_vton_preview_images_${slug}`, JSON.stringify(cleanData.tshirtPreviewImages));
        }
      }
    }
  } catch {
    /* ignore */
  }

  // 3. Persistance de secours haute capacité dans IndexedDB (asynchrone, non bloquante)
  try {
    saveProjectToIndexedDB(cleanData).catch((err) => {
      console.warn('[AutoSave] Sauvegarde IndexedDB ignorée:', err);
    });
  } catch {
    /* ignore */
  }

  // 4. RÈGLE CRUCIALE AUTO-SAVE & QUOTA LOCALSTORAGE :
  // Si le projet contient des images en Base64 ou du contenu lourd, désactiver l'utilisation
  // du LocalStorage et forcer l'utilisation exclusive d'IndexedDB haute capacité afin de ne jamais saturer le quota navigateur.
  if (hasBase64Images(cleanData) || hasBase64Images(data)) {
    try {
      if (typeof localStorage !== 'undefined') {
        for (const key of keyList) {
          localStorage.removeItem(key);
        }
      }
    } catch {
      /* ignore */
    }
    return true;
  }

  let safePayload: string;
  try {
    safePayload = sanitizeProjectForLocalStorage(cleanData);
  } catch {
    return false;
  }

  // 5. Écriture dans le LocalStorage pour les projets légers
  try {
    if (typeof localStorage !== 'undefined') {
      for (const key of keyList) localStorage.setItem(key, safePayload);
    }
    return true;
  } catch {
    // Quota LocalStorage atteint : libérer les anciennes clés temporaires puis retenter
    purgeHeavyProjectStorage();
    try {
      if (typeof localStorage !== 'undefined') {
        for (const key of keyList) localStorage.setItem(key, safePayload);
      }
      return true;
    } catch {
      console.warn('[AutoSave] Quota LocalStorage saturé. Sauvegarde sécurisée maintenue dans IndexedDB.');
      return false;
    }
  }
}

/**
 * Compacte la liste locale « Mes Projets » (droppaid_admin_projects_v1)
 */
export function compactLocalProjectsList(): void {
  try {
    const raw = localStorage.getItem('droppaid_admin_projects_v1');
    if (!raw || raw.length < MAX_LOCAL_DATA_URI_LENGTH) return;
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return;
    const compacted = list.map((item: any) =>
      item && typeof item === 'object' && item.input
        ? { ...item, input: JSON.parse(sanitizeProjectForLocalStorage(item.input)) }
        : item
    );
    const next = JSON.stringify(compacted);
    if (next.length < raw.length) localStorage.setItem('droppaid_admin_projects_v1', next);
  } catch {
    /* ignore */
  }
}

/**
 * Test d'écriture au montage : vérifie le quota sans jamais purger le travail en cours.
 */
export function ensureLocalStorageQuota(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('__quota_test__', '1');
    localStorage.removeItem('__quota_test__');
  } catch {
    console.warn('[Storage] Quota localStorage saturé détecté au démarrage, nettoyage préventif.');
    purgeHeavyProjectStorage();
  }
  compactLocalProjectsList();
}

/**
 * Détermine si un objet projet contient des données valides ou personnalisées (ex: projet Tesla)
 */
function isValidCustomProject(p: any): boolean {
  if (!p || typeof p !== 'object') return false;
  const effective = p.input && typeof p.input === 'object' ? { ...p.input, ...p } : p;
  const eventName = (effective.eventName || effective.title || effective.name || '').trim();
  const djName = (effective.djName || '').trim();

  // Le projet est valide s'il a un titre ou artiste ou des visuels définis
  const hasTitle = Boolean(eventName && eventName !== 'TITRE 1');
  const hasArtist = Boolean(djName && djName !== 'TITRE 2');
  const hasMedia = Boolean(
    effective.backgroundImage ||
    effective.djPhoto ||
    effective.logoImage ||
    effective.tshirtCustomLogo
  );
  const hasCustomVenueOrText = Boolean(
    (effective.venue && effective.venue !== 'LIEU / CLUB') ||
    effective.punchline ||
    effective.headerTagline
  );

  return hasTitle || hasArtist || hasMedia || hasCustomVenueOrText;
}

/**
 * Restaure les visuels de prévisualisation VTON (mannequin) depuis le cache SessionStorage si indisponibles
 */
export function restoreVtonImagesFromSession(project: any): any {
  if (!project || typeof project !== 'object') return project;
  try {
    if (typeof sessionStorage !== 'undefined') {
      const slug = project.slug || (typeof project.eventName === 'string' ? project.eventName.toLowerCase().replace(/[^a-z0-9]+/g, '-') : '');
      const vtonRaw = (slug ? sessionStorage.getItem(`droppaid_vton_preview_images_${slug}`) : null) ||
        sessionStorage.getItem('droppaid_vton_preview_images');
      if (vtonRaw) {
        const vton = JSON.parse(vtonRaw);
        if (vton && (vton.front || vton.back)) {
          project.tshirtPreviewImages = {
            front: project.tshirtPreviewImages?.front || vton.front || null,
            back: project.tshirtPreviewImages?.back || vton.back || null,
          };
          if (!project.tshirtPreviewImage) {
            project.tshirtPreviewImage = vton.front || vton.back || undefined;
          }
        }
      }
    }
  } catch {}
  return project;
}

/**
 * Récupère le dernier projet actif de manière synchrone au montage (LocalStorage / SessionStorage / Projets récents).
 * Garantit qu'un projet actif (comme Tesla) soit restauré sans écrasement par un état vide ou par défaut.
 */
export function loadLatestProjectSync(): any | null {
  if (typeof window === 'undefined' && typeof localStorage === 'undefined') return null;

  const finish = (candidate: any) => {
    const cleaned = cleanProjectForSerialization(candidate);
    return restoreVtonImagesFromSession(cleaned);
  };

  try {
    // 1. Vérification prioritaire : Cache de SessionStorage de l'onglet actif (sans purge)
    try {
      if (typeof sessionStorage !== 'undefined') {
        const sessionRaw = sessionStorage.getItem('signaid_studio_current_project');
        if (sessionRaw) {
          const parsed = JSON.parse(sessionRaw);
          if (isValidCustomProject(parsed)) {
            return finish(parsed);
          }
        }
      }
    } catch {
      /* ignore */
    }

    // 2. Projet actif direct dans LocalStorage
    const currentRaw = localStorage.getItem('signaid_studio_current_project');
    if (currentRaw) {
      const parsed = JSON.parse(currentRaw);
      if (isValidCustomProject(parsed)) {
        return finish(parsed);
      }
    }

    // 3. Dernier état d'événement enregistré
    const lastEventRaw = localStorage.getItem('droppaid_last_event_input');
    if (lastEventRaw) {
      const parsed = JSON.parse(lastEventRaw);
      if (isValidCustomProject(parsed)) {
        return finish(parsed);
      }
    }

    // 4. Quatrième priorité : Liste "Mes Projets" locale (droppaid_admin_projects_v1)
    const rawProjects = localStorage.getItem('droppaid_admin_projects_v1');
    if (rawProjects) {
      const list = JSON.parse(rawProjects);
      if (Array.isArray(list) && list.length > 0) {
        // Trier par date de modification antéchronologique
        const sorted = [...list].sort((a, b) => {
          const timeA = a.updatedAtMillis || (a.updatedAt ? new Date(a.updatedAt).getTime() : 0);
          const timeB = b.updatedAtMillis || (b.updatedAt ? new Date(b.updatedAt).getTime() : 0);
          return (timeB || 0) - (timeA || 0);
        });

        for (const item of sorted) {
          const candidate = item.input || item;
          if (isValidCustomProject(candidate)) {
            return finish(candidate);
          }
        }
      }
    }

    // 5. Cinquième priorité : Brouillons locaux spécifiques
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('signaid_studio_draft_') && !key.includes('placeholder')) {
        const draftRaw = localStorage.getItem(key);
        if (draftRaw) {
          const parsed = JSON.parse(draftRaw);
          if (isValidCustomProject(parsed)) {
            return finish(parsed);
          }
        }
      }
    }
  } catch (err) {
    console.warn('[Storage] Erreur lors de loadLatestProjectSync :', err);
  }

  return null;
}

/**
 * Récupération asynchrone complète du projet actif :
 * Examine LocalStorage, SessionStorage puis interroge IndexedDB si nécessaire.
 */
export async function loadLatestProject(): Promise<any | null> {
  // 1. Tenter la récupération synchrone rapide
  const syncCandidate = loadLatestProjectSync();
  if (syncCandidate && isValidCustomProject(syncCandidate)) {
    return syncCandidate;
  }

  // 2. Interroger IndexedDB (stockage de secours haute capacité)
  try {
    const idbCandidate = await getLatestProjectFromIndexedDB();
    if (idbCandidate && isValidCustomProject(idbCandidate)) {
      const cleaned = cleanProjectForSerialization(idbCandidate);
      // Ré-ancrer immédiatement en LocalStorage pour les accès futurs
      safeSaveProjectToLocalStorage(['signaid_studio_current_project', 'droppaid_last_event_input'], cleaned);
      return cleaned;
    }
  } catch (err) {
    console.warn('[Storage] Erreur récupération IndexedDB dans loadLatestProject :', err);
  }

  return syncCandidate;
}

/**
 * Calcule la taille estimée d'un objet JSON ou d'une chaîne en octets.
 * Utilise TextEncoder si disponible, ou la longueur UTF-8 estimée.
 */
export function estimatePayloadByteSize(payload: any): number {
  if (payload === null || payload === undefined) return 0;
  try {
    const jsonStr = typeof payload === 'string' ? payload : JSON.stringify(payload);
    if (typeof TextEncoder !== 'undefined') {
      return new TextEncoder().encode(jsonStr).length;
    }
    if (typeof Blob !== 'undefined') {
      return new Blob([jsonStr]).size;
    }
    return jsonStr.length;
  } catch {
    return 0;
  }
}

/**
 * Détecte si une valeur est une chaîne Data URI (Base64).
 */
export function isBase64DataUri(val: any): boolean {
  return typeof val === 'string' && val.startsWith('data:');
}

/**
 * Détermine si une chaîne base64 dépasse le seuil critique (ex: > 500 Ko).
 */
export function isHeavyBase64(val: any, limit = MAX_FIRESTORE_BASE64_ASSET_LENGTH): boolean {
  return typeof val === 'string' && val.startsWith('data:') && val.length > limit;
}

/**
 * Élagage ou compression d'une chaîne base64 individuelle excédant 500 Ko.
 * Tente d'abord une compression via Canvas HTML5 si disponible, sinon tronque/remplace.
 */
export async function sanitizeBase64Asset(
  val: any,
  fallbackUrl: string | undefined = undefined,
  maxBytes = MAX_FIRESTORE_BASE64_ASSET_LENGTH
): Promise<string | undefined> {
  if (typeof val !== 'string') return val;
  if (!val.startsWith('data:')) {
    // Si c'est une URL blob locale éphémère, ne jamais persister dans Firestore
    if (val.startsWith('blob:')) return fallbackUrl;
    return val;
  }

  // Si l'image est déjà sous le seuil des 500 Ko
  if (val.length <= maxBytes) {
    return val;
  }

  console.warn(
    `[Payload Sanitizer] Asset base64 lourd détecté (${Math.round(val.length / 1024)} Ko > 500 Ko). Tentative de compression Canvas...`
  );

  // Tentative de compression via Canvas HTML5 (si DOM disponible)
  try {
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      const compressed = await compressImageForSync(val, 800, 0.70, maxBytes);
      if (compressed && compressed.length <= maxBytes) {
        console.log(
          `[Payload Sanitizer] Asset compressé avec succès via Canvas : ${Math.round(compressed.length / 1024)} Ko.`
        );
        return compressed;
      }
    }
  } catch (err) {
    console.warn('[Payload Sanitizer] Échec de compression Canvas pour asset base64:', err);
  }

  // Si la compression échoue ou si le résultat reste > 500 Ko, remplacer par la référence de secours ou vider
  console.warn(
    `[Payload Sanitizer] Base64 (> 500 Ko) tronqué pour préserver le quota Firestore de 1 Mo.`
  );
  return fallbackUrl;
}

/**
 * Élagage en profondeur des charges lourdes (payload sanitization) avant envoi à Firestore :
 * 1. Supprime les fichiers bruts volumineux (rawDjPhoto, rawTshirtLogoOriginal, rawLogoImage).
 * 2. Purge les URLs blob locales éphémères.
 * 3. Compresse ou tronque toute image base64 > 500 Ko (fonds, logos, bannières, sujets, etc.).
 * 4. Évite la duplication redondante de lourdes chaînes base64 dans input.*.
 */
export async function pruneHeavyPayloadForFirestore(
  data: any,
  options?: {
    maxAssetBytes?: number;
    fallbackUrls?: Record<string, string>;
  }
): Promise<Record<string, any>> {
  if (!data || typeof data !== 'object') return {};

  const maxBytes = options?.maxAssetBytes || MAX_FIRESTORE_BASE64_ASSET_LENGTH;
  const cleanData = cleanProjectForSerialization(data);

  // 1. Suppression stricte des fichiers bruts et buffers volumineux
  delete cleanData.rawDjPhoto;
  delete cleanData.rawTshirtLogoOriginal;
  delete cleanData.rawLogoImage;

  // 2. Traitement des champs d'images connus
  const imageKeys = [
    'djPhoto',
    'backgroundImage',
    'bgImage',
    'customBackground',
    'logoImage',
    'logoUrl',
    'tshirtCustomLogo',
    'tshirtBackCustomLogo',
    'tshirtPreviewImage',
    'flyerImageUrl',
  ];

  for (const key of imageKeys) {
    if (cleanData[key] !== undefined) {
      cleanData[key] = await sanitizeBase64Asset(
        cleanData[key],
        options?.fallbackUrls?.[key],
        maxBytes
      );
    }
  }

  // Traitement des objets d'images groupées (ex: tshirtPreviewImages, previewImages)
  if (cleanData.tshirtPreviewImages && typeof cleanData.tshirtPreviewImages === 'object') {
    cleanData.tshirtPreviewImages = {
      front: (await sanitizeBase64Asset(cleanData.tshirtPreviewImages.front, undefined, maxBytes)) ?? null,
      back: (await sanitizeBase64Asset(cleanData.tshirtPreviewImages.back, undefined, maxBytes)) ?? null,
    };
  }

  if (cleanData.previewImages && typeof cleanData.previewImages === 'object') {
    const nextPreviewImages: Record<string, any> = {};
    for (const [k, v] of Object.entries(cleanData.previewImages)) {
      nextPreviewImages[k] = await sanitizeBase64Asset(v, undefined, maxBytes);
    }
    cleanData.previewImages = nextPreviewImages;
  }

  // 3. Parcours récursif de sécurité pour tout champ personnalisé ou bannières imbriquées
  const deepSanitizeUnknown = async (obj: any, depth = 0): Promise<any> => {
    if (depth > 6 || !obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) {
      const arr = [];
      for (const item of obj) {
        if (typeof item === 'string' && item.startsWith('data:') && item.length > maxBytes) {
          const res = await sanitizeBase64Asset(item, undefined, maxBytes);
          if (res !== undefined) arr.push(res);
        } else if (typeof item === 'object') {
          arr.push(await deepSanitizeUnknown(item, depth + 1));
        } else {
          arr.push(item);
        }
      }
      return arr;
    }

    for (const k of Object.keys(obj)) {
      if (imageKeys.includes(k) || k === 'tshirtPreviewImages' || k === 'previewImages') continue;
      const val = obj[k];
      if (typeof val === 'string' && val.startsWith('data:') && val.length > maxBytes) {
        obj[k] = await sanitizeBase64Asset(val, undefined, maxBytes);
      } else if (typeof val === 'string' && val.startsWith('blob:')) {
        delete obj[k];
      } else if (val && typeof val === 'object' && !(val instanceof Date)) {
        obj[k] = await deepSanitizeUnknown(val, depth + 1);
      }
    }
    return obj;
  };

  await deepSanitizeUnknown(cleanData, 0);

  // 4. Si cleanData.input existe, assainir également et éviter la duplication des gros base64
  if (cleanData.input && typeof cleanData.input === 'object') {
    cleanData.input = cleanProjectForSerialization(cleanData.input);
    delete cleanData.input.rawDjPhoto;
    delete cleanData.input.rawTshirtLogoOriginal;
    delete cleanData.input.rawLogoImage;

    for (const k of imageKeys) {
      if (cleanData[k] && typeof cleanData[k] === 'string' && cleanData[k].startsWith('data:') && cleanData[k].length > 45000) {
        if (cleanData.input[k] === cleanData[k] || (typeof cleanData.input[k] === 'string' && cleanData.input[k].startsWith('data:'))) {
          delete cleanData.input[k];
        }
      }
    }
    if (cleanData.tshirtPreviewImages) delete cleanData.input.tshirtPreviewImages;
    if (cleanData.previewImages) delete cleanData.input.previewImages;
  }

  return cleanData;
}

/**
 * Supprime récursivement toutes les chaînes Data URI Base64 d'un objet,
 * en ne conservant strictement que les métadonnées textuelles, numériques, booléennes et URLs externes (http/https).
 */
export function purgeAllBase64FromObject(obj: any, depth = 0): any {
  if (depth > 10 || obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') {
    if (obj.startsWith('data:') || obj.startsWith('blob:')) {
      return undefined;
    }
    return obj;
  }
  if (typeof obj !== 'object') return obj;
  if (obj instanceof Date) return obj;
  if (typeof obj.toMillis === 'function' || typeof obj.isEqual === 'function') return obj;

  if (Array.isArray(obj)) {
    return obj
      .map((item) => purgeAllBase64FromObject(item, depth + 1))
      .filter((item) => item !== undefined);
  }

  const out: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    const cleaned = purgeAllBase64FromObject(value, depth + 1);
    if (cleaned !== undefined) {
      out[key] = cleaned;
    }
  }
  return out;
}

/**
 * Garde-taille Firestore (Size Guard) :
 * Vérifie la taille estimée du document (seuil de sécurité : 900 Ko pour le plafond de 1 Mo).
 * Si la taille dépasse 900 Ko :
 * 1. Déclenche un avertissement explicite dans la console.
 * 2. Purge automatiquement les champs lourds non indispensables (textures de fond raw base64, aperçus redondants).
 * 3. Si toujours > 900 Ko, purge l'ensemble des données base64 pour ne stocker que les métadonnées textuelles et URLs externes.
 */
export function guardFirestorePayloadSize(
  payload: any,
  maxDocSize = MAX_FIRESTORE_DOCUMENT_SIZE
): Record<string, any> {
  if (!payload || typeof payload !== 'object') return payload;

  let currentSize = estimatePayloadByteSize(payload);
  if (currentSize <= maxDocSize) {
    return payload;
  }

  console.warn(
    `[Firestore Size Guard] ALERTE : Taille estimée du payload (${Math.round(currentSize / 1024)} Ko) dépasse le seuil critique de 900 Ko (limite Firestore : 1 Mo). Purge automatique préventive en cours...`
  );

  // Cloner pour éviter toute mutation inattendue de l'état en mémoire
  let guarded: Record<string, any> = JSON.parse(JSON.stringify(payload));

  // Étape 1 : Purge des aperçus redondants et doublons volumineux
  if (guarded.previewImages) {
    delete guarded.previewImages;
  }
  if (guarded.tshirtPreviewImages) {
    delete guarded.tshirtPreviewImages;
  }
  if (typeof guarded.tshirtPreviewImage === 'string' && guarded.tshirtPreviewImage.startsWith('data:')) {
    delete guarded.tshirtPreviewImage;
  }
  if (typeof guarded.flyerImageUrl === 'string' && guarded.flyerImageUrl.startsWith('data:')) {
    delete guarded.flyerImageUrl;
  }

  // Éviter la duplication géante des images dans guarded.input
  if (guarded.input && typeof guarded.input === 'object') {
    delete guarded.input.previewImages;
    delete guarded.input.tshirtPreviewImages;
    delete guarded.input.tshirtPreviewImage;
    delete guarded.input.flyerImageUrl;
    if (guarded.customBackground && guarded.input.customBackground === guarded.customBackground) {
      delete guarded.input.customBackground;
    }
    if (guarded.backgroundImage && guarded.input.backgroundImage === guarded.backgroundImage) {
      delete guarded.input.backgroundImage;
    }
    if (guarded.djPhoto && guarded.input.djPhoto === guarded.djPhoto) {
      delete guarded.input.djPhoto;
    }
  }

  currentSize = estimatePayloadByteSize(guarded);

  // Étape 1b : Si > 900 Ko, élaguer les doublons d'images de fond
  if (currentSize > maxDocSize) {
    if (guarded.customBackground && guarded.backgroundImage && guarded.customBackground === guarded.backgroundImage) {
      delete guarded.customBackground;
    }
    if (guarded.bgImage && (guarded.bgImage === guarded.backgroundImage || guarded.bgImage === guarded.customBackground)) {
      delete guarded.bgImage;
    }
    currentSize = estimatePayloadByteSize(guarded);
  }

  // Étape 1c : Si encore > 900 Ko, supprimer les textures brutes non compressées
  if (currentSize > maxDocSize) {
    if (typeof guarded.customBackground === 'string' && guarded.customBackground.startsWith('data:') && guarded.customBackground.length > 300000) {
      delete guarded.customBackground;
    }
    if (typeof guarded.backgroundImage === 'string' && guarded.backgroundImage.startsWith('data:') && guarded.backgroundImage.length > 300000) {
      delete guarded.backgroundImage;
    }
    if (typeof guarded.bgImage === 'string' && guarded.bgImage.startsWith('data:') && guarded.bgImage.length > 300000) {
      delete guarded.bgImage;
    }
    currentSize = estimatePayloadByteSize(guarded);
  }

  // Étape 2 : Si la taille dépasse encore 900 Ko, purger les logos textiles secondaires si > 150 Ko
  if (currentSize > maxDocSize) {
    console.warn(
      `[Firestore Size Guard] Payload toujours lourd (${Math.round(currentSize / 1024)} Ko > 900 Ko). Purge des visuels secondaires...`
    );
    if (typeof guarded.tshirtCustomLogo === 'string' && guarded.tshirtCustomLogo.startsWith('data:') && guarded.tshirtCustomLogo.length > 150000) {
      delete guarded.tshirtCustomLogo;
    }
    if (typeof guarded.tshirtBackCustomLogo === 'string' && guarded.tshirtBackCustomLogo.startsWith('data:') && guarded.tshirtBackCustomLogo.length > 150000) {
      delete guarded.tshirtBackCustomLogo;
    }
    if (guarded.input && typeof guarded.input === 'object') {
      delete guarded.input.tshirtCustomLogo;
      delete guarded.input.tshirtBackCustomLogo;
    }
    currentSize = estimatePayloadByteSize(guarded);
  }

  // Étape 3 : Si la taille dépasse encore 900 Ko, purger TOUT le base64 résiduel (mode métadonnées textuelles pures)
  if (currentSize > maxDocSize) {
    console.warn(
      `[Firestore Size Guard] Payload critique (${Math.round(currentSize / 1024)} Ko > 900 Ko). Bascule en mode métadonnées textuelles pures et URLs externes.`
    );
    guarded = purgeAllBase64FromObject(guarded);
    currentSize = estimatePayloadByteSize(guarded);
    console.info(
      `[Firestore Size Guard] Taille finale après purge complète du base64 : ${Math.round(currentSize / 1024)} Ko.`
    );
    return guarded;
  }

  console.info(
    `[Firestore Size Guard] Taille stabilisée avec succès : ${Math.round(currentSize / 1024)} Ko (< 900 Ko).`
  );
  return guarded;
}

/**
 * Détecte si une exception levée par Firebase/Firestore correspond à un dépassement de quota
 * ou à la limite de 1 Mo par document (Document exceeds the maximum allowed size of 1,048,576 bytes).
 */
export function isFirestoreDocumentSizeError(err: any): boolean {
  if (!err) return false;
  const code = (err.code || '').toString().toLowerCase();
  const name = (err.name || '').toString().toLowerCase();
  const msg = (err.message || '').toString().toLowerCase();

  return (
    code === 'resource-exhausted' ||
    msg.includes('document exceeds the maximum allowed size') ||
    msg.includes('exceeds the maximum allowed size') ||
    msg.includes('1,048,576 bytes') ||
    msg.includes('1048576') ||
    msg.includes('maximum allowed size') ||
    msg.includes('payload too large') ||
    msg.includes('quota exceeded') ||
    (code === 'invalid-argument' && (
      msg.includes('size') ||
      msg.includes('large') ||
      msg.includes('exceed') ||
      msg.includes('1048576') ||
      msg.includes('1,048,576')
    ))
  );
}

export interface SafeFirestoreSyncOptions {
  merge?: boolean;
  localBackupKeys?: string[];
  rawInputForLocal?: any;
  suppressToast?: boolean;
}

export interface SafeFirestoreSyncResult {
  success: boolean;
  isSizeError?: boolean;
  error?: any;
  payloadGuarded?: any;
}

/**
 * Exécute un setDoc Firestore sécurisé avec élagage automatique des bases64 > 500 Ko,
 * garde-taille à 900 Ko, sauvegarde de secours locale (localStorage/IndexedDB) et
 * gestion propre de l'erreur FirebaseError: Document exceeds the maximum allowed size.
 */
export async function safeFirestoreSetDoc(
  docRef: any,
  payload: any,
  options: { merge?: boolean } = { merge: true },
  syncMeta?: SafeFirestoreSyncOptions
): Promise<SafeFirestoreSyncResult> {
  // 1. Sauvegarde locale préalable systématique (garantie zéro perte de données utilisateur)
  if (syncMeta?.localBackupKeys && syncMeta.localBackupKeys.length > 0) {
    safeSaveProjectToLocalStorage(
      syncMeta.localBackupKeys,
      syncMeta.rawInputForLocal || payload
    );
  }

  // 2. Élagage des charges lourdes (Base64 > 500 Ko compressés ou tronqués)
  let cleanPayload: Record<string, any>;
  try {
    cleanPayload = await pruneHeavyPayloadForFirestore(payload);
  } catch (pruneErr) {
    console.warn('[FirestoreSync] Avertissement élagage charges lourdes :', pruneErr);
    cleanPayload = cleanProjectForSerialization(payload);
  }

  // 3. Garde-taille globale (< 900 Ko)
  const guardedPayload = guardFirestorePayloadSize(cleanPayload);

  // 4. Appel setDoc Firestore
  try {
    await setDoc(docRef, guardedPayload, options);
    return {
      success: true,
      payloadGuarded: guardedPayload,
    };
  } catch (err: any) {
    if (isFirestoreDocumentSizeError(err)) {
      console.error(
        '[Firestore] Erreur de dépassement de quota 1 Mo interceptée lors de la synchronisation :',
        err
      );

      // Re-garantir la persistance locale
      if (syncMeta?.localBackupKeys && syncMeta.localBackupKeys.length > 0) {
        safeSaveProjectToLocalStorage(
          syncMeta.localBackupKeys,
          syncMeta.rawInputForLocal || payload
        );
      }

      // Alerte explicite pour l'utilisateur dans l'interface
      if (!syncMeta?.suppressToast) {
        showToast(
          "L'image intégrée est trop lourde pour être synchronisée en base, veuillez utiliser une image plus légère",
          'warning',
          6000
        );
      }

      // Sauvegarde de secours Firestore (métadonnées textuelles uniquement)
      try {
        const textOnlyPayload = purgeAllBase64FromObject(guardedPayload);
        await setDoc(docRef, textOnlyPayload, options);
        console.log(
          '[Firestore] Sauvegarde de secours textuelle réussie suite à dépassement de quota image.'
        );
      } catch (backupErr) {
        console.warn(
          '[Firestore] Sauvegarde Firestore de secours échouée (sauvegarde locale préservée) :',
          backupErr
        );
      }

      return {
        success: false,
        isSizeError: true,
        error: err,
        payloadGuarded: guardedPayload,
      };
    }

    console.warn('[Firestore] Erreur setDoc :', err?.message || err);
    return {
      success: false,
      isSizeError: false,
      error: err,
      payloadGuarded: guardedPayload,
    };
  }
}

/**
 * Exécute un updateDoc Firestore sécurisé avec garde-taille et gestion propre de l'erreur de quota 1 Mo.
 */
export async function safeFirestoreUpdateDoc(
  docRef: any,
  payload: any,
  syncMeta?: SafeFirestoreSyncOptions
): Promise<SafeFirestoreSyncResult> {
  if (syncMeta?.localBackupKeys && syncMeta.localBackupKeys.length > 0) {
    safeSaveProjectToLocalStorage(
      syncMeta.localBackupKeys,
      syncMeta.rawInputForLocal || payload
    );
  }

  let cleanPayload: Record<string, any>;
  try {
    cleanPayload = await pruneHeavyPayloadForFirestore(payload);
  } catch {
    cleanPayload = cleanProjectForSerialization(payload);
  }

  const guardedPayload = guardFirestorePayloadSize(cleanPayload);

  try {
    await updateDoc(docRef, guardedPayload);
    return {
      success: true,
      payloadGuarded: guardedPayload,
    };
  } catch (err: any) {
    if (isFirestoreDocumentSizeError(err)) {
      console.error(
        '[Firestore] Erreur de dépassement de quota 1 Mo interceptée à l\'updateDoc :',
        err
      );

      if (syncMeta?.localBackupKeys && syncMeta.localBackupKeys.length > 0) {
        safeSaveProjectToLocalStorage(
          syncMeta.localBackupKeys,
          syncMeta.rawInputForLocal || payload
        );
      }

      if (!syncMeta?.suppressToast) {
        showToast(
          "L'image intégrée est trop lourde pour être synchronisée en base, veuillez utiliser une image plus légère",
          'warning',
          6000
        );
      }

      try {
        const textOnlyPayload = purgeAllBase64FromObject(guardedPayload);
        await updateDoc(docRef, textOnlyPayload);
      } catch (backupErr) {
        console.warn('[Firestore] UpdateDoc de secours textuelle échouée :', backupErr);
      }

      return {
        success: false,
        isSizeError: true,
        error: err,
        payloadGuarded: guardedPayload,
      };
    }

    return {
      success: false,
      isSizeError: false,
      error: err,
      payloadGuarded: guardedPayload,
    };
  }
}

/**
 * Fonction unifiée de synchronisation d'un événement ou projet vers Firestore (syncHubToFirestore).
 * Applique l'élagage des charges lourdes (> 500 Ko), la garde-taille (< 900 Ko) et la persistance locale de secours.
 */
export async function syncHubToFirestore(
  collectionName: string,
  docId: string,
  payload: any,
  options?: SafeFirestoreSyncOptions
): Promise<SafeFirestoreSyncResult> {
  const targetDocRef = doc(db, collectionName, docId);
  return safeFirestoreSetDoc(targetDocRef, payload, { merge: options?.merge ?? true }, options);
}
