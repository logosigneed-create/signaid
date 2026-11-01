/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Signaid.eu - Widget Badge & Popover "Cagnotte Dividende d'Usage"
 * Affiché dans le header du Studio à côté de "Projets" et du profil utilisateur.
 * Modèle économique rentable & durable (anti-déficit, anti-abus).
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Zap,
  Coins,
  ChevronDown,
  X,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Shirt,
  CheckCircle2,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { useDividendWallet, formatCurrency } from '../utils/dividendService';

/**
 * @typedef {Object} DividendWalletBadgeProps
 * @property {string} [className] - Classes Tailwind additionnelles
 * @property {boolean} [isDayMode] - Indique si le thème clair est actif
 * @property {() => void} [onOpenWorkshop] - Ouvre l'atelier textile ou le panier
 */

export const DividendWalletBadge = ({
  className = '',
  isDayMode = false,
  onOpenWorkshop,
}) => {
  const { balance, formattedBalance, tierInfo, dailyQuota, history } = useDividendWallet();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Gestion de la fermeture au clic à l'extérieur
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  const handleUseCredits = () => {
    setIsOpen(false);
    if (onOpenWorkshop) {
      onOpenWorkshop();
    }
  };

  return (
    <div ref={containerRef} className={`relative inline-block shrink-0 ${className}`}>
      {/* BOUTON BADGE DU HEADER (VISIBLE EN PERMANENCE, SANS CHEVAUCHEMENT) */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-mono font-bold transition-all duration-200 cursor-pointer select-none group shadow-sm shrink-0 whitespace-nowrap ${
          isOpen
            ? 'border-lime-400 bg-lime-400/10 text-lime-400 shadow-[0_0_15px_rgba(163,230,53,0.2)]'
            : isDayMode
            ? 'border-zinc-200 bg-white text-zinc-800 hover:border-lime-500 hover:bg-zinc-50'
            : 'border-neutral-800 bg-neutral-900 text-neutral-200 hover:border-lime-400/60 hover:bg-neutral-850 hover:text-white'
        }`}
        title="Voir ma cagnotte de réductions Merch / Print"
        aria-expanded={isOpen}
      >
        {/* Éclair animé en vert néon */}
        <div className="w-5 h-5 rounded-lg bg-lime-400/15 border border-lime-400/30 flex items-center justify-center shrink-0">
          <Zap className="w-3 h-3 text-lime-400 fill-lime-400 animate-pulse" />
        </div>

        {/* Intitulé responsive adapté pour ne jamais écraser le logo central */}
        <div className="flex items-center gap-1 shrink-0">
          <span className="hidden xl:inline text-neutral-400 group-hover:text-neutral-300 transition-colors">
            Cagnotte Merch :
          </span>
          <span className="hidden sm:inline xl:hidden text-neutral-400 group-hover:text-neutral-300 transition-colors">
            Cagnotte :
          </span>
          <span className="text-lime-400 font-black">{formattedBalance}</span>
        </div>

        {/* Mini barre de palier intégrée au bouton sur grand écran */}
        <div className="hidden lg:flex items-center w-8 xl:w-10 h-1.5 rounded-full bg-neutral-950 border border-neutral-800 overflow-hidden shrink-0">
          <div
            className="h-full bg-lime-400 rounded-full transition-all duration-500"
            style={{ width: `${tierInfo.progressPercent}%` }}
          />
        </div>

        <ChevronDown
          className={`w-3.5 h-3.5 text-neutral-400 group-hover:text-lime-400 transition-transform duration-200 shrink-0 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* POPOVER DÉTAILLÉ DE LA CAGNOTTE */}
      {isOpen && (
        <div
          className={`absolute right-[-40px] sm:right-0 top-full mt-2 w-[calc(100vw-2rem)] max-w-sm sm:w-96 rounded-2xl border shadow-2xl z-[100] p-4 sm:p-5 font-mono animate-scaleUp select-none ${
            isDayMode
              ? 'bg-white border-zinc-200 text-zinc-900 shadow-xl'
              : 'bg-neutral-900 border-neutral-800 text-neutral-100 shadow-[0_15px_50px_rgba(0,0,0,0.8)]'
          }`}
        >
          {/* Lueur supérieure discrète */}
          <div className="pointer-events-none absolute -top-8 right-8 w-32 h-16 bg-lime-400/15 rounded-full blur-xl" />

          {/* En-tête du Popover */}
          <div className="flex items-center justify-between border-b border-neutral-800/80 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-lime-400/15 border border-lime-400/30 flex items-center justify-center text-lime-400 shrink-0">
                <Coins className="w-4 h-4" />
              </div>
              <div className="text-left">
                <h4 className="text-xs font-black uppercase tracking-wider text-white">
                  Dividende d'Usage
                </h4>
                <span className="text-[10px] text-lime-400 font-bold block leading-tight">
                  Déductible jusqu'à -20% sur vos commandes Merch &amp; Print (paliers de 5 €)
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition cursor-pointer shrink-0"
              aria-label="Fermer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Montant Solde & Prochain Palier */}
          <div className="py-3.5 space-y-3">
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-neutral-400 block">
                  Solde accumulé
                </span>
                <span className="text-2xl sm:text-3xl font-black text-lime-400 tracking-tight">
                  {formattedBalance}
                </span>
              </div>

              <div className="text-right">
                <span className="text-[10px] uppercase text-neutral-400 block">
                  Prochain palier (-5 €)
                </span>
                <span className="text-xs font-bold text-neutral-200">
                  {formatCurrency(tierInfo.nextTier)}
                </span>
              </div>
            </div>

            {/* Jauge de progression vers le prochain palier */}
            <div className="space-y-1.5">
              <div className="w-full h-2.5 rounded-full bg-neutral-950 border border-neutral-800 p-0.5 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-lime-500 to-lime-300 shadow-[0_0_10px_#ff6b00] transition-all duration-500"
                  style={{ width: `${tierInfo.progressPercent}%` }}
                />
              </div>

              <div className="flex justify-between items-center text-[10px] text-neutral-400">
                <span>Progression : {tierInfo.progressPercent}%</span>
                {tierInfo.remainingForTier > 0 ? (
                  <span className="text-lime-400 font-bold">
                    Plus que {formatCurrency(tierInfo.remainingForTier)} pour débloquer
                  </span>
                ) : (
                  <span className="text-lime-400 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Palier atteint !</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Encadré d'explication officielle Signaid */}
          <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-[11px] font-sans leading-relaxed text-neutral-300 space-y-1.5 text-left">
            <p className="font-semibold text-white flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-lime-400 shrink-0" />
              <span>Comment fonctionne votre dividende ?</span>
            </p>
            <p className="text-neutral-400">
              Votre cagnotte est financée par les revenus publicitaires excédant les frais techniques d'IA. Déblocable par tranche de 5,00 € en réduction immédiate sur la Boutique Atelier (dès 30 € de commande) ou en prime créateur.
            </p>
          </div>

          {/* Barème de rémunération transparente et rentable */}
          <div className="grid grid-cols-2 gap-2 text-[10px] pt-1">
            <div className="p-2.5 rounded-xl bg-neutral-950/70 border border-neutral-800 space-y-1 text-left">
              <div className="flex items-center gap-1 text-lime-400 font-bold">
                <Zap className="w-3 h-3 fill-lime-400 shrink-0" />
                <span>+0,01 € / génération</span>
              </div>
              <p className="text-neutral-400 text-[9px] leading-tight">
                Studio IA (max 5 rémunérées / jour)
              </p>
              {dailyQuota && (
                <div className="pt-0.5 text-[9px] font-bold text-neutral-500">
                  Aujourd'hui : {dailyQuota.count}/{dailyQuota.maxDaily}
                </div>
              )}
            </div>

            <div className="p-2.5 rounded-xl bg-neutral-950/70 border border-neutral-800 space-y-1 text-left">
              <div className="flex items-center gap-1 text-lime-400 font-bold">
                <TrendingUp className="w-3 h-3 shrink-0" />
                <span>+0,005 € / visite</span>
              </div>
              <p className="text-neutral-400 text-[9px] leading-tight">
                Portail Public (5,00 € / 1 000 visites)
              </p>
              <div className="pt-0.5 text-[9px] font-bold text-neutral-500 flex items-center gap-1">
                <ShieldCheck className="w-2.5 h-2.5 text-neutral-400" />
                <span>Visiteurs uniques</span>
              </div>
            </div>
          </div>

          {/* Historique récent des gains réels */}
          {history.length > 0 && (
            <div className="space-y-1.5 pt-1 text-left">
              <div className="flex items-center justify-between text-[10px] text-neutral-400 uppercase">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-neutral-400" />
                  <span>Derniers gains</span>
                </span>
                <span>{history.length} transactions</span>
              </div>

              <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                {history.slice(0, 3).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-1.5 rounded-lg bg-neutral-950/50 border border-neutral-850 text-[10px]"
                  >
                    <span className="text-neutral-300 truncate max-w-[190px]">
                      {item.reason}
                    </span>
                    <span className="text-lime-400 font-black shrink-0 ml-2">
                      +{formatCurrency(item.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bouton d'action pour utiliser la cagnotte */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleUseCredits}
              className="w-full py-2.5 px-3 rounded-xl bg-lime-400 hover:bg-lime-300 text-neutral-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-lime-400/20 active:scale-98 transition cursor-pointer"
            >
              <Shirt className="w-3.5 h-3.5 fill-black" />
              <span>Utiliser en Boutique Atelier</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DividendWalletBadge;
