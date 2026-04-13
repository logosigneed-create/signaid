import React, { useState, useEffect } from 'react';
import { User, PricingRules } from '../types';
import { db } from '../firebaseConfig';
import { collection, getDocs, query, orderBy, limit, doc, updateDoc, setDoc, getDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { useProducts } from '../context/ProductContext';
import { storage } from '../firebaseConfig';
import { COLOR_NAMES } from '../constants';
import FlyerEditor from './FlyerEditor';

// import { AdminChatView } from './AdminChatView';

type Tab = 'orders' | 'quotes' | 'products' | 'dimensions' | 'users' | 'messages' | 'settings' | 'flyer' | 'chat';

export function AdminView({ user, onBack, productDimensions, onUpdateDimensions, initialQuoteId, initialPrintMargin = 15, onUpdatePrintMargin }: { user: User, onBack: () => void, productDimensions: Record<string, Record<string, number>>, onUpdateDimensions: (dims: Record<string, Record<string, number>>) => void, initialQuoteId?: string | null, initialPrintMargin?: number, onUpdatePrintMargin?: (margin: number) => void }) {
    const [activeTab, setActiveTab] = useState<Tab>('orders');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [orders, setOrders] = useState<any[]>([]);
    const [quotes, setQuotes] = useState<any[]>([]);
    const [messages, setMessages] = useState<any[]>([]);
    const [usersList, setUsersList] = useState<User[]>([]);
    const [pricingRules, setPricingRules] = useState<PricingRules>({});
    const [loading, setLoading] = useState(true);

    const [selectedQuote, setSelectedQuote] = useState<any | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Products Hook
    const { products, addProduct, deleteProduct, loading: productsLoading } = useProducts();

    // Banner Settings State
    const [bannerSettings, setBannerSettings] = useState({ enabled: false, text: '' });
    const [bannerSaveStatus, setBannerSaveStatus] = useState('');

    // Global Settings
    const [printMargin, setPrintMargin] = useState(initialPrintMargin);
    const [generalSettingsSaveStatus, setGeneralSettingsSaveStatus] = useState('');

    // Add Product Form State
    const [newProduct, setNewProduct] = useState({
        name: '',
        slug: '',
        price: '',
        supplierLink: '',
        reference: '',
        colorName: 'Noir',
        colorHex: '#000000',
        sizes: ["XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL", "5XL", "6XL"] as string[],
        sizePrices: {} as Record<string, string>
    });
    const [newProductFiles, setNewProductFiles] = useState<{ front: File | null, back: File | null }>({ front: null, back: null });
    const [isAddingProduct, setIsAddingProduct] = useState(false);
    const [selectedSlugs, setSelectedSlugs] = useState<Set<string>>(new Set());
    const [editingSlug, setEditingSlug] = useState<string | null>(null);
    const [isGeneratingStudio, setIsGeneratingStudio] = useState(false);

    const toggleSelectAll = () => {
        if (selectedSlugs.size === Object.keys(products).length) {
            setSelectedSlugs(new Set());
        } else {
            setSelectedSlugs(new Set(Object.keys(products)));
        }
    };

    const toggleSlug = (slug: string) => {
        const newSet = new Set(selectedSlugs);
        if (newSet.has(slug)) {
            newSet.delete(slug);
        } else {
            newSet.add(slug);
        }
        setSelectedSlugs(newSet);
    };

    // Dynamic Title for Admin
    useEffect(() => {
        document.title = "Signaid - Admin Dashboard (v2.0 Tabs)";
    }, []);

    // DEBUG: Log current user
    console.log("Admin View Current User:", user);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setErrorMsg(null);

            // Helper for robust fetching
            const fetchCollection = async (
                name: string,
                setter: Function,
                sortField: string,
                limitCount: number
            ) => {
                try {
                    console.log(`Fetching ${name}...`);
                    const q = query(collection(db, name), limit(limitCount));
                    const snapshot = await getDocs(q);
                    console.log(`${name} fetched: ${snapshot.size} docs`); // Log count
                    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                    // Client-side Sort
                    data.sort((a: any, b: any) => {
                        const tA = a[sortField]?.seconds || 0;
                        const tB = b[sortField]?.seconds || 0;
                        return tB - tA;
                    });

                    setter(data);
                } catch (err: any) {
                    console.error(`Error fetching ${name}:`, err);
                    setErrorMsg(prev => `${prev ? prev + ' | ' : ''}Err ${name}: ${err.message}`);
                }
            };

            await Promise.all([
                fetchCollection('orders', setOrders, 'createdAt', 50),
                fetchCollection('quotes', setQuotes, 'createdAt', 50),
                fetchCollection('contact_messages', setMessages, 'timestamp', 50),
                // Users fetch
                (async () => {
                    try {
                        const usersQuery = query(collection(db, 'users'), limit(50));
                        const usersSnapshot = await getDocs(usersQuery);
                        setUsersList(usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User)));
                    } catch (e: any) {
                        console.error("Error fetching users:", e);
                        setErrorMsg(prev => `${prev ? prev + ' | ' : ''}Err Users: ${e.message}`);
                    }
                })(),
                // Pricing
                (async () => {
                    try {
                        const pricingDoc = await getDoc(doc(db, 'settings', 'pricing'));
                        if (pricingDoc.exists()) {
                            setPricingRules(pricingDoc.data() as PricingRules);
                        }
                    } catch (e) { console.error("Pricing err:", e); }
                })(),
                // Banner Settings
                (async () => {
                    try {
                        const bannerDoc = await getDoc(doc(db, 'settings', 'banner'));
                        if (bannerDoc.exists()) {
                            setBannerSettings(bannerDoc.data() as any);
                        }
                    } catch (e) { console.error("Banner settings err:", e); }
                })()
            ]);

            setLoading(false);
        };
        fetchData();
    }, []);

    // Effect to open initial quote from URL
    useEffect(() => {
        if (initialQuoteId && quotes.length > 0) {
            const target = quotes.find(q => q.id === initialQuoteId);
            if (target) {
                setSelectedQuote(target);
                setActiveTab('quotes'); // Switch to quotes tab
            }
        }
    }, [initialQuoteId, quotes]);

    const exportQuotesToCSV = () => {
        if (quotes.length === 0) return;

        const headers = ["Date", "Nom", "Email", "Téléphone", "Message", "Articles", "Logo Services"];
        const rows = quotes.map(q => {
            const itemsStr = q.cart?.map((i: any) => {
                const p = products[i.productType];
                const refPart = p?.reference ? ` [${p.reference}]` : '';
                return `${i.quantity}x ${p?.name || i.productType}${refPart} (${Object.keys(i.sizes || {}).join(',')})`;
            }).join(' | ');
            const servicesStr = q.cart?.filter((i: any) => i.isModernizationService).map((i: any) => i.activityName).join(' | ');

            return [
                q.createdAt ? new Date(q.createdAt.seconds * 1000).toLocaleDateString('fr-FR') : '',
                `"${(q.formData?.name || '').replace(/"/g, '""')}"`,
                `"${(q.formData?.email || '').replace(/"/g, '""')}"`,
                `"${(q.formData?.phone || '').replace(/"/g, '""')}"`,
                `"${(q.formData?.message || '').replace(/"/g, '""')}"`,
                `"${(itemsStr || '').replace(/"/g, '""')}"`,
                `"${(servicesStr || '').replace(/"/g, '""')}"`
            ].join(';');
        });

        const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + headers.join(';') + "\n" + rows.join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `devis_signaid_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleUpdateUserCredits = async (userId: string, newCredits: number) => {
        try {
            await updateDoc(doc(db, "users", userId), { credits: newCredits });
            setUsersList(prev => prev.map(u => u.id === userId ? { ...u, credits: newCredits } : u));
            alert("Crédits mis à jour !");
        } catch (e) {
            console.error("Error updating credits:", e);
            alert("Erreur lors de la mise à jour.");
        }
    };

    const handleDeleteVariant = async (colorHex: string) => {
        const slug = editingSlug || (products[newProduct.slug] ? newProduct.slug : null);
        if (!slug) return;
        const p = products[slug];
        if (!p) return;
        
        if (!confirm(`Supprimer la variante ${colorHex} ?`)) return;

        const newImages = { ...p.images };
        delete newImages[colorHex];
        const newBackImages = { ...p.backImages };
        delete newBackImages[colorHex];

        const updatedProduct = {
            ...p,
            images: newImages,
            backImages: newBackImages
        };

        try {
            await addProduct(slug, updatedProduct, []);
        } catch (e: any) {
            alert("Erreur: " + e.message);
        }
    };

    const handleAddProductSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsAddingProduct(true);
        try {
            if (!newProduct.slug) {
                alert("L'ID (slug) est requis.");
                setIsAddingProduct(false);
                return;
            }

            const existingProduct = products[newProduct.slug];
            let productData: any;

            if (existingProduct) {
                // MERGE/UPDATE MODE: Use existing product data but update metadata if changed
                productData = {
                    ...existingProduct,
                    name: newProduct.name || existingProduct.name,
                    price: newProduct.price ? parseFloat(newProduct.price) : existingProduct.price,
                    supplierLink: newProduct.supplierLink || existingProduct.supplierLink,
                    reference: newProduct.reference || existingProduct.reference,
                    sizes: newProduct.sizes || existingProduct.sizes,
                    sizePrices: Object.fromEntries(
                        Object.entries(newProduct.sizePrices).map(([s, p]) => [s, parseFloat(p as string)]).filter(([_, p]) => !Number.isNaN(p as number))
                    )
                };
                console.log("Updating/Adding variant to product:", productData.name);
            } else {
                // CREATE MODE: Validate new fields
                if (!newProduct.name || !newProduct.price) {
                    alert("Veuillez remplir les champs obligatoires (Nom, Prix).");
                    setIsAddingProduct(false);
                    return;
                }
                productData = {
                    name: newProduct.name,
                    price: parseFloat(newProduct.price),
                    supplierLink: newProduct.supplierLink,
                    reference: newProduct.reference,
                    sizes: newProduct.sizes.length > 0 ? newProduct.sizes : ["XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL", "5XL", "6XL"],
                    sizePrices: Object.fromEntries(
                        Object.entries(newProduct.sizePrices).map(([s, p]) => [s, parseFloat(p as string)]).filter(([_, p]) => !Number.isNaN(p as number))
                    ),
                    slideImage: "",
                    images: {},
                    backImages: {}
                };
            }

            const imagesToUpload = [];
            if (newProductFiles.front || newProductFiles.back) {
                imagesToUpload.push({
                    front: newProductFiles.front as File,
                    back: newProductFiles.back as File,
                    color: newProduct.colorHex
                });
            }

            await addProduct(newProduct.slug, productData, imagesToUpload as any);

            alert(editingSlug ? "Produit modifié avec succès !" : "Produit ajouté avec succès !");
            setNewProduct({ name: '', slug: '', price: '', supplierLink: '', reference: '', colorName: 'Noir', colorHex: '#000000', sizes: ["XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL", "5XL", "6XL"], sizePrices: {} });
            setNewProductFiles({ front: null, back: null });
            setEditingSlug(null);
        } catch (err: any) {
            console.error("Error adding/updating product:", err);
            alert("Erreur: " + err.message);
        } finally {
            setIsAddingProduct(false);
        }
    };
    
    const handleGenerateStudio = async (mode: 'front' | 'back' | 'both' = 'both') => {
        if (!newProductFiles.front) {
            alert("Veuillez d'abord uploader une image de face (même pour générer le dos, nous avons besoin d'une référence).");
            return;
        }
        
        setIsGeneratingStudio(true);
        try {
            const fileToBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = error => reject(error);
            });

            const frontB64 = await fileToBase64(newProductFiles.front);

            // Step 1: Remove background (common for both)
            console.log("Removing background...");
            const { removeBackground } = await import('../utils/helpers');
            const noBgB64 = await removeBackground(frontB64);
            
            const { geminiService } = await import('../services/geminiService');

            // Helper to convert base64 to File
            const base64ToFile = (base64: string, filename: string): File => {
                const arr = base64.split(',');
                const mime = arr[0].match(/:(.*?);/)![1];
                const bstr = atob(arr[1]);
                let n = bstr.length;
                const u8arr = new Uint8Array(n);
                while(n--){
                    u8arr[n] = bstr.charCodeAt(n);
                }
                return new File([u8arr], filename, {type:mime});
            };

            const updatedFiles = { ...newProductFiles };
            const productLabel = newProduct.name || newProduct.slug || 'clothing';

            if (mode === 'front' || mode === 'both') {
                const studioFrontRaw = await geminiService.generateProductStudio(noBgB64, 'front', productLabel);
                const studioFrontB64 = await removeBackground(studioFrontRaw);
                updatedFiles.front = base64ToFile(studioFrontB64, 'front_studio.png');
            }
            
            if (mode === 'back' || mode === 'both') {
                const studioBackRaw = await geminiService.generateProductStudio(noBgB64, 'back', productLabel + " - BACK VIEW");
                const studioBackB64 = await removeBackground(studioBackRaw);
                updatedFiles.back = base64ToFile(studioBackB64, 'back_studio.png');
            }

            setNewProductFiles(updatedFiles);

            if (mode === 'both') alert("Studio terminé ! L'IA a généré la face et le dos.");
            else alert(`${mode === 'front' ? 'Face' : 'Dos'} généré avec succès !`);
        } catch (err: any) {
            console.error("Studio Generation Error:", err);
            alert("Erreur lors de la génération Studio: " + err.message);
        } finally {
            setIsGeneratingStudio(false);
        }
    };
    
    const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const text = event.target?.result as string;
                const lines = text.split(/\r?\n/).filter((l: string) => l.trim() !== '');
                if (lines.length < 2) throw new Error("Fichier vide ou invalide.");

                const delimiter = lines[0].includes(';') ? ';' : ',';
                // Remove trailing quotes explicitly for headers
                const headers = lines[0].split(delimiter).map((h: string) => h.trim().replace(/^"|"$/g, '').toLowerCase());

                // Find indices with prioritized matching to prevent selecting wrong columns (e.g., '10 carton' over 'prix unitaire')
                const findHeader = (patterns: string[]) => headers.findIndex((h: string) => patterns.includes(h));

                const refIdx = findHeader(['n° art', 'ref', 'référence', 'reference']);

                let priceIdx = findHeader(['prix unitaire', 'prix de base']);
                if (priceIdx === -1) priceIdx = findHeader(['price', 'prix']);
                if (priceIdx === -1) priceIdx = findHeader(['10 carton']);

                let boxQtyIdx = findHeader(['qté / carton', 'unités par caisse', 'quantité carton']);
                if (boxQtyIdx === -1) boxQtyIdx = findHeader(['carton', 'box', 'caisse']);

                let boxPriceIdx = findHeader(['prix carton', 'prix spécial caisse', 'prix spécial', 'prix caisse']);
                if (boxPriceIdx === -1 && boxQtyIdx !== headers.indexOf('carton')) {
                    // Only fallback to 'carton' as price if it wasn't already picked as quantity
                    boxPriceIdx = headers.findIndex((h: string, i: number) => h === 'carton' && i !== boxQtyIdx);
                }

                const weightIdx = findHeader(['volume', 'poids', 'weight']);

                // Size columns mapping (3XL, 4XL, etc.)
                const sizeHeaders = ['3xl', '4xl', '5xl', '6xl', '7xl', '8xl', '9xl', '10xl'];
                const sizeIndices: Record<string, number> = {};
                sizeHeaders.forEach(s => {
                    const idx = headers.indexOf(s);
                    if (idx !== -1) sizeIndices[s.toUpperCase()] = idx;
                });

                if (refIdx === -1) throw new Error("Colonne de référence introuvable.");

                const newRules: Record<string, any> = {};

                for (let i = 1; i < lines.length; i++) {
                    const lineStr = lines[i];
                    if (!lineStr) continue;

                    // Regex helps split by delimiter but ignores those inside quotes
                    const cols = lineStr.split(new RegExp(`\\s*(?:${delimiter}|\\n)\\s*(?=(?:[^"]*"[^"]*")*[^"]*$)`)).map((c: string) => c.trim().replace(/^"|"$/g, ''));

                    const reference = cols[refIdx];
                    if (!reference || reference === '') continue;

                    const rule: any = {};

                    // Parsing helper
                    const parseNumber = (val: string) => {
                        if (!val) return null;
                        return parseFloat(val.replace(',', '.'));
                    };

                    const basePrice = parseNumber(cols[priceIdx]);
                    if (basePrice !== null && !isNaN(basePrice)) rule.basePrice = basePrice;

                    // Note: qtés par carton might be under 'qté / carton'
                    const qteCartonIndex = headers.findIndex((h: string) => h === 'qté / carton');
                    if (qteCartonIndex !== -1 && cols[qteCartonIndex]) {
                        const bQty = parseInt(cols[qteCartonIndex], 10);
                        if (!isNaN(bQty)) rule.boxQuantity = bQty;
                    } else if (boxQtyIdx !== -1 && cols[boxQtyIdx]) {
                        const bQty = parseInt(cols[boxQtyIdx], 10);
                        if (!isNaN(bQty)) rule.boxQuantity = bQty;
                    }

                    // Note: prix carton might be under 'carton'
                    const cartonPriceIndex = headers.findIndex((h: string, idx: number) => h === 'carton' && idx !== qteCartonIndex);
                    if (cartonPriceIndex !== -1 && cols[cartonPriceIndex] && cartonPriceIndex !== qteCartonIndex) {
                        const pCarton = parseNumber(cols[cartonPriceIndex]);
                        if (pCarton !== null && !isNaN(pCarton)) rule.boxPrice = pCarton;
                    } else if (boxPriceIdx !== -1 && cols[boxPriceIdx] && boxPriceIdx !== boxQtyIdx) {
                        const bPrice = parseNumber(cols[boxPriceIdx]);
                        if (bPrice !== null && !isNaN(bPrice)) rule.boxPrice = bPrice;
                    }

                    const w = parseNumber(cols[weightIdx]);
                    if (w !== null && !isNaN(w)) rule.weight = w;

                    // Size pricing
                    const sizePrices: Record<string, number> = {};
                    Object.entries(sizeIndices).forEach(([size, idx]) => {
                        const sPrice = parseNumber(cols[idx]);
                        if (sPrice !== null && !isNaN(sPrice)) {
                            sizePrices[size] = sPrice;
                        }
                    });
                    if (Object.keys(sizePrices).length > 0) {
                        rule.sizePrices = sizePrices;
                    }

                    if (Object.keys(rule).length > 0) {
                        newRules[reference] = rule;
                    }
                }

                const docRef = doc(db, 'settings', 'pricing_rules_v2');
                const docSnap = await getDoc(docRef);
                const existingData = docSnap.exists() ? docSnap.data() : {};

                let existing = existingData;
                if (existingData.bundledData) {
                    try {
                        existing = JSON.parse(existingData.bundledData);
                    } catch (e) {
                        console.error('Failed to parse existing nested rules', e);
                        existing = {};
                    }
                }

                const mergedRules = { ...existing, ...newRules };

                await setDoc(docRef, { bundledData: JSON.stringify(mergedRules) });
                alert(`Succès! ${Object.keys(newRules).length} règles de prix importées (Format Bundled).`);

            } catch (err: any) {
                console.error("CSV Parse Error", err);
                alert("Erreur lors de la lecture du CSV: " + err.message);
            }
        };
        reader.readAsText(file);
        e.target.value = ''; // Reset input
    };

    const authorizedEmails = ['logosigneed@gmail.com', 'nicolas@signaid.be']; // added backup email just in case
    if (!user.email || !authorizedEmails.includes(user.email)) {
        return <div className="p-8 text-center text-red-500">Accès non autorisé ({user.email}).</div>;
    }

    // --- RENDER HELPERS ---

    const renderSidebar = () => (
        <>
            {/* Mobile Backdrop */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                ></div>
            )}

            {/* Sidebar */}
            <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 border-r h-full flex flex-col shadow-2xl transition-transform duration-300 ease-in-out md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="p-6 border-b border-gray-800 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-black text-white tracking-tighter">SIGNAID</h2>
                        <div className="text-[10px] bg-blue-600 rounded px-1 text-white inline-block mt-1">v2.1 Mobile</div>
                    </div>
                    {/* Close button on mobile */}
                    <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden text-gray-400 hover:text-white">
                        <i className="fa-solid fa-times text-xl"></i>
                    </button>
                </div>
                <nav className="flex-1 overflow-y-auto p-4 space-y-2">
                    {/* TABS Re-implemented with dark theme for contrast */}
                    <button onClick={() => { setActiveTab('orders'); setIsMobileMenuOpen(false); }} className={`w-full text-left px-4 py-3 rounded-lg font-bold flex items-center gap-3 transition-colors ${activeTab === 'orders' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800'}`}>
                        <i className="fa-solid fa-box-open w-5 text-center"></i> Commandes
                    </button>
                    <button onClick={() => { setActiveTab('quotes'); setIsMobileMenuOpen(false); }} className={`w-full text-left px-4 py-3 rounded-lg font-bold flex items-center gap-3 transition-colors ${activeTab === 'quotes' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800'}`}>
                        <i className="fa-solid fa-file-invoice w-5 text-center"></i> Devis
                    </button>
                    <div className="h-px bg-gray-700 my-2"></div>
                    <button onClick={() => { setActiveTab('products'); setIsMobileMenuOpen(false); }} className={`w-full text-left px-4 py-3 rounded-lg font-bold flex items-center gap-3 transition-colors ${activeTab === 'products' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800'}`}>
                        <i className="fa-solid fa-tags w-5 text-center"></i> Produits & Prix
                    </button>
                    <button onClick={() => { setActiveTab('dimensions'); setIsMobileMenuOpen(false); }} className={`w-full text-left px-4 py-3 rounded-lg font-bold flex items-center gap-3 transition-colors ${activeTab === 'dimensions' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800'}`}>
                        <i className="fa-solid fa-ruler-combined w-5 text-center"></i> Tailles (Dims)
                    </button>
                    <div className="h-px bg-gray-700 my-2"></div>
                    <button onClick={() => { setActiveTab('users'); setIsMobileMenuOpen(false); }} className={`w-full text-left px-4 py-3 rounded-lg font-bold flex items-center gap-3 transition-colors ${activeTab === 'users' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800'}`}>
                        <i className="fa-solid fa-users w-5 text-center"></i> Crédits
                    </button>
                    <button onClick={() => { setActiveTab('messages'); setIsMobileMenuOpen(false); }} className={`w-full text-left px-4 py-3 rounded-lg font-bold flex items-center gap-3 transition-colors ${activeTab === 'messages' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800'}`}>
                        <i className="fa-solid fa-envelope w-5 text-center"></i> Messages
                    </button>
                    <div className="h-px bg-gray-700 my-2"></div>
                    {/* Chat Live removed - reverted to direct social links */}
                    <div className="h-px bg-gray-700 my-2"></div>
                    <button onClick={() => { setActiveTab('settings'); setIsMobileMenuOpen(false); }} className={`w-full text-left px-4 py-3 rounded-lg font-bold flex items-center gap-3 transition-colors ${activeTab === 'settings' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800'}`}>
                        <i className="fa-solid fa-cog w-5 text-center"></i> Paramètres
                    </button>
                    <button onClick={() => { setActiveTab('flyer'); setIsMobileMenuOpen(false); }} className={`w-full text-left px-4 py-3 rounded-lg font-bold flex items-center gap-3 transition-colors ${activeTab === 'flyer' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800'}`}>
                        <i className="fa-solid fa-map-location-dot w-5 text-center"></i> Gestion Flyer
                    </button>
                </nav>
                <div className="p-4 border-t border-gray-800 bg-gray-900">
                    <button onClick={onBack} className="w-full py-2 text-sm text-gray-400 hover:text-white font-bold flex items-center justify-center gap-2 border border-gray-700 rounded hover:bg-gray-800">
                        <i className="fa-solid fa-arrow-left"></i> Retour au Site
                    </button>
                </div>
            </aside>
        </>
    );


    const renderContent = () => {
        if (loading) return <div className="p-12 text-center text-gray-400"><i className="fa-solid fa-circle-notch fa-spin text-3xl"></i></div>;
        if (errorMsg) return <div className="bg-red-50 text-red-600 p-6 m-6 rounded-xl border border-red-200">Error: {errorMsg}</div>;

        switch (activeTab) {
            case 'orders':
                return (
                    <div className="space-y-6">
                        <h3 className="text-2xl font-black text-gray-800">Commandes ({orders.length})</h3>
                        <div className="bg-white rounded-xl shadow-sm overflow-hidden border">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 text-gray-600 border-b">
                                    <tr>
                                        <th className="p-4 font-bold">Date</th>
                                        <th className="p-4 font-bold">Client</th>
                                        <th className="p-4 font-bold">Montant</th>
                                        <th className="p-4 font-bold">Status</th>
                                        <th className="p-4 font-bold">Détails</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {orders.map(order => (
                                        <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="p-4 text-gray-500 text-xs">
                                                {order.createdAt ? new Date(order.createdAt.seconds * 1000).toLocaleString('fr-FR') : 'N/A'}
                                            </td>
                                            <td className="p-4">
                                                <div className="font-bold">{order.email}</div>
                                                <div className="text-xs text-gray-400">{order.id}</div>
                                            </td>
                                            <td className="p-4 font-bold text-gray-800">{order.totalAmount} €</td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${order.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                    {order.status}
                                                </span>
                                            </td>
                                            <td className="p-4 text-xs text-gray-500 max-w-xs truncate">
                                                {order.items?.map((i: any) => {
                                                    const p = i.productType ? products[i.productType] : null;
                                                    const refPart = p?.reference ? ` [${p.reference}]` : '';
                                                    return `${i.quantity}x ${i.name}${refPart}`;
                                                }).join(', ')}
                                            </td>
                                        </tr>
                                    ))}
                                    {orders.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-gray-400">Aucune commande trouvée.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );

            case 'quotes':
                return (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h3 className="text-2xl font-black text-gray-800">Devis ({quotes.length})</h3>
                            <button onClick={exportQuotesToCSV} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold shadow-sm transition-all flex items-center gap-2">
                                <i className="fa-solid fa-download"></i> Export CSV
                            </button>
                        </div>
                        <div className="bg-white rounded-xl shadow-sm overflow-hidden border">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 text-gray-600 border-b">
                                    <tr>
                                        <th className="p-4 font-bold">Date</th>
                                        <th className="p-4 font-bold">Client</th>
                                        <th className="p-4 font-bold">Contact</th>
                                        <th className="p-4 font-bold">Contenu</th>
                                        <th className="p-4 font-bold">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {quotes.map(quote => (
                                        <tr key={quote.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="p-4 text-gray-500 text-xs">
                                                {quote.createdAt ? new Date(quote.createdAt.seconds * 1000).toLocaleString('fr-FR') : 'N/A'}
                                            </td>
                                            <td className="p-4 font-bold text-gray-800">{quote.formData?.name || 'Inconnu'}</td>
                                            <td className="p-4 text-gray-600">{quote.formData?.email}</td>
                                            <td className="p-4 text-xs text-gray-500">
                                                <span className="font-bold text-gray-800">{quote.cart?.reduce((acc: number, item: any) => acc + (Object.values(item.sizes || {}) as number[]).reduce((a, b) => a + b, 0), 0) || 0} pcs</span>
                                                <span className="mx-1 text-gray-300">|</span>
                                                {quote.cart?.length || 0} lignes
                                                {quote.cart?.[0] && products[quote.cart[0].productType]?.reference && (
                                                    <span className="ml-2 font-mono text-[10px] text-orange-600 bg-orange-50 px-1 rounded">
                                                        {products[quote.cart[0].productType].reference}
                                                        {quote.cart.length > 1 && '...'}
                                                    </span>
                                                )}
                                                {quote.cart?.some((i: any) => i.isModernizationService || i.logoRedesignData || i.customization?.logoRedesignData) && (
                                                    <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 rounded text-[10px] font-bold uppercase">+ Logo</span>
                                                )}
                                            </td>
                                            <td className="p-4">
                                                <button onClick={() => setSelectedQuote(quote)} className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors">
                                                    Voir Détail
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {quotes.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-gray-400">Aucun devis trouvé.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );
            case 'products':
                return (
                    <div className="space-y-6">
                        <div className="flex gap-2">
                            <button
                                onClick={async () => {
                                    if (selectedSlugs.size === 0) {
                                        if (!confirm("⚠️ DANGER : Vous allez supprimer TOUS les produits importés manuellement du catalogue. Seuls les modèles de base du système resteront. Continuer ?")) return;

                                        const slugs = Object.keys(products);
                                        let count = 0;
                                        for (const slug of slugs) {
                                            try {
                                                await deleteProduct(slug);
                                                count++;
                                            } catch (e) {
                                                console.error("Failed to delete", slug, e);
                                            }
                                        }
                                        alert(`Nettoyage terminé !`);
                                    } else {
                                        if (!confirm(`Supprimer les ${selectedSlugs.size} produits sélectionnés ?`)) return;
                                        for (const slug of selectedSlugs) {
                                            try {
                                                await deleteProduct(slug);
                                            } catch (e) {
                                                console.error("Failed to delete", slug, e);
                                            }
                                        }
                                        setSelectedSlugs(new Set());
                                        alert("Suppression terminée !");
                                    }
                                }}
                                className="bg-red-100 hover:bg-red-200 text-red-600 px-4 py-2 rounded-lg font-bold shadow-sm transition-all flex items-center gap-2"
                            >
                                <i className="fa-solid fa-trash"></i> {selectedSlugs.size > 0 ? `Supprimer la sélection (${selectedSlugs.size})` : "Tout Supprimer"}
                            </button>
                            <button
                                onClick={async () => {
                                    if (!confirm("Vous allez importer le catalogue depuis 'imported_catalog.json'. Cela peut prendre du temps. Continuer ?")) return;
                                    try {
                                        const res = await fetch('/imported_catalog.json');
                                        if (!res.ok) throw new Error("Fichier d'import non trouvé (executez le script python d'abord).");
                                        const importData = await res.json();

                                        let count = 0;
                                        for (const [slug, prod] of Object.entries(importData)) {
                                            // @ts-ignore
                                            await addProduct(slug, prod, []);
                                            count++;
                                        }
                                        alert(`Import terminé ! ${count} produits ajoutés/mis à jour.`);
                                    } catch (e: any) {
                                        alert("Erreur import: " + e.message);
                                    }
                                }}
                                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-bold shadow-sm transition-all flex items-center gap-2"
                            >
                                <i className="fa-solid fa-file-import"></i> Importer le Catalogue
                            </button>
                            <button
                                onClick={() => document.getElementById('csvPriceUpload')?.click()}
                                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold shadow-sm transition-all flex items-center gap-2"
                            >
                                <i className="fa-solid fa-file-csv"></i> Importer Prix (CSV)
                            </button>
                            <input
                                id="csvPriceUpload"
                                type="file"
                                accept=".csv,.txt"
                                className="hidden"
                                onChange={handleCsvUpload}
                            />
                        </div>

                        {/* ADD PRODUCT FORM */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-orange-200">
                            <h4 className="font-bold mb-4">{editingSlug ? `Modifier le produit: ${editingSlug}` : 'Ajouter un nouveau produit'}</h4>
                            <form onSubmit={(e) => {
                                e.preventDefault();
                                handleAddProductSubmit(e);
                            }} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <input
                                        className={`border p-2 rounded w-full ${products[newProduct.slug] ? 'border-blue-500 bg-blue-50' : ''}`}
                                        placeholder="ID Unique (slug) (ex: tshirt_premium)"
                                        value={newProduct.slug}
                                        onChange={e => setNewProduct({ ...newProduct, slug: e.target.value })}
                                        disabled={!!editingSlug}
                                    />
                                    {products[newProduct.slug] && !editingSlug && (
                                        <p className="text-xs text-blue-600 mt-1 font-bold">
                                            <i className="fa-solid fa-info-circle mr-1"></i>
                                            Produit existant détecté : "{products[newProduct.slug].name}". Vous allez ajouter une variante de couleur ou modifier ses infos.
                                        </p>
                                    )}
                                </div>

                                <input
                                    className="border p-2 rounded"
                                    placeholder="Nom (ex: T-shirt Premium)"
                                    value={newProduct.name}
                                    onChange={e => setNewProduct({ ...newProduct, name: e.target.value })}
                                />

                                <input
                                    className="border p-2 rounded"
                                    type="number"
                                    placeholder="Prix (€)"
                                    value={newProduct.price}
                                    onChange={e => setNewProduct({ ...newProduct, price: e.target.value })}
                                />
                                <input
                                    className="border p-2 rounded md:col-span-2"
                                    placeholder="Lien Fournisseur (Catalogue URL)"
                                    value={newProduct.supplierLink}
                                    onChange={e => setNewProduct({ ...newProduct, supplierLink: e.target.value })}
                                />
                                <input
                                    className="border p-2 rounded md:col-span-2"
                                    placeholder="Référence (ex: JHK170)"
                                    value={newProduct.reference}
                                    onChange={e => setNewProduct({ ...newProduct, reference: e.target.value })}
                                />
                                <div className="flex gap-2">
                                    <input
                                        className="border p-2 rounded w-1/2 cursor-pointer"
                                        type="color"
                                        value={newProduct.colorHex}
                                        onChange={e => setNewProduct({ ...newProduct, colorHex: e.target.value })}
                                    />
                                    <input
                                        className="border p-2 rounded w-1/2"
                                        placeholder="Nom Couleur"
                                        value={newProduct.colorName}
                                        onChange={e => setNewProduct({ ...newProduct, colorName: e.target.value })}
                                    />
                                </div>

                                {/* EXISTING VARIANTS SELECTOR */}
                                {(editingSlug || products[newProduct.slug]) && (
                                    <div className="md:col-span-2 bg-blue-50/30 p-4 rounded-xl border border-blue-100/50">
                                        <h5 className="text-[10px] font-black uppercase text-blue-400 mb-3 tracking-widest">Variantes existantes</h5>
                                        <div className="flex flex-wrap gap-3">
                                            {Object.keys((editingSlug ? products[editingSlug] : products[newProduct.slug]).images || {}).map(hex => (
                                                <div key={hex} className="group relative animate-fade-in">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const colorName = COLOR_NAMES[hex.toUpperCase()] || COLOR_NAMES[hex.toLowerCase()] || 'Couleur existante';
                                                            setNewProduct({ ...newProduct, colorHex: hex, colorName: colorName });
                                                            setNewProductFiles({ front: null, back: null });
                                                        }}
                                                        className={`w-10 h-10 rounded-full border-2 transition-all shadow-sm ${newProduct.colorHex === hex ? 'border-blue-600 scale-110 shadow-blue-200' : 'border-white hover:scale-105'}`}
                                                        style={{ backgroundColor: hex }}
                                                        title="Cliquer pour modifier cette variante"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteVariant(hex)}
                                                        className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[8px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity border border-white"
                                                        title="Supprimer cette variante"
                                                    >
                                                        <i className="fa-solid fa-times"></i>
                                                    </button>
                                                </div>
                                            ))}
                                            <div className="w-px bg-blue-100 mx-1"></div>
                                            <button
                                                type="button"
                                                onClick={() => setNewProduct({ ...newProduct, colorHex: '#000000', colorName: 'Nouvelle Couleur' })}
                                                className="w-10 h-10 rounded-full border-2 border-dashed border-blue-300 text-blue-400 flex items-center justify-center hover:bg-blue-50 transition-colors"
                                                title="Ajouter une nouvelle couleur"
                                            >
                                                <i className="fa-solid fa-plus"></i>
                                            </button>
                                        </div>
                                    </div>
                                )}
                                <div className="md:col-span-2 grid grid-cols-2 gap-4">
                                    <div className="bg-gray-50/50 p-3 rounded-lg border border-gray-100">
                                        <div className="flex justify-between items-center mb-1">
                                            <label className="text-sm font-bold">Image Face</label>
                                            <button 
                                                type="button" 
                                                onClick={() => handleGenerateStudio('front')}
                                                disabled={isGeneratingStudio || !newProductFiles.front}
                                                className="text-[10px] bg-purple-100 text-purple-700 px-2 py-1 rounded font-black hover:bg-purple-200 transition-colors flex items-center gap-1"
                                                title="Générer uniquement la face Studio"
                                            >
                                                <i className="fa-solid fa-wand-magic-sparkles"></i> GÉNÉRER FACE
                                            </button>
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <input type="file" onChange={e => setNewProductFiles({ ...newProductFiles, front: e.target.files?.[0] || null })} />
                                            {newProductFiles.front ? (
                                                <div className="relative w-24 h-24 border rounded bg-white flex items-center justify-center overflow-hidden group shadow-sm">
                                                    <img src={URL.createObjectURL(newProductFiles.front)} className="max-w-full max-h-full object-contain" />
                                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <span className="text-[10px] text-white font-bold uppercase tracking-wider">Aperçu Face</span>
                                                    </div>
                                                </div>
                                            ) : (
                                                (editingSlug || products[newProduct.slug]) && (editingSlug ? products[editingSlug] : products[newProduct.slug]).images[newProduct.colorHex] && (
                                                    <div className="relative w-24 h-24 border rounded bg-white flex items-center justify-center overflow-hidden group shadow-sm opacity-60 grayscale-[0.2]">
                                                        <img src={(editingSlug ? products[editingSlug] : products[newProduct.slug]).images[newProduct.colorHex]} className="max-w-full max-h-full object-contain" />
                                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                                            <span className="text-[8px] text-white font-black uppercase tracking-tighter">IMAGE ACTUELLE</span>
                                                        </div>
                                                    </div>
                                                )
                                            )}
                                        </div>
                                    </div>
                                    <div className="bg-gray-50/50 p-3 rounded-lg border border-gray-100">
                                        <div className="flex justify-between items-center mb-1">
                                            <label className="text-sm font-bold">Image Dos</label>
                                            <button 
                                                type="button" 
                                                onClick={() => handleGenerateStudio('back')}
                                                disabled={isGeneratingStudio || !newProductFiles.front}
                                                className="text-[10px] bg-blue-100 text-blue-700 px-2 py-1 rounded font-black hover:bg-blue-200 transition-colors flex items-center gap-1"
                                                title="Générer uniquement le dos Studio (basé sur la face)"
                                            >
                                                <i className="fa-solid fa-wand-magic-sparkles"></i> GÉNÉRER DOS
                                            </button>
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <input type="file" onChange={e => setNewProductFiles({ ...newProductFiles, back: e.target.files?.[0] || null })} />
                                            {newProductFiles.back ? (
                                                <div className="relative w-24 h-24 border rounded bg-white flex items-center justify-center overflow-hidden group shadow-sm">
                                                    <img src={URL.createObjectURL(newProductFiles.back)} className="max-w-full max-h-full object-contain" />
                                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <span className="text-[10px] text-white font-bold uppercase tracking-wider">Aperçu Dos</span>
                                                    </div>
                                                </div>
                                            ) : (
                                                (editingSlug || products[newProduct.slug]) && (editingSlug ? products[editingSlug] : products[newProduct.slug]).backImages[newProduct.colorHex] && (
                                                    <div className="relative w-24 h-24 border rounded bg-white flex items-center justify-center overflow-hidden group shadow-sm opacity-60 grayscale-[0.2]">
                                                        <img src={(editingSlug ? products[editingSlug] : products[newProduct.slug]).backImages[newProduct.colorHex]} className="max-w-full max-h-full object-contain" />
                                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                                            <span className="text-[8px] text-white font-black uppercase tracking-tighter">IMAGE ACTUELLE</span>
                                                        </div>
                                                    </div>
                                                )
                                            )}
                                        </div>
                                    </div>
                                    <div className="md:col-span-2">
                                        <button
                                            type="button"
                                            disabled={isGeneratingStudio || !newProductFiles.front}
                                            onClick={() => handleGenerateStudio('both')}
                                            className="w-full py-4 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-xl font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-indigo-200 flex items-center justify-center gap-3 transition-all disabled:opacity-50 hover:scale-[1.01] active:scale-[0.99]"
                                        >
                                            {isGeneratingStudio ? (
                                                <><i className="fa-solid fa-wand-magic-sparkles fa-spin"></i> TRAITEMENT IA EN COURS...</>
                                            ) : (
                                                <><i className="fa-solid fa-wand-magic-sparkles"></i> ✨ Studio Complet (Face + Dos)</>
                                            )}
                                        </button>
                                        <p className="text-[10px] text-gray-400 mt-3 italic text-center font-medium">
                                            L'IA utilise votre photo de face comme référence pour reconstruire le vêtement de manière professionnelle.
                                        </p>
                                    </div>
                                </div>

                                <div className="md:col-span-2 border-t pt-4 mt-2">
                                    <h5 className="text-xs font-black uppercase text-gray-400 mb-3 tracking-widest">Tailles Disponibles</h5>
                                    <div className="flex flex-wrap gap-4 bg-gray-50 p-4 rounded-lg">
                                        {["XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL", "5XL", "6XL", "7XL", "8XL", "9XL", "10XL"].map(size => (
                                            <label key={size} className="flex items-center gap-2 cursor-pointer group">
                                                <input
                                                    type="checkbox"
                                                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                    checked={newProduct.sizes.includes(size)}
                                                    onChange={(e) => {
                                                        const checked = e.target.checked;
                                                        setNewProduct(prev => ({
                                                            ...prev,
                                                            sizes: checked 
                                                                ? [...prev.sizes, size] 
                                                                : prev.sizes.filter(s => s !== size)
                                                        }));
                                                    }}
                                                />
                                                <span className="text-sm font-bold text-gray-700 group-hover:text-blue-600 transition-colors">{size}</span>
                                            </label>
                                        ))}
                                    </div>
                                    <p className="text-[10px] text-gray-400 mt-2 italic">* Décochez les tailles que ce produit ne propose pas (ex: décochez 5XL si indisponible).</p>
                                </div>

                                <div className="md:col-span-2 border-t pt-4 mt-2">
                                    <h5 className="text-xs font-black uppercase text-gray-400 mb-3 tracking-widest">Prix par tailles (Overrides)</h5>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                                        {newProduct.sizes.map(size => (
                                            <div key={size} className="flex flex-col">
                                                <label className="text-[10px] font-bold text-gray-500 mb-1">{size}</label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    className="border p-2 rounded text-sm outline-none focus:border-blue-500"
                                                    placeholder="Prix (€)"
                                                    value={newProduct.sizePrices[size] || ''}
                                                    onChange={e => setNewProduct({
                                                        ...newProduct,
                                                        sizePrices: { ...newProduct.sizePrices, [size]: e.target.value }
                                                    })}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                    {newProduct.sizes.length === 0 && <p className="text-xs text-gray-400 italic">Sélectionnez des tailles ci-dessus pour définir des prix spécifiques.</p>}
                                </div>
                                <div className="md:col-span-2 flex gap-4">
                                    <button
                                        type="submit"
                                        disabled={isAddingProduct}
                                        className={`flex-1 text-white py-2 rounded font-bold transition-colors disabled:opacity-50 ${editingSlug ? 'bg-orange-600 hover:bg-orange-700' : (products[newProduct.slug] ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700')}`}
                                    >
                                        {isAddingProduct ? 'Traitement...' : (editingSlug ? 'Sauvegarder les modifications' : (products[newProduct.slug] ? 'Ajouter la Variante / Mettre à jour' : 'Ajouter le Produit'))}
                                    </button>
                                    {editingSlug && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setEditingSlug(null);
                                                setNewProduct({ name: '', slug: '', price: '', supplierLink: '', reference: '', colorName: 'Noir', colorHex: '#000000', sizes: ["XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL", "5XL", "6XL"], sizePrices: {} });
                                            }}
                                            className="px-6 py-2 bg-gray-200 text-gray-700 rounded font-bold hover:bg-gray-300 transition-colors"
                                        >
                                            Annuler
                                        </button>
                                    )}
                                </div>
                            </form>
                        </div>

                        {/* PRODUCT LIST */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="p-4 w-10">
                                            <input
                                                type="checkbox"
                                                checked={Object.keys(products).length > 0 && selectedSlugs.size === Object.keys(products).length}
                                                onChange={toggleSelectAll}
                                                className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                            />
                                        </th>
                                        <th className="p-4">Image</th>
                                        <th className="p-4">Nom</th>
                                        <th className="p-4">Référence</th>
                                        <th className="p-4">ID</th>
                                        <th className="p-4">Prix</th>
                                        <th className="p-4">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {Object.entries(products).map(([slug, product]) => (
                                        <tr key={slug}>
                                            <td className="p-4">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedSlugs.has(slug)}
                                                    onChange={() => toggleSlug(slug)}
                                                    className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                                />
                                            </td>
                                            <td className="p-4">
                                                <img src={product.slideImage || Object.values(product.images || {})[0]} className="w-10 h-10 object-contain" alt="" />
                                            </td>
                                            <td className="p-4 font-bold">{product.name}</td>
                                            <td className="p-4 text-xs font-mono text-gray-500">{product.reference}</td>
                                            <td className="p-4 text-gray-400 text-xs">{slug}</td>
                                            <td className="p-4 font-bold text-gray-800">{product.price} €</td>
                                            <td className="p-4 flex gap-2">
                                                <button
                                                    onClick={() => {
                                                        const link = `${window.location.origin}/creation/${slug}`;
                                                        navigator.clipboard.writeText(link);
                                                        alert("Lien copié dans le presse-papier !");
                                                    }}
                                                    className="bg-green-100 text-green-600 px-3 py-1 rounded hover:bg-green-200 flex items-center gap-1"
                                                    title="Copier le lien de partage direct"
                                                >
                                                    <i className="fa-solid fa-link text-xs"></i> Lien
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        const p = products[slug];
                                                        setEditingSlug(slug);
                                                        setNewProduct({
                                                            name: p.name,
                                                            slug: slug,
                                                            price: p.price.toString(),
                                                            supplierLink: p.supplierLink || '',
                                                            reference: p.reference || '',
                                                            colorName: 'Noir', // Keep default or detect from existing?
                                                            colorHex: '#000000',
                                                            sizes: p.sizes || ["XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL", "5XL", "6XL"],
                                                            sizePrices: Object.fromEntries(
                                                                Object.entries(p.sizePrices || {}).map(([s, val]) => [s, val.toString()])
                                                            )
                                                        });
                                                        // Scroll to form
                                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                                    }}
                                                    className="bg-blue-100 text-blue-600 px-3 py-1 rounded hover:bg-blue-200"
                                                >
                                                    Modifier
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        if (confirm(`Supprimer ${product.name}?`)) deleteProduct(slug);
                                                    }}
                                                    className="bg-red-100 text-red-600 px-3 py-1 rounded hover:bg-red-200"
                                                >
                                                    Supprimer
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );



            case 'dimensions':
                return (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h3 className="text-2xl font-black text-gray-800">Tailles & Mesures</h3>
                            <button
                                onClick={async () => {
                                    try {
                                        await setDoc(doc(db, 'settings', 'dimensions'), productDimensions);
                                        alert("Configurations sauvegardées !");
                                    } catch (e) {
                                        console.error("Error saving dimensions:", e);
                                        alert("Erreur lors de la sauvegarde.");
                                    }
                                }}
                                className="bg-purple-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-purple-700 shadow-lg text-sm transition-transform hover:scale-105"
                            >
                                <i className="fa-solid fa-save mr-2"></i> Sauvegarder
                            </button>
                        </div>
                        <div className="bg-white rounded-xl shadow-sm p-6 border">
                            <p className="text-sm text-gray-500 mb-6">Définissez la HAUTEUR (en cm) de chaque vêtement pour chaque taille (S, M, L...). Important pour le calcul de taille réelle du logo.</p>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {Object.entries(products).map(([type, product]) => (
                                    <div key={type} className="border border-gray-200 rounded-xl p-5">
                                        <h4 className="font-bold text-gray-800 mb-4 flex flex-col gap-1 border-b pb-2">
                                            <div className="flex items-center gap-2">
                                                {/* @ts-ignore */}
                                                <i className={`fa-solid ${type === 'hoodie' ? 'fa-user-astronaut' : 'fa-shirt'}`}></i>
                                                {product.name}
                                            </div>
                                            {product.reference && (
                                                <span className="text-[10px] font-black text-orange-600 bg-orange-50 px-2 py-0.5 rounded w-fit uppercase">
                                                    REF: {product.reference}
                                                </span>
                                            )}
                                        </h4>
                                        <div className="space-y-3">
                                            {product.sizes.map(size => {
                                                const currentHeight = productDimensions?.[type]?.[size] || 0;
                                                return (
                                                    <div key={size} className="flex items-center justify-between font-mono text-sm">
                                                        <span className="font-bold w-8 text-gray-600">{size}</span>
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                type="number"
                                                                className="w-20 border border-gray-300 rounded px-2 py-1 outline-none focus:border-purple-500 text-right font-medium"
                                                                placeholder="Hauteur"
                                                                value={currentHeight || ''}
                                                                onChange={(e) => {
                                                                    const val = parseFloat(e.target.value);
                                                                    onUpdateDimensions({
                                                                        ...productDimensions,
                                                                        [type]: {
                                                                            ...(productDimensions[type] || {}),
                                                                            [size]: isNaN(val) ? 0 : val
                                                                        }
                                                                    });
                                                                }}
                                                            />
                                                            <span className="text-gray-400 text-xs">cm</span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                );

            case 'users':
                return (
                    <div className="space-y-6">
                        <h3 className="text-2xl font-black text-gray-800">Utilisateurs</h3>
                        <div className="bg-white rounded-xl shadow-sm overflow-hidden border">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 text-gray-600 border-b">
                                    <tr>
                                        <th className="p-4 font-bold">Utilisateur</th>
                                        <th className="p-4 font-bold">Email</th>
                                        <th className="p-4 font-bold">Crédits</th>
                                        <th className="p-4 font-bold">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {usersList.map(u => (
                                        <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="p-4 font-bold flex items-center gap-3">
                                                <img src={u.avatarUrl} className="w-8 h-8 rounded-full border" />
                                                {u.username}
                                            </td>
                                            <td className="p-4 text-gray-500">{u.email}</td>
                                            <td className="p-4 font-black text-orange-500 text-lg">{u.credits || 0}</td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="number"
                                                        className="w-24 border rounded-lg px-3 py-1.5 text-sm outline-none focus:border-orange-500"
                                                        defaultValue={u.credits || 0}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                const val = parseInt(e.currentTarget.value);
                                                                if (!isNaN(val)) handleUpdateUserCredits(u.id, val);
                                                            }
                                                        }}
                                                    />
                                                    <button
                                                        className="bg-orange-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-orange-600 transition-colors"
                                                        onClick={(e) => {
                                                            const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                                                            const val = parseInt(input.value);
                                                            if (!isNaN(val)) handleUpdateUserCredits(u.id, val);
                                                        }}
                                                    >
                                                        OK
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );

            case 'messages':
                return (
                    <div className="space-y-6">
                        <h3 className="text-2xl font-black text-gray-800">Messages de Contact</h3>
                        <div className="bg-white rounded-xl shadow-sm overflow-hidden border">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 text-gray-600 border-b">
                                    <tr>
                                        <th className="p-4 font-bold">Date</th>
                                        <th className="p-4 font-bold">Nom</th>
                                        <th className="p-4 font-bold">Message</th>
                                        <th className="p-4 font-bold">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {messages.map(msg => (
                                        <tr key={msg.id} className="hover:bg-gray-50">
                                            <td className="p-4 text-gray-500 text-xs">
                                                {msg.timestamp ? new Date(msg.timestamp.seconds * 1000).toLocaleString('fr-FR') : 'N/A'}
                                            </td>
                                            <td className="p-4">
                                                <div className="font-bold">{msg.name}</div>
                                                <a href={`mailto:${msg.email}`} className="text-blue-600 hover:underline text-xs">{msg.email}</a>
                                            </td>
                                            <td className="p-4 text-gray-600 max-w-md truncate" title={msg.message}>{msg.message}</td>
                                            <td className="p-4">
                                                <a
                                                    href={`mailto:${msg.email}?subject=Réponse SignAid : ${msg.name}&body=Bonjour ${msg.name},%0D%0A%0D%0ANous avons bien reçu votre message :%0D%0A"${msg.message}"%0D%0A%0D%0A Cordialement,%0D%0AL'équipe SignAid`}
                                                    className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 w-fit transition-colors"
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                >
                                                    <i className="fa-solid fa-reply"></i> Répondre
                                                </a>
                                            </td>
                                        </tr>
                                    ))}
                                    {messages.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-gray-400">Aucun message.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )

                    ;

            case 'settings':
                return (
                    <div className="space-y-6">
                        <h3 className="text-2xl font-black text-gray-800">Paramètres du Site</h3>

                        {/* BANNER MANAGEMENT */}
                        <div className="bg-white rounded-xl shadow-sm p-6 border">
                            <div className="flex justify-between items-center mb-6 border-b pb-4">
                                <div>
                                    <h4 className="text-xl font-bold text-gray-800">Bandeau Promo</h4>
                                    <p className="text-sm text-gray-500 mt-1">Gérez l'affichage du bandeau publicitaire en haut de page</p>
                                </div>
                                <button
                                    onClick={async () => {
                                        try {
                                            setBannerSaveStatus('saving');
                                            await setDoc(doc(db, 'settings', 'banner'), bannerSettings);
                                            setBannerSaveStatus('success');
                                            setTimeout(() => setBannerSaveStatus(''), 2000);
                                        } catch (e) {
                                            console.error("Error saving banner settings:", e);
                                            setBannerSaveStatus('error');
                                            setTimeout(() => setBannerSaveStatus(''), 3000);
                                        }
                                    }}
                                    disabled={bannerSaveStatus === 'saving'}
                                    className={`px-6 py-2 rounded-lg font-bold shadow-lg transition-all flex items-center gap-2
                                        ${bannerSaveStatus === 'success' ? 'bg-green-600 text-white' :
                                            bannerSaveStatus === 'error' ? 'bg-red-600 text-white' :
                                                'bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50'}`}
                                >
                                    {bannerSaveStatus === 'saving' && <i className="fa-solid fa-circle-notch fa-spin"></i>}
                                    {bannerSaveStatus === 'success' && <i className="fa-solid fa-check"></i>}
                                    {bannerSaveStatus === 'error' && <i className="fa-solid fa-exclamation-triangle"></i>}
                                    {bannerSaveStatus === 'saving' ? 'Sauvegarde...' :
                                        bannerSaveStatus === 'success' ? 'Sauvegardé !' :
                                            bannerSaveStatus === 'error' ? 'Erreur' : 'Sauvegarder'}
                                </button>
                            </div>

                            <div className="space-y-4">
                                {/* ENABLE TOGGLE */}
                                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                    <div>
                                        <label className="font-bold text-gray-800">Activer le bandeau</label>
                                        <p className="text-xs text-gray-500 mt-1">Afficher ou masquer le bandeau sur toutes les pages</p>
                                    </div>
                                    <button
                                        onClick={() => setBannerSettings({ ...bannerSettings, enabled: !bannerSettings.enabled })}
                                        className={`relative w-14 h-7 rounded-full transition-colors ${bannerSettings.enabled ? 'bg-green-500' : 'bg-gray-300'}`}
                                    >
                                        <div className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-md transition-transform ${bannerSettings.enabled ? 'translate-x-7' : ''}`}></div>
                                    </button>
                                </div>

                                {/* TEXT INPUT */}
                                <div>
                                    <label className="block font-bold text-gray-800 mb-2">Texte du bandeau</label>
                                    <textarea
                                        className="w-full border border-gray-300 rounded-lg p-3 outline-none focus:border-blue-500 font-medium"
                                        placeholder="Ex: 🔥 - 15 € offert sur votre première commande avec le code PROMO15"
                                        rows={3}
                                        value={bannerSettings.text}
                                        onChange={e => setBannerSettings({ ...bannerSettings, text: e.target.value })}
                                    />
                                    <p className="text-xs text-gray-500 mt-1">💡 Tip: Utilisez des émojis pour plus d'impact !</p>
                                </div>

                                {/* PREVIEW */}
                                {bannerSettings.text && (
                                    <div>
                                        <label className="block font-bold text-gray-800 mb-2">Aperçu</label>
                                        <div className="w-full bg-gradient-to-r from-orange-600 via-red-500 to-orange-600 text-white text-sm font-bold py-2 overflow-hidden shadow-md rounded-lg">
                                            <div className="whitespace-nowrap animate-marquee flex items-center">
                                                <span className="mx-8">{bannerSettings.text}</span>
                                                <span className="mx-8">{bannerSettings.text}</span>
                                                <span className="mx-8">{bannerSettings.text}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* STATUS INFO */}
                                <div className={`p-4 rounded-lg border-2 ${bannerSettings.enabled ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                                    <div className="flex items-center gap-2">
                                        <i className={`fa-solid ${bannerSettings.enabled ? 'fa-check-circle text-green-600' : 'fa-times-circle text-gray-400'} text-xl`}></i>
                                        <span className="font-bold text-gray-800">
                                            Statut: {bannerSettings.enabled ? 'Actif' : 'Désactivé'}
                                        </span>
                                    </div>
                                    {bannerSettings.enabled && (
                                        <p className="text-xs text-green-700 mt-2">Le bandeau est actuellement visible sur le site</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* GENERAL SETTINGS (PRINT MARGIN) */}
                        <div className="bg-white rounded-xl shadow-sm p-6 border mt-8">
                            <div className="flex justify-between items-center mb-6 border-b pb-4">
                                <div>
                                    <h4 className="text-xl font-bold text-gray-800">Marge d'Impression (Production)</h4>
                                    <p className="text-sm text-gray-500 mt-1">Gérez le coût fixe d'impression appliqué à chaque vêtement dans le panier.</p>
                                </div>
                                <button
                                    onClick={async () => {
                                        try {
                                            setGeneralSettingsSaveStatus('saving');
                                            await setDoc(doc(db, 'settings', 'general'), { printMargin: printMargin });
                                            if (onUpdatePrintMargin) onUpdatePrintMargin(printMargin);
                                            setGeneralSettingsSaveStatus('success');
                                            setTimeout(() => setGeneralSettingsSaveStatus(''), 2000);
                                        } catch (e) {
                                            console.error("Error saving general settings:", e);
                                            setGeneralSettingsSaveStatus('error');
                                            setTimeout(() => setGeneralSettingsSaveStatus(''), 3000);
                                        }
                                    }}
                                    disabled={generalSettingsSaveStatus === 'saving'}
                                    className={`px-6 py-2 rounded-lg font-bold shadow-lg transition-all flex items-center gap-2
                                        ${generalSettingsSaveStatus === 'success' ? 'bg-green-600 text-white' :
                                            generalSettingsSaveStatus === 'error' ? 'bg-red-600 text-white' :
                                                'bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50'}`}
                                >
                                    {generalSettingsSaveStatus === 'saving' && <i className="fa-solid fa-circle-notch fa-spin"></i>}
                                    {generalSettingsSaveStatus === 'success' && <i className="fa-solid fa-check"></i>}
                                    {generalSettingsSaveStatus === 'error' && <i className="fa-solid fa-exclamation-triangle"></i>}
                                    {generalSettingsSaveStatus === 'saving' ? 'Sauvegarde...' :
                                        generalSettingsSaveStatus === 'success' ? 'Sauvegardé !' :
                                            generalSettingsSaveStatus === 'error' ? 'Erreur' : 'Sauvegarder'}
                                </button>
                            </div>
                            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                                <div className="flex-1">
                                    <label className="block text-sm font-black text-gray-700 uppercase tracking-widest mb-2">Marge fixe par vêtement (€)</label>
                                    <div className="flex items-center gap-3">
                                        <div className="relative flex-1 max-w-xs">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">€</span>
                                            <input
                                                type="number"
                                                className="w-full pl-8 pr-4 py-3 border border-gray-200 rounded-xl outline-none focus:border-blue-500 font-black text-lg"
                                                value={printMargin}
                                                onChange={(e) => setPrintMargin(parseFloat(e.target.value) || 0)}
                                            />
                                        </div>
                                        <div className="text-xs text-gray-400 font-medium max-w-[200px]">
                                            Cette valeur sera ajoutée au prix de base du vêtement + les frais d'impression de l'atelier.
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'flyer':
                return (
                    <div className="space-y-6">
                        <h3 className="text-2xl font-black text-gray-800 tracking-tight">Gestion du Flyer Interactif</h3>
                        <FlyerEditor />
                    </div>
                );
            default:
                return <div>Onglet inconnu</div>;
        }
    };

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden font-sans text-gray-900">
            {renderSidebar()}
            <main className="flex-1 flex flex-col h-full relative md:ml-64 transition-all duration-300">
                {/* Mobile Header for Toggle */}
                <div className="md:hidden bg-white border-b px-6 py-4 flex items-center justify-between sticky top-0 z-30 shadow-sm shrink-0">
                    <h2 className="font-black text-lg text-gray-900 tracking-tight">SIGNAID <span className="text-blue-600">ADMIN</span></h2>
                    <button
                        onClick={() => setIsMobileMenuOpen(true)}
                        className="p-2 -mr-2 text-gray-600 hover:text-blue-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <i className="fa-solid fa-bars text-xl"></i>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">
                    {renderContent()}
                </div>
            </main>

            {/* QUOTE MODAL OVERLAY (Global) */}
            {selectedQuote && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-slide-up">
                        <div className="p-6 border-b flex justify-between items-center bg-gray-50">
                            <div>
                                <h3 className="text-xl font-black text-gray-800 flex items-center gap-2">
                                    <i className="fa-solid fa-file-invoice text-blue-600"></i> DÉTAIL DEVIS
                                </h3>
                                <p className="text-xs text-gray-500 mt-1 font-mono">{selectedQuote.id}</p>
                            </div>
                            <button onClick={() => setSelectedQuote(null)} className="w-10 h-10 rounded-full bg-white border hover:bg-gray-100 flex items-center justify-center transition-colors shadow-sm">
                                <i className="fa-solid fa-times text-gray-500"></i>
                            </button>
                        </div>
                        <div className="p-8 overflow-y-auto flex-1 space-y-8 bg-white">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
                                    <h4 className="font-bold text-gray-400 text-[10px] uppercase tracking-widest mb-4">Client Information</h4>
                                    <div className="space-y-1">
                                        <p className="font-black text-xl text-gray-800">{selectedQuote.formData?.name}</p>
                                        <p className="text-gray-600 font-medium">{selectedQuote.formData?.email}</p>
                                        <p className="text-gray-600">{selectedQuote.formData?.phone}</p>
                                        <div className="mt-4 pt-4 border-t border-gray-200">
                                            <p className="text-sm text-gray-500">{selectedQuote.formData?.address}</p>
                                            <p className="text-sm text-gray-500">{selectedQuote.formData?.zip} {selectedQuote.formData?.city}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-orange-50 p-5 rounded-2xl border border-orange-100">
                                    <h4 className="font-bold text-orange-400 text-[10px] uppercase tracking-widest mb-4">Message Client</h4>
                                    <p className="italic text-gray-700 text-sm whitespace-pre-wrap leading-relaxed">
                                        {selectedQuote.formData?.message || "Aucun message joint à ce devis."}
                                    </p>
                                </div>

                                {/* GLOBAL LOGO DATA BLOCK */}
                                {(() => {
                                    // Find FIRST item with logo data (checking legacy flags too)
                                    const logoItem = selectedQuote.cart?.find((i: any) =>
                                        i.isModernizationService ||
                                        i.logoRedesignData ||
                                        i.customization?.logoRedesignData ||
                                        i.activityName // [NEW] Fallback check for flat structure
                                    );

                                    if (logoItem) {
                                        // Robust data extraction: Check nested first, then flat properties
                                        const data = logoItem.logoRedesignData ||
                                            logoItem.customization?.logoRedesignData ||
                                            logoItem; // Fallback to item itself for legacy flat structure

                                        // Check if we actually have ANY relevant data to show to avoid empty box
                                        const hasData = data.companyName || data.activityName || data.colors || data.style || data.budget || data.description;

                                        if (!hasData && !logoItem.isModernizationService) return null; // Skip if really no data

                                        return (
                                            <div className="bg-green-50 p-5 rounded-2xl border border-green-200 relative overflow-hidden">
                                                <div className="absolute top-0 right-0 p-2 opacity-10">
                                                    <i className="fa-solid fa-paintbrush text-8xl"></i>
                                                </div>
                                                <h4 className="font-bold text-green-700 text-[10px] uppercase tracking-widest mb-4 flex items-center gap-2">
                                                    <i className="fa-solid fa-paintbrush"></i> Service Graphique (Global)
                                                </h4>
                                                <div className="space-y-2 text-sm text-green-900 relative z-10">
                                                    {data.type && <p><span className="font-bold opacity-70">Type:</span> {data.type === 'creation' ? 'Création' : 'Refonte'}</p>}

                                                    {/* Unified Field Check */}
                                                    {data.companyName && <p><span className="font-bold opacity-70">Entreprise:</span> {data.companyName}</p>}
                                                    {data.activityName && <p><span className="font-bold opacity-70">Activité:</span> {data.activityName}</p>}
                                                    {data.colors && <p><span className="font-bold opacity-70">Couleurs:</span> {data.colors}</p>}
                                                    {data.style && <p><span className="font-bold opacity-70">Style:</span> {data.style}</p>}
                                                    {data.deadline && <p><span className="font-bold opacity-70">Délai:</span> {data.deadline}</p>}
                                                    {data.budget && <p><span className="font-bold opacity-70">Budget:</span> {data.budget}</p>}

                                                    {data.description && (
                                                        <div className="mt-2 text-xs italic bg-white/60 p-2 rounded border border-green-100">
                                                            "{data.description}"
                                                        </div>
                                                    )}

                                                    {/* Reference Image */}
                                                    {data.referenceLogo && data.referenceLogo.startsWith('data:') && (
                                                        <div className="mt-2">
                                                            <span className="font-bold opacity-70 text-xs">Image Ref:</span>
                                                            <img src={data.referenceLogo} className="h-16 mt-1 border rounded bg-white" />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    }
                                    return (
                                        <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 flex items-center justify-center text-gray-400 text-xs italic">
                                            Aucune option graphique sélectionnée.
                                        </div>
                                    );
                                })()}
                            </div>

                            <div>
                                <h4 className="font-black text-gray-800 border-b pb-4 mb-6 text-lg flex justify-between items-center">
                                    <span>Articles Inclus</span>
                                    <span className="text-sm font-normal text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                                        Total: {selectedQuote.cart?.reduce((acc: number, item: any) => acc + (Object.values(item.sizes || {}) as number[]).reduce((a, b) => a + b, 0), 0) || 0} pcs
                                    </span>
                                </h4>
                                <div className="space-y-4">
                                    {selectedQuote.cart?.map((item: any, idx: number) => (
                                        <div key={idx} className="flex gap-6 border border-gray-100 p-4 rounded-xl hover:border-blue-200 hover:shadow-md transition-all bg-white items-start group">
                                            <div className="w-24 h-24 bg-gray-50 border rounded-lg p-2 flex-shrink-0 relative">
                                                {(item.previewImageUrl || item.previewImageUrlFront || item.previewImageUrlBack || item.originalLogoUrlFront) ? (
                                                    <img src={item.previewImageUrl || item.previewImageUrlFront || item.previewImageUrlBack || item.originalLogoUrlFront} className="w-full h-full object-contain mix-blend-multiply" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.parentElement!.innerText = 'Img Err'; }} />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-400 text-center font-bold">NO IMG</div>
                                                )}
                                                {/* Debug Button */}
                                                {/* Link to Open in Customizer (Deep Link) */}
                                                <a
                                                    href={`${window.location.origin}/?quoteId=${selectedQuote.id}&quoteItemIdx=${idx}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="absolute -top-2 -left-2 w-6 h-6 bg-blue-600 text-white rounded-full text-[12px] flex items-center justify-center opacity-100 shadow-md z-10 hover:scale-110 transition-transform cursor-pointer"
                                                    title="Ouvrir le design dans l'éditeur (Visualiser les mesures/positions)"
                                                >
                                                    <i className="fa-solid fa-eye"></i>
                                                </a>
                                                <div className="absolute top-0 left-0 w-full h-full bg-black/5 opacity-0 hover:opacity-100 pointer-events-none transition-opacity"></div>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="mb-2">
                                                    <details className="text-[10px] text-gray-400 cursor-pointer">
                                                        <summary className="hover:text-gray-600">JSON DATA (Admin Only)</summary>
                                                        <pre className="mt-1 bg-gray-900 text-green-400 p-2 rounded overflow-x-auto selection:bg-gray-700">
                                                            {JSON.stringify(item, null, 2)}
                                                        </pre>
                                                    </details>
                                                </div>
                                                <div className="flex justify-between items-start mb-2">
                                                    <div>
                                                        <h5 className="font-black text-gray-800 text-lg flex flex-col gap-0.5">
                                                            <span>{products[item.productType]?.name || item.productType}</span>
                                                            {products[item.productType]?.reference && (
                                                                <span className="text-[10px] font-black text-orange-600 bg-orange-50 px-2 py-0.5 rounded w-fit">
                                                                    REF: {products[item.productType].reference}
                                                                </span>
                                                            )}
                                                            {(item.isModernizationService || item.logoRedesignData || item.customization?.logoRedesignData) && (
                                                                <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">
                                                                    + Logo Option
                                                                </span>
                                                            )}
                                                        </h5>
                                                        {item.uniqueId && <span className="text-[10px] text-gray-400 font-mono">ID: {item.uniqueId.slice(0, 8)}</span>}
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="text-sm font-bold bg-gray-900 text-white px-3 py-1 rounded-lg shadow-sm">
                                                            {(Object.values(item.sizes || {}).reduce((a: any, b: any) => a + b, 0) as number)} pcs
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="flex flex-wrap gap-2 mb-3">
                                                    {Object.entries(item.sizes).filter(([_, q]) => (q as number) > 0).map(([s, q]) => (
                                                        <span key={s} className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-1 rounded border border-gray-200">
                                                            {s}: {q as number}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="p-6 border-t bg-gray-50 flex justify-end gap-4">
                            <a href={`mailto:${selectedQuote.formData?.email}?subject=Votre Devis SignAid&body=Bonjour ${selectedQuote.formData?.name || ''},`} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all transform hover:scale-[1.02] flex items-center gap-2">
                                <i className="fa-solid fa-paper-plane"></i> Répondre par Mail
                            </a>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
