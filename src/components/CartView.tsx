import React from 'react';
import { CartItem } from '../types';
import { productDatabase } from '../constants';
import { LazyImage } from './LazyImage';
import { getProxiedUrl, calculateBaseUnitPrice, calculateMarkingFee } from '../utils/helpers';
import { CartItemRow } from './CartItemRow';
import { BatchProgressWidget } from './BatchProgressWidget';

export const CartView: React.FC<{
    cart: CartItem[],
    onRemove: (id: string) => void,
    onBack: () => void,
    onPurchase: () => void,
    onEdit: (item: CartItem, triggerAi?: boolean) => void,
    onAddVariant: (item: CartItem) => void,
    onUpdateItem: (itemId: string, size: string, delta: number) => void,
    onUpdateService?: (itemId: string, service: 'retouche' | 'modernisation', value: boolean) => void,
    isGuest: boolean,
    onAuthRequired: () => void,
    notifyGroupOrder: boolean,
    setNotifyGroupOrder: (v: boolean) => void,
    onGoToGallery?: () => void,
    initialPromoCode?: string,
    user: any,
    isExpress: boolean,
    setIsExpress: (v: boolean) => void,
    productsMapping?: any,
    pricingRules?: any
}> = ({ cart, onRemove, onBack, onPurchase, onEdit, onAddVariant, onUpdateItem, onUpdateService, isGuest, onAuthRequired, notifyGroupOrder, setNotifyGroupOrder, onGoToGallery, initialPromoCode, user, isExpress, setIsExpress, productsMapping, pricingRules }) => {
    const SHIPPING_COST = 6.99;

    // NEW STATE: Global Upsells & Promo
    const [atelierRetouch, setAtelierRetouch] = React.useState(false);
    const [atelierRefonte, setAtelierRefonte] = React.useState(false);
    const [promoCodeInput, setPromoCodeInput] = React.useState(initialPromoCode || '');
    const [promoDiscount, setPromoDiscount] = React.useState(0);
    const [promoError, setPromoError] = React.useState('');

    // Auto-apply promo code
    // Auto-apply promo code - TEMPORARILY DISABLED
    React.useEffect(() => {
        // AUTO-FILL LOGIC (Only runs once on mount if empty)
        // TEMPORARILY DISABLED - TO BE MANAGED FROM ADMIN
        // if (!initialPromoCode && !promoCodeInput) {
        //     const isGuestUsed = localStorage.getItem('guest_promo_used');
        //     const isUserUsed = user && user.usedCodes && user.usedCodes.includes('signeedclub15');

        //     if (!isGuestUsed && !isUserUsed) {
        //         setPromoCodeInput('signeedclub15');
        //     }
        // }
    }, []); // Run ONCE on mount

    // HANDLE PROMO CALCULATION - TEMPORARILY DISABLED
    React.useEffect(() => {
        // TEMPORARILY DISABLED - TO BE MANAGED FROM ADMIN
        // if (promoCodeInput.trim().toUpperCase() === 'signeedclub15') {
        //     setPromoDiscount(15);
        //     setPromoError('');
        // } else {
        //     setPromoDiscount(0);
        //     if (promoCodeInput.trim().length > 0) {
        //         setPromoError('');
        //     }
        // }
        setPromoDiscount(0); // Always 0 for now
    }, [promoCodeInput]);

    const handlePurchaseClick = () => {
        if (promoDiscount > 0 && isGuest) {
            localStorage.setItem('guest_promo_used', 'true');
        }
        onPurchase();
    };

    const calculateTotals = () => {
        let subtotal = 0;
        let servicesTotal = 0;
        let itemsCount = 0;
        let totalWeight = 0;

        cart.forEach(item => {
            const productBase = productsMapping || productDatabase;
            const product = productBase[item.productType];
            if (!product) return;

            let itemQty = 0;
            Object.values(item.sizes).forEach((qty: number) => itemQty += qty);

            // 1. Calculate Marking Fee (Additive)
            const combinedFee = calculateMarkingFee(item);

            // 2. Calculate Base Textile Price for each size
            Object.entries(item.sizes).forEach(([size, qty]) => {
                const quantity = qty as number;
                if (quantity <= 0) return;

                const baseUnitPrice = calculateBaseUnitPrice(product, size, item.color, pricingRules, itemQty);
                const itemUnitPrice = baseUnitPrice + combinedFee;

                subtotal += quantity * itemUnitPrice;
                itemsCount += quantity;
            });

            if (product.weight) {
                totalWeight += product.weight * itemQty;
            }

            if (item.serviceRetouche || item.isRetouchingService) servicesTotal += 50;
            if (item.serviceModernisation || item.isModernizationService) servicesTotal += 100;
        });

        const isBulkRetouch = itemsCount >= 10;
        // const isQuoteOnly = itemsCount >= 10; // Removed quote logic

        if (isBulkRetouch) {
            servicesTotal = 0;
            // Refonte is OFF for bulk > 10
        }

        if (atelierRetouch) servicesTotal += 20; // Placeholder price
        if (atelierRefonte) servicesTotal += 50; // Placeholder price

        let currentShipping = SHIPPING_COST;
        // Commande Groupée logic: Free shipping if total value >= 200 or total weight >= 200
        if (subtotal >= 200 || totalWeight >= 200) {
            currentShipping = 0;
        }

        const expressFee = isExpress ? 12 : 0;
        let total = subtotal + servicesTotal + currentShipping + expressFee - promoDiscount;
        
        // CRITICAL FALLBACK (Consistent with main App)
        if (total <= 0 && cart.length > 0) {
            const productBase = productsMapping || productDatabase;
            cart.forEach(item => {
                const product = productBase[item.productType];
                if (product) {
                    const markingFee = Number(calculateMarkingFee(item)) || 0;
                    const basePrice = Number(product.price) || 15;
                    total += (basePrice + markingFee);
                }
            });
            if (total <= 0) total = 0.01;
        }

        if (total < 0) total = 0;

        return { subtotal, servicesTotal, shipping: currentShipping, expressFee, total, itemsCount, isBulkRetouch, totalWeight };
    };

    const { subtotal, servicesTotal, shipping, expressFee, total, itemsCount, isBulkRetouch } = calculateTotals();

    return (
        <div className="max-w-[1025px] mx-auto p-4 pb-32 sm:pb-24 animate-fade-in text-gray-800 scrollbar-hide overflow-x-hidden">
            {/* HEADER - NEW DESIGN */}
            <div className="relative mb-6 flex items-center justify-center">
                <button
                    onClick={onBack}
                    className="absolute left-0 w-10 h-10 flex items-center justify-center rounded-full bg-white text-gray-900 shadow-sm border border-gray-100 hover:bg-gray-50 transition-all z-10"
                    title="Retour à la création"
                >
                    <i className="fa-solid fa-arrow-left"></i>
                </button>
                <h2 className="text-2xl md:text-3xl font-black text-center text-gray-900 uppercase tracking-wide">Mes Projets</h2>
            </div>

            {/* CART ITEMS LIST */}
            <div className="space-y-4 mb-8">
                {cart.length === 0 ? (
                    <div className="text-center py-12 flex flex-col items-center justify-center">
                        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 mb-4">
                            <i className="fa-solid fa-cart-shopping text-3xl"></i>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900">Aucun projet en cours</h3>
                        <p className="text-gray-500 mt-2 mb-6">Commencez par configurer votre premier actif !</p>
                        <button onClick={onBack} className="bg-gray-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-black transition-all">
                            Créer mon design
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="space-y-4">
                            {cart.map((item) => {
                                const productBase = productsMapping || productDatabase;
                                const product = productBase[item.productType];
                                if (!product) return null;
                                return (
                                    <CartItemRow
                                        key={item.id}
                                        item={item}
                                        product={product}
                                        onRemove={() => onRemove(item.id)}
                                        onEdit={() => onEdit(item)}
                                        onAddVariant={() => onAddVariant(item)}
                                        onUpdateItem={(id, size, delta) => onUpdateItem(id, size, delta)}
                                        pricingRules={pricingRules}
                                    />
                                );
                            })}
                        </div>

                        {/* SUMMARY SECTION */}
                        <div className="mt-8 bg-white p-6 rounded-3xl border border-gray-100 shadow-xl shadow-gray-100/50 space-y-4">
                            <div className="flex justify-between text-gray-500 font-medium">
                                <span>Sous-total</span>
                                <span>{subtotal.toFixed(2)} €</span>
                            </div>

                            <div className="flex justify-between text-gray-500 font-medium">
                                <span>Frais de livraison</span>
                                <span>{shipping === 0 ? 'Offert' : `${shipping.toFixed(2)} €`}</span>
                            </div>

                            <div className="flex justify-between items-center text-sm text-gray-600 bg-blue-50/50 p-4 rounded-2xl border border-blue-100/50">
                                <div className="flex items-center gap-3">
                                    <input
                                        type="checkbox"
                                        id="express-order-external"
                                        checked={isExpress}
                                        onChange={(e) => setIsExpress(e.target.checked)}
                                        className="w-5 h-5 text-orange-600 rounded border-gray-300 focus:ring-orange-500 cursor-pointer"
                                    />
                                    <label htmlFor="express-order-external" className="flex flex-col cursor-pointer">
                                        <span className="font-bold text-gray-900">Commande Express</span>
                                        <span className="text-xs text-gray-500">Production & Livraison Prioritaire</span>
                                    </label>
                                </div>
                                <span className="font-bold text-orange-600 text-lg">+12.00 €</span>
                            </div>

                            <div className="pt-6 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                                <div className="flex flex-col items-center sm:items-start">
                                    <span className="text-sm font-black text-gray-400 uppercase tracking-widest">Total TTC à payer</span>
                                    <div className="flex items-center gap-2 mt-1">
                                        <div className="flex items-center gap-1 px-2 py-0.5 bg-gray-50 rounded-md border border-gray-100">
                                            <i className="fa-solid fa-shirt text-[10px] text-gray-400"></i>
                                            <span className="text-[10px] font-bold text-gray-500 uppercase">Textile + Forfait Impression</span>
                                        </div>
                                    </div>
                                </div>
                                <span className="text-5xl font-black text-orange-600 drop-shadow-sm select-none">
                                    {total.toFixed(2)} <span className="text-3xl ml-[-8px]">€</span>
                                </span>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Team Offer Progression Bar */}
            {cart.length > 0 && (
                <div className="mb-40 animate-fade-in-up">
                    <BatchProgressWidget localQty={itemsCount} />
                </div>
            )}

            {/* FLOATING BOTTOM BAR */}
            {cart.length > 0 && (
                <div className="fixed bottom-6 left-4 right-4 max-w-4xl mx-auto bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl shadow-gray-200 border border-gray-100/50 p-2 z-[100] flex items-center gap-2">
                    <button
                        onClick={onBack}
                        className="flex items-center justify-center w-14 h-14 rounded-2xl hover:bg-gray-50 text-gray-900 transition-colors shrink-0"
                        title="Ajouter un produit"
                    >
                        <div className="w-8 h-8 rounded-full border-2 border-gray-900 flex items-center justify-center">
                            <i className="fa-solid fa-plus text-sm"></i>
                        </div>
                    </button>

                    <button
                        onClick={handlePurchaseClick}
                        className="flex-1 bg-gray-900 text-white h-14 rounded-2xl font-black uppercase tracking-wide flex items-center justify-between px-6 hover:bg-black transition-all shadow-lg shadow-gray-900/20 active:scale-[0.98]"
                    >
                        <div className="flex flex-col items-start leading-tight">
                            <span className="text-[10px] text-gray-400 font-bold opacity-80">Lancer la production</span>
                            <span className="text-lg">{total.toFixed(2)} €</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="hidden sm:inline">Payer maintenant</span>
                            <i className="fa-solid fa-chevron-right text-xs"></i>
                        </div>
                    </button>
                </div>
            )}
        </div>
    );
};
