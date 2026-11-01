/**
 * Utilitaires pour le découpage multi-couleurs, le balisage de mots (*mot*, [mot])
 * et le rendu textuel haute fidélité DOM, SVG et Canvas.
 */

export interface TextSegment {
  text: string;
  isAccent: boolean;
  color: string;
}

/**
 * Échappe les caractères spéciaux pour utilisation dans RegExp
 */
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Retourne le texte propre sans balises (* ou []) pour l'affichage épuré
 * et le calcul précis de la taille de police.
 */
export function getCleanDisplayText(text: string | undefined | null): string {
  if (!text) return '';
  return String(text)
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\[([^\]]+)\]/g, '$1');
}

/**
 * Extrait la liste des mots individuels présents dans le texte (hors balises).
 */
export function extractWordsFromText(text: string | undefined | null): string[] {
  if (!text) return [];
  const clean = getCleanDisplayText(text);
  return clean.split(/\s+/).map((w) => w.trim()).filter(Boolean);
}

/**
 * Détecte si un mot donné est actuellement accentué dans le texte
 * (via balise *mot*, [mot] ou présent dans highlightedWords).
 */
export function isWordHighlighted(
  word: string,
  text: string | undefined | null,
  highlightedWords: string[] = []
): boolean {
  if (!word || !text) return false;
  const cleanWord = word.trim().toLowerCase();
  if (!cleanWord) return false;

  // 1. Présence dans la liste explicite
  if (highlightedWords && highlightedWords.some((hw) => hw.trim().toLowerCase() === cleanWord)) {
    return true;
  }

  // 2. Balisage *mot*
  const starRegex = new RegExp(`\\*\\s*${escapeRegex(word.trim())}\\s*\\*`, 'i');
  if (starRegex.test(text)) return true;

  // 3. Balisage [mot]
  const bracketRegex = new RegExp(`\\[\\s*${escapeRegex(word.trim())}\\s*\\]`, 'i');
  if (bracketRegex.test(text)) return true;

  return false;
}

/**
 * Bascule l'accentuation d'un mot dans le texte et la liste de mots clés.
 */
export function toggleWordInText(
  word: string,
  currentText: string,
  currentHighlightedWords: string[] = []
): { text: string; highlightedWords: string[] } {
  const trimmedWord = word.trim();
  if (!trimmedWord) return { text: currentText, highlightedWords: currentHighlightedWords };

  const isHighlighted = isWordHighlighted(trimmedWord, currentText, currentHighlightedWords);
  const nextHighlightedWords = isHighlighted
    ? currentHighlightedWords.filter((w) => w.trim().toLowerCase() !== trimmedWord.toLowerCase())
    : [...currentHighlightedWords, trimmedWord];

  let nextText = currentText;

  if (isHighlighted) {
    // Retirer *mot* ou [mot]
    const starRegex = new RegExp(`\\*(${escapeRegex(trimmedWord)})\\*`, 'gi');
    const bracketRegex = new RegExp(`\\[(${escapeRegex(trimmedWord)})\\]`, 'gi');
    nextText = nextText.replace(starRegex, '$1').replace(bracketRegex, '$1');
  } else {
    // Entourer le mot avec *mot*
    const wordRegex = new RegExp(`(?<![\\*\\[])\\b(${escapeRegex(trimmedWord)})\\b(?![\\*\\]])`, 'i');
    if (wordRegex.test(nextText)) {
      nextText = nextText.replace(wordRegex, '*$1*');
    } else {
      nextText = nextText.replace(trimmedWord, `*${trimmedWord}*`);
    }
  }

  return {
    text: nextText,
    highlightedWords: nextHighlightedWords,
  };
}

/**
 * Découpe une chaîne en segments colorés (couleur principale vs couleur d'accentuation)
 * en tenant compte de la syntaxe naturelle *mot*, [mot] et de la liste highlightedWords.
 */
export function parseTextSegments(
  rawText: string | undefined | null,
  primaryColor: string = '#FFFFFF',
  accentColor: string = '#E11D48',
  highlightedWords: string[] = []
): TextSegment[] {
  if (!rawText) return [];
  const text = String(rawText);
  if (!text) return [];

  const cleanHighWords = (highlightedWords || [])
    .map((w) => w.trim().toLowerCase())
    .filter(Boolean);

  // Recherche des motifs balisés *mot* ou [mot]
  const markerRegex = /(\*[^*]+\*|\[[^\]]+\])/g;
  const parts = text.split(markerRegex);

  const rawSegments: TextSegment[] = [];

  for (const part of parts) {
    if (!part) continue;

    const isStarMatch = part.startsWith('*') && part.endsWith('*') && part.length > 2;
    const isBracketMatch = part.startsWith('[') && part.endsWith(']') && part.length > 2;

    if (isStarMatch || isBracketMatch) {
      const innerText = part.slice(1, -1);
      rawSegments.push({
        text: innerText,
        isAccent: true,
        color: accentColor,
      });
    } else {
      if (cleanHighWords.length > 0) {
        const tokenRegex = /(\s+|[^\s]+)/g;
        const tokens = part.match(tokenRegex) || [part];

        for (const token of tokens) {
          const isWhitespace = /^\s+$/.test(token);
          const normalized = token.trim().toLowerCase();
          const isAccent = !isWhitespace && cleanHighWords.includes(normalized);

          rawSegments.push({
            text: token,
            isAccent,
            color: isAccent ? accentColor : primaryColor,
          });
        }
      } else {
        rawSegments.push({
          text: part,
          isAccent: false,
          color: primaryColor,
        });
      }
    }
  }

  // Fusionner les segments consécutifs de même couleur pour optimiser le DOM et le Canvas
  const merged: TextSegment[] = [];
  for (const seg of rawSegments) {
    if (merged.length > 0) {
      const last = merged[merged.length - 1];
      if (last.color === seg.color && last.isAccent === seg.isAccent) {
        last.text += seg.text;
        continue;
      }
    }
    merged.push({ ...seg });
  }

  return merged;
}

export interface CanvasMultiColorTextOptions {
  ctx: CanvasRenderingContext2D;
  text: string;
  x: number;
  y: number;
  primaryColor: string;
  accentColor?: string;
  highlightedWords?: string[];
  align?: 'left' | 'center' | 'right';
  letterSpacing?: number;
  font?: string;
  fontWeight?: 'normal' | 'semibold' | 'bold' | 'black' | number;
  hasBackgroundPill?: boolean;
}

/**
 * Trace un texte multi-couleurs sur un Canvas 2D avec mesure précise des segments (ctx.measureText)
 * et prise en charge du letter-spacing, font-weight, halo/capsule de fond et de l'alignement.
 */
export function drawMultiColorTextOnCanvas({
  ctx,
  text,
  x,
  y,
  primaryColor,
  accentColor = '#E11D48',
  highlightedWords = [],
  align = 'center',
  letterSpacing = 0,
  font,
  fontWeight,
  hasBackgroundPill = false,
}: CanvasMultiColorTextOptions): void {
  if (!text) return;

  ctx.save();
  if (font) {
    if (fontWeight) {
      const weightNum = typeof fontWeight === 'number' ? fontWeight : (
        fontWeight === 'normal' ? 400 :
        fontWeight === 'semibold' ? 600 :
        fontWeight === 'black' ? 900 : 800
      );
      const cleanFont = font.replace(/^(\d{3}|bold|normal|semibold|black)\s+/i, '');
      ctx.font = `${weightNum} ${cleanFont}`;
    } else {
      ctx.font = font;
    }
  }

  // Support natif de ctx.letterSpacing si disponible
  if (letterSpacing && letterSpacing !== 0 && 'letterSpacing' in ctx) {
    try {
      (ctx as any).letterSpacing = `${letterSpacing}px`;
    } catch {
      // Ignorer si non supporté
    }
  }

  const segments = parseTextSegments(text, primaryColor, accentColor, highlightedWords);
  if (segments.length === 0) {
    ctx.restore();
    return;
  }

  // Mesure de la largeur de chaque segment
  const segmentMetrics = segments.map((seg) => {
    let width = 0;
    if (letterSpacing && letterSpacing !== 0) {
      for (let i = 0; i < seg.text.length; i++) {
        width += ctx.measureText(seg.text[i]).width + letterSpacing;
      }
    } else {
      width = ctx.measureText(seg.text).width;
    }
    return { ...seg, width };
  });

  const totalWidth = segmentMetrics.reduce((sum, seg) => sum + seg.width, 0);

  // Position de départ
  let currX = x;
  if (align === 'center') {
    currX = x - totalWidth / 2;
  } else if (align === 'right') {
    currX = x - totalWidth;
  }

  // Option Capsule / Halo de contraste pour les petits textes
  if (hasBackgroundPill && totalWidth > 0) {
    ctx.save();
    const fontSizeMatch = ctx.font.match(/(\d+(?:\.\d+)?)\s*px/);
    const fontSize = fontSizeMatch ? parseFloat(fontSizeMatch[1]) : 24;
    const paddingX = 8;
    const paddingY = 4;
    const pillX = currX - paddingX;
    const pillY = y - fontSize * 0.85 - paddingY;
    const pillW = totalWidth + paddingX * 2;
    const pillH = fontSize * 1.15 + paddingY * 2;
    const radius = 6;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.60)';
    if (typeof (ctx as any).roundRect === 'function') {
      ctx.beginPath();
      (ctx as any).roundRect(pillX, pillY, pillW, pillH, radius);
      ctx.fill();
    } else {
      ctx.fillRect(pillX, pillY, pillW, pillH);
    }
    ctx.restore();
  }

  // Rendu consécutif
  for (const seg of segmentMetrics) {
    ctx.fillStyle = seg.color;
    if (letterSpacing && letterSpacing !== 0) {
      for (let i = 0; i < seg.text.length; i++) {
        const char = seg.text[i];
        ctx.fillText(char, currX, y);
        currX += ctx.measureText(char).width + letterSpacing;
      }
    } else {
      ctx.fillText(seg.text, currX, y);
      currX += seg.width;
    }
  }

  ctx.restore();
}
