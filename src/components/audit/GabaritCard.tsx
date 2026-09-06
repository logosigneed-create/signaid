import React from 'react';
import { Check } from 'lucide-react';
import { MockupItem, LogoColorMode } from '../../types/audit';

export interface GabaritCardProps {
    item: MockupItem;
    index: number;
    isLightMode: boolean;
    placement: 'A' | 'B';
    colorMode: LogoColorMode;
    hasLogoB: boolean;
    onToggleSelect: (index: number) => void;
    onPlacementChange: (id: string, slot: 'A' | 'B') => void;
    onColorModeChange: (id: string, mode: LogoColorMode) => void;
}

export const GabaritCard: React.FC<GabaritCardProps> = React.memo(({
    item,
    index,
    isLightMode,
    placement,
    colorMode,
    hasLogoB,
    onToggleSelect,
    onPlacementChange,
    onColorModeChange
}: GabaritCardProps) => {
    const gridDisplayImage = item.mechanical || item.base;

    return (
        <div className="space-y-3">
            <div 
                onClick={() => onToggleSelect(index)}
                className={`aspect-square overflow-hidden bg-zinc-950 border relative shadow-inner group cursor-pointer ${(isLightMode ? 'border-gray-100' : 'border-white/5')} ${(!item.selected ? 'opacity-40 grayscale' : '')}`}
            >
                <img 
                    src={gridDisplayImage} 
                    alt={item.title}
                    crossOrigin="anonymous"
                    className="w-full h-full object-cover object-center" 
                />
                
                {/* CHECKBOX */}
                <div className={`absolute top-2 left-2 w-5 h-5 border flex items-center justify-center transition-all ${item.selected ? 'bg-orange-600 border-orange-600 text-black shadow-[0_0_10px_rgba(234,88,12,0.4)]' : 'bg-black/50 border-white/20 text-white/20'}`}>
                    {item.selected && <Check size={14} strokeWidth={4} />}
                </div>

                {/* VIEW BADGE (FACE / DOS) */}
                <div className={`absolute top-2 right-2 px-1.5 py-0.5 font-black text-[7px] tracking-wider uppercase border ${
                    item.view === 'back'
                        ? 'bg-purple-950/90 text-purple-300 border-purple-500/50 shadow-sm'
                        : 'bg-blue-950/90 text-blue-300 border-blue-500/50 shadow-sm'
                }`}>
                    {item.view === 'back' ? 'DOS' : 'FACE'}
                </div>

                {/* MODEL TITLE */}
                <div className="absolute bottom-2 left-2 right-2 flex items-center pointer-events-none">
                    <span className={`px-2 py-0.5 font-black text-[7px] tracking-wider uppercase truncate ${
                        isLightMode ? 'bg-white/95 text-gray-800 border border-gray-200' : 'bg-black/90 text-zinc-200 border border-white/10'
                    }`}>
                        {item.title}
                    </span>
                </div>
            </div>


            <div className={`flex border p-1 ${isLightMode ? 'bg-gray-50 border-gray-100' : 'bg-black border-zinc-900'}`}>
                <button
                    type="button"
                    onClick={() => onPlacementChange(item.id, 'A')}
                    className={`flex-1 py-1 font-black text-[8px] ${placement === 'A' ? 'bg-orange-600 text-black' : 'text-zinc-600 hover:text-zinc-300'}`}
                >
                    LOGO A
                </button>
                <button
                    type="button"
                    disabled={!hasLogoB}
                    onClick={() => onPlacementChange(item.id, 'B')}
                    className={`flex-1 py-1 font-black text-[8px] ${placement === 'B' ? 'bg-orange-600 text-black' : 'text-zinc-600 hover:text-zinc-300'} ${!hasLogoB ? 'opacity-20 cursor-not-allowed' : ''}`}
                >
                    LOGO B
                </button>
            </div>

            <div className={`flex border mt-1 p-0.5 ${isLightMode ? 'bg-gray-50 border-gray-100' : 'bg-black border-zinc-900'}`}>
                <button
                    type="button"
                    onClick={() => onColorModeChange(item.id, 'white')}
                    className={`flex-1 py-1 font-extrabold text-[6.5px] uppercase transition-all ${colorMode === 'white' ? 'bg-white text-black font-black' : 'text-zinc-500 hover:text-zinc-300'}`}
                    title="Transformer le logo en Blanc"
                >
                    Blanc
                </button>
                <button
                    type="button"
                    onClick={() => onColorModeChange(item.id, 'black')}
                    className={`flex-1 py-1 font-extrabold text-[6.5px] uppercase transition-all ${colorMode === 'black' ? 'bg-zinc-800 text-white border border-zinc-700 font-black' : 'text-zinc-500 hover:text-zinc-300'}`}
                    title="Transformer le logo en Noir"
                >
                    Noir
                </button>
                <button
                    type="button"
                    onClick={() => onColorModeChange(item.id, 'original')}
                    className={`flex-1 py-1 font-extrabold text-[6.5px] uppercase transition-all ${colorMode === 'original' ? 'bg-orange-600 text-black font-black' : 'text-zinc-500 hover:text-zinc-300'}`}
                    title="Garder la couleur d'origine"
                >
                    Couleur
                </button>
                <button
                    type="button"
                    onClick={() => onColorModeChange(item.id, 'knockout_black')}
                    className={`flex-1 py-1 font-extrabold text-[6.5px] uppercase transition-all ${colorMode === 'knockout_black' ? 'bg-amber-500 text-black font-black' : 'text-amber-500/70 hover:text-amber-300'}`}
                    title="Retirer les noirs du logo (Noir Textile Noir / Anti sur-impression)"
                >
                    Noirs ✂️
                </button>
            </div>
        </div>
    );
}, (prevProps, nextProps) => {
    return (
        prevProps.item.id === nextProps.item.id &&
        prevProps.item.selected === nextProps.item.selected &&
        prevProps.item.view === nextProps.item.view &&
        prevProps.item.mechanical === nextProps.item.mechanical &&
        prevProps.item.base === nextProps.item.base &&
        prevProps.item.title === nextProps.item.title &&
        prevProps.placement === nextProps.placement &&
        prevProps.colorMode === nextProps.colorMode &&
        prevProps.isLightMode === nextProps.isLightMode &&
        prevProps.hasLogoB === nextProps.hasLogoB
    );
});

export default GabaritCard;
