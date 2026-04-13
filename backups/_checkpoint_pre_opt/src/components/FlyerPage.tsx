import React, { useState, useEffect, useRef } from 'react';
import { flyerService, FlyerConfig } from '../services/flyerService';

const FlyerPage: React.FC = () => {
    const [config, setConfig] = useState<FlyerConfig | null>(null);
    const [activePage, setActivePage] = useState<'recto' | 'verso'>('verso');
    const [isSwitching, setIsSwitching] = useState(false);
    const [loading, setLoading] = useState(true);

    const touchStartX = useRef(0);
    const touchEndX = useRef(0);
    const MIN_SWIPE_DISTANCE = 50;

    // Intro animation state
    const [introAnimComplete, setIntroAnimComplete] = useState(false);

    useEffect(() => {
        const loadConfig = async () => {
            try {
                const data = await flyerService.getFlyerConfig();
                if (data) setConfig(data);
            } catch (err) {
                console.error("Failed to load flyer:", err);
            } finally {
                setLoading(false);
                // Trigger intro tease animation after a slight delay
                setTimeout(() => setIntroAnimComplete(true), 1200);
            }
        };
        loadConfig();
    }, []);

    const flipFlyer = () => {
        if (isSwitching) return;
        setIsSwitching(true);
        setTimeout(() => {
            setActivePage(prev => prev === 'recto' ? 'verso' : 'recto');
            setTimeout(() => setIsSwitching(false), 50);
        }, 300);
    };

    const handleGesture = () => {
        const distance = touchEndX.current - touchStartX.current;
        if (Math.abs(distance) > MIN_SWIPE_DISTANCE) {
            flipFlyer();
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-white flex items-center justify-center text-gray-800 flex-col gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
            <p className="animate-pulse font-medium">Chargement du flyer...</p>
        </div>
    );

    if (!config) {
        console.log("[FlyerPage] No config found, using default fallback for debug");
        const fallbackConfig: FlyerConfig = {
            theme: {},
            globalLink: "https://www.signaid.eu",
            pages: {
                recto: { image: 'recto.png', hotspots: [] },
                verso: { image: 'verso.png', hotspots: [] }
            }
        };
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-800 flex-col gap-4 p-8 text-center">
                <div className="bg-white border border-gray-200 p-8 rounded-2xl shadow-xl max-w-md">
                    <i className="fa-solid fa-circle-exclamation text-4xl text-orange-500 mb-4"></i>
                    <h2 className="text-xl font-bold mb-2">Flyer non configuré</h2>
                    <p className="text-sm text-gray-500 mb-6">Le flyer n'a pas encore été publié depuis l'interface administrateur.</p>
                    <button
                        onClick={() => setConfig(fallbackConfig)}
                        className="w-full px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold transition-all shadow-lg shadow-orange-500/30"
                    >
                        Afficher l'aperçu par défaut
                    </button>
                </div>
            </div>
        );
    }

    if (!config.pages || !config.pages[activePage]) {
        console.log("[FlyerPage] Missing pages data in config:", config);
        return <div className="text-white p-8">Données de pages manquantes dans la configuration.</div>;
    }

    const pageData = config.pages[activePage];
    const imagePath = pageData.image?.startsWith('http') || pageData.image?.startsWith('data:') ? pageData.image : `/assets/flyers/${pageData.image || activePage + '.png'}`;
    console.log("[FlyerPage] Rendering page:", activePage, "with data:", pageData);

    return (
        <div className="min-h-screen bg-[#07050f] bg-gradient-to-br from-[#07050f] via-[#1a0f2e] to-[#07050f] flex flex-col items-center justify-center p-4 py-12 relative overflow-hidden select-none font-sans">
            {/* Background elements for premium glassmorphism feel */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-orange-600/10 blur-[100px]"></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-blue-600/10 blur-[120px]"></div>
            </div>
            {/* Logo removed as requested */}

            {/* Navigation Arrows */}
            <button
                onClick={flipFlyer}
                className="fixed left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/60 backdrop-blur-md border border-gray-200 text-gray-800 flex items-center justify-center transition-all hover:bg-orange-500 hover:text-white hover:border-orange-500 active:scale-90 shadow-lg z-30 sm:left-8"
                aria-label="Previous Page"
            >
                <i className="fa-solid fa-chevron-left"></i>
            </button>
            <button
                onClick={flipFlyer}
                className="fixed right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/60 backdrop-blur-md border border-gray-200 text-gray-800 flex items-center justify-center transition-all hover:bg-orange-500 hover:text-white hover:border-orange-500 active:scale-90 shadow-lg z-30 sm:right-8"
                aria-label="Next Page"
            >
                <i className="fa-solid fa-chevron-right"></i>
            </button>

            {/* Flyer Viewer Container */}
            <div
                className={`relative w-full max-w-[450px] aspect-[1/1.414] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.8)] rounded-2xl overflow-hidden flex items-center justify-center transition-transform duration-500 ease-out border border-white/10 ${!introAnimComplete ? 'animate-[flyerTease_1.5s_ease-in-out]' : ''}`}
                style={{
                    transform: isSwitching ? 'rotateY(90deg)' : 'rotateY(0deg)',
                    transformStyle: 'preserve-3d'
                }}
                onTouchStart={(e) => touchStartX.current = e.changedTouches[0].screenX}
                onTouchEnd={(e) => {
                    touchEndX.current = e.changedTouches[0].screenX;
                    handleGesture();
                }}
                onMouseDown={(e) => {
                    // @ts-ignore
                    if (e.target.closest('.hotspot-link')) return;
                    touchStartX.current = e.screenX;
                }}
                onMouseUp={(e) => {
                    touchEndX.current = e.screenX;
                    handleGesture();
                }}
            >
                {/* Global Background Link removed as requested */}

                {/* Background Image */}
                <img
                    src={imagePath}
                    alt="Flyer"
                    className="w-full h-full object-contain pointer-events-none"
                    draggable={false}
                />

                {/* Hotspots */}
                {pageData.hotspots.map(hs => {
                    const isCalendar = hs.url.includes('google.com/calendar') || hs.url.includes('calendar.google.com') || hs.url.includes('calndr.link');

                    return (
                        <a
                            key={hs.id}
                            href={hs.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hotspot-link absolute group flex items-center justify-center transition-all z-10"
                            style={{
                                left: `${hs.x}%`,
                                top: `${hs.y}%`,
                                width: `${hs.w}%`,
                                height: `${hs.h}%`
                            }}
                        >
                            {/* Interactive Area styling (no blur, completely transparent until tapped) */}
                            <div className="absolute inset-0 rounded-lg md:rounded-none group-active:bg-orange-500/20 transition-colors"></div>

                            {/* Animated Glowing Outline (Affordance) */}
                            <div className="absolute inset-0 rounded-lg md:rounded-none border-[3px] border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.8),inset_0_0_15px_rgba(249,115,22,0.4)] animate-[pulse_1.5s_ease-in-out_infinite] pointer-events-none"></div>

                            {/* Explicit Icon for specific actions (Calendar) */}
                            {isCalendar && (
                                <div className="relative z-10 text-white bg-blue-600/90 w-10 h-10 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(37,99,235,0.6)] backdrop-blur-sm group-hover:scale-110 transition-transform">
                                    <i className="fa-solid fa-calendar-day text-lg"></i>
                                </div>
                            )}
                        </a>
                    );
                })}
            </div>

            {/* Link List Section */}
            <div className="mt-10 w-full max-w-[450px] animate-in fade-in slide-in-from-bottom-4 duration-700 relative z-20">
                <h3 className="text-[10px] uppercase font-black text-gray-400 tracking-[0.2em] mb-4 text-center">Liens interactifs ({activePage.toUpperCase()})</h3>
                <div className="grid grid-cols-1 gap-2">
                    {pageData.hotspots.length === 0 ? (
                        <p className="text-center text-gray-500 text-[10px] italic">Aucun lien interactif sur cette page</p>
                    ) : (
                        pageData.hotspots.map((hs, idx) => {
                            const isCalendar = hs.url.includes('google.com/calendar') || hs.url.includes('calendar.google.com') || hs.url.includes('calndr.link');
                            const isLocation = hs.url.includes('maps.google') || hs.url.includes('google.com/maps') || hs.url.includes('maps.app.goo.gl') || hs.url.includes('waze.com') || hs.url.includes('apple.com/maps');
                            let displayLabel = hs.label || hs.url;

                            if (!hs.label) {
                                if (isCalendar) {
                                    try {
                                        const params = new URLSearchParams(hs.url.split('?')[1]);
                                        displayLabel = params.get('text') || "Enregistrer la date";
                                    } catch (e) { displayLabel = "Enregistrer la date"; }
                                } else if (isLocation) {
                                    displayLabel = "Itinéraire";
                                }
                            }

                            const bgColorClass = isCalendar ? 'bg-blue-600/80 shadow-[0_0_10px_rgba(37,99,235,0.4)]' :
                                isLocation ? 'bg-green-600/80 shadow-[0_0_10px_rgba(22,163,74,0.4)]' :
                                    'bg-orange-500/80 shadow-[0_0_10px_rgba(249,115,22,0.4)]';

                            const iconClass = isCalendar ? 'fa-calendar-day' :
                                isLocation ? 'fa-map-location-dot' :
                                    'fa-link';

                            return (
                                <a
                                    key={hs.id}
                                    href={hs.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all hover:shadow-[0_0_15px_rgba(249,115,22,0.1)] group backdrop-blur-sm"
                                >
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white ${bgColorClass} group-hover:scale-110 transition-transform shadow-sm`}>
                                        <i className={`fa-solid ${iconClass} text-xs`}></i>
                                    </div>
                                    <span className="text-xs font-bold text-gray-200 truncate flex-1 tracking-wide">{displayLabel}</span>
                                    <i className="fa-solid fa-arrow-up-right-from-square text-[10px] text-gray-500 group-hover:text-orange-500 transition-colors"></i>
                                </a>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Help / Footer */}
            <div className="mt-12 text-gray-500 text-[10px] flex items-center gap-4 font-bold tracking-widest uppercase relative z-20">
                <span className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-full border border-white/5">
                    <i className="fa-solid fa-hand-pointer text-orange-500 animate-bounce"></i> Appuyez pour retourner
                </span>
                <a href="https://signaid.eu" target="_blank" rel="noopener noreferrer" className="hover:text-orange-500 transition-colors">signaid.eu</a>
            </div>

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
