import React, { useState } from 'react';
import { getProxiedUrl } from '../utils/helpers';

interface CartItemImageProps {
    src?: string | null;
    alt: string;
    className?: string;
}

export const CartItemImage: React.FC<CartItemImageProps> = ({ src, alt, className }) => {
    const [error, setError] = useState(false);
    const [loaded, setLoaded] = useState(false);

    if (!src || src === 'data:,' || error) {
        return (
            <div className={`flex items-center justify-center bg-gray-100 text-gray-300 ${className}`}>
                <i className="fa-solid fa-image text-2xl"></i>
            </div>
        );
    }

    // Use proxy for Firebase Storage URLs to avoid CORS issues in development
    const proxiedSrc = src.startsWith('data:') ? src : getProxiedUrl(src);

    return (
        <>
            {!loaded && !error && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
                    <i className="fa-solid fa-spinner fa-spin text-gray-400"></i>
                </div>
            )}
            <img
                src={proxiedSrc}
                alt={alt}
                className={`${className} ${loaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
                onLoad={() => setLoaded(true)}
                onError={() => setError(true)}
                crossOrigin="anonymous"
            />
        </>
    );
};
