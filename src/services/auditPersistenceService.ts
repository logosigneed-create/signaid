import { collection, query, where, getDocs, doc, setDoc, getDoc, deleteDoc, deleteField } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL, UploadMetadata } from 'firebase/storage';
import { signInAnonymously } from 'firebase/auth';
import { db, storage, auth } from '../firebaseConfig';
import { sanitizeForFirestore } from '../utils/firestoreSanitizer';
import { compressBase64Image, generateMechanicalMockup } from './imageProcessingService';
import { BtpLogo, MockupItem, UserData, LogoColorMode } from '../types/audit';
import { resolveSlotForPlacement } from './auditCatalogService';

export const STORAGE_CONFIG = { db: 'BtpAuditDB', store: 'heavy_assets' };

export const openDB = (): Promise<IDBDatabase> => new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
        return reject(new Error('indexedDB is not supported in this environment'));
    }
    const r = indexedDB.open(STORAGE_CONFIG.db, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORAGE_CONFIG.store);
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
});

export const dbSet = async (key: string, val: string): Promise<boolean> => {
    try {
        const database = await openDB();
        return new Promise((resolve, reject) => {
            const tx = database.transaction(STORAGE_CONFIG.store, 'readwrite');
            tx.objectStore(STORAGE_CONFIG.store).put(val, key);
            tx.oncomplete = () => resolve(true);
            tx.onerror = () => reject(tx.error);
        });
    } catch (e) {
        console.warn('IDB dbSet error for key:', key, e);
        return false;
    }
};

export const dbGet = async (key: string): Promise<string | null> => {
    try {
        const database = await openDB();
        return new Promise((resolve) => {
            const tx = database.transaction(STORAGE_CONFIG.store, 'readonly');
            const req = tx.objectStore(STORAGE_CONFIG.store).get(key);
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => resolve(null);
        });
    } catch (e) {
        return null;
    }
};

export const dbGetAllKeys = async (): Promise<string[]> => {
    try {
        const database = await openDB();
        return new Promise((resolve) => {
            const tx = database.transaction(STORAGE_CONFIG.store, 'readonly');
            const req = tx.objectStore(STORAGE_CONFIG.store).getAllKeys();
            req.onsuccess = () => resolve((req.result as string[]) || []);
            req.onerror = () => resolve([]);
        });
    } catch (e) {
        return [];
    }
};export const dbDelete = async (key: string): Promise<boolean> => {
    try {
        const database = await openDB();
        return new Promise((resolve) => {
            const tx = database.transaction(STORAGE_CONFIG.store, 'readwrite');
            tx.objectStore(STORAGE_CONFIG.store).delete(key);
            tx.oncomplete = () => resolve(true);
            tx.onerror = () => resolve(false);
        });
    } catch (e) {
        return false;
    }
};

/**
 * Normalizes any text (brand name, company name, slug) into kebab-case without accents or spaces
 */
export const toKebabCaseSlug = (text: string): string => {
    if (!text || typeof text !== 'string') return '';
    return text
        .toString()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // remove accents
        .replace(/[^a-z0-9_-]+/g, '-')   // replace spaces & non-alphanumeric with -
        .replace(/^-+|-+$/g, '')        // remove leading/trailing -
        .substring(0, 60);
};

/**
 * Strict universal validator for real AI mannequin studio images.
 * Formally rejects 2D flat technical templates, static catalog assets, SVG templates, and raw logos.
 */
export const isRealAiImage = (u?: string | null): boolean => {
    if (!u || typeof u !== 'string') return false;
    const str = u.trim();
    if (!str || str.length < 10) return false;
    const lower = str.toLowerCase();
    // Exclude 2D flat templates or raw static assets
    if (lower.startsWith('/assets/') || lower.startsWith('assets/') || lower.startsWith('/merch/') || lower.startsWith('merch/') || lower.startsWith('app_assets/')) return false;
    if (lower.includes('/assets/tshirt-') || lower.includes('/assets/polo-') || lower.includes('/assets/hoodie-') || lower.includes('/assets/tank-') || lower.includes('/assets/sport-')) return false;
    if (lower.includes('/merch/') || lower.endsWith('.svg') || lower.includes('/catalog_mockups/')) return false;
    if (lower.includes('card-base') || lower.includes('card_mockup') || lower.includes('male_tshirt') || lower.includes('male_hoodie') || lower.includes('male_polo') || lower.includes('male_tank')) return false;
    // Exclude 2D mechanical templates explicitly
    if (lower.includes('_mech') || lower.includes('mech_') || lower.includes('mechanical')) return false;
    // Exclude flat supplier base templates unless they are cloud storage URLs or base64
    if ((lower.includes('jhk170') || lower.includes('jhk421') || lower.includes('jhk510') || lower.includes('bybb011') || lower.includes('nx7200') || lower.includes('e3520')) && 
        !lower.includes('firebasestorage') && !lower.startsWith('data:image')) {
        return false;
    }
    // Disallow pure logos serving as garment backgrounds
    if (lower.includes('/logos/') || lower.includes('logo_') || lower.includes('_logo')) return false;
    // Valid AI images: base64 data URIs or remote storage/CDN URLs
    if (str.startsWith('data:image/')) return true;
    if (str.startsWith('blob:')) return true;
    if (str.startsWith('http://') || str.startsWith('https://')) return true;
    return false;
};

/**
 * Priority extraction of root slug:
 * 1. URL search params: slug > prospect > brand > uid > audit (if not audit-random)
 * 2. Route params: slug > auditId
 * 3. userData.brandName or userData.companyName (normalized to kebab-case)
 * 4. Existing stable sessionId (not random audit-XXX)
 * 5. URL audit parameter or route auditId
 * 6. Random audit-${uniqueId} as last resort
 */
export const extractRootSlug = (
    searchParams?: URLSearchParams | null,
    routeParams?: { slug?: string; auditId?: string; [key: string]: any } | null,
    userData?: UserData | any | null,
    existingSessionId?: string | null
): string => {
    // 1. URL search parameters in priority order
    if (searchParams) {
        const pSlug = searchParams.get('slug');
        if (pSlug && pSlug.trim()) return toKebabCaseSlug(pSlug.trim());

        const pProspect = searchParams.get('prospect');
        if (pProspect && pProspect.trim()) return toKebabCaseSlug(pProspect.trim());

        const pBrand = searchParams.get('brand');
        if (pBrand && pBrand.trim()) return toKebabCaseSlug(pBrand.trim());

        const pUid = searchParams.get('uid');
        if (pUid && pUid.trim()) return toKebabCaseSlug(pUid.trim());

        const pAudit = searchParams.get('audit');
        if (pAudit && pAudit.trim() && !pAudit.startsWith('audit-')) {
            return toKebabCaseSlug(pAudit.trim());
        }
    }

    // 2. Route parameters
    if (routeParams?.slug && routeParams.slug.trim()) {
        return toKebabCaseSlug(routeParams.slug.trim());
    }
    if (routeParams?.auditId && routeParams.auditId.trim() && !routeParams.auditId.startsWith('audit-')) {
        return toKebabCaseSlug(routeParams.auditId.trim());
    }

    // 3. User data brandName or companyName (normalized in kebab-case)
    const brandName = userData?.brandName || (userData as any)?.brand;
    if (brandName && typeof brandName === 'string' && brandName.trim()) {
        const cleanBrand = toKebabCaseSlug(brandName.trim());
        if (cleanBrand.length >= 2) return cleanBrand;
    }

    const companyName = userData?.companyName;
    if (companyName && typeof companyName === 'string' && companyName.trim()) {
        const cleanCompany = toKebabCaseSlug(companyName.trim());
        if (cleanCompany.length >= 2) return cleanCompany;
    }

    // 4. Existing stable sessionId (not random audit-XXX, lead-XXX, guest_XXX)
    if (existingSessionId && existingSessionId.trim()) {
        const cleanExisting = existingSessionId.trim();
        if (!cleanExisting.startsWith('audit-') && !cleanExisting.startsWith('lead-') && !cleanExisting.startsWith('guest_')) {
            const clean = toKebabCaseSlug(cleanExisting);
            if (clean.length >= 2) return clean;
        }
    }

    // 5. Existing audit parameter or route auditId or sessionId
    if (searchParams?.get('audit') && searchParams.get('audit')!.trim()) {
        return searchParams.get('audit')!.trim();
    }
    if (routeParams?.auditId && routeParams.auditId.trim()) {
        return routeParams.auditId.trim();
    }
    if (existingSessionId && existingSessionId.trim()) {
        return existingSessionId.trim();
    }

    // 6. Last resort: random audit-XXX
    return `audit-${Math.random().toString(36).substring(2, 9)}`;
};

/**
 * Normalizes company name or session identifier to canonical slug
 */
export const getCleanSlug = (userData?: UserData | any, sessionId?: string, explicitSlug?: string): string => {
    if (explicitSlug && explicitSlug.trim()) {
        return toKebabCaseSlug(explicitSlug.trim());
    }
    const brand = userData?.brandName || (userData as any)?.brand;
    if (brand && typeof brand === 'string' && brand.trim().length >= 2) {
        return toKebabCaseSlug(brand.trim());
    }
    const company = userData?.companyName || '';
    if (company && typeof company === 'string' && company.trim().length >= 2) {
        return toKebabCaseSlug(company.trim());
    }
    if (sessionId && typeof sessionId === 'string' && sessionId.trim()) {
        const clean = sessionId.replace(/^audit-/, '').trim();
        const norm = toKebabCaseSlug(clean);
        if (norm && norm.length >= 2) return norm;
        return clean || sessionId;
    }
    return 'anonymous';
};

/**
 * Uploads Base64 image directly to Firebase Storage client SDK (bypasses failing cloud function).
 * Ensures anonymous authentication before upload if needed.
 */
export const uploadBase64ToStorage = async (
    base64Data: string,
    storagePath: string
): Promise<string> => {
    if (!base64Data || typeof base64Data !== 'string') {
        throw new Error('Invalid base64Data for upload');
    }
    if (base64Data.startsWith('http://') || base64Data.startsWith('https://')) {
        return base64Data;
    }

    if (!auth.currentUser) {
        try {
            await signInAnonymously(auth);
        } catch (e) {
            console.warn('[Storage] Anonymous auth check:', e);
        }
    }

    let dataUrl = base64Data.trim();
    if (!dataUrl.startsWith('data:')) {
        dataUrl = `data:image/png;base64,${dataUrl}`;
    }

    const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,/);
    const contentType = match ? match[1] : 'image/png';

    const metadata: UploadMetadata = {
        contentType,
        cacheControl: 'public, max-age=3600, must-revalidate'
    };

    const storageRef = ref(storage, storagePath);
    await uploadString(storageRef, dataUrl, 'data_url', metadata);
    console.log(`-> Upload réussi vers ${storagePath}`);
    return await getDownloadURL(storageRef);
};

export const isBackId = (id?: string): boolean => !id ? false : /(back|dos|verso|tback|twhiteback|pback|pwhiteback|hback|hwhiteback|tankback|tankwhiteback|heavyback|heavywhiteback)/i.test(id);
export const isFrontId = (id?: string): boolean => !id ? false : /(front|face|recto|tfront|twhitefront|pfront|pwhitefront|hfront|hwhitefront|tankfront|tankwhitefront|heavyfront|heavywhitefront)/i.test(id);

export interface GarmentMockupMap {
    tshirt?: string | null;
    tshirt_front?: string | null;
    tshirt_back?: string | null;
    tshirt_white_front?: string | null;
    tshirt_white_back?: string | null;
    tWhiteFront?: string | null;
    tWhiteBack?: string | null;
    polo?: string | null;
    polo_front?: string | null;
    polo_back?: string | null;
    polo_white_front?: string | null;
    polo_white_back?: string | null;
    pWhiteFront?: string | null;
    pWhiteBack?: string | null;
    hoodie?: string | null;
    hoodie_front?: string | null;
    hoodie_back?: string | null;
    hoodie_white_front?: string | null;
    hoodie_white_back?: string | null;
    hWhiteFront?: string | null;
    hWhiteBack?: string | null;
    sweat?: string | null;
    sweat_front?: string | null;
    sweat_back?: string | null;
    tank_top?: string | null;
    tank_front?: string | null;
    tank_back?: string | null;
    tank_white_front?: string | null;
    tank_white_back?: string | null;
    tankWhiteFront?: string | null;
    tankWhiteBack?: string | null;
    tshirt_oversize?: string | null;
    heavy_front?: string | null;
    heavy_back?: string | null;
    heavy_white_front?: string | null;
    heavy_white_back?: string | null;
    heavyWhiteFront?: string | null;
    heavyWhiteBack?: string | null;
    tshirt_oversize_white_back?: string | null;
    business_card?: string | null;
    business_card_front?: string | null;
    business_card_back?: string | null;
    E3520_front?: string | null;
    E3520_back?: string | null;
    e3520_front?: string | null;
    e3520_back?: string | null;
    sport_front?: string | null;
    sport_back?: string | null;
    [key: string]: string | null | undefined;
}

export const extractGarmentMockupMap = (mockups: (MockupItem | any)[]): GarmentMockupMap => {
    const map: GarmentMockupMap = {};
    if (!Array.isArray(mockups)) return map;

    for (const m of mockups) {
        if (!m || m.selected === false) continue;
        const isBack = m.view === 'back' || isBackId(m.id);
        const candidateAi = m.aiRemastered || m.ai || (isBack ? ((m as any).aiRemasteredBack || (m as any).aiBack) : null);
        const candidateUrl = (m as any).imageUrl || (isBack ? ((m as any).backImageUrl || (m as any).imageBack || (m as any).backImage) : ((m as any).frontImageUrl || (m as any).imageFront || (m as any).frontImage));
        const img = isRealAiImage(candidateAi) ? candidateAi : (isRealAiImage(candidateUrl) ? candidateUrl : null);
        if (!img || typeof img !== 'string') continue;

        const g = (m.garment || '').toLowerCase();
        const id = (m.id || '').toLowerCase();
        const color = (m.color || '').toLowerCase();
        const isWhite = color === 'white' || color === 'blanc' || id.includes('white') || id.includes('blanc') || id.includes('-wht') || id.startsWith('twhite') || id.startsWith('pwhite') || id.startsWith('hwhite') || (m.title && (m.title.toLowerCase().includes('blanc') || m.title.toLowerCase().includes('white')));

        if (g === 'sport_tshirt' || id.includes('e3520') || g.includes('e3520')) {
            if (isBack || id.includes('back') || id.includes('dos')) {
                map.E3520_back = img;
                map.e3520_back = img;
                map.sport_back = img;
                map.tshirt_back = map.tshirt_back || img;
            } else {
                map.E3520_front = img;
                map.e3520_front = img;
                map.sport_front = img;
                map.E3520 = img;
                map.e3520 = img;
                map.tshirt_front = map.tshirt_front || img;
            }
        } else if (g === 'tshirt' || id.startsWith('tfront') || id.startsWith('tback') || id === 'tfront' || id === 'tback' || id.startsWith('twhite')) {
            if (isWhite) {
                if (isBack || id.includes('back') || id.includes('dos')) {
                    map.tshirt_white_back = img;
                    map.tWhiteBack = img;
                } else {
                    map.tshirt_white_front = img;
                    map.tWhiteFront = img;
                }
            } else {
                if (isBack || id.includes('back') || id.includes('dos')) {
                    map.tshirt_back = img;
                    map.tBack = img;
                } else {
                    map.tshirt_front = img;
                    map.tFront = img;
                    map.tshirt = img;
                }
            }
        } else if (g === 'polo' || id.startsWith('pfront') || id.startsWith('pback') || id === 'pfront' || id === 'pback' || id.startsWith('pwhite')) {
            if (isWhite) {
                if (isBack || id.includes('back') || id.includes('dos')) {
                    map.polo_white_back = img;
                    map.pWhiteBack = img;
                } else {
                    map.polo_white_front = img;
                    map.pWhiteFront = img;
                }
            } else {
                if (isBack || id.includes('back') || id.includes('dos')) {
                    map.polo_back = img;
                    map.pBack = img;
                } else {
                    map.polo_front = img;
                    map.pFront = img;
                    map.polo = img;
                }
            }
        } else if (g === 'sweat' || g === 'hoodie' || id.startsWith('hfront') || id.startsWith('hback') || id === 'hfront' || id === 'hback' || id.startsWith('hwhite')) {
            if (isWhite) {
                if (isBack || id.includes('back') || id.includes('dos')) {
                    map.hoodie_white_back = img;
                    map.hWhiteBack = img;
                } else {
                    map.hoodie_white_front = img;
                    map.hWhiteFront = img;
                }
            } else {
                if (isBack || id.includes('back') || id.includes('dos')) {
                    map.hoodie_back = img;
                    map.sweat_back = img;
                    map.hBack = img;
                } else {
                    map.hoodie_front = img;
                    map.hoodie = img;
                    map.sweat = img;
                    map.sweat_front = img;
                    map.hFront = img;
                }
            }
        } else if (g === 'tank_top' || id.includes('tank')) {
            if (isWhite) {
                if (isBack) {
                    map.tank_white_back = img;
                    map.tankWhiteBack = img;
                } else {
                    map.tank_white_front = img;
                    map.tankWhiteFront = img;
                }
            } else {
                if (isBack) {
                    map.tank_back = img;
                    map.tankBack = img;
                } else {
                    map.tank_front = img;
                    map.tankFront = img;
                    map.tank_top = img;
                }
            }
        } else if (g === 'tshirt_oversize' || id.includes('heavy') || id.includes('oversize')) {
            if (isWhite) {
                if (isBack) {
                    map.heavy_white_back = img;
                    map.heavyWhiteBack = img;
                    map.tshirt_oversize_white_back = img;
                } else {
                    map.heavy_white_front = img;
                    map.heavyWhiteFront = img;
                }
            } else {
                if (isBack) {
                    map.heavy_back = img;
                    map.heavyBack = img;
                } else {
                    map.heavy_front = img;
                    map.heavyFront = img;
                    map.tshirt_oversize = img;
                }
            }
        } else if (g === 'business_card' || id.includes('card')) {
            if (isBack) {
                map.business_card_back = img;
                map.cardBack = img;
            } else {
                map.business_card_front = img;
                map.cardFront = img;
                map.business_card = img;
            }
        }
        if (m.id) {
            map[m.id] = img;
        }
        if (m.sku) {
            map[m.sku] = img;
        }
    }
    return map;
};

export interface SaveSessionParams {
    sessionId: string;
    slug?: string;
    logoA: BtpLogo;
    logoB: BtpLogo;
    logoPlacements: Record<string, 'A' | 'B'>;
    userData: UserData;
    mockups: MockupItem[];
    logoColorModes?: Record<string, LogoColorMode>;
    globalLogoColorMode?: LogoColorMode;
    enabledProductIds?: string[];
}

/**
 * Determines if an image URL is safe for localStorage.
 * Only lightweight remote URLs (https://, http://, gs://) or relative asset paths (/assets/, /merch/) are allowed.
 * Raw Data URLs (data:image/...) or oversized strings are strictly rejected.
 */
export const isSafeStorageUrl = (url: any): boolean => {
    if (!url || typeof url !== 'string') return false;
    const trimmed = url.trim();
    if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) return false;
    if (trimmed.startsWith('https://') || trimmed.startsWith('http://') || trimmed.startsWith('gs://')) return true;
    if (trimmed.startsWith('/')) return true;
    if (trimmed.length > 500) return false;
    return false;
};

/**
 * Strips all heavy Base64 Data URLs from a mockup item, leaving only lightweight URLs or null.
 */
export const sanitizeMockupForLocalStorage = (m: MockupItem): MockupItem => {
    const safeAi = isSafeStorageUrl(m.ai) ? m.ai : null;
    const safeAiRemastered = isSafeStorageUrl((m as any).aiRemastered) ? (m as any).aiRemastered : safeAi;
    const safeMech = isSafeStorageUrl(m.mechanical) ? m.mechanical : null;
    const safeAiResolved = safeAiRemastered || safeAi;
    const rawImg = (m as any).imageUrl;
    const safeImg = safeAiResolved || (isSafeStorageUrl(rawImg) ? rawImg : (safeMech || m.base));

    return {
        ...m,
        ai: safeAiResolved,
        aiRemastered: safeAiRemastered || safeAiResolved,
        mechanical: safeMech,
        imageUrl: safeImg,
        frontImageUrl: (m.view === 'front' ? safeAiResolved : undefined) || (isSafeStorageUrl((m as any).frontImageUrl) ? (m as any).frontImageUrl : (m.view === 'front' ? safeImg : undefined)),
        backImageUrl: (m.view === 'back' ? safeAiResolved : undefined) || (isSafeStorageUrl((m as any).backImageUrl) ? (m as any).backImageUrl : (m.view === 'back' ? safeImg : undefined)),
        imageFront: (m.view === 'front' ? safeAiResolved : undefined) || (isSafeStorageUrl((m as any).imageFront) ? (m as any).imageFront : (m.view === 'front' ? safeImg : undefined)),
        imageBack: (m.view === 'back' ? safeAiResolved : undefined) || (isSafeStorageUrl((m as any).imageBack) ? (m as any).imageBack : (m.view === 'back' ? safeImg : undefined))
    };
};

/**
 * Filters a garment mockup map to contain ONLY resolved remote/asset URLs, never Data URLs.
 */
export const sanitizeGarmentMockupMap = (map: Record<string, string | undefined>): Record<string, string> => {
    const clean: Record<string, string> = {};
    if (!map || typeof map !== 'object') return clean;
    for (const [key, val] of Object.entries(map)) {
        if (val && isSafeStorageUrl(val)) {
            clean[key] = val;
        }
    }
    return clean;
};

/**
 * Prunes orphaned and bulky keys from localStorage.
 * - Removes any key containing raw Data URLs (data:image/...) or base64.
 * - Removes all session_obj_ and btp_active_session_data keys (they transit exclusively by IndexedDB).
 * - Removes orphaned session items from previous sessions that do not match the active keys.
 * - Removes bulky items (>20KB) not tied to the current session.
 */
export const pruneBulkyLocalStorageKeys = (preserveKeys: string[] = []): void => {
    if (typeof localStorage === 'undefined') return;
    try {
        const keysToRemove: string[] = [];

        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (!k) continue;

            const lowerK = k.toLowerCase();

            // Purgé d'office : session_obj_ et btp_active_session_data transitent EXCLUSIVEMENT par IndexedDB
            if (lowerK.startsWith('session_obj_') || lowerK === 'btp_active_session_data') {
                keysToRemove.push(k);
                continue;
            }

            // Check if key belongs to active session to preserve
            const isPreserved = preserveKeys.some(activeKey => {
                const a = activeKey.toLowerCase();
                return lowerK === a || lowerK.endsWith(`_${a}`);
            });

            try {
                const val = localStorage.getItem(k);
                if (!val) continue;

                // Always purge keys containing Data URLs or base64 - they have no place in localStorage
                if (val.includes('data:image/') || val.includes('data:application/') || val.includes('data:video/') || val.includes(';base64,') || val.startsWith('data:')) {
                    keysToRemove.push(k);
                    continue;
                }

                // If not part of the active session, remove bulky or session-specific keys
                if (!isPreserved) {
                    if (
                        lowerK.startsWith('btp_session_') ||
                        lowerK.startsWith('mockups_') ||
                        lowerK.startsWith('garmentmockups_') ||
                        lowerK.startsWith('btp_garment_mockups_') ||
                        lowerK.startsWith('btp_mockup_') ||
                        lowerK.startsWith('fast_artist_cache_') ||
                        lowerK.startsWith('lastsyncedlogourl_')
                    ) {
                        keysToRemove.push(k);
                        continue;
                    }

                    // Remove any unpreserved key larger than 20KB
                    if (val.length > 20000) {
                        keysToRemove.push(k);
                        continue;
                    }
                } else {
                    // Even if preserved, purge if larger than 30KB to protect localStorage quota
                    if (val.length > 30000) {
                        keysToRemove.push(k);
                        continue;
                    }
                }
            } catch (readErr) {
                // Ignore read error
            }
        }

        for (const k of keysToRemove) {
            try {
                localStorage.removeItem(k);
            } catch (err) { }
        }

        if (keysToRemove.length > 0) {
            console.log(`[Storage] Nettoyage préventif: ${keysToRemove.length} clé(s) obsolètes/volumineuses supprimées du localStorage.`);
        }
    } catch (e) {
        console.warn("[Storage] Error during cache pruning:", e);
    }
};

/**
 * Safely writes to localStorage with quota protection and try/catch.
 * - Refuses heavy session state keys ('session_obj_', 'btp_active_session_data') which transit exclusively by IndexedDB.
 * - Strips and rejects heavy base64 strings and data URLs (>20KB or data: schemes).
 * - Never throws an exception.
 */
export const safeLocalStorageSetItem = (key: string, value: string): boolean => {
    if (typeof localStorage === 'undefined') return false;
    if (!value || typeof value !== 'string') return false;

    // Règle stricte : transit EXCLUSIF par IndexedDB, ne JAMAIS écrire ces gros états dans localStorage
    if (key.startsWith('session_obj_') || key === 'btp_active_session_data') {
        try { localStorage.removeItem(key); } catch (e) { }
        return false;
    }

    // Bloquer impérativement toute chaîne base64 volumineuse ou dataURL (>20KB ou data:)
    if (value.startsWith('data:') || value.includes(';base64,') || value.includes('data:image/') || value.length > 20000) {
        return false;
    }

    try {
        localStorage.setItem(key, value);
        return true;
    } catch (e) {
        console.warn(`[Storage] localStorage.setItem failed for "${key}", attempting emergency cleanup:`, e);
        try {
            pruneBulkyLocalStorageKeys();
            if (value.length < 10000 && !value.includes('data:')) {
                localStorage.setItem(key, value);
                return true;
            }
            return false;
        } catch (retryErr) {
            console.warn(`[Storage] localStorage.setItem retry failed for "${key}" (QuotaExceededError) - silently captured:`, retryErr);
            return false;
        }
    }
};
export const safeLocalStorageRemoveItem = (key: string): void => {
    if (typeof localStorage === 'undefined') return;
    try {
        localStorage.removeItem(key);
    } catch (e) { }
};

/**
 * Explicitly invalidates and removes any cached mockup URLs and images for a given slot
 * across localStorage, sessionStorage, and IndexedDB.
 */
export const purgeMockupSlotCache = async (
    slotId: string,
    sessionId?: string | null,
    slug?: string | null
): Promise<void> => {
    try {
        const cleanSid = sessionId ? sessionId.replace(/^audit-/, '') : null;
        const candidateKeys = Array.from(new Set([
            sessionId,
            cleanSid,
            slug,
            cleanSid ? `audit-${cleanSid}` : null,
            slug ? `audit-${slug}` : null
        ].filter(Boolean) as string[]));

        const isHoodieBack = slotId === 'hBack' || slotId === 'hoodie_back' || slotId === 'sweat_back' || slotId === 'hoodieBack';
        
        // Target slot names / aliases
        const slotAliases = [slotId];
        if (isHoodieBack) {
            slotAliases.push('hBack', 'hoodie_back', 'sweat_back', 'hoodieBack');
        } else if (slotId === 'hFront' || slotId === 'hoodie_front' || slotId === 'sweat_front' || slotId === 'hoodieFront') {
            slotAliases.push('hFront', 'hoodie_front', 'sweat_front', 'hoodieFront', 'hoodie');
        } else if (slotId === 'tFront' || slotId === 'tshirt_front' || slotId === 'tshirtFront') {
            slotAliases.push('tFront', 'tshirt_front', 'tshirtFront', 'tshirt');
        } else if (slotId === 'tBack' || slotId === 'tshirt_back' || slotId === 'tshirtBack') {
            slotAliases.push('tBack', 'tshirt_back', 'tshirtBack');
        } else if (slotId === 'tWhiteFront' || slotId === 'tshirt_white_front' || slotId === 'tshirtWhiteFront') {
            slotAliases.push('tWhiteFront', 'tshirt_white_front', 'tshirtWhiteFront', 'JHK170-WHT_front');
        } else if (slotId === 'tWhiteBack' || slotId === 'tshirt_white_back' || slotId === 'tshirtWhiteBack') {
            slotAliases.push('tWhiteBack', 'tshirt_white_back', 'tshirtWhiteBack', 'JHK170-WHT_back');
        } else if (slotId === 'pFront' || slotId === 'polo_front' || slotId === 'poloFront') {
            slotAliases.push('pFront', 'polo_front', 'poloFront', 'polo');
        } else if (slotId === 'pBack' || slotId === 'polo_back' || slotId === 'poloBack') {
            slotAliases.push('pBack', 'polo_back', 'poloBack');
        } else if (slotId === 'pWhiteFront' || slotId === 'polo_white_front' || slotId === 'poloWhiteFront') {
            slotAliases.push('pWhiteFront', 'polo_white_front', 'poloWhiteFront', 'JHK510-WHT_front');
        } else if (slotId === 'pWhiteBack' || slotId === 'polo_white_back' || slotId === 'poloWhiteBack') {
            slotAliases.push('pWhiteBack', 'polo_white_back', 'poloWhiteBack', 'JHK510-WHT_back');
        } else if (slotId === 'hWhiteFront' || slotId === 'hoodie_white_front' || slotId === 'hoodieWhiteFront') {
            slotAliases.push('hWhiteFront', 'hoodie_white_front', 'hoodieWhiteFront', 'JHK421-WHT_front');
        } else if (slotId === 'hWhiteBack' || slotId === 'hoodie_white_back' || slotId === 'hoodieWhiteBack') {
            slotAliases.push('hWhiteBack', 'hoodie_white_back', 'hoodieWhiteBack', 'JHK421-WHT_back');
        } else if (slotId.toLowerCase().includes('tank') && slotId.toLowerCase().includes('white') && slotId.toLowerCase().includes('front')) {
            slotAliases.push('tankWhiteFront', 'tank_white_front');
        } else if (slotId.toLowerCase().includes('tank') && slotId.toLowerCase().includes('white') && slotId.toLowerCase().includes('back')) {
            slotAliases.push('tankWhiteBack', 'tank_white_back');
        } else if (slotId.toLowerCase().includes('tank') && slotId.toLowerCase().includes('front')) {
            slotAliases.push('tankFront', 'tank_front');
        } else if (slotId.toLowerCase().includes('tank') && slotId.toLowerCase().includes('back')) {
            slotAliases.push('tankBack', 'tank_back');
        } else if (slotId.toLowerCase().includes('heavy') && slotId.toLowerCase().includes('white') && slotId.toLowerCase().includes('front')) {
            slotAliases.push('heavyWhiteFront', 'heavy_white_front');
        } else if (slotId.toLowerCase().includes('heavy') && slotId.toLowerCase().includes('white') && slotId.toLowerCase().includes('back')) {
            slotAliases.push('heavyWhiteBack', 'heavy_white_back');
        } else if (slotId.toLowerCase().includes('heavy') && slotId.toLowerCase().includes('front')) {
            slotAliases.push('heavyFront', 'heavy_front');
        } else if (slotId.toLowerCase().includes('heavy') && slotId.toLowerCase().includes('back')) {
            slotAliases.push('heavyBack', 'heavy_back');
        }

        // 1. PURGE LOCALSTORAGE
        if (typeof localStorage !== 'undefined') {
            for (const alias of slotAliases) {
                safeLocalStorageRemoveItem(`btp_mockup_${alias}`);
                for (const k of candidateKeys) {
                    safeLocalStorageRemoveItem(`btp_mockup_${alias}_${k}`);
                }
            }

            // Clean garmentMockups and session_obj in localStorage
            const gmKeys = ['garmentMockups', 'btp_garment_mockups'];
            for (const k of candidateKeys) {
                gmKeys.push(`garmentMockups_${k}`, `btp_garment_mockups_${k}`);
            }
            for (const gmKey of gmKeys) {
                const gmRaw = localStorage.getItem(gmKey);
                if (gmRaw) {
                    try {
                        const parsed = JSON.parse(gmRaw);
                        for (const alias of slotAliases) {
                            delete parsed[alias];
                        }
                        safeLocalStorageSetItem(gmKey, JSON.stringify(parsed));
                    } catch (e) { }
                }
            }

            // Clean mockups lists in localStorage
            const mListKeys = ['mockups'];
            for (const k of candidateKeys) {
                mListKeys.push(`mockups_${k}`);
                safeLocalStorageRemoveItem(`session_obj_${k}`);
            }
            for (const mlKey of mListKeys) {
                const raw = localStorage.getItem(mlKey);
                if (raw) {
                    try {
                        const parsed = JSON.parse(raw);
                        if (Array.isArray(parsed)) {
                            const updated = parsed.map((item: any) => {
                                if (slotAliases.includes(item.id)) {
                                    return {
                                        ...item,
                                        ai: null,
                                        aiRemastered: null,
                                        imageUrl: item.base || null,
                                        frontImageUrl: undefined,
                                        backImageUrl: undefined,
                                        imageFront: undefined,
                                        imageBack: undefined,
                                        isFresh: false
                                    };
                                }
                                return item;
                            });
                            safeLocalStorageSetItem(mlKey, JSON.stringify(updated));
                        } else if (parsed && typeof parsed === 'object') {
                            if (Array.isArray(parsed.mockups)) {
                                parsed.mockups = parsed.mockups.map((item: any) => {
                                    if (slotAliases.includes(item.id)) {
                                        return {
                                            ...item,
                                            ai: null,
                                            aiRemastered: null,
                                            imageUrl: item.base || null,
                                            frontImageUrl: undefined,
                                            backImageUrl: undefined,
                                            imageFront: undefined,
                                            imageBack: undefined,
                                            isFresh: false
                                        };
                                    }
                                    return item;
                                });
                            }
                            if (parsed.garmentMockups) {
                                for (const alias of slotAliases) {
                                    delete parsed.garmentMockups[alias];
                                }
                            }
                            safeLocalStorageSetItem(mlKey, JSON.stringify(parsed));
                        }
                    } catch (e) { }
                }
            }
        }

        // 2. PURGE SESSIONSTORAGE
        if (typeof sessionStorage !== 'undefined') {
            const ssKeysToRemove: string[] = [];
            for (let i = 0; i < sessionStorage.length; i++) {
                const k = sessionStorage.key(i);
                if (k) {
                    const lk = k.toLowerCase();
                    for (const alias of slotAliases) {
                        if (lk.includes(alias.toLowerCase())) {
                            ssKeysToRemove.push(k);
                            break;
                        }
                    }
                }
            }
            for (const k of ssKeysToRemove) {
                try { sessionStorage.removeItem(k); } catch (e) { }
            }
        }

        // 3. PURGE INDEXEDDB
        for (const alias of slotAliases) {
            for (const k of candidateKeys) {
                await dbDelete(`${k}_ai_${alias}`);
                await dbDelete(`${k}_mech_${alias}`);
            }
            if (sessionId) {
                await dbDelete(`${sessionId}_ai_${alias}`);
                await dbDelete(`${sessionId}_mech_${alias}`);
            }
            if (slug) {
                await dbDelete(`${slug}_ai_${alias}`);
                await dbDelete(`${slug}_mech_${alias}`);
            }
        }

        // Clean session_obj in IndexedDB
        for (const k of candidateKeys) {
            const raw = await dbGet(`session_obj_${k}`);
            if (raw) {
                try {
                    const parsed = JSON.parse(raw);
                    if (Array.isArray(parsed.mockups)) {
                        parsed.mockups = parsed.mockups.map((item: any) => {
                            if (slotAliases.includes(item.id)) {
                                return {
                                    ...item,
                                    ai: null,
                                    aiRemastered: null,
                                    imageUrl: item.base || null,
                                    frontImageUrl: undefined,
                                    backImageUrl: undefined,
                                    imageFront: undefined,
                                    imageBack: undefined,
                                    isFresh: false
                                };
                            }
                            return item;
                        });
                    }
                    if (parsed.garmentMockups) {
                        for (const alias of slotAliases) {
                            delete parsed.garmentMockups[alias];
                        }
                    }
                    await dbSet(`session_obj_${k}`, JSON.stringify(parsed));
                } catch (e) { }
            }
        }

        console.log(`[CachePurge] Cache local purgé avec succès pour le slot: ${slotId}`);
    } catch (err) {
        console.warn(`[CachePurge] Avertissement lors de la purge du cache pour ${slotId}:`, err);
    }
};

export const ALL_STANDARD_GARMENT_KEYS = [
    'tshirt', 'tshirt_front', 'tshirt_back', 'tFront', 'tBack',
    'tshirt_white', 'tshirt_white_front', 'tshirt_white_back', 'tWhiteFront', 'tWhiteBack',
    'polo', 'polo_front', 'polo_back', 'pFront', 'pBack',
    'polo_white', 'polo_white_front', 'polo_white_back', 'pWhiteFront', 'pWhiteBack',
    'hoodie', 'hoodie_front', 'hoodie_back', 'hFront', 'hBack', 'sweat', 'sweat_front', 'sweat_back',
    'hoodie_white', 'hoodie_white_front', 'hoodie_white_back', 'hWhiteFront', 'hWhiteBack',
    'tank_top', 'tank_front', 'tank_back', 'tankFront', 'tankBack',
    'tank_white_front', 'tank_white_back', 'tankWhiteFront', 'tankWhiteBack',
    'tshirt_oversize', 'heavy_front', 'heavy_back', 'heavyFront', 'heavyBack',
    'heavy_white_front', 'heavy_white_back', 'heavyWhiteFront', 'heavyWhiteBack',
    'tshirt_oversize_white_back', 'heavy_white', 'heavyWhite',
    'sport_tshirt', 'sport_tshirt_front', 'sport_tshirt_back', 'E3520_front', 'E3520_back', 'E3520',
    'business_card', 'business_card_front', 'business_card_back', 'cardFront', 'cardBack'
];

/**
 * Purges slug session keys across localStorage, sessionStorage, and IndexedDB
 * to ensure that deselected products and old session states cannot be revived.
 */
export const cleanSessionCacheForSlug = async (
    targetSlug?: string | null,
    sessionId?: string | null
): Promise<void> => {
    if (!targetSlug && !sessionId) return;
    const cleanSid = sessionId ? sessionId.replace(/^audit-/, '') : null;
    const cleanSlug = targetSlug ? toKebabCaseSlug(targetSlug) : null;
    const candidateKeys = Array.from(new Set([
        targetSlug,
        cleanSlug,
        sessionId,
        cleanSid,
        cleanSlug ? `audit-${cleanSlug}` : null,
        cleanSid ? `audit-${cleanSid}` : null
    ].filter(Boolean) as string[]));

    if (typeof localStorage !== 'undefined') {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (!k) continue;
            const lowerK = k.toLowerCase();
            for (const cand of candidateKeys) {
                const lowerCand = cand.toLowerCase();
                if (lowerK.includes(lowerCand)) {
                    if (
                        lowerK.includes('mockup') ||
                        lowerK.includes('session') ||
                        lowerK.includes('garment') ||
                        lowerK.includes('enabled_products') ||
                        lowerK.includes('fast_artist')
                    ) {
                        keysToRemove.push(k);
                        break;
                    }
                }
            }
        }
        for (const k of keysToRemove) {
            safeLocalStorageRemoveItem(k);
        }
    }

    if (typeof sessionStorage !== 'undefined') {
        const ssKeysToRemove: string[] = [];
        for (let i = 0; i < sessionStorage.length; i++) {
            const k = sessionStorage.key(i);
            if (!k) continue;
            const lowerK = k.toLowerCase();
            for (const cand of candidateKeys) {
                if (lowerK.includes(cand.toLowerCase())) {
                    ssKeysToRemove.push(k);
                    break;
                }
            }
        }
        for (const k of ssKeysToRemove) {
            try { sessionStorage.removeItem(k); } catch (e) { }
        }
    }

    for (const cand of candidateKeys) {
        await dbDelete(`session_obj_${cand}`);
    }
};

/**
 * Merges local and incoming mockups, giving ABSOLUTE PRIORITY to fresh local state.
 * Prevents cloud responses or background syncs from overwriting a freshly generated slot.
 */
export const mergeMockupsWithPriority = (
    currentLocals: MockupItem[],
    incomingMockups: MockupItem[]
): MockupItem[] => {
    if (!incomingMockups || incomingMockups.length === 0) return currentLocals;
    if (!currentLocals || currentLocals.length === 0) return incomingMockups;

    const mergedLocals = currentLocals.map(local => {
        const incoming = incomingMockups.find(m => m.id === local.id);
        if (!incoming) return local;

        // 1. If currently generating, local state has absolute priority
        if (local.isGenerating) {
            return local;
        }

        const isBack = local.view === 'back' || isBackId(local.id);

        // 2. If locally marked as fresh (newly generated slot)
        if (local.isFresh) {
            // Check if incoming is the Cloud Storage URL uploaded from this exact fresh generation
            const isIncomingHttp = incoming.ai && (incoming.ai.startsWith('http://') || incoming.ai.startsWith('https://'));
            const isIncomingStorage = isIncomingHttp && (incoming.ai!.includes('firebasestorage.googleapis.com') || incoming.ai!.includes('btp_mockups'));
            const isIncomingFresh = incoming.isFresh || (incoming.timestamp || 0) >= (local.timestamp || 0);

            if (isIncomingStorage && isIncomingFresh) {
                // Incoming has the permanent Firebase Storage URL produced by syncSessionToCloud for this fresh mockup!
                const primaryUrl = incoming.ai || incoming.imageUrl || local.ai;
                return {
                    ...local,
                    ...incoming,
                    isFresh: true,
                    timestamp: Math.max(local.timestamp || 0, incoming.timestamp || 0),
                    generatedAt: local.generatedAt || incoming.generatedAt,
                    ai: primaryUrl,
                    aiRemastered: primaryUrl,
                    imageUrl: primaryUrl,
                    frontImageUrl: isBack ? undefined : primaryUrl,
                    backImageUrl: isBack ? primaryUrl : undefined,
                    imageFront: isBack ? undefined : primaryUrl,
                    imageBack: isBack ? primaryUrl : undefined
                };
            }

            // Otherwise, keep the fresh local version in absolute priority!
            // Never let stale or fallback data overwrite a fresh generation.
            return local;
        }

        // 3. If neither is fresh, compare timestamps
        if ((local.timestamp || 0) > (incoming.timestamp || 0)) {
            return local;
        }

        // 4. If local has a real image and incoming does not, keep local
        const isRealImg = (u: any) => u && typeof u === 'string' && (u.startsWith('data:') || u.startsWith('http://') || u.startsWith('https://') || u.includes('btp_mockups'));
        if (isRealImg(local.ai) && !isRealImg(incoming.ai)) {
            return local;
        }

        // 5. Default merge incoming
        const incomingPrimary = incoming.ai || incoming.aiRemastered || incoming.imageUrl || incoming.mechanical || local.imageUrl || local.base;
        return {
            ...local,
            ...incoming,
            ai: incoming.ai || local.ai,
            aiRemastered: incoming.aiRemastered || local.aiRemastered || incoming.ai,
            imageUrl: incomingPrimary,
            frontImageUrl: isBack ? undefined : incomingPrimary,
            backImageUrl: isBack ? incomingPrimary : undefined,
            imageFront: isBack ? undefined : incomingPrimary,
            imageBack: isBack ? incomingPrimary : undefined
        };
    });

    const localIds = new Set(currentLocals.map(l => l.id?.toLowerCase()));
    const extraIncoming = incomingMockups.filter(inc => inc.id && !localIds.has(inc.id.toLowerCase()));
    return [...mergedLocals, ...extraIncoming];
};

export const saveSessionLocal = async (params: SaveSessionParams): Promise<void> => {
    const { sessionId, logoA, logoB, logoPlacements, userData, mockups, logoColorModes = {}, globalLogoColorMode = 'original', enabledProductIds } = params;
    if (!sessionId) return;

    const cleanSid = sessionId.replace(/^audit-/, '');
    const slug = params.slug ? toKebabCaseSlug(params.slug) : getCleanSlug(userData, sessionId);

    if (typeof localStorage !== 'undefined') {
        safeLocalStorageSetItem('btp_active_session_id', sessionId);
        if (slug) safeLocalStorageSetItem('btp_active_session_slug', slug);
    }
    if (typeof window !== 'undefined' && window.history) {
        const search = window.location.search;
        const currentPath = window.location.pathname;
        if (!search && (currentPath === '/portail-audit' || currentPath === '/btp-audit')) {
            const cleanPath = `/portail-audit/${slug || sessionId}`;
            window.history.replaceState({}, '', cleanPath);
        }
    }

    try {
        if (logoA.original) {
            await dbSet(`${sessionId}_A_orig`, logoA.original);
            if (slug && slug !== sessionId) await dbSet(`${slug}_A_orig`, logoA.original);
        }
        if (logoA.rawOriginal) {
            await dbSet(`${sessionId}_A_raw`, logoA.rawOriginal);
            if (slug && slug !== sessionId) await dbSet(`${slug}_A_raw`, logoA.rawOriginal);
        }
        if (logoA.noBg) {
            await dbSet(`${sessionId}_A_nobg`, logoA.noBg);
            if (slug && slug !== sessionId) await dbSet(`${slug}_A_nobg`, logoA.noBg);
        }
        if (logoA.adapted) {
            await dbSet(`${sessionId}_A_adapt`, logoA.adapted);
            if (slug && slug !== sessionId) await dbSet(`${slug}_A_adapt`, logoA.adapted);
        }
        if (logoA.remastered) {
            await dbSet(`${sessionId}_A_remastered`, logoA.remastered);
            if (slug && slug !== sessionId) await dbSet(`${slug}_A_remastered`, logoA.remastered);
        }

        if (logoB.original) {
            await dbSet(`${sessionId}_B_orig`, logoB.original);
            if (slug && slug !== sessionId) await dbSet(`${slug}_B_orig`, logoB.original);
        }
        if (logoB.rawOriginal) {
            await dbSet(`${sessionId}_B_raw`, logoB.rawOriginal);
            if (slug && slug !== sessionId) await dbSet(`${slug}_B_raw`, logoB.rawOriginal);
        }
        if (logoB.noBg) {
            await dbSet(`${sessionId}_B_nobg`, logoB.noBg);
            if (slug && slug !== sessionId) await dbSet(`${slug}_B_nobg`, logoB.noBg);
        }
        if (logoB.adapted) {
            await dbSet(`${sessionId}_B_adapt`, logoB.adapted);
            if (slug && slug !== sessionId) await dbSet(`${slug}_B_adapt`, logoB.adapted);
        }
        if (logoB.remastered) {
            await dbSet(`${sessionId}_B_remastered`, logoB.remastered);
            if (slug && slug !== sessionId) await dbSet(`${slug}_B_remastered`, logoB.remastered);
        }

        // 1. FULL mockups for IndexedDB (keeps everything including high-res / data URLs)
        const lightweightMockups = mockups.map((m: any) => {
            const aiResolved = (m.aiRemastered && isRealAiImage(m.aiRemastered)) ? m.aiRemastered : ((m.ai && isRealAiImage(m.ai)) ? m.ai : null);
            const primaryDisplay = aiResolved || null;
            return {
                id: m.id,
                title: m.title,
                base: m.base,
                isGenerating: m.isGenerating,
                view: m.view,
                garment: m.garment,
                hasAi: !!aiResolved,
                selected: m.selected,
                mechanical: (m.mechanical && !isRealAiImage(m.mechanical)) ? m.mechanical : null,
                ai: aiResolved,
                aiRemastered: aiResolved,
                imageUrl: primaryDisplay,
                frontImageUrl: (m.view === 'front' ? aiResolved : undefined) || (m.frontImageUrl && isRealAiImage(m.frontImageUrl) ? m.frontImageUrl : null),
                backImageUrl: (m.view === 'back' ? aiResolved : undefined) || (m.backImageUrl && isRealAiImage(m.backImageUrl) ? m.backImageUrl : null),
                imageFront: (m.view === 'front' ? aiResolved : undefined) || (m.imageFront && isRealAiImage(m.imageFront) ? m.imageFront : null),
                imageBack: (m.view === 'back' ? aiResolved : undefined) || (m.imageBack && isRealAiImage(m.imageBack) ? m.imageBack : null),
                isFresh: m.isFresh,
                timestamp: m.timestamp,
                generatedAt: m.generatedAt
            };
        });

        const rawGarmentMockups = extractGarmentMockupMap(mockups);

        const fullSession = {
            sessionId,
            slug,
            cleanSid,
            logoPlacements,
            logoColorModes,
            globalLogoColorMode,
            logoAMode: logoA.mode,
            logoBMode: logoB.mode,
            logoA_isBgRemoved: logoA.isBgRemoved ?? false,
            logoB_isBgRemoved: logoB.isBgRemoved ?? false,
            logoA_raw: logoA.rawOriginal || null,
            logoB_raw: logoB.rawOriginal || null,
            logoA_nobg: logoA.noBg || null,
            logoB_nobg: logoB.noBg || null,
            userData,
            mockups: lightweightMockups,
            items: lightweightMockups,
            garmentMockups: rawGarmentMockups,
            tshirt_front: rawGarmentMockups.tshirt_front,
            tshirt_back: rawGarmentMockups.tshirt_back,
            polo_front: rawGarmentMockups.polo_front,
            polo_back: rawGarmentMockups.polo_back,
            hoodie: rawGarmentMockups.hoodie,
            hoodie_front: rawGarmentMockups.hoodie_front,
            hoodie_back: rawGarmentMockups.hoodie_back,
            enabledProductIds: enabledProductIds || [],
            timestamp: new Date().toISOString()
        };

        const serialized = JSON.stringify(fullSession);
        const urlUid = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('uid') : null;
        const cleanUid = urlUid ? urlUid.replace(/^audit-/, '') : null;
        const kebabUid = urlUid ? toKebabCaseSlug(urlUid) : null;

        const keysToStore = Array.from(new Set([
            sessionId,
            cleanSid,
            slug,
            urlUid,
            cleanUid,
            kebabUid,
            `audit-${cleanSid}`,
            `audit-${slug}`
        ].filter(Boolean) as string[]));

        // 1. IndexedDB: transit EXCLUSIF des gros états complets (sans limite de quota)
        for (const k of keysToStore) {
            await dbSet(`session_obj_${k}`, serialized);
        }
        await dbSet('btp_active_session_data', serialized);

        // 2. localStorage: métadonnées légères UNIQUEMENT (élimination définitive de QuotaExceededError)
        if (typeof localStorage !== 'undefined') {
            try {
                // Preventive cleanup
                pruneBulkyLocalStorageKeys(keysToStore);

                // Suppression formelle des clés de gros états du localStorage
                for (const k of keysToStore) {
                    safeLocalStorageRemoveItem(`session_obj_${k}`);
                }
                safeLocalStorageRemoveItem('btp_active_session_data');

                const storageSafeMockups = lightweightMockups.map(sanitizeMockupForLocalStorage);
                const storageSafeGarmentMockups = sanitizeGarmentMockupMap(rawGarmentMockups);
                const safeMockupsJson = JSON.stringify(storageSafeMockups);
                const safeGarmentJson = JSON.stringify(storageSafeGarmentMockups);

                for (const k of keysToStore) {
                    safeLocalStorageSetItem(`garmentMockups_${k}`, safeGarmentJson);
                    safeLocalStorageSetItem(`btp_garment_mockups_${k}`, safeGarmentJson);
                    safeLocalStorageSetItem(`mockups_${k}`, safeMockupsJson);
                    if (mockups.some(m => m.ai || (m as any).aiRemastered)) {
                        safeLocalStorageSetItem(`btp_mockups_locked_${k}`, 'true');
                    }
                }
                safeLocalStorageSetItem('btp_active_session_id', sessionId);
                if (slug) safeLocalStorageSetItem('btp_active_session_slug', slug);
                if (enabledProductIds && Array.isArray(enabledProductIds)) {
                    const enabledJson = JSON.stringify(enabledProductIds);
                    if (!sessionId && !slug) {
                        safeLocalStorageSetItem('btp_enabled_product_ids', enabledJson);
                    }
                    safeLocalStorageSetItem(`enabled_products_${sessionId}`, enabledJson);
                    if (slug) safeLocalStorageSetItem(`enabled_products_${slug}`, enabledJson);
                    for (const k of keysToStore) {
                        safeLocalStorageSetItem(`enabled_products_${k}`, enabledJson);
                    }
                }
                if (!sessionId && !slug) {
                    safeLocalStorageSetItem('btp_garment_mockups', safeGarmentJson);
                    safeLocalStorageSetItem('garmentMockups', safeGarmentJson);
                    safeLocalStorageSetItem('mockups', safeMockupsJson);
                    if (mockups.some(m => m.ai || (m as any).aiRemastered)) {
                        safeLocalStorageSetItem('btp_mockups_locked', 'true');
                    }
                }
                safeLocalStorageSetItem(`btp_garment_mockups_${sessionId}`, safeGarmentJson);
                if (slug) safeLocalStorageSetItem(`btp_garment_mockups_${slug}`, safeGarmentJson);

                for (const gKey of ALL_STANDARD_GARMENT_KEYS) {
                    if (storageSafeGarmentMockups[gKey]) {
                        safeLocalStorageSetItem(`btp_mockup_${gKey}`, storageSafeGarmentMockups[gKey]);
                        safeLocalStorageSetItem(`btp_mockup_${gKey}_${sessionId}`, storageSafeGarmentMockups[gKey]);
                        if (slug) safeLocalStorageSetItem(`btp_mockup_${gKey}_${slug}`, storageSafeGarmentMockups[gKey]);
                    } else {
                        safeLocalStorageRemoveItem(`btp_mockup_${gKey}`);
                        safeLocalStorageRemoveItem(`btp_mockup_${gKey}_${sessionId}`);
                        if (slug) safeLocalStorageRemoveItem(`btp_mockup_${gKey}_${slug}`);
                    }
                }
            } catch (e) {
                console.warn("[Storage] saveSessionLocal localStorage error safely captured:", e);
            }
        }

        for (const m of mockups) {
            const isSelected = m.selected !== false && (m as any).isSelected !== false;
            if (!isSelected) {
                // Delete from IndexedDB and purge slot cache
                await dbDelete(`${sessionId}_ai_${m.id}`);
                await dbDelete(`${sessionId}_mech_${m.id}`);
                if (slug && slug !== sessionId) {
                    await dbDelete(`${slug}_ai_${m.id}`);
                    await dbDelete(`${slug}_mech_${m.id}`);
                }
                await purgeMockupSlotCache(m.id, sessionId, slug);
                continue;
            }
            const activeAi = (m as any).aiRemastered || m.ai;
            if (activeAi && typeof activeAi === 'string') {
                const compressedAi = await compressBase64Image(activeAi, 800, 0.82);
                await dbSet(`${sessionId}_ai_${m.id}`, compressedAi);
                if (slug && slug !== sessionId) {
                    await dbSet(`${slug}_ai_${m.id}`, compressedAi);
                }
            }
            if (m.mechanical && typeof m.mechanical === 'string') {
                const compressedMech = await compressBase64Image(m.mechanical, 800, 0.82);
                await dbSet(`${sessionId}_mech_${m.id}`, compressedMech);
                if (slug && slug !== sessionId) {
                    await dbSet(`${slug}_mech_${m.id}`, compressedMech);
                }
            }
        }
    } catch (err) {
        console.error("Critical local persistence error:", err);
    }
};

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let lastPendingParams: SaveSessionParams | null = null;

export const debouncedSaveSessionLocal = (
    params: SaveSessionParams,
    delayMs: number = 500
): Promise<void> => {
    lastPendingParams = params;
    return new Promise((resolve) => {
        if (debounceTimer) {
            clearTimeout(debounceTimer);
        }
        debounceTimer = setTimeout(async () => {
            debounceTimer = null;
            if (lastPendingParams) {
                const toSave = lastPendingParams;
                lastPendingParams = null;
                await saveSessionLocal(toSave);
            }
            resolve();
        }, delayMs);
    });
};

export const flushDebouncedSave = async (): Promise<void> => {
    if (debounceTimer) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
    }
    if (lastPendingParams) {
        const toSave = lastPendingParams;
        lastPendingParams = null;
        await saveSessionLocal(toSave);
    }
};

export interface CloudSyncResult {
    success: boolean;
    previewId?: string;
    targetSlug?: string;
    mockups?: MockupItem[];
    error?: any;
}

/**
 * Recovers Base64 images trapped in IndexedDB (BtpAuditDB / heavy_assets),
 * uploads them directly to Firebase Storage under btp_mockups/${slug}/web/${id}.png,
 * and updates SiteConfigs/${slug} and btp_projects/${sessionId} with public URLs.
 */
export const syncSessionToCloud = async (params: SaveSessionParams): Promise<CloudSyncResult> => {
    const { sessionId, logoA, logoB, logoPlacements, userData, mockups, logoColorModes = {}, globalLogoColorMode = 'original', enabledProductIds } = params;
    if (!sessionId) return { success: false };

    try {
        const slug = getCleanSlug(userData, sessionId, params.slug);

        let pId = typeof localStorage !== 'undefined' ? localStorage.getItem(`btp_preview_uuid_${sessionId}`) : null;
        if (!pId) {
            pId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
            if (typeof localStorage !== 'undefined') {
                safeLocalStorageSetItem(`btp_preview_uuid_${sessionId}`, pId);
            }
        }

        // Ensure anonymous auth check if needed
        if (!auth.currentUser) {
            try {
                await signInAnonymously(auth);
            } catch (e) {
                console.warn('[Storage] Anonymous auth check:', e);
            }
        }

        // In-memory mapping from raw Base64 buffers to public HTTPS Storage URLs
        const urlMap: Record<string, string> = {};

        // Direct upload of active logo to Firebase Storage
        const getActiveLogoUrl = async (l: BtpLogo, slot: string): Promise<string | null> => {
            if (!l) return null;

            // 1. Priorité absolue : activeUrl officiel déjà résolu
            if (l.activeUrl && typeof l.activeUrl === 'string' && l.activeUrl.startsWith('http') && l.activeUrl.includes(`logo_${slot}_active`)) {
                if (l.original && typeof l.original === 'string') urlMap[l.original] = l.activeUrl;
                return l.activeUrl;
            }

            // 2. Protection stricte : si logo_${slot}_active.png existe déjà sur Firebase Storage,
            // interdire formellement son écrasement par un crop automatique ou un buffer temporaire.
            const candidateSlugs = Array.from(new Set([slug, sessionId, (params as any)?.slug].filter(Boolean) as string[]));
            for (const s of candidateSlugs) {
                try {
                    const checkRef = ref(storage, `btp_mockups/${s}/web/logo_${slot}_active.png`);
                    const existingDlUrl = await getDownloadURL(checkRef);
                    if (existingDlUrl) {
                        console.log(`-> [PERSISTENCE_SAFETY] logo_${slot}_active.png existe déjà sur Firebase Storage (${s}). Préservation stricte sans écrasement par crop.`);
                        l.activeUrl = existingDlUrl;
                        if (l.original && typeof l.original === 'string') urlMap[l.original] = existingDlUrl;
                        return existingDlUrl;
                    }
                } catch (checkErr) {
                    // Storage object non trouvé sur ce slug, on continue
                }
            }

            const mode = l.mode || 'original';
            let base64 = l[mode as keyof BtpLogo] || l.original;
            if (mode === 'adapted' && l.remastered && (l as any).adaptedRemastered) {
                base64 = (l as any).adaptedRemastered;
            }
            if (!base64 || (typeof base64 === 'string' && !base64.startsWith('http') && !base64.startsWith('data:') && base64.length < 50)) {
                const idbLogo = await dbGet(`${sessionId}_${slot}_${mode}`) || await dbGet(`${sessionId}_${slot}_orig`);
                if (idbLogo) base64 = idbLogo;
            }
            if (base64 && typeof base64 === 'string') {
                if (base64.startsWith('http')) return base64;
                if (base64.startsWith('data:') || base64.length > 50) {
                    try {
                        const storagePath = `btp_mockups/${slug}/web/logo_${slot}_active.png`;
                        const storageRef = ref(storage, storagePath);
                        let dataUrl = base64.trim();
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
                        const downloadUrl = await getDownloadURL(storageRef);
                        console.log(`-> Upload initial réussi [logo_${slot}] vers ${storagePath}`);
                        l.activeUrl = downloadUrl;
                        urlMap[base64] = downloadUrl;
                        urlMap[base64.trim()] = downloadUrl;
                        if (l.original && typeof l.original === 'string') urlMap[l.original] = downloadUrl;
                        return downloadUrl;
                    } catch (e) {
                        console.warn(`Direct upload notice for logo ${slot}:`, e);
                        return (l.activeUrl && typeof l.activeUrl === 'string' && l.activeUrl.startsWith('http')) ? l.activeUrl : null;
                    }
                }
            }
            return (base64 && typeof base64 === 'string' && base64.startsWith('http')) ? base64 : null;
        };

        // Direct upload helper for mockup base64 buffers
        const uploadIfBase64 = async (base64OrUrl: string | null, id: string): Promise<string | null> => {
            if (!base64OrUrl || typeof base64OrUrl !== 'string') return null;
            if (base64OrUrl.startsWith('http://') || base64OrUrl.startsWith('https://')) return base64OrUrl;
            if (base64OrUrl.startsWith('/assets/') || base64OrUrl.startsWith('/merch/')) return base64OrUrl;
            if (base64OrUrl.startsWith('data:') || base64OrUrl.length > 50) {
                try {
                    let dataUrl = base64OrUrl.trim();
                    if (!dataUrl.startsWith('data:')) {
                        dataUrl = `data:image/png;base64,${dataUrl}`;
                    }
                    const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,/);
                    const contentType = match ? match[1] : 'image/png';
                    const storagePath = `btp_mockups/${slug}/web/${id}.png`;
                    const storageRef = ref(storage, storagePath);
                    const metadata: UploadMetadata = {
                        contentType,
                        cacheControl: 'public, max-age=3600, must-revalidate'
                    };
                    await uploadString(storageRef, dataUrl, 'data_url', metadata);
                    const downloadUrl = await getDownloadURL(storageRef);
                    console.log(`-> Upload réussi [${id}] vers ${storagePath}`);
                    urlMap[base64OrUrl] = downloadUrl;
                    urlMap[base64OrUrl.trim()] = downloadUrl;
                    return downloadUrl;
                } catch (e) {
                    console.warn(`Direct storage upload failed for ${id}:`, e);
                    try {
                        const storagePath = `btp_mockups/${slug}/web/${id}.png`;
                        const existingRef = ref(storage, storagePath);
                        const existingUrl = await getDownloadURL(existingRef);
                        if (existingUrl && existingUrl.startsWith('http')) {
                            urlMap[base64OrUrl] = existingUrl;
                            urlMap[base64OrUrl.trim()] = existingUrl;
                            return existingUrl;
                        }
                    } catch (chkErr) {}
                    return null;
                }
            }
            return null;
        };

        const [urlA, urlB] = await Promise.all([
            getActiveLogoUrl(logoA, 'A'),
            getActiveLogoUrl(logoB, 'B')
        ]);

        if (logoA) {
            if (logoA.original && urlA) { urlMap[logoA.original] = urlA; urlMap[logoA.original.trim()] = urlA; }
            if (logoA.adapted && urlA) { urlMap[logoA.adapted] = urlA; urlMap[logoA.adapted.trim()] = urlA; }
            if (logoA.remastered && urlA) { urlMap[logoA.remastered] = urlA; urlMap[logoA.remastered.trim()] = urlA; }
        }
        if (logoB) {
            if (logoB.original && urlB) { urlMap[logoB.original] = urlB; urlMap[logoB.original.trim()] = urlB; }
            if (logoB.adapted && urlB) { urlMap[logoB.adapted] = urlB; urlMap[logoB.adapted.trim()] = urlB; }
            if (logoB.remastered && urlB) { urlMap[logoB.remastered] = urlB; urlMap[logoB.remastered.trim()] = urlB; }
        }

        const isBackId = (id?: string) => !id ? false : /(back|dos|verso|tback|pback|hback|tankback|tankwhiteback|heavyback|heavywhiteback)/i.test(id);
        const isFrontId = (id?: string) => !id ? false : /(front|face|recto|tfront|pfront|hfront|tankfront|tankwhitefront|heavyfront|heavywhitefront)/i.test(id);

        // Systematic recovery: inspect mockups and query IndexedDB for any trapped images
        const allMockupsToProcess: MockupItem[] = [...(mockups || [])];

        const STANDARD_IDS = [
            'tFront', 'tBack',
            'tWhiteFront', 'tWhiteBack',
            'pFront', 'pBack',
            'pWhiteFront', 'pWhiteBack',
            'hFront', 'hBack',
            'hWhiteFront', 'hWhiteBack',
            'tankFront', 'tankBack',
            'tankWhiteFront', 'tankWhiteBack',
            'heavyFront', 'heavyBack',
            'heavyWhiteFront', 'heavyWhiteBack',
            'E3520_front', 'E3520_back'
        ];

        const isItemEligible = (id?: string, customSku?: string, garment?: string, supplierRef?: string): boolean => {
            if (!enabledProductIds || enabledProductIds.length === 0) return true;
            if (enabledProductIds.includes('__none__')) return false;
            const candidates = [id, customSku, garment, supplierRef].filter(Boolean) as string[];
            const isWhite = candidates.some(c => {
                const cl = c.toLowerCase();
                return cl.includes('white') || cl.includes('blanc') || cl.includes('wht');
            });
            return candidates.some(c => {
                const cLower = c.toLowerCase();
                return enabledProductIds.some(e => {
                    const eLower = (e || '').toLowerCase();
                    const eIsWhite = eLower.includes('white') || eLower.includes('blanc') || eLower.includes('wht');
                    // Strict separation: white item never matches non-white enabled ID and vice versa
                    if (isWhite !== eIsWhite && !eLower.includes('__all__')) {
                        return false;
                    }
                    if (eLower === cLower) return true;
                    if (cLower === 'jhk170-blk' && (eLower === 'jhk170-classic-tshirt' || eLower === 'tshirt' || eLower === 'tfront' || eLower === 'tback')) return true;
                    if (cLower === 'jhk170-wht' && (eLower === 'jhk170-classic-tshirt-white' || eLower === 'tshirt_white' || eLower === 'twhitefront' || eLower === 'twhiteback')) return true;
                    if (cLower === 'jhk510-blk' && (eLower === 'jhk510-polo-premium' || eLower === 'polo' || eLower === 'pfront' || eLower === 'pback')) return true;
                    if (cLower === 'jhk510-wht' && (eLower === 'jhk510-polo-premium-white' || eLower === 'polo_white' || eLower === 'pwhitefront' || eLower === 'pwhiteback')) return true;
                    if (cLower === 'jhk421-blk' && (eLower === 'jhk421-hoodie' || eLower === 'hoodie' || eLower === 'sweat' || eLower === 'hfront' || eLower === 'hback')) return true;
                    if (cLower === 'jhk421-wht' && (eLower === 'jhk421-hoodie-white' || eLower === 'hoodie_white' || eLower === 'sweat_white' || eLower === 'hwhitefront' || eLower === 'hwhiteback')) return true;
                    if (cLower === 'bybb011-blk' && (eLower === 'visionroom-basic-tank' || eLower === 'tank_top' || eLower === 'tankfront' || eLower === 'tankback')) return true;
                    if (cLower === 'bybb011-wht' && (eLower === 'visionroom-basic-tank-white' || eLower === 'tank_top_white' || eLower === 'tankwhitefront' || eLower === 'tankwhiteback')) return true;
                    if (cLower === 'nx7200-blk' && (eLower === 'visionroom-heavyweight-tee' || eLower === 'tshirt_oversize' || eLower === 'heavyfront' || eLower === 'heavyback')) return true;
                    if (cLower === 'nx7200-wht' && (eLower === 'visionroom-heavyweight-tee-white' || eLower === 'tshirt_oversize_white' || eLower === 'heavywhitefront' || eLower === 'heavywhiteback')) return true;
                    if (cLower === 'e3520' && (eLower.includes('e3520') || eLower.includes('sport'))) return true;
                    return eLower === cLower || (eLower.includes(cLower) && eLower.length <= cLower.length + 5);
                });
            });
        };

        // STRICT FILTER: Identify unselected or ineligible slots, remove them from allMockupsToProcess, and purge their cache
        const unselectedOrIneligibleSlots: string[] = [];
        for (const m of allMockupsToProcess) {
            const isEligible = isItemEligible(m.id, (m as any).sku, m.garment, (m as any).supplierRef);
            if (!m.selected || (m as any).isSelected === false || !isEligible) {
                unselectedOrIneligibleSlots.push(m.id);
            }
        }
        for (const slotId of unselectedOrIneligibleSlots) {
            await purgeMockupSlotCache(slotId, sessionId, slug);
            await dbDelete(`${sessionId}_ai_${slotId}`);
            await dbDelete(`${sessionId}_mech_${slotId}`);
            if (slug && slug !== sessionId) {
                await dbDelete(`${slug}_ai_${slotId}`);
                await dbDelete(`${slug}_mech_${slotId}`);
            }
        }

        const uploadedMockups: MockupItem[] = await Promise.all(allMockupsToProcess.map(async (m): Promise<MockupItem> => {
            const isBack = m.view === 'back' || isBackId(m.id);
            const garment = (m.garment || 'tshirt') as MockupItem['garment'];

            // Fetch any trapped base64 from IndexedDB (BtpAuditDB / heavy_assets)
            const idbAi = await dbGet(`${sessionId}_ai_${m.id}`);
            const idbMech = await dbGet(`${sessionId}_mech_${m.id}`);

            const hasAi = !!(m.ai || (m as any).aiRemastered || idbAi);
            const hasMech = !!(m.mechanical || idbMech);
            const isGenerated = hasAi || hasMech;

            // Only process selected and generated mockups
            if (!m.selected || !isGenerated) {
                const safeAi = (m.ai && typeof m.ai === 'string' && isRealAiImage(m.ai)) ? m.ai : null;
                const safeMech = (m.mechanical && typeof m.mechanical === 'string' && (m.mechanical.startsWith('http') || m.mechanical.startsWith('/assets/') || m.mechanical.startsWith('/merch/'))) ? m.mechanical : null;
                return {
                    ...m,
                    id: m.id || "",
                    title: m.title || "",
                    garment,
                    view: m.view || (isBack ? 'back' : 'front'),
                    selected: !!m.selected,
                    ai: safeAi,
                    mechanical: safeMech,
                    base: (m as any).base || "",
                    isGenerating: false,
                    aiRemastered: safeAi,
                    model: m.model
                };
            }

            const isFrontItem = m.view === 'front' || (!m.id.toLowerCase().includes('back') && !m.id.toLowerCase().includes('dos'));
            const slot = (resolveSlotForPlacement(m.id, logoPlacements) === 'B' && !!(logoB?.original || logoB?.activeUrl)) ? 'B' : 'A';
            const logo = slot === 'A' ? logoA : logoB;
            let activeAi = (m as any).aiRemastered || m.ai;

            // SYSTEMATIC INDEXEDDB RECOVERY: only if m is NOT fresh and activeAi is missing/default
            if (!m.isFresh && (!activeAi || (typeof activeAi === 'string' && (activeAi.startsWith('/assets/') || activeAi.startsWith('/merch/'))))) {
                if (idbAi && typeof idbAi === 'string' && (idbAi.startsWith('data:') || idbAi.length > 50)) {
                    activeAi = idbAi;
                }
            }

            let mechData = m.mechanical;
            if (!m.isFresh && (!mechData || (typeof mechData === 'string' && (mechData.startsWith('/assets/') || mechData.startsWith('/merch/'))))) {
                if (idbMech && typeof idbMech === 'string' && (idbMech.startsWith('data:') || idbMech.length > 50)) {
                    mechData = idbMech;
                }
            }

            const [aiUrl, mechUrl] = await Promise.all([
                uploadIfBase64(activeAi, m.id),
                uploadIfBase64(mechData, `${m.id}_mech`)
            ]);

            const finalAi = (aiUrl && isRealAiImage(aiUrl))
                ? aiUrl
                : (activeAi && typeof activeAi === 'string' && isRealAiImage(activeAi) ? activeAi : null);

            const finalMech = (mechUrl && (mechUrl.startsWith('http://') || mechUrl.startsWith('https://')))
                ? mechUrl
                : (mechData && typeof mechData === 'string' && (mechData.startsWith('http://') || mechData.startsWith('https://') || mechData.startsWith('/assets/') || mechData.startsWith('/merch/')) ? mechData : null);

            if (activeAi && typeof activeAi === 'string' && activeAi.length > 50 && finalAi && finalAi.startsWith('http')) {
                urlMap[activeAi] = finalAi;
                urlMap[activeAi.trim()] = finalAi;
            }
            if (mechData && typeof mechData === 'string' && mechData.length > 50 && finalMech && finalMech.startsWith('http')) {
                urlMap[mechData] = finalMech;
                urlMap[mechData.trim()] = finalMech;
            }

            const primaryUrl = (finalAi && isRealAiImage(finalAi)) ? finalAi : null;

            const isFreshSlot = Boolean(m.isFresh);
            const slotTimestamp = m.timestamp || Date.now();
            const slotGeneratedAt = m.generatedAt || slotTimestamp;

            const updatedMockup: MockupItem = {
                ...m,
                id: m.id || "",
                title: m.title || "",
                garment,
                view: m.view || (isBack ? 'back' : 'front'),
                selected: true,
                ai: primaryUrl,
                aiRemastered: primaryUrl,
                mechanical: finalMech,
                base: (m as any).base || "",
                isGenerating: false,
                model: m.model,
                isFresh: isFreshSlot,
                timestamp: slotTimestamp,
                generatedAt: slotGeneratedAt
            };

            (updatedMockup as any).imageUrl = primaryUrl;
            if (isBack) {
                (updatedMockup as any).backImageUrl = primaryUrl;
                (updatedMockup as any).imageBack = primaryUrl;
            } else {
                (updatedMockup as any).frontImageUrl = primaryUrl;
                (updatedMockup as any).imageFront = primaryUrl;
            }

            return updatedMockup;
        }));

        // Immediately keep IndexedDB in sync with the uploaded/fresh URLs
        for (const m of uploadedMockups) {
            if (m.id && m.ai) {
                await dbSet(`${sessionId}_ai_${m.id}`, m.ai);
                if (slug && slug !== sessionId) {
                    await dbSet(`${slug}_ai_${m.id}`, m.ai);
                }
            }
        }

        const isWhiteMock = (m?: any): boolean => {
            if (!m) return false;
            const mid = (m.id || '').toLowerCase();
            const mtitle = (m.title || '').toLowerCase();
            const mcolor = (m.color || '').toLowerCase();
            const msku = (m.sku || '').toLowerCase();
            return mcolor === 'white' || mcolor === 'blanc' || mid.includes('white') || mid.includes('blanc') || mid.includes('-wht') || mid.startsWith('twhite') || mid.startsWith('pwhite') || mid.startsWith('hwhite') || mtitle.includes('blanc') || mtitle.includes('white') || msku.includes('-wht');
        };

        const isItemActive = (m?: any): boolean => {
            if (!m) return false;
            const isSel = m.selected === true || (m as any).isSelected === true;
            if (!isSel) return false;
            return isItemEligible(m.id, (m as any).sku, m.garment, (m as any).supplierRef);
        };

        const tshirtMock = uploadedMockups.find(m => isItemActive(m) && ((m.garment === 'tshirt' && m.view === 'front') || m.id === 'tFront' || (m.garment === 'tshirt' && isFrontId(m.id))) && !isWhiteMock(m));
        const tshirtWhiteMock = uploadedMockups.find(m => isItemActive(m) && (m.id === 'tWhiteFront' || m.id === 'JHK170-WHT_front' || ((m.garment === 'tshirt' && isFrontId(m.id)) && isWhiteMock(m))));
        const poloMock = uploadedMockups.find(m => isItemActive(m) && ((m.garment === 'polo' && m.view === 'front') || m.id === 'pFront' || (m.garment === 'polo' && isFrontId(m.id))) && !isWhiteMock(m));
        const poloWhiteMock = uploadedMockups.find(m => isItemActive(m) && (m.id === 'pWhiteFront' || m.id === 'JHK510-WHT_front' || ((m.garment === 'polo' && isFrontId(m.id)) && isWhiteMock(m))));
        const hoodieMock = uploadedMockups.find(m => isItemActive(m) && ((m.garment === 'sweat' && m.view === 'front') || m.id === 'hFront' || (m.garment === 'sweat' && isFrontId(m.id))) && !isWhiteMock(m));
        const hoodieWhiteMock = uploadedMockups.find(m => isItemActive(m) && (m.id === 'hWhiteFront' || m.id === 'JHK421-WHT_front' || ((m.garment === 'sweat' && isFrontId(m.id)) && isWhiteMock(m))));
        const tankMock = uploadedMockups.find(m => isItemActive(m) && (m.id === 'tankFront' || (m.garment === 'tank_top' && m.view === 'front' && !isWhiteMock(m))));
        const tankWhiteMock = uploadedMockups.find(m => isItemActive(m) && (m.id === 'tankWhiteFront' || (m.garment === 'tank_top' && m.view === 'front' && isWhiteMock(m))));
        const heavyMock = uploadedMockups.find(m => isItemActive(m) && ((m.garment === 'tshirt_oversize' && m.view === 'front') || m.id === 'heavyFront' || (m.garment === 'tshirt_oversize' && isFrontId(m.id))) && !isWhiteMock(m));
        const heavyWhiteMock = uploadedMockups.find(m => isItemActive(m) && (m.id === 'heavyWhiteFront' || m.id === 'heavy_white_front' || ((m.garment === 'tshirt_oversize' && m.view === 'front') && isWhiteMock(m))));

        const tshirtBackMock = uploadedMockups.find(m => isItemActive(m) && ((m.garment === 'tshirt' && m.view === 'back') || m.id === 'tBack' || (m.garment === 'tshirt' && isBackId(m.id))) && !isWhiteMock(m));
        const tshirtWhiteBackMock = uploadedMockups.find(m => isItemActive(m) && (m.id === 'tWhiteBack' || m.id === 'JHK170-WHT_back' || ((m.garment === 'tshirt' && isBackId(m.id)) && isWhiteMock(m))));
        const poloBackMock = uploadedMockups.find(m => isItemActive(m) && ((m.garment === 'polo' && m.view === 'back') || m.id === 'pBack' || (m.garment === 'polo' && isBackId(m.id))) && !isWhiteMock(m));
        const poloWhiteBackMock = uploadedMockups.find(m => isItemActive(m) && (m.id === 'pWhiteBack' || m.id === 'JHK510-WHT_back' || ((m.garment === 'polo' && isBackId(m.id)) && isWhiteMock(m))));
        const hoodieBackMock = uploadedMockups.find(m => isItemActive(m) && ((m.garment === 'sweat' && m.view === 'back') || m.id === 'hBack' || (m.garment === 'sweat' && isBackId(m.id))) && !isWhiteMock(m));
        const hoodieWhiteBackMock = uploadedMockups.find(m => isItemActive(m) && (m.id === 'hWhiteBack' || m.id === 'JHK421-WHT_back' || ((m.garment === 'sweat' && isBackId(m.id)) && isWhiteMock(m))));
        const tankBackMock = uploadedMockups.find(m => isItemActive(m) && (m.id === 'tankBack' || (m.garment === 'tank_top' && m.view === 'back' && !isWhiteMock(m))));
        const tankWhiteBackMock = uploadedMockups.find(m => isItemActive(m) && (m.id === 'tankWhiteBack' || (m.garment === 'tank_top' && m.view === 'back' && isWhiteMock(m))));
        const heavyBackMock = uploadedMockups.find(m => isItemActive(m) && ((m.garment === 'tshirt_oversize' && m.view === 'back') || m.id === 'heavyBack' || (m.garment === 'tshirt_oversize' && isBackId(m.id))) && !isWhiteMock(m));
        const heavyWhiteBackMock = uploadedMockups.find(m => isItemActive(m) && (m.id === 'heavyWhiteBack' || m.id === 'heavy_white_back' || m.id === 'tshirt_oversize_white_back' || ((m.garment === 'tshirt_oversize' && m.view === 'back') && isWhiteMock(m))));

        const isFlatComposite = (u?: string | null) => {
            if (!u || typeof u !== 'string') return false;
            if (u.startsWith('data:image') || u.startsWith('http://') || u.startsWith('https://') || u.startsWith('/') || u.includes('btp_mockups') || u.includes('_ai_') || u.includes('_mech_') || u.includes('/merch/')) return true;
            return false;
        };

        const effectiveFrontLogo = (resolveSlotForPlacement('tFront', logoPlacements) === 'B' ? urlB : urlA) || urlA || urlB || "";
        const effectiveBackLogo = (resolveSlotForPlacement('tBack', logoPlacements) === 'B' ? urlB : urlA) || urlA || urlB || "";
        const effectiveTshirtWhiteFrontLogo = (resolveSlotForPlacement('tWhiteFront', logoPlacements) === 'B' ? urlB : urlA) || urlA || urlB || "";
        const effectiveTshirtWhiteBackLogo = (resolveSlotForPlacement('tWhiteBack', logoPlacements) === 'B' ? urlB : urlA) || urlA || urlB || "";
        const effectivePoloFrontLogo = (resolveSlotForPlacement('pFront', logoPlacements) === 'B' ? urlB : urlA) || urlA || urlB || "";
        const effectivePoloBackLogo = (resolveSlotForPlacement('pBack', logoPlacements) === 'B' ? urlB : urlA) || urlA || urlB || "";
        const effectivePoloWhiteFrontLogo = (resolveSlotForPlacement('pWhiteFront', logoPlacements) === 'B' ? urlB : urlA) || urlA || urlB || "";
        const effectivePoloWhiteBackLogo = (resolveSlotForPlacement('pWhiteBack', logoPlacements) === 'B' ? urlB : urlA) || urlA || urlB || "";
        const effectiveHoodieFrontLogo = (resolveSlotForPlacement('hFront', logoPlacements) === 'B' ? urlB : urlA) || urlA || urlB || "";
        const effectiveHoodieBackLogo = (resolveSlotForPlacement('hBack', logoPlacements) === 'B' ? urlB : urlA) || urlA || urlB || "";
        const effectiveHoodieWhiteFrontLogo = (resolveSlotForPlacement('hWhiteFront', logoPlacements) === 'B' ? urlB : urlA) || urlA || urlB || "";
        const effectiveHoodieWhiteBackLogo = (resolveSlotForPlacement('hWhiteBack', logoPlacements) === 'B' ? urlB : urlA) || urlA || urlB || "";
        const effectiveTankFrontLogo = (resolveSlotForPlacement('tankFront', logoPlacements) === 'B' ? urlB : urlA) || urlA || urlB || "";
        const effectiveTankBackLogo = (resolveSlotForPlacement('tankBack', logoPlacements) === 'B' ? urlB : urlA) || urlA || urlB || "";
        const effectiveTankWhiteFrontLogo = (resolveSlotForPlacement('tankWhiteFront', logoPlacements) === 'B' ? urlB : urlA) || urlA || urlB || "";
        const effectiveTankWhiteBackLogo = (resolveSlotForPlacement('tankWhiteBack', logoPlacements) === 'B' ? urlB : urlA) || urlA || urlB || "";
        const effectiveHeavyFrontLogo = (resolveSlotForPlacement('heavyFront', logoPlacements) === 'B' ? urlB : urlA) || urlA || urlB || "";
        const effectiveHeavyBackLogo = (resolveSlotForPlacement('heavyBack', logoPlacements) === 'B' ? urlB : urlA) || urlA || urlB || "";
        const effectiveHeavyWhiteFrontLogo = (resolveSlotForPlacement('heavyWhiteFront', logoPlacements) === 'B' ? urlB : urlA) || urlA || urlB || "";
        const effectiveHeavyWhiteBackLogo = (resolveSlotForPlacement('heavyWhiteBack', logoPlacements) === 'B' ? urlB : urlA) || urlA || urlB || "";

        const resolveMockupAiOnly = (mock?: any): string | null => {
            if (!mock) return null;
            const candidates = [
                mock.aiRemastered,
                mock.ai,
                (mock as any).realAiSnapshotUrl,
                (mock as any).imageStudio,
                (mock as any).frontImageUrl,
                (mock as any).backImageUrl,
                (mock as any).imageFront,
                (mock as any).imageBack,
                (mock as any).imageUrl
            ];
            for (const c of candidates) {
                if (c && isRealAiImage(c)) return c;
            }
            return null;
        };

        const hasTshirtEnabled = enabledProductIds && enabledProductIds.length > 0
            ? enabledProductIds.some(id => {
                const l = id.toLowerCase();
                return l.includes('tshirt') || l.includes('jhk170') || l === 'tfront' || l === 'tback';
            })
            : allMockupsToProcess.some(m => isItemActive(m) && (m.garment === 'tshirt' || (m.id && (m.id.startsWith('t') || m.id.includes('170')))));

        const hasPoloEnabled = enabledProductIds && enabledProductIds.length > 0
            ? enabledProductIds.some(id => {
                const l = id.toLowerCase();
                return l.includes('polo') || l.includes('jhk510') || l === 'pfront' || l === 'pback';
            })
            : allMockupsToProcess.some(m => isItemActive(m) && (m.garment === 'polo' || (m.id && (m.id.startsWith('p') || m.id.includes('510')))));

        const hasHoodieEnabled = enabledProductIds && enabledProductIds.length > 0
            ? enabledProductIds.some(id => {
                const l = id.toLowerCase();
                return l.includes('hoodie') || l.includes('sweat') || l.includes('jhk421') || l === 'hfront' || l === 'hback';
            })
            : allMockupsToProcess.some(m => isItemActive(m) && (m.garment === 'sweat' || m.garment === 'hoodie' || (m.id && (m.id.startsWith('h') || m.id.includes('421')))));

        const hasTankEnabled = enabledProductIds && enabledProductIds.length > 0
            ? enabledProductIds.some(id => id.toLowerCase().includes('tank') || id.toLowerCase().includes('bybb011'))
            : allMockupsToProcess.some(m => isItemActive(m) && (m.garment === 'tank_top' || (m.id && m.id.toLowerCase().includes('tank'))));

        const hasHeavyEnabled = enabledProductIds && enabledProductIds.length > 0
            ? enabledProductIds.some(id => id.toLowerCase().includes('heavy') || id.toLowerCase().includes('oversize') || id.toLowerCase().includes('nx7200'))
            : allMockupsToProcess.some(m => isItemActive(m) && (m.garment === 'tshirt_oversize' || (m.id && (m.id.toLowerCase().includes('heavy') || m.id.toLowerCase().includes('nx7200')))));

        const hasE3520Enabled = enabledProductIds && enabledProductIds.length > 0
            ? enabledProductIds.some(id => id.toLowerCase().includes('e3520') || id.toLowerCase().includes('sportt') || id.toLowerCase().includes('sport_tshirt'))
            : allMockupsToProcess.some(m => isItemActive(m) && ((m.garment as string) === 'sport_tshirt' || (m.id && (m.id.toLowerCase().includes('e3520') || m.id.toLowerCase().includes('sportt')))));

        let tshirtImg = hasTshirtEnabled ? resolveMockupAiOnly(tshirtMock) : null;
        let tshirtBackImg = hasTshirtEnabled ? resolveMockupAiOnly(tshirtBackMock) : null;
        let tshirtWhiteImg = hasTshirtEnabled ? resolveMockupAiOnly(tshirtWhiteMock) : null;
        let tshirtWhiteBackImg = hasTshirtEnabled ? resolveMockupAiOnly(tshirtWhiteBackMock) : null;

        let poloImg = hasPoloEnabled ? resolveMockupAiOnly(poloMock) : null;
        let poloBackImg = hasPoloEnabled ? resolveMockupAiOnly(poloBackMock) : null;
        let poloWhiteImg = hasPoloEnabled ? resolveMockupAiOnly(poloWhiteMock) : null;
        let poloWhiteBackImg = hasPoloEnabled ? resolveMockupAiOnly(poloWhiteBackMock) : null;

        let hoodieImg = hasHoodieEnabled ? resolveMockupAiOnly(hoodieMock) : null;
        let hoodieBackImg = hasHoodieEnabled ? resolveMockupAiOnly(hoodieBackMock) : null;
        let hoodieWhiteImg = hasHoodieEnabled ? resolveMockupAiOnly(hoodieWhiteMock) : null;
        let hoodieWhiteBackImg = hasHoodieEnabled ? resolveMockupAiOnly(hoodieWhiteBackMock) : null;

        let tankImg = hasTankEnabled ? resolveMockupAiOnly(tankMock) : null;
        let tankBackImg = hasTankEnabled ? resolveMockupAiOnly(tankBackMock) : null;
        let tankWhiteImg = hasTankEnabled ? resolveMockupAiOnly(tankWhiteMock) : null;
        let tankWhiteBackImg = hasTankEnabled ? resolveMockupAiOnly(tankWhiteBackMock) : null;

        let heavyImg = hasHeavyEnabled ? resolveMockupAiOnly(heavyMock) : null;
        let heavyBackImg = hasHeavyEnabled ? resolveMockupAiOnly(heavyBackMock) : null;
        let heavyWhiteImg = hasHeavyEnabled ? resolveMockupAiOnly(heavyWhiteMock) : null;
        let heavyWhiteBackImg = hasHeavyEnabled ? resolveMockupAiOnly(heavyWhiteBackMock) : null;

        if (hasHeavyEnabled && !heavyWhiteImg) {
            const idbAi = await dbGet(`${sessionId}_ai_heavyWhiteFront`).catch(() => null)
                || (slug && slug !== sessionId ? await dbGet(`${slug}_ai_heavyWhiteFront`).catch(() => null) : null)
                || await dbGet(`${sessionId}_ai_heavy_white_front`).catch(() => null)
                || (slug && slug !== sessionId ? await dbGet(`${slug}_ai_heavy_white_front`).catch(() => null) : null);
            if (idbAi && isRealAiImage(idbAi)) {
                heavyWhiteImg = idbAi;
            }
        }
        if (hasHeavyEnabled && !heavyWhiteBackImg) {
            const idbAi = await dbGet(`${sessionId}_ai_heavyWhiteBack`).catch(() => null)
                || (slug && slug !== sessionId ? await dbGet(`${slug}_ai_heavyWhiteBack`).catch(() => null) : null)
                || await dbGet(`${sessionId}_ai_heavy_white_back`).catch(() => null)
                || (slug && slug !== sessionId ? await dbGet(`${slug}_ai_heavy_white_back`).catch(() => null) : null);
            if (idbAi && isRealAiImage(idbAi)) {
                heavyWhiteBackImg = idbAi;
            }
        }

        const uploadToStorageSafe = async (dataOrUrl: string | null | undefined, id: string): Promise<string | null> => {
            if (!dataOrUrl || !isRealAiImage(dataOrUrl)) return null;
            if (dataOrUrl.startsWith('http://') || dataOrUrl.startsWith('https://')) return dataOrUrl;
            if (dataOrUrl.startsWith('data:') || dataOrUrl.length > 50) {
                try {
                    const storagePath = `btp_mockups/${slug}/web/${id}.png`;
                    const uploaded = await uploadBase64ToStorage(dataOrUrl, storagePath);
                    if (uploaded && (uploaded.startsWith('http://') || uploaded.startsWith('https://'))) {
                        urlMap[dataOrUrl] = uploaded;
                        urlMap[dataOrUrl.trim()] = uploaded;
                        return uploaded;
                    }
                    return null;
                } catch (err) {
                    console.warn(`Storage upload failed for ${id}:`, err);
                    return null;
                }
            }
            return null;
        };

        const [
            finalTshirtFront, finalTshirtBack,
            finalTshirtWhiteFront, finalTshirtWhiteBack,
            finalPoloFront, finalPoloBack,
            finalPoloWhiteFront, finalPoloWhiteBack,
            finalHoodieFront, finalHoodieBack,
            finalHoodieWhiteFront, finalHoodieWhiteBack,
            finalTankFront, finalTankBack,
            finalTankWhiteFront, finalTankWhiteBack,
            finalHeavyFront, finalHeavyBack,
            finalHeavyWhiteFront, finalHeavyWhiteBack
        ] = await Promise.all([
            uploadToStorageSafe(tshirtImg, 'tFront'),
            uploadToStorageSafe(tshirtBackImg, 'tBack'),
            uploadToStorageSafe(tshirtWhiteImg, 'tWhiteFront'),
            uploadToStorageSafe(tshirtWhiteBackImg, 'tWhiteBack'),
            uploadToStorageSafe(poloImg, 'pFront'),
            uploadToStorageSafe(poloBackImg, 'pBack'),
            uploadToStorageSafe(poloWhiteImg, 'pWhiteFront'),
            uploadToStorageSafe(poloWhiteBackImg, 'pWhiteBack'),
            uploadToStorageSafe(hoodieImg, 'hFront'),
            uploadToStorageSafe(hoodieBackImg, 'hBack'),
            uploadToStorageSafe(hoodieWhiteImg, 'hWhiteFront'),
            uploadToStorageSafe(hoodieWhiteBackImg, 'hWhiteBack'),
            uploadToStorageSafe(hasTankEnabled ? tankImg : null, 'tankFront'),
            uploadToStorageSafe(hasTankEnabled ? tankBackImg : null, 'tankBack'),
            uploadToStorageSafe(hasTankEnabled ? tankWhiteImg : null, 'tankWhiteFront'),
            uploadToStorageSafe(hasTankEnabled ? tankWhiteBackImg : null, 'tankWhiteBack'),
            uploadToStorageSafe(hasHeavyEnabled ? heavyImg : null, 'heavyFront'),
            uploadToStorageSafe(hasHeavyEnabled ? heavyBackImg : null, 'heavyBack'),
            uploadToStorageSafe(hasHeavyEnabled ? heavyWhiteImg : null, 'heavyWhiteFront'),
            uploadToStorageSafe(hasHeavyEnabled ? heavyWhiteBackImg : null, 'heavyWhiteBack')
        ]);

        const e3520FrontMock = allMockupsToProcess.find(m => m.id === 'E3520_front' || m.id === 'E3520' || m.id === 'prod_signaid_sportt_poly_mtzmb4zr');
        const e3520BackMock = allMockupsToProcess.find(m => m.id === 'E3520_back');
        let e3520Img = hasE3520Enabled ? resolveMockupAiOnly(e3520FrontMock) : null;
        let e3520BackImg = hasE3520Enabled ? resolveMockupAiOnly(e3520BackMock) : null;

        const [finalE3520Front, finalE3520Back] = await Promise.all([
            uploadToStorageSafe(hasE3520Enabled ? e3520Img : null, 'E3520_front'),
            uploadToStorageSafe(hasE3520Enabled ? e3520BackImg : null, 'E3520_back')
        ]);

        // 1. Dictionnaire complet des mockups avec leurs URLs publiques Storage (uniquement les mockups avec image réelle)
        const mockupsDictionary: Record<string, any> = {};
        for (const m of uploadedMockups) {
            if (m.id) {
                const isBack = m.view === 'back' || isBackId(m.id);
                const aiCandidate = (m as any).aiRemastered || m.ai || null;
                const mechCandidate = m.mechanical || null;
                const primaryCandidate = (aiCandidate && isRealAiImage(aiCandidate))
                    ? aiCandidate
                    : null;

                mockupsDictionary[m.id] = {
                    id: m.id,
                    title: m.title || m.id,
                    name: m.title || m.id,
                    garment: m.garment,
                    view: m.view || (isBack ? 'back' : 'front'),
                    selected: !!m.selected,
                    ai: (aiCandidate && isRealAiImage(aiCandidate)) ? aiCandidate : null,
                    aiRemastered: (aiCandidate && isRealAiImage(aiCandidate)) ? aiCandidate : null,
                    mechanical: (mechCandidate && isRealAiImage(mechCandidate)) ? mechCandidate : null,
                    base: "",
                    imageUrl: primaryCandidate,
                    frontImageUrl: isBack ? undefined : primaryCandidate,
                    backImageUrl: isBack ? primaryCandidate : undefined,
                    imageFront: isBack ? undefined : primaryCandidate,
                    imageBack: isBack ? primaryCandidate : undefined,
                    url: primaryCandidate
                };
            }
        }

        // 2. Schéma universel Firestore : Hydrater systématiquement le tableau `products` UNIQUEMENT avec des mannequins IA réels
        const resolveProductItem = (
            id: string,
            name: string,
            garment: string,
            price: number,
            frontItem: any,
            backItem: any,
            supplierRef?: string,
            frontImageUrlResolved?: string | null,
            backImageUrlResolved?: string | null,
            color: string = 'Noir',
            customSku?: string
        ) => {
            // Check eligibility against enabledProductIds or selection
            const frontSelected = frontItem && (frontItem.selected === true || frontItem.isSelected === true);
            const backSelected = backItem && (backItem.selected === true || backItem.isSelected === true);
            if (!frontSelected && !backSelected) {
                return null;
            }

            if (enabledProductIds && enabledProductIds.length > 0) {
                const isEligible = isItemEligible(id, customSku, garment, supplierRef) ||
                    (frontItem && isItemEligible(frontItem.id, frontItem.sku, frontItem.garment)) ||
                    (backItem && isItemEligible(backItem.id, backItem.sku, backItem.garment));
                if (!isEligible) {
                    return null;
                }
            }

            const frontAi = (frontImageUrlResolved && isRealAiImage(frontImageUrlResolved))
                ? frontImageUrlResolved
                : (isRealAiImage(frontItem?.aiRemastered) ? frontItem.aiRemastered : (isRealAiImage(frontItem?.ai) ? frontItem.ai : null));
            const backAi = (backImageUrlResolved && isRealAiImage(backImageUrlResolved))
                ? backImageUrlResolved
                : (isRealAiImage(backItem?.aiRemasteredBack) ? backItem.aiRemasteredBack :
                  (isRealAiImage(backItem?.aiBack) ? backItem.aiBack :
                  (isRealAiImage(backItem?.aiRemastered) ? backItem.aiRemastered :
                  (isRealAiImage(backItem?.ai) ? backItem.ai : null))));

            const hasAi = Boolean(frontAi || backAi);
            // CRITICAL: Exclusion formelle de tout gabarit plat non généré en IA mannequin
            if (!hasAi) {
                return null;
            }

            const finalFrontUrl = frontAi || backAi;
            const finalBackUrl = backAi || frontAi;

            let itemSku = customSku;
            if (!itemSku) {
                if (id === 'NX7200-WHT' || supplierRef === 'NX7200') {
                    itemSku = color === 'Blanc' ? 'NX7200-WHT' : 'NX7200-BLK';
                } else if (supplierRef === 'BYBB011' || id.includes('tank')) {
                    itemSku = color === 'Blanc' ? 'BYBB011-WHT' : 'BYBB011-BLK';
                } else if (supplierRef === 'JHK170' || garment === 'tshirt') {
                    itemSku = color === 'Blanc' ? 'JHK170-WHT' : 'JHK170-BLK';
                } else if (supplierRef === 'JHK510' || garment === 'polo') {
                    itemSku = color === 'Blanc' ? 'JHK510-WHT' : 'JHK510-BLK';
                } else if (supplierRef === 'JHK421' || garment === 'sweat' || garment === 'hoodie') {
                    itemSku = color === 'Blanc' ? 'JHK421-WHT' : 'JHK421-BLK';
                } else if (supplierRef === 'E3520' || garment === 'sport_tshirt') {
                    itemSku = 'E3520';
                }
            }

            return {
                id,
                sku: itemSku,
                title: name,
                name,
                garment,
                color,
                colors: color === 'Blanc' ? ['Blanc'] : ['Noir', 'Blanc'],
                price,
                currency: '€',
                frontImageUrl: finalFrontUrl,
                backImageUrl: finalBackUrl,
                imageUrl: finalFrontUrl,
                imageFront: finalFrontUrl,
                frontImage: finalFrontUrl,
                imageBack: finalBackUrl,
                backImage: finalBackUrl,
                ai: true,
                aiRemastered: frontAi || null,
                aiRemasteredBack: backAi || null,
                mechanical: null,
                mechanicalBack: null,
                base: "",
                baseBack: "",
                selected: true,
                ...(supplierRef ? { supplierRef } : {}),
                sizes: (garment === 'cap' || garment === 'tote_bag') ? ['Unique'] : ['S', 'M', 'L', 'XL', 'XXL']
            };
        };

        const candidateProducts: any[] = [];

        // STRICT FILTER: Standard products are only included if explicitly selected AND generated with real AI
        const potentialStandardItems = [
            resolveProductItem(
                tshirtMock?.id || 'tFront',
                tshirtMock?.title || 'T-Shirt Premium Noir',
                'tshirt',
                29.99,
                tshirtMock,
                tshirtBackMock,
                'JHK170',
                finalTshirtFront,
                finalTshirtBack,
                'Noir',
                'JHK170-BLK'
            ),
            resolveProductItem(
                tshirtWhiteMock?.id || 'tWhiteFront',
                tshirtWhiteMock?.title || 'T-Shirt Classic Blanc',
                'tshirt',
                29.99,
                tshirtWhiteMock,
                tshirtWhiteBackMock,
                'JHK170',
                finalTshirtWhiteFront,
                finalTshirtWhiteBack,
                'Blanc',
                'JHK170-WHT'
            ),
            resolveProductItem(
                poloMock?.id || 'pFront',
                poloMock?.title || 'Polo Premium Noir',
                'polo',
                39.99,
                poloMock,
                poloBackMock,
                'JHK510',
                finalPoloFront,
                finalPoloBack,
                'Noir',
                'JHK510-BLK'
            ),
            resolveProductItem(
                poloWhiteMock?.id || 'pWhiteFront',
                poloWhiteMock?.title || 'Polo Premium Blanc',
                'polo',
                39.99,
                poloWhiteMock,
                poloWhiteBackMock,
                'JHK510',
                finalPoloWhiteFront,
                finalPoloWhiteBack,
                'Blanc',
                'JHK510-WHT'
            ),
            resolveProductItem(
                hoodieMock?.id || 'hFront',
                hoodieMock?.title || 'Hoodie Premium Noir',
                'sweat',
                49.00,
                hoodieMock,
                hoodieBackMock,
                'JHK421',
                finalHoodieFront,
                finalHoodieBack,
                'Noir',
                'JHK421-BLK'
            ),
            resolveProductItem(
                hoodieWhiteMock?.id || 'hWhiteFront',
                hoodieWhiteMock?.title || 'Hoodie Premium Blanc',
                'sweat',
                49.00,
                hoodieWhiteMock,
                hoodieWhiteBackMock,
                'JHK421',
                finalHoodieWhiteFront,
                finalHoodieWhiteBack,
                'Blanc',
                'JHK421-WHT'
            ),
            resolveProductItem(
                tankMock?.id || 'tankFront',
                tankMock?.title || 'Débardeur Premium Noir',
                'tank_top',
                27.99,
                tankMock,
                tankBackMock,
                'BYBB011',
                finalTankFront,
                finalTankBack,
                'Noir',
                'BYBB011-BLK'
            ),
            resolveProductItem(
                tankWhiteMock?.id || 'tankWhiteFront',
                tankWhiteMock?.title || 'Débardeur Premium Blanc',
                'tank_top',
                27.99,
                tankWhiteMock,
                tankWhiteBackMock,
                'BYBB011',
                finalTankWhiteFront,
                finalTankWhiteBack,
                'Blanc',
                'BYBB011-WHT'
            ),
            resolveProductItem(
                heavyMock?.id || 'heavyFront',
                heavyMock?.title || 'T-Shirt Heavyweight Oversize',
                'tshirt_oversize',
                34.99,
                heavyMock,
                heavyBackMock,
                'NX7200',
                finalHeavyFront,
                finalHeavyBack,
                'Noir',
                'NX7200-BLK'
            ),
            resolveProductItem(
                heavyWhiteMock?.id || 'NX7200-WHT',
                heavyWhiteMock?.title || 'T-Shirt Heavyweight Oversize Blanc',
                'tshirt_oversize',
                34.99,
                heavyWhiteMock,
                heavyWhiteBackMock,
                'NX7200',
                finalHeavyWhiteFront,
                finalHeavyWhiteBack,
                'Blanc',
                'NX7200-WHT'
            ),
            resolveProductItem(
                'E3520',
                'T-Shirt Respirant Sport Interlock',
                'sport_tshirt',
                30.00,
                e3520FrontMock,
                e3520BackMock,
                'E3520',
                finalE3520Front,
                finalE3520Back,
                'Bleu Royal',
                'E3520'
            )
        ];

        for (const item of potentialStandardItems) {
            if (item) {
                candidateProducts.push(item);
            }
        }

        const STANDARD_MOCKUP_IDS = [
            'tFront', 'tBack', 'tWhiteFront', 'tWhiteBack',
            'pFront', 'pBack', 'pWhiteFront', 'pWhiteBack',
            'hFront', 'hBack', 'hWhiteFront', 'hWhiteBack',
            'tankFront', 'tankBack', 'tankWhiteFront', 'tankWhiteBack',
            'heavyFront', 'heavyBack', 'heavyWhiteFront', 'heavyWhiteBack',
            'E3520_front', 'E3520_back', 'E3520',
            'tshirt_white', 'polo_white', 'hoodie_white',
            'tshirt_white_front', 'tshirt_white_back',
            'polo_white_front', 'polo_white_back',
            'hoodie_white_front', 'hoodie_white_back',
            'JHK170-WHT', 'JHK170-BLK',
            'JHK510-WHT', 'JHK510-BLK',
            'JHK421-WHT', 'JHK421-BLK',
            'BYBB011-WHT', 'BYBB011-BLK',
            'NX7200-WHT', 'NX7200-BLK'
        ];
        for (const m of uploadedMockups) {
            if ((m.selected === true || (m as any).isSelected === true) && m.id && !STANDARD_MOCKUP_IDS.includes(m.id)) {
                if (enabledProductIds && enabledProductIds.length > 0) {
                    if (!isItemEligible(m.id, (m as any).sku, m.garment, (m as any).supplierRef)) {
                        continue;
                    }
                }
                const isBack = m.view === 'back' || isBackId(m.id);
                const aiCandidate = (m as any).aiRemastered || m.ai || null;
                if (!isRealAiImage(aiCandidate)) {
                    continue; // Rejeter tout gabarit plat non-studio
                }
                const frontImg = isBack ? undefined : aiCandidate;
                const backImg = isBack ? aiCandidate : undefined;
                candidateProducts.push({
                    id: m.id,
                    title: m.title || m.id,
                    name: m.title || m.id,
                    garment: m.garment,
                    price: (m as any).price || 29.99,
                    currency: '€',
                    frontImageUrl: frontImg,
                    backImageUrl: backImg,
                    imageUrl: frontImg || backImg,
                    ai: true,
                    aiRemastered: aiCandidate,
                    mechanical: null,
                    base: "",
                    selected: true
                });
            }
        }

        const universalProductsArray: any[] = candidateProducts.filter(Boolean);

        const productsSchema: Record<string, any> = {};
        for (const p of universalProductsArray) {
            productsSchema[p.id] = p;
            if (p.sku && p.sku !== p.id) {
                productsSchema[p.sku] = p;
            }
            if (p.garment && !productsSchema[p.garment]) {
                productsSchema[p.garment] = p;
            }
        }

        const hasProductInUniversal = (predicate: (p: any) => boolean) => universalProductsArray.some(predicate);

        const isTshirtBlackInShop = hasProductInUniversal(p => (p.garment === 'tshirt' || p.sku === 'JHK170-BLK' || p.id === 'tFront') && p.color !== 'Blanc');
        const isTshirtWhiteInShop = hasProductInUniversal(p => (p.garment === 'tshirt' || p.sku === 'JHK170-WHT' || p.id === 'tWhiteFront') && p.color === 'Blanc');
        const isPoloBlackInShop = hasProductInUniversal(p => (p.garment === 'polo' || p.sku === 'JHK510-BLK' || p.id === 'pFront') && p.color !== 'Blanc');
        const isPoloWhiteInShop = hasProductInUniversal(p => (p.garment === 'polo' || p.sku === 'JHK510-WHT' || p.id === 'pWhiteFront') && p.color === 'Blanc');
        const isHoodieBlackInShop = hasProductInUniversal(p => (p.garment === 'sweat' || p.garment === 'hoodie' || p.sku === 'JHK421-BLK' || p.id === 'hFront') && p.color !== 'Blanc');
        const isHoodieWhiteInShop = hasProductInUniversal(p => (p.garment === 'sweat' || p.garment === 'hoodie' || p.sku === 'JHK421-WHT' || p.id === 'hWhiteFront') && p.color === 'Blanc');
        const isTankBlackInShop = hasProductInUniversal(p => (p.garment === 'tank_top' || p.sku === 'BYBB011-BLK' || p.id === 'tankFront') && p.color !== 'Blanc');
        const isTankWhiteInShop = hasProductInUniversal(p => (p.garment === 'tank_top' || p.sku === 'BYBB011-WHT' || p.id === 'tankWhiteFront') && p.color === 'Blanc');
        const isHeavyBlackInShop = hasProductInUniversal(p => (p.garment === 'tshirt_oversize' || p.sku === 'NX7200-BLK' || p.id === 'heavyFront') && p.color !== 'Blanc');
        const isHeavyWhiteInShop = hasProductInUniversal(p => (p.garment === 'tshirt_oversize' || p.sku === 'NX7200-WHT' || p.id === 'NX7200-WHT' || p.id === 'heavyWhiteFront') && p.color === 'Blanc');
        const isSportInShop = hasProductInUniversal(p => p.garment === 'sport_tshirt' || p.sku === 'E3520' || p.id === 'E3520');

        const garmentMockups: GarmentMockupMap = {
            ...(isTshirtBlackInShop && isRealAiImage(finalTshirtFront) ? { tshirt: finalTshirtFront!, tshirt_front: finalTshirtFront!, tFront: finalTshirtFront! } : {}),
            ...(isTshirtBlackInShop && isRealAiImage(finalTshirtBack) ? { tshirt_back: finalTshirtBack!, tBack: finalTshirtBack! } : {}),
            ...(isTshirtWhiteInShop && isRealAiImage(finalTshirtWhiteFront) ? { tshirt_white: finalTshirtWhiteFront!, tshirt_white_front: finalTshirtWhiteFront!, tWhiteFront: finalTshirtWhiteFront! } : {}),
            ...(isTshirtWhiteInShop && isRealAiImage(finalTshirtWhiteBack) ? { tshirt_white_back: finalTshirtWhiteBack!, tWhiteBack: finalTshirtWhiteBack! } : {}),
            ...(isPoloBlackInShop && isRealAiImage(finalPoloFront) ? { polo: finalPoloFront!, polo_front: finalPoloFront!, pFront: finalPoloFront! } : {}),
            ...(isPoloBlackInShop && isRealAiImage(finalPoloBack) ? { polo_back: finalPoloBack!, pBack: finalPoloBack! } : {}),
            ...(isPoloWhiteInShop && isRealAiImage(finalPoloWhiteFront) ? { polo_white: finalPoloWhiteFront!, polo_white_front: finalPoloWhiteFront!, pWhiteFront: finalPoloWhiteFront! } : {}),
            ...(isPoloWhiteInShop && isRealAiImage(finalPoloWhiteBack) ? { polo_white_back: finalPoloWhiteBack!, pWhiteBack: finalPoloWhiteBack! } : {}),
            ...(isHoodieBlackInShop && isRealAiImage(finalHoodieFront) ? { hoodie: finalHoodieFront!, hoodie_front: finalHoodieFront!, sweat: finalHoodieFront!, sweat_front: finalHoodieFront!, hFront: finalHoodieFront! } : {}),
            ...(isHoodieBlackInShop && isRealAiImage(finalHoodieBack) ? { hoodie_back: finalHoodieBack!, sweat_back: finalHoodieBack!, hBack: finalHoodieBack! } : {}),
            ...(isHoodieWhiteInShop && isRealAiImage(finalHoodieWhiteFront) ? { hoodie_white: finalHoodieWhiteFront!, hoodie_white_front: finalHoodieWhiteFront!, hWhiteFront: finalHoodieWhiteFront! } : {}),
            ...(isHoodieWhiteInShop && isRealAiImage(finalHoodieWhiteBack) ? { hoodie_white_back: finalHoodieWhiteBack!, hWhiteBack: finalHoodieWhiteBack! } : {}),
            ...(isTankBlackInShop && isRealAiImage(finalTankFront) ? { tank_top: finalTankFront!, tank_front: finalTankFront!, tankFront: finalTankFront! } : {}),
            ...(isTankBlackInShop && isRealAiImage(finalTankBack) ? { tank_back: finalTankBack!, tankBack: finalTankBack! } : {}),
            ...(isTankWhiteInShop && isRealAiImage(finalTankWhiteFront) ? { tank_white_front: finalTankWhiteFront!, tankWhiteFront: finalTankWhiteFront! } : {}),
            ...(isTankWhiteInShop && isRealAiImage(finalTankWhiteBack) ? { tank_white_back: finalTankWhiteBack!, tankWhiteBack: finalTankWhiteBack! } : {}),
            ...(isHeavyBlackInShop && isRealAiImage(finalHeavyFront) ? { tshirt_oversize: finalHeavyFront!, heavy_front: finalHeavyFront!, heavyFront: finalHeavyFront! } : {}),
            ...(isHeavyBlackInShop && isRealAiImage(finalHeavyBack) ? { heavy_back: finalHeavyBack!, heavyBack: finalHeavyBack! } : {}),
            ...(isHeavyWhiteInShop && isRealAiImage(finalHeavyWhiteFront) ? { heavy_white_front: finalHeavyWhiteFront!, heavyWhiteFront: finalHeavyWhiteFront! } : {}),
            ...(isHeavyWhiteInShop && isRealAiImage(finalHeavyWhiteBack) ? { heavy_white_back: finalHeavyWhiteBack!, heavyWhiteBack: finalHeavyWhiteBack!, tshirt_oversize_white_back: finalHeavyWhiteBack! } : {}),
            ...(isSportInShop && isRealAiImage(finalE3520Front) ? { sport_tshirt_front: finalE3520Front!, sport_tshirt: finalE3520Front!, E3520_front: finalE3520Front! } : {}),
            ...(isSportInShop && isRealAiImage(finalE3520Back) ? { sport_tshirt_back: finalE3520Back!, E3520_back: finalE3520Back! } : {})
        };

        const dynamicMockupsMap: Record<string, any> = {
            ...garmentMockups
        };

        const validProductIdsSet = new Set<string>();
        for (const p of universalProductsArray) {
            if (p.id) validProductIdsSet.add(p.id);
            if (p.sku) validProductIdsSet.add(p.sku);
        }

        const effectiveEnabledIds: string[] = validProductIdsSet.size > 0 ? Array.from(validProductIdsSet) : ['__none__'];

        const garmentFieldsPayload: Record<string, any> = {};
        for (const k of ALL_STANDARD_GARMENT_KEYS) {
            if (garmentMockups[k] && typeof garmentMockups[k] === 'string' && isRealAiImage(garmentMockups[k])) {
                garmentFieldsPayload[k] = garmentMockups[k];
            } else {
                garmentFieldsPayload[k] = deleteField();
            }
        }

        const cleanSid = sessionId ? sessionId.replace(/^audit-/, '') : null;

        // CRITICAL: Immediately persist session with public Storage URLs locally across all lookup keys
        const fullLocalSession = {
            sessionId,
            slug,
            cleanSid,
            previewId: pId,
            logoPlacements,
            logoColorModes,
            globalLogoColorMode,
            logoAMode: logoA.mode || 'original',
            logoBMode: logoB.mode || 'original',
            logoAUrl: urlA || "",
            logoBUrl: urlB || "",
            logoUrl: urlA || urlB || "",
            userData,
            mockups: uploadedMockups,
            mockupsDict: mockupsDictionary,
            items: universalProductsArray,
            garmentMockups,
            dynamicMockups: dynamicMockupsMap,
            heavyWhiteBack: finalHeavyWhiteBack,
            heavy_white_back: finalHeavyWhiteBack,
            tshirt_oversize_white_back: finalHeavyWhiteBack,
            tshirt_front: garmentMockups.tshirt_front,
            tshirt_back: garmentMockups.tshirt_back,
            polo_front: garmentMockups.polo_front,
            polo_back: garmentMockups.polo_back,
            hoodie: garmentMockups.hoodie,
            hoodie_front: garmentMockups.hoodie_front,
            hoodie_back: garmentMockups.hoodie_back,
            tshirt_white_front: garmentMockups.tshirt_white_front,
            tshirt_white_back: garmentMockups.tshirt_white_back,
            polo_white_front: garmentMockups.polo_white_front,
            polo_white_back: garmentMockups.polo_white_back,
            hoodie_white_front: garmentMockups.hoodie_white_front,
            hoodie_white_back: garmentMockups.hoodie_white_back,
            products: universalProductsArray,
            productsMap: productsSchema,
            enabledProductIds: effectiveEnabledIds,
            timestamp: new Date().toISOString()
        };

        const serializedLocal = JSON.stringify(fullLocalSession);
        const urlUid = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('uid') : null;
        const cleanUid = urlUid ? urlUid.replace(/^audit-/, '') : null;
        const kebabUid = urlUid ? toKebabCaseSlug(urlUid) : null;

        const localKeysToPersist = Array.from(new Set([
            sessionId,
            cleanSid,
            slug,
            urlUid,
            cleanUid,
            kebabUid,
            `audit-${cleanSid}`,
            `audit-${slug}`,
            pId
        ].filter(Boolean) as string[]));

        // 1. Transit EXCLUSIF des gros états vers IndexedDB
        for (const k of localKeysToPersist) {
            await dbSet(`session_obj_${k}`, serializedLocal);
        }
        await dbSet('btp_active_session_data', serializedLocal);

        // 2. localStorage: métadonnées légères UNIQUEMENT (élimination définitive de QuotaExceededError)
        if (typeof localStorage !== 'undefined') {
            try {
                pruneBulkyLocalStorageKeys(localKeysToPersist);

                for (const k of localKeysToPersist) {
                    safeLocalStorageRemoveItem(`session_obj_${k}`);
                }
                safeLocalStorageRemoveItem('btp_active_session_data');

                const storageSafeMockups = uploadedMockups.map(sanitizeMockupForLocalStorage);
                const storageSafeGarmentMockups = sanitizeGarmentMockupMap(garmentMockups);
                const safeMockupsJson = JSON.stringify(storageSafeMockups);
                const safeGarmentJson = JSON.stringify(storageSafeGarmentMockups);

                for (const k of localKeysToPersist) {
                    safeLocalStorageSetItem(`garmentMockups_${k}`, safeGarmentJson);
                    safeLocalStorageSetItem(`btp_garment_mockups_${k}`, safeGarmentJson);
                    safeLocalStorageSetItem(`mockups_${k}`, safeMockupsJson);
                    safeLocalStorageSetItem(`btp_mockups_locked_${k}`, 'true');
                }
                safeLocalStorageSetItem('btp_active_session_id', sessionId);
                if (slug) safeLocalStorageSetItem('btp_active_session_slug', slug);

                if (effectiveEnabledIds && effectiveEnabledIds.length > 0) {
                    const enabledJson = JSON.stringify(effectiveEnabledIds);
                    safeLocalStorageSetItem(`enabled_products_${sessionId}`, enabledJson);
                    safeLocalStorageSetItem(`btp_enabled_products_${sessionId}`, enabledJson);
                    if (slug) {
                        safeLocalStorageSetItem(`enabled_products_${slug}`, enabledJson);
                        safeLocalStorageSetItem(`btp_enabled_products_${slug}`, enabledJson);
                    }
                    for (const k of localKeysToPersist) {
                        safeLocalStorageSetItem(`enabled_products_${k}`, enabledJson);
                        safeLocalStorageSetItem(`btp_enabled_products_${k}`, enabledJson);
                    }
                    if (!sessionId && !slug) {
                        safeLocalStorageSetItem('btp_enabled_product_ids', enabledJson);
                    }
                }
                if (!sessionId && !slug) {
                    safeLocalStorageSetItem('btp_garment_mockups', safeGarmentJson);
                    safeLocalStorageSetItem('garmentMockups', safeGarmentJson);
                    safeLocalStorageSetItem('mockups', safeMockupsJson);
                    safeLocalStorageSetItem('btp_mockups_locked', 'true');
                }
                safeLocalStorageSetItem(`btp_garment_mockups_${sessionId}`, safeGarmentJson);
                if (slug) safeLocalStorageSetItem(`btp_garment_mockups_${slug}`, safeGarmentJson);

                for (const gKey of ALL_STANDARD_GARMENT_KEYS) {
                    if (storageSafeGarmentMockups[gKey]) {
                        safeLocalStorageSetItem(`btp_mockup_${gKey}`, storageSafeGarmentMockups[gKey]);
                        safeLocalStorageSetItem(`btp_mockup_${gKey}_${sessionId}`, storageSafeGarmentMockups[gKey]);
                        if (slug) safeLocalStorageSetItem(`btp_mockup_${gKey}_${slug}`, storageSafeGarmentMockups[gKey]);
                    } else {
                        safeLocalStorageRemoveItem(`btp_mockup_${gKey}`);
                        safeLocalStorageRemoveItem(`btp_mockup_${gKey}_${sessionId}`);
                        if (slug) safeLocalStorageRemoveItem(`btp_mockup_${gKey}_${slug}`);
                    }
                }
                if (!sessionId && !slug) safeLocalStorageSetItem('btp_mockups_locked', 'true');
                safeLocalStorageSetItem(`btp_mockups_locked_${sessionId}`, 'true');
                if (slug) safeLocalStorageSetItem(`btp_mockups_locked_${slug}`, 'true');
            } catch (e) {
                console.warn("[Storage] handleDirectCloudSync localStorage error safely captured:", e);
            }
        }

        const previewData = sanitizeForFirestore({
            previewId: pId,
            companyName: userData.companyName || "",
            logoUrl: urlA || urlB || "",
            logoA: urlA || "",
            logoB: urlB || "",
            logoOriginalUrl: (logoA.original && typeof logoA.original === 'string' && logoA.original.startsWith('http'))
                ? logoA.original
                : ((logoB.original && typeof logoB.original === 'string' && logoB.original.startsWith('http')) ? logoB.original : (urlA || urlB || "")),
            logoAdaptedUrl: urlB || urlA || "",
            logoPlacements: Object.fromEntries(
                Object.entries(logoPlacements || {}).map(([k, v]) => [k, v || 'A'])
            ),
            accentColor: (logoPlacements as any)?.accentColor || "#ea580c",
            products: universalProductsArray,
            productsMap: productsSchema,
            items: universalProductsArray,
            mockups: mockupsDictionary,
            mockupsList: uploadedMockups,
            garmentMockups: {
                ...garmentFieldsPayload
            },
            dynamicMockups: dynamicMockupsMap,
            ...garmentFieldsPayload,
            enabledProductIds: effectiveEnabledIds,
            status: 'pending',
            userEmail: userData.email || null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }, urlMap);

        try {
            await setDoc(doc(db, 'anonymous_previews', pId), previewData, { merge: true });
            if (slug && slug.length >= 2 && slug !== pId) {
                await setDoc(doc(db, 'anonymous_previews', slug), previewData, { merge: true }).catch(() => null);
            }
            if (sessionId && sessionId !== slug && sessionId !== pId) {
                await setDoc(doc(db, 'anonymous_previews', sessionId), previewData, { merge: true }).catch(() => null);
            }
        } catch (apErr: any) {
            console.warn("[Firestore] anonymous_previews write notice:", apErr?.message || apErr);
        }

        // Update btp_projects/${sessionId} and btp_projects/${slug} with root mockups array & dictionary
        const projectData = sanitizeForFirestore({
            projectId: sessionId,
            previewId: pId,
            userData: {
                companyName: userData.companyName || "",
                email: userData.email || "",
                activity: userData.activity || "",
                phone: userData.phone || "",
                website: userData.website || "",
                tva: userData.tva || ""
            },
            logoUrl: urlA || urlB || "",
            logos: {
                logoA: {
                    id: 'A' as const,
                    original: null,
                    rawOriginal: (logoA.rawOriginal && logoA.rawOriginal.startsWith('http')) ? logoA.rawOriginal : null,
                    noBg: (logoA.noBg && logoA.noBg.startsWith('http')) ? logoA.noBg : null,
                    isBgRemoved: logoA.isBgRemoved ?? false,
                    adapted: null,
                    remastered: null,
                    activeUrl: urlA,
                    mode: logoA.mode || 'original'
                },
                logoB: {
                    id: 'B' as const,
                    original: null,
                    rawOriginal: (logoB.rawOriginal && logoB.rawOriginal.startsWith('http')) ? logoB.rawOriginal : null,
                    noBg: (logoB.noBg && logoB.noBg.startsWith('http')) ? logoB.noBg : null,
                    isBgRemoved: logoB.isBgRemoved ?? false,
                    adapted: null,
                    remastered: null,
                    activeUrl: urlB,
                    mode: logoB.mode || 'original'
                }
            },
            placements: Object.fromEntries(
                Object.entries(logoPlacements || {}).map(([k, v]) => [k, v || 'A'])
            ),
            products: universalProductsArray,
            productsMap: productsSchema,
            mockups: mockupsDictionary,
            mockupsList: uploadedMockups,
            items: universalProductsArray,
            garmentMockups: {
                ...garmentFieldsPayload
            },
            dynamicMockups: dynamicMockupsMap,
            ...garmentFieldsPayload,
            enabledProductIds: effectiveEnabledIds,
            status: 'PENDING_PAYMENT',
            updatedAt: new Date().toISOString(),
            type: 'BTP_PROJECT_V24'
        }, urlMap);

        try {
            await setDoc(doc(db, 'btp_projects', sessionId), projectData, { merge: true });
            if (slug && slug !== sessionId) {
                await setDoc(doc(db, 'btp_projects', slug), sanitizeForFirestore({ ...projectData, projectId: slug }, urlMap), { merge: true }).catch(() => null);
            }

            try {
                const q = query(collection(db, 'btp_projects'), where('projectId', '==', sessionId));
                const snap = await getDocs(q);
                if (!snap.empty) {
                    for (const d of snap.docs) {
                        await setDoc(d.ref, projectData, { merge: true }).catch(() => null);
                    }
                }
            } catch (qErr) { }

            // Subcollection mockups under btp_projects/${sessionId}/mockups/${m.id}
            // If security rules reject subcollection writes, catch silently and stop trying
            for (const m of uploadedMockups) {
                if (m.id && isItemActive(m) && (isRealAiImage(m.ai) || isRealAiImage((m as any).aiRemastered))) {
                    try {
                        const mDoc = sanitizeForFirestore({
                            ...m,
                            imageUrl: m.ai || (m as any).aiRemastered,
                            updatedAt: new Date().toISOString()
                        }, urlMap);
                        await setDoc(doc(db, 'btp_projects', sessionId, 'mockups', m.id), mDoc, { merge: true });
                        if (slug && slug !== sessionId) {
                            await setDoc(doc(db, 'btp_projects', slug, 'mockups', m.id), mDoc, { merge: true }).catch(() => null);
                        }
                    } catch (e) {
                        // Subcollection write permission error: catch silently and break
                        break;
                    }
                }
            }
            // Explicitly delete unselected or ineligible mockup documents from subcollection
            for (const unselectedId of unselectedOrIneligibleSlots) {
                try {
                    await deleteDoc(doc(db, 'btp_projects', sessionId, 'mockups', unselectedId)).catch(() => null);
                    if (slug && slug !== sessionId) {
                        await deleteDoc(doc(db, 'btp_projects', slug, 'mockups', unselectedId)).catch(() => null);
                    }
                } catch (delErr) { }
            }
        } catch (btpErr: any) {
            console.warn("[Firestore] Root btp_projects write skipped or permission denied:", btpErr?.message || btpErr);
        }

        // Update SiteConfigs/${slug}, prospects/${slug}, configs/${slug} and alias documents
        try {
            const cleanSid = sessionId.replace(/^audit-/, '');
            let existingLogoUrl = '';
            try {
                const sSnap = await getDoc(doc(db, 'SiteConfigs', sessionId));
                if (sSnap.exists() && sSnap.data()?.logoUrl) {
                    existingLogoUrl = sSnap.data().logoUrl;
                } else {
                    const csSnap = await getDoc(doc(db, 'SiteConfigs', cleanSid));
                    if (csSnap.exists() && csSnap.data()?.logoUrl) {
                        existingLogoUrl = csSnap.data().logoUrl;
                    }
                }
            } catch (e) { }

            const sitePayload = sanitizeForFirestore({
                slug: slug,
                companyName: userData.companyName,
                products: universalProductsArray,
                productsMap: productsSchema,
                mockups: mockupsDictionary,
                mockupsList: uploadedMockups,
                items: universalProductsArray,
                garmentMockups: {
                    ...garmentFieldsPayload
                },
                dynamicMockups: dynamicMockupsMap,
                ...garmentFieldsPayload,
                enabledProductIds: effectiveEnabledIds,
                logoUrl: existingLogoUrl || urlA || urlB || "",
                auditLogoUrl: urlA || urlB || "",
                logoA: urlA || "",
                logoB: urlB || "",
                logoA_isBgRemoved: logoA.isBgRemoved ?? false,
                logoB_isBgRemoved: logoB.isBgRemoved ?? false,
                logoAdaptedUrl: urlB || urlA || "",
                logoPlacements: Object.fromEntries(
                    Object.entries(logoPlacements || {}).map(([k, v]) => [k, v || 'A'])
                ),
                contactEmail: userData.email,
                whatsappNumber: userData.phone,
                activitySector: userData.activity,
                updatedAt: new Date().toISOString()
            }, urlMap);

            // Primary canonical document update
            await setDoc(doc(db, 'SiteConfigs', slug), sitePayload, { merge: true });

            // Synchronisation systématique du document prospect dans profiles, prospects, audits, vault et configs
            try {
                const prospectPayload = sanitizeForFirestore({
                    ...sitePayload,
                    name: userData.companyName || slug,
                    company: userData.companyName || slug,
                    email: userData.email || "",
                    phone: userData.phone || "",
                    activitySector: userData.activity || "",
                    products: universalProductsArray,
                    productsMap: productsSchema,
                    productsList: universalProductsArray,
                    mockups: mockupsDictionary,
                    mockupsList: uploadedMockups,
                    items: universalProductsArray,
                    garmentMockups: {
                        ...garmentFieldsPayload
                    },
                    dynamicMockups: dynamicMockupsMap,
                    ...garmentFieldsPayload,
                    logoUrl: existingLogoUrl || urlA || urlB || "",
                    updatedAt: new Date().toISOString()
                }, urlMap);
                await setDoc(doc(db, 'profiles', slug), prospectPayload, { merge: true }).catch(() => null);
                await setDoc(doc(db, 'prospects', slug), prospectPayload, { merge: true }).catch(() => null);
                await setDoc(doc(db, 'audits', slug), prospectPayload, { merge: true }).catch(() => null);
                await setDoc(doc(db, 'vault', slug), prospectPayload, { merge: true }).catch(() => null);
                await setDoc(doc(db, 'configs', slug), prospectPayload, { merge: true }).catch(() => null);
                if (sessionId && sessionId !== slug) {
                    await setDoc(doc(db, 'profiles', sessionId), prospectPayload, { merge: true }).catch(() => null);
                    await setDoc(doc(db, 'prospects', sessionId), prospectPayload, { merge: true }).catch(() => null);
                    await setDoc(doc(db, 'audits', sessionId), prospectPayload, { merge: true }).catch(() => null);
                    await setDoc(doc(db, 'vault', sessionId), prospectPayload, { merge: true }).catch(() => null);
                    await setDoc(doc(db, 'configs', sessionId), prospectPayload, { merge: true }).catch(() => null);
                }
                const aiCount = Array.isArray(universalProductsArray) ? universalProductsArray.filter((p: any) => p.ai || p.aiRemastered).length : 0;
                console.log(`[BACKEND_PROFILE_PERSIST] Profil ${slug} mis à jour avec ${aiCount} produits IA.`);
            } catch (pErr) { }

            // Subcollection mockups under SiteConfigs/${slug}/mockups/${m.id}
            // Stop trying if permission error is raised
            for (const m of uploadedMockups) {
                if (m.id && isItemActive(m)) {
                    try {
                        await setDoc(doc(db, 'SiteConfigs', slug, 'mockups', m.id), sanitizeForFirestore({
                            ...m,
                            imageUrl: m.ai || m.mechanical || (m as any).imageUrl,
                            updatedAt: new Date().toISOString()
                        }, urlMap), { merge: true });
                    } catch (e) {
                        // Subcollection write permission error: catch silently and break
                        break;
                    }
                }
            }
            // Explicitly delete unselected or ineligible mockup documents from SiteConfigs subcollection
            for (const unselectedId of unselectedOrIneligibleSlots) {
                try {
                    await deleteDoc(doc(db, 'SiteConfigs', slug, 'mockups', unselectedId)).catch(() => null);
                    if (sessionId && sessionId !== slug) {
                        await deleteDoc(doc(db, 'SiteConfigs', sessionId, 'mockups', unselectedId)).catch(() => null);
                    }
                } catch (delErr) { }
            }

            if (sessionId && sessionId !== slug) {
                await setDoc(doc(db, 'SiteConfigs', sessionId), sitePayload, { merge: true }).catch(() => null);
            }
            if (cleanSid && cleanSid !== slug && cleanSid !== sessionId) {
                await setDoc(doc(db, 'SiteConfigs', cleanSid), sitePayload, { merge: true }).catch(() => null);
            }
            if (urlUid && urlUid !== slug && urlUid !== sessionId && urlUid !== cleanSid) {
                await setDoc(doc(db, 'SiteConfigs', urlUid), sitePayload, { merge: true }).catch(() => null);
            }

            if (slug && slug.length >= 2) {
                try {
                    await setDoc(doc(db, 'anonymous_previews', slug), previewData, { merge: true });
                } catch (e) { }
            }


        } catch (scErr: any) {
            console.warn("[Firestore] SiteConfigs write skipped or permission denied:", scErr?.message || scErr);
        }

        return { success: true, previewId: pId, targetSlug: slug, mockups: uploadedMockups };
    } catch (cloudErr) {
        console.warn("Firestore sync notice (local backup preserved):", cloudErr);
        return { success: true, targetSlug: params.slug || params.sessionId, mockups: params.mockups, error: cloudErr };
    }
};

export const handleDirectCloudSync = async (params: SaveSessionParams): Promise<CloudSyncResult> => {
    await saveSessionLocal(params);
    return await syncSessionToCloud(params);
};

export const saveSession = async (
    params: SaveSessionParams,
    syncCloud: boolean = false
): Promise<CloudSyncResult> => {
    await saveSessionLocal(params);
    if (syncCloud) {
        return await syncSessionToCloud(params);
    }
    return { success: true };
};
