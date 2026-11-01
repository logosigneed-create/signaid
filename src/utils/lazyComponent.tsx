/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Helper de lazy-loading : charge un export nommé à la demande et l'enveloppe
 * dans un <Suspense> local au fallback minimaliste (rien n'est démonté ailleurs).
 */

import React, { lazy, Suspense, ComponentType } from 'react';

export function lazyNamed<T extends ComponentType<any>>(
  loader: () => Promise<Record<string, any>>,
  exportName: string,
  fallback: React.ReactNode = null
): T {
  const LazyComp = lazy(() =>
    loader().then((mod) => ({ default: (mod[exportName] ?? mod.default) as T }))
  );
  const Wrapped = (props: any) => (
    <Suspense fallback={fallback}>
      <LazyComp {...props} />
    </Suspense>
  );
  return Wrapped as unknown as T;
}
