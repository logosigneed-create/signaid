import React, { useState } from 'react';
import { CartItem, Product } from '../types';
import { CartItemImage } from './CartItemImage';
import { DesignThumbnail } from './DesignThumbnail';
import { getProxiedUrl } from '../utils/helpers';
import { COLOR_NAMES } from '../constants';

interface CartItemRowProps {
    item: CartItem;
    product: Product;
    onRemove: (id: string) => void;
    onUpdateItem: (id: string, size: string, delta: number) => void;
    onEdit: (item: CartItem, triggerAi?: boolean) => void;
    onAddVariant: (item: CartItem) => void;
    isQuoteOnly: boolean;
}

export const CartItemRow: React.FC<CartItemRowProps> = ({
    item,
    product,
    onRemove,
    onUpdateItem,
    onEdit,
    onAddVariant,
    isQuoteOnly
}) => {
    // Separate state for Ghost Image (Right Column) - Always Face or Back
    const [ghostView, setGhostView] = useState<'face' | 'back'>('face');
    const [isSizesExpanded, setIsSizesExpanded] = useState(false);
    const missingSizes = product.sizes ? product.sizes.filter(s => !item.sizes[s]) : [];

    const totalQty = Object.values(item.sizes).reduce((a, b) => (a as number) + (b as number), 0);
    const itemUnitPrice = item.calculatedPrice || product.price;
    const itemTotalSubtotal = totalQty * itemUnitPrice;

    return (
        <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 flex flex-col md:flex-row shadow-sm transition-transform hover:scale-[1.01]">

            {/* Visual Column - ALWAYS SPLIT LAYOUT */}
            <div className="flex flex-col w-full md:w-[440px] bg-gray-50/50 flex-shrink-0 border-b md:border-b-0 md:border-r border-gray-100 pb-4">
                <div className="flex flex-row w-full h-full">
                    {/* LEFT COLUMN: AI Image OR AI Launcher */}
                    <div className="flex flex-col w-1/2 bg-gray-50/50 flex-shrink-0 border-r border-gray-100 relative group/ai">
                        {item.aiImageUrl ? (
                            <>
                                <div className="relative w-full aspect-[3/4] group overflow-hidden">
                                    <div className="w-full h-full cursor-pointer animate-fade-in" onClick={() => onEdit(item)}>
                                        <div className="absolute top-3 left-3 bg-gray-900/90 text-white text-[10px] font-black px-2 py-1 rounded-lg shadow-lg backdrop-blur-md z-10 flex items-center gap-1.5 uppercase tracking-widest">
                                            <i className="fa-solid fa-shirt"></i>
                                            Modèle IA
                                        </div>
                                        <CartItemImage
                                            src={item.aiImageUrl}
                                            className="w-full h-full !object-contain"
                                            alt={product.name + " AI"}
                                        />
                                    </div>
                                </div>
                                {/* AI BACKGROUND LOADER (Overlay) */}
                                {item.isAiGenerating && (
                                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-20 flex flex-col items-center justify-center text-white p-4 text-center">
                                        <div className="relative mb-3">
                                            <div className="w-12 h-12 border-4 border-white/20 border-t-orange-500 rounded-full animate-spin"></div>
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <i className="fa-solid fa-wand-magic-sparkles text-orange-500 text-sm animate-pulse"></i>
                                            </div>
                                        </div>
                                        <p className="text-[10px] font-black uppercase tracking-widest animate-pulse">IA en cours...</p>
                                    </div>
                                )}
                            </>
                        ) : item.isAiGenerating ? (
                            /* FULL LOADER (No image yet) */
                            <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100/50 p-4 text-center animate-pulse">
                                <div className="relative mb-3">
                                    <div className="w-12 h-12 border-4 border-gray-200 border-t-orange-500 rounded-full animate-spin"></div>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <i className="fa-solid fa-wand-magic-sparkles text-orange-500 text-sm"></i>
                                    </div>
                                </div>
                                <p className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Génération IA...</p>
                                <p className="text-[8px] text-gray-500 mt-1 italic leading-tight px-2">L'image apparaîtra ici automatiquement</p>
                            </div>
                        ) : (
                            // PLACEHOLDER / LAUNCHER (Default state)
                            <div
                                className="w-full h-full flex flex-col items-center justify-center p-4 cursor-pointer hover:bg-purple-50 transition-colors group/launcher"
                                onClick={(e) => { e.stopPropagation(); onEdit(item, true); }}
                            >
                                <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center mb-3 group-hover/launcher:scale-110 transition-transform shadow-sm">
                                    <i className="fa-solid fa-wand-magic-sparkles text-purple-600 text-2xl"></i>
                                </div>
                                <span className="text-xs font-black text-gray-900 uppercase tracking-wider text-center">
                                    Générer avec l'IA
                                </span>
                                <span className="text-[9px] text-gray-500 text-center mt-1 px-4 leading-tight">
                                    Visualisez ce design sur un modèle réel
                                </span>
                            </div>
                        )}
                    </div>

                    {/* RIGHT COLUMN: Ghost Image (Face/Back) */}
                    <div className="flex flex-col w-1/2 bg-gray-50/50 flex-shrink-0">
                        <div className="relative w-full aspect-[3/4] group overflow-hidden">
                            <div className="w-full h-full cursor-pointer animate-fade-in" onClick={() => onEdit(item)}>
                                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur rounded-lg shadow-sm border border-gray-100 p-1 flex z-10" onClick={(e) => e.stopPropagation()}>
                                    <button
                                        onClick={() => setGhostView('face')}
                                        className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest transition-all ${ghostView === 'face' ? 'bg-orange-500 text-white shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                                    >
                                        Face
                                    </button>
                                    <button
                                        onClick={() => setGhostView('back')}
                                        className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest transition-all ${ghostView === 'back' ? 'bg-orange-500 text-white shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                                    >
                                        Dos
                                    </button>
                                </div>

                                {ghostView === 'back' ? (
                                    item.previewImageUrlBack ? (
                                        <CartItemImage
                                            src={item.previewImageUrlBack}
                                            alt="Back View"
                                            className="w-full h-full object-contain mix-blend-multiply"
                                        />
                                    ) : (
                                        <DesignThumbnail
                                            item={item}
                                            product={product}
                                            side="back"
                                            className="w-full h-full"
                                        />
                                    )
                                ) : (
                                    item.previewImageUrlFront ? (
                                        <CartItemImage
                                            src={item.previewImageUrlFront}
                                            alt="Front View"
                                            className="w-full h-full object-contain mix-blend-multiply"
                                        />
                                    ) : (
                                        <DesignThumbnail
                                            item={item}
                                            product={product}
                                            side="front"
                                            className="w-full h-full"
                                        />
                                    )
                                )}
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            <div className="p-6 flex-1 flex flex-col justify-between gap-6 bg-white border-t md:border-t-0 md:border-l border-gray-100">
                <div className="flex justify-between items-start">
                    <div className="space-y-1">
                        <h3 className="font-extrabold text-xl text-gray-900 tracking-tight">{product.name}</h3>
                        <div className="flex items-center gap-2">
                            <p className="text-sm text-gray-500 font-medium">
                                {COLOR_NAMES[item.color] || item.color}
                            </p>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="font-black text-gray-900 text-2xl">
                            {!isQuoteOnly && <>{itemTotalSubtotal.toFixed(2)} €</>}
                        </div>
                        {!isQuoteOnly && <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">TVAincl. + Impression</div>}
                        <button onClick={() => onRemove(item.id)} className="text-red-400 hover:text-red-600 text-[10px] font-black uppercase tracking-widest mt-6 flex items-center justify-end gap-1 group transition-colors">
                            <i className="fa-solid fa-trash-can group-hover:animate-bounce"></i>
                            <span>Supprimer tout</span>
                        </button>
                    </div>
                </div>

                <div className="space-y-3 bg-gray-50/80 p-4 rounded-xl border border-gray-100/50">
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Taille</span>
                        <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider mr-12">Quantité</span>
                        {!isQuoteOnly && <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Sous-total</span>}
                    </div>
                    {Object.entries(item.sizes).map(([size, qty]) => (
                        (qty as number) > 0 && (
                            <div key={size} className="flex items-center justify-between group/size">
                                <span className="font-black text-gray-900 w-8 text-lg">{size}</span>

                                <div className="flex items-center gap-3 bg-white px-2 py-1 rounded-lg border border-gray-200 shadow-sm">
                                    <button
                                        onClick={() => onUpdateItem(item.id, size, -1)}
                                        className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-md transition-all active:scale-90"
                                    >
                                        <i className="fa-solid fa-minus text-xs"></i>
                                    </button>
                                    <span className="font-black text-gray-900 w-6 text-center tabular-nums">{qty as number}</span>
                                    <button
                                        onClick={() => onUpdateItem(item.id, size, 1)}
                                        className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-md transition-all active:scale-90"
                                    >
                                        <i className="fa-solid fa-plus text-xs"></i>
                                    </button>
                                </div>

                                {!isQuoteOnly && (
                                    <span className="font-bold text-gray-900 text-sm min-w-[70px] text-right tabular-nums">
                                        {((qty as number) * itemUnitPrice).toFixed(2)} €
                                    </span>
                                )}
                            </div>
                        )
                    ))}

                </div>

                {/* QUICK ADD SIZE (Collapsed by default) */}
                {missingSizes.length > 0 && (
                    <div className="pt-2 border-t border-gray-100">
                        {!isSizesExpanded ? (
                            <button
                                onClick={() => setIsSizesExpanded(true)}
                                className="text-xs font-bold text-orange-500 hover:text-orange-600 flex items-center gap-1"
                            >
                                <i className="fa-solid fa-plus-circle"></i> Ajouter d'autres tailles
                            </button>
                        ) : (
                            <div className="animate-fade-in">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-xs font-bold text-gray-400 uppercase">Ajout rapide</span>
                                    <button onClick={() => setIsSizesExpanded(false)} className="text-xs text-gray-400 hover:text-gray-600">
                                        Fermer
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {missingSizes.map(size => (
                                        <button
                                            key={size}
                                            onClick={() => onUpdateItem(item.id, size, 1)}
                                            className="px-3 py-1.5 bg-white border border-dashed border-gray-300 rounded text-xs font-bold text-gray-500 hover:border-orange-500 hover:text-orange-500 hover:bg-orange-50 transition-all"
                                        >
                                            + {size}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* BOTTOM ACTIONS */}
                <div className="flex gap-2 pt-2 border-t border-gray-100 mt-2">
                    <button
                        onClick={() => onEdit(item)}
                        className="flex-1 py-2 px-3 bg-white border border-gray-300 text-gray-700 font-bold rounded-lg text-xs hover:bg-gray-50 hover:text-orange-600 transition-colors flex items-center justify-center gap-2"
                    >
                        <i className="fa-solid fa-pen"></i> Modifier
                    </button>
                    <button
                        onClick={() => onAddVariant(item)}
                        className="flex-1 py-2 px-3 bg-gray-900 text-white font-bold rounded-lg text-xs hover:bg-black transition-colors flex items-center justify-center gap-2"
                    >
                        <i className="fa-solid fa-plus"></i> Ajouter variante
                    </button>
                </div>
            </div>
        </div>
    );
};
