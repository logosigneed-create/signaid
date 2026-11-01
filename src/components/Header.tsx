import React, { useState, useEffect } from 'react';
import { Menu, X, Folder, HelpCircle, Sparkles, Shirt, Sun, Moon, Zap, ExternalLink } from 'lucide-react';
import { UserHeaderAuth } from './UserHeaderAuth';
import { useDividendWallet, formatCurrency } from '../utils/dividendService';

interface HeaderProps {
  activeTab: 'generator' | 'checkout' | 'workshop' | 'prospecting';
  setActiveTab: (tab: 'generator' | 'checkout' | 'workshop' | 'prospecting') => void;
  pendingPressCount?: number;
  isAdmin?: boolean;
  isDayMode?: boolean;
  onOpenProjects?: () => void;
  onOpenHelp?: () => void;
  onToggleDayMode?: () => void;
  onOpenAuthModal?: () => void;
  onOpenLiveShare?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  pendingPressCount = 0,
  isAdmin = false,
  isDayMode = false,
  onOpenProjects,
  onOpenHelp,
  onToggleDayMode,
  onOpenAuthModal,
  onOpenLiveShare,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { formattedBalance: dividendFormattedBalance, tierInfo: dividendTierInfo } = useDividendWallet();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileMenuOpen]);

  return (
    <>
      <header className="relative w-full h-14 sm:h-16 px-3 sm:px-6 flex items-center justify-between shrink-0 border-b border-zinc-800 bg-zinc-950/95 text-white backdrop-blur-md sticky top-0 z-50 transition-colors duration-200">
        {/* BLOC GAUCHE : Menu Hamburger (Mobile & Desktop) */}
        <div className="flex items-center gap-2 min-w-0 min-[920px]:min-w-[180px]">
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-xl text-zinc-300 hover:text-white hover:bg-zinc-800/80 transition-colors cursor-pointer"
            aria-label={isMobileMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            title={isMobileMenuOpen ? 'Fermer le menu' : 'Menu & Réglages'}
          >
            {isMobileMenuOpen ? <X className="w-5 h-5 text-lime-400" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* BLOC CENTRE : Titre & Logo SIGNAID.EU parfaitement centré (contraste franc : texte blanc net sur fond sombre) */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center pointer-events-none gap-2 sm:gap-2.5">
          <div
            onClick={() => {
              setActiveTab('generator');
              setIsMobileMenuOpen(false);
            }}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-lime-400 text-black font-black flex items-center justify-center font-mono text-xs sm:text-sm shadow-md shadow-lime-400/25 shrink-0 pointer-events-auto cursor-pointer select-none hover:scale-105 transition-transform"
            title="SIGNAID.EU - Studio"
          >
            S
          </div>
          <span
            onClick={() => {
              setActiveTab('generator');
              setIsMobileMenuOpen(false);
            }}
            className="font-mono font-black text-sm sm:text-base tracking-[0.25em] text-white hover:text-zinc-200 uppercase select-none pointer-events-auto cursor-pointer group transition-colors whitespace-nowrap drop-shadow-sm"
            title="SIGNAID.EU - Studio de Création"
          >
            SIGNAID<span className="text-lime-400 group-hover:text-lime-300 transition-colors">.EU</span>
          </span>
        </div>

        {/* BLOC DROITE : Bascule Thème (Jour / Nuit), Projets et Connexion / Profil */}
        <div className="flex items-center justify-end gap-2 sm:gap-2.5 min-w-0 min-[920px]:min-w-[180px]">
          {onToggleDayMode && (
            <button
              type="button"
              onClick={onToggleDayMode}
              className={`px-2.5 py-1.5 rounded-xl border transition-all duration-200 cursor-pointer shrink-0 flex items-center gap-1.5 font-mono text-xs font-bold ${
                isDayMode
                  ? 'border-amber-400/50 bg-amber-400/15 text-amber-300 hover:bg-amber-400/25 shadow-[0_0_12px_rgba(251,191,36,0.25)]'
                  : 'border-zinc-800 bg-zinc-900/90 text-zinc-300 hover:text-white hover:border-zinc-700 hover:bg-zinc-800/80 shadow-xs'
              }`}
              aria-label={isDayMode ? 'Mode Clair actif (Cliquer pour passer en mode Sombre)' : 'Mode Sombre actif (Cliquer pour passer en mode Clair)'}
              title={isDayMode ? 'Mode Clair actif (Cliquer pour passer en mode Sombre)' : 'Mode Sombre actif (Cliquer pour passer en mode Clair)'}
            >
              {isDayMode ? (
                <>
                  <Sun className="w-4 h-4 text-amber-400" />
                  <span className="hidden min-[480px]:inline text-[11px] text-amber-300">Jour</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-lime-400" />
                  <span className="hidden min-[480px]:inline text-[11px] text-zinc-300">Nuit</span>
                </>
              )}
            </button>
          )}

          {onOpenProjects && (
            <button
              type="button"
              onClick={onOpenProjects}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border border-zinc-800 bg-zinc-900/80 text-xs font-mono text-zinc-300 hover:text-white hover:bg-zinc-800 hover:border-zinc-700 transition-colors shadow-sm cursor-pointer shrink-0"
              title="Ouvrir la liste des projets"
            >
              <Folder className="w-3.5 h-3.5 text-lime-400" />
              <span className="hidden min-[540px]:inline">Projets</span>
            </button>
          )}

          <UserHeaderAuth
            isDayMode={false}
            onOpenWorkshop={() => setActiveTab('workshop')}
            onOpenAuthModal={onOpenAuthModal}
          />
        </div>
      </header>

      {/* TIROIR LATÉRAL DE NAVIGATION / MENU HAMBURGER (DESKTOP & MOBILE) */}
      {isMobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 top-14 sm:top-16 bg-black/60 backdrop-blur-xs z-40 animate-fadeIn"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <aside className={`fixed left-0 top-14 sm:top-16 bottom-0 z-50 w-80 sm:w-96 max-w-[88vw] ${
            isDayMode ? 'bg-white/95 text-zinc-900 border-zinc-200 shadow-xl' : 'bg-zinc-950/95 text-zinc-100 border-zinc-800 shadow-2xl'
          } backdrop-blur-xl border-r p-5 space-y-4 font-mono text-xs animate-fadeIn overflow-y-auto overscroll-contain flex flex-col justify-between`}>
            <div className="space-y-4">
              {/* En-tête du tiroir latéral */}
              <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <Menu className="w-4 h-4 text-lime-500" />
                  <span className="font-mono font-bold text-xs uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                    Menu & Réglages
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                  aria-label="Fermer le menu"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* SECTION CAGNOTTE DIVIDENDE MERCH / SOLDE */}
              <div className={`p-3.5 rounded-xl border ${isDayMode ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-900/80 border-zinc-800'}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-lime-400/15 border border-lime-400/30 flex items-center justify-center text-lime-400 shrink-0">
                      <Zap className="w-3.5 h-3.5 fill-lime-400 animate-pulse" />
                    </div>
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider block">Cagnotte Merch</span>
                      <span className="text-[9px] text-zinc-500">Dividende d'usage déductible</span>
                    </div>
                  </div>
                  <span className="text-base font-black text-lime-400">{dividendFormattedBalance}</span>
                </div>

                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-[9px] text-zinc-400">
                    <span>Prochain palier (-5 €)</span>
                    <span className="font-bold text-zinc-300 dark:text-zinc-200">{formatCurrency(dividendTierInfo.nextTier)}</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-zinc-950 border border-zinc-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-lime-500 to-lime-300 rounded-full transition-all duration-500"
                      style={{ width: `${dividendTierInfo.progressPercent}%` }}
                    />
                  </div>
                  <p className="text-[9px] text-zinc-500 leading-tight">
                    Déductible jusqu'à -20% sur vos commandes Merch & Print (par tranches de 5 €).
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('workshop');
                    setIsMobileMenuOpen(false);
                  }}
                  className="mt-3 w-full py-1.5 px-2.5 rounded-lg border border-lime-400/40 bg-lime-400/10 hover:bg-lime-400/20 text-lime-400 text-[10px] font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Shirt className="w-3.5 h-3.5" />
                  <span>Utiliser ma cagnotte en Atelier</span>
                </button>
              </div>

              {/* NAVIGATION & STUDIO */}
              <div className="space-y-1.5">
                <p className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 px-1">Navigation & Studio</p>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('generator');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full p-2.5 rounded-xl border flex items-center justify-between transition cursor-pointer ${activeTab === 'generator'
                    ? 'bg-lime-400/10 border-lime-400/40 text-lime-400 font-bold'
                    : isDayMode
                      ? 'bg-zinc-50 border-zinc-200 text-zinc-800 hover:border-zinc-300'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                    }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Sparkles className="w-4 h-4 text-lime-400" />
                    <span>Studio / Générateur d'Affiches</span>
                  </div>
                  {activeTab === 'generator' && <span className="text-[9px] px-1.5 py-0.5 rounded bg-lime-400/20 text-lime-400 font-bold">ACTIF</span>}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('workshop');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full p-2.5 rounded-xl border flex items-center justify-between transition cursor-pointer ${activeTab === 'workshop'
                    ? 'bg-lime-400/10 border-lime-400/40 text-lime-400 font-bold'
                    : isDayMode
                      ? 'bg-zinc-50 border-zinc-200 text-zinc-800 hover:border-zinc-300'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                    }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Shirt className="w-4 h-4 text-lime-400" />
                    <span>Atelier Presse DTF & Textile</span>
                  </div>
                  {pendingPressCount > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-lime-400/20 text-lime-400 font-bold">{pendingPressCount}</span>
                  )}
                </button>

                {onOpenProjects && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      onOpenProjects();
                    }}
                    className={`w-full p-2.5 rounded-xl border flex items-center justify-between transition cursor-pointer ${isDayMode
                      ? 'bg-zinc-50 border-zinc-200 text-zinc-800 hover:border-zinc-300'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                      }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Folder className="w-4 h-4 text-lime-400" />
                      <span>Mes Projets</span>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-zinc-500" />
                  </button>
                )}
              </div>

              {/* AIDE & SUPPORT */}
              <div className="space-y-1.5">
                <p className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 px-1">Aide & Support</p>
                {onOpenHelp && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      onOpenHelp();
                    }}
                    className={`w-full p-2.5 rounded-xl border flex items-center justify-between transition cursor-pointer ${isDayMode
                      ? 'bg-zinc-50 border-zinc-200 text-zinc-800 hover:border-zinc-300'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                      }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <HelpCircle className="w-4 h-4 text-lime-400" />
                      <span>Centre d'aide & Documentation</span>
                    </div>
                    <span className="text-[10px] text-zinc-500">Guide</span>
                  </button>
                )}

                {onOpenLiveShare && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenLiveShare();
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full p-2.5 rounded-xl border flex items-center justify-between transition cursor-pointer ${isDayMode
                      ? 'bg-zinc-50 border-zinc-200 text-zinc-800 hover:border-zinc-300'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                      }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Aide en Live</span>
                    </div>
                    <span className="text-[10px] text-zinc-500">Direct</span>
                  </button>
                )}
              </div>
            </div>

            {/* BASCULE DU THÈME (MODE JOUR / NUIT) */}
            {onToggleDayMode && (
              <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800/80 flex items-center justify-between mt-4">
                <span className="text-zinc-600 dark:text-zinc-400 text-[11px] flex items-center gap-2">
                  {isDayMode ? <Sun className="w-3.5 h-3.5 text-amber-500" /> : <Moon className="w-3.5 h-3.5 text-lime-400" />}
                  <span>Mode d'affichage</span>
                </span>
                <button
                  type="button"
                  onClick={onToggleDayMode}
                  className={`px-3 py-1.5 rounded-xl border text-[11px] font-bold transition flex items-center gap-1.5 cursor-pointer ${isDayMode
                    ? 'bg-zinc-100 border-zinc-300 text-zinc-800 hover:border-zinc-400'
                    : 'bg-zinc-900 border-zinc-700 text-zinc-200 hover:border-zinc-600'
                    }`}
                >
                  {isDayMode ? <Moon className="w-3.5 h-3.5 text-zinc-500" /> : <Sun className="w-3.5 h-3.5 text-amber-400" />}
                  <span>{isDayMode ? 'Mode Nuit' : 'Mode Jour'}</span>
                </button>
              </div>
            )}
          </aside>
        </>
      )}
    </>
  );
};

export default Header;
