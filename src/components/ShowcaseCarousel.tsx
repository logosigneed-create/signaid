import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';

export interface ShowcaseProfile {
  slug: string;
  name: string;
  badge: string;
  category?: string;
  mockup?: string;
  desc: string;
  accentColor?: string;
  demoUrl?: string;
}

export interface ShowcaseCarouselProps {
  profiles?: ShowcaseProfile[];
  title?: string;
  subtitle?: string;
  isLightMode?: boolean;
  className?: string;
  showIndicators?: boolean;
}

export const DEFAULT_SHOWCASE_PROFILES: ShowcaseProfile[] = [
  {
    slug: 'lephoenix',
    name: 'Le Phoenix',
    badge: '🔥 Bar & Club Exclusif',
    category: 'Nightlife & Événements',
    mockup: '/assets/previews/thementalist_mockup.webp',
    desc: 'Vitrine immersive, module de réservation VIP et capsule textile officielle en édition limitée.',
    accentColor: '#ff4400',
    demoUrl: '/lephoenix',
  },
  {
    slug: 'djdfazz',
    name: 'DJ D-FAZZ',
    badge: '🎛️ Artiste & Producteur Musical',
    category: 'Musique & Booking',
    mockup: '/assets/previews/djdfazz_mockup.webp',
    desc: 'Hub interactif tout-en-un, écoute de sets et boutique de merchandising 100% automatisée sans stock.',
    accentColor: '#ff3366',
    demoUrl: '/djdfazz',
  },
  {
    slug: 'aaronh',
    name: 'Aaron H',
    badge: '🎧 Studio Créatif & Label',
    category: 'Création & Audio',
    mockup: '/assets/previews/aaronh_mockup.webp',
    desc: 'Vitrine officielle et merchandising textile exclusif prêt-à-porter expédié à la demande sous 48h.',
    accentColor: '#38bdf8',
    demoUrl: '/aaronh',
  },
  {
    slug: 'thementalist',
    name: 'The Mentalist',
    badge: '✨ Événementiel & Show VIP',
    category: 'Spectacle & Événement',
    mockup: '/assets/previews/thementalist_mockup.webp',
    desc: 'Expérience immersive pour événements avec module de réservation et boutique textile dédiée.',
    accentColor: '#a855f7',
    demoUrl: '/thementalist',
  },
  {
    slug: 'dokiin',
    name: 'D OKIIN',
    badge: '🚀 Marque & Créateur Indépendant',
    category: 'Streetwear & Lifestyle',
    mockup: '/assets/previews/dokiin_mockup.webp',
    desc: 'Hub tout-en-un optimisé avec pictogrammes réseaux dynamiques et boutique textile intégrée.',
    accentColor: '#10b981',
    demoUrl: '/dokiin',
  },
];

/**
 * Carte Mockup Profil Individuelle :
 * - Largeur fixe 280px (snap-always snap-center).
 * - Carte centrale active : 100% visible avec nom, description et bouton direct "Voir la démo en direct →".
 * - Cartes latérales : 60% d'opacité, texte masqué, clic interactif pour centrer.
 */
export function ShowcaseCard({
  profile,
  isActive = true,
  onCardClick,
  isLightMode = false,
}: {
  profile: ShowcaseProfile;
  isActive?: boolean;
  onCardClick?: () => void;
  isLightMode?: boolean;
}) {
  const [imgError, setImgError] = useState(false);
  const accent = profile.accentColor || '#ff3366';

  return (
    <article
      data-carousel-item
      onClick={onCardClick}
      className={`shrink-0 snap-always snap-center w-[280px] min-w-[280px] max-w-[280px] flex flex-col rounded-2xl overflow-hidden transition-all duration-300 border select-none group ${
        isActive
          ? 'scale-100 opacity-100 shadow-2xl'
          : 'scale-95 opacity-60 cursor-pointer hover:opacity-85'
      } ${
        isLightMode
          ? 'bg-white border-slate-200/90'
          : 'bg-[#0f0f12] border-zinc-800/80 shadow-black/60'
      }`}
      style={{
        scrollSnapStop: 'always',
        boxShadow: isLightMode
          ? isActive ? '0 16px 36px -4px rgba(0, 0, 0, 0.15)' : '0 4px 12px -2px rgba(0, 0, 0, 0.05)'
          : isActive ? '0 16px 40px -4px rgba(0, 0, 0, 0.85)' : '0 6px 16px -4px rgba(0, 0, 0, 0.5)'
      }}
    >
      {/* CADRE MOCKUP SMARTPHONE AVEC RATIO VERTICAL ÉLÉGANT */}
      <div 
        className={`relative w-full h-[280px] sm:h-[300px] flex items-center justify-center overflow-hidden transition-colors ${
          isLightMode ? 'bg-slate-100/90' : 'bg-[#151518]'
        }`}
      >
        {/* BADGE OFFICIEL DU PROFIL */}
        <div 
          className="absolute top-3 left-3 z-10 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider text-white shadow-md backdrop-blur-md"
          style={{ backgroundColor: accent }}
        >
          {profile.badge}
        </div>

        {/* IMAGE MOCKUP / CAPTURE D'ÉCRAN SMARTPHONE */}
        <div className="relative w-full h-full flex items-center justify-center p-3">
          {!imgError && profile.mockup ? (
            <img
              src={profile.mockup}
              alt={`Aperçu vitrine ${profile.name}`}
              loading="lazy"
              decoding="async"
              onError={() => setImgError(true)}
              className="w-full h-full object-contain object-center transition-transform duration-300 group-hover:scale-105 drop-shadow-[0_10px_20px_rgba(0,0,0,0.6)]"
            />
          ) : (
            <div className={`w-full h-full rounded-xl border flex flex-col items-center justify-center p-4 text-center ${
              isLightMode ? 'bg-white border-slate-200 text-slate-800' : 'bg-zinc-900 border-white/10 text-white'
            }`}>
              <span className="text-3xl mb-2">📱</span>
              <span className="text-xs font-black uppercase tracking-wider">{profile.name}</span>
              <span className="text-[10px] text-zinc-400 mt-1">{profile.category || 'Vitrine Officielle'}</span>
            </div>
          )}
        </div>
      </div>

      {/* INFORMATIONS DU PROFIL & BOUTON D'ACTION (ACTIFS SUR CARTE CENTRALE) */}
      <div className="p-4 flex flex-col flex-1 justify-between gap-3">
        <div>
          <div className="flex items-center justify-between gap-2">
            <h3 
              className={`font-black text-sm tracking-tight truncate ${
                isLightMode ? 'text-slate-900' : 'text-white'
              }`}
              title={profile.name}
            >
              {profile.name}
            </h3>
            {profile.category && (
              <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0 ${
                isLightMode ? 'bg-slate-100 text-slate-500' : 'bg-white/5 text-zinc-400'
              }`}>
                {profile.category}
              </span>
            )}
          </div>

          <p className={`text-xs mt-1.5 line-clamp-2 transition-opacity duration-300 leading-relaxed ${
            isActive ? 'opacity-100' : 'opacity-0'
          } ${
            isLightMode ? 'text-slate-500' : 'text-zinc-400'
          }`}>
            {profile.desc}
          </p>
        </div>

        {/* BOUTON D'ACTION DIRECT : VOIR LA DÉMO */}
        <div className={`transition-opacity duration-300 ${
          isActive ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}>
          <Link
            to={profile.demoUrl || `/${profile.slug}`}
            className={`w-full py-2.5 px-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all duration-150 flex items-center justify-center gap-2 active:scale-95 shadow-sm ${
              isLightMode
                ? 'bg-slate-900 text-white hover:bg-slate-800'
                : 'bg-white text-slate-950 hover:bg-zinc-100'
            }`}
            aria-label={`Voir la démo en direct de ${profile.name}`}
          >
            <span>Voir la démo en direct</span>
            <span className="text-sm">➔</span>
          </Link>
        </div>
      </div>
    </article>
  );
}

/**
 * Composant de Carrousel de Vitrines / Preuves Sociales Cover Flow :
 * - Architecture Cover Flow répliquée (1 carte centrale active + 2 demi-cartes latérales).
 * - Clic interactif sur carte latérale pour centrer immédiatement.
 * - Boucle infinie fluide et commandes flèches synchronisées.
 */
export default function ShowcaseCarousel({
  profiles = DEFAULT_SHOWCASE_PROFILES,
  title = "Vitrines & Profils Officiels",
  subtitle = "Découvrez des vitrines réelles déployées et monétisées sans stock",
  isLightMode = false,
  className = '',
  showIndicators = true,
}: ShowcaseCarouselProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isJumpingRef = useRef<boolean>(false);
  const snapLockTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const itemCount = profiles.length;

  const [activeVirtualIndex, setActiveVirtualIndex] = useState<number>(itemCount);
  const [activeIndex, setActiveIndex] = useState<number>(0);

  // Duplication virtuelle pour boucle infinie : 3 ensembles de cartes (gauche, milieu, droite)
  const repeatCount = useMemo(() => {
    if (itemCount <= 1) return 1;
    return 3;
  }, [itemCount]);

  const virtualItems = useMemo(() => {
    if (itemCount === 0) return [];
    if (itemCount === 1) {
      return [{ item: profiles[0], virtualKey: `single-${profiles[0].slug}`, originalIndex: 0 }];
    }
    const list = [];
    for (let r = 0; r < repeatCount; r++) {
      for (let i = 0; i < itemCount; i++) {
        list.push({
          item: profiles[i],
          virtualKey: `showcase-rep-${r}-${profiles[i].slug}-${i}`,
          originalIndex: i,
        });
      }
    }
    return list;
  }, [profiles, itemCount, repeatCount]);

  // Initialisation du scroll au centre exact (premier élément de l'ensemble central)
  const initScrollPosition = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el || itemCount <= 1) return;

    const cards = el.querySelectorAll('[data-carousel-item]');
    const middleIndex = itemCount; // premier élément du 2ème ensemble
    if (cards[middleIndex]) {
      const targetCard = cards[middleIndex] as HTMLElement;
      const targetScroll = targetCard.offsetLeft - (el.clientWidth - targetCard.clientWidth) / 2;
      el.style.scrollBehavior = 'auto';
      el.scrollLeft = targetScroll;
      el.style.scrollBehavior = '';
      setActiveVirtualIndex(middleIndex);
      setActiveIndex(0);
    }
  }, [itemCount]);

  // Détection robuste et infaillible de la carte active la plus proche du centre exact
  const updateActiveCard = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container || isJumpingRef.current || itemCount === 0) return;

    const containerRect = container.getBoundingClientRect();
    const containerCenter = containerRect.left + containerRect.width / 2;
    const cards = Array.from(container.querySelectorAll('[data-carousel-item]')) as HTMLElement[];
    if (!cards.length) return;

    let closestIndex = 0;
    let minDistance = Infinity;

    cards.forEach((card, index) => {
      const cardRect = card.getBoundingClientRect();
      const cardCenter = cardRect.left + cardRect.width / 2;
      const distance = Math.abs(containerCenter - cardCenter);

      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = index;
      }
    });

    setActiveVirtualIndex(closestIndex);
    setActiveIndex(closestIndex % itemCount);

    // Recentrage silencieux si l'utilisateur atteint le jeu de cartes de gauche (Set 0) ou droite (Set 2)
    if (itemCount > 1) {
      const firstSetCard = cards[0];
      const secondSetCard = cards[itemCount];
      if (firstSetCard && secondSetCard) {
        const singleSetWidth = secondSetCard.offsetLeft - firstSetCard.offsetLeft;
        if (singleSetWidth > 0) {
          if (closestIndex < itemCount) {
            isJumpingRef.current = true;
            container.style.scrollBehavior = 'auto';
            container.style.scrollSnapType = 'none';
            container.scrollLeft += singleSetWidth;
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                container.style.scrollBehavior = '';
                container.style.scrollSnapType = '';
                isJumpingRef.current = false;
              });
            });
          } else if (closestIndex >= 2 * itemCount) {
            isJumpingRef.current = true;
            container.style.scrollBehavior = 'auto';
            container.style.scrollSnapType = 'none';
            container.scrollLeft -= singleSetWidth;
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                container.style.scrollBehavior = '';
                container.style.scrollSnapType = '';
                isJumpingRef.current = false;
              });
            });
          }
        }
      }
    }
  }, [itemCount]);

  // Snap Lock automatique : réalignement automatique vers le centre si le scroll s'est arrêté avec un léger décalage
  const autoSnapToActive = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container || isJumpingRef.current) return;

    const containerRect = container.getBoundingClientRect();
    const containerCenter = containerRect.left + containerRect.width / 2;
    const cards = Array.from(container.querySelectorAll('[data-carousel-item]')) as HTMLElement[];
    if (!cards.length) return;

    let closestIndex = 0;
    let minDistance = Infinity;

    cards.forEach((card, index) => {
      const cardRect = card.getBoundingClientRect();
      const cardCenter = cardRect.left + cardRect.width / 2;
      const distance = Math.abs(containerCenter - cardCenter);

      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = index;
      }
    });

    if (minDistance > 3 && cards[closestIndex]) {
      const targetCard = cards[closestIndex];
      const targetScroll = targetCard.offsetLeft - (container.clientWidth - targetCard.clientWidth) / 2;
      container.scrollTo({
        left: targetScroll,
        behavior: 'smooth',
      });
    }
  }, []);

  const handleScroll = useCallback(() => {
    updateActiveCard();

    if (snapLockTimeoutRef.current) {
      clearTimeout(snapLockTimeoutRef.current);
    }
    snapLockTimeoutRef.current = setTimeout(() => {
      autoSnapToActive();
    }, 100);
  }, [updateActiveCard, autoSnapToActive]);

  useEffect(() => {
    initScrollPosition();
    const timer = setTimeout(initScrollPosition, 60);
    const handleResize = () => {
      initScrollPosition();
      updateActiveCard();
    };
    window.addEventListener('resize', handleResize, { passive: true });

    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scrollend', autoSnapToActive, { passive: true });
    }

    return () => {
      clearTimeout(timer);
      if (snapLockTimeoutRef.current) clearTimeout(snapLockTimeoutRef.current);
      window.removeEventListener('resize', handleResize);
      if (container) {
        container.removeEventListener('scrollend', autoSnapToActive);
      }
    };
  }, [initScrollPosition, updateActiveCard, autoSnapToActive]);

  // Clic interactif sur une carte : la centrer immédiatement
  const handleCardClick = (virtualIndex: number, profile: ShowcaseProfile) => {
    if (virtualIndex === activeVirtualIndex) return;

    const cardElements = scrollContainerRef.current?.querySelectorAll('[data-carousel-item]');
    if (cardElements && cardElements[virtualIndex]) {
      const targetCard = cardElements[virtualIndex] as HTMLElement;
      const el = scrollContainerRef.current;
      if (el) {
        const targetScroll = targetCard.offsetLeft - (el.clientWidth - targetCard.clientWidth) / 2;
        el.scrollTo({
          left: targetScroll,
          behavior: 'smooth',
        });
      }
    }
  };

  // Pas de Défilement des Flèches (< et >) calibré sur 1 carte + gap (280px + 16px = 296px)
  const handleScrollStep = (direction: 'left' | 'right') => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const firstCard = el.querySelector('[data-carousel-item]') as HTMLElement;
    const step = firstCard ? firstCard.offsetWidth + 16 : 296;

    el.scrollBy({
      left: direction === 'right' ? step : -step,
      behavior: 'smooth',
    });
  };

  // Scroll direct vers un index spécifique via les dots
  const scrollToIndex = (originalIdx: number) => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const cards = el.querySelectorAll('[data-carousel-item]');
    const targetVirtualIndex = itemCount > 1 ? itemCount + originalIdx : originalIdx;

    if (cards[targetVirtualIndex]) {
      const targetCard = cards[targetVirtualIndex] as HTMLElement;
      const targetScroll = targetCard.offsetLeft - (el.clientWidth - targetCard.clientWidth) / 2;
      el.scrollTo({
        left: targetScroll,
        behavior: 'smooth',
      });
    }
  };

  if (!profiles || profiles.length === 0) {
    return null;
  }

  return (
    <section 
      className={`w-full max-w-[560px] mx-auto overflow-hidden relative px-4 flex flex-col items-center my-6 select-none ${className}`}
      aria-label={title}
    >
      {/* EN-TÊTE DU CARROUSEL : TITRE, COMPTEUR & ACTIONS */}
      <div className="w-full flex items-center justify-between gap-3 mb-3.5">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <h2 
              className={`text-sm sm:text-base font-black uppercase tracking-wider flex items-center gap-2 ${
                isLightMode ? 'text-slate-900' : 'text-white'
              }`}
            >
              <span>{title}</span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400">
                {itemCount}
              </span>
            </h2>
          </div>
          {subtitle && (
            <p className={`text-xs mt-0.5 ${isLightMode ? 'text-slate-500' : 'text-zinc-400'}`}>
              {subtitle}
            </p>
          )}
        </div>

        {/* FLÈCHES DE NAVIGATION DESKTOP & MOBILES */}
        <div className="flex items-center gap-1.5 ml-1">
          <button
            type="button"
            onClick={() => handleScrollStep('left')}
            className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all duration-150 ${
              isLightMode
                ? 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50 shadow-sm active:scale-90'
                : 'bg-zinc-800 text-white border-white/10 hover:bg-zinc-700 shadow-md active:scale-90'
            }`}
            aria-label="Profil précédent"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => handleScrollStep('right')}
            className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all duration-150 ${
              isLightMode
                ? 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50 shadow-sm active:scale-90'
                : 'bg-zinc-800 text-white border-white/10 hover:bg-zinc-700 shadow-md active:scale-90'
            }`}
            aria-label="Profil suivant"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* CONTENEUR DU CARROUSEL SCROLLABLE : PADDING DYNAMIQUE CALC(50% - 140px) */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="relative flex w-full overflow-x-auto scroll-smooth snap-x snap-mandatory gap-4 py-4 overscroll-x-contain touch-pan-x [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        style={{
          WebkitOverflowScrolling: 'touch',
          scrollSnapType: 'x mandatory',
          paddingLeft: 'calc(50% - 140px)',
          paddingRight: 'calc(50% - 140px)',
        }}
        tabIndex={0}
        role="region"
        aria-label="Carrousel de profils et vitrines clientes"
      >
        {virtualItems.map((v, vIndex) => (
          <ShowcaseCard
            key={v.virtualKey}
            profile={v.item}
            isActive={vIndex === activeVirtualIndex}
            onCardClick={() => handleCardClick(vIndex, v.item)}
            isLightMode={isLightMode}
          />
        ))}
      </div>

      {/* INDICATEURS DE POSITION (PAGES/DOTS COMPACTS) */}
      {showIndicators && itemCount > 1 && (
        <div className="flex sm:hidden items-center justify-center gap-1.5 mt-3 px-4">
          {profiles.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => scrollToIndex(idx)}
              className={`h-1.5 rounded-full transition-all duration-200 ${
                idx === activeIndex
                  ? 'w-5 bg-orange-500'
                  : 'w-1.5 opacity-30 hover:opacity-60 bg-zinc-500'
              }`}
              aria-label={`Aller à la vitrine ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
