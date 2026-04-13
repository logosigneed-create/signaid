import { Link, useNavigate, useLocation } from 'react-router-dom';
import { createPortal } from 'react-dom';
import Footer from './components/landing/Footer';
import FeatureCard from './components/landing/StepCard';
import { PLATFORM_FEATURES } from './landingConstants';
import { ArrowRight, Box, Cpu, Fingerprint, Palette, ShoppingBag } from 'lucide-react';
import { DesktopNavbar } from './components/DesktopNavbar';
import { MobileNavbar } from './components/MobileNavbar';
// MobileBottomNav import removed
import { UniversalMenu } from './components/UniversalMenu';
import { authService } from './services/authService';
import { User } from './types';
import { useState, useEffect } from 'react';

import { db } from './firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { PromoBanner } from './components/PromoBanner';
import { SEO } from './components/SEO';


const LandingPage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [user, setUser] = useState<User | null>(null);

    // DEEP LINK REDIRECT
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        if (params.get('view') === 'admin') {
            navigate(`/admin${location.search}`);
        } else if (params.get('quoteId') && params.get('quoteItemIdx')) {
            // Redirect Deep Link to Customizer App
            navigate(`/creation${location.search}`);
        }
    }, [location.search]);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [cartCount, setCartCount] = useState(0);

    // Fetch User
    useEffect(() => {
        const unsubscribe = authService.onAuthStateChanged(setUser);
        return () => unsubscribe();
    }, []);

    // Stub Cart Count from localstorage for display
    useEffect(() => {
        try {
            const saved = localStorage.getItem('cart');
            if (saved) {
                const cart = JSON.parse(saved);
                setCartCount(cart.length);
            }
        } catch (e) { }
    }, []);

    // Banner Settings State
    const [bannerSettings, setBannerSettings] = useState<{ enabled: boolean, text: string }>({ enabled: false, text: '' });

    // Fetch Banner Settings
    useEffect(() => {
        const fetchBanner = async () => {
            try {
                const bannerDoc = await getDoc(doc(db, 'settings', 'banner'));
                if (bannerDoc.exists()) {
                    setBannerSettings(bannerDoc.data() as { enabled: boolean, text: string });
                }
            } catch (e) {
                console.error("Banner fetch err:", e);
            }
        };
        fetchBanner();
    }, []);

    const handleNavigation = (view: string) => {
        if (view === 'feed') navigate('/galerie');
        else if (view === 'customizer') navigate('/creation?checkDraft=true');
        else if (view === 'profile') navigate('/profil');
        else if (view === 'rewards') navigate('/recompense');
        else if (view === 'cart') navigate('/panier');
        else if (view === 'contact') navigate('/contact');
    };

    return (
        <div className="min-h-screen flex flex-col bg-white text-zinc-900 font-sans selection:bg-brand-orange/20">
            <SEO
                title="Design & Impression Interactive"
                description="Le studio de design IA ultime pour créer vos vêtements personnalisés en Wallonie. Essayez virtuellement vos créations et commandez en ligne."
                keywords="imprimerie wallonie, design IA, personnalisation t-shirt, sweat personnalisé, essayage virtuel Belgique, studio créatif interactif"
            />
            {/* PROMO BANNER FOR LANDING PAGE */}
            <PromoBanner isVisible={bannerSettings.enabled} text={bannerSettings.text} />

            <div className={bannerSettings.enabled ? "mt-8" : "mt-0"}>
                <DesktopNavbar
                    activeView="landing"
                    onChangeView={handleNavigation}
                    cartCount={cartCount}
                    user={user}
                    onLogout={async () => { await authService.logout(); setUser(null); }}
                    onLoginClick={() => navigate('/profil')} // Redirect to app login if click
                    onLoginSuccess={setUser}
                />
            </div>
            <MobileNavbar
                onMenuClick={() => setIsMenuOpen(true)}
                onCartClick={() => navigate('/panier')}
                cartCount={cartCount}
            />
            {/* MobileBottomNav removed */}
            <UniversalMenu
                isOpen={isMenuOpen}
                onClose={() => setIsMenuOpen(false)}
                onNavigate={handleNavigation}
                user={user}
                activePage="landing"
            />

            <main className={`flex-grow ${bannerSettings.enabled ? 'pt-24 md:pt-32' : 'pt-16 md:pt-20'}`}>

                {/* MANIFESTO HERO */}
                <section id="hero" className="px-4 pb-16 md:pb-32 border-b border-gray-100">
                    <div className="max-w-6xl mx-auto">
                        <div className="flex flex-col md:flex-row gap-8 md:items-end mb-12 md:mb-16">
                            <div className="md:w-3/4">
                                <h1 className="text-5xl md:text-8xl font-black tracking-tighter leading-[0.9] text-zinc-900 mb-8 uppercase">
                                    DESIGN & <br />
                                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-orange-600">IMPRESSION INTERACTIVE.</span>
                                </h1>
                                <p className="text-xl md:text-2xl text-gray-500 font-light max-w-2xl leading-relaxed mb-10">
                                    Découvrez le futur de l'imprimerie. SIGNAID fusionne le design créatif et l'interactivité numérique pour des supports physiques qui connectent réellement.
                                </p>
                                <div className="flex flex-wrap gap-4">
                                    <Link to="/creation?openLogoOptions=true&checkDraft=true" className="w-full sm:w-auto inline-flex px-10 py-4 bg-zinc-900 text-white font-bold rounded-xl md:rounded-full hover:bg-black transition-all items-center justify-center gap-3 group shadow-xl shadow-orange-500/10">
                                        Créer mon projet
                                        <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform text-orange-500" />
                                    </Link>
                                </div>
                            </div>
                            <div className="md:w-1/4 flex flex-col gap-4 items-start md:items-end">

                                <p className="text-right text-sm text-gray-400 font-medium hidden md:block">
                                    Expérience Complète <br /> Design & Shop
                                </p>
                            </div>
                        </div>

                        {/* SECONDARY FEATURES - HIDDEN ON MOBILE (Redundant with Guide) */}
                        <div className="hidden md:grid grid-cols-3 gap-6">
                            <div className="p-6 bg-zinc-50 rounded-xl border border-zinc-100">
                                <Palette className="w-8 h-8 text-zinc-900 mb-4" strokeWidth={1.5} />
                                <h3 className="font-bold text-lg mb-2">Système d'Impression</h3>
                                <p className="text-sm text-gray-500">Un écosystème conçu pour optimiser chaque étape de votre création.</p>
                            </div>
                            <div className="p-6 bg-zinc-50 rounded-xl border border-zinc-100">
                                <Box className="w-8 h-8 text-zinc-900 mb-4" strokeWidth={1.5} />
                                <h3 className="font-bold text-lg mb-2">Interactivité Directe</h3>
                                <p className="text-sm text-gray-500">Transformez vos supports physiques en passerelles vers le digital.</p>
                            </div>
                            <div className="p-6 bg-zinc-50 rounded-xl border border-zinc-100">
                                <ShoppingBag className="w-8 h-8 text-zinc-900 mb-4" strokeWidth={1.5} />
                                <h3 className="font-bold text-lg mb-2">Conçu pour l'Expertise</h3>
                                <p className="text-sm text-gray-500">Un outil professionnel au service de la qualité et du design.</p>
                            </div>
                        </div>
                    </div>
                </section>



                {/* FEATURE GRID */}
                <section id="guide" className="py-20 md:py-24 bg-white relative">
                    <div className="max-w-7xl mx-auto px-4">
                        <div className="mb-12 md:mb-20 text-center md:text-left">
                            <span className="text-orange-600 font-black uppercase tracking-widest text-[10px] md:text-sm mb-4 block">ÉCOSYSTÈME COMPLET</span>
                            <h2 className="text-4xl md:text-6xl font-black tracking-tighter text-zinc-900 mb-6 uppercase">
                                COMMENT ÇA MARCHE ?
                            </h2>
                            <div className="w-20 h-2 bg-orange-500 mb-8 md:mx-0 mx-auto"></div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                            {PLATFORM_FEATURES.map((feature, index) => (
                                <FeatureCard
                                    key={feature.id}
                                    step={feature}
                                />
                            ))}
                        </div>
                    </div>
                </section>



                {/* CTA SECTION */}
                <section id="cta" className="py-32 bg-zinc-900 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-orange-500/20 to-transparent pointer-events-none"></div>

                    <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
                        <h2 className="text-5xl md:text-8xl font-black mb-8 tracking-tighter uppercase leading-[0.9]">
                            LANCEZ VOTRE <br /> <span className="text-orange-500">PROJET.</span>
                        </h2>
                        <p className="text-gray-400 text-lg md:text-xl mb-12 max-w-2xl mx-auto font-light leading-relaxed">
                            Accédez à notre studio de création, configurez vos supports et obtenez un résultat professionnel immédiatement.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-6 justify-center">
                            <Link to="/creation?checkDraft=true" className="px-12 py-5 bg-white text-black font-bold text-lg rounded-full hover:bg-gray-200 transition-all flex items-center justify-center gap-3 group">
                                Commencer maintenant
                                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                            </Link>

                        </div>
                    </div>
                </section>

            </main>

            <Footer />
        </div>
    );
};

export default LandingPage;
