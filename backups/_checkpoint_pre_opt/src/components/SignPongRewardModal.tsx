import React from 'react';

interface SignPongRewardModalProps {
    isOpen: boolean;
    score: number;
    onClose: () => void;
    onClaim: () => void;
}

export const SignPongRewardModal: React.FC<SignPongRewardModalProps> = ({ isOpen, score, onClose, onClaim }) => {
    if (!isOpen) return null;

    // Logic: 5 points = 1 credit. Cap at 5 credits (25 points).
    const creditsWon = Math.min(Math.floor(score / 5), 5);

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white w-full max-w-sm max-h-[85vh] p-6 text-center relative shadow-2xl border-4 border-orange-500 overflow-y-auto rounded-3xl mx-auto flex flex-col justify-center">
                {/* Confetti Background Effect (CSS only for simplicity) */}
                <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #f97316 2px, transparent 2.5px)', backgroundSize: '20px 20px' }}></div>

                <div className="relative z-10 space-y-4">
                    <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto animate-bounce">
                        <i className="fa-solid fa-trophy text-3xl text-orange-500"></i>
                    </div>

                    <h2 className="text-3xl font-black italic text-gray-900 uppercase leading-none">
                        Score !
                    </h2>

                    <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                        <p className="text-gray-500 text-xs font-bold uppercase mb-1">Votre performance</p>
                        <div className="text-5xl font-black text-gray-900 leading-tight">{score} <span className="text-lg text-gray-400 font-medium">pts</span></div>
                    </div>

                    <div className="space-y-2">
                        <p className="text-gray-600 font-medium text-sm leading-tight">
                            Incroyable ! Vous avez gagné des crédits grâce à votre partie de SignPong.
                        </p>
                        <div className="inline-block bg-green-100 text-green-700 font-bold px-4 py-2 rounded-full text-base border border-green-200">
                            + {creditsWon} Créations Offertes 🎁
                        </div>
                        <p className="text-[10px] text-gray-400 mt-1">
                            Pour utiliser vos {creditsWon} crédits, créez votre profil gratuit maintenant !
                        </p>
                    </div>

                    <div className="flex flex-col gap-2 pt-2">
                        <button
                            onClick={onClaim}
                            className="w-full py-3 bg-gray-900 text-white font-bold rounded-xl shadow-lg hover:bg-black hover:scale-[1.02] transition-all flex items-center justify-center gap-2 text-sm"
                        >
                            <i className="fa-solid fa-user-plus"></i>
                            Créer mon Profil
                        </button>
                        <button
                            onClick={onClose}
                            className="text-gray-400 font-bold text-[10px] hover:text-gray-600 py-1"
                        >
                            Non merci, je perds mes crédits
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
