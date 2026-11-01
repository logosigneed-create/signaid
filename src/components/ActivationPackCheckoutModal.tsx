/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Droppaid.ai - Modale d'Offre Post-Déploiement : Pack d'Activation Physique (500 Flyers A6)
 */

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, X } from 'lucide-react';

interface ActivationPackCheckoutModalProps {
  isOpen: boolean;
  onClose?: () => void;
  currentProjectId: string;
  currentEventSlug: string;
  onTriggerStripe?: (projectId: string) => Promise<void>;
}

export const ActivationPackCheckoutModal: React.FC<ActivationPackCheckoutModalProps> = ({
  isOpen,
  onClose,
  currentProjectId,
  currentEventSlug,
  onTriggerStripe,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const triggerStripeActivationPack = async (projectId: string) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      if (onTriggerStripe) {
        await onTriggerStripe(projectId);
        return;
      }

      // Appel de l'API session Stripe Checkout avec metadata { projectId, type: 'activation_pack_500' }
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          type: 'activation_pack_500',
          eventSlug: currentEventSlug,
          currentEventSlug,
          returnUrl: window.location.origin,
        }),
      });

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else if (data.success && data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        // En cas de mock ou absence de clé Stripe en dev local
        console.info('[ActivationPack] Redirection simulateur ou Hub :', data);
        window.location.href = `/hub/${currentEventSlug}?pack_ordered=true`;
      }
    } catch (err: any) {
      console.error('[ActivationPack] Erreur création session Stripe :', err);
      setErrorMsg('Impossible de contacter Stripe pour le moment.');
      // Fallback vers le lien public après bref message
      setTimeout(() => {
        window.location.href = `/hub/${currentEventSlug}`;
      }, 1500);
    } finally {
      setIsLoading(false);
    }
  };

  const modalElement = (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 select-none animate-fadeIn">
      <div className="relative w-full max-w-lg rounded-3xl bg-zinc-950 border-2 border-lime-400 p-6 sm:p-8 shadow-[0_0_60px_rgba(57,255,20,0.25)] space-y-6 text-center">

        {/* Bouton de fermeture optionnel en coin */}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-200 text-sm font-bold p-1 rounded-lg hover:bg-zinc-900 transition cursor-pointer"
            title="Fermer"
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Statut Système Validé */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-lime-400/10 border border-lime-400/30 text-lime-400 font-mono text-xs font-black uppercase tracking-wider">
          <span className="w-2 h-2 rounded-full bg-lime-400 animate-ping" />
          <span>Portail Actif &amp; En Ligne</span>
        </div>

        {/* Pitch de conversion Pack d'Activation */}
        <div className="space-y-3">
          <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight">
            Activez votre Passerelle Physique
          </h2>
          <p className="text-xs sm:text-sm text-zinc-300 font-mono leading-relaxed">
            Votre portail est en ligne et fonctionnel. Pour diriger le trafic physique vers votre infrastructure, commandez votre <span className="text-lime-400 font-bold">Pack d'Activation</span> : 500 flyers premium imprimés avec le QR code unique de votre portail. La commande part directement en production et vous est livrée sous 72h.
          </p>
        </div>

        {/* Carte récapitulative du Pack */}
        <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 text-left space-y-2.5 font-mono text-xs">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <span className="text-zinc-400">Contenu :</span>
            <span className="text-white font-bold">500 Flyers A6 Premium (Finition Mat)</span>
          </div>
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <span className="text-zinc-400">Passerelle :</span>
            <span className="text-lime-400 font-bold">QR Code vectoriel vers votre Hub</span>
          </div>
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <span className="text-zinc-400">Livraison :</span>
            <span className="text-white font-bold">Directe en marque blanche (72h)</span>
          </div>
          <div className="flex items-center justify-between pt-1">
            <span className="text-zinc-300 font-bold">Tarif Activation :</span>
            <span className="text-lg font-black text-lime-400">49 € TTC</span>
          </div>
        </div>

        {errorMsg && (
          <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono">
            {errorMsg}
          </div>
        )}

        {/* Actions : Commander ou Accéder au Hub */}
        <div className="space-y-2 pt-1">
          {/* Bouton Stripe Checkout pour le Pack */}
          <button
            type="button"
            disabled={isLoading}
            onClick={async () => {
              // Appel session Stripe Checkout avec metadata { projectId, type: 'activation_pack_500' }
              await triggerStripeActivationPack(currentProjectId);
            }}
            className="w-full py-3.5 px-4 rounded-xl bg-lime-400 hover:bg-lime-300 text-black font-black font-mono text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-lime-400/25 active:scale-98 transition cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-black" />
                <span>Connexion Stripe Sécurisée...</span>
              </>
            ) : (
              <>
                <span>⚡</span>
                <span>Commander mon Pack d'Activation (49 €)</span>
              </>
            )}
          </button>

          {/* Option secondaire : Voir mon lien public seul */}
          <button
            type="button"
            onClick={() => {
              window.location.href = `/hub/${currentEventSlug}`;
            }}
            className="w-full py-2.5 px-4 rounded-xl text-zinc-400 hover:text-white font-mono text-xs transition cursor-pointer"
          >
            Accéder uniquement à mon lien public en ligne ›
          </button>
        </div>

        <span className="block text-[10px] font-mono text-zinc-500">
          Production automatisée par API • Zéro gestion logistique requise
        </span>
      </div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(modalElement, document.body);
  }

  return modalElement;
};
