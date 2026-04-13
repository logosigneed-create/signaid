import React, { useMemo, useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import { Post, User, CartItem } from '../types';
import { LazyImage } from './LazyImage';
import { getProxiedUrl } from '../utils/helpers';
import { getOptimizedImageUrl } from '../utils/imageUtils';
import { db } from '../firebaseConfig';
import { setDoc, doc, serverTimestamp, getDoc } from 'firebase/firestore';
import { ShareButtons } from './ShareButtons';


export const FeedView: React.FC<{
    posts: Post[],
    onCustomize: (productType: string, initialState?: CartItem, postId?: string, triggerAi?: boolean) => void,
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
    const sortedPosts = useMemo(() => {
        // UPDATED: Random Order requested. We use the order passed from parent (which is shuffled).
        return [...posts];
    }, [posts]);

    const approvedPosts = sortedPosts.filter(p => p.status !== 'rejected' && !p.isPrivate);
    const [activeIndex, setActiveIndex] = useState(0);
    const [desktopPage, setDesktopPage] = useState(1); // START AT 1: Show 3 items immediately (0-1-2)
    const [brokenImageIds, setBrokenImageIds] = useState<Set<string>>(new Set());
    const [failedOptimizedIds, setFailedOptimizedIds] = useState<Set<string>>(new Set());
    const scrollRef = useRef<HTMLDivElement>(null);
    const sentinelRef = useRef<HTMLDivElement>(null);

    // Detect desktop mode for inline style overrides
    const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);

    // PERSISTENCE: Charger depuis localStorage ou défaut 10
    const [debugPadding, setDebugPadding] = useState(() => {
        const saved = localStorage.getItem('feed_debug_padding');
        return saved ? Number(saved) : 10;
    });

    // AUTO-SCROLL LOGIC (Round 56: Rigid Restoration)
    const containerRef = useRef<HTMLDivElement>(null);
    const scrolledOnce = useRef(false);
    const scrollPos = useRef<number | null>(null);

    // Initial Calibration (First Click Only)
    // Initial Calibration (First Click Only)
    // Initial Calibration (First Click Only)
    // Initial Auto-Scroll (One time on mount)
    // Automatically scroll down to show the full carousel
    useEffect(() => {
        const timer = setTimeout(() => {
            if (containerRef.current && window.scrollY < 50) {
                const rect = containerRef.current.getBoundingClientRect();
                const absoluteTop = rect.top + window.scrollY;
                // Scroll to Top of carousel minus a small header offset
                window.scrollTo({ top: absoluteTop - 60, behavior: 'smooth' });
            }
        }, 800); // Slight delay for load
        return () => clearTimeout(timer);
    }, []);

    const handleCalibrationScroll = () => {
        // Disabled: Do nothing on click
        // window.scrollTo({ top: 0, behavior: 'auto' });
        // scrolledOnce.current = true;
    };

    // Strict Scroll Restoration (Subsequent Clicks)
    // Strict Scroll Restoration (Subsequent Clicks)
    // DISABLED: We now force centering on every click in the handler
    useLayoutEffect(() => {
        // if (scrollPos.current !== null) {
        //     window.scrollTo(0, scrollPos.current);
        //     scrollPos.current = null;
        // }
    }, [desktopPage]);

    // Sauvegarder dans localStorage à chaque changement
    useEffect(() => {
        localStorage.setItem('feed_debug_padding', debugPadding.toString());
    }, [debugPadding]);

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
        // Trigger "Load More" when approaching the end (Desktop Infinite Scroll)
        if (hasMorePosts && onLoadMore && activeIndex >= filteredPosts.length - 5) {
            onLoadMore();
        }

        setActiveIndex(prev => {
            // Standard Next
            if (prev < filteredPosts.length - 1) return prev + 1;
            // If at end AND has more posts, don't loop yet (wait for load)
            if (hasMorePosts) return prev;
            // Verify loop: if no more posts, go back to 0
            return 0;
        });
    };

    // Calculate carousel offset - SINGLE POST DESKTOP VERSION
    const imgWidth = 500; // Increased from 260 for better single view visibility
    const sidebarWidth = 60;
    const gap = 4000; // Large gap to show ONLY one post at a time
    const cardTotalWidth = imgWidth + sidebarWidth;
    // Center calculation: Screen Center - Half Image - Current Position
    const trackOffset = isDesktop ? `calc(50vw - ${imgWidth / 2}px - ${activeIndex * (cardTotalWidth + gap)}px)` : '0';

    // Add ID for global layout adjuster

    return (
        <div
            ref={scrollRef}
            className={`w-full bg-black relative feed-container ${isDesktop ? 'h-full desktop-carousel overflow-hidden lg:bg-gray-100' : 'min-h-[100dvh] pb-safe'}`}
        >
            {isDesktop ? (
                // DESKTOP: PAGINATED GRID (3 ITEMS, 9:16 RATIO)
                <div ref={containerRef} className="w-full h-full flex items-start justify-center pt-12 pb-8 px-8 bg-gray-100 relative">

                    {/* LEFT ARROW */}
                    {filteredPosts.length > 1 && (
                        <button
                            tabIndex={-1}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={(e) => {
                                e.preventDefault();
                                e.currentTarget.blur();

                                handleCalibrationScroll();
                                if (desktopPage > 0) {
                                    setDesktopPage(p => p - 1);
                                } else {
                                    setDesktopPage(filteredPosts.length - 1);
                                }
                            }}
                            className="fixed left-8 z-[100] w-12 h-12 rounded-full bg-white shadow-lg flex items-center justify-center text-gray-800 hover:text-orange-600 hover:scale-110 transition-all font-black text-xl border border-gray-100 top-1/2 -translate-y-1/2"
                        >
                            <i className="fa-solid fa-chevron-left"></i>
                        </button>
                    )}

                    {/* HERO CAROUSEL CONTAINER */}
                    <div className="flex items-start justify-center gap-8 w-full py-2">
                        {(() => {
                            // Calculate indexes to show: [Left, Center, Right]
                            const len = filteredPosts.length || 1;
                            const centerIdx = desktopPage;
                            const leftIdx = (desktopPage - 1 + len) % len;
                            const rightIdx = (desktopPage + 1) % len;

                            const itemsToShow = [
                                { post: filteredPosts[leftIdx], type: 'left', idx: leftIdx },
                                { post: filteredPosts[centerIdx], type: 'center', idx: centerIdx },
                                { post: filteredPosts[rightIdx], type: 'right', idx: rightIdx }
                            ];

                            return itemsToShow.map(({ post, type, idx }) => {
                                if (!post) {
                                    return <div key={`empty-${type}`} className={`${type === 'center' ? 'w-[320px] h-[568px]' : 'w-[240px] h-[426px]'} opacity-0`}></div>;
                                }

                                const isValidated = userSavedPosts.includes(post.id);
                                const isCenter = type === 'center';

                                return (
                                    <div
                                        key={post.id}
                                        className={`relative bg-white rounded-2xl overflow-hidden shadow-2xl border border-gray-100 group
                                            ${isCenter
                                                ? 'w-[320px] h-[568px] z-20 scale-100 opacity-100 -mt-12'
                                                : 'w-[240px] h-[426px] z-10 opacity-100 hover:scale-95 cursor-pointer mt-0'
                                            }
                                        `}
                                        onClick={() => {
                                            if (!isCenter) {
                                                setDesktopPage(idx);
                                            }
                                        }}
                                    >
                                        <div
                                            className="w-full h-full relative"
                                            onClick={(e) => {
                                                if (isCenter) {
                                                    e.stopPropagation();
                                                    onCustomize(post.tags[0].productType, post.customization, post.id);
                                                }
                                            }}
                                        >
                                            <LazyImage
                                                src={getProxiedUrl(failedOptimizedIds.has(post.id) ? post.imageUrl : getOptimizedImageUrl(post.imageUrl, 800), { width: 800, quality: 80 })}
                                                srcSet={`${getProxiedUrl(post.imageUrl, { width: 480, quality: 80 })} 480w, ${getProxiedUrl(post.imageUrl, { width: 800, quality: 80 })} 800w, ${getProxiedUrl(post.imageUrl, { width: 1200, quality: 80 })} 1200w`}
                                                sizes="(max-width: 1024px) 100vw, 500px"
                                                className="w-full h-full"
                                                imageClassName="w-full h-full object-contain bg-black group-hover:scale-105"
                                                alt="Post content"
                                                loading={isCenter ? "eager" : "lazy"}
                                            />

                                            <div className={`absolute bottom-0 left-0 w-full bg-gradient-to-t from-black/90 via-black/50 to-transparent pt-20 pb-6 px-6 z-20 transition-opacity duration-300 ${isCenter ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                                <div className="font-bold text-white text-lg hover:underline cursor-pointer flex items-center gap-2" onClick={(e) => { e.stopPropagation(); onViewProfile(post.user); }}>
                                                    @{post.user.username}
                                                    {post.type === 'ai' && <i className="fa-solid fa-robot text-xs opacity-70"></i>}
                                                </div>
                                            </div>

                                            {isCenter && post.tags.length > 0 && (
                                                <div className="absolute top-[65%] left-1/2 -translate-x-1/2 z-30">
                                                    <div
                                                        className="bg-white/90 backdrop-blur-md border border-gray-200 p-2 rounded-full shadow-lg"
                                                    >
                                                        <div className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse"></div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {isCenter && (
                                            <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-end p-5 gap-3 z-30 pointer-events-none">
                                                <div className="pointer-events-auto flex flex-col gap-3 mt-12">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); onValidate(post.id); }}
                                                        className={`w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-md shadow-lg transition-transform hover:scale-110 ${isValidated ? 'bg-green-500 text-white' : 'bg-white text-gray-800 hover:bg-gray-50'}`}
                                                    >
                                                        <i className={`fa-solid ${isValidated ? 'fa-check' : 'fa-handshake'} text-lg`}></i>
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); onCustomize(post.tags[0].productType, post.customization, post.id); }}
                                                        className="w-11 h-11 rounded-full bg-white text-gray-800 flex items-center justify-center shadow-lg hover:text-orange-600"
                                                    >
                                                        <i className="fa-solid fa-shirt text-lg"></i>
                                                    </button>
                                                    <div className="pointer-events-auto" onClick={(e) => e.stopPropagation()}>
                                                        <ShareButtons
                                                            imageUrl={post.imageUrl}
                                                            postId={post.id}
                                                            productType={post.tags[0]?.productType}
                                                            magicLink={`${window.location.origin}/remix/${post.id}`}
                                                            compact={true}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            });
                        })()
                        }
                    </div>

                    {/* RIGHT ARROW */}
                    {filteredPosts.length > 1 && (
                        <button
                            tabIndex={-1}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={(e) => {
                                e.preventDefault();
                                e.currentTarget.blur();
                                handleCalibrationScroll();
                                if (desktopPage < filteredPosts.length - 1) {
                                    setDesktopPage(p => p + 1);
                                    if (hasMorePosts && onLoadMore && desktopPage >= filteredPosts.length - 3) {
                                        onLoadMore();
                                    }
                                } else {
                                    if (hasMorePosts && onLoadMore) {
                                        onLoadMore();
                                    } else {
                                        setDesktopPage(0);
                                    }
                                }
                            }}
                            className="fixed right-8 z-[100] w-12 h-12 rounded-full bg-white shadow-lg flex items-center justify-center text-gray-800 hover:text-orange-600 hover:scale-110 transition-all font-black text-xl border border-gray-100 top-1/2 -translate-y-1/2"
                        >
                            <i className="fa-solid fa-chevron-right"></i>
                        </button>
                    )}
                </div>
            ) : (
                <div className="h-[100dvh] overflow-y-scroll snap-y snap-mandatory scrollbar-hide">
                    {filteredPosts.map(post => {
                        const isValidated = userSavedPosts.includes(post.id);
                        return (
                            <div
                                key={post.id}
                                className="relative w-full h-[100dvh] snap-center snap-always bg-zinc-900 overflow-hidden cursor-pointer flex-shrink-0 transition-all feed-card"
                                onClick={() => onCustomize(post.tags[0].productType, post.customization, post.id)}
                            >
                                {/* Blured Background Layer (No Crop Effect) */}
                                <div className="absolute inset-0 w-full h-full">
                                    <LazyImage
                                        src={getProxiedUrl(getOptimizedImageUrl(post.imageUrl, 200), { width: 200, quality: 50 })}
                                        className="w-full h-full"
                                        imageClassName="w-full h-full object-cover blur-2xl brightness-50 transform scale-110"
                                        alt=""
                                        loading="lazy"
                                    />
                                </div>

                                {/* Main Image (Contained) */}
                                <LazyImage
                                    src={getProxiedUrl(getOptimizedImageUrl(post.imageUrl, 800), { width: 800, quality: 80 })}
                                    srcSet={`${getProxiedUrl(post.imageUrl, { width: 480, quality: 80 })} 480w, ${getProxiedUrl(post.imageUrl, { width: 800, quality: 80 })} 800w, ${getProxiedUrl(post.imageUrl, { width: 1200, quality: 80 })} 1200w`}
                                    sizes="100vw"
                                    className="absolute inset-0 w-full h-full z-10"
                                    imageClassName="w-full h-full object-contain"
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
                                <div className="feed-mobile-actions absolute bottom-36 right-2 flex flex-col items-center gap-6 z-20" onClick={(e) => e.stopPropagation()}>
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

                                <div className="absolute bottom-0 left-0 w-full p-4 pb-20 bg-gradient-to-t from-black/95 via-black/60 to-transparent text-white pointer-events-none lg:pb-4 z-20">
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
                    })}
                </div>
            )
            }



            {/* Infinite Scroll Sentinel - triggers loadMore when visible */}
            {
                onLoadMore && hasMorePosts && (
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
                )
            }
        </div >
    );
};
