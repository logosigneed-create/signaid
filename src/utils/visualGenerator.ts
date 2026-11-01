import { EventInput, GeneratedPack, VisualAsset, PrintCutFile, resolveLogoTransformForFormat, resolveDynamicLogoFilter, sanitizeStudioText, computeToneOverlay, resolveTextColorsForFormat, parseTextSegments, getCleanDisplayText } from '../types';
import {
  resolveActiveTextileLogo,
  resolveActiveTextileColorMode,
  clampDtfPlacement,
  getTextileLogoFilter,
} from './textileMockupUtils';
export { getAutoScaledFontSize } from './fontScaler';


export const PALETTE_CONFIGS: Record<
  string,
  {
    bg: string;
    cardBg: string;
    primary: string;
    accent: string;
    text: string;
    secondaryText: string;
    glow: string;
    gridColor: string;
    badgeBg: string;
  }
> = {
  'acid-techno': {
    bg: '#0d0a07',
    cardBg: '#18120c',
    primary: '#ff6b00',
    accent: '#ffaa00',
    text: '#fff8f0',
    secondaryText: '#a88a7a',
    glow: 'rgba(255, 107, 0, 0.4)',
    gridColor: 'rgba(255, 107, 0, 0.12)',
    badgeBg: '#2e1e12',
  },
  'cyber-noir': {
    bg: '#08080c',
    cardBg: '#101018',
    primary: '#00f0ff',
    accent: '#ff007f',
    text: '#ffffff',
    secondaryText: '#7b829e',
    glow: 'rgba(0, 240, 255, 0.4)',
    gridColor: 'rgba(0, 240, 255, 0.1)',
    badgeBg: '#181b2e',
  },
  'analog-retro': {
    bg: '#140f0c',
    cardBg: '#1c1613',
    primary: '#ff6b35',
    accent: '#f7c548',
    text: '#fff5ee',
    secondaryText: '#a38a7e',
    glow: 'rgba(255, 107, 53, 0.35)',
    gridColor: 'rgba(255, 107, 53, 0.1)',
    badgeBg: '#2a1f1a',
  },
  'brutalist-red': {
    bg: '#0d0d0d',
    cardBg: '#171717',
    primary: '#ff1e27',
    accent: '#ffffff',
    text: '#ffffff',
    secondaryText: '#999999',
    glow: 'rgba(255, 30, 39, 0.35)',
    gridColor: 'rgba(255, 30, 39, 0.15)',
    badgeBg: '#261214',
  },
  'y2k-chrome': {
    bg: '#0b0c10',
    cardBg: '#13151f',
    primary: '#c084fc',
    accent: '#38bdf8',
    text: '#f8fafc',
    secondaryText: '#94a3b8',
    glow: 'rgba(192, 132, 252, 0.35)',
    gridColor: 'rgba(192, 132, 252, 0.12)',
    badgeBg: '#211d33',
  },
  'emerald-rave': {
    bg: '#05120e',
    cardBg: '#09211b',
    primary: '#10b981',
    accent: '#2dd4bf',
    text: '#f0fdf4',
    secondaryText: '#6ee7b7',
    glow: 'rgba(16, 185, 129, 0.35)',
    gridColor: 'rgba(16, 185, 129, 0.12)',
    badgeBg: '#0c2e25',
  },
};

export function getPalette(paletteKey?: string, customTheme?: { primaryAccent?: string; secondaryAccent?: string }) {
  const base = (paletteKey && PALETTE_CONFIGS[paletteKey]) || PALETTE_CONFIGS['acid-techno'];
  if (customTheme?.primaryAccent) {
    return {
      ...base,
      primary: customTheme.primaryAccent,
      accent: customTheme.secondaryAccent || base.accent,
    };
  }
  return base;
}

export function getEffectiveArtistUrl(artistUrl?: string): string {
  if (!artistUrl || !artistUrl.trim()) return '';
  const trimmed = artistUrl.trim();
  return trimmed.startsWith('http://') || trimmed.startsWith('https://') ? trimmed : `https://${trimmed}`;
}

export function resolveGenreTypography(genre?: string) {
  const g = (genre || '').toLowerCase();

  if (g.includes('dur') || g.includes('techno') || g.includes('industrial') || g.includes('acid') || g.includes('hard')) {
    return {
      fontFamily: "'Impact', 'Arial Black', sans-serif",
      fontWeight: 900,
      letterSpacing: 5,
    };
  }

  if (g.includes('soft') || g.includes('urban') || g.includes('rap') || g.includes('trap') || g.includes('drill')) {
    return {
      fontFamily: "'Caveat Brush', 'Brush Script MT', cursive, sans-serif",
      fontWeight: 400,
      letterSpacing: 1,
    };
  }

  return {
    fontFamily: "'Syne', sans-serif",
    fontWeight: 900,
    letterSpacing: 4,
  };
}

function hexToNormalizedRgb(hex: string): [number, number, number] {
  const clean = (hex || '#ff6b00').replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;
  return [isNaN(r) ? 0 : r, isNaN(g) ? 0 : g, isNaN(b) ? 0 : b];
}

function escapeXml(unsafe: string) {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function getCleanAiIntegrationDefs(
  palette: typeof PALETTE_CONFIGS['acid-techno'],
  idPrefix = ''
): string {
  const [dr, dg, db] = hexToNormalizedRgb(palette.bg);
  const [pr, pg, pb] = hexToNormalizedRgb(palette.primary);
  const [ar, ag, ab] = hexToNormalizedRgb(palette.accent);

  return `
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Caveat+Brush&amp;family=Syne:wght@700;900&amp;display=swap');
    </style>
    <filter id="${idPrefix}duotoneRave" color-interpolation-filters="sRGB">
      <feColorMatrix type="matrix" values="0.299 0.587 0.114 0 0  0.299 0.587 0.114 0 0  0.299 0.587 0.114 0 0  0 0 0 1 0" result="gray"/>
      <feComponentTransfer in="gray" result="duotone">
        <feFuncR type="table" tableValues="${dr.toFixed(2)} ${pr.toFixed(2)} ${ar.toFixed(2)}" />
        <feFuncG type="table" tableValues="${dg.toFixed(2)} ${pg.toFixed(2)} ${ag.toFixed(2)}" />
        <feFuncB type="table" tableValues="${db.toFixed(2)} ${pb.toFixed(2)} ${ab.toFixed(2)}" />
      </feComponentTransfer>
    </filter>

    <radialGradient id="${idPrefix}vignetteRadial" cx="50%" cy="48%" r="48%">
      <stop offset="35%" stop-color="#ffffff" stop-opacity="1" />
      <stop offset="68%" stop-color="#ffffff" stop-opacity="0.85" />
      <stop offset="88%" stop-color="#ffffff" stop-opacity="0.35" />
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
    </radialGradient>
    <mask id="${idPrefix}vignetteMask" maskUnits="objectBoundingBox">
      <rect x="0" y="0" width="1" height="1" fill="url(#${idPrefix}vignetteRadial)" />
    </mask>
  `;
}

export function renderWatermarkOverlay(width: number, height: number, isUnlocked = false): string {
  return '';
}

export function extractDisplayDate(rawDate: string): string {
  if (!rawDate) return '';
  let cleaned = rawDate
    .replace(/\b(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b[\s,.-]*/gi, '')
    .replace(/[-–—/]\s*\d{1,2}[h:]\d{0,2}\s*([-–—/àa]\s*\d{1,2}[h:]\d{0,2}|à\s*l'aube)?/i, '')
    .trim();
  cleaned = cleaned.replace(/^[-–—,.\s]+|[-–—,.\s]+$/g, '').trim();
  return cleaned || rawDate;
}

export function extractTimeSlot(input: EventInput): string {
  if (input.timeSlot && input.timeSlot.trim()) {
    return input.timeSlot.trim();
  }
  const match = (input.date || '').match(/\d{1,2}[h:]\d{0,2}\s*[-–—/àa]\s*\d{1,2}[h:]\d{0,2}|\d{1,2}h\s*à\s*l'aube/i);
  if (match) {
    return match[0].trim();
  }
  return '23:00 — 06:00';
}

export interface SmartTextConfig {
  text: string;
  x: number;
  y: number;
  maxWidth: number;
  baseFontSize: number;
  minFontSize?: number;
  maxLines?: number;
  lineHeightRatio?: number;
  textAnchor?: 'middle' | 'start' | 'end';
  fill: string;
  fontWeight?: string | number;
  letterSpacing?: number;
  fontFamily?: string;
  fontStyle?: string;
  filter?: string;
  opacity?: number;
  isMonospace?: boolean;
  prefix?: string;
  suffix?: string;
  alignVertical?: 'center' | 'top' | 'baseline';
  accentColor?: string;
  highlightedWords?: string[];
}

export function renderSmartSvgText(cfg: SmartTextConfig): string {
  const {
    text,
    x,
    y,
    maxWidth,
    baseFontSize,
    minFontSize = Math.max(10, Math.floor(baseFontSize * 0.35)),
    maxLines = 2,
    lineHeightRatio = 1.15,
    textAnchor = 'middle',
    fill,
    fontWeight = 900,
    letterSpacing = 0,
    fontFamily = "'Syne', sans-serif",
    fontStyle,
    filter,
    opacity,
    isMonospace = false,
    prefix = '',
    suffix = '',
    alignVertical = 'center',
  } = cfg;

  const rawString = `${prefix}${text}${suffix}`.trim();
  if (!rawString) return '';

  const charRatio = isMonospace ? 0.60 : 0.85;
  const estimateWidth = (str: string, fs: number) => {
    return str.length * (fs * charRatio) + Math.max(0, str.length - 1) * letterSpacing;
  };

  const words = rawString.split(/\s+/).filter(Boolean);
  const singleLineWidth = estimateWidth(rawString, baseFontSize);

  let chosenLines: string[] = [rawString];
  let effectiveFontSize = baseFontSize;

  if (singleLineWidth <= maxWidth || maxLines <= 1) {
    if (singleLineWidth > maxWidth) {
      const scale = (maxWidth * 0.94) / singleLineWidth;
      effectiveFontSize = Math.max(minFontSize, Math.floor(baseFontSize * scale));
    } else {
      effectiveFontSize = baseFontSize;
    }
    chosenLines = [rawString];
  } else if (words.length <= 1) {
    // Mot unique : JAMAIS de césure ou de coupe en deux au milieu du mot !
    if (singleLineWidth > maxWidth) {
      const scale = (maxWidth * 0.94) / singleLineWidth;
      effectiveFontSize = Math.max(minFontSize, Math.floor(baseFontSize * scale));
    } else {
      effectiveFontSize = baseFontSize;
    }
    chosenLines = [rawString];
  } else {
    let bestTwoLines: [string, string] | null = null;
    let minMaxLen2 = Infinity;

    for (let i = 1; i < words.length; i++) {
      const l1 = words.slice(0, i).join(' ');
      const l2 = words.slice(i).join(' ');
      const maxLen = Math.max(l1.length, l2.length);
      if (maxLen < minMaxLen2) {
        minMaxLen2 = maxLen;
        bestTwoLines = [l1, l2];
      }
    }

    if (maxLines >= 3 && words.length >= 4) {
      let bestThreeLines: [string, string, string] | null = null;
      let minMaxLen3 = Infinity;
      for (let i = 1; i < words.length - 1; i++) {
        for (let j = i + 1; j < words.length; j++) {
          const l1 = words.slice(0, i).join(' ');
          const l2 = words.slice(i, j).join(' ');
          const l3 = words.slice(j).join(' ');
          const maxLen = Math.max(l1.length, l2.length, l3.length);
          if (maxLen < minMaxLen3) {
            minMaxLen3 = maxLen;
            bestThreeLines = [l1, l2, l3];
          }
        }
      }

      const longest2 = bestTwoLines ? (bestTwoLines[0].length >= bestTwoLines[1].length ? bestTwoLines[0] : bestTwoLines[1]) : '';
      const longest2Width = estimateWidth(longest2, baseFontSize);

      if (longest2Width > maxWidth * 1.15 && bestThreeLines) {
        chosenLines = bestThreeLines;
      } else if (bestTwoLines) {
        chosenLines = bestTwoLines;
      }
    } else if (bestTwoLines) {
      chosenLines = bestTwoLines;
    }

    const longestLine = chosenLines.reduce((a, b) => (b.length > a.length ? b : a), '');
    const longestLineWidth = estimateWidth(longestLine, baseFontSize);

    if (longestLineWidth > maxWidth) {
      const scale = (maxWidth * 0.94) / longestLineWidth;
      effectiveFontSize = Math.max(minFontSize, Math.floor(baseFontSize * scale));
    } else {
      effectiveFontSize = baseFontSize;
    }
  }

  const numLines = chosenLines.length;
  const lineHeight = effectiveFontSize * lineHeightRatio;
  const totalHeight = (numLines - 1) * lineHeight;

  let startY = y;
  if (alignVertical === 'center') {
    startY = y - totalHeight / 2;
  } else if (alignVertical === 'top') {
    startY = y;
  }

  const tspans = chosenLines
    .map((line, idx) => {
      const lineY = (startY + idx * lineHeight).toFixed(1);
      const segments = parseTextSegments(line, fill, cfg.accentColor || '#E11D48', cfg.highlightedWords);
      const hasAccent = segments.some((s) => s.isAccent);
      if (hasAccent) {
        const innerSpans = segments
          .map((seg) => `<tspan fill="${seg.color}">${escapeXml(seg.text)}</tspan>`)
          .join('');
        return `<tspan x="${x}" y="${lineY}">${innerSpans}</tspan>`;
      }
      return `<tspan x="${x}" y="${lineY}">${escapeXml(line)}</tspan>`;
    })
    .join('');

  return `
    <text
      x="${x}"
      y="${startY.toFixed(1)}"
      fill="${fill}"
      font-size="${effectiveFontSize}"
      font-weight="${fontWeight}"
      letter-spacing="${letterSpacing}"
      font-family="${fontFamily}"
      text-anchor="${textAnchor}"
      ${fontStyle ? `font-style="${fontStyle}"` : ''}
      ${filter ? `filter="${filter}"` : ''}
      ${opacity !== undefined ? `opacity="${opacity}"` : ''}
    >${tspans}</text>
  `.trim();
}

function renderLogoLayer(
  input: EventInput,
  cx: number,
  cy: number,
  baseWidth: number,
  baseHeight: number,
  isEmbellished = false,
  viewWidth?: number,
  viewHeight?: number,
  format?: 'post' | 'story' | 'banner' | 'a3' | 'tshirt' | string
): string {
  const activeLogo =
    input.isLogoRedesignRequested && input.redesignedLogoSvg
      ? `data:image/svg+xml;utf8,${encodeURIComponent(input.redesignedLogoSvg)}`
      : (input.logoImage || input.logoUrl);

  if (!activeLogo) return '';

  const resolved = resolveLogoTransformForFormat(input, format);
  const scale = resolved.scale;
  const scaledWidth = baseWidth * scale;
  const scaledHeight = baseHeight * scale;

  let x: number;
  let y: number;

  if (viewWidth && viewHeight) {
    x = (resolved.x / 100) * viewWidth - scaledWidth / 2;
    y = (resolved.y / 100) * viewHeight - scaledHeight / 2;
  } else {
    const offsetPercent = input.logoOffsetY ?? 0;
    const pixelShiftY = Math.round((offsetPercent / 100) * 500);
    x = cx - scaledWidth / 2;
    y = (cy - scaledHeight / 2) + pixelShiftY;
  }

  const opacity = input.logoOpacity ?? 1;
  const rotation = input.logoRotation ?? 0;

  const dynamicFilter = resolveDynamicLogoFilter(input);
  const logoFilter = dynamicFilter
    ? `filter: ${dynamicFilter};`
    : 'filter: drop-shadow(0 4px 18px rgba(0,0,0,0.85));';

  const transform = rotation !== 0
    ? `transform="translate(${x.toFixed(1)}, ${y.toFixed(1)}) rotate(${rotation} ${(scaledWidth / 2).toFixed(1)} ${(scaledHeight / 2).toFixed(1)})"`
    : `transform="translate(${x.toFixed(1)}, ${y.toFixed(1)})"`;

  return `
  <g class="embedded-club-logo" ${transform} opacity="${opacity}">
    <image
      href="${activeLogo}"
      xlink:href="${activeLogo}"
      width="${scaledWidth.toFixed(1)}"
      height="${scaledHeight.toFixed(1)}"
      preserveAspectRatio="xMidYMid meet"
      style="${logoFilter}"
    />
  </g>
  `;
}

function getSafeBackgroundImage(input: EventInput): string | undefined {
  if (input.backgroundImage) {
    return input.backgroundImage;
  }
  if (input.bgImage) {
    return input.bgImage;
  }
  return undefined;
}

function renderBackgroundLayer(
  input: EventInput,
  p: typeof PALETTE_CONFIGS['acid-techno'],
  width: number,
  height: number,
  idPrefix = ''
): string {
  const isToneActive = input.isBackgroundToneEnabled !== false;
  const tone = typeof input.backgroundTone === 'number'
    ? input.backgroundTone
    : typeof input.backgroundOpacity === 'number'
      ? input.backgroundOpacity
      : 0.8;
  const toneRgb = Math.round(255 * (1 - tone));
  const canvasBgColor = isToneActive ? `rgb(${toneRgb}, ${toneRgb}, ${toneRgb})` : 'transparent';

  const safeBg = getSafeBackgroundImage(input);
  if (!safeBg) {
    return `
    <rect width="${width}" height="${height}" fill="${isToneActive ? canvasBgColor : '#121212'}" />
    <rect width="${width}" height="${height}" fill="url(#gridPattern)" opacity="${isToneActive && tone <= 0.5 ? '0.04' : '0.1'}" />
    `;
  }

  const blur = input.backgroundBlur !== undefined ? input.backgroundBlur : 0;
  const filterStyle = blur > 0 ? `filter: blur(${blur}px);` : '';

  // Règle stricte : Calcul de l'overlay blanc/noir via computeToneOverlay
  const toneOverlay = computeToneOverlay(tone, isToneActive, input.backgroundBrightness);
  const overlayColor = toneOverlay.color;
  const overlayOpacity = toneOverlay.isNeutral ? 0 : toneOverlay.opacity;

  return `
    ${isToneActive ? `<rect width="${width}" height="${height}" fill="${canvasBgColor}" />` : ''}

    <image
      href="${escapeXml(safeBg)}"
      xlink:href="${escapeXml(safeBg)}"
      x="0"
      y="0"
      width="${width}"
      height="${height}"
      preserveAspectRatio="xMidYMid slice"
      opacity="1"
      style="${filterStyle}"
    />

    ${isToneActive && overlayOpacity > 0 ? `<!-- Voile dynamique Blanc Pur <-> Noir Pur piloté par le curseur -->
    <rect width="${width}" height="${height}" fill="${overlayColor}" opacity="${overlayOpacity.toFixed(2)}" />` : ''}
    <rect width="${width}" height="${height}" fill="url(#gridPattern)" opacity="${isToneActive && tone <= 0.5 ? '0.04' : '0.1'}" />
  `;
}
function renderDjPhotoLayer(
  input: EventInput,
  p: typeof PALETTE_CONFIGS['acid-techno'],
  cx: number,
  cy: number,
  baseSize: number,
  idPrefix = ''
): string {
  if (!input.djPhoto) return '';
  const opacity = input.djPhotoOpacity ?? 0.98;

  const formatKey = idPrefix.startsWith('poster')
    ? 'a3'
    : idPrefix.startsWith('story')
      ? 'story'
      : idPrefix.startsWith('square')
        ? 'post'
        : idPrefix.startsWith('banner')
          ? 'banner'
          : undefined;
  const fmtTransform = formatKey && input.formatTransforms ? input.formatTransforms[formatKey] : undefined;

  const scale = fmtTransform?.scale ?? input.djPhotoScale ?? input.subjectScale ?? 1.0;
  const offsetYPercent = fmtTransform?.offsetY ?? input.djPhotoOffsetY ?? input.subjectPositionY ?? 0;
  const pixelShiftY = Math.round((offsetYPercent / 100) * (baseSize * 1.2));

  const offsetXPercent = fmtTransform?.offsetX ?? input.djPhotoOffsetX ?? input.subjectPositionX ?? 0;
  const pixelShiftX = Math.round((offsetXPercent / 100) * (baseSize * 1.2));

  const size = baseSize * scale;
  const x = (cx - size / 2) + pixelShiftX;
  const y = (cy - size / 2) + pixelShiftY;

  const tone = typeof input.backgroundTone === 'number' ? input.backgroundTone : 0.5;
  const isToneCenter = Math.abs(tone - 0.5) < 0.02 || tone === 0.5 || tone === 50;

  let filterAttr = '';
  if (!isToneCenter && input.isSubjectHarmonized) {
    const sBrightness = input.subjectBrightness ?? 1.0;
    const sContrast = input.subjectContrast ?? 1.0;
    const sSaturation = input.subjectSaturation ?? 1.0;
    const sHueRotate = input.subjectHueRotate ?? 0;
    const parts = [];
    if (sBrightness !== 1.0) parts.push(`brightness(${sBrightness})`);
    if (sContrast !== 1.0) parts.push(`contrast(${sContrast})`);
    if (sSaturation !== 1.0) parts.push(`saturate(${sSaturation})`);
    if (sHueRotate !== 0) parts.push(`hue-rotate(${sHueRotate}deg)`);
    if (parts.length > 0) {
      filterAttr = `filter: ${parts.join(' ')};`;
    }
  }

  return `
    <g class="dj-headliner-photo" opacity="${opacity}">
      <image
        href="${input.djPhoto}"
        xlink:href="${input.djPhoto}"
        x="${x.toFixed(1)}"
        y="${y.toFixed(1)}"
        width="${size.toFixed(1)}"
        height="${size.toFixed(1)}"
        preserveAspectRatio="xMidYMid meet"
        class="image-render-hd"
        image-rendering="optimizeQuality"
        style="image-rendering: auto; image-rendering: optimizeQuality; image-rendering: smooth; image-rendering: high-quality; ${filterAttr}"
      />
    </g>
  `;
}

export function generatePosterSvg(input: EventInput, isUnlocked = false): string {
  const p = getPalette(input.colorPalette, input.dynamicTheme);
  const typo = resolveGenreTypography(input.genre);
  const textColors = resolveTextColorsForFormat(input, 'a3');

  // Suppression de l'affichage automatique des presets [DUR], [FUTUR], [SOFT]
  const cleanGenre = input.genre && !['futur', 'dur', 'soft'].includes(input.genre.toLowerCase())
    ? escapeXml(input.genre.toUpperCase())
    : '';

  const isEmbellished = input.layoutMode === 'embellished';
  const displayDate = extractDisplayDate(input.date || '21 SEPTEMBRE 2026');
  const timeSlot = extractTimeSlot(input);

  const cleanDefs = getCleanAiIntegrationDefs(p, 'poster_');
  const bgLayer = renderBackgroundLayer(input, p, 800, 1131);
  const djPhotoLayer = renderDjPhotoLayer(input, p, 400, 500, 410, 'poster_');

  const hasLogo = Boolean(
    (input.isLogoRedesignRequested && input.redesignedLogoSvg) || input.logoImage
  );

  let logoLayer = '';
  let topBadges = '';
  let titleY = 140;

  if (hasLogo) {
    const logoY = isEmbellished ? 85 : 95;
    logoLayer = renderLogoLayer(input, 400, logoY, 190, 85, isEmbellished, 800, 1131, 'a3');
    titleY = isEmbellished ? 185 : 170;
  } else {
    const surtitre = sanitizeStudioText(input.headerTagline?.trim() || cleanGenre).toUpperCase();
    topBadges = surtitre ? `
      <text x="400" y="70" fill="${textColors.headerTagline || p.secondaryText}" font-size="${Math.min(13, Math.max(8, Math.floor(650 / (surtitre.length * 0.75))))}" font-weight="700" letter-spacing="3" text-anchor="middle" font-family="'JetBrains Mono', monospace">${surtitre}</text>
    ` : '';
    titleY = surtitre ? 135 : 110;
  }

  const isToneActive = input.isBackgroundToneEnabled !== false;
  const tone = typeof input.backgroundTone === 'number'
    ? input.backgroundTone
    : typeof input.backgroundOpacity === 'number'
      ? input.backgroundOpacity
      : 0.8;
  const toneRgb = Math.round(255 * (1 - tone));
  const canvasBgColor = isToneActive ? `rgb(${toneRgb}, ${toneRgb}, ${toneRgb})` : 'transparent';
  const effectiveArtistUrl = getEffectiveArtistUrl(input.artistUrl);

  return `
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 800 1131" width="100%" height="100%" style="background-color: ${canvasBgColor}; font-family: ${typo.fontFamily};">
  <defs>
    <linearGradient id="primaryGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${p.primary}" />
      <stop offset="100%" stop-color="${p.accent}" />
    </linearGradient>
    <pattern id="gridPattern" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="${p.gridColor}" stroke-width="1" />
    </pattern>
    <filter id="glowEffect" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="8" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
    ${cleanDefs}
  </defs>

  ${bgLayer}
  
  <!-- CALQUE 2 : Textes d'ambiance (Surtitre & Titre principal) sous le sujet -->
  ${topBadges}
  <g transform="translate(400, ${titleY})">
    ${renderSmartSvgText({
    text: (input.eventName || 'LIVE').toUpperCase(),
    x: 0,
    y: 0,
    maxWidth: 680,
    baseFontSize: 54,
    minFontSize: 28,
    maxLines: 2,
    fill: textColors.eventName || p.text,
    accentColor: input.accentColor || p.accent,
    fontWeight: typo.fontWeight,
    letterSpacing: typo.letterSpacing,
    fontFamily: typo.fontFamily,
    filter: undefined,
    alignVertical: 'center',
  })}
  </g>

  <!-- CALQUE 3 : Sujet DJ au premier plan devant le titre -->
  ${djPhotoLayer}

  <!-- CADRE DE STRUCTURE DYNAMIQUE -->
  <rect x="25" y="25" width="750" height="1081" fill="none" stroke="${p.primary}" stroke-width="2" stroke-opacity="0.8" />

  <!-- CALQUE 4 : Textes d'avant-plan (Sous-titre, etc.) -->
  <g transform="translate(400, ${titleY})">
    ${input.punchline && input.punchline.trim()
      ? `
    <line x1="-160" y1="36" x2="160" y2="36" stroke="url(#primaryGrad)" stroke-width="${isEmbellished ? '3' : '2'}" />
    ${renderSmartSvgText({
        text: sanitizeStudioText(input.punchline).toUpperCase(),
        x: 0,
        y: 56,
        maxWidth: 650,
        baseFontSize: 15,
        minFontSize: 11,
        maxLines: 1,
        fill: textColors.punchline || p.accent,
        accentColor: input.accentColor || p.accent,
        fontWeight: 800,
        letterSpacing: 4,
        fontFamily: "'JetBrains Mono', monospace",
        isMonospace: true,
        alignVertical: 'center',
      })}
    `
      : ''
    }
  </g>

  ${logoLayer}

  <g transform="translate(400, 735)">
    <text x="0" y="0" fill="${p.secondaryText}" font-size="12" font-weight="700" letter-spacing="6" text-anchor="middle" font-family="'JetBrains Mono', monospace">MAIN SELECTOR / HEADLINER</text>
    ${effectiveArtistUrl ? `
    <a xlink:href="${effectiveArtistUrl}" target="_blank">
      ${renderSmartSvgText({
      text: (input.djName || 'D OKIIN').toUpperCase(),
      x: 0,
      y: 48,
      maxWidth: 680,
      baseFontSize: 48,
      minFontSize: 26,
      maxLines: 2,
      fill: textColors.djName || p.primary,
      fontWeight: typo.fontWeight,
      letterSpacing: typo.letterSpacing,
      fontFamily: typo.fontFamily,
      alignVertical: 'center',
    })}
    </a>` : renderSmartSvgText({
      text: (input.djName || 'D OKIIN').toUpperCase(),
      x: 0,
      y: 48,
      maxWidth: 680,
      baseFontSize: 48,
      minFontSize: 26,
      maxLines: 2,
      fill: textColors.djName || p.primary,
      fontWeight: typo.fontWeight,
      letterSpacing: typo.letterSpacing,
      fontFamily: typo.fontFamily,
      alignVertical: 'center',
    })}
    ${input.lineup && input.lineup.trim()
      ? renderSmartSvgText({
        text: `SPECIAL GUEST : ${input.lineup.toUpperCase()}`,
        x: 0,
        y: 92,
        maxWidth: 680,
        baseFontSize: 13,
        minFontSize: 10,
        maxLines: 2,
        fill: p.accent,
        fontWeight: 800,
        letterSpacing: 3,
        fontFamily: "'JetBrains Mono', monospace",
        isMonospace: true,
        alignVertical: 'center',
      })
      : ''
    }
  </g>

  ${(displayDate || input.venue || input.ticketPrice)
      ? `
  <g transform="translate(50, 905)">
    ${displayDate
        ? `
    <g transform="translate(0, 0)">
      <rect width="330" height="78" rx="6" fill="${p.cardBg}" stroke="${p.primary}" stroke-width="1.5" stroke-opacity="${isEmbellished ? '0.85' : '0.5'}" />
      <text x="20" y="24" fill="${p.secondaryText}" font-size="10" font-weight="700" letter-spacing="2" font-family="'JetBrains Mono', monospace">DATE</text>
      ${renderSmartSvgText({
          text: displayDate.toUpperCase(),
          x: 20,
          y: 48,
          maxWidth: 290,
          baseFontSize: 15,
          minFontSize: 11,
          maxLines: 2,
          textAnchor: 'start',
          fill: p.text,
          fontWeight: 800,
          alignVertical: 'center',
        })}
    </g>
    `
        : ''
      }

    ${(input.venue || input.ticketPrice)
        ? `
    <g transform="translate(${displayDate ? '370' : '0'}, 0)">
      <rect width="${displayDate ? '330' : '700'}" height="78" rx="6" fill="${p.cardBg}" stroke="${p.accent}" stroke-width="1.5" stroke-opacity="${isEmbellished ? '0.85' : '0.5'}" />
      <text x="20" y="24" fill="${p.secondaryText}" font-size="10" font-weight="700" letter-spacing="2" font-family="'JetBrains Mono', monospace">LIEU &amp; TARIFS</text>
      ${input.venue
          ? renderSmartSvgText({
            text: input.venue.toUpperCase(),
            x: 20,
            y: 45,
            maxWidth: displayDate ? 290 : 660,
            baseFontSize: 13,
            minFontSize: 10,
            maxLines: 1,
            textAnchor: 'start',
            fill: p.text,
            fontWeight: 800,
            alignVertical: 'center',
          })
          : ''
        }
    </g>
    `
        : ''
      }
  </g>
  `
      : ''
    }

  ${timeSlot
      ? `
  <g transform="translate(50, 995)">
    <rect width="700" height="48" rx="8" fill="${p.cardBg}" stroke="${p.primary}" stroke-width="2" stroke-opacity="${isEmbellished ? '0.9' : '0.6'}" />
    <g transform="translate(20, 12)">
      <text x="0" y="10" fill="${p.secondaryText}" font-size="9" font-weight="700" letter-spacing="2" font-family="'JetBrains Mono', monospace">HORAIRES</text>
      <text x="0" y="27" fill="${p.primary}" font-size="15" font-weight="900" letter-spacing="3" font-family="'JetBrains Mono', monospace">${timeSlot.toUpperCase()}</text>
    </g>
    <g transform="translate(420, 12)">
      <text x="260" y="10" fill="${p.accent}" font-size="10" font-weight="800" text-anchor="end" letter-spacing="2" font-family="'JetBrains Mono', monospace">ACCÈS ENTRÉE DIRECTE</text>
      <text x="260" y="27" fill="${p.secondaryText}" font-size="10" font-weight="600" text-anchor="end" letter-spacing="1" font-family="'JetBrains Mono', monospace">OFFICIAL SOUND SYSTEM</text>
    </g>
  </g>
  `
      : ''
    }
  ${renderWatermarkOverlay(800, 1131, isUnlocked)}
</svg>
`.trim();
}

export function generateStorySvg(input: EventInput, isUnlocked = false): string {
  const p = getPalette(input.colorPalette, input.dynamicTheme);
  const typo = resolveGenreTypography(input.genre);
  const textColors = resolveTextColorsForFormat(input, 'story');
  const isEmbellished = input.layoutMode === 'embellished';
  const displayDate = extractDisplayDate(input.date);
  const timeSlot = extractTimeSlot(input);

  const cleanDefs = getCleanAiIntegrationDefs(p, 'story_');
  const bgLayer = renderBackgroundLayer(input, p, 1080, 1920);
  const djPhotoLayer = renderDjPhotoLayer(input, p, 540, 880, 580, 'story_');

  const hasLogo = Boolean(
    (input.isLogoRedesignRequested && input.redesignedLogoSvg) || input.logoImage
  );

  let logoLayer = '';
  let titleY = 310;

  if (hasLogo) {
    logoLayer = renderLogoLayer(input, 540, 160, 220, 95, isEmbellished, 1080, 1920, 'story');
    titleY = 290;
  } else {
    titleY = 240;
  }

  const isToneActive = input.isBackgroundToneEnabled !== false;
  const tone = typeof input.backgroundTone === 'number'
    ? input.backgroundTone
    : typeof input.backgroundOpacity === 'number'
      ? input.backgroundOpacity
      : 0.8;
  const toneRgb = Math.round(255 * (1 - tone));
  const canvasBgColor = isToneActive ? `rgb(${toneRgb}, ${toneRgb}, ${toneRgb})` : 'transparent';
  const effectiveArtistUrl = getEffectiveArtistUrl(input.artistUrl);

  return `
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 1080 1920" width="100%" height="100%" style="background-color: ${canvasBgColor}; font-family: ${typo.fontFamily};">
  <defs>
    <linearGradient id="storyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${p.primary}" />
      <stop offset="100%" stop-color="${p.accent}" />
    </linearGradient>
    <filter id="neonFilter" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="12" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
    ${cleanDefs}
  </defs>

  ${bgLayer}
  
  <!-- CALQUE 2 : Titre principal sous le sujet -->
  <g transform="translate(540, ${titleY})">
    ${renderSmartSvgText({
    text: input.eventName.toUpperCase(),
    x: 0,
    y: 0,
    maxWidth: 920,
    baseFontSize: 72,
    minFontSize: 36,
    maxLines: 2,
    fill: textColors.eventName || p.text,
    accentColor: input.accentColor || p.accent,
    fontWeight: typo.fontWeight,
    letterSpacing: typo.letterSpacing,
    fontFamily: typo.fontFamily,
    filter: undefined,
    alignVertical: 'center',
  })}
  </g>

  <!-- CALQUE 3 : Sujet DJ au premier plan -->
  ${djPhotoLayer}

  <rect x="60" y="140" width="960" height="1640" fill="none" stroke="${p.primary}" stroke-width="2" stroke-opacity="0.8" />
  
  ${logoLayer}

  <!-- CALQUE 4 : Textes d'avant-plan (Sous-titre, etc.) -->
  <g transform="translate(540, ${titleY})">
    ${input.punchline && input.punchline.trim()
      ? renderSmartSvgText({
        text: sanitizeStudioText(input.punchline).toUpperCase(),
        x: 0,
        y: 64,
        maxWidth: 860,
        baseFontSize: 20,
        minFontSize: 14,
        maxLines: 1,
        fill: textColors.punchline || p.accent,
        accentColor: input.accentColor || p.accent,
        fontWeight: 800,
        letterSpacing: 4,
        fontFamily: "'JetBrains Mono', monospace",
        isMonospace: true,
        alignVertical: 'center',
      })
      : ''
    }
  </g>

  <g transform="translate(540, 1340)">
    <text x="0" y="0" fill="${textColors.headerTagline || p.secondaryText}" font-size="16" font-weight="700" letter-spacing="6" text-anchor="middle" font-family="'JetBrains Mono', monospace">MAIN SELECTOR</text>
    ${effectiveArtistUrl ? `
    <a xlink:href="${effectiveArtistUrl}" target="_blank">
      ${renderSmartSvgText({
      text: input.djName.toUpperCase(),
      x: 0,
      y: 60,
      maxWidth: 880,
      baseFontSize: 64,
      minFontSize: 30,
      maxLines: 2,
      fill: textColors.djName || p.primary,
      fontWeight: typo.fontWeight,
      letterSpacing: typo.letterSpacing,
      fontFamily: typo.fontFamily,
      alignVertical: 'center',
    })}
    </a>` : renderSmartSvgText({
      text: input.djName.toUpperCase(),
      x: 0,
      y: 60,
      maxWidth: 880,
      baseFontSize: 64,
      minFontSize: 30,
      maxLines: 2,
      fill: textColors.djName || p.primary,
      fontWeight: typo.fontWeight,
      letterSpacing: typo.letterSpacing,
      fontFamily: typo.fontFamily,
      alignVertical: 'center',
    })}
  </g>

  <g transform="translate(540, 1540)">
    <rect x="-420" y="0" width="840" height="116" rx="14" fill="${p.cardBg}" stroke="${p.primary}" stroke-width="2" stroke-opacity="0.8" />
    ${renderSmartSvgText({
      text: `${displayDate ? displayDate.toUpperCase() : ''}${displayDate && input.venue ? ' • ' : ''}${input.venue ? input.venue.toUpperCase() : ''}`,
      x: 0,
      y: 34,
      maxWidth: 800,
      baseFontSize: 22,
      minFontSize: 15,
      maxLines: 1,
      fill: p.text,
      fontWeight: 800,
      alignVertical: 'center',
    })}
    ${timeSlot
      ? `<text x="0" y="70" fill="${p.primary}" font-size="16" font-weight="900" text-anchor="middle" letter-spacing="3" font-family="'JetBrains Mono', monospace">HORAIRES : ${timeSlot.toUpperCase()}</text>`
      : ''
    }
  </g>
  ${renderWatermarkOverlay(1080, 1920, isUnlocked)}
</svg>
`.trim();
}

export function generateSquarePostSvg(input: EventInput, isUnlocked = false): string {
  const p = getPalette(input.colorPalette, input.dynamicTheme);
  const typo = resolveGenreTypography(input.genre);
  const textColors = resolveTextColorsForFormat(input, 'post');

  // Suppression de l'affichage automatique des presets [DUR], [FUTUR], [SOFT]
  const cleanGenre = input.genre && !['futur', 'dur', 'soft'].includes(input.genre.toLowerCase())
    ? escapeXml(input.genre.toUpperCase())
    : '';

  const isEmbellished = input.layoutMode === 'embellished';
  const displayDate = extractDisplayDate(input.date);
  const timeSlot = extractTimeSlot(input);

  const cleanDefs = getCleanAiIntegrationDefs(p, 'square_');
  const bgLayer = renderBackgroundLayer(input, p, 1080, 1080);
  const djPhotoLayer = renderDjPhotoLayer(input, p, 540, 520, 460, 'square_');

  const hasLogo = Boolean(
    (input.isLogoRedesignRequested && input.redesignedLogoSvg) || input.logoImage
  );

  let logoLayer = '';
  let topBar = '';
  let titleY = 195;

  const effectiveArtistUrl = getEffectiveArtistUrl(input.artistUrl);

  if (hasLogo) {
    logoLayer = renderLogoLayer(input, 540, 85, 200, 85, isEmbellished, 1080, 1080, 'post');
    titleY = 190;
  } else {
    const surtitre = sanitizeStudioText(input.headerTagline?.trim() || cleanGenre).toUpperCase();
    topBar = surtitre ? `
      <text x="540" y="90" fill="${textColors.headerTagline || p.secondaryText}" font-size="${Math.min(16, Math.max(9, Math.floor(800 / (surtitre.length * 0.8))))}" font-weight="700" letter-spacing="3" text-anchor="middle" font-family="'JetBrains Mono', monospace">${surtitre}</text>
    ` : '';
    titleY = surtitre ? 175 : 140;
  }

  const isToneActive = input.isBackgroundToneEnabled !== false;
  const tone = typeof input.backgroundTone === 'number'
    ? input.backgroundTone
    : typeof input.backgroundOpacity === 'number'
      ? input.backgroundOpacity
      : 0.8;
  const toneRgb = Math.round(255 * (1 - tone));
  const canvasBgColor = isToneActive ? `rgb(${toneRgb}, ${toneRgb}, ${toneRgb})` : 'transparent';

  return `
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 1080 1080" width="100%" height="100%" style="background-color: ${canvasBgColor}; font-family: ${typo.fontFamily};">
  <defs>
    <linearGradient id="sqGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${p.primary}" />
      <stop offset="100%" stop-color="${p.accent}" />
    </linearGradient>
    <filter id="sqBloom">
      <feGaussianBlur stdDeviation="10" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
    ${cleanDefs}
  </defs>

  ${bgLayer}
  
  <!-- CALQUE 2 : Titre principal sous le sujet -->
  <g transform="translate(540, ${titleY})">
    ${renderSmartSvgText({
    text: input.eventName.toUpperCase(),
    x: 0,
    y: 0,
    maxWidth: 900,
    baseFontSize: 68,
    minFontSize: 32,
    maxLines: 2,
    fill: textColors.eventName || p.text,
    accentColor: input.accentColor || p.accent,
    fontWeight: typo.fontWeight,
    letterSpacing: typo.letterSpacing,
    fontFamily: typo.fontFamily,
    filter: undefined,
    alignVertical: 'center',
  })}
  </g>

  <!-- CALQUE 3 : Sujet DJ au premier plan -->
  ${djPhotoLayer}

  <!-- CADRE DE STRUCTURE CARRÉ -->
  <rect x="50" y="50" width="980" height="980" fill="none" stroke="${p.primary}" stroke-width="2" stroke-opacity="0.8" />
  
  ${topBar}
  ${logoLayer}

  <!-- CALQUE 4 : Textes d'avant-plan (Sous-titre, etc.) -->
  <g transform="translate(540, ${titleY})">
    ${input.punchline && input.punchline.trim()
      ? renderSmartSvgText({
        text: sanitizeStudioText(input.punchline).toUpperCase(),
        x: 0,
        y: 52,
        maxWidth: 860,
        baseFontSize: 19,
        minFontSize: 13,
        maxLines: 1,
        fill: textColors.punchline || p.accent,
        accentColor: input.accentColor || p.accent,
        fontWeight: 800,
        letterSpacing: 4,
        fontFamily: "'JetBrains Mono', monospace",
        isMonospace: true,
        alignVertical: 'center',
      })
      : ''
    }
  </g>

  <!-- LIEN INTERACTIF VERS LE HUB / PROFIL DE L'ARTISTE (SANS AUCUN SYMBOLE VISUEL) -->
  ${effectiveArtistUrl ? `
  <a xlink:href="${effectiveArtistUrl}" target="_blank">
    <g transform="translate(540, 770)" cursor="pointer">
      ${renderSmartSvgText({
      text: input.djName.toUpperCase(),
      x: 0,
      y: 46,
      maxWidth: 880,
      baseFontSize: 52,
      minFontSize: 26,
      maxLines: 2,
      fill: textColors.djName || p.primary,
      fontWeight: typo.fontWeight,
      letterSpacing: typo.letterSpacing,
      fontFamily: typo.fontFamily,
      alignVertical: 'center',
    })}
    </g>
  </a>` : `
  <g transform="translate(540, 770)">
    ${renderSmartSvgText({
      text: input.djName.toUpperCase(),
      x: 0,
      y: 46,
      maxWidth: 880,
      baseFontSize: 52,
      minFontSize: 26,
      maxLines: 2,
      fill: textColors.djName || p.primary,
      fontWeight: typo.fontWeight,
      letterSpacing: typo.letterSpacing,
      fontFamily: typo.fontFamily,
      alignVertical: 'center',
    })}
  </g>`}

  <!-- BLOC INFORMATIONS BASSE ÉPURÉ (PUR DESIGN SANS LIENS EXTERNES NI SYMBOLES) -->
  <g transform="translate(90, 920)">
    <rect width="900" height="74" rx="8" fill="${p.cardBg}" stroke="${p.primary}" stroke-width="2" stroke-opacity="0.85" />
    <g transform="translate(30, 22)">
      <text x="0" y="0" fill="${p.secondaryText}" font-size="10" font-weight="700" letter-spacing="2" font-family="'JetBrains Mono', monospace">INFOS ÉVÉNEMENT</text>
      <text x="0" y="24" fill="${p.text}" font-size="16" font-weight="800" letter-spacing="1">${displayDate ? displayDate.toUpperCase() : ''}${displayDate && input.venue ? ' // ' : ''}${input.venue ? input.venue.toUpperCase() : ''}</text>
    </g>
    <g transform="translate(870, 22)">
      <text x="0" y="0" fill="${p.secondaryText}" font-size="10" font-weight="700" letter-spacing="2" text-anchor="end" font-family="'JetBrains Mono', monospace">SESSION LIVE</text>
      <text x="0" y="24" fill="${p.primary}" font-size="16" font-weight="900" letter-spacing="2" text-anchor="end" font-family="'JetBrains Mono', monospace">${timeSlot.toUpperCase()}</text>
    </g>
  </g>
  ${renderWatermarkOverlay(1080, 1080, isUnlocked)}
</svg>
`.trim();
}

export function generateBannerSvg(input: EventInput, isUnlocked = false): string {
  const p = getPalette(input.colorPalette, input.dynamicTheme);
  const typo = resolveGenreTypography(input.genre);
  const textColors = resolveTextColorsForFormat(input, 'banner');
  const isEmbellished = input.layoutMode === 'embellished';
  const displayDate = extractDisplayDate(input.date);
  const timeSlot = extractTimeSlot(input);

  const cleanDefs = getCleanAiIntegrationDefs(p, 'banner_');
  const bgLayer = renderBackgroundLayer(input, p, 1920, 1080);
  const djPhotoLayer = renderDjPhotoLayer(input, p, 960, 580, 680, 'banner_');

  const hasLogo = Boolean(
    (input.isLogoRedesignRequested && input.redesignedLogoSvg) || input.logoImage || input.logoUrl
  );
  const logoLayer = hasLogo ? renderLogoLayer(input, 1720, 120, 180, 80, isEmbellished, 1920, 1080, 'banner') : '';

  const isToneActive = input.isBackgroundToneEnabled !== false;
  const tone = typeof input.backgroundTone === 'number'
    ? input.backgroundTone
    : typeof input.backgroundOpacity === 'number'
      ? input.backgroundOpacity
      : 0.8;
  const isLightTone = isToneActive && tone < 0.45;
  const toneRgb = Math.round(255 * (1 - tone));
  const canvasBgColor = isToneActive ? `rgb(${toneRgb}, ${toneRgb}, ${toneRgb})` : 'transparent';
  const effectiveArtistUrl = getEffectiveArtistUrl(input.artistUrl);

  const headerTaglineText = sanitizeStudioText(input.headerTagline?.trim() || (input.genre ? input.genre.toUpperCase() : ''));
  const headlineBadge = sanitizeStudioText(input.headlineBadgeText?.trim() || 'MAIN SELECTOR');

  return `
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 1920 1080" width="100%" height="100%" style="background-color: ${canvasBgColor}; font-family: ${typo.fontFamily};">
  <defs>
    <linearGradient id="banGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${p.primary}" />
      <stop offset="100%" stop-color="${p.accent}" />
    </linearGradient>
    ${cleanDefs}
  </defs>

  ${bgLayer}
  
  <!-- CALQUE 2 : Titres d'ambiance (Bloc gauche) sous le sujet -->
  <g transform="translate(100, 420)">
    ${headerTaglineText ? `
    <text x="0" y="24" fill="${textColors.headerTagline || p.primary}" font-size="24" font-weight="700" letter-spacing="4" font-family="'JetBrains Mono', monospace">${headerTaglineText.toUpperCase()}</text>
    ` : ''}

    <g transform="translate(0, ${headerTaglineText ? 90 : 40})">
      ${renderSmartSvgText({
    text: input.eventName.toUpperCase(),
    x: 0,
    y: 0,
    maxWidth: 550,
    baseFontSize: 84,
    minFontSize: 32,
    maxLines: 2,
    textAnchor: 'start',
    fill: textColors.eventName || p.text,
    fontWeight: typo.fontWeight,
    letterSpacing: typo.letterSpacing,
    fontFamily: typo.fontFamily,
    alignVertical: 'top',
  })}
    </g>
  </g>

  <!-- CALQUE 3 : Sujet DJ au premier plan -->
  ${djPhotoLayer}

  <!-- CADRE DE STRUCTURE BANNIÈRE -->
  <rect x="50" y="50" width="1820" height="980" fill="none" stroke="${p.primary}" stroke-width="2" stroke-opacity="0.7" />

  <!-- LOGO EN HAUT À DROITE -->
  ${logoLayer}

  <!-- CALQUE 4 : Textes d'avant-plan (Sous-titre bloc gauche) -->
  <g transform="translate(100, 420)">
    ${input.punchline && input.punchline.trim()
      ? renderSmartSvgText({
        text: sanitizeStudioText(input.punchline).toUpperCase(),
        x: 0,
        y: headerTaglineText ? 210 : 160,
        maxWidth: 550,
        baseFontSize: 30,
        minFontSize: 16,
        maxLines: 1,
        textAnchor: 'start',
        fill: textColors.punchline || p.accent,
        accentColor: input.accentColor || p.accent,
        fontWeight: 800,
        letterSpacing: 2,
        fontFamily: "'JetBrains Mono', monospace",
        isMonospace: true,
        alignVertical: 'top',
      })
      : ''
    }
  </g>

  <!-- TEXTES INFÉRIEURS (BLOC DROIT - ALIGNÉ SUR LE MÊME AXE Y QUE LE TITRE 1) -->
  <g transform="translate(1820, 420)">
    <text x="0" y="24" text-anchor="end" fill="${textColors.headlineBadge || p.secondaryText}" font-size="24" font-weight="700" letter-spacing="4" font-family="'JetBrains Mono', monospace">${headlineBadge.toUpperCase()}</text>

    ${effectiveArtistUrl ? `
    <a xlink:href="${effectiveArtistUrl}" target="_blank">
      <g transform="translate(0, ${headerTaglineText ? 90 : 40})" cursor="pointer">
        ${renderSmartSvgText({
      text: input.djName.toUpperCase(),
      x: 0,
      y: 0,
      maxWidth: 550,
      baseFontSize: 80,
      minFontSize: 32,
      maxLines: 2,
      textAnchor: 'end',
      fill: textColors.djName || p.primary,
      fontWeight: typo.fontWeight,
      letterSpacing: typo.letterSpacing,
      fontFamily: typo.fontFamily,
      alignVertical: 'top',
    })}
      </g>
    </a>` : `
    <g transform="translate(0, ${headerTaglineText ? 90 : 40})">
      ${renderSmartSvgText({
      text: input.djName.toUpperCase(),
      x: 0,
      y: 0,
      maxWidth: 550,
      baseFontSize: 80,
      minFontSize: 32,
      maxLines: 2,
      textAnchor: 'end',
      fill: textColors.djName || p.primary,
      fontWeight: typo.fontWeight,
      letterSpacing: typo.letterSpacing,
      fontFamily: typo.fontFamily,
      alignVertical: 'top',
    })}
    </g>`}
  </g>

  <!-- ENCADRÉ D'INDICATION (DATE, HEURE, LIEU) REHAUSSÉ POUR LAISSER RESPIRER LA MARGE INFÉRIEURE -->
  <g transform="translate(960, 1000)">
    <rect x="-380" y="-22" width="760" height="44" rx="12" fill="${isLightTone ? '#ffffff' : '#000000'}" fill-opacity="${isLightTone ? '0.85' : '0.8'}" stroke="${isLightTone ? '#000000' : '#ffffff'}" stroke-opacity="${isLightTone ? '0.15' : '0.15'}" stroke-width="1.5" />
    <text x="0" y="7" text-anchor="middle" font-family="'JetBrains Mono', monospace" font-size="20" fill="${isLightTone ? '#18181b' : '#ffffff'}" fill-opacity="0.9" font-weight="600">
      <tspan>${displayDate ? displayDate.toUpperCase() : ''}</tspan>
      <tspan fill="${isLightTone ? '#71717a' : '#a1a1aa'}" fill-opacity="0.6"> • </tspan>
      <tspan>${timeSlot.toUpperCase()}</tspan>
      <tspan fill="${isLightTone ? '#71717a' : '#a1a1aa'}" fill-opacity="0.6"> • </tspan>
      <tspan>${input.venue ? input.venue.toUpperCase() : ''}</tspan>
    </text>
  </g>

  ${renderWatermarkOverlay(1920, 1080, isUnlocked)}
</svg>
`.trim();
}

export function generateTshirtFrontSvg(input: EventInput, isUnlocked = false): string {
  const p = getPalette(input.colorPalette, input.dynamicTheme);
  const typo = resolveGenreTypography(input.genre);
  const isWhiteShirt = input.tshirtColor === 'white';
  const pocketBg = isWhiteShirt ? '#ffffff' : '#0d0e12';
  const pocketStroke = isWhiteShirt ? '#000000' : p.primary;
  const mainTextColor = isWhiteShirt ? '#0f1015' : '#ffffff';
  const subTextColor = isWhiteShirt ? '#000000' : p.primary;
  const mutedTextColor = isWhiteShirt ? '#71717a' : p.secondaryText;
  const badgeAccent = isWhiteShirt ? '#dc2626' : p.accent;
  const activeLogo = resolveActiveTextileLogo(input, 'front');

  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="100%" height="100%" style="background-color: transparent; font-family: ${typo.fontFamily};">
  <g transform="translate(300, 300)">
    <rect x="-180" y="-180" width="360" height="360" rx="16" fill="${pocketBg}" stroke="${pocketStroke}" stroke-width="3" />
    
    ${activeLogo
      ? `
    <g transform="translate(-100, -145)">
      <image href="${activeLogo}" width="200" height="150" preserveAspectRatio="xMidYMid meet" />
    </g>
    `
      : `
    <circle cx="0" cy="-30" r="70" fill="none" stroke="${badgeAccent}" stroke-width="3" stroke-dasharray="8 6" />
    <polygon points="-14,-46 22,-30 -14,-14" fill="${subTextColor}" />
    `
    }
    
    ${renderSmartSvgText({
      text: input.eventName.toUpperCase(),
      x: 0,
      y: 72,
      maxWidth: 320,
      baseFontSize: 24,
      minFontSize: 13,
      maxLines: 2,
      fill: mainTextColor,
      fontWeight: typo.fontWeight,
      letterSpacing: typo.letterSpacing,
      fontFamily: typo.fontFamily,
      alignVertical: 'center',
    })}
    ${renderSmartSvgText({
      text: input.djName.toUpperCase(),
      x: 0,
      y: 110,
      maxWidth: 320,
      baseFontSize: 14,
      minFontSize: 10,
      maxLines: 2,
      fill: subTextColor,
      fontWeight: 800,
      letterSpacing: 2,
      fontFamily: typo.fontFamily,
      alignVertical: 'center',
    })}
    <text x="0" y="142" fill="${mutedTextColor}" font-size="10" font-weight="700" letter-spacing="3" text-anchor="middle" font-family="'JetBrains Mono', monospace">
      OFFICIAL SOUND SYSTEM // 2026
    </text>
  </g>
  ${renderWatermarkOverlay(600, 600, isUnlocked)}
</svg>
`.trim();
}

export function generateTshirtBackSvg(input: EventInput, isUnlocked = false): string {
  const p = getPalette(input.colorPalette, input.dynamicTheme);
  const typo = resolveGenreTypography(input.genre);
  const isWhiteShirt = input.tshirtColor === 'white';

  const primaryColor = isWhiteShirt ? '#000000' : p.primary;
  const secondaryColor = isWhiteShirt ? '#52525b' : p.secondaryText;

  // Résolution propre et unifiée du logo ou visuel Dos (haute résolution / vectoriel)
  const backLogo = resolveActiveTextileLogo(input, 'back');
  const colorMode = resolveActiveTextileColorMode(input, input.tshirtColor || 'black');
  const placement = clampDtfPlacement(
    input.tshirtBackPlacement || { x: 50, y: 38, scale: input.tshirtBackLogoScale ?? 1.0 },
    'back'
  );

  // Positionnement DTF grand format (zone des omoplates 50% X, 38% Y calibré A3)
  const cx = (placement.x / 100) * 800;
  const cy = (placement.y / 100) * 1100;
  const logoWidth = 800 * 0.48 * placement.scale;
  const logoHeight = logoWidth;
  const x = cx - logoWidth / 2;
  const y = cy - logoHeight / 2;

  // Filtre et mode de fusion sans flou ni ombre parasite pour le dos
  const filterVal = getTextileLogoFilter(colorMode, 'back');
  const filterStyle = filterVal && filterVal !== 'none' ? `filter: ${filterVal};` : '';
  const blendStyle = colorMode === 'knockout_black' ? 'mix-blend-mode: screen;' : '';
  const imageStyle = [filterStyle, blendStyle].filter(Boolean).join(' ');

  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1100" width="100%" height="100%" style="background-color: transparent; font-family: ${typo.fontFamily};">
  ${backLogo ? `
  <g class="dtf-back-graphic" transform="translate(${x.toFixed(1)}, ${y.toFixed(1)})">
    <image
      href="${backLogo}"
      xlink:href="${backLogo}"
      width="${logoWidth.toFixed(1)}"
      height="${logoHeight.toFixed(1)}"
      preserveAspectRatio="xMidYMid meet"
      ${imageStyle ? `style="${imageStyle}"` : ''}
    />
  </g>
  ` : ''}

  <g transform="translate(400, 1020)">
    ${input.eventName ? `
    <text x="0" y="0" fill="${primaryColor}" font-size="16" font-weight="800" letter-spacing="4" text-anchor="middle" font-family="${typo.fontFamily}">
      ${input.eventName.toUpperCase()}
    </text>
    ` : ''}
    <text x="0" y="24" fill="${secondaryColor}" font-size="11" font-weight="700" letter-spacing="3" text-anchor="middle" font-family="'JetBrains Mono', monospace">
      OFFICIAL MERCH // DTF HIGH DENSITY PRINT
    </text>
  </g>

  ${renderWatermarkOverlay(800, 1100, isUnlocked)}
</svg>
`.trim();
}

export function generatePrintCutSvg(input: EventInput): string {
  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1400" width="100%" height="100%" style="background-color: #ffffff; font-family: 'Syne', sans-serif;">
  <g id="CUT_CONTOUR" stroke="#ff00ff" stroke-width="2" fill="none">
    <rect x="20" y="20" width="960" height="1360" rx="10" />
    <circle cx="50" cy="50" r="15" fill="#000000" stroke="none" />
    <circle cx="950" cy="50" r="15" fill="#000000" stroke="none" />
    <circle cx="50" cy="1350" r="15" fill="#000000" stroke="none" />
    <circle cx="950" cy="1350" r="15" fill="#000000" stroke="none" />
  </g>

  <g id="PRINT_ARTWORK" fill="#000000">
    ${renderSmartSvgText({
    text: input.eventName.toUpperCase(),
    x: 500,
    y: 160,
    maxWidth: 880,
    baseFontSize: 58,
    minFontSize: 30,
    maxLines: 2,
    fill: '#000000',
    fontWeight: 900,
    letterSpacing: -1,
    alignVertical: 'center',
  })}
    ${renderSmartSvgText({
    text: input.djName.toUpperCase(),
    x: 500,
    y: 220,
    maxWidth: 880,
    baseFontSize: 28,
    minFontSize: 18,
    maxLines: 2,
    fill: '#000000',
    fontWeight: 800,
    letterSpacing: 4,
    alignVertical: 'center',
  })}
    
    <path d="M 500 300 C 650 300 780 430 780 580 C 780 730 650 860 500 860 C 350 860 220 730 220 580 C 220 430 350 300 500 300 Z M 500 360 C 380 360 280 460 280 580 C 280 700 380 800 500 800 C 620 800 720 700 720 580 C 720 460 620 360 500 360 Z" fill-rule="evenodd" />
    
    <polygon points="460,530 550,580 460,630" />
    
    ${renderSmartSvgText({
    text: input.date.toUpperCase(),
    x: 500,
    y: 980,
    maxWidth: 880,
    baseFontSize: 24,
    minFontSize: 16,
    maxLines: 2,
    fill: '#000000',
    fontWeight: 900,
    letterSpacing: 3,
    alignVertical: 'center',
  })}
    ${renderSmartSvgText({
    text: input.venue.toUpperCase(),
    x: 500,
    y: 1030,
    maxWidth: 880,
    baseFontSize: 20,
    minFontSize: 14,
    maxLines: 2,
    fill: '#000000',
    fontWeight: 700,
    letterSpacing: 4,
    alignVertical: 'center',
  })}
  </g>

  <g font-family="'JetBrains Mono', monospace" font-size="14" fill="#666666">
    <text x="50" y="1180">JOB: DROPPER_DTF_PRINT_CUT</text>
    <text x="50" y="1210">FORMAT: A3 BACK (280mm x 390mm)</text>
    <text x="50" y="1240">TEMP: 155°C - 160°C | DUREE: 15 SECONDES | PEEL: CHAUD (HOT PEEL)</text>
    <text x="50" y="1270">PRESSION: 4 A 5 BARS (MOYENNE/FORTE) | TISSU: COTON 100% OU POLY-COTON</text>
  </g>
</svg>
`.trim();
}

export function buildCompletePack(input: EventInput, customCopy?: any, isUnlocked = false): GeneratedPack {
  const packId = `PACK-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  const p = getPalette(input.colorPalette, input.dynamicTheme);

  const posterSvg = generatePosterSvg(input, isUnlocked);
  const storySvg = generateStorySvg(input, isUnlocked);
  const squareSvg = generateSquarePostSvg(input, isUnlocked);
  const bannerSvg = generateBannerSvg(input, isUnlocked);
  const tshirtChestSvg = generateTshirtFrontSvg(input, isUnlocked);
  const tshirtBackSvg = generateTshirtBackSvg(input, isUnlocked);
  const printCutSvg = generatePrintCutSvg(input);

  const fallbackCopy = {
    captionInstagram: `📢 OFFICIEL // ${input.eventName.toUpperCase()} 📢\n\n${input.punchline}\n\nAvec : @${input.djName.toLowerCase().replace(/\s+/g, '')} !\n\n📅 ${input.date}\n📍 ${input.venue}\n🎟️ Billetterie / Inscriptions : ${input.ticketPrice}\n\n⚡ Partagez l'information autour de vous 👇`,
    punchlines: [
      input.punchline,
      `Un événement incontournable à ne pas manquer`,
      `Le merchandising officiel ${input.eventName} est disponible`,
    ],
    hashtags: [
      '#Evenement',
      '#Agenda',
      '#Officiel',
      '#Actualite',
      '#Projet',
      '#Lancement',
      '#Signaid',
    ],
    storyPollIdeas: [
      'Serez-vous parmi nous pour cet événement ? (OUI / ABSOLUMENT)',
      'Avez-vous déjà réservé vos places ? (Déjà fait / En cours)',
      'Quel moment attendez-vous le plus ? (La conférence / Le réseau)',
    ],
    coldPitchDM: `Bonjour @${input.djName.toLowerCase().replace(/\s+/g, '')} ! Pour votre prochain projet ${input.eventName}, nous avons préparé un pack visuel HD + textile personnalisé. Souhaitez-vous voir le rendu démo ?`,
  };

  const copywriting = customCopy || fallbackCopy;

  return {
    id: packId,
    createdAt: new Date().toISOString(),
    input,
    isUnlocked,
    creativeConcept: {
      artDirection: `Esthétique taillée pour l'événement, fusionnant typographies et géométries modulaires.`,
      atmosphere: `Impact visuel immédiat optimisé pour l'affichage nocturne et le feed Instagram.`,
      typographyPairing: 'Dynamique',
      colorHexes: [p.primary, p.accent, p.bg, p.cardBg],
    },
    artworkSvg: posterSvg,
    downloadToken: `DL-${packId.substring(5, 13)}`,
    posterVisual: {
      formatName: 'Affiche A3 Portrait',
      aspectRatio: '3:4',
      ratioClass: 'aspect-[3/4]',
      widthMm: 297,
      heightMm: 420,
      description: 'Format A3 officiel pour affichage club, rue et vitrines disquaires (300 DPI).',
      svgContent: posterSvg,
    },
    storyVisual: {
      formatName: 'Story Réseaux Sociaux (9:16)',
      aspectRatio: '9:16',
      ratioClass: 'aspect-[9/16]',
      widthMm: 108,
      heightMm: 192,
      description: 'Format vertical calibré pour Instagram Stories, TikTok et Shorts avec zones stickers.',
      svgContent: storySvg,
    },
    squareVisual: {
      formatName: 'Post Carré Feed (1:1)',
      aspectRatio: '1:1',
      ratioClass: 'aspect-square',
      widthMm: 120,
      heightMm: 120,
      description: 'Publication standard carrée pour le feed Instagram, Facebook et WhatsApp.',
      svgContent: squareSvg,
    },
    bannerVisual: {
      formatName: 'Bannière Paysage (16:9)',
      aspectRatio: '16:9',
      ratioClass: 'aspect-[16/9]',
      widthMm: 384,
      heightMm: 216,
      description: 'Format large pour bannières Eventbrite, Shotgun, Facebook Event et RA Guide.',
      svgContent: bannerSvg,
    },
    tshirtChestVisual: {
      formatName: 'Plastron Cœur T-Shirt (10x10 cm)',
      aspectRatio: '1:1',
      ratioClass: 'aspect-square',
      widthMm: 100,
      heightMm: 100,
      description: 'Visuel minimaliste pour poche cœur ou poitrine avant en DTF textile.',
      svgContent: tshirtChestSvg,
    },
    tshirtBackVisual: {
      formatName: 'Dos Graphique T-Shirt (A3)',
      aspectRatio: '3:4',
      ratioClass: 'aspect-[3/4]',
      widthMm: 280,
      heightMm: 390,
      description: 'Impression dorsale grand format résistante aux lavages répétés.',
      svgContent: tshirtBackSvg,
    },
    printCutFile: {
      svgCutFile: printCutSvg,
      dimensionsMm: { width: 280, height: 390 },
      pressTemperatureC: 155,
      pressDurationSeconds: 15,
      peelType: 'Chaud (Hot Peel)',
      textileRecommendation: 'Coton peigné 240g/m² ou mélange lourd',
      colorLayers: ['Cyan', 'Magenta', 'Yellow', 'Black', 'White Underbase'],
    },
    copywriting,
    generationCostEur: 0.04,
  };
}