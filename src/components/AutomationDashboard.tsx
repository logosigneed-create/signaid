import React, { useState } from 'react';
import { 
    CheckCircle2, 
    XCircle, 
    Clock, 
    ShoppingCart, 
    Package, 
    Printer, 
    RefreshCw,
    Search,
    Filter,
    ChevronRight,
    AlertTriangle,
    Eye
} from 'lucide-react';

interface OrderLine {
    id: string;
    date: string;
    client: string;
    garment: {
        supplier: string;
        name: string;
        sku: string;
        size: string;
        color: string;
        price: number;
        status: 'pending' | 'in_cart' | 'ordered' | 'error';
    };
    print: {
        supplier: string;
        name: string;
        fileUrl?: string;
        price: number;
        status: 'pending' | 'in_cart' | 'ordered' | 'error';
    };
    totalPrice: number;
    globalStatus: 'processing' | 'ready_for_review' | 'completed' | 'failed';
}

const mockOrders: OrderLine[] = [
    {
        id: "CMD-2026-8891",
        date: "14 Mai 2026 14:30",
        client: "Boutique Sport & Co",
        garment: {
            supplier: "L-Shop-Team",
            name: "T-shirt JHK170",
            sku: "JHK170",
            size: "M",
            color: "Noir",
            price: 2.19,
            status: 'in_cart'
        },
        print: {
            supplier: "Transfert-Impression",
            name: "DTF 1M - 55 x 100 cm",
            price: 15.00,
            fileUrl: "logo_sportco.pdf",
            status: 'in_cart'
        },
        totalPrice: 17.19,
        globalStatus: 'ready_for_review'
    },
    {
        id: "CMD-2026-8892",
        date: "14 Mai 2026 15:15",
        client: "Asso Étudiante",
        garment: {
            supplier: "L-Shop-Team",
            name: "Sweat à capuche",
            sku: "JH001",
            size: "L",
            color: "Gris Chiné",
            price: 11.50,
            status: 'ordered'
        },
        print: {
            supplier: "Transfert-Impression",
            name: "DTF A3",
            price: 4.50,
            fileUrl: "logo_bde.png",
            status: 'ordered'
        },
        totalPrice: 16.00,
        globalStatus: 'completed'
    },
    {
        id: "CMD-2026-8893",
        date: "14 Mai 2026 15:45",
        client: "Entreprise BTP",
        garment: {
            supplier: "L-Shop-Team",
            name: "Polo de travail",
            sku: "RTX10",
            size: "XL",
            color: "Bleu Marine",
            price: 8.90,
            status: 'error'
        },
        print: {
            supplier: "Transfert-Impression",
            name: "DTF Logo Cœur",
            price: 2.00,
            status: 'pending'
        },
        totalPrice: 10.90,
        globalStatus: 'failed'
    }
];

const StatusBadge = ({ status }: { status: string }) => {
    switch (status) {
        case 'in_cart':
            return <span className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium"><ShoppingCart size={12} /> Au Panier</span>;
        case 'ordered':
        case 'completed':
            return <span className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium"><CheckCircle2 size={12} /> Validé</span>;
        case 'error':
        case 'failed':
            return <span className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium"><XCircle size={12} /> Erreur</span>;
        case 'pending':
        case 'processing':
            return <span className="flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium"><Clock size={12} /> En cours</span>;
        case 'ready_for_review':
            return <span className="flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium"><AlertTriangle size={12} /> À vérifier</span>;
        default:
            return <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">{status}</span>;
    }
};

export default function AutomationDashboard() {
    const [orders, setOrders] = useState<OrderLine[]>(mockOrders);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const handleRefresh = () => {
        setIsRefreshing(true);
        setTimeout(() => setIsRefreshing(false), 1000);
    };

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 p-6 md:p-10 font-sans">
            <div className="max-w-7xl mx-auto space-y-6">
                
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <RefreshCw className="text-indigo-600" size={24} />
                            Automation Procurement
                        </h1>
                        <p className="text-gray-500 text-sm mt-1">Supervision des scripts d'achat automatisés (Vêtements + DTF)</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={handleRefresh}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl transition-all shadow-sm text-sm font-medium"
                        >
                            <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
                            Actualiser
                        </button>
                        <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all shadow-sm text-sm font-medium">
                            <Filter size={16} />
                            Filtrer
                        </button>
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center shrink-0">
                            <ShoppingCart size={24} />
                        </div>
                        <div>
                            <p className="text-gray-500 text-sm">Au Panier (À valider)</p>
                            <p className="text-2xl font-bold text-gray-900">12</p>
                        </div>
                    </div>
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                        <div className="w-12 h-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center shrink-0">
                            <CheckCircle2 size={24} />
                        </div>
                        <div>
                            <p className="text-gray-500 text-sm">Commandes du jour</p>
                            <p className="text-2xl font-bold text-gray-900">48</p>
                        </div>
                    </div>
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                        <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center shrink-0">
                            <AlertTriangle size={24} />
                        </div>
                        <div>
                            <p className="text-gray-500 text-sm">Erreurs scripts</p>
                            <p className="text-2xl font-bold text-gray-900">1</p>
                        </div>
                    </div>
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                        <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center shrink-0">
                            <RefreshCw size={24} />
                        </div>
                        <div>
                            <p className="text-gray-500 text-sm">Synchronisation</p>
                            <p className="text-sm font-bold text-green-600 flex items-center gap-1 mt-1"><CheckCircle2 size={14}/> Active</p>
                        </div>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input 
                        type="text" 
                        placeholder="Rechercher une commande, un client ou une référence..." 
                        className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                    />
                </div>

                {/* Orders Table */}
                <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                    <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">ID & Date</th>
                                    <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Client</th>
                                    <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Vêtement (L-Shop)</th>
                                    <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Impression (DTF)</th>
                                    <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Statut Global</th>
                                    <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {orders.map((order) => (
                                    <tr key={order.id} className="hover:bg-gray-50 transition-colors group">
                                        <td className="py-4 px-6">
                                            <div className="font-medium text-gray-900">{order.id}</div>
                                            <div className="text-xs text-gray-500 mt-1">{order.date}</div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="font-medium text-gray-900">{order.client}</div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="flex flex-col gap-2">
                                                <div className="flex items-start gap-2">
                                                    <Package size={16} className="text-gray-400 mt-0.5 shrink-0" />
                                                    <div>
                                                        <div className="text-sm font-medium text-gray-900">{order.garment.name}</div>
                                                        <div className="text-xs text-gray-500">{order.garment.color} • Taille {order.garment.size} • {order.garment.price.toFixed(2)}€</div>
                                                    </div>
                                                </div>
                                                <StatusBadge status={order.garment.status} />
                                            </div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="flex flex-col gap-2">
                                                <div className="flex items-start gap-2">
                                                    <Printer size={16} className="text-gray-400 mt-0.5 shrink-0" />
                                                    <div>
                                                        <div className="text-sm font-medium text-gray-900">{order.print.name}</div>
                                                        {order.print.fileUrl && (
                                                            <div className="text-xs text-indigo-600 hover:underline cursor-pointer flex items-center gap-1 mt-0.5">
                                                                <Eye size={12} /> {order.print.fileUrl}
                                                            </div>
                                                        )}
                                                        <div className="text-xs text-gray-500 mt-0.5">{order.print.price.toFixed(2)}€</div>
                                                    </div>
                                                </div>
                                                <StatusBadge status={order.print.status} />
                                            </div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="flex flex-col items-start gap-1">
                                                <StatusBadge status={order.globalStatus} />
                                                <div className="text-sm font-bold text-gray-900 mt-1">Total: {order.totalPrice.toFixed(2)}€</div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 text-right">
                                            <button className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                                                <ChevronRight size={20} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
