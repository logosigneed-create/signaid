import { doc, getDoc, setDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { sanitizeForFirestore } from "../utils/firestoreSanitizer";

export type Social = {
  platform: string;
  url: string;
  enabled?: boolean;
};

export type ProfileLink = {
  id: string;
  title: string;
  type: 'booking' | 'whatsapp' | 'email' | 'social' | 'custom' | 'merch';
  url?: string;
  platform?: string;
  icon?: string;
  bgColor?: string;
  textColor?: string;
  enabled: boolean;
};

export type CustomSection = {
  title: string;
  content: string; // Can be HTML
};

export type SiteConfig = {
  companyName: string;
  slug?: string; // Unique URL slug (e.g. "fabrizio")
  activitySector: string;
  presentation: string;
  rawPitch: {
    what: string;
    who: string;
    difference: string;
    service: string;
  };
  logoUrl: string;
  logoAdaptedUrl?: string;
  avatar?: string;
  logoA?: string;
  logoB?: string;
  logoPlacements?: Record<string, 'A' | 'B'>;
  auditLogoUrl?: string;
  logo?: string;
  visualLogoUrl?: string;
  address: string;
  contactEmail: string;
  whatsappNumber: string;
  whatsapp?: string;
  merchUrl: string;
  videoUrl: string;
  socials: Social[];
  customLinks?: ProfileLink[];
  customSections: CustomSection[]; // NEW
  theme: 'dark' | 'light' | 'auto';
  accentColor: string;
  sectionOrder?: string[];
  generatedKey?: string;
  actuationKey?: string;
  sector?: string;
  status?: string;
  createdAt?: any;
  livePhotoUrl?: string;
  livePhotoUrls?: string[];
  coverUrl?: string;
  coverImage?: string;
  totalMarginAvailable?: number;
  totalSales?: number;
  revenue?: number;
  ordersCount?: number;
  isPremium?: boolean;
  isGuest?: boolean;
  invertLogoInLightMode?: boolean;
  logoOverlayColor?: 'auto' | 'white' | 'black' | 'original';
  logoScale?: number; // 50 - 200 (percentage, default 100)
  coverHeight?: number; // 160 - 500 (height in px, default 280)
  coverZoom?: number; // 100 - 250 (percentage, default 100)
  coverPositionY?: number; // 0 - 100 (vertical position percentage, default 50)
  coverPositionX?: number; // 0 - 100 (horizontal position percentage, default 50)
  enableLiveWidget?: boolean;
  liveWidgetStatus?: string;
  mockups?: any[];
  items?: any[];
  products?: {
    tshirt?: { aiImageUrl?: string | null; imageFront?: string | null; name?: string; price?: number; [key: string]: any };
    polo?: { aiImageUrl?: string | null; imageFront?: string | null; name?: string; price?: number; [key: string]: any };
    hoodie?: { aiImageUrl?: string | null; imageFront?: string | null; name?: string; price?: number; [key: string]: any };
    [key: string]: any;
  };
};

export const defaultConfig: SiteConfig = {
  companyName: "",
  activitySector: "",
  presentation: "",
  rawPitch: {
    what: "",
    who: "",
    difference: "",
    service: ""
  },
  logoUrl: "",
  address: "",
  contactEmail: "contact@entreprise.com",
  whatsappNumber: "",
  merchUrl: "",
  videoUrl: "",
  socials: [
    { platform: "Facebook", url: "" },
    { platform: "Instagram", url: "" },
    { platform: "LinkedIn", url: "" },
    { platform: "TikTok", url: "" }
  ],
  customSections: [],
  theme: 'auto',
  accentColor: 'rgb(59, 130, 246)',
  sectionOrder: ['presentation', 'address', 'contact', 'socials', 'products'],
  livePhotoUrl: "",
  livePhotoUrls: [],
  totalMarginAvailable: 0,
  invertLogoInLightMode: true,
  logoOverlayColor: 'auto',
  logoScale: 100,
  coverHeight: 280,
  coverZoom: 100,
  coverPositionY: 50,
  coverPositionX: 50,
  enableLiveWidget: false,
  liveWidgetStatus: "🟢 En Live au Bar Le Club VIP"
};

const DOC_ID = 'single_config';

export async function getStoredConfig(uid?: string): Promise<SiteConfig> {
  const actualUid = uid || 'uVRasbs3TlgpX80koVHBlJpJLd92';
  const cleanUid = actualUid.replace(/^audit-/, '');
  const isDfazzUser = actualUid === 'fabrizio' || 
                      actualUid === 'djdfazz' || 
                      actualUid === 'guest_ms3ijgnco2xnid' || 
                      actualUid === 'audit-8f198p5' || 
                      actualUid === '4eckgu2' || 
                      actualUid === '3j0f5kl';
  const isEloxUser = actualUid === 'elox' || actualUid === 'djelox' || cleanUid === 'elox' || cleanUid === 'djelox';
  const isDokiinUser = actualUid === 'dokiin' || cleanUid === 'dokiin' || actualUid === 'audit-mt4cimp4luio';
  const cleanUidNoHyphen = cleanUid.toLowerCase().replace(/[-_\s]/g, '');
  const isVisionUser = actualUid === 'clubvisionroom' || 
                       actualUid === 'mt074jnaldxn' || 
                       actualUid === 'clubvision' || 
                       actualUid === 'audit-mt074jnaldxn' || 
                       cleanUidNoHyphen.includes('vision');

  const parseDoc = (data: any): SiteConfig => {
    let companyName = data.companyName !== undefined 
      ? data.companyName 
      : (data.name || data.userData?.companyName || data.prospectName || (isDfazzUser ? 'DJ D-FAZZ' : (isEloxUser ? 'DJ ELOX' : (isDokiinUser ? 'D OKIIN' : (isVisionUser ? 'Club Vision Room' : cleanUid.toUpperCase())))));

    if (isVisionUser && (!companyName || companyName === cleanUid.toUpperCase() || companyName === 'NO_NAME')) {
      companyName = 'Club Vision Room';
    }

    if (!isDfazzUser && (companyName.toUpperCase() === 'DJ D-FAZZ' || companyName.toLowerCase().includes('dfazz'))) {
      companyName = data.name || data.prospectName || data.userData?.companyName || (isEloxUser ? 'DJ ELOX' : (isDokiinUser ? 'D OKIIN' : (isVisionUser ? 'Club Vision Room' : (cleanUid.startsWith('msx') ? 'Aaron H' : cleanUid.toUpperCase()))));
    }

    const isDfazz = isDfazzUser || companyName.toLowerCase().includes('dfazz');
    const isElox = isEloxUser || companyName.toLowerCase().includes('elox');
    const isDokiin = isDokiinUser || companyName.toLowerCase().includes('dokiin');
    const isVision = isVisionUser || companyName.toLowerCase().replace(/[-_\s]/g, '').includes('vision');

    const defaultDfazzSocials = [
      { platform: "Instagram", url: "https://www.instagram.com/djdfazz", enabled: true },
      { platform: "Facebook", url: "https://www.facebook.com/djdfazz", enabled: true },
      { platform: "TikTok", url: "https://www.tiktok.com/@djdfazz", enabled: true },
      { platform: "WhatsApp", url: "https://wa.me/32492104603", enabled: true },
      { platform: "Email", url: "mailto:Fabriziomagistro89@gmail.com", enabled: true },
      { platform: "Spotify", url: "https://open.spotify.com", enabled: true },
      { platform: "SoundCloud", url: "https://soundcloud.com", enabled: true },
      { platform: "YouTube", url: "https://youtube.com", enabled: true }
    ];

    const defaultEloxSocials = [
      { platform: "Instagram", url: "https://www.instagram.com/djelox", enabled: true },
      { platform: "TikTok", url: "https://www.tiktok.com/@djelox", enabled: true },
      { platform: "SoundCloud", url: "https://soundcloud.com/djelox", enabled: true },
      { platform: "YouTube", url: "https://youtube.com/@djelox", enabled: true },
      { platform: "Spotify", url: "https://open.spotify.com", enabled: true }
    ];

    let mergedSocials = data.socials && data.socials.length > 0 ? data.socials : (isDfazz ? defaultDfazzSocials : (isElox ? defaultEloxSocials : defaultConfig.socials));
    if (isDfazz && Array.isArray(mergedSocials)) {
      defaultDfazzSocials.forEach(ds => {
        if (!mergedSocials.some((s: any) => s.platform?.toLowerCase() === ds.platform.toLowerCase())) {
          mergedSocials.push(ds);
        }
      });
    }

    let resolvedLogo = data.logoUrl || data.logoAdaptedUrl || data.auditLogoUrl || data.logo || data.visualLogoUrl || data.logoA?.adaptedRemastered || data.logoA?.adapted || (isElox ? '/elox_logo.png' : (isDokiin ? '/dokiin_logo_white.png' : (isVision ? 'https://storage.googleapis.com/signaid-prod-assets/users/mt074jnaldxn/logos/1787803061043_logo_dtf.png' : '')));
    if (!isDfazz && (resolvedLogo.toLowerCase().includes('dfazz') || resolvedLogo.includes('audit-8f198p5') || resolvedLogo.includes('guest_ms3ijgnco2xnid'))) {
      resolvedLogo = isElox ? '/elox_logo.png' : (isDokiin ? '/dokiin_logo_white.png' : (isVision ? 'https://storage.googleapis.com/signaid-prod-assets/users/mt074jnaldxn/logos/1787803061043_logo_dtf.png' : ''));
    }

    // Photo d'ambiance / bannière totalement optionnelle
    let resolvedLivePhoto = data.livePhotoUrl !== undefined 
      ? data.livePhotoUrl 
      : (data.coverUrl !== undefined 
          ? data.coverUrl 
          : (data.coverImage !== undefined ? data.coverImage : (data.photos && data.photos[0] ? data.photos[0] : (isVision ? 'https://storage.googleapis.com/signaid-prod-assets/users/mt074jnaldxn/gallery/1787808082062_cover.jpg' : ''))));

    if (!isDfazz && typeof resolvedLivePhoto === 'string' && (resolvedLivePhoto.toLowerCase().includes('dfazz') || resolvedLivePhoto.includes('audit-8f198p5') || resolvedLivePhoto.includes('guest_ms3ijgnco2xnid'))) {
      resolvedLivePhoto = isVision ? 'https://storage.googleapis.com/signaid-prod-assets/users/mt074jnaldxn/gallery/1787808082062_cover.jpg' : '';
    }

    const resolvedLivePhotoList = (Array.isArray(data.livePhotoUrls) && data.livePhotoUrls.length > 0)
      ? data.livePhotoUrls.filter((u: string) => typeof u === 'string' && u.trim().length > 10 && u !== 'none' && (isDfazz || !u.includes('dfazz_hero')))
      : (resolvedLivePhoto && resolvedLivePhoto.trim().length > 10 && resolvedLivePhoto !== 'none' ? [resolvedLivePhoto] : (isVision ? ['https://storage.googleapis.com/signaid-prod-assets/users/mt074jnaldxn/gallery/1787808082062_cover.jpg'] : []));

    let activitySector = data.sector || data.activitySector || data.userData?.activity || (isDfazz ? 'DJ & Producteur Musical' : (isElox ? 'DJ & Événementiel' : (isVision ? 'Musique et Événementiel Électronique' : defaultConfig.activitySector)));
    if (!isDfazz && (activitySector === 'DJ & Producteur Musical' && data.sector)) {
      activitySector = data.sector;
    }

    return {
      ...defaultConfig,
      ...data,
      companyName,
      slug: data.slug || (isVision ? 'clubvisionroom' : cleanUid),
      logoUrl: resolvedLogo,
      avatar: data.avatar || resolvedLogo,
      products: data.products,
      items: data.items,
      mockups: data.mockups,
      theme: data.theme || (isElox || isDokiin || isVision ? 'dark' : defaultConfig.theme),
      accentColor: data.accentColor || (isElox ? '#00ff88' : (isDokiin ? '#38bdf8' : (isVision ? '#3b82f6' : defaultConfig.accentColor))),
      logoOverlayColor: data.logoOverlayColor || (isElox ? 'original' : (isDokiin ? 'white' : 'auto')),
      enableLiveWidget: data.enableLiveWidget !== undefined ? data.enableLiveWidget : (isDfazz || isElox),
      liveWidgetStatus: data.liveWidgetStatus || (isDfazz ? '🟢 En Live au Bar Le Club VIP' : (isElox ? '🟢 En Tournée / Liège • Bruxelles • Dinant' : (isVision ? '🟢 Saison Club Vision Room Active' : ''))),
      contactEmail: data.email || data.contactEmail || data.userData?.email || (isDfazz ? 'Fabriziomagistro89@gmail.com' : (isElox ? 'contact@djelox.be' : (isVision ? 'contact@clubvisionroom.com' : defaultConfig.contactEmail))),
      whatsappNumber: data.whatsappNumber || data.whatsapp || (isDfazz ? '+32492104603' : ''),
      generatedKey: data.actuationKey || data.generatedKey || data.projectId || '',
      activitySector,
      socials: mergedSocials,
      customLinks: data.customLinks || [],
      customSections: data.customSections || [],
      sectionOrder: data.sectionOrder || defaultConfig.sectionOrder,
      livePhotoUrl: resolvedLivePhoto,
      livePhotoUrls: resolvedLivePhotoList,
      totalMarginAvailable: data.totalMarginAvailable || 0,
      invertLogoInLightMode: data.invertLogoInLightMode !== false,
      logoScale: data.logoScale !== undefined ? data.logoScale : 100,
      coverHeight: data.coverHeight !== undefined ? data.coverHeight : 300,
      coverZoom: data.coverZoom !== undefined ? data.coverZoom : 100,
      coverPositionY: data.coverPositionY !== undefined ? data.coverPositionY : 50,
      coverPositionX: data.coverPositionX !== undefined ? data.coverPositionX : 50
    };
  };

  try {
    // 1. Try SiteConfigs
    if (actualUid === 'fabrizio' || actualUid === 'djdfazz') {
      const fabSnap = await getDoc(doc(db, "SiteConfigs", "guest_ms3ijgnco2xnid"));
      if (fabSnap.exists()) {
        return parseDoc(fabSnap.data());
      }
    }

    const siteConfigRef = doc(db, "SiteConfigs", actualUid);
    const siteConfigSnap = await getDoc(siteConfigRef);
    if (siteConfigSnap.exists()) {
      const d = siteConfigSnap.data();
      if (isDfazzUser || (!d.companyName?.toLowerCase().includes('dfazz'))) {
        return parseDoc(d);
      }
    }

    if (cleanUid !== actualUid) {
      const cleanSiteSnap = await getDoc(doc(db, "SiteConfigs", cleanUid));
      if (cleanSiteSnap.exists()) {
        const d = cleanSiteSnap.data();
        if (isDfazzUser || (!d.companyName?.toLowerCase().includes('dfazz'))) {
          return parseDoc(d);
        }
      }
    }

    // 2. Try anonymous_previews with actualUid and cleanUid
    const prevRef = doc(db, "anonymous_previews", actualUid);
    const prevSnap = await getDoc(prevRef);
    if (prevSnap.exists()) {
      return parseDoc(prevSnap.data());
    }

    if (cleanUid !== actualUid) {
      const cleanPrevSnap = await getDoc(doc(db, "anonymous_previews", cleanUid));
      if (cleanPrevSnap.exists()) {
        return parseDoc(cleanPrevSnap.data());
      }
    }

    try {
      const qSlug = query(collection(db, "anonymous_previews"), where("companySlug", "==", cleanUid));
      const sSnap = await getDocs(qSlug);
      if (!sSnap.empty) {
        return parseDoc(sSnap.docs[0].data());
      }
    } catch {}

    try {
      const qPrev = query(collection(db, "anonymous_previews"), where("previewId", "==", actualUid));
      const pSnap = await getDocs(qPrev);
      if (!pSnap.empty) {
        return parseDoc(pSnap.docs[0].data());
      }
    } catch {}

    // 3. Try btp_projects
    const btpRef = doc(db, "btp_projects", actualUid);
    const btpSnap = await getDoc(btpRef);
    if (btpSnap.exists()) {
      return parseDoc(btpSnap.data());
    }

    if (cleanUid !== actualUid) {
      const cleanBtpSnap = await getDoc(doc(db, "btp_projects", cleanUid));
      if (cleanBtpSnap.exists()) {
        return parseDoc(cleanBtpSnap.data());
      }
    }

    // 4. Try configs
    const uidRef = doc(db, "configs", actualUid);
    const uidSnap = await getDoc(uidRef);
    if (uidSnap.exists()) {
      return parseDoc(uidSnap.data());
    }

    // 5. Fallback to default config
    if (isDfazzUser) {
      const defaultRef = doc(db, "configs", DOC_ID);
      const defaultSnap = await getDoc(defaultRef);
      if (defaultSnap.exists()) {
        return parseDoc(defaultSnap.data());
      }
    }
  } catch (e) {
    console.error("Firebase Read Error:", e);
  }

  // Local storage cache lookup fallback
  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem(`fast_artist_cache_v92_${cleanUid}`) || 
                     localStorage.getItem(`fast_artist_cache_${cleanUid}`) ||
                     localStorage.getItem(`fast_artist_cache_v92_${actualUid}`) ||
                     localStorage.getItem(`fast_artist_cache_${actualUid}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && typeof parsed === 'object') {
          return parseDoc(parsed);
        }
      }
    } catch {}
  }

  // Explicit fallback for Club Vision Room if Firestore read failed or doc not in Firestore
  if (isVisionUser) {
    return parseDoc({
      uid: 'clubvisionroom',
      slug: 'clubvisionroom',
      companyName: 'Club Vision Room',
      activitySector: 'Musique et Événementiel Électronique',
      logoUrl: 'https://storage.googleapis.com/signaid-prod-assets/users/mt074jnaldxn/logos/1787803061043_logo_dtf.png',
      livePhotoUrl: 'https://storage.googleapis.com/signaid-prod-assets/users/mt074jnaldxn/gallery/1787808082062_cover.jpg',
      livePhotoUrls: ['https://storage.googleapis.com/signaid-prod-assets/users/mt074jnaldxn/gallery/1787808082062_cover.jpg'],
      accentColor: '#3b82f6',
      contactEmail: 'contact@clubvisionroom.com'
    });
  }

  return parseDoc({});
}

// Global Write Queue & Debounce map to prevent Firestore Resource Exhausted (429/quota errors)
const saveDebounceTimers = new Map<string, any>();
const savePendingPayloads = new Map<string, any>();
const activeWriteLocks = new Set<string>();

export async function saveStoredConfig(config: SiteConfig, uid?: string): Promise<void> {
  const docId = uid || DOC_ID;
  const companySlug = (config.companyName || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '');
  const cleanUid = docId.replace(/^audit-/, '');
  
  const dataToSave: any = {
    ...config,
    slug: companySlug || config.slug || cleanUid,
    email: config.contactEmail || '',
    actuationKey: config.generatedKey || config.actuationKey || '',
    sector: config.activitySector || config.sector || '',
    updatedAt: new Date().toISOString()
  };

  // Strip any temporary local blob: URLs so they are never saved into Firestore
  const tempUrlKeys = ['logoUrl', 'auditLogoUrl', 'logoAdaptedUrl', 'logoA', 'logoB', 'visualLogoUrl', 'avatar', 'logo', 'livePhotoUrl'];
  tempUrlKeys.forEach((k) => {
    if (typeof dataToSave[k] === 'string' && dataToSave[k].startsWith('blob:')) {
      delete dataToSave[k];
    }
  });
  
  const sanitizedPayload = sanitizeForFirestore(dataToSave);

  return new Promise((resolve) => {
    savePendingPayloads.set(docId, sanitizedPayload);

    if (saveDebounceTimers.has(docId)) {
      clearTimeout(saveDebounceTimers.get(docId));
    }

    const timer = setTimeout(async () => {
      saveDebounceTimers.delete(docId);
      const payloadToWrite = savePendingPayloads.get(docId);
      savePendingPayloads.delete(docId);

      if (!payloadToWrite) {
        return resolve();
      }

      if (activeWriteLocks.has(docId)) {
        await new Promise(r => setTimeout(r, 200));
      }

      activeWriteLocks.add(docId);

      try {
        const uniqueTargets = new Set<string>();
        uniqueTargets.add(docId);
        if (docId.startsWith('audit-') && cleanUid) uniqueTargets.add(cleanUid);
        if (companySlug && companySlug !== 'noname') uniqueTargets.add(companySlug);

        // Batch unique parallel writes
        const writePromises: Promise<any>[] = [];
        for (const targetId of uniqueTargets) {
          writePromises.push(setDoc(doc(db, "SiteConfigs", targetId), payloadToWrite, { merge: true }));
          writePromises.push(setDoc(doc(db, "anonymous_previews", targetId), payloadToWrite, { merge: true }));
          writePromises.push(setDoc(doc(db, "configs", targetId), payloadToWrite, { merge: true }));
        }

        await Promise.allSettled(writePromises);
        resolve();
      } catch (e) {
        console.error("Firebase Debounced Write Error:", e);
        resolve(); // Résout pour éviter de bloquer l'UI
      } finally {
        activeWriteLocks.delete(docId);
      }
    }, 350);

    saveDebounceTimers.set(docId, timer);
  });
}

export const saveSiteConfig = saveStoredConfig;

// URL Generators
export const generateMapsUrl = (address: string) => 
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

export const generateWhatsAppUrl = (number: string) => 
  `https://wa.me/${number.replace(/[^0-9]/g, '')}`;

export const getEmbedVideoUrl = (url: string) => {
  if (!url) return "";
  
  // YouTube
  if (url.includes("youtube.com") || url.includes("youtu.be")) {
    const id = url.includes("v=") ? url.split("v=")[1].split("&")[0] : url.split("/").pop();
    return `https://www.youtube.com/embed/${id}`;
  }
  
  // Vimeo
  if (url.includes("vimeo.com")) {
    const id = url.split("/").pop();
    return `https://player.vimeo.com/video/${id}`;
  }

  // Instagram (bypass X-Frame-Options)
  if (url.includes("instagram.com")) {
    const cleanUrl = url.split("?")[0].replace(/\/$/, ""); // Remove query and trailing slash
    const parts = cleanUrl.split("/");
    const id = parts[parts.length - 1];
    if (id && id.length > 5) { // IDs are usually long
       return `https://www.instagram.com/p/${id}/embed/`;
    }
  }

  // TikTok
  if (url.includes("tiktok.com")) {
    const parts = url.split("/");
    const id = parts[parts.length - 1].split("?")[0];
    return `https://www.tiktok.com/embed/v2/${id}`;
  }

  return url;
};


// Direct Fetch to Gemini API
export const generateAIPresentation = async (pitch: SiteConfig['rawPitch']) => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) return "Clé API Gemini manquante.";

  const prompt = `Génère exactement 3 options de présentation marketing courtes (max 3 phrases par option) en français pour un site vitrine basé sur ces infos :
  - Ce que je vends : ${pitch.what}
  - À qui : ${pitch.who}
  - Ma différence : ${pitch.difference}
  - Service proposé : ${pitch.service}
  Le ton doit être professionnel, accrocheur et minimaliste.
  
  Tu DOIS retourner les 3 options séparées de cette façon exacte, sans autre texte d'introduction ni de conclusion :
  OPTION_1: [Option 1 - Axée sur la solution]
  OPTION_2: [Option 2 - Axée sur la cible client]
  OPTION_3: [Option 3 - Axée sur la différence/innovation]`;

  try {
    const versions = ['v1beta', 'v1'];
    const models = ['gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-flash-latest'];
    for (const v of versions) {
      for (const m of models) {
        try {
          const response = await fetch(`https://generativelanguage.googleapis.com/${v}/models/${m}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
          });
          const data = await response.json();
          if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
            return data.candidates[0].content.parts[0].text;
          }
        } catch {}
      }
    }
    return "Erreur : Aucun modèle disponible.";
  } catch {
    return "Erreur lors de la connexion à l'IA.";
  }
};

export const generatePitchFromWebSearch = async (queryStr: string): Promise<SiteConfig['rawPitch'] | null> => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) throw new Error("Clé API Gemini manquante.");

  const prompt = `Tu es un expert en marketing d'entreprise. Fais une recherche sur l'entreprise ou le site web suivant : "${queryStr}".
En te basant UNIQUEMENT sur les informations trouvées sur internet concernant cette entreprise (via Google Search), génère une présentation marketing courte et percutante (1 phrase max par champ).
IMPORTANT : Même si le lien est inaccessible (comme Facebook ou Instagram), cherche le nom de la page dans Google ou déduis l'activité depuis l'URL. Tu DOIS ABSOLUMENT renvoyer le JSON dans tous les cas, même en faisant des suppositions logiques. Ne réponds JAMAIS que tu ne peux pas y accéder.

Formatte ta réponse EXACTEMENT avec ce JSON valide et rien d'autre :
{
  "what": "Ce que vend l'entreprise (ex: Des sites vitrine sur mesure)",
  "who": "Cible principale de l'entreprise (ex: Entrepreneurs, PME et artisans)",
  "difference": "Différence unique / Valeur ajoutée (ex: Design unique, service clé en main)",
  "service": "Bénéfice principal pour le client (ex: Impact maximal pour booster l'activité)"
}`;

  try {
    const versions = ['v1beta', 'v1'];
    const models = ['gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-flash-latest'];
    
    let lastErrorData = null;

    for (const v of versions) {
      for (const m of models) {
        try {
          const response = await fetch(`https://generativelanguage.googleapis.com/${v}/models/${m}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              contents: [{ parts: [{ text: prompt }] }],
              tools: [{ googleSearch: {} }]
            })
          });
          
          const data = await response.json();
          lastErrorData = data;
          
          if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
            const text = data.candidates[0].content.parts[0].text;
            console.log(`Raw AI Response (${m}):`, text);
            
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              try {
                return JSON.parse(jsonMatch[0]);
              } catch (parseError) {
                console.error("JSON Parse Error:", parseError);
                // On continue la boucle si c'est un format invalide, ou on sort selon le choix
                // Mais s'il a réussi l'appel API, c'est mieux de s'arrêter ici
                alert("L'IA a généré un format invalide. Vérifiez la console.");
                return null;
              }
            } else {
              console.warn("No JSON found in response:", text);
              alert("L'IA n'a pas pu trouver les informations ou l'accès a été bloqué (ex: Facebook). Réponse brute : " + text.substring(0, 100) + "...");
              return null;
            }
          }
        } catch (fetchErr) {
          // Ignorer l'erreur réseau et essayer le modèle suivant
          console.warn(`Fetch error for ${m}:`, fetchErr);
        }
      }
    }
    
    // Si on arrive ici, aucun modèle n'a marché
    console.error("All models failed. Last API Response:", lastErrorData);
    alert("Erreur de l'API avec tous les modèles. Dernière erreur: " + (lastErrorData?.error?.message || "Inconnue"));
    return null;
  } catch (err) {
    console.error("Web search AI error:", err);
    return null;
  }
};

export function processLogo(dataUrl: string): Promise<{ theme: 'light' | 'dark', accent: string, resized: string }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX_WIDTH = 250;
      let width = img.width;
      let height = img.height;
      if (width > MAX_WIDTH) {
        height *= MAX_WIDTH / width;
        width = MAX_WIDTH;
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve({ theme: 'dark', accent: 'rgb(59, 130, 246)', resized: dataUrl });
      ctx.drawImage(img, 0, 0, width, height);
      const resized = canvas.toDataURL('image/webp', 0.5);
      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;
      let maxSaturation = -1;
      let vibrantColor = { r: 59, g: 130, b: 246 };
      let brightnessSum = 0;
      let validPixels = 0;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i+1], b = data[i+2], a = data[i+3];
        if (a < 128) continue;
        const brightness = Math.floor((r * 299 + g * 587 + b * 114) / 1000);
        brightnessSum += brightness;
        validPixels++;
        const max = Math.max(r, g, b) / 255;
        const min = Math.min(r, g, b) / 255;
        const saturation = max === 0 ? 0 : (max - min) / max;
        const isGrey = Math.abs(r - g) < 20 && Math.abs(g - b) < 20;
        if (!isGrey && saturation > maxSaturation && brightness > 50 && brightness < 230) {
          maxSaturation = saturation;
          vibrantColor = { r, g, b };
        }
      }
      const accent = `rgb(${vibrantColor.r}, ${vibrantColor.g}, ${vibrantColor.b})`;
      const theme = (brightnessSum / (validPixels || 1)) > 200 ? 'light' : 'dark';
      resolve({ theme, accent, resized });
    };
    img.src = dataUrl;
  });
}

export const cleanText = (text: string) => {
  return text.replace(/[^\w\s\u00C0-\u017F\-\.\,\!\?\(\)\/]/gi, '');
};

export const highlightKeywords = (text: string) => {
  const keywords = ['Signaid', 'BTP', 'EPI', 'premium', 'élite', 'logistique', 'automatisé', '3D', 'IA', 'chantier', 'digitalisation', 'image de marque', 'autorité', 'SaaS', 'Excel'];
  let highlighted = text;

  // 1. Auto-link URLs (naive check to avoid tags)
  const urlReg = /((https?:\/\/)|(www\.))?([a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)(\/[^\s]*)?/g;
  highlighted = highlighted.replace(urlReg, (match, protocol, _, www, domain, path) => {
    const fullUrl = protocol ? match : `https://${match}`;
    return `<a href="${fullUrl}" target="_blank" rel="noopener noreferrer" style="color:var(--accent-color); text-decoration:underline; font-weight:bold;">${match}</a>`;
  });

  // 2. Specific Portal Links
  highlighted = highlighted.replace(/\bPORTAIL BTP\b/gi, '<a href="/btp" style="color:var(--accent-color); text-decoration:underline; font-weight:bold;">PORTAIL BTP</a>');
  highlighted = highlighted.replace(/\bPORTAIL CRÉATEUR\b/gi, '<a href="/creation" style="color:var(--accent-color); text-decoration:underline; font-weight:bold;">PORTAIL CRÉATEUR</a>');

  // 3. Highlight Keywords
  keywords.forEach(word => {
    const reg = new RegExp(`\\b(${word})\\b`, 'gi');
    highlighted = highlighted.replace(reg, '<strong>$1</strong>');
  });
  
  return highlighted;
};

export const generatePitchFromDocument = async (base64Data: string, mimeType: string): Promise<any> => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) throw new Error("Clé API Gemini manquante.");

  const prompt = `Tu es un expert en marketing d'entreprise. Tu as reçu ce document contenant des informations sur une entreprise (qui peut être un questionnaire rempli par le client, une brochure, un devis, une fiche...).
Extrais et déduis le maximum d'informations possibles pour pré-remplir sa fiche vitrine.
Remplis les champs avec des informations réalistes issues du document. Ne laisse aucun champ vide si tu peux déduire ou supposer logiquement l'information.
Formatte ta réponse EXACTEMENT avec ce JSON valide et rien d'autre :
{
  "companyName": "Nom de l'entreprise",
  "activitySector": "Secteur d'activité principal (ex: BTP, Sport, Peinture, etc.)",
  "contactEmail": "E-mail de contact",
  "whatsappNumber": "Numéro de téléphone / WhatsApp (au format international comme +33612345678)",
  "address": "Adresse physique complète",
  "website": "Site internet principal",
  "pitchWhat": "Ce que vend l'entreprise (1 phrase)",
  "pitchWho": "Cible principale de l'entreprise (1 phrase)",
  "pitchDiff": "Différence unique / Valeur ajoutée (1 phrase)",
  "pitchService": "Bénéfice principal pour le client (1 phrase)",
  "facebook": "Lien ou nom d'utilisateur Facebook (ou vide)",
  "instagram": "Lien ou nom d'utilisateur Instagram (ou vide)",
  "linkedin": "Lien ou nom d'utilisateur LinkedIn (ou vide)",
  "tiktok": "Lien ou nom d'utilisateur TikTok (ou vide)"
}`;

  try {
    const versions = ['v1beta', 'v1'];
    const models = ['gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-flash-latest'];
    
    let lastErrorData = null;

    for (const v of versions) {
      for (const m of models) {
        try {
          const response = await fetch(`https://generativelanguage.googleapis.com/${v}/models/${m}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              contents: [{
                parts: [
                  {
                    inlineData: {
                      mimeType: mimeType,
                      data: base64Data
                    }
                  },
                  { text: prompt }
                ]
              }]
            })
          });
          
          const data = await response.json();
          lastErrorData = data;
          
          if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
            const text = data.candidates[0].content.parts[0].text;
            console.log(`Raw Document Parse Response (${m}):`, text);
            
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              try {
                return JSON.parse(jsonMatch[0]);
              } catch (parseError) {
                console.error("JSON Parse Error:", parseError);
                return null;
              }
            }
          }
        } catch (fetchErr) {
          console.warn(`Fetch error for ${m}:`, fetchErr);
        }
      }
    }
    console.error("All models failed. Last API Response:", lastErrorData);
    return null;
  } catch (err) {
    console.error("Document parsing AI error:", err);
    return null;
  }
};

