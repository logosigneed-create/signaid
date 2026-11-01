/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Système de routage déclaratif type React-Router pour Droppaid / Signaid.
 * Fournit <Routes>, <Route>, useParams sans dépendance externe,
 * avec isolation stricte des slugs système et interception de premier niveau.
 */

import React, { createContext, useContext } from 'react';
import { isReservedSlug } from '../constants/reservedRoutes';

export interface RouteParams {
  [key: string]: string | undefined;
}

const RouteParamsContext = createContext<RouteParams>({});

/**
 * Hook pour extraire les paramètres dynamiques d'une route (ex: { slug: 'aaronh' })
 */
export function useParams<T extends RouteParams = RouteParams>(): T {
  return useContext(RouteParamsContext) as T;
}

export interface RouteProps {
  path: string;
  element: React.ReactNode;
}

/**
 * Composant déclaratif de route
 */
export const Route: React.FC<RouteProps> = () => null;

export interface RoutesProps {
  currentPath?: string;
  children: React.ReactNode;
}

/**
 * Composant de sélection de route (<Routes>)
 * Évalue les <Route> enfants par ordre de priorité et monte l'élément correspondant.
 */
export const Routes: React.FC<RoutesProps> = ({ currentPath: propPath, children }) => {
  const currentPath =
    propPath ??
    (typeof window !== 'undefined' ? window.location.pathname : '/');

  // Nettoyage et normalisation du chemin courant (ex: "/aaronh/" -> "/aaronh")
  const pathWithoutQuery = currentPath.split('?')[0].split('#')[0];
  const normalizedPath = '/' + pathWithoutQuery.replace(/^\/+|\/+$/g, '');
  const pathSegments = normalizedPath === '/' ? [] : normalizedPath.split('/').filter(Boolean);

  const routes = React.Children.toArray(children).filter(
    (child): child is React.ReactElement<RouteProps> =>
      React.isValidElement(child) && (child.type === Route || (child.props as any)?.path !== undefined)
  );

  let matchedElement: React.ReactNode = null;
  let matchedParams: RouteParams = {};

  for (const route of routes) {
    const { path: routePattern, element } = route.props;
    if (!routePattern) continue;

    // 1. Route racine exacte
    if (routePattern === '/' && normalizedPath === '/') {
      matchedElement = element;
      matchedParams = {};
      break;
    }

    // 2. Route exacte statique (ex: "/dropper", "/studio", "/ads.txt")
    if (routePattern.toLowerCase() === normalizedPath.toLowerCase()) {
      matchedElement = element;
      matchedParams = {};
      break;
    }

    // 3. Traitement des routes paramétrées (ex: "/hub/:slug", "/:slug")
    const patternSegments = routePattern.split('/').filter(Boolean);

    if (patternSegments.length === pathSegments.length && patternSegments.length > 0) {
      let isMatch = true;
      const extractedParams: RouteParams = {};

      for (let i = 0; i < patternSegments.length; i++) {
        const pSeg = patternSegments[i];
        const uSeg = pathSegments[i];

        if (pSeg.startsWith(':')) {
          const paramName = pSeg.slice(1);
          extractedParams[paramName] = decodeURIComponent(uSeg);
        } else if (pSeg.toLowerCase() !== uSeg.toLowerCase()) {
          isMatch = false;
          break;
        }
      }

      // Règle d'or de sécurité pour les slugs dynamiques :
      // 1. Si la route est de premier niveau et dynamique (ex: "/:slug"), le slug ne doit JAMAIS être un mot réservé !
      if (isMatch && patternSegments.length === 1 && patternSegments[0].startsWith(':')) {
        const singleParamValue = pathSegments[0];
        if (isReservedSlug(singleParamValue)) {
          isMatch = false;
        }
      }

      // 2. Si la route est de type "/:slug/..." (ex: "/:slug/shop"), le premier segment ne doit JAMAIS être un mot réservé !
      if (isMatch && patternSegments.length > 1 && patternSegments[0].startsWith(':')) {
        const firstParamValue = pathSegments[0];
        if (isReservedSlug(firstParamValue)) {
          isMatch = false;
        }
      }

      if (isMatch) {
        matchedElement = element;
        matchedParams = extractedParams;
        break;
      }
    }

    // 4. Route wildcard de secours ("*")
    if (routePattern === '*') {
      matchedElement = element;
      matchedParams = {};
      break;
    }
  }

  return (
    <RouteParamsContext.Provider value={matchedParams}>
      {matchedElement}
    </RouteParamsContext.Provider>
  );
};
