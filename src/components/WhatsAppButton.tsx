import React from 'react';

export const WhatsAppButton = () => {
    return (
        <a
            href="https://wa.me/32479359439?text=Bonjour%20Signeed!%20J'ai%20une%20question%20sur%20mon%20projet."
            target="_blank"
            rel="noopener noreferrer"
            className="fixed bottom-24 right-4 md:bottom-8 md:right-8 z-[9999] flex items-center justify-end gap-2 group hover:scale-110 transition-all duration-300"
            aria-label="Contact Support"
        >
            {/* Bubble - Always visible */}
            <div className="bg-white text-gray-800 px-4 py-2 rounded-xl shadow-xl border border-gray-100 text-xs font-bold animate-bounce-slow relative group-hover:shadow-orange-500/20">
                Besoin d'aide ?
                {/* Triangle Arrow */}
                <div className="absolute right-[-6px] top-1/2 -translate-y-1/2 w-3 h-3 bg-white border-t border-r border-gray-100 rotate-45 transform"></div>
            </div>

            {/* Icon */}
            <div className="bg-[#25D366] text-white w-14 h-14 rounded-full flex items-center justify-center shadow-2xl hover:shadow-green-500/40 transition-all group-hover:rotate-12">
                <i className="fa-brands fa-whatsapp text-3xl"></i>
            </div>
        </a>
    );
};
