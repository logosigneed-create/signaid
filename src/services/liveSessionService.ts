import { db, auth } from '../firebaseConfig';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { EventInput } from '../types';
import { cleanProjectForSerialization } from '../utils/storageSanitizer';

export interface SharedSessionRecord {
  sessionId: string;
  userId: string;
  userEmail: string;
  userName?: string;
  input: EventInput;
  isLiveRequested: boolean;
  updatedAt: any;
  status: 'draft' | 'live_active' | 'finished';
}

/**
 * Sauvegarde ou met à jour la session de l'utilisateur
 */
export async function saveOrUpdateUserSession(
  sessionId: string,
  input: EventInput,
  isLiveRequested: boolean = false
): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error("Utilisateur non connecté");

  const sessionRef = doc(db, 'shared_sessions', sessionId);

  // Sérialisation propre évitant les fonctions, undefined et imbrications récursives
  const cleanInput: EventInput = cleanProjectForSerialization(input) as EventInput;
  delete (cleanInput as any).input;

  let existingUserId = user.uid;
  let existingUserEmail = user.email || '';
  let existingUserName = user.displayName || user.email?.split('@')[0] || 'Artiste';

  try {
    const snap = await getDoc(sessionRef);
    if (snap.exists()) {
      const data = snap.data();
      if (data?.userId && data.userId !== user.uid) {
        // L'admin intervient sur la session de l'artiste : on préserve l'identifiant originel de l'artiste
        existingUserId = data.userId;
        existingUserEmail = data.userEmail || existingUserEmail;
        existingUserName = data.userName || existingUserName;
      }
    }
  } catch (err) {
    console.warn('[liveSessionService] Info session préexistante non disponible:', err);
  }

  await setDoc(
    sessionRef,
    {
      sessionId,
      userId: existingUserId,
      userEmail: existingUserEmail,
      userName: existingUserName,
      input: cleanInput,
      isLiveRequested,
      updatedAt: serverTimestamp(),
      status: isLiveRequested ? 'live_active' : 'draft',
    },
    { merge: true }
  );
}

/**
 * Écoute en temps réel les modifications d'une session spécifique
 */
export function listenToSession(
  sessionId: string,
  onUpdate: (session: SharedSessionRecord) => void
) {
  const sessionRef = doc(db, 'shared_sessions', sessionId);
  return onSnapshot(
    sessionRef,
    (snapshot) => {
      if (snapshot.exists()) {
        onUpdate(snapshot.data() as SharedSessionRecord);
      }
    },
    (err: any) => {
      const isPermissionDenied =
        err?.code === 'permission-denied' ||
        (typeof err?.message === 'string' && (
          err.message.includes('permission') ||
          err.message.includes('insufficient permissions')
        ));
      if (!isPermissionDenied) {
        console.warn(`[liveSessionService] Erreur listenToSession (${sessionId}):`, err);
      }
    }
  );
}

/**
 * Pour l'Admin : écoute toutes les sessions demandant une assistance en live
 */
export function listenToLiveRequests(
  onUpdate: (sessions: SharedSessionRecord[]) => void
) {
  if (!auth.currentUser) {
    return () => {};
  }
  try {
    const q = query(
      collection(db, 'shared_sessions'),
      where('isLiveRequested', '==', true),
      where('status', '==', 'live_active')
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const list: SharedSessionRecord[] = [];
        snapshot.forEach((docSnap) => {
          list.push(docSnap.data() as SharedSessionRecord);
        });
        onUpdate(list);
      },
      (err: any) => {
        const isPermissionDenied =
          err?.code === 'permission-denied' ||
          (typeof err?.message === 'string' && (
            err.message.includes('permission') ||
            err.message.includes('insufficient permissions')
          ));
        if (!isPermissionDenied) {
          console.warn('[liveSessionService] Erreur listenToLiveRequests:', err);
        }
      }
    );
  } catch (err: any) {
    const isPermissionDenied =
      err?.code === 'permission-denied' ||
      (typeof err?.message === 'string' && (
        err.message.includes('permission') ||
        err.message.includes('insufficient permissions')
      ));
    if (!isPermissionDenied) {
      console.warn('[liveSessionService] Exception synchrone listenToLiveRequests:', err);
    }
    return () => {};
  }
}

/**
 * Clôture une session live (remet isLiveRequested à false et statut à finished)
 */
export async function finishLiveSession(sessionId: string): Promise<void> {
  const sessionRef = doc(db, 'shared_sessions', sessionId);
  await setDoc(
    sessionRef,
    {
      isLiveRequested: false,
      status: 'finished',
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}
