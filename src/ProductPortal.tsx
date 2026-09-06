import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { Upload, ShieldCheck, Zap, Layout, Loader2, Sparkles, LogIn, CheckSquare, Shield, Layers, CheckCircle2, RefreshCcw, Trash2, RefreshCw, Play, Check, Terminal, Wind, Sun, Moon, Info, ArrowLeft, ShieldAlert, Clock, TrendingUp, ArrowRight, ExternalLink, Download, Wand2, Star, HardHat, User, ShoppingCart, Package, Minus, Plus, ChevronUp, ChevronDown, Menu, Shirt } from 'lucide-react';
import { db, auth } from './firebaseConfig';
import { collection, addDoc, serverTimestamp, query, where, getDocs, doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { BRANDING } from './constants/branding';
import { sendOrderConfirmationEmail } from './utils/emailService';
import { sanitizeForFirestore } from './utils/firestoreSanitizer';
import AdminQuickBar from './components/AdminQuickBar';
import ProductPortalSkeleton from './components/ProductPortalSkeleton';
import { VISION_ROOM_MERCH_COLLECTION, VISION_ROOM_BASIC_TANK, VISION_ROOM_HEAVYWEIGHT_TEE } from './components/MerchCarousel';

const LOCAL_PLACEMENTS = {
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
    sweat: {
        front: { x: 0.64, y: 0.34, scale: 0.20 },
        back: { x: 0.50, y: 0.46, scale: 0.35 }
    },
    hoodie: {
        front: { x: 0.64, y: 0.34, scale: 0.20 },
        back: { x: 0.50, y: 0.46, scale: 0.35 }
    },
    tank_top: {
        front: { x: 0.50, y: 0.35, scale: 0.22 },
        back: { x: 0.50, y: 0.38, scale: 0.35 }
    },
    tshirt_oversize: {
        front: { x: 0.64, y: 0.30, scale: 0.20 },
        back: { x: 0.50, y: 0.38, scale: 0.35 }
    },
    business_card: {
        front: { x: 0.50, y: 0.50, scale: 0.40 },
        back: { x: 0.50, y: 0.50, scale: 0.40 }
    }
};

const STUDIO_PLACEMENTS = LOCAL_PLACEMENTS;

// INDEXED DB STORAGE HELPERS (Same as BtpLandingPage for session sync)
const STORAGE_CONFIG = { db: 'BtpAuditDB', store: 'heavy_assets' };
const openDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(STORAGE_CONFIG.db, 1);
        req.onupgradeneeded = () => {
            req.result.createObjectStore(STORAGE_CONFIG.store);
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
};

const dbGet = async (key: string): Promise<any> => {
    try {
        const idb = await openDB();
        return new Promise((resolve) => {
            const tx = idb.transaction(STORAGE_CONFIG.store, 'readonly');
            const req = tx.objectStore(STORAGE_CONFIG.store).get(key);
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => resolve(null);
        });
    } catch {
        return null;
    }
};

const dbSet = async (key: string, val: string): Promise<void> => {
    const db = await openDB();
    const tx = db.transaction(STORAGE_CONFIG.store, 'readwrite');
    tx.objectStore(STORAGE_CONFIG.store).put(val, key);
    return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
};

// Helper to parse any color to RGB
const parseToRgb = (colorStr: string): { r: number; g: number; b: number } => {
    let r = 249, g = 115, b = 22; // default orange
    if (!colorStr) return { r, g, b };
    
    try {
        if (colorStr.startsWith('#')) {
            const hex = colorStr.replace('#', '');
            if (hex.length === 3) {
                r = parseInt(hex[0] + hex[0], 16);
                g = parseInt(hex[1] + hex[1], 16);
                b = parseInt(hex[2] + hex[2], 16);
            } else if (hex.length >= 6) {
                r = parseInt(hex.substring(0, 2), 16);
                g = parseInt(hex.substring(2, 4), 16);
                b = parseInt(hex.substring(4, 6), 16);
            }
        } else {
            const match = colorStr.match(/\d+/g);
            if (match && match.length >= 3) {
                r = parseInt(match[0], 10);
                g = parseInt(match[1], 10);
                b = parseInt(match[2], 10);
            }
        }
    } catch (e) {
        console.error("Error parsing color:", colorStr, e);
    }
    return { r, g, b };
};

// Helper to convert RGB to HSL
const rgbToHsl = (r: number, g: number, b: number): [number, number, number] => {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;

    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return [h, s, l];
};

// Helper to convert HSL to RGB
const hslToRgb = (h: number, s: number, l: number): [number, number, number] => {
    let r, g, b;
    if (s === 0) {
        r = g = b = l; // achromatic
    } else {
        const hue2rgb = (p: number, q: number, t: number) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
};

// Programmatically scale brightness/lightness of color for text readability on dark bg
const getReadableAccent = (colorStr: string): { accentColor: string; r: number; g: number; b: number } => {
    const { r, g, b } = parseToRgb(colorStr);
    const [h, s, l] = rgbToHsl(r, g, b);
    
    // If lightness is below 60%, boost it to 60% for excellent readability on black bg
    const targetL = Math.max(l, 0.60);
    const [nr, ng, nb] = hslToRgb(h, s, targetL);
    
    return {
        accentColor: `rgb(${nr}, ${ng}, ${nb})`,
        r: nr,
        g: ng,
        b: nb
    };
};

// Determine contrast text color (black or white) based on bg brightness
const getContrastText = (colorStr: string): string => {
    const { r, g, b } = parseToRgb(colorStr);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 140 ? '#000000' : '#ffffff';
};

const ProductPortal: React.FC = () => {
    const { previewId, slug } = useParams<{ previewId?: string; slug?: string }>();
    const navigate = useNavigate();
    const [menuOpen, setMenuOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [sessionData, setSessionData] = useState<any>(null);
    const [dynamicMockups, setDynamicMockups] = useState<any[]>([]);
    const [isLightMode, setIsLightMode] = useState<boolean>(false);
    const isShop = window.location.pathname.includes('portail-shop') || window.location.pathname.includes('/preview/');
    const [activeCategoryTab, setActiveCategoryTab] = useState<'clothing' | 'communication'>('clothing');
    
    const [accentColor, setAccentColor] = useState<string>('#f97316');
    const [siteConfigUid, setSiteConfigUid] = useState<string | null>(null);

    // Dynamic contrast & readability color calculations
    const readableColorData = getReadableAccent(accentColor);
    const dynamicAccentColor = readableColorData.accentColor;
    const dynamicAccentRgb = `${readableColorData.r}, ${readableColorData.g}, ${readableColorData.b}`;
    const dynamicAccentText = getContrastText(accentColor);

    const dynamicStyleSheet = `
        :root {
            --accent-color: ${dynamicAccentColor};
            --accent-rgb: ${dynamicAccentRgb};
            --accent-text: ${dynamicAccentText};
        }
        
        /* Override tailwind classes */
        .text-orange-400 { color: var(--accent-color) !important; }
        .text-orange-500 { color: var(--accent-color) !important; }
        .text-orange-600 { color: var(--accent-color) !important; }
        .hover\\:text-orange-500:hover { color: var(--accent-color) !important; }
        .group:hover .group-hover\\:text-orange-500 { color: var(--accent-color) !important; }
        
        .bg-orange-600 { background-color: var(--accent-color) !important; }
        .bg-orange-600\\/10 { background-color: rgba(var(--accent-rgb), 0.1) !important; }
        .bg-orange-600\\/20 { background-color: rgba(var(--accent-rgb), 0.2) !important; }
        .hover\\:bg-orange-600:hover { background-color: var(--accent-color) !important; }
        
        .border-orange-500 { border-color: var(--accent-color) !important; }
        .border-orange-600 { border-color: var(--accent-color) !important; }
        .border-orange-600\\/30 { border-color: rgba(var(--accent-rgb), 0.3) !important; }
        .hover\\:border-orange-500:hover { border-color: var(--accent-color) !important; }
        .focus\\:border-orange-600:focus { border-color: var(--accent-color) !important; }
        .hover\\:border-orange-600\\/80:hover { border-color: rgba(var(--accent-rgb), 0.8) !important; }
        
        .bg-orange-600.text-black { color: var(--accent-text) !important; }
        .bg-orange-600.hover\\:bg-white:hover { background-color: #ffffff !important; color: #09090b !important; }
        
        .shadow-\\[0_15px_30px_rgba\\(234\\,88\\,12\\,0\\.3\\)\\] { box-shadow: 0 15px 30px rgba(var(--accent-rgb), 0.3) !important; }
        .shadow-\\[0_0_15px_rgba\\(234\\,88\\,12\\,0\\.45\\)\\] { box-shadow: 0 0 15px rgba(var(--accent-rgb), 0.45) !important; }
        .hover\\:shadow-\\[0_0_30px_rgba\\(234\\,88\\,12\\,0\\.15\\)\\]:hover { box-shadow: 0 0 30px rgba(var(--accent-rgb), 0.15) !important; }
        .drop-shadow-\\[0_2px_8px_rgba\\(234\\,88\\,12\\,0\\.15\\)\\] { filter: drop-shadow(0 2px 8px rgba(var(--accent-rgb), 0.15)) !important; }
        
        ::selection, .selection\\:bg-orange-600 *::selection {
            background-color: var(--accent-color) !important;
            color: var(--accent-text) !important;
        }
        
        .via-orange-600\\/5 {
            background-image: linear-gradient(to bottom, transparent, rgba(var(--accent-rgb), 0.05), transparent) !important;
        }
        
        .animate-loading-bar {
            background-image: linear-gradient(to right, var(--accent-color), #eab308) !important;
        }
    `;
    
    // Admin state definition (Firebase Auth + Fallback LocalStorage)
    const [isAuthAdmin, setIsAuthAdmin] = useState(false);
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                // Determine if user has admin privileges based on email or you can just allow any logged-in user of your team
                const adminEmails = ['logosigneed@gmail.com', 'contact@signaid.eu', 'alicia.g.gheerts@gmail.com'];
                if (user.email && adminEmails.includes(user.email.toLowerCase())) {
                    setIsAuthAdmin(true);
                } else {
                    setIsAuthAdmin(true); // Temporarily allow any logged-in user to be admin for testing
                }
            } else {
                setIsAuthAdmin(false);
            }
        });
        return () => unsubscribe();
    }, []);
    
    const isAdmin = isAuthAdmin || localStorage.getItem('btp_god_mode') === 'true';
    
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [userLogo, setUserLogo] = useState<string | null>(null);
    const [logoA, setLogoA] = useState<string | null>(null);
    const [logoB, setLogoB] = useState<string | null>(null);
    const [logoPlacements, setLogoPlacements] = useState<Record<string, 'A' | 'B'>>({
        tFront: 'B', tBack: 'A', pFront: 'B', pBack: 'A', hFront: 'B', hBack: 'A', cardFront: 'A', cardBack: 'A'
    });
    const [selectedTshirtVariant, setSelectedTshirtVariant] = useState<'lourd' | 'leger'>('lourd');
    const [cardViews, setCardViews] = useState<Record<string, 'front' | 'back'>>({
        tshirt: 'front',
        tshirt_basic: 'front',
        tshirt_fluo: 'front',
        tshirt_bicolore: 'front',
        polo: 'front',
        sweat: 'front',
        hoodie: 'front',
        tank_top: 'front',
        tshirt_oversize: 'front',
        business_card: 'front',
        epi: 'front'
    });
    const [displayModes, setDisplayModes] = useState<Record<string, 'studio' | 'bat'>>({
        tshirt: 'studio',
        tshirt_basic: 'studio',
        polo: 'studio',
        sweat: 'studio',
        hoodie: 'studio',
        tank_top: 'studio',
        tshirt_oversize: 'studio',
        business_card: 'studio',
        epi: 'studio'
    });
    const [showCheckoutModal, setShowCheckoutModal] = useState(false);
    const [showEditSessionModal, setShowEditSessionModal] = useState(false);
    const [editCompanyName, setEditCompanyName] = useState('');
    const [editEmail, setEditEmail] = useState('');
    const [previewLink, setPreviewLink] = useState('');
    const [contactInfo, setContactInfo] = useState({
        name: '',
        email: '',
        phone: '',
        address: ''
    });

    type OrderItem = { id: string; packId: string; name: string; size: string };
    const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
    const [newItemName, setNewItemName] = useState<Record<string, string>>({});
    const [newItemSize, setNewItemSize] = useState<Record<string, string>>({});

    const [orderQuantities, setOrderQuantities] = useState<Record<string, Record<string, number>>>({
        tshirt: { S: 0, M: 0, L: 0, XL: 0, XXL: 0 },
        tshirt_basic: { S: 0, M: 0, L: 0, XL: 0, XXL: 0 },
        tshirt_fluo: { S: 0, M: 0, L: 0, XL: 0, XXL: 0 },
        tshirt_bicolore: { S: 0, M: 0, L: 0, XL: 0, XXL: 0 },
        hoodie: { S: 0, M: 0, L: 0, XL: 0, XXL: 0 },
        epi: { UNIT: 0 },
        business_card: { '250': 0, '500': 0, '1000': 0, '2500': 0 }
    });

    useEffect(() => {
        if (sessionData?.userData) {
            setContactInfo({
                name: sessionData.userData.companyName || '',
                email: sessionData.userData.email || '',
                phone: sessionData.userData.phone || '',
                address: sessionData.userData.address || ''
            });
        }
        if (sessionId) {
            const pId = (sessionData as any)?.previewId || localStorage.getItem(`btp_preview_uuid_${sessionId}`) || sessionId;
            setPreviewLink(`${window.location.origin}/preview/${pId}`);
        }
    }, [sessionData, sessionId]);

    const isMountedRef = useRef(true);

    const isRealImage = (url?: string | null, overrideSid?: string | null, overrideCompany?: string | null): boolean => {
        if (!url || typeof url !== 'string') return false;
        const clean = url.trim();
        if (!clean || clean === '""' || clean.length < 10) return false;
        if (userLogo && clean === userLogo) return false;
        if (logoA && clean === logoA) return false;
        if (logoB && clean === logoB) return false;

        // Exclure formellement tout logo isolé (qui ne doit JAMAIS servir de fond de vêtement)
        if (clean.includes('/logos/') || clean.includes('logo_') || clean.includes('_logo') || clean.includes('aaronh_logo') || clean.includes('dokiin_logo') || clean.includes('thementalist_logo') || clean.includes('elox_logo')) {
            return false;
        }

        const effectiveSid = overrideSid !== undefined ? overrideSid : sessionId;
        const effectiveCompany = overrideCompany !== undefined ? overrideCompany : (sessionData?.userData?.companyName || '');

        const isDfazzSession = effectiveSid === 'guest_ms3ijgnco2xnid' || effectiveSid === 'fabrizio' || effectiveSid === 'djdfazz' || effectiveCompany.toLowerCase().includes('d-fazz');
        if (!isDfazzSession) {
            if (clean.toLowerCase().includes('dfazz') || clean.includes('audit-8f198p5') || clean.includes('guest_ms3ijgnco2xnid')) {
                return false;
            }
        }

        if (clean.startsWith('/assets/models/') || clean.includes('male_tshirt') || clean.includes('male_hoodie') || clean.includes('card-base')) {
            if (clean.toLowerCase().includes('dfazz') && isDfazzSession) return true;
            return false;
        }

        const cleanLower = clean.toLowerCase();
        if (cleanLower.includes('btp_mockups') && !cleanLower.includes('/logos/')) {
            return true;
        }

        if (cleanLower.includes('dfazz') && isDfazzSession) {
            return true;
        }

        // Mockups nommés ou stockés pour des marques spécifiques
        if ((clean.includes('thementalist_') || clean.includes('aaronh_')) && (clean.includes('tshirt') || clean.includes('polo') || clean.includes('hoodie') || clean.includes('tank'))) {
            return true;
        }

        return (clean.startsWith('data:image') && clean.length > 50 && !clean.includes('/logos/')) || 
               (clean.includes('firebasestorage') && !clean.includes('/logos/')) || 
               (clean.includes('storage.googleapis.com') && !clean.includes('/logos/'));
    };

    useEffect(() => {
        isMountedRef.current = true;
        let cancelled = false;
        const controller = new AbortController();

        const params = new URLSearchParams(window.location.search);
        const tab = params.get('tab');
        if (tab === 'communication' || tab === 'print' || tab === 'cartes') {
            setActiveCategoryTab('communication');
        } else if (tab === 'clothing' || tab === 'textile' || tab === 'vetements') {
            setActiveCategoryTab('clothing');
        }

        if (params.get('uid')) {
            let meta = document.querySelector('meta[name="robots"]');
            if (!meta) {
                meta = document.createElement('meta');
                meta.setAttribute('name', 'robots');
                document.head.appendChild(meta);
            }
            meta.setAttribute('content', 'noindex, nofollow');
        }

        const loadActiveSession = async () => {
            try {
                const pathname = window.location.pathname.replace(/^\//, '');
                // Support slug and audit interchangeably, plus prospect, brand, and route params
                const rawSlug = params.get('slug') 
                    || params.get('prospect') 
                    || params.get('brand') 
                    || params.get('audit') 
                    || slug 
                    || previewId 
                    || params.get('uid') 
                    || params.get('portal');

                let extractedSlug = rawSlug;
                if (!extractedSlug) {
                    const parts = pathname.split('/');
                    if (parts.length > 1 && parts[0] === 'portail-shop') {
                        extractedSlug = parts[1];
                    } else if (parts.length > 0 && parts[0] !== 'portail-shop') {
                        extractedSlug = parts[0].replace(/-shop$/, '');
                    }
                }

                const sidParam = extractedSlug || localStorage.getItem('btp_active_session_slug') || localStorage.getItem('btp_active_session_id');

                if (!sidParam) {
                    if (!cancelled) setIsLoading(false);
                    return;
                }

                let sid = sidParam;
                if (sid === 'fabrizio' || sid === 'djdfazz' || sid === 'audit-8f198p5') {
                    sid = 'guest_ms3ijgnco2xnid';
                }
                const cleanSid = sid.replace(/^audit-/, '');
                let latestConfig: any = null;

                try {
                    const { getStoredConfig } = await import('./lib/store');
                    latestConfig = await getStoredConfig(sid) || await getStoredConfig(cleanSid);
                    if (latestConfig && (latestConfig.generatedKey || latestConfig.actuationKey)) {
                        const linked = latestConfig.generatedKey || latestConfig.actuationKey;
                        if (linked && linked !== sid && !extractedSlug && !params.get('slug') && !params.get('sid')) {
                            sid = linked;
                        }
                    }
                } catch (e) {
                    console.warn("Failed to load stored config for sidParam:", e);
                }

                if (latestConfig && latestConfig.accentColor) {
                    setAccentColor(latestConfig.accentColor);
                }

                setSessionId(sid);

                // Candidate keys for local IDB and localStorage recovery
                const auditSid = sid.startsWith('audit-') ? sid : `audit-${sid}`;
                const localActiveSid = typeof localStorage !== 'undefined' ? localStorage.getItem('btp_active_session_id') : null;
                const localActiveSlug = typeof localStorage !== 'undefined' ? localStorage.getItem('btp_active_session_slug') : null;

                const lookupCandidateKeys = Array.from(new Set([
                    sid,
                    cleanSid,
                    auditSid,
                    extractedSlug,
                    extractedSlug ? extractedSlug.replace(/^audit-/, '') : null,
                    extractedSlug && !extractedSlug.startsWith('audit-') ? `audit-${extractedSlug}` : null,
                    localActiveSlug,
                    localActiveSid,
                    localActiveSid ? localActiveSid.replace(/^audit-/, '') : null,
                    params.get('slug'),
                    params.get('audit'),
                    params.get('prospect'),
                    params.get('brand'),
                    params.get('uid')
                ].filter(Boolean))) as string[];

                const searchUid = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('uid') : null;

                // =========================================================================
                // 1. PRIORITÉ ABSOLUE AU CACHE LOCAL / INDEXEDDB (AVANT TOUT FETCH DISTANT)
                // =========================================================================
                let sessionStr: string | null = null;
                for (const k of lookupCandidateKeys) {
                    sessionStr = await dbGet(`session_obj_${k}`).catch(() => null);
                    if (sessionStr) break;
                }
                if (!sessionStr && typeof localStorage !== 'undefined') {
                    for (const k of lookupCandidateKeys) {
                        sessionStr = localStorage.getItem(`session_obj_${k}`);
                        if (sessionStr) break;
                    }
                    if (!sessionStr && !extractedSlug) {
                        sessionStr = localStorage.getItem('btp_active_session_data');
                    }
                }

                let localData: any = {};
                if (sessionStr) {
                    try {
                        localData = typeof sessionStr === 'string' ? JSON.parse(sessionStr) : sessionStr;
                    } catch (e) {
                        console.warn("Failed to parse local session JSON:", e);
                    }
                }

                if (!localData.mockups || !Array.isArray(localData.mockups) || localData.mockups.length === 0) {
                    for (const k of lookupCandidateKeys) {
                        const directMockupsStr = await dbGet(`mockups_${k}`).catch(() => null);
                        if (directMockupsStr) {
                            try {
                                const parsed = typeof directMockupsStr === 'string' ? JSON.parse(directMockupsStr) : directMockupsStr;
                                if (Array.isArray(parsed) && parsed.length > 0) {
                                    localData.mockups = parsed;
                                    break;
                                }
                            } catch (e) {}
                        }
                    }
                }

                const mergedGarmentMockups: Record<string, string> = {
                    ...(localData?.garmentMockups || {}),
                    ...(latestConfig?.garmentMockups || {})
                };

                for (const k of lookupCandidateKeys) {
                    const directGmStr = await dbGet(`garmentMockups_${k}`).catch(() => null);
                    if (directGmStr) {
                        try {
                            const parsed = typeof directGmStr === 'string' ? JSON.parse(directGmStr) : directGmStr;
                            if (parsed && typeof parsed === 'object') {
                                Object.assign(mergedGarmentMockups, parsed);
                                break;
                            }
                        } catch (e) {}
                    }
                }

                if (typeof localStorage !== 'undefined') {
                    const gmCandidates = [
                        `garmentMockups_${cleanSid}`,
                        `garmentMockups_${sid}`,
                        `btp_garment_mockups_${cleanSid}`,
                        `btp_garment_mockups_${sid}`,
                        ...(searchUid ? [`garmentMockups_${searchUid}`, `btp_garment_mockups_${searchUid}`] : []),
                        'garmentMockups',
                        'btp_garment_mockups'
                    ];
                    for (const key of gmCandidates) {
                        try {
                            const raw = localStorage.getItem(key);
                            if (raw) {
                                const parsed = JSON.parse(raw);
                                if (parsed && typeof parsed === 'object') {
                                    Object.assign(mergedGarmentMockups, parsed);
                                    break;
                                }
                            }
                        } catch (e) { }
                    }

                    const directGarmentKeys = [
                        'tshirt_front', 'tshirt_back', 'tshirt',
                        'polo_front', 'polo_back', 'polo',
                        'hoodie_front', 'hoodie_back', 'hoodie',
                        'sweat_front', 'sweat_back', 'sweat',
                        'tank_front', 'tank_back', 'tank_white_front', 'tank_white_back',
                        'heavy_front', 'heavy_back'
                    ];
                    for (const k of directGarmentKeys) {
                        if (!mergedGarmentMockups[k]) {
                            const val = localStorage.getItem(`btp_mockup_${k}_${cleanSid}`)
                                || localStorage.getItem(`btp_mockup_${k}_${sid}`)
                                || localStorage.getItem(`btp_mockup_${k}`);
                            if (val && isRealImage(val, sid, localData?.userData?.companyName)) {
                                mergedGarmentMockups[k] = val;
                            }
                        }
                    }
                }

                const isMockupsLocked = typeof localStorage !== 'undefined' && (
                    localStorage.getItem('btp_mockups_locked') === 'true' ||
                    localStorage.getItem(`btp_mockups_locked_${sid}`) === 'true' ||
                    localStorage.getItem(`btp_mockups_locked_${cleanSid}`) === 'true' ||
                    (searchUid ? localStorage.getItem(`btp_mockups_locked_${searchUid}`) === 'true' : false)
                );

                const standardCatalogDefs = [
                    { id: 'tFront', title: 'T-Shirt Noir Face', garment: 'tshirt', view: 'front', price: 30, selected: true },
                    { id: 'tBack', title: 'T-Shirt Noir Dos', garment: 'tshirt', view: 'back', price: 30, selected: true },
                    { id: 'pFront', title: 'Polo Premium Face', garment: 'polo', view: 'front', price: 35, selected: true },
                    { id: 'pBack', title: 'Polo Premium Dos', garment: 'polo', view: 'back', price: 35, selected: true },
                    { id: 'hFront', title: 'Hoodie Premium Face', garment: 'sweat', view: 'front', price: 45, selected: true },
                    { id: 'hBack', title: 'Hoodie Premium Dos', garment: 'sweat', view: 'back', price: 45, selected: true },
                    { id: 'tankFront', title: 'Débardeur Noir Face', garment: 'tank_top', view: 'front', price: 28, selected: true },
                    { id: 'tankBack', title: 'Débardeur Noir Dos', garment: 'tank_top', view: 'back', price: 28, selected: true },
                    { id: 'tankWhiteFront', title: 'Débardeur Blanc Face', garment: 'tank_top', view: 'front', price: 28, selected: true },
                    { id: 'tankWhiteBack', title: 'Débardeur Blanc Dos', garment: 'tank_top', view: 'back', price: 28, selected: true },
                    { id: 'heavyFront', title: 'T-Shirt Heavyweight Face', garment: 'tshirt_oversize', view: 'front', price: 35, selected: true },
                    { id: 'heavyBack', title: 'T-Shirt Heavyweight Dos', garment: 'tshirt_oversize', view: 'back', price: 35, selected: true },
                    { id: 'cardFront', title: 'Carte de Visite Recto', garment: 'business_card', view: 'front', price: 0, selected: true },
                    { id: 'cardBack', title: 'Carte de Visite Verso', garment: 'business_card', view: 'back', price: 0, selected: true }
                ];

                const recoveredFromIdb: any[] = [];
                await Promise.all(standardCatalogDefs.map(async (def) => {
                    const idbAi = await dbGet(`${sid}_ai_${def.id}`).catch(() => null)
                        || (cleanSid !== sid ? await dbGet(`${cleanSid}_ai_${def.id}`).catch(() => null) : null)
                        || await dbGet(`audit-${cleanSid}_ai_${def.id}`).catch(() => null);

                    const idbMech = await dbGet(`${sid}_mech_${def.id}`).catch(() => null)
                        || (cleanSid !== sid ? await dbGet(`${cleanSid}_mech_${def.id}`).catch(() => null) : null)
                        || await dbGet(`audit-${cleanSid}_mech_${def.id}`).catch(() => null);

                    if (idbAi || idbMech) {
                        recoveredFromIdb.push({
                            ...def,
                            ai: idbAi || null,
                            mechanical: idbMech || idbAi || null,
                            imageUrl: idbAi || idbMech || null,
                            frontImageUrl: def.view === 'front' ? (idbAi || idbMech) : undefined,
                            backImageUrl: def.view === 'back' ? (idbMech || idbAi) : undefined,
                            imageFront: def.view === 'front' ? (idbAi || idbMech) : undefined,
                            imageBack: def.view === 'back' ? (idbMech || idbAi) : undefined,
                            selected: true
                        });
                    }
                }));

                const loadLogoFromDB = async (slot: 'A' | 'B', mode: string) => {
                    const keysToTry: string[] = [];
                    if (mode === 'remastered') {
                        keysToTry.push(`${sid}_${slot}_remastered`, `${cleanSid}_${slot}_remastered`, `audit-${cleanSid}_${slot}_remastered`);
                    } else if (mode === 'adapted') {
                        keysToTry.push(`${sid}_${slot}_adapted_remastered`, `${cleanSid}_${slot}_adapted_remastered`, `audit-${cleanSid}_${slot}_adapted_remastered`);
                        keysToTry.push(`${sid}_${slot}_adapt`, `${cleanSid}_${slot}_adapt`, `audit-${cleanSid}_${slot}_adapt`);
                    } else if (mode === 'adaptedBlack') {
                        keysToTry.push(`${sid}_${slot}_adapted_black_remastered`, `${cleanSid}_${slot}_adapted_black_remastered`);
                        keysToTry.push(`${sid}_${slot}_adapt_black`, `${cleanSid}_${slot}_adapt_black`);
                    } else if (mode === 'original') {
                        keysToTry.push(`${sid}_${slot}_orig`, `${cleanSid}_${slot}_orig`, `audit-${cleanSid}_${slot}_orig`);
                    }
                    keysToTry.push(
                        `${sid}_${slot}_adapt`, `${cleanSid}_${slot}_adapt`, `audit-${cleanSid}_${slot}_adapt`,
                        `${sid}_${slot}_orig`, `${cleanSid}_${slot}_orig`, `audit-${cleanSid}_${slot}_orig`,
                        `${sid}_${slot}_remastered`, `${cleanSid}_${slot}_remastered`
                    );
                    for (const k of keysToTry) {
                        const val = await dbGet(k).catch(() => null);
                        if (val) return val;
                    }
                    return null;
                };

                const restoreMockupsArray = async (
                    candidateArrays: any[][],
                    mergedGMs: Record<string, string>,
                    idbRecovered: any[],
                    targetSid: string,
                    targetCleanSid: string,
                    productsSource?: any,
                    companyName?: string
                ) => {
                    let rawItems: any[] = [];
                    let maxRealImages = -1;

                    for (let i = 0; i < candidateArrays.length; i++) {
                        const candidate = candidateArrays[i];
                        const realCount = candidate.filter((item: any) => {
                            const img = item.aiRemastered || item.ai || item.aiImageUrl || item.imageStudio || item.frontImageUrl || item.imageFront || item.imageUrl || item.backImageUrl || item.imageBack || item.mechanical;
                            return isRealImage(img, targetSid, companyName);
                        }).length;

                        // Give priority to the active session mockups (first candidate) if it contains real images
                        if (i === 0 && realCount > 0) {
                            rawItems = candidate;
                            maxRealImages = realCount;
                            break;
                        }

                        if (realCount > maxRealImages) {
                            maxRealImages = realCount;
                            rawItems = candidate;
                        }
                    }

                    if (rawItems.length === 0 && candidateArrays.length > 0) {
                        rawItems = candidateArrays[0];
                    }

                    if (rawItems.length === 0 && idbRecovered.length > 0) {
                        rawItems = [...idbRecovered];
                    } else if (idbRecovered.length > 0) {
                        for (const rec of idbRecovered) {
                            const existingIdx = rawItems.findIndex((r: any) => r.id === rec.id);
                            if (existingIdx !== -1) {
                                rawItems[existingIdx] = {
                                    ...rawItems[existingIdx],
                                    ai: rawItems[existingIdx].ai || rec.ai,
                                    mechanical: rawItems[existingIdx].mechanical || rec.mechanical,
                                    imageUrl: rawItems[existingIdx].imageUrl || rec.imageUrl
                                };
                            } else {
                                rawItems.push(rec);
                            }
                        }
                    }

                    // Supplement rawItems with any missing garments from mergedGarmentMockups
                    for (const def of standardCatalogDefs) {
                        const isFront = def.view === 'front';
                        let gmUrl: string | null = null;
                        if (def.garment === 'tshirt') gmUrl = isFront ? (mergedGMs.tshirt_front || mergedGMs.tshirt || mergedGMs.tFront) : (mergedGMs.tshirt_back || mergedGMs.tBack);
                        else if (def.garment === 'polo') gmUrl = isFront ? (mergedGMs.polo_front || mergedGMs.polo || mergedGMs.pFront) : (mergedGMs.polo_back || mergedGMs.pBack);
                        else if (def.garment === 'sweat') gmUrl = isFront ? (mergedGMs.hoodie_front || mergedGMs.hoodie || mergedGMs.sweat_front || mergedGMs.sweat || mergedGMs.hFront) : (mergedGMs.hoodie_back || mergedGMs.sweat_back || mergedGMs.hBack);
                        else if (def.garment === 'tank_top') gmUrl = isFront ? (mergedGMs.tank_front || mergedGMs.tank_top || mergedGMs.tankFront) : (mergedGMs.tank_back || mergedGMs.tankBack);
                        else if (def.garment === 'tshirt_oversize') gmUrl = isFront ? (mergedGMs.heavy_front || mergedGMs.tshirt_oversize || mergedGMs.heavyFront) : (mergedGMs.heavy_back || mergedGMs.heavyBack);
                        else if (def.garment === 'business_card') gmUrl = isFront ? (mergedGMs.card_front || mergedGMs.business_card || mergedGMs.cardFront) : (mergedGMs.card_back || mergedGMs.cardBack);

                        if (gmUrl && isRealImage(gmUrl, targetSid, companyName)) {
                            const existingIdx = rawItems.findIndex((r: any) => r.id === def.id || (r.garment === def.garment && r.view === def.view));
                            if (existingIdx !== -1) {
                                rawItems[existingIdx] = {
                                    ...rawItems[existingIdx],
                                    ai: rawItems[existingIdx].ai || gmUrl,
                                    imageUrl: rawItems[existingIdx].imageUrl || gmUrl,
                                    frontImageUrl: isFront ? (rawItems[existingIdx].frontImageUrl || gmUrl) : rawItems[existingIdx].frontImageUrl,
                                    backImageUrl: !isFront ? (rawItems[existingIdx].backImageUrl || gmUrl) : rawItems[existingIdx].backImageUrl,
                                    imageFront: isFront ? (rawItems[existingIdx].imageFront || gmUrl) : rawItems[existingIdx].imageFront,
                                    imageBack: !isFront ? (rawItems[existingIdx].imageBack || gmUrl) : rawItems[existingIdx].imageBack,
                                    selected: true
                                };
                            } else {
                                rawItems.push({
                                    ...def,
                                    ai: gmUrl,
                                    mechanical: gmUrl,
                                    imageUrl: gmUrl,
                                    frontImageUrl: isFront ? gmUrl : undefined,
                                    backImageUrl: !isFront ? gmUrl : undefined,
                                    imageFront: isFront ? gmUrl : undefined,
                                    imageBack: !isFront ? gmUrl : undefined,
                                    selected: true
                                });
                            }
                        }
                    }

                    if (rawItems.some((item: any) => item.selected === true)) {
                        rawItems = rawItems.filter((item: any) => item.selected === true);
                    }

                    const isVisionSession = targetSid === 'clubvisionroom' || targetSid === 'visionroom' || targetSid === '13ansvr' || targetSid.toLowerCase().includes('vision') || (companyName || '').toLowerCase().includes('vision');
                    if (isVisionSession && rawItems.length === 0) {
                        rawItems = [...(VISION_ROOM_MERCH_COLLECTION as any[])];
                    }

                    return await Promise.all(rawItems.map(async (m: any) => {
                        const idbAi = await dbGet(`${targetSid}_ai_${m.id}`).catch(() => null)
                            || (targetCleanSid !== targetSid ? await dbGet(`${targetCleanSid}_ai_${m.id}`).catch(() => null) : null)
                            || await dbGet(`audit-${targetCleanSid}_ai_${m.id}`).catch(() => null);

                        const idbMech = await dbGet(`${targetSid}_mech_${m.id}`).catch(() => null)
                            || (targetCleanSid !== targetSid ? await dbGet(`${targetCleanSid}_mech_${m.id}`).catch(() => null) : null)
                            || await dbGet(`audit-${targetCleanSid}_mech_${m.id}`).catch(() => null);

                        const directImg = m.imageUrl || m.frontImageUrl || m.imageFront || m.backImageUrl || m.imageBack || m.aiImageUrl;
                        let ai = m.aiRemastered || m.ai || m.imageStudio || m.imageFront || m.frontImageUrl || directImg;
                        
                        let garment = m.garment || m.type;
                        if (!garment) {
                            if (m.id?.includes('basic')) garment = 'tshirt_basic';
                            else if (m.id?.includes('tank')) garment = 'tank_top';
                            else if (m.id?.includes('heavy')) garment = 'tshirt_oversize';
                            else if (m.id?.includes('card')) garment = 'business_card';
                            else if (m.id?.includes('h') || m.id?.includes('sweat') || m.id?.includes('hoodie')) garment = 'sweat';
                            else if (m.id?.includes('p') || m.id?.includes('polo')) garment = 'polo';
                            else garment = 'tshirt';
                        }

                        let view = m.view;
                        if (!view) {
                            if (m.id?.toLowerCase().includes('front') || m.id?.toLowerCase().includes('recto')) view = 'front';
                            else if (m.id?.toLowerCase().includes('back') || m.id?.toLowerCase().includes('verso')) view = 'back';
                            else view = 'front';
                        }

                        const isTshirt = garment === 'tshirt' || garment === 'tshirt_basic' || m.id === 'tFront' || m.id?.includes('tshirt');
                        const isPolo = garment === 'polo' || m.id === 'pFront' || m.id?.includes('polo');
                        const isHoodie = garment === 'sweat' || garment === 'hoodie' || m.id === 'hFront' || m.id?.includes('hoodie') || m.id?.includes('sweat');
                        const isTank = garment === 'tank_top' || m.id?.toLowerCase().includes('tank');
                        const isHeavy = garment === 'tshirt_oversize' || m.id?.toLowerCase().includes('heavy');
                        const isCard = garment === 'business_card' || m.id?.toLowerCase().includes('card');

                        let gmUrl: string | null = null;
                        if (isTshirt) {
                            gmUrl = view === 'front' ? (mergedGMs.tshirt_front || mergedGMs.tshirt || mergedGMs.tFront) : (mergedGMs.tshirt_back || mergedGMs.tBack);
                        } else if (isPolo) {
                            gmUrl = view === 'front' ? (mergedGMs.polo_front || mergedGMs.polo || mergedGMs.pFront) : (mergedGMs.polo_back || mergedGMs.pBack);
                        } else if (isHoodie) {
                            gmUrl = view === 'front' ? (mergedGMs.hoodie_front || mergedGMs.hoodie || mergedGMs.sweat_front || mergedGMs.sweat || mergedGMs.hFront) : (mergedGMs.hoodie_back || mergedGMs.sweat_back || mergedGMs.hBack);
                        } else if (isTank) {
                            const isWhite = m.id?.toLowerCase().includes('white');
                            gmUrl = isWhite
                                ? (view === 'front' ? mergedGMs.tank_white_front || mergedGMs.tankWhiteFront : mergedGMs.tank_white_back || mergedGMs.tankWhiteBack)
                                : (view === 'front' ? mergedGMs.tank_front || mergedGMs.tank_top || mergedGMs.tankFront : mergedGMs.tank_back || mergedGMs.tankBack);
                        } else if (isHeavy) {
                            gmUrl = view === 'front' ? (mergedGMs.heavy_front || mergedGMs.tshirt_oversize || mergedGMs.heavyFront) : (mergedGMs.heavy_back || mergedGMs.heavyBack);
                        } else if (isCard) {
                            gmUrl = view === 'front' ? (mergedGMs.card_front || mergedGMs.business_card || mergedGMs.cardFront) : (mergedGMs.card_back || mergedGMs.cardBack);
                        } else if (m.id && mergedGMs[m.id]) {
                            gmUrl = mergedGMs[m.id];
                        }

                        if (gmUrl && isRealImage(gmUrl, targetSid, companyName)) {
                            ai = gmUrl;
                        }

                        const isDfazzSession = targetSid === 'guest_ms3ijgnco2xnid' || targetSid === 'fabrizio' || targetSid === 'djdfazz' || (companyName || '').toLowerCase().includes('d-fazz');
                        
                        if (productsSource && (isDfazzSession || !productsSource.tshirt?.aiImageUrl?.toLowerCase().includes('dfazz'))) {
                            if (isTshirt && (productsSource.tshirt?.aiImageUrl || productsSource.tshirt?.imageUrl)) {
                                if (!isRealImage(ai, targetSid, companyName)) ai = productsSource.tshirt.aiImageUrl || productsSource.tshirt.imageUrl;
                            } else if (isPolo && (productsSource.polo?.aiImageUrl || productsSource.polo?.imageUrl)) {
                                if (!isRealImage(ai, targetSid, companyName)) ai = productsSource.polo.aiImageUrl || productsSource.polo.imageUrl;
                            } else if (isHoodie && (productsSource.hoodie?.aiImageUrl || productsSource.hoodie?.imageUrl)) {
                                if (!isRealImage(ai, targetSid, companyName)) ai = productsSource.hoodie.aiImageUrl || productsSource.hoodie.imageUrl;
                            } else if (isTank && (productsSource.tank_top?.aiImageUrl || productsSource.tank_top?.imageUrl || productsSource.tankFront?.imageUrl)) {
                                if (!isRealImage(ai, targetSid, companyName)) ai = productsSource.tank_top?.aiImageUrl || productsSource.tank_top?.imageUrl || productsSource.tankFront?.imageUrl;
                            } else if (isHeavy && (productsSource.tshirt_oversize?.aiImageUrl || productsSource.tshirt_oversize?.imageUrl || productsSource.heavyFront?.imageUrl)) {
                                if (!isRealImage(ai, targetSid, companyName)) ai = productsSource.tshirt_oversize?.aiImageUrl || productsSource.tshirt_oversize?.imageUrl || productsSource.heavyFront?.imageUrl;
                            }
                        }

                        if (isRealImage(idbAi, targetSid, companyName)) {
                            ai = idbAi;
                        } else if (!isRealImage(ai, targetSid, companyName) && idbAi) {
                            ai = idbAi;
                        }

                        let mechanical = m.mechanical || m.imageBat || m.imageBack || m.backImageUrl || directImg;
                        if (isRealImage(idbMech, targetSid, companyName)) {
                            mechanical = idbMech;
                        } else if (!isRealImage(mechanical, targetSid, companyName) && idbMech) {
                            mechanical = idbMech;
                        }

                        const primaryUrl = ai || mechanical || directImg;

                        return { 
                            ...m,
                            garment,
                            view,
                            imageUrl: primaryUrl || m.imageUrl,
                            frontImageUrl: view === 'front' ? primaryUrl : (m.frontImageUrl || undefined),
                            backImageUrl: view === 'back' ? primaryUrl : (m.backImageUrl || undefined),
                            imageFront: view === 'front' ? primaryUrl : (m.imageFront || undefined),
                            imageBack: view === 'back' ? primaryUrl : (m.imageBack || undefined),
                            ai: isRealImage(ai, targetSid, companyName) ? ai : (isRealImage(directImg, targetSid, companyName) ? directImg : null),
                            mechanical: isRealImage(mechanical, targetSid, companyName) ? mechanical : (isRealImage(directImg, targetSid, companyName) ? directImg : null)
                        };
                    }));
                };

                const localCandidateArrays = [
                    localData?.mockups,
                    localData?.items,
                    latestConfig?.mockups,
                    latestConfig?.items,
                    localData?.products ? (Array.isArray(localData.products) ? localData.products : Object.values(localData.products)) : null,
                    latestConfig?.products ? (Array.isArray(latestConfig.products) ? latestConfig.products : Object.values(latestConfig.products)) : null
                ].filter((arr): arr is any[] => Array.isArray(arr) && arr.length > 0);

                const hasLocalData = sessionStr !== null 
                    || isMockupsLocked 
                    || Object.values(mergedGarmentMockups).some(val => isRealImage(val, sid, localData?.userData?.companyName))
                    || recoveredFromIdb.length > 0
                    || localCandidateArrays.length > 0;

                let localRestored: any[] = [];
                if (hasLocalData) {
                    localRestored = await restoreMockupsArray(
                        localCandidateArrays,
                        mergedGarmentMockups,
                        recoveredFromIdb,
                        sid,
                        cleanSid,
                        localData?.products || latestConfig?.products,
                        latestConfig?.companyName || localData?.userData?.companyName
                    );

                    const initialLocalSession = {
                        ...localData,
                        garmentMockups: mergedGarmentMockups,
                        tshirt_front: mergedGarmentMockups.tshirt_front || mergedGarmentMockups.tshirt || localData?.tshirt_front,
                        tshirt_back: mergedGarmentMockups.tshirt_back || localData?.tshirt_back,
                        polo_front: mergedGarmentMockups.polo_front || mergedGarmentMockups.polo || localData?.polo_front,
                        polo_back: mergedGarmentMockups.polo_back || localData?.polo_back,
                        hoodie_front: mergedGarmentMockups.hoodie_front || mergedGarmentMockups.hoodie || localData?.hoodie_front,
                        hoodie_back: mergedGarmentMockups.hoodie_back || localData?.hoodie_back,
                        userData: {
                            companyName: latestConfig?.companyName || localData?.userData?.companyName || "",
                            email: latestConfig?.contactEmail || localData?.userData?.email || "",
                            activity: latestConfig?.activitySector || localData?.userData?.activity || "",
                            phone: latestConfig?.whatsappNumber || localData?.userData?.phone || "",
                            ...(localData.userData || {})
                        },
                        logoUrl: latestConfig?.logoUrl || localData?.logoUrl || "",
                        mockups: (localData?.mockups && localData.mockups.length > 0) ? localData.mockups : (latestConfig?.mockups || [])
                    };

                    if (!cancelled) {
                        if (!latestConfig?.accentColor && initialLocalSession.accentColor) {
                            setAccentColor(initialLocalSession.accentColor);
                        }
                        setSessionData(initialLocalSession);
                        if (localRestored.length > 0) {
                            setDynamicMockups(localRestored);
                            setIsLoading(false); // AFFICHAGE INSTANTANÉ DES VISUELS SANS ATTENDRE LE RÉSEAU
                        }

                        const modeA = initialLocalSession.logoAMode || 'adapted';
                        const loadedLogoA = await loadLogoFromDB('A', modeA) || latestConfig?.logoA || initialLocalSession?.logoA || initialLocalSession?.logoAUrl || latestConfig?.logoUrl || initialLocalSession?.logoUrl || null;
                        const modeB = initialLocalSession.logoBMode || 'adapted';
                        const loadedLogoB = await loadLogoFromDB('B', modeB) || latestConfig?.logoB || initialLocalSession?.logoB || initialLocalSession?.logoBUrl || latestConfig?.logoAdaptedUrl || initialLocalSession?.logoAdaptedUrl || loadedLogoA;

                        const rawPlacements = latestConfig?.logoPlacements || localData?.logoPlacements || initialLocalSession?.logoPlacements;
                        const loadedPlacements = rawPlacements ? {
                            tFront: rawPlacements.tFront || 'B',
                            tBack: rawPlacements.tBack || 'A',
                            pFront: rawPlacements.pFront || 'B',
                            pBack: rawPlacements.pBack || 'A',
                            hFront: rawPlacements.hFront || 'B',
                            hBack: rawPlacements.hBack || 'A',
                            tankFront: rawPlacements.tankFront || 'B',
                            tankBack: rawPlacements.tankBack || 'A',
                            heavyFront: rawPlacements.heavyFront || 'B',
                            heavyBack: rawPlacements.heavyBack || 'A',
                            cardFront: rawPlacements.cardFront || 'A',
                            cardBack: rawPlacements.cardBack || 'A'
                        } : {
                            tFront: 'B', tBack: 'A', pFront: 'B', pBack: 'A', hFront: 'B', hBack: 'A',
                            tankFront: 'B', tankBack: 'A', heavyFront: 'B', heavyBack: 'A',
                            cardFront: 'A', cardBack: 'A'
                        };

                        if (!cancelled) {
                            setLogoA(loadedLogoA);
                            setLogoB(loadedLogoB);
                            setLogoPlacements(loadedPlacements);
                            setUserLogo(loadedLogoA || loadedLogoB || null);
                        }
                    }
                }

                // =========================================================================
                // 2. FETCH DISTANT EN ARRIÈRE-PLAN (getUserBySlug & Firestore)
                // =========================================================================
                const withTimeout = <T,>(promise: Promise<T>, ms: number = 3000): Promise<T> => {
                    return Promise.race([
                        promise,
                        new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms))
                    ]);
                };

                let apiSuccess = false;
                let cloudDoc: any = null;
                try {
                    const apiSlug = sidParam.startsWith('audit-') ? cleanSid : sidParam;
                    const apiRes = await fetch(
                        `https://us-central1-signaid-prod.cloudfunctions.net/getUserBySlug?slug=${encodeURIComponent(apiSlug)}&_t=${Date.now()}`,
                        { signal: controller.signal }
                    );

                    if (cancelled) return;

                    if (apiRes.ok) {
                        const apiData = await apiRes.json();
                        if (apiData.success && apiData.artist && apiData.products) {
                            apiSuccess = true;
                            const art = apiData.artist;
                            const prods = apiData.products;
                            
                            const apiMockups: any[] = [];
                            prods.forEach((p: any) => {
                                const gType = p.garment?.includes('polo') ? 'polo' 
                                    : (p.garment?.includes('hoodie') || p.garment?.includes('sweat') ? 'sweat' 
                                    : (p.garment?.includes('tank') ? 'tank_top'
                                    : (p.garment?.includes('heavy') || p.garment?.includes('oversize') ? 'tshirt_oversize' : 'tshirt')));
                                
                                const frontId = gType === 'polo' ? 'pFront' 
                                    : (gType === 'sweat' ? 'hFront' 
                                    : (gType === 'tank_top' ? 'tankFront'
                                    : (gType === 'tshirt_oversize' ? 'heavyFront' : 'tFront')));

                                apiMockups.push({
                                    id: frontId,
                                    garment: gType,
                                    view: 'front',
                                    imageUrl: p.frontImageUrl || p.imageUrl,
                                    imageFront: p.frontImageUrl || p.imageUrl,
                                    ai: p.frontImageUrl || p.imageUrl,
                                    mechanical: p.frontImageUrl || p.imageUrl
                                });

                                const defaultBackGabarit = gType === 'polo' ? '/assets/polo-black-JHK510-dos.png' 
                                    : (gType === 'sweat' ? '/assets/hoodie-black-JHK421-dos.png' 
                                    : (gType === 'tank_top' ? '/merch/visionroom/tank-back.png'
                                    : (gType === 'tshirt_oversize' ? '/merch/visionroom/oversize-back.png' : '/assets/tshirt-black-JHK170-dos.png')));
                                const backUrl = (p.backImageUrl && p.backImageUrl.trim() !== '') ? p.backImageUrl : defaultBackGabarit;

                                const backId = gType === 'polo' ? 'pBack' 
                                    : (gType === 'sweat' ? 'hBack' 
                                    : (gType === 'tank_top' ? 'tankBack'
                                    : (gType === 'tshirt_oversize' ? 'heavyBack' : 'tBack')));

                                apiMockups.push({
                                    id: backId,
                                    garment: gType,
                                    view: 'back',
                                    imageUrl: backUrl,
                                    imageBack: backUrl,
                                    ai: p.backImageUrl || '',
                                    mechanical: backUrl
                                });
                            });

                            cloudDoc = {
                                userData: {
                                    companyName: art.companyName || '',
                                    email: art.contactEmail || '',
                                    phone: art.whatsapp || ''
                                },
                                mockups: apiMockups,
                                items: apiMockups,
                                logoUrl: art.logoUrl || '',
                                accentColor: art.accentColor || '#38bdf8'
                            };
                            if (art.logoUrl) setUserLogo(art.logoUrl);
                            if (art.accentColor) setAccentColor(art.accentColor);
                        }
                    }
                } catch (apiErr: any) {
                    if (apiErr?.name === 'AbortError' || apiErr?.message?.includes('aborted') || apiErr?.message?.includes('AbortError')) {
                        // Capture silencieuse de l'annulation sans la traiter comme une erreur critique
                    } else {
                        console.warn("API getUserBySlug fetch skipped in ProductPortal:", apiErr);
                    }
                }

                let firestoreDoc: any = null;
                if (sid) {
                    // 1. btp_projects
                    try {
                        let directSnap = await withTimeout(getDoc(doc(db, 'btp_projects', sid)));
                        if (!directSnap.exists() && cleanSid !== sid) {
                            directSnap = await withTimeout(getDoc(doc(db, 'btp_projects', cleanSid)));
                        }
                        if (directSnap.exists()) {
                            firestoreDoc = directSnap.data();
                        } else {
                            let q = query(collection(db, 'btp_projects'), where('projectId', '==', sid));
                            let snap = await withTimeout(getDocs(q));
                            if (snap.empty && cleanSid !== sid) {
                                q = query(collection(db, 'btp_projects'), where('projectId', '==', cleanSid));
                                snap = await withTimeout(getDocs(q));
                            }
                            if (snap.empty) {
                                q = query(collection(db, 'btp_projects'), where('previewId', '==', sid));
                                snap = await withTimeout(getDocs(q));
                            }
                            if (snap.empty && cleanSid !== sid) {
                                q = query(collection(db, 'btp_projects'), where('previewId', '==', cleanSid));
                                snap = await withTimeout(getDocs(q));
                            }
                            if (!snap.empty) {
                                const sortedDocs = snap.docs.map(d => d.data()).sort((a: any, b: any) => {
                                    const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
                                    const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
                                    return timeB - timeA;
                                });
                                firestoreDoc = sortedDocs[0];
                            }
                        }
                    } catch (btpErr: any) {
                        console.warn("[ProductPortal] btp_projects read skipped or denied:", btpErr?.message || btpErr);
                    }

                    // 2. anonymous_previews
                    if (!firestoreDoc) {
                        try {
                            let prevSnap = await withTimeout(getDoc(doc(db, 'anonymous_previews', sid)));
                            if (!prevSnap.exists() && cleanSid !== sid) {
                                prevSnap = await withTimeout(getDoc(doc(db, 'anonymous_previews', cleanSid)));
                            }
                            if (prevSnap.exists()) {
                                const pData = prevSnap.data();
                                firestoreDoc = {
                                    userData: { 
                                        companyName: pData.companyName || "", 
                                        email: pData.userEmail || pData.contactEmail || "",
                                        activity: pData.activitySector || pData.activity || "",
                                        phone: pData.whatsappNumber || pData.phone || "",
                                        website: pData.websiteUrl || pData.website || "",
                                        tva: pData.vatNumber || pData.tva || ""
                                    },
                                    mockups: pData.items || pData.mockups || [],
                                    items: pData.items || pData.mockups || [],
                                    products: pData.products || null,
                                    garmentMockups: pData.garmentMockups || null,
                                    tshirt_front: pData.tshirt_front || null,
                                    tshirt_back: pData.tshirt_back || null,
                                    polo_front: pData.polo_front || null,
                                    polo_back: pData.polo_back || null,
                                    hoodie_front: pData.hoodie_front || pData.hoodie || null,
                                    hoodie_back: pData.hoodie_back || null,
                                    logoUrl: pData.logoUrl || pData.logoAdaptedUrl || "",
                                    accentColor: pData.accentColor || "#ea580c"
                                };
                            }
                        } catch (prevErr: any) {
                            console.warn("[ProductPortal] anonymous_previews read skipped or denied:", prevErr?.message || prevErr);
                        }
                    }

                    // 3. SiteConfigs
                    if (!firestoreDoc) {
                        try {
                            let siteSnap = await withTimeout(getDoc(doc(db, 'SiteConfigs', cleanSid)));
                            if (!siteSnap.exists() && cleanSid !== sid) {
                                siteSnap = await withTimeout(getDoc(doc(db, 'SiteConfigs', sid)));
                            }
                            if (siteSnap.exists()) {
                                const sData = siteSnap.data();
                                firestoreDoc = {
                                    userData: { 
                                        companyName: sData.companyName || "", 
                                        email: sData.contactEmail || sData.email || "",
                                        activity: sData.activitySector || sData.activity || "",
                                        phone: sData.whatsappNumber || sData.phone || "",
                                        website: sData.websiteUrl || sData.website || "",
                                        tva: sData.vatNumber || sData.tva || ""
                                    },
                                    mockups: sData.items || sData.products || sData.mockups || [],
                                    items: sData.items || sData.products || sData.mockups || [],
                                    products: sData.products || null,
                                    garmentMockups: sData.garmentMockups || null,
                                    tshirt_front: sData.tshirt_front || null,
                                    tshirt_back: sData.tshirt_back || null,
                                    polo_front: sData.polo_front || null,
                                    polo_back: sData.polo_back || null,
                                    hoodie_front: sData.hoodie_front || sData.hoodie || null,
                                    hoodie_back: sData.hoodie_back || null,
                                    logoUrl: sData.logoUrl || sData.auditLogoUrl || "",
                                    accentColor: sData.accentColor || "#ea580c"
                                };
                            }
                        } catch (siteErr: any) {
                            console.warn("[ProductPortal] SiteConfigs read skipped or denied:", siteErr?.message || siteErr);
                        }
                    }
                }

                if (firestoreDoc) {
                    if (cloudDoc) {
                        cloudDoc = {
                            ...cloudDoc,
                            ...firestoreDoc,
                            userData: {
                                ...(cloudDoc.userData || {}),
                                ...(firestoreDoc.userData || {})
                            },
                            garmentMockups: {
                                ...(cloudDoc.garmentMockups || {}),
                                ...(firestoreDoc.garmentMockups || {})
                            },
                            mockups: (firestoreDoc.mockups && firestoreDoc.mockups.length > 0) ? firestoreDoc.mockups : cloudDoc.mockups,
                            items: (firestoreDoc.items && firestoreDoc.items.length > 0) ? firestoreDoc.items : cloudDoc.items,
                            products: firestoreDoc.products || cloudDoc.products || null
                        };
                    } else {
                        cloudDoc = firestoreDoc;
                    }
                }

                if (cloudDoc?.garmentMockups) {
                    Object.assign(mergedGarmentMockups, cloudDoc.garmentMockups);
                }

                // =========================================================================
                // 3. FUSION ET FALLBACK RÉSILIENT (CONSERVATION DES MAQUETTES LOCALES)
                // =========================================================================
                if (cloudDoc) {
                    const remoteCandidateArrays = [
                        localData?.mockups,
                        localData?.items,
                        cloudDoc?.mockups,
                        cloudDoc?.items,
                        latestConfig?.mockups,
                        latestConfig?.items,
                        localData?.products ? (Array.isArray(localData.products) ? localData.products : Object.values(localData.products)) : null,
                        latestConfig?.products ? (Array.isArray(latestConfig.products) ? latestConfig.products : Object.values(latestConfig.products)) : null,
                        cloudDoc?.products ? (Array.isArray(cloudDoc.products) ? cloudDoc.products : Object.values(cloudDoc.products)) : null
                    ].filter((arr): arr is any[] => Array.isArray(arr) && arr.length > 0);

                    const remoteRestored = await restoreMockupsArray(
                        remoteCandidateArrays,
                        mergedGarmentMockups,
                        recoveredFromIdb,
                        sid,
                        cleanSid,
                        cloudDoc?.products || localData?.products || latestConfig?.products,
                        latestConfig?.companyName || cloudDoc?.userData?.companyName || localData?.userData?.companyName
                    );

                    const mergedData = {
                        ...localData,
                        ...cloudDoc,
                        garmentMockups: mergedGarmentMockups,
                        tshirt_front: mergedGarmentMockups.tshirt_front || mergedGarmentMockups.tshirt || localData?.tshirt_front || cloudDoc?.tshirt_front,
                        tshirt_back: mergedGarmentMockups.tshirt_back || localData?.tshirt_back || cloudDoc?.tshirt_back,
                        polo_front: mergedGarmentMockups.polo_front || mergedGarmentMockups.polo || localData?.polo_front || cloudDoc?.polo_front,
                        polo_back: mergedGarmentMockups.polo_back || localData?.polo_back || cloudDoc?.polo_back,
                        hoodie_front: mergedGarmentMockups.hoodie_front || mergedGarmentMockups.hoodie || localData?.hoodie_front || cloudDoc?.hoodie_front,
                        hoodie_back: mergedGarmentMockups.hoodie_back || localData?.hoodie_back || cloudDoc?.hoodie_back,
                        userData: {
                            companyName: latestConfig?.companyName || cloudDoc?.userData?.companyName || localData?.userData?.companyName || "",
                            email: latestConfig?.contactEmail || cloudDoc?.userData?.email || localData?.userData?.email || "",
                            activity: latestConfig?.activitySector || cloudDoc?.userData?.activity || localData?.userData?.activity || "",
                            phone: latestConfig?.whatsappNumber || cloudDoc?.userData?.phone || localData?.userData?.phone || "",
                            ...(localData.userData || {}),
                            ...(cloudDoc?.userData || {})
                        },
                        logoUrl: latestConfig?.logoUrl || cloudDoc?.logoUrl || localData?.logoUrl || "",
                        mockups: (isMockupsLocked && localData?.mockups?.length > 0)
                            ? localData.mockups
                            : (cloudDoc?.mockups || cloudDoc?.items || localData?.mockups || latestConfig?.mockups || latestConfig?.items || [])
                    };

                    if (!cancelled) {
                        if (!latestConfig?.accentColor && mergedData.accentColor) {
                            setAccentColor(mergedData.accentColor);
                        }
                        setSessionData(mergedData);

                        // FALLBACK RÉSILIENT : Ne réinitialise JAMAIS les maquettes existantes si le résultat distant n'en contient pas
                        const hasRealRemoteMockups = remoteRestored.some(item => isRealImage(item.ai, sid, mergedData?.userData?.companyName) || isRealImage(item.mechanical, sid, mergedData?.userData?.companyName) || isRealImage(item.imageUrl, sid, mergedData?.userData?.companyName));
                        const hasLocalRealImages = localRestored.some(item => isRealImage(item.ai, sid, mergedData?.userData?.companyName) || isRealImage(item.mechanical, sid, mergedData?.userData?.companyName) || isRealImage(item.imageUrl, sid, mergedData?.userData?.companyName));
                        if (!isMockupsLocked && (!hasLocalRealImages && (hasRealRemoteMockups || localRestored.length === 0))) {
                            setDynamicMockups(remoteRestored);
                        }

                        const modeA = mergedData.logoAMode || 'adapted';
                        const loadedLogoA = await loadLogoFromDB('A', modeA) || latestConfig?.logoA || mergedData?.logoA || mergedData?.logoAUrl || latestConfig?.logoUrl || mergedData?.logoUrl || null;
                        const modeB = mergedData.logoBMode || 'adapted';
                        const loadedLogoB = await loadLogoFromDB('B', modeB) || latestConfig?.logoB || mergedData?.logoB || mergedData?.logoBUrl || latestConfig?.logoAdaptedUrl || mergedData?.logoAdaptedUrl || loadedLogoA;

                        const rawPlacements = latestConfig?.logoPlacements || cloudDoc?.logoPlacements || cloudDoc?.placements || localData?.logoPlacements || mergedData?.logoPlacements || mergedData?.placements;
                        const loadedPlacements = rawPlacements ? {
                            tFront: rawPlacements.tFront || 'B',
                            tBack: rawPlacements.tBack || 'A',
                            pFront: rawPlacements.pFront || 'B',
                            pBack: rawPlacements.pBack || 'A',
                            hFront: rawPlacements.hFront || 'B',
                            hBack: rawPlacements.hBack || 'A',
                            tankFront: rawPlacements.tankFront || 'B',
                            tankBack: rawPlacements.tankBack || 'A',
                            heavyFront: rawPlacements.heavyFront || 'B',
                            heavyBack: rawPlacements.heavyBack || 'A',
                            cardFront: rawPlacements.cardFront || 'A',
                            cardBack: rawPlacements.cardBack || 'A'
                        } : {
                            tFront: 'B', tBack: 'A', pFront: 'B', pBack: 'A', hFront: 'B', hBack: 'A',
                            tankFront: 'B', tankBack: 'A', heavyFront: 'B', heavyBack: 'A',
                            cardFront: 'A', cardBack: 'A'
                        };

                        if (!cancelled) {
                            setLogoA(loadedLogoA);
                            setLogoB(loadedLogoB);
                            setLogoPlacements(loadedPlacements);
                            setUserLogo(loadedLogoA || loadedLogoB || null);
                        }
                    }
                } else {
                    // Si aucun document cloud n'est récupéré (ou si avorté/ignoré) :
                    // FALLBACK RÉSILIENT : conserver les visuels issus d'IndexedDB/local storage
                    if (!cancelled && localRestored.length === 0) {
                        const fallbackRestored = await restoreMockupsArray(
                            [],
                            mergedGarmentMockups,
                            recoveredFromIdb,
                            sid,
                            cleanSid,
                            null,
                            latestConfig?.companyName || localData?.userData?.companyName
                        );
                        if (fallbackRestored.length > 0) {
                            setDynamicMockups(fallbackRestored);
                        }
                    }
                }
            } catch (err) {
                if (!cancelled) {
                    console.error("loadActiveSession error in ProductPortal:", err);
                }
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        };

        loadActiveSession();

        return () => {
            cancelled = true;
            isMountedRef.current = false;
            // Protéger contre la double exécution de React.StrictMode en dev :
            // Ne pas déclencher l'annulation du fetch si le composant n'est pas réellement démonté.
            setTimeout(() => {
                if (!isMountedRef.current) {
                    try {
                        controller.abort();
                    } catch { }
                }
            }, 250);
        };
    }, [slug, previewId]);

    const handleOpenEditSession = async () => {
        setEditCompanyName(sessionData?.userData?.companyName || '');
        setEditEmail(sessionData?.userData?.email || '');
        
        // Auto-create/sync the preview document in the background so the link works immediately when copied
        let pId = (sessionData as any)?.previewId || localStorage.getItem(`btp_preview_uuid_${sessionId}`) || sessionId;
        if (pId) {
            try {
                const previewRef = doc(db, 'anonymous_previews', pId);
                const previewSnap = await getDoc(previewRef);
                if (!previewSnap.exists()) {
                    const previewData = {
                        previewId: pId,
                        companyName: sessionData?.userData?.companyName || "",
                        logoUrl: sessionData?.logoUrl || "",
                        accentColor: accentColor || "#ea580c",
                        items: (dynamicMockups?.length > 0 ? dynamicMockups : sessionData?.mockups || []).map((m: any) => ({
                            id: m.id || "",
                            title: m.title || "Article Personnalisé",
                            price: (m.id || "").includes('basic') ? 25 : 39,
                            imageFront: m.ai || m.base || "",
                            imageBack: m.mechanical || "",
                            selected: !!m.selected,
                            garment: m.garment || ""
                        })),
                        status: 'pending',
                        userEmail: sessionData?.userData?.email || null,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    };
                    await setDoc(previewRef, sanitizeForFirestore(previewData));
                }
            } catch (err) {
                console.error("Auto-sync preview failed:", err);
            }
        }
    };

    const handleSaveSessionData = async () => {
        if (!editCompanyName.trim()) {
            alert("Veuillez saisir au moins le nom de l'entreprise.");
            return;
        }
        
        setIsSubmitting(true);
        try {
            const sidToSave = sessionId || localStorage.getItem('btp_active_session_id') || `audit-${Date.now().toString(36)}`;
            
            const updatedUserData = {
                ...(sessionData?.userData || {}),
                companyName: editCompanyName.trim(),
                email: editEmail.trim()
            };

            const updatedSession = {
                ...(sessionData || {}),
                projectId: sidToSave,
                userData: updatedUserData,
                accentColor: accentColor,
                mockups: dynamicMockups?.length > 0 ? dynamicMockups : (sessionData?.mockups || []),
                updatedAt: new Date().toISOString()
            };

            // 1. Save locally to IndexedDB
            await dbSet(`session_obj_${sidToSave}`, JSON.stringify(updatedSession));
            
            // 2. Save to Cloud (btp_projects)
            const q = query(collection(db, 'btp_projects'), where('projectId', '==', sidToSave));
            const snap = await getDocs(q);
            
            if (!snap.empty) {
                const docRef = snap.docs[0].ref;
                await updateDoc(docRef, sanitizeForFirestore({
                    userData: updatedUserData
                }));
            }

            let pId = (sessionData as any)?.previewId || localStorage.getItem(`btp_preview_uuid_${sessionId}`) || sessionId;
            const cleanSid = sidToSave.replace(/^audit-/, '');
            const cleanSlug = editCompanyName.trim().toLowerCase().replace(/[^a-z0-9]/g, '');

            const syncPayload = sanitizeForFirestore({
                companyName: editCompanyName.trim(),
                userEmail: editEmail.trim(),
                contactEmail: editEmail.trim(),
                slug: cleanSlug || cleanSid,
                accentColor: accentColor || "#ea580c",
                updatedAt: new Date().toISOString()
            });

            // Sync across collections for full consistency
            const targetIds = Array.from(new Set([pId, sidToSave, cleanSid, cleanSlug].filter(Boolean)));
            for (const tId of targetIds) {
                try {
                    await setDoc(doc(db, 'SiteConfigs', tId), syncPayload, { merge: true });
                    await setDoc(doc(db, 'anonymous_previews', tId), syncPayload, { merge: true });
                    await setDoc(doc(db, 'configs', tId), syncPayload, { merge: true });
                } catch (syncErr) {
                    console.warn(`Sync failed for ${tId}:`, syncErr);
                }
            }

            setSessionData(updatedSession);
            setShowEditSessionModal(false);
            alert("Informations de la session mises à jour avec succès !");
        } catch (err) {
            console.error("Failed to save session profile:", err);
            alert("Erreur lors de la sauvegarde.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const updateQuantity = (packId: string, size: string, val: string) => {
        let num = parseInt(val) || 0;
        // Suppression de la contrainte forcée à 10 par taille pour permettre la souplesse (ex: 2 S, 5 M, 3 L)
        if (num < 0) num = 0;

        setOrderQuantities(prev => ({
            ...prev,
            [packId]: { ...(prev[packId] || {}), [size]: num }
        }));
    };

    const getDefaultStudioImage = (garmentType: string, view: 'front' | 'back', found?: any) => {
        if (found) {
            const candidate = found.imageUrl || (view === 'front' ? (found.frontImageUrl || found.imageFront || found.ai || found.mechanical) : (found.backImageUrl || found.imageBack || found.mechanical || found.ai));
            if (isRealImage(candidate)) return candidate;
        }
        if (garmentType === 'polo') {
            return view === 'front' ? '/assets/polo-black-JHK510.png' : '/assets/polo-black-JHK510-dos.png';
        }
        if (garmentType === 'sweat' || garmentType === 'hoodie') {
            return view === 'front' ? '/assets/hoodie-black-JHK421.png' : '/assets/hoodie-black-JHK421-dos.png';
        }
        if (garmentType === 'tshirt_basic') {
            return view === 'front' ? '/assets/tshirt-grey-JHK170.png' : '/assets/tshirt-grey-JHK170-dos.png';
        }
        if (garmentType === 'tank_top') {
            return view === 'front' ? '/merch/visionroom/tank-front.png' : '/merch/visionroom/tank-back.png';
        }
        if (garmentType === 'tshirt_oversize') {
            return view === 'front' ? '/merch/visionroom/oversize-front.png' : '/merch/visionroom/oversize-back.png';
        }
        if (garmentType === 'business_card') {
            return '/assets/card-base.svg';
        }
        return view === 'front' ? '/assets/tshirt-black-JHK170.png' : '/assets/tshirt-black-JHK170-dos.png';
    };

    const getDefaultBatImage = (garmentType: string, view: 'front' | 'back', defaultImg: string) => {
        if (garmentType === 'tshirt') return view === 'front' ? '/assets/tshirt-black-JHK170.png' : '/assets/tshirt-black-JHK170-dos.png';
        if (garmentType === 'tshirt_basic') return view === 'front' ? '/assets/tshirt-grey-JHK170.png' : '/assets/tshirt-grey-JHK170-dos.png';
        if (garmentType === 'polo') return view === 'front' ? '/assets/polo-black-JHK510.png' : '/assets/polo-black-JHK510-dos.png';
        if (garmentType === 'sweat' || garmentType === 'hoodie') return view === 'front' ? '/assets/hoodie-black-JHK421.png' : '/assets/hoodie-black-JHK421-dos.png';
        if (garmentType === 'tank_top') return view === 'front' ? '/merch/visionroom/tank-front.png' : '/merch/visionroom/tank-back.png';
        if (garmentType === 'tshirt_oversize') return view === 'front' ? '/merch/visionroom/oversize-front.png' : '/merch/visionroom/oversize-back.png';
        if (garmentType === 'business_card') return '/assets/card-base.svg';
        return defaultImg || (view === 'front' ? '/assets/tshirt-black-JHK170.png' : '/assets/tshirt-black-JHK170-dos.png');
    };


    const isBlankTemplate = (url?: string | null): boolean => {
        if (!url || typeof url !== 'string') return false;
        const u = url.trim().toLowerCase();
        if (!u || u === '""' || u.length < 5) return false;
        
        // Si c'est un rendu composite (Data URL base64, ou fichier Cloud Storage pré-généré), ce n'est PAS un gabarit vierge
        if (u.startsWith('data:image') || u.includes('btp_mockups') || u.includes('_mech_') || u.includes('_ai_')) {
            return false;
        }
        if (u.includes('firebasestorage') || u.includes('storage.googleapis.com')) {
            return false;
        }
        
        // Si l'asset local est une photo mannequin pré-rendue (ex: dfazz_tshirt_front.jpg), pas de superposition
        if (u.includes('dfazz') || u.includes('preset') || u.includes('isolated')) {
            return false;
        }
        
        // Gabarits textiles neutres vérifiés vierges locaux (dans /assets/)
        if (u.startsWith('/assets/') || u.startsWith('assets/')) {
            if (u.includes('jhk') || u.includes('card-base') || u.includes('card_mockup') || u.includes('bctw') || u.includes('tshirt-') || u.includes('polo-') || u.includes('hoodie-')) {
                return true;
            }
        }
        
        // Gabarits vierges sous /merch/visionroom/ (tank top, oversize) — doivent aussi recevoir l'overlay logo
        if (u.startsWith('/merch/visionroom/') || u.startsWith('merch/visionroom/')) {
            if (u.includes('tank-front') || u.includes('tank-back') ||
                u.includes('oversize-front') || u.includes('oversize-back')) {
                return true;
            }
        }
        
        return false;
    };

    const getDynamicImage = (garmentType: string, view: 'front' | 'back', mode: 'studio' | 'bat', defaultImg: string, specificFrontId?: string, specificBackId?: string): string => {
        const isFront = view === 'front';
        const specificId = isFront ? specificFrontId : specificBackId;

        // 1. PRIORITY 1: Search in dynamicMockups state (restored session mockups)
        let found = specificId ? dynamicMockups.find(m => m.id === specificId) : null;
        if (!found) {
            found = dynamicMockups.find(m => (m.garment === garmentType || (garmentType === 'tshirt_basic' && m.garment === 'tshirt')) && m.view === view);
        }
        
        if (!found) {
            let altId = '';
            if (garmentType === 'tshirt') altId = isFront ? 'tFront' : 'tBack';
            else if (garmentType === 'tshirt_basic') altId = isFront ? 'tbFront' : 'tbBack';
            else if (garmentType === 'polo') altId = isFront ? 'pFront' : 'pBack';
            else if (garmentType === 'sweat' || garmentType === 'hoodie') altId = isFront ? 'hFront' : 'hBack';
            else if (garmentType === 'tank_top') altId = isFront ? 'tankFront' : 'tankBack';
            else if (garmentType === 'tank_top_white') altId = isFront ? 'tankWhiteFront' : 'tankWhiteBack';
            else if (garmentType === 'tshirt_oversize') altId = isFront ? 'heavyFront' : 'heavyBack';
            else if (garmentType === 'business_card') altId = isFront ? 'cardFront' : 'cardBack';
            
            if (altId) {
                const altFound = dynamicMockups.find(m => m.id === altId);
                if (altFound) found = altFound;
            }
        }

        if (found) {
            if (mode === 'studio') {
                const aiCandidate = found.ai 
                    || (isFront ? (found.frontImageUrl || found.imageFront) : (found.backImageUrl || found.imageBack))
                    || found.imageUrl 
                    || found.mechanical;
                if (isRealImage(aiCandidate) && !aiCandidate?.includes('male_tshirt')) {
                    return aiCandidate!;
                }
            } else {
                // Mode BAT
                const mechCandidate = found.mechanical 
                    || (isFront ? (found.frontImageUrl || found.imageFront) : (found.backImageUrl || found.imageBack))
                    || found.imageUrl 
                    || found.ai;
                if (isRealImage(mechCandidate) && !mechCandidate?.includes('male_tshirt')) {
                    return mechCandidate!;
                }
            }
        }

        // 2. PRIORITY 2: Check sessionData.garmentMockups (generated dictionary from audit)
        const gm = sessionData?.garmentMockups || {};
        let gmCandidate: string | null = null;
        if (garmentType === 'tshirt' || garmentType === 'tshirt_basic') {
            gmCandidate = isFront ? (gm.tshirt_front || gm.tshirt || gm.tFront) : (gm.tshirt_back || gm.tBack);
        } else if (garmentType === 'polo') {
            gmCandidate = isFront ? (gm.polo_front || gm.polo || gm.pFront) : (gm.polo_back || gm.pBack);
        } else if (garmentType === 'sweat' || garmentType === 'hoodie') {
            gmCandidate = isFront 
                ? (gm.hoodie_front || gm.hoodie || gm.sweat_front || gm.sweat || gm.hFront)
                : (gm.hoodie_back || gm.sweat_back || gm.hBack);
        } else if (garmentType === 'tank_top') {
            gmCandidate = isFront ? (gm.tank_front || gm.tank_top || gm.tankFront) : (gm.tank_back || gm.tankBack);
        } else if (garmentType === 'tshirt_oversize') {
            gmCandidate = isFront ? (gm.heavy_front || gm.tshirt_oversize || gm.heavyFront) : (gm.heavy_back || gm.heavyBack);
        } else if (garmentType === 'business_card') {
            gmCandidate = isFront ? (gm.card_front || gm.business_card || gm.cardFront) : (gm.card_back || gm.cardBack);
        }
        if (gmCandidate && isRealImage(gmCandidate)) {
            return gmCandidate;
        }

        // 3. PRIORITY 3: Check sessionData.products schema for direct URLs
        const prods = sessionData?.products;
        if (prods && typeof prods === 'object') {
            let pObj: any = null;
            if (garmentType === 'tshirt' || garmentType === 'tshirt_basic') {
                pObj = prods.tshirt || prods.tFront;
            } else if (garmentType === 'polo') {
                pObj = prods.polo || prods.pFront;
            } else if (garmentType === 'sweat' || garmentType === 'hoodie') {
                pObj = prods.hoodie || prods.sweat || prods.hFront;
            } else if (garmentType === 'tank_top') {
                pObj = prods.tank_top || prods.tankFront;
            } else if (garmentType === 'tshirt_oversize') {
                pObj = prods.tshirt_oversize || prods.heavyweight_tee || prods.heavyFront;
            } else if (garmentType === 'business_card') {
                pObj = prods.business_card || prods.cardFront;
            }
            if (pObj) {
                const pImg = isFront 
                    ? (pObj.frontImageUrl || pObj.imageFront || pObj.aiImageUrl || pObj.imageUrl)
                    : (pObj.backImageUrl || pObj.imageBack || pObj.imageUrl);
                if (pImg && isRealImage(pImg)) {
                    return pImg;
                }
            }
        }

        // 4. PRIORITY 4: Check sessionData root direct garment keys
        let rootCandidate: string | null = null;
        if (garmentType === 'tshirt' || garmentType === 'tshirt_basic') {
            rootCandidate = isFront ? (sessionData?.tshirt_front || sessionData?.tshirt) : sessionData?.tshirt_back;
        } else if (garmentType === 'polo') {
            rootCandidate = isFront ? (sessionData?.polo_front || sessionData?.polo) : sessionData?.polo_back;
        } else if (garmentType === 'sweat' || garmentType === 'hoodie') {
            rootCandidate = isFront ? (sessionData?.hoodie_front || sessionData?.hoodie || sessionData?.sweat_front) : (sessionData?.hoodie_back || sessionData?.sweat_back);
        } else if (garmentType === 'tank_top') {
            rootCandidate = isFront ? sessionData?.tank_front : sessionData?.tank_back;
        } else if (garmentType === 'tshirt_oversize') {
            rootCandidate = isFront ? sessionData?.heavy_front : sessionData?.heavy_back;
        }
        if (rootCandidate && isRealImage(rootCandidate)) {
            return rootCandidate;
        }

        // 5. PRIORITY 5: Check localStorage keys for freshly locked mockups
        if (typeof localStorage !== 'undefined') {
            const sidKey = sessionId || '';
            const cleanKey = sidKey.replace(/^audit-/, '');
            let localCandidate: string | null = null;
            if (garmentType === 'tshirt' || garmentType === 'tshirt_basic') {
                localCandidate = isFront
                    ? (localStorage.getItem(`btp_mockup_tshirt_front_${cleanKey}`) || localStorage.getItem(`btp_mockup_tshirt_front_${sidKey}`) || localStorage.getItem('btp_mockup_tshirt_front') || localStorage.getItem(`btp_mockup_tshirt_${cleanKey}`) || localStorage.getItem('btp_mockup_tshirt'))
                    : (localStorage.getItem(`btp_mockup_tshirt_back_${cleanKey}`) || localStorage.getItem(`btp_mockup_tshirt_back_${sidKey}`) || localStorage.getItem('btp_mockup_tshirt_back'));
            } else if (garmentType === 'polo') {
                localCandidate = isFront
                    ? (localStorage.getItem(`btp_mockup_polo_front_${cleanKey}`) || localStorage.getItem(`btp_mockup_polo_front_${sidKey}`) || localStorage.getItem('btp_mockup_polo_front') || localStorage.getItem(`btp_mockup_polo_${cleanKey}`) || localStorage.getItem('btp_mockup_polo'))
                    : (localStorage.getItem(`btp_mockup_polo_back_${cleanKey}`) || localStorage.getItem(`btp_mockup_polo_back_${sidKey}`) || localStorage.getItem('btp_mockup_polo_back'));
            } else if (garmentType === 'sweat' || garmentType === 'hoodie') {
                localCandidate = isFront
                    ? (localStorage.getItem(`btp_mockup_hoodie_front_${cleanKey}`) || localStorage.getItem(`btp_mockup_hoodie_front_${sidKey}`) || localStorage.getItem('btp_mockup_hoodie_front') || localStorage.getItem(`btp_mockup_hoodie_${cleanKey}`) || localStorage.getItem(`btp_mockup_hoodie_${sidKey}`) || localStorage.getItem('btp_mockup_hoodie'))
                    : (localStorage.getItem(`btp_mockup_hoodie_back_${cleanKey}`) || localStorage.getItem(`btp_mockup_hoodie_back_${sidKey}`) || localStorage.getItem('btp_mockup_hoodie_back'));
            }
            if (localCandidate && isRealImage(localCandidate)) {
                return localCandidate;
            }
        }

        // 6. PRIORITY 6: Fallback for specific predefined demo sessions (e.g. dfazz) ONLY if no generated image was found
        const isDfazzSession = sessionId === 'guest_ms3ijgnco2xnid' || sessionId === 'fabrizio' || sessionId === 'djdfazz' || (sessionData?.userData?.companyName || '').toLowerCase().includes('d-fazz');
        if (isDfazzSession && (!sessionData?.logoUrl || sessionData?.logoUrl.includes('logo_dfazz'))) {
            if (garmentType === 'sweat' || garmentType === 'hoodie') {
                return isFront ? '/assets/dfazz_hoodie_front.jpg' : '/assets/dfazz_hoodie_back.jpg';
            }
            if (garmentType === 'polo') {
                return isFront ? '/assets/dfazz_polo_front.jpg' : '/assets/dfazz_polo_back.jpg';
            }
            if (garmentType === 'business_card') {
                return isFront ? '/assets/models/card_mockup_front_neutral.png' : '/assets/models/card_mockup_back.png';
            }
            return isFront ? '/assets/dfazz_tshirt_front.jpg' : '/assets/dfazz_tshirt_back.jpg';
        }

        // 7. PRIORITY 7: Neutral catalog fallbacks
        if (mode === 'studio') {
            return getDefaultStudioImage(garmentType, view, found);
        } else {
            return getDefaultBatImage(garmentType, view, defaultImg);
        }
    };

    const toggleView = (packId: string) => {
        setCardViews(prev => {
            const current = prev[packId] || 'front';
            return {
                ...prev,
                [packId]: current === 'front' ? 'back' : 'front'
            };
        });
    };

    const toggleMode = (packId: string) => {
        setDisplayModes(prev => ({
            ...prev,
            [packId]: prev[packId] === 'studio' ? 'bat' : 'studio'
        }));
    };

    const calculateTotalGarments = () => {
        return orderItems.length;
    };

    const calculateTotalItems = () => {
        let total = orderItems.length; // Nominative items
        
        // Add bulk items (business_card)
        Object.keys(orderQuantities).forEach(packId => {
            if (packId === 'business_card') {
                const packQty = orderQuantities[packId] || {};
                Object.keys(packQty).forEach(size => {
                    const val = packQty[size] || 0;
                    total += val;
                });
            }
        });
        return total;
    };

    const getPriceForPack = (pack: any, size: string) => {
        if (pack.type === 'business_card') {
            const priceMap: any = {
                '250': 117.22,
                '500': 121.29,
                '1000': 129.76,
                '2500': 151.35
            };
            return priceMap[size] || 0;
        }
        return pack.pricePublic || 0;
    };
    const allPacks = isShop ? [
        {
            id: 'tshirt',
            category: 'clothing',
            type: selectedTshirtVariant === 'leger' ? 'tshirt_basic' : 'tshirt',
            name: selectedTshirtVariant === 'leger' ? 'T-Shirt Léger (150g/m² Standard)' : 'T-Shirt Noir (190g/m² Premium)',
            description: selectedTshirtVariant === 'leger' ? 'T-shirt JHK 150 - Coupe Confort' : 'T-shirt JHK 170 Premium - Noir, Maille Épaisse',
            pricePublic: selectedTshirtVariant === 'leger' ? 25 : 30,
            priceSub: selectedTshirtVariant === 'leger' ? 25 : 30,
            getImages: (view: 'front' | 'back', mode: 'studio' | 'bat') => getDynamicImage(selectedTshirtVariant === 'leger' ? 'tshirt_basic' : 'tshirt', view, mode, view === 'front' ? (selectedTshirtVariant === 'leger' ? '/assets/tshirt-grey-JHK170.png' : '/assets/tshirt-black-JHK170.png') : (selectedTshirtVariant === 'leger' ? '/assets/tshirt-grey-JHK170-dos.png' : '/assets/tshirt-black-JHK170-dos.png')),
            icon: <Sun className="text-zinc-500" size={20} />,
            quantities: ['S', 'M', 'L', 'XL', 'XXL']
        },
        {
            id: 'polo',
            category: 'clothing',
            type: 'polo',
            name: 'Pack Polo Premium',
            description: 'Polo JHK 510 Premium - Coupe Ajustée Professionnelle',
            pricePublic: 35,
            priceSub: 35,
            getImages: (view: 'front' | 'back', mode: 'studio' | 'bat') => getDynamicImage('polo', view, mode, view === 'front' ? '/assets/polo-black-JHK510.png' : '/assets/polo-black-JHK510-dos.png'),
            icon: <Shirt className="text-emerald-500" size={20} />,
            quantities: ['S', 'M', 'L', 'XL', 'XXL']
        },
        {
            id: 'hoodie',
            category: 'clothing',
            type: 'sweat',
            name: 'Pack Hoodie Protection (Renforcé Thermique)',
            description: 'Hoodie Premium Renforcé - Doublure Thermique Active',
            pricePublic: 45,
            priceSub: 45,
            getImages: (view: 'front' | 'back', mode: 'studio' | 'bat') => getDynamicImage('sweat', view, mode, view === 'front' ? '/assets/hoodie-black-JHK421.png' : '/assets/hoodie-black-JHK421-dos.png'),
            icon: <Wind className="text-blue-400" size={20} />,
            quantities: ['S', 'M', 'L', 'XL', 'XXL']
        },
        ...(dynamicMockups.some(m => (m.garment === 'tank_top' && !m.id?.toLowerCase().includes('white')) || m.id === 'tankFront' || m.id === 'tankBack') ? [{
            id: 'tank_top',
            category: 'clothing',
            type: 'tank_top',
            name: 'Pack Débardeur Noir Pro',
            description: 'Débardeur Coupe Athlétique Noir - Maille Respirante',
            pricePublic: 28,
            priceSub: 28,
            getImages: (view: 'front' | 'back', mode: 'studio' | 'bat') => getDynamicImage('tank_top', view, mode, view === 'front' ? '/merch/visionroom/tank-front.png' : '/merch/visionroom/tank-back.png', 'tankFront', 'tankBack'),
            icon: <Shirt className="text-orange-500" size={20} />,
            quantities: ['S', 'M', 'L', 'XL', 'XXL']
        }] : []),
        ...(dynamicMockups.some(m => m.id?.toLowerCase().includes('tankwhite') || (m.garment === 'tank_top' && m.id?.toLowerCase().includes('white'))) ? [{
            id: 'tank_top_white',
            category: 'clothing',
            type: 'tank_top',
            name: 'Pack Débardeur Blanc Pro',
            description: 'Débardeur Coupe Athlétique Blanc - Maille Respirante',
            pricePublic: 28,
            priceSub: 28,
            getImages: (view: 'front' | 'back', mode: 'studio' | 'bat') => getDynamicImage('tank_top_white', view, mode, view === 'front' ? '/merch/visionroom/tank-front.png' : '/merch/visionroom/tank-back.png', 'tankWhiteFront', 'tankWhiteBack'),
            icon: <Shirt className="text-gray-300" size={20} />,
            quantities: ['S', 'M', 'L', 'XL', 'XXL']
        }] : []),
        ...(dynamicMockups.some(m => m.garment === 'tshirt_oversize' || m.id?.toLowerCase().includes('heavy')) ? [{
            id: 'tshirt_oversize',
            category: 'clothing',
            type: 'tshirt_oversize',
            name: 'Pack T-Shirt Heavyweight Oversize',
            description: 'T-Shirt Heavyweight 230g/m² - Coupe Streetwear Boxy',
            pricePublic: 35,
            priceSub: 35,
            getImages: (view: 'front' | 'back', mode: 'studio' | 'bat') => getDynamicImage('tshirt_oversize', view, mode, view === 'front' ? '/merch/visionroom/oversize-front.png' : '/merch/visionroom/oversize-back.png'),
            icon: <Sun className="text-amber-500" size={20} />,
            quantities: ['S', 'M', 'L', 'XL', 'XXL']
        }] : []),
        {
            id: 'business_card',
            category: 'communication',
            type: 'business_card',
            name: 'Carte de Visite Gloss',
            description: 'Pelliculage Brillant Premium - 350g Couché Mat',
            pricePublic: 0, // Dynamic
            priceSub: 0,
            getImages: (view: 'front' | 'back', mode: 'studio' | 'bat') => getDynamicImage('business_card', view, mode, '/assets/card-base.svg'),
            icon: <Package className="text-orange-500" size={20} />,
            quantities: ['250', '500', '1000', '2500']
        }
    ] : [
        {
            id: 'tshirt',
            category: 'clothing',
            type: selectedTshirtVariant === 'leger' ? 'tshirt_basic' : 'tshirt',
            name: selectedTshirtVariant === 'leger' ? 'T-Shirt Léger (150g/m² Standard)' : 'T-Shirt Noir (190g/m² Premium)',
            description: selectedTshirtVariant === 'leger' ? 'T-shirt JHK 150 - Coupe Confort' : 'T-shirt JHK 170 Premium - Noir, Maille Épaisse',
            pricePublic: selectedTshirtVariant === 'leger' ? 25 : 30,
            priceSub: selectedTshirtVariant === 'leger' ? 25 : 30,
            getImages: (view: 'front' | 'back', mode: 'studio' | 'bat') => getDynamicImage(selectedTshirtVariant === 'leger' ? 'tshirt_basic' : 'tshirt', view, mode, view === 'front' ? (selectedTshirtVariant === 'leger' ? '/assets/tshirt-grey-JHK170.png' : '/assets/tshirt-black-JHK170.png') : (selectedTshirtVariant === 'leger' ? '/assets/tshirt-grey-JHK170-dos.png' : '/assets/tshirt-black-JHK170-dos.png')),
            icon: <Sun className="text-zinc-500" size={20} />,
            quantities: ['S', 'M', 'L', 'XL', 'XXL']
        },
        {
            id: 'polo',
            category: 'clothing',
            type: 'polo',
            name: 'Pack Polo Premium',
            description: 'Polo JHK 510 Premium - Coupe Ajustée Professionnelle',
            pricePublic: 35,
            priceSub: 35,
            getImages: (view: 'front' | 'back', mode: 'studio' | 'bat') => getDynamicImage('polo', view, mode, view === 'front' ? '/assets/polo-black-JHK510.png' : '/assets/polo-black-JHK510-dos.png'),
            icon: <Shirt className="text-emerald-500" size={20} />,
            quantities: ['S', 'M', 'L', 'XL', 'XXL']
        },
        {
            id: 'hoodie',
            category: 'clothing',
            type: 'sweat',
            name: 'Pack Hoodie Protection (Renforcé Thermique)',
            description: 'Hoodie Premium Renforcé - Doublure Thermique Active',
            pricePublic: 45,
            priceSub: 45,
            getImages: (view: 'front' | 'back', mode: 'studio' | 'bat') => getDynamicImage('sweat', view, mode, view === 'front' ? '/assets/hoodie-black-JHK421.png' : '/assets/hoodie-black-JHK421-dos.png'),
            icon: <Wind className="text-blue-400" size={20} />,
            quantities: ['S', 'M', 'L', 'XL', 'XXL']
        },
        ...(dynamicMockups.some(m => m.garment === 'tank_top' || m.id?.toLowerCase().includes('tank')) ? [{
            id: 'tank_top',
            category: 'clothing',
            type: 'tank_top',
            name: 'Pack Débardeur Pro',
            description: 'Débardeur Coupe Athlétique - Maille Respirante',
            pricePublic: 28,
            priceSub: 28,
            getImages: (view: 'front' | 'back', mode: 'studio' | 'bat') => getDynamicImage('tank_top', view, mode, view === 'front' ? '/merch/visionroom/tank-front.png' : '/merch/visionroom/tank-back.png'),
            icon: <Shirt className="text-orange-500" size={20} />,
            quantities: ['S', 'M', 'L', 'XL', 'XXL']
        }] : []),
        ...(dynamicMockups.some(m => m.garment === 'tshirt_oversize' || m.id?.toLowerCase().includes('heavy')) ? [{
            id: 'tshirt_oversize',
            category: 'clothing',
            type: 'tshirt_oversize',
            name: 'Pack T-Shirt Heavyweight Oversize',
            description: 'T-Shirt Heavyweight 230g/m² - Coupe Streetwear Boxy',
            pricePublic: 35,
            priceSub: 35,
            getImages: (view: 'front' | 'back', mode: 'studio' | 'bat') => getDynamicImage('tshirt_oversize', view, mode, view === 'front' ? '/merch/visionroom/oversize-front.png' : '/merch/visionroom/oversize-back.png'),
            icon: <Sun className="text-amber-500" size={20} />,
            quantities: ['S', 'M', 'L', 'XL', 'XXL']
        }] : [])
    ];

    const activePacks = isShop ? allPacks.filter(p => p.category === activeCategoryTab) : allPacks;

    const calculateSubTotalHT = () => {
        let totalHT = 0;
        
        // Garments (nominative)
        allPacks.forEach(pack => {
            if (pack.type !== 'business_card') {
                const count = orderItems.filter(item => item.packId === pack.id).length;
                totalHT += count * pack.pricePublic;
            }
        });

        // Bulk (business_card)
        allPacks.forEach(pack => {
            if (pack.type === 'business_card') {
                const packQty = orderQuantities[pack.id] || {};
                Object.keys(packQty).forEach(size => {
                    const q = packQty[size] || 0;
                    if (q > 0) {
                        totalHT += getPriceForPack(pack, size);
                    }
                });
            }
        });
        return totalHT;
    };

    const calculateDiscount = () => {
        // Disabled volume discount as requested (prices are net)
        return 0;
    };

    const calculateTotalPrice = () => {
        return calculateSubTotalHT() - calculateDiscount();
    };

    const addNominativeItem = (packId: string) => {
        const name = newItemName[packId]?.trim();
        const size = newItemSize[packId];
        if (!name || !size) return;
        
        const newItem: OrderItem = {
            id: Math.random().toString(36).substring(7),
            packId,
            name,
            size
        };
        
        setOrderItems([...orderItems, newItem]);
        setNewItemName({ ...newItemName, [packId]: '' });
        // Keep the size selected for convenience if they add multiple people with same size, or reset:
        // setNewItemSize({ ...newItemSize, [packId]: '' }); 
    };

    const removeNominativeItem = (itemId: string) => {
        setOrderItems(orderItems.filter(item => item.id !== itemId));
    };

    const addGenericItem = (packId: string, size: string) => {
        const newItem: OrderItem = {
            id: `item-${Math.random().toString(36).substring(2, 9)}`,
            packId,
            name: 'Sans Nom',
            size
        };
        setOrderItems(prev => [...prev, newItem]);
    };

    const removeOneItemOfSize = (packId: string, size: string) => {
        setOrderItems(prev => {
            const index = [...prev].reverse().findIndex(x => x.packId === packId && x.size === size);
            if (index === -1) return prev;
            const actualIndex = prev.length - 1 - index;
            return prev.filter((_, idx) => idx !== actualIndex);
        });
    };

    const updateItemName = (itemId: string, name: string) => {
        setOrderItems(prev => prev.map(x => x.id === itemId ? { ...x, name: name || 'Sans Nom' } : x));
    };

    const handleValidateDotation = async () => {
        if (!sessionId) return;
        
        // INTERCEPT FOR GUEST USERS
        if (!auth.currentUser && !isAdmin) {
            const params = new URLSearchParams(window.location.search);
            const urlUid = params.get('uid');
            window.location.href = `/vitrine-admin?claim=${urlUid}&action=order`;
            return;
        }

        // Ensure modal is shown first for confirmation
        if (!showCheckoutModal) {
            setShowCheckoutModal(true);
            return;
        }

        setIsSubmitting(true);
        try {
            const totalItems = calculateTotalItems();
            const totalHT = calculateTotalPrice();
            const totalTTC = totalHT * 1.0;

            if (totalItems === 0) {
                alert("Veuillez saisir au moins une quantité.");
                setIsSubmitting(false);
                return;
            }

            // 1. Prepare items for the backend
            const itemsToOrder: any[] = [];
            
            // A. Garments (nominative)
            allPacks.forEach(pack => {
                if (pack.type !== 'business_card') {
                    const packItems = orderItems.filter(item => item.packId === pack.id);
                    if (packItems.length > 0) {
                        // Group by size to list them, or list individually
                        // Actually, it might be better to list them as 1 item with quantity = packItems.length
                        // But include the names in the description?
                        // For simplicity in billing, we can group by pack
                        itemsToOrder.push({
                            name: `${pack.name} (Tailles Nominatives)`,
                            quantity: packItems.length,
                            price: pack.pricePublic
                        });
                    }
                }
            });

            // B. Bulk (business_card)
            allPacks.forEach(pack => {
                if (pack.type === 'business_card') {
                    const packQty = orderQuantities[pack.id] || {};
                    Object.keys(packQty).forEach(size => {
                        const q = packQty[size] || 0;
                        if (q > 0) {
                            const unitPrice = getPriceForPack(pack, size);
                            itemsToOrder.push({
                                name: `${pack.name} - ${size}`,
                                quantity: q,
                                price: unitPrice
                            });
                        }
                    });
                }
            });

            // C. Apply Discount as a negative item
            const discountAmount = calculateDiscount();
            if (discountAmount > 0) {
                const discountPercent = calculateTotalGarments() >= 20 ? 20 : 10;
                itemsToOrder.push({
                    name: `Remise Volume Textiles (-${discountPercent}%)`,
                    quantity: 1,
                    price: -discountAmount
                });
            }

            // 2. Save order in Firestore first
            const dotationData = {
                projectId: sessionId,
                companyName: contactInfo.name || sessionData?.userData?.companyName || 'Inconnu',
                clientEmail: contactInfo.email || sessionData?.userData?.email || 'Inconnu',
                clientPhone: contactInfo.phone,
                clientAddress: contactInfo.address,
                items: itemsToOrder,
                nominativeItems: orderItems, // Save the nominative details for production
                rawQuantities: orderQuantities,
                totalItems: totalItems,
                totalTTC: totalTTC,
                status: 'PENDING_PAYMENT',
                timestamp: serverTimestamp(),
                type: isShop ? 'SHOP_ORDER' : 'BTP_DOTATION'
            };

            const docRef = await addDoc(collection(db, 'btp_dotations'), sanitizeForFirestore(dotationData));

            // 2b. Send confirmation emails (client + admin)
            sendOrderConfirmationEmail(
                contactInfo.name || sessionData?.userData?.companyName || 'Client',
                contactInfo.email || sessionData?.userData?.email || '',
                totalItems,
                totalTTC
            ).catch(err => console.warn('Email envoi non-bloquant:', err));

            // 3. Call Mollie (Firebase Function)
            const response = await fetch('https://us-central1-signaid-prod.cloudfunctions.net/createMolliePayment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items: itemsToOrder,
                    totalAmount: totalTTC.toFixed(2),
                    description: `Commande ${sessionData?.userData?.companyName || 'Signaid'} - ID: ${docRef.id}`,
                    metadata: { orderId: docRef.id, sessionId: sessionId }
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Erreur serveur: ${errorText}`);
            }

            const { checkoutUrl } = await response.json();
            if (checkoutUrl) {
                window.location.href = checkoutUrl;
            } else {
                throw new Error('Lien de paiement non reçu');
            }

        } catch (e: any) {
            console.error("Payment Error Full:", e);
            alert("Erreur lors de la préparation du paiement : " + e.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return <ProductPortalSkeleton isLightMode={isLightMode} />;
    }
    const isGarmentQuotaMet = true; // Retrait du quota minimum de 10 pièces

    const totalClothingSelected = orderItems.filter(item => item.packId !== 'business_card').length;
    const totalCommunicationSelected = Object.values(orderQuantities['business_card'] || {}).reduce((a, b) => a + b, 0);

    // Le bouton principal est désactivé si on est en train de soumettre, si le total est 0, ou si le quota textile n'est pas atteint.
    const isGlobalOrderDisabled = isSubmitting || calculateTotalItems() === 0 || !isGarmentQuotaMet;

    return (
        <div className={`min-h-screen ${isLightMode ? 'bg-gray-50 text-gray-900' : 'bg-zinc-950 text-zinc-100'} font-sans pb-20 selection:bg-orange-600 selection:text-black transition-opacity duration-300 ease-out opacity-100`}>
            <style>{dynamicStyleSheet}</style>
            {/* HEADER */}
            <header className={`${isLightMode ? 'bg-white border-gray-200 text-gray-900' : 'bg-zinc-900 border-orange-600 text-white'} border-b-4 shadow-xl sticky top-0 z-50 transition-colors duration-500`}>
                <div className="max-w-[1600px] w-full mx-auto px-4 md:px-8 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div
                        onClick={() => {
                            const targetSlug = slug || previewId || sessionId || (sessionData?.slug) || (sessionData?.userData?.companyName || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '');
                            if (isAdmin) {
                                navigate(`/vitrine-admin?uid=${targetSlug || ''}`);
                            } else {
                                navigate(targetSlug ? `/${targetSlug}` : '/');
                            }
                        }}
                        className={`flex items-center gap-4 cursor-pointer group hover:opacity-80 transition-all`}
                        title={isAdmin ? "Retourner sur le Hub Admin" : "Retourner à la Vitrine Officielle"}
                    >
                        {userLogo ? (
                            <div className="relative w-14 h-14 bg-zinc-900/50 hover:bg-zinc-800/60 backdrop-blur-md rounded-xl p-2 border border-zinc-800 hover:border-orange-500 flex items-center justify-center overflow-hidden shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_8px_20px_rgba(0,0,0,0.4)] transition-all group duration-300">
                                <img src={userLogo} className="max-w-full max-h-full object-contain filter drop-shadow-[0_2px_8px_rgba(234,88,12,0.15)] transition-all duration-300 group-hover:scale-105" alt="Logo" />
                            </div>
                        ) : (
                            <div className="bg-orange-600 p-2 rounded block group-hover:bg-zinc-700 transition-colors">
                                <ShieldCheck size={32} className="text-white" strokeWidth={3} />
                            </div>
                        )}
                        <div>
                            <h1 className="text-2xl font-black tracking-tighter leading-none group-hover:text-orange-500 transition-colors">{sessionData?.userData?.companyName || BRANDING.companyName}</h1>
                            <p className="text-[10px] font-bold text-orange-500 tracking-widest uppercase">{isShop ? "Portail Produit Premium" : "Portail de Dotation Sécurisé"}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">

                        <button 
                            onClick={() => setIsLightMode(!isLightMode)} 
                            className={`p-2 rounded-full border ${isLightMode ? 'bg-gray-100 border-gray-300 text-gray-600 hover:bg-gray-200' : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700'} transition-all`}
                            title="Basculer le thème"
                        >
                            {isLightMode ? <Moon size={18} /> : <Sun size={18} />}
                        </button>

                        <div 
                            onClick={() => {
                                const targetSlug = slug || previewId || sessionId || (sessionData?.slug) || (sessionData?.userData?.companyName || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '');
                                if (isAdmin) {
                                    handleOpenEditSession();
                                } else {
                                    navigate(targetSlug ? `/${targetSlug}` : '/');
                                }
                            }}
                            className={`flex items-center gap-3 ${isLightMode ? 'bg-gray-100 border-gray-200 hover:bg-gray-200' : 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700'} px-4 py-2 rounded-lg border cursor-pointer group transition-all`}
                            title={isAdmin ? "Modifier les informations de la session" : "Accéder à ma Vitrine Officielle"}
                        >
                            <div className={`w-8 h-8 ${isLightMode ? 'bg-gray-200' : 'bg-zinc-700'} rounded-full flex items-center justify-center`}>
                                <User size={18} className={isLightMode ? 'text-gray-500' : 'text-zinc-400'} />
                            </div>
                            <div className="text-left">
                                <p className="text-[10px] text-zinc-500 font-bold uppercase leading-none">Connecté :</p>
                                <p className="text-xs font-black italic flex items-center gap-1 select-none">
                                    {sessionData?.userData?.companyName || sessionData?.userData?.email?.split('@')?.[0] || 'Utilisateur'}
                                    {isAdmin && (
                                        <span className="text-[8px] text-orange-500 opacity-0 group-hover:opacity-100 transition-opacity uppercase font-bold tracking-tighter ml-1">(Modifier)</span>
                                    )}
                                </p>
                            </div>
                        </div>

                        {isAdmin && (
                            <div className="hidden lg:flex items-center gap-2 bg-yellow-400/10 border border-yellow-400/30 px-4 py-2 rounded-lg animate-pulse">
                                <Star size={16} className="text-yellow-500 fill-yellow-500" />
                                <span className="text-[10px] font-black text-yellow-500 uppercase tracking-tight">Compte Professionnel Actif</span>
                            </div>
                        )}

                        {/* Hamburger Hub Menu Dropdown (Admin Only) */}
                        {isAdmin && (
                            <div className="relative">
                                <button
                                    onClick={() => setMenuOpen(!menuOpen)}
                                    className="flex items-center justify-center p-2 rounded-lg bg-zinc-800 hover:bg-orange-600 border border-zinc-700 hover:border-orange-500 transition-all text-white"
                                    title="Menu de navigation"
                                >
                                    <Menu size={20} className={menuOpen ? "rotate-90 transition-transform duration-305" : "transition-transform duration-305"} />
                                </button>

                            {menuOpen && (
                                <>
                                    {/* Transparent click shield to close the menu */}
                                    <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />

                                    {/* Dropdown Card */}
                                    <div className="absolute right-0 mt-3 w-56 rounded-xl border border-zinc-800 bg-zinc-950/95 backdrop-blur-md p-2 shadow-[0_20px_50px_rgba(0,0,0,0.9)] z-50 animate-reveal text-left">
                                        <div className="px-3 py-1.5 border-b border-white/5 text-[9px] font-black text-zinc-500 tracking-widest uppercase">
                                            Navigation Hub
                                        </div>
                                        <div className="space-y-1 mt-1">
                                            <button
                                                onClick={() => {
                                                    setMenuOpen(false);
                                                    const params = new URLSearchParams(window.location.search);
                                                    const sid = params.get('slug') || params.get('audit') || params.get('prospect') || params.get('brand') || params.get('uid') || sessionId;
                                                    window.location.href = `/vitrine-admin?uid=${sid || ''}`;
                                                }}
                                                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-black text-orange-400 hover:text-orange-300 hover:bg-orange-500/10 rounded-lg transition-all text-left"
                                            >
                                                <Shield size={14} />
                                                <span>Console Admin Profil</span>
                                            </button>

                                            <button
                                                onClick={() => {
                                                    setMenuOpen(false);
                                                    if (!auth.currentUser && !isAdmin) {
                                                        const params = new URLSearchParams(window.location.search);
                                                        const urlUid = params.get('uid');
                                                        window.location.href = `/vitrine-admin?claim=${urlUid}`;
                                                        return;
                                                    }
                                                    const params = new URLSearchParams(window.location.search);
                                                    const queryStr = params.toString() ? `?${params.toString()}` : '';
                                                    const cleanSlug = (sessionData?.userData?.companyName || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '') || (sessionId || '').replace(/^audit-/, '');
                                                    const targetPage = '/portail-audit';
                                                    if (cleanSlug) {
                                                        navigate(`${targetPage}/${cleanSlug}${queryStr}`);
                                                    } else {
                                                        navigate(`${targetPage}${queryStr}`);
                                                    }
                                                }}
                                                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-black text-zinc-400 hover:text-orange-500 hover:bg-orange-500/10 rounded-lg transition-all text-left"
                                            >
                                                <Wand2 size={14} />
                                                <span>Modifier les gabarits</span>
                                            </button>

                                            <button
                                                onClick={() => {
                                                    setMenuOpen(false);
                                                    const cleanSlug = (sessionData?.userData?.companyName || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '') || (sessionId || '').replace(/^audit-/, '');
                                                    if (cleanSlug) {
                                                        navigate(`/${cleanSlug}`);
                                                    } else {
                                                        navigate('/');
                                                    }
                                                }}
                                                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-black text-zinc-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all border-t border-white/5 mt-1 text-left"
                                            >
                                                <ArrowLeft size={14} />
                                                <span>Retour Vitrine</span>
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                        )}
                    </div>
                </div>
            </header>

            <main className="max-w-[1600px] w-full mx-auto px-4 md:px-8 pt-12 space-y-12">
                {/* INTRO */}
                <div className="space-y-2">
                    <h2 className="text-5xl font-black italic tracking-tighter uppercase text-white leading-none">
                        {isShop ? "Sélectionner" : "Commande Rapide"} <span className="text-orange-600">{isShop ? "Vos Produits" : "Par Packs"}</span>
                    </h2>
                    <p className="text-sm font-bold text-zinc-500 uppercase flex items-center gap-2 tracking-wide">
                        <Info size={16} /> {isShop ? "Sélectionnez vos articles personnalisés et finalisez votre commande." : "Sélectionnez vos dotations et validez en un clic."}
                    </p>
                </div>

                {/* CATEGORY TABS (AGNOSTIC: VÊTEMENTS / COMMUNICATION) */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <button
                        type="button"
                        onClick={() => setActiveCategoryTab('clothing')}
                        className={`flex items-center justify-center gap-3 px-6 py-3.5 rounded-2xl font-black text-sm uppercase tracking-wider transition-all border-2 ${
                            activeCategoryTab === 'clothing'
                                ? 'bg-orange-600 border-orange-500 text-black shadow-[0_0_20px_rgba(234,88,12,0.35)] scale-[1.01]'
                                : isLightMode
                                    ? 'bg-white border-gray-200 text-gray-700 hover:border-orange-500/50 hover:bg-gray-50'
                                    : 'bg-zinc-900/80 border-zinc-800 text-zinc-300 hover:border-zinc-700 hover:text-white'
                        }`}
                    >
                        <Shirt size={18} />
                        <span>Vêtements</span>
                        {totalClothingSelected > 0 && (
                            <span className={`px-2 py-0.5 text-[10px] font-black rounded-full ${
                                activeCategoryTab === 'clothing' ? 'bg-black text-white' : 'bg-orange-600 text-black'
                            }`}>
                                {totalClothingSelected}
                            </span>
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveCategoryTab('communication')}
                        className={`flex items-center justify-center gap-3 px-6 py-3.5 rounded-2xl font-black text-sm uppercase tracking-wider transition-all border-2 ${
                            activeCategoryTab === 'communication'
                                ? 'bg-orange-600 border-orange-500 text-black shadow-[0_0_20px_rgba(234,88,12,0.35)] scale-[1.01]'
                                : isLightMode
                                    ? 'bg-white border-gray-200 text-gray-700 hover:border-orange-500/50 hover:bg-gray-50'
                                    : 'bg-zinc-900/80 border-zinc-800 text-zinc-300 hover:border-zinc-700 hover:text-white'
                        }`}
                    >
                        <Package size={18} />
                        <span>Communication</span>
                        {totalCommunicationSelected > 0 && (
                            <span className={`px-2 py-0.5 text-[10px] font-black rounded-full ${
                                activeCategoryTab === 'communication' ? 'bg-black text-white' : 'bg-orange-600 text-black'
                            }`}>
                                {totalCommunicationSelected}
                            </span>
                        )}
                    </button>
                </div>

                {/* TAB CONTEXT BANNER */}
                {activeCategoryTab === 'communication' ? (
                    <div className={`p-4 md:p-5 rounded-2xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-left transition-all ${
                        isLightMode ? 'bg-white border-gray-200 shadow-sm text-gray-900' : 'bg-zinc-900/60 border-zinc-800 text-zinc-100'
                    }`}>
                        <div className="flex items-start gap-3.5">
                            <div className="p-2.5 rounded-xl bg-orange-600/10 border border-orange-600/30 text-orange-500 mt-0.5 md:mt-0 shrink-0">
                                <Sparkles size={20} />
                            </div>
                            <div className="space-y-1">
                                <h4 className={`font-black text-sm uppercase tracking-tight ${isLightMode ? 'text-gray-900' : 'text-white'}`}>Supports de Communication & Print</h4>
                                <p className="text-xs text-zinc-400 font-medium">Impression professionnelle haute définition avec liaison dynamique par QR code pour vos supports physiques.</p>
                            </div>
                        </div>
                        <span className="px-3.5 py-1.5 rounded-full bg-orange-600/10 text-orange-400 border border-orange-600/30 text-[10px] font-black uppercase tracking-widest whitespace-nowrap shrink-0">
                            Haute Définition • QR Code Dynamique
                        </span>
                    </div>
                ) : (
                    <div className={`p-4 md:p-5 rounded-2xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-left transition-all ${
                        isLightMode ? 'bg-white border-gray-200 shadow-sm text-gray-900' : 'bg-zinc-900/60 border-zinc-800 text-zinc-100'
                    }`}>
                        <div className="flex items-start gap-3.5">
                            <div className="p-2.5 rounded-xl bg-orange-600/10 border border-orange-600/30 text-orange-500 mt-0.5 md:mt-0 shrink-0">
                                <Shirt size={20} />
                            </div>
                            <div className="space-y-1">
                                <h4 className={`font-black text-sm uppercase tracking-tight ${isLightMode ? 'text-gray-900' : 'text-white'}`}>Collection Textile & Vêtements</h4>
                                <p className="text-xs text-zinc-400 font-medium">Textiles personnalisés de haute qualité avec marquage professionnel. Choix des modèles et des tailles.</p>
                            </div>
                        </div>
                        <span className="px-3.5 py-1.5 rounded-full bg-orange-600/10 text-orange-400 border border-orange-600/30 text-[10px] font-black uppercase tracking-widest whitespace-nowrap shrink-0">
                            Marquage Professionnel
                        </span>
                    </div>
                )}

                {/* PACKS GRID */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {activePacks.map((pack) => (
                        <div key={pack.id} className={`${isLightMode ? 'bg-white border-gray-200 shadow-xl hover:shadow-[0_0_20px_rgba(234,88,12,0.15)] text-gray-900' : 'bg-zinc-900/40 backdrop-blur-md border-zinc-800/80 shadow-2xl hover:shadow-[0_0_30px_rgba(234,88,12,0.15)] text-zinc-100'} border-2 rounded-2xl overflow-hidden hover:border-orange-600/80 transition-all flex flex-col group text-left duration-300`}>
                            {/* Top Image */}
                            <div className={`relative aspect-square overflow-hidden ${isLightMode ? 'bg-gray-50 border-gray-200' : 'bg-zinc-950 border-zinc-800/60'} border-b flex items-center justify-center`}>
                                {(() => {
                                    const view = (cardViews[pack.id] || 'front') as 'front' | 'back';
                                    const mode = displayModes[pack.id] as 'studio' | 'bat';
                                    const mockupId = pack.id === 'tshirt' ? (view === 'front' ? 'tFront' : 'tBack') 
                                                   : pack.id === 'polo' ? (view === 'front' ? 'pFront' : 'pBack') 
                                                   : pack.id === 'hoodie' ? (view === 'front' ? 'hFront' : 'hBack') 
                                                   : pack.id === 'tank_top' ? (view === 'front' ? 'tankFront' : 'tankBack')
                                                   : pack.id === 'tshirt_oversize' ? (view === 'front' ? 'heavyFront' : 'heavyBack')
                                                   : pack.id === 'business_card' ? (view === 'front' ? 'cardFront' : 'cardBack') : '';
                                    const mockup = dynamicMockups.find(m => (m.garment === pack.type || (pack.type === 'tshirt_basic' && m.garment === 'tshirt')) && m.view === view)
                                        || dynamicMockups.find(m => m.id === mockupId);
                                    const isGenerating = mockup ? mockup.isGenerating : false;
                                    const imgUrl = pack.getImages(view, mode);
                                    
                                    const isTemplateAsset = isBlankTemplate(imgUrl);
                                    const placementType = pack.type as keyof typeof LOCAL_PLACEMENTS;
                                    const posGroup = mode === 'studio' 
                                        ? (STUDIO_PLACEMENTS[placementType as keyof typeof STUDIO_PLACEMENTS] || STUDIO_PLACEMENTS.tshirt)
                                        : (LOCAL_PLACEMENTS[placementType] || LOCAL_PLACEMENTS.tshirt);
                                    const pos = posGroup ? (posGroup[view] || posGroup.front) : null;

                                    const slot = (logoPlacements && logoPlacements[mockupId]) || (view === 'front' ? 'B' : 'A');
                                    const activeOverlayLogo = (slot === 'B' && logoB) ? logoB : (slot === 'A' && logoA ? logoA : (logoA || logoB || userLogo));
                                    const showOverlay = isTemplateAsset && !!pos && !!activeOverlayLogo;
                                    
                                    if (showOverlay && pos && activeOverlayLogo) {
                                        return (
                                            <div className="relative w-full h-full flex items-center justify-center overflow-hidden p-4 md:p-6">
                                                <img
                                                    src={imgUrl}
                                                    alt={pack.name}
                                                    className={`max-w-full max-h-full object-contain ${mode === 'bat' ? 'animate-reveal' : ''}`}
                                                    style={pack.type === 'tshirt_basic' && mode === 'bat' && isTemplateAsset ? { filter: 'brightness(0.35) contrast(1.2)' } : undefined}
                                                />
                                                <img
                                                    src={activeOverlayLogo}
                                                    style={{
                                                        position: 'absolute',
                                                        left: `${pos.x * 100}%`,
                                                        top: `${pos.y * 100}%`,
                                                        width: `${pos.scale * 100}%`,
                                                        transform: 'translate(-50%, -50%)',
                                                        pointerEvents: 'none',
                                                        objectFit: 'contain',
                                                        filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.5))'
                                                    }}
                                                    alt="Logo overlay"
                                                />
                                                {isGenerating && (
                                                    <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex flex-col items-center justify-center gap-2 z-10">
                                                        <Loader2 className="animate-spin text-orange-500" size={24} />
                                                        <span className="text-[10px] font-black tracking-widest text-orange-500 uppercase animate-pulse text-center">Rendu IA en cours...</span>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    }
                                    
                                    return (
                                        <div className="relative w-full h-full flex items-center justify-center overflow-hidden p-4 md:p-6">
                                            <img
                                                src={imgUrl}
                                                alt={pack.name}
                                                className={`max-w-full max-h-full object-contain transition-all duration-500 ${mode === 'bat' ? 'animate-reveal' : ''} ${isGenerating ? 'blur-[3px] opacity-60' : ''}`}
                                            />
                                            {isGenerating && (
                                                <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex flex-col items-center justify-center gap-2 z-10">
                                                    <Loader2 className="animate-spin text-orange-500" size={24} />
                                                    <span className="text-[10px] font-black tracking-widest text-orange-500 uppercase animate-pulse text-center">Rendu IA en cours...</span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}
                                <div className={`absolute top-4 left-4 ${isLightMode ? 'bg-white/90 border-gray-200 text-gray-900' : 'bg-zinc-900/90 border-zinc-800 text-zinc-100'} backdrop-blur-md px-3 py-1.5 rounded-lg shadow-lg flex items-center gap-2 border z-10`}>
                                    {pack.icon}
                                    <span className="text-[10px] font-black uppercase italic">{pack.name}</span>
                                </div>

                                <div className="absolute top-4 right-4 bg-orange-600 text-black px-2.5 py-1 rounded-md font-black text-[9px] uppercase tracking-widest shadow-md z-10">
                                    {cardViews[pack.id] === 'back' ? 'VUE DOS' : 'VUE FACE'}
                                </div>

                                <div className="absolute bottom-4 left-4 right-4 flex justify-between gap-2 z-10">
                                    {/* VIEW TOGGLE */}
                                    <button
                                        onClick={() => toggleView(pack.id)}
                                        className={`${isLightMode ? 'bg-white/95 text-gray-900 border-gray-300' : 'bg-zinc-950/95 text-white border-zinc-800'} px-4 py-2 rounded-full font-black text-[9px] uppercase italic tracking-widest flex items-center gap-2 hover:bg-orange-600 hover:text-black transition-all backdrop-blur-sm border hover:border-orange-500`}
                                    >
                                        <RefreshCw size={12} className={cardViews[pack.id] === 'back' ? 'rotate-180 transition-transform animate-reveal' : 'transition-transform'} />
                                        {cardViews[pack.id] === 'front' ? 'Voir Dos' : 'Voir Face'}
                                    </button>

                                    {/* MODE TOGGLE (BAT) */}
                                    <button
                                        onClick={() => toggleMode(pack.id)}
                                        className={`px-4 py-2 rounded-full font-black text-[9px] uppercase italic tracking-widest flex items-center gap-2 transition-all backdrop-blur-sm border ${displayModes[pack.id] === 'bat' ? 'bg-orange-600 text-black border-orange-500 shadow-[0_0_15px_rgba(234,88,12,0.45)]' : (isLightMode ? 'bg-white/95 text-gray-700 hover:bg-gray-100 border-gray-300 hover:border-orange-500' : 'bg-zinc-950/95 text-zinc-300 hover:bg-zinc-900 hover:text-white border-zinc-800 hover:border-orange-500')}`}
                                    >
                                        <Shield size={12} />
                                        {displayModes[pack.id] === 'studio' ? 'Voir BAT' : 'Mode Studio'}
                                    </button>
                                </div>
                            </div>

                            {/* Content */}
                            <div className={`p-6 flex-1 flex flex-col justify-between space-y-6 ${isLightMode ? 'bg-white' : ''}`}>
                                <div className="space-y-4 text-left">
                                    <h3 className={`text-2xl font-black italic tracking-tight uppercase leading-none group-hover:text-orange-500 transition-colors duration-300 ${isLightMode ? 'text-gray-900' : 'text-white'}`}>{pack.name}</h3>
                                    <p className="text-xs font-bold text-zinc-400 uppercase italic tracking-tight">{pack.description}</p>
                                    
                                    {pack.id === 'tshirt' && (
                                        <div className="space-y-2 pt-1">
                                            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest text-left block">Grammage & Modèle T-shirt</span>
                                            <div className={`grid grid-cols-2 p-1 rounded-xl border ${isLightMode ? 'bg-gray-100 border-gray-200' : 'bg-zinc-950 border-zinc-800'}`}>
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedTshirtVariant('leger')}
                                                    className={`py-2 px-3 rounded-lg font-black text-xs uppercase italic transition-all flex flex-col items-center gap-0.5 ${selectedTshirtVariant === 'leger' ? 'bg-orange-600 text-black shadow-md scale-[1.02]' : 'text-zinc-400 hover:text-white'}`}
                                                >
                                                    <span>T-Shirt Léger</span>
                                                    <span className="text-[9px] font-bold opacity-80">150g • 25€ HT</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedTshirtVariant('lourd')}
                                                    className={`py-2 px-3 rounded-lg font-black text-xs uppercase italic transition-all flex flex-col items-center gap-0.5 ${selectedTshirtVariant === 'lourd' ? 'bg-orange-600 text-black shadow-md scale-[1.02]' : 'text-zinc-400 hover:text-white'}`}
                                                >
                                                    <span>T-Shirt Lourd</span>
                                                    <span className="text-[9px] font-bold opacity-80">190g Premium • 30€ HT</span>
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* SIZE INPUTS */}
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center text-[10px] font-black text-zinc-500 uppercase tracking-widest border-b border-zinc-800/80 pb-2">
                                        <span>{pack.type === 'business_card' ? 'Volume Impression' : 'Grille des tailles'}</span>
                                        <span className="text-orange-500 flex items-center gap-1.5">
                                            Saisie Quantité
                                        </span>
                                    </div>
                                        {pack.type === 'business_card' ? (
                                            <div className={`grid ${pack.quantities.length === 3 ? 'grid-cols-3' : 'grid-cols-3 md:grid-cols-5'} gap-2`}>
                                                {pack.quantities.map((size: string) => {
                                                    const qty = orderQuantities[pack.id]?.[size] || 0;
                                                    const isSelected = qty > 0;
                                                    return (
                                                        <div key={`${pack.id}-${size}`} className="flex flex-col gap-1.5">
                                                            <button
                                                                onClick={() => {
                                                                    const newPackQty: any = {};
                                                                    pack.quantities.forEach((s: string) => newPackQty[s] = 0);
                                                                    newPackQty[size] = isSelected ? 0 : 1;

                                                                    setOrderQuantities(prev => ({
                                                                        ...prev,
                                                                        [pack.id]: newPackQty
                                                                    }));
                                                                }}
                                                                className={`w-full py-4 font-black text-sm rounded-xl transition-all border-2 ${isSelected ? 'bg-orange-600 border-orange-600 text-black shadow-lg scale-[1.02]' : (isLightMode ? 'bg-gray-50 border-gray-200 text-gray-500 hover:border-orange-500 hover:text-orange-500 hover:bg-white' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-orange-500 hover:text-orange-500 hover:bg-zinc-800')}`}
                                                            >
                                                                {size}
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <div className="space-y-6">
                                                {/* Sizing Grid with Counters */}
                                                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                                    {pack.quantities.map((size: string) => {
                                                        const count = orderItems.filter(item => item.packId === pack.id && item.size === size).length;
                                                        return (
                                                            <div key={`${pack.id}-${size}`} className={`flex flex-col items-center justify-between p-3 rounded-xl border ${count > 0 ? 'border-orange-500/80 bg-orange-500/5' : (isLightMode ? 'border-gray-200 bg-gray-50' : 'border-zinc-800 bg-zinc-950')} transition-all`}>
                                                                <span className="font-black text-xs uppercase tracking-wider mb-2">{size}</span>
                                                                <div className="flex items-center gap-2">
                                                                    <button
                                                                        onClick={() => removeOneItemOfSize(pack.id, size)}
                                                                        className={`w-6 h-6 rounded-full flex items-center justify-center border font-black text-sm transition-all ${count > 0 ? 'border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-black' : (isLightMode ? 'border-gray-300 text-gray-400 hover:border-gray-900 hover:text-gray-900' : 'border-zinc-700 text-zinc-500 hover:border-zinc-300 hover:text-white')}`}
                                                                    >
                                                                        <Minus size={12} />
                                                                    </button>
                                                                    <span className="font-black text-sm min-w-[18px] text-center">{count}</span>
                                                                    <button
                                                                        onClick={() => addGenericItem(pack.id, size)}
                                                                        className={`w-6 h-6 rounded-full flex items-center justify-center border font-black text-sm transition-all ${isLightMode ? 'border-gray-300 text-gray-400 hover:border-orange-500 hover:text-orange-500' : 'border-zinc-700 text-zinc-500 hover:border-orange-500 hover:text-orange-500'}`}
                                                                    >
                                                                        <Plus size={12} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>

                                                {/* Optional Nominative List */}
                                                {orderItems.filter(item => item.packId === pack.id).length > 0 && (
                                                    <div className="space-y-2">
                                                        <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500 text-left">
                                                            Noms optionnels pour personnalisation individuelle (ex: prénom sur la poitrine) :
                                                        </p>
                                                        <div className={`${isLightMode ? 'bg-gray-50 border-gray-200' : 'bg-zinc-950/50 border-zinc-800/50'} rounded-lg border p-2 space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar`}>
                                                            {orderItems.filter(item => item.packId === pack.id).map(item => (
                                                                <div key={item.id} className={`flex justify-between items-center ${isLightMode ? 'bg-white text-gray-900 border border-gray-200' : 'bg-zinc-900 text-zinc-100'} rounded px-3 py-2 text-xs`}>
                                                                    <div className="flex items-center gap-3 flex-1 text-left">
                                                                        <span className="font-black text-orange-500 bg-orange-600/10 px-2 py-0.5 rounded">{item.size}</span>
                                                                        <input
                                                                            type="text"
                                                                            placeholder="Ajouter un prénom (optionnel)"
                                                                            value={item.name === 'Sans Nom' ? '' : item.name}
                                                                            onChange={(e) => updateItemName(item.id, e.target.value)}
                                                                            className="bg-transparent border-b border-transparent focus:border-orange-500/50 outline-none flex-1 font-bold text-xs px-1 text-left"
                                                                        />
                                                                    </div>
                                                                    <button 
                                                                        onClick={() => removeNominativeItem(item.id)}
                                                                        className="text-zinc-600 hover:text-red-500 p-1 transition-colors"
                                                                    >
                                                                        <Trash2 size={14} />
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* FINAL ACTION AREA */}
                <div className={`${isLightMode ? 'bg-white shadow-xl' : 'bg-zinc-900 shadow-2xl'} rounded-3xl p-8 border-l-[12px] border-orange-600 relative overflow-hidden group`}>
                    {/* Background Graphic */}
                    <div className="absolute right-[-20px] top-[-20px] opacity-10 group-hover:rotate-12 transition-all duration-700">
                        <Package size={200} className="text-white" />
                    </div>

                    <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
                        <div className="text-left space-y-4 max-w-xl">
                            <div className="flex items-center gap-3 text-orange-500 font-bold text-xs uppercase tracking-[0.3em]">
                                <CheckCircle2 size={18} /> Récapitulatif Prêt
                            </div>
                            <h3 className="text-3xl font-black text-white italic tracking-tighter uppercase leading-tight">
                                Total Commande : <span className="text-orange-500 text-4xl">
                                    {(calculateTotalPrice() * 1.00).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })} Net
                                </span>
                            </h3>
                            <div className="flex flex-col gap-1 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                                <div className="flex gap-4">
                                    <span>Sous-total : {calculateSubTotalHT().toFixed(2)} €</span>
                                    {calculateDiscount() > 0 && (
                                        <span className="text-orange-500">
                                            Remise Volume (-{calculateTotalGarments() >= 20 ? 20 : 10}%) : -{calculateDiscount().toFixed(2)} €
                                        </span>
                                    )}
                                </div>
                                <div className="flex gap-4">
                                    <span>TVA : Non applicable (Régime de franchise)</span>
                                    <span className="text-white">{calculateTotalItems()} articles</span>
                                </div>
                            </div>
                            <p className="text-zinc-400 font-bold uppercase text-[10px] tracking-widest leading-relaxed">
                                Les logos de l'entreprise cliente seront thermoformés automatiquement
                                selon vos réglages par défaut. Délais de livraison : 72h.
                            </p>
                        </div>
                        <div className="flex flex-col gap-3 items-center w-full md:w-auto">

                            <button
                                disabled={isGlobalOrderDisabled}
                                onClick={handleValidateDotation}
                                className="w-full bg-orange-600 hover:bg-white text-black hover:text-zinc-900 px-12 py-8 font-black text-2xl italic tracking-tighter uppercase rounded-2xl shadow-[0_15px_30px_rgba(234,88,12,0.3)] hover:shadow-white/10 transition-all transform active:scale-95 flex items-center justify-center gap-4 group/btn disabled:opacity-30 disabled:cursor-not-allowed disabled:transform-none"
                            >
                                {isSubmitting ? <Loader2 className="animate-spin" /> : <ShoppingCart className="group-hover/btn:translate-x-1 transition-transform" />}
                                {isShop ? "Valider ma commande" : "Valider la dotation (Bâti-Pro Intégré)"}
                            </button>
                        </div>
                    </div>
                </div>

                {/* FOOTER STRIP */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-6 pt-8 border-t border-zinc-900">
                    <div className="flex items-center gap-6 opacity-35">
                        <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Powered by Signaid Studio</div>
                        <div className="flex gap-2">
                            <div className="w-2 h-2 rounded-full bg-zinc-800"></div>
                            <div className="w-2 h-2 rounded-full bg-zinc-800"></div>
                            <div className="w-2 h-2 rounded-full bg-zinc-800"></div>
                        </div>
                    </div>
                    <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest italic">Support Client : {BRANDING.contact.phone} (Appel Gratuit)</p>
                </div>
            </main>

            {showCheckoutModal && (
                <div key="checkout-modal-overlay" className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/95 backdrop-blur-md animate-reveal">
                    <div key="checkout-modal-container" className={`${isLightMode ? 'bg-white' : 'bg-zinc-900'} rounded-3xl w-full max-w-xl max-h-[90vh] overflow-hidden shadow-2xl border-4 border-orange-600 flex flex-col border-opacity-90`}>
                        {/* Scrollable Body */}
                        <div className={`p-6 md:p-8 space-y-6 overflow-y-auto custom-scrollbar ${isLightMode ? 'text-gray-900' : 'text-zinc-100'}`}>
                            <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                    <h3 className="text-2xl md:text-3xl font-black italic uppercase tracking-tighter text-white leading-none">Confirmation</h3>
                                    <p className="text-[10px] md:text-xs font-bold text-orange-500 uppercase tracking-widest">Vérifiez vos coordonnées avant achat</p>
                                </div>
                                <button onClick={() => setShowCheckoutModal(false)} className="text-zinc-500 hover:text-orange-500 transition-colors p-2">
                                    <Trash2 size={24} />
                                </button>
                            </div>

                            <div className="bg-orange-600/10 border-l-4 border-orange-500 p-4 rounded-r-xl flex gap-3 text-orange-400">
                                <Info className="text-orange-500 shrink-0" size={20} />
                                <p className="text-[11px] md:text-xs text-orange-400 font-bold leading-relaxed">
                                    IMPORTANT : Suite à votre achat, vous recevrez un **BAT final (Bon à Tirer)** par email sous 24h.
                                    La production ne sera lancée qu'après votre validation technique par retour d'email.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                <div className="space-y-1.5 text-left">
                                    <label className="text-[10px] font-black uppercase text-zinc-500 ml-1">Nom / Entreprise</label>
                                    <input
                                        type="text"
                                        value={contactInfo.name}
                                        onChange={(e) => setContactInfo({ ...contactInfo, name: e.target.value })}
                                        className={`w-full ${isLightMode ? 'bg-white border-gray-300 text-gray-900' : 'bg-zinc-950 border-zinc-800 text-white'} border-2 rounded-xl px-4 py-3 font-bold focus:border-orange-600 outline-none transition-all text-sm`}
                                        placeholder="Signaid SAS"
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1.5 text-left">
                                        <label className="text-[10px] font-black uppercase text-zinc-500 ml-1">Email de réception BAT</label>
                                        <input
                                            type="email"
                                            value={contactInfo.email}
                                            onChange={(e) => setContactInfo({ ...contactInfo, email: e.target.value })}
                                            className={`w-full ${isLightMode ? 'bg-white border-gray-300 text-gray-900' : 'bg-zinc-950 border-zinc-800 text-white'} border-2 rounded-xl px-4 py-3 font-bold focus:border-orange-600 outline-none transition-all text-sm`}
                                            placeholder="contact@exemple.com"
                                        />
                                    </div>
                                    <div className="space-y-1.5 text-left">
                                        <label className="text-[10px] font-black uppercase text-zinc-500 ml-1">Téléphone</label>
                                        <input
                                            type="tel"
                                            value={contactInfo.phone}
                                            onChange={(e) => setContactInfo({ ...contactInfo, phone: e.target.value })}
                                            className={`w-full ${isLightMode ? 'bg-white border-gray-300 text-gray-900' : 'bg-zinc-950 border-zinc-800 text-white'} border-2 rounded-xl px-4 py-3 font-bold focus:border-orange-600 outline-none transition-all text-sm`}
                                            placeholder="06 00 00 00 00"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5 text-left">
                                    <label className="text-[10px] font-black uppercase text-zinc-500 ml-1">Adresse de Livraison</label>
                                    <textarea
                                        value={contactInfo.address}
                                        onChange={(e) => setContactInfo({ ...contactInfo, address: e.target.value })}
                                        className={`w-full ${isLightMode ? 'bg-white border-gray-300 text-gray-900' : 'bg-zinc-950 border-zinc-800 text-white'} border-2 rounded-xl px-4 py-3 font-bold focus:border-orange-600 outline-none transition-all min-h-[80px] text-sm`}
                                        placeholder="12 rue de la Paix, 75000 Paris"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Sticky Footer */}
                        <div className={`${isLightMode ? 'bg-gray-50 border-gray-200' : 'bg-zinc-900 border-zinc-800'} p-6 md:p-8 flex flex-col sm:flex-row justify-between items-center gap-6 border-t`}>
                            <div className="text-left w-full sm:w-auto">
                                <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Total Net à payer</p>
                                <p className="text-orange-500 text-2xl md:text-3xl font-black italic">{(calculateTotalPrice() * 1.00).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</p>
                            </div>
                            <button
                                onClick={handleValidateDotation}
                                disabled={isSubmitting || !contactInfo.email || !contactInfo.name || !isGarmentQuotaMet} className="w-full sm:w-auto bg-orange-600 hover:bg-white text-black hover:text-zinc-900 px-8 py-4 font-black text-base md:text-lg uppercase italic rounded-xl transition-all flex items-center justify-center gap-3 disabled:opacity-50 shadow-xl min-w-[200px]"
                            >
                                {isSubmitting ? <Loader2 key="submitting-spinner" className="animate-spin" /> : <ShieldCheck key="shield-icon" size={20} />}
                                {isSubmitting ? 'Préparation...' : 'Confirmer et Payer'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showEditSessionModal && (
                <div key="edit-session-modal-overlay" className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/95 backdrop-blur-md animate-reveal">
                    <form onSubmit={handleSaveSessionData} key="edit-session-modal-container" className={`${isLightMode ? 'bg-white text-gray-900' : 'bg-zinc-900 text-zinc-100'} rounded-3xl w-full max-w-md p-6 md:p-8 space-y-6 shadow-2xl border-4 border-orange-600 flex flex-col border-opacity-90`}>
                        <div className="flex justify-between items-start">
                            <div className="space-y-1">
                                <h3 className="text-xl md:text-2xl font-black italic uppercase tracking-tighter leading-none">Modifier la Session</h3>
                                <p className="text-[10px] md:text-xs font-bold text-orange-500 uppercase tracking-widest">Informations du Client / Prospect</p>
                            </div>
                            <button type="button" onClick={() => setShowEditSessionModal(false)} className="text-zinc-500 hover:text-orange-500 transition-colors p-2">
                                <Trash2 size={20} className="rotate-45" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-1.5 text-left">
                                <label className="text-[10px] font-black uppercase text-zinc-500 ml-1">Nom de l'entreprise</label>
                                <input
                                    type="text"
                                    required
                                    value={editCompanyName}
                                    onChange={(e) => setEditCompanyName(e.target.value)}
                                    className={`w-full ${isLightMode ? 'bg-white border-gray-300 text-gray-900' : 'bg-zinc-950 border-zinc-800 text-white'} border-2 rounded-xl px-4 py-3 font-bold focus:border-orange-600 outline-none transition-all text-sm`}
                                    placeholder="LB Peinture"
                                />
                            </div>
                            <div className="space-y-1.5 text-left">
                                <label className="text-[10px] font-black uppercase text-zinc-500 ml-1">Adresse Email</label>
                                <input
                                    type="email"
                                    required
                                    value={editEmail}
                                    onChange={(e) => setEditEmail(e.target.value)}
                                    className={`w-full ${isLightMode ? 'bg-white border-gray-300 text-gray-900' : 'bg-zinc-950 border-zinc-800 text-white'} border-2 rounded-xl px-4 py-3 font-bold focus:border-orange-600 outline-none transition-all text-sm`}
                                    placeholder="client@peinture.fr"
                                />
                            </div>
                        </div>

                        {previewLink && (
                            <div className="p-4 bg-zinc-950/80 border border-zinc-800 rounded-xl space-y-2 text-left">
                                <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest leading-none">Lien de partage prospect (sans compte) :</p>
                                <div className="flex gap-2 items-center">
                                    <input
                                        type="text"
                                        readOnly
                                        value={previewLink}
                                        onClick={(e) => (e.target as HTMLInputElement).select()}
                                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 font-mono text-xs text-zinc-400 select-all outline-none"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            navigator.clipboard.writeText(previewLink);
                                            alert("Lien de partage copié !");
                                        }}
                                        className="px-3 py-2 bg-orange-600 hover:bg-white text-black font-black text-xs uppercase tracking-tight transition-all shrink-0 rounded-lg"
                                    >
                                        Copier
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end gap-3 pt-4 border-t border-zinc-850">
                            <button
                                type="button"
                                onClick={() => setShowEditSessionModal(false)}
                                className={`px-4 py-2 text-xs uppercase font-black ${isLightMode ? 'text-gray-500' : 'text-zinc-450 hover:text-white'}`}
                            >
                                Annuler
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="bg-orange-600 hover:bg-white text-black hover:text-zinc-900 px-6 py-3 font-black text-xs uppercase italic rounded-xl transition-all disabled:opacity-50 shadow-md"
                            >
                                Enregistrer
                            </button>
                        </div>
                    </form>
                </div>
            )}
            <AdminQuickBar 
                uid={new URLSearchParams(window.location.search).get('slug') || new URLSearchParams(window.location.search).get('audit') || new URLSearchParams(window.location.search).get('prospect') || new URLSearchParams(window.location.search).get('brand') || new URLSearchParams(window.location.search).get('uid') || sessionId} 
                companyName={sessionData?.userData?.companyName} 
            />
        </div>
    );
};

export default ProductPortal;
