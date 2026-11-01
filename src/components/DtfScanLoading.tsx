import React from 'react';
import { Loader2 } from 'lucide-react';

interface DtfScanLoadingProps {
  silhouetteSrc?: string;
}

export const DtfScanLoading: React.FC<DtfScanLoadingProps> = ({ silhouetteSrc }) => {
  return (
    <div className="relative w-full h-full aspect-square bg-[#0a0a0c] flex flex-col items-center justify-center overflow-hidden select-none">
      {/* Fond sombre avec silhouette discrète en filigrane ou silhouette t-shirt estompée */}
      {silhouetteSrc ? (
        <img
          src={silhouetteSrc}
          crossOrigin="anonymous"
          alt=""
          aria-hidden="true"
          width={400}
          height={400}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 w-full h-full object-contain opacity-10 grayscale invert pointer-events-none select-none"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none opacity-10">
          <svg
            className="w-2/3 h-2/3 text-zinc-400"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M12 2C8 2 7 4 7 4L3 8l3 3 2-2v11h8V9l2 2 3-3-4-4s-1-2-5-2z" />
          </svg>
        </div>
      )}

      {/* Ligne laser orange fluo animée qui scanne de haut en bas en boucle */}
      <div className="pointer-events-none absolute left-0 right-0 z-20 animate-laser-scan-loop">
        <div className="h-0.5 w-full bg-lime-400 shadow-[0_0_15px_#FF6B00] animate-pulse" />
        <div className="w-full h-14 -mt-7 bg-gradient-to-b from-transparent via-[#FF6B00]/20 to-transparent blur-[2px]" />
      </div>

      {/* Texte minimaliste centré : [ IMPRESSION DTF VIRTUELLE EN COURS... ] avec spinner discret et barre de progression fluide */}
      <div className="relative z-30 flex flex-col items-center justify-center gap-3.5 px-4 text-center">
        <div className="flex items-center gap-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-lime-400 shrink-0" />
          <span className="font-mono text-[11px] sm:text-xs font-bold tracking-wider text-lime-400 uppercase select-none">
            [ IMPRESSION DTF VIRTUELLE EN COURS... ]
          </span>
        </div>
        <div className="w-48 sm:w-56 h-1 bg-zinc-900 border border-zinc-800 rounded-full overflow-hidden relative">
          <div className="h-full w-1/2 bg-lime-400 shadow-[0_0_12px_#FF6B00] animate-dtf-progress rounded-full" />
        </div>
      </div>
    </div>
  );
};
