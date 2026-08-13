import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ShieldCheck, Zap } from 'lucide-react';
import { SEO } from './components/SEO';

const LandingPage: React.FC = () => {
    const navigate = useNavigate();

    const handleStart = () => {
        // Redirection vers le flux technique BTP
        navigate('/btp-audit');
    };

    return (
        <div className="min-h-screen bg-[#111111] text-white font-sans selection:bg-orange-500/30 overflow-x-hidden uppercase">
            <SEO 
                title="Signaid | Audit d'Autorité BTP"
                description="Auditez votre logo gratuitement. Transformez l'image de vos équipes de chantier en 60 secondes."
            />

            {/* SECTION 1 : LE HOOK (HERO) */}
            <section className="relative min-h-screen flex flex-col items-center justify-center px-4 py-20 border-b-8 border-orange-600">
                {/* Background Texture Overlay */}
                <div className="absolute inset-0 opacity-10 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/asphalt-dark.png')]"></div>
                
                <div className="max-w-5xl mx-auto text-center relative z-10">
                    <div className="inline-block bg-orange-600 text-black font-black px-4 py-1 mb-8 uppercase tracking-[0.2em] text-sm skew-x-[-10deg]">
                        Système Propriétaire Signaid
                    </div>
                    
                    <h1 className="text-5xl md:text-8xl font-black tracking-tighter leading-[0.9] mb-10 uppercase italic text-white">
                        Votre image sur chantier <br />
                        <span className="text-orange-500">vous fait-elle perdre des contrats ?</span>
                    </h1>

                    <p className="text-xl md:text-3xl text-gray-400 font-bold max-w-3xl mx-auto leading-tight mb-14 uppercase">
                        80% des PME du bâtiment utilisent des logos amateurs. Transformez l'image de vos équipes en 60 secondes et <span className="text-white underline decoration-orange-600 underline-offset-8">imposez votre autorité</span>.
                    </p>

                    <button 
                        onClick={handleStart}
                        className="group relative inline-flex items-center justify-center px-12 py-8 bg-orange-600 text-black font-black text-2xl md:text-4xl uppercase tracking-tighter hover:bg-white transition-all duration-300 shadow-[0_20px_50px_rgba(249,115,22,0.3)] active:scale-95"
                    >
                        Auditez votre logo gratuitement
                        <ArrowRight className="ml-4 group-hover:translate-x-2 transition-transform" size={32} />
                    </button>
                    
                    <div className="mt-12 flex items-center justify-center gap-6 text-gray-500 font-bold uppercase text-xs tracking-widest">
                        <span className="flex items-center gap-2 text-gray-500"><ShieldCheck size={16} /> RGPD Compliant</span>
                        <span className="flex items-center gap-2 text-gray-500"><Zap size={16} /> Rapport Instantané</span>
                    </div>
                </div>
            </section>

            {/* SECTION 2 : LA PREUVE RAPIDE */}
            <section className="py-24 bg-[#1a1a1a] px-4">
                <div className="max-w-6xl mx-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                        <div className="space-y-12 text-left">
                            <h2 className="text-4xl md:text-5xl font-black uppercase italic tracking-tighter border-l-8 border-orange-600 pl-6 text-white">
                                Le Système <span className="text-orange-500 text-6xl block">Signaid</span>
                            </h2>
                            
                            <div className="space-y-8">
                                <div className="flex gap-6 items-start">
                                    <div className="bg-white text-black w-10 h-10 flex items-center justify-center font-black text-xl flex-shrink-0">1</div>
                                    <p className="text-xl font-bold text-gray-300 uppercase leading-none pt-2 text-left">Vous uploadez votre fichier actuel (même de mauvaise qualité).</p>
                                </div>
                                <div className="flex gap-6 items-start">
                                    <div className="bg-white text-black w-10 h-10 flex items-center justify-center font-black text-xl flex-shrink-0">2</div>
                                    <p className="text-xl font-bold text-gray-300 uppercase leading-none pt-2 text-left">Notre moteur nettoie et optimise pour la haute densité.</p>
                                </div>
                                <div className="flex gap-6 items-start">
                                    <div className="bg-orange-600 text-black w-10 h-10 flex items-center justify-center font-black text-xl flex-shrink-0">3</div>
                                    <p className="text-xl font-bold text-white uppercase leading-none pt-2 text-left">Vous visualisez votre équipement premium prêt pour le terrain.</p>
                                </div>
                            </div>
                        </div>

                        {/* PLACEHOLDER VIDÉO */}
                        <div className="relative aspect-video bg-black border-4 border-zinc-800 flex items-center justify-center group overflow-hidden shadow-2xl">
                            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1541888946425-d81bb19480c5?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80')] bg-cover bg-center grayscale opacity-40"></div>
                            <div className="relative z-10 text-center">
                                <div className="w-20 h-20 bg-orange-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform cursor-pointer shadow-lg outline outline-offset-4 outline-orange-600/30">
                                    <div className="w-0 h-0 border-t-[10px] border-t-transparent border-l-[18px] border-l-black border-b-[10px] border-b-transparent ml-1"></div>
                                </div>
                                <span className="text-white font-black uppercase tracking-widest text-xs">Démo Système (15s)</span>
                            </div>
                            {/* SCANNER EFFECT ANIMATION PREVIEW */}
                            <div className="absolute top-0 left-0 w-full h-1 bg-orange-500 shadow-[0_0_15px_#f97316] animate-scan pointer-events-none"></div>
                        </div>
                    </div>
                </div>
            </section>

            {/* SECTION 3 : LE RAPPEL DU CTA */}
            <section className="py-32 px-4 bg-black text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
                
                <div className="relative z-10 max-w-4xl mx-auto text-center">
                    <h2 className="text-5xl md:text-7xl font-black uppercase italic mb-12 tracking-tighter leading-none">
                        Prêt à passer <br />
                        <span className="text-orange-500">en mode premium ?</span>
                    </h2>
                    
                    <button 
                        onClick={handleStart}
                        className="group relative inline-flex items-center justify-center px-12 py-8 bg-white text-black font-black text-2xl md:text-4xl uppercase tracking-tighter hover:bg-orange-600 hover:text-white transition-all duration-300 shadow-2xl active:scale-95"
                    >
                        Démarrer l'audit gratuit
                        <Zap className="ml-4 fill-current" size={32} />
                    </button>
                    
                    <p className="mt-8 text-zinc-600 font-bold uppercase tracking-[0.3em] text-xs">
                        Aucune carte bancaire requise • Résultat en 60s
                    </p>
                </div>
            </section>
            
            {/* FOOTER SIMPLE */}
            <footer className="py-12 bg-[#0a0a0a] border-t border-zinc-900 px-4 text-center space-y-4">
                <p className="text-zinc-700 font-black uppercase tracking-widest text-[10px]">
                    © {new Date().getFullYear()} SIGNAID BTP • SOLUTIONS D'IDENTIFICATION POUR LE BÂTIMENT
                </p>
                <div className="flex justify-center gap-8">
                    <button onClick={() => navigate('/portal')} className="text-zinc-600 hover:text-orange-600 transition-colors font-black text-[10px] uppercase tracking-widest">Accès Portail</button>
                    <button onClick={() => navigate('/btp-audit')} className="text-zinc-600 hover:text-orange-600 transition-colors font-black text-[10px] uppercase tracking-widest">Audit Instantané</button>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
