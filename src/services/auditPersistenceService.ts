import { collection, query, where, getDocs, doc, setDoc, getDoc } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL, UploadMetadata } from 'firebase/storage';
import { signInAnonymously } from 'firebase/auth';
import { db, storage, auth } from '../firebaseConfig';
import { sanitizeForFirestore } from '../utils/firestoreSanitizer';
import { compressBase64Image, generateMechanicalMockup } from './imageProcessingService';
import { VISION_ROOM_BASIC_TANK, VISION_ROOM_HEAVYWEIGHT_TEE } from '../components/MerchCarousel';
import { BtpLogo, MockupItem, UserData, LogoColorMode } from '../types/audit';

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
        cacheControl: 'public, max-age=31536000, immutable'
    };

    const storageRef = ref(storage, storagePath);
    await uploadString(storageRef, dataUrl, 'data_url', metadata);
    console.log(`-> Upload réussi vers ${storagePath}`);
    return await getDownloadURL(storageRef);
};

export const isBackId = (id?: string): boolean => !id ? false : /(back|dos|verso|tback|pback|hback|tankback|tankwhiteback|heavyback)/i.test(id);
export const isFrontId = (id?: string): boolean => !id ? false : /(front|face|recto|tfront|pfront|hfront|tankfront|tankwhitefront|heavyfront)/i.test(id);

export interface GarmentMockupMap {
    tshirt?: string | null;
    tshirt_front?: string | null;
    tshirt_back?: string | null;
    polo?: string | null;
    polo_front?: string | null;
    polo_back?: string | null;
    hoodie?: string | null;
    hoodie_front?: string | null;
    hoodie_back?: string | null;
    sweat?: string | null;
    sweat_front?: string | null;
    sweat_back?: string | null;
    tank_top?: string | null;
    tank_front?: string | null;
    tank_back?: string | null;
    tank_white_front?: string | null;
    tank_white_back?: string | null;
    tshirt_oversize?: string | null;
    heavy_front?: string | null;
    heavy_back?: string | null;
    business_card?: string | null;
    business_card_front?: string | null;
    business_card_back?: string | null;
    [key: string]: string | null | undefined;
}

export const extractGarmentMockupMap = (mockups: (MockupItem | any)[]): GarmentMockupMap => {
    const map: GarmentMockupMap = {};
    if (!Array.isArray(mockups)) return map;

    for (const m of mockups) {
        if (!m) continue;
        const isBack = m.view === 'back' || isBackId(m.id);
        const img = m.aiRemastered || m.ai || (isBack ? ((m as any).aiRemasteredBack || (m as any).aiBack) : null) || (m as any).imageUrl || (isBack ? ((m as any).backImageUrl || (m as any).imageBack) : ((m as any).frontImageUrl || (m as any).imageFront)) || m.mechanical || (m as any).base;
        if (!img || typeof img !== 'string') continue;

        const g = (m.garment || '').toLowerCase();
        const id = (m.id || '').toLowerCase();

        if (g === 'tshirt' || id.startsWith('tfront') || id.startsWith('tback') || id === 'tfront' || id === 'tback') {
            if (isBack || id.includes('back') || id.includes('dos')) {
                map.tshirt_back = img;
            } else {
                map.tshirt_front = img;
                map.tshirt = img;
            }
        } else if (g === 'polo' || id.startsWith('pfront') || id.startsWith('pback') || id === 'pfront' || id === 'pback') {
            if (isBack || id.includes('back') || id.includes('dos')) {
                map.polo_back = img;
            } else {
                map.polo_front = img;
                map.polo = img;
            }
        } else if (g === 'sweat' || g === 'hoodie' || id.startsWith('hfront') || id.startsWith('hback') || id === 'hfront' || id === 'hback') {
            if (isBack || id.includes('back') || id.includes('dos')) {
                map.hoodie_back = img;
                map.sweat_back = img;
            } else {
                map.hoodie_front = img;
                map.hoodie = img;
                map.sweat = img;
                map.sweat_front = img;
            }
        } else if (g === 'tank_top' || id.includes('tank')) {
            if (id.includes('white') || id.includes('blanc')) {
                if (isBack) map.tank_white_back = img;
                else map.tank_white_front = img;
            } else {
                if (isBack) map.tank_back = img;
                else {
                    map.tank_front = img;
                    map.tank_top = img;
                }
            }
        } else if (g === 'tshirt_oversize' || id.includes('heavy') || id.includes('oversize')) {
            if (isBack) map.heavy_back = img;
            else {
                map.heavy_front = img;
                map.tshirt_oversize = img;
            }
        } else if (g === 'business_card' || id.includes('card')) {
            if (isBack) map.business_card_back = img;
            else {
                map.business_card_front = img;
                map.business_card = img;
            }
        }
        if (m.id) {
            map[m.id] = img;
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
 * - Removes any key containing raw Data URLs (data:image/...).
 * - Removes orphaned session items from previous sessions that do not match the active keys.
 * - Removes bulky items (>50KB) not tied to the current session.
 */
export const pruneBulkyLocalStorageKeys = (preserveKeys: string[] = []): void => {
    if (typeof localStorage === 'undefined') return;
    try {
        const keysToRemove: string[] = [];

        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (!k) continue;

            const lowerK = k.toLowerCase();

            // Check if key belongs to active session to preserve
            const isPreserved = preserveKeys.some(activeKey => {
                const a = activeKey.toLowerCase();
                return lowerK === a || lowerK.endsWith(`_${a}`);
            });

            try {
                const val = localStorage.getItem(k);
                if (!val) continue;

                // Always purge keys containing Data URLs - they have no place in localStorage
                if (val.includes('data:image/') || val.includes('data:application/') || val.includes('data:video/')) {
                    keysToRemove.push(k);
                    continue;
                }

                // If not part of the active session, remove bulky or session-specific keys
                if (!isPreserved) {
                    if (
                        lowerK.startsWith('session_obj_') ||
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

                    // Remove any unpreserved key larger than 50KB
                    if (val.length > 50000) {
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
 * If quota is exceeded, triggers emergency cleanup and retries once.
 * Never throws an exception.
 */
export const safeLocalStorageSetItem = (key: string, value: string): boolean => {
    if (typeof localStorage === 'undefined') return false;
    try {
        localStorage.setItem(key, value);
        return true;
    } catch (e) {
        console.warn(`[Storage] localStorage.setItem failed for "${key}", attempting emergency cleanup:`, e);
        try {
            pruneBulkyLocalStorageKeys();
            localStorage.setItem(key, value);
            return true;
        } catch (retryErr) {
            console.warn(`[Storage] localStorage.setItem retry failed for "${key}" (QuotaExceededError) - silently captured:`, retryErr);
            return false;
        }
    }
};

export const saveSessionLocal = async (params: SaveSessionParams): Promise<void> => {
    const { sessionId, logoA, logoB, logoPlacements, userData, mockups, logoColorModes = {}, globalLogoColorMode = 'original' } = params;
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
            const aiResolved = m.aiRemastered || m.ai || null;
            const primaryDisplay = aiResolved || m.imageUrl || m.mechanical || null;
            return {
                id: m.id,
                title: m.title,
                base: m.base,
                isGenerating: m.isGenerating,
                view: m.view,
                garment: m.garment,
                hasAi: !!aiResolved,
                selected: m.selected,
                mechanical: m.mechanical,
                ai: aiResolved,
                aiRemastered: m.aiRemastered || aiResolved,
                imageUrl: primaryDisplay,
                frontImageUrl: (m.view === 'front' ? aiResolved : undefined) || m.frontImageUrl || (m.view === 'front' ? primaryDisplay : undefined) || null,
                backImageUrl: (m.view === 'back' ? aiResolved : undefined) || m.backImageUrl || (m.view === 'back' ? primaryDisplay : undefined) || null,
                imageFront: (m.view === 'front' ? aiResolved : undefined) || m.imageFront || (m.view === 'front' ? primaryDisplay : undefined) || null,
                imageBack: (m.view === 'back' ? aiResolved : undefined) || m.imageBack || (m.view === 'back' ? primaryDisplay : undefined) || null
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

        // IndexedDB: safe to store full serialized data
        for (const k of keysToStore) {
            await dbSet(`session_obj_${k}`, serialized);
        }

        // 2. SANITIZED storage for localStorage (NO DATA URLS, NEVER EXCEED QUOTA)
        if (typeof localStorage !== 'undefined') {
            try {
                // Preventive cleanup
                pruneBulkyLocalStorageKeys(keysToStore);

                const storageSafeMockups = lightweightMockups.map(sanitizeMockupForLocalStorage);
                const storageSafeGarmentMockups = sanitizeGarmentMockupMap(rawGarmentMockups);
                const safeMockupsJson = JSON.stringify(storageSafeMockups);
                const safeGarmentJson = JSON.stringify(storageSafeGarmentMockups);

                const safeLocalSession = {
                    ...fullSession,
                    mockups: storageSafeMockups,
                    items: storageSafeMockups,
                    garmentMockups: storageSafeGarmentMockups
                };
                const safeSerializedLocal = JSON.stringify(safeLocalSession);

                for (const k of keysToStore) {
                    safeLocalStorageSetItem(`session_obj_${k}`, safeSerializedLocal);
                    safeLocalStorageSetItem(`garmentMockups_${k}`, safeGarmentJson);
                    safeLocalStorageSetItem(`btp_garment_mockups_${k}`, safeGarmentJson);
                    safeLocalStorageSetItem(`mockups_${k}`, safeMockupsJson);
                    if (mockups.some(m => m.ai || (m as any).aiRemastered)) {
                        safeLocalStorageSetItem(`btp_mockups_locked_${k}`, 'true');
                    }
                }
                safeLocalStorageSetItem('btp_active_session_id', sessionId);
                if (slug) safeLocalStorageSetItem('btp_active_session_slug', slug);
                safeLocalStorageSetItem('btp_active_session_data', safeSerializedLocal);
                safeLocalStorageSetItem('btp_garment_mockups', safeGarmentJson);
                safeLocalStorageSetItem('garmentMockups', safeGarmentJson);
                safeLocalStorageSetItem('mockups', safeMockupsJson);
                if (mockups.some(m => m.ai || (m as any).aiRemastered)) {
                    safeLocalStorageSetItem('btp_mockups_locked', 'true');
                }
                safeLocalStorageSetItem(`btp_garment_mockups_${sessionId}`, safeGarmentJson);
                if (slug) safeLocalStorageSetItem(`btp_garment_mockups_${slug}`, safeGarmentJson);

                if (storageSafeGarmentMockups.tshirt_front) {
                    safeLocalStorageSetItem('btp_mockup_tshirt_front', storageSafeGarmentMockups.tshirt_front);
                    safeLocalStorageSetItem(`btp_mockup_tshirt_front_${sessionId}`, storageSafeGarmentMockups.tshirt_front);
                    if (slug) safeLocalStorageSetItem(`btp_mockup_tshirt_front_${slug}`, storageSafeGarmentMockups.tshirt_front);
                }
                if (storageSafeGarmentMockups.tshirt_back) {
                    safeLocalStorageSetItem('btp_mockup_tshirt_back', storageSafeGarmentMockups.tshirt_back);
                    safeLocalStorageSetItem(`btp_mockup_tshirt_back_${sessionId}`, storageSafeGarmentMockups.tshirt_back);
                    if (slug) safeLocalStorageSetItem(`btp_mockup_tshirt_back_${slug}`, storageSafeGarmentMockups.tshirt_back);
                }
                if (storageSafeGarmentMockups.polo_front) {
                    safeLocalStorageSetItem('btp_mockup_polo_front', storageSafeGarmentMockups.polo_front);
                    safeLocalStorageSetItem(`btp_mockup_polo_front_${sessionId}`, storageSafeGarmentMockups.polo_front);
                    if (slug) safeLocalStorageSetItem(`btp_mockup_polo_front_${slug}`, storageSafeGarmentMockups.polo_front);
                }
                if (storageSafeGarmentMockups.polo_back) {
                    safeLocalStorageSetItem('btp_mockup_polo_back', storageSafeGarmentMockups.polo_back);
                    safeLocalStorageSetItem(`btp_mockup_polo_back_${sessionId}`, storageSafeGarmentMockups.polo_back);
                    if (slug) safeLocalStorageSetItem(`btp_mockup_polo_back_${slug}`, storageSafeGarmentMockups.polo_back);
                }
                if (storageSafeGarmentMockups.hoodie || storageSafeGarmentMockups.hoodie_front) {
                    const hVal = storageSafeGarmentMockups.hoodie || storageSafeGarmentMockups.hoodie_front!;
                    safeLocalStorageSetItem('btp_mockup_hoodie', hVal);
                    safeLocalStorageSetItem('btp_mockup_hoodie_front', hVal);
                    safeLocalStorageSetItem(`btp_mockup_hoodie_${sessionId}`, hVal);
                    safeLocalStorageSetItem(`btp_mockup_hoodie_front_${sessionId}`, hVal);
                    if (slug) {
                        safeLocalStorageSetItem(`btp_mockup_hoodie_${slug}`, hVal);
                        safeLocalStorageSetItem(`btp_mockup_hoodie_front_${slug}`, hVal);
                    }
                }
                if (storageSafeGarmentMockups.hoodie_back) {
                    safeLocalStorageSetItem('btp_mockup_hoodie_back', storageSafeGarmentMockups.hoodie_back);
                    safeLocalStorageSetItem(`btp_mockup_hoodie_back_${sessionId}`, storageSafeGarmentMockups.hoodie_back);
                    if (slug) safeLocalStorageSetItem(`btp_mockup_hoodie_back_${slug}`, storageSafeGarmentMockups.hoodie_back);
                }
            } catch (e) {
                console.warn("[Storage] saveSessionLocal localStorage error safely captured:", e);
            }
        }

        for (const m of mockups) {
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
 * uploads them directly to Firebase Storage under btp_mockups/${slug}/web/${id}_${Date.now()}.png,
 * and updates SiteConfigs/${slug} and btp_projects/${sessionId} with public URLs.
 */
export const syncSessionToCloud = async (params: SaveSessionParams): Promise<CloudSyncResult> => {
    const { sessionId, logoA, logoB, logoPlacements, userData, mockups, logoColorModes = {}, globalLogoColorMode = 'original' } = params;
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

        // Direct upload of active logo to Firebase Storage
        const getActiveLogoUrl = async (l: BtpLogo, slot: string): Promise<string | null> => {
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
                        const timestamp = Date.now();
                        const storagePath = `btp_mockups/${slug}/web/logo_${slot}_active_${timestamp}.png`;
                        const storageRef = ref(storage, storagePath);
                        let dataUrl = base64.trim();
                        if (!dataUrl.startsWith('data:')) {
                            dataUrl = `data:image/png;base64,${dataUrl}`;
                        }
                        const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,/);
                        const contentType = match ? match[1] : 'image/png';
                        const metadata: UploadMetadata = {
                            contentType,
                            cacheControl: 'public, max-age=31536000, immutable'
                        };
                        await uploadString(storageRef, dataUrl, 'data_url', metadata);
                        const downloadUrl = await getDownloadURL(storageRef);
                        console.log(`-> Upload réussi [logo_${slot}] vers ${storagePath}`);
                        return downloadUrl;
                    } catch (e) {
                        console.warn(`Direct upload notice for logo ${slot}:`, e);
                        return base64;
                    }
                }
            }
            return base64 || null;
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
                    const timestamp = Date.now();
                    const storagePath = `btp_mockups/${slug}/web/${id}_${timestamp}.png`;
                    const storageRef = ref(storage, storagePath);
                    const metadata: UploadMetadata = {
                        contentType,
                        cacheControl: 'public, max-age=31536000, immutable'
                    };
                    await uploadString(storageRef, dataUrl, 'data_url', metadata);
                    const downloadUrl = await getDownloadURL(storageRef);
                    console.log(`-> Upload réussi [${id}] vers ${storagePath}`);
                    return downloadUrl;
                } catch (e) {
                    console.warn(`Direct storage upload failed for ${id}:`, e);
                    return null;
                }
            }
            return null;
        };

        const [urlA, urlB] = await Promise.all([
            getActiveLogoUrl(logoA, 'A'),
            getActiveLogoUrl(logoB, 'B')
        ]);

        const isBackId = (id?: string) => !id ? false : /(back|dos|verso|tback|pback|hback|tankback|tankwhiteback|heavyback)/i.test(id);
        const isFrontId = (id?: string) => !id ? false : /(front|face|recto|tfront|pfront|hfront|tankfront|tankwhitefront|heavyfront)/i.test(id);

        // Systematic recovery: inspect mockups and query IndexedDB for any trapped images
        const allMockupsToProcess: MockupItem[] = [...(mockups || [])];

        const STANDARD_IDS = [
            'tFront', 'tBack',
            'pFront', 'pBack',
            'hFront', 'hBack',
            'tankFront', 'tankBack',
            'tankWhiteFront', 'tankWhiteBack',
            'heavyFront', 'heavyBack'
        ];

        for (const stdId of STANDARD_IDS) {
            if (!allMockupsToProcess.some(m => m.id === stdId)) {
                const idbAi = await dbGet(`${sessionId}_ai_${stdId}`);
                const idbMech = await dbGet(`${sessionId}_mech_${stdId}`);
                if (idbAi || idbMech) {
                    const isBack = isBackId(stdId);
                    const garment: MockupItem['garment'] = stdId.startsWith('heavy') ? 'tshirt_oversize' : stdId.startsWith('t') ? 'tshirt' : stdId.startsWith('p') ? 'polo' : stdId.startsWith('h') ? 'sweat' : 'tank_top';
                    allMockupsToProcess.push({
                        id: stdId,
                        title: stdId,
                        garment,
                        view: isBack ? 'back' : 'front',
                        selected: true,
                        ai: idbAi,
                        aiRemastered: idbAi,
                        isGenerating: false,
                        mechanical: idbMech,
                        base: ''
                    });
                }
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
                return {
                    ...m,
                    id: m.id || "",
                    title: m.title || "",
                    garment,
                    view: m.view || (isBack ? 'back' : 'front'),
                    selected: !!m.selected,
                    ai: m.ai || null,
                    mechanical: m.mechanical || null,
                    base: (m as any).base || "",
                    isGenerating: false,
                    aiRemastered: (m as any).aiRemastered || null,
                    model: m.model
                };
            }

            const isFrontItem = m.view === 'front' || (!m.id.toLowerCase().includes('back') && !m.id.toLowerCase().includes('dos'));
            const fallbackSlot = (isFrontItem && logoB?.original) ? 'B' : 'A';
            const slot = logoPlacements[m.id] || fallbackSlot;
            const logo = slot === 'A' ? logoA : logoB;
            let activeAi = (m as any).aiRemastered || m.ai;

            // SYSTEMATIC INDEXEDDB RECOVERY: fetch trapped base64 from BtpAuditDB / heavy_assets
            if (!activeAi || (typeof activeAi === 'string' && (activeAi.startsWith('/assets/') || activeAi.startsWith('/merch/')))) {
                if (idbAi && typeof idbAi === 'string' && (idbAi.startsWith('data:') || idbAi.length > 50)) {
                    activeAi = idbAi;
                }
            }

            let mechData = m.mechanical;
            if (!mechData || (typeof mechData === 'string' && (mechData.startsWith('/assets/') || mechData.startsWith('/merch/')))) {
                if (idbMech && typeof idbMech === 'string' && (idbMech.startsWith('data:') || idbMech.length > 50)) {
                    mechData = idbMech;
                }
            }

            const [aiUrl, mechUrl] = await Promise.all([
                uploadIfBase64(activeAi, m.id),
                uploadIfBase64(mechData, `${m.id}_mech`)
            ]);

            const finalAi = (aiUrl && (aiUrl.startsWith('http://') || aiUrl.startsWith('https://')))
                ? aiUrl
                : (activeAi && typeof activeAi === 'string' && (activeAi.startsWith('http://') || activeAi.startsWith('https://')) ? activeAi : (activeAi || null));

            const finalMech = (mechUrl && (mechUrl.startsWith('http://') || mechUrl.startsWith('https://')))
                ? mechUrl
                : (mechData && typeof mechData === 'string' && (mechData.startsWith('http://') || mechData.startsWith('https://')) ? mechData : (mechData || null));

            const primaryUrl = finalAi || finalMech;

            const updatedMockup: MockupItem = {
                ...m,
                id: m.id || "",
                title: m.title || "",
                garment,
                view: m.view || (isBack ? 'back' : 'front'),
                selected: true,
                ai: finalAi,
                aiRemastered: finalAi,
                mechanical: finalMech,
                base: (m as any).base || "",
                isGenerating: false,
                model: m.model
            };

            (updatedMockup as any).imageUrl = finalAi || primaryUrl;
            if (isBack) {
                (updatedMockup as any).backImageUrl = finalAi || primaryUrl;
                (updatedMockup as any).imageBack = finalAi || primaryUrl;
            } else {
                (updatedMockup as any).frontImageUrl = finalAi || primaryUrl;
                (updatedMockup as any).imageFront = finalAi || primaryUrl;
            }

            return updatedMockup;
        }));

        const tshirtMock = uploadedMockups.find(m => (m.garment === 'tshirt' && m.view === 'front') || m.id === 'tFront' || (m.garment === 'tshirt' && isFrontId(m.id)));
        const poloMock = uploadedMockups.find(m => (m.garment === 'polo' && m.view === 'front') || m.id === 'pFront' || (m.garment === 'polo' && isFrontId(m.id)));
        const hoodieMock = uploadedMockups.find(m => (m.garment === 'sweat' && m.view === 'front') || m.id === 'hFront' || (m.garment === 'sweat' && isFrontId(m.id)));
        const tankMock = uploadedMockups.find(m => m.id === 'tankFront' || (m.garment === 'tank_top' && m.view === 'front' && !m.id.toLowerCase().includes('white')));
        const tankWhiteMock = uploadedMockups.find(m => m.id === 'tankWhiteFront' || (m.garment === 'tank_top' && m.view === 'front' && m.id.toLowerCase().includes('white')));
        const heavyMock = uploadedMockups.find(m => (m.garment === 'tshirt_oversize' && m.view === 'front') || m.id === 'heavyFront' || (m.garment === 'tshirt_oversize' && isFrontId(m.id)));

        const tshirtBackMock = uploadedMockups.find(m => (m.garment === 'tshirt' && m.view === 'back') || m.id === 'tBack' || (m.garment === 'tshirt' && isBackId(m.id)));
        const poloBackMock = uploadedMockups.find(m => (m.garment === 'polo' && m.view === 'back') || m.id === 'pBack' || (m.garment === 'polo' && isBackId(m.id)));
        const hoodieBackMock = uploadedMockups.find(m => (m.garment === 'sweat' && m.view === 'back') || m.id === 'hBack' || (m.garment === 'sweat' && isBackId(m.id)));
        const tankBackMock = uploadedMockups.find(m => m.id === 'tankBack' || (m.garment === 'tank_top' && m.view === 'back' && !m.id.toLowerCase().includes('white')));
        const tankWhiteBackMock = uploadedMockups.find(m => m.id === 'tankWhiteBack' || (m.garment === 'tank_top' && m.view === 'back' && m.id.toLowerCase().includes('white')));
        const heavyBackMock = uploadedMockups.find(m => (m.garment === 'tshirt_oversize' && m.view === 'back') || m.id === 'heavyBack' || (m.garment === 'tshirt_oversize' && isBackId(m.id)));

        const isFlatComposite = (u?: string | null) => {
            if (!u || typeof u !== 'string') return false;
            if (u.startsWith('data:image') || u.startsWith('http://') || u.startsWith('https://') || u.startsWith('/') || u.includes('btp_mockups') || u.includes('_ai_') || u.includes('_mech_') || u.includes('clubvision') || u.includes('dfazz') || u.includes('aaronh')) return true;
            return false;
        };

        const effectiveFrontLogo = (logoPlacements?.tFront === 'B' ? urlB : urlA) || urlB || urlA || "";
        const effectiveBackLogo = (logoPlacements?.tBack === 'A' ? urlA : urlB) || urlA || urlB || "";
        const effectivePoloFrontLogo = (logoPlacements?.pFront === 'B' ? urlB : urlA) || urlB || urlA || "";
        const effectivePoloBackLogo = (logoPlacements?.pBack === 'A' ? urlA : urlB) || urlA || urlB || "";
        const effectiveHoodieFrontLogo = (logoPlacements?.hFront === 'B' ? urlB : urlA) || urlB || urlA || "";
        const effectiveHoodieBackLogo = (logoPlacements?.hBack === 'A' ? urlA : urlB) || urlA || urlB || "";
        const effectiveTankFrontLogo = (logoPlacements?.tankFront === 'B' ? urlB : urlA) || urlB || urlA || "";
        const effectiveTankBackLogo = (logoPlacements?.tankBack === 'A' ? urlA : urlB) || urlA || urlB || "";
        const effectiveTankWhiteFrontLogo = (logoPlacements?.tankWhiteFront === 'B' ? urlB : urlA) || urlB || urlA || "";
        const effectiveTankWhiteBackLogo = (logoPlacements?.tankWhiteBack === 'A' ? urlA : urlB) || urlA || urlB || "";
        const effectiveHeavyFrontLogo = (logoPlacements?.heavyFront === 'B' ? urlB : urlA) || urlB || urlA || "";
        const effectiveHeavyBackLogo = (logoPlacements?.heavyBack === 'A' ? urlA : urlB) || urlA || urlB || "";

        const resolveMockupAiOrMech = (mock?: any) => {
            if (!mock) return null;
            const aiCandidate = mock.aiRemastered || mock.ai || (mock as any).realAiSnapshotUrl || (mock as any).imageStudio;
            if (aiCandidate && isFlatComposite(aiCandidate)) return aiCandidate;
            const frontCandidate = (mock as any).imageFront || (mock as any).frontImageUrl;
            if (frontCandidate && isFlatComposite(frontCandidate) && !frontCandidate.startsWith('/assets/') && !frontCandidate.startsWith('/merch/')) {
                return frontCandidate;
            }
            const backCandidate = (mock as any).imageBack || (mock as any).backImageUrl;
            if (backCandidate && isFlatComposite(backCandidate) && !backCandidate.startsWith('/assets/') && !backCandidate.startsWith('/merch/')) {
                return backCandidate;
            }
            if (mock.mechanical && isFlatComposite(mock.mechanical)) return mock.mechanical;
            return null;
        };

        let tshirtImg = resolveMockupAiOrMech(tshirtMock);
        if (!tshirtImg && effectiveFrontLogo) {
            try {
                tshirtImg = await generateMechanicalMockup('/assets/tshirt-black-JHK170.png', effectiveFrontLogo, 'front', 1.0, 'tshirt');
            } catch (e) {
                tshirtImg = '/assets/tshirt-black-JHK170.png';
            }
        } else if (!tshirtImg) {
            tshirtImg = '/assets/tshirt-black-JHK170.png';
        }

        let tshirtBackImg = resolveMockupAiOrMech(tshirtBackMock);
        if (!tshirtBackImg && effectiveBackLogo) {
            try {
                tshirtBackImg = await generateMechanicalMockup('/assets/tshirt-black-JHK170-dos.png', effectiveBackLogo, 'back', 1.0, 'tshirt');
            } catch (e) {
                tshirtBackImg = '/assets/tshirt-black-JHK170-dos.png';
            }
        } else if (!tshirtBackImg) {
            tshirtBackImg = '/assets/tshirt-black-JHK170-dos.png';
        }

        let poloImg = resolveMockupAiOrMech(poloMock);
        if (!poloImg && effectivePoloFrontLogo) {
            try {
                poloImg = await generateMechanicalMockup('/assets/polo-black-JHK510.png', effectivePoloFrontLogo, 'front', 1.0, 'polo');
            } catch (e) {
                poloImg = '/assets/polo-black-JHK510.png';
            }
        } else if (!poloImg) {
            poloImg = '/assets/polo-black-JHK510.png';
        }

        let poloBackImg = resolveMockupAiOrMech(poloBackMock);
        if (!poloBackImg && effectivePoloBackLogo) {
            try {
                poloBackImg = await generateMechanicalMockup('/assets/polo-black-JHK510-dos.png', effectivePoloBackLogo, 'back', 1.0, 'polo');
            } catch (e) {
                poloBackImg = '/assets/polo-black-JHK510-dos.png';
            }
        } else if (!poloBackImg) {
            poloBackImg = '/assets/polo-black-JHK510-dos.png';
        }

        let hoodieImg = resolveMockupAiOrMech(hoodieMock);
        if (!hoodieImg && effectiveHoodieFrontLogo) {
            try {
                hoodieImg = await generateMechanicalMockup('/assets/hoodie-black-JHK421.png', effectiveHoodieFrontLogo, 'front', 1.0, 'sweat');
            } catch (e) {
                hoodieImg = '/assets/hoodie-black-JHK421.png';
            }
        } else if (!hoodieImg) {
            hoodieImg = '/assets/hoodie-black-JHK421.png';
        }

        let hoodieBackImg = resolveMockupAiOrMech(hoodieBackMock);
        if (!hoodieBackImg && effectiveHoodieBackLogo) {
            try {
                hoodieBackImg = await generateMechanicalMockup('/assets/hoodie-black-JHK421-dos.png', effectiveHoodieBackLogo, 'back', 1.0, 'sweat');
            } catch (e) {
                hoodieBackImg = '/assets/hoodie-black-JHK421-dos.png';
            }
        } else if (!hoodieBackImg) {
            hoodieBackImg = '/assets/hoodie-black-JHK421-dos.png';
        }

        let tankImg = resolveMockupAiOrMech(tankMock);
        if (!tankImg && effectiveTankFrontLogo) {
            try {
                tankImg = await generateMechanicalMockup('/merch/visionroom/tank-front.png', effectiveTankFrontLogo, 'front', 1.0, 'tank_top');
            } catch (e) {
                tankImg = '/merch/visionroom/tank-front.png';
            }
        } else if (!tankImg) {
            tankImg = '/merch/visionroom/tank-front.png';
        }

        let tankBackImg = resolveMockupAiOrMech(tankBackMock);
        if (!tankBackImg && effectiveTankBackLogo) {
            try {
                tankBackImg = await generateMechanicalMockup('/merch/visionroom/tank-back.png', effectiveTankBackLogo, 'back', 1.0, 'tank_top');
            } catch (e) {
                tankBackImg = '/merch/visionroom/tank-back.png';
            }
        } else if (!tankBackImg) {
            tankBackImg = '/merch/visionroom/tank-back.png';
        }

        let tankWhiteImg = resolveMockupAiOrMech(tankWhiteMock);
        if (!tankWhiteImg && effectiveTankWhiteFrontLogo) {
            try {
                tankWhiteImg = await generateMechanicalMockup('/merch/visionroom/tank-white-front.png', effectiveTankWhiteFrontLogo, 'front', 1.0, 'tank_top', 'black');
            } catch (e) {
                tankWhiteImg = '/merch/visionroom/tank-white-front.png';
            }
        } else if (!tankWhiteImg) {
            tankWhiteImg = '/merch/visionroom/tank-white-front.png';
        }

        let tankWhiteBackImg = resolveMockupAiOrMech(tankWhiteBackMock);
        if (!tankWhiteBackImg && effectiveTankWhiteBackLogo) {
            try {
                tankWhiteBackImg = await generateMechanicalMockup('/merch/visionroom/tank-white-back.png', effectiveTankWhiteBackLogo, 'back', 1.0, 'tank_top', 'black');
            } catch (e) {
                tankWhiteBackImg = '/merch/visionroom/tank-white-back.png';
            }
        } else if (!tankWhiteBackImg) {
            tankWhiteBackImg = '/merch/visionroom/tank-white-back.png';
        }

        let heavyImg = resolveMockupAiOrMech(heavyMock);
        if (!heavyImg && effectiveHeavyFrontLogo) {
            try {
                heavyImg = await generateMechanicalMockup('/merch/visionroom/oversize-front.png', effectiveHeavyFrontLogo, 'front', 1.0, 'tshirt_oversize');
            } catch (e) {
                heavyImg = '/merch/visionroom/oversize-front.png';
            }
        } else if (!heavyImg) {
            heavyImg = '/merch/visionroom/oversize-front.png';
        }

        let heavyBackImg = resolveMockupAiOrMech(heavyBackMock);
        if (!heavyBackImg && effectiveHeavyBackLogo) {
            try {
                heavyBackImg = await generateMechanicalMockup('/merch/visionroom/oversize-back.png', effectiveHeavyBackLogo, 'back', 1.0, 'tshirt_oversize');
            } catch (e) {
                heavyBackImg = '/merch/visionroom/oversize-back.png';
            }
        } else if (!heavyBackImg) {
            heavyBackImg = '/merch/visionroom/oversize-back.png';
        }

        const uploadToStorageSafe = async (dataOrUrl: string, id: string): Promise<string> => {
            if (!dataOrUrl) return dataOrUrl;
            if (dataOrUrl.startsWith('http://') || dataOrUrl.startsWith('https://')) return dataOrUrl;
            if (!dataOrUrl.startsWith('data:') && dataOrUrl.length < 50) return dataOrUrl;
            try {
                const storagePath = `btp_mockups/${slug}/web/${id}_${Date.now()}.png`;
                return await uploadBase64ToStorage(dataOrUrl, storagePath);
            } catch (err) {
                console.warn(`Storage upload failed for ${id}:`, err);
                return dataOrUrl;
            }
        };

        const [
            finalTshirtFront, finalTshirtBack,
            finalPoloFront, finalPoloBack,
            finalHoodieFront, finalHoodieBack,
            finalTankFront, finalTankBack,
            finalTankWhiteFront, finalTankWhiteBack,
            finalHeavyFront, finalHeavyBack
        ] = await Promise.all([
            uploadToStorageSafe(tshirtImg, 'tFront'),
            uploadToStorageSafe(tshirtBackImg, 'tBack'),
            uploadToStorageSafe(poloImg, 'pFront'),
            uploadToStorageSafe(poloBackImg, 'pBack'),
            uploadToStorageSafe(hoodieImg, 'hFront'),
            uploadToStorageSafe(hoodieBackImg, 'hBack'),
            uploadToStorageSafe(tankImg, 'tankFront'),
            uploadToStorageSafe(tankBackImg, 'tankBack'),
            uploadToStorageSafe(tankWhiteImg, 'tankWhiteFront'),
            uploadToStorageSafe(tankWhiteBackImg, 'tankWhiteBack'),
            uploadToStorageSafe(heavyImg, 'heavyFront'),
            uploadToStorageSafe(heavyBackImg, 'heavyBack')
        ]);

        const isVisionSession = sessionId.includes('clubvision') || sessionId.includes('vision') || (userData.companyName || '').toLowerCase().includes('vision');

        const productsSchema = {
            tshirt: {
                id: tshirtMock?.id || 'tFront',
                name: tshirtMock?.title || 'T-Shirt Premium',
                garment: 'tshirt',
                aiImageUrl: finalTshirtFront,
                imageUrl: finalTshirtFront,
                imageFront: finalTshirtFront,
                frontImageUrl: finalTshirtFront,
                imageBack: finalTshirtBack,
                backImageUrl: finalTshirtBack,
                price: 29.99
            },
            polo: {
                id: poloMock?.id || 'pFront',
                name: poloMock?.title || 'Polo Premium',
                garment: 'polo',
                aiImageUrl: finalPoloFront,
                imageUrl: finalPoloFront,
                imageFront: finalPoloFront,
                frontImageUrl: finalPoloFront,
                imageBack: finalPoloBack,
                backImageUrl: finalPoloBack,
                price: 39.99
            },
            hoodie: {
                id: hoodieMock?.id || 'hFront',
                name: hoodieMock?.title || 'Hoodie Premium',
                garment: 'sweat',
                aiImageUrl: finalHoodieFront,
                imageUrl: finalHoodieFront,
                imageFront: finalHoodieFront,
                frontImageUrl: finalHoodieFront,
                imageBack: finalHoodieBack,
                backImageUrl: finalHoodieBack,
                price: 49.00
            },
            tank_top: {
                id: tankMock?.id || 'tankFront',
                name: tankMock?.title || 'Débardeur Noir Vision Room',
                garment: 'tank_top',
                supplierRef: 'BYBB011',
                aiImageUrl: finalTankFront,
                imageUrl: finalTankFront,
                imageFront: finalTankFront,
                frontImageUrl: finalTankFront,
                imageBack: finalTankBack,
                backImageUrl: finalTankBack,
                price: 27.99
            },
            tank_top_white: {
                id: tankWhiteMock?.id || 'tankWhiteFront',
                name: tankWhiteMock?.title || 'Débardeur Blanc Vision Room',
                garment: 'tank_top',
                supplierRef: 'BYBB011',
                aiImageUrl: finalTankWhiteFront,
                imageUrl: finalTankWhiteFront,
                imageFront: finalTankWhiteFront,
                frontImageUrl: finalTankWhiteFront,
                imageBack: finalTankWhiteBack,
                backImageUrl: finalTankWhiteBack,
                price: 27.99
            },
            heavyweight_tee: {
                id: heavyMock?.id || 'heavyFront',
                name: heavyMock?.title || 'T-Shirt Heavyweight Oversize',
                garment: 'tshirt_oversize',
                supplierRef: 'NX7200',
                aiImageUrl: finalHeavyFront,
                imageUrl: finalHeavyFront,
                imageFront: finalHeavyFront,
                frontImageUrl: finalHeavyFront,
                imageBack: finalHeavyBack,
                backImageUrl: finalHeavyBack,
                price: 34.99
            }
        };

        // Explicitly write products.${m.id}.imageUrl and frontImageUrl / backImageUrl according to view
        for (const m of uploadedMockups) {
            const isBack = m.view === 'back' || isBackId(m.id);
            const aiCandidate = (m as any).aiRemastered || m.ai || null;
            const directUrl = aiCandidate || (isBack ? ((m as any).aiRemasteredBack || (m as any).aiBack) : null) || (m as any).imageUrl || (isBack ? (m as any).backImageUrl : (m as any).frontImageUrl) || m.mechanical;
            if (directUrl) {
                productsSchema[m.id] = {
                    ...(productsSchema[m.id] || {}),
                    id: m.id,
                    title: m.title || m.id,
                    name: m.title || m.id,
                    garment: m.garment,
                    view: m.view || (isBack ? 'back' : 'front'),
                    selected: !!m.selected,
                    ai: aiCandidate || (productsSchema[m.id] as any)?.ai || null,
                    aiRemastered: aiCandidate || (productsSchema[m.id] as any)?.aiRemastered || null,
                    imageUrl: aiCandidate || directUrl,
                    ...(isBack
                        ? { backImageUrl: aiCandidate || directUrl, imageBack: aiCandidate || directUrl }
                        : { frontImageUrl: aiCandidate || directUrl, imageFront: aiCandidate || directUrl }
                    )
                };
            }
        }

        // 1. Dictionnaire complet des mockups avec leurs URLs publiques Storage
        const mockupsDictionary: Record<string, any> = {};
        for (const m of uploadedMockups) {
            if (m.id) {
                const isBack = m.view === 'back' || isBackId(m.id);
                const aiCandidate = (m as any).aiRemastered || m.ai || null;
                const mechCandidate = m.mechanical || null;
                const baseCandidate = (m as any).base || "";
                const primaryCandidate = aiCandidate || mechCandidate || (m as any).imageUrl || baseCandidate || null;

                mockupsDictionary[m.id] = {
                    id: m.id,
                    title: m.title || m.id,
                    name: m.title || m.id,
                    garment: m.garment,
                    view: m.view || (isBack ? 'back' : 'front'),
                    selected: !!m.selected,
                    ai: aiCandidate,
                    aiRemastered: aiCandidate,
                    mechanical: mechCandidate,
                    base: baseCandidate,
                    imageUrl: primaryCandidate,
                    frontImageUrl: isBack ? undefined : primaryCandidate,
                    backImageUrl: isBack ? primaryCandidate : undefined,
                    imageFront: isBack ? undefined : primaryCandidate,
                    imageBack: isBack ? primaryCandidate : undefined,
                    url: primaryCandidate
                };
            }
        }

        // 2. Schéma universel Firestore : Hydrater systématiquement le tableau `products`
        const resolveProductItem = (
            id: string,
            name: string,
            garment: string,
            price: number,
            frontItem: any,
            backItem: any,
            supplierRef?: string,
            defaultBaseFront: string = '',
            defaultBaseBack: string = '',
            color: string = 'Noir'
        ) => {
            const frontAi = frontItem?.aiRemastered || frontItem?.ai || null;
            const backAi = backItem?.aiRemasteredBack || backItem?.aiBack || backItem?.aiRemastered || backItem?.ai || null;
            const hasAi = Boolean(frontAi || backAi);

            const frontImageUrl = frontAi || frontItem?.mechanical || frontItem?.base || defaultBaseFront;
            const backImageUrl = backAi || backItem?.mechanicalBack || backItem?.mechanical || backItem?.base || defaultBaseBack;

            return {
                id,
                title: name,
                name,
                garment,
                color,
                colors: color === 'Blanc' ? ['Blanc'] : ['Noir', 'Blanc'],
                price,
                currency: '€',
                frontImageUrl,
                backImageUrl,
                imageUrl: frontImageUrl,
                imageFront: frontImageUrl,
                imageBack: backImageUrl,
                ai: hasAi,
                aiRemastered: frontAi || null,
                aiRemasteredBack: backAi || null,
                mechanical: frontItem?.mechanical || null,
                mechanicalBack: backItem?.mechanicalBack || backItem?.mechanical || null,
                base: frontItem?.base || defaultBaseFront,
                baseBack: backItem?.base || defaultBaseBack,
                selected: frontItem ? !!frontItem.selected : true,
                ...(supplierRef ? { supplierRef } : {}),
                sizes: (garment === 'cap' || garment === 'tote_bag') ? ['Unique'] : ['S', 'M', 'L', 'XL', 'XXL']
            };
        };

        const universalProductsArray: any[] = [
            resolveProductItem(
                tshirtMock?.id || 'tFront',
                tshirtMock?.title || 'T-Shirt Premium',
                'tshirt',
                29.99,
                tshirtMock,
                tshirtBackMock,
                undefined,
                finalTshirtFront || '/assets/tshirt-black-JHK170.png',
                finalTshirtBack || '/assets/tshirt-black-JHK170-dos.png'
            ),
            resolveProductItem(
                poloMock?.id || 'pFront',
                poloMock?.title || 'Polo Premium',
                'polo',
                39.99,
                poloMock,
                poloBackMock,
                undefined,
                finalPoloFront || '/assets/polo-black-JHK510.png',
                finalPoloBack || '/assets/polo-black-JHK510-dos.png'
            ),
            resolveProductItem(
                hoodieMock?.id || 'hFront',
                hoodieMock?.title || 'Hoodie Premium',
                'sweat',
                49.00,
                hoodieMock,
                hoodieBackMock,
                undefined,
                finalHoodieFront || '/assets/hoodie-black-JHK421.png',
                finalHoodieBack || '/assets/hoodie-black-JHK421-dos.png'
            ),
            resolveProductItem(
                tankMock?.id || 'tankFront',
                tankMock?.title || 'Débardeur Noir Vision Room',
                'tank_top',
                27.99,
                tankMock,
                tankBackMock,
                'BYBB011',
                finalTankFront || '/merch/visionroom/tank-front.png',
                finalTankBack || '/merch/visionroom/tank-back.png',
                'Noir'
            ),
            resolveProductItem(
                tankWhiteMock?.id || 'tankWhiteFront',
                tankWhiteMock?.title || 'Débardeur Blanc Vision Room',
                'tank_top',
                27.99,
                tankWhiteMock,
                tankWhiteBackMock,
                'BYBB011',
                finalTankWhiteFront || '/merch/visionroom/tank-white-front.png',
                finalTankWhiteBack || '/merch/visionroom/tank-white-back.png',
                'Blanc'
            ),
            resolveProductItem(
                heavyMock?.id || 'heavyFront',
                heavyMock?.title || 'T-Shirt Heavyweight Oversize',
                'tshirt_oversize',
                34.99,
                heavyMock,
                heavyBackMock,
                'NX7200',
                finalHeavyFront || '/merch/visionroom/oversize-front.png',
                finalHeavyBack || '/merch/visionroom/oversize-back.png',
                'Noir'
            )
        ];

        // Intégrer également les autres items sélectionnés non-standards
        for (const m of uploadedMockups) {
            if (m.selected && m.id && !['tFront', 'tBack', 'pFront', 'pBack', 'hFront', 'hBack', 'tankFront', 'tankBack', 'tankWhiteFront', 'tankWhiteBack', 'heavyFront', 'heavyBack'].includes(m.id)) {
                const isBack = m.view === 'back' || isBackId(m.id);
                const aiCandidate = (m as any).aiRemastered || m.ai || null;
                const frontImg = isBack ? undefined : (aiCandidate || m.mechanical || m.base);
                const backImg = isBack ? (aiCandidate || m.mechanical || m.base) : undefined;
                universalProductsArray.push({
                    id: m.id,
                    title: m.title || m.id,
                    name: m.title || m.id,
                    garment: m.garment,
                    price: (m as any).price || 29.99,
                    currency: '€',
                    frontImageUrl: frontImg,
                    backImageUrl: backImg,
                    imageUrl: frontImg || backImg,
                    ai: Boolean(aiCandidate),
                    aiRemastered: aiCandidate,
                    mechanical: m.mechanical || null,
                    base: m.base || "",
                    selected: true
                });
            }
        }

        const defaultAuditItems: any[] = universalProductsArray;

        if (isVisionSession) {
            const resolvedTank = finalTankFront ? {
                ...VISION_ROOM_BASIC_TANK,
                imageUrl: finalTankFront,
                frontImageUrl: finalTankFront,
                imageFront: finalTankFront,
                backImageUrl: finalTankBack || VISION_ROOM_BASIC_TANK.backImageUrl,
                imageBack: finalTankBack || VISION_ROOM_BASIC_TANK.imageBack,
                ai: true,
                aiRemastered: finalTankFront,
                images: {
                    ...VISION_ROOM_BASIC_TANK.images,
                    front: finalTankFront,
                    face: finalTankFront,
                    back: finalTankBack || VISION_ROOM_BASIC_TANK.images?.back,
                    dos: finalTankBack || VISION_ROOM_BASIC_TANK.images?.dos
                }
            } : VISION_ROOM_BASIC_TANK;

            const resolvedHeavy = finalHeavyFront ? {
                ...VISION_ROOM_HEAVYWEIGHT_TEE,
                imageUrl: finalHeavyFront,
                frontImageUrl: finalHeavyFront,
                imageFront: finalHeavyFront,
                backImageUrl: finalHeavyBack || VISION_ROOM_HEAVYWEIGHT_TEE.backImageUrl,
                imageBack: finalHeavyBack || VISION_ROOM_HEAVYWEIGHT_TEE.imageBack,
                ai: true,
                aiRemastered: finalHeavyFront,
                images: {
                    ...VISION_ROOM_HEAVYWEIGHT_TEE.images,
                    front: finalHeavyFront,
                    face: finalHeavyFront,
                    back: finalHeavyBack || VISION_ROOM_HEAVYWEIGHT_TEE.images?.back,
                    dos: finalHeavyBack || VISION_ROOM_HEAVYWEIGHT_TEE.images?.dos
                }
            } : VISION_ROOM_HEAVYWEIGHT_TEE;

            defaultAuditItems.push(resolvedTank as any, resolvedHeavy as any);
        }

        const cleanSid = sessionId.replace(/^audit-/, '');

        const garmentMockups: GarmentMockupMap = {
            tshirt: finalTshirtFront,
            tshirt_front: finalTshirtFront,
            tshirt_back: finalTshirtBack,
            polo: finalPoloFront,
            polo_front: finalPoloFront,
            polo_back: finalPoloBack,
            hoodie: finalHoodieFront,
            hoodie_front: finalHoodieFront,
            hoodie_back: finalHoodieBack,
            sweat: finalHoodieFront,
            sweat_front: finalHoodieFront,
            sweat_back: finalHoodieBack,
            tank_top: finalTankFront,
            tank_front: finalTankFront,
            tank_back: finalTankBack,
            tank_white_front: finalTankWhiteFront,
            tank_white_back: finalTankWhiteBack,
            tshirt_oversize: finalHeavyFront,
            heavy_front: finalHeavyFront,
            heavy_back: finalHeavyBack,
            ...extractGarmentMockupMap(uploadedMockups)
        };

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
            tshirt_front: garmentMockups.tshirt_front,
            tshirt_back: garmentMockups.tshirt_back,
            polo_front: garmentMockups.polo_front,
            polo_back: garmentMockups.polo_back,
            hoodie: garmentMockups.hoodie,
            hoodie_front: garmentMockups.hoodie_front,
            hoodie_back: garmentMockups.hoodie_back,
            products: universalProductsArray,
            productsMap: productsSchema,
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

        for (const k of localKeysToPersist) {
            await dbSet(`session_obj_${k}`, serializedLocal);
        }
        if (typeof localStorage !== 'undefined') {
            try {
                pruneBulkyLocalStorageKeys(localKeysToPersist);

                const storageSafeMockups = uploadedMockups.map(sanitizeMockupForLocalStorage);
                const storageSafeGarmentMockups = sanitizeGarmentMockupMap(garmentMockups);
                const safeMockupsJson = JSON.stringify(storageSafeMockups);
                const safeGarmentJson = JSON.stringify(storageSafeGarmentMockups);

                const safeLocalSession = {
                    ...fullLocalSession,
                    mockups: storageSafeMockups,
                    items: storageSafeMockups,
                    garmentMockups: storageSafeGarmentMockups
                };
                const safeSerializedLocal = JSON.stringify(safeLocalSession);

                for (const k of localKeysToPersist) {
                    safeLocalStorageSetItem(`session_obj_${k}`, safeSerializedLocal);
                    safeLocalStorageSetItem(`garmentMockups_${k}`, safeGarmentJson);
                    safeLocalStorageSetItem(`btp_garment_mockups_${k}`, safeGarmentJson);
                    safeLocalStorageSetItem(`mockups_${k}`, safeMockupsJson);
                    safeLocalStorageSetItem(`btp_mockups_locked_${k}`, 'true');
                }
                safeLocalStorageSetItem('btp_active_session_id', sessionId);
                if (slug) safeLocalStorageSetItem('btp_active_session_slug', slug);
                safeLocalStorageSetItem('btp_active_session_data', safeSerializedLocal);
                safeLocalStorageSetItem('btp_garment_mockups', safeGarmentJson);
                safeLocalStorageSetItem('garmentMockups', safeGarmentJson);
                safeLocalStorageSetItem('mockups', safeMockupsJson);
                safeLocalStorageSetItem('btp_mockups_locked', 'true');
                safeLocalStorageSetItem(`btp_garment_mockups_${sessionId}`, safeGarmentJson);
                if (slug) safeLocalStorageSetItem(`btp_garment_mockups_${slug}`, safeGarmentJson);

                if (storageSafeGarmentMockups.tshirt_front) {
                    safeLocalStorageSetItem('btp_mockup_tshirt_front', storageSafeGarmentMockups.tshirt_front);
                    safeLocalStorageSetItem(`btp_mockup_tshirt_front_${sessionId}`, storageSafeGarmentMockups.tshirt_front);
                    if (slug) safeLocalStorageSetItem(`btp_mockup_tshirt_front_${slug}`, storageSafeGarmentMockups.tshirt_front);
                }
                if (storageSafeGarmentMockups.tshirt_back) {
                    safeLocalStorageSetItem('btp_mockup_tshirt_back', storageSafeGarmentMockups.tshirt_back);
                    safeLocalStorageSetItem(`btp_mockup_tshirt_back_${sessionId}`, storageSafeGarmentMockups.tshirt_back);
                    if (slug) safeLocalStorageSetItem(`btp_mockup_tshirt_back_${slug}`, storageSafeGarmentMockups.tshirt_back);
                }
                if (storageSafeGarmentMockups.polo_front) {
                    safeLocalStorageSetItem('btp_mockup_polo_front', storageSafeGarmentMockups.polo_front);
                    safeLocalStorageSetItem(`btp_mockup_polo_front_${sessionId}`, storageSafeGarmentMockups.polo_front);
                    if (slug) safeLocalStorageSetItem(`btp_mockup_polo_front_${slug}`, storageSafeGarmentMockups.polo_front);
                }
                if (storageSafeGarmentMockups.polo_back) {
                    safeLocalStorageSetItem('btp_mockup_polo_back', storageSafeGarmentMockups.polo_back);
                    safeLocalStorageSetItem(`btp_mockup_polo_back_${sessionId}`, storageSafeGarmentMockups.polo_back);
                    if (slug) safeLocalStorageSetItem(`btp_mockup_polo_back_${slug}`, storageSafeGarmentMockups.polo_back);
                }
                if (storageSafeGarmentMockups.hoodie || storageSafeGarmentMockups.hoodie_front) {
                    const hVal = storageSafeGarmentMockups.hoodie || storageSafeGarmentMockups.hoodie_front!;
                    safeLocalStorageSetItem('btp_mockup_hoodie', hVal);
                    safeLocalStorageSetItem('btp_mockup_hoodie_front', hVal);
                    safeLocalStorageSetItem(`btp_mockup_hoodie_${sessionId}`, hVal);
                    safeLocalStorageSetItem(`btp_mockup_hoodie_front_${sessionId}`, hVal);
                    if (slug) {
                        safeLocalStorageSetItem(`btp_mockup_hoodie_${slug}`, hVal);
                        safeLocalStorageSetItem(`btp_mockup_hoodie_front_${slug}`, hVal);
                    }
                }
                if (storageSafeGarmentMockups.hoodie_back) {
                    safeLocalStorageSetItem('btp_mockup_hoodie_back', storageSafeGarmentMockups.hoodie_back);
                    safeLocalStorageSetItem(`btp_mockup_hoodie_back_${sessionId}`, storageSafeGarmentMockups.hoodie_back);
                    if (slug) safeLocalStorageSetItem(`btp_mockup_hoodie_back_${slug}`, storageSafeGarmentMockups.hoodie_back);
                }
                safeLocalStorageSetItem('btp_mockups_locked', 'true');
                safeLocalStorageSetItem(`btp_mockups_locked_${sessionId}`, 'true');
                if (slug) safeLocalStorageSetItem(`btp_mockups_locked_${slug}`, 'true');
            } catch (e) {
                console.warn("[Storage] handleDirectCloudSync localStorage error safely captured:", e);
            }
        }

        const previewData = {
            previewId: pId,
            companyName: userData.companyName || "",
            logoUrl: urlA || urlB || "",
            logoA: urlA || "",
            logoB: urlB || "",
            logoOriginalUrl: logoA.original || logoB.original || "",
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
            garmentMockups,
            tshirt_front: garmentMockups.tshirt_front,
            tshirt_back: garmentMockups.tshirt_back,
            polo_front: garmentMockups.polo_front,
            polo_back: garmentMockups.polo_back,
            hoodie: garmentMockups.hoodie,
            hoodie_front: garmentMockups.hoodie_front,
            hoodie_back: garmentMockups.hoodie_back,
            status: 'pending',
            userEmail: userData.email || null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        try {
            await setDoc(doc(db, 'anonymous_previews', pId), sanitizeForFirestore(previewData), { merge: true });
            if (slug && slug.length >= 2 && slug !== pId) {
                await setDoc(doc(db, 'anonymous_previews', slug), sanitizeForFirestore(previewData), { merge: true }).catch(() => null);
            }
            if (sessionId && sessionId !== slug && sessionId !== pId) {
                await setDoc(doc(db, 'anonymous_previews', sessionId), sanitizeForFirestore(previewData), { merge: true }).catch(() => null);
            }
        } catch (apErr: any) {
            console.warn("[Firestore] anonymous_previews write notice:", apErr?.message || apErr);
        }

        // Update btp_projects/${sessionId} and btp_projects/${slug} with root mockups array & dictionary
        const projectData = {
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
                    adapted: null,
                    remastered: null,
                    activeUrl: urlA,
                    mode: logoA.mode || 'original'
                },
                logoB: {
                    id: 'B' as const,
                    original: null,
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
            garmentMockups,
            tshirt_front: garmentMockups.tshirt_front,
            tshirt_back: garmentMockups.tshirt_back,
            polo_front: garmentMockups.polo_front,
            polo_back: garmentMockups.polo_back,
            hoodie: garmentMockups.hoodie,
            hoodie_front: garmentMockups.hoodie_front,
            hoodie_back: garmentMockups.hoodie_back,
            status: 'PENDING_PAYMENT',
            updatedAt: new Date().toISOString(),
            type: 'BTP_PROJECT_V24'
        };

        try {
            await setDoc(doc(db, 'btp_projects', sessionId), sanitizeForFirestore(projectData), { merge: true });
            if (slug && slug !== sessionId) {
                await setDoc(doc(db, 'btp_projects', slug), sanitizeForFirestore({ ...projectData, projectId: slug }), { merge: true }).catch(() => null);
            }

            try {
                const q = query(collection(db, 'btp_projects'), where('projectId', '==', sessionId));
                const snap = await getDocs(q);
                if (!snap.empty) {
                    for (const d of snap.docs) {
                        await setDoc(d.ref, sanitizeForFirestore(projectData), { merge: true }).catch(() => null);
                    }
                }
            } catch (qErr) { }

            // Subcollection mockups under btp_projects/${sessionId}/mockups/${m.id}
            // If security rules reject subcollection writes, catch silently and stop trying
            for (const m of uploadedMockups) {
                if (m.id) {
                    try {
                        const mDoc = sanitizeForFirestore({
                            ...m,
                            imageUrl: m.ai || m.mechanical || (m as any).imageUrl,
                            updatedAt: new Date().toISOString()
                        });
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
                garmentMockups,
                tshirt_front: garmentMockups.tshirt_front,
                tshirt_back: garmentMockups.tshirt_back,
                polo_front: garmentMockups.polo_front,
                polo_back: garmentMockups.polo_back,
                hoodie: garmentMockups.hoodie,
                hoodie_front: garmentMockups.hoodie_front,
                hoodie_back: garmentMockups.hoodie_back,
                logoUrl: existingLogoUrl || urlA || urlB || "",
                auditLogoUrl: urlA || urlB || "",
                logoA: urlA || "",
                logoB: urlB || "",
                logoAdaptedUrl: urlB || urlA || "",
                logoPlacements: Object.fromEntries(
                    Object.entries(logoPlacements || {}).map(([k, v]) => [k, v || 'A'])
                ),
                contactEmail: userData.email,
                whatsappNumber: userData.phone,
                activitySector: userData.activity,
                updatedAt: new Date().toISOString()
            });

            // Primary canonical document update
            await setDoc(doc(db, 'SiteConfigs', slug), sitePayload, { merge: true });

            // Synchronisation systématique du document prospect dans prospects et configs
            try {
                const prospectPayload = sanitizeForFirestore({
                    ...sitePayload,
                    name: userData.companyName || slug,
                    company: userData.companyName || slug,
                    email: userData.email || "",
                    phone: userData.phone || "",
                    activitySector: userData.activity || "",
                    products: universalProductsArray,
                    mockups: mockupsDictionary,
                    mockupsList: uploadedMockups,
                    items: universalProductsArray,
                    logoUrl: existingLogoUrl || urlA || urlB || "",
                    updatedAt: new Date().toISOString()
                });
                await setDoc(doc(db, 'prospects', slug), prospectPayload, { merge: true }).catch(() => null);
                await setDoc(doc(db, 'audits', slug), prospectPayload, { merge: true }).catch(() => null);
                await setDoc(doc(db, 'vault', slug), prospectPayload, { merge: true }).catch(() => null);
                await setDoc(doc(db, 'configs', slug), prospectPayload, { merge: true }).catch(() => null);
                if (sessionId && sessionId !== slug) {
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
                if (m.id) {
                    try {
                        await setDoc(doc(db, 'SiteConfigs', slug, 'mockups', m.id), sanitizeForFirestore({
                            ...m,
                            imageUrl: m.ai || m.mechanical || (m as any).imageUrl,
                            updatedAt: new Date().toISOString()
                        }), { merge: true });
                    } catch (e) {
                        // Subcollection write permission error: catch silently and break
                        break;
                    }
                }
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
                    await setDoc(doc(db, 'anonymous_previews', slug), sanitizeForFirestore(previewData), { merge: true });
                } catch (e) { }
            }

            if (sessionId === 'audit-8f198p5' || sessionId === 'fabrizio' || sessionId === 'djdfazz') {
                await setDoc(doc(db, 'SiteConfigs', 'guest_ms3ijgnco2xnid'), sitePayload, { merge: true }).catch(() => null);
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
