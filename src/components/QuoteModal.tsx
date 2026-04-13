import React, { useState } from 'react';

interface QuoteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: { name: string, email: string, phone: string, address: string, city: string, zip: string, message: string, createAccount?: boolean, password?: string }) => void;
    initialEmail?: string;
    initialName?: string;
    isGuest?: boolean;
    isLoading?: boolean;
    title?: string;
    subtitle?: string;
    submitLabel?: string;
}

export const QuoteModal: React.FC<QuoteModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
    initialEmail = '',
    initialName = '',
    isGuest = false,
    isLoading = false,
    title = "Demander un Devis",
    subtitle = "Recevez une offre personnalisée pour votre commande groupée.",
    submitLabel = "Envoyer la demande"
}) => {
    const [name, setName] = useState(initialName);
    const [email, setEmail] = useState(initialEmail);
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');
    const [city, setCity] = useState('');
    const [zip, setZip] = useState('');
    const [message, setMessage] = useState('');
    const [createAccount, setCreateAccount] = useState(false);
    const [password, setPassword] = useState('');

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({ name, email, phone, address, city, zip, message, createAccount, password });
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white w-full h-full sm:h-auto sm:max-w-md p-6 shadow-2xl relative sm:rounded-2xl sm:max-h-[90vh] overflow-y-auto">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-900 transition-colors"
                >
                    <i className="fa-solid fa-xmark text-xl"></i>
                </button>

                <h2 className="text-2xl font-bold text-gray-900 mb-2">{title}</h2>
                <p className="text-sm text-gray-500 mb-6">{subtitle}</p>

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

                    {isGuest && (
                        <div className="bg-orange-50 p-3 rounded-xl border border-orange-100">
                            <label className="flex items-center gap-2 cursor-pointer mb-2">
                                <input
                                    type="checkbox"
                                    checked={createAccount}
                                    onChange={e => setCreateAccount(e.target.checked)}
                                    className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                                    name="createAccountCheckbox"
                                />
                                <span className="font-bold text-sm text-gray-800">Créer un compte maintenant</span>
                            </label>
                            <p className="text-xs text-gray-500 ml-6 mb-2">Gagnez des points et suivez vos devis.</p>

                            {createAccount && (
                                <div className="ml-6 animate-fade-in">
                                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Mot de passe</label>
                                    <input
                                        type="password"
                                        required={createAccount}
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:border-orange-500 outline-none transition-colors"
                                        placeholder="••••••••"
                                        minLength={6}
                                        autoComplete="new-password"
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Message (Optionnel)</label>
                        <textarea
                            value={message}
                            onChange={e => setMessage(e.target.value)}
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-orange-500 outline-none transition-colors resize-none h-24"
                            placeholder="Détails supplémentaires, instructions de livraison..."
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className={`w-full py-4 mt-2 bg-gray-900 text-white font-bold rounded-xl shadow-lg hover:bg-gray-800 transform active:scale-95 transition-all flex items-center justify-center gap-2 ${isLoading ? 'opacity-80 cursor-wait' : ''}`}
                    >
                        <span>{createAccount ? (submitLabel === "Envoyer la demande" ? "Créer compte & Envoyer" : submitLabel) : submitLabel}</span>
                        {isLoading ? (
                            <i className="fa-solid fa-spinner animate-[spin_1s_linear_infinite] ml-2 transform origin-center"></i>
                        ) : (
                            <i className="fa-solid fa-check"></i>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};
