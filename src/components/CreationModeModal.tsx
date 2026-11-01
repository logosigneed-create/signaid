/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Droppaid.ai / Signaid - Modal d'Accueil & Assistant de Création en 2 Étapes
 * Propose le mode "Semi-automatique" (gratuit) et "Automatique par l'IA" (payant / Pass Déploiement / Pro)
 */

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Sparkles,
  Sliders,
  Wand2,
  Upload,
  X,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  ShieldCheck,
  Lock,
  Unlock,
  CreditCard,
  Trash2,
  Loader2,
  Image as ImageIcon,
  Layers,
  Zap,
} from 'lucide-react';
import { EventInput, createBlankEventInput } from '../types';
import { executeSmartAutoFillAi, SmartAutoFillResult, generateBackground } from '../services/geminiService';
import { harmonizeSubjectWithAi } from '../services/imageProcessingService';
import { removeBackgroundWithCanvas } from '../utils/backgroundRemover';
import {
  getCurrentUserEmail,
  checkIsPro,
  isEmailAdmin,
  grantProStatusForEmail,
} from '../utils/adminAuth';
import { showToast } from '../utils/toastEmitter';
import { safeSaveProjectToLocalStorage } from '../utils/storageSanitizer';

interface CreationModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  input: EventInput;
  setInput: React.Dispatch<React.SetStateAction<EventInput>>;
  onStudioReady?: () => void;
}

export type CreationStep = 'select' | 'form' | 'generating';
export type CreationMode = 'semi-auto' | 'auto-ai';
export type VisualRole = 'both' | 'subject' | 'logo';

export const CreationModeModal: React.FC<CreationModeModalProps> = ({
  isOpen,
  onClose,
  input,
  setInput,
  onStudioReady,
}) => {
  const [step, setStep] = useState<CreationStep>('select');
  const [selectedMode, setSelectedMode] = useState<CreationMode>('semi-auto');
  const [visualRole, setVisualRole] = useState<VisualRole>('both');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [imageFileName, setImageFileName] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string>('image/png');
  const [isDragOver, setIsDragOver] = useState(false);

  // Formulaire Mode Automatique IA
  const [idea, setIdea] = useState(input.eventName || '');
  const [message, setMessage] = useState(input.punchline || '');
  const [target, setTarget] = useState('');

  // États de chargement et paiement
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStage, setGenerationStage] = useState('Analyse par le Directeur Artistique IA...');
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Vérification des droits utilisateur (Admin / Pro / Débloqué)
  const [currentUserEmail, setCurrentUserEmail] = useState<string>(() => getCurrentUserEmail());
  const [hasProAccess, setHasProAccess] = useState<boolean>(() => {
    const email = getCurrentUserEmail();
    return isEmailAdmin(email) || checkIsPro(email);
  });

  useEffect(() => {
    const email = getCurrentUserEmail();
    setCurrentUserEmail(email);
    setHasProAccess(isEmailAdmin(email) || checkIsPro(email));
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setStep('select');
      setErrorMsg(null);
      setIsGenerating(false);
    }
  }, [isOpen]);

  // Écoute clavier Échap
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isGenerating) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isGenerating, onClose]);

  if (!isOpen) return null;

  // Traitement d'import d'image (sujet ou logo)
  const processImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Veuillez importer un fichier image valide (PNG, JPG, SVG, WebP).');
      return;
    }

    setErrorMsg(null);
    setImageFileName(file.name);
    setImageMimeType(file.type || 'image/png');

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (!result) return;

      // Compression intelligente si l'image dépasse 1.5 Mo
      if (file.size > 1.5 * 1024 * 1024) {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxDim = 1200;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressed = canvas.toDataURL(file.type === 'image/jpeg' ? 'image/jpeg' : 'image/png', 0.88);
            setUploadedImage(compressed);
          } else {
            setUploadedImage(result);
          }
        };
        img.src = result;
      } else {
        setUploadedImage(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  // Déclenchement du paiement Stripe pour le Pass Mode Automatique
  const handleTriggerStripePass = async () => {
    setIsCheckingOut(true);
    setErrorMsg(null);
    try {
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: input.id || input.projectId || `proj_${Date.now()}`,
          type: 'ai_autofill_pass',
          eventSlug: input.slug || 'nouveau-projet',
          customerEmail: currentUserEmail || undefined,
          returnUrl: window.location.origin,
        }),
      });

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else if (data.simulated) {
        // En environnement local ou test sans Stripe en direct, validation instantanée
        const email = currentUserEmail || 'demo-pro@signaid.eu';
        grantProStatusForEmail(email);
        setHasProAccess(true);
        showToast('Pass IA simulé validé avec succès pour cette session !', 'success');
      } else {
        setErrorMsg('Impossible d\'ouvrir la session de paiement Stripe pour le moment.');
      }
    } catch (err: any) {
      console.warn('[CreationModeModal] Stripe checkout error:', err);
      setErrorMsg('Erreur de connexion au serveur de paiement Stripe.');
    } finally {
      setIsCheckingOut(false);
    }
  };

  // Déblocage test / démo immédiat
  const handleUnlockDemoAccess = () => {
    const email = currentUserEmail || 'demo-eval@signaid.eu';
    grantProStatusForEmail(email);
    setHasProAccess(true);
    showToast('Accès Pro / Pass IA accordé pour cette session de démonstration.', 'success');
  };

  // Accès direct au Studio vierge (100% vide, sans image ni texte de démonstration)
  const handleAccessBlankStudio = () => {
    const blank = createBlankEventInput();
    setInput(blank);
    try {
      safeSaveProjectToLocalStorage(['signaid_studio_current_project', 'droppaid_last_event_input'], blank);
    } catch {}
    onClose();
    if (onStudioReady) {
      onStudioReady();
    }
    showToast('Studio vierge initialisé : page blanche totale.', 'info');
  };

  // Exécution du mode semi-automatique gratuit (injection instantanée dans le Studio)
  const handleLaunchSemiAuto = () => {
    setInput((prev) => {
      // Base vierge si l'état précédent contenait des éléments de démo ou était vierge
      const isDemoState =
        prev.djPhoto === '/demo/artist-demo.webp' ||
        prev.backgroundImage === '/demo/signaid-backgroundImage.webp' ||
        prev.eventName === 'PORTAIL INTERACTIF - SIGNAID';

      const base = isDemoState ? createBlankEventInput(prev.id) : prev;
      const updates: Partial<EventInput> = { isVirgin: false };

      if (idea.trim()) {
        updates.eventName = idea.trim();
      }
      if (message.trim()) {
        updates.punchline = message.trim();
      }
      if (target.trim()) {
        if (!updates.punchline) {
          updates.punchline = target.trim();
        }
        updates.headlineBadgeText = target.trim().toUpperCase().substring(0, 24);
      }

      if (uploadedImage) {
        if (visualRole === 'subject' || visualRole === 'both') {
          updates.djPhoto = uploadedImage;
          updates.rawDjPhoto = uploadedImage;
        }
        if (visualRole === 'logo' || visualRole === 'both') {
          updates.logoImage = uploadedImage;
          updates.logoUrl = uploadedImage;
          updates.tshirtCustomLogo = uploadedImage;
          updates.rawTshirtLogoOriginal = uploadedImage;
        }
      }

      const merged = {
        ...base,
        ...updates,
      };
      try {
        safeSaveProjectToLocalStorage(['signaid_studio_current_project', 'droppaid_last_event_input'], merged);
      } catch {}
      return merged;
    });

    showToast('Mode Semi-Automatique : Sujet et informations injectés dans le Studio !', 'success');
    onClose();
    if (onStudioReady) {
      onStudioReady();
    }
  };

  /**
   * Détourage automatique haute précision du sujet source (API distante + repli Canvas 2D local)
   */
  const performSubjectCutout = async (imageSrc: string): Promise<string> => {
    if (!imageSrc) return imageSrc;

    let imagePayload = imageSrc;
    try {
      if (imageSrc.startsWith('blob:')) {
        const response = await fetch(imageSrc);
        const blobData = await response.blob();
        imagePayload = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blobData);
        });
      }
    } catch (blobErr) {
      console.warn('[CreationModeModal] Erreur lecture image blob locale :', blobErr);
    }

    // 1. Appel API de détourage HD (Backend Python local)
    try {
      const res = await fetch('/remove-bg', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: imagePayload,
          imageBase64: imagePayload,
          size: 'full',
          scale: 'original',
          type: 'person',
          format: 'png',
          channels: 'rgba',
        }),
        signal: AbortSignal.timeout(30000),
      });

      if (res.ok) {
        const contentType = res.headers.get('content-type') || '';

        // Si l'API renvoie du JSON
        if (contentType.includes('application/json')) {
          const data = await res.json();
          const cutoutImage = data?.processedImageBase64 || data?.image || data?.imageUrl || data?.cutoutUrl;
          if (cutoutImage && cutoutImage !== imagePayload) {
            return cutoutImage.startsWith('data:') ? cutoutImage : `data:image/png;base64,${cutoutImage}`;
          }
        } else {
          // Si l'API renvoie l'image brute en binaire PNG (Blob)
          const blob = await res.blob();
          if (blob && blob.size > 0) {
            const base64Data = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });

            if (base64Data && base64Data !== imagePayload) {
              return base64Data;
            }
          }
        }
      }
    } catch (apiErr) {
      console.warn('[CreationModeModal] Détourage distant indisponible, repli Canvas local :', apiErr);
    }
    // 2. Repli robuste immédiat via Canvas 2D HTML5
    try {
      const localCutout = await removeBackgroundWithCanvas(imagePayload, {
        type: 'subject',
        applyBottomFade: false,
      });
      if (localCutout && localCutout !== imagePayload && localCutout.length > 50) {
        return localCutout;
      }
    } catch (localErr) {
      console.warn('[CreationModeModal] Échec détourage Canvas local :', localErr);
    }

    return imagePayload;
  };

  // Exécution du mode automatique IA : Pipeline complet sans couture (Détourage + Décor IA + Harmonisation)
  const handleLaunchAutoFill = async () => {
    if (!idea.trim() && !message.trim() && !uploadedImage) {
      setErrorMsg('Veuillez renseigner au moins une idée, un message ou importer un visuel.');
      return;
    }

    setIsGenerating(true);
    setErrorMsg(null);
    setGenerationStage('Analyse multimodale de votre visuel et intentions par Gemini 2.5 Flash...');

    try {
      // 0. Analyse multimodale et conception de la direction artistique
      const result: SmartAutoFillResult = await executeSmartAutoFillAi({
        imageBase64: uploadedImage || undefined,
        imageMimeType,
        idea: idea.trim(),
        message: message.trim(),
        target: target.trim(),
        userEmail: currentUserEmail,
      });

      let cutoutSubject: string | null = null;
      let generatedDecor: string | null = null;
      let harmResult: any = null;

      // Étape 1 : Détourage automatique de l'image du sujet source
      if (uploadedImage && (visualRole === 'subject' || visualRole === 'both')) {
        setGenerationStage('1/3 Détourage automatique haute précision du sujet source...');
        cutoutSubject = await performSubjectCutout(uploadedImage);
      }

      // Étape 2 : Génération du décor par l'IA en fonction de l'idée / cible
      setGenerationStage('2/3 Génération du décor scénique par l\'IA...');
      const decorPrompt =
        result.bgPrompt ||
        `${idea.trim() || 'Scène événementielle ultra immersive'}, éclairage dynamique cinéma, festival, 3D moderne, textures riches, sans texte`;
      try {
        generatedDecor = await generateBackground(decorPrompt, {
          aspectRatio: '1:1',
          hasSubject: Boolean(uploadedImage && (visualRole === 'subject' || visualRole === 'both')),
        });
      } catch (decorErr) {
        console.warn('[CreationModeModal] Erreur génération décor IA, utilisation fond scénique par défaut :', decorErr);
        generatedDecor = '/demo/signaid-backgroundImage.webp';
      }

      // Étape 3 : Fusion et harmonisation automatique du sujet détouré au sein du décor généré
      if (cutoutSubject && generatedDecor) {
        setGenerationStage('3/3 Fusion et harmonisation du sujet au décor généré...');
        try {
          harmResult = await harmonizeSubjectWithAi(generatedDecor, cutoutSubject, {
            currentTone: 0.5,
            format: 'post',
            explicitEmail: currentUserEmail,
          });
        } catch (harmErr) {
          console.warn('[CreationModeModal] Repli local harmonisation sujet :', harmErr);
        }
      }

      // Injection dans l'état du Studio (avec contrainte stricte de 25 caractères max sur les titres)
      setInput((prev) => {
        const updates: Partial<EventInput> = {
          headerTagline: result.headerTagline ? result.headerTagline.trim().slice(0, 25) : prev.headerTagline,
          eventName: result.eventName ? result.eventName.trim().slice(0, 25) : prev.eventName,
          punchline: result.punchline ? result.punchline.trim().slice(0, 25) : prev.punchline,
          headlineBadgeText: result.headlineBadgeText ? result.headlineBadgeText.trim().slice(0, 25) : prev.headlineBadgeText,
          djName: result.djName ? result.djName.trim().slice(0, 25) : prev.djName,
          bgPrompt: result.bgPrompt || prev.bgPrompt,
          ambiancePrompt: result.bgPrompt || prev.ambiancePrompt,
        };

        if (generatedDecor) {
          updates.backgroundImage = generatedDecor;
          updates.customBackground = generatedDecor;
        }

        if (uploadedImage) {
          if (visualRole === 'subject' || visualRole === 'both') {
            updates.djPhoto = (harmResult && harmResult.success && harmResult.harmonizedSubjectImage)
              ? harmResult.harmonizedSubjectImage
              : (cutoutSubject || uploadedImage);
            updates.rawDjPhoto = uploadedImage;
            if ((cutoutSubject && cutoutSubject !== uploadedImage) || harmResult?.wasCutout) {
              updates.isSubjectBackgroundRemoved = true;
            }
            if (harmResult && harmResult.success) {
              updates.isSubjectHarmonized = true;
              updates.subjectBrightness = harmResult.brightness;
              updates.subjectContrast = harmResult.contrast;
              updates.subjectSaturation = harmResult.saturation;
              updates.subjectHueRotate = harmResult.hueRotate;
              updates.subjectShadowOffsetX = harmResult.shadow?.offsetX;
              updates.subjectShadowOffsetY = harmResult.shadow?.offsetY;
              updates.subjectShadowBlur = harmResult.shadow?.blur;
              updates.subjectShadowColor = harmResult.shadow?.color;
              updates.subjectShadowOpacity = harmResult.shadow?.opacity;
              updates.subjectBlendMode = harmResult.blendMode;
              updates.subjectLightingSummary = harmResult.analysis?.summary;
              if (typeof harmResult.suggestedBackgroundTone === 'number') {
                updates.backgroundTone = harmResult.suggestedBackgroundTone;
              }
            }
          }
          if (visualRole === 'logo' || visualRole === 'both') {
            updates.logoImage = uploadedImage;
            updates.logoUrl = uploadedImage;
            updates.tshirtCustomLogo = uploadedImage;
            updates.rawTshirtLogoOriginal = uploadedImage;
          }
        }

        return {
          ...prev,
          ...updates,
        };
      });

      showToast('Pipeline IA terminé : Sujet détouré, décor généré et harmonisé !', 'success');

      // Clôture et bascule immédiate vers le Studio
      onClose();
      if (onStudioReady) {
        onStudioReady();
      }
    } catch (err: any) {
      console.error('[CreationModeModal] Erreur smartAutoFill:', err);
      setErrorMsg(err?.message || 'Erreur lors de la génération automatique par l\'IA.');
    } finally {
      setIsGenerating(false);
    }
  };

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="creation-mode-title"
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fadeIn select-none"
    >
      <div className="relative w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-3xl p-5 sm:p-8 shadow-[0_0_80px_rgba(0,0,0,0.8)] text-zinc-100 my-auto transition-all duration-300">

        {/* Bouton Fermer */}
        {!isGenerating && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 sm:top-5 sm:right-5 p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors cursor-pointer"
            aria-label="Fermer"
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* ========================================================================= */}
        {/* ÉTAPE 1 : CHOIX DU MODE (Semi-Automatique vs Automatique IA) */}
        {/* ========================================================================= */}
        {step === 'select' && (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-lime-400/10 border border-lime-400/30 text-lime-400 font-mono text-xs font-black uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Nouveau Projet &amp; Lancement Studio</span>
              </div>
              <h2 id="creation-mode-title" className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">
                Choisissez votre Mode de Conception
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400 max-w-lg mx-auto">
                Droppaid vous permet de composer manuellement votre identité visuelle ou de laisser le Directeur Artistique IA pré-remplir l'intégralité du Studio.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {/* Option A : Mode Semi-Automatique (Gratuit) */}
              <div
                className="group relative rounded-2xl bg-zinc-900/80 border border-zinc-800 hover:border-zinc-600 p-5 flex flex-col justify-between transition-all duration-200 hover:shadow-lg hover:shadow-zinc-900/50 hover:bg-zinc-900"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-200 group-hover:bg-zinc-700 transition-colors">
                      <Sliders className="w-5 h-5" />
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-zinc-800 text-zinc-300 border border-zinc-700">
                      Gratuit
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-white group-hover:text-zinc-100 flex items-center gap-1.5">
                      Mode Semi-Automatique
                    </h3>
                    <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                      Importez votre sujet, renseignez votre idée et accédez directement aux outils et curseurs classiques du Studio.
                    </p>
                  </div>

                  <ul className="space-y-1.5 text-[11px] text-zinc-400 font-mono pt-1">
                    <li className="flex items-center gap-1.5">
                      <span className="text-lime-400">•</span>
                      <span>Import sujet/logo + idée + cible</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="text-zinc-500">•</span>
                      <span>Contrôle total des curseurs &amp; textes</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="text-zinc-500">•</span>
                      <span>Formats Post 1:1, Story, A3, Bannière</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="text-zinc-500">•</span>
                      <span>Mockup textile DTF 300 DPI</span>
                    </li>
                  </ul>
                </div>

                <div className="pt-4 space-y-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedMode('semi-auto');
                      setStep('form');
                    }}
                    className="w-full py-2.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-mono text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Configurer &amp; Uploader (Gratuit)</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={handleAccessBlankStudio}
                    className="w-full text-center text-[10px] font-mono text-zinc-500 hover:text-zinc-300 transition-colors py-1 cursor-pointer"
                  >
                    Accéder directement au Studio vierge
                  </button>
                </div>
              </div>

              {/* Option B : Mode Automatique IA (Payant / Pro) */}
              <div
                onClick={() => {
                  setSelectedMode('auto-ai');
                  setStep('form');
                }}
                className="group relative rounded-2xl bg-gradient-to-b from-zinc-900 to-zinc-950 border-2 border-lime-400/80 hover:border-lime-400 p-5 flex flex-col justify-between transition-all duration-200 cursor-pointer shadow-[0_0_30px_rgba(57,255,20,0.12)] hover:shadow-[0_0_40px_rgba(57,255,20,0.22)]"
              >
                {/* Badge Flottant */}
                <div className="absolute -top-3 right-4 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black uppercase tracking-wider bg-lime-400 text-black shadow-md flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  <span>Recommandé IA</span>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-lime-400/20 text-lime-400 border border-lime-400/30 flex items-center justify-center">
                      <Wand2 className="w-5 h-5" />
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-lime-400/10 text-lime-400 border border-lime-400/30">
                      {hasProAccess ? 'Inclus Pro' : 'Pass Déploiement'}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-white group-hover:text-lime-300 flex items-center gap-1.5 transition-colors">
                      Automatique par l'IA
                    </h3>
                    <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
                      Gemini 2.5 Flash analyse votre sujet ou logo, votre concept et votre audience pour générer l'identité complète et pré-remplir le Studio.
                    </p>
                  </div>

                  <ul className="space-y-1.5 text-[11px] text-zinc-300 font-mono pt-1">
                    <li className="flex items-center gap-1.5">
                      <span className="text-lime-400">✓</span>
                      <span>Analyse visuelle multimodale</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="text-lime-400">✓</span>
                      <span>Copywriting d'élite &amp; titres percutants</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="text-lime-400">✓</span>
                      <span>Prompt de décor scénique cinématographique</span>
                    </li>
                  </ul>
                </div>

                <div className="pt-4">
                  <button
                    type="button"
                    className="w-full py-2.5 px-3 rounded-xl bg-lime-400 hover:bg-lime-300 text-black font-mono text-xs font-black uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-lime-400/20 cursor-pointer"
                  >
                    <span>Configurer avec l'IA</span>
                    <Sparkles className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ÉTAPE 2 : FORMULAIRE DU DOUBLE PARCOURS (Semi-Auto Gratuit vs Auto IA) */}
        {/* ========================================================================= */}
        {step === 'form' && (
          <div className="space-y-5">
            {/* Navigation haute & Sélecteur de Parcours Modal */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-zinc-800 pb-3">
              <button
                type="button"
                onClick={() => setStep('select')}
                className="inline-flex items-center gap-1.5 text-xs font-mono text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Retour aux modes</span>
              </button>

              {/* Onglets du Double Parcours */}
              <div className="flex items-center p-1 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono">
                <button
                  type="button"
                  onClick={() => setSelectedMode('semi-auto')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${selectedMode === 'semi-auto'
                      ? 'bg-zinc-800 text-white font-bold shadow'
                      : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                >
                  <Sliders className="w-3.5 h-3.5 text-lime-400" />
                  <span>Semi-Automatique (Gratuit)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedMode('auto-ai')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${selectedMode === 'auto-ai'
                      ? 'bg-lime-400 text-black font-black shadow'
                      : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Automatique IA</span>
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight flex items-center gap-2">
                {selectedMode === 'semi-auto' ? (
                  <>
                    <Sliders className="w-5 h-5 text-lime-400" />
                    <span>Configuration Semi-Automatique</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="w-5 h-5 text-lime-400" />
                    <span>Directeur Artistique IA</span>
                  </>
                )}
              </h2>
              <p className="text-xs text-zinc-400">
                {selectedMode === 'semi-auto'
                  ? "Uploadez votre sujet ou logo, précisez votre idée et cible, puis injectez instantanément le tout dans le Studio."
                  : "Fournissez votre visuel et décrivez votre événement pour que Gemini 2.5 Flash structure l'affiche, les slogans et le décor."}
              </p>
            </div>

            {/* 1. Zone d'Upload du Sujet ou Logo */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-lime-400" />
                  <span>1. Visuel : Sujet ou Logo (Optionnel mais recommandé)</span>
                </label>
                {uploadedImage && (
                  <button
                    type="button"
                    onClick={() => {
                      setUploadedImage(null);
                      setImageFileName(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="text-[11px] font-mono text-red-400 hover:text-red-300 flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Supprimer</span>
                  </button>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={handleFileChange}
                className="hidden"
              />

              {!uploadedImage ? (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragOver(true);
                  }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all ${isDragOver
                      ? 'border-lime-400 bg-lime-400/10'
                      : 'border-zinc-800 hover:border-zinc-600 bg-zinc-900/50 hover:bg-zinc-900'
                    }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-400">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white">Glissez votre sujet ou logo ici</span>
                      <span className="text-xs text-zinc-400"> ou cliquez pour parcourir</span>
                    </div>
                    <span className="text-[10px] font-mono text-zinc-500">
                      PNG, JPG, SVG, WebP (fond transparent idéal pour logo/sujet)
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-zinc-900 border border-zinc-800">
                  <div className="w-14 h-14 rounded-xl bg-zinc-950 border border-zinc-800 overflow-hidden flex items-center justify-center shrink-0">
                    <img
                      src={uploadedImage}
                      alt="Aperçu importé"
                      width={56}
                      height={56}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-contain p-1"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-white truncate">
                      <CheckCircle2 className="w-3.5 h-3.5 text-lime-400 shrink-0" />
                      <span className="truncate">{imageFileName || 'Visuel chargé'}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[10px] font-mono text-zinc-400">Affecter comme :</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setVisualRole('both')}
                          className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors cursor-pointer ${visualRole === 'both'
                              ? 'bg-lime-400 text-black font-bold'
                              : 'bg-zinc-800 text-zinc-400 hover:text-white'
                            }`}
                        >
                          Sujet &amp; Logo
                        </button>
                        <button
                          type="button"
                          onClick={() => setVisualRole('subject')}
                          className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors cursor-pointer ${visualRole === 'subject'
                              ? 'bg-lime-400 text-black font-bold'
                              : 'bg-zinc-800 text-zinc-400 hover:text-white'
                            }`}
                        >
                          Sujet central
                        </button>
                        <button
                          type="button"
                          onClick={() => setVisualRole('logo')}
                          className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors cursor-pointer ${visualRole === 'logo'
                              ? 'bg-lime-400 text-black font-bold'
                              : 'bg-zinc-800 text-zinc-400 hover:text-white'
                            }`}
                        >
                          Logo textile
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 2. Champs Textuels d'Intention */}
            <div className="space-y-3 font-mono">
              <div>
                <label className="block text-[11px] font-bold text-zinc-300 uppercase tracking-wider mb-1">
                  2. L'idée de l'événement / du projet
                </label>
                <textarea
                  rows={2}
                  value={idea}
                  onChange={(e) => setIdea(e.target.value)}
                  placeholder="Ex: Soirée techno underground dans un bunker avec système son Funktion-One..."
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 focus:border-lime-400 text-xs text-white placeholder:text-zinc-600 focus:outline-none resize-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-300 uppercase tracking-wider mb-1">
                  3. La cible / l'audience visée
                </label>
                <input
                  type="text"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  placeholder="Ex: Communauté clubbing 20-35 ans, festivaliers, amateurs de hard groove..."
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 focus:border-lime-400 text-xs text-white placeholder:text-zinc-600 focus:outline-none transition-colors"
                />
              </div>

              {selectedMode === 'auto-ai' && (
                <div>
                  <label className="block text-[11px] font-bold text-zinc-300 uppercase tracking-wider mb-1">
                    4. Le message principal à faire passer (slogan)
                  </label>
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Ex: Immersion sonore totale, énergie brute, 1000 places seulement..."
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 focus:border-lime-400 text-xs text-white placeholder:text-zinc-600 focus:outline-none transition-colors"
                  />
                </div>
              )}
            </div>

            {/* Message d'erreur éventuel */}
            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono">
                {errorMsg}
              </div>
            )}

            {/* 3. Section d'Action & Validation */}
            <div className="pt-2 border-t border-zinc-800">
              {selectedMode === 'semi-auto' ? (
                /* Parcours Semi-Automatique Gratuit : Injection instantanée */
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={handleLaunchSemiAuto}
                    className="w-full py-3.5 px-4 rounded-xl bg-lime-400 hover:bg-lime-300 text-black font-mono text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-lime-400/25 active:scale-98 transition-all cursor-pointer"
                  >
                    <span>Injecter instantanément dans le Studio (Gratuit)</span>
                    <ArrowRight className="w-4 h-4 text-black" />
                  </button>
                  <p className="text-[11px] text-center font-mono text-zinc-400">
                    Vos visuels, idée et cible sont immédiatement appliqués dans l'éditeur du Studio sans frais.
                  </p>
                </div>
              ) : hasProAccess ? (
                /* Parcours Automatique IA avec Accès Pro / Pass */
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-lime-400/10 border border-lime-400/30 text-lime-400 text-xs font-mono">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4" />
                      <span className="font-bold">Accès Pro / Déploiement Actif</span>
                    </div>
                    <span className="text-[10px] uppercase font-bold tracking-wider">Illimité</span>
                  </div>

                  <button
                    type="button"
                    disabled={isGenerating}
                    onClick={handleLaunchAutoFill}
                    className="w-full py-3.5 px-4 rounded-xl bg-lime-400 hover:bg-lime-300 text-black font-mono text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-lime-400/25 active:scale-98 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Sparkles className="w-4 h-4 text-black" />
                    <span>Générer et pré-remplir le studio</span>
                  </button>
                </div>
              ) : (
                /* Parcours Automatique IA sans Pass actif */
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono space-y-1.5">
                    <div className="flex items-center justify-between text-zinc-300">
                      <span className="flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-amber-400" />
                        <span>Pass Mode Automatique IA :</span>
                      </span>
                      <span className="text-lime-400 font-bold">9 € TTC</span>
                    </div>
                    <p className="text-[11px] text-zinc-400">
                      Inclut l'analyse multimodale Gemini 2.5 Flash, le copywriting d'élite et le prompt de décor généré sur-mesure.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={isCheckingOut}
                      onClick={handleTriggerStripePass}
                      className="py-3 px-3 rounded-xl bg-lime-400 hover:bg-lime-300 text-black font-mono text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-md shadow-lime-400/20 active:scale-98 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {isCheckingOut ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-black" />
                          <span>Paiement Stripe...</span>
                        </>
                      ) : (
                        <>
                          <CreditCard className="w-4 h-4" />
                          <span>Acheter le Pass (9 €)</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleUnlockDemoAccess}
                      className="py-3 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-mono text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Zap className="w-3.5 h-3.5 text-lime-400" />
                      <span>Activer Accès Test / Démo</span>
                    </button>
                  </div>

                  {/* Repli en Semi-Automatique Gratuit sans friction */}
                  <button
                    type="button"
                    onClick={handleLaunchSemiAuto}
                    className="w-full text-center text-xs font-mono text-zinc-400 hover:text-white transition-colors py-2 cursor-pointer border border-zinc-800 hover:border-zinc-700 rounded-xl hover:bg-zinc-900"
                  >
                    Ou continuer en Semi-automatique gratuit avec ces informations →
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ÉCRAN DE CHARGEMENT / GÉNÉRATION IA EN COURS */}
        {/* ========================================================================= */}
        {isGenerating && (
          <div className="py-12 px-4 text-center space-y-6">
            <div className="relative mx-auto w-20 h-20">
              <div className="absolute inset-0 rounded-full border-2 border-lime-400/20 animate-ping" />
              <div className="relative w-full h-full rounded-full bg-lime-400/10 border-2 border-lime-400 flex items-center justify-center shadow-[0_0_40px_rgba(57,255,20,0.4)]">
                <Wand2 className="w-8 h-8 text-lime-400 animate-pulse" />
              </div>
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-lime-400/10 border border-lime-400/30 text-lime-400 font-mono text-xs font-black uppercase tracking-wider">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Traitement Directeur Artistique IA</span>
              </div>
              <h3 className="text-xl font-black text-white uppercase tracking-tight">
                Création de votre univers en cours...
              </h3>
              <p className="text-xs font-mono text-zinc-300 max-w-md mx-auto">
                {generationStage}
              </p>
            </div>

            <div className="w-48 h-1 bg-zinc-900 rounded-full mx-auto overflow-hidden">
              <div className="w-full h-full bg-lime-400 animate-[pulse_1.5s_ease-in-out_infinite]" />
            </div>
          </div>
        )}

      </div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body);
  }

  return modalContent;
};
