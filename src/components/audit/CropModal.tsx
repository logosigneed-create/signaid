import React, { useState, useRef, useEffect, useCallback } from 'react';
import { BtpLogo } from '../../types/audit';

export interface CropModalProps {
    isOpen: boolean;
    targetSlot: 'A' | 'B';
    logoA: BtpLogo;
    logoB: BtpLogo;
    onConfirm: (croppedBase64: string, targetSlot: 'A' | 'B') => void;
    onClose: () => void;
}

export const CropModal: React.FC<CropModalProps> = ({
    isOpen,
    targetSlot,
    logoA,
    logoB,
    onConfirm,
    onClose
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const imgRef = useRef<HTMLImageElement>(null);
    const eraserCanvasRef = useRef<HTMLCanvasElement>(null);
    const timeoutsRef = useRef<number[]>([]);

    const [cropMethod, setCropMethod] = useState<'rect' | 'poly' | 'eraser'>('rect');
    const [sourceSlot, setSourceSlot] = useState<'A' | 'B'>(() => {
        if (targetSlot === 'A') return logoA.original ? 'A' : 'B';
        return logoB.original ? 'B' : (logoA.original ? 'A' : 'B');
    });
    const [poly, setPoly] = useState<{ x: number; y: number }[]>([]);
    const [dragIdx, setDragIdx] = useState<number | null>(null);

    // Eraser state
    const [brushSize, setBrushSize] = useState(24);
    const [isErasing, setIsErasing] = useState(false);
    const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);

    const activeLogo = sourceSlot === 'A' ? logoA : logoB;
    const activeMode = activeLogo?.original ? activeLogo.mode : 'original';
    const defaultBg = (activeMode === 'adapted') ? 'black' : 'transparent';
    const [cropBg, setCropBg] = useState<'transparent' | 'white' | 'black'>(defaultBg);

    const setSafeTimeout = (fn: () => void, ms: number) => {
        const id = window.setTimeout(fn, ms);
        timeoutsRef.current.push(id);
        return id;
    };

    // Update source slot when modal opens or targetSlot changes
    useEffect(() => {
        if (isOpen) {
            if (targetSlot === 'A') {
                setSourceSlot(logoA.original ? 'A' : (logoB.original ? 'B' : 'A'));
            } else {
                setSourceSlot(logoB.original ? 'B' : (logoA.original ? 'A' : 'B'));
            }
        }
    }, [isOpen, targetSlot, logoA.original, logoB.original]);

    // Memory Cleanup on Unmount
    useEffect(() => {
        return () => {
            // 1. Clear scheduled timeouts
            timeoutsRef.current.forEach(id => window.clearTimeout(id));
            timeoutsRef.current = [];

            // 2. Clear canvas contexts and reset dimensions
            if (eraserCanvasRef.current) {
                const ctx = eraserCanvasRef.current.getContext('2d');
                if (ctx) {
                    ctx.clearRect(0, 0, eraserCanvasRef.current.width, eraserCanvasRef.current.height);
                }
                eraserCanvasRef.current.width = 0;
                eraserCanvasRef.current.height = 0;
            }

            // 3. Clear image reference to prevent Base64 memory leak
            if (imgRef.current) {
                imgRef.current.onload = null;
                imgRef.current.onerror = null;
                imgRef.current.src = '';
            }
        };
    }, []);

    const getActiveSourceSrc = useCallback(() => {
        const targetLogo = sourceSlot === 'A' ? (logoA.original ? logoA : logoB) : (logoB.original ? logoB : logoA);
        if (!targetLogo || !targetLogo.original) return '';
        if (targetLogo.mode === 'remastered') return targetLogo.remastered || targetLogo.adapted || targetLogo.original;
        if (targetLogo.mode === 'adapted') return targetLogo.adapted || targetLogo.original;
        return targetLogo.original;
    }, [sourceSlot, logoA, logoB]);

    const initBox = useCallback((type: 'rect' | 'square' | 'full' | 'inset') => {
        if (!imgRef.current || !containerRef.current) return;
        const rect = imgRef.current.getBoundingClientRect();
        const contRect = containerRef.current.getBoundingClientRect();
        const offsetX = rect.left - contRect.left;
        const offsetY = rect.top - contRect.top;
        const w = rect.width;
        const h = rect.height;

        if (type === 'full') {
            setPoly([
                { x: offsetX, y: offsetY },
                { x: offsetX + w, y: offsetY },
                { x: offsetX + w, y: offsetY + h },
                { x: offsetX, y: offsetY + h }
            ]);
        } else if (type === 'square') {
            const size = Math.min(w, h) * 0.8;
            const startX = offsetX + (w - size) / 2;
            const startY = offsetY + (h - size) / 2;
            setPoly([
                { x: startX, y: startY },
                { x: startX + size, y: startY },
                { x: startX + size, y: startY + size },
                { x: startX, y: startY + size }
            ]);
        } else {
            const insetX = w * (type === 'inset' ? 0.15 : 0.05);
            const insetY = h * (type === 'inset' ? 0.15 : 0.05);
            setPoly([
                { x: offsetX + insetX, y: offsetY + insetY },
                { x: offsetX + w - insetX, y: offsetY + insetY },
                { x: offsetX + w - insetX, y: offsetY + h - insetY },
                { x: offsetX + insetX, y: offsetY + h - insetY }
            ]);
        }
    }, []);

    const initPoly = useCallback(() => {
        initBox('rect');
    }, [initBox]);

    const initEraserCanvas = useCallback(() => {
        const canvas = eraserCanvasRef.current;
        const img = imgRef.current;
        if (!canvas || !img) return;
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
        }
    }, []);

    const getPos = (e: React.MouseEvent | React.TouchEvent) => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return { x: 0, y: 0 };
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        return { x: clientX - rect.left, y: clientY - rect.top };
    };

    // Poly & Rect drag handlers
    const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
        if (poly.length !== 4) return;
        const pos = getPos(e);
        let closestIdx = -1;
        let minDist = 40;
        poly.forEach((p, i) => {
            const d = Math.hypot(p.x - pos.x, p.y - pos.y);
            if (d < minDist) { minDist = d; closestIdx = i; }
        });
        if (closestIdx !== -1) {
            e.preventDefault();
            setDragIdx(closestIdx);
        }
    };

    const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
        if (dragIdx === null) return;
        e.preventDefault();
        const pos = getPos(e);
        
        if (cropMethod === 'rect') {
            setPoly(prev => {
                const next = [...prev];
                const current = pos;
                if (dragIdx === 0) { // Top-Left
                    next[0] = current;
                    next[1] = { x: next[1].x, y: current.y };
                    next[3] = { x: current.x, y: next[3].y };
                } else if (dragIdx === 1) { // Top-Right
                    next[1] = current;
                    next[0] = { x: next[0].x, y: current.y };
                    next[2] = { x: current.x, y: next[2].y };
                } else if (dragIdx === 2) { // Bottom-Right
                    next[2] = current;
                    next[3] = { x: next[3].x, y: current.y };
                    next[1] = { x: current.x, y: next[1].y };
                } else if (dragIdx === 3) { // Bottom-Left
                    next[3] = current;
                    next[2] = { x: next[2].x, y: current.y };
                    next[0] = { x: current.x, y: next[0].y };
                }
                return next;
            });
        } else {
            setPoly(prev => {
                const next = [...prev];
                next[dragIdx] = pos;
                return next;
            });
        }
    };

    const handleEnd = () => setDragIdx(null);

    // Eraser handlers
    const handleEraserStart = (e: React.MouseEvent | React.TouchEvent) => {
        const canvas = eraserCanvasRef.current;
        if (!canvas) return;
        e.preventDefault();
        setIsErasing(true);

        const rect = canvas.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const x = (clientX - rect.left) * scaleX;
        const y = (clientY - rect.top) * scaleY;

        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.beginPath();
            ctx.globalCompositeOperation = 'destination-out';
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.lineWidth = brushSize * scaleX;
            ctx.moveTo(x, y);
            ctx.lineTo(x, y);
            ctx.stroke();
        }
    };

    const handleEraserMove = (e: React.MouseEvent | React.TouchEvent) => {
        const canvas = eraserCanvasRef.current;
        if (!canvas) return;
        e.preventDefault();

        const rect = canvas.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        
        setCursorPos({
            x: clientX - rect.left,
            y: clientY - rect.top
        });

        if (!isErasing) return;

        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const x = (clientX - rect.left) * scaleX;
        const y = (clientY - rect.top) * scaleY;

        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.globalCompositeOperation = 'destination-out';
            ctx.lineTo(x, y);
            ctx.stroke();
        }
    };

    const handleEraserHover = (e: React.MouseEvent | React.TouchEvent) => {
        const canvas = eraserCanvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        setCursorPos({
            x: clientX - rect.left,
            y: clientY - rect.top
        });
    };

    const handleEraserEnd = () => setIsErasing(false);

    const trimCanvas = (c: HTMLCanvasElement): HTMLCanvasElement => {
        const ctx = c.getContext('2d')!;
        const width = c.width;
        const height = c.height;
        const imgData = ctx.getImageData(0, 0, width, height);
        const data = imgData.data;

        let minX = width, minY = height, maxX = 0, maxY = 0;
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const alpha = data[(y * width + x) * 4 + 3];
                if (alpha > 0) {
                    if (x < minX) minX = x;
                    if (y < minY) minY = y;
                    if (x > maxX) maxX = x;
                    if (y > maxY) maxY = y;
                }
            }
        }
        if (maxX < minX || maxY < minY) return c;

        const trimmedWidth = maxX - minX + 1;
        const trimmedHeight = maxY - minY + 1;
        const trimmedCanvas = document.createElement('canvas');
        trimmedCanvas.width = trimmedWidth;
        trimmedCanvas.height = trimmedHeight;
        const trimmedCtx = trimmedCanvas.getContext('2d')!;
        trimmedCtx.drawImage(c, minX, minY, trimmedWidth, trimmedHeight, 0, 0, trimmedWidth, trimmedHeight);
        return trimmedCanvas;
    };

    const confirmCrop = () => {
        if (!imgRef.current || !containerRef.current || poly.length !== 4) return;
        const img = imgRef.current;
        const rect = img.getBoundingClientRect();
        const contRect = containerRef.current.getBoundingClientRect();
        
        const scaleX = img.naturalWidth / rect.width;
        const scaleY = img.naturalHeight / rect.height;

        const imgPoints = poly.map(p => {
            const offsetX = rect.left - contRect.left;
            const offsetY = rect.top - contRect.top;
            return {
                x: (p.x - offsetX) * scaleX,
                y: (p.y - offsetY) * scaleY
            };
        });

        const minX = Math.max(0, Math.min(...imgPoints.map(p => p.x)));
        const minY = Math.max(0, Math.min(...imgPoints.map(p => p.y)));
        const maxX = Math.min(img.naturalWidth, Math.max(...imgPoints.map(p => p.x)));
        const maxY = Math.min(img.naturalHeight, Math.max(...imgPoints.map(p => p.y)));

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(10, maxX - minX);
        canvas.height = Math.max(10, maxY - minY);
        const ctx = canvas.getContext('2d')!;

        ctx.beginPath();
        ctx.moveTo(imgPoints[0].x - minX, imgPoints[0].y - minY);
        ctx.lineTo(imgPoints[1].x - minX, imgPoints[1].y - minY);
        ctx.lineTo(imgPoints[2].x - minX, imgPoints[2].y - minY);
        ctx.lineTo(imgPoints[3].x - minX, imgPoints[3].y - minY);
        ctx.closePath();
        ctx.clip();

        ctx.drawImage(img, -minX, -minY);
        const croppedBase64 = canvas.toDataURL('image/png');

        // Explicit canvas cleanup
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        canvas.width = 0;
        canvas.height = 0;

        onConfirm(croppedBase64, targetSlot);
    };

    const confirmEraser = () => {
        const canvas = eraserCanvasRef.current;
        if (!canvas) return;
        const trimmedCanvas = trimCanvas(canvas);
        const base64 = trimmedCanvas.toDataURL('image/png');
        
        // Explicit canvas cleanup
        const tCtx = trimmedCanvas.getContext('2d');
        if (tCtx) tCtx.clearRect(0, 0, trimmedCanvas.width, trimmedCanvas.height);
        trimmedCanvas.width = 0;
        trimmedCanvas.height = 0;

        onConfirm(base64, targetSlot);
    };

    if (!isOpen || (!logoA.original && !logoB.original)) {
        return null;
    }

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.94)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1rem', backdropFilter: 'blur(8px)' }}>
            {/* Header Badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap', justifyContent: 'center', zIndex: 10 }}>
                <div style={{ background: '#ea580c', color: '#000', padding: '0.35rem 0.9rem', borderRadius: '6px', fontWeight: 900, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    🎯 Destination : LOGO {targetSlot} {targetSlot === 'A' ? '(Dos / Grand Format)' : '(Cœur / Poitrine)'}
                </div>

                {logoA.original && logoB.original && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(255,255,255,0.06)', padding: '0.25rem 0.6rem', borderRadius: '6px' }}>
                        <span style={{ color: '#aaa', fontSize: '0.65rem', fontWeight: 700 }}>Source :</span>
                        <button
                            onClick={() => { setSourceSlot('A'); setSafeTimeout(initPoly, 100); }}
                            style={{
                                padding: '0.2rem 0.6rem',
                                background: sourceSlot === 'A' ? '#ea580c' : 'rgba(255,255,255,0.1)',
                                color: sourceSlot === 'A' ? '#000' : '#fff',
                                border: 'none',
                                borderRadius: '3px',
                                fontSize: '0.65rem',
                                fontWeight: 800,
                                cursor: 'pointer'
                            }}
                        >
                            Logo A
                        </button>
                        <button
                            onClick={() => { setSourceSlot('B'); setSafeTimeout(initPoly, 100); }}
                            style={{
                                padding: '0.2rem 0.6rem',
                                background: sourceSlot === 'B' ? '#ea580c' : 'rgba(255,255,255,0.1)',
                                color: sourceSlot === 'B' ? '#000' : '#fff',
                                border: 'none',
                                borderRadius: '3px',
                                fontSize: '0.65rem',
                                fontWeight: 800,
                                cursor: 'pointer'
                            }}
                        >
                            Logo B
                        </button>
                    </div>
                )}
            </div>

            {/* Toggle method selector */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', zIndex: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
                <button
                    onClick={() => {
                        setCropMethod('rect');
                        setSafeTimeout(() => initBox('rect'), 50);
                    }}
                    style={{
                        padding: '0.55rem 1.4rem',
                        background: cropMethod === 'rect' ? '#ea580c' : 'rgba(255,255,255,0.06)',
                        color: cropMethod === 'rect' ? '#000' : '#fff',
                        border: 'none',
                        fontWeight: 900,
                        fontSize: '0.7rem',
                        textTransform: 'uppercase',
                        cursor: 'pointer',
                        borderRadius: '4px',
                        transition: 'all 0.2s'
                    }}
                >
                    📐 Recadrage Simple
                </button>
                <button
                    onClick={() => {
                        setCropMethod('poly');
                        setSafeTimeout(() => initBox('rect'), 50);
                    }}
                    style={{
                        padding: '0.55rem 1.4rem',
                        background: cropMethod === 'poly' ? '#ea580c' : 'rgba(255,255,255,0.06)',
                        color: cropMethod === 'poly' ? '#000' : '#fff',
                        border: 'none',
                        fontWeight: 900,
                        fontSize: '0.7rem',
                        textTransform: 'uppercase',
                        cursor: 'pointer',
                        borderRadius: '4px',
                        transition: 'all 0.2s'
                    }}
                >
                    ✂️ Découpe Libre (4 points)
                </button>
                <button
                    onClick={() => {
                        setCropMethod('eraser');
                        setSafeTimeout(initEraserCanvas, 100);
                    }}
                    style={{
                        padding: '0.55rem 1.4rem',
                        background: cropMethod === 'eraser' ? '#ea580c' : 'rgba(255,255,255,0.06)',
                        color: cropMethod === 'eraser' ? '#000' : '#fff',
                        border: 'none',
                        fontWeight: 900,
                        fontSize: '0.7rem',
                        textTransform: 'uppercase',
                        cursor: 'pointer',
                        borderRadius: '4px',
                        transition: 'all 0.2s'
                    }}
                >
                    🧹 Gomme (Effacer des zones)
                </button>
            </div>

            {/* Options & Presets Bar */}
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', justifyContent: 'center', zIndex: 10 }}>
                {cropMethod === 'rect' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(255,255,255,0.04)', padding: '0.35rem 0.75rem', borderRadius: '6px' }}>
                        <span style={{ color: '#aaa', fontSize: '0.65rem', fontWeight: 700 }}>Préréglages :</span>
                        <button onClick={() => initBox('square')} style={{ padding: '0.2rem 0.5rem', background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', borderRadius: '3px', fontSize: '0.65rem', fontWeight: 800, cursor: 'pointer' }}>Carré (1:1)</button>
                        <button onClick={() => initBox('inset')} style={{ padding: '0.2rem 0.5rem', background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', borderRadius: '3px', fontSize: '0.65rem', fontWeight: 800, cursor: 'pointer' }}>Centre (80%)</button>
                        <button onClick={() => initBox('full')} style={{ padding: '0.2rem 0.5rem', background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', borderRadius: '3px', fontSize: '0.65rem', fontWeight: 800, cursor: 'pointer' }}>Plein écran</button>
                    </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fff', fontSize: '0.75rem', background: 'rgba(255,255,255,0.04)', padding: '0.35rem 0.75rem', borderRadius: '6px' }}>
                    <span style={{ opacity: 0.8, fontSize: '0.65rem', fontWeight: 700 }}>Fond :</span>
                    <button onClick={() => setCropBg('white')} style={{ padding: '0.2rem 0.5rem', background: cropBg === 'white' ? '#ea580c' : 'rgba(255,255,255,0.1)', color: cropBg === 'white' ? '#000' : '#fff', border: 'none', borderRadius: '3px', fontSize: '0.65rem', fontWeight: 850, cursor: 'pointer' }}>Blanc</button>
                    <button onClick={() => setCropBg('black')} style={{ padding: '0.2rem 0.5rem', background: cropBg === 'black' ? '#ea580c' : 'rgba(255,255,255,0.1)', color: cropBg === 'black' ? '#000' : '#fff', border: 'none', borderRadius: '3px', fontSize: '0.65rem', fontWeight: 850, cursor: 'pointer' }}>Noir</button>
                    <button onClick={() => setCropBg('transparent')} style={{ padding: '0.2rem 0.5rem', background: cropBg === 'transparent' ? '#ea580c' : 'rgba(255,255,255,0.1)', color: cropBg === 'transparent' ? '#000' : '#fff', border: 'none', borderRadius: '3px', fontSize: '0.65rem', fontWeight: 850, cursor: 'pointer' }}>Damier</button>
                </div>
            </div>

            {/* Eraser controls */}
            {cropMethod === 'eraser' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: '#fff', fontSize: '0.75rem', marginBottom: '1rem', background: 'rgba(255,255,255,0.04)', padding: '0.4rem 1rem', borderRadius: '6px' }}>
                    <span>Taille de gomme :</span>
                    <input
                        type="range"
                        min={5}
                        max={100}
                        value={brushSize}
                        onChange={(e) => setBrushSize(Number(e.target.value))}
                        style={{ accentColor: '#ea580c', cursor: 'pointer' }}
                    />
                    <span style={{ fontWeight: 800, minWidth: '35px' }}>{brushSize}px</span>
                    <button
                        onClick={initEraserCanvas}
                        style={{
                            marginLeft: '1rem',
                            padding: '0.25rem 0.7rem',
                            background: 'rgba(255,255,255,0.1)',
                            border: '1px solid rgba(255,255,255,0.15)',
                            color: '#fff',
                            fontSize: '0.65rem',
                            fontWeight: 800,
                            textTransform: 'uppercase',
                            cursor: 'pointer',
                            borderRadius: '3px'
                        }}
                    >
                        Réinitialiser
                    </button>
                </div>
            )}

            {/* Canvas / Image Interaction Area */}
            <div
                ref={containerRef}
                style={{ position: 'relative', width: '90vw', height: '56vh', cursor: dragIdx !== null ? 'grabbing' : 'default', userSelect: 'none', touchAction: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                onMouseDown={(cropMethod === 'poly' || cropMethod === 'rect') ? handleStart : undefined}
                onMouseMove={(cropMethod === 'poly' || cropMethod === 'rect') ? handleMove : undefined}
                onMouseUp={(cropMethod === 'poly' || cropMethod === 'rect') ? handleEnd : undefined}
                onMouseLeave={(cropMethod === 'poly' || cropMethod === 'rect') ? handleEnd : undefined}
                onTouchStart={(cropMethod === 'poly' || cropMethod === 'rect') ? handleStart : undefined}
                onTouchMove={(cropMethod === 'poly' || cropMethod === 'rect') ? handleMove : undefined}
                onTouchEnd={(cropMethod === 'poly' || cropMethod === 'rect') ? handleEnd : undefined}
            >
                <img
                    ref={imgRef}
                    onLoad={initPoly}
                    src={getActiveSourceSrc()}
                    crossOrigin="anonymous"
                    style={{ 
                        maxWidth: '100%', 
                        maxHeight: '100%', 
                        objectFit: 'contain', 
                        display: (cropMethod === 'poly' || cropMethod === 'rect') ? 'block' : 'none', 
                        background: cropBg === 'transparent' 
                            ? 'repeating-conic-gradient(#808080 0% 25%, transparent 0% 50%) 50% / 20px 20px' 
                            : cropBg 
                    }}
                    draggable={false}
                    alt="Source logo crop"
                />
                
                {(cropMethod === 'poly' || cropMethod === 'rect') && (
                    <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 10 }}>
                        <defs>
                            <mask id="poly-mask-audit">
                                <rect width="100%" height="100%" fill="white" />
                                {poly.length === 4 && <polygon points={poly.map(p => `${p.x},${p.y}`).join(' ')} fill="black" />}
                            </mask>
                        </defs>
                        <rect width="100%" height="100%" fill="rgba(0,0,0,0.75)" mask="url(#poly-mask-audit)" />
                        {poly.length === 4 && (
                            <>
                                <polygon points={poly.map(p => `${p.x},${p.y}`).join(' ')} fill="transparent" stroke="#ea580c" strokeWidth={2} strokeDasharray={cropMethod === 'rect' ? 'none' : '4 4'} />
                                {poly.map((p, i) => (
                                    <circle key={i} cx={p.x} cy={p.y} r={12} fill="#ea580c" stroke="white" strokeWidth={3} style={{ pointerEvents: 'all', cursor: 'grab' }} />
                                ))}
                            </>
                        )}
                    </svg>
                )}

                {cropMethod === 'eraser' && (
                    <div 
                        style={{ position: 'relative' }}
                        onMouseMove={handleEraserHover}
                        onMouseLeave={() => setCursorPos(null)}
                    >
                        <canvas
                            ref={eraserCanvasRef}
                            onMouseDown={handleEraserStart}
                            onMouseMove={handleEraserMove}
                            onMouseUp={handleEraserEnd}
                            onMouseLeave={handleEraserEnd}
                            onTouchStart={handleEraserStart}
                            onTouchMove={handleEraserMove}
                            onTouchEnd={handleEraserEnd}
                            style={{
                                maxWidth: '90vw',
                                maxHeight: '56vh',
                                objectFit: 'contain',
                                display: 'block',
                                background: cropBg === 'transparent' 
                                    ? 'repeating-conic-gradient(#808080 0% 25%, transparent 0% 50%) 50% / 20px 20px' 
                                    : cropBg,
                                cursor: 'crosshair',
                                touchAction: 'none'
                            }}
                        />
                        {cursorPos && (
                            <div style={{
                                position: 'absolute',
                                left: cursorPos.x - brushSize / 2,
                                top: cursorPos.y - brushSize / 2,
                                width: brushSize,
                                height: brushSize,
                                borderRadius: '50%',
                                border: '2px solid rgba(234, 88, 12, 0.9)',
                                backgroundColor: 'rgba(234, 88, 12, 0.25)',
                                pointerEvents: 'none',
                                zIndex: 20
                            }} />
                        )}
                    </div>
                )}
            </div>

            {/* Actions Bar */}
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.2rem' }}>
                <button
                    onClick={onClose}
                    style={{ padding: '0.7rem 1.8rem', background: 'transparent', border: '1px solid #555', color: '#aaa', fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.1em', borderRadius: '6px' }}
                >
                    Annuler
                </button>
                {(cropMethod === 'poly' || cropMethod === 'rect') ? (
                    <button
                        onClick={confirmCrop}
                        disabled={poly.length !== 4}
                        style={{
                            padding: '0.7rem 2rem',
                            background: poly.length === 4 ? '#ea580c' : '#333',
                            border: 'none',
                            color: poly.length === 4 ? '#000' : '#666',
                            fontWeight: 900,
                            fontSize: '0.75rem',
                            cursor: poly.length === 4 ? 'pointer' : 'not-allowed',
                            textTransform: 'uppercase',
                            letterSpacing: '0.1em',
                            borderRadius: '6px',
                            boxShadow: '0 4px 15px rgba(234, 88, 12, 0.3)'
                        }}
                    >
                        ✓ Valider pour Logo {targetSlot}
                    </button>
                ) : (
                    <button
                        onClick={confirmEraser}
                        style={{
                            padding: '0.7rem 2rem',
                            background: '#ea580c',
                            border: 'none',
                            color: '#000',
                            fontWeight: 900,
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            textTransform: 'uppercase',
                            letterSpacing: '0.1em',
                            borderRadius: '6px',
                            boxShadow: '0 4px 15px rgba(234, 88, 12, 0.3)'
                        }}
                    >
                        ✓ Valider le gommage pour Logo {targetSlot}
                    </button>
                )}
            </div>
        </div>
    );
};

export default CropModal;