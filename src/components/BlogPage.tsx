import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DesktopNavbar } from './DesktopNavbar';
import { MobileNavbar } from './MobileNavbar';
import { UniversalMenu } from './UniversalMenu';
import Footer from './landing/Footer';
import { authService } from '../services/authService';
import { User } from '../types';
import { ArrowRight, Bolt, ChartLine, Smile, MapPin, Calendar, Clock, Printer, Check } from 'lucide-react';
import { SEO } from './SEO';

const BlogPage: React.FC = () => {
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
        else if (view === 'blog') navigate('/blog');
        else if (view === 'contact') navigate('/contact');
    };

    return (
        <div className="min-h-screen flex flex-col bg-white text-zinc-900 font-sans selection:bg-orange-500/20">
            <SEO
                title="L’IA au service de l’imprimerie"
                description="Découvrez comment l'Intelligence Artificielle transforme l'imprimerie en Wallonie : essayage virtuel, +30% de conversion et fin du BAT laborieux."
                keywords="futur imprimerie, IA imprimerie, essayage virtuel Wallonie, PrintIA blog, innovation textile Belgique"
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
                        <span className="inline-block px-4 py-1 rounded-full bg-orange-100 text-orange-600 font-bold text-xs mb-4 uppercase tracking-widest">Innovation & IA</span>
                        <h1 className="text-4xl md:text-6xl font-black text-zinc-900 leading-tight mb-6 uppercase tracking-tighter">
                            L’IA au service de l’<span className="text-orange-500">Imprimerie</span> : Pourquoi l’essayage virtuel est le futur en <span className="text-orange-500">Wallonie</span>
                        </h1>
                        <p className="text-xl md:text-2xl text-gray-500 font-light mb-8 max-w-2xl mx-auto leading-relaxed">
                            Dans le secteur de l’imprimerie et de la personnalisation, le plus grand frein à l’achat a toujours été le même : <span className="italic font-medium">le doute</span>.
                        </p>
                        <div className="flex items-center justify-center space-x-6 text-sm text-gray-400 font-medium uppercase tracking-widest">
                            <span className="flex items-center"><Calendar className="mr-2" size={14} /> 1 Mars 2024</span>
                            <span className="flex items-center"><Clock className="mr-2" size={14} /> 5 min de lecture</span>
                        </div>
                    </div>
                </header>

                <div className="max-w-5xl mx-auto px-4 py-12">
                    {/* Intro content */}
                    <div className="prose prose-lg max-w-none text-gray-600 mb-16 text-lg md:text-xl font-light leading-relaxed">
                        <p className="mb-6">
                            « Est-ce que mon logo sera bien placé ? Est-ce que cette couleur rendra bien sur ce support ? » Autant de questions qui font hésiter vos prospects. Aujourd'hui, grâce à l'Intelligence Artificielle, ce frein disparaît. Découvrez comment l’essayage virtuel transforme vos visiteurs en clients fidèles.
                        </p>
                    </div>

                    {/* Sections Grid */}
                    <div className="grid md:grid-cols-2 gap-8 mb-20">
                        {/* Card 1 */}
                        <div className="bg-zinc-50 p-8 rounded-3xl shadow-sm border border-zinc-100 hover:border-orange-200 transition-all group">
                            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-orange-500 mb-6 text-xl shadow-sm group-hover:scale-110 transition-transform">
                                <Bolt size={24} />
                            </div>
                            <h2 className="text-2xl font-black text-zinc-900 mb-4 uppercase tracking-tight">1. La fin du "Bon À Tirer" laborieux</h2>
                            <p className="text-gray-500 leading-relaxed">
                                Traditionnellement, la validation d'une commande demande des allers-retours d'e-mails et des maquettes manuelles. Avec notre solution de <strong>Visualisation IA</strong>, le client importe son design et le voit instantanément appliqué sur le produit final, avec un réalisme saisissant.
                            </p>
                            <p className="mt-6 flex items-center font-bold text-orange-500 text-sm uppercase tracking-widest">
                                <Check size={16} className="mr-2" /> Prise de décision immédiate
                            </p>
                        </div>

                        {/* Card 2 */}
                        <div className="bg-zinc-900 p-8 rounded-3xl shadow-xl text-white relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                            <div className="w-12 h-12 bg-zinc-800 rounded-2xl flex items-center justify-center text-orange-400 mb-6 text-xl shadow-sm group-hover:scale-110 transition-transform relative z-10">
                                <ChartLine size={24} />
                            </div>
                            <h2 className="text-2xl font-black mb-4 uppercase tracking-tight relative z-10">2. +30% de conversion : les chiffres</h2>
                            <p className="text-gray-400 leading-relaxed relative z-10">
                                L'intégration d'un module d'essayage virtuel (VTO) permet en moyenne d'augmenter le taux de conversion de <strong>25 % à 40 %</strong>.
                            </p>
                            <div className="mt-8 flex items-end space-x-2 relative z-10">
                                <span className="text-6xl font-black text-orange-500">+30%</span>
                                <span className="text-gray-500 pb-2 font-bold uppercase text-xs tracking-widest">de CA moyen</span>
                            </div>
                        </div>

                        {/* Card 3 */}
                        <div className="bg-zinc-50 p-8 rounded-3xl shadow-sm border border-zinc-100 hover:border-orange-200 transition-all group">
                            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-orange-500 mb-6 text-xl shadow-sm group-hover:scale-110 transition-transform">
                                <Smile size={24} />
                            </div>
                            <h2 className="text-2xl font-black text-zinc-900 mb-4 uppercase tracking-tight">3. Moins de retours, plus de satisfaction</h2>
                            <p className="text-gray-500 leading-relaxed">
                                L'erreur de commande est le cauchemar de l'imprimeur. En permettant un essayage virtuel ultra-précis, vous alignez parfaitement les attentes du client avec la production réelle.
                            </p>
                            <div className="mt-6 p-4 bg-green-50 rounded-2xl text-green-700 text-sm font-bold flex items-center">
                                <ArrowRight size={16} className="mr-2" rotate={45} /> Baisse de 30 % des réclamations et retours constatée.
                            </div>
                        </div>

                        {/* Card 4 */}
                        <div className="bg-orange-50 p-8 rounded-3xl shadow-sm border border-orange-100 group hover:bg-orange-100/50 transition-colors">
                            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-orange-500 mb-6 text-xl shadow-sm group-hover:scale-110 transition-transform">
                                <MapPin size={24} />
                            </div>
                            <h2 className="text-2xl font-black text-zinc-900 mb-4 uppercase tracking-tight">4. Opportunité unique en Wallonie</h2>
                            <p className="text-gray-500 leading-relaxed">
                                Le paysage de l'imprimerie belge se digitalise. En adoptant ces outils maintenant, vous ne faites pas que suivre la tendance : vous prenez une longueur d'avance sur la concurrence locale.
                            </p>
                        </div>
                    </div>

                    {/* Interactive Visual Section */}
                    <section className="bg-white rounded-[2rem] p-8 md:p-16 shadow-2xl border border-zinc-100 mb-20 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-2 bg-orange-500"></div>
                        <div className="grid md:grid-cols-2 gap-16 items-center">
                            <div>
                                <h3 className="text-4xl font-black text-zinc-900 mb-8 uppercase tracking-tighter">Visualisez la puissance de l'IA</h3>
                                <p className="text-gray-500 text-lg md:text-xl font-light mb-8 leading-relaxed">
                                    Survolez l'image pour voir comment l'IA transforme un simple fichier en une simulation ultra-réaliste sur textile. Plus besoin d'imaginer le rendu, il est là.
                                </p>
                                <ul className="space-y-6">
                                    <li className="flex items-start bg-zinc-50 p-4 rounded-2xl border border-zinc-100">
                                        <div className="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center mr-4 flex-shrink-0">
                                            <Check size={18} />
                                        </div>
                                        <span className="font-bold text-zinc-800">Adaptation automatique aux plis du vêtement</span>
                                    </li>
                                    <li className="flex items-start bg-zinc-50 p-4 rounded-2xl border border-zinc-100">
                                        <div className="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center mr-4 flex-shrink-0">
                                            <Check size={18} />
                                        </div>
                                        <span className="font-bold text-zinc-800">Gestion des ombres et de la texture</span>
                                    </li>
                                </ul>
                            </div>
                            <div className="relative group cursor-pointer aspect-[3/4] rounded-3xl overflow-hidden shadow-2xl border border-zinc-100 bg-white transition-all duration-700 hover:scale-[1.02]">
                                {/* Image par défaut : Le vêtement seul */}
                                <img
                                    src="/assets/blog_garment.png"
                                    alt="Vêtement personnalisé avec logo"
                                    className="absolute inset-0 w-full h-full object-contain p-8 transition-all duration-700 opacity-100 group-hover:opacity-0 group-hover:scale-95 group-hover:blur-sm"
                                />

                                {/* Image au survol : La personne qui le porte */}
                                <img
                                    src="/assets/blog_model.jpg"
                                    alt="Simulation IA : Personne portant le vêtement"
                                    className="absolute inset-0 w-full h-full object-cover transition-all duration-700 opacity-0 scale-110 group-hover:opacity-100 group-hover:scale-100"
                                />

                                {/* Overlay Gradient for better badge visibility */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>

                                {/* Badge Interactif */}
                                <div className="absolute bottom-6 right-6 bg-zinc-900/90 text-white text-[10px] px-4 py-2 rounded-full uppercase tracking-[0.2em] font-black z-20 shadow-lg border border-white/10 group-hover:bg-orange-500 transition-colors">
                                    Survolez pour porter
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* OTHER ARTICLES SECTION */}
                    <section className="py-24 border-t border-zinc-100">
                        <div className="flex justify-between items-end mb-16">
                            <h3 className="text-3xl font-black text-zinc-900 uppercase tracking-tighter text-left">D'autres articles <span className="text-orange-500 text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600">intéressants</span></h3>
                        </div>
                        <div className="grid md:grid-cols-2 gap-12">
                            <div
                                className="group cursor-pointer bg-zinc-50 p-8 rounded-[2.5rem] border border-zinc-100 hover:border-orange-200 transition-all text-left"
                                onClick={() => navigate('/blog/analyse-geometrique')}
                            >
                                <div className="aspect-video bg-zinc-100 rounded-[2rem] mb-8 overflow-hidden relative shadow-sm">
                                    <img src="/assets/blog_garment.png" alt="Geométrie Design" className="w-full h-full object-contain p-8 transition-transform duration-700 group-hover:scale-110" />
                                    <div className="absolute top-6 left-6 bg-zinc-900 text-white text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-xl">Nouveau</div>
                                </div>
                                <h4 className="text-2xl font-black text-zinc-900 mb-4 uppercase tracking-tight group-hover:text-orange-500 transition-colors">Analyse Géométrique du Design</h4>
                                <p className="text-sm text-zinc-500 leading-relaxed font-light mb-6">Comment les formes influencent le rendu de vos impressions sur textile.</p>
                                <span className="flex items-center gap-2 text-orange-500 font-black uppercase tracking-widest text-[10px] group-hover:gap-3 transition-all">Lire l'article <ArrowRight size={14} /></span>
                            </div>
                        </div>
                    </section>

                    {/* CTA Section */}
                    <section className="bg-zinc-900 rounded-[2.5rem] p-10 md:p-20 text-center text-white relative overflow-hidden shadow-2xl">
                        <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-orange-500/10 rounded-full -mr-[20rem] -mt-[20rem] blur-[100px] pointer-events-none"></div>
                        <div className="absolute bottom-0 left-0 w-[30rem] h-[30rem] bg-orange-600/5 rounded-full -ml-[15rem] -mb-[15rem] blur-[80px] pointer-events-none"></div>

                        <div className="relative z-10">
                            <h2 className="text-4xl md:text-7xl font-black mb-10 tracking-tighter uppercase leading-[0.9]">
                                Prêt à booster <br /> <span className="text-orange-500 text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600">vos ventes ?</span>
                            </h2>
                            <p className="text-gray-400 mb-12 max-w-2xl mx-auto text-lg md:text-xl font-light leading-relaxed">
                                Nous lançons un programme pilote exclusif en Wallonie. Nous installons la technologie sur votre site et mesurons ensemble l'augmentation de vos revenus.
                            </p>
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                                <button
                                    onClick={() => navigate('/contact')}
                                    className="w-full sm:w-auto bg-orange-500 text-white font-black px-12 py-5 rounded-full hover:bg-orange-400 transition-all transform hover:scale-105 shadow-xl shadow-orange-500/20 uppercase tracking-widest text-sm"
                                >
                                    Demander une démo
                                </button>
                                <button
                                    onClick={() => navigate('/creation')}
                                    className="w-full sm:w-auto border border-zinc-700 text-white font-black px-12 py-5 rounded-full hover:bg-zinc-800 transition-all uppercase tracking-widest text-sm"
                                >
                                    Tester l'outil
                                </button>
                            </div>
                        </div>
                    </section>
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default BlogPage;
