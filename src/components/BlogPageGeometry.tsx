import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DesktopNavbar } from './DesktopNavbar';
import { MobileNavbar } from './MobileNavbar';
import { UniversalMenu } from './UniversalMenu';
import Footer from './landing/Footer';
import { authService } from '../services/authService';
import { User } from '../types';
import { SEO } from './SEO';
import { Doughnut, Bar } from 'react-chartjs-2';
import { ArrowRight, ChevronLeft } from 'lucide-react';
import {
    Chart as ChartJS,
    ArcElement,
    Tooltip,
    Legend,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
} from 'chart.js';

ChartJS.register(
    ArcElement,
    Tooltip,
    Legend,
    CategoryScale,
    LinearScale,
    BarElement,
    Title
);

const BlogPageGeometry: React.FC = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState<User | null>(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [cartCount, setCartCount] = useState(0);
    const [suitabilityType, setSuitabilityType] = useState<'tshirt' | 'pull'>('tshirt');

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
        else if (view === 'blog') navigate('/blog');
        else if (view === 'contact') navigate('/contact');
    };

    const popularityData = {
        labels: ['Cercle', 'Carré', 'Triangle', 'Losange', 'Autres'],
        datasets: [{
            data: [35, 30, 15, 10, 10],
            backgroundColor: [
                '#f97316', // orange-500
                '#18181b', // zinc-900
                '#ea580c', // orange-600
                '#fb923c', // orange-400
                '#d4d4d8'  // zinc-300
            ],
            borderWidth: 2,
            borderColor: '#ffffff'
        }]
    };

    const suitabilityContent = {
        'tshirt': "Sur un <strong>T-shirt</strong>, les formes organiques (cercles) et dynamiques (triangles) performent le mieux car elles accompagnent le mouvement naturel du tissu. Les gros blocs carrés peuvent paraître rigides et inconfortables (effet 'placard').",
        'pull': "Sur un <strong>Pull ou Sweat</strong>, l'épaisseur du tissu (molleton) et la présence éventuelle d'une poche kangourou favorisent des structures fortes. Les Carrés et Rectangles dominent, apportant une assise visuelle qui compense le volume du vêtement."
    };

    const suitabilityDataSets: Record<'tshirt' | 'pull', { data: number[], backgroundColor: string, borderColor: string }> = {
        'tshirt': {
            data: [85, 45, 75, 60, 90],
            backgroundColor: 'rgba(249, 115, 22, 0.7)', // orange-500/70
            borderColor: 'rgb(249, 115, 22)'
        },
        'pull': {
            data: [50, 95, 65, 80, 40],
            backgroundColor: 'rgba(24, 24, 27, 0.8)', // zinc-900/80
            borderColor: 'rgb(24, 24, 27)'
        }
    };

    const suitabilityData = {
        labels: ['Cercle / Ovale', 'Carré / Rectangle', 'Triangle', 'Losange', 'Forme Organique'],
        datasets: [{
            label: `Score de Pertinence (${suitabilityType === 'tshirt' ? 'T-shirt' : 'Pull'})`,
            data: suitabilityDataSets[suitabilityType].data,
            backgroundColor: suitabilityDataSets[suitabilityType].backgroundColor,
            borderColor: suitabilityDataSets[suitabilityType].borderColor,
            borderWidth: 1,
            borderRadius: 6
        }]
    };

    return (
        <div className="min-h-screen flex flex-col bg-zinc-50 text-zinc-900 antialiased selection:bg-orange-500/20 font-sans">
            <SEO
                title="Analyse Géométrique du Design Textile"
                description="Décryptage de l'impact des formes (cercle, carré, triangle) sur le design textile. Rapport interactif pour optimiser vos créations."
                keywords="géométrie textile, design vêtement, analyse graphique, SIGNEED blog, ergonomie visuelle"
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
                {/* Header Section */}
                <header className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 text-left">
                    <button
                        onClick={() => navigate('/blog')}
                        className="flex items-center gap-2 text-zinc-400 hover:text-orange-500 font-bold mb-8 transition-colors uppercase tracking-widest text-xs"
                    >
                        <ChevronLeft size={16} /> Retour au Blog
                    </button>
                    <h1 className="text-4xl md:text-7xl font-black text-zinc-900 leading-tight mb-6 uppercase tracking-tighter">
                        Analyse Géométrique du <br /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-zinc-700 to-orange-500">Design Imprimé Textile</span>
                    </h1>
                    <p className="text-lg md:text-xl text-zinc-500 max-w-3xl leading-relaxed font-light">
                        Ce rapport interactif décrypte l'impact des formes globales (carré, triangle, losange, cercle) sur les vêtements.
                        Découvrez quelles silhouettes graphiques performent le mieux selon le type de support et leur positionnement.
                    </p>
                </header>

                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-24">
                    {/* Section 1: Popularité Globale */}
                    <section id="popularite" className="scroll-mt-20">
                        <div className="mb-8 border-l-4 border-orange-500 pl-6">
                            <h2 className="text-3xl font-black text-zinc-900 mb-4 uppercase tracking-tight">Tendances et Popularité des Formes</h2>
                            <p className="text-zinc-500 text-lg max-w-4xl font-light">
                                Cette section analyse la répartition globale des formes sur le marché.
                                Interagissez avec le graphique pour isoler des segments spécifiques.
                            </p>
                        </div>

                        <div className="bg-white rounded-3xl shadow-xl shadow-zinc-200/50 border border-zinc-100 p-6 md:p-12 flex flex-col md:flex-row items-center gap-12">
                            <div className="w-full md:w-1/2">
                                <div className="h-[300px] md:h-[400px] max-w-md mx-auto relative">
                                    <Doughnut
                                        data={popularityData}
                                        options={{
                                            responsive: true,
                                            maintainAspectRatio: false,
                                            cutout: '65%',
                                            plugins: {
                                                legend: {
                                                    position: 'bottom',
                                                    labels: { padding: 20, font: { family: 'Inter', size: 13, weight: 'bold' } }
                                                },
                                                tooltip: {
                                                    backgroundColor: 'rgba(24, 24, 27, 0.95)',
                                                    padding: 12,
                                                    cornerRadius: 12,
                                                }
                                            }
                                        }}
                                    />
                                </div>
                            </div>
                            <div className="w-full md:w-1/2 space-y-6 text-left">
                                <div className="p-6 bg-zinc-50 rounded-2xl border border-zinc-100 group hover:border-orange-200 transition-colors">
                                    <div className="flex items-center gap-4 mb-2">
                                        <div className="w-8 h-8 rounded-full bg-orange-500 shrink-0 shadow-lg shadow-orange-500/20"></div>
                                        <h3 className="font-black text-zinc-900 text-lg uppercase tracking-tight">Le Cercle / Ovale (35%)</h3>
                                    </div>
                                    <p className="text-sm text-zinc-500 leading-relaxed">Le format le plus universel. Souvent utilisé pour les logos "badge". Il adoucit la silhouette et s'intègre naturellement à la morphologie.</p>
                                </div>

                                <div className="p-6 bg-zinc-50 rounded-2xl border border-zinc-100 group hover:border-zinc-300 transition-colors">
                                    <div className="flex items-center gap-4 mb-2">
                                        <div className="w-8 h-8 bg-zinc-900 shrink-0 shadow-lg shadow-zinc-900/20"></div>
                                        <h3 className="font-black text-zinc-900 text-lg uppercase tracking-tight">Le Carré / Rectangle (30%)</h3>
                                    </div>
                                    <p className="text-sm text-zinc-500 leading-relaxed">Le standard pour la photographie et les designs "block". Il impose une structure forte, idéale pour le streetwear.</p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100 flex flex-col items-center text-center">
                                        <div className="w-0 h-0 border-l-[1rem] border-r-[1rem] border-b-[1.75rem] border-transparent border-b-orange-600 mb-3 shadow-orange-600/10"></div>
                                        <h3 className="font-black text-zinc-900 text-sm uppercase">Triangle (15%)</h3>
                                    </div>
                                    <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100 flex flex-col items-center text-center">
                                        <div className="w-6 h-6 bg-orange-400 rotate-45 mb-3 shadow-orange-400/10"></div>
                                        <h3 className="font-black text-zinc-900 text-sm uppercase">Losange (10%)</h3>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Section 2: Adaptation au type de vêtement */}
                    <section id="adaptation" className="scroll-mt-20">
                        <div className="mb-8 border-l-4 border-orange-500 pl-6">
                            <h2 className="text-3xl font-black text-zinc-900 mb-4 uppercase tracking-tight">Analyse par Type de Vêtement</h2>
                            <p className="text-zinc-500 text-lg max-w-4xl font-light">
                                Une forme qui fonctionne sur un t-shirt fluide peut paraître déséquilibrée sur un sweat à capuche lourd.
                            </p>
                        </div>

                        <div className="bg-white rounded-3xl shadow-xl shadow-zinc-200/50 border border-zinc-100 p-6 md:p-12">
                            <div className="flex flex-wrap gap-4 mb-8 justify-center border-b border-zinc-100 pb-8">
                                <button
                                    onClick={() => setSuitabilityType('tshirt')}
                                    className={`px-8 py-3 rounded-full font-black uppercase tracking-widest text-xs transition-all duration-300 border ${suitabilityType === 'tshirt' ? 'bg-orange-500 text-white border-orange-500 shadow-lg shadow-orange-500/30 scale-105' : 'bg-transparent text-zinc-400 border-zinc-200 hover:border-orange-500 hover:text-orange-500'}`}
                                >
                                    T-Shirt
                                </button>
                                <button
                                    onClick={() => setSuitabilityType('pull')}
                                    className={`px-8 py-3 rounded-full font-black uppercase tracking-widest text-xs transition-all duration-300 border ${suitabilityType === 'pull' ? 'bg-zinc-900 text-white border-zinc-900 shadow-lg shadow-zinc-900/30 scale-105' : 'bg-transparent text-zinc-400 border-zinc-200 hover:border-zinc-900 hover:text-zinc-900'}`}
                                >
                                    Pull / Sweat
                                </button>
                            </div>

                            <div className="text-center mb-12 max-w-2xl mx-auto text-zinc-500 leading-relaxed font-light text-lg" dangerouslySetInnerHTML={{ __html: suitabilityContent[suitabilityType] }}></div>

                            <div className="h-[300px] md:h-[450px] max-w-3xl mx-auto relative px-2">
                                <Bar
                                    data={suitabilityData}
                                    options={{
                                        responsive: true,
                                        maintainAspectRatio: false,
                                        scales: {
                                            y: {
                                                beginAtZero: true,
                                                max: 100,
                                                grid: { color: '#f4f4f5', borderDash: [5, 5] } as any
                                            },
                                            x: { grid: { display: false } }
                                        },
                                        plugins: {
                                            legend: { display: false },
                                            tooltip: {
                                                backgroundColor: 'rgba(24, 24, 27, 0.95)',
                                                padding: 12,
                                                cornerRadius: 12,
                                            }
                                        }
                                    }}
                                />
                            </div>
                        </div>
                    </section>

                    {/* Section 3: Placement - Avant vs Arrière */}
                    <section id="placement" className="scroll-mt-20">
                        <div className="mb-8 border-l-4 border-orange-500 pl-6">
                            <h2 className="text-3xl font-black text-zinc-900 mb-4 uppercase tracking-tight">Stratégie de Placement</h2>
                            <p className="text-zinc-500 text-lg max-w-4xl font-light">
                                L'emplacement du design dicte les règles de composition géométrique.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                            {/* Card Avant */}
                            <div className="bg-white border border-zinc-100 rounded-3xl overflow-hidden shadow-xl shadow-zinc-200/30 hover:shadow-orange-500/10 transition-shadow group text-left">
                                <div className="bg-zinc-50 p-8 border-b border-zinc-100 flex justify-center items-center h-72 relative">
                                    <div className="w-48 h-56 bg-white border-2 border-zinc-200 rounded-t-xl rounded-b-md relative flex justify-center shadow-sm">
                                        <div className="w-20 h-8 border-b-2 border-x-2 border-zinc-200 rounded-b-full absolute top-0 bg-zinc-50"></div>
                                        <div className="absolute top-12 left-6 w-6 h-6 rounded-full bg-orange-500 group-hover:scale-125 transition-transform shadow-lg shadow-orange-500/20"></div>
                                        <div className="absolute top-24 w-28 h-8 bg-zinc-100 rounded border border-zinc-200 group-hover:bg-orange-100 group-hover:border-orange-200 transition-colors"></div>
                                    </div>
                                </div>
                                <div className="p-8">
                                    <h3 className="text-2xl font-black text-zinc-900 mb-6 uppercase tracking-tight">Avant (Front)</h3>
                                    <ul className="space-y-6 text-sm">
                                        <li className="flex items-start">
                                            <div className="w-8 h-8 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center mr-4 flex-shrink-0 font-black">1</div>
                                            <div>
                                                <strong className="block text-zinc-900 uppercase text-xs mb-1 tracking-widest">Cœur / Poitrine Gauche :</strong>
                                                <span className="text-zinc-500 leading-relaxed">Les <strong>Cercles</strong> ou petits <strong>Losanges</strong> sont idéaux. Ils simulent un blason.</span>
                                            </div>
                                        </li>
                                        <li className="flex items-start">
                                            <div className="w-8 h-8 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center mr-4 flex-shrink-0 font-black">2</div>
                                            <div>
                                                <strong className="block text-zinc-900 uppercase text-xs mb-1 tracking-widest">Centre Poitrine :</strong>
                                                <span className="text-zinc-500 leading-relaxed">Les <strong>Rectangles horizontaux</strong> ou les <strong>Triangles</strong>. Évitez les blocs massifs.</span>
                                            </div>
                                        </li>
                                    </ul>
                                </div>
                            </div>

                            {/* Card Arrière */}
                            <div className="bg-white border border-zinc-100 rounded-3xl overflow-hidden shadow-xl shadow-zinc-200/30 hover:shadow-orange-500/10 transition-shadow group text-left">
                                <div className="bg-zinc-50 p-8 border-b border-zinc-100 flex justify-center items-center h-72 relative">
                                    <div className="w-48 h-56 bg-white border-2 border-zinc-200 rounded-t-xl rounded-b-md relative flex justify-center shadow-sm">
                                        <div className="w-20 h-3 border-b-2 border-zinc-200 absolute top-0 bg-zinc-100"></div>
                                        <div className="absolute top-10 w-32 h-36 bg-zinc-900 rounded-xl group-hover:scale-105 transition-transform flex items-center justify-center shadow-2xl shadow-zinc-900/40">
                                            <div className="w-24 h-24 border-2 border-white/10 rounded-full flex items-center justify-center text-white">
                                                <div className="w-0 h-0 border-l-[0.5rem] border-r-[0.5rem] border-b-[0.93rem] border-transparent border-b-orange-500 scale-150"></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-8">
                                    <h3 className="text-2xl font-black text-zinc-900 mb-6 uppercase tracking-tight">Arrière (Back)</h3>
                                    <ul className="space-y-6 text-sm">
                                        <li className="flex items-start">
                                            <div className="w-8 h-8 rounded-full bg-zinc-100 text-zinc-900 flex items-center justify-center mr-4 flex-shrink-0 font-black">1</div>
                                            <div>
                                                <strong className="block text-zinc-900 uppercase text-xs mb-1 tracking-widest">Le Dos Complet :</strong>
                                                <span className="text-zinc-500 leading-relaxed">Règne absolu du <strong>Carré</strong> et du <strong>Rectangle vertical</strong>. Profitez de la surface plane.</span>
                                            </div>
                                        </li>
                                        <li className="flex items-start">
                                            <div className="w-8 h-8 rounded-full bg-zinc-100 text-zinc-900 flex items-center justify-center mr-4 flex-shrink-0 font-black">2</div>
                                            <div>
                                                <strong className="block text-zinc-900 uppercase text-xs mb-1 tracking-widest">Haut du dos (nuque) :</strong>
                                                <span className="text-zinc-500 leading-relaxed text-sm">Parfait pour des formes inversées (Triangle bas) ou petits Losanges.</span>
                                            </div>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* OTHER ARTICLES SECTION */}
                    <section className="py-24 border-t border-zinc-100">
                        <div className="flex justify-between items-end mb-16">
                            <h3 className="text-4xl font-black text-zinc-900 uppercase tracking-tighter text-left leading-none">D'autres articles <span className="text-orange-500">intéressants</span></h3>
                            <button onClick={() => navigate('/blog')} className="hidden md:flex items-center gap-2 text-orange-500 font-black uppercase tracking-widest text-xs border-b-2 border-orange-500 pb-1">Voir tout</button>
                        </div>
                        <div className="grid md:grid-cols-2 gap-12 text-left">
                            <div
                                className="group cursor-pointer text-left"
                                onClick={() => navigate('/blog/ia-imprimerie')}
                            >
                                <div className="aspect-video bg-zinc-200 rounded-[2rem] mb-8 overflow-hidden relative shadow-lg group-hover:shadow-orange-500/10 transition-all">
                                    <img src="/assets/blog_model.jpg" alt="IA Impression" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                    <div className="absolute top-6 left-6 bg-orange-500 text-white text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-xl">Innovation</div>
                                </div>
                                <h4 className="text-2xl font-black text-zinc-900 mb-4 uppercase tracking-tight group-hover:text-orange-500 transition-colors">L’IA au service de l’imprimerie</h4>
                                <p className="text-zinc-500 text-sm leading-relaxed mb-6 line-clamp-2">Pourquoi l’essayage virtuel est le futur en Wallonie : conversion et réalisme.</p>
                                <span className="flex items-center gap-2 text-orange-500 font-black uppercase tracking-widest text-[10px] group-hover:gap-3 transition-all">Lire l'article <ArrowRight size={14} /></span>
                            </div>
                        </div>
                    </section>

                    {/* CTA SECTION */}
                    <section className="bg-zinc-950 rounded-[3rem] p-10 md:p-20 text-center text-white relative overflow-hidden shadow-2xl">
                        <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-orange-500/10 rounded-full -mr-[20rem] -mt-[20rem] blur-[120px] pointer-events-none"></div>
                        <div className="relative z-10">
                            <h2 className="text-4xl md:text-7xl font-black mb-10 tracking-tighter uppercase leading-[0.9]">Prêt à créer <br /> <span className="text-orange-500">l'exceptionnel ?</span></h2>
                            <button
                                onClick={() => navigate('/creation')}
                                className="bg-orange-500 text-white font-black px-12 py-5 rounded-full hover:bg-orange-400 transition-all transform hover:scale-105 shadow-2xl shadow-orange-500/20 uppercase tracking-widest text-sm"
                            >
                                Commencer mon design
                            </button>
                        </div>
                    </section>
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default BlogPageGeometry;
