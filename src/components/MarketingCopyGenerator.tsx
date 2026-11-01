/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { EventInput } from '../types';
import { generateMarketingCopyAi } from '../services/geminiService';
import { Sparkles, Copy, Check, MessageSquare, Send, Loader2, FileText } from 'lucide-react';

const Instagram = (props: any) => (
  <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

interface MarketingCopyGeneratorProps {
  input: EventInput;
  isDayMode?: boolean;
  hideCardWrapper?: boolean;
}

type CopyFormat = 'instagram' | 'story' | 'whatsapp' | 'press';

export const MarketingCopyGenerator: React.FC<MarketingCopyGeneratorProps> = ({
  input,
  isDayMode = false,
  hideCardWrapper = false,
}) => {
  const [selectedFormat, setSelectedFormat] = useState<CopyFormat>('instagram');
  const [generatedText, setGeneratedText] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  // Appel Cloud Function Gemini 4 Argon (avec repli déterministe si hors-ligne)
  const handleGenerate = async () => {
    setIsGenerating(true);
    setCopied(false);

    const smartLink =
      input.artistUrl ||
      `https://signaid.eu/hub/${(input.eventName || 'event')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')}`;
    const dateVenue = [input.date, input.venue].filter(Boolean).join(' @ ');

    try {
      const text = await generateMarketingCopyAi({
        input,
        format: selectedFormat,
        smartLink,
      });
      if (text) {
        setGeneratedText(text);
        return;
      }
    } catch {
      // Fallback algorithmique instantané ultra-calibré si offline/sans quota
    } finally {
      setIsGenerating(false);
    }

    // Modèles algorithmiques instantanés adaptés aux données saisies
    let copy = '';
    const event = input.eventName || 'ÉVÉNEMENT';
    const artist = input.djName || 'INTERVENANT';
    const punch = input.punchline ? input.punchline : 'Un rendez-vous d\'exception à ne pas manquer.';

    switch (selectedFormat) {
      case 'instagram':
        copy =
          `📢 ANNONCE OFFICIELLE // ${event} 📢\n\n` +
          `Avec : ${artist}\n` +
          `${punch}\n\n` +
          `🗓 ${input.date || 'Prochainement'} ${input.timeSlot ? `(${input.timeSlot})` : ''}\n` +
          `📍 Lieu : ${input.venue || 'Lieu officiel'}\n\n` +
          `🔗 Réservez vos places & accédez aux infos officielles : ${smartLink}\n\n` +
          `#${artist.replace(/\s+/g, '')} #${event.replace(/\s+/g, '')} #Evenement #Agenda #Officiel #Signaid`;
        break;

      case 'story':
        copy =
          `🔥 PROCHAINEMENT : ${event}\n` +
          `⭐ En vedette : ${artist}\n` +
          `📍 ${dateVenue}\n\n` +
          `👉 Cliquez pour réserver & ajouter à votre agenda : ${smartLink}`;
        break;

      case 'whatsapp':
        copy =
          `Bonjour à tous ! ⚡\n\n` +
          `Nous vous donnons rendez-vous pour *${event}* avec *${artist}*.\n` +
          `${punch}\n\n` +
          `📅 Date : *${input.date || 'Prochainement'}*\n` +
          `⏰ Horaires : *${input.timeSlot || 'Horaires à confirmer'}*\n` +
          `📍 Lieu : *${input.venue || 'Lieu officiel'}*\n\n` +
          `Toutes les informations pratiques et accès sont centralisés ici : ${smartLink}\n\n` +
          `Au plaisir de vous y retrouver ! 🙌`;
        break;

      case 'press':
        copy =
          `COMMUNIQUÉ OFFICIEL : ${event}\n\n` +
          `L'organisation de ${event} confirme la présence de ${artist}. ${punch} ` +
          `L'événement se déroulera le ${input.date || 'date à confirmer'} à ${input.venue || 'adresse communiquée sous peu'}.\n\n` +
          `Accès direct, médias et informations officielles : ${smartLink}`;
        break;
    }

    setGeneratedText(copy);
  };

  const handleCopy = () => {
    if (!generatedText) return;
    navigator.clipboard.writeText(generatedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const content = (
    <>
      {/* SÉLECTEUR DE FORMAT MARKETING */}
      <div className="grid grid-cols-4 gap-1.5 text-[10px]">
        {(['instagram', 'story', 'whatsapp', 'press'] as CopyFormat[]).map((fmt) => (
          <button
            key={fmt}
            type="button"
            onClick={() => setSelectedFormat(fmt)}
            className={`py-1.5 px-1 rounded-lg border font-bold capitalize transition flex items-center justify-center gap-1 cursor-pointer ${
              selectedFormat === fmt
                ? 'bg-lime-400 text-black border-lime-400 font-black shadow-sm'
                : isDayMode
                ? 'bg-zinc-100 text-zinc-600 border-zinc-300 hover:text-black hover:border-zinc-400'
                : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
            }`}
          >
            {fmt === 'instagram' && <Instagram className="w-3 h-3" />}
            {fmt === 'whatsapp' && <MessageSquare className="w-3 h-3" />}
            {fmt === 'story' && <Send className="w-3 h-3" />}
            {fmt === 'press' && <FileText className="w-3 h-3" />}
            <span>{fmt}</span>
          </button>
        ))}
      </div>

      {/* BOUTON D'ACTION */}
      <button
        type="button"
        disabled={isGenerating || !input.eventName}
        onClick={handleGenerate}
        className="w-full py-2 bg-lime-400 hover:bg-lime-300 disabled:opacity-50 disabled:cursor-not-allowed text-black font-black text-xs rounded-xl flex items-center justify-center gap-2 transition cursor-pointer shadow-sm"
      >
        {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
        <span>Générer le Post ({selectedFormat})</span>
      </button>

      {/* ZONE DE RÉSULTAT */}
      {generatedText && (
        <div className="space-y-2 pt-1 animate-fadeIn">
          <div className="relative">
            <textarea
              readOnly
              value={generatedText}
              rows={6}
              className={`w-full p-2.5 text-xs rounded-xl border ${
                isDayMode
                  ? 'bg-zinc-100 border-zinc-300 text-zinc-900'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-200'
              } focus:outline-none resize-none leading-relaxed font-mono`}
            />
            <button
              type="button"
              onClick={handleCopy}
              className="absolute top-2 right-2 px-2.5 py-1 rounded-lg bg-black/80 hover:bg-lime-400 hover:text-black text-lime-400 border border-lime-400/30 text-[10px] font-bold flex items-center gap-1 transition cursor-pointer backdrop-blur-sm shadow-sm"
            >
              {copied ? <Check className="w-3 h-3 stroke-[3]" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Copié !' : 'Copier'}</span>
            </button>
          </div>
        </div>
      )}
    </>
  );

  if (hideCardWrapper) {
    return <div className="space-y-3 font-mono">{content}</div>;
  }

  return (
    <div
      className={`p-4 rounded-2xl border ${
        isDayMode
          ? 'bg-white border-zinc-300 text-zinc-900 shadow-sm'
          : 'bg-zinc-950 border-zinc-800 text-zinc-100 shadow-xl'
      } space-y-3 font-mono`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-lime-400/10 text-lime-400 border border-lime-400/20">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider block">
              Générateur de Textes Marketing
            </span>
            <span className="text-[9px] text-zinc-500 font-mono block">
              Diffusion immédiate Réseaux Sociaux, Stories &amp; Invitations
            </span>
          </div>
        </div>
      </div>
      {content}
    </div>
  );
};
