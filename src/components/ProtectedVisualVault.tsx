import React, { useEffect, useState, useCallback } from 'react';
import { ShieldAlert, Sparkles, X, Download } from 'lucide-react';
import { VisualAsset } from '../types';

interface ProtectedVisualVaultProps {
  asset: VisualAsset;
  isUnlocked: boolean;
  activeTab: string;
  tshirtSide?: 'front' | 'back';
  tshirtBgColor?: string;
  onOpenCheckout: () => void;
  externalTriggerReason?: string;
}

export const ProtectedVisualVault: React.FC<ProtectedVisualVaultProps> = ({
  asset,
  isUnlocked,
  activeTab,
  tshirtSide = 'back',
  tshirtBgColor = '#0e1015',
  onOpenCheckout,
  externalTriggerReason,
}) => {
  // L'anti-capture n'est PAS quelque chose de visible en permanence :
  // C'est strictement une RÉACTION instantanée lors de l'appui sur PrintScreen ou le bouton capture
  const [isCaptureTriggered, setIsCaptureTriggered] = useState(false);
  const [triggerDetails, setTriggerDetails] = useState<string>('');

  const triggerShieldReaction = useCallback((reason: string) => {
    if (isUnlocked) return;
    setTriggerDetails(reason);
    setIsCaptureTriggered(true);

    // Retour automatique à la vue normale après 3 secondes ou au clic
    const timer = setTimeout(() => {
      setIsCaptureTriggered(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, [isUnlocked]);

  // Écoute stricte des touches de capture d'écran UNIQUEMENT (PrintScreen, touches système de capture)
  // Jamais sur blur, jamais sur les clics normaux !
  useEffect(() => {
    if (isUnlocked) {
      setIsCaptureTriggered(false);
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Touche Impr. Écran (PrintScreen) sous Windows / Linux
      if (e.key === 'PrintScreen' || e.code === 'PrintScreen' || e.keyCode === 44) {
        e.preventDefault();
        e.stopPropagation();
        triggerShieldReaction('Touche Impr. Écran (PrintScreen) détectée');
        return;
      }

      // 2. Raccourci Windows Snipping Tool (Win + Shift + S)
      if (e.shiftKey && (e.key === 'S' || e.key === 's' || e.code === 'KeyS')) {
        if (e.metaKey || e.ctrlKey) {
          e.preventDefault();
          e.stopPropagation();
          triggerShieldReaction("Raccourci de capture d'écran OS détecté");
          return;
        }
      }

      // 3. Raccourcis macOS Screenshot (Cmd + Shift + 3 / 4 / 5)
      if (e.metaKey && e.shiftKey && ['3', '4', '5', '$', '"', '%'].includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();
        triggerShieldReaction('Raccourci de capture macOS détecté');
        return;
      }

      // 4. Commande d'impression (Ctrl+P / Cmd+P)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        triggerShieldReaction("Commande d'impression interceptée");
        return;
      }
    };

    // Détection sur mobile : combinaison matériel / bouton capture
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'PrintScreen' || e.code === 'PrintScreen' || e.keyCode === 44) {
        triggerShieldReaction('Capture d’écran relâchée');
      }
    };

    // Événement avant impression
    const handleBeforePrint = () => {
      triggerShieldReaction("Tentative d'impression de la page");
    };

    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('keyup', handleKeyUp, true);
    window.addEventListener('beforeprint', handleBeforePrint);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('keyup', handleKeyUp, true);
      window.removeEventListener('beforeprint', handleBeforePrint);
    };
  }, [isUnlocked, triggerShieldReaction]);

  useEffect(() => {
    if (externalTriggerReason && !isUnlocked) {
      triggerShieldReaction(externalTriggerReason);
    }
  }, [externalTriggerReason, isUnlocked, triggerShieldReaction]);

  return (
    <div className="w-full h-full relative flex items-center justify-center select-none">
      {/* 
        Aperçu Immédiat en Temps Réel (Comme un Word) :
        L'image SVG est rendue directement, nette, fluide et sans aucun filigrane visible !
      */}
      <div
        className="w-full h-full flex items-center justify-center"
        dangerouslySetInnerHTML={{ __html: asset.svgContent }}
      />

      {/* 
        RÉACTION ANTI-CAPTURE STRICTEMENT ÉVÉNEMENTIELLE :
        Elle n'apparaît que lors de l'appui sur PrintScreen ou le bouton de capture.
        Elle occulte instantanément le visuel pour empêcher la capture d'écran.
      */}
      {isCaptureTriggered && (
        <div
          id="anti-capture-reaction-shield"
          onClick={() => setIsCaptureTriggered(false)}
          className="absolute inset-0 bg-zinc-950/95 backdrop-blur-xl z-50 flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in-95 duration-100 cursor-pointer"
        >
          <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center mb-4 shadow-lg shadow-rose-500/20">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <h3 className="text-base sm:text-lg font-black text-white font-['Syne'] tracking-wide">
            Capture d'écran protégée
          </h3>

          <p className="text-xs sm:text-sm text-zinc-300 mt-2 max-w-sm leading-relaxed">
            {triggerDetails || "Une tentative de capture d'écran a été interceptée."}
            <br />
            Pour préserver la qualité studio 300 DPI sans compression d'écran, utilisez les boutons de téléchargement officiels.
          </p>

          <div className="mt-6 flex flex-col sm:flex-row items-center gap-2.5 w-full max-w-xs" onClick={(e) => e.stopPropagation()}>
            <button
              id="btn-unlock-from-shield"
              type="button"
              onClick={onOpenCheckout}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-lime-400 to-emerald-400 text-zinc-950 font-black text-xs uppercase tracking-wider transition shadow-lg shadow-lime-400/20 flex items-center justify-center gap-1.5 hover:scale-[1.02]"
            >
              <Download className="w-4 h-4" />
              <span>Télécharger le Pack HD</span>
            </button>

            <button
              id="btn-resume-preview"
              type="button"
              onClick={() => setIsCaptureTriggered(false)}
              className="w-full py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition border border-zinc-700 flex items-center justify-center gap-1.5"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reprendre l'aperçu</span>
            </button>
          </div>

          <span className="text-[10px] text-zinc-500 mt-3 font-mono">
            Cliquez n'importe où pour revenir à la composition
          </span>
        </div>
      )}
    </div>
  );
};
