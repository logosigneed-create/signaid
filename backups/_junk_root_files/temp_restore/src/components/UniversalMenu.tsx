import React from 'react';
import { useNavigate } from 'react-router-dom';

interface UniversalMenuProps {
    isOpen: boolean;
    onClose: () => void;
    onNavigate: (view: string) => void;
    user: any;
    activePage: string;
}

export function UniversalMenu({ isOpen, onClose, onNavigate, user, activePage }: UniversalMenuProps) {

    if (!isOpen) return null;

    const getItemClass = (pageName: string) => {
        const isActive = activePage === pageName;
        return `text-3xl md:text-4xl font-black transition-transform uppercase tracking-tighter ${isActive ? 'text-orange-500 scale-110' : 'text-white hover:text-orange-500 hover:scale-110'}`;
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center animate-fade-in">
            <button onClick={onClose} className="absolute top-6 right-6 text-white hover:text-gray-300 text-3xl transition-colors p-4">
                <i className="fa-solid fa-xmark"></i>
            </button>
            <nav className="flex flex-col gap-4 md:gap-8 text-center max-h-[80vh] overflow-y-auto">
                <button
                    onClick={() => { onClose(); onNavigate('customizer'); }}
                    className={getItemClass('customizer')}
                >
                    Créer
                </button>
                <button
                    onClick={() => { onClose(); onNavigate('profile'); }}
                    className={getItemClass('profile')}
                >
                    Profil
                </button>
                <button
                    onClick={() => { onClose(); onNavigate('rewards'); }}
                    className={getItemClass('rewards')}
                >
                    Récompenses
                </button>
                <button
                    onClick={() => { onClose(); onNavigate('cart'); }}
                    className={getItemClass('cart')}
                >
                    Panier
                </button>
                <button
                    onClick={() => { onClose(); onNavigate('feed'); }}
                    className={`text-xl md:text-2xl font-bold mt-2 md:mt-4 transition-colors uppercase tracking-widest ${activePage === 'feed' ? 'text-orange-500' : 'text-gray-400 hover:text-orange-500'}`}
                >
                    Galerie
                </button>
                <button
                    onClick={() => { onClose(); onNavigate('contact'); }}
                    className={getItemClass('contact')}
                >
                    Contact
                </button>
                <a
                    href="/"
                    className="text-lg md:text-xl font-medium text-gray-500 hover:text-orange-500 mt-4 md:mt-8 transition-colors uppercase tracking-widest border-b border-transparent hover:border-white pb-2"
                >
                    Instruction
                </a>
            </nav>
        </div>
    );
};
