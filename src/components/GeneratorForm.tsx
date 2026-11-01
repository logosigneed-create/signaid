import React from 'react';
import { EventInput, MusicGenre, TshirtColor, INITIAL_DEMO_STATE } from '../types';
import { Sparkles, Zap, MapPin, Calendar, Tag, Shirt } from 'lucide-react';
import { AmbianceImageGenerator } from './AmbianceImageGenerator';
import { VisualAssetCustomizer } from './VisualAssetCustomizer';
import { LogoUploadSection } from './LogoUploadSection';

interface GeneratorFormProps {
  input: EventInput;
  setInput: React.Dispatch<React.SetStateAction<EventInput>>;
  onGenerate: () => void;
  isGenerating: boolean;
  onApplyPreset: (preset: Partial<EventInput>) => void;
}

const GENRES: { label: MusicGenre; emoji: string }[] = [
  { label: 'Techno & Industrial', emoji: '⚡' },
  { label: 'Hard Groove & Acid', emoji: '🧪' },
  { label: 'House & Deep Minimal', emoji: '🪩' },
  { label: 'Rap & Trap Drill', emoji: '🎤' },
  { label: 'Afrobeats & Amapiano', emoji: '🌴' },
  { label: 'Drum & Bass / Jungle', emoji: '🔊' },
];

const TSHIRT_COLORS: { key: TshirtColor; name: string; hex: string; subtitle: string }[] = [
  { key: 'black', name: 'T-Shirt Noir', hex: '#0e1015', subtitle: 'Noir Profond Coton Lourd 240g' },
  { key: 'white', name: 'T-Shirt Blanc', hex: '#ffffff', subtitle: 'Blanc Optique Coton Lourd 240g' },
];

const SAMPLE_PUNCHLINES: Record<string, string[]> = {
  'Techno & Industrial': [
    'No Phone On The Dancefloor',
    'Raw strobes and pure kinetic pressure',
    'Industrial echoes until the lights turn on',
    'Heavy sub frequencies for relentless souls',
  ],
  'Hard Groove & Acid': [
    'Fast tempo, 303 acid curves & sweat',
    'Continuous groove protocol',
    'Pure analog vibration all night long',
  ],
  'House & Deep Minimal': [
    'Warm chords, cold drinks, high frequencies',
    'Sunset to sunrise sound journey',
    'House music is a spiritual thing',
  ],
  'Rap & Trap Drill': [
    'Lourd sur le bitume, bouillant dans le club',
    'Showcase exclusif : 100% énergie brute',
    'Le sound-system ne ment jamais',
  ],
};

export const GeneratorForm: React.FC<GeneratorFormProps> = ({
  input,
  setInput,
  onGenerate,
  isGenerating,
  onApplyPreset,
}) => {
  const handleRandomPunchline = () => {
    const list = (input.genre && SAMPLE_PUNCHLINES[input.genre]) || SAMPLE_PUNCHLINES['Techno & Industrial'];
    const random = list[Math.floor(Math.random() * list.length)];
    setInput((prev) => ({ ...prev, punchline: random }));
  };

  return (
    <div className="bg-zinc-900/80 border border-zinc-800 rounded-3xl p-5 sm:p-7 shadow-xl shadow-black/40 backdrop-blur-sm">
      {/* Header & Presets */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-6 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-lime-400 animate-ping" />
            <h2 className="text-lg sm:text-xl font-extrabold text-white font-['Syne'] tracking-tight">
              1. Paramètres de l'Événement DJ
            </h2>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Entre le nom de ta soirée, tes artistes et ta punchline. L'IA assemble affiche, story, post et merch.
          </p>
        </div>

        {/* Quick Presets for instant testing */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-zinc-500 font-semibold uppercase tracking-wider mr-1">Presets :</span>
          <button
            id="preset-dokiin"
            type="button"
            onClick={() => onApplyPreset(INITIAL_DEMO_STATE)}
            className="px-2.5 py-1 rounded-lg bg-lime-400/20 hover:bg-lime-400/30 text-lime-400 text-xs font-bold border border-lime-400/40 transition-colors cursor-pointer"
          >
            🔥 D OKIIN Live
          </button>
          <button
            id="preset-techno"
            type="button"
            onClick={() =>
              onApplyPreset({
                eventName: 'SUB FREQUENCY 001',
                djName: 'DJ VORTEX b2b KRONOS',
                genre: 'Techno & Industrial',
                punchline: 'No Phone On The Dancefloor',
                venue: 'Le Badaboum, Paris',
                date: 'Samedi 14 Novembre 2026 - 23h/06h',
                ticketPrice: '12€ Prévente / 15€ Sur place',
                tshirtColor: 'black',
              })
            }
            className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium border border-zinc-700/60 transition-colors"
          >
            ⚡ Techno Warehouse
          </button>
          <button
            id="preset-house"
            type="button"
            onClick={() =>
              onApplyPreset({
                eventName: 'VELVET SUNSET',
                djName: 'SARA DISCO & FRIENDS',
                genre: 'House & Deep Minimal',
                punchline: 'Warm chords, cold drinks & endless dance',
                venue: 'Le Sucre Rooftop, Lyon',
                date: 'Dimanche 21 Juin 2026 - 17h/01h',
                ticketPrice: '10€ Early Bird',
                tshirtColor: 'white',
              })
            }
            className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium border border-zinc-700/60 transition-colors"
          >
            🪩 House Sunset
          </button>
          <button
            id="preset-rap"
            type="button"
            onClick={() =>
              onApplyPreset({
                eventName: 'NOCTURNE DRILL',
                djName: 'DJ BLACKOUT (Live Set)',
                genre: 'Rap & Trap Drill',
                punchline: 'Showcase exclusif : 100% énergie brute',
                venue: 'Espace Julien, Marseille',
                date: 'Vendredi 4 Décembre 2026',
                ticketPrice: '15€ Early / 18€ Guichet',
                tshirtColor: 'black',
              })
            }
            className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium border border-zinc-700/60 transition-colors"
          >
            🎤 Rap Showcase
          </button>
        </div>
      </div>

      {/* Form Fields Grid */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Event Name */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300">
              Nom de la Soirée / Événement *
            </label>
            <span className={`text-[10px] font-mono font-bold ${(input.eventName || '').length >= 25 ? 'text-red-400' : (input.eventName || '').length >= 20 ? 'text-amber-400' : 'text-zinc-500'}`}>
              {(input.eventName || '').length}/25
            </span>
          </div>
          <input
            id="input-event-name"
            type="text"
            required
            maxLength={25}
            value={input.eventName}
            onChange={(e) => setInput({ ...input, eventName: e.target.value.slice(0, 25) })}
            placeholder="Ex: SUB FREQUENCY 001..."
            className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl px-4 py-2.5 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-lime-400 focus:ring-1 focus:ring-lime-400 transition"
          />
        </div>

        {/* DJ / Headliner Name */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300">
              Nom du DJ / Headliner / Collectif *
            </label>
            <span className={`text-[10px] font-mono font-bold ${(input.djName || '').length >= 25 ? 'text-red-400' : (input.djName || '').length >= 20 ? 'text-amber-400' : 'text-zinc-500'}`}>
              {(input.djName || '').length}/25
            </span>
          </div>
          <input
            id="input-dj-name"
            type="text"
            required
            maxLength={25}
            value={input.djName}
            onChange={(e) => setInput({ ...input, djName: e.target.value.slice(0, 25) })}
            placeholder="Ex: DJ KRONOS..."
            className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl px-4 py-2.5 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-lime-400 focus:ring-1 focus:ring-lime-400 transition"
          />
        </div>

        {/* Music Genre Selector */}
        <div className="md:col-span-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-2">
            Style Musical &amp; Ambiance Club
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
            {GENRES.map((g) => {
              const active = input.genre === g.label;
              return (
                <button
                  key={g.label}
                  type="button"
                  id={`genre-${g.label.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                  onClick={() => setInput({ ...input, genre: g.label })}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${active
                      ? 'bg-lime-400/10 border-lime-400 text-lime-300 shadow-sm shadow-lime-400/20 font-bold'
                      : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                    }`}
                >
                  <span>{g.emoji}</span>
                  <span className="truncate">{g.label.split(' ')[0]}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Punchline with IA Generator */}
        <div className="md:col-span-2">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300">
                Punchline / Slogan de la Soirée *
              </label>
              <span className={`text-[10px] font-mono font-bold ${(input.punchline || '').length >= 25 ? 'text-red-400' : (input.punchline || '').length >= 20 ? 'text-amber-400' : 'text-zinc-500'}`}>
                {(input.punchline || '').length}/25
              </span>
            </div>
            <button
              id="btn-random-punchline"
              type="button"
              onClick={handleRandomPunchline}
              className="text-[11px] flex items-center gap-1 text-lime-400 hover:text-lime-300 font-semibold transition cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Suggérer une punchline club
            </button>
          </div>
          <div className="relative">
            <input
              id="input-punchline"
              type="text"
              maxLength={25}
              value={input.punchline}
              onChange={(e) => setInput({ ...input, punchline: e.target.value.slice(0, 25) })}
              placeholder="Ex: NO PHONE ON THE DANCEFLOOR..."
              className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl px-4 py-2.5 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-lime-400 focus:ring-1 focus:ring-lime-400 transition"
            />
          </div>
        </div>

        {/* Venue & Location */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-1.5">
            Lieu / Club / Salle
          </label>
          <div className="relative">
            <MapPin className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
            <input
              id="input-venue"
              type="text"
              value={input.venue}
              onChange={(e) => setInput({ ...input, venue: e.target.value })}
              placeholder="Ex: Le Hangar Club, Paris / Le Sucre, Lyon..."
              className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-lime-400 focus:ring-1 focus:ring-lime-400 transition"
            />
          </div>
        </div>

        {/* Date & Schedule */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-1.5">
            Date &amp; Horaires
          </label>
          <div className="relative">
            <Calendar className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
            <input
              id="input-date"
              type="text"
              value={input.date}
              onChange={(e) => setInput({ ...input, date: e.target.value })}
              placeholder="Ex: Samedi 24 Octobre 2026 - 23h à l'aube"
              className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-lime-400 focus:ring-1 focus:ring-lime-400 transition"
            />
          </div>
        </div>

        {/* Ticket Price */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-1.5">
            Tarif / Billetterie
          </label>
          <div className="relative">
            <Tag className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
            <input
              id="input-ticket"
              type="text"
              value={input.ticketPrice}
              onChange={(e) => setInput({ ...input, ticketPrice: e.target.value })}
              placeholder="Ex: 12€ Prévente / 15€ Sur place"
              className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-lime-400 focus:ring-1 focus:ring-lime-400 transition"
            />
          </div>
        </div>

        {/* Lineup / Guests */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-1.5">
            Line-up / Guests (Optionnel)
          </label>
          <input
            id="input-lineup"
            type="text"
            value={input.lineup || ''}
            onChange={(e) => setInput({ ...input, lineup: e.target.value })}
            placeholder="Ex: GUEST 1 • RESIDENT DJ • ANALOG LIVE"
            className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl px-4 py-2.5 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-lime-400 focus:ring-1 focus:ring-lime-400 transition"
          />
        </div>

        {/* T-Shirt Merch Color Picker: ONLY Black or White */}
        <div className="md:col-span-2">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
              <Shirt className="w-3.5 h-3.5 text-lime-400" />
              Coloris T-Shirt Merch (Sérigraphie &amp; DTF)
            </label>
            <span className="text-[11px] text-zinc-400">
              Choisis : <strong className="text-white">{input.tshirtColor === 'white' ? 'Blanc Optique' : 'Noir Profond'}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {TSHIRT_COLORS.map((tc) => {
              const active = input.tshirtColor === tc.key;
              return (
                <button
                  key={tc.key}
                  type="button"
                  id={`tshirt-color-${tc.key}`}
                  onClick={() => setInput({ ...input, tshirtColor: tc.key })}
                  className={`flex items-center gap-3.5 p-3 rounded-2xl border text-left transition-all ${active
                      ? 'bg-zinc-800 border-lime-400 ring-2 ring-lime-400/40 text-white shadow-lg'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                    }`}
                >
                  <span
                    className="w-8 h-8 rounded-xl border-2 border-zinc-600/80 shrink-0 shadow-inner flex items-center justify-center font-bold text-xs"
                    style={{
                      backgroundColor: tc.hex,
                      color: tc.key === 'white' ? '#0f1015' : '#ffffff',
                    }}
                  >
                    {tc.key === 'white' ? 'W' : 'B'}
                  </span>
                  <div>
                    <span className="text-sm font-bold block text-white">{tc.name}</span>
                    <span className="text-[11px] text-zinc-400 block">{tc.subtitle}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Générateur d'Image d'Ambiance IA (replaces static visual palette) */}
      <div className="mt-8 pt-6 border-t border-zinc-800">
        <AmbianceImageGenerator input={input} setInput={setInput} />
      </div>

      {/* Photo & Portrait du DJ (Optionnel) */}
      <VisualAssetCustomizer input={input} setInput={setInput} />

      {/* Logo Upload & Vector Redesign (Refonte Studio +15€) */}
      <div className="mt-8 pt-6 border-t border-zinc-800">
        <LogoUploadSection input={input} setInput={setInput} />
      </div>

      {/* Action Button */}
      <div className="mt-8 pt-6 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-xs text-zinc-400 flex items-center gap-2">
          <Zap className="w-4 h-4 text-lime-400 shrink-0" />
          <span>Génération instantanée : Affiche A3, Story 9:16, Post 1:1, T-Shirt &amp; fichier découpe</span>
        </div>

        <button
          id="btn-generate-pack"
          type="button"
          disabled={isGenerating || !input.eventName || !input.djName}
          onClick={onGenerate}
          className={`w-full sm:w-auto px-8 py-3.5 rounded-2xl font-black text-sm tracking-wide uppercase transition-all shadow-lg flex items-center justify-center gap-2.5 ${isGenerating || !input.eventName || !input.djName
              ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-lime-400 to-emerald-400 hover:from-lime-300 hover:to-emerald-300 text-zinc-950 shadow-lime-400/25 hover:scale-[1.02] active:scale-[0.98]'
            }`}
        >
          {isGenerating ? (
            <>
              <div className="w-4 h-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
              <span>Génération IA en cours...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Générer le Pack Complet</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
