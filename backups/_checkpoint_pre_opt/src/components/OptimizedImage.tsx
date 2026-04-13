import React, { useState } from 'react';

interface OptimizedImageProps {
    src: string;
    alt: string;
    width?: number;
    height?: number;
    className?: string;
    imageClassName?: string;
    style?: React.CSSProperties;
    onClick?: (e?: React.MouseEvent) => void;
    // LCP optimization: first images should be eager
    priority?: boolean;
    // Firebase resize extension sizes: _100x100, _200x200, _400x400, _800x800
    targetWidth?: number;
    onError?: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
}

/**
 * Get Firebase-resized image URL if resize extension is enabled
 * Supports sizes: 100, 200, 400, 800 (from Firebase Resize Images extension)
 */
export function getResizedFirebaseUrl(url: string, _targetWidth: number): string {
    // DISABLED: Preventing 404s as the Firebase Resize extension is not configured.
    return url;
}

/**
 * OptimizedImage Component
 * - Uses lazy loading for off-screen images
 * - Uses eager loading + high priority for LCP images (priority prop)
 * - Enforces width/height to prevent CLS
 * - Requests resized versions from Firebase
 */
export const OptimizedImage: React.FC<OptimizedImageProps> = ({
    src,
    alt,
    width,
    height,
    className,
    imageClassName,
    style,
    onClick,
    priority = false,
    targetWidth = 400,
    onError
}) => {
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState(false);

    // Get optimized URL
    const optimizedSrc = getResizedFirebaseUrl(src, targetWidth);

    // Fallback to original if resized fails
    const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
        if (!error && optimizedSrc !== src) {
            // Try original URL
            setError(true);
            (e.target as HTMLImageElement).src = src;
        } else {
            onError?.(e);
        }
    };

    return (
        <div
            className={`relative overflow-hidden ${className || ''}`}
            onClick={onClick}
            style={style}
        >
            {/* Skeleton placeholder */}
            {!loaded && (
                <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
                    <svg className="w-10 h-10 text-gray-300" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                </div>
            )}

            <img
                src={error ? src : optimizedSrc}
                alt={alt}
                width={width}
                height={height}
                loading={priority ? 'eager' : 'lazy'}
                decoding={priority ? 'sync' : 'async'}
                // @ts-ignore - fetchpriority is standard but React types may lag
                fetchpriority={priority ? 'high' : 'auto'}
                onLoad={() => setLoaded(true)}
                onError={handleError}
                className={`transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'} ${imageClassName || ''}`}
            />
        </div>
    );
};

export default OptimizedImage;
