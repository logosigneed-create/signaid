/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Droppaid.ai - Configuration & Services Firebase Auth
 * Support Authentification Email/Mot de passe & Google OAuth
 */

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  initializeAuth,
  indexedDBLocalPersistence,
  browserLocalPersistence,
  browserPopupRedirectResolver,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
  User,
  Auth,
} from 'firebase/auth';
import {
  initializeFirestore,
  getFirestore,
  Firestore,
} from 'firebase/firestore';
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
  FirebaseStorage,
} from 'firebase/storage';
import {
  getFunctions,
  httpsCallable,
  Functions,
} from 'firebase/functions';

// Configuration Firebase issue du fichier .env ou fallback officiel du projet signaid-prod
const firebaseConfig = {
  apiKey:
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_API_KEY) ||
    'AIzaSyDTSKpVei8lCANIQJBZmuKcsjEDIubnvcs',
  authDomain:
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_AUTH_DOMAIN) ||
    'signaid-prod.firebaseapp.com',
  projectId:
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_PROJECT_ID) ||
    'signaid-prod',
  storageBucket:
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_STORAGE_BUCKET) ||
    'signaid-prod.firebasestorage.app',
  messagingSenderId:
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_MESSAGING_SENDER_ID) ||
    '244540314192',
  appId:
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_APP_ID) ||
    '1:244540314192:web:814f987d2a6ece8ac67755',
};

// Initialisation singleton sécurisée
export const firebaseApp: FirebaseApp =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

/**
 * Proxy paresseux : le service réel n'est instancié qu'au PREMIER accès à une de ses
 * propriétés (clic Connexion, sauvegarde, écoute Firestore...), jamais à l'import du module.
 * Les consommateurs existants (`auth`, `db`, `storage`, `functions`) restent compatibles.
 */
function lazyService<T extends object>(factory: () => T): T {
  return new Proxy({} as T, {
    get(_t, prop) {
      const real = factory() as any;
      const value = Reflect.get(real, prop, real);
      return typeof value === 'function' ? value.bind(real) : value;
    },
    set(_t, prop, value) {
      const real = factory() as any;
      return Reflect.set(real, prop, value, real);
    },
    has(_t, prop) {
      return prop in (factory() as any);
    },
    getPrototypeOf() {
      return Object.getPrototypeOf(factory());
    },
  });
}

// Auth initialisé SANS popupRedirectResolver : évite le chargement de l'iframe
// `/__/auth/iframe.js` et de `apis.google.com/js/api.js` (canaux persistants qui empêchent
// Lighthouse d'atteindre le "network idle"). Le resolver n'est fourni qu'à la demande,
// lors d'un signInWithPopup (voir `browserPopupRedirectResolver` plus bas).
let authInstance: Auth | null = null;
export function getFirebaseAuth(): Auth {
  if (authInstance) return authInstance;
  try {
    authInstance = initializeAuth(firebaseApp, {
      persistence: [indexedDBLocalPersistence, browserLocalPersistence],
    });
  } catch {
    // Déjà initialisé (HMR / double import)
    authInstance = getAuth(firebaseApp);
  }
  return authInstance;
}
/** true uniquement si Firebase Auth a déjà été instancié (aucune initialisation déclenchée). */
export function isFirebaseAuthInitialized(): boolean {
  return authInstance !== null;
}
/** Utilisateur courant SANS initialiser Auth : renvoie null tant qu'Auth n'est pas démarré. */
export function peekCurrentUser(): User | null {
  return authInstance ? authInstance.currentUser : null;
}
export const auth: Auth = lazyService(getFirebaseAuth);
export { browserPopupRedirectResolver };

let firestoreInstance: Firestore | null = null;
export function getFirebaseDb(): Firestore {
  if (firestoreInstance) return firestoreInstance;
  try {
    firestoreInstance = initializeFirestore(firebaseApp, {
      ignoreUndefinedProperties: true,
      // Évite les canaux WebChannel longue durée bloquants quand ils sont bloqués/proxifiés
      experimentalAutoDetectLongPolling: true,
    });
  } catch {
    firestoreInstance = getFirestore(firebaseApp);
  }
  return firestoreInstance;
}
export const db: Firestore = lazyService(getFirebaseDb);

let storageInstance: FirebaseStorage | null = null;
export function getFirebaseStorage(): FirebaseStorage {
  return (storageInstance ??= getStorage(firebaseApp));
}
export const storage: FirebaseStorage = lazyService(getFirebaseStorage);

let functionsInstance: Functions | null = null;
export function getFirebaseFunctions(): Functions {
  return (functionsInstance ??= getFunctions(firebaseApp, 'us-central1'));
}
export const functions: Functions = lazyService(getFirebaseFunctions);
export { httpsCallable };

/**
 * Upload d'un logo vers Firebase Storage (/users/{uid}/logos/...)
 * Renvoie l'URL publique distante https://firebasestorage... ou null en cas d'impossibilité
 */
export async function uploadLogoToFirebaseStorage(
  fileOrBlob: Blob | File,
  userId?: string
): Promise<string | null> {
  try {
    const uid = userId || peekCurrentUser()?.uid || 'guest';
    const cleanExt = fileOrBlob.type.includes('png')
      ? 'png'
      : fileOrBlob.type.includes('webp')
      ? 'webp'
      : fileOrBlob.type.includes('svg')
      ? 'svg'
      : 'jpg';
    const filename = `logo_${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${cleanExt}`;
    const destinationRef = storageRef(storage, `users/${uid}/logos/${filename}`);
    const metadata = {
      contentType: fileOrBlob.type || 'image/png',
      cacheControl: 'public, max-age=31536000',
    };
    const uploadResult = await uploadBytes(destinationRef, fileOrBlob, metadata);
    const downloadUrl = await getDownloadURL(uploadResult.ref);
    return downloadUrl;
  } catch (err) {
    console.warn('[Firebase Storage] Upload échoué ou non autorisé (utilisation du fallback compressé) :', err);
    return null;
  }
}

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

/**
 * Connexion par Email et Mot de passe
 */
export async function loginWithEmail(email: string, pass: string): Promise<User> {
  const userCredential = await signInWithEmailAndPassword(auth, email.trim(), pass);
  return userCredential.user;
}

/**
 * Création de compte par Email et Mot de passe
 */
export async function registerWithEmail(
  email: string,
  pass: string,
  displayName?: string
): Promise<User> {
  const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), pass);
  if (displayName && userCredential.user) {
    try {
      await updateProfile(userCredential.user, { displayName });
    } catch (e) {
      console.warn('[Firebase] Erreur mise à jour profil:', e);
    }
  }
  return userCredential.user;
}

/**
 * Connexion via Google Popup
 */
export async function loginWithGoogle(): Promise<User> {
  const userCredential = await signInWithPopup(auth, googleProvider, browserPopupRedirectResolver);
  return userCredential.user;
}

/**
 * Déconnexion
 */
export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

/**
 * Réinitialisation du mot de passe par email
 */
/**
 * Réinitialisation du mot de passe par email
 */
export async function resetUserPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email.trim());
}

/**
 * Garantit qu'un utilisateur Firebase Auth est actif pour la session courante.
 * Si aucun utilisateur n'est connecté, connecte automatiquement l'utilisateur
 * de façon anonyme pour que le token d'authentification context.auth soit valide.
 */
export async function ensureFirebaseAuthUser(): Promise<User | null> {
  const realAuth = getFirebaseAuth();
  try {
    // Attend la restauration de session persistée avant de créer un compte anonyme
    await (realAuth as any).authStateReady?.();
  } catch {
    // ignoré
  }
  if (realAuth.currentUser) {
    return realAuth.currentUser;
  }
  try {
    const cred = await signInAnonymously(auth);
    return cred.user;
  } catch (err) {
    // Si l'authentification anonyme n'est pas activée sur le projet, ne bloque pas le client
    console.warn('[Firebase Auth] Authentification anonyme non disponible :', err);
    return null;
  }
}

/**
 * Récupère le jeton JWT ID Firebase actuel (avec obtention automatique si besoin)
 */
export async function getCurrentUserIdToken(): Promise<string | null> {
  let currentUser = getFirebaseAuth().currentUser;
  if (!currentUser) {
    currentUser = await ensureFirebaseAuthUser().catch(() => null);
  }
  if (!currentUser) return null;
  try {
    return await currentUser.getIdToken(false);
  } catch (err) {
    console.warn('[Firebase] Impossible d\'obtenir le token ID:', err);
    return null;
  }
}

export { onAuthStateChanged };
export type { User };

