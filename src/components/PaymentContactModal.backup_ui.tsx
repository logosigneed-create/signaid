import React, { useState } from 'react';

interface PaymentContactModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: { name: string, email: string, phone: string, address: string, city: string, zip: string, message: string }) => void;
    initialEmail?: string;
    initialName?: string;
    isLoading?: boolean;
}

export const PaymentContactModal: React.FC<PaymentContactModalProps> = ({ isOpen, onClose, onSubmit, initialEmail = '', initialName = '', isLoading = false }) => {
    const [name, setName] = useState(initialName);
    const [email, setEmail] = useState(initialEmail);
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');
    const [city, setCity] = useState('');
    const [zip, setZip] = useState('');
    const [message, setMessage] = useState('');

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({ name, email, phone, address, city, zip, message });
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-900 transition-colors"
                >
                    <i className="fa-solid fa-xmark text-xl"></i>
                </button>

                <h2 className="text-2xl font-bold text-gray-900 mb-2">Vos Coordonnées</h2>
                <p className="text-sm text-gray-500 mb-6">Veuillez renseigner vos informations de livraison pour finaliser la commande.</p>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div>
                        <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Nom complet</label>
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-orange-500 outline-none transition-colors"
                            placeholder="Votre nom"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Email</label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-orange-500 outline-none transition-colors"
                                placeholder="votre@email.com"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Téléphone</label>
                            <input
                                type="tel"
                                required
                                value={phone}
                                onChange={e => setPhone(e.target.value)}
                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-orange-500 outline-none transition-colors"
                                placeholder="06 12 34 56 78"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Adresse Postale</label>
                        <input
                            type="text"
                            required
                            value={address}
                            onChange={e => setAddress(e.target.value)}
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-orange-500 outline-none transition-colors"
                            placeholder="Rue, Numéro, Boîte..."
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Code Postal</label>
                            <input
                                type="text"
                                required
                                value={zip}
                                onChange={e => setZip(e.target.value)}
                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-orange-500 outline-none transition-colors"
                                placeholder="1000"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Ville</label>
                            <input
                                type="text"
                                required
                                value={city}
                                onChange={e => setCity(e.target.value)}
                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-orange-500 outline-none transition-colors"
                                placeholder="Bruxelles"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Note pour la livraison (Optionnel)</label>
                        <textarea
                            value={message}
                            onChange={e => setMessage(e.target.value)}
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-orange-500 outline-none transition-colors resize-none h-24"
                            placeholder="Code d'accès, étage..."
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className={`w-full py-4 mt-2 bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold rounded-xl shadow-lg hover:shadow-orange-500/20 transform active:scale-95 transition-all flex items-center justify-center gap-2 ${isLoading ? 'opacity-80 cursor-wait' : ''}`}
                    >
                        <span>Procéder au Paiement</span>
                        {isLoading ? (
                            <i className="fa-solid fa-spinner animate-spin ml-2"></i>
                        ) : (
                            <i className="fa-solid fa-credit-card"></i>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};
