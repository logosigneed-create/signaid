/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Signaid.eu - Modale d'Attente de Génération IA avec Publicité & Dividende d'Usage
 * Présente l'indicateur de progression technique néon, l'annonce AdSense et l'incitation dividende.
 * Rémunération nette et responsable (+0,01 € / génération, max 5 / jour).
 */

import React, { useEffect, useState, useRef } from 'react';
import { Loader2, Sparkles, Coins, Zap, ShieldCheck } from 'lucide-react';
import { AdSenseSlot } from './AdSenseSlot';
import {
  recordStudioGenerationReward,
  getDividendWallet,
  formatCurrency,
  DAILY_GENERATION_LIMIT,
  REWARD_STUDIO_GENERATION,
} from '../utils/dividendService';

const LOADING_PHRASES = [
  'Calibrage DTF & Synthèse photoréaliste en cours...',
  'Simulation thermique du textile & incrustation de trame...',
  'Optimisation des micro-contrastes et textures haute résolution...',
  'Rendu mannequin studio & vérification des spécifications d’impression...',
  'Finalisation des calques et rendu photographique 8K...',
];

/**
 * @typedef {Object} GenerationLoadingAdModalProps
 * @property {boolean} isLoading - Indique si la génération est en cours
 * @property {string} [title] - Titre de l'opération en cours
 * @property {string} [adClient] - ID éditeur AdSense
 * @property {string} [adSlot] - Emplacement AdSense
 * @property {() => void} [onClose] - Callback optionnel de fermeture
 */

export const GenerationLoadingAdModal = ({
  isLoading = false,
  title = 'CALIBRAGE & SYNTHÈSE IA EN COURS',
  adClient = undefined,
  adSlot = '8927164920',
  onClose = undefined,
}) => {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [progress, setProgress] = useState(12);
  const [hasCreditedThisSession, setHasCreditedThisSession] = useState(false);
  const [currentBalance, setCurrentBalance] = useState(() => getDividendWallet().balance);
  const [rewardStatus, setRewardStatus] = useState({
    rewarded: false,
    count: 0,
    maxDaily: DAILY_GENERATION_LIMIT,
  });
  const timerRef = useRef(null);

  // Rotation dynamique des messages d'attente techniques
  useEffect(() => {
    if (!isLoading) {
      setPhraseIndex(0);
      setProgress(12);
      setHasCreditedThisSession(false);
      return;
    }

    // Incrémentation de la jauge de progression simulée
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev < 90) {
          const step = Math.floor(Math.random() * 8) + 4;
          return Math.min(92, prev + step);
        }
        return prev;
      });
    }, 900);

    // Défilement des phrases d'analyse
    timerRef.current = setInterval(() => {
      setPhraseIndex((prev) => (prev + 1) % LOADING_PHRASES.length);
    }, 2800);

    // Crédit automatique de la cagnotte (+0,01 € avec limitation stricte de 5/jour)
    if (!hasCreditedThisSession) {
      const res = recordStudioGenerationReward();
      setCurrentBalance(res.wallet.balance);
      setRewardStatus({
        rewarded: res.rewarded,
        count: res.quota.count,
        maxDaily: res.quota.maxDaily,
      });
      setHasCreditedThisSession(true);
    }

    return () => {
      clearInterval(progressInterval);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isLoading, hasCreditedThisSession]);

  if (!isLoading) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md select-none animate-fadeIn"
      role="dialog"
      aria-modal="true"
    >
      {/* Conteneur Carte Centrale Signaid DA */}
      <div className="relative w-full max-w-md sm:max-w-lg rounded-2xl bg-neutral-900 border border-neutral-800 p-5 sm:p-6 shadow-[0_0_50px_rgba(163,230,53,0.18)] text-neutral-100 flex flex-col gap-4 sm:gap-5 overflow-hidden">
        {/* Lueur supérieure néon */}
        <div className="pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 w-72 h-20 bg-lime-400/20 rounded-full blur-2xl" />

        {/* 1. HEADER AVEC INDICATEUR DE CHARGEMENT TECHNIQUE NÉON */}
        <div className="relative z-10 flex flex-col items-center text-center space-y-2">
          {/* Badge statut */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-lime-400/10 border border-lime-400/30 text-lime-400 font-mono text-[10px] sm:text-xs font-bold uppercase tracking-widest shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-lime-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-lime-400" />
            </span>
            <span>Moteur Neural Signaid • 8K DTF</span>
          </div>

          <h3 className="font-mono font-black text-sm sm:text-base uppercase tracking-wider text-white">
            {title}
          </h3>

          {/* Phrase dynamique animée */}
          <div className="min-h-[2.5rem] flex items-center justify-center">
            <p className="font-mono text-xs text-lime-400 font-semibold transition-all duration-300 animate-fadeIn text-center max-w-sm">
              {LOADING_PHRASES[phraseIndex]}
            </p>
          </div>

          {/* Barre de progression technique néon */}
          <div className="w-full space-y-1 pt-1">
            <div className="w-full h-2 rounded-full bg-neutral-950 border border-neutral-800 p-0.5 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-lime-500 to-lime-300 shadow-[0_0_12px_#ff6b00] transition-all duration-700 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-[10px] font-mono text-neutral-500 px-1">
              <span className="flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin text-lime-400" />
                <span>Calcul des ombres &amp; plis...</span>
              </span>
              <span className="text-lime-400 font-bold">{progress}%</span>
            </div>
          </div>
        </div>

        {/* 2. CENTRE : INTÉGRATION DE L'ESPACE PUBLICITAIRE ADSENSE */}
        <div className="relative z-10 w-full flex flex-col items-center justify-center">
          <div className="w-full max-w-[340px] rounded-2xl overflow-hidden border border-neutral-800 bg-neutral-950/70 p-2 shadow-inner">
            <AdSenseSlot
              adClient={adClient}
              adSlot={adSlot}
              adFormat="rectangle"
              className="w-full"
            />
          </div>
        </div>

        {/* 3. BAS : ENCART INCITATIF "DIVIDENDE D'USAGE ACTIF" */}
        <div className="relative z-10 w-full rounded-xl bg-neutral-950/90 border border-neutral-800 p-3.5 sm:p-4 space-y-2">
          <div className="flex items-center justify-between gap-2 border-b border-neutral-800/80 pb-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-lime-400/10 border border-lime-400/30 flex items-center justify-center text-lime-400">
                <Zap className="w-3.5 h-3.5 fill-lime-400" />
              </div>
              <span className="font-mono text-xs font-black uppercase tracking-wider text-white">
                Dividende d'Usage Actif
              </span>
            </div>

            <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-lime-400/15 border border-lime-400/30 text-lime-400 font-mono text-[11px] font-black">
              {rewardStatus.rewarded ? (
                <span>+0,01 € ({rewardStatus.count}/{rewardStatus.maxDaily})</span>
              ) : (
                <span className="text-neutral-400 text-[10px]">Quota max (5/5)</span>
              )}
            </div>
          </div>

          <p className="text-[11px] sm:text-xs text-neutral-400 leading-relaxed font-sans text-left">
            Cette publicité finance la gratuité intégrale de votre atelier créatif et crédite automatiquement votre{' '}
            <strong className="text-neutral-200">cagnotte de réductions Merch &amp; Print Signaid</strong> (+0,01 € / génération, jusqu'à 5 par jour).
          </p>

          <div className="flex items-center justify-between pt-1 text-[10px] font-mono text-neutral-400">
            <div className="flex items-center gap-1.5 text-neutral-400">
              <Coins className="w-3.5 h-3.5 text-lime-400" />
              <span>Solde Cagnotte :</span>
              <span className="text-lime-400 font-bold">{formatCurrency(currentBalance)}</span>
            </div>

            <div className="flex items-center gap-1 text-neutral-500">
              <ShieldCheck className="w-3 h-3 text-neutral-400" />
              <span>Jusqu'à -20% sur Merch &amp; Print</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GenerationLoadingAdModal;
