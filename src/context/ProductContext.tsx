import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ProductDatabase, Product } from '../types';
import { productDatabase as staticProducts } from '../constants';
import { db, storage } from '../firebaseConfig';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

interface ProductContextType {
    products: ProductDatabase;
    addProduct: (slug: string, product: Product, imagesToUpload?: { front: File, back: File, color: string }[]) => Promise<void>;
    deleteProduct: (slug: string) => Promise<void>;
    loading: boolean;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

export const ProductProvider = ({ children }: { children: ReactNode }) => {
    const [dynamicProducts, setDynamicProducts] = useState<ProductDatabase>({});
    const [pricingRulesV2, setPricingRulesV2] = useState<any>({});
    const [loading, setLoading] = useState(true);

    // Fetch products from Firestore
    useEffect(() => {
        const unsubscribeProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
            const loadedProducts: ProductDatabase = {};
            snapshot.forEach((doc) => {
                loadedProducts[doc.id] = doc.data() as Product;
            });
            setDynamicProducts(loadedProducts);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching products:", error);
            setLoading(false);
        });

        const unsubscribePricing = onSnapshot(doc(db, 'settings', 'pricing_rules_v2'), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.bundledData) {
                    try {
                        setPricingRulesV2(JSON.parse(data.bundledData));
                    } catch (e) {
                        console.error('Failed to parse bundled pricing rules', e);
                        setPricingRulesV2({});
                    }
                } else {
                    setPricingRulesV2(data);
                }
            } else {
                setPricingRulesV2({});
            }
        });

        return () => {
            unsubscribeProducts();
            unsubscribePricing();
        };
    }, []);

    // Merge static and dynamic products
    const baseProducts: ProductDatabase = JSON.parse(JSON.stringify({ ...staticProducts, ...dynamicProducts }));
    const products: ProductDatabase = {};
    
    Object.keys(baseProducts).forEach(slug => {
        const p = baseProducts[slug];
        // @ts-ignore
        if (!p.isDeleted) {
            products[slug] = p;
        }
    });

    // Apply pricing rules based on reference
    Object.keys(products).forEach(slug => {
        const p = products[slug];
        if (p.reference && pricingRulesV2[p.reference]) {
            const rules = pricingRulesV2[p.reference];
            if (rules.basePrice !== undefined) p.price = rules.basePrice;
            if (rules.boxQuantity !== undefined) p.boxQuantity = rules.boxQuantity;
            if (rules.boxPrice !== undefined) p.boxPrice = rules.boxPrice;
            if (rules.weight !== undefined) p.weight = rules.weight;
        }
    });

    const addProduct = async (slug: string, product: Product, imagesToUpload?: { front: File, back: File, color: string }[]) => {
        const processedProduct = { ...product };

        // Upload images if provided
        if (imagesToUpload && imagesToUpload.length > 0) {
            for (const upload of imagesToUpload) {
                const color = upload.color;

                // Front Image
                if (upload.front) {
                    const frontRef = ref(storage, `products/${slug}/${color}_front`);
                    await uploadBytes(frontRef, upload.front);
                    const frontUrl = await getDownloadURL(frontRef);
                    if (!processedProduct.images) processedProduct.images = {};
                    processedProduct.images[color] = frontUrl;
                }

                // Back Image
                if (upload.back) {
                    const backRef = ref(storage, `products/${slug}/${color}_back`);
                    await uploadBytes(backRef, upload.back);
                    const backUrl = await getDownloadURL(backRef);
                    if (!processedProduct.backImages) processedProduct.backImages = {};
                    processedProduct.backImages[color] = backUrl;
                }
            }
        }

        // Save to Firestore
        await setDoc(doc(db, 'products', slug), processedProduct);
    };

    const deleteProduct = async (slug: string) => {
        if (staticProducts[slug]) {
            // For static products, we mark them as deleted in Firestore to hide them
            await setDoc(doc(db, 'products', slug), { ...staticProducts[slug], isDeleted: true });
            return;
        }
        await deleteDoc(doc(db, 'products', slug));
        // Note: We are not deleting images from Storage here to avoid complex logic, but in prod we should.
    };

    return (
        <ProductContext.Provider value={{ products, addProduct, deleteProduct, loading }}>
            {children}
        </ProductContext.Provider>
    );
};

export const useProducts = () => {
    const context = useContext(ProductContext);
    if (!context) {
        throw new Error('useProducts must be used within a ProductProvider');
    }
    return context;
};
