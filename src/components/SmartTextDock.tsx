import React, { useState } from 'react';
import {
  Sliders,
  RotateCcw,
  AlignCenter,
  AlignLeft,
  AlignRight,
  FoldVertical,
  Check,
  Sparkles,
  Contrast,
} from 'lucide-react';
import {
  EventInput,
  resolveTextLineSpacingForFormat,
  resolveTextAlignmentForFormat,
  updateTextLineSpacingForFormat,
  updateTextAlignmentForFormat,
  centerAllLayersForFormat,
  resetAllTextPositionsForFormat,
  resolveTextOffsetsYForFormat,
  resolveTextColorsForFormat,
  toggleAllTextColorsForFormat,
} from '../types';

export interface SmartTextDockProps {
  input: EventInput;
  setInput: React.Dispatch<React.SetStateAction<EventInput>>;
  previewFormat: string;
  isDayMode?: boolean;
  onPointerDownSlider?: (e: React.PointerEvent<HTMLInputElement>, label: string, value: string) => void;
  onPointerUpSlider?: (e: React.PointerEvent<HTMLInputElement>) => void;
  onPointerCancelSlider?: () => void;
  isLiveScrubbing?: boolean;
  setLiveScrubData?: React.Dispatch<React.SetStateAction<{ label: string; value: string } | null>>;
  onSaveImmediate?: (next: EventInput) => void;
  onSaveDebounced?: (next: EventInput) => void;
  className?: string;
}

export const SmartTextDock: React.FC<SmartTextDockProps> = ({
  input,
  setInput,
  previewFormat,
  isDayMode = false,
  onPointerDownSlider,
  onPointerUpSlider,
  onPointerCancelSlider,
  isLiveScrubbing = false,
  setLiveScrubData,
  onSaveImmediate,
  onSaveDebounced,
  className = '',
}) => {
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const resolvedLineSpacing = resolveTextLineSpacingForFormat(input, previewFormat);
  const resolvedAlignment = resolveTextAlignmentForFormat(input, previewFormat);
  const currentOffsetsY = resolveTextOffsetsYForFormat(input, previewFormat);
  const hasCustomOffsets = Object.values(currentOffsetsY).some((v) => v !== 0);

  const triggerFeedback = (message: string) => {
    setActionFeedback(message);
    setTimeout(() => {
      setActionFeedback(null);
    }, 1800);
  };

  // 1. Réinitialisation globale de la position des textes
  const handleResetPositions = (e: React.MouseEvent) => {
    e.stopPropagation();
    setInput((prev) => {
      const next = resetAllTextPositionsForFormat(prev, previewFormat);
      onSaveImmediate?.(next);
      return next;
    });
    triggerFeedback('Positions des textes réinitialisées');
  };

  // 2. Centrage horizontal instantané de TOUS les calques (textes, logo et sujet)
  const handleCenterAllLayers = (e: React.MouseEvent) => {
    e.stopPropagation();
    setInput((prev) => {
      const next = centerAllLayersForFormat(prev, previewFormat);
      onSaveImmediate?.(next);
      return next;
    });
    triggerFeedback('Tous les calques centrés !');
  };

  // 3. Changement d'espacement interligne global
  const handleLineSpacingChange = (val: number) => {
    setInput((prev) => {
      const next = updateTextLineSpacingForFormat(prev, previewFormat, val);
      onSaveDebounced?.(next);
      return next;
    });
  };

  // 4. Alignement horizontal des calques
  const handleAlignmentChange = (align: 'left' | 'center' | 'right', e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (align === 'center') {
      handleCenterAllLayers(e as any);
      return;
    }
    setInput((prev) => {
      const next = updateTextAlignmentForFormat(prev, previewFormat, align);
      onSaveImmediate?.(next);
      return next;
    });
    triggerFeedback(align === 'left' ? 'Aligné à gauche' : 'Aligné à droite');
  };

  // 5. Bascule rapide du contraste global des textes (Noir / Blanc)
  const handleToggleColors = (targetColor?: '#FFFFFF' | '#000000') => {
    setInput((prev) => {
      const next = toggleAllTextColorsForFormat(prev, previewFormat, targetColor);
      onSaveImmediate?.(next);
      return next;
    });
    if (targetColor === '#FFFFFF') triggerFeedback('Tous les textes en Blanc (#FFFFFF)');
    else if (targetColor === '#000000') triggerFeedback('Tous les textes en Noir (#000000)');
    else triggerFeedback('Contraste des textes inversé');
  };

  return (
    <div
      data-testid="smart-text-dock"
      className={`rounded-2xl p-3.5 border transition-all duration-200 select-none ${
        isDayMode
          ? 'bg-gradient-to-br from-zinc-50 via-lime-50/20 to-zinc-100 border-lime-400/40 shadow-md text-zinc-900'
          : 'bg-gradient-to-br from-zinc-900/95 via-zinc-900/85 to-zinc-950 border-lime-400/30 shadow-xl shadow-lime-400/5 text-zinc-100'
      } ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* En-tête : Badge Smart Dock + Bouton Reset Positions */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-lime-400 text-black flex items-center justify-center font-black shadow-md shadow-lime-400/25 shrink-0">
            <Sliders className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-mono font-black uppercase tracking-wider text-lime-400">
                Smart Dock
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded-full font-mono font-bold bg-lime-400/15 text-lime-400 border border-lime-400/20">
                GLOBAL
              </span>
            </div>
            <p className="text-[10px] font-mono text-zinc-400">
              Gestion &amp; espacement global des textes
            </p>
          </div>
        </div>

        {/* Bouton de réinitialisation globale de la position des textes */}
        <button
          type="button"
          data-testid="smart-dock-reset-positions-btn"
          onClick={handleResetPositions}
          className={`px-2.5 py-1.5 rounded-xl text-[10px] font-mono font-bold transition flex items-center gap-1.5 border active:scale-95 cursor-pointer shadow-sm shrink-0 ${
            hasCustomOffsets || resolvedLineSpacing !== 0.8
              ? 'bg-zinc-800 hover:bg-zinc-700 text-lime-300 border-lime-400/40 hover:border-lime-400'
              : isDayMode
                ? 'bg-zinc-200 hover:bg-zinc-300 text-zinc-700 border-zinc-300'
                : 'bg-zinc-800/80 hover:bg-zinc-800 text-zinc-300 border-zinc-700/80'
          }`}
          title="Réinitialiser toutes les positions des textes (Axe Y à 0 et interligne standard)"
        >
          <RotateCcw className="w-3 h-3 text-lime-400 shrink-0" />
          <span>Reset Positions</span>
        </button>
      </div>

      {/* Message de confirmation contextuel instantané */}
      {actionFeedback && (
        <div className="mb-2.5 px-2.5 py-1 rounded-lg bg-lime-400/15 border border-lime-400/40 text-lime-300 font-mono text-[10px] flex items-center gap-1.5 animate-fadeIn">
          <Check className="w-3 h-3 text-lime-400 shrink-0" />
          <span className="font-bold">{actionFeedback}</span>
        </div>
      )}

      {/* 1. Curseur d'espacement global entre les lignes de texte */}
      <div className="space-y-1.5 pt-2 border-t border-zinc-800/60">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-[11px] font-bold text-zinc-300 flex items-center gap-1.5">
            <FoldVertical className="w-3.5 h-3.5 text-lime-400" />
            <span>Espacement global des lignes :</span>
          </span>
          <div className="flex items-center gap-1.5">
            <span className="font-mono font-black text-lime-400 text-xs px-2 py-0.5 rounded-md bg-lime-400/10 border border-lime-400/20">
              {resolvedLineSpacing.toFixed(1)} cqi
            </span>
            {resolvedLineSpacing !== 0.8 && (
              <button
                type="button"
                onClick={() => handleLineSpacingChange(0.8)}
                className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-lime-400 border border-zinc-700 transition cursor-pointer text-[10px]"
                title="Rétablir l'espacement standard (0.8 cqi)"
              >
                <RotateCcw className="w-2.5 h-2.5" />
              </button>
            )}
          </div>
        </div>

        <input
          type="range"
          min="0"
          max="4"
          step="0.1"
          value={resolvedLineSpacing}
          data-testid="smart-dock-line-spacing-slider"
          onPointerDown={(e) => {
            try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
            onPointerDownSlider?.(e, 'Espacement global des lignes', `${resolvedLineSpacing.toFixed(1)} cqi`);
          }}
          onPointerUp={(e) => {
            onPointerUpSlider?.(e);
            onSaveImmediate?.(input);
          }}
          onPointerCancel={onPointerCancelSlider}
          onInput={(e) => {
            const val = parseFloat((e.target as HTMLInputElement).value) || 0;
            handleLineSpacingChange(val);
            if (isLiveScrubbing) {
              setLiveScrubData?.((p) => (p ? { ...p, value: `${val.toFixed(1)} cqi` } : null));
            }
          }}
          onChange={(e) => {
            const val = parseFloat(e.target.value) || 0;
            handleLineSpacingChange(val);
            if (isLiveScrubbing) {
              setLiveScrubData?.((p) => (p ? { ...p, value: `${val.toFixed(1)} cqi` } : null));
            }
          }}
          className="w-full accent-lime-400 h-1.5 rounded-lg cursor-pointer bg-zinc-800 touch-none"
        />

        <div className="flex justify-between text-[9px] font-mono text-zinc-500 px-0.5">
          <span>0 cqi (Compact)</span>
          <span className="text-zinc-400">0.8 cqi (Défaut)</span>
          <span>4.0 cqi (Aéré)</span>
        </div>
      </div>

      {/* 2. Actions d'alignement global (centrage horizontal instantané de tous les calques) */}
      <div className="space-y-1.5 pt-2.5 border-t border-zinc-800/60">
        <div className="flex items-center justify-between text-[11px] font-mono text-zinc-300">
          <span className="font-bold flex items-center gap-1.5">
            <AlignCenter className="w-3.5 h-3.5 text-lime-400" />
            <span>Alignement global :</span>
          </span>
          <span className="text-lime-400 font-bold uppercase text-[10px]">
            {resolvedAlignment === 'left' ? 'Gauche' : resolvedAlignment === 'right' ? 'Droite' : 'Centré'}
          </span>
        </div>

        <div className="grid grid-cols-4 gap-1.5">
          {/* Bouton Alignement Gauche */}
          <button
            type="button"
            data-testid="smart-dock-align-left-btn"
            onClick={(e) => handleAlignmentChange('left', e)}
            className={`py-2 px-1.5 rounded-xl border text-[11px] font-mono font-bold transition flex items-center justify-center gap-1 cursor-pointer active:scale-95 ${
              resolvedAlignment === 'left'
                ? 'bg-lime-400 text-black border-lime-400 shadow-sm font-black'
                : isDayMode
                  ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border-zinc-300'
                  : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-800 hover:border-lime-400/40'
            }`}
            title="Aligner tous les textes à gauche"
          >
            <AlignLeft className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">Gauche</span>
          </button>

          {/* Action Principale : Centrage horizontal instantané de TOUS les calques */}
          <button
            type="button"
            data-testid="smart-dock-center-all-btn"
            onClick={handleCenterAllLayers}
            className={`col-span-2 py-2 px-2 rounded-xl border text-[11px] font-mono font-black transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shadow-md ${
              resolvedAlignment === 'center'
                ? 'bg-lime-400 text-black border-lime-400 shadow-lime-400/20'
                : 'bg-lime-400/20 hover:bg-lime-400/30 text-lime-400 border-lime-400/40 hover:border-lime-400'
            }`}
            title="Centrage horizontal instantané de tous les calques (textes, logo et sujet)"
          >
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Centrer tous les calques</span>
          </button>

          {/* Bouton Alignement Droite */}
          <button
            type="button"
            data-testid="smart-dock-align-right-btn"
            onClick={(e) => handleAlignmentChange('right', e)}
            className={`py-2 px-1.5 rounded-xl border text-[11px] font-mono font-bold transition flex items-center justify-center gap-1 cursor-pointer active:scale-95 ${
              resolvedAlignment === 'right'
                ? 'bg-lime-400 text-black border-lime-400 shadow-sm font-black'
                : isDayMode
                  ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border-zinc-300'
                  : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-800 hover:border-lime-400/40'
            }`}
            title="Aligner tous les textes à droite"
          >
            <span className="hidden sm:inline">Droite</span>
            <AlignRight className="w-3.5 h-3.5 shrink-0" />
          </button>
        </div>
      </div>

      {/* 3. Contraste global des textes (Noir ⇄ Blanc en un clic) */}
      <div className="space-y-1.5 pt-2.5 border-t border-zinc-800/60">
        <div className="flex items-center justify-between text-[11px] font-mono text-zinc-300">
          <span className="font-bold flex items-center gap-1.5">
            <Contrast className="w-3.5 h-3.5 text-lime-400" />
            <span>Contraste des textes :</span>
          </span>
          <span className="text-zinc-400 text-[10px]">
            Bascule rapide selon le fond
          </span>
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            data-testid="smart-dock-all-white-btn"
            onClick={() => handleToggleColors('#FFFFFF')}
            className="py-1.5 px-2 rounded-xl border text-[11px] font-mono font-bold transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 bg-white text-black hover:bg-zinc-100 border-zinc-300 shadow-sm"
            title="Appliquer la couleur Blanche (#FFFFFF) à tous les textes"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-white border border-zinc-400 shrink-0" />
            <span>Tout Blanc</span>
          </button>

          <button
            type="button"
            data-testid="smart-dock-all-black-btn"
            onClick={() => handleToggleColors('#000000')}
            className="py-1.5 px-2 rounded-xl border text-[11px] font-mono font-bold transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 bg-zinc-950 text-white hover:bg-zinc-900 border-zinc-700 shadow-sm"
            title="Appliquer la couleur Noire (#000000) à tous les textes"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-black border border-zinc-600 shrink-0" />
            <span>Tout Noir</span>
          </button>

          <button
            type="button"
            data-testid="smart-dock-toggle-contrast-btn"
            onClick={() => handleToggleColors()}
            className="py-1.5 px-2 rounded-xl border text-[11px] font-mono font-bold transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 bg-lime-400/15 hover:bg-lime-400/25 text-lime-400 border-lime-400/30 shadow-sm"
            title="Inverser le contraste de l'ensemble des textes (Noir ⇄ Blanc)"
          >
            <Contrast className="w-3 h-3 text-lime-400 shrink-0" />
            <span>Inverser ⇄</span>
          </button>
        </div>
      </div>
    </div>
  );
};
