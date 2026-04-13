---
description: Install the Draggable Layout Editor V3 (Inspector & Visual Editor) into a React project.
---

# Install Layout Editor V3

This workflow installs the `LayoutEditor` component, which allows visual inspection, drag-and-drop dragging of the editor window, and live CSS transform adjustments (X, Y, Scale) of any element on the page.

## 1. Create the Component

Create the file `src/components/LayoutEditor.tsx`:

```tsx
import React, { useState, useEffect } from 'react';

interface LayoutEditorProps {
    isAdmin: boolean;
}

export const LayoutEditor: React.FC<LayoutEditorProps> = ({ isAdmin }) => {
    const [isEnabled, setIsEnabled] = useState(false);
    const [isInspectMode, setIsInspectMode] = useState(false);
    const [activeElement, setActiveElement] = useState<HTMLElement | null>(null);
    const [offsetY, setOffsetY] = useState(0);
    const [offsetX, setOffsetX] = useState(0);
    const [scale, setScale] = useState(1);
    const [savedAdjustments, setSavedAdjustments] = useState<Record<string, { x?: number, y: number, scale: number }>>({});

    // --- CONFIGURATION ---
    // Add IDs here that you want to be able to "Quick Select" without clicking
    const KNOWN_IDS = [
        { id: 'app-main', label: 'Main Container' },
        // { id: 'header', label: 'Header' }, 
        // { id: 'footer', label: 'Footer' }, 
    ];

    // Load saved adjustments on mount
    useEffect(() => {
        try {
            const saved = localStorage.getItem('layout_adjustments_v2');
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
    const applyAdjustments = (adjustments: Record<string, { x?: number, y: number, scale: number }>) => {
        Object.entries(adjustments).forEach(([selector, { x, y, scale }]) => {
            const el = document.querySelector(selector) as HTMLElement;
            if (el) {
                el.style.transform = `translate(${x || 0}px, ${y}px) scale(${scale})`;
            }
        });
    };

    // Re-apply periodically (for dynamic content)
    useEffect(() => {
        const interval = setInterval(() => {
            applyAdjustments(savedAdjustments);
        }, 1000);
        return () => clearInterval(interval);
    }, [savedAdjustments]);


    // Inspection Logic
    useEffect(() => {
        if (!isEnabled || !isInspectMode) {
            document.body.style.cursor = '';
            return;
        }

        const handleMouseOver = (e: MouseEvent) => {
            if (!isInspectMode) return;
            e.stopPropagation();

            let target = e.target as HTMLElement;
            // PREFER Layout ID Container if available
            const layoutContainer = target.closest('[data-layout-id]') as HTMLElement;
            if (layoutContainer) target = layoutContainer;

            target.style.outline = "4px solid #f97316";
            target.style.cursor = "crosshair";
            target.style.boxShadow = "0 0 20px rgba(249, 115, 22, 0.5)";
        };

        const handleMouseOut = (e: MouseEvent) => {
            let target = e.target as HTMLElement;
            const layoutContainer = target.closest('[data-layout-id]') as HTMLElement;
            if (layoutContainer) target = layoutContainer;

            if (target !== activeElement) {
                target.style.outline = "";
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

            setActiveElement(target);
            setIsInspectMode(false);
            document.body.style.cursor = '';

            // Clean previous outlines
            document.querySelectorAll('*').forEach(el => {
                if (el !== target) {
                    (el as HTMLElement).style.outline = "";
                    (el as HTMLElement).style.boxShadow = "";
                }
            });

            // Load values
            const id = getElementSelector(target);
            if (savedAdjustments[id]) {
                setOffsetY(savedAdjustments[id].y);
                setOffsetX(savedAdjustments[id].x || 0);
                setScale(savedAdjustments[id].scale ?? 1);
            } else {
                setOffsetY(0);
                setOffsetX(0);
                setScale(1);
            }
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
    }, [isEnabled, isInspectMode, activeElement, savedAdjustments]);

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
            activeElement.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
            activeElement.style.outline = "2px solid red";

            const selector = getElementSelector(activeElement);
            const newAdjustments = { ...savedAdjustments, [selector]: { x: offsetX, y: offsetY, scale } };
            setSavedAdjustments(newAdjustments);
            localStorage.setItem('layout_adjustments_v2', JSON.stringify(newAdjustments));
        }
        return () => {
            if (activeElement) activeElement.style.outline = "";
        };
    }, [offsetX, offsetY, scale, activeElement]);

    const handleManualSelect = (id: string) => {
        const el = document.querySelector(`[data-layout-id="${id}"]`) as HTMLElement;
        if (el) {
            setActiveElement(el);
            setIsInspectMode(false);
            el.style.outline = "2px solid red";
            if (savedAdjustments[`[data-layout-id="${id}"]`]) {
                const saved = savedAdjustments[`[data-layout-id="${id}"]`];
                setOffsetY(saved.y);
                setOffsetX(saved.x || 0);
                setScale(saved.scale ?? 1);
            } else {
                setOffsetY(0);
                setOffsetX(0);
                setScale(1);
            }
        } else {
            alert(`Element "${id}" not found.`);
        }
    };

    const [editorPos, setEditorPos] = useState({ x: window.innerWidth - 340, y: 20 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

    useEffect(() => {
        const handleResize = () => {
            if (editorPos.x > window.innerWidth - 100) {
                setEditorPos(p => ({ ...p, x: window.innerWidth - 340 }));
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [editorPos.x]);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging) return;
            setEditorPos({ x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y });
        };
        const handleMouseUp = () => setIsDragging(false);

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, dragOffset]);

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        setDragOffset({ x: e.clientX - editorPos.x, y: e.clientY - editorPos.y });
    };

    if (!isAdmin) return null;

    if (!isEnabled) {
        return (
            <div className="fixed top-4 right-4 z-[9999]">
                <button
                    onClick={() => { setIsEnabled(true); setEditorPos({ x: window.innerWidth - 340, y: 20 }); }}
                    className="bg-gray-900 text-white px-4 py-2 rounded-full text-xs font-bold shadow-xl border border-gray-700 hover:bg-black transition-all flex items-center gap-2"
                >
                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                    ADMIN EDITOR
                </button>
            </div>
        );
    }

    return (
        <div
            className="fixed z-[9999] bg-white/95 backdrop-blur shadow-2xl border border-gray-200 rounded-xl p-4 w-72 transition-shadow font-sans text-gray-800"
            style={{ left: editorPos.x, top: editorPos.y }}
        >
            <div
                className="flex items-center justify-between mb-4 border-b pb-2 cursor-move select-none"
                onMouseDown={handleMouseDown}
                title="Drag to move"
            >
                <div className="flex items-center gap-2 pointer-events-none">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    <h3 className="font-black text-xs uppercase tracking-widest">Layout Editor</h3>
                </div>
                <button onMouseDown={(e) => e.stopPropagation()} onClick={() => { setIsEnabled(false); if (activeElement) activeElement.style.outline = ""; setActiveElement(null); }} className="text-gray-400 hover:text-red-500">
                    <i className="fa-solid fa-times"></i>
                </button>
            </div>

            {KNOWN_IDS.length > 0 && (
                <>
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Quick Select</p>
                    <div className="mb-4 grid grid-cols-2 gap-2">
                        {KNOWN_IDS.map(item => (
                            <button
                                key={item.id}
                                onClick={() => handleManualSelect(item.id)}
                                className={`text-[10px] font-bold px-2 py-1.5 rounded border transition-colors truncate ${activeElement?.dataset.layoutId === item.id ? 'bg-orange-500 text-white border-orange-600' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                                title={item.id}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>
                </>
            )}

            <div className="mb-4 border-b border-gray-100 pb-4">
                <button
                    onClick={() => { setIsInspectMode(!isInspectMode); setActiveElement(null); }}
                    className={`w-full py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${isInspectMode ? 'bg-orange-500 text-white shadow-lg ring-2 ring-orange-200' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                    <i className={`fa-solid ${isInspectMode ? 'fa-crosshairs fa-spin' : 'fa-arrow-pointer'}`}></i>
                    {isInspectMode ? 'INSPECTING...' : 'MANUAL SELECT'}
                </button>
                <p className="text-[10px] text-gray-400 text-center mt-1">
                    {isInspectMode ? 'Click an element to edit' : (activeElement ? `Selected: ${getElementSelector(activeElement)}` : 'No selection')}
                </p>
            </div>

            {activeElement ? (
                <div className="space-y-4 animate-fade-in">
                    <div className="bg-gray-50 p-2 rounded border border-gray-200 text-[10px] text-gray-500 break-all font-mono mb-2">
                        {getElementSelector(activeElement)}
                    </div>
                    <div>
                        <div className="flex justify-between text-xs mb-1 font-bold text-gray-700">
                            <span>X (Horizontal)</span>
                            <div className="flex gap-2">
                                <button className="text-[9px] bg-gray-200 px-1 rounded hover:bg-gray-300" onClick={() => setOffsetX(0)}>Reset</button>
                            </div>
                            <span>{offsetX}px</span>
                        </div>
                        <input type="range" min="-500" max="500" value={offsetX} onChange={(e) => setOffsetX(Number(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-500" />
                    </div>
                    <div>
                        <div className="flex justify-between text-xs mb-1 font-bold text-gray-700">
                            <span>Y (Vertical)</span>
                            <span>{offsetY}px</span>
                        </div>
                        <input type="range" min="-500" max="500" value={offsetY} onChange={(e) => setOffsetY(Number(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-500" />
                    </div>
                    <div>
                        <div className="flex justify-between text-xs mb-1 font-bold text-gray-700">
                            <span>Scale (Zoom)</span>
                            <span>{scale.toFixed(2)}x</span>
                        </div>
                        <input type="range" min="0.1" max="2.5" step="0.05" value={scale} onChange={(e) => setScale(Number(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500" />
                    </div>
                </div>
            ) : (
                <div className="text-center py-6 text-gray-400 text-sm italic border-dashed border-2 border-gray-100 rounded-lg">Select an element to edit.</div>
            )}

            <div className="mt-6 pt-4 border-t border-gray-100">
                <button
                    onClick={() => {
                        const json = JSON.stringify(savedAdjustments, null, 2);
                        navigator.clipboard.writeText(json);
                        alert("Config copied to clipboard!");
                    }}
                    className="w-full py-2 bg-gray-800 text-white rounded-lg text-xs font-bold hover:bg-black transition-colors flex items-center justify-center gap-2 shadow-lg"
                >
                    <i className="fa-solid fa-floppy-disk"></i>
                    Export JSON
                </button>
            </div>
        </div>
    );
};
```

## 2. Mount in App.tsx

Add the component to your main `App.tsx` or `Layout.tsx` and pass `isAdmin={true}` (or link it to your auth logic).

```tsx
import { LayoutEditor } from './components/LayoutEditor';

function App() {
  return (
    <>
      {/* ... your app content ... */}
      
      <LayoutEditor isAdmin={true} /> 
    </>
  );
}
```

## 3. Usage

1. Click **"ADMIN EDITOR"** (top right).
2. Click **"MANUAL SELECT"** and click any element on the page.
3. Use the **Sliders** to move/resize it.
4. **Export JSON** to get the changes.
5. Apply changes permanently in your CSS or Code.
