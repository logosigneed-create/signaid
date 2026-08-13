import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, auth } from '../firebaseConfig';
import { doc, getDoc, updateDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { 
    ShieldCheck, ShieldAlert, Shield, Zap, Loader2, Sparkles, Check, Sun, Moon, 
    Info, ArrowLeft, ShoppingCart, Minus, Plus, Star, HardHat, User, RefreshCw 
} from 'lucide-react';

interface PreviewItem {
    id: string;
    title: string;
    price: number;
    imageFront: string;
    imageBack: string;
    imageStudio?: string;
    imageBat?: string;
    selected: boolean;
    garment: string;
    view?: string;
}

interface PreviewData {
    previewId: string;
    companyName: string;
    logoUrl: string;
    logoOriginalUrl?: string;
    logoAdaptedUrl?: string;
    accentColor: string;
    items: PreviewItem[];
    status: 'pending' | 'converted';
    userEmail: string | null;
    createdAt: string;
    updatedAt: string;
}

interface DisplayPack {
    id: string;
    garment: string;
    name: string;
    description: string;
    unitPrice: number;
    isCard: boolean;
    frontStudio: string;
    frontBat: string;
    backStudio: string;
    backBat: string;
    imageFront: string;
    imageBack: string;
    items: PreviewItem[];
}

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

// Scale brightness/lightness of color for text readability on dark bg
const getReadableAccent = (colorStr: string): { accentColor: string; r: number; g: number; b: number } => {
    const { r, g, b } = parseToRgb(colorStr);
    const [h, s, l] = rgbToHsl(r, g, b);
    const targetL = Math.max(l, 0.60);
    const [nr, ng, nb] = hslToRgb(h, s, targetL);
    
    return {
        accentColor: `rgb(${nr}, ${ng}, ${nb})`,
        r: nr,
        g: ng,
        b: nb
    };
};

const getContrastText = (colorStr: string): string => {
    const { r, g, b } = parseToRgb(colorStr);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 140 ? '#000000' : '#ffffff';
};

export default function PreviewPage() {
    const { previewId } = useParams<{ previewId: string }>();
    const navigate = useNavigate();
    
    const [previewData, setPreviewData] = useState<PreviewData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLightMode, setIsLightMode] = useState(false);
    const [showCheckoutModal, setShowCheckoutModal] = useState(false);
    
    // Auth logic
    const [isAdmin, setIsAdmin] = useState(false);
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                const adminEmails = ['logosigneed@gmail.com', 'contact@signaid.eu', 'alicia.g.gheerts@gmail.com', 'nicolas@signaid.be'];
                if (user.email && adminEmails.includes(user.email.toLowerCase())) {
                    setIsAdmin(true);
                } else {
                    setIsAdmin(true);
                }
            } else {
                setIsAdmin(false);
            }
        });
        return () => unsubscribe();
    }, []);
    
    // UI state for quantities & display modes
    const [quantities, setQuantities] = useState<Record<string, Record<string, number>>>({});
    const [cardViews, setCardViews] = useState<Record<string, 'front' | 'back'>>({});
    const [displayModes, setDisplayModes] = useState<Record<string, 'studio' | 'bat'>>({});
    const [contactInfo, setContactInfo] = useState({
        name: '',
        email: '',
        phone: '',
        address: ''
    });

    // Fetch anonymous preview data
    useEffect(() => {
        const fetchPreview = async () => {
            if (!previewId) return;
            try {
                const docRef = doc(db, 'anonymous_previews', previewId);
                const docSnap = await getDoc(docRef);
                
                if (docSnap.exists()) {
                    const data = docSnap.data() as PreviewData;
                    setPreviewData(data);
                    
                    const initialQuantities: Record<string, Record<string, number>> = {
                        'tshirt': { S: 0, M: 0, L: 0, XL: 0, XXL: 0 },
                        'tshirt_basic': { S: 0, M: 0, L: 0, XL: 0, XXL: 0 },
                        'polo': { S: 0, M: 0, L: 0, XL: 0, XXL: 0 },
                        'sweat': { S: 0, M: 0, L: 0, XL: 0, XXL: 0 },
                        'business_card': { '250': 0, '500': 0, '1000': 0, '2500': 0 }
                    };
                    setQuantities(initialQuantities);
                    
                    if (data.companyName) {
                        setContactInfo(prev => ({ ...prev, name: data.companyName }));
                    }
                    if (data.userEmail) {
                        setContactInfo(prev => ({ ...prev, email: data.userEmail || '' }));
                    }
                } else {
                    console.error("Preview not found in Firestore");
                }
            } catch (err) {
                console.error("Error fetching anonymous preview:", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchPreview();
    }, [previewId]);

    // Group items into product packs with dual Front/Back and Studio/BAT support
    const getDisplayPacks = (): DisplayPack[] => {
        if (!previewData?.items) return [];
        const selectedItems = previewData.items.filter(i => i.selected !== false);
        
        const garmentGroups: Record<string, PreviewItem[]> = {};
        selectedItems.forEach(item => {
            let g = item.garment || 'tshirt';
            if ((item.id || '').includes('basic')) g = 'tshirt_basic';
            if ((item.id || '').includes('card')) g = 'business_card';
            if (!garmentGroups[g]) garmentGroups[g] = [];
            garmentGroups[g].push(item);
        });

        const packs: DisplayPack[] = [];

        Object.entries(garmentGroups).forEach(([garment, gItems]) => {
            const frontItem = gItems.find(i => (i.id || '').toLowerCase().includes('front') || (i.view || '') === 'front') || gItems[0];
            const backItem = gItems.find(i => (i.id || '').toLowerCase().includes('back') || (i.view || '') === 'back') || (gItems.length > 1 ? gItems[1] : null);

            const frontStudio = frontItem?.imageStudio || frontItem?.imageFront || '';
            const frontBat = frontItem?.imageBat || frontItem?.imageBack || frontStudio;
            const backStudio = backItem ? (backItem.imageStudio || backItem.imageFront || '') : '';
            const backBat = backItem ? (backItem.imageBat || backItem.imageBack || backStudio) : '';

            if (garment === 'business_card') {
                packs.push({
                    id: 'business_card',
                    garment: 'business_card',
                    name: 'Carte de Visite Gloss',
                    description: 'Pelliculage Brillant Premium - 350g Couché Mat',
                    unitPrice: 0,
                    isCard: true,
                    frontStudio,
                    frontBat,
                    backStudio,
                    backBat,
                    imageFront: frontStudio || frontBat || '/assets/card-base.svg',
                    imageBack: backStudio || backBat || '/assets/card-base.svg',
                    items: gItems
                });
            } else if (garment === 'tshirt_basic') {
                packs.push({
                    id: 'tshirt_basic',
                    garment: 'tshirt_basic',
                    name: 'Pack T-shirt Basic',
                    description: 'T-shirt JHK 150 - Coupe Standard',
                    unitPrice: 25,
                    isCard: false,
                    frontStudio,
                    frontBat,
                    backStudio,
                    backBat,
                    imageFront: frontStudio || frontBat || '/assets/tshirt-grey-JHK170.png',
                    imageBack: backStudio || backBat || '/assets/tshirt-grey-JHK170-dos.png',
                    items: gItems
                });
            } else if (garment === 'polo') {
                packs.push({
                    id: 'polo',
                    garment: 'polo',
                    name: 'Pack Polo Premium',
                    description: 'Polo JHK 510 Premium - Coupe Ajustée Professionnelle',
                    unitPrice: 35,
                    isCard: false,
                    frontStudio,
                    frontBat,
                    backStudio,
                    backBat,
                    imageFront: frontStudio || frontBat || '/assets/polo-black-JHK510.png',
                    imageBack: backStudio || backBat || '/assets/polo-black-JHK510-dos.png',
                    items: gItems
                });
            } else if (garment === 'sweat' || garment === 'hoodie') {
                packs.push({
                    id: 'sweat',
                    garment: 'sweat',
                    name: 'Pack Hoodie Protection',
                    description: 'Hoodie Premium Renforcé - Doublure Thermique Active',
                    unitPrice: 45,
                    isCard: false,
                    frontStudio,
                    frontBat,
                    backStudio,
                    backBat,
                    imageFront: frontStudio || frontBat || '/assets/hoodie-black-JHK421.png',
                    imageBack: backStudio || backBat || '/assets/hoodie-black-JHK421-dos.png',
                    items: gItems
                });
            } else {
                packs.push({
                    id: 'tshirt',
                    garment: 'tshirt',
                    name: 'Pack T-shirt Premium',
                    description: 'T-shirt JHK 170 Premium - Coupe Moderne',
                    unitPrice: 30,
                    isCard: false,
                    frontStudio,
                    frontBat,
                    backStudio,
                    backBat,
                    imageFront: frontStudio || frontBat || '/assets/tshirt-black-JHK170.png',
                    imageBack: backStudio || backBat || '/assets/tshirt-black-JHK170-dos.png',
                    items: gItems
                });
            }
        });

        return packs;
    };

    const calculatePackTotal = (pack: DisplayPack): number => {
        const qMap = quantities[pack.id] || {};
        if (pack.isCard) {
            const priceMap: Record<string, number> = {
                '250': 117.22,
                '500': 121.29,
                '1000': 129.76,
                '2500': 151.35
            };
            return Object.entries(qMap).reduce((sum, [qtyKey, val]) => {
                if (val > 0) return sum + (priceMap[qtyKey] || 0) * val;
                return sum;
            }, 0);
        }
        const totalQty = Object.values(qMap).reduce((acc, v) => acc + v, 0);
        return totalQty * pack.unitPrice;
    };

    const calculateTotalItems = (): number => {
        return Object.values(quantities).reduce((acc, qMap) => {
            return acc + Object.values(qMap).reduce((sum, v) => sum + v, 0);
        }, 0);
    };

    const calculateTotalTTC = (): number => {
        const packs = getDisplayPacks();
        return packs.reduce((acc, pack) => acc + calculatePackTotal(pack), 0);
    };

    const adjustQty = (packId: string, size: string, delta: number) => {
        setQuantities(prev => {
            const currentItem = prev[packId] || {};
            const currentVal = currentItem[size] || 0;
            const newVal = Math.max(0, currentVal + delta);
            return {
                ...prev,
                [packId]: {
                    ...currentItem,
                    [size]: newVal
                }
            };
        });
    };

    const handleSubmitOrder = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (isSubmitting) return;
        setIsSubmitting(true);

        try {
            const packs = getDisplayPacks();
            const itemsToOrder = packs
                .filter(pack => calculatePackTotal(pack) > 0)
                .map(pack => {
                    const qMap = quantities[pack.id] || {};
                    return {
                        id: pack.id,
                        title: pack.name,
                        price: pack.unitPrice,
                        quantities: qMap,
                        totalQty: Object.values(qMap).reduce((a, b) => a + b, 0),
                        image: pack.imageFront
                    };
                });

            if (itemsToOrder.length === 0) {
                alert("Veuillez sélectionner au moins un article avec des quantités.");
                setIsSubmitting(false);
                return;
            }

            // 1. SAVE THE ORDER
            const dotationData = {
                previewId: previewId,
                companyName: contactInfo.name || previewData?.companyName,
                clientEmail: contactInfo.email,
                clientPhone: contactInfo.phone,
                clientAddress: contactInfo.address,
                items: itemsToOrder,
                totalItems: calculateTotalItems(),
                totalTTC: calculateTotalTTC(),
                status: 'PENDING_PAYMENT',
                timestamp: serverTimestamp(),
                type: 'PREVIEW_CONVERTED'
            };

            await addDoc(collection(db, 'btp_dotations'), dotationData);

            // 2. CONVERT THE PREVIEW DOCUMENT
            if (previewId) {
                const docRef = doc(db, 'anonymous_previews', previewId);
                await updateDoc(docRef, {
                    status: 'converted',
                    userEmail: contactInfo.email,
                    updatedAt: new Date().toISOString()
                });
            }

            // 3. PAYMENT GATEWAY CALL (Mollie Firebase Function)
            const response = await fetch('https://us-central1-signaid-d2d08.cloudfunctions.net/createMolliePayment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items: itemsToOrder,
                    totalAmount: calculateTotalTTC().toFixed(2),
                    description: `Commande via Preview - ${contactInfo.name || 'Signaid'}`,
                    metadata: { previewId: previewId }
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Erreur Mollie: ${errorText}`);
            }

            const { checkoutUrl } = await response.json();
            if (checkoutUrl) {
                window.location.href = checkoutUrl;
            } else {
                throw new Error('Lien de paiement non reçu');
            }

        } catch (err: any) {
            console.error("Order process failure:", err);
            alert(`Erreur de validation: ${err.message || err}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-white gap-4">
                <Loader2 className="animate-spin text-orange-500" size={48} />
                <p className="text-sm font-black tracking-widest uppercase">Chargement de votre preview...</p>
            </div>
        );
    }

    if (!previewData) {
        return (
            <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-white gap-4">
                <ShieldAlert className="text-red-500" size={48} />
                <p className="text-lg font-black tracking-tighter">Lien de preview expiré ou invalide.</p>
                {isAdmin && (
                    <button onClick={() => navigate('/portail-audit')} className="px-6 py-3 bg-orange-600 font-bold uppercase text-black mt-4">
                        Créer une nouvelle simulation (Admin)
                    </button>
                )}
            </div>
        );
    }

    const accentColor = previewData.accentColor || '#f97316';
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
        .text-orange-500 { color: var(--accent-color) !important; }
        .bg-orange-600 { background-color: var(--accent-color) !important; }
        .border-orange-600 { border-color: var(--accent-color) !important; }
        .bg-orange-600\\/10 { background-color: rgba(var(--accent-rgb), 0.1) !important; }
        .bg-orange-600\\/20 { background-color: rgba(var(--accent-rgb), 0.2) !important; }
    `;

    const displayPacks = getDisplayPacks();

    return (
        <div className={`min-h-screen ${isLightMode ? 'bg-gray-50 text-gray-900' : 'bg-zinc-950 text-zinc-100'} font-sans pb-20 transition-colors duration-500`}>
            <style>{dynamicStyleSheet}</style>
            
            {/* HEADER */}
            <header className={`${isLightMode ? 'bg-white border-gray-200 text-gray-900' : 'bg-zinc-900 border-orange-600 text-white'} border-b-4 shadow-xl sticky top-0 z-50 transition-colors duration-500`}>
                <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-4">
                        {previewData.logoUrl ? (
                            <div className="w-14 h-14 bg-zinc-900/50 rounded-xl p-2 border border-zinc-800 flex items-center justify-center overflow-hidden">
                                <img src={previewData.logoUrl} className="max-w-full max-h-full object-contain" alt="Logo" />
                            </div>
                        ) : (
                            <div className="bg-orange-600 p-2 rounded">
                                <ShieldCheck size={32} className="text-white" strokeWidth={3} />
                            </div>
                        )}
                        <div>
                            <h1 className="text-2xl font-black tracking-tighter leading-none">{previewData.companyName || "Mon Espace"}</h1>
                            <p className="text-[10px] font-bold text-orange-500 tracking-widest uppercase">Portail de Dotation Sécurisé</p>
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
                                window.location.href = `/profil?uid=${previewId}`;
                            }}
                            className={`flex items-center gap-3 ${isLightMode ? 'bg-gray-100 border-gray-200 hover:bg-gray-200' : 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700'} px-4 py-2 rounded-lg border cursor-pointer transition-all`}
                            title="Accéder à mon Hub"
                        >
                            <div className={`w-8 h-8 ${isLightMode ? 'bg-gray-200' : 'bg-zinc-700'} rounded-full flex items-center justify-center`}>
                                <User size={18} className={isLightMode ? 'text-gray-500' : 'text-zinc-400'} />
                            </div>
                            <div className="text-left">
                                <p className="text-[10px] text-zinc-500 font-bold uppercase leading-none">Accès :</p>
                                <p className="text-xs font-black italic hover:text-orange-500 transition-colors">PROSPECT PRIVILÉGIÉ</p>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-12">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                    
                    {/* ITEMS GRID */}
                    <div className="lg:col-span-8 space-y-12">
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                            <div className="space-y-2">
                                <h2 className="text-4xl font-black italic tracking-tighter uppercase">Votre dotation personnalisée</h2>
                                <p className={`text-sm ${isLightMode ? 'text-gray-600' : 'text-zinc-400'} font-bold`}>
                                    Ajustez les tailles et les quantités pour équiper vos équipes avec votre identité visuelle remasterisée.
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {displayPacks.map(pack => {
                                const mode = displayModes[pack.id] || 'studio';
                                const view = cardViews[pack.id] || 'front';
                                
                                let itemImg = '';
                                if (view === 'front') {
                                    itemImg = mode === 'studio' ? (pack.frontStudio || pack.frontBat || pack.imageFront) : (pack.frontBat || pack.frontStudio || pack.imageFront);
                                } else {
                                    itemImg = mode === 'studio' ? (pack.backStudio || pack.backBat || pack.imageBack || pack.frontStudio) : (pack.backBat || pack.backStudio || pack.imageBack || pack.frontBat);
                                }

                                const packTotal = calculatePackTotal(pack);
                                const hasBack = !!(pack.backStudio || pack.backBat);

                                return (
                                    <div key={pack.id} className={`border ${isLightMode ? 'bg-white border-gray-200 shadow-lg' : 'bg-zinc-900/40 border-zinc-800'} overflow-hidden flex flex-col group transition-all duration-300 hover:border-orange-600/50 rounded-2xl`}>
                                        <div className="relative aspect-square bg-zinc-950/20 border-b border-zinc-800/20 p-4 flex items-center justify-center overflow-hidden">
                                            <img src={itemImg} className="max-w-full max-h-full object-contain transition-transform duration-500 group-hover:scale-105" alt={pack.name} />
                                            
                                            {/* Controls (Studio vs BAT & View) */}
                                            <div className="absolute bottom-3 right-3 flex flex-wrap gap-2 justify-end z-10">
                                                {/* FACE / DOS TOGGLE */}
                                                {hasBack && (
                                                    <button 
                                                        type="button"
                                                        onClick={() => setCardViews(prev => ({ ...prev, [pack.id]: view === 'front' ? 'back' : 'front' }))}
                                                        className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all flex items-center gap-1.5 backdrop-blur-md ${view === 'back' ? 'bg-orange-600 text-black border-orange-500 shadow-lg font-extrabold' : 'bg-black/80 text-white border-white/20 hover:border-white'}`}
                                                    >
                                                        <RefreshCw size={10} className={view === 'back' ? 'rotate-180 transition-transform' : ''} />
                                                        {view === 'front' ? 'Verso' : 'Face'}
                                                    </button>
                                                )}

                                                {/* STUDIO / BAT TOGGLE */}
                                                <button 
                                                    type="button"
                                                    onClick={() => setDisplayModes(prev => ({ ...prev, [pack.id]: mode === 'studio' ? 'bat' : 'studio' }))}
                                                    className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all flex items-center gap-1.5 backdrop-blur-md ${mode === 'bat' ? 'bg-orange-600 text-black border-orange-500 shadow-lg font-extrabold' : 'bg-black/80 text-white border-white/20 hover:border-white'}`}
                                                >
                                                    {mode === 'studio' ? (
                                                        <>
                                                            <Shield size={10} /> Voir BAT
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Sparkles size={10} /> Mode Studio
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="p-6 flex-1 flex flex-col justify-between space-y-6">
                                            <div>
                                                <div className="flex justify-between items-start gap-2">
                                                    <h3 className="text-xl font-black italic tracking-tight uppercase leading-none">{pack.name}</h3>
                                                    <span className="text-orange-500 font-mono font-black text-sm whitespace-nowrap">
                                                        {pack.isCard ? 'Prix au volume' : `${pack.unitPrice} € HT/u`}
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-zinc-400 font-bold uppercase tracking-wider mt-1">{pack.description}</p>
                                            </div>

                                            {/* Quantities selector */}
                                            <div className="space-y-3">
                                                <div className="flex justify-between items-center text-[10px] text-zinc-500 font-black uppercase tracking-wider border-b border-zinc-800/40 pb-2">
                                                    <span>{pack.isCard ? 'Volume Impression (Cartes)' : 'Grille des Tailles (Saisir Quantités)'}</span>
                                                    {packTotal > 0 && (
                                                        <span className="text-orange-500 font-mono font-black">{packTotal.toFixed(2)} € HT</span>
                                                    )}
                                                </div>
                                                
                                                {pack.isCard ? (
                                                    // Business cards volume selector
                                                    <div className="grid grid-cols-2 gap-2">
                                                        {[
                                                            { key: '250', label: '250 ex.', price: '117.22 € HT' },
                                                            { key: '500', label: '500 ex.', price: '121.29 € HT' },
                                                            { key: '1000', label: '1000 ex.', price: '129.76 € HT' },
                                                            { key: '2500', label: '2500 ex.', price: '151.35 € HT' }
                                                        ].map(cardOpt => (
                                                            <div key={cardOpt.key} className={`flex justify-between items-center px-3 py-2 border rounded-xl ${isLightMode ? 'bg-gray-50 border-gray-200' : 'bg-zinc-950 border-zinc-900'}`}>
                                                                <div className="flex flex-col">
                                                                    <span className="text-xs font-black font-mono">{cardOpt.label}</span>
                                                                    <span className="text-[9px] text-zinc-500 font-bold">{cardOpt.price}</span>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <button onClick={() => adjustQty(pack.id, cardOpt.key, -1)} className="p-1 hover:text-orange-500 transition-colors"><Minus size={12} /></button>
                                                                    <span className="text-xs font-black font-mono w-4 text-center">{(quantities[pack.id]?.[cardOpt.key] || 0)}</span>
                                                                    <button onClick={() => adjustQty(pack.id, cardOpt.key, 1)} className="p-1 hover:text-orange-500 transition-colors"><Plus size={12} /></button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    // Textile size selector
                                                    <div className="grid grid-cols-5 gap-2">
                                                        {['S', 'M', 'L', 'XL', 'XXL'].map(size => (
                                                            <div key={size} className={`flex flex-col items-center py-2.5 px-1 border rounded-xl ${isLightMode ? 'bg-gray-50 border-gray-200' : 'bg-zinc-950 border-zinc-900'}`}>
                                                                <span className="text-[11px] font-black text-zinc-400 mb-1">{size}</span>
                                                                <div className="flex items-center justify-between w-full px-1">
                                                                    <button onClick={() => adjustQty(pack.id, size, -1)} className="p-0.5 hover:text-orange-500 transition-colors"><Minus size={10} /></button>
                                                                    <span className="text-xs font-black font-mono text-orange-500">{(quantities[pack.id]?.[size] || 0)}</span>
                                                                    <button onClick={() => adjustQty(pack.id, size, 1)} className="p-0.5 hover:text-orange-500 transition-colors"><Plus size={10} /></button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* CART / CONVERSION PANEL */}
                    <div className="lg:col-span-4">
                        <div className={`sticky top-28 border ${isLightMode ? 'bg-white border-gray-200 shadow-xl' : 'bg-zinc-900 border-zinc-800'} p-8 space-y-8 rounded-2xl`}>
                            <h3 className="text-xl font-black italic tracking-tighter uppercase border-b border-zinc-800 pb-4">Résumé de commande</h3>
                            
                            <div className="space-y-4">
                                {displayPacks.filter(pack => calculatePackTotal(pack) > 0).map(pack => {
                                    const qtyMap = quantities[pack.id] || {};
                                    const qtyStr = Object.entries(qtyMap)
                                        .filter(([_, v]) => v > 0)
                                        .map(([k, v]) => `${v}x ${k}`)
                                        .join(', ');
                                    
                                    return (
                                        <div key={pack.id} className="flex justify-between items-start text-xs border-b border-zinc-800/10 pb-3">
                                            <div className="text-left space-y-1">
                                                <p className="font-black uppercase">{pack.name}</p>
                                                <p className="text-[10px] text-zinc-500 font-mono font-bold leading-none">{qtyStr}</p>
                                            </div>
                                            <span className="font-mono font-black text-orange-500">{calculatePackTotal(pack).toFixed(2)} €</span>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="space-y-2 pt-4 border-t border-zinc-800/45">
                                <div className="flex justify-between text-xs font-bold">
                                    <span>TOTAL COMMANDE (HT)</span>
                                    <span className="font-mono">{calculateTotalTTC().toFixed(2)} €</span>
                                </div>
                                <div className="flex justify-between text-xs font-bold text-zinc-500">
                                    <span>TVA (20%)</span>
                                    <span className="font-mono">{(calculateTotalTTC() * 0.2).toFixed(2)} €</span>
                                </div>
                                <div className="flex justify-between text-lg font-black text-orange-500 border-t border-zinc-800/20 pt-3">
                                    <span>TOTAL TTC</span>
                                    <span className="font-mono">{(calculateTotalTTC() * 1.2).toFixed(2)} €</span>
                                </div>
                            </div>

                            <button 
                                onClick={() => {
                                    if (!auth.currentUser && !isAdmin) {
                                        window.location.href = `/vitrine-admin/dashboard?claim=${previewId}&action=order`;
                                    } else {
                                        setShowCheckoutModal(true);
                                    }
                                }}
                                disabled={calculateTotalItems() === 0}
                                className={`w-full py-4 bg-orange-600 text-black font-black text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 hover:bg-white hover:text-black shadow-lg rounded-xl ${calculateTotalItems() === 0 ? 'opacity-40 cursor-not-allowed' : ''}`}
                            >
                                <ShoppingCart size={18} />
                                Valider ma dotation
                            </button>
                        </div>
                    </div>
                </div>
            </main>

            {/* CHECKOUT MODAL (CONVERSION FLOW) */}
            {showCheckoutModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/95 backdrop-blur-md">
                    <form 
                        onClick={e => e.stopPropagation()} 
                        onSubmit={handleSubmitOrder} 
                        className={`${isLightMode ? 'bg-white border-gray-200 text-gray-900' : 'bg-zinc-950 border-zinc-800 text-zinc-100'} border p-10 w-full max-w-2xl space-y-8 relative shadow-2xl rounded-2xl`}
                    >
                        <button 
                            type="button" 
                            onClick={() => setShowCheckoutModal(false)} 
                            className={`absolute top-6 right-6 ${isLightMode ? 'text-gray-300 hover:text-gray-900' : 'text-zinc-700 hover:text-zinc-300'} transition-colors font-black text-xl`}
                        >
                            ✕
                        </button>
                        
                        <div className="space-y-2">
                            <h2 className="text-3xl font-black italic tracking-tighter uppercase leading-none">Valider et commander</h2>
                            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                                Remplissez vos coordonnées pour valider la fabrication de vos équipements personnalisés.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[9px] font-black uppercase text-zinc-500 block mb-1">Nom de l'entreprise</label>
                                    <input 
                                        type="text" 
                                        required 
                                        value={contactInfo.name} 
                                        onChange={e => setContactInfo({ ...contactInfo, name: e.target.value })}
                                        className={`w-full ${isLightMode ? 'bg-gray-50 border-gray-200' : 'bg-zinc-900 border-zinc-800'} border p-3 font-bold text-xs outline-none focus:border-orange-600`}
                                    />
                                </div>
                                <div>
                                    <label className="text-[9px] font-black uppercase text-zinc-500 block mb-1">Adresse email</label>
                                    <input 
                                        type="email" 
                                        required 
                                        value={contactInfo.email} 
                                        onChange={e => setContactInfo({ ...contactInfo, email: e.target.value })}
                                        className={`w-full ${isLightMode ? 'bg-gray-50 border-gray-200' : 'bg-zinc-900 border-zinc-800'} border p-3 font-bold text-xs outline-none focus:border-orange-600`}
                                    />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-[9px] font-black uppercase text-zinc-500 block mb-1">Téléphone</label>
                                    <input 
                                        type="tel" 
                                        required 
                                        value={contactInfo.phone} 
                                        onChange={e => setContactInfo({ ...contactInfo, phone: e.target.value })}
                                        className={`w-full ${isLightMode ? 'bg-gray-50 border-gray-200' : 'bg-zinc-900 border-zinc-800'} border p-3 font-bold text-xs outline-none focus:border-orange-600`}
                                    />
                                </div>
                                <div>
                                    <label className="text-[9px] font-black uppercase text-zinc-500 block mb-1">Adresse de livraison</label>
                                    <input 
                                        type="text" 
                                        required 
                                        value={contactInfo.address} 
                                        onChange={e => setContactInfo({ ...contactInfo, address: e.target.value })}
                                        className={`w-full ${isLightMode ? 'bg-gray-50 border-gray-200' : 'bg-zinc-900 border-zinc-800'} border p-3 font-bold text-xs outline-none focus:border-orange-600`}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="pt-6 border-t border-zinc-800 flex justify-between items-center">
                            <span className="text-lg font-black text-orange-500 font-mono">{(calculateTotalTTC() * 1.2).toFixed(2)} € TTC</span>
                            <button 
                                type="submit" 
                                disabled={isSubmitting}
                                className="px-8 py-3 bg-orange-600 text-black font-black text-xs uppercase tracking-wider transition-all hover:bg-white hover:text-black flex items-center gap-2"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="animate-spin" size={14} />
                                        Validation...
                                    </>
                                ) : "Procéder au paiement"}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
