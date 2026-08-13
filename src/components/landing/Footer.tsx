import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, ChevronDown, ChevronUp } from 'lucide-react';

const InstagramIcon = ({ size = 20 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
    </svg>
);

const LinkedinIcon = ({ size = 20 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path>
        <rect x="2" y="9" width="4" height="12"></rect>
        <circle cx="4" cy="4" r="2"></circle>
    </svg>
);

const Footer: React.FC = () => {
    const [openSection, setOpenSection] = useState<string | null>(null);

    const toggleSection = (section: string) => {
        setOpenSection(openSection === section ? null : section);
    };

    const scrollToGuide = (e: React.MouseEvent) => {
        e.preventDefault();
        const el = document.getElementById('guide');
        if (el) {
            el.scrollIntoView({ behavior: 'smooth' });
        } else {
            window.location.href = '/#guide';
        }
    };

    return (
        <footer className="bg-zinc-900 text-white pt-12 pb-24 lg:pt-16 lg:pb-8 border-t border-zinc-800">
            <div className="max-w-6xl mx-auto px-4 lg:px-6">
                
                {/* DESKTOP GRID & MOBILE ACCORDIONS CONTAINER */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-12 mb-12">
                    
                    {/* BRANDING SECTION */}
                    <div className="col-span-1 lg:col-span-2">
                        <div className="flex items-baseline gap-1 mb-6">
                            <span className="text-2xl font-black bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent tracking-tighter uppercase">SIGNAID</span>
                        </div>
                        <p className="text-gray-400 max-w-sm mb-8 text-sm md:text-base leading-relaxed font-light">
                            La plateforme ultime pour fusionner mode et intelligence artificielle.
                            Créez, personnalisez et visualisez votre style unique en quelques clics.
                        </p>
                        
                        {/* SOCIAL LINKS - Kept as they are not in the main menu */}
                        <div className="flex gap-4 mb-10 lg:mb-0">
                            <a href="https://www.instagram.com/nico_signaid/" target="_blank" rel="noopener noreferrer" className="w-10 h-10 flex items-center justify-center bg-zinc-800 rounded-full hover:bg-orange-600 transition-all shadow-lg active:scale-90"><InstagramIcon size={20} /></a>
                            <a href="https://www.linkedin.com/in/nicolasdlogosigneed/" target="_blank" rel="noopener noreferrer" className="w-10 h-10 flex items-center justify-center bg-zinc-800 rounded-full hover:bg-orange-600 transition-all shadow-lg active:scale-90"><LinkedinIcon size={20} /></a>
                        </div>
                    </div>

                    {/* INTERACTIVE NAVIGATION (Accordion on Mobile, Grid on Desktop) */}
                    <div>
                        <button 
                            onClick={() => toggleSection('nav')}
                            className="w-full flex items-center justify-between lg:block lg:cursor-default py-4 lg:py-0 border-b border-zinc-800 lg:border-none group"
                        >
                            <h4 className="font-black text-lg lg:mb-4 uppercase tracking-wider group-active:text-orange-500 transition-colors">Navigation</h4>
                            <span className="lg:hidden">
                                {openSection === 'nav' ? <ChevronUp size={20} className="text-gray-500" /> : <ChevronDown size={20} className="text-gray-500" />}
                            </span>
                        </button>
                        
                        <ul className={`mt-4 lg:mt-0 space-y-3 text-gray-400 transition-all duration-300 overflow-hidden ${openSection === 'nav' ? 'max-h-60 opacity-100 mb-6' : 'max-h-0 lg:max-h-none opacity-0 lg:opacity-100'}`}>
                            <li><Link to="/creation" className="hover:text-white transition-colors block py-1">Le Studio</Link></li>
                            <li><Link to="/galerie" className="hover:text-white transition-colors block py-1">Nos Produits</Link></li>
                            <li><a href="/#guide" onClick={scrollToGuide} className="hover:text-white transition-colors block py-1">Guide d'utilisation</a></li>
                            <li><Link to="/contact" className="hover:text-white transition-colors block py-1">FAQ & Contact</Link></li>
                        </ul>
                    </div>

                    {/* INTERACTIVE LEGAL (Accordion on Mobile, Grid on Desktop) */}
                    <div>
                        <button 
                            onClick={() => toggleSection('legal')}
                            className="w-full flex items-center justify-between lg:block lg:cursor-default py-4 lg:py-0 border-b border-zinc-800 lg:border-none group"
                        >
                            <h4 className="font-black text-lg lg:mb-4 uppercase tracking-wider group-active:text-orange-500 transition-colors">Légal</h4>
                            <span className="lg:hidden">
                                {openSection === 'legal' ? <ChevronUp size={20} className="text-gray-500" /> : <ChevronDown size={20} className="text-gray-500" />}
                            </span>
                        </button>
                        
                        <ul className={`mt-4 lg:mt-0 space-y-3 text-gray-400 transition-all duration-300 overflow-hidden ${openSection === 'legal' ? 'max-h-60 opacity-100 mb-6' : 'max-h-0 lg:max-h-none opacity-0 lg:opacity-100'}`}>
                            <li><Link to="/conditions-generales" className="hover:text-white transition-colors block py-1">Conditions Générales</Link></li>
                            <li><Link to="/confidentialite" className="hover:text-white transition-colors block py-1">Confidentialité</Link></li>
                            <li><Link to="/cookies" className="hover:text-white transition-colors block py-1">Cookies</Link></li>
                        </ul>
                    </div>
                </div>

                {/* VITAL FOOTER ACTIONS & INFO */}
                <div className="flex flex-col lg:flex-row justify-between items-center gap-8 pt-8 border-t border-zinc-800 text-sm text-gray-500">
                    
                    {/* PRIMARY FOOTER CTA */}
                    <div className="w-full lg:w-auto order-1 lg:order-2">
                        <Link 
                            to="/creation?checkDraft=true" 
                            className="w-full lg:w-auto inline-flex items-center justify-center px-8 py-3 bg-white text-zinc-900 font-bold rounded-full hover:bg-gray-200 transition-all shadow-xl shadow-white/5 active:scale-95"
                        >
                            Commencer mon projet
                        </Link>
                    </div>

                    <div className="w-full lg:w-auto flex flex-col lg:flex-row items-center gap-4 order-2 lg:order-1 text-center lg:text-left">
                        <p className="font-medium tracking-tight">© {new Date().getFullYear()} SIGNAID. Tous droits réservés.</p>
                        <span className="hidden lg:inline text-zinc-700">•</span>
                        <p className="flex items-center gap-1">
                            Fait avec <Heart size={14} className="text-orange-500 fill-orange-500 mx-1" /> pour les créateurs
                        </p>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
