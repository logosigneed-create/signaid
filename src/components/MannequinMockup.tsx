import React from 'react';
import { EventInput, LogoPlacement } from '../types';
import { Sparkles } from 'lucide-react';

export interface MannequinMockupProps {
  input: EventInput;
  activeView?: 'face' | 'dos';
  onToggleView?: (view: 'face' | 'dos') => void;
  className?: string;
  showToggle?: boolean;
  placement?: LogoPlacement;
  mannequinFrontUrl?: string;
  mannequinBackUrl?: string;
  isAiGenerated?: boolean;
  onTriggerVton?: (view: 'face' | 'dos') => void;
  onOpenAdjustment?: (view: 'face' | 'dos') => void;
  isGeneratingVton?: boolean;
}

export const MannequinMockup: React.FC<MannequinMockupProps> = ({
  input,
  activeView = 'face',
  onToggleView,
  className = '',
  showToggle = false,
  mannequinFrontUrl,
  mannequinBackUrl,
  isAiGenerated: propIsAiGenerated,
  onTriggerVton,
  onOpenAdjustment,
  isGeneratingVton,
}) => {
  const isBack = activeView === 'dos';
  const mannequinBlankSrc = isBack ? '/demo/artist-mannequin-blank-back.jpg' : '/demo/artist-mannequin-blank.jpg';

  const isInvalidOldImage = (url?: string | null) => {
    if (!url) return false;
    return url.includes('21nine') || url.includes('mannequin-blank');
  };

  const rawAiImage = isBack
    ? (mannequinBackUrl || input.tshirtPreviewImages?.back)
    : (mannequinFrontUrl || input.tshirtPreviewImages?.front);
  const aiGeneratedImage = isInvalidOldImage(rawAiImage) ? null : rawAiImage;
  const isAiDone = Boolean(propIsAiGenerated || aiGeneratedImage);
  const displaySrc = aiGeneratedImage || mannequinBlankSrc;

  return (
    <div className={`relative w-full aspect-square overflow-hidden rounded-2xl bg-zinc-950 flex items-center justify-center select-none ${className}`}>
      {/* Photo du résultat VTON IA ou du mannequin neutre vierge de référence */}
      <img
        src={displaySrc}
        crossOrigin="anonymous"
        alt={isBack ? "Mannequin neutre dos" : "Mannequin neutre face"}
        width={500}
        height={500}
        loading="lazy"
        decoding="async"
        className="w-full h-full object-cover pointer-events-none select-none transition-opacity duration-300"
      />

      {/* RÈGLE 2 & 3 : STRICTEMENT AUCUN OVERLAY CSS DU LOGO SUR LE MANNEQUIN.
          Si l'image VTON n'a pas encore été générée, afficher le bouton d'action explicite au centre */}
      {!isAiDone && onTriggerVton && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-black/40 backdrop-blur-[2px] z-10 pointer-events-auto">
          <button
            type="button"
            disabled={isGeneratingVton}
            onClick={(e) => {
              e.stopPropagation();
              onTriggerVton(activeView);
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

      {/* RÈGLE 4 : Bouton discret Demande Spéciale / Ajustement lorsque l'image IA est générée */}
      {isAiDone && onOpenAdjustment && (
        <div className="absolute bottom-3 inset-x-0 flex justify-center z-20 pointer-events-auto">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenAdjustment(activeView);
            }}
            className="px-3.5 py-1.5 rounded-full bg-zinc-950/85 hover:bg-black text-zinc-200 hover:text-white border border-white/20 hover:border-lime-400 text-xs font-mono font-bold backdrop-blur-md shadow-xl transition-all flex items-center gap-2 cursor-pointer group active:scale-95"
          >
            <span className="text-lime-400 group-hover:scale-110 transition-transform">💬</span>
            <span>Demande Spéciale / Ajustement</span>
          </button>
        </div>
      )}

      {/* Sélecteur compact Face / Dos « 👕 Face ➔ Dos » */}
      {showToggle && onToggleView && (
        <div className="absolute top-2 left-2 flex items-center gap-0.5 bg-black/85 backdrop-blur-md p-0.5 rounded-lg border border-white/10 z-20 pointer-events-auto shadow-md">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleView('face');
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
              onToggleView(isBack ? 'face' : 'dos');
            }}
            className="text-zinc-500 hover:text-lime-400 px-0.5 text-[9px] transition cursor-pointer select-none"
            title="Inverser la vue"
          >
            ➔
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleView('dos');
            }}
            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition cursor-pointer flex items-center gap-1 ${
              isBack ? 'bg-lime-400 text-black font-black shadow-sm' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <span>Dos</span>
          </button>
        </div>
      )}
    </div>
  );
};
