import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { 
    flyerService, 
    FlyerConfig, 
    DEFAULT_IN_THE_DARK_FLYER_CONFIG, 
    DEFAULT_BAR80_FLYER_CONFIG,
    DEFAULT_13ANSVR_FLYER_CONFIG,
    DEFAULT_COURRIERE_FLYER_CONFIG,
    DEFAULT_ELECTRONICWOOD_FLYER_CONFIG
} from '../services/flyerService';

interface FlyerPageProps {
    overrideSlug?: string;
}

const FlyerPage: React.FC<FlyerPageProps> = ({ overrideSlug }) => {
    const location = useLocation();
    const params = useParams<{ flyerSlug?: string; slug?: string }>();
    const searchParams = new URLSearchParams(location.search);

    const slugParam = overrideSlug || params.flyerSlug || params.slug || searchParams.get('flyer') || location.pathname;
    const cleanSlug = slugParam.toLowerCase();
    const isElectronicWood = cleanSlug.includes('electronic') || cleanSlug.includes('wood') || cleanSlug.includes('electronicwood');
    const isCourriere = cleanSlug.includes('courriere');
    const is13Ans = cleanSlug.includes('13ans') || cleanSlug.includes('13ansvr');
    const isRave = cleanSlug.includes('rave');

    const defaultPreset = isElectronicWood
        ? DEFAULT_ELECTRONICWOOD_FLYER_CONFIG
        : isCourriere
        ? DEFAULT_COURRIERE_FLYER_CONFIG
        : is13Ans 
        ? DEFAULT_13ANSVR_FLYER_CONFIG 
        : isRave 
        ? DEFAULT_BAR80_FLYER_CONFIG 
        : DEFAULT_IN_THE_DARK_FLYER_CONFIG;

    const [config, setConfig] = useState<FlyerConfig>(defaultPreset);
    const [activePage, setActivePage] = useState<'recto' | 'verso'>('recto');
    const [isSwitching, setIsSwitching] = useState(false);
    const [copied, setCopied] = useState(false);

    const touchStartX = useRef(0);
    const touchEndX = useRef(0);
    const MIN_SWIPE_DISTANCE = 40;

    // Intro animation state
    const [introAnimComplete, setIntroAnimComplete] = useState(false);

    const hasVerso = Boolean(config.pages?.verso?.image);

    useEffect(() => {
        const loadConfig = async () => {
            try {
                const targetSlug = isElectronicWood
                    ? 'electronicwood'
                    : isCourriere 
                    ? 'courriere11-14' 
                    : is13Ans 
                    ? '13ansvr' 
                    : isRave 
                    ? 'raveoldschool' 
                    : 'inthedark';
                const data = await flyerService.getFlyerConfig(targetSlug);
                if (data && data.pages && (data.pages.recto || data.pages.verso)) {
                    setConfig(data);
                } else {
                    setConfig(defaultPreset);
                }
            } catch (err) {
                console.warn("Using default flyer preset:", err);
                setConfig(defaultPreset);
            } finally {
                setTimeout(() => setIntroAnimComplete(true), 800);
            }
        };
        loadConfig();
    }, [isElectronicWood, isCourriere, is13Ans, isRave]);

    const flipFlyer = () => {
        if (!hasVerso || isSwitching) return;
        setIsSwitching(true);
        setTimeout(() => {
            setActivePage(prev => (prev === 'recto' ? 'verso' : 'recto'));
            setTimeout(() => setIsSwitching(false), 50);
        }, 250);
    };

    const handleGesture = () => {
        if (!hasVerso) return;
        const distance = touchEndX.current - touchStartX.current;
        if (Math.abs(distance) > MIN_SWIPE_DISTANCE) {
            flipFlyer();
        }
    };

    const shareUrl = isElectronicWood
        ? "https://signaid.eu/electronicwood"
        : isCourriere
        ? "https://signaid.eu/courriere11-14"
        : is13Ans 
        ? "https://signaid.eu/13ansvr" 
        : isRave 
        ? "https://signaid.eu/raveoldschool" 
        : "https://signaid.eu/inthedark";

    const shareTitle = config.title || (isElectronicWood
        ? "Electronic Wood — We Love Retro House (14 Hours Rave)"
        : isCourriere
        ? "Kermesse de Courrière — 11 au 14 Septembre"
        : is13Ans 
        ? "13 Ans de Vision Room — SPARKOH! Salle des Trémies" 
        : isRave 
        ? "Rave Old School — Bar 80 Liège" 
        : "In The Dark — Flyer Interactif");

    const shareText = config.description || (isElectronicWood
        ? "Découvrez le flyer interactif de l'événement Electronic Wood (We Love Retro House) au Bodies in Space (26 Septembre 2026) avec Mentalist, Youri Parker, Marko De La Rocca..."
        : isCourriere
        ? "Découvrez le programme et flyer interactif de la Kermesse de Courrière sous chapiteau (11, 12, 13 et 14 Septembre)."
        : is13Ans
        ? "Découvrez le flyer interactif des 13 Ans de Vision Room au SPARKOH! Salle des Trémies le 7 Novembre (22:00 - 06:00)."
        : isRave 
        ? "Découvrez le flyer interactif de l'événement Rave Old School au Bar 80 Liège (7 Août) avec MIKE B et L'Après-Midize." 
        : "Découvrez le flyer interactif de l'événement In The Dark (L'Aquarelle Liège) : programmation, artistes, itinéraire GPS et réservation.");

    const handleShare = async () => {
        const shareData = {
            title: shareTitle,
            text: shareText,
            url: shareUrl
        };

        if (navigator.share) {
            try {
                await navigator.share(shareData);
                return;
            } catch (e) {
                // User cancelled share
            }
        }

        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        } catch (e) {
            console.warn("Clipboard copy failed", e);
        }
    };

    const pageData = config.pages?.[activePage] || defaultPreset.pages[activePage] || defaultPreset.pages.recto;
    
    // Resolve image path safely
    let imagePath = isElectronicWood
        ? '/assets/flyers/electronicwood.jpg'
        : isCourriere 
        ? '/assets/flyers/courriere.jpg'
        : is13Ans 
        ? '/assets/flyers/13ansvr.jpg' 
        : isRave 
        ? '/assets/flyers/bar80.jpg' 
        : '/assets/flyers/recto.png';

    if (pageData?.image) {
        if (pageData.image.startsWith('http') || pageData.image.startsWith('data:')) {
            imagePath = pageData.image;
        } else {
            let clean = pageData.image.trim();
            if (clean === 'flyers recto.png') clean = 'recto.png';
            if (clean === 'flyers verso.png') clean = 'verso.png';
            imagePath = `/assets/flyers/${clean}`;
        }
    }

    const hotspots = pageData?.hotspots || [];
    const isLandscape = config.aspectRatio === 'landscape' || (imagePath && (imagePath.includes('13ans') || imagePath.includes('bar80') || imagePath.includes('rave')));

    const accentBgGlow = isElectronicWood ? (
        <>
            <div className="absolute top-[-15%] left-[-10%] w-[500px] h-[500px] rounded-full bg-lime-500/20 blur-[130px]"></div>
            <div className="absolute bottom-[-15%] right-[-10%] w-[600px] h-[600px] rounded-full bg-emerald-600/20 blur-[150px]"></div>
        </>
    ) : isCourriere ? (
        <>
            <div className="absolute top-[-15%] left-[-10%] w-[500px] h-[500px] rounded-full bg-amber-600/20 blur-[130px]"></div>
            <div className="absolute bottom-[-15%] right-[-10%] w-[600px] h-[600px] rounded-full bg-orange-600/20 blur-[150px]"></div>
        </>
    ) : is13Ans ? (
        <>
            <div className="absolute top-[-15%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-600/20 blur-[130px]"></div>
            <div className="absolute bottom-[-15%] right-[-10%] w-[600px] h-[600px] rounded-full bg-cyan-600/15 blur-[150px]"></div>
        </>
    ) : isRave ? (
        <>
            <div className="absolute top-[-15%] left-[-10%] w-[500px] h-[500px] rounded-full bg-red-600/20 blur-[130px]"></div>
            <div className="absolute bottom-[-15%] right-[-10%] w-[600px] h-[600px] rounded-full bg-amber-600/15 blur-[150px]"></div>
        </>
    ) : (
        <>
            <div className="absolute top-[-15%] left-[-10%] w-[500px] h-[500px] rounded-full bg-pink-600/15 blur-[120px]"></div>
            <div className="absolute bottom-[-15%] right-[-10%] w-[600px] h-[600px] rounded-full bg-orange-600/15 blur-[140px]"></div>
        </>
    );

    const themeColorText = isElectronicWood ? 'text-lime-400' : isCourriere ? 'text-amber-400' : is13Ans ? 'text-blue-400' : isRave ? 'text-red-400' : 'text-pink-400';
    const themePingColor = isElectronicWood ? 'bg-lime-500' : isCourriere ? 'bg-amber-500' : is13Ans ? 'bg-blue-500' : isRave ? 'bg-red-500' : 'bg-orange-500';

    return (
        <div className="min-h-screen bg-[#050905] bg-gradient-to-br from-[#050905] via-[#09120a] to-[#050905] text-white flex flex-col items-center justify-start p-4 py-8 sm:py-12 relative overflow-x-hidden select-none font-sans">
            {/* Ambient glassmorphism glows */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                {accentBgGlow}
            </div>

            {/* Top Bar / Header */}
            <header className={`w-full ${isLandscape ? 'max-w-[760px]' : 'max-w-[450px]'} flex items-center justify-between mb-6 relative z-20`}>
                <a 
                    href="https://signaid.eu" 
                    className={`flex items-center gap-2 text-xs font-bold tracking-wider text-gray-300 ${isElectronicWood ? 'hover:text-lime-400' : 'hover:text-amber-400'} transition-colors uppercase`}
                >
                    <span className={`w-2 h-2 rounded-full ${themePingColor} animate-ping inline-block`}></span>
                    SIGNAID.EU
                </a>

                <button
                    onClick={handleShare}
                    className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-semibold backdrop-blur-md transition-all active:scale-95 text-gray-200"
                    title={`Partager ${shareUrl}`}
                >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                    {copied ? "Lien copié !" : "Partager"}
                </button>
            </header>

            {/* Recto / Verso Selector Pill (Only displayed if flyer has multiple pages) */}
            {hasVerso && (
                <div className="flex items-center justify-center mb-6 relative z-20">
                    <div className="bg-black/60 backdrop-blur-xl border border-white/15 p-1 rounded-full flex gap-1 shadow-2xl">
                        <button
                            onClick={() => { if (activePage !== 'recto') flipFlyer(); }}
                            className={`px-5 py-2 rounded-full text-xs font-extrabold uppercase tracking-wider transition-all flex items-center gap-2 ${
                                activePage === 'recto'
                                    ? 'bg-gradient-to-r from-lime-500 to-emerald-500 text-black shadow-lg shadow-lime-500/25'
                                    : 'text-gray-400 hover:text-white'
                            }`}
                        >
                            <span>Recto</span>
                            {activePage === 'recto' && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>}
                        </button>
                        <button
                            onClick={() => { if (activePage !== 'verso') flipFlyer(); }}
                            className={`px-5 py-2 rounded-full text-xs font-extrabold uppercase tracking-wider transition-all flex items-center gap-2 ${
                                activePage === 'verso'
                                    ? 'bg-gradient-to-r from-emerald-500 to-lime-500 text-black shadow-lg shadow-emerald-500/25'
                                    : 'text-gray-400 hover:text-white'
                            }`}
                        >
                            <span>Verso</span>
                            {activePage === 'verso' && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>}
                        </button>
                    </div>
                </div>
            )}

            {/* Navigation Arrows for multi-page flyers */}
            {hasVerso && (
                <>
                    <button
                        onClick={flipFlyer}
                        className="hidden sm:flex fixed left-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/50 backdrop-blur-md border border-white/20 text-white items-center justify-center transition-all hover:bg-lime-500 hover:text-black hover:scale-110 active:scale-95 shadow-xl z-30"
                        aria-label="Changer de face"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <button
                        onClick={flipFlyer}
                        className="hidden sm:flex fixed right-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/50 backdrop-blur-md border border-white/20 text-white items-center justify-center transition-all hover:bg-lime-500 hover:text-black hover:scale-110 active:scale-95 shadow-xl z-30"
                        aria-label="Changer de face"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </>
            )}

            {/* Flyer Viewer Container */}
            <div
                className={`relative w-full ${isLandscape ? 'max-w-[760px] aspect-[1024/574]' : isElectronicWood ? 'max-w-[440px] aspect-[540/960]' : 'max-w-[440px] aspect-[600/751]'} shadow-[0_30px_90px_-15px_rgba(0,0,0,0.9)] rounded-2xl overflow-hidden flex items-center justify-center transition-transform duration-500 ease-out border border-white/15 ${
                    hasVerso ? 'cursor-pointer' : ''
                } ${!introAnimComplete ? 'animate-[flyerTease_1.5s_ease-in-out]' : ''}`}
                style={{
                    transform: isSwitching ? 'rotateY(90deg)' : 'rotateY(0deg)',
                    transformStyle: 'preserve-3d'
                }}
                onTouchStart={(e) => { touchStartX.current = e.changedTouches[0].screenX; }}
                onTouchEnd={(e) => {
                    touchEndX.current = e.changedTouches[0].screenX;
                    handleGesture();
                }}
                onMouseDown={(e) => {
                    // @ts-ignore
                    if (e.target?.closest?.('.hotspot-link')) return;
                    touchStartX.current = e.screenX;
                }}
                onMouseUp={(e) => {
                    touchEndX.current = e.screenX;
                    handleGesture();
                }}
            >
                {/* Background Image */}
                <img
                    src={imagePath}
                    alt={shareTitle}
                    className="w-full h-full object-contain pointer-events-none"
                    draggable={false}
                />

                {/* Hotspots */}
                {hotspots.map((hs) => {
                    const isCalendar = hs.url.includes('google.com/calendar') || hs.url.includes('calendar.google.com') || hs.url.includes('calndr.link');
                    const isLocation = hs.url.includes('maps.google') || hs.url.includes('google.com/maps') || hs.url.includes('maps.app.goo.gl') || hs.url.includes('waze.com') || hs.url.includes('apple.com/maps');
                    const isInstagram = hs.url.includes('instagram.com');
                    const isFacebook = hs.url.includes('facebook.com') || hs.url.includes('fb.com');
                    const isStore = hs.url.includes('clubvisionroom') || hs.url.includes('mentalist') || hs.url.includes('signaid.eu/');

                    const glowColor = isElectronicWood
                        ? 'border-lime-400 shadow-[0_0_15px_rgba(163,230,53,0.85),inset_0_0_15px_rgba(163,230,53,0.4)]'
                        : isCourriere
                        ? 'border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.85),inset_0_0_15px_rgba(251,191,36,0.4)]'
                        : is13Ans
                        ? 'border-blue-400 shadow-[0_0_15px_rgba(96,165,250,0.85),inset_0_0_15px_rgba(96,165,250,0.4)]'
                        : isRave 
                        ? 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.85),inset_0_0_15px_rgba(239,68,68,0.4)]'
                        : 'border-pink-500/90 shadow-[0_0_15px_rgba(236,72,153,0.8),inset_0_0_15px_rgba(236,72,153,0.4)]';

                    const overlayHover = isElectronicWood
                        ? 'bg-lime-500/15 group-hover:bg-lime-500/30'
                        : isCourriere
                        ? 'bg-amber-500/15 group-hover:bg-amber-500/30'
                        : is13Ans 
                        ? 'bg-blue-500/15 group-hover:bg-blue-500/30' 
                        : isRave 
                        ? 'bg-red-500/15 group-hover:bg-red-500/30' 
                        : 'bg-pink-500/10 group-hover:bg-pink-500/25';

                    return (
                        <a
                            key={hs.id}
                            href={hs.url}
                            target={hs.url.startsWith('/') || hs.url.includes('signaid.eu') ? '_self' : '_blank'}
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="hotspot-link absolute group flex items-center justify-center transition-all z-10 rounded-lg"
                            style={{
                                left: `${hs.x}%`,
                                top: `${hs.y}%`,
                                width: `${hs.w}%`,
                                height: `${hs.h}%`
                            }}
                            title={hs.label || "Ouvrir le lien"}
                        >
                            {/* Animated Pulsing Glow Outline */}
                            <div className={`absolute inset-0 rounded-lg border-2 ${glowColor} animate-[pulse_1.8s_ease-in-out_infinite] group-hover:scale-[1.02] transition-all pointer-events-none`}></div>

                            {/* Hover overlay */}
                            <div className={`absolute inset-0 rounded-lg ${overlayHover} transition-colors`}></div>

                            {/* Subtle badges on hover */}
                            {isStore && (
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute top-1 right-1 bg-lime-600 p-1 rounded-full text-black shadow-md font-bold">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                                    </svg>
                                </div>
                            )}
                            {isFacebook && (
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute top-1 right-1 bg-[#1877F2] p-1 rounded-full text-white shadow-md">
                                    <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
                                        <path d="M9 8H6v4h3v12h5V12h3.642L18 8h-4V6.333C14 5.374 14.5 5 15.5 5H18V0h-3.808C10.595 0 9 1.583 9 4.615V8z" />
                                    </svg>
                                </div>
                            )}
                            {isInstagram && (
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute top-1 right-1 bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] p-1 rounded-full text-white shadow-md">
                                    <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
                                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                                    </svg>
                                </div>
                            )}
                        </a>
                    );
                })}
            </div>

            {/* Quick action button under flyer (only if multiple pages exist) */}
            {hasVerso && (
                <div className="mt-4 flex items-center justify-center relative z-20">
                    <button
                        onClick={flipFlyer}
                        className="flex items-center gap-2 text-xs font-semibold text-gray-300 hover:text-white bg-white/10 hover:bg-white/15 px-4 py-2 rounded-full border border-white/10 backdrop-blur-md transition-all active:scale-95"
                    >
                        <svg className={`w-4 h-4 ${isElectronicWood ? 'text-lime-400' : 'text-amber-400'} animate-spin`} style={{ animationDuration: '8s' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <span>Tourner pour voir le {activePage === 'recto' ? 'Verso' : 'Recto'}</span>
                    </button>
                </div>
            )}

            {/* Interactive Link List Section */}
            <section className={`mt-8 w-full ${isLandscape ? 'max-w-[760px]' : 'max-w-[450px]'} relative z-20`}>
                <div className="flex items-center justify-between mb-3 px-1">
                    <h2 className="text-[11px] uppercase font-black text-gray-400 tracking-[0.2em]">
                        {hasVerso ? `Liens interactifs (${activePage.toUpperCase()})` : "Programme & Liens interactifs"}
                    </h2>
                    <span className={`text-[10px] ${themeColorText} font-bold`}>
                        {hotspots.length} lien{hotspots.length > 1 ? 's' : ''}
                    </span>
                </div>

                <div className="grid grid-cols-1 gap-2.5">
                    {hotspots.length === 0 ? (
                        <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center text-gray-400 text-xs italic">
                            Aucun lien sur cette face
                        </div>
                    ) : (
                        hotspots.map((hs) => {
                            const isCalendar = hs.url.includes('google.com/calendar') || hs.url.includes('calendar.google.com') || hs.url.includes('calndr.link');
                            const isLocation = hs.url.includes('maps.google') || hs.url.includes('google.com/maps') || hs.url.includes('maps.app.goo.gl') || hs.url.includes('waze.com') || hs.url.includes('apple.com/maps');
                            const isInstagram = hs.url.includes('instagram.com');
                            const isFacebook = hs.url.includes('facebook.com') || hs.url.includes('fb.com');
                            const isStore = hs.url.includes('clubvisionroom') || hs.url.includes('mentalist') || hs.url.includes('signaid.eu/');

                            let displayLabel = hs.label || hs.url;

                            const bgGradient = isStore
                                ? (isElectronicWood ? 'bg-gradient-to-tr from-lime-500 to-emerald-600 shadow-[0_0_12px_rgba(132,204,22,0.5)] text-black' : 'bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-[0_0_12px_rgba(59,130,246,0.5)]')
                                : isFacebook
                                ? 'bg-[#1877F2] shadow-[0_0_12px_rgba(24,119,242,0.5)]'
                                : isCalendar
                                ? (isElectronicWood ? 'bg-gradient-to-r from-lime-500 to-emerald-500 shadow-[0_0_12px_rgba(132,204,22,0.4)] text-black' : isCourriere ? 'bg-gradient-to-r from-amber-500 to-orange-500 shadow-[0_0_12px_rgba(245,158,11,0.4)]' : 'bg-blue-600 shadow-[0_0_12px_rgba(37,99,235,0.4)]')
                                : isLocation
                                ? 'bg-emerald-600 shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                                : isInstagram
                                ? 'bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] shadow-[0_0_12px_rgba(220,39,67,0.4)]'
                                : 'bg-emerald-600 shadow-[0_0_12px_rgba(16,185,129,0.4)]';

                            const borderHover = isElectronicWood
                                ? 'hover:border-lime-500/40 hover:shadow-[0_0_20px_rgba(163,230,53,0.2)]'
                                : isCourriere
                                ? 'hover:border-amber-500/40 hover:shadow-[0_0_20px_rgba(245,158,11,0.2)]'
                                : is13Ans
                                ? 'hover:border-blue-500/40 hover:shadow-[0_0_20px_rgba(59,130,246,0.2)]'
                                : isRave 
                                ? 'hover:border-red-500/40 hover:shadow-[0_0_20px_rgba(239,68,68,0.15)]' 
                                : 'hover:border-pink-500/40 hover:shadow-[0_0_20px_rgba(236,72,153,0.15)]';

                            return (
                                <a
                                    key={hs.id}
                                    href={hs.url}
                                    target={hs.url.startsWith('/') || hs.url.includes('signaid.eu') ? '_self' : '_blank'}
                                    rel="noopener noreferrer"
                                    className={`flex items-center gap-3.5 p-3.5 bg-white/5 hover:bg-white/10 border border-white/10 ${borderHover} rounded-xl transition-all group backdrop-blur-md active:scale-[0.99]`}
                                >
                                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-white ${bgGradient} group-hover:scale-105 transition-transform shrink-0`}>
                                        {isStore ? (
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                                            </svg>
                                        ) : isFacebook ? (
                                            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                                                <path d="M9 8H6v4h3v12h5V12h3.642L18 8h-4V6.333C14 5.374 14.5 5 15.5 5H18V0h-3.808C10.595 0 9 1.583 9 4.615V8z" />
                                            </svg>
                                        ) : isCalendar ? (
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                        ) : isLocation ? (
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                        ) : isInstagram ? (
                                            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                                                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                                            </svg>
                                        ) : (
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                                            </svg>
                                        )}
                                    </div>
                                    <span className="text-xs font-bold text-gray-100 truncate flex-1 tracking-wide">
                                        {displayLabel}
                                    </span>
                                    <svg className={`w-3.5 h-3.5 text-gray-500 ${isElectronicWood ? 'group-hover:text-lime-400' : isCourriere ? 'group-hover:text-amber-400' : is13Ans ? 'group-hover:text-blue-400' : isRave ? 'group-hover:text-red-400' : 'group-hover:text-pink-400'} transition-colors shrink-0`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                    </svg>
                                </a>
                            );
                        })
                    )}
                </div>
            </section>

            {/* Footer */}
            <footer className="mt-12 text-gray-400 text-[11px] flex flex-col items-center gap-3 font-semibold relative z-20">
                <div className="flex items-center gap-3">
                    <span className="text-gray-500">Lien direct :</span>
                    <a 
                        href={shareUrl} 
                        className={`${themeColorText} hover:opacity-80 transition-opacity underline font-mono text-xs`}
                    >
                        {shareUrl.replace('https://', '')}
                    </a>
                </div>
                <div className="text-gray-500 text-[10px] uppercase tracking-widest">
                    Propulsé par <a href="https://signaid.eu" className="text-gray-300 hover:text-white font-bold">Signaid</a>
                </div>
            </footer>

            <style>{`
                @keyframes flyerTease {
                    0% { transform: rotateY(0deg); }
                    30% { transform: rotateY(15deg) scale(1.02); }
                    70% { transform: rotateY(-5deg) scale(1.01); }
                    100% { transform: rotateY(0deg) scale(1); }
                }
            `}</style>
        </div>
    );
};

export default FlyerPage;
