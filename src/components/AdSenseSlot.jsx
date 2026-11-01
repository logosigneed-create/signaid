/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Signaid.eu - Composant Réutilisable Google AdSense & Fallback Partenaire Dividende
 * Intègre l'affichage des annonces publicitaires Google AdSense avec gestion sécurisée du cycle de vie React.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Sparkles, ShieldCheck, Zap, ExternalLink } from 'lucide-react';

/**
 * @typedef {Object} AdSenseSlotProps
 * @property {string} [adClient] - Identifiant éditeur AdSense (ex: "ca-pub-XXXXXXXXXXXXXXXX")
 * @property {string} [adSlot] - Identifiant de l'emplacement d'annonce (ex: "1234567890")
 * @property {'auto' | 'rectangle' | 'horizontal'} [adFormat] - Format de l'annonce
 * @property {string} [className] - Classes CSS Tailwind additionnelles
 * @property {boolean} [fullWidthResponsive] - Adaptation responsive automatique
 * @property {React.CSSProperties} [style] - Styles inline additionnels
 */

export const AdSenseSlot = ({
  adClient = 'ca-pub-4515435864361526',
  adSlot = '8927164920',
  adFormat = 'auto',
  className = '',
  fullWidthResponsive = true,
  style = {},
}) => {
  const adRef = useRef(null);
  const isPushedRef = useRef(false);
  const [isLocalOrBlocked, setIsLocalOrBlocked] = useState(false);
  const [adError, setAdError] = useState(false);

  // Détection d'environnement local ou placeholder de test
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const hostname = window.location.hostname;
    const isLocalhost =
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.endsWith('.local') ||
      hostname === '0.0.0.0';

    const isDummyClient = !adClient || adClient.includes('XXXX') || adClient === 'ca-pub-0000000000000000';

    if (isLocalhost || isDummyClient) {
      setIsLocalOrBlocked(true);
    }
  }, [adClient]);

  // Injection unique du script Google AdSense dans le head du document
  useEffect(() => {
    if (typeof window === 'undefined' || isLocalOrBlocked) return;

    const scriptId = 'signaid-google-adsense-script';
    if (!document.getElementById(scriptId) && adClient) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adClient}`;
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.onerror = () => {
        console.info('[AdSense] Script non chargé ou bloqué par un bloqueur de publicité. Activation du fallback.');
        setIsLocalOrBlocked(true);
      };
      document.head.appendChild(script);
    }
  }, [adClient, isLocalOrBlocked]);

  // Initialisation sécurisée de l'emplacement AdSense
  useEffect(() => {
    if (isLocalOrBlocked || isPushedRef.current) return;

    try {
      if (typeof window !== 'undefined' && adRef.current) {
        // Empêche les doubles appels sur le même élément inséré
        if (!adRef.current.getAttribute('data-adsbygoogle-status')) {
          (window.adsbygoogle = window.adsbygoogle || []).push({});
          isPushedRef.current = true;
        }
      }
    } catch (e) {
      console.warn('[AdSense] Initialisation slot intercepted (mode local/fallback activé) :', e);
      setAdError(true);
    }
  }, [isLocalOrBlocked]);

  // Formatage géométrique strict selon le type d'affichage demandé
  const getFormatStyles = () => {
    switch (adFormat) {
      case 'rectangle':
        return {
          minHeight: '250px',
          maxHeight: '280px',
          width: '100%',
          maxWidth: '336px',
        };
      case 'horizontal':
        return {
          minHeight: '90px',
          maxHeight: '100px',
          width: '100%',
        };
      case 'auto':
      default:
        return {
          minHeight: '100px',
          width: '100%',
        };
    }
  };

  // 1. Rendu Fallback Partenaire Élégant Signaid (si dev, localhost, ad-blocker ou erreur)
  if (isLocalOrBlocked || adError) {
    return (
      <div
        className={`relative overflow-hidden rounded-2xl bg-neutral-900 border border-neutral-800 p-4 transition-all duration-300 group hover:border-lime-400/40 ${className}`}
        style={{ ...getFormatStyles(), ...style }}
      >
        {/* Lueur d'ambiance orange néon */}
        <div className="pointer-events-none absolute -top-12 -right-12 w-32 h-32 bg-lime-400/10 rounded-full blur-2xl" />
        <div className="pointer-events-none absolute -bottom-12 -left-12 w-32 h-32 bg-lime-400/5 rounded-full blur-2xl" />

        {/* Trame technique subtile */}
        <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#ff6b00_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

        <div className="relative z-10 flex flex-col justify-between h-full w-full">
          {/* Header du bloc publicitaire */}
          <div className="flex items-center justify-between gap-2 border-b border-neutral-800/80 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-lime-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-lime-400" />
              </span>
              <span className="text-[10px] font-mono font-bold tracking-widest uppercase text-neutral-400">
                Espace Partenaire Signaid
              </span>
            </div>

            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-lime-400/10 border border-lime-400/20 text-lime-400 text-[9px] font-mono font-bold uppercase tracking-wider">
              <Zap className="w-2.5 h-2.5 fill-lime-400" />
              <span>Financement du Dividende</span>
            </div>
          </div>

          {/* Corps de l'espace partenaire */}
          <div className="my-auto py-2.5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-center shrink-0 shadow-inner group-hover:border-lime-400/30 transition-colors">
              <Sparkles className="w-5 h-5 text-lime-400 animate-pulse" />
            </div>

            <div className="text-left space-y-0.5 flex-1 min-w-0">
              <div className="text-xs font-bold font-mono uppercase text-neutral-200 tracking-wide flex items-center gap-1.5">
                <span>Réseau Partenaire Monétisé</span>
                <span className="text-[10px] text-lime-400 font-black">+0,05 €</span>
              </div>
              <p className="text-[11px] text-neutral-400 leading-snug line-clamp-2">
                Les revenus publicitaires financent l'accès illimité aux rendus IA et créditent votre cagnotte textile DTF & affiches.
              </p>
            </div>
          </div>

          {/* Footer technique */}
          <div className="flex items-center justify-between text-[9px] font-mono text-neutral-500 pt-2 border-t border-neutral-800/60">
            <span className="truncate max-w-[200px]">
              Slot: {adSlot} • {adFormat.toUpperCase()}
            </span>
            <div className="flex items-center gap-1 text-lime-400/80">
              <ShieldCheck className="w-3 h-3 text-lime-400" />
              <span>Garantie Zéro Frais Cachés</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. Rendu Normal de l'Annonce Google AdSense (en Production)
  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center ${className}`}
      style={{ ...getFormatStyles(), ...style }}
    >
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          ...style,
        }}
        data-ad-client={adClient}
        data-ad-slot={adSlot}
        data-ad-format={adFormat}
        data-full-width-responsive={fullWidthResponsive ? 'true' : 'false'}
      />
    </div>
  );
};

export default AdSenseSlot;
