/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Signaid - Landing Page Principale Unifiée (/)
 * Portail d'acquisition & aiguillage écosystème Signaid :
 * Studio Visuel, Customizer Merch DTF, Dropper Clubbing, Audit & Vitrines.
 */

import React, { useState } from 'react';
import {
  Sparkles,
  Shirt,
  Flame,
  ShieldCheck,
  ArrowRight,
  Send,
  CheckCircle2,
  Building2,
  Globe2,
  Mail,
  ExternalLink,
  Layers,
  ShoppingBag,
  Zap,
} from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebaseConfig';

interface LandingPageProps {
  onNavigate?: (path: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
  const [projectName, setProjectName] = useState('');
  const [socialLink, setSocialLink] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const navigateTo = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    } else if (typeof window !== 'undefined') {
      window.history.pushState({}, '', path);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!projectName.trim()) {
      setErrorMessage('Veuillez renseigner le nom de votre projet ou collectif.');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Veuillez renseigner une adresse email valide.');
      return;
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'prospect_requests'), {
        projectName: projectName.trim(),
        socialLink: socialLink.trim(),
        email: email.trim().toLowerCase(),
        status: 'pending',
        source: 'landing_page_unified',
        createdAt: serverTimestamp(),
        submittedAt: new Date().toISOString(),
      });
      setIsSubmitted(true);
    } catch (err: any) {
      console.error('Erreur soumission candidature:', err);
      setErrorMessage("Une erreur est survenue lors de l'envoi de votre dossier. Veuillez réessayer.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans selection:bg-lime-400 selection:text-black">
      {/* Top Header */}
      <header className="border-b border-zinc-850 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-lime-400 text-black font-black flex items-center justify-center font-mono text-base shadow-lg shadow-lime-400/20">
              S
            </div>
            <div>
              <span className="font-black text-sm tracking-widest uppercase text-white font-mono">SIGNAID</span>
              <span className="text-[10px] text-zinc-500 font-mono block -mt-0.5">UNIFIED ECOSYSTEM 2026</span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-xs font-mono font-bold text-zinc-400">
            <button
              onClick={() => navigateTo('/studio')}
              className="hover:text-lime-400 transition cursor-pointer flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-lime-400" />
              <span>Studio Affiches</span>
            </button>
            <button
              onClick={() => navigateTo('/customizer')}
              className="hover:text-lime-400 transition cursor-pointer flex items-center gap-1.5"
            >
              <Shirt className="w-3.5 h-3.5 text-purple-400" />
              <span>Customizer Merch</span>
            </button>
            <button
              onClick={() => navigateTo('/dropper')}
              className="hover:text-lime-400 transition cursor-pointer flex items-center gap-1.5"
            >
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>Dropper Clubbing</span>
            </button>
            <button
              onClick={() => navigateTo('/audit')}
              className="hover:text-lime-400 transition cursor-pointer flex items-center gap-1.5"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              <span>Audit Express</span>
            </button>
            <button
              onClick={() => navigateTo('/admin')}
              className="hover:text-lime-400 transition cursor-pointer text-zinc-500 hover:text-white"
            >
              Admin
            </button>
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigateTo('/studio')}
              className="px-4 py-2 rounded-xl bg-lime-400 hover:bg-lime-300 text-black font-black font-mono text-xs uppercase tracking-wider transition shadow-lg shadow-lime-400/20 active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <span>Lancer le Studio</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-20 md:pt-24 md:pb-32 px-4 sm:px-6">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(163,230,53,0.12),rgba(255,255,255,0))] pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-[11px] font-mono font-bold text-zinc-300 mb-6">
            <span className="w-2 h-2 rounded-full bg-lime-400 animate-pulse" />
            <span>MOTEUR GRAPHIQUE &amp; MERCHANDISING TEXTILE DTF</span>
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight uppercase leading-[0.95] mb-6">
            L'image qui signe <br />
            <span className="bg-gradient-to-r from-lime-400 via-lime-300 to-emerald-400 bg-clip-text text-transparent">
              vos contrats &amp; vos drops
            </span>
          </h1>

          <p className="text-base sm:text-lg md:text-xl text-zinc-400 max-w-3xl mx-auto leading-relaxed mb-10 font-medium">
            Plateforme unifiée pour artistes, collectifs et marques. Créez vos affiches studio, configurez votre merch textile haute précision, et déployez vos vitrines &amp; boutiques officielles sans friction.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={() => navigateTo('/studio')}
              className="px-6 py-3.5 rounded-xl bg-lime-400 hover:bg-lime-300 text-black font-black font-mono text-sm uppercase tracking-wider transition shadow-xl shadow-lime-400/25 active:scale-95 cursor-pointer flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>Ouvrir le Studio Visuel</span>
            </button>

            <button
              onClick={() => navigateTo('/customizer')}
              className="px-6 py-3.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-700/80 font-bold font-mono text-sm uppercase tracking-wider transition active:scale-95 cursor-pointer flex items-center gap-2"
            >
              <Shirt className="w-4 h-4 text-purple-400" />
              <span>Personnaliser Merch DTF</span>
            </button>

            <button
              onClick={() => navigateTo('/dropper')}
              className="px-6 py-3.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold font-mono text-sm uppercase tracking-wider transition active:scale-95 cursor-pointer flex items-center gap-2"
            >
              <Flame className="w-4 h-4" />
              <span>Dropper Clubbing</span>
            </button>
          </div>
        </div>
      </section>

      {/* Grid des 4 Piliers Applicatifs */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-20">
        <div className="text-center mb-12">
          <p className="text-xs uppercase font-mono tracking-widest text-lime-400 font-bold mb-2">Modules Intégrés</p>
          <h2 className="text-2xl sm:text-4xl font-black uppercase tracking-tight">Une suite complète et étanche</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* Module 1: Studio */}
          <div
            onClick={() => navigateTo('/studio')}
            className="group p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 hover:border-lime-400/50 transition-all cursor-pointer flex flex-col justify-between hover:bg-zinc-900 shadow-lg"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-lime-400/10 border border-lime-400/20 text-lime-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <Sparkles className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-lime-400 font-bold">Production Visuelle</span>
              <h3 className="text-xl font-bold uppercase tracking-tight mt-1 mb-2">Studio Affiches</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Moteur complet de composition d'affiches (Post, A3, Story, Flyer). Typographies modulaires, ambiances CGI et positionnement tactile.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-zinc-800/80 flex items-center justify-between text-xs font-mono text-lime-400 font-bold">
              <span>Lancer /studio</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Module 2: Customizer Merch */}
          <div
            onClick={() => navigateTo('/customizer')}
            className="group p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 hover:border-purple-400/50 transition-all cursor-pointer flex flex-col justify-between hover:bg-zinc-900 shadow-lg"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-purple-400/10 border border-purple-400/20 text-purple-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <Shirt className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-purple-400 font-bold">Textile &amp; Atelier</span>
              <h3 className="text-xl font-bold uppercase tracking-tight mt-1 mb-2">Customizer Merch</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Personnalisation textile DTF haute fidélité. Placement Face/Dos au millimètre, mockups mannequins IA, gabarits et injection directe en boutique.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-zinc-800/80 flex items-center justify-between text-xs font-mono text-purple-400 font-bold">
              <span>Lancer /customizer</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Module 3: Dropper Landing */}
          <div
            onClick={() => navigateTo('/dropper')}
            className="group p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 hover:border-amber-400/50 transition-all cursor-pointer flex flex-col justify-between hover:bg-zinc-900 shadow-lg"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-amber-400/10 border border-amber-400/20 text-amber-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <Flame className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold">Acquisition Clubbing</span>
              <h3 className="text-xl font-bold uppercase tracking-tight mt-1 mb-2">Dropper Soirées</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Landing événementielle pour DJs, promoteurs et collectifs. Packs d'activation, préventes prioritaires et SmartLinks QR pour soirées.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-zinc-800/80 flex items-center justify-between text-xs font-mono text-amber-400 font-bold">
              <span>Voir /dropper</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Module 4: Audit & Diagnostic */}
          <div
            onClick={() => navigateTo('/audit')}
            className="group p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 hover:border-cyan-400/50 transition-all cursor-pointer flex flex-col justify-between hover:bg-zinc-900 shadow-lg"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">Diagnostic Express</span>
              <h3 className="text-xl font-bold uppercase tracking-tight mt-1 mb-2">Audit d'Identité</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Diagnostic de conformité logo pour le textile DTF, notation d'autorité visuelle et configuration rapide de profil public.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-zinc-800/80 flex items-center justify-between text-xs font-mono text-cyan-400 font-bold">
              <span>Lancer /audit</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </section>

      {/* Candidature & Contact Section */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 pb-24">
        <div className="p-8 sm:p-12 rounded-3xl bg-zinc-900/90 border border-zinc-800 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-lime-400/5 rounded-full blur-3xl pointer-events-none" />

          {isSubmitted ? (
            <div className="text-center py-8 space-y-4">
              <CheckCircle2 className="mx-auto text-lime-400 w-16 h-16 animate-bounce" />
              <h3 className="text-2xl sm:text-3xl font-black uppercase tracking-tight">Candidature Reçue !</h3>
              <p className="text-zinc-400 text-sm max-w-md mx-auto">
                Notre équipe examine l'éligibilité du projet <strong className="text-lime-400">{projectName}</strong>. Vous recevrez une invitation personnalisée à <strong className="text-white">{email}</strong>.
              </p>
              <button
                onClick={() => {
                  setIsSubmitted(false);
                  setProjectName('');
                  setSocialLink('');
                  setEmail('');
                }}
                className="mt-4 px-6 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-mono font-bold uppercase tracking-wider text-zinc-200 transition cursor-pointer"
              >
                Soumettre un autre dossier
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="border-b border-zinc-800 pb-4">
                <span className="text-[10px] font-mono uppercase font-bold text-lime-400 tracking-wider">Accès Partenaire</span>
                <h3 className="text-2xl sm:text-3xl font-black uppercase tracking-tight mt-1">
                  Déposez votre dossier de marque
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Obtenez votre vitrine officielle personnalisée, votre catalogue textile en marque blanche et l'accès complet à la suite Signaid.
                </p>
              </div>

              {errorMessage && (
                <div className="p-3 rounded-xl bg-red-950/80 border border-red-500/40 text-red-300 text-xs font-mono font-bold">
                  ⚠️ {errorMessage}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono font-bold uppercase text-zinc-300 mb-1.5">
                    Nom du Projet / Artiste <span className="text-lime-400">*</span>
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4" />
                    <input
                      type="text"
                      required
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      placeholder="Ex: AARONH, VISION ROOM, DJ FAZZ..."
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-zinc-600 font-bold focus:outline-none focus:border-lime-400 font-mono uppercase"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold uppercase text-zinc-300 mb-1.5">
                    Email de contact <span className="text-lime-400">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="contact@votre-label.com"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-zinc-600 font-bold focus:outline-none focus:border-lime-400 font-mono"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono font-bold uppercase text-zinc-300 mb-1.5">
                  Lien Réseau Social / Profil Existant
                </label>
                <div className="relative">
                  <Globe2 className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4" />
                  <input
                    type="text"
                    value={socialLink}
                    onChange={(e) => setSocialLink(e.target.value)}
                    placeholder="Instagram, Soundcloud, TikTok, Spotify..."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-zinc-600 font-bold focus:outline-none focus:border-lime-400 font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
                <span className="text-[11px] font-mono text-zinc-500">
                  Validation sous 24h • Accès direct au configurateur textile
                </span>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-lime-400 hover:bg-lime-300 text-black font-black font-mono text-xs uppercase tracking-wider transition shadow-lg shadow-lime-400/20 active:scale-95 disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Transmission...' : 'Soumettre ma Candidature'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-900 bg-zinc-950 py-8 px-4 text-center font-mono text-xs text-zinc-600">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 SIGNAID.EU • TOUS DROITS RÉSERVÉS</p>
          <div className="flex items-center gap-4 text-[11px]">
            <button onClick={() => navigateTo('/studio')} className="hover:text-zinc-400 transition cursor-pointer">Studio</button>
            <button onClick={() => navigateTo('/customizer')} className="hover:text-zinc-400 transition cursor-pointer">Customizer</button>
            <button onClick={() => navigateTo('/dropper')} className="hover:text-zinc-400 transition cursor-pointer">Dropper</button>
            <button onClick={() => navigateTo('/audit')} className="hover:text-zinc-400 transition cursor-pointer">Audit</button>
            <button onClick={() => navigateTo('/admin')} className="hover:text-zinc-400 transition cursor-pointer">Admin</button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
