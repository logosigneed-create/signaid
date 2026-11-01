/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import {
  EventInput,
  LogoTransformState,
  TypographyStyle,
  LogoColorMode,
  resolveDynamicLogoFilter,
  getToneFilter,
  resolveToneFilter,
  computeToneOverlay,
  ToneOverlayState,
  FocusedTarget,
  getDefaultFormatTransforms,
  getDefaultBackgroundTransform,
  resolveBackgroundTransformForFormat,
  INITIAL_DEMO_STATE,
  DEFAULT_STUDIO_DATA,
  BLANK_STUDIO_DATA,
  createBlankEventInput,
  sanitizeStudioText,
  LogoPlacement,
  LogoFormatTransform,
  resolveLogoTransformForFormat,
  resolvePinnedLogoTransform,
  pinLogoToSubject,
  unpinLogoFromSubject,
  updatePinnedLogoTransform,
  resolveSecondarySubjectTransform,
  pinSecondaryToSubject,
  unpinSecondaryFromSubject,
  applySecondarySubjectUpdate,
  SubjectAnchorTransform,
  updateLogoTransform,
  resetLogoTransformForFormat,
  TextScales,
  DEFAULT_TEXT_SCALES,
  resolveTextScalesForFormat,
  updateTextScaleForFormat,
  resetTextScalesForFormat,
  resolveUnifiedEventSlug,
  TextOffsetsY,
  DEFAULT_TEXT_OFFSETS_Y,
  resolveTextOffsetsYForFormat,
  updateTextOffsetYForFormat,
  resetTextOffsetsYForFormat,
  updateAllTextOffsetsYForFormat,
  updateSynchronizedYOffsets,
  TextOffsetsX,
  TextAlignments,
  DEFAULT_TEXT_OFFSETS_X,
  DEFAULT_TEXT_ALIGNMENTS,
  resolveTextOffsetsXForFormat,
  updateTextOffsetXForFormat,
  resetTextOffsetsXForFormat,
  resolveTextAlignmentsForFormat,
  updateTextAlignmentForField,
  resolveTextLineSpacingForFormat,
  updateTextLineSpacingForFormat,
  resolveTextAlignmentForFormat,
  updateTextAlignmentForFormat,
  centerAllLayersForFormat,
  resetAllTextPositionsForFormat,
  TextColors,
  DEFAULT_TEXT_COLORS,
  resolveTextColorsForFormat,
  updateTextColorForFormat,
  toggleAllTextColorsForFormat,
  resetTextColorsForFormat,
  PosterTextItem,
  resolveFontWeight,
  ensurePosterTexts,
  createNewPosterTextItem,
  SE_FAIRE_ENTENDRE_PROJECT,
  parseTextSegments,
  getCleanDisplayText,
  extractWordsFromText,
  isWordHighlighted,
  toggleWordInText,
} from '../types';

export {
  computeToneOverlay,
  INITIAL_DEMO_STATE,
  DEFAULT_STUDIO_DATA,
  sanitizeStudioText,
  DEFAULT_TEXT_SCALES,
  resolveTextScalesForFormat,
  updateTextScaleForFormat,
  resetTextScalesForFormat,
  DEFAULT_TEXT_OFFSETS_Y,
  resolveTextOffsetsYForFormat,
  updateTextOffsetYForFormat,
  resetTextOffsetsYForFormat,
  updateAllTextOffsetsYForFormat,
  updateSynchronizedYOffsets,
  DEFAULT_TEXT_OFFSETS_X,
  DEFAULT_TEXT_ALIGNMENTS,
  resolveTextOffsetsXForFormat,
  updateTextOffsetXForFormat,
  resetTextOffsetsXForFormat,
  resolveTextAlignmentsForFormat,
  updateTextAlignmentForField,
  resolveUnifiedEventSlug,
  resolveTextLineSpacingForFormat,
  updateTextLineSpacingForFormat,
  resolveTextAlignmentForFormat,
  updateTextAlignmentForFormat,
  centerAllLayersForFormat,
  resetAllTextPositionsForFormat,
  DEFAULT_TEXT_COLORS,
  resolveTextColorsForFormat,
  updateTextColorForFormat,
  toggleAllTextColorsForFormat,
  resetTextColorsForFormat,
};
export type { LogoTransformState, LogoPlacement, LogoFormatTransform, TextScales, TextOffsetsY, TextOffsetsX, TextAlignments, TextColors };

// Fonction de calcul des coordonnées adaptées au corps humain (Matrice Gabarit -> Mannequin)
// Standard DTF : Face = pectoral gauche (top: 48%, left: 68%, width: 14%), Dos = omoplates centré (top: 42%, left: 50%, width: 32%)
import { getMannequinPosition, FORMAT_LABELS, getFormatAspectRatio } from '../utils/studioLayoutHelpers';
import { SELECT_SUBJECT_EVENT, getSubjectLayerZClasses } from '../utils/useSubjectLayerDrag';
export { getMannequinPosition, FORMAT_LABELS, getFormatAspectRatio };

import { OverlayLogo } from './OverlayLogo';
import { processLogoDeterministic, generateMechanicalMockup, remasterSubjectAi, harmonizeSubjectWithAi, harmonizeWithImagen3, createStudioCompositeCanvas } from '../services/imageProcessingService';
import {
  createLocalLogoPreview,
  optimizeLogoForUpload,
  compressLogoToCanvas,
} from '../utils/logoOptimizer';
import {
  clampDtfPlacement,
  resolveActiveTextileLogo,
  resolveActiveTextileColorMode,
  getTextileLogoStyle,
  getTextileLogoFilter,
  resolveGarmentTemplateSrc,
  DTF_PRINT_BOUNDS,
  notifyHubProjectUpdated,
} from '../utils/textileMockupUtils';
import {
  StyleDirectionPicker,
  getActiveStyleKey,
  STYLE_PRESETS,
  StylePresetKey,
  injectChromaticDirectionIntoPrompt,
} from './StyleDirectionPicker';
import { AutoFitText, getAutoScaledFontSize } from './AutoFitText';
export { getAutoScaledFontSize };
export { exportAndSaveImage } from '../utils/downloadHelpers';
import { removeBackgroundWithCanvas, applyChromakey, applyCumulativeChromakey, RemovedColorItem } from '../utils/backgroundRemover';
import { dataUrlToBlob } from '../utils/downloadHelpers';
import { synthesizeAiAtmosphere } from '../utils/aiAtmosphereSynthesizer';
import { generateLocalFallbackBackground } from '../utils/localDecorFallback';
import { removeBackground } from '../services/autoCutout';
import { showToast } from '../utils/toastEmitter';
import {
  generateTryOnImage,
  adjustTryOnImage,
  generateBackground,
  generateSubjectVariation,
  callGeminiImageApi,
  invokeGeminiCloudFunction,
  getAspectRatioForFormat,
  generateMarketingPackAi,
} from '../services/geminiService';
import { DtfScanLoading } from './DtfScanLoading';
import { AiAdjustmentModal } from './AiAdjustmentModal';
import { db, auth, googleProvider } from '../firebaseConfig';
import { signInWithPopup, browserPopupRedirectResolver } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { prepareEventDataForSync } from '../utils/imageCompressor';
import {
  hasBase64Images,
  safeSaveProjectToLocalStorage,
  sanitizeProjectForLocalStorage,
  cleanProjectForSerialization,
  buildFirestoreProjectDoc,
  loadLatestProject,
  loadLatestProjectSync,
  guardFirestorePayloadSize,
  pruneHeavyPayloadForFirestore,
  isFirestoreDocumentSizeError,
  purgeAllBase64FromObject,
  syncHubToFirestore,
  safeFirestoreSetDoc,
} from '../utils/storageSanitizer';
import { saveProjectToIndexedDB } from '../utils/indexedDbStorage';
import { AuthGateModal } from './AuthGateModal';
import { AuthModal } from './AuthModal';
import { ActivationPackCheckoutModal } from './ActivationPackCheckoutModal';
import { FlyerPosterRenderer } from './FlyerPosterRenderer';
import {
  LayoutTemplateId,
  DualityCampaignSlots,
  HeadlinerEventSlots,
  MinimalBrandSlots,
  resolveLayoutTemplateId,
  resolveDualityCampaignSlots,
  resolveHeadlinerEventSlots,
  resolveMinimalBrandSlots,
  mapFieldToTextOffsetKey,
} from '../types';
import {
  useAutoLuminance,
  resolveSemanticRoles,
  ACCENT_COLOR_ORANGE,
  COLOR_PURE_WHITE,
  COLOR_DEEP_BLACK,
  CompositionTemplate,
} from '../utils/compositionLayout';

import {
  LayoutTemplate,
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
  ChevronDown,
  ChevronUp,
  Sun,
  ImagePlus,
  Sliders,
  ExternalLink,
  Trash2,
  Check,
  Maximize2,
  Shirt,
  Eye,
  User,
  Copy,
  MessageCircle,
  Hash,
  Send,
  FileText,
  X,
  ArrowRight,
  AlignCenter,
  AlignLeft,
  AlignRight,
  Contrast,
  ArrowUpDown,
  Pin,
  Pipette,
  Plus,
  ArrowUp,
  ArrowDown,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  ArrowLeftRight,
  Zap,
  PenTool,
} from 'lucide-react';

const Instagram = (props: any) => (
  <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

export type ActiveSection = 'decor' | 'subject' | 'subject2' | 'logo' | 'theme' | 'texts' | 'textSizes' | 'marketing' | null;

// Ordre logique : Visuels 2D (Post -> Story -> Bannière -> Flyers) puis Produit Physique (Merch Vêtement)
const FORMAT_CYCLE: Array<'post' | 'story' | 'banner' | 'a3'> = ['post', 'story', 'banner', 'a3'];


/**
 * Classes Tailwind d'aspect-ratio strictes par format (Post 1:1, Story 9:16, Bannière 16:9, A3 / Flyer 4:5)
 */
export const getFormatAspectClass = (format: string): string => {
  switch (format) {
    case 'story':
      return 'aspect-[9/16]';
    case 'banner':
      return 'aspect-[16/9]';
    case 'a3':
      return 'aspect-[4/5]';
    case 'post':
    default:
      return 'aspect-square';
  }
};

interface StudioComposerProps {
  input: EventInput;
  setInput: React.Dispatch<React.SetStateAction<EventInput>>;
  previewFormat: 'post' | 'a3' | 'story' | 'banner' | 'tshirt';
  isExporting?: boolean;
  onSelectFormat?: (format: 'post' | 'a3' | 'story' | 'banner' | 'tshirt') => void;
  onUpdateTransform: (newScale: number, newOffsetY: number) => void;
  onResetFormatToMaster: () => void;
  isUnlocked: boolean;
  onTriggerPayment: () => void;
  isDayMode?: boolean;
  focusedTarget?: FocusedTarget;
  setFocusedTarget?: (target: FocusedTarget) => void;
  onFinishWizard?: () => void;
  onDeployPortal?: (projectId?: string) => void;
  isMobileFinalView?: boolean;
  currentWizardStep?: number;
  onWizardStepChange?: (step: number) => void;
  onOpenFullPreview?: () => void;
  onTriggerDtfPress?: () => void;
  isMobilePreviewOpen?: boolean;
  setIsMobilePreviewOpen?: (open: boolean) => void;
  activeView?: 'face' | 'dos';
  onActiveViewChange?: (view: 'face' | 'dos') => void;
  tshirtView?: 'ghost' | 'model';
  onTshirtViewChange?: (view: 'ghost' | 'model') => void;
  isGeneratingTryOn?: boolean;
  onTriggerVton?: (view?: 'face' | 'dos') => Promise<void> | void;
  onSaveStatusChange?: (status: 'idle' | 'saving' | 'saved') => void;
  onActiveSectionChange?: (section: ActiveSection) => void;
}

const createDemoDjPhoto = (): string => '';

const createDemoLogo = (): string => '';

export const isDemoLogo = (url?: string | null): boolean => {
  if (!url) return true;
  return url.includes('logo-demo') || url.includes('21nine') || url.includes('signaid-logo');
};

type MarketingTone = 'official' | 'teaser' | 'urgent' | 'story';
type MarketingTab = 'post' | 'hashtags' | 'dm' | 'all';

interface MarketingPackData {
  caption: string;
  hashtags: string[];
  dmInvitation: string;
  punchlines?: string[];
  ticketPitch?: string;
}

const MARKETING_TONE_OPTIONS: { key: MarketingTone; label: string; icon: string; subtitle: string }[] = [
  { key: 'official', label: 'Annonce Officielle', icon: '📢', subtitle: 'Lancement direct & crédibilité' },
  { key: 'teaser', label: 'Teaser Hype', icon: '⏳', subtitle: 'Compte à rebours & exclusivité' },
  { key: 'urgent', label: 'Derniers Billets', icon: '⚡', subtitle: 'FOMO, billetterie & rush final' },
  { key: 'story', label: 'Storytelling', icon: '✨', subtitle: 'Immersion & univers artistique' },
];

function generateDeterministicMarketingPack(input: EventInput, tone: MarketingTone): MarketingPackData {
  const event = input.eventName?.trim() || 'ÉVÉNEMENT';
  const artist = input.djName?.trim() || 'INTERVENANT';
  const genre = input.headerTagline?.trim() || '';
  const punch = input.punchline?.trim() || 'Un rendez-vous d\'exception à ne pas manquer.';
  const venue = input.venue?.trim() || 'Lieu officiel';
  const date = input.date?.trim() || 'Prochainement';
  const timeSlot = input.timeSlot?.trim() ? ` (${input.timeSlot.trim()})` : '';

  const venueParts = venue.split(/[/|@-]/).map((s) => s.trim()).filter(Boolean);
  const city = venueParts.length > 1 ? venueParts[venueParts.length - 1] : '';

  const clean = (str: string) => str.replace(/[^a-zA-Z0-9]/g, '');

  const smartLink =
    input.artistUrl?.trim() ||
    `https://signaid.eu/hub/${event.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'event'}`;

  let caption = '';
  let dmInvitation = '';
  let punchlines: string[] = [
    `${artist} au cœur de l'événement.`,
    `Une expérience unique et immersive.`,
    `Le rendez-vous incontournable à bloquer dans votre agenda.`,
  ];
  let ticketPitch = `Préventes prioritaires & Stand Merch Officiel sur le SmartLink de la soirée : ${smartLink}`;

  switch (tone) {
    case 'teaser':
      caption =
        `⏳ COMPTE À REBOURS LANCÉ // ${event} ⏳\n\n` +
        `Un projet exclusif se prépare avec ${artist}.\n` +
        `« ${punch} »\n\n` +
        `🗓️ ${date}${timeSlot}\n` +
        `📍 ${venue}\n\n` +
        `🔒 Préventes billetterie & Stand Merch Officiel (0 € stock) sur le SmartLink :\n` +
        `👉 ${smartLink}\n\n` +
        `#${clean(artist)} #${clean(event)}${genre ? ` #${clean(genre)}` : ''} #Teaser #Evenement #Exclusif #DropMerch`;
      dmInvitation =
        `Bonjour ! Petit avant-goût exclusif : *${artist}* sera présent pour *${event}* (${date}${timeSlot} @ ${venue}).\n\n` +
        `« ${punch} »\n\n` +
        `Toutes les informations, préventes et stand merch officiel sont disponibles ici : ${smartLink} ✨\n\n` +
        `N'hésitez pas si vous souhaitez réserver vos places et vos pièces merch en avance !`;
      punchlines = [
        `Le compte à rebours est lancé.`,
        `Une expérience exclusive arrive.`,
        `Soyez les premiers informés.`,
      ];
      break;

    case 'urgent':
      caption =
        `⚡ DERNIÈRES PLACES & MERCH // ${event} ⚡\n\n` +
        `Les réservations s'accélèrent pour la venue de ${artist} !\n` +
        `« ${punch} »\n\n` +
        `🗓️ Date : ${date}${timeSlot}\n` +
        `📍 Lieu : ${venue}\n\n` +
        `🚨 Billetterie & Stand Merch Officiel en direct. Réservez dès maintenant :\n` +
        `👉 ${smartLink}\n\n` +
        `#${clean(artist)} #${clean(event)}${genre ? ` #${clean(genre)}` : ''} #DernieresPlaces #Evenement #DropMerch #Agenda`;
      dmInvitation =
        `Alerte dernière minute ! ⚠️ Les réservations pour *${event}* avec *${artist}* ce ${date} à ${venue} touchent à leur fin.\n\n` +
        `Accès direct billetterie et pièces merch restantes sur le SmartLink : ${smartLink}\n\n` +
        `Réservez avant clôture ! 🚀`;
      ticketPitch = `Dernières places disponibles & stand merch officiel sur le SmartLink : ${smartLink}`;
      break;

    case 'story':
      caption =
        `✨ DÉCOUVREZ L'UNIVERS // ${event} ✨\n\n` +
        `Quand ${artist} prend la parole, chaque instant compte.\n` +
        `« ${punch} »\n\n` +
        `Une rencontre pensée pour marquer les esprits et inspirer.\n` +
        `🗓️ ${date}${timeSlot}\n` +
        `📍 ${venue}\n\n` +
        `Découvrez le line-up complet, préventes et drop merch officiel sur le SmartLink :\n` +
        `👉 ${smartLink}\n\n` +
        `#${clean(artist)} #${clean(event)}${genre ? ` #${clean(genre)}` : ''} #Storytelling #Immersion #Inspiration #DropMerch`;
      dmInvitation =
        `Bonjour ! Si vous souhaitez vivre une expérience enrichissante le ${date}, *${artist}* prépare un temps fort pour *${event}* à ${venue}.\n\n` +
        `« ${punch} »\n\n` +
        `Découvrez l'univers du projet, préventes et drop merch exclusif ici : ${smartLink} ✨`;
      break;

    case 'official':
    default:
      caption =
        `📢 ANNONCE OFFICIELLE // ${event} 📢\n\n` +
        `Intervenant / Artiste : ${artist}\n` +
        (genre ? `Thématique : ${genre}\n\n` : '\n') +
        `« ${punch} »\n\n` +
        `🗓️ Date : ${date}${timeSlot}\n` +
        `📍 Lieu : ${venue}\n\n` +
        `🎟️ Billetterie officielle, line-up & stand merch exclusif :\n` +
        `👉 ${smartLink}\n\n` +
        `#${clean(artist)} #${clean(event)}${genre ? ` #${clean(genre)}` : ''} #Evenement #Officiel #DropMerch #Signaid`;
      dmInvitation =
        `Bonjour à tous ! ⚡\n\n` +
        `Nous vous donnons rendez-vous pour *${event}* avec *${artist}* le ${date} à ${venue}.\n\n` +
        `« ${punch} »\n\n` +
        `Toutes les informations pratiques, accès GPS et réservations sont centralisés ici : ${smartLink}\n\n` +
        `Au plaisir de vous y retrouver ! 🙌`;
      break;
  }

  const tagsList = [
    clean(artist) ? `#${clean(artist)}` : '',
    clean(event) ? `#${clean(event)}` : '',
    clean(genre) ? `#${clean(genre)}` : '',
    city ? `#${clean(city)}` : '',
    '#Evenement',
    '#Agenda',
    '#Officiel',
    '#Dropper',
  ].filter((t) => t.length > 1);
  const uniqueHashtags = Array.from(new Set(tagsList));

  return {
    caption,
    hashtags: uniqueHashtags,
    dmInvitation,
    punchlines,
    ticketPitch,
  };
}

export const StudioComposer: React.FC<StudioComposerProps> = ({
  input,
  setInput,
  isExporting = false,
  previewFormat,
  onSelectFormat,
  onUpdateTransform,
  onResetFormatToMaster,
  isUnlocked,
  onTriggerPayment,
  isDayMode = false,
  focusedTarget,
  setFocusedTarget,
  onFinishWizard,
  onDeployPortal,
  isMobileFinalView,
  currentWizardStep,
  onWizardStepChange,
  onOpenFullPreview,
  onTriggerDtfPress,
  isMobilePreviewOpen: propIsMobilePreviewOpen,
  setIsMobilePreviewOpen: propSetIsMobilePreviewOpen,
  activeView: propActiveView,
  onActiveViewChange: propOnActiveViewChange,
  tshirtView: propTshirtView,
  onTshirtViewChange: propOnTshirtViewChange,
  isGeneratingTryOn: propIsGeneratingTryOn,
  onTriggerVton: propOnTriggerVton,
  onSaveStatusChange,
  onActiveSectionChange,
}) => {
  const { user: authContextUser, entitlements } = useAuth();

  // --- VERROUILLAGE & TUNNEL D'ACQUISITION AU DÉPLOIEMENT FINAL ---
  const effectiveAuthEmail = (
    auth.currentUser?.email ||
    authContextUser?.email ||
    entitlements.email ||
    ''
  ).trim();
  const currentUser =
    effectiveAuthEmail && effectiveAuthEmail !== 'invite@client.fr'
      ? auth.currentUser || authContextUser || ({ uid: `local_${effectiveAuthEmail}`, email: effectiveAuthEmail } as any)
      : null;

  const [showAuthGateModal, setShowAuthGateModal] = useState<boolean>(false);
  const [showEmailAuthModal, setShowEmailAuthModal] = useState<boolean>(false);
  const [isDeployingGate, setIsDeployingGate] = useState<boolean>(false);
  const [showActivationPackModal, setShowActivationPackModal] = useState<boolean>(false);
  const [deployedProjectId, setDeployedProjectId] = useState<string>('');
  const [deployedEventSlug, setDeployedEventSlug] = useState<string>('portail-interactif-signaid');

  useEffect(() => {
    const handleCustomOpen = (e: any) => {
      if (e.detail?.projectId) setDeployedProjectId(e.detail.projectId);
      if (e.detail?.eventSlug) setDeployedEventSlug(e.detail.eventSlug);
      setShowActivationPackModal(true);
    };
    window.addEventListener('signaid:show_activation_pack', handleCustomOpen);
    return () => window.removeEventListener('signaid:show_activation_pack', handleCustomOpen);
  }, []);

  const buildNormalizedSyncPayload = (sourceInput: EventInput, finalSlug: string): EventInput => {
    const resolvedSubjectScale =
      sourceInput.formatTransforms?.post?.scale ??
      (typeof sourceInput.djPhotoScale === 'number'
        ? sourceInput.djPhotoScale
        : typeof sourceInput.subjectScale === 'number'
          ? sourceInput.subjectScale
          : 1.0);
    const resolvedSubjectOffsetY =
      sourceInput.formatTransforms?.post?.offsetY ??
      (typeof sourceInput.djPhotoOffsetY === 'number'
        ? sourceInput.djPhotoOffsetY
        : typeof sourceInput.subjectPositionY === 'number'
          ? sourceInput.subjectPositionY
          : 0);
    const defaults = getDefaultFormatTransforms(resolvedSubjectScale, resolvedSubjectOffsetY);
    const currentMap = sourceInput.formatTransforms || {};
    const isLegacyDemoA3 =
      currentMap.a3 &&
      currentMap.a3.scale === 1 &&
      currentMap.a3.offsetY === -18;

    const resolvedLogoX = typeof sourceInput.logoPositionX === 'number' ? sourceInput.logoPositionX : 85.2;
    const resolvedLogoY = typeof sourceInput.logoPositionY === 'number' ? sourceInput.logoPositionY : 11.9;
    const resolvedLogoScale = typeof sourceInput.logoScale === 'number' ? sourceInput.logoScale : 0.8;
    const currentLogoMap = sourceInput.logoFormatTransforms || {};
    const isLegacyLogoDemoA3 =
      currentLogoMap.a3 &&
      Math.abs((currentLogoMap.a3.x ?? 0) - 64.9) < 0.5 &&
      Math.abs((currentLogoMap.a3.y ?? 0) - 62.5) < 0.5;

    // Protection stricte du format Flyers (A3) : ne jamais écraser par les réglages d'autres formats (Post ou Story)
    const preservedA3Transform = (currentMap.a3 && currentMap.a3.isCustom && !isLegacyDemoA3)
      ? currentMap.a3
      : (previewFormat === 'a3'
        ? {
          scale: typeof sourceInput.djPhotoScale === 'number' ? sourceInput.djPhotoScale : (typeof sourceInput.subjectScale === 'number' ? sourceInput.subjectScale : defaults.a3.scale),
          offsetY: typeof sourceInput.djPhotoOffsetY === 'number' ? sourceInput.djPhotoOffsetY : (typeof sourceInput.subjectPositionY === 'number' ? sourceInput.subjectPositionY : defaults.a3.offsetY),
          offsetX: typeof sourceInput.djPhotoOffsetX === 'number' ? sourceInput.djPhotoOffsetX : (typeof sourceInput.subjectPositionX === 'number' ? sourceInput.subjectPositionX : (currentMap.a3?.offsetX ?? 0)),
          alignX: currentMap.a3?.alignX ?? 'center',
          isCustom: true,
        }
        : (currentMap.a3 || defaults.a3));

    const preservedA3LogoTransform = (currentLogoMap.a3 && currentLogoMap.a3.isCustom && !isLegacyLogoDemoA3)
      ? currentLogoMap.a3
      : (previewFormat === 'a3'
        ? {
          x: resolvedLogoX,
          y: resolvedLogoY,
          scale: resolvedLogoScale,
          isCustom: true,
        }
        : (currentLogoMap.a3 || { x: resolvedLogoX, y: resolvedLogoY, scale: resolvedLogoScale, isCustom: false }));

    const resolvedBg = (sourceInput.customBackground || sourceInput.backgroundImage || sourceInput.bgImage || '').trim();
    const resolvedPosterTexts = ensurePosterTexts(sourceInput);

    return {
      ...sourceInput,
      slug: finalSlug,
      backgroundTone: typeof sourceInput.backgroundTone === 'number' ? sourceInput.backgroundTone : 0.5,
      isBackgroundToneEnabled: sourceInput.isBackgroundToneEnabled !== false,
      backgroundOpacity: typeof sourceInput.backgroundOpacity === 'number' ? sourceInput.backgroundOpacity : 1,
      backgroundBrightness: typeof sourceInput.backgroundBrightness === 'number' ? sourceInput.backgroundBrightness : 1.0,
      subjectFadeIntensity: typeof sourceInput.subjectFadeIntensity === 'number' ? sourceInput.subjectFadeIntensity : 35,
      isSubjectHarmonized: sourceInput.isSubjectHarmonized ?? false,
      isSubjectMerged: sourceInput.isSubjectMerged ?? false,
      backupBeforeMerge: sourceInput.backupBeforeMerge,
      subjectBrightness: typeof sourceInput.subjectBrightness === 'number' ? sourceInput.subjectBrightness : 1.0,
      subjectContrast: typeof sourceInput.subjectContrast === 'number' ? sourceInput.subjectContrast : 1.0,
      subjectSaturation: typeof sourceInput.subjectSaturation === 'number' ? sourceInput.subjectSaturation : 1.0,
      subjectHueRotate: typeof sourceInput.subjectHueRotate === 'number' ? sourceInput.subjectHueRotate : 0,
      subjectShadowOffsetX: typeof sourceInput.subjectShadowOffsetX === 'number' ? sourceInput.subjectShadowOffsetX : 0,
      subjectShadowOffsetY: typeof sourceInput.subjectShadowOffsetY === 'number' ? sourceInput.subjectShadowOffsetY : 20,
      subjectShadowBlur: typeof sourceInput.subjectShadowBlur === 'number' ? sourceInput.subjectShadowBlur : 30,
      subjectShadowColor: sourceInput.subjectShadowColor || 'rgba(0,0,0,0.65)',
      subjectShadowOpacity: typeof sourceInput.subjectShadowOpacity === 'number' ? sourceInput.subjectShadowOpacity : 0.65,
      subjectBlendMode: sourceInput.subjectBlendMode || 'normal',
      subjectLightingSummary: sourceInput.subjectLightingSummary || '',
      subjectScale: resolvedSubjectScale,
      djPhotoScale: resolvedSubjectScale,
      subjectPositionX: typeof sourceInput.subjectPositionX === 'number' ? sourceInput.subjectPositionX : 0,
      subjectPositionY: resolvedSubjectOffsetY,
      djPhotoOffsetY: resolvedSubjectOffsetY,
      logoScale: resolvedLogoScale,
      logoPositionX: resolvedLogoX,
      logoPositionY: resolvedLogoY,
      logoOffsetY: resolvedLogoY,
      logoOpacity: typeof sourceInput.logoOpacity === 'number' ? sourceInput.logoOpacity : 1,
      logoRotation: typeof sourceInput.logoRotation === 'number' ? sourceInput.logoRotation : 0,
      logoColorMode: sourceInput.logoColorMode || 'auto',
      headerTagline: sourceInput.headerTagline ?? '',
      eventName: sourceInput.eventName ?? '',
      punchline: sourceInput.punchline ?? '',
      headlineBadgeText: sourceInput.headlineBadgeText ?? '',
      djName: sourceInput.djName ?? '',
      date: sourceInput.date ?? '',
      time: sourceInput.time ?? sourceInput.timeSlot ?? '',
      timeSlot: sourceInput.timeSlot ?? sourceInput.time ?? '',
      venue: sourceInput.venue ?? sourceInput.location ?? '',
      location: sourceInput.location ?? sourceInput.venue ?? '',
      venueMapsUrl: sourceInput.venueMapsUrl ?? '',
      artistUrl: sourceInput.artistUrl ?? '',
      artistSocialUrl: sourceInput.artistSocialUrl ?? sourceInput.artistUrl ?? '',
      typographyStyle: sourceInput.typographyStyle || 'futur',
      accentColor: sourceInput.accentColor || sourceInput.dynamicTheme?.primaryAccent || '#FF6B00',
      posterTexts: resolvedPosterTexts,
      textScales: {
        headerTagline: sourceInput.textScales?.headerTagline ?? 1.0,
        eventName: sourceInput.textScales?.eventName ?? 1.0,
        punchline: sourceInput.textScales?.punchline ?? 1.0,
        headlineBadge: sourceInput.textScales?.headlineBadge ?? 1.0,
        djName: sourceInput.textScales?.djName ?? 1.0,
        infoBadge: sourceInput.textScales?.infoBadge ?? 1.0,
      },
      formatTextScales: sourceInput.formatTextScales || {},
      formatTransforms: {
        ...defaults,
        ...currentMap,
        post: {
          scale: resolvedSubjectScale,
          offsetY: resolvedSubjectOffsetY,
          alignX: currentMap.post?.alignX ?? 'center',
          isCustom: currentMap.post?.isCustom ?? true,
        },
        a3: preservedA3Transform,
      },
      logoFormatTransforms: {
        ...currentLogoMap,
        post: {
          x: resolvedLogoX,
          y: resolvedLogoY,
          scale: resolvedLogoScale,
          isCustom: currentLogoMap.post?.isCustom ?? true,
        },
        a3: preservedA3LogoTransform,
      },
      flyerConfig: {
        backgroundImage: resolvedBg,
        subject: {
          image: sourceInput.djPhoto || null,
          scale: preservedA3Transform.scale,
          x: preservedA3Transform.offsetX ?? 0,
          y: preservedA3Transform.offsetY,
          alignX: preservedA3Transform.alignX ?? 'center',
          bottomFade: sourceInput.isSubjectGradientFade !== false && typeof sourceInput.subjectFadeIntensity === 'number'
            ? sourceInput.subjectFadeIntensity
            : 0,
          opacity: typeof sourceInput.djPhotoOpacity === 'number' ? sourceInput.djPhotoOpacity : 1,
          contrast: typeof sourceInput.subjectContrast === 'number' ? sourceInput.subjectContrast : 1.0,
          saturation: typeof sourceInput.subjectSaturation === 'number' ? sourceInput.subjectSaturation : 1.0,
          brightness: typeof sourceInput.subjectBrightness === 'number' ? sourceInput.subjectBrightness : 1.0,
          hueRotate: typeof sourceInput.subjectHueRotate === 'number' ? sourceInput.subjectHueRotate : 0,
          isHarmonized: sourceInput.isSubjectHarmonized ?? false,
          blendMode: 'normal',
        },
        logo: {
          image: sourceInput.logoUrl || sourceInput.logoImage || null,
          scale: preservedA3LogoTransform.scale,
          x: preservedA3LogoTransform.x,
          y: preservedA3LogoTransform.y,
          opacity: typeof sourceInput.logoOpacity === 'number' ? sourceInput.logoOpacity : 1,
          rotation: typeof sourceInput.logoRotation === 'number' ? sourceInput.logoRotation : 0,
          colorMode: sourceInput.logoColorMode || 'auto',
        },
        posterTexts: resolvedPosterTexts,
        cartouche: {
          date: sourceInput.date ?? '',
          time: sourceInput.time ?? sourceInput.timeSlot ?? '',
          venue: sourceInput.venue ?? sourceInput.location ?? '',
          calendarUrl: sourceInput.calendarUrl ?? '',
          venueMapsUrl: sourceInput.venueMapsUrl ?? '',
          scale: typeof sourceInput.cartoucheScale === 'number' ? sourceInput.cartoucheScale : 1.0,
          padding: typeof sourceInput.cartouchePadding === 'number' ? sourceInput.cartouchePadding : 1.0,
        },
        typographyStyle: sourceInput.typographyStyle || 'futur',
        accentColor: sourceInput.accentColor || sourceInput.dynamicTheme?.primaryAccent || '#FF6B00',
        backgroundTone: typeof sourceInput.backgroundTone === 'number' ? sourceInput.backgroundTone : 0.5,
        isBackgroundToneEnabled: sourceInput.isBackgroundToneEnabled !== false,
        backgroundOpacity: typeof sourceInput.backgroundOpacity === 'number' ? sourceInput.backgroundOpacity : 1,
        backgroundBrightness: typeof sourceInput.backgroundBrightness === 'number' ? sourceInput.backgroundBrightness : 1.0,
      },
    };
  };

  const executePortalDeployment = async (deployedProjectIdParam?: string) => {
    try {
      const pendingJson = localStorage.getItem('signaid_pending_deploy_project');
      const projectToDeploy: EventInput = pendingJson ? { ...JSON.parse(pendingJson), ...input } : input; // input mémoire prioritaire (images HD non stockées en localStorage)
      const finalSlug = resolveUnifiedEventSlug(projectToDeploy);
      const finalProjectId = deployedProjectIdParam || (projectToDeploy as any).id || (projectToDeploy as any).projectId || finalSlug;

      setDeployedProjectId(finalProjectId);
      setDeployedEventSlug(finalSlug);

      const normalizedInput = buildNormalizedSyncPayload(projectToDeploy, finalSlug);
      const enrichedProject: any = {
        ...normalizedInput,
        id: finalProjectId,
        projectId: finalProjectId,
        slug: finalSlug,
        isDeployed: true,
        status: 'En ligne',
      };

      // Mettre à jour l'état local dans StudioComposer
      setInput(enrichedProject);

      // 2. Sauvegarde dans localStorage pour persistance totale
      const localKeys = [
        'signaid_studio_current_project',
        'droppaid_last_event_input',
        `signaid_studio_draft_${finalSlug}`,
        `droppaid_hub_event_${finalSlug}`,
      ];
      if (finalSlug === 'signaid') {
        localKeys.push('droppaid_hub_event_portail-interactif-signaid', 'signaid_studio_draft_portail-interactif-signaid');
      }
      safeSaveProjectToLocalStorage(localKeys, enrichedProject);

      // 3. Mise à jour de la liste locale "Mes Projets"
      try {
        const rawProjects = localStorage.getItem('droppaid_admin_projects_v1');
        const existingList: any[] = rawProjects ? JSON.parse(rawProjects) : [];
        const formattedDate = new Date().toLocaleString('fr-FR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
        const projectItem = {
          id: finalProjectId,
          name: projectToDeploy.eventName || 'Mon Événement',
          updatedAt: formattedDate,
          status: 'En ligne',
          isDeployed: true,
          input: JSON.parse(sanitizeProjectForLocalStorage(enrichedProject)),
        };
        const updatedList = [projectItem, ...existingList.filter((p: any) => p.id !== finalProjectId)];
        localStorage.setItem('droppaid_admin_projects_v1', JSON.stringify(updatedList));
      } catch (_) { }

      // 4. Synchronisation de la session locale et dispatch des événements
      notifyHubProjectUpdated();

      // 5. Fermer les modales intermédiaires et OUVRIR L'ÉCRAN D'OFFRE FINALE immédiatement
      setShowAuthGateModal(false);
      setShowEmailAuthModal(false);
      setShowActivationPackModal(true);

      // Déclenchement du callback parent si défini
      if (onDeployPortal) {
        onDeployPortal(finalProjectId);
      }

      // 6. Synchronisation Firestore bloquante et sécurisée : ATTENDRE la confirmation d'écriture Firestore AVANT ouverture
      try {
        const compressedPayload = await prepareEventDataForSync(enrichedProject);
        const sanitizedPayload = await pruneHeavyPayloadForFirestore(compressedPayload);
        const firestorePayload = JSON.parse(JSON.stringify({
          ...sanitizedPayload,
          slug: finalSlug,
          isDeployed: true,
          status: 'En ligne',
        }));
        delete firestorePayload.rawDjPhoto;
        delete firestorePayload.rawTshirtLogoOriginal;
        delete firestorePayload.rawLogoImage;
        firestorePayload.input = { ...firestorePayload };

        const guardedPayload = guardFirestorePayloadSize(firestorePayload);

        await Promise.all([
          setDoc(doc(db, 'portals', finalSlug), {
            ...guardedPayload,
            updatedAt: serverTimestamp(),
          }, { merge: true }),
          setDoc(doc(db, 'projects', finalSlug), {
            ...guardedPayload,
            updatedAt: serverTimestamp(),
          }, { merge: true }),
          setDoc(doc(db, 'events', finalSlug), {
            ...guardedPayload,
            deployedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }, { merge: true }),
          ...(finalProjectId !== finalSlug ? [
            setDoc(doc(db, 'portals', finalProjectId), {
              ...guardedPayload,
              updatedAt: serverTimestamp(),
            }, { merge: true }),
            setDoc(doc(db, 'projects', finalProjectId), {
              ...guardedPayload,
              updatedAt: serverTimestamp(),
            }, { merge: true }),
          ] : []),
          ...(finalSlug === 'signaid' ? [
            setDoc(doc(db, 'portals', 'portail-interactif-signaid'), {
              ...guardedPayload,
              updatedAt: serverTimestamp(),
            }, { merge: true }),
            setDoc(doc(db, 'projects', 'portail-interactif-signaid'), {
              ...guardedPayload,
              updatedAt: serverTimestamp(),
            }, { merge: true }),
            setDoc(doc(db, 'events', 'portail-interactif-signaid'), {
              ...guardedPayload,
              deployedAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            }, { merge: true }),
          ] : []),
        ]);
      } catch (err: any) {
        if (isFirestoreDocumentSizeError(err)) {
          console.error('[PortalDeploy] Dépassement de quota Firestore 1 Mo détecté pour le slug:', finalSlug, err);
          showToast(
            "L'image intégrée est trop lourde pour être synchronisée en base, veuillez utiliser une image plus légère",
            'warning',
            6000
          );
          try {
            const textOnly = purgeAllBase64FromObject(enrichedProject);
            await Promise.all([
              setDoc(doc(db, 'portals', finalSlug), { ...textOnly, updatedAt: serverTimestamp() }, { merge: true }),
              setDoc(doc(db, 'projects', finalSlug), { ...textOnly, updatedAt: serverTimestamp() }, { merge: true }),
              setDoc(doc(db, 'events', finalSlug), { ...textOnly, deployedAt: serverTimestamp(), updatedAt: serverTimestamp() }, { merge: true }),
            ]);
          } catch (fallbackErr) {
            console.error('[PortalDeploy] Échec critique Firestore fallback pour le slug:', finalSlug, fallbackErr);
            showToast("Échec critique du déploiement. Impossible d'enregistrer le projet.", 'error');
            return;
          }
        } else {
          console.error('[PortalDeploy] Échec critique écriture Firestore pour le slug:', finalSlug, err);
          showToast("Erreur lors de la synchronisation Firestore.", 'error');
          return;
        }
      }

      // 7. Ouvrir le portail généré dans un nouvel onglet UNIQUEMENT après la confirmation Firestore
      const publicHubUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/hub/${finalSlug}`
        : `https://signaid.eu/hub/${finalSlug}`;
      if (typeof window !== 'undefined') {
        window.open(publicHubUrl, '_blank');
      }
      showToast('⚡ Événement & Stand Merch mis en ligne avec succès ! Ouverture du SmartLink...', 'success');
    } catch (err) {
      console.error('[PortalDeploy] Erreur lors de l’exécution du déploiement :', err);
    }
  };

  /**
   * Fonction unifiée de sauvegarde et synchronisation immédiate vers Firestore.
   * Compresse le décor et le sujet, écrit dans Firestore, attend confirmation (status: 'success').
   */
  const saveOrDeployPortal = async (customProject?: EventInput): Promise<{ status: 'success' | 'error'; slug: string }> => {
    try {
      const targetInput = customProject || inputRef.current || input;
      const finalSlug = resolveUnifiedEventSlug(targetInput);
      const finalProjectId = (targetInput as any).id || (targetInput as any).projectId || finalSlug;

      const normalizedInput = buildNormalizedSyncPayload(targetInput, finalSlug);
      const enrichedProject: any = {
        ...normalizedInput,
        id: finalProjectId,
        projectId: finalProjectId,
        slug: finalSlug,
        isDeployed: true,
        status: 'En ligne',
        updatedAt: new Date().toISOString(),
      };

      // 1. Sauvegarde locale immédiate
      const localKeys = [
        'signaid_studio_current_project',
        'droppaid_last_event_input',
        `signaid_studio_draft_${finalSlug}`,
        `droppaid_hub_event_${finalSlug}`,
      ];
      if (finalSlug === 'signaid') {
        localKeys.push('droppaid_hub_event_portail-interactif-signaid', 'signaid_studio_draft_portail-interactif-signaid');
      }
      safeSaveProjectToLocalStorage(localKeys, enrichedProject);
      notifyHubProjectUpdated();

      // 2. Préparation & allègement WebP des images pour Firestore (< 900 Ko)
      const compressedPayload = await prepareEventDataForSync(enrichedProject);
      const sanitizedPayload = await pruneHeavyPayloadForFirestore(compressedPayload);
      const cleanCompressed = cleanProjectForSerialization(sanitizedPayload);
      delete cleanCompressed.rawDjPhoto;
      delete cleanCompressed.rawTshirtLogoOriginal;
      delete cleanCompressed.rawLogoImage;
      delete (cleanCompressed as any).input;

      const payloadToSync = buildFirestoreProjectDoc(cleanCompressed, {
        slug: finalSlug,
        updatedAt: new Date().toISOString(),
        isDeployed: true,
      });

      const guardedPayload = guardFirestorePayloadSize(payloadToSync);

      // 3. Écriture Firestore avec ATTENTE RÉELLE (collection unifiée 'portals' + projets/events)
      await Promise.all([
        setDoc(doc(db, 'portals', finalSlug), guardedPayload, { merge: true }),
        setDoc(doc(db, 'projects', finalSlug), guardedPayload, { merge: true }),
        setDoc(doc(db, 'events', finalSlug), guardedPayload, { merge: true }),
        ...(finalProjectId !== finalSlug ? [
          setDoc(doc(db, 'portals', finalProjectId), guardedPayload, { merge: true }),
          setDoc(doc(db, 'projects', finalProjectId), guardedPayload, { merge: true }),
        ] : []),
        ...(finalSlug === 'signaid' ? [
          setDoc(doc(db, 'portals', 'portail-interactif-signaid'), guardedPayload, { merge: true }),
          setDoc(doc(db, 'projects', 'portail-interactif-signaid'), guardedPayload, { merge: true }),
          setDoc(doc(db, 'events', 'portail-interactif-signaid'), guardedPayload, { merge: true }),
        ] : []),
      ]);

      notifyHubProjectUpdated();
      return { status: 'success', slug: finalSlug };
    } catch (err) {
      console.error('[saveOrDeployPortal] Erreur écriture Firestore:', err);
      return { status: 'error', slug: resolveUnifiedEventSlug(customProject || inputRef.current || input) };
    }
  };

  const [isOpeningHub, setIsOpeningHub] = useState<boolean>(false);

  const handleOpenHubWithSync = async () => {
    setIsOpeningHub(true);
    try {
      const res = await saveOrDeployPortal();
      const currentSlug = res.slug || resolveUnifiedEventSlug(input);
      const hubUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/hub/${currentSlug}`
        : `https://signaid.eu/hub/${currentSlug}`;
      if (typeof window !== 'undefined') {
        window.open(hubUrl, '_blank');
      }
      showToast('⚡ Hub synchronisé et ouvert en direct !', 'success');
    } catch (err) {
      console.error('[OpenHub] Erreur ouverture synchronisée:', err);
      const fallbackSlug = resolveUnifiedEventSlug(input);
      window.open(`/hub/${fallbackSlug}`, '_blank');
    } finally {
      setIsOpeningHub(false);
    }
  };

  const handleFinalActionClick = async () => {
    // 1. On crée le slug unifié et propre basé sur le nom de l'artiste ou du projet
    const finalSlug = resolveUnifiedEventSlug(input);
    const normalizedInput = buildNormalizedSyncPayload(input, finalSlug);

    const basePayload = {
      ...normalizedInput,
      slug: finalSlug,
      updatedAt: new Date().toISOString(),
      isDeployed: true,
    };

    // 2. Sauvegarder d'abord l'état actuel en localStorage sécurisé
    const localKeys = [
      'signaid_pending_deploy_project',
      'signaid_studio_current_project',
      'droppaid_last_event_input',
      `signaid_studio_draft_${finalSlug}`,
      `droppaid_hub_event_${finalSlug}`,
    ];
    if (finalSlug === 'signaid') {
      localKeys.push('droppaid_hub_event_portail-interactif-signaid', 'signaid_studio_draft_portail-interactif-signaid');
    }
    safeSaveProjectToLocalStorage(localKeys, basePayload);
    notifyHubProjectUpdated();

    try {
      // 3. Compression anti-limite 1 Mo et sauvegarde en direct dans la collection unifiée 'portals' (et projects/events)
      const compressedPayload = await prepareEventDataForSync(basePayload);
      const sanitizedPayload = await pruneHeavyPayloadForFirestore(compressedPayload);
      const cleanCompressed = cleanProjectForSerialization(sanitizedPayload);
      delete cleanCompressed.rawDjPhoto;
      delete cleanCompressed.rawTshirtLogoOriginal;
      delete cleanCompressed.rawLogoImage;
      delete (cleanCompressed as any).input;

      const payloadToSync = buildFirestoreProjectDoc(cleanCompressed, {
        slug: finalSlug,
        updatedAt: new Date().toISOString(),
        isDeployed: true,
      });

      // Re-sauvegarder la version compressée en localStorage et IndexedDB pour persistance totale
      safeSaveProjectToLocalStorage(localKeys, payloadToSync.input || cleanCompressed);

      const guardedPayloadToSync = guardFirestorePayloadSize(payloadToSync);

      await Promise.all([
        setDoc(doc(db, 'portals', finalSlug), guardedPayloadToSync, { merge: true }),
        setDoc(doc(db, 'projects', finalSlug), guardedPayloadToSync, { merge: true }),
        setDoc(doc(db, 'events', finalSlug), guardedPayloadToSync, { merge: true }),
        ...(finalSlug === 'signaid' ? [
          setDoc(doc(db, 'portals', 'portail-interactif-signaid'), guardedPayloadToSync, { merge: true }),
          setDoc(doc(db, 'projects', 'portail-interactif-signaid'), guardedPayloadToSync, { merge: true }),
          setDoc(doc(db, 'events', 'portail-interactif-signaid'), guardedPayloadToSync, { merge: true }),
        ] : []),
      ]);
    } catch (err: any) {
      if (isFirestoreDocumentSizeError(err)) {
        console.warn('[Sync] Dépassement de quota Firestore 1 Mo détecté. Sauvegarde locale active.');
        showToast(
          "L'image intégrée est trop lourde pour être synchronisée en base, veuillez utiliser une image plus légère",
          'warning',
          6000
        );
        safeSaveProjectToLocalStorage(localKeys, basePayload);
      } else {
        console.warn('[Sync] Erreur lors du déploiement Firestore (repli local actif) :', err);
      }
    }

    setDeployedProjectId(finalSlug);
    setDeployedEventSlug(finalSlug);

    // 4. Vérification de l'authentification : si invité anonyme -> AuthGateModal, sinon -> ActivationPackCheckoutModal
    const storedEmail = (() => {
      try {
        return (localStorage.getItem('droppaid_current_user_email') || '').trim();
      } catch {
        return '';
      }
    })();
    const isAuthenticatedUser =
      Boolean(currentUser) || (Boolean(storedEmail) && storedEmail !== 'invite@client.fr');

    if (!isAuthenticatedUser) {
      setShowAuthGateModal(true);
      return;
    }

    await executePortalDeployment(finalSlug);
  };

  const handleGoogleSignInAndDeploy = async () => {
    setIsDeployingGate(true);
    try {
      let user: any = null;
      try {
        const userCredential = await signInWithPopup(auth, googleProvider, browserPopupRedirectResolver);
        user = userCredential.user;
      } catch {
        user = currentUser || { uid: `google_local_${Date.now()}`, email: effectiveAuthEmail || 'artiste.google@signaid.eu' };
      }

      // 1. Récupérer le projet préparé
      const pendingJson = localStorage.getItem('signaid_pending_deploy_project');
      const projectToSave = pendingJson ? { ...JSON.parse(pendingJson), ...input } : input; // input mémoire prioritaire (images HD non stockées en localStorage)

      // 2. Enregistrer directement le projet dans Firestore rattaché à cet utilisateur
      const eventSlug = resolveUnifiedEventSlug(projectToSave);
      const newProjectId = projectToSave.id || eventSlug;

      setDeployedProjectId(newProjectId);
      setDeployedEventSlug(eventSlug);

      // Le portail passe en ligne immédiatement (isDeployed: true).
      setShowAuthGateModal(false);
      setShowEmailAuthModal(false);
      await executePortalDeployment(newProjectId);
      setShowActivationPackModal(true);

      void (async () => {
        try {
          const compressedPayload = await prepareEventDataForSync(projectToSave);
          const sanitizedPayload = await pruneHeavyPayloadForFirestore(compressedPayload);
          const cleanPayload = JSON.parse(JSON.stringify(sanitizedPayload));
          delete cleanPayload.rawDjPhoto;
          delete cleanPayload.rawTshirtLogoOriginal;
          delete cleanPayload.rawLogoImage;

          const docToSet = guardFirestorePayloadSize({
            ...cleanPayload,
            id: newProjectId,
            slug: eventSlug,
            userId: user.uid,
            userEmail: user.email,
            updatedAt: serverTimestamp(),
            createdAt: serverTimestamp(),
            isDeployed: true,
            status: 'En ligne',
          });

          await Promise.all([
            setDoc(doc(db, 'portals', eventSlug), docToSet, { merge: true }),
            setDoc(doc(db, 'projects', eventSlug), docToSet, { merge: true }),
            setDoc(doc(db, 'events', eventSlug), docToSet, { merge: true }),
          ]);
        } catch (err: any) {
          if (isFirestoreDocumentSizeError(err)) {
            showToast(
              "L'image intégrée est trop lourde pour être synchronisée en base, veuillez utiliser une image plus légère",
              'warning',
              6000
            );
          }
        }
      })();
    } catch (err) {
      console.error('[AuthGate] Erreur lors de la création de compte :', err);
    } finally {
      setIsDeployingGate(false);
    }
  };

  const openEmailAuthModal = () => {
    setShowAuthGateModal(false);
    setShowEmailAuthModal(true);
  };

  const handleEmailAuthSuccess = async () => {
    setShowEmailAuthModal(false);
    setIsDeployingGate(true);
    try {
      const storedEmail = (() => {
        try {
          return (localStorage.getItem('droppaid_current_user_email') || '').trim();
        } catch {
          return '';
        }
      })();
      const user: any =
        auth.currentUser ||
        authContextUser ||
        (storedEmail ? { uid: `local_${Date.now()}`, email: storedEmail } : { uid: `local_${Date.now()}`, email: 'artiste@signaid.eu' });

      const pendingJson = localStorage.getItem('signaid_pending_deploy_project');
      const projectToSave = pendingJson ? { ...JSON.parse(pendingJson), ...input } : input;

      const eventSlug = resolveUnifiedEventSlug(projectToSave);
      const newProjectId = projectToSave.id || eventSlug;

      setDeployedProjectId(newProjectId);
      setDeployedEventSlug(eventSlug);

      setShowAuthGateModal(false);
      await executePortalDeployment(newProjectId);
      setShowActivationPackModal(true);

      void (async () => {
        try {
          const compressedPayload = await prepareEventDataForSync(projectToSave);
          const sanitizedPayload = await pruneHeavyPayloadForFirestore(compressedPayload);
          const cleanPayload = JSON.parse(JSON.stringify(sanitizedPayload));
          delete cleanPayload.rawDjPhoto;
          delete cleanPayload.rawTshirtLogoOriginal;
          delete cleanPayload.rawLogoImage;

          const docToSet = guardFirestorePayloadSize({
            ...cleanPayload,
            id: newProjectId,
            slug: eventSlug,
            userId: user.uid,
            userEmail: user.email,
            updatedAt: serverTimestamp(),
            createdAt: serverTimestamp(),
            isDeployed: true,
            status: 'En ligne',
          });

          await Promise.all([
            setDoc(doc(db, 'portals', eventSlug), docToSet, { merge: true }),
            setDoc(doc(db, 'projects', eventSlug), docToSet, { merge: true }),
            setDoc(doc(db, 'events', eventSlug), docToSet, { merge: true }),
          ]);
        } catch (err: any) {
          if (isFirestoreDocumentSizeError(err)) {
            showToast(
              "L'image intégrée est trop lourde pour être synchronisée en base, veuillez utiliser une image plus légère",
              'warning',
              6000
            );
          }
        }
      })();
    } catch (err) {
      console.error('[AuthGate] Erreur lors de l’inscription e-mail :', err);
    } finally {
      setIsDeployingGate(false);
    }
  };

  // --- SYSTÈME D'AUTO-SAVE PERSISTANT TEMPS RÉEL (LocalStorage + Cloud Firestore) ---
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const cloudSyncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const idleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncedCloudHashRef = useRef<string>('');
  const lastCloudSyncTimestampRef = useRef<number>(0);
  const firestoreQuotaCooldownUntilRef = useRef<number>(0);
  const isInitialMount = useRef(true);
  const isRestoringRef = useRef(false);
  const inputRef = useRef<EventInput>(input);

  useEffect(() => {
    inputRef.current = input;
  }, [input]);

  // Sauvegarde immédiate localStorage sans dédoublement abusif de clés pour préserver le quota
  const saveImmediateToLocalStorage = (nextInput: EventInput) => {
    try {
      const currentSlug = resolveUnifiedEventSlug(nextInput);
      const normalized = buildNormalizedSyncPayload(nextInput, currentSlug);
      const localKeys = ['signaid_studio_current_project', 'droppaid_last_event_input'];
      if (currentSlug) {
        localKeys.push(`signaid_studio_draft_${currentSlug}`);
      }
      safeSaveProjectToLocalStorage(localKeys, normalized);
    } catch (err) {
      console.warn('[AutoSave] Sauvegarde immédiate localStorage :', err);
    }
  };

  const sliderSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const debouncedSaveToLocalStorage = (nextInput: EventInput) => {
    if (sliderSaveTimeoutRef.current) clearTimeout(sliderSaveTimeoutRef.current);
    sliderSaveTimeoutRef.current = setTimeout(() => {
      saveImmediateToLocalStorage(nextInput);
    }, 1000);
  };

  const handleTextScaleChange = (field: keyof TextScales, val: number) => {
    setInput((prev) => {
      const next = updateTextScaleForFormat(prev, previewFormat, field, val);
      inputRef.current = next;
      debouncedSaveToLocalStorage(next);
      return next;
    });
  };

  const handleResetTextScales = () => {
    setInput((prev) => {
      const next = resetTextScalesForFormat(prev, previewFormat);
      inputRef.current = next;
      saveImmediateToLocalStorage(next);
      return next;
    });
  };

  // Ajustement vertical (Axe Y) par élément textuel
  const handleTextOffsetYChange = (field: keyof TextOffsetsY, val: number) => {
    setInput((prev) => {
      const next = updateTextOffsetYForFormat(prev, previewFormat, field, val);
      inputRef.current = next;
      debouncedSaveToLocalStorage(next);
      return next;
    });
  };

  const handleResetTextOffsetsY = () => {
    setInput((prev) => {
      const next = resetTextOffsetsYForFormat(prev, previewFormat);
      inputRef.current = next;
      saveImmediateToLocalStorage(next);
      return next;
    });
  };

  // Ajustement horizontal (Axe X en %) par élément textuel
  const handleTextOffsetXChange = (field: keyof TextOffsetsX, val: number) => {
    setInput((prev) => {
      const next = updateTextOffsetXForFormat(prev, previewFormat, field, val);
      inputRef.current = next;
      debouncedSaveToLocalStorage(next);
      return next;
    });
  };

  const handleResetTextOffsetsX = () => {
    setInput((prev) => {
      const next = resetTextOffsetsXForFormat(prev, previewFormat);
      inputRef.current = next;
      saveImmediateToLocalStorage(next);
      return next;
    });
  };

  // Alignement indépendant par élément textuel (gauche / centre / droite)
  const handleTextAlignmentFieldChange = (field: keyof TextAlignments, alignment: 'left' | 'center' | 'right') => {
    setInput((prev) => {
      const next = updateTextAlignmentForField(prev, previewFormat, field, alignment);
      inputRef.current = next;
      debouncedSaveToLocalStorage(next);
      return next;
    });
  };

  // Réinitialisation globale de la position des textes (Axe Y et espacement standard)
  const handleResetAllTextPositions = () => {
    setInput((prev) => {
      const next = resetAllTextPositionsForFormat(prev, previewFormat);
      inputRef.current = next;
      saveImmediateToLocalStorage(next);
      return next;
    });
  };

  // Centrage horizontal instantané de tous les calques (textes, logo, sujet)
  const handleCenterAllLayers = () => {
    setInput((prev) => {
      const next = centerAllLayersForFormat(prev, previewFormat);
      inputRef.current = next;
      saveImmediateToLocalStorage(next);
      return next;
    });
  };

  // Espacement global des lignes (interligne)
  const handleTextLineSpacingChange = (val: number) => {
    setInput((prev) => {
      const next = updateTextLineSpacingForFormat(prev, previewFormat, val);
      inputRef.current = next;
      debouncedSaveToLocalStorage(next);
      return next;
    });
  };

  // Modification de la couleur d'un segment textuel (Noir / Blanc)
  const handleTextColorChange = (field: keyof TextColors, color: string) => {
    setInput((prev) => {
      const next = updateTextColorForFormat(prev, previewFormat, field, color);
      inputRef.current = next;
      debouncedSaveToLocalStorage(next);
      return next;
    });
  };

  // Bascule globale du contraste des textes (Noir ⇄ Blanc en un clic)
  const handleToggleAllTextColors = (targetColor?: '#FFFFFF' | '#000000') => {
    setInput((prev) => {
      const next = toggleAllTextColorsForFormat(prev, previewFormat, targetColor);
      inputRef.current = next;
      saveImmediateToLocalStorage(next);
      return next;
    });
  };

  // Réinitialisation des couleurs des textes selon la tonalité
  const handleResetTextColors = () => {
    setInput((prev) => {
      const next = resetTextColorsForFormat(prev, previewFormat);
      inputRef.current = next;
      saveImmediateToLocalStorage(next);
      return next;
    });
  };

  // Alignement horizontal global
  const handleTextAlignmentChange = (align: 'left' | 'center' | 'right') => {
    setInput((prev) => {
      const next = updateTextAlignmentForFormat(prev, previewFormat, align);
      inputRef.current = next;
      saveImmediateToLocalStorage(next);
      return next;
    });
  };

  // --- GESTION DYNAMIQUE & MODULAIRE DES TEXTES (ÉTAPE 5) ---
  const isPosterTextsInitializedRef = useRef(false);
  useEffect(() => {
    if (!isPosterTextsInitializedRef.current) {
      isPosterTextsInitializedRef.current = true;
      if (!Array.isArray(input.posterTexts)) {
        setInput((prev) => {
          if (Array.isArray(prev.posterTexts)) return prev;
          const initialList = ensurePosterTexts(prev);
          const next = { ...prev, posterTexts: initialList };
          inputRef.current = next;
          saveImmediateToLocalStorage(next);
          return next;
        });
      }
    }
  }, []);

  const posterTextItems = useMemo(
    () => (Array.isArray(input.posterTexts) ? input.posterTexts : ensurePosterTexts(input)),
    [input.posterTexts]
  );

  const updatePosterTextsList = (updater: (prev: PosterTextItem[]) => PosterTextItem[]) => {
    setInput((prev) => {
      const currentList = Array.isArray(prev.posterTexts) ? prev.posterTexts : ensurePosterTexts(prev);
      const nextList = updater(currentList);

      // Synchronisation rétrocompatible des champs principaux (effacés proprement si supprimés de la liste)
      const firstTitle = nextList.find((i) => i.type === 'titre' && i.isVisible);
      const firstSurtitre = nextList.find((i) => i.type === 'surtitre' && i.isVisible);
      const firstSoustitre = nextList.find((i) => i.type === 'soustitre' && i.isVisible);

      // Synchronisation bidirectionnelle réactive des couleurs vers textColors et formatTextColors
      const nextTextColors: TextColors = {
        ...(prev.textColors || {}),
        eventName: firstTitle?.color || prev.textColors?.eventName,
        headerTagline: firstSurtitre?.color || prev.textColors?.headerTagline,
        punchline: firstSoustitre?.color || prev.textColors?.punchline,
      };

      const nextFormatTextColors: Record<string, any> = { ...(prev.formatTextColors || {}) };
      if (previewFormat && previewFormat !== 'tshirt') {
        nextFormatTextColors[previewFormat] = {
          ...(nextFormatTextColors[previewFormat] || {}),
          eventName: firstTitle?.color || nextFormatTextColors[previewFormat]?.eventName,
          headerTagline: firstSurtitre?.color || nextFormatTextColors[previewFormat]?.headerTagline,
          punchline: firstSoustitre?.color || nextFormatTextColors[previewFormat]?.punchline,
        };
      }

      const nextInput: EventInput = {
        ...prev,
        posterTexts: nextList,
        textColors: nextTextColors,
        formatTextColors: nextFormatTextColors,
        eventName: firstTitle ? firstTitle.text : '',
        headerTagline: firstSurtitre ? firstSurtitre.text : '',
        punchline: firstSoustitre ? firstSoustitre.text : '',
      };
      inputRef.current = nextInput;
      saveImmediateToLocalStorage(nextInput);
      return nextInput;
    });
  };

  const handleResetAllPositions = () => {
    setInput((prev) => {
      const nextOffsetsX = resetTextOffsetsXForFormat(prev, previewFormat);
      const nextOffsetsY = resetTextOffsetsYForFormat(nextOffsetsX, previewFormat);
      const nextPosterTexts = (Array.isArray(prev.posterTexts) ? prev.posterTexts : ensurePosterTexts(prev)).map((item) => ({
        ...item,
        x: 0,
        y: 0,
      }));
      const next = {
        ...nextOffsetsY,
        posterTexts: nextPosterTexts,
      };
      inputRef.current = next;
      saveImmediateToLocalStorage(next);
      return next;
    });
  };

  const handleAddPosterText = (type: 'surtitre' | 'titre' | 'soustitre' | 'info' | 'custom') => {
    const newItem = createNewPosterTextItem(type);
    updatePosterTextsList((prev) => [newItem, ...prev]);
  };

  const handleRemovePosterText = (id: string) => {
    updatePosterTextsList((prev) => prev.filter((item) => item.id !== id));
  };

  const handleMovePosterText = (id: string, direction: 'up' | 'down') => {
    updatePosterTextsList((prev) => {
      const index = prev.findIndex((i) => i.id === id);
      if (index === -1) return prev;
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy;
    });
  };

  const handleUpdatePosterTextItem = (id: string, partial: Partial<PosterTextItem>) => {
    updatePosterTextsList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...partial } : item))
    );
  };

  // Déplacement tactile direct 1:1 des textes avec verrouillage strict des limites du visuel (Boundary Check)
  const [isDraggingField, setIsDraggingField] = useState<keyof TextOffsetsY | null>(null);
  const textDragStateRef = useRef<{
    startY: number;
    startX: number;
    initialOffset: number;
    initialElTop: number;
    initialElBottom: number;
    containerTop: number;
    containerBottom: number;
    marginPx: number;
    field: keyof TextOffsetsY;
    elementField?: string;
    pointerId: number;
    containerWidth: number;
    hasMoved: boolean;
  } | null>(null);
  const hasJustDraggedRef = useRef(false);

  useEffect(() => {
    const handleGlobalPointerUp = () => {
      if (textDragStateRef.current) {
        textDragStateRef.current = null;
        setIsDraggingField(null);
      }
    };

    window.addEventListener('pointerup', handleGlobalPointerUp);
    window.addEventListener('pointercancel', handleGlobalPointerUp);
    return () => {
      window.removeEventListener('pointerup', handleGlobalPointerUp);
      window.removeEventListener('pointercancel', handleGlobalPointerUp);
    };
  }, []);

  const handleTextDragStart = (
    e: React.PointerEvent<HTMLElement>,
    field: keyof TextOffsetsY | string,
    elementField?: string
  ) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    e.stopPropagation();

    const canonicalKey = mapFieldToTextOffsetKey(field as string);
    const isTextsActive = activeSection === 'textSizes' || activeSection === 'texts';
    if (!isTextsActive) {
      setActiveSection('texts');
    }

    const targetEl = e.currentTarget as HTMLElement;
    const container = (targetEl.closest('[data-poster-container="true"]') as HTMLElement | null)
      || (targetEl.closest('[class*="@container"]') as HTMLElement | null)
      || (targetEl.closest('.\\@container') as HTMLElement | null)
      || containerRef.current;
    const containerRect = container?.getBoundingClientRect();
    const targetRect = targetEl.getBoundingClientRect();
    const containerWidth = containerRect && containerRect.width > 0 ? containerRect.width : 400;

    const currentOffsets = resolveTextOffsetsYForFormat(inputRef.current || input, previewFormat);
    const initialOffset = currentOffsets[canonicalKey] ?? 0;

    try {
      targetEl.setPointerCapture(e.pointerId);
    } catch { }

    const cqiInPx = containerWidth / 100;
    // Marge géométrique stricte pour maintenir le texte à l'intérieur du cadre (zone d'impression/affichage)
    const marginPx = Math.max(8, cqiInPx * 1.5);

    const initialElTop = targetRect.top;
    const initialElBottom = targetRect.bottom;
    const containerTop = containerRect ? containerRect.top : 0;
    const containerBottom = containerRect ? containerRect.bottom : window.innerHeight;

    textDragStateRef.current = {
      startY: e.clientY,
      startX: e.clientX,
      initialOffset,
      initialElTop,
      initialElBottom,
      containerTop,
      containerBottom,
      marginPx,
      field: canonicalKey,
      elementField,
      pointerId: e.pointerId,
      containerWidth,
      hasMoved: false,
    };
  };

  const handleTextDragMove = (e: React.PointerEvent<HTMLElement>) => {
    const state = textDragStateRef.current;
    if (!state || state.pointerId !== e.pointerId) return;
    e.stopPropagation();

    const deltaYPx = e.clientY - state.startY;
    const deltaXPx = e.clientX - state.startX;

    if (!state.hasMoved) {
      if (Math.hypot(deltaXPx, deltaYPx) > 3) {
        state.hasMoved = true;
        setIsDraggingField(state.field);
      } else {
        return;
      }
    }

    const cqiInPx = state.containerWidth / 100;

    // Verrouillage géométrique strict (Boundary Check) :
    // Empêche strictement tout débordement au-delà du cadre d'impression/affichage
    const maxUpPx = (state.containerTop + state.marginPx) - state.initialElTop; // borne maximale négative (vers le haut)
    const maxDownPx = (state.containerBottom - state.marginPx) - state.initialElBottom; // borne maximale positive (vers le bas)

    const safeMinDeltaPx = Math.min(0, maxUpPx);
    const safeMaxDeltaPx = Math.max(0, maxDownPx);

    // Contrainte stricte appliquée sur le déplacement pixel avant conversion en cqi
    const clampedDeltaYPx = Math.max(safeMinDeltaPx, Math.min(safeMaxDeltaPx, deltaYPx));
    const deltaCqi = deltaYPx / cqiInPx;
    const rawVal = state.initialOffset + deltaCqi;
    const clamped = Math.max(-100, Math.min(120, Math.round(rawVal * 10) / 10));
    handleTextOffsetYChange(state.field, clamped);
  };

  const handleTextDragEnd = (e: React.PointerEvent<HTMLElement>) => {
    const state = textDragStateRef.current;
    if (!state || state.pointerId !== e.pointerId) return;
    e.stopPropagation();

    try {
      if ((e.currentTarget as HTMLElement).hasPointerCapture(e.pointerId)) {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      }
    } catch { }

    const didMove = state.hasMoved;
    textDragStateRef.current = null;
    setIsDraggingField(null);

    if (didMove) {
      hasJustDraggedRef.current = true;
      setTimeout(() => {
        hasJustDraggedRef.current = false;
      }, 350);
      saveImmediateToLocalStorage(inputRef.current);
    }
  };

  const getOffsetKeyForField = (field: string | null | undefined): keyof TextOffsetsY => {
    if (!field) return 'eventName';
    if (field === 'headlineBadgeText' || field === 'headlineBadge') return 'headlineBadge';
    if (field === 'date' || field === 'timeSlot' || field === 'venue' || field === 'infoBadge') return 'infoBadge';
    if (field === 'headerTagline') return 'headerTagline';
    if (field === 'eventName' || field === 'headline') return 'eventName';
    if (field === 'punchline') return 'punchline';
    if (field === 'djName') return 'djName';
    return 'eventName';
  };

  // Notification d'état vers le parent (App.tsx)
  useEffect(() => {
    onSaveStatusChange?.(saveStatus);
  }, [saveStatus, onSaveStatusChange]);

  // Restauration automatique au chargement vérifiant LocalStorage, SessionStorage et IndexedDB
  useEffect(() => {
    const restoreActiveProject = async () => {
      try {
        const candidate = loadLatestProjectSync() || await loadLatestProject();
        if (candidate && typeof candidate === 'object') {
          const cleanCandidate = cleanProjectForSerialization(candidate);
          delete (cleanCandidate as any).input;

          isRestoringRef.current = true;
          setInput((prev) => {
            const currentScales = prev.textScales;
            const parsedScales = cleanCandidate.textScales;
            const hasPrevCustom = currentScales && Object.values(currentScales).some((v) => typeof v === 'number' && v !== 1.0);

            const resolvedTextScales: Required<TextScales> = {
              ...DEFAULT_TEXT_SCALES,
              ...(parsedScales || {}),
              ...(hasPrevCustom ? (currentScales || {}) : {}),
            };

            const mergedFormatTextScales = {
              ...(cleanCandidate.formatTextScales || {}),
              ...(prev.formatTextScales || {}),
            };

            // Ne jamais écraser un Studio Vierge par un ancien projet restauré
            if (prev.isVirgin) {
              return prev;
            }

            const isCandidateVirgin = Boolean(cleanCandidate.isVirgin);

            // RÈGLE PERSISTANCE : Ne jamais écraser une image active en mémoire (décor, logo, sujet)
            // par une valeur vide provenant du cache, SAUF si le projet chargé est explicitement vierge
            const resolvedBg = isCandidateVirgin
              ? (cleanCandidate.backgroundImage || cleanCandidate.customBackground || cleanCandidate.bgImage || '')
              : ((cleanCandidate.backgroundImage && cleanCandidate.backgroundImage.trim())
                || (prev.backgroundImage && prev.backgroundImage.trim())
                || (cleanCandidate.customBackground && cleanCandidate.customBackground.trim())
                || (prev.customBackground && prev.customBackground.trim())
                || (cleanCandidate.bgImage && cleanCandidate.bgImage.trim())
                || (prev.bgImage && prev.bgImage.trim())
                || '');

            const resolvedDjPhoto = isCandidateVirgin
              ? (cleanCandidate.djPhoto || '')
              : ((cleanCandidate.djPhoto && cleanCandidate.djPhoto.trim())
                || (prev.djPhoto && prev.djPhoto.trim())
                || '');

            const resolvedLogo = isCandidateVirgin
              ? (cleanCandidate.logoImage || cleanCandidate.logoUrl || '')
              : ((cleanCandidate.logoImage && cleanCandidate.logoImage.trim())
                || (prev.logoImage && prev.logoImage.trim())
                || (cleanCandidate.logoUrl && cleanCandidate.logoUrl.trim())
                || (prev.logoUrl && prev.logoUrl.trim())
                || '');

            const resolvedTshirtCustomLogo = cleanCandidate.tshirtCustomLogo || prev.tshirtCustomLogo;
            const resolvedTshirtBackCustomLogo =
              (cleanCandidate.tshirtBackCustomLogo && !isDemoLogo(cleanCandidate.tshirtBackCustomLogo))
                ? cleanCandidate.tshirtBackCustomLogo
                : prev.tshirtBackCustomLogo;

            return {
              ...prev,
              ...cleanCandidate,
              backgroundImage: resolvedBg || undefined,
              customBackground: resolvedBg || undefined,
              bgImage: resolvedBg || undefined,
              djPhoto: resolvedDjPhoto || undefined,
              logoImage: resolvedLogo || undefined,
              logoUrl: resolvedLogo || undefined,
              tshirtCustomLogo: resolvedTshirtCustomLogo,
              tshirtBackCustomLogo: resolvedTshirtBackCustomLogo,
              textScales: resolvedTextScales,
              formatTextScales: mergedFormatTextScales,
              tshirtPreviewImages: {
                ...(prev.tshirtPreviewImages || {}),
                ...(cleanCandidate.tshirtPreviewImages || {}),
              },
              previewImages: {
                ...(prev.previewImages || {}),
                ...(cleanCandidate.previewImages || {}),
              },
              flyerImageUrl: cleanCandidate.flyerImageUrl || prev.flyerImageUrl,
            };
          });
        }
      } catch (err) {
        console.warn('[AutoSave] Erreur lors de la restauration du projet :', err);
      }
    };

    void restoreActiveProject();
  }, [setInput]);

  // Sauvegarde automatique bi-étagée : LocalStorage rapide décalé + Firestore temporisé (anti resource-exhausted)
  useEffect(() => {
    if (!input) return;

    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (isRestoringRef.current) {
      isRestoringRef.current = false;
      return;
    }

    setSaveStatus('saving');

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    if (cloudSyncTimeoutRef.current) {
      clearTimeout(cloudSyncTimeoutRef.current);
    }
    if (idleTimeoutRef.current) {
      clearTimeout(idleTimeoutRef.current);
    }

    const currentSlug = resolveUnifiedEventSlug(input);
    const normalizedInput = buildNormalizedSyncPayload(input, currentSlug);
    const localKeys = ['signaid_studio_current_project', 'droppaid_last_event_input'];
    if (currentSlug) {
      localKeys.push(`signaid_studio_draft_${currentSlug}`);
    }

    // ÉTAPE 1 : Sauvegarde locale dans le LocalStorage (décalée à 1200ms pour préserver l'I/O et le quota navigateur)
    saveTimeoutRef.current = setTimeout(() => {
      try {
        safeSaveProjectToLocalStorage(localKeys, normalizedInput);

        const effectiveEmail = auth.currentUser?.email || authContextUser?.email || entitlements?.email || '';
        const currentUser = auth.currentUser || authContextUser || (effectiveEmail && effectiveEmail !== 'invite@client.fr' ? {
          uid: 'user_' + effectiveEmail.replace(/[^a-zA-Z0-9]/g, '_'),
          email: effectiveEmail,
        } : null);
        const activeProjectId = (input as any).id || input.projectId || (currentUser ? `draft_${currentUser.uid}` : 'draft_local');
        const formattedDate = new Date().toLocaleString('fr-FR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });

        try {
          const rawProjects = localStorage.getItem('droppaid_admin_projects_v1');
          const existingList: any[] = rawProjects ? JSON.parse(rawProjects) : [];
          const cleanDraftInput = cleanProjectForSerialization({
            ...normalizedInput,
            id: activeProjectId,
            projectId: activeProjectId,
          });
          delete (cleanDraftInput as any).input;

          const draftProject = {
            id: activeProjectId,
            name: normalizedInput.eventName || 'Nouveau Projet',
            updatedAt: formattedDate,
            updatedAtMillis: Date.now(),
            status: 'Actif',
            input: cleanDraftInput,
          };
          // Toujours sauvegarder de manière structurée dans IndexedDB (haute capacité)
          saveProjectToIndexedDB(draftProject).catch(() => { });

          // RÈGLE QUOTA LOCALSTORAGE :
          // Si le projet contient des images en Base64, désactiver le LocalStorage
          // et forcer l'utilisation exclusive d'IndexedDB afin de ne pas saturer le navigateur.
          if (!hasBase64Images(cleanDraftInput) && !hasBase64Images(normalizedInput)) {
            const rawProjects = localStorage.getItem('droppaid_admin_projects_v1');
            const existingList: any[] = rawProjects ? JSON.parse(rawProjects) : [];
            const updatedList = [draftProject, ...existingList.filter((p: any) => p.id !== activeProjectId)];
            localStorage.setItem('droppaid_admin_projects_v1', JSON.stringify(updatedList));
          }
        } catch { }

        setSaveStatus('saved');
        idleTimeoutRef.current = setTimeout(() => setSaveStatus('idle'), 2000);
      } catch (storageErr) {
        console.warn('[AutoSave] Erreur lors de la sauvegarde locale :', storageErr);
      }
    }, 1200);

    // ÉTAPE 2 : Synchronisation Cloud Firestore cadencée (délai de 3500ms + intervalle minimal de 5s + anti resource-exhausted)
    cloudSyncTimeoutRef.current = setTimeout(async () => {
      // 1. Vérification du temps de pause quota (cooldown de 2 minutes si quota saturé)
      if (Date.now() < firestoreQuotaCooldownUntilRef.current) {
        return;
      }

      // 2. Cadencement strict : au moins 5 secondes entre deux écritures Firestore consécutives
      const now = Date.now();
      if (now - lastCloudSyncTimestampRef.current < 5000) {
        return;
      }

      // 3. Détection de changement réel par signature : évite d'écrire si rien de persistant n'a changé
      const normalizedAny = normalizedInput as any;
      const cloudSignature = JSON.stringify([
        currentSlug,
        normalizedInput.eventName,
        normalizedInput.djName,
        normalizedAny.eventDate || normalizedInput.date,
        normalizedAny.venueName || normalizedInput.venue,
        normalizedAny.city,
        normalizedAny.musicGenre || normalizedInput.genre,
        normalizedInput.ticketPrice,
        normalizedAny.ticketUrl,
        normalizedAny.primaryColor,
        normalizedAny.secondaryColor,
        normalizedInput.accentColor,
        normalizedInput.djPhoto ? normalizedInput.djPhoto.length : 0,
        (normalizedInput.backgroundImage || normalizedInput.bgImage) ? ((normalizedInput.backgroundImage || normalizedInput.bgImage)?.length ?? 0) : 0,
        normalizedInput.logoImage ? normalizedInput.logoImage.length : 0,
        normalizedInput.tshirtCustomLogo ? normalizedInput.tshirtCustomLogo.length : 0,
        normalizedInput.tshirtBackCustomLogo ? normalizedInput.tshirtBackCustomLogo.length : 0,
        normalizedAny.subjectScale,
        normalizedAny.subjectOffsetY,
        normalizedInput.logoScale,
        normalizedInput.tshirtColor,
        normalizedInput.textScales,
        normalizedInput.textOffsetsY,
        normalizedInput.formatTransforms,
      ]);

      if (cloudSignature === lastSyncedCloudHashRef.current) {
        // Aucune modification substantielle : préservation du quota Firestore
        return;
      }

      let cleanInput: any = cleanProjectForSerialization(normalizedInput);
      delete cleanInput.rawDjPhoto;
      delete cleanInput.rawTshirtLogoOriginal;
      delete cleanInput.rawLogoImage;
      delete (cleanInput as any).input;
      let syncDocPayload: any = null;

      try {
        if (
          (cleanInput.djPhoto && cleanInput.djPhoto.length > 400000) ||
          (cleanInput.backgroundImage && cleanInput.backgroundImage.length > 400000) ||
          (cleanInput.bgImage && cleanInput.bgImage.length > 400000) ||
          (cleanInput.logoImage && cleanInput.logoImage.length > 400000)
        ) {
          try {
            const compressed = await prepareEventDataForSync(cleanInput);
            cleanInput = cleanProjectForSerialization(compressed);
            delete cleanInput.rawDjPhoto;
            delete cleanInput.rawTshirtLogoOriginal;
            delete cleanInput.rawLogoImage;
            delete (cleanInput as any).input;
          } catch (compErr) {
            console.warn('[AutoSave] Erreur compression avant sync Firestore:', compErr);
          }
        }

        const effectiveEmail = auth.currentUser?.email || authContextUser?.email || entitlements?.email || '';
        const currentUser = auth.currentUser || authContextUser || (effectiveEmail && effectiveEmail !== 'invite@client.fr' ? {
          uid: 'user_' + effectiveEmail.replace(/[^a-zA-Z0-9]/g, '_'),
          email: effectiveEmail,
        } : null);
        const activeProjectId = (input as any).id || input.projectId || (currentUser ? `draft_${currentUser.uid}` : 'draft_local');

        const syncDocPayload = buildFirestoreProjectDoc(cleanInput, {
          id: activeProjectId,
          projectId: activeProjectId,
          slug: currentSlug,
          ...(currentUser ? {
            userId: currentUser.uid,
            userEmail: currentUser.email || '',
          } : {}),
          title: normalizedInput.eventName || 'Nouveau Projet',
          eventName: normalizedInput.eventName ?? '',
          djName: normalizedInput.djName ?? '',
          status: 'Actif',
          updatedAt: serverTimestamp(),
          createdAt: (input as any).createdAt || serverTimestamp(),
        });

        const guardedSyncDocPayload = guardFirestorePayloadSize(syncDocPayload);

        await Promise.all([
          setDoc(doc(db, 'portals', currentSlug), guardedSyncDocPayload, { merge: true }),
          setDoc(doc(db, 'projects', currentSlug), guardedSyncDocPayload, { merge: true }),
          setDoc(doc(db, 'events', currentSlug), guardedSyncDocPayload, { merge: true }),
          ...(currentUser && activeProjectId !== currentSlug ? [
            setDoc(doc(db, 'portals', activeProjectId), guardedSyncDocPayload, { merge: true }),
            setDoc(doc(db, 'projects', activeProjectId), guardedSyncDocPayload, { merge: true }),
          ] : []),
        ]);

        lastSyncedCloudHashRef.current = cloudSignature;
        lastCloudSyncTimestampRef.current = Date.now();
        setSaveStatus('saved');
        idleTimeoutRef.current = setTimeout(() => setSaveStatus('idle'), 2000);
      } catch (err: any) {
        const isDocSizeError = isFirestoreDocumentSizeError(err);
        if (isDocSizeError) {
          firestoreQuotaCooldownUntilRef.current = Date.now() + 60000;
          console.warn('[AutoSave] Quota ou taille max Firestore atteinte (1 Mo). Sauvegarde locale et IndexedDB maintenue.');
          safeSaveProjectToLocalStorage(localKeys, cleanInput);
          setSaveStatus('saved');
          idleTimeoutRef.current = setTimeout(() => setSaveStatus('idle'), 2000);
          try {
            const textOnly = purgeAllBase64FromObject(syncDocPayload);
            await Promise.all([
              setDoc(doc(db, 'projects', currentSlug), textOnly, { merge: true }),
              setDoc(doc(db, 'events', currentSlug), textOnly, { merge: true }),
            ]);
          } catch { }
          return;
        }

        const isQuotaError =
          err?.code === 'resource-exhausted' ||
          (typeof err?.message === 'string' && (
            err.message.includes('resource-exhausted') ||
            err.message.includes('Quota exceeded') ||
            err.message.includes('RESOURCE_EXHAUSTED') ||
            err.message.includes('quota') ||
            err.message.includes('Resource exhausted')
          ));

        const isServerErrorOr502 =
          err?.code === 'unavailable' ||
          (typeof err?.message === 'string' && (
            err.message.includes('502') ||
            err.message.includes('Bad Gateway') ||
            err.message.includes('network') ||
            err.message.includes('offline') ||
            err.message.includes('Failed to fetch') ||
            err.message.includes('unavailable')
          ));

        if (isQuotaError || isServerErrorOr502) {
          // Pause des requêtes cloud (120s pour quota, 30s pour 502/réseau) pour soulager la file d'attente
          firestoreQuotaCooldownUntilRef.current = Date.now() + (isQuotaError ? 120000 : 30000);
          console.warn(`[AutoSave] Quota ou serveur Firestore temporairement saturé (${isQuotaError ? 'quota' : '502/hors-ligne'}). Sauvegarde locale et IndexedDB maintenue.`);
          safeSaveProjectToLocalStorage(localKeys, cleanInput);
          setSaveStatus('saved');
          idleTimeoutRef.current = setTimeout(() => setSaveStatus('idle'), 2000);
          if (isQuotaError) {
            showToast('Quota cloud temporairement atteint. Sauvegarde locale active sur cet appareil.', 'info');
          }
          return;
        }

        const isPermissionError =
          err?.code === 'permission-denied' ||
          (typeof err?.message === 'string' && (
            err.message.includes('Missing or insufficient') ||
            err.message.includes('insufficient permissions') ||
            err.message.includes('permission-denied')
          ));

        if (isPermissionError) {
          try {
            safeSaveProjectToLocalStorage(localKeys, cleanInput);
          } catch { }
          setSaveStatus('saved');
          idleTimeoutRef.current = setTimeout(() => setSaveStatus('idle'), 2000);
        } else {
          console.warn('[AutoSave] Erreur lors de la synchronisation Firestore (sauvegarde locale préservée) :', err?.message || err);
          safeSaveProjectToLocalStorage(localKeys, cleanInput);
          setSaveStatus('saved');
          idleTimeoutRef.current = setTimeout(() => setSaveStatus('idle'), 2000);
        }
      }
    }, 3500);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (cloudSyncTimeoutRef.current) {
        clearTimeout(cloudSyncTimeoutRef.current);
      }
      if (idleTimeoutRef.current) {
        clearTimeout(idleTimeoutRef.current);
      }
    };
  }, [input, authContextUser]);

  // Sauvegarde garantie au démontage du composant ou à la fermeture de l'onglet
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (inputRef.current) {
        saveImmediateToLocalStorage(inputRef.current);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (inputRef.current) {
        saveImmediateToLocalStorage(inputRef.current);
      }
    };
  }, []);
  const [internalActiveView, setInternalActiveView] = useState<'face' | 'dos'>(
    input.tshirtSide === 'back' ? 'dos' : 'face'
  );
  useEffect(() => {
    if (input.tshirtSide) {
      setInternalActiveView(input.tshirtSide === 'back' ? 'dos' : 'face');
    }
  }, [input.tshirtSide]);
  const activeView = propActiveView ?? internalActiveView;
  const setActiveView = (view: 'face' | 'dos') => {
    setInternalActiveView(view);
    if (propOnActiveViewChange) {
      propOnActiveViewChange(view);
    }
    setInput((p) => ({ ...p, tshirtSide: view === 'dos' ? 'back' : 'front' }));
    if (logoTarget === 'apparel' && previewFormat !== 'tshirt') {
      onSelectFormat?.('tshirt');
    }
  };

  const [internalTshirtView, setInternalTshirtView] = useState<'ghost' | 'model'>('ghost');
  const tshirtView = propTshirtView ?? internalTshirtView;
  const currentTshirtView = tshirtView;
  const setTshirtView = (view: 'ghost' | 'model') => {
    setInternalTshirtView(view);
    if (propOnTshirtViewChange) {
      propOnTshirtViewChange(view);
    }
  };

  // Arrivée par défaut sur le Gabarit :
  // Lors de l'ouverture du mode textile (previewFormat === 'tshirt'), forcer l'état initial sur le t-shirt à plat ('ghost')
  useEffect(() => {
    setTshirtView('ghost');
  }, []);

  useEffect(() => {
    if (previewFormat === 'tshirt') {
      setTshirtView('ghost');
    }
  }, [previewFormat]);

  // État de chargement VTON IA réel
  const [isGeneratingVtonInternal, setIsGeneratingVtonInternal] = useState<boolean>(false);
  const isGeneratingVton = propIsGeneratingTryOn ?? isGeneratingVtonInternal;

  // État de positionnement du logo (Coordinates State) découplé strictement Face vs Dos
  // Face : Pectoral gauche sur gabarit à plat (x: 68, y: 34, scale: 1.0)
  // Dos : Omoplates centré sur gabarit à plat (x: 50, y: 38, scale: 1.0)
  const [frontPlacement, setFrontPlacement] = useState<LogoPlacement>(() => {
    if (input.tshirtFrontPlacement) {
      return {
        x: input.tshirtFrontPlacement.x ?? 68,
        y: input.tshirtFrontPlacement.y ?? 34,
        scale: input.tshirtFrontPlacement.scale ?? input.tshirtLogoScale ?? 1,
      };
    }
    return { x: 68, y: 34, scale: input.tshirtLogoScale ?? 1 };
  });

  const [backPlacement, setBackPlacement] = useState<LogoPlacement>(() => {
    if (input.tshirtBackPlacement) {
      return {
        x: input.tshirtBackPlacement.x ?? 50,
        y: input.tshirtBackPlacement.y ?? 38,
        scale: input.tshirtBackPlacement.scale ?? input.tshirtBackLogoScale ?? 1,
      };
    }
    return { x: 50, y: 38, scale: input.tshirtBackLogoScale ?? 1 };
  });

  // Synchronisation bidirectionnelle isolée Face (n'affecte jamais le Dos)
  useEffect(() => {
    setInput((prev) => {
      if (
        prev.tshirtFrontPlacement?.x === frontPlacement.x &&
        prev.tshirtFrontPlacement?.y === frontPlacement.y &&
        prev.tshirtFrontPlacement?.scale === frontPlacement.scale
      ) {
        return prev;
      }
      return {
        ...prev,
        tshirtFrontPlacement: frontPlacement,
        tshirtLogoScale: frontPlacement.scale,
        tshirtLogoOffsetY: frontPlacement.y - 34,
      };
    });
  }, [frontPlacement]);

  // Synchronisation bidirectionnelle isolée Dos (n'affecte jamais la Face)
  useEffect(() => {
    setInput((prev) => {
      if (
        prev.tshirtBackPlacement?.x === backPlacement.x &&
        prev.tshirtBackPlacement?.y === backPlacement.y &&
        prev.tshirtBackPlacement?.scale === backPlacement.scale
      ) {
        return prev;
      }
      return {
        ...prev,
        tshirtBackPlacement: backPlacement,
        tshirtBackLogoScale: backPlacement.scale,
        tshirtBackLogoOffsetY: backPlacement.y - 38,
      };
    });
  }, [backPlacement]);

  useEffect(() => {
    if (input.tshirtFrontPlacement) {
      setFrontPlacement((p) => {
        if (
          p.x === input.tshirtFrontPlacement!.x &&
          p.y === input.tshirtFrontPlacement!.y &&
          p.scale === input.tshirtFrontPlacement!.scale
        ) return p;
        return input.tshirtFrontPlacement!;
      });
    }
  }, [input.tshirtFrontPlacement]);

  useEffect(() => {
    if (input.tshirtBackPlacement) {
      setBackPlacement((p) => {
        if (
          p.x === input.tshirtBackPlacement!.x &&
          p.y === input.tshirtBackPlacement!.y &&
          p.scale === input.tshirtBackPlacement!.scale
        ) return p;
        return input.tshirtBackPlacement!;
      });
    }
  }, [input.tshirtBackPlacement]);

  // État glisser-déposer sur le Gabarit à plat (Face et Dos) - Pointer Capture à 60 FPS
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // État Modal Demande Spéciale / Retouche IA
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [isApplyingAdjustment, setIsApplyingAdjustment] = useState(false);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (_) { }
    setIsDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    e.stopPropagation();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Calcul direct borné strictement aux limites de la zone d'impression DTF
    const rawX = ((e.clientX - rect.left) / rect.width) * 100;
    const rawY = ((e.clientY - rect.top) / rect.height) * 100;

    const sideKey = activeView === 'dos' ? 'back' : 'front';
    const currentScale = activeView === 'dos' ? backPlacement.scale : frontPlacement.scale;
    const clamped = clampDtfPlacement({ x: rawX, y: rawY, scale: currentScale }, sideKey);

    if (activeView === 'dos') {
      setBackPlacement(clamped);
      setInput((prev) => ({
        ...prev,
        tshirtBackPlacement: clamped,
        tshirtBackLogoScale: clamped.scale,
        tshirtBackLogoOffsetY: clamped.y - 38,
      }));
    } else {
      setFrontPlacement(clamped);
      setInput((prev) => ({
        ...prev,
        tshirtFrontPlacement: clamped,
        tshirtLogoScale: clamped.scale,
        tshirtLogoOffsetY: clamped.y - 34,
      }));
    }
    notifyHubProjectUpdated();
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (_) { }
    setIsDragging(false);
  };

  const handleApplyAdjustment = async (instruction: string) => {
    const isBack = activeView === 'dos';
    const sideToUse = isBack ? 'back' : 'front';
    const currentImg = isBack ? input.tshirtPreviewImages?.back : input.tshirtPreviewImages?.front;
    if (!currentImg) return;

    setIsApplyingAdjustment(true);
    try {
      const updated = await adjustTryOnImage(currentImg, instruction, isBack ? 'dos' : 'face');
      if (updated) {
        setInput((prev) => ({
          ...prev,
          tshirtSide: sideToUse,
          tshirtPreviewImage: updated,
          tshirtPreviewImages: {
            ...(prev.tshirtPreviewImages || {}),
            [sideToUse]: updated,
          },
        }));
      }
    } finally {
      setIsApplyingAdjustment(false);
    }
  };

  useEffect(() => {
    if (input.tshirtSide) {
      setInternalActiveView(input.tshirtSide === 'back' ? 'dos' : 'face');
    }
  }, [input.tshirtSide]);

  const [localMobilePreviewOpen, setLocalMobilePreviewOpen] = useState(false);
  const isMobilePreviewOpen = propIsMobilePreviewOpen ?? localMobilePreviewOpen;
  const setIsMobilePreviewOpen = (open: boolean) => {
    if (propSetIsMobilePreviewOpen) {
      propSetIsMobilePreviewOpen(open);
    } else {
      setLocalMobilePreviewOpen(open);
    }
    if (open) {
      onOpenFullPreview?.();
    }
  };
  const photoInputRefDesktop = useRef<HTMLInputElement>(null);
  const secondaryPhotoInputRefDesktop = useRef<HTMLInputElement>(null);
  const [activeSubjectTab, setActiveSubjectTab] = useState<'primary' | 'secondary'>('primary');
  const logoInputRefDesktop = useRef<HTMLInputElement>(null);
  const bgInputRefDesktop = useRef<HTMLInputElement>(null);
  const datePickerRefDesktop = useRef<HTMLInputElement>(null);
  const rawLogoOriginalRef = useRef<string | null>(input.logoImage || null);
  const tshirtLogoInputRefDesktop = useRef<HTMLInputElement>(null);
  const rawTshirtLogoOriginalRef = useRef<string | null>(input.tshirtCustomLogo || input.rawTshirtLogoOriginal || null);

  const handleNextFormat = () => {
    const currentIndex = FORMAT_CYCLE.indexOf(previewFormat as any);
    const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % FORMAT_CYCLE.length;
    onSelectFormat?.(FORMAT_CYCLE[nextIndex]);
  };

  const handlePrevFormat = () => {
    const currentIndex = FORMAT_CYCLE.indexOf(previewFormat as any);
    const prevIndex = currentIndex === -1 ? FORMAT_CYCLE.length - 1 : (currentIndex - 1 + FORMAT_CYCLE.length) % FORMAT_CYCLE.length;
    onSelectFormat?.(FORMAT_CYCLE[prevIndex]);
  };

  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const pinchStartDistRef = useRef<number | null>(null);
  const isPinchingRef = useRef(false);
  const swipedRef = useRef(false);
  const [pinchScale, setPinchScale] = useState(1);

  const handleTouchStart = (e: React.TouchEvent) => {
    swipedRef.current = false;
    if (e.touches.length === 2) {
      // Détection de deux doigts : initialisation du geste de pincement
      const p1 = e.touches[0];
      const p2 = e.touches[1];
      const dist = Math.hypot(p2.clientX - p1.clientX, p2.clientY - p1.clientY);
      pinchStartDistRef.current = dist;
      isPinchingRef.current = false;
      touchStartXRef.current = null;
      touchStartYRef.current = null;
      return;
    }

    if (e.touches.length === 1) {
      if (hasJustDraggedRef.current || isDraggingField) {
        touchStartXRef.current = null;
        touchStartYRef.current = null;
        return;
      }
      pinchStartDistRef.current = null;
      isPinchingRef.current = false;
      touchStartXRef.current = e.touches[0].clientX;
      touchStartYRef.current = e.touches[0].clientY;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (hasJustDraggedRef.current || isDraggingField) return;
    if (e.touches.length === 2 && pinchStartDistRef.current !== null) {
      if (e.cancelable) {
        try {
          e.preventDefault();
        } catch { }
      }
      const p1 = e.touches[0];
      const p2 = e.touches[1];
      const currentDist = Math.hypot(p2.clientX - p1.clientX, p2.clientY - p1.clientY);
      const diff = currentDist - pinchStartDistRef.current;
      const ratio = currentDist / pinchStartDistRef.current;

      // Feedback tactile élastique pendant l'écartement
      const liveScale = Math.min(1.25, Math.max(0.92, ratio));
      setPinchScale(liveScale);

      // Si écartement significatif des doigts (> 20px ou ratio > 1.1)
      if (diff > 20 || ratio > 1.1) {
        isPinchingRef.current = true;
        setPinchScale(1);
        pinchStartDistRef.current = null;
        setIsMobilePreviewOpen(true);
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    setPinchScale(1);
    if (isPinchingRef.current) {
      pinchStartDistRef.current = null;
      setTimeout(() => {
        isPinchingRef.current = false;
      }, 300);
      return;
    }
    pinchStartDistRef.current = null;

    if (hasJustDraggedRef.current || isDraggingField) {
      touchStartXRef.current = null;
      touchStartYRef.current = null;
      return;
    }

    if (touchStartXRef.current === null) return;
    if (e.changedTouches.length === 0) return;
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const diffX = endX - touchStartXRef.current;
    const diffY = touchStartYRef.current !== null ? Math.abs(endY - touchStartYRef.current) : 0;

    // Détection d'un geste horizontal de swipe (> 35px et plus horizontal que vertical)
    if (Math.abs(diffX) > 35 && Math.abs(diffX) > diffY * 1.1) {
      swipedRef.current = true;
      setTimeout(() => {
        swipedRef.current = false;
      }, 250);

      if (diffX < 0) {
        // Balayage vers la gauche : étape suivante
        if (effectiveStepIndex < MOBILE_STEPS.length - 1) {
          goToMobileStep(effectiveStepIndex + 1);
        }
      } else {
        // Balayage vers la droite : étape précédente
        if (effectiveStepIndex > 0) {
          goToMobileStep(effectiveStepIndex - 1);
        }
      }
    }
    touchStartXRef.current = null;
    touchStartYRef.current = null;
  };

  const handleTouchCancel = () => {
    setPinchScale(1);
    pinchStartDistRef.current = null;
    touchStartXRef.current = null;
    touchStartYRef.current = null;
    setTimeout(() => {
      isPinchingRef.current = false;
    }, 300);
  };

  const handleThumbnailClick = () => {
    if (swipedRef.current || isPinchingRef.current || hasJustDraggedRef.current || isDraggingField) {
      swipedRef.current = false;
      isPinchingRef.current = false;
      return;
    }
    setIsMobilePreviewOpen(true);
  };

  const [logoTarget, setLogoTarget] = useState<'poster' | 'apparel'>(previewFormat === 'tshirt' ? 'apparel' : 'poster');

  useEffect(() => {
    if (previewFormat === 'tshirt') {
      setLogoTarget('apparel');
    } else {
      setLogoTarget('poster');
    }
  }, [previewFormat]);

  useEffect(() => {
    if (input.rawTshirtLogoOriginal && !isDemoLogo(input.rawTshirtLogoOriginal)) {
      rawTshirtLogoOriginalRef.current = input.rawTshirtLogoOriginal;
    } else if (input.tshirtCustomLogo && !isDemoLogo(input.tshirtCustomLogo)) {
      rawTshirtLogoOriginalRef.current = input.tshirtCustomLogo;
    } else if (input.logoImage && !isDemoLogo(input.logoImage)) {
      rawTshirtLogoOriginalRef.current = input.logoImage;
    } else if (input.logoUrl && !isDemoLogo(input.logoUrl)) {
      rawTshirtLogoOriginalRef.current = input.logoUrl;
    }
  }, [input.rawTshirtLogoOriginal, input.tshirtCustomLogo, input.logoImage, input.logoUrl]);

  useEffect(() => {
    if (input.logoImage && !isDemoLogo(input.logoImage)) {
      rawLogoOriginalRef.current = input.logoImage;
    } else if (input.logoUrl && !isDemoLogo(input.logoUrl)) {
      rawLogoOriginalRef.current = input.logoUrl;
    }
  }, [input.logoImage, input.logoUrl]);

  const [activeSection, setActiveSection] = useState<ActiveSection>('decor');
  const [showMapsInput, setShowMapsInput] = useState(false);

  useEffect(() => {
    onActiveSectionChange?.(activeSection);
  }, [activeSection, onActiveSectionChange]);

  useEffect(() => {
    if (activeSection === 'subject2') {
      setActiveSubjectTab('secondary');
    }
  }, [activeSection]);

  const toggleSection = (section: NonNullable<ActiveSection>) => {
    const resolved = section === 'texts' ? 'textSizes' : section;
    setActiveSection((prev) => (prev === resolved ? null : resolved));
  };
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [focusedTextField, setFocusedTextField] = useState<string | null>(null);
  const isTyping = Boolean(focusedTextField || isKeyboardOpen);
  const keyboardWasOpenRef = useRef(false);

  const checkIsMobileDevice = () => {
    if (typeof window === 'undefined') return false;
    const isNarrow = window.innerWidth < 920;
    const isTouch = 'ontouchstart' in window || (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0) || (typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches);
    const isMobileUA = typeof navigator !== 'undefined' && /Android|webOS|iPhone|iPad|IEMobile|Opera Mini/i.test(navigator.userAgent || '');

    return isNarrow && (isTouch || isMobileUA);
  };

  const [isMobileDevice, setIsMobileDevice] = useState<boolean>(checkIsMobileDevice);

  // Lors du montage du composant, si isMobileDevice est vrai, s'assurer que activeSection reste bien sur 'decor', sauf si intent=headliner_drop
  useEffect(() => {
    const isHeadlinerDrop = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('intent') === 'headliner_drop';
    if (isHeadlinerDrop) {
      setActiveSection('textSizes');
      return;
    }
    if (isMobileDevice || checkIsMobileDevice()) {
      setActiveSection('decor');
    }
  }, [isMobileDevice]);

  useEffect(() => {
    const checkDevice = () => {
      setIsMobileDevice(checkIsMobileDevice());

      const visualH = window.visualViewport?.height ?? window.innerHeight;
      const isNarrow = window.innerWidth < 920;
      const isKbOpen = isNarrow && ((visualH < 520) || (window.visualViewport ? window.visualViewport.height < window.innerHeight * 0.8 : false));

      setIsKeyboardOpen(isKbOpen);

      if (isKbOpen) {
        keyboardWasOpenRef.current = true;
      } else if (keyboardWasOpenRef.current) {
        keyboardWasOpenRef.current = false;
        // Le clavier virtuel vient de se fermer
        setFocusedTextField(null);
      }
    };
    checkDevice();
    window.addEventListener('resize', checkDevice);
    window.addEventListener('orientationchange', checkDevice);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', checkDevice);
    }
    return () => {
      window.removeEventListener('resize', checkDevice);
      window.removeEventListener('orientationchange', checkDevice);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', checkDevice);
      }
    };
  }, []);

  // État du Carrousel Focus Mobile (< 920px)
  const [mobileStepIndex, setMobileStepIndex] = useState(0);
  const [stepTransitionDirection, setStepTransitionDirection] = useState<'next' | 'prev' | null>(null);

  const MOBILE_STEPS: Array<{ key: ActiveSection; label: string; hasPreview: boolean }> = [
    { key: 'decor', label: '1. DÉCOR & FOND', hasPreview: true },
    { key: 'subject', label: '2. SUJET (ARTISTE)', hasPreview: true },
    { key: 'logo', label: '3. LOGO', hasPreview: true },
    { key: 'theme', label: '4. COULEURS & IDENTITÉ', hasPreview: true },
    { key: 'textSizes', label: '5. TAILLE DES TEXTES & TYPOS', hasPreview: true },
    { key: 'marketing', label: '6. PROMO ÉVÉNEMENT & MERCH', hasPreview: false }, // EXCLUS DE LA MINIATURE
  ];

  const effectiveStepIndex = typeof currentWizardStep === 'number' ? currentWizardStep : mobileStepIndex;
  const composerContainerRef = useRef<HTMLDivElement | null>(null);
  const isFirstMountRef = useRef(true);

  // Fonction universelle de défilement vers le haut pour le formulaire et ses conteneurs
  const scrollToTop = () => {
    // 1. Défilement de la fenêtre globale et du document
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      if (document.documentElement) {
        document.documentElement.scrollTo({ top: 0, behavior: 'smooth' });
      }
      if (document.body) {
        document.body.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }

    // 2. Défilement du conteneur <main>
    const mainContainer = document.querySelector('main');
    if (mainContainer && mainContainer.scrollTop > 0) {
      mainContainer.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // 3. Défilement du conteneur spécifique du formulaire et de ses parents défilables
    if (composerContainerRef.current) {
      if (composerContainerRef.current.scrollTop > 0) {
        composerContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }

      let parent = composerContainerRef.current.parentElement;
      while (parent) {
        if (parent.scrollTop > 0) {
          parent.scrollTo({ top: 0, behavior: 'smooth' });
        }
        parent = parent.parentElement;
      }

      // 4. Alignement précis en haut de la vue
      try {
        composerContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } catch {
        composerContainerRef.current.scrollIntoView(true);
      }
    }
  };

  // Recentrage fluide sur l'aperçu du flyer en haut de l'écran
  const scrollToPreview = () => {
    scrollToTop();
  };

  const goToMobileStep = (index: number) => {
    const bounded = Math.max(0, Math.min(MOBILE_STEPS.length - 1, index));
    if (bounded !== effectiveStepIndex) {
      setStepTransitionDirection(bounded > effectiveStepIndex ? 'next' : 'prev');
    }
    setMobileStepIndex(bounded);
    onWizardStepChange?.(bounded);
    const targetStep = MOBILE_STEPS[bounded];

    if (targetStep && targetStep.key) {
      setActiveSection(targetStep.key);
      if (targetStep.key !== 'logo' && previewFormat === 'tshirt') {
        onSelectFormat?.('post');
      }
    }

    // Ramener immédiatement la vue en haut de page lors du changement d'étape
    scrollToTop();
  };

  const mobileStepTransitionClass =
    stepTransitionDirection === 'next'
      ? 'animate-slideInRight'
      : stepTransitionDirection === 'prev'
        ? 'animate-slideInLeft'
        : 'animate-fadeIn';

  const lastAutoOpenedStepRef = useRef<number | null>(null);

  useEffect(() => {
    const isMobile = typeof window !== 'undefined' && (window.innerWidth < 920 || isMobileDevice);
    if (!isMobile) return;

    if (effectiveStepIndex !== 4) {
      lastAutoOpenedStepRef.current = null;
    }
  }, [effectiveStepIndex, isMobileDevice]);

  useEffect(() => {
    if (isFirstMountRef.current) {
      isFirstMountRef.current = false;
      return;
    }

    // Défilement automatique vers le haut dès que l'étape active change
    scrollToTop();

    // Re-synchronisation post-rendu pour garantir la position après recalage du layout DOM
    const rafId = requestAnimationFrame(() => {
      scrollToTop();
    });
    const timerId = setTimeout(() => {
      scrollToTop();
    }, 60);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timerId);
    };
  }, [effectiveStepIndex]);

  const carouselTouchStartXRef = useRef<number | null>(null);
  const carouselTouchStartYRef = useRef<number | null>(null);
  const carouselTouchStartTimeRef = useRef<number>(0);
  const carouselSwipedRef = useRef(false);

  const handleCarouselTouchStart = (e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    // Ne pas déclencher de balayage si l'utilisateur interagit avec des champs de formulaire,
    // des curseurs (range sliders), des carrousels horizontaux ou l'en-tête de navigation
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.closest('input[type="range"]') ||
      target.closest('[data-text-carousel]') ||
      target.closest('.overflow-x-auto') ||
      target.closest('[data-step-header]')
    ) {
      return;
    }
    if (e.touches.length === 1) {
      carouselTouchStartXRef.current = e.touches[0].clientX;
      carouselTouchStartYRef.current = e.touches[0].clientY;
      carouselTouchStartTimeRef.current = Date.now();
    }
  };

  const handleCarouselTouchMove = (_e: React.TouchEvent) => {
    // Événement réservé au suivi tactile continu
  };

  const handleCarouselTouchEnd = (e: React.TouchEvent) => {
    if (carouselTouchStartXRef.current === null || carouselTouchStartYRef.current === null) return;
    if (e.changedTouches.length === 0) return;
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const diffX = endX - carouselTouchStartXRef.current;
    const diffY = Math.abs(endY - carouselTouchStartYRef.current);
    const duration = Date.now() - carouselTouchStartTimeRef.current;

    const isFlick = Math.abs(diffX) > 25 && duration < 300;
    const isStandardSwipe = Math.abs(diffX) > 40;

    // Détection d'un balayage horizontal net avec prédominance horizontale nette
    if ((isStandardSwipe || isFlick) && Math.abs(diffX) > diffY * 1.1) {
      carouselSwipedRef.current = true;
      setTimeout(() => {
        carouselSwipedRef.current = false;
      }, 250);

      if (diffX < 0 && effectiveStepIndex < MOBILE_STEPS.length - 1) {
        goToMobileStep(effectiveStepIndex + 1);
      } else if (diffX > 0 && effectiveStepIndex > 0) {
        goToMobileStep(effectiveStepIndex - 1);
      }
    }
    carouselTouchStartXRef.current = null;
    carouselTouchStartYRef.current = null;
  };

  const handleCarouselTouchCancel = () => {
    carouselTouchStartXRef.current = null;
    carouselTouchStartYRef.current = null;
  };

  // État Hold-to-Preview sur curseurs (<input type="range">)
  const [isLiveScrubbing, setIsLiveScrubbing] = useState(false);
  const [liveScrubData, setLiveScrubData] = useState<{ label: string; value: string } | null>(null);

  const handleSliderPointerDown = (
    e: React.PointerEvent<HTMLInputElement>,
    label: string,
    valueDisplay: string
  ) => {
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (_) { }
    if (typeof window !== 'undefined' && window.innerWidth < 920) {
      setLiveScrubData({ label, value: valueDisplay });
      setIsLiveScrubbing(true);
    }
  };

  const handleSliderPointerUp = (e: React.PointerEvent<HTMLInputElement>) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (_) { }
    setIsLiveScrubbing(false);
    setLiveScrubData(null);
  };

  const handleSliderPointerCancel = () => {
    setIsLiveScrubbing(false);
    setLiveScrubData(null);
  };

  useEffect(() => {
    const handleGlobalPointerUp = () => {
      setIsLiveScrubbing(false);
      setLiveScrubData(null);
    };
    window.addEventListener('pointerup', handleGlobalPointerUp);
    window.addEventListener('pointercancel', handleGlobalPointerUp);
    return () => {
      window.removeEventListener('pointerup', handleGlobalPointerUp);
      window.removeEventListener('pointercancel', handleGlobalPointerUp);
    };
  }, []);

  const [isHeroDismissed, setIsHeroDismissed] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const section1Ref = useRef<HTMLDivElement>(null);
  const section2Ref = useRef<HTMLDivElement>(null);
  const section3Ref = useRef<HTMLDivElement>(null);
  const section4Ref = useRef<HTMLDivElement>(null);
  const section5Ref = useRef<HTMLDivElement>(null);
  const section6Ref = useRef<HTMLDivElement>(null);
  const section7Ref = useRef<HTMLDivElement>(null);
  const initialInputJsonRef = useRef<string | null>(null);

  // Deep-linking visuel interactif (Tap-to-Edit & Navigation d'étape)
  const handleVisualElementClick = (
    target: 'decor' | 'subject' | 'subject2' | 'logo' | 'texts' | 'textSizes',
    specificField?: string
  ) => {
    if ((target as string) === 'subject2') {
      setActiveSection('subject');
      setActiveSubjectTab('secondary');
      goToMobileStep(1);
      setFocusedTarget?.('subject' as FocusedTarget);
      setTimeout(() => {
        section2Ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 120);
      return;
    }

    if (target === 'texts' || target === 'textSizes') {
      setActiveSection('textSizes');
      goToMobileStep(4);
      if (specificField) {
        setFocusedTextField(specificField);
      }
      setFocusedTarget?.((specificField as FocusedTarget) || 'eventName');
      setTimeout(() => {
        section6Ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 120);
      return;
    }

    const map = {
      decor: { section: 'decor' as ActiveSection, step: 0, ref: section1Ref, focused: 'decor' as FocusedTarget },
      subject: { section: 'subject' as ActiveSection, step: 1, ref: section2Ref, focused: 'subject' as FocusedTarget },
      logo: { section: 'logo' as ActiveSection, step: 2, ref: section3Ref, focused: 'logo' as FocusedTarget },
      texts: { section: 'textSizes' as ActiveSection, step: 4, ref: section6Ref, focused: 'eventName' as FocusedTarget },
      textSizes: { section: 'textSizes' as ActiveSection, step: 4, ref: section6Ref, focused: 'eventName' as FocusedTarget },
    };

    const targetConfig = map[target];
    if (!targetConfig) return;

    setActiveSection(targetConfig.section);
    goToMobileStep(targetConfig.step);
    setFocusedTarget?.(targetConfig.focused);

    setTimeout(() => {
      targetConfig.ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 120);
  };

  useEffect(() => {
    if (!focusedTarget) return;
    if (focusedTarget === 'decor') {
      setActiveSection('decor');
      goToMobileStep(0);
      section1Ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (focusedTarget === 'subject') {
      setActiveSection('subject');
      goToMobileStep(1);
      section2Ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (focusedTarget === 'logo') {
      setActiveSection('logo');
      goToMobileStep(2);
      section3Ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (
      [
        'headline',
        'djName',
        'date',
        'location',
        'headerTagline',
        'eventName',
        'punchline',
        'headlineBadgeText',
        'timeSlot',
        'venue',
        'infoBadge',
      ].includes(focusedTarget)
    ) {
      setActiveSection('textSizes');
      goToMobileStep(4);
      setFocusedTextField(focusedTarget);
      section6Ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [focusedTarget]);

  // Initialisation automatique lors de l'accès via /?intent=headliner_drop (Landing Page Dropper)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('intent') === 'headliner_drop') {
      setActiveSection('textSizes');
      goToMobileStep(4);
      onSelectFormat?.('a3');
      setInput((prev) => {
        if (prev.layoutTemplate === 'headliner_event') return prev;
        return {
          ...prev,
          layoutTemplate: 'headliner_event',
        };
      });
      setTimeout(() => {
        section6Ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 250);
    }
  }, []);

  useEffect(() => {
    if (initialInputJsonRef.current === null) {
      initialInputJsonRef.current = JSON.stringify({
        eventName: input.eventName,
        djName: input.djName,
        headerTagline: input.headerTagline,
        date: input.date,
        timeSlot: input.timeSlot,
        venue: input.venue,
        punchline: input.punchline,
        djPhoto: input.djPhoto,
        backgroundImage: input.backgroundImage,
        logoImage: input.logoImage,
        backgroundTone: input.backgroundTone,
        accentColor: input.accentColor,
      });
      return;
    }

    if (!isHeroDismissed) {
      const currentJson = JSON.stringify({
        eventName: input.eventName,
        djName: input.djName,
        headerTagline: input.headerTagline,
        date: input.date,
        timeSlot: input.timeSlot,
        venue: input.venue,
        punchline: input.punchline,
        djPhoto: input.djPhoto,
        backgroundImage: input.backgroundImage,
        logoImage: input.logoImage,
        backgroundTone: input.backgroundTone,
        accentColor: input.accentColor,
      });
      if (currentJson !== initialInputJsonRef.current) {
        setIsHeroDismissed(true);
      }
    }
  }, [input, isHeroDismissed]);

  const handleLoadDemoExample = () => {
    setInput((prev) => ({
      ...prev,
      ...INITIAL_DEMO_STATE,
      formatTransforms: getDefaultFormatTransforms(
        INITIAL_DEMO_STATE.subjectScale ?? 1.0,
        INITIAL_DEMO_STATE.subjectPositionY ?? 15
      ),
    }));

    setIsHeroDismissed(true);
    setActiveSection('decor');
  };

  const handleStartFromScratch = () => {
    const blank = createBlankEventInput();
    setInput(blank);
    try {
      localStorage.setItem('signaid_studio_project_draft', JSON.stringify(blank));
      safeSaveProjectToLocalStorage(['signaid_studio_current_project', 'droppaid_last_event_input', 'signaid_studio_project_draft'], blank);
    } catch { }
    setIsHeroDismissed(true);
    setActiveSection('decor');
    showToast('Studio vierge initialisé : page blanche totale.', 'info');
    requestAnimationFrame(() => {
      section1Ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  // Synchronisation automatique en continu de l'état complet du projet actif dans le localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!input || Object.keys(input).length === 0) return;
    try {
      localStorage.setItem('signaid_studio_project_draft', JSON.stringify(input));
    } catch {
      try {
        safeSaveProjectToLocalStorage('signaid_studio_project_draft', input);
      } catch { }
    }
  }, [input]);

  // Restauration de sécurité au montage si l'état input est vide
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isBlank = !input.eventName && !input.djName && !input.djPhoto && !input.backgroundImage;
    if (isBlank) {
      try {
        const saved = localStorage.getItem('signaid_studio_project_draft');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === 'object') {
            setInput((prev) => ({ ...prev, ...parsed }));
          }
        }
      } catch { }
    }
  }, []);

  const [isGeneratingBg, setIsGeneratingBg] = useState(false);
  const [isGeneratingSubject, setIsGeneratingSubject] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCuttingBg, setIsCuttingBg] = useState(false);
  const [isCroppingLogoBg, setIsCroppingLogoBg] = useState(false);
  const [isRemasteringLogo, setIsRemasteringLogo] = useState(false);
  const [remasterSuccess, setRemasterSuccess] = useState(false);
  const [isRemasteringSubject, setIsRemasteringSubject] = useState(false);
  const [remasterSubjectSuccess, setRemasterSubjectSuccess] = useState(false);
  const [isHarmonizingSubject, setIsHarmonizingSubject] = useState(false);
  const [harmonizeSubjectSuccess, setHarmonizeSubjectSuccess] = useState(false);

  // Détourage interactif par Pipette (Color Picker / Chroma Key)
  const [isPickingColor, setIsPickingColor] = useState(false);
  const [selectedChromakeyColor, setSelectedChromakeyColor] = useState<{ r: number; g: number; b: number } | null>(null);
  const [chromakeyTolerance, setChromakeyTolerance] = useState<number>(25);
  const [isChromakeyContiguous, setIsChromakeyContiguous] = useState<boolean>(true);
  const [primaryRemovedColors, setPrimaryRemovedColors] = useState<RemovedColorItem[]>([]);
  const [secondaryRemovedColors, setSecondaryRemovedColors] = useState<RemovedColorItem[]>([]);
  const lastChromakeyPointRef = useRef<{ x: number; y: number } | null>(null);
  const chromakeyOriginalRef = useRef<string | null>(null);
  const chromakeyDebounceRef = useRef<NodeJS.Timeout | null>(null);

  const getTransformsForFormat = (fmt: string) => {
    const masterScale =
      input.formatTransforms?.post?.scale ??
      (typeof input.djPhotoScale === 'number'
        ? input.djPhotoScale
        : typeof input.subjectScale === 'number'
          ? input.subjectScale
          : 1.0);
    const masterOffset =
      input.formatTransforms?.post?.offsetY ??
      (typeof input.djPhotoOffsetY === 'number'
        ? input.djPhotoOffsetY
        : typeof input.subjectPositionY === 'number'
          ? input.subjectPositionY
          : 0);
    const masterOffsetX =
      input.formatTransforms?.post?.offsetX ??
      (typeof input.djPhotoOffsetX === 'number'
        ? input.djPhotoOffsetX
        : typeof input.subjectPositionX === 'number'
          ? input.subjectPositionX
          : 0);
    const defaults = getDefaultFormatTransforms(masterScale, masterOffset, masterOffsetX);
    const configured = input.formatTransforms?.[fmt];
    const isLegacyDemoA3 =
      fmt === 'a3' &&
      configured &&
      configured.scale === 1 &&
      configured.offsetY === -18;

    if (configured && !isLegacyDemoA3) {
      if (configured.isCustom || fmt === 'post') {
        return {
          ...configured,
          offsetX: configured.offsetX ?? masterOffsetX ?? 0,
        };
      }
      return defaults[fmt as keyof typeof defaults] || configured;
    }
    return defaults[fmt as keyof typeof defaults] || {
      scale: masterScale,
      offsetY: masterOffset,
      offsetX: masterOffsetX,
      alignX: 'center',
      isCustom: false,
    };
  };

  const currentTransforms = getTransformsForFormat(previewFormat);

  // État glisser-déposer libre du sujet à la souris (Drag & Drop libre)
  const [isDraggingSubject, setIsDraggingSubject] = useState(false);
  const subjectDragStateRef = useRef<{
    startX: number;
    startY: number;
    initialOffsetX: number;
    initialOffsetY: number;
    containerWidth: number;
    containerHeight: number;
    hasMoved: boolean;
    target: 'primary' | 'secondary';
  } | null>(null);

  const handleSubjectDragStart = (
    e: React.MouseEvent<HTMLElement> | React.PointerEvent<HTMLElement> | any,
    target: 'primary' | 'secondary' = 'primary'
  ) => {
    if (e && 'button' in e && typeof e.button === 'number' && e.button !== 0) return;
    e?.stopPropagation?.();

    const targetEl = e.currentTarget as HTMLElement;
    const container =
      (targetEl.closest('[data-poster-container="true"]') as HTMLElement | null) ||
      (targetEl.closest('[class*="@container"]') as HTMLElement | null) ||
      (targetEl.closest('.\\@container') as HTMLElement | null) ||
      containerRef.current;
    const containerRect = container?.getBoundingClientRect() || targetEl.parentElement?.getBoundingClientRect();
    const containerWidth = containerRect && containerRect.width > 0 ? containerRect.width : 400;
    const containerHeight = containerRect && containerRect.height > 0 ? containerRect.height : 400;

    const currentTr = getTransformsForFormat(previewFormat);
    const secondaryResolved = resolveSecondarySubjectTransform(
      inputRef.current,
      previewFormat,
      inputRef.current.djPhoto ? {
        scale: currentTr.scale,
        offsetY: currentTr.offsetY,
        offsetX: currentTr.offsetX,
        alignX: currentTr.alignX,
      } : null
    );
    const initialOffsetX = target === 'secondary'
      ? secondaryResolved.offsetX
      : (currentTr.offsetX ?? 0);
    const initialOffsetY = target === 'secondary'
      ? secondaryResolved.offsetY
      : (currentTr.offsetY ?? 0);

    try {
      if ('setPointerCapture' in targetEl && 'pointerId' in (e as any)) {
        targetEl.setPointerCapture((e as any).pointerId);
      }
    } catch { }

    subjectDragStateRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialOffsetX,
      initialOffsetY,
      containerWidth,
      containerHeight,
      hasMoved: false,
      target,
    };
  };

  const handleSubjectDragMove = (clientX: number, clientY: number) => {
    const state = subjectDragStateRef.current;
    if (!state) return;

    const deltaX = clientX - state.startX;
    const deltaY = clientY - state.startY;

    if (!state.hasMoved) {
      if (Math.hypot(deltaX, deltaY) > 2) {
        state.hasMoved = true;
        setIsDraggingSubject(true);
      } else {
        return;
      }
    }

    const deltaPercentX = (deltaX / state.containerWidth) * 100;
    const deltaPercentY = (deltaY / state.containerHeight) * 100;

    const newOffsetX = Math.round((state.initialOffsetX + deltaPercentX) * 10) / 10;
    const newOffsetY = Math.round((state.initialOffsetY + deltaPercentY) * 10) / 10;

    const clampedX = Math.max(-80, Math.min(80, newOffsetX));
    const clampedY = Math.max(-60, Math.min(200, newOffsetY));

    if (state.target === 'secondary') {
      const currentTr = getTransformsForFormat(previewFormat);
      setInput((prev) => {
        const updated = applySecondarySubjectUpdate(
          prev,
          previewFormat,
          {
            scale: currentTr.scale,
            offsetY: currentTr.offsetY,
            offsetX: currentTr.offsetX,
            alignX: currentTr.alignX,
          },
          { offsetX: clampedX, offsetY: clampedY }
        );
        return {
          ...updated,
          subject2OffsetX: clampedX,
          subject2OffsetY: clampedY,
          secondaryDjPhotoOffsetX: clampedX,
          secondaryDjPhotoOffsetY: clampedY,
        };
      });
      return;
    }

    const currentTr = getTransformsForFormat(previewFormat);
    onUpdateTransform?.(currentTr.scale, clampedY);
    setInput((prev) => {
      const existingFmt = prev.formatTransforms?.[previewFormat];
      return {
        ...prev,
        ...(previewFormat === 'post' || previewFormat === 'a3'
          ? {
            djPhotoOffsetY: clampedY,
            subjectPositionY: clampedY,
            djPhotoOffsetX: clampedX,
            subjectPositionX: clampedX,
          }
          : {}),
        formatTransforms: {
          ...(prev.formatTransforms || {}),
          [previewFormat]: {
            ...existingFmt,
            scale: existingFmt?.scale ?? currentTr.scale,
            offsetY: clampedY,
            offsetX: clampedX,
            alignX: existingFmt?.alignX ?? currentTr.alignX ?? 'center',
            isCustom: true,
          },
        },
      };
    });
  };

  const handleSubjectDragEnd = (e?: React.SyntheticEvent) => {
    if (e) {
      e.stopPropagation();
      const targetEl = e.currentTarget as HTMLElement;
      try {
        if ('releasePointerCapture' in targetEl && 'pointerId' in (e as any)) {
          targetEl.releasePointerCapture((e as any).pointerId);
        }
      } catch { }
    }

    const state = subjectDragStateRef.current;
    const didMove = state?.hasMoved;
    subjectDragStateRef.current = null;
    setIsDraggingSubject(false);

    if (didMove) {
      hasJustDraggedRef.current = true;
      setTimeout(() => {
        hasJustDraggedRef.current = false;
      }, 350);
      saveImmediateToLocalStorage(inputRef.current);
    } else if (state) {
      if (state.target === 'secondary') {
        setActiveSection('subject');
        setActiveSubjectTab('secondary');
      } else {
        handleVisualElementClick('subject');
      }
    }
  };

  const handleUpdateSubjectPosition = useCallback((pos: { x: number; y: number }) => {
    const clampedX = Math.max(-80, Math.min(80, Math.round(pos.x * 10) / 10));
    const clampedY = Math.max(-60, Math.min(200, Math.round(pos.y * 10) / 10));

    const currentTr = getTransformsForFormat(previewFormat);
    onUpdateTransform?.(currentTr.scale, clampedY);
    setInput((prev) => {
      const existingFmt = prev.formatTransforms?.[previewFormat];
      return {
        ...prev,
        ...(previewFormat === 'post' || previewFormat === 'a3'
          ? {
            djPhotoOffsetY: clampedY,
            subjectPositionY: clampedY,
            djPhotoOffsetX: clampedX,
            subjectPositionX: clampedX,
          }
          : {}),
        formatTransforms: {
          ...(prev.formatTransforms || {}),
          [previewFormat]: {
            ...existingFmt,
            scale: existingFmt?.scale ?? currentTr.scale,
            offsetY: clampedY,
            offsetX: clampedX,
            alignX: existingFmt?.alignX ?? currentTr.alignX ?? 'center',
            isCustom: true,
          },
        },
      };
    });
  }, [previewFormat, onUpdateTransform, getTransformsForFormat]);

  // Sélection du Sujet 1 / Sujet 2 depuis le grand canevas desktop (clic sans déplacement)
  useEffect(() => {
    const onSelectSubject = (e: Event) => {
      const layer = (e as CustomEvent<{ layer?: 'primary' | 'secondary' }>).detail?.layer;
      setActiveSection('subject');
      setActiveSubjectTab(layer === 'secondary' ? 'secondary' : 'primary');
    };
    window.addEventListener(SELECT_SUBJECT_EVENT, onSelectSubject);
    return () => window.removeEventListener(SELECT_SUBJECT_EVENT, onSelectSubject);
  }, []);

  useEffect(() => {
    const handleGlobalWindowPointerUp = () => {
      if (subjectDragStateRef.current) {
        handleSubjectDragEnd();
      }
    };
    const handleGlobalWindowPointerMove = (e: PointerEvent) => {
      if (subjectDragStateRef.current) {
        handleSubjectDragMove(e.clientX, e.clientY);
      }
    };
    const handleGlobalWindowMouseMove = (e: MouseEvent) => {
      if (subjectDragStateRef.current) {
        handleSubjectDragMove(e.clientX, e.clientY);
      }
    };

    window.addEventListener('pointerup', handleGlobalWindowPointerUp);
    window.addEventListener('pointercancel', handleGlobalWindowPointerUp);
    window.addEventListener('mouseup', handleGlobalWindowPointerUp);
    window.addEventListener('pointermove', handleGlobalWindowPointerMove);
    window.addEventListener('mousemove', handleGlobalWindowMouseMove);

    return () => {
      window.removeEventListener('pointerup', handleGlobalWindowPointerUp);
      window.removeEventListener('pointercancel', handleGlobalWindowPointerUp);
      window.removeEventListener('mouseup', handleGlobalWindowPointerUp);
      window.removeEventListener('pointermove', handleGlobalWindowPointerMove);
      window.removeEventListener('mousemove', handleGlobalWindowMouseMove);
    };
  }, [previewFormat]);

  const isToneActive = input.isBackgroundToneEnabled !== false;
  const currentTone = typeof input.backgroundTone === 'number'
    ? input.backgroundTone
    : 0.5;

  // RÈGLE STRICTE : Calcul de l'overlay blanc/noir et neutralisation en position neutre
  const toneOverlay = computeToneOverlay(currentTone, isToneActive, input.backgroundBrightness);
  // Curseur de tonalité au centre exact (valeur neutre, 50% ou 0 selon l'échelle)
  const isToneCenter = toneOverlay.isNeutral;

  const isLightCanvas = isToneActive && !isToneCenter && currentTone < 0.48;
  const toneRgb = isToneCenter ? 0 : Math.round(255 * (1 - currentTone));
  const canvasBgColor = isToneActive && !isToneCenter
    ? `rgb(${toneRgb}, ${toneRgb}, ${toneRgb})`
    : 'transparent';
  const primaryColor = input.accentColor || input.dynamicTheme?.primaryAccent || '#FF6B00';

  // Calcul du contraste selon la tonalité active :
  const isLightTone = input.isBackgroundToneEnabled !== false && !isToneCenter && (input.backgroundTone ?? 0.5) < 0.48;
  const activeStyleKey = getActiveStyleKey(input.typographyStyle, input.headerTagline);

  const infoBadgeStyle = isLightTone
    ? {
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: 'rgba(0, 0, 0, 0.2)',
      color: '#18181b', // zinc-900 pour fond clair
      backdropFilter: 'blur(16px)',
    }
    : {
      backgroundColor: 'rgba(0, 0, 0, 0.92)',
      borderColor: 'rgba(255, 255, 255, 0.25)',
      color: '#f4f4f5', // zinc-100 pour fond sombre
      backdropFilter: 'blur(16px)',
    };

  // --- PACK MARKETING & TEXTES RÉSEAUX ---
  const [selectedMarketingTone, setSelectedMarketingTone] = useState<MarketingTone>('official');
  const [isGeneratingMarketing, setIsGeneratingMarketing] = useState(false);
  const [marketingData, setMarketingData] = useState<MarketingPackData | null>(null);
  const [activeMarketingTab, setActiveMarketingTab] = useState<MarketingTab>('post');
  const [copiedMarketingKey, setCopiedMarketingKey] = useState<string | null>(null);

  const handleCopyMarketingText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMarketingKey(key);
    setTimeout(() => setCopiedMarketingKey(null), 2000);
  };

  const handleGenerateMarketingPack = async () => {
    setIsGeneratingMarketing(true);

    const eventName = input.eventName?.trim() || 'ÉVÉNEMENT';
    const djName = input.djName?.trim() || 'INTERVENANT';
    const genre = input.headerTagline?.trim() || 'SURTITRE';
    const punchline = input.punchline?.trim() || 'SOUS-TITRE';
    const venue = input.venue?.trim() || 'LIEU DE L\'ÉVÉNEMENT';
    const date = input.date?.trim() || 'Prochainement';

    try {
      const packData = await generateMarketingPackAi({
        eventName,
        djName,
        headlineBadgeText: input.headlineBadgeText,
        genre,
        punchline,
        venue,
        date,
        ticketPrice: '15€',
        colorPalette: primaryColor,
        tone: selectedMarketingTone,
      });
      if (packData) {
        setMarketingData({
          caption: packData.caption,
          dmInvitation: packData.dmInvitation,
          hashtags: Array.isArray(packData.hashtags) ? packData.hashtags : [],
          punchlines: Array.isArray(packData.punchlines) ? packData.punchlines : [],
          ticketPitch: packData.ticketPitch,
        });
        setIsGeneratingMarketing(false);
        return;
      }
    } catch (_err) {
      // Repli instantané
    }

    const fallback = generateDeterministicMarketingPack(input, selectedMarketingTone);
    setMarketingData(fallback);
    setIsGeneratingMarketing(false);
  };

  const hasFade = input.isSubjectGradientFade !== false && typeof input.subjectFadeIntensity === 'number' && input.subjectFadeIntensity > 0;
  const fadeStartPercent = Math.max(85, 100 - Math.min(15, input.subjectFadeIntensity || 15));
  const containerFadeMask: React.CSSProperties = hasFade
    ? {
      WebkitMaskImage: `linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) ${fadeStartPercent}%, transparent 100%)`,
      maskImage: `linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) ${fadeStartPercent}%, transparent 100%)`,
    }
    : {
      WebkitMaskImage: 'none',
      maskImage: 'none',
    };

  const getMiniAspectClass = () => {
    switch (previewFormat) {
      case 'story': return 'aspect-[9/16] h-[260px] w-auto max-w-full';
      case 'a3': return 'aspect-[297/420] h-[240px] w-auto max-w-full';
      case 'post':
      case 'tshirt': return 'aspect-square h-[200px] w-auto max-w-full';
      case 'banner': return 'aspect-[10/3] w-full max-w-full h-auto';
      default: return 'aspect-square h-[200px] w-auto max-w-full';
    }
  };

  const getTypographyConfig = () => {
    const rawStyle = (input.typographyStyle || 'futur').toLowerCase();
    const style = rawStyle === 'hard' ? 'techno' : rawStyle;
    const textMain = isLightCanvas ? 'text-black' : 'text-white';
    const textSub = isLightCanvas ? 'text-zinc-800' : 'text-zinc-300';
    const mainTextColor = isLightCanvas ? '#000000' : '#ffffff';
    const smartTextShadow = 'none';
    const smartShadowClass = '';

    if (style === 'techno') {
      return {
        titleClass: `font-black tracking-[0.12em] ${smartShadowClass} uppercase text-[7cqi] leading-[1.1]`,
        djClass: `font-black tracking-[0.12em] uppercase ${textMain} ${smartShadowClass} text-[6.5cqi] leading-[1.1]`,
        badgeClass: `font-mono uppercase font-bold tracking-[1.5px] ${textSub} text-[2.2cqi]`,
        subClass: `font-mono tracking-wide uppercase ${textSub} text-[2.6cqi]`,
        titleStyle: {
          fontFamily: "'Impact', 'Arial Black', -apple-system, sans-serif",
          color: mainTextColor,
          letterSpacing: '0.12em',
          textShadow: 'none',
        },
        djStyle: {
          fontFamily: "'Impact', 'Arial Black', -apple-system, sans-serif",
          color: mainTextColor,
          letterSpacing: '0.12em',
          textShadow: 'none',
        },
      };
    }
    if (style === 'urban') {
      return {
        titleClass: `tracking-wider ${smartShadowClass} uppercase text-[7cqi] leading-[1.1]`,
        djClass: `tracking-wide uppercase ${textMain} ${smartShadowClass} text-[6.5cqi] leading-[1.1]`,
        badgeClass: `font-mono uppercase font-black tracking-[1.5px] ${textSub} text-[2.2cqi]`,
        subClass: `font-mono tracking-wide uppercase ${textSub} text-[2.6cqi]`,
        titleStyle: {
          fontFamily: "'Permanent Marker', cursive, sans-serif",
          color: mainTextColor,
          textShadow: 'none',
        },
        djStyle: {
          fontFamily: "'Permanent Marker', cursive, sans-serif",
          color: mainTextColor,
          textShadow: 'none',
        },
      };
    }
    return {
      titleClass: `font-black tracking-widest uppercase ${smartShadowClass} text-[7cqi] leading-[1.1]`,
      djClass: `font-black tracking-wider uppercase ${textMain} ${smartShadowClass} text-[6.5cqi] leading-[1.1]`,
      badgeClass: `font-mono uppercase tracking-[2px] ${textSub} text-[2.2cqi]`,
      subClass: `font-mono tracking-wide uppercase ${textSub} text-[2.6cqi]`,
      titleStyle: {
        fontFamily: "'Syne', sans-serif",
        color: mainTextColor,
        textShadow: 'none',
      },
      djStyle: {
        fontFamily: "'Syne', sans-serif",
        color: mainTextColor,
        textShadow: 'none',
      },
    };
  };

  const typo = getTypographyConfig();

  const getBannerTypographyConfig = () => {
    const rawStyle = (input.typographyStyle || 'futur').toLowerCase();
    const style = rawStyle === 'hard' ? 'techno' : rawStyle;
    const textMain = isLightCanvas ? 'text-black' : 'text-white';
    const textSub = isLightCanvas ? 'text-zinc-800' : 'text-zinc-300';
    const mainTextColor = isLightCanvas ? '#000000' : '#ffffff';
    const smartTextShadow = 'none';
    const smartShadowClass = '';

    if (style === 'techno') {
      return {
        titleClass: `font-black tracking-[0.12em] ${smartShadowClass} uppercase leading-tight break-words hyphens-auto`,
        djClass: `font-black tracking-[0.12em] uppercase ${textMain} ${smartShadowClass} leading-tight break-words hyphens-auto`,
        badgeClass: `font-mono uppercase font-bold tracking-[1.5px] ${textSub}`,
        subClass: `font-mono tracking-wide uppercase ${textSub}`,
        titleStyle: {
          fontFamily: "'Impact', 'Arial Black', -apple-system, sans-serif",
          color: mainTextColor,
          letterSpacing: '0.12em',
          textShadow: 'none',
        },
        djStyle: {
          fontFamily: "'Impact', 'Arial Black', -apple-system, sans-serif",
          color: mainTextColor,
          letterSpacing: '0.12em',
          textShadow: 'none',
        },
      };
    }
    if (style === 'urban') {
      return {
        titleClass: `tracking-tighter ${smartShadowClass} uppercase leading-tight break-words hyphens-auto`,
        djClass: `tracking-tighter uppercase ${textMain} ${smartShadowClass} leading-tight break-words hyphens-auto`,
        badgeClass: `font-mono uppercase font-black tracking-[1.5px] ${textSub}`,
        subClass: `font-mono tracking-wide uppercase ${textSub}`,
        titleStyle: {
          fontFamily: "'Permanent Marker', cursive, sans-serif",
          color: mainTextColor,
          textShadow: 'none',
        },
        djStyle: {
          fontFamily: "'Permanent Marker', cursive, sans-serif",
          color: mainTextColor,
          textShadow: 'none',
        },
      };
    }
    return {
      titleClass: `font-black tracking-tighter uppercase ${smartShadowClass} leading-tight break-words hyphens-auto`,
      djClass: `font-black tracking-tighter uppercase ${textMain} ${smartShadowClass} leading-tight break-words hyphens-auto`,
      badgeClass: `font-mono uppercase tracking-[2px] ${textSub}`,
      subClass: `font-mono tracking-wide uppercase ${textSub}`,
      titleStyle: {
        fontFamily: "'Syne', sans-serif",
        color: mainTextColor,
        textShadow: 'none',
      },
      djStyle: {
        fontFamily: "'Syne', sans-serif",
        color: mainTextColor,
        textShadow: 'none',
      },
    };
  };

  const bannerTypo = getBannerTypographyConfig();
  const hasCustomBackground = Boolean(input.customBackground || input.backgroundImage || input.bgImage);
  const customBackgroundSrc = input.customBackground || input.backgroundImage || input.bgImage || '';

  const activePreviewBgKey = (['post', 'story', 'banner', 'a3'].includes(previewFormat) ? previewFormat : 'a3') as 'post' | 'story' | 'banner' | 'a3';
  const currentPreviewBg = resolveBackgroundTransformForFormat(input, activePreviewBgKey);
  const isCurrentPreviewBgOffset = (currentPreviewBg.offsetX !== 0) || (currentPreviewBg.offsetY !== 0);

  const handleResetBackgroundPosition = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setInput((prev) => {
      const curFmt = prev.formatTransforms?.[activePreviewBgKey] || {};
      return {
        ...prev,
        formatTransforms: {
          ...(prev.formatTransforms || {}),
          [activePreviewBgKey]: {
            ...curFmt,
            background: {
              offsetX: 0,
              offsetY: 0,
              scale: curFmt.background?.scale ?? prev.backgroundScale ?? 1.0,
            },
          },
        },
        ...(activePreviewBgKey === 'post' ? { backgroundOffsetX: 0, backgroundOffsetY: 0 } : {}),
      };
    });
  };

  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: 'djPhoto' | 'backgroundImage'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setInput((prev) => ({
        ...prev,
        [field]: dataUrl,
        ...(field === 'backgroundImage' ? { bgImage: dataUrl, customBackground: dataUrl } : {}),
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
    rawTshirtLogoOriginalRef.current = localBlobUrl;

    setInput((prev) => {
      const isFrontLogoInherited =
        !prev.tshirtCustomLogo ||
        isDemoLogo(prev.tshirtCustomLogo) ||
        prev.tshirtCustomLogo === prev.logoUrl ||
        prev.tshirtCustomLogo === prev.logoImage ||
        prev.tshirtCustomLogo === prev.rawLogoImage ||
        prev.tshirtCustomLogo === prev.rawTshirtLogoOriginal;
      const isBackLogoInherited =
        !prev.tshirtBackCustomLogo ||
        isDemoLogo(prev.tshirtBackCustomLogo);
      const nextLogoFormatTransforms = { ...(prev.logoFormatTransforms || {}) };
      if (
        nextLogoFormatTransforms.a3 &&
        Math.abs((nextLogoFormatTransforms.a3.x ?? 0) - 64.9) < 0.2 &&
        Math.abs((nextLogoFormatTransforms.a3.y ?? 0) - 62.5) < 0.2
      ) {
        delete nextLogoFormatTransforms.a3;
      }

      return {
        ...prev,
        logoImage: localBlobUrl,
        logoUrl: localBlobUrl,
        rawLogoImage: localBlobUrl,
        logoColorMode: 'auto',
        logoFormatTransforms: nextLogoFormatTransforms,
        // Remplacer le logo textile Face si hérité du studio
        tshirtCustomLogo: isFrontLogoInherited ? localBlobUrl : prev.tshirtCustomLogo,
        rawTshirtLogoOriginal: isFrontLogoInherited ? localBlobUrl : prev.rawTshirtLogoOriginal,
        // Par défaut, le Dos hérite de la Face tant qu'un logo spécifique n'a pas été chargé sur le Dos
        tshirtBackCustomLogo: isBackLogoInherited ? undefined : prev.tshirtBackCustomLogo,
      };
    });
    notifyHubProjectUpdated();
    e.target.value = '';

    // 2. Traitement d'optimisation d'arrière-plan (Firebase Storage ou Canvas < 300 Ko)
    optimizeLogoForUpload(file)
      .then((optimizedUrl) => {
        if (optimizedUrl) {
          rawLogoOriginalRef.current = optimizedUrl;
          if (rawTshirtLogoOriginalRef.current === localBlobUrl) {
            rawTshirtLogoOriginalRef.current = optimizedUrl;
          }
          setInput((prev) => {
            const updates: Partial<EventInput> = {};
            if (prev.logoUrl === localBlobUrl || prev.logoImage === localBlobUrl) {
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
          notifyHubProjectUpdated();
        }
      })
      .catch((err) => {
        console.warn('[StudioComposer] Erreur optimisation logo affiche:', err);
      });
  };

  const handleTshirtLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isUploadingOnBack = activeView === 'dos';

    // 1. Immédiat : URL locale en mémoire pour l'état React et le rendu instantané du gabarit DTF
    const localBlobUrl = createLocalLogoPreview(file);
    if (!isUploadingOnBack) {
      rawTshirtLogoOriginalRef.current = localBlobUrl;
    }

    setInput((prev) => {
      if (isUploadingOnBack) {
        // Uniquement lorsque l'utilisateur est sur la vue Dos : le logo arrière devient indépendant
        return {
          ...prev,
          tshirtBackCustomLogo: localBlobUrl,
          tshirtBackLogoDisabled: false,
        };
      }

      const isPosterLogoDemo = isDemoLogo(prev.logoImage) || isDemoLogo(prev.logoUrl);
      const isBackLogoInherited =
        !prev.tshirtBackCustomLogo ||
        isDemoLogo(prev.tshirtBackCustomLogo);

      if (isPosterLogoDemo) {
        rawLogoOriginalRef.current = localBlobUrl;
      }

      return {
        ...prev,
        tshirtCustomLogo: localBlobUrl,
        rawTshirtLogoOriginal: localBlobUrl,
        tshirtLogoColorMode: 'original',
        logoImage: isPosterLogoDemo ? localBlobUrl : prev.logoImage,
        logoUrl: isPosterLogoDemo ? localBlobUrl : prev.logoUrl,
        // Conserver l'héritage automatique Face ➔ Dos tant qu'aucun logo n'a été chargé explicitement sur le Dos
        tshirtBackCustomLogo: isBackLogoInherited ? undefined : prev.tshirtBackCustomLogo,
      };
    });
    onTriggerDtfPress?.();
    e.target.value = '';

    // 2. Traitement d'optimisation d'arrière-plan (Firebase Storage ou Canvas < 300 Ko)
    optimizeLogoForUpload(file)
      .then((optimizedUrl) => {
        if (optimizedUrl) {
          if (!isUploadingOnBack) {
            rawTshirtLogoOriginalRef.current = optimizedUrl;
          }
          if (rawLogoOriginalRef.current === localBlobUrl) {
            rawLogoOriginalRef.current = optimizedUrl;
          }
          setInput((prev) => {
            const updates: Partial<EventInput> = {};
            if (prev.tshirtCustomLogo === localBlobUrl) {
              updates.tshirtCustomLogo = optimizedUrl;
              updates.rawTshirtLogoOriginal = optimizedUrl;
            }
            if (prev.logoUrl === localBlobUrl || prev.logoImage === localBlobUrl) {
              updates.logoImage = optimizedUrl;
              updates.logoUrl = optimizedUrl;
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
        console.warn('[StudioComposer] Erreur optimisation logo vêtement:', err);
      });
  };
  const callPythonRemoveBg = async (sourceUrl: string): Promise<string> => {
    try {
      const blob = sourceUrl.startsWith('data:') ? dataUrlToBlob(sourceUrl) : await fetch(sourceUrl).then((r) => r.blob());
      const formData = new FormData();
      formData.append("file", blob, "image.png");

      const apiResponse = await fetch("/remove-bg", {
        method: "POST",
        body: formData,
      });

      if (!apiResponse.ok) {
        throw new Error(`Erreur API Python (${apiResponse.status})`);
      }

      const processedBlob = await apiResponse.blob();
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === "string") resolve(reader.result);
          else reject(new Error("Échec conversion Base64"));
        };
        reader.onerror = reject;
        reader.readAsDataURL(processedBlob);
      });
    } catch (err) {
      console.warn('[StudioComposer] Échec service Python local remove-bg, activation du repli Canvas 2D :', err);
      return removeBackgroundWithCanvas(sourceUrl, { type: 'logo' });
    }
  };

  const handleCutout = async () => {
    await handleActiveSubjectCutout(false);
  };
  const handleRemoveLogoBackground = async () => {
    setIsCroppingLogoBg(true);
    try {
      if (logoTarget === 'apparel') {
        const isIndependentBack =
          activeView === 'dos' &&
          Boolean(input.tshirtBackCustomLogo && !isDemoLogo(input.tshirtBackCustomLogo));

        const sourceImage = isIndependentBack
          ? input.tshirtBackCustomLogo
          : ((rawTshirtLogoOriginalRef.current && !isDemoLogo(rawTshirtLogoOriginalRef.current) ? rawTshirtLogoOriginalRef.current : undefined)
            || (!isDemoLogo(input.tshirtCustomLogo) ? input.tshirtCustomLogo : undefined)
            || (!isDemoLogo(input.logoImage) ? input.logoImage : undefined)
            || (!isDemoLogo(input.logoUrl) ? input.logoUrl : undefined)
            || rawTshirtLogoOriginalRef.current
            || input.tshirtCustomLogo
            || input.logoImage
            || input.logoUrl);

        if (!sourceImage) return;

        const processed = await callPythonRemoveBg(sourceImage);

        if (isIndependentBack) {
          setInput((prev) => ({
            ...prev,
            tshirtBackCustomLogo: processed,
          }));
        } else {
          if (!rawTshirtLogoOriginalRef.current) {
            rawTshirtLogoOriginalRef.current = sourceImage;
          }
          setInput((prev) => ({
            ...prev,
            tshirtCustomLogo: processed,
            rawTshirtLogoOriginal: prev.rawTshirtLogoOriginal || sourceImage,
          }));
        }
        onTriggerDtfPress?.();
      } else {
        const sourceImage = rawLogoOriginalRef.current || input.logoImage || input.logoUrl;
        if (!sourceImage) return;

        const processed = await callPythonRemoveBg(sourceImage);

        setInput((prev) => ({
          ...prev,
          logoImage: processed,
          logoUrl: processed,
        }));
      }
    } catch (err) {
      console.error("Erreur remove background :", err);
    } finally {
      setIsCroppingLogoBg(false);
    }
  };
  const handleLogoColorModeSelect = async (mode: LogoColorMode) => {
    if (logoTarget === 'apparel') {
      const isIndependentBack =
        activeView === 'dos' &&
        Boolean(
          input.tshirtBackCustomLogo &&
          !isDemoLogo(input.tshirtBackCustomLogo)
        );
      const sourceImage = isIndependentBack
        ? input.tshirtBackCustomLogo
        : ((rawTshirtLogoOriginalRef.current && !isDemoLogo(rawTshirtLogoOriginalRef.current) ? rawTshirtLogoOriginalRef.current : undefined)
          || (!isDemoLogo(input.tshirtCustomLogo) ? input.tshirtCustomLogo : undefined)
          || (!isDemoLogo(input.logoImage) ? input.logoImage : undefined)
          || (!isDemoLogo(input.logoUrl) ? input.logoUrl : undefined)
          || rawTshirtLogoOriginalRef.current
          || input.tshirtCustomLogo
          || input.logoImage
          || input.logoUrl);
      if (!sourceImage) return;
      setInput((prev) => ({ ...prev, tshirtLogoColorMode: mode }));
      try {
        let processed = sourceImage;
        if (mode === 'original') processed = isIndependentBack ? sourceImage : (rawTshirtLogoOriginalRef.current || sourceImage);
        else if (mode === 'knockout_black') processed = await processLogoDeterministic(sourceImage, { removeBackground: true, knockoutBlack: true });
        else if (mode === 'white') processed = await processLogoDeterministic(sourceImage, { removeBackground: true, makePureWhite: true });
        else if (mode === 'black') processed = await processLogoDeterministic(sourceImage, { removeBackground: true, makePureBlack: true });
        if (isIndependentBack) {
          setInput((prev) => ({
            ...prev,
            tshirtBackCustomLogo: processed,
            tshirtLogoColorMode: mode,
          }));
        } else {
          if (!rawTshirtLogoOriginalRef.current) rawTshirtLogoOriginalRef.current = sourceImage;
          setInput((prev) => ({
            ...prev,
            tshirtCustomLogo: processed,
            tshirtLogoColorMode: mode,
            rawTshirtLogoOriginal: prev.rawTshirtLogoOriginal || sourceImage,
          }));
        }
        onTriggerDtfPress?.();
        notifyHubProjectUpdated();
      } catch (err) {
        console.error(err);
      }
      return;
    }

    const sourceImage = rawLogoOriginalRef.current || input.rawLogoImage || input.logoImage || input.logoUrl;
    if (!sourceImage) return;
    setInput((prev) => ({ ...prev, logoColorMode: mode }));
    try {
      let processed = sourceImage;
      if (mode === 'original' || mode === 'auto' || mode === 'neon') processed = rawLogoOriginalRef.current || input.rawLogoImage || sourceImage;
      else if (mode === 'knockout_black') processed = await processLogoDeterministic(sourceImage, { removeBackground: true, knockoutBlack: true });
      else if (mode === 'white') processed = await processLogoDeterministic(sourceImage, { removeBackground: true, makePureWhite: true });
      else if (mode === 'black') processed = await processLogoDeterministic(sourceImage, { removeBackground: true, makePureBlack: true });
      setInput((prev) => {
        const isFrontInherited =
          !prev.tshirtCustomLogo ||
          isDemoLogo(prev.tshirtCustomLogo) ||
          prev.tshirtCustomLogo === prev.logoUrl ||
          prev.tshirtCustomLogo === prev.logoImage ||
          prev.tshirtCustomLogo === prev.rawLogoImage ||
          prev.tshirtCustomLogo === prev.rawTshirtLogoOriginal;
        return {
          ...prev,
          logoImage: processed,
          logoUrl: processed,
          logoColorMode: mode,
          tshirtCustomLogo: isFrontInherited ? processed : prev.tshirtCustomLogo,
          tshirtLogoColorMode: prev.tshirtLogoColorMode || mode,
        };
      });
      notifyHubProjectUpdated();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemasterLogoAi = async () => {
    if (!currentUser) {
      showToast("Compte requis : Connectez-vous pour appliquer la super-résolution IA au logo.", 'warning');
      setShowAuthGateModal(true);
      return;
    }

    const isApparel = logoTarget === 'apparel';
    const isIndependentBack =
      isApparel &&
      activeView === 'dos' &&
      Boolean(
        input.tshirtBackCustomLogo &&
        !isDemoLogo(input.tshirtBackCustomLogo)
      );
    const activeImageToRemaster = isApparel
      ? (isIndependentBack ? input.tshirtBackCustomLogo : (input.tshirtCustomLogo || input.logoImage || input.logoUrl))
      : (input.logoImage || input.logoUrl);

    if (!activeImageToRemaster) return;
    setIsRemasteringLogo(true);
    setRemasterSuccess(false);
    try {
      let imagePayload = activeImageToRemaster;
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
      let newImage: string | null = null;
      try {
        const minDelay = new Promise((resolve) => setTimeout(resolve, 600));
        const resPromise = fetch('/api/remaster-logo', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(effectiveAuthEmail ? { 'X-User-Email': effectiveAuthEmail } : {}),
          },
          body: JSON.stringify({
            imageBase64: imagePayload,
            image: imagePayload,
            mode: 'vectorize',
            userEmail: effectiveAuthEmail,
          }),
          signal: AbortSignal.timeout(15000),
        });
        const [res] = await Promise.all([resPromise, minDelay]);
        if (res.ok) {
          const data = await res.json();
          newImage = data.remasteredImage || data.processedImageBase64 || data.imageUrl || data.image;
        } else {
          console.warn(`[handleRemasterLogoAi] API Cloud indisponible (${res.status}), bascule repli Canvas 2D local.`);
        }
      } catch (cloudErr) {
        console.warn('[handleRemasterLogoAi] Erreur réseau/502 endpoint IA, bascule repli Canvas 2D local :', cloudErr);
      }

      // Repli mécanique local Canvas 2D si l'API cloud a échoué (502, timeout, etc.)
      if (!newImage || typeof newImage !== 'string') {
        newImage = await processLogoDeterministic(imagePayload, { removeBackground: true });
        showToast('Mode local activé : logo optimisé via Canvas 2D.', 'info');
      }

      if (newImage && typeof newImage === 'string') {
        if (isApparel) {
          if (isIndependentBack) {
            setInput((prev) => ({
              ...prev,
              tshirtBackCustomLogo: newImage,
              tshirtLogoColorMode: 'original',
            }));
          } else {
            rawTshirtLogoOriginalRef.current = newImage;
            setInput((prev) => ({
              ...prev,
              tshirtCustomLogo: newImage,
              rawTshirtLogoOriginal: newImage,
              tshirtLogoColorMode: 'original',
            }));
          }
          onTriggerDtfPress?.();
        } else {
          rawLogoOriginalRef.current = newImage;
          setInput((prev) => ({
            ...prev,
            logoImage: newImage,
            logoUrl: newImage,
            logoColorMode: 'original',
          }));
        }
        setRemasterSuccess(true);
        setTimeout(() => setRemasterSuccess(false), 4000);
      }
    } catch (err) {
      console.error('[handleRemasterLogoAi] Erreur lors de la Super-Résolution IA :', err);
    } finally {
      setIsRemasteringLogo(false);
    }
  };

  const handleRemasterSubjectAi = async () => {
    const isSecondary = activeSubjectTab === 'secondary';
    const targetPhoto = isSecondary ? input.secondaryDjPhoto : input.djPhoto;

    if (!targetPhoto) {
      showToast(`Veuillez d'abord charger une photo pour le ${isSecondary ? 'sujet 2' : 'sujet 1'}.`, 'warning');
      return;
    }

    setIsRemasteringSubject(true);
    setRemasterSubjectSuccess(false);

    try {
      let imagePayload = targetPhoto;
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

      const remastered = await remasterSubjectAi(imagePayload, effectiveAuthEmail);
      if (remastered && typeof remastered === 'string' && remastered.length > 100) {
        setInput((prev) => {
          if (isSecondary) {
            return {
              ...prev,
              secondaryDjPhoto: remastered,
              rawSecondaryDjPhoto: prev.rawSecondaryDjPhoto || prev.secondaryDjPhoto,
              secondarySubjectContrast: Math.max(prev.secondarySubjectContrast ?? 1.0, 1.06),
            };
          }
          return {
            ...prev,
            djPhoto: remastered,
            rawDjPhoto: prev.rawDjPhoto || prev.djPhoto,
            subjectContrast: Math.max(prev.subjectContrast ?? 1.0, 1.06),
          };
        });
        setRemasterSubjectSuccess(true);
        showToast(`✨ Super-résolution IA ${isSecondary ? 'Sujet 2' : 'Sujet 1'} 300 DPI appliquée avec netteté studio !`, 'success');
        setTimeout(() => setRemasterSubjectSuccess(false), 4000);
      }
    } catch (err: any) {
      console.error('[handleRemasterSubjectAi] Erreur lors de la Super-Résolution Sujet IA :', err);
      showToast("Échec de la super-résolution sujet. Conservation de l'image actuelle.", 'error');
    } finally {
      setIsRemasteringSubject(false);
    }
  };

  const backupSeparatedLayersRef = useRef<{
    backgroundImage?: string;
    customBackground?: string;
    bgImage?: string;
    djPhoto?: string;
    rawDjPhoto?: string;
    isSubjectBackgroundRemoved?: boolean;
    isSubjectHarmonized?: boolean;
    isSubjectMerged?: boolean;
    subjectBrightness?: number;
    subjectContrast?: number;
    subjectSaturation?: number;
    subjectHueRotate?: number;
    subjectShadowOffsetX?: number;
    subjectShadowOffsetY?: number;
    subjectShadowBlur?: number;
    subjectShadowColor?: string;
    subjectShadowOpacity?: number;
    subjectBlendMode?: string;
  } | null>(null);

  const handleHarmonizeSubjectAi = async () => {
    if (!input.djPhoto) {
      showToast("Veuillez d'abord charger une photo pour le sujet.", 'warning');
      return;
    }

    setIsHarmonizingSubject(true);
    setHarmonizeSubjectSuccess(false);

    try {
      const backgroundUrlToUse =
        input.customBackground ||
        input.backgroundImage ||
        input.bgImage ||
        '';

      if (!backgroundUrlToUse) {
        showToast("Veuillez d'abord ajouter un fond ou décor pour harmoniser le sujet.", 'info');
        setIsHarmonizingSubject(false);
        return;
      }

      // 1. Sauvegarde de l'état initial des calques séparés pour l'annulation/retour
      const backup = {
        backgroundImage: input.backgroundImage,
        customBackground: input.customBackground,
        bgImage: input.bgImage,
        djPhoto: input.djPhoto,
        rawDjPhoto: input.rawDjPhoto || input.djPhoto,
        isSubjectBackgroundRemoved: input.isSubjectBackgroundRemoved,
        isSubjectHarmonized: input.isSubjectHarmonized,
        isSubjectMerged: false,
        subjectBrightness: input.subjectBrightness ?? 1.0,
        subjectContrast: input.subjectContrast ?? 1.0,
        subjectSaturation: input.subjectSaturation ?? 1.0,
        subjectHueRotate: input.subjectHueRotate ?? 0,
        subjectShadowOffsetX: input.subjectShadowOffsetX ?? 0,
        subjectShadowOffsetY: input.subjectShadowOffsetY ?? 20,
        subjectShadowBlur: input.subjectShadowBlur ?? 30,
        subjectShadowColor: input.subjectShadowColor || 'rgba(0,0,0,0.65)',
        subjectShadowOpacity: input.subjectShadowOpacity ?? 0.65,
        subjectBlendMode: input.subjectBlendMode || 'normal',
      };
      backupSeparatedLayersRef.current = backup;

      // 2. Génération du canvas composite aux coordonnées réelles de l'aperçu
      const activeTr = getTransformsForFormat(previewFormat);
      const posterContainer = (document.querySelector('[data-poster-container="true"]') as HTMLElement | null) || containerRef.current;

      const compositeCanvas = await createStudioCompositeCanvas({
        decorUrl: backgroundUrlToUse,
        subjectUrl: input.djPhoto,
        previewContainer: posterContainer,
        formatTransforms: activeTr,
        backgroundOpacity: input.backgroundOpacity ?? 0.75,
        backgroundBrightness: input.backgroundBrightness ?? 1.0,
        canvasBgColor,
        currentTone,
        isToneActive,
      });

      // 3. Déclenchement de la fusion générative via Google Imagen 3 (harmonizeSubject)
      const result = await harmonizeWithImagen3(compositeCanvas, {
        explicitEmail: effectiveAuthEmail,
      });

      if (result && result.success && result.imageUrl) {
        setInput((prev) => ({
          ...prev,
          backupBeforeMerge: backup,
          // Remplace le fond du studio par l'image unique fusionnée retournée
          backgroundImage: result.imageUrl,
          customBackground: result.imageUrl,
          bgImage: result.imageUrl,
          // Masque le calque sujet individuel (puisqu'il est désormais fusionné dans le décor)
          isSubjectMerged: true,
          isSubjectHarmonized: true,
          // Remet les filtres CSS à zéro
          subjectBrightness: 1.0,
          subjectContrast: 1.0,
          subjectSaturation: 1.0,
          subjectHueRotate: 0,
          subjectShadowOffsetX: 0,
          subjectShadowOffsetY: 0,
          subjectShadowBlur: 0,
          subjectShadowColor: 'transparent',
          subjectShadowOpacity: 0,
          subjectBlendMode: 'normal',
          subjectLightingSummary: 'Fusion générative Google Imagen 3 intégrée au décor',
        }));

        setHarmonizeSubjectSuccess(true);

        showToast('✨ Sujet fusionné avec le décor via Google Imagen 3 !', 'success');
        setTimeout(() => setHarmonizeSubjectSuccess(false), 4500);
      } else {
        throw new Error(result?.error || 'Aucune image fusionnée reçue.');
      }
    } catch (err: any) {
      console.error('[handleHarmonizeSubjectAi] Erreur lors de l\'harmonisation Imagen 3 :', err);
      showToast("Erreur lors de la fusion générative du sujet via Imagen 3.", 'error');
    } finally {
      setIsHarmonizingSubject(false);
    }
  };

  const handleUndoHarmonizeSubject = () => {
    const backup = input.backupBeforeMerge || backupSeparatedLayersRef.current;
    if (!backup) {
      setInput((prev) => ({
        ...prev,
        isSubjectMerged: false,
        isSubjectHarmonized: false,
      }));
      showToast('Calques séparés rétablis.', 'info');
      return;
    }

    setInput((prev) => ({
      ...prev,
      backgroundImage: backup.backgroundImage,
      customBackground: backup.customBackground,
      bgImage: backup.bgImage,
      djPhoto: backup.djPhoto || prev.rawDjPhoto || prev.djPhoto,
      rawDjPhoto: backup.rawDjPhoto || prev.rawDjPhoto,
      isSubjectBackgroundRemoved: backup.isSubjectBackgroundRemoved ?? prev.isSubjectBackgroundRemoved,
      isSubjectMerged: false,
      isSubjectHarmonized: backup.isSubjectHarmonized ?? false,
      subjectBrightness: backup.subjectBrightness ?? 1.0,
      subjectContrast: backup.subjectContrast ?? 1.0,
      subjectSaturation: backup.subjectSaturation ?? 1.0,
      subjectHueRotate: backup.subjectHueRotate ?? 0,
      subjectShadowOffsetX: backup.subjectShadowOffsetX ?? 0,
      subjectShadowOffsetY: backup.subjectShadowOffsetY ?? 20,
      subjectShadowBlur: backup.subjectShadowBlur ?? 30,
      subjectShadowColor: backup.subjectShadowColor || 'rgba(0,0,0,0.65)',
      subjectShadowOpacity: backup.subjectShadowOpacity ?? 0.65,
      subjectBlendMode: backup.subjectBlendMode || 'normal',
      subjectLightingSummary: undefined,
      backupBeforeMerge: undefined,
    }));
    setHarmonizeSubjectSuccess(false);
    showToast('Calques décor et sujet séparés réinitialisés.', 'info');
  };

  const handleActiveSubjectCutout = async (isSec?: boolean) => {
    const isSecondary = isSec !== undefined ? isSec : (activeSubjectTab === 'secondary');
    const rawPhoto = isSecondary
      ? (input.rawSecondaryDjPhoto || input.secondaryDjPhoto)
      : (input.rawDjPhoto || input.djPhoto);
    if (!rawPhoto || isCuttingBg || isRemasteringSubject) return;
    setIsCuttingBg(true);
    try {
      let cutoutDataUrl: string | null = null;

      // 1. Moteur neuronal IA d'origine (@imgly/background-removal via autoCutout)
      // Correction CSP propre : conversion mémoire binaire via Uint8Array (dataUrlToBlob) SANS fetch('data:...')
      try {
        const source = rawPhoto.startsWith('data:') ? dataUrlToBlob(rawPhoto) : rawPhoto;
        const result = await removeBackground(source);
        if (result?.dataUrl && result.dataUrl.length > 50) {
          cutoutDataUrl = result.dataUrl;
        }
      } catch (neuralErr: any) {
        console.warn('[handleActiveSubjectCutout] Détourage neuronal autoCutout indisponible, repli vers backend :', neuralErr?.message || neuralErr);
      }

      // 2. Repli serveur API /api/remove-background (Photoroom / rembg serveur HD)
      if (!cutoutDataUrl || cutoutDataUrl.length <= 50) {
        try {
          const imageBlob = rawPhoto.startsWith('data:')
            ? dataUrlToBlob(rawPhoto)
            : await fetch(rawPhoto).then((r) => r.blob());

          const formData = new FormData();
          formData.append('image', imageBlob, 'subject.png');
          formData.append('size', 'full');
          formData.append('type', 'person');
          formData.append('format', 'png');

          const res = await fetch('/api/remove-background', {
            method: 'POST',
            body: formData,
          });

          if (res.ok) {
            const data = await res.json();
            const cutout = data?.processedImageBase64 || data?.image || data?.imageUrl || data?.cutoutUrl;
            if (cutout) {
              cutoutDataUrl = cutout.startsWith('data:') ? cutout : `data:image/png;base64,${cutout}`;
            }
          }
        } catch (serverErr) {
          console.warn('[handleActiveSubjectCutout] Échec API /api/remove-background :', serverErr);
        }
      }

      // 3. Repli Cloud Function invokeGeminiCloudFunction
      if (!cutoutDataUrl || cutoutDataUrl.length <= 50) {
        try {
          const rbgData = await invokeGeminiCloudFunction<{
            success: boolean;
            imageBase64?: string;
            processedImageBase64?: string;
            imageUrl?: string;
          }>({
            action: 'remove-background',
            imageBase64: rawPhoto,
            size: 'full',
            type: 'person',
            format: 'png',
          }, 25000);
          const rawCutout = rbgData?.imageBase64 || rbgData?.processedImageBase64 || rbgData?.imageUrl;
          if (rbgData?.success && rawCutout) {
            cutoutDataUrl = rawCutout.startsWith('data:')
              ? rawCutout
              : `data:image/png;base64,${rawCutout}`;
          }
        } catch (cloudErr) {
          console.warn('[handleActiveSubjectCutout] Cloud Function remove-background non disponible :', cloudErr);
        }
      }

      // 4. Repli serveur Python local via proxy relatif /remove-bg
      if (!cutoutDataUrl || cutoutDataUrl.length <= 50) {
        try {
          const imageBlob = rawPhoto.startsWith('data:')
            ? dataUrlToBlob(rawPhoto)
            : await fetch(rawPhoto).then((r) => r.blob());

          const formData = new FormData();
          formData.append('file', imageBlob, 'subject.png');
          const res = await fetch('/remove-bg', { method: 'POST', body: formData });
          if (res.ok) {
            const resultBlob = await res.blob();
            cutoutDataUrl = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(resultBlob);
            });
          }
        } catch (pyErr) {
          console.warn('[handleActiveSubjectCutout] Proxy /remove-bg indisponible :', pyErr);
        }
      }

      // 5. Repli de secours Canvas 2D local : SEULEMENT pour fond blanc cyclorama RGB > 240
      // Cloisonnement strict : n'efface JAMAIS les noirs pour le sujet
      if (!cutoutDataUrl || cutoutDataUrl.length <= 50) {
        cutoutDataUrl = await removeBackgroundWithCanvas(rawPhoto, { type: 'subject' });
      }

      if (cutoutDataUrl && cutoutDataUrl.length > 50) {
        // Garantir un format PNG avec canal alpha actif sans réinjection de fond noir
        if (!cutoutDataUrl.startsWith('data:image/png') && !cutoutDataUrl.startsWith('data:image/webp')) {
          cutoutDataUrl = cutoutDataUrl.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, 'data:image/png;base64,');
        }

        setInput((prev: any) => {
          if (isSecondary) {
            return {
              ...prev,
              rawSecondaryDjPhoto: prev.rawSecondaryDjPhoto || rawPhoto,
              secondaryDjPhoto: cutoutDataUrl,
              isSubjectBackgroundRemoved: true,
            };
          }
          return {
            ...prev,
            rawDjPhoto: prev.rawDjPhoto || rawPhoto,
            djPhoto: cutoutDataUrl,
            cutoutDjPhoto: cutoutDataUrl,
            isSubjectBackgroundRemoved: true,
          };
        });
        showToast(`Fond retiré avec succès pour ${isSecondary ? 'le sujet 2' : 'le sujet 1'} !`, 'success');
      }
    } catch (err) {
      console.error('[handleActiveSubjectCutout] Erreur lors du détourage :', err);
      showToast("Échec du détourage.", 'error');
    } finally {
      setIsCuttingBg(false);
    }
  };

  const executeCumulativeChromakey = async (
    colorsList: RemovedColorItem[],
    isSec?: boolean,
    silent: boolean = false
  ) => {
    const isSecondary = isSec !== undefined ? isSec : (activeSubjectTab === 'secondary');

    // Récupérer toujours la source originale non-détourée
    const rawPhoto = isSecondary
      ? (input.rawSecondaryDjPhoto || chromakeyOriginalRef.current || input.secondaryDjPhoto)
      : (input.rawDjPhoto || chromakeyOriginalRef.current || input.djPhoto);

    if (!rawPhoto) {
      if (!silent) showToast(`Aucune photo chargée pour ${isSecondary ? 'le sujet 2' : 'le sujet 1'}.`, 'warning');
      return;
    }

    if (!chromakeyOriginalRef.current) {
      chromakeyOriginalRef.current = rawPhoto;
    }

    if (!silent) setIsCuttingBg(true);

    try {
      if (!colorsList || colorsList.length === 0) {
        // Aucune couleur à supprimer : restaurer la photo originale brute
        setInput((prev) => ({
          ...prev,
          ...(isSecondary
            ? { secondaryDjPhoto: rawPhoto, isSubjectBackgroundRemoved: false }
            : { djPhoto: rawPhoto, isSubjectBackgroundRemoved: false }),
        }));
        return;
      }

      const cutoutDataUrl = await applyCumulativeChromakey(rawPhoto, colorsList, {
        floodFromCorners: true,
      });

      if (cutoutDataUrl && cutoutDataUrl.length > 50) {
        setInput((prev) => ({
          ...prev,
          ...(isSecondary
            ? {
              rawSecondaryDjPhoto: prev.rawSecondaryDjPhoto || rawPhoto,
              secondaryDjPhoto: cutoutDataUrl,
              isSubjectBackgroundRemoved: true,
            }
            : {
              rawDjPhoto: prev.rawDjPhoto || rawPhoto,
              djPhoto: cutoutDataUrl,
              isSubjectBackgroundRemoved: true,
            }),
        }));
      }
    } catch (err: any) {
      console.error('[executeCumulativeChromakey] Erreur lors du chroma key cumulatif :', err);
      if (!silent) showToast('Échec de la suppression cumulative.', 'error');
    } finally {
      if (!silent) setIsCuttingBg(false);
    }
  };

  const executeChromakeyRemoval = async (
    targetColor: { r: number; g: number; b: number },
    tolerance: number,
    startX?: number,
    startY?: number,
    isSec?: boolean,
    silent: boolean = false
  ) => {
    const isSecondary = isSec !== undefined ? isSec : (activeSubjectTab === 'secondary');
    const newColorItem: RemovedColorItem = {
      id: `col_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      r: targetColor.r,
      g: targetColor.g,
      b: targetColor.b,
      tolerance,
      startX,
      startY,
      isContiguous: isChromakeyContiguous,
    };

    const currentList = isSecondary ? secondaryRemovedColors : primaryRemovedColors;
    const nextList = [...currentList, newColorItem];
    if (isSecondary) {
      setSecondaryRemovedColors(nextList);
    } else {
      setPrimaryRemovedColors(nextList);
    }

    await executeCumulativeChromakey(nextList, isSecondary, silent);
  };

  const handleRemoveColor = async (colorId: string) => {
    const isSecondary = activeSubjectTab === 'secondary';
    const currentList = isSecondary ? secondaryRemovedColors : primaryRemovedColors;
    const nextList = currentList.filter((c) => c.id !== colorId);
    if (isSecondary) {
      setSecondaryRemovedColors(nextList);
    } else {
      setPrimaryRemovedColors(nextList);
    }

    const last = nextList[nextList.length - 1];
    setSelectedChromakeyColor(last ? { r: last.r, g: last.g, b: last.b } : null);

    await executeCumulativeChromakey(nextList, isSecondary, false);
    showToast("Nuance supprimée de la sélection.", "info");
  };

  const handleResetCutout = () => {
    const isSecondary = activeSubjectTab === 'secondary';
    if (isSecondary) {
      setSecondaryRemovedColors([]);
    } else {
      setPrimaryRemovedColors([]);
    }

    const rawPhoto = isSecondary
      ? (input.rawSecondaryDjPhoto || chromakeyOriginalRef.current || input.secondaryDjPhoto)
      : (input.rawDjPhoto || chromakeyOriginalRef.current || input.djPhoto);

    if (rawPhoto) {
      setInput((prev) => ({
        ...prev,
        ...(isSecondary
          ? { secondaryDjPhoto: rawPhoto, isSubjectBackgroundRemoved: false }
          : { djPhoto: rawPhoto, isSubjectBackgroundRemoved: false }),
      }));
    }

    setSelectedChromakeyColor(null);
    lastChromakeyPointRef.current = null;
    setIsPickingColor(false);
    showToast("↺ Détourage réinitialisé à la photo d'origine.", "info");
  };

  const handleToleranceChange = (newTolerance: number) => {
    setChromakeyTolerance(newTolerance);

    if (chromakeyDebounceRef.current) {
      clearTimeout(chromakeyDebounceRef.current);
    }

    chromakeyDebounceRef.current = setTimeout(() => {
      const isSecondary = activeSubjectTab === 'secondary';
      const currentList = isSecondary ? secondaryRemovedColors : primaryRemovedColors;
      if (currentList.length > 0) {
        const lastIdx = currentList.length - 1;
        const nextList = currentList.map((c, idx) =>
          idx === lastIdx ? { ...c, tolerance: newTolerance } : c
        );
        if (isSecondary) setSecondaryRemovedColors(nextList);
        else setPrimaryRemovedColors(nextList);
        executeCumulativeChromakey(nextList, isSecondary, true);
      } else if (selectedChromakeyColor) {
        executeChromakeyRemoval(
          selectedChromakeyColor,
          newTolerance,
          lastChromakeyPointRef.current?.x,
          lastChromakeyPointRef.current?.y,
          isSecondary,
          true
        );
      }
    }, 30);
  };

  const handleToleranceCommit = () => {
    if (chromakeyDebounceRef.current) {
      clearTimeout(chromakeyDebounceRef.current);
    }
    const isSecondary = activeSubjectTab === 'secondary';
    const currentList = isSecondary ? secondaryRemovedColors : primaryRemovedColors;
    if (currentList.length > 0) {
      executeCumulativeChromakey(currentList, isSecondary, true);
    } else if (selectedChromakeyColor) {
      executeChromakeyRemoval(
        selectedChromakeyColor,
        chromakeyTolerance,
        lastChromakeyPointRef.current?.x,
        lastChromakeyPointRef.current?.y,
        isSecondary,
        true
      );
    }
  };

  const handleSubjectColorPick = async (e: React.MouseEvent<HTMLElement>, isSecondary: boolean = false) => {
    if (!isPickingColor) return;
    e.stopPropagation();
    e.preventDefault();

    const rawPhoto = isSecondary
      ? (input.rawSecondaryDjPhoto || chromakeyOriginalRef.current || input.secondaryDjPhoto)
      : (input.rawDjPhoto || chromakeyOriginalRef.current || input.djPhoto);

    if (!rawPhoto) {
      setIsPickingColor(false);
      return;
    }

    if (!chromakeyOriginalRef.current) {
      chromakeyOriginalRef.current = rawPhoto;
    }

    // Récupérer précisément l'élément image cible (direct ou enfant du conteneur)
    const targetEl = e.currentTarget as HTMLElement;
    const imgEl = (
      targetEl.tagName === 'IMG'
        ? targetEl
        : (e.target as HTMLElement)?.tagName === 'IMG'
          ? (e.target as HTMLElement)
          : targetEl.querySelector('img')
    ) as HTMLImageElement | null;

    const rect = imgEl ? imgEl.getBoundingClientRect() : targetEl.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = rawPhoto;
      });

      const natW = img.naturalWidth || img.width;
      const natH = img.naturalHeight || img.height;
      if (natW <= 0 || natH <= 0) return;

      const boxW = rect.width;
      const boxH = rect.height;

      // Calcul des marges de letterboxing / pillarboxing dues à object-contain
      let objectPosition = 'center';
      if (imgEl) {
        try {
          const cs = window.getComputedStyle(imgEl);
          objectPosition = cs.objectPosition || 'center';
        } catch {
          // fallback default
        }
      }

      const boxRatio = boxW / boxH;
      const imageRatio = natW / natH;

      let renderWidth = boxW;
      let renderHeight = boxH;
      let renderLeft = 0;
      let renderTop = 0;

      if (boxRatio > imageRatio) {
        // La boîte est plus large que l'image : bandes vides à gauche et à droite
        renderHeight = boxH;
        renderWidth = boxH * imageRatio;
        renderTop = 0;
        if (objectPosition.includes('left')) {
          renderLeft = 0;
        } else if (objectPosition.includes('right')) {
          renderLeft = boxW - renderWidth;
        } else {
          renderLeft = (boxW - renderWidth) / 2;
        }
      } else {
        // La boîte est plus haute que l'image : bandes vides en haut et en bas
        renderWidth = boxW;
        renderHeight = boxW / imageRatio;
        renderLeft = 0;
        if (objectPosition.includes('top')) {
          renderTop = 0;
        } else if (objectPosition.includes('bottom')) {
          renderTop = boxH - renderHeight;
        } else {
          renderTop = (boxH - renderHeight) / 2;
        }
      }

      const clickXInBox = e.clientX - rect.left;
      const clickYInBox = e.clientY - rect.top;

      const clickXInImage = clickXInBox - renderLeft;
      const clickYInImage = clickYInBox - renderTop;

      // Marge de tolérance (15px) pour autoriser un clic sur les bords extrêmes sans fausser le détourage
      const margin = 15;
      const isFarOutside =
        clickXInImage < -margin ||
        clickXInImage > renderWidth + margin ||
        clickYInImage < -margin ||
        clickYInImage > renderHeight + margin;

      if (isFarOutside) {
        showToast("Cliquez à l'intérieur de la photo pour échantillonner le fond.", "info");
        return;
      }

      // Clamper rigoureusement aux bornes de l'image réelle (permet d'échantillonner les pixels de bordure)
      const clampedX = Math.max(0, Math.min(renderWidth - 0.001, clickXInImage));
      const clampedY = Math.max(0, Math.min(renderHeight - 0.001, clickYInImage));

      const pixelX = Math.min(natW - 1, Math.max(0, Math.floor((clampedX / renderWidth) * natW)));
      const pixelY = Math.min(natH - 1, Math.max(0, Math.floor((clampedY / renderHeight) * natH)));

      const sampleCanvas = document.createElement('canvas');
      sampleCanvas.width = natW;
      sampleCanvas.height = natH;
      const sampleCtx = sampleCanvas.getContext('2d', { willReadFrequently: true });
      if (!sampleCtx) throw new Error('Impossible d\'initialiser le canvas pipette');

      sampleCtx.drawImage(img, 0, 0);
      const pixelData = sampleCtx.getImageData(pixelX, pixelY, 1, 1).data;
      const pickedColor = { r: pixelData[0], g: pixelData[1], b: pixelData[2] };

      setSelectedChromakeyColor(pickedColor);
      lastChromakeyPointRef.current = { x: pixelX, y: pixelY };

      // Création du nouvel échantillon cumulatif
      const newColorItem: RemovedColorItem = {
        id: `col_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        r: pickedColor.r,
        g: pickedColor.g,
        b: pickedColor.b,
        tolerance: chromakeyTolerance,
        startX: pixelX,
        startY: pixelY,
        isContiguous: isChromakeyContiguous,
      };

      const currentList = isSecondary ? secondaryRemovedColors : primaryRemovedColors;
      const nextList = [...currentList, newColorItem];
      if (isSecondary) {
        setSecondaryRemovedColors(nextList);
      } else {
        setPrimaryRemovedColors(nextList);
      }

      // Maintenir le mode pipette actif pour enchaîner plusieurs suppressions
      await executeCumulativeChromakey(nextList, isSecondary, false);

      showToast(
        `Nuance retirée (RGB: ${pickedColor.r}, ${pickedColor.g}, ${pickedColor.b}). Cliquez sur une autre zone ou sur « Terminer ».`,
        'success',
        4000
      );
    } catch (err) {
      console.error('[handleSubjectColorPick] Erreur pipette :', err);
      showToast('Erreur lors de la capture de couleur de la pipette.', 'error');
      setIsPickingColor(false);
    }
  };

  const handleGenerateAiSubject = async (isSecondary: boolean = false) => {
    if (!currentUser) {
      showToast("Compte requis : Connectez-vous pour générer un visuel avec l'IA.", 'warning');
      setShowAuthGateModal(true);
      return;
    }

    const currentPrompt = isSecondary ? input.secondarySubjectPrompt : input.subjectPrompt;
    const activeExistingPhoto = isSecondary
      ? (input.rawSecondaryDjPhoto || input.secondaryDjPhoto)
      : (input.rawDjPhoto || input.djPhoto);

    setIsGeneratingSubject(true);

    try {
      let generatedImageUrl: string = '';

      if (activeExistingPhoto) {
        // Cas 1 : Photo existante chargée -> Variation du sujet en studio fond blanc pur avec conservation de l'identité
        showToast(
          `Génération de la variation ${isSecondary ? 'du sujet 2' : 'du sujet 1'} sur fond blanc pur...`,
          'info'
        );

        let resolvedBase64 = activeExistingPhoto;
        if (resolvedBase64.startsWith('blob:') || resolvedBase64.startsWith('/') || resolvedBase64.startsWith('http')) {
          try {
            const res = await fetch(resolvedBase64);
            const blob = await res.blob();
            resolvedBase64 = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });
          } catch (e) {
            console.warn('[handleGenerateAiSubject] Erreur conversion image source en base64 :', e);
          }
        }

        generatedImageUrl = await generateSubjectVariation(currentPrompt || '', {
          isSecondary,
          genre: input.genre,
          referenceImage: resolvedBase64,
          aspectRatio: '1:1',
        });
      } else {
        // Cas 2 : Aucune photo chargée -> Générer un sujet studio de zéro sur fond blanc pur
        showToast(`Génération d'un sujet studio sur fond blanc pur avec l'IA...`, 'info');
        generatedImageUrl = await generateSubjectVariation(currentPrompt || '', {
          isSecondary,
          genre: input.genre,
          referenceImage: null,
          aspectRatio: '1:1',
        });
      }

      if (generatedImageUrl) {
        let finalSubjectUrl = generatedImageUrl;
        // Détourage automatique haute fidélité (autoCutout neuronal -> /api/remove-background -> Cloud Function -> Canvas 2D fond blanc pur)
        try {
          let cutoutDataUrl: string | null = null;

          // 1. Découpage neuronal IA d'origine via autoCutout (@imgly/background-removal)
          try {
            const sourceBlob = generatedImageUrl.startsWith('data:')
              ? dataUrlToBlob(generatedImageUrl)
              : generatedImageUrl;
            const result = await removeBackground(sourceBlob);
            if (result?.dataUrl && result.dataUrl.length > 50) {
              cutoutDataUrl = result.dataUrl;
            }
          } catch (neuralErr) {
            console.warn('[handleGenerateAiSubject] autoCutout neuronal indisponible, bascule sur API distante :', neuralErr);
          }

          // 2. Repli serveur API /api/remove-background
          if (!cutoutDataUrl || cutoutDataUrl.length <= 50) {
            try {
              const imageBlob = generatedImageUrl.startsWith('data:')
                ? dataUrlToBlob(generatedImageUrl)
                : await fetch(generatedImageUrl).then((r) => r.blob());

              const formData = new FormData();
              formData.append('image', imageBlob, 'subject.png');
              formData.append('size', 'full');
              formData.append('type', 'person');
              formData.append('format', 'png');

              const res = await fetch('/api/remove-background', {
                method: 'POST',
                body: formData,
              });

              if (res.ok) {
                const data = await res.json();
                const cutout = data?.processedImageBase64 || data?.image || data?.imageUrl;
                if (cutout) {
                  cutoutDataUrl = cutout.startsWith('data:') ? cutout : `data:image/png;base64,${cutout}`;
                }
              }
            } catch (serverErr) {
              console.warn('[handleGenerateAiSubject] Échec API /api/remove-background :', serverErr);
            }
          }

          // 3. Repli Cloud Function invokeGeminiCloudFunction
          if (!cutoutDataUrl || cutoutDataUrl.length <= 50) {
            try {
              const rbgData = await invokeGeminiCloudFunction<{
                success: boolean;
                imageBase64?: string;
                processedImageBase64?: string;
                imageUrl?: string;
              }>({
                action: 'remove-background',
                imageBase64: generatedImageUrl,
                size: 'full',
                type: 'person',
                format: 'png',
              }, 25000);
              const rawCutout = rbgData?.imageBase64 || rbgData?.processedImageBase64 || rbgData?.imageUrl;
              if (rbgData?.success && rawCutout) {
                cutoutDataUrl = rawCutout.startsWith('data:')
                  ? rawCutout
                  : `data:image/png;base64,${rawCutout}`;
              }
            } catch (cloudErr) {
              console.warn('[handleGenerateAiSubject] Cloud Function remove-background non disponible :', cloudErr);
            }
          }

          // 4. Repli serveur Python local via proxy /remove-bg
          if (!cutoutDataUrl || cutoutDataUrl.length <= 50) {
            try {
              const imageBlob = generatedImageUrl.startsWith('data:')
                ? dataUrlToBlob(generatedImageUrl)
                : await fetch(generatedImageUrl).then((r) => r.blob());

              const formData = new FormData();
              formData.append('file', imageBlob, 'subject.png');
              const res = await fetch('/remove-bg', { method: 'POST', body: formData });
              if (res.ok) {
                const resultBlob = await res.blob();
                cutoutDataUrl = await new Promise<string>((resolve, reject) => {
                  const reader = new FileReader();
                  reader.onloadend = () => resolve(reader.result as string);
                  reader.onerror = reject;
                  reader.readAsDataURL(resultBlob);
                });
              }
            } catch { }
          }

          // 5. Repli Canvas 2D local immédiat (avec suppression fond blanc studio cyclorama RGB > 240 sans jamais effacer les noirs)
          if (!cutoutDataUrl || cutoutDataUrl.length <= 50) {
            cutoutDataUrl = await removeBackgroundWithCanvas(generatedImageUrl, { type: 'subject' });
          }

          if (cutoutDataUrl && cutoutDataUrl.length > 50) {
            // Garantir que le résultat est strictement un format PNG avec canal alpha actif
            if (!cutoutDataUrl.startsWith('data:image/png') && !cutoutDataUrl.startsWith('data:image/webp')) {
              cutoutDataUrl = cutoutDataUrl.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, 'data:image/png;base64,');
            }
            finalSubjectUrl = cutoutDataUrl;
          }
        } catch (cutoutErr) {
          console.warn('[handleGenerateAiSubject] Erreur détourage automatique :', cutoutErr);
        }

        // L'assignation se fait STRICTEMENT sur le Sujet (djPhoto / secondaryDjPhoto), jamais sur le décor !
        setInput((prev) => {
          if (isSecondary) {
            return {
              ...prev,
              secondaryDjPhoto: finalSubjectUrl,
              rawSecondaryDjPhoto: generatedImageUrl,
              secondarySubjectPrompt: currentPrompt?.trim() || prev.secondarySubjectPrompt,
              isSubjectBackgroundRemoved: true,
            };
          }
          return {
            ...prev,
            djPhoto: finalSubjectUrl,
            rawDjPhoto: generatedImageUrl,
            cutoutDjPhoto: finalSubjectUrl,
            subjectPrompt: currentPrompt?.trim() || prev.subjectPrompt,
            isSubjectBackgroundRemoved: true,
          };
        });

        showToast(
          `Sujet ${isSecondary ? '2' : '1'} généré et détouré avec succès !`,
          'success'
        );
      }
    } catch (err: any) {
      console.error('[handleGenerateAiSubject] Erreur lors de la génération du sujet :', err);
      showToast("Échec de la génération du sujet. Vérifiez votre connexion ou réessayez.", 'error');
    } finally {
      setIsGeneratingSubject(false);
    }
  };

  const handleGenerateAiBackground = async (overridePrompt?: string, overrideGenre?: string) => {
    if (!currentUser) {
      showToast("Compte requis : Connectez-vous pour générer un décor avec l'IA.", 'warning');
      setShowAuthGateModal(true);
      return;
    }

    const hasSubjectProvided = Boolean(
      input.djPhoto ||
      input.rawDjPhoto ||
      input.secondaryDjPhoto ||
      input.rawSecondaryDjPhoto
    );

    const promptToUse = (typeof overridePrompt === 'string' ? overridePrompt : input.ambiancePrompt)?.trim() || 'Nébuleuse cosmique violette et cyan, vagues de lumière fluide, particules flottantes, fond abstrait 3D épuré';
    const genreToUse = overrideGenre || input.headerTagline || 'SURTITRE 1';
    const activeAspectRatio = getAspectRatioForFormat(previewFormat);
    setIsGeneratingBg(true);
    try {
      const generatedImageUrl = await generateBackground(promptToUse, {
        aspectRatio: activeAspectRatio,
        genre: genreToUse,
        allowFallback: true,
        hasSubject: hasSubjectProvided,
      });

      if (generatedImageUrl) {
        setInput((prev) => ({
          ...prev,
          ambiancePrompt: promptToUse,
          backgroundImage: generatedImageUrl,
          customBackground: generatedImageUrl,
          bgImage: generatedImageUrl,
          ambianceEngine: 'Gemini AI Image',
        }));
        showToast('Décor d\'arrière-plan généré avec succès ! Le sujet reste préservé.', 'success');
      }
    } catch (err: any) {
      console.warn('[handleGenerateAiBackground] Exception interceptée, activation du repli local sans blocage :', err?.message || err);
      try {
        const fallbackImageUrl = await generateLocalFallbackBackground({
          prompt: promptToUse,
          genre: genreToUse,
          aspectRatio: activeAspectRatio,
        });
        if (fallbackImageUrl) {
          setInput((prev) => ({
            ...prev,
            ambiancePrompt: promptToUse,
            backgroundImage: fallbackImageUrl,
            customBackground: fallbackImageUrl,
            ambianceEngine: 'Moteur Local HD',
          }));
          showToast('Mode de secours activé : texture de décor générée localement.', 'info');
        }
      } catch (localErr) {
        console.error('[handleGenerateAiBackground] Échec ultime repli :', localErr);
        setInput((prev) => ({
          ...prev,
          backgroundImage: '/demo/bg-demo.jpg',
          customBackground: '/demo/bg-demo.jpg',
          ambianceEngine: 'Secours Défaut',
        }));
        showToast('Mode de secours activé : texture sombre appliquée.', 'info');
      }
    } finally {
      setIsGeneratingBg(false);
    }
  };

  const handleTriggerVton = async (targetView?: 'face' | 'dos') => {
    if (!currentUser) {
      showToast("Compte requis : Connectez-vous pour générer vos visuels sur mannequin avec l'IA.", 'warning');
      setShowAuthGateModal(true);
      return;
    }

    const viewToUse = targetView || activeView;
    const isBack = viewToUse === 'dos';
    const sideToUse = isBack ? 'back' : 'front';

    if (propOnTriggerVton) {
      propOnTriggerVton(viewToUse);
      return;
    }

    setIsGeneratingVtonInternal(true);
    try {
      const mannequinPhoto = isBack ? '/demo/artist-mannequin-blank-back.jpg' : '/demo/artist-mannequin-blank.jpg';
      const side = isBack ? 'back' : 'front';
      const templatePath = resolveGarmentTemplateSrc('tshirt', input.tshirtColor || 'black', side);
      const dtfLogoUrl = resolveActiveTextileLogo(input, side);
      const logoMode = resolveActiveTextileColorMode(input, input.tshirtColor || 'black');
      const currentPlacement = clampDtfPlacement(isBack ? backPlacement : frontPlacement, side);

      // 1. Préparation du gabarit textile portant le logo officiel
      const garmentWithLogo = await (generateMechanicalMockup as any)(
        templatePath,
        dtfLogoUrl || '',
        isBack ? 'back' : 'front',
        {
          position: isBack ? 'center' : 'chest_left',
          colorMode: logoMode,
          garmentType: 'tshirt',
          isModel: false,
          scale: currentPlacement.scale,
          offsetY: 0,
          customX: currentPlacement.x / 100,
          customY: currentPlacement.y / 100,
        }
      );

      // 2. Consignes synchrones Face / Dos
      const promptDirective = isBack
        ? "Professional fashion VTON studio photography. Rear view of the athletic neutral studio model seen completely from behind facing away from camera. Transfer the black crewneck t-shirt onto the model's back with the large extended visual graphic faithfully printed across the upper back between shoulder blades. DTF textile print, photorealistic fabric folds, neutral studio backdrop, 8k."
        : "Professional fashion VTON studio photography. Waist-up front portrait of the athletic neutral studio model facing camera. Transfer the black crewneck t-shirt onto the torso with the discrete brand logo printed on the left chest pocket area. Authentic DTF textile print, neutral studio lighting, 8k.";

      // 3. Exécution VTON IA
      const generated = await (generateTryOnImage as any)(
        mannequinPhoto,
        garmentWithLogo,
        'tshirt',
        promptDirective,
        'Trends',
        isBack ? 'back' : 'front',
        dtfLogoUrl || null,
        null,
        null,
        "",
        logoMode,
        '1:1'
      );

      if (generated) {
        setInput((prev) => ({
          ...prev,
          tshirtSide: sideToUse,
          tshirtPreviewImage: generated,
          tshirtPreviewImages: {
            ...(prev.tshirtPreviewImages || {}),
            [sideToUse]: generated,
          },
        }));
      }
    } catch (err: any) {
      console.warn('[StudioComposer] Erreur génération VTON IA, activation repli Canvas 2D :', err);
      try {
        const side = isBack ? 'back' : 'front';
        const dtfLogoUrl = resolveActiveTextileLogo(input, side);
        const mannequinPhoto = isBack ? '/demo/artist-mannequin-blank-back.jpg' : '/demo/artist-mannequin-blank.jpg';
        const logoMode = resolveActiveTextileColorMode(input, input.tshirtColor || 'black');
        const currentPlacement = clampDtfPlacement(isBack ? backPlacement : frontPlacement, side);
        const fallbackMockup = await (generateMechanicalMockup as any)(
          mannequinPhoto,
          dtfLogoUrl || '',
          side,
          {
            position: isBack ? 'center' : 'chest_left',
            colorMode: logoMode,
            garmentType: 'tshirt',
            isModel: true,
            scale: currentPlacement.scale,
            customX: currentPlacement.x / 100,
            customY: currentPlacement.y / 100,
          }
        );
        if (fallbackMockup) {
          setInput((prev) => ({
            ...prev,
            tshirtSide: sideToUse,
            tshirtPreviewImage: fallbackMockup,
            tshirtPreviewImages: {
              ...(prev.tshirtPreviewImages || {}),
              [sideToUse]: fallbackMockup,
            },
          }));
          showToast('Mode de secours activé : mannequin calibré localement.', 'info');
        }
      } catch (fallbackErr) {
        console.error('[StudioComposer] Échec repli VTON local :', fallbackErr);
      }
    } finally {
      setIsGeneratingVtonInternal(false);
    }
  };

  const cardBg = isDayMode ? 'bg-white border-zinc-200 text-zinc-900 shadow-sm' : 'bg-zinc-950/95 border border-zinc-800/80 text-zinc-100 shadow-2xl backdrop-blur-md';
  const innerBg = isDayMode ? 'bg-zinc-50 border-zinc-200 text-zinc-900' : 'bg-zinc-900/80 border border-zinc-800/80 text-zinc-200';
  const inputBg = isDayMode ? 'bg-white border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900/10' : 'bg-zinc-900/90 border border-zinc-800 text-white placeholder:text-zinc-500 focus:border-lime-400 focus:ring-1 focus:ring-lime-400/30';
  const textMuted = isDayMode ? 'text-zinc-600' : 'text-zinc-400';
  const textSubtle = isDayMode ? 'text-zinc-600' : 'text-zinc-500';
  const borderColor = isDayMode ? 'border-zinc-200' : 'border-zinc-800/80';
  const isBanner = previewFormat === 'banner';
  const formatStyle = getFormatAspectRatio(previewFormat);

  // Auto-Luminance par Computer Vision & Rôles Sémantiques Stricts
  const studioCurrentTone = typeof input.backgroundTone === 'number' ? input.backgroundTone : 0.5;
  const studioIsToneActive = input.isBackgroundToneEnabled !== false;
  const studioBgBrightness = typeof input.backgroundBrightness === 'number' ? input.backgroundBrightness : 1.0;
  const studioBackgroundUrl = input.customBackground || input.backgroundImage || input.bgImage;

  const autoLuminance = useAutoLuminance(studioBackgroundUrl, studioCurrentTone, studioIsToneActive, studioBgBrightness);
  const activeLayoutTemplate: LayoutTemplateId = input.layoutTemplate || resolveLayoutTemplateId(input) || 'duality_campaign';
  const currentLayoutTemplate = activeLayoutTemplate;
  const currentTemplateData = {
    topTextLeft: input.templateData?.topTextLeft ?? input.dualityCampaignSlots?.topTextLeft ?? input.topTextLeft ?? input.topDualLeft ?? 'DESCENDRE DANS LA RUE.',
    topTextRight: input.templateData?.topTextRight ?? input.dualityCampaignSlots?.topTextRight ?? input.topTextRight ?? input.topDualRight ?? 'SE FAIRE ENTENDRE AUTREMENT.',
    bottomTitle: input.templateData?.bottomTitle ?? input.dualityCampaignSlots?.bottomTitle ?? input.bottomTitle ?? input.mainTitle ?? 'CHOISISSEZ',
    bottomAccent: input.templateData?.bottomAccent ?? input.dualityCampaignSlots?.bottomAccent ?? input.bottomAccent ?? input.accentWord ?? 'VOTRE VOIE.',
  };
  const dualitySlots = currentTemplateData;
  const headlinerSlots = resolveHeadlinerEventSlots(input);
  const minimalSlots = resolveMinimalBrandSlots(input);
  const semanticRoles = resolveSemanticRoles(input);
  const currentComposition: CompositionTemplate = input.compositionTemplate || (activeLayoutTemplate === 'headliner_event' ? 'headliner' : activeLayoutTemplate === 'minimal_brand' ? 'minimalist' : 'campaign_dual');

  const renderFlyerMiniatureContent = (overrideFormat?: string) => {
    const activeFormat = overrideFormat || previewFormat;
    const activeIsBanner = activeFormat === 'banner';
    const activeTransforms = getTransformsForFormat(activeFormat);
    const isDecorActive = !isExporting && activeSection === 'decor';
    const isSubjectActive = !isExporting && activeSection === 'subject';
    const isLogoActive = !isExporting && activeSection === 'logo';
    const isTextsActive = !isExporting && (activeSection === 'textSizes' || activeSection === 'texts');
    const effectiveFocusedField = isExporting ? null : focusedTextField;

    if (activeFormat === 'tshirt') {
      const isBack = activeView === 'dos';
      const side = isBack ? 'back' : 'front';
      const ghostSrc = resolveGarmentTemplateSrc('tshirt', input.tshirtColor || 'black', side);
      const mannequinSrc = isBack ? '/demo/artist-mannequin-blank-back.jpg' : '/demo/artist-mannequin-blank.jpg';

      const isInvalidOldImage = (url?: string | null) => {
        if (!url) return false;
        return url.includes('21nine') || url.includes('mannequin-blank');
      };

      const dtfLogoUrl = resolveActiveTextileLogo(input, side);
      const logoMode = resolveActiveTextileColorMode(input, input.tshirtColor || 'black');
      const isScreenBlend = logoMode === 'white' || logoMode === 'knockout_black';

      const currentPlacement = clampDtfPlacement(isBack ? backPlacement : frontPlacement, side);
      const rawVton = isBack ? input.tshirtPreviewImages?.back : input.tshirtPreviewImages?.front;
      const vtonResult = isInvalidOldImage(rawVton) ? null : rawVton;

      return (
        <div
          ref={containerRef}
          onContextMenu={(e) => e.preventDefault()}
          className="relative w-full aspect-square overflow-hidden rounded-2xl bg-zinc-950 flex items-center justify-center select-none -webkit-touch-callout-none"
          style={{
            WebkitTouchCallout: 'none',
            WebkitUserSelect: 'none',
            userSelect: 'none',
            touchAction: 'none',
          }}
        >
          {currentTshirtView === 'ghost' ? (
            /* --- 1. VUE GABARIT (T-shirt à plat - Marquage DTF standard figé) --- */
            <>
              <img
                src={ghostSrc}
                crossOrigin="anonymous"
                alt="Gabarit t-shirt à plat"
                draggable={false}
                width={800}
                height={800}
                loading="lazy"
                onContextMenu={(e) => e.preventDefault()}
                className="w-full h-full object-contain pointer-events-none select-none -webkit-touch-callout-none"
                style={{
                  WebkitTouchCallout: 'none',
                  WebkitUserSelect: 'none',
                  userSelect: 'none',
                  touchAction: 'none',
                }}
              />

              {dtfLogoUrl && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={isLogoActive ? handlePointerDown : undefined}
                  onPointerMove={isLogoActive ? handlePointerMove : undefined}
                  onPointerUp={isLogoActive ? handlePointerUp : undefined}
                  onPointerCancel={isLogoActive ? handlePointerUp : undefined}
                  className={`absolute flex items-center justify-center select-none touch-none z-10 transition-all ${isLogoActive
                      ? isDragging
                        ? 'cursor-grabbing pointer-events-auto ring-1 ring-dashed ring-lime-400 shadow-[0_0_15px_rgba(163,230,53,0.5)] rounded-xl'
                        : 'cursor-grab hover:ring-2 hover:ring-lime-400/80 ring-1 ring-dashed ring-lime-400/80 shadow-[0_0_12px_rgba(163,230,53,0.3)] pointer-events-auto rounded-xl'
                      : 'pointer-events-none'
                    }`}
                  style={{
                    left: `${currentPlacement.x}%`,
                    top: `${currentPlacement.y}%`,
                    width: isBack ? `${32 * currentPlacement.scale}%` : `${14 * currentPlacement.scale}%`,
                    aspectRatio: '1 / 1',
                    transform: 'translate(-50%, -50%)',
                    filter: getTextileLogoFilter(logoMode, side),
                    mixBlendMode: isScreenBlend ? 'screen' : undefined,
                    touchAction: 'none',
                    pointerEvents: isLogoActive ? 'auto' : 'none',
                  }}
                  title={isLogoActive ? "Glisser-déposer pour positionner le logo sur le gabarit" : undefined}
                >
                  <img
                    src={dtfLogoUrl}
                    crossOrigin="anonymous"
                    alt="Logo DTF"
                    width={200}
                    height={200}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-contain pointer-events-none select-none -webkit-touch-callout-none"
                    draggable={false}
                    onContextMenu={(e) => e.preventDefault()}
                    style={{
                      WebkitTouchCallout: 'none',
                      WebkitUserSelect: 'none',
                      userSelect: 'none',
                      touchAction: 'none',
                    }}
                  />
                </div>
              )}
            </>
          ) : (
            /* --- 2. VUE MANNEQUIN (Modèle porté neutre - DTF Calibré) --- */
            <>
              {isGeneratingVton ? (
                <DtfScanLoading silhouetteSrc={mannequinSrc} />
              ) : vtonResult ? (
                <div className="relative w-full h-full flex items-center justify-center bg-zinc-950 overflow-hidden">
                  <img
                    src={vtonResult}
                    crossOrigin="anonymous"
                    alt="Rendu Mannequin VTON"
                    draggable={false}
                    width={800}
                    height={800}
                    loading="lazy"
                    onContextMenu={(e) => e.preventDefault()}
                    className="w-full h-full object-cover pointer-events-none select-none -webkit-touch-callout-none transition-opacity duration-300"
                    style={{
                      WebkitTouchCallout: 'none',
                      WebkitUserSelect: 'none',
                      userSelect: 'none',
                      touchAction: 'none',
                    }}
                  />
                  {/* Bouton discret Demande Spéciale / Ajustement */}
                  <div className="absolute bottom-3 inset-x-0 flex justify-center z-20 pointer-events-auto">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!currentUser) {
                          showToast("Compte requis : Connectez-vous pour demander un ajustement IA sur mesure.", 'warning');
                          setShowAuthGateModal(true);
                          return;
                        }
                        setIsAdjustmentModalOpen(true);
                      }}
                      className="px-3.5 py-1.5 rounded-full bg-zinc-950/85 hover:bg-black text-zinc-200 hover:text-white border border-white/20 hover:border-lime-400 text-xs font-mono font-bold backdrop-blur-md shadow-xl transition-all flex items-center gap-2 cursor-pointer group active:scale-95"
                    >
                      <span className="text-lime-400 group-hover:scale-110 transition-transform">💬</span>
                      <span>Demande Spéciale / Ajustement</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* RÈGLE 2 & 3 : STRICTEMENT AUCUN OVERLAY CSS DU LOGO SUR LE MANNEQUIN.
                   Mannequin neutre vierge avec bouton d'action explicite au centre */
                <div className="relative w-full h-full flex items-center justify-center bg-zinc-950 overflow-hidden">
                  <img
                    src={mannequinSrc}
                    crossOrigin="anonymous"
                    alt={isBack ? "Mannequin neutre dos" : "Mannequin neutre face"}
                    draggable={false}
                    width={800}
                    height={800}
                    loading="lazy"
                    onContextMenu={(e) => e.preventDefault()}
                    className="w-full h-full object-cover pointer-events-none select-none -webkit-touch-callout-none"
                    style={{
                      WebkitTouchCallout: 'none',
                      WebkitUserSelect: 'none',
                      userSelect: 'none',
                      touchAction: 'none',
                    }}
                  />
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-black/40 backdrop-blur-[2px] z-10 pointer-events-auto">
                    <button
                      type="button"
                      disabled={isGeneratingVton}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTriggerVton(activeView);
                      }}
                      className="px-5 py-3 rounded-2xl bg-lime-400 hover:bg-lime-300 text-black font-mono font-black text-xs sm:text-sm shadow-2xl shadow-lime-400/30 active:scale-95 transition-all flex items-center gap-2.5 cursor-pointer border-2 border-lime-300 group focus-visible:ring-2 focus-visible:ring-lime-400"
                    >
                      <Sparkles className="w-4 h-4 fill-black group-hover:rotate-12 transition-transform shrink-0" />
                      <span>Générer Rendu Mannequin IA ({isBack ? 'Dos' : 'Face'})</span>
                    </button>
                    <p className="mt-2 text-[11px] font-mono text-zinc-300/80 bg-black/60 px-2.5 py-1 rounded-full border border-white/10">
                      Calibrage DTF prêt • Synthèse photoréaliste
                    </p>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Barres de contrôles en haut de la miniature */}
          <div className="absolute top-2 inset-x-2 flex items-center justify-between gap-1 z-20 pointer-events-auto">
            {/* Sélecteur Vue Face / Dos interactif */}
            <div className="flex items-center gap-0.5 bg-black/85 backdrop-blur-md p-0.5 rounded-lg border border-white/10 shadow-md">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveView('face');
                }}
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition cursor-pointer flex items-center gap-1 ${!isBack ? 'bg-lime-400 text-black font-black shadow-sm' : 'text-zinc-400 hover:text-white'
                  }`}
                title="Afficher la vue de face (poitrine)"
              >
                <Shirt className="w-3 h-3 shrink-0" />
                <span>Face</span>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveView(isBack ? 'face' : 'dos');
                }}
                className="text-zinc-500 hover:text-lime-400 px-1 text-[9px] transition cursor-pointer select-none flex items-center justify-center"
                title="Inverser la vue Face / Dos"
                aria-label="Inverser la vue Face / Dos"
              >
                <ArrowLeftRight className="w-2.5 h-2.5" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveView('dos');
                }}
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition cursor-pointer flex items-center gap-1 ${isBack ? 'bg-lime-400 text-black font-black shadow-sm' : 'text-zinc-400 hover:text-white'
                  }`}
                title="Afficher la vue de dos"
              >
                <span>Dos</span>
              </button>
            </div>

            {/* Sélecteur Gabarit / Mannequin */}
            <div className="flex items-center gap-0.5 bg-black/80 backdrop-blur-md p-0.5 rounded-lg border border-white/10 shadow-md">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setTshirtView('ghost');
                }}
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition cursor-pointer ${currentTshirtView === 'ghost' ? 'bg-lime-400 text-black font-black shadow-sm' : 'text-zinc-400 hover:text-white'
                  }`}
              >
                👕 Gabarit
              </button>
              <button
                type="button"
                disabled={isGeneratingVton}
                onClick={(e) => {
                  e.stopPropagation();
                  setTshirtView('model');
                }}
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition cursor-pointer ${currentTshirtView === 'model' ? 'bg-lime-400 text-black font-black shadow-sm' : 'text-zinc-400 hover:text-white'
                  }`}
              >
                👤 Mannequin
              </button>
            </div>
          </div>
        </div>
      );
    }

    // FORMATS POSTERS (A3, Post, Story, Banner) : Moteur de rendu unifié Single Source of Truth
    if (activeFormat === 'a3' || activeFormat === 'post' || activeFormat === 'story' || activeFormat === 'banner') {
      const activeLogoTr = resolvePinnedLogoTransform(input, activeFormat);
      const bgImg = input.customBackground || input.backgroundImage || input.bgImage;
      const subjProps = input.djPhoto ? {
        image: input.djPhoto,
        scale: activeTransforms.scale,
        x: activeTransforms.offsetX,
        y: activeTransforms.offsetY,
        bottomFade: input.subjectFadeIntensity,
        opacity: typeof input.djPhotoOpacity === 'number' ? input.djPhotoOpacity : 1,
        contrast: input.subjectContrast,
        saturation: input.subjectSaturation,
        brightness: input.subjectBrightness,
        hueRotate: input.subjectHueRotate,
        blendMode: input.subjectBlendMode,
        isHarmonized: input.isSubjectHarmonized,
        alignX: activeTransforms.alignX,
        shadow: input.subjectShadowColor ? {
          x: input.subjectShadowOffsetX,
          y: input.subjectShadowOffsetY,
          blur: input.subjectShadowBlur,
          color: input.subjectShadowColor,
          opacity: input.subjectShadowOpacity,
        } : null,
      } : null;
      const logoProps = (input.logoImage || input.logoUrl) ? {
        image: input.logoImage || input.logoUrl,
        scale: activeLogoTr.scale,
        x: activeLogoTr.x,
        y: activeLogoTr.y,
        opacity: input.logoOpacity,
        rotation: input.logoRotation,
        colorMode: input.logoColorMode,
      } : null;

      return (
        <FlyerPosterRenderer
          projectData={input}
          backgroundImage={bgImg}
          subject={subjProps}
          logo={logoProps}
          layoutTemplate={currentLayoutTemplate || 'duality_campaign'}
          templateData={currentTemplateData}
          format={activeFormat}
          isInteractive={true}
          activeSection={activeSection}
          activeSubjectTab={activeSubjectTab}
          focusedTextField={effectiveFocusedField}
          isDraggingField={isDraggingField}
          isPickingColor={isPickingColor}
          isDraggingSubject={isDraggingSubject}
          onVisualElementClick={handleVisualElementClick}
          onSubjectDragStart={handleSubjectDragStart}
          onSubjectDragMove={handleSubjectDragMove}
          onSubjectDragEnd={handleSubjectDragEnd}
          onUpdateSubjectPosition={handleUpdateSubjectPosition}
          onTextDragStart={handleTextDragStart}
          onTextDragMove={handleTextDragMove}
          onTextDragEnd={handleTextDragEnd}
          setInput={setInput}
          containerRef={containerRef}
          isExporting={isExporting}
        />
      );
    }

    const backgroundUrl = input.customBackground || input.backgroundImage || input.bgImage;
    const activeBgKey = (['post', 'story', 'banner', 'a3'].includes(activeFormat) ? activeFormat : 'a3') as 'post' | 'story' | 'banner' | 'a3';
    const activeBgTransform = resolveBackgroundTransformForFormat(input, activeBgKey);
    const maxActiveBgOffset = Math.max(Math.abs(activeBgTransform.offsetX), Math.abs(activeBgTransform.offsetY));
    const activeDynamicBleed = Math.max(1.15, 1.0 + (maxActiveBgOffset / 50));
    const activeEffectiveScale = activeDynamicBleed * (activeBgTransform.scale ?? 1.0);
    const resolvedTextScales = resolveTextScalesForFormat(input, activeFormat);
    const resolvedOffsetsY = resolveTextOffsetsYForFormat(input, activeFormat);
    const resolvedOffsetsX = resolveTextOffsetsXForFormat(input, activeFormat);
    const resolvedLineSpacing = resolveTextLineSpacingForFormat(input, activeFormat);
    const resolvedAlignment = resolveTextAlignmentForFormat(input, activeFormat);
    const resolvedAlignments = resolveTextAlignmentsForFormat(input, activeFormat);
    const resolvedColors = resolveTextColorsForFormat(input, activeFormat);
    const isTitleBehindSubject = input.titleLayerOrder !== 'front-subject';

    return (
      <>
        <div
          data-canvas-bg="true"
          className={`absolute inset-0 transition-colors duration-300 select-none z-0 ${isDecorActive
              ? 'pointer-events-auto cursor-pointer ring-1 ring-inset ring-dashed ring-lime-400/60 shadow-[inset_0_0_15px_rgba(163,230,53,0.15)]'
              : 'pointer-events-none'
            }`}
          style={{
            backgroundColor: canvasBgColor,
            touchAction: 'none',
            pointerEvents: isDecorActive ? 'auto' : 'none',
          }}
          onClick={isDecorActive ? (e) => {
            e.stopPropagation();
            handleVisualElementClick('decor');
          } : undefined}
          title={isDecorActive ? "Cliquer pour configurer le décor" : undefined}
        />

        {/* Indication discrète de référence de l'axe Y (positionnée de manière excentrée en haut à gauche pour ne jamais masquer les titres) */}
        {!isExporting && isDraggingField && (
          <div className="absolute top-2.5 left-2.5 z-[70] pointer-events-none flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-950/90 border border-lime-400/80 text-lime-400 font-mono text-[10px] shadow-[0_0_15px_rgba(0,0,0,0.8)] backdrop-blur-md select-none animate-in fade-in duration-150">
            <span className="font-black">⇕ Axe Y</span>
            <span className="bg-lime-400/20 px-1.5 py-0.5 rounded text-lime-300 font-black">
              {`${(resolvedOffsetsY[isDraggingField as keyof TextOffsetsY] ?? 0) > 0 ? `+${resolvedOffsetsY[isDraggingField as keyof TextOffsetsY]}` : (resolvedOffsetsY[isDraggingField as keyof TextOffsetsY] ?? 0)} cqi`}
            </span>
          </div>
        )}

        {/* Overlay discret : bouton centrage instantané de tous les calques */}
        {!isExporting && isTextsActive && (
          <div className="absolute top-2.5 right-2.5 z-40 flex items-center gap-1.5 pointer-events-auto">
            <button
              type="button"
              data-testid="preview-overlay-center-btn"
              onClick={(e) => {
                e.stopPropagation();
                handleCenterAllLayers();
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/85 hover:bg-black text-lime-300 hover:text-white border border-lime-400/40 hover:border-lime-400 text-[10px] font-mono font-bold shadow-lg backdrop-blur-md cursor-pointer active:scale-95 transition-all"
              title="Centrage horizontal instantané de tous les calques"
            >
              <AlignCenter className="w-2.5 h-2.5 text-lime-400 shrink-0" />
              <span className="hidden sm:inline">Centrer calques</span>
            </button>
          </div>
        )}

        {/* Cadre d'accueil neutre pour Studio 100% Vierge */}
        {!backgroundUrl && !input.djPhoto && !input.secondaryDjPhoto && !input.logoImage && !input.logoUrl && !input.eventName?.trim() && !input.djName?.trim() && !input.headerTagline?.trim() && !input.punchline?.trim() && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-4 text-center select-none z-10">
            <div className="w-12 h-12 rounded-2xl border border-dashed border-zinc-800 flex items-center justify-center mb-2 text-zinc-600 bg-zinc-950/40">
              <Sparkles className="w-5 h-5 text-zinc-600" />
            </div>
            <p className="text-[11px] font-mono font-bold text-zinc-500 uppercase tracking-wider">
              Studio Vierge
            </p>
            <p className="text-[9px] font-mono text-zinc-600 mt-0.5 max-w-[170px]">
              Page blanche totale — Configurez vos visuels et textes ci-dessous
            </p>
          </div>
        )}

        {backgroundUrl && (
          <img
            src={backgroundUrl}
            crossOrigin="anonymous"
            alt="Décor de fond"
            draggable={false}
            width={768}
            height={1376}
            loading="eager"
            fetchPriority="high"
            decoding="async"
            onContextMenu={(e) => e.preventDefault()}
            className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none -webkit-touch-callout-none z-0"
            style={{
              WebkitTouchCallout: 'none',
              WebkitUserSelect: 'none',
              userSelect: 'none',
              touchAction: 'none',
              transform: `translate(${activeBgTransform.offsetX}%, ${activeBgTransform.offsetY}%) scale(${activeEffectiveScale})`,
              transformOrigin: 'center center',
              opacity: (isToneCenter || Math.abs(currentTone - 0.5) < 0.03) ? 1 : (input.backgroundOpacity ?? 1),
              filter: (isToneCenter || Math.abs(currentTone - 0.5) < 0.03 || toneOverlay.filterCss === 'none') ? 'none' : toneOverlay.filterCss,
            }}
            title="Cliquer pour configurer le fond (Décor & Ambiance)"
          />
        )}

        {/* Calque d'overlay de tonalité Blanc ↔ Noir : totalement masqué en neutre */}
        {isToneActive && !isToneCenter && Math.abs(currentTone - 0.5) >= 0.03 && (
          <div
            className="absolute inset-0 pointer-events-none transition-all duration-300 z-0"
            style={{
              backgroundColor: toneOverlay.color,
              opacity: toneOverlay.opacity,
              display: toneOverlay.display,
            }}
          />
        )}



        {/* Calque d'harmonisation & compression d'ambiance du sujet */}
        {input.djPhoto && input.isSubjectHarmonized && !input.isSubjectMerged && !isToneCenter && (
          <div
            className="absolute inset-0 pointer-events-none z-[19] transition-all duration-300"
            style={{
              background: isLightCanvas
                ? 'radial-gradient(ellipse at 50% 65%, transparent 35%, rgba(0,0,0,0.14) 100%)'
                : `radial-gradient(ellipse at 50% 70%, transparent 40%, rgba(0,0,0,0.55) 95%), radial-gradient(circle at 50% 60%, ${primaryColor}18 0%, transparent 65%)`,
              mixBlendMode: isLightCanvas ? 'multiply' : 'soft-light',
            }}
          />
        )}

        {input.djPhoto && !input.isSubjectMerged && (
          <div
            className={`absolute inset-0 flex ${activeIsBanner
              ? activeTransforms?.alignX === 'right'
                ? 'justify-center translate-x-[5%]'
                : activeTransforms?.alignX === 'left'
                  ? 'justify-center -translate-x-[5%]'
                  : 'justify-center'
              : activeTransforms?.alignX === 'right'
                ? 'justify-end pr-[6%] sm:pr-[10%]'
                : activeTransforms?.alignX === 'left'
                  ? 'justify-start pl-[6%] sm:pl-[10%]'
                  : 'justify-center'
              } items-end pointer-events-none ${(input.foregroundSubject === 'subject1' || input.subjectStackOrder === 'primary-front' || input.subjectLayerOrder === '1_over_2') ? 'z-[21]' : 'z-20'} ${activeIsBanner ? '' : 'pt-16'
              }`}
            style={{
              transform: `translate(${activeTransforms.offsetX ?? 0}%, ${activeTransforms.offsetY}%) scale(${activeTransforms.scale})`,
              transformOrigin: 'bottom center',
              opacity: typeof input.djPhotoOpacity === 'number' ? input.djPhotoOpacity : (activeIsBanner ? 0.95 : 1),
              ...containerFadeMask,
              mixBlendMode: 'normal',
            }}
          >
            <div className="relative inline-flex items-end justify-center max-h-full max-w-full">
              <img
                src={input.djPhoto}
                crossOrigin="anonymous"
                alt="Sujet DJ"
                draggable={isSubjectActive && !isPickingColor}
                width={768}
                height={1376}
                loading="eager"
                fetchPriority="high"
                decoding="async"
                onContextMenu={(e) => e.preventDefault()}
                onClick={isSubjectActive ? (e) => {
                  if (isPickingColor) {
                    handleSubjectColorPick(e, false);
                  }
                } : undefined}
                onMouseDown={isSubjectActive ? (e) => {
                  if (isPickingColor) {
                    handleSubjectColorPick(e, false);
                    return;
                  }
                  handleSubjectDragStart(e);
                } : undefined}
                onMouseMove={isSubjectActive ? (e) => {
                  if (!isPickingColor && isDraggingSubject) {
                    handleSubjectDragMove(e.clientX, e.clientY);
                  }
                } : undefined}
                onMouseUp={isSubjectActive ? handleSubjectDragEnd : undefined}
                onPointerDown={isSubjectActive ? (e) => {
                  if (isPickingColor) {
                    handleSubjectColorPick(e, false);
                    return;
                  }
                  handleSubjectDragStart(e);
                } : undefined}
                onPointerMove={isSubjectActive ? (e) => {
                  if (!isPickingColor && isDraggingSubject) {
                    handleSubjectDragMove(e.clientX, e.clientY);
                  }
                } : undefined}
                onPointerUp={isSubjectActive ? handleSubjectDragEnd : undefined}
                onDragStart={(e) => e.preventDefault()}
                title={isSubjectActive ? (isPickingColor ? "Cliquez sur une zone pour retirer sa couleur à la pipette" : "Glisser-déposer pour déplacer librement le sujet à la souris") : undefined}
                className={`max-h-full max-w-full object-contain object-bottom select-none image-render-hd transition-all ${isSubjectActive
                    ? isPickingColor
                      ? 'pointer-events-auto cursor-crosshair ring-4 ring-amber-400 shadow-[0_0_25px_rgba(251,191,36,0.9)] animate-pulse'
                      : isDraggingSubject
                        ? 'pointer-events-auto cursor-grabbing ring-2 ring-lime-400 shadow-[0_0_25px_rgba(163,230,53,0.85)] scale-[1.01]'
                        : 'pointer-events-auto cursor-move sm:cursor-grab hover:ring-2 hover:ring-lime-400/80 ring-1 ring-dashed ring-lime-400/80 shadow-[0_0_15px_rgba(163,230,53,0.25)] rounded-xl'
                    : 'pointer-events-none cursor-default'
                  }`}
                style={{
                  WebkitTouchCallout: 'none',
                  WebkitUserSelect: 'none',
                  userSelect: 'none',
                  touchAction: 'none',
                  pointerEvents: isSubjectActive ? 'auto' : 'none',
                  cursor: isSubjectActive ? (isPickingColor ? 'crosshair' : 'move') : 'default',
                  imageRendering: 'high-quality' as any,
                  WebkitBackfaceVisibility: 'hidden',
                  backfaceVisibility: 'hidden',
                  transform: 'translateZ(0)',
                  filter: (() => {
                    if (isToneCenter) {
                      return 'none';
                    }

                    if (!input.isSubjectHarmonized) {
                      return isLightCanvas
                        ? 'drop-shadow(0 20px 35px rgba(0,0,0,0.25)) contrast(1.04)'
                        : `drop-shadow(0 0 1px rgba(0,0,0,0.95)) drop-shadow(0 0 20px ${primaryColor}55) drop-shadow(0 20px 35px rgba(0,0,0,0.85)) contrast(1.06) brightness(1.02)`;
                    }

                    const sBrightness = input.subjectBrightness ?? 0.98;
                    const sContrast = input.subjectContrast ?? (isLightCanvas ? 1.10 : 1.12);
                    const sSaturation = input.subjectSaturation ?? (isLightCanvas ? 1.05 : 1.12);
                    const sHueRotate = input.subjectHueRotate ?? 0;
                    const sShadowX = input.subjectShadowOffsetX ?? 0;
                    const sShadowY = input.subjectShadowOffsetY ?? (isLightCanvas ? 16 : 20);
                    const sShadowBlur = input.subjectShadowBlur ?? (isLightCanvas ? 28 : 32);
                    const sShadowOpacity = input.subjectShadowOpacity ?? (isLightCanvas ? 0.35 : 0.75);
                    const sShadowColor = input.subjectShadowColor || `rgba(0, 0, 0, ${sShadowOpacity})`;

                    const shadowPart = `drop-shadow(${sShadowX}px ${sShadowY}px ${sShadowBlur}px ${sShadowColor})`;
                    const rimLightPart = !isLightCanvas && primaryColor
                      ? `drop-shadow(0 0 1px rgba(0,0,0,0.95)) drop-shadow(0 0 20px ${primaryColor}40)`
                      : '';
                    const colorAdjust = `contrast(${sContrast}) brightness(${sBrightness}) saturate(${sSaturation})${sHueRotate ? ` hue-rotate(${sHueRotate}deg)` : ''}`;

                    return [rimLightPart, shadowPart, colorAdjust].filter(Boolean).join(' ');
                  })(),
                }}
              />
            </div>
          </div>
        )}
        {/* SECOND SUJET (DUO / B2B) */}
        {input.secondaryDjPhoto && !input.isSubjectMerged && (() => {
          const secondaryResolved = resolveSecondarySubjectTransform(
            input,
            activeFormat,
            input.djPhoto ? {
              scale: activeTransforms.scale,
              offsetY: activeTransforms.offsetY,
              offsetX: activeTransforms.offsetX,
              alignX: activeTransforms.alignX,
            } : null
          );
          return (
            <div
              className={`absolute inset-0 flex items-end justify-center pointer-events-none ${(input.foregroundSubject === 'subject1' || input.subjectStackOrder === 'primary-front' || input.subjectLayerOrder === '1_over_2') ? 'z-20' : 'z-[21]'} ${activeIsBanner ? '' : 'pt-16'
                }`}
              style={{
                transform: `translate(${secondaryResolved.offsetX}%, ${secondaryResolved.offsetY}%) scale(${secondaryResolved.scale})`,
                transformOrigin: 'bottom center',
                opacity: typeof input.secondaryDjPhotoOpacity === 'number' ? input.secondaryDjPhotoOpacity : 1,
                ...((input.secondarySubjectFadeIntensity ?? 35) > 0
                  ? {
                    WebkitMaskImage: `linear-gradient(to bottom, black 0%, black ${Math.max(20, 100 - (input.secondarySubjectFadeIntensity ?? 35))}%, transparent 100%)`,
                    maskImage: `linear-gradient(to bottom, black 0%, black ${Math.max(20, 100 - (input.secondarySubjectFadeIntensity ?? 35))}%, transparent 100%)`,
                  }
                  : {}),
              }}
            >
              <div className="relative inline-flex items-end justify-center max-h-full max-w-full">
                <img
                  src={input.secondaryDjPhoto}
                  crossOrigin="anonymous"
                  alt="Second Sujet B2B"
                  draggable={false}
                  width={768}
                  height={1376}
                  loading="eager"
                  fetchPriority="high"
                  decoding="async"
                  onContextMenu={(e) => e.preventDefault()}
                  onMouseDown={isSubjectActive ? (e) => {
                    if (isPickingColor) {
                      handleSubjectColorPick(e, true);
                      return;
                    }
                    handleSubjectDragStart(e, 'secondary');
                  } : undefined}
                  onPointerDown={isSubjectActive ? (e) => {
                    if (isPickingColor) {
                      handleSubjectColorPick(e, true);
                      return;
                    }
                    handleSubjectDragStart(e, 'secondary');
                  } : undefined}
                  onPointerUp={isSubjectActive ? handleSubjectDragEnd : undefined}
                  onMouseUp={isSubjectActive ? handleSubjectDragEnd : undefined}
                  onDragStart={(e) => e.preventDefault()}
                  onClick={isSubjectActive ? (e) => {
                    if (isPickingColor) {
                      handleSubjectColorPick(e, true);
                      return;
                    }
                    e.stopPropagation();
                  } : undefined}
                  title={isSubjectActive ? (isPickingColor ? "Cliquez sur une zone pour retirer sa couleur à la pipette" : "Glisser-déposer pour déplacer librement le sujet 2") : undefined}
                  className={`max-h-full max-w-full object-contain object-bottom select-none transition-all rounded-xl ${isSubjectActive
                      ? isPickingColor
                        ? 'pointer-events-auto cursor-crosshair ring-4 ring-amber-400 shadow-[0_0_25px_rgba(251,191,36,0.9)] animate-pulse'
                        : isDraggingSubject && subjectDragStateRef.current?.target === 'secondary'
                          ? 'pointer-events-auto cursor-grabbing ring-2 ring-lime-400'
                          : `pointer-events-auto cursor-move sm:cursor-grab hover:ring-2 hover:ring-lime-400/80 ring-1 ring-dashed ring-lime-400/80 shadow-[0_0_15px_rgba(163,230,53,0.25)] ${activeSubjectTab === 'secondary' ? 'ring-2 ring-lime-400' : ''}`
                      : 'pointer-events-none cursor-default'
                    }`}
                  style={{
                    WebkitTouchCallout: 'none',
                    WebkitUserSelect: 'none',
                    userSelect: 'none',
                    touchAction: 'none',
                    pointerEvents: isSubjectActive ? 'auto' : 'none',
                    cursor: isSubjectActive ? (isPickingColor ? 'crosshair' : 'move') : 'default',
                    filter: isToneCenter
                      ? 'none'
                      : isLightCanvas
                        ? 'drop-shadow(0 20px 35px rgba(0,0,0,0.25)) contrast(1.04)'
                        : `drop-shadow(0 0 1px rgba(0,0,0,0.95)) drop-shadow(0 20px 35px rgba(0,0,0,0.85)) contrast(1.06) brightness(1.02)`,
                  }}
                />
              </div>
            </div>
          );
        })()}
        {activeIsBanner ? (
          <div className="absolute inset-0 pointer-events-none">
            {/* Format Bannière (10:3) : Titres alignés sur le même axe horizontal */}
            <div className="absolute inset-x-0 top-[42%] -translate-y-1/2 pointer-events-none flex justify-between px-3 sm:px-6">
              {/* GAUCHE : Surtitre, Titres, Sous-titres */}
              <div
                className={`w-[34%] max-w-[34%] min-w-0 flex flex-col pointer-events-none tracking-tighter ${resolvedAlignment === 'right' ? 'items-end text-right' : resolvedAlignment === 'center' ? 'items-center text-center' : 'items-start text-left'
                  }`}
                style={{
                  gap: `${resolvedLineSpacing}cqi`,
                }}
              >
                {posterTextItems.filter((i: PosterTextItem) => ['surtitre', 'titre', 'soustitre'].includes(i.type)).map((item: PosterTextItem) => {
                  if (item.isVisible === false || (!item.text?.trim() && focusedTextField !== item.id)) return null;
                  const isTitle = item.type === 'titre';
                  const isSurtitre = item.type === 'surtitre';
                  const isBehind = item.layerPosition
                    ? item.layerPosition === 'behind_subject'
                    : (isTitle || isSurtitre ? isTitleBehindSubject : false);
                  const zIdx = isBehind ? 10 : 30;
                  const cleanText = getCleanDisplayText(sanitizeStudioText(item.text || ' '));
                  const segments = parseTextSegments(item.text, item.color || '#FFFFFF', item.accentColor || '#E11D48', item.highlightedWords);
                  const itemLetterSpacing = item.letterSpacing !== undefined ? `${item.letterSpacing}px` : undefined;
                  const itemFontWeight = item.fontWeight ? resolveFontWeight(item.fontWeight) : undefined;
                  const capsuleClass = item.hasBackgroundPill ? 'bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded shadow-sm' : '';

                  return (
                    <div
                      key={item.id}
                      className={`w-full flex min-w-0 pointer-events-none ${item.align === 'left' ? 'justify-start text-left' : item.align === 'right' ? 'justify-end text-right' : 'justify-center text-center'
                        }`}
                      style={{
                        transform: `translateX(${item.x ?? 0}%) translateY(${item.y ?? 0}cqi)`,
                        zIndex: zIdx,
                      }}
                    >
                      {isSurtitre ? (
                        <span
                          data-tap-edit={item.id}
                          onClick={isTextsActive ? (e) => {
                            if (hasJustDraggedRef.current) return;
                            e.stopPropagation();
                            handleVisualElementClick('texts', item.id as any);
                          } : undefined}
                          className={`font-mono tracking-widest uppercase mb-0.5 leading-none select-none whitespace-nowrap overflow-visible max-w-full transition-all ${capsuleClass} ${isTextsActive
                              ? effectiveFocusedField === item.id
                                ? 'pointer-events-auto cursor-pointer ring-2 ring-lime-400 rounded px-0.5 bg-lime-400/20 text-lime-300 shadow-[0_0_12px_rgba(163,230,53,0.8)]'
                                : 'pointer-events-auto cursor-pointer hover:ring-1 hover:ring-lime-400/50 rounded'
                              : 'pointer-events-none select-none'
                            }`}
                          style={{
                            fontSize: getAutoScaledFontSize(
                              cleanText,
                              1.8 * (item.fontSizeScale ?? 1.0),
                              0.9 * (item.fontSizeScale ?? 1.0),
                              'cqi'
                            ),
                            letterSpacing: itemLetterSpacing ?? '0.12em',
                            fontWeight: itemFontWeight ?? 700,
                            color: focusedTextField === item.id ? undefined : (item.color || '#FFFFFF'),
                            WebkitTextFillColor: focusedTextField === item.id ? undefined : (item.color || '#FFFFFF'),
                            textAlign: item.align,
                            whiteSpace: 'pre',
                            touchAction: 'none',
                            pointerEvents: isTextsActive ? 'auto' : 'none',
                            userSelect: 'none',
                            WebkitUserSelect: 'none',
                          }}
                        >
                          {segments.map((seg, sIdx) => (
                            <span
                              key={sIdx}
                              style={{
                                color: focusedTextField === item.id ? undefined : seg.color,
                                WebkitTextFillColor: focusedTextField === item.id ? undefined : seg.color,
                                display: 'inline-block',
                              }}
                            >
                              {seg.text}
                            </span>
                          ))}
                        </span>
                      ) : isTitle ? (
                        <h1
                          data-tap-edit={item.id}
                          onClick={isTextsActive ? (e) => {
                            if (hasJustDraggedRef.current) return;
                            e.stopPropagation();
                            handleVisualElementClick('texts', item.id as any);
                          } : undefined}
                          className={`${bannerTypo.titleClass.replace(/\btext-(white|black|zinc-\d+|slate-\d+|neutral-\d+|gray-\d+)\b/g, '')} leading-tight uppercase tracking-tighter m-0 whitespace-pre overflow-visible w-full max-w-full transition-all select-none ${capsuleClass} ${isTextsActive
                              ? effectiveFocusedField === item.id
                                ? 'pointer-events-auto cursor-pointer text-lime-300 ring-2 ring-lime-400 rounded-lg shadow-[0_0_15px_rgba(163,230,53,0.85)] scale-[1.02]'
                                : 'pointer-events-auto cursor-pointer hover:ring-1 hover:ring-lime-400/50 rounded-lg'
                              : 'pointer-events-none select-none'
                            }`}
                          style={{
                            ...bannerTypo.titleStyle,
                            color: focusedTextField === item.id ? undefined : (item.color || '#FFFFFF'),
                            WebkitTextFillColor: focusedTextField === item.id ? undefined : (item.color || '#FFFFFF'),
                            letterSpacing: itemLetterSpacing ?? (activeStyleKey === 'HARD' ? '0.06em' : bannerTypo.titleStyle.letterSpacing),
                            fontWeight: itemFontWeight ?? 900,
                            fontSize: getAutoScaledFontSize(
                              cleanText,
                              5.0 * (item.fontSizeScale ?? 1.0),
                              2.2 * (item.fontSizeScale ?? 1.0),
                              'cqi'
                            ),
                            textAlign: item.align,
                            whiteSpace: 'pre',
                            touchAction: 'none',
                            pointerEvents: isTextsActive ? 'auto' : 'none',
                            userSelect: 'none',
                            WebkitUserSelect: 'none',
                          }}
                        >
                          {segments.map((seg, sIdx) => (
                            <span
                              key={sIdx}
                              style={{
                                color: focusedTextField === item.id ? undefined : seg.color,
                                WebkitTextFillColor: focusedTextField === item.id ? undefined : seg.color,
                                display: 'inline-block',
                              }}
                            >
                              {seg.text}
                            </span>
                          ))}
                        </h1>
                      ) : (
                        <span
                          data-tap-edit={item.id}
                          onClick={isTextsActive ? (e) => {
                            if (hasJustDraggedRef.current) return;
                            e.stopPropagation();
                            handleVisualElementClick('texts', item.id as any);
                          } : undefined}
                          className={`font-mono mt-0.5 whitespace-pre overflow-visible max-w-full tracking-tighter leading-tight transition-all select-none ${capsuleClass} ${isTextsActive
                              ? effectiveFocusedField === item.id
                                ? 'pointer-events-auto cursor-pointer text-lime-300 font-bold ring-2 ring-lime-400 rounded shadow-[0_0_12px_rgba(163,230,53,0.8)]'
                                : 'pointer-events-auto cursor-pointer hover:ring-1 hover:ring-lime-400/50 rounded'
                              : 'pointer-events-none select-none'
                            }`}
                          style={{
                            fontSize: getAutoScaledFontSize(
                              cleanText,
                              2.0 * (item.fontSizeScale ?? 1.0),
                              1.0 * (item.fontSizeScale ?? 1.0),
                              'cqi'
                            ),
                            letterSpacing: itemLetterSpacing ?? 'normal',
                            fontWeight: itemFontWeight ?? 700,
                            color: focusedTextField === item.id ? undefined : (item.color || '#FFFFFF'),
                            WebkitTextFillColor: focusedTextField === item.id ? undefined : (item.color || '#FFFFFF'),
                            textAlign: item.align,
                            whiteSpace: 'pre',
                            touchAction: 'none',
                            pointerEvents: isTextsActive ? 'auto' : 'none',
                            userSelect: 'none',
                            WebkitUserSelect: 'none',
                          }}
                        >
                          {segments.map((seg, sIdx) => (
                            <span
                              key={sIdx}
                              style={{
                                color: focusedTextField === item.id ? undefined : seg.color,
                                WebkitTextFillColor: focusedTextField === item.id ? undefined : seg.color,
                                display: 'inline-block',
                              }}
                            >
                              {seg.text}
                            </span>
                          ))}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* DROITE : Badges, Artistes, Textes libres */}
              <div
                className={`w-[34%] max-w-[34%] min-w-0 flex flex-col pointer-events-none tracking-tighter ${resolvedAlignment === 'left' ? 'items-start text-left' : resolvedAlignment === 'center' ? 'items-center text-center' : 'items-end text-right'
                  }`}
                style={{
                  gap: `${resolvedLineSpacing}cqi`,
                }}
              >
                {posterTextItems.filter((i: PosterTextItem) => !['surtitre', 'titre', 'soustitre'].includes(i.type)).map((item: PosterTextItem) => {
                  if (item.isVisible === false || (!item.text?.trim() && focusedTextField !== item.id)) return null;
                  const isBehind = item.layerPosition === 'behind_subject';
                  const zIdx = isBehind ? 10 : 30;
                  const cleanText = getCleanDisplayText(sanitizeStudioText(item.text || ' '));
                  const segments = parseTextSegments(item.text, item.color || '#FFFFFF', item.accentColor || '#E11D48', item.highlightedWords);
                  const itemLetterSpacing = item.letterSpacing !== undefined ? `${item.letterSpacing}px` : undefined;
                  const itemFontWeight = item.fontWeight ? resolveFontWeight(item.fontWeight) : undefined;
                  const capsuleClass = item.hasBackgroundPill ? 'bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded shadow-sm' : '';

                  return (
                    <div
                      key={item.id}
                      className={`w-full flex min-w-0 pointer-events-none relative ${item.align === 'left' ? 'justify-start text-left' : item.align === 'right' ? 'justify-end text-right' : 'justify-center text-center'
                        }`}
                      style={{
                        transform: `translateX(${item.x ?? 0}%) translateY(${item.y ?? 0}cqi)`,
                        zIndex: zIdx,
                      }}
                    >
                      <h2
                        data-tap-edit={item.id}
                        onClick={isTextsActive ? (e) => {
                          if (hasJustDraggedRef.current) return;
                          e.stopPropagation();
                          handleVisualElementClick('texts', item.id as any);
                        } : undefined}
                        className={`${bannerTypo.djClass.replace(/\btext-(white|black|zinc-\d+|slate-\d+|neutral-\d+|gray-\d+)\b/g, '')} font-black leading-tight uppercase tracking-tighter m-0 whitespace-pre overflow-visible w-full max-w-full transition-all select-none ${capsuleClass} ${isTextsActive
                            ? effectiveFocusedField === item.id
                              ? 'pointer-events-auto cursor-pointer text-lime-300 ring-2 ring-lime-400 rounded-lg shadow-[0_0_15px_rgba(163,230,53,0.85)] scale-[1.02]'
                              : 'pointer-events-auto cursor-pointer hover:ring-1 hover:ring-lime-400/50 rounded-lg'
                            : 'pointer-events-none select-none'
                          }`}
                        style={{
                          ...bannerTypo.djStyle,
                          color: focusedTextField === item.id ? undefined : (item.color || '#FFFFFF'),
                          WebkitTextFillColor: focusedTextField === item.id ? undefined : (item.color || '#FFFFFF'),
                          letterSpacing: itemLetterSpacing ?? 'normal',
                          fontWeight: itemFontWeight ?? 900,
                          fontSize: getAutoScaledFontSize(
                            cleanText,
                            4.5 * (item.fontSizeScale ?? 1.0),
                            2.0 * (item.fontSizeScale ?? 1.0),
                            'cqi'
                          ),
                          textAlign: item.align,
                          whiteSpace: 'pre',
                          touchAction: 'none',
                          pointerEvents: isTextsActive ? 'auto' : 'none',
                          userSelect: 'none',
                          WebkitUserSelect: 'none',
                        }}
                      >
                        {segments.map((seg, sIdx) => (
                          <span
                            key={sIdx}
                            style={{
                              color: focusedTextField === item.id ? undefined : seg.color,
                              WebkitTextFillColor: focusedTextField === item.id ? undefined : seg.color,
                              display: 'inline-block',
                            }}
                          >
                            {seg.text}
                          </span>
                        ))}
                      </h2>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Cartouche d'indication (Lieu, Date, Heure) */}
            {(input.date?.trim() || input.venue?.trim() || (input.time || input.timeSlot)?.trim() || ['date', 'timeSlot', 'venue'].includes(focusedTextField || '')) && (
              <div
                className={`absolute bottom-2 sm:bottom-3 inset-x-0 flex pointer-events-none px-2 select-none relative z-[40] ${resolvedAlignments.infoBadge === 'left' ? 'justify-start' : resolvedAlignments.infoBadge === 'right' ? 'justify-end' : 'justify-center'}`}
                style={{
                  transform: `translateX(${resolvedOffsetsX.infoBadge ?? 0}%) translateY(${resolvedOffsetsY.infoBadge ?? 0}cqi)`,
                  touchAction: 'none',
                }}
                onPointerDown={isTextsActive ? (e) => handleTextDragStart(e, 'infoBadge', 'date') : undefined}
                onPointerMove={isTextsActive ? handleTextDragMove : undefined}
                onPointerUp={isTextsActive ? handleTextDragEnd : undefined}
                onPointerCancel={isTextsActive ? handleTextDragEnd : undefined}
                title={isTextsActive ? "Glisser verticalement pour déplacer ou cliquer pour modifier" : undefined}
              >
                <div
                  style={{
                    ...infoBadgeStyle,
                    color: resolvedColors.infoBadge || infoBadgeStyle.color,
                    ...(resolvedColors.infoBadge === '#000000'
                      ? { backgroundColor: 'rgba(255, 255, 255, 0.95)', borderColor: 'rgba(0, 0, 0, 0.2)' }
                      : resolvedColors.infoBadge === '#FFFFFF'
                        ? { backgroundColor: 'rgba(0, 0, 0, 0.92)', borderColor: 'rgba(255, 255, 255, 0.25)' }
                        : {}),
                    fontSize: `${2.2 * (input.cartoucheScale ?? resolvedTextScales.infoBadge ?? 1.0)}cqi`,
                    padding: `${0.6 * (input.cartouchePadding ?? 1.0)}cqi ${1.6 * (input.cartouchePadding ?? 1.0)}cqi`,
                    borderRadius: `${Math.max(0.4, 0.75 * (input.cartoucheScale ?? 1.0))}rem`,
                    pointerEvents: isTextsActive ? 'auto' : 'none',
                    ...(['date', 'timeSlot', 'venue', 'infoBadge'].includes(effectiveFocusedField || '')
                      ? { borderColor: '#ff6b00', boxShadow: '0 0 12px rgba(255, 107, 0, 0.85)' }
                      : {}),
                  }}
                  className={`inline-flex items-center justify-center gap-1.5 sm:gap-2 border font-mono tracking-wider shadow-xl transition-all duration-200 max-w-full truncate ${isTextsActive
                      ? isDraggingField === 'infoBadge'
                        ? 'cursor-grabbing ring-2 ring-lime-400 shadow-[0_0_15px_rgba(255,107,0,0.85)] pointer-events-auto'
                        : ['date', 'timeSlot', 'venue', 'infoBadge'].includes(effectiveFocusedField || '')
                          ? 'cursor-grab ring-2 ring-lime-400 border-lime-400 bg-black/90 text-lime-300 shadow-[0_0_12px_rgba(255,107,0,0.85)] pointer-events-auto'
                          : 'cursor-grab hover:ring-1 hover:ring-lime-400/80 pointer-events-auto'
                      : 'pointer-events-none select-none'
                    }`}
                >
                  {Boolean(input.date?.trim() || focusedTextField === 'date') && (
                    <span
                      onClick={isTextsActive ? (e) => {
                        if (hasJustDraggedRef.current) return;
                        e.stopPropagation();
                        handleVisualElementClick('texts', 'date');
                      } : undefined}
                      className={`font-semibold truncate transition-all ${isTextsActive ? 'cursor-pointer hover:underline' : 'pointer-events-none select-none'
                        } ${focusedTextField === 'date' ? 'text-lime-300 underline font-black drop-shadow-[0_0_6px_rgba(163,230,53,0.9)]' : ''}`}
                    >
                      {Boolean(input.calendarUrl) && <span className="mr-0.5 text-lime-400 opacity-90">📅 </span>}
                      {input.date?.trim() || (focusedTextField === 'date' ? ' ' : '')}
                    </span>
                  )}
                  {Boolean((input.date?.trim() || focusedTextField === 'date') && (((input.time || input.timeSlot)?.trim() || focusedTextField === 'timeSlot') || (input.venue?.trim() || focusedTextField === 'venue'))) && (
                    <span className="opacity-40 select-none shrink-0">•</span>
                  )}
                  {Boolean((input.time || input.timeSlot)?.trim() || focusedTextField === 'timeSlot') && (
                    <span
                      onClick={isTextsActive ? (e) => {
                        if (hasJustDraggedRef.current) return;
                        e.stopPropagation();
                        handleVisualElementClick('texts', 'timeSlot');
                      } : undefined}
                      className={`font-semibold truncate transition-all ${isTextsActive ? 'cursor-pointer hover:underline' : 'pointer-events-none select-none'
                        } ${focusedTextField === 'timeSlot' ? 'text-lime-300 underline font-black drop-shadow-[0_0_6px_rgba(163,230,53,0.9)]' : ''}`}
                    >
                      {(input.time || input.timeSlot)?.trim() || (focusedTextField === 'timeSlot' ? ' ' : '')}
                    </span>
                  )}
                  {Boolean(((input.time || input.timeSlot)?.trim() || focusedTextField === 'timeSlot') && (input.venue?.trim() || focusedTextField === 'venue')) && (
                    <span className="opacity-40 select-none shrink-0">•</span>
                  )}
                  {Boolean(input.venue?.trim() || focusedTextField === 'venue') && (
                    <span
                      onClick={isTextsActive ? (e) => {
                        if (hasJustDraggedRef.current) return;
                        e.stopPropagation();
                        handleVisualElementClick('texts', 'venue');
                      } : undefined}
                      className={`font-semibold truncate transition-all ${isTextsActive ? 'cursor-pointer hover:underline' : 'pointer-events-none select-none'
                        } ${focusedTextField === 'venue' ? 'text-lime-300 underline font-black drop-shadow-[0_0_6px_rgba(163,230,53,0.9)]' : ''}`}
                    >
                      {Boolean(input.venueMapsUrl) && <span className="mr-0.5 text-lime-400 opacity-90">📍 </span>}
                      {input.venue?.trim() || (focusedTextField === 'venue' ? ' ' : '')}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="absolute inset-0 p-2 flex flex-col justify-between pointer-events-none">
            {/* Rendu des Gabarits de Composition Intelligents */}
            {activeLayoutTemplate === 'headliner_event' ? (
              <div className="absolute inset-0 pointer-events-none select-none">
                {/* Nom Artiste Headliner (Tiers supérieur) */}
                {Boolean(headlinerSlots.artistName?.trim() || effectiveFocusedField === 'artistName') && (
                  <div
                    data-tap-edit="artistName"
                    onClick={isTextsActive ? (e) => {
                      if (hasJustDraggedRef.current) return;
                      e.stopPropagation();
                      handleVisualElementClick('texts', 'artistName');
                    } : undefined}
                    className={`absolute top-[20%] inset-x-0 w-[94%] mx-auto text-center select-none uppercase transition-all leading-[0.88] ${isTextsActive
                        ? (effectiveFocusedField === 'artistName' || effectiveFocusedField === 'djName')
                          ? 'pointer-events-auto cursor-pointer ring-2 ring-emerald-400 rounded-xl p-1 bg-emerald-400/20 text-emerald-300 shadow-[0_0_20px_rgba(52,211,153,0.9)] scale-[1.01]'
                          : 'pointer-events-auto cursor-pointer hover:ring-1 hover:ring-emerald-400/50 rounded-xl'
                        : 'pointer-events-none'
                      }`}
                    style={{
                      zIndex: isTitleBehindSubject ? 10 : 30,
                      fontFamily: "'Impact', 'Inter Tight', 'Arial Black', sans-serif",
                      fontSize: 'clamp(38px, 10cqi, 92px)',
                      fontWeight: 900,
                      letterSpacing: '0.02em',
                      color: (effectiveFocusedField === 'artistName' || effectiveFocusedField === 'djName') ? undefined : COLOR_PURE_WHITE,
                      WebkitTextFillColor: (effectiveFocusedField === 'artistName' || effectiveFocusedField === 'djName') ? undefined : COLOR_PURE_WHITE,
                      textShadow: '0 0 25px rgba(0,0,0,0.95), 0 0 45px rgba(255,255,255,0.35), 0 2px 10px rgba(0,0,0,0.95)',
                      WebkitTextStroke: '1px rgba(255,255,255,0.25)',
                    }}
                  >
                    {headlinerSlots.artistName || (effectiveFocusedField === 'artistName' ? ' ' : '')}
                  </div>
                )}

                {/* Capsule compacte semi-sombre lisible en bas : Sous-titre et date intégrés */}
                <div
                  className="absolute bottom-[7%] left-1/2 -translate-x-1/2 max-w-[88%] w-auto pointer-events-none select-none"
                  style={{ zIndex: 30 }}
                >
                  <div className="bg-neutral-950/85 backdrop-blur-md border border-neutral-700/80 rounded-2xl px-5 py-2.5 sm:px-7 sm:py-3.5 shadow-[0_12px_36px_rgba(0,0,0,0.9)] flex flex-col items-center justify-center text-center gap-1">
                    {Boolean(headlinerSlots.subRole?.trim() || effectiveFocusedField === 'subRole') && (
                      <div
                        data-tap-edit="subRole"
                        onClick={isTextsActive ? (e) => {
                          e.stopPropagation();
                          handleVisualElementClick('texts', 'subRole');
                        } : undefined}
                        className={`font-mono font-bold tracking-widest uppercase transition-all ${isTextsActive
                            ? effectiveFocusedField === 'subRole'
                              ? 'pointer-events-auto cursor-pointer text-emerald-300 underline font-black'
                              : 'pointer-events-auto cursor-pointer hover:underline text-amber-400'
                            : 'pointer-events-none text-amber-400'
                          }`}
                        style={{ fontSize: '2.2cqi' }}
                      >
                        {headlinerSlots.subRole || (effectiveFocusedField === 'subRole' ? ' ' : '')}
                      </div>
                    )}
                    {Boolean(headlinerSlots.datePlace?.trim() || effectiveFocusedField === 'datePlace') && (
                      <div
                        data-tap-edit="datePlace"
                        onClick={isTextsActive ? (e) => {
                          e.stopPropagation();
                          handleVisualElementClick('texts', 'datePlace');
                        } : undefined}
                        className={`font-mono font-black tracking-wide text-white uppercase transition-all ${isTextsActive
                            ? effectiveFocusedField === 'datePlace'
                              ? 'pointer-events-auto cursor-pointer text-emerald-300 underline'
                              : 'pointer-events-auto cursor-pointer hover:underline'
                            : 'pointer-events-none'
                          }`}
                        style={{ fontSize: '2.6cqi' }}
                      >
                        {headlinerSlots.datePlace || (effectiveFocusedField === 'datePlace' ? ' ' : '')}
                      </div>
                    )}
                    {Boolean(headlinerSlots.ticketCta?.trim() || effectiveFocusedField === 'ticketCta') && (
                      <div
                        data-tap-edit="ticketCta"
                        onClick={isTextsActive ? (e) => {
                          e.stopPropagation();
                          handleVisualElementClick('texts', 'ticketCta');
                        } : undefined}
                        className={`font-mono font-bold tracking-wider text-emerald-400 uppercase mt-0.5 px-2.5 py-0.5 rounded-full bg-emerald-400/15 border border-emerald-400/30 transition-all ${isTextsActive
                            ? effectiveFocusedField === 'ticketCta'
                              ? 'pointer-events-auto cursor-pointer ring-1 ring-emerald-400'
                              : 'pointer-events-auto cursor-pointer hover:bg-emerald-400/25'
                            : 'pointer-events-none'
                          }`}
                        style={{ fontSize: '1.8cqi' }}
                      >
                        {headlinerSlots.ticketCta || (effectiveFocusedField === 'ticketCta' ? ' ' : '')}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : activeLayoutTemplate === 'minimal_brand' ? (
              <div
                className="absolute top-[9%] left-[8%] max-w-[80%] text-left select-none pointer-events-none"
                style={{ zIndex: 30 }}
              >
                {/* Nom de Marque / Collectif : Grand interlettrage épuré */}
                {Boolean(minimalSlots.brandName?.trim() || effectiveFocusedField === 'brandName') && (
                  <div
                    data-tap-edit="brandName"
                    onClick={isTextsActive ? (e) => {
                      e.stopPropagation();
                      handleVisualElementClick('texts', 'brandName');
                    } : undefined}
                    className={`uppercase transition-all leading-[1.05] ${isTextsActive
                        ? (effectiveFocusedField === 'brandName' || effectiveFocusedField === 'eventName')
                          ? 'pointer-events-auto cursor-pointer ring-2 ring-emerald-400 rounded-lg p-1 bg-emerald-400/20 text-emerald-300'
                          : 'pointer-events-auto cursor-pointer hover:ring-1 hover:ring-emerald-400/50 rounded-lg'
                        : 'pointer-events-none'
                      }`}
                    style={{
                      fontFamily: "'Inter', 'Syne', -apple-system, BlinkMacSystemFont, sans-serif",
                      fontWeight: 300,
                      letterSpacing: '0.25em',
                      fontSize: '5.2cqi',
                      color: (effectiveFocusedField === 'brandName' || effectiveFocusedField === 'eventName') ? undefined : COLOR_PURE_WHITE,
                      WebkitTextFillColor: (effectiveFocusedField === 'brandName' || effectiveFocusedField === 'eventName') ? undefined : COLOR_PURE_WHITE,
                      textShadow: '0 2px 4px rgba(0,0,0,0.85)',
                    }}
                  >
                    {minimalSlots.brandName || (effectiveFocusedField === 'brandName' ? ' ' : '')}
                  </div>
                )}

                {/* Filet vert subtil */}
                <div className="w-14 h-[2px] bg-emerald-500/80 my-2.5 rounded-full" />

                {/* Slogan / Manifeste */}
                {Boolean(minimalSlots.tagline?.trim() || effectiveFocusedField === 'tagline') && (
                  <div
                    data-tap-edit="tagline"
                    onClick={isTextsActive ? (e) => {
                      e.stopPropagation();
                      handleVisualElementClick('texts', 'tagline');
                    } : undefined}
                    className={`uppercase transition-all leading-relaxed max-w-[90%] ${isTextsActive
                        ? (effectiveFocusedField === 'tagline' || effectiveFocusedField === 'punchline')
                          ? 'pointer-events-auto cursor-pointer ring-2 ring-emerald-400 rounded-lg p-1 bg-emerald-400/20 text-emerald-300'
                          : 'pointer-events-auto cursor-pointer hover:ring-1 hover:ring-emerald-400/50 rounded-lg'
                        : 'pointer-events-none'
                      }`}
                    style={{
                      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                      fontWeight: 400,
                      letterSpacing: '0.2em',
                      fontSize: '2.2cqi',
                      color: (effectiveFocusedField === 'tagline' || effectiveFocusedField === 'punchline') ? undefined : '#D4D4D8',
                      WebkitTextFillColor: (effectiveFocusedField === 'tagline' || effectiveFocusedField === 'punchline') ? undefined : '#D4D4D8',
                      textShadow: '0 1px 3px rgba(0,0,0,0.8)',
                    }}
                  >
                    {minimalSlots.tagline || (effectiveFocusedField === 'tagline' ? ' ' : '')}
                  </div>
                )}

                {/* Mention Capsule */}
                {Boolean(minimalSlots.releaseDate?.trim() || effectiveFocusedField === 'releaseDate') && (
                  <div
                    data-tap-edit="releaseDate"
                    onClick={isTextsActive ? (e) => {
                      e.stopPropagation();
                      handleVisualElementClick('texts', 'releaseDate');
                    } : undefined}
                    className={`font-mono font-bold uppercase mt-3.5 inline-block px-3 py-1 rounded bg-black/60 border border-emerald-500/40 backdrop-blur-sm shadow-md transition-all ${isTextsActive
                        ? (effectiveFocusedField === 'releaseDate' || effectiveFocusedField === 'date')
                          ? 'pointer-events-auto cursor-pointer ring-2 ring-emerald-400 text-emerald-300'
                          : 'pointer-events-auto cursor-pointer hover:border-emerald-400 text-emerald-400'
                        : 'pointer-events-none text-emerald-400'
                      }`}
                    style={{
                      letterSpacing: '0.28em',
                      fontSize: '1.8cqi',
                    }}
                  >
                    {minimalSlots.releaseDate || (effectiveFocusedField === 'releaseDate' ? ' ' : '')}
                  </div>
                )}
              </div>
            ) : (
              <div className="absolute inset-0 pointer-events-none select-none z-30">
                {/* 1. Haut Gauche (topTextLeft) : top: 6%, left: 8%, blanc, uppercase, tracking: 0.28em */}
                {Boolean(dualitySlots.topTextLeft?.trim() || effectiveFocusedField === 'topTextLeft') && (
                  <div
                    data-tap-edit="topTextLeft"
                    onClick={isTextsActive ? (e) => {
                      if (hasJustDraggedRef.current) return;
                      e.stopPropagation();
                      handleVisualElementClick('texts', 'topTextLeft');
                    } : undefined}
                    className={`absolute top-[6%] left-[8%] max-w-[42%] text-left select-none transition-all ${isTextsActive
                        ? (effectiveFocusedField === 'topTextLeft' || effectiveFocusedField === 'topDualLeft' || effectiveFocusedField === 'headerTagline')
                          ? 'pointer-events-auto cursor-pointer ring-2 ring-emerald-400 rounded px-1.5 py-0.5 bg-emerald-400/20 text-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.8)]'
                          : 'pointer-events-auto cursor-pointer hover:ring-1 hover:ring-emerald-400/50 rounded'
                        : 'pointer-events-none'
                      }`}
                    style={{
                      fontFamily: "'Syne', 'Inter', 'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif",
                      textTransform: 'uppercase',
                      letterSpacing: '0.28em',
                      fontWeight: 700,
                      fontSize: '2.2cqi',
                      lineHeight: 1.25,
                      color: (effectiveFocusedField === 'topTextLeft' || effectiveFocusedField === 'topDualLeft' || effectiveFocusedField === 'headerTagline') ? undefined : '#FFFFFF',
                      WebkitTextFillColor: (effectiveFocusedField === 'topTextLeft' || effectiveFocusedField === 'topDualLeft' || effectiveFocusedField === 'headerTagline') ? undefined : '#FFFFFF',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      textShadow: '0 2px 4px rgba(0,0,0,0.85), 0 1px 2px rgba(0,0,0,0.95)',
                    }}
                  >
                    {dualitySlots.topTextLeft || (effectiveFocusedField === 'topTextLeft' ? ' ' : '')}
                  </div>
                )}

                {/* 2. Haut Droite (topTextRight) : top: 6%, right: 8%, noir contrasté, uppercase, tracking: 0.28em */}
                {Boolean(dualitySlots.topTextRight?.trim() || effectiveFocusedField === 'topTextRight') && (
                  <div
                    data-tap-edit="topTextRight"
                    onClick={isTextsActive ? (e) => {
                      if (hasJustDraggedRef.current) return;
                      e.stopPropagation();
                      handleVisualElementClick('texts', 'topTextRight');
                    } : undefined}
                    className={`absolute top-[6%] right-[8%] max-w-[42%] text-right select-none transition-all ${isTextsActive
                        ? (effectiveFocusedField === 'topTextRight' || effectiveFocusedField === 'topDualRight' || effectiveFocusedField === 'headlineBadgeText')
                          ? 'pointer-events-auto cursor-pointer ring-2 ring-emerald-400 rounded px-1.5 py-0.5 bg-emerald-400/20 text-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.8)]'
                          : 'pointer-events-auto cursor-pointer hover:ring-1 hover:ring-emerald-400/50 rounded'
                        : 'pointer-events-none'
                      }`}
                    style={{
                      fontFamily: "'Syne', 'Inter', 'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif",
                      textTransform: 'uppercase',
                      letterSpacing: '0.28em',
                      fontWeight: 700,
                      fontSize: '2.2cqi',
                      lineHeight: 1.25,
                      color: (effectiveFocusedField === 'topTextRight' || effectiveFocusedField === 'topDualRight' || effectiveFocusedField === 'headlineBadgeText') ? undefined : '#0A0A0A',
                      WebkitTextFillColor: (effectiveFocusedField === 'topTextRight' || effectiveFocusedField === 'topDualRight' || effectiveFocusedField === 'headlineBadgeText') ? undefined : '#0A0A0A',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      filter: 'drop-shadow(0px 1px 2px rgba(255, 255, 255, 0.45)) drop-shadow(0px 0px 1px rgba(255, 255, 255, 0.35))',
                      WebkitTextStroke: '0.4px rgba(255, 255, 255, 0.35)',
                    }}
                  >
                    {dualitySlots.topTextRight || (effectiveFocusedField === 'topTextRight' ? ' ' : '')}
                  </div>
                )}

                {/* 3. Bas Centré (bottomTitle + bottomAccent avec Brush SVG) : bottom: 9% */}
                <div
                  className="absolute bottom-[9%] left-1/2 -translate-x-1/2 w-[92%] max-w-[92%] flex flex-col items-center justify-center text-center select-none"
                  style={{ zIndex: isTitleBehindSubject ? 10 : 30 }}
                >
                  {/* Titre Principal : blanc extra-bold clamp(26px, 5cqi, 48px) */}
                  {Boolean(dualitySlots.bottomTitle?.trim() || effectiveFocusedField === 'bottomTitle') && (
                    <div
                      data-tap-edit="bottomTitle"
                      onClick={isTextsActive ? (e) => {
                        if (hasJustDraggedRef.current) return;
                        e.stopPropagation();
                        handleVisualElementClick('texts', 'bottomTitle');
                      } : undefined}
                      className={`w-full uppercase transition-all select-none leading-[0.95] ${isTextsActive
                          ? (effectiveFocusedField === 'bottomTitle' || effectiveFocusedField === 'mainTitle' || effectiveFocusedField === 'eventName')
                            ? 'pointer-events-auto cursor-pointer ring-2 ring-emerald-400 rounded-lg p-1 bg-emerald-400/20 text-emerald-300 shadow-[0_0_15px_rgba(52,211,153,0.85)] scale-[1.01]'
                            : 'pointer-events-auto cursor-pointer hover:ring-1 hover:ring-emerald-400/50 rounded-lg'
                          : 'pointer-events-none'
                        }`}
                      style={{
                        fontFamily: "'Impact', 'Inter Tight', 'Arial Black', -apple-system, sans-serif",
                        fontWeight: 900,
                        color: (effectiveFocusedField === 'bottomTitle' || effectiveFocusedField === 'mainTitle' || effectiveFocusedField === 'eventName') ? undefined : COLOR_PURE_WHITE,
                        WebkitTextFillColor: (effectiveFocusedField === 'bottomTitle' || effectiveFocusedField === 'mainTitle' || effectiveFocusedField === 'eventName') ? undefined : COLOR_PURE_WHITE,
                        letterSpacing: '0.03em',
                        fontSize: 'clamp(26px, 5cqi, 48px)',
                        textShadow: '0 2px 6px rgba(0,0,0,0.95), 0 1px 3px rgba(0,0,0,0.95)',
                      }}
                    >
                      {dualitySlots.bottomTitle || (effectiveFocusedField === 'bottomTitle' ? ' ' : '')}
                    </div>
                  )}

                  {/* Mot d'Accent : immédiatement sous le titre, #F97316, italique/expressif + brush vectoriel SVG */}
                  {Boolean(dualitySlots.bottomAccent?.trim() || effectiveFocusedField === 'bottomAccent') && (
                    <div className="flex flex-col items-center justify-center w-full mt-1">
                      <div
                        data-tap-edit="bottomAccent"
                        onClick={isTextsActive ? (e) => {
                          if (hasJustDraggedRef.current) return;
                          e.stopPropagation();
                          handleVisualElementClick('texts', 'bottomAccent');
                        } : undefined}
                        className={`w-full uppercase transition-all select-none leading-[1.05] italic ${isTextsActive
                            ? (effectiveFocusedField === 'bottomAccent' || effectiveFocusedField === 'accentWord' || effectiveFocusedField === 'punchline')
                              ? 'pointer-events-auto cursor-pointer ring-2 ring-emerald-400 rounded-lg p-1 bg-emerald-400/20 text-emerald-300 shadow-[0_0_15px_rgba(52,211,153,0.85)] scale-[1.01]'
                              : 'pointer-events-auto cursor-pointer hover:ring-1 hover:ring-emerald-400/50 rounded-lg'
                            : 'pointer-events-none'
                          }`}
                        style={{
                          fontFamily: "'Permanent Marker', 'Syne', cursive, -apple-system, sans-serif",
                          fontWeight: 700,
                          fontStyle: 'italic',
                          color: (effectiveFocusedField === 'bottomAccent' || effectiveFocusedField === 'accentWord' || effectiveFocusedField === 'punchline') ? undefined : ACCENT_COLOR_ORANGE,
                          WebkitTextFillColor: (effectiveFocusedField === 'bottomAccent' || effectiveFocusedField === 'accentWord' || effectiveFocusedField === 'punchline') ? undefined : ACCENT_COLOR_ORANGE,
                          letterSpacing: '0.04em',
                          fontSize: 'clamp(28px, 5.8cqi, 54px)',
                          textShadow: '0 2px 6px rgba(0,0,0,0.9), 0 0 25px rgba(249, 115, 22, 0.45)',
                        }}
                      >
                        {dualitySlots.bottomAccent || (effectiveFocusedField === 'bottomAccent' ? ' ' : '')}
                      </div>
                      <svg
                        viewBox="0 0 260 16"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-[65%] max-w-[280px] h-auto mt-0.5 mx-auto overflow-visible select-none pointer-events-none drop-shadow-[0_2px_6px_rgba(249,115,22,0.6)]"
                      >
                        <path
                          d="M3 10C35 4 80 12 118 6C155 1 195 11 235 5C246 3 255 7 257 9C248 11 225 12 198 11C152 10 108 14 62 12C38 11 16 13 3 11Z"
                          fill="#F97316"
                        />
                      </svg>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Cartouche d'indication (Lieu, Date, Heure) - Uniquement pour Campagne Duale */}
            {(activeLayoutTemplate !== 'headliner_event' && activeLayoutTemplate !== 'minimal_brand' && (input.date?.trim() || input.venue?.trim() || (input.time || input.timeSlot)?.trim() || ['date', 'timeSlot', 'venue'].includes(focusedTextField || ''))) && (
              <div
                className={`w-full flex pointer-events-none select-none relative z-[40] ${resolvedAlignments.infoBadge === 'left'
                  ? 'justify-start'
                  : resolvedAlignments.infoBadge === 'right'
                    ? 'justify-end'
                    : 'justify-center'
                  }`}
                style={{
                  transform: `translateX(${resolvedOffsetsX.infoBadge ?? 0}%) translateY(${resolvedOffsetsY.infoBadge ?? 0}cqi)`,
                  touchAction: 'none',
                }}
              >
                <div
                  onPointerDown={isTextsActive ? (e) => handleTextDragStart(e, 'infoBadge', 'date') : undefined}
                  onPointerMove={isTextsActive ? handleTextDragMove : undefined}
                  onPointerUp={isTextsActive ? handleTextDragEnd : undefined}
                  onPointerCancel={isTextsActive ? handleTextDragEnd : undefined}
                  className={`inline-flex items-center justify-center font-mono border max-w-full transition-all select-none ${isTextsActive
                      ? isDraggingField === 'infoBadge'
                        ? 'cursor-grabbing ring-2 ring-lime-400 shadow-[0_0_15px_rgba(163,230,53,0.85)] pointer-events-auto'
                        : ['date', 'timeSlot', 'venue', 'infoBadge'].includes(effectiveFocusedField || '')
                          ? 'border-lime-400 bg-zinc-950/95 text-lime-300 shadow-[0_0_12px_rgba(163,230,53,0.85)] ring-2 ring-lime-400 pointer-events-auto'
                          : 'cursor-grab hover:ring-1 hover:ring-lime-400/80 pointer-events-auto'
                      : 'pointer-events-none select-none'
                    } ${['date', 'timeSlot', 'venue', 'infoBadge'].includes(effectiveFocusedField || '')
                      ? 'border-lime-400 bg-zinc-950/95 text-lime-300'
                      : (resolvedColors.infoBadge === '#000000' || isLightCanvas)
                        ? 'bg-white/90 text-black border-zinc-300'
                        : 'bg-zinc-950/90 text-zinc-200 border-zinc-700'
                    }`}
                  style={{
                    color: resolvedColors.infoBadge,
                    fontSize: `${2.4 * (input.cartoucheScale ?? resolvedTextScales.infoBadge ?? 1.0)}cqi`,
                    padding: `${0.9 * (input.cartouchePadding ?? 1.0)}cqi ${2.0 * (input.cartouchePadding ?? 1.0)}cqi`,
                    borderRadius: `${Math.max(0.375, 0.5 * (input.cartoucheScale ?? 1.0))}rem`,
                    pointerEvents: isTextsActive ? 'auto' : 'none',
                  }}
                  title={isTextsActive ? "Glisser verticalement pour déplacer ou cliquer pour modifier" : undefined}
                >
                  <span className="font-bold uppercase whitespace-pre overflow-visible flex items-center justify-center gap-1.5">
                    {Boolean(input.date?.trim() || focusedTextField === 'date') && (
                      <span
                        data-tap-edit="date"
                        onClick={isTextsActive ? (e) => {
                          if (hasJustDraggedRef.current) return;
                          e.stopPropagation();
                          handleVisualElementClick('texts', 'date');
                        } : undefined}
                        className={`truncate transition-all ${isTextsActive ? 'cursor-pointer hover:underline' : 'pointer-events-none select-none'
                          } ${focusedTextField === 'date' ? 'text-lime-300 underline font-black drop-shadow-[0_0_6px_rgba(163,230,53,0.9)]' : ''}`}
                      >
                        {Boolean(input.calendarUrl) && <span className="mr-0.5 text-lime-400 opacity-90">📅 </span>}
                        {input.date || (focusedTextField === 'date' ? ' ' : '')}
                      </span>
                    )}
                    {Boolean((input.date?.trim() || focusedTextField === 'date') && (((input.time || input.timeSlot)?.trim() || focusedTextField === 'timeSlot') || (input.venue?.trim() || focusedTextField === 'venue'))) && (
                      <span className="opacity-40 select-none shrink-0">•</span>
                    )}
                    {Boolean((input.time || input.timeSlot)?.trim() || focusedTextField === 'timeSlot') && (
                      <span
                        data-tap-edit="timeSlot"
                        onClick={isTextsActive ? (e) => {
                          if (hasJustDraggedRef.current) return;
                          e.stopPropagation();
                          handleVisualElementClick('texts', 'timeSlot');
                        } : undefined}
                        className={`truncate transition-all ${isTextsActive ? 'cursor-pointer hover:underline' : 'pointer-events-none select-none'
                          } ${focusedTextField === 'timeSlot' ? 'text-lime-300 underline font-black drop-shadow-[0_0_6px_rgba(163,230,53,0.9)]' : ''}`}
                      >
                        {(input.time || input.timeSlot) || (focusedTextField === 'timeSlot' ? ' ' : '')}
                      </span>
                    )}
                    {Boolean(((input.time || input.timeSlot)?.trim() || focusedTextField === 'timeSlot') && (input.venue?.trim() || focusedTextField === 'venue')) && (
                      <span className="opacity-40 select-none shrink-0">•</span>
                    )}
                    {Boolean(input.venue?.trim() || focusedTextField === 'venue') && (
                      <span
                        data-tap-edit="venue"
                        onClick={isTextsActive ? (e) => {
                          if (hasJustDraggedRef.current) return;
                          e.stopPropagation();
                          handleVisualElementClick('texts', 'venue');
                        } : undefined}
                        className={`truncate transition-all ${isTextsActive ? 'cursor-pointer hover:underline' : 'pointer-events-none select-none'
                          } ${focusedTextField === 'venue' ? 'text-lime-300 underline font-black drop-shadow-[0_0_6px_rgba(163,230,53,0.9)]' : ''}`}
                      >
                        {Boolean(input.venueMapsUrl) && <span className="mr-0.5 text-lime-400 opacity-90">📍 </span>}
                        {input.venue || (focusedTextField === 'venue' ? ' ' : '')}
                      </span>
                    )}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Logo superposé déplaçable librement avec liaison dynamique décor et ancrage relatif */}
        <OverlayLogo
          input={input}
          setInput={setInput}
          isBanner={activeIsBanner}
          previewFormat={activeFormat}
          disabled={!isLogoActive}
          isActive={isLogoActive}
          isExporting={isExporting}
          subjectTransform={input.djPhoto ? {
            scale: activeTransforms.scale,
            offsetY: activeTransforms.offsetY,
            offsetX: activeTransforms.offsetX,
            alignX: activeTransforms.alignX,
          } : null}
          getLogoFilter={() => resolveDynamicLogoFilter(input)}
          onLogoClick={isLogoActive ? () => handleVisualElementClick('logo') : undefined}
        />
      </>
    );
  };

  const renderFlyerPreview = (format?: string) => renderFlyerMiniatureContent(format);

  const renderInlinePreviewThumbnail = (sectionKey: ActiveSection) => {
    // Conditionnement du rendu de la miniature selon hasPreview
    const stepConfig = MOBILE_STEPS.find((s) => s.key === sectionKey);
    if (stepConfig && !stepConfig.hasPreview) return null;

    // L'aperçu s'affiche dès que cette section est la section active sur mobile (< 920px)
    const isSectionActive = activeSection === sectionKey || (sectionKey === 'textSizes' && activeSection === 'texts');
    if (!isSectionActive) return null;

    return (
      <div key={`preview-thumb-${sectionKey}`} data-testid="inline-preview-thumbnail" aria-label="Aperçu interactif mobile" role="region" className={`my-3 ${mobileStepTransitionClass} min-[920px]:hidden`}>
        {/* Navigation épurée par flèches discrètes au-dessus de la miniature */}
        <div className="flex items-center justify-center gap-2 mb-2 select-none">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handlePrevFormat();
            }}
            className="p-1 text-zinc-400 hover:text-white transition opacity-50 hover:opacity-100 active:scale-90 font-mono text-base leading-none cursor-pointer"
            aria-label="Format précédent"
          >
            ‹
          </button>
          <span className="text-[11px] font-mono tracking-wider text-zinc-300 uppercase font-semibold">
            {previewFormat === 'banner' ? 'BANNIÈRE' : (FORMAT_LABELS[previewFormat] || previewFormat.toUpperCase())}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleNextFormat();
            }}
            className="p-1 text-zinc-400 hover:text-white transition opacity-50 hover:opacity-100 active:scale-90 font-mono text-base leading-none cursor-pointer"
            aria-label="Format suivant"
          >
            ›
          </button>
        </div>

        <div
          onClick={handleThumbnailClick}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchCancel}
          onContextMenu={(e) => e.preventDefault()}
          className="relative mx-auto flex items-center justify-center p-1 select-none -webkit-touch-callout-none cursor-pointer group active:scale-[0.98] transition-transform duration-150 touch-pan-y"
          style={{
            WebkitTouchCallout: 'none',
            WebkitUserSelect: 'none',
            userSelect: 'none',
            maxHeight: '42vh',
            maxWidth: '85vw',
            width: '100%',
            transform: pinchScale !== 1 ? `scale(${pinchScale})` : undefined,
          }}
          title="Toucher ou pincer pour agrandir en plein écran"
        >
          {/* Badge discret indiquant le mode plein écran au clic ou pincement */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsMobilePreviewOpen(true);
              onOpenFullPreview?.();
            }}
            className="absolute top-2.5 right-2.5 z-40 flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/85 hover:bg-black backdrop-blur-md border border-white/20 hover:border-lime-400 text-[10px] font-mono font-bold text-zinc-200 pointer-events-auto cursor-pointer shadow-lg active:scale-95 transition-all"
            aria-label="Plein écran"
          >
            <Maximize2 className="w-2.5 h-2.5 text-lime-400" />
            <span>Plein écran</span>
          </button>

          {/* Boîte d'aspect-ratio stricte non coupée */}
          <div
            onContextMenu={(e) => e.preventDefault()}
            className={`relative rounded-2xl overflow-hidden border-2 border-lime-400 shadow-2xl transition-all select-none -webkit-touch-callout-none ${getFormatAspectClass(previewFormat)}`}
            style={{
              WebkitTouchCallout: 'none',
              WebkitUserSelect: 'none',
              userSelect: 'none',
              aspectRatio: formatStyle.aspectRatio,
              maxHeight: '40vh',
              maxWidth: '100%',
              width: `min(100%, calc(40vh * (${formatStyle.aspectRatio})))`,
              backgroundColor: canvasBgColor,
            }}
          >
            <div
              id="mobile-flyer-preview-container"
              data-poster-container="true"
              onContextMenu={(e) => e.preventDefault()}
              className="@container w-full h-full relative overflow-hidden select-none -webkit-touch-callout-none"
              style={{
                containerType: isBanner ? 'size' : 'inline-size',
                WebkitTouchCallout: 'none',
                WebkitUserSelect: 'none',
                userSelect: 'none',
              }}
            >
              {renderFlyerPreview(previewFormat)}
            </div>
          </div>
        </div>

        {/* Indication visuelle discrète pour le geste mobile */}
        <div className="flex items-center justify-center gap-1.5 mt-1.5 text-[10px] font-mono text-zinc-400 select-none">
          <span className="text-lime-400 text-xs">👉</span>
          <span>Balayez pour changer d'étape • Pincez pour plein écran</span>
        </div>

        {/* Bloc d'état dynamique SmartLink & Liens Actifs en Temps Réel pour l'Étape 5 */}
        {sectionKey === 'textSizes' && (() => {
          const eventSlug = resolveUnifiedEventSlug(input);
          const publicHubUrl = `https://signaid.eu/hub/${eventSlug}`;
          const activeLinksCount = [
            input.venueMapsUrl,
            input.calendarUrl,
            input.organizationUrl || input.textUrls?.eventName,
            input.artistSocialUrl || input.artistUrl || input.textUrls?.djName,
            input.textUrls?.headerTagline,
            input.textUrls?.punchline,
            input.textUrls?.headlineBadgeText,
          ].filter(Boolean).length;

          return (
            <div className={`mt-2.5 mx-auto max-w-[85vw] p-2.5 rounded-xl border ${isDayMode ? 'bg-white border-zinc-200 text-zinc-800' : 'bg-zinc-950/90 border-zinc-800/80 text-zinc-200'} text-[11px] font-mono shadow-md flex items-center justify-between gap-2 transition-all`}>
              <div className="min-w-0 flex-1 truncate">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-lime-400 animate-pulse shrink-0" />
                  <span className="text-[9px] uppercase font-bold text-zinc-400 truncate">
                    SmartLink Public synchronisé :
                  </span>
                </div>
                <span className="text-lime-400 font-bold truncate block text-xs mt-0.5">
                  {publicHubUrl}
                </span>
              </div>
              {activeLinksCount > 0 && (
                <span className="shrink-0 px-2 py-0.5 rounded-full bg-lime-400/10 border border-lime-400/30 text-lime-400 font-mono text-[9px] font-bold">
                  {activeLinksCount} lien{activeLinksCount > 1 ? 's' : ''} actif{activeLinksCount > 1 ? 's' : ''}
                </span>
              )}
            </div>
          );
        })()}
      </div>
    );
  };

  const MobilePreviewThumbnail: React.FC<{ sectionKey: ActiveSection }> = ({ sectionKey }) => {
    return renderInlinePreviewThumbnail(sectionKey);
  };

  return (
    <div
      ref={composerContainerRef}
      className="w-full space-y-4 pb-[calc(env(safe-area-inset-bottom,0px)+120px)] min-[920px]:pb-4 touch-pan-y"
      onTouchStart={handleCarouselTouchStart}
      onTouchMove={handleCarouselTouchMove}
      onTouchEnd={handleCarouselTouchEnd}
      onTouchCancel={handleCarouselTouchCancel}
      onClickCapture={(e) => {
        if (carouselSwipedRef.current) {
          e.stopPropagation();
        }
      }}
      onFocusCapture={(e) => {
        if (heroRef.current && heroRef.current.contains(e.target as Node)) {
          return;
        }
        setIsHeroDismissed(true);
      }}
    >
      {/* BARRE D'EN-TÊTE DU STUDIO (DESKTOP) & BADGE D'AUTO-SAVE */}
      <div className="hidden min-[920px]:flex items-center justify-between px-1.5 py-1 -mb-1 select-none">
        <span className={`text-[11px] font-mono font-bold uppercase tracking-wider ${isDayMode ? 'text-zinc-600' : 'text-zinc-400'}`}>
          Studio Composer
        </span>
        <div className="flex items-center gap-1.5 text-[10px] font-mono select-none transition-opacity duration-200">
          {saveStatus === 'saving' && (
            <span className={`flex items-center gap-1 ${isDayMode ? 'text-zinc-600' : 'text-zinc-400'}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
              <span>Enregistrement...</span>
            </span>
          )}
          {saveStatus === 'saved' && (
            <span className={`flex items-center gap-1 font-bold ${isDayMode ? 'text-emerald-700' : 'text-lime-400'}`}>
              <span>✓</span>
              <span>Enregistré</span>
            </span>
          )}
        </div>
      </div>

      {/* --- EN-TÊTE FIXE COMPACT MOBILE (< 920px) : SÉLECTEURS D'ÉTAPES ERGONOMIQUES ÉLARGIS --- */}
      <div
        data-step-header="true"
        className={`min-[920px]:hidden sticky top-0 z-20 ${isDayMode ? 'bg-white/95 border-zinc-200 text-zinc-900 shadow-sm' : 'bg-zinc-950/95 border-zinc-800 text-zinc-100 shadow-lg'
          } backdrop-blur-md border rounded-2xl p-2.5 sm:p-3 select-none`}
      >
        {/* Stepper compact : flèches ‹ › + pastilles numérotées */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => goToMobileStep(effectiveStepIndex - 1)}
            disabled={effectiveStepIndex === 0}
            className={`w-9 h-11 shrink-0 flex items-center justify-center rounded-xl transition cursor-pointer font-bold text-sm disabled:opacity-20 disabled:pointer-events-none active:scale-95 ${
              isDayMode
                ? 'text-zinc-700 hover:text-zinc-950 hover:bg-zinc-100'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
            aria-label="Étape précédente"
            title="Étape précédente"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Barre de progression et sélecteurs d'étapes à zone tactile élargie */}
          <div
            role="tablist"
            aria-label="Navigation des étapes du studio"
            className="flex-1 flex items-center gap-1.5 sm:gap-2"
          >
            {MOBILE_STEPS.map((step, idx) => {
              const isActive = effectiveStepIndex === idx;
              const isCompleted = idx < effectiveStepIndex;
              return (
                <button
                  key={step.key}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-current={isActive ? 'step' : undefined}
                  aria-label={`Aller à ${step.label}`}
                  data-testid={`mobile-step-${idx}`}
                  onClick={() => goToMobileStep(idx)}
                  className={`group relative flex-1 flex flex-col items-center justify-center py-2 px-1 min-h-[44px] rounded-xl transition-all duration-200 cursor-pointer touch-manipulation active:scale-95 focus-visible:outline-none ${isActive
                    ? isDayMode
                      ? 'bg-zinc-900 text-white shadow-sm border border-zinc-900'
                      : 'bg-lime-400/15 border border-lime-400/30 shadow-sm shadow-lime-400/10'
                    : isDayMode
                      ? 'hover:bg-zinc-100 border border-transparent'
                      : 'hover:bg-zinc-900 border border-transparent'
                    }`}
                  title={step.label}
                >
                  {/* Numéro de l'étape agrandi avec retour d'état clair */}
                  <div className="flex items-center justify-center gap-0.5 mb-1">
                    <span
                      className={`text-[11px] font-mono transition-all leading-none ${isActive
                        ? isDayMode
                          ? 'font-black text-white scale-110'
                          : 'font-black text-lime-400 scale-110 drop-shadow-[0_0_8px_rgba(163,230,53,0.5)]'
                        : isCompleted
                          ? isDayMode
                            ? 'font-bold text-zinc-700'
                            : 'font-bold text-lime-400/75'
                          : isDayMode
                            ? 'font-semibold text-zinc-400'
                            : 'font-semibold text-zinc-500'
                        }`}
                    >
                      {idx + 1}
                    </span>
                    {isCompleted && (
                      <span className={`text-[8px] leading-none ${isDayMode ? 'text-zinc-600' : 'text-lime-400/80'}`}>✓</span>
                    )}
                  </div>

                  {/* Barre de progression */}
                  <div
                    className={`w-full h-2 rounded-full transition-all duration-300 ${isActive
                      ? isDayMode
                        ? 'bg-white'
                        : 'bg-lime-400 shadow-md shadow-lime-400/60 ring-1 ring-lime-400/40'
                      : isCompleted
                        ? isDayMode
                          ? 'bg-zinc-300'
                          : 'bg-lime-400/40 group-hover:bg-lime-400/60'
                        : isDayMode
                          ? 'bg-zinc-200 group-hover:bg-zinc-300'
                          : 'bg-zinc-800 group-hover:bg-zinc-700'
                      }`}
                  />
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => goToMobileStep(effectiveStepIndex + 1)}
            disabled={effectiveStepIndex === MOBILE_STEPS.length - 1}
            className={`w-9 h-11 shrink-0 flex items-center justify-center rounded-xl transition cursor-pointer font-bold text-sm disabled:opacity-20 disabled:pointer-events-none active:scale-95 ${
              isDayMode
                ? 'text-zinc-700 hover:text-zinc-950 hover:bg-zinc-100'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
            aria-label="Étape suivante"
            title="Étape suivante"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {saveStatus === 'saving' && (
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping shrink-0" aria-label="Enregistrement..." />
          )}
          {saveStatus === 'saved' && (
            <span className={`text-[10px] font-mono shrink-0 font-bold ${isDayMode ? 'text-emerald-700' : 'text-lime-400'}`} aria-label="Enregistré">✓</span>
          )}
        </div>
      </div>

      {/* HERO ONBOARDING MOBILE (AU-DESSUS DE LA SECTION 1) */}
      {!isHeroDismissed && (
        <div
          ref={heroRef}
          className={`min-[920px]:hidden ${cardBg} rounded-2xl p-4 space-y-3 relative border overflow-hidden shadow-sm animate-fadeIn`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border ${
              isDayMode
                ? 'bg-zinc-100 text-zinc-800 border-zinc-200'
                : 'bg-lime-400/10 text-lime-400 border-lime-400/20'
            }`}>
              <Sparkles className={`w-3 h-3 shrink-0 ${isDayMode ? 'text-zinc-700' : 'text-lime-400'}`} />
              <span>AUTOMATISATION BRANDING &amp; MERCH</span>
            </div>
            <button
              type="button"
              onClick={() => setIsHeroDismissed(true)}
              className={`p-1 rounded-lg transition cursor-pointer shrink-0 ${
                isDayMode
                  ? 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
              aria-label="Fermer l'accueil"
              title="Fermer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-1">
            <h2 className={`text-base sm:text-lg font-bold tracking-tight ${isDayMode ? 'text-zinc-900' : 'text-white'}`}>
              Créez vos Visuels &amp; Merch Officiel en 1 Clic
            </h2>
            <p className={`text-xs ${isDayMode ? 'text-zinc-600' : 'text-zinc-400'}`}>
              Générez un visuel pro multi-formats, vos t-shirts DTF et votre Hub interactif sans compétence graphique.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={handleLoadDemoExample}
              className="w-full py-2.5 px-3 rounded-xl bg-lime-400 hover:bg-lime-300 text-zinc-950 font-bold font-mono text-xs flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] transition cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 fill-zinc-950 text-zinc-950" />
              <span>Démarrer avec un exemple</span>
            </button>
            <button
              type="button"
              onClick={handleStartFromScratch}
              className={`w-full py-2.5 px-3 rounded-xl font-bold font-mono text-xs flex items-center justify-center gap-2 border transition cursor-pointer active:scale-[0.98] ${isDayMode
                ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border-zinc-300'
                : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border-zinc-800 hover:border-zinc-700'
                }`}
            >
              <PenTool className="w-3.5 h-3.5 text-zinc-400" />
              <span>Partir de zéro</span>
            </button>
          </div>
        </div>
      )}

      {/* 1. DÉCOR 3D & AMBIANCE IA (EN PREMIÈRE POSITION) */}
      <div ref={section1Ref} className={`${cardBg} rounded-2xl p-4 space-y-3 ${effectiveStepIndex === 0 ? `block ${mobileStepTransitionClass} min-[920px]:animate-none` : 'hidden min-[920px]:block'}`}>
        <div
          onClick={() => toggleSection('decor')}
          className="flex items-center justify-between cursor-pointer select-none"
        >
          <div className="flex items-center gap-2 text-left">
            <div className={`p-1.5 rounded-lg border ${isDayMode ? 'bg-zinc-100 text-zinc-800 border-zinc-200' : 'bg-lime-400/10 text-lime-400 border-lime-400/20'}`}><Layers className="w-4 h-4" /></div>
            <div>
              <h3 className={`text-xs font-bold font-mono uppercase tracking-wider ${isDayMode ? 'text-zinc-900' : 'text-white'}`}>
                <span>1. DÉCOR &amp; FOND</span>
                {activeSection === 'decor' ? <ChevronUp className={`w-3.5 h-3.5 ml-1 inline ${isDayMode ? 'text-zinc-600' : 'text-zinc-400'}`} /> : <ChevronDown className={`w-3.5 h-3.5 ml-1 inline ${isDayMode ? 'text-zinc-600' : 'text-zinc-400'}`} />}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); bgInputRefDesktop.current?.click(); }}
            className={`text-[10px] font-mono font-bold px-2.5 py-1.5 rounded-xl transition cursor-pointer border ${
              isDayMode
                ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border-zinc-300'
                : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-lime-400/40'
            }`}
          >
            Importer Fond
          </button>
          <input
            ref={bgInputRefDesktop}
            type="file"
            accept="image/*"
            className="hidden"
            onClick={(e) => { (e.target as HTMLInputElement).value = ''; }}
            onChange={(e) => handleFileUpload(e, 'backgroundImage')}
          />
        </div>

        {activeSection === 'decor' && (
          <div className={`space-y-3 pt-2 border-t ${borderColor} animate-fadeIn`} onClick={(e) => e.stopPropagation()}>
            {hasCustomBackground && (
              <div
                onClick={() => bgInputRefDesktop.current?.click()}
                className="relative h-24 rounded-xl overflow-hidden border border-zinc-800 hover:border-lime-400/50 flex items-center justify-center group animate-fadeIn cursor-pointer transition"
                style={{ backgroundColor: canvasBgColor }}
                title="Cliquer pour remplacer le fond en 1 clic"
              >
                <img
                  src={customBackgroundSrc}
                  crossOrigin="anonymous"
                  alt="Décor"
                  draggable={false}
                  width={768}
                  height={1376}
                  loading="lazy"
                  onContextMenu={(e) => e.preventDefault()}
                  className="w-full h-full object-cover select-none pointer-events-none -webkit-touch-callout-none group-hover:scale-105 transition-transform"
                  style={{
                    opacity: (isToneCenter || Math.abs(currentTone - 0.5) < 0.03) ? 1 : (input.backgroundOpacity ?? 1),
                    filter: (isToneCenter || Math.abs(currentTone - 0.5) < 0.03) ? 'none' : toneOverlay.filterCss,
                    WebkitTouchCallout: 'none',
                    WebkitUserSelect: 'none',
                    userSelect: 'none',
                    touchAction: 'none',
                  }}
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                  <span className="text-[10px] font-mono font-bold text-lime-400 bg-black/80 px-2 py-1 rounded-md border border-lime-400/40 flex items-center gap-1">
                    <Upload className="w-3 h-3" />
                    Remplacer (1 clic)
                  </span>
                </div>
                {/* Calque d'overlay de tonalité Blanc ↔ Noir : strictement aucun overlay si neutre */}
                {isToneActive && !isToneCenter && Math.abs(currentTone - 0.5) >= 0.03 && (
                  <div
                    className="absolute inset-0 pointer-events-none transition-all duration-300 z-0"
                    style={{
                      backgroundColor: toneOverlay.color,
                      opacity: toneOverlay.opacity,
                      display: toneOverlay.display,
                    }}
                  />
                )}
                <div className="absolute top-2 right-2 flex items-center gap-1.5 z-10">
                  {isCurrentPreviewBgOffset && (
                    <button
                      type="button"
                      onClick={handleResetBackgroundPosition}
                      className="py-1 px-2 rounded-lg bg-black/80 hover:bg-black text-lime-400 border border-lime-400/40 text-[9px] font-mono font-bold flex items-center gap-1 transition shadow-md cursor-pointer"
                      title={`Recentrer le décor pour le format ${previewFormat.toUpperCase()}`}
                    >
                      <RotateCcw className="w-2.5 h-2.5" />
                      <span>Recentrer</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      bgInputRefDesktop.current?.click();
                    }}
                    className="py-1 px-2 rounded-lg bg-black/80 hover:bg-black text-lime-400 border border-lime-400/40 text-[9px] font-mono font-bold flex items-center gap-1 transition shadow-md cursor-pointer"
                    title="Remplacer le fond"
                  >
                    <Upload className="w-2.5 h-2.5" />
                    <span>Remplacer</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setInput((p) => {
                        const nextFmts = { ...(p.formatTransforms || {}) };
                        (['post', 'story', 'banner', 'a3'] as const).forEach((fmt) => {
                          if (nextFmts[fmt]?.background) {
                            nextFmts[fmt] = {
                              ...nextFmts[fmt],
                              background: { offsetX: 0, offsetY: 0, scale: 1.0 },
                            };
                          }
                        });
                        return {
                          ...p,
                          backgroundImage: '',
                          bgImage: '',
                          customBackground: '',
                          backgroundOffsetX: 0,
                          backgroundOffsetY: 0,
                          formatTransforms: nextFmts,
                        };
                      });
                      if (bgInputRefDesktop.current) {
                        bgInputRefDesktop.current.value = '';
                      }
                    }}
                    className="p-1.5 rounded-lg bg-black/70 hover:bg-rose-600 text-white cursor-pointer transition shadow-md"
                    title="Supprimer le fond"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}

            {/* CONTRÔLE DE DÉPLACEMENT DU DÉCOR */}
            {hasCustomBackground && (
              <div className={`flex items-center justify-between p-2 rounded-xl border ${isDayMode ? 'border-zinc-200 bg-zinc-50' : 'border-zinc-800 bg-zinc-900/60'} text-[10px] font-mono`}>
                <span className={`${isDayMode ? 'text-zinc-600' : 'text-zinc-400'} flex items-center gap-1.5`}>
                  <span>Glissez sur le fond ({previewFormat.toUpperCase()})</span>
                  {isCurrentPreviewBgOffset && (
                    <span className="text-lime-400 font-bold">
                      ({currentPreviewBg.offsetX > 0 ? `+${currentPreviewBg.offsetX}` : currentPreviewBg.offsetX}%, {currentPreviewBg.offsetY > 0 ? `+${currentPreviewBg.offsetY}` : currentPreviewBg.offsetY}%)
                    </span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={handleResetBackgroundPosition}
                  className={`px-2 py-1 rounded-lg border text-[10px] font-bold font-mono transition flex items-center gap-1.5 cursor-pointer ${
                    isCurrentPreviewBgOffset
                      ? 'border-lime-400/60 text-lime-400 bg-lime-400/10 hover:bg-lime-400/20'
                      : isDayMode ? 'border-zinc-300 text-zinc-600 hover:text-black' : 'border-zinc-700 text-zinc-400 hover:text-white'
                  }`}
                  title={`Recentrer le décor pour le format ${previewFormat.toUpperCase()}`}
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  <span>Recentrer ({previewFormat.toUpperCase()})</span>
                </button>
              </div>
            )}

            {/* GÉNÉRATEUR IA DE DÉCOR (TOUJOURS DISPONIBLE) */}
            <div className={`${innerBg} p-2.5 rounded-xl border ${isDayMode ? 'border-zinc-200' : 'border-zinc-800'} space-y-2 animate-fadeIn`}>
              <div className={`flex items-center justify-between text-[10px] font-mono font-bold ${isDayMode ? 'text-zinc-900' : 'text-zinc-300'}`}>
                <span className="flex items-center gap-1">
                  <Sparkles className={`w-3 h-3 ${isDayMode ? 'text-zinc-700' : 'text-lime-400'}`} />
                  <span>{hasCustomBackground ? "Remplacer ou régénérer le décor par l'IA" : "Générer un décor avec l'IA"}</span>
                </span>
              </div>
              <input
                type="text"
                value={input.ambiancePrompt || input.bgPrompt || ''}
                onChange={(e) => setInput((p) => ({ ...p, ambiancePrompt: e.target.value, bgPrompt: e.target.value }))}
                placeholder="Ex: Paysage urbain nocturne sous la pluie, perspective de rue métropolitaine, reflets néons..."
                className={`w-full ${inputBg} border ${isDayMode ? 'border-zinc-200' : 'border-zinc-800'} rounded-lg px-2.5 py-1.5 text-[11px] font-mono`}
              />

              <button
                type="button"
                disabled={isGeneratingBg}
                onClick={() => handleGenerateAiBackground()}
                className="w-full py-2 bg-lime-400 hover:bg-lime-300 text-zinc-950 font-bold font-mono text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {isGeneratingBg ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                <span>{hasCustomBackground ? 'Régénérer Décor avec ce Prompt' : 'Générer Décor'}</span>
              </button>
            </div>

            {/* CURSEUR DE TONALITÉ FOND (BLANC <-> NOIR) */}
            <div className={`${innerBg} p-2.5 rounded-xl border ${isDayMode ? 'border-zinc-200' : 'border-zinc-800'} space-y-2`}>
              <div className={`flex items-center justify-between text-[10px] font-mono font-bold ${isDayMode ? 'text-zinc-900' : 'text-zinc-200'}`}>
                <span>Tonalité (Blanc ↔ Noir)</span>
                <span className={isDayMode ? 'text-zinc-900 font-bold' : 'text-lime-400'}>
                  {toneOverlay.isNeutral
                    ? '50 % (Neutre)'
                    : `${Math.round((input.backgroundTone ?? 0.5) * 100)} %`}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={input.backgroundTone ?? 0.5}
                onPointerDown={(e) => handleSliderPointerDown(e, 'Tonalité Fond', `${Math.round((input.backgroundTone ?? 0.5) * 100)} %`)}
                onPointerUp={handleSliderPointerUp}
                onPointerCancel={handleSliderPointerCancel}
                onInput={(e) => {
                  const parsed = parseFloat((e.target as HTMLInputElement).value);
                  const val = Number.isNaN(parsed) ? 0.5 : parsed;
                  const isNeutral = Math.abs(val - 0.5) < 0.02 || val === 0.5;
                  const effectiveVal = isNeutral ? 0.5 : val;
                  const isLight = effectiveVal < 0.48;
                  setInput((prev) => {
                    let nextLogoColorMode = prev.logoColorMode || 'auto';
                    if (prev.logoColorMode === 'white' && isLight) {
                      nextLogoColorMode = 'black';
                    } else if (prev.logoColorMode === 'black' && !isLight) {
                      nextLogoColorMode = 'white';
                    }
                    return {
                      ...prev,
                      backgroundTone: effectiveVal,
                      isBackgroundToneEnabled: true,
                      logoColorMode: nextLogoColorMode,
                      ...(isNeutral
                        ? {
                          subjectBrightness: 1.0,
                          subjectContrast: 1.0,
                          subjectSaturation: 1.0,
                          subjectHueRotate: 0,
                        }
                        : {}),
                    };
                  });
                  if (isLiveScrubbing) {
                    setLiveScrubData((p) => p ? { ...p, value: isNeutral ? '50 % (Neutre)' : `${Math.round(val * 100)} %` } : null);
                  }
                }}
                onChange={(e) => {
                  const parsed = parseFloat(e.target.value);
                  const val = Number.isNaN(parsed) ? 0.5 : parsed;
                  const isNeutral = Math.abs(val - 0.5) < 0.02 || val === 0.5;
                  const effectiveVal = isNeutral ? 0.5 : val;
                  const isLight = effectiveVal < 0.48;
                  setInput((prev) => {
                    let nextLogoColorMode = prev.logoColorMode || 'auto';
                    if (prev.logoColorMode === 'white' && isLight) {
                      nextLogoColorMode = 'black';
                    } else if (prev.logoColorMode === 'black' && !isLight) {
                      nextLogoColorMode = 'white';
                    }
                    return {
                      ...prev,
                      backgroundTone: effectiveVal,
                      isBackgroundToneEnabled: true,
                      logoColorMode: nextLogoColorMode,
                      ...(isNeutral
                        ? {
                          subjectBrightness: 1.0,
                          subjectContrast: 1.0,
                          subjectSaturation: 1.0,
                          subjectHueRotate: 0,
                        }
                        : {}),
                    };
                  });
                  if (isLiveScrubbing) {
                    setLiveScrubData((p) => p ? { ...p, value: isNeutral ? '50 % (Neutre)' : `${Math.round(val * 100)} %` } : null);
                  }
                }}
                className={`w-full ${isDayMode ? 'accent-zinc-900 bg-zinc-200' : 'accent-lime-400 bg-zinc-800'} h-1.5 rounded-lg cursor-pointer transition-all touch-none focus-visible:ring-2 focus-visible:ring-lime-400`}
                aria-label="Tonalité du fond (Blanc à Noir)"
              />
              <div className={`flex justify-between text-[9px] font-mono ${isDayMode ? 'text-zinc-600' : 'text-zinc-400'} pt-1`}>
                <button
                  type="button"
                  onClick={() => setInput((p) => ({ ...p, backgroundTone: 0, isBackgroundToneEnabled: true, logoColorMode: 'black' }))}
                  className={`${isDayMode ? 'hover:text-zinc-950 text-zinc-700' : 'hover:text-white text-zinc-400'} transition cursor-pointer flex items-center gap-1 focus-visible:ring-1 focus-visible:ring-lime-400`}
                >
                  <span className="w-2 h-2 rounded-full bg-white border border-zinc-400 inline-block" />
                  <span>Blanc (0%)</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setInput((p) => ({
                      ...p,
                      backgroundTone: 0.5,
                      isBackgroundToneEnabled: true,
                      subjectBrightness: 1.0,
                      subjectContrast: 1.0,
                      subjectSaturation: 1.0,
                      subjectHueRotate: 0,
                    }))
                  }
                  className={`${isDayMode ? 'text-zinc-900 font-bold hover:text-black' : 'text-lime-400 hover:text-lime-300 font-bold'} transition cursor-pointer flex items-center gap-1 focus-visible:ring-1 focus-visible:ring-lime-400`}
                >
                  <span className={`w-2 h-2 rounded-full ${isDayMode ? 'bg-zinc-900' : 'bg-lime-400'} inline-block`} />
                  <span>Neutre (50%)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInput((p) => ({ ...p, backgroundTone: 1, isBackgroundToneEnabled: true, logoColorMode: 'white' }))}
                  className={`${isDayMode ? 'hover:text-zinc-950 text-zinc-700' : 'hover:text-white text-zinc-400'} transition cursor-pointer flex items-center gap-1 focus-visible:ring-1 focus-visible:ring-lime-400`}
                >
                  <span className="w-2 h-2 rounded-full bg-black border border-zinc-600 inline-block" />
                  <span>Noir (100%)</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      {renderInlinePreviewThumbnail('decor')}

      {/* 2. SUJET (DJ / ARTISTE) AVEC TOUS LES CURSEURS DE TAILLE ET POSITION Y */}
      <div ref={section2Ref} className={`${cardBg} rounded-2xl p-4 space-y-3 ${effectiveStepIndex === 1 ? `block ${mobileStepTransitionClass} min-[920px]:animate-none` : 'hidden min-[920px]:block'}`}>
        <div
          data-testid="section-header-subject"
          onClick={() => toggleSection('subject')}
          className="flex items-center justify-between cursor-pointer select-none"
        >
          <div className="flex items-center gap-2 text-left">
            <div className="p-1.5 rounded-lg bg-lime-400/10 text-lime-400 border border-lime-400/20"><User className="w-4 h-4" /></div>
            <div>
              <h3 className={`text-xs font-bold font-mono uppercase tracking-wider ${isDayMode ? 'text-zinc-900' : 'text-white'}`}>
                <span>2. SUJET (ARTISTE)</span>
                {activeSection === 'subject' || activeSection === 'subject2' ? <ChevronUp className="w-3.5 h-3.5 text-zinc-400 ml-1 inline" /> : <ChevronDown className="w-3.5 h-3.5 text-zinc-400 ml-1 inline" />}
              </h3>
            </div>
          </div>
          {previewFormat === 'post' ? (
            <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-lime-400/10 text-lime-400 border border-lime-400/30 font-bold">Format Maître (1:1) ★</span>
          ) : currentTransforms.isCustom ? (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onResetFormatToMaster(); }}
              className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-lime-400/10 text-lime-400 border border-lime-400/30 font-bold flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-2.5 h-2.5" /><span>Reset Auto</span>
            </button>
          ) : (
            <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-lime-400/10 text-lime-400 border border-lime-400/30 font-bold flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5" /><span>Auto Actif</span>
            </span>
          )}
        </div>

        {(activeSection === 'subject' || activeSection === 'subject2') && (() => {
          const isSecondary = activeSubjectTab === 'secondary';
          const activeSubjectPhoto = isSecondary ? input.secondaryDjPhoto : input.djPhoto;
          const activeRemovedColors = isSecondary ? secondaryRemovedColors : primaryRemovedColors;

          const secondaryResolved = resolveSecondarySubjectTransform(
            input,
            previewFormat,
            input.djPhoto ? {
              scale: currentTransforms.scale,
              offsetY: currentTransforms.offsetY,
              offsetX: currentTransforms.offsetX,
              alignX: currentTransforms.alignX,
            } : null
          );

          const activeBrightness = isSecondary ? (input.secondarySubjectBrightness ?? 1.0) : (input.subjectBrightness ?? 1.0);
          const activeContrast = isSecondary ? (input.secondarySubjectContrast ?? 1.0) : (input.subjectContrast ?? 1.0);
          const activeSaturation = isSecondary ? (input.secondarySubjectSaturation ?? 1.0) : (input.subjectSaturation ?? 1.0);
          const activeHueRotate = isSecondary ? (input.secondarySubjectHueRotate ?? 0) : (input.subjectHueRotate ?? 0);
          const activeShadowOffsetX = isSecondary ? (input.secondarySubjectShadowOffsetX ?? 0) : (input.subjectShadowOffsetX ?? 0);
          const activeShadowOffsetY = isSecondary ? (input.secondarySubjectShadowOffsetY ?? 20) : (input.subjectShadowOffsetY ?? 20);
          const activeShadowBlur = isSecondary ? (input.secondarySubjectShadowBlur ?? 30) : (input.subjectShadowBlur ?? 30);
          const activeFadeIntensity = isSecondary ? (input.secondarySubjectFadeIntensity ?? 35) : (input.subjectFadeIntensity ?? 35);
          const activeOpacity = isSecondary ? (input.secondaryDjPhotoOpacity ?? 1) : (input.djPhotoOpacity ?? 1);
          const activeScale = isSecondary ? secondaryResolved.scale : currentTransforms.scale;
          const activeOffsetY = isSecondary ? secondaryResolved.offsetY : currentTransforms.offsetY;
          const activeOffsetX = isSecondary ? secondaryResolved.offsetX : (currentTransforms.offsetX ?? 0);

          return (
            <div className={`space-y-3 pt-2 border-t ${borderColor} animate-fadeIn`} onClick={(e) => e.stopPropagation()}>
              {/* COMMUTATEUR SUJET 1 / SUJET 2 + BOUTON SWITCH SUPERPOSITION (Z-INDEX) */}
              <div className="flex items-center gap-1.5 p-1 bg-zinc-900/80 border border-zinc-800 rounded-xl">
                <button
                  type="button"
                  onClick={() => setActiveSubjectTab('primary')}
                  className={`flex-1 py-1.5 px-2.5 rounded-lg text-[11px] font-mono font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${activeSubjectTab === 'primary'
                    ? 'bg-lime-400 text-black shadow-sm font-black'
                    : isDayMode ? 'bg-zinc-200 text-zinc-700 hover:text-black' : 'bg-zinc-900 text-zinc-400 hover:text-white'
                    }`}
                >
                  <User className="w-3 h-3" />
                  <span>Sujet 1</span>
                  {input.djPhoto && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />}
                </button>

                {input.secondaryDjPhoto && (
                  <button
                    type="button"
                    onClick={() => {
                      setInput((prev) => {
                        const isCurrentlyS1Front =
                          prev.foregroundSubject === 'subject1' ||
                          prev.subjectLayerOrder === '1_over_2' ||
                          prev.subjectStackOrder === 'primary-front';
                        const nextFront = isCurrentlyS1Front ? 'subject2' : 'subject1';
                        return {
                          ...prev,
                          foregroundSubject: nextFront,
                          subjectStackOrder: nextFront === 'subject1' ? 'primary-front' : 'secondary-front',
                          subjectLayerOrder: nextFront === 'subject1' ? '1_over_2' : '2_over_1',
                        };
                      });
                    }}
                    title={
                      (input.foregroundSubject === 'subject1' || input.subjectStackOrder === 'primary-front' || input.subjectLayerOrder === '1_over_2')
                        ? "Sujet 1 au 1er plan (cliquer pour inverser)"
                        : "Sujet 2 au 1er plan (cliquer pour inverser)"
                    }
                    className="p-1.5 rounded-lg border border-zinc-700/80 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 hover:text-lime-400 transition cursor-pointer flex items-center gap-1.5 text-[10px] font-mono shrink-0 shadow-sm"
                  >
                    <ArrowUpDown className="w-3.5 h-3.5 text-lime-400" />
                    <span className="font-bold">
                      {(input.foregroundSubject === 'subject1' || input.subjectStackOrder === 'primary-front' || input.subjectLayerOrder === '1_over_2')
                        ? 'S1 devant'
                        : 'S2 devant'}
                    </span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setActiveSubjectTab('secondary')}
                  className={`flex-1 py-1.5 px-2.5 rounded-lg text-[11px] font-mono font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${activeSubjectTab === 'secondary'
                    ? 'bg-lime-400 text-black shadow-sm font-black'
                    : isDayMode ? 'bg-zinc-200 text-zinc-700 hover:text-black' : 'bg-zinc-900 text-zinc-400 hover:text-white'
                    }`}
                >
                  <User className="w-3 h-3" />
                  <span>Sujet 2 (B2B)</span>
                  {input.secondaryDjPhoto ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  ) : (
                    <span className="text-[9px] opacity-60 font-normal">(Optionnel)</span>
                  )}
                </button>
              </div>

              {/* INDICATEUR D'ÉTAT PIPETTE ACTIVE */}
              {isPickingColor && (
                <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-amber-500/15 border border-amber-500/50 text-amber-300 text-[11px] font-mono animate-fadeIn shadow-sm">
                  <div className="flex items-center gap-2">
                    <Pipette className="w-4 h-4 shrink-0 text-amber-400 animate-pulse" />
                    <span className="font-bold">Cliquez sur une couleur pour la supprimer</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsPickingColor(false)}
                    className="px-2.5 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-black font-black text-[10px] transition cursor-pointer shrink-0 shadow active:scale-95"
                    title="Terminer la sélection par pipette"
                  >
                    Terminer
                  </button>
                </div>
              )}

              {/* ZONE DE CHARGEMENT ET PRÉVISUALISATION DU SUJET SÉLECTIONNÉ */}
              <div
                onClick={(e) => {
                  if (isPickingColor && activeSubjectPhoto) {
                    handleSubjectColorPick(e, isSecondary);
                    return;
                  }
                  if (isSecondary) {
                    secondaryPhotoInputRefDesktop.current?.click();
                  } else {
                    photoInputRefDesktop.current?.click();
                  }
                }}
                className={`w-full ${activeSubjectPhoto ? 'h-72 max-h-[320px]' : 'h-32'} ${innerBg} rounded-xl border flex items-center justify-center p-2 overflow-hidden relative group transition hover:border-lime-400/50 ${isPickingColor
                    ? 'cursor-crosshair ring-2 ring-amber-400 border-amber-400'
                    : 'cursor-pointer'
                  }`}
              >
                {activeSubjectPhoto ? (
                  <>
                    <div
                      className={`w-full h-full max-h-[320px] rounded-lg p-1.5 flex items-center justify-center relative overflow-hidden bg-neutral-900/80 border border-neutral-800/80 ${isPickingColor ? 'cursor-crosshair' : ''
                        }`}
                      style={{
                        backgroundImage: `
                          linear-gradient(45deg, rgba(255,255,255,0.04) 25%, transparent 25%),
                          linear-gradient(-45deg, rgba(255,255,255,0.04) 25%, transparent 25%),
                          linear-gradient(45deg, transparent 75%, rgba(255,255,255,0.04) 75%),
                          linear-gradient(-45deg, transparent 75%, rgba(255,255,255,0.04) 75%)
                        `,
                        backgroundSize: '16px 16px',
                        backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
                      }}
                    >
                      <img
                        src={activeSubjectPhoto}
                        crossOrigin="anonymous"
                        alt={isSecondary ? "Second Sujet" : "Sujet"}
                        draggable={false}
                        loading="lazy"
                        onContextMenu={(e) => e.preventDefault()}
                        className={`w-full h-full max-h-[320px] object-contain select-none transition-all duration-150 image-render-hd ${isPickingColor ? 'cursor-crosshair' : 'pointer-events-auto'
                          }`}
                        style={{
                          WebkitTouchCallout: 'none',
                          WebkitUserSelect: 'none',
                          userSelect: 'none',
                          touchAction: 'none',
                          opacity: activeOpacity,
                          cursor: isPickingColor ? 'crosshair' : undefined,
                          filter: isLightCanvas
                            ? 'drop-shadow(0 4px 10px rgba(0,0,0,0.2)) contrast(1.04)'
                            : `drop-shadow(0 0 10px ${primaryColor}40) drop-shadow(0 8px 16px rgba(0,0,0,0.7)) contrast(1.06) brightness(1.02)`,
                        }}
                      />
                    </div>

                    {!isPickingColor && (
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10 pointer-events-none">
                        <span className="text-[10px] font-mono font-bold text-lime-400 bg-black/80 px-2 py-1 rounded-md border border-lime-400/40 flex items-center gap-1">
                          <Upload className="w-3 h-3" />
                          Remplacer {isSecondary ? 'Sujet 2' : 'Sujet 1'}
                        </span>
                      </div>
                    )}

                    {!isPickingColor && (
                      <div className="absolute top-2 right-2 flex items-center gap-1.5 z-20">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isSecondary) {
                              secondaryPhotoInputRefDesktop.current?.click();
                            } else {
                              photoInputRefDesktop.current?.click();
                            }
                          }}
                          className="py-1 px-2 rounded-lg bg-black/80 hover:bg-black text-lime-400 border border-lime-400/40 text-[9px] font-mono font-bold flex items-center gap-1 transition shadow-md cursor-pointer"
                          title="Remplacer la photo"
                        >
                          <Upload className="w-2.5 h-2.5" />
                          <span>Remplacer</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isSecondary) {
                              setInput((p) => ({ ...p, secondaryDjPhoto: '', rawSecondaryDjPhoto: '' }));
                            } else {
                              setInput((p) => ({ ...p, djPhoto: '', rawDjPhoto: '' }));
                            }
                          }}
                          className="p-1.5 rounded-lg bg-black/70 hover:bg-rose-600 text-white transition cursor-pointer"
                          title="Supprimer la photo"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center p-3">
                    <ImagePlus className="w-4 h-4 text-lime-400 mb-1" />
                    <span className="text-[11px] font-mono font-bold">
                      Uploader Photo {isSecondary ? 'Sujet 2 (Duo / B2B)' : 'Sujet 1 (Principal)'}
                    </span>
                  </div>
                )}
              </div>

              {/* ACTIONS RAPIDES : DÉTOURAGE & SUPER-RÉSOLUTION IA */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleActiveSubjectCutout(isSecondary)}
                  disabled={!activeSubjectPhoto || isCuttingBg || isRemasteringSubject}
                  className={`py-2.5 px-2 rounded-xl text-xs font-mono border transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                    isDayMode
                      ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border-zinc-300 font-medium'
                      : 'border-lime-500/40 text-lime-400 bg-lime-400/5 hover:bg-lime-400/15 font-bold'
                  }`}
                  title={`Détourer ${isSecondary ? 'le sujet 2' : 'le sujet 1'} en supprimant le fond`}
                >
                  {isCuttingBg ? (
                    <Loader2 className={`w-3.5 h-3.5 animate-spin ${isDayMode ? 'text-zinc-800' : 'text-lime-400'}`} />
                  ) : (
                    <Scissors className={`w-3.5 h-3.5 ${isDayMode ? 'text-zinc-700' : 'text-lime-400'}`} />
                  )}
                  <span>Retirer le fond</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (isPickingColor) {
                      setIsPickingColor(false);
                    } else {
                      setIsPickingColor(true);
                      showToast("🧪 Cliquez sur la couleur à supprimer sur le sujet (fond blanc, noir, etc.)", "info", 5000);
                    }
                  }}
                  disabled={!activeSubjectPhoto || isCuttingBg}
                  className={`py-2.5 px-2 rounded-xl text-xs font-mono border transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                    isPickingColor
                      ? isDayMode
                        ? 'bg-zinc-900 text-white shadow-sm border-zinc-900 font-bold'
                        : 'bg-amber-400 text-black font-black border-amber-400 ring-2 ring-amber-400/50 shadow-lg shadow-amber-400/25 animate-pulse'
                      : isDayMode
                      ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border-zinc-300 font-medium'
                      : 'border-amber-500/40 text-amber-400 bg-amber-400/5 hover:bg-amber-400/15 font-bold'
                  }`}
                  title="Pipette de détourage : cliquer sur une zone pour en extraire la couleur et la retirer sur mesure"
                >
                  <Pipette className="w-3.5 h-3.5 text-current" />
                  <span>{isPickingColor ? 'Attente clic...' : '🧪 Pipette'}</span>
                </button>

                <button
                  data-testid="subject-remaster-btn"
                  type="button"
                  onClick={handleRemasterSubjectAi}
                  disabled={!activeSubjectPhoto || isCuttingBg || isRemasteringSubject}
                  className={`py-2.5 px-2 rounded-xl text-xs font-mono border transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                    remasterSubjectSuccess
                      ? isDayMode
                        ? 'bg-zinc-900 text-white shadow-sm border-zinc-900 font-bold'
                        : 'bg-lime-400 text-black font-black border-lime-400 shadow-lg shadow-lime-400/25 scale-[1.01]'
                      : isDayMode
                      ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border-zinc-300 font-medium'
                      : 'bg-lime-400/10 text-lime-400 border-lime-500/40 hover:bg-lime-400/20 active:scale-[0.99] font-bold'
                  }`}
                  title="Super-résolution IA : upscaler et nettoyer la définition du sujet en un clic (calibré 300 DPI)"
                >
                  {isRemasteringSubject ? (
                    <Loader2 className={`w-3.5 h-3.5 animate-spin ${isDayMode ? 'text-zinc-800' : 'text-lime-400'}`} />
                  ) : remasterSubjectSuccess ? (
                    <Check className={`w-3.5 h-3.5 stroke-[3] ${isDayMode ? 'text-white' : 'text-black'}`} />
                  ) : (
                    <Sparkles className={`w-3.5 h-3.5 ${isDayMode ? 'text-zinc-700' : 'text-lime-400'}`} />
                  )}
                  <span>
                    {isRemasteringSubject
                      ? '300 DPI...'
                      : remasterSubjectSuccess
                        ? '300 DPI Actif'
                        : 'Super-Résolution IA'}
                  </span>
                </button>
              </div>

              {/* BOUTON D'ACTION IMMÉDIAT : RÉINITIALISER LE DÉTOURAGE */}
              {(activeRemovedColors.length > 0 || input.isSubjectBackgroundRemoved) && (
                <button
                  type="button"
                  onClick={handleResetCutout}
                  className={`w-full py-1.5 px-3 rounded-xl border text-[11px] font-mono font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-[0.99] ${
                    isDayMode
                      ? 'border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-800'
                      : 'border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300'
                  }`}
                  title="Revenir immédiatement à la photo originale non détourée"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${isDayMode ? 'text-rose-700' : 'text-rose-400'}`} />
                  <span>↺ Réinitialiser le détourage</span>
                </button>
              )}

              {/* PANNEAU DE CONTRÔLE PIPETTE (SENSIBILITÉ & HISTORIQUE CUMULATIF) */}
              {(selectedChromakeyColor || isPickingColor || activeRemovedColors.length > 0) && (
                <div className={`p-2.5 rounded-xl border space-y-2.5 animate-fadeIn ${
                  isDayMode ? 'bg-zinc-100/80 border-zinc-200' : 'border-amber-500/30 bg-amber-950/20'
                }`}>
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className={`flex items-center gap-1.5 font-bold ${isDayMode ? 'text-zinc-900' : 'text-amber-400'}`}>
                      <Pipette className="w-3.5 h-3.5" />
                      <span>Détourage Pipette cumulatif</span>
                    </span>
                    <div className="flex items-center gap-1.5">
                      {/* Presets rapides Fond Blanc / Fond Noir */}
                      <button
                        type="button"
                        onClick={async () => {
                          const whiteCol = { r: 255, g: 255, b: 255 };
                          setSelectedChromakeyColor(whiteCol);
                          const newColorItem: RemovedColorItem = {
                            id: `col_${Date.now()}_white`,
                            r: 255,
                            g: 255,
                            b: 255,
                            tolerance: chromakeyTolerance,
                            isContiguous: isChromakeyContiguous,
                          };
                          const currentList = isSecondary ? secondaryRemovedColors : primaryRemovedColors;
                          const nextList = [...currentList, newColorItem];
                          if (isSecondary) setSecondaryRemovedColors(nextList);
                          else setPrimaryRemovedColors(nextList);
                          await executeCumulativeChromakey(nextList, isSecondary, false);
                        }}
                        className={`px-1.5 py-0.5 rounded text-[9px] font-mono flex items-center gap-1 transition cursor-pointer ${
                          isDayMode
                            ? 'bg-white hover:bg-zinc-200 text-zinc-800 border border-zinc-300 shadow-xs'
                            : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700'
                        }`}
                        title="Ajouter le fond blanc à la liste des teintes à supprimer"
                      >
                        <span className="w-2 h-2 rounded-full bg-white inline-block border border-black/40" />
                        <span>+ Blanc</span>
                      </button>

                      <button
                        type="button"
                        onClick={async () => {
                          const blackCol = { r: 0, g: 0, b: 0 };
                          setSelectedChromakeyColor(blackCol);
                          const newColorItem: RemovedColorItem = {
                            id: `col_${Date.now()}_black`,
                            r: 0,
                            g: 0,
                            b: 0,
                            tolerance: chromakeyTolerance,
                            isContiguous: isChromakeyContiguous,
                          };
                          const currentList = isSecondary ? secondaryRemovedColors : primaryRemovedColors;
                          const nextList = [...currentList, newColorItem];
                          if (isSecondary) setSecondaryRemovedColors(nextList);
                          else setPrimaryRemovedColors(nextList);
                          await executeCumulativeChromakey(nextList, isSecondary, false);
                        }}
                        className={`px-1.5 py-0.5 rounded text-[9px] font-mono flex items-center gap-1 transition cursor-pointer ${
                          isDayMode
                            ? 'bg-white hover:bg-zinc-200 text-zinc-800 border border-zinc-300 shadow-xs'
                            : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700'
                        }`}
                        title="Ajouter le fond noir à la liste des teintes à supprimer"
                      >
                        <span className="w-2 h-2 rounded-full bg-black inline-block border border-white/60" />
                        <span>+ Noir</span>
                      </button>

                      {isPickingColor && (
                        <button
                          type="button"
                          onClick={() => setIsPickingColor(false)}
                          className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold transition cursor-pointer ${
                            isDayMode
                              ? 'bg-zinc-900 hover:bg-zinc-800 text-white'
                              : 'bg-amber-400 hover:bg-amber-300 text-black'
                          }`}
                        >
                          Terminer
                        </button>
                      )}
                    </div>
                  </div>

                  {/* PASTILLES DES COULEURS CUMULÉES RETIRÉES AVEC CROIX DE SUPPRESSION */}
                  {activeRemovedColors.length > 0 && (
                    <div className={`space-y-1.5 p-2 rounded-lg border ${
                      isDayMode ? 'bg-white border-zinc-200' : 'bg-zinc-900/90 border border-zinc-800'
                    }`}>
                      <div className="flex items-center justify-between text-[10px] font-mono">
                        <span className={`font-bold flex items-center gap-1 ${isDayMode ? 'text-zinc-900' : 'text-zinc-300'}`}>
                          <Layers className={`w-3 h-3 ${isDayMode ? 'text-zinc-700' : 'text-lime-400'}`} />
                          <span>Nuances retirées ({activeRemovedColors.length}) :</span>
                        </span>
                        <button
                          type="button"
                          onClick={handleResetCutout}
                          className={`${isDayMode ? 'text-rose-600 hover:text-rose-700' : 'text-rose-400 hover:text-rose-300'} flex items-center gap-0.5 text-[9px] hover:underline cursor-pointer`}
                          title="Réinitialiser toutes les couleurs et restaurer l'image originale"
                        >
                          <RotateCcw className="w-2.5 h-2.5" />
                          <span>Tout effacer</span>
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-0.5">
                        {activeRemovedColors.map((item) => (
                          <div
                            key={item.id}
                            className={`flex items-center gap-1.5 pl-1.5 pr-1 py-0.5 rounded-md border text-[10px] font-mono shadow-xs ${
                              isDayMode
                                ? 'bg-zinc-100 border-zinc-300 text-zinc-800'
                                : 'bg-zinc-800/90 border-zinc-700/80 text-zinc-200'
                            }`}
                          >
                            <div
                              className="w-3.5 h-3.5 rounded-full border border-black/20 shrink-0 shadow-inner"
                              style={{ backgroundColor: `rgb(${item.r}, ${item.g}, ${item.b})` }}
                              title={`RGB(${item.r}, ${item.g}, ${item.b}) - Tolérance ${item.tolerance}%`}
                            />
                            <span className={`font-semibold text-[9px] ${isDayMode ? 'text-zinc-900' : 'text-zinc-300'}`}>
                              RGB({item.r},{item.g},{item.b})
                            </span>
                            <span className={`text-[8px] font-bold ${isDayMode ? 'text-zinc-700' : 'text-amber-400'}`}>
                              {item.tolerance}%
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveColor(item.id)}
                              className={`p-0.5 rounded transition cursor-pointer ${
                                isDayMode ? 'hover:bg-zinc-200 text-zinc-500 hover:text-rose-600' : 'hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400'
                              }`}
                              title="Annuler le retrait de cette nuance"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {isPickingColor && (
                    <div className={`flex items-center justify-between gap-2 p-1.5 rounded-lg border ${
                      isDayMode ? 'bg-amber-50 border-amber-200' : 'bg-amber-500/10 border border-amber-500/30'
                    }`}>
                      <p className={`text-[10px] font-mono italic animate-pulse ${isDayMode ? 'text-amber-900' : 'text-amber-300/90'}`}>
                        👉 Cliquez sur chaque couleur/ombre à supprimer l'une après l'autre.
                      </p>
                      <button
                        type="button"
                        onClick={() => setIsPickingColor(false)}
                        className={`px-2 py-0.5 rounded font-bold text-[9px] transition cursor-pointer shrink-0 ${
                          isDayMode ? 'bg-zinc-900 hover:bg-zinc-800 text-white' : 'bg-amber-400 text-black hover:bg-amber-300'
                        }`}
                      >
                        Valider
                      </button>
                    </div>
                  )}

                  {/* Curseur de tolérance interactif en temps réel (toujours visible) */}
                  <div className="space-y-1">
                    <div className={`flex items-center justify-between text-[10px] font-mono ${isDayMode ? 'text-zinc-800' : 'text-zinc-300'}`}>
                      <span>Tolérance de la pipette {activeRemovedColors.length > 0 ? '(dernière nuance)' : ''} :</span>
                      <span className={`font-bold ${isDayMode ? 'text-zinc-900' : 'text-amber-400'}`}>{chromakeyTolerance} %</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      value={chromakeyTolerance}
                      onChange={(e) => handleToleranceChange(Number(e.target.value))}
                      onPointerUp={handleToleranceCommit}
                      className={`w-full cursor-pointer h-1.5 rounded-lg ${
                        isDayMode ? 'accent-zinc-900 bg-zinc-300' : 'accent-amber-400 bg-zinc-800'
                      }`}
                    />
                    <div className={`flex justify-between text-[8px] font-mono ${isDayMode ? 'text-zinc-600' : 'text-zinc-500'}`}>
                      <span>0% (Strict)</span>
                      <span>25% (Standard)</span>
                      <span>50%</span>
                      <span>100% (Large)</span>
                    </div>
                  </div>

                  {/* Options & Boutons d'action */}
                  <div className="flex items-center justify-between gap-2 pt-1 text-[10px] font-mono">
                    <label className={`flex items-center gap-1.5 cursor-pointer select-none ${isDayMode ? 'text-zinc-800' : 'text-zinc-400'}`}>
                      <input
                        type="checkbox"
                        checked={isChromakeyContiguous}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setIsChromakeyContiguous(checked);
                          const currentList = isSecondary ? secondaryRemovedColors : primaryRemovedColors;
                          if (currentList.length > 0) {
                            const nextList = currentList.map((c) => ({ ...c, isContiguous: checked }));
                            if (isSecondary) setSecondaryRemovedColors(nextList);
                            else setPrimaryRemovedColors(nextList);
                            executeCumulativeChromakey(nextList, isSecondary, true);
                          }
                        }}
                        className="rounded border-zinc-400 text-zinc-900 focus:ring-0"
                      />
                      <span>Contours connectés</span>
                    </label>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          const currentList = isSecondary ? secondaryRemovedColors : primaryRemovedColors;
                          executeCumulativeChromakey(currentList, isSecondary, false);
                        }}
                        disabled={isCuttingBg}
                        className={`px-2 py-1 rounded text-[9px] font-bold cursor-pointer transition ${
                          isDayMode
                            ? 'bg-zinc-200 hover:bg-zinc-300 text-zinc-800 border border-zinc-300'
                            : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40'
                        }`}
                        title="Recalculer le détourage cumulatif"
                      >
                        Réappliquer
                      </button>

                      <button
                        type="button"
                        onClick={handleResetCutout}
                        className={`px-2 py-1 rounded text-[9px] cursor-pointer transition ${
                          isDayMode
                            ? 'bg-white hover:bg-zinc-100 text-zinc-700 border border-zinc-300'
                            : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700'
                        }`}
                        title="Annuler le détourage et restaurer la photo originale"
                      >
                        Restaurer
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* GÉNÉRATEUR IA SUJET (GÉNÉRATION OU STYLISATION DU SUJET) */}
              <div className={`${innerBg} p-3 rounded-xl border ${borderColor} space-y-2.5 animate-fadeIn`}>
                <div className="flex items-center justify-between text-[11px] font-mono font-bold">
                  <span className={`flex items-center gap-1.5 ${isDayMode ? 'text-zinc-900' : 'text-lime-400'}`}>
                    <Sparkles className={`w-3.5 h-3.5 ${isDayMode ? 'text-zinc-900' : 'text-lime-400'}`} />
                    <span>{activeSubjectPhoto ? `Transformer ${isSecondary ? 'le sujet 2' : 'le sujet 1'} avec l'IA` : `Générer ${isSecondary ? 'le sujet 2' : 'le sujet 1'} avec l'IA`}</span>
                  </span>
                  <span className={`text-[9px] font-mono px-2 py-0.5 rounded border ${
                    activeSubjectPhoto
                      ? (isDayMode ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold' : 'bg-lime-400/10 text-lime-400 border-lime-400/30 font-bold')
                      : (isDayMode ? 'bg-zinc-100 text-zinc-700 border-zinc-300' : 'bg-zinc-800 text-zinc-400 border-zinc-700')
                  }`}>
                    {activeSubjectPhoto ? `Photo ${isSecondary ? 'Sujet 2' : 'Sujet 1'} active` : (isSecondary ? 'Sujet 2' : 'Sujet 1')}
                  </span>
                </div>
                <p className={`text-[10px] font-mono leading-tight ${textSubtle}`}>
                  {activeSubjectPhoto
                    ? "L'IA applique votre consigne de style ou d'attitude tout en préservant le visage et l'identité du sujet. Le fond blanc est automatiquement détouré."
                    : "Décrivez le sujet souhaité. L'IA génère le personnage en studio et retire automatiquement le fond."}
                </p>
                <input
                  type="text"
                  value={isSecondary ? (input.secondarySubjectPrompt || '') : (input.subjectPrompt || '')}
                  onChange={(e) => {
                    const val = e.target.value;
                    setInput((p) => isSecondary ? { ...p, secondarySubjectPrompt: val } : { ...p, subjectPrompt: val });
                  }}
                  placeholder={
                    activeSubjectPhoto
                      ? "Ex: Veste cyberpunk holographique, néons subtils, lunettes de soleil futuristes..."
                      : (isSecondary ? "Ex: DJ femme casque fluo, pose profil énergique, studio..." : "Ex: DJ masculin casquette, silhouette dynamique, studio...")
                  }
                  className={`w-full ${inputBg} border ${borderColor} rounded-lg px-2.5 py-1.5 text-[11px] font-mono ${isDayMode ? 'text-zinc-900 placeholder:text-zinc-400' : 'text-zinc-100'}`}
                />
                <button
                  type="button"
                  disabled={isGeneratingSubject || isCuttingBg}
                  onClick={() => handleGenerateAiSubject(isSecondary)}
                  className="w-full py-2.5 font-bold font-mono text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed bg-lime-400 hover:bg-lime-300 text-zinc-950 font-black"
                >
                  {isGeneratingSubject ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>{activeSubjectPhoto ? `Transformation de ${isSecondary ? 'Sujet 2' : 'Sujet 1'}...` : `Génération de ${isSecondary ? 'Sujet 2' : 'Sujet 1'}...`}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>
                        {activeSubjectPhoto
                          ? `Générer la variation de ${isSecondary ? 'Sujet 2' : 'Sujet 1'}`
                          : `Générer ${isSecondary ? 'Sujet 2' : 'Sujet 1'} avec l'IA`}
                      </span>
                    </>
                  )}
                </button>
              </div>

              {/* TOGGLE ÉPINGLAGE AU SUJET 1 POUR LE SUJET 2 */}
              {isSecondary && input.secondaryDjPhoto && input.djPhoto && (
                <div className={`${innerBg} p-2.5 rounded-xl border ${borderColor} flex items-center justify-between gap-3`}>
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg border ${isDayMode ? 'bg-zinc-100 text-zinc-800 border-zinc-300' : 'bg-lime-400/10 text-lime-400 border-lime-400/20'}`}>
                      <Pin className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className={`text-xs font-bold font-mono flex items-center gap-1.5 ${isDayMode ? 'text-zinc-900' : 'text-zinc-100'}`}>
                        <span>📌 Épingler au Sujet 1</span>
                        {input.secondaryIsPinnedToSubject && (
                          <span className={`text-[9px] px-1.5 py-0.2 rounded border ${isDayMode ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-lime-400/20 text-lime-400 border-lime-400/30'}`}>
                            Actif
                          </span>
                        )}
                      </div>
                      <p className={`text-[10px] font-mono leading-tight ${textSubtle}`}>
                        Le Sujet 2 suit les mouvements et la taille du Sujet 1 sur tous les formats d'affiche.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const subjectTr: SubjectAnchorTransform = {
                        scale: currentTransforms.scale,
                        offsetY: currentTransforms.offsetY,
                        offsetX: currentTransforms.offsetX,
                        alignX: currentTransforms.alignX,
                      };
                      setInput((prev) =>
                        prev.secondaryIsPinnedToSubject
                          ? unpinSecondaryFromSubject(prev, previewFormat, subjectTr)
                          : pinSecondaryToSubject(prev, previewFormat, subjectTr)
                      );
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
                      input.secondaryIsPinnedToSubject
                        ? (isDayMode ? 'bg-zinc-900 text-white shadow-sm font-bold' : 'bg-lime-400 text-black shadow-sm font-black')
                        : (isDayMode ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border border-zinc-300 font-medium' : 'bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700')
                    }`}
                  >
                    <span>{input.secondaryIsPinnedToSubject ? 'Épinglé' : 'Détaché'}</span>
                  </button>
                </div>
              )}

              {/* INPUTS FICHIERS CACHÉS */}
              <input
                ref={photoInputRefDesktop}
                type="file"
                accept="image/*"
                className="hidden"
                onClick={(e) => { (e.target as HTMLInputElement).value = ''; }}
                onChange={(e) => handleFileUpload(e, 'djPhoto')}
              />
              <input
                ref={secondaryPhotoInputRefDesktop}
                type="file"
                accept="image/*"
                className="hidden"
                onClick={(e) => { (e.target as HTMLInputElement).value = ''; }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => {
                    const dataUrl = reader.result as string;
                    setInput((prev) => ({
                      ...prev,
                      secondaryDjPhoto: dataUrl,
                      rawSecondaryDjPhoto: dataUrl,
                    }));
                  };
                  reader.readAsDataURL(file);
                  e.target.value = '';
                }}
              />

              <div className="space-y-2">

                {/* ACCORDÉON « AJUSTEMENTS MANUELS PRÉCIS » : Fondu, Opacité, Taille, Position */}
                <details open data-testid="subject-advanced-accordion" className={`group ${innerBg} rounded-xl border ${borderColor}`}>
                  <summary className={`list-none [&::-webkit-details-marker]:hidden cursor-pointer select-none flex items-center justify-between px-3 py-2.5 text-xs font-bold font-mono transition ${
                    isDayMode ? 'text-zinc-800 hover:text-zinc-900' : 'text-zinc-300 hover:text-white'
                  }`}>
                    <span>Ajustements manuels précis</span>
                    <ChevronDown className="w-3.5 h-3.5 transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="p-2.5 pt-0 space-y-2">
                    {/* CURSEUR DE FONDU BAS DU SUJET ACTIF */}
                    <div className={`${innerBg} p-2.5 rounded-xl border ${borderColor} space-y-1.5`}>
                      <div className={`flex justify-between text-[10px] font-mono font-bold ${isDayMode ? 'text-zinc-900' : 'text-zinc-200'}`}>
                        <span>Fondu Bas ({isSecondary ? 'Sujet 2' : 'Sujet 1'})</span>
                        <span className={isDayMode ? 'text-zinc-900 font-bold' : 'text-lime-400'}>{activeFadeIntensity} %</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={activeFadeIntensity}
                        onPointerDown={(e) => handleSliderPointerDown(e, `Fondu Bas (${isSecondary ? 'Sujet 2' : 'Sujet 1'})`, `${activeFadeIntensity} %`)}
                        onPointerUp={handleSliderPointerUp}
                        onPointerCancel={handleSliderPointerCancel}
                        onInput={(e) => {
                          const parsed = parseInt((e.target as HTMLInputElement).value, 10);
                          const val = Number.isNaN(parsed) ? 35 : parsed;
                          setInput((prev) => ({
                            ...prev,
                            isSubjectGradientFade: true,
                            ...(isSecondary ? { secondarySubjectFadeIntensity: val } : { subjectFadeIntensity: val }),
                          }));
                          if (isLiveScrubbing) setLiveScrubData((p) => p ? { ...p, value: `${val} %` } : null);
                        }}
                        onChange={(e) => {
                          const parsed = parseInt(e.target.value, 10);
                          const val = Number.isNaN(parsed) ? 35 : parsed;
                          setInput((prev) => ({
                            ...prev,
                            isSubjectGradientFade: true,
                            ...(isSecondary ? { secondarySubjectFadeIntensity: val } : { subjectFadeIntensity: val }),
                          }));
                        }}
                        className={`w-full accent-lime-400 h-1.5 ${isDayMode ? 'bg-zinc-200' : 'bg-zinc-800'} rounded-lg cursor-pointer touch-none`}
                      />
                    </div>

                    {/* CURSEUR D'OPACITÉ DU SUJET ACTIF */}
                    <div className={`${innerBg} p-2.5 rounded-xl border ${borderColor} space-y-1.5`}>
                      <div className={`flex justify-between text-[10px] font-mono font-bold ${isDayMode ? 'text-zinc-900' : 'text-zinc-200'}`}>
                        <span>Opacité ({isSecondary ? 'Sujet 2' : 'Sujet 1'})</span>
                        <span className={isDayMode ? 'text-zinc-900 font-bold' : 'text-lime-400'}>{Math.round(activeOpacity * 100)} %</span>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="1"
                        step="0.05"
                        value={activeOpacity}
                        onPointerDown={(e) => handleSliderPointerDown(e, `Opacité (${isSecondary ? 'Sujet 2' : 'Sujet 1'})`, `${Math.round(activeOpacity * 100)} %`)}
                        onPointerUp={handleSliderPointerUp}
                        onPointerCancel={handleSliderPointerCancel}
                        onInput={(e) => {
                          const parsed = parseFloat((e.target as HTMLInputElement).value);
                          const val = Number.isNaN(parsed) ? 1 : parsed;
                          setInput((prev) => ({
                            ...prev,
                            ...(isSecondary ? { secondaryDjPhotoOpacity: val } : { djPhotoOpacity: val }),
                          }));
                          if (isLiveScrubbing) setLiveScrubData((p) => p ? { ...p, value: `${Math.round(val * 100)} %` } : null);
                        }}
                        onChange={(e) => {
                          const parsed = parseFloat(e.target.value);
                          const val = Number.isNaN(parsed) ? 1 : parsed;
                          setInput((prev) => ({
                            ...prev,
                            ...(isSecondary ? { secondaryDjPhotoOpacity: val } : { djPhotoOpacity: val }),
                          }));
                        }}
                        className={`w-full accent-lime-400 h-1.5 ${isDayMode ? 'bg-zinc-200' : 'bg-zinc-800'} rounded-lg cursor-pointer touch-none`}
                      />
                    </div>

                    {previewFormat !== 'tshirt' && (
                      <div className={`space-y-2 pt-2 border-t ${borderColor}`}>
                        {/* TAILLE DU SUJET ACTIF */}
                        <div className="space-y-1">
                          <div className={`flex justify-between text-[10px] font-mono font-bold ${isDayMode ? 'text-zinc-900' : 'text-zinc-200'}`}>
                            <span>Taille ({isSecondary ? 'Sujet 2' : 'Sujet 1'})</span>
                            <span className={isDayMode ? 'text-zinc-900 font-bold' : 'text-lime-400'}>{Math.round(activeScale * 100)} %</span>
                          </div>
                          <input
                            type="range"
                            min="0.5"
                            max="4"
                            step="0.01"
                            value={activeScale}
                            onPointerDown={(e) => handleSliderPointerDown(e, `Taille (${isSecondary ? 'Sujet 2' : 'Sujet 1'})`, `${Math.round(activeScale * 100)} %`)}
                            onPointerUp={handleSliderPointerUp}
                            onPointerCancel={handleSliderPointerCancel}
                            onInput={(e) => {
                              const parsed = parseFloat((e.target as HTMLInputElement).value);
                              const val = Number.isNaN(parsed) ? 1.0 : parsed;
                              if (isSecondary) {
                                setInput((prev) => {
                                  const updated = applySecondarySubjectUpdate(
                                    prev,
                                    previewFormat,
                                    {
                                      scale: currentTransforms.scale,
                                      offsetY: currentTransforms.offsetY,
                                      offsetX: currentTransforms.offsetX,
                                      alignX: currentTransforms.alignX,
                                    },
                                    { scale: val }
                                  );
                                  return {
                                    ...updated,
                                    subject2Scale: val,
                                    secondaryDjPhotoScale: val,
                                  };
                                });
                              } else {
                                onUpdateTransform?.(val, currentTransforms.offsetY);
                                setInput((prev) => ({
                                  ...prev,
                                  ...(previewFormat === 'post' || previewFormat === 'a3' ? { djPhotoScale: val, subjectScale: val } : {}),
                                  formatTransforms: {
                                    ...(prev.formatTransforms || {}),
                                    [previewFormat]: {
                                      ...((prev.formatTransforms || {})[previewFormat] || {}),
                                      scale: val,
                                      offsetY: currentTransforms.offsetY,
                                      alignX: currentTransforms.alignX ?? 'center',
                                      isCustom: true,
                                    },
                                  },
                                }));
                              }
                              if (isLiveScrubbing) setLiveScrubData((p) => p ? { ...p, value: `${Math.round(val * 100)} %` } : null);
                            }}
                            onChange={(e) => {
                              const parsed = parseFloat(e.target.value);
                              const val = Number.isNaN(parsed) ? 1.0 : parsed;
                              if (isSecondary) {
                                setInput((prev) => {
                                  const updated = applySecondarySubjectUpdate(
                                    prev,
                                    previewFormat,
                                    {
                                      scale: currentTransforms.scale,
                                      offsetY: currentTransforms.offsetY,
                                      offsetX: currentTransforms.offsetX,
                                      alignX: currentTransforms.alignX,
                                    },
                                    { scale: val }
                                  );
                                  return {
                                    ...updated,
                                    subject2Scale: val,
                                    secondaryDjPhotoScale: val,
                                  };
                                });
                              } else {
                                onUpdateTransform?.(val, currentTransforms.offsetY);
                                setInput((prev) => ({
                                  ...prev,
                                  ...(previewFormat === 'post' || previewFormat === 'a3' ? { djPhotoScale: val, subjectScale: val } : {}),
                                  formatTransforms: {
                                    ...(prev.formatTransforms || {}),
                                    [previewFormat]: {
                                      ...((prev.formatTransforms || {})[previewFormat] || {}),
                                      scale: val,
                                      offsetY: currentTransforms.offsetY,
                                      alignX: currentTransforms.alignX ?? 'center',
                                      isCustom: true,
                                    },
                                  },
                                }));
                              }
                            }}
                            className={`w-full accent-lime-400 h-1.5 ${isDayMode ? 'bg-zinc-200' : 'bg-zinc-800'} rounded-lg cursor-pointer touch-none`}
                          />
                        </div>

                        {/* POSITION Y DU SUJET ACTIF */}
                        <div className="space-y-1">
                          <div className={`flex justify-between text-[10px] font-mono font-bold ${isDayMode ? 'text-zinc-900' : 'text-zinc-200'}`}>
                            <span>Position Y ({isSecondary ? 'Sujet 2' : 'Sujet 1'})</span>
                            <span className={isDayMode ? 'text-zinc-900 font-bold' : 'text-lime-400'}>{activeOffsetY} %</span>
                          </div>
                          <input
                            type="range"
                            min="-50"
                            max={180}
                            step="1"
                            value={activeOffsetY}
                            onPointerDown={(e) => handleSliderPointerDown(e, `Position Y (${isSecondary ? 'Sujet 2' : 'Sujet 1'})`, `${activeOffsetY} %`)}
                            onPointerUp={handleSliderPointerUp}
                            onPointerCancel={handleSliderPointerCancel}
                            onChange={(e) => {
                              const parsed = parseInt(e.target.value, 10);
                              const val = Number.isNaN(parsed) ? 0 : parsed;
                              if (isSecondary) {
                                setInput((prev) => {
                                  const updated = applySecondarySubjectUpdate(
                                    prev,
                                    previewFormat,
                                    {
                                      scale: currentTransforms.scale,
                                      offsetY: currentTransforms.offsetY,
                                      offsetX: currentTransforms.offsetX,
                                      alignX: currentTransforms.alignX,
                                    },
                                    { offsetY: val }
                                  );
                                  return {
                                    ...updated,
                                    subject2OffsetY: val,
                                    secondaryDjPhotoOffsetY: val,
                                  };
                                });
                              } else {
                                onUpdateTransform?.(currentTransforms.scale, val);
                                setInput((prev) => ({
                                  ...prev,
                                  ...(previewFormat === 'post' || previewFormat === 'a3' ? { djPhotoOffsetY: val, subjectPositionY: val } : {}),
                                  formatTransforms: {
                                    ...(prev.formatTransforms || {}),
                                    [previewFormat]: {
                                      ...((prev.formatTransforms || {})[previewFormat] || {}),
                                      scale: currentTransforms.scale,
                                      offsetY: val,
                                      alignX: currentTransforms.alignX ?? 'center',
                                      isCustom: true,
                                    },
                                  },
                                }));
                              }
                              if (isLiveScrubbing) setLiveScrubData((p) => p ? { ...p, value: `${val} %` } : null);
                            }}
                            className={`w-full accent-lime-400 h-1.5 ${isDayMode ? 'bg-zinc-200' : 'bg-zinc-800'} rounded-lg cursor-pointer touch-none`}
                          />
                        </div>

                        {/* POSITION X (DÉCALAGE HORIZONTAL GAUCHE ↔ DROITE) */}
                        <div className="space-y-1">
                          <div className={`flex justify-between text-[10px] font-mono font-bold ${isDayMode ? 'text-zinc-900' : 'text-zinc-200'}`}>
                            <span>Décalage X ({isSecondary ? 'Sujet 2' : 'Sujet 1'})</span>
                            <span className={isDayMode ? 'text-zinc-900 font-bold' : 'text-lime-400'}>{activeOffsetX} %</span>
                          </div>
                          <input
                            type="range"
                            min="-80"
                            max="80"
                            step="1"
                            value={activeOffsetX}
                            onPointerDown={(e) => handleSliderPointerDown(e, `Position X (${isSecondary ? 'Sujet 2' : 'Sujet 1'})`, `${activeOffsetX} %`)}
                            onPointerUp={handleSliderPointerUp}
                            onPointerCancel={handleSliderPointerCancel}
                            onChange={(e) => {
                              const parsed = parseInt(e.target.value, 10);
                              const val = Number.isNaN(parsed) ? 0 : parsed;
                              if (isSecondary) {
                                setInput((prev) => {
                                  const updated = applySecondarySubjectUpdate(
                                    prev,
                                    previewFormat,
                                    {
                                      scale: currentTransforms.scale,
                                      offsetY: currentTransforms.offsetY,
                                      offsetX: currentTransforms.offsetX,
                                      alignX: currentTransforms.alignX,
                                    },
                                    { offsetX: val }
                                  );
                                  return {
                                    ...updated,
                                    subject2OffsetX: val,
                                    secondaryDjPhotoOffsetX: val,
                                  };
                                });
                              } else {
                                setInput((prev) => ({
                                  ...prev,
                                  ...(previewFormat === 'post' || previewFormat === 'a3' ? { djPhotoOffsetX: val, subjectPositionX: val } : {}),
                                  formatTransforms: {
                                    ...(prev.formatTransforms || {}),
                                    [previewFormat]: {
                                      ...((prev.formatTransforms || {})[previewFormat] || {}),
                                      scale: currentTransforms.scale,
                                      offsetY: currentTransforms.offsetY,
                                      offsetX: val,
                                      alignX: currentTransforms.alignX ?? 'center',
                                      isCustom: true,
                                    },
                                  },
                                }));
                              }
                              if (isLiveScrubbing) setLiveScrubData((p) => p ? { ...p, value: `${val} %` } : null);
                            }}
                            className={`w-full accent-lime-400 h-1.5 ${isDayMode ? 'bg-zinc-200' : 'bg-zinc-800'} rounded-lg cursor-pointer touch-none`}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </details>
              </div>
            </div>
          );
        })()}
      </div>
      {renderInlinePreviewThumbnail('subject')}

      {/* 3. LOGO SUPERPOSÉ */}
      {
        (() => {
          const isTargetApparel = logoTarget === 'apparel';
          const side = activeView === 'dos' ? 'back' : 'front';
          const hasIndependentBackLogo = Boolean(input.tshirtBackCustomLogo && !isDemoLogo(input.tshirtBackCustomLogo));
          const currentTargetLogo = isTargetApparel
            ? resolveActiveTextileLogo(input, side)
            : ((input.logoImage && !isDemoLogo(input.logoImage) ? input.logoImage : undefined)
              || (!isDemoLogo(input.logoUrl) ? input.logoUrl : undefined));
          const isApparelExclusive = activeView === 'dos'
            ? hasIndependentBackLogo
            : Boolean(input.tshirtCustomLogo && !isDemoLogo(input.tshirtCustomLogo));
          const isApparelInherited = isTargetApparel && !isApparelExclusive && Boolean(currentTargetLogo);
          const currentTargetColorMode: LogoColorMode = isTargetApparel
            ? resolveActiveTextileColorMode(input, input.tshirtColor || 'black')
            : (input.logoColorMode || 'auto');
          const currentSubjectTransformForLogo: SubjectAnchorTransform = {
            scale: currentTransforms.scale,
            offsetY: currentTransforms.offsetY,
            offsetX: currentTransforms.offsetX,
            alignX: currentTransforms.alignX,
          };
          const currentLogoTransform = resolvePinnedLogoTransform(
            input,
            previewFormat,
            input.djPhoto ? currentSubjectTransformForLogo : null
          );

          return (
            <div ref={section3Ref} className={`${cardBg} rounded-2xl p-4 space-y-3 ${effectiveStepIndex === 2 ? `block ${mobileStepTransitionClass} min-[920px]:animate-none` : 'hidden min-[920px]:block'}`}>
              <div
                data-testid="section-header-logo"
                onClick={() => toggleSection('logo')}
                className="flex items-center justify-between cursor-pointer select-none"
              >
                <div className="flex items-center gap-2 text-left">
                  <div className={`p-1.5 rounded-lg border ${isDayMode ? 'bg-zinc-100 text-zinc-800 border-zinc-300' : 'bg-lime-400/10 text-lime-400 border-lime-400/20'}`}>
                    {isTargetApparel ? <Shirt className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                  </div>
                  <div className="flex items-center gap-2">
                    <h3 className={`text-xs font-bold font-mono uppercase tracking-wider ${isDayMode ? 'text-zinc-900' : 'text-white'}`}>
                      <span>
                        {isTargetApparel ? '3. LOGO (DTF)' : '3. LOGO SUPERPOSÉ'}
                      </span>
                      {activeSection === 'logo' ? <ChevronUp className="w-3.5 h-3.5 text-zinc-400 ml-1 inline" /> : <ChevronDown className="w-3.5 h-3.5 text-zinc-400 ml-1 inline" />}
                    </h3>
                    {saveStatus !== 'idle' && (
                      <div className="flex items-center gap-1.5 text-[10px] font-mono select-none transition-opacity duration-200">
                        {saveStatus === 'saving' && (
                          <span className="flex items-center gap-1 text-zinc-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                            <span>Enregistrement...</span>
                          </span>
                        )}
                        {saveStatus === 'saved' && (
                          <span className={`flex items-center gap-1 ${isDayMode ? 'text-emerald-700 font-bold' : 'text-lime-400'}`}>
                            <span>✓</span>
                            <span>Enregistré</span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                {logoTarget === 'poster' && previewFormat !== 'tshirt' && (
                  previewFormat === 'post' ? (
                    <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full border font-bold ${isDayMode ? 'bg-zinc-100 text-zinc-800 border-zinc-300' : 'bg-lime-400/10 text-lime-400 border-lime-400/30'}`}>Format Maître (1:1) ★</span>
                  ) : currentLogoTransform.isCustom ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setInput((p) => resetLogoTransformForFormat(p, previewFormat));
                      }}
                      className={`text-[9px] font-mono px-2 py-0.5 rounded-full border font-bold flex items-center gap-1 cursor-pointer transition ${isDayMode ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border-zinc-300' : 'bg-lime-400/10 text-lime-400 border-lime-400/30 hover:bg-lime-400/20'}`}
                      title="Rétablir l'héritage automatique des marges depuis le format maître Post (1:1)"
                    >
                      <RotateCcw className="w-2.5 h-2.5" /><span>Reset Auto</span>
                    </button>
                  ) : (
                    <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full border font-bold flex items-center gap-1 ${isDayMode ? 'bg-zinc-100 text-zinc-800 border-zinc-300' : 'bg-lime-400/10 text-lime-400 border-lime-400/30'}`} title="Marges héritées automatiquement du format maître">
                      <Sparkles className="w-2.5 h-2.5" /><span>Auto Actif</span>
                    </span>
                  )
                )}
              </div>

              {activeSection === 'logo' && (
                <div className={`space-y-3 pt-2 border-t ${borderColor} animate-fadeIn`} onClick={(e) => e.stopPropagation()}>
                  {/* Commutateur Affiche / Vêtement */}
                  <div className={`flex items-center gap-1.5 p-1 ${isDayMode ? 'bg-zinc-100 border-zinc-200' : 'bg-zinc-900/80 border-zinc-800'} border rounded-xl`}>
                    <button
                      type="button"
                      onClick={() => {
                        setLogoTarget('poster');
                        if (previewFormat === 'tshirt') onSelectFormat?.('post');
                      }}
                      className={`flex-1 py-1.5 px-2.5 rounded-lg text-[11px] font-mono font-bold transition flex items-center justify-center gap-1.5 cursor-pointer focus-visible:ring-2 focus-visible:ring-lime-400 focus-visible:outline-none ${
                        logoTarget === 'poster'
                          ? (isDayMode ? 'bg-zinc-900 text-white shadow-xs font-bold' : 'bg-lime-400 text-black shadow-sm font-black')
                          : (isDayMode ? 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/50' : 'text-zinc-400 hover:text-white')
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Affiche</span>
                      {(input.logoImage || input.logoUrl) && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setLogoTarget('apparel');
                        setTshirtView('ghost');
                        onSelectFormat?.('tshirt');
                        onTriggerDtfPress?.();
                      }}
                      className={`flex-1 py-1.5 px-2.5 rounded-lg text-[11px] font-mono font-bold transition flex items-center justify-center gap-1.5 cursor-pointer focus-visible:ring-2 focus-visible:ring-lime-400 focus-visible:outline-none ${
                        logoTarget === 'apparel'
                          ? (isDayMode ? 'bg-zinc-900 text-white shadow-xs font-bold' : 'bg-lime-400 text-black shadow-sm font-black')
                          : (isDayMode ? 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/50' : 'text-zinc-400 hover:text-white')
                      }`}
                    >
                      <Shirt className="w-3.5 h-3.5" />
                      <span>Stand Merch (0 € stock)</span>
                      {!isDemoLogo(input.tshirtCustomLogo) ? (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" title="Logo exclusif actif" />
                      ) : (input.logoImage || input.logoUrl) ? (
                        <span className="text-[9px] opacity-75 font-normal">(hérité)</span>
                      ) : (
                        <span className="text-[9px] opacity-75 font-normal">(visuel)</span>
                      )}
                    </button>
                  </div>

                  {/* Sélecteur « Vue Active Calibrage » directement au-dessus de la zone de chargement du logo */}
                  {isTargetApparel && (
                    <div className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl ${isDayMode ? 'bg-zinc-100/80 border-zinc-200' : 'bg-zinc-900/70 border-zinc-800/80'} border`}>
                      <span className={`text-[10px] font-mono font-bold ${textMuted}`}>
                        Vue Active Calibrage :
                      </span>
                      <div className={`flex items-center gap-0.5 ${isDayMode ? 'bg-white border-zinc-200' : 'bg-zinc-950 border-zinc-800'} border p-0.5 rounded-lg shadow-xs`}>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveView('face');
                            onSelectFormat?.('tshirt');
                          }}
                          className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold transition cursor-pointer flex items-center gap-1 ${
                            activeView === 'face'
                              ? (isDayMode ? 'bg-zinc-900 text-white font-bold shadow-xs' : 'bg-lime-400 text-black font-black shadow-sm')
                              : (isDayMode ? 'text-zinc-600 hover:text-zinc-900' : 'text-zinc-400 hover:text-white')
                          }`}
                          title="Vue Face (poitrine)"
                        >
                          <Shirt className="w-3 h-3" />
                          <span>Face</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveView(activeView === 'face' ? 'dos' : 'face');
                            onSelectFormat?.('tshirt');
                          }}
                          className={`px-1 py-0.5 text-[9px] transition cursor-pointer select-none flex items-center justify-center ${isDayMode ? 'text-zinc-400 hover:text-zinc-900' : 'text-zinc-500 hover:text-lime-400'}`}
                          title="Inverser la vue Face / Dos"
                          aria-label="Inverser la vue Face / Dos"
                        >
                          <ArrowLeftRight className="w-2.5 h-2.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveView('dos');
                            onSelectFormat?.('tshirt');
                          }}
                          className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold transition cursor-pointer flex items-center gap-1 ${
                            activeView === 'dos'
                              ? (isDayMode ? 'bg-zinc-900 text-white font-bold shadow-xs' : 'bg-lime-400 text-black font-black shadow-sm')
                              : (isDayMode ? 'text-zinc-600 hover:text-zinc-900' : 'text-zinc-400 hover:text-white')
                          }`}
                          title="Vue Dos"
                        >
                          <span>Dos</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Zone de preview / upload selon la cible */}
                  <div
                    onClick={() => {
                      if (isTargetApparel) {
                        tshirtLogoInputRefDesktop.current?.click();
                      } else {
                        logoInputRefDesktop.current?.click();
                      }
                    }}
                    className={`h-32 ${innerBg} rounded-xl border flex items-center justify-center p-2 overflow-hidden relative transition-all duration-300 cursor-pointer hover:border-lime-400/50 ${remasterSuccess ? 'ring-2 ring-lime-400 shadow-lg shadow-lime-400/20' : ''
                      }`}
                  >
                    {currentTargetLogo ? (
                      <>
                        <img
                          src={currentTargetLogo}
                          crossOrigin="anonymous"
                          alt="Logo"
                          draggable={false}
                          width={300}
                          height={300}
                          loading="lazy"
                          decoding="async"
                          onContextMenu={(e) => e.preventDefault()}
                          className={`max-h-full max-w-full object-contain select-none pointer-events-none -webkit-touch-callout-none transition-all duration-500 ${remasterSuccess ? 'scale-105 filter drop-shadow-[0_0_8px_rgba(57,255,20,0.5)]' : ''
                            }`}
                          style={{
                            WebkitTouchCallout: 'none',
                            WebkitUserSelect: 'none',
                            userSelect: 'none',
                            touchAction: 'none',
                          }}
                        />

                        {/* Badges d'état */}
                        {isTargetApparel && isApparelExclusive && (
                          <div className={`absolute top-2 left-2 px-2 py-0.5 rounded-md font-mono font-bold text-[9px] flex items-center gap-1 shadow-md z-10 ${
                            isDayMode ? 'bg-zinc-900 text-white' : 'bg-lime-400 text-black font-black'
                          }`}>
                            <Shirt className="w-2.5 h-2.5" />
                            <span>{activeView === 'dos' ? 'Exclusif Dos ★' : 'Exclusif Vêtement ★'}</span>
                          </div>
                        )}
                        {isTargetApparel && isApparelInherited && (
                          <div className={`absolute top-2 left-2 px-2 py-0.5 rounded-md border font-mono font-bold text-[9px] flex items-center gap-1 shadow-md z-10 ${
                            isDayMode ? 'bg-zinc-100 text-zinc-700 border-zinc-300' : 'bg-zinc-800/90 text-zinc-300 border-zinc-700'
                          }`}>
                            <span>{activeView === 'dos' ? 'Hérité de la Face' : 'Hérité Affiche (Partagé)'}</span>
                          </div>
                        )}
                        {remasterSuccess && (
                          <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-lime-400 text-black font-mono font-black text-[9px] flex items-center gap-1 shadow-md animate-pulse z-10">
                            <Sparkles className="w-2.5 h-2.5" />
                            <span>300 DPI Vectorisé ★</span>
                          </div>
                        )}

                        {/* Boutons d'action contextuels */}
                        {isTargetApparel ? (
                          activeView === 'dos' ? (
                            <>
                              {/* Bouton direct et immédiat pour supprimer le logo de la vue Dos */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setInput((p) => ({
                                    ...p,
                                    tshirtBackCustomLogo: '',
                                    tshirtBackLogoDisabled: true,
                                  }));
                                  onTriggerDtfPress?.();
                                  notifyHubProjectUpdated();
                                  showToast('Logo supprimé pour la vue Dos.', 'info');
                                }}
                                className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/80 hover:bg-rose-600 text-white transition cursor-pointer shadow-md"
                                title="Supprimer le logo de la vue Dos (dos vierge sans logo)"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>

                              {/* Actions en bas à droite pour le Dos */}
                              <div className="absolute bottom-2 right-2 flex items-center gap-1.5">
                                {hasIndependentBackLogo && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setInput((p) => ({
                                        ...p,
                                        tshirtBackCustomLogo: undefined,
                                        tshirtBackLogoDisabled: false,
                                      }));
                                      onTriggerDtfPress?.();
                                      notifyHubProjectUpdated();
                                      showToast('Logo hérité de la Face réactivé sur le Dos.', 'info');
                                    }}
                                    className="py-1 px-2 rounded-lg bg-black/80 hover:bg-black text-zinc-300 border border-zinc-700 text-[9px] font-mono font-bold flex items-center gap-1 transition shadow-md cursor-pointer"
                                    title="Revenir au logo hérité de la Face"
                                  >
                                    <RotateCcw className="w-2.5 h-2.5" />
                                    <span>Hériter Face</span>
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    tshirtLogoInputRefDesktop.current?.click();
                                  }}
                                  className="py-1 px-2 rounded-lg bg-black/80 hover:bg-black text-lime-400 border border-lime-400/40 text-[9px] font-mono font-bold flex items-center gap-1 transition shadow-md cursor-pointer"
                                  title={hasIndependentBackLogo ? "Changer le logo spécifique du Dos" : "Charger un logo spécifique uniquement pour le Dos"}
                                >
                                  <Upload className="w-2.5 h-2.5" />
                                  <span>{hasIndependentBackLogo ? 'Changer logo Dos' : 'Logo Dos spécifique'}</span>
                                </button>
                              </div>
                            </>
                          ) : isApparelExclusive ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                rawTshirtLogoOriginalRef.current = null;
                                setInput((p) => ({ ...p, tshirtCustomLogo: undefined, rawTshirtLogoOriginal: undefined }));
                                onTriggerDtfPress?.();
                              }}
                              className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/70 text-white hover:bg-black transition cursor-pointer"
                              title="Supprimer le logo exclusif et revenir au logo partagé"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                tshirtLogoInputRefDesktop.current?.click();
                              }}
                              className="absolute bottom-2 right-2 py-1 px-2 rounded-lg bg-black/80 hover:bg-black text-lime-400 border border-lime-400/40 text-[9px] font-mono font-bold flex items-center gap-1 transition shadow-md cursor-pointer"
                              title="Téléverser un logo 100% exclusif au vêtement"
                            >
                              <Upload className="w-2.5 h-2.5" />
                              <span>Rendre exclusif</span>
                            </button>
                          )
                        ) : (
                          <>
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                              <span className="text-[10px] font-mono font-bold text-lime-400 bg-black/80 px-2 py-1 rounded-md border border-lime-400/40 flex items-center gap-1">
                                <Upload className="w-3 h-3" />
                                Remplacer (1 clic)
                              </span>
                            </div>
                            <div className="absolute bottom-2 right-2 flex items-center gap-1.5 z-10">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  logoInputRefDesktop.current?.click();
                                }}
                                className="py-1 px-2 rounded-lg bg-black/80 hover:bg-black text-lime-400 border border-lime-400/40 text-[9px] font-mono font-bold flex items-center gap-1 transition shadow-md cursor-pointer"
                                title="Remplacer le logo de l'affiche"
                              >
                                <Upload className="w-2.5 h-2.5" />
                                <span>Remplacer</span>
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  rawLogoOriginalRef.current = null;
                                  setInput((p) => ({ ...p, logoImage: undefined, logoUrl: undefined }));
                                }}
                                className="p-1.5 rounded-lg bg-black/70 hover:bg-rose-600 text-white transition cursor-pointer shadow-md"
                                title="Supprimer le logo de l'affiche"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </>
                        )}
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-center p-3 gap-1">
                        <Upload className={`w-4 h-4 mb-1 ${isDayMode ? 'text-zinc-800' : 'text-lime-400'}`} />
                        <span className={`text-[11px] font-mono font-bold ${isDayMode ? 'text-zinc-900' : 'text-zinc-200'}`}>
                          {isTargetApparel
                            ? (activeView === 'dos' ? 'Uploader Logo Dos (Vue Vierge)' : 'Uploader Logo Vêtement')
                            : 'Uploader Logo Affiche (1 clic)'}
                        </span>
                        {isTargetApparel && (
                          <span className={`text-[9px] font-mono ${textSubtle} max-w-[220px]`}>
                            {activeView === 'dos'
                              ? 'Glissez un fichier ou cliquez pour uploader un logo Dos exclusif'
                              : "100% Exclusif au vêtement (non ajouté sur l'affiche)"}
                          </span>
                        )}
                        {isTargetApparel && activeView === 'dos' && Boolean(resolveActiveTextileLogo(input, 'front')) && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setInput((p) => ({
                                ...p,
                                tshirtBackCustomLogo: undefined,
                                tshirtBackLogoDisabled: false,
                              }));
                              onTriggerDtfPress?.();
                              notifyHubProjectUpdated();
                              showToast('Logo hérité de la Face réactivé sur le Dos.', 'info');
                            }}
                            className={`mt-1 py-1 px-2.5 rounded-lg border text-[9px] font-mono font-bold flex items-center gap-1 transition cursor-pointer ${
                              isDayMode ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border-zinc-300' : 'bg-zinc-800 hover:bg-zinc-700 text-lime-400 border-zinc-700'
                            }`}
                            title="Rétablir le logo de la Face sur le Dos"
                          >
                            <RotateCcw className="w-2.5 h-2.5" />
                            <span>Hériter du logo Face</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Inputs masqués */}
                  <input
                    ref={logoInputRefDesktop}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onClick={(e) => { (e.target as HTMLInputElement).value = ''; }}
                    onChange={handleLogoUpload}
                  />
                  <input
                    ref={tshirtLogoInputRefDesktop}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onClick={(e) => { (e.target as HTMLInputElement).value = ''; }}
                    onChange={handleTshirtLogoUpload}
                  />

                  {/* Outils de traitement */}
                  <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        disabled={!currentTargetLogo}
                        onClick={() => handleLogoColorModeSelect('knockout_black')}
                        className={`py-2 px-2.5 rounded-xl text-xs font-mono font-bold border transition ${
                          currentTargetColorMode === 'knockout_black'
                            ? (isDayMode ? 'bg-zinc-900 text-white border-zinc-900 shadow-xs' : 'bg-lime-400 text-black border-lime-400 font-black')
                            : (isDayMode ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border-zinc-300 font-medium' : 'bg-zinc-900 text-zinc-300 border-zinc-800')
                        }`}
                      >
                        Noirs Découpés ✂️
                      </button>
                      <button
                        type="button"
                        disabled={!currentTargetLogo || isCroppingLogoBg}
                        onClick={handleRemoveLogoBackground}
                        className={`py-2 px-2.5 rounded-xl text-xs font-mono font-bold border transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 ${
                          isDayMode
                            ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border-zinc-300 font-medium'
                            : 'border-lime-500/40 text-lime-400 bg-lime-400/5 hover:bg-lime-400/15'
                        }`}
                      >
                        {isCroppingLogoBg ? (
                          <>
                            <Loader2 className={`w-3 h-3 animate-spin ${isDayMode ? 'text-zinc-800' : 'text-lime-400'}`} />
                            <span>Détourage...</span>
                          </>
                        ) : (
                          <span>Détourer Fond (IA)</span>
                        )}
                      </button>
                    </div>

                    <div className="space-y-1.5 pt-1">
                      <span className={`text-[10px] font-mono ${textMuted} block`}>
                        Teinte &amp; Aspect {isTargetApparel ? '(Textile DTF)' : '(Affiche)'} :
                      </span>
                      {isTargetApparel ? (
                        <div className="grid grid-cols-3 gap-1.5">
                          {(['original', 'white', 'black'] as LogoColorMode[]).map((mode) => (
                            <button
                              key={mode}
                              type="button"
                              onClick={() => handleLogoColorModeSelect(mode)}
                              className={`py-1.5 rounded-lg text-[11px] font-mono font-bold border cursor-pointer transition ${
                                currentTargetColorMode === mode
                                  ? (isDayMode ? 'bg-zinc-900 text-white font-bold border-zinc-900 shadow-xs' : 'bg-lime-400 text-black font-black')
                                  : (isDayMode ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border-zinc-300' : 'bg-zinc-900 text-zinc-400 border-zinc-800')
                              }`}
                            >
                              {mode.charAt(0).toUpperCase() + mode.slice(1)}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <>
                          <div className="grid grid-cols-5 gap-1.5">
                            {([
                              { key: 'auto', label: '⚡ Auto' },
                              { key: 'neon', label: '✨ Néon' },
                              { key: 'white', label: 'Blanc' },
                              { key: 'black', label: 'Noir' },
                              { key: 'original', label: 'Original' },
                            ] as { key: LogoColorMode; label: string }[]).map(({ key, label }) => (
                              <button
                                key={key}
                                type="button"
                                onClick={() => handleLogoColorModeSelect(key)}
                                className={`py-1.5 px-1 rounded-lg text-[10px] font-mono font-bold border cursor-pointer transition text-center truncate ${
                                  currentTargetColorMode === key
                                    ? (isDayMode ? 'bg-zinc-900 text-white font-bold border-zinc-900 shadow-xs' : 'bg-lime-400 text-black font-black border-lime-400 shadow-sm')
                                    : (isDayMode ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border-zinc-300' : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white hover:border-zinc-700')
                                }`}
                                title={key === 'auto' ? 'Accordé automatiquement au décor et à la tonalité' : label}
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                          {/* Indicateur de statut de liaison Décor ➔ Logo */}
                          <div className={`mt-1 px-2.5 py-1.5 rounded-xl border text-[10px] font-mono flex items-center justify-between ${
                            isDayMode ? 'bg-zinc-100 border-zinc-200' : 'bg-zinc-900/90 border-zinc-800/80'
                          }`}>
                            <span className={`flex items-center gap-1.5 ${isDayMode ? 'text-zinc-600' : 'text-zinc-400'}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${isDayMode ? 'bg-emerald-600' : 'bg-lime-400 animate-pulse'}`} />
                              Liaison Décor ➔ Logo :
                            </span>
                            <span className={`font-bold flex items-center gap-1 ${isDayMode ? 'text-zinc-900' : 'text-lime-400'}`}>
                              {isLightTone
                                ? 'Sombre Contrasté (Fond Clair)'
                                : `Lueur Néon Active (${activeStyleKey})`}
                            </span>
                          </div>
                        </>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={handleRemasterLogoAi}
                      disabled={!currentTargetLogo || isCroppingLogoBg || isRemasteringLogo}
                      className={`w-full py-2.5 px-3 text-[10px] font-mono font-bold rounded-lg border flex items-center justify-center gap-2 transition-all duration-300 cursor-pointer ${
                        remasterSuccess
                          ? (isDayMode ? 'bg-zinc-900 text-white font-bold border-zinc-900 shadow-xs' : 'bg-lime-400 text-black font-black border-lime-400 shadow-lg shadow-lime-400/25 scale-[1.01]')
                          : (isDayMode ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border-zinc-300 font-medium' : 'bg-lime-400/10 text-lime-400 border-lime-500/40 hover:bg-lime-400/20 active:scale-[0.99]')
                      }`}
                    >
                      {isRemasteringLogo ? (
                        <Loader2 className={`w-3.5 h-3.5 animate-spin ${isDayMode ? 'text-zinc-800' : 'text-lime-400'}`} />
                      ) : remasterSuccess ? (
                        <Check className={`w-3.5 h-3.5 stroke-[3] animate-bounce ${isDayMode ? 'text-white' : 'text-black'}`} />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {isRemasteringLogo
                          ? 'Super-Résolution IA...'
                          : remasterSuccess
                            ? 'Super-Résolution 300 DPI Appliquée !'
                            : 'Super-Résolution IA'}
                      </span>
                    </button>

                    {/* Sliders de dimensions selon la cible */}
                    {isTargetApparel ? (
                      <div className={`space-y-2.5 pt-2 border-t ${borderColor}`}>
                        {/* Préréglages rapides textile : uniquement affichés sur la vue Face (masqués sur le Dos) */}
                        {activeView === 'face' && (
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className={`text-[10px] font-mono font-bold ${textMuted}`}>
                                Préréglages Calibrage DTF :
                              </span>
                              <span className={`text-[9px] font-mono font-bold ${isDayMode ? 'text-zinc-900' : 'text-lime-400'}`}>Face</span>
                            </div>
                            <div className="grid grid-cols-2 gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  const next = clampDtfPlacement({ x: 68, y: 34, scale: frontPlacement.scale }, 'front');
                                  setFrontPlacement(next);
                                  setInput((prev) => ({
                                    ...prev,
                                    tshirtFrontPlacement: next,
                                    tshirtLogoOffsetY: 0,
                                  }));
                                  notifyHubProjectUpdated();
                                }}
                                className={`py-1.5 px-2 rounded-lg text-[10px] font-mono font-bold border transition flex items-center justify-center gap-1.5 cursor-pointer focus-visible:ring-1 focus-visible:ring-lime-400 ${
                                  isDayMode
                                    ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border-zinc-300 font-medium'
                                    : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-lime-400 hover:text-white'
                                }`}
                              >
                                <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0 inline-block" />
                                <span>Cœur Standard (68%, 34%)</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const next = clampDtfPlacement({ x: 50, y: 34, scale: frontPlacement.scale }, 'front');
                                  setFrontPlacement(next);
                                  setInput((prev) => ({
                                    ...prev,
                                    tshirtFrontPlacement: next,
                                    tshirtLogoOffsetY: 0,
                                  }));
                                  notifyHubProjectUpdated();
                                }}
                                className={`py-1.5 px-2 rounded-lg text-[10px] font-mono font-bold border transition flex items-center justify-center gap-1.5 cursor-pointer focus-visible:ring-1 focus-visible:ring-lime-400 ${
                                  isDayMode
                                    ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border-zinc-300 font-medium'
                                    : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-lime-400 hover:text-white'
                                }`}
                              >
                                <Shirt className={`w-3 h-3 shrink-0 ${isDayMode ? 'text-zinc-800' : 'text-lime-400'}`} />
                                <span>Poitrine Centrée (50%, 34%)</span>
                              </button>
                            </div>
                          </div>
                        )}

                        {/* ACCORDÉON « AJUSTEMENTS MANUELS PRÉCIS » LOGO TEXTILE (FERMÉ PAR DÉFAUT) */}
                        <details data-testid="logo-advanced-accordion" className={`group ${innerBg} rounded-xl border ${borderColor}`}>
                          <summary className={`list-none [&::-webkit-details-marker]:hidden cursor-pointer select-none flex items-center justify-between px-3 py-2.5 text-xs font-bold font-mono transition ${
                            isDayMode ? 'text-zinc-800 hover:text-zinc-900' : 'text-zinc-300 hover:text-white'
                          }`}>
                            <span>Ajustements manuels précis</span>
                            <ChevronDown className="w-3.5 h-3.5 transition-transform group-open:rotate-180" />
                          </summary>
                          <div className="p-2.5 pt-0 space-y-2">
                            {/* Échelle / Taille du Logo (curseur unique simplifié et toujours stable) */}
                            <div className="space-y-1">
                              <div className={`flex justify-between text-[10px] font-mono font-bold ${isDayMode ? 'text-zinc-900' : 'text-zinc-200'}`}>
                                <span>Taille du Logo ({activeView === 'dos' ? 'Dos' : 'Face'})</span>
                                <span className={isDayMode ? 'text-zinc-900 font-bold' : 'text-lime-400'}>
                                  {Math.round((activeView === 'dos' ? backPlacement.scale : frontPlacement.scale) * 100)} %
                                </span>
                              </div>
                              <input
                                type="range"
                                min={activeView === 'dos' ? DTF_PRINT_BOUNDS.back.minScale : DTF_PRINT_BOUNDS.front.minScale}
                                max={activeView === 'dos' ? DTF_PRINT_BOUNDS.back.maxScale : DTF_PRINT_BOUNDS.front.maxScale}
                                step="0.05"
                                value={activeView === 'dos' ? backPlacement.scale : frontPlacement.scale}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 1.0;
                                  if (tshirtView !== 'ghost') {
                                    setTshirtView('ghost');
                                  }
                                  if (activeView === 'dos') {
                                    const next = clampDtfPlacement({
                                      x: backPlacement.x,
                                      y: backPlacement.y,
                                      scale: val,
                                    }, 'back');
                                    setBackPlacement(next);
                                    setInput((prev) => ({
                                      ...prev,
                                      tshirtBackPlacement: next,
                                      tshirtBackLogoScale: next.scale,
                                    }));
                                    notifyHubProjectUpdated();
                                  } else {
                                    const next = clampDtfPlacement({
                                      x: frontPlacement.x,
                                      y: frontPlacement.y,
                                      scale: val,
                                    }, 'front');
                                    setFrontPlacement(next);
                                    setInput((prev) => ({
                                      ...prev,
                                      tshirtFrontPlacement: next,
                                      tshirtLogoScale: next.scale,
                                    }));
                                    notifyHubProjectUpdated();
                                  }
                                }}
                                className={`w-full accent-lime-400 h-1.5 ${isDayMode ? 'bg-zinc-200' : 'bg-zinc-800'} rounded-lg cursor-pointer touch-none`}
                              />
                            </div>
                          </div>
                        </details>
                      </div>
                    ) : (
                      Boolean(currentTargetLogo || input.logoImage || input.logoUrl) && (
                        <div className={`space-y-3 pt-2 border-t ${borderColor}`}>
                          {/* TOGGLE ÉPINGLAGE AU SUJET 1 POUR LE LOGO */}
                          {input.djPhoto && (
                            <div className={`${innerBg} p-2.5 rounded-xl border ${borderColor} flex items-center justify-between gap-3`}>
                              <div className="flex items-center gap-2">
                                <div className={`p-1.5 rounded-lg border ${isDayMode ? 'bg-zinc-100 text-zinc-800 border-zinc-300' : 'bg-lime-400/10 text-lime-400 border-lime-400/20'}`}>
                                  <Pin className="w-3.5 h-3.5" />
                                </div>
                                <div>
                                  <div className={`text-xs font-bold font-mono flex items-center gap-1.5 ${isDayMode ? 'text-zinc-900' : 'text-zinc-100'}`}>
                                    <span>📌 Épingler au Sujet 1</span>
                                    {input.isPinnedToSubject && (
                                      <span className={`text-[9px] px-1.5 py-0.2 rounded border ${isDayMode ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-lime-400/20 text-lime-400 border-lime-400/30'}`}>
                                        Actif
                                      </span>
                                    )}
                                  </div>
                                  <p className={`text-[10px] font-mono leading-tight ${textSubtle}`}>
                                    Le logo suit les mouvements et la taille du sujet sur tous les formats.
                                  </p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setInput((prev) =>
                                    prev.isPinnedToSubject
                                      ? unpinLogoFromSubject(prev, previewFormat, currentSubjectTransformForLogo)
                                      : pinLogoToSubject(prev, previewFormat, currentSubjectTransformForLogo)
                                  );
                                }}
                                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
                                  input.isPinnedToSubject
                                    ? (isDayMode ? 'bg-zinc-900 text-white shadow-xs font-bold' : 'bg-lime-400 text-black shadow-sm font-black')
                                    : (isDayMode ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border-zinc-300 font-medium' : 'bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700')
                                }`}
                              >
                                <span>{input.isPinnedToSubject ? 'Épinglé' : 'Détaché'}</span>
                              </button>
                            </div>
                          )}

                          {/* Boutons de préréglages rapides */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <span className={`text-[10px] font-mono font-bold ${textMuted}`}>
                                  Préréglages Rapides :
                                </span>
                                {previewFormat === 'post' ? (
                                  <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border font-bold ${isDayMode ? 'bg-zinc-100 text-zinc-800 border-zinc-300' : 'bg-lime-400/10 text-lime-400 border-lime-400/20'}`}>Maître (1:1) ★</span>
                                ) : currentLogoTransform.isCustom ? (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setInput((p) => resetLogoTransformForFormat(p, previewFormat));
                                    }}
                                    className={`text-[9px] font-mono px-1.5 py-0.5 rounded border font-bold flex items-center gap-1 cursor-pointer transition ${isDayMode ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border-zinc-300' : 'bg-amber-400/10 text-amber-400 border-amber-400/20 hover:bg-amber-400/20'}`}
                                    title="Rétablir l'héritage automatique des marges depuis le format maître Post (1:1)"
                                  >
                                    <RotateCcw className="w-2.5 h-2.5" /><span>Reset Auto</span>
                                  </button>
                                ) : (
                                  <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border font-bold flex items-center gap-1 ${isDayMode ? 'bg-zinc-100 text-zinc-800 border-zinc-300' : 'bg-lime-400/10 text-lime-400 border-lime-400/20'}`} title="Marges héritées automatiquement du format maître">
                                    <Sparkles className="w-2.5 h-2.5" /><span>Auto Actif</span>
                                  </span>
                                )}
                              </div>
                              <span className={`text-[9px] font-mono ${textSubtle}`}>Coins &amp; Centre</span>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  if (input.isPinnedToSubject && input.djPhoto) {
                                    setInput((p) =>
                                      updatePinnedLogoTransform(p, previewFormat, currentSubjectTransformForLogo, { x: 10, y: 10 })
                                    );
                                  } else {
                                    setInput((p) => updateLogoTransform(p, previewFormat, { x: 10, y: 10 }));
                                  }
                                }}
                                className={`py-1.5 px-2 rounded-lg text-[10px] font-mono font-bold border cursor-pointer transition flex items-center justify-center gap-1 ${
                                  Math.round(currentLogoTransform.x) === 10 && Math.round(currentLogoTransform.y) === 10
                                    ? (isDayMode ? 'bg-zinc-900 text-white font-bold border-zinc-900 shadow-xs' : 'bg-lime-400 text-black font-black border-lime-400 shadow-sm')
                                    : (isDayMode ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border-zinc-300 font-medium' : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-zinc-700 hover:text-white')
                                }`}
                                title="Haut-Gauche (X: 10%, Y: 10%)"
                              >
                                <span>↖ Haut-Gauche</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  if (input.isPinnedToSubject && input.djPhoto) {
                                    setInput((p) =>
                                      updatePinnedLogoTransform(p, previewFormat, currentSubjectTransformForLogo, { x: 85, y: 8 })
                                    );
                                  } else {
                                    setInput((p) => updateLogoTransform(p, previewFormat, { x: 85, y: 8 }));
                                  }
                                }}
                                className={`py-1.5 px-2 rounded-lg text-[10px] font-mono font-bold border cursor-pointer transition flex items-center justify-center gap-1 ${
                                  Math.round(currentLogoTransform.x) === 85 && Math.round(currentLogoTransform.y) === 8
                                    ? (isDayMode ? 'bg-zinc-900 text-white font-bold border-zinc-900 shadow-xs' : 'bg-lime-400 text-black font-black border-lime-400 shadow-sm')
                                    : (isDayMode ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border-zinc-300 font-medium' : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-zinc-700 hover:text-white')
                                }`}
                                title="Haut-Droite (X: 85%, Y: 8%)"
                              >
                                <span>↗ Haut-Droite</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  if (input.isPinnedToSubject && input.djPhoto) {
                                    setInput((p) =>
                                      updatePinnedLogoTransform(p, previewFormat, currentSubjectTransformForLogo, { x: 50 })
                                    );
                                  } else {
                                    setInput((p) => updateLogoTransform(p, previewFormat, { x: 50 }));
                                  }
                                }}
                                className={`py-1.5 px-2 rounded-lg text-[10px] font-mono font-bold border cursor-pointer transition flex items-center justify-center gap-1 ${
                                  Math.round(currentLogoTransform.x) === 50
                                    ? (isDayMode ? 'bg-zinc-900 text-white font-bold border-zinc-900 shadow-xs' : 'bg-lime-400 text-black font-black border-lime-400 shadow-sm')
                                    : (isDayMode ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border-zinc-300 font-medium' : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-zinc-700 hover:text-white')
                                }`}
                                title="Centrer horizontalement (X: 50%)"
                              >
                                <span>↔ Centré</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  if (input.isPinnedToSubject && input.djPhoto) {
                                    setInput((p) =>
                                      updatePinnedLogoTransform(p, previewFormat, currentSubjectTransformForLogo, { x: 85, y: 88 })
                                    );
                                  } else {
                                    setInput((p) => updateLogoTransform(p, previewFormat, { x: 85, y: 88 }));
                                  }
                                }}
                                className={`py-1.5 px-2 rounded-lg text-[10px] font-mono font-bold border cursor-pointer transition flex items-center justify-center gap-1 ${
                                  Math.round(currentLogoTransform.x) === 85 && Math.round(currentLogoTransform.y) === 88
                                    ? (isDayMode ? 'bg-zinc-900 text-white font-bold border-zinc-900 shadow-xs' : 'bg-lime-400 text-black font-black border-lime-400 shadow-sm')
                                    : (isDayMode ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border-zinc-300 font-medium' : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-zinc-700 hover:text-white')
                                }`}
                                title="Bas-Droite (X: 85%, Y: 88%)"
                              >
                                <span>↘ Bas-Droite</span>
                              </button>
                            </div>
                          </div>

                          {/* ACCORDÉON « AJUSTEMENTS MANUELS PRÉCIS » LOGO AFFICHE */}
                          <details open data-testid="logo-advanced-accordion" className={`group ${innerBg} rounded-xl border ${borderColor}`}>
                            <summary className={`list-none [&::-webkit-details-marker]:hidden cursor-pointer select-none flex items-center justify-between px-3 py-2.5 text-xs font-bold font-mono transition ${
                              isDayMode ? 'text-zinc-800 hover:text-zinc-900' : 'text-zinc-300 hover:text-white'
                            }`}>
                              <span>Ajustements manuels précis</span>
                              <ChevronDown className="w-3.5 h-3.5 transition-transform group-open:rotate-180" />
                            </summary>
                            <div className="p-2.5 pt-0">
                              {/* Taille / Échelle : slider de 20% à 250% */}
                              <div className="space-y-1">
                                <div className={`flex justify-between text-[10px] font-mono font-bold ${isDayMode ? 'text-zinc-900' : 'text-zinc-200'}`}>
                                  <span>Taille du Logo / Échelle</span>
                                  <span className={isDayMode ? 'text-zinc-900 font-bold' : 'text-lime-400'}>{Math.round((currentLogoTransform.scale ?? 0.6) * 100)} %</span>
                                </div>
                                <input
                                  type="range"
                                  min="0.2"
                                  max="2.5"
                                  step="0.05"
                                  value={currentLogoTransform.scale ?? 0.6}
                                  onPointerDown={(e) => handleSliderPointerDown(e, 'Taille Logo Affiche', `${Math.round((currentLogoTransform.scale ?? 0.6) * 100)} %`)}
                                  onPointerUp={handleSliderPointerUp}
                                  onPointerCancel={handleSliderPointerCancel}
                                  onInput={(e) => {
                                    const val = parseFloat((e.target as HTMLInputElement).value) || 0.6;
                                    if (input.isPinnedToSubject && input.djPhoto) {
                                      const subjectTrScale = currentSubjectTransformForLogo.scale > 0.01 ? currentSubjectTransformForLogo.scale : 0.01;
                                      setInput((p) => ({
                                        ...updatePinnedLogoTransform(p, previewFormat, currentSubjectTransformForLogo, {
                                          relativeScale: Number((val / subjectTrScale).toFixed(3)),
                                        }),
                                        logoScale: val,
                                      }));
                                    } else {
                                      setInput((p) => ({
                                        ...updateLogoTransform(p, previewFormat, { scale: val }),
                                        logoScale: val,
                                      }));
                                    }
                                    if (isLiveScrubbing) {
                                      setLiveScrubData((prev) => prev ? { ...prev, value: `${Math.round(val * 100)} %` } : null);
                                    }
                                  }}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value) || 0.6;
                                    if (input.isPinnedToSubject && input.djPhoto) {
                                      const subjectTrScale = currentSubjectTransformForLogo.scale > 0.01 ? currentSubjectTransformForLogo.scale : 0.01;
                                      setInput((p) => ({
                                        ...updatePinnedLogoTransform(p, previewFormat, currentSubjectTransformForLogo, {
                                          relativeScale: Number((val / subjectTrScale).toFixed(3)),
                                        }),
                                        logoScale: val,
                                      }));
                                    } else {
                                      setInput((p) => ({
                                        ...updateLogoTransform(p, previewFormat, { scale: val }),
                                        logoScale: val,
                                      }));
                                    }
                                    if (isLiveScrubbing) {
                                      setLiveScrubData((prev) => prev ? { ...prev, value: `${Math.round(val * 100)} %` } : null);
                                    }
                                  }}
                                  className={`w-full accent-lime-400 h-1.5 ${isDayMode ? 'bg-zinc-200' : 'bg-zinc-800'} rounded-lg cursor-pointer touch-none`}
                                />
                              </div>

                              {/* Position Y / Déplacement vertical : slider de 0% à 100% */}
                              <div className={`space-y-1 pt-2 border-t ${borderColor}`}>
                                <div className={`flex justify-between text-[10px] font-mono font-bold ${isDayMode ? 'text-zinc-900' : 'text-zinc-200'}`}>
                                  <span>Déplacement Y (Hauteur)</span>
                                  <span className={isDayMode ? 'text-zinc-900 font-bold' : 'text-lime-400'}>{Math.round(currentLogoTransform.y ?? 12)} %</span>
                                </div>
                                <input
                                  type="range"
                                  min="0"
                                  max="100"
                                  step="1"
                                  value={currentLogoTransform.y ?? 12}
                                  onPointerDown={(e) => handleSliderPointerDown(e, 'Déplacement Y Logo', `${Math.round(currentLogoTransform.y ?? 12)} %`)}
                                  onPointerUp={handleSliderPointerUp}
                                  onPointerCancel={handleSliderPointerCancel}
                                  onInput={(e) => {
                                    const val = parseFloat((e.target as HTMLInputElement).value) || 0;
                                    if (input.isPinnedToSubject && input.djPhoto) {
                                      setInput((p) => ({
                                        ...updatePinnedLogoTransform(p, previewFormat, currentSubjectTransformForLogo, { y: val }),
                                        logoOffsetY: val,
                                        logoPositionY: val,
                                      }));
                                    } else {
                                      setInput((p) => ({
                                        ...updateLogoTransform(p, previewFormat, { y: val }),
                                        logoOffsetY: val,
                                        logoPositionY: val,
                                      }));
                                    }
                                    if (isLiveScrubbing) {
                                      setLiveScrubData((prev) => prev ? { ...prev, value: `${Math.round(val)} %` } : null);
                                    }
                                  }}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value) || 0;
                                    if (input.isPinnedToSubject && input.djPhoto) {
                                      setInput((p) => ({
                                        ...updatePinnedLogoTransform(p, previewFormat, currentSubjectTransformForLogo, { y: val }),
                                        logoOffsetY: val,
                                        logoPositionY: val,
                                      }));
                                    } else {
                                      setInput((p) => ({
                                        ...updateLogoTransform(p, previewFormat, { y: val }),
                                        logoOffsetY: val,
                                        logoPositionY: val,
                                      }));
                                    }
                                    if (isLiveScrubbing) {
                                      setLiveScrubData((prev) => prev ? { ...prev, value: `${Math.round(val)} %` } : null);
                                    }
                                  }}
                                  className={`w-full accent-lime-400 h-1.5 ${isDayMode ? 'bg-zinc-200' : 'bg-zinc-800'} rounded-lg cursor-pointer touch-none`}
                                />
                              </div>
                            </div>
                          </details>

                          <div className="p-2 rounded-lg bg-zinc-900/60 border border-zinc-800/80 text-[10px] font-mono text-zinc-400 flex items-center gap-1.5">
                            <Sparkles className="w-3 h-3 text-lime-400 shrink-0" />
                            <span>Glisser-déposer actif : vous pouvez aussi attraper et déplacer le logo directement sur l'affiche.</span>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })()
      }
      {renderInlinePreviewThumbnail('logo')}

      {/* 4. DIRECTION CHROMATIQUE & IDENTITÉ */}
      <div ref={section4Ref} className={`${cardBg} rounded-2xl p-4 space-y-3 ${effectiveStepIndex === 3 ? `block ${mobileStepTransitionClass} min-[920px]:animate-none` : 'hidden min-[920px]:block'}`}>
        <div
          onClick={() => toggleSection('theme')}
          className="flex items-center justify-between cursor-pointer select-none"
        >
          <div className="flex items-center gap-2 text-left">
            <div className="p-1.5 rounded-lg bg-lime-400/10 text-lime-400 border border-lime-400/20"><Palette className="w-4 h-4" /></div>
            <div>
              <h3 className={`text-xs font-bold font-mono uppercase tracking-wider ${isDayMode ? 'text-zinc-900' : 'text-white'}`}>
                <span>4. COULEURS &amp; IDENTITÉ</span>
                {activeSection === 'theme' ? <ChevronUp className="w-3.5 h-3.5 text-zinc-400 ml-1 inline" /> : <ChevronDown className="w-3.5 h-3.5 text-zinc-400 ml-1 inline" />}
              </h3>
            </div>
          </div>
        </div>
        {activeSection === 'theme' && (
          <div className={`pt-2 border-t ${borderColor} animate-fadeIn`} onClick={(e) => e.stopPropagation()}>
            <StyleDirectionPicker
              input={input}
              setInput={setInput}
              isDayMode={isDayMode}
              setFocusedTarget={setFocusedTarget}
              setIsLiveScrubbing={setIsLiveScrubbing}
              setLiveScrubData={setLiveScrubData}
            />
          </div>
        )}
      </div>
      {renderInlinePreviewThumbnail('theme')}

      {/* 5. TAILLES & TYPOGRAPHIES (FUSION DES RÉGLAGES TEXTUELS & CURSEURS FLUIDES) */}
      <div
        ref={section6Ref}
        data-testid="section-5-card"
        className={`${cardBg} rounded-2xl p-4 space-y-3 w-full max-w-full overflow-hidden ${effectiveStepIndex === 4 ? `block ${mobileStepTransitionClass} min-[920px]:animate-none` : 'hidden min-[920px]:block'
          }`}
      >
        <div
          onClick={() => toggleSection('textSizes')}
          className="flex items-center justify-between cursor-pointer select-none"
        >
          <div className="flex items-center gap-2 text-left">
            <div className="p-1.5 rounded-lg bg-lime-400/10 text-lime-400 border border-lime-400/20">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className={`text-xs font-bold font-mono uppercase tracking-wider ${isDayMode ? 'text-zinc-900' : 'text-white'}`}>
                <span>5. COMPOSITION INTELLIGENTE &amp; TEXTES</span>
                {activeSection === 'textSizes' || activeSection === 'texts' ? (
                  <ChevronUp className="w-3.5 h-3.5 text-zinc-400 ml-1 inline" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-zinc-400 ml-1 inline" />
                )}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-lime-400/10 text-lime-400 border border-lime-400/30">
              {FORMAT_LABELS[previewFormat] || previewFormat}
            </span>
          </div>
        </div>

        {(activeSection === 'textSizes' || activeSection === 'texts') && (
          <div className={`pt-2 border-t ${borderColor} space-y-4 animate-fadeIn w-full max-w-full overflow-hidden`} onClick={(e) => e.stopPropagation()}>
            {/* 1. Sélecteur Visuel de 3 Gabarits d'Intention Intelligents (Wireframe Cards) */}
            <div className="space-y-2" data-testid="step5-composition-selector">
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className={`flex items-center gap-1.5 font-bold uppercase ${isDayMode ? 'text-zinc-900' : 'text-zinc-300'}`}>
                  <LayoutTemplate className={`w-3.5 h-3.5 ${isDayMode ? 'text-zinc-900' : 'text-emerald-400'}`} />
                  <span>Gabarit d'Intention :</span>
                </span>
                <span className={`font-bold flex items-center gap-1.5 ${isDayMode ? 'text-zinc-900' : 'text-emerald-400'}`}>
                  {activeLayoutTemplate === 'duality_campaign' && <Layers className={`w-3.5 h-3.5 ${isDayMode ? 'text-zinc-900' : 'text-lime-400'}`} />}
                  {activeLayoutTemplate === 'headliner_event' && <Flame className={`w-3.5 h-3.5 ${isDayMode ? 'text-zinc-900' : 'text-orange-400'}`} />}
                  {activeLayoutTemplate === 'minimal_brand' && <Tag className={`w-3.5 h-3.5 ${isDayMode ? 'text-zinc-900' : 'text-emerald-400'}`} />}
                  <span>
                    {activeLayoutTemplate === 'duality_campaign'
                      ? 'Campagne Duale'
                      : activeLayoutTemplate === 'headliner_event'
                        ? 'Headliner Event'
                        : 'Drop Minimal'}
                  </span>
                </span>
              </div>

              {/* Grille compacte de 3 cartes de sélection cliquables (Wireframe cards) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  {
                    id: 'duality_campaign' as const,
                    iconElement: <Layers className={`w-3.5 h-3.5 ${isDayMode ? 'text-zinc-900' : 'text-lime-400'}`} />,
                    title: 'Campagne Duale',
                    subtitle: 'Accroches scindées haut + Titre d\'impact bas',
                    wireframe: (
                      <div className={`w-full h-10 rounded border p-1 flex flex-col justify-between overflow-hidden ${isDayMode ? 'bg-zinc-100 border-zinc-300' : 'bg-black/70 border-zinc-800'}`}>
                        <div className="flex justify-between items-center px-0.5">
                          <div className={`h-1 w-5 rounded-xs ${isDayMode ? 'bg-zinc-800' : 'bg-white'}`} />
                          <div className="h-1 w-5 rounded-xs bg-zinc-500" />
                        </div>
                        <div className="flex flex-col items-center gap-0.5 pb-0.5">
                          <div className={`h-1.5 w-10 rounded-xs ${isDayMode ? 'bg-zinc-800' : 'bg-white'}`} />
                          <div className="h-1 w-8 rounded-xs bg-[#F97316]" />
                        </div>
                      </div>
                    ),
                  },
                  {
                    id: 'headliner_event' as const,
                    iconElement: <Flame className={`w-3.5 h-3.5 ${isDayMode ? 'text-zinc-900' : 'text-orange-400'}`} />,
                    title: 'Headliner Event',
                    subtitle: 'Nom artiste massif traversant + Date cartouche',
                    wireframe: (
                      <div className={`w-full h-10 rounded border p-1 flex flex-col justify-between items-center overflow-hidden ${isDayMode ? 'bg-zinc-100 border-zinc-300' : 'bg-black/70 border-zinc-800'}`}>
                        <div className={`mt-1 h-2 w-14 rounded-xs ${isDayMode ? 'bg-zinc-800' : 'bg-white'} shadow-xs`} />
                        <div className={`h-1.5 w-12 rounded-full border flex items-center justify-center ${isDayMode ? 'bg-zinc-200 border-zinc-300' : 'bg-neutral-900 border-zinc-700'}`}>
                          <div className="h-0.5 w-8 rounded-full bg-amber-400" />
                        </div>
                      </div>
                    ),
                  },
                  {
                    id: 'minimal_brand' as const,
                    iconElement: <Tag className={`w-3.5 h-3.5 ${isDayMode ? 'text-zinc-900' : 'text-emerald-400'}`} />,
                    title: 'Drop Minimal',
                    subtitle: 'Typographie épurée verticale à gauche',
                    wireframe: (
                      <div className={`w-full h-10 rounded border p-1 flex flex-col justify-center items-start gap-0.5 pl-1.5 overflow-hidden ${isDayMode ? 'bg-zinc-100 border-zinc-300' : 'bg-black/70 border-zinc-800'}`}>
                        <div className={`h-1.5 w-9 rounded-xs ${isDayMode ? 'bg-zinc-800' : 'bg-white'}`} />
                        <div className="h-0.5 w-3 rounded-full bg-emerald-500" />
                        <div className="h-1 w-12 rounded-xs bg-zinc-400" />
                      </div>
                    ),
                  },
                ].map((tmpl) => {
                  const isActive = activeLayoutTemplate === tmpl.id;
                  return (
                    <button
                      key={tmpl.id}
                      type="button"
                      data-testid={`step5-template-card-${tmpl.id}`}
                      onClick={() => {
                        setInput((prev) => {
                          const compKey: CompositionTemplate = tmpl.id === 'headliner_event'
                            ? 'headliner'
                            : tmpl.id === 'minimal_brand'
                              ? 'minimalist'
                              : 'campaign_dual';
                          const next: EventInput = {
                            ...prev,
                            layoutTemplate: tmpl.id,
                            compositionTemplate: compKey,
                          };
                          inputRef.current = next;
                          saveImmediateToLocalStorage(next);
                          return next;
                        });
                      }}
                      className={`p-2.5 rounded-xl text-left transition cursor-pointer flex flex-col gap-2 select-none focus-visible:ring-2 focus-visible:ring-lime-400 focus-visible:outline-none active:scale-[0.98] ${
                        isActive
                          ? (isDayMode ? 'border-2 border-zinc-900 bg-white text-zinc-900 shadow-sm ring-1 ring-zinc-900/10' : 'border-2 border-emerald-500 bg-neutral-900/90 text-white shadow-lg')
                          : (isDayMode ? 'border border-zinc-300 bg-zinc-50 hover:bg-zinc-100 text-zinc-700' : 'border border-zinc-800 bg-neutral-950/60 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200')
                      }`}
                    >
                      {tmpl.wireframe}
                      <div className="min-w-0">
                        <div className={`text-xs font-mono font-bold flex items-center gap-1.5 ${isDayMode ? 'text-zinc-900' : 'text-zinc-100'}`}>
                          {tmpl.iconElement}
                          <span className="truncate">{tmpl.title}</span>
                        </div>
                        <div className={`text-[9px] font-mono ${textSubtle} leading-tight mt-0.5 line-clamp-2`}>
                          {tmpl.subtitle}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Formulaire Contextuel (Slots fermés selon gabarit) */}
            {activeLayoutTemplate === 'duality_campaign' && (
              <div className="space-y-3 animate-fadeIn">
                {/* Indicateur d'Auto-Luminance */}
                <div className={`p-2.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] font-mono ${
                  isDayMode ? 'bg-zinc-100/80 border-zinc-200 text-zinc-800' : 'border-emerald-500/25 bg-emerald-500/5'
                }`}>
                  <div className="flex items-center gap-2">
                    <Sparkles className={`w-4 h-4 shrink-0 ${isDayMode ? 'text-zinc-800' : 'text-emerald-400'}`} />
                    <span className={`font-bold ${isDayMode ? 'text-zinc-900' : 'text-zinc-300'}`}>Auto-Luminance Active :</span>
                    <span className={`${textSubtle} hidden md:inline text-[10px]`}>Contraste automatique par quadrant</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold">
                    <span className={`px-2 py-0.5 rounded border ${
                      autoLuminance.topLeftColor === '#FFFFFF'
                        ? (isDayMode ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-zinc-900 text-white border-zinc-700')
                        : 'bg-white text-black border-zinc-300 shadow-xs'
                    }`}>
                      Gauche: {autoLuminance.topLeftColor === '#FFFFFF' ? '⚪ Blanc' : '⚫ Noir'}
                    </span>
                    <span className={`px-2 py-0.5 rounded border ${
                      autoLuminance.topRightColor === '#FFFFFF'
                        ? (isDayMode ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-zinc-900 text-white border-zinc-700')
                        : 'bg-white text-black border-zinc-300 shadow-xs'
                    }`}>
                      Droite: {autoLuminance.topRightColor === '#FFFFFF' ? '⚪ Blanc' : '⚫ Noir'}
                    </span>
                    <span className={`px-2 py-0.5 rounded border ${
                      isDayMode ? 'bg-zinc-200 text-zinc-800 border-zinc-300' : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                    }`}>
                      Bas: Scrim 100% Opaque
                    </span>
                  </div>
                </div>

                {/* Slots de Saisie Gabarit Campagne Duale */}
                <div className="space-y-2.5">
                  {/* Input 1 : Accroche Gauche */}
                  <div className={`p-3 rounded-xl border ${borderColor} ${innerBg} space-y-1.5 transition-all hover:border-zinc-400`}>
                    <div className="flex items-center justify-between">
                      <label className={`text-[10px] font-mono font-bold uppercase flex items-center gap-1.5 ${isDayMode ? 'text-zinc-900' : 'text-zinc-300'}`}>
                        <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block shrink-0" />
                        <span>Accroche Gauche</span>
                        <span className={`${textSubtle} font-normal hidden sm:inline`}>({autoLuminance.topLeftColor === '#FFFFFF' ? 'Blanc' : 'Noir'})</span>
                      </label>
                      <span className={`text-[10px] font-mono ${dualitySlots.topTextLeft.length >= 35 ? 'text-red-500 font-bold' : textSubtle}`}>
                        {dualitySlots.topTextLeft.length}/35
                      </span>
                    </div>
                    <input
                      type="text"
                      maxLength={35}
                      value={dualitySlots.topTextLeft}
                      onChange={(e) => {
                        const val = e.target.value.slice(0, 35);
                        setInput((prev) => {
                          const nextTemplateData = {
                            ...(prev.templateData || {}),
                            topTextLeft: val,
                            topTextRight: prev.templateData?.topTextRight ?? currentTemplateData.topTextRight,
                            bottomTitle: prev.templateData?.bottomTitle ?? currentTemplateData.bottomTitle,
                            bottomAccent: prev.templateData?.bottomAccent ?? currentTemplateData.bottomAccent,
                          };
                          const nextSlots = { ...(prev.dualityCampaignSlots || {}), topTextLeft: val };
                          const next: EventInput = {
                            ...prev,
                            layoutTemplate: prev.layoutTemplate || 'duality_campaign',
                            templateData: nextTemplateData,
                            dualityCampaignSlots: nextSlots as DualityCampaignSlots,
                            topTextLeft: val,
                            topDualLeft: val,
                            headerTagline: val,
                          };
                          inputRef.current = next;
                          saveImmediateToLocalStorage(next);
                          return next;
                        });
                      }}
                      placeholder="ex: DESCENDRE DANS LA RUE."
                      className={`w-full ${inputBg} border ${borderColor} rounded-lg px-3 py-2 text-xs font-mono outline-none focus:border-zinc-500 ${isDayMode ? 'text-zinc-900 placeholder:text-zinc-400' : 'text-zinc-100'}`}
                    />
                  </div>

                  {/* Input 2 : Accroche Droite */}
                  <div className={`p-3 rounded-xl border ${borderColor} ${innerBg} space-y-1.5 transition-all hover:border-zinc-400`}>
                    <div className="flex items-center justify-between">
                      <label className={`text-[10px] font-mono font-bold uppercase flex items-center gap-1.5 ${isDayMode ? 'text-zinc-900' : 'text-zinc-300'}`}>
                        <span className="w-2 h-2 rounded-full bg-cyan-500 inline-block shrink-0" />
                        <span>Accroche Droite</span>
                        <span className={`${textSubtle} font-normal hidden sm:inline`}>({autoLuminance.topRightColor === '#FFFFFF' ? 'Blanc' : 'Noir'})</span>
                      </label>
                      <span className={`text-[10px] font-mono ${dualitySlots.topTextRight.length >= 35 ? 'text-red-500 font-bold' : textSubtle}`}>
                        {dualitySlots.topTextRight.length}/35
                      </span>
                    </div>
                    <input
                      type="text"
                      maxLength={35}
                      value={dualitySlots.topTextRight}
                      onChange={(e) => {
                        const val = e.target.value.slice(0, 35);
                        setInput((prev) => {
                          const nextTemplateData = {
                            ...(prev.templateData || {}),
                            topTextLeft: prev.templateData?.topTextLeft ?? currentTemplateData.topTextLeft,
                            topTextRight: val,
                            bottomTitle: prev.templateData?.bottomTitle ?? currentTemplateData.bottomTitle,
                            bottomAccent: prev.templateData?.bottomAccent ?? currentTemplateData.bottomAccent,
                          };
                          const nextSlots = { ...(prev.dualityCampaignSlots || {}), topTextRight: val };
                          const next: EventInput = {
                            ...prev,
                            layoutTemplate: prev.layoutTemplate || 'duality_campaign',
                            templateData: nextTemplateData,
                            dualityCampaignSlots: nextSlots as DualityCampaignSlots,
                            topTextRight: val,
                            topDualRight: val,
                            headlineBadgeText: val,
                          };
                          inputRef.current = next;
                          saveImmediateToLocalStorage(next);
                          return next;
                        });
                      }}
                      placeholder="ex: SE FAIRE ENTENDRE AUTREMENT."
                      className={`w-full ${inputBg} border ${borderColor} rounded-lg px-3 py-2 text-xs font-mono outline-none focus:border-zinc-500 ${isDayMode ? 'text-zinc-900 placeholder:text-zinc-400' : 'text-zinc-100'}`}
                    />
                  </div>

                  {/* Input 3 : Appel Principal */}
                  <div className={`p-3 rounded-xl border ${borderColor} ${innerBg} space-y-1.5 transition-all hover:border-zinc-400`}>
                    <div className="flex items-center justify-between">
                      <label className={`text-[10px] font-mono font-bold uppercase flex items-center gap-1.5 ${isDayMode ? 'text-zinc-900' : 'text-zinc-300'}`}>
                        <span className={`w-2 h-2 rounded-full inline-block shrink-0 ${isDayMode ? 'bg-zinc-800' : 'bg-white'}`} />
                        <span>Appel Principal</span>
                        <span className={`${textSubtle} font-normal hidden sm:inline`}>(Bottom • Extra-bold)</span>
                      </label>
                      <span className={`text-[10px] font-mono ${dualitySlots.bottomTitle.length >= 25 ? 'text-red-500 font-bold' : textSubtle}`}>
                        {dualitySlots.bottomTitle.length}/25
                      </span>
                    </div>
                    <input
                      type="text"
                      maxLength={25}
                      value={dualitySlots.bottomTitle}
                      onChange={(e) => {
                        const val = e.target.value.slice(0, 25);
                        setInput((prev) => {
                          const nextTemplateData = {
                            ...(prev.templateData || {}),
                            topTextLeft: prev.templateData?.topTextLeft ?? currentTemplateData.topTextLeft,
                            topTextRight: prev.templateData?.topTextRight ?? currentTemplateData.topTextRight,
                            bottomTitle: val,
                            bottomAccent: prev.templateData?.bottomAccent ?? currentTemplateData.bottomAccent,
                          };
                          const nextSlots = { ...(prev.dualityCampaignSlots || {}), bottomTitle: val };
                          const next: EventInput = {
                            ...prev,
                            layoutTemplate: prev.layoutTemplate || 'duality_campaign',
                            templateData: nextTemplateData,
                            dualityCampaignSlots: nextSlots as DualityCampaignSlots,
                            bottomTitle: val,
                            mainTitle: val,
                            eventName: val,
                          };
                          inputRef.current = next;
                          saveImmediateToLocalStorage(next);
                          return next;
                        });
                      }}
                      placeholder="ex: CHOISISSEZ"
                      className={`w-full ${inputBg} border ${borderColor} rounded-lg px-3 py-2 text-xs font-mono font-bold uppercase outline-none focus:border-zinc-500 ${isDayMode ? 'text-zinc-900 placeholder:text-zinc-400' : 'text-zinc-100'}`}
                    />
                  </div>

                  {/* Input 4 : Mot d'Accent */}
                  <div className={`p-3 rounded-xl border ${isDayMode ? 'border-amber-300 bg-amber-50/40' : 'border-amber-500/35 ' + innerBg} space-y-1.5 transition-all hover:border-amber-400`}>
                    <div className="flex items-center justify-between">
                      <label className={`text-[10px] font-mono font-bold uppercase flex items-center gap-1.5 ${isDayMode ? 'text-amber-950' : 'text-amber-300'}`}>
                        <span className="w-2.5 h-2.5 rounded-full bg-[#F97316] inline-block shadow-[0_0_8px_rgba(249,115,22,0.8)] shrink-0" />
                        <span>Mot d'Accent</span>
                        <span className={`font-mono text-[9px] px-1.5 py-0.2 rounded border ${isDayMode ? 'text-amber-900 bg-amber-100 border-amber-300' : 'text-amber-400/90 bg-amber-500/10 border-amber-500/30'}`}>
                          Badge Orange #F97316 • Brush SVG
                        </span>
                      </label>
                      <span className={`text-[10px] font-mono ${dualitySlots.bottomAccent.length >= 25 ? 'text-red-500 font-bold' : textSubtle}`}>
                        {dualitySlots.bottomAccent.length}/25
                      </span>
                    </div>
                    <input
                      type="text"
                      maxLength={25}
                      value={dualitySlots.bottomAccent}
                      onChange={(e) => {
                        const val = e.target.value.slice(0, 25);
                        setInput((prev) => {
                          const nextTemplateData = {
                            ...(prev.templateData || {}),
                            topTextLeft: prev.templateData?.topTextLeft ?? currentTemplateData.topTextLeft,
                            topTextRight: prev.templateData?.topTextRight ?? currentTemplateData.topTextRight,
                            bottomTitle: prev.templateData?.bottomTitle ?? currentTemplateData.bottomTitle,
                            bottomAccent: val,
                          };
                          const nextSlots = { ...(prev.dualityCampaignSlots || {}), bottomAccent: val };
                          const next: EventInput = {
                            ...prev,
                            layoutTemplate: prev.layoutTemplate || 'duality_campaign',
                            templateData: nextTemplateData,
                            dualityCampaignSlots: nextSlots as DualityCampaignSlots,
                            bottomAccent: val,
                            accentWord: val,
                            punchline: val,
                          };
                          inputRef.current = next;
                          saveImmediateToLocalStorage(next);
                          return next;
                        });
                      }}
                      placeholder="ex: VOTRE VOIE."
                      className={`w-full ${inputBg} border ${isDayMode ? 'border-amber-300 text-amber-950 font-bold' : 'border-amber-500/40 text-amber-200'} rounded-lg px-3 py-2 text-xs font-mono font-bold uppercase outline-none focus:border-amber-500`}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 2b. Formulaire Headliner Event */}
            {activeLayoutTemplate === 'headliner_event' && (
              <div className="space-y-3 animate-fadeIn">
                <div className="space-y-2.5">
                  {/* Input 1 : Nom de l'Artiste / DJ */}
                  <div className={`p-3 rounded-xl border ${borderColor} ${innerBg} space-y-1.5 transition-all hover:border-emerald-400/40`}>
                    <div className="flex items-center justify-between">
                      <label className={`text-[10px] font-mono font-bold uppercase flex items-center gap-1.5 ${isDayMode ? 'text-zinc-900' : 'text-zinc-300'}`}>
                        <span className={`w-2 h-2 rounded-full inline-block shrink-0 ${isDayMode ? 'bg-zinc-800' : 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]'}`} />
                        <span>Nom de l'Artiste / DJ</span>
                        <span className={`${textSubtle} font-normal hidden sm:inline`}>(Tiers supérieur • Titre géant condensé)</span>
                      </label>
                      <span className={`text-[10px] font-mono ${headlinerSlots.artistName.length >= 30 ? 'text-red-500 font-bold' : textSubtle}`}>
                        {headlinerSlots.artistName.length}/30
                      </span>
                    </div>
                    <input
                      type="text"
                      maxLength={30}
                      value={headlinerSlots.artistName}
                      onChange={(e) => {
                        const val = e.target.value.slice(0, 30);
                        setInput((prev) => {
                          const nextSlots = { ...(prev.headlinerEventSlots || {}), artistName: val };
                          const next: EventInput = {
                            ...prev,
                            headlinerEventSlots: nextSlots as HeadlinerEventSlots,
                            artistName: val,
                            djName: val,
                            eventName: val,
                          };
                          inputRef.current = next;
                          saveImmediateToLocalStorage(next);
                          return next;
                        });
                      }}
                      placeholder="ex: AMELIE LENS"
                      className={`w-full ${inputBg} border ${borderColor} rounded-lg px-3 py-2 text-xs font-mono font-bold uppercase outline-none focus:border-zinc-500 ${isDayMode ? 'text-zinc-900 placeholder:text-zinc-400' : 'text-zinc-100'}`}
                    />
                  </div>

                  {/* Input 2 : Sous-titre / Style */}
                  <div className={`p-3 rounded-xl border ${borderColor} ${innerBg} space-y-1.5 transition-all hover:border-zinc-400`}>
                    <div className="flex items-center justify-between">
                      <label className={`text-[10px] font-mono font-bold uppercase flex items-center gap-1.5 ${isDayMode ? 'text-zinc-900' : 'text-amber-300'}`}>
                        <span className="w-2 h-2 rounded-full bg-amber-400 inline-block shrink-0" />
                        <span>Sous-titre / Style</span>
                        <span className={`${textSubtle} font-normal hidden sm:inline`}>(Bandeau bas • Ex: VOCAL MELODIC TECHNO)</span>
                      </label>
                      <span className={`text-[10px] font-mono ${headlinerSlots.subRole.length >= 35 ? 'text-red-500 font-bold' : textSubtle}`}>
                        {headlinerSlots.subRole.length}/35
                      </span>
                    </div>
                    <input
                      type="text"
                      maxLength={35}
                      value={headlinerSlots.subRole}
                      onChange={(e) => {
                        const val = e.target.value.slice(0, 35);
                        setInput((prev) => {
                          const nextSlots = { ...(prev.headlinerEventSlots || {}), subRole: val };
                          const next: EventInput = {
                            ...prev,
                            headlinerEventSlots: nextSlots as HeadlinerEventSlots,
                            subRole: val,
                            punchline: val,
                            headerTagline: val,
                          };
                          inputRef.current = next;
                          saveImmediateToLocalStorage(next);
                          return next;
                        });
                      }}
                      placeholder="ex: VOCAL MELODIC TECHNO"
                      className={`w-full ${inputBg} border ${borderColor} rounded-lg px-3 py-2 text-xs font-mono uppercase outline-none focus:border-zinc-500 ${isDayMode ? 'text-zinc-900 placeholder:text-zinc-400' : 'text-amber-200'}`}
                    />
                  </div>

                  {/* Input 3 : Date & Lieu */}
                  <div className={`p-3 rounded-xl border ${borderColor} ${innerBg} space-y-1.5 transition-all hover:border-zinc-400`}>
                    <div className="flex items-center justify-between">
                      <label className={`text-[10px] font-mono font-bold uppercase flex items-center gap-1.5 ${isDayMode ? 'text-zinc-900' : 'text-zinc-300'}`}>
                        <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block shrink-0" />
                        <span>Date &amp; Lieu</span>
                        <span className={`${textSubtle} font-normal hidden sm:inline`}>(Bandeau bas • Ex: SAMEDI 24 OCTOBRE // CLUB VISION ROOM)</span>
                      </label>
                      <span className={`text-[10px] font-mono ${headlinerSlots.datePlace.length >= 45 ? 'text-red-500 font-bold' : textSubtle}`}>
                        {headlinerSlots.datePlace.length}/45
                      </span>
                    </div>
                    <input
                      type="text"
                      maxLength={45}
                      value={headlinerSlots.datePlace}
                      onChange={(e) => {
                        const val = e.target.value.slice(0, 45);
                        setInput((prev) => {
                          const nextSlots = { ...(prev.headlinerEventSlots || {}), datePlace: val };
                          const next: EventInput = {
                            ...prev,
                            headlinerEventSlots: nextSlots as HeadlinerEventSlots,
                            datePlace: val,
                            date: val,
                            venue: val,
                          };
                          inputRef.current = next;
                          saveImmediateToLocalStorage(next);
                          return next;
                        });
                      }}
                      placeholder="ex: SAMEDI 24 OCTOBRE // CLUB VISION ROOM"
                      className={`w-full ${inputBg} border ${borderColor} rounded-lg px-3 py-2 text-xs font-mono uppercase outline-none focus:border-zinc-500 ${isDayMode ? 'text-zinc-900 placeholder:text-zinc-400' : 'text-zinc-100'}`}
                    />
                  </div>

                  {/* Input 4 : Mention Billetterie / CTA (Optionnel) */}
                  <div className={`p-3 rounded-xl border ${borderColor} ${innerBg} space-y-1.5 transition-all hover:border-zinc-400`}>
                    <div className="flex items-center justify-between">
                      <label className={`text-[10px] font-mono font-bold uppercase flex items-center gap-1.5 ${isDayMode ? 'text-zinc-900' : 'text-emerald-400'}`}>
                        <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block shrink-0" />
                        <span>Mention Billetterie / CTA (Optionnel)</span>
                      </label>
                      <span className={`text-[10px] font-mono ${(headlinerSlots.ticketCta || '').length >= 30 ? 'text-red-500 font-bold' : textSubtle}`}>
                        {(headlinerSlots.ticketCta || '').length}/30
                      </span>
                    </div>
                    <input
                      type="text"
                      maxLength={30}
                      value={headlinerSlots.ticketCta || ''}
                      onChange={(e) => {
                        const val = e.target.value.slice(0, 30);
                        setInput((prev) => {
                          const nextSlots = { ...(prev.headlinerEventSlots || {}), ticketCta: val };
                          const next: EventInput = {
                            ...prev,
                            headlinerEventSlots: nextSlots as HeadlinerEventSlots,
                            ticketCta: val,
                          };
                          inputRef.current = next;
                          saveImmediateToLocalStorage(next);
                          return next;
                        });
                      }}
                      placeholder="ex: BILLETTERIE DISPONIBLE"
                      className={`w-full ${inputBg} border ${borderColor} rounded-lg px-3 py-2 text-xs font-mono uppercase outline-none focus:border-zinc-500 ${isDayMode ? 'text-zinc-900 placeholder:text-zinc-400' : 'text-emerald-300'}`}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 2c. Formulaire Drop Minimal */}
            {activeLayoutTemplate === 'minimal_brand' && (
              <div className="space-y-3 animate-fadeIn">
                <div className="space-y-2.5">
                  {/* Input 1 : Nom de Marque / Collectif */}
                  <div className={`p-3 rounded-xl border ${borderColor} ${innerBg} space-y-1.5 transition-all hover:border-zinc-400`}>
                    <div className="flex items-center justify-between">
                      <label className={`text-[10px] font-mono font-bold uppercase flex items-center gap-1.5 ${isDayMode ? 'text-zinc-900' : 'text-zinc-300'}`}>
                        <span className={`w-2 h-2 rounded-full inline-block shrink-0 ${isDayMode ? 'bg-zinc-800' : 'bg-white'}`} />
                        <span>Nom de Marque / Collectif</span>
                        <span className={`${textSubtle} font-normal hidden sm:inline`}>(Aligné gauche • Grand interlettrage)</span>
                      </label>
                      <span className={`text-[10px] font-mono ${minimalSlots.brandName.length >= 35 ? 'text-red-500 font-bold' : textSubtle}`}>
                        {minimalSlots.brandName.length}/35
                      </span>
                    </div>
                    <input
                      type="text"
                      maxLength={35}
                      value={minimalSlots.brandName}
                      onChange={(e) => {
                        const val = e.target.value.slice(0, 35);
                        setInput((prev) => {
                          const nextSlots = { ...(prev.minimalBrandSlots || {}), brandName: val };
                          const next: EventInput = {
                            ...prev,
                            minimalBrandSlots: nextSlots as MinimalBrandSlots,
                            brandName: val,
                            eventName: val,
                            djName: val,
                          };
                          inputRef.current = next;
                          saveImmediateToLocalStorage(next);
                          return next;
                        });
                      }}
                      placeholder="ex: SIGNAID STUDIO"
                      className={`w-full ${inputBg} border ${borderColor} rounded-lg px-3 py-2 text-xs font-mono font-bold uppercase outline-none focus:border-zinc-500 ${isDayMode ? 'text-zinc-900 placeholder:text-zinc-400' : 'text-zinc-100'}`}
                    />
                  </div>

                  {/* Input 2 : Slogan / Manifeste */}
                  <div className={`p-3 rounded-xl border ${borderColor} ${innerBg} space-y-1.5 transition-all hover:border-zinc-400`}>
                    <div className="flex items-center justify-between">
                      <label className={`text-[10px] font-mono font-bold uppercase flex items-center gap-1.5 ${isDayMode ? 'text-zinc-900' : 'text-zinc-300'}`}>
                        <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block shrink-0" />
                        <span>Slogan / Manifeste</span>
                        <span className={`${textSubtle} font-normal hidden sm:inline`}>(Typographie fine • Ex: L'IMPACT VISUEL SANS CONCESSION)</span>
                      </label>
                      <span className={`text-[10px] font-mono ${minimalSlots.tagline.length >= 50 ? 'text-red-500 font-bold' : textSubtle}`}>
                        {minimalSlots.tagline.length}/50
                      </span>
                    </div>
                    <input
                      type="text"
                      maxLength={50}
                      value={minimalSlots.tagline}
                      onChange={(e) => {
                        const val = e.target.value.slice(0, 50);
                        setInput((prev) => {
                          const nextSlots = { ...(prev.minimalBrandSlots || {}), tagline: val };
                          const next: EventInput = {
                            ...prev,
                            minimalBrandSlots: nextSlots as MinimalBrandSlots,
                            tagline: val,
                            punchline: val,
                            headerTagline: val,
                          };
                          inputRef.current = next;
                          saveImmediateToLocalStorage(next);
                          return next;
                        });
                      }}
                      placeholder="ex: L'IMPACT VISUEL SANS CONCESSION"
                      className={`w-full ${inputBg} border ${borderColor} rounded-lg px-3 py-2 text-xs font-mono uppercase outline-none focus:border-zinc-500 ${isDayMode ? 'text-zinc-900 placeholder:text-zinc-400' : 'text-zinc-100'}`}
                    />
                  </div>

                  {/* Input 3 : Mention Stand Merch / Collection */}
                  <div className={`p-3 rounded-xl border ${borderColor} ${innerBg} space-y-1.5 transition-all hover:border-zinc-400`}>
                    <div className="flex items-center justify-between">
                      <label className={`text-[10px] font-mono font-bold uppercase flex items-center gap-1.5 ${isDayMode ? 'text-zinc-900' : 'text-emerald-400'}`}>
                        <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block shrink-0" />
                        <span>Drop Merch Officiel / Collection</span>
                        <span className={`${textSubtle} font-normal hidden sm:inline`}>(Ex: MERCH OFFICIEL 2026)</span>
                      </label>
                      <span className={`text-[10px] font-mono ${minimalSlots.releaseDate.length >= 35 ? 'text-red-500 font-bold' : textSubtle}`}>
                        {minimalSlots.releaseDate.length}/35
                      </span>
                    </div>
                    <input
                      type="text"
                      maxLength={35}
                      value={minimalSlots.releaseDate}
                      onChange={(e) => {
                        const val = e.target.value.slice(0, 35);
                        setInput((prev) => {
                          const nextSlots = { ...(prev.minimalBrandSlots || {}), releaseDate: val };
                          const next: EventInput = {
                            ...prev,
                            minimalBrandSlots: nextSlots as MinimalBrandSlots,
                            releaseDate: val,
                            date: val,
                          };
                          inputRef.current = next;
                          saveImmediateToLocalStorage(next);
                          return next;
                        });
                      }}
                      placeholder="ex: COLLECTION AUTOMNE 2026"
                      className={`w-full ${inputBg} border ${borderColor} rounded-lg px-3 py-2 text-xs font-mono uppercase outline-none focus:border-zinc-500 ${isDayMode ? 'text-zinc-900 placeholder:text-zinc-400' : 'text-emerald-300'}`}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* SmartLink Public & Déploiement */}
            {(() => {
              const eventSlug = resolveUnifiedEventSlug(input);
              const publicHubUrl = `https://signaid.eu/hub/${eventSlug}`;
              return (
                <div className={`p-3 rounded-xl ${isDayMode ? 'bg-zinc-50 border-zinc-200 shadow-xs' : 'bg-zinc-900 border-zinc-800 shadow-sm'} border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 text-xs font-mono`}>
                  <div className="min-w-0 flex-1 overflow-hidden">
                    <span className={`${textSubtle} block text-[9px] uppercase font-bold`}>Lien SmartLink Public :</span>
                    <span className={`font-bold truncate block ${isDayMode ? 'text-zinc-900' : 'text-lime-400'}`}>{publicHubUrl}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={`/customizer/${eventSlug}`}
                      className={`px-3 py-1.5 font-bold font-mono text-xs rounded-lg transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 ${
                        isDayMode
                          ? 'bg-zinc-900 text-white hover:bg-zinc-800'
                          : 'bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/40'
                      }`}
                      title="Ouvrir le Customizer Merch Textile DTF pour ce projet"
                    >
                      <Shirt className={`w-3.5 h-3.5 ${isDayMode ? 'text-white' : 'text-purple-400'}`} />
                      <span>Customizer Merch</span>
                    </a>
                    <button
                      type="button"
                      onClick={handleOpenHubWithSync}
                      disabled={isOpeningHub}
                      className={`px-3 py-1.5 font-bold font-mono text-xs rounded-lg transition flex items-center gap-1.5 cursor-pointer disabled:opacity-60 shadow-xs active:scale-95 ${
                        isDayMode
                          ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border border-zinc-300'
                          : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
                      }`}
                      title="Synchroniser immédiatement vers Firestore et ouvrir le SmartLink Officiel"
                    >
                      {isOpeningHub ? (
                        <>
                          <Loader2 className={`w-3.5 h-3.5 animate-spin ${isDayMode ? 'text-zinc-800' : 'text-lime-400'}`} />
                          <span className={isDayMode ? 'text-zinc-800' : 'text-lime-400'}>Synchronisation...</span>
                        </>
                      ) : (
                        <>
                          <ExternalLink className={`w-3.5 h-3.5 ${isDayMode ? 'text-zinc-600' : 'text-zinc-400'}`} />
                          <span>Voir mon SmartLink</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={handleFinalActionClick}
                      className="px-3 py-1.5 bg-lime-400 hover:bg-lime-300 text-zinc-950 font-black font-mono text-xs rounded-lg transition flex items-center gap-1.5 shadow-md shadow-lime-400/20 active:scale-95 cursor-pointer focus-visible:ring-2 focus-visible:ring-lime-400 focus-visible:outline-none"
                    >
                      <Zap className="w-3.5 h-3.5 fill-black" />
                      <span>Mettre en Ligne mon Événement &amp; Merch</span>
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {renderInlinePreviewThumbnail('textSizes')}

      {/* 6. PACK MARKETING & TEXTES RÉSEAUX */}
      <div ref={section7Ref} className={`${cardBg} rounded-2xl p-4 space-y-3 ${effectiveStepIndex === 5 ? `block ${mobileStepTransitionClass} min-[920px]:animate-none` : 'hidden min-[920px]:block'}`}>
        <div
          onClick={() => toggleSection('marketing')}
          className="flex items-center justify-between cursor-pointer select-none"
        >
          <div className="flex items-center gap-2 text-left">
            <div className={`p-1.5 rounded-lg border shrink-0 ${isDayMode ? 'bg-zinc-100 text-zinc-800 border-zinc-300' : 'bg-lime-400/10 text-lime-400 border-lime-400/20'}`}>
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className={`text-xs font-bold font-mono uppercase tracking-wider ${isDayMode ? 'text-zinc-900' : 'text-white'}`}>
                <span>6. Pack Promo Événement &amp; Stand Merch</span>
                {activeSection === 'marketing' ? (
                  <ChevronUp className="w-3.5 h-3.5 text-zinc-400 ml-1 inline" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-zinc-400 ml-1 inline" />
                )}
              </h3>
              <p className={`text-[9px] font-mono ${textSubtle}`}>
                Génération assistée par IA de posts Instagram, DM promoteurs, hashtags et relances pour booster votre billetterie et votre stand merch virtuel
              </p>
            </div>
          </div>
          <span className={`px-2 py-0.5 rounded-full border text-[9px] font-mono font-bold shrink-0 ${isDayMode ? 'bg-zinc-100 text-zinc-800 border-zinc-300' : 'bg-lime-400/10 border-lime-400/30 text-lime-400'}`}>
            OFFERT
          </span>
        </div>

        {activeSection === 'marketing' && (
          <div className={`pt-3 border-t ${borderColor} space-y-4 animate-fadeIn`} onClick={(e) => e.stopPropagation()}>
            {/* Zone d'amorce / Action */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-mono font-bold uppercase tracking-wider ${textSubtle}`}>
                    Ton &amp; Angle Éditorial
                  </span>
                  <span className={`text-[9px] font-mono font-bold ${isDayMode ? 'text-zinc-900' : 'text-lime-400'}`}>
                    {MARKETING_TONE_OPTIONS.find((t) => t.key === selectedMarketingTone)?.subtitle}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {MARKETING_TONE_OPTIONS.map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setSelectedMarketingTone(opt.key)}
                      className={`py-2 px-2 rounded-xl border text-[11px] font-mono font-bold transition flex items-center justify-center gap-1.5 cursor-pointer focus-visible:ring-2 focus-visible:ring-lime-400 focus-visible:outline-none ${
                        selectedMarketingTone === opt.key
                          ? (isDayMode ? 'bg-zinc-900 text-white border-zinc-900 shadow-xs font-bold' : 'bg-lime-400 text-black border-lime-400 shadow-sm font-black')
                          : (isDayMode ? 'bg-zinc-100 text-zinc-800 border-zinc-300 hover:bg-zinc-200 font-medium' : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-zinc-700')
                      }`}
                    >
                      {opt.key === 'official' && <FileText className="w-3.5 h-3.5 shrink-0" />}
                      {opt.key === 'teaser' && <Clock className="w-3.5 h-3.5 shrink-0" />}
                      {opt.key === 'urgent' && <Flame className="w-3.5 h-3.5 shrink-0" />}
                      {opt.key === 'story' && <Sparkles className="w-3.5 h-3.5 shrink-0" />}
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                disabled={isGeneratingMarketing}
                onClick={handleGenerateMarketingPack}
                className="w-full py-2.5 px-4 rounded-xl font-black text-xs font-mono uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer shadow-md bg-lime-400 hover:bg-lime-300 text-zinc-950 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGeneratingMarketing ? (
                  <Loader2 className="w-4 h-4 animate-spin text-zinc-950" />
                ) : (
                  <Sparkles className="w-4 h-4 text-zinc-950" />
                )}
                <span>GÉNÉRER TEXTES, HASHTAGS &amp; DM</span>
              </button>
            </div>

            {/* Zone de résultats générés (Conditionnelle si des textes existent) */}
            {marketingData && (
              <div className="space-y-3 pt-2 animate-fadeIn">
                {/* Onglets rapides */}
                <div className={`flex items-center gap-1.5 p-1 rounded-xl ${innerBg} border ${borderColor} text-xs font-mono overflow-x-auto`}>
                  <button
                    type="button"
                    onClick={() => setActiveMarketingTab('post')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap text-[11px] ${
                      activeMarketingTab === 'post'
                        ? (isDayMode ? 'bg-zinc-900 text-white shadow-xs font-bold' : 'bg-lime-400 text-black shadow-sm font-black')
                        : (isDayMode ? 'text-zinc-600 hover:text-zinc-900' : `${textMuted} hover:text-white`)
                    }`}
                  >
                    <Instagram className="w-3.5 h-3.5" />
                    <span>Post Réseaux</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveMarketingTab('hashtags')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap text-[11px] ${
                      activeMarketingTab === 'hashtags'
                        ? (isDayMode ? 'bg-zinc-900 text-white shadow-xs font-bold' : 'bg-lime-400 text-black shadow-sm font-black')
                        : (isDayMode ? 'text-zinc-600 hover:text-zinc-900' : `${textMuted} hover:text-white`)
                    }`}
                  >
                    <Hash className="w-3.5 h-3.5" />
                    <span>Hashtags</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveMarketingTab('dm')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap text-[11px] ${
                      activeMarketingTab === 'dm'
                        ? (isDayMode ? 'bg-zinc-900 text-white shadow-xs font-bold' : 'bg-lime-400 text-black shadow-sm font-black')
                        : (isDayMode ? 'text-zinc-600 hover:text-zinc-900' : `${textMuted} hover:text-white`)
                    }`}
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>DM Promoteur</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveMarketingTab('all')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap text-[11px] ${
                      activeMarketingTab === 'all'
                        ? (isDayMode ? 'bg-zinc-900 text-white shadow-xs font-bold' : 'bg-lime-400 text-black shadow-sm font-black')
                        : (isDayMode ? 'text-zinc-600 hover:text-zinc-900' : `${textMuted} hover:text-white`)
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Tout Afficher</span>
                  </button>
                </div>

                {/* 1. POST RÉSEAUX SOCIAUX (Instagram / Facebook) */}
                {(activeMarketingTab === 'post' || activeMarketingTab === 'all') && marketingData.caption && (
                  <div className={`${innerBg} border ${borderColor} rounded-2xl p-3.5 space-y-2`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-1 rounded-lg bg-pink-500/10 text-pink-500 border border-pink-500/20">
                          <Instagram className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <span className={`text-xs font-bold font-mono uppercase tracking-wider block ${isDayMode ? 'text-zinc-900' : 'text-white'}`}>
                            Post Réseaux Sociaux (Instagram / Facebook)
                          </span>
                          <span className={`text-[9px] font-mono ${textSubtle} block`}>
                            Texte accrocheur avec émojis et call-to-action vers le Hub
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyMarketingText(marketingData.caption || '', 'caption')}
                        className={`text-[10px] font-mono flex items-center gap-1.5 transition px-2.5 py-1 rounded-lg border cursor-pointer ${
                          isDayMode
                            ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border-zinc-300 font-medium'
                            : 'text-lime-400 hover:text-lime-300 bg-lime-400/10 hover:bg-lime-400/20 border-lime-400/30'
                        }`}
                      >
                        {copiedMarketingKey === 'caption' ? <Check className="w-3 h-3 stroke-[2.5]" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedMarketingKey === 'caption' ? 'Copié !' : 'Copier'}</span>
                      </button>
                    </div>
                    <div className={`p-3 ${inputBg} border ${borderColor} rounded-xl text-xs font-sans whitespace-pre-line leading-relaxed select-all ${isDayMode ? 'text-zinc-800' : 'text-zinc-200'}`}>
                      {marketingData.caption}
                    </div>
                  </div>
                )}

                {/* 2. HASHTAGS OPTIMISÉS */}
                {(activeMarketingTab === 'hashtags' || activeMarketingTab === 'all') && marketingData.hashtags && marketingData.hashtags.length > 0 && (
                  <div className={`${innerBg} border ${borderColor} rounded-2xl p-3.5 space-y-2.5`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`p-1 rounded-lg border ${isDayMode ? 'bg-zinc-100 text-zinc-800 border-zinc-300' : 'bg-lime-400/10 text-lime-400 border-lime-400/20'}`}>
                          <Hash className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <span className={`text-xs font-bold font-mono uppercase tracking-wider block ${isDayMode ? 'text-zinc-900' : 'text-white'}`}>
                            Hashtags Optimisés
                          </span>
                          <span className={`text-[9px] font-mono ${textSubtle} block`}>
                            Grappe de tags calibrés selon le style musical et la ville
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyMarketingText((marketingData.hashtags || []).join(' '), 'hashtags')}
                        className={`text-[10px] font-mono flex items-center gap-1.5 transition px-2.5 py-1 rounded-lg border cursor-pointer ${
                          isDayMode
                            ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border-zinc-300 font-medium'
                            : 'text-lime-400 hover:text-lime-300 bg-lime-400/10 hover:bg-lime-400/20 border-lime-400/30'
                        }`}
                      >
                        {copiedMarketingKey === 'hashtags' ? <Check className="w-3.5 h-3.5 stroke-[2.5]" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedMarketingKey === 'hashtags' ? 'Copié !' : 'Tout copier'}</span>
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {marketingData.hashtags.map((tag, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleCopyMarketingText(tag, `tag-${idx}`)}
                          title="Cliquer pour copier ce hashtag"
                          className={`px-2.5 py-1 rounded-lg border text-[10px] font-mono font-medium transition cursor-pointer flex items-center gap-1 ${
                            copiedMarketingKey === `tag-${idx}`
                              ? (isDayMode ? 'bg-zinc-900 text-white border-zinc-900 font-bold' : 'bg-lime-400 text-black border-lime-400 font-bold')
                              : (isDayMode ? 'bg-white hover:bg-zinc-100 text-zinc-800 border-zinc-300' : `${inputBg} hover:border-lime-400/50`)
                          }`}
                        >
                          <span>{tag}</span>
                          {copiedMarketingKey === `tag-${idx}` && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. DM / MESSAGE PROMOTEUR / WHATSAPP */}
                {(activeMarketingTab === 'dm' || activeMarketingTab === 'all') && marketingData.dmInvitation && (
                  <div className={`${innerBg} border ${borderColor} rounded-2xl p-3.5 space-y-2`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-1 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                          <MessageCircle className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <span className={`text-xs font-bold font-mono uppercase tracking-wider block ${isDayMode ? 'text-zinc-900' : 'text-white'}`}>
                            DM / Message Promoteur / WhatsApp
                          </span>
                          <span className={`text-[9px] font-mono ${textSubtle} block`}>
                            Message direct court prêt à envoyer aux organisateurs ou collectifs
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyMarketingText(marketingData.dmInvitation || '', 'dm')}
                        className={`text-[10px] font-mono flex items-center gap-1.5 transition px-2.5 py-1 rounded-lg border cursor-pointer ${
                          isDayMode
                            ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border-zinc-300 font-medium'
                            : 'text-lime-400 hover:text-lime-300 bg-lime-400/10 hover:bg-lime-400/20 border-lime-400/30'
                        }`}
                      >
                        {copiedMarketingKey === 'dm' ? <Check className="w-3.5 h-3.5 stroke-[2.5]" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedMarketingKey === 'dm' ? 'Copié !' : 'Copier'}</span>
                      </button>
                    </div>
                    <div className={`p-3 ${inputBg} border ${borderColor} rounded-xl text-xs font-sans whitespace-pre-line leading-relaxed select-all ${isDayMode ? 'text-zinc-800' : 'text-zinc-200'}`}>
                      {marketingData.dmInvitation}
                    </div>
                  </div>
                )}

                {/* PUNCHLINES CLÉS (SI PRÉSENTES) */}
                {marketingData.punchlines && marketingData.punchlines.length > 0 && (activeMarketingTab === 'post' || activeMarketingTab === 'all') && (
                  <div className={`${innerBg} border ${borderColor} rounded-2xl p-3.5 space-y-2`}>
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded-lg bg-sky-500/10 text-sky-500 border border-sky-500/20">
                        <Send className="w-3.5 h-3.5" />
                      </div>
                      <span className={`text-xs font-bold font-mono uppercase tracking-wider block ${isDayMode ? 'text-zinc-900' : 'text-white'}`}>
                        Punchlines Clés
                      </span>
                    </div>
                    <div className="grid grid-cols-1 gap-1.5 pt-1">
                      {marketingData.punchlines.map((p, idx) => (
                        <div
                          key={idx}
                          onClick={() => handleCopyMarketingText(p, `p-${idx}`)}
                          className={`p-2.5 ${inputBg} border ${borderColor} rounded-xl text-xs flex items-center justify-between cursor-pointer hover:border-zinc-400 transition ${isDayMode ? 'text-zinc-800' : 'text-zinc-200'}`}
                        >
                          <span className="font-mono">« {p} »</span>
                          <span className={`text-[10px] font-mono flex items-center gap-1 shrink-0 ml-2 ${textSubtle}`}>
                            {copiedMarketingKey === `p-${idx}` ? (
                              <span className={`font-bold flex items-center gap-1 ${isDayMode ? 'text-emerald-700' : 'text-lime-400'}`}>
                                <Check className="w-3 h-3 stroke-[3]" /> Copié !
                              </span>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" /> Copier
                              </>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* --- BLOC FINAL D'ACTIVATION & DÉPLOIEMENT DU PORTAIL --- */}
            <div className={`mt-4 pt-4 border-t ${borderColor} space-y-3`}>
              <div className={`p-4 rounded-2xl space-y-2.5 ${
                isDayMode
                  ? 'bg-zinc-50 border-2 border-zinc-900 shadow-sm'
                  : 'bg-zinc-900/90 border-2 border-lime-400/50 shadow-[0_0_30px_rgba(57,255,20,0.15)]'
              }`}>
                <div className="flex items-center justify-between">
                  <span className={`inline-block px-2.5 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${
                    isDayMode
                      ? 'bg-zinc-900 text-white border-zinc-900'
                      : 'bg-lime-400/10 border-lime-400/30 text-lime-400 font-mono font-black'
                  }`}>
                    ✦ PRÊT AU DÉPLOIEMENT
                  </span>
                  <span className={`text-[10px] font-mono font-bold ${textSubtle}`}>Étape 6 / 6</span>
                </div>
                <h4 className={`text-sm font-black uppercase tracking-tight ${isDayMode ? 'text-zinc-900' : 'text-white'}`}>
                  Votre événement &amp; stand merch sont finalisés
                </h4>
                <p className={`text-xs font-mono leading-relaxed ${textSubtle}`}>
                  Activez votre SmartLink officiel, mettez en ligne votre stand merch virtuel sans avance de trésorerie et lancez vos visuels promo.
                </p>
                <div className="pt-1 flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={handleFinalActionClick}
                    className="flex-1 py-3.5 px-4 rounded-xl bg-lime-400 hover:bg-lime-300 text-zinc-950 font-black font-mono text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-lime-400/25 active:scale-98 transition cursor-pointer focus-visible:ring-2 focus-visible:ring-lime-400 focus-visible:outline-none"
                  >
                    <Zap className="w-4 h-4 fill-black text-black shrink-0" />
                    <span>Mettre en Ligne mon Événement &amp; Merch</span>
                    <ArrowRight className="w-4 h-4 stroke-[2.5] shrink-0" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Onglet noir d'accès rapide sur le flanc droit (Mobile uniquement) */}
      <button
        type="button"
        onClick={() => setIsMobilePreviewOpen(true)}
        className="fixed right-0 top-1/2 -translate-y-1/2 z-40 min-[920px]:hidden flex items-center gap-1.5 py-3 px-1.5 bg-zinc-900/90 text-white rounded-l-xl shadow-2xl border-l border-y border-white/20 backdrop-blur-md cursor-pointer select-none active:scale-95 transition-transform"
        style={{ writingMode: 'vertical-rl' }}
      >
        <Eye className="w-4 h-4 text-lime-400 rotate-90" />
        <span className="font-mono text-[10px] tracking-widest uppercase">Aperçu Visuel</span>
      </button>

      {/* --- BARRE DE NAVIGATION PERSISTANTE EN BAS DU PANNEAU (MOBILE < 920px) --- */}
      <div
        className={`min-[920px]:hidden ${isTyping ? 'hidden' : 'block'} fixed bottom-0 inset-x-0 z-30 ${isDayMode ? 'bg-white/95 border-zinc-200' : 'bg-zinc-950/95 border-zinc-800'
          } backdrop-blur-md border-t px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-2xl select-none`}
      >
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          <button
            type="button"
            onClick={() => {
              goToMobileStep(effectiveStepIndex - 1);
              scrollToTop();
            }}
            disabled={effectiveStepIndex === 0}
            className={`flex-1 py-3 px-3 rounded-xl border text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-95 disabled:opacity-25 disabled:pointer-events-none min-h-[44px] touch-manipulation ${
              isDayMode
                ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border-zinc-300 font-medium'
                : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-800 hover:border-zinc-700'
            }`}
            aria-label="Étape précédente"
          >
            <ChevronLeft className="w-4 h-4 shrink-0" />
            <span>Précédent</span>
          </button>

          {effectiveStepIndex === MOBILE_STEPS.length - 1 ? (
            <button
              type="button"
              onClick={handleFinalActionClick}
              className="flex-[1.4] py-3 px-3 rounded-xl bg-lime-400 hover:bg-lime-300 text-zinc-950 font-black font-mono text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-95 shadow-lg shadow-lime-400/25 min-h-[44px] touch-manipulation focus-visible:ring-2 focus-visible:ring-lime-400"
            >
              <Zap className="w-3.5 h-3.5 fill-black shrink-0" />
              <span>Mettre en Ligne mon Événement &amp; Merch</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5] shrink-0" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                goToMobileStep(effectiveStepIndex + 1);
                scrollToTop();
              }}
              className="flex-[1.4] py-3 px-3 rounded-xl bg-lime-400 hover:bg-lime-300 text-zinc-950 font-black shadow-lg shadow-lime-400/25 font-mono text-xs flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-95 min-h-[44px] touch-manipulation focus-visible:ring-2 focus-visible:ring-lime-400"
              aria-label="Étape suivante"
            >
              <span>Suivant</span>
              <ChevronRight className="w-4 h-4 shrink-0" />
            </button>
          )}
        </div>
      </div>

      {/* OVERLAY HOLD-TO-PREVIEW MOBILE SUR CURSEUR (LIVE SCRUBBING) */}
      {
        isLiveScrubbing && (
          <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center p-4 pointer-events-none select-none animate-fadeIn min-[920px]:hidden">
            {/* Cadre de l'affiche en direct */}
            <div
              onContextMenu={(e) => e.preventDefault()}
              className={`relative rounded-2xl overflow-hidden border-2 border-lime-400 shadow-2xl transition-all select-none -webkit-touch-callout-none ${getFormatAspectClass(previewFormat)}`}
              style={{
                WebkitTouchCallout: 'none',
                WebkitUserSelect: 'none',
                userSelect: 'none',
                aspectRatio: formatStyle.aspectRatio,
                maxHeight: '62vh',
                maxWidth: '85vw',
                width: `min(85vw, calc(62vh * (${formatStyle.aspectRatio})))`,
                backgroundColor: canvasBgColor,
              }}
            >
              <div
                data-poster-container="true"
                onContextMenu={(e) => e.preventDefault()}
                className="@container w-full h-full relative overflow-hidden select-none -webkit-touch-callout-none"
                style={{
                  containerType: isBanner ? 'size' : 'inline-size',
                  WebkitTouchCallout: 'none',
                  WebkitUserSelect: 'none',
                  userSelect: 'none',
                }}
              >
                {renderFlyerPreview(previewFormat)}
              </div>
            </div>

            {/* Indication visuelle discrète sous l'affiche */}
            <div className="mt-4 px-3 py-1 rounded-full bg-lime-400 text-black font-mono font-black text-[11px] shadow-lg animate-pulse">
              {liveScrubData ? `${liveScrubData.label} : ${liveScrubData.value}` : 'Ajustement en direct...'}
            </div>
          </div>
        )
      }

      {/* Modal Demande Spéciale / Retouche IA */}
      <AiAdjustmentModal
        isOpen={isAdjustmentModalOpen}
        onClose={() => setIsAdjustmentModalOpen(false)}
        currentImage={activeView === 'dos' ? input.tshirtPreviewImages?.back : input.tshirtPreviewImages?.front}
        side={activeView === 'dos' ? 'back' : 'front'}
        onApplyAdjustment={handleApplyAdjustment}
        isApplying={isApplyingAdjustment}
      />

      {/* Modale de verrouillage au déploiement (AuthGateModal) */}
      <AuthGateModal
        isOpen={showAuthGateModal}
        onClose={() => setShowAuthGateModal(false)}
        onGoogleSignIn={handleGoogleSignInAndDeploy}
        onOpenEmailAuth={openEmailAuthModal}
        isSubmitting={isDeployingGate}
      />
      {/* Modale d'authentification Email */}
      <AuthModal
        isOpen={showEmailAuthModal}
        onClose={() => setShowEmailAuthModal(false)}
        onSuccess={handleEmailAuthSuccess}
        onDeploy={async (loggedUser) => {
          await executePortalDeployment(loggedUser?.uid ? `proj_${loggedUser.uid}` : undefined);
        }}
        isDayMode={isDayMode}
      />

      {/* Modale d'offre finale : Pack d'Activation Physique (500 flyers avec QR code) */}
      <ActivationPackCheckoutModal
        isOpen={showActivationPackModal}
        onClose={() => setShowActivationPackModal(false)}
        currentProjectId={deployedProjectId || (input as any).id || input.projectId || 'draft_project'}
        currentEventSlug={deployedEventSlug || 'portail-interactif-signaid'}
      />

      {/* MODALE / LIGHTBOX PLEIN ÉCRAN HAUTE RÉSOLUTION (STANDALONE MOBILE) */}
      {
        !propSetIsMobilePreviewOpen && localMobilePreviewOpen && (
          <div
            className="fixed inset-0 z-50 min-[920px]:hidden bg-black/95 backdrop-blur-xl flex flex-col p-3 sm:p-4 select-none animate-fadeIn"
            role="dialog"
            aria-modal="true"
          >
            {/* En-tête avec bouton de fermeture (X) très clair */}
            <div className="flex justify-between items-center pb-2.5 pt-1 px-1 border-b border-zinc-800/80 shrink-0 select-none">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-lime-400/10 text-lime-400 border border-lime-400/20 text-[10px] font-mono font-bold uppercase tracking-wider">
                  Haute Résolution
                </span>
                <span className="font-mono text-xs text-zinc-300 uppercase font-semibold hidden xs:inline">
                  {previewFormat === 'banner' ? 'Bannière' : (FORMAT_LABELS[previewFormat] || previewFormat.toUpperCase())}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setIsMobilePreviewOpen(false)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-white border border-white/20 hover:border-lime-400 shadow-xl transition-all cursor-pointer font-mono text-xs font-bold group"
                aria-label="Fermer le plein écran et revenir aux réglages"
              >
                <span className="text-[11px] text-zinc-200">Retour Réglages</span>
                <div className="w-5 h-5 rounded-full bg-lime-400 text-black flex items-center justify-center font-black group-hover:scale-110 transition-transform">
                  <X className="w-3.5 h-3.5 stroke-[2.5]" />
                </div>
              </button>
            </div>

            {/* Sélecteur de format rapide dans le plein écran */}
            <div className="px-2 py-2 border-b border-zinc-800/60 bg-zinc-900/40 shrink-0 flex items-center justify-center overflow-x-auto">
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono">
                {(['post', 'story', 'banner', 'a3'] as const).map((fmt) => (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => onSelectFormat?.(fmt)}
                    className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${previewFormat === fmt
                      ? 'bg-zinc-800 text-white shadow-sm font-black'
                      : 'text-zinc-400 hover:text-white'
                      }`}
                  >
                    {FORMAT_LABELS[fmt] || fmt}
                  </button>
                ))}
              </div>
            </div>

            {/* Affichage du flyer plein écran haute résolution */}
            <div
              className="flex-1 min-h-0 w-full flex items-center justify-center p-2 relative overflow-hidden bg-zinc-950/40"
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  setIsMobilePreviewOpen(false);
                }
              }}
            >
              <div
                data-poster-container="true"
                onContextMenu={(e) => e.preventDefault()}
                className="@container relative mx-auto rounded-2xl overflow-hidden border-2 border-lime-400 shadow-[0_0_35px_rgba(0,0,0,0.9)] flex items-center justify-center select-none -webkit-touch-callout-none transition-all duration-200 ease-out"
                style={{
                  aspectRatio: formatStyle.aspectRatio,
                  maxHeight: 'calc(100dvh - 160px)',
                  maxWidth: '100%',
                  width: previewFormat === 'banner'
                    ? '100%'
                    : `min(100%, calc((100dvh - 160px) * (${formatStyle.aspectRatio})))`,
                  backgroundColor: canvasBgColor,
                  containerType: isBanner ? 'size' : 'inline-size',
                  WebkitTouchCallout: 'none',
                  WebkitUserSelect: 'none',
                  userSelect: 'none',
                }}
              >
                {renderFlyerPreview(previewFormat)}
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
};