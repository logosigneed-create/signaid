/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Helpers de mise en page légers extraits de StudioComposer afin que App.tsx
 * puisse les utiliser sans embarquer le bundle complet de StudioComposer.
 */

import type { LogoPlacement } from '../types';

// Fonction de calcul des coordonnées adaptées au corps humain (Matrice Gabarit -> Mannequin)
// Standard DTF : Face = pectoral gauche (top: 48%, left: 68%, width: 14%), Dos = omoplates centré (top: 42%, left: 50%, width: 32%)
export const getMannequinPosition = (p?: Partial<LogoPlacement>, isBack: boolean = false) => {
  const scale = p?.scale ?? 1;
  const yOffset = p?.y !== undefined ? (p.y - (isBack ? 42 : 48)) : 0;
  if (isBack) {
    // Vue Dos : centré entre les omoplates (top: 42%, left: 50%, width: 32%)
    return {
      top: `${42 + yOffset}%`,
      left: '50%',
      width: `${32 * scale}%`,
      transform: 'translate(-50%, -50%)',
    };
  } else {
    // Vue Face : pectoral gauche (top: 48%, left: 68%, width: 14%)
    return {
      top: `${48 + yOffset}%`,
      left: '68%',
      width: `${14 * scale}%`,
      transform: 'translate(-50%, -50%) rotate(-1.5deg)',
    };
  }
};

export const FORMAT_LABELS: Record<string, string> = {
  post: 'Post (1:1)',
  story: 'Story (9:16)',
  banner: 'Bannière (16:9)',
  a3: 'Flyer',
  tshirt: 'Stand Merch',
};

export const getFormatAspectRatio = (format: string) => {
  switch (format) {
    case 'story':
      return { aspectRatio: '9 / 16', maxWidth: '100%' };
    case 'a3':
      return { aspectRatio: '4 / 5', maxWidth: '100%' };
    case 'banner':
      return { aspectRatio: '16 / 9', maxWidth: '100%' };
    case 'tshirt':
      return { aspectRatio: '1 / 1', maxWidth: '100%' };
    case 'post':
    default:
      return { aspectRatio: '1 / 1', maxWidth: '100%' };
  }
};
