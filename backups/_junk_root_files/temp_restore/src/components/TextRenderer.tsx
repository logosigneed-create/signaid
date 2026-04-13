import React from 'react';
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
        color: textObj.color,
        textTransform: textObj.textTransform,
        letterSpacing: textObj.letterSpacing + 'px',
        lineHeight: textObj.lineHeight,
        textAlign: 'center',
        textShadow: textObj.shadow ? '2px 2px 4px rgba(0,0,0,0.5)' : 'none',
        WebkitTextStroke: textObj.outline ? '1px black' : 'none',
        whiteSpace: 'pre-wrap',
        ...style
    };

    // CURVED TEXT RENDERING
    if (textObj.curve && textObj.curve !== 0 && textObj.curveStyle !== 'flat') {
        return (() => {
            const charWidth = textObj.fontSize * 0.6;
            const textWidth = charWidth * textObj.text.length;
            const curveHeight = Math.abs(textObj.curve * 1.5);
            // Smaller padding for preview context
            const svgHeight = textObj.fontSize * 2 + curveHeight + 10;
            const svgWidth = textWidth + 20;

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
                    {textObj.curveStyle === 'upright' ? (
                        (() => {
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
                                    {textObj.text.split('').map((char, i) => {
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
                                                    textAnchor: "middle",
                                                    // Ensure stroke/shadow applied to text elements
                                                    textShadow: textStyle.textShadow,
                                                    WebkitTextStroke: textStyle.WebkitTextStroke
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
                                id={`curve-preview-${textObj.text.length}`} // Unique-ish ID
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
                                    href={`#curve-preview-${textObj.text.length}`}
                                    startOffset="50%"
                                    style={{
                                        fontFamily: textObj.fontFamily,
                                        fontWeight: textObj.fontWeight,
                                        fontSize: textObj.fontSize + 'px',
                                        letterSpacing: textObj.letterSpacing + 'px',
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
        })();
    }

    // STRAIGHT TEXT RENDERING
    return (
        <div style={{ ...textStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
            {textObj.text || "Aperçu"}
        </div>
    );
};
