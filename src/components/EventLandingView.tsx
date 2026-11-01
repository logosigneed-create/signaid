import React, { useState, useEffect } from 'react';
import { Calendar, MapPin, ExternalLink, Share2, Ticket, Music, ArrowLeft, MessageCircle } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { EventInput } from '../types';
import { generateSquarePostSvg } from '../utils/visualGenerator';

export interface EventHubPageProps {
  eventData: EventInput;
  posterImageUrl: string; // URL ou dataURL du flyer au format Post 1:1
}

export const EventHubPage: React.FC<EventHubPageProps> = ({ eventData, posterImageUrl }) => {
  // 1. Lien Google Calendar
  const calTitle = encodeURIComponent(`${eventData.eventName || 'Événement'} // ${eventData.djName || 'Artiste'}`);
  const calDetails = encodeURIComponent(`${eventData.punchline || ''}\nPlus d'infos : ${window.location.href}`);
  const calLocation = encodeURIComponent(eventData.venue || '');
  const googleCalendarUrl = eventData.calendarUrl || `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${calTitle}&details=${calDetails}&location=${calLocation}`;

  // 2. Lien Itinéraire Google Maps
  const googleMapsUrl = eventData.venueMapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(eventData.venue || '')}`;

  // 3. Lien Artiste / Organisation
  const artistUrl = eventData.artistUrl?.startsWith('http') 
    ? eventData.artistUrl 
    : `https://${eventData.artistUrl || 'signaid.eu'}`;

  const primaryAccent = eventData.accentColor || '#FF6B00';

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: eventData.eventName, url: window.location.href });
      } catch {
        // Ignorer l'annulation utilisateur
      }
    } else {
      try {
        await navigator.clipboard.writeText(window.location.href);
      } catch {
        // Fallback
      }
      alert('Lien copié !');
    }
  };

  return (
    <div className="min-h-[100dvh] bg-zinc-950 text-white flex flex-col items-center justify-between p-3 sm:p-4 font-mono selection:bg-lime-400 selection:text-black">
      {/* Conteneur Mobile-First calibré */}
      <div className="w-full max-w-md flex flex-col justify-between flex-1 space-y-2.5 sm:space-y-3">
        
        {/* EN-TÊTE / BRANDING DISCRET */}
        <div className="flex items-center justify-between text-[11px] text-zinc-500 border-b border-zinc-900 pb-2">
          <a href="/" className="font-bold tracking-wider hover:text-white transition flex items-center gap-1.5" title="Retourner au Studio">
            <span className="w-2 h-2 rounded-full bg-lime-400 animate-pulse" />
            <span>SIGNAID<span className="text-lime-400">.EU</span> // HUB</span>
          </a>
          <button 
            type="button"
            onClick={handleShare}
            className="flex items-center gap-1 hover:text-zinc-300 transition cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Partager</span>
          </button>
        </div>

        {/* 1. LES BOUTONS D'ACCÈS RAPIDE INDISPENSABLES EN HAUT (GPS, CONTACT / WHATSAPP) */}
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            {/* BOUTON GPS */}
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2.5 rounded-xl bg-zinc-900/90 border border-zinc-800 hover:border-lime-400/50 hover:bg-zinc-850 transition flex items-center gap-2.5 group shadow-sm min-w-0"
            >
              <div className="p-1.5 rounded-lg bg-lime-400/10 text-lime-400 border border-lime-400/20 group-hover:scale-105 transition-transform shrink-0">
                <MapPin className="w-4 h-4" />
              </div>
              <div className="text-left min-w-0 flex-1">
                <div className="text-xs font-bold uppercase text-zinc-200 truncate">
                  Itinéraire GPS
                </div>
                <div className="text-[10px] text-zinc-500 truncate">
                  {eventData.venue || "Ouvrir l'itinéraire GPS"}
                </div>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-zinc-600 group-hover:text-lime-400 transition shrink-0" />
            </a>

            {/* BOUTON CONTACT / WHATSAPP */}
            <a
              href={artistUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2.5 rounded-xl bg-zinc-900/90 border border-zinc-800 hover:border-lime-400/50 hover:bg-zinc-850 transition flex items-center gap-2.5 group shadow-sm min-w-0"
            >
              <div className="p-1.5 rounded-lg bg-lime-400/10 text-lime-400 border border-lime-400/20 group-hover:scale-105 transition-transform shrink-0">
                <MessageCircle className="w-4 h-4" />
              </div>
              <div className="text-left min-w-0 flex-1">
                <div className="text-xs font-bold uppercase text-zinc-200 truncate">
                  Contact
                </div>
                <div className="text-[10px] text-zinc-500 truncate">
                  {eventData.djName || "WhatsApp / Artiste"}
                </div>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-zinc-600 group-hover:text-lime-400 transition shrink-0" />
            </a>
          </div>

          {/* Date & Agenda */}
          <a
            href={googleCalendarUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-1.5 px-2.5 rounded-xl bg-zinc-900/90 border border-zinc-800 hover:border-lime-400/50 hover:bg-zinc-850 transition flex items-center justify-between text-xs group"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Calendar className="w-3.5 h-3.5 text-lime-400 shrink-0" />
              <span className="text-zinc-200 font-bold truncate text-[11px]">
                {eventData.date || 'Date à confirmer'}
              </span>
              <span className="hidden min-[380px]:inline text-zinc-500 text-[10px] truncate">
                • Ajouter à Google Agenda
              </span>
            </div>
            <span className="text-[10px] font-bold text-lime-400 px-1.5 py-0.5 rounded bg-lime-400/10 border border-lime-400/20 shrink-0">
              + Agenda
            </span>
          </a>
        </div>

        {/* 2. VISUEL DU FLYER (POST 1:1) PUR SANS POLLUTION NI REDONDANCE */}
        <div className="flex-1 flex flex-col items-center justify-center min-h-0 w-full my-auto">
          <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden border border-zinc-800 shadow-2xl bg-zinc-900 aspect-square w-full max-w-[390px] max-h-[calc(100dvh-230px)] flex items-center justify-center">
            <img 
              src={posterImageUrl} 
              alt={eventData.eventName || 'Affiche officielle'} 
              width={500}
              height={500}
              fetchPriority="high"
              decoding="async"
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* 3. UNIQUE ENCART FINAL DISCRET : CONVERSION & BRANDING MINIMALISTE */}
        <div className="w-full max-w-md mx-auto pt-1 pb-1">
          <div className="p-3 rounded-2xl bg-zinc-900/90 border border-zinc-800 hover:border-lime-400/40 transition-colors shadow-lg flex items-center justify-between gap-3">
            <div className="text-left min-w-0">
              <div className="flex items-center gap-1.5 text-[10px] text-lime-400 font-mono font-bold uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-lime-400 animate-pulse shrink-0" />
                <span className="truncate">Signaid.eu</span>
              </div>
              <p className="text-[11px] text-zinc-400 font-mono truncate">
                Portail interactif &amp; billetterie
              </p>
            </div>

            <button
              type="button"
              onClick={() => { window.location.href = '/'; }}
              className="py-2 px-3.5 rounded-xl bg-lime-400 hover:bg-lime-300 text-black font-black font-mono text-[11px] uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md shadow-lime-400/20 active:scale-95 transition cursor-pointer shrink-0"
            >
              <span>⚡</span>
              <span>DÉPLOYER MON PROPRE SYSTÈME</span>
              <span>››</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface EventLandingViewProps {
  initialEventData?: EventInput;
  initialPosterImageUrl?: string;
  slug?: string;
}

export const EventLandingView: React.FC<EventLandingViewProps> = ({
  initialEventData,
  initialPosterImageUrl,
  slug: propSlug,
}) => {
  // Extraction du slug depuis l'URL /hub/:slug, /e/:slug ou /event/:id
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
  const urlSlug = propSlug || currentPath.replace(/^\/(hub|e|event)\//, '').split('/')[0] || '';

  const [eventData, setEventData] = useState<EventInput>(() => {
    if (initialEventData) return initialEventData;

    // 1. Recherche dans le LocalStorage par slug
    if (urlSlug) {
      try {
        const specificDraft = localStorage.getItem(`signaid_studio_draft_${urlSlug}`);
        if (specificDraft) return JSON.parse(specificDraft);
        const stored = localStorage.getItem(`droppaid_hub_event_${urlSlug}`);
        if (stored) return JSON.parse(stored);
      } catch {}
    }

    // 2. Recherche du dernier input actif
    try {
      const activeDraft = localStorage.getItem('signaid_studio_draft_active');
      if (activeDraft) return JSON.parse(activeDraft);
      const lastInput = localStorage.getItem('droppaid_last_event_input');
      if (lastInput) return JSON.parse(lastInput);
    } catch {}

    // 3. Fallback déduit du slug (neutre, pas de profil codé en dur)
    const parts = urlSlug ? urlSlug.split('-') : [];
    const eventName = parts.length > 0 ? parts[0].toUpperCase() : '';
    const djName = parts.length > 1 ? parts.slice(1).join(' ').toUpperCase() : '';

    return {
      eventName,
      djName,
      date: '',
      timeSlot: '',
      time: '',
      venue: '',
      punchline: '',
      accentColor: '#f2f2f2',
      artistUrl: urlSlug ? `https://signaid.eu/hub/${urlSlug}` : 'https://signaid.eu',
    } as EventInput;
  });

  const [posterImageUrl, setPosterImageUrl] = useState<string>(() => {
    if (initialPosterImageUrl) return initialPosterImageUrl;

    if (urlSlug) {
      try {
        const storedPoster = localStorage.getItem(`droppaid_hub_poster_${urlSlug}`);
        if (storedPoster) return storedPoster;
      } catch {}
    }

    try {
      const lastPoster = localStorage.getItem('droppaid_last_poster_post');
      if (lastPoster) return lastPoster;
    } catch {}

    return '';
  });

  // Chargement asynchrone direct depuis Firestore (collection 'portals' puis 'projects')
  useEffect(() => {
    let isCancelled = false;

    if (urlSlug && !initialEventData) {
      (async () => {
        try {
          let snap = await getDoc(doc(db, 'portals', urlSlug));
          if (!snap.exists()) {
            snap = await getDoc(doc(db, 'projects', urlSlug));
          }
          if (!isCancelled && snap.exists()) {
            const data = snap.data();
            const projectInput = data?.input || data;
            if (projectInput) {
              setEventData(projectInput);
              if (projectInput.previewImages?.a3 || projectInput.flyerImageUrl) {
                setPosterImageUrl(projectInput.previewImages?.a3 || projectInput.flyerImageUrl);
              }
            }
          }
        } catch (err) {
          console.warn('[EventLandingView] Erreur lecture Firestore:', err);
        }
      })();
    }

    return () => {
      isCancelled = true;
    };
  }, [urlSlug, initialEventData]);

  // Si aucune image n'est disponible, on génère à la volée le SVG officiel Post 1:1 en dataURL
  const effectivePosterUrl = React.useMemo(() => {
    if (posterImageUrl) return posterImageUrl;
    try {
      const svg = generateSquarePostSvg(eventData, true);
      return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    } catch (err) {
      console.warn('[EventLandingView] Erreur génération SVG:', err);
      return '';
    }
  }, [posterImageUrl, eventData]);

  return <EventHubPage eventData={eventData} posterImageUrl={effectivePosterUrl} />;
};

export default EventLandingView;
