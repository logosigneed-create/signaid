import React, { useState } from 'react';

// Lazy Image Component with Skeleton
export const LazyImage: React.FC<{
    src: string,
    alt: string,
    className?: string,
    imageClassName?: string,
    style?: React.CSSProperties,
    onClick?: (e?: React.MouseEvent) => void,
    fetchPriority?: "high" | "low" | "auto",
    loading?: "lazy" | "eager",
    onError?: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void
}> = ({ src, alt, className, imageClassName, style, onClick, fetchPriority, loading, onError }) => {
    const [loaded, setLoaded] = useState(false);
    return (
        <div className={`relative ${className || ''}`} onClick={onClick} style={style}>
            {!loaded && (
                <div className="absolute inset-0 bg-gray-200 animate-pulse rounded-xl flex items-center justify-center">
                    <i className="fa-solid fa-image text-gray-300 text-2xl"></i>
                </div>
            )}
            <img
                src={src}
                alt={alt}
                loading={loading || "lazy"}
                decoding="async"
                // @ts-ignore - fetchpriority is standard but React types might lag
                fetchpriority={fetchPriority}
                onLoad={() => setLoaded(true)}
                onError={onError}
                className={`transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'} ${imageClassName || ''}`}
            />
        </div>
    );
};
