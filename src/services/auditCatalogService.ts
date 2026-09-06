import { db } from '../firebaseConfig';
import { collection, getDocs, doc, getDoc, setDoc, deleteDoc, query } from 'firebase/firestore';
import { sanitizeForFirestore } from '../utils/firestoreSanitizer';
import { AUDIT_PORTAIL_CONFIG, AuditProductEntry } from '../config/audit-portail';

const STORAGE_KEY = 'signaid_audit_custom_products';
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
 * Récupère les produits personnalisés depuis le cache LocalStorage
 */
export const getLocalCustomProducts = (): AuditProductEntry[] => {
    try {
        if (typeof window === 'undefined') return [];
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        return JSON.parse(raw);
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
        localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
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
                    saveLocalCustomProducts(data.products);
                    return data.products;
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
                    remoteProducts.push({ ...data, id: data.id || d.id });
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
    const baseCatalog = AUDIT_PORTAIL_CONFIG.catalog;

    // Fusion sans doublons d'ID
    const existingIds = new Set(baseCatalog.map(p => p.id));
    const merged = [...baseCatalog];

    for (const c of custom) {
        if (existingIds.has(c.id)) {
            const idx = merged.findIndex(p => p.id === c.id);
            if (idx !== -1) merged[idx] = c;
        } else {
            merged.push(c);
            existingIds.add(c.id);
        }
    }

    return merged;
};

/**
 * Enregistre ou met à jour un produit dans l'Audit Portail (Firestore + LocalStorage)
 */
export const saveProductToAuditPortal = async (product: AuditProductEntry): Promise<void> => {
    if (!product.id) {
        product.id = `prod_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    }

    // Mise à jour locale immédiate
    const local = getLocalCustomProducts();
    const existingIdx = local.findIndex(p => p.id === product.id);
    if (existingIdx >= 0) {
        local[existingIdx] = product;
    } else {
        local.push(product);
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
                    const docRef = doc(db, colName, product.id);
                    await setDoc(docRef, sanitizeForFirestore({
                        ...product,
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
    const items: DynamicMockupItem[] = [];
    const cleanId = product.id.replace(/[^a-zA-Z0-9_-]/g, '');

    // 1. Vue FACE
    if (product.mockups?.front) {
        items.push({
            id: `${cleanId}Front`,
            title: `${product.title || product.model} FACE`,
            base: product.mockups.front,
            ai: null,
            aiRemastered: null,
            isGenerating: false,
            view: 'front',
            garment: product.garmentType || 'tshirt',
            mechanical: null,
            model: product.mockups.front,
            selected: true,
            productId: product.id,
            costPriceHt: product.pricing?.costPriceHt,
            retailPriceTtc: product.pricing?.retailPriceTtc
        });
    }

    // 2. Vue DOS
    if (product.mockups?.back) {
        items.push({
            id: `${cleanId}Back`,
            title: `${product.title || product.model} DOS`,
            base: product.mockups.back,
            ai: null,
            aiRemastered: null,
            isGenerating: false,
            view: 'back',
            garment: product.garmentType || 'tshirt',
            mechanical: null,
            model: product.mockups.back,
            selected: true,
            productId: product.id,
            costPriceHt: product.pricing?.costPriceHt,
            retailPriceTtc: product.pricing?.retailPriceTtc
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
