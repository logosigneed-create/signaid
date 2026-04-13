import React, { useState, useEffect } from 'react';
import { Cookie, X, Check } from 'lucide-react';
import { Link } from 'react-router-dom';

export const CookieConsent: React.FC = () => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const consent = localStorage.getItem('cookieConsent');
        if (!consent) {
            // Delay slightly to not overwhelm immediately on load
            const timer = setTimeout(() => setIsVisible(true), 1500);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleAccept = () => {
        localStorage.setItem('cookieConsent', 'accepted');
        setIsVisible(false);
    };

    const handleDecline = () => {
        localStorage.setItem('cookieConsent', 'declined');
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-24 left-6 right-6 md:left-auto md:right-8 md:bottom-8 md:max-w-md z-[1000000] animate-in fade-in slide-in-from-bottom-5 duration-500">
            <div className="bg-zinc-900/90 backdrop-blur-xl border border-white/10 p-6 rounded-3xl shadow-2xl overflow-hidden relative group">
                {/* Decorative background element */}
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-brand-orange/10 rounded-full blur-3xl group-hover:bg-brand-orange/20 transition-colors duration-500"></div>

                <div className="flex items-start gap-4 relative z-10">
                    <div className="p-3 bg-brand-orange/10 rounded-2xl text-brand-orange ring-1 ring-brand-orange/20">
                        <Cookie size={24} strokeWidth={1.5} />
                    </div>

                    <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-white font-bold text-lg tracking-tight">On garde le contact ?</h3>
                            <button
                                onClick={() => setIsVisible(false)}
                                className="text-zinc-500 hover:text-white transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <p className="text-zinc-400 text-sm leading-relaxed mb-6 font-light">
                            Nous utilisons des cookies pour améliorer votre expérience de personnalisation et sécuriser vos paiements. Pour en savoir plus, consultez notre <Link to="/cookies" className="text-brand-orange hover:underline font-medium">politique de cookies</Link>.
                        </p>

                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={handleDecline}
                                className="px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold rounded-2xl transition-all text-sm active:scale-95"
                            >
                                Refuser
                            </button>
                            <button
                                onClick={handleAccept}
                                className="px-4 py-3 bg-brand-orange hover:bg-orange-600 text-black font-black rounded-2xl transition-all text-sm shadow-lg shadow-brand-orange/20 flex items-center justify-center gap-2 active:scale-95"
                            >
                                <Check size={16} strokeWidth={3} />
                                Accepter tout
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
