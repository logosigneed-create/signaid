import React, { useState } from 'react';
import { SocialCopywriting } from '../types';
import { Copy, Check, MessageSquare, Hash, Vote, Send, Sparkles, Lock, ShieldCheck, ArrowUp } from 'lucide-react';
import { copyToClipboard } from '../utils/downloadHelpers';

interface CopywritingSectionProps {
  copywriting: SocialCopywriting;
  source?: 'gemini' | 'algorithmic';
  isUnlocked?: boolean;
  onScrollToCheckout?: () => void;
}

export const CopywritingSection: React.FC<CopywritingSectionProps> = ({
  copywriting,
  source = 'gemini',
  isUnlocked = false,
  onScrollToCheckout,
}) => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const handleCopy = async (text: string, sectionId: string) => {
    if (!isUnlocked) return;
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedSection(sectionId);
      setTimeout(() => setCopiedSection(null), 2000);
    }
  };

  return (
    <div id="section-copywriting" className="bg-zinc-900/80 border border-zinc-800 rounded-3xl p-5 sm:p-7 shadow-xl shadow-black/40 backdrop-blur-sm relative overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-5 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isUnlocked ? 'bg-lime-400' : 'bg-zinc-500'}`} />
            <h2 className="text-lg sm:text-xl font-extrabold text-white font-['Syne'] tracking-tight flex items-center gap-2">
              <span>3. Textes &amp; Réseaux Sociaux IA</span>
              {!isUnlocked && (
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[11px] font-mono font-bold flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  <span>Accessible après paiement</span>
                </span>
              )}
            </h2>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Légende Instagram rédigée sur-mesure, hashtags ciblés pour votre événement, idées de sondages Story interactifs et pitch organisateur.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isUnlocked ? (
            <span className="text-[11px] font-mono px-3 py-1 rounded-full bg-lime-400/10 text-lime-400 border border-lime-400/30 flex items-center gap-1.5 shadow-sm">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Kit Réseaux Débloqué</span>
            </span>
          ) : (
            <span className="text-[11px] font-mono px-3 py-1 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700 flex items-center gap-1.5 shadow-sm">
              <Lock className="w-3 h-3" />
              <span>Verrouillé (En attente du pack)</span>
            </span>
          )}
        </div>
      </div>

      {!isUnlocked ? (
        /* État Verrouillé : accessible uniquement après paiement */
        <div className="mt-6 py-12 px-6 rounded-2xl bg-zinc-950/90 border border-zinc-800/80 text-center flex flex-col items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/40 to-black/80 pointer-events-none" />
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mb-3 shadow-lg shadow-amber-500/10 z-10">
            <Lock className="w-7 h-7" />
          </div>
          <h3 className="text-base sm:text-lg font-bold text-white font-['Syne'] z-10">
            Cette section est accessible après le règlement du pack
          </h3>
          <p className="text-xs text-zinc-400 mt-1 max-w-md mx-auto z-10">
            Dès que tu as validé ton offre ci-dessus, l'IA génère et débloque instantanément l'intégralité de ton kit de communication (légende Instagram, hashtags, sondages et pitch DM).
          </p>
          {onScrollToCheckout && (
            <button
              type="button"
              onClick={onScrollToCheckout}
              className="mt-5 px-5 py-2.5 rounded-xl bg-lime-400 hover:bg-lime-300 text-zinc-950 font-black text-xs uppercase tracking-wider transition shadow-lg shadow-lime-400/20 z-10 inline-flex items-center gap-2"
            >
              <ArrowUp className="w-4 h-4" />
              <span>Choisir mon offre &amp; Débloquer la section</span>
            </button>
          )}
        </div>
      ) : (
        /* État Débloqué : textes visibles et prêts à être copiés */
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in duration-200">
        {/* Instagram Post Caption */}
        <div className="bg-zinc-950/70 border border-zinc-800 rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-lime-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Légende Instagram Officielle
                </h3>
              </div>
              <button
                id="btn-copy-caption"
                onClick={() => handleCopy(copywriting.captionInstagram, 'caption')}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200 font-semibold transition"
              >
                {copiedSection === 'caption' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-lime-400" />
                    <span className="text-lime-400">Copié !</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Copier</span>
                  </>
                )}
              </button>
            </div>
            <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-xl p-4 text-xs text-zinc-300 font-sans whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto">
              {copywriting.captionInstagram}
            </div>
          </div>

          {/* Hashtags Strip */}
          <div className="mt-4 pt-4 border-t border-zinc-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-cyan-400" />
                Hashtags Ciblés
              </span>
              <button
                id="btn-copy-hashtags"
                onClick={() => handleCopy(copywriting.hashtags.join(' '), 'hashtags')}
                className="text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold"
              >
                {copiedSection === 'hashtags' ? 'Copié !' : 'Copier tout'}
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {copywriting.hashtags.map((h, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-[11px] font-mono text-cyan-300"
                >
                  {h}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Story Polls & Cold DM Pitch */}
        <div className="flex flex-col gap-5">
          {/* Interactive Story Poll Ideas */}
          <div className="bg-zinc-950/70 border border-zinc-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Vote className="w-4 h-4 text-purple-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Idées Stickers &amp; Sondages Story
                </h3>
              </div>
            </div>
            <div className="space-y-2">
              {copywriting.storyPollIdeas.map((poll, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs text-zinc-200"
                >
                  <span className="font-medium pr-2">🔥 {poll}</span>
                  <button
                    onClick={() => handleCopy(poll, `poll-${idx}`)}
                    className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition"
                    title="Copier"
                  >
                    {copiedSection === `poll-${idx}` ? (
                      <Check className="w-3.5 h-3.5 text-lime-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* DM Pitch for Scale */}
          <div className="bg-zinc-950/70 border border-zinc-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4 text-lime-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Pitch DM Instagram / Prospection
                </h3>
              </div>
              <button
                id="btn-copy-pitch"
                onClick={() => handleCopy(copywriting.coldPitchDM, 'pitch')}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200 font-semibold transition"
              >
                {copiedSection === 'pitch' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-lime-400" />
                    <span className="text-lime-400">Copié !</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Copier DM</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-xs text-zinc-300 bg-zinc-900/90 border border-zinc-800/80 rounded-xl p-3 font-sans leading-relaxed">
              {copywriting.coldPitchDM}
            </p>
          </div>
        </div>
      </div>
    )}
  </div>
);
};
