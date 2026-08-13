import React from 'react';

interface LoadingScreenProps {
    message?: string;
    steps?: string[];
    currentStep?: number;
    transparent?: boolean;
    local?: boolean;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ message = "Traitement en cours...", steps, currentStep = 0, transparent = false, local = false }) => {
    return (
        <div className={`${local ? 'absolute' : 'fixed'} inset-0 z-[10000] flex flex-col items-center justify-center ${transparent ? '' : 'bg-white/60 backdrop-blur-md'} animate-fade-in`}>
            <div className={`relative flex flex-col items-center gap-6 text-center p-8 max-w-sm ${transparent ? 'bg-transparent' : 'bg-white/80 rounded-3xl border border-white/20 shadow-2xl'}`}>
                
                {/* STATIC LOADING INDICATOR */}
                <div className="relative w-24 h-24">
                    {/* Inner glowing core (Static/Slight Pulse) */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-orange-500 to-red-500 rounded-full blur-xl opacity-30"></div>
                    
                    {/* Center Logo/Icon - Removed rotation */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 flex items-center justify-center shadow-2xl transition-transform">
                            <i className="fa-solid fa-circle-notch text-white text-xl"></i>
                        </div>
                    </div>
                </div>

                {/* TEXT & STEPS CONTAINER */}
                <div className="flex flex-col gap-4 w-full">
                    <div className="flex flex-col gap-1">
                        <h3 className="text-xl font-black text-gray-900 uppercase tracking-tighter">
                            Signaid
                        </h3>
                        <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">
                            {message}
                        </p>
                    </div>

                    {steps && (
                        <div className="flex flex-col gap-2 text-left bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
                            {steps.map((step, idx) => (
                                <div key={idx} className={`flex items-center gap-3 transition-opacity duration-300 ${idx > currentStep ? 'opacity-30' : 'opacity-100'}`}>
                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${idx < currentStep ? 'bg-green-500 text-white' : idx === currentStep ? 'bg-orange-500 text-white animate-pulse' : 'bg-gray-200 text-gray-400'}`}>
                                        {idx < currentStep ? <i className="fa-solid fa-check"></i> : idx + 1}
                                    </div>
                                    <span className={`text-xs font-bold ${idx === currentStep ? 'text-gray-900' : 'text-gray-400'}`}>{step}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* PROGRESS BAR INDICATOR (DECORATIVE) */}
                <div className="w-48 h-1 bg-white/5 rounded-full overflow-hidden relative">
                    <div className="absolute top-0 left-0 h-full w-1/3 bg-gradient-to-r from-orange-500 to-red-500 rounded-full animate-[loading-bar_1.5s_ease-in-out_infinite]"></div>
                </div>

                {/* INLINE CSS FOR CUSTOM ANIMATION */}
                <style dangerouslySetInnerHTML={{ __html: `
                    @keyframes loading-bar {
                        0% { left: -33%; width: 33%; }
                        50% { left: 33%; width: 50%; }
                        100% { left: 100%; width: 33%; }
                    }
                `}} />
            </div>
        </div>
    );
};
