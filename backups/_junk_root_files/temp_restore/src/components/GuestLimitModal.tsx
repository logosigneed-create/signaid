import React, { useState } from 'react';

interface GuestLimitModalProps {
    isOpen: boolean;
    onClose: () => void;
    onJoinClub: () => void;
    onNotifyMe: (email: string) => void;
    isMember?: boolean;
}

export const GuestLimitModal: React.FC<GuestLimitModalProps> = ({ isOpen, onClose, onJoinClub, onNotifyMe, isMember }) => {
    const [email, setEmail] = useState('');
    const [notified, setNotified] = useState(false);

    if (!isOpen) return null;

    const handleNotify = () => {
        if (email && email.includes('@')) {
            onNotifyMe(email);
            setNotified(true);
            setTimeout(() => {
                onClose();
                setNotified(false);
                setEmail('');
            }, 2000);
        } else {
            alert("Veuillez entrer une adresse email valide.");
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
            <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden relative z-10 animate-fade-in">

                {/* Header Image/Icon */}
                <div className="h-32 bg-gradient-to-r from-orange-400 to-pink-500 flex items-center justify-center relative">
                    <div className="bg-white/20 backdrop-blur-md p-4 rounded-full border border-white/30 text-white shadow-xl">
                        <i className="fa-solid fa-camera-retro text-4xl"></i>
                    </div>
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-black/20 hover:bg-black/30 rounded-full text-white transition-colors"
                    >
                        <i className="fa-solid fa-xmark"></i>
                    </button>
                </div>

                <div className="p-6 text-center">
                    <h2 className="text-2xl font-black text-gray-900 mb-2">{isMember ? "Plus de crédits ? 😱" : "Wow, quel style ! 📸"}</h2>
                    <p className="text-gray-600 mb-6">
                        {isMember
                            ? "Vous avez utilisé tous vos crédits disponibles. Invitez des amis ou attendez une offre spéciale pour en obtenir plus !"
                            : "Vous avez épuisé vos essais gratuits. Rejoignez le club pour continuer ou soyez prévenu de votre recharge."
                        }
                    </p>

                    <div className="space-y-4">
                        <button
                            onClick={onJoinClub}
                            className="w-full py-3.5 px-4 bg-gray-900 text-white font-bold rounded-xl shadow-lg hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                            <i className={`fa-solid ${isMember ? 'fa-gift' : 'fa-user-plus'} text-orange-400`}></i>
                            {isMember ? "Gagner des crédits" : "Rejoindre le Signeed Club"}
                        </button>

                        <div className="relative border-t border-gray-100 pt-4">
                            <p className="text-xs text-gray-400 mb-3 font-semibold uppercase">{isMember ? "Ou invitez un ami (+1 Crédit)" : "Ou attendez la recharge (48h)"}</p>

                            {!notified ? (
                                <div className="flex flex-col gap-2">
                                    <input
                                        type="email"
                                        placeholder="Votre email..."
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm focus:border-orange-500 outline-none"
                                    />
                                    <button
                                        onClick={handleNotify}
                                        className="w-full py-3 bg-white border-2 border-orange-100 text-orange-600 font-bold rounded-xl hover:bg-orange-50 transition-colors"
                                    >
                                        <i className="fa-solid fa-bell mr-2"></i>
                                        Me prévenir quand c'est rechargé
                                    </button>
                                </div>
                            ) : (
                                <div className="p-4 bg-green-50 text-green-600 rounded-xl font-bold flex items-center justify-center gap-2">
                                    <i className="fa-solid fa-check-circle"></i>
                                    C'est noté ! On vous tient au courant.
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-center gap-4 text-xs text-gray-400">
                        <span className="flex items-center gap-1"><i className="fa-solid fa-check text-green-500"></i> 10 Crédits offerts</span>
                        <span className="flex items-center gap-1"><i className="fa-solid fa-check text-green-500"></i> Sauvegardes illimitées</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
