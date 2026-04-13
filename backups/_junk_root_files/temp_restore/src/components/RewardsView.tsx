import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

interface Reward {
    id: number;
    title: string;
    cost: number;
    sales: number;
    icon: string;
    desc: string;
}

const REWARDS_DATA: Reward[] = [
    { id: 1, title: "Livraison Gratuite", cost: 10, sales: 1, icon: "fa-truck-fast", desc: "Pour ta prochaine commande" },
    { id: 2, title: "Vidéo Contenu", cost: 15, sales: 3, icon: "fa-video", desc: "Clip promo RS (15 sec)" },
    { id: 3, title: "Bon d'achat 20€", cost: 20, sales: 4, icon: "fa-ticket", desc: "Valable sur tout le site" },
    { id: 4, title: "Casquette Brandée", cost: 25, sales: 5, icon: "fa-hat-cowboy", desc: "Logo brodé haute qualité" },
    { id: 5, title: "T-Shirt Premium", cost: 40, sales: 8, icon: "fa-shirt", desc: "Coton bio, coupe ajustée" },
    { id: 6, title: "Sweat / Hoodie", cost: 75, sales: 15, icon: "fa-user-astronaut", desc: "Molleton épais, confort" },
    { id: 7, title: "Consulting Pub", cost: 125, sales: 25, icon: "fa-bullhorn", desc: "1h d'audit avec un expert" },
    { id: 8, title: "Refonte Logo", cost: 300, sales: 60, icon: "fa-pen-nib", desc: "Création pro vectorielle" },
    { id: 9, title: "Site Vitrine", cost: 600, sales: 120, icon: "fa-laptop-code", desc: "Page web professionnelle" }
];

interface RewardsViewProps {
    userBalance: number;
    onRedeem: (selectedIds: number[], totalCost: number) => Promise<void>;
    onBack: () => void;
    onApplyPromoCode: (code: string) => Promise<boolean>;
}

export const RewardsView: React.FC<RewardsViewProps> = ({ userBalance, onRedeem, onBack, onApplyPromoCode }) => {
    const [selectedItems, setSelectedItems] = useState<number[]>([]);
    const [filter, setFilter] = useState<'all' | 'start' | 'brand' | 'expert'>('all');
    const [promoCode, setPromoCode] = useState('');
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const navigate = useNavigate();

    const toggleItem = (id: number) => {
        const item = REWARDS_DATA.find(i => i.id === id);
        if (!item) return;

        if (selectedItems.includes(id)) {
            setSelectedItems(prev => prev.filter(i => i !== id));
        } else {
            const currentTotal = selectedItems.reduce((sum, iId) => sum + (REWARDS_DATA.find(r => r.id === iId)?.cost || 0), 0);
            if (currentTotal + item.cost <= userBalance) {
                setSelectedItems(prev => [...prev, id]);
            }
        }
    };

    const handleApplyCode = async () => {
        if (!promoCode.trim()) return;
        const success = await onApplyPromoCode(promoCode);
        if (success) setPromoCode('');
    };

    const totalCost = selectedItems.reduce((sum, id) => sum + (REWARDS_DATA.find(r => r.id === id)?.cost || 0), 0);
    const remainingBalance = userBalance - totalCost;

    const filteredRewards = useMemo(() => {
        return REWARDS_DATA.filter(item => {
            if (filter === 'all') return true;
            if (filter === 'start') return item.cost <= 20;
            if (filter === 'brand') return item.cost > 20 && item.cost <= 75;
            if (filter === 'expert') return item.cost > 75;
            return true;
        });
    }, [filter]);

    return (
        <div className="bg-white min-h-screen pb-40 animate-fade-in">
            {/* Header - Hidden on Mobile (Global Header used) */}
            <header className="hidden md:block sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {/* LEFT: SOLDE CREDIT */}
                        <div className="flex items-center bg-gray-100 rounded-full px-4 py-1.5 border border-gray-200">
                            <span className="text-sm text-gray-500 mr-2 hidden sm:inline">Solde :</span>
                            <span className="font-bold text-gray-800 text-lg">{userBalance}</span>
                            <i className="fa-solid fa-coins text-orange-500 ml-2"></i>
                        </div>
                    </div>

                    {/* CENTER TITLE (Optional, maybe hide on small screens if space needed) */}
                    <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
                        <i className="fa-solid fa-gift text-orange-500 text-2xl"></i>
                        <h1 className="text-xl font-bold text-gray-800 hidden sm:block">Rewards<span className="text-orange-500">Club</span></h1>
                    </div>

                    <div className="flex items-center gap-4">
                    </div>
                </div>
            </header>



            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-32">

                <div className="text-center mb-10">
                    {/* MOBILE BALANCE DISPLAY */}
                    <div className="md:hidden flex flex-col items-center mb-4 animate-fade-in">
                        <div className="flex items-center gap-2 bg-orange-50 px-4 py-2 rounded-full border border-orange-100 shadow-sm mb-2">
                            <span className="text-sm text-gray-600 font-bold">Votre Solde :</span>
                            <span className="font-black text-2xl text-orange-600">{userBalance}</span>
                            <i className="fa-solid fa-coins text-orange-500"></i>
                        </div>
                    </div>

                    <h2 className="text-3xl font-bold text-gray-900 mb-2">Félicitations pour tes ventes !</h2>
                    <p className="text-gray-500 max-w-2xl mx-auto mb-6">Chaque vente te rapporte <span className="text-orange-500 font-bold">5 crédits</span>. Coche les récompenses que tu souhaites débloquer aujourd'hui.</p>

                    {/* Promo Code Input */}
                    <div className="flex justify-center items-center gap-2 max-w-sm mx-auto">
                        <input
                            type="text"
                            placeholder="Code promo"
                            value={promoCode}
                            onChange={(e) => setPromoCode(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 outline-none focus:border-orange-500 text-center uppercase tracking-wide font-bold"
                        />
                        <button
                            onClick={handleApplyCode}
                            className="bg-gray-900 text-white px-4 py-2 rounded-lg font-bold hover:bg-black whitespace-nowrap"
                        >
                            Appliquer
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex justify-center gap-4 mb-8 text-sm overflow-x-auto pb-2 no-scrollbar">
                    <button onClick={() => setFilter('all')} className={`px-4 py-2 rounded-full font-medium shadow transition-colors ${filter === 'all' ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-orange-500 hover:text-orange-500'}`}>Tout voir</button>
                    <button onClick={() => setFilter('start')} className={`px-4 py-2 rounded-full font-medium shadow transition-colors ${filter === 'start' ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-orange-500 hover:text-orange-500'}`}>Démarrage (5-20)</button>
                    <button onClick={() => setFilter('brand')} className={`px-4 py-2 rounded-full font-medium shadow transition-colors ${filter === 'brand' ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-orange-500 hover:text-orange-500'}`}>Branding (25-75)</button>
                    <button onClick={() => setFilter('expert')} className={`px-4 py-2 rounded-full font-medium shadow transition-colors ${filter === 'expert' ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-orange-500 hover:text-orange-500'}`}>Expert (125+)</button>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredRewards.map(item => {
                        const isSelected = selectedItems.includes(item.id);
                        const isDisabled = !isSelected && (item.cost > remainingBalance);

                        return (
                            <div
                                key={item.id}
                                onClick={() => !isDisabled && toggleItem(item.id)}
                                className={`relative bg-white border-2 rounded-xl p-4 cursor-pointer group select-none transition-all duration-200
                                    ${isSelected
                                        ? 'border-orange-500 bg-orange-50 shadow-[0_10px_15px_-3px_rgba(249,115,22,0.1)] -translate-y-1'
                                        : 'border-gray-100 hover:border-orange-200'}
                                    ${isDisabled ? 'opacity-50 cursor-not-allowed grayscale' : ''}
                                `}
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="w-12 h-12 rounded-lg bg-orange-50 flex items-center justify-center text-orange-500 text-xl">
                                        <i className={`fa-solid ${item.icon}`}></i>
                                    </div>
                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-orange-500 border-orange-500 text-white' : 'border-gray-300 text-transparent'}`}>
                                        <i className="fa-solid fa-check text-xs"></i>
                                    </div>
                                </div>

                                <h3 className="font-bold text-gray-800 text-lg leading-tight mb-1">{item.title}</h3>
                                <p className="text-xs text-gray-400 mb-4">{item.desc}</p>

                                <div className="flex items-end justify-between mt-auto pt-4 border-t border-gray-50">
                                    <div>
                                        <span className={`block text-2xl font-bold ${isSelected ? 'text-orange-500' : 'text-gray-900'}`}>{item.cost}</span>
                                        <span className="text-xs text-gray-400 font-medium">Crédits</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="inline-block bg-gray-100 text-gray-500 text-xs px-2 py-1 rounded">
                                            {item.sales} Ventes
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </main>

            {/* Bottom Bar */}
            <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] p-4 z-40">
                <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">

                    <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto text-center sm:text-left">
                        <div>
                            <span className="block text-xs text-gray-500 uppercase tracking-wide">Total sélectionné</span>
                            <span className="text-2xl font-bold text-orange-500">{totalCost}</span>
                            <span className="text-sm text-gray-400">crédits</span>
                        </div>
                        <div className="hidden sm:block w-px h-10 bg-gray-200 mx-2"></div>
                        <div>
                            <span className="block text-xs text-gray-500 uppercase tracking-wide">Reste après échange</span>
                            <span className="text-2xl font-bold text-gray-800">{remainingBalance}</span>
                            <span className="text-sm text-gray-400">crédits</span>
                        </div>
                    </div>

                    <button
                        onClick={() => onRedeem(selectedItems, totalCost)}
                        disabled={selectedItems.length === 0}
                        className={`w-full sm:w-auto font-bold py-3 px-8 rounded-lg shadow-lg transition transform active:scale-95 flex items-center justify-center gap-2
                            ${selectedItems.length > 0
                                ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-orange-500/30'
                                : 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                            }`}
                    >
                        {selectedItems.length > 0
                            ? `Confirmer (${selectedItems.length} article${selectedItems.length > 1 ? 's' : ''})`
                            : "Confirmer l'échange"}
                        <i className="fa-solid fa-arrow-right"></i>
                    </button>
                </div>
            </div>
        </div >
    );
};
