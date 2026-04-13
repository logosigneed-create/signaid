import React from 'react';

interface MobileBottomNavProps {
    activeView: string;
    onChangeView: (view: any) => void;
    cartCount: number;
    showPlusBadge?: boolean;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ activeView, onChangeView, cartCount, showPlusBadge }) => {

    // Helper for nav items
    const NavItem = ({ view, icon, label }: { view: string, icon: string, label: string }) => {
        const isActive = activeView === view;
        return (
            <button
                onClick={() => onChangeView(view)}
                className={`flex flex-col items-center justify-center w-full h-full gap-0.5 ${isActive ? 'text-orange-600' : 'text-gray-400 hover:text-gray-600'}`}
            >
                <i className={`${icon} ${isActive ? 'text-lg' : 'text-base'} transition-all`}></i>
                <span className="text-[9px] font-bold">{label}</span>
            </button>
        );
    };

    return (
        <div data-layout-id="mobile-bottom-nav" className="lg:hidden fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 z-[9999] px-2 h-[50px] flex items-center justify-between shadow-[0_-4px_10px_rgba(0,0,0,0.05)] safe-area-bottom">
            <NavItem view="feed" icon="fa-solid fa-house" label="Galerie" />
            <NavItem view="customizer" icon="fa-solid fa-shirt" label="Créer" />

            {/* WhatsApp Center Button */}
            {/* Chat Choice Button */}
            <div className="flex flex-col items-center justify-center w-full h-full">
                <button
                    onClick={() => window.dispatchEvent(new CustomEvent('openChatWidget'))}
                    className="flex flex-col items-center justify-center w-full h-full gap-0.5 text-gray-400 hover:text-orange-600"
                >
                    <i className="fa-solid fa-comment-dots text-lg"></i>
                    <span className="text-[9px] font-bold">Chat</span>
                </button>
            </div>

            <NavItem view="profile" icon="fa-solid fa-circle-user" label="Profil" />

            {/* Cart with Badge */}
            <button
                onClick={() => onChangeView('cart')}
                className={`flex flex-col items-center justify-center w-full h-full gap-0.5 relative ${activeView === 'cart' ? 'text-orange-600' : 'text-gray-400 hover:text-gray-600'}`}
            >
                <div className="relative">
                    <i className={`fa-solid fa-cart-shopping ${activeView === 'cart' ? 'text-lg' : 'text-base'} transition-all`}></i>
                    {cartCount > 0 && (
                        <span className="absolute -top-2 -right-3 bg-orange-600 text-white text-[8px] font-black min-w-[18px] h-4 flex items-center justify-center rounded-full border border-white px-1">
                            {showPlusBadge ? `+${cartCount}` : cartCount}
                        </span>
                    )}
                </div>
                <span className="text-[9px] font-bold">Panier</span>
            </button>
        </div>
    );
};
