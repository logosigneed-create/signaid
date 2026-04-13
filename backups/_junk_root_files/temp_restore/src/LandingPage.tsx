import { Link, useNavigate } from 'react-router-dom';
import Footer from './components/landing/Footer';
import FeatureCard from './components/landing/StepCard';
import { PLATFORM_FEATURES } from './landingConstants';
import { ArrowRight, Box, Cpu, Fingerprint } from 'lucide-react';
import { DesktopNavbar } from './components/DesktopNavbar';
import { MobileNavbar } from './components/MobileNavbar';
import { UniversalMenu } from './components/UniversalMenu';
import { authService } from './services/authService';
import { User } from './types';
import { useState, useEffect } from 'react';

const LandingPage: React.FC = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState<User | null>(null);
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

    const handleNavigation = (view: string) => {
        if (view === 'feed') navigate('/galerie');
        else if (view === 'customizer') navigate('/creation');
        else if (view === 'profile') navigate('/profil');
        else if (view === 'rewards') navigate('/recompense');
        else if (view === 'cart') navigate('/panier');
        else if (view === 'contact') navigate('/contact');
    };

    return (
        <div className="min-h-screen flex flex-col bg-white text-zinc-900 font-sans selection:bg-brand-orange/20">
            <DesktopNavbar
                activeView="landing"
                onChangeView={handleNavigation}
                cartCount={cartCount}
                user={user}
                onLogout={async () => { await authService.logout(); setUser(null); }}
                onLoginClick={() => navigate('/profil')} // Redirect to app login if click
                onLoginSuccess={setUser}
            />
            <MobileNavbar
                onMenuClick={() => setIsMenuOpen(true)}
                onCartClick={() => navigate('/panier')}
                cartCount={cartCount}
            />
            <UniversalMenu
                isOpen={isMenuOpen}
                onClose={() => setIsMenuOpen(false)}
                onNavigate={handleNavigation}
                user={user}
                activePage="landing"
            />

            <main className="flex-grow pt-24 md:pt-32">

                {/* MANIFESTO HERO */}
                <section className="px-6 pb-24 md:pb-32 border-b border-gray-100">
                    <div className="max-w-6xl mx-auto">
                        <div className="flex flex-col md:flex-row gap-12 md:items-end mb-16">
                            <div className="md:w-3/4">
                                <h1 className="text-5xl md:text-8xl font-black tracking-tighter leading-[0.9] text-zinc-900 mb-8">
                                    ESSAYAGE VIRTUEL <br />
                                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-orange to-orange-600">AVANT IMPRESSION RÉELLE.</span>
                                </h1>
                                <p className="text-xl md:text-2xl text-gray-500 font-light max-w-2xl leading-relaxed mb-10">
                                    De la conception assistée par IA à la production physique. SIGNAID est la première plateforme qui fusionne votre imagination avec la réalité.
                                </p>
                                <Link to="/creation" className="inline-flex px-10 py-4 bg-zinc-900 text-white font-bold rounded-full hover:bg-black transition-all items-center gap-3 group shadow-xl shadow-brand-orange/10">
                                    Créer un projet maintenant
                                    <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform text-brand-orange" />
                                </Link>
                            </div>
                            <div className="md:w-1/4 flex flex-col gap-4 items-start md:items-end">

                                <p className="text-right text-sm text-gray-400 font-medium hidden md:block">
                                    Expérience Complète <br /> Design & Shop
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="p-6 bg-zinc-50 rounded-xl border border-zinc-100">
                                <Cpu className="w-8 h-8 text-zinc-900 mb-4" strokeWidth={1.5} />
                                <h3 className="font-bold text-lg mb-2">Studio Gemini</h3>
                                <p className="text-sm text-gray-500">Visualisation instantanée sur votre propre photo.</p>
                            </div>
                            <div className="p-6 bg-zinc-50 rounded-xl border border-zinc-100">
                                <Box className="w-8 h-8 text-zinc-900 mb-4" strokeWidth={1.5} />
                                <h3 className="font-bold text-lg mb-2">Production Physique</h3>
                                <p className="text-sm text-gray-500">Impression haute qualité et expédition.</p>
                            </div>
                            <div className="p-6 bg-zinc-50 rounded-xl border border-zinc-100">
                                <Fingerprint className="w-8 h-8 text-zinc-900 mb-4" strokeWidth={1.5} />
                                <h3 className="font-bold text-lg mb-2">Écosystème</h3>
                                <p className="text-sm text-gray-500">Créez, partagez, vendez et gagnez.</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* FEATURE GRID */}
                <section className="py-24 bg-white">
                    <div className="max-w-7xl mx-auto px-6">
                        <div className="mb-20 text-center md:text-left">
                            <span className="text-brand-orange font-bold uppercase tracking-widest text-xs mb-4 block">Le processus complet</span>

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
                <section className="py-32 bg-zinc-900 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-brand-orange/20 to-transparent pointer-events-none"></div>

                    <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
                        <h2 className="text-5xl md:text-8xl font-black mb-8 tracking-tighter">
                            JOIN THE <br /> <span className="text-brand-orange">CLUB.</span>
                        </h2>
                        <p className="text-gray-400 text-xl mb-12 max-w-2xl mx-auto font-light">
                            Accédez au studio, jouez à SignPong et commencez à créer votre héritage digital et physique dès maintenant.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-6 justify-center">
                            <Link to="/creation" className="px-12 py-5 bg-white text-black font-bold text-lg rounded-full hover:bg-gray-200 transition-all flex items-center justify-center gap-3 group">
                                Accéder à la plateforme
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
