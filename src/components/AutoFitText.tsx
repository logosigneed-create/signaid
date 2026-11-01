import React from 'react';
import { getAutoScaledFontSize } from '../utils/fontScaler';
import { parseTextSegments, getCleanDisplayText } from '../utils/textSegmenter';

export { getAutoScaledFontSize };

/**
 * Trait de soulignement dynamique calligraphique (Brush Underline)
 * Calibré pour sublimer les mots d'impact / d'accentuation au standard d'une campagne publicitaire.
 */
export const BrushUnderline: React.FC<{
  color?: string;
  className?: string;
  style?: React.CSSProperties;
}> = ({ color = '#F97316', className = '', style = {} }) => (
  <svg
    viewBox="0 0 240 18"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`w-full overflow-visible pointer-events-none select-none ${className}`}
    style={{
      height: '0.22em',
      marginTop: '-0.02em',
      display: 'block',
      ...style,
    }}
    preserveAspectRatio="none"
  >
    {/* Couche principale : tracé calligraphique dynamique effilé aux extrémités */}
    <path
      d="M4 11 C 38 4.5, 110 3, 236 8 C 170 14, 85 16, 4 11 Z"
      fill={color}
    />
    {/* Couche secondaire d'accentuation texturée / coup de pinceau expressif */}
    <path
      d="M18 13.5 C 70 8.5, 160 7.5, 222 11.5 C 160 15, 75 16, 18 13.5 Z"
      fill={color}
      opacity="0.85"
    />
  </svg>
);

export interface AutoFitTextProps {
  text: string;
  className?: string;
  style?: React.CSSProperties;
  maxFontSize?: number;
  minFontSize?: number;
  unit?: 'cqb' | 'cqi' | string;
  align?: 'center' | 'left' | 'right';
  accentColor?: string;
  highlightedWords?: string[];
  isCallToActionDuo?: boolean;
}

export const AutoFitText: React.FC<AutoFitTextProps> = ({
  text,
  className = '',
  style = {},
  maxFontSize = 7,
  minFontSize = 2.0,
  unit = 'cqi',
  align = 'center',
  accentColor = '#F97316',
  highlightedWords = [],
}) => {
  const cleanText = getCleanDisplayText(text);
  const dynamicFontSize = getAutoScaledFontSize(
    cleanText,
    maxFontSize,
    minFontSize,
    (unit as 'cqb' | 'cqi') || 'cqi'
  );

  // Supprimer impérativement toute troncature, masquage accidentel ou classe de couleur concurrente
  const safeClassName = className
    .replace(/\btruncate\b/g, '')
    .replace(/\btext-ellipsis\b/g, '')
    .replace(/\boverflow-hidden\b/g, '')
    .replace(style.color ? /\btext-(white|black|zinc-\d+|slate-\d+|neutral-\d+|gray-\d+)\b/g : /$^/, '');

  const primaryColor = (style.color as string) || '#FFFFFF';
  const effectiveAccent = accentColor || '#F97316';

  // Ligne 1 (Standard Campagne Pub) : Majuscule, police sans-serif condensée ultra-bold/black, blanc pur avec micro ombre portée directionnelle
  const line1Style: React.CSSProperties = {
    fontFamily: "'Impact', 'Inter Tight', 'Arial Black', -apple-system, sans-serif",
    fontWeight: 900,
    textTransform: 'uppercase',
    color: primaryColor,
    WebkitTextFillColor: primaryColor,
    letterSpacing: style.letterSpacing || '0.04em',
    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.85)) drop-shadow(0 1px 2px rgba(0,0,0,0.95))',
    lineHeight: 1.05,
  };

  // Ligne 2 (Mot d'accentuation / "VOIE") : Police style Brush/Impact, teinté orange #F97316 et trait de soulignement dynamique
  const line2Style: React.CSSProperties = {
    fontFamily: "'Permanent Marker', 'Impact', 'Syne', cursive, sans-serif",
    fontWeight: 900,
    textTransform: 'uppercase',
    color: effectiveAccent,
    WebkitTextFillColor: effectiveAccent,
    letterSpacing: '0.05em',
    filter: `drop-shadow(0 2px 5px rgba(0,0,0,0.9)) drop-shadow(0 0 10px ${effectiveAccent}55)`,
    lineHeight: 1.1,
  };

  // Détection du Titre principal Call-to-Action (Duo d'impact)
  const hasExplicitNewline = text.includes('\n');
  const voieMatch = !hasExplicitNewline ? text.match(/^(.*?)\b(VOIE)\b(.*)$/i) : null;

  if (hasExplicitNewline || (voieMatch && voieMatch[1].trim().length > 0)) {
    const rawLines = hasExplicitNewline
      ? text.split(/\r?\n/)
      : [voieMatch![1].trim(), voieMatch![2].trim() + (voieMatch![3] ? ' ' + voieMatch![3].trim() : '')];

    return (
      <div
        className={`w-full max-w-full overflow-visible flex flex-col px-1 ${
          align === 'center' ? 'items-center text-center' : align === 'right' ? 'items-end text-right' : 'items-start text-left'
        } ${safeClassName}`}
        style={{
          ...style,
          fontSize: dynamicFontSize,
          textOverflow: 'clip',
        }}
      >
        {rawLines.map((line, lIdx) => {
          const isAccentLine = lIdx === rawLines.length - 1;
          const cleanLine = getCleanDisplayText(line).trim();
          if (!cleanLine) return null;

          if (isAccentLine) {
            return (
              <div key={lIdx} className="relative inline-flex flex-col items-center max-w-full" style={line2Style}>
                <span>{cleanLine}</span>
                <BrushUnderline color={effectiveAccent} />
              </div>
            );
          }

          return (
            <div key={lIdx} className="max-w-full" style={line1Style}>
              {cleanLine}
            </div>
          );
        })}
      </div>
    );
  }

  // Cas mono-ligne avec segments balisés ou mot d'accentuation
  const effectiveHighlighted = [...highlightedWords];
  if (!effectiveHighlighted.some((w) => w.toUpperCase() === 'VOIE') && /\bVOIE\b/i.test(text)) {
    effectiveHighlighted.push('VOIE');
  }

  const segments = parseTextSegments(text, primaryColor, effectiveAccent, effectiveHighlighted);

  return (
    <div
      className={`w-full max-w-full overflow-visible leading-[1.05] whitespace-pre px-1 ${
        align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left'
      } ${safeClassName}`}
      style={{
        ...style,
        fontSize: dynamicFontSize,
        textOverflow: 'clip',
        whiteSpace: 'pre',
      }}
    >
      {segments.map((seg, idx) => {
        if (seg.isAccent || seg.color === effectiveAccent) {
          return (
            <span
              key={idx}
              className="relative inline-flex flex-col items-center"
              style={{
                ...line2Style,
                display: 'inline-flex',
                verticalAlign: 'bottom',
              }}
            >
              <span>{seg.text}</span>
              <BrushUnderline color={effectiveAccent} />
            </span>
          );
        }

        return (
          <span
            key={idx}
            style={{
              ...line1Style,
              display: 'inline-block',
            }}
          >
            {seg.text}
          </span>
        );
      })}
    </div>
  );
};

export default AutoFitText;

