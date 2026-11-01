/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * DynamicSlugResolver - Résolveur dynamique de routes de premier niveau (/:slug)
 * Capture le paramètre slug via useParams(), exclut strictement les routes système réservées,
 * récupère les données Firestore ('portals' / fallback 'projects') et monte ArtistProfileView
 * avec protection visuelle absolue (priorité aux shootings réels tshirtPreviewImages sans superposer de logo Canvas),
 * sans JAMAIS instancier ni monter StudioComposer sur cette route.
 */

import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from '../router/Router';
import { isReservedSlug, sanitizeSlug } from '../constants/reservedRoutes';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { ArtistProfileView } from './ArtistProfileView';

// Liste d'exclusion stricte des mots réservés système
export const RESERVED_SLUGS = [
  'studio',
  'creer-profil',
  'dropper',
  'admin',
  'audit',
  'hub',
  'api',
  'login',
  'assets',
  'favicon.ico',
  'customizer',
  'merch',
  'shop',
  'composer',
  'generator',
  'atelier',
  'workshop',
  'auth',
  'e',
  'event',
  'events',
  'scan',
  'ads.txt',
  'app-ads.txt',
  'robots.txt',
  'sitemap.xml',
  'manifest.json',
];

const RESERVED_SLUGS_SET = new Set(RESERVED_SLUGS.map((s) => s.toLowerCase()));

/**
 * Règle de protection visuelle :
 * Priorité absolue aux images et shootings textiles réels stockés (tshirtPreviewImages)
 * sans superposer de logo Canvas automatique.
 */
export function applyVisualsProtection(rawData: any, slug: string): any {
  if (!rawData) return null;
  const unwrapped =
    rawData?.input && typeof rawData.input === 'object'
      ? { ...rawData, ...rawData.input }
      : rawData;

  const existingFront =
    unwrapped.tshirtPreviewImages?.front ||
    unwrapped.tshirtPreviewImage ||
    null;
  const existingBack =
    unwrapped.tshirtPreviewImages?.back ||
    null;

  return {
    ...unwrapped,
    slug: unwrapped.slug || slug,
    // Priorité absolue aux shootings réels enregistrés
    tshirtPreviewImages: {
      front: existingFront,
      back: existingBack,
    },
    tshirtPreviewImage: existingFront || unwrapped.tshirtPreviewImage,
    // Verrouillage de protection : pas de superposition de logo canvas automatique sur visuel existant
    preventCanvasLogoOverlay: Boolean(existingFront || existingBack),
  };
}

export interface DynamicSlugResolverProps {
  slug?: string;
  onNavigate?: (path: string) => void;
}

export const DynamicSlugResolver: React.FC<DynamicSlugResolverProps> = ({
  slug: propSlug,
  onNavigate,
}) => {
  const params = useParams<{ slug?: string }>();

  // 1. Capture du paramètre :slug via useParams() ou prop ou fallback URL
  const rawSlug = useMemo(() => {
    if (propSlug) return propSlug;
    if (params?.slug) return params.slug;
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname.replace(/^\/+|\/+$/g, '');
      const segments = pathname.split('/').filter(Boolean);
      return segments[0] || '';
    }
    return '';
  }, [propSlug, params?.slug]);

  const cleanSlug = useMemo(() => sanitizeSlug(rawSlug), [rawSlug]);

  // 2. Vérification de la liste d'exclusion des mots réservés système
  const isReserved = useMemo(() => {
    if (!cleanSlug) return true;
    const lower = cleanSlug.toLowerCase();
    if (RESERVED_SLUGS_SET.has(lower) || RESERVED_SLUGS.includes(lower)) return true;
    return isReservedSlug(cleanSlug);
  }, [cleanSlug]);

  // Si c'est un slug réservé, laisser React Router gérer la route correspondante
  if (isReserved) {
    return null;
  }

  const [profileData, setProfileData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [notFound, setNotFound] = useState<boolean>(false);

  // 3. Récupération des données Firestore (portals/:slug puis fallback projects/:slug)
  useEffect(() => {
    if (!cleanSlug || isReserved) {
      setIsLoading(false);
      setNotFound(true);
      return;
    }

    let isSubscribed = true;
    setIsLoading(true);
    setNotFound(false);

    // Tentative 1 : lecture du document 'portals/:slug'
    const portalRef = doc(db, 'portals', cleanSlug);
    const unsub = onSnapshot(
      portalRef,
      (snap) => {
        if (!isSubscribed) return;
        if (snap.exists()) {
          const protectedData = applyVisualsProtection(snap.data(), cleanSlug);
          setProfileData(protectedData);
          setIsLoading(false);
          setNotFound(false);
        } else {
          // Tentative 2 : fallback sur le document 'projects/:slug'
          const projectRef = doc(db, 'projects', cleanSlug);
          getDoc(projectRef)
            .then((pSnap) => {
              if (!isSubscribed) return;
              if (pSnap.exists()) {
                const protectedData = applyVisualsProtection(pSnap.data(), cleanSlug);
                setProfileData(protectedData);
                setNotFound(false);
              } else {
                // Tentative 3 : secours localStorage éventuel (ex: projet en cours d'édition locale)
                let localFound = false;
                if (typeof window !== 'undefined') {
                  try {
                    const localKey = `signaid_studio_draft_${cleanSlug}`;
                    const rawLocal = localStorage.getItem(localKey);
                    if (rawLocal) {
                      const parsed = JSON.parse(rawLocal);
                      const protectedData = applyVisualsProtection(parsed, cleanSlug);
                      setProfileData(protectedData);
                      setNotFound(false);
                      localFound = true;
                    }
                  } catch {
                    // pass
                  }
                }
                if (!localFound) {
                  setNotFound(true);
                }
              }
              setIsLoading(false);
            })
            .catch(() => {
              if (!isSubscribed) return;
              setNotFound(true);
              setIsLoading(false);
            });
        }
      },
      (err) => {
        console.warn(`[DynamicSlugResolver] Erreur écoute portals/${cleanSlug}:`, err);
        // Fallback projects en cas d'erreur
        const projectRef = doc(db, 'projects', cleanSlug);
        getDoc(projectRef)
          .then((pSnap) => {
            if (!isSubscribed) return;
            if (pSnap.exists()) {
              const protectedData = applyVisualsProtection(pSnap.data(), cleanSlug);
              setProfileData(protectedData);
              setNotFound(false);
            } else {
              setNotFound(true);
            }
            setIsLoading(false);
          })
          .catch(() => {
            if (!isSubscribed) return;
            setNotFound(true);
            setIsLoading(false);
          });
      }
    );

    return () => {
      isSubscribed = false;
      unsub();
    };
  }, [cleanSlug, isReserved]);

  // Si le document n'existe pas : Afficher une vue 404 épurée sans déclencher le Studio
  if (notFound) {
    return (
      <div className="min-h-[100dvh] bg-zinc-950 text-white flex flex-col items-center justify-center p-6 font-mono select-none">
        <div className="flex flex-col items-center gap-4 text-center max-w-sm">
          <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-xl shadow-lg">
            ⚡
          </div>
          <div className="space-y-1.5">
            <p className="text-xs uppercase font-bold tracking-widest text-zinc-200">Profil introuvable</p>
            <p className="text-[11px] text-zinc-500">
              Aucun profil public trouvé pour l'identifiant « {cleanSlug} ».
            </p>
          </div>
          <a
            href="/"
            onClick={(e) => {
              if (onNavigate) {
                e.preventDefault();
                onNavigate('/');
              }
            }}
            className="mt-4 px-4 py-2.5 rounded-xl bg-lime-400 hover:bg-lime-300 text-black font-black font-mono text-xs uppercase tracking-wider transition shadow-lg shadow-lime-400/20 active:scale-95"
          >
            Retour à l'accueil
          </a>
        </div>
      </div>
    );
  }

  // Pendant le chargement des données depuis Firestore
  if (isLoading && !profileData) {
    return (
      <div className="min-h-[100dvh] bg-zinc-950 text-white flex flex-col items-center justify-center p-6 font-mono select-none">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="relative flex items-center justify-center">
            <div className="w-10 h-10 rounded-full border-2 border-zinc-800 border-t-lime-400 animate-spin" />
            <span className="absolute w-2 h-2 rounded-full bg-lime-400 animate-ping" />
          </div>
          <div className="space-y-1">
            <p className="text-xs uppercase font-bold tracking-widest text-zinc-300">Synchronisation du profil...</p>
            <p className="text-[10px] text-zinc-600">Chargement des visuels et du hub de l'artiste ({cleanSlug})</p>
          </div>
        </div>
      </div>
    );
  }

  // 4. Monter STRICTEMENT ArtistProfileView avec les données Firestore en props
  // INTERDICTION STRICTE de monter StudioComposer sur cette route
  return (
    <ArtistProfileView
      slug={cleanSlug}
      data={profileData}
      isInteractive={false}
    />
  );
};

export default DynamicSlugResolver;
