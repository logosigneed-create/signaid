/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Signaid - Customizer Merch Textile DTF (/customizer & /customizer/:slug)
 * Outil de personnalisation textile pour créatifs :
 * - Placement Face / Dos haute précision
 * - Mockups Mannequins IA & Gabarits techniques
 * - Configuration produit (T-shirt, Hoodie, couleurs textile)
 * - Injection directe dans la boutique en marque blanche (/:slug/shop)
 * - Retour au Studio d'affiches (/studio/:slug)
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Shirt,
  User,
  Sparkles,
  ArrowLeft,
  ArrowRight,
  ShoppingBag,
  ExternalLink,
  Upload,
  CheckCircle2,
  Sliders,
  RotateCw,
  Eye,
  Loader2,
  Trash2,
  Zap,
} from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useParams } from '../router/Router';
import { isReservedSlug, sanitizeSlug } from '../constants/reservedRoutes';
import { EventInput, initialEventInput, resolveUnifiedEventSlug } from '../types';
import { MannequinMockup } from '../components/MannequinMockup';
import { DtfScanLoading } from '../components/DtfScanLoading';
import { clampDtfPlacement, resolveGarmentTemplateSrc } from '../utils/textileMockupUtils';
import { showToast } from '../utils/toastEmitter';
import { generateTryOnImage } from '../services/geminiService';

export interface MerchCustomizerProps {
  slug?: string;
  onNavigate?: (path: string) => void;
}

export const MerchCustomizer: React.FC<MerchCustomizerProps> = ({
  slug: propSlug,
  onNavigate,
}) => {
  const params = useParams<{ slug?: string }>();
  const rawSlug = propSlug || params?.slug || '';
  const currentSlug = sanitizeSlug(rawSlug) || 'nouveau-projet';

  const [input, setInput] = useState<EventInput>(() => {
    // Tentative de reprise du dernier brouillon local
    if (typeof window !== 'undefined') {
      try {
        const local = localStorage.getItem(`signaid_studio_draft_${currentSlug}`) ||
                      localStorage.getItem('signaid_studio_current_project') ||
                      localStorage.getItem('droppaid_last_event_input');
        if (local) {
          const parsed = JSON.parse(local);
          return { ...initialEventInput, ...parsed, slug: currentSlug };
        }
      } catch {
        // pass
      }
    }
    return { ...initialEventInput, slug: currentSlug, eventName: currentSlug.toUpperCase() };
  });

  const [activeSide, setActiveSide] = useState<'front' | 'back'>('front');
  const [viewMode, setViewMode] = useState<'model' | 'ghost'>('model');
  const [garmentType, setGarmentType] = useState<'tshirt' | 'hoodie'>('tshirt');
  const [garmentColor, setGarmentColor] = useState<string>('black');
  const [isGeneratingVton, setIsGeneratingVton] = useState(false);
  const [isInjectingToShop, setIsInjectingToShop] = useState(false);
  const [isLoadingProject, setIsLoadingProject] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const navigateTo = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    } else if (typeof window !== 'undefined') {
      window.history.pushState({}, '', path);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  // Chargement depuis Firestore si un slug valide est spécifié
  useEffect(() => {
    if (!currentSlug || isReservedSlug(currentSlug)) return;

    let isMounted = true;
    setIsLoadingProject(true);

    const loadData = async () => {
      try {
        let snapshot = await getDoc(doc(db, 'portals', currentSlug));
        if (!snapshot.exists()) {
          snapshot = await getDoc(doc(db, 'projects', currentSlug));
        }

        if (snapshot.exists() && isMounted) {
          const remoteData = snapshot.data() as EventInput;
          setInput((prev) => ({
            ...prev,
            ...remoteData,
            slug: currentSlug,
          }));
          if (remoteData.tshirtColor) setGarmentColor(remoteData.tshirtColor);
        }
      } catch (err) {
        console.warn('[MerchCustomizer] Lecture Firestore distante notice:', err);
      } finally {
        if (isMounted) setIsLoadingProject(false);
      }
    };

    loadData();
    return () => {
      isMounted = false;
    };
  }, [currentSlug]);

  const activePlacement = activeSide === 'back'
    ? (input.tshirtBackPlacement || { x: 50, y: 38, scale: 0.35 })
    : (input.tshirtFrontPlacement || { x: 68, y: 34, scale: 0.22 });

  const activeLogo = activeSide === 'back'
    ? (input.tshirtBackCustomLogo || input.tshirtCustomLogo || input.logoImage)
    : (input.tshirtCustomLogo || input.logoImage);

  const activeShootImage = activeSide === 'back'
    ? input.tshirtPreviewImages?.back
    : input.tshirtPreviewImages?.front;

  const handleUpdatePlacement = (key: 'x' | 'y' | 'scale', val: number) => {
    const updated = clampDtfPlacement({ ...activePlacement, [key]: val }, activeSide);
    setInput((prev) => {
      if (activeSide === 'back') {
        return { ...prev, tshirtBackPlacement: updated, tshirtBackLogoScale: updated.scale };
      }
      return { ...prev, tshirtFrontPlacement: updated, tshirtLogoScale: updated.scale };
    });
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setInput((prev) => {
          if (activeSide === 'back') {
            return { ...prev, tshirtBackCustomLogo: dataUrl };
          }
          return { ...prev, tshirtCustomLogo: dataUrl, logoImage: dataUrl };
        });
        showToast(`Logo ${activeSide === 'front' ? 'Face' : 'Dos'} mis à jour !`, 'success');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateAiTryOn = async () => {
    if (!activeLogo) {
      showToast('Veuillez importer un visuel avant de générer le shooting mannequin.', 'info');
      return;
    }

    setIsGeneratingVton(true);
    try {
      const isBack = activeSide === 'back';
      const prompt = `Hyper-realistic fashion lookbook photography of a premium heavyweight streetwear ${garmentType} in ${garmentColor} color, ${isBack ? 'view from the back' : 'front view'}, cinematic lighting, clean urban aesthetic.`;
      const base64Mannequin = await generateTryOnImage(
        '',
        activeLogo,
        garmentType || 'tshirt',
        prompt,
        'Trends',
        isBack ? 'back' : 'front',
        activeLogo
      );

      if (base64Mannequin) {
        setInput((prev) => ({
          ...prev,
          tshirtPreviewImages: {
            ...(prev.tshirtPreviewImages || {}),
            [activeSide]: base64Mannequin,
          },
        }));
        showToast(`Shooting mannequin ${isBack ? 'Dos' : 'Face'} généré avec succès !`, 'success');
      }
    } catch (err) {
      console.error('[MerchCustomizer] Erreur génération VTON:', err);
      showToast('Échec de génération IA du mannequin. Repli sur le gabarit technique.', 'error');
    } finally {
      setIsGeneratingVton(false);
    }
  };

  // Action clé : Injection directe dans la boutique officielle (/shop)
  const handleInjectIntoShop = async () => {
    setIsInjectingToShop(true);
    try {
      const targetSlug = resolveUnifiedEventSlug(input) || currentSlug;
      const cleanPayload = {
        ...input,
        slug: targetSlug,
        tshirtColor: garmentColor,
        updatedAt: new Date().toISOString(),
        tshirtPreviewImages: {
          front: input.tshirtPreviewImages?.front || null,
          back: input.tshirtPreviewImages?.back || null,
        },
      };

      // Sauvegarde dans les collections portals et projects
      await Promise.all([
        setDoc(doc(db, 'portals', targetSlug), cleanPayload, { merge: true }),
        setDoc(doc(db, 'projects', targetSlug), cleanPayload, { merge: true }),
      ]);

      // Sauvegarde locale de confirmation
      if (typeof window !== 'undefined') {
        localStorage.setItem(`signaid_studio_draft_${targetSlug}`, JSON.stringify(cleanPayload));
        localStorage.setItem('droppaid_last_event_input', JSON.stringify(cleanPayload));
      }

      showToast('✨ Visuels injectés dans la boutique officielle ! Redirection...', 'success');

      setTimeout(() => {
        navigateTo(`/${targetSlug}/shop`);
      }, 800);
    } catch (err) {
      console.error('[MerchCustomizer] Erreur injection boutique:', err);
      showToast('Erreur lors de la synchronisation vers la boutique.', 'error');
    } finally {
      setIsInjectingToShop(false);
    }
  };

  const templateSrc = resolveGarmentTemplateSrc(garmentType, garmentColor, activeSide);

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans flex flex-col selection:bg-purple-500 selection:text-white">
      {/* Top Header */}
      <header className="border-b border-zinc-850 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigateTo(`/studio/${currentSlug}`)}
              className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white transition cursor-pointer flex items-center gap-1.5 text-xs font-mono font-bold"
              title="Retourner au Studio d'Affiches"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Retour Studio</span>
            </button>

            <div className="h-4 w-[1px] bg-zinc-800" />

            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center font-mono font-black text-sm">
                <Shirt className="w-4 h-4" />
              </div>
              <div>
                <span className="font-mono text-xs font-bold uppercase text-white block">
                  CUSTOMIZER MERCH TEXTILE DTF
                </span>
                <span className="text-[10px] font-mono text-purple-400 block -mt-0.5">
                  PROJET : {currentSlug.toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigateTo(`/hub/${currentSlug}`)}
              className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 text-xs font-mono font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5 text-lime-400" />
              <span className="hidden sm:inline">Voir SmartLink</span>
            </button>

            <button
              onClick={handleInjectIntoShop}
              disabled={isInjectingToShop}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-mono font-black text-xs uppercase tracking-wider transition shadow-lg shadow-purple-600/25 active:scale-95 disabled:opacity-60 cursor-pointer flex items-center gap-2"
            >
              {isInjectingToShop ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Synchronisation...</span>
                </>
              ) : (
                <>
                  <ShoppingBag className="w-4 h-4" />
                  <span>Injecter dans la Boutique (/{currentSlug}/shop)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Control Panel (5 cols) */}
        <section className="lg:col-span-5 flex flex-col gap-5">
          {/* Side & View Selector */}
          <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase font-bold text-zinc-400">Vue active vêtement :</span>
              <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800 text-xs font-mono">
                <button
                  type="button"
                  onClick={() => setActiveSide('front')}
                  className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                    activeSide === 'front' ? 'bg-purple-600 text-white font-black' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Face
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSide('back')}
                  className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                    activeSide === 'back' ? 'bg-purple-600 text-white font-black' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Dos
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80">
              <span className="text-xs font-mono uppercase font-bold text-zinc-400">Rendu :</span>
              <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800 text-xs font-mono">
                <button
                  type="button"
                  onClick={() => setViewMode('model')}
                  className={`px-3 py-1 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    viewMode === 'model' ? 'bg-purple-600 text-white font-black' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Mannequin</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('ghost')}
                  className={`px-3 py-1 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    viewMode === 'ghost' ? 'bg-purple-600 text-white font-black' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Shirt className="w-3.5 h-3.5" />
                  <span>Gabarit</span>
                </button>
              </div>
            </div>
          </div>

          {/* Configuration Produit & Couleurs */}
          <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-4">
            <h3 className="text-xs font-mono uppercase font-bold text-zinc-300">Modèle &amp; Teinte Textile</h3>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <button
                type="button"
                onClick={() => setGarmentType('tshirt')}
                className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 transition cursor-pointer ${
                  garmentType === 'tshirt' ? 'bg-purple-600/20 border-purple-500 text-purple-300 font-bold' : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                }`}
              >
                <Shirt className="w-4 h-4" />
                <span>T-Shirt 240g</span>
              </button>
              <button
                type="button"
                onClick={() => setGarmentType('hoodie')}
                className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 transition cursor-pointer ${
                  garmentType === 'hoodie' ? 'bg-purple-600/20 border-purple-500 text-purple-300 font-bold' : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                }`}
              >
                <Shirt className="w-4 h-4" />
                <span>Hoodie 400g</span>
              </button>
            </div>

            <div>
              <span className="text-[11px] font-mono text-zinc-400 block mb-2">Couleur textile :</span>
              <div className="flex items-center gap-3">
                {[
                  { key: 'black', label: 'Noir Pur', hex: '#0a0a0a' },
                  { key: 'white', label: 'Blanc', hex: '#f4f4f5' },
                  { key: 'anthracite', label: 'Anthracite', hex: '#27272a' },
                  { key: 'navy', label: 'Bleu Marine', hex: '#1e293b' },
                ].map((color) => (
                  <button
                    key={color.key}
                    type="button"
                    onClick={() => setGarmentColor(color.key)}
                    className={`w-8 h-8 rounded-full border-2 transition-transform cursor-pointer ${
                      garmentColor === color.key ? 'border-purple-400 scale-110 shadow-lg' : 'border-zinc-700 hover:scale-105'
                    }`}
                    style={{ backgroundColor: color.hex }}
                    title={color.label}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Logo & Calibrage DTF */}
          <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono uppercase font-bold text-zinc-300">
                Visuel {activeSide === 'front' ? 'Face' : 'Dos'}
              </h3>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] font-mono font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Upload className="w-3 h-3" />
                <span>Changer logo</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handleLogoUpload}
              />
            </div>

            {/* Sliders de placement X, Y, Scale */}
            <div className="space-y-3 pt-2">
              <div>
                <div className="flex justify-between text-[11px] font-mono text-zinc-400 mb-1">
                  <span>Position Horizontale (X)</span>
                  <span>{Math.round(activePlacement.x)}%</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="80"
                  step="1"
                  value={activePlacement.x}
                  onChange={(e) => handleUpdatePlacement('x', parseFloat(e.target.value))}
                  className="w-full accent-purple-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] font-mono text-zinc-400 mb-1">
                  <span>Position Verticale (Y)</span>
                  <span>{Math.round(activePlacement.y)}%</span>
                </div>
                <input
                  type="range"
                  min="15"
                  max="80"
                  step="1"
                  value={activePlacement.y}
                  onChange={(e) => handleUpdatePlacement('y', parseFloat(e.target.value))}
                  className="w-full accent-purple-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] font-mono text-zinc-400 mb-1">
                  <span>Échelle d'impression</span>
                  <span>{Math.round(activePlacement.scale * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.10"
                  max="0.55"
                  step="0.01"
                  value={activePlacement.scale}
                  onChange={(e) => handleUpdatePlacement('scale', parseFloat(e.target.value))}
                  className="w-full accent-purple-500 cursor-pointer"
                />
              </div>
            </div>

            {/* Bouton Génération Shooting IA */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleGenerateAiTryOn}
                disabled={isGeneratingVton || !activeLogo}
                className="w-full py-2.5 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-purple-200 font-mono font-bold text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isGeneratingVton ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                    <span>Génération IA du Mannequin...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <span>Générer Shooting Mannequin {activeSide === 'front' ? 'Face' : 'Dos'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </section>

        {/* Right Preview Canvas (7 cols) */}
        <section className="lg:col-span-7 flex flex-col items-center justify-center">
          <div className="relative w-full max-w-lg aspect-[4/5] rounded-3xl overflow-hidden border border-zinc-800 bg-zinc-900 flex items-center justify-center shadow-2xl">
            {viewMode === 'model' ? (
              isGeneratingVton ? (
                <DtfScanLoading silhouetteSrc={templateSrc} />
              ) : (
                <MannequinMockup
                  input={input}
                  activeView={activeSide === 'back' ? 'dos' : 'face'}
                  onToggleView={(view) => setActiveSide(view === 'dos' ? 'back' : 'front')}
                  placement={activePlacement}
                  isAiGenerated={Boolean(activeShootImage)}
                  onTriggerVton={() => handleGenerateAiTryOn()}
                  isGeneratingVton={isGeneratingVton}
                />
              )
            ) : (
              <div className="relative w-full h-full flex items-center justify-center p-6 select-none">
                <img
                  src={templateSrc}
                  alt={`Template ${garmentType} ${activeSide}`}
                  className="max-h-full max-w-full object-contain filter drop-shadow-2xl"
                  draggable={false}
                />

                {/* Calque logo positionné */}
                {activeLogo && (
                  <div
                    className="absolute pointer-events-none"
                    style={{
                      left: `${activePlacement.x}%`,
                      top: `${activePlacement.y}%`,
                      width: `${activePlacement.scale * 100}%`,
                      transform: 'translate(-50%, -50%)',
                    }}
                  >
                    <img
                      src={activeLogo}
                      alt="Logo impression"
                      className="w-full h-auto object-contain"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Badge RÈGLE D'OR VISUELLE */}
            {activeShootImage && (
              <div className="absolute top-4 left-4 z-20 px-3 py-1 rounded-full bg-black/70 backdrop-blur-md border border-lime-400/40 text-lime-400 font-mono text-[10px] font-bold flex items-center gap-1.5 shadow-lg">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>SHOOTING RÉEL VALIDÉ</span>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default MerchCustomizer;
