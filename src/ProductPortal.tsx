import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { Upload, ShieldCheck, Zap, Layout, Loader2, Sparkles, LogIn, CheckSquare, Shield, Layers, CheckCircle2, RefreshCcw, Trash2, RefreshCw, Play, Check, Terminal, Wind, Sun, Moon, Info, ArrowLeft, ShieldAlert, Clock, TrendingUp, ArrowRight, ExternalLink, Download, Wand2, Star, HardHat, User, ShoppingCart, Package, Minus, Plus, ChevronUp, ChevronDown, Menu, Shirt } from 'lucide-react';
import { db, auth } from './firebaseConfig';
import { collection, addDoc, serverTimestamp, query, where, getDocs, doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { sanitizeForFirestore } from './utils/firestoreSanitizer';
import { onAuthStateChanged } from 'firebase/auth';
import { BRANDING } from './constants/branding';
import { sendOrderConfirmationEmail } from './utils/emailService';
import AdminQuickBar from './components/AdminQuickBar';

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
        front: { x: 0.64, y: 0.32, scale: 0.16 },
        back: { x: 0.50, y: 0.38, scale: 0.35 }
    },
    sweat: {
        front: { x: 0.64, y: 0.34, scale: 0.20 },
        back: { x: 0.50, y: 0.46, scale: 0.35 }
    },
    business_card: {
        front: { x: 0.50, y: 0.50, scale: 0.40 },
        back: { x: 0.50, y: 0.50, scale: 0.40 }
    }
};

const STUDIO_PLACEMENTS = {
    tshirt: {
        front: { x: 0.64, y: 0.45, scale: 0.15 },
        back: { x: 0.50, y: 0.42, scale: 0.30 }
    },
    tshirt_basic: {
        front: { x: 0.64, y: 0.45, scale: 0.15 },
        back: { x: 0.50, y: 0.42, scale: 0.30 }
    },
    polo: {
        front: { x: 0.64, y: 0.32, scale: 0.15 },
        back: { x: 0.50, y: 0.38, scale: 0.30 }
    },
    sweat: {
        front: { x: 0.64, y: 0.48, scale: 0.15 },
        back: { x: 0.50, y: 0.48, scale: 0.30 }
    },
    business_card: {
        front: { x: 0.50, y: 0.50, scale: 0.45 },
        back: { x: 0.50, y: 0.50, scale: 0.45 }
    }
};

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
    const { previewId } = useParams<{ previewId?: string }>();
    const navigate = useNavigate();
    const [menuOpen, setMenuOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [sessionData, setSessionData] = useState<any>(null);
    const [dynamicMockups, setDynamicMockups] = useState<any[]>([]);
    const [isLightMode, setIsLightMode] = useState<boolean>(false);
    const isShop = window.location.pathname.includes('portail-shop') || window.location.pathname.includes('/preview/');
    
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
    const [selectedTshirtVariant, setSelectedTshirtVariant] = useState<'lourd' | 'leger'>('leger');
    const [cardViews, setCardViews] = useState<Record<string, 'front' | 'back'>>({
        tshirt: 'front',
        polo: 'front',
        hoodie: 'front',
        business_card: 'front',
        epi: 'front'
    });
    const [displayModes, setDisplayModes] = useState<Record<string, 'studio' | 'bat'>>({
        tshirt: 'studio',
        tshirt_basic: 'studio',
        polo: 'studio',
        sweat: 'studio',
        hoodie: 'studio',
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

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
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
            const sidParam = previewId || params.get('portal') || params.get('audit') || params.get('uid') || localStorage.getItem('btp_active_session_id');

            if (sidParam) {
                let sid = sidParam;
                let latestConfig: any = null;

                try {
                    const { getStoredConfig } = await import('./lib/store');
                    latestConfig = await getStoredConfig(sidParam);
                    if (latestConfig && (latestConfig.generatedKey || latestConfig.actuationKey)) {
                        const linked = latestConfig.generatedKey || latestConfig.actuationKey;
                        if (linked && linked !== sid) sid = linked;
                    }
                } catch (e) {
                    console.warn("Failed to load stored config for sidParam:", e);
                }

                if (latestConfig && latestConfig.accentColor) {
                    setAccentColor(latestConfig.accentColor);
                }

                setSessionId(sid);
                // 1. Try Local Storage/IndexedDB first
                let sessionStr = await dbGet(`session_obj_${sid}`);
                
                // Fallback: If we couldn't find the session using the UID, try the locally saved active session ID (only if no specific uid is requested in URL)
                if (!sessionStr && !params.get('uid') && localStorage.getItem('btp_active_session_id')) {
                    const localSid = localStorage.getItem('btp_active_session_id');
                    const localStr = await dbGet(`session_obj_${localSid}`);
                    if (localStr) {
                        sid = localSid!; // We found it locally!
                        setSessionId(sid);
                        sessionStr = localStr;
                    }
                }

                // ALWAYS check cloud Firestore first for images/mockups to ensure updates sync instantly
                let cloudDoc: any = null;
                try {
                    let q = query(collection(db, 'btp_projects'), where('projectId', '==', sid));
                    let snap = await getDocs(q);
                    if (snap.empty) {
                        q = query(collection(db, 'btp_projects'), where('previewId', '==', sid));
                        snap = await getDocs(q);
                    }
                    if (!snap.empty) {
                        const sortedDocs = snap.docs.map(d => d.data()).sort((a: any, b: any) => {
                            const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
                            const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
                            return timeB - timeA;
                        });
                        cloudDoc = sortedDocs[0];
                    } else {
                        const prevRef = doc(db, 'anonymous_previews', sid);
                        const prevSnap = await getDoc(prevRef);
                        if (prevSnap.exists()) {
                            const pData = prevSnap.data();
                            cloudDoc = {
                                userData: { companyName: pData.companyName || "", email: pData.userEmail || "" },
                                mockups: pData.items || pData.mockups || [],
                                logoUrl: pData.logoUrl || pData.logoAdaptedUrl || "",
                                accentColor: pData.accentColor || "#ea580c"
                            };
                        }
                    }
                } catch (e) {
                    console.warn("Failed to check cloud during loadActiveSession:", e);
                }

                if (sessionStr || cloudDoc || latestConfig) {
                    const localData = sessionStr ? JSON.parse(sessionStr) : {};
                    const data = {
                        ...localData,
                        ...cloudDoc,
                        userData: {
                            companyName: latestConfig?.companyName || cloudDoc?.companyName || localData?.userData?.companyName || "",
                            email: latestConfig?.contactEmail || cloudDoc?.contactEmail || localData?.userData?.email || "",
                            activity: latestConfig?.activitySector || cloudDoc?.activitySector || localData?.userData?.activity || "",
                            phone: latestConfig?.whatsappNumber || cloudDoc?.phone || localData?.userData?.phone || "",
                            ...(localData.userData || {}),
                            ...(cloudDoc?.userData || {})
                        },
                        logoUrl: latestConfig?.logoUrl || cloudDoc?.logoUrl || localData?.logoUrl || "",
                        mockups: cloudDoc?.mockups || cloudDoc?.items || localData.mockups || latestConfig?.mockups || latestConfig?.items || latestConfig?.products || []
                    };

                    if (!latestConfig?.accentColor && data.accentColor) {
                        setAccentColor(data.accentColor);
                    }
                    setSessionData(data);

                    const candidateArrays = [
                        localData?.mockups,
                        localData?.items,
                        cloudDoc?.mockups,
                        cloudDoc?.items,
                        latestConfig?.mockups,
                        latestConfig?.items,
                        latestConfig?.products
                    ].filter(arr => Array.isArray(arr) && arr.length > 0);

                    let rawItems: any[] = [];
                    let maxRealImages = -1;

                    for (const candidate of candidateArrays) {
                        const realCount = candidate.filter((item: any) => {
                            const img = item.ai || item.imageStudio || item.imageFront || item.imageUrl;
                            return img && typeof img === 'string' && (img.includes('firebasestorage') || img.startsWith('data:') || img.length > 100);
                        }).length;

                        if (realCount >= maxRealImages) {
                            maxRealImages = realCount;
                            rawItems = candidate;
                        }
                    }

                    if (rawItems.length === 0) {
                        rawItems = [
                            { id: 'tFront', garment: 'tshirt', view: 'front' },
                            { id: 'tBack', garment: 'tshirt', view: 'back' },
                            { id: 'pFront', garment: 'polo', view: 'front' },
                            { id: 'pBack', garment: 'polo', view: 'back' },
                            { id: 'hFront', garment: 'sweat', view: 'front' },
                            { id: 'hBack', garment: 'sweat', view: 'back' },
                            { id: 'cardFront', garment: 'business_card', view: 'front' },
                            { id: 'cardBack', garment: 'business_card', view: 'back' }
                        ];
                    }

                    const restored = await Promise.all(rawItems.map(async (m: any) => {
                        const isRealImg = (url?: string) => url && typeof url === 'string' && (url.includes('firebasestorage') || url.startsWith('data:') || url.length > 100);
                        const idbAi = await dbGet(`${sid}_ai_${m.id}`);
                        let ai = m.ai || m.imageStudio || m.imageFront || m.imageUrl;
                        
                        // Priority check for products object from SiteConfigs / cloudDoc / latestConfig
                        const syncedProducts = latestConfig?.products || cloudDoc?.products || localData?.products;
                        if (syncedProducts) {
                            const isTshirt = m.id === 'tFront' || m.garment === 'tshirt';
                            const isPolo = m.id === 'pFront' || m.garment === 'polo';
                            const isHoodie = m.id === 'hFront' || m.garment === 'sweat';
                            let priorityUrl: string | null = null;
                            if (isTshirt && syncedProducts.tshirt?.aiImageUrl) priorityUrl = syncedProducts.tshirt.aiImageUrl;
                            else if (isPolo && syncedProducts.polo?.aiImageUrl) priorityUrl = syncedProducts.polo.aiImageUrl;
                            else if (isHoodie && syncedProducts.hoodie?.aiImageUrl) priorityUrl = syncedProducts.hoodie.aiImageUrl;

                            if (priorityUrl && typeof priorityUrl === 'string' && priorityUrl.startsWith('https://firebasestorage.googleapis.com')) {
                                ai = priorityUrl;
                            }
                        }

                        if (isRealImg(idbAi) && idbAi.startsWith('data:image')) {
                            if (!ai || !ai.startsWith('https://firebasestorage.googleapis.com')) {
                                ai = idbAi;
                            }
                        } else if (!isRealImg(ai)) {
                            if (isRealImg(idbAi)) ai = idbAi;
                        }

                        const idbMech = await dbGet(`${sid}_mech_${m.id}`);
                        let mechanical = m.mechanical || m.imageBat || m.imageBack || m.backImageUrl;
                        if (isRealImg(idbMech) && idbMech.startsWith('data:image')) {
                            mechanical = idbMech;
                        } else if (!isRealImg(mechanical)) {
                            if (isRealImg(idbMech)) mechanical = idbMech;
                        }
                        
                        let garment = m.garment || m.type;
                        if (!garment) {
                            if (m.id?.includes('basic')) garment = 'tshirt_basic';
                            else if (m.id?.includes('card')) garment = 'business_card';
                            else if (m.id?.includes('h')) garment = 'sweat';
                            else garment = 'tshirt';
                        }
                        let view = m.view;
                        if (!view) {
                            if (m.id?.toLowerCase().includes('front') || m.id?.toLowerCase().includes('recto')) view = 'front';
                            else if (m.id?.toLowerCase().includes('back') || m.id?.toLowerCase().includes('verso')) view = 'back';
                            else view = 'front';
                        }

                        return { 
                            ...m,
                            garment,
                            view,
                            ai: isRealImg(ai) ? ai : null,
                            mechanical: isRealImg(mechanical) ? mechanical : null
                        };
                    }));
                    setDynamicMockups(restored);

                    // Load active user logo based on selected logo mode
                    const mode = data.logoAMode || 'adapted';
                    let loadedLogo: string | null = null;
                    if (mode === 'remastered') {
                        loadedLogo = await dbGet(`${sid}_A_remastered`);
                    } else if (mode === 'adapted') {
                        loadedLogo = await dbGet(`${sid}_A_adapted_remastered`);
                        if (!loadedLogo) loadedLogo = await dbGet(`${sid}_A_adapt`);
                    } else if (mode === 'adaptedBlack') {
                        loadedLogo = await dbGet(`${sid}_A_adapted_black_remastered`);
                        if (!loadedLogo) loadedLogo = await dbGet(`${sid}_A_adapt_black`);
                    } else if (mode === 'original') {
                        loadedLogo = await dbGet(`${sid}_A_orig`);
                    }

                    if (!loadedLogo) {
                        loadedLogo = latestConfig?.logoAdaptedUrl || data?.logoAdaptedUrl || data?.logoA?.adaptedRemastered || data?.logoA?.adapted || latestConfig?.logoA?.adapted || latestConfig?.logoA?.adaptedRemastered || latestConfig?.logoUrl || data?.logoUrl || null;
                    }
                    setUserLogo(loadedLogo);
                }
            }
            setIsLoading(false);
        };

        loadActiveSession();

        // Polling loop to dynamically stream updated assets/mockups in real-time as they complete in the background
        const interval = setInterval(() => {
            loadActiveSession();
        }, 1500);

        return () => clearInterval(interval);
    }, []);

    const handleOpenEditSession = async () => {
        setEditCompanyName(sessionData?.userData?.companyName || '');
        setEditEmail(sessionData?.userData?.email || '');
        setShowEditSessionModal(true);
        
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
                            title: m.title || "Vêtement BTP",
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
            if (pId) {
                try {
                    const previewRef = doc(db, 'anonymous_previews', pId);
                    const previewSnap = await getDoc(previewRef);
                    if (previewSnap.exists()) {
                        await updateDoc(previewRef, sanitizeForFirestore({
                            companyName: editCompanyName,
                            userEmail: editEmail,
                            updatedAt: new Date().toISOString()
                        }));
                    }
                } catch (previewErr) {
                    console.warn("Could not sync to anonymous_previews:", previewErr);
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
        if (found?.model) return found.model;
        if (garmentType === 'sweat') {
            return view === 'front' ? '/assets/models/male_hoodie_front.png' : '/assets/models/male_hoodie_back.png';
        }
        if (garmentType === 'polo') {
            return view === 'front' ? '/assets/polo-black-JHK510.png' : '/assets/polo-black-JHK510-dos.png';
        }
        if (garmentType === 'business_card') {
            return view === 'front' ? '/assets/models/card_mockup_front_neutral.png' : '/assets/models/card_mockup_back.png';
        }
        return view === 'front' ? '/assets/models/male_tshirt_front.png' : '/assets/models/male_tshirt_back.png';
    };

    const getDefaultBatImage = (garmentType: string, view: 'front' | 'back', defaultImg: string) => {
        if (garmentType === 'tshirt') return view === 'front' ? '/assets/tshirt-black-JHK170.png' : '/assets/tshirt-black-JHK170-dos.png';
        if (garmentType === 'tshirt_basic') return view === 'front' ? '/assets/tshirt-grey-JHK170.png' : '/assets/tshirt-grey-JHK170-dos.png';
        if (garmentType === 'polo') return view === 'front' ? '/assets/polo-black-JHK510.png' : '/assets/polo-black-JHK510-dos.png';
        if (garmentType === 'sweat') return view === 'front' ? '/assets/hoodie-black-JHK421.png' : '/assets/hoodie-black-JHK421-dos.png';
        if (garmentType === 'business_card') return '/assets/card-base.svg';
        return defaultImg;
    };

    const isRealImage = (url?: string | null) => {
        if (!url || typeof url !== 'string') return false;
        if (url.includes('/assets/') && !url.includes('firebasestorage') && !url.startsWith('data:')) return false;
        return url.startsWith('data:') || url.includes('firebasestorage') || url.includes('autosave') || url.includes('_ai_') || url.length > 100;
    };

    const getDynamicImage = (garmentType: string, view: 'front' | 'back', mode: 'studio' | 'bat', defaultImg: string) => {
        let found = dynamicMockups.find(m => m.garment === garmentType && m.view === view);
        
        if (!found && garmentType === 'tshirt_basic') {
            found = dynamicMockups.find(m => m.garment === 'tshirt' && m.view === view);
        }
        
        if (!found) {
            let altId = '';
            if (garmentType === 'tshirt') altId = view === 'front' ? 'tFront' : 'tBack';
            else if (garmentType === 'tshirt_basic') altId = view === 'front' ? 'tbFront' : 'tbBack';
            else if (garmentType === 'polo') altId = view === 'front' ? 'pFront' : 'pBack';
            else if (garmentType === 'sweat') altId = view === 'front' ? 'hFront' : 'hBack';
            else if (garmentType === 'business_card') altId = view === 'front' ? 'cardFront' : 'cardBack';
            
            let altFound = dynamicMockups.find(m => m.id === altId);
            if (altFound) found = altFound;
        }

        if (mode === 'studio') {
            const aiCandidate = found?.ai || (found as any)?.imageStudio || (found as any)?.imageFront || (found as any)?.imageUrl;
            if (isRealImage(aiCandidate)) {
                return aiCandidate;
            }
            const mechCandidate = found?.mechanical || (found as any)?.imageBat;
            if (isRealImage(mechCandidate)) {
                return mechCandidate;
            }
            return getDefaultStudioImage(garmentType, view, found);
        } else {
            // Mode BAT / Base: ALWAYS use the 2D mechanical gabarit image with logo placement!
            const mechCandidate = found?.mechanical || (found as any)?.imageBat || (found as any)?.imageBack;
            if (isRealImage(mechCandidate)) {
                return mechCandidate;
            }
            return getDefaultBatImage(garmentType, view, defaultImg);
        }
    };

    const toggleView = (packId: string) => {
        setCardViews(prev => ({
            ...prev,
            [packId]: prev[packId] === 'front' ? 'back' : 'front'
        }));
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

    const calculateSubTotalHT = () => {
        let totalHT = 0;
        
        // Garments (nominative)
        activePacks.forEach(pack => {
            if (pack.type !== 'business_card') {
                const count = orderItems.filter(item => item.packId === pack.id).length;
                totalHT += count * pack.pricePublic;
            }
        });

        // Bulk (business_card)
        activePacks.forEach(pack => {
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
            window.location.href = `/vitrine-admin/dashboard?claim=${urlUid}&action=order`;
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
            activePacks.forEach(pack => {
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
            activePacks.forEach(pack => {
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

            const docRef = await addDoc(collection(db, 'btp_dotations'), dotationData);

            // 2b. Send confirmation emails (client + admin)
            sendOrderConfirmationEmail(
                contactInfo.name || sessionData?.userData?.companyName || 'Client',
                contactInfo.email || sessionData?.userData?.email || '',
                totalItems,
                totalTTC
            ).catch(err => console.warn('Email envoi non-bloquant:', err));

            // 3. Call Mollie (Firebase Function)
            const response = await fetch('https://us-central1-signaid-d2d08.cloudfunctions.net/createMolliePayment', {
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

    const packs = isShop ? [
        {
            id: 'tshirt',
            type: selectedTshirtVariant === 'leger' ? 'tshirt_basic' : 'tshirt',
            name: selectedTshirtVariant === 'leger' ? 'T-Shirt Léger (150g/m² Standard)' : 'T-Shirt Lourd (190g/m² Premium)',
            description: selectedTshirtVariant === 'leger' ? 'T-shirt JHK 150 - Noir, Coupe Confort' : 'T-shirt JHK 170 Premium - Noir, Maille Épaisse',
            pricePublic: selectedTshirtVariant === 'leger' ? 25 : 30,
            priceSub: selectedTshirtVariant === 'leger' ? 25 : 30,
            getImages: (view: 'front' | 'back', mode: 'studio' | 'bat') => getDynamicImage(selectedTshirtVariant === 'leger' ? 'tshirt_basic' : 'tshirt', view, mode, view === 'front' ? (selectedTshirtVariant === 'leger' ? '/assets/tshirt-grey-JHK170.png' : '/assets/tshirt-black-JHK170.png') : (selectedTshirtVariant === 'leger' ? '/assets/tshirt-grey-JHK170-dos.png' : '/assets/tshirt-black-JHK170-dos.png')),
            icon: <Sun className="text-zinc-500" size={20} />,
            quantities: ['S', 'M', 'L', 'XL', 'XXL']
        },
        {
            id: 'polo',
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
            type: 'sweat',
            name: 'Pack Hoodie Protection (Renforcé Thermique)',
            description: 'Hoodie Premium Renforcé - Doublure Thermique Active',
            pricePublic: 45,
            priceSub: 45,
            getImages: (view: 'front' | 'back', mode: 'studio' | 'bat') => getDynamicImage('sweat', view, mode, view === 'front' ? '/assets/hoodie-black-JHK421.png' : '/assets/hoodie-black-JHK421-dos.png'),
            icon: <Wind className="text-blue-400" size={20} />,
            quantities: ['S', 'M', 'L', 'XL', 'XXL']
        },
        {
            id: 'business_card',
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
            type: selectedTshirtVariant === 'leger' ? 'tshirt_basic' : 'tshirt',
            name: selectedTshirtVariant === 'leger' ? 'T-Shirt Léger (150g/m² Standard)' : 'T-Shirt Lourd (190g/m² Premium)',
            description: selectedTshirtVariant === 'leger' ? 'T-shirt JHK 150 - Noir, Coupe Confort' : 'T-shirt JHK 170 Premium - Noir, Maille Épaisse',
            pricePublic: selectedTshirtVariant === 'leger' ? 25 : 30,
            priceSub: selectedTshirtVariant === 'leger' ? 25 : 30,
            getImages: (view: 'front' | 'back', mode: 'studio' | 'bat') => getDynamicImage(selectedTshirtVariant === 'leger' ? 'tshirt_basic' : 'tshirt', view, mode, view === 'front' ? (selectedTshirtVariant === 'leger' ? '/assets/tshirt-grey-JHK170.png' : '/assets/tshirt-black-JHK170.png') : (selectedTshirtVariant === 'leger' ? '/assets/tshirt-grey-JHK170-dos.png' : '/assets/tshirt-black-JHK170-dos.png')),
            icon: <Sun className="text-zinc-500" size={20} />,
            quantities: ['S', 'M', 'L', 'XL', 'XXL']
        },
        {
            id: 'polo',
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
            type: 'sweat',
            name: 'Pack Hoodie Protection (Renforcé Thermique)',
            description: 'Hoodie Premium Renforcé - Doublure Thermique Active',
            pricePublic: 45,
            priceSub: 45,
            getImages: (view: 'front' | 'back', mode: 'studio' | 'bat') => getDynamicImage('sweat', view, mode, view === 'front' ? '/assets/hoodie-black-JHK421.png' : '/assets/hoodie-black-JHK421-dos.png'),
            icon: <Wind className="text-blue-400" size={20} />,
            quantities: ['S', 'M', 'L', 'XL', 'XXL']
        }
    ];

    const activePacks = packs;

    if (isLoading) {
        const scrollItems = dynamicMockups.length > 0 ? dynamicMockups.map(m => m.ai || m.mechanical || m.base) : [
            '/assets/models/btp_strong_man_tshirt_front.png',
            '/assets/models/btp_strong_man_hoodie_front.png',
            '/assets/models/card_mockup_front_neutral.png',
            '/assets/models/card_mockup_back.png'
        ];
        // Triple duplicates to ensure infinite animation loop without blank space
        const duplicatedItems = [...scrollItems, ...scrollItems, ...scrollItems];

        return (

            <div className={`min-h-screen ${isLightMode ? 'bg-gray-50 text-gray-900' : 'bg-zinc-950 text-zinc-100'} flex flex-col items-center justify-center p-6 font-sans select-none overflow-hidden relative`}>
                {/* Embedded Premium CSS Animations */}
                <style>{`
                    @keyframes infiniteScroll {
                        0% { transform: translateX(0); }
                        100% { transform: translateX(-33.33%); }
                    }
                    @keyframes scanline {
                        0% { transform: translateY(-100%); }
                        100% { transform: translateY(100%); }
                    }
                    @keyframes loadingBar {
                        0% { transform: translateX(-100%); }
                        100% { transform: translateX(100%); }
                    }
                    .animate-infinite-scroll {
                        display: flex;
                        width: max-content;
                        animation: infiniteScroll 15s linear infinite;
                    }
                    .animate-scanline {
                        animation: scanline 6s linear infinite;
                    }
                    .animate-loading-bar {
                        animation: loadingBar 2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
                    }
                    .animate-pulse-slow {
                        animation: pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                    }
                    ${dynamicStyleSheet}
                `}</style>

                {/* Ambient orange light glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-orange-600/10 rounded-full blur-[140px] pointer-events-none animate-pulse-slow" />

                <div className="w-full max-w-4xl flex flex-col items-center space-y-10 relative z-10">
                    {/* Header Status */}
                    <div className="flex flex-col items-center gap-3 text-center">
                        <div className="px-4 py-1.5 bg-orange-600/10 border border-orange-600/30 text-orange-500 rounded-full text-[9px] font-black tracking-[0.4em] uppercase flex items-center gap-2">
                            <Sparkles size={10} className="animate-spin text-orange-500" /> Synchronisation Portail
                        </div>
                        <h2 className="text-3xl md:text-4xl font-black italic tracking-tighter text-white uppercase mt-2">
                            {sessionData?.userData?.companyName ? `${sessionData.userData.companyName.toUpperCase()} SHOP` : "SIGNAID PRODUCTION SHOP"} <span className="text-orange-500">V24</span>
                        </h2>
                        <p className="text-[10px] font-black tracking-widest text-zinc-500 uppercase">
                            Chargement sécurisé du coffre-fort et des gabarits...
                        </p>
                    </div>

                    {/* SCROLLING GABARITS / MOCKUPS CAROUSEL */}
                    <div className="relative w-full max-w-2xl h-60 overflow-hidden border border-zinc-800 bg-zinc-950/40 backdrop-blur-md rounded-2xl flex items-center p-4">
                        {/* Decorative scanline overlay */}
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-orange-600/5 to-transparent pointer-events-none animate-scanline" style={{ backgroundSize: '100% 200%' }} />

                        <div className="flex gap-6 animate-infinite-scroll py-2">
                            {duplicatedItems.map((imgSrc, idx) => (
                                <div key={`scroll-img-${idx}`} className="w-36 h-36 shrink-0 border border-zinc-800 bg-black/90 p-2 flex items-center justify-center relative group overflow-hidden shadow-2xl rounded-xl">
                                    <img
                                        src={imgSrc}
                                        className="w-full h-full object-contain filter grayscale contrast-125 brightness-90 transition-all duration-300"
                                    />
                                    <div className="absolute bottom-1.5 left-2 font-black text-[6px] text-zinc-600 tracking-widest uppercase">
                                        SECURE BTP V24
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Progress Bar indicator */}
                    <div className="w-full max-w-md space-y-3">
                        <div className="h-1.5 w-full bg-zinc-900 overflow-hidden relative border border-zinc-800 rounded-full">
                            <div className="h-full bg-gradient-to-r from-orange-600 to-yellow-500 w-full animate-loading-bar rounded-full" />
                        </div>
                        <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-zinc-500">
                            <span>Chargement des ressources HD</span>
                            <span className="animate-pulse text-orange-500">Actif</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
    const isGarmentQuotaMet = true; // Retrait du quota minimum de 10 pièces

    // Le bouton principal est désactivé si on est en train de soumettre, si le total est 0, ou si le quota textile n'est pas atteint.
    const isGlobalOrderDisabled = isSubmitting || calculateTotalItems() === 0 || !isGarmentQuotaMet;

    return (
        <div className={`min-h-screen ${isLightMode ? 'bg-gray-50 text-gray-900' : 'bg-zinc-950 text-zinc-100'} font-sans pb-20 selection:bg-orange-600 selection:text-black transition-colors duration-500`}>
            <style>{dynamicStyleSheet}</style>
            {/* HEADER */}
            <header className={`${isLightMode ? 'bg-white border-gray-200 text-gray-900' : 'bg-zinc-900 border-orange-600 text-white'} border-b-4 shadow-xl sticky top-0 z-50 transition-colors duration-500`}>
                <div className="max-w-[1600px] w-full mx-auto px-4 md:px-8 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div
                        onClick={() => isAdmin ? navigate(`/admin-dashboard?uid=${sessionId || ''}`) : navigate(`/?uid=${sessionId || ''}`)}
                        className={`flex items-center gap-4 cursor-pointer group hover:opacity-80 transition-all`}
                        title={isAdmin ? "Retourner sur le Hub Admin" : "Retourner à la Vitrine"}
                    >
                        {userLogo ? (
                            <div className="relative w-14 h-14 bg-zinc-900/50 hover:bg-zinc-800/60 backdrop-blur-md rounded-xl p-2 border border-zinc-800 hover:border-orange-500 flex items-center justify-center overflow-hidden shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_8px_20px_rgba(0,0,0,0.4)] transition-all group duration-300">
                                <img src={userLogo} className="max-w-full max-h-full object-contain filter drop-shadow-[0_2px_8px_rgba(234,88,12,0.15)] transition-transform group-hover:scale-105" style={{ filter: isLightMode ? 'invert(1) hue-rotate(180deg)' : 'none' }} alt="Logo" />
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
                                if (isAdmin) {
                                    handleOpenEditSession();
                                } else {
                                    // Invité: redirection vers son hub
                                    window.location.href = `/profil?uid=${sessionId || ''}`;
                                }
                            }}
                            className={`flex items-center gap-3 ${isLightMode ? 'bg-gray-100 border-gray-200 hover:bg-gray-200' : 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700'} px-4 py-2 rounded-lg border cursor-pointer group transition-all`}
                            title={isAdmin ? "Modifier les informations de la session" : "Accéder à mon Hub"}
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
                                                    const sid = params.get('audit') || params.get('uid') || sessionId;
                                                    window.location.href = `/vitrine-admin/dashboard?uid=${sid || ''}`;
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
                                                        window.location.href = `/vitrine-admin/dashboard?claim=${urlUid}`;
                                                        return;
                                                    }
                                                    const params = new URLSearchParams(window.location.search);
                                                    const uid = params.get('uid');
                                                    
                                                    const sector = sessionData?.userData?.activity?.toLowerCase() || "";
                                                    const targetPage = sector.includes('btp') || sector.includes('bâtiment') || sector.includes('construction') ? '/btp-audit' : '/portail-audit';

                                                    if (uid && uid.startsWith('audit-')) {
                                                        window.location.href = `${targetPage}?audit=${uid}`;
                                                    } else if (sessionId) {
                                                        window.location.href = `${targetPage}?audit=${sessionId}`;
                                                    } else {
                                                        navigate(targetPage);
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
                                                    const params = new URLSearchParams(window.location.search);
                                                    const urlUid = params.get('uid');
                                                    navigate(urlUid ? `/?uid=${urlUid}` : `/`);
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

                {/* PACKS GRID */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {activePacks.map((pack) => (
                        <div key={pack.id} className={`${isLightMode ? 'bg-white border-gray-200 shadow-xl hover:shadow-[0_0_20px_rgba(234,88,12,0.15)] text-gray-900' : 'bg-zinc-900/40 backdrop-blur-md border-zinc-800/80 shadow-2xl hover:shadow-[0_0_30px_rgba(234,88,12,0.15)] text-zinc-100'} border-2 rounded-2xl overflow-hidden hover:border-orange-600/80 transition-all flex flex-col group text-left duration-300`}>
                            {/* Top Image */}
                            <div className={`relative aspect-square overflow-hidden ${isLightMode ? 'bg-gray-50 border-gray-200' : 'bg-zinc-950 border-zinc-800/60'} border-b flex items-center justify-center`}>
                                {(() => {
                                    const view = cardViews[pack.id] as 'front' | 'back';
                                    const mode = displayModes[pack.id] as 'studio' | 'bat';
                                    const mockup = dynamicMockups.find(m => m.garment === pack.type && m.view === view);
                                    const isGenerating = mockup ? mockup.isGenerating : false;
                                    const imgUrl = pack.getImages(view, mode);
                                    
                                    // Detect fallback
                                    const isFallback = (imgUrl.includes('/assets/') || imgUrl.includes('_ai_preset')) && !imgUrl.startsWith('data:');
                                    const placementType = pack.type as keyof typeof LOCAL_PLACEMENTS;
                                    const posGroup = mode === 'studio' 
                                        ? (STUDIO_PLACEMENTS[placementType as keyof typeof STUDIO_PLACEMENTS] || STUDIO_PLACEMENTS.tshirt)
                                        : (LOCAL_PLACEMENTS[placementType] || LOCAL_PLACEMENTS.tshirt);
                                    const pos = posGroup ? (posGroup[view] || posGroup.front) : null;
                                    const showOverlay = isFallback && pos && userLogo;
                                    
                                    if (showOverlay && pos) {
                                        const isCard = pack.type === 'business_card';
                                        return (
                                            <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
                                                <img
                                                    src={imgUrl}
                                                    alt={pack.name}
                                                    className={`w-full h-full ${mode === 'bat' ? 'object-contain p-16 animate-reveal' : (isCard ? 'object-contain p-12' : 'object-cover')}`}
                                                    style={pack.type === 'tshirt_basic' && mode === 'bat' && isFallback ? { filter: 'brightness(0.35) contrast(1.2)' } : undefined}
                                                />
                                                <img
                                                    src={userLogo}
                                                    style={{
                                                        position: 'absolute',
                                                        left: `${pos.x * 100}%`,
                                                        top: `${pos.y * 100}%`,
                                                        width: `${pos.scale * 100}%`,
                                                        transform: 'translate(-50%, -50%)',
                                                        pointerEvents: 'none',
                                                        objectFit: 'contain'
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
                                        <>
                                            <img
                                                src={imgUrl}
                                                alt={pack.name}
                                                className={`w-full h-full transition-all duration-500 ${mode === 'bat' ? 'object-contain p-16 animate-reveal' : (pack.type === 'business_card' ? 'object-contain p-12' : 'object-cover')} ${isGenerating ? 'blur-[3px] opacity-60' : ''}`}
                                                style={pack.type === 'tshirt_basic' && isFallback ? { filter: 'brightness(0.35) contrast(1.2)' } : undefined}
                                            />
                                            {isGenerating && (
                                                <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex flex-col items-center justify-center gap-2 z-10">
                                                    <Loader2 className="animate-spin text-orange-500" size={24} />
                                                    <span className="text-[10px] font-black tracking-widest text-orange-500 uppercase animate-pulse text-center">Rendu IA en cours...</span>
                                                </div>
                                            )}
                                        </>
                                    );
                                })()}
                                <div className={`absolute top-4 left-4 ${isLightMode ? 'bg-white/90 border-gray-200 text-gray-900' : 'bg-zinc-900/90 border-zinc-800 text-zinc-100'} backdrop-blur-md px-3 py-1.5 rounded-lg shadow-lg flex items-center gap-2 border`}>
                                    {pack.icon}
                                    <span className="text-[10px] font-black uppercase italic">{pack.name}</span>
                                </div>

                                <div className="absolute bottom-4 left-4 right-4 flex justify-between gap-2">
                                    {/* VIEW TOGGLE */}
                                    <button
                                        onClick={() => toggleView(pack.id)}
                                        className={`${isLightMode ? 'bg-white/95 text-gray-900 border-gray-300' : 'bg-zinc-950/95 text-white border-zinc-800'} px-4 py-2 rounded-full font-black text-[9px] uppercase italic tracking-widest flex items-center gap-2 hover:bg-orange-600 hover:text-black transition-all backdrop-blur-sm border hover:border-orange-500`}
                                    >
                                        <RefreshCw size={12} className={cardViews[pack.id] === 'back' ? 'rotate-180 transition-transform animate-reveal' : 'transition-transform'} />
                                        {cardViews[pack.id] === 'front' ? 'Verso' : 'Face'}
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
                        <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Powered by Signaid V24</div>
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
                uid={new URLSearchParams(window.location.search).get('audit') || new URLSearchParams(window.location.search).get('uid') || sessionId} 
                companyName={sessionData?.userData?.companyName} 
            />
        </div>
    );
};

export default ProductPortal;
