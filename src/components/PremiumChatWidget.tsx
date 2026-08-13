import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, X, ChevronRight } from 'lucide-react';

const SOCIAL_LINKS = {
    WHATSAPP: "https://wa.me/32479359439?text=Bonjour%20Signeed!%20J'ai%20une%20question%20sur%20mon%20projet.",
    MESSENGER: "https://m.me/107166121786226"
};

export const PremiumChatWidget = () => {
    const [isOpen, setIsOpen] = useState(false);
    const widgetRef = useRef<HTMLDivElement>(null);

    // Listen for custom event to open chat
    useEffect(() => {
        const handleOpenChat = () => setIsOpen(true);
        window.addEventListener('openChatWidget', handleOpenChat);
        return () => window.removeEventListener('openChatWidget', handleOpenChat);
    }, []);

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (widgetRef.current && !widgetRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    return (
        <div ref={widgetRef} className="fixed bottom-24 right-4 md:bottom-8 md:right-8 z-[10000] flex flex-col items-end font-sans">
            {/* Selection Window */}
            {isOpen && (
                <div className="mb-4 w-72 md:w-80 bg-white/95 backdrop-blur-md rounded-[2.5rem] shadow-[0_20px_60px_rgba(0,0,0,0.15)] border border-white/50 overflow-hidden animate-fade-in-up flex flex-col origin-bottom-right transition-all">
                    {/* Header */}
                    <div className="bg-zinc-900 p-6 text-white text-center relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-orange-500/20 to-transparent pointer-events-none"></div>
                        <h3 className="font-black text-lg tracking-tight relative z-10">Besoins d'aide ?</h3>
                        <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-gray-400 mt-1 relative z-10 opacity-80">Choisissez votre canal</p>

                        <button
                            onClick={() => setIsOpen(false)}
                            aria-label="Fermer"
                            className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Options Area */}
                    <div className="p-6 flex flex-col gap-4">
                        {/* WhatsApp Button */}
                        <a
                            href={SOCIAL_LINKS.WHATSAPP}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group relative flex items-center gap-4 p-4 bg-green-500 hover:bg-green-600 rounded-2xl transition-all shadow-lg hover:shadow-green-500/30 transform hover:-translate-y-1"
                        >
                            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-white scale-110 group-hover:rotate-6 transition-transform">
                                <MessageCircle size={24} />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-white font-black text-sm">WhatsApp</span>
                                <span className="text-white/80 text-[10px] font-bold">Réponse ultra-rapide</span>
                            </div>
                            <ChevronRight size={18} className="ml-auto text-white/50 group-hover:text-white transition-colors" />
                        </a>

                        {/* Messenger Button */}
                        <a
                            href={SOCIAL_LINKS.MESSENGER}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group relative flex items-center gap-4 p-4 bg-blue-600 hover:bg-blue-700 rounded-2xl transition-all shadow-lg hover:shadow-blue-600/30 transform hover:-translate-y-1"
                        >
                            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-white scale-110 group-hover:rotate-6 transition-transform">
                                <Send size={24} />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-white font-black text-sm">Messenger</span>
                                <span className="text-white/80 text-[10px] font-bold">Support Facebook</span>
                            </div>
                            <ChevronRight size={18} className="ml-auto text-white/50 group-hover:text-white transition-colors" />
                        </a>

                        <p className="text-center text-[9px] font-bold text-gray-400 mt-2 italic px-4">
                            "Nous sommes disponibles 7j/7 pour vous accompagner dans vos créations."
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};
