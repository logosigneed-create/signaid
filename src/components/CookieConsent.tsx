import React, { useState, useEffect } from 'react';
import { Cookie, X, Check } from 'lucide-react';
import { Link } from 'react-router-dom';

export const CookieConsent: React.FC = () => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // If we are in an iframe (preview mode), don't show the cookie banner
        if (window.self !== window.top) {
            setIsVisible(false);
            return;
        }

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
            <div 
                style={{
                    backgroundColor: 'rgba(24, 24, 27, 0.96)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.18)',
                    borderRadius: '24px',
                    padding: '1.5rem',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 30px rgba(255, 85, 0, 0.15)',
                    position: 'relative'
                }}
            >
                <div className="flex items-start gap-4 relative z-10">
                    <div style={{
                        padding: '0.75rem',
                        backgroundColor: 'rgba(255, 85, 0, 0.15)',
                        borderRadius: '16px',
                        color: '#ff5500',
                        border: '1px solid rgba(255, 85, 0, 0.3)'
                    }}>
                        <Cookie size={24} strokeWidth={1.5} />
                    </div>

                    <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                            <h3 style={{ color: '#ffffff', fontWeight: 800, fontSize: '1.1rem', margin: 0 }}>
                                On garde le contact ?
                            </h3>
                            <button
                                onClick={() => setIsVisible(false)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#a1a1aa',
                                    cursor: 'pointer',
                                    padding: '0.2rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                                aria-label="Fermer"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <p style={{ color: '#d4d4d8', fontSize: '0.86rem', lineHeight: 1.5, marginBottom: '1.25rem' }}>
                            Nous utilisons des cookies pour améliorer votre expérience de personnalisation et sécuriser vos paiements. Pour en savoir plus, consultez notre <Link to="/cookies" style={{ color: '#ff7733', fontWeight: 600, textDecoration: 'underline' }}>politique de cookies</Link>.
                        </p>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                            <button
                                type="button"
                                onClick={handleDecline}
                                style={{
                                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                                    color: '#ffffff',
                                    border: '1px solid rgba(255, 255, 255, 0.2)',
                                    padding: '0.75rem 1rem',
                                    borderRadius: '14px',
                                    fontWeight: 700,
                                    fontSize: '0.88rem',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    textAlign: 'center'
                                }}
                            >
                                Refuser
                            </button>
                            <button
                                type="button"
                                onClick={handleAccept}
                                style={{
                                    background: 'linear-gradient(135deg, #ff5500 0%, #ff7700 100%)',
                                    color: '#ffffff',
                                    border: 'none',
                                    padding: '0.75rem 1rem',
                                    borderRadius: '14px',
                                    fontWeight: 900,
                                    fontSize: '0.88rem',
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 16px rgba(255, 85, 0, 0.45)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.4rem',
                                    transition: 'all 0.2s ease'
                                }}
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
