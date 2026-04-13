import React from 'react';

interface MobileNavbarProps {
    onMenuClick: () => void;
    onCartClick: () => void;
    cartCount: number;
}

export const MobileNavbar: React.FC<MobileNavbarProps> = ({ onMenuClick, onCartClick, cartCount }) => {
    return (
        <div data-layout-id="mobile-navbar" className="hidden w-full h-16 bg-white border-t border-gray-200 flex items-center justify-between shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] px-6 relative pointer-events-auto">
            {/* LEFT: Hamburger + Logo */}
            <div className="flex items-center gap-3">
                <button data-layout-id="mobile-nav-menu-btn" onClick={onMenuClick} className="text-gray-900 hover:text-orange-500 text-xl">
                    <i className="fa-solid fa-bars"></i>
                </button>
                {/* Logo / Brand Name could go here if needed */}
                <span className="text-xl font-black bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent transform -skew-x-6 cursor-pointer uppercase" onClick={() => window.location.href = '/'}>signaid</span>
            </div>

            {/* CENTER: User Indicator (Optional) - using existing structure relative to code */}

            {/* RIGHT: Cart */}
            <button data-layout-id="mobile-nav-cart-btn" onClick={onCartClick} className="relative text-gray-900 hover:text-orange-500">
                <i className="fa-solid fa-cart-shopping text-xl"></i>
                {cartCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-orange-600 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white">
                        {cartCount}
                    </span>
                )}
            </button>
        </div>
    );
};
