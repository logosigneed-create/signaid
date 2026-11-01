/**
 * Calcule dynamiquement la taille de police selon la longueur du texte
 * pour faire entrer l'intégralité du texte sans aucune coupure ni points de suspension ("...").
 *
 * @param text Chaîne de caractères à mesurer
 * @param baseSize Taille de base pour les textes très courts (<= 4 caractères)
 * @param minSize Taille plancher minimale pour éviter que le texte ne devienne illisible
 * @param unit Unité CSS ('cqb' pour Bannière, 'cqi' pour Post/Story/A3)
 */
export function getAutoScaledFontSize(
  text: string | undefined | null,
  baseSize: number,
  minSize?: number,
  unit: 'cqb' | 'cqi' = 'cqb'
): string {
  const str = (text || '').trim();
  if (str.length === 0) return `${baseSize}${unit}`;
  // Gros titre percutant : prise en compte de la plus longue ligne pour le texte multi-lignes
  const lines = str.split('\n');
  const len = lines.reduce((max, line) => Math.max(max, line.trim().length), 0) || str.length;
  if (len <= 7) return `${baseSize}${unit}`;

  const effectiveMin = typeof minSize === 'number' ? Math.min(minSize, baseSize * 0.85) : baseSize * 0.35;
  // Décroissance fluide et optimisée jusqu'à la limite de 25 caractères
  const shrinkFactor = Math.max(0.35, 1 - (len - 7) * 0.035);
  let calculated = Math.max(effectiveMin, baseSize * shrinkFactor);

  // Verrouillage géométrique strict anti-débordement horizontal (Boundary Check X)
  // Largeur maximale garantie à 92% du conteneur (4% de marge de chaque côté)
  if (unit === 'cqi' && len > 0) {
    const maxSafeCqi = 140 / len;
    calculated = Math.min(calculated, maxSafeCqi);
  } else if (unit === 'cqb' && len > 0) {
    const maxSafeCqb = 280 / len;
    calculated = Math.min(calculated, maxSafeCqb);
  }

  return `${calculated.toFixed(2)}${unit}`;
}


