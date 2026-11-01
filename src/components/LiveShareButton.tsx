/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Droppaid.ai - Bouton d'Action Live Co-Studio & Demande d'Aide en Direct
 */

import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { saveOrUpdateUserSession } from '../services/liveSessionService';
import { EventInput } from '../types';
import { Radio, Check, Loader2 } from 'lucide-react';

interface LiveShareButtonProps {
  input: EventInput;
  sessionId: string;
  isDayMode?: boolean;
  className?: string;
  onRequireAuth?: () => void;
  fullWidth?: boolean;
}

export const LiveShareButton: React.FC<LiveShareButtonProps> = ({
  input,
  sessionId,
  isDayMode = false,
  className = '',
  onRequireAuth,
  fullWidth = false,
}) => {
  const { user } = useAuth();
  const [isSending, setIsSending] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleTriggerLive = async () => {
    if (!user) {
      if (onRequireAuth) {
        onRequireAuth();
        return;
      }
      alert("Connectez-vous d'abord pour partager votre projet en direct !");
      return;
    }

    setIsSending(true);
    try {
      await saveOrUpdateUserSession(sessionId, input, true);
      setIsSent(true);
      setTimeout(() => setIsSent(false), 5000);
    } catch (err) {
      console.error(err);
      alert("Erreur lors de l'envoi de la demande live.");
    } finally {
      setIsSending(false);
    }
  };

  if (fullWidth) {
    return (
      <button
        type="button"
        onClick={handleTriggerLive}
        disabled={isSending}
        title="Partager mon projet en direct avec le studio pour assistance en live"
        className={`w-full p-2.5 rounded-xl border flex items-center justify-between transition font-mono text-xs cursor-pointer ${
          isSent
            ? 'bg-lime-400/20 border-lime-400/50 text-lime-400 font-bold'
            : isDayMode
            ? 'bg-zinc-50 border-zinc-200 text-zinc-800 hover:border-zinc-300'
            : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700'
        } ${className}`}
      >
        <div className="flex items-center gap-2.5">
          {isSending ? (
            <Loader2 className="w-4 h-4 animate-spin text-lime-400" />
          ) : isSent ? (
            <Check className="w-4 h-4 text-lime-400 stroke-[3]" />
          ) : (
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          )}
          <span>{isSent ? 'Session Live Envoyée !' : 'Aide en Live'}</span>
        </div>
        <span className="text-[10px] text-zinc-500">
          {isSent ? 'Actif' : 'Direct'}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleTriggerLive}
      disabled={isSending}
      title="Partager mon projet en direct avec le studio pour assistance en live"
      className={`px-3 py-1.5 rounded-xl font-mono text-xs font-medium inline-flex items-center gap-1.5 transition-colors border shadow-sm cursor-pointer ${
        isSent
          ? 'bg-lime-400 text-black border-lime-400 font-bold'
          : isDayMode
          ? 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900'
          : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white'
      } dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white ${className}`}
    >
      {isSending ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : isSent ? (
        <Check className="w-3.5 h-3.5 stroke-[3]" />
      ) : (
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
      )}
      <span>{isSent ? 'Session Live Envoyée !' : 'Aide en Live'}</span>
    </button>
  );
};
