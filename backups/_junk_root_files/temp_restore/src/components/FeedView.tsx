import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { Post, User, CartItem } from '../types';
import { LazyImage } from './LazyImage';
import { getProxiedUrl } from '../utils/helpers';
import { getOptimizedImageUrl } from '../utils/imageUtils';
import { db } from '../firebaseConfig';
import { setDoc, doc, serverTimestamp, getDoc } from 'firebase/firestore';
import { ShareButtons } from './ShareButtons';


export const FeedView: React.FC<{
    posts: Post[],
    onCustomize: (productType: string, initialState?: CartItem, postId?: string) => void,
    cartCount: number,
    onGoToCart: () => void,
    onValidate: (postId: string) => void,
    userSavedPosts: string[],
    onViewProfile: (user: User) => void,
    onGoToRewards: () => void,
    onLoadMore?: () => void,
    hasMorePosts?: boolean,
    isLoadingMore?: boolean
}> = ({ posts, onCustomize, cartCount, onGoToCart, onValidate, userSavedPosts, onViewProfile, onGoToRewards, onLoadMore, hasMorePosts, isLoadingMore }) => {
    // --- SORT POSTS ---
    // ENFORCED: Recent (Newest First)
    const sortedPosts = useMemo(() => {
        const p = [...posts];
        const getTime = (date: any) => {
            if (!date) return 0;
            if (date.seconds) return date.seconds * 1000;
            if (date.toDate && typeof date.toDate === 'function') return date.toDate().getTime();
            if (date instanceof Date) return date.getTime();
            const d = new Date(date);
            return isNaN(d.getTime()) ? 0 : d.getTime();
        };
        return p.sort((a, b) => getTime(b.createdAt) - getTime(a.createdAt));
    }, [posts]);

    const approvedPosts = sortedPosts.filter(p => p.status !== 'rejected');
    const [activeIndex, setActiveIndex] = useState(0);
    const [brokenImageIds, setBrokenImageIds] = useState<Set<string>>(new Set());
    const [failedOptimizedIds, setFailedOptimizedIds] = useState<Set<string>>(new Set());
    const scrollRef = useRef<HTMLDivElement>(null);
    const sentinelRef = useRef<HTMLDivElement>(null);

    // Detect desktop mode for inline style overrides
    const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);

    React.useEffect(() => {
        const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Infinite scroll: IntersectionObserver for auto-loading
    useEffect(() => {
        if (!sentinelRef.current || !onLoadMore || !hasMorePosts) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && !isLoadingMore && hasMorePosts) {
                    onLoadMore();
                }
            },
            { threshold: 0.1 }
        );

        observer.observe(sentinelRef.current);
        return () => observer.disconnect();
    }, [onLoadMore, hasMorePosts, isLoadingMore]);

    // Filter out only truly broken images (not Base64 - legacy data still uses Base64)
    const filteredPosts = useMemo(() => {
        const result = approvedPosts.filter(p => !brokenImageIds.has(p.id));
        console.log('[FeedView] Posts ready:', result.length);
        return result;
    }, [approvedPosts, brokenImageIds]);

    const handlePrev = () => {
        setActiveIndex(prev => (prev > 0 ? prev - 1 : filteredPosts.length - 1));
    };

    const handleNext = () => {
        setActiveIndex(prev => (prev < filteredPosts.length - 1 ? prev + 1 : 0));
    };

    // Calculate carousel offset - COMPACT DESKTOP VERSION
    const imgWidth = 260; // Reduced from 340
    const sidebarWidth = 60;
    const gap = 80; // Reduced from 120
    const cardTotalWidth = imgWidth + sidebarWidth;
    const trackOffset = isDesktop ? `calc(50vw - ${imgWidth / 2}px - ${activeIndex * (cardTotalWidth + gap)}px)` : '0';

    return (
        <div
            ref={scrollRef}
            className={`h-full w-full bg-black relative feed-container ${isDesktop ? 'desktop-carousel overflow-hidden lg:bg-gray-100' : 'snap-y snap-mandatory overflow-y-scroll overscroll-y-contain'}`}
            style={!isDesktop ? { scrollbarWidth: 'none', msOverflowStyle: 'none', height: '100%' } : {}}
        >
            {isDesktop ? (
                <div
                    className="feed-track"
                    style={{ transform: `translateX(${trackOffset})` }}
                >
                    {filteredPosts.map((post, index) => {
                        const isValidated = userSavedPosts.includes(post.id);
                        const isActive = index === activeIndex;

                        return (
                            <div
                                key={post.id}
                                className={`feed-card ${isActive ? 'active' : ''}`}
                                onClick={() => {
                                    if (!isActive) setActiveIndex(index);
                                }}
                            >
                                {/* Zone Image */}
                                <div
                                    className="feed-card-media cursor-pointer"
                                    onClick={() => isActive && onCustomize(post.tags[0].productType, post.customization, post.id)}
                                >
                                    <LazyImage
                                        src={getProxiedUrl(failedOptimizedIds.has(post.id) ? post.imageUrl : getOptimizedImageUrl(post.imageUrl, 400), { width: 1080, quality: 80 })}
                                        className="w-full h-full"
                                        imageClassName="w-full h-full object-cover object-top"
                                        alt="Post content"
                                        loading={index < 2 ? 'eager' : 'lazy'}
                                        fetchPriority={index < 2 ? 'high' : 'auto'}
                                        onError={() => {
                                            if (!failedOptimizedIds.has(post.id)) {
                                                // First failure (Optimized) -> Fallback to original
                                                setFailedOptimizedIds(prev => {
                                                    const next = new Set(prev);
                                                    next.add(post.id);
                                                    return next;
                                                });
                                            } else {
                                                // Second failure (Original) -> Hide post
                                                setBrokenImageIds(prev => {
                                                    const next = new Set(prev);
                                                    next.add(post.id);
                                                    return next;
                                                });
                                            }
                                        }}
                                    />

                                    {/* AI Watermark Overlay */}
                                    {post.type === 'ai' && (
                                        <div className="absolute bottom-2 right-2 bg-black/50 text-white text-[9px] px-2 py-1 rounded backdrop-blur-sm z-30 pointer-events-none">
                                            Généré par Gemini
                                        </div>
                                    )}

                                    {/* Info overlay sur l'image */}
                                    <div className="feed-card-info">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-bold text-sm cursor-pointer hover:underline" onClick={(e) => { e.stopPropagation(); onViewProfile(post.user); }}>@{post.user.username}</span>
                                            <div className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold flex items-center gap-1 border ${post.type === 'ai' ? 'bg-orange-500/30 border-orange-500/50 text-orange-200' : 'bg-green-500/30 border-green-500/50 text-green-200'}`}>
                                                {post.type === 'ai' ? <i className="fa-solid fa-wand-magic-sparkles"></i> : <i className="fa-solid fa-camera"></i>}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Product Tag Pointer - 65% */}
                                    {post.tags.length > 0 && (
                                        <div className="absolute top-[65%] left-1/2 -translate-x-1/2 z-30">
                                            <div
                                                className="bg-white/90 backdrop-blur-md border border-gray-200 p-2 rounded-full cursor-pointer hover:bg-orange-500 transition-all hover:scale-110 group shadow-lg"
                                                onClick={(e) => { e.stopPropagation(); onCustomize(post.tags[0].productType, post.customization, post.id); }}
                                            >
                                                <div className="w-2 h-2 rounded-full bg-orange-500 group-hover:bg-white transition-colors animate-pulse"></div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Sidebar Actions (à droite de l'image) */}
                                <div className="feed-actions-sidebar" onClick={(e) => e.stopPropagation()}>
                                    <div className="flex flex-col items-center">
                                        <div
                                            className="action-btn cursor-pointer"
                                            onClick={() => onViewProfile(post.user)}
                                        >
                                            <img
                                                src={post.user.avatarUrl || '/assets/default-avatar.png'}
                                                className="w-full h-full rounded-full object-cover"
                                                alt={post.user.username}
                                                onError={(e) => { (e.target as HTMLImageElement).src = 'https://ui-avatars.com/api/?name=' + post.user.username; }}
                                            />
                                        </div>
                                    </div>

                                    <div className="flex flex-col items-center">
                                        <button
                                            onClick={() => onValidate(post.id)}
                                            className={`action-btn ${isValidated ? '!bg-green-500 !text-white !border-green-500' : ''}`}
                                        >
                                            <i className={`fa-solid ${isValidated ? 'fa-check' : 'fa-handshake'}`}></i>
                                        </button>
                                        <span className="action-label">{post.validations || 0}</span>
                                    </div>

                                    <div className="flex flex-col items-center">
                                        <button
                                            onClick={() => onCustomize(post.tags[0].productType, post.customization, post.id)}
                                            className="action-btn"
                                        >
                                            <i className="fa-solid fa-shirt"></i>
                                        </button>
                                        <span className="action-label">Remix</span>
                                    </div>

                                    <div className="flex flex-col items-center">
                                        <button
                                            onClick={() => onCustomize(post.tags[0].productType, post.customization, post.id)}
                                            className="action-btn"
                                        >
                                            <i className="fa-solid fa-cart-shopping"></i>
                                        </button>
                                        <span className="action-label">Shop</span>
                                    </div>

                                    <div className="flex flex-col items-center">
                                        <ShareButtons
                                            imageUrl={post.imageUrl}
                                            postId={post.id}
                                            productType={post.tags[0]?.productType}
                                            magicLink={`${window.location.origin}/remix/${post.id}`}
                                        />
                                        <span className="action-label">Share</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                filteredPosts.map(post => {
                    const isValidated = userSavedPosts.includes(post.id);
                    return (
                        <div
                            key={post.id}
                            className="relative w-full h-[85dvh] snap-start bg-zinc-900 overflow-hidden cursor-pointer flex-shrink-0 transition-all hover:brightness-110 feed-card"
                            onClick={() => onCustomize(post.tags[0].productType, post.customization, post.id)}
                        >
                            <LazyImage
                                src={getProxiedUrl(getOptimizedImageUrl(post.imageUrl, 800), { width: 800, quality: 80 })}
                                className="absolute inset-0 w-full h-full"
                                imageClassName="w-full h-full object-cover object-top"
                                alt="Post content"
                                loading={filteredPosts.indexOf(post) < 2 ? 'eager' : 'lazy'}
                                fetchPriority={filteredPosts.indexOf(post) < 2 ? 'high' : 'auto'}
                                onError={() => {
                                    setBrokenImageIds(prev => {
                                        const next = new Set(prev);
                                        next.add(post.id);
                                        return next;
                                    });
                                }}
                            />


                            {/* Mobile Sidebar Actions */}
                            <div className="feed-mobile-actions absolute bottom-36 right-2 flex flex-col items-center gap-6 z-10" onClick={(e) => e.stopPropagation()}>
                                <div className="relative cursor-pointer" onClick={() => onViewProfile(post.user)}>
                                    <img
                                        src={post.user.avatarUrl || '/assets/default-avatar.png'}
                                        className="w-12 h-12 rounded-full border-2 border-white shadow-lg object-cover bg-gray-300"
                                        alt={post.user.username}
                                        onError={(e) => { (e.target as HTMLImageElement).src = 'https://ui-avatars.com/api/?name=' + post.user.username; }}
                                    />
                                </div>

                                <button
                                    onClick={() => onValidate(post.id)}
                                    className="flex flex-col items-center gap-1 group"
                                >
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all ${isValidated ? 'bg-green-500 text-white' : 'bg-black/40 backdrop-blur-md text-white border border-white/20 group-hover:bg-black/60'}`}>
                                        <i className={`fa-solid ${isValidated ? 'fa-check' : 'fa-handshake rotate-90'} text-xl`}></i>
                                    </div>
                                    <span className="text-white text-xs font-bold drop-shadow-md">{post.validations || 0}</span>
                                </button>

                                <button
                                    onClick={() => onCustomize(post.tags[0].productType, post.customization, post.id)}
                                    className="flex flex-col items-center gap-1 group"
                                >
                                    <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md text-white border border-white/20 flex items-center justify-center shadow-lg group-hover:bg-black/60 transition-all">
                                        <i className="fa-solid fa-shirt text-lg"></i>
                                    </div>
                                    <span className="text-white text-xs font-bold drop-shadow-md">Remix</span>
                                </button>

                                <div className="flex flex-col items-center gap-1">
                                    <ShareButtons
                                        imageUrl={post.imageUrl}
                                        postId={post.id}
                                        productType={post.tags[0]?.productType}
                                        magicLink={`${window.location.origin}/remix/${post.id}`}
                                    />
                                    <span className="text-white text-xs font-bold drop-shadow-md">Share</span>
                                </div>
                            </div>

                            <div className="absolute bottom-0 left-0 w-full p-4 pb-20 bg-gradient-to-t from-black/95 via-black/60 to-transparent text-white pointer-events-none lg:pb-4">
                                <div className="flex items-center gap-2 mb-2 pointer-events-auto">
                                    <span className="font-bold text-lg drop-shadow-md cursor-pointer hover:underline" onClick={() => onViewProfile(post.user)}>@{post.user.username}</span>
                                    <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 border ${post.type === 'ai' ? 'bg-orange-500/20 border-orange-500/50 text-orange-300' : 'bg-green-500/20 border-green-500/50 text-green-300'}`}>
                                        {post.type === 'ai' ? <i className="fa-solid fa-wand-magic-sparkles"></i> : <i className="fa-solid fa-camera"></i>}
                                        <span>{post.type === 'ai' ? 'IA' : 'Réel'}</span>
                                    </div>
                                </div>
                                <p className="text-sm text-gray-100 mb-2 line-clamp-2 drop-shadow-md pointer-events-auto">{post.caption}</p>
                            </div>

                            {post.tags.length > 0 && (
                                <div className="absolute top-[65%] left-1/2 -translate-x-1/2 z-30 flex gap-2">
                                    {post.tags.map((tag) => (
                                        <div
                                            key={tag.id}
                                            className="bg-black/40 backdrop-blur-md border border-white/20 p-2 rounded-full cursor-pointer hover:bg-black/60 transition-all hover:scale-110 group shadow-lg"
                                            onClick={() => onCustomize(tag.productType, post.customization, post.id)}
                                        >
                                            <div className="w-2 h-2 rounded-full bg-white group-hover:bg-orange-500 transition-colors animate-pulse"></div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })
            )}

            {/* Desktop Navigation Arrows */}
            {isDesktop && (
                <>
                    <button
                        onClick={handlePrev}
                        className="nav-arrow left"
                        title="Précédent"
                    >
                        <i className="fa-solid fa-chevron-left"></i>
                    </button>

                    <button
                        onClick={handleNext}
                        className="nav-arrow right"
                        title="Suivant"
                    >
                        <i className="fa-solid fa-chevron-right"></i>
                    </button>
                </>
            )}

            {/* Infinite Scroll Sentinel - triggers loadMore when visible */}
            {onLoadMore && hasMorePosts && (
                <div
                    ref={sentinelRef}
                    className="h-20 flex items-center justify-center"
                >
                    {isLoadingMore && (
                        <div className="text-white flex items-center gap-2">
                            <i className="fa-solid fa-spinner animate-spin"></i>
                            Chargement...
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
