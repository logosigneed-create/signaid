import React from 'react';

interface MobileNavbarProps {
    onMenuClick: () => void;
    onCartClick: () => void;
    cartCount: number;
}

export const MobileNavbar: React.FC<MobileNavbarProps> = ({ onMenuClick, onCartClick, cartCount }) => {
    return (
        <div className="md:hidden w-full bg-white border-b border-gray-200 sticky top-0 z-50 px-4 py-3 flex items-center justify-between shadow-sm h-16">
            {/* LEFT: Hamburger + Logo */}
            <div className="flex items-center gap-3">
                <button onClick={onMenuClick} className="text-gray-900 hover:text-orange-500 text-xl">
                    <i className="fa-solid fa-bars"></i>
                </button>
                <span className="font-black text-lg tracking-tighter text-gray-900">
                    Sign<span className="text-orange-600">Aid</span>
                </span>
            </div>

            {/* RIGHT: Cart */}
            <button
                onClick={onCartClick}
                className="relative p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-600"
            >
                <i className="fa-solid fa-bag-shopping text-xl"></i>
                {cartCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold border-2 border-white">
                        {cartCount}
                    </span>
                )}
            </button>
        </div>
    );
};
