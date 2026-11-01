import React, { useState, useRef } from 'react';
import { EventInput, DjBlendMode } from '../types';
import { removeBackground } from '../services/autoCutout';
import {
  Upload,
  User,
  Sliders,
  Trash2,
  Check,
  Zap,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

interface VisualAssetCustomizerProps {
  input: EventInput;
  setInput: React.Dispatch<React.SetStateAction<EventInput>>;
}

const BLEND_MODES: { key: DjBlendMode; label: string; desc: string }[] = [
  { key: 'duotone-rave', label: 'Bichromie Club', desc: 'Teinte néon assortie à la nuit' },
  { key: 'cutout-vignette', label: 'Détourage Dégradé', desc: 'Fondu noir progressif en bas' },
  { key: 'monochrome-silver', label: 'Noir & Blanc Brut', desc: 'Contraste argentique' },
  { key: 'clean-original', label: 'Couleurs Originales', desc: 'Photo non filtrée' },
];

export const VisualAssetCustomizer: React.FC<VisualAssetCustomizerProps> = ({ input, setInput }) => {
  const [dragActiveDj, setDragActiveDj] = useState(false);
  const [isRemovingBg, setIsRemovingBg] = useState(false);
  const djFileInputRef = useRef<HTMLInputElement>(null);

  const processImageFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Veuillez sélectionner un fichier image valide (PNG, JPG, WebP).');
      return;
    }

    setIsRemovingBg(true);

    try {
      const { dataUrl } = await removeBackground(file);
      setInput((prev) => ({
        ...prev,
        djPhoto: dataUrl,
        djPhotoBlendMode: prev.djPhotoBlendMode ?? 'duotone-rave',
        djPhotoOpacity: prev.djPhotoOpacity ?? 0.9,
        djPhotoScale: prev.djPhotoScale ?? 1.0,
        isSubjectBackgroundRemoved: true,
      }));
    } catch (err) {
      console.error('Échec détourage neuronal, repli sur image locale brute :', err);
      // Fallback de sécurité : si le détourage échoue, on charge l'image originale sans bloquer l'artisan
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        if (dataUrl) {
          setInput((prev) => ({
            ...prev,
            djPhoto: dataUrl,
            djPhotoBlendMode: prev.djPhotoBlendMode ?? 'duotone-rave',
            djPhotoOpacity: prev.djPhotoOpacity ?? 0.9,
            djPhotoScale: prev.djPhotoScale ?? 1.0,
          }));
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setIsRemovingBg(false);
    }
  };

  const handleClearDj = () => {
    setInput((prev) => ({ ...prev, djPhoto: undefined, isSubjectBackgroundRemoved: false }));
  };

  return (
    <div className="mt-6 pt-6 border-t border-zinc-800">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-md bg-lime-400/20 text-lime-400">
              <User className="w-3.5 h-3.5" />
            </span>
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-white">
              Photo &amp; Portrait du DJ / Artiste (Détourage Studio Photoroom)
            </h3>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Uploadez votre portrait. L'API Photoroom supprime le fond au poil près (cheveux inclus) et l'incruste sur vos visuels.
          </p>
        </div>

        {input.djPhoto && (
          <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-lime-400/10 text-lime-400 border border-lime-400/30 font-bold flex items-center gap-1.5 self-start sm:self-auto">
            <CheckCircle2 className="w-3.5 h-3.5" />
            DÉTOURAGE STUDIO ACTif
          </span>
        )}
      </div>

      {/* Hidden File Input */}
      <input
        ref={djFileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onClick={(e) => { (e.target as HTMLInputElement).value = ''; }}
        onChange={(e) => {
          if (e.target.files?.[0]) processImageFile(e.target.files[0]);
          e.target.value = '';
        }}
      />

      {isRemovingBg ? (
        <div className="border-2 border-dashed border-lime-400/60 bg-lime-400/5 rounded-2xl p-8 text-center flex flex-col items-center justify-center min-h-[140px] space-y-3">
          <div className="w-8 h-8 border-2 border-lime-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-bold text-lime-300 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-4 h-4" />
            Détourage intelligent Photoroom en cours (cheveux &amp; contours)...
          </p>
        </div>
      ) : !input.djPhoto ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragActiveDj(true);
          }}
          onDragLeave={() => setDragActiveDj(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragActiveDj(false);
            if (e.dataTransfer.files?.[0]) processImageFile(e.dataTransfer.files[0]);
          }}
          onClick={() => djFileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[140px] ${dragActiveDj
              ? 'border-lime-400 bg-lime-400/10 scale-[1.01]'
              : 'border-zinc-800 hover:border-zinc-700 bg-zinc-950/60 hover:bg-zinc-950'
            }`}
        >
          <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-2 text-lime-400">
            <Upload className="w-4 h-4" />
          </div>
          <p className="text-xs font-bold text-white mb-0.5">
            Glissez la photo du DJ ici ou <span className="text-lime-400 underline underline-offset-2">parcourir</span>
          </p>
          <p className="text-[11px] text-zinc-500">
            Détourage automatique studio instantané (JPG, PNG, WebP)
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 bg-zinc-950/80 border border-zinc-800 rounded-2xl p-4">
          {/* Photo Thumbnail */}
          <div className="md:col-span-4 flex flex-col items-center justify-center bg-black/60 rounded-xl p-3 border border-zinc-800/80 relative">
            <div
              onClick={() => djFileInputRef.current?.click()}
              className="w-28 h-28 rounded-xl overflow-hidden relative border border-zinc-700/60 hover:border-lime-400/60 bg-[radial-gradient(#333_1px,transparent_1px)] [background-size:8px_8px] cursor-pointer group transition"
              title="Cliquer pour remplacer la photo en 1 clic"
            >
              <img
                src={input.djPhoto}
                alt="Portrait DJ Détouré"
                loading="lazy"
                decoding="async"
                className="w-full h-full object-contain group-hover:scale-105 transition-transform image-render-hd"
                style={{
                  imageRendering: 'auto',
                  WebkitBackfaceVisibility: 'hidden',
                  backfaceVisibility: 'hidden',
                  transform: 'translateZ(0)',
                }}
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="text-[9px] font-mono font-bold text-lime-400 bg-black/80 px-2 py-0.5 rounded border border-lime-400/30 flex items-center gap-1">
                  <Upload className="w-2.5 h-2.5" />
                  Remplacer
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <button
                type="button"
                onClick={() => djFileInputRef.current?.click()}
                className="text-[11px] text-lime-400 hover:text-lime-300 font-bold px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 transition flex items-center gap-1 cursor-pointer"
              >
                <Upload className="w-3 h-3" />
                Remplacer (1 clic)
              </button>
              <button
                type="button"
                onClick={handleClearDj}
                className="text-[11px] text-rose-400 hover:text-rose-300 px-2.5 py-1 rounded bg-rose-500/10 border border-rose-500/20 transition flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                Supprimer
              </button>
            </div>
          </div>

          {/* Controls: Blend Mode, Opacity & Scale */}
          <div className="md:col-span-8 space-y-3">
            <div>
              <span className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                Style d'incrustation sur l'affiche :
              </span>
              <div className="grid grid-cols-2 gap-2">
                {BLEND_MODES.map((mode) => {
                  const active = (input.djPhotoBlendMode || 'duotone-rave') === mode.key;
                  return (
                    <button
                      key={mode.key}
                      type="button"
                      onClick={() =>
                        setInput((prev) => ({ ...prev, djPhotoBlendMode: mode.key }))
                      }
                      className={`p-2 rounded-xl text-left border transition ${active
                          ? 'bg-zinc-800 border-lime-400 text-white ring-1 ring-lime-400'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                        }`}
                    >
                      <p className="text-[11px] font-bold">{mode.label}</p>
                      <p className="text-[9px] text-zinc-500 mt-0.5">{mode.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <div className="flex justify-between text-[11px] text-zinc-400 mb-1">
                  <span>Opacité Photo</span>
                  <span className="font-mono text-white">
                    {Math.round((input.djPhotoOpacity ?? 0.9) * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="1.0"
                  step="0.05"
                  value={input.djPhotoOpacity ?? 0.9}
                  onChange={(e) =>
                    setInput((prev) => ({
                      ...prev,
                      djPhotoOpacity: parseFloat(e.target.value),
                    }))
                  }
                  className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-lime-400"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-zinc-400 mb-1">
                  <span>Échelle d'Agrandissement</span>
                  <span className="font-mono text-white">
                    {(input.djPhotoScale ?? 1.0).toFixed(1)}x
                  </span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="4.0"
                  step="0.05"
                  value={input.djPhotoScale ?? 1.0}
                  onChange={(e) =>
                    setInput((prev) => ({
                      ...prev,
                      djPhotoScale: parseFloat(e.target.value),
                    }))
                  }
                  className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-lime-400"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};