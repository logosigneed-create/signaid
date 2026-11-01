import React, { useState } from 'react';
import { MusicGenre, ProspectLead, EventInput } from '../types';
import {
  Search,
  Sparkles,
  Send,
  CheckCircle2,
  ExternalLink,
  Bot,
  Flame,
  ArrowRight,
  TrendingUp,
  MapPin,
  Users,
  Copy,
  Check,
  Clock
} from 'lucide-react';

const Instagram = (props: any) => (
  <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);
import { copyToClipboard } from '../utils/downloadHelpers';

interface ProspectingBotProps {
  onLoadProspectIntoStudio: (preset: Partial<EventInput>) => void;
}

const GENRES: MusicGenre[] = [
  'Techno & Industrial',
  'Hard Groove & Acid',
  'House & Deep Minimal',
  'Rap & Trap Drill',
  'Drum & Bass / Jungle',
];

export const ProspectingBot: React.FC<ProspectingBotProps> = ({ onLoadProspectIntoStudio }) => {
  const [selectedCity, setSelectedCity] = useState('Paris');
  const [selectedGenre, setSelectedGenre] = useState<MusicGenre>('Techno & Industrial');
  const [isScraping, setIsScraping] = useState(false);
  const [leads, setLeads] = useState<ProspectLead[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleRunScraper = async () => {
    setIsScraping(true);
    try {
      const res = await fetch('/api/prospect-scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city: selectedCity, targetGenre: selectedGenre }),
      });
      const data = await res.json();
      if (data.success) {
        setLeads(data.prospects);
      }
    } catch (err) {
      console.error('Error running scraper:', err);
    } finally {
      setIsScraping(false);
    }
  };

  const handleCopyPitch = async (id: string, text: string) => {
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleSimulateSend = (id: string) => {
    setLeads((prev) =>
      prev.map((l) => (l.id === id ? { ...l, status: 'pitch_sent' as const } : l))
    );
  };

  return (
    <div className="space-y-6">
      {/* Hero Banner Explaining the Scale Strategy */}
      <div className="bg-gradient-to-br from-zinc-900 via-zinc-900/90 to-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2.5 h-2.5 rounded-full bg-lime-400 animate-pulse" />
              <span className="text-xs font-mono font-bold text-lime-400 uppercase tracking-widest flex items-center gap-2">
                <span>SCALE ENGINE // PROSPECTION B2B AUTOMATISÉE</span>
                <span className="px-2 py-0.5 rounded-md bg-lime-500/20 text-lime-400 border border-lime-500/40 text-[9px]">
                  Bientôt mis à jour ⚙️
                </span>
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white font-['Syne'] tracking-tight">
              Scraper Instagram DJ &amp; Bars Locaux
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 mt-2 leading-relaxed">
              "Module de prospection en cours de refonte technique pour garantir la sécurité des comptes et respecter les politiques de Meta. Saisissez ci-dessous votre zone géographique cible."
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-4 bg-zinc-950/80 p-4 rounded-2xl border border-zinc-800 shrink-0">
            <div className="text-center px-2">
              <div className="text-[10px] uppercase font-bold text-zinc-400">Taux Réponse DM</div>
              <div className="text-xl font-black text-lime-400">38.4%</div>
            </div>
            <div className="w-[1px] h-8 bg-zinc-800" />
            <div className="text-center px-2">
              <div className="text-[10px] uppercase font-bold text-zinc-400">Valeur Panier</div>
              <div className="text-xl font-black text-white">49 €</div>
            </div>
            <div className="w-[1px] h-8 bg-zinc-800" />
            <div className="text-center px-2">
              <div className="text-[10px] uppercase font-bold text-zinc-400">Délai Créa</div>
              <div className="text-xl font-black text-lime-400">30s</div>
            </div>
          </div>
        </div>

        {/* Filter Controls with Free City Input */}
        <div className="mt-6 pt-6 border-t border-zinc-800 grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-1.5 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-lime-400" />
              <span>Ville Cible (Champ Libre)</span>
            </label>
            <input
              type="text"
              id="input-prospect-city"
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              placeholder="Ex: Bruxelles, Madrid, Paris..."
              className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-white text-xs font-semibold focus:border-lime-400 focus:ring-1 focus:ring-lime-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-1.5 flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-lime-400" />
              <span>Genre Sonore</span>
            </label>
            <select
              id="select-prospect-genre"
              value={selectedGenre}
              onChange={(e) => setSelectedGenre(e.target.value as MusicGenre)}
              className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-white text-xs font-semibold focus:border-lime-400 focus:ring-1 focus:ring-lime-400 focus:outline-none"
            >
              {GENRES.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          <button
            id="btn-run-scraper"
            type="button"
            disabled={isScraping}
            onClick={handleRunScraper}
            className="w-full py-2.5 px-4 rounded-xl bg-lime-400 hover:bg-lime-300 text-black font-black text-xs uppercase tracking-wider transition-all shadow-md shadow-lime-400/20 flex items-center justify-center gap-2 cursor-pointer"
          >
            {isScraping ? (
              <>
                <div className="w-4 h-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                <span>Recherche en cours...</span>
              </>
            ) : (
              <>
                <Bot className="w-4 h-4" />
                <span>Lancer la Recherche ({selectedCity})</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Leads List */}
      {leads.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
              <Instagram className="w-4 h-4 text-lime-400" />
              <span>{leads.length} Cibles Détectées à {selectedCity}</span>
            </h3>
            <span className="text-xs text-zinc-400">Simulation d'envoi de visuels générés</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {leads.map((prospect) => (
              <div
                key={prospect.id}
                id={`lead-card-${prospect.id}`}
                className="bg-zinc-900/80 border border-zinc-800 rounded-3xl p-5 shadow-xl flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-white text-sm font-['Syne']">
                          {prospect.displayName}
                        </span>
                        <span className="text-[11px] font-mono text-lime-400 font-bold">
                          {prospect.igHandle}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-zinc-400 mt-1">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3 text-zinc-500" />
                          {prospect.followers.toLocaleString()} abonnés
                        </span>
                        <span>•</span>
                        <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 text-[10px] font-medium">
                          {prospect.category}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full ${prospect.status === 'pitch_sent'
                          ? 'bg-lime-500/20 text-lime-400 border border-lime-500/30'
                          : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                        }`}
                    >
                      {prospect.status === 'pitch_sent' ? 'Maquette Envoyée' : 'Détecté'}
                    </span>
                  </div>

                  <p className="text-xs text-zinc-400 mt-3 italic line-clamp-2">
                    {prospect.bio}
                  </p>

                  <div className="mt-3 p-3 rounded-xl bg-zinc-950 border border-zinc-800/80">
                    <div className="text-[10px] uppercase font-bold text-zinc-500">
                      Événement détecté en story :
                    </div>
                    <div className="text-xs font-bold text-lime-400 mt-0.5">
                      {prospect.lastEventDetected}
                    </div>
                  </div>

                  {/* Generated DM Pitch Preview */}
                  <div className="mt-3 p-3 rounded-xl bg-zinc-950/80 border border-zinc-800">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] uppercase font-bold text-zinc-400">
                        Pitch DM Instagram Personnalisé :
                      </span>
                      <button
                        onClick={() => handleCopyPitch(prospect.id, prospect.tailoredPitch || '')}
                        className="text-[11px] text-lime-400 hover:text-lime-300 flex items-center gap-1 cursor-pointer"
                      >
                        {copiedId === prospect.id ? (
                          <>
                            <Check className="w-3 h-3" />
                            <span>Copié</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copier</span>
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-zinc-300 font-sans leading-relaxed">
                      {prospect.tailoredPitch}
                    </p>
                  </div>
                </div>

                {/* Lead Action Buttons */}
                <div className="mt-4 pt-3 border-t border-zinc-800 flex items-center gap-2">
                  <button
                    id={`btn-load-studio-${prospect.id}`}
                    onClick={() =>
                      onLoadProspectIntoStudio({
                        eventName: prospect.lastEventDetected,
                        djName: prospect.displayName,
                        genre: prospect.genre,
                        venue: `${prospect.displayName} Club, ${selectedCity}`,
                        punchline: `Exclusive live set at ${selectedCity}`,
                      })
                    }
                    className="flex-1 py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-lime-400" />
                    <span>Générer Maquette Studio</span>
                  </button>

                  <button
                    id={`btn-send-pitch-${prospect.id}`}
                    onClick={() => handleSimulateSend(prospect.id)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${prospect.status === 'pitch_sent'
                        ? 'bg-lime-500/20 text-lime-400 border border-lime-500/30'
                        : 'bg-lime-400 hover:bg-lime-300 text-black font-black'
                      }`}
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{prospect.status === 'pitch_sent' ? 'Envoyé ✓' : 'Envoyer DM'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};