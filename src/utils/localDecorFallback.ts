/**
 * Moteur Local de Génération de Décors de Secours (Fallback Canvas 2D HD)
 * Conçu pour remplacer instantanément la génération IA distante en cas d'erreur HTTP 502/500/Réseau.
 * Fonctionne 100% hors-ligne dans le navigateur, garantissant une continuité absolue sans popup bloquante.
 */

import { synthesizeAiAtmosphere } from './aiAtmosphereSynthesizer';

export interface LocalFallbackOptions {
  prompt?: string;
  genre?: string;
  aspectRatio?: string;
}

/**
 * Textures de secours sombres prédéfinies
 */
export const DARK_FALLBACK_TEXTURE_PRESETS = [
  {
    id: 'studio-carbon',
    name: 'Studio Carbon Minimaliste',
    url: '/demo/bg-demo.jpg',
  },
  {
    id: 'cyber-city-dark',
    name: 'Cité Nocturne Cyan & Obsidienne',
    url: '/demo/decor-ville-futuriste.jpg',
  },
];

/**
 * Résolution des dimensions du Canvas selon le ratio actif du poster Dropper
 */
function resolveDimensionsForRatio(aspectRatio: string = '1:1'): { width: number; height: number } {
  switch (aspectRatio) {
    case '9:16':
    case 'story':
      return { width: 1080, height: 1920 };
    case '16:9':
      return { width: 1920, height: 1080 };
    case '3:4':
    case 'a3':
      return { width: 1080, height: 1440 };
    case '4:5':
      return { width: 1080, height: 1350 };
    case '3:1':
    case 'banner':
      return { width: 1920, height: 640 };
    case '1:1':
    case 'post':
    default:
      return { width: 1080, height: 1080 };
  }
}

/**
 * Génère une texture de bruit granulé (grain argentique subtil) sur un canvas temporaire
 */
function createNoiseTile(size = 128, opacity = 14): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  try {
    const tile = document.createElement('canvas');
    tile.width = size;
    tile.height = size;
    const ctx = tile.getContext('2d');
    if (!ctx) return null;

    const imgData = ctx.createImageData(size, size);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const v = Math.floor(Math.random() * 255);
      data[i] = v;
      data[i + 1] = v;
      data[i + 2] = v;
      data[i + 3] = Math.floor(Math.random() * opacity); // Opacité fine (3-6%)
    }
    ctx.putImageData(imgData, 0, 0);
    return tile;
  } catch (_e) {
    return null;
  }
}

/**
 * Profil chromatique sombre adapté au prompt et au genre musical
 */
function getAtmospherePalette(prompt = '', genre = '') {
  const combined = `${prompt} ${genre}`.toLowerCase();

  // 1. House, Melodic, Sunset, Coucher de soleil
  if (
    combined.includes('melodic') ||
    combined.includes('house') ||
    combined.includes('sunset') ||
    combined.includes('disco') ||
    combined.includes('soleil') ||
    combined.includes('dore') ||
    combined.includes('doré') ||
    combined.includes('warm')
  ) {
    return {
      skyTop: '#0a040e',
      skyMid: '#240a2a',
      skyBottom: '#07020a',
      glowColor: '#ff7a00',
      mistColor: '#ff2a6d',
      ambientColor: '#ffd166',
      accentGlow: 'rgba(255, 122, 0, 0.22)',
      rimColor: 'rgba(255, 42, 109, 0.16)',
    };
  }

  // 2. Cyber, Futur, Synthwave, Acid, Trance
  if (
    combined.includes('futur') ||
    combined.includes('cyber') ||
    combined.includes('synth') ||
    combined.includes('acid') ||
    combined.includes('trance') ||
    combined.includes('neon') ||
    combined.includes('electro')
  ) {
    return {
      skyTop: '#050210',
      skyMid: '#16052d',
      skyBottom: '#030109',
      glowColor: '#00f0ff',
      mistColor: '#a855f7',
      ambientColor: '#38bdf8',
      accentGlow: 'rgba(0, 240, 255, 0.20)',
      rimColor: 'rgba(168, 85, 247, 0.18)',
    };
  }

  // 3. Rap, Trap, Drill, Urban, Street
  if (
    combined.includes('rap') ||
    combined.includes('trap') ||
    combined.includes('drill') ||
    combined.includes('urban') ||
    combined.includes('hip hop') ||
    combined.includes('ruelle')
  ) {
    return {
      skyTop: '#040305',
      skyMid: '#121118',
      skyBottom: '#020203',
      glowColor: '#ff2233',
      mistColor: '#475569',
      ambientColor: '#ff5533',
      accentGlow: 'rgba(255, 34, 51, 0.18)',
      rimColor: 'rgba(100, 116, 139, 0.20)',
    };
  }

  // 4. Afro, Organic, Dune, Sable
  if (
    combined.includes('afro') ||
    combined.includes('organic') ||
    combined.includes('dune') ||
    combined.includes('desert') ||
    combined.includes('sable')
  ) {
    return {
      skyTop: '#0d0502',
      skyMid: '#2b1006',
      skyBottom: '#060201',
      glowColor: '#f4a261',
      mistColor: '#e76f51',
      ambientColor: '#e9c46a',
      accentGlow: 'rgba(244, 162, 97, 0.22)',
      rimColor: 'rgba(231, 111, 81, 0.16)',
    };
  }

  // 5. Défaut / Techno & Minimal Obsidian (Noir profond ultra-clean)
  return {
    skyTop: '#040508',
    skyMid: '#0c0f18',
    skyBottom: '#020204',
    glowColor: '#00d4ff',
    mistColor: '#1e293b',
    ambientColor: '#94a3b8',
    accentGlow: 'rgba(0, 212, 255, 0.18)',
    rimColor: 'rgba(148, 163, 184, 0.14)',
  };
}

/**
 * Générateur local de décor de secours par Canvas 2D
 * Produit un fond texturé sombre cinématique, optimisé pour les affiches événementielles.
 */
export async function generateLocalFallbackBackground(
  options: LocalFallbackOptions = {}
): Promise<string> {
  const { prompt = '', genre = 'Techno', aspectRatio = '1:1' } = options;
  const { width, height } = resolveDimensionsForRatio(aspectRatio);

  if (typeof document === 'undefined') {
    // Environnement sans DOM (SSR ou Node) : repli sur le synthétiseur vectoriel SVG
    return synthesizeAiAtmosphere({
      prompt,
      genre,
      width,
      height,
    });
  }

  try {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Impossible d\'obtenir le contexte Canvas 2D');
    }

    const palette = getAtmospherePalette(prompt, genre);

    // 1. Fond dégradé vertical profond (Ciel / Espace supérieur)
    const baseGrad = ctx.createLinearGradient(0, 0, 0, height);
    baseGrad.addColorStop(0, palette.skyTop);
    baseGrad.addColorStop(0.5, palette.skyMid);
    baseGrad.addColorStop(1, palette.skyBottom);
    ctx.fillStyle = baseGrad;
    ctx.fillRect(0, 0, width, height);

    // 2. Halo lumineux radial atmosphérique (Spot central / Horizon lointain)
    const cx = width * 0.5;
    const cy = height * 0.42;
    const maxRadius = Math.max(width, height) * 0.65;

    const radialGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxRadius);
    radialGlow.addColorStop(0, palette.accentGlow);
    radialGlow.addColorStop(0.35, palette.rimColor);
    radialGlow.addColorStop(0.7, 'rgba(0, 0, 0, 0.1)');
    radialGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = radialGlow;
    ctx.fillRect(0, 0, width, height);

    // 3. Lignes de perspective subtiles ou sol minéral sombre (effet de profondeur 3D discret)
    const horizonY = height * 0.65;

    // Dégradé brume d'horizon
    const mistGrad = ctx.createLinearGradient(0, horizonY - 120, 0, height);
    mistGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    mistGrad.addColorStop(0.2, palette.rimColor);
    mistGrad.addColorStop(0.6, palette.skyBottom);
    mistGrad.addColorStop(1, '#000000');
    ctx.fillStyle = mistGrad;
    ctx.fillRect(0, horizonY - 120, width, height - (horizonY - 120));

    // Contour de crête géométrique minimale (silhouettes lointaines)
    ctx.save();
    ctx.fillStyle = palette.skyBottom;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.moveTo(0, horizonY);
    ctx.quadraticCurveTo(width * 0.25, horizonY - 35, width * 0.5, horizonY + 8);
    ctx.quadraticCurveTo(width * 0.75, horizonY - 25, width, horizonY - 5);
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // 4. Lignes de grille ou reflets géométriques d'ambiance en basse opacité
    ctx.save();
    ctx.strokeStyle = palette.glowColor;
    ctx.globalAlpha = 0.05;
    ctx.lineWidth = 1.5;

    // Lignes de fuite douces vers le centre
    const lineCount = 8;
    for (let i = 0; i <= lineCount; i++) {
      const bottomX = (width / lineCount) * i;
      ctx.beginPath();
      ctx.moveTo(cx, horizonY + 20);
      ctx.lineTo(bottomX, height);
      ctx.stroke();
    }

    // Lignes horizontales d'éloignement
    for (let y = horizonY + 30; y < height; y += (height - horizonY) / 5) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    ctx.restore();

    // 5. Grain de pellicule argentique (Noise texture tile)
    const noiseTile = createNoiseTile(128, 14);
    if (noiseTile) {
      ctx.save();
      const pattern = ctx.createPattern(noiseTile, 'repeat');
      if (pattern) {
        ctx.fillStyle = pattern;
        ctx.fillRect(0, 0, width, height);
      }
      ctx.restore();
    }

    // 6. Vignette cinéma sombre sur les bords pour centrer le sujet
    const vignette = ctx.createRadialGradient(cx, cy, Math.min(width, height) * 0.35, cx, cy, Math.max(width, height) * 0.75);
    vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vignette.addColorStop(0.7, 'rgba(0, 0, 0, 0.25)');
    vignette.addColorStop(1, 'rgba(0, 0, 0, 0.65)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);

    // Exportation sous forme de data-URL JPEG haute qualité (léger et ultra rapide)
    return canvas.toDataURL('image/jpeg', 0.92);
  } catch (err) {
    console.warn('[LocalDecorFallback] Échec génération Canvas 2D, bascule vers synthétiseur SVG :', err);
    try {
      return synthesizeAiAtmosphere({
        prompt,
        genre,
        width,
        height,
      });
    } catch (_svgErr) {
      // Ultime fallback sur une texture sombre statique
      return '/demo/bg-demo.jpg';
    }
  }
}
