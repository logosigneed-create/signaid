/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Signaid - PublicProfileResolver (/:slug)
 * Garde d'étanchéité et résolveur de profil public / vitrine artiste racine.
 * 
 * RÈGLES DE SÉCURITÉ & LOGIQUE STRICTE :
 * 1. Bloquer immédiatement toute interception si slug est un mot réservé :
 *    ['studio', 'customizer', 'admin', 'audit', 'dropper', 'hub', 'shop', 'api', 'login', 'assets', 'favicon.ico']
 * 2. Interroger Firestore (portals puis projects via le slug).
 * 3. Monter ArtistProfileView (vitrine publique, linktree & merch).
 * 4. RÈGLE D'OR VISUELLE : Priorité absolue aux shootings réels stockés (tshirtPreviewImages)
 *    sans superposer de logo automatique ni écraser les images validées.
 * 5. INTERDICTION STRICTE D'INSTANCIER StudioComposer SUR CETTE VUE.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Globe,
  Music,
  ShoppingBag,
  Ticket,
  Calendar,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Loader2,
  Shirt,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

const Instagram = (props: any) => (
  <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useParams } from '../router/Router';
import { isReservedSlug, sanitizeSlug } from '../constants/reservedRoutes';
import { resolveGarmentTemplateSrc } from '../utils/textileMockupUtils';

export interface PublicProfileResolverProps {
  slug?: string;
  onNavigate?: (path: string) => void;
}

export const PublicProfileResolver: React.FC<PublicProfileResolverProps> = ({
  slug: propSlug,
  onNavigate,
}) => {
  const params = useParams<{ slug?: string }>();
  const rawSlug = propSlug || params?.slug || '';
  const cleanSlug = sanitizeSlug(rawSlug);

  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeSide, setActiveSide] = useState<'front' | 'back'>('front');

  const navigateTo = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    } else if (typeof window !== 'undefined') {
      window.history.pushState({}, '', path);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  // 1. GARDE DE SÉCURITÉ : Blocage immédiat de tout mot réservé
  const isReserved = useMemo(() => isReservedSlug(cleanSlug), [cleanSlug]);

  useEffect(() => {
    if (!cleanSlug || isReserved) {
      setLoading(false);
      setNotFound(true);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setNotFound(false);

    const resolveProfile = async () => {
      try {
        // Interrogation Firestore : 1) portals, puis 2) projects
        let snapshot = await getDoc(doc(db, 'portals', cleanSlug));
        if (!snapshot.exists()) {
          snapshot = await getDoc(doc(db, 'projects', cleanSlug));
        }

        if (snapshot.exists() && isMounted) {
          setProfileData(snapshot.data());
        } else if (isMounted) {
          // Profil non trouvé dans Firestore
          setNotFound(true);
        }
      } catch (err) {
        console.error('[PublicProfileResolver] Erreur requête Firestore:', err);
        if (isMounted) setNotFound(true);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    resolveProfile();
    return () => {
      isMounted = false;
    };
  }, [cleanSlug, isReserved]);

  // Si le mot est réservé : afficher la page 404 épurée sans jamais monter le Studio
  if (!cleanSlug || isReserved) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-6 font-mono select-none">
        <div className="flex flex-col items-center gap-4 text-center max-w-sm">
          <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-xl shadow-lg">
            ⚡
          </div>
          <div className="space-y-1.5">
            <p className="text-xs uppercase font-bold tracking-widest text-zinc-200">Route Réservée</p>
            <p className="text-[11px] text-zinc-500">
              L'identifiant « {cleanSlug || 'inconnu'} » est un segment réservé du système Signaid.
            </p>
          </div>
          <button
            onClick={() => navigateTo('/')}
            className="mt-4 px-4 py-2.5 rounded-xl bg-lime-400 hover:bg-lime-300 text-black font-black font-mono text-xs uppercase tracking-wider transition shadow-lg shadow-lime-400/20 active:scale-95 cursor-pointer"
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  // Chargement en cours
  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center font-mono">
        <Loader2 className="w-6 h-6 animate-spin text-lime-400 mb-3" />
        <p className="text-xs text-zinc-500 uppercase tracking-widest">Résolution du profil /{cleanSlug}...</p>
      </div>
    );
  }

  // Profil introuvable : 404 propre sans Studio
  if (notFound || !profileData) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-6 font-mono select-none">
        <div className="flex flex-col items-center gap-4 text-center max-w-sm">
          <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-xl shadow-lg">
            ⚡
          </div>
          <div className="space-y-1.5">
            <p className="text-xs uppercase font-bold tracking-widest text-zinc-200">Vitrine Introuvable</p>
            <p className="text-[11px] text-zinc-500">
              Aucun profil ou événement actif n'est associé à l'identifiant « {cleanSlug} ».
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-2 mt-4">
            <button
              onClick={() => navigateTo(`/studio/${cleanSlug}`)}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-lime-400 hover:bg-lime-300 text-black font-black font-mono text-xs uppercase tracking-wider transition shadow-lg shadow-lime-400/20 active:scale-95 cursor-pointer"
            >
              Créer avec le Studio
            </button>
            <button
              onClick={() => navigateTo('/')}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-mono text-xs font-bold transition cursor-pointer"
            >
              Accueil
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ARTIST PROFILE VIEW OFFICIELLE
  const displayName = profileData.eventName || profileData.companyName || cleanSlug.toUpperCase();
  const avatar = profileData.djPhoto || profileData.logoImage;
  const punchline = profileData.punchline || profileData.presentation || 'Portail & Merch Officiel';
  const garmentColor = profileData.tshirtColor || 'black';

  // RÈGLE D'OR VISUELLE : Priorité absolue aux visuels et shootings réels stockés (tshirtPreviewImages)
  // sans superposer de logo automatique ni écraser les images validées !
  const realShootingFront = profileData.tshirtPreviewImages?.front;
  const realShootingBack = profileData.tshirtPreviewImages?.back;
  const activeShooting = activeSide === 'back' ? realShootingBack : realShootingFront;

  const fallbackTemplate = resolveGarmentTemplateSrc('tshirt', garmentColor, activeSide);
  const fallbackLogo = activeSide === 'back'
    ? (profileData.tshirtBackCustomLogo || profileData.tshirtCustomLogo || profileData.logoImage)
    : (profileData.tshirtCustomLogo || profileData.logoImage);

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans flex flex-col selection:bg-lime-400 selection:text-black">
      {/* Top Banner / Cover */}
      <div className="relative h-44 sm:h-56 w-full bg-gradient-to-b from-zinc-850 to-zinc-950 overflow-hidden border-b border-zinc-850">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(163,230,53,0.15),transparent_70%)]" />
        <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-mono text-zinc-300 font-bold uppercase">
            SIGNAID • VITRINE OFFICIELLE
          </span>
        </div>
      </div>

      {/* Main Profile Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 -mt-16 sm:-mt-20 pb-16 relative z-10 space-y-8">
        {/* Header Avatar & Identity */}
        <div className="flex flex-col items-center text-center">
          <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-zinc-900 border-4 border-zinc-950 overflow-hidden shadow-2xl flex items-center justify-center relative">
            {avatar ? (
              <img src={avatar} alt={displayName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center font-mono font-black text-3xl text-lime-400 bg-zinc-900">
                {cleanSlug.slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>

          <div className="mt-4 space-y-1">
            <div className="flex items-center justify-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight">{displayName}</h1>
              <CheckCircle2 className="w-5 h-5 text-lime-400 shrink-0" />
            </div>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto">{punchline}</p>
          </div>

          {/* Quick Hub Action Bar */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <button
              onClick={() => navigateTo(`/hub/${cleanSlug}`)}
              className="px-4 py-2 rounded-xl bg-lime-400 hover:bg-lime-300 text-black font-black font-mono text-xs uppercase tracking-wider transition shadow-lg shadow-lime-400/20 active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Voir Affiche &amp; SmartLink</span>
            </button>

            <button
              onClick={() => navigateTo(`/${cleanSlug}/shop`)}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold font-mono text-xs uppercase tracking-wider transition shadow-lg shadow-purple-600/20 active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Boutique Merch (/{cleanSlug}/shop)</span>
            </button>
          </div>
        </div>

        {/* SECTION MERCH TEXTILE OFFICIEL : Respect strict de la RÈGLE D'OR VISUELLE */}
        <section className="p-6 rounded-3xl bg-zinc-900/70 border border-zinc-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800/80 pb-3">
            <div>
              <span className="text-[10px] font-mono uppercase font-bold text-lime-400">Merchandising Officiel</span>
              <h2 className="text-lg font-bold uppercase tracking-tight">Collection Textile en Ligne</h2>
            </div>

            <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800 text-xs font-mono self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setActiveSide('front')}
                className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                  activeSide === 'front' ? 'bg-lime-400 text-black font-black' : 'text-zinc-400'
                }`}
              >
                Face
              </button>
              <button
                type="button"
                onClick={() => setActiveSide('back')}
                className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                  activeSide === 'back' ? 'bg-lime-400 text-black font-black' : 'text-zinc-400'
                }`}
              >
                Dos
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            {/* Visualisation : priorité absolue aux shootings réels sans écrasement de logo */}
            <div className="md:col-span-6 flex justify-center">
              <div className="relative w-full max-w-xs aspect-[4/5] rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-950 flex items-center justify-center shadow-xl">
                {activeShooting ? (
                  <img
                    src={activeShooting}
                    alt={`${displayName} Merch ${activeSide}`}
                    className="w-full h-full object-cover select-none"
                    draggable={false}
                  />
                ) : (
                  <div className="relative w-full h-full flex items-center justify-center p-6 select-none">
                    <img
                      src={fallbackTemplate}
                      alt="Template vêtement"
                      className="max-h-full max-w-full object-contain filter drop-shadow-xl"
                      draggable={false}
                    />
                    {fallbackLogo && (
                      <div
                        className="absolute pointer-events-none"
                        style={{
                          left: activeSide === 'back' ? '50%' : '65%',
                          top: activeSide === 'back' ? '40%' : '35%',
                          width: activeSide === 'back' ? '30%' : '20%',
                          transform: 'translate(-50%, -50%)',
                        }}
                      >
                        <img src={fallbackLogo} alt="Logo" className="w-full h-auto object-contain" />
                      </div>
                    )}
                  </div>
                )}

                {activeShooting && (
                  <div className="absolute bottom-3 left-3 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md border border-lime-400/30 text-[9px] font-mono text-lime-400 font-bold">
                    SHOOTING RÉEL
                  </div>
                )}
              </div>
            </div>

            {/* Fiche produit & Action */}
            <div className="md:col-span-6 space-y-4">
              <div>
                <h3 className="text-xl font-bold uppercase">{displayName} Streetwear Tee</h3>
                <p className="text-lg font-mono font-black text-lime-400 mt-1">39,00 €</p>
                <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                  Pièce collector en coton biologique 240g/m². Impression directe en atelier DTF pour une longévité maximale.
                </p>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => navigateTo(`/${cleanSlug}/shop`)}
                  className="w-full py-3 rounded-xl bg-lime-400 hover:bg-lime-300 text-black font-black font-mono text-xs uppercase tracking-wider transition shadow-lg shadow-lime-400/20 active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Commander sur la Boutique Officielle</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Linktree / Réseaux et Billetterie */}
        <section className="space-y-3">
          {profileData.artistSocialUrl && (
            <a
              href={profileData.artistSocialUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-4 rounded-2xl bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <Instagram className="w-5 h-5 text-pink-400" />
                <span className="text-xs font-mono font-bold text-zinc-200">Suivre sur Instagram</span>
              </div>
              <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:translate-x-1 transition-transform" />
            </a>
          )}

          {profileData.artistUrl && (
            <a
              href={profileData.artistUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-4 rounded-2xl bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <Globe className="w-5 h-5 text-cyan-400" />
                <span className="text-xs font-mono font-bold text-zinc-200">Site Web &amp; Actualités</span>
              </div>
              <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:translate-x-1 transition-transform" />
            </a>
          )}

          {profileData.venueMapsUrl && (
            <a
              href={profileData.venueMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-4 rounded-2xl bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <Ticket className="w-5 h-5 text-lime-400" />
                <span className="text-xs font-mono font-bold text-zinc-200">
                  {profileData.venue ? `Lieu : ${profileData.venue}` : 'Localisation GPS'}
                </span>
              </div>
              <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:translate-x-1 transition-transform" />
            </a>
          )}
        </section>
      </main>
    </div>
  );
};

export default PublicProfileResolver;
