import React from 'react';
import { Link } from 'react-router-dom';
import { Instagram, Linkedin, Heart } from 'lucide-react';

const Footer: React.FC = () => {
    const scrollToGuide = (e: React.MouseEvent) => {
        e.preventDefault();
        const el = document.getElementById('guide');
        if (el) {
            el.scrollIntoView({ behavior: 'smooth' });
        } else {
            // If not on landing page, navigate there first
            window.location.href = '/#guide';
        }
    };

    return (
        <footer className="bg-zinc-900 text-white pt-16 pb-24 lg:pb-8">
            <div className="max-w-6xl mx-auto px-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
                    <div className="col-span-1 md:col-span-2">
                        <div className="flex items-baseline gap-1 mb-6">
                            <span className="text-xl font-black bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">SIGNAID</span>
                        </div>
                        <p className="text-gray-400 max-w-sm mb-6">
                            La plateforme ultime pour fusionner mode et intelligence artificielle.
                            Créez, personnalisez et visualisez votre style unique en quelques clics.
                        </p>
                        <div className="flex gap-4">
                            <a href="https://www.instagram.com/nico_signaid/" target="_blank" rel="noopener noreferrer" className="p-2 bg-zinc-800 rounded-full hover:bg-brand-orange transition-colors"><Instagram size={20} /></a>
                            <a href="https://www.linkedin.com/in/nicolasdlogosigneed/" target="_blank" rel="noopener noreferrer" className="p-2 bg-zinc-800 rounded-full hover:bg-brand-orange transition-colors"><Linkedin size={20} /></a>
                        </div>
                    </div>

                    <div>
                        <h4 className="font-bold text-lg mb-4">Navigation</h4>
                        <ul className="space-y-2 text-gray-400">
                            <li><Link to="/creation" className="hover:text-white transition-colors">Le Studio</Link></li>
                             <li><Link to="/galerie" className="hover:text-white transition-colors">Nos Produits</Link></li>
                            <li><a href="/#guide" onClick={scrollToGuide} className="hover:text-white transition-colors">Guide d'utilisation</a></li>
                            <li><Link to="/contact" className="hover:text-white transition-colors">FAQ & Contact</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-bold text-lg mb-4">Légal</h4>
                        <ul className="space-y-2 text-gray-400">
                            <li><Link to="/conditions-generales" className="hover:text-white transition-colors">Conditions Générales</Link></li>
                            <li><Link to="/confidentialite" className="hover:text-white transition-colors">Confidentialité</Link></li>
                            <li><Link to="/cookies" className="hover:text-white transition-colors">Cookies</Link></li>
                        </ul>
                    </div>
                </div>

                <div className="border-t border-zinc-800 pt-8 flex flex-col md:flex-row justify-between items-center text-sm text-gray-500">
                    <p>© {new Date().getFullYear()} SIGNAID. Tous droits réservés.</p>
                    <p className="flex items-center gap-1 mt-2 md:mt-0">
                        Fait avec <Heart size={14} className="text-brand-orange fill-brand-orange" /> pour les créateurs
                    </p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
