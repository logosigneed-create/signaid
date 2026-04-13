import React, { useRef, useState, useEffect } from 'react';
import { CartItem, LogoConfig } from '../types';
import { getProxiedUrl } from '../utils/helpers';

interface DraggableElementProps {
    id: string;
    type: 'logo' | 'text';
    item: CartItem;
    side: 'Front' | 'Back';
    isActive: boolean;
    setActive: () => void;
    onUpdate: (updates: Partial<CartItem>) => void;
    onSaveHistory: () => void;
    isEditable: boolean;
    realHeight?: number;
    onOpenOptions?: () => void;
    showDimensions?: boolean;
    isGrouped?: boolean;
    onDragStart?: () => void;
    onDragUpdate?: (dx: number, dy: number) => void;
    onReportDimensions?: (w: number, h: number) => void;
}

export function DraggableElement({
    id, type, item, side, isActive, setActive, onUpdate, onSaveHistory, isEditable, realHeight, onOpenOptions, showDimensions,
    isGrouped, onDragStart, onDragUpdate, onReportDimensions
}: DraggableElementProps) {
    const elementRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const hasMoved = useRef(false);
    const wasActiveOnMouseDown = useRef(false);
    const [aspectRatio, setAspectRatio] = useState(1);

    // Store mutable values in ref to access them in event handlers without re-binding
    const dragInfo = useRef({
        startX: 0,
        startY: 0,
        initialPosX: 0,
        initialPosY: 0,
        initialSize: 0,
        parentWidth: 0,
        parentHeight: 0,
        initialPinchDist: 0,
        centerX: 0,
        centerY: 0,
        startDist: 0,
        initialCurve: 0
    });

    // Keep a ref to the latest item to avoid dependency cycles in useEffect
    const itemRef = useRef(item);
    itemRef.current = item;

    // --- FLUID DRAG OPTIMIZATION ---
    const [tempPos, setTempPos] = useState<{ x: number, y: number } | null>(null);

    // Hook must be called before any early return
    useEffect(() => {
        if (!isDragging && !isResizing) return;

        const handleMove = (e: MouseEvent | TouchEvent) => {
            if (e.cancelable) e.preventDefault();

            // --- PINCH TO RESIZE LOGIC ---
            if (type === 'logo' && 'touches' in e && (e as TouchEvent).touches.length === 2) {
                const touch1 = (e as TouchEvent).touches[0];
                const touch2 = (e as TouchEvent).touches[1];
                const dist = Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY);

                if (!dragInfo.current.initialPinchDist) {
                    dragInfo.current.initialPinchDist = dist;
                    dragInfo.current.initialSize = getProp('logoSize');
                    return;
                }

                const scale = dist / dragInfo.current.initialPinchDist;
                const newSize = Math.max(5, dragInfo.current.initialSize * scale);

                onUpdate(side === 'Front' ? { logoSizeFront: newSize } : { logoSizeBack: newSize });
                return;
            }
            // --- END PINCH LOGIC ---

            const clientX = 'touches' in e ? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).clientX;
            const clientY = 'touches' in e ? (e as TouchEvent).touches[0].clientY : (e as MouseEvent).clientY;

            const { startX, startY, initialPosX, initialPosY, initialSize, parentWidth, parentHeight } = dragInfo.current;

            if (isDragging) {
                const dx = ((clientX - startX) / parentWidth) * 100;
                const dy = ((clientY - startY) / parentHeight) * 100;

                // Mark as moved if movement exceeds 5 pixels (Threshold to avoid accidental micro-moves)
                const dist = Math.hypot(clientX - startX, clientY - startY);
                if (dist > 5) {
                    hasMoved.current = true;

                    if (isGrouped && onDragUpdate) {
                        onDragUpdate(dx, dy);
                        return;
                    }

                    const newX = Math.min(100, Math.max(0, initialPosX + dx));
                    const newY = Math.min(100, Math.max(0, initialPosY + dy));

                    // OPTIMIZATION: Update local state instead of parent on every pixel
                    setTempPos({ x: newX, y: newY });
                }
            } else if (isResizing) {
                const dist = Math.hypot(clientX - dragInfo.current.centerX, clientY - dragInfo.current.centerY);
                const scale = dist / dragInfo.current.startDist;
                const newSize = Math.max(2, dragInfo.current.initialSize * scale);

                if (Math.abs(dist - dragInfo.current.startDist) > 3) {
                    hasMoved.current = true;
                }

                if (type === 'logo') {
                    if (id.startsWith('logoFront') && id !== 'logoFront') {
                        const currentLogo = (itemRef.current as any)[id];
                        onUpdate({ [id]: { ...currentLogo, size: newSize } });
                    } else if (id.startsWith('logoBack') && id !== 'logoBack') {
                        const currentLogo = (itemRef.current as any)[id];
                        onUpdate({ [id]: { ...currentLogo, size: newSize } });
                    } else {
                        onUpdate(side === 'Front'
                            ? { logoSizeFront: newSize }
                            : { logoSizeBack: newSize }
                        );
                    }
                } else {
                    const currentTextObj = (itemRef.current as any)[id];
                    const newTextObj = {
                        ...currentTextObj,
                        fontSize: newSize,
                        curve: Math.round(dragInfo.current.initialCurve * scale)
                    };
                    onUpdate({ [id]: newTextObj });
                }
            }
        };

        const handleUp = () => {
            if (isDragging && tempPos) {
                const { x, y } = tempPos;
                if (type === 'logo') {
                    if (id.startsWith('logoFront') && id !== 'logoFront') {
                        const currentLogo = (itemRef.current as any)[id];
                        onUpdate({ [id]: { ...currentLogo, position: { x, y } } });
                    } else if (id.startsWith('logoBack') && id !== 'logoBack') {
                        const currentLogo = (itemRef.current as any)[id];
                        onUpdate({ [id]: { ...currentLogo, position: { x, y } } });
                    } else {
                        onUpdate(side === 'Front'
                            ? { logoPositionXFront: x, logoPositionYFront: y }
                            : { logoPositionXBack: x, logoPositionYBack: y }
                        );
                    }
                } else {
                    const currentTextObj = (itemRef.current as any)[id];
                    const newTextObj = { ...currentTextObj, position: { x, y } };
                    onUpdate({ [id]: newTextObj });
                }
            }

            setIsDragging(false);
            setIsResizing(false);
            setTempPos(null); // Clear local drag state
            dragInfo.current.initialPinchDist = 0; // Reset pinch
            onSaveHistory();
        };

        window.addEventListener('mousemove', handleMove, { passive: false });
        window.addEventListener('touchmove', handleMove, { passive: false });
        window.addEventListener('mouseup', handleUp);
        window.addEventListener('touchend', handleUp);

        return () => {
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('touchmove', handleMove);
            window.removeEventListener('mouseup', handleUp);
            window.removeEventListener('touchend', handleUp);
        };
    }, [isDragging, isResizing, type, side, onUpdate, onSaveHistory, tempPos]);

    // --- TEXT DIMENSION CALCULATION ---
    const [textDims, setTextDims] = useState<{ w: number, h: number } | null>(null);

    useEffect(() => {
        if (realHeight && elementRef.current) {
            const measure = () => {
                if (!elementRef.current) return;
                const rect = elementRef.current.getBoundingClientRect();
                const parent = elementRef.current.offsetParent as HTMLElement;
                if (parent) {
                    // Use getBoundingClientRect() on parent to get its SCALED height
                    const parentRect = parent.getBoundingClientRect();
                    const cmPerPx = realHeight / parentRect.height;
                    setTextDims({
                        w: rect.width * cmPerPx,
                        h: rect.height * cmPerPx
                    });
                }
            };
            measure();
            const observer = new ResizeObserver(measure);
            observer.observe(elementRef.current);
            return () => observer.disconnect();
        }
    }, [type, realHeight, (item as any)[id], onReportDimensions, isGrouped]);

    const lastReportedDims = useRef<{ w: number, h: number } | null>(null);

    useEffect(() => {
        if (textDims && onReportDimensions) {
            // Only report if dimensions significantly changed (tolerance 0.1mm)
            if (!lastReportedDims.current ||
                Math.abs(lastReportedDims.current.w - textDims.w) > 0.01 ||
                Math.abs(lastReportedDims.current.h - textDims.h) > 0.01) {

                lastReportedDims.current = textDims;
                onReportDimensions(textDims.w, textDims.h);
            }
        }
    }, [textDims, onReportDimensions]);

    // Helper to get current props safely
    const getProp = (key: string) => {
        if (type === 'logo') {
            if (id.startsWith('logoFront') && id !== 'logoFront') {
                const config = (itemRef.current as any)[id] as LogoConfig;
                if (key === 'logoPositionX') return config?.position?.x ?? 50;
                if (key === 'logoPositionY') return config?.position?.y ?? 50;
                if (key === 'logoSize') return config?.size ?? 50;
            } else if (id.startsWith('logoBack') && id !== 'logoBack') {
                const config = (itemRef.current as any)[id] as LogoConfig;
                if (key === 'logoPositionX') return config?.position?.x ?? 50;
                if (key === 'logoPositionY') return config?.position?.y ?? 50;
                if (key === 'logoSize') return config?.size ?? 50;
            }
        }
        return (itemRef.current as any)[`${key}${side}`];
    };
    const getTextObj = () => (itemRef.current as any)[id];

    // Render-time values
    const renderProp = (key: string) => {
        if (type === 'logo') {
            if (id.startsWith('logoFront') && id !== 'logoFront') {
                const config = (item as any)[id] as LogoConfig;
                if (key === 'logoPositionX') return config?.position?.x ?? 50;
                if (key === 'logoPositionY') return config?.position?.y ?? 50;
                if (key === 'logoSize') return config?.size ?? 50;
                if (key === 'processedLogoUrl') return config?.processedUrl;
                if (key === 'originalLogoUrl') return config?.originalUrl;
                if (key === 'predefinedLogoUrl') return config?.predefinedUrl;
                if (key === 'activeLogoColor') return config?.activeColor;
                if (key === 'logoInverted') return config?.inverted;
                if (key === 'backgroundRemoved') return config?.backgroundRemoved;
            } else if (id.startsWith('logoBack') && id !== 'logoBack') {
                const config = (item as any)[id] as LogoConfig;
                if (key === 'logoPositionX') return config?.position?.x ?? 50;
                if (key === 'logoPositionY') return config?.position?.y ?? 50;
                if (key === 'logoSize') return config?.size ?? 50;
                if (key === 'processedLogoUrl') return config?.processedUrl;
                if (key === 'originalLogoUrl') return config?.originalUrl;
                if (key === 'predefinedLogoUrl') return config?.predefinedUrl;
                if (key === 'activeLogoColor') return config?.activeColor;
                if (key === 'logoInverted') return config?.inverted;
                if (key === 'backgroundRemoved') return config?.backgroundRemoved;
            }
        }
        return (item as any)[`${key}${side}`];
    };
    const renderTextObj = () => (item as any)[id];

    const posX = tempPos ? tempPos.x : (type === 'logo' ? renderProp('logoPositionX') : renderTextObj().position.x);
    const posY = tempPos ? tempPos.y : (type === 'logo' ? renderProp('logoPositionY') : renderTextObj().position.y);

    // Proportional scaling for text based on container width
    const [containerWidth, setContainerWidth] = useState(400);
    useEffect(() => {
        const measuredElement = elementRef.current;
        if (!measuredElement) return;

        const parent = measuredElement.offsetParent as HTMLElement;
        const updateWidth = () => {
            if (parent) setContainerWidth(parent.clientWidth);
        };

        // Initial measurement
        updateWidth();

        // Robust observation
        if (parent) {
            const observer = new ResizeObserver(updateWidth);
            observer.observe(parent);
            return () => observer.disconnect();
        } else {
            // Fallback
            window.addEventListener('resize', updateWidth);
            return () => window.removeEventListener('resize', updateWidth);
        }
    }, []); // Run on mount

    const scaleFactor = containerWidth / 400; // Reference width is 400px
    const size = type === 'logo' ? renderProp('logoSize') : (renderTextObj().fontSize * 4);
    const scaledFontSize = type === 'text' ? (renderTextObj().fontSize * scaleFactor) : 0;

    const content = type === 'logo'
        ? getProxiedUrl(renderProp('processedLogoUrl') || renderProp('originalLogoUrl') || renderProp('predefinedLogoUrl'))
        : (renderTextObj().text || 'VOTRE TEXTE');

    // Early returns can now happen safely after all hooks
    if (!content && type === 'logo') return null;
    // For text, we always render something (either user text or placeholder)
    if (type === 'text' && !content) return null;

    const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isEditable) return;
        e.stopPropagation(); // Prevent preview click
        wasActiveOnMouseDown.current = isActive;
        setActive();
        hasMoved.current = false; // Reset on start
        if (isGrouped) onDragStart?.();

        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

        const parent = elementRef.current?.offsetParent as HTMLElement;
        if (!parent) return;

        setIsDragging(true);

        // Calculate initial position based on current item state in ref
        const currentPosX = type === 'logo' ? getProp('logoPositionX') : getTextObj().position.x;
        const currentPosY = type === 'logo' ? getProp('logoPositionY') : getTextObj().position.y;

        dragInfo.current = {
            startX: clientX,
            startY: clientY,
            initialPosX: currentPosX,
            initialPosY: currentPosY,
            initialSize: 0,
            parentWidth: parent.clientWidth,
            parentHeight: parent.clientHeight,
            initialPinchDist: 0, // Reset pinch
            centerX: 0, // Reset for drag
            centerY: 0, // Reset for drag
            startDist: 0, // Reset for drag
            initialCurve: 0
        };
    };

    const handleResizeStart = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isEditable) return;
        e.stopPropagation();

        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

        const currentSize = type === 'logo' ? getProp('logoSize') : getTextObj().fontSize;

        // Calculate center for distance-based resizing
        const rect = elementRef.current?.getBoundingClientRect();
        if (!rect) return;
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const startDist = Math.hypot(clientX - centerX, clientY - centerY);

        setIsResizing(true);
        dragInfo.current = {
            ...dragInfo.current,
            startX: clientX,
            startY: clientY,
            initialSize: currentSize,
            centerX,
            centerY,
            startDist,
            initialCurve: type === 'text' ? getTextObj().curve || 0 : 0
        };
    };

    // Render styles
    const style: React.CSSProperties = {
        position: 'absolute',
        left: `${posX}%`,
        top: `${posY}%`,
        transform: 'translate(-50%, -50%)',
        cursor: isEditable ? 'move' : 'default',
        border: (isActive || showDimensions) && isEditable ? '1px dashed #f97316' : 'none',
        zIndex: isActive ? 50 : 40,
        maxWidth: '80%',
        maxHeight: '80%',
        userSelect: 'none',
    };

    if (type === 'logo') {
        // Use percentage for width to ensure consistency between mobile and desktop scaling
        // Assuming base design width of ~400px, so 100 units = 25%
        style.width = `${size}%`;

        // Calculate dimensions in CM
        let dimensionsText = null;
        if (realHeight && (isActive || showDimensions)) {
            // Container Aspect Ratio is 3:4 (width:height)
            // Real Height = realHeight (cm)
            // Real Width = realHeight * 0.75 (cm)
            // Logo Width % = size / 4
            // Logo Width cm = Real Width * (Logo Width % / 100)
            const realWidthCm = realHeight * 0.75;
            const logoWidthCm = realWidthCm * (size / 100);

            // Height depends on Aspect Ratio
            // aspectRatio = width / height => height = width / aspectRatio
            const logoHeightCm = logoWidthCm / aspectRatio;

            dimensionsText = `${logoWidthCm.toFixed(1)} x ${logoHeightCm.toFixed(1)} cm`;
        }

        return (
            <div
                ref={elementRef}
                style={style}
                onMouseDown={handleMouseDown}
                onTouchStart={handleMouseDown}
                onClick={(e) => { e.stopPropagation(); if (!hasMoved.current && wasActiveOnMouseDown.current && onOpenOptions) onOpenOptions(); }}
                onDoubleClick={(e) => { e.stopPropagation(); if (onOpenOptions) onOpenOptions(); }}
            >
                <img
                    src={content}
                    alt="logo"
                    crossOrigin="anonymous"
                    onLoad={(e) => {
                        const img = e.currentTarget;
                        if (img.naturalHeight > 0) {
                            const newRatio = img.naturalWidth / img.naturalHeight;
                            setAspectRatio(newRatio);
                            // Sync to parent for Price Calculation (Only if changed)
                            if (id.startsWith('logoFront') && id !== 'logoFront') {
                                const current = (itemRef.current as any)[id] as LogoConfig;
                                if (!current?.aspectRatio || Math.abs(current.aspectRatio - newRatio) > 0.01) {
                                    onUpdate({ [id]: { ...current, aspectRatio: newRatio } });
                                }
                            } else if (id.startsWith('logoBack') && id !== 'logoBack') {
                                const current = (itemRef.current as any)[id] as LogoConfig;
                                if (!current?.aspectRatio || Math.abs(current.aspectRatio - newRatio) > 0.01) {
                                    onUpdate({ [id]: { ...current, aspectRatio: newRatio } });
                                }
                            } else {
                                const key = side === 'Front' ? 'logoAspectRatioFront' : 'logoAspectRatioBack';
                                const current = (item as any)[key];
                                if (!current || Math.abs(current - newRatio) > 0.01) {
                                    onUpdate(side === 'Front' ? { logoAspectRatioFront: newRatio } : { logoAspectRatioBack: newRatio });
                                }
                            }
                        }
                    }}
                    className={`w-full h-auto max-h-full object-contain pointer-events-none select-none customizer-logo-img`}
                    data-logo-filter={(() => {
                        if (renderProp('processedLogoUrl')) return undefined;
                        const color = renderProp('activeLogoColor');
                        const isInverted = renderProp('logoInverted');
                        let f = '';
                        if (color === 'white') f += 'brightness(0) invert(1) ';
                        else if (color === 'black') f += 'brightness(0) ';
                        else if (color === 'red') f += 'sepia(1) saturate(1000%) hue-rotate(-50deg) ';
                        else if (color === 'blue') f += 'sepia(1) saturate(1000%) hue-rotate(200deg) ';
                        if (isInverted) f += 'invert(1) ';
                        return f.trim() || undefined;
                    })()}
                    style={{
                        filter: (() => {
                            if (renderProp('processedLogoUrl')) return undefined;
                            const color = renderProp('activeLogoColor');
                            const isInverted = renderProp('logoInverted');
                            let f = '';
                            if (color === 'white') f += 'brightness(0) invert(1) ';
                            else if (color === 'black') f += 'brightness(0) ';
                            else if (color === 'red') f += 'sepia(1) saturate(1000%) hue-rotate(-50deg) ';
                            else if (color === 'blue') f += 'sepia(1) saturate(1000%) hue-rotate(200deg) ';
                            if (isInverted) f += 'invert(1) ';
                            return f.trim() || undefined;
                        })(),
                        mixBlendMode: (renderProp('backgroundRemoved') && !renderProp('processedLogoUrl')) ? 'multiply' : 'normal'
                    }}
                />
                {isActive && isEditable && !isGrouped && (
                    <>
                        {/* Top Left */}
                        <div
                            className="absolute -top-2.5 -left-2.5 w-6 h-6 bg-orange-500 rounded-full cursor-nwse-resize z-[100] shadow-md border-2 border-white pointer-events-auto"
                            onMouseDown={handleResizeStart}
                            onTouchStart={handleResizeStart}
                        />
                        {/* Top Right */}
                        <div
                            className="absolute -top-2.5 -right-2.5 w-6 h-6 bg-orange-500 rounded-full cursor-nesw-resize z-[100] shadow-md border-2 border-white pointer-events-auto"
                            onMouseDown={handleResizeStart}
                            onTouchStart={handleResizeStart}
                        />
                        {/* Bottom Left */}
                        <div
                            className="absolute -bottom-2.5 -left-2.5 w-6 h-6 bg-orange-500 rounded-full cursor-nesw-resize z-[100] shadow-md border-2 border-white pointer-events-auto"
                            onMouseDown={handleResizeStart}
                            onTouchStart={handleResizeStart}
                        />
                        {/* Bottom Right */}
                        <div
                            className="absolute -bottom-2.5 -right-2.5 w-6 h-6 bg-orange-500 rounded-full cursor-nwse-resize z-[100] shadow-md border-2 border-white pointer-events-auto"
                            onMouseDown={handleResizeStart}
                            onTouchStart={handleResizeStart}
                        />
                    </>
                )}
                {dimensionsText && showDimensions && !isGrouped && (
                    <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap pointer-events-none shadow-lg z-[60]">
                        {dimensionsText}
                    </div>
                )}
            </div>
        );
    } else {
        const textObj = renderTextObj();

        // SPLIT STYLES: Container handles position/rotation. Inner handles text appearance.
        const containerStyle: React.CSSProperties = {
            position: 'absolute',
            left: `${posX}%`,
            top: `${posY}%`,
            transform: 'translate(-50%, -50%)',
            zIndex: isActive ? 50 : 40,
            maxWidth: '80%',
            maxHeight: '80%',
            cursor: isEditable ? 'move' : 'default',
            border: (isActive || showDimensions) && isEditable ? '1px dashed #f97316' : 'none',
            userSelect: 'none',
            width: 'max-content',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
        };

        const textStyle: React.CSSProperties = {
            fontSize: `${scaledFontSize}px`,
            fontFamily: textObj.fontFamily,
            fontWeight: textObj.fontWeight,
            color: textObj.noFill ? 'transparent' : textObj.color,
            textTransform: textObj.textTransform,
            letterSpacing: `${textObj.letterSpacing * scaleFactor}px`,
            lineHeight: textObj.lineHeight || 1.2, // Default to 1.2 if not set
            whiteSpace: 'pre-wrap',
            textAlign: 'center',
            outline: 'none', // Remove editor outline
            cursor: 'text',
            minWidth: '20px', // Hit area for empty text
            transform: (textObj.scaleY && textObj.scaleY !== 1) || (textObj.scaleX && textObj.scaleX !== 1) ? `scale(${textObj.scaleX || 1}, ${textObj.scaleY || 1})` : undefined,
            transformOrigin: 'center',
        };

        // Apply Effects to inner text
        if (textObj.shadow) {
            textStyle.textShadow = '2px 2px 4px rgba(0,0,0,0.6)';
        }
        if (textObj.outline) {
            textStyle.WebkitTextStroke = `${(textObj.outlineWidth || 1) * scaleFactor}px ${textObj.outlineColor || 'black'}`;
            if (!textObj.outlineColor && (textObj.color === '#000000' || textObj.color === 'black')) {
                textStyle.WebkitTextStroke = `${(textObj.outlineWidth || 1) * scaleFactor}px white`;
            }
        }

        const [isEditing, setIsEditing] = useState(false);

        // --- TEXT DIMENSION CALCULATION ---
        const [textDims, setTextDims] = useState<{ w: number, h: number } | null>(null);

        useEffect(() => {
            if ((isActive || showDimensions) && realHeight && elementRef.current) {
                const measure = () => {
                    if (!elementRef.current) return;
                    // Measure the inner span for normal text to get glyph bounds, or SVG for arc
                    const innerContent = elementRef.current.querySelector('.text-content-inner') as HTMLElement;
                    const target = innerContent || elementRef.current.firstElementChild || elementRef.current;
                    const rect = target.getBoundingClientRect();
                    const parent = elementRef.current.offsetParent as HTMLElement;
                    if (parent) {
                        const cmPerPx = realHeight / parent.clientHeight;
                        setTextDims({
                            w: rect.width * cmPerPx,
                            h: rect.height * cmPerPx
                        });
                    }
                };
                measure();
                const observer = new ResizeObserver(measure);
                observer.observe(elementRef.current);
                return () => observer.disconnect();
            }
        }, [isActive, realHeight, textObj.text, textObj.fontSize, textObj.fontFamily, textObj.fontWeight, textObj.letterSpacing, textObj.lineHeight, textObj.shadow, textObj.outline, textObj.scaleY, textObj.curve, onReportDimensions]);

        useEffect(() => {
            if (textDims && onReportDimensions) {
                onReportDimensions(textDims.w, textDims.h);
            }
        }, [textDims, onReportDimensions]);


        const handleTextBlur = (e: React.FocusEvent<HTMLDivElement>) => {
            setIsEditing(false);
            const newText = e.currentTarget.innerText;
            const textObj = renderTextObj();
            if (newText !== textObj.text) {
                onUpdate({ [id]: { ...textObj, text: newText } });
            }
        };

        // If editing, stop drag propogation so we can select text
        const handleTextMouseDown = (e: React.MouseEvent) => {
            if (isEditing) {
                e.stopPropagation();
            }
        };

        return (
            <div
                ref={elementRef}
                style={containerStyle}
                onMouseDown={handleMouseDown}
                onTouchStart={handleMouseDown}
                onClick={(e) => {
                    e.stopPropagation();
                    if (!hasMoved.current && wasActiveOnMouseDown.current && onOpenOptions) {
                        onOpenOptions();
                    }
                }}
            >
                {textObj.curve && textObj.curve !== 0 && !isEditing ? (
                    (() => {
                        // Dynamic sizing calculations using scaled values so container perfectly matches rendered text
                        // Use Canvas to perfectly measure the text width instead of relying on a char multiplier
                        const getExactTextWidth = (text: string, font: string, letterSpacing: number) => {
                            const canvas = document.createElement('canvas');
                            const context = canvas.getContext('2d');
                            if (!context) return text.length * 10;
                            context.font = font;
                            // Approximate the letter spacing addition
                            return context.measureText(text).width + (text.length * letterSpacing);
                        };

                        const scaledFontSize = textObj.fontSize * scaleFactor;
                        const spacing = (textObj.letterSpacing || 0) * scaleFactor;

                        // Precise width calculation matching the rendered CSS font
                        const fontString = `${textObj.fontWeight} ${scaledFontSize}px ${textObj.fontFamily} `;
                        const measuredWidth = getExactTextWidth(textObj.text, fontString, spacing);
                        const textWidth = Math.max(measuredWidth, 20); // Prevent 0 width
                        const scaledCurve = (textObj.curve || 0) * scaleFactor;

                        // Calculate required height for the curve displacement (Bezier Q uses 0.5 * P1.y displacement)
                        // curveHeight is the vertical space taken by the arc itself
                        const curveHeight = Math.abs(scaledCurve * 2);

                        // Vertical safety buffer for ascenders/descenders (50% of font size)
                        const verticalBuffer = scaledFontSize * 0.8;

                        // Total SVG height: curve displacement + full font height + buffers
                        const svgHeight = Math.max(curveHeight + scaledFontSize + verticalBuffer, Math.abs(scaledCurve * 3) + scaledFontSize + verticalBuffer);

                        // Center the arc vertically
                        // For arch (curve < 0), peak is at the top. For bowl (curve > 0), bottom is at the bottom.
                        const baselineY = scaledCurve > 0
                            ? (verticalBuffer / 2 + scaledFontSize / 2)
                            : (svgHeight - verticalBuffer / 2 - scaledFontSize / 2);

                        const svgWidth = textWidth + 60; // Increased margin for side characters

                        return (
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width={svgWidth}
                                height={svgHeight}
                                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                                style={{ overflow: 'visible', cursor: 'text' }}
                                onDoubleClick={(e) => {
                                    e.stopPropagation();
                                    if (isEditable) setIsEditing(true);
                                }}
                            >
                                {(() => {
                                    // Bezier Helper
                                    const getQuadraticBezierPoint = (t: number, p0: any, p1: any, p2: any) => {
                                        const x = (1 - t) * (1 - t) * p0.x + 2 * (1 - t) * t * p1.x + t * t * p2.x;
                                        const y = (1 - t) * (1 - t) * p0.y + 2 * (1 - t) * t * p1.y + t * t * p2.y;
                                        return { x, y };
                                    };
                                    // Start curve with 30px offset
                                    const P0 = { x: 30, y: baselineY };
                                    const P1 = { x: svgWidth / 2, y: baselineY + (scaledCurve * 3) };
                                    const P2 = { x: svgWidth - 30, y: baselineY };

                                    return (
                                        <>
                                            {/* <path d={`M ${ P0.x },${ P0.y } Q ${ P1.x },${ P1.y } ${ P2.x },${ P2.y } `} fill="transparent" stroke="rgba(0,0,0,0.1)" /> */}

                                            {textObj.text.split('').map((char: string, i: number) => {
                                                const t = (i + 0.5) / textObj.text.length;
                                                const point = getQuadraticBezierPoint(t, P0, P1, P2);

                                                let angle = 0;
                                                let renderY = point.y;

                                                // Tangent calculation for Arc mode
                                                const dx = 2 * ((1 - t) * (P1.x - P0.x) + t * (P2.x - P1.x));
                                                const dy = 2 * ((1 - t) * (P1.y - P0.y) + t * (P2.y - P1.y));
                                                angle = Math.atan2(dy, dx) * (180 / Math.PI);

                                                return (
                                                    <text
                                                        key={i}
                                                        x={point.x}
                                                        y={renderY}
                                                        className="select-none pointer-events-none fill-current"
                                                        style={{
                                                            fontFamily: textObj.fontFamily,
                                                            fontSize: `${scaledFontSize}px`,
                                                            fontWeight: textObj.fontWeight,
                                                            fill: textObj.noFill ? 'transparent' : textObj.color,
                                                            textTransform: textObj.textTransform || 'none',
                                                            transform: `rotate(${angle}deg) scale(${textObj.scaleX || 1}, ${textObj.scaleY || 1})`,
                                                            transformOrigin: `${point.x}px ${renderY}px`,
                                                            dominantBaseline: "alphabetic",
                                                            textAnchor: "middle"
                                                        }}
                                                        stroke={textObj.outline ? (textObj.outlineColor || 'black') : 'none'}
                                                        strokeWidth={textObj.outline ? `${(textObj.outlineWidth || 1) * scaleFactor}px` : "0"}
                                                    >
                                                        {char}
                                                    </text>
                                                );
                                            })}
                                        </>
                                    );
                                })()}
                            </svg>
                        );
                    })()
                ) : (
                    <div
                        contentEditable={isActive && isEditable}
                        suppressContentEditableWarning={true}
                        onDoubleClick={() => {
                            if (isEditable) setIsEditing(true);
                            if (onOpenOptions) onOpenOptions();
                        }}
                        onBlur={handleTextBlur}
                        onMouseDown={handleTextMouseDown}
                        style={textStyle}
                        className="text-content-wrapper"
                    >
                        <span className="text-content-inner" style={{ display: 'inline-block' }}>
                            {textObj.text}
                        </span>
                    </div>
                )}

                {isActive && isEditable && !isGrouped && (
                    <>
                        {/* Top Left */}
                        <div
                            className="absolute -top-1 -left-1 w-4 h-4 bg-orange-500 rounded-full cursor-nwse-resize z-50 shadow-md border border-white"
                            onMouseDown={handleResizeStart}
                            onTouchStart={handleResizeStart}
                            contentEditable={false} // Prevent edit
                        />
                        {/* Top Right */}
                        <div
                            className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full cursor-nesw-resize z-50 shadow-md border border-white"
                            onMouseDown={handleResizeStart}
                            onTouchStart={handleResizeStart}
                            contentEditable={false}
                        />
                        {/* Bottom Left */}
                        <div
                            className="absolute -bottom-1 -left-1 w-4 h-4 bg-orange-500 rounded-full cursor-nesw-resize z-50 shadow-md border border-white"
                            onMouseDown={handleResizeStart}
                            onTouchStart={handleResizeStart}
                            contentEditable={false}
                        />
                        {/* Bottom Right */}
                        <div
                            className="absolute -bottom-1 -right-1 w-4 h-4 bg-orange-500 rounded-full cursor-nwse-resize z-50 shadow-md border border-white"
                            onMouseDown={handleResizeStart}
                            onTouchStart={handleResizeStart}
                            contentEditable={false}
                        />
                    </>
                )}
                {showDimensions && !isGrouped && (
                    <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-2 rounded whitespace-nowrap pointer-events-none z-[60] shadow-lg" contentEditable={false}>
                        {textDims ? `${textDims.w.toFixed(1)} x ${textDims.h.toFixed(1)} cm` : `Taille: ${Math.round(textObj.fontSize)} px`}
                    </div>
                )}
            </div>
        );
    }
};