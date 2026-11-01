import React, { useRef, useState, useEffect } from 'react';
import { EventInput, LogoPlacement } from '../types';
import {
  clampDtfPlacement,
  resolveActiveTextileLogo,
  resolveActiveTextileColorMode,
  resolveGarmentTemplateSrc,
  getTextileLogoStyle,
  DTF_PRINT_BOUNDS,
} from '../utils/textileMockupUtils';
import { DtfScanLoading } from './DtfScanLoading';
import { Sparkles, Shirt, RefreshCw } from 'lucide-react';

export interface MerchPreviewProps {
  input: EventInput;
  side?: 'front' | 'back';
  garmentType?: 'tshirt' | 'hoodie';
  viewMode?: 'ghost' | 'model';
  interactive?: boolean;
  onPlacementChange?: (placement: LogoPlacement, side: 'front' | 'back') => void;
  onToggleSide?: (side: 'front' | 'back') => void;
  showSideToggle?: boolean;
  showViewToggle?: boolean;
  onToggleViewMode?: (mode: 'ghost' | 'model') => void;
  onTriggerVton?: (side: 'front' | 'back') => void;
  onOpenAdjustment?: (side: 'front' | 'back') => void;
  isGeneratingVton?: boolean;
  className?: string;
  badgeLabel?: string;
}

export const MerchPreview: React.FC<MerchPreviewProps> = ({
  input,
  side = 'front',
  garmentType = 'tshirt',
  viewMode = 'ghost',
  interactive = false,
  onPlacementChange,
  onToggleSide,
  showSideToggle = true,
  showViewToggle = false,
  onToggleViewMode,
  onTriggerVton,
  onOpenAdjustment,
  isGeneratingVton = false,
  className = '',
  badgeLabel,
}) => {
  const [internalSide, setInternalSide] = useState<'front' | 'back'>(side);
  useEffect(() => {
    setInternalSide(side);
  }, [side]);

  const activeSide = onToggleSide ? side : internalSide;
  const isBack = activeSide === 'back';
  const tshirtColor = input.tshirtColor || 'black';

  const handleSideToggle = (newSide: 'front' | 'back') => {
    setInternalSide(newSide);
    onToggleSide?.(newSide);
  };

  // 1. Gabarit textile (NX7200 ou Hoodie)
  const templateSrc = resolveGarmentTemplateSrc(garmentType, tshirtColor, activeSide);

  // 2. Logo actif résolu en temps réel
  const activeLogo = resolveActiveTextileLogo(input, activeSide);

  // 3. Mode de couleur / Tonalité synchronisée
  const colorMode = resolveActiveTextileColorMode(input, tshirtColor);

  // 4. Placement géométrique borné strictement aux limites DTF
  const rawPlacement = isBack
    ? (input.tshirtBackPlacement || { x: 50, y: 38, scale: input.tshirtBackLogoScale ?? 1.0 })
    : (input.tshirtFrontPlacement || { x: 68, y: 34, scale: input.tshirtLogoScale ?? 1.0 });
  const clampedPlacement = clampDtfPlacement(rawPlacement, activeSide);

  // 5. Gestion du glisser-déposer interactif (Mode Studio)
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!interactive) return;
    e.stopPropagation();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch { }
    setIsDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!interactive || !isDragging) return;
    e.stopPropagation();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0 || rect.height <= 0) return;

    const rawX = ((e.clientX - rect.left) / rect.width) * 100;
    const rawY = ((e.clientY - rect.top) / rect.height) * 100;

    const updated = clampDtfPlacement(
      {
        x: rawX,
        y: rawY,
        scale: clampedPlacement.scale,
      },
      activeSide
    );

    onPlacementChange?.(updated, activeSide);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!interactive) return;
    e.stopPropagation();
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch { }
    setIsDragging(false);
  };

  // VTON Mannequin
  const isInvalidOldImage = (url?: string | null) => {
    if (!url) return true;
    return url.includes('21nine') || url.includes('mannequin-blank');
  };
  const rawVton = isBack ? input.tshirtPreviewImages?.back : input.tshirtPreviewImages?.front;
  const vtonResult = isInvalidOldImage(rawVton) ? null : rawVton;
  const mannequinBlankSrc = isBack ? '/demo/artist-mannequin-blank-back.jpg' : '/demo/artist-mannequin-blank.jpg';

  return (
    <div
      ref={containerRef}
      onContextMenu={(e) => e.preventDefault()}
      className={`relative w-full aspect-square overflow-hidden rounded-2xl bg-zinc-950 flex items-center justify-center select-none -webkit-touch-callout-none ${className}`}
      style={{
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none',
      }}
    >
      {viewMode === 'model' ? (
        /* VUE MANNEQUIN PORTÉ */
        isGeneratingVton ? (
          <DtfScanLoading silhouetteSrc={mannequinBlankSrc} />
        ) : vtonResult ? (
          <div className="relative w-full h-full flex items-center justify-center bg-zinc-950 overflow-hidden">
            <img
              src={vtonResult}
              crossOrigin="anonymous"
              alt={isBack ? 'Mannequin Merch Dos' : 'Mannequin Merch Face'}
              draggable={false}
              width={500}
              height={500}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover pointer-events-none select-none transition-opacity duration-300"
            />
            {onOpenAdjustment && (
              <div className="absolute bottom-3 inset-x-0 flex justify-center z-20 pointer-events-auto">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenAdjustment(side);
                  }}
                  className="px-3.5 py-1.5 rounded-full bg-zinc-950/85 hover:bg-black text-zinc-200 hover:text-white border border-white/20 hover:border-lime-400 text-xs font-mono font-bold backdrop-blur-md shadow-xl transition-all flex items-center gap-2 cursor-pointer group active:scale-95"
                >
                  <span className="text-lime-400 group-hover:scale-110 transition-transform">💬</span>
                  <span>Demande Spéciale / Ajustement</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="relative w-full h-full flex items-center justify-center bg-zinc-950 overflow-hidden">
            <img
              src={mannequinBlankSrc}
              crossOrigin="anonymous"
              alt={isBack ? 'Mannequin neutre dos' : 'Mannequin neutre face'}
              draggable={false}
              width={500}
              height={500}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover pointer-events-none select-none"
            />
            {onTriggerVton && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-black/40 backdrop-blur-[2px] z-10 pointer-events-auto">
                <button
                  type="button"
                  disabled={isGeneratingVton}
                  onClick={(e) => {
                    e.stopPropagation();
                    onTriggerVton(side);
                  }}
                  className="px-5 py-3 rounded-2xl bg-lime-400 hover:bg-lime-300 text-black font-mono font-black text-xs sm:text-sm shadow-2xl shadow-lime-400/30 active:scale-95 transition-all flex items-center gap-2.5 cursor-pointer border-2 border-lime-300 group"
                >
                  <Sparkles className="w-4 h-4 fill-black group-hover:rotate-12 transition-transform" />
                  <span>⚡ Générer Rendu Mannequin IA ({isBack ? 'Dos' : 'Face'})</span>
                </button>
                <p className="mt-2 text-[11px] font-mono text-zinc-300/80 bg-black/60 px-2.5 py-1 rounded-full border border-white/10">
                  Calibrage DTF prêt • Synthèse photoréaliste
                </p>
              </div>
            )}
          </div>
        )
      ) : (
        /* VUE GABARIT TEXTILE PLAT (Standard DTF officiel) */
        <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
          {/* Gabarit vêtement officiel */}
          <img
            src={templateSrc}
            crossOrigin="anonymous"
            alt={isBack ? 'Gabarit textile dos' : 'Gabarit textile face'}
            draggable={false}
            width={500}
            height={500}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-contain pointer-events-none select-none drop-shadow-2xl"
          />

          {/* Calque du logo positionné strictement dans la zone DTF */}
          {activeLogo && (
            <div
              onClick={(e) => e.stopPropagation()}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              className={`absolute flex items-center justify-center select-none z-10 ${
                interactive
                  ? isDragging
                    ? 'cursor-grabbing touch-none'
                    : 'cursor-grab hover:ring-2 hover:ring-lime-400/60 rounded-xl transition-all duration-75 touch-none'
                  : 'pointer-events-none'
              }`}
              style={getTextileLogoStyle(clampedPlacement, activeSide, colorMode, isDragging)}
              title={interactive ? 'Glisser-déposer pour positionner le logo sur le gabarit' : undefined}
            >
              <img
                src={activeLogo}
                crossOrigin="anonymous"
                alt={isBack ? 'Impression Dos DTF' : 'Marquage Cœur DTF'}
                draggable={false}
                width={200}
                height={200}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-contain pointer-events-none select-none"
              />
            </div>
          )}
        </div>
      )}

      {/* Barre supérieure : Sélecteur Face / Dos interactif */}
      {showSideToggle && (
        <div className="absolute top-2.5 left-2.5 flex items-center gap-0.5 bg-black/85 backdrop-blur-md p-0.5 rounded-lg border border-white/10 shadow-md z-20 pointer-events-auto">
          <button
            type="button"
            id="portal-toggle-front"
            onClick={(e) => {
              e.stopPropagation();
              handleSideToggle('front');
            }}
            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition cursor-pointer flex items-center gap-1 ${
              !isBack ? 'bg-lime-400 text-black font-black shadow-sm' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <span>👕</span>
            <span>Face</span>
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleSideToggle(isBack ? 'front' : 'back');
            }}
            className="text-zinc-500 hover:text-lime-400 px-0.5 text-[9px] transition cursor-pointer select-none"
            title="Inverser la vue"
          >
            ➔
          </button>
          <button
            type="button"
            id="portal-toggle-back"
            onClick={(e) => {
              e.stopPropagation();
              handleSideToggle('back');
            }}
            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition cursor-pointer flex items-center gap-1 ${
              isBack ? 'bg-lime-400 text-black font-black shadow-sm' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <span>Dos</span>
          </button>
        </div>
      )}

      {/* Sélecteur Gabarit / Mannequin */}
      {showViewToggle && onToggleViewMode && (
        <div className="absolute top-2.5 right-2.5 flex items-center gap-0.5 bg-black/85 backdrop-blur-md p-0.5 rounded-lg border border-white/10 shadow-md z-20 pointer-events-auto">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleViewMode('ghost');
            }}
            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition cursor-pointer ${
              viewMode === 'ghost' ? 'bg-lime-400 text-black font-black shadow-sm' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Gabarit
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleViewMode('model');
            }}
            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition cursor-pointer ${
              viewMode === 'model' ? 'bg-lime-400 text-black font-black shadow-sm' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Mannequin
          </button>
        </div>
      )}

      {/* Badge officiel DTF en bas */}
      <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between text-[9px] font-mono bg-black/85 backdrop-blur-md px-2.5 py-1 rounded-xl border border-white/10 text-zinc-300 z-10 pointer-events-none">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-lime-400 animate-pulse" />
          <span className="font-bold text-zinc-200">
            {isBack ? 'Impression Dorsale A3' : 'Marquage Cœur DTF'}
          </span>
        </div>
        <span className="text-lime-400 font-bold uppercase tracking-wider">
          {badgeLabel || 'DTF HD • Coton 240g'}
        </span>
      </div>
    </div>
  );
};
