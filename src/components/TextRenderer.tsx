import React, { useId } from 'react';
import { TextConfig } from '../types';

interface TextRendererProps {
    textObj: TextConfig;
    style?: React.CSSProperties;
}

export const TextRenderer: React.FC<TextRendererProps> = ({ textObj, style }) => {
    // Shared logic with DraggableElement for styling
    const textStyle: React.CSSProperties = {
        fontFamily: textObj.fontFamily,
        fontSize: textObj.fontSize + 'px',
        fontWeight: textObj.fontWeight,
        color: textObj.noFill ? 'transparent' : textObj.color,
        textTransform: textObj.textTransform,
        letterSpacing: textObj.letterSpacing + 'px',
        lineHeight: textObj.lineHeight,
        textAlign: 'center',
        textShadow: textObj.shadow ? '2px 2px 4px rgba(0,0,0,0.5)' : 'none',
        WebkitTextStroke: textObj.outline ? `${textObj.outlineWidth || 1}px ${textObj.outlineColor || 'black'}` : 'none',
        whiteSpace: 'pre-wrap',
        transform: (textObj.scaleY && textObj.scaleY !== 1) || (textObj.scaleX && textObj.scaleX !== 1) ? `scale(${textObj.scaleX || 1}, ${textObj.scaleY || 1})` : undefined,
        transformOrigin: 'center',
        ...style
    };

    // Special case for black text wanting a white outline if no color specified
    if (textObj.outline && !textObj.outlineColor && (textObj.color === '#000000' || textObj.color === 'black')) {
        textStyle.WebkitTextStroke = `${textObj.outlineWidth || 1}px white`;
    }

    const uniqueId = useId().replace(/:/g, ''); // Remove colons for valid SVG IDs
    // CURVED TEXT RENDERING
    if (textObj.curve && textObj.curve !== 0 && textObj.curveStyle !== 'flat') {
        return (() => {
            const spacing = textObj.letterSpacing || 0;
            const charWidth = textObj.fontSize * 0.6 + spacing;
            const textWidth = charWidth * textObj.text.length;
            const curveHeight = Math.abs(textObj.curve * 1.5);
            // Smaller padding for preview context
            const svgHeight = textObj.fontSize * 2 + curveHeight + 30; // Increased buffer
            const svgWidth = textWidth + 80; // Increased horizontal margin

            const baselineY = svgHeight / 2 + (textObj.curve > 0 ? -curveHeight / 2 : curveHeight / 2);

            return (
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="100%"
                    height="100%"
                    viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                    style={{ overflow: 'visible', ...style }} // Pass style to svg 
                    preserveAspectRatio="xMidYMid meet"
                >
                    {(() => {
                        const mCanvas = document.createElement('canvas');
                        const mCtx = mCanvas.getContext('2d');
                        if (!mCtx) return null;
                        
                        const fontFamily = textObj.fontFamily || 'Inter';
                        const fontSize = textObj.fontSize;
                        const fontWeight = textObj.fontWeight || '700';
                        const pkgSpacing = textObj.letterSpacing || 0;

                        mCtx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
                        
                        const chars = textObj.text.split('');
                        const charWidths = chars.map(c => mCtx.measureText(c).width);
                        const totalTextWidth = charWidths.reduce((a, b) => a + b, 0) + (pkgSpacing * (chars.length - 1));

                        const scX = Math.abs(textObj.scaleX || 1);
                        const scaledTotalWidth = totalTextWidth * scX;

                        const getQuadraticBezierPoint = (t: number, p0: any, p1: any, p2: any) => {
                            const x = (1 - t) * (1 - t) * p0.x + 2 * (1 - t) * t * p1.x + t * t * p2.x;
                            const y = (1 - t) * (1 - t) * p0.y + 2 * (1 - t) * t * p1.y + t * t * p2.y;
                            return { x, y };
                        };

                        // Use the real measured width for the curve start/end
                        const horizontalMargin = 40;
                        const svgWidthReal = scaledTotalWidth + horizontalMargin * 2;
                        
                        const P0 = { x: horizontalMargin, y: baselineY };
                        const P1 = { x: svgWidthReal / 2, y: baselineY + (textObj.curve * 3) };
                        const P2 = { x: svgWidthReal - horizontalMargin, y: baselineY };

                        let currentWidthSum = 0;
                        return (
                            <g transform={`translate(${(svgWidth - svgWidthReal)/2}, 0)`}>
                                {chars.map((char, i) => {
                                    const w = charWidths[i] * scX;
                                    const sp = pkgSpacing * scX;
                                    const charCenter = currentWidthSum + w/2;
                                    const t = charCenter / (scaledTotalWidth || 1);
                                    
                                    const point = getQuadraticBezierPoint(t, P0, P1, P2);

                                    const dx = 2 * ((1 - t) * (P1.x - P0.x) + t * (P2.x - P1.x));
                                    const dy = 2 * ((1 - t) * (P1.y - P0.y) + t * (P2.y - P1.y));
                                    const angle = Math.atan2(dy, dx) * (180 / Math.PI);

                                    const element = (
                                        <text
                                            key={i}
                                            x={point.x}
                                            y={point.y}
                                            style={{
                                                ...textStyle,
                                                transform: `rotate(${angle}deg) scale(${textObj.scaleX || 1}, ${textObj.scaleY || 1})`,
                                                transformOrigin: `${point.x}px ${point.y}px`,
                                                dominantBaseline: "middle",
                                                textAnchor: "middle",
                                            }}
                                            fill={textObj.noFill ? 'transparent' : textObj.color}
                                            stroke={textObj.outline ? (textObj.outlineColor || 'black') : 'none'}
                                            strokeWidth={textObj.outline ? `${textObj.outlineWidth || 0.5}px` : "0"}
                                        >
                                            {char}
                                        </text>
                                    );
                                    
                                    currentWidthSum += w + sp;
                                    return element;
                                })}
                            </g>
                        );
                    })()}
                </svg>
            );
        })();
    }

    // STRAIGHT TEXT RENDERING
    return (
        <div style={{ ...textStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
            {textObj.text}
        </div>
    );
};
