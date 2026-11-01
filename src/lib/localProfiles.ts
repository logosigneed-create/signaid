import { SiteConfig, defaultConfig } from "./store";
import { collection, getDocs, limit, orderBy, query, doc, getDoc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import { withCacheBust, getSessionCacheBuster, refreshSessionCacheBuster } from "./cacheBuster";

export { withCacheBust, getSessionCacheBuster, refreshSessionCacheBuster };

export interface ProfileSummary {
  id: string;
  slug: string;
  companyName: string;
  activitySector?: string;
  logoUrl?: string;
  avatarUrl?: string;
  logo?: string;
  logoA?: string;
  logoB?: string;
  logoAdaptedUrl?: string;
  accentColor?: string;
  theme?: 'dark' | 'light';
  source: 'local' | 'cloud' | 'audit';
  lastUpdated?: string;
  mockupCount?: number;
  previewUrls?: string[];
  presentation?: string;
  userData?: {
    email?: string;
    phone?: string;
    name?: string;
    company?: string;
    message?: string;
  };
  siteConfig?: Partial<SiteConfig>;
  products?: any;
  items?: any;
  mockups?: any;
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

// Verified Canonical Seed Data for clubvisionroom (Standard Fixed Names)
export const CLUBVISION_MOCKUP_ASSETS = {
  tFront: 'https://firebasestorage.googleapis.com/v0/b/signaid-prod.firebasestorage.app/o/btp_mockups%2Fclubvisionroom%2Fweb%2FtFront.png?alt=media',
  tBack: 'https://firebasestorage.googleapis.com/v0/b/signaid-prod.firebasestorage.app/o/btp_mockups%2Fclubvisionroom%2Fweb%2FtBack.png?alt=media',
  tWhiteFront: 'https://firebasestorage.googleapis.com/v0/b/signaid-prod.firebasestorage.app/o/btp_mockups%2Fclubvisionroom%2Fweb%2FJHK170-WHT_front.png?alt=media',
  tWhiteBack: 'https://firebasestorage.googleapis.com/v0/b/signaid-prod.firebasestorage.app/o/btp_mockups%2Fclubvisionroom%2Fweb%2FJHK170-WHT_back.png?alt=media',
  pFront: 'https://firebasestorage.googleapis.com/v0/b/signaid-prod.firebasestorage.app/o/btp_mockups%2Fclubvisionroom%2Fweb%2FpFront.png?alt=media',
  pBack: 'https://firebasestorage.googleapis.com/v0/b/signaid-prod.firebasestorage.app/o/btp_mockups%2Fclubvisionroom%2Fweb%2FpBack.png?alt=media',
  pWhiteFront: 'https://firebasestorage.googleapis.com/v0/b/signaid-prod.firebasestorage.app/o/btp_mockups%2Fclubvisionroom%2Fweb%2FJHK510-WHT_front.png?alt=media',
  pWhiteBack: 'https://firebasestorage.googleapis.com/v0/b/signaid-prod.firebasestorage.app/o/btp_mockups%2Fclubvisionroom%2Fweb%2FJHK510-WHT_back.png?alt=media',
  hFront: 'https://firebasestorage.googleapis.com/v0/b/signaid-prod.firebasestorage.app/o/btp_mockups%2Fclubvisionroom%2Fweb%2FhFront.png?alt=media',
  hBack: 'https://firebasestorage.googleapis.com/v0/b/signaid-prod.firebasestorage.app/o/btp_mockups%2Fclubvisionroom%2Fweb%2FhBack.png?alt=media',
  hWhiteFront: 'https://firebasestorage.googleapis.com/v0/b/signaid-prod.firebasestorage.app/o/btp_mockups%2Fclubvisionroom%2Fweb%2FJHK421-WHT_front.png?alt=media',
  hWhiteBack: 'https://firebasestorage.googleapis.com/v0/b/signaid-prod.firebasestorage.app/o/btp_mockups%2Fclubvisionroom%2Fweb%2FJHK421-WHT_back.png?alt=media',
  tankFront: 'https://firebasestorage.googleapis.com/v0/b/signaid-prod.firebasestorage.app/o/btp_mockups%2Fclubvisionroom%2Fweb%2FtankFront.png?alt=media',
  tankBack: 'https://firebasestorage.googleapis.com/v0/b/signaid-prod.firebasestorage.app/o/btp_mockups%2Fclubvisionroom%2Fweb%2FtankBack.png?alt=media',
  heavyFront: 'https://firebasestorage.googleapis.com/v0/b/signaid-prod.firebasestorage.app/o/btp_mockups%2Fclubvisionroom%2Fweb%2FheavyFront.png?alt=media',
  heavyBack: 'https://firebasestorage.googleapis.com/v0/b/signaid-prod.firebasestorage.app/o/btp_mockups%2Fclubvisionroom%2Fweb%2FheavyBack.png?alt=media',
  tankWhiteFront: 'https://firebasestorage.googleapis.com/v0/b/signaid-prod.firebasestorage.app/o/btp_mockups%2Fclubvisionroom%2Fweb%2FtankWhiteFront.png?alt=media',
  tankWhiteBack: 'https://firebasestorage.googleapis.com/v0/b/signaid-prod.firebasestorage.app/o/btp_mockups%2Fclubvisionroom%2Fweb%2FtankWhiteBack.png?alt=media',
  heavyWhiteFront: 'https://firebasestorage.googleapis.com/v0/b/signaid-prod.firebasestorage.app/o/btp_mockups%2Fclubvisionroom%2Fweb%2FheavyWhiteFront.png?alt=media',
  heavyWhiteBack: 'https://firebasestorage.googleapis.com/v0/b/signaid-prod.firebasestorage.app/o/btp_mockups%2Fclubvisionroom%2Fweb%2FheavyWhiteBack.png?alt=media'
};

export const PBS_MOCKUP_ASSETS = {
  banner: '/assets/pbs_banner.png',
  bannerRemote: 'https://firebasestorage.googleapis.com/v0/b/signaid-prod.firebasestorage.app/o/users%2Fprospects%2F1789294328554_logo_dtf.png?alt=media&token=9d870cfa-89a7-4029-9654-3f1c7003bbdb',
  e3520Front: 'https://firebasestorage.googleapis.com/v0/b/signaid-prod.firebasestorage.app/o/btp_mockups%2Fpbs%2Fweb%2FE3520_front.png?alt=media',
  e3520Back: 'https://firebasestorage.googleapis.com/v0/b/signaid-prod.firebasestorage.app/o/btp_mockups%2Fpbs%2Fweb%2FE3520_back.png?alt=media',
  e3520FrontMech: 'https://firebasestorage.googleapis.com/v0/b/signaid-prod.firebasestorage.app/o/btp_mockups%2Fpbs%2Fweb%2FE3520_front_mech.png?alt=media',
  e3520BackMech: 'https://firebasestorage.googleapis.com/v0/b/signaid-prod.firebasestorage.app/o/btp_mockups%2Fpbs%2Fweb%2FE3520_back_mech.png?alt=media',
  logoA: '/assets/pbs_logo_A.png',
  logoB: '/assets/pbs_logo_B.png',
  logoARemote: 'https://firebasestorage.googleapis.com/v0/b/signaid-prod.firebasestorage.app/o/btp_mockups%2Fpbs%2Fweb%2Flogo_A_active.png?alt=media',
  logoBRemote: 'https://firebasestorage.googleapis.com/v0/b/signaid-prod.firebasestorage.app/o/btp_mockups%2Fpbs%2Fweb%2Flogo_B_active.png?alt=media'
};

export function getStandardMockupUrl(slug: string, id: string): string {
  return `https://firebasestorage.googleapis.com/v0/b/signaid-prod.firebasestorage.app/o/btp_mockups%2F${encodeURIComponent(slug)}%2Fweb%2F${encodeURIComponent(id)}.png?alt=media`;
}

export const PBS_PRODUCT_ASSETS = {
  sport_tshirt: {
    front: PBS_MOCKUP_ASSETS.e3520Front,
    back: PBS_MOCKUP_ASSETS.e3520Back
  },
  e3520: {
    front: PBS_MOCKUP_ASSETS.e3520Front,
    back: PBS_MOCKUP_ASSETS.e3520Back
  },
  tshirt: {
    front: PBS_MOCKUP_ASSETS.e3520Front,
    back: PBS_MOCKUP_ASSETS.e3520Back
  }
};

export const PBS_GARMENT_MOCKUPS: Record<string, string> = {
  sport_tshirt_front: PBS_MOCKUP_ASSETS.e3520Front,
  sport_tshirt_back: PBS_MOCKUP_ASSETS.e3520Back,
  sport_tshirt: PBS_MOCKUP_ASSETS.e3520Front,
  e3520_front: PBS_MOCKUP_ASSETS.e3520Front,
  e3520_back: PBS_MOCKUP_ASSETS.e3520Back,
  E3520_front: PBS_MOCKUP_ASSETS.e3520Front,
  E3520_back: PBS_MOCKUP_ASSETS.e3520Back,
  e3520Front: PBS_MOCKUP_ASSETS.e3520Front,
  e3520Back: PBS_MOCKUP_ASSETS.e3520Back,
  E3520: PBS_MOCKUP_ASSETS.e3520Front
};


export const CLUBVISION_PRODUCT_ASSETS = {
  tshirt: {
    front: CLUBVISION_MOCKUP_ASSETS.tFront,
    back: CLUBVISION_MOCKUP_ASSETS.tBack
  },
  tshirt_white: {
    front: CLUBVISION_MOCKUP_ASSETS.tWhiteFront,
    back: CLUBVISION_MOCKUP_ASSETS.tWhiteBack
  },
  polo: {
    front: CLUBVISION_MOCKUP_ASSETS.pFront,
    back: CLUBVISION_MOCKUP_ASSETS.pBack
  },
  polo_white: {
    front: CLUBVISION_MOCKUP_ASSETS.pWhiteFront,
    back: CLUBVISION_MOCKUP_ASSETS.pWhiteBack
  },
  hoodie: {
    front: CLUBVISION_MOCKUP_ASSETS.hFront,
    back: CLUBVISION_MOCKUP_ASSETS.hBack
  },
  hoodie_white: {
    front: CLUBVISION_MOCKUP_ASSETS.hWhiteFront,
    back: CLUBVISION_MOCKUP_ASSETS.hWhiteBack
  },
  sweat: {
    front: CLUBVISION_MOCKUP_ASSETS.hFront,
    back: CLUBVISION_MOCKUP_ASSETS.hBack
  },
  sweat_white: {
    front: CLUBVISION_MOCKUP_ASSETS.hWhiteFront,
    back: CLUBVISION_MOCKUP_ASSETS.hWhiteBack
  },
  tshirt_oversize: {
    front: CLUBVISION_MOCKUP_ASSETS.heavyFront,
    back: CLUBVISION_MOCKUP_ASSETS.heavyBack
  },
  tshirt_oversize_white: {
    front: CLUBVISION_MOCKUP_ASSETS.heavyWhiteFront,
    back: CLUBVISION_MOCKUP_ASSETS.heavyWhiteBack
  },
  tank_top: {
    front: CLUBVISION_MOCKUP_ASSETS.tankFront,
    back: CLUBVISION_MOCKUP_ASSETS.tankBack
  },
  tank_top_white: {
    front: CLUBVISION_MOCKUP_ASSETS.tankWhiteFront,
    back: CLUBVISION_MOCKUP_ASSETS.tankWhiteBack
  }
};

export const CLUBVISION_GARMENT_MOCKUPS: Record<string, string> = {
  tshirt_front: CLUBVISION_MOCKUP_ASSETS.tFront,
  tshirt_back: CLUBVISION_MOCKUP_ASSETS.tBack,
  tshirt: CLUBVISION_MOCKUP_ASSETS.tFront,
  tFront: CLUBVISION_MOCKUP_ASSETS.tFront,
  tBack: CLUBVISION_MOCKUP_ASSETS.tBack,
  tshirt_white_front: CLUBVISION_MOCKUP_ASSETS.tWhiteFront,
  tshirt_white_back: CLUBVISION_MOCKUP_ASSETS.tWhiteBack,
  tWhiteFront: CLUBVISION_MOCKUP_ASSETS.tWhiteFront,
  tWhiteBack: CLUBVISION_MOCKUP_ASSETS.tWhiteBack,
  'JHK170-WHT_front': CLUBVISION_MOCKUP_ASSETS.tWhiteFront,
  'JHK170-WHT_back': CLUBVISION_MOCKUP_ASSETS.tWhiteBack,
  polo_front: CLUBVISION_MOCKUP_ASSETS.pFront,
  polo_back: CLUBVISION_MOCKUP_ASSETS.pBack,
  polo: CLUBVISION_MOCKUP_ASSETS.pFront,
  pFront: CLUBVISION_MOCKUP_ASSETS.pFront,
  pBack: CLUBVISION_MOCKUP_ASSETS.pBack,
  polo_white_front: CLUBVISION_MOCKUP_ASSETS.pWhiteFront,
  polo_white_back: CLUBVISION_MOCKUP_ASSETS.pWhiteBack,
  pWhiteFront: CLUBVISION_MOCKUP_ASSETS.pWhiteFront,
  pWhiteBack: CLUBVISION_MOCKUP_ASSETS.pWhiteBack,
  'JHK510-WHT_front': CLUBVISION_MOCKUP_ASSETS.pWhiteFront,
  'JHK510-WHT_back': CLUBVISION_MOCKUP_ASSETS.pWhiteBack,
  hoodie_front: CLUBVISION_MOCKUP_ASSETS.hFront,
  hoodie_back: CLUBVISION_MOCKUP_ASSETS.hBack,
  hoodie: CLUBVISION_MOCKUP_ASSETS.hFront,
  sweat_front: CLUBVISION_MOCKUP_ASSETS.hFront,
  sweat_back: CLUBVISION_MOCKUP_ASSETS.hBack,
  sweat: CLUBVISION_MOCKUP_ASSETS.hFront,
  hFront: CLUBVISION_MOCKUP_ASSETS.hFront,
  hBack: CLUBVISION_MOCKUP_ASSETS.hBack,
  hoodie_white_front: CLUBVISION_MOCKUP_ASSETS.hWhiteFront,
  hoodie_white_back: CLUBVISION_MOCKUP_ASSETS.hWhiteBack,
  sweat_white_front: CLUBVISION_MOCKUP_ASSETS.hWhiteFront,
  sweat_white_back: CLUBVISION_MOCKUP_ASSETS.hWhiteBack,
  hWhiteFront: CLUBVISION_MOCKUP_ASSETS.hWhiteFront,
  hWhiteBack: CLUBVISION_MOCKUP_ASSETS.hWhiteBack,
  'JHK421-WHT_front': CLUBVISION_MOCKUP_ASSETS.hWhiteFront,
  'JHK421-WHT_back': CLUBVISION_MOCKUP_ASSETS.hWhiteBack,
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
  tank_top_white: CLUBVISION_MOCKUP_ASSETS.tankWhiteFront,
  tank_top_white_front: CLUBVISION_MOCKUP_ASSETS.tankWhiteFront,
  tank_top_white_back: CLUBVISION_MOCKUP_ASSETS.tankWhiteBack,
  'BYBB011-WHT_front': CLUBVISION_MOCKUP_ASSETS.tankWhiteFront,
  'BYBB011-WHT_back': CLUBVISION_MOCKUP_ASSETS.tankWhiteBack,
  heavy_white_front: CLUBVISION_MOCKUP_ASSETS.heavyWhiteFront,
  heavy_white_back: CLUBVISION_MOCKUP_ASSETS.heavyWhiteBack,
  heavyWhiteFront: CLUBVISION_MOCKUP_ASSETS.heavyWhiteFront,
  heavyWhiteBack: CLUBVISION_MOCKUP_ASSETS.heavyWhiteBack,
  tshirt_oversize_white: CLUBVISION_MOCKUP_ASSETS.heavyWhiteFront,
  tshirt_oversize_white_front: CLUBVISION_MOCKUP_ASSETS.heavyWhiteFront,
  tshirt_oversize_white_back: CLUBVISION_MOCKUP_ASSETS.heavyWhiteBack,
  'NX7200-WHT_front': CLUBVISION_MOCKUP_ASSETS.heavyWhiteFront,
  'NX7200-WHT_back': CLUBVISION_MOCKUP_ASSETS.heavyWhiteBack,
};

export const PARTY_2000_MOCKUP_ASSETS = {
  logoActive: 'https://firebasestorage.googleapis.com/v0/b/signaid-prod.firebasestorage.app/o/btp_mockups%2F2000theparty%2Fweb%2Flogo_A_active.png?alt=media&token=33bc2147-0ae9-4e03-9de3-f6118e31376e',
  tFront: 'https://firebasestorage.googleapis.com/v0/b/signaid-prod.firebasestorage.app/o/btp_mockups%2F2000theparty%2Fweb%2FtFront.png?alt=media&token=e61c81aa-e34e-4d0e-a6f9-f9c9cf820d60',
  tBack: 'https://firebasestorage.googleapis.com/v0/b/signaid-prod.firebasestorage.app/o/btp_mockups%2F2000theparty%2Fweb%2FtBack.png?alt=media&token=e1ed941d-2919-4599-aa93-1cb08eee05e1',
  pFront: 'https://firebasestorage.googleapis.com/v0/b/signaid-prod.firebasestorage.app/o/btp_mockups%2F2000theparty%2Fweb%2FpFront.png?alt=media&token=5d211d11-85e0-464d-85ed-1c787d17de25',
  pBack: 'https://firebasestorage.googleapis.com/v0/b/signaid-prod.firebasestorage.app/o/btp_mockups%2F2000theparty%2Fweb%2FpBack.png?alt=media&token=991a8e51-cdd5-4d78-8c1e-677d27fb8af9',
  hFront: 'https://firebasestorage.googleapis.com/v0/b/signaid-prod.firebasestorage.app/o/btp_mockups%2F2000theparty%2Fweb%2FhFront.png?alt=media&token=14255116-e180-4c3a-80b3-e445b021fff4',
  hBack: 'https://firebasestorage.googleapis.com/v0/b/signaid-prod.firebasestorage.app/o/btp_mockups%2F2000theparty%2Fweb%2FhBack.png?alt=media&token=7126610f-3f0b-4d55-8a6f-3c149a3a5ba7'
};

export const PARTY_2000_PRODUCT_ASSETS = {
  tshirt: {
    front: PARTY_2000_MOCKUP_ASSETS.tFront,
    back: PARTY_2000_MOCKUP_ASSETS.tBack
  },
  polo: {
    front: PARTY_2000_MOCKUP_ASSETS.pFront,
    back: PARTY_2000_MOCKUP_ASSETS.pBack
  },
  hoodie: {
    front: PARTY_2000_MOCKUP_ASSETS.hFront,
    back: PARTY_2000_MOCKUP_ASSETS.hBack
  },
  sweat: {
    front: PARTY_2000_MOCKUP_ASSETS.hFront,
    back: PARTY_2000_MOCKUP_ASSETS.hBack
  }
};

export const PARTY_2000_GARMENT_MOCKUPS: Record<string, string> = {
  tshirt_front: PARTY_2000_MOCKUP_ASSETS.tFront,
  tshirt_back: PARTY_2000_MOCKUP_ASSETS.tBack,
  tshirt: PARTY_2000_MOCKUP_ASSETS.tFront,
  tFront: PARTY_2000_MOCKUP_ASSETS.tFront,
  tBack: PARTY_2000_MOCKUP_ASSETS.tBack,
  polo_front: PARTY_2000_MOCKUP_ASSETS.pFront,
  polo_back: PARTY_2000_MOCKUP_ASSETS.pBack,
  polo: PARTY_2000_MOCKUP_ASSETS.pFront,
  pFront: PARTY_2000_MOCKUP_ASSETS.pFront,
  pBack: PARTY_2000_MOCKUP_ASSETS.pBack,
  hoodie_front: PARTY_2000_MOCKUP_ASSETS.hFront,
  hoodie_back: PARTY_2000_MOCKUP_ASSETS.hBack,
  hoodie: PARTY_2000_MOCKUP_ASSETS.hFront,
  sweat_front: PARTY_2000_MOCKUP_ASSETS.hFront,
  sweat_back: PARTY_2000_MOCKUP_ASSETS.hBack,
  sweat: PARTY_2000_MOCKUP_ASSETS.hFront,
  hFront: PARTY_2000_MOCKUP_ASSETS.hFront,
  hBack: PARTY_2000_MOCKUP_ASSETS.hBack
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
    mockupCount: 0,
    previewUrls: [],
    userData: {
      name: 'Direction La Cuve à Bière',
      company: 'LA CUVE À BIÈRE',
      email: 'contact@lacuveabiere.fr',
      phone: '+33 6 00 00 00 00',
      message: 'Initialisation directe profil La Cuve à Bière'
    }
  },
  clubvisionroom: {
    id: 'clubvisionroom',
    slug: 'clubvisionroom',
    companyName: 'CLUB VISION',
    activitySector: 'Collectif Artistique & Événementiel Techno',
    logoUrl: '/assets/previews/clubvision_avatar.png',
    accentColor: '#8b5cf6',
    theme: 'dark',
    source: 'audit',
    lastUpdated: 'Pipeline Audit Visuel',
    mockupCount: 14,
    previewUrls: [
      CLUBVISION_MOCKUP_ASSETS.tFront,
      CLUBVISION_MOCKUP_ASSETS.tBack,
      CLUBVISION_MOCKUP_ASSETS.pFront,
      CLUBVISION_MOCKUP_ASSETS.pBack,
      CLUBVISION_MOCKUP_ASSETS.hFront,
      CLUBVISION_MOCKUP_ASSETS.hBack,
      CLUBVISION_MOCKUP_ASSETS.tankFront,
      CLUBVISION_MOCKUP_ASSETS.tankBack,
      CLUBVISION_MOCKUP_ASSETS.heavyFront,
      CLUBVISION_MOCKUP_ASSETS.heavyBack,
      CLUBVISION_MOCKUP_ASSETS.tankWhiteFront,
      CLUBVISION_MOCKUP_ASSETS.tankWhiteBack,
      CLUBVISION_MOCKUP_ASSETS.heavyWhiteFront,
      CLUBVISION_MOCKUP_ASSETS.heavyWhiteBack
    ],
    userData: {
      name: 'Direction Club Vision',
      company: 'CLUB VISION',
      email: 'contact@clubvision.fr',
      phone: '+33 6 00 00 00 00',
      message: 'Initialisation directe profil Club Vision'
    }
  },
  pbs: {
    id: 'pbs',
    slug: 'pbs',
    companyName: 'PBS',
    activitySector: 'Club de tennis de table',
    logoUrl: PBS_MOCKUP_ASSETS.logoA,
    avatarUrl: PBS_MOCKUP_ASSETS.logoA,
    logo: PBS_MOCKUP_ASSETS.logoA,
    accentColor: '#00b5e2',
    theme: 'dark',
    presentation: '',
    source: 'audit',
    lastUpdated: 'Profil Initialisé PBS',
    mockupCount: 1,
    previewUrls: ['/assets/pbs_banner.png'],
    userData: {
      name: 'Direction PBS',
      company: 'PBS',
      email: 'contact@pbs.com',
      phone: '+33 6 00 00 00 00',
      message: 'Initialisation directe profil PBS'
    }
  },
  '2000theparty': {
    id: 'audit-2000theparty-eyem',
    slug: '2000theparty',
    companyName: '2000 the PARTY',
    activitySector: 'Événementiel, Musique & DJ',
    logoUrl: PARTY_2000_MOCKUP_ASSETS.logoActive,
    avatarUrl: PARTY_2000_MOCKUP_ASSETS.logoActive,
    logo: PARTY_2000_MOCKUP_ASSETS.logoActive,
    accentColor: '#ec4899',
    theme: 'dark',
    presentation: 'La soirée référence pour se replonger dans les années 2000! Reste connecté..',
    source: 'audit',
    lastUpdated: 'Pipeline Prospects Facebook',
    mockupCount: 3,
    previewUrls: [
      PARTY_2000_MOCKUP_ASSETS.tFront,
      PARTY_2000_MOCKUP_ASSETS.pFront,
      PARTY_2000_MOCKUP_ASSETS.hFront
    ],
    userData: {
      name: '2000 the PARTY',
      company: '2000 the PARTY',
      email: 'contact@entreprise.com',
      phone: '',
      message: 'La soirée référence pour se replonger dans les années 2000! Reste connecté..'
    }
  },
  'audit-2000theparty-eyem': {
    id: 'audit-2000theparty-eyem',
    slug: 'audit-2000theparty-eyem',
    companyName: '2000 the PARTY',
    activitySector: 'Événementiel, Musique & DJ',
    logoUrl: PARTY_2000_MOCKUP_ASSETS.logoActive,
    avatarUrl: PARTY_2000_MOCKUP_ASSETS.logoActive,
    logo: PARTY_2000_MOCKUP_ASSETS.logoActive,
    accentColor: '#ec4899',
    theme: 'dark',
    presentation: 'La soirée référence pour se replonger dans les années 2000! Reste connecté..',
    source: 'audit',
    lastUpdated: 'Pipeline Prospects Facebook',
    mockupCount: 3,
    previewUrls: [
      PARTY_2000_MOCKUP_ASSETS.tFront,
      PARTY_2000_MOCKUP_ASSETS.pFront,
      PARTY_2000_MOCKUP_ASSETS.hFront
    ],
    userData: {
      name: '2000 the PARTY',
      company: '2000 the PARTY',
      email: 'contact@entreprise.com',
      phone: '',
      message: 'La soirée référence pour se replonger dans les années 2000! Reste connecté..'
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
    const existingMeta = localStorage.getItem(metaKey);
    const isVisionSlug = cleanSlug === 'clubvisionroom' || cleanSlug === 'visionroom' || cleanSlug === 'clubvision';
    const isPbsSlug = cleanSlug === 'pbs';
    const is2000PartySlug = cleanSlug === '2000theparty' || cleanSlug === 'audit-2000theparty-eyem';

    if (!existingMeta || (cleanSlug === 'pbs' && (existingMeta.includes('1789483691723_logo_nobg') || !existingMeta.includes('pbs_logo_A'))) || (is2000PartySlug && (existingMeta.includes('1789579603133_logo_nobg') || !existingMeta.includes('logo_A_active')))) {
      localStorage.setItem(metaKey, JSON.stringify({
        displayName: seed.companyName,
        logoUrl: seed.logoUrl,
        avatarUrl: seed.avatarUrl || seed.logoUrl,
        logo: seed.logo || seed.logoUrl,
        primaryColor: seed.accentColor,
        theme: seed.theme,
        initials: cleanSlug === 'pbs' ? 'PBS' : (is2000PartySlug ? '2P' : 'CVR'),
        isReady: true
      }));
    }

    const sessionKey = `btp_session_${cleanSlug}`;
    const sessionObjKey = `session_obj_${cleanSlug}`;

    const existingSession = localStorage.getItem(sessionKey);
    let shouldUpdateSession = !existingSession;
    if (existingSession && isVisionSlug) {
      try {
        const parsed = JSON.parse(existingSession);
        const mockups = Array.isArray(parsed.mockups) ? parsed.mockups : [];
        const hasTankWhite = mockups.some((m: any) => m.id === 'tankWhiteFront' || m.id === 'tankWhiteBack');
        const hasHeavyWhite = mockups.some((m: any) => m.id === 'heavyWhiteFront' || m.id === 'heavyWhiteBack');
        const hasAllMockups = mockups.length >= 14;
        const hasLegacyTimestamps = mockups.some((m: any) => /_\d{10,}\.png/.test(m.url || m.imageUrl || m.frontImageUrl || ''));
        if (!hasTankWhite || !hasHeavyWhite || !hasAllMockups || hasLegacyTimestamps) shouldUpdateSession = true;
      } catch {
        shouldUpdateSession = true;
      }
    }
    if (existingSession && isPbsSlug) {
      try {
        const parsed = JSON.parse(existingSession);
        const mockups = Array.isArray(parsed.mockups) ? parsed.mockups : [];
        const hasFront = mockups.some((m: any) => m.id === 'E3520_front');
        const hasBack = mockups.some((m: any) => m.id === 'E3520_back');
        const isStrictTwo = mockups.length === 2;
        const hasCorrectLogo = parsed.logoA === PBS_MOCKUP_ASSETS.logoA && parsed.logoB === PBS_MOCKUP_ASSETS.logoB;
        const hasModel = mockups.every((m: any) => !!m.model);
        const hasCyanColor = mockups.every((m: any) => m.color === '#00b5e2');
        const hasStorageAsset = mockups.every((m: any) => (m.ai || m.url || '').includes('firebasestorage.googleapis.com'));
        const hasSportGarment = mockups.every((m: any) => m.garment === 'sport_tshirt');
        const hasCorrectBanner = parsed.livePhotoUrl === '/assets/pbs_banner.png';
        const hasCorrectSector = parsed.activitySector === 'Club de tennis de table';
        if (!hasFront || !hasBack || !isStrictTwo || !hasCorrectLogo || !hasModel || !hasCyanColor || !hasStorageAsset || !hasSportGarment || !hasCorrectBanner || !hasCorrectSector) shouldUpdateSession = true;
      } catch {
        shouldUpdateSession = true;
      }
    }
    if (existingSession && is2000PartySlug) {
      try {
        const parsed = JSON.parse(existingSession);
        const mockups = Array.isArray(parsed.mockups) ? parsed.mockups : [];
        const hasTshirt = mockups.some((m: any) => m.id === 'tFront' || m.garment === 'tshirt');
        const hasPolo = mockups.some((m: any) => m.id === 'pFront' || m.garment === 'polo');
        const hasHoodie = mockups.some((m: any) => m.id === 'hFront' || m.garment === 'sweat' || m.garment === 'hoodie');
        const hasActiveLogo = (parsed.logoUrl || '').includes('logo_A_active') || (parsed.logoA || '').includes('logo_A_active');
        const hasBadLogo = (parsed.logoUrl || '').includes('1789579603133_logo_nobg') || (parsed.logoA || '').includes('1789579603133_logo_nobg');
        if (!hasTshirt || !hasPolo || !hasHoodie || !hasActiveLogo || hasBadLogo || mockups.length < 6) {
          shouldUpdateSession = true;
        }
      } catch {
        shouldUpdateSession = true;
      }
    }

    if (shouldUpdateSession && isPbsSlug) {
      const pbsMockupsList = [
        {
          id: 'E3520_front',
          sku: 'E3520',
          productId: 'prod_signaid_sportt_poly_mtzmb4zr',
          title: 'T-shirt Sport Polyester Respirant Interlock Face',
          name: 'T-shirt Sport Polyester Respirant Interlock Face',
          garment: 'sport_tshirt',
          color: '#00b5e2',
          view: 'front',
          selected: true,
          model: '/assets/models/male_tshirt_front.png',
          url: PBS_MOCKUP_ASSETS.e3520Front,
          imageUrl: PBS_MOCKUP_ASSETS.e3520Front,
          frontImageUrl: PBS_MOCKUP_ASSETS.e3520Front,
          ai: PBS_MOCKUP_ASSETS.e3520Front,
          aiRemastered: PBS_MOCKUP_ASSETS.e3520Front,
          mechanical: PBS_MOCKUP_ASSETS.e3520FrontMech,
          base: '/assets/sport-blue-E3520.png',
          hasAi: true,
          isFresh: true,
          placement: 'A'
        },
        {
          id: 'E3520_back',
          sku: 'E3520',
          productId: 'prod_signaid_sportt_poly_mtzmb4zr',
          title: 'T-shirt Sport Polyester Respirant Interlock Dos',
          name: 'T-shirt Sport Polyester Respirant Interlock Dos',
          garment: 'sport_tshirt',
          color: '#00b5e2',
          view: 'back',
          selected: true,
          model: '/assets/models/male_tshirt_back.png',
          url: PBS_MOCKUP_ASSETS.e3520Back,
          imageUrl: PBS_MOCKUP_ASSETS.e3520Back,
          backImageUrl: PBS_MOCKUP_ASSETS.e3520Back,
          ai: PBS_MOCKUP_ASSETS.e3520Back,
          aiRemastered: PBS_MOCKUP_ASSETS.e3520Back,
          mechanical: PBS_MOCKUP_ASSETS.e3520BackMech,
          base: '/assets/sport-blue-E3520-dos.png',
          hasAi: true,
          isFresh: true,
          placement: 'B'
        }
      ];

      const pbsPayload = {
        userData: seed.userData,
        companyName: 'PBS',
        activitySector: 'Club de tennis de table',
        logoUrl: '/assets/pbs_logo_A.png',
        avatarUrl: '/assets/pbs_logo_A.png',
        logo: '/assets/pbs_logo_A.png',
        logoA: '/assets/pbs_logo_A.png',
        logoB: '/assets/pbs_logo_B.png',
        livePhotoUrl: '/assets/pbs_banner.png',
        livePhotoUrls: ['/assets/pbs_banner.png'],
        previewUrls: ['/assets/pbs_banner.png'],
        enabledProductIds: ['prod_signaid_sportt_poly_mtzmb4zr', 'E3520_front', 'E3520_back', 'E3520'],
        logoPlacements: {
          E3520_front: 'A',
          E3520_back: 'B'
        },
        mockups: pbsMockupsList,
        items: pbsMockupsList,
        products: {
          sport_tshirt: {
            id: 'E3520',
            name: 'T-Shirt Sport Respirant (E3520)',
            garment: 'sport_tshirt',
            price: 30.00,
            frontImageUrl: PBS_MOCKUP_ASSETS.e3520Front,
            backImageUrl: PBS_MOCKUP_ASSETS.e3520Back,
            ai: PBS_MOCKUP_ASSETS.e3520Front,
            aiRemastered: PBS_MOCKUP_ASSETS.e3520Front,
            aiBack: PBS_MOCKUP_ASSETS.e3520Back,
            aiRemasteredBack: PBS_MOCKUP_ASSETS.e3520Back,
            mechanical: PBS_MOCKUP_ASSETS.e3520FrontMech,
            mechanicalBack: PBS_MOCKUP_ASSETS.e3520BackMech
          },
          e3520: {
            id: 'E3520',
            name: 'T-Shirt Sport Respirant (E3520)',
            garment: 'sport_tshirt',
            price: 30.00,
            frontImageUrl: PBS_MOCKUP_ASSETS.e3520Front,
            backImageUrl: PBS_MOCKUP_ASSETS.e3520Back,
            ai: PBS_MOCKUP_ASSETS.e3520Front,
            aiRemastered: PBS_MOCKUP_ASSETS.e3520Front,
            aiBack: PBS_MOCKUP_ASSETS.e3520Back,
            aiRemasteredBack: PBS_MOCKUP_ASSETS.e3520Back,
            mechanical: PBS_MOCKUP_ASSETS.e3520FrontMech,
            mechanicalBack: PBS_MOCKUP_ASSETS.e3520BackMech
          }
        },
        garmentMockups: PBS_GARMENT_MOCKUPS,
        dynamicMockups: {
          E3520_front: PBS_MOCKUP_ASSETS.e3520Front,
          E3520_back: PBS_MOCKUP_ASSETS.e3520Back,
          e3520Front: PBS_MOCKUP_ASSETS.e3520Front,
          e3520Back: PBS_MOCKUP_ASSETS.e3520Back
        }
      };

      const enabledIdsStr = JSON.stringify(['prod_signaid_sportt_poly_mtzmb4zr', 'E3520_front', 'E3520_back', 'E3520']);
      const gmJson = JSON.stringify(pbsPayload.garmentMockups);
      const mockupsJson = JSON.stringify(pbsMockupsList);
      const payloadJson = JSON.stringify(pbsPayload);

      localStorage.setItem(sessionKey, payloadJson);
      localStorage.setItem(sessionObjKey, payloadJson);
      localStorage.setItem('btp_enabled_product_ids', enabledIdsStr);
      localStorage.setItem('enabled_products_pbs', enabledIdsStr);
      localStorage.setItem('btp_enabled_products_pbs', enabledIdsStr);
      localStorage.setItem('garmentMockups_pbs', gmJson);
      localStorage.setItem('btp_garment_mockups_pbs', gmJson);
      localStorage.setItem('mockups_pbs', mockupsJson);

      // Purge any residual keys from other sessions or previous faulty seedings
      localStorage.removeItem('btp_mockup_tshirt_front_pbs');
      localStorage.removeItem('btp_mockup_tshirt_back_pbs');
      localStorage.removeItem('btp_mockup_tshirt_pbs');
      localStorage.removeItem('btp_mockup_polo_front_pbs');
      localStorage.removeItem('btp_mockup_polo_back_pbs');
      localStorage.removeItem('btp_mockup_hoodie_front_pbs');
      localStorage.removeItem('btp_mockup_hoodie_back_pbs');
      localStorage.removeItem('btp_mockup_hoodie_pbs');
      localStorage.removeItem('btp_mockup_tank_front_pbs');
      localStorage.removeItem('btp_mockup_tank_back_pbs');
      return;
    }

    if (shouldUpdateSession && is2000PartySlug) {
      const partyMockupsList = [
        {
          id: 'tFront',
          sku: 'tFront',
          title: 'T-shirt Noir 2000 the PARTY Face',
          name: 'T-shirt Noir 2000 the PARTY Face',
          garment: 'tshirt',
          color: 'Noir',
          view: 'front',
          selected: true,
          url: PARTY_2000_MOCKUP_ASSETS.tFront,
          imageUrl: PARTY_2000_MOCKUP_ASSETS.tFront,
          frontImageUrl: PARTY_2000_MOCKUP_ASSETS.tFront,
          imageFront: PARTY_2000_MOCKUP_ASSETS.tFront,
          ai: PARTY_2000_MOCKUP_ASSETS.tFront,
          aiRemastered: PARTY_2000_MOCKUP_ASSETS.tFront,
          hasAi: true,
          isFresh: true,
          price: 29.90
        },
        {
          id: 'tBack',
          sku: 'tBack',
          title: 'T-shirt Noir 2000 the PARTY Dos',
          name: 'T-shirt Noir 2000 the PARTY Dos',
          garment: 'tshirt',
          color: 'Noir',
          view: 'back',
          selected: true,
          url: PARTY_2000_MOCKUP_ASSETS.tBack,
          imageUrl: PARTY_2000_MOCKUP_ASSETS.tBack,
          backImageUrl: PARTY_2000_MOCKUP_ASSETS.tBack,
          imageBack: PARTY_2000_MOCKUP_ASSETS.tBack,
          ai: PARTY_2000_MOCKUP_ASSETS.tBack,
          aiRemastered: PARTY_2000_MOCKUP_ASSETS.tBack,
          hasAi: true,
          isFresh: true,
          price: 29.90
        },
        {
          id: 'pFront',
          sku: 'pFront',
          title: 'Polo Premium 2000 the PARTY Face',
          name: 'Polo Premium 2000 the PARTY Face',
          garment: 'polo',
          color: 'Noir',
          view: 'front',
          selected: true,
          url: PARTY_2000_MOCKUP_ASSETS.pFront,
          imageUrl: PARTY_2000_MOCKUP_ASSETS.pFront,
          frontImageUrl: PARTY_2000_MOCKUP_ASSETS.pFront,
          imageFront: PARTY_2000_MOCKUP_ASSETS.pFront,
          ai: PARTY_2000_MOCKUP_ASSETS.pFront,
          aiRemastered: PARTY_2000_MOCKUP_ASSETS.pFront,
          hasAi: true,
          isFresh: true,
          price: 39.90
        },
        {
          id: 'pBack',
          sku: 'pBack',
          title: 'Polo Premium 2000 the PARTY Dos',
          name: 'Polo Premium 2000 the PARTY Dos',
          garment: 'polo',
          color: 'Noir',
          view: 'back',
          selected: true,
          url: PARTY_2000_MOCKUP_ASSETS.pBack,
          imageUrl: PARTY_2000_MOCKUP_ASSETS.pBack,
          backImageUrl: PARTY_2000_MOCKUP_ASSETS.pBack,
          imageBack: PARTY_2000_MOCKUP_ASSETS.pBack,
          ai: PARTY_2000_MOCKUP_ASSETS.pBack,
          aiRemastered: PARTY_2000_MOCKUP_ASSETS.pBack,
          hasAi: true,
          isFresh: true,
          price: 39.90
        },
        {
          id: 'hFront',
          sku: 'hFront',
          title: 'Hoodie Premium 2000 the PARTY Face',
          name: 'Hoodie Premium 2000 the PARTY Face',
          garment: 'sweat',
          color: 'Noir',
          view: 'front',
          selected: true,
          url: PARTY_2000_MOCKUP_ASSETS.hFront,
          imageUrl: PARTY_2000_MOCKUP_ASSETS.hFront,
          frontImageUrl: PARTY_2000_MOCKUP_ASSETS.hFront,
          imageFront: PARTY_2000_MOCKUP_ASSETS.hFront,
          ai: PARTY_2000_MOCKUP_ASSETS.hFront,
          aiRemastered: PARTY_2000_MOCKUP_ASSETS.hFront,
          hasAi: true,
          isFresh: true,
          price: 49.90
        },
        {
          id: 'hBack',
          sku: 'hBack',
          title: 'Hoodie Premium 2000 the PARTY Dos',
          name: 'Hoodie Premium 2000 the PARTY Dos',
          garment: 'sweat',
          color: 'Noir',
          view: 'back',
          selected: true,
          url: PARTY_2000_MOCKUP_ASSETS.hBack,
          imageUrl: PARTY_2000_MOCKUP_ASSETS.hBack,
          backImageUrl: PARTY_2000_MOCKUP_ASSETS.hBack,
          imageBack: PARTY_2000_MOCKUP_ASSETS.hBack,
          ai: PARTY_2000_MOCKUP_ASSETS.hBack,
          aiRemastered: PARTY_2000_MOCKUP_ASSETS.hBack,
          hasAi: true,
          isFresh: true,
          price: 49.90
        }
      ];

      const partyProductsMap = {
        tshirt: {
          id: 'tFront',
          name: 'T-Shirt 2000 the PARTY',
          title: 'T-Shirt 2000 the PARTY',
          price: 29.90,
          garment: 'tshirt',
          color: 'Noir',
          frontImageUrl: PARTY_2000_MOCKUP_ASSETS.tFront,
          imageFront: PARTY_2000_MOCKUP_ASSETS.tFront,
          imageUrl: PARTY_2000_MOCKUP_ASSETS.tFront,
          backImageUrl: PARTY_2000_MOCKUP_ASSETS.tBack,
          imageBack: PARTY_2000_MOCKUP_ASSETS.tBack,
          ai: PARTY_2000_MOCKUP_ASSETS.tFront,
          aiRemastered: PARTY_2000_MOCKUP_ASSETS.tFront,
          aiBack: PARTY_2000_MOCKUP_ASSETS.tBack,
          aiRemasteredBack: PARTY_2000_MOCKUP_ASSETS.tBack
        },
        polo: {
          id: 'pFront',
          name: 'Polo 2000 the PARTY',
          title: 'Polo 2000 the PARTY',
          price: 39.90,
          garment: 'polo',
          color: 'Noir',
          frontImageUrl: PARTY_2000_MOCKUP_ASSETS.pFront,
          imageFront: PARTY_2000_MOCKUP_ASSETS.pFront,
          imageUrl: PARTY_2000_MOCKUP_ASSETS.pFront,
          backImageUrl: PARTY_2000_MOCKUP_ASSETS.pBack,
          imageBack: PARTY_2000_MOCKUP_ASSETS.pBack,
          ai: PARTY_2000_MOCKUP_ASSETS.pFront,
          aiRemastered: PARTY_2000_MOCKUP_ASSETS.pFront,
          aiBack: PARTY_2000_MOCKUP_ASSETS.pBack,
          aiRemasteredBack: PARTY_2000_MOCKUP_ASSETS.pBack
        },
        hoodie: {
          id: 'hFront',
          name: 'Sweat Hoodie 2000 the PARTY',
          title: 'Sweat Hoodie 2000 the PARTY',
          price: 49.90,
          garment: 'sweat',
          color: 'Noir',
          frontImageUrl: PARTY_2000_MOCKUP_ASSETS.hFront,
          imageFront: PARTY_2000_MOCKUP_ASSETS.hFront,
          imageUrl: PARTY_2000_MOCKUP_ASSETS.hFront,
          backImageUrl: PARTY_2000_MOCKUP_ASSETS.hBack,
          imageBack: PARTY_2000_MOCKUP_ASSETS.hBack,
          ai: PARTY_2000_MOCKUP_ASSETS.hFront,
          aiRemastered: PARTY_2000_MOCKUP_ASSETS.hFront,
          aiBack: PARTY_2000_MOCKUP_ASSETS.hBack,
          aiRemasteredBack: PARTY_2000_MOCKUP_ASSETS.hBack
        }
      };

      const partyPayload = {
        sessionId: cleanSlug,
        id: cleanSlug,
        companyName: '2000 the PARTY',
        companySlug: cleanSlug,
        activitySector: 'Événementiel, Musique & DJ',
        logoUrl: PARTY_2000_MOCKUP_ASSETS.logoActive,
        avatarUrl: PARTY_2000_MOCKUP_ASSETS.logoActive,
        logo: PARTY_2000_MOCKUP_ASSETS.logoActive,
        logoA: PARTY_2000_MOCKUP_ASSETS.logoActive,
        logoB: PARTY_2000_MOCKUP_ASSETS.logoActive,
        logoAdaptedUrl: PARTY_2000_MOCKUP_ASSETS.logoActive,
        accentColor: '#ec4899',
        theme: 'dark',
        presentation: 'La soirée référence pour se replonger dans les années 2000! Reste connecté..',
        socials: [
          { platform: 'Facebook', url: 'https://www.facebook.com/people/2000-the-PARTY/61566467420783/' }
        ],
        mockups: partyMockupsList,
        items: partyMockupsList,
        products: partyProductsMap,
        garmentMockups: PARTY_2000_GARMENT_MOCKUPS
      };

      const payloadJson = JSON.stringify(partyPayload);
      const gmJson = JSON.stringify(PARTY_2000_GARMENT_MOCKUPS);
      const mockupsJson = JSON.stringify(partyMockupsList);

      ['2000theparty', 'audit-2000theparty-eyem'].forEach(k => {
        localStorage.setItem(`btp_session_${k}`, payloadJson);
        localStorage.setItem(`session_obj_${k}`, payloadJson);
        localStorage.setItem(`garmentMockups_${k}`, gmJson);
        localStorage.setItem(`btp_garment_mockups_${k}`, gmJson);
        localStorage.setItem(`mockups_${k}`, mockupsJson);
        localStorage.setItem(`meta_${k}`, JSON.stringify({
          displayName: '2000 the PARTY',
          logoUrl: PARTY_2000_MOCKUP_ASSETS.logoActive,
          avatarUrl: PARTY_2000_MOCKUP_ASSETS.logoActive,
          logo: PARTY_2000_MOCKUP_ASSETS.logoActive,
          primaryColor: '#ec4899',
          theme: 'dark',
          initials: '2P',
          isReady: true
        }));
      });

      return;
    }

    if (shouldUpdateSession) {
      const mockupsList = seed.previewUrls?.map((url, i) => {
        const isTankWhite = url.includes('tankWhiteFront') || url.includes('tankWhiteBack');
        const isTank = !isTankWhite && (url.includes('tankFront') || url.includes('tankBack') || url.includes('tank'));
        const isHeavyWhite = url.includes('heavyWhiteFront') || url.includes('heavyWhiteBack');
        const isHeavy = !isHeavyWhite && (url.includes('heavyFront') || url.includes('heavyBack') || url.includes('heavy'));
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
        } else if (isHeavyWhite) {
          id = isBack ? 'heavyWhiteBack' : 'heavyWhiteFront';
          garment = 'tshirt_oversize';
          color = 'Blanc';
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
          },
          tshirt_oversize_white: {
            id: 'heavyWhiteFront',
            name: 'T-Shirt Heavyweight Blanc Oversize',
            garment: 'tshirt_oversize',
            color: 'Blanc',
            price: 34.99,
            frontImageUrl: CLUBVISION_MOCKUP_ASSETS.heavyWhiteFront,
            backImageUrl: CLUBVISION_MOCKUP_ASSETS.heavyWhiteBack,
            ai: CLUBVISION_MOCKUP_ASSETS.heavyWhiteFront,
            aiRemastered: CLUBVISION_MOCKUP_ASSETS.heavyWhiteFront,
            aiBack: CLUBVISION_MOCKUP_ASSETS.heavyWhiteBack,
            aiRemasteredBack: CLUBVISION_MOCKUP_ASSETS.heavyWhiteBack
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
    const initialSiteConfig = buildSiteConfigFromProfile(newSummary);
    const defaultProducts = [
      {
        id: 'tFront',
        name: `T-Shirt ${companyName}`,
        title: `T-Shirt ${companyName}`,
        garment: 'tshirt',
        price: 29.90,
        frontImageUrl: newSummary.products?.tshirt?.frontImageUrl || '/assets/tshirt-black-JHK170.png',
        backImageUrl: newSummary.products?.tshirt?.backImageUrl || '/assets/tshirt-black-JHK170-dos.png',
        imageUrl: newSummary.products?.tshirt?.frontImageUrl || '/assets/tshirt-black-JHK170.png',
        ai: Boolean(newSummary.products?.tshirt?.frontImageUrl && !newSummary.products.tshirt.frontImageUrl.includes('JHK')),
        aiRemastered: Boolean(newSummary.products?.tshirt?.frontImageUrl && !newSummary.products.tshirt.frontImageUrl.includes('JHK')),
        mechanical: '/assets/tshirt-black-JHK170.png',
        mechanicalFront: '/assets/tshirt-black-JHK170.png',
        mechanicalBack: '/assets/tshirt-black-JHK170-dos.png'
      },
      {
        id: 'pFront',
        name: `Polo ${companyName}`,
        title: `Polo ${companyName}`,
        garment: 'polo',
        price: 39.90,
        frontImageUrl: newSummary.products?.polo?.frontImageUrl || '/assets/polo-black-JHK510.png',
        backImageUrl: newSummary.products?.polo?.backImageUrl || '/assets/polo-black-JHK510-dos.png',
        imageUrl: newSummary.products?.polo?.frontImageUrl || '/assets/polo-black-JHK510.png',
        ai: Boolean(newSummary.products?.polo?.frontImageUrl && !newSummary.products.polo.frontImageUrl.includes('JHK')),
        aiRemastered: Boolean(newSummary.products?.polo?.frontImageUrl && !newSummary.products.polo.frontImageUrl.includes('JHK')),
        mechanical: '/assets/polo-black-JHK510.png',
        mechanicalFront: '/assets/polo-black-JHK510.png',
        mechanicalBack: '/assets/polo-black-JHK510-dos.png'
      },
      {
        id: 'hFront',
        name: `Hoodie ${companyName}`,
        title: `Hoodie ${companyName}`,
        garment: 'sweat',
        price: 49.90,
        frontImageUrl: newSummary.products?.hoodie?.frontImageUrl || '/assets/hoodie-black-JHK421.png',
        backImageUrl: newSummary.products?.hoodie?.backImageUrl || '/assets/hoodie-black-JHK421-dos.png',
        imageUrl: newSummary.products?.hoodie?.frontImageUrl || '/assets/hoodie-black-JHK421.png',
        ai: Boolean(newSummary.products?.hoodie?.frontImageUrl && !newSummary.products.hoodie.frontImageUrl.includes('JHK')),
        aiRemastered: Boolean(newSummary.products?.hoodie?.frontImageUrl && !newSummary.products.hoodie.frontImageUrl.includes('JHK')),
        mechanical: '/assets/hoodie-black-JHK421.png',
        mechanicalFront: '/assets/hoodie-black-JHK421.png',
        mechanicalBack: '/assets/hoodie-black-JHK421-dos.png'
      }
    ];

    const aiCount = defaultProducts.filter(p => p.ai).length;

    const prospectPayload = {
      slug: cleanSlug,
      company: companyName,
      name: companyName,
      email: newSummary.userData?.email,
      phone: newSummary.userData?.phone,
      activitySector: newSummary.activitySector,
      logoUrl: newSummary.logoUrl,
      accentColor,
      theme,
      mockupCount: defaultProducts.length,
      products: defaultProducts,
      items: defaultProducts,
      mockups: defaultProducts,
      aiProductsCount: aiCount,
      livePhotoUrls: [],
      createdAt: serverTimestamp()
    };

    await setDoc(doc(db, "prospects", cleanSlug), prospectPayload, { merge: true });
    await setDoc(doc(db, "audits", cleanSlug), prospectPayload, { merge: true }).catch(() => {});
    await setDoc(doc(db, "vault", cleanSlug), prospectPayload, { merge: true }).catch(() => {});

    const configRef = doc(db, "configs", cleanSlug);
    await setDoc(configRef, { ...initialSiteConfig, products: defaultProducts, items: defaultProducts }, { merge: true });
    console.log(`[BACKEND_PROFILE_PERSIST] Profil ${cleanSlug} mis à jour avec ${aiCount} produits IA.`);
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
  if (!deletedSet.has('pbs')) {
    ensureLocalProfileSeeded('pbs');
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
    activitySector: profile.activitySector || (profile.slug === 'pbs' ? 'Club de tennis de table' : `${company} - Équipements Professionnels & Solutions Scéniques`),
    presentation: profile.slug === 'pbs' ? '' : (profile.presentation || (profile.slug.toLowerCase().includes('2000theparty') ? 'La soirée référence pour se replonger dans les années 2000! Reste connecté..' : `${company} transforme l'impact visuel de ses événements et de ses équipes avec des équipements personnalisés haut de gamme. Conçu pour imposer une autorité incontestable, ce dispositif combine rendu 3D d'élite et gestion automatisée pour une logistique vestimentaire zéro friction.`)),
    rawPitch: profile.slug === 'pbs' ? { what: '', who: '', difference: '', service: '' } : {
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
    customSections: profile.slug === 'pbs' ? [] : [
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
