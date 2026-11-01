/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Droppaid.ai / Signaid - Modale de Verrouillage & Déploiement (AuthGateModal)
 */

import React from 'react';

export interface AuthGateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGoogleSignIn: () => Promise<void> | void;
  onOpenEmailAuth: () => void;
  isSubmitting?: boolean;
  title?: string;
  description?: string;
  badgeText?: string;
}

export const AuthGateModal: React.FC<AuthGateModalProps> = ({
  isOpen,
  onClose,
  onGoogleSignIn,
  onOpenEmailAuth,
  isSubmitting = false,
  title = "Votre portail est prêt à être déployé",
  description = "Créez votre compte en 1 clic pour sauvegarder votre design, activer votre lien public permanent et synchroniser votre Google Agenda.",
  badgeText = "✦ INFRASTRUCTURE PRÊTE",
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 select-none animate-fadeIn">
      <div className="relative w-full max-w-md rounded-3xl bg-zinc-950 border-2 border-lime-400 p-6 shadow-[0_0_50px_rgba(57,255,20,0.25)] text-center space-y-5">
        
        {/* Badge et Titre de confirmation */}
        <div className="space-y-2">
          <span className="inline-block px-3 py-1 rounded-full bg-lime-400/10 border border-lime-400/30 text-lime-400 font-mono text-[11px] font-black uppercase tracking-wider">
            {badgeText}
          </span>
          <h3 className="text-lg font-black text-white uppercase tracking-tight">
            {title}
          </h3>
          <p className="text-xs text-zinc-300 font-mono leading-relaxed">
            {description}
          </p>
        </div>

        {/* Boutons d'inscription rapide */}
        <div className="space-y-2.5 pt-1">
          {/* Connexion Google en 1 clic */}
          <button
            type="button"
            disabled={isSubmitting}
            onClick={async () => {
              await onGoogleSignIn();
            }}
            className="w-full py-3 px-4 rounded-xl bg-white hover:bg-zinc-100 text-black font-bold font-mono text-xs flex items-center justify-center gap-2 shadow-md transition cursor-pointer active:scale-98 disabled:opacity-50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            <span>Continuer avec Google</span>
          </button>

          {/* Option Email / Mot de passe */}
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => {
              // Bascule vers le formulaire email existant
              onOpenEmailAuth();
            }}
            className="w-full py-2.5 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 font-mono text-xs transition cursor-pointer disabled:opacity-50"
          >
            Créer avec une adresse e-mail
          </button>
        </div>

        {/* Mention de réassurance */}
        <span className="block text-[10px] font-mono text-zinc-500">
          🔒 Vos créations graphiques et vos configurations sont déjà sauvegardées.
        </span>

        {/* Bouton fermeture discret */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 rounded-lg text-zinc-400 hover:text-white transition cursor-pointer"
        >
          ✕
        </button>
      </div>
    </div>
  );
};
