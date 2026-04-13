import React, { useState } from 'react';

interface ShareDesignModalProps {
    shortId: string;
    onClose: () => void;
}

export const ShareDesignModal: React.FC<ShareDesignModalProps> = ({ shortId, onClose }) => {
    const [copied, setCopied] = useState(false);
    const shareUrl = `${window.location.origin}/s/${shortId}`;

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error("Failed to copy:", err);
        }
    };

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`Découvre mon design sur Signaid ! ${shareUrl}`)}`;
    const emailUrl = `mailto:?subject=${encodeURIComponent("Mon design personnalisé Signaid")}&body=${encodeURIComponent(`Voici le lien pour voir et modifier mon design : ${shareUrl}`)}`;

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-scale-in">
                <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-gray-900">Partager mon design</h3>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
                        >
                            <i className="fa-solid fa-xmark"></i>
                        </button>
                    </div>

                    <p className="text-gray-600 text-sm mb-6">
                        Toute personne disposant de ce lien pourra voir votre design, le modifier et l'ajouter à son panier.
                    </p>

                    <div className="space-y-4">
                        {/* Link Box */}
                        <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl border border-gray-100">
                            <input
                                type="text"
                                readOnly
                                value={shareUrl}
                                className="bg-transparent border-none text-sm text-gray-500 flex-1 outline-none font-mono"
                            />
                            <button
                                onClick={handleCopy}
                                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${copied ? 'bg-green-500 text-white' : 'bg-gray-900 text-white hover:bg-black'
                                    }`}
                            >
                                {copied ? 'Copié !' : 'Copier'}
                            </button>
                        </div>

                        {/* Social Buttons */}
                        <div className="grid grid-cols-2 gap-3">
                            <a
                                href={whatsappUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-2 py-3 px-4 bg-[#25D366] hover:bg-[#20ba56] text-white rounded-xl font-bold transition-transform active:scale-95"
                            >
                                <i className="fa-brands fa-whatsapp text-xl"></i>
                                WhatsApp
                            </a>
                            <a
                                href={emailUrl}
                                className="flex items-center justify-center gap-2 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-xl font-bold transition-transform active:scale-95"
                            >
                                <i className="fa-solid fa-envelope text-xl"></i>
                                Email
                            </a>
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-gray-50 border-t border-gray-100">
                    <button
                        onClick={onClose}
                        className="w-full py-3 text-gray-600 font-bold hover:text-gray-900 transition-colors"
                    >
                        Fermer
                    </button>
                </div>
            </div>
        </div>
    );
};
