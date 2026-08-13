import React from 'react';

interface MobileToolBarProps {
    onOpenGallery: () => void;
    onToggleRuler: () => void;
    onValidate: () => void;
    onOpenText: () => void;
    onOpenQR: () => void;
}

export function MobileToolBar({
    onOpenGallery,
    onToggleRuler,
    onValidate,
    onOpenText,
    onOpenQR
}: MobileToolBarProps) {

    // Classes de base pour les boutons gris carrés de ta maquette
    const squareBtnClass = "w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center text-gray-700 hover:bg-gray-200 active:scale-95 transition-all";

    return (
        <div className="flex items-center justify-center gap-3 w-full my-6 px-4">
            {/* Bouton Image / Galerie */}
            <button onClick={onOpenGallery} className={squareBtnClass}>
                <i className="fa-regular fa-image text-xl"></i>
            </button>

            {/* Bouton Règle / Mesure */}
            <button onClick={onToggleRuler} className={squareBtnClass}>
                <i className="fa-solid fa-ruler-combined text-xl"></i>
            </button>

            {/* Bouton Central Validation (Vert) */}
            <button
                onClick={onValidate}
                className="w-16 h-16 bg-[#2ECC71] rounded-full flex items-center justify-center text-white shadow-lg hover:bg-[#27AE60] active:scale-95 transition-all mx-1"
            >
                <i className="fa-solid fa-check text-2xl"></i>
            </button>

            {/* Bouton Texte (A) */}
            <button onClick={onOpenText} className={squareBtnClass}>
                <span className="font-black text-xl font-serif">A</span>
            </button>

            {/* Bouton QR / Code */}
            <button onClick={onOpenQR} className={squareBtnClass}>
                <i className="fa-solid fa-qrcode text-xl"></i>
            </button>
        </div>
    );
}
