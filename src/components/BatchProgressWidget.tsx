import React, { useState, useEffect } from 'react';
import { BatchSession, PriceTier } from '../types';
import { Target, TrendingUp, Clock, Users } from 'lucide-react';

export const BatchProgressWidget: React.FC<{ localQty?: number }> = ({ localQty = 0 }) => {
    const [data, setData] = useState<{
        session: BatchSession;
        currentQty: number;
        currentPrice: number;
        nextTier: { qtyNeeded: number; price: number } | null;
        timeLeftMs: number;
    } | null>(null);

    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        try {
            const response = await fetch('https://us-central1-signaid-d2d08.cloudfunctions.net/getCurrentBatchSession');
            if (response.ok) {
                const result = await response.json();
                setData(result);
            }
        } catch (error) {
            console.error('Error fetching batch data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 30000); // Poll every 30s
        return () => clearInterval(interval);
    }, []);

    // Show placeholder when no session is active
    if (loading) return null;

    if (!data) {
        return (
            <div className="w-full max-w-4xl mx-auto p-8 bg-zinc-50 rounded-[2rem] border-2 border-dashed border-zinc-200 relative">
                <div className="text-center py-12">
                    <div className="text-6xl mb-4">🎯</div>
                    <h3 className="text-2xl font-black text-zinc-800 mb-2">Commande Groupée</h3>
                    <p className="text-zinc-500 font-medium mb-6">
                        Aucune session active pour le moment.<br />
                        Revenez bientôt pour profiter des prix dégressifs !
                    </p>
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-100 rounded-full text-xs font-bold text-zinc-600">
                        <span className="h-2 w-2 rounded-full bg-zinc-400"></span>
                        Prochaine session à venir
                    </div>
                </div>
            </div>
        );
    }

    const { session, currentQty, currentPrice, nextTier, timeLeftMs } = data;
    const totalQty = currentQty + localQty;
    const maxQty = session.tiers[session.tiers.length - 1].minQty;
    const progress = Math.min((currentQty / maxQty) * 100, 100);
    const localProgress = Math.min((localQty / maxQty) * 100, 100 - progress);

    const formatTime = (ms: number) => {
        const totalSec = Math.floor(ms / 1000);
        const days = Math.floor(totalSec / 86400);
        const hours = Math.floor((totalSec % 86400) / 3600);
        const mins = Math.floor((totalSec % 3600) / 60);
        return `${days}j ${hours}h ${mins}m`;
    };

    return (
        <div className="w-full max-w-4xl mx-auto p-8 bg-zinc-900 rounded-[2rem] border border-white/10 shadow-2xl relative overflow-hidden group">
            {/* Background Decorative Gradient */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-brand-orange/10 blur-[100px] pointer-events-none group-hover:bg-brand-orange/20 transition-all duration-700"></div>

            <div className="relative z-10">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
                            <span className="text-xs font-black text-brand-orange uppercase tracking-[0.2em]">Session Groupée Active</span>
                        </div>
                        <h2 className="text-3xl md:text-4xl font-black text-white tracking-tighter uppercase">
                            Objectif Volume <span className="text-brand-orange">Deals</span>
                        </h2>
                    </div>

                    <div className="flex gap-4">
                        <div className="bg-white/5 border border-white/10 p-4 rounded-2xl flex items-center gap-3">
                            <Clock className="text-brand-orange w-5 h-5" />
                            <div>
                                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Clôture dans</p>
                                <p className="text-lg font-black text-white">{formatTime(timeLeftMs)}</p>
                            </div>
                        </div>
                        <div className="bg-white/5 border border-white/10 p-4 rounded-2xl flex items-center gap-3">
                            <Users className="text-brand-orange w-5 h-5" />
                            <div>
                                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Cumul Global</p>
                                <p className="text-lg font-black text-white">{currentQty} pcs</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Price Card */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                    <div className="p-8 bg-gradient-to-br from-white/10 to-transparent border border-white/20 rounded-3xl">
                        <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Votre prix actuel</p>
                        <div className="flex items-end gap-2">
                            <span className="text-5xl font-black text-white">{currentPrice.toFixed(2)}€</span>
                            <span className="text-sm text-brand-orange mb-2 font-black uppercase tracking-widest">TTC / unité</span>
                        </div>
                    </div>

                    {nextTier ? (
                        <div className="p-8 bg-brand-orange/10 border border-brand-orange/30 rounded-3xl flex flex-col justify-center">
                            <div className="flex items-center gap-3 text-brand-orange mb-2">
                                <TrendingUp size={20} />
                                <span className="text-xs font-black uppercase tracking-widest">PROCHAIN PALIER</span>
                            </div>
                            <p className="text-white font-bold text-lg">
                                Plus que <span className="text-brand-orange font-black underline decoration-2 underline-offset-4">{nextTier.qtyNeeded}</span> commandes pour passer à <span className="font-black text-2xl">{nextTier.price.toFixed(2)}€ <span className="text-xs">TTC</span></span>
                            </p>
                        </div>
                    ) : (
                        <div className="p-8 bg-green-500/10 border border-green-500/30 rounded-3xl flex flex-col justify-center">
                            <div className="flex items-center gap-3 text-green-500 mb-2">
                                <Target size={20} />
                                <span className="text-xs font-black uppercase tracking-widest">PALIER MAXIMUM ATTEINT</span>
                            </div>
                            <p className="text-white font-bold text-lg">
                                Félicitations ! Tous les imprimeurs profitent du prix le plus bas : <span className="font-black text-2xl">{currentPrice.toFixed(2)}€ <span className="text-xs">TTC</span></span>
                            </p>
                        </div>
                    )}
                </div>

                {/* Progress Bar Container */}
                <div className="relative pt-10 pb-4">
                    {/* Tiers Markers */}
                    {session.tiers.map((tier, idx) => {
                        const markerProgress = (tier.minQty / maxQty) * 100;
                        if (markerProgress > 100) return null;

                        return (
                            <div
                                key={idx}
                                className="absolute top-0 transition-opacity duration-500"
                                style={{ left: `${markerProgress}%` }}
                            >
                                <div className="h-4 w-[2px] bg-white/20 mx-auto"></div>
                                <div className={`text-[10px] font-black mt-1 -translate-x-1/2 whitespace-nowrap ${totalQty >= tier.minQty ? 'text-brand-orange' : 'text-zinc-600'}`}>
                                    {tier.minQty} PCS
                                </div>
                                <div className={`text-[9px] font-bold -translate-x-1/2 whitespace-nowrap ${totalQty >= tier.minQty ? 'text-white' : 'text-zinc-700'}`}>
                                    {tier.price.toFixed(2)}€
                                </div>
                            </div>
                        );
                    })}

                    {/* The Bar */}
                    <div className="h-8 w-full bg-white/5 rounded-full border border-white/10 p-[4px] overflow-hidden flex shadow-inner">
                        {/* Global Progress */}
                        <div
                            className="h-full bg-gradient-to-r from-brand-orange to-orange-400 rounded-l-full transition-all duration-1000 ease-out flex items-center justify-center shadow-[0_0_20px_rgba(249,115,22,0.4)]"
                            style={{ width: `${progress}%` }}
                        >
                            {progress > 15 && (
                                <span className="text-[10px] font-black text-black leading-none">GLOBAL</span>
                            )}
                        </div>
                        {/* Local Contribution */}
                        {localQty > 0 && (
                            <div
                                className="h-full bg-white/20 animate-pulse border-l border-white/30 flex items-center justify-center transition-all duration-1000 ease-out"
                                style={{ width: `${localProgress}%`, borderTopRightRadius: '9999px', borderBottomRightRadius: '9999px' }}
                            >
                                <span className="text-[10px] font-black text-white leading-none">VOUS (+{localQty})</span>
                            </div>
                        )}
                    </div>
                </div>

                <p className="text-center text-zinc-500 text-[10px] font-medium uppercase tracking-[0.2em] mt-8">
                    Calculé en temps réel selon les commandes cumulées de tous les utilisateurs SIGNAID
                </p>
            </div>
        </div>
    );
};
