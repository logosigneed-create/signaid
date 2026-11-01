/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * PublicSlugResolver - Résolveur de slug dynamique au premier niveau
 * Alias et ré-export de DynamicSlugResolver pour compatibilité complète.
 */

export {
  DynamicSlugResolver,
  DynamicSlugResolver as PublicSlugResolver,
  DynamicSlugResolver as PublicProfileResolver,
  applyVisualsProtection,
  RESERVED_SLUGS,
} from './DynamicSlugResolver';

export type { DynamicSlugResolverProps as PublicSlugResolverProps } from './DynamicSlugResolver';

import { DynamicSlugResolver } from './DynamicSlugResolver';
export default DynamicSlugResolver;
