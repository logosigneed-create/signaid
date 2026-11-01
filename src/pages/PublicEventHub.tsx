/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Droppaid.ai - Page Hub Publique / SmartLink (/e/:slug) & Démo Scan Promo (/scan)
 * DÉCOUPLAGE STRICT : HUB INTERACTIF COMPLET (STANDARD) VS SÉQUENCE SCAN PROMO (CINÉMATIQUE)
 */

import React, { useEffect, useState, useRef } from 'react';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import {
  EventInput,
  getDefaultFormatTransforms,
  resolveTextScalesForFormat,
  resolveToneFilter,
  computeToneOverlay,
  resolveUnifiedEventSlug,
  sanitizeStudioText,
  ensurePosterTexts,
  PosterTextItem,
} from '../types';
import { getAutoScaledFontSize } from '../utils/fontScaler';
import { AutoFitText } from '../components/AutoFitText';
import { OverlayLogo } from '../components/OverlayLogo';
import { FlyerPosterRenderer, BASE_WIDTH, BASE_HEIGHT } from '../components/FlyerPosterRenderer';
import { creditDividend, REWARD_PUBLIC_PORTAL_VIEW } from '../utils/dividendService';
import {
  resolveActiveTextileLogo,
  resolveActiveTextileColorMode,
  clampDtfPlacement,
  getTextileLogoStyle,
  getMannequinPosition,
  resolveGarmentTemplateSrc,
} from '../utils/textileMockupUtils';
import { toPng } from 'html-to-image';
import { exportAndSaveImage, prepareNodeImagesForExport, setPngDpi, dataUrlToBlob } from '../utils/downloadHelpers';
import {
  Calendar,
  MapPin,
  ExternalLink,
  Share2,
  Music,
  Check,
  ArrowLeft,
  Shirt,
  Image as ImageIcon,
  ShoppingBag,
  X,
  CheckCircle2,
  PackageCheck,
  ShieldCheck,
  Zap,
  Globe,
  MessageCircle,
  Download,
  Link as LinkIcon,
  User,
  Ticket,
  Loader2,
} from 'lucide-react';

interface ExtendedEventData extends EventInput {
  tshirtPreviewImage?: string;
  tshirtPreviewImages?: {
    front?: string | null;
    back?: string | null;
  };
  tshirtBackCustomLogo?: string;
  tshirtBackLogoScale?: number;
  tshirtBackLogoOffsetY?: number;
  tshirtSide?: 'front' | 'back';
  garmentType?: 'tshirt' | 'hoodie';
  flyerImageUrl?: string;
  flyerRenderMode?: 'dynamic' | 'image';
  previewImages?: {
    a3?: string | null;
    post?: string | null;
    story?: string | null;
    banner?: string | null;
    [key: string]: any;
  };
}

type IntroStep =
  | 'qr_white'       // 0.0s - 0.6s : Verso blanc pur + QR code noir
  | 'qr_fade'        // 0.6s - 1.0s : Le QR code s'efface vers le blanc
  | 'decor_particles'// 1.0s - 1.5s : Le décor se matérialise par agrégation de particules
  | 'flyer_complete' // 1.5s - 2.0s : Sujet + logo + textes se verrouillent
  | 'video_playing'; // 2.0s - 10.0s : Vidéo avatar 8s en lecture intégrale


export interface PublicEventHubProps {
  slug?: string;
  shouldPlayIntro?: boolean;
  initialData?: ExtendedEventData;
  isInteractive?: boolean;
}

// Données de secours fiables et neutres (utilisées uniquement pour les champs non définis, aucun faux profil codé en dur)
const fallbackEventData: ExtendedEventData = {
  eventName: '',
  djName: '',
  venue: '',
  location: '',
  date: '',
  time: '',
  timeSlot: '',
  punchline: '',
  headerTagline: '',
  headlineBadgeText: '',
  platformBadge: 'SIGNAID.EU // WEB APP OFFICIELLE',
  artistUrl: undefined,
  artistSocialUrl: undefined,
  instagramHandle: undefined,
  venueMapsUrl: undefined,
  logoUrl: undefined,
  logoImage: undefined,
  backgroundImage: undefined,
  bgImage: undefined,
  customBackground: undefined,
  djPhoto: undefined,
  flyerImageUrl: undefined,
  previewImages: {},
  tshirtCustomLogo: undefined,
  tshirtBackCustomLogo: undefined,
  tshirtColor: 'black',
  typographyStyle: 'futur',
  accentColor: '#f2f2f2',
  backgroundTone: 0.5,
  isBackgroundToneEnabled: true,
  isSubjectHarmonized: false,
  backgroundOpacity: 0.75,
  backgroundBrightness: 1.0,
  subjectFadeIntensity: 15,
  subjectScale: 1.23,
  djPhotoScale: 1.23,
  subjectPositionY: 15,
  djPhotoOffsetY: 15,
  logoScale: 0.8,
  logoPositionX: 85.2,
  logoPositionY: 11.9,
  logoOpacity: 1,
  logoRotation: 0,
  logoColorMode: 'original',
  formatTransforms: {
    post: { scale: 1.23, offsetY: 15, alignX: 'center', isCustom: true },
    a3: { scale: 1.23, offsetY: 15, alignX: 'center', isCustom: false },
    story: { scale: 1.23, offsetY: -19, alignX: 'center', isCustom: true },
    banner: { scale: 1.28, offsetY: 29, alignX: 'center', isCustom: true },
    tshirt: { scale: 1.0, offsetY: 15, alignX: 'center', isCustom: false },
  },
  logoFormatTransforms: {
    story: { x: 51.2, y: 63.3, scale: 2.5, isCustom: true },
    banner: { x: 92.4, y: 9.4, scale: 0.85, isCustom: true },
  },
};

function enrichWithSessionVton(data: ExtendedEventData, targetSlug: string): ExtendedEventData {
  if (!data) return data;
  try {
    if (typeof sessionStorage !== 'undefined') {
      const vtonRaw = sessionStorage.getItem(`droppaid_vton_preview_images_${targetSlug}`) ||
        (data.slug ? sessionStorage.getItem(`droppaid_vton_preview_images_${data.slug}`) : null) ||
        sessionStorage.getItem('droppaid_vton_preview_images');
      if (vtonRaw) {
        const vton = JSON.parse(vtonRaw);
        if (vton && (vton.front || vton.back)) {
          data.tshirtPreviewImages = {
            front: data.tshirtPreviewImages?.front || vton.front || null,
            back: data.tshirtPreviewImages?.back || vton.back || null,
          };
          if (!data.tshirtPreviewImage) {
            data.tshirtPreviewImage = vton.front || vton.back || undefined;
          }
        }
      }
    }
  } catch {}
  return data;
}

function sanitizeHubDemoAssets(data: ExtendedEventData): ExtendedEventData {
  if (!data) return data;
  if (data.djPhoto === '/demo/artist-demo.webp') {
    delete (data as any).djPhoto;
  }
  if (data.backgroundImage === '/demo/signaid-backgroundImage.webp') {
    delete (data as any).backgroundImage;
  }
  if (data.bgImage === '/demo/signaid-backgroundImage.webp') {
    delete (data as any).bgImage;
  }
  return data;
}

function readHubLocalStorageForSlug(targetSlug: string): ExtendedEventData | null {
  if (typeof window === 'undefined' || !targetSlug) return null;
  try {
    const directKeys = [
      `droppaid_hub_event_${targetSlug}`,
      `signaid_studio_draft_${targetSlug}`,
    ];
    for (const key of directKeys) {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        const data = (parsed?.input ? { ...parsed.input, ...parsed } : parsed) as ExtendedEventData;
        return enrichWithSessionVton(sanitizeHubDemoAssets(data), targetSlug);
      }
    }

    const sharedKeys = [
      'signaid_studio_current_project',
      'droppaid_last_event_input',
      'signaid_studio_draft_active',
    ];
    for (const key of sharedKeys) {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        const unwrapped = (parsed?.input ? { ...parsed.input, ...parsed } : parsed) as ExtendedEventData;
        const itemSlug = resolveUnifiedEventSlug(unwrapped);
        if (itemSlug === targetSlug || unwrapped?.slug === targetSlug) {
          return enrichWithSessionVton(sanitizeHubDemoAssets(unwrapped), targetSlug);
        }
      }
    }
  } catch { }
  return null;
}

export const PublicEventHub: React.FC<PublicEventHubProps> = ({
  slug: propSlug,
  shouldPlayIntro: propShouldPlayIntro,
  initialData,
  isInteractive = false,
}) => {
  // 1. ISOLATION STRICTE : L'animation de scan est confinée exclusivement à /scan ou ?intro=true
  const location = typeof window !== 'undefined' ? window.location : { pathname: '', search: '', origin: 'https://signaid.eu' };
  const searchParams = new URLSearchParams(location.search);

  const shouldPlayIntro = propShouldPlayIntro === true || (
    propShouldPlayIntro === undefined && (
      location.pathname === '/scan' ||
      location.pathname.startsWith('/scan/') ||
      searchParams.get('intro') === 'true'
    )
  );

  // État initial de l'intro conditionné strictement :
  const [isPlayingIntro, setIsPlayingIntro] = useState<boolean>(shouldPlayIntro);
  const [introFading, setIntroFading] = useState<boolean>(false);

  // Détection et normalisation du slug de l'événement
  const urlSlug = typeof window !== 'undefined'
    ? decodeURIComponent(location.pathname.replace(/^\/(hub|e|event|scan)\//, '').replace(/^\/scan$/, '').replace(/^\//, '').split('/')[0])
    : '';
  const slug = (propSlug || urlSlug || 'portail-interactif-signaid')
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  // 2. DONNÉES DU PROJET & ÉCOUTE TEMPS RÉEL (FIRESTORE + LOCALSTORAGE)
  const [rawEventData, setRawEventData] = useState<ExtendedEventData | null>(() => {
    if (initialData) return initialData;
    return readHubLocalStorageForSlug(slug);
  });
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    if (initialData) return false;
    return !readHubLocalStorageForSlug(slug);
  });

  useEffect(() => {
    if (initialData) {
      setRawEventData((prev) => ({
        ...(prev || {}),
        ...initialData,
        tshirtPreviewImages: {
          front: initialData.tshirtPreviewImages?.front || initialData.tshirtPreviewImage || prev?.tshirtPreviewImages?.front || null,
          back: initialData.tshirtPreviewImages?.back || prev?.tshirtPreviewImages?.back || null,
        },
      }));
      setIsLoading(false);
    }
  }, [initialData]);

  // Synchronisation inter-onglets et temps réel via storage et événements personnalisés
  useEffect(() => {
    const handleStorageChange = () => {
      const updatedLocal = readHubLocalStorageForSlug(slug);
      if (updatedLocal) {
        setRawEventData((prev) => ({
          ...(prev || {}),
          ...updatedLocal,
        }));
        setIsLoading(false);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('signaid:project_updated', handleStorageChange);
    window.addEventListener('droppaid:hub_sync', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('signaid:project_updated', handleStorageChange);
      window.removeEventListener('droppaid:hub_sync', handleStorageChange);
    };
  }, [slug]);

  // Écoute Firestore temps réel directe et unifiée (collection 'portals' + projets/events)
  useEffect(() => {
    if (!slug) {
      setIsLoading(false);
      return;
    }

    let isCancelled = false;

    const mergeFirestoreSnapshot = (rawData: any) => {
      if (isCancelled || !rawData) return;
      const unwrapped = rawData?.input && typeof rawData.input === 'object'
        ? { ...rawData, ...rawData.input }
        : rawData;
      const data = unwrapped as ExtendedEventData;

      // Éliminer formellement les images de démo parasites
      if (data.djPhoto === '/demo/artist-demo.webp') {
        data.djPhoto = undefined;
      }
      if (data.backgroundImage === '/demo/signaid-backgroundImage.webp') {
        data.backgroundImage = undefined;
      }
      if (data.bgImage === '/demo/signaid-backgroundImage.webp') {
        data.bgImage = undefined;
      }

      setRawEventData((prev) => {
        const localFallback = readHubLocalStorageForSlug(slug);
        const localTime = localFallback && (localFallback as any).updatedAt
          ? new Date((localFallback as any).updatedAt).getTime()
          : 0;
        const remoteUpdatedAt = (data as any)?.updatedAt;
        const remoteTime = remoteUpdatedAt
          ? typeof remoteUpdatedAt.toMillis === 'function'
            ? remoteUpdatedAt.toMillis()
            : new Date(remoteUpdatedAt).getTime()
          : 0;

        // Si le projet local vient d'être modifié dans le Studio plus récemment que le snapshot Firestore,
        // on préserve prioritairement les personnalisations locales.
        const preferLocal = Boolean(localFallback && localTime > 0 && (!remoteTime || localTime >= remoteTime - 5000));
        const primarySource = preferLocal ? { ...data, ...(localFallback || {}) } : { ...(localFallback || {}), ...data };

        const resolvedBg =
          primarySource.backgroundImage !== undefined
            ? primarySource.backgroundImage
            : primarySource.bgImage !== undefined
              ? primarySource.bgImage
              : (prev?.backgroundImage ?? prev?.bgImage ?? localFallback?.backgroundImage ?? localFallback?.bgImage);
        const resolvedDj =
          primarySource.djPhoto !== undefined
            ? primarySource.djPhoto
            : (prev?.djPhoto ?? localFallback?.djPhoto);
        const resolvedLogo =
          primarySource.logoImage !== undefined
            ? primarySource.logoImage
            : primarySource.logoUrl !== undefined
              ? primarySource.logoUrl
              : (prev?.logoImage ?? prev?.logoUrl ?? localFallback?.logoImage ?? localFallback?.logoUrl);

        return {
          ...(localFallback || {}),
          ...(prev || {}),
          ...primarySource,
          formatTransforms: primarySource.formatTransforms || prev?.formatTransforms || localFallback?.formatTransforms,
          logoFormatTransforms: primarySource.logoFormatTransforms || prev?.logoFormatTransforms || localFallback?.logoFormatTransforms,
          formatTextScales: primarySource.formatTextScales || prev?.formatTextScales || localFallback?.formatTextScales,
          formatTextOffsetsY: primarySource.formatTextOffsetsY || prev?.formatTextOffsetsY || localFallback?.formatTextOffsetsY,
          formatTextOffsetsX: primarySource.formatTextOffsetsX || prev?.formatTextOffsetsX || localFallback?.formatTextOffsetsX,
          formatTextAlignments: primarySource.formatTextAlignments || prev?.formatTextAlignments || localFallback?.formatTextAlignments,
          formatTextColors: primarySource.formatTextColors || prev?.formatTextColors || localFallback?.formatTextColors,
          formatTextLineSpacing: primarySource.formatTextLineSpacing || prev?.formatTextLineSpacing || localFallback?.formatTextLineSpacing,
          posterTexts: primarySource.posterTexts || prev?.posterTexts || localFallback?.posterTexts,
          flyerConfig: primarySource.flyerConfig || prev?.flyerConfig || localFallback?.flyerConfig,
          cartoucheScale: primarySource.cartoucheScale ?? prev?.cartoucheScale ?? localFallback?.cartoucheScale,
          cartouchePadding: primarySource.cartouchePadding ?? prev?.cartouchePadding ?? localFallback?.cartouchePadding,
          titleLayerOrder: primarySource.titleLayerOrder || prev?.titleLayerOrder || localFallback?.titleLayerOrder,
          secondaryDjPhoto: primarySource.secondaryDjPhoto ?? prev?.secondaryDjPhoto ?? localFallback?.secondaryDjPhoto,
          secondarySubjectFadeIntensity: primarySource.secondarySubjectFadeIntensity ?? prev?.secondarySubjectFadeIntensity ?? localFallback?.secondarySubjectFadeIntensity,
          isSubjectHarmonized: primarySource.isSubjectHarmonized ?? prev?.isSubjectHarmonized ?? localFallback?.isSubjectHarmonized,
          subjectBlendMode: primarySource.subjectBlendMode || prev?.subjectBlendMode || localFallback?.subjectBlendMode,
          backgroundImage: resolvedBg,
          bgImage: resolvedBg,
          djPhoto: resolvedDj,
          logoImage: resolvedLogo,
          logoUrl: primarySource.logoUrl !== undefined ? primarySource.logoUrl : resolvedLogo,
          flyerImageUrl:
            primarySource.flyerImageUrl ||
            primarySource.previewImages?.a3 ||
            prev?.flyerImageUrl ||
            localFallback?.flyerImageUrl,
          previewImages: {
            ...(localFallback?.previewImages || {}),
            ...(prev?.previewImages || {}),
            ...(primarySource.previewImages || {}),
            a3:
              primarySource.previewImages?.a3 ||
              primarySource.flyerImageUrl ||
              prev?.previewImages?.a3 ||
              localFallback?.previewImages?.a3,
          },
          tshirtPreviewImages: {
            ...(localFallback?.tshirtPreviewImages || {}),
            ...(prev?.tshirtPreviewImages || {}),
            ...(primarySource.tshirtPreviewImages || {}),
          },
          tshirtBackCustomLogo:
            primarySource.tshirtBackCustomLogo !== undefined
              ? primarySource.tshirtBackCustomLogo
              : (prev?.tshirtBackCustomLogo ?? localFallback?.tshirtBackCustomLogo),
          tshirtCustomLogo:
            primarySource.tshirtCustomLogo !== undefined
              ? primarySource.tshirtCustomLogo
              : (prev?.tshirtCustomLogo ?? localFallback?.tshirtCustomLogo),
          primaryColor: (primarySource as any).primaryColor || primarySource.accentColor || prev?.accentColor,
          accentColor: primarySource.accentColor || (primarySource as any).primaryColor || prev?.accentColor,
          typographyStyle: primarySource.typographyStyle || prev?.typographyStyle,
          backgroundTone: typeof primarySource.backgroundTone === 'number' ? primarySource.backgroundTone : prev?.backgroundTone,
          isBackgroundToneEnabled: primarySource.isBackgroundToneEnabled ?? prev?.isBackgroundToneEnabled,
          backgroundOpacity: typeof primarySource.backgroundOpacity === 'number' ? primarySource.backgroundOpacity : prev?.backgroundOpacity,
          backgroundBrightness: typeof primarySource.backgroundBrightness === 'number' ? primarySource.backgroundBrightness : prev?.backgroundBrightness,
          subjectFadeIntensity: typeof primarySource.subjectFadeIntensity === 'number' ? primarySource.subjectFadeIntensity : prev?.subjectFadeIntensity,
          subjectScale: typeof primarySource.subjectScale === 'number' ? primarySource.subjectScale : prev?.subjectScale,
          djPhotoScale: typeof primarySource.djPhotoScale === 'number' ? primarySource.djPhotoScale : prev?.djPhotoScale,
          subjectPositionY: typeof primarySource.subjectPositionY === 'number' ? primarySource.subjectPositionY : prev?.subjectPositionY,
          djPhotoOffsetY: typeof primarySource.djPhotoOffsetY === 'number' ? primarySource.djPhotoOffsetY : prev?.djPhotoOffsetY,
          logoScale: typeof primarySource.logoScale === 'number' ? primarySource.logoScale : prev?.logoScale,
          logoPositionX: typeof primarySource.logoPositionX === 'number' ? primarySource.logoPositionX : prev?.logoPositionX,
          logoPositionY: typeof primarySource.logoPositionY === 'number' ? primarySource.logoPositionY : prev?.logoPositionY,
          logoOpacity: typeof primarySource.logoOpacity === 'number' ? primarySource.logoOpacity : prev?.logoOpacity,
          logoRotation: typeof primarySource.logoRotation === 'number' ? primarySource.logoRotation : prev?.logoRotation,
          logoColorMode: primarySource.logoColorMode || prev?.logoColorMode,
        } as ExtendedEventData;
      });
      setIsLoading(false);
    };

    const slugsToWatch = Array.from(new Set([
      slug,
      ...(slug === 'portail-interactif-signaid' ? ['signaid'] : []),
    ]));

    let foundInFirestore = false;
    const unsubscribes: Array<() => void> = [];

    // Priorité 1 : Collection unifiée 'portals' (recommandation d'architecture stricte)
    for (const targetSlug of slugsToWatch) {
      const portalDocRef = doc(db, 'portals', targetSlug);
      unsubscribes.push(
        onSnapshot(
          portalDocRef,
          (docSnap) => {
            if (docSnap.exists()) {
              foundInFirestore = true;
              mergeFirestoreSnapshot(docSnap.data());
            }
            setIsLoading(false);
          },
          (err) => {
            console.warn('[LiveHub] Erreur écoute collection portals:', err);
            setIsLoading(false);
          }
        )
      );

      // Collections de rétro-compatibilité : 'projects' et 'events'
      const projectDocRef = doc(db, 'projects', targetSlug);
      unsubscribes.push(
        onSnapshot(
          projectDocRef,
          (docSnap) => {
            if (docSnap.exists()) {
              foundInFirestore = true;
              mergeFirestoreSnapshot(docSnap.data());
            }
            setIsLoading(false);
          },
          () => { setIsLoading(false); }
        )
      );

      const eventDocRef = doc(db, 'events', targetSlug);
      unsubscribes.push(
        onSnapshot(
          eventDocRef,
          (docSnap) => {
            if (docSnap.exists()) {
              foundInFirestore = true;
              mergeFirestoreSnapshot(docSnap.data());
            }
            setIsLoading(false);
          },
          () => { setIsLoading(false); }
        )
      );
    }

    // Récupération directe getDoc pour résolution immédiate et diagnostic console
    (async () => {
      try {
        // Chaque collection est interrogée indépendamment : un refus de permission
        // sur l'une (ex: 'projects' réservée aux comptes connectés) ne doit pas
        // empêcher la lecture des suivantes pour un visiteur anonyme.
        for (const collectionName of ['portals', 'events', 'projects']) {
          if (isCancelled) return;
          try {
            const snap = await getDoc(doc(db, collectionName, slug));
            if (snap.exists()) {
              foundInFirestore = true;
              mergeFirestoreSnapshot(snap.data());
              setIsLoading(false);
              return;
            }
          } catch (collectionErr) {
            console.warn(`[LiveHub] Lecture '${collectionName}/${slug}' impossible:`, collectionErr);
          }
        }

        if (!foundInFirestore && !readHubLocalStorageForSlug(slug)) {
          console.error("Projet introuvable en base pour le slug:", slug);
        }
      } catch (err) {
        console.error('[LiveHub] Erreur lecture directe Firestore:', err);
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      isCancelled = true;
      unsubscribes.forEach((unsub) => unsub());
    };
  }, [slug]);

  const isDemo = !rawEventData;

  const eventData: ExtendedEventData = {
    ...fallbackEventData,
    ...(rawEventData || {}),
    backgroundImage:
      rawEventData?.backgroundImage !== undefined
        ? rawEventData.backgroundImage
        : rawEventData?.bgImage !== undefined
          ? rawEventData.bgImage
          : rawEventData?.customBackground,
    bgImage:
      rawEventData?.bgImage !== undefined
        ? rawEventData.bgImage
        : rawEventData?.backgroundImage !== undefined
          ? rawEventData.backgroundImage
          : rawEventData?.customBackground,
    customBackground:
      rawEventData?.customBackground !== undefined
        ? rawEventData.customBackground
        : rawEventData?.backgroundImage !== undefined
          ? rawEventData.backgroundImage
          : rawEventData?.bgImage,
    djPhoto: rawEventData?.djPhoto !== undefined ? rawEventData.djPhoto : undefined,
    secondaryDjPhoto: rawEventData?.secondaryDjPhoto !== undefined ? rawEventData.secondaryDjPhoto : undefined,
    logoImage:
      rawEventData?.logoImage !== undefined
        ? rawEventData.logoImage
        : rawEventData?.logoUrl !== undefined && rawEventData?.logoUrl !== null
          ? rawEventData.logoUrl
          : undefined,
    logoUrl:
      rawEventData?.logoUrl !== undefined
        ? rawEventData.logoUrl
        : rawEventData?.logoImage !== undefined
          ? rawEventData.logoImage
          : undefined,
    flyerImageUrl:
      rawEventData?.flyerImageUrl ||
      rawEventData?.previewImages?.a3 ||
      undefined,
    previewImages: {
      ...(rawEventData?.previewImages || {}),
      a3:
        rawEventData?.previewImages?.a3 ||
        rawEventData?.flyerImageUrl ||
        undefined,
    },
    tshirtCustomLogo:
      rawEventData?.tshirtCustomLogo ||
      rawEventData?.logoImage ||
      rawEventData?.logoUrl ||
      fallbackEventData.tshirtCustomLogo ||
      undefined,
    tshirtBackCustomLogo:
      rawEventData?.tshirtBackCustomLogo !== undefined
        ? rawEventData.tshirtBackCustomLogo
        : undefined,
    tshirtPreviewImages: rawEventData?.tshirtPreviewImages || fallbackEventData.tshirtPreviewImages,
    tshirtPreviewImage: rawEventData?.tshirtPreviewImage || fallbackEventData.tshirtPreviewImage,
    tshirtSide: rawEventData?.tshirtSide || fallbackEventData.tshirtSide,
    tshirtColor: rawEventData?.tshirtColor || fallbackEventData.tshirtColor || 'black',
    tshirtLogoColorMode: rawEventData?.tshirtLogoColorMode || fallbackEventData.tshirtLogoColorMode,
    tshirtFrontPlacement: rawEventData?.tshirtFrontPlacement || fallbackEventData.tshirtFrontPlacement,
    tshirtBackPlacement: rawEventData?.tshirtBackPlacement || fallbackEventData.tshirtBackPlacement,
    tshirtLogoScale: rawEventData?.tshirtLogoScale ?? fallbackEventData.tshirtLogoScale,
    tshirtBackLogoScale: rawEventData?.tshirtBackLogoScale ?? fallbackEventData.tshirtBackLogoScale,
    redesignedLogoSvg: rawEventData?.redesignedLogoSvg || fallbackEventData.redesignedLogoSvg,
    isLogoRedesignRequested: rawEventData?.isLogoRedesignRequested ?? fallbackEventData.isLogoRedesignRequested,
    rawLogoImage: rawEventData?.rawLogoImage || fallbackEventData.rawLogoImage,
    rawTshirtLogoOriginal: rawEventData?.rawTshirtLogoOriginal || fallbackEventData.rawTshirtLogoOriginal,
    formatTransforms: {
      ...fallbackEventData.formatTransforms,
      ...(rawEventData?.formatTransforms || {}),
      a3: rawEventData?.formatTransforms?.a3 || rawEventData?.formatTransforms?.post || fallbackEventData.formatTransforms?.a3,
    },
    logoFormatTransforms: {
      ...fallbackEventData.logoFormatTransforms,
      ...(rawEventData?.logoFormatTransforms || {}),
      a3: rawEventData?.logoFormatTransforms?.a3,
    },
  };

  // 3. ÉTATS ET CONFIGURATION DU HUB INTERACTIF
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'flyer' | 'merch'>(() => {
    return searchParams.get('tab') === 'merch' ? 'merch' : 'flyer';
  });
  const [tshirtViewSide, setTshirtViewSide] = useState<'front' | 'back'>(() => {
    return eventData?.tshirtSide || 'front';
  });

  useEffect(() => {
    if (eventData?.tshirtSide) {
      setTshirtViewSide(eventData.tshirtSide);
    }
  }, [eventData?.tshirtSide]);

  // États du simulateur interactif de commande textile en marque blanche
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [simulatorSize, setSimulatorSize] = useState<'S' | 'M' | 'L' | 'XL' | 'XXL'>('L');
  const [simulatorQty, setSimulatorQty] = useState(1);
  const [simulatorStep, setSimulatorStep] = useState<'form' | 'success'>('form');
  const [simulatorOrderId, setSimulatorOrderId] = useState(() => `SIG-ORD-${Math.floor(100000 + Math.random() * 900000)}`);


  const isBack = tshirtViewSide === 'back';
  const isWhiteGarment = eventData.tshirtColor === 'white';
  const activeTshirtLogo = resolveActiveTextileLogo(eventData, tshirtViewSide);
  const tshirtTemplateSrc = resolveGarmentTemplateSrc('tshirt', eventData.tshirtColor || 'black', tshirtViewSide);
  const hasMerchAvailable = true; // Toujours actif et interactif pour la démonstration

  const isInvalidOldImage = (url?: string | null) => {
    if (!url) return true;
    return url.includes('21nine') || url.includes('mannequin-blank');
  };

  const resolvedSidePreview = eventData.tshirtPreviewImages?.[tshirtViewSide];
  const legacyPreview = eventData.tshirtPreviewImage;
  const rawMannequinImage = resolvedSidePreview
    ? resolvedSidePreview
    : (!eventData.tshirtPreviewImages && eventData.tshirtSide === tshirtViewSide ? legacyPreview : undefined);
  const mannequinPreviewImage = (rawMannequinImage && !isInvalidOldImage(rawMannequinImage)) ? rawMannequinImage : undefined;

  const mannequinBlankSrc = isBack ? '/demo/artist-mannequin-blank-back.jpg?side=dos' : '/demo/artist-mannequin-blank.jpg';
  const defaultMannequinDisplay = isBack
    ? (mannequinPreviewImage ? `${mannequinPreviewImage}${mannequinPreviewImage.includes('?') ? '&' : '?'}side=dos` : mannequinBlankSrc)
    : (mannequinPreviewImage || mannequinBlankSrc);
  const [hubMerchDisplayMode, setHubMerchDisplayMode] = useState<'model' | 'template'>('model');

  const getHubLogoStyle = (): React.CSSProperties => {
    const rawPlacement = isBack ? eventData.tshirtBackPlacement : eventData.tshirtFrontPlacement;
    const clamped = clampDtfPlacement(rawPlacement, tshirtViewSide);
    const logoMode = resolveActiveTextileColorMode(eventData, eventData.tshirtColor || 'black');
    return getTextileLogoStyle(clamped, tshirtViewSide, logoMode);
  };

  const getMannequinLogoStyle = (): React.CSSProperties => {
    const rawPlacement = isBack ? eventData.tshirtBackPlacement : eventData.tshirtFrontPlacement;
    const clamped = clampDtfPlacement(rawPlacement, tshirtViewSide);
    const pos = getMannequinPosition(clamped, isBack);
    const logoMode = resolveActiveTextileColorMode(eventData, eventData.tshirtColor || 'black');

    let filter = 'none';
    if (logoMode === 'white') {
      filter = 'brightness(0) invert(1)';
    } else if (logoMode === 'black') {
      filter = 'brightness(0)';
    }

    return {
      position: 'absolute',
      top: pos.top,
      left: pos.left,
      width: pos.width,
      transform: pos.transform,
      filter,
    };
  };

  // Actions dynamiques du Hub Standard
  const currentUrl = typeof window !== 'undefined' ? `${window.location.origin}/hub/${slug}` : `https://signaid.eu/hub/${slug}`;

  // Calcul d'une date ISO synchronisée pour Google Calendar (Samedi prochain 21h00 - 02h00)
  const getCalendarDates = () => {
    const start = new Date();
    const daysUntilSaturday = ((6 - start.getDay() + 7) % 7) || 7;
    start.setDate(start.getDate() + daysUntilSaturday);
    start.setHours(21, 0, 0, 0);
    const end = new Date(start.getTime() + 5 * 60 * 60 * 1000);
    const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    return `${fmt(start)}/${fmt(end)}`;
  };

  const calTitle = encodeURIComponent(
    isDemo ? 'PORTAIL INTERACTIF // DÉMO SIGNAID' : `${eventData.eventName || 'PORTAIL INTERACTIF'} // ${eventData.djName || 'SIGNAID'}`
  );
  const calDetails = encodeURIComponent(
    isDemo
      ? `Déploiement instantané en 1 clic de votre portail interactif et boutique merch DTF.\nSmartLink : https://signaid.eu/hub/${slug}\n\nInfrastructure Autonome Signaid - Déploiement en 5 minutes.`
      : `${eventData.punchline || 'EN MOINS DE 5 MINUTES'}${eventData.venue ? `\nLieu : ${eventData.venue}` : ''}\nSmartLink : ${currentUrl}\n\nInfrastructure Autonome Signaid - Déploiement en 5 minutes.`
  );
  const calLocation = encodeURIComponent(
    isDemo
      ? 'https://signaid.eu'
      : ((eventData.venue && eventData.venue !== 'LIEU / CLUB')
        ? eventData.venue
        : 'Paris, France')
  );
  const calDates = getCalendarDates();
  const googleCalendarUrl = eventData.calendarUrl || `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${calTitle}&dates=${calDates}&details=${calDetails}&location=${calLocation}`;

  const mapsQuery = (eventData.venue && eventData.venue !== 'LIEU / CLUB')
    ? eventData.venue
    : 'Paris, France';
  const googleMapsUrl = (eventData.venueMapsUrl && eventData.venueMapsUrl.startsWith('https://www.google.com/maps'))
    ? eventData.venueMapsUrl
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQuery)}`;

  const artistUrl = eventData.artistUrl
    ? (eventData.artistUrl.startsWith('http') ? eventData.artistUrl : `https://${eventData.artistUrl}`)
    : (eventData.artistSocialUrl
        ? (eventData.artistSocialUrl.startsWith('http') ? eventData.artistSocialUrl : `https://${eventData.artistSocialUrl}`)
        : (eventData.textUrls?.djName
            ? (eventData.textUrls.djName.startsWith('http') ? eventData.textUrls.djName : `https://${eventData.textUrls.djName}`)
            : null));

  const rawOfficialUrl = eventData.organizationUrl || eventData.textUrls?.eventName;
  const officialUrl = rawOfficialUrl
    ? (rawOfficialUrl.startsWith('http') ? rawOfficialUrl : `https://${rawOfficialUrl}`)
    : null;

  const rawHeaderTaglineUrl = eventData.textUrls?.headerTagline;
  const headerTaglineUrl = rawHeaderTaglineUrl
    ? (rawHeaderTaglineUrl.startsWith('http') ? rawHeaderTaglineUrl : `https://${rawHeaderTaglineUrl}`)
    : null;

  const rawPunchlineUrl = eventData.textUrls?.punchline;
  const punchlineUrl = rawPunchlineUrl
    ? (rawPunchlineUrl.startsWith('http') ? rawPunchlineUrl : `https://${rawPunchlineUrl}`)
    : null;

  const rawBadgeUrl = eventData.textUrls?.headlineBadgeText;
  const badgeUrl = rawBadgeUrl
    ? (rawBadgeUrl.startsWith('http') ? rawBadgeUrl : `https://${rawBadgeUrl}`)
    : null;

  // Résolution optimisée de l'URL WhatsApp / Contact direct
  const whatsappContactUrl = React.useMemo(() => {
    if (isDemo) {
      return 'https://wa.me/32479359439?text=Hello%20Signaid%2C%20je%20souhaite%20r%C3%A9server%20une%20d%C3%A9mo';
    }
    if (artistUrl && (artistUrl.includes('wa.me') || artistUrl.includes('whatsapp'))) {
      return artistUrl;
    }
    if (artistUrl) {
      return artistUrl;
    }
    return `https://wa.me/32479359439?text=Hello%20Signaid%2C%20contact%20concernant%20${encodeURIComponent(eventData.eventName || 'evenement')}`;
  }, [isDemo, artistUrl, eventData.eventName]);

  // Crédit silencieux du dividende créateur pour chaque visiteur unique
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const creatorSlug = eventData.slug || slug || 'portail-public';
      const storageKey = `signaid_portal_view_${creatorSlug}`;
      const alreadyCredited = sessionStorage.getItem(storageKey);
      if (!alreadyCredited) {
        creditDividend(REWARD_PUBLIC_PORTAL_VIEW, `Visite Portail Public : ${eventData.djName || eventData.eventName || creatorSlug}`);
        sessionStorage.setItem(storageKey, 'true');
      }
    } catch (e) {
      console.warn('[PublicEventHub] Erreur enregistrement vue dividende :', e);
    }
  }, [eventData.slug, slug, eventData.djName, eventData.eventName]);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${eventData.eventName} - ${eventData.djName}`,
          url: currentUrl,
        });
      } catch { }
    } else {
      try {
        await navigator.clipboard.writeText(currentUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      } catch { }
    }
  };

  // 4. ÉTATS ET CONTRÔLES DE LA SÉQUENCE SCAN PROMO (CINÉMATIQUE 10S)
  const [introStep, setIntroStep] = useState<IntroStep>('qr_white');
  const [isMuted, setIsMuted] = useState(false);
  const [isAutoplayBlocked, setIsAutoplayBlocked] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleFinishIntro = () => {
    if (introFading) return;
    setIntroFading(true);

    // Transition et redirection vers le Hub interactif
    setTimeout(() => {
      setIsPlayingIntro(false);
      // Si l'utilisateur était sur /scan, basculer sur l'URL propre du Hub :
      if (window.location.pathname.startsWith('/scan')) {
        window.location.href = '/hub/portail-interactif-signaid';
      }
    }, 400);
  };

  const handleVideoEnded = () => {
    if (videoRef.current && videoRef.current.currentTime < 7.5) {
      return;
    }
    handleFinishIntro();
  };

  // Déverrouillage audio universel (uniquement si intro active)
  useEffect(() => {
    if (!isPlayingIntro) return;

    const handleGlobalInteraction = () => {
      if (videoRef.current) {
        videoRef.current.muted = false;
        videoRef.current.volume = 1.0;
        if (videoRef.current.paused && introStep === 'video_playing') {
          videoRef.current.play().then(() => setIsAutoplayBlocked(false)).catch(() => { });
        } else {
          setIsAutoplayBlocked(false);
        }
      }
      setIsMuted(false);
    };

    window.addEventListener('pointerdown', handleGlobalInteraction);
    window.addEventListener('click', handleGlobalInteraction);
    window.addEventListener('touchstart', handleGlobalInteraction);
    window.addEventListener('keydown', handleGlobalInteraction);

    return () => {
      window.removeEventListener('pointerdown', handleGlobalInteraction);
      window.removeEventListener('click', handleGlobalInteraction);
      window.removeEventListener('touchstart', handleGlobalInteraction);
      window.removeEventListener('keydown', handleGlobalInteraction);
    };
  }, [isPlayingIntro, introStep]);

  // Cadencement strict de la timeline cinématique sur 10s (uniquement si intro active)
  useEffect(() => {
    if (!isPlayingIntro) return;

    const timeline: { step: IntroStep; delay: number }[] = [
      { step: 'qr_fade', delay: 600 },
      { step: 'decor_particles', delay: 1000 },
      { step: 'flyer_complete', delay: 1500 },
      { step: 'video_playing', delay: 2000 },
    ];

    const timers = timeline.map(({ step, delay }) =>
      setTimeout(() => setIntroStep(step), delay)
    );

    return () => timers.forEach(clearTimeout);
  }, [isPlayingIntro]);

  // Déclenchement automatique de la vidéo avatar à T=2.0s
  useEffect(() => {
    if (!isPlayingIntro) return;

    if (introStep === 'video_playing' && videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.muted = false;
      videoRef.current.volume = 1.0;
      videoRef.current.play()
        .then(() => setIsAutoplayBlocked(false))
        .catch((err) => {
          console.warn('[Intro] Autoplay sonore bloqué par le navigateur, lancement en muet:', err);
          setIsAutoplayBlocked(true);
          if (videoRef.current) {
            videoRef.current.muted = true;
            videoRef.current.play().catch(() => { });
          }
        });
    }
  }, [isPlayingIntro, introStep]);

  // =========================================================================
  // MOTEUR DE RENDU DU FLYER OFFICIEL (SINGLE SOURCE OF TRUTH: FlyerPosterRenderer)
  // =========================================================================
  const preferStaticFlyerImage =
    eventData.flyerRenderMode === 'image' ||
    searchParams.get('mode') === 'image';
  const staticFlyerSrc = eventData.previewImages?.a3 || eventData.flyerImageUrl;

  const renderDynamicFlyerPoster = () => {
    if (preferStaticFlyerImage && staticFlyerSrc) {
      return (
        <div className="relative w-full h-full overflow-hidden bg-zinc-950 flex items-center justify-center">
          <img
            src={staticFlyerSrc}
            alt="Flyer Officiel"
            width={BASE_WIDTH || 1080}
            height={BASE_HEIGHT || 1350}
            fetchPriority="high"
            decoding="async"
            className="w-full h-full object-contain select-none"
          />
        </div>
      );
    }

    return (
      <FlyerPosterRenderer
        {...eventData}
        projectData={eventData}
        isInteractive={false}
      />
    );
  };

  // =========================================================================
  // BRANCHE 1 : SÉQUENCE SCAN PROMO (CINÉMATIQUE PLEIN ÉCRAN RÉSERVÉE À /scan)
  // =========================================================================
  if (isPlayingIntro) {
    return (
      <div className={`fixed inset-0 z-50 flex items-center justify-center overflow-hidden select-none transition-all duration-400 ${introStep === 'qr_white' || introStep === 'qr_fade' ? 'bg-white' : 'bg-black'
        } ${introFading ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'}`}>
        {/* 1. VERSO BLANC ET QR CODE (0.0s - 1.0s) */}
        {(introStep === 'qr_white' || introStep === 'qr_fade') && (
          <div
            onClick={() => {
              if (videoRef.current) {
                videoRef.current.muted = false;
                videoRef.current.volume = 1.0;
              }
            }}
            className={`absolute inset-0 z-40 bg-white flex items-center justify-center cursor-pointer transition-all duration-400 ${introStep === 'qr_fade' ? 'opacity-0 scale-110' : 'opacity-100 scale-100'
              }`}
          >
            <img
              src="/assets/qr-code-black.png"
              alt="QR Code"
              width={224}
              height={224}
              loading="lazy"
              decoding="async"
              className="w-48 h-48 sm:w-56 sm:h-56 object-contain"
            />
          </div>
        )}

        {/* CADRE RESPONSIVE DU FLYER / VIDÉO (Max 420px sur PC, 85vh sur Mobile) */}
        <div className={`relative w-full max-w-[420px] max-h-[85vh] aspect-[9/16] rounded-3xl overflow-hidden shadow-2xl bg-black border border-zinc-800 transition-opacity duration-500 ${introStep === 'qr_white' || introStep === 'qr_fade' ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}>

          {/* 1. Flyer dynamique en temps réel (qui sert de sous-couche exacte pour le cross-fade) */}
          <div className={`absolute inset-0 z-10 transition-opacity duration-700 ${introStep === 'video_playing' ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
            <div className="relative w-full h-full overflow-hidden bg-zinc-950 flex items-center justify-center">
              <div className="relative w-full h-full max-w-[480px] aspect-[4/5] overflow-hidden">
                {renderDynamicFlyerPoster()}
              </div>
            </div>
          </div>

          {/* 2. Vidéo Avatar (Fondu entrant doux par-dessus le flyer) */}
          <video
            ref={videoRef}
            src="/assets/intro-subject-8s.mp4"
            preload="auto"
            playsInline
            muted={false}
            onEnded={handleVideoEnded}
            className={`absolute inset-0 w-full h-full object-cover z-20 transition-opacity duration-700 ${introStep === 'video_playing' ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
          />

          {/* Déblocage du son au clic si bloqué par le navigateur */}
          {isAutoplayBlocked && (
            <div
              onClick={(e) => {
                e.stopPropagation();
                if (videoRef.current) {
                  videoRef.current.muted = false;
                  videoRef.current.volume = 1.0;
                  videoRef.current.currentTime = 0;
                  videoRef.current.play().then(() => setIsAutoplayBlocked(false)).catch(() => { });
                }
                setIsMuted(false);
              }}
              className="absolute bottom-6 inset-x-4 z-50 flex justify-center cursor-pointer pointer-events-auto"
            >
              <div className="px-5 py-2.5 rounded-full bg-lime-400 text-black font-mono font-black text-xs flex items-center gap-2 shadow-2xl hover:scale-105 active:scale-95 transition-transform animate-bounce">
                <span className="text-base">🔊</span>
                <span>TOUCHER POUR ACTIVER LE SON</span>
              </div>
            </div>
          )}

          {/* 3. Contrôles HUD (Son & Passer) */}
          {introStep === 'video_playing' && (
            <div className="absolute top-3 inset-x-3 flex justify-between items-center z-40 pointer-events-auto">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (videoRef.current) {
                    const next = !isMuted;
                    videoRef.current.muted = next;
                    setIsMuted(next);
                  }
                }}
                className="px-3 py-1 rounded-full bg-black/80 border border-white/20 text-white font-mono text-[11px] cursor-pointer"
              >
                {isMuted ? '🔇 Activer le son' : '🔊 Voix active'}
              </button>
              <button
                type="button"
                onClick={handleFinishIntro}
                className="px-3.5 py-1 rounded-full bg-lime-400 text-black font-mono font-black text-xs hover:bg-lime-300 transition cursor-pointer"
              >
                Passer ››
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Pendant la phase loading === true de récupération Firestore, afficher uniquement un écran noir neutre avec un indicateur discret de chargement
  if (isLoading) {
    return (
      <div className="min-h-[100dvh] bg-zinc-950 text-white flex flex-col items-center justify-center p-6 font-mono select-none">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="relative flex items-center justify-center">
            <div className="w-10 h-10 rounded-full border-2 border-zinc-800 border-t-lime-400 animate-spin" />
            <span className="absolute w-2 h-2 rounded-full bg-lime-400 animate-ping" />
          </div>
          <div className="space-y-1">
            <p className="text-xs uppercase font-bold tracking-widest text-zinc-300">Synchronisation du Hub...</p>
            <p className="text-[10px] text-zinc-600">Connexion temps réel à votre projet Studio</p>
          </div>
        </div>
      </div>
    );
  }

  // Si aucune donnée valide n'a été récupérée en base pour ce slug (évite tout affichage du profil démo)
  if (!rawEventData) {
    return (
      <div className="min-h-[100dvh] bg-zinc-950 text-white flex flex-col items-center justify-center p-6 font-mono select-none">
        <div className="flex flex-col items-center gap-4 text-center max-w-sm">
          <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-xl shadow-lg">
            ⚡
          </div>
          <div className="space-y-1.5">
            <p className="text-xs uppercase font-bold tracking-widest text-zinc-200">Portail introuvable</p>
            <p className="text-[11px] text-zinc-500">Aucun projet actif trouvé pour « {slug} »</p>
          </div>
          <a
            href="/"
            className="mt-4 px-4 py-2.5 rounded-xl bg-lime-400 hover:bg-lime-300 text-black font-black font-mono text-xs uppercase tracking-wider transition shadow-lg shadow-lime-400/20 active:scale-95"
          >
            Créer mon portail
          </a>
        </div>
      </div>
    );
  }

  // =========================================================================
  // BRANCHE 2 : HUB INTERACTIF STANDARD (ÉPURÉ, CENTRÉ SUR LE VISUEL ET L'ACTION)
  // =========================================================================
  return (
    <div className="min-h-[100dvh] bg-zinc-950 text-white flex flex-col items-center justify-between p-3 sm:p-4 font-mono selection:bg-lime-400 selection:text-black overflow-x-hidden">
      <div className="w-full max-w-md flex flex-col justify-between flex-1 space-y-2.5 sm:space-y-3">

        {/* 1. EN-TÊTE BRANDING DISCRET & EXPORT / PARTAGE */}
        <div className="flex items-center justify-between text-[11px] text-zinc-500 border-b border-zinc-900 pb-2">
          <a href="/" className="font-bold tracking-wider hover:text-white transition flex items-center gap-1.5" title="Retour au Studio">
            <span className="w-2 h-2 rounded-full bg-lime-400 animate-pulse" />
            <span>SIGNAID<span className="text-lime-400">.EU</span> // LIVE HUB</span>
          </a>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              id="portal-export-flyer-btn"
              onClick={async () => {
                if (activeTab !== 'flyer') {
                  setActiveTab('flyer');
                }
                let targetEl = document.getElementById('hub-flyer-poster-capture');
                for (let attempt = 0; attempt < 15 && !targetEl; attempt++) {
                  await new Promise((r) => setTimeout(r, 100));
                  targetEl = document.getElementById('hub-flyer-poster-capture');
                }
                if (targetEl) {
                  let restoreImgs: (() => void) | undefined;
                  try {
                    restoreImgs = await prepareNodeImagesForExport(targetEl);
                    let rawDataUrl: string;
                    try {
                      rawDataUrl = await Promise.race([
                        toPng(targetEl, {
                          quality: 1.0,
                          pixelRatio: 2.5,
                          cacheBust: true,
                          includeQueryParams: true,
                          skipFonts: false,
                        }),
                        new Promise<string>((_, reject) =>
                          setTimeout(() => reject(new Error('toPng font embed timeout')), 4000)
                        ),
                      ]);
                    } catch {
                      rawDataUrl = await toPng(targetEl, {
                        quality: 1.0,
                        pixelRatio: 2.5,
                        cacheBust: true,
                        includeQueryParams: true,
                        skipFonts: true,
                      });
                    }
                    const calibratedDataUrl = setPngDpi(rawDataUrl, 300);
                    const blob = dataUrlToBlob(calibratedDataUrl);
                    const safeSlug = (slug || 'signaid').toUpperCase().replace(/[^A-Z0-9_-]/g, '_');
                    await exportAndSaveImage(blob, `FLYER_${safeSlug}_300DPI.png`);
                  } catch (err) {
                    console.error('[HubExport] Erreur export flyer:', err);
                  } finally {
                    if (restoreImgs) restoreImgs();
                  }
                }
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-lime-400/15 border border-lime-400/40 text-lime-400 hover:bg-lime-400 hover:text-black font-bold transition text-[10px] cursor-pointer"
              title="Exporter le visuel haute résolution"
            >
              <Download className="w-3 h-3" />
              <span>Exporter HD</span>
            </button>
            <button
              type="button"
              onClick={handleShare}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:border-lime-400/40 transition text-[10px] cursor-pointer"
            >
              {copied ? <Check className="w-3 h-3 text-lime-400" /> : <Share2 className="w-3 h-3" />}
              <span>{copied ? 'Copié !' : 'Partager'}</span>
            </button>
          </div>
        </div>

        {/* BANNIÈRE DE CONFIRMATION D'ACTIVATION / PRODUCTION (si paramètre URL) */}
        {(searchParams.get('activation') || eventData.printOrder?.status === 'in_production') && (
          <div
            data-testid="portal-activation-banner"
            className="p-2.5 rounded-xl bg-lime-400/10 border border-lime-400/30 text-lime-400 text-[11px] font-mono flex items-center justify-between gap-2 animate-fadeIn"
          >
            <div className="flex items-center gap-2 min-w-0">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-lime-400" />
              <span className="font-bold truncate">
                Portail actif • Pack validé &amp; en production
              </span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-lime-400 text-black text-[9px] font-black uppercase shrink-0">
              EN LIGNE
            </span>
          </div>
        )}

        {/* 1. LES BOUTONS D'ACCÈS RAPIDE INDISPENSABLES EN HAUT (GPS, CONTACT / WHATSAPP, AGENDA) */}
        <div className="space-y-2">
          {/* Ligne principale : GPS & Contact/WhatsApp */}
          <div className="grid grid-cols-2 gap-2">
            {/* BOUTON GPS */}
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2.5 rounded-xl bg-zinc-900/90 border border-zinc-800 hover:border-lime-400/50 hover:bg-zinc-850 transition flex items-center gap-2.5 group shadow-sm min-w-0 cursor-pointer"
              title="Ouvrir l'itinéraire GPS"
            >
              <div className="p-1.5 rounded-lg bg-lime-400/10 text-lime-400 border border-lime-400/20 group-hover:scale-105 transition-transform shrink-0">
                <MapPin className="w-4 h-4" />
              </div>
              <div className="text-left min-w-0 flex-1">
                <div className="text-xs font-bold uppercase text-zinc-200 truncate">
                  Itinéraire GPS
                </div>
                <div className="text-[10px] text-zinc-500 truncate">
                  Ouvrir l'itinéraire GPS
                </div>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-zinc-600 group-hover:text-lime-400 transition shrink-0" />
            </a>

            {/* BOUTON CONTACT / WHATSAPP */}
            <a
              href={whatsappContactUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2.5 rounded-xl bg-zinc-900/90 border border-zinc-800 hover:border-lime-400/50 hover:bg-zinc-850 transition flex items-center gap-2.5 group shadow-sm min-w-0 cursor-pointer"
              title="Contacter via WhatsApp"
            >
              <div className="p-1.5 rounded-lg bg-lime-400/10 text-lime-400 border border-lime-400/20 group-hover:scale-105 transition-transform shrink-0">
                <MessageCircle className="w-4 h-4" />
              </div>
              <div className="text-left min-w-0 flex-1">
                <div className="text-xs font-bold uppercase text-zinc-200 truncate">
                  Contact WhatsApp
                </div>
                <div className="text-[10px] text-zinc-500 truncate">
                  {isDemo ? "Réserver démo" : (eventData.djName || "Échange direct")}
                </div>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-zinc-600 group-hover:text-lime-400 transition shrink-0" />
            </a>
          </div>

          {/* Ligne secondaire : Date & Agenda (+ Billetterie si présente) */}
          <div className="flex items-center gap-2">
            <a
              href={googleCalendarUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-1.5 px-2.5 rounded-xl bg-zinc-900/90 border border-zinc-800 hover:border-lime-400/50 hover:bg-zinc-850 transition flex items-center justify-between text-xs group cursor-pointer shadow-sm"
              title="Ajouter à Google Agenda"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Calendar className="w-3.5 h-3.5 text-lime-400 shrink-0" />
                <span className="text-zinc-200 font-bold truncate text-[11px]">
                  {isDemo ? "21 SEPTEMBRE 2026" : (eventData.date || 'Date à confirmer')}
                </span>
                <span className="hidden min-[380px]:inline text-zinc-500 text-[10px] truncate">
                  • Ajouter à Google Agenda
                </span>
              </div>
              <span className="text-[10px] font-bold text-lime-400 px-1.5 py-0.5 rounded bg-lime-400/10 border border-lime-400/20 shrink-0">
                + Agenda
              </span>
            </a>

            {(officialUrl || isDemo) && (
              <a
                href={isDemo ? "https://signaid.eu" : officialUrl!}
                target="_blank"
                rel="noopener noreferrer"
                className="py-1.5 px-3 rounded-xl bg-lime-400 hover:bg-lime-300 text-black font-black text-xs font-mono uppercase tracking-wider transition flex items-center gap-1.5 shrink-0 shadow-sm shadow-lime-400/20 cursor-pointer"
                title="Accéder au site officiel ou billetterie"
              >
                <Ticket className="w-3.5 h-3.5" />
                <span>Billetterie</span>
              </a>
            )}
          </div>
        </div>

        {/* 2. SÉLECTEUR D'ONGLET FLUIDE : AFFICHE (1:1) vs MERCH TEXTILE */}
        {hasMerchAvailable && (
          <div className="flex items-center justify-center gap-1.5 p-1 rounded-xl bg-zinc-900 border border-zinc-800 text-xs shadow-sm">
            <button
              type="button"
              onClick={() => setActiveTab('flyer')}
              className={`flex-1 py-1.5 rounded-lg font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${activeTab === 'flyer'
                ? 'bg-lime-400 text-black shadow-md font-black'
                : 'text-zinc-400 hover:text-white'
                }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Flyer Officiel</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('merch')}
              className={`flex-1 py-1.5 rounded-lg font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${activeTab === 'merch'
                ? 'bg-lime-400 text-black shadow-md font-black'
                : 'text-zinc-400 hover:text-white'
                }`}
            >
              <Shirt className="w-3.5 h-3.5" />
              <span>Merch Textile</span>
            </button>
          </div>
        )}

        {/* 2. ZONE CENTRALE : LE VISUEL PRINCIPAL RESPIRANT SANS POLLUTION */}
        <div className="flex-1 flex flex-col items-center justify-center min-h-0 w-full my-auto">
          {activeTab === 'flyer' ? (
            /* FORMAT OFFICIEL FLYER PORTRAIT (4/5) POUR LE HUB PUBLIC — RENDU DYNAMIQUE STRICTEMENT HOMOTHÉTIQUE AU STUDIO */
            <div
              id="hub-flyer-poster-capture"
              className="relative w-full max-w-[480px] mx-auto rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl bg-zinc-950 border border-zinc-800 aspect-[4/5] flex items-center justify-center transition-all duration-300"
            >
              {renderDynamicFlyerPoster()}
            </div>
          ) : (
            /* MERCH TEXTILE (PRODUIT DÉRIVÉ AVEC BASCULE INSTANTANÉE « 👕 Face ➔ Dos » ET GABARIT VÊTEMENT DYNAMIQUE) */
            <div className="w-full max-w-[400px] mx-auto space-y-2 select-none">
              {/* UNIQUE BOUTON DE BASCULE ÉPURÉ FACE / DOS */}
              <div className="w-full flex items-center justify-between gap-2 p-1.5 rounded-2xl bg-zinc-900/90 border border-zinc-800/90 backdrop-blur-md shadow-lg">
                <div className="flex items-center gap-2 pl-2 text-xs font-mono font-bold text-zinc-300">
                  <Shirt className="w-4 h-4 text-lime-400 shrink-0" />
                  <span>T-shirt Officiel</span>
                </div>

                {/* Interrupteur unique Face / Dos épuré */}
                <div className="inline-flex items-center p-0.5 rounded-xl bg-black/70 border border-zinc-800 shadow-inner">
                  <button
                    type="button"
                    id="portal-toggle-front"
                    onClick={() => setTshirtViewSide('front')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      tshirtViewSide === 'front'
                        ? 'bg-lime-400 text-black font-black shadow-md shadow-lime-400/25 scale-[1.02]'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                    aria-label="Afficher la vue de face (marquage poitrine)"
                  >
                    <span>👕</span>
                    <span>Face</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTshirtViewSide((side) => (side === 'front' ? 'back' : 'front'))}
                    className="px-1.5 text-zinc-500 hover:text-lime-400 transition text-[11px] select-none cursor-pointer"
                    title="Inverser la vue"
                  >
                    ➔
                  </button>
                  <button
                    type="button"
                    id="portal-toggle-back"
                    onClick={() => setTshirtViewSide('back')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      tshirtViewSide === 'back'
                        ? 'bg-lime-400 text-black font-black shadow-md shadow-lime-400/25 scale-[1.02]'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                    aria-label="Afficher la vue de dos (visuel complet)"
                  >
                    <span>Dos</span>
                  </button>
                </div>
              </div>

              {/* ZONE DE MOCKUP DU PRODUIT DÉRIVÉ */}
              <div className="relative w-full aspect-square rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl bg-zinc-900 flex flex-col items-center justify-center p-3 transition-all duration-300 select-none group max-h-[calc(100dvh-275px)]">
                {/* Sélecteur de mode d'affichage : 🧍 Mannequin porté vs 👕 Gabarit textile */}
                <div className="absolute top-3 left-3 z-30 pointer-events-auto flex items-center p-0.5 rounded-full bg-black/85 border border-white/20 backdrop-blur-md shadow-xl text-[10px] font-mono">
                  <button
                    type="button"
                    id="portal-view-model-btn"
                    onClick={() => setHubMerchDisplayMode('model')}
                    className={`px-2.5 py-1 rounded-full font-bold transition-all cursor-pointer ${
                      hubMerchDisplayMode === 'model'
                        ? 'bg-lime-400 text-black shadow-sm font-black'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                    title="Affichage sur mannequin en situation"
                  >
                    🧍 Mannequin
                  </button>
                  <button
                    type="button"
                    id="portal-view-template-btn"
                    onClick={() => setHubMerchDisplayMode('template')}
                    className={`px-2.5 py-1 rounded-full font-bold transition-all cursor-pointer ${
                      hubMerchDisplayMode === 'template'
                        ? 'bg-lime-400 text-black shadow-sm font-black'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                    title="Affichage gabarit textile à plat"
                  >
                    👕 Gabarit
                  </button>
                </div>

                {/* Rendu visuel Face vs Dos */}
                {hubMerchDisplayMode === 'model' ? (
                  <div className="relative w-full h-full flex items-center justify-center overflow-hidden rounded-xl animate-fadeIn bg-zinc-950">
                    <img
                      src={defaultMannequinDisplay}
                      alt="T-shirt Officiel"
                      width={500}
                      height={500}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover rounded-xl select-none transition-opacity duration-300"
                      crossOrigin="anonymous"
                    />
                    {!mannequinPreviewImage && activeTshirtLogo && (
                      <div
                        className="absolute pointer-events-none select-none z-10 flex items-center justify-center"
                        style={getMannequinLogoStyle()}
                      >
                        <img
                          src={activeTshirtLogo}
                          crossOrigin="anonymous"
                          alt={tshirtViewSide === 'front' ? "Logo Mannequin Face" : "Logo Mannequin Dos"}
                          width={200}
                          height={200}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-contain pointer-events-none select-none"
                          draggable={false}
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
                    <img
                      src={tshirtTemplateSrc}
                      alt="T-shirt Officiel"
                      width={500}
                      height={500}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-contain select-none filter drop-shadow-2xl transition-all duration-300"
                      crossOrigin="anonymous"
                    />

                    {activeTshirtLogo && (
                      <div
                        className="absolute flex items-center justify-center pointer-events-none select-none z-10"
                        style={getHubLogoStyle()}
                      >
                        <img
                          src={activeTshirtLogo}
                          crossOrigin="anonymous"
                          alt={tshirtViewSide === 'front' ? "Marquage Poitrine DTF" : "Impression Dos DTF"}
                          width={200}
                          height={200}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-contain pointer-events-none select-none"
                          draggable={false}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Badge officiel DTF HD & Indication de face active */}
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-[9px] font-mono bg-black/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-zinc-800/80 text-zinc-300 z-20">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-lime-400 animate-pulse" />
                    <span className="font-bold text-zinc-200">
                      {tshirtViewSide === 'front' ? 'Marquage Poitrine / Cœur' : 'Impression Dorsale HD'}
                    </span>
                  </div>
                  <span className="text-lime-400 font-bold uppercase tracking-wider">
                    Impression DTF HD • Coton Lourd 240g
                  </span>
                </div>
              </div>

              {/* Bouton d'accès direct boutique / simulateur */}
              <div className="w-full pt-1">
                <button
                  type="button"
                  id="portal-simulator-open-btn"
                  onClick={() => setIsSimulatorOpen(true)}
                  className="w-full p-2.5 rounded-xl bg-lime-400 hover:bg-lime-300 text-black font-mono font-black text-xs uppercase tracking-wider flex items-center justify-between shadow-lg shadow-lime-400/20 transition cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4" />
                    <span>Commander le T-shirt Officiel</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-black text-lime-400 font-bold">
                    29,00 € TTC ›
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 3. UNIQUE ENCART FINAL DISCRET : CONVERSION & BRANDING MINIMALISTE */}
        <div className="w-full max-w-md mx-auto pt-1 pb-1">
          <div className="p-3 rounded-2xl bg-zinc-900/90 border border-zinc-800 hover:border-lime-400/40 transition-colors shadow-lg flex items-center justify-between gap-3">
            <div className="text-left min-w-0">
              <div className="flex items-center gap-1.5 text-[10px] text-lime-400 font-mono font-bold uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-lime-400 animate-pulse shrink-0" />
                <span className="truncate">Infrastructure Autonome Signaid</span>
              </div>
              <h3 className="text-[11px] text-zinc-400 font-mono truncate">
                Ce portail a été généré en 5 minutes
              </h3>
            </div>

            <button
              type="button"
              id="portal-deploy-system-btn"
              onClick={() => { window.location.href = '/'; }}
              className="py-2 px-3.5 rounded-xl bg-lime-400 hover:bg-lime-300 text-black font-black font-mono text-[11px] uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md shadow-lime-400/20 active:scale-95 transition cursor-pointer shrink-0"
            >
              <span>⚡</span>
              <span>DÉPLOYER MON PROPRE SYSTÈME</span>
              <span>››</span>
            </button>
          </div>
        </div>
      </div>

      {/* MODAL SIMULATEUR DE COMMANDE TEXTILE EN MARQUE BLANCHE */}
      {isSimulatorOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl bg-zinc-950 border border-lime-400/40 p-5 shadow-[0_0_40px_rgba(57,255,20,0.25)] text-white font-mono space-y-4">
            {/* Header Modal */}
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="space-y-0.5">
                <span className="inline-block px-2 py-0.5 rounded bg-lime-400/10 text-lime-400 text-[9px] font-bold tracking-wider uppercase border border-lime-400/30">
                  Marque Blanche Active
                </span>
                <h4 className="text-sm font-black uppercase text-zinc-100">
                  Simulateur de Commande Fan
                </h4>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsSimulatorOpen(false);
                  setSimulatorStep('form');
                }}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {simulatorStep === 'form' ? (
              <div className="space-y-3.5">
                {/* Aperçu produit avec bascule Face / Dos synchronisée */}
                <div className="flex items-center gap-3 p-2.5 rounded-xl bg-zinc-900 border border-zinc-800">
                  <div className="w-16 h-16 rounded-lg bg-black/50 overflow-hidden flex items-center justify-center relative shrink-0">
                    <img
                      src={tshirtTemplateSrc}
                      alt="T-shirt"
                      width={64}
                      height={64}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-contain"
                    />
                    {activeTshirtLogo && (
                      <img
                        src={activeTshirtLogo}
                        alt="Logo"
                        width={40}
                        height={40}
                        loading="lazy"
                        decoding="async"
                        className="absolute object-contain pointer-events-none"
                        style={getHubLogoStyle()}
                      />
                    )}
                  </div>
                  <div className="text-left text-xs min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <div className="font-bold text-zinc-200 truncate">
                        T-shirt Officiel
                      </div>
                      {/* Bouton de bascule compact dans le modal */}
                      <button
                        type="button"
                        id="portal-modal-toggle-view"
                        onClick={() => setTshirtViewSide((s) => (s === 'front' ? 'back' : 'front'))}
                        className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-black/70 hover:bg-black text-lime-400 border border-zinc-800 hover:border-lime-400/60 transition cursor-pointer flex items-center gap-1 shrink-0"
                        title="Basculer la vue"
                      >
                        <span>{tshirtViewSide === 'front' ? '👕 Face' : '🔄 Dos'}</span>
                        <span>➔</span>
                      </button>
                    </div>
                    <div className="text-[10px] text-zinc-400">
                      {tshirtViewSide === 'front' ? 'Marquage Cœur DTF' : 'Dos DTF'} • Coton Lourd 240g
                    </div>
                    <div className="text-[10px] text-lime-400 font-bold mt-0.5">
                      29,00 € TTC
                    </div>
                  </div>
                </div>

                {/* Sélecteur de taille */}
                <div className="space-y-1.5 text-left">
                  <span className="text-[11px] text-zinc-400 uppercase font-bold">Choisir la taille :</span>
                  <div className="grid grid-cols-5 gap-1.5">
                    {(['S', 'M', 'L', 'XL', 'XXL'] as const).map((sz) => (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => setSimulatorSize(sz)}
                        className={`py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${simulatorSize === sz
                          ? 'bg-lime-400 text-black font-black shadow-md'
                          : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'
                          }`}
                      >
                        {sz}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sélecteur de quantité & Prix */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-zinc-400">Quantité :</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSimulatorQty((q) => Math.max(1, q - 1))}
                      className="w-6 h-6 rounded bg-zinc-800 text-zinc-300 hover:text-white flex items-center justify-center font-bold"
                    >
                      -
                    </button>
                    <span className="font-bold w-4 text-center">{simulatorQty}</span>
                    <button
                      type="button"
                      onClick={() => setSimulatorQty((q) => q + 1)}
                      className="w-6 h-6 rounded bg-zinc-800 text-zinc-300 hover:text-white flex items-center justify-center font-bold"
                    >
                      +
                    </button>
                  </div>
                  <span className="text-lime-400 font-black text-sm">
                    {(29 * simulatorQty).toFixed(2)} €
                  </span>
                </div>

                {/* Rassurance Marque Blanche */}
                <div className="p-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800 text-[10px] text-zinc-400 space-y-1 text-left">
                  <div className="flex items-center gap-1.5 text-lime-400 font-bold">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Marque Blanche Totale</span>
                  </div>
                  <p className="leading-tight">
                    Expédition neutre 48h-72h directement chez le destinataire final. Aucune mention Signaid sur l'étiquette ou le colis.
                  </p>
                </div>

                {/* Bouton de simulation */}
                <button
                  type="button"
                  onClick={() => {
                    setSimulatorOrderId(`SIG-ORD-${Math.floor(100000 + Math.random() * 900000)}`);
                    setSimulatorStep('success');
                  }}
                  className="w-full py-3 px-4 rounded-xl bg-lime-400 hover:bg-lime-300 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-lime-400/20 active:scale-95 transition cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5 fill-black" />
                  <span>SIMULER LA COMMANDE CLIENT</span>
                </button>
              </div>
            ) : (
              /* Étape confirmation simulateur */
              <div className="space-y-3.5 text-center py-2">
                <div className="w-12 h-12 rounded-full bg-lime-400/10 border border-lime-400/30 text-lime-400 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>

                <div className="space-y-1">
                  <h4 className="text-sm font-black uppercase text-white">
                    COMMANDE TEST ENREGISTRÉE !
                  </h4>
                  <p className="text-[11px] text-lime-400 font-mono">
                    Réf : {simulatorOrderId}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-left text-[11px] space-y-1.5 text-zinc-300">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Produit :</span>
                    <span className="font-bold">{simulatorQty}x T-shirt ({simulatorSize})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Impression :</span>
                    <span className="text-lime-400">DTF HD Automatisé</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Expédition :</span>
                    <span>Colis neutre 48h</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-zinc-800">
                    <span className="text-zinc-500">Marge Artiste :</span>
                    <span className="text-lime-400 font-bold">+{(14 * simulatorQty).toFixed(2)} € (viré Stripe)</span>
                  </div>
                </div>

                <p className="text-[10px] text-zinc-400 leading-relaxed">
                  Dans votre propre système, vos clients commandent en toute autonomie sans que vous n'ayez aucun stock à gérer.
                </p>

                <div className="space-y-2 pt-1">
                  <button
                    type="button"
                    onClick={() => { window.location.href = '/'; }}
                    className="w-full py-2.5 px-4 rounded-xl bg-lime-400 hover:bg-lime-300 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <span>⚡ DÉPLOYER MON PORTAIL</span>
                    <span>››</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsSimulatorOpen(false);
                      setSimulatorStep('form');
                    }}
                    className="w-full py-2 text-zinc-500 hover:text-zinc-300 text-xs transition cursor-pointer"
                  >
                    Fermer la simulation
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicEventHub;
