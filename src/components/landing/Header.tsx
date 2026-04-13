import React from 'react';

const Header: React.FC = () => {
    return (
        <header className="fixed top-0 left-0 right-0 h-20 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-between px-6 md:px-12 border-b border-transparent transition-colors duration-300">
            <div className="flex items-center gap-4">
                <div className="flex items-baseline gap-0.5 select-none cursor-pointer group">
                    <span className="text-2xl font-black bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent transform -skew-x-6">SIGNAID</span>
                </div>
            </div>
        </header>
    );
};

export default Header;
