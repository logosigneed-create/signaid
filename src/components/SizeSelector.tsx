import React from 'react';

interface SizeSelectorProps {
    availableSizes: string[];
    selectedSizes: Record<string, number>;
    onUpdateQuantity: (size: string, delta: number) => void;
    showAllSizes: boolean;
    onToggleAllSizes: () => void;
    onOpenSizeGuide: () => void;
}

export function SizeSelector({
    availableSizes,
    selectedSizes,
    onUpdateQuantity,
    showAllSizes,
    onToggleAllSizes,
    onOpenSizeGuide
}: SizeSelectorProps) {

    // Séparation des tailles standards et des grandes tailles (4XL+)
    const standardSizes = availableSizes.filter(s => !['4XL', '5XL', '6XL', '7XL', '8XL'].includes(s));
    const extraSizes = availableSizes.filter(s => ['4XL', '5XL', '6XL', '7XL', '8XL'].includes(s));

    return (
        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm mx-4 mb-4">
            {/* En-tête du bloc */}
            <div className="flex justify-between items-center mb-2">
                <h3 className="font-black text-gray-800 uppercase text-xs tracking-widest">Choix des tailles</h3>
                <button onClick={onOpenSizeGuide} className="text-[10px] font-bold text-gray-400 flex items-center gap-1 hover:text-gray-600">
                    <i className="fa-solid fa-ruler-vertical"></i> Guide des tailles (Mesures)
                </button>
            </div>

            <p className="text-[9px] font-bold text-orange-500 uppercase tracking-wide mb-4 italic">
                Plusieurs tailles/quantités possibles par projet
            </p>

            {/* Grille des tailles standards */}
            <div className="flex flex-wrap gap-2 justify-center">
                {standardSizes.map(size => (
                    <SizeButton
                        key={size}
                        size={size}
                        qty={selectedSizes[size] || 0}
                        onUpdate={(delta) => onUpdateQuantity(size, delta)}
                    />
                ))}
            </div>

            {/* Section Tailles Supplémentaires (Toggle) */}
            {extraSizes.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-50 flex flex-col items-center">
                    {showAllSizes && (
                        <div className="flex flex-wrap gap-2 justify-center mb-4 animate-fade-in">
                            {extraSizes.map(size => (
                                <SizeButton
                                    key={size}
                                    size={size}
                                    qty={selectedSizes[size] || 0}
                                    onUpdate={(delta) => onUpdateQuantity(size, delta)}
                                />
                            ))}
                        </div>
                    )}

                    <button
                        onClick={onToggleAllSizes}
                        className="text-[10px] font-black text-orange-600 hover:text-orange-700 flex items-center gap-2 uppercase tracking-wide"
                    >
                        {showAllSizes ? "Masquer (4XL+)" : "Voir + tailles (4XL+)"}
                        <i className={`fa-solid fa-chevron-${showAllSizes ? 'up' : 'down'}`}></i>
                    </button>
                </div>
            )}
        </div>
    );
}

// Sous-composant privé pour gérer l'état visuel d'un bouton de taille
function SizeButton({ size, qty, onUpdate }: { size: string, qty: number, onUpdate: (delta: number) => void }) {
    if (qty > 0) {
        return (
            <div className="flex items-center bg-gray-900 rounded-xl overflow-hidden shadow-md ring-2 ring-gray-900 ring-offset-1 h-12">
                <button onClick={() => onUpdate(-1)} className="w-10 h-full flex justify-center items-center text-white font-bold hover:bg-gray-800">-</button>
                <div className="flex flex-col items-center justify-center px-2 bg-gray-900 text-white min-w-[2.5rem] border-x border-gray-700 h-full">
                    <span className="font-black text-xs">{size}</span>
                    <span className="text-[9px] opacity-70">x{qty}</span>
                </div>
                <button onClick={() => onUpdate(1)} className="w-10 h-full flex justify-center items-center text-white font-bold hover:bg-gray-800">+</button>
            </div>
        );
    }

    return (
        <button
            onClick={() => onUpdate(1)}
            className="min-w-[3rem] px-3 h-12 flex items-center justify-center bg-white border border-gray-100 rounded-xl text-gray-800 font-bold text-xs hover:border-gray-300 transition-colors shadow-sm"
        >
            {size}
        </button>
    );
}
