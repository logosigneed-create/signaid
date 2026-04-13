import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DesktopNavbar } from './DesktopNavbar';
import { MobileNavbar } from './MobileNavbar';
import { UniversalMenu } from './UniversalMenu';
import Footer from './landing/Footer';
import { authService } from '../services/authService';
import { User } from '../types';
import { ArrowRight, ShieldAlert, Award, Fingerprint, HelpCircle, Calendar, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { SEO } from './SEO';

const BlogBrandAsset: React.FC = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState<User | null>(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [cartCount, setCartCount] = useState(0);

    useEffect(() => {
        const unsubscribe = authService.onAuthStateChanged(setUser);
        return () => unsubscribe();
    }, []);

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
                title="Logo Générique : Le Risque pour votre Marque"
                description="Pourquoi l'utilisation d'un logo générique est une erreur stratégique et juridique majeure. Découvrez la force du design sur-mesure."
                keywords="identité visuelle sur-mesure, propriété de marque, danger logo générique, capital marque, monogramme propriétaire"
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
                        <div className="inline-block px-4 py-1 rounded-full bg-red-100 text-red-600 font-bold text-xs mb-4 uppercase tracking-widest flex items-center gap-2 mx-auto w-fit">
                           <AlertTriangle size={12} className="inline mr-1" /> Stratégie & Capital Marque
                        </div>
                        <h1 className="text-4xl md:text-7xl font-black text-zinc-900 leading-[0.9] mb-8 uppercase tracking-tighter">
                            L'illusion de la marque : <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-zinc-800 to-orange-500">Pourquoi votre logo générique est un risque majeur</span>
                        </h1>
                        <p className="text-xl md:text-2xl text-gray-500 font-light mb-10 max-w-2xl mx-auto leading-relaxed">
                            Possédez-vous réellement votre identité ou louez-vous un symbole interchangeable qui dilue votre valeur ?
                        </p>
                        <div className="flex items-center justify-center space-x-6 text-sm text-gray-400 font-medium uppercase tracking-widest">
                            <span className="flex items-center"><Calendar className="mr-2" size={14} /> 1 Avril 2024</span>
                            <span className="flex items-center"><Clock className="mr-2" size={14} /> 8 min de lecture</span>
                        </div>
                    </div>
                </header>

                <div className="max-w-5xl mx-auto px-4 py-12">
                    {/* Introduction */}
                    <div className="prose prose-lg max-w-none text-gray-600 mb-16 text-lg md:text-2xl font-light leading-relaxed border-l-4 border-orange-500 pl-8 italic bg-zinc-50 py-8 rounded-r-3xl">
                        <p className="mb-0">
                            "Si votre concurrent peut porter le même symbole que vous, vous n'avez pas de marque. Vous avez une étiquette."
                        </p>
                    </div>

                    <p className="text-xl text-gray-600 mb-12 leading-relaxed">
                        Posez-vous cette question simple : <strong>Votre logo vous appartient-il vraiment ?</strong> Si vous avez acheté une icône sur une banque d'images, utilisé un générateur automatique ou "emprunté" un symbole banal sous lequel vous avez simplement apposé votre nom, la réponse est <strong>non</strong>. Vous n'êtes pas propriétaire d'un actif ; vous occupez un symbole précaire que n'importe quel concurrent peut revendiquer demain.
                    </p>

                    {/* Section 1: L'illusion du logo jetable */}
                    <div className="grid md:grid-cols-2 gap-12 mb-20 items-center">
                        <div className="bg-red-50 p-10 rounded-[3rem] border border-red-100 relative overflow-hidden group">
                           <div className="absolute top-0 right-0 w-32 h-32 bg-red-200/20 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                            <ShieldAlert className="w-16 h-16 text-red-600 mb-8" strokeWidth={1} />
                            <h2 className="text-3xl font-black text-zinc-900 mb-6 uppercase tracking-tight">1. L'illusion du logo jetable</h2>
                            <p className="text-gray-600 leading-relaxed mb-6 font-medium">
                                Un logo générique acheté en banque d'images ou généré par des outils de masse ne vaut rien sur le plan stratégique.
                            </p>
                            <ul className="space-y-4">
                                <li className="flex items-start gap-3 text-red-700 bg-white/50 p-3 rounded-2xl">
                                    <AlertTriangle size={18} className="mt-1 flex-shrink-0" />
                                    <span className="text-sm font-bold uppercase tracking-tight">Impossibilité de dépôt (INPI)</span>
                                </li>
                                <li className="flex items-start gap-3 text-red-700 bg-white/50 p-3 rounded-2xl">
                                    <AlertTriangle size={18} className="mt-1 flex-shrink-0" />
                                    <span className="text-sm font-bold uppercase tracking-tight">Dilution totale de la valeur perçue</span>
                                </li>
                            </ul>
                        </div>
                        <div className="space-y-6">
                            <h3 className="text-2xl font-black text-zinc-900 uppercase">Le piège du bas prix</h3>
                            <p className="text-gray-500 leading-relaxed text-lg">
                                Beaucoup de fondateurs voient le logo comme une dépense à minimiser. C'est une erreur de débutant. Sur le plan légal, un logo générique doit présenter un caractère <strong>distinctif</strong> pour être protégé. Si votre icône est une "maison" standard ou une "feuille" vue mille fois, vous n'investissez pas dans un capital, vous jetez de l'argent dans un vide juridique.
                            </p>
                            <p className="text-gray-500 leading-relaxed text-lg">
                                Le cerveau humain traite les images 60 000 fois plus vite que le texte. Un logo à 50€ communique une valeur de 50€. Votre marque mérite mieux qu'un cliché boursouflé.
                            </p>
                        </div>
                    </div>

                    {/* Section 2: La preuve par l'absurde */}
                    <section className="bg-zinc-900 rounded-[3rem] p-12 md:p-20 text-white mb-20 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-orange-500 to-red-500"></div>
                        <div className="max-w-2xl">
                            <span className="text-orange-500 font-black uppercase tracking-widest text-[10px] mb-4 block">ANALYSE COMPARATIVE</span>
                            <h2 className="text-4xl md:text-6xl font-black mb-8 uppercase tracking-tighter leading-none">La preuve par l'absurde : <br /> <span className="text-zinc-500 italic">La coquille vide</span></h2>
                            <p className="text-gray-400 text-lg md:text-xl font-light leading-relaxed mb-12">
                                Regardez une icône banale — disons, un bouclier minimaliste ou trois lignes entrelacées. Placez tour à tour trois noms d'entreprises aux activités radicalement opposées dessous.
                            </p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12 bg-white/5 p-8 rounded-[2rem] border border-white/10 backdrop-blur-sm">
                            <div className="text-center p-6 rounded-2xl border border-white/5 bg-black/20">
                                <div className="w-16 h-16 mx-auto mb-6 bg-zinc-800 rounded-xl flex items-center justify-center border border-white/10 opacity-30">
                                    <HelpCircle size={32} />
                                </div>
                                <span className="font-black uppercase tracking-widest text-xs">Sécurit-Pro</span>
                            </div>
                            <div className="text-center p-6 rounded-2xl border border-white/5 bg-black/20">
                                <div className="w-16 h-16 mx-auto mb-6 bg-zinc-800 rounded-xl flex items-center justify-center border border-white/10 opacity-30">
                                    <HelpCircle size={32} />
                                </div>
                                <span className="font-black uppercase tracking-widest text-xs">Bio-Ferme</span>
                            </div>
                            <div className="text-center p-6 rounded-2xl border border-white/5 bg-black/20">
                                <div className="w-16 h-16 mx-auto mb-6 bg-zinc-800 rounded-xl flex items-center justify-center border border-white/10 opacity-30">
                                    <HelpCircle size={32} />
                                </div>
                                <span className="font-black uppercase tracking-widest text-xs">Invest-Global</span>
                            </div>
                        </div>
                        <p className="mt-12 text-zinc-500 text-sm font-medium italic">
                            Si un logo peut s'adapter à n'importe qui, il ne définit personne. C'est le niveau zéro de la stratégie de marque.
                        </p>
                    </section>

                    {/* Section 3: ADN Propriétaire */}
                    <div className="grid md:grid-cols-2 gap-16 mb-24 items-start">
                        <div>
                            <div className="flex items-center gap-4 mb-8">
                                <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-600">
                                    <Fingerprint size={24} />
                                </div>
                                <h2 className="text-3xl font-black text-zinc-900 uppercase tracking-tighter">3. L'ADN Propriétaire : <br /> Le symbole sur-mesure</h2>
                            </div>
                            <p className="text-gray-600 text-lg leading-relaxed mb-8">
                                Une véritable identité visuelle ne se choisit pas dans un catalogue ; elle s'extrait de l'essence même de l'organisation. La solution ? **L'ingénierie d'un monogramme propriétaire**.
                            </p>
                            <p className="text-gray-600 text-lg leading-relaxed mb-8">
                                Un monogramme sur-mesure fusionne les initiales de votre marque dans un symbole unique et indivisible. Ce processus verrouille le sens et rend toute copie évidente et impossible à s'approprier par un tiers.
                            </p>
                            <div className="bg-zinc-50 p-8 rounded-3xl border border-zinc-100">
                                <h4 className="font-black uppercase text-xs tracking-widest text-orange-600 mb-4">LES AVANTAGES CLÉS</h4>
                                <ul className="space-y-4 font-bold text-zinc-800 text-sm">
                                    <li className="flex items-center gap-3"><CheckCircle2 size={18} className="text-green-500" /> INDISOCIABILITÉ TOTALE</li>
                                    <li className="flex items-center gap-3"><CheckCircle2 size={18} className="text-green-500" /> MÉMORISATION CHIRURGICALE</li>
                                    <li className="flex items-center gap-3"><CheckCircle2 size={18} className="text-green-500" /> ACTIF IMMATÉRIEL VALORISABLE</li>
                                </ul>
                            </div>
                        </div>
                        <div className="relative">
                            <div className="aspect-square bg-gradient-to-br from-zinc-50 to-orange-50 rounded-[4rem] flex items-center justify-center border border-zinc-100 shadow-2xl relative group">
                                <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity rounded-[4rem]"></div>
                                <div className="text-center">
                                    <Award className="w-32 h-32 text-orange-500 mb-6 mx-auto" strokeWidth={1} />
                                    <span className="block font-black text-xl text-zinc-900 uppercase tracking-tighter">Design Propriétaire</span>
                                    <span className="block text-zinc-400 text-[10px] uppercase tracking-widest font-bold">Investissement Gagnant</span>
                                </div>
                            </div>
                            {/* Decorative element */}
                            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-orange-500/10 rounded-full blur-3xl -z-10 animate-pulse"></div>
                        </div>
                    </div>

                    {/* Conclusion & CTA */}
                    <section className="bg-zinc-900 rounded-[4rem] p-12 md:p-24 text-center text-white relative overflow-hidden shadow-2xl">
                        <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-orange-500/10 rounded-full -mr-[20rem] -mt-[20rem] blur-[100px] pointer-events-none"></div>
                        <div className="absolute bottom-0 left-0 w-[30rem] h-[30rem] bg-orange-600/5 rounded-full -ml-[15rem] -mb-[15rem] blur-[80px] pointer-events-none"></div>

                        <div className="relative z-10 max-w-3xl mx-auto">
                            <h2 className="text-4xl md:text-8xl font-black mb-10 tracking-tighter uppercase leading-[0.9]">
                                NE LAISSEZ PAS <br /> VOTRE MARQUE <br /> <span className="text-orange-500">S'ÉVAPORER.</span>
                            </h2>
                            <p className="text-gray-400 mb-16 text-lg md:text-2xl font-light leading-relaxed">
                                Le coût de l'inaction est la dilution totale de votre autorité sur le marché. Votre identité est votre actif le plus précieux. Possédez-le.
                            </p>
                            
                            <div className="bg-white/5 border border-white/10 p-1 rounded-[3rem] mb-12">
                                <div className="bg-orange-500 text-white p-8 md:p-12 rounded-[2.8rem] shadow-xl">
                                    <h3 className="text-3xl font-black mb-6 uppercase tracking-tight">AUDIT DE MARQUE PRIVÉ</h3>
                                    <p className="text-white/80 mb-10 font-bold">Évaluez la force juridique et stratégique de votre identité actuelle.</p>
                                    <button
                                        onClick={() => navigate('/contact')}
                                        className="bg-zinc-900 text-white font-black px-12 py-5 rounded-full hover:bg-black transition-all transform hover:scale-105 shadow-xl uppercase tracking-widest text-sm flex items-center gap-3 mx-auto"
                                    >
                                        Réserver mon audit <ArrowRight size={20} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default BlogBrandAsset;
