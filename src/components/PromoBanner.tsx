import React from 'react';

interface PromoBannerProps {
    className?: string;
    isVisible?: boolean;
    text?: string;
}

export const PromoBanner: React.FC<PromoBannerProps> = ({ className = '', isVisible = true, text = '' }) => {
    if (!isVisible || !text) return null;

    return (
        <div
            data-layout-id="promo-banner"
            className={`w-full bg-gradient-to-r from-orange-600 via-red-500 to-orange-600 bg-[length:200%_auto] animate-gradient text-white text-xs lg:text-sm font-bold py-1 overflow-hidden shadow-md z-[1100] fixed top-0 left-0 flex-shrink-0 flex items-center transition-all duration-500 ease-in-out ${className}`}
        >
            <div className="whitespace-nowrap animate-marquee flex items-center">
                <span className="mx-8">{text}</span>
                <span className="mx-8">{text}</span>
                <span className="mx-8">{text}</span>
                <span className="mx-8">{text}</span>
            </div>
        </div>
    );
};
