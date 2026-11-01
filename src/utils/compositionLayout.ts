/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Dropper - Module de Gabarits de Composition Intelligents & Auto-Luminance
 * 
 * Supprime toute décision manuelle de mise en page (police, alignement, couleur, positionnement)
 * en positionnant, formatant et contrastant automatiquement chaque texte selon son rôle sémantique
 * et la luminance de l'image de fond.
 */

import React, { useState, useEffect } from 'react';
import type {
  LayoutTemplateId,
  DualityCampaignSlots,
  HeadlinerEventSlots,
  MinimalBrandSlots,
} from '../types';
import {
  resolveLayoutTemplateId,
  resolveDualityCampaignSlots,
  resolveHeadlinerEventSlots,
  resolveMinimalBrandSlots,
} from '../types';

export type {
  LayoutTemplateId,
  DualityCampaignSlots,
  HeadlinerEventSlots,
  MinimalBrandSlots,
};
export {
  resolveLayoutTemplateId,
  resolveDualityCampaignSlots,
  resolveHeadlinerEventSlots,
  resolveMinimalBrandSlots,
};

export type CompositionTemplate = 'campaign_dual' | 'headliner' | 'minimalist' | 'custom_legacy';

export interface SemanticTextRoles {
  topDualLeft: string;
  topDualRight: string;
  mainTitle: string;
  accentWord: string;
}

export interface QuadrantLuminanceResult {
  topLeftColor: '#FFFFFF' | '#0A0A0A';
  topRightColor: '#FFFFFF' | '#0A0A0A';
  topLeftLuminance: number;
  topRightLuminance: number;
}

// Couleurs canoniques imposées par le Design System Dropper
export const ACCENT_COLOR_ORANGE = '#F97316'; // Orange Signaid officiel
export const COLOR_PURE_WHITE = '#FFFFFF';
export const COLOR_DEEP_BLACK = '#0A0A0A';

// Cache mémoire pour éviter de recalculer inutilement la luminance
const luminanceCache = new Map<string, QuadrantLuminanceResult>();

/**
 * Calcul synchrone rapide de secours pour l'Auto-Luminance
 */
export function getQuadrantLuminanceSync(
  imageSrc: string | null | undefined,
  tone: number = 0.5,
  isToneActive: boolean = true
): QuadrantLuminanceResult {
  const isLightCanvas = isToneActive && tone < 0.48;
  const cacheKey = `${imageSrc || 'none'}_${tone}_${isToneActive}`;
  if (luminanceCache.has(cacheKey)) {
    return luminanceCache.get(cacheKey)!;
  }

  // Si pas d'image de fond ou fond clair forcé par le tone
  if (!imageSrc) {
    const fallback: QuadrantLuminanceResult = {
      topLeftColor: isLightCanvas ? COLOR_DEEP_BLACK : COLOR_PURE_WHITE,
      topRightColor: isLightCanvas ? COLOR_DEEP_BLACK : COLOR_DEEP_BLACK,
      topLeftLuminance: isLightCanvas ? 0.85 : 0.15,
      topRightLuminance: isLightCanvas ? 0.85 : 0.65,
    };
    return fallback;
  }

  // Heuristique pour l'image de référence ville futuriste / décor Dropper :
  // Le quadrant haut-gauche est sombre (ciel nocturne) -> Blanc
  // Le quadrant haut-droite est clair (lueurs d'enseignes / ciel éclairé) -> Noir
  const defaultResult: QuadrantLuminanceResult = {
    topLeftColor: isLightCanvas ? COLOR_DEEP_BLACK : COLOR_PURE_WHITE,
    topRightColor: isLightCanvas ? COLOR_DEEP_BLACK : COLOR_DEEP_BLACK,
    topLeftLuminance: isLightCanvas ? 0.85 : 0.22,
    topRightLuminance: isLightCanvas ? 0.85 : 0.68,
  };
  return defaultResult;
}

/**
 * Analyse par Computer Vision de la luminance moyenne des quadrants de l'image de fond
 * Divise le tiers supérieur en deux quadrants : Haut-Gauche et Haut-Droite.
 */
export function analyzeImageLuminance(
  imageSrc: string,
  tone: number = 0.5,
  isToneActive: boolean = true,
  brightness: number = 1.0,
  onComputed?: (res: QuadrantLuminanceResult) => void
) {
  if (!imageSrc || typeof window === 'undefined') return;

  const cacheKey = `${imageSrc}_${tone}_${isToneActive}_${brightness}`;
  if (luminanceCache.has(cacheKey)) {
    onComputed?.(luminanceCache.get(cacheKey)!);
    return;
  }

  const img = new Image();
  img.crossOrigin = 'anonymous';

  img.onload = () => {
    try {
      const sampleW = 80;
      const sampleH = 100;
      const canvas = document.createElement('canvas');
      canvas.width = sampleW;
      canvas.height = sampleH;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      ctx.drawImage(img, 0, 0, sampleW, sampleH);

      // Quadrant Haut-Gauche : x de 0 à 40 (50%), y de 0 à 30 (30% du haut)
      const tlData = ctx.getImageData(0, 0, Math.floor(sampleW * 0.5), Math.floor(sampleH * 0.3)).data;
      let tlSum = 0;
      let tlCount = 0;
      for (let i = 0; i < tlData.length; i += 4) {
        const r = tlData[i];
        const g = tlData[i + 1];
        const b = tlData[i + 2];
        // Formule standard de luminance relative ITU-R BT.601
        tlSum += 0.299 * r + 0.587 * g + 0.114 * b;
        tlCount++;
      }
      let tlLum = tlCount > 0 ? (tlSum / tlCount) / 255 : 0.2;

      // Quadrant Haut-Droite : x de 40 à 80 (50% à 100%), y de 0 à 30
      const trData = ctx.getImageData(Math.floor(sampleW * 0.5), 0, Math.floor(sampleW * 0.5), Math.floor(sampleH * 0.3)).data;
      let trSum = 0;
      let trCount = 0;
      for (let i = 0; i < trData.length; i += 4) {
        const r = trData[i];
        const g = trData[i + 1];
        const b = trData[i + 2];
        trSum += 0.299 * r + 0.587 * g + 0.114 * b;
        trCount++;
      }
      let trLum = trCount > 0 ? (trSum / trCount) / 255 : 0.7;

      // Ajustement avec le calque de tonalité de la toile Dropper
      if (isToneActive) {
        if (tone < 0.48) {
          // Canvas éclairci vers le blanc
          const delta = (0.5 - tone) * 1.4;
          tlLum = Math.min(1, tlLum + delta);
          trLum = Math.min(1, trLum + delta);
        } else if (tone > 0.52) {
          // Canvas assombri vers le noir
          const delta = (tone - 0.5) * 1.4;
          tlLum = Math.max(0, tlLum - delta);
          trLum = Math.max(0, trLum - delta);
        }
      }

      // Ajustement de luminosité globale
      tlLum = Math.max(0, Math.min(1, tlLum * brightness));
      trLum = Math.max(0, Math.min(1, trLum * brightness));

      // Règle d'or Auto-Luminance :
      // - Si sombre (< 0.5) -> Blanc (#FFFFFF)
      // - Si clair (>= 0.5) -> Noir (#0A0A0A)
      const res: QuadrantLuminanceResult = {
        topLeftLuminance: Number(tlLum.toFixed(2)),
        topRightLuminance: Number(trLum.toFixed(2)),
        topLeftColor: tlLum < 0.5 ? COLOR_PURE_WHITE : COLOR_DEEP_BLACK,
        topRightColor: trLum >= 0.5 ? COLOR_DEEP_BLACK : COLOR_PURE_WHITE,
      };

      luminanceCache.set(cacheKey, res);
      onComputed?.(res);
    } catch {
      // Sécurité en cas de restriction CORS (tainted canvas)
      const isLightCanvas = isToneActive && tone < 0.48;
      const fallback: QuadrantLuminanceResult = {
        topLeftLuminance: isLightCanvas ? 0.85 : 0.2,
        topRightLuminance: isLightCanvas ? 0.85 : 0.7,
        topLeftColor: isLightCanvas ? COLOR_DEEP_BLACK : COLOR_PURE_WHITE,
        topRightColor: isLightCanvas ? COLOR_DEEP_BLACK : COLOR_DEEP_BLACK,
      };
      luminanceCache.set(cacheKey, fallback);
      onComputed?.(fallback);
    }
  };

  img.onerror = () => {
    const isLightCanvas = isToneActive && tone < 0.48;
    const fallback: QuadrantLuminanceResult = {
      topLeftLuminance: isLightCanvas ? 0.85 : 0.2,
      topRightLuminance: isLightCanvas ? 0.85 : 0.7,
      topLeftColor: isLightCanvas ? COLOR_DEEP_BLACK : COLOR_PURE_WHITE,
      topRightColor: isLightCanvas ? COLOR_DEEP_BLACK : COLOR_DEEP_BLACK,
    };
    luminanceCache.set(cacheKey, fallback);
    onComputed?.(fallback);
  };

  img.src = imageSrc;
}

/**
 * Hook React pour la détection automatique de contraste (Auto-Luminance)
 */
export function useAutoLuminance(
  imageSrc: string | null | undefined,
  tone: number = 0.5,
  isToneActive: boolean = true,
  brightness: number = 1.0
): QuadrantLuminanceResult {
  const [result, setResult] = useState<QuadrantLuminanceResult>(() =>
    getQuadrantLuminanceSync(imageSrc, tone, isToneActive)
  );

  useEffect(() => {
    if (!imageSrc) {
      setResult(getQuadrantLuminanceSync(imageSrc, tone, isToneActive));
      return;
    }

    analyzeImageLuminance(imageSrc, tone, isToneActive, brightness, (res) => {
      setResult(res);
    });
  }, [imageSrc, tone, isToneActive, brightness]);

  return result;
}

/**
 * Résolution des rôles sémantiques stricts à partir des données de projet
 */
export function resolveSemanticRoles(data: any): SemanticTextRoles {
  return {
    topDualLeft: data.topDualLeft || data.headerTagline || 'DESCENDRE DANS LA RUE.',
    topDualRight: data.topDualRight || data.headlineBadgeText || 'SE FAIRE ENTENDRE AUTREMENT.',
    mainTitle: data.mainTitle || data.eventName || 'CHOISISSEZ',
    accentWord: data.accentWord || data.punchline || 'VOTRE VOIE',
  };
}
