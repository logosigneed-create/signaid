import { SiteConfig, defaultConfig } from "./store";
import { collection, getDocs, limit, orderBy, query, doc, getDoc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

export interface ProfileSummary {
  id: string;
  slug: string;
  companyName: string;
  activitySector?: string;
  logoUrl?: string;
  accentColor?: string;
  theme?: 'dark' | 'light';
  source: 'local' | 'cloud' | 'audit';
  lastUpdated?: string;
  mockupCount?: number;
  previewUrls?: string[];
  userData?: {
    email?: string;
    phone?: string;
    name?: string;
    company?: string;
    message?: string;
  };
  siteConfig?: Partial<SiteConfig>;
}

// BtpAuditDB IndexedDB Configuration (from Audit Pipeline)
const DB_NAME = 'BtpAuditDB';
const STORE_NAME = 'heavy_assets';

export async function openAuditDB(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !window.indexedDB) return null;
  return new Promise((resolve) => {
    try {
      const r = window.indexedDB.open(DB_NAME, 1);
      r.onupgradeneeded = () => {
        try {
          r.result.createObjectStore(STORE_NAME);
        } catch { }
      };
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function getFromAuditDB(key: string): Promise<any> {
  const db = await openAuditDB();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function getAllAuditDBKeys(): Promise<string[]> {
  const db = await openAuditDB();
  if (!db) return [];
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      if (store.getAllKeys) {
        const req = store.getAllKeys();
        req.onsuccess = () => resolve((req.result as string[]) || []);
        req.onerror = () => resolve([]);
      } else {
        const keys: string[] = [];
        const req = store.openCursor();
        req.onsuccess = (e: any) => {
          const cursor = e.target.result;
          if (cursor) {
            keys.push(String(cursor.key));
            cursor.continue();
          } else {
            resolve(keys);
          }
        };
        req.onerror = () => resolve(keys);
      }
    } catch {
      resolve([]);
    }
  });
}

// Verified Seed Data from pipeline execution for clubvisionroom
export const CLUBVISION_MOCKUP_ASSETS = {
  tFront: 'https://firebasestorage.googleapis.com/v0/b/signaid-d2d08.firebasestorage.app/o/btp_mockups%2Fclubvisionroom%2Fweb%2FtFront_1788693827681.png?alt=media&token=351044ba-98e5-4139-b194-e182b80fb846',
  tBack: 'https://firebasestorage.googleapis.com/v0/b/signaid-d2d08.firebasestorage.app/o/btp_mockups%2Fclubvisionroom%2Fweb%2FtBack_1788693827685.png?alt=media&token=43c3717a-2294-4098-9b61-24dfb79df8c0',
  pFront: 'https://firebasestorage.googleapis.com/v0/b/signaid-d2d08.firebasestorage.app/o/btp_mockups%2Fclubvisionroom%2Fweb%2FpFront_1788693827686.png?alt=media&token=c94713f8-4ca2-4cdb-b959-82d5ae6d2c4b',
  pBack: 'https://firebasestorage.googleapis.com/v0/b/signaid-d2d08.firebasestorage.app/o/btp_mockups%2Fclubvisionroom%2Fweb%2FpBack_1788693827687.png?alt=media&token=cdc6ba8f-418a-4ea7-9629-523e3f607012',
  hFront: 'https://firebasestorage.googleapis.com/v0/b/signaid-d2d08.firebasestorage.app/o/btp_mockups%2Fclubvisionroom%2Fweb%2FhFront_1788693827689.png?alt=media&token=f1affb8b-0f66-4f8e-899b-b1da4c825f8c',
  hBack: 'https://firebasestorage.googleapis.com/v0/b/signaid-d2d08.firebasestorage.app/o/btp_mockups%2Fclubvisionroom%2Fweb%2FhBack_1788693827690.png?alt=media&token=ee00ba8d-0a66-45c6-856c-fe6a4b122320',
  tankFront: 'https://firebasestorage.googleapis.com/v0/b/signaid-d2d08.firebasestorage.app/o/btp_mockups%2Fclubvisionroom%2Fweb%2FtankFront_1788698451810.png?alt=media&token=32465cf4-7a0c-48aa-a010-08c999a7d0d1',
  tankBack: 'https://firebasestorage.googleapis.com/v0/b/signaid-d2d08.firebasestorage.app/o/btp_mockups%2Fclubvisionroom%2Fweb%2FtankBack_1788693827691.png?alt=media&token=042abb56-7970-4a26-92dc-2de88698e7a6',
  heavyFront: 'https://firebasestorage.googleapis.com/v0/b/signaid-d2d08.firebasestorage.app/o/btp_mockups%2Fclubvisionroom%2Fweb%2FheavyFront_1788693827695.png?alt=media&token=65d0698f-0070-4fc8-a827-0861153b2113',
  heavyBack: 'https://firebasestorage.googleapis.com/v0/b/signaid-d2d08.firebasestorage.app/o/btp_mockups%2Fclubvisionroom%2Fweb%2FheavyBack_1788693827696.png?alt=media&token=5645a2aa-48ba-43ba-ad68-1916f9d238e3',
  tankWhiteFront: 'https://firebasestorage.googleapis.com/v0/b/signaid-d2d08.firebasestorage.app/o/btp_mockups%2Fclubvisionroom%2Fweb%2FtankWhiteFront_1788693827692.png?alt=media&token=3602273b-ef06-4dbd-8dae-809894d7e147',
  tankWhiteBack: 'https://firebasestorage.googleapis.com/v0/b/signaid-d2d08.firebasestorage.app/o/btp_mockups%2Fclubvisionroom%2Fweb%2FtankWhiteBack_1788693827694.png?alt=media&token=0e6b5a90-6ffe-499d-9a91-71043c6cb636'
};

export const CLUBVISION_GARMENT_MOCKUPS: Record<string, string> = {
  tshirt_front: CLUBVISION_MOCKUP_ASSETS.tFront,
  tshirt_back: CLUBVISION_MOCKUP_ASSETS.tBack,
  tshirt: CLUBVISION_MOCKUP_ASSETS.tFront,
  tFront: CLUBVISION_MOCKUP_ASSETS.tFront,
  tBack: CLUBVISION_MOCKUP_ASSETS.tBack,
  polo_front: CLUBVISION_MOCKUP_ASSETS.pFront,
  polo_back: CLUBVISION_MOCKUP_ASSETS.pBack,
  polo: CLUBVISION_MOCKUP_ASSETS.pFront,
  pFront: CLUBVISION_MOCKUP_ASSETS.pFront,
  pBack: CLUBVISION_MOCKUP_ASSETS.pBack,
  hoodie_front: CLUBVISION_MOCKUP_ASSETS.hFront,
  hoodie_back: CLUBVISION_MOCKUP_ASSETS.hBack,
  hoodie: CLUBVISION_MOCKUP_ASSETS.hFront,
  sweat_front: CLUBVISION_MOCKUP_ASSETS.hFront,
  sweat_back: CLUBVISION_MOCKUP_ASSETS.hBack,
  sweat: CLUBVISION_MOCKUP_ASSETS.hFront,
  hFront: CLUBVISION_MOCKUP_ASSETS.hFront,
  hBack: CLUBVISION_MOCKUP_ASSETS.hBack,
  tank_front: CLUBVISION_MOCKUP_ASSETS.tankFront,
  tank_back: CLUBVISION_MOCKUP_ASSETS.tankBack,
  tank_top: CLUBVISION_MOCKUP_ASSETS.tankFront,
  tankFront: CLUBVISION_MOCKUP_ASSETS.tankFront,
  tankBack: CLUBVISION_MOCKUP_ASSETS.tankBack,
  heavy_front: CLUBVISION_MOCKUP_ASSETS.heavyFront,
  heavy_back: CLUBVISION_MOCKUP_ASSETS.heavyBack,
  tshirt_oversize: CLUBVISION_MOCKUP_ASSETS.heavyFront,
  heavyFront: CLUBVISION_MOCKUP_ASSETS.heavyFront,
  heavyBack: CLUBVISION_MOCKUP_ASSETS.heavyBack,
  tank_white_front: CLUBVISION_MOCKUP_ASSETS.tankWhiteFront,
  tank_white_back: CLUBVISION_MOCKUP_ASSETS.tankWhiteBack,
  tankWhiteFront: CLUBVISION_MOCKUP_ASSETS.tankWhiteFront,
  tankWhiteBack: CLUBVISION_MOCKUP_ASSETS.tankWhiteBack,
};


export const SEED_PROFILES: Record<string, ProfileSummary> = {
  lacuveabiere: {
    id: 'lacuveabiere',
    slug: 'lacuveabiere',
    companyName: 'LA CUVE À BIÈRE',
    activitySector: 'Brasserie artisanale & Bar Craft Beer',
    logoUrl: '',
    accentColor: '#f59e0b',
    theme: 'dark',
    source: 'audit',
    lastUpdated: 'Pipeline Audit Visuel',
    userData: {
      name: 'Direction La Cuve à Bière',
      company: 'LA CUVE À BIÈRE',
      email: 'contact@lacuveabiere.fr',
      phone: '+33 6 00 00 00 00',
      message: 'Initialisation vitrine La Cuve à Bière'
    }
  },
  clubvisionroom: {
    id: 'clubvisionroom',
    slug: 'clubvisionroom',
    companyName: 'CLUBVISIONROOM',
    activitySector: 'Événementiel & Audiovisuel - Vêtements de Scène & Merchandising Clubbing',
    logoUrl: 'https://storage.googleapis.com/signaid-prod-assets/logos/mt074jnaldxn/1787803061043_logo_dtf.png',
    accentColor: 'rgb(59, 130, 246)',
    theme: 'dark',
    source: 'audit',
    lastUpdated: 'Initialisé via Pipeline Audit',
    mockupCount: 12,
    previewUrls: Object.values(CLUBVISION_MOCKUP_ASSETS),
    userData: {
      name: 'Direction CLUBVISIONROOM',
      company: 'CLUBVISIONROOM',
      email: 'contact@clubvisionroom.com',
      phone: '+33 6 12 34 56 78',
      message: 'Initialisation via Pipeline Audit Visuel 3D et dotation scénique'
    }
  }
};

/**
 * Ensures baseline local storage keys exist in the current browser origin.
 */
export function ensureLocalProfileSeeded(slug: string) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  const cleanSlug = slug.toLowerCase().trim();
  const seed = SEED_PROFILES[cleanSlug];
  if (!seed) return;

  try {
    const metaKey = `meta_${cleanSlug}`;
    if (!localStorage.getItem(metaKey)) {
      localStorage.setItem(metaKey, JSON.stringify({
        displayName: seed.companyName,
        logoUrl: seed.logoUrl,
        primaryColor: seed.accentColor,
        theme: seed.theme,
        initials: 'CVR',
        isReady: true
      }));
    }

    const sessionKey = `btp_session_${cleanSlug}`;
    const sessionObjKey = `session_obj_${cleanSlug}`;
    const isVisionSlug = cleanSlug === 'clubvisionroom' || cleanSlug === 'visionroom' || cleanSlug === 'clubvision';

    const existingSession = localStorage.getItem(sessionKey);
    let shouldUpdateSession = !existingSession;
    if (existingSession && isVisionSlug) {
      try {
        const parsed = JSON.parse(existingSession);
        const mockups = Array.isArray(parsed.mockups) ? parsed.mockups : [];
        const hasTankWhite = mockups.some((m: any) => m.id === 'tankWhiteFront' || m.id === 'tankWhiteBack');
        const hasStudioTee = mockups.some((m: any) => (m.url || m.imageUrl || '').includes('studio'));
        const hasAllMockups = mockups.length >= 10;
        if (!hasTankWhite || !hasAllMockups || !hasStudioTee) shouldUpdateSession = true;
      } catch {
        shouldUpdateSession = true;
      }
    }

    if (shouldUpdateSession) {
      const mockupsList = seed.previewUrls?.map((url, i) => {
        const isTankWhite = url.includes('tankWhiteFront') || url.includes('tankWhiteBack');
        const isTank = !isTankWhite && (url.includes('tankFront') || url.includes('tankBack') || url.includes('tank'));
        const isHeavy = url.includes('heavyFront') || url.includes('heavyBack') || url.includes('heavy');
        const isBack = url.includes('Back') || url.includes('back');

        let id = `mockup_${i}`;
        let garment = 'tshirt';
        let color = 'Noir';
        if (isTankWhite) {
          id = isBack ? 'tankWhiteBack' : 'tankWhiteFront';
          garment = 'tank_top';
          color = 'Blanc';
        } else if (isTank) {
          id = isBack ? 'tankBack' : 'tankFront';
          garment = 'tank_top';
        } else if (isHeavy) {
          id = isBack ? 'heavyBack' : 'heavyFront';
          garment = 'tshirt_oversize';
        } else if (url.includes('hFront') || url.includes('hBack') || url.includes('hoodie')) {
          id = isBack ? 'hBack' : 'hFront';
          garment = 'sweat';
        } else if (url.includes('pFront') || url.includes('pBack') || url.includes('polo')) {
          id = isBack ? 'pBack' : 'pFront';
          garment = 'polo';
        } else if (url.includes('tFront') || url.includes('tBack') || url.includes('tshirt')) {
          id = isBack ? 'tBack' : 'tFront';
          garment = 'tshirt';
        }

        return {
          id,
          garment,
          color,
          view: isBack ? 'back' : 'front',
          url,
          frontImageUrl: !isBack ? url : undefined,
          backImageUrl: isBack ? url : undefined,
          ai: url,
          aiRemastered: url,
          hasAi: true
        };
      }) || [];

      const payload = {
        userData: seed.userData,
        mockups: mockupsList,
        products: isVisionSlug ? {
          tshirt: {
            id: 'tFront',
            name: 'T-Shirt Premium Club Vision',
            garment: 'tshirt',
            price: 29.99,
            frontImageUrl: CLUBVISION_MOCKUP_ASSETS.tFront,
            backImageUrl: CLUBVISION_MOCKUP_ASSETS.tBack,
            ai: CLUBVISION_MOCKUP_ASSETS.tFront,
            aiRemastered: CLUBVISION_MOCKUP_ASSETS.tFront,
            aiBack: CLUBVISION_MOCKUP_ASSETS.tBack,
            aiRemasteredBack: CLUBVISION_MOCKUP_ASSETS.tBack
          },
          polo: {
            id: 'pFront',
            name: 'Polo Premium Club Vision',
            garment: 'polo',
            price: 39.00,
            frontImageUrl: CLUBVISION_MOCKUP_ASSETS.pFront,
            backImageUrl: CLUBVISION_MOCKUP_ASSETS.pBack,
            ai: CLUBVISION_MOCKUP_ASSETS.pFront,
            aiRemastered: CLUBVISION_MOCKUP_ASSETS.pFront,
            aiBack: CLUBVISION_MOCKUP_ASSETS.pBack,
            aiRemasteredBack: CLUBVISION_MOCKUP_ASSETS.pBack
          },
          hoodie: {
            id: 'hFront',
            name: 'Hoodie VIP Club Vision',
            garment: 'sweat',
            price: 49.00,
            frontImageUrl: CLUBVISION_MOCKUP_ASSETS.hFront,
            backImageUrl: CLUBVISION_MOCKUP_ASSETS.hBack,
            ai: CLUBVISION_MOCKUP_ASSETS.hFront,
            aiRemastered: CLUBVISION_MOCKUP_ASSETS.hFront,
            aiBack: CLUBVISION_MOCKUP_ASSETS.hBack,
            aiRemasteredBack: CLUBVISION_MOCKUP_ASSETS.hBack
          },
          tank_top: {
            id: 'tankFront',
            name: 'Débardeur Vision Room',
            garment: 'tank_top',
            price: 27.99,
            frontImageUrl: CLUBVISION_MOCKUP_ASSETS.tankFront,
            backImageUrl: CLUBVISION_MOCKUP_ASSETS.tankBack,
            ai: CLUBVISION_MOCKUP_ASSETS.tankFront,
            aiRemastered: CLUBVISION_MOCKUP_ASSETS.tankFront,
            aiBack: CLUBVISION_MOCKUP_ASSETS.tankBack,
            aiRemasteredBack: CLUBVISION_MOCKUP_ASSETS.tankBack
          },
          tshirt_oversize: {
            id: 'heavyFront',
            name: 'T-Shirt Heavyweight Oversize',
            garment: 'tshirt_oversize',
            price: 34.99,
            frontImageUrl: CLUBVISION_MOCKUP_ASSETS.heavyFront,
            backImageUrl: CLUBVISION_MOCKUP_ASSETS.heavyBack,
            ai: CLUBVISION_MOCKUP_ASSETS.heavyFront,
            aiRemastered: CLUBVISION_MOCKUP_ASSETS.heavyFront,
            aiBack: CLUBVISION_MOCKUP_ASSETS.heavyBack,
            aiRemasteredBack: CLUBVISION_MOCKUP_ASSETS.heavyBack
          },
          tank_top_white: {
            id: 'tankWhiteFront',
            name: 'Débardeur Blanc Vision Room',
            garment: 'tank_top',
            color: 'Blanc',
            price: 27.99,
            frontImageUrl: CLUBVISION_MOCKUP_ASSETS.tankWhiteFront,
            backImageUrl: CLUBVISION_MOCKUP_ASSETS.tankWhiteBack,
            ai: CLUBVISION_MOCKUP_ASSETS.tankWhiteFront,
            aiRemastered: CLUBVISION_MOCKUP_ASSETS.tankWhiteFront,
            aiBack: CLUBVISION_MOCKUP_ASSETS.tankWhiteBack,
            aiRemasteredBack: CLUBVISION_MOCKUP_ASSETS.tankWhiteBack
          }
        } : undefined,
        garmentMockups: isVisionSlug ? CLUBVISION_GARMENT_MOCKUPS : undefined
      };

      localStorage.setItem(sessionKey, JSON.stringify(payload));
      localStorage.setItem(sessionObjKey, JSON.stringify(payload));
    }
  } catch (e) {
    console.warn('Could not seed local storage:', e);
  }
}

export function getDeletedProfiles(): Set<string> {
  if (typeof window === 'undefined' || !window.localStorage) return new Set();
  try {
    const raw = localStorage.getItem('signaid_deleted_profiles');
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        return new Set(arr.map((s: string) => String(s).toLowerCase()));
      }
    }
  } catch { }
  return new Set();
}

export function markProfileAsDeleted(slug: string) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const deleted = getDeletedProfiles();
    deleted.add(slug.toLowerCase().trim());
    localStorage.setItem('signaid_deleted_profiles', JSON.stringify(Array.from(deleted)));
  } catch { }
}

export function unmarkProfileAsDeleted(slug: string) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const deleted = getDeletedProfiles();
    if (deleted.delete(slug.toLowerCase().trim())) {
      localStorage.setItem('signaid_deleted_profiles', JSON.stringify(Array.from(deleted)));
    }
  } catch { }
}

export async function deleteFromAuditDB(slug: string): Promise<void> {
  const dbInstance = await openAuditDB();
  if (!dbInstance) return;
  const targetSlug = slug.toLowerCase().trim();
  return new Promise((resolve) => {
    try {
      const tx = dbInstance.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.openCursor();
      req.onsuccess = (e: any) => {
        const cursor = e.target.result;
        if (cursor) {
          const key = String(cursor.key).toLowerCase();
          if (
            key === `session_obj_${targetSlug}` ||
            key.startsWith(`${targetSlug}_`) ||
            key.includes(`_${targetSlug}_`) ||
            key.endsWith(`_${targetSlug}`)
          ) {
            cursor.delete();
          }
          cursor.continue();
        } else {
          resolve();
        }
      };
      req.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export async function deleteProfile(slug: string): Promise<boolean> {
  const cleanSlug = slug.trim().toLowerCase();
  if (!cleanSlug) return false;

  // 1. Marquer comme supprimé pour empêcher la résurrection par seed
  markProfileAsDeleted(cleanSlug);

  // 2. Suppression de localStorage
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;
        const lowerKey = key.toLowerCase();
        if (
          lowerKey === `meta_${cleanSlug}` ||
          lowerKey === `vitrine_config_${cleanSlug}` ||
          lowerKey === `btp_session_${cleanSlug}` ||
          lowerKey.endsWith(`_${cleanSlug}`) ||
          lowerKey.includes(`_${cleanSlug}_`) ||
          (lowerKey.startsWith('fast_artist_cache_') && lowerKey.includes(cleanSlug))
        ) {
          keysToRemove.push(key);
        }
      }
      for (const k of keysToRemove) {
        localStorage.removeItem(k);
      }
    } catch (e) {
      console.warn('Erreur suppression localStorage pour profil:', cleanSlug, e);
    }
  }

  // 3. Suppression d'IndexedDB (BtpAuditDB)
  try {
    await deleteFromAuditDB(cleanSlug);
  } catch (e) {
    console.warn('Erreur suppression IndexedDB pour profil:', cleanSlug, e);
  }

  // 4. Suppression de Firestore Cloud (best-effort)
  try {
    await Promise.allSettled([
      deleteDoc(doc(db, "prospects", cleanSlug)),
      deleteDoc(doc(db, "configs", cleanSlug)),
      deleteDoc(doc(db, "showcases", cleanSlug)),
    ]);
  } catch (e) {
    console.warn('Suppression Firestore restreinte ou hors ligne:', e);
  }

  return true;
}

export interface CreateProfileInput {
  slug: string;
  companyName: string;
  activitySector?: string;
  logoUrl?: string;
  email?: string;
  phone?: string;
  accentColor?: string;
  theme?: 'dark' | 'light';
}

export async function createProfile(input: CreateProfileInput): Promise<ProfileSummary> {
  let cleanSlug = input.slug.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  if (!cleanSlug) {
    cleanSlug = `prospect-${Date.now().toString(36)}`;
  }
  const companyName = input.companyName.trim() || cleanSlug.toUpperCase();
  const accentColor = input.accentColor || '#3b82f6';
  const theme = input.theme || 'dark';

  unmarkProfileAsDeleted(cleanSlug);

  const newSummary: ProfileSummary = {
    id: cleanSlug,
    slug: cleanSlug,
    companyName,
    activitySector: input.activitySector?.trim() || `${companyName} - Équipements Professionnels`,
    logoUrl: input.logoUrl?.trim() || '',
    accentColor,
    theme,
    source: 'local',
    lastUpdated: "Créé à l'instant",
    mockupCount: 0,
    previewUrls: [],
    userData: {
      name: companyName,
      company: companyName,
      email: input.email?.trim() || `contact@${cleanSlug}.com`,
      phone: input.phone?.trim() || '',
      message: 'Initialisation directe prospect'
    }
  };

  // 1. Enregistrement LocalStorage
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.setItem(`meta_${cleanSlug}`, JSON.stringify({
        displayName: companyName,
        logoUrl: newSummary.logoUrl,
        primaryColor: accentColor,
        theme,
        initials: companyName.substring(0, 3).toUpperCase(),
        isReady: true,
        createdAt: new Date().toISOString()
      }));

      const initialSiteConfig = buildSiteConfigFromProfile(newSummary);
      localStorage.setItem(`vitrine_config_${cleanSlug}`, JSON.stringify(initialSiteConfig));

      localStorage.setItem(`btp_session_${cleanSlug}`, JSON.stringify({
        userData: newSummary.userData,
        mockups: []
      }));
    } catch (e) {
      console.warn('Erreur création localStorage pour profil:', cleanSlug, e);
    }
  }

  // 2. Enregistrement Firestore (best-effort)
  try {
    const docRef = doc(db, "prospects", cleanSlug);
    await setDoc(docRef, {
      slug: cleanSlug,
      company: companyName,
      name: companyName,
      email: newSummary.userData?.email,
      phone: newSummary.userData?.phone,
      activitySector: newSummary.activitySector,
      logoUrl: newSummary.logoUrl,
      accentColor,
      theme,
      mockupCount: 0,
      livePhotoUrls: [],
      createdAt: serverTimestamp()
    }, { merge: true });

    const configRef = doc(db, "configs", cleanSlug);
    const initialSiteConfig = buildSiteConfigFromProfile(newSummary);
    await setDoc(configRef, initialSiteConfig, { merge: true });
  } catch (e) {
    console.warn('Création Firestore restreinte ou hors ligne:', e);
  }

  return newSummary;
}

/**
 * Scans browser localStorage and IndexedDB for prospect / showcase profiles.
 */
export async function scanLocalProfiles(): Promise<ProfileSummary[]> {
  const deletedSet = getDeletedProfiles();
  if (typeof window === 'undefined') {
    return Object.values(SEED_PROFILES).filter(p => !deletedSet.has(p.slug.toLowerCase()));
  }

  const profilesMap = new Map<string, ProfileSummary>();

  // Ensure default known seed is available if not deleted
  if (!deletedSet.has('clubvisionroom')) {
    ensureLocalProfileSeeded('clubvisionroom');
  }

  // 1. Scan LocalStorage
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      // Meta key pattern: meta_<slug>
      if (key.startsWith('meta_')) {
        const slug = key.replace('meta_', '').trim().toLowerCase();
        if (slug && !deletedSet.has(slug)) {
          try {
            const raw = localStorage.getItem(key);
            if (raw) {
              const meta = JSON.parse(raw);
              profilesMap.set(slug, {
                id: slug,
                slug,
                companyName: meta.displayName || meta.companyName || slug.toUpperCase(),
                logoUrl: meta.logoUrl || '',
                accentColor: meta.primaryColor || '#3b82f6',
                theme: meta.theme === 'light' ? 'light' : 'dark',
                source: 'local',
                lastUpdated: 'Stockage Local (localStorage)',
                mockupCount: 0,
                previewUrls: [],
                userData: {
                  company: meta.displayName || slug.toUpperCase(),
                  name: meta.displayName || slug
                }
              });
            }
          } catch { }
        }
      }

      // Session pattern: btp_session_<slug>
      if (key.startsWith('btp_session_')) {
        const slug = key.replace('btp_session_', '').trim().toLowerCase();
        if (slug && !deletedSet.has(slug)) {
          try {
            const raw = localStorage.getItem(key);
            if (raw) {
              const data = JSON.parse(raw);
              const existing: ProfileSummary = profilesMap.get(slug) || {
                id: slug,
                slug,
                companyName: data.userData?.company || slug.toUpperCase(),
                source: 'audit',
                lastUpdated: 'Session Audit Locale',
                mockupCount: 0,
                previewUrls: [],
                userData: {}
              };
              if (data.userData) {
                existing.userData = { ...(existing.userData || {}), ...data.userData };
                if (data.userData.company) existing.companyName = data.userData.company;
              }
              if (Array.isArray(data.mockups)) {
                existing.mockupCount = data.mockups.length;
                const urls = data.mockups.map((m: any) => typeof m === 'string' ? m : (m?.aiRemastered || m?.ai || m?.frontImageUrl || m?.imageUrl || m?.url || m?.mechanical || m?.base)).filter(Boolean);
                if (urls.length > 0) existing.previewUrls = urls;
              }
              profilesMap.set(slug, existing);
            }
          } catch { }
        }
      }

      // Vitrine config pattern: vitrine_config_<slug>
      if (key.startsWith('vitrine_config_')) {
        const slug = key.replace('vitrine_config_', '').trim().toLowerCase();
        if (slug && slug !== 'single' && !deletedSet.has(slug)) {
          try {
            const raw = localStorage.getItem(key);
            if (raw) {
              const cfg = JSON.parse(raw);
              const existing = profilesMap.get(slug);
              const previewUrls = (cfg.livePhotoUrls && cfg.livePhotoUrls.length > 0)
                ? cfg.livePhotoUrls
                : (cfg.livePhotoUrl ? [cfg.livePhotoUrl] : (existing?.previewUrls || []));

              profilesMap.set(slug, {
                id: slug,
                slug,
                companyName: cfg.companyName || existing?.companyName || slug.toUpperCase(),
                activitySector: cfg.activitySector || existing?.activitySector,
                logoUrl: cfg.logoUrl || existing?.logoUrl || '',
                accentColor: cfg.accentColor || existing?.accentColor || '#3b82f6',
                theme: cfg.theme === 'light' ? 'light' : 'dark',
                source: existing?.source || 'local',
                lastUpdated: existing?.lastUpdated || 'Stockage Local (Vitrine)',
                previewUrls,
                mockupCount: previewUrls.length || existing?.mockupCount || 0,
                userData: {
                  ...existing?.userData,
                  company: cfg.companyName,
                  email: cfg.contactEmail,
                  phone: cfg.whatsappNumber
                }
              });
            }
          } catch { }
        }
      }

      // fast_artist_cache_v*_slug or preview_uuid_slug
      const artistMatch = key.match(/fast_artist_cache_v\d+_(.+)/i);
      if (artistMatch && artistMatch[1]) {
        const slug = artistMatch[1].trim().toLowerCase();
        if (!deletedSet.has(slug) && !profilesMap.has(slug)) {
          profilesMap.set(slug, {
            id: slug,
            slug,
            companyName: slug.toUpperCase(),
            source: 'audit',
            lastUpdated: 'Cache Pipeline Audit',
            mockupCount: 0,
            previewUrls: [],
            userData: {}
          });
        }
      }
    }
  } catch (e) {
    console.warn('Error reading localStorage:', e);
  }

  // 2. Scan IndexedDB (BtpAuditDB)
  try {
    const idbKeys = await getAllAuditDBKeys();
    const idbSlugs = new Set<string>();

    for (const k of idbKeys) {
      if (k.startsWith('session_obj_')) {
        const s = k.replace('session_obj_', '').toLowerCase();
        if (!deletedSet.has(s)) idbSlugs.add(s);
      } else if (k.includes('_ai_') || k.includes('_A_orig') || k.includes('_mech_')) {
        const prefix = k.split(/_(?:ai|A_orig|mech|A_adapt|A_remastered)_/)[0];
        if (prefix && prefix.length > 2) {
          const s = prefix.toLowerCase();
          if (!deletedSet.has(s)) idbSlugs.add(s);
        }
      }
    }

    for (const slug of Array.from(idbSlugs)) {
      const existing = profilesMap.get(slug);
      const previews: string[] = existing?.previewUrls ? [...existing.previewUrls] : [];
      const commonMockupIds = ['tFront', 'tBack', 'hFront', 'hBack', 'pFront', 'pBack', 'cardFront', 'cardBack'];
      for (const mId of commonMockupIds) {
        const key = `${slug}_ai_${mId}`;
        if (idbKeys.includes(key)) {
          const val = await getFromAuditDB(key);
          if (val && typeof val === 'string' && val.startsWith('http') && !previews.includes(val)) {
            previews.push(val);
          }
        }
      }

      const sessionStr = await getFromAuditDB(`session_obj_${slug}`);
      let sessionData: any = null;
      if (sessionStr && typeof sessionStr === 'string') {
        try { sessionData = JSON.parse(sessionStr); } catch { }
      }

      const logoUrl = existing?.logoUrl || await getFromAuditDB(`${slug}_A_orig`) || '';

      profilesMap.set(slug, {
        id: slug,
        slug,
        companyName: sessionData?.userData?.company || existing?.companyName || slug.toUpperCase(),
        logoUrl: logoUrl || existing?.logoUrl || '',
        accentColor: existing?.accentColor || '#3b82f6',
        theme: existing?.theme || 'dark',
        source: 'audit',
        lastUpdated: 'Stockage Local (IndexedDB)',
        previewUrls: previews.length > 0 ? previews : existing?.previewUrls,
        mockupCount: previews.length || existing?.mockupCount || 0,
        userData: {
          ...existing?.userData,
          ...(sessionData?.userData || {})
        }
      });
    }
  } catch (e) {
    console.warn('Error reading IndexedDB:', e);
  }

  // 3. Ensure SEED_PROFILES are merged if not found and not deleted
  for (const [slug, seed] of Object.entries(SEED_PROFILES)) {
    if (deletedSet.has(slug.toLowerCase())) continue;
    const existing = profilesMap.get(slug);
    if (!existing) {
      profilesMap.set(slug, { ...seed, mockupCount: seed.mockupCount || seed.previewUrls?.length || 0 });
    } else {
      profilesMap.set(slug, {
        ...seed,
        ...existing,
        companyName: existing.companyName || seed.companyName,
        logoUrl: existing.logoUrl || seed.logoUrl,
        previewUrls: (existing.previewUrls && existing.previewUrls.length > 0) ? existing.previewUrls : seed.previewUrls,
        mockupCount: existing.mockupCount || existing.previewUrls?.length || seed.mockupCount || seed.previewUrls?.length || 0,
        userData: { ...seed.userData, ...existing.userData }
      });
    }
  }

  return Array.from(profilesMap.values());
}

/**
 * Fetches all profiles merging Firestore (Cloud) and Local fallback (IndexedDB / localStorage).
 */
export async function fetchAllProfiles(): Promise<ProfileSummary[]> {
  const deletedSet = getDeletedProfiles();
  const localList = await scanLocalProfiles();
  const resultMap = new Map<string, ProfileSummary>();

  // Insert all local profiles
  for (const p of localList) {
    if (!deletedSet.has(p.slug.toLowerCase())) {
      resultMap.set(p.slug.toLowerCase(), p);
    }
  }

  // Attempt to fetch from Firestore
  try {
    const prospectsRef = collection(db, "prospects");
    const q = query(prospectsRef, orderBy("createdAt", "desc"), limit(20));
    const snap = await getDocs(q);
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      const slug = (data.slug || docSnap.id).toLowerCase();
      if (deletedSet.has(slug)) return;

      const existing = resultMap.get(slug);
      const previewUrls = data.livePhotoUrls || existing?.previewUrls || [];
      const mockupCount = data.mockupCount ?? (previewUrls.length || existing?.mockupCount || 0);

      resultMap.set(slug, {
        id: docSnap.id,
        slug,
        companyName: data.company || data.name || slug.toUpperCase(),
        activitySector: data.activitySector || existing?.activitySector,
        logoUrl: data.logoUrl || existing?.logoUrl,
        accentColor: data.accentColor || existing?.accentColor || '#3b82f6',
        theme: data.theme === 'light' ? 'light' : 'dark',
        source: 'cloud',
        lastUpdated: data.createdAt?.toDate ? data.createdAt.toDate().toLocaleDateString('fr-FR') : 'Cloud Firestore',
        previewUrls,
        mockupCount,
        userData: {
          company: data.company,
          name: data.name,
          email: data.email,
          phone: data.phone,
          message: data.message
        }
      });
    });
  } catch (err) {
    console.warn("Firestore Cloud Read Restricted or Offline, using local fallback:", err);
  }

  // Attempt to check if showcases collection exists
  try {
    const showcasesRef = collection(db, "showcases");
    const snap = await getDocs(query(showcasesRef, limit(20)));
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      const slug = (data.slug || docSnap.id).toLowerCase();
      if (deletedSet.has(slug)) return;

      const existing = resultMap.get(slug);
      const previewUrls = data.livePhotoUrls || existing?.previewUrls || [];
      const mockupCount = data.mockupCount ?? (previewUrls.length || existing?.mockupCount || 0);

      resultMap.set(slug, {
        id: docSnap.id,
        slug,
        companyName: data.companyName || slug.toUpperCase(),
        logoUrl: data.logoUrl || existing?.logoUrl,
        accentColor: data.accentColor || existing?.accentColor || '#3b82f6',
        source: 'cloud',
        lastUpdated: 'Showcase Cloud Firestore',
        previewUrls,
        mockupCount
      });
    });
  } catch { }

  return Array.from(resultMap.values());
}

/**
 * Builds a comprehensive SiteConfig initialized with prospect/audit data.
 */
export function buildSiteConfigFromProfile(profile: ProfileSummary, base: SiteConfig = defaultConfig): SiteConfig {
  const company = profile.companyName || profile.slug.toUpperCase();
  const logo = profile.logoUrl || base.logoUrl;
  const accent = profile.accentColor || base.accentColor || '#3b82f6';
  const photos = (profile.previewUrls && profile.previewUrls.length > 0) ? profile.previewUrls : (base.livePhotoUrls || []);

  return {
    ...base,
    companyName: company,
    activitySector: profile.activitySector || `${company} - Équipements Professionnels & Solutions Scéniques`,
    presentation: `${company} transforme l'impact visuel de ses événements et de ses équipes avec des équipements personnalisés haut de gamme. Conçu pour imposer une autorité incontestable, ce dispositif combine rendu 3D d'élite et gestion automatisée pour une logistique vestimentaire zéro friction.`,
    rawPitch: {
      what: `Dotation et merchandising officiel haut de gamme pour ${company}.`,
      who: `Aux collaborateurs, membres et partenaires de ${company} exigeant une qualité d'élite.`,
      difference: `Projection 3D ultra-réaliste, finitions soignées et automatisation complète des renouvellements.`,
      service: `Pack Autorité personnalisé, rendus IA multi-angles et accès au portail de commande dédié.`
    },
    logoUrl: logo,
    accentColor: accent,
    theme: profile.theme || 'dark',
    contactEmail: profile.userData?.email || base.contactEmail || `contact@${profile.slug}.com`,
    whatsappNumber: profile.userData?.phone ? profile.userData.phone.replace(/[^0-9]/g, '') : base.whatsappNumber,
    address: base.address || 'Paris, France',
    merchUrl: base.merchUrl || `https://shop.signaid.eu/${profile.slug}`,
    livePhotoUrl: photos[0] || '',
    livePhotoUrls: photos,
    customSections: [
      {
        title: "Dotation & Merchandising Officiel",
        content: `Découvrez la collection officielle ${company}. Toutes les pièces sont confectionnées avec des matières sélectionnées pour leur durabilité, leur confort et leur rendu visuel d'exception.`
      }
    ]
  };
}

/**
 * Loads a profile by slug: tries Firestore (configs, prospects, showcases),
 * local storage, IndexedDB direct lookup, and seed fallback.
 */
export async function loadProfileConfigBySlug(slug: string): Promise<{ config: SiteConfig; source: 'cloud' | 'local' | 'seed'; profile: ProfileSummary }> {
  const cleanSlug = slug.trim().toLowerCase();

  // 1. Try Firestore configs/<slug>
  try {
    const docRef = doc(db, "configs", cleanSlug);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      let logoUrl = data.logoUrl || '';

      // Si logoUrl absent dans config, tenter prospects ou IndexedDB
      if (!logoUrl) {
        try {
          const pSnap = await getDoc(doc(db, "prospects", cleanSlug));
          if (pSnap.exists() && pSnap.data().logoUrl) logoUrl = pSnap.data().logoUrl;
        } catch { }
      }
      if (!logoUrl) {
        try {
          const idbLogo = await getFromAuditDB(`${cleanSlug}_A_orig`) || await getFromAuditDB(`${cleanSlug}_logo`);
          if (idbLogo && typeof idbLogo === 'string') logoUrl = idbLogo;
        } catch { }
      }

      const cfg: SiteConfig = {
        ...defaultConfig,
        ...data,
        logoUrl: logoUrl || data.logoUrl || '',
        theme: data.theme === 'light' ? 'light' : 'dark',
        livePhotoUrls: data.livePhotoUrls || (data.livePhotoUrl ? [data.livePhotoUrl] : [])
      };
      return {
        config: cfg,
        source: 'cloud',
        profile: {
          id: cleanSlug,
          slug: cleanSlug,
          companyName: cfg.companyName,
          logoUrl: cfg.logoUrl,
          accentColor: cfg.accentColor,
          source: 'cloud'
        }
      };
    }
  } catch (e) {
    console.warn(`Firestore read for configs/${cleanSlug} restricted or missing:`, e);
  }

  // 2. Try Firestore prospects/<slug> ou showcases/<slug>
  try {
    const pSnap = await getDoc(doc(db, "prospects", cleanSlug));
    if (pSnap.exists()) {
      const pData = pSnap.data();
      const summary: ProfileSummary = {
        id: cleanSlug,
        slug: cleanSlug,
        companyName: pData.company || pData.name || cleanSlug.toUpperCase(),
        activitySector: pData.activitySector || '',
        logoUrl: pData.logoUrl || '',
        accentColor: pData.accentColor || '#3b82f6',
        theme: pData.theme === 'light' ? 'light' : 'dark',
        source: 'cloud',
        lastUpdated: 'Cloud Firestore (Prospect)',
        previewUrls: pData.livePhotoUrls || pData.previewUrls || [],
        userData: {
          name: pData.name,
          email: pData.email,
          phone: pData.phone,
          company: pData.company,
          message: pData.message
        }
      };
      return {
        config: buildSiteConfigFromProfile(summary),
        source: 'cloud',
        profile: summary
      };
    }
  } catch { }

  // 3. Scan Local Storage and IndexedDB
  const localProfiles = await scanLocalProfiles();
  const matched = localProfiles.find(p => p.slug.toLowerCase() === cleanSlug || p.id.toLowerCase() === cleanSlug);

  if (matched) {
    if (!matched.logoUrl) {
      try {
        const idbLogo = await getFromAuditDB(`${cleanSlug}_A_orig`) || await getFromAuditDB(`${cleanSlug}_logo`);
        if (idbLogo && typeof idbLogo === 'string') matched.logoUrl = idbLogo;
      } catch { }
    }
    const builtConfig = buildSiteConfigFromProfile(matched);
    return {
      config: builtConfig,
      source: 'local',
      profile: matched
    };
  }

  // 4. Direct IndexedDB lookup for slug
  try {
    const idbLogo = await getFromAuditDB(`${cleanSlug}_A_orig`)
      || await getFromAuditDB(`${cleanSlug}_A_remastered`)
      || await getFromAuditDB(`${cleanSlug}_logo`);
    const sessionStr = await getFromAuditDB(`session_obj_${cleanSlug}`);
    let sessionData: any = null;
    if (sessionStr && typeof sessionStr === 'string') {
      try { sessionData = JSON.parse(sessionStr); } catch { }
    }
    if (idbLogo || sessionData) {
      const summary: ProfileSummary = {
        id: cleanSlug,
        slug: cleanSlug,
        companyName: sessionData?.userData?.company || sessionData?.companyName || cleanSlug.toUpperCase(),
        activitySector: sessionData?.userData?.activitySector || '',
        logoUrl: (typeof idbLogo === 'string' ? idbLogo : '') || sessionData?.logoUrl || sessionData?.userData?.logoUrl || '',
        accentColor: sessionData?.accentColor || '#3b82f6',
        theme: sessionData?.theme || 'dark',
        source: 'audit',
        lastUpdated: 'Stockage Local (IndexedDB direct)',
        userData: sessionData?.userData || {}
      };
      return {
        config: buildSiteConfigFromProfile(summary),
        source: 'local',
        profile: summary
      };
    }
  } catch { }

  // 5. Fallback to Known Seed if matches and not deleted
  const deletedSet = getDeletedProfiles();
  if (!deletedSet.has(cleanSlug) && SEED_PROFILES[cleanSlug]) {
    const seed = SEED_PROFILES[cleanSlug];
    const builtConfig = buildSiteConfigFromProfile(seed);
    return {
      config: builtConfig,
      source: 'seed',
      profile: seed
    };
  }

  // 6. Default fallback with custom company name
  const fallbackSummary: ProfileSummary = {
    id: cleanSlug,
    slug: cleanSlug,
    companyName: cleanSlug.toUpperCase(),
    source: 'local'
  };
  return {
    config: buildSiteConfigFromProfile(fallbackSummary),
    source: 'local',
    profile: fallbackSummary
  };
}
