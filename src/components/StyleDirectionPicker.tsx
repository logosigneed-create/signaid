import React, { useRef, useState, useEffect } from 'react';
import { EventInput, TypographyStyle, FocusedTarget } from '../types';

/**
 * Conversion simple HSL -> Hex
 */
export function hslToHex(h: number, s: number, l: number): string {
  l /= 100;
  const a = (s * Math.min(l, 1 - l)) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/**
 * Conversion Hex -> HSL (H: 0-360, S: 0-100, L: 0-100)
 */
export function hexToHsl(hex: string): { h: number; s: number; l: number } {
  let cleaned = (hex || '').replace('#', '');
  if (cleaned.length === 3) {
    cleaned = cleaned.split('').map((c) => c + c).join('');
  }
  const num = parseInt(cleaned, 16);
  if (isNaN(num)) return { h: 110, s: 100, l: 54 };
  const r = ((num >> 16) & 255) / 255;
  const g = ((num >> 8) & 255) / 255;
  const b = (num & 255) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h = Math.round(h * 60);
  }

  return {
    h: (h + 360) % 360,
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

/**
 * 1. Configuration des Presets (État par défaut)
 * Logique couplée Style -> Couleur -> Prompt IA
 */
export interface StylePreset {
  label: 'FUTUR' | 'HARD' | 'URBAN';
  typographyId: TypographyStyle;
  defaultColor: string;
  promptModifier: string;
}

export const STYLE_PRESETS: Record<'FUTUR' | 'HARD' | 'URBAN', StylePreset> = {
  FUTUR: {
    label: 'FUTUR',
    typographyId: 'futur',
    defaultColor: '#FF6B00',
    promptModifier: 'futuristic dark aesthetics, sharp cybernetic glow, deep black contrast with neon orange highlights',
  },
  HARD: {
    label: 'HARD',
    typographyId: 'techno',
    defaultColor: '#FF1E27',
    promptModifier: 'industrial brutalist rave, stark monochrome textures, strobe flash with intense crimson red shadows',
  },
  URBAN: {
    label: 'URBAN',
    typographyId: 'urban',
    defaultColor: '#FFB800',
    promptModifier: 'underground street vibe, raw concrete grain, night city ambient glow with amber gold accents',
  },
};

export type StylePresetKey = keyof typeof STYLE_PRESETS;

/**
 * Détermine la clé active (FUTUR | HARD | URBAN) à partir de l'état
 */
export function getActiveStyleKey(
  typographyStyle?: string,
  headerTagline?: string
): StylePresetKey {
  const normStyle = (typographyStyle || '').toUpperCase();
  if (normStyle === 'HARD' || normStyle === 'TECHNO') return 'HARD';
  if (normStyle === 'URBAN') return 'URBAN';
  if (normStyle === 'FUTUR') return 'FUTUR';

  const normTag = (headerTagline || '').toUpperCase();
  if (normTag.includes('HARD')) return 'HARD';
  if (normTag.includes('URBAN')) return 'URBAN';
  return 'FUTUR';
}

/**
 * 2. Comportement du State & Prompt IA
 * Injecte ou répercute dynamiquement la chaîne d'injection chromatique dans le prompt du générateur de fond IA.
 */
export function injectChromaticDirectionIntoPrompt(
  currentPrompt: string | undefined,
  styleKey: StylePresetKey,
  customColorHex?: string
): string {
  const preset = STYLE_PRESETS[styleKey];

  // Si une couleur manuelle personnalisée est passée et diffère de la couleur par défaut
  const hasManualCustomColor =
    Boolean(customColorHex) &&
    customColorHex?.toUpperCase() !== preset.defaultColor.toUpperCase();

  const chromaticInjection = hasManualCustomColor
    ? `${preset.promptModifier}, accent color ${customColorHex!.toUpperCase()}`
    : preset.promptModifier;

  if (!currentPrompt || !currentPrompt.trim()) {
    return chromaticInjection;
  }

  // Nettoyage préalable des anciens modifiers et des mentions "accent color"
  let cleaned = currentPrompt;
  Object.values(STYLE_PRESETS).forEach((p) => {
    cleaned = cleaned.replace(p.promptModifier, '');
  });
  cleaned = cleaned.replace(/,?\s*accent color\s*#[0-9a-fA-F]{3,8}/gi, '');
  cleaned = cleaned
    .replace(/^[\s,]+|[\s,]+$/g, '')
    .replace(/,\s*,/g, ', ')
    .trim();

  if (!cleaned) {
    return chromaticInjection;
  }

  return `${cleaned}, ${chromaticInjection}`;
}

interface StyleDirectionPickerProps {
  input: EventInput;
  setInput: React.Dispatch<React.SetStateAction<EventInput>>;
  isDayMode?: boolean;
  setFocusedTarget?: (target: FocusedTarget) => void;
  setIsLiveScrubbing?: (active: boolean) => void;
  setLiveScrubData?: React.Dispatch<React.SetStateAction<{ label: string; value: string } | null>>;
}

export const StyleDirectionPicker: React.FC<StyleDirectionPickerProps> = ({
  input,
  setInput,
  isDayMode = false,
  setFocusedTarget,
  setIsLiveScrubbing,
  setLiveScrubData,
}) => {
  const colorInputRef = useRef<HTMLInputElement>(null);

  const activeStyleKey = getActiveStyleKey(input.typographyStyle, input.headerTagline);
  const activePreset = STYLE_PRESETS[activeStyleKey];

  // Résolution de la couleur active (accentColor prioritaire, puis dynamicTheme.primaryAccent, puis defaultColor)
  const activeColor =
    (input.accentColor && /^#[0-9A-Fa-f]{6}$/.test(input.accentColor))
      ? input.accentColor
      : (input.dynamicTheme?.primaryAccent && /^#[0-9A-Fa-f]{6}$/.test(input.dynamicTheme.primaryAccent))
        ? input.dynamicTheme.primaryAccent
        : activePreset.defaultColor;

  const currentAccentColor = activeColor;

  // Calcul initial HSL & synchronisation
  const initialHsl = hexToHsl(activeColor);
  const [hueValue, setHueValue] = useState(initialHsl.h);
  const [lightnessValue, setLightnessValue] = useState(Math.min(90, Math.max(20, initialHsl.l)));
  const lastActiveColorRef = useRef(activeColor);

  useEffect(() => {
    if (activeColor && activeColor.toUpperCase() !== lastActiveColorRef.current.toUpperCase()) {
      lastActiveColorRef.current = activeColor;
      const { h, l } = hexToHsl(activeColor);
      setHueValue(h);
      setLightnessValue(Math.min(90, Math.max(20, l)));
    }
  }, [activeColor]);

  /**
   * Sélection d'un style (FUTUR, HARD ou URBAN) :
   * - Active le bouton de style correspondant.
   * - Met à jour automatiquement la variable 'accentColor' avec la defaultColor associée.
   * - Met à jour dynamiquement la chaîne d'injection chromatique transmise au prompt du générateur de fond IA.
   */
  const handleSelectStyle = (key: StylePresetKey) => {
    const preset = STYLE_PRESETS[key];
    lastActiveColorRef.current = preset.defaultColor;
    const { h, l } = hexToHsl(preset.defaultColor);
    setHueValue(h);
    setLightnessValue(Math.min(90, Math.max(20, l)));

    setInput((prev) => {
      const updatedPrompt = injectChromaticDirectionIntoPrompt(prev.ambiancePrompt, key);
      return {
        ...prev,
        typographyStyle: preset.typographyId,
        headerTagline: preset.label,
        accentColor: preset.defaultColor,
        themeColor: preset.defaultColor,
        primaryColor: preset.defaultColor,
        dynamicTheme: {
          ...(prev.dynamicTheme || { secondaryAccent: '#00f0ff' }),
          primaryAccent: preset.defaultColor,
          glowColor: preset.defaultColor,
          themeColor: preset.defaultColor,
        },
        ambiancePrompt: updatedPrompt,
      };
    });
  };

  /**
   * Modification manuelle de la couleur d'accent (Desktop) :
   * - Met à jour 'accentColor', 'themeColor', 'primaryColor' et 'dynamicTheme'.
   * - Répercute la nouvelle couleur dans le prompt IA.
   */
  const handleColorChange = (newColor: string) => {
    lastActiveColorRef.current = newColor;
    const { h, l } = hexToHsl(newColor);
    setHueValue(h);
    setLightnessValue(Math.min(90, Math.max(20, l)));

    setInput((prev) => {
      const currentStyle = getActiveStyleKey(prev.typographyStyle, prev.headerTagline);
      const updatedPrompt = injectChromaticDirectionIntoPrompt(prev.ambiancePrompt, currentStyle, newColor);
      return {
        ...prev,
        accentColor: newColor,
        themeColor: newColor,
        primaryColor: newColor,
        dynamicTheme: {
          ...(prev.dynamicTheme || { secondaryAccent: '#00f0ff' }),
          primaryAccent: newColor,
          glowColor: newColor,
          themeColor: newColor,
        },
        ambiancePrompt: updatedPrompt,
      };
    });
  };

  /**
   * Mise à jour rapide depuis les curseurs HSL fluides (Mobile)
   */
  const updateHslColor = (newHex: string) => {
    lastActiveColorRef.current = newHex;
    setInput((prev) => {
      const currentStyle = getActiveStyleKey(prev.typographyStyle, prev.headerTagline);
      const updatedPrompt = injectChromaticDirectionIntoPrompt(prev.ambiancePrompt, currentStyle, newHex);
      return {
        ...prev,
        accentColor: newHex,
        themeColor: newHex,
        primaryColor: newHex,
        dynamicTheme: {
          ...(prev.dynamicTheme || { secondaryAccent: '#00f0ff' }),
          primaryAccent: newHex,
          glowColor: newHex,
          themeColor: newHex,
        },
        ambiancePrompt: updatedPrompt,
      };
    });
  };

  return (
    <div className="space-y-3 select-none">
      {/* Palette de nuances néon & high-contrast directes (sans saut d'étape) */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
        {[
          { color: '#FF6B00', label: 'Neon Orange' },
          { color: '#00F0FF', label: 'Cyber Cyan' },
          { color: '#FF1E27', label: 'Ultra Crimson' },
          { color: '#FFB800', label: 'Electric Gold' },
          { color: '#FFFFFF', label: 'Pure White' },
          { color: '#D946EF', label: 'Hyper Pink' },
        ].map((item) => {
          const isSelected = activeColor.toUpperCase() === item.color.toUpperCase();
          return (
            <button
              key={item.color}
              type="button"
              onClick={() => handleColorChange(item.color)}
              className={`h-7 px-2.5 rounded-lg border text-[10px] font-mono font-bold uppercase transition flex items-center gap-1.5 cursor-pointer shrink-0 focus-visible:ring-2 focus-visible:ring-lime-400 focus-visible:outline-none active:scale-95 ${
                isSelected
                  ? isDayMode
                    ? 'border-zinc-900 bg-zinc-900 text-white shadow-sm'
                    : 'border-white bg-zinc-800 text-white shadow-lg ring-1 ring-white/30'
                  : isDayMode
                  ? 'border-zinc-300 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-medium'
                  : 'border-zinc-800 bg-zinc-900/80 text-zinc-400 hover:text-white hover:border-zinc-700'
              }`}
              title={item.label}
            >
              <span
                className="w-2.5 h-2.5 rounded-full inline-block shadow-sm"
                style={{ backgroundColor: item.color }}
              />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* LIGNE 2 (Desktop >= 920px) : Sélecteur de couleur compact : pastille cliquable (w-8 h-8 rounded-lg) + label sobre "Couleur d'accent" */}
      <div className="hidden min-[920px]:flex items-center">
        <label
          className="inline-flex items-center gap-2.5 cursor-pointer group select-none"
          title="Modifier la couleur d'accent personnalisée"
        >
          {/* Input[type="color"] masqué sans déclenchement d'étape */}
          <input
            ref={colorInputRef}
            type="color"
            value={activeColor}
            onChange={(e) => {
              handleColorChange(e.target.value);
            }}
            className="sr-only"
            aria-label="Couleur d'accent personnalisée"
          />

          {/* Pastille cliquable (w-8 h-8 rounded-lg) affichant la couleur active */}
          <span
            className="w-8 h-8 rounded-lg border border-black/30 dark:border-white/20 shadow-sm transition-transform duration-150 group-hover:scale-105 group-active:scale-95 shrink-0 block"
            style={{ backgroundColor: activeColor }}
          />

          {/* Label sobre "Couleur d'accent" */}
          <span
            className={`text-xs font-mono tracking-tight transition-colors ${
              isDayMode ? 'text-zinc-900 group-hover:text-zinc-950 font-bold' : 'text-zinc-300 group-hover:text-white font-medium'
            }`}
          >
            Couleur personnalisée
          </span>
        </label>
      </div>

      {/* LIGNE 2 (Mobile < 920px) : Deux jauges fluides (Teinte chromatique 0-360° et Éclat Néon 20-90%) avec Hold-to-Preview */}
      <div className="min-[920px]:hidden space-y-3 pt-1">
        {/* Jauge 1 : Teinte de la couleur d'accent (0° à 360°) */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-[10px] font-mono font-bold">
            <span className={isDayMode ? 'text-zinc-900' : 'text-zinc-300'}>Couleur d'accent (Teinte)</span>
            <div className="flex items-center gap-1.5">
              <span className={`font-mono ${isDayMode ? 'text-zinc-900' : 'text-lime-400'}`}>{hueValue}°</span>
              <span
                className="w-3.5 h-3.5 rounded-full border border-white/20 inline-block shadow-sm"
                style={{ backgroundColor: currentAccentColor }}
              />
            </div>
          </div>
          <input
            type="range"
            min="0"
            max="360"
            step="1"
            value={hueValue}
            aria-label="Teinte de la couleur d'accent (0 à 360 degrés)"
            onPointerDown={(e) => {
              try {
                e.currentTarget.setPointerCapture(e.pointerId);
              } catch (_) {}
              setIsLiveScrubbing?.(true);
              setLiveScrubData?.({ label: "Teinte d'accent", value: `${hueValue}°` });
            }}
            onPointerUp={(e) => {
              try {
                e.currentTarget.releasePointerCapture(e.pointerId);
              } catch (_) {}
              setIsLiveScrubbing?.(false);
              setLiveScrubData?.(null);
            }}
            onPointerCancel={() => {
              setIsLiveScrubbing?.(false);
              setLiveScrubData?.(null);
            }}
            onChange={(e) => {
              const h = parseInt(e.target.value, 10);
              setHueValue(h);
              const newHex = hslToHex(h, 100, lightnessValue);
              updateHslColor(newHex);
              setLiveScrubData?.({ label: "Teinte d'accent", value: `${h}°` });
            }}
            className="w-full h-2 rounded-lg appearance-none cursor-pointer touch-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-black/30 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-black/30"
            style={{
              background:
                'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)',
            }}
          />
        </div>

        {/* Jauge 2 : Luminosité / Éclat Néon (20% à 90%) */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-[10px] font-mono font-bold">
            <span className={isDayMode ? 'text-zinc-900' : 'text-zinc-300'}>Éclat &amp; Luminosité</span>
            <span className={`font-mono ${isDayMode ? 'text-zinc-900' : 'text-lime-400'}`}>{lightnessValue} %</span>
          </div>
          <input
            type="range"
            min="20"
            max="90"
            step="1"
            value={lightnessValue}
            aria-label="Éclat et luminosité de la couleur d'accent (20 à 90 pourcent)"
            onPointerDown={(e) => {
              try {
                e.currentTarget.setPointerCapture(e.pointerId);
              } catch (_) {}
              setIsLiveScrubbing?.(true);
              setLiveScrubData?.({ label: 'Éclat & Luminosité', value: `${lightnessValue} %` });
            }}
            onPointerUp={(e) => {
              try {
                e.currentTarget.releasePointerCapture(e.pointerId);
              } catch (_) {}
              setIsLiveScrubbing?.(false);
              setLiveScrubData?.(null);
            }}
            onPointerCancel={() => {
              setIsLiveScrubbing?.(false);
              setLiveScrubData?.(null);
            }}
            onChange={(e) => {
              const l = parseInt(e.target.value, 10);
              setLightnessValue(l);
              const newHex = hslToHex(hueValue, 100, l);
              updateHslColor(newHex);
              setLiveScrubData?.({ label: 'Éclat & Luminosité', value: `${l} %` });
            }}
            className="w-full h-2 rounded-lg appearance-none cursor-pointer touch-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-black/30 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-black/30"
            style={{
              background: `linear-gradient(to right, #000000 0%, ${hslToHex(hueValue, 100, 50)} 50%, #ffffff 100%)`,
            }}
          />
        </div>
      </div>
    </div>
  );
};
