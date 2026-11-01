/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Droppaid.ai - Vue Live Hub Publique (/hub/:slug ou /:slug)
 * Composant de consultation publique (Lecture seule stricte, isInteractive={false})
 */

import React, { useMemo } from 'react';
import { useParams } from '../router/Router';
import { isReservedSlug, sanitizeSlug } from '../constants/reservedRoutes';
import { PublicEventHub } from './PublicEventHub';

export interface LiveHubProps {
  slug?: string;
  shouldPlayIntro?: boolean;
  data?: any;
  initialData?: any;
  isInteractive?: boolean;
}

/**
 * Wrapper de sécurité pour les portails publics d'artistes ou d'événements.
 * Récupère le slug via useParams() ou les props, vérifie l'exclusion des mots réservés
 * et monte le Hub public en lecture seule stricte (sans interface Studio).
 */
export const LiveHubWrapper: React.FC<LiveHubProps> = ({
  slug: propSlug,
  shouldPlayIntro,
  data,
  initialData,
  isInteractive = false,
}) => {
  const params = useParams<{ slug?: string }>();

  // 1. Extraction du slug prioritaire : prop -> useParams -> détection URL de secours
  const rawSlug = useMemo(() => {
    if (propSlug) return propSlug;
    if (params?.slug) return params.slug;
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname.replace(/^\/+|\/+$/g, '');
      const segments = pathname.split('/').filter(Boolean);
      if (segments.length === 0) return '';
      // Si format /hub/:slug ou /e/:slug
      if (['hub', 'e', 'event', 'scan'].includes(segments[0].toLowerCase())) {
        return segments[1] || '';
      }
      // Si format premier niveau /:slug
      return segments[0] || '';
    }
    return '';
  }, [propSlug, params?.slug]);

  const cleanSlug = sanitizeSlug(rawSlug);

  // 2. Exclusion explicite des mots réservés système (studio, dropper, hub, api, assets, etc.)
  const isReserved = isReservedSlug(cleanSlug);

  // 3. Si le slug est réservé ou vide, afficher une vue 404 épurée (sans jamais monter le Studio)
  if (!cleanSlug || isReserved) {
    return (
      <div className="min-h-[100dvh] bg-zinc-950 text-white flex flex-col items-center justify-center p-6 font-mono select-none">
        <div className="flex flex-col items-center gap-4 text-center max-w-sm">
          <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-xl shadow-lg">
            ⚡
          </div>
          <div className="space-y-1.5">
            <p className="text-xs uppercase font-bold tracking-widest text-zinc-200">Portail introuvable</p>
            <p className="text-[11px] text-zinc-500">
              {isReserved
                ? `L'identifiant « ${cleanSlug} » est une route réservée du système.`
                : 'Aucun projet spécifié.'}
            </p>
          </div>
          <a
            href="/"
            className="mt-4 px-4 py-2.5 rounded-xl bg-lime-400 hover:bg-lime-300 text-black font-black font-mono text-xs uppercase tracking-wider transition shadow-lg shadow-lime-400/20 active:scale-95"
          >
            Retour à l'accueil
          </a>
        </div>
      </div>
    );
  }

  // 4. Montée du Hub officiel en lecture seule stricte
  // PublicEventHub recherche le slug dans Firestore (portals, projects, events)
  // et monte FlyerPosterRenderer avec isInteractive={false}.
  return (
    <PublicEventHub
      slug={cleanSlug}
      shouldPlayIntro={shouldPlayIntro}
      initialData={data || initialData}
      isInteractive={isInteractive}
    />
  );
};

export { LiveHubWrapper as LiveHub, PublicEventHub, LiveHubWrapper as default };
export { ArtistProfileView } from '../components/ArtistProfileView';
export * from './PublicEventHub';
