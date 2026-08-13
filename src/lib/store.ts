import { doc, getDoc, setDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebaseConfig";

export type Social = {
  platform: string;
  url: string;
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
  address: string;
  contactEmail: string;
  whatsappNumber: string;
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
  totalMarginAvailable?: number;
  totalSales?: number;
  revenue?: number;
  ordersCount?: number;
  isPremium?: boolean;
  isGuest?: boolean;
  invertLogoInLightMode?: boolean;
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
  invertLogoInLightMode: true
};

export function getCanonicalSlug(id?: string): string {
  if (!id) return 'guest_ms3ijgnco2xnid';
  const clean = id.toLowerCase().trim().replace(/https?:\/\//, '').replace(/\/.*$/, '').replace('www.', '');
  if (clean === 'fabrizio' || clean === 'djdfazz' || clean === 'djdfazz.be' || clean === 'audit-8f198p5' || clean === 'guest_ms3ijgnco2xnid') {
    return 'guest_ms3ijgnco2xnid';
  }
  return id;
}

export async function getStoredConfig(uid?: string): Promise<SiteConfig> {
  const parseDoc = (data: any): SiteConfig => ({
    ...defaultConfig,
    ...data,
    companyName: data.companyName || data.name || data.userData?.companyName || '',
    contactEmail: data.email || data.contactEmail || data.userData?.email || defaultConfig.contactEmail,
    generatedKey: data.actuationKey || data.generatedKey || data.projectId || '',
    activitySector: data.sector || data.activitySector || data.userData?.activity || defaultConfig.activitySector,
    socials: data.socials || defaultConfig.socials,
    customLinks: data.customLinks || [],
    customSections: data.customSections || [],
    sectionOrder: data.sectionOrder || defaultConfig.sectionOrder,
    livePhotoUrl: data.livePhotoUrl || '',
    livePhotoUrls: data.livePhotoUrls || (data.livePhotoUrl ? [data.livePhotoUrl] : []),
    totalMarginAvailable: data.totalMarginAvailable || 0,
    invertLogoInLightMode: data.invertLogoInLightMode !== false
  });

  try {
    const rawUid = uid || 'guest_ms3ijgnco2xnid';
    const canonicalId = getCanonicalSlug(rawUid);

    // 1. Fetch canonical document from SiteConfigs
    const canonicalSnap = await getDoc(doc(db, "SiteConfigs", canonicalId));
    if (canonicalSnap.exists()) {
      const data = canonicalSnap.data();
      if (data.aliasOf && data.aliasOf !== canonicalId) {
        const targetSnap = await getDoc(doc(db, "SiteConfigs", data.aliasOf));
        if (targetSnap.exists()) {
          return parseDoc(targetSnap.data());
        }
      }
      return parseDoc(data);
    }

    // 2. Fetch rawUid document if different
    if (rawUid !== canonicalId) {
      const siteConfigRef = doc(db, "SiteConfigs", rawUid);
      const siteConfigSnap = await getDoc(siteConfigRef);
      if (siteConfigSnap.exists()) {
        const data = siteConfigSnap.data();
        if (data.canonicalSlug || data.aliasOf) {
          const target = data.canonicalSlug || data.aliasOf;
          const targetSnap = await getDoc(doc(db, "SiteConfigs", target));
          if (targetSnap.exists()) return parseDoc(targetSnap.data());
        }
        return parseDoc(data);
      }
    }

    try {
      const qSlug = query(collection(db, "SiteConfigs"), where("slug", "==", rawUid));
      const sSnap = await getDocs(qSlug);
      if (!sSnap.empty) {
        return parseDoc(sSnap.docs[0].data());
      }
    } catch {}

    try {
      const qKey = query(collection(db, "SiteConfigs"), where("generatedKey", "==", rawUid));
      const kSnap = await getDocs(qKey);
      if (!kSnap.empty) {
        return parseDoc(kSnap.docs[0].data());
      }
    } catch {}

    try {
      const qAct = query(collection(db, "SiteConfigs"), where("actuationKey", "==", rawUid));
      const aSnap = await getDocs(qAct);
      if (!aSnap.empty) {
        return parseDoc(aSnap.docs[0].data());
      }
    } catch {}

    // 2. Try btp_projects doc ID or projectId query
    const btpRef = doc(db, "btp_projects", rawUid);
    const btpSnap = await getDoc(btpRef);
    if (btpSnap.exists()) {
      return parseDoc(btpSnap.data());
    }

    try {
      const qProj = query(collection(db, "btp_projects"), where("projectId", "==", rawUid));
      const qSnap = await getDocs(qProj);
      if (!qSnap.empty) {
        return parseDoc(qSnap.docs[0].data());
      }
    } catch {}

    // 3. Try anonymous_previews doc ID or previewId query
    const prevRef = doc(db, "anonymous_previews", rawUid);
    const prevSnap = await getDoc(prevRef);
    if (prevSnap.exists()) {
      return parseDoc(prevSnap.data());
    }

    try {
      const qPrev = query(collection(db, "anonymous_previews"), where("previewId", "==", rawUid));
      const pSnap = await getDocs(qPrev);
      if (!pSnap.empty) {
        return parseDoc(pSnap.docs[0].data());
      }
    } catch {}

    // 4. Try configs
    const uidRef = doc(db, "configs", rawUid);
    const uidSnap = await getDoc(uidRef);
    if (uidSnap.exists()) {
      return parseDoc(uidSnap.data());
    }

    // 3. Fallback to shared single_config
    const defaultRef = doc(db, "configs", "single_config");
    const defaultSnap = await getDoc(defaultRef);
    if (defaultSnap.exists()) {
      const config = parseDoc(defaultSnap.data());
      if (uid) {
        try {
          await setDoc(doc(db, "SiteConfigs", uid), defaultSnap.data());
        } catch (migErr) {}
      }
      return config;
    }
  } catch (e) {
    console.error("Firebase Read Error:", e);
  }
  return defaultConfig;
}

export async function saveStoredConfig(config: SiteConfig, uid?: string) {
  try {
    const docId = uid || "single_config";
    const dataToSave = {
      ...config,
      email: config.contactEmail || '',
      actuationKey: config.generatedKey || config.actuationKey || '',
      sector: config.activitySector || config.sector || '',
    };
    
    const siteConfigRef = doc(db, "SiteConfigs", docId);
    await setDoc(siteConfigRef, dataToSave);

    const configsRef = doc(db, "configs", docId);
    await setDoc(configsRef, dataToSave);
  } catch (e) {
    console.error("Firebase Write Error:", e);
    throw e;
  }
}

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
    const models = ['gemini-2.5-flash', 'gemini-3.5-flash', 'gemini-flash-latest'];
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
    const models = ['gemini-2.5-flash', 'gemini-3.5-flash', 'gemini-flash-latest'];
    
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
    const models = ['gemini-2.5-flash', 'gemini-3.5-flash', 'gemini-flash-latest'];
    
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

