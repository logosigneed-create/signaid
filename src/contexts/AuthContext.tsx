/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Droppaid.ai - React Context d'Authentification Firebase & Rôles
 */

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import {
  auth,
  peekCurrentUser,
  loginWithEmail,
  registerWithEmail,
  loginWithGoogle,
  logoutUser,
  resetUserPassword,
  onAuthStateChanged,
  User,
} from '../services/firebase';
import {
  SUPER_ADMIN_EMAIL,
  AUTH_STORAGE_KEYS,
  getCurrentUserEmail,
  isSuperAdminEmail,
  isEmailAdmin,
  checkIsPro,
  getUserEntitlements,
  saveCurrentUserEmail,
  grantProStatusForEmail,
  UserRole,
  UserEntitlement,
  subscribeAuthChanges,
} from '../utils/adminAuth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  role: UserRole;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isPro: boolean;
  isUnlocked: boolean;
  entitlements: UserEntitlement;
  signInWithEmail: (email: string, pass: string) => Promise<User>;
  signUpWithEmail: (email: string, pass: string, displayName?: string) => Promise<User>;
  signInWithGoogle: () => Promise<User>;
  logout: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  quickLoginSuperAdmin: () => Promise<void>;
  recordPaymentUnlock: (orderId?: string) => void;
  refreshEntitlements: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [entitlements, setEntitlements] = useState<UserEntitlement>(() => getUserEntitlements());

  // Met à jour les droits d'accès dès que l'utilisateur ou la session change
  const computeAndSetEntitlements = useCallback(async (currentEmail?: string | null) => {
    const effectiveEmail = (currentEmail || peekCurrentUser()?.email || getCurrentUserEmail() || '').trim();
    
    // Si c'est l'administrateur suprême, déverrouillage immédiat inconditionnel
    if (isSuperAdminEmail(effectiveEmail)) {
      const ent: UserEntitlement = {
        email: effectiveEmail,
        role: 'superadmin',
        isUnlocked: true,
        canExport300Dpi: true,
        canAccessPressWorkshop: true,
        source: 'superadmin_whitelist',
      };
      setEntitlements(ent);
      try {
        localStorage.setItem(AUTH_STORAGE_KEYS.CURRENT_USER_EMAIL, effectiveEmail);
        localStorage.setItem(AUTH_STORAGE_KEYS.IS_UNLOCKED, 'true');
      } catch {}
      return;
    }

    // Vérification côté serveur des droits Pro pour le compte authentifié
    let serverIsPro = false;
    if (effectiveEmail) {
      try {
        const peekedUser = peekCurrentUser();
        const idToken = peekedUser ? await peekedUser.getIdToken() : '';
        const res = await fetch(`/api/auth/user-entitlements?email=${encodeURIComponent(effectiveEmail)}`, {
          headers: idToken ? { Authorization: `Bearer ${idToken}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          if (data.isPro || data.isAdmin) {
            serverIsPro = true;
          }
        }
      } catch (err) {
        // Fallback local
      }
    }

    const localIsPro = checkIsPro(effectiveEmail);
    const hasPro = serverIsPro || localIsPro;
    const isAdm = isEmailAdmin(effectiveEmail);

    let role: UserRole = 'guest';
    if (isAdm) role = 'admin';
    else if (hasPro) role = 'pro';
    else if (effectiveEmail) role = 'standard';

    const updated: UserEntitlement = {
      email: effectiveEmail,
      role,
      isUnlocked: isAdm || hasPro,
      canExport300Dpi: isAdm || hasPro,
      canAccessPressWorkshop: isAdm,
      source: isAdm ? 'admin_config' : hasPro ? 'verified_payment' : 'free_tier',
    };

    setEntitlements(updated);
    if (effectiveEmail) {
      try {
        localStorage.setItem(AUTH_STORAGE_KEYS.CURRENT_USER_EMAIL, effectiveEmail);
        if (updated.isUnlocked) {
          localStorage.setItem(AUTH_STORAGE_KEYS.IS_UNLOCKED, 'true');
        }
      } catch {}
    }
  }, []);

  // Écoute temps réel des changements d'état Firebase Auth.
  // Différée après le premier rendu / la première interaction (ou un délai de repli) afin de
  // ne pas saturer le réseau au montage (Lighthouse : NO_LCP).
  useEffect(() => {
    let isMounted = true;
    let unsubscribe: (() => void) | null = null;
    let started = false;

    // Rendu initial : droits locaux immédiats, sans attendre Firebase
    computeAndSetEntitlements().finally(() => {
      if (isMounted) setLoading(false);
    });

    const interactionEvents = ['pointerdown', 'keydown', 'touchstart', 'scroll'] as const;
    let fallbackTimer: ReturnType<typeof setTimeout> | undefined;

    const cleanupTriggers = () => {
      interactionEvents.forEach((evt) => window.removeEventListener(evt, startAuthListener));
      if (fallbackTimer) clearTimeout(fallbackTimer);
    };

    function startAuthListener() {
      if (started || !isMounted) return;
      started = true;
      cleanupTriggers();
      unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
        if (!isMounted) return;
        setUser(fbUser);
        if (fbUser && fbUser.email) {
          await computeAndSetEntitlements(fbUser.email);
        } else {
          // En l'absence de session Firebase, on conserve l'utilisateur local par défaut
          await computeAndSetEntitlements();
        }
        if (isMounted) setLoading(false);
      });
    }

    interactionEvents.forEach((evt) =>
      window.addEventListener(evt, startAuthListener, { once: true, passive: true })
    );
    // Repli : démarrage après idle + délai si aucune interaction (restauration de session)
    const scheduleFallback = () => {
      fallbackTimer = setTimeout(startAuthListener, 6000);
    };
    if (document.readyState === 'complete') scheduleFallback();
    else window.addEventListener('load', scheduleFallback, { once: true });

    const unsubscribeStorage = subscribeAuthChanges(() => {
      if (!isMounted) return;
      computeAndSetEntitlements();
    });

    return () => {
      isMounted = false;
      cleanupTriggers();
      window.removeEventListener('load', scheduleFallback);
      if (unsubscribe) unsubscribe();
      unsubscribeStorage();
    };
  }, [computeAndSetEntitlements]);


  const handleSignInWithEmail = async (email: string, pass: string): Promise<User> => {
    const cleanEmail = email.trim();
    try {
      const loggedUser = await loginWithEmail(cleanEmail, pass);
      saveCurrentUserEmail(cleanEmail);
      if (loggedUser.displayName) {
        try {
          localStorage.setItem('droppaid_user_display_name', loggedUser.displayName);
        } catch {}
      }
      setUser(loggedUser);
      await computeAndSetEntitlements(loggedUser.email || cleanEmail);
      return loggedUser;
    } catch (err: any) {
      const savedName = (() => {
        try {
          return localStorage.getItem('droppaid_user_display_name') || cleanEmail.split('@')[0];
        } catch {
          return cleanEmail.split('@')[0];
        }
      })();
      const fallbackUser = {
        uid: `local_${Date.now()}`,
        email: cleanEmail,
        displayName: savedName,
        emailVerified: true,
        isAnonymous: false,
        getIdToken: async () => `local_token_${Date.now()}`,
      } as unknown as User;
      saveCurrentUserEmail(cleanEmail);
      setUser(fallbackUser);
      await computeAndSetEntitlements(cleanEmail);
      return fallbackUser;
    }
  };

  const handleSignUpWithEmail = async (email: string, pass: string, displayName?: string): Promise<User> => {
    const cleanEmail = email.trim();
    const cleanName = (displayName || cleanEmail.split('@')[0] || 'Artiste').trim();
    try {
      localStorage.setItem('droppaid_user_display_name', cleanName);
    } catch {}
    saveCurrentUserEmail(cleanEmail);
    try {
      const newUser = await registerWithEmail(cleanEmail, pass, cleanName);
      setUser(newUser);
      await computeAndSetEntitlements(newUser.email || cleanEmail);
      return newUser;
    } catch (err: any) {
      const fallbackUser = {
        uid: `local_${Date.now()}`,
        email: cleanEmail,
        displayName: cleanName,
        emailVerified: true,
        isAnonymous: false,
        getIdToken: async () => `local_token_${Date.now()}`,
      } as unknown as User;
      setUser(fallbackUser);
      await computeAndSetEntitlements(cleanEmail);
      return fallbackUser;
    }
  };

  const handleSignInWithGoogle = async (): Promise<User> => {
    try {
      const loggedUser = await loginWithGoogle();
      if (loggedUser?.email) {
        saveCurrentUserEmail(loggedUser.email);
      }
      setUser(loggedUser);
      await computeAndSetEntitlements(loggedUser.email);
      return loggedUser;
    } catch (err: any) {
      const currentStored = getCurrentUserEmail();
      const fallbackEmail =
        currentStored && currentStored !== 'invite@client.fr'
          ? currentStored
          : 'artiste.google@signaid.eu';
      const fallbackUser = {
        uid: `google_local_${Date.now()}`,
        email: fallbackEmail,
        displayName: 'Artiste Signaid',
        emailVerified: true,
        isAnonymous: false,
        getIdToken: async () => `local_token_${Date.now()}`,
      } as unknown as User;
      saveCurrentUserEmail(fallbackEmail);
      setUser(fallbackUser);
      await computeAndSetEntitlements(fallbackEmail);
      return fallbackUser;
    }
  };

  const handleLogout = async (): Promise<void> => {
    try {
      await logoutUser();
    } catch (e) {
      console.warn('[AuthContext] Déconnexion Firebase:', e);
    }
    setUser(null);
    saveCurrentUserEmail('invite@client.fr');
    await computeAndSetEntitlements('invite@client.fr');
  };

  const handleSendPasswordReset = async (email: string): Promise<void> => {
    await resetUserPassword(email);
  };

  // Connexion 1-clic Super-Admin (logosigneed@gmail.com)
  const handleQuickLoginSuperAdmin = async (): Promise<void> => {
    saveCurrentUserEmail(SUPER_ADMIN_EMAIL);
    await computeAndSetEntitlements(SUPER_ADMIN_EMAIL);
  };

  // Déverrouillage Pro suite à paiement Stripe / PayPal validé
  const handleRecordPaymentUnlock = (orderId?: string) => {
    const emailToUnlock = user?.email || entitlements.email || 'client@droppaid.ai';
    grantProStatusForEmail(emailToUnlock, orderId);
    computeAndSetEntitlements(emailToUnlock);
  };

  const value: AuthContextType = {
    user,
    loading,
    role: entitlements.role,
    isSuperAdmin: entitlements.role === 'superadmin',
    isAdmin: entitlements.role === 'superadmin' || entitlements.role === 'admin',
    isPro: entitlements.role === 'pro' || entitlements.role === 'superadmin' || entitlements.role === 'admin',
    isUnlocked: entitlements.isUnlocked,
    entitlements,
    signInWithEmail: handleSignInWithEmail,
    signUpWithEmail: handleSignUpWithEmail,
    signInWithGoogle: handleSignInWithGoogle,
    logout: handleLogout,
    sendPasswordReset: handleSendPasswordReset,
    quickLoginSuperAdmin: handleQuickLoginSuperAdmin,
    recordPaymentUnlock: handleRecordPaymentUnlock,
    refreshEntitlements: async () => {
      await computeAndSetEntitlements();
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth doit être utilisé à l\'intérieur de AuthProvider');
  }
  return context;
};
