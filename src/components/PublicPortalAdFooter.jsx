/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Signaid.eu - Bandeau Publicitaire pour Portail Public & SmartLink (/e/:slug)
 * Affiché sous les boutons d'action (Agenda/Maps/Réseaux/Boutique), non intrusif mais 100 % visible.
 * Rémunération nette et responsable (+0,005 € / visite unique, soit 5,00 € pour 1 000 visiteurs).
 */

import React, { useEffect, useState } from 'react';
import { Sparkles, ArrowRight, Zap, ShieldCheck } from 'lucide-react';
import { AdSenseSlot } from './AdSenseSlot';
import { creditDividend, REWARD_PUBLIC_PORTAL_VIEW } from '../utils/dividendService';

/**
 * @typedef {Object} PublicPortalAdFooterProps
 * @property {string} [adClient] - Identifiant éditeur Google AdSense
 * @property {string} [adSlot] - Emplacement d'annonce AdSense
 * @property {string} [creatorSlug] - Identifiant / Slug du projet créateur
 * @property {string} [creatorName] - Nom du créateur ou de l'artiste
 * @property {string} [className] - Classes CSS personnalisées
 */

export const PublicPortalAdFooter = ({
  adClient = undefined,
  adSlot = '8927164920',
  creatorSlug = 'portail-public',
  creatorName = '',
  className = '',
}) => {
  const [hasCreditedView, setHasCreditedView] = useState(false);

  // Incrémentation unique par session du dividende créateur (+0,005 € par visiteur unique)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const storageKey = `signaid_portal_view_${creatorSlug}`;
      const alreadyCredited = sessionStorage.getItem(storageKey);

      if (!alreadyCredited) {
        creditDividend(REWARD_PUBLIC_PORTAL_VIEW, `Visite Portail Public : ${creatorName || creatorSlug}`);
        sessionStorage.setItem(storageKey, 'true');
        setHasCreditedView(true);
      } else {
        setHasCreditedView(true);
      }
    } catch (e) {
      console.warn('[PublicPortalAdFooter] Erreur enregistrement vue dividende :', e);
    }
  }, [creatorSlug, creatorName]);

  return (
    <div className={`w-full max-w-md mx-auto my-6 px-1 space-y-3.5 select-none ${className}`}>
      {/* Conteneur de l'annonce AdSense */}
      <div className="w-full rounded-2xl bg-neutral-900 border border-neutral-800 p-2.5 sm:p-3 shadow-lg shadow-black/40 space-y-2">
        {/* En-tête discret du sponsor */}
        <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400 px-1 border-b border-neutral-800/80 pb-1.5">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-lime-400 animate-pulse" />
            <span className="uppercase tracking-wider font-bold text-neutral-300">
              Sponsor Officiel du Portail
            </span>
          </div>

          <div className="flex items-center gap-1 text-lime-400 font-semibold">
            <Zap className="w-2.5 h-2.5 fill-lime-400" />
            <span>Dividende Créateur Actif</span>
          </div>
        </div>

        {/* Emplacement publicitaire Google AdSense Format Horizontal */}
        <div className="w-full overflow-hidden rounded-xl bg-neutral-950/80">
          <AdSenseSlot
            adClient={adClient}
            adSlot={adSlot}
            adFormat="horizontal"
            className="w-full"
          />
        </div>

        {/* Note d'information de financement d'usage */}
        <div className="flex items-center justify-between text-[9px] font-mono text-neutral-400 pt-1 px-1">
          <span>Chaque vue sur ce portail finance la cagnotte textile de l'artiste.</span>
          {hasCreditedView && (
            <span className="text-lime-400 font-bold shrink-0">+0,005 € crédité</span>
          )}
        </div>
      </div>

      {/* Mention de conversion & propulsion Signaid */}
      <div className="p-3.5 rounded-2xl bg-neutral-900/70 border border-neutral-800/80 hover:border-lime-400/40 transition-colors duration-300 text-center space-y-2 group">
        <div className="space-y-0.5">
          <p className="text-xs font-mono text-neutral-300 font-bold uppercase tracking-wide">
            Propulsé gratuitement par{' '}
            <a
              href="https://signaid.eu"
              target="_blank"
              rel="noopener noreferrer"
              className="text-lime-400 hover:text-lime-300 underline underline-offset-2 transition-colors"
            >
              Signaid.eu
            </a>
          </p>
          <p className="text-[11px] text-neutral-400 font-sans">
            Créez votre portail interactif, synchronisez vos événements et lancez votre boutique sans stock.
          </p>
        </div>

        <a
          href="/"
          className="inline-flex items-center justify-center gap-1.5 w-full py-2 px-3 rounded-xl bg-neutral-950 hover:bg-neutral-850 border border-neutral-800 hover:border-lime-400/50 text-neutral-200 hover:text-white font-mono text-xs font-semibold uppercase tracking-wider transition-all duration-200 cursor-pointer shadow-sm group-hover:shadow-[0_0_15px_rgba(163,230,53,0.15)]"
        >
          <Sparkles className="w-3.5 h-3.5 text-lime-400" />
          <span>Créer mon portail &amp; boutique gratuite</span>
          <ArrowRight className="w-3.5 h-3.5 text-neutral-400 group-hover:text-lime-400 group-hover:translate-x-0.5 transition-transform" />
        </a>
      </div>
    </div>
  );
};

export default PublicPortalAdFooter;
