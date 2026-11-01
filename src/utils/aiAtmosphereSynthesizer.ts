// AI Atmosphere Synthesizer: Procedural Generative Engine
// Crafts fine-art scenic landscapes centering a solitary architectural/sculptural monument with genre-adapted lighting.
// Strictly NO party/club atmospheres.

export interface SynthesizerOptions {
  prompt: string;
  genre?: string;
  seed?: number;
  width?: number;
  height?: number;
}

export function synthesizeAiAtmosphere(options: SynthesizerOptions): string {
  const width = options.width || 1200;
  const height = options.height || 1600;
  const seed = options.seed || Math.floor(Math.random() * 899999) + 100000;
  const prompt = (options.prompt || '').toLowerCase();
  const genre = (options.genre || '').toLowerCase();
  const combined = `${prompt} ${genre}`.trim();

  // Pseudo-random generator seeded deterministically
  let s = Math.abs(seed);
  const rnd = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };

  // 1. Genre-Based Lighting & Atmosphere Profiling
  const isMelodic =
    combined.includes('melodic') ||
    combined.includes('deep') ||
    combined.includes('house') ||
    combined.includes('afro') ||
    combined.includes('sunset') ||
    combined.includes('dore') ||
    combined.includes('doré') ||
    combined.includes('soleil') ||
    combined.includes('warm') ||
    combined.includes('coucher');

  const isAcidTrance =
    combined.includes('acid') ||
    combined.includes('trance') ||
    combined.includes('psy') ||
    combined.includes('cyber') ||
    combined.includes('neon') ||
    combined.includes('violet') ||
    combined.includes('purple');

  const isMinimalAmbient =
    combined.includes('minimal') ||
    combined.includes('ambient') ||
    combined.includes('downtempo') ||
    combined.includes('silver') ||
    combined.includes('argent') ||
    combined.includes('monochrome') ||
    combined.includes('gris');

  // Colors adapted to the musical style
  let skyTop = '#06040d';
  let skyMid = '#1c0e2b';
  let skyHorizon = '#381640';
  let terrainBase = '#08050e';
  let terrainShadow = '#030206';
  let lightPrimary = '#ff7a00';   // Warm amber
  let lightSecondary = '#ff3e6c'; // Magenta dusk
  let lightAccent = '#ffd166';    // Golden glow
  let glowColor = '#ff9800';

  if (isMelodic) {
    // Warm Twilight / Golden Hour Horizon
    skyTop = '#0a0512';
    skyMid = '#2a1128';
    skyHorizon = '#5e2338';
    terrainBase = '#120b12';
    terrainShadow = '#060306';
    lightPrimary = '#ff8800';
    lightSecondary = '#ff4d6d';
    lightAccent = '#ffdd80';
    glowColor = '#ff9100';
  } else if (isAcidTrance) {
    // Hypnotic Ultraviolet & Neon
    skyTop = '#080112';
    skyMid = '#220438';
    skyHorizon = '#3a0852';
    terrainBase = '#090214';
    terrainShadow = '#030008';
    lightPrimary = '#d000ff';
    lightSecondary = '#00f0ff';
    lightAccent = '#ff6b00';
    glowColor = '#d000ff';
  } else if (isMinimalAmbient) {
    // Ethereal Monochromatic Silver & Moonlight
    skyTop = '#06080c';
    skyMid = '#121722';
    skyHorizon = '#222b3d';
    terrainBase = '#0a0d14';
    terrainShadow = '#040508';
    lightPrimary = '#e2e8f0';
    lightSecondary = '#94a3b8';
    lightAccent = '#38bdf8';
    glowColor = '#94a3b8';
  } else {
    // Techno / Peak-Time: Cold Nocturnal Moonlight & Obsidian Slate
    skyTop = '#02060d';
    skyMid = '#091829';
    skyHorizon = '#0e2b47';
    terrainBase = '#040d17';
    terrainShadow = '#01050a';
    lightPrimary = '#00d2ff';
    lightSecondary = '#0077ff';
    lightAccent = '#00ffa3';
    glowColor = '#00d2ff';
  }

  // 2. Landscape Geometry
  const horizonY = height * (0.64 + (rnd() - 0.5) * 0.05);

  // Distant mountain ridges along horizon
  let mountainsSvg = '';
  const mountainCount = 2;
  for (let m = 0; m < mountainCount; m++) {
    const mHeight = 80 + rnd() * 120;
    const mBase = horizonY + 10;
    let mPath = `M0,${mBase} `;
    const steps = 7;
    for (let st = 1; st < steps; st++) {
      const sx = (st / steps) * width;
      const sy = mBase - (rnd() * mHeight);
      mPath += `L${sx.toFixed(0)},${sy.toFixed(0)} `;
    }
    mPath += `L${width},${mBase} L${width},${height} L0,${height} Z`;
    const mCol = m === 0 ? skyHorizon : terrainBase;
    mountainsSvg += `<path d="${mPath}" fill="${mCol}" opacity="${0.75 - m * 0.25}" />`;
  }

  // Ground terrain (Dunes / Reflections / Plain)
  const groundSvg = `
    <!-- Vast Scenic Ground Terrain -->
    <rect x="0" y="${horizonY}" width="${width}" height="${height - horizonY}" fill="url(#terrainGrad_${seed})" />
    <!-- Horizon Volumetric Light Haze -->
    <ellipse cx="${width * 0.5}" cy="${horizonY}" rx="${width * 0.6}" ry="${height * 0.09}" fill="url(#horizonHaze_${seed})" opacity="0.65" />
    <!-- Ground Contour Wave Lines -->
    <path d="M0,${horizonY + 80} Q${width * 0.3},${horizonY + 40} ${width * 0.6},${horizonY + 90} T${width},${horizonY + 60} L${width},${height} L0,${height} Z" fill="${terrainShadow}" opacity="0.45" />
    <path d="M0,${horizonY + 220} Q${width * 0.4},${horizonY + 160} ${width * 0.7},${horizonY + 240} T${width},${horizonY + 190} L${width},${height} L0,${height} Z" fill="${terrainShadow}" opacity="0.65" />
  `;

  // 3. Central Monument / Architectural Element
  // Archetypes:
  // 0 = Obsidian Monolith
  // 1 = Floating Celestial Ring / Portal
  // 2 = Brutalist Geometric Prism / Pyramid
  const monumentType = Math.floor(rnd() * 3);
  let monumentSvg = '';
  const centerX = width * 0.5;

  if (monumentType === 0) {
    // Archetype 0: The Majestic Obsidian Monolith
    const monoW = width * 0.16;
    const monoH = height * 0.38;
    const monoTopY = horizonY - monoH * 0.72;
    const monoBottomY = horizonY + monoH * 0.28;
    const halfW = monoW * 0.5;

    monumentSvg = `
      <!-- Ground Shadow / Base Aura -->
      <ellipse cx="${centerX}" cy="${monoBottomY + 10}" rx="${monoW * 1.8}" ry="${monoW * 0.35}" fill="#000000" opacity="0.75" />
      <ellipse cx="${centerX}" cy="${monoBottomY}" rx="${monoW * 1.2}" ry="${monoW * 0.25}" fill="${lightPrimary}" opacity="0.30" filter="url(#softGlow_${seed})" />

      <!-- Backlight Halo around the Monolith -->
      <ellipse cx="${centerX}" cy="${(monoTopY + monoBottomY) * 0.5}" rx="${monoW * 1.4}" ry="${monoH * 0.55}" fill="url(#coreBacklight_${seed})" opacity="0.8" filter="url(#softGlow_${seed})" />

      <!-- Monolith Left Facet (Lit side) -->
      <polygon points="${centerX - halfW},${monoBottomY} ${centerX - halfW * 0.8},${monoTopY} ${centerX},${monoTopY - 15} ${centerX},${monoBottomY + 8}" fill="url(#monolithLit_${seed})" />

      <!-- Monolith Right Facet (Shadow side) -->
      <polygon points="${centerX},${monoTopY - 15} ${centerX + halfW * 0.8},${monoTopY} ${centerX + halfW},${monoBottomY} ${centerX},${monoBottomY + 8}" fill="url(#monolithShadow_${seed})" />

      <!-- Center Vertical Luminescent Seam (Style-adapted light conduit) -->
      <line x1="${centerX}" y1="${monoTopY - 15}" x2="${centerX}" y2="${monoBottomY + 8}" stroke="${lightAccent}" stroke-width="3" filter="url(#glow_${seed})" />
      <line x1="${centerX}" y1="${monoTopY - 15}" x2="${centerX}" y2="${monoBottomY + 8}" stroke="#ffffff" stroke-width="1" />

      <!-- Specular Bevel Edge -->
      <line x1="${centerX - halfW * 0.8}" y1="${monoTopY}" x2="${centerX - halfW}" y2="${monoBottomY}" stroke="${lightPrimary}" stroke-width="1.5" stroke-opacity="0.85" />
      <line x1="${centerX + halfW * 0.8}" y1="${monoTopY}" x2="${centerX + halfW}" y2="${monoBottomY}" stroke="${lightSecondary}" stroke-width="1.5" stroke-opacity="0.5" />
    `;
  } else if (monumentType === 1) {
    // Archetype 1: Floating Celestial Ring / Portal
    const ringRadius = width * 0.22;
    const ringY = horizonY - height * 0.06;

    monumentSvg = `
      <!-- Portal Ground Reflection on the Landscape -->
      <ellipse cx="${centerX}" cy="${horizonY + 90}" rx="${ringRadius * 1.3}" ry="${height * 0.08}" fill="url(#portalReflection_${seed})" opacity="0.55" filter="url(#softGlow_${seed})" />

      <!-- Celestial Inner Void & Atmospheric Aura -->
      <circle cx="${centerX}" cy="${ringY}" r="${ringRadius * 1.5}" fill="url(#coreBacklight_${seed})" opacity="0.7" filter="url(#softGlow_${seed})" />

      <!-- Inner Celestial Horizon Light Beam -->
      <ellipse cx="${centerX}" cy="${ringY}" rx="${ringRadius * 0.92}" ry="${ringRadius * 0.92}" fill="url(#portalVoid_${seed})" />

      <!-- Outer Ring Structure -->
      <circle cx="${centerX}" cy="${ringY}" r="${ringRadius}" fill="none" stroke="${lightPrimary}" stroke-width="9" filter="url(#glow_${seed})" />
      <circle cx="${centerX}" cy="${ringY}" r="${ringRadius}" fill="none" stroke="#ffffff" stroke-width="2.5" />
      <circle cx="${centerX}" cy="${ringY}" r="${ringRadius * 0.85}" fill="none" stroke="${lightSecondary}" stroke-width="3" stroke-opacity="0.6" />

      <!-- Architectural Support Struts to Landscape -->
      <line x1="${centerX - ringRadius * 0.7}" y1="${ringY + ringRadius * 0.7}" x2="${centerX - ringRadius * 0.9}" y2="${horizonY + 110}" stroke="${terrainShadow}" stroke-width="14" stroke-linecap="round" />
      <line x1="${centerX + ringRadius * 0.7}" y1="${ringY + ringRadius * 0.7}" x2="${centerX + ringRadius * 0.9}" y2="${horizonY + 110}" stroke="${terrainShadow}" stroke-width="14" stroke-linecap="round" />
      <line x1="${centerX - ringRadius * 0.7}" y1="${ringY + ringRadius * 0.7}" x2="${centerX - ringRadius * 0.9}" y2="${horizonY + 110}" stroke="${lightPrimary}" stroke-width="2" stroke-opacity="0.7" />
      <line x1="${centerX + ringRadius * 0.7}" y1="${ringY + ringRadius * 0.7}" x2="${centerX + ringRadius * 0.9}" y2="${horizonY + 110}" stroke="${lightSecondary}" stroke-width="2" stroke-opacity="0.7" />
    `;
  } else {
    // Archetype 2: Brutalist Geometric Prism / Pyramid
    const baseW = width * 0.38;
    const prismH = height * 0.34;
    const apexY = horizonY - prismH * 0.75;
    const baseBottomY = horizonY + prismH * 0.25;

    monumentSvg = `
      <!-- Base Shadow Pool -->
      <polygon points="${centerX - baseW * 0.6},${baseBottomY + 10} ${centerX + baseW * 0.6},${baseBottomY + 10} ${centerX + baseW * 0.8},${baseBottomY + 80} ${centerX - baseW * 0.8},${baseBottomY + 80}" fill="#000000" opacity="0.65" />

      <!-- Backlight Corona behind Apex -->
      <circle cx="${centerX}" cy="${apexY}" r="${width * 0.30}" fill="url(#coreBacklight_${seed})" opacity="0.75" filter="url(#softGlow_${seed})" />

      <!-- Left Facet (Light-catching) -->
      <polygon points="${centerX},${apexY} ${centerX - baseW * 0.5},${baseBottomY} ${centerX},${baseBottomY + 15}" fill="url(#prismLit_${seed})" />

      <!-- Right Facet (Deep Shadow) -->
      <polygon points="${centerX},${apexY} ${centerX + baseW * 0.5},${baseBottomY} ${centerX},${baseBottomY + 15}" fill="url(#prismShadow_${seed})" />

      <!-- Center Edge Spine & Luminescent Bevels -->
      <line x1="${centerX}" y1="${apexY}" x2="${centerX}" y2="${baseBottomY + 15}" stroke="${lightAccent}" stroke-width="2.5" filter="url(#glow_${seed})" />
      <line x1="${centerX}" y1="${apexY}" x2="${centerX - baseW * 0.5}" y2="${baseBottomY}" stroke="${lightPrimary}" stroke-width="2" stroke-opacity="0.85" />
      <line x1="${centerX}" y1="${apexY}" x2="${centerX + baseW * 0.5}" y2="${baseBottomY}" stroke="${lightSecondary}" stroke-width="2" stroke-opacity="0.6" />

      <!-- Glowing Apex Beacon / Core -->
      <circle cx="${centerX}" cy="${apexY}" r="7" fill="#ffffff" filter="url(#glow_${seed})" />
    `;
  }

  // Celestial Twilight Sky details (Moon or Dusk Starfield)
  let skyObjects = '';
  const celestialY = height * (0.24 + rnd() * 0.12);
  skyObjects += `
    <!-- Celestial Dusk Orb (Sun/Moon adapted to musical lights) -->
    <circle cx="${centerX}" cy="${celestialY}" r="${width * 0.14}" fill="url(#celestialOrb_${seed})" />
    <circle cx="${centerX}" cy="${celestialY}" r="${width * 0.28}" fill="${lightPrimary}" opacity="0.22" filter="url(#softGlow_${seed})" />
  `;

  // Assemble the Master Standalone SVG
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <defs>
    <!-- Sky Atmospheric Gradient -->
    <linearGradient id="skyGrad_${seed}" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${skyTop}" />
      <stop offset="55%" stop-color="${skyMid}" />
      <stop offset="100%" stop-color="${skyHorizon}" />
    </linearGradient>

    <!-- Scenic Ground Terrain Gradient -->
    <linearGradient id="terrainGrad_${seed}" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${terrainBase}" />
      <stop offset="40%" stop-color="${terrainShadow}" />
      <stop offset="100%" stop-color="#020104" />
    </linearGradient>

    <!-- Horizon Volumetric Light Haze -->
    <radialGradient id="horizonHaze_${seed}" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${lightPrimary}" stop-opacity="0.8" />
      <stop offset="50%" stop-color="${lightSecondary}" stop-opacity="0.3" />
      <stop offset="100%" stop-color="${skyHorizon}" stop-opacity="0" />
    </radialGradient>

    <!-- Celestial Orb Gradient -->
    <linearGradient id="celestialOrb_${seed}" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="40%" stop-color="${lightAccent}" />
      <stop offset="100%" stop-color="${lightPrimary}" />
    </linearGradient>

    <!-- Core Backlight Aura -->
    <radialGradient id="coreBacklight_${seed}" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${glowColor}" stop-opacity="0.75" />
      <stop offset="50%" stop-color="${lightPrimary}" stop-opacity="0.35" />
      <stop offset="100%" stop-color="${skyMid}" stop-opacity="0" />
    </radialGradient>

    <!-- Monolith Left / Lit Gradient -->
    <linearGradient id="monolithLit_${seed}" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${lightPrimary}" stop-opacity="0.3" />
      <stop offset="100%" stop-color="#1b1424" />
    </linearGradient>

    <!-- Monolith Right / Shadow Gradient -->
    <linearGradient id="monolithShadow_${seed}" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#0e0a14" />
      <stop offset="100%" stop-color="#050308" />
    </linearGradient>

    <!-- Prism Gradients -->
    <linearGradient id="prismLit_${seed}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${lightAccent}" stop-opacity="0.5" />
      <stop offset="50%" stop-color="${lightPrimary}" stop-opacity="0.3" />
      <stop offset="100%" stop-color="#0f0c18" />
    </linearGradient>
    <linearGradient id="prismShadow_${seed}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0d0814" />
      <stop offset="100%" stop-color="#040206" />
    </linearGradient>

    <!-- Portal Gradients -->
    <radialGradient id="portalVoid_${seed}" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.9" />
      <stop offset="45%" stop-color="${lightAccent}" stop-opacity="0.5" />
      <stop offset="85%" stop-color="${skyHorizon}" stop-opacity="0.1" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0.8" />
    </radialGradient>
    <radialGradient id="portalReflection_${seed}" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${lightPrimary}" stop-opacity="0.8" />
      <stop offset="60%" stop-color="${lightSecondary}" stop-opacity="0.3" />
      <stop offset="100%" stop-color="${terrainBase}" stop-opacity="0" />
    </radialGradient>

    <!-- Filters -->
    <filter id="glow_${seed}" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="5" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>

    <filter id="softGlow_${seed}" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="28" />
    </filter>
  </defs>

  <!-- 1. Deep Atmospheric Sky -->
  <rect width="${width}" height="${height}" fill="url(#skyGrad_${seed})" />

  <!-- 2. Celestial Light (Moon / Sun / Dusk Star) -->
  ${skyObjects}

  <!-- 3. Distant Mountains & Horizon Silhouette -->
  ${mountainsSvg}

  <!-- 4. Vast Scenic Ground Terrain & Haze -->
  ${groundSvg}

  <!-- 5. Iconic Solitary Central Element in the Landscape (Monolith / Portal / Prism) -->
  ${monumentSvg}

  <!-- 6. Subtle Ground Mist / Volumetric Fog at Monument Base -->
  <ellipse cx="${centerX}" cy="${horizonY + 30}" rx="${width * 0.45}" ry="${height * 0.04}" fill="${lightPrimary}" opacity="0.18" filter="url(#softGlow_${seed})" />
</svg>
`.trim();

  // Convert to Data URL safely in browser & server environments
  let base64 = '';
  if (typeof btoa === 'function') {
    base64 = btoa(unescape(encodeURIComponent(svg)));
  } else if (typeof Buffer !== 'undefined') {
    base64 = Buffer.from(svg).toString('base64');
  } else {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }
  return `data:image/svg+xml;base64,${base64}`;
}
