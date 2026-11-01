/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Signaid - Tableau de Bord Administrateur (/admin)
 * Supervision centralisée des prospects, projets et commandes :
 * Accès directs vers [Studio], [Customizer Merch], [Vitrine] et [Shop] pour chaque compte.
 */

import React, { useState, useEffect } from 'react';
import {
  Users,
  Sparkles,
  Shirt,
  ShoppingBag,
  ExternalLink,
  Search,
  Plus,
  ArrowRight,
  ShieldAlert,
  Loader2,
  Calendar,
  Building2,
  Mail,
  Zap,
  Globe,
  Flame,
} from 'lucide-react';
import { collection, getDocs, limit, query, orderBy } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { showToast } from '../utils/toastEmitter';

interface ProspectItem {
  id: string;
  slug: string;
  name: string;
  email?: string;
  status?: string;
  createdAt?: any;
  hasMerch?: boolean;
}

export const AdminDashboard: React.FC<{ onNavigate?: (path: string) => void }> = ({ onNavigate }) => {
  const [prospects, setProspects] = useState<ProspectItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [newProspectSlug, setNewProspectSlug] = useState('');
  const [isCreatingModal, setIsCreatingModal] = useState(false);

  const navigateTo = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    } else if (typeof window !== 'undefined') {
      window.history.pushState({}, '', path);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  useEffect(() => {
    const fetchProspects = async () => {
      setIsLoading(true);
      try {
        const found = new Map<string, ProspectItem>();

                  // 0. Profils et vitrines Firestore ('profiles')
          try {
            const profilesSnap = await getDocs(query(collection(db, 'profiles'), limit(100)));
            profilesSnap.forEach((docSnap) => {
              const data = docSnap.data();
              const slug = (data.slug || docSnap.id || '').toLowerCase().trim();
              if (slug && !found.has(slug)) {
                found.set(slug, {
                  id: docSnap.id,
                  slug,
                  name: data.artistName || data.name || data.title || slug,
                  email: data.email || data.contactEmail || '',
                  hasMerch: Boolean(data.products && data.products.length > 0 || data.garments && data.garments.length > 0),
                  status: 'En ligne',
                  createdAt: data.createdAt ? new Date(data.createdAt) : undefined
                });
              }
            });
          } catch (e) {
            console.warn('[AdminDashboard] Erreur collection profiles:', e);
          }
// 1. Projets / Portals Firestore
        try {
          const portalsSnap = await getDocs(query(collection(db, 'portals'), limit(40)));
          portalsSnap.forEach((docSnap) => {
            const data = docSnap.data();
            const slug = docSnap.id;
            found.set(slug, {
              id: slug,
              slug,
              name: data.eventName || data.companyName || data.name || slug.toUpperCase(),
              email: data.contactEmail || data.email,
              status: data.isDeployed ? 'En ligne' : 'Actif',
              hasMerch: Boolean(data.tshirtPreviewImages?.front || data.tshirtCustomLogo),
            });
          });
        } catch (e) {
          console.warn('[AdminDashboard] Lecture portals notice:', e);
        }

        // 2. Candidatures prospect_requests
        try {
          const reqSnap = await getDocs(query(collection(db, 'prospect_requests'), limit(20)));
          reqSnap.forEach((docSnap) => {
            const data = docSnap.data();
            const slug = (data.projectName || docSnap.id).toLowerCase().replace(/[^a-z0-9]+/g, '-');
            if (!found.has(slug)) {
              found.set(slug, {
                id: docSnap.id,
                slug,
                name: data.projectName || slug.toUpperCase(),
                email: data.email,
                status: 'Candidature',
                hasMerch: false,
              });
            }
          });
        } catch (e) {
          console.warn('[AdminDashboard] Lecture prospect_requests notice:', e);
        }

        // Fallbacks vitrines phares pour démonstration immédiate
        if (!found.has('aaronh')) {
          found.set('aaronh', {
            id: 'aaronh',
            slug: 'aaronh',
            name: 'AARONH',
            email: 'contact@aaronh.fr',
            status: 'En ligne',
            hasMerch: true,
          });
        }
        if (!found.has('visionroom')) {
          found.set('visionroom', {
            id: 'visionroom',
            slug: 'visionroom',
            name: 'VISION ROOM',
            email: 'info@visionroom.be',
            status: 'En ligne',
            hasMerch: true,
          });
        }
        if (!found.has('djdfazz')) {
          found.set('djdfazz', {
            id: 'djdfazz',
            slug: 'djdfazz',
            name: 'DJ DFAZZ',
            email: 'booking@djdfazz.com',
            status: 'En ligne',
            hasMerch: true,
          });
        }

        setProspects(Array.from(found.values()));
      } catch (err) {
        console.error('[AdminDashboard] Erreur chargement:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProspects();
  }, []);

  const filteredProspects = prospects.filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    return p.name.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q);
  });

  const handleCreateProspect = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newProspectSlug.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
    if (!clean) return;

    showToast(`Nouveau projet initialisé : /${clean}`, 'success');
    setIsCreatingModal(false);
    navigateTo(`/studio/${clean}`);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans flex flex-col selection:bg-lime-400 selection:text-black">
      {/* Top Header */}
      <header className="border-b border-zinc-850 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigateTo('/')}
              className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white transition cursor-pointer text-xs font-mono font-bold flex items-center gap-1.5"
            >
              <span>Accueil</span>
            </button>

            <div className="h-4 w-[1px] bg-zinc-800" />

            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-lime-400 text-black flex items-center justify-center font-mono font-black text-sm shadow-md shadow-lime-400/20">
                ⚡
              </div>
              <div>
                <span className="font-mono text-xs font-bold uppercase text-white block">
                  SIGNAID ADMIN DASHBOARD
                </span>
                <span className="text-[10px] font-mono text-zinc-500 block -mt-0.5">
                  GESTION MULTI-PROJETS &amp; PROSPECTS
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCreatingModal(true)}
              className="px-4 py-2 rounded-xl bg-lime-400 hover:bg-lime-300 text-black font-black font-mono text-xs uppercase tracking-wider transition flex items-center gap-1.5 shadow-md shadow-lime-400/20 cursor-pointer active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nouveau Projet</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase text-zinc-500 font-bold block">Comptes &amp; Vitrines</span>
              <span className="text-3xl font-black font-mono text-white mt-1 block">{prospects.length}</span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-lime-400/10 text-lime-400 flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase text-zinc-500 font-bold block">Vêtements Merch Actifs</span>
              <span className="text-3xl font-black font-mono text-purple-400 mt-1 block">
                {prospects.filter((p) => p.hasMerch).length}
              </span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <Shirt className="w-6 h-6" />
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase text-zinc-500 font-bold block">Statut Système</span>
              <span className="text-sm font-bold font-mono text-emerald-400 mt-2 block flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Opérationnel 100%
              </span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Zap className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher par nom de prospect ou slug..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-xs font-mono text-white placeholder-zinc-600 focus:outline-none focus:border-lime-400"
            />
          </div>
          <span className="text-xs font-mono text-zinc-400 shrink-0">
            {filteredProspects.length} prospect{filteredProspects.length > 1 ? 's' : ''} trouvé{filteredProspects.length > 1 ? 's' : ''}
          </span>
        </div>

        {/* Prospect List with the 4 Mandatory Shortcuts */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="p-12 text-center text-zinc-500 font-mono text-xs flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-lime-400" />
              <span>Chargement du répertoire...</span>
            </div>
          ) : filteredProspects.length === 0 ? (
            <div className="p-12 text-center text-zinc-500 font-mono text-xs">
              Aucun prospect ne correspond à la recherche.
            </div>
          ) : (
            filteredProspects.map((prospect) => (
              <div
                key={prospect.id}
                className="p-4 sm:p-5 rounded-2xl bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm"
              >
                {/* Info Prospect */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono font-bold text-sm text-white uppercase truncate">
                      {prospect.name}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-[10px] font-mono text-zinc-400">
                      /{prospect.slug}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                        prospect.status === 'En ligne'
                          ? 'bg-lime-400/10 text-lime-400 border border-lime-400/30'
                          : 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      {prospect.status || 'Actif'}
                    </span>
                  </div>

                  {prospect.email && (
                    <span className="text-xs text-zinc-500 font-mono block mt-1">
                      {prospect.email}
                    </span>
                  )}
                </div>

                {/* LES 4 RACCOURCIS OBLIGATOIRES PAR PROSPECT : [Studio] [Customizer Merch] [Vitrine] [Shop] */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {/* 1. [Studio] */}
                  <button
                    onClick={() => navigateTo(`/studio/${prospect.slug}`)}
                    className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-lime-400 hover:text-black text-zinc-200 text-xs font-mono font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm group"
                    title={`Lancer le Studio pour ${prospect.name}`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-lime-400 group-hover:text-black" />
                    <span>Studio</span>
                  </button>

                  {/* 2. [Customizer Merch] */}
                  <button
                    onClick={() => navigateTo(`/customizer/${prospect.slug}`)}
                    className="px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-500/30 text-xs font-mono font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                    title={`Ouvrir le Customizer Merch pour ${prospect.name}`}
                  >
                    <Shirt className="w-3.5 h-3.5 text-purple-400 hover:text-white" />
                    <span>Customizer Merch</span>
                  </button>

                  {/* 3. [Vitrine] */}
                  <button
                    onClick={() => navigateTo(`/${prospect.slug}`)}
                    className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-cyan-500 hover:text-black text-zinc-200 text-xs font-mono font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm group"
                    title={`Voir la vitrine publique /${prospect.slug}`}
                  >
                    <Globe className="w-3.5 h-3.5 text-cyan-400 group-hover:text-black" />
                    <span>Vitrine</span>
                  </button>

                  {/* 4. [Shop] */}
                  <button
                    onClick={() => navigateTo(`/${prospect.slug}/shop`)}
                    className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-amber-400 hover:text-black text-zinc-200 text-xs font-mono font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm group"
                    title={`Voir la boutique officielle /${prospect.slug}/shop`}
                  >
                    <ShoppingBag className="w-3.5 h-3.5 text-amber-400 group-hover:text-black" />
                    <span>Shop</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* Modal Création Nouveau Prospect */}
      {isCreatingModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold font-mono uppercase text-white">Nouveau Projet / Prospect</h3>
            <p className="text-xs text-zinc-400">
              Saisissez l'identifiant slug pour initialiser l'espace Studio, Customizer et Vitrine.
            </p>

            <form onSubmit={handleCreateProspect} className="space-y-4">
              <div>
                <label className="block text-xs font-mono font-bold uppercase text-zinc-400 mb-1">
                  Slug unique
                </label>
                <input
                  type="text"
                  required
                  value={newProspectSlug}
                  onChange={(e) => setNewProspectSlug(e.target.value)}
                  placeholder="ex: newartist, le-club, festival-2026"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-lime-400 lowercase"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreatingModal(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 font-mono text-xs font-bold transition cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-lime-400 hover:bg-lime-300 text-black font-mono font-black text-xs uppercase tracking-wider transition cursor-pointer"
                >
                  Créer &amp; Ouvrir Studio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;


