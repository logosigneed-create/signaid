import React, { useState, useEffect } from 'react';
import { Sparkles, AlertTriangle, Check, AlertCircle, X, ShieldAlert } from 'lucide-react';
import { ToastItem, ToastType, subscribeToast } from '../utils/toastEmitter';

export const ToastNotification: React.FC = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeToast((newToast) => {
      setToasts((prev) => {
        // Garder au maximum 3 toasts visibles pour éviter l'encombrement
        const filtered = prev.filter((t) => t.id !== newToast.id).slice(-2);
        return [...filtered, newToast];
      });

      // Nettoyage automatique après expiration
      if (newToast.duration > 0) {
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
        }, newToast.duration);
      }
    });

    // Également écouter l'événement DOM CustomEvent pour robustesse
    const handleCustomEvent = (e: Event) => {
      const customEvent = e as CustomEvent<ToastItem>;
      if (customEvent.detail) {
        const item = customEvent.detail;
        setToasts((prev) => {
          if (prev.some((t) => t.id === item.id)) return prev;
          const filtered = prev.slice(-2);
          return [...filtered, item];
        });
        if (item.duration > 0) {
          setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== item.id));
          }, item.duration);
        }
      }
    };

    window.addEventListener('droppaid:toast', handleCustomEvent);

    return () => {
      unsubscribe();
      window.removeEventListener('droppaid:toast', handleCustomEvent);
    };
  }, []);

  const handleDismiss = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed top-4 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-[99999] pointer-events-none flex flex-col gap-2.5 transition-all"
    >
      {toasts.map((toast) => {
        const isWarning = toast.type === 'warning';
        const isError = toast.type === 'error';
        const isSuccess = toast.type === 'success';

        let badgeBg = 'bg-lime-400/20 text-lime-400 border-lime-400/30';
        let borderColor = 'border-zinc-700/80 hover:border-lime-400/40';
        let IconComponent = Sparkles;
        let iconColor = 'text-lime-400';
        let label = 'MODE SECOURS';

        if (isWarning) {
          badgeBg = 'bg-amber-400/20 text-amber-400 border-amber-400/30';
          borderColor = 'border-amber-500/40';
          IconComponent = AlertTriangle;
          iconColor = 'text-amber-400';
          label = 'ATTENTION';
        } else if (isError) {
          badgeBg = 'bg-rose-400/20 text-rose-400 border-rose-400/30';
          borderColor = 'border-rose-500/40';
          IconComponent = AlertCircle;
          iconColor = 'text-rose-400';
          label = 'ERREUR';
        } else if (isSuccess) {
          badgeBg = 'bg-emerald-400/20 text-emerald-400 border-emerald-400/30';
          borderColor = 'border-emerald-500/40';
          IconComponent = Check;
          iconColor = 'text-emerald-400';
          label = 'SUCCÈS';
        }

        return (
          <div
            key={toast.id}
            role="status"
            className={`pointer-events-auto w-full bg-zinc-950/95 backdrop-blur-md border ${borderColor} rounded-2xl p-3.5 shadow-2xl shadow-black/80 flex items-start gap-3 transition-all duration-300 animate-in fade-in slide-in-from-top-2`}
          >
            <div className={`p-2 rounded-xl bg-zinc-900 border border-zinc-800 ${iconColor} shrink-0 mt-0.5`}>
              <IconComponent className="w-4 h-4" />
            </div>

            <div className="flex-1 min-w-0 pr-1">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${badgeBg} uppercase tracking-wider`}>
                  {label}
                </span>
                <span className="text-[10px] font-mono text-zinc-500">
                  {new Date(toast.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
              <p className="text-xs font-mono text-zinc-200 leading-relaxed break-words">
                {toast.message}
              </p>
            </div>

            <button
              type="button"
              onClick={() => handleDismiss(toast.id)}
              className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition-colors shrink-0"
              aria-label="Fermer la notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
