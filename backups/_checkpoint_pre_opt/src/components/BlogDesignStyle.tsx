import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DesktopNavbar } from './DesktopNavbar';
import { MobileNavbar } from './MobileNavbar';
import { UniversalMenu } from './UniversalMenu';
import Footer from './landing/Footer';
import { authService } from '../services/authService';
import { User } from '../types';
import { ArrowRight, Sparkles, Target, Zap, Layout, Calendar, Clock, Check, Palette } from 'lucide-react';
import { SEO } from './SEO';

export default function BlogDesignStyle() {
    const navigate = useNavigate();
    const [user, setUser] = useState<User | null>(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [cartCount, setCartCount] = useState(0);

    // Fetch User
    useEffect(() => {
        const unsubscribe = authService.onAuthStateChanged(setUser);
        return () => unsubscribe();
    }, []);

    // Stub Cart Count from localstorage
    useEffect(() => {
        const updateCartCount = () => {
            try {
                const saved = localStorage.getItem('cart');
                if (saved) {
                    const cart = JSON.parse(saved);
                    if (Array.isArray(cart)) {
                        setCartCount(cart.length);
                    }
                }
            } catch (e) { }
        };
        updateCartCount();
        window.addEventListener('storage', updateCartCount);
        return () => window.removeEventListener('storage', updateCartCount);
    }, []);

    const handleNavigation = (view: string) => {
        if (view === 'feed') navigate('/galerie');
        else if (view === 'customizer') navigate('/creation');
        else if (view === 'profile') navigate('/profil');
        else if (view === 'rewards') navigate('/recompense');
        else if (view === 'cart') navigate('/panier');
        else if (view === 'blog') navigate('/blog');
        else if (view === 'contact') navigate('/contact');
    };

    return (
        <div className="min-h-screen flex flex-col bg-white text-zinc-900 font-sans selection:bg-orange-500/20">
            <SEO
                title="Accessible vs Pro : Quel design pour vos vêtements ?"
                description="Décryptage des styles de design textile : faut-il choisir la vivacité du style accessible ou la rigueur du design pro pour vos impressions ?"
                keywords="design textile, graphisme tshirt, imprimerie personnalisée, style accessible, design pro, Signaid blog"
            />
            <DesktopNavbar
                activeView="blog"
                onChangeView={handleNavigation}
                cartCount={cartCount}
                user={user}
                onLogout={async () => { await authService.logout(); setUser(null); }}
                onLoginClick={() => navigate('/profil')}
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
                activePage="blog"
            />

            <main className="flex-grow pt-20 md:pt-24 pb-12">
                <div className="max-w-4xl mx-auto px-4 text-left">
                    <button
                        onClick={() => navigate('/blog')}
                        className="flex items-center gap-2 text-zinc-400 hover:text-orange-500 font-bold mb-8 transition-colors uppercase tracking-widest text-xs"
                    >
                        <i className="fa-solid fa-chevron-left text-[10px]"></i> Retour au Blog
                    </button>
                </div>

                {/* Hero Section */}
                <header className="relative bg-white pt-16 pb-12 overflow-hidden border-b border-gray-100">
                    <div className="max-w-4xl mx-auto px-4 text-center">
                        <span className="inline-block px-4 py-1 rounded-full bg-orange-100 text-orange-600 font-bold text-xs mb-4 uppercase tracking-widest">Guide Design</span>
                        <h1 className="text-4xl md:text-6xl font-black text-zinc-900 leading-tight mb-6 uppercase tracking-tighter">
                            Accessible vs Pro : <span className="text-orange-500">L'Art de Choisir</span> son Style d'Impression
                        </h1>
                        <p className="text-xl md:text-2xl text-gray-500 font-light mb-8 max-w-2xl mx-auto leading-relaxed">
                            Dans le monde du textile personnalisé, le style visuel définit votre message. Mais comment savoir quel design parlera le mieux à votre audience ?
                        </p>
                        <div className="flex items-center justify-center space-x-6 text-sm text-gray-400 font-medium uppercase tracking-widest">
                            <span className="flex items-center"><Calendar className="mr-2" size={14} /> 5 Mars 2024</span>
                            <span className="flex items-center"><Clock className="mr-2" size={14} /> 6 min de lecture</span>
                        </div>
                    </div>
                </header>

                <div className="max-w-5xl mx-auto px-4 py-12">
                    {/* Intro content */}
                    <div className="prose prose-lg max-w-none text-gray-600 mb-16 text-lg md:text-xl font-light leading-relaxed">
                        <p className="mb-6">
                            Choisir un design pour un t-shirt ou un sweat n'est pas qu'une question de goût. C'est une stratégie de communication. Chez <strong>Signaid</strong>, nous voyons passer des milliers de créations, et deux grandes tendances se dessinent : le style <strong>Accessible</strong> (vibrant, énergique) et le style <strong>Pro</strong> (travaillé, épuré).
                        </p>
                    </div>

                    {/* Image Comparison Section */}
                    <section className="bg-zinc-50 rounded-[2rem] p-8 md:p-12 mb-20 border border-zinc-100">
                        <h2 className="text-3xl font-black text-center mb-10 uppercase tracking-tight">Le Match Visuel</h2>
                        <div className="grid md:grid-cols-2 gap-8 md:gap-12">
                            {/* Accessible Style */}
                            <div className="space-y-6">
                                <div className="aspect-[3/4] rounded-3xl overflow-hidden shadow-xl border-4 border-zinc-900 bg-zinc-900 group cursor-crosshair relative">
                                    <img
                                        src="/assets/blog/blog_style_pro.jpg"
                                        alt="Design Style Pro DJ Caricature"
                                        className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-500"
                                    />
                                    <div className="absolute top-4 left-4 bg-white text-zinc-900 text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-lg">Accessible</div>
                                </div>
                                <div className="p-6 bg-white rounded-2xl shadow-sm">
                                    <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
                                        <Sparkles className="text-orange-500" size={20} /> Style Accessible
                                    </h3>
                                    <p className="text-gray-500 text-sm leading-relaxed">
                                        Un design riche en détails, vibrant et coloré. Il privilégie l'émotion et l'énergie immédiate. Parfait pour les clubs, les événements festifs ou les communautés jeunes.
                                    </p>
                                    <ul className="mt-4 space-y-2">
                                        <li className="text-xs font-bold text-zinc-700 flex items-center gap-2">✓ Couleurs saturées</li>
                                        <li className="text-xs font-bold text-zinc-700 flex items-center gap-2">✓ Éléments de décor nombreux</li>
                                        <li className="text-xs font-bold text-zinc-700 flex items-center gap-2">✓ Impact visuel fort</li>
                                    </ul>
                                </div>
                            </div>

                            {/* Pro Style */}
                            <div className="space-y-6">
                                <div className="aspect-[3/4] rounded-3xl overflow-hidden shadow-xl border-4 border-white bg-white group cursor-crosshair relative">
                                    <img
                                        src="/assets/blog/blog_style_accessible.png"
                                        alt="Design Style Accessible DJ Caricature"
                                        className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-500"
                                    />
                                    <div className="absolute top-4 left-4 bg-orange-500 text-white text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-lg">Style Pro</div>
                                </div>
                                <div className="p-6 bg-white rounded-2xl shadow-sm border border-zinc-100">
                                    <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
                                        <Layout className="text-zinc-900" size={20} /> Design Travaillé Pro
                                    </h3>
                                    <p className="text-gray-500 text-sm leading-relaxed">
                                        Une approche épurée où chaque élément est à sa place. Le fond est plus sobre pour laisser respirer le sujet central. Idéal pour une image de marque premium et un usage professionnel.
                                    </p>
                                    <ul className="mt-4 space-y-2">
                                        <li className="text-xs font-bold text-zinc-700 flex items-center gap-2">✓ Harmonie des teintes</li>
                                        <li className="text-xs font-bold text-zinc-700 flex items-center gap-2">✓ Lisibilité maximale</li>
                                        <li className="text-xs font-bold text-zinc-700 flex items-center gap-2">✓ Rendu sobre et élégant</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Detailed Analysis */}
                    <div className="grid md:grid-cols-3 gap-8 mb-20">
                        <div className="bg-zinc-50 p-8 rounded-3xl border border-zinc-100">
                            <Target className="text-orange-500 mb-6" size={32} />
                            <h3 className="text-xl font-bold mb-4 uppercase tracking-tight">Cible & Audience</h3>
                            <p className="text-gray-500 text-sm leading-relaxed">
                                Le style accessible s'adresse au cœur. Il crée une connexion instantanée par la couleur. Le style pro s'adresse à l'esprit, reflétant le sérieux et la maîtrise de votre image.
                            </p>
                        </div>
                        <div className="bg-zinc-50 p-8 rounded-3xl border border-zinc-100">
                            <Zap className="text-orange-500 mb-6" size={32} />
                            <h3 className="text-xl font-bold mb-4 uppercase tracking-tight">Psychologie des Couleurs</h3>
                            <p className="text-gray-500 text-sm leading-relaxed">
                                Une palette riche (accessible) stimule l'enthousiasme. Une palette restreinte ou ton-sur-ton (pro) inspire confiance et stabilité.
                            </p>
                        </div>
                        <div className="bg-zinc-50 p-8 rounded-3xl border border-zinc-100">
                            <Palette className="text-orange-500 mb-6" size={32} />
                            <h3 className="text-xl font-bold mb-4 uppercase tracking-tight">Technique d'Impression</h3>
                            <p className="text-gray-500 text-sm leading-relaxed">
                                Nos imprimantes gèrent parfaitement les deux styles, mais le design pro offre souvent un rendu plus "intégré" à la fibre du vêtement.
                            </p>
                        </div>
                    </div>

                    {/* Interactive Visual Section (Reusable pattern from other pages) */}
                    <section className="bg-zinc-900 rounded-[2rem] p-8 md:p-16 shadow-2xl mb-20 relative overflow-hidden text-white">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                        <div className="grid md:grid-cols-2 gap-16 items-center">
                            <div>
                                <h3 className="text-4xl font-black mb-8 uppercase tracking-tighter">Prêt à créer votre style ?</h3>
                                <p className="text-gray-400 text-lg font-light mb-8 leading-relaxed">
                                    Peu importe votre preference, notre outil de création vous permet de tester ces deux approches en quelques secondes grâce à l'IA.
                                </p>
                                <ul className="space-y-6">
                                    <li className="flex items-start bg-white/5 p-4 rounded-2xl border border-white/10">
                                        <div className="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center mr-4 flex-shrink-0">
                                            <Check size={18} />
                                        </div>
                                        <span className="font-bold">Génération instantanée de variantes</span>
                                    </li>
                                    <li className="flex items-start bg-white/5 p-4 rounded-2xl border border-white/10">
                                        <div className="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center mr-4 flex-shrink-0">
                                            <Check size={18} />
                                        </div>
                                        <span className="font-bold">Aperçu HD sur mannequin virtuel</span>
                                    </li>
                                </ul>
                            </div>
                            <div className="flex justify-center">
                                <button
                                    onClick={() => navigate('/creation')}
                                    className="group relative px-12 py-6 bg-orange-500 rounded-full font-black uppercase tracking-[0.2em] hover:bg-orange-400 transition-all shadow-2xl shadow-orange-500/20 active:scale-95"
                                >
                                    Ouvrir l'Atelier
                                    <ArrowRight className="inline-block ml-3 group-hover:translate-x-2 transition-transform" />
                                </button>
                            </div>
                        </div>
                    </section>

                    {/* CTA Section */}
                    <section className="text-center py-12">
                        <h2 className="text-3xl font-black mb-6 uppercase tracking-tight">Besoin d'un conseil d'expert ?</h2>
                        <p className="text-gray-500 mb-10 max-w-xl mx-auto">
                            Nos graphistes sont là pour vous aider à trancher entre ces deux styles en fonction de vos besoins réels.
                        </p>
                        <button
                            onClick={() => navigate('/contact')}
                            className="bg-zinc-900 text-white font-bold px-10 py-4 rounded-full hover:bg-zinc-800 transition-all uppercase tracking-widest text-sm"
                        >
                            Contacter l'équipe
                        </button>
                    </section>
                </div>
            </main>

            <Footer />
        </div>
    );
}
