import React, { useState } from 'react';
import { Sparkles, X, Loader2, MessageSquare } from 'lucide-react';

export interface AiAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentImage?: string | null;
  side: 'front' | 'back';
  onApplyAdjustment: (instruction: string) => Promise<void>;
  isApplying: boolean;
}

export const AiAdjustmentModal: React.FC<AiAdjustmentModalProps> = ({
  isOpen,
  onClose,
  currentImage,
  side,
  onApplyAdjustment,
  isApplying,
}) => {
  const [instruction, setInstruction] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const suggestions = [
    'Éclairage club plus sombre',
    'Plis plus marqués sur le torse',
    'Mannequin avec veste ouverte',
    'Lumière néon rasante bleue & verte',
    'Ambiance rave underground enfumée',
    'Contraste dramatique & ombres douces',
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!instruction.trim() || isApplying) return;

    setErrorMsg(null);
    try {
      await onApplyAdjustment(instruction.trim());
      setInstruction('');
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || "Erreur lors de l'application de la retouche.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div
        className="relative w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-zinc-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-lime-400/10 border border-lime-400/20 flex items-center justify-center text-lime-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white font-['Syne'] tracking-tight">
                Demande Spéciale / Retouche IA
              </h3>
              <p className="text-xs text-zinc-400">
                Ajustez le rendu mannequin ({side === 'back' ? 'Dos' : 'Face'}) via Gemini
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={isApplying}
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Aperçu miniature actuel */}
        {currentImage && (
          <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-zinc-900 border border-zinc-800/60">
            <img
              src={currentImage}
              alt="Rendu actuel"
              width={64}
              height={64}
              loading="lazy"
              decoding="async"
              className="w-16 h-16 rounded-xl object-cover border border-zinc-700/60 shrink-0"
            />
            <div className="text-xs text-zinc-400 space-y-0.5">
              <div className="font-bold text-zinc-200">Rendu Mannequin Actuel</div>
              <div className="text-[11px] text-zinc-500">
                Le logo officiel et la posture du mannequin sont fidèlement préservés.
              </div>
            </div>
          </div>
        )}

        {/* Suggestions rapides */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-mono font-bold text-zinc-400 uppercase tracking-wider">
            Idées d'ajustements rapides :
          </span>
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map((sug) => (
              <button
                key={sug}
                type="button"
                disabled={isApplying}
                onClick={() => setInstruction(sug)}
                className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 hover:border-zinc-700 transition cursor-pointer active:scale-95"
              >
                {sug}
              </button>
            ))}
          </div>
        </div>

        {/* Formulaire & Saisie */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-mono font-bold text-zinc-400 uppercase tracking-wider">
              Votre consigne créative pour Gemini :
            </label>
            <textarea
              rows={3}
              disabled={isApplying}
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder='Ex: "Éclairage club plus sombre", "Plis plus marqués sur le torse", "Mannequin avec veste ouverte"...'
              className="w-full bg-zinc-900 border border-zinc-800 focus:border-lime-400 rounded-2xl p-3 text-xs text-white placeholder-zinc-500 outline-none transition resize-none font-mono"
            />
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-xs text-red-400">
              {errorMsg}
            </div>
          )}

          {/* Boutons d'action */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-zinc-800/80">
            <button
              type="button"
              disabled={isApplying}
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-mono font-bold text-zinc-400 hover:text-white hover:bg-zinc-900 transition cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isApplying || !instruction.trim()}
              className="px-5 py-2.5 rounded-xl bg-lime-400 hover:bg-lime-300 disabled:opacity-50 text-black font-mono font-black text-xs transition shadow-lg shadow-lime-400/20 flex items-center gap-2 cursor-pointer active:scale-95"
            >
              {isApplying ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Ajustement IA en cours...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 fill-black" />
                  <span>Valider l'ajustement</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
