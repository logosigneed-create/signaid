import { db } from '../firebaseConfig';
import { collection, getDocs, doc, getDoc, setDoc, deleteDoc, query } from 'firebase/firestore';
import { sanitizeForFirestore } from '../utils/firestoreSanitizer';
import { AUDIT_PORTAIL_CONFIG, AuditProductEntry } from '../config/audit-portail';
import { safeLocalStorageSetItem, safeLocalStorageRemoveItem } from './auditPersistenceService';

const STORAGE_KEY = 'signaid_audit_custom_products';
const LEGACY_STORAGE_KEYS = ['audit_custom_catalog_products', 'audit_custom_products'];
const FIRESTORE_COLLECTIONS = ['custom_audit_products', 'audit_custom_products', 'audit_catalog'];
const FIRESTORE_CONFIG_DOC = 'audit_custom_catalog';

export interface DynamicMockupItem {
    id: string;
    title: string;
    label?: string;
    base: string;
    baseMockupUrl?: string;
    ai: string | null;
    aiRemastered: string | null;
    isGenerating: boolean;
    view: 'front' | 'back';
    garment: 'tshirt' | 'polo' | 'sweat' | 'hoodie' | 'tank_top' | 'tshirt_oversize' | 'business_card';
    garmentType?: string;
    color?: string;
    mechanical: string | null;
    model: string;
    selected: boolean;
    productId?: string;
    sku?: string;
    costPriceHt?: number;
    retailPriceTtc?: number;
    pricing?: any;
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

    let front = sanitizePath(product.mockups?.front || product.frontImageUrl || product.imageUrl);
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
        safeLocalStorageSetItem(STORAGE_KEY, JSON.stringify(sanitized));
        // Nettoyer les clés legacy pour éviter les conflits
        for (const legKey of LEGACY_STORAGE_KEYS) {
            safeLocalStorageRemoveItem(legKey);
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
    const existingIds = new Set(baseCatalog.map(p => (p.id || '').toLowerCase()));
    const existingSkus = new Set(baseCatalog.map(p => (p.sku || '').toLowerCase()));
    const merged = [...baseCatalog];

    for (const rawC of custom) {
        const c = sanitizeAuditProductEntry(rawC);
        const cId = (c.id || '').toLowerCase();
        const cSku = (c.sku || '').toLowerCase();

        // Si c'est NX7200-WHT, on s'assure qu'il utilise impérativement les chemins cibles
        if (cSku === 'nx7200-wht' || cId === 'visionroom-heavyweight-tee-white') {
            const idx = merged.findIndex(p => (p.sku || '').toLowerCase() === 'nx7200-wht' || (p.id || '').toLowerCase() === 'visionroom-heavyweight-tee-white');
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

        // Si c'est BYBB011-WHT, on s'assure qu'il utilise impérativement les chemins cibles et l'id unique visionroom-basic-tank-white
        if (cSku === 'bybb011-wht' || cId === 'visionroom-basic-tank-white') {
            const idx = merged.findIndex(p => (p.sku || '').toLowerCase() === 'bybb011-wht' || (p.id || '').toLowerCase() === 'visionroom-basic-tank-white');
            if (idx !== -1) {
                merged[idx] = {
                    ...merged[idx],
                    ...c,
                    id: 'visionroom-basic-tank-white',
                    sku: 'BYBB011-WHT',
                    mockups: {
                        front: '/assets/tank-white-BYBB011.png',
                        back: '/assets/tank-white-BYBB011-dos.png',
                        preview: '/assets/tank-white-BYBB011.png'
                    },
                    frontImageUrl: '/assets/tank-white-BYBB011.png',
                    backImageUrl: '/assets/tank-white-BYBB011-dos.png'
                };
            }
            continue;
        }

        if (cId && existingIds.has(cId)) {
            const idx = merged.findIndex(p => (p.id || '').toLowerCase() === cId);
            if (idx !== -1) merged[idx] = c;
        } else if (cSku && existingSkus.has(cSku)) {
            const idx = merged.findIndex(p => (p.sku || '').toLowerCase() === cSku);
            if (idx !== -1) merged[idx] = c;
        } else {
            merged.push(c);
            if (cId) existingIds.add(cId);
            if (cSku) existingSkus.add(cSku);
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
    const sku = cleanProduct.sku || cleanProduct.supplierRef || cleanProduct.id;
    const cleanSku = sku.replace(/[^a-zA-Z0-9_-]/g, '');

    const frontUrl = cleanProduct.mockups?.front || cleanProduct.frontImageUrl || cleanProduct.imageUrl;
    const backUrl = cleanProduct.mockups?.back || cleanProduct.backImageUrl || cleanProduct.imageUrl;
    const garmentType = cleanProduct.garmentType || 'tshirt';
    const colorHex = cleanProduct.colors?.[0]?.hex || '#000000';

    const gType = garmentType as string;

    const isSweat = gType === 'sweat' || gType === 'hoodie' || gType === 'sweatshirt' ||
        cleanSku.toLowerCase().includes('hoodie') || cleanSku.toLowerCase().includes('sweat') || cleanSku.toLowerCase().includes('jhk421');
    const isPolo = gType === 'polo' || cleanSku.toLowerCase().includes('polo') || cleanSku.toLowerCase().includes('jhk510');
    const isTank = gType === 'tank_top' || cleanSku.toLowerCase().includes('tank') || cleanSku.toLowerCase().includes('bybb011');

    // 1. Vue FACE
    if (frontUrl) {
        const mannequinFront = isSweat
            ? '/assets/models/male_hoodie_front.png'
            : (isPolo ? '/assets/models/male_polo_front.png' : (isTank ? '/assets/models/male_tank_front.png' : '/assets/models/male_tshirt_front.png'));

        items.push({
            id: `${cleanSku}_front`,
            sku: cleanProduct.sku || cleanSku,
            productId: cleanProduct.id,
            title: `${cleanProduct.title || cleanProduct.model} (Face)`,
            label: `${cleanProduct.title || cleanProduct.model} (Face)`,
            base: frontUrl,
            baseMockupUrl: frontUrl,
            ai: null,
            aiRemastered: null,
            isGenerating: false,
            view: 'front',
            garment: isSweat ? 'sweat' : garmentType,
            garmentType: isSweat ? 'sweat' : garmentType,
            color: colorHex,
            mechanical: null,
            model: mannequinFront,
            selected: true,
            costPriceHt: cleanProduct.pricing?.costPriceHt,
            retailPriceTtc: cleanProduct.pricing?.retailPriceTtc,
            pricing: cleanProduct.pricing
        });
    }

    // 2. Vue DOS
    if (backUrl) {
        const mannequinBack = isSweat
            ? '/assets/models/male_hoodie_back.png'
            : (isPolo ? '/assets/models/male_polo_back.png' : (isTank ? '/assets/models/male_tank_back.png' : '/assets/models/male_tshirt_back.png'));

        items.push({
            id: `${cleanSku}_back`,
            sku: cleanProduct.sku || cleanSku,
            productId: cleanProduct.id,
            title: `${cleanProduct.title || cleanProduct.model} (Dos)`,
            label: `${cleanProduct.title || cleanProduct.model} (Dos)`,
            base: backUrl,
            baseMockupUrl: backUrl,
            ai: null,
            aiRemastered: null,
            isGenerating: false,
            view: 'back',
            garment: isSweat ? 'sweat' : garmentType,
            garmentType: isSweat ? 'sweat' : garmentType,
            color: colorHex,
            mechanical: null,
            model: mannequinBack,
            selected: true,
            costPriceHt: cleanProduct.pricing?.costPriceHt,
            retailPriceTtc: cleanProduct.pricing?.retailPriceTtc,
            pricing: cleanProduct.pricing
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

export interface ColorPreset {
    name: string;
    hex: string;
    skuSuffix: string;
    label: string;
}

export const STANDARD_COLOR_PRESETS: ColorPreset[] = [
    { name: 'Blanc', hex: '#ffffff', skuSuffix: 'WHT', label: 'Blanc Pur' },
    { name: 'Noir', hex: '#000000', skuSuffix: 'BLK', label: 'Noir Intense' },
    { name: 'Gris Chiné', hex: '#9ca3af', skuSuffix: 'GRY', label: 'Gris Chiné' },
    { name: 'Bleu Marine', hex: '#1e3a8a', skuSuffix: 'NVY', label: 'Bleu Marine (Navy)' },
    { name: 'Rouge', hex: '#dc2626', skuSuffix: 'RED', label: 'Rouge Passion' },
    { name: 'Vert Bouteille', hex: '#14532d', skuSuffix: 'GRN', label: 'Vert Bouteille' },
    { name: 'Jaune', hex: '#eab308', skuSuffix: 'YLW', label: 'Jaune Or' },
    { name: 'Bordeaux', hex: '#831843', skuSuffix: 'BRD', label: 'Bordeaux / Burgundy' },
];

/**
 * Recherche dans la photothèque interne si des mockups standard existent pour ce modèle et cette couleur
 */
export const getKnownMockupsForProductColor = (
    product: AuditProductEntry,
    colorName: string
): { front: string; back: string } | null => {
    if (!product || !colorName) return null;
    const c = colorName.toLowerCase().trim();
    const sku = (product.sku || '').toUpperCase();
    const gType = product.garmentType || '';
    const id = (product.id || '').toLowerCase();

    // 1. BLANC / WHITE
    if (c.includes('blanc') || c.includes('white')) {
        if (sku.includes('JHK170') || id.includes('jhk170') || gType === 'tshirt') {
            return {
                front: '/assets/tshirt-white-JHK170.png',
                back: '/assets/tshirt-white-JHK170-dos.png'
            };
        }
        if (sku.includes('JHK510') || id.includes('jhk510') || gType === 'polo') {
            return {
                front: '/assets/polo-white-JHK510.png',
                back: '/assets/polo-white-JHK510-dos.png'
            };
        }
        if (sku.includes('JHK421') || id.includes('jhk421') || gType === 'sweat' || gType === 'hoodie') {
            return {
                front: '/assets/hoodie-white-JHK421.png',
                back: '/assets/hoodie-white-JHK421-dos.png'
            };
        }
        if (sku.includes('BYBB011') || id.includes('tank') || gType === 'tank_top') {
            return {
                front: '/assets/tank-white-BYBB011.png',
                back: '/assets/tank-white-BYBB011-dos.png'
            };
        }
        if (sku.includes('NX7200') || id.includes('heavyweight') || gType === 'tshirt_oversize') {
            return {
                front: '/assets/tshirt-white-NX7200.png',
                back: '/assets/tshirt-white-NX7200-dos.png'
            };
        }
    }

    // 2. GRIS / GREY
    if (c.includes('gris') || c.includes('grey') || c.includes('ash') || c.includes('chiné')) {
        if (sku.includes('JHK170') || id.includes('jhk170') || gType === 'tshirt') {
            return {
                front: '/assets/tshirt-grey-JHK170.png',
                back: '/assets/tshirt-grey-JHK170-dos.png'
            };
        }
        if (sku.includes('JHK421') || id.includes('jhk421') || gType === 'sweat' || gType === 'hoodie') {
            return {
                front: '/assets/hoodie-grey-JHK421.png',
                back: '/assets/hoodie-grey-JHK421-dos.png'
            };
        }
    }

    // 3. NOIR / BLACK
    if (c.includes('noir') || c.includes('black')) {
        if (sku.includes('JHK170') || id.includes('jhk170') || gType === 'tshirt') {
            return {
                front: '/assets/tshirt-black-JHK170.png',
                back: '/assets/tshirt-black-JHK170-dos.png'
            };
        }
        if (sku.includes('JHK510') || id.includes('jhk510') || gType === 'polo') {
            return {
                front: '/assets/polo-black-JHK510.png',
                back: '/assets/polo-black-JHK510-dos.png'
            };
        }
        if (sku.includes('JHK421') || id.includes('jhk421') || gType === 'sweat' || gType === 'hoodie') {
            return {
                front: '/assets/hoodie-black-JHK421.png',
                back: '/assets/hoodie-black-JHK421-dos.png'
            };
        }
        if (sku.includes('BYBB011') || id.includes('tank') || gType === 'tank_top') {
            return {
                front: '/merch/visionroom/tank-front.png',
                back: '/merch/visionroom/tank-back.png'
            };
        }
        if (sku.includes('NX7200') || id.includes('heavyweight') || gType === 'tshirt_oversize') {
            return {
                front: '/merch/visionroom/oversize-front.png',
                back: '/merch/visionroom/oversize-back.png'
            };
        }
    }

    return null;
};

/**
 * Crée une variante de couleur complète à partir d'un produit source :
 * - Reprend l'intégralité des caractéristiques techniques (marque, composition, grammage, coupe, prix, fournisseur, etc.).
 * - Génère un nouvel ID unique et pérenne.
 * - Calcule un SKU adapté (ex: JHK170-BLK -> JHK170-WHT).
 * - Adapte le titre commercial (ex: remplace "Noir" par "Blanc" ou ajoute "Blanc").
 * - Met à jour le tableau des couleurs du produit.
 * - Tente de pré-remplir avec les mockups de la bibliothèque standard ou laisse vide pour upload.
 */
export const createColorVariantFromProduct = (
    sourceProduct: AuditProductEntry,
    targetColor: { name: string; hex: string; skuSuffix?: string }
): AuditProductEntry => {
    const colorName = targetColor.name.trim();
    const colorHex = targetColor.hex.trim();
    const colorSlug = colorName.toLowerCase().replace(/[^a-z0-9]/g, '');

    // 1. Calcul du SKU
    let suffix = (targetColor.skuSuffix || colorName.substring(0, 3)).toUpperCase().replace(/[^A-Z0-9]/g, '');
    let newSku = sourceProduct.sku || 'PROD';
    if (newSku.includes('-')) {
        const parts = newSku.split('-');
        parts[parts.length - 1] = suffix;
        newSku = parts.join('-');
    } else {
        newSku = `${newSku}-${suffix}`;
    }

    // 2. Calcul de l'ID unique
    const cleanSourceId = sourceProduct.id.replace(/-(white|blanc|black|noir|grey|gris|wht|blk|gry)$/i, '');
    const newId = `${cleanSourceId}-${colorSlug}`;

    // 3. Calcul du titre commercial
    let newTitle = sourceProduct.title || sourceProduct.model || 'Produit';
    const colorPatterns = [
        { regex: /\bNoir\b/i, replacement: colorName },
        { regex: /\bBlack\b/i, replacement: colorName },
        { regex: /\bBlanc\b/i, replacement: colorName },
        { regex: /\bWhite\b/i, replacement: colorName },
        { regex: /\bGris\b/i, replacement: colorName },
        { regex: /\bGrey\b/i, replacement: colorName },
    ];
    let replaced = false;
    for (const p of colorPatterns) {
        if (p.regex.test(newTitle)) {
            newTitle = newTitle.replace(p.regex, colorName);
            replaced = true;
            break;
        }
    }
    if (!replaced) {
        newTitle = `${newTitle} ${colorName}`;
    }

    // 4. Recherche de mockups connus dans la photothèque locale
    const knownMockups = getKnownMockupsForProductColor(sourceProduct, colorName);
    const frontUrl = knownMockups ? knownMockups.front : '';
    const backUrl = knownMockups ? knownMockups.back : '';

    return sanitizeAuditProductEntry({
        ...sourceProduct,
        id: newId,
        sku: newSku,
        title: newTitle,
        colors: [
            { name: colorName, hex: colorHex, isPrimary: true },
            ...(sourceProduct.colors || []).filter(c => c.name.toLowerCase() !== colorName.toLowerCase()).map(c => ({ ...c, isPrimary: false }))
        ],
        mockups: {
            front: frontUrl,
            back: backUrl,
            preview: frontUrl
        },
        frontImageUrl: frontUrl,
        backImageUrl: backUrl,
        status: 'active'
    });
};

/**
 * Détermine si un mockup correspond à une entrée du catalogue de produits
 */
export const isMockupMatchingProduct = (mockup: any, product: AuditProductEntry): boolean => {
    if (!mockup || !product) return false;
    if (mockup.productId && mockup.productId === product.id) return true;
    if (mockup.sku && product.sku && mockup.sku.toLowerCase() === product.sku.toLowerCase()) return true;

    const mId = (mockup.id || '').toLowerCase();
    const pId = (product.id || '').toLowerCase();
    const pSku = (product.sku || '').toLowerCase();
    const cleanPId = (product.id || '').replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase();

    if (mId === `${cleanPId}front` || mId === `${cleanPId}back` || mId === `${cleanPId}_front` || mId === `${cleanPId}_back`) return true;
    if (pSku && (mId === `${pSku}_front` || mId === `${pSku}_back` || mId === `${pSku}front` || mId === `${pSku}back`)) return true;
    if (pId && (mId === `${pId}_front` || mId === `${pId}_back` || mId === `${pId}front` || mId === `${pId}back`)) return true;

    // Débardeur BYBB011
    if (pId.includes('visionroom-basic-tank') || pSku.includes('bybb011')) {
        const isWhite = pSku.includes('wht') || pId.includes('white') || pId.includes('blanc');
        if (isWhite) {
            return mId === 'tankwhitefront' || mId === 'tankwhiteback' || mId.includes('bybb011_wht') || mId.includes('bybb011wht');
        }
        return mId === 'tankfront' || mId === 'tankback' || mId.includes('bybb011_blk') || mId.includes('bybb011blk');
    }

    // Heavyweight Oversize NX7200
    if (pId === 'visionroom-heavyweight-tee-white' || pSku === 'nx7200-wht') {
        return mId === 'heavywhitefront' || mId === 'heavywhiteback' || mId.includes('nx7200wht') || mId.includes('nx7200_wht');
    }
    if (pId === 'visionroom-heavyweight-tee' || pSku === 'nx7200-blk' || pSku === 'nx7200') {
        return mId === 'heavyfront' || mId === 'heavyback' || mId.includes('nx7200blk') || mId.includes('nx7200_blk');
    }

    // T-Shirt JHK170
    if (pId === 'jhk170-classic-tshirt-white' || pSku === 'jhk170-wht') {
        return mId.includes('jhk170wht') || mId.includes('jhk170_wht') || mId === 'twhitefront' || mId === 'twhiteback' || mId === 'tshirtwhitefront' || mId === 'tshirtwhiteback' || mId === 'tshirt_white_front' || mId === 'tshirt_white_back';
    }
    if (pId === 'jhk170-classic-tshirt' || pSku === 'jhk170-blk' || (pSku.includes('jhk170') && !pSku.includes('wht') && !pSku.includes('gry'))) {
        return mId === 'tfront' || mId === 'tback';
    }

    // Polo JHK510
    if (pId === 'jhk510-polo-premium-white' || pSku === 'jhk510-wht') {
        return mId.includes('jhk510wht') || mId.includes('jhk510_wht') || mId === 'pwhitefront' || mId === 'pwhiteback' || mId === 'polowhitefront' || mId === 'polowhiteback' || mId === 'polo_white_front' || mId === 'polo_white_back';
    }
    if (pId === 'jhk510-polo-premium' || pSku === 'jhk510-blk' || (pSku.includes('jhk510') && !pSku.includes('wht'))) {
        return mId === 'pfront' || mId === 'pback';
    }

    // Hoodie JHK421
    if (pId === 'jhk421-hoodie-white' || pSku === 'jhk421-wht') {
        return mId.includes('jhk421wht') || mId.includes('jhk421_wht') || mId === 'hwhitefront' || mId === 'hwhiteback' || mId === 'hoodiewhitefront' || mId === 'hoodiewhiteback' || mId === 'hoodie_white_front' || mId === 'hoodie_white_back' || mId === 'sweatwhitefront' || mId === 'sweatwhiteback';
    }
    if (pId === 'jhk421-hoodie' || pSku === 'jhk421-blk' || (pSku.includes('jhk421') && !pSku.includes('wht') && !pSku.includes('gry'))) {
        return mId === 'hfront' || mId === 'hback';
    }

    return false;
};

/**
 * Déduplique strictement une liste de mockups par ID (insensible à la casse) avec un Map.
 * En cas de collision, les champs non-vides (ai, aiRemastered, mechanical) sont conservés et fusionnés.
 */
export const deduplicateMockups = <T extends { id?: string }>(mockups: T[]): T[] => {
    if (!Array.isArray(mockups)) return [];
    const map = new Map<string, T>();
    for (const m of mockups) {
        if (!m || !m.id) continue;
        const key = m.id.toLowerCase().trim();
        if (!map.has(key)) {
            map.set(key, m);
        } else {
            const existing = map.get(key)!;
            map.set(key, {
                ...m,
                ...existing,
                ...((m as any).ai ? { ai: (m as any).ai } : {}),
                ...((m as any).aiRemastered ? { aiRemastered: (m as any).aiRemastered } : {}),
                ...((m as any).mechanical ? { mechanical: (m as any).mechanical } : {})
            });
        }
    }
    return Array.from(map.values());
};

/**
 * Groupes d'alias pour les slots de gabarits (notamment les variantes blanches).
 * Permet de faire correspondre un ID de mockup (ex: 'tankWhiteFront', 'BYBB011-WHT_front', 'pWhiteFront', 'JHK510-WHT_front')
 * à son slot A ou B dans logoPlacements, même en cas de casse ou de convention d'ID différente.
 */
export const MOCKUP_SLOT_ALIAS_GROUPS: string[][] = [
    // Polo Blanc Face & Dos
    ['pwhitefront', 'polowhitefront', 'polo_white_front', 'jhk510-wht_front', 'jhk510_wht_front', 'jhk510wht_front', 'jhk510-whtfront', 'jhk510whtfront'],
    ['pwhiteback', 'polowhiteback', 'polo_white_back', 'jhk510-wht_back', 'jhk510_wht_back', 'jhk510wht_back', 'jhk510-whtback', 'jhk510whtback'],
    
    // T-shirt Blanc Face & Dos
    ['twhitefront', 'tshirtwhitefront', 'tshirt_white_front', 'jhk170-wht_front', 'jhk170_wht_front', 'jhk170wht_front', 'jhk170-whtfront', 'jhk170whtfront'],
    ['twhiteback', 'tshirtwhiteback', 'tshirt_white_back', 'jhk170-wht_back', 'jhk170_wht_back', 'jhk170wht_back', 'jhk170-whtback', 'jhk170whtback'],
    
    // Hoodie Blanc Face & Dos
    ['hwhitefront', 'hoodiewhitefront', 'hoodie_white_front', 'sweatwhitefront', 'sweat_white_front', 'jhk421-wht_front', 'jhk421_wht_front', 'jhk421wht_front', 'jhk421-whtfront', 'jhk421whtfront'],
    ['hwhiteback', 'hoodiewhiteback', 'hoodie_white_back', 'sweatwhiteback', 'sweat_white_back', 'jhk421-wht_back', 'jhk421_wht_back', 'jhk421wht_back', 'jhk421-whtback', 'jhk421whtback'],
    
    // Débardeur Blanc Face & Dos
    ['tankwhitefront', 'tank_white_front', 'bybb011-wht_front', 'bybb011_wht_front', 'bybb011wht_front', 'bybb011-whtfront', 'bybb011whtfront'],
    ['tankwhiteback', 'tank_white_back', 'bybb011-wht_back', 'bybb011_wht_back', 'bybb011wht_back', 'bybb011-whtback', 'bybb011whtback'],
    
    // Heavyweight Oversize Blanc Face & Dos
    ['heavywhitefront', 'heavy_white_front', 'nx7200-wht_front', 'nx7200_wht_front', 'nx7200wht_front', 'nx7200-whtfront', 'nx7200whtfront'],
    ['heavywhiteback', 'heavy_white_back', 'nx7200-wht_back', 'nx7200_wht_back', 'nx7200wht_back', 'nx7200-whtback', 'nx7200whtback'],
    
    // Polo Noir Face & Dos
    ['pfront', 'polofront', 'polo_front', 'jhk510-blk_front', 'jhk510_blk_front', 'jhk510blk_front'],
    ['pback', 'poloback', 'polo_back', 'jhk510-blk_back', 'jhk510_blk_back', 'jhk510blk_back'],
    
    // T-shirt Noir Face & Dos
    ['tfront', 'tshirtfront', 'tshirt_front', 'jhk170-blk_front', 'jhk170_blk_front', 'jhk170blk_front'],
    ['tback', 'tshirtback', 'tshirt_back', 'jhk170-blk_back', 'jhk170_blk_back', 'jhk170blk_back'],
    
    // Hoodie Noir Face & Dos
    ['hfront', 'hoodiefront', 'hoodie_front', 'sweatfront', 'sweat_front', 'jhk421-blk_front', 'jhk421_blk_front', 'jhk421blk_front'],
    ['hback', 'hoodieback', 'hoodie_back', 'sweatback', 'sweat_back', 'jhk421-blk_back', 'jhk421_blk_back', 'jhk421blk_back'],
    
    // Débardeur Noir Face & Dos
    ['tankfront', 'tank_front', 'bybb011-blk_front', 'bybb011_blk_front', 'bybb011blk_front'],
    ['tankback', 'tank_back', 'bybb011-blk_back', 'bybb011_blk_back', 'bybb011blk_back'],
    
    // Heavyweight Oversize Noir Face & Dos
    ['heavyfront', 'heavy_front', 'nx7200-blk_front', 'nx7200_blk_front', 'nx7200blk_front'],
    ['heavyback', 'heavy_back', 'nx7200-blk_back', 'nx7200_blk_back', 'nx7200blk_back'],
    
    // Sport E3520
    ['e3520_front', 'e3520front', 'sport_blue_front'],
    ['e3520_back', 'e3520back', 'sport_blue_back'],
    
    // Business Card
    ['cardfront', 'card_front', 'business_card_front'],
    ['cardback', 'card_back', 'business_card_back']
];

/**
 * Recherche le slot 'A' | 'B' configuré pour un ID donné dans logoPlacements,
 * en vérifiant les alias connus et la casse pour éviter tout écrasement par défaut.
 */
export const resolveSlotForPlacement = (
    placementId: string,
    placements?: Record<string, 'A' | 'B'> | null
): 'A' | 'B' => {
    if (!placementId || !placements) return 'A';

    // 1. Recherche directe exacte
    if (placements[placementId] === 'A' || placements[placementId] === 'B') {
        return placements[placementId];
    }

    // 2. Recherche directe insensible à la casse
    const lowerId = placementId.toLowerCase().trim();
    for (const [key, val] of Object.entries(placements)) {
        if (key.toLowerCase().trim() === lowerId && (val === 'A' || val === 'B')) {
            return val;
        }
    }

    // 3. Recherche par groupes d'alias
    const cleanId = lowerId.replace(/[^a-z0-9]/g, '');
    for (const group of MOCKUP_SLOT_ALIAS_GROUPS) {
        const matchedInGroup = group.some(alias => {
            const cleanAlias = alias.replace(/[^a-z0-9]/g, '');
            return cleanId === cleanAlias || cleanId.includes(cleanAlias) || cleanAlias.includes(cleanId);
        });

        if (matchedInGroup) {
            for (const [key, val] of Object.entries(placements)) {
                if (val !== 'A' && val !== 'B') continue;
                const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
                const keyMatches = group.some(alias => {
                    const cleanAlias = alias.replace(/[^a-z0-9]/g, '');
                    return cleanKey === cleanAlias || cleanKey.includes(cleanAlias) || cleanAlias.includes(cleanKey);
                });
                if (keyMatches) {
                    return val;
                }
            }
        }
    }

    return 'A';
};

/**
 * Retourne la liste de tous les alias associés à un placementId
 */
export const getAliasesForPlacementId = (placementId: string): string[] => {
    if (!placementId) return [];
    const cleanId = placementId.toLowerCase().replace(/[^a-z0-9]/g, '');
    for (const group of MOCKUP_SLOT_ALIAS_GROUPS) {
        const matched = group.some(alias => {
            const cleanAlias = alias.replace(/[^a-z0-9]/g, '');
            return cleanId === cleanAlias || cleanId.includes(cleanAlias) || cleanAlias.includes(cleanId);
        });
        if (matched) return group;
    }
    return [placementId];
};
