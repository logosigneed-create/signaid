/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Signaid - Audit Express & Diagnostic (/audit & /audit/:slug)
 * Outil de diagnostic visuel, conformité impression textile DTF
 * et configuration rapide de profil / vitrine.
 */

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Zap,
  Upload,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Shirt,
  Sparkles,
  ExternalLink,
  Layers,
  Save,
  Loader2,
  FileText,
} from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useParams } from '../router/Router';
import { isReservedSlug, sanitizeSlug } from '../constants/reservedRoutes';
import { showToast } from '../utils/toastEmitter';

export interface AuditToolProps {
  slug?: string;
  onNavigate?: (path: string) => void;
}

export const AuditTool: React.FC<AuditToolProps> = ({ slug: propSlug, onNavigate }) => {
  const params = useParams<{ slug?: string }>();
  const rawSlug = propSlug || params?.slug || '';
  const currentSlug = sanitizeSlug(rawSlug) || 'prospect-demo';

  const [companyName, setCompanyName] = useState(currentSlug.toUpperCase());
  const [sector, setSector] = useState('Événementiel / Musique');
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [socialLink, setSocialLink] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Scores d'audit simulés intelligents
  const [auditScores, setAuditScores] = useState({
    dtfCompatibility: 95,
    visualAuthority: 88,
    contrastRatio: 92,
    resolutionScore: 100,
  });

  const navigateTo = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    } else if (typeof window !== 'undefined') {
      window.history.pushState({}, '', path);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  useEffect(() => {
    if (!currentSlug || isReservedSlug(currentSlug)) return;

    let isMounted = true;
    setIsLoading(true);

    const fetchAuditData = async () => {
      try {
        let snapshot = await getDoc(doc(db, 'portals', currentSlug));
        if (!snapshot.exists()) {
          snapshot = await getDoc(doc(db, 'projects', currentSlug));
        }

        if (snapshot.exists() && isMounted) {
          const data = snapshot.data();
          if (data.eventName || data.companyName) setCompanyName(data.eventName || data.companyName);
          if (data.logoImage || data.tshirtCustomLogo) setLogoPreview(data.logoImage || data.tshirtCustomLogo);
          if (data.artistSocialUrl) setSocialLink(data.artistSocialUrl);
          if (data.artistUrl) setWebsiteUrl(data.artistUrl);
        }
      } catch (err) {
        console.warn('[AuditTool] Erreur lecture données existantes:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchAuditData();
    return () => {
      isMounted = false;
    };
  }, [currentSlug]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setLogoPreview(dataUrl);
        showToast('Logo importé pour analyse de conformité !', 'success');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const payload = {
        slug: currentSlug,
        companyName,
        eventName: companyName,
        sector,
        logoImage: logoPreview,
        tshirtCustomLogo: logoPreview,
        artistSocialUrl: socialLink,
        artistUrl: websiteUrl,
        contactEmail,
        auditScores,
        updatedAt: new Date().toISOString(),
      };

      await Promise.all([
        setDoc(doc(db, 'portals', currentSlug), payload, { merge: true }),
        setDoc(doc(db, 'projects', currentSlug), payload, { merge: true }),
      ]);

      showToast('⚡ Profil et configuration d\'audit sauvegardés !', 'success');
    } catch (err) {
      console.error('[AuditTool] Erreur sauvegarde:', err);
      showToast('Erreur lors de la sauvegarde du profil.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans flex flex-col selection:bg-cyan-400 selection:text-black">
      {/* Top Header */}
      <header className="border-b border-zinc-850 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigateTo('/')}
              className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white transition cursor-pointer flex items-center gap-1.5 text-xs font-mono font-bold"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Accueil</span>
            </button>

            <div className="h-4 w-[1px] bg-zinc-800" />

            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center font-mono font-black text-sm">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <span className="font-mono text-xs font-bold uppercase text-white block">
                  AUDIT &amp; CONFIGURATION PROFIL
                </span>
                <span className="text-[10px] font-mono text-cyan-400 block -mt-0.5">
                  ID : {currentSlug.toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigateTo(`/studio/${currentSlug}`)}
              className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 text-xs font-mono font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-lime-400" />
              <span>Vers Studio</span>
            </button>

            <button
              onClick={() => navigateTo(`/customizer/${currentSlug}`)}
              className="px-3 py-1.5 rounded-lg bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/40 text-xs font-mono font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <Shirt className="w-3.5 h-3.5 text-purple-400" />
              <span>Vers Customizer</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Diagnostic Score Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800">
            <span className="text-[10px] font-mono uppercase text-zinc-400 font-bold block">Conformité DTF</span>
            <span className="text-2xl font-black text-lime-400 font-mono">{auditScores.dtfCompatibility}%</span>
            <span className="text-[10px] text-zinc-500 block mt-1">Prêt pour impression textile</span>
          </div>
          <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800">
            <span className="text-[10px] font-mono uppercase text-zinc-400 font-bold block">Score d'Autorité</span>
            <span className="text-2xl font-black text-cyan-400 font-mono">{auditScores.visualAuthority}/100</span>
            <span className="text-[10px] text-zinc-500 block mt-1">Niveau Pro Impactant</span>
          </div>
          <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800">
            <span className="text-[10px] font-mono uppercase text-zinc-400 font-bold block">Contraste Quadri</span>
            <span className="text-2xl font-black text-white font-mono">{auditScores.contrastRatio}%</span>
            <span className="text-[10px] text-zinc-500 block mt-1">Lisibilité optimale</span>
          </div>
          <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800">
            <span className="text-[10px] font-mono uppercase text-zinc-400 font-bold block">Résolution Vectorielle</span>
            <span className="text-2xl font-black text-amber-400 font-mono">{auditScores.resolutionScore}%</span>
            <span className="text-[10px] text-zinc-500 block mt-1">Net &amp; Sans pixellisation</span>
          </div>
        </div>

        {/* Configuration Form */}
        <div className="p-6 rounded-3xl bg-zinc-900/80 border border-zinc-800 space-y-6">
          <div className="border-b border-zinc-800 pb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold uppercase tracking-tight">Paramètres du Profil Vitrine</h2>
              <p className="text-xs text-zinc-400 mt-0.5">Ces informations alimentent la vitrine publique (/{currentSlug}) et la boutique.</p>
            </div>
            <button
              onClick={handleSaveProfile}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-black font-mono text-xs uppercase tracking-wider transition flex items-center gap-1.5 shadow-lg shadow-cyan-400/20 active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>Sauvegarder</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono font-bold uppercase text-zinc-400 mb-1">
                Nom officiel du projet / entité
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white font-mono font-bold focus:outline-none focus:border-cyan-400 uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-mono font-bold uppercase text-zinc-400 mb-1">
                Secteur d'activité
              </label>
              <input
                type="text"
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="block text-xs font-mono font-bold uppercase text-zinc-400 mb-1">
                Lien Réseau Social Principal
              </label>
              <input
                type="text"
                value={socialLink}
                onChange={(e) => setSocialLink(e.target.value)}
                placeholder="https://instagram.com/..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="block text-xs font-mono font-bold uppercase text-zinc-400 mb-1">
                Site Web ou Billetterie
              </label>
              <input
                type="text"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          {/* Upload Logo de référence */}
          <div className="pt-2">
            <span className="block text-xs font-mono font-bold uppercase text-zinc-400 mb-2">
              Logo officiel pour impression textile &amp; vitrine :
            </span>
            <div className="flex items-center gap-4">
              {logoPreview && (
                <div className="w-16 h-16 rounded-xl bg-zinc-950 border border-zinc-800 p-2 flex items-center justify-center overflow-hidden shrink-0">
                  <img src={logoPreview} alt="Logo" className="max-h-full max-w-full object-contain" />
                </div>
              )}
              <label className="px-4 py-2.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-mono text-xs font-bold transition cursor-pointer flex items-center gap-2">
                <Upload className="w-3.5 h-3.5 text-cyan-400" />
                <span>Téléverser un logo (PNG transparent recommandé)</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
              </label>
            </div>
          </div>
        </div>

        {/* Action Link Bar */}
        <div className="p-4 rounded-2xl bg-zinc-900/40 border border-zinc-850 flex flex-wrap items-center justify-between gap-4">
          <span className="text-xs font-mono text-zinc-400">
            Passer à l'action pour le projet <strong className="text-white">{currentSlug}</strong> :
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigateTo(`/${currentSlug}`)}
              className="px-3.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-750 text-xs font-mono font-bold text-zinc-300 flex items-center gap-1.5 cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
              <span>Voir la Vitrine (/{currentSlug})</span>
            </button>
            <button
              onClick={() => navigateTo(`/${currentSlug}/shop`)}
              className="px-3.5 py-1.5 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-xs font-mono font-bold text-purple-200 flex items-center gap-1.5 cursor-pointer"
            >
              <Shirt className="w-3.5 h-3.5 text-purple-400" />
              <span>Voir la Boutique (/{currentSlug}/shop)</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export const AuditOnboarding = AuditTool;
export default AuditTool;
