/**
 * Studio Vector Logo Engine - Refonte & Vectorisation HD (+15€)
 */

export function generateRefonteLogoSvg(
  djName: string,
  _style?: string,
  paletteColor = '#ff6b00'
): string {
  const cleanName = (djName || 'KRONOS').toUpperCase().slice(0, 16);
  const initials = cleanName
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 3) || 'KR';

  return `
<svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" style="background-color: transparent;">
  <defs>
    <linearGradient id="studioRefonteGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="50%" stop-color="${paletteColor}" />
      <stop offset="100%" stop-color="#38bdf8" />
    </linearGradient>
  </defs>
  <rect x="15" y="15" width="370" height="370" rx="32" fill="#0b0c10" stroke="url(#studioRefonteGrad)" stroke-width="4" />
  <circle cx="200" cy="180" r="105" fill="none" stroke="#27272a" stroke-width="3" />
  <circle cx="200" cy="180" r="95" fill="none" stroke="${paletteColor}" stroke-width="2.5" stroke-dasharray="8 6" />
  
  <!-- Outer Crosshairs -->
  <line x1="200" y1="50" x2="200" y2="80" stroke="#ffffff" stroke-width="3" />
  <line x1="200" y1="280" x2="200" y2="310" stroke="#ffffff" stroke-width="3" />
  <line x1="70" y1="180" x2="100" y2="180" stroke="#ffffff" stroke-width="3" />
  <line x1="300" y1="180" x2="330" y2="180" stroke="#ffffff" stroke-width="3" />

  <!-- Inner Monogram Crest -->
  <polygon points="200,95 285,245 115,245" fill="none" stroke="url(#studioRefonteGrad)" stroke-width="7" stroke-linejoin="round" />
  <circle cx="200" cy="180" r="30" fill="#090a0f" stroke="#ffffff" stroke-width="3" />
  <text x="200" y="190" fill="#ffffff" font-size="28" font-weight="900" font-family="'Syne', sans-serif" text-anchor="middle" letter-spacing="2">
    ${initials}
  </text>

  <!-- DJ Name typography -->
  <text x="200" y="315" fill="#ffffff" font-size="22" font-weight="900" font-family="'Syne', sans-serif" letter-spacing="4" text-anchor="middle">
    ${cleanName}
  </text>
  <text x="200" y="342" fill="${paletteColor}" font-size="10" font-weight="700" font-family="'JetBrains Mono', monospace" letter-spacing="5" text-anchor="middle">
    STUDIO VECTOR // 300 DPI DTF
  </text>
</svg>`.trim();
}
