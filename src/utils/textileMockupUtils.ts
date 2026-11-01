/**
 * textileMockupUtils.ts
 * Utilitaires unifiés de placement, masquage et synchronisation pour les mockups textiles DTF.
 * Standard DTF :
 * - Face : Marquage Cœur / Poitrine (10x10cm à 12x12cm, base 14%)
 * - Dos : Impression Dorsale A3 (30x42cm, base 32%)
 */

import React from 'react';
import { EventInput, LogoColorMode, LogoPlacement } from '../types';

/**
 * Limites physiques et géométriques strictes de la zone d'impression DTF (en % du gabarit 100% x 100%)
 */
export const DTF_PRINT_BOUNDS = {
  front: {
    baseWidth: 14,
    defaultX: 68,
    defaultY: 34,
    minScale: 0.4,
    maxScale: 1.5,
    // Zone autorisée sur la poitrine / cœur (départ encolure à 22%, emmanchure à 80%)
    zoneXMin: 44,
    zoneXMax: 78,
    zoneYMin: 24,
    zoneYMax: 44,
  },
  back: {
    baseWidth: 32,
    defaultX: 50,
    defaultY: 38,
    minScale: 0.5,
    maxScale: 1.35,
    // Zone autorisée sur le dos A3 (sous l'encolure dos à 20%, au-dessus du bas vêtement)
    zoneXMin: 26,
    zoneXMax: 74,
    zoneYMin: 22,
    zoneYMax: 65,
  },
} as const;

/**
 * Détecte si une URL de logo est un placeholder ou une démo
 */
export const isDemoOrInvalidLogo = (url?: string | null): boolean => {
  if (!url) return true;
  return (
    url.includes('logo-demo') ||
    url.includes('21nine') ||
    url.includes('signaid-logo') ||
    url.includes('mannequin-blank')
  );
};

/**
 * Borne strictement le placement et l'échelle dans les limites de la zone d'impression DTF.
 * Empêche tout dépassement du logo hors des limites du vêtement ou de la zone d'impression.
 */
export function clampDtfPlacement(
  placement: Partial<LogoPlacement> | undefined,
  side: 'front' | 'back'
): LogoPlacement {
  const bounds = DTF_PRINT_BOUNDS[side];
  const rawScale = typeof placement?.scale === 'number' && !Number.isNaN(placement.scale)
    ? placement.scale
    : 1.0;
  const scale = Math.max(bounds.minScale, Math.min(bounds.maxScale, rawScale));
  const halfBox = (bounds.baseWidth * scale) / 2;

  // Calcul des bornes effectives du centre pour que l'intégralité du rectangle reste dans la zone DTF
  const minX = Math.min(bounds.defaultX, bounds.zoneXMin + halfBox);
  const maxX = Math.max(bounds.defaultX, bounds.zoneXMax - halfBox);
  const minY = Math.min(bounds.defaultY, bounds.zoneYMin + halfBox);
  const maxY = Math.max(bounds.defaultY, bounds.zoneYMax - halfBox);

  const rawX = typeof placement?.x === 'number' && !Number.isNaN(placement.x)
    ? placement.x
    : bounds.defaultX;
  const rawY = typeof placement?.y === 'number' && !Number.isNaN(placement.y)
    ? placement.y
    : bounds.defaultY;

  const clampedX = Math.round(Math.max(minX, Math.min(maxX, rawX)) * 10) / 10;
  const clampedY = Math.round(Math.max(minY, Math.min(maxY, rawY)) * 10) / 10;
  const roundedScale = Math.round(scale * 100) / 100;

  return {
    x: clampedX,
    y: clampedY,
    scale: roundedScale,
  };
}

/**
 * Résout le logo actif pour le textile :
 * 1. Pour la vue de dos : utilise le fichier haute résolution ou logo dédié dos s'il existe
 * 2. Si aucun logo dos spécifique n'est chargé, hérite fidèlement de la Face
 * 3. Privilégie la version vectorielle SVG remasterisée ou le fichier source brut haute résolution
 * 4. Rendu propre, net, sans compression destructive
 */
export function resolveActiveTextileLogo(
  input: Partial<EventInput> | null | undefined,
  side: 'front' | 'back'
): string {
  if (!input) return '';

  const formatSvg = (svg?: string | null): string | undefined => {
    if (!svg) return undefined;
    return svg.startsWith('data:')
      ? svg
      : `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  };

  const remasteredSvg = input.isLogoRedesignRequested && input.redesignedLogoSvg
    ? formatSvg(input.redesignedLogoSvg)
    : undefined;

  // 1. Vue Dos : priorité absolue au logo spécifique Dos (s'il est configuré et non-démo)
  if (side === 'back') {
    // Si explicitement désactivé ou vidé pour la vue Dos : aucun logo au dos
    if (input.tshirtBackLogoDisabled || input.tshirtBackCustomLogo === '') {
      return '';
    }

    const customBack = input.tshirtBackCustomLogo && !isDemoOrInvalidLogo(input.tshirtBackCustomLogo)
      ? input.tshirtBackCustomLogo
      : undefined;

    if (customBack) {
      return customBack;
    }
  }

  // 2. Logo spécifique Face (priorité à la source brute sans perte rawTshirtLogoOriginal)
  const customFront =
    (input.rawTshirtLogoOriginal && !isDemoOrInvalidLogo(input.rawTshirtLogoOriginal) ? input.rawTshirtLogoOriginal : undefined) ||
    (input.tshirtCustomLogo && !isDemoOrInvalidLogo(input.tshirtCustomLogo) ? input.tshirtCustomLogo : undefined);

  if (customFront) {
    return customFront;
  }

  // 3. Logo vectoriel remasterisé / reconçu si actif
  if (remasteredSvg) {
    return remasteredSvg;
  }

  // 4. Source brute originale du logo studio (affiche)
  if (input.rawLogoImage && !isDemoOrInvalidLogo(input.rawLogoImage)) {
    return input.rawLogoImage;
  }

  // 5. Logo studio actif (logoImage ou logoUrl)
  if (input.logoImage && !isDemoOrInvalidLogo(input.logoImage)) {
    return input.logoImage;
  }
  if (input.logoUrl && !isDemoOrInvalidLogo(input.logoUrl)) {
    return input.logoUrl;
  }

  // 6. Sujet visuel actuel (photo DJ / artiste / sujet détouré)
  if (input.djPhoto && !isDemoOrInvalidLogo(input.djPhoto)) {
    return input.djPhoto;
  }

  // Aucun logo utilisateur chargé : rendu vierge (aucun logo démo forcé)
  return '';
}

/**
 * Résout le mode de couleur / tonalité pour le vêtement :
 * Synchronise la tonalité du logo studio avec le rendu textile
 */
export function resolveActiveTextileColorMode(
  input: Partial<EventInput> | null | undefined,
  garmentColor: string = 'black'
): LogoColorMode {
  if (!input) return 'original';

  // Si une couleur exclusive au vêtement a été sélectionnée
  if (input.tshirtLogoColorMode) {
    if (input.tshirtLogoColorMode === 'auto') {
      return garmentColor === 'white' ? 'black' : 'white';
    }
    return input.tshirtLogoColorMode;
  }

  // Sinon hérite fidèlement de la tonalité active du studio
  const studioMode = input.logoColorMode || 'auto';
  if (studioMode === 'auto' || studioMode === 'neon') {
    return garmentColor === 'white' ? 'black' : 'white';
  }
  return studioMode;
}

/**
 * Génère le filtre CSS pour le DTF textile.
 * Rendu haute résolution parfaitement net :
 * Désactivation de tout flou gaussien et ombre portée redondante qui altèrent la lisibilité.
 */
export function getTextileLogoFilter(
  colorMode: LogoColorMode,
  _side: 'front' | 'back'
): string {
  // Pour le blanc : transformer en blanc pur net, sans aucune ombre floue
  if (colorMode === 'white') {
    return 'brightness(0) invert(1)';
  }
  // Pour le noir : transformer en noir avec contour tranché
  if (colorMode === 'black') {
    return 'brightness(0)';
  }
  // Rendu original/vectoriel : zéro filtre dégradant, netteté 100% sans effet de superposition
  return 'none';
}

/**
 * Calcule le style CSS absolu pour afficher le calque DTF sans zoom indésirable ni déformation.
 * Centré précisément selon les coordonnées DTF (omoplates grand format pour le dos).
 */
export function getTextileLogoStyle(
  placement: LogoPlacement,
  side: 'front' | 'back',
  colorMode: LogoColorMode,
  isDragging = false
): React.CSSProperties {
  const clamped = clampDtfPlacement(placement, side);
  const isScreenBlend = colorMode === 'white' || colorMode === 'knockout_black';
  const widthPercent = side === 'back'
    ? 32 * clamped.scale
    : 14 * clamped.scale;

  return {
    position: 'absolute',
    left: `${clamped.x}%`,
    top: `${clamped.y}%`,
    width: `${widthPercent}%`,
    aspectRatio: '1 / 1',
    transform: 'translate(-50%, -50%)',
    filter: getTextileLogoFilter(colorMode, side),
    mixBlendMode: isScreenBlend ? 'screen' : 'normal',
    objectFit: 'contain',
    pointerEvents: 'none',
    userSelect: 'none',
    WebkitUserSelect: 'none',
    imageRendering: '-webkit-optimize-contrast',
    transition: isDragging ? 'none' : 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
  };
}

/**
 * Résout le gabarit textile standard officiel (JHK170 standard regular pour t-shirt).
 * Supprime tout aspect oversize non désiré en rétablissant les gabarits standard d'origine.
 */
export function resolveGarmentTemplateSrc(
  garmentType: 'tshirt' | 'hoodie' = 'tshirt',
  tshirtColor: string = 'black',
  side: 'front' | 'back'
): string {
  const isWhite = tshirtColor === 'white';
  const isGrey = tshirtColor === 'grey' || tshirtColor === 'gray';
  const isHoodie = garmentType === 'hoodie';

  if (isHoodie) {
    if (isWhite) {
      return side === 'front'
        ? '/assets/hoodie-white-JHK421.png'
        : '/assets/hoodie-white-JHK421-dos.png';
    }
    return side === 'front'
      ? '/assets/hoodie-black-JHK421.png'
      : '/assets/hoodie-black-JHK421-dos.png';
  }

  // T-shirt standard d'origine JHK 170g (Regular fit standard non oversize)
  if (isWhite) {
    return side === 'front'
      ? '/assets/tshirt-white-JHK170.png'
      : '/assets/tshirt-white-JHK170-dos.png';
  }
  if (isGrey) {
    return side === 'front'
      ? '/assets/tshirt-grey-JHK170.png'
      : '/assets/tshirt-grey-JHK170-dos.png';
  }
  return side === 'front'
    ? '/assets/tshirt-black-JHK170.png'
    : '/assets/tshirt-black-JHK170-dos.png';
}

/**
 * Émet un événement local pour synchroniser instantanément les onglets et composants
 */
export function notifyHubProjectUpdated(): void {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new CustomEvent('signaid:project_updated'));
    window.dispatchEvent(new CustomEvent('droppaid:hub_sync'));
  } catch {
    /* ignore */
  }
}

/**
 * Calcule la position et mise à l'échelle d'un logo adaptées au corps humain sur mannequin.
 * Standard DTF :
 * - Face : pectoral gauche (top: 48%, left: 68%, width: 14%)
 * - Dos : omoplates centré (top: 42%, left: 50%, width: 32%)
 */
export function getMannequinPosition(
  p?: Partial<LogoPlacement>,
  isBack: boolean = false
): {
  top: string;
  left: string;
  width: string;
  transform: string;
} {
  const scale = p?.scale ?? 1;
  const yOffset = p?.y !== undefined ? (p.y - (isBack ? 42 : 48)) : 0;
  if (isBack) {
    return {
      top: `${42 + yOffset}%`,
      left: '50%',
      width: `${32 * scale}%`,
      transform: 'translate(-50%, -50%)',
    };
  } else {
    return {
      top: `${48 + yOffset}%`,
      left: '68%',
      width: `${14 * scale}%`,
      transform: 'translate(-50%, -50%) rotate(-1.5deg)',
    };
  }
}
