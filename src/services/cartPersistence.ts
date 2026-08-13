import { get, set, setMany, getMany } from 'idb-keyval';
import { cleanCartItem } from '../utils/helpers';

const CART_KEY = 'signaid_cart_full';

// Simple string hash for content deduplication
function generateDesignHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return 'd_' + Math.abs(hash).toString(16);
}

// Fields that constitute the "Heavy Design" (Images)
const HEAVY_KEYS = [
    'aiImageUrl',
    'aiImageUrlFront', 'aiImageUrlBack',
    'previewImageUrlFront', 'previewImageUrlBack',
    'processedLogoUrlFront', 'processedLogoUrlBack',
    'processedLogoUrlFront_original', 'processedLogoUrlBack_original',
    'processedLogoUrlFront_white', 'processedLogoUrlFront_black', 'processedLogoUrlFront_noBackground',
    'processedLogoUrlBack_white', 'processedLogoUrlBack_black', 'processedLogoUrlBack_noBackground',
    'originalLogoUrlFront', 'originalLogoUrlBack'
];

export const cartPersistence = {
    saveCart: async (cart: any[]) => {
        try {
            const lightCart: any[] = [];
            const designsToSave: [string, any][] = [];

            cart.forEach(item => {
                const heavyData: any = {};
                let hasHeavy = false;

                // Extract heavy fields
                HEAVY_KEYS.forEach(key => {
                    if (item[key]) {
                        heavyData[key] = item[key];
                        hasHeavy = true;
                    }
                });

                if (hasHeavy) {
                    // Generate Hash based on the JSON of heavy data (deduplication)
                    const json = JSON.stringify(heavyData);
                    const designId = generateDesignHash(json);

                    designsToSave.push([designId, heavyData]);

                    // Create Light Item with Reference
                    const lightItem = { ...item };
                    HEAVY_KEYS.forEach(k => delete lightItem[k]);
                    lightItem._designRef = designId;
                    lightCart.push(lightItem);
                } else {
                    lightCart.push(item);
                }
            });

            // 1. Save Unique Designs to IndexedDB (Batch)
            if (designsToSave.length > 0) {
                await setMany(designsToSave);
            }

            // 2. Save Light Cart to IndexedDB (Source of Truth)
            await set(CART_KEY, lightCart);

            // 3. Save Light Cart to LocalStorage (Summary / Backup)
            // Ensure cleaning just in case any other field leaks
            const extraClean = lightCart.map(i => cleanCartItem(i));
            localStorage.setItem('cart', JSON.stringify(extraClean));

            console.log(`Cart saved. Designs: ${designsToSave.length} (Deduplicated), Items: ${lightCart.length}`);
        } catch (e) {
            console.error("Cart persistence failed", e);
        }
    },

    loadCart: async (): Promise<any[]> => {
        try {
            // 1. Try IndexedDB Light Cart
            const lightCart = await get(CART_KEY);
            if (!lightCart || !Array.isArray(lightCart)) {
                // Fallback LS
                const fromLs = localStorage.getItem('cart');
                return fromLs ? JSON.parse(fromLs) : [];
            }

            // 2. Rehydrate Designs
            // Collect needed design IDs
            const designIds = [...new Set(lightCart.filter(i => i._designRef).map(i => i._designRef))];

            if (designIds.length === 0) return lightCart;

            // Fetch all needed designs
            const designs = await getMany(designIds);
            const designMap = new Map();
            designIds.forEach((id, idx) => {
                if (designs[idx]) designMap.set(id, designs[idx]);
            });

            // Reconstruct Full Cart
            const fullCart = lightCart.map(item => {
                if (item._designRef && designMap.has(item._designRef)) {
                    const design = designMap.get(item._designRef);
                    // Merge design data back into item
                    return { ...item, ...design };
                }
                return item;
            });

            console.log("Cart hydrated with high-res designs.");
            return fullCart;

        } catch (e) {
            console.error("Cart load failed", e);
            // Emergency fallback to local storage (might be missing images but better than nothing)
            const fromLs = localStorage.getItem('cart');
            return fromLs ? JSON.parse(fromLs) : [];
        }
    }
};
