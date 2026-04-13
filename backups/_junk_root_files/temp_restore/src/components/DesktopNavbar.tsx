import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '../types';
import { authService } from '../services/authService';

interface DesktopNavbarProps {
    activeView: string;
    onChangeView: (view: any) => void;
    cartCount: number;
    user: User | null;
    onLogout: () => void;
    onLoginClick?: () => void;
    onLoginSuccess: (user: User) => void;
}

export const DesktopNavbar: React.FC<DesktopNavbarProps> = ({ activeView, onChangeView, cartCount, user, onLogout, onLoginClick, onLoginSuccess }) => {
    const navigate = useNavigate();
    const [isRegistering, setIsRegistering] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [isAuthOpen, setIsAuthOpen] = useState(false); // Popover for auth

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            let u;
            if (isRegistering) {
                if (!username) throw new Error("Nom d'utilisateur requis");
                const refCode = sessionStorage.getItem('referralCode') || undefined;
                u = await authService.register(email, password, username, refCode);
            } else {
                u = await authService.login(email, password);
            }
            onLoginSuccess(u);
            setEmail('');
            setPassword('');
            setUsername('');
            setIsAuthOpen(false);
        } catch (err: any) {
            console.error(err);
            if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
                setError("Identifiants incorrects");
            } else if (err.code === 'auth/email-already-in-use') {
                setError("Email déjà pris");
            } else if (err.code === 'auth/weak-password') {
                setError("Mot de passe trop court");
            } else {
                setError(err.message || "Erreur");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="hidden md:flex w-full bg-white border-b border-gray-200 sticky top-0 z-[100] px-8 py-3 items-center justify-between shadow-sm flex-shrink-0 h-20">
            {/* LOGO */}
            <div className="cursor-pointer flex items-center gap-2" onClick={() => navigate('/')}>
                <span className="font-black text-2xl tracking-tighter text-gray-900">Sign<span className="text-orange-600">Aid</span></span>
            </div>

            {/* NAVIGATION TABS */}
            <nav className="flex items-center gap-8">
                <button
                    onClick={() => onChangeView('customizer')}
                    className={`flex items-center gap-2 px-3 py-2 rounded-full font-bold transition-all ${activeView === 'customizer' ? 'bg-orange-50 text-orange-600' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
                >
                    <i className="fa-solid fa-shirt"></i>
                    Créer
                </button>
                <button
                    onClick={() => onChangeView('profile')}
                    className={`flex items-center gap-2 px-3 py-2 rounded-full font-bold transition-all ${activeView === 'profile' ? 'bg-orange-50 text-orange-600' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
                >
                    <i className="fa-solid fa-user"></i>
                    Profil
                </button>
                <button
                    onClick={() => onChangeView('feed')}
                    className={`flex items-center gap-2 px-3 py-2 rounded-full font-bold transition-all ${activeView === 'feed' ? 'bg-orange-50 text-orange-600' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
                >
                    <i className="fa-solid fa-house"></i>
                    Galerie
                </button>
                <button
                    onClick={() => onChangeView('rewards')}
                    className={`flex items-center gap-2 px-3 py-2 rounded-full font-bold transition-all ${activeView === 'rewards' ? 'bg-orange-50 text-orange-600' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
                >
                    <i className="fa-solid fa-gift"></i>
                    Récompenses
                </button>
                <button
                    onClick={() => onChangeView('contact')}
                    className={`flex items-center gap-2 px-3 py-2 rounded-full font-bold transition-all ${activeView === 'contact' ? 'bg-orange-50 text-orange-600' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
                >
                    <i className="fa-solid fa-envelope"></i>
                    Contact
                </button>
            </nav>

            {/* RIGHT: CART & USER */}
            <div className="flex items-center gap-6">
                <button
                    onClick={() => onChangeView('cart')}
                    className={`relative p-2 rounded-full hover:bg-gray-100 transition-colors ${activeView === 'cart' ? 'text-orange-600' : 'text-gray-600'}`}
                >
                    <i className="fa-solid fa-bag-shopping text-xl"></i>
                    {cartCount > 0 && (
                        <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold border border-white">
                            {cartCount}
                        </span>
                    )}
                </button>

                {user ? (
                    <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
                        <div className="flex items-center gap-2 cursor-pointer hover:opacity-80" onClick={() => onChangeView('profile')}>
                            <img src={user.avatarUrl} alt="avatar" className="w-8 h-8 rounded-full bg-gray-100 object-cover border border-gray-200" />
                            <span className="font-bold text-sm text-gray-700 max-w-[100px] truncate">@{user.username}</span>
                        </div>
                        <button onClick={onLogout} className="text-gray-400 hover:text-red-500 text-sm" title="Déconnexion">
                            <i className="fa-solid fa-power-off"></i>
                        </button>
                    </div>
                ) : (
                    <div className="relative">
                        <button
                            onClick={() => setIsAuthOpen(!isAuthOpen)}
                            className="bg-gray-900 text-white px-5 py-2 rounded-full font-bold text-sm hover:bg-black transition-colors shadow-lg"
                        >
                            Connexion
                        </button>

                        {/* MINI AUTH POPUP */}
                        {isAuthOpen && (
                            <div className="absolute top-full right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-200 p-4 z-[60] animate-fade-in">
                                <form onSubmit={handleAuth} className="space-y-3">
                                    {error && <p className="text-xs text-red-500 font-bold text-center">{error}</p>}
                                    {isRegistering && (
                                        <input
                                            type="text"
                                            placeholder="Pseudo"
                                            value={username}
                                            onChange={e => setUsername(e.target.value)}
                                            className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2 px-3 text-sm outline-none focus:border-orange-500"
                                        />
                                    )}
                                    <input
                                        type="email"
                                        placeholder="Email"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2 px-3 text-sm outline-none focus:border-orange-500"
                                    />
                                    <input
                                        type="password"
                                        placeholder="Mot de passe"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2 px-3 text-sm outline-none focus:border-orange-500"
                                    />
                                    <button type="submit" disabled={loading} className="w-full py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-lg text-sm transition-colors">
                                        {loading ? '...' : (isRegistering ? "S'inscrire" : "Connexion")}
                                    </button>
                                    <p className="text-center text-xs text-gray-400 cursor-pointer hover:text-orange-500" onClick={() => setIsRegistering(!isRegistering)}>
                                        {isRegistering ? "Déjà un compte ?" : "Créer un compte"}
                                    </p>
                                </form>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
