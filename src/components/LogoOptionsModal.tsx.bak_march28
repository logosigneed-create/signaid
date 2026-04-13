import React from 'react';

interface LogoOptionsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectOptionA: () => void; // "J'ai mon logo"
    onSelectOptionB?: () => void; // Unused in UI but kept for compatibility
    onSelectOptionC: () => void; // "Service Création"
}

export const LogoOptionsModal: React.FC<LogoOptionsModalProps> = ({
    isOpen,
    onClose,
    onSelectOptionA,
    onSelectOptionC
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />
            <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden my-8 animate-fade-in z-10">
                <div className="p-8 pb-4 text-center">
                    <h2 className="text-3xl font-black text-orange-600 mb-2 uppercase">VOTRE LOGO</h2>
                    <p className="text-gray-500 font-medium italic">Offre spéciale : Logo & Refonte offerts dès 10 articles</p>
                </div>

                <div className="p-8 pt-4 grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
                    {/* Option A */}
                    <button
                        onClick={onSelectOptionA}
                        className="flex flex-col items-center text-center p-6 rounded-2xl border-2 border-gray-100 hover:border-orange-500 hover:bg-orange-50 transition-all group"
                    >
                        <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4 text-orange-600 group-hover:scale-110 transition-transform">
                            <i className="fa-solid fa-upload text-2xl"></i>
                        </div>
                        <h3 className="text-lg font-bold text-gray-800 mb-2">OPTION A</h3>
                        <p className="text-orange-600 text-xs font-black uppercase">J'ai déjà mon logo</p>
                    </button>

                    {/* Option C (Service) */}
                    <button
                        onClick={onSelectOptionC}
                        className="flex flex-col items-center text-center p-6 rounded-2xl border-2 border-gray-100 hover:border-indigo-500 hover:bg-indigo-50 transition-all group relative"
                    >
                        <div className="absolute top-2 right-2 bg-indigo-600 text-white text-[9px] font-black px-2 py-1 rounded-full uppercase">
                            Offre
                        </div>
                        <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4 text-indigo-600 group-hover:scale-110 transition-transform">
                            <i className="fa-solid fa-wand-magic-sparkles text-2xl"></i>
                        </div>
                        <h3 className="text-lg font-bold text-gray-800 mb-2">SERVICE LOGO</h3>
                        <p className="text-indigo-600 text-xs font-black uppercase">Refonte / Services</p>
                    </button>
                </div>

                <div className="p-6 bg-gray-50 flex justify-center border-t border-gray-100">
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 font-bold text-xs uppercase tracking-widest">
                        Fermer
                    </button>
                </div>
            </div>
        </div>
    );
};
