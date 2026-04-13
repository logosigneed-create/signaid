import React from 'react';
import { CartItem } from '../types';
import { productDatabase } from '../constants';
import { LazyImage } from './LazyImage';
import { getProxiedUrl } from '../utils/helpers';
import { CartItemRow } from './CartItemRow';

export const CartView: React.FC<{
    cart: CartItem[],
    onRemove: (id: string) => void,
    onBack: () => void,
    onPurchase: () => void,
    onRequestQuote: () => void,
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
    user: any
}> = ({ cart, onRemove, onBack, onPurchase, onRequestQuote, onEdit, onAddVariant, onUpdateItem, onUpdateService, isGuest, onAuthRequired, notifyGroupOrder, setNotifyGroupOrder, onGoToGallery, initialPromoCode, user }) => {
    const SHIPPING_COST = 6.99;

    // NEW STATE: Global Upsells & Promo
    const [atelierRetouch, setAtelierRetouch] = React.useState(false);
    const [atelierRefonte, setAtelierRefonte] = React.useState(false);
    const [promoCodeInput, setPromoCodeInput] = React.useState(initialPromoCode || '');
    const [promoDiscount, setPromoDiscount] = React.useState(0);
    const [promoError, setPromoError] = React.useState('');

    // Auto-apply promo code
    React.useEffect(() => {
        // GUEST PROMO LOGIC
        if (isGuest && !initialPromoCode) {
            const used = localStorage.getItem('guest_promo_used');
            if (!used) {
                setPromoCodeInput('SIGNAID15');
            }
        }

        if (promoCodeInput.trim().toUpperCase() === 'SIGNAID15') {
            setPromoDiscount(15);
            setPromoError('');
        } else {
            setPromoDiscount(0);
            if (promoCodeInput.trim().length > 0) {
                // Optional: setPromoError('Code invalide'); 
                setPromoError('');
            }
        }
    }, [promoCodeInput, isGuest, initialPromoCode]);

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

        cart.forEach(item => {
            const product = productDatabase[item.productType];
            if (!product) return;

            let itemQty = 0;
            Object.values(item.sizes).forEach((qty: number) => itemQty += qty);

            subtotal += itemQty * (item.calculatedPrice || product.price);
            itemsCount += itemQty;

            if (item.serviceRetouche) servicesTotal += 50;
            if (item.serviceModernisation) servicesTotal += 100;
        });

        const isBulkRetouch = itemsCount >= 10;
        const isQuoteOnly = itemsCount > 10;

        if (isBulkRetouch) {
            servicesTotal = 0;
            cart.forEach(item => {
                if (item.serviceModernisation) servicesTotal += 100;
            });
        }

        if (atelierRetouch) servicesTotal += 20; // Placeholder price
        if (atelierRefonte) servicesTotal += 50; // Placeholder price

        let total = subtotal + servicesTotal + SHIPPING_COST - promoDiscount;
        if (total < 0) total = 0;

        return { subtotal, servicesTotal, shipping: SHIPPING_COST, total, itemsCount, isBulkRetouch, isQuoteOnly };
    };

    const { subtotal, servicesTotal, shipping, total, itemsCount, isBulkRetouch, isQuoteOnly } = calculateTotals();

    return (
        <div className="max-w-4xl mx-auto p-4 pb-32 sm:pb-24 animate-fade-in text-gray-800 scrollbar-hide">
            {/* HEADER - NEW DESIGN */}
            <div className="relative mb-8 flex items-center justify-center">
                <button
                    onClick={onBack}
                    className="absolute left-0 w-10 h-10 flex items-center justify-center rounded-full bg-white text-gray-900 shadow-sm border border-gray-100 hover:bg-gray-50 transition-all z-10"
                    title="Retour à la création"
                >
                    <i className="fa-solid fa-arrow-left"></i>
                </button>
                <h2 className="text-3xl font-black text-center text-gray-900 uppercase tracking-wide">Votre Panier</h2>
            </div>

            {cart.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-3xl shadow-sm border border-gray-100">
                    <div className="bg-orange-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
                        <i className="fa-solid fa-basket-shopping text-4xl text-orange-500"></i>
                    </div>
                    <p className="text-gray-500 mb-8 text-lg font-medium">Votre panier est vide pour le moment.</p>
                    <button onClick={onGoToGallery || onBack} className="bg-gray-900 text-white font-bold py-4 px-10 rounded-full shadow-lg hover:bg-gray-800 transition-transform hover:-translate-y-1">
                        Découvrir la galerie
                    </button>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* CART ITEMS LIST */}
                    {cart.map((item) => {
                        const product = productDatabase[item.productType];
                        if (!product) return null;

                        return (
                            <CartItemRow
                                key={item.id}
                                item={item}
                                product={product}
                                onRemove={onRemove}
                                onUpdateItem={onUpdateItem}
                                onEdit={onEdit}
                                onAddVariant={onAddVariant}
                                isQuoteOnly={isQuoteOnly}
                            />
                        );
                    })}

                    {/* SUMMARY CARD (Bottom of list, before footer) */}
                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 mt-8">
                        {/* Services & Upsells (Keep functional but style minimalistic) */}
                        <div className="mb-6 space-y-3">
                            {/* Keep existing checkbox styles but cleaner */}
                            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                                <div className={`w-5 h-5 rounded-md border flex items-center justify-center ${notifyGroupOrder ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300 bg-white'}`}>
                                    {notifyGroupOrder && <i className="fa-solid fa-check text-xs"></i>}
                                </div>
                                <input type="checkbox" checked={notifyGroupOrder} onChange={(e) => setNotifyGroupOrder(e.target.checked)} className="hidden" />
                                <div className="flex-1">
                                    <span className="font-bold text-gray-900 block text-sm">Commande Groupée / BDE ?</span>
                                    <span className="text-xs text-gray-500">Je souhaite un devis personnalisé pour mon équipe.</span>
                                </div>
                            </label>

                            {/* Promo Code */}
                            <div className="relative">
                                <input
                                    type="text"
                                    value={promoCodeInput}
                                    onChange={(e) => setPromoCodeInput(e.target.value)}
                                    placeholder="CODE PROMO"
                                    className={`w-full p-4 bg-gray-50 border-2 rounded-xl text-sm font-bold uppercase outline-none focus:bg-white transition-colors ${promoDiscount > 0 ? 'border-green-500 text-green-700' : 'border-transparent focus:border-gray-200 text-gray-900'}`}
                                />
                                {promoDiscount > 0 && <i className="fa-solid fa-check-circle absolute right-4 top-1/2 -translate-y-1/2 text-green-500 text-xl"></i>}
                            </div>
                            {promoDiscount > 0 && <p className="text-green-600 text-xs font-bold px-2">Code appliqué ! -{promoDiscount}€</p>}
                        </div>

                        <div className="border-t border-gray-100 pt-6 flex flex-col gap-2">
                            <div className="flex justify-between items-center text-sm text-gray-500">
                                <span>Sous-total</span>
                                <span>{subtotal}€</span>
                            </div>
                            {servicesTotal > 0 && (
                                <div className="flex justify-between items-center text-sm text-orange-600 font-bold">
                                    <span>Options</span>
                                    <span>{servicesTotal}€</span>
                                </div>
                            )}
                            <div className="flex justify-between items-center text-sm text-gray-500">
                                <span>Livraison</span>
                                <span>{shipping}€</span>
                            </div>
                            <div className="flex justify-between items-center mt-2 pt-4 border-t border-gray-100">
                                <span className="text-xl font-black text-gray-900">Total</span>
                                <span className="text-3xl font-black text-gray-900">{total}€</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* FLOATING BOTTOM BAR (Like Design) */}
            {cart.length > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[95%] max-w-4xl bg-white rounded-3xl shadow-2xl shadow-gray-200 border border-gray-100 p-2 z-[100] flex items-center gap-2">
                    <button
                        onClick={onBack}
                        className="flex items-center gap-3 px-6 py-4 rounded-2xl hover:bg-gray-50 text-gray-900 font-bold transition-colors shrink-0"
                    >
                        <div className="w-8 h-8 rounded-full border-2 border-gray-900 flex items-center justify-center">
                            <i className="fa-solid fa-plus text-sm"></i>
                        </div>
                        <span className="hidden sm:inline uppercase text-sm tracking-wide">Ajouter un produit</span>
                    </button>

                    {isQuoteOnly ? (
                        <button
                            onClick={onRequestQuote}
                            className="flex-1 bg-gray-900 text-white h-14 rounded-2xl font-black uppercase tracking-wide flex items-center justify-center gap-3 hover:bg-gray-800 transition-colors shadow-lg shadow-gray-900/20"
                        >
                            <span>Demander Devis</span>
                            <i className="fa-solid fa-file-invoice"></i>
                        </button>
                    ) : (
                        <button
                            onClick={handlePurchaseClick}
                            className="flex-1 bg-gray-900 text-white h-14 rounded-2xl font-black uppercase tracking-wide flex items-center justify-center gap-3 hover:bg-gray-800 transition-colors shadow-lg shadow-gray-900/20"
                        >
                            <span>Commander</span>
                            <i className="fa-solid fa-bag-shopping"></i>
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};
