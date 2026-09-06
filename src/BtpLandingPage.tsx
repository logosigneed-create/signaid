import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Upload, ShieldCheck, Zap, Layout, Loader2, Sparkles, LogIn, CheckSquare, Shield, Layers, CheckCircle2, RefreshCcw, Trash2, RefreshCw, Play, Check, Terminal, Wind, Sun, Info, ArrowLeft, ShieldAlert, Clock, TrendingUp, ArrowRight, ExternalLink, Download, Wand2, Crop } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, storage, auth } from './firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, uploadString, getDownloadURL, UploadMetadata } from 'firebase/storage';
import { SEO } from './components/SEO';
import { geminiService } from './services/geminiService';
import { getStoredConfig, saveStoredConfig } from './lib/store';
import { removeBackground } from './utils/helpers';
import { sanitizeForFirestore } from './utils/firestoreSanitizer';

type FlowState = 'LANDING' | 'CLEAN_CHECK' | 'SALES_AUDIT' | 'AUDIT' | 'RESULT' | 'ERROR';

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
    isGenerating: boolean;
    view: 'front' | 'back';
    garment: 'tshirt' | 'tshirt_basic' | 'polo' | 'sweat' | 'tshirt_bicolore' | 'veste' | 'business_card' | 'banner';
    mechanical?: string | null;
    model?: string;
    selected: boolean;
    aiRemastered?: string | null;
}

interface BtpLogo {
    id: 'A' | 'B';
    original: string | null;
    adapted: string | null;
    adaptedBlack: string | null;
    remastered: string | null;
    adaptedRemastered?: string | null;
    adaptedBlackRemastered?: string | null;
    mode: 'original' | 'adapted' | 'adaptedBlack' | 'remastered';
}

// ARCHITECTE : THE VAULT - MIGRATION DYNAMIQUE
// Les placements sont désormais récupérés via Firestore pour une scalabilité totale.
// Fallback local pour assurer la continuité de service.
const DEFAULT_PLACEMENTS = {
    tshirt: {
        front: { x: 0.64, y: 0.30, scale: 0.20 },
        back: { x: 0.50, y: 0.38, scale: 0.40 }
    },
    tshirt_basic: {
        front: { x: 0.64, y: 0.30, scale: 0.20 },
        back: { x: 0.50, y: 0.38, scale: 0.40 }
    },
    tshirt_bicolore: {
        front: { x: 0.64, y: 0.32, scale: 0.20 },
        back: { x: 0.50, y: 0.32, scale: 0.40 }
    },
    sweat: {
        front: { x: 0.64, y: 0.34, scale: 0.20 },
        back: { x: 0.50, y: 0.46, scale: 0.40 }
    },
    polo: {
        front: { x: 0.64, y: 0.32, scale: 0.16 },
        back: { x: 0.50, y: 0.38, scale: 0.40 }
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

const BtpLandingPage: React.FC = () => {
    const isAuditPath = window.location.pathname === '/btp-audit';
    const [state, setState] = useState<FlowState>('LANDING');
    const [isLoaded, setIsLoaded] = useState(false);
    const [isConfigOpen, setIsConfigOpen] = useState(true);

    // MULTI-LOGO STATE
    const [logoA, setLogoA] = useState<BtpLogo>({ id: 'A', original: null, adapted: null, adaptedBlack: null, remastered: null, mode: 'adapted' });
    const [logoB, setLogoB] = useState<BtpLogo>({ id: 'B', original: null, adapted: null, adaptedBlack: null, remastered: null, mode: 'adapted' });
    const [logoPlacements, setLogoPlacements] = useState<Record<string, 'A' | 'B'>>({
        tFront: 'A',
        tBack: 'A',
        vFront: 'A',
        vBack: 'A',
        hFront: 'A',
        hBack: 'A'
    });

    const [logoScaleFront, setLogoScaleFront] = useState(0.14);
    const [logoScaleBack, setLogoScaleBack] = useState(0.40);
    const [logoScaleCard, setLogoScaleCard] = useState(0.35);
    const [isBatConfirmed, setIsBatConfirmed] = useState(false);
    const [noiseThreshold, setNoiseThreshold] = useState(5);
    const [enableThickening, setEnableThickening] = useState(false);
    const [enableStroke, setEnableStroke] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [showCropModal, setShowCropModal] = useState(false);
    const [cropTargetSlot, setCropTargetSlot] = useState<'A' | 'B'>('B');
    const [logoAnalysis, setLogoAnalysis] = useState<any>(null);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [previewId, setPreviewId] = useState<string | null>(null);
    const saveSessionRef = useRef<any>(null);
    const [hasReferralDiscount, setHasReferralDiscount] = useState(false);

    const [mockups, setMockups] = useState<MockupItem[]>(() => [
        // CLASSIC BLACK
        { id: 'tBack', title: 'T-shirt Noir DOS', base: "/assets/tshirt-black-JHK170-dos.png?v=V24", ai: null, isGenerating: false, view: 'back' as const, garment: 'tshirt' as const, mechanical: null, model: "/assets/models/male_tshirt_back.png", selected: true },
        { id: 'tFront', title: 'T-shirt Noir FACE', base: "/assets/tshirt-black-JHK170.png?v=V24", ai: null, isGenerating: false, view: 'front' as const, garment: 'tshirt' as const, mechanical: null, model: "/assets/models/male_tshirt_front.png", selected: true },
        
        // T-SHIRT BASIC (GREY)
        { id: 'tbBack', title: 'T-shirt Basic DOS', base: "/assets/tshirt-grey-JHK170-dos.png?v=V24", ai: null, isGenerating: false, view: 'back' as const, garment: 'tshirt_basic' as const, mechanical: null, model: "/assets/models/male_tshirt_back.png", selected: true },
        { id: 'tbFront', title: 'T-shirt Basic FACE', base: "/assets/tshirt-grey-JHK170.png?v=V24", ai: null, isGenerating: false, view: 'front' as const, garment: 'tshirt_basic' as const, mechanical: null, model: "/assets/models/male_tshirt_front.png", selected: true },
        
        // FLUO T-SHIRT
        { id: 'vBack', title: 'T-shirt Fluo DOS', base: "/assets/tshirt-fluo-grey-back.jpg?v=V24", ai: null, isGenerating: false, view: 'back' as const, garment: 'tshirt_bicolore' as const, mechanical: null, model: "/assets/models/male_tshirt_back.png", selected: true },
        { id: 'vFront', title: 'T-shirt Fluo FACE', base: "/assets/tshirt-fluo-grey-front.jpg?v=V24", ai: null, isGenerating: false, view: 'front' as const, garment: 'tshirt_bicolore' as const, mechanical: null, model: "/assets/models/male_tshirt_front.png", selected: true },

        // POLO
        { id: 'pBack', title: 'Polo Noir DOS', base: "/assets/polo-black-JHK510-dos.png?v=V24", ai: null, isGenerating: false, view: 'back' as const, garment: 'polo' as const, mechanical: null, model: "/assets/polo-black-JHK510-dos.png", selected: true },
        { id: 'pFront', title: 'Polo Noir FACE', base: "/assets/polo-black-JHK510.png?v=V24", ai: null, isGenerating: false, view: 'front' as const, garment: 'polo' as const, mechanical: null, model: "/assets/polo-black-JHK510.png", selected: true },

        // HOODIE
        { id: 'hBack', title: 'Hoodie Noir DOS', base: "/assets/hoodie-black-JHK421-dos.png?v=V24", ai: null, isGenerating: false, view: 'back' as const, garment: 'sweat' as const, mechanical: null, model: "/assets/models/male_hoodie_back.png", selected: true },
        { id: 'hFront', title: 'Hoodie Noir FACE', base: "/assets/hoodie-black-JHK421.png?v=V24", ai: null, isGenerating: false, view: 'front' as const, garment: 'sweat' as const, mechanical: null, model: "/assets/models/male_hoodie_front.png", selected: true },

        // MARKETING ASSETS
        { id: 'cardFront', title: 'Carte Visite RECTO', base: "/assets/models/card_mockup_front_neutral.png", ai: null, isGenerating: false, view: 'front' as const, garment: 'business_card' as const, mechanical: null, model: "/assets/models/card_mockup_front_neutral.png", selected: true },
        { id: 'cardBack', title: 'Carte Visite VERSO', base: "/assets/models/card_mockup_back.png", ai: null, isGenerating: false, view: 'back' as const, garment: 'business_card' as const, mechanical: null, model: "/assets/models/card_mockup_back.png", selected: true }
    ]);
    const [activeMockupIndex, setActiveMockupIndex] = useState(0);
    const [statusMessage, setStatusMessage] = useState("Pipeline HD Actif...");
    const [showAuthModal, setShowAuthModal] = useState(false);
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

    // AUTOMATIC LIGHT MODE (DAYLIGHT 9h-22h)
    const currentHour = new Date().getHours();
    const isDaylight = currentHour >= 9 && currentHour < 22;
    // In audit mode, use daylight. In portal mode, also check accent color contrast.
    const isLightMode = isPortalMode ? (isDaylight && !isColorLight(assetColor)) : isDaylight;



    useEffect(() => {
        if (isAuditPath && state === 'LANDING') {
            // Optionnel: On pourrait forcer le passage à l'outil ici si besoin
        }
    }, [isAuditPath]);

    const [employeeName, setEmployeeName] = useState('');
    const [selectedSize, setSelectedSize] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const SIZES = ['S', 'M', 'L', 'XL', 'XXL', '3XL'];

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

    const [isAdmin, setIsAdmin] = useState(false);
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                const adminEmails = ['logosigneed@gmail.com', 'contact@signaid.eu', 'alicia.g.gheerts@gmail.com'];
                if (user.email && adminEmails.includes(user.email.toLowerCase())) {
                    setIsAdmin(true);
                } else {
                    setIsAdmin(false);
                }
            } else {
                setIsAdmin(false);
            }
        });
        return () => unsubscribe();
    }, []);

    const [isDragging, setIsDragging] = useState(false);
    const [remasterStep, setRemasterStep] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedForRegen, setSelectedForRegen] = useState<string[]>([]);

    // HELPER: Get active logo for placement
    const getActiveLogoForPlacement = useCallback((placementId: string) => {
        const slot = logoPlacements[placementId] || 'A'; // Default to A if not found (fixes cards)
        const logo = slot === 'A' ? logoA : logoB;
        if (!logo.original) return null;
        if (logo.mode === 'remastered') return logo.remastered || logo.adapted;
        if (logo.mode === 'adaptedBlack') return (logo.remastered ? logo.adaptedBlackRemastered : logo.adaptedBlack) || logo.adaptedBlack || logo.original;
        if (logo.mode === 'original') return logo.original;
        // mode === 'adapted' (Blanc)
        return (logo.remastered ? logo.adaptedRemastered : logo.adapted) || logo.adapted;
    }, [logoA, logoB, logoPlacements]);

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
                    if (data.tshirt?.front?.scale && data.tshirt.front.scale !== 0.20) setLogoScaleFront(data.tshirt.front.scale);
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
            await setDoc(doc(db, 'portail-config', 'placements'), sanitizeForFirestore(PLACEMENTS));
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
                const logoSrc = 
                    logo.mode === 'remastered' ? (logo.remastered || logo.adapted) :
                    logo.mode === 'adaptedBlack' ? ((logo.remastered && logo.adaptedBlackRemastered) ? logo.adaptedBlackRemastered : (logo.adaptedBlack || logo.original)) :
                    logo.mode === 'original' ? logo.original :
                    ((logo.remastered && logo.adaptedRemastered) ? logo.adaptedRemastered : logo.adapted); // 'adapted' = blanc
                
                // Ne pas régénérer les gabarits non sélectionnés
                if (!m.selected) return m;

                if (!logoSrc && m.garment !== 'business_card' && m.garment !== 'banner') return m;

                const scale = m.garment === 'business_card' 
                    ? logoScaleCard 
                    : (m.view === 'front' ? logoScaleFront : logoScaleBack);
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
                    if (hasChanged) {
                        setTimeout(() => {
                            saveSessionRef.current?.(logoA, logoB, logoPlacements, userData, updated);
                        }, 100);
                    }
                    return hasChanged ? updated : prev;
                });
            }
        };

        const debounceTimer = setTimeout(updateGabarits, 200);
        return () => { isCancelled = true; clearTimeout(debounceTimer); };
    }, [logoScaleFront, logoScaleBack, logoScaleCard, logoA, logoB, logoPlacements, mockups.length, userData]);

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

        // 2. SESSION LOADING & SYNCING FROM URL & SITE CONFIGS
        const loadSessionAndProfile = async () => {
            const params = new URLSearchParams(window.location.search);
            const isRefresh = params.get('refresh') === 'true';
            const uidParam = params.get('uid');
            
            let sid = params.get('audit');
            let latestConfig: any = null;

            if (uidParam) {
                try {
                    latestConfig = await getStoredConfig(uidParam);
                    if (latestConfig && latestConfig.generatedKey) {
                        sid = latestConfig.generatedKey;
                    }
                } catch (e) {
                    console.warn("Could not load user config on mount:", e);
                }
            }

            if (!sid && !isRefresh && !uidParam) {
                sid = localStorage.getItem('btp_active_session_id');
            }

            if (isRefresh && !uidParam) {
                localStorage.removeItem('btp_active_session_id');
            }

            if (sid) {
                const idbSaved = await dbGet(`session_obj_${sid}`);
                const lsSaved = localStorage.getItem(`btp_session_${sid}`);
                const saved = idbSaved || lsSaved;

                if (saved) {
                    const data = JSON.parse(saved);
                    setSessionId(sid);
                    
                    // Merge latest config into userData
                    let activeUserData = data.userData || {};
                    if (latestConfig) {
                        activeUserData = {
                            ...activeUserData,
                            companyName: latestConfig.companyName || activeUserData.companyName,
                            email: latestConfig.contactEmail || latestConfig.email || activeUserData.email,
                            activity: latestConfig.activitySector || latestConfig.sector || activeUserData.activity,
                            phone: latestConfig.whatsappNumber || latestConfig.phone || activeUserData.phone,
                            website: latestConfig.address || activeUserData.website
                        };
                    }
                    setUserData(activeUserData);

                    // Sync Credits for the loaded user
                    if (activeUserData.email) {
                        localStorage.setItem('btp_last_email', activeUserData.email);
                        const userCredits = localStorage.getItem(`btp_credits_${activeUserData.email}`);
                        if (userCredits !== null) setCredits(parseInt(userCredits));
                    }

                    // Always try to restore large strings from IndexedDB (Logos)
                    const [lAOrig, lAAdapt, lAAdaptBlack, lARemastered, lAAdaptRemastered, lAAdaptBlackRemastered, lBOrig, lBAdapt, lBAdaptBlack, lBRemastered, lBAdaptRemastered, lBAdaptBlackRemastered] = await Promise.all([
                        dbGet(`${sid}_A_orig`), dbGet(`${sid}_A_adapt`), dbGet(`${sid}_A_adapt_black`), dbGet(`${sid}_A_remastered`), dbGet(`${sid}_A_adapted_remastered`), dbGet(`${sid}_A_adapted_black_remastered`),
                        dbGet(`${sid}_B_orig`), dbGet(`${sid}_B_adapt`), dbGet(`${sid}_B_adapt_black`), dbGet(`${sid}_B_remastered`), dbGet(`${sid}_B_adapted_remastered`), dbGet(`${sid}_B_adapted_black_remastered`)
                    ]);

                    let finalLogoA: BtpLogo = { id: 'A', original: lAOrig || null, adapted: lAAdapt || null, adaptedBlack: lAAdaptBlack || null, remastered: lARemastered || null, adaptedRemastered: lAAdaptRemastered || null, adaptedBlackRemastered: lAAdaptBlackRemastered || null, mode: data.logoAMode || 'original' };
                    let finalLogoB: BtpLogo = { id: 'B', original: lBOrig || null, adapted: lBAdapt || null, adaptedBlack: lBAdaptBlack || null, remastered: lBRemastered || null, adaptedRemastered: lBAdaptRemastered || null, adaptedBlackRemastered: lBAdaptBlackRemastered || null, mode: data.logoBMode || 'original' };

                    // Restore AI mockups from IDB, healing them with base definitions to ensure models/garments are always valid
                    const baseMockups = initializeMockups();
                    const savedMockups = data.mockups || [];
                    
                    const restoredMockups = await Promise.all(baseMockups.map(async (baseM) => {
                        const savedM = savedMockups.find((sm: any) => sm.id === baseM.id);
                        const aiStr = (savedM?.hasAi || savedM?.ai) ? await dbGet(`${sid}_ai_${baseM.id}`) : null;
                        
                        return {
                            ...baseM,
                            selected: savedM !== undefined ? savedM.selected : baseM.selected,
                            ai: aiStr,
                            mechanical: savedM?.mechanical || null
                        };
                    }));

                    // Detect if there is a new/different logo loaded from the admin config
                    if (latestConfig && latestConfig.logoUrl && latestConfig.logoUrl !== lAOrig) {
                        try {
                            const [original, adapted, adaptedBlack] = await Promise.all([
                                processLogoDeterministic(latestConfig.logoUrl, false, false),
                                processLogoDeterministic(latestConfig.logoUrl, true, false),
                                processLogoDeterministic(latestConfig.logoUrl, true, true)
                            ]);
                            finalLogoA = { id: 'A', original, adapted, adaptedBlack, remastered: null, mode: 'original' };
                            finalLogoB = { id: 'B', original, adapted, adaptedBlack, remastered: null, mode: 'original' };
                            
                            geminiService.analyzeLogoBranding(latestConfig.logoUrl).then(analysis => {
                                if (analysis) setLogoAnalysis(analysis);
                            }).catch(() => null);

                            await saveSession(finalLogoA, finalLogoB, data.logoPlacements || {}, activeUserData, restoredMockups);
                        } catch (err) {
                            console.warn("Could not process latestConfig logoUrl:", err);
                        }
                    }

                    setLogoA(finalLogoA);
                    setLogoB(finalLogoB);

                    if (data.logoPlacements) setLogoPlacements(data.logoPlacements);
                    setMockups(restoredMockups);
                    setState('RESULT');
                    if (finalLogoA.original || (latestConfig && latestConfig.logoUrl)) {
                        setIsConfigOpen(false);
                    }
                    await saveSession(finalLogoA, finalLogoB, data.logoPlacements || {}, activeUserData, restoredMockups);
                } else {
                    // Fallback: If session data exists in Firestore (sid is set) but is missing in the local browser cache
                    if (latestConfig) {
                        const activeUserData = {
                            companyName: latestConfig.companyName || userData.companyName,
                            email: latestConfig.contactEmail || userData.email,
                            activity: latestConfig.activitySector || userData.activity,
                            phone: latestConfig.whatsappNumber || userData.phone,
                            website: latestConfig.address || userData.website,
                            tva: userData.tva,
                            showActivity: userData.showActivity,
                            showPhone: userData.showPhone,
                            showWebsite: userData.showWebsite,
                            showVat: userData.showVat,
                        };
                        setUserData(activeUserData);

                        if (latestConfig.logoUrl) {
                            setStatusMessage("ANALYSE DU LOGO ADMIN...");
                            setIsAnalyzing(true);
                            try {
                                const [original, adapted, adaptedBlack, analysis] = await Promise.all([
                                    processLogoDeterministic(latestConfig.logoUrl, false, false),
                                    processLogoDeterministic(latestConfig.logoUrl, true, false),
                                    processLogoDeterministic(latestConfig.logoUrl, true, true),
                                    geminiService.analyzeLogoBranding(latestConfig.logoUrl).catch(() => null)
                                ]);
                                const newLogoA: BtpLogo = { id: 'A', original, adapted, adaptedBlack, remastered: null, mode: 'original' };
                                const newLogoB: BtpLogo = { id: 'B', original, adapted, adaptedBlack, remastered: null, mode: 'original' };
                                setLogoA(newLogoA);
                                setLogoB(newLogoB);
                                if (analysis) setLogoAnalysis(analysis);
                                
                                setState('RESULT');
                                setIsConfigOpen(false);
                                
                                await saveSession(newLogoA, newLogoB, {}, activeUserData, initializeMockups());
                            } catch (err) {
                                console.warn("Could not process latestConfig logoUrl:", err);
                                const fallbackLogoA: BtpLogo = { id: 'A', original: latestConfig.logoUrl, adapted: latestConfig.logoUrl, adaptedBlack: latestConfig.logoUrl, remastered: null, mode: 'original' };
                                const fallbackLogoB: BtpLogo = { id: 'B', original: latestConfig.logoUrl, adapted: latestConfig.logoUrl, adaptedBlack: latestConfig.logoUrl, remastered: null, mode: 'original' };
                                setLogoA(fallbackLogoA);
                                setLogoB(fallbackLogoB);
                                setState('RESULT');
                                setIsConfigOpen(false);
                            } finally {
                                setIsAnalyzing(false);
                            }
                        }
                    }
                }
                setIsLoaded(true);
            } else {
                // 3. LOAD DEFAULT PROFILE FROM GLOBAL CONFIG
                if (latestConfig) {
                    const activeUserData = {
                        companyName: latestConfig.companyName || userData.companyName,
                        email: latestConfig.contactEmail || userData.email,
                        activity: latestConfig.activitySector || userData.activity,
                        phone: latestConfig.whatsappNumber || userData.phone,
                        website: latestConfig.address || userData.website,
                        tva: userData.tva,
                        showActivity: userData.showActivity,
                        showPhone: userData.showPhone,
                        showWebsite: userData.showWebsite,
                        showVat: userData.showVat,
                    };
                    setUserData(activeUserData);

                    // Also try to load logo if none exists
                    if (latestConfig.logoUrl) {
                        setStatusMessage("ANALYSE DU LOGO ADMIN...");
                        setIsAnalyzing(true);
                        try {
                            const [original, adapted, adaptedBlack, analysis] = await Promise.all([
                                processLogoDeterministic(latestConfig.logoUrl, false, false),
                                processLogoDeterministic(latestConfig.logoUrl, true, false),
                                processLogoDeterministic(latestConfig.logoUrl, true, true),
                                geminiService.analyzeLogoBranding(latestConfig.logoUrl).catch(() => null)
                            ]);
                            const newLogoA: BtpLogo = { id: 'A', original, adapted, adaptedBlack, remastered: null, mode: 'original' };
                            const newLogoB: BtpLogo = { id: 'B', original, adapted, adaptedBlack, remastered: null, mode: 'original' };
                            setLogoA(newLogoA);
                            setLogoB(newLogoB);
                            if (analysis) setLogoAnalysis(analysis);
                            
                            setState('RESULT');
                            setIsConfigOpen(false);
                            
                            // Save session immediately so it has an ID
                            const defaultPlacements = {};
                            const defaultMockups = initializeMockups();
                            await saveSession(newLogoA, newLogoB, defaultPlacements, activeUserData, defaultMockups);
                        } catch (err) {
                            console.warn("Could not process latestConfig logoUrl:", err);
                            const fallbackLogoA: BtpLogo = { id: 'A', original: latestConfig.logoUrl, adapted: latestConfig.logoUrl, adaptedBlack: latestConfig.logoUrl, remastered: null, mode: 'original' };
                            const fallbackLogoB: BtpLogo = { id: 'B', original: latestConfig.logoUrl, adapted: latestConfig.logoUrl, adaptedBlack: latestConfig.logoUrl, remastered: null, mode: 'original' };
                            setLogoA(fallbackLogoA);
                            setLogoB(fallbackLogoB);
                            setState('RESULT');
                            setIsConfigOpen(false);
                        } finally {
                            setIsAnalyzing(false);
                        }
                    }
                }

                // 4. AUTO-LOAD LAST ACTIVE ACCOUNT (supplement, don't overwrite)
                const lastEmail = localStorage.getItem('btp_last_email');
                if (lastEmail) {
                    const savedCredits = localStorage.getItem(`btp_credits_${lastEmail}`);
                    if (savedCredits !== null) {
                        setCredits(parseInt(savedCredits));
                    }
                    const savedData = localStorage.getItem(`btp_user_data_${lastEmail}`);
                    if (savedData) {
                        const localData = JSON.parse(savedData);
                        // Only fill in email if not already set from global config
                        setUserData(prev => ({
                            ...prev,
                            email: prev.email || localData.email,
                            tva: localData.tva || prev.tva,
                            showActivity: localData.showActivity ?? prev.showActivity,
                            showPhone: localData.showPhone ?? prev.showPhone,
                            showWebsite: localData.showWebsite ?? prev.showWebsite,
                            showVat: localData.showVat ?? prev.showVat,
                        }));
                    }
                }

                setIsLoaded(true);
            }
        };

        loadSessionAndProfile();
    }, []);

    const saveSession = useCallback(async (lA: BtpLogo, lB: BtpLogo, placements: Record<string, 'A' | 'B'>, uData: UserData, currentMockups: MockupItem[]) => {
        const urlParams = new URLSearchParams(window.location.search);
        const urlSid = urlParams.get('uid') || urlParams.get('audit') || urlParams.get('sid') || urlParams.get('key') || urlParams.get('slug');
        let sid = sessionId || urlSid;
        if (!sid) {
            sid = `audit-${Math.random().toString(36).substring(2, 9)}`;
        }
        setSessionId(sid);
        localStorage.setItem('btp_active_session_id', sid);
        const cleanPath = `/btp-audit/${sid}`;
        window.history.pushState({}, '', cleanPath);

        try {
            // 1. HEAVY ASSETS & SESSION DATA TO INDEXED DB (UNLIMITED SPACE)
            if (lA.original) await dbSet(`${sid}_A_orig`, lA.original);
            if (lA.adapted) await dbSet(`${sid}_A_adapt`, lA.adapted);
            if (lA.adaptedBlack) await dbSet(`${sid}_A_adapt_black`, lA.adaptedBlack);
            if (lA.remastered) await dbSet(`${sid}_A_remastered`, lA.remastered);
            if (lA.adaptedRemastered) await dbSet(`${sid}_A_adapted_remastered`, lA.adaptedRemastered);
            if (lA.adaptedBlackRemastered) await dbSet(`${sid}_A_adapted_black_remastered`, lA.adaptedBlackRemastered);
            
            if (lB.original) await dbSet(`${sid}_B_orig`, lB.original);
            if (lB.adapted) await dbSet(`${sid}_B_adapt`, lB.adapted);
            if (lB.adaptedBlack) await dbSet(`${sid}_B_adapt_black`, lB.adaptedBlack);
            if (lB.remastered) await dbSet(`${sid}_B_remastered`, lB.remastered);
            if (lB.adaptedRemastered) await dbSet(`${sid}_B_adapted_remastered`, lB.adaptedRemastered);
            if (lB.adaptedBlackRemastered) await dbSet(`${sid}_B_adapted_black_remastered`, lB.adaptedBlackRemastered);

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
                mechanical: m.mechanical // Still small enough
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

            // Only save the current session ID in localStorage (Tiny)
            localStorage.setItem('btp_active_session_id', sid);

            // 2. LIVE SYNC TO CLOUD FIRESTORE FOR PROSPECTS ACCESS (SHARING LINKS)
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
                    let base64 = l[mode] || l.original;
                    if (mode === 'adapted' && l.remastered && l.adaptedRemastered) {
                        base64 = l.adaptedRemastered;
                    } else if (mode === 'adaptedBlack' && l.remastered && l.adaptedBlackRemastered) {
                        base64 = l.adaptedBlackRemastered;
                    }
                    if (base64 && typeof base64 === 'string') {
                        if (base64.startsWith('http')) return base64;
                        if (base64.startsWith('data:image') || base64.startsWith('data:')) {
                            try {
                                const timestamp = Date.now();
                                const storageRef = ref(storage, `btp_mockups/${sid}/web/logo_${slot}_active_${timestamp}.png`);
                                const match = base64.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,/);
                                const contentType = match ? match[1] : 'image/png';
                                const metadata: UploadMetadata = {
                                    contentType,
                                    cacheControl: 'public, max-age=31536000, immutable'
                                };
                                await uploadString(storageRef, base64, 'data_url', metadata);
                                return await getDownloadURL(storageRef);
                            } catch (e) {
                                console.warn(`Direct upload notice for active logo ${slot}:`, e);
                            }
                            return base64;
                        }
                    }
                    return null;
                };

                const uploadIfBase64 = async (base64OrUrl: string | null, id: string, type: string) => {
                    if (!base64OrUrl || typeof base64OrUrl !== 'string') return null;
                    if (base64OrUrl.startsWith('http')) return base64OrUrl;
                    if (base64OrUrl.startsWith('/assets/')) return base64OrUrl;
                    if (!base64OrUrl.startsWith('data:')) return null;
                    try {
                        const timestamp = Date.now();
                        const folder = (type === 'mech' || type === 'print') ? 'print' : 'web';
                        const storageRef = ref(storage, `btp_mockups/${sid}/${folder}/${id}_${type}_${timestamp}.png`);
                        const match = base64OrUrl.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,/);
                        const contentType = match ? match[1] : 'image/png';
                        const metadata: UploadMetadata = {
                            contentType,
                            cacheControl: 'public, max-age=31536000, immutable'
                        };
                        await uploadString(storageRef, base64OrUrl, 'data_url', metadata);
                        return await getDownloadURL(storageRef);
                    } catch (e) {
                        console.warn(`Direct upload notice for ${type} for ${id}:`, e);
                    }
                    return base64OrUrl;
                };

                const urlA = await getActiveLogoUrl(lA, 'A');
                const urlB = await getActiveLogoUrl(lB, 'B');

                // Map and upload any base64 mockup images
                const uploadedMockups = await Promise.all(currentMockups.map(async m => {
                    const slot = placements[m.id] || 'A';
                    const logo = slot === 'A' ? lA : lB;
                    const activeAi = m.aiRemastered || m.ai;

                    const [aiUrl, mechUrl] = await Promise.all([
                        uploadIfBase64(activeAi, m.id, 'ai'),
                        uploadIfBase64(m.mechanical, m.id, 'mech')
                    ]);

                    return {
                        id: m.id || "",
                        title: m.title || "",
                        garment: m.garment || "",
                        view: m.view || "",
                        selected: !!m.selected,
                        ai: aiUrl || (activeAi && !activeAi.startsWith('data:') ? activeAi : null),
                        aiRemastered: aiUrl || (activeAi && !activeAi.startsWith('data:') ? activeAi : null),
                        mechanical: mechUrl || (m.mechanical && !m.mechanical.startsWith('data:') ? m.mechanical : null),
                        base: m.base || ""
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
                    logoUrl: urlA || urlB || "", // Provide for ProductPortal.tsx
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
                    logoOriginalUrl: lA.original || lB.original || "",
                    logoAdaptedUrl: urlA || urlB || "",
                    accentColor: placements?.accentColor || "#ea580c",
                    items: uploadedMockups.map((m: any) => {
                        const isBack = m.view === 'back';
                        const aiCandidate = m.aiRemastered || m.ai || null;
                        const front = aiCandidate || m.frontImageUrl || m.base || "";
                        const back = m.mechanical || m.backImageUrl || "";
                        return {
                            id: m.id,
                            title: m.title,
                            price: m.id.includes('basic') ? 25 : 39,
                            imageFront: front,
                            frontImageUrl: front,
                            imageBack: back,
                            backImageUrl: back,
                            imageUrl: isBack ? back : front,
                            ai: aiCandidate,
                            aiRemastered: aiCandidate,
                            selected: !!m.selected,
                            garment: m.garment || ""
                        };
                    }),
                    status: 'pending',
                    userEmail: uData.email || null,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };

                await setDoc(doc(db, 'anonymous_previews', pId), sanitizeForFirestore(previewData), { merge: true });

                const tshirtMock = uploadedMockups.find(m => m.garment === 'tshirt' || m.id === 'tFront' || m.id?.includes('tshirt'));
                const poloMock = uploadedMockups.find(m => m.garment === 'polo' || m.id === 'pFront' || m.id?.includes('polo'));
                const hoodieMock = uploadedMockups.find(m => m.garment === 'sweat' || m.garment === 'hoodie' || m.id === 'hFront' || m.id?.includes('hoodie') || m.id?.includes('sweat'));

                const productsSchema = {
                    tshirt: { aiImageUrl: tshirtMock?.ai || null },
                    polo: { aiImageUrl: poloMock?.ai || null },
                    hoodie: { aiImageUrl: hoodieMock?.ai || null }
                };

                try {
                    const siteConfigRef = doc(db, 'SiteConfigs', sid);
                    await setDoc(siteConfigRef, sanitizeForFirestore({
                        products: productsSchema,
                        mockups: uploadedMockups,
                        items: uploadedMockups,
                        logoUrl: urlA || urlB || "",
                        logoAdaptedUrl: urlA || urlB || "",
                        updatedAt: new Date().toISOString()
                    }), { merge: true });
                } catch (scErr) {
                    console.warn("SiteConfigs sync error in BtpLandingPage:", scErr);
                }

                setPreviewId(pId);
            } catch (cloudErr) {
                console.warn("Firestore live sync failed:", cloudErr);
            }

        } catch (e) {
            console.error("Audit Persistence Error:", e);
        }
    }, [sessionId]);
    saveSessionRef.current = saveSession;

    const initializeMockups = useCallback(() => {
        return [
            // CLASSIC BLACK
            { id: 'tBack', title: 'T-shirt Noir DOS', base: "/assets/tshirt-black-JHK170-dos.png?v=V24", ai: null, isGenerating: false, view: 'back' as const, garment: 'tshirt' as const, mechanical: null, model: "/assets/models/male_tshirt_back.png", selected: true },
            { id: 'tFront', title: 'T-shirt Noir FACE', base: "/assets/tshirt-black-JHK170.png?v=V24", ai: null, isGenerating: false, view: 'front' as const, garment: 'tshirt' as const, mechanical: null, model: "/assets/models/male_tshirt_front.png", selected: true },
            
            // T-SHIRT BASIC (GREY)
            { id: 'tbBack', title: 'T-shirt Basic DOS', base: "/assets/tshirt-grey-JHK170-dos.png?v=V24", ai: null, isGenerating: false, view: 'back' as const, garment: 'tshirt_basic' as const, mechanical: null, model: "/assets/models/male_tshirt_back.png", selected: true },
            { id: 'tbFront', title: 'T-shirt Basic FACE', base: "/assets/tshirt-grey-JHK170.png?v=V24", ai: null, isGenerating: false, view: 'front' as const, garment: 'tshirt_basic' as const, mechanical: null, model: "/assets/models/male_tshirt_front.png", selected: true },
            
            // FLUO T-SHIRT (Replaces Safety Vest)
            { id: 'vBack', title: 'T-shirt Fluo DOS', base: "/assets/tshirt-fluo-grey-back.jpg?v=V24", ai: null, isGenerating: false, view: 'back' as const, garment: 'tshirt_bicolore' as const, mechanical: null, model: "/assets/models/tshirt_back.png", selected: true },
            { id: 'vFront', title: 'T-shirt Fluo FACE', base: "/assets/tshirt-fluo-grey-front.jpg?v=V24", ai: null, isGenerating: false, view: 'front' as const, garment: 'tshirt_bicolore' as const, mechanical: null, model: "/assets/models/tshirt_front.png", selected: true },

            // POLO
            { id: 'pBack', title: 'Polo Noir DOS', base: "/assets/polo-black-JHK510-dos.png?v=V24", ai: null, isGenerating: false, view: 'back' as const, garment: 'polo' as const, mechanical: null, model: "/assets/polo-black-JHK510-dos.png", selected: true },
            { id: 'pFront', title: 'Polo Noir FACE', base: "/assets/polo-black-JHK510.png?v=V24", ai: null, isGenerating: false, view: 'front' as const, garment: 'polo' as const, mechanical: null, model: "/assets/polo-black-JHK510.png", selected: true },

            // HOODIE
            { id: 'hBack', title: 'Hoodie Noir DOS', base: "/assets/hoodie-black-JHK421-dos.png?v=V24", ai: null, isGenerating: false, view: 'back' as const, garment: 'sweat' as const, mechanical: null, model: "/assets/models/male_hoodie_back.png", selected: true },
            { id: 'hFront', title: 'Hoodie Noir FACE', base: "/assets/hoodie-black-JHK421.png?v=V24", ai: null, isGenerating: false, view: 'front' as const, garment: 'sweat' as const, mechanical: null, model: "/assets/models/male_hoodie_front.png", selected: true },

            // MARKETING ASSETS
            { id: 'cardFront', title: 'Carte Visite RECTO', base: "/assets/card-base.svg", ai: null, isGenerating: false, view: 'front' as const, garment: 'business_card' as const, mechanical: null, model: "/assets/models/card_mockup_front_neutral.png", selected: true },
            { id: 'cardBack', title: 'Carte Visite VERSO', base: "/assets/card-base.svg", ai: null, isGenerating: false, view: 'back' as const, garment: 'business_card' as const, mechanical: null, model: "/assets/models/card_mockup_back.png", selected: true }
        ];
    }, []);

    const processLogoDeterministic = (base64: string, shouldInvert: boolean = true, blackFilter: boolean = false): Promise<string> => {
        return new Promise((resolve) => {
            const img = new Image();
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

                        // SAFETY: If background removal would kill almost everything, 
                        // we keep it to avoid deleting a logo that might be misidentified as background.
                        // Increased to 0.99 to allow removal for small logos.
                        if (deletedPixels / (data.length / 4) < 0.99) {
                            for (let i = 0; i < data.length; i += 4) {
                                const r = data[i], g = data[i+1], b = data[i+2];
                                const dist = Math.sqrt(Math.pow(r - targetR, 2) + Math.pow(g - targetG, 2) + Math.pow(b - targetB, 2));
                                const isNoisyDark = isBlackBg && (r + g + b < 25);
                                if (dist < tolerance || isNoisyDark) {
                                    data[i + 3] = 0;
                                } else {
                                    // Clean any black screenshot bars or phone interface artifacts in the outer margins
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

                // 2. SOLID WHITE CONVERSION
                let isAlreadyWhite = false;
                let totalVis = 0;
                let whiteVis = 0;
                for (let i = 0; i < data.length; i += 4) {
                    if (data[i + 3] > 20) {
                        totalVis++;
                        if (data[i] > 200 && data[i + 1] > 200 && data[i + 2] > 200) whiteVis++;
                    }
                }
                // Increased threshold to 30% to ensure dark logos with minor white details still get reinforced
                isAlreadyWhite = totalVis > 0 && (whiteVis / totalVis > 0.30);

                if (shouldInvert) {
                    if (!blackFilter) {
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
                                    data[i] = 255; data[i + 1] = 255; data[i + 2] = 255;
                                } else {
                                    if (r < 35 && g < 35 && b < 35) {
                                        data[i + 3] = 0;
                                    } else {
                                        data[i] = 255; data[i + 1] = 255; data[i + 2] = 255;
                                    }
                                }
                            }
                        }
                    } else {
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

                // 3. THIN LINE REINFORCEMENT (Disabled to preserve letter spacing and prevent clogging gaps)
                /* 
                Dilation removed because it expands letter edges and closes thin gaps between characters.
                */

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
            const timeout = setTimeout(() => reject(new Error("Timeout loading image")), 10000);
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => { clearTimeout(timeout); resolve(img); };
            img.onerror = (e) => { clearTimeout(timeout); reject(new Error(`Failed to load image at ${url}`)); };
            img.src = url;
        });
    };

    const generateMechanicalMockup = async (garmentUrl: string, logoUrl: string, view: 'front' | 'back', customScale?: number, garmentType?: string) => {
        try {
            if (garmentType === 'business_card' || garmentType === 'banner') {
                const isCard = garmentType === 'business_card';
                const isBanner = garmentType === 'banner';
                
                const canvas = document.createElement('canvas');
                
                if (isCard) {
                    canvas.width = 1050; // Standard business card ratio
                    canvas.height = 600;
                } else {
                    canvas.width = 800;
                    canvas.height = 800;
                }
                const ctx = canvas.getContext('2d')!;
                
                let baseColor = assetColor || (isLightMode ? '#ffffff' : '#050505');
                if (isCard) {
                    baseColor = '#111111'; // Force dark card background to match the mockup model
                }
                
                const cardW = isCard ? 1050 : 700;
                const cardH = isCard ? 600 : 230;
                const x = isCard ? 0 : (800 - cardW) / 2;
                const y = isCard ? 0 : (800 - cardH) / 2;

                if (isCard) {
                    // Just fill the canvas with the baseColor
                    ctx.fillStyle = baseColor;
                    ctx.fillRect(0, 0, cardW, cardH);
                } else {
                    // Background for Banner
                    ctx.fillStyle = isLightMode ? '#ffffff' : '#0a0a0a';
                    ctx.fillRect(0, 0, 800, 800);
                    
                    // Mockup Border/Shadow
                    ctx.strokeStyle = isLightMode ? '#eeeeee' : '#1a1a1a';
                    ctx.lineWidth = 15;
                    ctx.strokeRect(10, 10, 780, 780);

                    // The Banner Shape
                    ctx.fillStyle = baseColor;
                    ctx.shadowColor = 'rgba(0,0,0,0.5)';
                    ctx.shadowBlur = 40;
                    ctx.fillRect(x, y, cardW, cardH);
                    ctx.shadowBlur = 0;
                }

                // === BUSINESS CARD RECTO (FRONT): Logo centered with emboss ===
                if (isCard && view === 'front') {
                    // Centered Logo with EMBOSS / RELIEF effect
                    if (logoUrl) {
                        const imgLogo = await loadImage(logoUrl);
                        const maxLogoW = cardW * (customScale || 0.50);
                        const maxLogoH = cardH * (customScale || 0.50);
                        const logoRatio = imgLogo.width / imgLogo.height;
                        let logoW = maxLogoW;
                        let logoH = logoW / logoRatio;
                        if (logoH > maxLogoH) { logoH = maxLogoH; logoW = logoH * logoRatio; }
                        const logoX = x + (cardW - logoW) / 2;
                        const logoY = y + (cardH - logoH) / 2 - 10;

                        // EMBOSS PASS 1: Dark shadow (bottom-right) — depth illusion
                        ctx.save();
                        ctx.shadowColor = 'rgba(0,0,0,0.25)';
                        ctx.shadowBlur = 6;
                        ctx.shadowOffsetX = 3;
                        ctx.shadowOffsetY = 3;
                        ctx.globalAlpha = 0.5;
                        ctx.drawImage(imgLogo, logoX, logoY, logoW, logoH);
                        ctx.restore();

                        // EMBOSS PASS 2: Bright highlight (top-left) — raised edge
                        ctx.save();
                        ctx.shadowColor = 'rgba(255,255,255,0.8)';
                        ctx.shadowBlur = 4;
                        ctx.shadowOffsetX = -2;
                        ctx.shadowOffsetY = -2;
                        ctx.globalAlpha = 0.3;
                        ctx.drawImage(imgLogo, logoX, logoY, logoW, logoH);
                        ctx.restore();

                        // EMBOSS PASS 3: Main logo (sharp, full opacity)
                        ctx.save();
                        ctx.shadowColor = 'rgba(0,0,0,0.12)';
                        ctx.shadowBlur = 10;
                        ctx.shadowOffsetX = 0;
                        ctx.shadowOffsetY = 4;
                        ctx.globalAlpha = 1.0;
                        ctx.drawImage(imgLogo, logoX, logoY, logoW, logoH);
                        ctx.restore();
                    }
                }

                // === BUSINESS CARD VERSO (BACK): Company info + QR code ===
                else if (isCard && view === 'back') {

                    // Company Name (large, left-aligned)
                    let textY = y + 80;
                    ctx.textAlign = 'left';
                    if (userData.companyName) {
                        ctx.fillStyle = '#f0f0f0'; // Always light text on dark card
                        ctx.font = `900 36px Inter, sans-serif`;
                        ctx.fillText(userData.companyName.toUpperCase(), x + 40, textY);
                        textY += 40;
                    }

                    // Activity sector
                    if (userData.activity) {
                        ctx.fillStyle = '#f97316';
                        ctx.font = `italic 700 18px Inter, sans-serif`;
                        ctx.fillText(userData.activity.toUpperCase(), x + 40, textY);
                        textY += 35;
                    }

                    // Decorative Line
                    ctx.strokeStyle = '#333333'; // Always dark line on dark card
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(x + 40, textY);
                    ctx.lineTo(x + 350, textY);
                    ctx.stroke();
                    textY += 25;

                    // Contact details
                    ctx.fillStyle = '#999999'; // Always light text
                    ctx.font = `600 18px Inter, sans-serif`;
                    if (userData.phone) {
                        ctx.fillText(userData.phone, x + 40, textY);
                        textY += 32;
                    }
                    if (userData.email) {
                        ctx.fillText(userData.email.toLowerCase(), x + 40, textY);
                        textY += 32;
                    }
                    if (userData.website) {
                        ctx.fillStyle = '#f97316';
                        ctx.font = `bold 16px Inter, sans-serif`;
                        ctx.fillText(userData.website.toUpperCase(), x + 40, textY);
                    }

                    // QR Code (right side of the card)
                    try {
                        const urlParams = new URLSearchParams(window.location.search);
                        const uid = urlParams.get('uid');
                        const portalUrl = uid ? `${window.location.origin}/?uid=${uid}` : window.location.origin;
                        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(portalUrl)}&bgcolor=${baseColor.replace('#', '')}&color=f97316`;
                        const qrImg = await loadImage(qrUrl);
                        const qrSize = 160;
                        ctx.drawImage(qrImg, x + cardW - qrSize - 40, y + (cardH - qrSize) / 2, qrSize, qrSize);
                        
                        // Label under QR
                        ctx.fillStyle = '#666666';
                        ctx.font = `600 10px Inter, sans-serif`;
                        ctx.textAlign = 'center';
                        ctx.fillText('SCANNER POUR ACCÉDER', x + cardW - qrSize / 2 - 40, y + (cardH + qrSize) / 2 + 20);
                        ctx.textAlign = 'left';
                    } catch (qrErr) {
                        console.warn('QR Code generation failed:', qrErr);
                    }
                }

                // === BANNER: Keep existing logic ===
                else if (isBanner) {
                    // Sidebar Accent
                    ctx.fillStyle = '#f97316';
                    ctx.fillRect(x, y, 15, cardH);

                    // Add Logo
                    if (logoUrl) {
                        const imgLogo = await loadImage(logoUrl);
                        const logoScale = 0.25;
                        const logoW = cardW * logoScale;
                        const logoH = logoW * (imgLogo.height / imgLogo.width);
                        ctx.drawImage(imgLogo, x + 50, y + (cardH - logoH) / 2, logoW, logoH);
                    }

                    // Add Text Info
                    ctx.fillStyle = isLightMode ? '#111111' : '#f0f0f0';
                    ctx.textAlign = 'right';
                    let textY = y + 90;
                    const lineHeight = 55;

                    if (userData.companyName) {
                        ctx.font = `900 55px Inter, sans-serif`;
                        ctx.fillText(userData.companyName.toUpperCase(), x + cardW - 50, textY);
                        textY += lineHeight + 15;
                    }
                    ctx.font = `italic 800 28px Inter, sans-serif`;
                    ctx.fillStyle = '#f97316';
                    if (userData.activity) {
                        ctx.fillText(userData.activity.toUpperCase(), x + cardW - 50, textY);
                        textY += lineHeight + 10;
                    }
                    ctx.fillStyle = isLightMode ? '#555555' : '#888888';
                    ctx.font = `600 24px Inter, sans-serif`;
                    if (userData.phone) {
                        ctx.fillText(userData.phone, x + cardW - 50, textY);
                        textY += lineHeight;
                    }
                    if (userData.email) {
                        ctx.fillText(userData.email.toLowerCase(), x + cardW - 50, textY);
                    }
                }

                return canvas.toDataURL('image/png');
            }

            const [imgGarment, imgLogo] = await Promise.all([
                loadImage(garmentUrl),
                loadImage(logoUrl)
            ]);

            const canvas = document.createElement('canvas');
            const ratio = imgGarment.height / imgGarment.width;
            canvas.width = 800;
            canvas.height = 800 * ratio;

            const ctx = canvas.getContext('2d');
            if (!ctx) return logoUrl;

            // CRITICAL: Disable smoothing to keep text edges razor sharp
            ctx.imageSmoothingEnabled = false;

            // 1. Dessiner le vêtement
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            if (garmentType === 'tshirt_basic') {
                ctx.filter = 'brightness(35%) contrast(120%)';
            }
            ctx.drawImage(imgGarment, 0, 0, canvas.width, canvas.height);
            if (garmentType === 'tshirt_basic') {
                ctx.filter = 'none';
            }

            // 2. Détecter le type de vêtement pour le placement
            const isSweat = garmentUrl.includes('hoodie');
            const type = (garmentType || (isSweat ? 'sweat' : 'tshirt')) as keyof typeof PLACEMENTS;
            const pos = PLACEMENTS[type][view];
            
            let scale = pos.scale;
            if (customScale !== undefined) {
                if (customScale === 1.0) {
                    scale = pos.scale;
                } else {
                    const defaultSliderVal = view === 'front' ? 0.20 : 0.40;
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

            // 5. EXPORT AT UNIFIED SQUARE (800x800)
            const targetSize = 800;
            const exportCanvas = document.createElement('canvas');
            exportCanvas.width = targetSize;
            exportCanvas.height = targetSize;
            const exportCtx = exportCanvas.getContext('2d')!;
            exportCtx.clearRect(0, 0, targetSize, targetSize);

            const scaleFactor = Math.min(targetSize / canvas.width, targetSize / canvas.height);
            const scaledW = canvas.width * scaleFactor;
            const scaledH = canvas.height * scaleFactor;
            const dx = (targetSize - scaledW) / 2;
            const dy = (targetSize - scaledH) / 2;

            exportCtx.drawImage(canvas, 0, 0, canvas.width, canvas.height, dx, dy, scaledW, scaledH);
            return exportCanvas.toDataURL('image/png');
        } catch (e) {
            console.error("Mechanical Mockup Error:", e);
            return logoUrl;
        }
    };

    const compressImage = (base64: string, maxEdge: number = 800): Promise<string> => {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error("Timeout compression image")), 15000);
            const img = new Image();
            img.onerror = () => { clearTimeout(timeout); reject(new Error("Erreur chargement image")); };
            img.onload = () => {
                clearTimeout(timeout);
                const canvas = document.createElement('canvas');
                const scale = Math.min(maxEdge / img.width, maxEdge / img.height);
                canvas.width = img.width * scale;
                canvas.height = img.height * scale;
                const ctx = canvas.getContext('2d')!;
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', 0.85));
            };
            img.src = base64;
        });
    };

    const fetchBase64 = async (url: string, retries = 2): Promise<string> => {
        if (!url) throw new Error("URL vide");
        if (url.startsWith('data:image') || url.startsWith('data:')) {
            return url;
        }

        let lastError: any = null;
        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 12000);
                const response = await fetch(url, { signal: controller.signal });
                clearTimeout(timeoutId);

                if (!response.ok) throw new Error(`HTTP ${response.status} sur ${url}`);
                const blob = await response.blob();
                return await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                });
            } catch (e) {
                lastError = e;
                if (attempt < retries) {
                    await new Promise(r => setTimeout(r, 600 * (attempt + 1)));
                }
            }
        }
        console.warn(`[fetchBase64] Échec après ${retries + 1} tentatives sur ${url}:`, lastError);
        throw lastError;
    };

    const startSequentialPipeline = async (customUserData?: UserData, singleId?: string | string[], initialMockups?: MockupItem[]) => {
        const u = customUserData || userData;
        const addLog = (msg: string) => setAuditLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`].slice(-8));
        let currentLocalMockups = initialMockups || mockups;

        const updateItem = async (id: string, ai: string | null, loading: boolean, mechanical?: string | null) => {
            setMockups(prev => {
                const next = prev.map(it => it.id === id ? { ...it, ai, isGenerating: loading, mechanical: mechanical !== undefined ? mechanical : it.mechanical } : it);
                saveSession(logoA, logoB, logoPlacements, u, next);
                return next;
            });
            currentLocalMockups = currentLocalMockups.map(it => it.id === id ? { ...it, ai, isGenerating: loading, mechanical: mechanical !== undefined ? mechanical : it.mechanical } : it);
            
            if (ai && sessionId) {
                await dbSet(`${sessionId}_ai_${id}`, ai);
            }
        };

        try {
            // V24 DYNAMIC PIPELINE: Use mockups from state
            const itemsToProc = singleId 
                ? (Array.isArray(singleId) ? currentLocalMockups.filter(x => singleId.includes(x.id)) : currentLocalMockups.filter(x => x.id === singleId))
                : currentLocalMockups.filter(x => x.selected);

            for (const it of itemsToProc) {
                try {
                    const logoToUse = getActiveLogoForPlacement(it.id);
                    if (!logoToUse) continue;

                    // SPECIAL PIPELINE FOR CARDS
                    if (it.garment === 'business_card') {
                        updateItem(it.id, null, true);
                        addLog(`GABARIT CDV (${it.view.toUpperCase()})...`);
                        const mechanical = await generateMechanicalMockup(it.base, logoToUse, it.view, 1.0, it.garment);
                        
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
                                'artistic',
                                'gemini-3.6-flash',
                                u.companyName
                            );

                            addLog(`RENDU IA TERMINÉ (${it.id}).`);
                            updateItem(it.id, aiResult, false, mechanical);
                        } catch (aiErr: any) {
                            console.warn('AI Studio failed, falling back to mechanical', aiErr);
                            addLog(`[!] ÉCHEC STUDIO : ${aiErr?.message || 'Erreur inconnue'}`);
                            updateItem(it.id, mechanical, false, mechanical);
                        }
                        continue;
                    }


                    updateItem(it.id, null, true); // Mark as loading
                    addLog(`ÉTAPE 1: GABARIT...`);

                    const techScale = it.view === 'front' ? logoScaleFront : logoScaleBack;
                    const mechanicalBase64 = await generateMechanicalMockup(it.base, logoToUse, it.view, techScale, it.garment);
                    addLog(`ÉTAPE 2: MANNEQUIN...`);

                    if (!it.model) throw new Error(`Modèle manquant pour ${it.id}`);
                    const rawModel = await fetchBase64(it.model);
                    const modelBase64 = await compressImage(rawModel, 1024); // Smaller mannequin
                    addLog(`ÉTAPE 3: TRANSMISSION IA...`);

                    let garmentLabel = 'Plain Black Hoodie';
                    if (it.garment === 'tshirt') garmentLabel = 'Plain Black T-shirt';
                    else if (it.garment === 'tshirt_basic') garmentLabel = 'Plain Dark Grey T-shirt';
                    else if (it.garment === 'polo') garmentLabel = 'Plain Black Polo Shirt';
                    else if (it.garment === 'tshirt_bicolore') garmentLabel = 'High-Visibility Two-Tone Fluorescent Yellow T-shirt with reflective bands';
                    else if (it.garment === 'veste') garmentLabel = 'High-Visibility Fluorescent Safety Vest';
                    
                    const slot = logoPlacements[it.id] || 'A';
                    const logoObj = slot === 'A' ? logoA : logoB;
                    const logoToUseMode = logoObj.mode;
                    
                    const isBtpSector = (u.activity || 'BTP').toUpperCase().match(/BTP|CONSTRUCTION|BÂTIMENT|BATIMENT/);
                    let contextPrompt = logoToUseMode === 'remastered' 
                      ? `v-ton_direct. 
                         REMASTERING IA SIGNAID PRO.
                         ${isBtpSector 
                           ? `STRICT FLAT DESIGN : Aucun dégradé, aucune ombre.
                              COULEUR : Utiliser le BLANC PUR par défaut. Si couleur nécessaire, utiliser uniquement la teinte LA PLUS CLAIRE du logo d'origine.`
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

                    const isSlotB = (logoPlacements[it.id] === 'B') || (slot === 'B');
                    const compUpper = (u.companyName || '').trim().toUpperCase();

                    if (isSlotB) {
                        contextPrompt += `\nSTRICT NO-TEXT INSTRUCTION: DO NOT render, invent, or add ANY text, typography, letters, or company name on this garment. Render ONLY the visual symbol/icon/graphic element provided in the reference image. The output must have ZERO text.`;
                    } else if (compUpper) {
                        contextPrompt += `\nSTRICT LOGO TEXT & SPELLING INSTRUCTION: The company logo/branding text is exactly "${compUpper}". The text rendered on the garment MUST have this exact literal spelling character-by-character. Do NOT spell it as "${compUpper.replace(/AE/g, 'A')}" or miss any letters. Every single letter in "${compUpper}" must be rendered perfectly sharp, clear, and perfectly readable.`;
                    }

                    const framingInstruction = `
STRICT FRAMING & APPAREL VISIBILITY:
- MEDIUM SHOT / WAIST-UP SHOT: The camera MUST capture the ENTIRE garment from collar/shoulders down to below the waist hemline.
- COMPLETE GARMENT DISPLAY: The bottom edge, sleeves, and sides of the garment MUST be 100% visible inside the frame. ZERO tight close-up, ZERO extreme head zoom.
- 1:1 SQUARE COMPOSITION: The subject and the garment must be perfectly centered within a square 1:1 frame with balanced margins around the torso.
`;

                    const poseDesc = it.view === 'back'
                        ? `The model is standing completely facing AWAY from the camera (180-degree rear view). We see the back of the head and the back of the neck, with ZERO facial profile visible. CRITICAL: Maintain a medium shot so the full back of the ${garmentLabel} is completely visible from neck to waist.`
                        : `The model is viewed straight from the front in a medium studio shot, showing the entire front of the ${garmentLabel}.`;

                    contextPrompt += `\n${poseDesc}\n${framingInstruction}`;

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
                        'v-ton',
                        'gemini-3.6-flash',
                        isSlotB ? "" : (u.companyName || "")
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

                } catch (err: any) {
                    console.error(`Error generating ${it.id}:`, err);
                    addLog(`[!] ERREUR ${it.id.toUpperCase()}: ${err.message || 'Inconnue'}`);
                    updateItem(it.id, null, false);
                }

                // Délai de 1,5 seconde entre chaque génération pour respecter les quotas RPM
                await new Promise(r => setTimeout(r, 1500));
            }
            setIsRegenerating(false);
            setState('RESULT');
        } catch (e) { setIsRegenerating(false); }
    };

    const handleUpload = async (file: File, slot: 'A' | 'B' = 'A') => {
        const reader = new FileReader();
        reader.onload = async () => {
            const base64 = reader.result as string;
            setStatusMessage(`ANALYSE DU LOGO ${slot}...`);
            setIsAnalyzing(true);

            try {
                const [original, adapted, adaptedBlack, analysis] = await Promise.all([
                    processLogoDeterministic(base64, false, false), // No inversion
                    processLogoDeterministic(base64, true, false),  // Industrial inversion (white)
                    processLogoDeterministic(base64, true, true),   // Industrial inversion (black)
                    geminiService.analyzeLogoBranding(base64)
                ]);

                const newLogoA: BtpLogo = { id: 'A', original, adapted, adaptedBlack, remastered: null, mode: 'adapted' };
                const newLogoB: BtpLogo = { id: 'B', original, adapted, adaptedBlack, remastered: null, mode: 'adapted' };

                setLogoA(newLogoA);
                setLogoB(newLogoB);
                setLogoAnalysis(analysis);

                setStatusMessage("CALIBRAGE DES GABARITS BTP...");

                if (state === 'LANDING') {
                    setState('CLEAN_CHECK');
                }

                await saveSession(
                    newLogoA,
                    newLogoB,
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
            const adapted = await processLogoDeterministic(logoA.original, true, false);
            const adaptedBlack = await processLogoDeterministic(logoA.original, true, true);
            const cleaned = await processLogoDeterministic(logoA.original, false, false);
            const nextLogoA = { ...logoA, original: cleaned, adapted, adaptedBlack };
            setLogoA(nextLogoA);
        }
        // 2. Re-process logo B
        if (logoB.original) {
            const adapted = await processLogoDeterministic(logoB.original, true, false);
            const adaptedBlack = await processLogoDeterministic(logoB.original, true, true);
            const cleaned = await processLogoDeterministic(logoB.original, false, false);
            const nextLogoB = { ...logoB, original: cleaned, adapted, adaptedBlack };
            setLogoB(nextLogoB);
        }
        setStatusMessage("");
    };

    const fileToBase64 = (blob: Blob): Promise<string> => new Promise((resolve) => {
        const r = new FileReader();
        r.onloadend = () => resolve(r.result as string);
        r.readAsDataURL(blob);
    });

    const handleCropConfirm = async (croppedBase64: string, targetSlot: 'A' | 'B' = cropTargetSlot) => {
        setShowCropModal(false);
        setStatusMessage(`TRAITEMENT DU LOGO ${targetSlot} (ROGNAGE / RECADRAGE)...`);
        setIsAnalyzing(true);
        try {
            const [original, adapted, adaptedBlack] = await Promise.all([
                processLogoDeterministic(croppedBase64, false, false),
                processLogoDeterministic(croppedBase64, true, false),
                processLogoDeterministic(croppedBase64, true, true),
            ]);
            
            if (targetSlot === 'A') {
                const newLogoA: BtpLogo = { id: 'A', original, adapted, adaptedBlack, remastered: null, mode: logoA.mode || 'original' };
                setLogoA(newLogoA);
                const resetMockups = mockups.map(m => ({ ...m, aiRemastered: null }));
                setMockups(resetMockups);
                saveSession(newLogoA, logoB, logoPlacements, userData, resetMockups);
            } else {
                const newLogoB: BtpLogo = { id: 'B', original, adapted, adaptedBlack, remastered: null, mode: logoB.mode || logoA.mode || 'original' };
                setLogoB(newLogoB);
                const resetMockups = mockups.map(m => ({ ...m, aiRemastered: null }));
                setMockups(resetMockups);
                saveSession(logoA, newLogoB, logoPlacements, userData, resetMockups);
            }
        } catch (err) {
            console.error("Crop error:", err);
        } finally {
            setIsAnalyzing(false);
            setStatusMessage("");
        }
    };

    const handleAiRemaster = async (slot: 'A' | 'B') => {
        if (!userData.email) {
            setShowAuthModal(true);
            return;
        }

        const logo = slot === 'A' ? logoA : logoB;
        if (!logo.original) return;

        try {
            setRemasterStep("ANALYSE DE L'IMAGE DE MARQUE ACTUELLE...");
            await new Promise(r => setTimeout(r, 2200));
            
            setRemasterStep("CONCERTATION AVEC LES STANDARDS DE PRODUCTION DTF...");
            await new Promise(r => setTimeout(r, 2000));
            setRemasterStep("ANALYSE DE LA FORME ET DES CONTOURS DU LOGO...");
            await new Promise(r => setTimeout(r, 1500));
            
            setRemasterStep("REFONTE EN COURS...");
            
            // APPEL RÉEL À L'IA
            let rawRemastered = await removeBackground(logo.original!); 
            if (rawRemastered === logo.original) {
                setRemasterStep("ÉCHEC DU SERVEUR, PASSAGE SUR GEMINI IA...");
                await new Promise(r => setTimeout(r, 1000));
                rawRemastered = await geminiService.remasterLogo(logo.original!);
            }
            
            // Suppression du fond blanc (cas fallback Gemini) - conserve les couleurs d'origine
            const remastered = await processLogoDeterministic(rawRemastered, false, false);
            const adaptedRemastered = await processLogoDeterministic(rawRemastered, true, false);
            const adaptedBlackRemastered = await processLogoDeterministic(rawRemastered, true, true);
            
            const setter = slot === 'A' ? setLogoA : setLogoB;
            setter(prev => ({ 
                ...prev, 
                remastered, 
                adaptedRemastered, 
                adaptedBlackRemastered, 
                mode: 'remastered' 
            }));
        } catch (e) {
            console.error("AI Remaster Error:", e);
            alert("Erreur lors de la modernisation du logo. Veuillez réessayer.");
        } finally {
            setRemasterStep(null);
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

        // Sync config with the selected logo and merch URL immediately in the background
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
                    
                    // Sync user profile updates to administrative config
                    if (userData.companyName) config.companyName = userData.companyName;
                    if (userData.email) {
                        config.contactEmail = userData.email;
                    }
                    if (userData.activity) {
                        config.activitySector = userData.activity;
                        config.sector = userData.activity;
                    }
                    if (userData.phone) {
                        config.whatsappNumber = userData.phone;
                    }
                    if (userData.website) {
                        config.address = userData.website;
                    }
                    
                    await saveStoredConfig(config, uidParam);
                }
            } catch (err) {
                console.error("Failed to sync logo on simulation click:", err);
            }
        }

        setMockups(mockups); 
        setState('AUDIT');
        startSequentialPipeline(undefined, undefined, mockups).then(() => {
            setTimeout(() => {
                const resultsElement = document.getElementById('simulation-results');
                if (resultsElement) resultsElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 1000);
        });
    };

    const handleContinueToSimulation = () => {
        setState('AUDIT');
        startSequentialPipeline(undefined, undefined, mockups);
    };

    const handleAuthSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const email = formData.get('email') as string;

        // SYNC CREDITS WITH ACCOUNT
        let userCredits = credits;
        if (email === 'logosigneed@gmail.com' || email.toLowerCase() === 'lb-peinture@gmail.com') {
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
        localStorage.setItem('btp_last_email', email);
        localStorage.setItem(`btp_user_data_${email}`, JSON.stringify(newUserData));

        saveSession(logoA, logoB, logoPlacements, newUserData, mockups);

        if (state === 'CLEAN_CHECK' && isBatConfirmed) {
            startSimulation();
        } else if (state === 'RESULT' && logoA.original) {
            startSequentialPipeline(newUserData);
        }
    };

    if (!isLoaded) {
        return (
            <div className="fixed inset-0 bg-[#020202] flex flex-col items-center justify-center gap-8 z-[9999]">
                <div className="w-16 h-16 bg-orange-600 flex items-center justify-center font-black text-black text-3xl shadow-[8px_8px_0_white] animate-pulse">S</div>
                <div className="text-orange-600 font-black text-[10px] tracking-[0.5em] uppercase italic animate-pulse">Initialisation Système Signaid</div>
            </div>
        );
    }

    return (
        <div className={`min-h-screen ${isLightMode ? 'bg-gray-50 text-gray-900' : 'bg-[#020202] text-zinc-100'} font-sans selection:bg-orange-500 selection:text-black italic uppercase transition-colors duration-500`}>
            <SEO title="BTP Authority | Session Monitor" description="Validation BAT industrielle sécurisée par UID." />

            <header className={`p-8 flex justify-between items-center max-w-7xl mx-auto border-b ${isLightMode ? 'border-gray-200' : 'border-white/5'}`}>
                <div onClick={() => { window.history.pushState({}, '', '/btp'); location.reload(); }} className="flex items-center gap-4 cursor-pointer">
                    <div className="w-10 h-10 bg-orange-600 flex items-center justify-center font-black text-black text-xl shadow-[4px_4px_0_white]">S</div>
                    <span className={`font-black text-xl tracking-tight ${isLightMode ? 'text-gray-900' : 'text-zinc-100'}`}>SIGNAID <span className="text-orange-600">BTP</span></span>
                </div>
                <div className="flex items-center gap-6">
                    {sessionId && <div className={`text-[10px] font-black tracking-widest ${isLightMode ? 'text-gray-400 bg-gray-100 border-gray-200' : 'text-zinc-800 bg-zinc-950 border-zinc-900'} px-3 py-1 border`}>ID: {sessionId.toUpperCase()}</div>}
                    <button 
                        onClick={() => {
                            const sector = userData.activity?.toLowerCase() || "";
                            if (sector.includes('btp')) window.location.href = '/btp-audit';
                            else if (sector.includes('creation') || sector.includes('créat')) window.location.href = '/creation';
                            else window.location.href = '/btp-audit'; // Default to generic high-end portal
                        }}
                        className={`px-5 py-2 border font-black text-[9px] tracking-widest hover:border-orange-600 transition-all ${isLightMode ? 'bg-white border-gray-200 text-gray-900' : 'bg-zinc-950 border-zinc-900 text-zinc-100'}`}
                    >
                        PORTAIL {userData.activity?.split(' ')[0].toUpperCase() || "PRODUITS"}
                    </button>
                    <button onClick={() => setShowAuthModal(true)} className={`px-5 py-2 border font-black text-[9px] tracking-widest hover:border-orange-600 transition-all ${isLightMode ? 'bg-white border-gray-200 text-gray-900' : 'bg-zinc-950 border-zinc-900 text-zinc-100'}`}>
                        CONFIG DOSSIER
                    </button>
                </div>
            </header>

            <main className="max-w-7xl mx-auto p-6">


                {(state === 'LANDING' || state === 'CLEAN_CHECK' || state === 'RESULT' || state === 'AUDIT' || state === 'SALES_AUDIT') && (
                    <div className="space-y-12 animate-reveal max-w-6xl mx-auto py-12">
                        
                        {/* 
                            V24 ARCHITECTURE : 
                            /btp       => MARKETING LANDING (Presentation)
                            /audit-btp => TECHNICAL TOOL (Upload/Audit)
                        */}

                        {/* V24 ARCHITECTURE: /btp handles marketing, /btp-audit starts here directly */}

                        {/* ÉTAPE 1 : CHARGEMENT (Technical Tool) */}
                        <div className="flex flex-col items-center justify-center space-y-12 mb-12">
                            {((state === 'LANDING' && isAuditPath) || (state === 'LANDING' && logoA.original)) && !logoA.original && (
                                <>
                                    <div className="text-center space-y-3">
                                        <h1 className="text-5xl md:text-[8rem] font-black tracking-tighter leading-none italic uppercase">Étape 1 : <br /><span className="text-orange-600">Chargement.</span></h1>
                                        <p className="text-zinc-600 font-bold text-xs tracking-[0.4em] uppercase italic">Audit technique DTF - Diagnostic de Chroma et Nettoyage HD</p>
                                    </div>
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

                                                        {userData.email === 'logosigneed@gmail.com' && state === 'LANDING' && !logoA.original && (
                                <button
                                    onClick={() => {
                                        setLogoA({ id: 'A', original: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', adapted: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', adaptedBlack: null, remastered: null, mode: 'original' });
                                        setState('CLEAN_CHECK');
                                    }}
                                    className="px-8 py-3 bg-zinc-900 text-zinc-500 font-black text-[10px] uppercase italic tracking-[0.3em] hover:text-orange-600 transition-all border border-zinc-800"
                                >
                                    [ ADMIN ] GÉNÉRER BASES VIERGES SANS LOGO
                                </button>
                            )}
                        </div>
                        <div className={`flex justify-between items-end border-b-2 border-orange-600 pb-6 group cursor-pointer`} onClick={() => setIsConfigOpen(!isConfigOpen)}>
                            <div className="space-y-2">
                                <h2 className={`text-6xl font-black italic tracking-tighter uppercase leading-none ${isLightMode ? 'text-gray-900' : 'text-zinc-100'}`}>Étape 1 : <span className="text-orange-600">Analyse du Logo</span></h2>
                                <p className={`text-[10px] font-black tracking-[0.5em] uppercase italic ${isLightMode ? 'text-gray-400' : 'text-zinc-500'}`}>Nettoyage textile noir • {isConfigOpen ? 'CLIQUEZ POUR RÉDUIRE' : 'CLIQUEZ POUR AGRANDIR'}</p>
                            </div>
                            <div className="flex items-center gap-3 bg-orange-600 text-black px-4 py-2 font-black text-[10px]">
                                {isConfigOpen ? <Layers size={16} /> : <Layout size={16} />}
                                {isConfigOpen ? 'CONFIGURATION ACTIVE' : 'CONFIGURATION RÉDUITE'}
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
                                                                onClick={() => { setLogoA({ ...logoA, mode: 'original' }); setLogoB({ ...logoB, mode: 'original' }); }}
                                                                className={`px-3 py-1 font-black text-[9px] border ${logo.mode === 'original' ? (isLightMode ? 'bg-gray-900 text-white border-gray-900' : 'bg-zinc-50 text-black border-zinc-50') : (isLightMode ? 'text-gray-400 border-gray-100 hover:text-gray-900' : 'text-zinc-600 border-zinc-900 hover:text-white')}`}
                                                            >
                                                                VERSION DE BASE
                                                            </button>
                                                            <button
                                                                onClick={() => { setLogoA({ ...logoA, mode: 'remastered' }); setLogoB({ ...logoB, mode: 'remastered' }); }}
                                                                disabled={!logo.remastered}
                                                                className={`px-3 py-1 font-black text-[9px] border ${logo.mode === 'remastered' ? 'bg-orange-600 text-black border-orange-600' : 'text-zinc-600 border-zinc-900 hover:text-white'} ${!logo.remastered ? 'opacity-20' : ''}`}
                                                            >
                                                                REFONTE
                                                            </button>
                                                            <button
                                                                onClick={() => { setLogoA({ ...logoA, mode: 'adapted' }); setLogoB({ ...logoB, mode: 'adapted' }); }}
                                                                className={`px-3 py-1 font-black text-[9px] border ${logo.mode === 'adapted' ? (isLightMode ? 'bg-gray-900 text-white border-gray-900' : 'bg-zinc-50 text-black border-zinc-50') : (isLightMode ? 'text-gray-400 border-gray-100 hover:text-gray-900' : 'text-zinc-600 border-zinc-900 hover:text-white')}`}
                                                             >
                                                                BLANC
                                                            </button>
                                                            <button
                                                                onClick={() => { setLogoA({ ...logoA, mode: 'adaptedBlack' }); setLogoB({ ...logoB, mode: 'adaptedBlack' }); }}
                                                                className={`px-3 py-1 font-black text-[9px] border ${logo.mode === 'adaptedBlack' ? (isLightMode ? 'bg-gray-900 text-white border-gray-900' : 'bg-zinc-50 text-black border-zinc-50') : (isLightMode ? 'text-gray-400 border-gray-100 hover:text-gray-900' : 'text-zinc-600 border-zinc-900 hover:text-white')}`}
                                                            >
                                                                NOIR
                                                            </button>
                                                            <button
                                                                onClick={() => { setCropTargetSlot(logo.id); setShowCropModal(true); }}
                                                                className={`px-3 py-1 font-black text-[9px] border border-orange-600 text-orange-600 hover:bg-orange-600 hover:text-black transition-all flex items-center gap-1`}
                                                                title={`Rogner / Gommer la source Logo ${logo.id}`}
                                                            >
                                                                <Crop size={10} /> ROGNER / GOMMER
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className={`aspect-video border flex items-center justify-center p-4 overflow-hidden relative group checkerboard border-zinc-300`}>
                                                {isAnalyzing && <div className="animate-scan" />}
                                                {logo.original ? (
                                                    <>
                                                        <img 
                                                            src={
                                                                logo.mode === 'remastered' ? (logo.remastered || logo.adapted!) : 
                                                                logo.mode === 'adaptedBlack' ? ((logo.remastered && logo.adaptedBlackRemastered) ? logo.adaptedBlackRemastered : logo.adaptedBlack!) : 
                                                                logo.mode === 'original' ? logo.original! : 
                                                                ((logo.remastered && logo.adaptedRemastered) ? logo.adaptedRemastered : logo.adapted!)
                                                            } 
                                                            className="max-w-full max-h-full object-contain" 
                                                        />
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (logo.id === 'A') {
                                                                    setLogoA({ ...logoA, original: null, adapted: null });
                                                                } else {
                                                                    setLogoB({ ...logoB, original: null, adapted: null });
                                                                }
                                                            }}
                                                            className="absolute top-2 right-2 p-2 bg-red-600/80 text-white hover:bg-red-600 transition-all z-20 group/del"
                                                            title="Supprimer ce logo"
                                                        >
                                                            <Trash2 size={14} className="group-hover/del:scale-110" />
                                                        </button>
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
                                                            className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center gap-2"
                                                        >
                                                            <Upload size={20} className="text-orange-600" />
                                                            <span className="text-[9px] font-black text-white italic uppercase tracking-tighter">Remplacer Logo {logo.id}</span>
                                                        </button>
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
                                                                onClick={() => { setCropTargetSlot('B'); setShowCropModal(true); }}
                                                                className="flex items-center gap-2 px-4 py-2 bg-orange-600/10 hover:bg-orange-600 text-orange-600 hover:text-black font-black text-[9px] uppercase italic tracking-tighter transition-all border border-orange-600/30"
                                                            >
                                                                <Crop size={14} /> Rogner depuis Logo A
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {logo.original && !logo.remastered && (
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); handleAiRemaster(logo.id); }}
                                                    className="w-full py-4 bg-orange-600 text-black font-black text-[10px] uppercase italic tracking-tighter hover:bg-white hover:text-black transition-all shadow-xl flex items-center justify-center gap-2"
                                                >
                                                    <Wand2 size={14} /> REFONTE INTELLIGENTE
                                                </button>
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
                                            <div className="flex flex-wrap gap-6">
                                                <div className="flex flex-col gap-2">
                                                    <span className={`text-[8px] font-bold uppercase italic ${isLightMode ? 'text-gray-400' : 'text-zinc-600'}`}>Taille Coeur (VUE FACE)</span>
                                                    <input type="range" min="0.08" max="0.80" step="0.01" value={logoScaleFront} onChange={e => setLogoScaleFront(parseFloat(e.target.value))} className={`w-32 accent-orange-600 h-1 rounded-lg appearance-none cursor-pointer ${isLightMode ? 'bg-gray-200' : 'bg-zinc-900'}`} />
                                                </div>
                                                <div className="flex flex-col gap-2">
                                                    <span className={`text-[8px] font-bold uppercase italic ${isLightMode ? 'text-gray-400' : 'text-zinc-600'}`}>Taille Dos (VUE DOS)</span>
                                                    <input type="range" min="0.15" max="0.80" step="0.01" value={logoScaleBack} onChange={e => setLogoScaleBack(parseFloat(e.target.value))} className={`w-32 accent-orange-600 h-1 rounded-lg appearance-none cursor-pointer ${isLightMode ? 'bg-gray-200' : 'bg-zinc-900'}`} />
                                                </div>
                                                <div className="flex flex-col gap-2">
                                                    <span className={`text-[8px] font-bold uppercase italic ${isLightMode ? 'text-gray-400' : 'text-zinc-600'}`}>Logo sur Carte Visite</span>
                                                    <input type="range" min="0.10" max="0.80" step="0.01" value={logoScaleCard} onChange={e => setLogoScaleCard(parseFloat(e.target.value))} className={`w-32 accent-orange-600 h-1 rounded-lg appearance-none cursor-pointer ${isLightMode ? 'bg-gray-200' : 'bg-zinc-900'}`} />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                                            {mockups.map(p => (
                                                <div key={p.id} className="space-y-3">
                                                    <div className={`aspect-square border overflow-hidden relative shadow-inner group ${isLightMode ? 'bg-white border-gray-100' : 'bg-[#020202] border-white/5'} ${!p.selected ? 'opacity-40 grayscale' : ''}`}>
                                                        {p.mechanical ? <img src={p.mechanical} className="w-full h-full object-cover" /> : <div className={`w-full h-full animate-pulse ${isLightMode ? 'bg-gray-50' : 'bg-zinc-900/50'}`} />}
                                                        
                                                        {/* INDICATEUR DE SÉLECTION */}
                                                        <button 
                                                            onClick={() => setMockups(mockups.map(m => m.id === p.id ? { ...m, selected: !m.selected } : m))}
                                                            className={`absolute top-2 left-2 w-5 h-5 border flex items-center justify-center transition-all ${p.selected ? 'bg-orange-600 border-orange-600' : 'bg-black/50 border-white/20 hover:border-orange-600'}`}
                                                            title={p.selected ? "Produit sélectionné pour génération" : "Produit exclu de la génération"}
                                                        >
                                                            {p.selected && <Check size={14} className="text-black font-bold" />}
                                                        </button>

                                                        <div className={`absolute bottom-2 left-2 px-2 py-1 font-black text-[6px] tracking-widest uppercase ${isLightMode ? 'bg-gray-100 text-gray-400' : 'bg-black/80 text-white'}`}>{p.title}</div>
                                                        <button 
                                                            onClick={() => {
                                                                const next = mockups.filter(m => m.id !== p.id);
                                                                setMockups(next);
                                                                saveSession(logoA, logoB, logoPlacements, userData, next);
                                                            }}
                                                            className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded shadow-lg hover:bg-red-700 transition-all z-30"
                                                            title="Supprimer définitivement"
                                                        >
                                                            <Trash2 size={12} />
                                                        </button>
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
                            
                            {/* 1. Titre d'Accroche */}
                            <header className="space-y-6">
                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-600/10 border border-red-600/20 text-red-600 text-[10px] font-black tracking-[0.2em] uppercase italic">
                                    <ShieldAlert size={14} /> Audit Stratégique pour {userData.companyName || "votre entreprise"}
                                </div>
                                <h1 className="text-5xl md:text-7xl font-black italic tracking-tighter leading-[0.9] uppercase">
                                    Votre temps est trop précieux pour être <span className="text-orange-600">gaspillé</span> dans l'administratif.
                                </h1>
                                <p className={`text-xl md:text-2xl font-bold italic ${isLightMode ? 'text-gray-400' : 'text-zinc-500'} max-w-2xl`}>
                                    Arrêtez de perdre de l'argent et de l'énergie sur chaque commande de vêtements de chantier.
                                </p>
                            </header>

                            {/* 2. L'Audit (Le constat) */}
                            <section className="grid grid-cols-1 md:grid-cols-2 gap-12 border-t border-white/5 pt-12">
                                <div className="space-y-6">
                                    <h2 className="text-2xl font-black italic uppercase tracking-tight flex items-center gap-3">
                                        <Clock className="text-orange-600" /> Le Constat : Un gouffre opérationnel
                                    </h2>
                                    <div className={`space-y-4 text-sm font-medium ${isLightMode ? 'text-gray-600' : 'text-zinc-400'}`}>
                                        <p>Aujourd'hui, chaque dotation EPI est un cauchemar logistique :</p>
                                        <ul className="space-y-4">
                                            <li className="flex gap-3">
                                                <span className="text-orange-600 font-black">•</span>
                                                <span><strong>Le chaos des tailles :</strong> Relances incessantes sur le terrain pour savoir qui fait du L ou du XL.</span>
                                            </li>
                                            <li className="flex gap-3">
                                                <span className="text-orange-600 font-black">•</span>
                                                <span><strong>L’erreur fatale :</strong> Logos mal centrés ou couleurs non respectées. 2 semaines de perdues.</span>
                                            </li>
                                            <li className="flex gap-3">
                                                <span className="text-orange-600 font-black">•</span>
                                                <span><strong>Détournement de compétence :</strong> Vos chefs de chantier trient des cartons au lieu de diriger les hommes.</span>
                                            </li>
                                        </ul>
                                        <div className={`mt-8 p-6 border-l-4 border-orange-600 ${isLightMode ? 'bg-white shadow-xl' : 'bg-zinc-950'} italic`}>
                                            <span className="text-orange-600 font-black uppercase text-xs block mb-2">Le coût caché :</span>
                                            "Pour une équipe de 15 personnes, c'est environ <strong>45 heures de gestion administrative</strong> jetées par la fenêtre chaque année."
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <h2 className="text-2xl font-black italic uppercase tracking-tight flex items-center gap-3">
                                        <Zap className="text-orange-600" /> Le Changement de Paradigme
                                    </h2>
                                    <div className={`space-y-4 text-sm font-medium ${isLightMode ? 'text-gray-600' : 'text-zinc-400'}`}>
                                        <p>Nous ne vous vendons pas des t-shirts. Nous vous vendons du <strong>temps de cerveau disponible</strong> via le Contrat de Dotation Premium :</p>
                                        <ul className="space-y-4">
                                            <li className="flex gap-3 italic">
                                                <CheckCircle2 className="text-orange-600 flex-shrink-0" size={18} />
                                                <span><strong>Portail 100% Délégué :</strong> Vos gars commandent eux-mêmes, vous n'avez qu'à valider.</span>
                                            </li>
                                            <li className="flex gap-3 italic">
                                                <CheckCircle2 className="text-orange-600 flex-shrink-0" size={18} />
                                                <span><strong>Qualité Industrielle :</strong> Un marquage constant qui impose le respect sur le chantier.</span>
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                            </section>

                            {/* 3. L'Argumentaire Financier (Le ROI) */}
                            <section className={`p-8 md:p-12 border-2 border-orange-600 ${isLightMode ? 'bg-white shadow-2xl' : 'bg-zinc-950'} relative overflow-hidden group`}>
                                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
                                    <TrendingUp size={200} />
                                </div>
                                <div className="relative z-10 space-y-8">
                                    <h2 className="text-4xl md:text-5xl font-black italic tracking-tighter uppercase leading-none">
                                        L'abonnement qui se <br />
                                        <span className="text-orange-600">rembourse tout seul.</span>
                                    </h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                        <div className="space-y-4 text-sm font-bold italic">
                                            <p className={isLightMode ? 'text-gray-500' : 'text-zinc-500'}>Oubliez le prix à l'unité. Calculez votre levier d'optimisation :</p>
                                            <div className="space-y-2">
                                                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                                                    <span>TARIFICATION</span>
                                                    <span className="text-orange-600">PRIVILÈGE</span>
                                                </div>
                                                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                                                    <span>GESTION ADMINISTRATIVE</span>
                                                    <span className="text-orange-600">0 HEURE</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span>MAINTENANCE PORTAL</span>
                                                    <span className="text-orange-600">INCLUS</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className={`p-6 border ${isLightMode ? 'bg-gray-50 border-gray-100' : 'bg-black border-zinc-900'} space-y-4`}>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Verdict Financier :</p>
                                            <p className="text-lg leading-relaxed">
                                                "L'abonnement est amorti dès vos premières commandes. Le reste, c'est du bénéfice net pour votre trésorerie."
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* 4. CTA */}
                            <footer className="text-center pt-12">
                                <p className={`text-xs font-black tracking-[0.4em] uppercase italic mb-8 ${isLightMode ? 'text-gray-400' : 'text-zinc-600'}`}>
                                    L'efficacité ne se raconte pas, elle se montre.
                                </p>
                                <button 
                                    onClick={handleContinueToSimulation}
                                    className="group w-full max-w-xl py-10 bg-orange-600 text-black font-black text-3xl uppercase italic tracking-tighter hover:bg-white transition-all shadow-[10px_10px_0_rgba(234,88,12,0.2)] flex items-center justify-center gap-4"
                                >
                                    Accéder à mon portail démo <ArrowRight size={32} className="group-hover:translate-x-2 transition-transform" />
                                </button>
                                <p className={`mt-6 text-[10px] font-bold uppercase tracking-widest ${isLightMode ? 'text-gray-400' : 'text-zinc-700'}`}>
                                    Consultez la simulation préparée pour vos équipes
                                </p>
                            </footer>

                        </div>
                    </div>
                )}

                {logoA.original && (
                    <div id="simulation-results" className="animate-reveal max-w-7xl mx-auto space-y-12 scroll-mt-24">

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                        <div className="lg:col-span-8 flex flex-col items-center">
                            <div className={`relative aspect-square overflow-hidden bg-zinc-950 w-full max-w-[450px] border shadow-2xl group cursor-default ${isLightMode ? 'border-gray-100' : 'border-zinc-900'}`}>
                                 {(() => {
                                    const m = mockups[activeMockupIndex];
                                    const activePreview = m ? (m.aiRemastered || m.ai || (m as any).imageUrl || m.mechanical || m.base || '') : '';

                                    return (
                                        <>
                                            {m?.isGenerating ? (
                                                <div className={`w-full h-full relative flex items-center justify-center bg-transparent`}>
                                                    {m?.mechanical && <img src={m.mechanical} className="absolute inset-0 w-full h-full object-cover object-center opacity-30 grayscale blur-[2px]" />}
                                                    <div className="text-center space-y-6 z-10">
                                                        <Loader2 className="animate-spin text-orange-600 mx-auto" size={48} />
                                                        <div className={`${isLightMode ? 'bg-white border-gray-200 text-gray-500' : 'bg-black/80 border-white/5 text-zinc-600'} border p-4 w-80 font-mono text-[9px] text-left space-y-1`}>
                                                            {auditLogs.map((log, i) => <div key={i} className={i === auditLogs.length - 1 ? "text-orange-600" : ""}>{log}</div>)}
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <img 
                                                    onContextMenu={e => { if (userData.email !== 'logosigneed@gmail.com') e.preventDefault(); }} 
                                                    src={activePreview} 
                                                    className="w-full h-full object-cover object-center animate-reveal-image" 
                                                    alt={m?.title || 'Aperçu central'}
                                                />
                                            )}

                                            <div className="absolute top-6 left-6 flex items-center gap-4">
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>


                        </div>

                        <div className="lg:col-span-4 flex flex-col gap-8">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {mockups.filter(m => m.selected).map((m) => {
                                    const activePreview = m.aiRemastered || m.ai || (m as any).imageUrl || m.mechanical || m.base || '';
                                    return (
                                    <div 
                                        key={m.id} 
                                        onClick={() => {
                                            const realIndex = mockups.findIndex(x => x.id === m.id);
                                            setActiveMockupIndex(realIndex);
                                        }} 
                                        className={`cursor-pointer flex flex-col gap-2 p-3 border transition-all relative group ${mockups[activeMockupIndex]?.id === m.id ? (isLightMode ? 'border-orange-600 bg-white shadow-xl' : 'border-orange-600 bg-zinc-950 shadow-[0_0_20px_rgba(234,88,12,0.15)]') : (isLightMode ? 'border-gray-100 opacity-60 hover:opacity-100 hover:border-gray-300' : 'border-zinc-900 opacity-60 hover:opacity-100 hover:border-zinc-700')}`}
                                    >    <div className="aspect-square overflow-hidden bg-zinc-950 w-full relative ring-1 ring-white/10">
                                            <img
                                                src={activePreview}
                                                className="w-full h-full object-cover object-center transition-transform group-hover:scale-105"
                                                alt={m.title}
                                            />

                                            {m.isGenerating && (
                                                <div className="absolute inset-0 bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
                                                    <div className="aspect-square overflow-hidden bg-zinc-950 relative w-full h-full flex items-center justify-center">
                                                        <img src={activePreview} className="w-full h-full object-cover object-center opacity-40 brightness-50" alt="" />
                                                    </div>
                                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                        <Loader2 className="text-orange-600 animate-spin mb-2" size={32} />
                                                        <span className="text-[10px] font-black tracking-widest text-orange-600 animate-pulse uppercase">Traitement HD...</span>
                                                    </div>
                                                </div>
                                            )}

                                            {!m.isGenerating && (
                                                <>
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (selectedForRegen.includes(m.id)) {
                                                                setSelectedForRegen(prev => prev.filter(id => id !== m.id));
                                                            } else {
                                                                setSelectedForRegen(prev => [...prev, m.id]);
                                                            }
                                                        }}
                                                        className={`absolute top-2 left-2 w-5 h-5 border flex items-center justify-center transition-all z-20 ${selectedForRegen.includes(m.id) ? 'bg-orange-600 border-orange-600' : 'bg-black/50 border-white/20 hover:border-orange-600'}`}
                                                        title="Sélectionner pour régénérer" style={!isAdmin ? { display: 'none' } : undefined}
                                                    >
                                                        {selectedForRegen.includes(m.id) && <Check size={14} className="text-black font-bold" />}
                                                    </button>
                                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-all flex gap-1 z-20">
                                                        <button
                                                            onClick={(e) => { 
                                                                e.stopPropagation(); 
                                                                const link = document.createElement('a');
                                                                link.href = m.mechanical || m.ai || '';
                                                                link.download = `signaid_${m.id}.png`;
                                                                link.click();
                                                            }}
                                                            className="p-2 bg-green-600 text-white hover:bg-white hover:text-green-600 transition-all shadow-xl"
                                                            title="Télécharger"
                                                        >
                                                            <Download size={14} />
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); startSequentialPipeline(undefined, m.id); }}
                                                            className="p-2 bg-orange-600 text-black hover:bg-white transition-all shadow-xl"
                                                            title="Régénérer" style={!isAdmin ? { display: 'none' } : undefined}
                                                        >
                                                            <RefreshCcw size={14} />
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                        <div className="flex justify-between items-center px-1">
                                            <div className="text-[8px] font-black uppercase italic tracking-tighter text-zinc-500">{m.title}</div>
                                            {m.ai && <div className="w-2 h-2 bg-orange-600 rounded-full shadow-[0_0_10px_orange]" />}
                                        </div>
                                    </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="mt-8 flex flex-col items-center gap-4 lg:col-span-12">
                            <p className="text-zinc-600 font-bold text-[9px] tracking-[0.2em] uppercase">Solution Propulsée par Signaid</p>
                            
                            {selectedForRegen.length > 0 && (
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        startSequentialPipeline(undefined, selectedForRegen).then(() => {
                                            setSelectedForRegen([]); // Clear selection after generating
                                        });
                                    }}
                                    className={`px-10 py-4 font-black text-xs uppercase italic tracking-tighter transition-all shadow-xl bg-orange-600 text-black hover:bg-white hover:text-black cursor-pointer w-full max-w-sm mb-4`}
                                >
                                    Régénérer la sélection ({selectedForRegen.length})
                                </button>
                            )}

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

                                            // Sync user profile updates to administrative config
                                            if (userData.companyName) config.companyName = userData.companyName;
                                            if (userData.email) {
                                            config.contactEmail = userData.email;
                                            }
                                            if (userData.activity) {
                                            config.activitySector = userData.activity;
                                            config.sector = userData.activity;
                                            }
                                            if (userData.phone) {
                                            config.whatsappNumber = userData.phone;
                                            }
                                            if (userData.website) {
                                            config.address = userData.website;
                                            }

                                            await saveStoredConfig(config, uidParam);
                                            }
                                            } catch (err) {
                                            console.error("Failed to update config:", err);
                                            }
                                        }
                                        const targetSid = uidParam || previewId;
                                        const targetShopUrl = targetSid ? `/portail-shop?audit=${targetSid}` : '/portail-shop';
                                        window.location.href = targetShopUrl;
                                    };
                                    updateAndRedirect(); 
                                }}
                                className={`px-10 py-4 font-black text-xs uppercase italic tracking-tighter transition-all shadow-xl bg-black text-white hover:bg-orange-600 cursor-pointer`}
                            >
                                {isRegenerating
                                    ? "Génération en cours..." 
                                    : "Accéder à ma page produit"}
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
            </main>

            {showAuthModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/98 backdrop-blur-3xl">
                    <form onClick={e => e.stopPropagation()} onSubmit={handleAuthSubmit} className={`${isLightMode ? 'bg-white border-gray-200 text-gray-900' : 'bg-black border-zinc-900 text-zinc-100'} border p-12 w-full max-w-2xl space-y-12 animate-reveal relative shadow-2xl`}>
                        <button type="button" onClick={() => setShowAuthModal(false)} className={`absolute top-8 right-8 ${isLightMode ? 'text-gray-300' : 'text-zinc-800'} hover:text-orange-600 transition-colors`}><Layers size={24} className="rotate-45" /></button>
                        <div className="space-y-4">
                            <h2 className="text-4xl font-black italic tracking-tighter uppercase leading-none">Créer mon <span className="text-orange-600 text-5xl">DOSSIER</span></h2>
                            <p className={`text-[10px] font-bold uppercase tracking-widest ${isLightMode ? 'text-gray-400' : 'text-zinc-700'}`}>Liez votre adresse mail pour conserver vos crédits.</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                            <div className="space-y-6">
                                <input name="email" type="email" defaultValue={userData.email} placeholder="VOTRE EMAIL (COMPTE)" required className={`w-full ${isLightMode ? 'bg-gray-50 border-gray-200 text-gray-900' : 'bg-zinc-950 border-zinc-900 text-zinc-100'} border p-4 font-black text-xs outline-none focus:border-orange-600 italic`} />
                                <input name="company" defaultValue={userData.companyName} placeholder="ENTREPRISE" required className={`w-full ${isLightMode ? 'bg-gray-50 border-gray-200 text-gray-900' : 'bg-zinc-950 border-zinc-900 text-zinc-100'} border p-4 font-black text-xs outline-none focus:border-orange-600 italic`} />
                            </div>
                            <div className="space-y-6">
                                <input name="tva" defaultValue={userData.tva} placeholder="N° TVA (SI APPLICABLE)" className={`w-full ${isLightMode ? 'bg-gray-50 border-gray-200 text-gray-900' : 'bg-zinc-950 border-zinc-900 text-zinc-100'} border p-4 font-black text-xs outline-none focus:border-orange-600 italic`} />
                                <input name="phone" defaultValue={userData.phone} placeholder="TÉLÉPHONE" required className={`w-full ${isLightMode ? 'bg-gray-50 border-gray-200 text-gray-900' : 'bg-zinc-950 border-zinc-900 text-zinc-100'} border p-4 font-black text-xs outline-none focus:border-orange-600 italic`} />
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <button type="submit" className={`flex-[2] py-8 font-black text-3xl transition-all uppercase italic ${isLightMode ? 'bg-gray-900 text-white hover:bg-orange-600 hover:text-black' : 'bg-zinc-50 text-black hover:bg-orange-600 hover:text-black'}`}>Sauvegarder</button>
                            <button type="button" onClick={() => setShowAuthModal(false)} className={`flex-1 py-8 border font-black text-sm uppercase italic transition-all ${isLightMode ? 'border-gray-200 text-gray-400 hover:bg-gray-50' : 'border-zinc-900 text-zinc-500 hover:bg-zinc-950'}`}>Retour</button>
                        </div>
                    </form>
                </div>
            )}

            {remasterStep && (
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
                            Optimisation certifiée pour DTF / Sérigraphie Haute Définition
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
                body { background-color: ${isLightMode ? '#f9fafb' : '#020202'}; cursor: crosshair; }
            `}} />

            {/* CROP / RECADRAGE / GOMME MODAL (SUPPORT LOGO A & LOGO B) */}
            {showCropModal && (logoA.original || logoB.original) && (() => {
                const CropModal = () => {
                    const containerRef = useRef<HTMLDivElement>(null);
                    const imgRef = useRef<HTMLImageElement>(null);
                    const eraserCanvasRef = useRef<HTMLCanvasElement>(null);
                    const [cropMethod, setCropMethod] = useState<'rect' | 'poly' | 'eraser'>('rect');
                    const [sourceSlot, setSourceSlot] = useState<'A' | 'B'>(() => {
                        if (cropTargetSlot === 'A') return logoA.original ? 'A' : 'B';
                        return logoB.original ? 'B' : (logoA.original ? 'A' : 'B');
                    });
                    const [poly, setPoly] = useState<{x: number, y: number}[]>([]);
                    const [dragIdx, setDragIdx] = useState<number | null>(null);

                    // Eraser state
                    const [brushSize, setBrushSize] = useState(24);
                    const [isErasing, setIsErasing] = useState(false);
                    const [cursorPos, setCursorPos] = useState<{x: number, y: number} | null>(null);
                    
                    const activeLogo = sourceSlot === 'A' ? logoA : logoB;
                    const activeMode = activeLogo.original ? activeLogo.mode : 'original';
                    const defaultBg = (activeMode === 'adapted') ? 'black' : 'transparent';
                    const [cropBg, setCropBg] = useState<'transparent' | 'white' | 'black'>(defaultBg);

                    const getActiveSourceSrc = () => {
                        const targetLogo = sourceSlot === 'A' ? (logoA.original ? logoA : logoB) : (logoB.original ? logoB : logoA);
                        if (!targetLogo.original) return '';
                        if (targetLogo.mode === 'remastered') return targetLogo.remastered || targetLogo.adapted || targetLogo.original;
                        if (targetLogo.mode === 'adaptedBlack') return (targetLogo.remastered && targetLogo.adaptedBlackRemastered) ? targetLogo.adaptedBlackRemastered : targetLogo.adaptedBlack || targetLogo.original;
                        if (targetLogo.mode === 'adapted') return (targetLogo.remastered && targetLogo.adaptedRemastered) ? targetLogo.adaptedRemastered : targetLogo.adapted || targetLogo.original;
                        return targetLogo.original;
                    };

                    const initBox = (type: 'rect' | 'square' | 'full' | 'inset') => {
                        if (!imgRef.current || !containerRef.current) return;
                        const rect = imgRef.current.getBoundingClientRect();
                        const contRect = containerRef.current.getBoundingClientRect();
                        const offsetX = rect.left - contRect.left;
                        const offsetY = rect.top - contRect.top;
                        const w = rect.width;
                        const h = rect.height;

                        if (type === 'full') {
                            setPoly([
                                { x: offsetX, y: offsetY },
                                { x: offsetX + w, y: offsetY },
                                { x: offsetX + w, y: offsetY + h },
                                { x: offsetX, y: offsetY + h }
                            ]);
                        } else if (type === 'square') {
                            const size = Math.min(w, h) * 0.8;
                            const startX = offsetX + (w - size) / 2;
                            const startY = offsetY + (h - size) / 2;
                            setPoly([
                                { x: startX, y: startY },
                                { x: startX + size, y: startY },
                                { x: startX + size, y: startY + size },
                                { x: startX, y: startY + size }
                            ]);
                        } else {
                            const insetX = w * (type === 'inset' ? 0.15 : 0.05);
                            const insetY = h * (type === 'inset' ? 0.15 : 0.05);
                            setPoly([
                                { x: offsetX + insetX, y: offsetY + insetY },
                                { x: offsetX + w - insetX, y: offsetY + insetY },
                                { x: offsetX + w - insetX, y: offsetY + h - insetY },
                                { x: offsetX + insetX, y: offsetY + h - insetY }
                            ]);
                        }
                    };

                    const initPoly = () => {
                        initBox('rect');
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

                    // Poly & Rect drag handlers
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
                        
                        if (cropMethod === 'rect') {
                            // Mode Rectangle : synchroniser les axes X et Y pour garder une boîte droite
                            setPoly(prev => {
                                const next = [...prev];
                                const current = pos;
                                if (dragIdx === 0) { // Top-Left
                                    next[0] = current;
                                    next[1] = { x: next[1].x, y: current.y };
                                    next[3] = { x: current.x, y: next[3].y };
                                } else if (dragIdx === 1) { // Top-Right
                                    next[1] = current;
                                    next[0] = { x: next[0].x, y: current.y };
                                    next[2] = { x: current.x, y: next[2].y };
                                } else if (dragIdx === 2) { // Bottom-Right
                                    next[2] = current;
                                    next[3] = { x: next[3].x, y: current.y };
                                    next[1] = { x: current.x, y: next[1].y };
                                } else if (dragIdx === 3) { // Bottom-Left
                                    next[3] = current;
                                    next[2] = { x: next[2].x, y: current.y };
                                    next[0] = { x: current.x, y: next[0].y };
                                }
                                return next;
                            });
                        } else {
                            // Mode Découpe Libre
                            setPoly(prev => {
                                const next = [...prev];
                                next[dragIdx] = pos;
                                return next;
                            });
                        }
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
                        if (maxX < minX || maxY < minY) return c;

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
                        canvas.width = Math.max(10, maxX - minX);
                        canvas.height = Math.max(10, maxY - minY);
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
                        handleCropConfirm(croppedBase64, cropTargetSlot);
                    };

                    const confirmEraser = () => {
                        const canvas = eraserCanvasRef.current;
                        if (!canvas) return;
                        const trimmedCanvas = trimCanvas(canvas);
                        const base64 = trimmedCanvas.toDataURL('image/png');
                        handleCropConfirm(base64, cropTargetSlot);
                    };

                    return (
                        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.94)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1rem', backdropFilter: 'blur(8px)' }}>
                            {/* Header Badge */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap', justifyContent: 'center', zIndex: 10 }}>
                                <div style={{ background: '#ea580c', color: '#000', padding: '0.35rem 0.9rem', borderRadius: '6px', fontWeight: 900, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    🎯 Destination : LOGO {cropTargetSlot} {cropTargetSlot === 'A' ? '(Dos / Grand Format)' : '(Cœur / Poitrine)'}
                                </div>

                                {logoA.original && logoB.original && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(255,255,255,0.06)', padding: '0.25rem 0.6rem', borderRadius: '6px' }}>
                                        <span style={{ color: '#aaa', fontSize: '0.65rem', fontWeight: 700 }}>Source :</span>
                                        <button
                                            onClick={() => { setSourceSlot('A'); setTimeout(initPoly, 100); }}
                                            style={{
                                                padding: '0.2rem 0.6rem',
                                                background: sourceSlot === 'A' ? '#ea580c' : 'rgba(255,255,255,0.1)',
                                                color: sourceSlot === 'A' ? '#000' : '#fff',
                                                border: 'none',
                                                borderRadius: '3px',
                                                fontSize: '0.65rem',
                                                fontWeight: 800,
                                                cursor: 'pointer'
                                            }}
                                        >
                                            Logo A
                                        </button>
                                        <button
                                            onClick={() => { setSourceSlot('B'); setTimeout(initPoly, 100); }}
                                            style={{
                                                padding: '0.2rem 0.6rem',
                                                background: sourceSlot === 'B' ? '#ea580c' : 'rgba(255,255,255,0.1)',
                                                color: sourceSlot === 'B' ? '#000' : '#fff',
                                                border: 'none',
                                                borderRadius: '3px',
                                                fontSize: '0.65rem',
                                                fontWeight: 800,
                                                cursor: 'pointer'
                                            }}
                                        >
                                            Logo B
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Toggle method selector */}
                            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', zIndex: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
                                <button
                                    onClick={() => {
                                        setCropMethod('rect');
                                        setTimeout(() => initBox('rect'), 50);
                                    }}
                                    style={{
                                        padding: '0.55rem 1.4rem',
                                        background: cropMethod === 'rect' ? '#ea580c' : 'rgba(255,255,255,0.06)',
                                        color: cropMethod === 'rect' ? '#000' : '#fff',
                                        border: 'none',
                                        fontWeight: 900,
                                        fontSize: '0.7rem',
                                        textTransform: 'uppercase',
                                        cursor: 'pointer',
                                        borderRadius: '4px',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    📐 Recadrage Simple
                                </button>
                                <button
                                    onClick={() => {
                                        setCropMethod('poly');
                                        setTimeout(() => initBox('rect'), 50);
                                    }}
                                    style={{
                                        padding: '0.55rem 1.4rem',
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
                                    ✂️ Découpe Libre (4 points)
                                </button>
                                <button
                                    onClick={() => {
                                        setCropMethod('eraser');
                                        setTimeout(initEraserCanvas, 100);
                                    }}
                                    style={{
                                        padding: '0.55rem 1.4rem',
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
                                    🧹 Gomme (Effacer des zones)
                                </button>
                            </div>

                            {/* Options & Presets Bar */}
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', justifyContent: 'center', zIndex: 10 }}>
                                {cropMethod === 'rect' && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(255,255,255,0.04)', padding: '0.35rem 0.75rem', borderRadius: '6px' }}>
                                        <span style={{ color: '#aaa', fontSize: '0.65rem', fontWeight: 700 }}>Préréglages :</span>
                                        <button onClick={() => initBox('square')} style={{ padding: '0.2rem 0.5rem', background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', borderRadius: '3px', fontSize: '0.65rem', fontWeight: 800, cursor: 'pointer' }}>Carré (1:1)</button>
                                        <button onClick={() => initBox('inset')} style={{ padding: '0.2rem 0.5rem', background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', borderRadius: '3px', fontSize: '0.65rem', fontWeight: 800, cursor: 'pointer' }}>Centre (80%)</button>
                                        <button onClick={() => initBox('full')} style={{ padding: '0.2rem 0.5rem', background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', borderRadius: '3px', fontSize: '0.65rem', fontWeight: 800, cursor: 'pointer' }}>Plein écran</button>
                                    </div>
                                )}

                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fff', fontSize: '0.75rem', background: 'rgba(255,255,255,0.04)', padding: '0.35rem 0.75rem', borderRadius: '6px' }}>
                                    <span style={{ opacity: 0.8, fontSize: '0.65rem', fontWeight: 700 }}>Fond :</span>
                                    <button onClick={() => setCropBg('white')} style={{ padding: '0.2rem 0.5rem', background: cropBg === 'white' ? '#ea580c' : 'rgba(255,255,255,0.1)', color: cropBg === 'white' ? '#000' : '#fff', border: 'none', borderRadius: '3px', fontSize: '0.65rem', fontWeight: 850, cursor: 'pointer' }}>Blanc</button>
                                    <button onClick={() => setCropBg('black')} style={{ padding: '0.2rem 0.5rem', background: cropBg === 'black' ? '#ea580c' : 'rgba(255,255,255,0.1)', color: cropBg === 'black' ? '#000' : '#fff', border: 'none', borderRadius: '3px', fontSize: '0.65rem', fontWeight: 850, cursor: 'pointer' }}>Noir</button>
                                    <button onClick={() => setCropBg('transparent')} style={{ padding: '0.2rem 0.5rem', background: cropBg === 'transparent' ? '#ea580c' : 'rgba(255,255,255,0.1)', color: cropBg === 'transparent' ? '#000' : '#fff', border: 'none', borderRadius: '3px', fontSize: '0.65rem', fontWeight: 850, cursor: 'pointer' }}>Damier</button>
                                </div>
                            </div>

                            {/* Eraser controls */}
                            {cropMethod === 'eraser' && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: '#fff', fontSize: '0.75rem', marginBottom: '1rem', background: 'rgba(255,255,255,0.04)', padding: '0.4rem 1rem', borderRadius: '6px' }}>
                                    <span>Taille de gomme :</span>
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
                                            padding: '0.25rem 0.7rem',
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

                            {/* Canvas / Image Interaction Area */}
                            <div
                                ref={containerRef}
                                style={{ position: 'relative', width: '90vw', height: '56vh', cursor: dragIdx !== null ? 'grabbing' : 'default', userSelect: 'none', touchAction: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                onMouseDown={(cropMethod === 'poly' || cropMethod === 'rect') ? handleStart : undefined}
                                onMouseMove={(cropMethod === 'poly' || cropMethod === 'rect') ? handleMove : undefined}
                                onMouseUp={(cropMethod === 'poly' || cropMethod === 'rect') ? handleEnd : undefined}
                                onMouseLeave={(cropMethod === 'poly' || cropMethod === 'rect') ? handleEnd : undefined}
                                onTouchStart={(cropMethod === 'poly' || cropMethod === 'rect') ? handleStart : undefined}
                                onTouchMove={(cropMethod === 'poly' || cropMethod === 'rect') ? handleMove : undefined}
                                onTouchEnd={(cropMethod === 'poly' || cropMethod === 'rect') ? handleEnd : undefined}
                            >
                                <img
                                    ref={imgRef}
                                    onLoad={initPoly}
                                    src={getActiveSourceSrc()}
                                    crossOrigin="anonymous"
                                    style={{ 
                                        maxWidth: '100%', 
                                        maxHeight: '100%', 
                                        objectFit: 'contain', 
                                        display: (cropMethod === 'poly' || cropMethod === 'rect') ? 'block' : 'none', 
                                        background: cropBg === 'transparent' 
                                            ? 'repeating-conic-gradient(#808080 0% 25%, transparent 0% 50%) 50% / 20px 20px' 
                                            : cropBg 
                                    }}
                                    draggable={false}
                                />
                                
                                {(cropMethod === 'poly' || cropMethod === 'rect') && (
                                    <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 10 }}>
                                        <defs>
                                            <mask id="poly-mask-btp">
                                                <rect width="100%" height="100%" fill="white" />
                                                {poly.length === 4 && <polygon points={poly.map(p => `${p.x},${p.y}`).join(' ')} fill="black" />}
                                            </mask>
                                        </defs>
                                        <rect width="100%" height="100%" fill="rgba(0,0,0,0.75)" mask="url(#poly-mask-btp)" />
                                        {poly.length === 4 && (
                                            <>
                                                <polygon points={poly.map(p => `${p.x},${p.y}`).join(' ')} fill="transparent" stroke="#ea580c" strokeWidth="2" strokeDasharray={cropMethod === 'rect' ? 'none' : '4 4'} />
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
                                                maxHeight: '56vh',
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
                                                border: '2px solid rgba(234, 88, 12, 0.9)',
                                                backgroundColor: 'rgba(234, 88, 12, 0.25)',
                                                pointerEvents: 'none',
                                                zIndex: 20
                                            }} />
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Actions Bar */}
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.2rem' }}>
                                <button
                                    onClick={() => setShowCropModal(false)}
                                    style={{ padding: '0.7rem 1.8rem', background: 'transparent', border: '1px solid #555', color: '#aaa', fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.1em', borderRadius: '6px' }}
                                >
                                    Annuler
                                </button>
                                {(cropMethod === 'poly' || cropMethod === 'rect') ? (
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
                                            letterSpacing: '0.1em',
                                            borderRadius: '6px',
                                            boxShadow: '0 4px 15px rgba(234, 88, 12, 0.3)'
                                        }}
                                    >
                                        ✓ Valider pour Logo {cropTargetSlot}
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
                                            letterSpacing: '0.1em',
                                            borderRadius: '6px',
                                            boxShadow: '0 4px 15px rgba(234, 88, 12, 0.3)'
                                        }}
                                    >
                                        ✓ Valider le gommage pour Logo {cropTargetSlot}
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                };
                return <CropModal />;
            })()}
        </div>
    );
};

export default BtpLandingPage;
