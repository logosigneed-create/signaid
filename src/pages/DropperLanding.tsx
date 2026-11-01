/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Droppaid.ai - Landing Page Commerciale Haute Conversion (/dropper & /)
 * Dédiée aux Organisateurs d'événements, Collectifs de musique électronique & DJs.
 * Conçue selon les standards UI/UX Pro Max : Dark OLED, Hi-Fi Contrast, Accessible Touch, Interactive Simulator & FAQ.
 */

import React, { useState, useEffect } from 'react';
import {
  Flame,
  ArrowRight,
  PackageCheck,
  Shirt,
  Link2,
  TrendingUp,
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  Zap,
  Music,
  MapPin,
  Ticket,
  ChevronDown,
  ChevronUp,
  Sliders,
  DollarSign,
  Truck,
  RotateCcw,
  HelpCircle,
  QrCode,
  Smartphone,
  Layers,
  ShoppingBag,
  ExternalLink,
  Check,
} from 'lucide-react';

export interface DropperLandingProps {
  onNavigateStudio?: (intent?: string) => void;
}

export const DropperLanding: React.FC<DropperLandingProps> = ({ onNavigateStudio }) => {
  // Simulateur de bénéfices soirée
  const [soldPieces, setSoldPieces] = useState<number>(80);
  const MARGIN_PER_PIECE = 14; // 14 € de marge nette par pièce
  const AVERAGE_FAN_PRICE = 32; // Prix public moyen constaté

  const totalNetProfit = soldPieces * MARGIN_PER_PIECE;
  const estimatedRevenue = soldPieces * AVERAGE_FAN_PRICE;
  const productionCost = estimatedRevenue - totalNetProfit;

  // Showcase interactif (Hero Tabs)
  const [activeShowcaseTab, setActiveShowcaseTab] = useState<'poster' | 'merch' | 'smartlink'>('poster');

  // FAQ Accordion
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);

  // Détection de défilement pour la barre sticky mobile
  const [showStickyBar, setShowStickyBar] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowStickyBar(window.scrollY > 420);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleActionClick = (intent?: string | React.MouseEvent) => {
    const resolvedIntent = typeof intent === 'string' && intent ? intent : 'headliner_drop';
    if (onNavigateStudio) {
      onNavigateStudio(resolvedIntent);
    } else if (typeof window !== 'undefined') {
      window.location.href = `/studio?intent=${resolvedIntent}`;
    }
  };

  const handleDirectStudioAccess = () => {
    if (onNavigateStudio) {
      onNavigateStudio('');
    } else if (typeof window !== 'undefined') {
      window.location.href = '/studio';
    }
  };

  const presets = [
    { label: 'Club intimiste', count: 25, icon: '⚡' },
    { label: 'Soirée 500 pers.', count: 50, icon: '🔥' },
    { label: 'Collectif régulier', count: 80, icon: '🚀' },
    { label: 'Warehouse / Open Air', count: 150, icon: '🔊' },
    { label: 'Festival / Format XXL', count: 250, icon: '👑' },
  ];

  const faqs = [
    {
      q: "Comment et quand mon collectif reçoit-il les bénéfices ?",
      a: "Chaque vente déclenche un encaissement direct via Stripe. Les 14 € de marge nette par pièce sont automatiquement isolés et versés directement sur le compte bancaire de votre organisation ou collectif sans délai de rétention."
    },
    {
      q: "Y a-t-il vraiment 0 € d'avance ou d'abonnement ?",
      a: "Absolument zéro euro. Il n'y a aucun abonnement mensuel, aucun frais de mise en ligne et aucune avance de trésorerie demandée. L'atelier de production imprime et expédie à la commande ; si aucune commande n'est passée, vous ne déboursez rien."
    },
    {
      q: "Quelle est la qualité des t-shirts et de l'impression ?",
      a: "Nous sélectionnons exclusivement des cotons peignés lourds 240g/m² avec coupe streetwear boxy fit moderne. L'impression industrielle DTF (Direct-to-Film) offre un rendu photographique ultra-net qui résiste à plus de 50 lavages à 60°C sans craqueler."
    },
    {
      q: "Comment les fans achètent-ils pendant ou avant la soirée ?",
      a: "Votre SmartLink officiel est immédiatement prêt à poster dans votre bio Instagram et vos stories. Vous pouvez également générer et imprimer le QR Code officiel sur vos flyers pour que les participants commandent en 30 secondes au bar ou sur le dancefloor (Apple Pay / CB)."
    },
    {
      q: "Puis-je intégrer ma billetterie Shotgun, Dice ou Resident Advisor ?",
      a: "Oui, nativement. Le SmartLink centralise sur une seule page le lien direct vers votre billetterie officielle (Shotgun, Dice, RA), la géolocalisation GPS du lieu (Waze / Google Maps) et la boutique merch."
    }
  ];

  const sliderPercent = ((soldPieces - 20) / (300 - 20)) * 100;

  return (
    <div className="min-h-screen bg-[#07080b] text-zinc-100 font-sans selection:bg-lime-400 selection:text-black overflow-x-hidden antialiased">
      {/* Grille matricielle subtile & Halos néon (Dark Club Atmosphere) */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: 'radial-gradient(rgba(163, 230, 53, 0.4) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[550px] bg-gradient-to-b from-lime-400/12 via-orange-500/6 to-transparent blur-3xl opacity-80" />
        <div className="absolute top-[35%] right-[-12%] w-[550px] h-[550px] bg-orange-600/6 blur-3xl rounded-full" />
        <div className="absolute top-[70%] left-[-10%] w-[600px] h-[600px] bg-lime-500/6 blur-3xl rounded-full" />
      </div>

      {/* --- HEADER NAVIGATION PERMANENT --- */}
      <header className="relative z-50 w-full border-b border-zinc-800/80 bg-[#07080b]/90 backdrop-blur-xl sticky top-0 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
          <a
            href="/"
            className="flex items-center gap-3 group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-400 rounded-xl"
            aria-label="Dropper Accueil"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-lime-400 to-lime-500 flex items-center justify-center shadow-lg shadow-lime-400/25 group-hover:scale-105 transition-transform duration-300">
              <span className="font-black font-mono text-black text-xl leading-none">D</span>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-black font-mono text-lg sm:text-xl tracking-tight text-white group-hover:text-lime-400 transition-colors">
                  DROPPER
                </span>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-lime-400/10 border border-lime-400/30 text-lime-400 tracking-wider">
                  OFFICIAL SUITE
                </span>
              </div>
              <span className="text-[10px] font-mono text-zinc-400 tracking-widest uppercase hidden sm:inline">
                Affiches • Stand Merch • SmartLink
              </span>
            </div>
          </a>

          {/* Statut Atelier Live & Navigation */}
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900/80 border border-zinc-800 text-[11px] font-mono text-zinc-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Atelier DTF : <strong className="text-zinc-200">En ligne</strong></span>
            </div>

            <a
              href="#simulateur"
              className="hidden md:inline-flex items-center gap-1.5 text-xs font-mono font-bold text-zinc-300 hover:text-white transition px-3 py-1.5 rounded-lg focus-visible:ring-2 focus-visible:ring-lime-400"
            >
              <TrendingUp className="w-3.5 h-3.5 text-lime-400" />
              <span>Simulateur</span>
            </a>

            <a
              href="#faq"
              className="hidden md:inline-flex items-center gap-1.5 text-xs font-mono text-zinc-400 hover:text-white transition px-2 py-1.5 rounded-lg focus-visible:ring-2 focus-visible:ring-lime-400"
            >
              <HelpCircle className="w-3.5 h-3.5 text-zinc-400" />
              <span>FAQ</span>
            </a>

            <button
              type="button"
              onClick={handleDirectStudioAccess}
              className="py-2.5 px-4 sm:px-5 rounded-xl bg-lime-400 hover:bg-lime-300 text-black font-mono font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-md shadow-lime-400/20 active:scale-95 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            >
              <span>Accès Studio</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        {/* --- SECTION 1 : HERO D'ACQUISITION (Proposition de Valeur Immédiate) --- */}
        <section className="pt-10 sm:pt-20 pb-16 sm:pb-24 border-b border-zinc-800/80">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            {/* Badge Supérieur Luminescent (Pas d'emoji brut, SVG Flame animé) */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-zinc-900/90 border border-orange-500/40 shadow-lg shadow-orange-500/15 mb-8 animate-fadeIn">
              <Flame className="w-4 h-4 text-orange-400 animate-pulse" />
              <span className="font-mono text-xs font-black uppercase tracking-wider text-orange-400">
                PACK OFFICIEL DATE &amp; MERCH • CLUBS, COLLECTIFS &amp; ARTISTES
              </span>
            </div>

            {/* Titre H1 percutant avec typographie contrastée */}
            <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-black uppercase tracking-tight leading-[1.08] text-white max-w-5xl mx-auto">
              Vends le merch de ta soirée{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-lime-400 via-lime-300 to-emerald-400">
                sans avancer 1 € de stock.
              </span>
            </h1>

            {/* Sous-titre stratégique haute lisibilité */}
            <p className="mt-6 sm:mt-8 text-base sm:text-lg md:text-xl text-zinc-300 max-w-3xl mx-auto font-normal leading-relaxed">
              Tes visuels de promo prêts à poster, ton stand merch virtuel en vente directe et ton SmartLink billetterie déployés en 60 secondes. L'atelier imprime et livre tes fans sous marque blanche.
            </p>

            {/* Call-to-Action Massif */}
            <div className="mt-10 sm:mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                type="button"
                onClick={handleActionClick}
                className="w-full sm:w-auto px-8 sm:px-12 py-4 sm:py-5 rounded-2xl bg-lime-400 hover:bg-lime-300 text-black font-mono font-black text-sm sm:text-base uppercase tracking-wider flex items-center justify-center gap-3 shadow-[0_0_35px_rgba(163,230,53,0.35)] active:scale-95 transition-all cursor-pointer group focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-lime-400/50"
              >
                <span>CRÉER LE PACK DE MON ÉVÉNEMENT</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform" />
              </button>
            </div>

            {/* 4 Badges de Réassurance Clés avec Hi-Fi Contrast */}
            <div className="mt-10 pt-8 border-t border-zinc-800/80 max-w-3xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-3 rounded-2xl bg-zinc-900/50 border border-zinc-800 hover:border-lime-400/30 transition-colors">
                <span className="block font-mono font-black text-lime-400 text-lg sm:text-2xl">0 €</span>
                <span className="text-xs font-mono text-zinc-400">Avance de stock</span>
              </div>
              <div className="p-3 rounded-2xl bg-zinc-900/50 border border-zinc-800 hover:border-orange-500/30 transition-colors">
                <span className="block font-mono font-black text-orange-400 text-lg sm:text-2xl">0 carton</span>
                <span className="text-xs font-mono text-zinc-400">Dans le coffre</span>
              </div>
              <div className="p-3 rounded-2xl bg-zinc-900/50 border border-zinc-800 hover:border-emerald-400/30 transition-colors">
                <span className="block font-mono font-black text-white text-lg sm:text-2xl">+14 €</span>
                <span className="text-xs font-mono text-zinc-400">Marge nette / pièce</span>
              </div>
              <div className="p-3 rounded-2xl bg-zinc-900/50 border border-zinc-800 hover:border-lime-400/30 transition-colors">
                <span className="block font-mono font-black text-lime-400 text-lg sm:text-2xl">60 sec</span>
                <span className="text-xs font-mono text-zinc-400">Mise en ligne chrono</span>
              </div>
            </div>

            {/* --- SHOWCASE VISUEL D'ACQUISITION INTERACTIF (Aperçu Produit 3-en-1) --- */}
            <div className="mt-14 relative rounded-3xl p-4 sm:p-6 bg-zinc-950/80 border border-zinc-800/90 shadow-2xl backdrop-blur-md">
              {/* Sélecteur d'onglets de prévisualisation */}
              <div className="flex items-center justify-center gap-2 mb-6 p-1 rounded-2xl bg-zinc-900/90 border border-zinc-800 max-w-xl mx-auto overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setActiveShowcaseTab('poster')}
                  className={`flex-1 min-w-[130px] py-2 px-3 rounded-xl font-mono text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeShowcaseTab === 'poster'
                      ? 'bg-lime-400 text-black shadow-md font-black'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>1. Affiches Promo</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveShowcaseTab('merch')}
                  className={`flex-1 min-w-[130px] py-2 px-3 rounded-xl font-mono text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeShowcaseTab === 'merch'
                      ? 'bg-orange-500 text-white shadow-md font-black'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Shirt className="w-3.5 h-3.5" />
                  <span>2. Stand Merch DTF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveShowcaseTab('smartlink')}
                  className={`flex-1 min-w-[130px] py-2 px-3 rounded-xl font-mono text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeShowcaseTab === 'smartlink'
                      ? 'bg-emerald-400 text-black shadow-md font-black'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Link2 className="w-3.5 h-3.5" />
                  <span>3. SmartLink Live</span>
                </button>
              </div>

              {/* Rendu dynamique selon l'onglet actif */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
                {/* Carte 1 : Affiche & Posts */}
                <div
                  className={`p-5 rounded-2xl border transition-all duration-300 flex flex-col justify-between cursor-pointer ${
                    activeShowcaseTab === 'poster'
                      ? 'bg-zinc-900/90 border-lime-400 shadow-[0_0_30px_rgba(163,230,53,0.15)] ring-1 ring-lime-400/50'
                      : 'bg-zinc-900/40 border-zinc-800 hover:border-zinc-700'
                  }`}
                  onClick={() => setActiveShowcaseTab('poster')}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="px-2.5 py-0.5 rounded-full bg-lime-400/10 border border-lime-400/30 text-lime-400 text-[10px] font-mono font-bold uppercase">
                        Visuels A3 &amp; Carré 1:1
                      </span>
                      <Sparkles className="w-4 h-4 text-lime-400" />
                    </div>
                    <h3 className="text-base font-bold text-white uppercase tracking-tight">
                      Affiches &amp; Promo Réseaux
                    </h3>
                    <p className="mt-2 text-xs text-zinc-300 font-mono leading-relaxed">
                      Fichiers haute résolution 300 DPI pour l'impression rue et gabarits 1:1 carrés taillés pour Instagram &amp; les stories.
                    </p>
                  </div>
                  <div className="mt-4 p-3 rounded-xl bg-black/80 border border-zinc-800 text-[11px] font-mono text-zinc-300 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-lime-400 shrink-0" />
                    <span>Typographie clubbing &amp; hiérarchie automatique</span>
                  </div>
                </div>

                {/* Carte 2 : Stand Merch Virtuel */}
                <div
                  className={`p-5 rounded-2xl border transition-all duration-300 flex flex-col justify-between cursor-pointer ${
                    activeShowcaseTab === 'merch'
                      ? 'bg-zinc-900/90 border-orange-500 shadow-[0_0_30px_rgba(249,115,22,0.15)] ring-1 ring-orange-500/50'
                      : 'bg-zinc-900/40 border-zinc-800 hover:border-zinc-700'
                  }`}
                  onClick={() => setActiveShowcaseTab('merch')}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="px-2.5 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 text-[10px] font-mono font-bold uppercase">
                        Coton Lourd 240g Streetwear
                      </span>
                      <Shirt className="w-4 h-4 text-orange-400" />
                    </div>
                    <h3 className="text-base font-bold text-white uppercase tracking-tight">
                      Stand Merch Virtuel
                    </h3>
                    <p className="mt-2 text-xs text-zinc-300 font-mono leading-relaxed">
                      T-shirts streetwear boxy fit imprimés en DTF industriel haute tenue. Pas d'invendus : chaque pièce est produite à l'achat direct.
                    </p>
                  </div>
                  <div className="mt-4 p-3 rounded-xl bg-black/80 border border-zinc-800 text-[11px] font-mono text-zinc-300 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-orange-400 shrink-0" />
                    <span>14 € de marge nette par t-shirt reversés</span>
                  </div>
                </div>

                {/* Carte 3 : SmartLink Événement */}
                <div
                  className={`p-5 rounded-2xl border transition-all duration-300 flex flex-col justify-between cursor-pointer ${
                    activeShowcaseTab === 'smartlink'
                      ? 'bg-zinc-900/90 border-emerald-400 shadow-[0_0_30px_rgba(52,211,153,0.15)] ring-1 ring-emerald-400/50'
                      : 'bg-zinc-900/40 border-zinc-800 hover:border-zinc-700'
                  }`}
                  onClick={() => setActiveShowcaseTab('smartlink')}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-400/10 border border-emerald-400/30 text-emerald-400 text-[10px] font-mono font-bold uppercase">
                        Page Tout-en-un
                      </span>
                      <Link2 className="w-4 h-4 text-emerald-400" />
                    </div>
                    <h3 className="text-base font-bold text-white uppercase tracking-tight">
                      SmartLink Événement
                    </h3>
                    <p className="mt-2 text-xs text-zinc-300 font-mono leading-relaxed">
                      Un seul lien dans votre bio Instagram : billets Shotgun/Dice, GPS Waze du club, line-up officiel et boutique de merch.
                    </p>
                  </div>
                  <div className="mt-4 p-3 rounded-xl bg-black/80 border border-zinc-800 text-[11px] font-mono text-zinc-300 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                    <span>Conversion express sans perte de trafic</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* --- SECTION 2 : LE MODÈLE MÉTIER EN 3 PILIERS (Zéro Risque / Zéro Logistique) --- */}
        <section className="py-16 sm:py-24 border-b border-zinc-800/80 bg-zinc-950/40">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-14 sm:mb-20">
              <span className="text-xs font-mono font-black text-lime-400 uppercase tracking-widest block mb-3">
                MÉCANISME OPÉRATIONNEL
              </span>
              <h2 className="text-2xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight text-white">
                Conçu pour les acteurs qui font la nuit.
              </h2>
              <p className="mt-4 text-sm sm:text-base text-zinc-400 font-mono">
                Fini l'époque où sortir du textile rimait avec trou dans la trésorerie et cartons d'invendus dans le coffre.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
              {/* Pilier 1 */}
              <div className="p-6 sm:p-8 rounded-3xl bg-zinc-900/60 border border-zinc-800/90 relative overflow-hidden flex flex-col justify-between hover:border-lime-400/50 hover:-translate-y-1 transition-all duration-300 group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-lime-400/5 rounded-bl-full pointer-events-none group-hover:bg-lime-400/10 transition-colors" />
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-zinc-800/80 border border-zinc-700 flex items-center justify-center text-lime-400 mb-6 shadow-inner">
                    <PackageCheck className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-black uppercase tracking-tight text-white">
                    0 Carton, 0 Risque Financier
                  </h3>
                  <p className="mt-4 text-sm text-zinc-300 leading-relaxed font-normal">
                    Fini les 100 t-shirts payés d'avance qui dorment dans un coffre de voiture. Chaque pièce est imprimée à la commande dès qu'un fan valide son achat sur ton lien.
                  </p>
                </div>

                <div className="mt-6 pt-6 border-t border-zinc-800/80 space-y-2 text-xs font-mono text-zinc-400">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-lime-400 shrink-0" />
                    <span>Zéro avance de trésorerie</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-lime-400 shrink-0" />
                    <span>Zéro invendu ni perte de stock</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-lime-400 shrink-0" />
                    <span>Production déclenchée à l'achat</span>
                  </div>
                </div>
              </div>

              {/* Pilier 2 */}
              <div className="p-6 sm:p-8 rounded-3xl bg-zinc-900/60 border border-zinc-800/90 relative overflow-hidden flex flex-col justify-between hover:border-orange-500/50 hover:-translate-y-1 transition-all duration-300 group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-bl-full pointer-events-none group-hover:bg-orange-500/10 transition-colors" />
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-zinc-800/80 border border-zinc-700 flex items-center justify-center text-orange-400 mb-6 shadow-inner">
                    <Shirt className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-black uppercase tracking-tight text-white">
                    Stand Merch Virtuel en Marque Blanche
                  </h3>
                  <p className="mt-4 text-sm text-zinc-300 leading-relaxed font-normal">
                    Textiles lourds, coupes streetwear, impression DTF industrielle haute tenue. On gère la production et l'expédition, tu empoches 10 à 15 € de marge nette par pièce.
                  </p>
                </div>

                <div className="mt-6 pt-6 border-t border-zinc-800/80 space-y-2 text-xs font-mono text-zinc-400">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-orange-400 shrink-0" />
                    <span>Grammage lourd 240g/m² streetwear</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-orange-400 shrink-0" />
                    <span>Impression DTF HD résistante aux lavages</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-orange-400 shrink-0" />
                    <span>Expédition express suivie à ton nom</span>
                  </div>
                </div>
              </div>

              {/* Pilier 3 */}
              <div className="p-6 sm:p-8 rounded-3xl bg-zinc-900/60 border border-zinc-800/90 relative overflow-hidden flex flex-col justify-between hover:border-emerald-400/50 hover:-translate-y-1 transition-all duration-300 group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-400/5 rounded-bl-full pointer-events-none group-hover:bg-emerald-400/10 transition-colors" />
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-zinc-800/80 border border-zinc-700 flex items-center justify-center text-emerald-400 mb-6 shadow-inner">
                    <Link2 className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-black uppercase tracking-tight text-white">
                    SmartLink Événement Tout-en-un
                  </h3>
                  <p className="mt-4 text-sm text-zinc-300 leading-relaxed font-normal">
                    Un seul lien pour ta bio Instagram et tes stories : préventes Shotgun/Dice, line-up, itinéraire GPS du club et accès immédiat au merch officiel.
                  </p>
                </div>

                <div className="mt-6 pt-6 border-t border-zinc-800/80 space-y-2 text-xs font-mono text-zinc-400">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Intégration directe Shotgun, Dice, RA</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>GPS Club (Waze &amp; Google Maps) en 1 tap</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Checkout Stripe sécurisé intégré</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* --- SECTION 3 : SIMULATEUR DE BÉNÉFICES SOIRÉE (Interactif & Transparent) --- */}
        <section id="simulateur" className="py-16 sm:py-24 border-b border-zinc-800/80 scroll-mt-20">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10 sm:mb-14">
              <span className="text-xs font-mono font-black text-lime-400 uppercase tracking-widest block mb-2">
                SIMULATEUR DE RENTABILITÉ IMMÉDIATE
              </span>
              <h2 className="text-2xl sm:text-4xl font-black uppercase tracking-tight text-white">
                Combien rapporte le merch de ta prochaine date ?
              </h2>
              <p className="mt-3 text-sm text-zinc-300 font-mono">
                Formule en direct : <span className="text-lime-400 font-bold">Marge moyenne = 14 € / pièce</span> reversée directement sur ton compte.
              </p>
            </div>

            {/* Boîte interactive du simulateur avec jauge de progression visuelle */}
            <div className="p-6 sm:p-10 rounded-3xl bg-zinc-900/90 border-2 border-zinc-800 shadow-[0_0_60px_rgba(0,0,0,0.85)] backdrop-blur-md">
              {/* Présélections rapides de jauge */}
              <div className="mb-6">
                <label className="block text-xs font-mono text-zinc-400 uppercase font-bold mb-3">
                  Sélectionne ta jauge d'événement type :
                </label>
                <div className="flex flex-wrap gap-2">
                  {presets.map((p) => (
                    <button
                      key={p.count}
                      type="button"
                      onClick={() => setSoldPieces(p.count)}
                      className={`px-3.5 py-2 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer border flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-400 ${
                        soldPieces === p.count
                          ? 'bg-lime-400 text-black border-lime-400 shadow-md font-black scale-102'
                          : 'bg-zinc-800/80 text-zinc-300 border-zinc-700 hover:border-zinc-500'
                      }`}
                    >
                      <span>{p.icon}</span>
                      <span>{p.label} ({p.count} pcs)</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Slider de volume avec barre de progression dynamique */}
              <div className="space-y-4 pt-4 border-t border-zinc-800">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-mono font-bold text-zinc-200 uppercase">
                    Volume de pièces vendues :
                  </span>
                  <span className="px-4 py-1.5 rounded-xl bg-lime-400/10 border border-lime-400/50 text-lime-400 font-mono font-black text-xl sm:text-3xl shadow-inner">
                    {soldPieces} <span className="text-xs font-normal">pièces</span>
                  </span>
                </div>

                <div className="relative py-2">
                  {/* Piste personnalisée avec dégradé vert lime */}
                  <div className="w-full h-3 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-lime-400 to-emerald-400 transition-all duration-100"
                      style={{ width: `${sliderPercent}%` }}
                    />
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="300"
                    step="5"
                    value={soldPieces}
                    onChange={(e) => setSoldPieces(Number(e.target.value))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    aria-label="Volume de t-shirts ou sweats vendus"
                    role="slider"
                    aria-valuemin={20}
                    aria-valuemax={300}
                    aria-valuenow={soldPieces}
                  />
                </div>

                <div className="flex justify-between text-[11px] font-mono text-zinc-500">
                  <span>20 pièces (Débutant)</span>
                  <span>80 pièces (Soirée club standard)</span>
                  <span>300 pièces (Festival / Gros format)</span>
                </div>
              </div>

              {/* Rendu Chiffré en Temps Réel */}
              <div className="mt-8 p-6 sm:p-8 rounded-2xl bg-black/90 border border-lime-400/50 text-center relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 w-32 h-32 bg-lime-400/10 rounded-bl-full pointer-events-none" />
                <span className="text-xs font-mono font-black text-zinc-400 uppercase tracking-widest block mb-1">
                  BÉNÉFICE NET ESTIMÉ POUR TA DATE
                </span>
                <div className="text-4xl sm:text-6xl md:text-7xl font-black font-mono text-lime-400 tracking-tight my-2">
                  {totalNetProfit.toLocaleString('fr-FR')} €
                </div>
                <p className="text-sm font-mono text-zinc-300 max-w-lg mx-auto">
                  <strong className="text-lime-400">{totalNetProfit.toLocaleString('fr-FR')} €</strong> de cachet net supplémentaire pour ton collectif, 100 % passif.
                </p>

                {/* Détails financiers transparents */}
                <div className="mt-6 pt-6 border-t border-zinc-800/90 grid grid-cols-1 sm:grid-cols-3 gap-3 text-left font-mono text-xs">
                  <div className="p-3.5 rounded-xl bg-zinc-900/70 border border-zinc-800">
                    <span className="text-zinc-500 block text-[10px] uppercase">Chiffre d'Affaires Brut</span>
                    <span className="text-white font-bold text-base sm:text-lg">~{estimatedRevenue.toLocaleString('fr-FR')} €</span>
                    <span className="text-[10px] text-zinc-400 block mt-0.5">Payé par les participants</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-zinc-900/70 border border-zinc-800">
                    <span className="text-zinc-500 block text-[10px] uppercase">Coût Impression &amp; Envoi</span>
                    <span className="text-zinc-300 font-bold text-base sm:text-lg">0 € d'avance</span>
                    <span className="text-[10px] text-zinc-400 block mt-0.5">Déduit automatiquement</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-lime-400/10 border border-lime-400/40">
                    <span className="text-lime-400/90 block text-[10px] uppercase font-bold">Encaissement Net</span>
                    <span className="text-lime-400 font-black text-base sm:text-lg">{totalNetProfit.toLocaleString('fr-FR')} €</span>
                    <span className="text-[10px] text-lime-300/80 block mt-0.5">Direct dans votre poche</span>
                  </div>
                </div>
              </div>

              {/* Bouton d'action sous le simulateur */}
              <div className="mt-8 text-center">
                <button
                  type="button"
                  onClick={handleActionClick}
                  className="w-full sm:w-auto px-8 py-4 rounded-xl bg-lime-400 hover:bg-lime-300 text-black font-mono font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-lime-400/25 active:scale-95 transition-all cursor-pointer mx-auto focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-lime-400/50"
                >
                  <span>ENCAISSER CES BÉNÉFICES SUR MA PROCHAINE DATE</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* --- SECTION FAQ : LEVÉE D'OBJECTIONS ORGANISATEURS (UI/UX Accordion) --- */}
        <section id="faq" className="py-16 sm:py-24 border-b border-zinc-800/80 bg-zinc-950/40 scroll-mt-20">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <span className="text-xs font-mono font-black text-lime-400 uppercase tracking-widest block mb-2">
                QUESTIONS FRÉQUENTES
              </span>
              <h2 className="text-2xl sm:text-4xl font-black uppercase tracking-tight text-white">
                Tout ce que les collectifs et artistes veulent savoir.
              </h2>
            </div>

            <div className="space-y-3">
              {faqs.map((faq, idx) => {
                const isOpen = expandedFaq === idx;
                return (
                  <div
                    key={idx}
                    className="rounded-2xl border border-zinc-800 bg-zinc-900/60 overflow-hidden transition-all duration-200"
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedFaq(isOpen ? null : idx)}
                      className="w-full p-5 text-left flex items-center justify-between gap-4 font-mono text-sm font-bold text-white hover:text-lime-400 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-400"
                      aria-expanded={isOpen}
                    >
                      <span>{faq.q}</span>
                      {isOpen ? (
                        <ChevronUp className="w-5 h-5 text-lime-400 shrink-0" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-zinc-500 shrink-0" />
                      )}
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-5 pt-1 text-xs sm:text-sm font-sans text-zinc-300 leading-relaxed border-t border-zinc-800/60">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* --- SECTION 4 : CTA FINAL DE CONVERSION --- */}
        <section className="py-20 sm:py-28 text-center">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="p-8 sm:p-14 rounded-3xl bg-gradient-to-b from-zinc-900/90 to-black border-2 border-lime-400/60 shadow-[0_0_80px_rgba(163,230,53,0.18)] relative overflow-hidden">
              <div className="absolute top-0 right-1/2 translate-x-1/2 w-64 h-32 bg-lime-400/10 blur-2xl rounded-full pointer-events-none" />

              <span className="inline-block px-3 py-1 rounded-full bg-lime-400/10 border border-lime-400/30 text-lime-400 font-mono text-xs font-bold uppercase tracking-widest mb-4">
                DÉMARRAGE IMMÉDIAT EN 60 SECONDES
              </span>

              <h2 className="text-2xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight text-white max-w-2xl mx-auto leading-tight">
                Prépare ton visuel, uploade ton logo et active ton stand de merch dès maintenant.
              </h2>

              <p className="mt-4 text-sm sm:text-base text-zinc-300 font-mono max-w-xl mx-auto">
                Rejoins les collectifs et artistes qui rentabilisent chaque date sans risquer leur trésorerie personnelle.
              </p>

              <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={handleActionClick}
                  className="w-full sm:w-auto px-8 sm:px-12 py-4 sm:py-5 rounded-2xl bg-lime-400 hover:bg-lime-300 text-black font-mono font-black text-sm sm:text-base uppercase tracking-wider flex items-center justify-center gap-3 shadow-[0_0_35px_rgba(163,230,53,0.35)] active:scale-95 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-lime-400/50"
                >
                  <span>LANCER MON ÉVÉNEMENT IMMÉDIATEMENT</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs font-mono text-zinc-400">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-lime-400" />
                  <span>Sans carte bancaire requise</span>
                </span>
                <span className="text-zinc-600">•</span>
                <span className="flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-lime-400" />
                  <span>Prêt en 60 secondes</span>
                </span>
                <span className="text-zinc-600">•</span>
                <span className="flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-lime-400" />
                  <span>Expédition France &amp; Europe</span>
                </span>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* --- FOOTER ÉVÉNEMENTIEL --- */}
      <footer className="relative z-10 py-10 border-t border-zinc-900 bg-[#050608] text-xs font-mono text-zinc-400">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white tracking-wider">DROPPER</span>
            <span>•</span>
            <span>La plateforme merch &amp; promo des collectifs et DJs</span>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="/studio?intent=headliner_drop"
              onClick={(e) => {
                e.preventDefault();
                handleActionClick('headliner_drop');
              }}
              className="text-zinc-400 hover:text-lime-400 transition cursor-pointer"
            >
              Accéder au Studio
            </a>
            <span>•</span>
            <span className="text-zinc-400">0 € d'avance de stock • 100% Marque Blanche</span>
          </div>
        </div>
      </footer>

      {/* --- BARRE FLOTTANTE STICKY MOBILE (Conversion & Accès Rapide) --- */}
      {showStickyBar && (
        <div className="fixed bottom-0 inset-x-0 z-40 sm:hidden p-3 bg-zinc-950/95 border-t border-zinc-800 backdrop-blur-md shadow-2xl animate-fadeIn">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <span className="text-[10px] font-mono text-zinc-400 uppercase block">Gain estimé</span>
              <span className="text-base font-black font-mono text-lime-400 truncate block">
                {totalNetProfit.toLocaleString('fr-FR')} € <span className="text-[10px] font-normal text-zinc-400">({soldPieces} pcs)</span>
              </span>
            </div>
            <button
              type="button"
              onClick={handleActionClick}
              className="py-2.5 px-4 rounded-xl bg-lime-400 hover:bg-lime-300 text-black font-mono font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-lime-400/25 active:scale-95 transition-all cursor-pointer shrink-0 min-h-[44px]"
            >
              <span>Créer mon Pack</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DropperLanding;
