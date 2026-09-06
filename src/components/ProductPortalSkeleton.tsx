import React from 'react';

export const ProductCardSkeleton: React.FC<{ isLightMode?: boolean }> = ({ isLightMode = false }) => {
    return (
        <div
            className={`${
                isLightMode
                    ? 'bg-white border-gray-200 shadow-xl'
                    : 'bg-zinc-900/40 backdrop-blur-md border-zinc-800/80 shadow-2xl'
            } border-2 rounded-2xl overflow-hidden flex flex-col animate-pulse transition-all`}
        >
            {/* Top Visual Block (Exact Aspect Ratio & Padding) */}
            <div
                className={`relative aspect-square overflow-hidden ${
                    isLightMode ? 'bg-gray-50 border-gray-200' : 'bg-zinc-950 border-zinc-800/60'
                } border-b flex items-center justify-center p-4 md:p-6`}
            >
                <div className="aspect-square bg-slate-200 dark:bg-white/5 rounded-xl w-full h-full flex items-center justify-center" />
                
                {/* Badge Placeholders */}
                <div className="absolute top-4 left-4 h-6 w-28 bg-slate-200 dark:bg-white/5 rounded-lg" />
                <div className="absolute top-4 right-4 h-5 w-16 bg-slate-200 dark:bg-white/5 rounded-md" />
                
                {/* Bottom Toggle Button Placeholders */}
                <div className="absolute bottom-4 left-4 right-4 flex justify-between gap-2">
                    <div className="h-7 w-24 bg-slate-200 dark:bg-white/5 rounded-full" />
                    <div className="h-7 w-24 bg-slate-200 dark:bg-white/5 rounded-full" />
                </div>
            </div>

            {/* Bottom Content Area */}
            <div className={`p-6 flex-1 flex flex-col justify-between space-y-6 ${isLightMode ? 'bg-white' : ''}`}>
                <div className="space-y-4">
                    {/* Text Block: Title & Category */}
                    <div>
                        <div className="h-4 bg-slate-200 dark:bg-white/5 rounded w-3/4 mb-2" />
                        <div className="h-3 bg-slate-200 dark:bg-white/5 rounded w-1/2" />
                    </div>

                    {/* Variant Option Placeholder */}
                    <div className="space-y-2 pt-1">
                        <div className="h-3 w-32 bg-slate-200 dark:bg-white/5 rounded" />
                        <div className="h-10 w-full bg-slate-200 dark:bg-white/5 rounded-xl" />
                    </div>
                </div>

                {/* Size / Sizing Inputs Area */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center border-b border-slate-200 dark:border-zinc-800/80 pb-2">
                        <div className="h-3 w-28 bg-slate-200 dark:bg-white/5 rounded" />
                        <div className="h-3 w-24 bg-slate-200 dark:bg-white/5 rounded" />
                    </div>

                    {/* Price Block */}
                    <div className="h-5 bg-slate-200 dark:bg-white/5 rounded w-1/4 mb-4" />

                    {/* Button Block */}
                    <div className="h-10 bg-slate-200 dark:bg-white/5 rounded-lg w-full" />
                </div>
            </div>
        </div>
    );
};

export const ProductGridSkeleton: React.FC<{ count?: number; isLightMode?: boolean }> = ({ count = 4, isLightMode = false }) => {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full">
            {Array.from({ length: count }).map((_, idx) => (
                <ProductCardSkeleton key={`product-skeleton-card-${idx}`} isLightMode={isLightMode} />
            ))}
        </div>
    );
};

export const ProductPortalSkeleton: React.FC<{ isLightMode?: boolean }> = ({ isLightMode = false }) => {
    return (
        <div
            className={`min-h-screen ${
                isLightMode ? 'bg-gray-50 text-gray-900' : 'bg-zinc-950 text-zinc-100'
            } font-sans pb-20 select-none overflow-hidden transition-colors duration-500`}
        >
            {/* Header Skeleton */}
            <header
                className={`${
                    isLightMode ? 'bg-white border-gray-200' : 'bg-zinc-900 border-zinc-800'
                } border-b-4 shadow-xl sticky top-0 z-50 transition-colors duration-500`}
            >
                <div className="max-w-[1600px] w-full mx-auto px-4 md:px-8 py-4 flex flex-col md:flex-row justify-between items-center gap-4 animate-pulse">
                    {/* Brand Info */}
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-slate-200 dark:bg-white/5 rounded-xl shrink-0" />
                        <div className="space-y-2">
                            <div className="h-6 w-44 bg-slate-200 dark:bg-white/5 rounded" />
                            <div className="h-3 w-32 bg-slate-200 dark:bg-white/5 rounded" />
                        </div>
                    </div>

                    {/* Right Controls */}
                    <div className="flex items-center gap-4">
                        <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-white/5" />
                        <div className="w-36 h-10 rounded-lg bg-slate-200 dark:bg-white/5" />
                    </div>
                </div>
            </header>

            {/* Main Content Skeleton */}
            <main className="max-w-[1600px] w-full mx-auto px-4 md:px-8 pt-12 space-y-12">
                {/* Intro Section Skeleton */}
                <div className="space-y-3 animate-pulse">
                    <div className="h-10 w-72 md:w-96 bg-slate-200 dark:bg-white/5 rounded-lg" />
                    <div className="h-4 w-60 md:w-80 bg-slate-200 dark:bg-white/5 rounded" />
                </div>

                {/* Category Tabs Skeleton */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 animate-pulse">
                    <div className="h-12 w-full sm:w-44 bg-slate-200 dark:bg-white/5 rounded-2xl" />
                    <div className="h-12 w-full sm:w-48 bg-slate-200 dark:bg-white/5 rounded-2xl" />
                </div>

                {/* Context Banner Skeleton */}
                <div
                    className={`p-5 rounded-2xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-pulse ${
                        isLightMode ? 'bg-white border-gray-200 shadow-sm' : 'bg-zinc-900/60 border-zinc-800'
                    }`}
                >
                    <div className="flex items-center gap-3.5 w-full">
                        <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-white/5 shrink-0" />
                        <div className="space-y-2 flex-1">
                            <div className="h-4 w-56 bg-slate-200 dark:bg-white/5 rounded" />
                            <div className="h-3 w-3/4 bg-slate-200 dark:bg-white/5 rounded" />
                        </div>
                    </div>
                    <div className="h-7 w-48 bg-slate-200 dark:bg-white/5 rounded-full shrink-0" />
                </div>

                {/* Grid of 4 Ghost Product Cards */}
                <ProductGridSkeleton count={4} isLightMode={isLightMode} />

                {/* Summary / Final Action Skeleton */}
                <div
                    className={`${
                        isLightMode ? 'bg-white shadow-xl' : 'bg-zinc-900 shadow-2xl'
                    } rounded-3xl p-8 border-l-[12px] border-slate-300 dark:border-zinc-800 animate-pulse`}
                >
                    <div className="flex flex-col md:flex-row justify-between items-center gap-8">
                        <div className="space-y-4 w-full max-w-xl">
                            <div className="h-4 w-40 bg-slate-200 dark:bg-white/5 rounded" />
                            <div className="h-8 w-72 bg-slate-200 dark:bg-white/5 rounded-lg" />
                            <div className="h-3 w-96 bg-slate-200 dark:bg-white/5 rounded" />
                        </div>
                        <div className="h-16 w-full md:w-72 bg-slate-200 dark:bg-white/5 rounded-2xl shrink-0" />
                    </div>
                </div>
            </main>
        </div>
    );
};

export default ProductPortalSkeleton;
