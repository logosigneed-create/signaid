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
export function getResizedFirebaseUrl(url: string, targetWidth: number): string {
    if (!url || url.startsWith('data:')) return url;

    // Choose the smallest available size that fits the target
    const sizes = [100, 200, 400, 800];
    const size = sizes.find(s => s >= targetWidth) || sizes[sizes.length - 1];

    // Firebase Storage URLs with resize extension
    if (url.includes('firebasestorage.googleapis.com')) {
        // Check if already resized
        if (url.includes('_thumb') || url.includes('_100x100') || url.includes('_200x200')) {
            return url;
        }
        // Add resize suffix before extension
        const extMatch = url.match(/(\.[a-zA-Z]+)(\?.*)?$/);
        if (extMatch) {
            const ext = extMatch[1];
            const query = extMatch[2] || '';
            return url.replace(ext + query, `_${size}x${size}${ext}${query}`);
        }
    }

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
