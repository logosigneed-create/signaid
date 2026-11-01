/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Signaid.eu - Service de Gestion du Dividende d'Usage & Cagnotte Merch / Print
 * Gère le solde accumulé par les générations IA et les vues sur les portails publics.
 * Calibrage financier rentable & réaliste (anti-déficit, anti-fraude API).
 */

import { useState, useEffect, useCallback } from 'react';

export interface DividendTransaction {
  id: string;
  amount: number;
  reason: string;
  timestamp: number;
}

export interface DividendTierInfo {
  currentTier: number;
  nextTier: number;
  remainingForTier: number;
  progressPercent: number;
  tierDiscount: number;
}

export interface DailyGenerationQuota {
  date: string;
  count: number;
  maxDaily: number;
  remainingToday: number;
}

export interface DividendWalletData {
  balance: number;
  totalEarned: number;
  history: DividendTransaction[];
}

const STORAGE_KEY = 'signaid_dividend_wallet_v2';
const LEGACY_STORAGE_KEY = 'signaid_dividend_wallet_v1';
const DAILY_GEN_STORAGE_KEY = 'signaid_dividend_daily_gen_quota';
const EVENT_NAME = 'signaid:dividend_updated';

// Solde de départ strict à 0.00 € (suppression définitive du bonus artificiel de 4.50 €)
export const DEFAULT_INITIAL_BALANCE = 0.00;

// Gains unitaires nets calibrés
export const REWARD_STUDIO_GENERATION = 0.01; // +0,01 € / génération IA
export const REWARD_PUBLIC_PORTAL_VIEW = 0.005; // +0,005 € / visite unique (soit 5,00 € pour 1 000 visiteurs)
export const DAILY_GENERATION_LIMIT = 5; // Maximum strict de 5 générations rémunérées par jour

// Paliers de déblocage par tranche de 5,00 € (remise jusqu'à -20% sur Merch & Print)
const TIERS = [5.0, 10.0, 15.0, 20.0, 25.0, 50.0];

/**
 * Calcule les informations de palier de réduction applicables sur le Merch
 */
export function calculateTierInfo(balance: number): DividendTierInfo {
  let prevTier = 0;
  let nextTier = TIERS[0];

  for (let i = 0; i < TIERS.length; i++) {
    if (balance < TIERS[i]) {
      nextTier = TIERS[i];
      prevTier = i > 0 ? TIERS[i - 1] : 0;
      break;
    }
    if (i === TIERS.length - 1) {
      prevTier = TIERS[i];
      nextTier = TIERS[i] + 5.0;
    }
  }

  const range = Math.max(0.01, nextTier - prevTier);
  const currentInRange = Math.max(0, balance - prevTier);
  const progressPercent = Math.min(100, Math.max(0, Math.round((currentInRange / range) * 100)));
  const remainingForTier = Math.max(0, Number((nextTier - balance).toFixed(3)));

  // Le montant de la remise équivaut au palier inférieur atteint
  const tierDiscount = prevTier > 0 ? prevTier : 0;

  return {
    currentTier: prevTier,
    nextTier,
    remainingForTier,
    progressPercent,
    tierDiscount,
  };
}

/**
 * Récupère le quota quotidien de générations IA rémunérées (max 5/jour)
 */
export function getDailyGenerationQuota(): DailyGenerationQuota {
  const today = new Date().toISOString().slice(0, 10);

  if (typeof window === 'undefined') {
    return {
      date: today,
      count: 0,
      maxDaily: DAILY_GENERATION_LIMIT,
      remainingToday: DAILY_GENERATION_LIMIT,
    };
  }

  try {
    const raw = localStorage.getItem(DAILY_GEN_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.date === today) {
        const count = typeof parsed.count === 'number' ? parsed.count : 0;
        return {
          date: today,
          count,
          maxDaily: DAILY_GENERATION_LIMIT,
          remainingToday: Math.max(0, DAILY_GENERATION_LIMIT - count),
        };
      }
    }
  } catch (e) {
    console.warn('[DividendWallet] Erreur lecture quota quotidien :', e);
  }

  return {
    date: today,
    count: 0,
    maxDaily: DAILY_GENERATION_LIMIT,
    remainingToday: DAILY_GENERATION_LIMIT,
  };
}

/**
 * Récupère les données du portefeuille depuis le localStorage (initialisation stricte à 0.00 €)
 */
export function getDividendWallet(): DividendWalletData {
  if (typeof window === 'undefined') {
    return {
      balance: DEFAULT_INITIAL_BALANCE,
      totalEarned: DEFAULT_INITIAL_BALANCE,
      history: [],
    };
  }

  try {
    // 1. Lecture du wallet v2 (calibré)
    const rawV2 = localStorage.getItem(STORAGE_KEY);
    if (rawV2) {
      const parsed = JSON.parse(rawV2);
      return {
        balance: typeof parsed.balance === 'number' ? Math.max(0, parsed.balance) : DEFAULT_INITIAL_BALANCE,
        totalEarned: typeof parsed.totalEarned === 'number' ? Math.max(0, parsed.totalEarned) : DEFAULT_INITIAL_BALANCE,
        history: Array.isArray(parsed.history) ? parsed.history : [],
      };
    }

    // 2. Migration depuis v1 si présent : suppression stricte du bonus factice de 4.50 €
    const rawV1 = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (rawV1) {
      try {
        const parsedV1 = JSON.parse(rawV1);
        const filteredHistory: DividendTransaction[] = Array.isArray(parsedV1.history)
          ? parsedV1.history.filter((tx: DividendTransaction) => tx.id !== 'init_welcome' && !tx.reason?.includes('Bienvenue'))
          : [];

        // Calcul du vrai solde réel accumulé sans le bonus de bienvenue
        const realEarned = filteredHistory.reduce((acc, tx) => acc + (typeof tx.amount === 'number' ? tx.amount : 0), 0);
        const migratedData: DividendWalletData = {
          balance: Number(realEarned.toFixed(3)),
          totalEarned: Number(realEarned.toFixed(3)),
          history: filteredHistory,
        };

        localStorage.setItem(STORAGE_KEY, JSON.stringify(migratedData));
        localStorage.removeItem(LEGACY_STORAGE_KEY);
        return migratedData;
      } catch (err) {
        console.warn('[DividendWallet] Erreur migration v1 :', err);
      }
    }

    // 3. Nouveau profil utilisateur : démarre à 0.00 € sans bonus
    const initialData: DividendWalletData = {
      balance: DEFAULT_INITIAL_BALANCE,
      totalEarned: DEFAULT_INITIAL_BALANCE,
      history: [],
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initialData));
    return initialData;
  } catch (e) {
    console.warn('[DividendWallet] Erreur lecture localStorage :', e);
    return {
      balance: DEFAULT_INITIAL_BALANCE,
      totalEarned: DEFAULT_INITIAL_BALANCE,
      history: [],
    };
  }
}

/**
 * Crédite la cagnotte d'un montant unitaire net (ex: +0.01 € pour IA, +0.005 € pour visite de portail)
 */
export function creditDividend(amount: number, reason: string): DividendWalletData {
  const current = getDividendWallet();
  const roundedAmount = Number(amount.toFixed(3));
  const newBalance = Number((current.balance + roundedAmount).toFixed(3));
  const newTotal = Number((current.totalEarned + roundedAmount).toFixed(3));

  const newTransaction: DividendTransaction = {
    id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    amount: roundedAmount,
    reason,
    timestamp: Date.now(),
  };

  const updated: DividendWalletData = {
    balance: newBalance,
    totalEarned: newTotal,
    history: [newTransaction, ...current.history].slice(0, 30), // 30 dernières transactions
  };

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(
        new CustomEvent(EVENT_NAME, {
          detail: updated,
        })
      );
    } catch (e) {
      console.warn('[DividendWallet] Impossible de sauvegarder dans localStorage :', e);
    }
  }

  return updated;
}

/**
 * Enregistre la rémunération d'une génération IA (+0,01 €) avec limite stricte de 5 par jour
 */
export function recordStudioGenerationReward(): {
  rewarded: boolean;
  wallet: DividendWalletData;
  quota: DailyGenerationQuota;
  reason?: string;
} {
  const quota = getDailyGenerationQuota();
  const today = new Date().toISOString().slice(0, 10);

  if (quota.count >= DAILY_GENERATION_LIMIT) {
    return {
      rewarded: false,
      wallet: getDividendWallet(),
      quota,
      reason: `Plafond quotidien atteint (${DAILY_GENERATION_LIMIT}/${DAILY_GENERATION_LIMIT} générations rémunérées aujourd'hui)`,
    };
  }

  const newCount = quota.count + 1;
  const updatedQuota: DailyGenerationQuota = {
    date: today,
    count: newCount,
    maxDaily: DAILY_GENERATION_LIMIT,
    remainingToday: Math.max(0, DAILY_GENERATION_LIMIT - newCount),
  };

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(DAILY_GEN_STORAGE_KEY, JSON.stringify({ date: today, count: newCount }));
    } catch (e) {
      console.warn('[DividendWallet] Erreur sauvegarde quota quotidien :', e);
    }
  }

  const wallet = creditDividend(
    REWARD_STUDIO_GENERATION,
    `Génération Studio IA (${newCount}/${DAILY_GENERATION_LIMIT} du jour)`
  );

  return {
    rewarded: true,
    wallet,
    quota: updatedQuota,
  };
}

/**
 * Formate un montant en euros (€), affichant 3 décimales pour les fractions de centimes (+0,005 €)
 */
export function formatCurrency(amount: number): string {
  const hasSubCents = Number((Math.abs(amount) % 0.01).toFixed(4)) !== 0;
  return amount.toLocaleString('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: hasSubCents ? 3 : 2,
  });
}

/**
 * Hook React pour s'abonner en temps réel aux variations de la cagnotte et des quotas
 */
export function useDividendWallet() {
  const [wallet, setWallet] = useState<DividendWalletData>(() => getDividendWallet());
  const [dailyQuota, setDailyQuota] = useState<DailyGenerationQuota>(() => getDailyGenerationQuota());

  useEffect(() => {
    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<DividendWalletData>;
      if (customEvent.detail) {
        setWallet(customEvent.detail);
      } else {
        setWallet(getDividendWallet());
      }
      setDailyQuota(getDailyGenerationQuota());
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY || e.key === DAILY_GEN_STORAGE_KEY) {
        setWallet(getDividendWallet());
        setDailyQuota(getDailyGenerationQuota());
      }
    };

    window.addEventListener(EVENT_NAME, handleUpdate);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener(EVENT_NAME, handleUpdate);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const addCredit = useCallback((amount: number, reason: string) => {
    const result = creditDividend(amount, reason);
    setWallet(result);
    setDailyQuota(getDailyGenerationQuota());
    return result;
  }, []);

  const tierInfo = calculateTierInfo(wallet.balance);

  return {
    balance: wallet.balance,
    formattedBalance: formatCurrency(wallet.balance),
    totalEarned: wallet.totalEarned,
    formattedTotalEarned: formatCurrency(wallet.totalEarned),
    history: wallet.history,
    tierInfo,
    dailyQuota,
    addCredit,
  };
}
