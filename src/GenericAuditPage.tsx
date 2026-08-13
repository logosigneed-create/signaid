import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, ShieldCheck, Zap, Layout, Loader2, Sparkles, LogIn, CheckSquare, Shield, Layers, CheckCircle2, RefreshCcw, Trash2, RefreshCw, Play, Check, Terminal, Wind, Sun, Moon, Info, ArrowLeft, ShieldAlert, Clock, TrendingUp, ArrowRight, ExternalLink, Download, Wand2, Shirt, Crop } from 'lucide-react';
import { collection, addDoc, serverTimestamp, query, where, getDocs, doc, getDoc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, storage, auth } from './firebaseConfig';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { SEO } from './components/SEO';
import { geminiService } from './services/geminiService';
import { getStoredConfig, saveStoredConfig, getCanonicalSlug } from './lib/store';
import { sanitizeForFirestore } from './utils/firestoreSanitizer';
import { deleteStorageFileByUrl } from './utils/storageCleaner';
import QRCode from 'qrcode';
import AdminQuickBar from './components/AdminQuickBar';

type FlowState = 'LANDING' | 'CLEAN_CHECK' | 'SALES_AUDIT' | 'AUDIT' | 'RESULT' | 'ERROR' | 'INBOUND_WAITING';

interface UserData {
    companyName: string;
    email: string;
    activity: string;
    phone: string;
    website: string;
    tva: string;
    showActivity: boolean;
    showPhone: boolean;
    showWebsite: boolean;
    showVat: boolean;
}

interface MockupItem {
    id: string;
    title: string;
    base: string;
    ai: string | null;
    aiRemastered: string | null;
    isGenerating: boolean;
    view: 'front' | 'back';
    garment: 'tshirt' | 'tshirt_basic' | 'polo' | 'sweat' | 'tshirt_bicolore' | 'veste' | 'business_card' | 'banner';
    mechanical?: string | null;
    model?: string;
    selected: boolean;
}

interface BtpLogo {
    id: 'A' | 'B';
    original: string | null;
    adapted: string | null;
    remastered: string | null;
    activeUrl?: string | null;
    mode?: 'original' | 'adapted' | 'adaptedBlack' | 'remastered';
}

const compressBase64Image = (base64Str: string, maxWidth = 800, quality = 0.82): Promise<string> => {
    return new Promise((resolve) => {
        if (!base64Str || typeof base64Str !== 'string' || !base64Str.startsWith('data:image')) {
            return resolve(base64Str);
        }
        if (base64Str.length < 200000) {
            return resolve(base64Str);
        }
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            let width = img.width;
            let height = img.height;
            if (width > maxWidth) {
                height = Math.round((height * maxWidth) / width);
                width = maxWidth;
            }
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(img, 0, 0, width, height);
                const compressed = canvas.toDataURL('image/webp', quality);
                resolve(compressed.length < base64Str.length ? compressed : base64Str);
            } else {
                resolve(base64Str);
            }
        };
        img.onerror = () => resolve(base64Str);
        img.src = base64Str;
    });
};

// ARCHITECTE : THE VAULT - MIGRATION DYNAMIQUE
// Les placements sont désormais récupérés via Firestore pour une scalabilité totale.
// Fallback local pour assurer la continuité de service.
const DEFAULT_PLACEMENTS = {
    tshirt: {
        front: { x: 0.64, y: 0.30, scale: 0.20 },
        back: { x: 0.50, y: 0.38, scale: 0.35 }
    },
    tshirt_basic: {
        front: { x: 0.64, y: 0.30, scale: 0.20 },
        back: { x: 0.50, y: 0.38, scale: 0.35 }
    },
    polo: {
        front: { x: 0.64, y: 0.32, scale: 0.18 },
        back: { x: 0.50, y: 0.38, scale: 0.35 }
    },
    tshirt_bicolore: {
        front: { x: 0.64, y: 0.32, scale: 0.20 },
        back: { x: 0.50, y: 0.32, scale: 0.35 }
    },
    sweat: {
        front: { x: 0.64, y: 0.34, scale: 0.20 },
        back: { x: 0.50, y: 0.46, scale: 0.35 }
    },
    veste: {
        front: { x: 0.50, y: 0.45, scale: 0.15 },
        back: { x: 0.50, y: 0.40, scale: 0.35 }
    }
};
let PLACEMENTS = DEFAULT_PLACEMENTS;

// INDEXED DB STORAGE FOR HEAVY ASSETS
const STORAGE_CONFIG = { db: 'BtpAuditDB', store: 'heavy_assets' };
const openDB = (): Promise<IDBDatabase> => new Promise((resolve, reject) => {
    const r = indexedDB.open(STORAGE_CONFIG.db, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORAGE_CONFIG.store);
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
});
const dbSet = async (key: string, val: string) => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORAGE_CONFIG.store, 'readwrite');
        tx.objectStore(STORAGE_CONFIG.store).put(val, key);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error);
    });
};
const dbGet = async (key: string): Promise<string | null> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORAGE_CONFIG.store, 'readonly');
        const r = tx.objectStore(STORAGE_CONFIG.store).get(key);
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
    });
};

const GenericAuditPage: React.FC = () => {
    const navigate = useNavigate();
    const hasRedirected = useRef(false);
    const isAuditPath = window.location.pathname === '/portail-audit';
    const [state, setState] = useState<FlowState>('LANDING');
    const [isLoaded, setIsLoaded] = useState(false);
    const [isInbound, setIsInbound] = useState(false);
    const [isConfigOpen, setIsConfigOpen] = useState(true);

    // MULTI-LOGO STATE
    const [logoA, setLogoA] = useState<BtpLogo>({ id: 'A', original: null, adapted: null, remastered: null, mode: 'original' });
    const [logoB, setLogoB] = useState<BtpLogo>({ id: 'B', original: null, adapted: null, remastered: null, mode: 'original' });
    const [logoPlacements, setLogoPlacements] = useState<Record<string, 'A' | 'B'>>({
        tFront: 'A',
        tBack: 'A',
        vFront: 'A',
        vBack: 'A',
        hFront: 'A',
        hBack: 'A',
        cardFront: 'A',
        cardBack: 'A'
    });

    const [logoScaleFront, setLogoScaleFront] = useState(0.20);
    const [logoScaleBack, setLogoScaleBack] = useState(0.40);
    const [isBatConfirmed, setIsBatConfirmed] = useState(false);
    const [noiseThreshold, setNoiseThreshold] = useState(5);
    const [enableThickening, setEnableThickening] = useState(false);
    const [enableStroke, setEnableStroke] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [showCropModal, setShowCropModal] = useState(false);
    const [logoAnalysis, setLogoAnalysis] = useState<any>(null);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [previewId, setPreviewId] = useState<string | null>(null);
    const [hasReferralDiscount, setHasReferralDiscount] = useState(false);

    const [mockups, setMockups] = useState<MockupItem[]>(() => [
        // CLASSIC BLACK
        { id: 'tFront', title: 'T-shirt Noir FACE', base: "/assets/tshirt-black-JHK170.png?v=V24", ai: null, aiRemastered: null, isGenerating: false, view: 'front' as const, garment: 'tshirt' as const, mechanical: null, model: "/assets/models/male_tshirt_front.png", selected: true },
        { id: 'tBack', title: 'T-shirt Noir DOS', base: "/assets/tshirt-black-JHK170-dos.png?v=V24", ai: null, aiRemastered: null, isGenerating: false, view: 'back' as const, garment: 'tshirt' as const, mechanical: null, model: "/assets/models/male_tshirt_back.png", selected: true },
        
        // POLO PREMIUM
        { id: 'pFront', title: 'Polo Premium FACE', base: "/assets/polo-black-JHK510.png?v=V24", ai: null, aiRemastered: null, isGenerating: false, view: 'front' as const, garment: 'polo' as const, mechanical: null, model: "/assets/models/male_tshirt_front.png", selected: true },
        { id: 'pBack', title: 'Polo Premium DOS', base: "/assets/polo-black-JHK510-dos.png?v=V24", ai: null, aiRemastered: null, isGenerating: false, view: 'back' as const, garment: 'polo' as const, mechanical: null, model: "/assets/models/male_tshirt_back.png", selected: true },

        // HOODIE
        { id: 'hFront', title: 'Hoodie FACE', base: "/assets/hoodie-black-JHK421.png?v=V24", ai: null, aiRemastered: null, isGenerating: false, view: 'front' as const, garment: 'sweat' as const, mechanical: null, model: "/assets/models/male_hoodie_front.png", selected: true },
        { id: 'hBack', title: 'Hoodie DOS', base: "/assets/hoodie-black-JHK421-dos.png?v=V24", ai: null, aiRemastered: null, isGenerating: false, view: 'back' as const, garment: 'sweat' as const, mechanical: null, model: "/assets/models/male_hoodie_back.png", selected: true },

        // MARKETING ASSETS
        { id: 'cardFront', title: 'Carte Visite RECTO', base: "/assets/card-base.svg", ai: null, aiRemastered: null, isGenerating: false, view: 'front' as const, garment: 'business_card' as const, mechanical: null, model: "/assets/models/card_mockup_front_neutral.png", selected: true },
        { id: 'cardBack', title: 'Carte Visite VERSO', base: "/assets/card-base.svg", ai: null, aiRemastered: null, isGenerating: false, view: 'back' as const, garment: 'business_card' as const, mechanical: null, model: "/assets/models/card_mockup_back.png", selected: true }
    ]);
    const [activeMockupIndex, setActiveMockupIndex] = useState(0);
    const isShop = window.location.pathname.includes('portail-shop');
    const [statusMessage, setStatusMessage] = useState(isShop ? "Portail Produit V24 Actif..." : "Pipeline HD V24 Actif...");
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [stayLoggedIn, setStayLoggedIn] = useState(true);
    const [isRegenerating, setIsRegenerating] = useState(false);
    const [auditLogs, setAuditLogs] = useState<string[]>([]);
    const [credits, setCredits] = useState(3);
    const [isIpBlocked, setIsIpBlocked] = useState(false);
    const [assetColor, setAssetColor] = useState('#eeeeee');
    // PORTAL MODE LOGIC (URL BASED)
    const urlParams = new URLSearchParams(window.location.search);
    const portalId = urlParams.get('portal');
    const isPortalMode = !!portalId;

    // Helper to determine if a color is light (e.g. yellow or white) for background contrast calculations
    const isColorLight = (color: string): boolean => {
        if (!color) return false;
        let hex = color.trim().toLowerCase();
        if (hex === 'white' || hex === 'yellow' || hex === 'lightyellow' || hex === 'ivory' || hex === 'gold') return true;
        if (hex === 'black' || hex === 'navy' || hex === 'darkblue') return false;
        if (!hex.startsWith('#')) return false;
        const cleanHex = hex.replace('#', '');
        if (cleanHex.length !== 6 && cleanHex.length !== 3) return false;
        let r = 0, g = 0, b = 0;
        if (cleanHex.length === 6) {
            r = parseInt(cleanHex.substring(0, 2), 16);
            g = parseInt(cleanHex.substring(2, 4), 16);
            b = parseInt(cleanHex.substring(4, 6), 16);
        } else {
            r = parseInt(cleanHex[0] + cleanHex[0], 16);
            g = parseInt(cleanHex[1] + cleanHex[1], 16);
            b = parseInt(cleanHex[2] + cleanHex[2], 16);
        }
        const brightness = Math.sqrt(0.299 * (r * r) + 0.587 * (g * g) + 0.114 * (b * b));
        return brightness > 155;
    };

    // AUTOMATIC LIGHT MODE (PORTAL OR DAYLIGHT 9h-22h)
    const [isLightMode, setIsLightMode] = useState(false);

    useEffect(() => {
        const currentHour = new Date().getHours();
        const isDaylight = currentHour >= 9 && currentHour < 22;
        setIsLightMode((isPortalMode || isDaylight) && !isColorLight(assetColor));
    }, [isPortalMode, assetColor]);



    useEffect(() => {
        if (isAuditPath && state === 'LANDING') {
            // Optionnel: On pourrait forcer le passage à l'outil ici si besoin
        }
    }, [isAuditPath]);

    const scrollToResults = () => {
        setTimeout(() => {
            document.getElementById('simulation-results')?.scrollIntoView({ behavior: 'smooth' });
        }, 150);
    };

    useEffect(() => {
        if (state === 'AUDIT' || state === 'RESULT') {
            scrollToResults();
        }
    }, [state]);

    const [employeeName, setEmployeeName] = useState('');
    const [selectedSize, setSelectedSize] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [globalLogoColorMode, setGlobalLogoColorMode] = useState<'original' | 'white' | 'black'>('original');
    const [logoColorModes, setLogoColorModes] = useState<Record<string, 'original' | 'white' | 'black'>>({});
    const SIZES = ['S', 'M', 'L', 'XL', 'XXL', '3XL'];

    const changeGlobalLogoColor = (mode: 'original' | 'white' | 'black') => {
        setGlobalLogoColorMode(mode);
        setLogoColorModes(prev => {
            const next: Record<string, 'original' | 'white' | 'black'> = {};
            mockups.forEach(m => {
                next[m.id] = mode;
            });
            return next;
        });
    };

    const [userData, setUserData] = useState<UserData>({
        companyName: '',
        email: '',
        activity: '',
        phone: '',
        website: '',
        tva: '',
        showActivity: true,
        showPhone: true,
        showWebsite: true,
        showVat: true,
    });

    const [isDragging, setIsDragging] = useState(false);
    const [remasterStep, setRemasterStep] = useState<string | null>(null);
    const [syncLoader, setSyncLoader] = useState<{
        active: boolean;
        step: string;
        phase: number;
        logoUrl?: string;
        companyName?: string;
    } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const getModelForSector = useCallback((garment: string, view: string, sector: string) => {
        const s = sector?.toUpperCase();
        if (s === 'BTP') {
            if (garment === 'tshirt' && view === 'front') return "/assets/models/btp_strong_man_tshirt_front.png";
            if (garment === 'sweat' && view === 'front') return "/assets/models/btp_strong_man_hoodie_front.png";
        }
        // Fallback to standard
        if (garment === 'tshirt') return view === 'front' ? "/assets/models/male_tshirt_front.png" : "/assets/models/male_tshirt_back.png";
        if (garment === 'sweat') return view === 'front' ? "/assets/models/male_hoodie_front.png" : "/assets/models/male_hoodie_back.png";
        if (garment === 'business_card') return view === 'front' ? "/assets/models/card_mockup_front_neutral.png" : "/assets/models/card_mockup_back.png";
        return "/assets/models/male_tshirt_front.png";
    }, []);

    // HELPER: Get active logo for placement
    const getActiveLogoForPlacement = useCallback((placementId: string) => {
        const slot = logoPlacements[placementId] || 'A'; // Default to A if not found (fixes cards)
        const logo = slot === 'A' ? logoA : logoB;
        if (!logo.original) return null;
        if (logo.mode === 'remastered') return logo.remastered || logo.adapted;
        return logo.mode === 'original' ? logo.original : logo.adapted;
    }, [logoA, logoB, logoPlacements]);

    // DYNAMIC MODELS BASED ON SECTOR
    useEffect(() => {
        setMockups(prev => prev.map(m => ({
            ...m,
            model: getModelForSector(m.garment, m.view, userData.activity)
        })));
    }, [userData.activity, getModelForSector]);

    // REAL-TIME MECHANICAL GABARIT RE-RENDERING ON COLOR MODE / SCALE CHANGE
    useEffect(() => {
        if (state !== 'RESULT' && state !== 'AUDIT') return;
        const timer = setTimeout(() => {
            const updateMechanicals = async () => {
                const updated = await Promise.all(mockups.map(async (m) => {
                    const logoSrc = getActiveLogoForPlacement(m.id);
                    if (!logoSrc && m.garment !== 'business_card') return m;
                    const scale = m.view === 'front' ? logoScaleFront : logoScaleBack;
                    const cMode = logoColorModes[m.id] || globalLogoColorMode || 'original';
                    const mechanical = await generateMechanicalMockup(m.base, logoSrc || "", m.view, scale, m.garment, cMode);
                    return { ...m, mechanical };
                }));
                setMockups(updated);
            };
            updateMechanicals();
        }, 150);
        return () => clearTimeout(timer);
    }, [logoColorModes, globalLogoColorMode, logoPlacements, logoScaleFront, logoScaleBack, getActiveLogoForPlacement, state]);

    // ARCHITECTE : THE VAULT - CLOUD SYNC
    useEffect(() => {
        const fetchRemoteConfig = async () => {
            try {
                const { doc, getDoc } = await import('firebase/firestore');
                const conf = await getDoc(doc(db, 'portail-config', 'placements'));
                if (conf.exists()) {
                    const data = conf.data() as any;
                    // MERGE WITH DEFAULTS to avoid undefined garment types
                    PLACEMENTS = { ...DEFAULT_PLACEMENTS, ...data };
                    if (data.tshirt?.front?.scale) setLogoScaleFront(data.tshirt.front.scale);
                    if (data.tshirt?.back?.scale) setLogoScaleBack(data.tshirt.back.scale);
                    console.log("Vault Architect: Placements synchronisés via Cloud.");
                } else {
                    console.info("Vault Architect: Configuration Cloud non initialisée (utilisez PUSH TO CLOUD).");
                }
            } catch (e) {
                console.warn("Vault Architect: Mode Offline actif (Erreur de connexion Cloud).");
            }
        };
        fetchRemoteConfig();
    }, []);

    const saveRemoteConfig = async () => {
        try {
            const { doc, setDoc } = await import('firebase/firestore');
            await setDoc(doc(db, 'portail-config', 'placements'), PLACEMENTS);
            alert("Vault Architect: Configuration sauvegardée dans le Cloud avec succès.");
        } catch (e: any) {
            console.error("Cloud Sync Error:", e);
            alert("Erreur Cloud Sync: " + e.message);
        }
    };

    // PERSISTENCE & ROUTING LOGIC
    useEffect(() => {
        let isCancelled = false;

        const updateGabarits = async () => {
            const updated = await Promise.all(mockups.map(async (m) => {
                const slot = logoPlacements[m.id] || 'A';
                const logo = slot === 'A' ? logoA : logoB;
                const logoSrc = logo.mode === 'original' ? logo.original : (logo.remastered || logo.adapted);
                
                if (!logoSrc && m.garment !== 'business_card' && m.garment !== 'banner') return m;

                const scale = m.view === 'front' ? logoScaleFront : logoScaleBack;
                try {
                    const mechanical = await generateMechanicalMockup(m.base, logoSrc || "", m.view, scale, m.garment);
                    return { ...m, mechanical };
                } catch (e) {
                    console.error("Gabarit Error:", e);
                    return m;
                }
            }));

            if (!isCancelled) {
                setMockups(prev => {
                    const hasChanged = JSON.stringify(updated.map(u => u.mechanical)) !== JSON.stringify(prev.map(p => p.mechanical));
                    return hasChanged ? updated : prev;
                });
            }
        };

        const debounceTimer = setTimeout(updateGabarits, 200);
        return () => { isCancelled = true; clearTimeout(debounceTimer); };
    }, [logoScaleFront, logoScaleBack, logoA, logoB, logoPlacements, mockups.length]);



    const syncProfile = async () => {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            let uid = urlParams.get('uid');

            // Zero-click guest profile creation from bookmarklet parameters
            if (!uid && urlParams.get('name') && urlParams.get('logoUrl')) {
                const prefillLogo = urlParams.get('logoUrl')!;
                const prefillName = urlParams.get('name')!;
                const prefillSector = urlParams.get('sector') || "Traiteur";
                
                // 1. SET LOCAL STATE IMMEDIATELY so the UI loads instantly!
                setUserData(prev => ({
                    ...prev,
                    companyName: prefillName,
                    activity: prefillSector,
                    phone: urlParams.get('phone') || "",
                    website: urlParams.get('website') || "",
                    email: urlParams.get('email') || "contact@entreprise.com"
                }));
                
                // Set logo state so they don't have to upload it!
                try {
                    const [original, adapted, analysis] = await Promise.all([
                        processLogoDeterministic(prefillLogo, false, true),
                        processLogoDeterministic(prefillLogo, true, true),
                        geminiService.analyzeLogoBranding(prefillLogo).catch(() => null)
                    ]);
                    setLogoA(prev => ({ ...prev, original, adapted, mode: 'original' }));
                    if (analysis) setLogoAnalysis(analysis);
                } catch (e) {
                    setLogoA(prev => ({ ...prev, original: prefillLogo, adapted: prefillLogo, mode: 'original' }));
                }

                // Transition state to CLEAN_CHECK immediately to start the animation!
                setState('CLEAN_CHECK');
                setIsConfigOpen(true);

                // 2. SAVE TO FIRESTORE IN THE BACKGROUND
                const newUid = "guest_" + Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
                const segment = () => Math.random().toString(36).substring(2, 8).toUpperCase();
                const actuationKey = `SG-${segment()}-${segment()}`;

                try {
                    const { doc, setDoc } = await import('firebase/firestore');
                    await setDoc(doc(db, "SiteConfigs", newUid), {
                        companyName: prefillName,
                        logoUrl: prefillLogo,
                        activitySector: prefillSector,
                        presentation: urlParams.get("presentation") || "",
                        theme: "dark",
                        accentColor: "rgb(59, 130, 246)",
                        uid: newUid,
                        isGuest: true,
                        status: "actuated",
                        actuationKey: actuationKey,
                        generatedKey: actuationKey,
                        whatsappNumber: urlParams.get("phone") || "",
                        phone: urlParams.get("phone") || "",
                        website: urlParams.get("website") || "",
                        merchUrl: urlParams.get("website") || "",
                        contactEmail: urlParams.get("email") || "contact@entreprise.com",
                        socials: [
                            { platform: "Facebook", url: "" },
                            { platform: "Instagram", url: "" },
                            { platform: "LinkedIn", url: "" },
                            { platform: "TikTok", url: "" }
                        ],
                        customSections: [],
                        sectionOrder: ['presentation', 'address', 'contact', 'socials', 'products'],
                        rawPitch: urlParams.get("presentation") ? {
                            what: urlParams.get("presentation")!.substring(0, 100),
                            who: "",
                            difference: "",
                            service: ""
                        } : { what: "", who: "", difference: "", service: "" },
                        createdAt: serverTimestamp()
                    });

                    // Update URL with the new uid
                    urlParams.set('uid', newUid);
                    window.history.replaceState({}, '', `${window.location.pathname}?${urlParams.toString()}`);
                    localStorage.removeItem('btp_active_session_id'); // Clear cache of previous sessions
                } catch (dbErr) {
                    console.warn("Background Firestore write failed:", dbErr);
                }
                
                return; // Stop execution of the rest of syncProfile since we loaded everything locally
            }

            if (!uid) return;
            
            // Preserve existing loaded logos if present
            setLogoA(prev => prev.original ? prev : { id: 'A', original: null, adapted: null, remastered: null, mode: 'original' });
            setLogoB(prev => prev.original ? prev : { id: 'B', original: null, adapted: null, remastered: null, mode: 'original' });
            
            const config = await getStoredConfig(uid);
            
            if (config) {
                const sidToCheck = config.generatedKey || config.actuationKey || uid;
                try {
                    const { query, collection, where, getDocs } = await import('firebase/firestore');
                    const q = query(collection(db, 'btp_projects'), where('projectId', '==', sidToCheck));
                    const snap = await getDocs(q);
                    
                    // DO NOT redirect automatically to shop on mount!
                    /*
                    if (!snap.empty && !hasRedirected.current) {
                        console.log("[Audit] Project mockups already exist in Firestore. Redirecting directly to final product shop...");
                        hasRedirected.current = true;
                        navigate(`/portail-shop?uid=${uid}`, { replace: true });
                        return;
                    }
                    */
                } catch (dbErr) {
                    console.warn("[Audit] Firestore project check failed:", dbErr);
                }

                try {
                    const idbSaved = await dbGet(`session_obj_${sidToCheck}`);
                    if (idbSaved) {
                        const localData = JSON.parse(idbSaved);
                        // DO NOT redirect automatically to shop on mount!
                        /*
                        if (localData.mockups && localData.mockups.some((m: any) => m.hasAi || m.ai || m.aiRemastered) && !hasRedirected.current) {
                            console.log("[Audit] Project mockups already exist in local IDB cache. Redirecting directly to final product shop...");
                            hasRedirected.current = true;
                            navigate(`/portail-shop?uid=${uid}`, { replace: true });
                            return;
                        }
                        */
                    }
                } catch (idbErr) {
                    console.warn("[Audit] Local IDB project check failed:", idbErr);
                }

                const cName = config.companyName || "";
                
                setUserData(prev => ({
                    ...prev,
                    companyName: config.companyName || prev.companyName,
                    email: config.contactEmail || prev.email,
                    activity: config.activitySector || prev.activity,
                    phone: config.whatsappNumber || prev.phone,
                    website: config.address || prev.website
                }));
                
                if (config.accentColor) {
                    setAssetColor(config.accentColor);
                }
                
                if (config.logoUrl) {
                    const lastSynced = localStorage.getItem(`lastSyncedLogoUrl_${uid}`);
                    const isAlreadySynced = lastSynced === config.logoUrl;

                    if (!isAlreadySynced) {
                        // Play full sync animation with delays
                        setSyncLoader({
                            active: true,
                            step: "Connexion sécurisée au Cloud Vault...",
                            phase: 1
                        });
                        setRemasterStep("Lecture de la configuration Cloud...");
                        await new Promise(r => setTimeout(r, 1200));
                        
                        setSyncLoader(prev => ({
                            ...prev!,
                            companyName: cName,
                            step: `Compte identifié : ${cName.toUpperCase()}`,
                            phase: 1
                        }));
                        
                        setSyncLoader(prev => ({
                            ...prev!,
                            logoUrl: config.logoUrl,
                            step: "Analyse & Vectorisation du Logo...",
                            phase: 2
                        }));
                        setRemasterStep("Analyse & Vectorisation du Logo...");
                        await new Promise(r => setTimeout(r, 1500));

                        try {
                            const [original, adapted, analysis] = await Promise.all([
                                processLogoDeterministic(config.logoUrl, false, true),
                                processLogoDeterministic(config.logoUrl, true, true),
                                geminiService.analyzeLogoBranding(config.logoUrl).catch(() => null)
                            ]);
                            
                            // 3. GÉNÉRATION DES GABARITS TECHNIQUES
                            setSyncLoader(prev => ({
                                ...prev!,
                                step: "Génération du gabarit Carte Fond Noir...",
                                phase: 3
                            }));
                            setRemasterStep("Génération du gabarit Carte de Visite (Fond Noir)...");
                            await new Promise(r => setTimeout(r, 1800));

                            setLogoA(prev => ({ 
                                ...prev, 
                                original, 
                                adapted, 
                                remastered: null, 
                                mode: 'original' 
                            }));
                            if (analysis) setLogoAnalysis(analysis);
                        } catch (err) {
                            console.warn("Deterministic processing failed, falling back to raw logoUrl:", err);
                            setLogoA(prev => ({ ...prev, original: config.logoUrl, adapted: config.logoUrl }));
                        }
                        
                        // 4. CALIBRAGE BTP
                        setSyncLoader(prev => ({
                            ...prev!,
                            step: "Calibration finale des gabarits...",
                            phase: 4
                        }));
                        setRemasterStep("Calibration & finalisation des gabarits BTP...");
                        await new Promise(r => setTimeout(r, 1200));

                        // Store sync cache locally
                        localStorage.setItem(`lastSyncedLogoUrl_${uid}`, config.logoUrl);
                    } else {
                        // Skip loading delays and process logo instantly
                        try {
                            const [original, adapted, analysis] = await Promise.all([
                                processLogoDeterministic(config.logoUrl, false, true),
                                processLogoDeterministic(config.logoUrl, true, true),
                                geminiService.analyzeLogoBranding(config.logoUrl).catch(() => null)
                            ]);
                            setLogoA(prev => ({ 
                                ...prev, 
                                original, 
                                adapted, 
                                remastered: null, 
                                mode: 'original' 
                            }));
                            if (analysis) setLogoAnalysis(analysis);
                        } catch (err) {
                            setLogoA(prev => ({ ...prev, original: config.logoUrl, adapted: config.logoUrl }));
                        }
                    }
                    
                    setState('CLEAN_CHECK');
                    setIsConfigOpen(true);
                }
                addLog(`COMPTE LIÉ : ${config.companyName.toUpperCase()} ACTIF.`);
            }
        } catch (e) {
            console.warn("Could not sync profile config:", e);
        } finally {
            setRemasterStep(null);
            setSyncLoader(null);
        }
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                console.log("Firebase Auth Connected:", user.uid);
                const uidParam = new URLSearchParams(window.location.search).get('uid');
                if (uidParam) {
                    syncProfile();
                }
            }
        });
        return () => unsubscribe();
    }, []);

    const saveSession = useCallback(async (lA: BtpLogo, lB: BtpLogo, placements: Record<string, 'A' | 'B'>, uData: UserData, currentMockups: MockupItem[]) => {
        let sid = sessionId;
        if (!sid) {
            sid = `audit-${Math.random().toString(36).substring(2, 9)}`;
            setSessionId(sid);
            window.history.pushState({}, '', `?audit=${sid}`);
        }

        try {
            // 1. HEAVY ASSETS & SESSION DATA TO INDEXED DB (UNLIMITED SPACE)
            if (lA.original) await dbSet(`${sid}_A_orig`, lA.original);
            if (lA.adapted) await dbSet(`${sid}_A_adapt`, lA.adapted);
            if (lA.remastered) await dbSet(`${sid}_A_remastered`, lA.remastered);
            
            if (lB.original) await dbSet(`${sid}_B_orig`, lB.original);
            if (lB.adapted) await dbSet(`${sid}_B_adapt`, lB.adapted);
            if (lB.remastered) await dbSet(`${sid}_B_remastered`, lB.remastered);

            for (const m of currentMockups) {
                if (m.ai && m.ai.startsWith('data:')) {
                    await dbSet(`${sid}_ai_${m.id}`, m.ai);
                }
            }

            const lightweightMockups = currentMockups.map(m => ({
                id: m.id,
                title: m.title,
                base: m.base,
                isGenerating: m.isGenerating,
                view: m.view,
                garment: m.garment,
                hasAi: !!m.ai,
                selected: m.selected,
                mechanical: m.mechanical,
                ai: m.ai || (m as any).aiRemastered || null
            }));

            const fullSession = {
                logoPlacements: placements,
                logoAMode: lA.mode,
                logoBMode: lB.mode,
                userData: uData,
                mockups: lightweightMockups,
                timestamp: new Date().toISOString()
            };

            // Save the WHOLE session object in IDB
            await dbSet(`session_obj_${sid}`, JSON.stringify(fullSession));

            // Also explicitly save each individual AI image to IDB for fast key-based retrieval (Compressed for ultra-fast loading)
            for (const m of currentMockups) {
                const activeAi = (m as any).aiRemastered || m.ai;
                if (activeAi && typeof activeAi === 'string') {
                    const compressedAi = await compressBase64Image(activeAi, 800, 0.82);
                    await dbSet(`${sid}_ai_${m.id}`, compressedAi);
                }
                if (m.mechanical && typeof m.mechanical === 'string') {
                    const compressedMech = await compressBase64Image(m.mechanical, 800, 0.82);
                    await dbSet(`${sid}_mech_${m.id}`, compressedMech);
                }
            }

            // Only save the current session ID in localStorage (Tiny)
            localStorage.setItem('btp_active_session_id', sid);

            // 2. LIVE SYNC TO CLOUD FIRESTORE FOR PROSPECTS ACCESS
            try {
                const { query, collection, where, getDocs, setDoc, addDoc, doc } = await import('firebase/firestore');
                
                let pId = localStorage.getItem(`btp_preview_uuid_${sid}`);
                if (!pId) {
                    pId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
                        return v.toString(16);
                    });
                    localStorage.setItem(`btp_preview_uuid_${sid}`, pId);
                }

                const getActiveLogoUrl = async (l: BtpLogo, slot: string) => {
                    const mode = l.mode || 'original';
                    let base64 = l[mode as keyof BtpLogo] || l.original;
                    if (mode === 'adapted' && l.remastered && (l as any).adaptedRemastered) {
                        base64 = (l as any).adaptedRemastered;
                    }
                    if (base64 && typeof base64 === 'string' && base64.startsWith('http')) {
                        return base64;
                    }
                    if (base64 && typeof base64 === 'string' && base64.startsWith('data:image')) {
                        try {
                            const lRef = ref(storage, `btp_mockups/${sid}/print/logo_${slot}_${Date.now()}.png`);
                            await uploadString(lRef, base64, 'data_url');
                            const downloadUrl = await getDownloadURL(lRef);

                            // Purge old logo file from Firebase Storage if it exists and differs
                            const prevUrl = l.activeUrl;
                            if (prevUrl && prevUrl !== downloadUrl && prevUrl.includes('firebasestorage.googleapis.com')) {
                                deleteStorageFileByUrl(prevUrl);
                            }

                            return downloadUrl;
                        } catch (e) {
                            console.warn(`Failed to upload logo_${slot}:`, e);
                            return null;
                        }
                    }
                    return null;
                };

                const uploadIfBase64 = async (base64OrUrl: string | null, id: string, type: string, previousUrl?: string | null) => {
                    if (!base64OrUrl || typeof base64OrUrl !== 'string') return null;
                    if (base64OrUrl.startsWith('http')) return base64OrUrl;
                    if (base64OrUrl.startsWith('/assets/')) return base64OrUrl;
                    if (!base64OrUrl.startsWith('data:')) return null;
                    try {
                        const assetRef = ref(storage, `btp_mockups/${sid}/web/${id}_${type}_${Date.now()}.png`);
                        await uploadString(assetRef, base64OrUrl, 'data_url');
                        const downloadUrl = await getDownloadURL(assetRef);

                        // Purge previous orphan file from Firebase Storage after new file upload succeeds
                        if (previousUrl && previousUrl !== downloadUrl && previousUrl.includes('firebasestorage.googleapis.com')) {
                            deleteStorageFileByUrl(previousUrl);
                        }

                        return downloadUrl;
                    } catch (e) {
                        console.warn(`Failed to upload ${type} for ${id} during autosave:`, e);
                        return null;
                    }
                };

                const urlA = await getActiveLogoUrl(lA, 'A');
                const urlB = await getActiveLogoUrl(lB, 'B');

                // Map and upload any base64 mockup images
                // Also check IDB for AI images that might not be in the current mockup state
                const uploadedMockups = await Promise.all(currentMockups.map(async m => {
                    const slot = placements[m.id] || 'A';
                    const logo = slot === 'A' ? lA : lB;
                    const isRemastered = logo.mode === 'remastered';
                    let activeAi = isRemastered ? ((m as any).aiRemastered || m.ai) : m.ai;
                    
                    // If m.ai is null but we know an AI image exists in IDB, fetch it
                    if (!activeAi || (typeof activeAi === 'string' && activeAi.startsWith('/assets/'))) {
                        const idbAi = await dbGet(`${sid}_ai_${m.id}`);
                        if (idbAi && typeof idbAi === 'string' && idbAi.length > 50) {
                            activeAi = idbAi;
                        }
                    }
                    
                    let mechData = m.mechanical;
                    // If mechanical is null or a local asset, check IDB
                    if (!mechData || (typeof mechData === 'string' && mechData.startsWith('/assets/'))) {
                        const idbMech = await dbGet(`${sid}_mech_${m.id}`);
                        if (idbMech && typeof idbMech === 'string' && idbMech.length > 50) {
                            mechData = idbMech;
                        }
                    }

                    const prevAiUrl = m.ai && typeof m.ai === 'string' && m.ai.startsWith('http') ? m.ai : null;
                    const prevMechUrl = m.mechanical && typeof m.mechanical === 'string' && m.mechanical.startsWith('http') ? m.mechanical : null;

                    const [aiUrl, mechUrl] = await Promise.all([
                        uploadIfBase64(activeAi, m.id, 'ai', prevAiUrl),
                        uploadIfBase64(mechData, m.id, 'mech', prevMechUrl)
                    ]);

                    const finalAi = (aiUrl && aiUrl.startsWith('http')) ? aiUrl : (activeAi && typeof activeAi === 'string' && activeAi.startsWith('http') ? activeAi : null);
                    const finalMech = (mechUrl && mechUrl.startsWith('http')) ? mechUrl : (mechData && typeof mechData === 'string' && mechData.startsWith('http') ? mechData : null);

                    return {
                        id: m.id || "",
                        title: m.title || "",
                        garment: m.garment || "",
                        view: m.view || "",
                        selected: !!m.selected,
                        ai: finalAi,
                        mechanical: finalMech,
                        base: (m as any).base || ""
                    };
                }));

                const q = query(collection(db, 'btp_projects'), where('projectId', '==', sid));
                const snap = await getDocs(q);

                const projectData = {
                    projectId: sid,
                    previewId: pId,
                    userData: {
                        companyName: uData.companyName || "",
                        email: uData.email || "",
                        activity: uData.activity || "",
                        phone: uData.phone || "",
                        website: uData.website || "",
                        tva: uData.tva || ""
                    },
                    logoUrl: urlA || urlB || "", 
                    logos: {
                        logoA: {
                            id: 'A' as const,
                            original: null,
                            adapted: null,
                            remastered: null,
                            activeUrl: urlA,
                            mode: lA.mode || 'original'
                        },
                        logoB: {
                            id: 'B' as const,
                            original: null,
                            adapted: null,
                            remastered: null,
                            activeUrl: urlB,
                            mode: lB.mode || 'original'
                        }
                    },
                    placements: Object.fromEntries(
                        Object.entries(placements || {}).map(([k, v]) => [k, v || 'A'])
                    ),
                    mockups: uploadedMockups,
                    status: 'PENDING_PAYMENT',
                    updatedAt: new Date().toISOString(),
                    type: 'BTP_PROJECT_V24'
                };

                if (!snap.empty) {
                    const docRef = snap.docs[0].ref;
                    await setDoc(docRef, sanitizeForFirestore(projectData), { merge: true });
                } else {
                    await addDoc(collection(db, 'btp_projects'), sanitizeForFirestore(projectData));
                }

                const previewData = {
                    previewId: pId,
                    companyName: uData.companyName || "",
                    logoUrl: urlA || urlB || "",
                    logoOriginalUrl: null,
                    logoAdaptedUrl: urlA || urlB || "",
                    accentColor: (placements as any)?.accentColor || "#ea580c",
                    items: uploadedMockups.map(m => ({
                        id: m.id,
                        title: m.title,
                        price: m.id.includes('basic') ? 25 : 39,
                        imageFront: m.ai || (m as any).base || "",
                        imageBack: m.mechanical || "",
                        selected: !!m.selected,
                        garment: m.garment || ""
                    })),
                    status: 'pending',
                    userEmail: uData.email || null,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };

                await setDoc(doc(db, 'anonymous_previews', pId), sanitizeForFirestore(previewData), { merge: true });

                // Centralized single-source SiteConfigs update using Canonical Slug
                try {
                    const canonicalId = getCanonicalSlug(sid);
                    const tshirtAiUrl = uploadedMockups.find(m => m.id === 'tFront' || m.garment === 'tshirt')?.ai || uploadedMockups.find(m => m.id === 'tFront' || m.garment === 'tshirt')?.mechanical || null;
                    const poloAiUrl = uploadedMockups.find(m => m.id === 'pFront' || m.garment === 'polo')?.ai || uploadedMockups.find(m => m.id === 'pFront' || m.garment === 'polo')?.mechanical || null;
                    const hoodieAiUrl = uploadedMockups.find(m => m.id === 'hFront' || m.garment === 'sweat')?.ai || uploadedMockups.find(m => m.id === 'hFront' || m.garment === 'sweat')?.mechanical || null;

                    const siteConfigsPayload = {
                        canonicalSlug: canonicalId,
                        projectId: sid,
                        aliases: ["djdfazz", "fabrizio", "guest_ms3ijgnco2xnid", sid],
                        products: {
                            tshirt: { aiImageUrl: (tshirtAiUrl && typeof tshirtAiUrl === 'string' && tshirtAiUrl.startsWith('http')) ? tshirtAiUrl : "" },
                            polo: { aiImageUrl: (poloAiUrl && typeof poloAiUrl === 'string' && poloAiUrl.startsWith('http')) ? poloAiUrl : "" },
                            hoodie: { aiImageUrl: (hoodieAiUrl && typeof hoodieAiUrl === 'string' && hoodieAiUrl.startsWith('http')) ? hoodieAiUrl : "" }
                        },
                        mockups: uploadedMockups,
                        items: uploadedMockups,
                        logoUrl: urlA || urlB || "",
                        logoAdaptedUrl: urlA || urlB || "",
                        lastUpdated: serverTimestamp(),
                        updatedAt: new Date().toISOString()
                    };

                    // Single write to canonical document
                    const siteConfigRef = doc(db, 'SiteConfigs', canonicalId);
                    await setDoc(siteConfigRef, sanitizeForFirestore(siteConfigsPayload), { merge: true });

                    // If audit sid is different from canonicalId, create lightweight pointer
                    if (sid && sid !== canonicalId) {
                        const pointerRef = doc(db, 'SiteConfigs', sid);
                        await setDoc(pointerRef, sanitizeForFirestore({
                            canonicalSlug: canonicalId,
                            aliasOf: canonicalId,
                            projectId: sid,
                            updatedAt: new Date().toISOString()
                        }), { merge: true });
                    }
                } catch (scErr) {
                    console.warn("SiteConfigs canonical sync error:", scErr);
                }

                setPreviewId(pId);
            } catch (cloudErr) {
                console.warn("Firestore live sync failed:", cloudErr);
            }

        } catch (e) {
            console.error("Audit Persistence Error:", e);
        }
    }, [sessionId]);

    const initializeMockups = useCallback(() => {
        return [
            // CLASSIC BLACK
            { id: 'tFront', title: 'T-shirt Noir FACE', base: "/assets/tshirt-black-JHK170.png?v=V24", ai: null, aiRemastered: null, isGenerating: false, view: 'front' as const, garment: 'tshirt' as const, mechanical: null, model: "/assets/models/male_tshirt_front.png", selected: true },
            { id: 'tBack', title: 'T-shirt Noir DOS', base: "/assets/tshirt-black-JHK170-dos.png?v=V24", ai: "/assets/presets/tshirt_back_dfazz.png", aiRemastered: "/assets/presets/tshirt_back_dfazz.png", isGenerating: false, view: 'back' as const, garment: 'tshirt' as const, mechanical: null, model: "/assets/models/male_tshirt_back.png", selected: true },
            
            // POLO PREMIUM
            { id: 'pFront', title: 'Polo Premium FACE', base: "/assets/polo-black-JHK510.png?v=V24", ai: "/assets/presets/polo_front_dfazz.png", aiRemastered: "/assets/presets/polo_front_dfazz.png", isGenerating: false, view: 'front' as const, garment: 'polo' as const, mechanical: null, model: "/assets/models/male_tshirt_front.png", selected: true },
            { id: 'pBack', title: 'Polo Premium DOS', base: "/assets/polo-black-JHK510-dos.png?v=V24", ai: "/assets/presets/polo_back_dfazz.png", aiRemastered: "/assets/presets/polo_back_dfazz.png", isGenerating: false, view: 'back' as const, garment: 'polo' as const, mechanical: null, model: "/assets/models/male_tshirt_back.png", selected: true },

            // HOODIE
            { id: 'hFront', title: 'Hoodie FACE', base: "/assets/hoodie-black-JHK421.png?v=V24", ai: null, aiRemastered: null, isGenerating: false, view: 'front' as const, garment: 'sweat' as const, mechanical: null, model: "/assets/models/male_hoodie_front.png", selected: true },
            { id: 'hBack', title: 'Hoodie DOS', base: "/assets/hoodie-black-JHK421-dos.png?v=V24", ai: "/assets/presets/hoodie_back_dfazz.png", aiRemastered: "/assets/presets/hoodie_back_dfazz.png", isGenerating: false, view: 'back' as const, garment: 'sweat' as const, mechanical: null, model: "/assets/models/male_hoodie_back.png", selected: true },

            // MARKETING ASSETS
            { id: 'cardFront', title: 'Carte Visite RECTO', base: "/assets/card-base.svg", ai: "/assets/presets/card_dfazz.png", aiRemastered: "/assets/presets/card_dfazz.png", isGenerating: false, view: 'front' as const, garment: 'business_card' as const, mechanical: null, model: "/assets/models/card_mockup_front_neutral.png", selected: true },
            { id: 'cardBack', title: 'Carte Visite VERSO', base: "/assets/card-base.svg", ai: "/assets/presets/card_dfazz.png", aiRemastered: "/assets/presets/card_dfazz.png", isGenerating: false, view: 'back' as const, garment: 'business_card' as const, mechanical: null, model: "/assets/models/card_mockup_back.png", selected: true }
        ];
    }, []);

    useEffect(() => {
        // 1. ADMIN BYPASS
        if (localStorage.getItem('btp_god_mode') === 'true') {
            setCredits(999);
            setIsIpBlocked(false);
        } else {
            const lastUsage = localStorage.getItem('btp_ip_guard');
            const count = parseInt(localStorage.getItem('btp_daily_count') || '0');
            const today = new Date().toDateString();
            if (lastUsage === today && count >= 3) {
                setIsIpBlocked(true);
                setCredits(0);
            }
        }

        // 2. STAY LOGGED IN CHECK
        const stay = localStorage.getItem('btp_stay_logged_in') !== 'false';
        setStayLoggedIn(stay);
        const lastEmail = stay ? localStorage.getItem('btp_last_email') : null;
        if (lastEmail) {
            const savedData = localStorage.getItem(`btp_user_data_${lastEmail}`);
            if (savedData) setUserData(JSON.parse(savedData));
        }
        const blocked = localStorage.getItem('btp_blocked');
        if (blocked === 'true' && lastEmail !== 'logosigneed@gmail.com') {
            setIsIpBlocked(true);
        }

        // 3. SESSION LOADING FROM URL
        const params = new URLSearchParams(window.location.search);
        const uidParam = params.get('uid');
        const refreshParam = params.get('refresh');
        
        let sid = params.get('audit');
        if (!sid) {
            if (uidParam) {
                sid = uidParam;
            } else {
                sid = localStorage.getItem('btp_active_session_id');
            }
        }

        if (refreshParam === 'true') {
            sid = null;
            localStorage.removeItem('btp_active_session_id');
        }
        
        const currentIsInbound = !uidParam && !sid && lastEmail !== 'logosigneed@gmail.com';
        setIsInbound(currentIsInbound);

        if (sid) {
            const loadSessionData = async () => {
                const idbSaved = await dbGet(`session_obj_${sid}`);
                const lsSaved = localStorage.getItem(`btp_session_${sid}`);
                let saved = idbSaved || lsSaved;
                let cloudDoc: any = null;

                // ALWAYS check cloud for images, even if we have local session data
                // This ensures Firebase Storage URLs for AI/mechanical images are recovered
                try {
                    let q = query(collection(db, 'btp_projects'), where('projectId', '==', sid));
                    let snap = await getDocs(q);
                    if (snap.empty) {
                        q = query(collection(db, 'btp_projects'), where('previewId', '==', sid));
                        snap = await getDocs(q);
                    }
                    if (!snap.empty) {
                        cloudDoc = snap.docs[0].data();
                    } else {
                        const prevRef = doc(db, 'anonymous_previews', sid);
                        const prevSnap = await getDoc(prevRef);
                        if (prevSnap.exists()) {
                            const pData = prevSnap.data();
                            cloudDoc = {
                                userData: { companyName: pData.companyName || "", email: pData.userEmail || "" },
                                mockups: pData.items || [],
                                logoUrl: pData.logoUrl || pData.logoAdaptedUrl || ""
                            };
                        }
                    }
                    if (cloudDoc && !saved) {
                        saved = JSON.stringify(cloudDoc);
                    }
                } catch (e) {
                    console.warn("Failed to load audit project from cloud:", e);
                }

                if (saved) {
                    const data = JSON.parse(saved);
                    setSessionId(sid);
                    if (data.userData) setUserData(data.userData);

                    if (data.userData?.email) {
                        localStorage.setItem('btp_last_email', data.userData.email);
                        const userCredits = localStorage.getItem(`btp_credits_${data.userData.email}`);
                        if (userCredits !== null) setCredits(parseInt(userCredits));
                    }

                    const [lAOrig, lAAdapt, lARemastered, lBOrig, lBAdapt, lBRemastered] = await Promise.all([
                        dbGet(`${sid}_A_orig`), dbGet(`${sid}_A_adapt`), dbGet(`${sid}_A_remastered`),
                        dbGet(`${sid}_B_orig`), dbGet(`${sid}_B_adapt`), dbGet(`${sid}_B_remastered`)
                    ]);

                    const fallbackLogoA = lAAdapt || lARemastered || lAOrig || data.logoUrl || data.logos?.logoA?.activeUrl || data.logos?.logoA?.adapted || data.logos?.logoA?.original || cloudDoc?.logoUrl || cloudDoc?.logos?.logoA?.activeUrl;
                    const fallbackLogoB = lBAdapt || lBRemastered || lBOrig || data.logos?.logoB?.activeUrl || data.logos?.logoB?.adapted || data.logos?.logoB?.original || cloudDoc?.logos?.logoB?.activeUrl;

                    setLogoA(prev => ({ 
                        ...prev, 
                        original: lAOrig || fallbackLogoA || null, 
                        adapted: lAAdapt || fallbackLogoA || null, 
                        remastered: lARemastered || null, 
                        mode: data.logoAMode || 'original' 
                    }));

                    if (fallbackLogoB) {
                        setLogoB(prev => ({ 
                            ...prev, 
                            original: lBOrig || fallbackLogoB || null, 
                            adapted: lBAdapt || fallbackLogoB || null, 
                            remastered: lBRemastered || null, 
                            mode: data.logoBMode || 'original' 
                        }));
                    }

                    if (data.logoPlacements) setLogoPlacements(prev => ({ ...prev, ...data.logoPlacements }));

                    const baseMockups = initializeMockups();
                    const savedMockups = data.mockups || data.items || data.previews || [];
                    // Cloud mockups have Firebase Storage URLs for AI and mechanical images
                    const cloudMockups = cloudDoc?.mockups || cloudDoc?.items || [];
                    
                    const restoredMockups = await Promise.all(baseMockups.map(async (baseM) => {
                        const savedM = savedMockups.find((sm: any) => 
                            sm.id === baseM.id || 
                            (sm.garment === baseM.garment && sm.view === baseM.view) ||
                            (sm.type === baseM.garment && sm.view === baseM.view)
                        );
                        // Also check cloud mockups for Firebase Storage URLs
                        const cloudM = cloudMockups.find((cm: any) => 
                            cm.id === baseM.id || 
                            (cm.garment === baseM.garment && cm.view === baseM.view)
                        );
                        
                        // Prefer fresh Firebase Storage URL from cloud over potentially stale IDB cache
                        const cloudAiUrl = cloudM?.ai || cloudM?.aiRemastered || cloudM?.imageStudio || cloudM?.imageFront || savedM?.ai || savedM?.imageStudio || savedM?.imageFront || null;
                        const isFirebaseStorageUrl = (url: any) => url && typeof url === 'string' && url.startsWith('https://firebasestorage.googleapis.com');
                        
                        // Only read IDB if cloud doesn't have a fresh Firebase Storage URL
                        const idbAi = (!isFirebaseStorageUrl(cloudAiUrl) && (savedM?.hasAi || savedM?.ai)) ? await dbGet(`${sid}_ai_${baseM.id}`) : null;
                        const aiVal = (isFirebaseStorageUrl(cloudAiUrl) ? cloudAiUrl : null) || idbAi || savedM?.aiRemastered || cloudM?.aiRemastered || savedM?.url || savedM?.generatedUrl || null;
                        
                        const idbMech = (savedM?.mechanical || savedM?.hasAi) ? await dbGet(`${sid}_mech_${baseM.id}`) : null;
                        const mechVal = idbMech || savedM?.mechanical || cloudM?.mechanical || savedM?.imageBat || cloudM?.imageBat || savedM?.imageBack || cloudM?.imageBack || null;

                        const isReal = (url: any) => url && typeof url === 'string' && (url.startsWith('http') || url.startsWith('data:') || url.length > 100);

                        return {
                            ...baseM,
                            selected: savedM !== undefined ? !!savedM.selected : baseM.selected,
                            ai: isReal(aiVal) ? aiVal : baseM.ai,
                            aiRemastered: isReal(aiVal) ? aiVal : baseM.aiRemastered,
                            mechanical: isReal(mechVal) ? mechVal : null
                        };
                    }));

                    setMockups(restoredMockups);
                    setState('RESULT');
                }
                setIsLoaded(true);
            };
            loadSessionData();
        } else {
            setIsLoaded(true);
            syncProfile();
        }
    }, [initializeMockups]);

    const processLogoDeterministic = (base64: string, shouldInvert: boolean | 'white' | 'black' = true, removeBackground: boolean = true): Promise<string> => {
        if (!removeBackground) {
            return Promise.resolve(base64);
        }
        const isWhiteInversion = shouldInvert === 'white' || shouldInvert === true;
        const isBlackInversion = shouldInvert === 'black';

        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.src = base64;
            img.onload = () => {
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = img.width; tempCanvas.height = img.height;
                const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true })!;
                tempCtx.drawImage(img, 0, 0);

                let imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
                let data = imageData.data;
                let width = tempCanvas.width;
                let height = tempCanvas.height;

                // 0. AUTO-CROP: Find real content boundaries to eliminate useless whitespace
                let minX = width, minY = height, maxX = 0, maxY = 0;
                let hasContent = false;
                for (let y = 0; y < height; y++) {
                    for (let x = 0; x < width; x++) {
                        if (data[(y * width + x) * 4 + 3] > 0) {
                            if (x < minX) minX = x; if (x > maxX) maxX = x;
                            if (y < minY) minY = y; if (y > maxY) maxY = y;
                            hasContent = true;
                        }
                    }
                }

                if (hasContent) {
                    const contentWidth = maxX - minX + 1;
                    const contentHeight = maxY - minY + 1;
                    const croppedData = tempCtx.getImageData(minX, minY, contentWidth, contentHeight);

                    // Update dimensions and data for subsequent stages
                    tempCanvas.width = contentWidth;
                    tempCanvas.height = contentHeight;
                    tempCtx.putImageData(croppedData, 0, 0);
                    imageData = tempCtx.getImageData(0, 0, contentWidth, contentHeight);
                    data = imageData.data;
                    width = contentWidth;
                    height = contentHeight;
                }

                // 1. SMART BACKGROUND REMOVAL (Detect White or Black based on corners)
                const getPixel = (x: number, y: number) => {
                    const i = (y * width + x) * 4;
                    return [data[i], data[i+1], data[i+2], data[i+3]];
                };
                
                // Sample 4 corners slightly inside (5%) to avoid screenshot bars
                const offsetX = Math.floor(width * 0.05);
                const offsetY = Math.floor(height * 0.05);
                const corners = [
                    getPixel(offsetX, offsetY),
                    getPixel(width - 1 - offsetX, offsetY),
                    getPixel(offsetX, height - 1 - offsetY),
                    getPixel(width - 1 - offsetX, height - 1 - offsetY)
                ];
                const avgA = corners.reduce((acc, c) => acc + c[3], 0) / 4;
                const avgR = corners.reduce((acc, c) => acc + c[0], 0) / 4;
                const avgG = corners.reduce((acc, c) => acc + c[1], 0) / 4;
                const avgB = corners.reduce((acc, c) => acc + c[2], 0) / 4;

                // If corners are mostly transparent, it already has no background!
                const hasTransparentBg = avgA < 50;

                if (!hasTransparentBg) {
                    const isBlackBg = avgR < 60 && avgG < 60 && avgB < 60;
                    const isWhiteBg = avgR > 190 && avgG > 190 && avgB > 190;

                    if (isBlackBg || isWhiteBg) {
                        const targetR = isBlackBg ? 0 : 255;
                        const targetG = isBlackBg ? 0 : 255;
                        const targetB = isBlackBg ? 0 : 255;
                        
                        const tolerance = isBlackBg ? 35 : 50; 
                        let deletedPixels = 0;

                        for (let i = 0; i < data.length; i += 4) {
                            const r = data[i], g = data[i+1], b = data[i+2];
                            const dist = Math.sqrt(Math.pow(r - targetR, 2) + Math.pow(g - targetG, 2) + Math.pow(b - targetB, 2));
                            const isNoisyDark = isBlackBg && (r + g + b < 25);

                            if (dist < tolerance || isNoisyDark) {
                                deletedPixels++;
                            }
                        }

                        if (deletedPixels / (data.length / 4) < 0.99) {
                            for (let i = 0; i < data.length; i += 4) {
                                const r = data[i], g = data[i+1], b = data[i+2];
                                const dist = Math.sqrt(Math.pow(r - targetR, 2) + Math.pow(g - targetG, 2) + Math.pow(b - targetB, 2));
                                const isNoisyDark = isBlackBg && (r + g + b < 25);
                                if (dist < tolerance || isNoisyDark) {
                                    data[i + 3] = 0;
                                } else {
                                    const pixelIndex = i / 4;
                                    const x = pixelIndex % width;
                                    const y = Math.floor(pixelIndex / width);
                                    const isOuterMargin = x < offsetX || x > width - 1 - offsetX || y < offsetY || y > height - 1 - offsetY;
                                    if (isOuterMargin && !isBlackBg && r < 80 && g < 80 && b < 80) {
                                        data[i + 3] = 0;
                                    }
                                }
                            }
                        }
                    }
                }

                // 2. SOLID WHITE / BLACK CONVERSION (Smart Monochrome Refonte)
                if (isWhiteInversion || isBlackInversion) {
                    if (isWhiteInversion) {
                        let totalVis = 0;
                        let darkVis = 0;
                        for (let i = 0; i < data.length; i += 4) {
                            if (data[i + 3] > 30) {
                                totalVis++;
                                if (data[i] < 45 && data[i + 1] < 45 && data[i + 2] < 45) darkVis++;
                            }
                        }
                        const isEntirelyBlackLogo = totalVis > 0 && (darkVis / totalVis > 0.85);

                        for (let i = 0; i < data.length; i += 4) {
                            if (data[i + 3] > 20) {
                                const r = data[i], g = data[i + 1], b = data[i + 2];
                                if (isEntirelyBlackLogo) {
                                    // Entirely black logo: turn all black pixels into pure white
                                    data[i] = 255; data[i + 1] = 255; data[i + 2] = 255;
                                } else {
                                    // Colored or multi-tone logo (e.g. gold & blue): 
                                    // Turn dark inner outlines into negative space cutouts, turn all logo graphic colors to pure white
                                    if (r < 35 && g < 35 && b < 35) {
                                        data[i + 3] = 0;
                                    } else {
                                        data[i] = 255; data[i + 1] = 255; data[i + 2] = 255;
                                    }
                                }
                            }
                        }
                    } else if (isBlackInversion) {
                        for (let i = 0; i < data.length; i += 4) {
                            if (data[i + 3] > 20) {
                                const r = data[i], g = data[i + 1], b = data[i + 2];
                                if (r > 180 && g > 180 && b > 180) {
                                    data[i] = 0; data[i + 1] = 0; data[i + 2] = 0;
                                }
                            }
                        }
                    }
                }

                // 4. SMART VECTOR UPSCALING (SMOOTHING PIXELATED EDGES)
                tempCtx.putImageData(imageData, 0, 0);

                const canvas = document.createElement('canvas');
                const maxDim = 2000;
                let w = width, h = height;
                if (w > h) { h = (maxDim / w) * h; w = maxDim; } else { w = (maxDim / h) * w; h = maxDim; }

                canvas.width = w; canvas.height = h;
                const ctx = canvas.getContext('2d')!;

                // STAGE 1: SMOOTHING PASS
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.filter = 'blur(0.4px)'; // Sub-pixel smoothing to merge artifacts
                ctx.drawImage(tempCanvas, 0, 0, w, h);

                // STAGE 2: EDGE SHARPENING (VECTOR-LIKE SNAP)
                const finalData = ctx.getImageData(0, 0, w, h);
                const d = finalData.data;
                for (let i = 0; i < d.length; i += 4) {
                    if (d[i + 3] > 0) {
                        const alpha = d[i + 3];
                        if (alpha < 130) d[i + 3] = 0; // Kill semi-transparent noise
                        else d[i + 3] = 255;          // Snap to solid
                    }
                }
                ctx.putImageData(finalData, 0, 0);

                resolve(canvas.toDataURL('image/png', 1.0));
            };
        });
    };

    const loadImage = (url: string): Promise<HTMLImageElement> => {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error(`Timeout loading image at ${url.substring(0, 100)}`)), 15000);
            const img = new Image();
            if (url.startsWith('http://') || url.startsWith('https://')) {
                img.crossOrigin = 'anonymous';
            }
            img.onload = () => { clearTimeout(timeout); resolve(img); };
            img.onerror = (e) => { clearTimeout(timeout); reject(new Error(`Failed to load image at ${url.substring(0, 100)}`)); };
            img.src = url;
        });
    };

    const generateMechanicalMockup = async (garmentUrl: string, logoUrl: string, view: 'front' | 'back', customScale?: number, garmentType?: string, colorMode?: 'original' | 'white' | 'black') => {
        const getAccentColor = (opacity: number = 1.0) => {
            const base = assetColor || '#f97316';
            if (base.startsWith('rgb')) {
                return base.replace('rgb(', 'rgba(').replace(')', `, ${opacity})`);
            }
            if (base.startsWith('#')) {
                const hex = base.replace('#', '');
                const r = parseInt(hex.substring(0, 2) || '249', 16);
                const g = parseInt(hex.substring(2, 4) || '115', 16);
                const b = parseInt(hex.substring(4, 6) || '22', 16);
                return `rgba(${r}, ${g}, ${b}, ${opacity})`;
            }
            return base;
        };
        try {
            const [imgGarment, rawImgLogo] = await Promise.all([
                loadImage(garmentUrl),
                loadImage(logoUrl)
            ]);

            let imgLogo: HTMLImageElement | HTMLCanvasElement = rawImgLogo;
            if (colorMode && colorMode !== 'original') {
                const lCanvas = document.createElement('canvas');
                lCanvas.width = rawImgLogo.width;
                lCanvas.height = rawImgLogo.height;
                const lCtx = lCanvas.getContext('2d', { willReadFrequently: true })!;
                lCtx.drawImage(rawImgLogo, 0, 0);
                const lData = lCtx.getImageData(0, 0, lCanvas.width, lCanvas.height);
                const pixels = lData.data;
                const targetRgb = colorMode === 'white' ? 255 : 0;
                for (let i = 0; i < pixels.length; i += 4) {
                    if (pixels[i + 3] > 0) {
                        pixels[i] = targetRgb;
                        pixels[i + 1] = targetRgb;
                        pixels[i + 2] = targetRgb;
                    }
                }
                lCtx.putImageData(lData, 0, 0);
                imgLogo = lCanvas;
            }
            // SPECIAL HANDLING FOR CARDS AND BANNERS
            if (garmentType === 'business_card' || garmentType === 'banner') {
                const canvas = document.createElement('canvas');
                canvas.width = 1024;
                canvas.height = 1024;
                const ctx = canvas.getContext('2d')!;
                
                // Background
                ctx.fillStyle = isLightMode ? '#ffffff' : '#0a0a0a';
                ctx.fillRect(0, 0, 1024, 1024);
                
                const baseColor = assetColor || (isLightMode ? '#ffffff' : '#050505');
                
                // Mockup Border/Shadow
                ctx.strokeStyle = isLightMode ? '#eeeeee' : '#1a1a1a';
                ctx.lineWidth = 20;
                ctx.strokeRect(10, 10, 1004, 1004);

                const isCard = garmentType === 'business_card';
                const isBanner = garmentType === 'banner';
                const cardW = isCard ? 850 : 900;  // 85mm
                const cardH = isCard ? 550 : 300;  // 55mm
                const x = (1024 - cardW) / 2;
                const y = (1024 - cardH) / 2;

                let config: any = null;
                try {
                    const urlParams = new URLSearchParams(window.location.search);
                    const uid = urlParams.get('uid');
                    config = await getStoredConfig(uid || undefined);
                } catch (e) {
                    console.warn('Could not load config for card', e);
                }

                // The Card/Banner Shape
                if (isCard) {
                    // PREMIUM FLAT BASE FOR AI
                    ctx.fillStyle = '#0c0c0c'; // Plain solid matte black color as requested
                    ctx.fillRect(x, y, cardW, cardH);
                    
                    // Subtle inner glow to define the premium feel
                    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(x, y, cardW, cardH);
                } else {
                    ctx.fillStyle = baseColor;
                    ctx.fillRect(x, y, cardW, cardH);
                }

                // === BUSINESS CARD RECTO (FRONT): Logo centered with emboss ===
                if (isCard && view === 'front') {
                    // Centered Logo with EMBOSS / RELIEF effect
                    if (logoUrl) {
                        const imgLogo = await loadImage(logoUrl);
                        const maxLogoW = cardW * 0.60;
                        const maxLogoH = cardH * 0.60;
                        const logoRatio = imgLogo.width / imgLogo.height;
                        let logoW = maxLogoW;
                        let logoH = logoW / logoRatio;
                        if (logoH > maxLogoH) { logoH = maxLogoH; logoW = logoH * logoRatio; }
                        const logoX = x + (cardW - logoW) / 2;
                        const logoY = y + (cardH - logoH) / 2;

                        ctx.save();
                        ctx.shadowColor = 'rgba(255,255,255,0.15)';
                        ctx.shadowBlur = 2;
                        ctx.shadowOffsetX = -1;
                        ctx.shadowOffsetY = -1;
                        ctx.globalAlpha = 0.8;
                        ctx.drawImage(imgLogo, logoX, logoY, logoW, logoH);
                        ctx.restore();

                        ctx.save();
                        ctx.shadowColor = 'rgba(0,0,0,0.8)';
                        ctx.shadowBlur = 15;
                        ctx.shadowOffsetX = 0;
                        ctx.shadowOffsetY = 8;
                        ctx.globalAlpha = 1.0;
                        ctx.drawImage(imgLogo, logoX, logoY, logoW, logoH);
                        ctx.restore();
                    }
                }

                // === BUSINESS CARD VERSO (BACK): Company info + QR code ===
                else if (isCard && view === 'back') {
                    let textY = y + 80;
                    ctx.textAlign = 'left';
                    
                    const name = config?.companyName || userData.companyName || "VOTRE ENTREPRISE";
                    const sector = config?.activitySector || userData.activity || "Secteur d'activité";
                    const phone = config?.whatsappNumber || userData.phone || "01 23 45 67 89";
                    const email = config?.contactEmail || userData.email || "contact@entreprise.com";
                    const website = userData.website || config?.address || "www.entreprise.com";

                    // Verso Text: Always light since card is dark (#111111)
                    ctx.fillStyle = '#ffffff';
                    ctx.font = `900 36px Inter, sans-serif`;
                    ctx.fillText(name.toUpperCase(), x + 50, textY);
                    textY += 40;

                    ctx.fillStyle = getAccentColor();
                    ctx.font = `italic 700 18px Inter, sans-serif`;
                    ctx.fillText(sector.toUpperCase(), x + 50, textY);
                    textY += 35;

                    ctx.strokeStyle = isLightMode ? '#dddddd' : '#333333';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(x + 50, textY);
                    ctx.lineTo(x + 450, textY);
                    ctx.stroke();
                    textY += 40;

                    const drawIcon = (type: string, cx: number, cy: number) => {
                        ctx.save();
                        ctx.translate(cx, cy);
                        ctx.strokeStyle = getAccentColor();
                        ctx.lineWidth = 2;
                        ctx.lineJoin = 'round';
                        ctx.lineCap = 'round';
                        ctx.beginPath();
                        if (type === 'phone') {
                            ctx.rect(-6, -10, 12, 20);
                            ctx.moveTo(-2, 6); ctx.lineTo(2, 6);
                        } else if (type === 'email') {
                            ctx.rect(-10, -7, 20, 14);
                            ctx.moveTo(-10, -7); ctx.lineTo(0, 2); ctx.lineTo(10, -7);
                        } else if (type === 'website') {
                            ctx.arc(0, 0, 7, 0, Math.PI * 2);
                            ctx.moveTo(-7, 0); ctx.lineTo(7, 0);
                            ctx.stroke();
                            ctx.beginPath();
                            ctx.ellipse(0, 0, 3, 7, 0, 0, Math.PI * 2);
                        } else if (type === 'address') {
                            ctx.arc(0, -5, 6, 0, Math.PI * 2);
                            ctx.moveTo(-6, -5); ctx.lineTo(0, 8); ctx.lineTo(6, -5);
                            ctx.moveTo(0, -5); ctx.arc(0, -5, 2, 0, Math.PI * 2);
                        } else if (type === 'service') {
                            ctx.rect(-8, -10, 16, 20);
                            ctx.moveTo(-8, 10); ctx.lineTo(8, 10);
                            for(let i=-4; i<=4; i+=8) {
                                for(let j=-6; j<=2; j+=6) {
                                    ctx.rect(i-1, j-1, 2, 2);
                                }
                            }
                        }
                        ctx.stroke();
                        ctx.restore();
                    };

                    const drawIconAndText = (type: string, text: string) => {
                        drawIcon(type, x + 65, textY - 6);
                        ctx.fillStyle = '#cccccc'; // Light gray text for dark card
                        ctx.font = `600 16px Inter, sans-serif`;
                        
                        const maxChars = 35;
                        if(text.length > maxChars) {
                            const words = text.split(' ');
                            let line = '';
                            let currentY = textY;
                            for(let i=0; i<words.length; i++) {
                                if((line + words[i]).length > maxChars) {
                                    ctx.fillText(line, x + 100, currentY);
                                    line = words[i] + ' ';
                                    currentY += 24;
                                } else {
                                    line += words[i] + ' ';
                                }
                            }
                            ctx.fillText(line, x + 100, currentY);
                            textY = currentY + 35;
                        } else {
                            ctx.fillText(text, x + 100, textY);
                            textY += 35;
                        }
                    };

                    drawIconAndText('service', "Direction Générale");
                    drawIconAndText('phone', phone);
                    drawIconAndText('email', email);
                    drawIconAndText('website', website);

                    try {
                        const urlParams = new URLSearchParams(window.location.search);
                        const uid = urlParams.get('uid');
                        const portalUrl = uid ? `${window.location.origin}/?uid=${uid}` : window.location.origin;
                        
                        // LOCAL GENERATION (Avoids net::ERR_BLOCKED_BY_CLIENT)
                        const qrUrl = await QRCode.toDataURL(portalUrl, {
                            margin: 1,
                            width: 250,
                            color: {
                                dark: '#ffffff',
                                light: '#111111'
                            }
                        });
                        
                        const qrSize = 180;
                        const qrX = x + cardW - qrSize - 50;
                        const qrY = y + (cardH - qrSize) / 2;
                        
                        const qrImg = await loadImage(qrUrl);
                        ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
                        
                        ctx.fillStyle = isLightMode ? '#aaaaaa' : '#666666';
                        ctx.font = `800 10px Inter, sans-serif`;
                        ctx.textAlign = 'center';
                        ctx.letterSpacing = '1px';
                        ctx.fillText('SCANNER POUR ACCÉDER', x + cardW - qrSize / 2 - 50, y + (cardH + qrSize) / 2 + 25);
                        ctx.textAlign = 'left';
                    } catch (qrErr) { console.warn('QR Code generation failed:', qrErr); }
                }

                // === BANNER ===
                else if (isBanner) {
                    ctx.fillStyle = getAccentColor();
                    ctx.fillRect(x, y, 15, cardH);
                    if (logoUrl) {
                        const imgLogo = await loadImage(logoUrl);
                        const logoW = cardW * 0.25;
                        const logoH = logoW * (imgLogo.height / imgLogo.width);
                        ctx.drawImage(imgLogo, x + 50, y + (cardH - logoH) / 2, logoW, logoH);
                    }
                    ctx.fillStyle = isLightMode ? '#111111' : '#f0f0f0';
                    ctx.textAlign = 'right';
                    let textY = y + 90;
                    if (userData.companyName) {
                        ctx.font = `900 55px Inter, sans-serif`;
                        ctx.fillText(userData.companyName.toUpperCase(), x + cardW - 50, textY);
                        textY += 70;
                    }
                    if (userData.activity) {
                        ctx.fillStyle = getAccentColor();
                        ctx.font = `italic 800 28px Inter, sans-serif`;
                        ctx.fillText(userData.activity.toUpperCase(), x + cardW - 50, textY);
                        textY += 65;
                    }
                    ctx.fillStyle = isLightMode ? '#555555' : '#888888';
                    ctx.font = `600 24px Inter, sans-serif`;
                    if (userData.phone) { ctx.fillText(userData.phone, x + cardW - 50, textY); textY += 55; }
                    if (userData.email) { ctx.fillText(userData.email.toLowerCase(), x + cardW - 50, textY); }
                }

                return canvas.toDataURL('image/png');
            }

            const canvas = document.createElement('canvas');
            const ratio = imgGarment.height / imgGarment.width;
            canvas.width = 2000;
            canvas.height = 2000 * ratio;

            const ctx = canvas.getContext('2d');
            if (!ctx) return logoUrl;

            // CRITICAL: High-quality smoothing for professional results
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';

            // 1. Dessiner le vêtement
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(imgGarment, 0, 0, canvas.width, canvas.height);

            // 2. Détecter le type de vêtement pour le placement
            const isSweat = garmentUrl.includes('hoodie');
            const isPolo = garmentUrl.includes('polo');
            const rawType = garmentType || (isPolo ? 'polo' : (isSweat ? 'sweat' : 'tshirt'));
            const typeGroup = PLACEMENTS[rawType as keyof typeof PLACEMENTS] || PLACEMENTS.tshirt;
            const pos = typeGroup[view] || typeGroup.front;
            
            let scale = pos.scale;
            if (customScale !== undefined) {
                if (customScale === 1.0) {
                    scale = pos.scale;
                } else {
                    const defaultSliderVal = view === 'front' ? 0.20 : 0.35;
                    const multiplier = customScale / defaultSliderVal;
                    scale = pos.scale * multiplier;
                }
            }

            // 3. Positionnement définitif
            const logoW = canvas.width * scale;
            const logoH = logoW * (imgLogo.height / imgLogo.width);

            ctx.globalAlpha = 1.0;
            ctx.drawImage(
                imgLogo,
                (canvas.width * pos.x) - (logoW / 2),
                (canvas.height * pos.y) - (logoH / 2),
                logoW,
                logoH
            );

            // 5. EXPORT AT UNIFIED SQUARE (1024x1024)
            const targetSize = 1024;
            const exportCanvas = document.createElement('canvas');
            exportCanvas.width = targetSize;
            exportCanvas.height = targetSize;
            const exportCtx = exportCanvas.getContext('2d')!;
            
            // CRITICAL: Force high-quality interpolation for the final downscale
            exportCtx.imageSmoothingEnabled = true;
            exportCtx.imageSmoothingQuality = 'high';
            
            exportCtx.clearRect(0, 0, targetSize, targetSize);

            const scaleFactor = Math.min(targetSize / canvas.width, targetSize / canvas.height);
            const scaledW = canvas.width * scaleFactor;
            const scaledH = canvas.height * scaleFactor;
            const dx = (targetSize - scaledW) / 2;
            const dy = (targetSize - scaledH) / 2;

            exportCtx.drawImage(canvas, 0, 0, canvas.width, canvas.height, dx, dy, scaledW, scaledH);
            return exportCanvas.toDataURL('image/png', 1.0);
        } catch (e) {
            console.error("Mechanical Mockup Error:", e);
            return logoUrl;
        }
    };

    const compressImage = (base64: string, maxEdge: number = 800, forceSquare: boolean = false): Promise<string> => {
        return new Promise((resolve, reject) => {
            if (!base64 || typeof base64 !== 'string') {
                return reject(new Error("Image source invalide ou vide"));
            }
            const timeout = setTimeout(() => reject(new Error("Timeout compression image")), 15000);
            const img = new Image();
            if (base64.startsWith('http://') || base64.startsWith('https://')) {
                img.crossOrigin = 'anonymous';
            }
            img.onerror = () => { clearTimeout(timeout); reject(new Error(`Erreur chargement image: ${base64.substring(0, 60)}...`)); };
            img.onload = () => {
                clearTimeout(timeout);
                const canvas = document.createElement('canvas');
                let w = img.width;
                let h = img.height;
                let sx = 0;
                let sy = 0;

                if (forceSquare) {
                    const size = Math.min(w, h);
                    sx = (w - size) / 2;
                    sy = (h - size) / 2;
                    w = size;
                    h = size;
                }

                const scale = Math.min(maxEdge / w, maxEdge / h);
                canvas.width = w * scale;
                canvas.height = h * scale;
                const ctx = canvas.getContext('2d')!;
                ctx.drawImage(img, sx, sy, w, h, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', 0.85));
            };
            img.src = base64;
        });
    };

    const remasterLogo = async (slot: 'A' | 'B'): Promise<BtpLogo | null> => {
        const logo = slot === 'A' ? logoA : logoB;
        if (!logo.original || logo.remastered) return logo;
        
        try {
            setRemasterStep(`Optimisation HD ${slot}...`);
            const remaster = await geminiService.remasterLogo(logo.original);
            const nextLogo: BtpLogo = { ...logo, remastered: remaster, mode: 'remastered' };
            if (slot === 'A') setLogoA(nextLogo);
            else setLogoB(nextLogo);
            return nextLogo;
        } catch (e) {
            console.error("Remaster Error:", e);
            return logo;
        } finally {
            setRemasterStep(null);
        }
    };

    const fetchBase64 = async (url: string) => {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP ${response.status} sur ${url}`);
            const blob = await response.blob();
            return new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        } catch (e) {
            console.error("Fetch Error:", e);
            throw e;
        }
    };

    const addLog = (msg: string) => setAuditLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`].slice(-8));

    const startSequentialPipeline = async (
        customUserData?: UserData, 
        singleId?: string, 
        initialMockups?: MockupItem[],
        overrideLogoA?: BtpLogo,
        overrideLogoB?: BtpLogo
    ) => {
        const uidParam = new URLSearchParams(window.location.search).get('uid');
        const u = customUserData || userData;
        let currentLocalMockups = initialMockups || mockups;
        
        // MANNEQUIN CONSISTENCY: Deterministic selection based on company name
        const getMannequinProfile = () => {
            const profiles = [
                "A realistic 35-year-old professional male model with a clean-cut look, short dark hair, athletic build, confident expression, viewed in a high-end office or industrial studio environment"
            ];
            return profiles[0]; // Always use the male profile matching the assets
        };
        const consistentMannequinDesc = getMannequinProfile();

        const updateItem = (id: string, ai: string | null, loading: boolean, mechanical?: string | null) => {
            setMockups(prev => {
                const next = prev.map(it => {
                    if (it.id === id) {
                        const slot = logoPlacements[it.id] || 'A';
                        const logo = slot === 'A' ? (overrideLogoA || logoA) : (overrideLogoB || logoB);
                        const isRemastered = logo.mode === 'remastered';
                        return { 
                            ...it, 
                            ai: isRemastered ? it.ai : ai, 
                            aiRemastered: isRemastered ? ai : it.aiRemastered,
                            isGenerating: loading, 
                            mechanical: mechanical !== undefined ? mechanical : it.mechanical 
                        };
                    }
                    return it;
                });
                saveSession(overrideLogoA || logoA, overrideLogoB || logoB, logoPlacements, u, next);
                return next;
            });
        };

        const getLogoToUse = (placementId: string) => {
            const slot = logoPlacements[placementId] || 'A';
            const logo = slot === 'A' ? (overrideLogoA || logoA) : (overrideLogoB || logoB);
            if (!logo.original) return null;
            if (logo.mode === 'remastered') return logo.remastered || logo.adapted;
            return logo.mode === 'original' ? logo.original : logo.adapted;
        };

        try {
            // V24 DYNAMIC PIPELINE: Use mockups from state
            const itemsToProc = singleId 
                ? currentLocalMockups.filter(x => x.id === singleId) 
                : currentLocalMockups.filter(x => x.selected);

            addLog(`DÉMARRAGE PIPELINE : ${itemsToProc.length} ITEM(S) SÉLECTIONNÉ(S).`);

            for (const it of itemsToProc) {
                try {
                    const logoToUse = getLogoToUse(it.id);
                    if (!logoToUse && it.garment !== 'business_card') continue;

                    // SPECIAL PIPELINE FOR NON-GARMENTS (CARDS, BANNERS)
                    if (it.garment === 'business_card' || it.garment === 'banner') {
                        updateItem(it.id, null, true);
                        addLog(`GABARIT CDV (${it.view.toUpperCase()})...`);
                        const mechanical = await generateMechanicalMockup(it.base, logoToUse, it.view, 1.0, it.garment, logoColorModes[it.id]);
                        
                        try {
                            addLog(`STUDIO IA : TRANSMISSION...`);
                            
                            let modelBase64 = mechanical;
                            try {
                                if (it.model) modelBase64 = await fetchBase64(it.model);
                            } catch (fErr) {
                                console.warn("Failed to fetch card model, using mechanical as base", fErr);
                            }

                            const prompt = it.view === 'front' 
                                ? "PREMIUM STUDIO MOCKUP: Apply this business card design perfectly onto the blank card stack. Realistic textures, cinematic lighting, 8k resolution. NO BORDERS around the card. Ensure the background matches the premium studio environment of the back view."
                                : "PREMIUM STUDIO MOCKUP: Apply this business card back design perfectly onto the blank card. Ensure the text and QR code are razor sharp. Realistic matte paper texture. NO BORDERS around the card.";

                            const aiResult = await geminiService.generateTryOnImage(
                                modelBase64, 
                                mechanical, 
                                it.garment,
                                prompt,
                                "Sans Filtre",
                                it.view,
                                null,
                                null,
                                null,
                                "",
                                "",
                                "1:1",
                                'artistic'
                            );
                            addLog(`RENDU IA TERMINÉ (${it.id}).`);
                            updateItem(it.id, aiResult, false, mechanical);
                        } catch (aiErr) {
                            console.warn('AI Studio failed, falling back to mechanical', aiErr);
                            addLog(`[!] ÉCHEC STUDIO : UTILISATION GABARIT TECHNIQUE.`);
                            updateItem(it.id, mechanical, false, mechanical);
                        }

                        addLog(`SUCCÈS : ${it.id.toUpperCase()} PRÊT.`);
                        continue;
                    }

                    // Quota check bypass for individual retries
                    if (credits <= 0 && !singleId) {
                        addLog("QUOTA ÉPUISÉ : Veuillez recharger vos crédits.");
                        break;
                    }

                    updateItem(it.id, null, true); // Mark as loading
                    addLog(`ÉTAPE 1: GABARIT...`);

                    const techScale = it.view === 'front' ? logoScaleFront : logoScaleBack;
                    const mechanicalBase64 = await generateMechanicalMockup(it.base, logoToUse, it.view, techScale, it.garment, logoColorModes[it.id]);
                    addLog(`ÉTAPE 2: MANNEQUIN...`);

                    const modelPath = (it.model && !it.model.includes('male_polo')) 
                        ? it.model 
                        : (it.view === 'front' ? '/assets/models/male_tshirt_front.png' : '/assets/models/male_tshirt_back.png');
                    
                    let rawModel: string;
                    try {
                        rawModel = await fetchBase64(modelPath);
                    } catch (mErr) {
                        const fallbackModel = it.view === 'front' ? '/assets/models/male_tshirt_front.png' : '/assets/models/male_tshirt_back.png';
                        rawModel = await fetchBase64(fallbackModel);
                    }
                    const modelBase64 = await compressImage(rawModel, 1024, true); // Force Square Mannequin
                    addLog(`ÉTAPE 3: TRANSMISSION IA...`);

                    let garmentLabel = 'Plain Black Hoodie';
                    if (it.garment === 'tshirt' || it.garment === 'tshirt_basic') garmentLabel = 'Plain Black T-shirt';
                    else if (it.garment === 'polo') garmentLabel = 'Plain Black Polo Shirt with collar and short sleeves';
                    else if (it.garment === 'tshirt_bicolore') garmentLabel = 'High-Visibility Two-Tone Fluorescent Yellow and Black T-shirt with reflective bands';
                    else if (it.garment === 'veste') garmentLabel = 'High-Visibility Fluorescent Safety Vest';
                    
                    const slot = logoPlacements[it.id];
                    const logoObj = slot === 'A' ? logoA : logoB;
                    const logoToUseMode = logoObj.mode;
                    const activityTrimmed = (u.activity || '').trim();
                    const poseDesc = it.view === 'back' ? "The model is viewed from behind, showing the back of the garment." : "The model is viewed from the front, showing the front of the garment.";
                    let sectorPrompt = "";

                    if (activityTrimmed) {
                        const sectorRaw = activityTrimmed.toUpperCase();
                        let additionalSectorInstructions = "";
                        if (sectorRaw === 'BTP' || sectorRaw === 'CONSTRUCTION' || sectorRaw === 'BÂTIMENT' || sectorRaw === 'BATIMENT') {
                            additionalSectorInstructions = "Since the client is in the BTP/Construction sector, the visual MUST look authentic to the trade. The model MUST stand in a realistic high-end active construction site, a professional logistics depot, or an industrial building yard environment. The model should look like a genuine building professional or supervisor, optionally with a safety hard hat nearby or other realistic elements. The overall aesthetic must emphasize safety, security, and industrial professionalism.";
                        } else {
                            additionalSectorInstructions = `The background and atmosphere must perfectly reflect the professional '${activityTrimmed}' environment.`;
                        }
                        sectorPrompt = `High-end commercial photography. The model is ${consistentMannequinDesc}, a realistic confident professional from the ${activityTrimmed} industry. ${additionalSectorInstructions} ${poseDesc} `;
                    } else {
                        // Default image generation without specific sector theme (neutral studio environment)
                        sectorPrompt = `High-end commercial studio photography. The model is ${consistentMannequinDesc}, standing in a clean, modern neutral photo studio background with soft professional studio lighting. ${poseDesc} `;
                    }

                    const cMode = logoColorModes[it.id] || 'original';
                    let colorInstruction = "";
                    if (cMode === 'white') {
                        colorInstruction = "\nSTRICT LOGO COLOR INSTRUCTION: The logo printed on the garment MUST BE PURE WHITE (#FFFFFF) MONOCHROME PRINT. Transform all logo elements into solid white print.";
                    } else if (cMode === 'black') {
                        colorInstruction = "\nSTRICT LOGO COLOR INSTRUCTION: The logo printed on the garment MUST BE PURE BLACK (#000000) MONOCHROME PRINT. Transform all logo elements into solid black print.";
                    }
                    
                    const isBtpSector = (u.activity || 'BTP').toUpperCase().match(/BTP|CONSTRUCTION|BÂTIMENT|BATIMENT/);
                    let contextPrompt = logoToUseMode === 'remastered' 
                      ? `v-ton_direct. 
                         REMASTERING IA SIGNAID PRO.
                         ${(isBtpSector || cMode === 'white' || cMode === 'black') 
                           ? `STRICT FLAT DESIGN : Aucun dégradé, aucune ombre.
                              COULEUR : Utiliser le ${cMode === 'black' ? 'NOIR' : 'BLANC'} PUR par défaut. Si couleur nécessaire, utiliser uniquement la teinte la plus claire.`
                           : `PRESERVE ALL GRADIENTS AND COLORS: The logo printed on the garment MUST faithfully reproduce any color transitions, fades, neon effects, shading, or gradients from the remastered logo exactly. DO NOT convert the logo to solid white or flat color blocks.`
                         }
                         QUALITÉ : Lissage vectoriel (Vector Snap) • 300 DPI • Zéro bruit de compression.
                         The logo on the garment MUST look like a clean, high-fidelity print.
                         STRICT GARMENT FIDELITY: The final garment MUST EXACTLY BE ${garmentLabel}. CRITICAL: YOU MUST EXACTLY MATCH THE GARMENT COLORS OF THE MECHANICAL GABARIT IN INPUT 2. DO NOT LEAVE THE GARMENT BLACK OR DARK GREY UNLESS THE GABARIT IS BLACK.`
                      : `v-ton_direct. 
                         STRICT SHARP-PRINT PROTOCOL. ZERO-NOISE VECTOR REMASTERING. 
                         IGNORE ALL STRAY DOTS, ARTIFACTS, OR COMPRESSION NOISE. 
                         INTELLIGENT VECTOR SMOOTHING, BOLD CONTRAST. 
                         Render ONLY the core brand elements.
                         INTELLIGENT RE-MASTERING: Analyze Input 3. If lines are too thin, thicken them gracefully. 
                         If edges are jagged or noisy, smooth them into vector-like paths. 
                         The logo on the garment MUST look like a professional screen print: opaque, sharp, and durable.
                         Maintain original branding proportions but ensure maximum visibility on the provided garment.
                         STRICT GARMENT FIDELITY: The final garment MUST EXACTLY BE ${garmentLabel}. CRITICAL: YOU MUST EXACTLY MATCH THE GARMENT COLORS OF THE MECHANICAL GABARIT IN INPUT 2. DO NOT LEAVE THE GARMENT BLACK OR DARK GREY UNLESS THE GABARIT IS BLACK.`;

                    if (u.companyName) {
                        const compUpper = u.companyName.toUpperCase().trim();
                        contextPrompt += `\nSTRICT LOGO TEXT & SPELLING INSTRUCTION: The company logo/branding text is exactly "${compUpper}". The text rendered on the garment MUST have this exact literal spelling character-by-character. Do NOT spell it as "${compUpper.replace(/AE/g, 'A')}" or miss any letters. Every single letter in "${compUpper}" must be rendered perfectly sharp, clear, and perfectly readable.`;
                    }
                    contextPrompt += colorInstruction;

                    const result = await geminiService.generateTryOnImage(
                        modelBase64,
                        mechanicalBase64,
                        garmentLabel,
                        contextPrompt,
                        "Sans Filtre",
                        it.view,
                        logoToUse, // Réactivé pour forcer la netteté (Source HD)
                        null,
                        null,
                        "",
                        "",
                        "1:1",
                        'v-ton'
                    );

                    updateItem(it.id, result, false, mechanicalBase64);
                    addLog(`SUCCÈS : ${it.id.toUpperCase()} PRÊT.`);

                    // DIAGNOSTIC 9:16
                    const diagWin = window.open('', `_diag_${it.id}`, 'width=500,height=888');
                    if (diagWin) {
                        diagWin.document.write(`<!DOCTYPE html><html><head><title>RAW AI — ${it.id.toUpperCase()}</title>
                        <style>body{margin:0;background:#000;display:flex;align-items:center;justify-content:center;min-height:100vh;}
                        img{max-width:100%;height:auto;border:1px solid #333;}</style></head>
                        <body><img src="${result}" /></body></html>`);
                        diagWin.document.close();
                    }

                    setCredits(prev => {
                        const newVal = Math.max(0, prev - 1);
                        if (userData.email) localStorage.setItem(`btp_credits_${userData.email}`, newVal.toString());
                        return newVal;
                    });
                } catch (err: any) {
                    console.error(`Error generating ${it.id}:`, err);
                    addLog(`[!] ERREUR ${it.id.toUpperCase()}: ${err.message || 'Inconnue'}`);
                    updateItem(it.id, null, false);
                }
            }
            setIsRegenerating(false);
            // DO NOT redirect automatically to shop after generation completes!
            /*
            if (!hasRedirected.current) {
                hasRedirected.current = true;
                const targetUrl = uidParam ? `/portail-shop?uid=${uidParam}` : (sessionId ? `/portail-shop?uid=${sessionId}` : '/portail-shop');
                navigate(targetUrl, { replace: true });
            }
            */
        } catch (e) { setIsRegenerating(false); }
    };

    const handleUpload = async (file: File, slot: 'A' | 'B' = 'A') => {
        const reader = new FileReader();
        reader.onload = async () => {
            const base64 = reader.result as string;
            setStatusMessage(`ANALYSE DU LOGO ${slot} SÉRIE V24...`);
            setIsAnalyzing(true);

            try {
                const [original, adapted, analysis] = await Promise.all([
                    processLogoDeterministic(base64, false, true), // No inversion, remove background
                    processLogoDeterministic(base64, true, true),  // Industrial inversion, remove background
                    geminiService.analyzeLogoBranding(base64)
                ]);

                const newLogo: BtpLogo = { id: slot, original, adapted, remastered: null, mode: 'original' };
                const currentLogoA = slot === 'A' ? newLogo : logoA;
                const currentLogoB = slot === 'B' ? newLogo : logoB;

                if (slot === 'A') setLogoA(newLogo); else setLogoB(newLogo);
                setLogoAnalysis(analysis);

                setStatusMessage("CALIBRAGE DES GABARITS BTP...");

                if (state === 'LANDING') {
                    setState('CLEAN_CHECK');
                }

                await saveSession(
                    currentLogoA,
                    currentLogoB,
                    logoPlacements,
                    userData,
                    mockups
                );
            } catch (error) {
                console.error("Upload/Analysis error:", error);
            } finally {
                setIsAnalyzing(false);
            }
        };
        reader.readAsDataURL(file);
    };


    const handleConfirmEffects = async () => {
        setStatusMessage("TRAITEMENT HD DES LOGOS...");
        // 1. Re-process logo A
        if (logoA.original) {
            const raw = await fetch(logoA.original).then(r => r.blob()).then(fileToBase64);
            // Wait, we need the REALLY raw original, but we'll use the current if not found
            const adapted = await processLogoDeterministic(logoA.original, true, true);
            const cleaned = await processLogoDeterministic(logoA.original, false, true);
            const nextLogoA = { ...logoA, original: cleaned, adapted };
            setLogoA(nextLogoA);
        }
        // 2. Re-process logo B
        if (logoB.original) {
            const adapted = await processLogoDeterministic(logoB.original, true, true);
            const cleaned = await processLogoDeterministic(logoB.original, false, true);
            const nextLogoB = { ...logoB, original: cleaned, adapted };
            setLogoB(nextLogoB);
        }
        setStatusMessage("");
    };

    const fileToBase64 = (blob: Blob): Promise<string> => new Promise((resolve) => {
        const r = new FileReader();
        r.onloadend = () => resolve(r.result as string);
        r.readAsDataURL(blob);
    });

    const handleCropConfirm = async (croppedBase64: string) => {
        setShowCropModal(false);
        setStatusMessage("TRAITEMENT DU LOGO B (ROGNAGE)...");
        setIsAnalyzing(true);
        try {
            const [original, adapted] = await Promise.all([
                processLogoDeterministic(croppedBase64, false, true),
                processLogoDeterministic(croppedBase64, true, true),
            ]);
            const newLogoB: BtpLogo = { id: 'B', original, adapted, remastered: null, mode: logoA.mode };
            setLogoB(newLogoB);
            saveSession(logoA, newLogoB, logoPlacements, userData, mockups);
        } catch (err) {
            console.error("Crop error:", err);
        } finally {
            setIsAnalyzing(false);
            setStatusMessage("");
        }
    };

    const handleAiRemaster = async (slot: 'A' | 'B', targetColor: 'white' | 'black' | 'color' = 'white') => {
        const logo = slot === 'A' ? logoA : logoB;
        if (!logo.original) return;

        try {
            setRemasterStep("DÉTOURAGE & VECTORISATION HAUTE-PRÉCISION IA...");
            setIsAnalyzing(true);
            
            let remastered: string;
            try {
                // Call Gemini AI vector remastering service for true AI high-precision white refonte
                const rawAiRemaster = await geminiService.remasterLogo(logo.original, targetColor);
                // Strip background from AI output to get transparent PNG
                remastered = await processLogoDeterministic(rawAiRemaster, false, true);
            } catch (aiErr) {
                console.warn("AI Remaster fallback to deterministic vector snap", aiErr);
                const invertMode = targetColor === 'white' ? 'white' : (targetColor === 'black' ? 'black' : false);
                remastered = await processLogoDeterministic(logo.original!, invertMode, true);
            }
            
            const nextLogo: BtpLogo = { ...logo, remastered, mode: 'remastered' };
            if (slot === 'A') setLogoA(nextLogo);
            else setLogoB(nextLogo);

            if (sessionId) {
                await dbSet(`${sessionId}_${slot}_remastered`, remastered);
            }

            // Clear outdated aiRemastered mockups and re-trigger pipeline for fresh Studio AI mockups with the new white logo
            const resetMockups = mockups.map(m => ({ ...m, aiRemastered: null }));
            setMockups(resetMockups);
            
            // Re-generate mechanical & AI Studio try-on mockups automatically
            startSequentialPipeline(
                userData, 
                undefined, 
                resetMockups, 
                slot === 'A' ? nextLogo : undefined, 
                slot === 'B' ? nextLogo : undefined
            ).catch(err => {
                console.error("Error auto-regenerating mockups after remaster:", err);
            });
        } catch (e) {
            console.error("Vector Remaster Error:", e);
            alert("Erreur lors de la modernisation du logo. Veuillez réessayer.");
        } finally {
            setRemasterStep(null);
            setIsAnalyzing(false);
        }
    };

    const startSimulation = async () => {
        const isAdmin = userData.email === 'logosigneed@gmail.com';
        if (!isAdmin && !logoA.original) {
            alert("Veuillez charger un logo avant de générer la page produit.");
            return;
        }

        const uidParam = new URLSearchParams(window.location.search).get('uid');
        const logoSrc = logoA.mode === 'remastered' 
            ? (logoA.remastered || logoA.adapted || logoA.original) 
            : (logoA.mode === 'original'
                ? (logoA.original || logoA.adapted)
                : (logoA.adapted || logoA.original));

        // 1. Sync config with the selected logo and merch URL immediately in the background
        if (uidParam) {
            try {
                const config = await getStoredConfig(uidParam);
                if (config) {
                    if (logoSrc) {
                        config.logoUrl = logoSrc;
                    }
                    if (sessionId) {
                        config.generatedKey = sessionId;
                        config.actuationKey = sessionId;
                    }
                    config.merchUrl = `${window.location.origin}/portail-shop?uid=${uidParam}`;
                    await saveStoredConfig(config, uidParam);
                }
            } catch (err) {
                console.error("Failed to sync logo on simulation click:", err);
            }
        }

        // 2. Capture lead if inbound
        if (isInbound && !isAdmin) {
            try {
                const sid = sessionId || `lead-${Math.random().toString(36).substring(2, 9)}`;
                await addDoc(collection(db, 'leads'), {
                    ...userData,
                    sessionId: sid,
                    timestamp: serverTimestamp(),
                    status: 'NEW',
                    type: 'INBOUND_PORTAL'
                });
            } catch (e) {
                console.error("Lead capture error:", e);
            }
        }

        // 3. Set state to AUDIT to trigger the beautiful visual AI building animation
        setState('AUDIT');

        // 4. Kick off sequential mockup rendering pipeline
        startSequentialPipeline(userData, undefined, mockups).catch(err => {
            console.error("Background rendering error:", err);
        });
        scrollToResults();
    };

    const handleContinueToSimulation = () => {
        setState('AUDIT');
        startSequentialPipeline(undefined, undefined, mockups);
        scrollToResults();
    };

    const handleAuthSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const email = formData.get('email') as string;

        // SYNC CREDITS WITH ACCOUNT
        let userCredits = credits;
        if (email === 'logosigneed@gmail.com') {
            userCredits = 999;
            localStorage.setItem(`btp_credits_${email}`, '999');
            setIsIpBlocked(false);
        } else {
            const savedCredits = localStorage.getItem(`btp_credits_${email}`);
            if (savedCredits !== null) {
                userCredits = parseInt(savedCredits);
            } else {
                // New account gets 3 credits
                userCredits = 3;
                localStorage.setItem(`btp_credits_${email}`, '3');
            }
        }
        setCredits(userCredits);

        const newUserData = {
            ...userData,
            email,
            companyName: formData.get('company') as string,
            activity: formData.get('activity') as string,
            phone: formData.get('phone') as string,
            website: formData.get('website') as string,
            tva: formData.get('tva') as string,
        };
        setUserData(newUserData);
        setShowAuthModal(false);

        // PERSIST ACCOUNT MEMORY
        localStorage.setItem('btp_stay_logged_in', stayLoggedIn.toString());
        if (stayLoggedIn) {
            localStorage.setItem('btp_last_email', email);
        } else {
            localStorage.removeItem('btp_last_email');
        }
        localStorage.setItem(`btp_user_data_${email}`, JSON.stringify(newUserData));

        saveSession(logoA, logoB, logoPlacements, newUserData, mockups);

        if (state === 'CLEAN_CHECK' && isBatConfirmed) {
            startSimulation();
        } else if (state === 'RESULT' && logoA.original) {
            startSequentialPipeline(newUserData);
        }
    };

    const isAnyMockupGenerating = mockups.some(m => m.selected && m.isGenerating);
    const hasAnyGeneratedMockup = mockups.some(m => m.ai !== null || m.aiRemastered !== null || (m as any).hasAi || m.mechanical !== null);
    const areAllSelectedMockupsGenerated = hasAnyGeneratedMockup || mockups
        .filter(m => m.selected)
        .every(m => {
            const slot = logoPlacements[m.id] || 'A';
            const logo = slot === 'A' ? logoA : logoB;
            return logo.mode === 'remastered' ? (m.aiRemastered !== null || m.ai !== null) : (m.ai !== null || m.aiRemastered !== null);
        });
    const isAccessDisabled = isAnyMockupGenerating;

    if (!isLoaded) {
        return (
            <div className="fixed inset-0 bg-[#020202] flex flex-col items-center justify-center gap-8 z-[9999]">
                <div className="w-16 h-16 bg-orange-600 flex items-center justify-center font-black text-black text-3xl shadow-[8px_8px_0_white] animate-pulse">S</div>
                <div className="text-orange-600 font-black text-[10px] tracking-[0.5em] uppercase italic animate-pulse">Initialisation Système Signaid V24</div>
            </div>
        );
    }
    return (
        <div className={`min-h-screen ${isLightMode ? 'bg-gray-50 text-gray-900' : 'bg-[#020202] text-zinc-100'} font-sans selection:bg-orange-500 selection:text-black italic uppercase transition-colors duration-500`}>
            <SEO 
                title={isShop ? "Dotation Industrielle | SIGNAID PRO" : "Audit d'Autorité Logistique | SIGNAID PRO"} 
                description={isShop ? "Plateforme de gestion de dotations industrielles." : "Outil d'audit d'autorité visuelle pour leaders techniques."} 
            />

            <header className={`p-8 flex justify-between items-center max-w-7xl mx-auto border-b ${isLightMode ? 'border-gray-200' : 'border-white/5'}`}>
                <div onClick={() => setState('LANDING')} className="flex items-center gap-4 cursor-pointer">
                    <div className="w-10 h-10 bg-orange-600 flex items-center justify-center font-black text-black text-xl shadow-[4px_4px_0_white]">S</div>
                    <span className={`font-black text-xl tracking-tight ${isLightMode ? 'text-gray-900' : 'text-zinc-100'}`}>SIGNAID <span className="text-orange-600">PORTAIL</span></span>
                </div>
                <div className="flex items-center gap-6">
                    <button 
                        onClick={() => setIsLightMode(!isLightMode)} 
                        className={`p-2 rounded-full border ${isLightMode ? 'bg-gray-100 border-gray-300 text-gray-600 hover:bg-gray-200' : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700'} transition-all`}
                        title="Basculer le thème (Jour / Nuit)"
                    >
                        {isLightMode ? <Moon size={14} /> : <Sun size={14} />}
                    </button>
                    <button 
                        onClick={() => window.location.href = `/vitrine-admin/dashboard?uid=${sessionId || urlParams.get('uid') || ''}`}
                        className={`text-[10px] font-black tracking-widest uppercase px-4 py-2 border transition-all flex items-center gap-2 ${
                            isLightMode 
                                ? 'bg-zinc-900 border-zinc-900 text-white hover:bg-orange-600 hover:border-orange-600 hover:text-black shadow-md' 
                                : 'bg-orange-600 border-orange-600 text-black hover:bg-white hover:border-white hover:text-black shadow-[0_0_15px_rgba(234,88,12,0.3)]'
                        }`}
                    >
                        <LogIn size={12} />
                        Modifier données (Admin)
                    </button>
                    {sessionId && <div className={`text-[10px] font-black tracking-widest ${isLightMode ? 'text-gray-400 bg-gray-100 border-gray-200' : 'text-zinc-800 bg-zinc-950 border-zinc-900'} px-3 py-1 border`}>ID: {sessionId.toUpperCase()}</div>}
                </div>
            </header>

            <main className="max-w-7xl mx-auto p-6">


                {(state === 'LANDING' || state === 'CLEAN_CHECK' || state === 'RESULT' || state === 'AUDIT' || state === 'SALES_AUDIT') && (
                    <div className="space-y-12 animate-reveal max-w-6xl mx-auto py-12">
                        
                        {/* 
                            V24 ARCHITECTURE : 
                            /portail-audit => TECHNICAL TOOL (Upload/Audit)
                        */}

                        {/* ÉTAPE 1 : CHARGEMENT */}
                        <div className="flex flex-col items-center justify-center space-y-12 mb-12">
                            <header className="text-center space-y-4 max-w-2xl mx-auto">
                                <h1 className={`text-4xl md:text-6xl font-black italic tracking-tighter uppercase leading-none ${isLightMode ? 'text-gray-900' : 'text-zinc-100'}`}>
                                    {isShop ? "Dotation Industrielle" : "Autorité Logistique"} <br />
                                    <span className="text-orange-600">Premium.</span>
                                </h1>
                            </header>

                            {((state === 'LANDING' && isAuditPath) || (state === 'LANDING' && logoA.original)) && !logoA.original && (
                                <>
                                    <div
                                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                        onDragLeave={() => setIsDragging(false)}
                                        onDrop={(e) => { e.preventDefault(); setIsDragging(false); const file = e.dataTransfer.files[0]; if (file) handleUpload(file); }}
                                        onClick={() => fileInputRef.current?.click()}
                                        className={`group w-full max-w-4xl py-24 border-4 border-dashed transition-all flex flex-col items-center justify-center gap-8 cursor-pointer
                                            ${isDragging ? 'border-orange-600 bg-orange-600/5' : (isLightMode ? 'bg-zinc-100 border-zinc-200 hover:border-zinc-300' : 'bg-zinc-950 border-zinc-900 hover:border-zinc-800')}
                                        `}
                                    >
                                        <Upload size={64} className={isDragging ? 'text-orange-600' : 'text-zinc-900'} />
                                        <div className="text-center">
                                            <p className="text-3xl font-black italic tracking-tighter">CHARGER LE LOGO SOURCE</p>
                                            <p className="text-zinc-800 font-bold text-xs tracking-widest mt-2 uppercase">PNG / AI / SVG (Traitement HD automatique)</p>
                                        </div>
                                        <input type="file" ref={fileInputRef} onChange={(e) => { const file = e.target.files?.[0]; if (file) handleUpload(file); }} className="hidden" accept="image/*" />
                                    </div>
                                </>
                            )}
                        </div>

                        <div className={`flex justify-between items-end border-b-2 border-orange-600 pb-6 group cursor-pointer`} onClick={() => setIsConfigOpen(!isConfigOpen)}>
                            <div className="space-y-2">
                                <h2 className={`text-6xl font-black italic tracking-tighter uppercase leading-none ${isLightMode ? 'text-gray-900' : 'text-zinc-100'}`}>Étape 1 : <span className="text-orange-600">Analyse du Logo</span></h2>
                                <p className={`text-[10px] font-black tracking-[0.5em] uppercase italic ${isLightMode ? 'text-gray-400' : 'text-zinc-500'}`}>Nettoyage textile noir • {isConfigOpen ? 'CLIQUEZ POUR RÉDUIRE' : 'CLIQUEZ POUR AGRANDIR'}</p>
                            </div>
                        </div>

                        {isConfigOpen && (
                            <div className="space-y-12">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {[logoA, logoB].map((logo, idx) => (
                                        <div key={logo.id} className={`p-6 border-2 transition-all ${logo.original ? (isLightMode ? 'bg-white border-gray-200 shadow-xl' : 'bg-zinc-950 border-zinc-900 shadow-xl') : (isLightMode ? 'border-dashed border-gray-300' : 'border-dashed border-zinc-800')}`}>
                                            <div className="flex justify-between items-center mb-6">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-6 h-6 flex items-center justify-center font-black text-[10px] ${logo.original ? 'bg-orange-600 text-black' : (isLightMode ? 'bg-gray-200 text-gray-400' : 'bg-zinc-900 text-zinc-600')}`}>{logo.id}</div>
                                                    <span className={`font-black text-[10px] tracking-widest uppercase italic ${isLightMode ? 'text-gray-500' : 'text-zinc-400'}`}>SOURCE LOGO {logo.id}</span>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    {logo.original && (
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => {
                                                                    const input = document.createElement('input');
                                                                    input.type = 'file';
                                                                    input.accept = 'image/*';
                                                                    input.onchange = (e) => {
                                                                        const file = (e.target as HTMLInputElement).files?.[0];
                                                                        if (file) handleUpload(file, logo.id);
                                                                    };
                                                                    input.click();
                                                                }}
                                                                className={`px-3 py-1 font-black text-[9px] border ${isLightMode ? 'text-gray-400 border-gray-100 hover:text-gray-900' : 'text-zinc-600 border-zinc-900 hover:text-white'}`}
                                                            >
                                                                REMPLACER
                                                            </button>
                                                            <button
                                                                onClick={() => logo.id === 'A' ? setLogoA({ ...logoA, mode: 'original' }) : setLogoB({ ...logoB, mode: 'original' })}
                                                                className={`px-3 py-1 font-black text-[9px] border ${logo.mode === 'original' ? (isLightMode ? 'bg-gray-900 text-white border-gray-900' : 'bg-zinc-50 text-black border-zinc-50') : (isLightMode ? 'text-gray-400 border-gray-100 hover:text-gray-900' : 'text-zinc-600 border-zinc-900 hover:text-white')}`}
                                                            >
                                                                VERSION DE BASE
                                                            </button>
                                                            <button
                                                                onClick={() => logo.id === 'A' ? setLogoA({ ...logoA, mode: 'remastered' }) : setLogoB({ ...logoB, mode: 'remastered' })}
                                                                disabled={!logo.remastered}
                                                                className={`px-3 py-1 font-black text-[9px] border ${logo.mode === 'remastered' ? 'bg-orange-600 text-black border-orange-600' : 'text-zinc-600 border-zinc-900 hover:text-white'} ${!logo.remastered ? 'opacity-20' : ''}`}
                                                            >
                                                                REFONTE INTELLIGENTE
                                                            </button>
                                                            <button
                                                                onClick={() => logo.id === 'A' ? setLogoA({ ...logoA, mode: 'adapted' }) : setLogoB({ ...logoB, mode: 'adapted' })}
                                                                className={`px-3 py-1 font-black text-[9px] border ${logo.mode === 'adapted' ? (isLightMode ? 'bg-gray-900 text-white border-gray-900' : 'bg-zinc-50 text-black border-zinc-50') : (isLightMode ? 'text-gray-400 border-gray-100 hover:text-gray-900' : 'text-zinc-600 border-zinc-900 hover:text-white')}`}
                                                            >
                                                                BLANC V24
                                                            </button>
                                                            {logo.id === 'B' && logoA.original && (
                                                                <button
                                                                    onClick={() => setShowCropModal(true)}
                                                                    className={`px-3 py-1 font-black text-[9px] border border-orange-600 text-orange-600 hover:bg-orange-600 hover:text-black transition-all flex items-center gap-1`}
                                                                >
                                                                    <Crop size={10} /> ROGNER / GOMMER
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className={`aspect-video border flex items-center justify-center p-4 overflow-hidden relative group checkerboard border-zinc-300`}>
                                                {isAnalyzing && <div className="animate-scan" />}
                                                {logo.original ? (
                                                    <>
                                                        <img 
                                                            src={logo.mode === 'remastered' ? (logo.remastered || logo.adapted!) : (logo.mode === 'original' ? logo.original! : logo.adapted!)} 
                                                            className="max-w-full max-h-full object-contain" 
                                                        />
                                                    </>
                                                ) : (
                                                    <div className="w-full h-full flex flex-col items-center justify-center gap-3">
                                                        <button
                                                            onClick={() => {
                                                                const input = document.createElement('input');
                                                                input.type = 'file';
                                                                input.accept = 'image/*';
                                                                input.onchange = (e) => {
                                                                    const file = (e.target as HTMLInputElement).files?.[0];
                                                                    if (file) handleUpload(file, logo.id);
                                                                };
                                                                input.click();
                                                            }}
                                                            className="flex flex-col items-center justify-center gap-2 hover:bg-orange-600/5 transition-all text-zinc-800 hover:text-orange-600 p-4"
                                                        >
                                                            <Upload size={28} />
                                                            <span className="text-[8px] font-black uppercase tracking-wider opacity-60">Importer</span>
                                                        </button>
                                                        {logo.id === 'B' && logoA.original && (
                                                            <button
                                                                onClick={() => setShowCropModal(true)}
                                                                className="flex items-center gap-2 px-4 py-2 bg-orange-600/10 hover:bg-orange-600 text-orange-600 hover:text-black font-black text-[9px] uppercase italic tracking-tighter transition-all border border-orange-600/30"
                                                            >
                                                                <Crop size={14} /> Rogner depuis Logo A
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {logo.original && (
                                                <div className="grid grid-cols-2 gap-2 pt-2">
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); handleAiRemaster(logo.id, 'white'); }}
                                                        className="py-3 bg-orange-600 text-black font-black text-[9px] uppercase italic tracking-tighter hover:bg-white hover:text-black transition-all shadow-xl flex items-center justify-center gap-1.5 rounded-lg border border-orange-600"
                                                        title="Créer une refonte vectorielle haute précision en BLANC PUR"
                                                    >
                                                        <Wand2 size={12} /> REFONTE EN BLANC
                                                    </button>
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); handleAiRemaster(logo.id, 'color'); }}
                                                        className={`py-3 font-black text-[9px] uppercase italic tracking-tighter transition-all shadow-xl flex items-center justify-center gap-1.5 rounded-lg border ${isLightMode ? 'bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200' : 'bg-zinc-900 text-zinc-200 border-zinc-800 hover:bg-zinc-800'}`}
                                                        title="Créer une refonte vectorielle nettoyée en COULEURS D'ORIGINE"
                                                    >
                                                        <Wand2 size={12} /> REFONTE COULEUR
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                <div className={`${isLightMode ? 'bg-white border-gray-200' : 'bg-zinc-950 border-zinc-900'} border p-8 space-y-12 shadow-2xl`}>
                                    <div className="space-y-8">
                                        <div className={`flex flex-col md:flex-row justify-between md:items-center border-b ${isLightMode ? 'border-gray-100' : 'border-white/5'} pb-6 gap-6`}>
                                            <div className="flex items-center gap-3 text-orange-600 font-black text-xs tracking-widest uppercase">
                                                <Layout size={18} /> Sélection des Gabarits
                                            </div>
                                            <div className="flex flex-wrap gap-6 items-center">
                                                <div className="flex flex-col gap-2">
                                                    <span className={`text-[8px] font-bold uppercase italic ${isLightMode ? 'text-gray-400' : 'text-zinc-600'}`}>Taille Coeur (VUE FACE)</span>
                                                    <input type="range" min="0.08" max="0.80" step="0.01" value={logoScaleFront} onChange={e => setLogoScaleFront(parseFloat(e.target.value))} className={`w-32 accent-orange-600 h-1 rounded-lg appearance-none cursor-pointer ${isLightMode ? 'bg-gray-200' : 'bg-zinc-900'}`} />
                                                </div>
                                                <div className="flex flex-col gap-2">
                                                    <span className={`text-[8px] font-bold uppercase italic ${isLightMode ? 'text-gray-400' : 'text-zinc-600'}`}>Taille Dos (VUE DOS)</span>
                                                    <input type="range" min="0.15" max="0.80" step="0.01" value={logoScaleBack} onChange={e => setLogoScaleBack(parseFloat(e.target.value))} className={`w-32 accent-orange-600 h-1 rounded-lg appearance-none cursor-pointer ${isLightMode ? 'bg-gray-200' : 'bg-zinc-900'}`} />
                                                </div>
                                                <div className="flex flex-col gap-1">
                                                    <span className={`text-[8px] font-bold uppercase italic ${isLightMode ? 'text-gray-400' : 'text-zinc-600'}`}>Couleur Logo Général</span>
                                                    <div className={`flex border p-0.5 rounded-md ${isLightMode ? 'bg-gray-100 border-gray-200' : 'bg-black border-zinc-800'}`}>
                                                        <button
                                                            onClick={() => changeGlobalLogoColor('white')}
                                                            className={`px-2.5 py-0.5 font-black text-[8px] uppercase rounded transition-all ${globalLogoColorMode === 'white' ? 'bg-white text-black shadow' : 'text-zinc-500 hover:text-zinc-200'}`}
                                                            title="Appliquer le logo Blanc à tous les vêtements"
                                                        >
                                                            Blanc
                                                        </button>
                                                        <button
                                                            onClick={() => changeGlobalLogoColor('black')}
                                                            className={`px-2.5 py-0.5 font-black text-[8px] uppercase rounded transition-all ${globalLogoColorMode === 'black' ? 'bg-zinc-800 text-white border border-zinc-700 shadow' : 'text-zinc-500 hover:text-zinc-200'}`}
                                                            title="Appliquer le logo Noir à tous les vêtements"
                                                        >
                                                            Noir
                                                        </button>
                                                        <button
                                                            onClick={() => changeGlobalLogoColor('original')}
                                                            className={`px-2.5 py-0.5 font-black text-[8px] uppercase rounded transition-all ${globalLogoColorMode === 'original' ? 'bg-orange-600 text-black shadow' : 'text-zinc-500 hover:text-zinc-200'}`}
                                                            title="Conserver la couleur d'origine pour tous"
                                                        >
                                                            Couleur
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                                            {mockups.map((p, idx) => (
                                                <div key={p.id} className="space-y-3">
                                                    <div 
                                                        onClick={() => {
                                                            const updated = [...mockups];
                                                            updated[idx].selected = !updated[idx].selected;
                                                            setMockups(updated);
                                                        }}
                                                        className={`aspect-square border overflow-hidden relative shadow-inner group cursor-pointer ${isLightMode ? 'bg-white border-gray-100' : 'bg-[#020202] border-white/5'} ${!p.selected ? 'opacity-40 grayscale' : ''}`}
                                                    >
                                                        <img src={p.mechanical || p.base} className="w-full h-full object-contain" />
                                                        
                                                        {/* CHECKBOX */}
                                                        <div className={`absolute top-2 left-2 w-5 h-5 border flex items-center justify-center transition-all ${p.selected ? 'bg-orange-600 border-orange-600 text-black shadow-[0_0_10px_rgba(234,88,12,0.4)]' : 'bg-black/50 border-white/20 text-white/20'}`}>
                                                            {p.selected && <Check size={14} strokeWidth={4} />}
                                                        </div>

                                                        <div className={`absolute bottom-2 left-2 px-2 py-1 font-black text-[6px] tracking-widest uppercase ${isLightMode ? 'bg-gray-100 text-gray-400' : 'bg-black/80 text-white'}`}>{p.title}</div>
                                                    </div>
                                                    <div className={`flex border p-1 ${isLightMode ? 'bg-gray-50 border-gray-100' : 'bg-black border-zinc-900'}`}>
                                                        <button
                                                            onClick={() => setLogoPlacements({ ...logoPlacements, [p.id]: 'A' })}
                                                            className={`flex-1 py-1 font-black text-[8px] ${logoPlacements[p.id] === 'A' ? 'bg-orange-600 text-black' : 'text-zinc-600 hover:text-zinc-300'}`}
                                                        >
                                                            LOGO A
                                                        </button>
                                                        <button
                                                            disabled={!logoB.original}
                                                            onClick={() => setLogoPlacements({ ...logoPlacements, [p.id]: 'B' })}
                                                            className={`flex-1 py-1 font-black text-[8px] ${logoPlacements[p.id] === 'B' ? 'bg-orange-600 text-black' : 'text-zinc-600 hover:text-zinc-300'} ${!logoB.original ? 'opacity-20 cursor-not-allowed' : ''}`}
                                                        >
                                                            LOGO B
                                                        </button>
                                                    </div>
                                                    <div className={`flex border mt-1 p-0.5 ${isLightMode ? 'bg-gray-50 border-gray-100' : 'bg-black border-zinc-900'}`}>
                                                        <button
                                                            onClick={() => setLogoColorModes(prev => ({ ...prev, [p.id]: 'white' }))}
                                                            className={`flex-1 py-1 font-extrabold text-[7px] uppercase transition-all ${logoColorModes[p.id] === 'white' ? 'bg-white text-black font-black' : 'text-zinc-500 hover:text-zinc-300'}`}
                                                            title="Transformer le logo en Blanc"
                                                        >
                                                            Blanc
                                                        </button>
                                                        <button
                                                            onClick={() => setLogoColorModes(prev => ({ ...prev, [p.id]: 'black' }))}
                                                            className={`flex-1 py-1 font-extrabold text-[7px] uppercase transition-all ${logoColorModes[p.id] === 'black' ? 'bg-zinc-800 text-white border border-zinc-700 font-black' : 'text-zinc-500 hover:text-zinc-300'}`}
                                                            title="Transformer le logo en Noir"
                                                        >
                                                            Noir
                                                        </button>
                                                        <button
                                                            onClick={() => setLogoColorModes(prev => ({ ...prev, [p.id]: 'original' }))}
                                                            className={`flex-1 py-1 font-extrabold text-[7px] uppercase transition-all ${(!logoColorModes[p.id] || logoColorModes[p.id] === 'original') ? 'bg-orange-600 text-black font-black' : 'text-zinc-500 hover:text-zinc-300'}`}
                                                            title="Garder la couleur d'origine"
                                                        >
                                                            Couleur
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="pt-8 border-t border-white/5 space-y-6">
                                    <div className="flex flex-col gap-4">
                                        <button 
                                            onClick={startSimulation}
                                            className="group w-full py-8 bg-orange-600 text-black font-black text-2xl uppercase italic tracking-tighter hover:bg-white hover:text-black transition-all shadow-[8px_8px_0_rgba(234,88,12,0.2)] flex items-center justify-center gap-4"
                                        >
                                            Générer les images <Zap size={24} className="group-hover:scale-125 transition-transform" />
                                        </button>
                                    </div>
                                </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {state === 'SALES_AUDIT' && (
                    <div className={`min-h-screen ${isLightMode ? 'bg-gray-50 text-gray-900' : 'bg-[#020202] text-zinc-100'} font-sans py-20 px-6 animate-reveal`}>
                        <div className="max-w-4xl mx-auto space-y-24">
                            <header className="space-y-6">
                                <h1 className="text-5xl md:text-7xl font-black italic tracking-tighter leading-[0.9] uppercase">
                                    Audit Stratégique pour <span className="text-orange-600">{userData.companyName || "votre entreprise"}</span>
                                </h1>
                            </header>

                            <footer className="text-center pt-12">
                                <button 
                                    onClick={handleContinueToSimulation}
                                    className="group w-full max-w-xl py-10 bg-orange-600 text-black font-black text-3xl uppercase italic tracking-tighter hover:bg-white hover:text-black transition-all shadow-[10px_10px_0_rgba(234,88,12,0.2)] flex items-center justify-center gap-4"
                                >
                                    Accéder à mon portail démo <ArrowRight size={32} className="group-hover:translate-x-2 transition-transform" />
                                </button>
                            </footer>
                        </div>
                    </div>
                )}

                {(state === 'AUDIT' || state === 'RESULT') && (
                    <div id="simulation-results" className="animate-reveal max-w-7xl mx-auto space-y-12 scroll-mt-24">
                        {/* IDENTITY SWITCHER BAR (HUB ONLY) */}
                        {state === 'RESULT' && (logoA.remastered || logoB.remastered) && (
                            <div className={`p-4 border flex flex-col md:flex-row items-center justify-between gap-6 ${isLightMode ? 'bg-white border-gray-100 shadow-xl' : 'bg-zinc-950 border-zinc-900 shadow-2xl'}`}>
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-orange-600 flex items-center justify-center font-black text-black text-xl shadow-[4px_4px_0_white] shrink-0">V24</div>
                                    <div>
                                        <p className="text-[10px] font-black tracking-widest text-orange-600 uppercase">Proposition d'Identité</p>
                                        <p className={`text-sm font-black italic uppercase ${isLightMode ? 'text-gray-900' : 'text-zinc-100'}`}>Basculez entre les versions</p>
                                    </div>
                                </div>
                                <div className={`flex p-1 border ${isLightMode ? 'bg-gray-50 border-gray-100' : 'bg-black border-white/5'} rounded-none`}>
                                    <button 
                                        onClick={() => {
                                            if (logoA.remastered) setLogoA(prev => ({ ...prev, mode: 'adapted' }));
                                            if (logoB.remastered) setLogoB(prev => ({ ...prev, mode: 'adapted' }));
                                        }}
                                        className={`px-8 py-3 font-black text-[10px] tracking-[0.2em] uppercase transition-all ${logoA.mode !== 'remastered' && logoB.mode !== 'remastered' ? 'bg-orange-600 text-black shadow-lg' : 'text-zinc-500 hover:text-white'}`}
                                    >
                                        1. Conformité (Défaut)
                                    </button>
                                    <button 
                                        onClick={() => {
                                            if (logoA.remastered) setLogoA(prev => ({ ...prev, mode: 'remastered' }));
                                            if (logoB.remastered) setLogoB(prev => ({ ...prev, mode: 'remastered' }));
                                        }}
                                        className={`px-8 py-3 font-black text-[10px] tracking-[0.2em] uppercase transition-all ${logoA.mode === 'remastered' || logoB.mode === 'remastered' ? 'bg-orange-600 text-black shadow-lg' : 'text-zinc-500 hover:text-white'}`}
                                    >
                                        2. Autorité (Refonte)
                                    </button>
                                </div>
                                <div className="hidden lg:flex items-center gap-2 text-zinc-500 font-bold text-[9px] uppercase tracking-widest italic">
                                    <Info size={14} /> La version "Autorité" optimise votre impact visuel.
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                        <div className="lg:col-span-8 flex flex-col items-center">
                            <div className={`relative aspect-square w-full max-w-[450px] border overflow-hidden shadow-2xl group cursor-default ${isLightMode ? 'bg-white border-gray-100' : 'bg-zinc-950/50 border-zinc-900'}`}>
                                 {(() => {
                                    const m = mockups[activeMockupIndex];
                                    const slot = logoPlacements[m?.id] || 'A';
                                    const logo = slot === 'A' ? logoA : logoB;
                                    const displayAi = logo.mode === 'remastered' ? (m?.aiRemastered || m?.ai) : m?.ai;
                                    return (
                                        <img src={displayAi || m?.mechanical || m?.base || ''} className="w-full h-full object-cover animate-reveal-image" />
                                    );
                                })()}
                            </div>
                            <div className="w-full p-4 text-center">
                                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                                    Cliquez sur un gabarit pour voir les détails
                                </p>
                            </div>

                        </div>

                        <div className="lg:col-span-4 flex flex-col gap-8">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {mockups.filter(m => m.selected).map((m) => {
                                    const slot = logoPlacements[m.id] || 'A';
                                    const logo = slot === 'A' ? logoA : logoB;
                                    const displayAi = logo.mode === 'remastered' ? (m.aiRemastered || m.ai) : m.ai;
                                    return (
                                        <div 
                                            key={m.id} 
                                            onClick={() => {
                                                const realIndex = mockups.findIndex(x => x.id === m.id);
                                                setActiveMockupIndex(realIndex);
                                            }} 
                                            className={`cursor-pointer flex flex-col gap-2 p-3 border transition-all relative group ${mockups[activeMockupIndex]?.id === m.id ? (isLightMode ? 'border-orange-600 bg-white shadow-xl' : 'border-orange-600 bg-zinc-950 shadow-[0_0_20px_rgba(234,88,12,0.15)]') : (isLightMode ? 'border-gray-100 opacity-60 hover:opacity-100 hover:border-gray-300' : 'border-zinc-900 opacity-60 hover:opacity-100 hover:border-zinc-700')}`}
                                        >    <div className={`aspect-square w-full relative overflow-hidden ring-1 ${isLightMode ? 'ring-gray-100 bg-gray-50' : 'ring-white/10 bg-black'}`}>
                                                 <img
                                                     src={displayAi || m.mechanical || m.base}
                                                     className="w-full h-full object-contain transition-transform group-hover:scale-105"
                                                     alt={m.title}
                                                 />

                                             {m.isGenerating && (
                                                 <div className="absolute inset-0 bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
                                                     <div className="relative w-full h-full overflow-hidden flex items-center justify-center">
                                                         <img src={m.mechanical || m.base} className="w-full h-full object-contain opacity-40 brightness-50" />
                                                     </div>
                                                     <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                         <Loader2 className="text-orange-600 animate-spin mb-2" size={32} />
                                                         <span className="text-[10px] font-black tracking-widest text-orange-600 animate-pulse uppercase">Traitement HD...</span>
                                                     </div>
                                                 </div>
                                             )}

                                             {!m.isGenerating && (
                                                 <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-all flex gap-1">
                                                     <button
                                                         onClick={(e) => { e.stopPropagation(); startSequentialPipeline(undefined, m.id); }}
                                                         className="p-2 bg-orange-600 text-black hover:bg-white transition-all shadow-xl"
                                                         title="Régénérer"
                                                     >
                                                         <RefreshCcw size={14} />
                                                     </button>
                                                 </div>
                                             )}
                                        </div>
                                        <div className="flex justify-between items-center px-1">
                                            <div className="text-[8px] font-black uppercase italic tracking-tighter text-zinc-500">{m.title}</div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                        <div className="mt-8 flex flex-col items-center gap-4 lg:col-span-12">
                            <p className="text-zinc-600 font-bold text-[9px] tracking-[0.2em] uppercase">Solution Propulsée par Signaid</p>
                            <button 
                                onClick={(e) => { 
                                    e.stopPropagation(); 
                                    const uidParam = new URLSearchParams(window.location.search).get('uid');
                                    const updateAndRedirect = async () => {
                                        if (uidParam) {
                                            const logoSrc = logoA.mode === 'remastered' 
                                                ? (logoA.remastered || logoA.adapted || logoA.original) 
                                                : (logoA.mode === 'original'
                                                    ? (logoA.original || logoA.adapted)
                                                    : (logoA.adapted || logoA.original));
                                            try {
                                                const config = await getStoredConfig(uidParam);
                                                if (config) {
                                                    if (logoSrc) {
                                                        config.logoUrl = logoSrc;
                                                    }
                                                    if (sessionId) {
                                                        config.generatedKey = sessionId;
                                                        config.actuationKey = sessionId;
                                                    }
                                                    config.merchUrl = `${window.location.origin}/portail-shop?uid=${uidParam}`;
                                                    await saveStoredConfig(config, uidParam);
                                                    console.log("Vault Architect: Vitrine CMS updated with remastered logo & products link.");
                                                }
                                            } catch (err) {
                                                console.error("Vault Architect: Failed to update vitrine config:", err);
                                            }
                                        }
                                        const targetSid = uidParam || sessionId || previewId;
                                        const targetShopUrl = targetSid ? `/portail-shop?audit=${targetSid}` : '/portail-shop';
                                        window.open(targetShopUrl, '_blank');
                                    };
                                    updateAndRedirect(); 
                                }}
                                disabled={isAccessDisabled}
                                className={`px-10 py-4 font-black text-xs uppercase italic tracking-tighter transition-all shadow-xl ${isAccessDisabled ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed opacity-50' : 'bg-black text-white hover:bg-orange-600 cursor-pointer'}`}
                            >
                                {isAnyMockupGenerating 
                                    ? "Génération en cours..." 
                                    : (!areAllSelectedMockupsGenerated 
                                        ? "En attente des images..." 
                                        : "Accéder à ma page produit")}
                            </button>
                            {previewId && (
                                <div className="mt-6 p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg flex flex-col md:flex-row items-center justify-between gap-4 w-full max-w-xl mx-auto text-left">
                                    <div className="flex-1">
                                        <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest">Lien de partage prospect (sans compte) :</p>
                                        <p className="text-xs text-zinc-400 font-mono select-all truncate max-w-xs md:max-w-sm mt-1">{`${window.location.origin}/preview/${previewId}`}</p>
                                    </div>
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(`${window.location.origin}/preview/${previewId}`);
                                            alert("Lien de partage copié dans le presse-papiers !");
                                        }}
                                        className="px-4 py-2 bg-orange-600 hover:bg-white text-black font-black text-xs uppercase tracking-tight transition-all shrink-0"
                                    >
                                        Copier le lien
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                )}
                {state === 'INBOUND_WAITING' && (
                    <div className="min-h-screen flex items-center justify-center bg-black p-8 text-center animate-reveal">
                        <div className="max-w-2xl space-y-12">
                            <div className="flex justify-center">
                                <div className="w-24 h-24 bg-orange-600 flex items-center justify-center font-black text-black text-5xl shadow-[10px_10px_0_white]">S</div>
                            </div>
                            <div className="space-y-6">
                                <h1 className="text-5xl md:text-7xl font-black italic tracking-tighter leading-none uppercase">
                                    Audit <span className="text-orange-600">Transmis</span>
                                </h1>
                                <p className="text-zinc-400 font-bold text-lg uppercase tracking-widest leading-relaxed">
                                    Votre simulation HD est en cours de validation finale par nos experts. 
                                    <br/><br/>
                                    <span className="text-white">Vous recevrez votre Hub personnalisé par email</span> avec nos recommandations stratégiques sous peu.
                                </p>
                            </div>
                            <div className="pt-8 border-t border-white/10">
                                <p className="text-zinc-600 font-black text-[10px] uppercase tracking-[0.5em]">Signaid V24 • L'Autorité Visuelle des Leaders</p>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {showAuthModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/98 backdrop-blur-3xl">
                    <form onClick={e => e.stopPropagation()} onSubmit={handleAuthSubmit} className={`${isLightMode ? 'bg-white border-gray-200 text-gray-900' : 'bg-black border-zinc-900 text-zinc-100'} border p-12 w-full max-w-2xl space-y-12 animate-reveal relative shadow-2xl`}>
                        <button type="button" onClick={() => setShowAuthModal(false)} className={`absolute top-8 right-8 ${isLightMode ? 'text-gray-300' : 'text-zinc-800'} hover:text-orange-600 transition-colors`}><Layers size={24} className="rotate-45" /></button>
                        <div className="space-y-4">
                            <h2 className="text-4xl font-black italic tracking-tighter uppercase leading-none"><span className="text-orange-600 text-5xl">PROFIL</span> ADMIN</h2>
                            <p className={`text-[10px] font-black tracking-widest uppercase ${isLightMode ? 'text-gray-400' : 'text-zinc-700'}`}>Configurez les paramètres d'autorité de votre portail.</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                            <div className="space-y-8">
                                <div className="space-y-2">
                                    <label className={`text-[9px] font-black uppercase tracking-widest ${isLightMode ? 'text-gray-400' : 'text-zinc-600'}`}>Compte Mail</label>
                                    <input name="email" type="email" defaultValue={userData.email} placeholder="VOTRE EMAIL" required className={`w-full ${isLightMode ? 'bg-gray-50 border-gray-200 text-gray-900' : 'bg-zinc-950 border-zinc-900 text-zinc-100'} border p-4 font-black text-xs outline-none focus:border-orange-600 italic`} />
                                </div>
                                <div className="space-y-2">
                                    <label className={`text-[9px] font-black uppercase tracking-widest ${isLightMode ? 'text-gray-400' : 'text-zinc-600'}`}>Entreprise / Entité</label>
                                    <input name="company" defaultValue={userData.companyName} placeholder="NOM DE L'ENTREPRISE" required className={`w-full ${isLightMode ? 'bg-gray-50 border-gray-200 text-gray-900' : 'bg-zinc-950 border-zinc-900 text-zinc-100'} border p-4 font-black text-xs outline-none focus:border-orange-600 italic`} />
                                </div>
                                <div className="space-y-2">
                                    <label className={`text-[9px] font-black uppercase tracking-widest ${isLightMode ? 'text-gray-400' : 'text-zinc-600'}`}>Secteur (Définit les mannequins)</label>
                                    <select name="activity" defaultValue={userData.activity} className={`w-full ${isLightMode ? 'bg-gray-50 border-gray-200 text-gray-900' : 'bg-zinc-950 border-zinc-900 text-zinc-100'} border p-4 font-black text-xs outline-none focus:border-orange-600 italic appearance-none cursor-pointer`}>
                                        <option value="AUTRE">AUTRE / GÉNÉRIQUE</option>
                                        <option value="BTP">BTP & LOGISTIQUE</option>
                                        <option value="SPORT">SPORT & FITNESS</option>
                                    </select>
                                </div>
                            </div>
                            <div className="space-y-8">
                                <div className="space-y-2">
                                    <label className={`text-[9px] font-black uppercase tracking-widest ${isLightMode ? 'text-gray-400' : 'text-zinc-600'}`}>Contact Téléphonique</label>
                                    <input name="phone" defaultValue={userData.phone} placeholder="TÉLÉPHONE" required className={`w-full ${isLightMode ? 'bg-gray-50 border-gray-200 text-gray-900' : 'bg-zinc-950 border-zinc-900 text-zinc-100'} border p-4 font-black text-xs outline-none focus:border-orange-600 italic`} />
                                </div>
                                <div className="space-y-2">
                                    <label className={`text-[9px] font-black uppercase tracking-widest ${isLightMode ? 'text-gray-400' : 'text-zinc-600'}`}>Site Web / Vitrine</label>
                                    <input name="website" defaultValue={userData.website} placeholder="WWW.VOTRESITE.COM" required className={`w-full ${isLightMode ? 'bg-gray-50 border-gray-200 text-gray-900' : 'bg-zinc-950 border-zinc-900 text-zinc-100'} border p-4 font-black text-xs outline-none focus:border-orange-600 italic`} />
                                </div>
                                <div className="space-y-2">
                                    <label className={`text-[9px] font-black uppercase tracking-widest ${isLightMode ? 'text-gray-400' : 'text-zinc-600'}`}>Immatriculation TVA</label>
                                    <input name="tva" defaultValue={userData.tva} placeholder="N° TVA" className={`w-full ${isLightMode ? 'bg-gray-50 border-gray-200 text-gray-900' : 'bg-zinc-950 border-zinc-900 text-zinc-100'} border p-4 font-black text-xs outline-none focus:border-orange-600 italic`} />
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <input 
                                id="stayLoggedIn"
                                type="checkbox" 
                                checked={stayLoggedIn}
                                onChange={(e) => setStayLoggedIn(e.target.checked)}
                                className="w-5 h-5 accent-orange-600 cursor-pointer"
                            />
                            <label htmlFor="stayLoggedIn" className={`text-[10px] font-black uppercase tracking-widest cursor-pointer ${isLightMode ? 'text-gray-600' : 'text-zinc-400'}`}>Rester connecté sur cet appareil</label>
                        </div>
                        <div className="flex flex-col gap-4">
                            <button type="submit" className={`w-full py-8 font-black text-3xl transition-all uppercase italic shadow-2xl flex items-center justify-center gap-4 ${isLightMode ? 'bg-gray-900 text-white hover:bg-orange-600 hover:text-black' : 'bg-zinc-50 text-black hover:bg-orange-600 hover:text-black'}`}>
                                Sauvegarder & Ouvrir le Portail Audit <Zap size={24} />
                            </button>
                            <button type="button" onClick={() => setShowAuthModal(false)} className={`w-full py-4 border font-black text-[10px] tracking-widest uppercase italic transition-all ${isLightMode ? 'border-gray-200 text-gray-400 hover:bg-gray-50' : 'border-zinc-900 text-zinc-500 hover:bg-zinc-950'}`}>Annuler / Fermer</button>
                        </div>
                    </form>
                </div>
            )}

            {syncLoader && syncLoader.active && (
                <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black/98 backdrop-blur-3xl animate-reveal p-6 text-zinc-100 font-sans select-none overflow-y-auto">
                    {/* Ambient light glow */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-orange-600/10 rounded-full blur-[140px] pointer-events-none" />
                    
                    <div className="w-full max-w-5xl flex flex-col items-center space-y-10 relative z-10">
                        {/* Header Status */}
                        <div className="flex flex-col items-center gap-3 text-center">
                            <div className="px-4 py-1.5 bg-orange-600/10 border border-orange-600/30 text-orange-500 rounded-full text-[9px] font-black tracking-[0.4em] uppercase animate-pulse flex items-center gap-2">
                                <Sparkles size={10} className="animate-spin" /> Synchronisation Système
                            </div>
                            <h2 className="text-2xl md:text-3xl font-black italic tracking-tighter text-white uppercase mt-1">
                                {syncLoader.step}
                            </h2>
                        </div>

                        {/* HIGH-TECH VISUAL SYNC AREA */}
                        <div className="w-full flex flex-col xl:flex-row items-center justify-center gap-6 py-6">
                            
                            {/* Logo Source Node */}
                            <div className="flex flex-col items-center gap-3 shrink-0">
                                <div className="text-[8px] font-bold text-zinc-500 tracking-widest uppercase">LOGO DÉTECTÉ</div>
                                <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-zinc-800 bg-zinc-950 flex items-center justify-center p-3 relative overflow-hidden checkerboard">
                                    {syncLoader.logoUrl ? (
                                        <img src={syncLoader.logoUrl} className="max-w-full max-h-full object-contain animate-reveal" alt="Source Logo" />
                                    ) : (
                                        <Loader2 className="text-zinc-600 animate-spin" size={24} />
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                                </div>
                            </div>

                            {/* Futuristic Sync Pipeline Connector */}
                            <div className="flex flex-row xl:flex-col items-center justify-center gap-2 xl:rotate-0 rotate-90 shrink-0">
                                <div className="w-12 h-0.5 bg-gradient-to-r from-orange-600/20 via-orange-600 to-orange-600/20 relative overflow-hidden rounded-full">
                                    <div className="absolute top-0 left-0 h-full w-4 bg-white blur-[2px] animate-[ping_1.5s_infinite]" />
                                </div>
                                <div className="text-[10px] font-black text-orange-500 animate-pulse">
                                    {syncLoader.phase >= 2 ? "➔" : "⏳"}
                                </div>
                            </div>

                            {/* Double Mockups Sync Targets */}
                            <div className="flex flex-col md:flex-row items-center gap-6 w-full max-w-3xl justify-center">
                                
                                {/* Black Matte Business Card Mockup being synced */}
                                <div className="flex flex-col items-center gap-3 w-full max-w-[320px]">
                                    <div className="text-[8px] font-bold text-zinc-500 tracking-widest uppercase">GABARIT CARTE FOND NOIR</div>
                                    <div className="w-full aspect-[85/55] bg-[#111111] border-2 border-orange-600/40 rounded-xl p-4 shadow-[0_15px_30px_rgba(0,0,0,0.8)] relative overflow-hidden flex flex-col justify-between select-none">
                                        
                                        {/* Scan laser line */}
                                        <div className="absolute left-0 w-full h-[3px] bg-gradient-to-r from-transparent via-orange-600 to-transparent shadow-[0_0_8px_#ea580c] pointer-events-none animate-[scanLaser_2.5s_infinite_linear]" />
                                        
                                        {/* Glassmorphism gradient shine */}
                                        <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/0 pointer-events-none" />
                                        
                                        {/* Card Header (Company Name & Sector) */}
                                        <div className="space-y-1 relative z-10">
                                            {syncLoader.companyName ? (
                                                <div className="text-white font-black text-xs tracking-wide uppercase truncate animate-reveal">
                                                    {syncLoader.companyName}
                                                </div>
                                            ) : (
                                                <div className="h-3 w-28 bg-zinc-800 rounded animate-pulse" />
                                            )}
                                            {syncLoader.phase >= 2 ? (
                                                <div className="text-orange-500 font-bold text-[6px] tracking-widest uppercase italic animate-reveal">
                                                    {userData.activity || "SECTEUR D'ACTIVITÉ"}
                                                </div>
                                            ) : (
                                                <div className="h-2 w-16 bg-zinc-900 rounded animate-pulse mt-1" />
                                            )}
                                        </div>

                                        {/* Card Body & Sync Logo Placeholder */}
                                        <div className="flex items-end justify-between relative z-10 mt-4">
                                            {/* Contact details skeletons */}
                                            <div className="space-y-1.5 w-1/2 text-left">
                                                {syncLoader.phase >= 3 ? (
                                                    <>
                                                        <div className="flex items-center gap-1.5 opacity-60">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-orange-600" />
                                                            <div className="text-[5px] font-mono text-zinc-400 truncate max-w-[90px]">{userData.email || "contact@entreprise.com"}</div>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 opacity-60">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
                                                            <div className="text-[5px] font-mono text-zinc-500 truncate max-w-[90px]">{userData.website || "www.entreprise.com"}</div>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <>
                                                        <div className="h-1.5 w-16 bg-zinc-900 rounded animate-pulse" />
                                                        <div className="h-1.5 w-20 bg-zinc-900 rounded animate-pulse" />
                                                    </>
                                                )}
                                            </div>

                                            {/* Dynamic Embossed Logo */}
                                            <div className="w-12 h-12 rounded-lg bg-zinc-950 border border-white/5 flex items-center justify-center p-1.5 relative overflow-hidden shadow-inner">
                                                {syncLoader.phase >= 3 && syncLoader.logoUrl ? (
                                                    <img src={syncLoader.logoUrl} className="max-w-full max-h-full object-contain filter invert opacity-80 animate-reveal" alt="Card Logo" />
                                                ) : (
                                                    <Layers className="text-zinc-800 animate-pulse" size={16} />
                                                )}
                                                {/* Glow scanner circle */}
                                                {syncLoader.phase === 3 && (
                                                    <div className="absolute inset-0 border border-orange-600/50 rounded-lg animate-ping" />
                                                )}
                                            </div>
                                        </div>

                                        {/* Tiny card footer */}
                                        <div className="flex justify-between items-center text-[4px] text-zinc-600 font-mono tracking-widest pt-2 border-t border-white/5 mt-1 relative z-10">
                                            <span>SIGNAID V24 SECURE</span>
                                            <span>RECTO/VERSO PROJECTION</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Intermediate small separator on desktop */}
                                <div className="hidden md:flex flex-col items-center justify-center text-zinc-700 shrink-0 select-none">
                                    <div className="w-px h-16 bg-zinc-800" />
                                </div>

                                {/* Textile / Clothing Mockup being synced */}
                                <div className="flex flex-col items-center gap-3 w-full max-w-[320px]">
                                    <div className="text-[8px] font-bold text-zinc-500 tracking-widest uppercase">GABARIT TEXTILE PRO TECHNIQUE</div>
                                    <div className="w-full aspect-[85/55] bg-[#111111] border-2 border-orange-600/40 rounded-xl p-4 shadow-[0_15px_30px_rgba(0,0,0,0.8)] relative overflow-hidden flex flex-col justify-between select-none">
                                        
                                        {/* Scan laser line (staggered delay) */}
                                        <div className="absolute left-0 w-full h-[3px] bg-gradient-to-r from-transparent via-orange-600 to-transparent shadow-[0_0_8px_#ea580c] pointer-events-none animate-[scanLaser_2.5s_infinite_linear]" style={{ animationDelay: '1.25s' }} />
                                        
                                        {/* Glassmorphism gradient shine */}
                                        <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/0 pointer-events-none" />
                                        
                                        {/* Card Header (Garment Type & Sector) */}
                                        <div className="space-y-1 relative z-10 flex justify-between items-start text-left">
                                            <div>
                                                <div className="text-white font-black text-[10px] tracking-wide uppercase truncate max-w-[120px] animate-reveal">
                                                    ÉQUIPEMENT BATI-PRO V24
                                                </div>
                                                {syncLoader.phase >= 2 ? (
                                                    <div className="text-orange-500 font-bold text-[6px] tracking-widest uppercase italic animate-reveal">
                                                        MARQUAGE AUTOMATIQUE DTF
                                                    </div>
                                                ) : (
                                                    <div className="h-2 w-16 bg-zinc-900 rounded animate-pulse mt-1" />
                                                )}
                                            </div>
                                            {syncLoader.phase >= 4 && (
                                                <div className="px-2 py-0.5 bg-orange-600/20 border border-orange-600/40 text-orange-500 text-[5px] font-black tracking-widest rounded-full uppercase animate-pulse">
                                                    RENDU HD PRÊT
                                                </div>
                                            )}
                                        </div>

                                        {/* Card Body with garment silhouette / image & chest logo projection */}
                                        <div className="flex items-center justify-between relative z-10 mt-2 h-16">
                                            <div className="w-1/2 flex items-center justify-center h-full relative">
                                                {syncLoader.phase >= 2 ? (
                                                    <div className="relative w-14 h-14 flex items-center justify-center">
                                                        {/* Garment silhouette */}
                                                        <Shirt size={44} className={`text-zinc-600 ${syncLoader.phase === 2 ? 'opacity-40 animate-pulse' : 'opacity-85'} transition-opacity`} />
                                                        
                                                        {/* Chest Logo Projection (Inverted logo for black fabric) */}
                                                        {syncLoader.phase >= 4 && syncLoader.logoUrl && (
                                                            <div className="absolute top-[28%] left-[45%] -translate-x-1/2 w-4 h-4 flex items-center justify-center bg-black/40 p-0.5 rounded-sm border border-white/10 shadow-lg animate-reveal">
                                                                <img 
                                                                    src={syncLoader.logoUrl} 
                                                                    className="max-w-full max-h-full object-contain filter invert opacity-90" 
                                                                    alt="Chest Logo" 
                                                                />
                                                            </div>
                                                        )}
                                                        {/* Scanner ring */}
                                                        {syncLoader.phase === 3 && (
                                                            <div className="absolute inset-0 border border-orange-500/30 rounded-full animate-ping" />
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="w-12 h-12 rounded-full border border-dashed border-zinc-800 flex items-center justify-center animate-pulse">
                                                        <Sparkles size={16} className="text-zinc-700" />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Textile specifications */}
                                            <div className="space-y-1 w-1/2 pl-4 text-left">
                                                {syncLoader.phase >= 3 ? (
                                                    <>
                                                        <div className="text-[5px] font-mono text-zinc-400">Emplacement : Cœur & Dos</div>
                                                        <div className="text-[5px] font-mono text-zinc-400">Calibration : DTF Premium</div>
                                                        <div className="text-[5px] font-mono text-zinc-500">Coton peigné 170g</div>
                                                    </>
                                                ) : (
                                                    <>
                                                        <div className="h-1.5 w-16 bg-zinc-900 rounded animate-pulse" />
                                                        <div className="h-1.5 w-12 bg-zinc-900 rounded animate-pulse" />
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        {/* Tiny card footer */}
                                        <div className="flex justify-between items-center text-[4px] text-zinc-600 font-mono tracking-widest pt-2 border-t border-white/5 mt-1 relative z-10">
                                            <span>TEXTILE CALIBRATION</span>
                                            <span>AUTOMATIC PLOTTING</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Steps Checklist */}
                        <div className="w-full bg-zinc-950/80 border border-zinc-900 rounded-2xl p-6 space-y-4 max-w-md shadow-2xl relative">
                            <div className="text-[9px] font-black text-zinc-500 tracking-[0.3em] uppercase border-b border-zinc-900 pb-2">
                                PHASES DE SYNC ET DE CONFORMATION
                            </div>
                            <div className="space-y-3">
                                {[
                                    { p: 1, label: "Initialisation et Lecture Cloud Vault" },
                                    { p: 2, label: "Analyse et Soustraction du Fond Logo" },
                                    { p: 3, label: "Projection Gabarit Carte Fond Noir" },
                                    { p: 4, label: "Calibration Textile & Rendu HD BTP" }
                                ].map((step) => {
                                    const isDone = syncLoader.phase > step.p;
                                    const isActive = syncLoader.phase === step.p;
                                    return (
                                        <div key={step.p} className={`flex items-center justify-between text-xs transition-colors duration-300 ${isActive ? 'text-orange-500 font-bold' : isDone ? 'text-zinc-400' : 'text-zinc-700'}`}>
                                            <div className="flex items-center gap-3">
                                                <div className={`w-5 h-5 rounded-full border flex items-center justify-center font-bold text-[9px] ${
                                                    isDone ? 'bg-orange-600/10 border-orange-600 text-orange-500' :
                                                    isActive ? 'bg-orange-600 text-black border-orange-600 animate-pulse' :
                                                    'border-zinc-800 text-zinc-700'
                                                }`}>
                                                    {isDone ? "✓" : step.p}
                                                </div>
                                                <span className="uppercase tracking-wide">{step.label}</span>
                                            </div>
                                            {isActive && (
                                                <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-ping" />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full max-w-md space-y-2">
                            <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden border border-white/5">
                                <div 
                                    className="h-full bg-orange-600 transition-all duration-700 ease-out"
                                    style={{ width: `${(syncLoader.phase / 4) * 100}%` }}
                                />
                            </div>
                            <div className="flex justify-between text-[8px] font-bold text-zinc-500 tracking-wider">
                                <span>{Math.round((syncLoader.phase / 4) * 100)}% COMPLETÉ</span>
                                <span>DTF / SÉRIGRAPHIE HAUTE-FIDÉLITÉ</span>
                            </div>
                        </div>
                    </div>

                    <style dangerouslySetInnerHTML={{
                        __html: `
                        @keyframes scanLaser {
                            0% { top: 0%; opacity: 0; }
                            10% { opacity: 1; }
                            90% { opacity: 1; }
                            100% { top: 100%; opacity: 0; }
                        }
                    `}} />
                </div>
            )}

            {remasterStep && !syncLoader && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-2xl animate-reveal">
                    <div className="text-center space-y-8 max-w-lg px-8">
                        {/* ANIMATION MAISON BRIQUE PAR BRIQUE */}
                        <div className="relative w-48 h-32 mx-auto mb-8">
                            <svg viewBox="0 0 100 60" className="w-full h-full">
                                {/* Base / Bricks Looping Infinite */}
                                <g className="bricks fill-orange-600/30">
                                    {/* ROW 1 (Bottom) */}
                                    <rect x="10" y="50" width="15" height="8" className="animate-[brick_4s_infinite_0s] opacity-0" />
                                    <rect x="27" y="50" width="15" height="8" className="animate-[brick_4s_infinite_0.2s] opacity-0" />
                                    <rect x="44" y="50" width="15" height="8" className="animate-[brick_4s_infinite_0.4s] opacity-0" />
                                    <rect x="61" y="50" width="15" height="8" className="animate-[brick_4s_infinite_0.6s] opacity-0" />
                                    
                                    {/* ROW 2 */}
                                    <rect x="10" y="40" width="15" height="8" className="animate-[brick_4s_infinite_0.8s] opacity-0" />
                                    <rect x="27" y="40" width="15" height="8" className="animate-[brick_4s_infinite_1.0s] opacity-0" />
                                    <rect x="44" y="40" width="15" height="8" className="animate-[brick_4s_infinite_1.2s] opacity-0" />
                                    <rect x="61" y="40" width="15" height="8" className="animate-[brick_4s_infinite_1.4s] opacity-0" />
                                    
                                    {/* ROW 3 */}
                                    <rect x="10" y="30" width="15" height="8" className="animate-[brick_4s_infinite_1.6s] opacity-0" />
                                    <rect x="27" y="30" width="15" height="8" className="animate-[brick_4s_infinite_1.8s] opacity-0" />
                                    <rect x="44" y="30" width="15" height="8" className="animate-[brick_4s_infinite_2.0s] opacity-0" />
                                    <rect x="61" y="30" width="15" height="8" className="animate-[brick_4s_infinite_2.2s] opacity-0" />
                                    
                                    {/* ROW 4 (Top) */}
                                    <rect x="10" y="20" width="15" height="8" className="animate-[brick_4s_infinite_2.4s] opacity-0" />
                                    <rect x="27" y="20" width="15" height="8" className="animate-[brick_4s_infinite_2.6s] opacity-0" />
                                    <rect x="44" y="20" width="15" height="8" className="animate-[brick_4s_infinite_2.8s] opacity-0" />
                                    <rect x="61" y="20" width="15" height="8" className="animate-[brick_4s_infinite_3.0s] opacity-0" />
                                </g>
                            </svg>
                        </div>

                        <div className="space-y-3">
                            <div className="text-orange-600 font-black text-xs uppercase tracking-[0.4em] animate-pulse">Standardisation Technique en cours</div>
                            <div className="text-3xl font-black italic tracking-tighter text-white uppercase leading-tight min-h-[4rem] flex items-center justify-center">
                                {remasterStep}
                            </div>
                        </div>
                        <div className="w-full bg-zinc-900 h-1 rounded-full overflow-hidden">
                            <div className="h-full bg-orange-600 animate-[progress_16s_cubic-bezier(0.1,0.5,0.1,1)_forwards]"></div>
                        </div>
                        <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest font-mono">
                            Optimisation certifiée pour DTF / Sérigraphie / Broderie
                        </p>
                    </div>
                </div>
            )}

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes progress { from { width: 0%; } to { width: 100%; } }
                @keyframes brick { 
                    0% { opacity: 0; transform: translateY(-20px); } 
                    10% { opacity: 1; transform: translateY(0); } 
                    90% { opacity: 1; transform: translateY(0); } 
                    100% { opacity: 0; transform: translateY(0); } 
                }
                .animate-reveal { animation: reveal 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                .animate-reveal-image { animation: revealImg 1.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                @keyframes reveal { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes revealImg { from { opacity: 0; filter: blur(30px) brightness(0.5); } to { opacity: 1; filter: blur(0) brightness(1); } }
                @keyframes scan { 0% { top: 100%; opacity: 0; } 50% { opacity: 0.5; } 100% { top: 0%; opacity: 0; } }
                .animate-scan { animation: scan 3s infinite linear; }
                .preview-watermark::after {
                    content: "SIGNAID DROIT RÉSERVÉ";
                    position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
                    opacity: ${isLightMode ? '0.05' : '0.15'}; font-size: 2.2rem; font-weight: 900; color: ${isLightMode ? 'black' : 'white'}; transform: rotate(-30deg);
                    pointer-events: none; letter-spacing: 0.2em; z-index: 10;
                }
                body { background-color: #f3f4f6; cursor: crosshair; }
            `}} />

            {/* CROP MODAL */}
            {showCropModal && logoA.original && (() => {
                const CropModal = () => {
                    const containerRef = useRef<HTMLDivElement>(null);
                    const imgRef = useRef<HTMLImageElement>(null);
                    const eraserCanvasRef = useRef<HTMLCanvasElement>(null);
                    const [cropMethod, setCropMethod] = useState<'poly' | 'eraser'>('poly');
                    const [poly, setPoly] = useState<{x: number, y: number}[]>([]);
                    const [dragIdx, setDragIdx] = useState<number | null>(null);

                    // Eraser state
                    const [brushSize, setBrushSize] = useState(24);
                    const [isErasing, setIsErasing] = useState(false);
                    const [cursorPos, setCursorPos] = useState<{x: number, y: number} | null>(null);

                    // New states for persistent edits and background options
                    const [useLogoBAsBase, setUseLogoBAsBase] = useState(true);
                    
                    const activeMode = logoB.original ? logoB.mode : logoA.mode;
                    const defaultBg = (activeMode === 'adapted') ? 'black' : 'white';
                    const [cropBg, setCropBg] = useState<'transparent' | 'white' | 'black'>(defaultBg);

                    const getLogoASrc = () => {
                        if (useLogoBAsBase && logoB.original) {
                            return logoB.mode === 'remastered' ? (logoB.remastered || logoB.adapted!) : (logoB.mode === 'original' ? logoB.original! : logoB.adapted!);
                        }
                        if (logoA.mode === 'remastered') return logoA.remastered || logoA.adapted!;
                        if (logoA.mode === 'original') return logoA.original!;
                        return logoA.adapted!;
                    };

                    const initPoly = () => {
                        if (!imgRef.current || !containerRef.current) return;
                        const rect = imgRef.current.getBoundingClientRect();
                        const contRect = containerRef.current.getBoundingClientRect();
                        const offsetX = rect.left - contRect.left;
                        const offsetY = rect.top - contRect.top;
                        const w = rect.width;
                        const h = rect.height;
                        const insetX = w * 0.1;
                        const insetY = h * 0.1;
                        setPoly([
                            { x: offsetX + insetX, y: offsetY + insetY },
                            { x: offsetX + w - insetX, y: offsetY + insetY },
                            { x: offsetX + w - insetX, y: offsetY + h - insetY },
                            { x: offsetX + insetX, y: offsetY + h - insetY }
                        ]);
                    };

                    const initEraserCanvas = () => {
                        const canvas = eraserCanvasRef.current;
                        const img = imgRef.current;
                        if (!canvas || !img) return;
                        canvas.width = img.naturalWidth;
                        canvas.height = img.naturalHeight;
                        const ctx = canvas.getContext('2d');
                        if (ctx) {
                            ctx.clearRect(0, 0, canvas.width, canvas.height);
                            ctx.drawImage(img, 0, 0);
                        }
                    };

                    const getPos = (e: React.MouseEvent | React.TouchEvent) => {
                        const rect = containerRef.current?.getBoundingClientRect();
                        if (!rect) return { x: 0, y: 0 };
                        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
                        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
                        return { x: clientX - rect.left, y: clientY - rect.top };
                    };

                    // Poly handlers
                    const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
                        if (poly.length !== 4) return;
                        const pos = getPos(e);
                        let closestIdx = -1;
                        let minDist = 40;
                        poly.forEach((p, i) => {
                            const d = Math.hypot(p.x - pos.x, p.y - pos.y);
                            if (d < minDist) { minDist = d; closestIdx = i; }
                        });
                        if (closestIdx !== -1) {
                            e.preventDefault();
                            setDragIdx(closestIdx);
                        }
                    };

                    const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
                        if (dragIdx === null) return;
                        e.preventDefault();
                        const pos = getPos(e);
                        setPoly(prev => {
                            const next = [...prev];
                            next[dragIdx] = pos;
                            return next;
                        });
                    };

                    const handleEnd = () => setDragIdx(null);

                    // Eraser handlers
                    const handleEraserStart = (e: React.MouseEvent | React.TouchEvent) => {
                        const canvas = eraserCanvasRef.current;
                        if (!canvas) return;
                        e.preventDefault();
                        setIsErasing(true);

                        const rect = canvas.getBoundingClientRect();
                        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
                        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
                        const scaleX = canvas.width / rect.width;
                        const scaleY = canvas.height / rect.height;
                        const x = (clientX - rect.left) * scaleX;
                        const y = (clientY - rect.top) * scaleY;

                        const ctx = canvas.getContext('2d');
                        if (ctx) {
                            ctx.beginPath();
                            ctx.globalCompositeOperation = 'destination-out';
                            ctx.lineCap = 'round';
                            ctx.lineJoin = 'round';
                            ctx.lineWidth = brushSize * scaleX;
                            ctx.moveTo(x, y);
                            ctx.lineTo(x, y);
                            ctx.stroke();
                        }
                    };

                    const handleEraserMove = (e: React.MouseEvent | React.TouchEvent) => {
                        const canvas = eraserCanvasRef.current;
                        if (!canvas) return;
                        e.preventDefault();

                        const rect = canvas.getBoundingClientRect();
                        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
                        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
                        
                        // Update cursor preview position
                        setCursorPos({
                            x: clientX - rect.left,
                            y: clientY - rect.top
                        });

                        if (!isErasing) return;

                        const scaleX = canvas.width / rect.width;
                        const scaleY = canvas.height / rect.height;
                        const x = (clientX - rect.left) * scaleX;
                        const y = (clientY - rect.top) * scaleY;

                        const ctx = canvas.getContext('2d');
                        if (ctx) {
                            ctx.globalCompositeOperation = 'destination-out';
                            ctx.lineTo(x, y);
                            ctx.stroke();
                        }
                    };

                    const handleEraserHover = (e: React.MouseEvent | React.TouchEvent) => {
                        const canvas = eraserCanvasRef.current;
                        if (!canvas) return;
                        const rect = canvas.getBoundingClientRect();
                        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
                        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
                        setCursorPos({
                            x: clientX - rect.left,
                            y: clientY - rect.top
                        });
                    };

                    const handleEraserEnd = () => setIsErasing(false);

                    const trimCanvas = (c: HTMLCanvasElement): HTMLCanvasElement => {
                        const ctx = c.getContext('2d')!;
                        const width = c.width;
                        const height = c.height;
                        const imgData = ctx.getImageData(0, 0, width, height);
                        const data = imgData.data;

                        let minX = width, minY = height, maxX = 0, maxY = 0;

                        for (let y = 0; y < height; y++) {
                            for (let x = 0; x < width; x++) {
                                const alpha = data[(y * width + x) * 4 + 3];
                                if (alpha > 0) {
                                    if (x < minX) minX = x;
                                    if (y < minY) minY = y;
                                    if (x > maxX) maxX = x;
                                    if (y > maxY) maxY = y;
                                }
                            }
                        }

                        if (maxX < minX || maxY < minY) {
                            return c;
                        }

                        const trimmedWidth = maxX - minX + 1;
                        const trimmedHeight = maxY - minY + 1;
                        const trimmedCanvas = document.createElement('canvas');
                        trimmedCanvas.width = trimmedWidth;
                        trimmedCanvas.height = trimmedHeight;
                        const trimmedCtx = trimmedCanvas.getContext('2d')!;
                        trimmedCtx.drawImage(c, minX, minY, trimmedWidth, trimmedHeight, 0, 0, trimmedWidth, trimmedHeight);

                        return trimmedCanvas;
                    };

                    const confirmCrop = () => {
                        if (!imgRef.current || !containerRef.current || poly.length !== 4) return;
                        const img = imgRef.current;
                        const rect = img.getBoundingClientRect();
                        const contRect = containerRef.current.getBoundingClientRect();
                        
                        const scaleX = img.naturalWidth / rect.width;
                        const scaleY = img.naturalHeight / rect.height;

                        const imgPoints = poly.map(p => {
                            const offsetX = rect.left - contRect.left;
                            const offsetY = rect.top - contRect.top;
                            return {
                                x: (p.x - offsetX) * scaleX,
                                y: (p.y - offsetY) * scaleY
                            };
                        });

                        const minX = Math.max(0, Math.min(...imgPoints.map(p => p.x)));
                        const minY = Math.max(0, Math.min(...imgPoints.map(p => p.y)));
                        const maxX = Math.min(img.naturalWidth, Math.max(...imgPoints.map(p => p.x)));
                        const maxY = Math.min(img.naturalHeight, Math.max(...imgPoints.map(p => p.y)));

                        const canvas = document.createElement('canvas');
                        canvas.width = maxX - minX;
                        canvas.height = maxY - minY;
                        const ctx = canvas.getContext('2d')!;

                        ctx.beginPath();
                        ctx.moveTo(imgPoints[0].x - minX, imgPoints[0].y - minY);
                        ctx.lineTo(imgPoints[1].x - minX, imgPoints[1].y - minY);
                        ctx.lineTo(imgPoints[2].x - minX, imgPoints[2].y - minY);
                        ctx.lineTo(imgPoints[3].x - minX, imgPoints[3].y - minY);
                        ctx.closePath();
                        ctx.clip();

                        ctx.drawImage(img, -minX, -minY);
                        const croppedBase64 = canvas.toDataURL('image/png');
                        handleCropConfirm(croppedBase64);
                    };

                    const resetToLogoA = () => {
                        setUseLogoBAsBase(false);
                        const logoASrc = logoA.mode === 'remastered' 
                            ? (logoA.remastered || logoA.adapted!) 
                            : (logoA.mode === 'original' ? logoA.original! : logoA.adapted!);
                        
                        if (cropMethod === 'eraser') {
                            const canvas = eraserCanvasRef.current;
                            if (!canvas) return;
                            const tempImg = new Image();
                            tempImg.crossOrigin = "anonymous";
                            tempImg.src = logoASrc;
                            tempImg.onload = () => {
                                canvas.width = tempImg.naturalWidth;
                                canvas.height = tempImg.naturalHeight;
                                const ctx = canvas.getContext('2d');
                                if (ctx) {
                                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                                    ctx.drawImage(tempImg, 0, 0);
                                }
                            };
                        }
                    };

                    const confirmEraser = () => {
                        const canvas = eraserCanvasRef.current;
                        if (!canvas) return;
                        const trimmedCanvas = trimCanvas(canvas);
                        const base64 = trimmedCanvas.toDataURL('image/png');
                        handleCropConfirm(base64);
                    };

                    return (
                        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.92)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                            {/* Toggle method selector */}
                            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.2rem', zIndex: 10 }}>
                                <button
                                    onClick={() => setCropMethod('poly')}
                                    style={{
                                        padding: '0.6rem 1.8rem',
                                        background: cropMethod === 'poly' ? '#ea580c' : 'rgba(255,255,255,0.06)',
                                        color: cropMethod === 'poly' ? '#000' : '#fff',
                                        border: 'none',
                                        fontWeight: 900,
                                        fontSize: '0.7rem',
                                        textTransform: 'uppercase',
                                        cursor: 'pointer',
                                        borderRadius: '4px',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    Découpe libre (4 points)
                                </button>
                                <button
                                    onClick={() => {
                                        setCropMethod('eraser');
                                        setTimeout(initEraserCanvas, 100);
                                    }}
                                    style={{
                                        padding: '0.6rem 1.8rem',
                                        background: cropMethod === 'eraser' ? '#ea580c' : 'rgba(255,255,255,0.06)',
                                        color: cropMethod === 'eraser' ? '#000' : '#fff',
                                        border: 'none',
                                        fontWeight: 900,
                                        fontSize: '0.7rem',
                                        textTransform: 'uppercase',
                                        cursor: 'pointer',
                                        borderRadius: '4px',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    Gomme (Effacer des zones)
                                </button>
                            </div>

                            {/* Background and reset options */}
                            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', marginBottom: '1.2rem', flexWrap: 'wrap', justifyContent: 'center', zIndex: 10 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fff', fontSize: '0.75rem', background: 'rgba(255,255,255,0.04)', padding: '0.4rem 0.8rem', borderRadius: '6px' }}>
                                    <span style={{ opacity: 0.8 }}>Fond :</span>
                                    <button 
                                        onClick={() => setCropBg('white')} 
                                        style={{
                                            padding: '0.2rem 0.6rem',
                                            background: cropBg === 'white' ? '#ea580c' : 'rgba(255,255,255,0.1)',
                                            color: cropBg === 'white' ? '#000' : '#fff',
                                            border: 'none',
                                            borderRadius: '3px',
                                            fontSize: '0.65rem',
                                            fontWeight: 850,
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Blanc
                                    </button>
                                    <button 
                                        onClick={() => setCropBg('black')} 
                                        style={{
                                            padding: '0.2rem 0.6rem',
                                            background: cropBg === 'black' ? '#ea580c' : 'rgba(255,255,255,0.1)',
                                            color: cropBg === 'black' ? '#000' : '#fff',
                                            border: 'none',
                                            borderRadius: '3px',
                                            fontSize: '0.65rem',
                                            fontWeight: 850,
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Noir
                                    </button>
                                    <button 
                                        onClick={() => setCropBg('transparent')} 
                                        style={{
                                            padding: '0.2rem 0.6rem',
                                            background: cropBg === 'transparent' ? '#ea580c' : 'rgba(255,255,255,0.1)',
                                            color: cropBg === 'transparent' ? '#000' : '#fff',
                                            border: 'none',
                                            borderRadius: '3px',
                                            fontSize: '0.65rem',
                                            fontWeight: 850,
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Damier
                                    </button>
                                </div>

                                {logoB.original && useLogoBAsBase && (
                                    <button
                                        onClick={resetToLogoA}
                                        style={{
                                            padding: '0.4rem 0.8rem',
                                            background: 'rgba(239, 68, 68, 0.1)',
                                            border: '1px solid rgba(239, 68, 68, 0.2)',
                                            color: '#ef4444',
                                            fontSize: '0.65rem',
                                            fontWeight: 800,
                                            textTransform: 'uppercase',
                                            cursor: 'pointer',
                                            borderRadius: '6px',
                                            transition: 'all 0.2s'
                                        }}
                                        title="Recharger l'image originale du Logo A"
                                    >
                                        Recommencer depuis Logo A
                                    </button>
                                )}
                            </div>

                            <div style={{ color: '#fff', fontWeight: 900, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '1rem', textAlign: 'center' }}>
                                <Crop size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px', color: '#ea580c' }} />
                                {cropMethod === 'poly' 
                                    ? 'Déplacez les 4 points pour délimiter la zone à extraire' 
                                    : 'Glissez pour effacer les éléments indésirables de l\'image'}
                            </div>

                            {cropMethod === 'eraser' && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: '#fff', fontSize: '0.75rem', marginBottom: '1.2rem', background: 'rgba(255,255,255,0.04)', padding: '0.5rem 1rem', borderRadius: '6px' }}>
                                    <span>Taille de la gomme :</span>
                                    <input
                                        type="range"
                                        min="5"
                                        max="100"
                                        value={brushSize}
                                        onChange={(e) => setBrushSize(Number(e.target.value))}
                                        style={{ accentColor: '#ea580c', cursor: 'pointer' }}
                                    />
                                    <span style={{ fontWeight: 800, minWidth: '35px' }}>{brushSize}px</span>
                                    <button
                                        onClick={initEraserCanvas}
                                        style={{
                                            marginLeft: '1rem',
                                            padding: '0.3rem 0.8rem',
                                            background: 'rgba(255,255,255,0.1)',
                                            border: '1px solid rgba(255,255,255,0.15)',
                                            color: '#fff',
                                            fontSize: '0.65rem',
                                            fontWeight: 800,
                                            textTransform: 'uppercase',
                                            cursor: 'pointer',
                                            borderRadius: '3px'
                                        }}
                                    >
                                        Réinitialiser
                                    </button>
                                </div>
                            )}

                            <div
                                ref={containerRef}
                                style={{ position: 'relative', width: '90vw', height: '60vh', cursor: dragIdx !== null ? 'grabbing' : 'default', userSelect: 'none', touchAction: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                onMouseDown={cropMethod === 'poly' ? handleStart : undefined}
                                onMouseMove={cropMethod === 'poly' ? handleMove : undefined}
                                onMouseUp={cropMethod === 'poly' ? handleEnd : undefined}
                                onMouseLeave={cropMethod === 'poly' ? handleEnd : undefined}
                                onTouchStart={cropMethod === 'poly' ? handleStart : undefined}
                                onTouchMove={cropMethod === 'poly' ? handleMove : undefined}
                                onTouchEnd={cropMethod === 'poly' ? handleEnd : undefined}
                            >
                                <img
                                    ref={imgRef}
                                    onLoad={initPoly}
                                    src={getLogoASrc()}
                                    crossOrigin="anonymous"
                                    style={{ 
                                        maxWidth: '100%', 
                                        maxHeight: '100%', 
                                        objectFit: 'contain', 
                                        display: cropMethod === 'poly' ? 'block' : 'none', 
                                        background: cropBg === 'transparent' 
                                            ? 'repeating-conic-gradient(#808080 0% 25%, transparent 0% 50%) 50% / 20px 20px' 
                                            : cropBg 
                                    }}
                                    draggable={false}
                                />
                                
                                {cropMethod === 'poly' && (
                                    <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 10 }}>
                                        <defs>
                                            <mask id="poly-mask">
                                                <rect width="100%" height="100%" fill="white" />
                                                {poly.length === 4 && <polygon points={poly.map(p => `${p.x},${p.y}`).join(' ')} fill="black" />}
                                            </mask>
                                        </defs>
                                        <rect width="100%" height="100%" fill="rgba(0,0,0,0.8)" mask="url(#poly-mask)" />
                                        {poly.length === 4 && (
                                            <>
                                                <polygon points={poly.map(p => `${p.x},${p.y}`).join(' ')} fill="transparent" stroke="#ea580c" strokeWidth="2" strokeDasharray="4 4" />
                                                {poly.map((p, i) => (
                                                    <circle key={i} cx={p.x} cy={p.y} r="12" fill="#ea580c" stroke="white" strokeWidth="3" style={{ pointerEvents: 'all', cursor: 'grab' }} />
                                                ))}
                                            </>
                                        )}
                                    </svg>
                                )}

                                {cropMethod === 'eraser' && (
                                    <div 
                                        style={{ position: 'relative' }}
                                        onMouseMove={handleEraserHover}
                                        onMouseLeave={() => setCursorPos(null)}
                                    >
                                        <canvas
                                            ref={eraserCanvasRef}
                                            onMouseDown={handleEraserStart}
                                            onMouseMove={handleEraserMove}
                                            onMouseUp={handleEraserEnd}
                                            onMouseLeave={handleEraserEnd}
                                            onTouchStart={handleEraserStart}
                                            onTouchMove={handleEraserMove}
                                            onTouchEnd={handleEraserEnd}
                                            style={{
                                                maxWidth: '90vw',
                                                maxHeight: '60vh',
                                                objectFit: 'contain',
                                                display: 'block',
                                                background: cropBg === 'transparent' 
                                                    ? 'repeating-conic-gradient(#808080 0% 25%, transparent 0% 50%) 50% / 20px 20px' 
                                                    : cropBg,
                                                cursor: 'crosshair',
                                                touchAction: 'none'
                                            }}
                                        />
                                        {cursorPos && (
                                            <div style={{
                                                position: 'absolute',
                                                left: cursorPos.x - brushSize / 2,
                                                top: cursorPos.y - brushSize / 2,
                                                width: brushSize,
                                                height: brushSize,
                                                borderRadius: '50%',
                                                border: '2px solid rgba(234, 88, 12, 0.8)',
                                                backgroundColor: 'rgba(234, 88, 12, 0.2)',
                                                pointerEvents: 'none',
                                                zIndex: 20
                                            }} />
                                        )}
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                                <button
                                    onClick={() => setShowCropModal(false)}
                                    style={{ padding: '0.7rem 2rem', background: 'transparent', border: '1px solid #555', color: '#aaa', fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.1em' }}
                                >
                                    Annuler
                                </button>
                                {cropMethod === 'poly' ? (
                                    <button
                                        onClick={confirmCrop}
                                        disabled={poly.length !== 4}
                                        style={{
                                            padding: '0.7rem 2rem',
                                            background: poly.length === 4 ? '#ea580c' : '#333',
                                            border: 'none',
                                            color: poly.length === 4 ? '#000' : '#666',
                                            fontWeight: 900,
                                            fontSize: '0.75rem',
                                            cursor: poly.length === 4 ? 'pointer' : 'not-allowed',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.1em'
                                        }}
                                    >
                                        ✓ Valider la découpe libre
                                    </button>
                                ) : (
                                    <button
                                        onClick={confirmEraser}
                                        style={{
                                            padding: '0.7rem 2rem',
                                            background: '#ea580c',
                                            border: 'none',
                                            color: '#000',
                                            fontWeight: 900,
                                            fontSize: '0.75rem',
                                            cursor: 'pointer',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.1em'
                                        }}
                                    >
                                        ✓ Valider le gommage
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                };
                return <CropModal />;
            })()}
            <AdminQuickBar 
                uid={sessionId || new URLSearchParams(window.location.search).get('uid') || ''} 
                companyName={userData?.companyName} 
            />
        </div>
    );
};

export default GenericAuditPage;

