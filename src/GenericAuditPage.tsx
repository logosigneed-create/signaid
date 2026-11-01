import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Upload, ShieldCheck, Zap, Layout, Loader2, Sparkles, LogIn, CheckSquare, Shield, Layers, CheckCircle2, RefreshCcw, Trash2, RefreshCw, Play, Check, Terminal, Wind, Sun, Moon, Info, ArrowLeft, ShieldAlert, Clock, TrendingUp, ArrowRight, ExternalLink, Download, Wand2, Shirt, Crop, ChevronDown, ChevronUp } from 'lucide-react';
import { collection, addDoc, serverTimestamp, query, where, getDocs, doc, getDoc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { db, storage, auth } from './firebaseConfig';
import { ref, uploadString, getDownloadURL, deleteObject, UploadMetadata } from 'firebase/storage';
import { SEO } from './components/SEO';
import { geminiService } from './services/geminiService';
import { getStoredConfig, saveStoredConfig } from './lib/store';
import { ensureLocalProfileSeeded } from './lib/localProfiles';
import { padBase64ToSquare } from './utils/imageUtils';
import { removeBackground, intelligentUpscale } from './utils/helpers';
import { sanitizeForFirestore } from './utils/firestoreSanitizer';
import { withCacheBust } from './lib/cacheBuster';
import {
    openDB,
    dbSet,
    dbGet,
    saveSessionLocal,
    syncSessionToCloud as syncSessionToCloudService,
    handleDirectCloudSync,
    getCleanSlug,
    toKebabCaseSlug,
    extractRootSlug,
    extractGarmentMockupMap,
    isBackId,
    SaveSessionParams,
    isSafeStorageUrl,
    sanitizeMockupForLocalStorage,
    sanitizeGarmentMockupMap,
    pruneBulkyLocalStorageKeys,
    safeLocalStorageSetItem,
    purgeMockupSlotCache,
    cleanSessionCacheForSlug,
    mergeMockupsWithPriority,
    uploadBase64ToStorage,
    isRealAiImage
} from './services/auditPersistenceService';

const getCanonicalSlug = (slug: string) => slug || '';
const deleteStorageFileByUrl = async (url: string) => {
    try {
        if (!url || !url.includes('firebasestorage.googleapis.com')) return;
        const fileRef = ref(storage, url);
        await deleteObject(fileRef);
    } catch (e) {
        console.warn("Storage cleanup notice:", e);
    }
};
import QRCode from 'qrcode';
import AdminQuickBar from './components/AdminQuickBar';

import { FlowState, UserData, MockupItem, BtpLogo, LogoColorMode } from './types/audit';
import GabaritCard from './components/audit/GabaritCard';
import CropModal from './components/audit/CropModal';
import {
    getMergedAuditCatalog,
    isMockupMatchingProduct,
    convertProductToMockupItems,
    getLocalCustomProducts,
    sanitizeAuditProductEntry,
    deduplicateMockups,
    resolveSlotForPlacement,
    getAliasesForPlacementId
} from './services/auditCatalogService';
import { AUDIT_PORTAIL_CONFIG, AuditProductEntry } from './config/audit-portail';

const getBaseMockups = (): MockupItem[] => deduplicateMockups([
    // 1 & 2: CLASSIC BLACK T-SHIRT (JHK170)
    {
        id: 'tFront',
        title: 'T-shirt Noir FACE',
        base: "/assets/tshirt-black-JHK170.png?v=V24",
        ai: null,
        aiRemastered: null,
        isGenerating: false,
        view: 'front',
        garment: 'tshirt',
        mechanical: null,
        model: "/assets/models/male_tshirt_front.png",
        selected: true,
        productId: 'jhk170-classic-tshirt',
        sku: 'JHK170-BLK'
    },
    {
        id: 'tBack',
        title: 'T-shirt Noir DOS',
        base: "/assets/tshirt-black-JHK170-dos.png?v=V24",
        ai: null,
        aiRemastered: null,
        isGenerating: false,
        view: 'back',
        garment: 'tshirt',
        mechanical: null,
        model: "/assets/models/male_tshirt_back.png",
        selected: true,
        productId: 'jhk170-classic-tshirt',
        sku: 'JHK170-BLK'
    },

    // 3 & 4: POLO PREMIUM (JHK510)
    {
        id: 'pFront',
        title: 'Polo Premium FACE',
        base: "/assets/polo-black-JHK510.png?v=V24",
        ai: null,
        aiRemastered: null,
        isGenerating: false,
        view: 'front',
        garment: 'polo',
        mechanical: null,
        model: "/assets/models/male_polo_front.png",
        selected: true,
        productId: 'jhk510-polo-premium',
        sku: 'JHK510-BLK'
    },
    {
        id: 'pBack',
        title: 'Polo Premium DOS',
        base: "/assets/polo-black-JHK510-dos.png?v=V24",
        ai: null,
        aiRemastered: null,
        isGenerating: false,
        view: 'back',
        garment: 'polo',
        mechanical: null,
        model: "/assets/models/male_polo_back.png",
        selected: true,
        productId: 'jhk510-polo-premium',
        sku: 'JHK510-BLK'
    },

    // 5 & 6: HOODIE (JHK421)
    {
        id: 'hFront',
        title: 'Hoodie FACE',
        base: "/assets/hoodie-black-JHK421.png?v=V24",
        ai: null,
        aiRemastered: null,
        isGenerating: false,
        view: 'front',
        garment: 'sweat',
        mechanical: null,
        model: "/assets/models/male_hoodie_front.png",
        selected: true,
        productId: 'jhk421-hoodie',
        sku: 'JHK421-BLK'
    },
    {
        id: 'hBack',
        title: 'Hoodie DOS',
        base: "/assets/hoodie-black-JHK421-dos.png?v=V24",
        ai: null,
        aiRemastered: null,
        isGenerating: false,
        view: 'back',
        garment: 'sweat',
        mechanical: null,
        model: "/assets/models/male_hoodie_back.png",
        selected: true,
        productId: 'jhk421-hoodie',
        sku: 'JHK421-BLK'
    },

    // 7 & 8: DÉBARDEUR NOIR (BYBB011)
    {
        id: 'tankFront',
        title: 'Débardeur Noir FACE',
        base: "/assets/tank-black-BYBB011.png",
        ai: null,
        aiRemastered: null,
        isGenerating: false,
        view: 'front',
        garment: 'tank_top',
        mechanical: null,
        model: "/assets/models/male_tank_front.png",
        selected: true,
        productId: 'BYBB011-BLK',
        sku: 'BYBB011-BLK'
    },
    {
        id: 'tankBack',
        title: 'Débardeur Noir DOS',
        base: "/assets/tank-black-BYBB011-dos.png",
        ai: null,
        aiRemastered: null,
        isGenerating: false,
        view: 'back',
        garment: 'tank_top',
        mechanical: null,
        model: "/assets/models/male_tank_back.png",
        selected: true,
        productId: 'BYBB011-BLK',
        sku: 'BYBB011-BLK'
    },

    // 9 & 10: DÉBARDEUR BLANC (BYBB011)
    {
        id: 'tankWhiteFront',
        title: 'Débardeur Blanc FACE',
        base: "/assets/tank-white-BYBB011.png",
        ai: null,
        aiRemastered: null,
        isGenerating: false,
        view: 'front',
        garment: 'tank_top',
        color: 'white',
        mechanical: null,
        model: "/assets/models/male_tank_front.png",
        selected: true,
        productId: 'BYBB011-WHT',
        sku: 'BYBB011-WHT'
    },
    {
        id: 'tankWhiteBack',
        title: 'Débardeur Blanc DOS',
        base: "/assets/tank-white-BYBB011-dos.png",
        ai: null,
        aiRemastered: null,
        isGenerating: false,
        view: 'back',
        garment: 'tank_top',
        color: 'white',
        mechanical: null,
        model: "/assets/models/male_tank_back.png",
        selected: true,
        productId: 'BYBB011-WHT',
        sku: 'BYBB011-WHT'
    },

    // 11 & 12: HEAVYWEIGHT OVERSIZE (NX7200)
    {
        id: 'heavyFront',
        title: 'Heavyweight Oversize FACE',
        base: "/assets/tshirt-black-NX7200.png",
        ai: null,
        aiRemastered: null,
        isGenerating: false,
        view: 'front',
        garment: 'tshirt_oversize',
        mechanical: null,
        model: "/assets/models/male_tshirt_front.png",
        selected: true,
        productId: 'NX7200-BLK',
        sku: 'NX7200-BLK'
    },
    {
        id: 'heavyBack',
        title: 'Heavyweight Oversize DOS',
        base: "/assets/tshirt-black-NX7200-dos.png",
        ai: null,
        aiRemastered: null,
        isGenerating: false,
        view: 'back',
        garment: 'tshirt_oversize',
        mechanical: null,
        model: "/assets/models/male_tshirt_back.png",
        selected: true,
        productId: 'NX7200-BLK',
        sku: 'NX7200-BLK'
    },

    // 13 & 14: HEAVYWEIGHT OVERSIZE BLANC (NX7200-WHT)
    {
        id: 'heavyWhiteFront',
        title: 'Heavyweight Blanc FACE',
        base: "/assets/tshirt-white-NX7200.png",
        ai: null,
        aiRemastered: null,
        isGenerating: false,
        view: 'front',
        garment: 'tshirt_oversize',
        color: 'white',
        mechanical: null,
        model: "/assets/models/male_tshirt_front.png",
        selected: true,
        productId: 'NX7200-WHT',
        sku: 'NX7200-WHT'
    },
    {
        id: 'heavyWhiteBack',
        title: 'Heavyweight Blanc DOS',
        base: "/assets/tshirt-white-NX7200-dos.png",
        ai: null,
        aiRemastered: null,
        isGenerating: false,
        view: 'back',
        garment: 'tshirt_oversize',
        color: 'white',
        mechanical: null,
        model: "/assets/models/male_tshirt_back.png",
        selected: true,
        productId: 'NX7200-WHT',
        sku: 'NX7200-WHT'
    },

    // 15 & 16: T-SHIRT BLANC CLASSIQUE (JHK170-WHT)
    {
        id: 'JHK170-WHT_front',
        title: 'T-shirt Blanc FACE',
        base: "/assets/tshirt-white-JHK170.png",
        ai: null,
        aiRemastered: null,
        isGenerating: false,
        view: 'front',
        garment: 'tshirt',
        color: 'white',
        mechanical: null,
        model: "/assets/models/male_tshirt_front.png",
        selected: true,
        productId: 'jhk170-classic-tshirt-white',
        sku: 'JHK170-WHT'
    },
    {
        id: 'JHK170-WHT_back',
        title: 'T-shirt Blanc DOS',
        base: "/assets/tshirt-white-JHK170-dos.png",
        ai: null,
        aiRemastered: null,
        isGenerating: false,
        view: 'back',
        garment: 'tshirt',
        color: 'white',
        mechanical: null,
        model: "/assets/models/male_tshirt_back.png",
        selected: true,
        productId: 'jhk170-classic-tshirt-white',
        sku: 'JHK170-WHT'
    },

    // 17 & 18: POLO PREMIUM BLANC (JHK510-WHT)
    {
        id: 'JHK510-WHT_front',
        title: 'Polo Premium Blanc FACE',
        base: "/assets/polo-white-JHK510.png",
        ai: null,
        aiRemastered: null,
        isGenerating: false,
        view: 'front',
        garment: 'polo',
        color: 'white',
        mechanical: null,
        model: "/assets/models/male_polo_front.png",
        selected: true,
        productId: 'jhk510-polo-premium-white',
        sku: 'JHK510-WHT'
    },
    {
        id: 'JHK510-WHT_back',
        title: 'Polo Premium Blanc DOS',
        base: "/assets/polo-white-JHK510-dos.png",
        ai: null,
        aiRemastered: null,
        isGenerating: false,
        view: 'back',
        garment: 'polo',
        color: 'white',
        mechanical: null,
        model: "/assets/models/male_polo_back.png",
        selected: true,
        productId: 'jhk510-polo-premium-white',
        sku: 'JHK510-WHT'
    },

    // 19 & 20: HOODIE BLANC (JHK421-WHT)
    {
        id: 'JHK421-WHT_front',
        title: 'Hoodie Blanc FACE',
        base: "/assets/hoodie-white-JHK421.png",
        ai: null,
        aiRemastered: null,
        isGenerating: false,
        view: 'front',
        garment: 'sweat',
        color: 'white',
        mechanical: null,
        model: "/assets/models/male_hoodie_front.png",
        selected: true,
        productId: 'jhk421-hoodie-white',
        sku: 'JHK421-WHT'
    },
    {
        id: 'JHK421-WHT_back',
        title: 'Hoodie Blanc DOS',
        base: "/assets/hoodie-white-JHK421-dos.png",
        ai: null,
        aiRemastered: null,
        isGenerating: false,
        view: 'back',
        garment: 'sweat',
        color: 'white',
        mechanical: null,
        model: "/assets/models/male_hoodie_back.png",
        selected: true,
        productId: 'jhk421-hoodie-white',
        sku: 'JHK421-WHT'
    },

    // 21 & 22: T-SHIRT SPORT POLYESTER RESPIRANT TURQUOISE (E3520)
    {
        id: 'E3520_front',
        title: 'T-shirt Sport Polyester Respirant Interlock Face',
        base: "/assets/sport-blue-E3520.png",
        ai: null,
        aiRemastered: null,
        isGenerating: false,
        view: 'front',
        garment: 'tshirt',
        color: '#00b5e2',
        mechanical: null,
        model: "/assets/models/male_tshirt_front.png",
        selected: true,
        productId: 'prod_signaid_sportt_poly_mtzmb4zr',
        sku: 'E3520'
    },
    {
        id: 'E3520_back',
        title: 'T-shirt Sport Polyester Respirant Interlock Dos',
        base: "/assets/sport-blue-E3520-dos.png",
        ai: null,
        aiRemastered: null,
        isGenerating: false,
        view: 'back',
        garment: 'tshirt',
        color: '#00b5e2',
        mechanical: null,
        model: "/assets/models/male_tshirt_back.png",
        selected: true,
        productId: 'prod_signaid_sportt_poly_mtzmb4zr',
        sku: 'E3520'
    }
]);

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
    },
    tank_top: {
        front: { x: 0.50, y: 0.42, scale: 0.28 },
        back: { x: 0.50, y: 0.38, scale: 0.35 }
    },
    tshirt_oversize: {
        front: { x: 0.50, y: 0.40, scale: 0.28 },
        back: { x: 0.50, y: 0.39, scale: 0.36 }
    }
};
let PLACEMENTS = DEFAULT_PLACEMENTS;

const isRealImage = (url: any): boolean => {
    if (!url || typeof url !== 'string') return false;
    const trimmed = url.trim();
    if (!trimmed || trimmed.length < 10) return false;
    const lower = trimmed.toLowerCase();
    if (lower.startsWith('/merch/') || lower.startsWith('/assets/') || lower.startsWith('app_assets/public/assets/')) return false;
    if (lower.includes('/assets/tshirt-') || lower.includes('/assets/polo-') || lower.includes('/assets/hoodie-') || lower.includes('/assets/tank-') || lower.includes('/assets/sport-')) return false;
    if (lower.includes('/merch/') || lower.endsWith('.svg') || lower.includes('/catalog_mockups/')) return false;
    if ((lower.includes('jhk170') || lower.includes('jhk421') || lower.includes('jhk510') || lower.includes('bybb011') || lower.includes('nx7200') || lower.includes('e3520')) &&
        !lower.includes('firebasestorage') && !lower.startsWith('data:image')) {
        return false;
    }
    if (lower.includes('/logos/') || lower.includes('logo_') || lower.includes('_logo')) return false;
    if (trimmed.startsWith('data:image/')) return true;
    if (trimmed.startsWith('blob:')) return true;
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return true;
    return false;
};

const getResolvedMockupImage = (m: any): string | null => {
    if (!m) return null;
    const candidates = [
        m.aiRemastered,
        m.ai,
        m.imageUrl,
        m.frontImageUrl,
        m.backImageUrl,
        m.imageFront,
        m.imageBack,
        m.realAiSnapshotUrl,
        m.generatedUrl,
        m.url
    ];
    for (const cand of candidates) {
        if (cand && isRealImage(cand)) {
            return cand;
        }
    }
    return null;
};

const getResolvedMechImage = (m: any): string | null => {
    if (!m) return null;
    const candidates = [
        m.mechanical,
        m.imageBat
    ];
    for (const cand of candidates) {
        if (cand && isRealImage(cand)) {
            return cand;
        }
    }
    return null;
};

const getActivePreview = (item: any): string => {
    if (!item) return '';
    return item.aiRemastered || item.ai || item.imageUrl || item.mechanical || item.base || '';
};

const extractAllCandidateKeys = (
    uidParam?: string | null,
    slugParam?: string | null,
    auditParam?: string | null,
    extraParam?: string | null
): string[] => {
    if (typeof window === 'undefined') return [];
    const params = new URLSearchParams(window.location.search);
    const uid = uidParam !== undefined ? uidParam : params.get('uid');
    const slug = slugParam !== undefined ? slugParam : (params.get('slug') || params.get('prospect') || params.get('brand'));
    const audit = auditParam !== undefined ? auditParam : params.get('audit');
    const activeSid = typeof localStorage !== 'undefined' ? localStorage.getItem('btp_active_session_id') : null;
    const activeSlug = typeof localStorage !== 'undefined' ? localStorage.getItem('btp_active_session_slug') : null;

    // Detect path-based slugs like /portail-audit/:slug, /portail-shop/:slug, or /audit-:id
    const pathParts = window.location.pathname.split('/').filter(Boolean);
    let pathSlug: string | null = null;
    if (pathParts.length > 1 && (pathParts[0] === 'portail-audit' || pathParts[0] === 'portail-shop' || pathParts[0] === 'audit')) {
        pathSlug = pathParts[1];
    } else if (pathParts[0]?.startsWith('audit-')) {
        pathSlug = pathParts[0];
    }

    const rawCandidates: (string | null | undefined)[] = [
        uid,
        slug,
        audit,
        extraParam,
        pathSlug,
        activeSlug,
        activeSid,
    ];

    const list: (string | null | undefined)[] = [];
    for (const item of rawCandidates) {
        if (!item || typeof item !== 'string') continue;
        const trimmed = item.trim();
        if (!trimmed) continue;
        list.push(trimmed);
        list.push(trimmed.replace(/^audit-/, ''));
        list.push(`audit-${trimmed.replace(/^audit-/, '')}`);
        list.push(toKebabCaseSlug(trimmed));
        list.push(getCleanSlug(trimmed));
    }

    return Array.from(new Set(list.filter(Boolean) as string[]));
};

interface LocalMockupCacheResult {
    mergedGarmentMockups: Record<string, string>;
    cachedMockupsList: MockupItem[];
    isLocked: boolean;
    hasRealAi: boolean;
}

const readMockupCacheFromLocal = (candidateKeys: string[]): LocalMockupCacheResult => {
    if (typeof localStorage === 'undefined') {
        return { mergedGarmentMockups: {}, cachedMockupsList: [], isLocked: false, hasRealAi: false };
    }

    const mergedGarmentMockups: Record<string, string> = {};
    let cachedMockupsList: MockupItem[] = [];
    let isLocked = false;

    // Slug cible = première clé candidate (la plus spécifique)
    const targetSlug = candidateKeys[0] || '';

    // Helper: filtre une URL pour qu'elle appartienne au bon slug Firebase
    const isSlugSafeUrl = (url: string | null | undefined): boolean => {
        if (!url || typeof url !== 'string') return false;
        const lower = url.toLowerCase();
        // Data URLs et URLs non-Firebase : toujours acceptées
        if (lower.startsWith('data:image') || !lower.includes('btp_mockups/')) return true;
        // URLs Firebase : extraire le slug cible dans le path
        const match = lower.match(/btp_mockups\/([^/]+)\//);
        if (!match || !match[1]) return true; // pas de slug dans l'URL : ok
        const urlSlug = match[1].toLowerCase();
        const activeSlug = targetSlug.toLowerCase().replace(/^audit-/, '');
        if (!activeSlug) return true; // pas de slug connu : accepter
        // Rejeter si l'URL appartient à un autre slug
        return urlSlug === activeSlug || activeSlug.includes(urlSlug) || urlSlug.includes(activeSlug);
    };

    // 1. Check lock flags: btp_mockups_locked_${k}, btp_mockups_locked
    for (const k of candidateKeys) {
        if (localStorage.getItem(`btp_mockups_locked_${k}`) === 'true') {
            isLocked = true;
            break;
        }
    }
    if (!isLocked && localStorage.getItem('btp_mockups_locked') === 'true') {
        isLocked = true;
    }

    // 2. Check garment mockup maps: garmentMockups_${k}, btp_garment_mockups_${k}
    // SLUG-SPÉCIFIQUE UNIQUEMENT — pas de fallback global ici
    let hasSlugSpecificGarmentMockups = false;
    for (const k of candidateKeys) {
        const keysToTry = [
            `garmentMockups_${k}`,
            `btp_garment_mockups_${k}`,
        ];
        for (const key of keysToTry) {
            try {
                const raw = localStorage.getItem(key);
                if (raw) {
                    const parsed = JSON.parse(raw);
                    if (parsed && typeof parsed === 'object') {
                        // Filtrer : n'accepter que les URLs du bon slug
                        const filtered: Record<string, string> = {};
                        for (const [gKey, gUrl] of Object.entries(parsed)) {
                            if (typeof gUrl === 'string' && isSlugSafeUrl(gUrl)) {
                                filtered[gKey] = gUrl;
                            }
                        }
                        if (Object.keys(filtered).length > 0) {
                            Object.assign(mergedGarmentMockups, filtered);
                            hasSlugSpecificGarmentMockups = true;
                        }
                    }
                }
            } catch (e) { }
        }
    }

    // RÈGLE ABSOLUE : Fallback vers garmentMockups global INTERDIT si on a trouvé des données slug-spécifiques.
    // Autorisé uniquement en dernier recours, avec filtrage strict des URLs d'autres slugs Firebase.
    if (!hasSlugSpecificGarmentMockups) {
        try {
            const globalGm = localStorage.getItem(`garmentMockups_${targetSlug}`) ||
                             localStorage.getItem(`btp_garment_mockups_${targetSlug}`);
            // On ne lit PAS 'garmentMockups' global ici — c'est la source de contamination
            if (globalGm) {
                const parsed = JSON.parse(globalGm);
                if (parsed && typeof parsed === 'object') {
                    for (const [gKey, gUrl] of Object.entries(parsed)) {
                        if (typeof gUrl === 'string' && isSlugSafeUrl(gUrl)) {
                            mergedGarmentMockups[gKey] = gUrl;
                        }
                    }
                }
            }
        } catch (e) { }
    }

    // 3. Check mockups lists: mockups_${k} UNIQUEMENT (pas de fallback 'mockups' global)
    for (const k of candidateKeys) {
        try {
            const rawMockups = localStorage.getItem(`mockups_${k}`);
            if (rawMockups) {
                const parsed = JSON.parse(rawMockups);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    // Filtrer les mockups : n'accepter que ceux avec URLs du bon slug
                    const filtered = parsed.map((m: any) => ({
                        ...m,
                        ai: isSlugSafeUrl(m?.ai) ? m.ai : null,
                        aiRemastered: isSlugSafeUrl(m?.aiRemastered) ? m.aiRemastered : null,
                        imageUrl: isSlugSafeUrl(m?.imageUrl) ? m.imageUrl : m?.base || null,
                        frontImageUrl: isSlugSafeUrl(m?.frontImageUrl) ? m.frontImageUrl : undefined,
                        backImageUrl: isSlugSafeUrl(m?.backImageUrl) ? m.backImageUrl : undefined,
                    }));
                    cachedMockupsList = filtered;
                    const extracted = extractGarmentMockupMap(filtered);
                    // Filtrer les URLs extraites aussi
                    for (const [eKey, eUrl] of Object.entries(extracted)) {
                        if (typeof eUrl === 'string' && isSlugSafeUrl(eUrl)) {
                            mergedGarmentMockups[eKey] = eUrl;
                        }
                    }
                    break;
                }
            }
        } catch (e) { }
    }

    // INTERDIT : Fallback vers localStorage.getItem('mockups') global — source de contamination inter-sessions
    // (anciennement lignes 685-696 — supprimé définitivement)

    // Check session_obj_${k} — slug-spécifique uniquement
    for (const k of candidateKeys) {
        try {
            const rawSession = localStorage.getItem(`session_obj_${k}`);
            if (rawSession) {
                const parsed = JSON.parse(rawSession);
                if (parsed?.garmentMockups && typeof parsed.garmentMockups === 'object') {
                    for (const [gKey, gUrl] of Object.entries(parsed.garmentMockups)) {
                        if (typeof gUrl === 'string' && isSlugSafeUrl(gUrl)) {
                            mergedGarmentMockups[gKey] = gUrl;
                        }
                    }
                }
                if (cachedMockupsList.length === 0 && Array.isArray(parsed?.mockups) && parsed.mockups.length > 0) {
                    const filtered = parsed.mockups.map((m: any) => ({
                        ...m,
                        ai: isSlugSafeUrl(m?.ai) ? m.ai : null,
                        aiRemastered: isSlugSafeUrl(m?.aiRemastered) ? m.aiRemastered : null,
                        imageUrl: isSlugSafeUrl(m?.imageUrl) ? m.imageUrl : m?.base || null,
                    }));
                    cachedMockupsList = filtered;
                }
            }
        } catch (e) { }
    }

    // INTERDIT : btp_active_session_data global — source de contamination inter-sessions
    // Les données globales de session sont spécifiques à la dernière session ouverte, pas au slug courant.
    // (anciennement lignes 715-727 — supprimé définitivement)

    // 4. Direct garment keys in localStorage: btp_mockup_${garment}_${k} (slug-spécifique en priorité)
    const directGarmentKeys = [
        'tshirt_front', 'tshirt_back', 'tshirt',
        'polo_front', 'polo_back', 'polo',
        'hoodie_front', 'hoodie_back', 'hoodie',
        'sweat_front', 'sweat_back', 'sweat',
        'tank_front', 'tank_back', 'tank_white_front', 'tank_white_back', 'tank_top',
        'heavy_front', 'heavy_back', 'heavy_white_front', 'heavy_white_back', 'tshirt_oversize',
        'business_card_front', 'business_card_back', 'business_card',
        'tFront', 'tBack', 'pFront', 'pBack', 'hFront', 'hBack',
        'tankFront', 'tankBack', 'tankWhiteFront', 'tankWhiteBack', 'heavyFront', 'heavyBack',
        'heavyWhiteFront', 'heavyWhiteBack',
        'E3520_front', 'E3520_back', 'e3520_front', 'e3520_back', 'e3520Front', 'e3520Back', 'E3520',
        'sport_tshirt_front', 'sport_tshirt_back', 'sport_tshirt'
    ];

    for (const directK of directGarmentKeys) {
        if (!mergedGarmentMockups[directK]) {
            // Priorité 1 : clé slug-spécifique `btp_mockup_${garment}_${slug}`
            for (const id of candidateKeys) {
                const val = localStorage.getItem(`btp_mockup_${directK}_${id}`);
                if (val && isRealImage(val) && isSlugSafeUrl(val)) {
                    mergedGarmentMockups[directK] = val;
                    break;
                }
            }
            // Priorité 2 : clé globale `btp_mockup_${garment}` — UNIQUEMENT avec filtrage slug Firebase
            if (!mergedGarmentMockups[directK]) {
                const val = localStorage.getItem(`btp_mockup_${directK}`);
                if (val && isRealImage(val) && isSlugSafeUrl(val)) {
                    mergedGarmentMockups[directK] = val;
                }
            }
        }
    }

    const hasRealAi = Object.values(mergedGarmentMockups).some(isRealImage) ||
        cachedMockupsList.some(m => isRealImage(m?.ai) || isRealImage(m?.aiRemastered) || (isLocked && isRealImage(m?.imageUrl)));

    return { mergedGarmentMockups, cachedMockupsList, isLocked, hasRealAi };
};


const hydrateMockupsFromCache = (
    baseMockups: MockupItem[],
    mergedGarmentMockups: Record<string, string>,
    cachedMockupsList: MockupItem[]
): MockupItem[] => {
    return baseMockups.map(baseM => {
        const isBack = baseM.view === 'back' || isBackId(baseM.id);
        const savedM = cachedMockupsList.find((m: any) => m?.id && m.id.toLowerCase() === baseM.id.toLowerCase());

        let gmUrl: string | undefined = mergedGarmentMockups[baseM.id];
        if (!gmUrl) {
            if (baseM.id === 'E3520_front' || baseM.id === 'e3520_front' || baseM.sku === 'E3520') {
                gmUrl = isBack
                    ? (mergedGarmentMockups.E3520_back || mergedGarmentMockups.e3520_back || mergedGarmentMockups.e3520Back)
                    : (mergedGarmentMockups.E3520_front || mergedGarmentMockups.e3520_front || mergedGarmentMockups.e3520Front);
            } else if (baseM.garment === 'tshirt') {
                const isWhite = baseM.id?.toLowerCase().includes('white') || baseM.title?.toLowerCase().includes('blanc') || baseM.sku?.toLowerCase().includes('wht');
                gmUrl = isWhite
                    ? (isBack ? (mergedGarmentMockups.tshirt_white_back || mergedGarmentMockups.tWhiteBack) : (mergedGarmentMockups.tshirt_white_front || mergedGarmentMockups.tWhiteFront))
                    : (isBack ? (mergedGarmentMockups.tshirt_back || mergedGarmentMockups.tBack) : (mergedGarmentMockups.tshirt_front || mergedGarmentMockups.tshirt || mergedGarmentMockups.tFront));
            } else if (baseM.garment === 'polo') {
                const isWhite = baseM.id?.toLowerCase().includes('white') || baseM.title?.toLowerCase().includes('blanc') || baseM.sku?.toLowerCase().includes('wht');
                gmUrl = isWhite
                    ? (isBack ? (mergedGarmentMockups.polo_white_back || mergedGarmentMockups.pWhiteBack) : (mergedGarmentMockups.polo_white_front || mergedGarmentMockups.pWhiteFront))
                    : (isBack ? (mergedGarmentMockups.polo_back || mergedGarmentMockups.pBack) : (mergedGarmentMockups.polo_front || mergedGarmentMockups.polo || mergedGarmentMockups.pFront));
            } else if (baseM.garment === 'sweat' || (baseM.garment as string) === 'hoodie') {
                const isWhite = baseM.id?.toLowerCase().includes('white') || baseM.title?.toLowerCase().includes('blanc') || baseM.sku?.toLowerCase().includes('wht');
                gmUrl = isWhite
                    ? (isBack ? (mergedGarmentMockups.hoodie_white_back || mergedGarmentMockups.hWhiteBack) : (mergedGarmentMockups.hoodie_white_front || mergedGarmentMockups.hWhiteFront))
                    : (isBack ? (mergedGarmentMockups.hoodie_back || mergedGarmentMockups.sweat_back || mergedGarmentMockups.hBack) : (mergedGarmentMockups.hoodie_front || mergedGarmentMockups.hoodie || mergedGarmentMockups.sweat_front || mergedGarmentMockups.sweat || mergedGarmentMockups.hFront));
            } else if (baseM.garment === 'tank_top') {
                const isWhite = baseM.id?.toLowerCase().includes('white') || baseM.title?.toLowerCase().includes('blanc') || baseM.sku?.toLowerCase().includes('wht');
                gmUrl = isWhite
                    ? (isBack ? (mergedGarmentMockups.tank_white_back || mergedGarmentMockups.tankWhiteBack) : (mergedGarmentMockups.tank_white_front || mergedGarmentMockups.tankWhiteFront))
                    : (isBack ? (mergedGarmentMockups.tank_back || mergedGarmentMockups.tankBack) : (mergedGarmentMockups.tank_front || mergedGarmentMockups.tank_top || mergedGarmentMockups.tankFront));
            } else if (baseM.garment === 'tshirt_oversize') {
                const isWhite = baseM.id?.toLowerCase().includes('white') || baseM.title?.toLowerCase().includes('blanc') || baseM.sku?.toLowerCase().includes('wht');
                gmUrl = isWhite
                    ? (isBack ? (mergedGarmentMockups.heavy_white_back || mergedGarmentMockups.heavyWhiteBack) : (mergedGarmentMockups.heavy_white_front || mergedGarmentMockups.heavyWhiteFront))
                    : (isBack ? (mergedGarmentMockups.heavy_back || mergedGarmentMockups.heavyBack) : (mergedGarmentMockups.heavy_front || mergedGarmentMockups.tshirt_oversize || mergedGarmentMockups.heavyFront));
            } else if (baseM.garment === 'business_card') {
                gmUrl = isBack ? (mergedGarmentMockups.card_back || mergedGarmentMockups.business_card_back || mergedGarmentMockups.cardBack) : (mergedGarmentMockups.card_front || mergedGarmentMockups.business_card_front || mergedGarmentMockups.business_card || mergedGarmentMockups.cardFront);
            }
        }

        const savedAi = savedM?.aiRemastered || savedM?.ai || savedM?.imageUrl || (isBack ? (savedM?.backImageUrl || savedM?.imageBack) : (savedM?.frontImageUrl || savedM?.imageFront));
        const finalAi = isRealImage(gmUrl) ? gmUrl : (isRealImage(savedAi) ? savedAi : baseM.ai);

        const savedMech = savedM?.mechanical || (savedM as any)?.imageBat;
        const finalMech = isRealImage(savedMech) ? savedMech : baseM.mechanical;

        const primaryUrl = finalAi || finalMech || baseM.base;

        return {
            ...baseM,
            selected: savedM !== undefined ? (savedM.selected !== undefined ? !!savedM.selected : true) : true,
            ai: finalAi || baseM.ai,
            aiRemastered: finalAi || baseM.aiRemastered,
            mechanical: finalMech || baseM.mechanical || null,
            imageUrl: primaryUrl,
            frontImageUrl: isBack ? undefined : primaryUrl,
            backImageUrl: isBack ? primaryUrl : undefined,
            imageFront: isBack ? undefined : primaryUrl,
            imageBack: isBack ? primaryUrl : undefined
        };
    });
};

const isProductAidCustomProduct = (prod: AuditProductEntry): boolean => {
    if (!prod) return false;
    const staticBaseIds = [
        'jhk170-classic-tshirt',
        'jhk170-classic-tshirt-white',
        'jhk510-polo-premium',
        'jhk510-polo-premium-white',
        'jhk421-hoodie',
        'jhk421-hoodie-white',
        'visionroom-basic-tank',
        'visionroom-basic-tank-white',
        'visionroom-heavyweight-tee',
        'visionroom-heavyweight-tee-white',
        'prod_signaid_sportt_poly_mtzmb4zr'
    ];
    if (staticBaseIds.includes(prod.id)) return false;
    const staticSkus = [
        'JHK170-BLK', 'JHK170-WHT',
        'JHK510-BLK', 'JHK510-WHT',
        'JHK421-BLK', 'JHK421-WHT',
        'BYBB011-BLK', 'BYBB011-WHT',
        'NX7200-BLK', 'NX7200-WHT',
        'E3520'
    ];
    if (prod.sku && staticSkus.includes(prod.sku)) return false;
    return true;
};

const deriveProductAidMockups = (prod: AuditProductEntry): MockupItem[] => {
    return convertProductToMockupItems(prod) as any as MockupItem[];
};

const ensureAllBaseMockupsPresent = (currentList: MockupItem[], catalogProducts?: AuditProductEntry[]): MockupItem[] => {
    const baseList = deduplicateMockups(getBaseMockups());
    const catalog = (catalogProducts && catalogProducts.length > 0) ? catalogProducts : getLocalCustomProducts();
    const customItems: MockupItem[] = [];

    // Déduplication préalable des produits du catalogue par ID et SKU
    const seenCatalogKeys = new Set<string>();
    const cleanCatalog: AuditProductEntry[] = [];
    for (const prod of (catalog || [])) {
        if (!prod) continue;
        const key = (prod.id || prod.sku || '').toLowerCase().trim();
        if (key && !seenCatalogKeys.has(key)) {
            seenCatalogKeys.add(key);
            cleanCatalog.push(prod);
        }
    }

    for (const prod of cleanCatalog) {
        if (isProductAidCustomProduct(prod)) {
            customItems.push(...deriveProductAidMockups(prod));
        }
    }

    const allExpected = deduplicateMockups([...baseList, ...customItems]);

    // Utilisation d'un Map basé sur m.id.toLowerCase() pour garantir une unicité stricte à 100% des clés
    const map = new Map<string, MockupItem>();

    // 1. D'abord intégrer currentList en éliminant les doublons internes et en conservant les états utilisateurs
    if (Array.isArray(currentList)) {
        for (const m of currentList) {
            if (!m || !m.id) continue;
            const key = m.id.toLowerCase().trim();
            if (!map.has(key)) {
                map.set(key, m);
            } else {
                const existing = map.get(key)!;
                map.set(key, {
                    ...m,
                    ...existing,
                    ai: existing.ai || m.ai,
                    aiRemastered: existing.aiRemastered || m.aiRemastered,
                    mechanical: existing.mechanical || m.mechanical
                });
            }
        }
    }

    // 2. S'assurer que tous les gabarits attendus sont présents
    for (const exp of allExpected) {
        if (!exp || !exp.id) continue;
        const key = exp.id.toLowerCase().trim();
        if (!map.has(key)) {
            map.set(key, exp);
        } else {
            const existing = map.get(key)!;
            map.set(key, {
                ...exp,
                ...existing,
                base: existing.base || exp.base,
                model: existing.model || exp.model,
                pricing: existing.pricing || exp.pricing,
                costPriceHt: existing.costPriceHt || exp.costPriceHt,
                retailPriceTtc: existing.retailPriceTtc || exp.retailPriceTtc
            });
        }
    }

    // 3. Fusionner les alias redondants pour préserver les identifiants et SKUs distincts des variantes blanches
    // Débardeur Blanc (BYBB011-WHT)
    if (map.has('tankwhitefront') && map.has('bybb011-wht_front')) {
        const tw = map.get('tankwhitefront')!;
        const by = map.get('bybb011-wht_front')!;
        map.set('tankwhitefront', {
            ...tw,
            sku: 'BYBB011-WHT',
            productId: 'BYBB011-WHT',
            color: 'white',
            ai: tw.ai || by.ai,
            aiRemastered: tw.aiRemastered || by.aiRemastered,
            mechanical: tw.mechanical || by.mechanical
        });
        map.delete('bybb011-wht_front');
    }
    if (map.has('tankwhiteback') && map.has('bybb011-wht_back')) {
        const tw = map.get('tankwhiteback')!;
        const by = map.get('bybb011-wht_back')!;
        map.set('tankwhiteback', {
            ...tw,
            sku: 'BYBB011-WHT',
            productId: 'BYBB011-WHT',
            color: 'white',
            ai: tw.ai || by.ai,
            aiRemastered: tw.aiRemastered || by.aiRemastered,
            mechanical: tw.mechanical || by.mechanical
        });
        map.delete('bybb011-wht_back');
    }

    // Heavyweight Blanc (NX7200-WHT)
    if (map.has('heavywhitefront') && map.has('nx7200-wht_front')) {
        const hw = map.get('heavywhitefront')!;
        const nx = map.get('nx7200-wht_front')!;
        map.set('heavywhitefront', {
            ...hw,
            sku: 'NX7200-WHT',
            productId: 'NX7200-WHT',
            color: 'white',
            ai: hw.ai || nx.ai,
            aiRemastered: hw.aiRemastered || nx.aiRemastered,
            mechanical: hw.mechanical || nx.mechanical
        });
        map.delete('nx7200-wht_front');
    }
    if (map.has('heavywhiteback') && map.has('nx7200-wht_back')) {
        const hw = map.get('heavywhiteback')!;
        const nx = map.get('nx7200-wht_back')!;
        map.set('heavywhiteback', {
            ...hw,
            sku: 'NX7200-WHT',
            productId: 'NX7200-WHT',
            color: 'white',
            ai: hw.ai || nx.ai,
            aiRemastered: hw.aiRemastered || nx.aiRemastered,
            mechanical: hw.mechanical || nx.mechanical
        });
        map.delete('nx7200-wht_back');
    }

    // T-shirt Blanc (JHK170-WHT)
    if (map.has('twhitefront') && map.has('jhk170-wht_front')) {
        const tw = map.get('twhitefront')!;
        const jhk = map.get('jhk170-wht_front')!;
        map.set('jhk170-wht_front', {
            ...jhk,
            sku: 'JHK170-WHT',
            productId: 'jhk170-classic-tshirt-white',
            color: 'white',
            ai: jhk.ai || tw.ai,
            aiRemastered: jhk.aiRemastered || tw.aiRemastered,
            mechanical: jhk.mechanical || tw.mechanical
        });
        map.delete('twhitefront');
    }
    if (map.has('twhiteback') && map.has('jhk170-wht_back')) {
        const tw = map.get('twhiteback')!;
        const jhk = map.get('jhk170-wht_back')!;
        map.set('jhk170-wht_back', {
            ...jhk,
            sku: 'JHK170-WHT',
            productId: 'jhk170-classic-tshirt-white',
            color: 'white',
            ai: jhk.ai || tw.ai,
            aiRemastered: jhk.aiRemastered || tw.aiRemastered,
            mechanical: jhk.mechanical || tw.mechanical
        });
        map.delete('twhiteback');
    }

    // Polo Blanc (JHK510-WHT)
    if (map.has('pwhitefront') && map.has('jhk510-wht_front')) {
        const pw = map.get('pwhitefront')!;
        const jhk = map.get('jhk510-wht_front')!;
        map.set('jhk510-wht_front', {
            ...jhk,
            sku: 'JHK510-WHT',
            productId: 'jhk510-polo-premium-white',
            color: 'white',
            ai: jhk.ai || pw.ai,
            aiRemastered: jhk.aiRemastered || pw.aiRemastered,
            mechanical: jhk.mechanical || pw.mechanical
        });
        map.delete('pwhitefront');
    }
    if (map.has('pwhiteback') && map.has('jhk510-wht_back')) {
        const pw = map.get('pwhiteback')!;
        const jhk = map.get('jhk510-wht_back')!;
        map.set('jhk510-wht_back', {
            ...jhk,
            sku: 'JHK510-WHT',
            productId: 'jhk510-polo-premium-white',
            color: 'white',
            ai: jhk.ai || pw.ai,
            aiRemastered: jhk.aiRemastered || pw.aiRemastered,
            mechanical: jhk.mechanical || pw.mechanical
        });
        map.delete('pwhiteback');
    }

    // Hoodie Blanc (JHK421-WHT)
    if (map.has('hwhitefront') && map.has('jhk421-wht_front')) {
        const hw = map.get('hwhitefront')!;
        const jhk = map.get('jhk421-wht_front')!;
        map.set('jhk421-wht_front', {
            ...jhk,
            sku: 'JHK421-WHT',
            productId: 'jhk421-hoodie-white',
            color: 'white',
            ai: jhk.ai || hw.ai,
            aiRemastered: jhk.aiRemastered || hw.aiRemastered,
            mechanical: jhk.mechanical || hw.mechanical
        });
        map.delete('hwhitefront');
    }
    if (map.has('hwhiteback') && map.has('jhk421-wht_back')) {
        const hw = map.get('hwhiteback')!;
        const jhk = map.get('jhk421-wht_back')!;
        map.set('jhk421-wht_back', {
            ...jhk,
            sku: 'JHK421-WHT',
            productId: 'jhk421-hoodie-white',
            color: 'white',
            ai: jhk.ai || hw.ai,
            aiRemastered: jhk.aiRemastered || hw.aiRemastered,
            mechanical: jhk.mechanical || hw.mechanical
        });
        map.delete('hwhiteback');
    }

    return Array.from(map.values());
};

const GenericAuditPage: React.FC = () => {
    const navigate = useNavigate();
    const { slug: routeSlug, auditId } = useParams<{ slug?: string; auditId?: string }>();
    const hasRedirected = useRef(false);
    const isAuditPath = typeof window !== 'undefined' && window.location.pathname === '/portail-audit';
    const isHydratedFromLocalRef = useRef<boolean>(
        typeof window !== 'undefined' && typeof localStorage !== 'undefined'
            ? readMockupCacheFromLocal(extractAllCandidateKeys()).hasRealAi
            : false
    );
    const [state, setState] = useState<FlowState>(() => {
        if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
            try {
                const keys = extractAllCandidateKeys();
                const cache = readMockupCacheFromLocal(keys);
                if (cache.hasRealAi) {
                    return 'RESULT';
                }
            } catch (e) { }
        }
        return 'LANDING';
    });
    const [isLoaded, setIsLoaded] = useState(false);
    const [isInbound, setIsInbound] = useState(false);
    const [isConfigOpen, setIsConfigOpen] = useState(true);

    // MULTI-LOGO STATE
    const [logoA, setLogoA] = useState<BtpLogo>({ id: 'A', original: null, rawOriginal: null, noBg: null, isBgRemoved: false, adapted: null, remastered: null, mode: 'original' });
    const [logoB, setLogoB] = useState<BtpLogo>({ id: 'B', original: null, rawOriginal: null, noBg: null, isBgRemoved: false, adapted: null, remastered: null, mode: 'original' });
    const [logoPlacements, setLogoPlacements] = useState<Record<string, 'A' | 'B'>>({
        tFront: 'A',
        tBack: 'A',
        pFront: 'A',
        pBack: 'A',
        hFront: 'A',
        hBack: 'A',
        tankFront: 'A',
        tankBack: 'A',
        tankWhiteFront: 'A',
        tankWhiteBack: 'A',
        heavyFront: 'A',
        heavyBack: 'A',
        heavyWhiteFront: 'A',
        heavyWhiteBack: 'A',
        pWhiteFront: 'A',
        pWhiteBack: 'A',
        tWhiteFront: 'A',
        tWhiteBack: 'A',
        hWhiteFront: 'A',
        hWhiteBack: 'A',
        'JHK510-WHT_front': 'A',
        'JHK510-WHT_back': 'A',
        'JHK170-WHT_front': 'A',
        'JHK170-WHT_back': 'A',
        'JHK421-WHT_front': 'A',
        'JHK421-WHT_back': 'A',
        'BYBB011-WHT_front': 'A',
        'BYBB011-WHT_back': 'A',
        'NX7200-WHT_front': 'A',
        'NX7200-WHT_back': 'A',
        cardFront: 'A',
        cardBack: 'A',
        E3520_front: 'A',
        E3520_back: 'B',
        e3520_front: 'A',
        e3520_back: 'B'
    });

    const [logoScaleFront, setLogoScaleFront] = useState(0.14);
    const [logoScaleBack, setLogoScaleBack] = useState(0.40);
    const [isBatConfirmed, setIsBatConfirmed] = useState(false);
    const [noiseThreshold, setNoiseThreshold] = useState(5);
    const [enableThickening, setEnableThickening] = useState(false);
    const [enableStroke, setEnableStroke] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [showCropModal, setShowCropModal] = useState(false);
    const [cropTargetSlot, setCropTargetSlot] = useState<'A' | 'B'>('A');
    const [cropInitialMethod, setCropInitialMethod] = useState<'rect' | 'poly' | 'eraser'>('poly');

    const openCropModal = (targetSlot: 'A' | 'B', method: 'rect' | 'poly' | 'eraser' = 'poly') => {
        setCropTargetSlot(targetSlot);
        setCropInitialMethod(method);
        setShowCropModal(true);
    };

    const [logoAnalysis, setLogoAnalysis] = useState<any>(null);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [previewId, setPreviewId] = useState<string | null>(null);
    const [hasReferralDiscount, setHasReferralDiscount] = useState(false);

    // AUDIT PRODUCTAID CATALOG & DYNAMIC PRODUCT SELECTION
    const [auditCatalog, setAuditCatalog] = useState<AuditProductEntry[]>(() => {
        try {
            const local = getLocalCustomProducts();
            const base = AUDIT_PORTAIL_CONFIG.catalog.map(sanitizeAuditProductEntry);
            const map = new Map<string, AuditProductEntry>();
            base.forEach(p => map.set(p.id, p));
            local.forEach(p => map.set(p.id, p));
            return Array.from(map.values());
        } catch (e) {
            return AUDIT_PORTAIL_CONFIG.catalog || [];
        }
    });
    const [isLoadingCatalog, setIsLoadingCatalog] = useState<boolean>(false);
    const [isVestiaireAccordionOpen, setIsVestiaireAccordionOpen] = useState<boolean>(true);
    const [enabledProductIds, setEnabledProductIds] = useState<string[]>(() => {
        if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
            try {
                const saved = localStorage.getItem('btp_enabled_product_ids');
                if (saved) {
                    const parsed = JSON.parse(saved);
                    if (Array.isArray(parsed)) return parsed;
                }
            } catch (e) { }
        }
        return [];
    });
    const enabledProductIdsRef = useRef<string[]>(enabledProductIds);
    useEffect(() => {
        enabledProductIdsRef.current = enabledProductIds;
    }, [enabledProductIds]);

    const [mockups, setMockups] = useState<MockupItem[]>(() => {
        const getInitialMockupList = () => {
            const base = getBaseMockups();
            try {
                const local = getLocalCustomProducts();
                const customItems: MockupItem[] = [];
                for (const prod of local) {
                    if (isProductAidCustomProduct(prod)) {
                        customItems.push(...deriveProductAidMockups(prod));
                    }
                }
                return [...base, ...customItems];
            } catch (e) {
                return base;
            }
        };

        if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
            try {
                const keys = extractAllCandidateKeys();
                const cache = readMockupCacheFromLocal(keys);
                if (cache.hasRealAi) {
                    return hydrateMockupsFromCache(getInitialMockupList(), cache.mergedGarmentMockups, cache.cachedMockupsList);
                }
            } catch (e) {
                console.warn("[Audit] Initial mockups cache read error:", e);
            }
        }
        return getInitialMockupList();
    });

    const [garmentMockups, setGarmentMockups] = useState<Record<string, string>>(() => {
        if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
            try {
                const keys = extractAllCandidateKeys();
                const cache = readMockupCacheFromLocal(keys);
                if (cache.hasRealAi) {
                    return cache.mergedGarmentMockups;
                }
            } catch (e) { }
        }
        return {};
    });

    const [dynamicMockups, setDynamicMockups] = useState<any[]>(() => {
        if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
            try {
                const keys = extractAllCandidateKeys();
                const cache = readMockupCacheFromLocal(keys);
                if (cache.hasRealAi) {
                    return hydrateMockupsFromCache(ensureAllBaseMockupsPresent(getBaseMockups()), cache.mergedGarmentMockups, cache.cachedMockupsList);
                }
            } catch (e) { }
        }
        return [];
    });

    const [activeMockups, setActiveMockups] = useState<MockupItem[]>(() => {
        if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
            try {
                const keys = extractAllCandidateKeys();
                const cache = readMockupCacheFromLocal(keys);
                if (cache.hasRealAi) {
                    return hydrateMockupsFromCache(ensureAllBaseMockupsPresent(getBaseMockups()), cache.mergedGarmentMockups, cache.cachedMockupsList);
                }
            } catch (e) { }
        }
        return [];
    });
    const [activeMockupIndex, setActiveMockupIndex] = useState(0);
    const isShop = window.location.pathname.includes('portail-shop');
    const [statusMessage, setStatusMessage] = useState(isShop ? "Portail Produit V24 Actif..." : "Pipeline HD V24 Actif...");
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [stayLoggedIn, setStayLoggedIn] = useState(true);
    const [isRegenerating, setIsRegenerating] = useState(false);
    const [isSyncingShop, setIsSyncingShop] = useState(false);
    const isVisualFrozenRef = useRef(false);
    const mockupsRef = useRef<MockupItem[]>(mockups);
    useEffect(() => {
        if (!isVisualFrozenRef.current && !isSyncingShop) {
            mockupsRef.current = mockups;
        }
    }, [mockups, isSyncingShop]);
    const hasSyncedProfileRef = useRef(false);
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
    const [globalLogoColorMode, setGlobalLogoColorMode] = useState<LogoColorMode>('original');
    const [logoColorModes, setLogoColorModes] = useState<Record<string, LogoColorMode>>({});
    const SIZES = ['S', 'M', 'L', 'XL', 'XXL', '3XL'];

    const changeGlobalLogoColor = (mode: LogoColorMode) => {
        setGlobalLogoColorMode(mode);
        setLogoColorModes(prev => {
            const next: Record<string, LogoColorMode> = {};
            mockups.forEach(m => {
                next[m.id] = mode;
                for (const alias of getAliasesForPlacementId(m.id)) {
                    next[alias] = mode;
                }
            });
            return next;
        });
        setMockups(prev => prev.map(m => ({ ...m, ai: null, aiRemastered: null })));
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
        if (garment === 'business_card') return view === 'front' ? "/assets/models/card_mockup_front_neutral.png" : "/assets/models/card_mockup_back.png";
        if (garment === 'sweat' || garment === 'hoodie' || garment === 'sweatshirt') {
            return view === 'front' ? "/assets/models/male_hoodie_front.png" : "/assets/models/male_hoodie_back.png";
        }
        if (garment === 'polo') {
            return view === 'front' ? "/assets/models/male_polo_front.png" : "/assets/models/male_polo_back.png";
        }
        if (garment === 'tank_top') {
            return view === 'front' ? "/assets/models/male_tank_front.png" : "/assets/models/male_tank_back.png";
        }
        return view === 'front' ? "/assets/models/male_tshirt_front.png" : "/assets/models/male_tshirt_back.png";
    }, []);

    // HELPER: Get active logo for placement
    const getActiveLogoForPlacement = useCallback((placementId: string) => {
        const slot = resolveSlotForPlacement(placementId, logoPlacements);
        const hasLogoB = !!((logoB && logoB.original && logoB.original.trim().length > 0) || logoB?.activeUrl);
        const targetSlot = (slot === 'B' && hasLogoB) ? 'B' : 'A';
        let logo = targetSlot === 'B' ? logoB : logoA;
        if (!logo || !logo.original || logo.original.trim().length === 0) {
            logo = (logoA && logoA.original && logoA.original.trim().length > 0) ? logoA : logoB;
        }
        if (!logo || !logo.original || logo.original.trim().length === 0) return null;

        let result: string | null | undefined = null;
        if (logo.mode === 'remastered') {
            result = logo.remastered || logo.adapted || logo.original;
        } else if (logo.mode === 'original') {
            result = logo.original || logo.adapted || logo.remastered;
        } else {
            result = logo.adapted || logo.remastered || logo.original;
        }

        if (!result || result.trim().length === 0) {
            result = logo.remastered || logo.adapted || logo.original;
        }

        return (result && result.trim().length > 0) ? result : null;
    }, [logoA, logoB, logoPlacements]);

    // GESTION DU BASCULEMENT DE SLOT A/B SANS ÉCRASEMENT ET AVEC RÉACTIVITÉ IMMÉDIATE
    const handlePlacementChange = useCallback((id: string, slot: 'A' | 'B') => {
        const matchedAliases = getAliasesForPlacementId(id);
        setLogoPlacements(prev => {
            const next = { ...prev, [id]: slot };
            for (const alias of matchedAliases) {
                next[alias] = slot;
            }
            return next;
        });
        // Réinitialiser les états IA obsolètes pour que le nouveau rendu mécanique s'affiche instantanément
        setMockups(prev => prev.map(m => {
            const lowerM = (m.id || '').toLowerCase().trim();
            const isMatch = m.id === id || matchedAliases.some(a => a.toLowerCase().trim() === lowerM);
            if (isMatch) {
                return { ...m, ai: null, aiRemastered: null };
            }
            return m;
        }));

        // Déterminer le logo source actif correspondant au slot sélectionné
        const hasLogoB = !!((logoB && logoB.original && logoB.original.trim().length > 0) || logoB?.activeUrl);
        const targetSlot = (slot === 'B' && hasLogoB) ? 'B' : 'A';
        let logo = targetSlot === 'B' ? logoB : logoA;
        if (!logo || !logo.original || logo.original.trim().length === 0) {
            logo = (logoA && logoA.original && logoA.original.trim().length > 0) ? logoA : logoB;
        }

        let logoSrc: string | null = null;
        if (logo && logo.original && logo.original.trim().length > 0) {
            if (logo.mode === 'remastered') {
                logoSrc = logo.remastered || logo.adapted || logo.original;
            } else if (logo.mode === 'original') {
                logoSrc = logo.original || logo.adapted || logo.remastered;
            } else {
                logoSrc = logo.adapted || logo.remastered || logo.original;
            }
            if (!logoSrc || logoSrc.trim().length === 0) {
                logoSrc = logo.remastered || logo.adapted || logo.original;
            }
        }

        // Déclencher immédiatement generateMechanicalMockup pour mettre à jour 'mechanical' sans délai de debounce
        const currentList = (mockupsRef.current && mockupsRef.current.length > 0) ? mockupsRef.current : mockups;
        const matchingItems = currentList.filter(m => {
            const lowerM = (m.id || '').toLowerCase().trim();
            return m.id === id || matchedAliases.some(a => a.toLowerCase().trim() === lowerM);
        });

        Promise.all(matchingItems.map(async (m) => {
            const scale = m.view === 'front' ? logoScaleFront : logoScaleBack;
            const cMode = logoColorModes[m.id] || globalLogoColorMode || 'original';
            try {
                const mechanical = await generateMechanicalMockup(m.base, logoSrc || "", m.view, scale, m.garment, cMode);
                return { id: m.id, mechanical };
            } catch (e) {
                return { id: m.id, mechanical: m.mechanical };
            }
        })).then((results) => {
            setMockups(prev => {
                const updated = prev.map(m => {
                    const res = results.find(r => r.id === m.id);
                    if (res) {
                        return { ...m, mechanical: res.mechanical, ai: null, aiRemastered: null };
                    }
                    return m;
                });
                mockupsRef.current = updated;
                return updated;
            });
        });
    }, [logoA, logoB, logoColorModes, globalLogoColorMode, logoScaleFront, logoScaleBack, mockups]);

    const handleColorModeChange = useCallback((id: string, mode: LogoColorMode) => {
        const matchedAliases = getAliasesForPlacementId(id);
        setLogoColorModes(prev => {
            const next = { ...prev, [id]: mode };
            for (const alias of matchedAliases) {
                next[alias] = mode;
            }
            return next;
        });
        setMockups(prev => prev.map(m => {
            const lowerM = (m.id || '').toLowerCase().trim();
            const isMatch = m.id === id || matchedAliases.some(a => a.toLowerCase().trim() === lowerM);
            if (isMatch) {
                return { ...m, ai: null, aiRemastered: null };
            }
            return m;
        }));

        // Déclencher immédiatement generateMechanicalMockup pour mettre à jour 'mechanical' sans délai
        const currentList = (mockupsRef.current && mockupsRef.current.length > 0) ? mockupsRef.current : mockups;
        const matchingItems = currentList.filter(m => {
            const lowerM = (m.id || '').toLowerCase().trim();
            return m.id === id || matchedAliases.some(a => a.toLowerCase().trim() === lowerM);
        });

        Promise.all(matchingItems.map(async (m) => {
            const logoSrc = getActiveLogoForPlacement(m.id);
            const scale = m.view === 'front' ? logoScaleFront : logoScaleBack;
            try {
                const mechanical = await generateMechanicalMockup(m.base, logoSrc || "", m.view, scale, m.garment, mode);
                return { id: m.id, mechanical };
            } catch (e) {
                return { id: m.id, mechanical: m.mechanical };
            }
        })).then((results) => {
            setMockups(prev => {
                const updated = prev.map(m => {
                    const res = results.find(r => r.id === m.id);
                    if (res) {
                        return { ...m, mechanical: res.mechanical, ai: null, aiRemastered: null };
                    }
                    return m;
                });
                mockupsRef.current = updated;
                return updated;
            });
        });
    }, [getActiveLogoForPlacement, logoScaleFront, logoScaleBack, mockups]);

    // DYNAMIC MODELS BASED ON SECTOR
    useEffect(() => {
        if (isVisualFrozenRef.current || isSyncingShop) return;
        setMockups(prev => prev.map(m => {
            const isHoodieOrSweat = m.garment === 'sweat' || m.garment === 'hoodie' || (m.garment as string) === 'sweatshirt' ||
                m.id === 'hBack' || m.id === 'hFront' || m.id === 'hoodieBack' || m.id === 'hoodieFront' ||
                m.id === 'hoodie_white_back' || m.id === 'hoodie_white_front' || m.id === 'JHK421-WHT_back' || m.id === 'JHK421-WHT_front' ||
                m.id === 'hoodie_back' || m.id === 'hoodie_front' || m.id === 'sweat_back' || m.id === 'sweat_front' ||
                m.id.toLowerCase().includes('hoodie') || m.id.toLowerCase().includes('sweat') ||
                (m.base && (m.base.includes('hoodie') || m.base.includes('sweat') || m.base.includes('JHK421') || m.base.includes('jhk421'))) ||
                (m.title && (m.title.toLowerCase().includes('hoodie') || m.title.toLowerCase().includes('sweat')));
            if (isHoodieOrSweat) {
                return {
                    ...m,
                    model: m.view === 'back' ? "/assets/models/male_hoodie_back.png" : "/assets/models/male_hoodie_front.png"
                };
            }
            return {
                ...m,
                model: getModelForSector(m.garment, m.view, userData.activity)
            };
        }));
    }, [userData.activity, getModelForSector, isSyncingShop]);

    // REAL-TIME MECHANICAL GABARIT RE-RENDERING ON COLOR MODE / SCALE / SLOT CHANGE
    useEffect(() => {
        let isCancelled = false;
        if (isVisualFrozenRef.current || isSyncingShop) return;
        const timer = setTimeout(() => {
            const updateMechanicals = async () => {
                if (isVisualFrozenRef.current || isSyncingShop || isCancelled) return;
                const updated = await Promise.all(mockups.map(async (m) => {
                    const logoSrc = getActiveLogoForPlacement(m.id);
                    if (!logoSrc && m.garment !== 'business_card' && m.garment !== 'banner') return m;
                    const scale = m.view === 'front' ? logoScaleFront : logoScaleBack;
                    const cMode = logoColorModes[m.id] || globalLogoColorMode || 'original';
                    try {
                        const mechanical = await generateMechanicalMockup(m.base, logoSrc || "", m.view, scale, m.garment, cMode);
                        return { ...m, mechanical };
                    } catch (e) {
                        return m;
                    }
                }));
                if (!isCancelled && !isVisualFrozenRef.current && !isSyncingShop) {
                    setMockups(prev => {
                        const hasChanged = updated.some((u, idx) => u.mechanical !== prev[idx]?.mechanical);
                        if (!hasChanged) return prev;
                        const nextMockups = prev.map(p => {
                            const matching = updated.find(u => u.id === p.id);
                            if (!matching || matching.mechanical === p.mechanical) return p;
                            return { ...p, mechanical: matching.mechanical };
                        });
                        mockupsRef.current = nextMockups;
                        return nextMockups;
                    });
                }
            };
            updateMechanicals();
        }, 120);
        return () => { isCancelled = true; clearTimeout(timer); };
    }, [
        logoA.original,
        logoA.adapted,
        logoA.remastered,
        logoA.mode,
        logoB.original,
        logoB.adapted,
        logoB.remastered,
        logoB.mode,
        logoPlacements,
        logoColorModes,
        globalLogoColorMode,
        logoScaleFront,
        logoScaleBack,
        getActiveLogoForPlacement,
        mockups.length,
        isSyncingShop
    ]);

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
            await setDoc(doc(db, 'portail-config', 'placements'), PLACEMENTS);
            alert("Vault Architect: Configuration sauvegardée dans le Cloud avec succès.");
        } catch (e: any) {
            console.error("Cloud Sync Error:", e);
            alert("Erreur Cloud Sync: " + e.message);
        }
    };



    const syncProfile = async () => {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            let uid = urlParams.get('uid') || routeSlug || auditId;

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

                // Set logo state so they don't have to upload it - Raw background preserved by default!
                try {
                    const [analysis, adapted] = await Promise.all([
                        geminiService.analyzeLogoBranding(prefillLogo).catch(() => null),
                        processLogoDeterministic(prefillLogo, true, true).catch(() => prefillLogo)
                    ]);
                    setLogoA(prev => ({
                        ...prev,
                        original: prefillLogo,
                        rawOriginal: prefillLogo,
                        noBg: null,
                        isBgRemoved: false,
                        adapted: adapted || prefillLogo,
                        remastered: null,
                        mode: 'original'
                    }));
                    if (analysis) setLogoAnalysis(analysis);
                } catch (e) {
                    setLogoA(prev => ({
                        ...prev,
                        original: prefillLogo,
                        rawOriginal: prefillLogo,
                        noBg: null,
                        isBgRemoved: false,
                        adapted: prefillLogo,
                        remastered: null,
                        mode: 'original'
                    }));
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

                const profileKeys = extractAllCandidateKeys(uid);
                const localCacheCheck = readMockupCacheFromLocal(profileKeys);
                const hasLocalMockups = isHydratedFromLocalRef.current || localCacheCheck.hasRealAi;

                if (config.logoUrl) {
                    const lastSynced = localStorage.getItem(`lastSyncedLogoUrl_${uid}`);
                    const isAlreadySynced = (lastSynced === config.logoUrl) || hasLocalMockups;

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
                            step: "Chargement du logo brut (fond d'origine préservé)...",
                            phase: 2
                        }));
                        setRemasterStep("Chargement du logo brut (fond d'origine préservé)...");
                        await new Promise(r => setTimeout(r, 1500));

                        let sessionFallbackLogo = (config.logoUrl || config.auditLogoUrl || config.logo || "");
                        let candidateLogoA = (config.logoA || config.logoUrl || config.auditLogoUrl || "");
                        let isOfficialLogoA = typeof candidateLogoA === 'string' && candidateLogoA.includes('logo_A_active');

                        // Résolution synchrone immédiate du logo actif (zéro requête HEAD bloquante)
                        if (!candidateLogoA && sessionFallbackLogo) {
                            candidateLogoA = sessionFallbackLogo;
                        }

                        try {
                            if (isOfficialLogoA) {
                                setLogoA(prev => ({
                                    ...prev,
                                    original: candidateLogoA,
                                    adapted: candidateLogoA,
                                    activeUrl: candidateLogoA,
                                    remastered: null,
                                    mode: 'original'
                                }));
                                geminiService.analyzeLogoBranding(candidateLogoA).then(analysis => {
                                    if (analysis) setLogoAnalysis(analysis);
                                }).catch(() => null);
                            } else {
                                const logoToProcess = candidateLogoA || sessionFallbackLogo || config.logoUrl;
                                const [adapted, analysis] = await Promise.all([
                                    processLogoDeterministic(logoToProcess, true, true).catch(() => logoToProcess),
                                    geminiService.analyzeLogoBranding(logoToProcess).catch(() => null)
                                ]);

                                setLogoA(prev => ({
                                    ...prev,
                                    original: logoToProcess,
                                    rawOriginal: logoToProcess,
                                    noBg: null,
                                    isBgRemoved: false,
                                    adapted: adapted || logoToProcess,
                                    remastered: null,
                                    mode: 'original'
                                }));
                                if (analysis) setLogoAnalysis(analysis);
                            }

                            // 3. GÉNÉRATION DES GABARITS TECHNIQUES
                            setSyncLoader(prev => ({
                                ...prev!,
                                step: "Génération du gabarit Carte Fond Noir...",
                                phase: 3
                            }));
                            setRemasterStep("Génération du gabarit Carte de Visite (Fond Noir)...");
                            await new Promise(r => setTimeout(r, 1800));
                        } catch (err) {
                            console.warn("Deterministic processing failed, falling back to raw logoUrl:", err);
                            const fallbackUrl = candidateLogoA || sessionFallbackLogo || config.logoUrl;
                            setLogoA(prev => ({ ...prev, original: fallbackUrl, adapted: fallbackUrl, activeUrl: isOfficialLogoA ? candidateLogoA : prev.activeUrl }));
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
                        try {
                            if (isSafeStorageUrl(config.logoUrl)) {
                                safeLocalStorageSetItem(`lastSyncedLogoUrl_${uid}`, config.logoUrl);
                            }
                        } catch (e) {
                            console.warn("[Storage] lastSyncedLogoUrl save notice:", e);
                        }
                    } else {
                        // Skip loading delays and process logo instantly
                        const sessionFallbackLogo = (config.logoUrl || config.auditLogoUrl || config.logo || "");
                        let candidateLogoA = (config.logoA || config.logoUrl || config.auditLogoUrl || "");
                        let isOfficialLogoA = typeof candidateLogoA === 'string' && candidateLogoA.includes('logo_A_active');

                        // Résolution synchrone immédiate du logo actif (zéro requête HEAD bloquante)
                        if (!candidateLogoA && sessionFallbackLogo) {
                            candidateLogoA = sessionFallbackLogo;
                        }

                        try {
                            if (isOfficialLogoA) {
                                setLogoA(prev => ({
                                    ...prev,
                                    original: candidateLogoA,
                                    adapted: candidateLogoA,
                                    activeUrl: candidateLogoA,
                                    remastered: null,
                                    mode: 'original'
                                }));
                                geminiService.analyzeLogoBranding(candidateLogoA).then(analysis => {
                                    if (analysis) setLogoAnalysis(analysis);
                                }).catch(() => null);
                            } else {
                                const logoToProcess = candidateLogoA || sessionFallbackLogo || config.logoUrl;
                                const [adapted, analysis] = await Promise.all([
                                    processLogoDeterministic(logoToProcess, true, true).catch(() => logoToProcess),
                                    geminiService.analyzeLogoBranding(logoToProcess).catch(() => null)
                                ]);
                                setLogoA(prev => ({
                                    ...prev,
                                    original: logoToProcess,
                                    rawOriginal: logoToProcess,
                                    noBg: null,
                                    isBgRemoved: false,
                                    adapted: adapted || logoToProcess,
                                    remastered: null,
                                    mode: 'original'
                                }));
                                if (analysis) setLogoAnalysis(analysis);
                            }
                        } catch (err) {
                            const fallbackUrl = candidateLogoA || sessionFallbackLogo || config.logoUrl;
                            setLogoA(prev => ({ ...prev, original: fallbackUrl, adapted: fallbackUrl, activeUrl: isOfficialLogoA ? candidateLogoA : prev.activeUrl }));
                        }
                    }

                    if (!hasLocalMockups) {
                        setState('CLEAN_CHECK');
                        setIsConfigOpen(true);
                    } else {
                        setState('RESULT');
                        setIsConfigOpen(false);
                    }
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
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                console.log("Firebase Auth Connected:", user.uid);
                const uidParam = new URLSearchParams(window.location.search).get('uid') || routeSlug || auditId;
                if (uidParam) {
                    syncProfile();
                }
            } else {
                try {
                    await signInAnonymously(auth);
                } catch (authErr) {
                    console.warn("[GenericAuditPage] Anonymous signIn notice:", authErr);
                }
            }
        });
        return () => unsubscribe();
    }, [routeSlug, auditId]);

    const syncSessionToCloud = useCallback(async (
        forceCloudOrParams: boolean | SaveSessionParams = true,
        overrideMockups?: MockupItem[]
    ) => {
        if (typeof forceCloudOrParams === 'object' && forceCloudOrParams !== null) {
            return await syncSessionToCloudService(forceCloudOrParams);
        }
        const urlParams = new URLSearchParams(window.location.search);
        const targetSlug = extractRootSlug(urlParams, { slug: routeSlug, auditId }, userData, sessionId);
        let sid = sessionId;
        if (!sid || (sid.startsWith('audit-') && targetSlug && !targetSlug.startsWith('audit-'))) {
            sid = targetSlug;
            setSessionId(sid);
        }
        const currentMockups = overrideMockups || (mockupsRef.current && mockupsRef.current.length > 0 ? mockupsRef.current : mockups);

        const params: SaveSessionParams = {
            sessionId: sid,
            slug: targetSlug,
            logoA,
            logoB,
            logoPlacements,
            userData,
            mockups: currentMockups,
            logoColorModes,
            globalLogoColorMode,
            enabledProductIds: enabledProductIdsRef.current || enabledProductIds
        };

        await saveSessionLocal(params);
        const res = await syncSessionToCloudService(params);
        if (res.previewId) setPreviewId(res.previewId);
        if (res.mockups && !isVisualFrozenRef.current && !isSyncingShop) {
            const current = (mockupsRef.current && mockupsRef.current.length > 0) ? mockupsRef.current : mockups;
            const merged = ensureAllBaseMockupsPresent(mergeMockupsWithPriority(current, res.mockups), auditCatalog);
            mockupsRef.current = merged;
            setMockups(merged);
            const updatedGm = extractGarmentMockupMap(merged);
            setGarmentMockups(prevGm => ({ ...prevGm, ...updatedGm }));
            setDynamicMockups(merged);
            setActiveMockups(merged);
        }
        return res;
    }, [sessionId, routeSlug, auditId, logoA, logoB, logoPlacements, userData, mockups, logoColorModes, globalLogoColorMode, enabledProductIds, isSyncingShop, auditCatalog]);

    const handleDirectCloudSync = useCallback(async (
        lA: BtpLogo = logoA,
        lB: BtpLogo = logoB,
        placements: Record<string, 'A' | 'B'> = logoPlacements,
        uData: UserData = userData,
        currentMockups: MockupItem[] = mockups
    ) => {
        const urlParams = new URLSearchParams(window.location.search);
        const targetSlug = extractRootSlug(urlParams, { slug: routeSlug, auditId }, uData, sessionId);
        let sid = sessionId;
        if (!sid || (sid.startsWith('audit-') && targetSlug && !targetSlug.startsWith('audit-'))) {
            sid = targetSlug;
            setSessionId(sid);
        }

        const params: SaveSessionParams = {
            sessionId: sid,
            slug: targetSlug,
            logoA: lA,
            logoB: lB,
            logoPlacements: placements,
            userData: uData,
            mockups: currentMockups,
            logoColorModes,
            globalLogoColorMode,
            enabledProductIds: enabledProductIdsRef.current || enabledProductIds
        };

        await saveSessionLocal(params);
        const res = await syncSessionToCloudService(params);
        if (res.previewId) setPreviewId(res.previewId);
        if (res.mockups && !isVisualFrozenRef.current && !isSyncingShop) {
            const current = (mockupsRef.current && mockupsRef.current.length > 0) ? mockupsRef.current : mockups;
            const merged = ensureAllBaseMockupsPresent(mergeMockupsWithPriority(current, res.mockups), auditCatalog);
            mockupsRef.current = merged;
            setMockups(merged);
            const updatedGm = extractGarmentMockupMap(merged);
            setGarmentMockups(prevGm => ({ ...prevGm, ...updatedGm }));
            setDynamicMockups(merged);
            setActiveMockups(merged);
        }
        return res;
    }, [sessionId, routeSlug, auditId, logoA, logoB, logoPlacements, userData, mockups, logoColorModes, globalLogoColorMode, enabledProductIds, isSyncingShop, auditCatalog]);

    const saveSession = useCallback(async (
        lA: BtpLogo,
        lB: BtpLogo,
        placements: Record<string, 'A' | 'B'>,
        uData: UserData,
        currentMockups: MockupItem[],
        syncCloud: boolean = false,
        overrideEnabled?: string[]
    ) => {
        const urlParams = new URLSearchParams(window.location.search);
        const targetSlug = extractRootSlug(urlParams, { slug: routeSlug, auditId }, uData, sessionId);
        let sid = sessionId;
        if (!sid || (sid.startsWith('audit-') && targetSlug && !targetSlug.startsWith('audit-'))) {
            sid = targetSlug;
            setSessionId(sid);
        }

        const params: SaveSessionParams = {
            sessionId: sid,
            slug: targetSlug,
            logoA: lA,
            logoB: lB,
            logoPlacements: placements,
            userData: uData,
            mockups: currentMockups,
            logoColorModes,
            globalLogoColorMode,
            enabledProductIds: overrideEnabled || enabledProductIdsRef.current || enabledProductIds
        };

        await saveSessionLocal(params);

        if (syncCloud) {
            const res = await syncSessionToCloudService(params);
            if (res.previewId) setPreviewId(res.previewId);
            if (res.mockups && !isVisualFrozenRef.current && !isSyncingShop) {
                const current = (mockupsRef.current && mockupsRef.current.length > 0) ? mockupsRef.current : mockups;
                const merged = ensureAllBaseMockupsPresent(mergeMockupsWithPriority(current, res.mockups), auditCatalog);
                mockupsRef.current = merged;
                setMockups(merged);
                const updatedGm = extractGarmentMockupMap(merged);
                setGarmentMockups(prevGm => ({ ...prevGm, ...updatedGm }));
                setDynamicMockups(merged);
                setActiveMockups(merged);
            }
            return res;
        }
    }, [sessionId, routeSlug, auditId, logoA, logoB, logoPlacements, userData, mockups, logoColorModes, globalLogoColorMode, enabledProductIds, isSyncingShop, auditCatalog]);

    const initializeMockups = useCallback((): MockupItem[] => {
        return ensureAllBaseMockupsPresent(getBaseMockups(), auditCatalog);
    }, [auditCatalog]);

    // 0. CHARGEMENT DU CATALOGUE PRODUCTAID & INTÉGRATION DANS LES MOCKUPS D'AUDIT
    useEffect(() => {
        let isMounted = true;
        const loadCatalog = async () => {
            setIsLoadingCatalog(true);
            try {
                const merged = await getMergedAuditCatalog();
                if (!isMounted) return;
                setAuditCatalog(merged);

                // Assurer la présence des articles personnalisés dans les mockups de l'audit
                setMockups(prevMockups => {
                    const complete = ensureAllBaseMockupsPresent(prevMockups, merged);
                    let changed = complete.length !== prevMockups.length;

                    const updated = complete.map(m => {
                        const matchingProd = merged.find(p => isMockupMatchingProduct(m, p));
                        if (matchingProd && (!m.productId || !m.sku || !m.retailPriceTtc)) {
                            changed = true;
                            return {
                                ...m,
                                productId: m.productId || matchingProd.id,
                                sku: m.sku || matchingProd.sku,
                                retailPriceTtc: m.retailPriceTtc || matchingProd.pricing?.retailPriceTtc,
                                costPriceHt: m.costPriceHt || matchingProd.pricing?.costPriceHt
                            };
                        }
                        return m;
                    });

                    if (changed) {
                        mockupsRef.current = updated;
                        return updated;
                    }
                    return prevMockups;
                });
            } catch (err) {
                console.error("[Audit] Erreur chargement catalogue ProductAid:", err);
            } finally {
                if (isMounted) setIsLoadingCatalog(false);
            }
        };

        loadCatalog();
        return () => { isMounted = false; };
    }, []);

    // Synchronisation automatique des mockups quand auditCatalog change
    useEffect(() => {
        if (!auditCatalog || auditCatalog.length === 0) return;
        setMockups(prev => {
            const next = ensureAllBaseMockupsPresent(prev, auditCatalog);
            if (next.length !== prev.length || next.some((m, idx) => m.id !== prev[idx]?.id)) {
                mockupsRef.current = next;
                return next;
            }
            return prev;
        });
    }, [auditCatalog]);

    const isProductActive = useCallback((productId: string): boolean => {
        if (!enabledProductIds || enabledProductIds.length === 0) return true;
        if (enabledProductIds.includes('__none__')) return false;
        if (enabledProductIds.includes(productId)) return true;
        const prod = auditCatalog.find(p => p.id === productId || p.sku === productId);
        if (prod) {
            return enabledProductIds.includes(prod.id) || (prod.sku ? enabledProductIds.includes(prod.sku) : false);
        }
        return false;
    }, [enabledProductIds, auditCatalog]);

    const isMockupEligible = useCallback((m: MockupItem): boolean => {
        if (!enabledProductIds || enabledProductIds.length === 0) return true;
        if (enabledProductIds.includes('__none__')) return false;

        // 1. Direct match on productId or sku
        if (m.productId && enabledProductIds.includes(m.productId)) return true;
        if (m.sku && enabledProductIds.includes(m.sku)) return true;

        // 2. Match with catalog item
        const matchedProduct = auditCatalog.find(p => isMockupMatchingProduct(m, p));
        if (matchedProduct) {
            return enabledProductIds.includes(matchedProduct.id) || (matchedProduct.sku ? enabledProductIds.includes(matchedProduct.sku) : false);
        }

        // 3. Fallback matching by cleaned SKU/ID prefix
        for (const pid of enabledProductIds) {
            const cleanPid = pid.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase();
            const mId = (m.id || '').toLowerCase();
            if (mId === `${cleanPid}_front` || mId === `${cleanPid}_back` || mId === `${cleanPid}front` || mId === `${cleanPid}back` || mId.startsWith(`${cleanPid}_`)) {
                return true;
            }
        }
        return false;
    }, [enabledProductIds, auditCatalog, routeSlug, sessionId]);

    const handleToggleProduct = (productId: string) => {
        setEnabledProductIds(prev => {
            let next: string[];
            const isExplicitNone = prev && prev.length === 1 && prev[0] === '__none__';
            const cleanPrev = (prev || []).filter(id => id !== '__none__');
            const prod = auditCatalog.find(p => p.id === productId || p.sku === productId);
            const allTargetIds = [productId, ...(prod ? [prod.id, prod.sku].filter(Boolean) as string[] : [])];

            if (isExplicitNone) {
                // Si tout était décoché (__none__), activer seulement ce produit ciblé
                next = [productId];
            } else if (cleanPrev.length === 0) {
                // Par défaut tous actifs : désactiver le produit cliqué
                const allIds = auditCatalog.length > 0
                    ? auditCatalog.map(p => p.id)
                    : ['jhk170-classic-tshirt', 'jhk510-polo-premium', 'jhk421-hoodie', 'BYBB011-BLK', 'BYBB011-WHT', 'NX7200-BLK', 'NX7200-WHT', 'visionroom-basic-tank', 'visionroom-heavyweight-tee', 'visionroom-heavyweight-tee-white'];
                next = allIds.filter(id => !allTargetIds.includes(id));
                if (next.length === 0) {
                    next = ['__none__'];
                }
            } else {
                const isCurrentlyActive = allTargetIds.some(id => cleanPrev.includes(id));
                if (isCurrentlyActive) {
                    next = cleanPrev.filter(id => !allTargetIds.includes(id));
                    if (next.length === 0) {
                        next = ['__none__'];
                    }
                    for (const tid of allTargetIds) {
                        purgeMockupSlotCache(tid, sessionId, routeSlug);
                    }
                    cleanSessionCacheForSlug(routeSlug || sessionId, sessionId);
                } else {
                    next = [...cleanPrev, productId];
                }
            }

            // Synchroniser l'état 'selected' des gabarits associés aux produits modifiés
            setMockups(prevMockups => {
                const updated = prevMockups.map(m => {
                    const matched = auditCatalog.find(p => isMockupMatchingProduct(m, p));
                    if (matched) {
                        const isTarget = allTargetIds.includes(matched.id) || (matched.sku && allTargetIds.includes(matched.sku));
                        if (isTarget) {
                            const willBeActive = next.some(id => allTargetIds.includes(id) || id === matched.id || (matched.sku && id === matched.sku));
                            return { ...m, selected: willBeActive };
                        }
                    }
                    return m;
                });
                mockupsRef.current = updated;
                return updated;
            });

            try {
                safeLocalStorageSetItem('btp_enabled_product_ids', JSON.stringify(next));
                if (sessionId) safeLocalStorageSetItem(`enabled_products_${sessionId}`, JSON.stringify(next));
            } catch (e) { }

            saveSession(logoA, logoB, logoPlacements, userData, mockupsRef.current || mockups, true, next);
            return next;
        });
    };

    const handleSelectAllProducts = () => {
        const allIds = auditCatalog.map(p => p.id);
        setEnabledProductIds(allIds);
        setMockups(prevMockups => {
            const updated = prevMockups.map(m => ({ ...m, selected: true }));
            mockupsRef.current = updated;
            return updated;
        });
        try {
            safeLocalStorageSetItem('btp_enabled_product_ids', JSON.stringify(allIds));
            if (sessionId) safeLocalStorageSetItem(`enabled_products_${sessionId}`, JSON.stringify(allIds));
        } catch (e) { }
        saveSession(logoA, logoB, logoPlacements, userData, mockupsRef.current || mockups, true, allIds);
    };

    const handleDeselectAllProducts = () => {
        const noneList: string[] = ['__none__'];
        setEnabledProductIds(noneList);
        setMockups(prevMockups => {
            const updated = prevMockups.map(m => ({ ...m, selected: false }));
            mockupsRef.current = updated;
            return updated;
        });
        cleanSessionCacheForSlug(routeSlug || sessionId, sessionId);
        try {
            safeLocalStorageSetItem('btp_enabled_product_ids', JSON.stringify(noneList));
            if (sessionId) safeLocalStorageSetItem(`enabled_products_${sessionId}`, JSON.stringify(noneList));
        } catch (e) { }
        saveSession(logoA, logoB, logoPlacements, userData, mockupsRef.current || mockups, true, noneList);
    };

    useEffect(() => {
        // 0. RESTAURATION PRIORITAIRE DEPUIS LE CACHE LOCAL AU MONTAGE
        // Avant tout fetch Firestore ou initialisation de mockups par défaut,
        // vérifie si des mockups existent dans localStorage (clés btp_mockups_locked_${uid}, garmentMockups_${uid}, ou mockups_${uid}).
        const initialMountKeys = extractAllCandidateKeys();
        const initialMountCache = readMockupCacheFromLocal(initialMountKeys);
        if (initialMountCache.hasRealAi) {
            const hydrated = hydrateMockupsFromCache(getBaseMockups(), initialMountCache.mergedGarmentMockups, initialMountCache.cachedMockupsList);
            setMockups(hydrated);
            setGarmentMockups(initialMountCache.mergedGarmentMockups);
            setDynamicMockups(hydrated);
            setActiveMockups(hydrated);
            setState('RESULT');
            setIsLoaded(true);
            isHydratedFromLocalRef.current = true;
        }

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

        if (refreshParam === 'true') {
            localStorage.removeItem('btp_active_session_id');
            localStorage.removeItem('btp_active_session_slug');
            const targetSlugToPurge = routeSlug || auditId || params.get('slug') || params.get('brand') || params.get('prospect') || params.get('uid');
            if (targetSlugToPurge) {
                const clean = targetSlugToPurge.toLowerCase().trim();
                localStorage.removeItem(`btp_session_${clean}`);
                localStorage.removeItem(`session_obj_${clean}`);
                localStorage.removeItem(`meta_${clean}`);
                ensureLocalProfileSeeded(clean);
            }
        }

        const hasExplicitUrlSlug = !!(
            params.get('slug') ||
            params.get('prospect') ||
            params.get('brand') ||
            params.get('uid') ||
            params.get('audit') ||
            routeSlug ||
            auditId
        );

        let sid: string | null = null;
        if (hasExplicitUrlSlug) {
            sid = extractRootSlug(params, { slug: routeSlug, auditId }, userData, null);
        } else if (refreshParam !== 'true') {
            sid = localStorage.getItem('btp_active_session_slug') || localStorage.getItem('btp_active_session_id');
        }

        const currentIsInbound = !hasExplicitUrlSlug && !sid && lastEmail !== 'logosigneed@gmail.com';
        setIsInbound(currentIsInbound);

        if (sid) {
            const loadSessionData = async () => {
                const cleanSid = sid!.replace(/^audit-/, '');
                const sidKeys = extractAllCandidateKeys(uidParam, sid, auditId);
                const sidCache = readMockupCacheFromLocal(sidKeys);
                if (sidCache.hasRealAi && !isHydratedFromLocalRef.current) {
                    const hydrated = hydrateMockupsFromCache(getBaseMockups(), sidCache.mergedGarmentMockups, sidCache.cachedMockupsList);
                    setMockups(hydrated);
                    setGarmentMockups(sidCache.mergedGarmentMockups);
                    setDynamicMockups(hydrated);
                    setActiveMockups(hydrated);
                    setState('RESULT');
                    setIsLoaded(true);
                    isHydratedFromLocalRef.current = true;
                }

                const idbSaved = await dbGet(`session_obj_${sid}`) || (cleanSid !== sid ? await dbGet(`session_obj_${cleanSid}`) : null);
                const lsSaved = localStorage.getItem(`session_obj_${sid}`) || (cleanSid !== sid ? localStorage.getItem(`session_obj_${cleanSid}`) : null) || localStorage.getItem(`btp_session_${sid}`);
                let saved = idbSaved || lsSaved;
                let cloudDoc: any = null;

                // ALWAYS check cloud for images, even if we have local session data
                // This ensures Firebase Storage URLs for AI/mechanical images are recovered
                try {
                    let q = query(collection(db, 'btp_projects'), where('projectId', '==', sid));
                    let snap = await getDocs(q);
                    if (snap.empty && cleanSid !== sid) {
                        q = query(collection(db, 'btp_projects'), where('projectId', '==', cleanSid));
                        snap = await getDocs(q);
                    }
                    if (snap.empty) {
                        q = query(collection(db, 'btp_projects'), where('previewId', '==', sid));
                        snap = await getDocs(q);
                    }
                    if (snap.empty && cleanSid !== sid) {
                        q = query(collection(db, 'btp_projects'), where('previewId', '==', cleanSid));
                        snap = await getDocs(q);
                    }
                    if (!snap.empty) {
                        cloudDoc = snap.docs[0].data();
                    } else {
                        const prevRef = doc(db, 'anonymous_previews', sid);
                        let prevSnap = await getDoc(prevRef);
                        if (!prevSnap.exists() && cleanSid !== sid) {
                            prevSnap = await getDoc(doc(db, 'anonymous_previews', cleanSid));
                        }
                        if (prevSnap.exists()) {
                            const pData = prevSnap.data();
                            cloudDoc = {
                                userData: { companyName: pData.companyName || "", email: pData.userEmail || "" },
                                mockups: pData.items || [],
                                logoUrl: pData.logoUrl || pData.logoAdaptedUrl || ""
                            };
                        } else {
                            let siteSnap = await getDoc(doc(db, 'SiteConfigs', sid));
                            if (!siteSnap.exists() && cleanSid !== sid) {
                                siteSnap = await getDoc(doc(db, 'SiteConfigs', cleanSid));
                            }
                            if (siteSnap.exists()) {
                                const sData = siteSnap.data();
                                cloudDoc = {
                                    userData: {
                                        companyName: sData.companyName || "",
                                        email: sData.contactEmail || sData.email || "",
                                        activity: sData.activitySector || sData.activity || "",
                                        phone: sData.whatsappNumber || sData.phone || "",
                                        website: sData.websiteUrl || sData.website || "",
                                        tva: sData.vatNumber || sData.tva || ""
                                    },
                                    mockups: sData.items || sData.products || sData.mockups || [],
                                    logoUrl: sData.logoA || sData.logoUrl || sData.auditLogoUrl || "",
                                    logoA: sData.logoA || "",
                                    logoB: sData.logoB || "",
                                    logos: sData.logos || {
                                        logoA: { activeUrl: sData.logoA || sData.logoAUrl || "" },
                                        logoB: { activeUrl: sData.logoB || sData.logoBUrl || "" }
                                    }
                                };
                            }
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
                        try {
                            safeLocalStorageSetItem('btp_last_email', data.userData.email);
                        } catch (e) {
                            console.warn("[Storage] btp_last_email save notice:", e);
                        }
                        const userCredits = localStorage.getItem(`btp_credits_${data.userData.email}`);
                        if (userCredits !== null) setCredits(parseInt(userCredits));
                    }

                    const [lAOrig, lAAdapt, lARemastered, lBOrig, lBAdapt, lBRemastered] = await Promise.all([
                        dbGet(`${sid}_A_orig`), dbGet(`${sid}_A_adapt`), dbGet(`${sid}_A_remastered`),
                        dbGet(`${sid}_B_orig`), dbGet(`${sid}_B_adapt`), dbGet(`${sid}_B_remastered`)
                    ]);

                    let fallbackLogoA = data.logoA || cloudDoc?.logoA || data.logos?.logoA?.activeUrl || cloudDoc?.logos?.logoA?.activeUrl || lAAdapt || lARemastered || lAOrig || data.logoUrl || data.logos?.logoA?.adapted || data.logos?.logoA?.original || cloudDoc?.logoUrl;
                    let fallbackLogoB = data.logoB || cloudDoc?.logoB || data.logos?.logoB?.activeUrl || cloudDoc?.logos?.logoB?.activeUrl || lBAdapt || lBRemastered || lBOrig || data.logos?.logoB?.adapted || data.logos?.logoB?.original;

                    let activeUrlA = data.logos?.logoA?.activeUrl || cloudDoc?.logos?.logoA?.activeUrl || (typeof data.logoA === 'string' && data.logoA.includes('logo_A_active') ? data.logoA : null) || (typeof cloudDoc?.logoA === 'string' && cloudDoc.logoA.includes('logo_A_active') ? cloudDoc.logoA : null) || (typeof fallbackLogoA === 'string' && fallbackLogoA.includes('logo_A_active') ? fallbackLogoA : null);
                    let activeUrlB = data.logos?.logoB?.activeUrl || cloudDoc?.logos?.logoB?.activeUrl || (typeof data.logoB === 'string' && data.logoB.includes('logo_B_active') ? data.logoB : null) || (typeof cloudDoc?.logoB === 'string' && cloudDoc.logoB.includes('logo_B_active') ? cloudDoc.logoB : null) || (typeof fallbackLogoB === 'string' && fallbackLogoB.includes('logo_B_active') ? fallbackLogoB : null);

                    // Recherche active de logo_A_active.png sur Firebase Storage pour ne jamais retomber sur logo_B
                    if (!activeUrlA) {
                        const candidateSlugsA = Array.from(new Set([extractRootSlug(new URLSearchParams(window.location.search), { slug: routeSlug, auditId }, data.userData || cloudDoc?.userData, sid), sid].filter(Boolean) as string[]));
                        for (const s of candidateSlugsA) {
                            try {
                                const sRef = ref(storage, `btp_mockups/${s}/web/logo_A_active.png`);
                                const dl = await getDownloadURL(sRef);
                                if (dl) {
                                    activeUrlA = dl;
                                    break;
                                }
                            } catch (e) { }
                        }
                    }

                    const lARaw = (await dbGet(`${sid}_A_raw`)) || data.logoA_raw || data.logos?.logoA?.rawOriginal || null;
                    const lANoBg = (await dbGet(`${sid}_A_nobg`)) || data.logoA_nobg || data.logos?.logoA?.noBg || null;
                    const lBRaw = (await dbGet(`${sid}_B_raw`)) || data.logoB_raw || data.logos?.logoB?.rawOriginal || null;
                    const lBNoBg = (await dbGet(`${sid}_B_nobg`)) || data.logoB_nobg || data.logos?.logoB?.noBg || null;

                    setLogoA(prev => ({
                        ...prev,
                        original: activeUrlA || lAOrig || fallbackLogoA || null,
                        rawOriginal: lARaw || activeUrlA || lAOrig || fallbackLogoA || null,
                        noBg: lANoBg || null,
                        isBgRemoved: data.logoA_isBgRemoved ?? data.logos?.logoA?.isBgRemoved ?? false,
                        adapted: activeUrlA || lAAdapt || fallbackLogoA || null,
                        remastered: lARemastered || null,
                        activeUrl: activeUrlA || prev.activeUrl || null,
                        mode: data.logoAMode || 'original'
                    }));

                    if (fallbackLogoB) {
                        setLogoB(prev => ({
                            ...prev,
                            original: lBOrig || fallbackLogoB || null,
                            rawOriginal: lBRaw || lBOrig || fallbackLogoB || null,
                            noBg: lBNoBg || null,
                            isBgRemoved: data.logoB_isBgRemoved ?? data.logos?.logoB?.isBgRemoved ?? false,
                            adapted: lBAdapt || fallbackLogoB || null,
                            remastered: lBRemastered || null,
                            activeUrl: activeUrlB || prev.activeUrl || null,
                            mode: data.logoBMode || 'original'
                        }));
                    }

                    const rawPlacements = data.logoPlacements || cloudDoc?.logoPlacements;
                    if (rawPlacements && typeof rawPlacements === 'object') {
                        const expandedPlacements: Record<string, 'A' | 'B'> = {};
                        for (const [key, val] of Object.entries(rawPlacements)) {
                            if (val === 'A' || val === 'B') {
                                expandedPlacements[key] = val;
                                for (const alias of getAliasesForPlacementId(key)) {
                                    expandedPlacements[alias] = val;
                                }
                            }
                        }
                        setLogoPlacements(prev => ({
                            ...prev,
                            ...expandedPlacements
                        }));
                    }

                    const rawColorModes = data.logoColorModes || cloudDoc?.logoColorModes;
                    if (rawColorModes && typeof rawColorModes === 'object') {
                        const expandedModes: Record<string, LogoColorMode> = {};
                        for (const [key, val] of Object.entries(rawColorModes)) {
                            if (val) {
                                expandedModes[key] = val as LogoColorMode;
                                for (const alias of getAliasesForPlacementId(key)) {
                                    expandedModes[alias] = val as LogoColorMode;
                                }
                            }
                        }
                        setLogoColorModes(prev => ({ ...prev, ...expandedModes }));
                    }
                    if (data.globalLogoColorMode || cloudDoc?.globalLogoColorMode) {
                        setGlobalLogoColorMode(data.globalLogoColorMode || cloudDoc?.globalLogoColorMode);
                    }

                    const savedEnabled = data.enabledProductIds || cloudDoc?.enabledProductIds;
                    if (Array.isArray(savedEnabled) && savedEnabled.length > 0) {
                        setEnabledProductIds(savedEnabled);
                        safeLocalStorageSetItem('btp_enabled_product_ids', JSON.stringify(savedEnabled));
                    }

                    const baseMockups = initializeMockups();
                    const savedMockups = data.mockups || data.items || data.previews || [];
                    // Cloud mockups have Firebase Storage URLs for AI and mechanical images
                    const cloudMockups = cloudDoc?.mockups || cloudDoc?.items || [];

                    const matchMockup = (list: any[], baseM: MockupItem) => {
                        if (!Array.isArray(list)) return undefined;
                        // 1. Exact ID match (case-insensitive)
                        const exact = list.find((m: any) => m?.id && m.id.toLowerCase() === baseM.id.toLowerCase());
                        if (exact) return exact;

                        // 2. Garment + View match with white variant check
                        return list.find((m: any) => {
                            const mGarment = m?.garment || m?.type;
                            if (mGarment !== baseM.garment || m?.view !== baseM.view) return false;

                            // Distinguish black vs white variants if ID or title specifies white/blanc
                            if (baseM.garment === 'tank_top' || baseM.garment === 'tshirt_oversize') {
                                const isBaseWhite = baseM.id.toLowerCase().includes('white') || baseM.title.toLowerCase().includes('blanc');
                                const isMWhite = (m.id && m.id.toLowerCase().includes('white')) || (m.title && m.title.toLowerCase().includes('blanc'));
                                return isBaseWhite === isMWhite;
                            }
                            return true;
                        });
                    };

                    const restoredMockups = await Promise.all(baseMockups.map(async (baseM) => {
                        const savedM = matchMockup(savedMockups, baseM);
                        const cloudM = matchMockup(cloudMockups, baseM);
                        const cachedM = sidCache.cachedMockupsList?.find((m: any) => m?.id && m.id.toLowerCase() === baseM.id.toLowerCase());
                        const cachedGmUrl = sidCache.mergedGarmentMockups[baseM.id];
                        const isBack = baseM.view === 'back' || isBackId(baseM.id);

                        // Prefer fresh Firebase Storage URL from cloud over potentially stale IDB cache
                        const cloudAiUrl = cloudM?.ai || cloudM?.aiRemastered || cloudM?.imageStudio || cloudM?.imageFront || savedM?.ai || savedM?.imageStudio || savedM?.imageFront || null;
                        const isFirebaseStorageUrl = (url: any) => url && typeof url === 'string' && url.startsWith('https://firebasestorage.googleapis.com');

                        // Only read IDB if cloud doesn't have a fresh Firebase Storage URL
                        const idbAi = (!isFirebaseStorageUrl(cloudAiUrl) && (savedM?.hasAi || savedM?.ai)) ? await dbGet(`${sid}_ai_${baseM.id}`) : null;

                        const localAi = (isRealImage(cachedGmUrl) ? cachedGmUrl : null)
                            || (cachedM && isRealImage(cachedM.ai) ? cachedM.ai : null)
                            || (cachedM && isRealImage(cachedM.aiRemastered) ? cachedM.aiRemastered : null);

                        const aiVal = (isFirebaseStorageUrl(cloudAiUrl) ? cloudAiUrl : null)
                            || localAi
                            || idbAi
                            || (isRealImage(savedM?.aiRemastered) ? savedM.aiRemastered : null)
                            || (isRealImage(cloudM?.aiRemastered) ? cloudM.aiRemastered : null)
                            || (isRealImage(savedM?.ai) ? savedM.ai : null)
                            || (isRealImage(cloudM?.ai) ? cloudM.ai : null)
                            || (isRealImage(savedM?.imageUrl) ? savedM.imageUrl : null)
                            || (isRealImage(cloudM?.imageUrl) ? cloudM.imageUrl : null)
                            || (isRealImage(savedM?.url) ? savedM.url : null)
                            || (isRealImage(savedM?.generatedUrl) ? savedM.generatedUrl : null)
                            || null;

                        const idbMech = (savedM?.mechanical || savedM?.hasAi) ? await dbGet(`${sid}_mech_${baseM.id}`) : null;
                        const mechVal = idbMech || savedM?.mechanical || cloudM?.mechanical || savedM?.imageBat || cloudM?.imageBat || null;

                        const finalAi = isRealImage(aiVal) ? aiVal : (isRealImage(localAi) ? localAi : baseM.ai);
                        let finalMech = isRealImage(mechVal) ? mechVal : null;

                        // Immediate fallback generation for newly added template slots if logo is present
                        if (!finalMech && (fallbackLogoA || fallbackLogoB)) {
                            const effectiveSlot = resolveSlotForPlacement(baseM.id, data.logoPlacements);
                            const logoToRender = effectiveSlot === 'B' ? (fallbackLogoB || fallbackLogoA) : (fallbackLogoA || fallbackLogoB);
                            if (logoToRender) {
                                try {
                                    const scale = baseM.view === 'front' ? logoScaleFront : logoScaleBack;
                                    const cMode = (data.logoColorModes && data.logoColorModes[baseM.id]) || 'original';
                                    finalMech = await generateMechanicalMockup(baseM.base, logoToRender, baseM.view, scale, baseM.garment, cMode);
                                } catch (e) { }
                            }
                        }

                        const primaryUrl = finalAi || finalMech || baseM.base;

                        return {
                            ...baseM,
                            selected: savedM !== undefined ? (savedM.selected !== undefined ? !!savedM.selected : true) : true,
                            ai: finalAi,
                            aiRemastered: finalAi,
                            mechanical: finalMech,
                            imageUrl: primaryUrl,
                            frontImageUrl: isBack ? undefined : primaryUrl,
                            backImageUrl: isBack ? primaryUrl : undefined,
                            imageFront: isBack ? undefined : primaryUrl,
                            imageBack: isBack ? primaryUrl : undefined
                        };
                    }));

                    const completeMockups = ensureAllBaseMockupsPresent(restoredMockups, auditCatalog);

                    if (completeMockups.some(m => isRealImage(m.ai) || isRealImage(m.aiRemastered))) {
                        setMockups(completeMockups);
                        const fullGm = { ...extractGarmentMockupMap(completeMockups), ...sidCache.mergedGarmentMockups };
                        setGarmentMockups(fullGm);
                        setDynamicMockups(completeMockups);
                        setActiveMockups(completeMockups);
                        setState('RESULT');
                        isHydratedFromLocalRef.current = true;
                    } else if (isHydratedFromLocalRef.current) {
                        setMockups(prev => ensureAllBaseMockupsPresent(prev, auditCatalog));
                        setState('RESULT');
                    } else {
                        setMockups(completeMockups);
                        setState('RESULT');
                    }
                }
                setIsLoaded(true);
            };
            loadSessionData();
        } else {
            setIsLoaded(true);
            if (!isHydratedFromLocalRef.current) {
                syncProfile();
            } else {
                setState('RESULT');
            }
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
                    // Marge de sécurité (safe padding) de 6px pour préserver la typographie et le sous-texte fin
                    const pad = 6;
                    const safeMinX = Math.max(0, minX - pad);
                    const safeMinY = Math.max(0, minY - pad);
                    const safeMaxX = Math.min(width - 1, maxX + pad);
                    const safeMaxY = Math.min(height - 1, maxY + pad);
                    const contentWidth = safeMaxX - safeMinX + 1;
                    const contentHeight = safeMaxY - safeMinY + 1;
                    const croppedData = tempCtx.getImageData(safeMinX, safeMinY, contentWidth, contentHeight);

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
                    return [data[i], data[i + 1], data[i + 2], data[i + 3]];
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
                    const isUniformBg = corners.every(c => Math.abs(c[0] - avgR) < 30 && Math.abs(c[1] - avgG) < 30 && Math.abs(c[2] - avgB) < 30);

                    if (isBlackBg || isWhiteBg || isUniformBg) {
                        const targetR = isBlackBg ? 0 : (isWhiteBg ? 255 : Math.round(avgR));
                        const targetG = isBlackBg ? 0 : (isWhiteBg ? 255 : Math.round(avgG));
                        const targetB = isBlackBg ? 0 : (isWhiteBg ? 255 : Math.round(avgB));

                        const tolerance = isBlackBg ? 35 : (isWhiteBg ? 50 : 45);
                        let deletedPixels = 0;

                        for (let i = 0; i < data.length; i += 4) {
                            const r = data[i], g = data[i + 1], b = data[i + 2];
                            const dist = Math.sqrt(Math.pow(r - targetR, 2) + Math.pow(g - targetG, 2) + Math.pow(b - targetB, 2));
                            const isNoisyDark = isBlackBg && (r + g + b < 25);

                            if (dist < tolerance || isNoisyDark) {
                                deletedPixels++;
                            }
                        }

                        if (deletedPixels / (data.length / 4) < 0.99) {
                            for (let i = 0; i < data.length; i += 4) {
                                const r = data[i], g = data[i + 1], b = data[i + 2];
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
                        if (alpha < 80) d[i + 3] = 0; // Seuil préservant le texte fin et la typographie
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
            let targetUrl = (url || '').trim();
            if (!targetUrl) {
                reject(new Error("Empty image URL"));
                return;
            }

            if (targetUrl.startsWith('data:') || targetUrl.startsWith('blob:')) {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = () => reject(new Error("Failed to load data/blob image"));
                img.src = targetUrl;
                return;
            }

            const isLocalDev = typeof window !== 'undefined' && (
                window.location.hostname === 'localhost' ||
                window.location.hostname === '127.0.0.1' ||
                window.location.port === '3847'
            );

            // In local development, route Firebase Storage through Vite proxy to eliminate CORS completely
            if (isLocalDev && targetUrl.startsWith('https://firebasestorage.googleapis.com')) {
                targetUrl = targetUrl.replace('https://firebasestorage.googleapis.com', '/api/firebase-storage');
            } else {
                targetUrl = withCacheBust(targetUrl);
            }

            const isRemote = targetUrl.startsWith('http://') || targetUrl.startsWith('https://');

            const loadDirect = (srcUrl: string, withCrossOrigin: boolean) => {
                const img = new Image();
                if (withCrossOrigin) {
                    img.crossOrigin = 'anonymous';
                }
                const timer = setTimeout(() => {
                    img.onload = null;
                    img.onerror = null;
                    tryFallback();
                }, 10000);

                img.onload = () => {
                    clearTimeout(timer);
                    resolve(img);
                };

                img.onerror = () => {
                    clearTimeout(timer);
                    tryFallback();
                };

                img.src = srcUrl;
            };

            let fallbackAttempted = false;
            const tryFallback = async () => {
                if (fallbackAttempted || !isRemote) {
                    reject(new Error(`Failed to load image at ${url.substring(0, 100)}`));
                    return;
                }
                fallbackAttempted = true;
                try {
                    const cacheBustSep = targetUrl.includes('?') ? '&' : '?';
                    const fetchUrl = `${targetUrl}${cacheBustSep}_cb=${Date.now()}`;
                    const resp = await fetch(fetchUrl);
                    if (resp.ok) {
                        const blob = await resp.blob();
                        const blobUrl = URL.createObjectURL(blob);
                        const blobImg = new Image();
                        blobImg.onload = () => {
                            resolve(blobImg);
                        };
                        blobImg.onerror = () => reject(new Error(`Failed to load image at ${url.substring(0, 100)}`));
                        blobImg.src = blobUrl;
                        return;
                    }
                } catch (e) {
                    console.warn("[loadImage] Fallback fetch failed:", e);
                }
                reject(new Error(`Failed to load image at ${url.substring(0, 100)}`));
            };

            loadDirect(targetUrl, isRemote);
        });
    };

    const generateMechanicalMockup = async (garmentUrl: string, logoUrl: string | null, view: 'front' | 'back', customScale?: number, garmentType?: string, colorMode?: LogoColorMode) => {
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
            const imgGarment = await loadImage(garmentUrl);

            // Si aucun logo n'est fourni ou valide, retourner le vêtement de base neutre verrouillé à 1024x1024
            if (!logoUrl || logoUrl.trim().length === 0) {
                const targetSize = 1024;
                const canvas = document.createElement('canvas');
                canvas.width = targetSize;
                canvas.height = targetSize;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';
                    ctx.clearRect(0, 0, targetSize, targetSize);
                    const scaleFactor = Math.max(targetSize / imgGarment.width, targetSize / imgGarment.height);
                    const scaledW = imgGarment.width * scaleFactor;
                    const scaledH = imgGarment.height * scaleFactor;
                    const dx = (targetSize - scaledW) / 2;
                    const dy = (targetSize - scaledH) / 2;
                    ctx.drawImage(imgGarment, dx, dy, scaledW, scaledH);
                    return canvas.toDataURL('image/png', 1.0);
                }
                return garmentUrl;
            }

            const rawImgLogo = await loadImage(logoUrl);

            let imgLogo: HTMLImageElement | HTMLCanvasElement = rawImgLogo;
            if (colorMode && colorMode !== 'original') {
                const lCanvas = document.createElement('canvas');
                lCanvas.width = rawImgLogo.width;
                lCanvas.height = rawImgLogo.height;
                const lCtx = lCanvas.getContext('2d', { willReadFrequently: true })!;
                lCtx.drawImage(rawImgLogo, 0, 0);
                const lData = lCtx.getImageData(0, 0, lCanvas.width, lCanvas.height);
                const pixels = lData.data;

                if (colorMode === 'white' || colorMode === 'black') {
                    const targetRgb = colorMode === 'white' ? 255 : 0;
                    for (let i = 0; i < pixels.length; i += 4) {
                        if (pixels[i + 3] > 0) {
                            pixels[i] = targetRgb;
                            pixels[i + 1] = targetRgb;
                            pixels[i + 2] = targetRgb;
                        }
                    }
                } else if (colorMode === 'knockout_black') {
                    for (let i = 0; i < pixels.length; i += 4) {
                        const a = pixels[i + 3];
                        if (a > 0) {
                            const r = pixels[i];
                            const g = pixels[i + 1];
                            const b = pixels[i + 2];
                            const maxC = Math.max(r, g, b);
                            const k = maxC / 255.0;

                            if (k < 0.10) {
                                pixels[i + 3] = 0;
                            } else {
                                const factor = (k - 0.10) / (1.0 - 0.10);
                                pixels[i + 3] = Math.round(a * Math.pow(factor, 0.85));
                                pixels[i] = Math.min(255, Math.round(r / Math.max(0.15, factor)));
                                pixels[i + 1] = Math.min(255, Math.round(g / Math.max(0.15, factor)));
                                pixels[i + 2] = Math.min(255, Math.round(b / Math.max(0.15, factor)));
                            }
                        }
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

                // Background: Remplit 100% de la zone sans bandes de padding
                ctx.clearRect(0, 0, 1024, 1024);
                ctx.fillStyle = '#0a0a0a';
                ctx.fillRect(0, 0, 1024, 1024);

                const baseColor = assetColor || '#050505';

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
                            for (let i = -4; i <= 4; i += 8) {
                                for (let j = -6; j <= 2; j += 6) {
                                    ctx.rect(i - 1, j - 1, 2, 2);
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
                        if (text.length > maxChars) {
                            const words = text.split(' ');
                            let line = '';
                            let currentY = textY;
                            for (let i = 0; i < words.length; i++) {
                                if ((line + words[i]).length > maxChars) {
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
            const isTank = garmentUrl.includes('tank') || garmentUrl.includes('debardeur');
            const isOversize = garmentUrl.includes('oversize') || garmentUrl.includes('NX7200');
            const isHeavyWhite = isOversize && (garmentUrl.includes('white') || garmentUrl.includes('blanc'));
            const rawType = garmentType || (isPolo ? 'polo' : (isSweat ? 'sweat' : (isTank ? 'tank_top' : (isOversize ? 'tshirt_oversize' : 'tshirt'))));
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

            // DÉVERROUILLAGE PRINTABLE AREA / BOUNDING BOX DOS :
            // Permet d'accueillir le visuel complet vertical (abeille + 2 lignes de texte "CLUB VISION ROOM")
            // sans crop ni padding excessif qui forcerait un zoom destructeur.
            const maxBoxW = canvas.width * (isHeavyWhite && view === 'back' ? Math.max(scale, 0.36) : scale);
            const maxBoxH = canvas.height * (view === 'back' ? Math.min(0.48, scale * 1.35) : scale * 1.25);
            const logoRatio = imgLogo.width / imgLogo.height;

            let logoW = maxBoxW;
            let logoH = logoW / logoRatio;

            // Si le visuel est vertical (hauteur > largeur), contraindre par la hauteur max pour garantir l'intégrité du texte
            if (logoH > maxBoxH) {
                logoH = maxBoxH;
                logoW = logoH * logoRatio;
            }

            const posX = pos.x;
            const posY = (isHeavyWhite && view === 'back') ? 0.39 : pos.y;

            ctx.globalAlpha = 1.0;
            ctx.drawImage(
                imgLogo,
                (canvas.width * posX) - (logoW / 2),
                (canvas.height * posY) - (logoH / 2),
                logoW,
                logoH
            );

            // PURGE ABSOLUE TEXTE / BRANDING INVOLONTAIRE SUR LE TEXTILE (garmentPreview) :
            // Strictement AUCUN fillText, strokeText ou dessin textuel (companyName, prospectName, slug, title, uid) n'est injecté sur le textile.
            // Le vêtement source envoyé à l'IA ne contient strictement que le fichier graphique du logo (ex: l'abeille) centré sur le textile, sans aucun lettrage ajouté par le code.

            // 5. EXPORT AT UNIFIED SQUARE (1024x1024)
            const targetSize = 1024;
            const exportCanvas = document.createElement('canvas');
            exportCanvas.width = targetSize;
            exportCanvas.height = targetSize;
            const exportCtx = exportCanvas.getContext('2d')!;

            // CRITICAL: Force high-quality interpolation for the final downscale
            exportCtx.imageSmoothingEnabled = true;
            exportCtx.imageSmoothingQuality = 'high';

            // Fond du canvas transparent sans bandes de padding blanches
            exportCtx.clearRect(0, 0, targetSize, targetSize);

            // Remplir 100% de la zone 1024x1024 sans bandes de padding blanches
            const scaleFactor = Math.max(targetSize / canvas.width, targetSize / canvas.height);
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

    // ALIASES STRICTS POUR LE RENDU ET LA CAPTURE DES GABARITS TECHNIQUES
    // Garantit l'absence totale de tout lettrage ou typo automatique sur le textile source
    const drawGarment = generateMechanicalMockup;
    const renderMockupToCanvas = generateMechanicalMockup;
    const captureGarmentPreview = generateMechanicalMockup;

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
                const isPng = base64.startsWith('data:image/png') || base64.toLowerCase().includes('.png');
                const mime = isPng ? 'image/png' : 'image/jpeg';
                resolve(canvas.toDataURL(mime, isPng ? 1.0 : 0.85));
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

    const localAssetBase64Cache = useRef<Map<string, string>>(new Map());

    const fetchBase64 = async (url: string, retries = 2): Promise<string> => {
        if (!url) throw new Error("URL vide");
        if (url.startsWith('data:image') || url.startsWith('data:')) {
            return url;
        }
        if (localAssetBase64Cache.current.has(url)) {
            return localAssetBase64Cache.current.get(url)!;
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
                const dataUrl = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                });
                if (url.startsWith('/') || url.includes('/assets/')) {
                    localAssetBase64Cache.current.set(url, dataUrl);
                }
                return dataUrl;
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

    const addLog = (msg: string) => setAuditLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`].slice(-8));

    const startSequentialPipeline = async (
        customUserData?: UserData,
        singleId?: string,
        initialMockups?: MockupItem[],
        overrideLogoA?: BtpLogo,
        overrideLogoB?: BtpLogo
    ) => {
        // Guarantee anonymous authentication before executing the pipeline
        if (!auth.currentUser) {
            try {
                await signInAnonymously(auth);
                console.log("[GenericAuditPage] Anonymous auth ensured before pipeline:", auth.currentUser?.uid);
            } catch (authErr) {
                console.warn("[GenericAuditPage] Anonymous signIn notice before pipeline:", authErr);
            }
        }

        const candidatePipelineItems = initialMockups || mockupsRef.current || mockups;
        const selectedGarmentsForLog = candidatePipelineItems?.filter(x => x.selected);
        console.log("[DEBUG_START_SEQUENTIAL_PIPELINE] Entrée dans le pipeline", {
            itemsToProcess: selectedGarmentsForLog?.length,
            singleId
        });
        const uidParam = new URLSearchParams(window.location.search).get('uid');
        const u = customUserData || userData;
        let currentLocalMockups = initialMockups || mockups;

        // MANNEQUIN CONSISTENCY: Universal male studio model with dark hair and natural uncovered face (strictly NO sunglasses)
        const getMannequinProfile = (view?: string) => {
            if (view === 'back') {
                return "A professional male studio model with dark hair seen strictly from behind (180-degree rear view, facing directly away from the camera), clean centered posture with exposed natural neck, strictly NO sunglasses visible, NO glasses temples or arms extending around the ears or neck, NO parasite accessories, standing in a clean, minimalist neutral light-gray photo studio";
            }
            return "A professional male studio model with dark hair, natural uncovered face and neutral studio gaze, strictly NO sunglasses, NO glasses, standing in a clean, minimalist neutral light-gray photo studio";
        };
        const consistentMannequinDesc = getMannequinProfile();

        const updateItem = (id: string, ai: string | null, loading: boolean, mechanical?: string | null) => {
            const currentList = (mockupsRef.current && mockupsRef.current.length > 0) ? mockupsRef.current : mockups;
            const now = Date.now();
            const currentUrlParams = new URLSearchParams(window.location.search);
            const targetSlug = extractRootSlug(currentUrlParams, { slug: routeSlug, auditId }, u, sessionId);

            const next = currentList.map(it => {
                if (it.id === id) {
                    const isBack = it.view === 'back' || isBackId(it.id);

                    if (loading) {
                        const loadingImg = it.base;
                        return {
                            ...it,
                            ai: null,
                            aiRemastered: null,
                            imageUrl: loadingImg,
                            frontImageUrl: isBack ? undefined : loadingImg,
                            backImageUrl: isBack ? loadingImg : undefined,
                            imageFront: isBack ? undefined : loadingImg,
                            imageBack: isBack ? loadingImg : undefined,
                            isGenerating: true,
                            isFresh: false,
                            mechanical: mechanical !== undefined ? mechanical : it.mechanical
                        };
                    }

                    // Prise en compte immédiate du flux IA (Base64 direct ou URL Cloud)
                    const resolvedAi = (ai && isRealImage(ai)) ? ai : null;
                    const newMech = mechanical !== undefined ? mechanical : it.mechanical;
                    const primary = resolvedAi || newMech || it.base;
                    const isFresh = Boolean(resolvedAi);

                    return {
                        ...it,
                        ai: resolvedAi,
                        aiRemastered: resolvedAi,
                        imageUrl: primary,
                        frontImageUrl: isBack ? undefined : primary,
                        backImageUrl: isBack ? primary : undefined,
                        imageFront: isBack ? undefined : primary,
                        imageBack: isBack ? primary : undefined,
                        isGenerating: false,
                        isFresh,
                        timestamp: now,
                        generatedAt: now,
                        mechanical: newMech
                    };
                }
                return it;
            });

            // 1. Mise à jour synchrone immédiate des références et states React
            mockupsRef.current = next;
            setMockups(next);
            const updatedGm = extractGarmentMockupMap(next);
            setGarmentMockups(prevGm => ({ ...prevGm, ...updatedGm }));
            setDynamicMockups(next);
            setActiveMockups(next);

            if (ai && isRealImage(ai)) {
                isHydratedFromLocalRef.current = true;

                // 2. Verrouillage du cache local immédiat pour bloquer tout retour au gabarit plat
                try {
                    localStorage.setItem(`btp_mockup_${id}_${targetSlug}`, ai);
                    localStorage.setItem(`btp_mockup_${id}`, ai);
                    localStorage.setItem(`btp_mockups_locked_${targetSlug}`, 'true');
                    sessionStorage.setItem(`audit_preview_${targetSlug}_${id}`, ai);
                } catch (e) {
                    // Quota dépassé, non bloquant
                }

                // 3. Upload Firebase Storage en arrière-plan (remplace le Base64 par l'URL dès que prêt)
                if (ai.startsWith('data:') || (ai.length > 50 && !ai.startsWith('http') && !ai.startsWith('/'))) {
                    const storagePath = `btp_mockups/${targetSlug}/web/${id}.png`;
                    uploadBase64ToStorage(ai, storagePath).then(uploadedUrl => {
                        if (uploadedUrl && (uploadedUrl.startsWith('http://') || uploadedUrl.startsWith('https://'))) {
                            console.log(`[STORAGE] Upload réussi en tâche de fond pour ${id}: ${uploadedUrl}`);
                            const inPlace = (mockupsRef.current || []).map(m => m.id === id ? {
                                ...m,
                                ai: uploadedUrl,
                                aiRemastered: uploadedUrl,
                                imageUrl: uploadedUrl,
                                ...(m.view === 'back' ? { backImageUrl: uploadedUrl, imageBack: uploadedUrl } : { frontImageUrl: uploadedUrl, imageFront: uploadedUrl })
                            } : m);
                            mockupsRef.current = inPlace;
                            setMockups(inPlace);
                        }
                    }).catch(e => console.warn(`[STORAGE] Échec upload background pour ${id}:`, e));
                }
            }

            saveSession(overrideLogoA || logoA, overrideLogoB || logoB, logoPlacements, u, next);
            return next;
        };

        const getLogoToUse = (placementId: string) => {
            const baseLogoA = overrideLogoA || logoA;
            const baseLogoB = overrideLogoB || logoB;
            // Règle stricte: Slot A par défaut pour tout vêtement/produit (face avant, poitrine, dos).
            // Ne basculer sur 'B' QUE si l'utilisateur a explicitement assigné le Slot B à ce produit précis.
            const isExplicitSlotB = resolveSlotForPlacement(placementId, logoPlacements) === 'B';
            const hasLogoB = !!((baseLogoB && baseLogoB.original && baseLogoB.original.trim().length > 0) || (logoB && logoB.original && logoB.original.trim().length > 0) || baseLogoB?.activeUrl);
            const slot = (isExplicitSlotB && hasLogoB) ? 'B' : 'A';

            // Priorité 1 : Le slot cible demandé
            let targetLogo = slot === 'B' ? baseLogoB : baseLogoA;

            // Si le slot cible n'a pas de logo ou qu'il est vide, basculer sur l'autre slot
            if (!targetLogo || !targetLogo.original || targetLogo.original.trim().length === 0) {
                targetLogo = (baseLogoA && baseLogoA.original && baseLogoA.original.trim().length > 0) ? baseLogoA : baseLogoB;
            }

            if (!targetLogo || !targetLogo.original || targetLogo.original.trim().length === 0) {
                targetLogo = (baseLogoB && baseLogoB.original && baseLogoB.original.trim().length > 0) ? baseLogoB : baseLogoA;
            }

            // Si même l'autre slot est vide ou absent, retourner null
            if (!targetLogo || !targetLogo.original || targetLogo.original.trim().length === 0) {
                return null;
            }

            // Déterminer la version selon le mode avec fallback interne
            let result: string | null | undefined = null;
            if (targetLogo.mode === 'remastered') {
                result = targetLogo.remastered || targetLogo.adapted || targetLogo.original;
            } else if (targetLogo.mode === 'original') {
                result = targetLogo.original || targetLogo.adapted || targetLogo.remastered;
            } else {
                result = targetLogo.adapted || targetLogo.remastered || targetLogo.original;
            }

            // Fallback de sécurité ultime
            if (!result || result.trim().length === 0) {
                result = targetLogo.remastered || targetLogo.adapted || targetLogo.original;
            }

            // Si toujours vide après sélection, tenter une dernière fois de puiser dans le slot A ou B
            if ((!result || result.trim().length === 0) && baseLogoA && baseLogoA.original) {
                result = baseLogoA.remastered || baseLogoA.adapted || baseLogoA.original;
            }
            if ((!result || result.trim().length === 0) && baseLogoB && baseLogoB.original) {
                result = baseLogoB.remastered || baseLogoB.adapted || baseLogoB.original;
            }

            return (result && result.trim().length > 0) ? result : null;
        };

        try {
            // V24 DYNAMIC PIPELINE: Autorise la génération dès qu'au moins 1 élément/vue est sélectionné (selectedGarments.length >= 1)
            const resolvedItems = (currentLocalMockups && currentLocalMockups.some(x => x.selected))
                ? currentLocalMockups
                : ((mockupsRef.current && mockupsRef.current.some(x => x.selected))
                    ? mockupsRef.current
                    : mockups);
            currentLocalMockups = resolvedItems;

            // Restreindre la liste des articles injectés dans le pipeline de génération séquentielle IA uniquement aux produits dont l'ID est coché dans 'enabledProductIds'.
            // Si 'enabledProductIds' est vide ou absent, maintenir les produits par défaut existants (comportement rétrocompatible).
            const currentEnabled = (enabledProductIdsRef.current && enabledProductIdsRef.current.length > 0)
                ? enabledProductIdsRef.current
                : enabledProductIds;

            const currentUrlParams = new URLSearchParams(window.location.search);
            const currentSlug = extractRootSlug(currentUrlParams, { slug: routeSlug, auditId }, u, sessionId);

            const isPipelineItemEligible = (m: MockupItem): boolean => {
                if (!currentEnabled || currentEnabled.length === 0) return true; // rétrocompatible
                const mId = (m.id || '').toLowerCase();
                const mSku = (m.sku || '').toUpperCase();
                const mProdId = (m.productId || '').toLowerCase();
                if (currentEnabled.some(e => e.toLowerCase() === mId || e.toUpperCase() === mSku || e.toLowerCase() === mProdId)) return true;
                if (m.productId && currentEnabled.includes(m.productId)) return true;
                const matched = auditCatalog.find(p => isMockupMatchingProduct(m, p));
                if (matched) return currentEnabled.includes(matched.id);
                return false;
            };

            const eligibleGarments = (!currentEnabled || currentEnabled.length === 0)
                ? currentLocalMockups
                : currentLocalMockups.filter(isPipelineItemEligible);

            const selectedGarments = eligibleGarments.filter(x => x.selected);

            if (!singleId && (!selectedGarments || selectedGarments.length < 1)) {
                console.warn("[ABORT_REASON]", "startSequentialPipeline: Aucun gabarit éligible sélectionné (selectedGarments < 1). Au moins 1 élément ou vue est requis.");
                return;
            }

            // GÉNÉRATION INCRÉMENTALE PROPRE :
            // Si singleId n'est pas fourni (génération du vestiaire sélectionné),
            // n'exécuter l'appel IA QUE pour les mockups cochés qui n'ont PAS encore d'image mannequin studio générée.
            // Si l'utilisateur clique explicitement sur régénérer (singleId fourni), régénérer cet item précis.
            const itemsToProc = singleId
                ? currentLocalMockups.filter(x => x.id === singleId)
                : selectedGarments.filter(x => {
                    const hasAi = isRealAiImage(x.ai) || isRealAiImage((x as any).aiRemastered);
                    return !hasAi;
                });

            console.log(`[PIPELINE_QUEUE] ${itemsToProc.length} item(s) à générer sur ${selectedGarments.length} sélectionné(s) (singleId: ${singleId || 'none'}).`);

            if (!singleId && itemsToProc.length === 0) {
                addLog("Tous les gabarits sélectionnés disposent déjà d'un mannequin studio généré.");
                setIsRegenerating(false);
                setState('AUDIT');
                return;
            }

            // Filtre anti-parasite : Interdiction formelle de substituer le logo actif par celui d'un tiers (ex: clubvisionroom)
            const isParasiticClubVisionLogo = (url: string | null | undefined, slug: string, sid?: string | null): boolean => {
                if (!url || typeof url !== 'string') return false;
                const isVisionSlug = slug === 'clubvisionroom' || slug === 'clubvision' || slug === 'mt074jnaldxn' || (sid && (sid === 'clubvisionroom' || sid === 'clubvision'));
                if (isVisionSlug) return false;
                const lower = url.toLowerCase();
                return lower.includes('clubvisionroom') || lower.includes('mt074jnaldxn') || lower.includes('logo_clubvision');
            };

            // Helper: résolution stricte de l'URL du logo pour le pipeline IA (Prendre EXCLUSIVEMENT le logo du profil actif)
            const resolvePipelineLogoUrl = async (
                targetSlot: 'A' | 'B',
                targetLogo: BtpLogo | null,
                baseLogoA: BtpLogo | null,
                baseLogoB: BtpLogo | null,
                currentSlug: string,
                sessionId?: string | null
            ): Promise<string> => {
                let resolvedUrl: string = "";

                // 1. Direct activeUrl if present and matches targetSlot
                if (targetLogo?.activeUrl && typeof targetLogo.activeUrl === 'string' && targetLogo.activeUrl.startsWith('http') && targetLogo.activeUrl.includes(`logo_${targetSlot}_active`)) {
                    if (!isParasiticClubVisionLogo(targetLogo.activeUrl, currentSlug, sessionId)) {
                        resolvedUrl = targetLogo.activeUrl;
                    }
                }

                // 2. Candidate from targetLogo (mode: remastered / adapted / original) if it matches targetSlot
                if (!resolvedUrl && targetLogo) {
                    const candidate = targetLogo.mode === 'remastered'
                        ? (targetLogo.remastered || targetLogo.adapted || targetLogo.original)
                        : (targetLogo.mode === 'adapted' ? (targetLogo.adapted || targetLogo.remastered || targetLogo.original) : (targetLogo.original || targetLogo.adapted || targetLogo.remastered));
                    if (candidate && typeof candidate === 'string' && candidate.startsWith('http') && candidate.includes(`logo_${targetSlot}_active`)) {
                        if (!isParasiticClubVisionLogo(candidate, currentSlug, sessionId)) {
                            resolvedUrl = candidate;
                        }
                    }
                }

                // 3. Query Firebase Storage for btp_mockups/${slug}/web/logo_${targetSlot}_active.png (Strictement le slug ou session courant)
                const candidateSlugs = Array.from(new Set([currentSlug, sessionId].filter(Boolean) as string[]));
                if (!resolvedUrl || (targetSlot === 'A' && !resolvedUrl.includes('logo_A_active'))) {
                    for (const s of candidateSlugs) {
                        try {
                            const storageRef = ref(storage, `btp_mockups/${s}/web/logo_${targetSlot}_active.png`);
                            const dlUrl = await getDownloadURL(storageRef);
                            if (dlUrl && !isParasiticClubVisionLogo(dlUrl, currentSlug, sessionId)) {
                                resolvedUrl = dlUrl;
                                if (targetSlot === 'A' && baseLogoA) baseLogoA.activeUrl = dlUrl;
                                if (targetSlot === 'B' && baseLogoB) baseLogoB.activeUrl = dlUrl;
                                break;
                            }
                        } catch (sErr) {
                            // Storage lookup catch
                        }
                    }
                }

                // 4. If still not in storage and base64 is available, upload directly to ensure logo_${targetSlot}_active.png exists
                // SÉCURITÉ : Ne JAMAIS écraser logo_A_active.png si le fichier existe déjà sur Firebase Storage
                if (!resolvedUrl && targetLogo) {
                    const targetUploadSlug = currentSlug || sessionId || 'default';
                    let alreadyExists = false;
                    try {
                        const checkRef = ref(storage, `btp_mockups/${targetUploadSlug}/web/logo_${targetSlot}_active.png`);
                        const existingDlUrl = await getDownloadURL(checkRef);
                        if (existingDlUrl && !isParasiticClubVisionLogo(existingDlUrl, currentSlug, sessionId)) {
                            resolvedUrl = existingDlUrl;
                            alreadyExists = true;
                            if (targetSlot === 'A' && baseLogoA) baseLogoA.activeUrl = existingDlUrl;
                            if (targetSlot === 'B' && baseLogoB) baseLogoB.activeUrl = existingDlUrl;
                        }
                    } catch (checkErr) {
                        alreadyExists = false;
                    }

                    if (!alreadyExists) {
                        const rawData = targetLogo.mode === 'remastered'
                            ? (targetLogo.remastered || targetLogo.adapted || targetLogo.original)
                            : (targetLogo.mode === 'adapted' ? (targetLogo.adapted || targetLogo.remastered || targetLogo.original) : (targetLogo.original || targetLogo.adapted || targetLogo.remastered));

                        if (rawData && typeof rawData === 'string' && (rawData.startsWith('data:') || rawData.length > 50) && !rawData.startsWith('http')) {
                            if (!isParasiticClubVisionLogo(rawData, currentSlug, sessionId)) {
                                try {
                                    const storagePath = `btp_mockups/${targetUploadSlug}/web/logo_${targetSlot}_active.png`;
                                    const storageRef = ref(storage, storagePath);
                                    let dataUrl = rawData.trim();
                                    if (!dataUrl.startsWith('data:')) {
                                        dataUrl = `data:image/png;base64,${dataUrl}`;
                                    }
                                    const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,/);
                                    const contentType = match ? match[1] : 'image/png';
                                    const metadata: UploadMetadata = {
                                        contentType,
                                        cacheControl: 'public, max-age=3600, must-revalidate'
                                    };
                                    await uploadString(storageRef, dataUrl, 'data_url', metadata);
                                    const dlUrl = await getDownloadURL(storageRef);
                                    if (dlUrl && !isParasiticClubVisionLogo(dlUrl, currentSlug, sessionId)) {
                                        resolvedUrl = dlUrl;
                                        if (targetSlot === 'A' && baseLogoA) baseLogoA.activeUrl = dlUrl;
                                        if (targetSlot === 'B' && baseLogoB) baseLogoB.activeUrl = dlUrl;
                                    }
                                } catch (uErr) {
                                    console.warn(`[PIPELINE_LOGO] Upload failed for logo_${targetSlot}_active.png:`, uErr);
                                }
                            }
                        }
                    }
                }

                // 5. Strict safety check: If targetSlot is 'A', under NO circumstance allow logo_B_active.png!
                if (targetSlot === 'A' && (!resolvedUrl || resolvedUrl.includes('logo_B_active'))) {
                    console.warn(`[PIPELINE_LOGO] Avertissement: Résolution Slot A invalide ou logo_B_active détecté. Basculement forcé vers logo_A_active.png`);
                    let corrected = false;
                    for (const s of candidateSlugs) {
                        try {
                            const storageRefA = ref(storage, `btp_mockups/${s}/web/logo_A_active.png`);
                            const dlUrlA = await getDownloadURL(storageRefA);
                            if (dlUrlA && !isParasiticClubVisionLogo(dlUrlA, currentSlug, sessionId)) {
                                resolvedUrl = dlUrlA;
                                if (baseLogoA) baseLogoA.activeUrl = dlUrlA;
                                corrected = true;
                                break;
                            }
                        } catch (errA) { }
                    }
                    if (!corrected && resolvedUrl && !isParasiticClubVisionLogo(resolvedUrl, currentSlug, sessionId)) {
                        resolvedUrl = resolvedUrl.replace(/logo_B_active/g, 'logo_A_active');
                    }
                }

                // 6. Strict safety check: If targetSlot is 'B' and resolvedUrl includes logo_A_active
                if (targetSlot === 'B' && resolvedUrl && resolvedUrl.includes('logo_A_active')) {
                    let corrected = false;
                    for (const s of candidateSlugs) {
                        try {
                            const storageRefB = ref(storage, `btp_mockups/${s}/web/logo_B_active.png`);
                            const dlUrlB = await getDownloadURL(storageRefB);
                            if (dlUrlB && !isParasiticClubVisionLogo(dlUrlB, currentSlug, sessionId)) {
                                resolvedUrl = dlUrlB;
                                corrected = true;
                                break;
                            }
                        } catch (errB) { }
                    }
                    if (!corrected && resolvedUrl && !isParasiticClubVisionLogo(resolvedUrl, currentSlug, sessionId)) {
                        resolvedUrl = resolvedUrl.replace(/logo_A_active/g, 'logo_B_active');
                    }
                }

                // 7. Fallback to candidate / raw if storage was unavailable
                if (!resolvedUrl && targetLogo) {
                    const rawCandidate = (targetLogo.mode === 'remastered'
                        ? (targetLogo.remastered || targetLogo.adapted || targetLogo.original)
                        : (targetLogo.mode === 'adapted' ? (targetLogo.adapted || targetLogo.remastered || targetLogo.original) : (targetLogo.original || targetLogo.adapted || targetLogo.remastered))) || "";
                    if (!isParasiticClubVisionLogo(rawCandidate, currentSlug, sessionId)) {
                        resolvedUrl = rawCandidate;
                    }
                }

                if (isParasiticClubVisionLogo(resolvedUrl, currentSlug, sessionId)) {
                    resolvedUrl = "";
                }

                return resolvedUrl;
            };

            addLog(`DÉMARRAGE PIPELINE : ${itemsToProc.length} ITEM(S) SÉLECTIONNÉ(S).`);

            for (const it of itemsToProc) {
                console.log(`[DEBUG_PIPELINE_ITEM] Traitement de l'item: ${it.id}`, it);
                console.log(`[DEBUG_PIPELINE_FORCING_RUN] Forçage régénération pour ${it.id} (hasAi=${!!it.ai}, hasAiRemastered=${!!it.aiRemastered}, hasImageUrl=${!!it.imageUrl})`);

                // Synchroniser activeMockupIndex pour que l'aperçu central suive l'élément en cours de traitement
                const procIdx = (mockupsRef.current || mockups).findIndex(x => x.id === it.id);
                if (procIdx !== -1) {
                    setActiveMockupIndex(procIdx);
                }

                try {
                    // 1. Purge slot cache across localStorage, sessionStorage, and IndexedDB as generation starts
                    const currentUrlParams = new URLSearchParams(window.location.search);
                    const currentSlug = extractRootSlug(currentUrlParams, { slug: routeSlug, auditId }, u, sessionId);
                    await purgeMockupSlotCache(it.id, sessionId, currentSlug);

                    const baseLogoA = overrideLogoA || logoA;
                    const baseLogoB = overrideLogoB || logoB;
                    // RÈGLE STRICTE PIPELINE TRY-ON :
                    // Slot A par défaut pour tout vêtement/produit (face avant, poitrine, dos).
                    // Ne basculer sur le Slot B QUE si l'utilisateur a explicitement assigné le Slot B à ce produit précis.
                    const isExplicitSlotB = resolveSlotForPlacement(it.id, logoPlacements) === 'B';
                    const hasLogoB = !!((baseLogoB && baseLogoB.original && baseLogoB.original.trim().length > 0) || (logoB && logoB.original && logoB.original.trim().length > 0) || baseLogoB?.activeUrl);
                    const targetSlot: 'A' | 'B' = (isExplicitSlotB && hasLogoB) ? 'B' : 'A';

                    let targetLogo = targetSlot === 'B' ? baseLogoB : baseLogoA;
                    if (!targetLogo || !targetLogo.original || targetLogo.original.trim().length === 0) {
                        targetLogo = (baseLogoA && baseLogoA.original && baseLogoA.original.trim().length > 0) ? baseLogoA : baseLogoB;
                    }
                    if (!targetLogo || !targetLogo.original || targetLogo.original.trim().length === 0) {
                        targetLogo = (baseLogoB && baseLogoB.original && baseLogoB.original.trim().length > 0) ? baseLogoB : baseLogoA;
                    }

                    // Chaîne de résolution stricte pour logoToUse :
                    // Prendre EXCLUSIVEMENT le logo associé au slug actif (ex: siteConfig?.logoUrl, sessionLogoUrl, ou logo extrait pour le client courant).
                    let logoToUse = getLogoToUse(it.id);

                    if (!logoToUse || isParasiticClubVisionLogo(logoToUse, currentSlug, sessionId)) {
                        logoToUse = null;
                        const candidateA = logoA.activeUrl || logoA.remastered || logoA.adapted || logoA.original;
                        const candidateB = logoB.activeUrl || logoB.remastered || logoB.adapted || logoB.original;
                        const directCandidate = targetSlot === 'B' ? (candidateB || candidateA) : (candidateA || candidateB);
                        if (directCandidate && !isParasiticClubVisionLogo(directCandidate, currentSlug, sessionId)) {
                            logoToUse = directCandidate;
                        }
                    }

                    if (!logoToUse || isParasiticClubVisionLogo(logoToUse, currentSlug, sessionId)) {
                        logoToUse = null;
                        let sessionLogo: string | null = null;
                        try {
                            const rawSession = localStorage.getItem(`session_obj_${currentSlug}`) || (sessionId ? localStorage.getItem(`session_obj_${sessionId}`) : null) || localStorage.getItem('btp_active_session_data');
                            if (rawSession) {
                                const parsed = JSON.parse(rawSession);
                                sessionLogo = parsed?.logoUrl || parsed?.logo || parsed?.siteConfig?.logoUrl || parsed?.userData?.logoUrl || null;
                            }
                        } catch (e) { }
                        if (!sessionLogo) {
                            sessionLogo = localStorage.getItem(`lastSyncedLogoUrl_${currentSlug}`) || (sessionId ? localStorage.getItem(`lastSyncedLogoUrl_${sessionId}`) : null);
                        }
                        if (sessionLogo && !isParasiticClubVisionLogo(sessionLogo, currentSlug, sessionId)) {
                            logoToUse = sessionLogo;
                        }
                    }

                    // Résolution STRICTE du logo envoyé à l'IA :
                    // Si targetSlot === 'A' -> strictement 'logo_A_active.png' (logo complet avec texte)
                    // Si targetSlot === 'B' -> 'logo_B_active.png' (icône rognée sans texte)
                    let selectedLogoUrl = await resolvePipelineLogoUrl(targetSlot, targetLogo, baseLogoA, baseLogoB, currentSlug, sessionId);
                    if (isParasiticClubVisionLogo(selectedLogoUrl, currentSlug, sessionId)) {
                        selectedLogoUrl = "";
                    }

                    if (!logoToUse && selectedLogoUrl) {
                        logoToUse = selectedLogoUrl;
                    }

                    // Si aucun logo n'est trouvé pour ce profil, stopper l'exécution et afficher une notification explicite
                    if (!logoToUse || logoToUse.trim().length === 0 || isParasiticClubVisionLogo(logoToUse, currentSlug, sessionId)) {
                        console.warn(`[AUDIT_VTON_ABORT] Aucun logo détecté pour le profil ${currentSlug} sur l'article ${it.id}.`);
                        addLog("Aucun logo détecté pour ce profil");
                        alert("Aucun logo détecté pour ce profil");
                        updateItem(it.id, null, false, it.base);
                        continue;
                    }

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

                    updateItem(it.id, null, true); // Mark as loading
                    addLog(`ÉTAPE 1: GABARIT...`);

                    const techScale = it.view === 'front' ? logoScaleFront : logoScaleBack;
                    const mechanicalBase64 = await generateMechanicalMockup(it.base, logoToUse, it.view, techScale, it.garment, logoColorModes[it.id]);
                    addLog(`ÉTAPE 2: MANNEQUIN...`);

                    // Résolution garantie de la photo studio du mannequin adapté au vêtement
                    const isBackSlot = it.view === 'back' || isBackId(it.id) || it.id.toLowerCase().includes('back');
                    const isHoodieOrSweat = it.garment === 'sweat' || it.garment === 'hoodie' || (it.garment as string) === 'sweatshirt' ||
                        it.id === 'hBack' || it.id === 'hFront' ||
                        it.id === 'hoodieBack' || it.id === 'hoodieFront' ||
                        it.id === 'hoodie_white_back' || it.id === 'hoodie_white_front' ||
                        it.id === 'hWhiteBack' || it.id === 'hWhiteFront' ||
                        it.id === 'JHK421-WHT_back' || it.id === 'JHK421-WHT_front' ||
                        it.id === 'hoodie_back' || it.id === 'hoodie_front' ||
                        it.id === 'sweat_back' || it.id === 'sweat_front' ||
                        it.id.toLowerCase().includes('hoodie') || it.id.toLowerCase().includes('sweat') ||
                        (it.base && (it.base.includes('hoodie') || it.base.includes('sweat') || it.base.includes('JHK421') || it.base.includes('jhk421'))) ||
                        (it.title && (it.title.toLowerCase().includes('hoodie') || it.title.toLowerCase().includes('sweat'))) ||
                        (it.sku && (it.sku.toLowerCase().includes('jhk421') || it.sku.toLowerCase().includes('hoodie')));
                    const isSweat = isHoodieOrSweat;
                    const isPolo = it.garment === 'polo' || (it.base && it.base.includes('polo')) || (it.title && it.title.toLowerCase().includes('polo'));
                    const isTank = it.garment === 'tank_top' || (it.base && it.base.includes('tank')) || (it.title && it.title.toLowerCase().includes('débardeur'));

                    // RÈGLE STRICTE ACTION 1 : Bannir tout fallback vers 'male_tshirt_back.png' pour les sweats et hoodies.
                    // Pour 'hoodieBack', 'hBack', 'hoodie_white_back', Input 1 est STRICTEMENT male_hoodie_back.png.
                    let backModelPhoto = isHoodieOrSweat ? '/assets/models/male_hoodie_back.png' : '/assets/models/male_tshirt_back.png';
                    let frontModelPhoto = isHoodieOrSweat ? '/assets/models/male_hoodie_front.png' : '/assets/models/male_tshirt_front.png';
                    if (isPolo) {
                        backModelPhoto = '/assets/models/male_polo_back.png';
                        frontModelPhoto = '/assets/models/male_polo_front.png';
                    } else if (isTank) {
                        backModelPhoto = '/assets/models/male_tank_back.png';
                        frontModelPhoto = '/assets/models/male_tank_front.png';
                    }

                    const getMannequinModelPath = (garment: string, view: 'front' | 'back', customModel?: string): string => {
                        const cleanGarment = (garment || '').toLowerCase();
                        if (cleanGarment === 'business_card' || cleanGarment === 'banner') {
                            if (customModel && typeof customModel === 'string' && customModel.includes('card_mockup')) {
                                return customModel;
                            }
                            return isBackSlot ? '/assets/models/card_mockup_back.png' : '/assets/models/card_mockup_front_neutral.png';
                        }
                        // RÈGLE STRICTE : Pour tout sweat/hoodie, Input 1 est STRICTEMENT male_hoodie_back.png (ou front).
                        // Bannir tout fallback vers 'male_tshirt_back.png'.
                        if (isHoodieOrSweat) {
                            return isBackSlot ? '/assets/models/male_hoodie_back.png' : '/assets/models/male_hoodie_front.png';
                        }
                        if (customModel && typeof customModel === 'string' && customModel.startsWith('/assets/models/') && !customModel.includes('tshirt')) {
                            return customModel;
                        }
                        return isBackSlot ? backModelPhoto : frontModelPhoto;
                    };

                    let modelPath = getMannequinModelPath(it.garment, it.view, it.model);
                    if (isHoodieOrSweat) {
                        modelPath = isBackSlot ? '/assets/models/male_hoodie_back.png' : '/assets/models/male_hoodie_front.png';
                    } else if (isBackSlot && (!modelPath || !modelPath.includes('back'))) {
                        modelPath = backModelPhoto;
                    }

                    let rawModel: string = "";
                    try {
                        rawModel = await fetchBase64(modelPath);
                    } catch (mErr) {
                        const fallbackModel = isHoodieOrSweat
                            ? (isBackSlot ? '/assets/models/male_hoodie_back.png' : '/assets/models/male_hoodie_front.png')
                            : (isBackSlot ? backModelPhoto : frontModelPhoto);
                        try {
                            rawModel = await fetchBase64(fallbackModel);
                        } catch (fErr2) {
                            console.warn("Fallback model fetch failed:", fErr2);
                            try {
                                const altModel = fallbackModel.replace('/assets/models/', '/models/');
                                rawModel = await fetchBase64(altModel);
                            } catch (fErr3) {
                                console.error("Alternative model fetch failed:", fErr3);
                            }
                        }
                    }
                    // Utilisation directe du buste mannequin studio haute définition (1024x1024) sans distorsion ni recadrage
                    let modelBase64: string = rawModel || "";

                    // S'assurer que 'userPhoto' n'est JAMAIS vide ou remplacée par le mockup à plat, et bannir modèle t-shirt pour hoodie
                    const isFlatMockup = !modelBase64 || modelBase64.length < 500 ||
                        (mechanicalBase64 && modelBase64 === mechanicalBase64) ||
                        (it.base && modelBase64 === it.base) ||
                        modelBase64.includes('catalog_mockups') ||
                        (typeof it.model === 'string' && (it.model.includes('polo-black') || it.model.includes('polo-white') || it.model.includes('hoodie-black') || it.model.includes('hoodie-white')));

                    if (isFlatMockup || (isHoodieOrSweat && typeof it.model === 'string' && it.model.includes('tshirt'))) {
                        const targetDefaultModel = isHoodieOrSweat
                            ? (isBackSlot ? '/assets/models/male_hoodie_back.png' : '/assets/models/male_hoodie_front.png')
                            : (isBackSlot ? backModelPhoto : frontModelPhoto);
                        console.warn(`[Pipeline] Mannequin invalide ou mockup à plat détecté pour ${it.id}. Réinjection systématique de : ${targetDefaultModel}`);
                        try {
                            modelBase64 = await fetchBase64(targetDefaultModel);
                        } catch (fbErr) {
                            console.error(`[Pipeline] Échec réinjection mannequin par défaut pour ${it.id}:`, fbErr);
                            try {
                                const altModel = targetDefaultModel.replace('/assets/models/', '/models/');
                                modelBase64 = await fetchBase64(altModel);
                            } catch (fbErr2) { }
                        }
                    }

                    addLog(`ÉTAPE 3: TRANSMISSION IA...`);

                    const HOODIE_BACK_GARMENT_STRUCTURE_PROMPT =
                        "GARMENT STRUCTURE: Thick heavyweight cotton hoodie with long sleeves extending all the way down to the wrists. " +
                        "STRICT PROHIBITION: The model MUST wear long sleeves. NO short sleeves, NO t-shirt cut, NO exposed forearms or bare arms. " +
                        "The hoodie must fully cover the arms down to the cuffs.";

                    const isE3520 = (it.sku && it.sku.toUpperCase().includes('E3520')) || (it.id && it.id.toLowerCase().includes('e3520'));
                    let garmentColorDesc = isE3520 ? "vibrant cyan blue / bright turquoise" : "Black";
                    if (isE3520) {
                        garmentColorDesc = "vibrant cyan blue / bright turquoise";
                    } else if (it.color) {
                        const hex = it.color.toLowerCase();
                        if (hex === '#000000' || hex === '#000' || hex === 'black' || hex === 'noir') garmentColorDesc = "Black";
                        else if (hex === '#ffffff' || hex === '#fff' || hex === 'white' || hex === 'blanc') garmentColorDesc = "White";
                        else if (hex.includes('blue') || hex.includes('bleu') || ['#0000ff', '#1e3a8a', '#1d4ed8', '#2563eb', '#3b82f6', '#0284c7', '#0369a1'].some(c => hex.includes(c)) || it.title?.toLowerCase().includes('bleu') || it.title?.toLowerCase().includes('blue')) garmentColorDesc = "Royal Blue";
                        else if (it.title?.toLowerCase().includes('rouge') || it.title?.toLowerCase().includes('red')) garmentColorDesc = "Red";
                        else if (it.title?.toLowerCase().includes('vert') || it.title?.toLowerCase().includes('green')) garmentColorDesc = "Green";
                        else if (it.title?.toLowerCase().includes('gris') || it.title?.toLowerCase().includes('grey') || it.title?.toLowerCase().includes('gray')) garmentColorDesc = "Heather Gray";
                        else garmentColorDesc = it.color;
                    } else if (it.title?.toLowerCase().includes('bleu') || it.title?.toLowerCase().includes('blue')) {
                        garmentColorDesc = "Royal Blue";
                    } else if (it.title?.toLowerCase().includes('blanc') || it.title?.toLowerCase().includes('white') || it.id?.toLowerCase().includes('white') || it.sku?.toLowerCase().includes('wht') || it.base?.toLowerCase().includes('white')) {
                        garmentColorDesc = "White";
                    }

                    let garmentLabel = isE3520
                        ? "Plain vibrant cyan blue / bright turquoise breathable interlock polyester sports jersey"
                        : `Plain ${garmentColorDesc} Hoodie`;
                    if (!isE3520) {
                        if (it.garment === 'tshirt' || it.garment === 'tshirt_basic') garmentLabel = `Plain ${garmentColorDesc} T-shirt`;
                        else if (it.garment === 'polo') garmentLabel = `Plain ${garmentColorDesc} Polo Shirt with collar and short sleeves`;
                        else if (it.garment === 'sweat' || it.garment === 'hoodie' || isHoodieOrSweat) garmentLabel = isBackSlot
                            ? `Plain ${garmentColorDesc} HEAVYWEIGHT LONG-SLEEVE HOODIE SWEATSHIRT. ${HOODIE_BACK_GARMENT_STRUCTURE_PROMPT}`
                            : `Plain ${garmentColorDesc} HEAVYWEIGHT LONG-SLEEVE HOODIE SWEATSHIRT with thick fabric, kangaroo pocket, long sleeves covering the full arms down to the wrists, and a folded hood around the neck. STRICT PROHIBITION: Do NOT generate a short-sleeve t-shirt. The arms MUST be fully covered by the long sleeves of the hoodie. Bare arms or short sleeves are strictly forbidden.`;
                        else if (it.garment === 'tank_top') garmentLabel = `Plain ${garmentColorDesc} Sleeveless Muscle Tank Top`;
                        else if (it.garment === 'tshirt_oversize') garmentLabel = `Plain ${garmentColorDesc} Heavyweight Oversize Streetwear T-shirt with boxy cut and drop shoulders`;
                        else if (it.garment === 'tshirt_bicolore') garmentLabel = 'High-Visibility Two-Tone Fluorescent Yellow and Black T-shirt with reflective bands';
                        else if (it.garment === 'veste') garmentLabel = 'High-Visibility Fluorescent Safety Vest';
                    }

                    const logoObj = (targetLogo && targetLogo.original && targetLogo.original.trim().length > 0) ? targetLogo : baseLogoA;
                    const logoToUseMode = logoObj ? logoObj.mode : 'original';
                    const isBackView = it.view === 'back' || isBackId(it.id);
                    const framingInstruction = isBackView ? (isHoodieOrSweat ? `
STUDIO MODEL & FRAMING CONSTRAINTS (REAR VIEW - 180°):
- Professional male studio model with dark hair viewed strictly from behind (180-degree rear view, facing directly away from camera).
- ${HOODIE_BACK_GARMENT_STRUCTURE_PROMPT}
- STRICT ACCESSORY RULE: Absolutely NO sunglasses, NO visible glasses temples or frame arms protruding around the head, ears, or neck.
- Completely natural head seen from behind, centered. The hood of the ${garmentLabel} rests naturally folded down over the upper back/nape.
- Complete fashion e-commerce studio framing with proper headroom margin above the head. Do not crop the top of the head.
- COMPLETE GARMENT DISPLAY: The garment back MUST be fully visible on the model from shoulders to hemline.
- 1:1 SQUARE COMPOSITION: The model and the garment must be perfectly centered within a square 1:1 frame with generous headroom margin at the top and balanced margins.
` : `
STUDIO MODEL & FRAMING CONSTRAINTS (REAR VIEW - 180°):
- Professional male studio model with dark hair viewed strictly from behind (180-degree rear view, facing directly away from camera).
- STRICT ACCESSORY RULE: Absolutely NO sunglasses, NO visible glasses temples or frame arms protruding around the head, ears, or neck.
- Completely natural head seen from behind, centered, with clean exposed neck, no distracting or parasite accessories.
- Complete fashion e-commerce studio framing with proper headroom margin above the head. Do not crop the top of the head.
- COMPLETE GARMENT DISPLAY: The garment back MUST be fully visible on the model from collar to hemline.
- 1:1 SQUARE COMPOSITION: The model and the garment must be perfectly centered within a square 1:1 frame with generous headroom margin at the top and balanced margins.
`) : `
STUDIO MODEL & FRAMING CONSTRAINTS (FRONT VIEW):
- Professional male studio model with dark hair, natural uncovered face and neutral studio gaze, strictly NO sunglasses, NO glasses, wearing the garment.
- Maintain the full model appearance, dark hair, and natural face as shown in the reference model image.
- Complete fashion e-commerce studio framing with proper headroom margin above the head. Do not crop the top of the head.
- COMPLETE GARMENT DISPLAY: The garment MUST be fully visible on the model from collar to hemline.
- 1:1 SQUARE COMPOSITION: The model and the garment must be perfectly centered within a square 1:1 frame with generous headroom margin at the top and balanced margins.
`;

                    const poseDesc = isBackView
                        ? (isHoodieOrSweat
                            ? `The male studio model is shown completely from the back (180-degree rear view, facing directly away from the camera), wearing the heavyweight long-sleeve hoodie sweatshirt with both arms fully covered by thick long sleeves down to wrists. ${HOODIE_BACK_GARMENT_STRUCTURE_PROMPT} Showing the entire back of the hoodie from shoulders to waist with the hood resting naturally down over the upper back. Symmetrically center the logo on the back below the resting hood as positioned in the mechanical mockup. Bare arms or short sleeves are strictly forbidden. Strictly NO sunglasses and NO glasses temples or frame arms visible.`
                            : `The male studio model is shown completely from the back (180-degree rear view, facing directly away from the camera), showing the entire back of the ${garmentLabel} from shoulders to waist centered between shoulder blades. Natural head and neck seen from behind, centered, strictly with NO sunglasses and NO glasses temples or frame arms visible.`)
                        : (isHoodieOrSweat
                            ? `The male studio model with dark hair, natural uncovered face and neutral studio gaze, strictly with NO sunglasses and NO glasses, is viewed straight from the front in a studio catalog shot, wearing the heavyweight long-sleeve hoodie sweatshirt with both arms fully covered by thick long sleeves down to wrists. Discrete left-chest brand placement over the heart.`
                            : `The male studio model with dark hair, natural uncovered face and neutral studio gaze, strictly with NO sunglasses and NO glasses, is viewed straight from the front in a studio catalog shot, showing the entire front of the ${garmentLabel}. Discrete left-chest brand placement over the heart.`);
                    const studioBackgroundPrompt = "CRITICAL BACKGROUND INSTRUCTION: The background MUST be a completely solid, minimalist, neutral light-gray or off-white studio background with soft studio lighting. STRICTLY FORBIDDEN: thematic environments, club interiors, night scenes, streets, outdoor landscapes, props, or background decor.";
                    const sectorPrompt = `Clean minimalist e-commerce product studio photography. The model is ${getMannequinProfile(it.view)}. ${studioBackgroundPrompt} ${poseDesc} `;

                    const cMode = logoColorModes[it.id] || 'original';
                    let colorInstruction = "";
                    if (cMode === 'white') {
                        colorInstruction = "\nSTRICT LOGO COLOR INSTRUCTION: The logo printed on the garment MUST BE PURE WHITE (#FFFFFF) MONOCHROME PRINT. Transform all logo elements into solid white print.";
                    } else if (cMode === 'black') {
                        colorInstruction = "\nSTRICT LOGO COLOR INSTRUCTION: The logo printed on the garment MUST BE PURE BLACK (#000000) MONOCHROME PRINT. Transform all logo elements into solid black print.";
                    } else if (cMode === 'knockout_black') {
                        colorInstruction = "\nSTRICT LOGO COLOR INSTRUCTION: The logo has black elements knocked out (transparent/substrate knockout). The black fabric of the garment shows through where black would be. Colored and white elements of the logo remain vibrant.";
                    }

                    const isBtpSector = (u.activity || '').toUpperCase().match(/BTP|CONSTRUCTION|BÂTIMENT|BATIMENT/);
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

                    // Directive de positionnement adaptée à la vue Face / Dos
                    const placementDirective = it.view === 'front'
                        ? `\nCRITICAL LOGO PLACEMENT INSTRUCTION (FRONT VIEW):
- left chest placement (small subtle brand mark on the wearer's left chest area).
- STRICT PROHIBITION: Centering the logo on the chest or torso is STRICTLY FORBIDDEN. The logo MUST be placed discreetly on the wearer's left chest (heart position), exactly matching the mechanical mockup.`
                        : (isHoodieOrSweat
                            ? `\nCRITICAL LOGO PLACEMENT INSTRUCTION (BACK VIEW):
- Centered back placement: Symmetrically center the logo on the back of the hoodie below the resting hood, exactly matching the position and proportions shown in the mechanical mockup in Input 2.
${HOODIE_BACK_GARMENT_STRUCTURE_PROMPT}`
                            : `\nCRITICAL LOGO PLACEMENT INSTRUCTION (BACK VIEW):
- Upper back center placement: Symmetrically center the logo on the upper back between the shoulder blades as shown in the mechanical mockup.`);

                    const companyName = u.companyName || currentSlug;
                    if (targetSlot === 'B') {
                        contextPrompt += `\nSLOT B GRAPHIC INSTRUCTION (SECONDARY / ICON / ARTWORK):
Accurately reproduce the graphic artwork, emblem, or typography provided in the reference logo onto the garment as a seamless transparent DTF transfer without adding unprompted extra text or rectangular background patches.
Maintain crisp, clean graphic edges that melt directly into the fabric.`;
                    } else {
                        contextPrompt += `\nEXPLICIT BRANDING REQUIREMENT (SLOT A):
The provided logo graphic contains the official branding elements and typography${companyName ? ` for '${companyName.toUpperCase()}'` : ''}.
You MUST faithfully reproduce the provided logo on the garment as a seamless transparent DTF transfer without rectangular background patches or borders.
Do NOT omit, blur, or erase any typography. All brand letters and text present in the reference logo image must be clearly visible and legible, placed exactly as positioned in the reference logo image.`;
                    }

                    if (isE3520) {
                        contextPrompt += `\nCOLOR FIDELITY: Maintain the EXACT bright cyan / turquoise blue (#00b5e2) fabric color of the reference garment. Do not darken into navy or royal blue.`;
                    }

                    if (isHoodieOrSweat) {
                        contextPrompt += isBackView
                            ? `\nGARMENT CUT & SLEEVE LENGTH ENFORCEMENT:\n${HOODIE_BACK_GARMENT_STRUCTURE_PROMPT}\n`
                            : `\nGARMENT CUT & SLEEVE LENGTH ENFORCEMENT:\nThe garment is a HEAVYWEIGHT LONG-SLEEVE HOODIE SWEATSHIRT with thick fleece fabric, kangaroo pocket, ribbed cuffs, and long sleeves covering the full arms down to the wrists. \nSTRICT PROHIBITION: Do NOT generate a short-sleeve t-shirt or polo. The model's arms MUST be completely covered by the long sleeves of the hoodie. Bare arms or exposed forearms are strictly forbidden.\n`;
                    }

                    contextPrompt += placementDirective;
                    contextPrompt += colorInstruction;
                    contextPrompt += `\n${sectorPrompt}\n${framingInstruction}`;

                    const compressToWebP = async (base64Str: string, quality = 0.82): Promise<string> => {
                        return new Promise((resolve) => {
                            const img = new Image();
                            img.crossOrigin = 'anonymous';
                            img.onload = () => {
                                const canvas = document.createElement('canvas');
                                const w = img.naturalWidth || img.width;
                                const h = img.naturalHeight || img.height;
                                if (w > h * 1.1) {
                                    // Centrage horizontal strict : x = (w - h) / 2 avec marges équilibrées
                                    const sx = Math.max(0, Math.round((w - h) / 2));
                                    canvas.width = h;
                                    canvas.height = h;
                                    const ctx = canvas.getContext('2d');
                                    if (!ctx) return resolve(base64Str);
                                    ctx.drawImage(img, sx, 0, h, h, 0, 0, h, h);
                                    resolve(canvas.toDataURL('image/webp', quality));
                                } else if (h > w * 1.1) {
                                    // Centrage vertical strict : y = (h - w) / 2
                                    const sy = Math.max(0, Math.round((h - w) / 2));
                                    canvas.width = w;
                                    canvas.height = w;
                                    const ctx = canvas.getContext('2d');
                                    if (!ctx) return resolve(base64Str);
                                    ctx.drawImage(img, 0, sy, w, w, 0, 0, w, w);
                                    resolve(canvas.toDataURL('image/webp', quality));
                                } else {
                                    canvas.width = w;
                                    canvas.height = h;
                                    const ctx = canvas.getContext('2d');
                                    if (!ctx) return resolve(base64Str);
                                    ctx.drawImage(img, 0, 0);
                                    resolve(canvas.toDataURL('image/webp', quality));
                                }
                            };
                            img.onerror = () => resolve(base64Str);
                            img.src = base64Str;
                        });
                    };

                    // Action 4 : Log de contrôle obligatoire avant l'appel API
                    const userPhotoBase64 = modelBase64;
                    const item = it;
                    console.log('[USER_PHOTO_INSPECT]', {
                        userPhotoSnippet: userPhotoBase64.slice(0, 50),
                        targetSlug: currentSlug,
                        garmentSku: item.sku,
                        placementView: item.view,
                        length: userPhotoBase64.length
                    });
                    console.log('[AUDIT_VTON_CHECK]', {
                        targetSlug: currentSlug,
                        logoUrlUsed: logoToUse,
                        hasMannequinBase: Boolean(userPhotoBase64),
                        garmentSku: item.sku,
                        placementView: item.view
                    });

                    let result: any = null;
                    try {
                        const logoForAi = selectedLogoUrl || logoToUse;
                        console.log(`[PIPELINE_LOGO] Slot ciblé: ${targetSlot} -> Logo envoyé: ${selectedLogoUrl}`);
                        console.log(`[DEBUG_API_CALL] Lancement IA pour ${it.id}`);
                        console.log(`[DEBUG_PROMPT_SENT] Prompt pour ${it.id}:`, { contextPrompt, logoToUseLength: logoForAi?.length });
                        result = await geminiService.generateTryOnImage(
                            modelBase64,
                            mechanicalBase64,
                            garmentLabel,
                            contextPrompt,
                            "Sans Filtre",
                            it.view,
                            logoForAi,
                            null,
                            null,
                            it.view === 'front' ? 'chest_left' : 'back_center',
                            "",
                            "1:1",
                            'v-ton',
                            "gemini-2.5-flash-image",
                            u.companyName || currentSlug.toUpperCase(),
                            targetSlot
                        );
                        console.log(`[DEBUG_API_SUCCESS] Résultat reçu pour ${it.id}`, { hasResult: !!result });
                        if (result) {
                            const compressed = await compressToWebP(result);
                            console.log(`[WEBP_COMPRESSION] Poids avant: ${Math.round(result.length / 1024)} KB -> Poids après WebP: ${Math.round(compressed.length / 1024)} KB`);
                            result = compressed;
                        }
                    } catch (apiErr) {
                        console.error(`[DEBUG_API_ERROR] Échec pour ${it.id}:`, apiErr);
                    }

                    let finalSlotAiUrl = result;
                    let finalSlotMechUrl = mechanicalBase64 || null;

                    // Immediate Storage upload of generated slot to replace Base64 in state
                    if (result && (result.startsWith('data:') || result.length > 50)) {
                        try {
                            const storagePath = `btp_mockups/${currentSlug}/web/${it.id}.png`;
                            const uploadedUrl = await uploadBase64ToStorage(result, storagePath);
                            if (uploadedUrl && (uploadedUrl.startsWith('http://') || uploadedUrl.startsWith('https://'))) {
                                console.log(`[STORAGE] Upload immédiat réussi pour ${it.id}: ${uploadedUrl}`);
                                finalSlotAiUrl = uploadedUrl;
                            }
                        } catch (upErr) {
                            console.warn(`[STORAGE] Échec upload immédiat IA pour ${it.id}:`, upErr);
                        }
                    }

                    if (mechanicalBase64 && (mechanicalBase64.startsWith('data:') || mechanicalBase64.length > 50)) {
                        try {
                            const mechPath = `btp_mockups/${currentSlug}/web/${it.id}_mech.png`;
                            const uploadedMech = await uploadBase64ToStorage(mechanicalBase64, mechPath);
                            if (uploadedMech && (uploadedMech.startsWith('http://') || uploadedMech.startsWith('https://'))) {
                                console.log(`[STORAGE] Upload immédiat réussi pour ${it.id}_mech: ${uploadedMech}`);
                                finalSlotMechUrl = uploadedMech;
                            }
                        } catch (upErr) {
                            console.warn(`[STORAGE] Échec upload mécanique pour ${it.id}:`, upErr);
                        }
                    }

                    updateItem(it.id, finalSlotAiUrl, false, finalSlotMechUrl);
                    if (procIdx !== -1) {
                        setActiveMockupIndex(procIdx);
                    }
                    addLog(`SUCCÈS : ${it.id.toUpperCase()} PRÊT.`);

                    setCredits(prev => {
                        const newVal = Math.max(0, prev - 1);
                        if (userData.email) {
                            try {
                                safeLocalStorageSetItem(`btp_credits_${userData.email}`, newVal.toString());
                            } catch (e) {
                                console.warn("[Storage] btp_credits save notice:", e);
                            }
                        }
                        return newVal;
                    });
                } catch (err: any) {
                    console.error(`Error generating ${it.id}:`, err);
                    addLog(`[!] ERREUR ${it.id.toUpperCase()}: ${err.message || 'Inconnue'}`);
                    updateItem(it.id, null, false);
                }
            }
            setIsRegenerating(false);
            setState('RESULT');

            // Auto-push Cloud dans le pipeline dès que le dernier vêtement est généré
            try {
                addLog("AUTO-PUSH CLOUD : SYNCHRONISATION DU CATALOGUE...");
                await syncSessionToCloud(true, mockupsRef.current);
                console.log("[STORAGE] Auto-push Cloud réussi avec succès à la fin du pipeline.");
                addLog("AUTO-PUSH CLOUD : BOUTIQUE SYNCHRONISÉE.");
            } catch (saveErr) {
                console.warn("[STORAGE] Erreur auto-push Cloud à la fin du pipeline:", saveErr);
            }
            // DO NOT redirect automatically to shop after generation completes!
            /*
            if (!hasRedirected.current) {
                hasRedirected.current = true;
                const targetUrl = uidParam ? `/portail-shop?uid=${uidParam}` : (sessionId ? `/portail-shop?uid=${sessionId}` : '/portail-shop');
                navigate(targetUrl, { replace: true });
            }
            */
        } catch (e) {
            setIsRegenerating(false);
            setState('RESULT');
        }
    };

    const refreshMockupsForLogo = async (
        targetLogo: BtpLogo,
        otherLogo: BtpLogo,
        placements: Record<string, 'A' | 'B'> = logoPlacements
    ): Promise<MockupItem[]> => {
        const nextLogoA = targetLogo.id === 'A' ? targetLogo : otherLogo;
        const nextLogoB = targetLogo.id === 'B' ? targetLogo : otherLogo;

        const currentList = (mockupsRef.current && mockupsRef.current.length > 0) ? mockupsRef.current : mockups;
        const updatedMockups = await Promise.all(currentList.map(async (m) => {
            const slot = resolveSlotForPlacement(m.id, placements);
            const activeLogo = (slot === 'B' && !!(nextLogoB.original || nextLogoB.rawOriginal || nextLogoB.activeUrl)) ? nextLogoB : nextLogoA;
            const logoSrc = activeLogo.mode === 'remastered'
                ? (activeLogo.remastered || activeLogo.adapted || activeLogo.original)
                : (activeLogo.mode === 'original'
                    ? (activeLogo.original || activeLogo.adapted)
                    : (activeLogo.adapted || activeLogo.original));
            const scale = m.view === 'front' ? logoScaleFront : logoScaleBack;
            const cMode = logoColorModes[m.id] || globalLogoColorMode || 'original';
            try {
                const mechanical = logoSrc ? await generateMechanicalMockup(m.base, logoSrc, m.view, scale, m.garment, cMode) : m.mechanical;
                return { ...m, mechanical, aiRemastered: null };
            } catch (e) {
                console.error("Gabarit error on mockup refresh:", e);
                return m;
            }
        }));

        setMockups(updatedMockups);
        mockupsRef.current = updatedMockups;
        return updatedMockups;
    };

    const handleUpload = async (file: File, slot: 'A' | 'B' = 'A') => {
        const reader = new FileReader();
        reader.onload = async () => {
            const base64 = reader.result as string;
            setStatusMessage(`ANALYSE DU LOGO ${slot} SÉRIE V24...`);
            setIsAnalyzing(true);

            try {
                // Conservation stricte du fichier source brut : fond d'origine préservé par défaut
                const paddedBase64 = await padBase64ToSquare(base64);

                // Audit branding en lecture seule (n'altère pas l'image)
                const analysis = await geminiService.analyzeLogoBranding(paddedBase64).catch(() => null);

                // Pré-calcul de la variante Blanc V24 en tâche de fond pour réactivité instantanée
                const adapted = await processLogoDeterministic(paddedBase64, true, true).catch(() => paddedBase64);

                const newLogo: BtpLogo = {
                    id: slot,
                    original: paddedBase64,       // Fond d'origine préservé par défaut (brut)
                    rawOriginal: paddedBase64,    // Source brute archivée
                    noBg: null,                   // Détourage à la demande uniquement
                    isBgRemoved: false,           // État : fond présent
                    adapted,                      // Monochrome blanc prêt si Blanc V24 sélectionné
                    remastered: null,
                    mode: 'original'              // Mode actif par défaut : Version de base brute
                };

                const currentLogoA = slot === 'A' ? newLogo : logoA;
                const currentLogoB = slot === 'B' ? newLogo : logoB;

                if (slot === 'A') setLogoA(newLogo); else setLogoB(newLogo);
                if (analysis) setLogoAnalysis(analysis);

                setStatusMessage("CALIBRAGE DES GABARITS BTP...");

                // Synchronisation des gabarits avec le logo brut
                const updatedMockups = await refreshMockupsForLogo(newLogo, slot === 'A' ? logoB : logoA);

                if (state === 'LANDING') {
                    setState('CLEAN_CHECK');
                }

                await saveSession(
                    currentLogoA,
                    currentLogoB,
                    logoPlacements,
                    userData,
                    updatedMockups
                );
            } catch (error) {
                console.error("Upload/Analysis error:", error);
            } finally {
                setIsAnalyzing(false);
                setStatusMessage("");
            }
        };
        reader.readAsDataURL(file);
    };

    const handleToggleBackground = async (slot: 'A' | 'B') => {
        const logo = slot === 'A' ? logoA : logoB;
        if (!logo || (!logo.original && !logo.rawOriginal)) return;

        const raw = logo.rawOriginal || logo.original!;

        if (logo.isBgRemoved) {
            // Rétablir le fond d'origine (image brute)
            setStatusMessage(`RÉTABLISSEMENT DU FOND DU LOGO ${slot}...`);
            const restoredLogo: BtpLogo = {
                ...logo,
                original: raw,
                isBgRemoved: false,
                mode: 'original'
            };
            if (slot === 'A') setLogoA(restoredLogo);
            else setLogoB(restoredLogo);

            const updatedMockups = await refreshMockupsForLogo(restoredLogo, slot === 'A' ? logoB : logoA);
            await saveSession(
                slot === 'A' ? restoredLogo : logoA,
                slot === 'B' ? restoredLogo : logoB,
                logoPlacements,
                userData,
                updatedMockups,
                false
            );
            setStatusMessage("");
        } else {
            // Retirer le fond à la demande (détourage transparent)
            setStatusMessage(`DÉTOURAGE DU LOGO ${slot} (SUPPRESSION DU FOND)...`);
            setIsAnalyzing(true);
            try {
                let transparentLogo = logo.noBg;
                if (!transparentLogo) {
                    const padded = await padBase64ToSquare(raw);
                    transparentLogo = await processLogoDeterministic(padded, false, true);

                    // Si le détourage canvas est identique, tenter le service removeBackground
                    if (transparentLogo === padded || transparentLogo === raw) {
                        try {
                            const bgServiceResult = await removeBackground(raw);
                            if (bgServiceResult && bgServiceResult !== raw) {
                                transparentLogo = bgServiceResult;
                            }
                        } catch (bgErr) {
                            console.warn("RemoveBackground fallback notice:", bgErr);
                        }
                    }
                }

                const noBgLogo: BtpLogo = {
                    ...logo,
                    rawOriginal: raw,
                    original: transparentLogo,
                    noBg: transparentLogo,
                    isBgRemoved: true,
                    mode: 'original'
                };
                if (slot === 'A') setLogoA(noBgLogo);
                else setLogoB(noBgLogo);

                const updatedMockups = await refreshMockupsForLogo(noBgLogo, slot === 'A' ? logoB : logoA);
                await saveSession(
                    slot === 'A' ? noBgLogo : logoA,
                    slot === 'B' ? noBgLogo : logoB,
                    logoPlacements,
                    userData,
                    updatedMockups,
                    false
                );
            } catch (err) {
                console.error("Erreur détourage:", err);
                alert("Erreur lors du détourage du logo.");
            } finally {
                setIsAnalyzing(false);
                setStatusMessage("");
            }
        }
    };

    const handleConfirmEffects = async () => {
        setStatusMessage("TRAITEMENT HD DES LOGOS...");
        // 1. Re-process logo A
        if (logoA.original) {
            const paddedA = await padBase64ToSquare(logoA.original);
            const adapted = await processLogoDeterministic(paddedA, true, true);
            const cleaned = await processLogoDeterministic(paddedA, false, true);
            const nextLogoA = { ...logoA, original: cleaned, adapted };
            setLogoA(nextLogoA);
        }
        // 2. Re-process logo B
        if (logoB.original) {
            const paddedB = await padBase64ToSquare(logoB.original);
            const adapted = await processLogoDeterministic(paddedB, true, true);
            const cleaned = await processLogoDeterministic(paddedB, false, true);
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

    const handleCropConfirm = async (croppedBase64: string, targetSlot: 'A' | 'B' = cropTargetSlot) => {
        setShowCropModal(false);
        setStatusMessage(`TRAITEMENT DU LOGO ${targetSlot} (ROGNAGE / GOMMAGE)...`);
        setIsAnalyzing(true);
        try {
            const paddedBase64 = await padBase64ToSquare(croppedBase64);
            const targetLogo = targetSlot === 'A' ? logoA : logoB;
            const shouldKeepBgRemoved = targetLogo.isBgRemoved ?? false;

            const [original, adapted] = await Promise.all([
                shouldKeepBgRemoved
                    ? processLogoDeterministic(paddedBase64, false, true)
                    : Promise.resolve(paddedBase64),
                processLogoDeterministic(paddedBase64, true, true).catch(() => paddedBase64),
            ]);

            if (targetSlot === 'A') {
                const newLogoA: BtpLogo = {
                    id: 'A',
                    original,
                    rawOriginal: paddedBase64,
                    noBg: shouldKeepBgRemoved ? original : null,
                    isBgRemoved: shouldKeepBgRemoved,
                    adapted,
                    remastered: null,
                    mode: logoA.mode || 'original'
                };
                setLogoA(newLogoA);

                const updatedMockups = await refreshMockupsForLogo(newLogoA, logoB);
                await saveSession(newLogoA, logoB, logoPlacements, userData, updatedMockups, true);
            } else {
                const newLogoB: BtpLogo = {
                    id: 'B',
                    original,
                    rawOriginal: paddedBase64,
                    noBg: shouldKeepBgRemoved ? original : null,
                    isBgRemoved: shouldKeepBgRemoved,
                    adapted,
                    remastered: null,
                    mode: logoB.mode || logoA.mode || 'original'
                };
                setLogoB(newLogoB);

                const updatedPlacements: Record<string, 'A' | 'B'> = {
                    ...logoPlacements
                };
                setLogoPlacements(updatedPlacements);

                const updatedMockups = await refreshMockupsForLogo(newLogoB, logoA, updatedPlacements);
                await saveSession(logoA, newLogoB, updatedPlacements, userData, updatedMockups, true);
            }
        } catch (err) {
            console.error("Crop error:", err);
        } finally {
            setIsAnalyzing(false);
            setStatusMessage("");
        }
    };

    /**
     * Pipeline de Super-Résolution & Vectorisation Haute Définition pour Refonte Textile (DTF 300 DPI / Broderie / VTON)
     * 1. Optimisation du contraste et vectorisation/lissage haute définition (super-résolution).
     * 2. Application des variantes chromatiques (ex: Blanc pur textile, couleurs d'origine rehaussées).
     * 3. Exportation d'un asset HD transparent haute fidélité prêt pour le DTF/broderie et le pipeline de mannequins VTON.
     */
    const performSuperResolution = async (
        sourceBase64: string,
        targetColor: 'white' | 'black' | 'color' = 'white',
        scaleMultiplier: number = 4
    ): Promise<string> => {
        // 1. Optimisation IA vectorielle Gemini si disponible (DTF 300 DPI)
        let aiVectorized: string | null = null;
        try {
            aiVectorized = await geminiService.remasterLogo(sourceBase64, targetColor);
        } catch (aiErr) {
            console.warn("[Super-Résolution] Fallback sur le moteur local haute résolution:", aiErr);
        }

        const inputToUpscale = aiVectorized || sourceBase64;

        // 2. Traitement Super-Résolution Canvas (lissage sub-pixel + sur-échantillonnage 300 DPI jusqu'à 3600px)
        const img = await loadImage(inputToUpscale);
        const naturalW = img.naturalWidth || img.width || 1000;
        const naturalH = img.naturalHeight || img.height || 1000;

        const maxDim = 3600;
        let targetW = naturalW * scaleMultiplier;
        let targetH = naturalH * scaleMultiplier;
        if (targetW > maxDim || targetH > maxDim) {
            if (targetW > targetH) {
                targetH = Math.round((naturalH * maxDim) / naturalW);
                targetW = maxDim;
            } else {
                targetW = Math.round((naturalW * maxDim) / naturalH);
                targetH = maxDim;
            }
        }

        const hdCanvas = document.createElement('canvas');
        hdCanvas.width = targetW;
        hdCanvas.height = targetH;
        const hdCtx = hdCanvas.getContext('2d', { willReadFrequently: true });
        if (!hdCtx) {
            const invertMode = targetColor === 'white' ? 'white' : (targetColor === 'black' ? 'black' : false);
            return processLogoDeterministic(inputToUpscale, invertMode, true);
        }

        // Optimisation dynamique du contraste et de la saturation
        if (targetColor === 'white') {
            hdCtx.filter = 'contrast(130%) brightness(105%)';
        } else if (targetColor === 'color') {
            hdCtx.filter = 'contrast(115%) saturate(120%)';
        } else {
            hdCtx.filter = 'contrast(130%) brightness(95%)';
        }
        hdCtx.imageSmoothingEnabled = true;
        hdCtx.imageSmoothingQuality = 'high';
        hdCtx.drawImage(img, 0, 0, targetW, targetH);

        const intermediate = hdCanvas.toDataURL('image/png', 1.0);

        // 3. Application des variantes chromatiques & vectorisation/détourage transparent haute fidélité
        const invertMode = targetColor === 'white' ? 'white' : (targetColor === 'black' ? 'black' : false);
        const hdTransparentAsset = await processLogoDeterministic(intermediate, invertMode, true);

        return hdTransparentAsset;
    };

    const handleAiRemaster = async (slot: 'A' | 'B', targetColor: 'white' | 'black' | 'color' = 'white') => {
        const logo = slot === 'A' ? logoA : logoB;
        if (!logo || (!logo.original && !logo.rawOriginal)) return;

        const sourceInput = logo.rawOriginal || logo.original!;

        try {
            setRemasterStep(
                targetColor === 'color'
                    ? "SUPER-RÉSOLUTION & REFONTE COULEUR VECTORIELLE (DTF 300 DPI)..."
                    : "SUPER-RÉSOLUTION & REFONTE BLANC PUR HAUTE-PRÉCISION (DTF 300 DPI)..."
            );
            setIsAnalyzing(true);

            // Exécution complète du pipeline Super-Résolution & Refonte
            const remastered = await performSuperResolution(sourceInput, targetColor, 4);

            const nextLogo: BtpLogo = {
                ...logo,
                rawOriginal: logo.rawOriginal || sourceInput,
                remastered,
                adapted: targetColor === 'white' ? remastered : logo.adapted,
                isBgRemoved: true,
                mode: 'remastered'
            };

            if (slot === 'A') setLogoA(nextLogo);
            else setLogoB(nextLogo);

            if (sessionId) {
                await dbSet(`${sessionId}_${slot}_remastered`, remastered);
                if (targetColor === 'white') {
                    await dbSet(`${sessionId}_${slot}_adapt`, remastered);
                }
            }

            // Mise à jour immédiate des gabarits et sauvegarde de la session
            const updatedLogoA = slot === 'A' ? nextLogo : logoA;
            const updatedLogoB = slot === 'B' ? nextLogo : logoB;
            const updatedMockups = await refreshMockupsForLogo(nextLogo, slot === 'A' ? logoB : logoA);
            saveSession(updatedLogoA, updatedLogoB, logoPlacements, userData, updatedMockups, false);
        } catch (e) {
            console.error("Super-Resolution Remaster Error:", e);
            alert("Erreur lors de la modernisation haute définition du logo. Veuillez réessayer.");
        } finally {
            setRemasterStep(null);
            setIsAnalyzing(false);
        }
    };

    const selectedGarments = mockups.filter(m => m.selected && isMockupEligible(m));
    const isAnyMockupGenerating = mockups.some(m => m.selected && isMockupEligible(m) && m.isGenerating);
    const hasAnyGeneratedMockup = mockups.some(m => m.selected && isMockupEligible(m) && (m.ai !== null || m.aiRemastered !== null || (m as any).hasAi || m.mechanical !== null));
    const areAllSelectedMockupsGenerated = hasAnyGeneratedMockup || (
        selectedGarments.length >= 1 &&
        selectedGarments.every(m => {
            const slot = resolveSlotForPlacement(m.id, logoPlacements);
            const logo = slot === 'A' ? logoA : logoB;
            return logo.mode === 'remastered' ? (m.aiRemastered !== null || m.ai !== null) : (m.ai !== null || m.aiRemastered !== null);
        })
    );
    // const isAccessDisabled = isAnyMockupGenerating || isSyncingShop || selectedGarments.length < 1;
    const isAccessDisabled = false;

    const startSimulation = async (e?: React.MouseEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }

        const isGenerating = isRegenerating || isAnyMockupGenerating;
        console.log("[DEBUG_BUTTON_CLICK]", {
            selectedGarmentsCount: selectedGarments?.length,
            mockupsRefCount: mockupsRef.current?.filter(m => m.selected && isMockupEligible(m))?.length,
            isGenerating,
            isAccessDisabled: typeof isAccessDisabled === 'function' ? (isAccessDisabled as any)() : isAccessDisabled
        });

        const isAdmin = userData.email === 'logosigneed@gmail.com';
        /*
        const hasAnyLogo = !!((logoA && logoA.original) || (logoB && logoB.original));
        if (!isAdmin && !hasAnyLogo) {
            console.warn("[ABORT_REASON]", "startSimulation: Aucun logo chargé (hasAnyLogo === false && !isAdmin)");
            alert("Veuillez charger un logo avant de générer la page produit.");
            return;
        }
        */

        const refSelected = mockupsRef.current?.filter(m => m.selected && isMockupEligible(m)) || [];
        const stateSelected = mockups.filter(m => m.selected && isMockupEligible(m)) || [];
        const currentItems = (refSelected.length > 0)
            ? mockupsRef.current
            : (stateSelected.length > 0 ? mockups : ((mockupsRef.current && mockupsRef.current.length > 0) ? mockupsRef.current : mockups));
        const currentSelectedGarments = currentItems.filter(m => m.selected && isMockupEligible(m));

        console.log("[DEBUG_PIPELINE_ENTRY]", {
            mockupsLength: mockups?.length,
            mockupsRefLength: mockupsRef.current?.length,
            currentSelectedGarments: currentSelectedGarments?.map(m => ({ id: m.id, selected: m.selected })),
            hasSingleId: typeof (window as any).singleId !== 'undefined' ? (window as any).singleId : null
        });

        if (!currentSelectedGarments || currentSelectedGarments.length < 1) {
            console.warn("[ABORT_REASON]", "startSimulation: Aucun gabarit éligible sélectionné (currentSelectedGarments.length < 1). Au moins 1 élément ou vue est requis.");
            return;
        }

        const firstSelectedIndex = currentItems.findIndex(m => m.selected && isMockupEligible(m));
        if (firstSelectedIndex !== -1) {
            setActiveMockupIndex(firstSelectedIndex);
        }

        // ═══════════════════════════════════════════════════════════════════
        // FIX DÉBLOCAGE BOUTON : Déclencher l'état visuel ET le pipeline
        // 100% SYNCHRONE dès le clic — AVANT tout await réseau/Firestore
        // ═══════════════════════════════════════════════════════════════════

        // ÉTAPE 1 SYNCHRONE : Basculer immédiatement en mode AUDIT (animation IA)
        setState('AUDIT');
        setIsRegenerating(true);

        // ÉTAPE 2 SYNCHRONE : Lancer immédiatement le pipeline séquentiel IA
        console.log("[DEBUG_CALLING_PIPELINE] Lancement immédiat du pipeline (avant await)...");
        startSequentialPipeline(userData, undefined, currentItems).catch(err => {
            console.error("Background rendering error:", err);
        });
        scrollToResults();

        // ÉTAPE 3 ASYNCHRONE : Tâches réseau en arrière-plan (sans bloquer l'UI)
        const uidParam = new URLSearchParams(window.location.search).get('uid');
        const activeLogo = (logoA && logoA.original) ? logoA : logoB;
        const logoSrc = activeLogo.mode === 'remastered'
            ? (activeLogo.remastered || activeLogo.adapted || activeLogo.original)
            : (activeLogo.mode === 'original'
                ? (activeLogo.original || activeLogo.adapted)
                : (activeLogo.adapted || activeLogo.original));

        // Sync config Firestore en tâche de fond (non-bloquant)
        if (uidParam) {
            (async () => {
                try {
                    const config = await getStoredConfig(uidParam);
                    if (config) {
                        if (logoSrc) config.logoUrl = logoSrc;
                        if (sessionId) {
                            config.generatedKey = sessionId;
                            config.actuationKey = sessionId;
                        }
                        config.merchUrl = `${window.location.origin}/portail-shop?uid=${uidParam}`;
                        await saveStoredConfig(config, uidParam);
                    }
                } catch (err) {
                    console.error("Failed to sync logo on simulation click (background):", err);
                }
            })();
        }

        // Capture lead en tâche de fond (non-bloquant)
        if (isInbound && !isAdmin) {
            (async () => {
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
                    console.error("Lead capture error (background):", e);
                }
            })();
        }
    };

    const handleStartGeneration = (e?: React.MouseEvent) => {
        console.log("[DEBUG_HANDLE_START_GEN] Appelé", { e });
        return startSimulation(e);
    };
    const generateAllAiMockups = handleStartGeneration;

    const handleContinueToSimulation = () => {
        const currentItems = (mockupsRef.current && mockupsRef.current.length > 0) ? mockupsRef.current : mockups;
        const firstSelectedIndex = currentItems.findIndex(m => m.selected);
        if (firstSelectedIndex !== -1) {
            setActiveMockupIndex(firstSelectedIndex);
        }
        setState('AUDIT');
        startSequentialPipeline(undefined, undefined, currentItems);
        scrollToResults();
    };

    const handleAuthSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const email = formData.get('email') as string;

        // SYNC CREDITS WITH ACCOUNT
        let userCredits = credits;
        try {
            if (email === 'logosigneed@gmail.com') {
                userCredits = 999;
                safeLocalStorageSetItem(`btp_credits_${email}`, '999');
                setIsIpBlocked(false);
            } else {
                const savedCredits = localStorage.getItem(`btp_credits_${email}`);
                if (savedCredits !== null) {
                    userCredits = parseInt(savedCredits);
                } else {
                    // New account gets 3 credits
                    userCredits = 3;
                    safeLocalStorageSetItem(`btp_credits_${email}`, '3');
                }
            }
        } catch (e) {
            console.warn("[Storage] credits save notice:", e);
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
        try {
            safeLocalStorageSetItem('btp_stay_logged_in', stayLoggedIn.toString());
            if (stayLoggedIn) {
                safeLocalStorageSetItem('btp_last_email', email);
            } else {
                localStorage.removeItem('btp_last_email');
            }
            safeLocalStorageSetItem(`btp_user_data_${email}`, JSON.stringify(newUserData));
        } catch (e) {
            console.warn("[Storage] user data save notice:", e);
        }

        saveSession(logoA, logoB, logoPlacements, newUserData, mockups, false);
    };

    if (!isLoaded) {
        return (
            <div className="fixed inset-0 bg-[#020202] flex flex-col items-center justify-center gap-8 z-[9999]">
                <div className="w-16 h-16 bg-orange-600 flex items-center justify-center font-black text-black text-3xl shadow-[8px_8px_0_white] animate-pulse">S</div>
                <div className="text-orange-600 font-black text-[10px] tracking-[0.5em] uppercase italic animate-pulse">Initialisation Système Signaid Studio</div>
            </div>
        );
    }
    return (
        <div className={`min-h-screen ${isLightMode ? 'bg-gray-50 text-gray-900' : 'bg-[#020202] text-zinc-100'} font-sans selection:bg-orange-500 selection:text-black italic uppercase transition-colors duration-500 pb-44`}>
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
                        className={`text-[10px] font-black tracking-widest uppercase px-4 py-2 border transition-all flex items-center gap-2 ${isLightMode
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
                                                        <div className="flex flex-wrap gap-2">
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
                                                                type="button"
                                                                onClick={() => handleToggleBackground(logo.id)}
                                                                className={`px-3 py-1 font-black text-[9px] border transition-all flex items-center gap-1 ${
                                                                    logo.isBgRemoved
                                                                        ? (isLightMode ? 'bg-orange-100 text-orange-700 border-orange-400 hover:bg-orange-200' : 'bg-orange-950/40 text-orange-400 border-orange-600 hover:bg-orange-900/60')
                                                                        : (isLightMode ? 'text-gray-600 border-gray-200 hover:text-orange-600 hover:border-orange-400' : 'text-zinc-400 border-zinc-800 hover:text-white hover:border-zinc-700')
                                                                }`}
                                                                title={logo.isBgRemoved ? "Rétablir le fond d'origine de la source" : "Détourer le logo : retirer le fond"}
                                                            >
                                                                {logo.isBgRemoved ? '↩️ RÉTABLIR LE FOND' : '🪄 RETIRER LE FOND'}
                                                            </button>
                                                            <button
                                                                onClick={async () => {
                                                                    const next = { ...logo, mode: 'original' as const };
                                                                    if (logo.id === 'A') setLogoA(next); else setLogoB(next);
                                                                    await refreshMockupsForLogo(next, logo.id === 'A' ? logoB : logoA);
                                                                }}
                                                                className={`px-3 py-1 font-black text-[9px] border ${logo.mode === 'original' ? (isLightMode ? 'bg-gray-900 text-white border-gray-900' : 'bg-zinc-50 text-black border-zinc-50') : (isLightMode ? 'text-gray-400 border-gray-100 hover:text-gray-900' : 'text-zinc-600 border-zinc-900 hover:text-white')}`}
                                                            >
                                                                VERSION DE BASE
                                                            </button>
                                                            <button
                                                                onClick={async () => {
                                                                    if (logo.remastered) {
                                                                        const next = { ...logo, mode: 'remastered' as const };
                                                                        if (logo.id === 'A') setLogoA(next); else setLogoB(next);
                                                                        await refreshMockupsForLogo(next, logo.id === 'A' ? logoB : logoA);
                                                                    } else {
                                                                        await handleAiRemaster(logo.id, 'white');
                                                                    }
                                                                }}
                                                                className={`px-3 py-1 font-black text-[9px] border transition-all ${
                                                                    logo.mode === 'remastered'
                                                                        ? 'bg-orange-600 text-black border-orange-600 font-bold'
                                                                        : (logo.remastered
                                                                            ? (isLightMode ? 'text-gray-700 border-orange-400 hover:bg-orange-50' : 'text-zinc-300 border-orange-600/60 hover:bg-zinc-800')
                                                                            : (isLightMode ? 'text-orange-600 border-orange-300 hover:bg-orange-500 hover:text-white' : 'text-orange-400 border-orange-600/50 hover:bg-orange-600 hover:text-black'))
                                                                }`}
                                                                title={logo.remastered ? "Activer la refonte haute définition" : "Lancer la refonte intelligente avec Super-Résolution DTF"}
                                                            >
                                                                {logo.remastered ? '✨ REFONTE ACTIVE' : '⚡ REFONTE INTELLIGENTE'}
                                                            </button>
                                                            <button
                                                                onClick={async () => {
                                                                    const next = { ...logo, mode: 'adapted' as const };
                                                                    if (logo.id === 'A') setLogoA(next); else setLogoB(next);
                                                                    await refreshMockupsForLogo(next, logo.id === 'A' ? logoB : logoA);
                                                                }}
                                                                className={`px-3 py-1 font-black text-[9px] border ${logo.mode === 'adapted' ? (isLightMode ? 'bg-gray-900 text-white border-gray-900' : 'bg-zinc-50 text-black border-zinc-50') : (isLightMode ? 'text-gray-400 border-gray-100 hover:text-gray-900' : 'text-zinc-600 border-zinc-900 hover:text-white')}`}
                                                            >
                                                                BLANC V24
                                                            </button>
                                                            {logo.original && (
                                                                <>
                                                                    <button
                                                                        onClick={() => openCropModal(logo.id, 'poly')}
                                                                        className={`px-3 py-1 font-black text-[9px] border border-orange-600 text-orange-600 hover:bg-orange-600 hover:text-black transition-all flex items-center gap-1`}
                                                                        title={`Rogner / Recadrer la source Logo ${logo.id}`}
                                                                    >
                                                                        <Crop size={10} /> ROGNER
                                                                    </button>
                                                                    <button
                                                                        onClick={() => openCropModal(logo.id, 'eraser')}
                                                                        className={`px-3 py-1 font-black text-[9px] border border-orange-600 text-orange-600 hover:bg-orange-600 hover:text-black transition-all flex items-center gap-1`}
                                                                        title={`Gommer des éléments sur le Logo ${logo.id}`}
                                                                    >
                                                                        <Crop size={10} /> GOMMER
                                                                    </button>
                                                                </>
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
                                                                onClick={() => openCropModal('B', 'poly')}
                                                                className="flex items-center gap-2 px-4 py-2 bg-orange-600/10 hover:bg-orange-600 text-orange-600 hover:text-black font-black text-[9px] uppercase italic tracking-tighter transition-all border border-orange-600/30"
                                                            >
                                                                <Crop size={14} /> Rogner depuis Logo A
                                                            </button>
                                                        )}
                                                        {logo.id === 'A' && logoB.original && (
                                                            <button
                                                                onClick={() => openCropModal('A', 'poly')}
                                                                className="flex items-center gap-2 px-4 py-2 bg-orange-600/10 hover:bg-orange-600 text-orange-600 hover:text-black font-black text-[9px] uppercase italic tracking-tighter transition-all border border-orange-600/30"
                                                            >
                                                                <Crop size={14} /> Rogner depuis Logo B
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {logo.original && (
                                                <div className="space-y-2 pt-2">
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleAiRemaster(logo.id, 'white'); }}
                                                            className="py-3 bg-orange-600 text-black font-black text-[9px] uppercase italic tracking-tighter hover:bg-white hover:text-black transition-all shadow-xl flex items-center justify-center gap-1.5 rounded-lg border border-orange-600"
                                                            title="Créer une refonte vectorielle haute précision en BLANC PUR avec Super-Résolution DTF 300 DPI"
                                                        >
                                                            <Wand2 size={12} /> REFONTE EN BLANC (SUPER-RÉSOLUTION)
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleAiRemaster(logo.id, 'color'); }}
                                                            className={`py-3 font-black text-[9px] uppercase italic tracking-tighter transition-all shadow-xl flex items-center justify-center gap-1.5 rounded-lg border ${isLightMode ? 'bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200' : 'bg-zinc-900 text-zinc-200 border-zinc-800 hover:bg-zinc-800'}`}
                                                            title="Créer une refonte vectorielle nettoyée en COULEURS D'ORIGINE avec Super-Résolution DTF 300 DPI"
                                                        >
                                                            <Wand2 size={12} /> REFONTE COULEUR (SUPER-RÉSOLUTION)
                                                        </button>
                                                    </div>
                                                    <div className="flex items-center justify-between px-1 text-[9px]">
                                                        <button
                                                            type="button"
                                                            onClick={(e) => { e.stopPropagation(); handleToggleBackground(logo.id); }}
                                                            className={`py-1.5 px-3 rounded font-black text-[9px] tracking-wider uppercase flex items-center gap-1.5 border transition-all ${
                                                                logo.isBgRemoved
                                                                    ? 'bg-orange-600/10 text-orange-500 border-orange-500/50 hover:bg-orange-600 hover:text-black'
                                                                    : (isLightMode ? 'bg-zinc-100 text-zinc-700 border-zinc-300 hover:bg-zinc-200' : 'bg-zinc-800/40 text-zinc-300 border-zinc-700 hover:bg-zinc-700 hover:text-white')
                                                            }`}
                                                        >
                                                            {logo.isBgRemoved ? '↩️ Rétablir le fond d\'origine' : '🪄 Retirer le fond (Détourage transparent)'}
                                                        </button>
                                                        {logo.remastered ? (
                                                            <span className="text-[8px] font-black uppercase tracking-widest text-emerald-500 flex items-center gap-1">
                                                                <CheckCircle2 size={10} /> Super-Résolution HD active (DTF 300 DPI)
                                                            </span>
                                                        ) : (
                                                            <span className={`text-[8px] font-medium tracking-wide ${isLightMode ? 'text-zinc-500' : 'text-zinc-500'}`}>
                                                                {logo.isBgRemoved ? 'Fond transparent actif' : 'Fond brut conservé par défaut'}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                <div className={`${isLightMode ? 'bg-white border-gray-200' : 'bg-zinc-950 border-zinc-900'} border p-8 space-y-12 shadow-2xl`}>
                                    {/* PANNEAU ACCORDÉON : VESTIAIRE & ARTICLES ÉLIGIBLES (PRODUCTAID) */}
                                    <div className={`border transition-all ${isLightMode ? 'bg-zinc-50/90 border-gray-200 shadow-sm' : 'bg-zinc-900/60 border-zinc-800 shadow-xl'} rounded-xl p-5`}>
                                        <div
                                            className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 cursor-pointer select-none"
                                            onClick={() => setIsVestiaireAccordionOpen(!isVestiaireAccordionOpen)}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-orange-600/10 border border-orange-600/30 flex items-center justify-center text-orange-600 shadow-sm">
                                                    <Shirt size={20} />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h3 className={`font-black text-sm uppercase italic tracking-tight ${isLightMode ? 'text-gray-900' : 'text-zinc-100'}`}>
                                                            Vestiaire & Articles Éligibles
                                                        </h3>
                                                        <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-orange-600 text-black">
                                                            ProductAid
                                                        </span>
                                                    </div>
                                                    <p className={`text-[10px] font-medium tracking-wide ${isLightMode ? 'text-gray-500' : 'text-zinc-400'}`}>
                                                        Sélectionnez les articles du catalogue inclus dans cet audit et la génération IA.
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3 self-end sm:self-center" onClick={e => e.stopPropagation()}>
                                                <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded border ${isLightMode ? 'bg-white border-gray-200 text-gray-700' : 'bg-zinc-900 border-zinc-800 text-zinc-300'
                                                    }`}>
                                                    {auditCatalog.filter(p => isProductActive(p.id)).length} / {auditCatalog.length} ACTIFS
                                                </span>
                                                <div className="flex items-center gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={(e) => { e.stopPropagation(); handleSelectAllProducts(); }}
                                                        className={`px-2.5 py-1 text-[9px] font-black uppercase rounded border transition-colors ${isLightMode
                                                            ? 'bg-white border-gray-300 text-gray-700 hover:bg-gray-100 hover:text-black'
                                                            : 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white'
                                                            }`}
                                                    >
                                                        Tout cocher
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => { e.stopPropagation(); handleDeselectAllProducts(); }}
                                                        className={`px-2.5 py-1 text-[9px] font-black uppercase rounded border transition-colors ${isLightMode
                                                            ? 'bg-white border-gray-300 text-gray-700 hover:bg-gray-100 hover:text-black'
                                                            : 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white'
                                                            }`}
                                                    >
                                                        Tout décocher
                                                    </button>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setIsVestiaireAccordionOpen(!isVestiaireAccordionOpen)}
                                                    className={`p-1.5 rounded hover:bg-orange-600/10 transition-colors ${isLightMode ? 'text-gray-600' : 'text-zinc-400'}`}
                                                    aria-label="Afficher ou masquer le vestiaire"
                                                >
                                                    {isVestiaireAccordionOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                                </button>
                                            </div>
                                        </div>

                                        {isVestiaireAccordionOpen && (
                                            <div className="mt-5 pt-5 border-t border-dashed border-gray-200 dark:border-zinc-800">
                                                {isLoadingCatalog ? (
                                                    <div className="flex items-center justify-center py-8 gap-3">
                                                        <Loader2 size={20} className="animate-spin text-orange-600" />
                                                        <span className={`text-xs font-bold tracking-wider uppercase ${isLightMode ? 'text-gray-500' : 'text-zinc-400'}`}>
                                                            Chargement du catalogue ProductAid...
                                                        </span>
                                                    </div>
                                                ) : auditCatalog.length === 0 ? (
                                                    <div className="text-center py-6 text-xs text-zinc-500 font-bold uppercase tracking-wider">
                                                        Aucun article dans le catalogue ProductAid.
                                                    </div>
                                                ) : (
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                                                        {auditCatalog.map((prod) => {
                                                            const active = isProductActive(prod.id);
                                                            const matchingFront = mockups.find(m => isMockupMatchingProduct(m, prod) && (m.view === 'front' || m.id.toLowerCase().includes('front')));
                                                            const matchingBack = mockups.find(m => isMockupMatchingProduct(m, prod) && (m.view === 'back' || m.id.toLowerCase().includes('back') || m.id.toLowerCase().includes('dos')));
                                                            const frontImg = prod.mockups?.front || prod.frontImageUrl || prod.imageUrl || matchingFront?.base || '';
                                                            const backImg = prod.mockups?.back || prod.backImageUrl || prod.imageUrl || matchingBack?.base || '';

                                                            return (
                                                                <div
                                                                    key={prod.id}
                                                                    onClick={() => handleToggleProduct(prod.id)}
                                                                    className={`relative cursor-pointer rounded-lg border-2 p-3 transition-all flex flex-col justify-between select-none ${active
                                                                        ? (isLightMode
                                                                            ? 'bg-white border-orange-500 shadow-md ring-1 ring-orange-500/20'
                                                                            : 'bg-zinc-900 border-orange-500 shadow-lg shadow-orange-950/20')
                                                                        : (isLightMode
                                                                            ? 'bg-gray-100/60 border-gray-200 opacity-60 hover:opacity-90'
                                                                            : 'bg-zinc-950 border-zinc-800 opacity-50 hover:opacity-80')
                                                                        }`}
                                                                >
                                                                    {/* Header: SKU & Toggle Switch */}
                                                                    <div className="flex items-center justify-between gap-2 mb-2">
                                                                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold tracking-wider uppercase ${active
                                                                            ? 'bg-orange-600/10 text-orange-600 border border-orange-600/30'
                                                                            : (isLightMode ? 'bg-gray-200 text-gray-500' : 'bg-zinc-800 text-zinc-500')
                                                                            }`}>
                                                                            {prod.sku}
                                                                        </span>

                                                                        {/* Toggle Switch */}
                                                                        <div
                                                                            className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors ${active ? 'bg-orange-600 justify-end' : (isLightMode ? 'bg-gray-300 justify-start' : 'bg-zinc-700 justify-start')
                                                                                }`}
                                                                        >
                                                                            <div className="w-4 h-4 rounded-full bg-white shadow-md transform transition-transform" />
                                                                        </div>
                                                                    </div>

                                                                    {/* Dual Miniatures Face / Dos */}
                                                                    <div className={`grid grid-cols-2 gap-1.5 p-1 rounded-md mb-2 border ${isLightMode ? 'bg-gray-50 border-gray-200' : 'bg-black/50 border-zinc-800/80'
                                                                        }`}>
                                                                        <div className="relative aspect-square flex flex-col items-center justify-center overflow-hidden rounded bg-black/10">
                                                                            {frontImg ? (
                                                                                <img
                                                                                    src={frontImg}
                                                                                    alt={`${prod.title} Face`}
                                                                                    className="max-h-full max-w-full object-contain"
                                                                                    loading="lazy"
                                                                                />
                                                                            ) : (
                                                                                <div className="w-full h-full flex items-center justify-center text-[8px] text-zinc-500">
                                                                                    N/A
                                                                                </div>
                                                                            )}
                                                                            <span className="absolute bottom-0.5 left-0.5 px-1 rounded text-[7px] font-black uppercase bg-black/70 text-white">
                                                                                Face
                                                                            </span>
                                                                        </div>
                                                                        <div className="relative aspect-square flex flex-col items-center justify-center overflow-hidden rounded bg-black/10">
                                                                            {backImg ? (
                                                                                <img
                                                                                    src={backImg}
                                                                                    alt={`${prod.title} Dos`}
                                                                                    className="max-h-full max-w-full object-contain"
                                                                                    loading="lazy"
                                                                                />
                                                                            ) : (
                                                                                <div className="w-full h-full flex items-center justify-center text-[8px] text-zinc-500">
                                                                                    N/A
                                                                                </div>
                                                                            )}
                                                                            <span className="absolute bottom-0.5 left-0.5 px-1 rounded text-[7px] font-black uppercase bg-black/70 text-white">
                                                                                Dos
                                                                            </span>
                                                                        </div>
                                                                    </div>

                                                                    {/* Title & Pricing Info */}
                                                                    <div className="space-y-0.5">
                                                                        <p className={`font-black text-[11px] leading-tight line-clamp-2 uppercase italic tracking-tight ${active
                                                                            ? (isLightMode ? 'text-gray-900' : 'text-zinc-100')
                                                                            : (isLightMode ? 'text-gray-400' : 'text-zinc-500')
                                                                            }`}>
                                                                            {prod.title}
                                                                        </p>
                                                                        <div className="flex items-center justify-between text-[9px] pt-1">
                                                                            <span className={isLightMode ? 'text-gray-500' : 'text-zinc-400'}>
                                                                                {prod.weightGsm ? `${prod.weightGsm}g` : (prod.category || 'Textile')}
                                                                            </span>
                                                                            {prod.pricing?.retailPriceTtc && (
                                                                                <span className="font-bold text-orange-600">
                                                                                    {prod.pricing.retailPriceTtc.toFixed(2)}€
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

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
                                                        <button
                                                            onClick={() => changeGlobalLogoColor('knockout_black')}
                                                            className={`px-2.5 py-0.5 font-black text-[8px] uppercase rounded transition-all ${globalLogoColorMode === 'knockout_black' ? 'bg-amber-500 text-black shadow' : 'text-amber-500/70 hover:text-amber-300'}`}
                                                            title="Retirer les noirs du logo (Noir Textile Noir) pour tous"
                                                        >
                                                            Noirs ✂️
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                                            {mockups.filter(isMockupEligible).map((p) => {
                                                const originalIndex = mockups.findIndex(m => m.id === p.id);
                                                return (
                                                    <GabaritCard
                                                        key={p.id}
                                                        item={p}
                                                        index={originalIndex !== -1 ? originalIndex : 0}
                                                        isLightMode={isLightMode}
                                                        placement={resolveSlotForPlacement(p.id, logoPlacements)}
                                                        colorMode={logoColorModes[p.id] || globalLogoColorMode || 'original'}
                                                        hasLogoB={!!(logoB.original || logoB.activeUrl)}
                                                        onToggleSelect={() => {
                                                            setMockups(prev => {
                                                                const updated = prev.map(m => m.id === p.id ? { ...m, selected: !m.selected } : m);
                                                                mockupsRef.current = updated;
                                                                return updated;
                                                            });
                                                        }}
                                                        onPlacementChange={handlePlacementChange}
                                                        onColorModeChange={handleColorModeChange}
                                                    />
                                                );
                                            })}
                                            {mockups.filter(isMockupEligible).length === 0 && (
                                                <div className="col-span-full py-12 text-center text-xs font-bold uppercase tracking-wider text-zinc-500 border border-dashed border-zinc-800 rounded-xl">
                                                    Aucun gabarit éligible sélectionné. Activez au moins un article dans le Vestiaire ProductAid ci-dessus.
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="pt-8 border-t border-white/5 space-y-6 relative z-20">
                                        <div className="flex flex-col gap-4">
                                            <button
                                                type="button"
                                                onMouseDown={() => console.log("[FORCE_MOUSEDOWN] Clic physique détecté")}
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    handleStartGeneration(e);
                                                }}
                                                className={`group w-full py-8 bg-orange-600 text-black font-black text-2xl uppercase italic tracking-tighter transition-all shadow-[8px_8px_0_rgba(234,88,12,0.2)] flex items-center justify-center gap-4 relative z-30 cursor-pointer ${(!selectedGarments || selectedGarments.length < 1)
                                                    ? 'opacity-50 hover:bg-orange-500'
                                                    : 'hover:bg-white hover:text-black'
                                                    }`}
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
                                <div className={`relative aspect-square overflow-hidden bg-zinc-950 w-full max-w-[520px] border shadow-2xl group cursor-default ${isLightMode ? 'border-gray-100' : 'border-zinc-900'}`}>
                                    {(() => {
                                        const m = (mockups[activeMockupIndex] && mockups[activeMockupIndex].selected)
                                            ? mockups[activeMockupIndex]
                                            : (selectedGarments[0] || mockups[activeMockupIndex] || mockups[0]);
                                        const activePreview = m ? (
                                            (m.ai && isRealImage(m.ai) ? m.ai : null) ||
                                            (m.aiRemastered && isRealImage(m.aiRemastered) ? m.aiRemastered : null) ||
                                            ((m as any).imageUrl && isRealImage((m as any).imageUrl) ? (m as any).imageUrl : null) ||
                                            (m.mechanical && isRealImage(m.mechanical) ? m.mechanical : null) ||
                                            m.base ||
                                            ''
                                        ) : '';
                                        return (
                                            <>
                                                <img
                                                    src={activePreview}
                                                    alt={m?.title || 'Aperçu central'}
                                                    className="w-full h-full object-cover object-center animate-reveal-image"
                                                />
                                                {m?.isGenerating && (
                                                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center gap-4 z-10">
                                                        <Loader2 className="text-orange-600 animate-spin" size={44} />
                                                        <span className="text-[11px] font-black tracking-widest text-orange-500 uppercase animate-pulse">
                                                            Génération Mannequin Studio HD...
                                                        </span>
                                                    </div>
                                                )}
                                            </>
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
                                    {selectedGarments.map((m) => {
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

                            <div className="relative z-20 mb-8 flex flex-col items-center gap-4 lg:col-span-12">
                                <p className="text-zinc-600 font-bold text-[9px] tracking-[0.2em] uppercase">Solution Propulsée par Signaid</p>
                                <button
                                    onClick={async (e) => {
                                        e.stopPropagation();
                                        if (isSyncingShop || isAccessDisabled) return;

                                        // 1. FREEZE VISUAL STATE IMMEDIATELY ON CLICK
                                        isVisualFrozenRef.current = true;
                                        hasSyncedProfileRef.current = true;
                                        setIsSyncingShop(true);
                                        try {
                                            const searchParams = new URLSearchParams(window.location.search);
                                            const targetSlug = extractRootSlug(
                                                searchParams,
                                                { slug: routeSlug, auditId },
                                                userData,
                                                sessionId
                                            );
                                            const sid = targetSlug;
                                            if (sessionId !== sid) setSessionId(sid);
                                            const slug = targetSlug;

                                            // Ensure anonymous auth for client SDK storage uploads if needed
                                            if (!auth.currentUser) {
                                                try {
                                                    await signInAnonymously(auth);
                                                } catch (authErr) {
                                                    console.warn("[Auth] Anonymous login notice:", authErr);
                                                }
                                            }

                                            // 1. Snapshot courant strictement gelé (priorité absolue aux images déjà résolues en mémoire)
                                            const currentSnapshot = (mockupsRef.current && mockupsRef.current.length > 0) ? mockupsRef.current : mockups;

                                            // Extraire les images résolues en mémoire ou stockées localement dans IndexedDB (BtpAuditDB / heavy_assets)
                                            const enrichedMockups = await Promise.all(currentSnapshot.map(async (m) => {
                                                // Priorité absolue à l'image IA déjà résolue en mémoire
                                                let activeAi = getResolvedMockupImage(m);

                                                if (!activeAi || (typeof activeAi === 'string' && (activeAi.startsWith('/assets/') || activeAi.startsWith('/merch/')))) {
                                                    const idbAi = await dbGet(`${sid}_ai_${m.id}`)
                                                        || (sessionId && sessionId !== sid ? await dbGet(`${sessionId}_ai_${m.id}`) : null)
                                                        || (slug && slug !== sid ? await dbGet(`${slug}_ai_${m.id}`) : null);
                                                    if (idbAi && isRealImage(idbAi)) {
                                                        activeAi = idbAi;
                                                    }
                                                }

                                                let mechData = getResolvedMechImage(m);
                                                if (!mechData || (typeof mechData === 'string' && (mechData.startsWith('/assets/') || mechData.startsWith('/merch/')))) {
                                                    const idbMech = await dbGet(`${sid}_mech_${m.id}`)
                                                        || (sessionId && sessionId !== sid ? await dbGet(`${sessionId}_mech_${m.id}`) : null)
                                                        || (slug && slug !== sid ? await dbGet(`${slug}_mech_${m.id}`) : null);
                                                    if (idbMech && isRealImage(idbMech)) {
                                                        mechData = idbMech;
                                                    }
                                                }

                                                const resolvedAi = isRealImage(activeAi) ? activeAi : null;
                                                const resolvedMech = isRealImage(mechData) ? mechData : null;
                                                const rawImg = (m as any).imageUrl;
                                                const resolvedImg = isRealImage(rawImg) ? rawImg : null;
                                                const primary = resolvedAi || resolvedMech || resolvedImg || null;
                                                const isBack = m.view === 'back' || isBackId(m.id);

                                                return {
                                                    ...m,
                                                    ai: resolvedAi,
                                                    aiRemastered: resolvedAi,
                                                    mechanical: resolvedMech,
                                                    imageUrl: primary,
                                                    frontImageUrl: isBack ? undefined : primary,
                                                    backImageUrl: isBack ? primary : undefined,
                                                    imageFront: isBack ? undefined : primary,
                                                    imageBack: isBack ? primary : undefined
                                                };
                                            }));

                                            // 2. Filtrer les mockups sélectionnés ayant un rendu réel (mannequin IA)
                                            // Exclusion stricte de tout gabarit 2D mécanique, produit non coché ou non encore généré
                                            const selectedWithRender = enrichedMockups.filter(m => {
                                                if (!m.selected) return false;
                                                if (!isMockupEligible(m)) return false;
                                                const hasAi = isRealAiImage(m.ai) || isRealAiImage((m as any).aiRemastered);
                                                return hasAi;
                                            });
                                            if (selectedWithRender.length === 0) {
                                                alert("Veuillez sélectionner et générer au moins un vêtement avec son mannequin studio IA avant d'accéder à la boutique.");
                                                isVisualFrozenRef.current = false;
                                                setIsSyncingShop(false);
                                                return;
                                            }

                                            const selectedWithRenderIds = new Set(selectedWithRender.map(m => m.id));

                                            // 3. Implémentation du transfert IndexedDB vers Storage via SDK client direct
                                            const uploadedMockupsMap: Record<string, { aiUrl: string | null; mechUrl: string | null }> = {};

                                            await Promise.all(selectedWithRender.map(async (m) => {
                                                let aiUrl = (m as any).aiRemastered || m.ai || null;
                                                let mechUrl = m.mechanical || null;

                                                // Si la source est un Base64 / DataURL local, uploader vers btp_mockups/${slug}/web/${m.id}.png
                                                if (aiUrl && typeof aiUrl === 'string') {
                                                    if (aiUrl.startsWith('https://') || aiUrl.startsWith('http://')) {
                                                        // Si l'image est déjà une URL distante (https://...), ne pas la réuploader
                                                    } else if (aiUrl.startsWith('data:') || aiUrl.startsWith('blob:') || aiUrl.length > 50) {
                                                        try {
                                                            const storagePath = `btp_mockups/${slug}/web/${m.id}.png`;
                                                            const storageRef = ref(storage, storagePath);
                                                            const base64Data = aiUrl.startsWith('data:') ? aiUrl : `data:image/png;base64,${aiUrl}`;
                                                            const match = base64Data.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,/);
                                                            const contentType = match ? match[1] : 'image/png';
                                                            const metadata: UploadMetadata = {
                                                                contentType,
                                                                cacheControl: 'public, max-age=3600, must-revalidate'
                                                            };
                                                            await uploadString(storageRef, base64Data, 'data_url', metadata);
                                                            aiUrl = await getDownloadURL(storageRef);
                                                            console.log(`-> Upload réussi [${m.id}] vers ${storagePath}`);
                                                        } catch (upErr) {
                                                            console.warn(`Direct upload failed for ${m.id} (preserving existing base64):`, upErr);
                                                        }
                                                    }
                                                }

                                                if (mechUrl && typeof mechUrl === 'string') {
                                                    if (mechUrl.startsWith('https://') || mechUrl.startsWith('http://')) {
                                                        // Si l'image est déjà une URL distante (https://...), ne pas la réuploader
                                                    } else if (mechUrl.startsWith('data:') || mechUrl.startsWith('blob:') || mechUrl.length > 50) {
                                                        try {
                                                            const storagePath = `btp_mockups/${slug}/web/${m.id}_mech.png`;
                                                            const storageRef = ref(storage, storagePath);
                                                            const base64Data = mechUrl.startsWith('data:') ? mechUrl : `data:image/png;base64,${mechUrl}`;
                                                            const match = base64Data.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,/);
                                                            const contentType = match ? match[1] : 'image/png';
                                                            const metadata: UploadMetadata = {
                                                                contentType,
                                                                cacheControl: 'public, max-age=3600, must-revalidate'
                                                            };
                                                            await uploadString(storageRef, base64Data, 'data_url', metadata);
                                                            mechUrl = await getDownloadURL(storageRef);
                                                            console.log(`-> Upload réussi [${m.id}_mech] vers ${storagePath}`);
                                                        } catch (upErr) {
                                                            console.warn(`Direct mech upload failed for ${m.id} (preserving existing base64):`, upErr);
                                                        }
                                                    }
                                                }

                                                uploadedMockupsMap[m.id] = { aiUrl, mechUrl };
                                            }));

                                            // Mise à jour de tous les gabarits sur la copie locale isolée (sanctuarisation des images IA)
                                            const mockupsWithPublicUrls = enrichedMockups.map(m => {
                                                const uploaded = uploadedMockupsMap[m.id];
                                                const rawAi = uploaded?.aiUrl || (m as any).aiRemastered || m.ai || null;
                                                const finalAi = isRealImage(rawAi) ? rawAi : null;
                                                const rawMech = uploaded?.mechUrl || m.mechanical || null;
                                                const finalMech = isRealImage(rawMech) ? rawMech : null;
                                                const rawImg = (m as any).imageUrl;
                                                const finalImg = isRealImage(rawImg) ? rawImg : null;
                                                const primary = finalAi || finalMech || finalImg || null;
                                                const isBack = m.view === 'back' || isBackId(m.id);

                                                const mIdLower = (m.id || '').toLowerCase();
                                                const mAny = m as any;
                                                const isWhiteVariant = mAny.color === 'white' || mAny.color === 'Blanc' || mAny.color === '#ffffff' ||
                                                    mIdLower.includes('white') || mIdLower.includes('blanc') || mIdLower.includes('wht') ||
                                                    (mAny.sku && mAny.sku.toLowerCase().includes('wht'));

                                                let resolvedSku = mAny.sku;
                                                let resolvedProductId = mAny.productId;
                                                let resolvedColor = mAny.color || (isWhiteVariant ? 'white' : 'black');

                                                if (isWhiteVariant) {
                                                    resolvedColor = 'white';
                                                    if (m.garment === 'tshirt') {
                                                        resolvedSku = resolvedSku || 'JHK170-WHT';
                                                        resolvedProductId = resolvedProductId || 'jhk170-classic-tshirt-white';
                                                    } else if (m.garment === 'polo') {
                                                        resolvedSku = resolvedSku || 'JHK510-WHT';
                                                        resolvedProductId = resolvedProductId || 'jhk510-polo-premium-white';
                                                    } else if (m.garment === 'sweat' || m.garment === 'hoodie') {
                                                        resolvedSku = resolvedSku || 'JHK421-WHT';
                                                        resolvedProductId = resolvedProductId || 'jhk421-hoodie-white';
                                                    } else if (m.garment === 'tank_top') {
                                                        resolvedSku = resolvedSku || 'BYBB011-WHT';
                                                        resolvedProductId = resolvedProductId || 'BYBB011-WHT';
                                                    } else if (m.garment === 'tshirt_oversize') {
                                                        resolvedSku = resolvedSku || 'NX7200-WHT';
                                                        resolvedProductId = resolvedProductId || 'NX7200-WHT';
                                                    }
                                                }

                                                return {
                                                    ...m,
                                                    selected: selectedWithRenderIds.has(m.id),
                                                    sku: resolvedSku,
                                                    productId: resolvedProductId,
                                                    color: resolvedColor,
                                                    ai: finalAi,
                                                    aiRemastered: finalAi,
                                                    mechanical: finalMech,
                                                    imageUrl: primary,
                                                    frontImageUrl: isBack ? undefined : primary,
                                                    backImageUrl: isBack ? primary : undefined,
                                                    imageFront: isBack ? undefined : primary,
                                                    imageBack: isBack ? primary : undefined
                                                };
                                            });

                                            // 3b. DÉLÉGATION À INDEXEDDB : Stockage illimité des Data URLs et objets complets
                                            const garmentMockupMap = extractGarmentMockupMap(mockupsWithPublicUrls);
                                            const urlUid = searchParams.get('uid');
                                            const keysToSync = extractAllCandidateKeys(urlUid, sid, slug, targetSlug);

                                            try {
                                                const fullMockupsJson = JSON.stringify(mockupsWithPublicUrls);
                                                const fullGarmentJson = JSON.stringify(garmentMockupMap);
                                                await Promise.all([
                                                    dbSet(`mockups_${sid}`, fullMockupsJson),
                                                    slug && slug !== sid ? dbSet(`mockups_${slug}`, fullMockupsJson) : Promise.resolve(true),
                                                    dbSet(`garmentMockups_${sid}`, fullGarmentJson),
                                                    slug && slug !== sid ? dbSet(`garmentMockups_${slug}`, fullGarmentJson) : Promise.resolve(true)
                                                ]);

                                                for (const m of mockupsWithPublicUrls) {
                                                    if (m.ai && typeof m.ai === 'string' && m.ai.trim().length > 0) {
                                                        await dbSet(`${sid}_ai_${m.id}`, m.ai);
                                                        if (slug && slug !== sid) await dbSet(`${slug}_ai_${m.id}`, m.ai);
                                                    }
                                                    if (m.mechanical && typeof m.mechanical === 'string' && m.mechanical.trim().length > 0) {
                                                        await dbSet(`${sid}_mech_${m.id}`, m.mechanical);
                                                        if (slug && slug !== sid) await dbSet(`${slug}_mech_${m.id}`, m.mechanical);
                                                    }
                                                }
                                            } catch (idbErr) {
                                                console.warn("[IndexedDB] Direct cache delegation error:", idbErr);
                                            }

                                            // 3c. SÉCURISATION ET NETTOYAGE PRÉVENTIF LOCALSTORAGE
                                            if (typeof localStorage !== 'undefined') {
                                                try {
                                                    // Nettoyage préventif des clés volumineuses de sessions précédentes
                                                    pruneBulkyLocalStorageKeys(keysToSync);

                                                    if (!sid && !slug) safeLocalStorageSetItem('btp_mockups_locked', 'true');
                                                    keysToSync.forEach(k => {
                                                        safeLocalStorageSetItem(`btp_mockups_locked_${k}`, 'true');
                                                    });

                                                    // Ne stocker QUE des URLs légères / distantes résolues, jamais de Data URLs
                                                    const sanitizedGarmentMap = sanitizeGarmentMockupMap(garmentMockupMap);
                                                    const gmJson = JSON.stringify(sanitizedGarmentMap);
                                                    if (!sid && !slug) {
                                                        safeLocalStorageSetItem('btp_garment_mockups', gmJson);
                                                        safeLocalStorageSetItem('garmentMockups', gmJson);
                                                    }
                                                    keysToSync.forEach(k => {
                                                        safeLocalStorageSetItem(`btp_garment_mockups_${k}`, gmJson);
                                                        safeLocalStorageSetItem(`garmentMockups_${k}`, gmJson);
                                                    });

                                                    const lightweightMockups = mockupsWithPublicUrls.map(sanitizeMockupForLocalStorage);
                                                    const mockupsJson = JSON.stringify(lightweightMockups);
                                                    if (!sid && !slug) safeLocalStorageSetItem('mockups', mockupsJson);
                                                    keysToSync.forEach(k => {
                                                        safeLocalStorageSetItem(`mockups_${k}`, mockupsJson);
                                                    });

                                                    const directGarmentEntries: [string, string | undefined][] = [
                                                        ['tshirt_front', sanitizedGarmentMap.tshirt_front || sanitizedGarmentMap.tFront],
                                                        ['tshirt_back', sanitizedGarmentMap.tshirt_back || sanitizedGarmentMap.tBack],
                                                        ['tshirt_white_front', sanitizedGarmentMap.tshirt_white_front || sanitizedGarmentMap.tWhiteFront || sanitizedGarmentMap['JHK170-WHT_front']],
                                                        ['tshirt_white_back', sanitizedGarmentMap.tshirt_white_back || sanitizedGarmentMap.tWhiteBack || sanitizedGarmentMap['JHK170-WHT_back']],
                                                        ['polo_front', sanitizedGarmentMap.polo_front || sanitizedGarmentMap.pFront],
                                                        ['polo_back', sanitizedGarmentMap.polo_back || sanitizedGarmentMap.pBack],
                                                        ['polo_white_front', sanitizedGarmentMap.polo_white_front || sanitizedGarmentMap.pWhiteFront || sanitizedGarmentMap['JHK510-WHT_front']],
                                                        ['polo_white_back', sanitizedGarmentMap.polo_white_back || sanitizedGarmentMap.pWhiteBack || sanitizedGarmentMap['JHK510-WHT_back']],
                                                        ['hoodie', sanitizedGarmentMap.hoodie || sanitizedGarmentMap.hoodie_front || sanitizedGarmentMap.hFront],
                                                        ['hoodie_front', sanitizedGarmentMap.hoodie || sanitizedGarmentMap.hoodie_front || sanitizedGarmentMap.hFront],
                                                        ['hoodie_back', sanitizedGarmentMap.hoodie_back || sanitizedGarmentMap.hBack],
                                                        ['hoodie_white_front', sanitizedGarmentMap.hoodie_white_front || sanitizedGarmentMap.hWhiteFront || sanitizedGarmentMap['JHK421-WHT_front']],
                                                        ['hoodie_white_back', sanitizedGarmentMap.hoodie_white_back || sanitizedGarmentMap.hWhiteBack || sanitizedGarmentMap['JHK421-WHT_back']],
                                                        ['tank_front', sanitizedGarmentMap.tank_front || sanitizedGarmentMap.tankFront],
                                                        ['tank_back', sanitizedGarmentMap.tank_back || sanitizedGarmentMap.tankBack],
                                                        ['tank_white_front', sanitizedGarmentMap.tank_white_front || sanitizedGarmentMap.tankWhiteFront || sanitizedGarmentMap['BYBB011-WHT_front']],
                                                        ['tank_white_back', sanitizedGarmentMap.tank_white_back || sanitizedGarmentMap.tankWhiteBack || sanitizedGarmentMap['BYBB011-WHT_back']],
                                                        ['heavy_front', sanitizedGarmentMap.heavy_front || sanitizedGarmentMap.heavyFront],
                                                        ['heavy_back', sanitizedGarmentMap.heavy_back || sanitizedGarmentMap.heavyBack],
                                                        ['heavy_white_front', sanitizedGarmentMap.heavy_white_front || sanitizedGarmentMap.heavyWhiteFront || sanitizedGarmentMap['NX7200-WHT_front']],
                                                        ['heavy_white_back', sanitizedGarmentMap.heavy_white_back || sanitizedGarmentMap.heavyWhiteBack || sanitizedGarmentMap['NX7200-WHT_back']],
                                                    ];

                                                    for (const [gKey, gVal] of directGarmentEntries) {
                                                        if (gVal && isRealImage(gVal) && isSafeStorageUrl(gVal)) {
                                                            if (!sid && !slug) safeLocalStorageSetItem(`btp_mockup_${gKey}`, gVal);
                                                            keysToSync.forEach(k => {
                                                                safeLocalStorageSetItem(`btp_mockup_${gKey}_${k}`, gVal);
                                                            });
                                                        }
                                                    }

                                                    safeLocalStorageSetItem('btp_active_session_id', sid);
                                                    if (slug) safeLocalStorageSetItem('btp_active_session_slug', slug);
                                                } catch (lsErr) {
                                                    console.warn("[Storage] Warning writing shop sync cache to localStorage:", lsErr);
                                                }
                                            }

                                             // 4. Purge préventive du cache slug et Synchronisation Firestore
                                             await cleanSessionCacheForSlug(slug, sid);

                                             // STRICT FILTER : Seuls les produits ayant un visuel IA confirmé mannequin et sélectionnés dans le vestiaire sont activés
                                             const validAiProductIds = new Set<string>();
                                            selectedWithRender.forEach(m => {
                                                const mAny = m as any;
                                                if (mAny.productId) validAiProductIds.add(mAny.productId);
                                                if (mAny.sku) validAiProductIds.add(mAny.sku);
                                                if (m.id) validAiProductIds.add(m.id);
                                                if (m.garment) validAiProductIds.add(m.garment);
                                                const matched = auditCatalog.find(p => isMockupMatchingProduct(m, p));
                                                if (matched) {
                                                    validAiProductIds.add(matched.id);
                                                    if (matched.sku) validAiProductIds.add(matched.sku);
                                                    if ((matched as any).garment) validAiProductIds.add((matched as any).garment);
                                                }
                                            });

                                            const finalEnabledProductIds = Array.from(validAiProductIds);

                                            try {
                                                safeLocalStorageSetItem('btp_enabled_product_ids', JSON.stringify(finalEnabledProductIds));
                                                if (sid) safeLocalStorageSetItem(`enabled_products_${sid}`, JSON.stringify(finalEnabledProductIds));
                                                if (slug) safeLocalStorageSetItem(`enabled_products_${slug}`, JSON.stringify(finalEnabledProductIds));
                                            } catch (e) { }

                                            const payloadToSync: SaveSessionParams = {
                                                sessionId: sid,
                                                slug: slug,
                                                logoA,
                                                logoB,
                                                logoPlacements,
                                                userData: {
                                                    ...userData,
                                                    enabledProductIds: finalEnabledProductIds
                                                } as any,
                                                mockups: mockupsWithPublicUrls,
                                                logoColorModes,
                                                globalLogoColorMode,
                                                enabledProductIds: finalEnabledProductIds
                                            };

                                            const syncResult = await syncSessionToCloud(payloadToSync);
                                            if (syncResult.previewId) setPreviewId(syncResult.previewId);

                                            // Persistance locale avec le payload isolé
                                            await saveSessionLocal(payloadToSync);

                                            if (typeof localStorage !== 'undefined') {
                                                try {
                                                    safeLocalStorageSetItem('btp_active_session_id', sid);
                                                    if (slug) safeLocalStorageSetItem('btp_active_session_slug', slug);
                                                } catch (e) {
                                                    console.warn("[Storage] btp_active_session save notice:", e);
                                                }
                                            }

                                            // 5. Mise à jour de la configuration CMS vitrine si uidParam ou slug
                                            const configKey = searchParams.get('uid') || slug;
                                            if (configKey) {
                                                const logoSrc = logoA.mode === 'remastered'
                                                    ? (logoA.remastered || logoA.adapted || logoA.original)
                                                    : (logoA.mode === 'original'
                                                        ? (logoA.original || logoA.adapted)
                                                        : (logoA.adapted || logoA.original));
                                                try {
                                                    const config = await getStoredConfig(configKey);
                                                    if (config) {
                                                        if (logoSrc) {
                                                            config.logoUrl = logoSrc;
                                                        }
                                                        config.generatedKey = sid;
                                                        config.actuationKey = sid;
                                                        config.merchUrl = `${window.location.origin}/portail-shop?slug=${targetSlug}`;
                                                        await saveStoredConfig(config, configKey);
                                                        console.log("Vault Architect: Vitrine CMS updated with remastered logo & products link.");
                                                    }
                                                } catch (err) {
                                                    console.error("Vault Architect: Failed to update vitrine config:", err);
                                                }
                                            }

                                            // 6. Redirection vers le portail boutique en préservant slug et uid
                                            const targetParams = new URLSearchParams();
                                            targetParams.set('slug', targetSlug);
                                            if (urlUid) {
                                                targetParams.set('uid', urlUid);
                                            }
                                            navigate(`/portail-shop?${targetParams.toString()}`);
                                        } catch (err) {
                                            console.error("Shop sync error:", err);
                                            alert("Erreur lors de la synchronisation de la boutique. Veuillez réessayer.");
                                            isVisualFrozenRef.current = false;
                                        } finally {
                                            setIsSyncingShop(false);
                                        }
                                    }}
                                    disabled={isAccessDisabled || isSyncingShop}
                                    className={`px-10 py-4 font-black text-xs uppercase italic tracking-tighter transition-all shadow-xl ${isAccessDisabled || isSyncingShop ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed opacity-50' : 'bg-black text-white hover:bg-orange-600 cursor-pointer'}`}
                                >
                                    {isSyncingShop ? (
                                        <span className="flex items-center gap-2">
                                            <Loader2 size={16} className="animate-spin text-orange-500" />
                                            Synchronisation du catalogue en cours...
                                        </span>
                                    ) : isAnyMockupGenerating ? (
                                        "Génération en cours..."
                                    ) : (!areAllSelectedMockupsGenerated ? (
                                        "En attente des images..."
                                    ) : (
                                        <span className="flex items-center gap-2">
                                            Accéder au shop
                                            <ArrowRight size={16} />
                                        </span>
                                    ))}
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
                                    <br /><br />
                                    <span className="text-white">Vous recevrez votre Hub personnalisé par email</span> avec nos recommandations stratégiques sous peu.
                                </p>
                            </div>
                            <div className="pt-8 border-t border-white/10">
                                <p className="text-zinc-600 font-black text-[10px] uppercase tracking-[0.5em]">Signaid Studio • L'Autorité Visuelle des Leaders</p>
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
                                            <span>SIGNAID STUDIO SECURE</span>
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
                                                <div className={`w-5 h-5 rounded-full border flex items-center justify-center font-bold text-[9px] ${isDone ? 'bg-orange-600/10 border-orange-600 text-orange-500' :
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
            <CropModal
                isOpen={showCropModal}
                targetSlot={cropTargetSlot}
                logoA={logoA}
                logoB={logoB}
                initialMethod={cropInitialMethod}
                onConfirm={handleCropConfirm}
                onClose={() => setShowCropModal(false)}
            />
            <div className="pointer-events-none">
                <AdminQuickBar
                    uid={sessionId || new URLSearchParams(window.location.search).get('uid') || ''}
                    companyName={userData?.companyName}
                />
            </div>
        </div>
    );
};

export default GenericAuditPage;

