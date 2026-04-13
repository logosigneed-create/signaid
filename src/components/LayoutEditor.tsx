import React, { useState, useEffect, useCallback } from 'react';
import { getSavedAdjustments, saveAdjustments, generateAndInjectStyles } from '../utils/layoutInitializer';

interface LayoutEditorProps {
    isAdmin: boolean;
}

interface Adjustment {
    x?: number;
    y: number;
    scale: number;
}

interface AdjustmentMap {
    [selector: string]: Adjustment;
}

export const LayoutEditor: React.FC<LayoutEditorProps> = ({ isAdmin }) => {
    const [isEnabled, setIsEnabled] = useState(false);
    const [isInspectMode, setIsInspectMode] = useState(false);
    const [activeElement, setActiveElement] = useState<HTMLElement | null>(null);

    // Current Edit Values
    const [offsetY, setOffsetY] = useState(0);
    const [offsetX, setOffsetX] = useState(0);
    const [scale, setScale] = useState(1);

    // Responsive State
    const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
    const [mobileAdjustments, setMobileAdjustments] = useState<AdjustmentMap>({});
    const [desktopAdjustments, setDesktopAdjustments] = useState<AdjustmentMap>({});

    // UI Position
    const [editorPos, setEditorPos] = useState({ x: window.innerWidth - 340, y: 20 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [elementsList, setElementsList] = useState<{ id: string, el: HTMLElement }[]>([]);

    // Initial Element Scan
    useEffect(() => {
        if (isEnabled) {
            const all = document.querySelectorAll('[data-layout-id]');
            const list = Array.from(all).map(el => ({
                id: (el as HTMLElement).dataset.layoutId || '',
                el: el as HTMLElement
            }));
            setElementsList(list);
        }
    }, [isEnabled]);

    // --- 1. RESPONSIVE DETECTION ---
    useEffect(() => {
        const handleResize = () => {
            const nowDesktop = window.innerWidth >= 1024;
            setIsDesktop(nowDesktop);

            // Keep editor in bounds
            if (editorPos.x > window.innerWidth - 100) {
                setEditorPos(p => ({ ...p, x: window.innerWidth - 340 }));
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [editorPos.x]);

    // --- 2. LOAD LOGIC ---
    useEffect(() => {
        const { mobile, desktop } = getSavedAdjustments();
        setMobileAdjustments(mobile);
        setDesktopAdjustments(desktop);
    }, []);

    // --- 3. SAVE LOGIC (Delegated to Utility) ---
    useEffect(() => {
        // Sync CSS for visual feedback while editing
        generateAndInjectStyles(mobileAdjustments, desktopAdjustments);
    }, [mobileAdjustments, desktopAdjustments]);

    // --- 4. SHORTCUT HANDLER (Ctrl+I) ---
    useEffect(() => {
        if (!isAdmin) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && (e.key === 'i' || e.key === 'I')) {
                e.preventDefault();
                setIsEnabled(true); // Open if closed
                setIsInspectMode(prev => !prev);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isAdmin]);

    // --- 5. INSPECTION LOGIC ---
    useEffect(() => {
        if (!isEnabled || !isInspectMode) {
            document.body.style.cursor = '';
            return;
        }

        const handleMouseOver = (e: MouseEvent) => {
            if (!isInspectMode) return;
            e.stopPropagation();

            let target = e.target as HTMLElement;
            // PREFER Layout ID Container
            const layoutContainer = target.closest('[data-layout-id]') as HTMLElement;
            if (layoutContainer) target = layoutContainer;

            target.style.outline = "4px solid #f97316";
            target.style.backgroundColor = "rgba(249, 115, 22, 0.2)"; // Semi-transparent orange
            target.style.cursor = "crosshair";
            target.style.boxShadow = "0 0 20px rgba(249, 115, 22, 0.5)";
        };

        const handleMouseOut = (e: MouseEvent) => {
            let target = e.target as HTMLElement;
            const layoutContainer = target.closest('[data-layout-id]') as HTMLElement;
            if (layoutContainer) target = layoutContainer;

            if (target !== activeElement) {
                target.style.outline = "";
                target.style.backgroundColor = "";
                target.style.boxShadow = "";
                target.style.cursor = "";
            }
        };

        const handleClick = (e: MouseEvent) => {
            if (!isInspectMode) return;
            e.preventDefault();
            e.stopPropagation();

            let target = e.target as HTMLElement;
            const layoutContainer = target.closest('[data-layout-id]') as HTMLElement;
            if (layoutContainer) target = layoutContainer;

            selectElement(target);
            setIsInspectMode(false);
            document.body.style.cursor = '';

            // Cleanup hover effects
            document.querySelectorAll('*').forEach(el => {
                if (el !== target) {
                    (el as HTMLElement).style.outline = "";
                    (el as HTMLElement).style.backgroundColor = "";
                    (el as HTMLElement).style.boxShadow = "";
                }
            });
        };

        window.addEventListener('mouseover', handleMouseOver, true);
        window.addEventListener('mouseout', handleMouseOut, true);
        window.addEventListener('click', handleClick, true);

        return () => {
            window.removeEventListener('mouseover', handleMouseOver, true);
            window.removeEventListener('mouseout', handleMouseOut, true);
            window.removeEventListener('click', handleClick, true);
            document.body.style.cursor = '';
            document.querySelectorAll('*').forEach(el => {
                if (el !== activeElement) (el as HTMLElement).style.outline = "";
            });
        };
    }, [isEnabled, isInspectMode, activeElement]);

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

    const selectElement = (el: HTMLElement) => {
        setActiveElement(el);
        const selector = getElementSelector(el);
        const adjustments = isDesktop ? desktopAdjustments : mobileAdjustments;

        if (adjustments[selector]) {
            setOffsetY(adjustments[selector].y);
            setOffsetX(adjustments[selector].x || 0);
            setScale(adjustments[selector].scale);
        } else {
            setOffsetY(0);
            setOffsetX(0);
            setScale(1);
        }

        el.style.outline = "2px solid red";
    };

    // --- 6. LIVE UPDATE ---
    useEffect(() => {
        if (activeElement) {
            const selector = getElementSelector(activeElement);
            const newAdj = { x: offsetX, y: offsetY, scale };

            // Update the state map, this will trigger the useEffect in step 3 to sync CSS
            if (isDesktop) {
                const newMap = { ...desktopAdjustments, [selector]: newAdj };
                setDesktopAdjustments(newMap);
                saveAdjustments(true, newMap); // Persist
            } else {
                const newMap = { ...mobileAdjustments, [selector]: newAdj };
                setMobileAdjustments(newMap);
                saveAdjustments(false, newMap); // Persist
            }

            activeElement.style.outline = "2px solid red";
        }
    }, [offsetX, offsetY, scale, activeElement]); // Removed Adjustments from dep to avoid loops, explicit update

    useEffect(() => {
        return () => {
            if (activeElement) activeElement.style.outline = "";
        };
    }, [activeElement]);


    // --- 7. DRAG LOGIC ---
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging) return;
            setEditorPos({ x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y });
        };
        const handleTouchMove = (e: TouchEvent) => {
            if (!isDragging) return;
            const touch = e.touches[0];
            if (touch) {
                setEditorPos({ x: touch.clientX - dragOffset.x, y: touch.clientY - dragOffset.y });
            }
        };

        const handleMouseUp = () => setIsDragging(false);

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('touchmove', handleTouchMove);
            window.addEventListener('mouseup', handleMouseUp);
            window.addEventListener('touchend', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('touchend', handleMouseUp);
        };
    }, [isDragging, dragOffset]);

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        setDragOffset({ x: e.clientX - editorPos.x, y: e.clientY - editorPos.y });
    };

    const KNOWN_IDS = [
        { id: 'app-main', label: 'Main Container' },
        { id: 'feed-track', label: 'Feed/Gallery' },
        { id: 'customizer-options-panel', label: 'Panel Options (Bas)' },
        { id: 'customizer-right-sidebar', label: 'Barre Outils Droite' },
        { id: 'desktop-navbar', label: 'Navbar' }
    ];

    if (!isAdmin) return null;

    if (!isEnabled) {
        return (
            <div className="fixed top-4 right-4 z-[9999]">
                <button
                    onClick={() => { setIsEnabled(true); setEditorPos({ x: window.innerWidth - 340, y: 20 }); }}
                    className="bg-gray-900 text-white px-4 py-2 rounded-full text-xs font-bold shadow-xl border border-gray-700 hover:bg-black transition-all flex items-center gap-2"
                >
                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                    ADMIN EDITOR (V3)
                </button>
            </div>
        );
    }

    return (
        <div
            className="fixed z-[9999] bg-white/95 backdrop-blur-md shadow-2xl border border-gray-200 rounded-xl p-4 w-80 transition-shadow font-sans text-gray-800"
            style={{ left: editorPos.x, top: editorPos.y }}
        >
            {/* HEADER */}
            <div
                className="flex items-center justify-between mb-4 border-b pb-2 cursor-move select-none touch-none"
                onMouseDown={handleMouseDown}
                onTouchStart={(e) => {
                    const touch = e.touches[0];
                    if (touch) {
                        setIsDragging(true);
                        setDragOffset({ x: touch.clientX - editorPos.x, y: touch.clientY - editorPos.y });
                    }
                }}
            >
                <div>
                    <div className="flex items-center gap-2 pointer-events-none">
                        <div className={`w-2 h-2 rounded-full animate-pulse ${isDesktop ? 'bg-blue-500' : 'bg-green-500'}`}></div>
                        <h3 className="font-black text-xs uppercase tracking-widest">Layout Editor V3</h3>
                    </div>
                    <div className="text-[9px] font-bold text-gray-400 mt-0.5 ml-4">
                        MODE: <span className={isDesktop ? 'text-blue-600' : 'text-green-600'}>{isDesktop ? 'DESKTOP (≥1024px)' : 'MOBILE (<1024px)'}</span>
                    </div>
                </div>

                <div className="flex gap-2">
                    <button title="Toggle Inspect (Ctrl+I)" onClick={() => setIsInspectMode(!isInspectMode)} className={`w-6 h-6 flex items-center justify-center rounded ${isInspectMode ? 'bg-orange-500 text-white' : 'text-gray-400 hover:bg-gray-100'}`}>
                        <i className="fa-solid fa-crosshairs"></i>
                    </button>
                    <button onClick={() => { setIsEnabled(false); setActiveElement(null); }} className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:bg-red-50 hover:text-red-500">
                        <i className="fa-solid fa-times"></i>
                    </button>
                </div>
            </div>

            {/* ELEMENT LIST SELECTOR */}
            <div className="mb-4">
                <div className="flex justify-between items-center mb-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Sélection Rapide</label>
                    <button
                        onClick={() => {
                            // Refresh logic
                            const all = document.querySelectorAll('[data-layout-id]');
                            const list = Array.from(all).map(el => ({
                                id: (el as HTMLElement).dataset.layoutId || '',
                                el: el as HTMLElement
                            }));
                            setElementsList(list);
                        }}
                        className="text-[9px] text-blue-500 hover:text-blue-700"
                    >
                        <i className="fa-solid fa-sync"></i> Refresh
                    </button>
                </div>
                <select
                    className="w-full text-xs border border-gray-200 rounded p-1.5 bg-gray-50 outline-none focus:border-blue-500"
                    onFocus={() => {
                        const all = document.querySelectorAll('[data-layout-id]');
                        const list = Array.from(all).map(el => ({
                            id: (el as HTMLElement).dataset.layoutId || '',
                            el: el as HTMLElement
                        }));
                        setElementsList(list);
                    }}
                    onChange={(e) => {
                        const selected = elementsList.find(item => item.id === e.target.value);
                        if (selected) selectElement(selected.el);
                    }}
                    value={activeElement?.dataset.layoutId || ''}
                >
                    <option value="">-- Choisir un élément --</option>
                    {elementsList.map(item => (
                        <option key={item.id} value={item.id}>
                            {item.id}
                        </option>
                    ))}
                </select>
            </div>

            {/* QUICK SELECT REMOVED AS REQUESTED */}

            {/* INVISIBLE ELEMENTS HINT */}
            <div className="mb-2 text-[10px] text-gray-500 italic text-center">
                Les éléments invisibles ou vides apparaîtront en orange au survol.
            </div>

            {/* CONTROLS */}
            {activeElement ? (
                <div className="space-y-4 animate-fade-in bg-gray-50/50 p-3 rounded-lg border border-gray-100">
                    <div className="text-[10px] text-gray-500 break-all font-mono mb-2 bg-white p-1 rounded border border-gray-100">
                        {getElementSelector(activeElement)}
                    </div>

                    {[
                        { label: 'Horizontale (X)', val: offsetX, set: setOffsetX, min: -2000, max: 2000, step: 1 },
                        { label: 'Verticale (Y)', val: offsetY, set: setOffsetY, min: -2000, max: 2000, step: 1 },
                        { label: 'Zoom (Scale)', val: scale, set: setScale, min: 0.1, max: 2.5, step: 0.05 },
                    ].map(ctrl => (
                        <div key={ctrl.label}>
                            <div className="flex justify-between text-xs mb-1 font-bold text-gray-700">
                                <span>{ctrl.label}</span>
                                <div className="flex gap-2 items-center">
                                    <button onClick={() => ctrl.set(ctrl.label.includes('Zoom') ? 1 : 0)} className="text-[9px] bg-gray-200 hover:bg-gray-300 px-1.5 rounded text-gray-600">Reset</button>
                                    <span className="w-10 text-right">{ctrl.val.toFixed(2).replace(/[.,]00$/, '')}</span>
                                </div>
                            </div>
                            <input
                                type="range"
                                min={ctrl.min} max={ctrl.max} step={ctrl.step}
                                value={ctrl.val}
                                onChange={(e) => ctrl.set(Number(e.target.value))}
                                className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-gray-900"
                            />
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-8 text-gray-400 text-xs italic border-2 border-dashed border-gray-100 rounded-lg bg-gray-50/30">
                    <div className="mb-2"><i className="fa-solid fa-arrow-pointer text-gray-300 text-xl"></i></div>
                    Cliquez sur un élément<br />ou utilisez <span className="font-bold border border-gray-300 rounded px-1 text-gray-500 bg-white">Ctrl + I</span>
                </div>
            )}

            {/* FOOTER ACTIONS */}
            <div className="mt-4 pt-3 border-t border-gray-100 flex gap-2">
                <button
                    onClick={() => {
                        const json = JSON.stringify({ mobile: mobileAdjustments, desktop: desktopAdjustments }, null, 2);
                        navigator.clipboard.writeText(json);
                        alert("Config complète (Mobile + Desktop) copiée !");
                    }}
                    className="flex-1 py-2 bg-gray-800 text-white rounded-lg text-xs font-bold hover:bg-black transition-colors flex items-center justify-center gap-2 shadow-sm"
                >
                    <i className="fa-solid fa-code"></i> Export JSON
                </button>
                <button
                    onClick={() => {
                        if (confirm("Réinitialiser toute la mise en page ?")) {
                            localStorage.removeItem('layout_adjustments_v5_mobile');
                            localStorage.removeItem('layout_adjustments_v5_desktop');
                            window.location.reload();
                        }
                    }}
                    className="w-10 flex items-center justify-center bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                    title="Réinitialiser (Reset)"
                >
                    <i className="fa-solid fa-trash"></i>
                </button>
            </div>
        </div>
    );
};
