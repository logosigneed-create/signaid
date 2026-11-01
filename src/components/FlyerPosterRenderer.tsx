/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Droppaid.ai - Moteur de Rendu Unique du Flyer (Single Source of Truth)
 * Garantit une parité visuelle stricte à 100 % entre le Studio et le Live Hub (/hub/:slug)
 */

import React from 'react';
import {
  EventInput,
  PosterTextItem,
  getDefaultFormatTransforms,
  resolveTextScalesForFormat,
  resolveTextOffsetsYForFormat,
  resolveTextOffsetsXForFormat,
  resolveTextLineSpacingForFormat,
  resolveTextAlignmentForFormat,
  resolveTextAlignmentsForFormat,
  resolveTextColorsForFormat,
  resolveToneFilter,
  computeToneOverlay,
  sanitizeStudioText,
  ensurePosterTexts,
  resolveFontWeight,
  LayoutTemplateId,
  DualityCampaignSlots,
  HeadlinerEventSlots,
  MinimalBrandSlots,
  resolveLayoutTemplateId,
  resolveDualityCampaignSlots,
  resolveHeadlinerEventSlots,
  resolveMinimalBrandSlots,
  mapFieldToTextOffsetKey,
  resolveSecondarySubjectTransform,
  applySecondarySubjectUpdate,
} from '../types';
import { getAutoScaledFontSize } from '../utils/fontScaler';
import { parseTextSegments, getCleanDisplayText } from '../utils/textSegmenter';
import { AutoFitText } from './AutoFitText';
import { OverlayLogo } from './OverlayLogo';
import {
  useAutoLuminance,
  resolveSemanticRoles,
  ACCENT_COLOR_ORANGE,
  COLOR_PURE_WHITE,
  COLOR_DEEP_BLACK,
  CompositionTemplate,
} from '../utils/compositionLayout';

export const BASE_WIDTH = 1080;
export const BASE_HEIGHT = 1350;
export const BASE_ASPECT_RATIO = BASE_WIDTH / BASE_HEIGHT; // 4:5 = 0.8

export interface FlyerPosterSubjectProps {
  image?: string | null;
  scale?: number;
  x?: number;
  y?: number;
  bottomFade?: number;
  opacity?: number;
  contrast?: number;
  saturation?: number;
  brightness?: number;
  hueRotate?: number;
  blendMode?: string;
  isHarmonized?: boolean;
  alignX?: 'left' | 'center' | 'right';
  shadow?: {
    x?: number;
    y?: number;
    blur?: number;
    color?: string;
    opacity?: number;
  } | string | null;
}

export interface FlyerPosterLogoProps {
  image?: string | null;
  scale?: number;
  x?: number;
  y?: number;
  opacity?: number;
  rotation?: number;
  colorMode?: string;
}

export interface FlyerPosterCartoucheProps {
  date?: string;
  time?: string;
  timeSlot?: string;
  venue?: string;
  location?: string;
  calendarUrl?: string;
  venueMapsUrl?: string;
  scale?: number;
  padding?: number;
  color?: string;
  align?: 'left' | 'center' | 'right';
  offsetX?: number;
  offsetY?: number;
  isVisible?: boolean;
}

export interface FlyerPosterRendererProps {
  backgroundImage?: string | null;
  subject?: FlyerPosterSubjectProps | null;
  logo?: FlyerPosterLogoProps | null;
  posterTexts?: PosterTextItem[];
  cartouche?: FlyerPosterCartoucheProps | null;
  format?: 'flyer' | 'a3' | 'post' | string;
  isInteractive?: boolean; // false sur le Live Hub (liens cliquables sans drag), true dans le Studio
  layoutTemplate?: LayoutTemplateId | string;
  templateData?: {
    topTextLeft?: string;
    topTextRight?: string;
    bottomTitle?: string;
    bottomAccent?: string;
    [key: string]: any;
  };

  // Source de données complète (EventInput ou snapshot Firestore)
  projectData?: EventInput;

  // Propriétés interactives du Studio (facultatives)
  activeSection?: string | null;
  activeSubjectTab?: 'primary' | 'secondary' | 'subject1' | 'subject2' | string;
  focusedTextField?: string | null;
  isDraggingField?: string | null;
  isPickingColor?: boolean;
  isDraggingSubject?: boolean;
  onVisualElementClick?: (target: any, subId?: any) => void;
  onSubjectDragStart?: (e?: any, target?: 'primary' | 'secondary') => void;
  onSubjectDragMove?: (x?: any, y?: any) => void;
  onSubjectDragEnd?: (e?: any) => void;
  onUpdateSubjectPosition?: (pos: { x: number; y: number }) => void;
  onTextDragStart?: (e?: any, fieldKey?: any, textItemId?: any) => void;
  onTextDragMove?: (e?: any) => void;
  onTextDragEnd?: (e?: any) => void;
  setInput?: React.Dispatch<React.SetStateAction<EventInput>>;
  containerRef?: React.Ref<HTMLDivElement>;
  isExporting?: boolean;

  // Décoration / override container
  className?: string;
  style?: React.CSSProperties;

  // Propriétés supplémentaires tolérées par flexibilité
  [key: string]: any;
}

export const FlyerPosterRenderer: React.FC<FlyerPosterRendererProps> = ({
  backgroundImage,
  subject,
  logo,
  posterTexts,
  cartouche,
  format = 'flyer',
  isInteractive = false,
  projectData,
  layoutTemplate: propLayoutTemplate,
  templateData: propTemplateData,
  activeSection,
  activeSubjectTab,
  focusedTextField,
  isDraggingField,
  isPickingColor,
  isDraggingSubject,
  onVisualElementClick,
  onSubjectDragStart,
  onSubjectDragMove,
  onSubjectDragEnd,
  onUpdateSubjectPosition,
  onTextDragStart,
  onTextDragMove,
  onTextDragEnd,
  setInput,
  containerRef,
  isExporting = false,
  className = '',
  style = {},
  ...restProps
}) => {
  // Système d'échelle homothétique automatique (Auto-Scaling Box 1080x1350)
  const wrapperRef = React.useRef<HTMLDivElement | null>(null);
  const [scaleFactor, setScaleFactor] = React.useState<number>(1);

  React.useLayoutEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    const updateScale = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0) {
        // Formule de référence homothétique : scaleFactor = parentWidth / 1080
        setScaleFactor(rect.width / BASE_WIDTH);
      }
    };

    updateScale();

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const w = entry.contentRect.width;
          if (w > 0) {
            setScaleFactor(w / BASE_WIDTH);
          }
        }
      });
      ro.observe(el);
    }

    window.addEventListener('resize', updateScale);
    return () => {
      if (ro) ro.disconnect();
      window.removeEventListener('resize', updateScale);
    };
  }, []);

  const assignRefs = React.useCallback(
    (node: HTMLDivElement | null) => {
      wrapperRef.current = node;
      if (typeof containerRef === 'function') {
        containerRef(node);
      } else if (containerRef && 'current' in containerRef) {
        (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
      }
    },
    [containerRef]
  );

  // 1. Fusion prioritaire des données source (projectData ou restProps)
  const data: EventInput & { backgroundUrl?: string } = (projectData || (restProps as EventInput)) as any;
  const input = data;

  // 2. Décor / Fond d'ambiance
  const rawBg = backgroundImage !== undefined
    ? backgroundImage
    : ((data as any).backgroundUrl || data.customBackground || data.backgroundImage || data.bgImage || null);
  const backgroundUrl = (rawBg && typeof rawBg === 'string') ? rawBg.trim() : '';

  if (!(data as any).backgroundUrl && backgroundUrl) {
    (data as any).backgroundUrl = backgroundUrl;
  }

  const isToneActive = (restProps.isBackgroundToneEnabled !== false) && (data.isBackgroundToneEnabled !== false);
  const currentTone = typeof restProps.backgroundTone === 'number'
    ? restProps.backgroundTone
    : (typeof data.backgroundTone === 'number' ? data.backgroundTone : 0.5);
  const bgBrightness = typeof restProps.backgroundBrightness === 'number'
    ? restProps.backgroundBrightness
    : (typeof data.backgroundBrightness === 'number' ? data.backgroundBrightness : 1.0);

  const toneOverlay = computeToneOverlay(currentTone, isToneActive, bgBrightness);
  const isToneCenter = toneOverlay.isNeutral || Math.abs(currentTone - 0.5) < 0.03 || currentTone === 0.5;
  const isLightCanvas = isToneActive && !isToneCenter && currentTone < 0.48;
  const toneRgb = isToneCenter ? 0 : Math.round(255 * (1 - currentTone));
  const canvasBgColor = isToneActive && !isToneCenter
    ? `rgb(${toneRgb}, ${toneRgb}, ${toneRgb})`
    : 'transparent';

  const primaryColor = data.themeColor || data.primaryColor || data.accentColor || data.dynamicTheme?.primaryAccent || (data.dynamicTheme as any)?.themeColor || restProps.accentColor || '#FF6B00';

  // 2b. Auto-Luminance par Computer Vision & Gabarits d'Intention Intelligents
  const autoLuminance = useAutoLuminance(backgroundUrl, currentTone, isToneActive, bgBrightness);
  const { topLeftColor, topRightColor } = autoLuminance;
  const layoutTemplateId: LayoutTemplateId = (propLayoutTemplate as LayoutTemplateId) || resolveLayoutTemplateId(data) || 'duality_campaign';
  const layoutTemplate: LayoutTemplateId = layoutTemplateId;
  const currentTemplateData = {
    topTextLeft: propTemplateData?.topTextLeft ?? data.templateData?.topTextLeft ?? data.dualityCampaignSlots?.topTextLeft ?? data.topTextLeft ?? data.topDualLeft ?? 'DESCENDRE DANS LA RUE.',
    topTextRight: propTemplateData?.topTextRight ?? data.templateData?.topTextRight ?? data.dualityCampaignSlots?.topTextRight ?? data.topTextRight ?? data.topDualRight ?? 'SE FAIRE ENTENDRE AUTREMENT.',
    bottomTitle: propTemplateData?.bottomTitle ?? data.templateData?.bottomTitle ?? data.dualityCampaignSlots?.bottomTitle ?? data.bottomTitle ?? data.mainTitle ?? 'CHOISISSEZ',
    bottomAccent: propTemplateData?.bottomAccent ?? data.templateData?.bottomAccent ?? data.dualityCampaignSlots?.bottomAccent ?? data.bottomAccent ?? data.accentWord ?? 'VOTRE VOIE.',
  };
  const templateData = currentTemplateData;

  console.log('Rendering template:', layoutTemplate, templateData);

  const dualitySlots = {
    topTextLeft: templateData.topTextLeft,
    topTextRight: templateData.topTextRight,
    bottomTitle: templateData.bottomTitle,
    bottomAccent: templateData.bottomAccent,
  };
  const headlinerSlots = resolveHeadlinerEventSlots(data);
  const minimalSlots = resolveMinimalBrandSlots(data);
  const semanticRoles = resolveSemanticRoles(data);
  const compositionTemplate: CompositionTemplate = (layoutTemplateId === 'duality_campaign' || layoutTemplateId === 'headliner_event' || layoutTemplateId === 'minimal_brand')
    ? (layoutTemplateId === 'headliner_event' ? 'headliner' : layoutTemplateId === 'minimal_brand' ? 'minimalist' : 'campaign_dual')
    : (data.compositionTemplate || 'campaign_dual');

  // 3. Résolution dynamique du format et transformations du Sujet DJ (Multi-formats: Post, A3, Story, Banner)
  const resolvedFormat = (format === 'square' ? 'post' : format === 'flyer' ? 'a3' : format) || 'a3';
  const targetFormatKey = (['post', 'story', 'banner', 'a3'].includes(resolvedFormat) ? resolvedFormat : 'a3') as 'post' | 'story' | 'banner' | 'a3';
  const isPostFormat = targetFormatKey === 'post';
  const isStoryFormat = targetFormatKey === 'story';
  const isBannerFormat = targetFormatKey === 'banner';
  const isA3Format = targetFormatKey === 'a3';

  // Hiérarchie dynamique de superposition des calques Sujet 1 vs Sujet 2
  const isSubject1InFront =
    data.foregroundSubject === 'subject1' ||
    data.subjectLayerOrder === '1_over_2' ||
    data.subjectStackOrder === 'primary-front';

  const masterScale = data.formatTransforms?.post?.scale ??
    (typeof data.djPhotoScale === 'number'
      ? data.djPhotoScale
      : typeof data.subjectScale === 'number'
        ? data.subjectScale
        : 1.0);
  const masterOffsetY = data.formatTransforms?.post?.offsetY ??
    (typeof data.djPhotoOffsetY === 'number'
      ? data.djPhotoOffsetY
      : typeof data.subjectPositionY === 'number'
        ? data.subjectPositionY
        : 0);
  const masterOffsetX = data.formatTransforms?.post?.offsetX ??
    (typeof data.djPhotoOffsetX === 'number'
      ? data.djPhotoOffsetX
      : typeof data.subjectPositionX === 'number'
        ? data.subjectPositionX
        : 0);

  const defaultTransforms = getDefaultFormatTransforms(masterScale, masterOffsetY, masterOffsetX);
  const configuredTransform = data.formatTransforms?.[targetFormatKey] || (isA3Format ? (data.formatTransforms as any)?.flyer : undefined);
  const isLegacyDemoTransform = isA3Format && configuredTransform && configuredTransform.scale === 1 && (configuredTransform.offsetY === -18 || configuredTransform.offsetY === -19);
  const activeTransforms = configuredTransform && configuredTransform.isCustom && !isLegacyDemoTransform
    ? configuredTransform
    : defaultTransforms[targetFormatKey] || {
        scale: masterScale,
        offsetY: 0,
        offsetX: 0,
        alignX: 'center',
        isCustom: false,
      };

  const subjectImage = subject?.image !== undefined
    ? subject.image
    : (data.djPhoto || null);
  const subjectScale = subject?.scale ?? activeTransforms.scale;
  const subjectOffsetY = subject?.y ?? activeTransforms.offsetY;
  const subjectOffsetX = subject?.x ?? (activeTransforms.offsetX ?? 0);
  const subjectAlignX = subject?.alignX ?? activeTransforms.alignX ?? 'center';

  // Décor (Arrière-plan) : décalages panoramiques Drag & Drop bornés rigoureusement entre -12% et +12%
  const rawBgOffsetX = typeof input.backgroundOffsetX === 'number'
    ? input.backgroundOffsetX
    : (typeof data.backgroundOffsetX === 'number' ? data.backgroundOffsetX : 0);
  const rawBgOffsetY = typeof input.backgroundOffsetY === 'number'
    ? input.backgroundOffsetY
    : (typeof data.backgroundOffsetY === 'number' ? data.backgroundOffsetY : 0);

  const bgOffsetX = Math.max(-12, Math.min(12, rawBgOffsetX));
  const bgOffsetY = Math.max(-12, Math.min(12, rawBgOffsetY));

  (input as any).backgroundOffsetX = bgOffsetX;
  (input as any).backgroundOffsetY = bgOffsetY;
  (data as any).backgroundOffsetX = bgOffsetX;
  (data as any).backgroundOffsetY = bgOffsetY;

  // Échelle fixe et couvrante avec marge de sécurité stable (1.15 min, absorbant dynamiquement les décalages de translation sans bords noirs)
  const maxBgOffset = Math.max(Math.abs(bgOffsetX), Math.abs(bgOffsetY));
  const dynamicSafetyScale = Math.max(1.15, 1.15 + (maxBgOffset / 100) * 0.4);
  const bgScale = dynamicSafetyScale * (data.backgroundScale ?? 1.0);

  // État et contrôleurs de glisser-déposer (Drag & Drop) intuitif du Sujet 1
  const [isLocalDraggingSubject, setIsLocalDraggingSubject] = React.useState(false);
  const subjectDragRef = React.useRef<{
    startX: number;
    startY: number;
    initialOffsetX: number;
    initialOffsetY: number;
    containerWidth: number;
    containerHeight: number;
    hasMoved: boolean;
  } | null>(null);

  // Nettoyage de sécurité des écouteurs globaux si le composant est démonté pendant un drag
  const dragCleanupRef = React.useRef<(() => void) | null>(null);
  const dragCleanup2Ref = React.useRef<(() => void) | null>(null);
  React.useEffect(() => {
    return () => {
      if (dragCleanupRef.current) {
        dragCleanupRef.current();
        dragCleanupRef.current = null;
      }
      if (dragCleanup2Ref.current) {
        dragCleanup2Ref.current();
        dragCleanup2Ref.current = null;
      }
    };
  }, []);

  const handleSubjectStart = (
    clientX: number,
    clientY: number,
    targetEl: HTMLElement,
    originalEvent: any
  ) => {
    if (!isInteractive) return;

    // Mesure de la boîte englobante du canevas pour convertir les pixels en pourcentages
    const container =
      (targetEl.closest('[data-poster-container="true"]') as HTMLElement | null) ||
      (targetEl.closest('[data-poster-virtual-canvas="true"]') as HTMLElement | null) ||
      wrapperRef.current ||
      targetEl.parentElement;

    const rect = container?.getBoundingClientRect() || targetEl.getBoundingClientRect();
    const containerWidth = rect.width > 0 ? rect.width : BASE_WIDTH;
    const containerHeight = rect.height > 0 ? rect.height : BASE_HEIGHT;

    subjectDragRef.current = {
      startX: clientX,
      startY: clientY,
      initialOffsetX: subjectOffsetX,
      initialOffsetY: subjectOffsetY,
      containerWidth,
      containerHeight,
      hasMoved: false,
    };

    if (!isSubjectActive) {
      onVisualElementClick?.('subject');
    }

    onSubjectDragStart?.(originalEvent, 'primary');

    const handleWindowMove = (moveEvt: MouseEvent | TouchEvent) => {
      const state = subjectDragRef.current;
      if (!state) return;

      const curClientX = 'touches' in moveEvt ? moveEvt.touches[0].clientX : moveEvt.clientX;
      const curClientY = 'touches' in moveEvt ? moveEvt.touches[0].clientY : moveEvt.clientY;

      const deltaX = curClientX - state.startX;
      const deltaY = curClientY - state.startY;

      if (!state.hasMoved) {
        if (Math.hypot(deltaX, deltaY) > 2) {
          state.hasMoved = true;
          setIsLocalDraggingSubject(true);
        } else {
          return;
        }
      }

      if (moveEvt.cancelable) {
        moveEvt.preventDefault();
      }

      const deltaPercentX = (deltaX / state.containerWidth) * 100;
      const deltaPercentY = (deltaY / state.containerHeight) * 100;

      const newX = Math.round((state.initialOffsetX + deltaPercentX) * 10) / 10;
      const newY = Math.round((state.initialOffsetY + deltaPercentY) * 10) / 10;

      const clampedX = Math.max(-80, Math.min(80, newX));
      const clampedY = Math.max(-60, Math.min(60, newY));

      if (onUpdateSubjectPosition) {
        onUpdateSubjectPosition({ x: clampedX, y: clampedY });
      } else if (setInput) {
        setInput((prev) => {
          const existing = prev.formatTransforms?.[targetFormatKey];
          return {
            ...prev,
            djPhotoOffsetY: clampedY,
            formatTransforms: {
              ...(prev.formatTransforms || {}),
              [targetFormatKey]: {
                ...(existing || {}),
                scale: existing?.scale ?? prev.djPhotoScale ?? 1.0,
                offsetX: clampedX,
                offsetY: clampedY,
                isCustom: true,
              },
            },
          };
        });
      }
      onSubjectDragMove?.(curClientX, curClientY);
    };

    const handleWindowUp = (upEvt: MouseEvent | TouchEvent) => {
      cleanup();
      const state = subjectDragRef.current;
      const didMove = state?.hasMoved;
      subjectDragRef.current = null;
      setIsLocalDraggingSubject(false);

      if (didMove) {
        onSubjectDragEnd?.(upEvt);
      } else {
        onVisualElementClick?.('subject');
      }
    };

    const cleanup = () => {
      window.removeEventListener('mousemove', handleWindowMove);
      window.removeEventListener('mouseup', handleWindowUp);
      window.removeEventListener('touchmove', handleWindowMove);
      window.removeEventListener('touchend', handleWindowUp);
      window.removeEventListener('touchcancel', handleWindowUp);
      dragCleanupRef.current = null;
    };

    dragCleanupRef.current = cleanup;
    window.addEventListener('mousemove', handleWindowMove, { passive: false });
    window.addEventListener('mouseup', handleWindowUp);
    window.addEventListener('touchmove', handleWindowMove, { passive: false });
    window.addEventListener('touchend', handleWindowUp);
    window.addEventListener('touchcancel', handleWindowUp);
  };

  const handleSubjectMouseDown = (e: React.MouseEvent<HTMLElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    handleSubjectStart(e.clientX, e.clientY, e.currentTarget, e);
  };

  const handleSubjectTouchStart = (e: React.TouchEvent<HTMLElement>) => {
    if (e.touches.length !== 1) return;
    e.stopPropagation();
    handleSubjectStart(e.touches[0].clientX, e.touches[0].clientY, e.currentTarget, e);
  };

  const handleSubjectPointerDown = (e: React.PointerEvent<HTMLElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    e.preventDefault();
    e.stopPropagation();
    handleSubjectStart(e.clientX, e.clientY, e.currentTarget, e);
  };

  // Second sujet (duo / B2B) si présent
  const secondarySubjectImage = data.secondaryDjPhoto || null;
  const secondaryTr = resolveSecondarySubjectTransform(
    data,
    targetFormatKey,
    subjectImage ? { scale: subjectScale, offsetY: subjectOffsetY, offsetX: subjectOffsetX, alignX: subjectAlignX } : null
  );
  const secondarySubjectScale = data.subject2Scale ?? data.secondaryDjPhotoScale ?? secondaryTr.scale;
  const secondarySubjectOffsetY = data.subject2OffsetY ?? data.secondaryDjPhotoOffsetY ?? secondaryTr.offsetY ?? 0;
  const secondarySubjectOffsetX = data.subject2OffsetX ?? data.secondaryDjPhotoOffsetX ?? secondaryTr.offsetX ?? 0;

  // État et contrôleurs de glisser-déposer (Drag & Drop) intuitif du Sujet 2
  const [isLocalDraggingSubject2, setIsLocalDraggingSubject2] = React.useState(false);
  const subject2DragRef = React.useRef<{
    startX: number;
    startY: number;
    initialOffsetX: number;
    initialOffsetY: number;
    containerWidth: number;
    containerHeight: number;
    hasMoved: boolean;
  } | null>(null);

  const handleSubject2Start = (
    clientX: number,
    clientY: number,
    targetEl: HTMLElement,
    originalEvent: any
  ) => {
    if (!isInteractive) return;

    const container =
      (targetEl.closest('[data-poster-container="true"]') as HTMLElement | null) ||
      (targetEl.closest('[data-poster-virtual-canvas="true"]') as HTMLElement | null) ||
      wrapperRef.current ||
      targetEl.parentElement;

    const rect = container?.getBoundingClientRect() || targetEl.getBoundingClientRect();
    const containerWidth = rect.width > 0 ? rect.width : BASE_WIDTH;
    const containerHeight = rect.height > 0 ? rect.height : BASE_HEIGHT;

    subject2DragRef.current = {
      startX: clientX,
      startY: clientY,
      initialOffsetX: secondarySubjectOffsetX,
      initialOffsetY: secondarySubjectOffsetY,
      containerWidth,
      containerHeight,
      hasMoved: false,
    };

    onVisualElementClick?.('subject2' as any);

    const handleWindowMove = (moveEvt: MouseEvent | TouchEvent) => {
      const state = subject2DragRef.current;
      if (!state) return;

      const curClientX = 'touches' in moveEvt ? moveEvt.touches[0].clientX : moveEvt.clientX;
      const curClientY = 'touches' in moveEvt ? moveEvt.touches[0].clientY : moveEvt.clientY;

      const deltaX = curClientX - state.startX;
      const deltaY = curClientY - state.startY;

      if (!state.hasMoved) {
        if (Math.hypot(deltaX, deltaY) > 2) {
          state.hasMoved = true;
          setIsLocalDraggingSubject2(true);
        } else {
          return;
        }
      }

      if (moveEvt.cancelable) {
        moveEvt.preventDefault();
      }

      const deltaPercentX = (deltaX / state.containerWidth) * 100;
      const deltaPercentY = (deltaY / state.containerHeight) * 100;

      const newX = Math.round((state.initialOffsetX + deltaPercentX) * 10) / 10;
      const newY = Math.round((state.initialOffsetY + deltaPercentY) * 10) / 10;

      const clampedX = Math.max(-80, Math.min(80, newX));
      const clampedY = Math.max(-80, Math.min(100, newY));

      if (setInput) {
        setInput((prev) => {
          const updated = applySecondarySubjectUpdate(
            prev,
            targetFormatKey,
            { scale: subjectScale, offsetY: subjectOffsetY, offsetX: subjectOffsetX, alignX: subjectAlignX },
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
      }
      onSubjectDragMove?.(deltaX, deltaY);
    };

    const handleWindowUp = (upEvt: MouseEvent | TouchEvent) => {
      cleanup();
      const state = subject2DragRef.current;
      const didMove = state?.hasMoved;
      subject2DragRef.current = null;
      setIsLocalDraggingSubject2(false);

      if (didMove) {
        onSubjectDragEnd?.(upEvt);
      } else {
        onVisualElementClick?.('subject2' as any);
      }
    };

    const cleanup = () => {
      window.removeEventListener('mousemove', handleWindowMove);
      window.removeEventListener('mouseup', handleWindowUp);
      window.removeEventListener('touchmove', handleWindowMove);
      window.removeEventListener('touchend', handleWindowUp);
      window.removeEventListener('touchcancel', handleWindowUp);
      dragCleanup2Ref.current = null;
    };

    dragCleanup2Ref.current = cleanup;
    window.addEventListener('mousemove', handleWindowMove, { passive: false });
    window.addEventListener('mouseup', handleWindowUp);
    window.addEventListener('touchmove', handleWindowMove, { passive: false });
    window.addEventListener('touchend', handleWindowUp);
    window.addEventListener('touchcancel', handleWindowUp);
  };

  const handleSubject2MouseDown = (e: React.MouseEvent<HTMLElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    handleSubject2Start(e.clientX, e.clientY, e.currentTarget, e);
  };

  const handleSubject2TouchStart = (e: React.TouchEvent<HTMLElement>) => {
    if (e.touches.length !== 1) return;
    e.stopPropagation();
    handleSubject2Start(e.touches[0].clientX, e.touches[0].clientY, e.currentTarget, e);
  };

  const handleSubject2PointerDown = (e: React.PointerEvent<HTMLElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    e.preventDefault();
    e.stopPropagation();
    handleSubject2Start(e.clientX, e.clientY, e.currentTarget, e);
  };

  // État et contrôleurs de glisser-déposer (Drag & Drop) intuitif du Décor (Arrière-plan)
  const [isLocalDraggingBg, setIsLocalDraggingBg] = React.useState(false);
  const bgDragRef = React.useRef<{
    startX: number;
    startY: number;
    initialOffsetX: number;
    initialOffsetY: number;
    containerWidth: number;
    containerHeight: number;
    hasMoved: boolean;
  } | null>(null);

  const handleBgStart = (
    clientX: number,
    clientY: number,
    targetEl: HTMLElement,
    originalEvent: any
  ) => {
    if (!isInteractive) return;

    const container =
      (targetEl.closest('[data-poster-container="true"]') as HTMLElement | null) ||
      (targetEl.closest('[data-poster-virtual-canvas="true"]') as HTMLElement | null) ||
      wrapperRef.current ||
      targetEl.parentElement;

    const rect = container?.getBoundingClientRect() || targetEl.getBoundingClientRect();
    const containerWidth = rect.width > 0 ? rect.width : BASE_WIDTH;
    const containerHeight = rect.height > 0 ? rect.height : (isA3Format ? 1528 : BASE_HEIGHT);

    bgDragRef.current = {
      startX: clientX,
      startY: clientY,
      initialOffsetX: data.backgroundOffsetX ?? 0,
      initialOffsetY: data.backgroundOffsetY ?? 0,
      containerWidth,
      containerHeight,
      hasMoved: false,
    };

    const handleWindowMove = (moveEvt: MouseEvent | TouchEvent) => {
      const state = bgDragRef.current;
      if (!state) return;

      const curClientX = 'touches' in moveEvt ? moveEvt.touches[0].clientX : moveEvt.clientX;
      const curClientY = 'touches' in moveEvt ? moveEvt.touches[0].clientY : moveEvt.clientY;

      const deltaX = curClientX - state.startX;
      const deltaY = curClientY - state.startY;

      if (!state.hasMoved) {
        if (Math.hypot(deltaX, deltaY) > 2) {
          state.hasMoved = true;
          setIsLocalDraggingBg(true);
        } else {
          return;
        }
      }

      if (moveEvt.cancelable) {
        moveEvt.preventDefault();
      }

      const deltaPercentX = (deltaX / state.containerWidth) * 100;
      const deltaPercentY = (deltaY / state.containerHeight) * 100;

      const newX = Math.round((state.initialOffsetX + deltaPercentX) * 10) / 10;
      const newY = Math.round((state.initialOffsetY + deltaPercentY) * 10) / 10;

      const clampedX = Math.max(-12, Math.min(12, newX));
      const clampedY = Math.max(-12, Math.min(12, newY));

      if (setInput) {
        setInput((prev) => ({
          ...prev,
          backgroundOffsetX: clampedX,
          backgroundOffsetY: clampedY,
        }));
      }
    };

    const handleWindowUp = () => {
      cleanup();
      const state = bgDragRef.current;
      const didMove = state?.hasMoved;
      bgDragRef.current = null;
      setIsLocalDraggingBg(false);

      if (!didMove) {
        onVisualElementClick?.('decor');
      }
    };

    const cleanup = () => {
      window.removeEventListener('mousemove', handleWindowMove);
      window.removeEventListener('mouseup', handleWindowUp);
      window.removeEventListener('touchmove', handleWindowMove);
      window.removeEventListener('touchend', handleWindowUp);
      window.removeEventListener('touchcancel', handleWindowUp);
    };

    window.addEventListener('mousemove', handleWindowMove, { passive: false });
    window.addEventListener('mouseup', handleWindowUp);
    window.addEventListener('touchmove', handleWindowMove, { passive: false });
    window.addEventListener('touchend', handleWindowUp);
    window.addEventListener('touchcancel', handleWindowUp);
  };

  const handleBgMouseDown = (e: React.MouseEvent<HTMLElement>) => {
    if (e.button !== 0) return;
    handleBgStart(e.clientX, e.clientY, e.currentTarget, e);
  };

  const handleBgTouchStart = (e: React.TouchEvent<HTMLElement>) => {
    if (e.touches.length !== 1) return;
    handleBgStart(e.touches[0].clientX, e.touches[0].clientY, e.currentTarget, e);
  };

  const handleBgPointerDown = (e: React.PointerEvent<HTMLElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    handleBgStart(e.clientX, e.clientY, e.currentTarget, e);
  };

  // Opacité, Dégradé Fondu Bas et Blend-Mode du Sujet 1
  const subjectOpacity = typeof subject?.opacity === 'number'
    ? subject.opacity
    : (typeof data.djPhotoOpacity === 'number' ? data.djPhotoOpacity : 1);

  const subjectFade = typeof subject?.bottomFade === 'number'
    ? subject.bottomFade
    : (typeof (data as any).subjectBottomFade === 'number'
        ? (data as any).subjectBottomFade
        : (typeof data.subjectFadeIntensity === 'number'
            ? data.subjectFadeIntensity
            : (typeof (data as any).bottomFade === 'number' ? (data as any).bottomFade : 0)));

  const s1FadeMaskStyle: React.CSSProperties = subjectFade > 0
    ? {
        WebkitMaskImage: `linear-gradient(to top, transparent 0%, black ${subjectFade}%, black 100%)`,
        maskImage: `linear-gradient(to top, transparent 0%, black ${subjectFade}%, black 100%)`,
      }
    : {
        WebkitMaskImage: 'none',
        maskImage: 'none',
      };

  // Dégradé Fondu Bas du Sujet 2
  const subject2Fade = typeof (data as any).secondarySubjectFadeIntensity === 'number'
    ? (data as any).secondarySubjectFadeIntensity
    : (typeof (data as any).subject2BottomFade === 'number'
        ? (data as any).subject2BottomFade
        : (typeof (data as any).secondaryBottomFade === 'number'
            ? (data as any).secondaryBottomFade
            : 0));

  const s2FadeMaskStyle: React.CSSProperties = subject2Fade > 0
    ? {
        WebkitMaskImage: `linear-gradient(to top, transparent 0%, black ${subject2Fade}%, black 100%)`,
        maskImage: `linear-gradient(to top, transparent 0%, black ${subject2Fade}%, black 100%)`,
      }
    : {
        WebkitMaskImage: 'none',
        maskImage: 'none',
      };

  const isHarmonized = subject?.isHarmonized ?? (data.isSubjectHarmonized ?? false);
  const rawBlendMode = subject?.blendMode || data.subjectBlendMode || 'normal';
  const blendMode = (rawBlendMode === 'auto' ? 'normal' : rawBlendMode) as React.CSSProperties['mixBlendMode'];

  // 4. Typographie & Textes (Synchronisés sur le format actif)
  const resolvedTextScales = resolveTextScalesForFormat(data, targetFormatKey);
  const resolvedOffsetsY = resolveTextOffsetsYForFormat(data, targetFormatKey);
  const resolvedOffsetsX = resolveTextOffsetsXForFormat(data, targetFormatKey);
  const resolvedLineSpacing = resolveTextLineSpacingForFormat(data, targetFormatKey);
  const resolvedAlignment = resolveTextAlignmentForFormat(data, targetFormatKey);
  const resolvedAlignments = resolveTextAlignmentsForFormat(data, targetFormatKey);
  const resolvedColors = resolveTextColorsForFormat(data, targetFormatKey);

  const getTypographyConfig = () => {
    const rawStyle = (data.typographyStyle || restProps.typographyStyle || 'futur').toLowerCase();
    const style = rawStyle === 'hard' ? 'techno' : rawStyle;
    const textMain = isLightCanvas ? 'text-black' : 'text-white';
    const textSub = isLightCanvas ? 'text-zinc-800' : 'text-zinc-300';
    const mainTextColor = isLightCanvas ? '#000000' : '#ffffff';

    // Accroches supérieures : Style éditorial haut de gamme (Sans-serif géométrique, Graisse 600, Crénage 0.28em, Majuscule)
    const editorialBadgeClass = `font-sans uppercase font-semibold tracking-[0.28em] ${textSub} text-[2.2cqi]`;
    const editorialSubClass = `font-sans uppercase font-medium tracking-[0.22em] ${textSub} text-[2.6cqi]`;

    if (style === 'techno') {
      return {
        titleClass: `font-black tracking-[0.04em] uppercase text-[7cqi] leading-[1.05]`,
        djClass: `font-black tracking-[0.04em] uppercase ${textMain} text-[6.5cqi] leading-[1.05]`,
        badgeClass: editorialBadgeClass,
        subClass: editorialSubClass,
        titleStyle: {
          fontFamily: "'Impact', 'Inter Tight', 'Arial Black', -apple-system, sans-serif",
          color: mainTextColor,
          letterSpacing: '0.04em',
          textShadow: '0 2px 4px rgba(0,0,0,0.85), 0 1px 2px rgba(0,0,0,0.95)',
        },
        djStyle: {
          fontFamily: "'Impact', 'Inter Tight', 'Arial Black', -apple-system, sans-serif",
          color: mainTextColor,
          letterSpacing: '0.04em',
          textShadow: '0 2px 4px rgba(0,0,0,0.85)',
        },
      };
    }
    if (style === 'urban') {
      return {
        titleClass: `tracking-wider uppercase text-[7cqi] leading-[1.05]`,
        djClass: `tracking-wide uppercase ${textMain} text-[6.5cqi] leading-[1.05]`,
        badgeClass: editorialBadgeClass,
        subClass: editorialSubClass,
        titleStyle: {
          fontFamily: "'Permanent Marker', 'Impact', cursive, sans-serif",
          color: mainTextColor,
          textShadow: '0 2px 4px rgba(0,0,0,0.85)',
        },
        djStyle: {
          fontFamily: "'Permanent Marker', 'Impact', cursive, sans-serif",
          color: mainTextColor,
          textShadow: '0 2px 4px rgba(0,0,0,0.85)',
        },
      };
    }
    return {
      titleClass: `font-black tracking-[0.04em] uppercase text-[7cqi] leading-[1.05]`,
      djClass: `font-black tracking-[0.04em] uppercase ${textMain} text-[6.5cqi] leading-[1.05]`,
      badgeClass: editorialBadgeClass,
      subClass: editorialSubClass,
      titleStyle: {
        fontFamily: "'Impact', 'Syne', 'Inter Tight', -apple-system, sans-serif",
        color: mainTextColor,
        letterSpacing: '0.04em',
        textShadow: '0 2px 4px rgba(0,0,0,0.85), 0 1px 2px rgba(0,0,0,0.95)',
      },
      djStyle: {
        fontFamily: "'Impact', 'Syne', 'Inter Tight', -apple-system, sans-serif",
        color: mainTextColor,
        letterSpacing: '0.04em',
        textShadow: '0 2px 4px rgba(0,0,0,0.85)',
      },
    };
  };

  const typo = getTypographyConfig();

  // Liste des textes du poster
  const flyerTexts: PosterTextItem[] = (posterTexts && posterTexts.length > 0)
    ? posterTexts
    : (Array.isArray(data.posterTexts) && data.posterTexts.length > 0
      ? data.posterTexts
      : ensurePosterTexts(data));

  const isTitleBehindSubject = data.titleLayerOrder !== 'front-subject';

  // 5. Cartouche (Date / Heure / Lieu)
  const cartoucheDate = cartouche?.date !== undefined ? cartouche.date : (data.date || '');
  const cartoucheTime = cartouche?.time !== undefined ? cartouche.time : (data.time || data.timeSlot || '');
  const cartoucheVenue = cartouche?.venue !== undefined ? cartouche.venue : (data.venue || data.location || '');
  const cartoucheCalendarUrl = cartouche?.calendarUrl !== undefined ? cartouche.calendarUrl : (data.calendarUrl || '');
  const cartoucheMapsUrl = cartouche?.venueMapsUrl !== undefined ? cartouche.venueMapsUrl : (data.venueMapsUrl || '');
  const cartoucheScale = cartouche?.scale ?? data.cartoucheScale ?? resolvedTextScales.infoBadge ?? 1.0;
  const cartouchePadding = cartouche?.padding ?? data.cartouchePadding ?? 1.0;
  const cartoucheColor = cartouche?.color ?? resolvedColors.infoBadge;
  const cartoucheOffsetX = cartouche?.offsetX ?? resolvedOffsetsX.infoBadge ?? 0;
  const cartoucheOffsetY = cartouche?.offsetY ?? resolvedOffsetsY.infoBadge ?? 0;
  const hasCartoucheDate = Boolean(cartoucheDate && cartoucheDate.trim().length > 0);
  const hasCartoucheTime = Boolean(cartoucheTime && cartoucheTime.trim().length > 0);
  const hasCartoucheVenue = Boolean(cartoucheVenue && cartoucheVenue.trim().length > 0);
  const effectiveFocusedField = (isInteractive && !isExporting) ? focusedTextField : null;
  const isDateFocused = Boolean(effectiveFocusedField === 'date');
  const isTimeFocused = Boolean(effectiveFocusedField === 'timeSlot');
  const isVenueFocused = Boolean(effectiveFocusedField === 'venue');
  const isInfoBadgeFocused = Boolean(effectiveFocusedField === 'infoBadge');
  const hasCartoucheContent = Boolean(
    hasCartoucheDate || isDateFocused ||
    hasCartoucheTime || isTimeFocused ||
    hasCartoucheVenue || isVenueFocused ||
    isInfoBadgeFocused
  );

  const infoBadgeStyle: React.CSSProperties = isLightCanvas
    ? {
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: 'rgba(0, 0, 0, 0.2)',
      color: '#18181b',
      backdropFilter: 'blur(16px)',
    }
    : {
      backgroundColor: 'rgba(0, 0, 0, 0.92)',
      borderColor: 'rgba(255, 255, 255, 0.25)',
      color: '#f4f4f5',
      backdropFilter: 'blur(16px)',
    };

  // Sections contextuelles strictes (Décor = volet 1, Sujet = volet 2, Textes = volet 5)
  // Détection universelle de la section décor active :
  const isDecorActive = activeSection === 'decor' || activeSection === 'background' || activeSection === 'fond' || !activeSection;
  const isDecorSection = isDecorActive;
  const isSubjectSection = activeSection === 'subject' || activeSection === 'subject2';
  const isTextSection = activeSection === 'text' || activeSection === 'texts' || activeSection === 'textSizes';
  const isLogoSection = activeSection === 'logo';

  // Gestion de priorité d'interaction selon l'onglet actif (Sujet 1 vs Sujet 2)
  const isSubject2Tab = activeSubjectTab === 'subject2' || activeSubjectTab === 'secondary' || activeSection === 'subject2';
  const isSubject1Tab = !isSubject2Tab;

  // 1. Décor réactif quand la section décor est active (ou volet 1 ouvert / par défaut)
  const isDecorPointerActive = isInteractive && !isExporting && isDecorActive;

  // 2. Sujets réactifs STRICTEMENT quand activeSection === 'subject' (ou volet 2 ouvert)
  const isS1PointerActive = isInteractive && !isExporting && isSubjectSection && isSubject1Tab;
  const isS2PointerActive = isInteractive && !isExporting && isSubjectSection && isSubject2Tab;
  const isSubjectActive = isS1PointerActive;
  const isSubject2Active = isS2PointerActive;

  // Hiérarchie visuelle z-index Sujet 1 vs Sujet 2
  const s1ZIndex = isSubject2Tab ? 20 : (isSubject1InFront ? 22 : 20);
  const s2ZIndex = isSubject2Tab ? 23 : (isSubject1InFront ? 20 : 22);

  // 3. Textes réactifs STRICTEMENT quand activeSection === 'text' (ou volet 5 ouvert)
  const isTextsActive = isInteractive && !isExporting && isTextSection;
  const canInteractTexts = isTextsActive;
  const isLogoActive = isInteractive && !isExporting && isLogoSection;

  // Contrôleurs de glisser-déposer interne pour les blocs de texte si non passés par le parent
  const textDragRef = React.useRef<{
    startY: number;
    startX: number;
    initialOffset: number;
    field: string;
    containerWidth: number;
    hasMoved: boolean;
    pointerId: number;
  } | null>(null);

  const handleInternalTextPointerDown = (
    e: React.PointerEvent<HTMLElement>,
    field: string,
    canonicalKey?: string
  ) => {
    if (onTextDragStart) {
      onTextDragStart(e, field, canonicalKey);
      return;
    }
    if (!isInteractive || !setInput) return;
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    e.stopPropagation();

    if (!isTextsActive) {
      onVisualElementClick?.('textSizes', canonicalKey || field);
    }

    const targetEl = e.currentTarget;
    const container = targetEl.closest('[data-poster-container="true"]') || wrapperRef.current;
    const rect = container?.getBoundingClientRect();
    const containerWidth = rect && rect.width > 0 ? rect.width : BASE_WIDTH;
    const resolvedKey = mapFieldToTextOffsetKey(field);
    const initialOffsets = resolveTextOffsetsYForFormat(data, targetFormatKey);
    const initialOffset = initialOffsets[resolvedKey as keyof typeof initialOffsets] ?? 0;

    try {
      targetEl.setPointerCapture(e.pointerId);
    } catch { }

    textDragRef.current = {
      startY: e.clientY,
      startX: e.clientX,
      initialOffset,
      field: resolvedKey,
      containerWidth,
      hasMoved: false,
      pointerId: e.pointerId,
    };
  };

  const handleInternalTextPointerMove = (e: React.PointerEvent<HTMLElement>) => {
    if (onTextDragMove) {
      onTextDragMove(e);
      return;
    }
    const state = textDragRef.current;
    if (!state || state.pointerId !== e.pointerId || !setInput) return;
    e.stopPropagation();

    const deltaYPx = e.clientY - state.startY;
    const deltaXPx = e.clientX - state.startX;

    if (!state.hasMoved) {
      if (Math.hypot(deltaXPx, deltaYPx) > 3) {
        state.hasMoved = true;
      } else {
        return;
      }
    }

    const cqiInPx = state.containerWidth / 100;
    const deltaCqi = deltaYPx / cqiInPx;
    const rawVal = state.initialOffset + deltaCqi;
    const clamped = Math.max(-100, Math.min(120, Math.round(rawVal * 10) / 10));

    setInput((prev) => ({
      ...prev,
      formatTextOffsetsY: {
        ...(prev.formatTextOffsetsY || {}),
        [targetFormatKey]: {
          ...((prev.formatTextOffsetsY || {})[targetFormatKey] || {}),
          [state.field]: clamped,
        },
      },
      textOffsetsY: {
        ...(prev.textOffsetsY || {}),
        [state.field]: clamped,
      },
    }));
  };

  const handleInternalTextPointerUp = (e: React.PointerEvent<HTMLElement>) => {
    if (onTextDragEnd) {
      onTextDragEnd(e);
      return;
    }
    const state = textDragRef.current;
    if (!state || state.pointerId !== e.pointerId) return;
    e.stopPropagation();
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch { }
    const didMove = state.hasMoved;
    textDragRef.current = null;
    if (!didMove) {
      onVisualElementClick?.('textSizes', state.field);
    }
  };

  // URL interactive pour chaque texte sur le Hub
  const getTextLink = (item: PosterTextItem) => {
    if (isInteractive) return undefined;
    if (item.type === 'titre') return data.organizationUrl || data.textUrls?.eventName;
    if (item.type === 'surtitre') return data.textUrls?.headerTagline;
    if (item.type === 'soustitre') return data.textUrls?.punchline;
    if (item.type === 'info') return data.textUrls?.headlineBadge;
    return undefined;
  };

  // Moteur de rendu du sujet (filtre d'harmonisation + pipeline automatisé de Defringe)
  const renderSubjectFilter = () => {
    const defringe = 'url(#dropper-subject-defringe)';
    if (isToneCenter) return defringe;
    if (!isHarmonized) {
      const baseFilter = isLightCanvas
        ? 'drop-shadow(0 20px 35px rgba(0,0,0,0.25)) contrast(1.04)'
        : `drop-shadow(0 0 1px rgba(0,0,0,0.95)) drop-shadow(0 0 20px ${primaryColor}55) drop-shadow(0 20px 35px rgba(0,0,0,0.85)) contrast(1.06) brightness(1.02)`;
      return `${defringe} ${baseFilter}`;
    }

    const sBrightness = subject?.brightness ?? data.subjectBrightness ?? 1.0;
    const sContrast = subject?.contrast ?? data.subjectContrast ?? (isLightCanvas ? 1.10 : 1.12);
    const sSaturation = subject?.saturation ?? data.subjectSaturation ?? (isLightCanvas ? 1.05 : 1.12);
    const sHueRotate = subject?.hueRotate ?? data.subjectHueRotate ?? 0;
    const sShadowX = data.subjectShadowOffsetX ?? 0;
    const sShadowY = data.subjectShadowOffsetY ?? (isLightCanvas ? 16 : 20);
    const sShadowBlur = data.subjectShadowBlur ?? (isLightCanvas ? 28 : 32);
    const sShadowOpacity = data.subjectShadowOpacity ?? (isLightCanvas ? 0.35 : 0.75);
    const sShadowColor = data.subjectShadowColor || `rgba(0, 0, 0, ${sShadowOpacity})`;

    const shadowPart = `drop-shadow(${sShadowX}px ${sShadowY}px ${sShadowBlur}px ${sShadowColor})`;
    const rimLightPart = !isLightCanvas && primaryColor
      ? `drop-shadow(0 0 1px rgba(0,0,0,0.95)) drop-shadow(0 0 20px ${primaryColor}40)`
      : '';
    const colorAdjust = `contrast(${sContrast}) brightness(${sBrightness}) saturate(${sSaturation})${sHueRotate ? ` hue-rotate(${sHueRotate}deg)` : ''}`;

    return [defringe, rimLightPart, shadowPart, colorAdjust].filter(Boolean).join(' ');
  };

  // Rendu des calques de texte (devant ou derrière le sujet)
  const renderTextLayer = (layerFilter: (item: PosterTextItem) => boolean, zIndex: number) => {
    return (
      <div
        className="relative w-full flex flex-col pointer-events-none"
        style={{
          gap: `${resolvedLineSpacing}cqi`,
          zIndex,
        }}
      >
        {flyerTexts.filter(layerFilter).map((item) => {
          if (item.isVisible === false || (!item.text?.trim() && effectiveFocusedField !== item.id)) return null;

          const isTitle = item.type === 'titre';
          const isSurtitre = item.type === 'surtitre';
          const isSoustitre = item.type === 'soustitre';
          const cleanText = getCleanDisplayText(sanitizeStudioText(item.text || ' '));
          const segments = parseTextSegments(item.text, item.color || '#FFFFFF', item.accentColor || primaryColor || '#E11D48', item.highlightedWords);

          const alignClass = item.align === 'left'
            ? 'justify-start text-left'
            : item.align === 'right'
              ? 'justify-end text-right'
              : 'justify-center text-center';

          const itemColor = item.color || '#FFFFFF';
          const isBlackText = itemColor.toUpperCase() === '#000000' || itemColor.toLowerCase() === 'black';
          const blackContrastStyle: React.CSSProperties = isBlackText
            ? {
              filter: 'drop-shadow(0px 1px 2px rgba(255, 255, 255, 0.45)) drop-shadow(0px 0px 1px rgba(255, 255, 255, 0.35))',
              WebkitTextStroke: '0.4px rgba(255, 255, 255, 0.3)',
            }
            : {};

          const safeY = item.y ?? 0;
          const itemLetterSpacing = item.letterSpacing !== undefined ? `${item.letterSpacing}px` : undefined;
          const itemFontWeight = item.fontWeight ? resolveFontWeight(item.fontWeight) : undefined;
          const capsuleClass = item.hasBackgroundPill ? 'bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded shadow-sm' : '';
          const itemUrl = getTextLink(item);
          const offsetKey = mapFieldToTextOffsetKey(item.type === 'titre' ? 'eventName' : item.type === 'surtitre' ? 'headerTagline' : item.type === 'soustitre' ? 'punchline' : item.id);

          const innerTextElement = isSurtitre ? (
            <span
              data-tap-edit={item.id}
              onPointerDown={canInteractTexts ? (e) => handleInternalTextPointerDown(e, offsetKey, item.id) : undefined}
              onPointerMove={canInteractTexts ? handleInternalTextPointerMove : undefined}
              onPointerUp={canInteractTexts ? handleInternalTextPointerUp : undefined}
              onPointerCancel={canInteractTexts ? handleInternalTextPointerUp : undefined}
              onClick={canInteractTexts ? (e) => {
                e.stopPropagation();
                onVisualElementClick?.('textSizes', item.id as any);
              } : undefined}
              className={`${typo.badgeClass.replace(/\btext-(white|black|zinc-\d+|slate-\d+|neutral-\d+|gray-\d+)\b/g, '')} whitespace-nowrap overflow-visible transition-all inline-block select-none max-w-full ${capsuleClass} ${
                isTextsActive
                  ? isDraggingField === offsetKey
                    ? 'pointer-events-auto cursor-grabbing ring-2 ring-lime-400 rounded px-1 bg-lime-400/20 text-lime-300 shadow-[0_0_12px_rgba(163,230,53,0.8)]'
                    : effectiveFocusedField === item.id
                      ? 'pointer-events-auto cursor-grab ring-2 ring-lime-400 rounded px-1 bg-lime-400/20 text-lime-300 shadow-[0_0_12px_rgba(163,230,53,0.8)]'
                      : 'pointer-events-auto cursor-grab hover:ring-1 hover:ring-lime-400/50 rounded'
                  : canInteractTexts
                    ? 'pointer-events-auto cursor-pointer hover:ring-1 hover:ring-dashed hover:ring-lime-400/60 rounded px-1'
                    : 'pointer-events-none select-none'
              }`}
              style={{
                fontFamily: "'Syne', 'Inter', 'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif",
                textTransform: 'uppercase',
                fontSize: getAutoScaledFontSize(cleanText, 2.2 * (item.fontSizeScale ?? 1.0), 0.9 * (item.fontSizeScale ?? 1.0), 'cqi'),
                letterSpacing: itemLetterSpacing ?? '0.28em',
                fontWeight: itemFontWeight ?? 600,
                color: effectiveFocusedField === item.id ? undefined : itemColor,
                WebkitTextFillColor: effectiveFocusedField === item.id ? undefined : itemColor,
                textAlign: item.align,
                whiteSpace: 'pre',
                touchAction: 'none',
                ...blackContrastStyle,
              }}
            >
              {segments.map((seg, sIdx) => (
                <span
                  key={sIdx}
                  style={{
                    color: effectiveFocusedField === item.id ? undefined : seg.color,
                    WebkitTextFillColor: effectiveFocusedField === item.id ? undefined : seg.color,
                    display: 'inline-block',
                  }}
                >
                  {seg.text}
                </span>
              ))}
            </span>
          ) : isTitle ? (
            <div
              data-tap-edit={item.id}
              onPointerDown={canInteractTexts ? (e) => handleInternalTextPointerDown(e, offsetKey, item.id) : undefined}
              onPointerMove={canInteractTexts ? handleInternalTextPointerMove : undefined}
              onPointerUp={canInteractTexts ? handleInternalTextPointerUp : undefined}
              onPointerCancel={canInteractTexts ? handleInternalTextPointerUp : undefined}
              onClick={canInteractTexts ? (e) => {
                e.stopPropagation();
                onVisualElementClick?.('textSizes', item.id as any);
              } : undefined}
              className={`transition-all relative select-none inline-block max-w-full ${capsuleClass} ${
                isTextsActive
                  ? isDraggingField === offsetKey
                    ? 'pointer-events-auto cursor-grabbing ring-2 ring-lime-400 rounded-lg shadow-[0_0_15px_rgba(163,230,53,0.85)] scale-[1.01]'
                    : effectiveFocusedField === item.id
                      ? 'pointer-events-auto cursor-grab ring-2 ring-lime-400 rounded-lg shadow-[0_0_15px_rgba(163,230,53,0.85)] scale-[1.01]'
                      : 'pointer-events-auto cursor-grab hover:ring-1 hover:ring-lime-400/50 rounded-lg'
                  : canInteractTexts
                    ? 'pointer-events-auto cursor-pointer hover:ring-1 hover:ring-dashed hover:ring-lime-400/60 rounded-lg'
                    : 'pointer-events-none select-none'
              }`}
              style={{ touchAction: 'none' }}
            >
              <AutoFitText
                text={sanitizeStudioText(item.text || ' ')}
                className={`${typo.titleClass.replace(/\btext-(white|black|zinc-\d+|slate-\d+|neutral-\d+|gray-\d+)\b/g, '')} ${effectiveFocusedField === item.id ? 'text-lime-300' : ''} uppercase`}
                style={{
                  ...typo.titleStyle,
                  color: effectiveFocusedField === item.id ? undefined : itemColor,
                  WebkitTextFillColor: effectiveFocusedField === item.id ? undefined : itemColor,
                  letterSpacing: itemLetterSpacing ?? typo.titleStyle.letterSpacing,
                  fontWeight: itemFontWeight ?? 900,
                  ...blackContrastStyle,
                }}
                maxFontSize={7.8 * (item.fontSizeScale ?? 1.0)}
                minFontSize={3.2 * (item.fontSizeScale ?? 1.0)}
                unit="cqi"
                align={item.align}
                accentColor={item.accentColor || primaryColor || '#F97316'}
                highlightedWords={item.highlightedWords}
              />
            </div>
          ) : isSoustitre ? (
            <p
              data-tap-edit={item.id}
              onPointerDown={canInteractTexts ? (e) => handleInternalTextPointerDown(e, offsetKey, item.id) : undefined}
              onPointerMove={canInteractTexts ? handleInternalTextPointerMove : undefined}
              onPointerUp={canInteractTexts ? handleInternalTextPointerUp : undefined}
              onPointerCancel={canInteractTexts ? handleInternalTextPointerUp : undefined}
              onClick={canInteractTexts ? (e) => {
                e.stopPropagation();
                onVisualElementClick?.('textSizes', item.id as any);
              } : undefined}
              className={`${typo.subClass.replace(/\btext-(white|black|zinc-\d+|slate-\d+|neutral-\d+|gray-\d+)\b/g, '')} whitespace-pre overflow-visible transition-all select-none max-w-full inline-block ${capsuleClass} ${
                isTextsActive
                  ? isDraggingField === offsetKey
                    ? 'pointer-events-auto cursor-grabbing text-lime-300 font-bold ring-2 ring-lime-400 rounded shadow-[0_0_12px_rgba(163,230,53,0.8)]'
                    : effectiveFocusedField === item.id
                      ? 'pointer-events-auto cursor-grab text-lime-300 font-bold ring-2 ring-lime-400 rounded shadow-[0_0_12px_rgba(163,230,53,0.8)]'
                      : 'pointer-events-auto cursor-grab hover:ring-1 hover:ring-lime-400/50 rounded'
                  : canInteractTexts
                    ? 'pointer-events-auto cursor-pointer hover:ring-1 hover:ring-dashed hover:ring-lime-400/60 rounded'
                    : 'pointer-events-none select-none'
              }`}
              style={{
                fontSize: getAutoScaledFontSize(cleanText, 2.6 * (item.fontSizeScale ?? 1.0), 1.0 * (item.fontSizeScale ?? 1.0), 'cqi'),
                letterSpacing: itemLetterSpacing ?? 'normal',
                fontWeight: itemFontWeight ?? 700,
                color: effectiveFocusedField === item.id ? undefined : itemColor,
                WebkitTextFillColor: effectiveFocusedField === item.id ? undefined : itemColor,
                textAlign: item.align,
                whiteSpace: 'pre',
                touchAction: 'none',
                ...blackContrastStyle,
              }}
            >
              {segments.map((seg, sIdx) => (
                <span
                  key={sIdx}
                  style={{
                    color: effectiveFocusedField === item.id ? undefined : seg.color,
                    WebkitTextFillColor: effectiveFocusedField === item.id ? undefined : seg.color,
                    display: 'inline-block',
                  }}
                >
                  {seg.text}
                </span>
              ))}
            </p>
          ) : (
            <span
              data-tap-edit={item.id}
              onPointerDown={canInteractTexts ? (e) => handleInternalTextPointerDown(e, offsetKey, item.id) : undefined}
              onPointerMove={canInteractTexts ? handleInternalTextPointerMove : undefined}
              onPointerUp={canInteractTexts ? handleInternalTextPointerUp : undefined}
              onPointerCancel={canInteractTexts ? handleInternalTextPointerUp : undefined}
              onClick={canInteractTexts ? (e) => {
                e.stopPropagation();
                onVisualElementClick?.('textSizes', item.id as any);
              } : undefined}
              className={`${typo.badgeClass.replace(/\btext-(white|black|zinc-\d+|slate-\d+|neutral-\d+|gray-\d+)\b/g, '')} uppercase block whitespace-nowrap overflow-visible transition-all select-none max-w-full ${capsuleClass} ${
                isTextsActive
                  ? isDraggingField === offsetKey
                    ? 'pointer-events-auto cursor-grabbing ring-2 ring-lime-400 rounded px-1 bg-lime-400/20 text-lime-300 shadow-[0_0_12px_rgba(163,230,53,0.8)]'
                    : effectiveFocusedField === item.id
                      ? 'pointer-events-auto cursor-grab ring-2 ring-lime-400 rounded px-1 bg-lime-400/20 text-lime-300 shadow-[0_0_12px_rgba(163,230,53,0.8)]'
                      : 'pointer-events-auto cursor-grab hover:ring-1 hover:ring-lime-400/50 rounded'
                  : canInteractTexts
                    ? 'pointer-events-auto cursor-pointer hover:ring-1 hover:ring-dashed hover:ring-lime-400/60 rounded px-1'
                    : 'pointer-events-none select-none'
              }`}
              style={{
                fontSize: getAutoScaledFontSize(cleanText, 2.0 * (item.fontSizeScale ?? 1.0), 0.9 * (item.fontSizeScale ?? 1.0), 'cqi'),
                letterSpacing: itemLetterSpacing ?? 'normal',
                fontWeight: itemFontWeight ?? 600,
                color: effectiveFocusedField === item.id ? undefined : itemColor,
                WebkitTextFillColor: effectiveFocusedField === item.id ? undefined : itemColor,
                textAlign: item.align,
                whiteSpace: 'pre',
                touchAction: 'none',
                ...blackContrastStyle,
              }}
            >
              {segments.map((seg, sIdx) => (
                <span
                  key={sIdx}
                  style={{
                    color: effectiveFocusedField === item.id ? undefined : seg.color,
                    WebkitTextFillColor: effectiveFocusedField === item.id ? undefined : seg.color,
                    display: 'inline-block',
                  }}
                >
                  {seg.text}
                </span>
              ))}
            </span>
          );

          return (
            <div
              key={item.id}
              data-testid={`poster-text-layer-${item.id}`}
              className={`w-full flex min-w-0 pointer-events-none ${alignClass} ${item.isInline ? 'absolute inset-x-0' : ''}`}
              style={{
                transform: `translateX(${item.x ?? 0}%) translateY(${safeY}cqi)`,
                zIndex,
              }}
            >
              {itemUrl && !isInteractive ? (
                <a
                  href={itemUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="pointer-events-auto hover:opacity-85 transition inline-block max-w-full"
                  title="Ouvrir le lien"
                >
                  {innerTextElement}
                </a>
              ) : (
                <div className="max-w-full pointer-events-none">
                  {innerTextElement}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // Helper de style de contraste pour le texte noir / blanc
  const getContrastShadow = (color: string) => {
    if (color === COLOR_DEEP_BLACK || color.toUpperCase() === '#000000') {
      return {
        filter: 'drop-shadow(0px 1px 2px rgba(255, 255, 255, 0.45)) drop-shadow(0px 0px 1px rgba(255, 255, 255, 0.35))',
        WebkitTextStroke: '0.4px rgba(255, 255, 255, 0.3)',
      };
    }
    return {
      filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.85)) drop-shadow(0 1px 2px rgba(0,0,0,0.95))',
    };
  };

  // ---------------------------------------------------------------------------
  // GABARIT 1 : "Campagne Duale" (duality_campaign)
  // Accroche Gauche : top: 6%, left: 8%, color: #FFFFFF, sans-serif géométrique, tracking: 0.28em, uppercase
  // Accroche Droite : top: 6%, right: 8%, color: #0A0A0A (noir contrasté sur ciel clair), même typo, tracking: 0.28em
  // Titre Principal : bottom: 9%, centré, blanc extra-bold (clamp(26px, 5cqi, 48px))
  // Mot d'Accent : immédiatement sous le titre, couleur #F97316, police expressive/italique, souligné par le trait brush vectoriel SVG
  // ---------------------------------------------------------------------------
  const renderDualityBottom = (
    layerZIndex: number,
    isTitleFocused: boolean,
    isAccentFocused: boolean,
    titleText: string,
    accentText: string
  ) => {
    return (
      <div
        data-testid="poster-bottom-impact-cta"
        className="absolute bottom-[9%] left-1/2 -translate-x-1/2 w-[92%] max-w-[92%] flex flex-col items-center justify-center text-center select-none pointer-events-none"
        style={{ zIndex: layerZIndex }}
      >
        {/* Titre Principal : centré, blanc extra-bold, clamp(26px, 5cqi, 48px) */}
        {Boolean(titleText?.trim() || isTitleFocused) && (
          <div
            data-tap-edit="bottomTitle"
            onClick={isTextsActive ? (e) => {
              e.stopPropagation();
              onVisualElementClick?.('texts', 'bottomTitle');
            } : undefined}
            className={`w-full uppercase transition-all select-none leading-[0.95] ${
              isTextsActive
                ? isTitleFocused
                  ? 'pointer-events-auto cursor-pointer ring-2 ring-emerald-400 rounded-lg p-1 bg-emerald-400/20 text-emerald-300 shadow-[0_0_15px_rgba(52,211,153,0.85)] scale-[1.01]'
                  : 'pointer-events-auto cursor-pointer hover:ring-1 hover:ring-emerald-400/50 rounded-lg'
                : 'pointer-events-none'
            }`}
            style={{
              fontFamily: "'Impact', 'Inter Tight', 'Arial Black', -apple-system, sans-serif",
              fontWeight: 900,
              color: isTitleFocused ? undefined : COLOR_PURE_WHITE,
              WebkitTextFillColor: isTitleFocused ? undefined : COLOR_PURE_WHITE,
              letterSpacing: '0.03em',
              fontSize: 'clamp(26px, 5cqi, 48px)',
              textShadow: '0 2px 6px rgba(0,0,0,0.95), 0 1px 3px rgba(0,0,0,0.95)',
            }}
          >
            {titleText || (isTitleFocused ? ' ' : '')}
          </div>
        )}

        {/* Mot d'Accent : immédiatement sous le titre, couleur #F97316, police expressive/italique, souligné par trait brush vectoriel SVG */}
        {Boolean(accentText?.trim() || isAccentFocused) && (
          <div className="flex flex-col items-center justify-center w-full mt-1">
            <div
              data-tap-edit="bottomAccent"
              onClick={isTextsActive ? (e) => {
                e.stopPropagation();
                onVisualElementClick?.('texts', 'bottomAccent');
              } : undefined}
              className={`w-full uppercase transition-all select-none leading-[1.05] italic ${
                isTextsActive
                  ? isAccentFocused
                    ? 'pointer-events-auto cursor-pointer ring-2 ring-emerald-400 rounded-lg p-1 bg-emerald-400/20 text-emerald-300 shadow-[0_0_15px_rgba(52,211,153,0.85)] scale-[1.01]'
                    : 'pointer-events-auto cursor-pointer hover:ring-1 hover:ring-emerald-400/50 rounded-lg'
                  : 'pointer-events-none'
              }`}
              style={{
                fontFamily: "'Permanent Marker', 'Syne', cursive, -apple-system, sans-serif",
                fontWeight: 700,
                fontStyle: 'italic',
                color: isAccentFocused ? undefined : primaryColor,
                WebkitTextFillColor: isAccentFocused ? undefined : primaryColor,
                letterSpacing: '0.04em',
                fontSize: 'clamp(28px, 5.8cqi, 54px)',
                textShadow: `0 2px 6px rgba(0,0,0,0.9), 0 0 25px ${primaryColor}70`,
              }}
            >
              {accentText || (isAccentFocused ? ' ' : '')}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderDualityCampaign = (layer: 'behind' | 'front', layerZIndex: number) => {
    // Si layer === 'behind', on ne rend rien car le gabarit Campagne Duale force tous les textes par-dessus la scène (z-index >= 30)
    if (layer === 'behind') {
      return null;
    }

    const isLeftFocused = ['topTextLeft', 'topDualLeft', 'headerTagline'].includes(effectiveFocusedField || '');
    const isRightFocused = ['topTextRight', 'topDualRight', 'headlineBadgeText'].includes(effectiveFocusedField || '');
    const isTitleFocused = ['bottomTitle', 'mainTitle', 'eventName'].includes(effectiveFocusedField || '');
    const isAccentFocused = ['bottomAccent', 'accentWord', 'punchline'].includes(effectiveFocusedField || '');

    const leftText = templateData.topTextLeft;
    const rightText = templateData.topTextRight;
    const titleText = templateData.bottomTitle;
    const accentText = templateData.bottomAccent;

    return (
      <div
        className="absolute inset-0 pointer-events-none z-30 select-none"
        style={{ pointerEvents: 'none' }}
      >
        {/* Accroche Gauche */}
        {Boolean((leftText && leftText.trim().length > 0) || isLeftFocused) && (
          <div
            data-testid="poster-semantic-top-dual-left"
            data-tap-edit="topTextLeft"
            onPointerDown={isTextsActive ? (e) => handleInternalTextPointerDown(e, 'headerTagline', 'topTextLeft') : undefined}
            onPointerMove={isTextsActive ? handleInternalTextPointerMove : undefined}
            onPointerUp={isTextsActive ? handleInternalTextPointerUp : undefined}
            onPointerCancel={isTextsActive ? handleInternalTextPointerUp : undefined}
            onClick={isTextsActive ? (e) => {
              e.stopPropagation();
              onVisualElementClick?.('texts', 'topTextLeft');
            } : undefined}
            className={`absolute top-[6%] left-[8%] text-left font-sans font-semibold uppercase text-white tracking-[0.28em] text-[clamp(11px,2cqi,16px)] drop-shadow-md select-none transition-all ${
              isTextsActive
                ? isDraggingField === 'headerTagline'
                  ? 'pointer-events-auto cursor-grabbing ring-2 ring-emerald-400 rounded px-1.5 py-0.5 bg-emerald-400/20 text-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.8)]'
                  : isLeftFocused
                    ? 'pointer-events-auto cursor-grab ring-2 ring-emerald-400 rounded px-1.5 py-0.5 bg-emerald-400/20 text-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.8)]'
                    : 'pointer-events-auto cursor-grab hover:ring-1 hover:ring-emerald-400/50 rounded'
                : 'pointer-events-none'
            }`}
            style={{
              transform: `translateX(${resolvedOffsetsX.headerTagline ?? 0}%) translateY(${resolvedOffsetsY.headerTagline ?? 0}cqi)`,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              pointerEvents: isTextsActive ? 'auto' : 'none',
              touchAction: 'none',
            }}
          >
            {leftText || (isLeftFocused ? ' ' : '')}
          </div>
        )}

        {/* Accroche Droite */}
        {Boolean((rightText && rightText.trim().length > 0) || isRightFocused) && (
          <div
            data-testid="poster-semantic-top-dual-right"
            data-tap-edit="topTextRight"
            onPointerDown={isTextsActive ? (e) => handleInternalTextPointerDown(e, 'headlineBadge', 'topTextRight') : undefined}
            onPointerMove={isTextsActive ? handleInternalTextPointerMove : undefined}
            onPointerUp={isTextsActive ? handleInternalTextPointerUp : undefined}
            onPointerCancel={isTextsActive ? handleInternalTextPointerUp : undefined}
            onClick={isTextsActive ? (e) => {
              e.stopPropagation();
              onVisualElementClick?.('texts', 'topTextRight');
            } : undefined}
            className={`absolute top-[6%] right-[8%] text-right font-sans font-semibold uppercase text-neutral-900 tracking-[0.28em] text-[clamp(11px,2cqi,16px)] drop-shadow-sm select-none transition-all ${
              isTextsActive
                ? isDraggingField === 'headlineBadge'
                  ? 'pointer-events-auto cursor-grabbing ring-2 ring-emerald-400 rounded px-1.5 py-0.5 bg-emerald-400/20 text-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.8)]'
                  : isRightFocused
                    ? 'pointer-events-auto cursor-grab ring-2 ring-emerald-400 rounded px-1.5 py-0.5 bg-emerald-400/20 text-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.8)]'
                    : 'pointer-events-auto cursor-grab hover:ring-1 hover:ring-emerald-400/50 rounded'
                : 'pointer-events-none'
            }`}
            style={{
              transform: `translateX(${resolvedOffsetsX.headlineBadge ?? 0}%) translateY(${resolvedOffsetsY.headlineBadge ?? 0}cqi)`,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              pointerEvents: isTextsActive ? 'auto' : 'none',
              touchAction: 'none',
            }}
          >
            {rightText || (isRightFocused ? ' ' : '')}
          </div>
        )}

        {/* Bloc Bas (Centré) - Uniquement si du texte est présent */}
        {Boolean(
          (titleText && titleText.trim().length > 0) || isTitleFocused ||
          (accentText && accentText.trim().length > 0) || isAccentFocused
        ) && (
          <div
            data-testid="poster-bottom-impact-cta"
            className="absolute bottom-[8%] left-1/2 -translate-x-1/2 w-[90%] text-center flex flex-col items-center select-none pointer-events-none"
            style={{ pointerEvents: 'none' }}
          >
            {/* Ligne 1 : Titre Principal */}
            {Boolean((titleText && titleText.trim().length > 0) || isTitleFocused) && (
              <div
                data-tap-edit="bottomTitle"
                onPointerDown={isTextsActive ? (e) => handleInternalTextPointerDown(e, 'eventName', 'bottomTitle') : undefined}
                onPointerMove={isTextsActive ? handleInternalTextPointerMove : undefined}
                onPointerUp={isTextsActive ? handleInternalTextPointerUp : undefined}
                onPointerCancel={isTextsActive ? handleInternalTextPointerUp : undefined}
                onClick={isTextsActive ? (e) => {
                  e.stopPropagation();
                  onVisualElementClick?.('texts', 'bottomTitle');
                } : undefined}
                className={`font-black text-white ${isBannerFormat ? 'text-[clamp(20px,4.5cqi,38px)]' : 'text-[clamp(26px,5.5cqi,48px)]'} uppercase tracking-wider drop-shadow-lg w-full transition-all select-none leading-none ${
                  isTextsActive
                    ? isDraggingField === 'eventName'
                      ? 'pointer-events-auto cursor-grabbing ring-2 ring-emerald-400 rounded-lg p-1 bg-emerald-400/20 text-emerald-300 shadow-[0_0_15px_rgba(52,211,153,0.85)] scale-[1.01]'
                      : isTitleFocused
                        ? 'pointer-events-auto cursor-grab ring-2 ring-emerald-400 rounded-lg p-1 bg-emerald-400/20 text-emerald-300 shadow-[0_0_15px_rgba(52,211,153,0.85)] scale-[1.01]'
                        : 'pointer-events-auto cursor-grab hover:ring-1 hover:ring-emerald-400/50 rounded-lg'
                    : 'pointer-events-none'
                }`}
                style={{
                  transform: `translateX(${resolvedOffsetsX.eventName ?? 0}%) translateY(${resolvedOffsetsY.eventName ?? 0}cqi)`,
                  pointerEvents: isTextsActive ? 'auto' : 'none',
                  touchAction: 'none',
                }}
              >
                {titleText || (isTitleFocused ? ' ' : '')}
              </div>
            )}

            {/* Ligne 2 : Mot d'accent */}
            {Boolean((accentText && accentText.trim().length > 0) || isAccentFocused) && (
              <div
                data-tap-edit="bottomAccent"
                onPointerDown={isTextsActive ? (e) => handleInternalTextPointerDown(e, 'punchline', 'bottomAccent') : undefined}
                onPointerMove={isTextsActive ? handleInternalTextPointerMove : undefined}
                onPointerUp={isTextsActive ? handleInternalTextPointerUp : undefined}
                onPointerCancel={isTextsActive ? handleInternalTextPointerUp : undefined}
                onClick={isTextsActive ? (e) => {
                  e.stopPropagation();
                  onVisualElementClick?.('texts', 'bottomAccent');
                } : undefined}
                className={`flex flex-col items-center justify-center font-bold italic ${isBannerFormat ? 'text-[clamp(22px,5cqi,42px)]' : 'text-[clamp(30px,6.5cqi,56px)]'} tracking-tight w-full transition-all select-none leading-tight mt-1 ${
                  isTextsActive
                    ? isDraggingField === 'punchline'
                      ? 'pointer-events-auto cursor-grabbing ring-2 ring-emerald-400 rounded-lg p-1 bg-emerald-400/20 text-emerald-300 shadow-[0_0_15px_rgba(52,211,153,0.85)] scale-[1.01]'
                      : isAccentFocused
                        ? 'pointer-events-auto cursor-grab ring-2 ring-emerald-400 rounded-lg p-1 bg-emerald-400/20 text-emerald-300 shadow-[0_0_15px_rgba(52,211,153,0.85)] scale-[1.01]'
                        : 'pointer-events-auto cursor-grab hover:ring-1 hover:ring-emerald-400/50 rounded-lg'
                    : 'pointer-events-none'
                }`}
                style={{
                  color: primaryColor,
                  transform: `translateX(${resolvedOffsetsX.punchline ?? 0}%) translateY(${resolvedOffsetsY.punchline ?? 0}cqi)`,
                  pointerEvents: isTextsActive ? 'auto' : 'none',
                  touchAction: 'none',
                }}
              >
                <span>{accentText || (isAccentFocused ? ' ' : '')}</span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // GABARIT 2 : "Headliner Event" (headliner_event)
  // Nom de l'artiste : tiers supérieur, centré horizontalement, condensé géant,
  // calé en z-index derrière le sujet (ou devant selon toggle), avec léger contour/glow.
  // Sous-titre et date : intégrés en bas dans une capsule compacte semi-sombre lisible.
  // ---------------------------------------------------------------------------
  const renderHeadlinerEvent = (layer: 'behind' | 'front', layerZIndex: number) => {
    const isArtistFocused = ['artistName', 'djName', 'eventName'].includes(effectiveFocusedField || '');
    const isSubRoleFocused = ['subRole', 'punchline', 'headerTagline'].includes(effectiveFocusedField || '');
    const isDatePlaceFocused = ['datePlace', 'date', 'venue'].includes(effectiveFocusedField || '');
    const isTicketFocused = effectiveFocusedField === 'ticketCta';

    const artistName = headlinerSlots.artistName;
    const subRole = headlinerSlots.subRole;
    const datePlace = headlinerSlots.datePlace;
    const ticketCta = headlinerSlots.ticketCta;

    const renderArtist = () => {
      if ((!artistName || artistName.trim().length === 0) && !isArtistFocused) return null;
      return (
        <div
          data-testid="poster-headliner-artist"
          data-tap-edit="artistName"
          onPointerDown={isTextsActive ? (e) => handleInternalTextPointerDown(e, 'eventName', 'artistName') : undefined}
          onPointerMove={isTextsActive ? handleInternalTextPointerMove : undefined}
          onPointerUp={isTextsActive ? handleInternalTextPointerUp : undefined}
          onPointerCancel={isTextsActive ? handleInternalTextPointerUp : undefined}
          onClick={isTextsActive ? (e) => {
            e.stopPropagation();
            onVisualElementClick?.('texts', 'artistName');
          } : undefined}
          className={`absolute ${isBannerFormat ? 'top-[12%]' : 'top-[20%]'} inset-x-0 w-[94%] mx-auto text-center select-none uppercase transition-all leading-[0.88] ${
            isTextsActive
              ? isDraggingField === 'eventName'
                ? 'pointer-events-auto cursor-grabbing ring-2 ring-emerald-400 rounded-xl p-1 bg-emerald-400/20 text-emerald-300 shadow-[0_0_20px_rgba(52,211,153,0.9)] scale-[1.01]'
                : isArtistFocused
                  ? 'pointer-events-auto cursor-grab ring-2 ring-emerald-400 rounded-xl p-1 bg-emerald-400/20 text-emerald-300 shadow-[0_0_20px_rgba(52,211,153,0.9)] scale-[1.01]'
                  : 'pointer-events-auto cursor-grab hover:ring-1 hover:ring-emerald-400/50 rounded-xl'
              : 'pointer-events-none'
          }`}
          style={{
            transform: `translateX(${resolvedOffsetsX.eventName ?? 0}%) translateY(${resolvedOffsetsY.eventName ?? 0}cqi)`,
            zIndex: layerZIndex,
            fontFamily: "'Impact', 'Inter Tight', 'Arial Black', sans-serif",
            fontSize: isBannerFormat ? 'clamp(28px, 7cqi, 64px)' : 'clamp(38px, 10cqi, 92px)',
            fontWeight: 900,
            letterSpacing: '0.02em',
            color: isArtistFocused ? undefined : COLOR_PURE_WHITE,
            WebkitTextFillColor: isArtistFocused ? undefined : COLOR_PURE_WHITE,
            textShadow: '0 0 25px rgba(0,0,0,0.95), 0 0 45px rgba(255,255,255,0.35), 0 2px 10px rgba(0,0,0,0.95)',
            WebkitTextStroke: '1px rgba(255,255,255,0.25)',
            pointerEvents: isTextsActive ? 'auto' : 'none',
            touchAction: 'none',
          }}
        >
          {artistName || (isArtistFocused ? ' ' : '')}
        </div>
      );
    };

    if (layer === 'behind' && isTitleBehindSubject) {
      return renderArtist();
    }

    const hasHeadlinerCapsuleContent = Boolean(
      (subRole && subRole.trim().length > 0) || isSubRoleFocused ||
      (datePlace && datePlace.trim().length > 0) || isDatePlaceFocused ||
      (ticketCta && ticketCta.trim().length > 0) || isTicketFocused
    );

    if (layer === 'front') {
      return (
        <>
          {!isTitleBehindSubject && renderArtist()}

          {/* Capsule compacte semi-sombre lisible en bas : Sous-titre et date intégrés - Uniquement si du texte est présent */}
          {hasHeadlinerCapsuleContent && (
            <div
              data-testid="poster-headliner-bottom-capsule"
              className="absolute bottom-[7%] left-1/2 -translate-x-1/2 max-w-[88%] w-auto pointer-events-none select-none"
              style={{
                transform: `translateX(${resolvedOffsetsX.infoBadge ?? 0}%) translateY(${resolvedOffsetsY.infoBadge ?? 0}cqi)`,
                zIndex: layerZIndex,
                pointerEvents: 'none',
              }}
            >
              <div
                className="bg-neutral-950/85 backdrop-blur-md border border-neutral-700/80 rounded-2xl px-5 py-2.5 sm:px-7 sm:py-3.5 shadow-[0_12px_36px_rgba(0,0,0,0.9)] flex flex-col items-center justify-center text-center gap-1 pointer-events-none"
                style={{ pointerEvents: 'none' }}
              >
                {/* Sous-titre / Style */}
                {Boolean((subRole && subRole.trim().length > 0) || isSubRoleFocused) && (
                  <div
                    data-tap-edit="subRole"
                    onPointerDown={isTextsActive ? (e) => handleInternalTextPointerDown(e, 'punchline', 'subRole') : undefined}
                    onPointerMove={isTextsActive ? handleInternalTextPointerMove : undefined}
                    onPointerUp={isTextsActive ? handleInternalTextPointerUp : undefined}
                    onPointerCancel={isTextsActive ? handleInternalTextPointerUp : undefined}
                    onClick={isTextsActive ? (e) => {
                      e.stopPropagation();
                      onVisualElementClick?.('texts', 'subRole');
                    } : undefined}
                    className={`font-mono font-bold tracking-widest uppercase transition-all select-none ${
                      isTextsActive
                        ? isSubRoleFocused
                          ? 'pointer-events-auto cursor-grab text-emerald-300 underline font-black ring-1 ring-emerald-400 rounded px-1'
                          : 'pointer-events-auto cursor-grab hover:underline'
                        : 'pointer-events-none'
                    }`}
                    style={{
                      color: primaryColor,
                      fontSize: isBannerFormat ? '1.8cqi' : '2.2cqi',
                      pointerEvents: isTextsActive ? 'auto' : 'none',
                      touchAction: 'none',
                    }}
                  >
                    {subRole || (isSubRoleFocused ? ' ' : '')}
                  </div>
                )}

                {/* Date & Lieu */}
                {Boolean((datePlace && datePlace.trim().length > 0) || isDatePlaceFocused) && (
                  <div
                    data-tap-edit="datePlace"
                    onPointerDown={isTextsActive ? (e) => handleInternalTextPointerDown(e, 'infoBadge', 'datePlace') : undefined}
                    onPointerMove={isTextsActive ? handleInternalTextPointerMove : undefined}
                    onPointerUp={isTextsActive ? handleInternalTextPointerUp : undefined}
                    onPointerCancel={isTextsActive ? handleInternalTextPointerUp : undefined}
                    onClick={isTextsActive ? (e) => {
                      e.stopPropagation();
                      onVisualElementClick?.('texts', 'datePlace');
                    } : undefined}
                    className={`font-mono font-black tracking-wide text-white uppercase transition-all select-none ${
                      isTextsActive
                        ? isDatePlaceFocused
                          ? 'pointer-events-auto cursor-grab text-emerald-300 underline ring-1 ring-emerald-400 rounded px-1'
                          : 'pointer-events-auto cursor-grab hover:underline'
                        : 'pointer-events-none'
                    }`}
                    style={{
                      fontSize: isBannerFormat ? '2.1cqi' : '2.6cqi',
                      pointerEvents: isTextsActive ? 'auto' : 'none',
                      touchAction: 'none',
                    }}
                  >
                    {datePlace || (isDatePlaceFocused ? ' ' : '')}
                  </div>
                )}

                {/* CTA Billetterie (optionnel) */}
                {Boolean((ticketCta && ticketCta.trim().length > 0) || isTicketFocused) && (
                  <div
                    data-tap-edit="ticketCta"
                    onClick={isTextsActive ? (e) => {
                      e.stopPropagation();
                      onVisualElementClick?.('texts', 'ticketCta');
                    } : undefined}
                    className={`font-mono font-bold tracking-wider uppercase mt-0.5 px-2.5 py-0.5 rounded-full transition-all select-none ${
                      isTextsActive
                        ? isTicketFocused
                          ? 'pointer-events-auto cursor-pointer ring-1'
                          : 'pointer-events-auto cursor-pointer hover:opacity-90'
                        : 'pointer-events-none'
                    }`}
                    style={{
                      fontSize: isBannerFormat ? '1.5cqi' : '1.8cqi',
                      pointerEvents: isTextsActive ? 'auto' : 'none',
                      color: primaryColor,
                      borderColor: `${primaryColor}66`,
                      backgroundColor: `${primaryColor}22`,
                      borderWidth: '1px',
                      borderStyle: 'solid',
                    }}
                  >
                    {ticketCta || (isTicketFocused ? ' ' : '')}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      );
    }

    return null;
  };

  // ---------------------------------------------------------------------------
  // GABARIT 3 : "Drop Minimal" (minimal_brand)
  // Composition calée à gauche (left: 8%), typographie épurée avec grand interlettrage, logo discret.
  // ---------------------------------------------------------------------------
  const renderMinimalBrand = (layer: 'behind' | 'front', layerZIndex: number) => {
    if (layer !== 'front') return null;

    const isBrandFocused = ['brandName', 'eventName', 'djName'].includes(effectiveFocusedField || '');
    const isTaglineFocused = ['tagline', 'punchline', 'headerTagline'].includes(effectiveFocusedField || '');
    const isReleaseDateFocused = ['releaseDate', 'date'].includes(effectiveFocusedField || '');

    const brandName = minimalSlots.brandName;
    const tagline = minimalSlots.tagline;
    const releaseDate = minimalSlots.releaseDate;

    const hasMinimalContent = Boolean(
      (brandName && brandName.trim().length > 0) || isBrandFocused ||
      (tagline && tagline.trim().length > 0) || isTaglineFocused ||
      (releaseDate && releaseDate.trim().length > 0) || isReleaseDateFocused
    );
    if (!hasMinimalContent) return null;

    return (
      <div
        data-testid="poster-minimal-brand-composition"
        className="absolute top-[9%] left-[8%] max-w-[80%] text-left select-none pointer-events-none"
        style={{ zIndex: layerZIndex, pointerEvents: 'none' }}
      >
        {/* Nom de Marque / Collectif : Typographie épurée, grand interlettrage */}
        {Boolean((brandName && brandName.trim().length > 0) || isBrandFocused) && (
          <div
            data-tap-edit="brandName"
            onPointerDown={isTextsActive ? (e) => handleInternalTextPointerDown(e, 'eventName', 'brandName') : undefined}
            onPointerMove={isTextsActive ? handleInternalTextPointerMove : undefined}
            onPointerUp={isTextsActive ? handleInternalTextPointerUp : undefined}
            onPointerCancel={isTextsActive ? handleInternalTextPointerUp : undefined}
            onClick={isTextsActive ? (e) => {
              e.stopPropagation();
              onVisualElementClick?.('texts', 'brandName');
            } : undefined}
            className={`uppercase transition-all leading-[1.05] select-none ${
              isTextsActive
                ? isDraggingField === 'eventName'
                  ? 'pointer-events-auto cursor-grabbing ring-2 ring-emerald-400 rounded-lg p-1 bg-emerald-400/20 text-emerald-300'
                  : isBrandFocused
                    ? 'pointer-events-auto cursor-grab ring-2 ring-emerald-400 rounded-lg p-1 bg-emerald-400/20 text-emerald-300'
                    : 'pointer-events-auto cursor-grab hover:ring-1 hover:ring-emerald-400/50 rounded-lg'
                : 'pointer-events-none'
            }`}
            style={{
              transform: `translateX(${resolvedOffsetsX.eventName ?? 0}%) translateY(${resolvedOffsetsY.eventName ?? 0}cqi)`,
              fontFamily: "'Inter', 'Syne', -apple-system, BlinkMacSystemFont, sans-serif",
              fontWeight: 300,
              letterSpacing: '0.25em',
              fontSize: isBannerFormat ? '4.0cqi' : '5.2cqi',
              color: isBrandFocused ? undefined : COLOR_PURE_WHITE,
              WebkitTextFillColor: isBrandFocused ? undefined : COLOR_PURE_WHITE,
              textShadow: '0 2px 4px rgba(0,0,0,0.85)',
              pointerEvents: isTextsActive ? 'auto' : 'none',
              touchAction: 'none',
            }}
          >
            {brandName || (isBrandFocused ? ' ' : '')}
          </div>
        )}

        {/* Filet séparateur subtil - Uniquement si nom de marque et (slogan ou date) sont présents */}
        {Boolean(
          ((brandName && brandName.trim().length > 0) || isBrandFocused) &&
          (((tagline && tagline.trim().length > 0) || isTaglineFocused) || ((releaseDate && releaseDate.trim().length > 0) || isReleaseDateFocused))
        ) && (
          <div className="w-14 h-[2px] my-2.5 rounded-full" style={{ backgroundColor: primaryColor }} />
        )}

        {/* Slogan / Manifeste : Typographie fine & épurée */}
        {Boolean((tagline && tagline.trim().length > 0) || isTaglineFocused) && (
          <div
            data-tap-edit="tagline"
            onPointerDown={isTextsActive ? (e) => handleInternalTextPointerDown(e, 'headerTagline', 'tagline') : undefined}
            onPointerMove={isTextsActive ? handleInternalTextPointerMove : undefined}
            onPointerUp={isTextsActive ? handleInternalTextPointerUp : undefined}
            onPointerCancel={isTextsActive ? handleInternalTextPointerUp : undefined}
            onClick={isTextsActive ? (e) => {
              e.stopPropagation();
              onVisualElementClick?.('texts', 'tagline');
            } : undefined}
            className={`uppercase transition-all leading-relaxed max-w-[90%] select-none ${
              isTextsActive
                ? isDraggingField === 'headerTagline'
                  ? 'pointer-events-auto cursor-grabbing ring-2 ring-emerald-400 rounded-lg p-1 bg-emerald-400/20 text-emerald-300'
                  : isTaglineFocused
                    ? 'pointer-events-auto cursor-grab ring-2 ring-emerald-400 rounded-lg p-1 bg-emerald-400/20 text-emerald-300'
                    : 'pointer-events-auto cursor-grab hover:ring-1 hover:ring-emerald-400/50 rounded-lg'
                : 'pointer-events-none'
            }`}
            style={{
              transform: `translateX(${resolvedOffsetsX.headerTagline ?? 0}%) translateY(${resolvedOffsetsY.headerTagline ?? 0}cqi)`,
              fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
              fontWeight: 400,
              letterSpacing: '0.2em',
              fontSize: isBannerFormat ? '1.8cqi' : '2.2cqi',
              color: isTaglineFocused ? undefined : '#D4D4D8',
              WebkitTextFillColor: isTaglineFocused ? undefined : '#D4D4D8',
              textShadow: '0 1px 3px rgba(0,0,0,0.8)',
              pointerEvents: isTextsActive ? 'auto' : 'none',
              touchAction: 'none',
            }}
          >
            {tagline || (isTaglineFocused ? ' ' : '')}
          </div>
        )}

        {/* Mention Capsule : Badge épuré */}
        {Boolean((releaseDate && releaseDate.trim().length > 0) || isReleaseDateFocused) && (
          <div
            data-tap-edit="releaseDate"
            onPointerDown={isTextsActive ? (e) => handleInternalTextPointerDown(e, 'infoBadge', 'releaseDate') : undefined}
            onPointerMove={isTextsActive ? handleInternalTextPointerMove : undefined}
            onPointerUp={isTextsActive ? handleInternalTextPointerUp : undefined}
            onPointerCancel={isTextsActive ? handleInternalTextPointerUp : undefined}
            onClick={isTextsActive ? (e) => {
              e.stopPropagation();
              onVisualElementClick?.('texts', 'releaseDate');
            } : undefined}
            className={`font-mono font-bold uppercase mt-3.5 inline-block px-3 py-1 rounded bg-black/60 backdrop-blur-sm shadow-md transition-all select-none ${
              isTextsActive
                ? isDraggingField === 'infoBadge'
                  ? 'pointer-events-auto cursor-grabbing ring-2 ring-emerald-400 text-emerald-300'
                  : isReleaseDateFocused
                    ? 'pointer-events-auto cursor-grab ring-2 ring-emerald-400 text-emerald-300'
                    : 'pointer-events-auto cursor-grab hover:opacity-90'
                : 'pointer-events-none'
            }`}
            style={{
              transform: `translateX(${resolvedOffsetsX.infoBadge ?? 0}%) translateY(${resolvedOffsetsY.infoBadge ?? 0}cqi)`,
              letterSpacing: '0.28em',
              fontSize: isBannerFormat ? '1.5cqi' : '1.8cqi',
              pointerEvents: isTextsActive ? 'auto' : 'none',
              touchAction: 'none',
              color: primaryColor,
              borderColor: `${primaryColor}66`,
              borderWidth: '1px',
              borderStyle: 'solid',
            }}
          >
            {releaseDate || (isReleaseDateFocused ? ' ' : '')}
          </div>
        )}
      </div>
    );
  };

  // Moteur de rendu principal des Gabarits Intelligents
  const renderSmartComposition = (layer: 'behind' | 'front', zIndex: number) => {
    if (layoutTemplateId === 'headliner_event') {
      return renderHeadlinerEvent(layer, zIndex);
    }
    if (layoutTemplateId === 'minimal_brand') {
      return renderMinimalBrand(layer, zIndex);
    }
    // Par défaut: 'duality_campaign'
    return renderDualityCampaign(layer, zIndex);
  };

  const containerAspect = isPostFormat
    ? '1 / 1'
    : isStoryFormat
      ? '9 / 16'
      : isBannerFormat
        ? '16 / 9'
        : isA3Format
          ? '1 / 1.414'
          : '4 / 5';

  const containerAspectClass = isPostFormat
    ? 'aspect-square'
    : isStoryFormat
      ? 'aspect-[9/16]'
      : isBannerFormat
        ? 'aspect-[16/9]'
        : isA3Format
          ? 'aspect-[1/1.414]'
          : 'aspect-[4/5]';

  const virtualCanvasHeight = isPostFormat
    ? BASE_WIDTH
    : isStoryFormat
      ? 1920
      : isBannerFormat
        ? 608
        : isA3Format
          ? 1528
          : BASE_HEIGHT;

  return (
    <div
      ref={assignRefs}
      data-poster-container="true"
      onContextMenu={(e) => e.preventDefault()}
      className={`@container relative w-full h-full ${containerAspectClass} overflow-hidden select-none -webkit-touch-callout-none ${className}`}
      style={{
        aspectRatio: containerAspect,
        backgroundColor: canvasBgColor,
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none',
        ...style,
      }}
    >
      {/* 
        =======================================================================
        STRUCTURE DE COUVERTURE TOTALE (ZERO BANDE NOIRE)
        - Conteneur en absolute inset-0 w-full h-full overflow-hidden pointer-events-none
        - Aucun wrapper intermédiaire (ni max-w, max-h, aspect-square ou hauteur fixe)
        - Débord permanent (bleed 130%, top -15%, left -15%) pour absorber les translations
        - Offsets bornés entre -12% et +12% : 0% de pixel noir visible quel que soit le format
        =======================================================================
      */}
      {(data.backgroundUrl || backgroundImage) ? (
        <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
          <img
            src={data.backgroundUrl || backgroundImage}
            alt="Décor"
            crossOrigin="anonymous"
            draggable={false}
            loading="eager"
            fetchPriority="high"
            decoding="async"
            onContextMenu={(e) => e.preventDefault()}
            className={`absolute max-w-none max-h-none object-cover select-none ${
              isDecorPointerActive
                ? isLocalDraggingBg
                  ? 'cursor-grabbing active:cursor-grabbing'
                  : 'cursor-grab active:cursor-grabbing'
                : ''
            }`}
            style={{
              width: '130%',
              height: '130%',
              top: '-15%',
              left: '-15%',
              transform: `translate(${input.backgroundOffsetX ?? 0}%, ${input.backgroundOffsetY ?? 0}%)`,
              pointerEvents: isDecorPointerActive ? 'auto' : 'none',
              opacity: (isToneCenter || Math.abs(currentTone - 0.5) < 0.03)
                ? 1
                : (data.backgroundOpacity ?? 1),
              filter: (isToneCenter || Math.abs(currentTone - 0.5) < 0.03 || toneOverlay.filterCss === 'none') ? 'none' : toneOverlay.filterCss,
            }}
            onPointerDown={isDecorPointerActive ? handleBgPointerDown : undefined}
            onMouseDown={isDecorPointerActive ? handleBgMouseDown : undefined}
            onTouchStart={isDecorPointerActive ? handleBgTouchStart : undefined}
            onClick={isDecorPointerActive ? (e) => {
              if (!bgDragRef.current?.hasMoved) {
                e.stopPropagation();
                onVisualElementClick?.('decor');
              }
            } : undefined}
            title={isDecorPointerActive ? "Glisser pour déplacer le décor (ou cliquer pour régler)" : undefined}
          />
        </div>
      ) : null}

      {/* Calque de Tonalité Blanc ↔ Noir sur toute la surface */}
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

      {/* 
        =======================================================================
        VIRTUAL CANVAS REFERENCE & AUTO-SCALING BOX (HOMOTHETIC ENGINE)
        Dimensions immuables de référence : 1080 x 1350 px (Ratio 4:5 strict)
        Facteur d'échelle homothétique : scaleFactor = parentWidth / 1080
        =======================================================================
      */}
      <div
        data-poster-virtual-canvas="true"
        className="@container relative overflow-visible select-none z-[1] pointer-events-none"
        style={{
          width: `${BASE_WIDTH}px`,
          height: `${virtualCanvasHeight}px`,
          position: 'absolute',
          top: 0,
          left: 0,
          transformOrigin: 'top left',
          transform: `scale(${scaleFactor})`,
          containerType: 'inline-size',
          backgroundColor: 'transparent',
          WebkitTouchCallout: 'none',
          WebkitUserSelect: 'none',
          userSelect: 'none',
          pointerEvents: 'none',
        }}
      >
        {/* Pipeline automatisé Defringe : Érosion de masque de 1px + Blur 0.5px sur le canal Alpha */}
        <svg
          className="absolute w-0 h-0 pointer-events-none select-none opacity-0"
          aria-hidden="true"
          style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}
        >
          <defs>
            <filter
              id="dropper-subject-defringe"
              x="-5%"
              y="-5%"
              width="110%"
              height="110%"
              colorInterpolationFilters="sRGB"
            >
              <feMorphology in="SourceAlpha" operator="erode" radius="1" result="erodedAlpha" />
              <feGaussianBlur in="erodedAlpha" stdDeviation="0.5" result="softAlpha" />
              <feComposite in="SourceGraphic" in2="softAlpha" operator="in" />
            </filter>
          </defs>
        </svg>

      {/* Lueur colorée (backlight/glow) d'ambiance de fond (strictement sous les textes et le sujet) - désactivée si fond présent ou tonalité neutre */}
      {subjectImage && !backgroundUrl && !isToneCenter && (
        <div
          className="absolute inset-0 pointer-events-none z-[5] flex items-center justify-center"
          style={{
            background: `radial-gradient(circle at 50% 65%, ${primaryColor}40 0%, ${primaryColor}15 35%, transparent 70%)`,
            filter: 'blur(30px)',
          }}
        />
      )}

      {/* Calque d'ambiance de fond (strictement sous les textes et le sujet) - désactivé en position neutre (50%) pour préserver l'image de fond brute */}
      {subjectImage && isHarmonized && !isToneCenter && (
        <div
          className="absolute inset-0 pointer-events-none z-[6] transition-all duration-300"
          style={{
            background: isLightCanvas
              ? 'radial-gradient(ellipse at 50% 65%, transparent 35%, rgba(0,0,0,0.14) 100%)'
              : `radial-gradient(ellipse at 50% 70%, transparent 40%, rgba(0,0,0,0.55) 95%), radial-gradient(circle at 50% 60%, ${primaryColor}18 0%, transparent 65%)`,
            mixBlendMode: isLightCanvas ? 'multiply' : 'soft-light',
          }}
        />
      )}

      {/* 3. Textes situés "derrière le sujet" (z-index: 10) */}
      {compositionTemplate === 'custom_legacy' ? (
        <div
          className="absolute inset-0 flex flex-col justify-between pointer-events-none z-10"
          style={{ padding: '2.2cqi' }}
        >
          {renderTextLayer((item) => {
            const isBehind = item.layerPosition === 'behind_subject' || (item.type === 'titre' && isTitleBehindSubject);
            return isBehind;
          }, 10)}
        </div>
      ) : (
        renderSmartComposition('behind', 10)
      )}

      {/* 4. Image du Sujet 1 avec Drag & Drop interactif et détection de clic */}
      {subjectImage && (
        <div
          data-subject-container="true"
          className={`absolute inset-0 flex ${
            subjectAlignX === 'right'
              ? 'justify-end pr-[8%]'
              : subjectAlignX === 'left'
                ? 'justify-start pl-[8%]'
                : 'justify-center'
          } items-end pointer-events-none ${isSubject2Tab ? 'z-20' : (isSubject1InFront ? 'z-[22]' : 'z-20')} overflow-visible`}
          style={{
            transform: `translate(${subjectOffsetX}%, ${subjectOffsetY}%) scale(${subjectScale})`,
            transformOrigin: 'bottom center',
            opacity: subjectOpacity,
            mixBlendMode: blendMode,
            pointerEvents: 'none',
            zIndex: s1ZIndex,
          }}
        >
          <div
            className={`relative inline-flex items-end justify-center overflow-visible ${
              isS1PointerActive
                ? (isLocalDraggingSubject || isDraggingSubject)
                  ? 'cursor-grabbing active:cursor-grabbing pointer-events-auto'
                  : 'cursor-grab active:cursor-grabbing pointer-events-auto'
                : 'pointer-events-none cursor-default'
            }`}
            style={{
              pointerEvents: isS1PointerActive ? 'auto' : 'none',
              ...s1FadeMaskStyle,
            }}
          >
            <img
              src={subjectImage}
              crossOrigin="anonymous"
              alt="Sujet Flyer"
              draggable={false}
              loading="eager"
              fetchPriority="high"
              decoding="async"
              onContextMenu={(e) => e.preventDefault()}
              onPointerDown={isS1PointerActive ? handleSubjectPointerDown : undefined}
              onMouseDown={isS1PointerActive ? handleSubjectMouseDown : undefined}
              onTouchStart={isS1PointerActive ? handleSubjectTouchStart : undefined}
              onClick={isS1PointerActive ? (e) => {
                e.stopPropagation();
                onVisualElementClick?.('subject');
              } : undefined}
              title={isS1PointerActive ? "Glisser-déposer pour déplacer librement le sujet" : undefined}
              className={`max-h-full max-w-full object-contain object-bottom select-none image-render-hd transition-all ${
                isS1PointerActive
                  ? (isLocalDraggingSubject || isDraggingSubject)
                    ? 'pointer-events-auto cursor-grabbing active:cursor-grabbing ring-2 ring-lime-400 shadow-[0_0_25px_rgba(163,230,53,0.85)] scale-[1.01]'
                    : 'pointer-events-auto cursor-grab active:cursor-grabbing hover:ring-2 hover:ring-lime-400/80 ring-1 ring-dashed ring-lime-400/80 shadow-[0_0_15px_rgba(163,230,53,0.25)] rounded-xl'
                  : 'pointer-events-none cursor-default'
              }`}
              style={{
                WebkitTouchCallout: 'none',
                WebkitUserSelect: 'none',
                userSelect: 'none',
                touchAction: 'none',
                pointerEvents: isS1PointerActive ? 'auto' : 'none',
                imageRendering: 'high-quality' as any,
                WebkitBackfaceVisibility: 'hidden',
                backfaceVisibility: 'hidden',
                transform: 'translateZ(0)',
                filter: renderSubjectFilter(),
                ...s1FadeMaskStyle,
              }}
            />
          </div>
        </div>
      )}

      {/* Second Sujet B2B si présent avec Drag & Drop interactif */}
      {secondarySubjectImage && (
        <div
          className={`absolute inset-0 flex items-end justify-center pointer-events-none ${isSubject2Tab ? 'z-[23]' : (isSubject1InFront ? 'z-20' : 'z-[22]')} overflow-visible`}
          style={{
            transform: `translate(${secondarySubjectOffsetX}%, ${secondarySubjectOffsetY}%) scale(${secondarySubjectScale})`,
            transformOrigin: 'bottom center',
            mixBlendMode: 'normal',
            opacity: typeof data.secondaryDjPhotoOpacity === 'number' ? data.secondaryDjPhotoOpacity : 1,
            pointerEvents: 'none',
            zIndex: s2ZIndex,
          }}
        >
          <div
            className={`relative inline-flex items-end justify-center overflow-visible ${
              isS2PointerActive
                ? isLocalDraggingSubject2
                  ? 'cursor-grabbing active:cursor-grabbing pointer-events-auto'
                  : 'cursor-grab active:cursor-grabbing pointer-events-auto'
                : 'pointer-events-none cursor-default'
            }`}
            style={{
              pointerEvents: isS2PointerActive ? 'auto' : 'none',
              ...s2FadeMaskStyle,
            }}
          >
            <img
              src={secondarySubjectImage}
              crossOrigin="anonymous"
              alt="Second Sujet B2B"
              draggable={false}
              onContextMenu={(e) => e.preventDefault()}
              onPointerDown={isS2PointerActive ? handleSubject2PointerDown : undefined}
              onMouseDown={isS2PointerActive ? handleSubject2MouseDown : undefined}
              onTouchStart={isS2PointerActive ? handleSubject2TouchStart : undefined}
              onClick={isS2PointerActive ? (e) => {
                e.stopPropagation();
                onVisualElementClick?.('subject2' as any);
              } : undefined}
              title={isS2PointerActive ? "Glisser-déposer pour déplacer librement le sujet 2" : undefined}
              className={`max-h-full max-w-full object-contain object-bottom select-none image-render-hd transition-all ${
                isS2PointerActive
                  ? isLocalDraggingSubject2
                    ? 'pointer-events-auto cursor-grabbing active:cursor-grabbing ring-2 ring-lime-400 shadow-[0_0_25px_rgba(163,230,53,0.85)] scale-[1.01]'
                    : 'pointer-events-auto cursor-grab active:cursor-grabbing hover:ring-2 hover:ring-lime-400/80 ring-1 ring-dashed ring-lime-400/80 shadow-[0_0_15px_rgba(163,230,53,0.25)] rounded-xl'
                  : 'pointer-events-none cursor-default'
              }`}
              style={{
                WebkitTouchCallout: 'none',
                WebkitUserSelect: 'none',
                userSelect: 'none',
                touchAction: 'none',
                pointerEvents: isS2PointerActive ? 'auto' : 'none',
                ...s2FadeMaskStyle,
              }}
            />
          </div>
        </div>
      )}

      {/* Calque de rehaussement de contraste (Scrim) : strictement désactivé en position neutre (50%) ou avec fond d'image pour préserver la fidélité de l'arrière-plan */}
      {!isToneCenter && currentTone > 0.5 && !backgroundUrl && (
        <div
          data-scrim-contrast="true"
          className="absolute inset-0 pointer-events-none z-[24]"
          style={{
            pointerEvents: 'none',
            background: layoutTemplateId === 'duality_campaign'
              ? 'linear-gradient(to bottom, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0) 42%, rgba(0, 0, 0, 0.45) 62%, rgba(0, 0, 0, 0.92) 82%, #000000 100%)'
              : 'linear-gradient(to bottom, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0) 50%, rgba(0, 0, 0, 0.25) 65%, rgba(0, 0, 0, 0.6) 82%, rgba(0, 0, 0, 0.85) 100%)',
          }}
        />
      )}

      {/* 5. Logo superposé déplaçable librement (z-index: 25) */}
      <OverlayLogo
        input={data}
        setInput={setInput}
        previewFormat={targetFormatKey}
        disabled={!isInteractive}
        isActive={isLogoActive}
        isExporting={isExporting}
        subjectTransform={subjectImage ? {
          scale: subjectScale,
          offsetY: subjectOffsetY,
          offsetX: subjectOffsetX,
          alignX: subjectAlignX,
        } : null}
        onLogoClick={isInteractive ? () => onVisualElementClick?.('logo') : undefined}
      />

      {/* 6. Textes positionnés DEVANT le sujet (z-index: 30) */}
      {compositionTemplate === 'custom_legacy' ? (
        <div
          className="absolute inset-0 flex flex-col justify-between pointer-events-none z-30"
          style={{ padding: '2.2cqi', pointerEvents: 'none' }}
        >
          {renderTextLayer((item) => {
            const isBehind = item.layerPosition === 'behind_subject' || (item.type === 'titre' && isTitleBehindSubject);
            return !isBehind;
          }, 30)}
        </div>
      ) : (
        renderSmartComposition('front', 30)
      )}

      {/* 7. Éléments d'interface / Cartouche (z-index: 40) - Uniquement pour Campagne Duale ou Custom Legacy */}
      <div
        className="absolute inset-0 flex flex-col justify-end pointer-events-none z-40 pb-[2%]"
        style={{ pointerEvents: 'none' }}
      >
        {hasCartoucheContent && layoutTemplateId !== 'headliner_event' && layoutTemplateId !== 'minimal_brand' && (
          <div
            className={`w-full flex pointer-events-none select-none relative z-[40] ${
              resolvedAlignments.infoBadge === 'left'
                ? 'justify-start'
                : resolvedAlignments.infoBadge === 'right'
                  ? 'justify-end'
                  : 'justify-center'
            }`}
            style={{
              transform: `translateX(${cartoucheOffsetX}%) translateY(${cartoucheOffsetY}cqi)`,
              touchAction: 'none',
              pointerEvents: 'none',
            }}
          >
            {cartoucheCalendarUrl || cartoucheMapsUrl ? (
              <a
                href={cartoucheCalendarUrl || cartoucheMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`pointer-events-auto block hover:opacity-90 transition rounded-md max-w-full ${!isInteractive ? 'cursor-pointer' : ''}`}
                title="Ajouter au calendrier ou voir l'itinéraire"
              >
                <div
                  onPointerDown={isTextsActive ? (e) => handleInternalTextPointerDown(e, 'infoBadge', 'date') : undefined}
                  onPointerMove={isTextsActive ? handleInternalTextPointerMove : undefined}
                  onPointerUp={isTextsActive ? handleInternalTextPointerUp : undefined}
                  className={`inline-flex items-center justify-center font-mono border max-w-full transition-all select-none ${
                    isTextsActive
                      ? isDraggingField === 'infoBadge'
                        ? 'cursor-grabbing ring-2 ring-lime-400 shadow-[0_0_15px_rgba(163,230,53,0.85)] pointer-events-auto'
                        : ['date', 'timeSlot', 'venue', 'infoBadge'].includes(effectiveFocusedField || '')
                          ? 'border-lime-400 bg-zinc-950/95 text-lime-300 shadow-[0_0_12px_rgba(163,230,53,0.85)] ring-2 ring-lime-400 pointer-events-auto'
                          : 'cursor-grab hover:ring-1 hover:ring-lime-400/80 pointer-events-auto'
                      : 'pointer-events-none select-none'
                  } ${
                    (cartoucheColor === '#000000' || isLightCanvas)
                      ? 'bg-white/90 text-black border-zinc-300'
                      : 'bg-zinc-950/90 text-zinc-200 border-zinc-700'
                  }`}
                  style={{
                    color: cartoucheColor || infoBadgeStyle.color,
                    fontSize: `${2.4 * cartoucheScale}cqi`,
                    padding: `${0.9 * cartouchePadding}cqi ${2.0 * cartouchePadding}cqi`,
                    borderRadius: `${0.8 * cartoucheScale}cqi`,
                    pointerEvents: isTextsActive ? 'auto' : 'none',
                  }}
                  title={isTextsActive ? "Glisser verticalement pour déplacer ou cliquer pour modifier" : undefined}
                >
                  <span className="font-bold uppercase whitespace-pre overflow-visible flex items-center justify-center gap-1.5 flex-wrap">
                    {Boolean(hasCartoucheDate || isDateFocused) && (
                      <span
                        data-tap-edit="date"
                        onClick={isTextsActive ? (e) => {
                          e.stopPropagation();
                          onVisualElementClick?.('texts', 'date');
                        } : undefined}
                        className={`truncate transition-all ${
                          isTextsActive ? 'cursor-pointer hover:underline' : 'pointer-events-none select-none'
                        } ${isDateFocused ? 'text-lime-300 underline font-black drop-shadow-[0_0_6px_rgba(163,230,53,0.9)]' : ''}`}
                      >
                        {Boolean(cartoucheCalendarUrl) && <span className="mr-0.5 text-lime-400 opacity-90">📅 </span>}
                        {cartoucheDate || (isDateFocused ? ' ' : '')}
                      </span>
                    )}
                    {Boolean((hasCartoucheDate || isDateFocused) && (hasCartoucheTime || isTimeFocused || hasCartoucheVenue || isVenueFocused)) && (
                      <span className="opacity-40 select-none shrink-0">•</span>
                    )}
                    {Boolean(hasCartoucheTime || isTimeFocused) && (
                      <span
                        data-tap-edit="timeSlot"
                        onClick={isTextsActive ? (e) => {
                          e.stopPropagation();
                          onVisualElementClick?.('texts', 'timeSlot');
                        } : undefined}
                        className={`truncate transition-all ${
                          isTextsActive ? 'cursor-pointer hover:underline' : 'pointer-events-none select-none'
                        } ${isTimeFocused ? 'text-lime-300 underline font-black drop-shadow-[0_0_6px_rgba(163,230,53,0.9)]' : ''}`}
                      >
                        {cartoucheTime || (isTimeFocused ? ' ' : '')}
                      </span>
                    )}
                    {Boolean((hasCartoucheTime || isTimeFocused) && (hasCartoucheVenue || isVenueFocused)) && (
                      <span className="opacity-40 select-none shrink-0">•</span>
                    )}
                    {Boolean(hasCartoucheVenue || isVenueFocused) && (
                      <span
                        data-tap-edit="venue"
                        onClick={isTextsActive ? (e) => {
                          e.stopPropagation();
                          onVisualElementClick?.('texts', 'venue');
                        } : undefined}
                        className={`truncate transition-all ${
                          isTextsActive ? 'cursor-pointer hover:underline' : 'pointer-events-none select-none'
                        } ${isVenueFocused ? 'text-lime-300 underline font-black drop-shadow-[0_0_6px_rgba(163,230,53,0.9)]' : ''}`}
                      >
                        {Boolean(cartoucheMapsUrl) && <span className="mr-0.5 text-lime-400 opacity-90">📍 </span>}
                        {cartoucheVenue || (isVenueFocused ? ' ' : '')}
                      </span>
                    )}
                  </span>
                </div>
              </a>
            ) : (
              <div
                onPointerDown={isTextsActive ? (e) => handleInternalTextPointerDown(e, 'infoBadge', 'date') : undefined}
                onPointerMove={isTextsActive ? handleInternalTextPointerMove : undefined}
                onPointerUp={isTextsActive ? handleInternalTextPointerUp : undefined}
                className={`inline-flex items-center justify-center font-mono border max-w-full transition-all select-none ${
                  isTextsActive
                    ? isDraggingField === 'infoBadge'
                      ? 'cursor-grabbing ring-2 ring-lime-400 shadow-[0_0_15px_rgba(163,230,53,0.85)] pointer-events-auto'
                      : ['date', 'timeSlot', 'venue', 'infoBadge'].includes(effectiveFocusedField || '')
                        ? 'border-lime-400 bg-zinc-950/95 text-lime-300 shadow-[0_0_12px_rgba(163,230,53,0.85)] ring-2 ring-lime-400 pointer-events-auto'
                        : 'cursor-grab hover:ring-1 hover:ring-lime-400/80 pointer-events-auto'
                    : 'pointer-events-none select-none'
                } ${
                  (cartoucheColor === '#000000' || isLightCanvas)
                    ? 'bg-white/90 text-black border-zinc-300'
                    : 'bg-zinc-950/90 text-zinc-200 border-zinc-700'
                }`}
                style={{
                  color: cartoucheColor || infoBadgeStyle.color,
                  fontSize: `${2.4 * cartoucheScale}cqi`,
                  padding: `${0.9 * cartouchePadding}cqi ${2.0 * cartouchePadding}cqi`,
                  borderRadius: `${0.8 * cartoucheScale}cqi`,
                  pointerEvents: isTextsActive ? 'auto' : 'none',
                }}
                title={isTextsActive ? "Glisser verticalement pour déplacer ou cliquer pour modifier" : undefined}
              >
                <span className="font-bold uppercase whitespace-pre overflow-visible flex items-center justify-center gap-1.5 flex-wrap">
                  {Boolean(hasCartoucheDate || isDateFocused) && (
                    <span
                      data-tap-edit="date"
                      onClick={isTextsActive ? (e) => {
                        e.stopPropagation();
                        onVisualElementClick?.('texts', 'date');
                      } : undefined}
                      className={`truncate transition-all ${
                        isTextsActive ? 'cursor-pointer hover:underline' : 'pointer-events-none select-none'
                      } ${isDateFocused ? 'text-lime-300 underline font-black drop-shadow-[0_0_6px_rgba(163,230,53,0.9)]' : ''}`}
                    >
                      {cartoucheDate || (isDateFocused ? ' ' : '')}
                    </span>
                  )}
                  {Boolean((hasCartoucheDate || isDateFocused) && (hasCartoucheTime || isTimeFocused || hasCartoucheVenue || isVenueFocused)) && (
                    <span className="opacity-40 select-none shrink-0">•</span>
                  )}
                  {Boolean(hasCartoucheTime || isTimeFocused) && (
                    <span
                      data-tap-edit="timeSlot"
                      onClick={isTextsActive ? (e) => {
                        e.stopPropagation();
                        onVisualElementClick?.('texts', 'timeSlot');
                      } : undefined}
                      className={`truncate transition-all ${
                        isTextsActive ? 'cursor-pointer hover:underline' : 'pointer-events-none select-none'
                      } ${isTimeFocused ? 'text-lime-300 underline font-black drop-shadow-[0_0_6px_rgba(163,230,53,0.9)]' : ''}`}
                    >
                      {cartoucheTime || (isTimeFocused ? ' ' : '')}
                    </span>
                  )}
                  {Boolean((hasCartoucheTime || isTimeFocused) && (hasCartoucheVenue || isVenueFocused)) && (
                    <span className="opacity-40 select-none shrink-0">•</span>
                  )}
                  {Boolean(hasCartoucheVenue || isVenueFocused) && (
                    <span
                      data-tap-edit="venue"
                      onClick={isTextsActive ? (e) => {
                        e.stopPropagation();
                        onVisualElementClick?.('texts', 'venue');
                      } : undefined}
                      className={`truncate transition-all ${
                        isTextsActive ? 'cursor-pointer hover:underline' : 'pointer-events-none select-none'
                      } ${isVenueFocused ? 'text-lime-300 underline font-black drop-shadow-[0_0_6px_rgba(163,230,53,0.9)]' : ''}`}
                    >
                      {cartoucheVenue || (isVenueFocused ? ' ' : '')}
                    </span>
                  )}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  </div>
);
};

export default FlyerPosterRenderer;
