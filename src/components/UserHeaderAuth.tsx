/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Droppaid.ai - Composant de Connexion & Menu Profil Header
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  User,
  LogOut,
  ShieldCheck,
  Crown,
  Zap,
  ChevronDown,
  CheckCircle2,
  Sparkles,
  Lock,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { AuthModal } from './AuthModal';

interface UserHeaderAuthProps {
  isDayMode?: boolean;
  onOpenWorkshop?: () => void;
  onTriggerUpgrade?: () => void;
  onOpenAuthModal?: () => void;
}

export const UserHeaderAuth: React.FC<UserHeaderAuthProps> = ({
  isDayMode = false,
  onTriggerUpgrade,
  onOpenAuthModal,
}) => {
  const { user, role, isSuperAdmin, isAdmin, isPro, logout, entitlements } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Fermeture automatique du menu lors d'un clic extérieur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const effectiveEmail = user?.email || entitlements.email || '';
  const isAnonymousGuest = !user && (!effectiveEmail || effectiveEmail === 'invite@client.fr');

  const storedDisplayName = (() => {
    try {
      return typeof window !== 'undefined' ? localStorage.getItem('droppaid_user_display_name') : null;
    } catch {
      return null;
    }
  })();

  // Initiales ou nom d'affichage
  const displayName =
    user?.displayName ||
    storedDisplayName ||
    (effectiveEmail ? effectiveEmail.split('@')[0] : 'Invité');
  const userInitials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <>
      <div className="relative" ref={menuRef}>
        {isAnonymousGuest ? (
          <button
            type="button"
            onClick={() => {
              if (onOpenAuthModal) {
                onOpenAuthModal();
              } else {
                setIsAuthModalOpen(true);
              }
            }}
            className={`p-2 min-[920px]:px-3.5 min-[920px]:py-1.5 rounded-xl text-xs font-mono font-medium shadow-xs transition-transform active:scale-95 flex items-center gap-1.5 cursor-pointer ${
              isDayMode
                ? 'bg-zinc-900 hover:bg-zinc-800 text-white'
                : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-900'
            }`}
            title="Connexion"
          >
            <User className="w-4 h-4 min-[920px]:w-3.5 min-[920px]:h-3.5" />
            <span className="hidden min-[920px]:inline">Connexion</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className={`p-1.5 min-[920px]:px-2.5 min-[920px]:py-1 rounded-xl text-xs font-mono flex items-center gap-1.5 min-[920px]:gap-2 transition border shadow-xs cursor-pointer ${
              isSuperAdmin
                ? 'bg-lime-500/10 border-lime-500/40 text-lime-400 hover:bg-lime-500/20'
                : isPro
                ? 'bg-lime-400/10 border-lime-400/40 text-lime-400 hover:bg-lime-400/20'
                : isDayMode
                ? 'bg-zinc-100 border-zinc-300 text-zinc-800 hover:bg-zinc-200'
                : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700'
            }`}
            title={displayName}
          >
            {/* AVATAR / INITIALES */}
            <div className={`w-6 h-6 rounded-lg ${isDayMode ? 'bg-zinc-200 border-zinc-300 text-zinc-900' : 'bg-zinc-950 border-zinc-700 text-white'} flex items-center justify-center font-bold text-[10px] shrink-0 overflow-hidden`}>
              {user?.photoURL ? (
                <img src={user.photoURL} alt="Avatar" width={24} height={24} loading="lazy" decoding="async" className="w-full h-full object-cover" />
              ) : isSuperAdmin ? (
                <Crown className="w-3.5 h-3.5 text-lime-400" />
              ) : (
                <span>{userInitials || 'DJ'}</span>
              )}
            </div>

            {/* EMAIL / PSEUDO TRONQUÉ */}
            <span className={`hidden min-[920px]:inline font-bold max-w-[120px] truncate text-[11px] ${isDayMode ? 'text-zinc-900' : 'text-zinc-100'}`}>
              {displayName}
            </span>

            {/* BADGE RÔLE */}
            <span
              className={`hidden min-[920px]:flex text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider items-center gap-1 ${
                isSuperAdmin
                  ? 'bg-lime-500/20 text-lime-600 dark:text-lime-300 border border-lime-500/50'
                  : isPro
                  ? 'bg-lime-400/20 text-lime-600 dark:text-lime-400 border border-lime-400/50'
                  : isDayMode
                  ? 'bg-zinc-200 text-zinc-800 border border-zinc-300'
                  : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
              }`}
            >
              {isSuperAdmin && '👑 SUPER-ADMIN'}
              {!isSuperAdmin && isPro && '⚡ PRO 300 DPI'}
              {!isSuperAdmin && !isPro && '👤 STANDARD'}
            </span>

            <ChevronDown className="w-3 h-3 opacity-60 hidden min-[920px]:inline" />
          </button>
        )}

        {/* MENU DÉROULANT PROFIL */}
        {isMenuOpen && !isAnonymousGuest && (
          <div
            className={`absolute right-0 mt-2 w-72 ${
              isDayMode ? 'bg-white border-zinc-200 text-zinc-900 shadow-xl' : 'bg-zinc-950 border-zinc-800 text-zinc-100 shadow-2xl'
            } border rounded-2xl p-3 z-50 animate-fadeIn space-y-2`}
          >
            {/* RECAP EMAIL & RÔLE */}
            <div className={`p-2.5 rounded-xl ${isDayMode ? 'bg-zinc-50 border border-zinc-200' : 'bg-zinc-900 border border-zinc-800'}`}>
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg ${isDayMode ? 'bg-zinc-200 border-zinc-300 text-zinc-900' : 'bg-zinc-950 border-zinc-700 text-white'} flex items-center justify-center font-bold text-xs shrink-0`}>
                  {isSuperAdmin ? <Crown className="w-4 h-4 text-lime-500" /> : <User className="w-4 h-4 text-lime-500" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-xs font-bold truncate ${isDayMode ? 'text-zinc-900' : 'text-zinc-100'}`}>{effectiveEmail}</p>
                  <p className={`text-[10px] ${isDayMode ? 'text-zinc-600' : 'text-zinc-500'} font-mono`}>
                    {isSuperAdmin
                      ? 'Administrateur Suprême (Permanent)'
                      : isPro
                      ? 'Compte Pro (Exports 300 DPI Valides)'
                      : 'Utilisateur Standard (Mode Découverte)'}
                  </p>
                </div>
              </div>
            </div>

            {/* PRIVILÈGES DU COMPTE */}
            <div className="px-1 py-1 space-y-1 text-[11px] font-mono">
              <div className={`flex items-center justify-between py-1 ${isDayMode ? 'text-zinc-600' : 'text-zinc-400'}`}>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className={`w-3.5 h-3.5 ${isDayMode ? 'text-emerald-600' : 'text-lime-400'}`} />
                  <span>Exports 300 DPI :</span>
                </span>
                <span className={`font-bold ${isPro ? (isDayMode ? 'text-emerald-600' : 'text-lime-400') : (isDayMode ? 'text-zinc-700' : 'text-zinc-400')}`}>
                  {isPro ? 'DÉVERROUILLÉS 🔓' : '59€ 🔒'}
                </span>
              </div>
            </div>

            <div className={`border-t ${isDayMode ? 'border-zinc-200' : 'border-zinc-800/80'} pt-2 space-y-1`}>
              {/* BOUTON PASSER EN PRO POUR STANDARD */}
              {!isPro && onTriggerUpgrade && (
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onTriggerUpgrade();
                  }}
                  className={`w-full p-2 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition cursor-pointer ${
                    isDayMode
                      ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-900 border border-zinc-300'
                      : 'bg-lime-400/10 text-lime-400 border border-lime-400/40 hover:bg-lime-400/20'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-lime-500" />
                  <span>Passer en Pro Master (59€)</span>
                </button>
              )}

              {/* BOUTON DÉCONNEXION */}
              <button
                type="button"
                onClick={async () => {
                  setIsMenuOpen(false);
                  await logout();
                }}
                className={`w-full p-2 rounded-xl text-xs font-mono flex items-center gap-2 transition cursor-pointer ${
                  isDayMode
                    ? 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                }`}
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Se déconnecter</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {!onOpenAuthModal && (
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          isDayMode={isDayMode}
        />
      )}
    </>
  );
};
