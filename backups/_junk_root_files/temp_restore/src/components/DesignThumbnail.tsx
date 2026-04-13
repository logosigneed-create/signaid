import React, { useState, useEffect, useRef } from 'react';
import { CartItem, Product, TextConfig } from '../types';
import { getProxiedUrl } from '../utils/helpers';

interface DesignThumbnailProps {
    item: CartItem;
    product: Product;
    side: 'front' | 'back';
    className?: string;
}

export const DesignThumbnail: React.FC<DesignThumbnailProps> = ({ item, product, side, className }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerWidth, setContainerWidth] = useState(180);

    useEffect(() => {
        const updateWidth = () => {
            if (containerRef.current) {
                setContainerWidth(containerRef.current.clientWidth);
            }
        };
        updateWidth();
        window.addEventListener('resize', updateWidth);
        return () => window.removeEventListener('resize', updateWidth);
    }, [className]);

    const scaleFactor = containerWidth / 400; // Reference width is 400px

    const isBack = side === 'back';
    const baseImage = getProxiedUrl(isBack ? product.backImages[item.color] : product.images[item.color]);

    // Logo data
    const logoUrl = isBack
        ? (item.processedLogoUrlBack || item.originalLogoUrlBack || item.predefinedLogoUrlBack)
        : (item.processedLogoUrlFront || item.originalLogoUrlFront || item.predefinedLogoUrlFront);

    const logoX = isBack ? item.logoPositionXBack : item.logoPositionXFront;
    const logoY = isBack ? item.logoPositionYBack : item.logoPositionYFront;
    const logoSize = isBack ? item.logoSizeBack : item.logoSizeFront;
    const logoColor = isBack ? item.activeLogoColorBack : item.activeLogoColorFront;
    const logoInverted = isBack ? item.logoInvertedBack : item.logoInvertedFront;
    const logoHasBgRemoved = isBack ? item.backgroundRemovedBack : item.backgroundRemovedFront;
    const logoIsProcessed = isBack ? !!item.processedLogoUrlBack : !!item.processedLogoUrlFront;

    // Text data
    const text1 = isBack ? item.textBack : item.textFront;
    const text2 = isBack ? item.textBack2 : item.textFront2;

    const renderText = (textObj?: TextConfig, idPrefix: string = 'text') => {
        if (!textObj || !textObj.text) return null;

        const style: React.CSSProperties = {
            position: 'absolute',
            left: `${textObj.position.x}%`,
            top: `${textObj.position.y}%`,
            transform: 'translate(-50%, -50%)',
            fontSize: `${textObj.fontSize * scaleFactor}px`,
            fontFamily: textObj.fontFamily,
            fontWeight: textObj.fontWeight,
            color: textObj.color,
            textTransform: textObj.textTransform,
            letterSpacing: `${textObj.letterSpacing * scaleFactor}px`,
            lineHeight: textObj.lineHeight || 1.2,
            whiteSpace: 'pre-wrap',
            textAlign: 'center',
            width: 'max-content',
            maxWidth: '80%',
            pointerEvents: 'none',
            zIndex: 20,
        };

        if (textObj.shadow) {
            style.textShadow = '2px 2px 4px rgba(0,0,0,0.6)';
        }
        if (textObj.outline) {
            style.WebkitTextStroke = '1px black';
            if (textObj.color === '#000000' || textObj.color === 'black') {
                style.WebkitTextStroke = '1px white';
            }
        }

        // Curved text simplified for thumbnail
        if (textObj.curve && textObj.curve !== 0) {
            const charWidth = (textObj.fontSize * scaleFactor) * 0.6;
            const textWidth = charWidth * textObj.text.length;
            const curveHeight = Math.abs(textObj.curve * 1.5 * scaleFactor);
            const svgHeight = (textObj.fontSize * scaleFactor) * 2 + curveHeight + 10;
            const svgWidth = textWidth + 20;
            const baselineY = svgHeight / 2 + (textObj.curve > 0 ? -curveHeight / 2 : curveHeight / 2);

            return (
                <div style={style}>
                    <svg
                        width={svgWidth}
                        height={svgHeight}
                        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                        style={{ overflow: 'visible' }}
                    >
                        <path
                            id={`${idPrefix}-curve-${side}`}
                            d={`M 0,${baselineY} Q ${svgWidth / 2},${baselineY + (textObj.curve * 3 * scaleFactor)} ${svgWidth},${baselineY}`}
                            fill="transparent"
                        />
                        <text
                            fill={textObj.color}
                            style={{
                                fontFamily: textObj.fontFamily,
                                fontWeight: textObj.fontWeight,
                                fontSize: (textObj.fontSize * scaleFactor) + 'px',
                                letterSpacing: (textObj.letterSpacing * scaleFactor) + 'px',
                                textTransform: textObj.textTransform,
                                dominantBaseline: "middle",
                                textAnchor: "middle"
                            }}
                        >
                            <textPath
                                href={`#${idPrefix}-curve-${side}`}
                                startOffset="50%"
                            >
                                {textObj.text}
                            </textPath>
                        </text>
                    </svg>
                </div>
            );
        }

        return <div style={style}>{textObj.text}</div>;
    };

    const logoFilter = (() => {
        if (logoIsProcessed) return undefined;
        let f = '';
        if (logoColor === 'white') f += 'brightness(0) invert(1) ';
        else if (logoColor === 'black') f += 'brightness(0) ';
        else if (logoColor === 'red') f += 'sepia(1) saturate(1000%) hue-rotate(-50deg) ';
        else if (logoColor === 'blue') f += 'sepia(1) saturate(1000%) hue-rotate(200deg) ';
        if (logoInverted) f += 'invert(1) ';
        return f.trim() || undefined;
    })();

    return (
        <div ref={containerRef} className={`relative aspect-[3/4] overflow-hidden bg-white p-[6.5%] ${className}`}>
            {/* Base Product Image */}
            <img
                src={baseImage}
                alt={`${product.name} ${side}`}
                className="w-full h-full object-contain mix-blend-multiply flex-shrink-0 select-none pointer-events-none"
                crossOrigin="anonymous"
            />

            {/* DESIGN OVERLAY LAYER (Second Skin) */}
            <div
                className="cart-design-layer cart-item-overlay design-preview-overlay absolute inset-0 pointer-events-none z-10"
                style={{
                    width: '100%',
                    height: '100%',
                    top: 0,
                    left: 0,
                    position: 'absolute'
                }}
            >
                <div className="relative w-full h-full p-[6.5%]">
                    {/* Logo Overlay */}
                    {logoUrl && (
                        <div
                            style={{
                                position: 'absolute',
                                left: `${logoX}%`,
                                top: `${logoY}%`,
                                width: `${logoSize}%`,
                                maxWidth: '80%',
                                maxHeight: '80%',
                                transform: 'translate(-50%, -50%)',
                                zIndex: 10,
                            }}
                        >
                            <img
                                src={logoUrl.startsWith('data:') ? logoUrl : getProxiedUrl(logoUrl)}
                                alt="Logo"
                                className="w-full h-auto block"
                                crossOrigin="anonymous"
                                style={{
                                    filter: logoFilter,
                                    mixBlendMode: (logoHasBgRemoved && !logoIsProcessed) ? 'multiply' : 'normal'
                                }}
                            />
                        </div>
                    )}

                    {/* Text Overlays */}
                    {renderText(text1, 't1')}
                    {renderText(text2, 't2')}
                </div>
            </div>
        </div>
    );
};
