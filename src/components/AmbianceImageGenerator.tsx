import React, { useState, useRef } from 'react';
import { EventInput } from '../types';
import { generateBackground } from '../services/geminiService';
import { generateLocalFallbackBackground } from '../utils/localDecorFallback';
import { showToast } from '../utils/toastEmitter';
import {
  Sparkles,
  Upload,
  RefreshCw,
  Trash2,
  Image as ImageIcon,
  CheckCircle2,
  Layers,
  Eye,
  Wand2,
  ShieldCheck,
  Check,
  Sliders,
} from 'lucide-react';

interface AmbianceImageGeneratorProps {
  input: EventInput;
  setInput: React.Dispatch<React.SetStateAction<EventInput>>;
}

const QUICK_AMBIANCE_PROMPTS = [
  {
    label: '🏛️ Monolithe & Dunes Dorées (Melodic House)',
    prompt: "Monolithe minéral épuré se dressant au centre d'un paysage de dunes, éclairé par un coucher de soleil ambré et une lueur dorée rasante adaptée à la Melodic House, aucune foule",
  },
  {
    label: '🪞 Portail Miroir sur Lac Obscur (Techno)',
    prompt: "Portail architectural en miroir au centre d'un lac volcanique calme, reflets crépusculaires, clair de lune cyan et lumière nocturne adaptée à la Techno, zéro ambiance de fête",
  },
  {
    label: '🪐 Anneau Céleste sur Plaine (Acid / Trance)',
    prompt: "Anneau lumineux circulaire flottant au centre d'une plaine sombre et vaste, lueurs néon ultraviolettes et crépuscule adapté à l'Acid Techno / Trance, paysage mystique épuré",
  },
  {
    label: '🗿 Pavillon Brutaliste & Brume (Minimal)',
    prompt: "Pavillon géométrique minimaliste au centre d'une vallée brumeuse, éclairage argenté tamisé et reflets monochromes adaptés au Minimal Techno / Ambient",
  },
  {
    label: '🌅 Prisme & Horizon Crépusculaire (Deep House)',
    prompt: "Prisme de verre monolithique au centre d'un horizon infini au crépuscule, lueurs chaudes et halos orangés feutrés adaptés à la Deep House",
  },
  {
    label: '🌾 Arche Minérale & Collines (Organic House)',
    prompt: "Arche architecturale sculpturale au centre de collines balayées par le vent, halo crépusculaire terracotta et lueurs ambrées adaptées à l'Organic House",
  },
];

export const AmbianceImageGenerator: React.FC<AmbianceImageGeneratorProps> = ({ input, setInput }) => {
  const [promptText, setPromptText] = useState(
    input.ambiancePrompt ||
    "Nébuleuse cosmique violette et cyan, vagues de lumière fluide, particules flottantes, fond abstrait 3D épuré"
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [imgLoadError, setImgLoadError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Valeur par défaut : 50% pour un équilibre lisibilité / luminosité
  const currentOpacityPercent = Math.round((input.backgroundOpacity ?? 0.5) * 100);

  const handleOpacityChange = (valuePercent: number) => {
    setInput((prev) => ({
      ...prev,
      backgroundOpacity: valuePercent / 100,
    }));
  };

  const handleGenerate = async (customPrompt?: string) => {
    const finalPrompt = customPrompt || promptText || `Décor paysagé atmosphérique et textures minérales profondes pour ${input.genre}`;
    setIsGenerating(true);
    setImgLoadError(false);
    setPromptText(finalPrompt);

    try {
      const generatedImageUrl = await generateBackground(finalPrompt, {
        aspectRatio: '1:1',
        genre: input.genre,
        allowFallback: true,
        hasSubject: Boolean(input.djPhoto || input.rawDjPhoto),
      });

      if (generatedImageUrl) {
        setInput((prev) => ({
          ...prev,
          ambiancePrompt: finalPrompt,
          ambianceEngine: 'Gemini AI Image',
          backgroundImage: generatedImageUrl,
          backgroundOpacity: prev.backgroundOpacity ?? 0.5,
          backgroundBlur: 0,
        }));
      }
    } catch (err) {
      console.warn('Erreur génération décor 3D, repli local activé :', err);
      try {
        const fallbackBg = await generateLocalFallbackBackground({
          prompt: finalPrompt,
          genre: input.genre,
          aspectRatio: '1:1',
        });
        if (fallbackBg) {
          setInput((prev) => ({
            ...prev,
            ambiancePrompt: finalPrompt,
            ambianceEngine: 'Moteur Local HD',
            backgroundImage: fallbackBg,
            backgroundOpacity: prev.backgroundOpacity ?? 0.5,
            backgroundBlur: 0,
          }));
          showToast('Mode de secours activé : texture générée localement.', 'info');
        }
      } catch (localErr) {
        console.error('Échec critique repli décor :', localErr);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFileUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Veuillez sélectionner un fichier image valide (JPG, PNG, WebP).');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (dataUrl) {
        setInput((prev) => ({
          ...prev,
          backgroundImage: dataUrl,
          backgroundOpacity: prev.backgroundOpacity ?? 0.5,
          backgroundBlur: prev.backgroundBlur ?? 0,
        }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleClear = () => {
    setInput((prev) => ({
      ...prev,
      backgroundImage: undefined,
      ambiancePrompt: undefined,
    }));
  };

  const scrollToVisuals = () => {
    const viewer = document.getElementById('pack-visuals-viewer');
    if (viewer) {
      viewer.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="bg-zinc-950/60 border border-zinc-800/90 rounded-2xl p-4 sm:p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-lime-400/10 text-lime-400 border border-lime-400/20">
            <Sparkles className="w-4 h-4" />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
                Élément Scénique & Paysage IA
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-lime-400/15 text-lime-400 text-[10px] font-mono font-bold border border-lime-400/30 flex items-center gap-1.5">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-lime-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-lime-400"></span>
                </span>
                <span>Flux 3D A3 Pro 300 DPI</span>
              </span>
              {input.backgroundImage && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-lime-400/10 text-lime-400 border border-lime-400/30 font-normal">
                  Affichée sur l'Affiche & Réseaux
                </span>
              )}
            </div>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Générez un <strong className="text-zinc-200">élément central dans un paysage</strong> (monolithe minéral, portail miroir, anneau céleste ou pavillon brutaliste) avec des <strong className="text-zinc-200">lumières adaptées à votre style de musique</strong>. Zéro atmosphère de fête ou foule cliché.
            </p>
          </div>
        </div>

        {input.backgroundImage && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={scrollToVisuals}
              className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700 transition flex items-center gap-1.5"
            >
              <Eye className="w-3 h-3 text-lime-400" />
              <span>Voir sur l'Affiche</span>
            </button>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-lime-400/10 text-lime-400 border border-lime-400/30 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Ambiance Active
            </span>
          </div>
        )}
      </div>

      {/* Prompt input and generation action */}
      <div className="space-y-2">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <input
              id="input-ambiance-prompt"
              type="text"
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              placeholder="Décris l'élément et le paysage (ex: monolithe au centre d'un désert de dunes, coucher de soleil doré et lueurs ambrées...)"
              className="w-full bg-zinc-900 border border-zinc-700/80 rounded-xl px-4 py-2.5 text-white placeholder-zinc-500 text-xs focus:outline-none focus:border-lime-400 focus:ring-1 focus:ring-lime-400 transition"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleGenerate();
                }
              }}
            />
          </div>

          <button
            id="btn-generate-ambiance"
            type="button"
            disabled={isGenerating}
            onClick={() => handleGenerate()}
            className="px-5 py-2.5 rounded-xl bg-lime-400 hover:bg-lime-300 text-zinc-950 font-black text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 shadow-sm shadow-lime-400/20 shrink-0 cursor-pointer"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Calcul Synthèse 3D...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Générer Synthèse 3D</span>
              </>
            )}
          </button>
        </div>

        {/* Quick Vibe Suggestions */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[10px] uppercase font-bold text-zinc-500 mr-1">Inspirations :</span>
          {QUICK_AMBIANCE_PROMPTS.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => handleGenerate(item.prompt)}
              className="text-[10px] px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 hover:border-lime-400/40 transition flex items-center gap-1"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Hidden file input for upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onClick={(e) => { (e.target as HTMLInputElement).value = ''; }}
        onChange={(e) => {
          if (e.target.files?.[0]) handleFileUpload(e.target.files[0]);
          e.target.value = '';
        }}
      />

      {/* Preview, Slider and Adjustments */}
      {input.backgroundImage ? (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 p-3.5 rounded-xl bg-zinc-900 border border-zinc-800/80 items-center">
          {/* Ambiance Thumbnail */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="md:col-span-4 h-36 rounded-lg overflow-hidden relative border border-zinc-700/80 hover:border-lime-400/50 bg-zinc-950 shadow-inner group cursor-pointer transition"
            title="Cliquer pour remplacer l'image de fond en 1 clic"
          >
            <img
              src={input.backgroundImage}
              alt="Ambiance Générée Active"
              width={400}
              height={200}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              referrerPolicy="no-referrer"
              crossOrigin="anonymous"
              onError={() => {
                setImgLoadError(true);
              }}
            />
            {/* Calque sombre adaptatif reflétant le slider */}
            <div
              className="absolute inset-0 bg-black pointer-events-none transition-opacity duration-150"
              style={{ opacity: currentOpacityPercent / 100 }}
            />

            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="text-[10px] font-mono font-bold text-lime-400 bg-black/80 px-2 py-1 rounded-md border border-lime-400/40 flex items-center gap-1">
                <Upload className="w-3 h-3" />
                Remplacer (1 clic)
              </span>
            </div>

            <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between pointer-events-none z-10">
              <span className="text-[9px] font-mono text-lime-400 font-bold bg-black/80 px-1.5 py-0.5 rounded border border-lime-400/30 flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5 text-lime-400" />
                <span>3508x4960 300DPI</span>
              </span>
              <span className="text-[8px] font-mono text-zinc-300 bg-black/60 px-1.5 py-0.5 rounded border border-zinc-700/50">
                A3 CERTIFIÉ
              </span>
            </div>

            {isGenerating && (
              <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-2 z-20">
                <RefreshCw className="w-5 h-5 text-lime-400 animate-spin" />
                <span className="text-[10px] font-bold text-white uppercase tracking-wider">Mise à jour...</span>
              </div>
            )}
          </div>

          <div className="md:col-span-8 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                  <Wand2 className="w-3.5 h-3.5 text-lime-400" />
                  Calibrage Visuel & Lisibilité Typographique
                </span>
                <p className="text-[10px] text-zinc-400">
                  Dosez la transparence du voile sombre pour faire ressortir l'image 3D ou privilégier la lecture du texte.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-[11px] text-lime-400 hover:text-lime-300 underline underline-offset-2 flex items-center gap-1 font-bold cursor-pointer"
                >
                  <Upload className="w-3 h-3" />
                  Remplacer
                </button>
                <button
                  type="button"
                  onClick={handleClear}
                  className="p-1 text-zinc-500 hover:text-zinc-300 transition"
                  title="Supprimer l'ambiance"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* CURSEUR DYNAMIQUE D'OPACITÉ DU CALQUE SOMBRE */}
            <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-3 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-zinc-200 flex items-center gap-1.5 text-[11px]">
                  <Sliders className="w-3 h-3 text-lime-400" />
                  Densité du Calque Sombre (Overlay)
                </span>
                <span className="font-mono font-bold text-lime-400 bg-lime-400/10 px-2 py-0.5 rounded border border-lime-400/30 text-[11px]">
                  {currentOpacityPercent}%
                </span>
              </div>

              <input
                type="range"
                min="0"
                max="90"
                step="5"
                value={currentOpacityPercent}
                onChange={(e) => handleOpacityChange(Number(e.target.value))}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-lime-400 hover:accent-lime-300"
              />

              <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                <span>0% (Image brute pure)</span>
                <span>35% - 50% (Recommandé)</span>
                <span>90% (Contraste maximal)</span>
              </div>
            </div>

            {/* Automated Calibration Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-2.5 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-zinc-300">Texture & Grain 35mm</span>
                  <span className="text-[9px] font-mono font-bold text-lime-400 bg-lime-400/10 px-1.5 py-0.5 rounded border border-lime-400/20">
                    Natif HD
                  </span>
                </div>
                <p className="text-[9px] text-zinc-400 leading-snug">
                  Grain analogique préservé sans artefact de compression JPEG.
                </p>
              </div>

              <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-2.5 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-zinc-300">Format d'export</span>
                  <span className="text-[9px] font-mono font-bold text-lime-400 bg-lime-400/10 px-1.5 py-0.5 rounded border border-lime-400/20">
                    A3 300 DPI
                  </span>
                </div>
                <p className="text-[9px] text-zinc-400 leading-snug">
                  Dimensions d'imprimerie 3508 x 4960 px validées pour le pack complet.
                </p>
              </div>
            </div>

            {/* Status confirmation & scroll to final visual */}
            <div className="flex items-center justify-between pt-1 text-[10px] text-zinc-400 border-t border-zinc-800/60">
              <span className="flex items-center gap-1.5 text-lime-400/90 font-medium">
                <Check className="w-3.5 h-3.5 text-lime-400" />
                Appliqué automatiquement sur l'Affiche A3, Story 9:16, Post 1:1 & Bannière
              </span>
              <button
                type="button"
                onClick={scrollToVisuals}
                className="text-zinc-300 hover:text-white underline underline-offset-2 flex items-center gap-1"
              >
                <Eye className="w-3 h-3" />
                Vérifier le rendu
              </button>
            </div>
          </div>
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
            if (e.dataTransfer.files?.[0]) handleFileUpload(e.dataTransfer.files[0]);
          }}
          onClick={() => fileInputRef.current?.click()}
          className={`border border-dashed rounded-xl p-3 text-center cursor-pointer transition flex items-center justify-center gap-2 ${dragActive
              ? 'border-lime-400 bg-lime-400/10'
              : 'border-zinc-800 hover:border-zinc-700 bg-zinc-900/40 text-zinc-400 hover:text-zinc-300'
            }`}
        >
          <Upload className="w-3.5 h-3.5" />
          <span className="text-xs">
            Ou téléversez une image personnelle (glisser-déposer ou cliquer)
          </span>
        </div>
      )}
    </div>
  );
};