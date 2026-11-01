/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Droppaid.ai - Gestionnaire d'Authentification, Rôles & Reconnaissance Administrateur
 * Whitelisting Administrateur Suprême (logosigneed@gmail.com) & Sécurisation Pro / 300 DPI
 */

// Email administrateur suprême inviolable
export const SUPER_ADMIN_EMAIL = 'logosigneed@gmail.com';
export const DEFAULT_ADMIN_EMAIL = 'logosigneed@gmail.com';

export const AUTH_STORAGE_KEYS = {
  ADMIN_EMAIL: 'droppaid_admin_email',
  CURRENT_USER_EMAIL: 'droppaid_current_user_email',
  IS_UNLOCKED: 'droppaid_is_unlocked',
  USER_ROLE: 'droppaid_user_role',
  PRO_ENTITLEMENT: 'droppaid_pro_entitlement',
} as const;

export const AUTH_EVENT_NAME = 'droppaid_auth_state_change';

export type UserRole = 'superadmin' | 'admin' | 'pro' | 'standard' | 'guest';

export interface UserEntitlement {
  email: string;
  role: UserRole;
  isUnlocked: boolean;
  canExport300Dpi: boolean;
  canAccessPressWorkshop: boolean;
  source: 'superadmin_whitelist' | 'admin_config' | 'verified_payment' | 'free_tier';
  orderId?: string;
  verifiedAt?: string;
}

/**
 * Récupère l'email admin défini dans la variable d'environnement Vite (.env)
 */
export function getEnvAdminEmail(): string {
  const envVal =
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_ADMIN_EMAIL) ||
    (typeof process !== 'undefined' && process.env?.VITE_ADMIN_EMAIL);
  return typeof envVal === 'string' && envVal.trim() ? envVal.trim().toLowerCase() : '';
}

/**
 * Récupère l'email administrateur de référence configuré.
 * Priorité : LocalStorage > .env (VITE_ADMIN_EMAIL) > SUPER_ADMIN_EMAIL
 */
export function getConfiguredAdminEmail(): string {
  try {
    const fromStorage = localStorage.getItem(AUTH_STORAGE_KEYS.ADMIN_EMAIL);
    if (fromStorage && fromStorage.trim()) {
      return fromStorage.trim().toLowerCase();
    }
  } catch (err) {
    console.warn('[AdminAuth] LocalStorage indisponible:', err);
  }

  const fromEnv = getEnvAdminEmail();
  if (fromEnv) {
    return fromEnv;
  }

  return SUPER_ADMIN_EMAIL.toLowerCase();
}

/**
 * Indique si l'email administrateur a été personnalisé via le LocalStorage
 */
export function isCustomAdminEmail(): boolean {
  try {
    const val = localStorage.getItem(AUTH_STORAGE_KEYS.ADMIN_EMAIL);
    return Boolean(val && val.trim() && val.trim().toLowerCase() !== SUPER_ADMIN_EMAIL.toLowerCase());
  } catch {
    return false;
  }
}

/**
 * Récupère l'email de l'utilisateur actuellement connecté en session.
 */
export function getCurrentUserEmail(): string {
  try {
    const stored = localStorage.getItem(AUTH_STORAGE_KEYS.CURRENT_USER_EMAIL);
    if (stored !== null && stored.trim() !== '') {
      return stored.trim();
    }
  } catch (err) {
    console.warn('[AdminAuth] Erreur lecture utilisateur connecté:', err);
  }
  return '';
}

/**
 * Vérifie si une adresse email correspond à l'administrateur suprême inviolable (logosigneed@gmail.com)
 */
export function isSuperAdminEmail(email?: string | null): boolean {
  if (!email || typeof email !== 'string') return false;
  const clean = email.trim().toLowerCase();
  return clean === SUPER_ADMIN_EMAIL.toLowerCase();
}

/**
 * Vérifie si une adresse email correspond à un administrateur (Suprême ou Configuré).
 */
export function isEmailAdmin(email?: string | null, customAdminRef?: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const targetEmail = email.trim().toLowerCase();
  if (!targetEmail) return false;

  // L'administrateur suprême est toujours reconnu
  if (isSuperAdminEmail(targetEmail)) {
    return true;
  }

  const adminRef = (customAdminRef || getConfiguredAdminEmail()).toLowerCase();
  const validAdminList = adminRef
    .split(/[,;\s]+/)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  return validAdminList.includes(targetEmail);
}

/**
 * Vérifie si l'utilisateur actuel (ou spécifié) est administrateur.
 */
export function checkIsAdmin(userEmail?: string): boolean {
  const emailToCheck = userEmail !== undefined ? userEmail : getCurrentUserEmail();
  return isEmailAdmin(emailToCheck);
}

/**
 * Vérifie si l'utilisateur actuel est l'administrateur suprême.
 */
export function checkIsSuperAdmin(userEmail?: string): boolean {
  const emailToCheck = userEmail !== undefined ? userEmail : getCurrentUserEmail();
  return isSuperAdminEmail(emailToCheck);
}

/**
 * Vérifie si un utilisateur possède un droit Pro (soit par Admin, soit par paiement Stripe/PayPal enregistré)
 */
export function checkIsPro(userEmail?: string): boolean {
  const emailToCheck = (userEmail !== undefined ? userEmail : getCurrentUserEmail()).trim().toLowerCase();
  if (!emailToCheck) return false;

  // L'administrateur a automatiquement tous les droits Pro
  if (isEmailAdmin(emailToCheck)) return true;

  try {
    const rawEntitlement = localStorage.getItem(AUTH_STORAGE_KEYS.PRO_ENTITLEMENT);
    if (rawEntitlement) {
      const parsed: Record<string, any> = JSON.parse(rawEntitlement);
      if (parsed[emailToCheck] && parsed[emailToCheck].isPro === true) {
        return true;
      }
    }
  } catch (e) {
    console.warn('[AdminAuth] Erreur vérification statut Pro:', e);
  }

  return false;
}

/**
 * Enregistre localement et diffuse la confirmation d'un paiement Pro validé pour un email
 */
export function grantProStatusForEmail(email: string, orderId?: string): void {
  const clean = email.trim().toLowerCase();
  if (!clean) return;

  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEYS.PRO_ENTITLEMENT) || '{}';
    const entitlements = JSON.parse(raw);
    entitlements[clean] = {
      isPro: true,
      orderId: orderId || `ORD-${Date.now()}`,
      verifiedAt: new Date().toISOString(),
    };
    localStorage.setItem(AUTH_STORAGE_KEYS.PRO_ENTITLEMENT, JSON.stringify(entitlements));
    localStorage.setItem(AUTH_STORAGE_KEYS.IS_UNLOCKED, 'true');
  } catch (err) {
    console.error('[AdminAuth] Erreur attribution statut Pro:', err);
  }

  emitAuthChange();
}

/**
 * Calcule les droits complets d'un utilisateur
 */
export function getUserEntitlements(userEmail?: string): UserEntitlement {
  const email = (userEmail !== undefined ? userEmail : getCurrentUserEmail()).trim().toLowerCase();

  if (isSuperAdminEmail(email)) {
    return {
      email,
      role: 'superadmin',
      isUnlocked: true,
      canExport300Dpi: true,
      canAccessPressWorkshop: true,
      source: 'superadmin_whitelist',
    };
  }

  if (isEmailAdmin(email)) {
    return {
      email,
      role: 'admin',
      isUnlocked: true,
      canExport300Dpi: true,
      canAccessPressWorkshop: true,
      source: 'admin_config',
    };
  }

  if (checkIsPro(email)) {
    return {
      email,
      role: 'pro',
      isUnlocked: true,
      canExport300Dpi: true,
      canAccessPressWorkshop: false,
      source: 'verified_payment',
    };
  }

  return {
    email,
    role: email ? 'standard' : 'guest',
    isUnlocked: false,
    canExport300Dpi: false,
    canAccessPressWorkshop: false,
    source: 'free_tier',
  };
}

let isEmitting = false;

/**
 * Notifie l'ensemble de l'application d'un changement d'état d'authentification
 * Protégé contre les récursions synchrones et les boucles infinies de stack overflow
 */
export function emitAuthChange(): void {
  if (isEmitting) {
    return;
  }
  isEmitting = true;
  try {
    window.dispatchEvent(new CustomEvent(AUTH_EVENT_NAME));
  } catch {
    // pass
  } finally {
    isEmitting = false;
  }
}

/**
 * Enregistre un nouvel email administrateur de référence (sauvegarde en LocalStorage)
 */
export function saveConfiguredAdminEmail(email: string): void {
  const clean = email.trim().toLowerCase();
  try {
    if (!clean || clean === SUPER_ADMIN_EMAIL.toLowerCase()) {
      localStorage.removeItem(AUTH_STORAGE_KEYS.ADMIN_EMAIL);
    } else {
      localStorage.setItem(AUTH_STORAGE_KEYS.ADMIN_EMAIL, clean);
    }

    const currentUser = getCurrentUserEmail();
    if (isEmailAdmin(currentUser, clean)) {
      localStorage.setItem(AUTH_STORAGE_KEYS.IS_UNLOCKED, 'true');
    }
  } catch (err) {
    console.error('[AdminAuth] Erreur sauvegarde email admin:', err);
  }
  emitAuthChange();
}

/**
 * Restaure l'email administrateur de référence vers la valeur par défaut (logosigneed@gmail.com)
 */
export function resetConfiguredAdminEmailToEnv(): void {
  try {
    localStorage.removeItem(AUTH_STORAGE_KEYS.ADMIN_EMAIL);
  } catch (err) {
    console.error('[AdminAuth] Erreur reset email admin:', err);
  }
  emitAuthChange();
}

/**
 * Enregistre l'email de l'utilisateur connecté en session
 */
export function saveCurrentUserEmail(email: string, forceEmit = false): void {
  const clean = email.trim();
  let hasChanged = false;
  try {
    const prevEmail = localStorage.getItem(AUTH_STORAGE_KEYS.CURRENT_USER_EMAIL);
    if (prevEmail !== clean) {
      localStorage.setItem(AUTH_STORAGE_KEYS.CURRENT_USER_EMAIL, clean);
      hasChanged = true;
    }
    const prevUnlocked = localStorage.getItem(AUTH_STORAGE_KEYS.IS_UNLOCKED);
    if (isEmailAdmin(clean) || checkIsPro(clean)) {
      if (prevUnlocked !== 'true') {
        localStorage.setItem(AUTH_STORAGE_KEYS.IS_UNLOCKED, 'true');
        hasChanged = true;
      }
    }
  } catch (err) {
    console.error('[AdminAuth] Erreur sauvegarde utilisateur connecté:', err);
  }
  if (hasChanged || forceEmit) {
    emitAuthChange();
  }
}

/**
 * Connexion 1-clic avec le compte Administrateur Suprême
 */
export function loginAsAdmin(): void {
  saveCurrentUserEmail(SUPER_ADMIN_EMAIL, true);
  try {
    localStorage.setItem(AUTH_STORAGE_KEYS.IS_UNLOCKED, 'true');
  } catch {
    // pass
  }
}

/**
 * Bascule en mode invité / utilisateur standard pour tester le paiement et les verrous
 */
export function logoutToGuest(): void {
  try {
    localStorage.setItem(AUTH_STORAGE_KEYS.CURRENT_USER_EMAIL, 'invite@client.fr');
    localStorage.setItem(AUTH_STORAGE_KEYS.IS_UNLOCKED, 'false');
  } catch {
    // pass
  }
  emitAuthChange();
}

/**
 * Calcule l'état isUnlocked initial au démarrage de l'application.
 * Règle impérative : Dès qu'un utilisateur correspond à logosigneed@gmail.com ou à l'admin,
 * isUnlocked est garanti à true !
 */
export function getInitialUnlockedState(): boolean {
  try {
    const currentUser = getCurrentUserEmail();
    if (isEmailAdmin(currentUser) || checkIsPro(currentUser)) {
      localStorage.setItem(AUTH_STORAGE_KEYS.IS_UNLOCKED, 'true');
      return true;
    }
    return localStorage.getItem(AUTH_STORAGE_KEYS.IS_UNLOCKED) === 'true';
  } catch {
    return false;
  }
}

/**
 * Permet à un composant React de s'abonner aux changements d'authentification
 */
export function subscribeAuthChanges(callback: () => void): () => void {
  const handleEvent = () => callback();
  window.addEventListener(AUTH_EVENT_NAME, handleEvent);
  window.addEventListener('storage', handleEvent);

  return () => {
    window.removeEventListener(AUTH_EVENT_NAME, handleEvent);
    window.removeEventListener('storage', handleEvent);
  };
}
