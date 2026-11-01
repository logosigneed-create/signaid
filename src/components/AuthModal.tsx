/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  getAuth, 
  sendPasswordResetEmail
} from 'firebase/auth';
import { Mail, Lock, Eye, EyeOff, Loader2, ArrowRight, UserPlus, LogIn, AlertCircle, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  onDeploy?: (user: any) => Promise<void> | void;
  isDayMode?: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess, onDeploy }) => {
  const { signInWithEmail, signUpWithEmail, signInWithGoogle } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const auth = getAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setResetSent(false);

    if (!email || !password) {
      setErrorMsg('Veuillez renseigner votre email et mot de passe.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Le mot de passe doit comporter au moins 6 caractères.');
      return;
    }

    setLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      const resolvedName = displayName.trim() || cleanEmail.split('@')[0];
      if (mode === 'login') {
        await signInWithEmail(cleanEmail, password);
      } else {
        await signUpWithEmail(cleanEmail, password, resolvedName);
      }
      const loggedUser = auth.currentUser || {
        email: cleanEmail,
        displayName: resolvedName,
      };
      if (onDeploy) {
        await onDeploy(loggedUser);
      }
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Erreur authentification:', err);
      if (err.code === 'auth/email-already-in-use') {
        setErrorMsg('Cet email est déjà utilisé. Veuillez vous connecter.');
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setErrorMsg('Identifiants incorrects.');
      } else if (err.code === 'auth/invalid-email') {
        setErrorMsg('Format d’adresse email invalide.');
      } else {
        setErrorMsg(err.message || 'Une erreur est survenue.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignInAndDeploy = async () => {
    setErrorMsg(null);
    setLoading(true);
    try {
      await signInWithGoogle();
      const loggedUser = auth.currentUser || {
        email: localStorage.getItem('droppaid_current_user_email') || 'google-user@signaid.io',
        displayName: localStorage.getItem('droppaid_user_display_name') || ' Google User',
      };
      if (onDeploy) {
        await onDeploy(loggedUser);
      }
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Erreur Google Sign-in & Deploy:', err);
      if (err.code !== 'auth/popup-closed-by-user') {
        setErrorMsg(err.message || 'Erreur lors de la connexion Google.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!email) {
      setErrorMsg('Renseignez votre email pour recevoir le lien de réinitialisation.');
      return;
    }
    setErrorMsg(null);
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setResetSent(true);
    } catch (err: any) {
      setErrorMsg(err.message || 'Impossible d’envoyer l’email de réinitialisation.');
    } finally {
      setLoading(false);
    }
  };

  const modalContent = (
    /* OVERLAY SOMBRE QUI COUVRE 100% DE L'ÉCRAN */
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      {/* BOÎTE DE DIALOGUE FLOTTANTE CENTRÉE */}
      <div 
        className="relative w-full max-w-sm rounded-3xl bg-white text-zinc-900 border border-zinc-200 shadow-2xl p-6 sm:p-7 space-y-4 font-mono animate-scaleUp my-auto select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* BOUTON FERMER */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-800 text-sm font-bold p-1 cursor-pointer"
        >
          ✕
        </button>

        <div className="flex p-1 rounded-xl bg-zinc-100 border border-zinc-200 text-xs font-bold">
          <button
            type="button"
            onClick={() => { setMode('login'); setErrorMsg(null); }}
            className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer ${
              mode === 'login'
                ? 'bg-white text-black shadow-sm font-black'
                : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Se connecter</span>
          </button>
          <button
            type="button"
            onClick={() => { setMode('register'); setErrorMsg(null); }}
            className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer ${
              mode === 'register'
                ? 'bg-white text-black shadow-sm font-black'
                : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Créer un compte</span>
          </button>
        </div>

        {/* BOUTON GOOGLE SIGN-IN & DEPLOY */}
        <button
          type="button"
          onClick={handleGoogleSignInAndDeploy}
          disabled={loading}
          className="w-full py-2.5 px-3 rounded-xl bg-white hover:bg-zinc-50 border border-zinc-300 text-zinc-900 font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition cursor-pointer active:scale-98 disabled:opacity-50"
        >
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
          </svg>
          <span>Continuer avec Google</span>
        </button>

        <div className="flex items-center gap-2 text-[10px] text-zinc-400 uppercase">
          <div className="flex-1 h-[1px] bg-zinc-200" />
          <span>ou avec votre email</span>
          <div className="flex-1 h-[1px] bg-zinc-200" />
        </div>

        {errorMsg && (
          <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-[11px] flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {resetSent && (
          <div className="p-2.5 rounded-xl bg-lime-50 border border-lime-300 text-lime-800 text-[11px]">
            Lien de réinitialisation envoyé à votre adresse email.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3 pt-1">
          {mode === 'register' && (
            <div className="space-y-1">
              <label htmlFor="auth-displayname" className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer">
                <User className="w-3 h-3 text-zinc-400" />
                <span>Nom d'artiste / Pseudo</span>
              </label>
              <input
                id="auth-displayname"
                type="text"
                autoComplete="name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Ex: DJ Kicks, Studio 54..."
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs font-mono text-zinc-900 focus:outline-none focus:border-lime-500 focus:bg-white transition"
              />
            </div>
          )}

          <div className="space-y-1">
            <label htmlFor="auth-email" className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer">
              <Mail className="w-3 h-3 text-zinc-400" />
              <span>Adresse Email</span>
            </label>
            <input
              id="auth-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="votre-nom@exemple.com"
              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs font-mono text-zinc-900 focus:outline-none focus:border-lime-500 focus:bg-white transition"
            />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label htmlFor="auth-password" className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer">
                <Lock className="w-3 h-3 text-zinc-400" />
                <span>Mot de passe</span>
              </label>
              {mode === 'login' && (
                <button
                  type="button"
                  onClick={handlePasswordReset}
                  className="text-[10px] text-zinc-400 hover:text-zinc-700 underline cursor-pointer"
                >
                  Mot de passe oublié ?
                </button>
              )}
            </div>
            <div className="relative">
              <input
                id="auth-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 pr-9 text-xs font-mono text-zinc-900 focus:outline-none focus:border-lime-500 focus:bg-white transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-2.5 bg-lime-400 hover:bg-lime-300 text-black font-black text-xs uppercase tracking-wider rounded-xl shadow-md flex items-center justify-center gap-2 transition cursor-pointer"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : mode === 'login' ? (
              <>
                <span>Se connecter</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            ) : (
              <>
                <span>Créer mon compte</span>
                <UserPlus className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        <div className="text-center pt-2 border-t border-zinc-100">
          <p className="text-[10px] text-zinc-400">
            {mode === 'login' ? "Vous n'avez pas encore de compte ?" : 'Vous possédez déjà un compte ?'}{' '}
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'login' ? 'register' : 'login');
                setErrorMsg(null);
              }}
              className="font-bold text-zinc-800 underline hover:text-black cursor-pointer"
            >
              {mode === 'login' ? "S'inscrire" : 'Connexion'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body);
  }

  return modalContent;
};
