import { db } from '../firebaseConfig';
import { collection, getDocs, doc, getDoc, setDoc, deleteDoc, query } from 'firebase/firestore';
import { sanitizeForFirestore } from '../utils/firestoreSanitizer';
import { AUDIT_PORTAIL_CONFIG, AuditProductEntry } from '../config/audit-portail';

const STORAGE_KEY = 'signaid_audit_custom_products';
const LEGACY_STORAGE_KEYS = ['audit_custom_catalog_products', 'audit_custom_products'];
const FIRESTORE_COLLECTIONS = ['custom_audit_products', 'audit_custom_products', 'audit_catalog'];
const FIRESTORE_CONFIG_DOC = 'audit_custom_catalog';

export interface DynamicMockupItem {
    id: string;
    title: string;
    base: string;
    ai: string | null;
    aiRemastered: string | null;
    isGenerating: boolean;
    view: 'front' | 'back';
    garment: 'tshirt' | 'polo' | 'sweat' | 'tank_top' | 'tshirt_oversize' | 'business_card';
    mechanical: string | null;
    model: string;
    selected: boolean;
    productId?: string;
    costPriceHt?: number;
    retailPriceTtc?: number;
}

/**
 * Assainit et sécurise une entrée produit de l'Audit Portail :
 * - Garantit les chemins absolus avec '/' initial pour les assets locaux.
 * - Supprime les URLs 'blob:' temporaires qui expirent au rechargement.
 * - Restaure impérativement les chemins valides pour NX7200-WHT (tshirt-white-NX7200.png et -dos.png).
 * - Détecte et corrige les inversions Face/Dos.
 */
export const sanitizeAuditProductEntry = (product: AuditProductEntry): AuditProductEntry => {
    if (!product) return product;

    const isWhiteNx7200 = product.sku === 'NX7200-WHT' || product.id === 'visionroom-heavyweight-tee-white';

    const sanitizePath = (p: string | undefined, fallback: string = ''): string => {
        if (!p || typeof p !== 'string') return fallback;
        const clean = p.trim();
        // Si c'est un blob URL temporaire, il expire au rechargement : on utilise le fallback
        if (!clean || clean.startsWith('blob:')) return fallback;
        // Data URL ou URL absolue
        if (clean.startsWith('data:') || clean.startsWith('http://') || clean.startsWith('https://')) return clean;
        // Chemin relatif : s'assurer du '/' initial
        return clean.startsWith('/') ? clean : '/' + clean;
    };

    let front = sanitizePath(product.mockups?.front || product.frontImageUrl);
    let back = sanitizePath(product.mockups?.back || product.backImageUrl);
    let preview = sanitizePath(product.mockups?.preview);

    if (isWhiteNx7200) {
        // DONNÉES CIBLES À RESTAURER POUR NX7200-WHT :
        // - Vue Face (front) : "/assets/tshirt-white-NX7200.png"
        // - Vue Dos (back) : "/assets/tshirt-white-NX7200-dos.png"
        // - Preview catalogue : "/assets/tshirt-white-NX7200.png"
        front = '/assets/tshirt-white-NX7200.png';
        back = '/assets/tshirt-white-NX7200-dos.png';
        preview = '/assets/tshirt-white-NX7200.png';
    } else {
        // Détection et correction automatique d'inversion Face / Dos si le formulaire avait permuté les deux slots
        const isBack = (s: string) => /[-_](dos|back)\b|\bback\b/i.test(s);
        const isFront = (s: string) => /[-_](face|front)\b|\bfront\b/i.test(s);

        if (isBack(front) && (isFront(back) || !isBack(back))) {
            const tmp = front;
            front = back;
            back = tmp;
        }

        if (!preview) {
            preview = front;
        }
    }

    return {
        ...product,
        mockups: {
            ...product.mockups,
            front,
            back,
            preview
        },
        frontImageUrl: front,
        backImageUrl: back
    };
};

/**
 * Récupère les produits personnalisés depuis le cache LocalStorage avec assainissement automatique
 */
export const getLocalCustomProducts = (): AuditProductEntry[] => {
    try {
        if (typeof window === 'undefined') return [];

        let raw = localStorage.getItem(STORAGE_KEY);

        // Fallback sur d'éventuelles clés de stockage legacy
        if (!raw) {
            for (const legKey of LEGACY_STORAGE_KEYS) {
                const legVal = localStorage.getItem(legKey);
                if (legVal) {
                    raw = legVal;
                    break;
                }
            }
        }

        if (!raw) return [];

        const parsed: AuditProductEntry[] = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];

        let needsResave = false;
        const sanitizedList = parsed.map(item => {
            const sanitized = sanitizeAuditProductEntry(item);
            if (
                sanitized.mockups?.front !== item.mockups?.front ||
                sanitized.mockups?.back !== item.mockups?.back ||
                sanitized.mockups?.preview !== item.mockups?.preview ||
                sanitized.frontImageUrl !== item.frontImageUrl ||
                sanitized.backImageUrl !== item.backImageUrl
            ) {
                needsResave = true;
            }
            return sanitized;
        });

        // Si des chemins corrompus ou invalides ont été réparés, resauvegarder immédiatement
        if (needsResave) {
            saveLocalCustomProducts(sanitizedList);
        }

        return sanitizedList;
    } catch (e) {
        return [];
    }
};

/**
 * Sauvegarde les produits personnalisés dans le LocalStorage
 */
export const saveLocalCustomProducts = (products: AuditProductEntry[]) => {
    try {
        if (typeof window === 'undefined') return;
        const sanitized = (products || []).map(sanitizeAuditProductEntry);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
        // Nettoyer les clés legacy pour éviter les conflits
        for (const legKey of LEGACY_STORAGE_KEYS) {
            localStorage.removeItem(legKey);
        }
    } catch (e) {
        // silent
    }
};

/**
 * Récupère les produits personnalisés depuis Firestore avec fallback LocalStorage et catalogue statique
 */
export const fetchCustomAuditProducts = async (): Promise<AuditProductEntry[]> => {
    const local = getLocalCustomProducts();
    try {
        if (!db) return local;

        // 1. Essai prioritaire via le document configs/audit_custom_catalog
        try {
            const configRef = doc(db, 'configs', FIRESTORE_CONFIG_DOC);
            const configSnap = await getDoc(configRef);
            if (configSnap.exists()) {
                const data = configSnap.data();
                if (data && Array.isArray(data.products) && data.products.length > 0) {
                    const sanitized = data.products.map(sanitizeAuditProductEntry);
                    saveLocalCustomProducts(sanitized);
                    return sanitized;
                }
            }
        } catch (err) {
            // Ignorer si les règles Firestore restreignent l'accès
        }

        // 2. Essai via les collections dédiées (custom_audit_products, audit_custom_products, audit_catalog)
        for (const colName of FIRESTORE_COLLECTIONS) {
            try {
                const q = query(collection(db, colName));
                const snap = await getDocs(q);
                const remoteProducts: AuditProductEntry[] = [];
                snap.forEach((d) => {
                    const data = d.data() as AuditProductEntry;
                    remoteProducts.push(sanitizeAuditProductEntry({ ...data, id: data.id || d.id }));
                });

                if (remoteProducts.length > 0) {
                    saveLocalCustomProducts(remoteProducts);
                    return remoteProducts;
                }
            } catch (err) {
                // Silencieusement ignorer les erreurs de permissions (permission-denied)
            }
        }
    } catch (e) {
        // Fallback transparent vers le cache local
    }
    return local;
};

/**
 * Récupère l'intégralité du catalogue d'audit (produits de base + produits personnalisés)
 */
export const getMergedAuditCatalog = async (): Promise<AuditProductEntry[]> => {
    const custom = await fetchCustomAuditProducts();
    const baseCatalog = AUDIT_PORTAIL_CONFIG.catalog.map(sanitizeAuditProductEntry);

    // Fusion sans doublons d'ID ou de SKU
    const existingIds = new Set(baseCatalog.map(p => p.id));
    const existingSkus = new Set(baseCatalog.map(p => p.sku));
    const merged = [...baseCatalog];

    for (const rawC of custom) {
        const c = sanitizeAuditProductEntry(rawC);

        // Si c'est NX7200-WHT, on s'assure qu'il utilise impérativement les chemins cibles
        if (c.sku === 'NX7200-WHT' || c.id === 'visionroom-heavyweight-tee-white') {
            const idx = merged.findIndex(p => p.sku === 'NX7200-WHT' || p.id === 'visionroom-heavyweight-tee-white');
            if (idx !== -1) {
                merged[idx] = {
                    ...merged[idx],
                    ...c,
                    id: 'visionroom-heavyweight-tee-white',
                    sku: 'NX7200-WHT',
                    mockups: {
                        front: '/assets/tshirt-white-NX7200.png',
                        back: '/assets/tshirt-white-NX7200-dos.png',
                        preview: '/assets/tshirt-white-NX7200.png'
                    },
                    frontImageUrl: '/assets/tshirt-white-NX7200.png',
                    backImageUrl: '/assets/tshirt-white-NX7200-dos.png'
                };
            }
            continue;
        }

        if (existingIds.has(c.id)) {
            const idx = merged.findIndex(p => p.id === c.id);
            if (idx !== -1) merged[idx] = c;
        } else if (existingSkus.has(c.sku)) {
            const idx = merged.findIndex(p => p.sku === c.sku);
            if (idx !== -1) merged[idx] = c;
        } else {
            merged.push(c);
            existingIds.add(c.id);
            existingSkus.add(c.sku);
        }
    }

    return merged;
};

/**
 * Enregistre ou met à jour un produit dans l'Audit Portail (Firestore + LocalStorage)
 */
export const saveProductToAuditPortal = async (product: AuditProductEntry): Promise<void> => {
    const sanitizedProduct = sanitizeAuditProductEntry(product);

    if (!sanitizedProduct.id) {
        sanitizedProduct.id = `prod_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    }

    // Mise à jour locale immédiate
    const local = getLocalCustomProducts();
    const existingIdx = local.findIndex(p => p.id === sanitizedProduct.id || (sanitizedProduct.sku && p.sku === sanitizedProduct.sku));
    if (existingIdx >= 0) {
        local[existingIdx] = sanitizedProduct;
    } else {
        local.push(sanitizedProduct);
    }
    saveLocalCustomProducts(local);

    // Mise à jour Firestore (Configs + Collections dédiées)
    try {
        if (db) {
            // 1. Sauvegarde globale dans configs/audit_custom_catalog
            try {
                const configRef = doc(db, 'configs', FIRESTORE_CONFIG_DOC);
                await setDoc(configRef, sanitizeForFirestore({
                    products: local,
                    updatedAt: new Date().toISOString()
                }), { merge: true });
            } catch (err) {}

            // 2. Sauvegarde individuelle dans les collections autorisées
            for (const colName of ['custom_audit_products', 'audit_custom_products']) {
                try {
                    const docRef = doc(db, colName, sanitizedProduct.id);
                    await setDoc(docRef, sanitizeForFirestore({
                        ...sanitizedProduct,
                        updatedAt: new Date().toISOString()
                    }), { merge: true });
                } catch (err) {}
            }
        }
    } catch (e) {
        // silent
    }
};

/**
 * Supprime un produit du catalogue personnalisé
 */
export const deleteProductFromAuditPortal = async (productId: string): Promise<void> => {
    const local = getLocalCustomProducts().filter(p => p.id !== productId);
    saveLocalCustomProducts(local);

    try {
        if (db) {
            try {
                const configRef = doc(db, 'configs', FIRESTORE_CONFIG_DOC);
                await setDoc(configRef, sanitizeForFirestore({
                    products: local,
                    updatedAt: new Date().toISOString()
                }), { merge: true });
            } catch (err) {}

            for (const colName of ['custom_audit_products', 'audit_custom_products']) {
                try {
                    const docRef = doc(db, colName, productId);
                    await deleteDoc(docRef);
                } catch (err) {}
            }
        }
    } catch (e) {
        // silent
    }
};

/**
 * Convertit un AuditProductEntry en paires de MockupItems (Face & Dos) pour la grille de l'Audit
 */
export const convertProductToMockupItems = (product: AuditProductEntry): DynamicMockupItem[] => {
    const cleanProduct = sanitizeAuditProductEntry(product);
    const items: DynamicMockupItem[] = [];
    const cleanId = cleanProduct.id.replace(/[^a-zA-Z0-9_-]/g, '');

    // 1. Vue FACE
    if (cleanProduct.mockups?.front) {
        items.push({
            id: `${cleanId}Front`,
            title: `${cleanProduct.title || cleanProduct.model} FACE`,
            base: cleanProduct.mockups.front,
            ai: null,
            aiRemastered: null,
            isGenerating: false,
            view: 'front',
            garment: cleanProduct.garmentType || 'tshirt',
            mechanical: null,
            model: cleanProduct.mockups.front,
            selected: true,
            productId: cleanProduct.id,
            costPriceHt: cleanProduct.pricing?.costPriceHt,
            retailPriceTtc: cleanProduct.pricing?.retailPriceTtc
        });
    }

    // 2. Vue DOS
    if (cleanProduct.mockups?.back) {
        items.push({
            id: `${cleanId}Back`,
            title: `${cleanProduct.title || cleanProduct.model} DOS`,
            base: cleanProduct.mockups.back,
            ai: null,
            aiRemastered: null,
            isGenerating: false,
            view: 'back',
            garment: cleanProduct.garmentType || 'tshirt',
            mechanical: null,
            model: cleanProduct.mockups.back,
            selected: true,
            productId: cleanProduct.id,
            costPriceHt: cleanProduct.pricing?.costPriceHt,
            retailPriceTtc: cleanProduct.pricing?.retailPriceTtc
        });
    }

    return items;
};

/**
 * Génère le code JSON prêt à copier/coller dans src/config/audit-portail.ts
 */
export const formatCatalogAsTsCode = (catalog: AuditProductEntry[]): string => {
    return JSON.stringify(catalog, null, 2);
};
