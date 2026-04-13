import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DesktopNavbar } from './DesktopNavbar';
import { MobileNavbar } from './MobileNavbar';
import { UniversalMenu } from './UniversalMenu';
import Footer from './landing/Footer';
import { authService } from '../services/authService';
import { User } from '../types';
import { SEO } from './SEO';
import { ArrowRight, Clock, Calendar } from 'lucide-react';

export default function BlogIndex() {
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
            } catch (e) {
                console.error("Error parsing cart in BlogIndex:", e);
            }
        };
        updateCartCount();

        // Listen for storage changes in case cart is updated in other tabs
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

    const articles = [
        {
            id: 'ia-imprimerie',
            title: "L’IA au service de l’imprimerie",
            excerpt: "Pourquoi l’essayage virtuel est le futur en Wallonie : conversion et réalisme.",
            date: "1 Mars 2024",
            readTime: "5 min",
            category: "Innovation",
            image: "/assets/blog_model.jpg",
            path: "/blog/ia-imprimerie"
        },
        {
            id: 'analyse-geometrique',
            title: "Analyse Géométrique du Design",
            excerpt: "Comment les formes influencent le rendu de vos impressions sur textile.",
            date: "4 Mars 2024",
            readTime: "4 min",
            category: "Design",
            image: "/assets/blog_garment.png",
            path: "/blog/analyse-geometrique"
        },
        {
            id: 'style-accessible-vs-pro',
            title: "Accessible vs Pro : Quel design pour vos impressions ?",
            excerpt: "Faut-il choisir un design chargé et coloré ou une approche épurée et professionnelle ?",
            date: "5 Mars 2024",
            readTime: "6 min",
            category: "Design",
            image: "/assets/blog/blog_style_pro.jpg",
            path: "/blog/style-accessible-vs-pro"
        },
        {
            id: 'logo-generique-danger',
            title: "Le danger du logo générique : Une erreur stratégique",
            excerpt: "Pourquoi utiliser un logo pré-fait est un risque juridique et commercial pour votre capital marque.",
            date: "1 Avril 2024",
            readTime: "8 min",
            category: "Stratégie",
            image: "/assets/blog/blog_branding_risk.jpg", 
            path: "/blog/logo-generique-danger"
        }
    ];

    return (
        <div className="min-h-screen flex flex-col bg-white text-zinc-900 font-sans selection:bg-orange-500/20">
            <SEO
                title="Blog & Insights"
                description="Découvrez nos derniers articles sur l'imprimerie interactive, l'IA et le design textile."
                keywords="blog imprimerie, IA textile, design géométrique, Signaid club"
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

            <main className="flex-grow pt-20 md:pt-24 pb-24">
                <header className="max-w-6xl mx-auto px-6 py-16 md:py-24 text-center">
                    <span className="text-orange-600 font-black uppercase tracking-widest text-xs mb-4 block">INSIGHTS & INNOVATION</span>
                    <h1 className="text-5xl md:text-8xl font-black text-zinc-900 tracking-tighter leading-[0.9] uppercase mb-8">
                        LE BLOG <br /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-zinc-700 to-orange-500">SIGNAID.</span>
                    </h1>
                    <p className="text-xl text-zinc-500 max-w-2xl mx-auto font-light leading-relaxed">
                        Retrouvez nos analyses sur le futur de la personnalisation et les secrets d'un design réussi.
                    </p>
                </header>

                <div className="max-w-6xl mx-auto px-6">
                    <div className="grid md:grid-cols-2 gap-12">
                        {articles.map((article) => (
                            <div
                                key={article.id}
                                className="group cursor-pointer text-left"
                                onClick={() => navigate(article.path)}
                            >
                                <div className="aspect-video bg-zinc-100 rounded-[2.5rem] mb-8 overflow-hidden relative shadow-lg group-hover:shadow-orange-500/10 transition-all border border-zinc-50">
                                    <img src={article.image} alt={article.title} className="w-full h-full object-contain p-8 group-hover:scale-110 transition-transform duration-700" />
                                    <div className="absolute top-6 left-6 bg-orange-500 text-white text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-xl">{article.category}</div>
                                </div>
                                <h2 className="text-3xl font-black text-zinc-900 mb-4 uppercase tracking-tight group-hover:text-orange-500 transition-colors leading-none">{article.title}</h2>
                                <p className="text-zinc-500 text-lg leading-relaxed mb-6 font-light">{article.excerpt}</p>
                                <div className="flex items-center gap-6 text-zinc-400 text-xs font-bold uppercase tracking-widest mb-6">
                                    <span className="flex items-center gap-2"><Calendar size={14} /> {article.date}</span>
                                    <span className="flex items-center gap-2"><Clock size={14} /> {article.readTime}</span>
                                </div>
                                <span className="flex items-center gap-2 text-orange-500 font-black uppercase tracking-widest text-xs group-hover:gap-3 transition-all">Lire la suite <ArrowRight size={16} /></span>
                            </div>
                        ))}
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
