import React, { useRef, useState, useEffect } from 'react';
import { CartItem } from '../types';
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
}

export function DraggableElement({
    id, type, item, side, isActive, setActive, onUpdate, onSaveHistory, isEditable, realHeight, onOpenOptions
}: DraggableElementProps) {
    const elementRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
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
        startDist: 0
    });

    // Keep a ref to the latest item to avoid dependency cycles in useEffect
    const itemRef = useRef(item);
    itemRef.current = item;

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

                const newX = Math.min(100, Math.max(0, initialPosX + dx));
                const newY = Math.min(100, Math.max(0, initialPosY + dy));

                if (type === 'logo') {
                    onUpdate(side === 'Front'
                        ? { logoPositionXFront: newX, logoPositionYFront: newY }
                        : { logoPositionXBack: newX, logoPositionYBack: newY }
                    );
                } else {
                    const currentTextObj = (itemRef.current as any)[id];
                    const newTextObj = { ...currentTextObj, position: { x: newX, y: newY } };
                    onUpdate({ [id]: newTextObj });
                }
            } else if (isResizing) {
                const dist = Math.hypot(clientX - dragInfo.current.centerX, clientY - dragInfo.current.centerY);
                const scale = dist / dragInfo.current.startDist;
                const newSize = Math.max(2, dragInfo.current.initialSize * scale);

                if (type === 'logo') {
                    onUpdate(side === 'Front'
                        ? { logoSizeFront: newSize }
                        : { logoSizeBack: newSize }
                    );
                } else {
                    const currentTextObj = (itemRef.current as any)[id];
                    const newTextObj = { ...currentTextObj, fontSize: newSize };
                    onUpdate({ [id]: newTextObj });
                }
            }
        };

        const handleUp = () => {
            setIsDragging(false);
            setIsResizing(false);
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
    }, [isDragging, isResizing, type, side, onUpdate, onSaveHistory]);

    // --- TEXT DIMENSION CALCULATION ---
    const [textDims, setTextDims] = useState<{ w: number, h: number } | null>(null);

    useEffect(() => {
        if (type === 'text' && isActive && realHeight && elementRef.current) {
            const measure = () => {
                if (!elementRef.current) return;
                const rect = elementRef.current.getBoundingClientRect();
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
    }, [type, isActive, realHeight, (item as any)[id]]);

    // Helper to get current props safely
    const getProp = (key: string) => (itemRef.current as any)[`${key}${side}`];
    const getTextObj = () => (itemRef.current as any)[id];

    // Render-time values
    const renderProp = (key: string) => (item as any)[`${key}${side}`];
    const renderTextObj = () => (item as any)[id];

    const posX = type === 'logo' ? renderProp('logoPositionX') : renderTextObj().position.x;
    const posY = type === 'logo' ? renderProp('logoPositionY') : renderTextObj().position.y;

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
        setActive();

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
            startDist: 0 // Reset for drag
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
            startDist
        };
    };

    // Render styles
    const style: React.CSSProperties = {
        position: 'absolute',
        left: `${posX}%`,
        top: `${posY}%`,
        transform: 'translate(-50%, -50%)',
        cursor: isEditable ? 'move' : 'default',
        border: isActive && isEditable ? '1px dashed #f97316' : 'none',
        zIndex: isActive ? 50 : 10,
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
        if (realHeight && isActive) {
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
                onClick={(e) => e.stopPropagation()}
                onDoubleClick={(e) => { e.stopPropagation(); onOpenOptions && onOpenOptions(); }}
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
                            // Sync to parent for Price Calculation
                            const key = side === 'Front' ? 'logoAspectRatioFront' : 'logoAspectRatioBack';
                            const current = (item as any)[key];
                            if (Math.abs((current || 0) - newRatio) > 0.01) {
                                onUpdate(side === 'Front' ? { logoAspectRatioFront: newRatio } : { logoAspectRatioBack: newRatio });
                            }
                        }
                    }}
                    className={`w-full h-auto max-h-full object-contain pointer-events-none select-none`}
                    style={{
                        filter: (() => {
                            if (renderProp('processedLogoUrl')) return undefined;
                            const color = renderProp('activeLogoColor');
                            const isInverted = renderProp('logoInverted');
                            let f = '';

                            // Colors
                            if (color === 'white') f += 'brightness(0) invert(1) ';
                            else if (color === 'black') f += 'brightness(0) ';
                            else if (color === 'red') f += 'sepia(1) saturate(1000%) hue-rotate(-50deg) ';
                            else if (color === 'blue') f += 'sepia(1) saturate(1000%) hue-rotate(200deg) ';

                            // Invert Toggle
                            if (isInverted) f += 'invert(1) ';

                            return f.trim() || undefined;
                        })(),
                        mixBlendMode: (renderProp('backgroundRemoved') && !renderProp('processedLogoUrl')) ? 'multiply' : 'normal'
                    }}
                />
                {isActive && isEditable && (
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
                        {dimensionsText && (
                            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap pointer-events-none shadow-lg z-[60]">
                                {dimensionsText}
                            </div>
                        )}
                    </>
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
            transform: 'translate(-50%, -50%)', // Add rotation here if needed later
            zIndex: isActive ? 50 : 10,
            maxWidth: '80%',
            maxHeight: '80%',
            cursor: isEditable ? 'move' : 'default',
            border: isActive && isEditable ? '1px dashed #f97316' : 'none',
            userSelect: 'none', // Prevent selection during drag
            width: 'max-content', // Hug content
        };

        const textStyle: React.CSSProperties = {
            fontSize: `${scaledFontSize}px`,
            fontFamily: textObj.fontFamily,
            fontWeight: textObj.fontWeight,
            color: textObj.color,
            textTransform: textObj.textTransform,
            letterSpacing: `${textObj.letterSpacing * scaleFactor}px`,
            lineHeight: textObj.lineHeight || 1.2, // Default to 1.2 if not set
            whiteSpace: 'pre-wrap',
            textAlign: 'center',
            outline: 'none', // Remove editor outline
            cursor: 'text',
            minWidth: '20px', // Hit area for empty text
        };

        // Apply Effects to inner text
        if (textObj.shadow) {
            textStyle.textShadow = '2px 2px 4px rgba(0,0,0,0.6)';
        }
        if (textObj.outline) {
            textStyle.WebkitTextStroke = '1px black';
            if (textObj.color === '#000000' || textObj.color === 'black') {
                textStyle.WebkitTextStroke = '1px white';
            }
        }

        const [isEditing, setIsEditing] = useState(false);

        // --- TEXT DIMENSION CALCULATION ---
        const [textDims, setTextDims] = useState<{ w: number, h: number } | null>(null);

        useEffect(() => {
            if (isActive && realHeight && elementRef.current) {
                const measure = () => {
                    if (!elementRef.current) return;
                    const rect = elementRef.current.getBoundingClientRect();
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
        }, [isActive, realHeight, textObj.text, textObj.fontSize, textObj.fontFamily, textObj.fontWeight, textObj.letterSpacing, textObj.lineHeight, textObj.shadow, textObj.outline]);


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
                onClick={(e) => e.stopPropagation()}
            >
                {textObj.curve && textObj.curve !== 0 && !isEditing ? (
                    (() => {
                        // Dynamic sizing calculations
                        const charWidth = textObj.fontSize * 0.6;
                        const textWidth = charWidth * textObj.text.length;
                        // Sagitta (approx height of the curve segment from chord)
                        // Curve is roughly the offset in pixels for the control point? 
                        // Our quadratic curve Q control point Y is offset by (curve * 3).
                        // For a quadratic bezier, the peak height is 0.5 * controlPointOffset.
                        const curveHeight = Math.abs(textObj.curve * 1.5);
                        const svgHeight = textObj.fontSize * 2 + curveHeight + 20; // +20 padding
                        const svgWidth = textWidth + 40; // +40 padding

                        // Center Y for the path start/end
                        // If curve > 0 (convex/downward), path starts lower. If < 0 (concave/upward), path starts higher?
                        // Actually, standard Q path: M start Q control end.
                        // Let's keep the path vertically centered in the new height.
                        const baselineY = svgHeight / 2 + (textObj.curve > 0 ? -curveHeight / 2 : curveHeight / 2);

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
                                {textObj.curveStyle === 'upright' ? (
                                    (() => {
                                        // Bezier Helper
                                        const getQuadraticBezierPoint = (t: number, p0: any, p1: any, p2: any) => {
                                            const x = (1 - t) * (1 - t) * p0.x + 2 * (1 - t) * t * p1.x + t * t * p2.x;
                                            const y = (1 - t) * (1 - t) * p0.y + 2 * (1 - t) * t * p1.y + t * t * p2.y;
                                            return { x, y };
                                        };
                                        const P0 = { x: 0, y: baselineY };
                                        const P1 = { x: svgWidth / 2, y: baselineY + (textObj.curve * 3) };
                                        const P2 = { x: svgWidth, y: baselineY };

                                        return (
                                            <>
                                                {/* Optional: Debug path to see the curve */}
                                                {/* <path d={`M ${P0.x},${P0.y} Q ${P1.x},${P1.y} ${P2.x},${P2.y}`} fill="transparent" stroke="rgba(0,0,0,0.1)" /> */}

                                                {textObj.text.split('').map((char: string, i: number) => {
                                                    // Distribute char t along the curve. 
                                                    // Simple linear distribution for now. 
                                                    // To center it better, we might want to map t from 0.1 to 0.9 or similar based on text length vs width
                                                    // But svgWidth is calculated from textWidth, so 0 to 1 should cover it roughly.
                                                    // Let's use (i + 0.5) / length to center chars in their slots?
                                                    const t = (i + 0.5) / textObj.text.length;
                                                    const point = getQuadraticBezierPoint(t, P0, P1, P2);

                                                    return (
                                                        <text
                                                            key={i}
                                                            x={point.x}
                                                            y={point.y}
                                                            style={{
                                                                ...textStyle,
                                                                dominantBaseline: "middle",
                                                                textAnchor: "middle"
                                                            }}
                                                            fill={textObj.color}
                                                        >
                                                            {char}
                                                        </text>
                                                    );
                                                })}
                                            </>
                                        );
                                    })()
                                ) : (
                                    <>
                                        <path
                                            id={`curve-${side}`}
                                            d={`M 0,${baselineY} Q ${svgWidth / 2},${baselineY + (textObj.curve * 3)} ${svgWidth},${baselineY}`}
                                            fill="transparent"
                                        />
                                        <text
                                            style={{
                                                ...textStyle,
                                                dominantBaseline: "middle",
                                                textAnchor: "middle"
                                            }}
                                            fill={textObj.color}
                                        >
                                            <textPath
                                                href={`#curve-${side}`}
                                                startOffset="50%"
                                                style={{
                                                    fontFamily: textObj.fontFamily,
                                                    fontWeight: textObj.fontWeight,
                                                    fontSize: (textObj.fontSize * scaleFactor) + 'px',
                                                    letterSpacing: (textObj.letterSpacing * scaleFactor) + 'px',
                                                    textTransform: textObj.textTransform,
                                                }}
                                            >
                                                {textObj.text}
                                            </textPath>
                                        </text>
                                    </>
                                )}
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
                    >
                        {textObj.text}
                    </div>
                )}

                {isActive && isEditable && (
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
                        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-2 rounded whitespace-nowrap pointer-events-none z-[60] shadow-lg" contentEditable={false}>
                            {textDims ? `${textDims.w.toFixed(1)} x ${textDims.h.toFixed(1)} cm` : `Taille: ${Math.round(textObj.fontSize)}px`}
                        </div>
                    </>
                )}
            </div>
        );
    }
};