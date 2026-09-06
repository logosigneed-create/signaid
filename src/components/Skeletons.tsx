import React from 'react';

export const ShimmerItem: React.FC<{ className?: string }> = ({ className = "" }) => (
    <div className={`animate-shimmer rounded-md ${className}`}></div>
);

export const FeedSkeleton = () => (
    <>
        {/* Desktop Skeleton */}
        <div className="hidden lg:flex w-full h-full items-start justify-center pt-12 pb-8 px-8 bg-gray-100 relative overflow-hidden">
            <div className="flex items-start justify-center gap-8 w-full py-2">
                {/* Left Mock */}
                <div className="w-[240px] h-[426px] bg-white rounded-2xl shadow-xl opacity-60 flex-shrink-0">
                    <ShimmerItem className="w-full h-full rounded-2xl" />
                </div>
                
                {/* Center Mock (Hero) */}
                <div className="w-[320px] h-[568px] bg-white rounded-2xl shadow-2xl z-20 -mt-12 flex-shrink-0 flex flex-col p-4 relative">
                    <ShimmerItem className="w-full flex-1 rounded-xl mb-4" />
                    <div className="flex items-center gap-3 absolute bottom-6 left-6">
                        <ShimmerItem className="w-12 h-12 rounded-full" />
                        <div className="space-y-2">
                            <ShimmerItem className="w-32 h-4" />
                            <ShimmerItem className="w-24 h-3 opacity-70" />
                        </div>
                    </div>
                </div>

                {/* Right Mock */}
                <div className="w-[240px] h-[426px] bg-white rounded-2xl shadow-xl opacity-60 flex-shrink-0">
                    <ShimmerItem className="w-full h-full rounded-2xl" />
                </div>
            </div>
        </div>

        {/* Mobile Skeleton */}
        <div className="lg:hidden w-full h-[100dvh] bg-zinc-900 border-none relative overflow-hidden flex flex-col pb-safe">
            <ShimmerItem className="w-full h-full opacity-20" />
            
            {/* Sidebar Actions Mock */}
            <div className="absolute bottom-36 right-2 flex flex-col items-center gap-6 z-20">
                <ShimmerItem className="w-12 h-12 rounded-full border-2 border-zinc-700 bg-zinc-800" />
                <ShimmerItem className="w-10 h-10 rounded-full bg-zinc-800/80" />
                <ShimmerItem className="w-10 h-10 rounded-full bg-zinc-800/80" />
                <ShimmerItem className="w-8 h-8 rounded-full bg-zinc-800/80" />
            </div>

            {/* Bottom Content Mock */}
            <div className="absolute bottom-16 left-0 w-full p-4 z-20 space-y-3">
                <div className="flex items-center gap-2">
                    <ShimmerItem className="w-24 h-5 rounded-md bg-zinc-800/80" />
                    <ShimmerItem className="w-14 h-4 rounded-full bg-zinc-800/80" />
                </div>
                <ShimmerItem className="w-64 h-3 rounded-sm bg-zinc-800/80" />
                <ShimmerItem className="w-48 h-3 rounded-sm bg-zinc-800/80" />
            </div>
        </div>
    </>
);

export const CustomizerSkeleton = () => (
    <div className="w-full h-full bg-white flex flex-col">
        {/* Header Mock */}
        <div className="h-16 border-b flex items-center px-4 justify-between">
            <ShimmerItem className="w-32 h-8" />
            <div className="flex gap-4">
                <ShimmerItem className="w-10 h-10 rounded-full" />
                <ShimmerItem className="w-10 h-10 rounded-full" />
            </div>
        </div>
        
        <div className="flex-1 flex flex-col lg:flex-row p-4 gap-4">
            {/* Left Sidebar Mock (Desktop) */}
            <div className="hidden lg:flex w-20 flex-col gap-6 pt-10">
                <ShimmerItem className="w-12 h-12 rounded-xl mx-auto" />
                <ShimmerItem className="w-12 h-12 rounded-xl mx-auto" />
                <ShimmerItem className="w-12 h-12 rounded-xl mx-auto" />
            </div>

            {/* Main Canvas Mock */}
            <div className="flex-1 bg-gray-50 rounded-3xl flex items-center justify-center relative">
                <ShimmerItem className="w-3/4 h-3/4 rounded-2xl opacity-30" />
            </div>

            {/* Right Panel Mock (Desktop) */}
            <div className="hidden lg:flex w-80 flex-col gap-6">
                <ShimmerItem className="w-full h-40 rounded-2xl" />
                <ShimmerItem className="w-full h-20 rounded-2xl" />
                <ShimmerItem className="w-full h-64 rounded-2xl" />
            </div>
        </div>
    </div>
);

export const GenericSkeleton = () => (
    <div className="w-full min-h-screen bg-[#09090b] flex flex-col items-center justify-center gap-6 select-none animate-fade-in">
        <svg className="w-14 h-8 animate-pulse opacity-80" viewBox="0 0 1024 572" fill="none" xmlns="http://www.w3.org/2000/svg">
            <g fill="#f4f4f5">
                <path d="M 42,9 L 10,47 L 0,70 L 0,81 L 80,299 L 112,322 L 182,356 L 303,390 L 447,425 L 455,430 L 454,435 L 448,437 L 160,416 L 213,519 L 231,541 L 248,549 L 367,571 L 488,488 L 490,478 L 478,353 L 223,231 L 189,218 L 210,221 L 490,296 L 315,122 L 196,20 L 175,10 L 152,5 L 82,4 Z" />
                <path d="M 981,4 L 957,0 L 878,0 L 849,5 L 825,17 L 766,66 L 674,151 L 533,297 L 838,218 L 796,234 L 547,353 L 543,365 L 534,486 L 657,568 L 785,542 L 799,529 L 821,495 L 863,411 L 571,436 L 568,430 L 575,425 L 841,352 L 912,317 L 945,293 L 1023,78 L 1023,65 L 1013,42 Z" />
            </g>
        </svg>
        <div className="w-36 h-0.5 bg-white/10 rounded-full overflow-hidden relative">
            <div className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-white/80 to-transparent rounded-full animate-shimmer" />
        </div>
        <span className="text-[9px] font-bold tracking-[0.28em] text-zinc-500 uppercase font-mono">INITIALISATION</span>
    </div>
);
export const ProfileSkeleton = () => (
    <div className="max-w-[1025px] mx-auto p-4 animate-fade-in relative z-10 w-full overflow-hidden">
        {/* Banner Skeleton */}
        <div className="relative bg-white rounded-[2rem] border border-gray-100 flex flex-col shadow-xl max-w-xl mx-auto mt-6 overflow-hidden">
            <ShimmerItem className="h-28 w-full bg-gray-100/50" />
            <div className="px-6 pb-6 pt-0 relative">
                {/* Floating Avatar Area */}
                <div className="flex justify-start -mt-12 mb-4 relative z-10 items-end gap-4">
                    <ShimmerItem className="w-24 h-24 rounded-full border-4 border-white bg-white" />
                    <ShimmerItem className="w-20 h-6 rounded-full mb-1" />
                </div>
                {/* Content Section Skeleton */}
                <div className="space-y-3 mb-6">
                    <ShimmerItem className="w-48 h-8 rounded-lg" />
                    <ShimmerItem className="w-full h-4 rounded-md" />
                </div>
                {/* Statistics Row Skeleton */}
                <div className="grid grid-cols-2 gap-3 mt-4">
                    <ShimmerItem className="h-20 rounded-2xl" />
                    <ShimmerItem className="h-20 rounded-2xl" />
                </div>
            </div>
        </div>
        
        {/* Post Grid Skeleton (Real blocks) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mt-8">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                <div key={i} className="aspect-[4/5] rounded-2xl overflow-hidden shadow-sm">
                    <ShimmerItem className="w-full h-full" />
                </div>
            ))}
        </div>
    </div>
);

export { ProductPortalSkeleton, ProductCardSkeleton, ProductGridSkeleton } from './ProductPortalSkeleton';
