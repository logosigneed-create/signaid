import React, { useState, useEffect } from 'react';

export const LayoutAdjuster: React.FC = () => {
    const [activeElement, setActiveElement] = useState<HTMLElement | null>(null);
    const [offsetY, setOffsetY] = useState(0);
    const [scale, setScale] = useState(1);
    const [savedAdjustments, setSavedAdjustments] = useState<Record<string, { y: number, scale: number }>>({});

    // Load saved adjustments on mount
    useEffect(() => {
        try {
            const saved = localStorage.getItem('layout_adjustments_v2'); // New key for v2
            if (saved) {
                const parsed = JSON.parse(saved);
                setSavedAdjustments(parsed);
                applyAdjustments(parsed);
            }
        } catch (e) {
            console.error("Failed to load layout adjustments", e);
        }
    }, []);

    // Apply adjustments to DOM
    const applyAdjustments = (adjustments: Record<string, { y: number, scale: number }>) => {
        Object.entries(adjustments).forEach(([selector, { y, scale }]) => {
            const el = document.querySelector(selector) as HTMLElement;
            if (el) {
                el.style.transform = `translateY(${y}px) scale(${scale})`;
                // Important: ensure origin is center for predictable scaling, or top center
                // el.style.transformOrigin = "top center"; 
                el.dataset.adjusted = "true";
            }
        });
    };

    // Re-apply periodically
    useEffect(() => {
        const interval = setInterval(() => {
            applyAdjustments(savedAdjustments);
        }, 1000);
        return () => clearInterval(interval);
    }, [savedAdjustments]);


    // Global click listener
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (e.shiftKey && e.button === 0) { // Shift + Left Click
                e.preventDefault();
                e.stopPropagation();

                const target = e.target as HTMLElement;
                const adjustmentTarget = target.closest('[data-layout-id]') as HTMLElement || target;

                setActiveElement(adjustmentTarget);

                const id = getElementSelector(adjustmentTarget);
                if (savedAdjustments[id]) {
                    setOffsetY(savedAdjustments[id].y);
                    setScale(savedAdjustments[id].scale ?? 1); // fallback if migrating
                } else {
                    setOffsetY(0);
                    setScale(1);
                }
            }
        };

        window.addEventListener('click', handleClick, true);
        return () => window.removeEventListener('click', handleClick, true);
    }, [savedAdjustments]);

    // Helper to generate a unique selector
    const getElementSelector = (el: HTMLElement): string => {
        if (el.dataset.layoutId) return `[data-layout-id="${el.dataset.layoutId}"]`;
        if (el.id) return `#${el.id}`;
        let path = el.tagName.toLowerCase();
        if (el.className) {
            const cls = el.className.split(' ')[0];
            if (cls) path += `.${cls}`;
        }
        return path;
    };

    // Live update
    useEffect(() => {
        if (activeElement) {
            activeElement.style.transform = `translateY(${offsetY}px) scale(${scale})`;
            activeElement.style.outline = "2px solid red";

            const selector = getElementSelector(activeElement);
            const newAdjustments = { ...savedAdjustments, [selector]: { y: offsetY, scale } };
            setSavedAdjustments(newAdjustments);
            localStorage.setItem('layout_adjustments_v2', JSON.stringify(newAdjustments));
        }

        return () => {
            if (activeElement) activeElement.style.outline = "";
        };
    }, [offsetY, scale, activeElement]);

    if (!activeElement) return null;

    return (
        <div className="fixed top-20 left-4 z-[50000] bg-white p-4 rounded-xl shadow-2xl border-2 border-orange-500 animate-slide-in w-64">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-sm text-orange-600">Ajusteur V2</h3>
                <button onClick={() => setActiveElement(null)} className="text-gray-400 hover:text-gray-600">
                    <i className="fa-solid fa-times"></i>
                </button>
            </div>

            <p className="text-xs text-gray-500 mb-4 truncate" title={getElementSelector(activeElement)}>
                Cible : <span className="font-mono bg-gray-100 px-1 rounded">{activeElement.dataset.layoutId || activeElement.tagName}</span>
            </p>

            {/* Position Y */}
            <div className="mb-4">
                <div className="flex justify-between text-xs mb-1 font-bold text-gray-700">
                    <span>Hauteur (Y)</span>
                    <span>{offsetY}px</span>
                </div>
                <input
                    type="range"
                    min="-300"
                    max="300"
                    value={offsetY}
                    onChange={(e) => setOffsetY(Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
                />
            </div>

            {/* Scale */}
            <div className="mb-2">
                <div className="flex justify-between text-xs mb-1 font-bold text-gray-700">
                    <span>Taille (Zoom)</span>
                    <span>{scale.toFixed(2)}x</span>
                </div>
                <input
                    type="range"
                    min="0.5"
                    max="1.5"
                    step="0.05"
                    value={scale}
                    onChange={(e) => setScale(Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
            </div>

            <p className="text-[10px] text-gray-400 italic text-center mt-2">
                Shift + Clic pour changer de cible
            </p>
        </div>
    );
};
