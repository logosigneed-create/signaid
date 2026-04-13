import React from 'react';
import { Link, useLocation } from 'react-router-dom';

interface MobileNavbarProps {
    onMenuClick: () => void;
    onCartClick: () => void;
    cartCount: number;
}

export const MobileNavbar: React.FC<MobileNavbarProps> = ({ onCartClick, cartCount }) => {
    const [isMenuOpen, setIsMenuOpen] = React.useState(false);
    const location = useLocation();

    const navLinks = [
        { to: '/', label: 'Accueil' },
        { to: '/creation', label: 'Création' },
        { to: '/galerie', label: 'Galerie' },
        { to: '/contact', label: 'Contact' },
        { to: '/profil', label: 'Profil' },
    ];

    return (
        <div data-layout-id="mobile-navbar" className="fixed top-0 left-0 w-full h-16 bg-white border-b border-gray-200 z-[9999] flex items-center justify-between px-4">
            
            {/* LEFT: Logo / Name */}
            <div data-layout-id="mobile-nav-logo" className="z-10 cursor-pointer flex items-center" onClick={() => window.location.href = '/'}>
                <img src="/logo.png" className="h-6 w-auto mr-2" alt="Signaid" />
                <span className="text-lg font-bold tracking-tighter text-gray-500 uppercase">SIGNAID</span>
            </div>

            {/* CENTER: Hamburger Menu (Absolute - Custom 3-Bar) */}
            <button 
                data-layout-id="mobile-nav-menu-btn" 
                onClick={() => setIsMenuOpen(true)} 
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1 w-12 h-12 justify-center rounded-full bg-gray-50 active:scale-95 transition-transform shadow-sm border border-gray-100"
                aria-label="Menu"
            >
                <div className="w-3 h-0.5 bg-gray-900 rounded"></div>
                <div className="w-6 h-0.5 bg-gray-900 rounded"></div>
                <div className="w-3 h-0.5 bg-gray-900 rounded"></div>
            </button>

            {/* RIGHT: Cart (Discreet but balanced) */}
            <div className="z-10 flex items-center justify-center w-11 h-11 relative cursor-pointer" onClick={onCartClick}>
                 <i className="fa-solid fa-cart-shopping text-xl text-gray-400"></i>
                 {cartCount > 0 && (
                    <span className="absolute top-1 right-1 bg-orange-600 text-white text-[9px] font-black w-4 h-4 flex items-center justify-center rounded-full border border-white">
                        {cartCount}
                    </span>
                 )}
            </div>

            {/* NAVIGATION OVERLAY (Full Screen) */}
            {isMenuOpen && (
                <div className="fixed inset-0 bg-white z-[10000] flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-300">
                    
                    {/* CLOSE BUTTON (Centered at top like Hamburger) */}
                    <button 
                        onClick={() => setIsMenuOpen(false)} 
                        className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-12 flex items-center justify-center bg-gray-900 text-white rounded-full shadow-xl active:scale-90 transition-transform"
                    >
                        <i className="fa-solid fa-xmark text-xl"></i>
                    </button>

                    <nav className="flex flex-col items-center justify-center space-y-10">
                        {navLinks.map((link) => {
                            const isActive = location.pathname === link.to;
                            return (
                                <Link 
                                    key={link.to}
                                    to={link.to} 
                                    onClick={() => setIsMenuOpen(false)}
                                    className={`text-4xl uppercase tracking-[0.2em] transition-all duration-300 ${
                                        isActive 
                                        ? 'text-orange-600 font-extrabold scale-110' 
                                        : 'text-gray-400 font-medium hover:text-gray-900'
                                    }`}
                                >
                                    {link.label}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Logo at bottom of menu for branding */}
                    <div className="absolute bottom-12 opacity-20">
                        <span className="text-xl font-black tracking-widest text-gray-900">SIGNAID</span>
                    </div>
                </div>
            )}
        </div>
    );
};
