/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Dropper Studio - Assistant Guidé Hyper-Progressif Mobile (Micro-Steps Wizard)
 */

import React, { useRef, useState, useEffect } from 'react';
import { EventInput, TypographyStyle, LogoColorMode, FocusedTarget, getDefaultFormatTransforms } from '../types';
import { processLogoDeterministic, remasterSubjectAi, harmonizeSubjectWithAi } from '../services/imageProcessingService';
import { generateBackground, getAspectRatioForFormat } from '../services/geminiService';
import { generateLocalFallbackBackground } from '../utils/localDecorFallback';
import { removeBackgroundWithCanvas } from '../utils/backgroundRemover';
import { removeBackground } from '../services/autoCutout';
import { showToast } from '../utils/toastEmitter';
import { createLocalLogoPreview, optimizeLogoForUpload } from '../utils/logoOptimizer';
import { StyleDirectionPicker } from './StyleDirectionPicker';
import {
  Upload,
  Sparkles,
  Scissors,
  Layers,
  RotateCcw,
  Palette,
  Loader2,
  Calendar,
  Clock,
  MapPin,
  Link,
  Tag,
  Type,
  Flame,
  ShieldCheck,
  Wand2,
  ChevronLeft,
  ChevronRight,
  Sun,
  ImagePlus,
  Sliders,
  ExternalLink,
  Check,
  ArrowRight,
  ArrowLeft,
  Shield,
  User,
  Trash2,
  Camera,
} from 'lucide-react';

interface MobileMicroWizardProps {
  input: EventInput;
  setInput: React.Dispatch<React.SetStateAction<EventInput>>;
  previewFormat: 'post' | 'a3' | 'story' | 'banner' | 'tshirt';
  onUpdateTransform: (newScale: number, newOffsetY: number) => void;
  onResetFormatToMaster: () => void;
  isUnlocked: boolean;
  onTriggerPayment: () => void;
  isDayMode?: boolean;
  focusedTarget?: FocusedTarget;
  setFocusedTarget?: (target: FocusedTarget) => void;
  onFinishWizard?: () => void;
  currentStep?: number;
  onStepChange?: (step: number) => void;
}

const AMBIANCE_PRESETS = [
  {
    label: '🏛️ Dunes & Monolithe',
    genre: 'Melodic House',
    prompt: "Monolithe minéral épuré se dressant au centre d'un paysage de dunes, éclairé par un coucher de soleil doré rasante, Melodic House",
  },
  {
    label: '🪐 Nébuleuse & Anneau Cyber',
    genre: 'Acid Techno',
    prompt: "Anneau céleste lumineux flottant au-dessus d'une plaine sombre, lueurs néon ultraviolettes et horizon stellaire, Acid Techno",
  },
  {
    label: '🗿 Pavillon Brutaliste',
    genre: 'Minimal Techno',
    prompt: "Pavillon géométrique minimaliste en béton brut dans une vallée brumeuse, éclairage argenté tamisé, Minimal Techno",
  },
  {
    label: '🌅 Prisme Crépusculaire',
    genre: 'Deep House',
    prompt: "Prisme de verre monolithique au centre d'un horizon infini au crépuscule, lueurs chaudes ambrées, Deep House",
  },
  {
    label: '⚡ Grille Cyberpunk Néon',
    genre: 'Hard Groove',
    prompt: "Structure géométrique industrielle cyberpunk, néons vert acide et cyan perçant l'obscurité, Hard Groove",
  },
  {
    label: '🌾 Arche Solaire Minérale',
    genre: 'Organic House',
    prompt: "Arche architecturale sculpturale dans des collines balayées par le vent, halo crépusculaire terracotta et ambre, Organic House",
  },
];

const QUICK_TAGLINES = ['FUTUR', 'ALL NIGHT LONG', 'MELODIC TECHNO', 'SPECIAL GUEST', 'HARD GROOVE', 'LIVE ACT'];

export const MobileMicroWizard: React.FC<MobileMicroWizardProps> = ({
  input,
  setInput,
  previewFormat,
  onUpdateTransform,
  onResetFormatToMaster,
  isUnlocked,
  onTriggerPayment,
  isDayMode = false,
  focusedTarget,
  setFocusedTarget,
  onFinishWizard,
  currentStep: externalStep,
  onStepChange,
}) => {
  // Navigation séquentielle (1: Décor, 2: Sujet, 3: Logo, 4: Chromie, 5: Textes)
  const [internalStep, setInternalStep] = useState<number>(1);
  const currentStep = externalStep ?? internalStep;

  const setCurrentStep = (step: number) => {
    if (onStepChange) {
      onStepChange(step);
    } else {
      setInternalStep(step);
    }
  };

  // Sous-étapes pour l'étape 5 (Textes & Informations)
  // 1: Surtitre, 2: Titre Soirée, 3: Artiste & Date / Lieu
  const [textSubStep, setTextSubStep] = useState<1 | 2 | 3>(1);

  // Mode pour l'étape 1 Décor : 'upload' ou 'ai'
  const [decorSourceMode, setDecorSourceMode] = useState<'upload' | 'ai'>('ai');

  // Input refs pour fichiers
  const photoInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);
  const datePickerRef = useRef<HTMLInputElement>(null);

  // Mémorisation de la source brute du logo pour le bouton "Original"
  const rawLogoOriginalRef = useRef<string | null>(input.logoImage || null);

  // États de chargement
  const [isGeneratingBg, setIsGeneratingBg] = useState(false);
  const [isCuttingBg, setIsCuttingBg] = useState(false);
  const [isCroppingLogoBg, setIsCroppingLogoBg] = useState(false);
  const [isRemasteringSubject, setIsRemasteringSubject] = useState(false);
  const [remasterSubjectSuccess, setRemasterSubjectSuccess] = useState(false);
  const [isHarmonizingSubject, setIsHarmonizingSubject] = useState(false);
  const [harmonizeSuccess, setHarmonizeSuccess] = useState(false);
  const [showFineHarmonization, setShowFineHarmonization] = useState(false);
  const [isRemasteringLogo, setIsRemasteringLogo] = useState(false);
  const [remasterSuccess, setRemasterSuccess] = useState(false);

  // Synchronisation du focus visuel selon l'étape active
  useEffect(() => {
    if (currentStep === 1) setFocusedTarget?.('decor');
    else if (currentStep === 2) setFocusedTarget?.('subject');
    else if (currentStep === 3) setFocusedTarget?.('logo');
    else if (currentStep === 4) setFocusedTarget?.('decor');
    else if (currentStep === 5) {
      if (textSubStep === 1 || textSubStep === 2) {
        setFocusedTarget?.('headline');
      } else {
        setFocusedTarget?.('djName');
      }
    }
  }, [currentStep, textSubStep]);

  // Cadrage actuel
  const currentTransforms = (() => {
    const masterScale = input.formatTransforms?.post?.scale ?? (typeof input.djPhotoScale === 'number' ? input.djPhotoScale : 1.0);
    const masterOffset = input.formatTransforms?.post?.offsetY ?? (typeof input.djPhotoOffsetY === 'number' ? input.djPhotoOffsetY : 0);
    const defaults = getDefaultFormatTransforms(masterScale, masterOffset);
    const configured = input.formatTransforms?.[previewFormat];

    if (configured) {
      return configured;
    }
    return defaults[previewFormat as keyof typeof defaults] || {
      scale: masterScale,
      offsetY: masterOffset,
      alignX: 'center',
      isCustom: false,
    };
  })();

  // Gestion des uploads
  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: 'djPhoto' | 'backgroundImage'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setInput((prev) => ({
        ...prev,
        [field]: reader.result as string,
      }));
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 1. Immédiat : URL locale en mémoire pour l'aperçu instantané sans sérialiser de Mo dans le state
    const localBlobUrl = createLocalLogoPreview(file);
    rawLogoOriginalRef.current = localBlobUrl;
    setInput((prev) => ({
      ...prev,
      logoImage: localBlobUrl,
      logoUrl: localBlobUrl,
      logoColorMode: 'original',
    }));
    e.target.value = '';

    // 2. Traitement d'optimisation d'arrière-plan (Firebase Storage ou Canvas < 300 Ko)
    optimizeLogoForUpload(file)
      .then((optimizedUrl) => {
        if (optimizedUrl) {
          setInput((prev) => {
            if (prev.logoUrl === localBlobUrl || prev.logoImage === localBlobUrl) {
              return {
                ...prev,
                logoImage: optimizedUrl,
                logoUrl: optimizedUrl,
              };
            }
            return prev;
          });
        }
      })
      .catch((err) => {
        console.warn('[MobileMicroWizard] Erreur optimisation logo:', err);
      });
  };

  // Détourage Sujet IA
  const handleRemoveBackground = async () => {
    const source = (input as any).rawDjPhoto || input.djPhoto;
    if (!source) return;
    setIsCuttingBg(true);

    try {
      const { dataUrl } = await removeBackground(source);
      setInput((prev: any) => ({
        ...prev,
        djPhoto: dataUrl,
        rawDjPhoto: prev.rawDjPhoto || prev.djPhoto || source,
        isSubjectBackgroundRemoved: true,
      }));
      showToast('Arrière-plan retiré avec succès via le détourage neuronal.', 'success');
    } catch (err: any) {
      console.warn('[MobileMicroWizard] Échec détourage neuronal, repli local activé :', err?.message || err);
      showToast('Détourage neuronal indisponible. Traitement de secours local appliqué.', 'warning');

      try {
        const localCutout = await removeBackgroundWithCanvas(source, {
          type: 'subject',
          applyBottomFade: false,
        });

        if (localCutout && localCutout !== source && localCutout.length > 50) {
          setInput((prev) => ({
            ...prev,
            djPhoto: localCutout,
            isSubjectBackgroundRemoved: true,
          }));
          showToast('Détourage de secours local appliqué avec succès.', 'info');
        } else {
          showToast("L'image originale a été conservée sans détourage.", 'warning');
        }
      } catch (canvasErr) {
        console.warn('[MobileMicroWizard] Échec du repli local Canvas :', canvasErr);
        showToast("Impossible d'effectuer le détourage local. L'image originale est conservée.", 'warning');
      }
    } finally {
      setIsCuttingBg(false);
    }
  };


  // Super-résolution Sujet IA 300 DPI
  const handleRemasterSubjectAi = async () => {
    if (!input.djPhoto) return;
    setIsRemasteringSubject(true);
    setRemasterSubjectSuccess(false);

    let imagePayload = input.djPhoto;
    try {
      if (imagePayload.startsWith('blob:') || imagePayload.startsWith('/') || imagePayload.startsWith('http')) {
        const response = await fetch(imagePayload);
        const b = await response.blob();
        imagePayload = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(b);
        });
      }

      const remastered = await remasterSubjectAi(imagePayload);
      if (remastered && typeof remastered === 'string' && remastered.length > 100) {
        setInput((prev) => ({
          ...prev,
          djPhoto: remastered,
          rawDjPhoto: prev.rawDjPhoto || prev.djPhoto,
          subjectContrast: Math.max(prev.subjectContrast ?? 1.0, 1.06),
        }));
        setRemasterSubjectSuccess(true);
        showToast('✨ Super-résolution IA Sujet 300 DPI appliquée avec netteté studio !', 'success');
        setTimeout(() => setRemasterSubjectSuccess(false), 4000);
      }
    } catch (err) {
      console.warn('[MobileMicroWizard] Erreur Super-Résolution Sujet IA :', err);
    } finally {
      setIsRemasteringSubject(false);
    }
  };

  // Harmonisation IA du calque Sujet avec le Décor
  const handleHarmonizeSubjectAi = async () => {
    if (!input.djPhoto) return;
    setIsHarmonizingSubject(true);
    setHarmonizeSuccess(false);

    try {
      const backgroundUrlToUse =
        input.customBackground ||
        input.backgroundImage ||
        input.bgImage ||
        '/demo/signaid-backgroundImage.webp';

      const result = await harmonizeSubjectWithAi(backgroundUrlToUse, input.djPhoto, {
        currentTone: input.backgroundTone,
        format: previewFormat,
      });

      if (result && result.success) {
        const harmonizedImg = result.harmonizedSubjectImage || input.djPhoto;

        setInput((prev) => ({
          ...prev,
          djPhoto: harmonizedImg,
          rawDjPhoto: prev.rawDjPhoto || prev.djPhoto,
          isSubjectBackgroundRemoved: result.wasCutout ? true : prev.isSubjectBackgroundRemoved,
          isSubjectHarmonized: true,
          // Neutralisation des curseurs CSS : les pixels sont déjà étalonnés et ombrés
          subjectBrightness: 1.0,
          subjectContrast: 1.0,
          subjectSaturation: 1.0,
          subjectHueRotate: 0,
          subjectShadowOffsetX: 0,
          subjectShadowOffsetY: 0,
          subjectShadowBlur: 0,
          subjectShadowColor: 'transparent',
          subjectShadowOpacity: 0,
          djPhotoOpacity: typeof result.opacity === 'number' ? result.opacity : prev.djPhotoOpacity ?? 0.98,
          backgroundTone: typeof result.suggestedBackgroundTone === 'number' ? result.suggestedBackgroundTone : prev.backgroundTone,
          subjectBlendMode: result.blendMode ?? 'normal',
          subjectLightingSummary: result.analysis.summary || 'Sujet détouré et harmonisé par IA',
          subjectLightingDirection: result.analysis.lightDirection,
          subjectLightingTemperature: result.analysis.colorTemperature,
        }));
        setHarmonizeSuccess(true);
        setShowFineHarmonization(false);

        const toastMsg = result.wasCutout
          ? `✨ Sujet détouré & harmonisé dans le décor ! (${result.analysis.summary || 'Lumière et ombres calibrées'})`
          : `✨ Sujet harmonisé dans le décor : ${result.analysis.summary || 'Lumière et ombres calibrées'}`;
        showToast(toastMsg, 'success');
        setTimeout(() => setHarmonizeSuccess(false), 4000);
      }
    } catch (err) {
      console.warn('[MobileMicroWizard] Erreur Harmonisation Sujet IA :', err);
      setInput((prev) => ({
        ...prev,
        rawDjPhoto: prev.rawDjPhoto || prev.djPhoto,
        isSubjectHarmonized: true,
        subjectBrightness: 1.0,
        subjectContrast: 1.0,
        subjectSaturation: 1.0,
        subjectHueRotate: 0,
        subjectShadowOffsetX: 0,
        subjectShadowOffsetY: 0,
        subjectShadowBlur: 0,
        subjectShadowColor: 'transparent',
        subjectShadowOpacity: 0,
      }));
      setShowFineHarmonization(false);
    } finally {
      setIsHarmonizingSubject(false);
    }
  };

  // Détourage Logo BFS
  const handleRemoveLogoBackground = async () => {
    const sourceImage = rawLogoOriginalRef.current || input.logoImage;
    if (!sourceImage) return;
    setIsCroppingLogoBg(true);
    try {
      const processed = await processLogoDeterministic(sourceImage, {
        removeBackground: true,
      });
      setInput((prev) => ({
        ...prev,
        logoImage: processed,
        isLogoBackgroundRemoved: true,
      }));
    } catch (err: any) {
      console.error('Erreur détourage logo :', err);
      alert('Erreur lors du détourage du logo : ' + (err?.message || 'Erreur inconnue'));
    } finally {
      setIsCroppingLogoBg(false);
    }
  };

  // Bascule complète Original ↔ Blanc ↔ Noir ↔ Noirs Découpés
  const handleLogoColorModeSelect = async (mode: LogoColorMode) => {
    const sourceImage = rawLogoOriginalRef.current || input.logoImage;
    if (!sourceImage) return;

    setInput((prev) => ({ ...prev, logoColorMode: mode }));

    try {
      let processed = sourceImage;

      if (mode === 'original' || mode === 'auto' || mode === 'neon') {
        processed = rawLogoOriginalRef.current || sourceImage;
      } else if (mode === 'knockout_black') {
        processed = await processLogoDeterministic(sourceImage, {
          removeBackground: true,
          knockoutBlack: true,
        });
      } else if (mode === 'white') {
        processed = await processLogoDeterministic(sourceImage, {
          removeBackground: true,
          makePureWhite: true,
        });
      } else if (mode === 'black') {
        processed = await processLogoDeterministic(sourceImage, {
          removeBackground: true,
          makePureBlack: true,
        });
      }

      setInput((prev) => ({
        ...prev,
        logoImage: processed,
        logoColorMode: mode,
      }));
    } catch (err) {
      console.warn('Erreur bascule teinte logo :', err);
    }
  };

  // Super-Résolution IA Logo directe
  const handleRemasterLogoAi = async () => {
    if (!input.logoImage) {
      alert("Veuillez d'abord charger un logo.");
      return;
    }
    setIsRemasteringLogo(true);
    setRemasterSuccess(false);
    try {
      let imagePayload = input.logoImage;
      if (imagePayload.startsWith('blob:') || imagePayload.startsWith('/') || imagePayload.startsWith('http')) {
        const response = await fetch(imagePayload);
        const b = await response.blob();
        imagePayload = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(b);
        });
      }

      const minDelay = new Promise((resolve) => setTimeout(resolve, 800));
      let newImage: string | null = null;
      try {
        const resPromise = fetch('/api/remaster-logo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: imagePayload,
            image: imagePayload,
            mode: 'vectorize',
          }),
          signal: AbortSignal.timeout(15000),
        });
        const [res] = await Promise.all([resPromise, minDelay]);
        if (res.ok) {
          const data = await res.json();
          newImage = data.remasteredImage || data.processedImageBase64 || data.imageUrl || data.image;
        } else {
          console.warn(`[MobileMicroWizard] Échec /api/remaster-logo (${res.status}), bascule repli Canvas 2D`);
        }
      } catch (cloudErr) {
        console.warn('[MobileMicroWizard] Erreur réseau/502 endpoint IA, bascule repli Canvas 2D :', cloudErr);
      }

      // Repli mécanique Canvas 2D
      if (!newImage || typeof newImage !== 'string') {
        newImage = await processLogoDeterministic(imagePayload, { removeBackground: true });
      }

      if (newImage && typeof newImage === 'string') {
        rawLogoOriginalRef.current = newImage;
        setInput((prev) => ({
          ...prev,
          logoImage: newImage,
          logoColorMode: 'original',
        }));
        setRemasterSuccess(true);
        setTimeout(() => setRemasterSuccess(false), 4000);
      }
    } catch (err: any) {
      console.warn('Erreur Super-Résolution logo :', err);
    } finally {
      setIsRemasteringLogo(false);
    }
  };

  // Génération Décor IA
  const handleGenerateAiBackground = async () => {
    const promptToUse = input.ambiancePrompt?.trim() || 'Nébuleuse cosmique violette et cyan, vagues de lumière fluide, particules flottantes, fond abstrait 3D épuré';
    const activeAspectRatio = getAspectRatioForFormat(previewFormat);
    setIsGeneratingBg(true);
    try {
      const generatedImageUrl = await generateBackground(promptToUse, {
        aspectRatio: activeAspectRatio,
        genre: input.headerTagline || 'Futur',
        allowFallback: true,
        hasSubject: Boolean(input.djPhoto || input.rawDjPhoto),
      });

      if (generatedImageUrl) {
        setInput((prev) => ({
          ...prev,
          ambiancePrompt: promptToUse,
          backgroundImage: generatedImageUrl,
          ambianceEngine: 'Gemini AI Image',
        }));
      }
    } catch (err: any) {
      console.warn('[MobileMicroWizard] Exception interceptée, activation du repli local sans blocage :', err?.message || err);
      try {
        const fallbackImageUrl = await generateLocalFallbackBackground({
          prompt: promptToUse,
          genre: input.headerTagline || 'Futur',
          aspectRatio: activeAspectRatio,
        });
        if (fallbackImageUrl) {
          setInput((prev) => ({
            ...prev,
            ambiancePrompt: promptToUse,
            backgroundImage: fallbackImageUrl,
            ambianceEngine: 'Moteur Local HD',
          }));
          showToast('Mode de secours activé : texture de décor générée localement.', 'info');
        }
      } catch (localErr) {
        console.error('[MobileMicroWizard] Échec ultime repli :', localErr);
        setInput((prev) => ({
          ...prev,
          backgroundImage: '/demo/bg-demo.jpg',
          ambianceEngine: 'Secours Défaut',
        }));
        showToast('Mode de secours activé : texture sombre appliquée.', 'info');
      }
    } finally {
      setIsGeneratingBg(false);
    }
  };

  // Sélecteur date native
  const handleDateSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    if (!rawVal) return;
    try {
      const [year, month, day] = rawVal.split('-').map(Number);
      const d = new Date(year, month - 1, day);
      const formatted = d
        .toLocaleDateString('fr-FR', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
        .toUpperCase();
      setInput((p) => ({ ...p, date: formatted }));
    } catch {
      setInput((p) => ({ ...p, date: rawVal }));
    }
  };

  // Statuts de complétion pour les badges
  const isStepComplete = (step: number) => {
    switch (step) {
      case 1:
        return Boolean(input.backgroundImage);
      case 2:
        return Boolean(input.djPhoto);
      case 3:
        return Boolean(input.logoImage);
      case 4:
        return Boolean(input.dynamicTheme?.primaryAccent);
      case 5:
        return Boolean(input.eventName?.trim() && input.djName?.trim());
      default:
        return false;
    }
  };

  const STEPS = [
    { id: 1, label: 'Décor', icon: Layers },
    { id: 2, label: 'Sujet', icon: User },
    { id: 3, label: 'Logo', icon: Shield },
    { id: 4, label: 'Chromie', icon: Palette },
    { id: 5, label: 'Textes', icon: Type },
  ];

  // Styles dynamiques
  const cardBg = isDayMode
    ? 'bg-white border-zinc-300 text-zinc-950 shadow-md'
    : 'bg-zinc-950 border-zinc-800 text-zinc-100 shadow-xl';
  const innerBg = isDayMode
    ? 'bg-zinc-100 border-zinc-300 text-zinc-900'
    : 'bg-zinc-900/90 border-zinc-800 text-zinc-200';
  const inputBg = isDayMode
    ? 'bg-white border-zinc-300 text-zinc-900'
    : 'bg-zinc-900 border-zinc-800 text-white';
  const textMuted = isDayMode ? 'text-zinc-600' : 'text-zinc-400';
  const textSubtle = isDayMode ? 'text-zinc-500' : 'text-zinc-500';

  return (
    <div className="w-full space-y-2.5 pb-2">
      {/* 1. BARRE DE PROGRESSION DISCRÈTE (2px) */}
      <div className="w-full bg-zinc-800/50 h-1 rounded-full overflow-hidden">
        <div
          className="h-full bg-lime-400 transition-all duration-300 rounded-full"
          style={{ width: `${(currentStep / 5) * 100}%` }}
        />
      </div>

      {/* 2. FIL D'ARIANE / MICRO-PILULES RÉCAPITULATIVES COMPACTES */}
      <div className="flex items-center justify-between gap-1 overflow-x-auto no-scrollbar py-0.5 px-0.5">
        {STEPS.map((s) => {
          const isActive = currentStep === s.id;
          const complete = isStepComplete(s.id);
          const Icon = s.icon;

          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setCurrentStep(s.id)}
              className={`shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-mono transition border cursor-pointer ${isActive
                  ? 'bg-lime-400 text-black border-lime-400 font-black shadow-xs'
                  : complete
                    ? isDayMode
                      ? 'bg-lime-50 border-lime-300 text-lime-900 font-bold'
                      : 'bg-lime-950/40 border-lime-500/40 text-lime-400 font-bold'
                    : isDayMode
                      ? 'bg-zinc-100 border-zinc-200 text-zinc-500 hover:text-zinc-800'
                      : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-white'
                }`}
            >
              <Icon className="w-3 h-3" />
              <span>{s.id}. {s.label}</span>
              {complete && !isActive && <Check className="w-2.5 h-2.5 stroke-[3]" />}
            </button>
          );
        })}
      </div>

      {/* 3. MICRO-CARTE D'ACTION UNIQUE SÉQUENTIELLE */}
      <div className={`${cardBg} rounded-2xl border p-3.5 space-y-3 transition-all duration-300`}>
        {/* ========================================================================= */}
        {/* ÉTAPE 1 : LE DÉCOR D'AMBIANCE (FOND)                                      */}
        {/* ========================================================================= */}
        {currentStep === 1 && (
          <div className="space-y-3 animate-fadeIn">
            {/* Titre & Description de l'étape */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-lime-400/10 text-lime-400 border border-lime-400/20">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className={`text-xs font-black font-mono uppercase tracking-wider ${isDayMode ? 'text-zinc-900' : 'text-white'}`}>
                    1. Décor d'Ambiance (Fond)
                  </h3>
                  <p className={`text-[10px] font-mono ${textSubtle}`}>
                    {input.backgroundImage ? 'Arrière-plan actif sous le visuel' : 'Choisissez ou générez un arrière-plan'}
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-lime-400/10 text-lime-400 border border-lime-400/20">
                1 / 5
              </span>
            </div>

            {/* 1.1 Choix du fond : 2 options claires */}
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl border border-zinc-800 bg-zinc-900/60 text-xs font-mono">
              <button
                type="button"
                onClick={() => setDecorSourceMode('upload')}
                className={`py-1.5 px-2 rounded-lg font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${decorSourceMode === 'upload'
                    ? 'bg-lime-400 text-black shadow-xs font-black'
                    : isDayMode ? 'text-zinc-600 hover:text-zinc-900' : 'text-zinc-400 hover:text-white'
                  }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Uploader Image</span>
              </button>
              <button
                type="button"
                onClick={() => setDecorSourceMode('ai')}
                className={`py-1.5 px-2 rounded-lg font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${decorSourceMode === 'ai'
                    ? 'bg-lime-400 text-black shadow-xs font-black'
                    : isDayMode ? 'text-zinc-600 hover:text-zinc-900' : 'text-zinc-400 hover:text-white'
                  }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Générer via IA</span>
              </button>
            </div>

            {/* Panneau Option A : Upload image */}
            {decorSourceMode === 'upload' && (
              <div className="space-y-2">
                {input.backgroundImage ? (
                  <div className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${innerBg}`}>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2 h-2 rounded-full bg-lime-400 animate-pulse shrink-0" />
                      <span className="text-xs font-mono font-bold truncate">Image de fond active</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => bgInputRef.current?.click()}
                        className="px-2.5 py-1 text-[10px] font-mono font-bold rounded-lg border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
                      >
                        Changer
                      </button>
                      <button
                        type="button"
                        onClick={() => setInput((p) => ({ ...p, backgroundImage: undefined }))}
                        className="p-1 rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-400 hover:text-white"
                        title="Retirer le fond"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => bgInputRef.current?.click()}
                    className={`p-4 rounded-xl border border-dashed ${isDayMode ? 'border-zinc-300 bg-zinc-50' : 'border-zinc-700 bg-zinc-900/50'
                      } flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:border-lime-400 transition text-center`}
                  >
                    <Upload className="w-5 h-5 text-lime-400" />
                    <span className="text-xs font-mono font-bold text-zinc-300">
                      Tapez ici pour choisir une photo ou texture
                    </span>
                    <span className={`text-[9px] font-mono ${textSubtle}`}>PNG ou JPG (haute résolution)</span>
                  </div>
                )}
                <input
                  ref={bgInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onClick={(e) => { (e.target as HTMLInputElement).value = ''; }}
                  onChange={(e) => handleFileUpload(e, 'backgroundImage')}
                />
              </div>
            )}

            {/* Panneau Option B : Génération IA */}
            {decorSourceMode === 'ai' && (
              <div className="space-y-2.5">
                {/* Carrousel horizontal de suggestions en 1 tap */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className={textMuted}>Suggestions d'ambiance (en 1 tap) :</span>
                    <span className={`text-[9px] ${textSubtle}`}>← Glisser →</span>
                  </div>
                  <div className="flex overflow-x-auto snap-x no-scrollbar gap-1.5 py-1 -mx-1 px-1">
                    {AMBIANCE_PRESETS.map((preset) => {
                      const isSelected = input.ambiancePrompt === preset.prompt;
                      return (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => {
                            setInput((prev) => ({
                              ...prev,
                              ambiancePrompt: preset.prompt,
                              headerTagline: prev.headerTagline || preset.genre.toUpperCase(),
                            }));
                            setFocusedTarget?.('decor');
                          }}
                          className={`snap-start shrink-0 px-2.5 py-1.5 rounded-xl border text-[10px] font-mono transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${isSelected
                              ? 'bg-lime-400/20 text-lime-400 border-lime-400/60 ring-1 ring-lime-400 shadow-xs font-bold'
                              : isDayMode
                                ? 'bg-zinc-100 text-zinc-700 border-zinc-200'
                                : 'bg-zinc-900/80 text-zinc-300 border-zinc-800 hover:border-zinc-700'
                            }`}
                        >
                          <span>{preset.label}</span>
                          <span className="text-[8px] opacity-60">({preset.genre})</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Champ Prompt + Bouton Générer */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={input.ambiancePrompt || ''}
                    onFocus={() => setFocusedTarget?.('decor')}
                    onChange={(e) => setInput((prev) => ({ ...prev, ambiancePrompt: e.target.value }))}
                    placeholder="Ex: Nébuleuse cosmique spectaculaire..."
                    className={`flex-1 ${inputBg} border rounded-xl px-3 py-2 text-xs placeholder-zinc-500 focus:outline-none focus:border-lime-400 focus:ring-1 focus:ring-lime-400 font-mono shadow-inner`}
                  />
                  <button
                    type="button"
                    disabled={isGeneratingBg}
                    onClick={handleGenerateAiBackground}
                    className="px-3.5 py-2 bg-lime-400 hover:bg-lime-300 text-black font-black font-mono text-xs rounded-xl flex items-center gap-1.5 transition disabled:opacity-50 shrink-0 shadow-md cursor-pointer"
                  >
                    {isGeneratingBg ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-black" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5 text-black" />
                    )}
                    <span>{isGeneratingBg ? 'Création...' : 'Générer IA'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Curseur de tonalité de fond (Contraste dynamique) : Blanc Pur ➔ Noir Pur */}
            <div className={`p-2.5 rounded-xl border space-y-1.5 ${innerBg} animate-fadeIn`}>
              <div className="flex justify-between items-center text-[10px] font-mono">
                <span className={`${textMuted} flex items-center gap-1.5 font-bold`}>
                  <Sun className="w-3 h-3 text-lime-400" />
                  <span>Tonalité du fond (Blanc ↔ Noir)</span>
                  <button
                    type="button"
                    onClick={() => setInput((p) => ({ ...p, isBackgroundToneEnabled: p.isBackgroundToneEnabled === false ? true : false }))}
                    className={`px-1.5 py-0.5 rounded text-[8px] font-mono transition-all flex items-center gap-1 cursor-pointer border ${
                      input.isBackgroundToneEnabled !== false
                        ? 'bg-lime-400/20 text-lime-400 border-lime-400/40'
                        : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                    }`}
                  >
                    {input.isBackgroundToneEnabled !== false ? 'Active' : '✕ Désactivée'}
                  </button>
                </span>
                <span className={input.isBackgroundToneEnabled !== false ? "text-lime-400 font-bold" : "text-zinc-500 line-through font-mono"}>
                  {input.isBackgroundToneEnabled === false
                    ? 'Teinte brute'
                    : (input.backgroundTone ?? 0.5) === 0
                      ? '⚪ Blanc Pur (100%)'
                      : (input.backgroundTone ?? 0.5) === 1
                        ? '⚫ Noir Pur (100%)'
                        : Math.abs((input.backgroundTone ?? 0.5) - 0.5) < 0.02
                          ? '⦿ 50 % (Neutre)'
                          : (input.backgroundTone ?? 0.5) < 0.48
                            ? `${Math.round((input.backgroundTone ?? 0.5) * 100)} % (Clair)`
                            : `${Math.round((input.backgroundTone ?? 0.5) * 100)} % (Sombre)`}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                disabled={input.isBackgroundToneEnabled === false}
                value={typeof input.backgroundTone === 'number' ? input.backgroundTone : 0.5}
                onFocus={() => setFocusedTarget?.('decor')}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  const isLight = val < 0.48;
                  const isCenter = Math.abs(val - 0.5) < 0.02 || val === 0.5;
                  setInput((p) => {
                    let nextMode = p.logoColorMode || 'auto';
                    if (p.logoColorMode === 'white' && isLight) nextMode = 'black';
                    else if (p.logoColorMode === 'black' && !isLight) nextMode = 'white';
                    return {
                      ...p,
                      backgroundTone: val,
                      logoColorMode: nextMode,
                      ...(isCenter ? {
                        subjectBrightness: 1.0,
                        subjectContrast: 1.0,
                        subjectSaturation: 1.0,
                        subjectHueRotate: 0,
                      } : {}),
                    };
                  });
                }}
                className={`w-full h-1.5 rounded-lg cursor-pointer accent-lime-400 bg-gradient-to-r from-white via-zinc-500 to-black border border-zinc-700 ${
                  input.isBackgroundToneEnabled === false ? 'opacity-35 cursor-not-allowed' : ''
                }`}
              />
              {input.isBackgroundToneEnabled === false ? (
                <div className="flex justify-between items-center text-[8px] font-mono text-zinc-400 pt-0.5">
                  <span className="text-zinc-500 italic">Fond naturel sans superposition</span>
                  <button
                    type="button"
                    onClick={() => setInput((p) => ({ ...p, isBackgroundToneEnabled: true }))}
                    className="text-lime-400 hover:text-lime-300 underline font-bold cursor-pointer"
                  >
                    Réactiver la tonalité
                  </button>
                </div>
              ) : (
                <div className="flex justify-between text-[8px] font-mono text-zinc-500">
                  <button
                    type="button"
                    onClick={() => setInput((p) => ({ ...p, backgroundTone: 0, logoColorMode: p.logoColorMode === 'white' ? 'black' : p.logoColorMode || 'auto' }))}
                    className="hover:text-lime-400 transition cursor-pointer"
                  >
                    ⚪ Blanc (0%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setInput((p) => ({
                      ...p,
                      backgroundTone: 0.5,
                      subjectBrightness: 1.0,
                      subjectContrast: 1.0,
                      subjectSaturation: 1.0,
                      subjectHueRotate: 0,
                    }))}
                    className="text-lime-400 font-bold hover:underline transition cursor-pointer"
                  >
                    ⦿ Neutre (50%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setInput((p) => ({ ...p, backgroundTone: 1, logoColorMode: p.logoColorMode === 'black' ? 'white' : p.logoColorMode || 'auto' }))}
                    className="hover:text-lime-400 transition cursor-pointer"
                  >
                    ⚫ Noir (100%)
                  </button>
                </div>
              )}
            </div>

            {/* 1.2 Réglages immédiats (dès qu'un fond existe) : Opacité et Luminosité */}
            {input.backgroundImage && (
              <div className={`p-2.5 rounded-xl border space-y-2.5 ${innerBg} animate-fadeIn`}>
                {/* Curseur Opacité */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-mono">
                    <span className={`${textMuted} flex items-center gap-1 font-bold`}>
                      <Sliders className="w-3 h-3 text-lime-400" />
                      <span>Opacité du Décor</span>
                    </span>
                    <span className="text-lime-400 font-bold">
                      {Math.round((input.backgroundOpacity ?? 0.5) * 100)} %
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.05"
                    max="1"
                    step="0.05"
                    value={input.backgroundOpacity ?? 0.5}
                    onFocus={() => setFocusedTarget?.('decor')}
                    onChange={(e) => setInput((p) => ({ ...p, backgroundOpacity: parseFloat(e.target.value) || 0.5 }))}
                    className="w-full accent-lime-400 h-1.5 bg-zinc-300 dark:bg-zinc-800 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Curseur Luminosité */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-mono">
                    <span className={`${textMuted} flex items-center gap-1 font-bold`}>
                      <Sun className="w-3 h-3 text-lime-400" />
                      <span>Luminosité du Décor</span>
                    </span>
                    <span className="text-lime-400 font-bold">
                      {Math.round((input.backgroundBrightness ?? 1.0) * 100)} %
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.3"
                    max="1.8"
                    step="0.05"
                    value={input.backgroundBrightness ?? 1.0}
                    onFocus={() => setFocusedTarget?.('decor')}
                    onChange={(e) => setInput((p) => ({ ...p, backgroundBrightness: parseFloat(e.target.value) || 1.0 }))}
                    className="w-full accent-lime-400 h-1.5 bg-zinc-300 dark:bg-zinc-800 rounded-lg cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* Bouton de validation Étape 1 */}
            <div className="pt-1 flex items-center justify-between gap-2">
              {!input.backgroundImage && (
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className={`text-[10px] font-mono ${textMuted} hover:text-lime-400 underline cursor-pointer`}
                >
                  Continuer avec un fond uni neutre
                </button>
              )}
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="w-full sm:w-auto ml-auto px-4 py-2.5 rounded-xl bg-lime-400 hover:bg-lime-300 text-black font-black text-xs font-mono flex items-center justify-center gap-2 transition shadow-md cursor-pointer"
              >
                <span>Continuer vers le Sujet</span>
                <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ÉTAPE 2 : LE SUJET (DJ / ARTISTE)                                         */}
        {/* ========================================================================= */}
        {currentStep === 2 && (
          <div className="space-y-3 animate-fadeIn">
            {/* Titre & Description de l'étape */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-lime-400/10 text-lime-400 border border-lime-400/20">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h3 className={`text-xs font-black font-mono uppercase tracking-wider ${isDayMode ? 'text-zinc-900' : 'text-white'}`}>
                    2. Le Sujet (DJ / Artiste)
                  </h3>
                  <p className={`text-[10px] font-mono ${textSubtle}`}>
                    {input.djPhoto ? 'Photo cadrée sur le visuel' : 'Intégration du DJ ou artiste principal'}
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-lime-400/10 text-lime-400 border border-lime-400/20">
                2 / 5
              </span>
            </div>

            {/* 2.1 Question d'amorce si pas encore de photo */}
            {!input.djPhoto ? (
              <div className="space-y-3 py-1">
                <div className={`p-3 rounded-xl border border-dashed ${innerBg} text-center space-y-1`}>
                  <p className={`text-xs font-mono font-bold ${isDayMode ? 'text-zinc-800' : 'text-zinc-200'}`}>
                    « Souhaitez-vous intégrer un DJ ou artiste au visuel ? »
                  </p>
                  <p className={`text-[10px] font-mono ${textSubtle}`}>
                    Une photo permet d'humaniser l'affiche et de créer un contraste fort.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    className="w-full py-2.5 px-3 rounded-xl bg-lime-400 hover:bg-lime-300 text-black font-black text-xs font-mono flex items-center justify-center gap-2 transition shadow-md cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Oui, uploader une photo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCurrentStep(3)}
                    className={`w-full py-2 px-3 rounded-xl border border-zinc-700 ${isDayMode ? 'bg-zinc-100 text-zinc-700' : 'bg-zinc-900 text-zinc-400'
                      } hover:text-white text-xs font-mono transition flex items-center justify-center gap-1.5 cursor-pointer`}
                  >
                    <span>Passer cette étape (Visuel abstrait)</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              /* 2.2 Réglages spécifiques si photo uploadée */
              <div className="space-y-3 animate-fadeIn">
                {/* Statut photo compact */}
                <div className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${innerBg}`}>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2 h-2 rounded-full bg-lime-400 animate-pulse shrink-0" />
                    <span className="text-xs font-mono font-bold truncate">Photo Sujet DJ active</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      className="px-2.5 py-1 text-[10px] font-mono font-bold rounded-lg border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
                    >
                      Changer
                    </button>
                    <button
                      type="button"
                      onClick={() => setInput((p) => ({ ...p, djPhoto: undefined }))}
                      className="p-1 rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-400 hover:text-white"
                      title="Retirer la photo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Actions : Détourage IA + Super-Résolution IA + Fondu progressif bas */}
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={isCuttingBg || isRemasteringSubject}
                      onClick={handleRemoveBackground}
                      className="w-full py-2 px-2 rounded-xl bg-lime-400/10 border border-lime-400/40 text-lime-400 hover:bg-lime-400/20 text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
                    >
                      {isCuttingBg ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-lime-400" />
                      ) : (
                        <Scissors className="w-3.5 h-3.5 text-lime-400" />
                      )}
                      <span>{isCuttingBg ? 'Détourage...' : 'Détourer fond'}</span>
                    </button>
                    <button
                      type="button"
                      disabled={isCuttingBg || isRemasteringSubject}
                      onClick={handleRemasterSubjectAi}
                      className={`w-full py-2 px-2 rounded-xl text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition disabled:opacity-50 cursor-pointer border ${
                        remasterSubjectSuccess
                          ? 'bg-lime-400 text-black font-black border-lime-400'
                          : 'bg-lime-400/10 text-lime-400 border-lime-400/40 hover:bg-lime-400/20'
                      }`}
                    >
                      {isRemasteringSubject ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-lime-400" />
                      ) : remasterSubjectSuccess ? (
                        <Check className="w-3.5 h-3.5 text-black stroke-[3]" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5 text-lime-400" />
                      )}
                      <span>
                        {isRemasteringSubject
                          ? '300 DPI...'
                          : remasterSubjectSuccess
                            ? '300 DPI Actif'
                            : 'Super-Résolution'}
                      </span>
                    </button>
                  </div>

                  {/* Harmoniser le sujet via IA Vision & calibrage lumière */}
                  <div className="space-y-1.5">
                    <button
                      data-testid="subject-harmonize-mobile-btn"
                      type="button"
                      onClick={handleHarmonizeSubjectAi}
                      disabled={!input.djPhoto || isCuttingBg || isRemasteringSubject || isHarmonizingSubject}
                      className={`w-full py-2 px-2.5 rounded-xl text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition cursor-pointer border ${
                        isHarmonizingSubject
                          ? 'bg-lime-400/20 text-lime-400 border-lime-400 animate-pulse'
                          : input.isSubjectHarmonized
                            ? 'bg-lime-400 text-black font-black border-lime-400 shadow-md'
                            : 'bg-lime-400/10 text-lime-400 border-lime-400/40 hover:bg-lime-400/20'
                      }`}
                      title="Harmoniser le sujet détouré avec l'ambiance lumineuse du décor via IA Vision"
                    >
                      {isHarmonizingSubject ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-lime-400" />
                      ) : harmonizeSuccess ? (
                        <Check className="w-3.5 h-3.5 text-black stroke-[3]" />
                      ) : (
                        <Wand2 className={`w-3.5 h-3.5 ${input.isSubjectHarmonized ? 'text-black' : 'text-lime-400'}`} />
                      )}
                      <span>
                        {isHarmonizingSubject
                          ? 'Harmonisation IA...'
                          : input.isSubjectHarmonized
                            ? 'Sujet Harmonisé par IA'
                            : 'Harmoniser le sujet'}
                      </span>
                      {input.isSubjectHarmonized && (
                        <span className="text-[9px] bg-black/25 text-black px-1.5 py-0.5 rounded-full font-black ml-1">
                          ACTIF
                        </span>
                      )}
                    </button>

                    {input.isSubjectHarmonized && (
                      <div className={`p-2 rounded-xl border border-lime-400/30 space-y-1.5 ${innerBg}`}>
                        <div className="flex items-center justify-between text-[10px] font-mono">
                          <span className="text-lime-300 font-bold truncate pr-1" title={input.subjectLightingSummary || 'Ambiance IA active'}>
                            {input.subjectLightingSummary || 'Ambiance & ombres calibrées'}
                          </span>
                          <button
                            type="button"
                            onClick={() => setShowFineHarmonization((p) => !p)}
                            className="text-[9px] font-mono text-zinc-400 hover:text-lime-400 underline shrink-0 cursor-pointer"
                          >
                            {showFineHarmonization ? 'Masquer' : 'Ajuster'}
                          </button>
                        </div>

                        {showFineHarmonization && (
                          <div className="space-y-1.5 pt-1.5 border-t border-zinc-800">
                            <div className="space-y-0.5">
                              <div className="flex justify-between text-[9px] font-mono text-zinc-400">
                                <span>Luminosité Sujet</span>
                                <span className="text-lime-400 font-bold">{Math.round((input.subjectBrightness ?? 1.0) * 100)} %</span>
                              </div>
                              <input
                                type="range"
                                min="0.5"
                                max="1.5"
                                step="0.02"
                                value={input.subjectBrightness ?? 1.0}
                                onChange={(e) => setInput((p) => ({ ...p, subjectBrightness: parseFloat(e.target.value) }))}
                                className="w-full accent-lime-400 h-1.5 bg-zinc-300 dark:bg-zinc-800 rounded-lg cursor-pointer"
                              />
                            </div>

                            <div className="space-y-0.5">
                              <div className="flex justify-between text-[9px] font-mono text-zinc-400">
                                <span>Contraste Sujet</span>
                                <span className="text-lime-400 font-bold">{Math.round((input.subjectContrast ?? 1.0) * 100)} %</span>
                              </div>
                              <input
                                type="range"
                                min="0.5"
                                max="1.5"
                                step="0.02"
                                value={input.subjectContrast ?? 1.0}
                                onChange={(e) => setInput((p) => ({ ...p, subjectContrast: parseFloat(e.target.value) }))}
                                className="w-full accent-lime-400 h-1.5 bg-zinc-300 dark:bg-zinc-800 rounded-lg cursor-pointer"
                              />
                            </div>

                            <div className="space-y-0.5">
                              <div className="flex justify-between text-[9px] font-mono text-zinc-400">
                                <span>Saturation Sujet</span>
                                <span className="text-lime-400 font-bold">{Math.round((input.subjectSaturation ?? 1.0) * 100)} %</span>
                              </div>
                              <input
                                type="range"
                                min="0.0"
                                max="2.0"
                                step="0.05"
                                value={input.subjectSaturation ?? 1.0}
                                onChange={(e) => setInput((p) => ({ ...p, subjectSaturation: parseFloat(e.target.value) }))}
                                className="w-full accent-lime-400 h-1.5 bg-zinc-300 dark:bg-zinc-800 rounded-lg cursor-pointer"
                              />
                            </div>

                            <div className="space-y-0.5">
                              <div className="flex justify-between text-[9px] font-mono text-zinc-400">
                                <span>Ombre Décalage X / Hauteur Y</span>
                                <span className="text-lime-400">{input.subjectShadowOffsetX ?? 0}px / {input.subjectShadowOffsetY ?? 20}px</span>
                              </div>
                              <div className="grid grid-cols-2 gap-1.5">
                                <input
                                  type="range"
                                  min="-30"
                                  max="30"
                                  step="1"
                                  value={input.subjectShadowOffsetX ?? 0}
                                  onChange={(e) => setInput((p) => ({ ...p, subjectShadowOffsetX: parseInt(e.target.value, 10) }))}
                                  className="w-full accent-lime-400 h-1.5 bg-zinc-300 dark:bg-zinc-800 rounded-lg cursor-pointer"
                                />
                                <input
                                  type="range"
                                  min="0"
                                  max="50"
                                  step="1"
                                  value={input.subjectShadowOffsetY ?? 20}
                                  onChange={(e) => setInput((p) => ({ ...p, subjectShadowOffsetY: parseInt(e.target.value, 10) }))}
                                  className="w-full accent-lime-400 h-1.5 bg-zinc-300 dark:bg-zinc-800 rounded-lg cursor-pointer"
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className={`p-2.5 rounded-xl border space-y-1 ${innerBg}`}>
                    <div className="flex justify-between text-[10px] font-mono">
                      <span className={`${textMuted} flex items-center gap-1 font-bold`}>
                        <Sliders className="w-3 h-3 text-lime-400" />
                        <span>Fondu progressif bas</span>
                      </span>
                      <span className="text-lime-400 font-bold">{input.subjectFadeIntensity ?? 35} %</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={input.subjectFadeIntensity ?? 35}
                      onFocus={() => setFocusedTarget?.('subject')}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        setInput((prev) => ({
                          ...prev,
                          subjectFadeIntensity: isNaN(val) ? 35 : val,
                          isSubjectGradientFade: val > 0,
                        }));
                      }}
                      className="w-full accent-lime-400 h-1.5 bg-zinc-300 dark:bg-zinc-800 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>

                {/* Réglages fins : Échelle (Zoom) et Position Y */}
                {previewFormat !== 'tshirt' && (
                  <div className={`p-2.5 rounded-xl border space-y-2.5 ${innerBg}`}>
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="font-bold text-zinc-300">Cadrage de l'Artiste ({previewFormat === 'a3' ? 'Flyers' : previewFormat.toUpperCase()}) :</span>
                      {previewFormat !== 'post' && (
                        currentTransforms.isCustom ? (
                          <button
                            type="button"
                            onClick={onResetFormatToMaster}
                            className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-lime-500/10 text-lime-400 border border-lime-500/30 font-bold flex items-center gap-1 hover:text-lime-300 transition cursor-pointer"
                            title="Réinitialiser le cadrage selon les ratios automatiques du format Maître"
                          >
                            <RotateCcw className="w-2.5 h-2.5" />
                            <span>Reset Auto</span>
                          </button>
                        ) : (
                          <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-lime-400/10 text-lime-400 border border-lime-400/30 font-bold flex items-center gap-1">
                            <Sparkles className="w-2.5 h-2.5" />
                            <span>Auto Actif</span>
                          </span>
                        )
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-mono">
                        <span className={textMuted}>Échelle (Zoom)</span>
                        <span className="text-lime-400 font-bold">{Math.round(currentTransforms.scale * 100)} %</span>
                      </div>
                      <input
                        type="range"
                        min="0.5"
                        max="4.0"
                        step="0.01"
                        value={currentTransforms.scale}
                        onFocus={() => setFocusedTarget?.('subject')}
                        onChange={(e) => onUpdateTransform(parseFloat(e.target.value), currentTransforms.offsetY)}
                        className="w-full accent-lime-400 h-1.5 bg-zinc-300 dark:bg-zinc-800 rounded-lg cursor-pointer"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-mono">
                        <span className={textMuted}>Position verticale (Axe Y)</span>
                        <span className="text-lime-400 font-bold">{currentTransforms.offsetY} %</span>
                      </div>
                      <input
                        type="range"
                        min="-50"
                        max={180}
                        step="1"
                        value={currentTransforms.offsetY}
                        onFocus={() => setFocusedTarget?.('subject')}
                        onChange={(e) => onUpdateTransform(currentTransforms.scale, parseInt(e.target.value, 10))}
                        className="w-full accent-lime-400 h-1.5 bg-zinc-300 dark:bg-zinc-800 rounded-lg cursor-pointer"
                      />
                    </div>

                    {currentTransforms.alignX && (
                      <div className="flex justify-between text-[9px] font-mono text-zinc-500">
                        <span>Alignement X :</span>
                        <span className="text-zinc-400 uppercase font-bold">{currentTransforms.alignX === 'right' ? 'Droite (Tiers droit)' : 'Centre'}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onClick={(e) => { (e.target as HTMLInputElement).value = ''; }}
              onChange={(e) => handleFileUpload(e, 'djPhoto')}
            />

            {/* Boutons de navigation Étape 2 */}
            <div className="pt-1 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="px-3 py-2 rounded-xl border border-zinc-700 bg-zinc-900/60 text-zinc-300 text-xs font-mono font-bold flex items-center gap-1.5 hover:text-white"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Précédent</span>
              </button>

              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="ml-auto px-4 py-2.5 rounded-xl bg-lime-400 hover:bg-lime-300 text-black font-black text-xs font-mono flex items-center justify-center gap-2 transition shadow-md cursor-pointer"
              >
                <span>Valider le Sujet</span>
                <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ÉTAPE 3 : LE LOGO & IDENTITÉ                                              */}
        {/* ========================================================================= */}
        {currentStep === 3 && (
          <div className="space-y-3 animate-fadeIn">
            {/* Titre & Description de l'étape */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-lime-400/10 text-lime-400 border border-lime-400/20">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <h3 className={`text-xs font-black font-mono uppercase tracking-wider ${isDayMode ? 'text-zinc-900' : 'text-white'}`}>
                    3. Le Logo &amp; Identité
                  </h3>
                  <p className={`text-[10px] font-mono ${textSubtle}`}>
                    {input.logoImage ? 'Logo actif sur le visuel & textile' : 'Superposition de marque ou événement'}
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-lime-400/10 text-lime-400 border border-lime-400/20">
                3 / 5
              </span>
            </div>

            {/* 3.1 Question d'amorce si pas encore de logo */}
            {!input.logoImage ? (
              <div className="space-y-3 py-1">
                <div className={`p-3 rounded-xl border border-dashed ${innerBg} text-center space-y-1`}>
                  <p className={`text-xs font-mono font-bold ${isDayMode ? 'text-zinc-800' : 'text-zinc-200'}`}>
                    « Avez-vous un logo de marque / événement à superposer ? »
                  </p>
                  <p className={`text-[10px] font-mono ${textSubtle}`}>
                    Le logo est automatiquement vectorisé et optimisé pour le textile DTF.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    className="w-full py-2.5 px-3 rounded-xl bg-lime-400 hover:bg-lime-300 text-black font-black text-xs font-mono flex items-center justify-center gap-2 transition shadow-md cursor-pointer"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Uploader un logo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCurrentStep(4)}
                    className={`w-full py-2 px-3 rounded-xl border border-zinc-700 ${isDayMode ? 'bg-zinc-100 text-zinc-700' : 'bg-zinc-900 text-zinc-400'
                      } hover:text-white text-xs font-mono transition flex items-center justify-center gap-1.5 cursor-pointer`}
                  >
                    <span>Passer sans logo</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              /* 3.2 Actions complètes dès que le logo est chargé */
              <div className="space-y-3 animate-fadeIn">
                {/* Statut logo compact */}
                <div className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${innerBg}`}>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2 h-2 rounded-full bg-lime-400 animate-pulse shrink-0" />
                    <span className="text-xs font-mono font-bold truncate">Logo actif</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      className="px-2.5 py-1 text-[10px] font-mono font-bold rounded-lg border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
                    >
                      Changer
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        rawLogoOriginalRef.current = null;
                        setInput((p) => ({ ...p, logoImage: undefined }));
                      }}
                      className="p-1 rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-400 hover:text-white"
                      title="Retirer le logo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* 1. Prioritaire selon le fond : Noirs Découpés vs Détourer Fond */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleLogoColorModeSelect('knockout_black')}
                    className={`py-2 px-2.5 rounded-xl text-xs font-mono font-bold border transition flex items-center justify-center gap-1.5 cursor-pointer ${input.logoColorMode === 'knockout_black'
                        ? 'bg-lime-400 text-black border-lime-400 shadow-sm font-black'
                        : isDayMode
                          ? 'bg-zinc-100 border-zinc-300 text-zinc-800 hover:border-lime-500'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-lime-400/60 hover:text-white'
                      }`}
                    title="Prioritaire si le logo est sur fond noir"
                  >
                    <Scissors className="w-3.5 h-3.5 text-lime-400" />
                    <span>Noirs Découpés ✂️</span>
                  </button>

                  <button
                    type="button"
                    disabled={isCroppingLogoBg}
                    onClick={handleRemoveLogoBackground}
                    className="py-2 px-2.5 rounded-xl text-xs font-mono font-bold border border-lime-500/40 text-lime-400 bg-lime-400/5 hover:bg-lime-400/15 transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-40"
                    title="Prioritaire si le logo est sur fond coloré"
                  >
                    {isCroppingLogoBg ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-lime-400" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5 text-lime-400" />
                    )}
                    <span>Détourer Fond (IA)</span>
                  </button>
                </div>

                {/* 2. Sélecteur de teinte : Auto ↔ Néon ↔ Blanc ↔ Noir ↔ Original */}
                <div className="space-y-1.5">
                  <span className={`text-[10px] font-mono ${textMuted} block`}>Teinte &amp; Aspect :</span>
                  <div className="grid grid-cols-5 gap-1">
                    {([
                      { key: 'auto', label: '⚡ Auto' },
                      { key: 'neon', label: '✨ Néon' },
                      { key: 'white', label: 'Blanc' },
                      { key: 'black', label: 'Noir' },
                      { key: 'original', label: 'Orig.' },
                    ] as { key: LogoColorMode; label: string }[]).map(({ key, label }) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handleLogoColorModeSelect(key)}
                        className={`py-1.5 px-0.5 rounded-lg text-[10px] font-mono font-bold transition border cursor-pointer truncate ${input.logoColorMode === key || (!input.logoColorMode && key === 'auto')
                            ? 'bg-lime-400 text-black border-lime-400 shadow-xs font-black'
                            : isDayMode
                              ? 'bg-zinc-100 border-zinc-300 text-zinc-700 hover:text-zinc-900'
                              : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                          }`}
                        title={key === 'auto' ? 'Accordé automatiquement au décor et à la tonalité' : label}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Bouton Super-Résolution IA */}
                <button
                  type="button"
                  disabled={isCroppingLogoBg || isRemasteringLogo}
                  onClick={handleRemasterLogoAi}
                  className={`w-full py-2 px-3 text-[10px] font-mono font-bold rounded-lg border flex items-center justify-center gap-2 transition disabled:opacity-40 cursor-pointer shadow-xs ${remasterSuccess
                      ? 'bg-lime-400 text-black border-lime-400 shadow-sm font-black'
                      : 'bg-lime-400/10 hover:bg-lime-400/20 text-lime-400 border-lime-500/40'
                    }`}
                >
                  {isRemasteringLogo ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-lime-400" />
                  ) : remasterSuccess ? (
                    <Check className="w-3.5 h-3.5 text-black stroke-[3]" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 text-lime-400" />
                  )}
                  <span>
                    {isRemasteringLogo
                      ? 'Super-Résolution en cours...'
                      : remasterSuccess
                        ? 'Super-Résolution Appliquée !'
                        : 'Super-Résolution IA'}
                  </span>
                </button>

                {/* Sliders Échelle et Position Y Logo */}
                <div className={`p-2.5 rounded-xl border space-y-2.5 ${innerBg}`}>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-mono">
                      <span className={`${textMuted} flex items-center gap-1`}>
                        <Sliders className="w-3 h-3 text-lime-400" />
                        <span>Taille du Logo</span>
                      </span>
                      <span className="text-lime-400 font-bold">{Math.round((input.logoScale ?? 1.0) * 100)} %</span>
                    </div>
                    <input
                      type="range"
                      min="0.3"
                      max="4.0"
                      step="0.05"
                      value={input.logoScale ?? 1.0}
                      onFocus={() => setFocusedTarget?.('logo')}
                      onChange={(e) => setInput((p) => ({ ...p, logoScale: parseFloat(e.target.value) || 1.0 }))}
                      className="w-full accent-lime-400 h-1.5 bg-zinc-300 dark:bg-zinc-800 rounded-lg cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-mono">
                      <span className={`${textMuted} flex items-center gap-1`}>
                        <Sliders className="w-3 h-3 text-lime-400" />
                        <span>Position Y (Placement vertical)</span>
                      </span>
                      <span className="text-lime-400 font-bold">{input.logoOffsetY ?? 0} %</span>
                    </div>
                    <input
                      type="range"
                      min="-40"
                      max="40"
                      step="1"
                      value={input.logoOffsetY ?? 0}
                      onFocus={() => setFocusedTarget?.('logo')}
                      onChange={(e) => setInput((p) => ({ ...p, logoOffsetY: parseInt(e.target.value, 10) || 0 }))}
                      className="w-full accent-lime-400 h-1.5 bg-zinc-300 dark:bg-zinc-800 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onClick={(e) => { (e.target as HTMLInputElement).value = ''; }}
              onChange={handleLogoUpload}
            />

            {/* Boutons de navigation Étape 3 */}
            <div className="pt-1 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="px-3 py-2 rounded-xl border border-zinc-700 bg-zinc-900/60 text-zinc-300 text-xs font-mono font-bold flex items-center gap-1.5 hover:text-white"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Précédent</span>
              </button>

              <button
                type="button"
                onClick={() => setCurrentStep(4)}
                className="ml-auto px-4 py-2.5 rounded-xl bg-lime-400 hover:bg-lime-300 text-black font-black text-xs font-mono flex items-center justify-center gap-2 transition shadow-md cursor-pointer"
              >
                <span>Valider l'identité</span>
                <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ÉTAPE 4 : DIRECTION CHROMATIQUE & IDENTITÉS VISUELLES                     */}
        {/* ========================================================================= */}
        {currentStep === 4 && (
          <div className="space-y-4 animate-fadeIn">
            {/* Titre & Indicateur de progression */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-lime-400/10 text-lime-400 border border-lime-400/20">
                  <Palette className="w-4 h-4" />
                </div>
                <h3 className={`text-xs font-black font-mono uppercase tracking-wider ${isDayMode ? 'text-zinc-900' : 'text-white'}`}>
                  4. Direction Chromatique &amp; Identité
                </h3>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-lime-400/10 text-lime-400 border border-lime-400/20">
                4 / 5
              </span>
            </div>

            <StyleDirectionPicker
              input={input}
              setInput={setInput}
              isDayMode={isDayMode}
              setFocusedTarget={setFocusedTarget}
            />

            {/* Boutons de navigation Étape 4 */}
            <div className="pt-1 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="px-3 py-2 rounded-xl border border-zinc-700 bg-zinc-900/60 text-zinc-300 text-xs font-mono font-bold flex items-center gap-1.5 hover:text-white"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Précédent</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setCurrentStep(5);
                  setTextSubStep(1);
                }}
                className="ml-auto px-4 py-2.5 rounded-xl bg-lime-400 hover:bg-lime-300 text-black font-black text-xs font-mono flex items-center justify-center gap-2 transition shadow-md cursor-pointer"
              >
                <span>Valider le style</span>
                <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ÉTAPE 5 : INFORMATIONS TEXTUELLES (UN PAR UN)                             */}
        {/* ========================================================================= */}
        {currentStep === 5 && (
          <div className="space-y-3 animate-fadeIn">
            {/* Titre & Indicateur de sous-étapes */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-lime-400/10 text-lime-400 border border-lime-400/20">
                  <Type className="w-4 h-4" />
                </div>
                <div>
                  <h3 className={`text-xs font-black font-mono uppercase tracking-wider ${isDayMode ? 'text-zinc-900' : 'text-white'}`}>
                    5. Textes &amp; Métadonnées
                  </h3>
                  <p className={`text-[10px] font-mono ${textSubtle}`}>
                    {textSubStep === 1 && '1/3 : Surtitre & Genre musical'}
                    {textSubStep === 2 && "2/3 : Nom de la soirée (Titre principal)"}
                    {textSubStep === 3 && '3/3 : Artiste, Date, Horaire & Lieu'}
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-lime-400/10 text-lime-400 border border-lime-400/20">
                {textSubStep} / 3
              </span>
            </div>

            {/* Micro sous-stepper pour naviguer entre les 3 étapes textuelles */}
            <div className="flex items-center gap-1 py-0.5">
              {[
                { id: 1, label: 'Surtitre' },
                { id: 2, label: 'Titre' },
                { id: 3, label: 'Line-up' },
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setTextSubStep(s.id as any)}
                  className={`flex-1 py-1 text-[9px] font-mono rounded-lg border transition ${textSubStep === s.id
                      ? 'bg-lime-400 text-black border-lime-400 font-black'
                      : textSubStep > s.id
                        ? 'bg-lime-500/15 text-lime-400 border-lime-500/30 font-bold'
                        : isDayMode ? 'bg-zinc-100 border-zinc-200 text-zinc-500' : 'bg-zinc-900 border-zinc-800 text-zinc-500'
                    }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* 5.1 Surtitre / Genre */}
            {textSubStep === 1 && (
              <div className="space-y-2.5 animate-fadeIn">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className={`text-[10px] font-mono ${textMuted} flex items-center gap-1 font-bold`}>
                      <Tag className="w-3 h-3 text-lime-400" />
                      <span>SURTITRE (Haut d'affiche / Badge) :</span>
                    </label>
                    <span className={`text-[9px] font-mono ${(input.headerTagline?.length || 0) >= 25 ? 'text-red-400 font-bold' : (input.headerTagline?.length || 0) >= 20 ? 'text-amber-400 font-bold' : textSubtle}`}>
                      {input.headerTagline?.length || 0}/25
                    </span>
                  </div>
                  <input
                    type="text"
                    maxLength={25}
                    value={input.headerTagline ?? ''}
                    onFocus={() => setFocusedTarget?.('headline')}
                    onChange={(e) => setInput((p) => ({ ...p, headerTagline: e.target.value.slice(0, 25) }))}
                    placeholder="Ex: URBAN"
                    className={`w-full ${inputBg} border rounded-xl px-3 py-2 font-bold focus:outline-none focus:border-lime-400 focus:ring-1 focus:ring-lime-400 font-mono shadow-inner text-xs`}
                  />
                </div>

                {/* Puces rapides */}
                <div className="space-y-1">
                  <span className={`text-[9px] font-mono ${textSubtle}`}>Suggestions rapides en un tap :</span>
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_TAGLINES.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          setInput((p) => ({ ...p, headerTagline: tag.slice(0, 25) }));
                          setFocusedTarget?.('headline');
                        }}
                        className={`px-2 py-1 rounded-lg border text-[9px] font-mono transition ${input.headerTagline === tag
                            ? 'bg-lime-400/20 text-lime-400 border-lime-400/60 font-bold'
                            : isDayMode ? 'bg-zinc-100 border-zinc-200 text-zinc-600' : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                          }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-1 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(4)}
                    className="px-3 py-2 rounded-xl border border-zinc-700 bg-zinc-900/60 text-zinc-300 text-xs font-mono font-bold flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Style</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTextSubStep(2)}
                    className="ml-auto px-4 py-2.5 rounded-xl bg-lime-400 hover:bg-lime-300 text-black font-black text-xs font-mono flex items-center justify-center gap-2 transition shadow-md"
                  >
                    <span>Continuer vers Titre</span>
                    <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                  </button>
                </div>
              </div>
            )}

            {/* 5.2 Nom de l'événement / Soirée (Titre principal) */}
            {textSubStep === 2 && (
              <div className="space-y-2.5 animate-fadeIn">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className={`text-[10px] font-mono ${textMuted} flex items-center gap-1 font-bold`}>
                      <Flame className="w-3 h-3 text-lime-400" />
                      <span>TITRE 1 (Nom de la Soirée / Événement) :</span>
                    </label>
                    <span className={`text-[9px] font-mono ${(input.eventName?.length || 0) >= 25 ? 'text-red-400 font-bold' : (input.eventName?.length || 0) >= 20 ? 'text-amber-400 font-bold' : textSubtle}`}>
                      {input.eventName?.length || 0}/25
                    </span>
                  </div>
                  <input
                    type="text"
                    maxLength={25}
                    value={input.eventName}
                    onFocus={() => setFocusedTarget?.('headline')}
                    onChange={(e) => setInput((p) => ({ ...p, eventName: e.target.value.slice(0, 25) }))}
                    placeholder="Ex: LIVE"
                    className={`w-full ${inputBg} border rounded-xl px-3 py-2.5 font-black text-sm focus:outline-none focus:border-lime-400 focus:ring-1 focus:ring-lime-400 font-mono shadow-inner tracking-wider`}
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className={`text-[10px] font-mono ${textMuted} flex items-center gap-1 font-bold`}>
                      <Wand2 className="w-3 h-3 text-lime-400" />
                      <span>SOUS-TITRE 1 (Accroche / Punchline) :</span>
                    </label>
                    <span className={`text-[9px] font-mono ${(input.punchline?.length || 0) >= 25 ? 'text-red-400 font-bold' : (input.punchline?.length || 0) >= 20 ? 'text-amber-400 font-bold' : textSubtle}`}>
                      {input.punchline?.length || 0}/25
                    </span>
                  </div>
                  <input
                    type="text"
                    maxLength={25}
                    value={input.punchline || ''}
                    onFocus={() => setFocusedTarget?.('headline')}
                    onChange={(e) => setInput((p) => ({ ...p, punchline: e.target.value.slice(0, 25) }))}
                    placeholder="Ex: DJ SET VOCAL MELODIC"
                    className={`w-full ${inputBg} border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-lime-400 focus:ring-1 focus:ring-lime-400 font-mono shadow-inner`}
                  />
                </div>

                <div className="pt-1 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setTextSubStep(1)}
                    className="px-3 py-2 rounded-xl border border-zinc-700 bg-zinc-900/60 text-zinc-300 text-xs font-mono font-bold flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Surtitre</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTextSubStep(3)}
                    className="ml-auto px-4 py-2.5 rounded-xl bg-lime-400 hover:bg-lime-300 text-black font-black text-xs font-mono flex items-center justify-center gap-2 transition shadow-md"
                  >
                    <span>Continuer vers DJ &amp; Date</span>
                    <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                  </button>
                </div>
              </div>
            )}

            {/* 5.3 Nom du DJ / Line-up & Date / Lieu */}
            {textSubStep === 3 && (
              <div className="space-y-2.5 animate-fadeIn">
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className={`text-[10px] ${textMuted} flex items-center gap-1 font-bold`}>
                        <User className="w-3 h-3 text-lime-400" />
                        <span>TITRE 2 (Artiste / DJ)</span>
                      </label>
                      <span className={`text-[9px] font-mono ${(input.djName?.length || 0) >= 25 ? 'text-red-400 font-bold' : (input.djName?.length || 0) >= 20 ? 'text-amber-400 font-bold' : textSubtle}`}>
                        {input.djName?.length || 0}/25
                      </span>
                    </div>
                    <input
                      type="text"
                      maxLength={25}
                      value={input.djName}
                      onFocus={() => setFocusedTarget?.('djName')}
                      onChange={(e) => setInput((p) => ({ ...p, djName: e.target.value.slice(0, 25) }))}
                      placeholder="Ex: D OKIIN"
                      className={`w-full ${inputBg} border rounded-xl px-2.5 py-1.5 font-bold focus:outline-none focus:border-lime-400 focus:ring-1 focus:ring-lime-400 shadow-inner`}
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className={`text-[10px] ${textMuted} flex items-center gap-1 font-bold`}>
                        <ShieldCheck className="w-3 h-3 text-lime-400" />
                        <span>SURTITRE 2 (Badge)</span>
                      </label>
                      <span className={`text-[9px] font-mono ${(input.headlineBadgeText?.length || 0) >= 25 ? 'text-red-400 font-bold' : (input.headlineBadgeText?.length || 0) >= 20 ? 'text-amber-400 font-bold' : textSubtle}`}>
                        {input.headlineBadgeText?.length || 0}/25
                      </span>
                    </div>
                    <input
                      type="text"
                      maxLength={25}
                      value={input.headlineBadgeText || ''}
                      onFocus={() => setFocusedTarget?.('djName')}
                      onChange={(e) => setInput((p) => ({ ...p, headlineBadgeText: e.target.value.slice(0, 25) }))}
                      placeholder="Ex: HEADLINE PERFORMANCE"
                      className={`w-full ${inputBg} border rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-lime-400 focus:ring-1 focus:ring-lime-400 shadow-inner`}
                    />

                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className={`text-[10px] ${textMuted} flex items-center gap-1 font-bold`}>
                        <Calendar className="w-3 h-3 text-lime-400" />
                        <span>INFO 1 (Date de l'Événement)</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => datePickerRef.current?.showPicker?.()}
                        className="text-[9px] text-lime-400 font-bold underline cursor-pointer"
                      >
                        📅
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        value={input.date}
                        onFocus={() => setFocusedTarget?.('date')}
                        onChange={(e) => setInput((p) => ({ ...p, date: e.target.value }))}
                        placeholder="Ex: 21 SEPTEMBRE 2026"
                        className={`w-full ${inputBg} border rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-lime-400 focus:ring-1 focus:ring-lime-400 shadow-inner`}
                      />
                      <input
                        ref={datePickerRef}
                        type="date"
                        onChange={handleDateSelect}
                        className="absolute inset-0 opacity-0 pointer-events-none"
                        tabIndex={-1}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className={`text-[10px] ${textMuted} flex items-center gap-1 font-bold`}>
                      <Clock className="w-3 h-3 text-lime-400" />
                      <span>INFO 2 (Plage Horaire)</span>
                    </label>
                    <input
                      type="text"
                      value={input.timeSlot || ''}
                      onFocus={() => setFocusedTarget?.('date')}
                      onChange={(e) => setInput((p) => ({ ...p, timeSlot: e.target.value, time: e.target.value }))}
                      placeholder="Ex: 21:00 - 23:00"
                      className={`w-full ${inputBg} border rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-lime-400 focus:ring-1 focus:ring-lime-400 shadow-inner`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className={`text-[10px] ${textMuted} flex items-center gap-1 font-bold`}>
                        <MapPin className="w-3 h-3 text-lime-400" />
                        <span>INFO 3 (Lieu)</span>
                      </label>
                      {input.venueMapsUrl ? (
                        <div className="flex items-center gap-0.5 text-[9px] font-mono text-lime-400 bg-lime-400/10 border border-lime-400/30 px-1 py-0.5 rounded" title="Lien GPS mémorisé">
                          <span>📍 Lié</span>
                          <a href={input.venueMapsUrl} target="_blank" rel="noopener noreferrer" className="p-0.5 hover:text-white" title="Tester">
                            <ExternalLink className="w-2 h-2" />
                          </a>
                          <button
                            type="button"
                            onClick={() => setInput((p) => ({ ...p, venueMapsUrl: undefined }))}
                            className="text-zinc-400 hover:text-red-400 px-0.5 cursor-pointer font-bold"
                            title="Supprimer"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            const defaultVal = input.venue?.trim()
                              ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(input.venue.trim())}`
                              : '';
                            const url = window.prompt("Collez l'URL Google Maps (ou OK pour auto-générer) :", defaultVal);
                            if (url && url.trim()) {
                              setInput((p) => ({ ...p, venueMapsUrl: url.trim() }));
                            }
                          }}
                          className="text-[9px] font-mono text-zinc-400 hover:text-lime-400 flex items-center gap-0.5 px-1 py-0.5 rounded border border-zinc-800 bg-zinc-900 cursor-pointer"
                          title="Mémoriser un lien GPS précis"
                        >
                          <Link className="w-2 h-2" />
                          <span>+ GPS</span>
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      value={input.venue}
                      onFocus={() => setFocusedTarget?.('location')}
                      onChange={(e) => setInput((p) => ({ ...p, venue: e.target.value }))}
                      placeholder="Ex: TIKTOK // LIVE STREAM"
                      className={`w-full ${inputBg} border rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-lime-400 focus:ring-1 focus:ring-lime-400 shadow-inner`}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className={`text-[10px] ${textMuted} flex items-center gap-1 font-bold`}>
                      <span>@</span>
                      <span>Instagram</span>
                    </label>
                    <input
                      type="text"
                      value={input.instagramHandle || ''}
                      onFocus={() => setFocusedTarget?.('location')}
                      onChange={(e) => setInput((p) => ({ ...p, instagramHandle: e.target.value }))}
                      placeholder="dokiin_official"
                      className={`w-full ${inputBg} border rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-lime-400 focus:ring-1 focus:ring-lime-400 shadow-inner`}
                    />
                  </div>
                </div>

                {/* Bouton de finalisation Étape 5 */}
                <div className="pt-2 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setTextSubStep(2)}
                    className="px-3 py-2 rounded-xl border border-zinc-700 bg-zinc-900/60 text-zinc-300 text-xs font-mono font-bold flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Titre</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setFocusedTarget?.(null);
                      if (onFinishWizard) {
                        onFinishWizard();
                      }
                    }}
                    className="ml-auto w-full sm:w-auto px-5 py-3 rounded-xl bg-lime-400 hover:bg-lime-300 text-black font-black text-xs font-mono flex items-center justify-center gap-2 transition shadow-xl cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-zinc-950" />
                    <span>Terminer &amp; Voir le rendu complet ✨</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};