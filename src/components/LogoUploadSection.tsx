import React, { useState, useRef } from 'react';
import { EventInput } from '../types';
import { generateRefonteLogoSvg } from '../utils/logoAssets';
import { generateRefonteLogoAi } from '../services/geminiService';
import { createLocalLogoPreview, optimizeLogoForUpload } from '../utils/logoOptimizer';
import {
  Upload,
  Sparkles,
  Wand2,
  Trash2,
  Check,
  Zap,
  ShieldCheck,
  CheckCircle2,
  Crown,
  FileCheck,
} from 'lucide-react';

interface LogoUploadSectionProps {
  input: EventInput;
  setInput: React.Dispatch<React.SetStateAction<EventInput>>;
}

export const LogoUploadSection: React.FC<LogoUploadSectionProps> = ({ input, setInput }) => {
  const [isRefonding, setIsRefonding] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Veuillez sélectionner un fichier image valide (PNG, SVG, JPG, WebP).');
      return;
    }

    // 1. Immédiat : URL locale en mémoire pour l'affichage instantané sans sérialiser de Mo dans le state
    const localBlobUrl = createLocalLogoPreview(file);
    const refonteSvg = generateRefonteLogoSvg(
      input.djName || input.eventName,
      'brutalist'
    );

    const isDemoLogo = (url?: string | null) => !url || url.includes('logo-demo') || url.includes('21nine') || url.includes('signaid-logo');

    setInput((prev) => {
      const isCurrentLogoDemo = isDemoLogo(prev.tshirtCustomLogo);
      const isBackLogoDemo = isDemoLogo(prev.tshirtBackCustomLogo);
      return {
        ...prev,
        logoImage: localBlobUrl,
        logoUrl: localBlobUrl,
        redesignedLogoSvg: refonteSvg,
        tshirtCustomLogo: isCurrentLogoDemo ? localBlobUrl : prev.tshirtCustomLogo,
        rawTshirtLogoOriginal: isCurrentLogoDemo ? localBlobUrl : prev.rawTshirtLogoOriginal,
        tshirtBackCustomLogo: isBackLogoDemo ? localBlobUrl : prev.tshirtBackCustomLogo,
      };
    });

    // 2. Traitement d'arrière-plan pour synchronisation Firestore / Storage
    optimizeLogoForUpload(file)
      .then((optimizedUrl) => {
        if (optimizedUrl) {
          setInput((prev) => {
            const updates: Partial<EventInput> = {};
            if (prev.logoImage === localBlobUrl || prev.logoUrl === localBlobUrl) {
              updates.logoImage = optimizedUrl;
              updates.logoUrl = optimizedUrl;
            }
            if (prev.tshirtCustomLogo === localBlobUrl) {
              updates.tshirtCustomLogo = optimizedUrl;
              updates.rawTshirtLogoOriginal = optimizedUrl;
            }
            if (prev.tshirtBackCustomLogo === localBlobUrl) {
              updates.tshirtBackCustomLogo = optimizedUrl;
            }
            return {
              ...prev,
              ...updates,
            };
          });
        }
      })
      .catch((err) => {
        console.warn('[LogoUploadSection] Erreur optimisation logo:', err);
      });
  };

  const handleTriggerRefonte = async () => {
    setIsRefonding(true);

    try {
      const svgContent = await generateRefonteLogoAi({
        djName: input.djName,
        eventName: input.eventName,
        genre: input.genre,
      });
      if (svgContent) {
        setInput((prev) => ({
          ...prev,
          redesignedLogoSvg: svgContent,
          isLogoRedesignRequested: true,
        }));
      } else {
        const fallbackSvg = generateRefonteLogoSvg(input.djName, 'brutalist');
        setInput((prev) => ({
          ...prev,
          redesignedLogoSvg: fallbackSvg,
          isLogoRedesignRequested: true,
        }));
      }
    } catch {
      const fallbackSvg = generateRefonteLogoSvg(input.djName, 'brutalist');
      setInput((prev) => ({
        ...prev,
        redesignedLogoSvg: fallbackSvg,
        isLogoRedesignRequested: true,
      }));
    } finally {
      setIsRefonding(false);
    }
  };

  const handleClearLogo = () => {
    setInput((prev) => ({
      ...prev,
      logoImage: undefined,
      logoUrl: undefined,
      rawLogoImage: undefined,
      tshirtCustomLogo: undefined,
      rawTshirtLogoOriginal: undefined,
      tshirtBackCustomLogo: undefined,
      redesignedLogoSvg: undefined,
      isLogoRedesignRequested: false,
    }));
  };

  const toggleLogoRefonteAddon = () => {
    const nextState = !input.isLogoRedesignRequested;
    if (nextState && !input.redesignedLogoSvg) {
      handleTriggerRefonte();
    }
    setInput((prev) => ({
      ...prev,
      isLogoRedesignRequested: nextState,
    }));
  };

  return (
    <div className="mt-6 pt-6 border-t border-zinc-800">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-lime-400/10 text-lime-400 border border-lime-400/20">
              <Upload className="w-4 h-4" />
            </span>
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-white">
              Logo du DJ / Collectif &amp; Service Refonte Studio
            </h3>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Uploadez votre propre logo pour vos affiches et t-shirts, ou ajoutez le service de refonte studio premium.
          </p>
        </div>

        {/* Status indicator */}
        <div className="flex items-center gap-2">
          {input.isLogoRedesignRequested && (
            <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-amber-400/10 text-amber-300 border border-amber-400/30 font-bold flex items-center gap-1.5">
              <Crown className="w-3 h-3 text-amber-400" />
              REFONTE STUDIO ACTIVE (+15€)
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Direct File Upload Area */}
        <div className="lg:col-span-6 space-y-3">
          <input
            ref={fileInputRef}
            id="file-upload-logo-direct"
            type="file"
            accept="image/*,.svg"
            className="hidden"
            onClick={(e) => { (e.target as HTMLInputElement).value = ''; }}
            onChange={(e) => {
              if (e.target.files?.[0]) handleFileUpload(e.target.files[0]);
              e.target.value = '';
            }}
          />

          {!input.logoImage ? (
            <div
              id="dropzone-logo-upload"
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragActive(false);
                if (e.dataTransfer.files?.[0]) {
                  handleFileUpload(e.dataTransfer.files[0]);
                }
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[190px] ${
                dragActive
                  ? 'border-lime-400 bg-lime-400/10 scale-[1.01]'
                  : 'border-zinc-800 hover:border-zinc-700 bg-zinc-950/60 hover:bg-zinc-950'
              }`}
            >
              <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-3 text-lime-400 shadow-md">
                <Upload className="w-5 h-5" />
              </div>
              <p className="text-xs font-bold text-white mb-1">
                Glissez votre logo ici ou <span className="text-lime-400 underline underline-offset-2">parcourir</span>
              </p>
              <p className="text-[11px] text-zinc-500">
                Formats acceptés : PNG transparent, SVG vectoriel, JPG, WebP
              </p>
            </div>
          ) : (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragActive(false);
                if (e.dataTransfer.files?.[0]) {
                  handleFileUpload(e.dataTransfer.files[0]);
                }
              }}
              className={`rounded-2xl bg-zinc-950 border p-4 space-y-3 transition-all ${
                dragActive ? 'border-lime-400 ring-2 ring-lime-400/40 bg-lime-400/5' : 'border-zinc-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-lime-400" />
                  Logo importé avec succès
                </span>
                <button
                  id="btn-remove-logo"
                  type="button"
                  onClick={handleClearLogo}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-zinc-800/80 transition cursor-pointer"
                  title="Supprimer le logo"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div
                onClick={() => fileInputRef.current?.click()}
                className="h-28 rounded-xl bg-black/70 border border-zinc-800/80 hover:border-lime-400/50 flex items-center justify-center p-3 cursor-pointer group relative transition"
                title="Cliquer pour remplacer le logo en 1 clic"
              >
                <img
                  src={input.logoImage}
                  alt="Logo DJ Importé"
                  width={200}
                  height={100}
                  loading="lazy"
                  decoding="async"
                  className="max-h-full max-w-full object-contain group-hover:opacity-80 transition"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
                  <span className="text-[11px] font-mono font-bold text-lime-400 bg-black/80 px-2.5 py-1 rounded-lg border border-lime-400/40 flex items-center gap-1">
                    <Upload className="w-3 h-3" />
                    Remplacer (1 clic)
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-lime-400 text-xs font-semibold border border-zinc-700/60 hover:border-lime-400/40 transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Remplacer par un autre fichier (1 clic)</span>
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Premium Studio Refonte Service Card */}
        <div className="lg:col-span-6 flex flex-col justify-between rounded-2xl bg-gradient-to-br from-zinc-900/90 via-zinc-900/60 to-zinc-950 border border-zinc-800 p-4 sm:p-5 relative overflow-hidden shadow-lg">
          {/* Subtle glow accent */}
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />

          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-md bg-amber-400/20 text-amber-300">
                  <Crown className="w-3.5 h-3.5" />
                </span>
                <span className="text-xs font-black uppercase tracking-wider text-white">
                  Service Studio : Refonte &amp; Vectorisation HD
                </span>
              </div>
              <span className="text-[11px] font-mono font-black text-amber-300 bg-amber-400/15 border border-amber-400/30 px-2 py-0.5 rounded-full">
                +15€
              </span>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed mt-1">
              Notre studio vectorise et optimise votre logo en haute résolution (300 DPI SVG/EPS) sans perte, calibré pour la sérigraphie, le flocage DTF et les affiches grand format. Fichier vectoriel HD inclus dans votre livraison.
            </p>

            <ul className="mt-3 space-y-1.5 text-[11px] text-zinc-300">
              <li className="flex items-center gap-2">
                <FileCheck className="w-3.5 h-3.5 text-lime-400 shrink-0" />
                <span>Tracé vectoriel SVG infini prêt pour découpe vinyl &amp; flocage DTF</span>
              </li>
              <li className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-lime-400 shrink-0" />
                <span>Contraste calibré pour impression sur t-shirt Noir ou Blanc</span>
              </li>
              <li className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-lime-400 shrink-0" />
                <span>Rendu crest / monogramme officiel pour plastron merch</span>
              </li>
            </ul>
          </div>

          {/* Toggle Button & Refonte Action */}
          <div className="mt-4 pt-4 border-t border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <button
              id="btn-toggle-refonte-addon"
              type="button"
              onClick={toggleLogoRefonteAddon}
              className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wide transition flex items-center justify-center gap-2 ${
                input.isLogoRedesignRequested
                  ? 'bg-amber-400 hover:bg-amber-300 text-zinc-950 shadow-md shadow-amber-400/20'
                  : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700'
              }`}
            >
              {input.isLogoRedesignRequested ? (
                <>
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Option Refonte Sélectionnée (+15€)</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-3.5 h-3.5" />
                  <span>Ajouter la Refonte Studio (+15€)</span>
                </>
              )}
            </button>

            {/* Test generation preview if active */}
            {input.isLogoRedesignRequested && (
              <button
                type="button"
                disabled={isRefonding}
                onClick={handleTriggerRefonte}
                className="text-[11px] text-lime-400 hover:text-lime-300 font-semibold underline underline-offset-2 flex items-center gap-1 self-center sm:self-auto"
              >
                <Sparkles className="w-3 h-3" />
                {isRefonding ? 'Vectorisation en cours...' : 'Régénérer aperçu vectoriel'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
