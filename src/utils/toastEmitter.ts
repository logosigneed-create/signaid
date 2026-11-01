/**
 * Système d'émission et de notification Toast non bloquant pour Droppaid / Signaid Studio
 * Permet d'afficher des notifications discrètes sans interrompre l'expérience utilisateur.
 */

export type ToastType = 'info' | 'warning' | 'success' | 'error';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
  timestamp: number;
}

type ToastListener = (toast: ToastItem) => void;
const listeners = new Set<ToastListener>();

export function showToast(
  message: string,
  type: ToastType = 'info',
  duration = 4500
): ToastItem {
  const item: ToastItem = {
    id: `toast_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    message,
    type,
    duration,
    timestamp: Date.now(),
  };

  listeners.forEach((listener) => {
    try {
      listener(item);
    } catch (e) {
      console.warn('[ToastEmitter] Erreur dans un listener toast :', e);
    }
  });

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('droppaid:toast', {
        detail: item,
      })
    );
  }

  return item;
}

export function subscribeToast(listener: ToastListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
