/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Signaid.eu - Modal Guide d'Utilisation & Documentation Technique
 */

import React from 'react';
import { 
  X, 
  Sparkles, 
  Maximize2, 
  Printer, 
  Users, 
  HelpCircle, 
  CheckCircle2, 
  Download, 
  Layers, 
  Sliders, 
  Palette 
} from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDayMode?: boolean;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose, isDayMode = false }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div 
        className={`w-full max-w-2xl max-h-[88vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden font-mono ${
          isDayMode ? 'bg-white border-zinc-200 text-zinc-900' : 'bg-zinc-950 border-zinc-800 text-zinc-100'
        }`}
      >
        {/* Header Modal */}
        <div className={`flex items-center justify-between px-5 py-3.5 border-b ${
          isDayMode ? 'border-zinc-200 bg-zinc-50' : 'border-zinc-800/80 bg-zinc-900/60'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-lime-400 text-black flex items-center justify-center font-black text-xs shadow-sm">
              ?
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-extrabold tracking-wider uppercase">
                SIGNAID<span className="text-lime-500">.EU</span> — GUIDE DU STUDIO
              </h2>
              <p className="text-[10px] text-zinc-500 font-mono">Documentation rapide &amp; astuces de production</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`p-1.5 rounded-lg border transition ${
              isDayMode 
                ? 'bg-zinc-100 border-zinc-200 text-zinc-600 hover:text-zinc-900' 
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
            }`}
            title="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs font-sans">
          {/* Card 1 : Studio Graphique */}
          <div className={`p-4 rounded-xl border space-y-2 ${
            isDayMode ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-900/40 border-zinc-800/80'
          }`}>
            <div className="flex items-center gap-2 font-mono font-bold text-xs text-lime-500">
              <Sliders className="w-4 h-4" />
              <span>1. STUDIO DE CRÉATION INTERACTIF</span>
            </div>
            <p className="text-zinc-600 dark:text-zinc-300 leading-relaxed text-[11px]">
              Personnalisez en temps réel les surtitres, titres d'événements, punchlines, dates et lieux. Ajustez la taille du sujet, l'élévation verticale (Position Y) et la colorimétrie avec les curseurs de précision.
            </p>
          </div>

          {/* Card 2 : IA Générative */}
          <div className={`p-4 rounded-xl border space-y-2 ${
            isDayMode ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-900/40 border-zinc-800/80'
          }`}>
            <div className="flex items-center gap-2 font-mono font-bold text-xs text-lime-500">
              <Sparkles className="w-4 h-4" />
              <span>2. IA GÉNÉRATIVE D'AMBIANCES</span>
            </div>
            <p className="text-zinc-600 dark:text-zinc-300 leading-relaxed text-[11px]">
              Générez des arrière-plans thématiques ultra-qualitatifs via nos invites textuelles intelligentes ou importez directement vos propres visuels clés, photos d'artistes et logos vectoriels.
            </p>
          </div>

          {/* Card 3 : Formats & Master 300 DPI */}
          <div className={`p-4 rounded-xl border space-y-2 ${
            isDayMode ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-900/40 border-zinc-800/80'
          }`}>
            <div className="flex items-center gap-2 font-mono font-bold text-xs text-lime-500">
              <Download className="w-4 h-4" />
              <span>3. FORMATS MULTI-DIFFUSION &amp; MASTER 300 DPI</span>
            </div>
            <p className="text-zinc-600 dark:text-zinc-300 leading-relaxed text-[11px]">
              Basculez entre le <strong>Format Carré 1:1</strong> (Feed Instagram/Vinyle), <strong>Story 9:16</strong>, <strong>Bannière 16:9</strong> et le gabarit <strong>Textile T-Shirt DTF</strong>. Les exports Master Pro intègrent les métadonnées 300 DPI pour une netteté absolue en impression.
            </p>
          </div>

          {/* Card 4 : Collaboration & Session Live */}
          <div className={`p-4 rounded-xl border space-y-2 ${
            isDayMode ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-900/40 border-zinc-800/80'
          }`}>
            <div className="flex items-center gap-2 font-mono font-bold text-xs text-lime-500">
              <Users className="w-4 h-4" />
              <span>4. COLLABORATION EN DIRECT</span>
            </div>
            <p className="text-zinc-600 dark:text-zinc-300 leading-relaxed text-[11px]">
              Partagez le lien de votre session de création avec vos artistes, graphistes ou organisateurs. Toute modification effectuée dans le studio peut être synchronisée en direct.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className={`px-5 py-3 border-t flex items-center justify-between text-[11px] font-mono ${
          isDayMode ? 'border-zinc-200 bg-zinc-50' : 'border-zinc-800/80 bg-zinc-900/80'
        }`}>
          <span className="text-zinc-500">Support technique : contact@signaid.eu</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 bg-lime-400 text-black font-bold rounded-lg hover:bg-lime-300 transition text-[11px]"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
