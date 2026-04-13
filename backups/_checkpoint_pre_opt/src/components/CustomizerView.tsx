import React, { useState } from 'react';

// Composant propre et 100% Mobile-First
export function CustomizerView(props: any) {
    // --- ÉTATS VISUELS TEMPORAIRES (Pour tester le design) ---
    const [isBack, setIsBack] = useState(false);
    const [zoomLevel, setZoomLevel] = useState(1);
    const [activePanel, setActivePanel] = useState('none');
    const [isMeasureToolActive, setIsMeasureToolActive] = useState(false);
    const [showAllSizes, setShowAllSizes] = useState(false);

    // Extraction basique du produit passé par CustomizerApp
    const product = props.products ? props.products[props.initialProductType || 'tshirt'] : null;
    const currentColor = props.initialColor || '#000000';

    // Image à afficher (Face ou Dos)
    const displayImage = product
        ? (isBack ? product.backImages[currentColor] : product.images[currentColor])
        : ''; // Fallback si pas d'image

    return (
        <div className="flex flex-col flex-1 h-[100dvh] bg-gray-50 overflow-hidden w-full max-w-md mx-auto relative pb-6 shadow-2xl border-x border-gray-200">

            {/* 1. HEADER STRICT */}
            <div className="flex-shrink-0 w-full flex items-center justify-between p-4 bg-white z-50 border-b border-gray-100">
                <button onClick={props.onBack} className="w-10 h-10 flex items-center justify-center bg-gray-100 rounded-full text-gray-700 hover:bg-gray-200 transition-colors">
                    <i className="fa-solid fa-arrow-left"></i>
                </button>
                <div className="flex flex-col items-center">
                    <h2 className="font-black text-lg uppercase tracking-wider text-gray-900 leading-tight">
                        {product?.name || "Produit"}
                    </h2>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{currentColor}</span>
                </div>
                <button className="w-10 h-10 flex items-center justify-center text-gray-700">
                    <i className="fa-solid fa-bars"></i>
                </button>
            </div>

            {/* 2. ZONE IMAGE ÉLASTIQUE (Le secret est ici : flex-1 et min-h-0) */}
            <div className="flex-1 relative flex items-center justify-center min-h-0 bg-white w-full border-b border-gray-100 overflow-hidden">
                <div className="relative w-full max-w-[280px] aspect-[3/4] flex items-center justify-center">

                    {/* Flèche Gauche */}
                    <button className="absolute -left-12 z-10 text-orange-500 text-3xl font-black hover:scale-110 active:scale-90 transition-transform">
                        <i className="fa-solid fa-chevron-left"></i>
                    </button>

                    {/* Vêtement */}
                    {displayImage ? (
                        <img
                            src={displayImage}
                            className="w-full h-full object-contain pointer-events-none select-none transition-transform duration-300"
                            style={{ transform: `scale(${zoomLevel})` }}
                            alt="T-shirt"
                        />
                    ) : (
                        <div className="w-full h-full bg-gray-100 rounded-xl flex items-center justify-center text-gray-400">Image introuvable</div>
                    )}

                    {/* Flèche Droite */}
                    <button className="absolute -right-12 z-10 text-orange-500 text-3xl font-black hover:scale-110 active:scale-90 transition-transform">
                        <i className="fa-solid fa-chevron-right"></i>
                    </button>

                    {/* Pilule de Contrôle (Absolue par rapport au t-shirt) */}
                    <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-white rounded-full shadow-[0_4px_15px_rgba(0,0,0,0.1)] px-5 py-2.5 border border-gray-100 z-20 whitespace-nowrap">
                        <button onClick={() => setIsBack(!isBack)} className="text-gray-500 text-xs font-black flex items-center gap-2 tracking-widest uppercase hover:text-gray-900 transition-colors">
                            <i className="fa-solid fa-rotate"></i> {isBack ? "DOS" : "FACE"}
                        </button>
                        <div className="w-px h-4 bg-gray-200"></div>
                        <button onClick={() => setZoomLevel(z => Math.min(z + 0.1, 2))} className="text-gray-500 text-lg hover:text-gray-900 transition-colors"><i className="fa-solid fa-plus"></i></button>
                        <button onClick={() => setZoomLevel(z => Math.max(z - 0.1, 0.5))} className="text-gray-500 text-lg hover:text-gray-900 transition-colors"><i className="fa-solid fa-minus"></i></button>
                    </div>
                </div>
            </div>

            {/* 3. ZONE D'ACTION FIXÉE EN BAS */}
            <div className="flex-shrink-0 flex flex-col w-full bg-white z-40 pb-2 pt-4 shadow-[0_-10px_20px_rgba(0,0,0,0.03)]">

                {/* TOOLBAR SQUELETTE (Remplacera par ton vrai composant plus tard) */}
                <div className="flex items-center justify-center gap-3 w-full mb-6 px-4">
                    <button onClick={() => setActivePanel('import')} className="w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center text-gray-700 hover:bg-gray-200 transition-all"><i className="fa-regular fa-image text-2xl"></i></button>
                    <button onClick={() => setIsMeasureToolActive(!isMeasureToolActive)} className={`w-14 h-14 rounded-xl flex items-center justify-center transition-all ${isMeasureToolActive ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}><i className="fa-solid fa-ruler-combined text-2xl"></i></button>

                    {/* Bouton Vert Central */}
                    <button className="w-16 h-16 bg-[#2ECC71] rounded-full flex items-center justify-center text-white shadow-lg hover:bg-[#27AE60] active:scale-95 transition-all mx-1">
                        <i className="fa-solid fa-check text-3xl"></i>
                    </button>

                    <button onClick={() => setActivePanel('text')} className="w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center text-gray-700 hover:bg-gray-200 transition-all"><span className="font-black text-2xl font-serif">A</span></button>
                    <button onClick={() => setActivePanel('code')} className="w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center text-gray-700 hover:bg-gray-200 transition-all"><i className="fa-solid fa-qrcode text-2xl"></i></button>
                </div>

                {/* SIZE SELECTOR SQUELETTE */}
                <div className="bg-white rounded-3xl p-4 border border-gray-100 shadow-sm mx-4">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="font-black text-gray-800 uppercase text-xs tracking-widest">Choix des tailles</h3>
                        <button className="text-[10px] font-bold text-gray-400 flex items-center gap-1 hover:text-gray-600">
                            <i className="fa-solid fa-ruler-vertical"></i> Guide
                        </button>
                    </div>
                    <div className="flex flex-wrap gap-2 justify-center">
                        {['XS', 'S', 'M', 'L', 'XL'].map(size => (
                            <button key={size} className="min-w-[3rem] px-3 h-10 flex items-center justify-center bg-white border border-gray-200 rounded-xl text-gray-800 font-bold text-xs hover:border-gray-400 transition-colors shadow-sm">
                                {size}
                            </button>
                        ))}
                    </div>
                    <div className="mt-3 flex justify-center">
                        <button onClick={() => setShowAllSizes(!showAllSizes)} className="text-[10px] font-black text-orange-600 hover:text-orange-700 flex items-center gap-1 uppercase tracking-wide">
                            {showAllSizes ? "Masquer" : "Voir + tailles (4XL+)"} <i className={`fa-solid fa-chevron-${showAllSizes ? 'up' : 'down'}`}></i>
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}