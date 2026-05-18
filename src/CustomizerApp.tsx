import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';

import { createPortal } from 'react-dom';

import { useLocation, useNavigate, useParams, Link } from 'react-router-dom';

import Cropper from 'react-easy-crop';

import { QuoteModal } from './components/QuoteModal';

import { authService } from './services/authService';

import { db } from './firebaseConfig';

import { collection, addDoc, serverTimestamp, getDocs, query, where, orderBy, limit, deleteDoc, doc, updateDoc, increment, getDoc, setDoc } from 'firebase/firestore';

import { getStorage, ref, uploadString, getDownloadURL } from 'firebase/storage';



import { geminiService } from './services/geminiService';

import { postService } from './services/postService';

import { productDatabase, users, mockPosts, mockPurchaseHistory, SPECIAL_CODES, PREDEFINED_LOGOS, PLACEMENT_PRESETS, STYLE_MATRIX, POSE_IMAGES, StyleCategory } from './constants';

import { Post, CartItem, User, CustomizationState, ChatMessage, PredefinedLogo, Product, PricingRules } from './types';

import { useProducts } from './context/ProductContext';

import { DraggableElement } from './components/DraggableElement';

import { ContactView } from './components/ContactView';

import { RewardsView } from './components/RewardsView';

import { UniversalMenu } from './components/UniversalMenu';

import { GuestLimitModal } from './components/GuestLimitModal';



// import html2canvas from 'html2canvas'; (removed in favor of dynamic import in child components)

import { DesktopNavbar } from './components/DesktopNavbar';

import { MobileNavbar } from './components/MobileNavbar';
// MobileBottomNav import removed

import { ShareButtons } from './components/ShareButtons';

import { CartItemRow } from './components/CartItemRow';

import { FeedView } from './components/FeedView';

import { BatchProgressWidget } from './components/BatchProgressWidget';

import { TextRenderer } from './components/TextRenderer';



// @ts-ignore

// html2canvas import removed (dynamic import used instead)



// Add type definition for window.aistudio

declare global {

    interface AIStudio {

        hasSelectedApiKey: () => Promise<boolean>;

        openSelectKey: () => Promise<void>;

    }

}



import { CustomizerView } from './components/CustomizerView';

import { getProxiedUrl, resizeImage, hexToRgb, tintImage, removeBackground, getCroppedImg, urlToBase64, addWatermark, cleanCartItem, compressCartForStorage, isSameModel, calculateBaseUnitPrice, calculateMarkingFee, dataURLtoBlob } from './utils/helpers';

import { cartPersistence } from './services/cartPersistence';

import { PongGame } from './components/PongGame';

import { LoadingScreen } from './components/LoadingScreen';

import { designSharingService } from './services/designSharingService';









const AuthModalContent: React.FC<{ onLogin: (user: User) => void, onBack: () => void, isModal: boolean }> = ({ onLogin, onBack, isModal }) => {

    const [isRegistering, setIsRegistering] = useState(false);

    const [email, setEmail] = useState('');

    const [username, setUsername] = useState('');

    const [password, setPassword] = useState('');

    const [error, setError] = useState('');



    const handleSubmit = async (e: React.FormEvent) => {

        e.preventDefault();

        setError('');



        if (!password || !email || (isRegistering && !username)) {

            setError("Veuillez remplir tous les champs");

            return;

        }



        try {

            let user;

            if (isRegistering) {

                const refCode = sessionStorage.getItem('referralCode') || undefined;

                user = await authService.register(email, password, username, refCode);

            } else {

                user = await authService.login(email, password);

            }

            onLogin(user);

        } catch (err: any) {

            console.error(err);

            if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {

                setError("Email ou mot de passe incorrect.");

            } else if (err.code === 'auth/email-already-in-use') {

                setError("Cet email est déjà utilisé.");

            } else if (err.code === 'auth/weak-password') {

                setError("Le mot de passe doit faire au moins 6 caractères.");

            } else {

                setError("Une erreur est survenue. Réessayez.");

            }

        }

    };



    const handleSocialLogin = async (provider: 'google' | 'facebook') => {

        try {

            setError('');

            let user;

            if (provider === 'google') {

                user = await authService.loginWithGoogle();

            } else {

                user = await authService.loginWithFacebook();

            }

            onLogin(user);

        } catch (err: any) {

            console.error(err);

            if (err.code === 'auth/account-exists-with-different-credential') {

                setError("Un compte existe déjà avec cet email via une autre méthode de connexion.");

            } else {

                setError("Erreur de connexion sociale. Réessayez.");

            }

        }

    };



    return (

        <div className={`flex flex-col items-center justify-center p-4 animate-fade-in bg-white text-gray-800 overflow-hidden w-full ${isModal ? '' : 'min-h-[80vh]'}`}>

            <div className={`w-full max-w-md bg-white border-gray-200 rounded-2xl p-8 relative overflow-hidden ${isModal ? '' : 'shadow-xl border'}`}>

                <button onClick={onBack} className="absolute top-4 right-4 text-gray-400 hover:text-orange-500">

                    <i className="fa-solid fa-xmark text-xl"></i>

                </button>



                <div className="text-center mb-8">

                    <img src="/logo.png" alt="signeedclub" className="h-16 mx-auto mb-4" />

                    <p className="text-gray-500">

                        {isRegistering ? "Rejoignez la communauté" : "Connectez-vous pour sauvegarder"}

                    </p>

                </div>



                {/* PROMO BANNER - TEMPORARILY DISABLED */}

                {false && (

                    <div className="bg-red-50 text-red-500 p-3 rounded-lg text-sm mb-4 text-center font-bold border border-red-100">

                        {error}

                    </div>

                )}



                {error && (

                    <div className="bg-red-50 text-red-500 p-3 rounded-lg text-sm mb-4 text-center font-bold border border-red-100">

                        {error}

                    </div>

                )}



                <div className="grid grid-cols-2 gap-3 mb-6">

                    <button onClick={() => handleSocialLogin('google')} className="flex items-center justify-center gap-2 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 font-bold text-gray-700 transition-colors">

                        <i className="fa-brands fa-google text-red-500"></i> Google

                    </button>

                    <button onClick={() => handleSocialLogin('facebook')} className="flex items-center justify-center gap-2 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 font-bold text-gray-700 transition-colors">

                        <i className="fa-brands fa-facebook text-blue-600"></i> Facebook

                    </button>

                </div>



                <div className="relative mb-6">

                    <div className="absolute inset-0 flex items-center">

                        <div className="w-full border-t border-gray-200"></div>

                    </div>

                    <div className="relative flex justify-center text-sm">

                        <span className="px-2 bg-white text-gray-500">Ou avec email</span>

                    </div>

                </div>



                <form onSubmit={handleSubmit} className="space-y-4">

                    {isRegistering && (

                        <div>

                            <label className="block text-xs text-gray-500 mb-1 uppercase font-bold">Nom d'utilisateur</label>

                            <div className="relative">

                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">@</span>

                                <input

                                    type="text"

                                    value={username}

                                    onChange={(e) => setUsername(e.target.value)}

                                    className="w-full bg-gray-50 border border-gray-300 rounded-xl py-3 pl-8 pr-4 text-gray-900 focus:ring-2 focus:ring-orange-500 outline-none transition-all"

                                    placeholder="votre_pseudo"

                                />

                            </div>

                        </div>

                    )}



                    <div>

                        <label className="block text-xs text-gray-500 mb-1 uppercase font-bold">Email</label>

                        <input

                            type="email"

                            value={email}

                            onChange={(e) => setEmail(e.target.value)}

                            className="w-full bg-gray-50 border border-gray-300 rounded-xl py-3 px-4 text-gray-900 focus:ring-2 focus:ring-orange-500 outline-none transition-all"

                            placeholder="exemple@email.com"

                            autoComplete="username"

                        />

                    </div>



                    <div>

                        <label className="block text-xs text-gray-500 mb-1 uppercase font-bold">Mot de passe</label>

                        <input

                            type="password"

                            value={password}

                            onChange={(e) => setPassword(e.target.value)}

                            className="w-full bg-gray-50 border border-gray-300 rounded-xl py-3 px-4 text-gray-900 focus:ring-2 focus:ring-orange-500 outline-none transition-all"

                            placeholder="********"

                            autoComplete={isRegistering ? "new-password" : "current-password"}

                        />

                    </div>



                    <button

                        type="submit"

                        className="w-full py-4 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl shadow-lg shadow-orange-500/20 transition-transform hover:-translate-y-1 mt-6"

                    >

                        {isRegistering ? "S'inscrire" : "Se connecter"}

                    </button>

                </form>



                <div className="mt-6 pt-6 border-t border-gray-100 text-center">

                    <p className="text-sm text-gray-500">

                        {isRegistering ? "Déjà un compte ?" : "Pas encore de compte ?"}

                        <button

                            onClick={() => { setIsRegistering(!isRegistering); setError(''); }}

                            className="ml-2 text-orange-600 hover:text-orange-500 font-bold hover:underline"

                        >

                            {isRegistering ? "Se connecter" : "S'inscrire"}

                        </button>

                    </p>

                </div>

            </div>

        </div>

    );

};



// --- AUTH VIEW ---



const AuthView: React.FC<{ onLogin: (user: User) => void, onBack: () => void }> = ({ onLogin, onBack }) => {

    // ... existing AuthView implementation ...

    // ... keeping it for fallback or direct links ...

    // Note: To save tokens, I am not repeating the whole AuthView here, assuming I can wrap it or just use a new one.

    // Actually, I will reimplement AuthModal to be standalone to avoid breaking AuthView if it's used elsewhere for now.

    // Or better, I'll refactor AuthView to be reusable.

    // Let's make AuthModal reuse AuthView by styling wrapper.

    return (

        <AuthModalContent onLogin={onLogin} onBack={onBack} isModal={false} />

    );

};









// --- API KEY LANDING PAGE ---

const ApiKeySelectionView: React.FC<{ onKeySelected: () => void }> = ({ onKeySelected }) => {

    const handleSelection = async () => {

        try {

            await (window as any).aistudio.openSelectKey();

            onKeySelected();

        } catch (e) {

            console.error("Error selecting key:", e);

        }

    };



    return (

        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4 text-center relative overflow-hidden w-full">

            <div className="relative z-10 bg-white p-8 rounded-2xl border border-gray-200 shadow-xl max-w-md w-full">

                <div className="mb-4 flex justify-center">

                    <img src="/assets/logo.PNG" alt="signeedclub" className="h-16 w-auto" />

                </div>

                <h2 className="text-xl font-bold text-gray-600 mb-4">Expérience Fashion IA</h2>

                <p className="text-gray-500 mb-8 text-sm">

                    Pour utiliser les fonctionnalités d'essayage virtuel haute définition, veuillez connecter votre clé API Google Cloud.

                </p>

                <button

                    onClick={handleSelection}

                    className="w-full py-4 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl shadow-lg shadow-orange-500/30 transition-all transform hover:-translate-y-1 flex items-center justify-center gap-2"

                >

                    <i className="fa-solid fa-wand-magic-sparkles text-lg"></i>

                    <span>Connecter un Projet</span>

                </button>

                <div className="mt-6 pt-6 border-t border-gray-100">

                    <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="text-xs text-gray-400 hover:text-orange-500 underline">

                        En savoir plus sur la facturation et les clés API

                    </a>

                </div>

            </div>

        </div>

    );

};



// --- MERCH SWIPER (TINDER STYLE) ---

const MerchSwiper: React.FC<{

    onLike: (productKey: string, color: string) => void;

    customization?: CartItem;

}> = ({ onLike, customization }) => {



    const allVariants = useMemo(() => {

        const variants: { productKey: string, color: string, image: string, name: string }[] = [];

        Object.entries(productDatabase).forEach(([key, product]) => {

            Object.keys(product.images).forEach(color => {

                variants.push({

                    productKey: key,

                    color: color,

                    image: product.images[color],

                    name: product.name

                });

            });

        });

        return variants.sort(() => Math.random() - 0.5);

    }, []);



    const [currentIndex, setCurrentIndex] = useState(0);



    const handleSwipe = (action: 'like' | 'pass') => {

        const current = allVariants[currentIndex];

        if (action === 'like') {

            onLike(current.productKey, current.color);

        }

        setCurrentIndex((prev) => (prev + 1) % allVariants.length);

    };



    const currentVariant = allVariants[currentIndex];

    const overlayUrl = customization ? (

        customization.processedLogoUrlFront_original ||

        customization.originalLogoUrlFront ||

        (Array.isArray(customization.predefinedLogoUrlFront) ? customization.predefinedLogoUrlFront[0] : customization.predefinedLogoUrlFront)

    ) : null;



    const showOverlay = customization &&

        customization.productType === currentVariant.productKey &&

        overlayUrl;



    return (

        <div className="flex flex-col items-center animate-fade-in w-full max-w-xs mx-auto">

            <h4 className="text-sm font-bold text-gray-500 uppercase mb-4 tracking-widest text-center">Découvrir la collection</h4>

            <div className="w-full aspect-[3/4] bg-white rounded-2xl shadow-xl border border-gray-200 relative overflow-hidden group mb-6">

                <img src={getProxiedUrl(currentVariant.image, { width: 400 })} alt={currentVariant.name} className="w-full h-full object-contain p-4" />



                {showOverlay && overlayUrl && (

                    <img

                        src={getProxiedUrl(overlayUrl, { width: 250 })}

                        alt="User Design"

                        style={{

                            position: 'absolute',

                            left: `${customization.logoPositionXFront}%`,

                            top: `${customization.logoPositionYFront}%`,

                            width: `${customization.logoSizeFront * 0.6}px`,

                            transform: 'translate(-50%, -50%)',

                            pointerEvents: 'none',

                            mixBlendMode: 'multiply',

                            zIndex: 10

                        }}

                    />

                )}



                <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-white via-white/95 to-transparent p-4">

                    <h3 className="text-xl font-bold text-gray-900">{currentVariant.name}</h3>

                </div>

                <div className="absolute top-4 right-4 w-6 h-6 rounded-full border border-gray-200 shadow-sm" style={{ backgroundColor: currentVariant.color }}></div>

            </div>

            <div className="flex justify-center gap-8 w-full">

                <button

                    onClick={() => handleSwipe('pass')}

                    className="w-16 h-16 rounded-full bg-white border-2 border-red-100 text-red-500 shadow-lg hover:scale-110 hover:bg-red-50 transition-all flex items-center justify-center"

                >

                    <i className="fa-solid fa-xmark text-2xl"></i>

                </button>

                <button

                    onClick={() => handleSwipe('like')}

                    className="w-16 h-16 rounded-full bg-white border-2 border-green-100 text-green-500 shadow-lg hover:scale-110 hover:bg-green-50 transition-all flex items-center justify-center"

                >

                    <i className="fa-solid fa-handshake text-2xl"></i>

                </button>

            </div>

            <p className="mt-4 text-xs text-orange-500 animate-pulse font-medium">L'IA génère votre image...</p>

        </div>

    );

};



// --- VIEWS ---



const ProfileView: React.FC<{

    user: User,

    posts: Post[],

    onUpdateUser: (updatedUser: Partial<User>) => void,

    onPostClick: (post: Post) => void,

    onBack: () => void,

    onLogout: () => void,

    onAdmin: () => void,

    onProductClick: (productType: string, color?: string) => void,

    onRemoveValidation: (postId: string) => void,

    onDeletePost: (postId: string) => Promise<void> | void,

    onGoToRewards: () => void, // NEW PROP
    onTogglePrivacy?: (postId: string, isPrivate: boolean) => void,
    isOwnProfile: boolean,
    isFollowing?: boolean, // [NEW]
    onToggleFollow?: (userId?: string) => void, // [NEW] Update signal to accept ID for "unfollow from list"
    customizerProductType?: string // [NEW] Current customizer state
}> = ({ user, posts, onUpdateUser, onPostClick, onBack, onLogout, onAdmin, onProductClick, onRemoveValidation, onDeletePost, onGoToRewards, onTogglePrivacy, isOwnProfile, isFollowing, onToggleFollow, customizerProductType }) => {


    const [isEditing, setIsEditing] = useState(false);

    const [editName, setEditName] = useState(user.username);

    const [editBio, setEditBio] = useState(user.bio || '');

    const [editLink, setEditLink] = useState(user.websiteLink || '');

    const [activeTab, setActiveTab] = useState<'creations' | 'support'>('creations');

    const [selectedPost, setSelectedPost] = useState<Post | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);



    // Admin Edit State

    const [adminEditMode, setAdminEditMode] = useState(false);

    const [adminEditProductType, setAdminEditProductType] = useState('');

    const [adminEditColor, setAdminEditColor] = useState('');

    const [adminSaving, setAdminSaving] = useState(false);



    // Reset admin edit state when selectedPost changes

    useEffect(() => {

        if (selectedPost) {

            setAdminEditProductType(selectedPost.customization?.productType || selectedPost.tags?.[0]?.productType || 'tshirt');

            setAdminEditColor(selectedPost.customization?.color || '#000000');

            setAdminEditMode(false);

        }

    }, [selectedPost]);



    const handleAdminUpdatePost = async () => {

        if (!selectedPost || !user.isAdmin) return;

        setAdminSaving(true);

        try {

            const updatedCustomization = {

                ...(selectedPost.customization || {}),

                productType: adminEditProductType,

                color: adminEditColor

            };

            const updatedTags = [{ id: selectedPost.tags?.[0]?.id || 't_' + Date.now(), position: selectedPost.tags?.[0]?.position || { x: 50, y: 50 }, productType: adminEditProductType }];



            await updateDoc(doc(db, 'posts', selectedPost.id), {

                customization: updatedCustomization,

                tags: updatedTags

            });



            // Update local state

            setSelectedPost({ ...selectedPost, customization: updatedCustomization as any, tags: updatedTags });

            setAdminEditMode(false);

            alert('✅ Post mis à jour !');

        } catch (e) {

            console.error('Admin update post failed:', e);

            alert('Erreur lors de la mise à jour');

        } finally {

            setAdminSaving(false);

        }

    };



    // Dynamic scaling for fallback previews

    const [previewScale, setPreviewScale] = useState(1);

    const previewImgRef = useRef<HTMLImageElement>(null);



    useEffect(() => {

        if (!selectedPost) return;

        const timer = setTimeout(() => {

            if (previewImgRef.current) {

                const observer = new ResizeObserver((entries) => {

                    for (const entry of entries) {

                        // Base width is 400px (standard editor canvas width)

                        setPreviewScale(entry.contentRect.width / 400);

                    }

                });

                observer.observe(previewImgRef.current);

                return () => observer.disconnect();

            }

        }, 100);

        return () => clearTimeout(timer);

    }, [selectedPost]);





    const handleNextPost = (e: React.MouseEvent) => {

        e.stopPropagation();

        if (!selectedPost) return;

        const currentIndex = userPosts.findIndex(p => p.id === selectedPost.id);

        const nextIndex = (currentIndex + 1) % userPosts.length;

        setSelectedPost(userPosts[nextIndex]);

    };



    const handlePrevPost = (e: React.MouseEvent) => {

        e.stopPropagation();

        if (!selectedPost) return;

        const currentIndex = userPosts.findIndex(p => p.id === selectedPost.id);

        const prevIndex = (currentIndex - 1 + userPosts.length) % userPosts.length;

        setSelectedPost(userPosts[prevIndex]);

    };



    const allUserPosts = posts.filter(p => p.user.id === user.id);

    const visibleUserPosts = allUserPosts.filter(p => !p.archived);

    // For products, we show all posts (including archived), as they are part of the user's collection/portfolio that they want to keep

    // But wait, if they archive it, maybe they want to hide it from visitors?

    // "Elle restera visible dans 'Mes Produits'" implies visibility to the OWNER.

    // So if isOwnProfile, use allUserPosts. If visitor, use visibleUserPosts.

    const productPosts = isOwnProfile ? allUserPosts : visibleUserPosts;



    // For Main Tab, we use visibleUserPosts

    const userPosts = visibleUserPosts;

    const totalCredits = user.credits || 0; // Use user.credits directly for accuracy



    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {

        if (e.target.files?.[0]) {

            const reader = new FileReader();

            reader.onload = async (ev) => {

                if (ev.target?.result) {

                    const resizedAvatar = await resizeImage(ev.target.result as string, 200);

                    onUpdateUser({ avatarUrl: resizedAvatar });

                }

            };

            reader.readAsDataURL(e.target.files[0]);

        }

    };



    // Auto-generate referral code for existing users if missing

    useEffect(() => {

        if (isOwnProfile && !user.referralCode) {

            const uniqueSuffix = Math.random().toString(36).substring(2, 6);

            const newReferralCode = `${user.username.replace(/\s+/g, '').toLowerCase()}-${uniqueSuffix}`;

            onUpdateUser({ referralCode: newReferralCode });

        }

    }, [isOwnProfile, user.referralCode, user.username, onUpdateUser]);



    const handleSaveProfile = () => {

        onUpdateUser({ username: editName, bio: editBio, websiteLink: editLink });

        setIsEditing(false);

    };



    return (

        <div className="max-w-2xl lg:max-w-5xl mx-auto p-4 pb-24 animate-fade-in text-gray-800 scrollbar-hide">



            <div className="bg-white rounded-2xl p-6 border border-gray-200 mb-8 flex flex-col items-center relative overflow-hidden shadow-md max-w-xl mx-auto mt-4">



                <div className="relative z-10 mt-8 mb-4 group">

                    <div className="w-28 h-28 rounded-full p-1 bg-white shadow-xl">

                        <img src={user.avatarUrl} className="w-full h-full rounded-full object-cover border-4 border-white bg-gray-100" alt="Avatar" />

                    </div>

                    {isOwnProfile && (

                        <>

                            <button

                                onClick={() => fileInputRef.current?.click()}

                                className="absolute bottom-0 right-0 bg-gray-800 text-white p-2 rounded-full hover:bg-orange-500 transition-colors shadow-lg border border-white"

                                title="Changer la photo"

                            >

                                <i className="fa-solid fa-camera text-sm"></i>

                            </button>

                            <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleAvatarChange} />

                        </>

                    )}

                </div>



                <div className="relative z-10 text-center w-full">

                    {isEditing ? (

                        <div className="flex flex-col gap-3 w-full">

                            <div className="flex items-center justify-center gap-2 mb-2">

                                <span className="text-gray-500 text-lg font-bold">@</span>

                                <input

                                    type="text"

                                    value={editName}

                                    onChange={(e) => setEditName(e.target.value)}

                                    className="bg-gray-100 border border-gray-300 rounded px-2 py-1 text-gray-900 font-bold text-lg text-center focus:border-orange-500 outline-none w-40"

                                />

                            </div>

                            <div className="text-left w-full">

                                <label className="text-[10px] text-gray-400 uppercase font-bold mb-1 block">Biographie</label>

                                <textarea

                                    value={editBio}

                                    onChange={(e) => setEditBio(e.target.value)}

                                    placeholder="Parlez-nous de vous..."

                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs outline-none focus:border-orange-300 resize-none h-20"

                                />

                            </div>

                            <div className="text-left w-full">

                                <label className="text-[10px] text-gray-400 uppercase font-bold mb-1 block">Lien personnalisé</label>

                                <input

                                    type="text"

                                    placeholder="Votre lien (site, social...)"

                                    value={editLink}

                                    onChange={(e) => setEditLink(e.target.value)}

                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-orange-300"

                                />

                            </div>

                            <button

                                onClick={handleSaveProfile}

                                className="bg-orange-600 text-white w-full py-2 rounded-xl font-bold text-xs hover:bg-orange-700 transition"

                            >

                                Sauvegarder

                            </button>

                        </div>

                    ) : (

                        <div className="flex flex-col items-center gap-1.5 mb-4 w-full">

                            <div className="flex items-center justify-center gap-2">

                                <h1 className="text-lg font-black text-gray-900 tracking-tight">

                                    @{user.username}

                                </h1>

                                {isOwnProfile && (

                                    <button onClick={() => setIsEditing(true)} className="text-gray-400 hover:text-orange-500 text-xs p-1">

                                        <i className="fa-solid fa-pen"></i>

                                    </button>

                                )}

                            </div>



                            {user.bio && (

                                <p className="text-xs text-gray-600 leading-relaxed max-w-sm">

                                    {user.bio}

                                </p>

                            )}



                            {!isOwnProfile && onToggleFollow && (

                                <button

                                    onClick={() => onToggleFollow()}

                                    className={`text-xs font-bold px-4 py-1.5 rounded-full border transition-colors ${isFollowing

                                        ? 'bg-orange-50 text-orange-600 border-orange-200'

                                        : 'bg-gray-900 text-white border-gray-900'

                                        }`}

                                >

                                    {isFollowing ? 'Soutenu' : 'Soutenir'}

                                </button>

                            )}



                            {user.websiteLink && (

                                <a

                                    href={user.websiteLink.startsWith('http') ? user.websiteLink : `https://${user.websiteLink}`}

                                    target="_blank"

                                    rel="noopener noreferrer"

                                    className="text-xs text-orange-600 font-bold hover:underline flex items-center gap-1.5 mt-1"

                                >

                                    <i className="fa-solid fa-link text-[10px]"></i>

                                    {user.websiteLink.replace(/^https?:\/\//, '')}

                                </a>

                            )}

                        </div>

                    )}



                    <div className="flex justify-center gap-8 mt-6">

                        <div className="text-center">

                            <span className="block text-2xl font-black text-gray-900">{userPosts.length}</span>

                            <span className="text-xs text-gray-500 uppercase tracking-wider">Services Actifs</span>

                        </div>

                        <div className="text-center cursor-pointer group" onClick={onGoToRewards}>

                            <span className="block text-2xl font-black text-orange-500 group-hover:scale-110 transition-transform">{totalCredits}</span>

                            <span className="text-xs text-gray-500 uppercase tracking-wider group-hover:text-orange-500 transition-colors">Mes Crédits <i className="fa-solid fa-chevron-right text-[10px]"></i></span>

                        </div>

                    </div>

                </div>

            </div>



            {isOwnProfile && user.referralCode && (

                <div className="mt-6 w-full bg-orange-50 rounded-xl p-4 border border-orange-100 flex flex-col items-center">

                    <p className="text-sm font-bold text-orange-800 mb-2 flex items-center gap-2">

                        <i className="fa-solid fa-gift"></i> Parrainage

                    </p>

                    <p className="text-xs text-orange-600 mb-3 text-center">

                        Partagez ce lien et gagnez <span className="font-black">5 crédits</span> à chaque inscription !

                    </p>

                    <div className="flex w-full items-center gap-2 bg-white rounded-lg border border-orange-200 p-1">

                        <input

                            readOnly

                            value={`${window.location.origin}?ref=${user.referralCode}`}

                            className="flex-1 text-xs text-gray-600 bg-transparent outline-none px-2 font-mono"

                            onClick={(e) => e.currentTarget.select()}

                        />

                        <button

                            onClick={() => {

                                navigator.clipboard.writeText(`${window.location.origin}?ref=${user.referralCode}`);

                                alert("Lien copié !");

                            }}

                            className="bg-orange-500 text-white text-xs font-bold px-3 py-1.5 rounded-md hover:bg-orange-600"

                        >

                            Copier

                        </button>

                    </div>

                </div>

            )}



            <div className="flex border-b border-gray-200 mb-6">

                <button

                    onClick={() => setActiveTab('creations')}

                    className={`flex-1 pb-3 font-bold text-sm ${activeTab === 'creations' ? 'text-orange-600 border-b-2 border-orange-600' : 'text-gray-400'}`}

                >

                    <i className="fa-solid fa-microchip mr-2"></i> Actifs IA

                </button>

                <button

                    onClick={() => setActiveTab('support')}

                    className={`flex-1 pb-3 font-bold text-sm ${activeTab === 'support' ? 'text-orange-600 border-b-2 border-orange-600' : 'text-gray-400'}`}

                >

                    <i className="fa-solid fa-handshake mr-2"></i> Support

                </button>

            </div>



            {

                activeTab === 'support' && (

                    (!user.savedPostIds || user.savedPostIds.length === 0) ? (

                        <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200 border-dashed">

                            <p className="text-gray-500 mb-4">Vous n'avez soutenu aucune création.</p>

                            <p className="text-xs text-gray-400">Explorez le feed et validez des designs !</p>

                        </div>

                    ) : (

                        <div className="grid grid-cols-3 gap-3">

                            {posts.filter(p => user.savedPostIds?.includes(p.id)).map(post => (

                                <div

                                    key={post.id}

                                    onClick={() => setSelectedPost(post)}

                                    className="aspect-[3/4] bg-white rounded-xl overflow-hidden relative group cursor-pointer border border-gray-200 hover:border-orange-500 transition-all shadow-sm"

                                >

                                    <img src={post.imageUrl} className="w-full h-full object-cover transition-transform group-hover:scale-105" alt="Post" />

                                    <div className="absolute bottom-0 left-0 w-full p-2 bg-gradient-to-t from-black/80 to-transparent">

                                        <div className="flex items-center gap-1 text-white text-[10px]">

                                            <i className="fa-solid fa-check text-green-500"></i>

                                            <span>{post.validations || 0}</span>

                                        </div>

                                    </div>

                                    {isOwnProfile && (

                                        <button

                                            onClick={(e) => { e.stopPropagation(); onRemoveValidation(post.id); }}

                                            className="absolute top-2 right-2 w-6 h-6 bg-black/50 hover:bg-red-500 text-white rounded-full flex items-center justify-center transition-colors"

                                            title="Retirer le support"

                                        >

                                            <i className="fa-solid fa-xmark text-[10px]"></i>

                                        </button>

                                    )}

                                </div>

                            ))}

                        </div>

                    )

                )

            }



            {

                activeTab === 'creations' && (

                    userPosts.length === 0 ? (

                        <div className="flex flex-col items-center gap-4 py-8 text-center bg-gray-50 rounded-xl border border-gray-200 border-dashed">

                            <p className="text-gray-600 mb-2">Aucun actif déployé pour le moment.</p>



                            <div className="flex flex-col w-full max-w-xs gap-3">

                                {/* Bouton 1 : Création pure */}

                                <Link

                                    to="/creation"

                                    className="bg-orange-600 text-white px-6 py-3 rounded-full font-bold shadow-md hover:bg-orange-700 transition flex items-center justify-center gap-2"

                                >

                                    <span>🎨</span> Créer depuis zéro

                                </Link>



                                {/* Bouton 2 : Galerie / Remix */}

                                <Link

                                    to="/galerie"

                                    className="bg-white text-orange-600 border-2 border-orange-600 px-6 py-3 rounded-full font-bold shadow-sm hover:bg-orange-50 transition flex items-center justify-center gap-2"

                                >

                                    <span>🔄</span> Reprendre un modèle

                                </Link>

                            </div>

                        </div>

                    ) : (

                        <div className="grid grid-cols-3 gap-3">

                            {userPosts.map(post => (

                                <div

                                    key={post.id}

                                    onClick={() => setSelectedPost(post)}

                                    className="break-inside-avoid bg-white rounded-xl overflow-hidden relative group cursor-pointer border border-gray-200 hover:border-orange-500 transition-all shadow-sm mb-3"

                                >

                                    <img src={post.imageUrl} className="w-full h-auto object-contain transition-transform group-hover:scale-105" alt="Post" />

                                    <div className="absolute bottom-0 left-0 w-full p-2 bg-gradient-to-t from-black/80 to-transparent">

                                        <div className="flex items-center gap-1 text-white text-[10px]">

                                            <i className="fa-solid fa-heart text-orange-500"></i>

                                            <span>{post.validations || 0}</span>

                                        </div>

                                    </div>

                                    {isOwnProfile && (
                                        <div className="absolute top-2 left-2 flex gap-1 z-10">
                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center shadow-md backdrop-blur-md ${post.isPrivate ? 'bg-orange-500 text-white' : 'bg-white/80 text-gray-400 border border-gray-100'}`}>
                                                <i className={`fa-solid ${post.isPrivate ? 'fa-lock' : 'fa-globe'} text-[10px]`}></i>
                                            </div>
                                        </div>
                                    )}
                                </div>


                            ))}

                        </div>

                    )

                )

            }



            {/* Removed Mes Favoris Section */}



            {/* FULL SCREEN POST MODAL */}

            {selectedPost && createPortal(

                <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in p-4" onClick={() => setSelectedPost(null)}>



                    {/* Close Button (Top Right Fixed) */}

                    <button

                        onClick={(e) => { e.stopPropagation(); setSelectedPost(null); }}

                        className="fixed top-6 right-6 z-[100000] w-12 h-12 bg-white/40 hover:bg-white/60 backdrop-blur-md rounded-full text-gray-800 flex items-center justify-center transition-all border border-white/20 shadow-xl"

                    >

                        <i className="fa-solid fa-xmark text-xl"></i>

                    </button>



                    {/* Modal Content - Centered Card on Mobile & Desktop */}

                    <div

                        onClick={(e) => e.stopPropagation()}

                        style={{

                            maxWidth: '650px',

                            maxHeight: '600px',

                            width: '90%',

                            height: 'auto',

                            margin: 'auto'

                        }}

                        className="relative bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row transition-all duration-300"

                    >

                        {/* Image Section - AI Generated Image Only */}

                        <div className="relative w-full md:flex-1 bg-gray-50 flex items-center justify-center overflow-hidden md:min-h-0">

                            {/* Navigation Arrows */}

                            {userPosts.length > 1 && (

                                <>

                                    <button

                                        onClick={handlePrevPost}

                                        className="absolute left-2 z-20 w-10 h-10 bg-white/50 hover:bg-white text-gray-800 rounded-full flex items-center justify-center transition-all shadow-sm"

                                    >

                                        <i className="fa-solid fa-chevron-left"></i>

                                    </button>

                                    <button

                                        onClick={handleNextPost}

                                        className="absolute right-2 z-20 w-10 h-10 bg-white/50 hover:bg-white text-gray-800 rounded-full flex items-center justify-center transition-all shadow-sm"

                                    >

                                        <i className="fa-solid fa-chevron-right"></i>

                                    </button>

                                </>

                            )}



                            {/* AI Generated Image - Full Size */}

                            <div className="w-full h-full flex items-center justify-center p-4">

                                <img

                                    src={selectedPost.imageUrl}

                                    className="w-full h-full object-contain drop-shadow-lg rounded-lg"

                                    style={{ maxHeight: '480px' }}

                                    alt="Post Preview"

                                />

                            </div>

                        </div>



                        {/* Sidebar / Bottom Bar (Details & Action) */}

                        <div

                            className="w-full md:w-[220px] bg-white flex flex-col justify-between p-5 shrink-0 border-t md:border-t-0 md:border-l border-gray-100"

                        >

                            <div>

                                <div className="flex items-center gap-2 mb-4">

                                    <div className="w-8 h-8 rounded-full bg-gray-100 overflow-hidden border border-gray-200">

                                        <img src={selectedPost.user?.avatarUrl || "https://ui-avatars.com/api/?name=" + (selectedPost.user?.username || "User")} className="w-full h-full object-cover" alt="Avatar" />

                                    </div>

                                    <div>

                                        <h3 className="font-bold text-gray-900 text-xs">@{selectedPost.user?.username || 'Membre'}</h3>

                                        <p className="text-[10px] text-gray-400">Créateur</p>

                                    </div>

                                </div>



                                {selectedPost.stylePrompt && (

                                    <div className="mb-4 p-3 bg-gray-50 rounded-xl border border-gray-100">

                                        <p className="text-[9px] uppercase font-bold text-gray-400 mb-1 tracking-wider">Style</p>

                                        <p className="text-xs font-medium text-gray-800 italic line-clamp-3">"{selectedPost.stylePrompt}"</p>

                                    </div>

                                )}



                                {/* Admin Edit Controls */}

                                {user.isAdmin && (

                                    <div className="mt-3">

                                        {!adminEditMode ? (

                                            <button

                                                onClick={() => setAdminEditMode(true)}

                                                className="w-full py-1.5 text-[10px] bg-orange-50 hover:bg-orange-100 text-orange-700 font-bold rounded-lg border border-orange-200 flex items-center justify-center gap-1.5 transition-all"

                                            >

                                                <i className="fa-solid fa-pen-to-square"></i>

                                                Modifier le produit

                                            </button>

                                        ) : (

                                            <div className="p-2 bg-orange-50 rounded-xl border border-orange-200 space-y-2">

                                                <p className="text-[9px] uppercase font-bold text-orange-600 tracking-wider">Admin — Modifier le produit</p>



                                                {/* Product Type Selector */}

                                                <select

                                                    value={adminEditProductType}

                                                    onChange={(e) => {

                                                        setAdminEditProductType(e.target.value);

                                                        // Auto-select first color of new product

                                                        const newProduct = productDatabase[e.target.value];

                                                        if (newProduct) {

                                                            const firstColor = Object.keys(newProduct.images)[0];

                                                            setAdminEditColor(firstColor);

                                                        }

                                                    }}

                                                    className="w-full text-xs py-1.5 px-2 rounded-lg border border-orange-200 bg-white font-medium"

                                                >

                                                    {Object.entries(productDatabase).filter(([k]) => k !== 'catalogue').map(([key, product]) => (

                                                        <option key={key} value={key}>{product.name} ({product.reference || key})</option>

                                                    ))}

                                                </select>



                                                {/* Color Swatches */}

                                                {productDatabase[adminEditProductType] && (

                                                    <div className="flex flex-wrap gap-1">

                                                        {Object.keys(productDatabase[adminEditProductType].images).map((color) => (

                                                            <button

                                                                key={color}

                                                                onClick={() => setAdminEditColor(color)}

                                                                className={`w-5 h-5 rounded-full border-2 transition-all ${adminEditColor === color ? 'border-orange-500 scale-125 ring-2 ring-orange-300' : 'border-gray-300 hover:border-gray-400'

                                                                    }`}

                                                                style={{ backgroundColor: color }}

                                                                title={color}

                                                            />

                                                        ))}

                                                    </div>

                                                )}



                                                {/* Save / Cancel Row */}

                                                <div className="flex gap-1.5">

                                                    <button

                                                        onClick={handleAdminUpdatePost}

                                                        disabled={adminSaving}

                                                        className="flex-1 py-1.5 text-[10px] bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg flex items-center justify-center gap-1 transition-all disabled:opacity-50"

                                                    >

                                                        {adminSaving ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-check"></i>}

                                                        Valider

                                                    </button>

                                                    <button

                                                        onClick={() => setAdminEditMode(false)}

                                                        className="px-3 py-1.5 text-[10px] bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-lg transition-all"

                                                    >

                                                        <i className="fa-solid fa-xmark"></i>

                                                    </button>

                                                </div>

                                            </div>

                                        )}

                                    </div>

                                )}

                            </div>



                            <div className="mt-2 md:mt-auto">

                                {isOwnProfile && (
                                    <div className="mt-4 p-4 bg-gray-50 rounded-2xl border border-gray-100 animate-fade-in shadow-sm hover:shadow-md transition-all duration-300">
                                        <div className="flex items-center justify-between mb-1">
                                            <div className="flex flex-col">
                                                <span className="text-[9px] uppercase font-black text-gray-400 tracking-wider mb-0.5">Visibilité</span>
                                                <span className={`text-xs font-black transition-colors flex items-center gap-1.5 ${selectedPost.isPrivate ? "text-orange-600" : "text-gray-900"}`}>
                                                    {selectedPost.isPrivate ? (
                                                        <><i className="fa-solid fa-lock text-[10px]"></i> PRIVÉ</>
                                                    ) : (
                                                        <><i className="fa-solid fa-globe text-[10px]"></i> PUBLIC</>
                                                    )}
                                                </span>
                                            </div>

                                            {/* Privacy Toggle Switch */}
                                            <div
                                                onClick={async (e) => {
                                                    e.stopPropagation();
                                                    const newVal = !selectedPost.isPrivate;
                                                    // Local state update for smooth feeling
                                                    setSelectedPost(prev => prev ? { ...prev, isPrivate: newVal } : null);
                                                    if (typeof onTogglePrivacy === 'function') {
                                                        onTogglePrivacy(selectedPost.id, newVal);
                                                    }
                                                }}
                                                className={`relative w-11 h-6 rounded-full cursor-pointer transition-all duration-300 ${!selectedPost.isPrivate ? "bg-orange-600" : "bg-gray-300 shadow-inner"}`}
                                            >
                                                <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-md transition-all duration-300 transform flex items-center justify-center ${!selectedPost.isPrivate ? "translate-x-5" : "translate-x-0"}`}>
                                                    <i className={`fa-solid ${!selectedPost.isPrivate ? "fa-globe text-orange-600" : "fa-lock text-gray-400"} text-[8px]`}></i>
                                                </div>
                                            </div>
                                        </div>
                                        <p className="text-[9px] text-gray-400 opacity-80 mt-1 leading-tight">
                                            {selectedPost.isPrivate
                                                ? "Masqué de la galerie publique."
                                                : "Visible par toute la communauté."}
                                        </p>

                                        <button
                                            onClick={(e) => { e.stopPropagation(); onDeletePost(selectedPost.id); }}
                                            className="w-full py-2 mt-4 text-[10px] font-bold text-red-500 bg-red-50 hover:bg-red-100 rounded-xl transition-colors border border-red-100 flex items-center justify-center gap-2 group"
                                        >
                                            <i className="fa-solid fa-trash-can group-hover:scale-110 transition-transform"></i>
                                            Supprimer
                                        </button>
                                    </div>
                                )}

                                {selectedPost.tags && selectedPost.tags.length > 0 && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onPostClick(selectedPost);
                                            setSelectedPost(null);
                                        }}
                                        className="w-full py-3 bg-gray-900 hover:bg-black text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 mt-4 text-xs"
                                    >
                                        <i className="fa-solid fa-shirt"></i>
                                        Afficher le produit
                                    </button>
                                )}

                                <p className="text-center text-[9px] text-gray-400 mt-4 leading-tight px-4">
                                    Créez votre version unique à partir de ce design
                                </p>


                            </div>

                        </div>

                    </div>

                </div>,

                document.body

            )

            }



        </div >



    );

};



const CartView: React.FC<{

    cart: CartItem[],

    onRemove: (id: string) => void,

    onBack: () => void,

    onPurchase: () => void,

    onEdit: (item: CartItem, triggerAi?: boolean) => void,

    onAddVariant: (item: CartItem) => void,

    onUpdateItem: (itemId: string, size: string, delta: number) => void,

    isGuest: boolean,

    onAuthRequired: () => void,

    notifyGroupOrder: boolean,

    setNotifyGroupOrder: (v: boolean) => void,

    pricingRules?: PricingRules,

    user: User | null,

    promoCode: string,

    setPromoCode: (v: string) => void,

    promoError: string,

    promoSuccess: string,

    handleApplyPromo: () => void,

    calculateTotals: () => any,

    isExpress: boolean,

    setIsExpress: (v: boolean) => void,
    productsMapping?: any,
    discount: number
}> = ({ cart, onRemove, onBack, onPurchase, onEdit, onAddVariant, onUpdateItem, isGuest, onAuthRequired, notifyGroupOrder, setNotifyGroupOrder, pricingRules, user, promoCode, setPromoCode, promoError, promoSuccess, handleApplyPromo, calculateTotals, isExpress, setIsExpress, productsMapping, discount }) => {

    const [totals, setTotals] = useState(calculateTotals());

    useEffect(() => {
        const t = calculateTotals();
        setTotals(t);
        // Force re-calc if total is 0 but cart has items (Safety)
        if (t.total === 0 && cart.length > 0) {
            console.warn("CartView: Total is 0 with non-empty cart. Forcing re-calculation.");
            const retry = calculateTotals();
            setTotals(retry);
        }
    }, [cart, isExpress, promoCode, discount]);

    const { subtotal, servicesTotal, shipping, expressFee, discount: cartDiscount, total, itemsCount, isBulkRetouch } = totals;



    // Helper component for loading images

    const CartItemImage = ({ src, alt, className }: { src: string, alt: string, className: string }) => {

        const [loaded, setLoaded] = useState(false);

        const [error, setError] = useState(false);



        return (

            <div className="relative w-full h-full">

                {!loaded && !error && (

                    <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">

                        <div className="w-8 h-8 border-4 border-gray-200 border-t-orange-500 rounded-full animate-spin"></div>

                    </div>

                )}

                <img

                    src={src}

                    alt={alt}

                    className={`${className} ${loaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}

                    onLoad={() => setLoaded(true)}

                    onError={() => setError(true)}

                />

            </div>

        );

    };



    return (

        <div className="max-w-3xl mx-auto p-4 pb-40 animate-fade-in text-gray-800 scrollbar-hide">

            <div className="flex items-center justify-between mb-6">

                <div className="flex items-center">

                    <button onClick={onBack} className="mr-4 text-gray-400 hover:text-orange-500 md:hidden"><i className="fa-solid fa-arrow-left"></i></button>

                    <h2 className="text-2xl font-bold text-gray-900">Mon Panier ({itemsCount})</h2>

                </div>

                {isGuest && (

                    <button onClick={onAuthRequired} className="text-gray-500 font-bold text-xs hover:text-orange-600 transition-colors flex items-center gap-1">

                        Déjà client ? <span className="underline italic">Se connecter</span>

                    </button>

                )}

            </div>



            {cart.length === 0 ? (

                <div className="text-center py-12 bg-white rounded-2xl border border-gray-200 shadow-sm">

                    <p className="text-gray-500 mb-4">Votre panier est vide.</p>

                    <button onClick={onBack} className="text-orange-500 hover:underline font-medium">Découvrir la collection</button>

                </div>

            ) : (

                <div className="space-y-6">

                    {cart.map((item) => {

                        const product = productsMapping?.[item.productType] || productDatabase[item.productType];

                        if (!product) return null;

                        return (

                            <CartItemRow

                                key={item.id}

                                item={item}

                                product={productsMapping?.[item.productType] || product}

                                onRemove={onRemove}

                                onUpdateItem={onUpdateItem}

                                onEdit={(item, triggerAi) => onEdit(item, triggerAi)}

                                onAddVariant={onAddVariant}

                                productsMapping={productsMapping}

                            />

                        );

                    })}



                    {/* Team Offer Progression Bar - MOVED AFTER ITEMS */}

                    {cart.length > 0 && (

                        <div className="animate-fade-in-up">

                            <BatchProgressWidget localQty={itemsCount} />

                        </div>

                    )}



                    <div className="bg-white p-6 rounded-xl border border-gray-200 space-y-3 shadow-sm">

                        <div className="flex justify-between text-gray-500">

                            <span>Sous-total</span>

                            <span>{subtotal.toFixed(2)} €</span>

                        </div>

                        {(servicesTotal > 0 || isBulkRetouch) && (

                            <div className="flex justify-between text-orange-500 text-sm">

                                <span>Services {isBulkRetouch ? '(Dont Retouche Offerte)' : '(Retouche/Modernisation)'}</span>

                                <span>{isBulkRetouch && servicesTotal === 0 ? 'Offert' : `+${servicesTotal.toFixed(2)} €`}</span>

                            </div>

                        )}

                        <div className="pt-3 border-t border-gray-100 space-y-2">

                            <div className="flex justify-between items-center text-sm text-gray-600">

                                <div className="flex flex-col">

                                    <span>Frais de livraison</span>

                                    <span className="text-[10px] text-gray-400">Forfait transport Belgique inclus</span>

                                </div>

                                <span>{shipping.toFixed(2)} €</span>

                            </div>



                            <div className="flex justify-between items-center text-sm text-gray-600 bg-blue-50/50 p-2 rounded-lg border border-blue-100/50">

                                <div className="flex items-center gap-3">

                                    <input

                                        type="checkbox"

                                        id="express-order-internal"

                                        checked={isExpress}

                                        onChange={(e) => setIsExpress(e.target.checked)}

                                        className="w-4 h-4 text-orange-600 rounded border-gray-300 focus:ring-orange-500"

                                    />

                                    <label htmlFor="express-order-internal" className="flex flex-col cursor-pointer">

                                        <span className="font-bold text-gray-900">Commande Express</span>

                                        <span className="text-[10px] text-gray-400">Production & Livraison Prioritaire</span>

                                    </label>

                                </div>

                                <span className="font-bold text-orange-600">+12.00 €</span>

                            </div>



                            {/* PROMO CODE INPUT */}

                            <div className="pt-2">

                                <div className="flex gap-2">

                                    <input

                                        type="text"

                                        value={promoCode}

                                        onChange={(e) => setPromoCode(e.target.value)}

                                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm uppercase"

                                        placeholder="Code Promo"

                                    />

                                    <button

                                        onClick={handleApplyPromo}

                                        className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-black transition-colors"

                                    >

                                        OK

                                    </button>

                                </div>

                                {promoError && <p className="text-red-500 text-xs mt-1">{promoError}</p>}

                                {promoSuccess && <p className="text-green-600 text-xs mt-1 font-bold">{promoSuccess}</p>}

                            </div>



                            {cartDiscount > 0 && (
                                <div className="flex justify-between items-center text-green-600 font-bold">
                                    <span>Rubrique Promo</span>
                                    <span>-{cartDiscount.toFixed(2)} €</span>
                                </div>
                            )}



                            <div className="flex justify-between items-center pt-2 border-t border-gray-100">

                                <span className="text-xl font-bold text-gray-900">Total</span>

                                <span className="text-2xl font-black text-orange-600">{total.toFixed(2)} €</span>

                            </div>

                        </div>



                        <div className="bg-orange-50 p-3 rounded-lg border border-orange-100 mt-4">

                            <div className="flex items-start gap-3">

                                <input

                                    type="checkbox"

                                    id="groupOrderNotify"

                                    checked={notifyGroupOrder}

                                    onChange={(e) => setNotifyGroupOrder(e.target.checked)}

                                    className="mt-1 w-4 h-4 text-orange-600 rounded border-gray-300 focus:ring-orange-500"

                                />

                                <label htmlFor="groupOrderNotify" className="text-xs text-gray-700">

                                    <strong>Commandes groupées :</strong> Les frais de livraison peuvent être réduits lors de commandes groupées. Cochez cette case pour être prévenu par email si une opportunité se présente.

                                </label>

                            </div>

                        </div>



                        <button

                            onClick={onPurchase}

                            className="w-full py-4 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl shadow-lg shadow-orange-500/20 transition-all transform hover:-translate-y-1 flex items-center justify-center gap-2 mt-4"

                        >

                            <i className="fa-solid fa-credit-card"></i>

                            Procéder au Paiement (Gagner 5 Crédits)

                        </button>

                    </div>

                </div>

            )}

        </div>

    );

};



import { AdminView } from './components/AdminView';





function CustomizerApp() {

    const location = useLocation();

    const navigate = useNavigate();

    const { productType: routeProductType, postId: routePostId, shortId } = useParams<{ productType?: string, postId?: string, shortId?: string }>();

    const { products: productsMapping } = useProducts();



    useEffect(() => {

        console.log("CustomizerApp productsMapping tshirt price:", productsMapping['tshirt']?.price);

    }, [productsMapping]);







    // --- STATE DECLARATIONS (Ordered for hoisting sanity) ---

    const [user, setUser] = useState<User | null>(null);

    const [posts, setPosts] = useState<Post[]>(mockPosts);

    // Pagination states for Load More

    const [lastPostDoc, setLastPostDoc] = useState<any>(null);

    const [hasMorePosts, setHasMorePosts] = useState(true);

    const [isLoadingMore, setIsLoadingMore] = useState(false);

    const [cart, setCart] = useState<CartItem[]>(() => {

        const saved = localStorage.getItem('cart');

        return saved ? JSON.parse(saved) : mockPurchaseHistory;

    });

    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const [isGlobalMenuVisible, setIsGlobalMenuVisible] = useState(true);

    const [scrollUiVisible, setScrollUiVisible] = useState(true);



    // Banner Settings from Firestore

    const [bannerSettings, setBannerSettings] = useState<{ enabled: boolean, text: string }>({ enabled: false, text: '' });



    const [initialMagicColor, setInitialMagicColor] = useState<string | null>(null);

    const [initialMagicTemplate, setInitialMagicTemplate] = useState<string | null>(null);

    const [activePromo, setActivePromo] = useState<string>('');

    const [customizerProductType, setCustomizerProductType] = useState<string>('tshirt');

    const [customizerInitialState, setCustomizerInitialState] = useState<CartItem | null>(null);

    const [isRemixMode, setIsRemixMode] = useState(false);

    const [remixPostId, setRemixPostId] = useState<string | null>(null);

    const [notifyGroupOrder, setNotifyGroupOrder] = useState(false);

    const [isExpress, setIsExpress] = useState(false);

    const [viewedUser, setViewedUser] = useState<User | null>(null);

    const [isQuoteSubmitting, setIsQuoteSubmitting] = useState(false);

    const [showAiPromo, setShowAiPromo] = useState(false);

    const [productDimensions, setProductDimensions] = useState<Record<string, Record<string, number>>>({});

    const [pricingRules, setPricingRules] = useState<PricingRules>({});

    const [printMargin, setPrintMargin] = useState<number>(15);

    const lastScrollYRef = useRef(0);

    const [customizerKey, setCustomizerKey] = useState(Date.now());
    const [isResumeDraftModalOpen, setIsResumeDraftModalOpen] = useState(false);
    const [pendingProductType, setPendingProductType] = useState<string>('tshirt');

    const handleResumeProject = () => {
        handleCustomize(pendingProductType);
        setIsResumeDraftModalOpen(false);
    };

    const handleNewProject = () => {
        localStorage.removeItem('stylelink_draft_project');
        localStorage.removeItem('stylelink_draft_ai_result');
        handleCustomize(pendingProductType);
        setIsResumeDraftModalOpen(false);
    };

    const handleNavToCustomizer = (productType: string) => {
        const hasDraft = localStorage.getItem('stylelink_draft_project');
        if (hasDraft && view !== 'customizer') {
            setPendingProductType(productType);
            setIsResumeDraftModalOpen(true);
        } else {
            handleCustomize(productType);
        }
    };

    const [editingItemId, setEditingItemId] = useState<string | null>(null);

    const [aiGenerating, setAiGenerating] = useState(false);

    const [aiResult, setAiResult] = useState<string | null>(null);

    const [currentGenerationId, setCurrentGenerationId] = useState<string | null>(null);



    // PROMO & DISCOUNT STATES (Centralized)

    const [promoCode, setPromoCode] = useState("");

    const [discount, setDiscount] = useState(0);

    const [promoError, setPromoError] = useState("");

    const [promoSuccess, setPromoSuccess] = useState("");



    const handleApplyPromo = () => {

        setPromoError("");

        setPromoSuccess("");

        const code = promoCode.trim().toUpperCase();



        // TEMPORARILY DISABLED - TO BE MANAGED FROM ADMIN
        // if (code === "signeedclub15") {
        //     setDiscount(15);
        //     setPromoSuccess("Code appliqué ! -15€ sur votre commande.");
        // }

        if (code === "SNDFREE" && user?.email === "logosigneed@gmail.com") {

            setDiscount(100000); // 100% handled in calculateTotals

            setPromoSuccess("Code SNDFREE activé : 100% de réduction appliqué !");

        } else {

            setPromoError("Code invalide ou utilisateur non autorisé.");

            setDiscount(0);

        }

    };



    // --- RE-SCOPED ROBUST TOTALS CALCULATOR ---

    const calculateTotals = () => {

        let subtotal = 0;

        let servicesTotal = 0;

        let itemsCount = 0;

        const SHIPPING_COST = 6.99;



        cart.forEach(item => {
            const product = productsMapping?.[item.productType] || productDatabase[item.productType];
            if (!product) return;

            const sizes = item.sizes || {};
            // Aggressive numeric cast to avoid NaN
            const itemQty = Object.values(sizes).reduce((a, b) => (Number(a) || 0) + (Number(b) || 0), 0);
            
            // Skip ONLY IF itemQty is truly 0 and we are NOT investigating a 0.00 error
            if (itemQty <= 0) return;

            // 1. Calculate Marking Fee (Additive)
            const combinedFee = Number(calculateMarkingFee(item)) || 0;

            // 2. Calculate Base Textile Price for each size
            Object.entries(sizes).forEach(([size, qty]) => {
                const quantity = Number(qty) || 0;
                if (quantity <= 0) return;

                // Force numeric cast and fallback to product database price if necessary
                const baseUnitPrice = Number(calculateBaseUnitPrice(product, size, item.color, pricingRules, itemQty)) || Number(product.price) || 15;
                const fullUnitPrice = baseUnitPrice + combinedFee;

                // Fix Prix unitaire : Ensure at least 0.01 if product exists
                const finalUnitPrice = Math.max(0.01, fullUnitPrice);

                subtotal += quantity * finalUnitPrice;
                itemsCount += quantity;
            });

            if (item.serviceRetouche || item.isRetouchingService) servicesTotal += 50;
            if (item.serviceModernisation || item.isModernizationService) servicesTotal += 100;
        });

        const isBulkRetouch = itemsCount >= 10;
        const isQuoteOnly = false;

        let finalDiscount = Number(discount) || 0;
        const activePromoCode = promoCode.trim().toUpperCase();

        if (activePromoCode === 'SNDFREE' && user?.email === 'logosigneed@gmail.com') {
            finalDiscount = subtotal + servicesTotal + SHIPPING_COST;
        }

        const shippingValue = subtotal > 0 ? Number(SHIPPING_COST) : 0;
        const expressFee = isExpress ? 12 : 0;

        // CRITICAL FALLBACK: If subtotal is still 0 but cart has items, 
        // it means all items have 0 quantity. We MUST show a total based on min 1 unit per item
        // to avoid the "0.00€" display bug and give a valid price signal.
        if (subtotal === 0 && cart.length > 0) {
            console.warn("DEBUG PRIX: Subtotal is 0 despite non-empty cart. Applying 1-unit fallback...");
            cart.forEach(item => {
                const product = productsMapping?.[item.productType] || productDatabase[item.productType];
                const markingFee = Number(calculateMarkingFee(item)) || 0;
                const basePrice = product ? (Number(product.price) || 15) : 15;
                subtotal += (basePrice + markingFee);
                itemsCount += 1;
            });
        }

        // DEBUG LOG TO IDENTIFY WHY PRIX IS 0.00
        if (subtotal === 0 && cart.length > 0) {
            console.error("CRITICAL: Subtotal is STILL 0 with items in cart. Logic investigation needed.", { cart, productsMapping: !!productsMapping });
        }

        console.log("DEBUG PRIX SUMMARY:", { subtotal, servicesTotal, shippingValue, expressFee, finalDiscount, itemsCount });

        const total = Math.max(0.01, (Number(subtotal) || 0) + (Number(servicesTotal) || 0) + (Number(shippingValue) || 0) + (Number(expressFee) || 0) - (Number(finalDiscount) || 0));

        return {

            subtotal,

            servicesTotal,

            shipping: shippingValue,

            expressFee,

            discount: finalDiscount,

            total,

            itemsCount,

            isBulkRetouch,

            isQuoteOnly

        };

    };



    // --- VIEW MAPPING & NAVIGATION ---

    const getActiveView = (path: string) => {

        if (path.includes('/feed')) return 'feed';

        if (path.includes('/galerie')) return 'feed';

        if (path.includes('/panier')) return 'cart';

        if (path.includes('/profil')) return 'profile';

        if (path.includes('/recompense')) return 'rewards';

        if (path.includes('/admin')) return 'admin';

        if (path.includes('/creation')) return 'customizer';

        if (path.includes('/remix/')) return 'customizer';

        if (path.includes('/blog')) return 'blog';

        if (path.includes('/contact')) return 'contact';

        return 'feed';

    };



    const view = getActiveView(location.pathname);



    const setView = (viewName: 'feed' | 'customizer' | 'cart' | 'profile' | 'key_selection' | 'admin' | 'rewards' | 'contact' | 'blog') => {

        switch (viewName) {

            case 'feed': navigate('/galerie'); break;

            case 'cart': navigate('/panier'); break;

            case 'profile': navigate('/profil'); break;

            case 'rewards': navigate('/recompense'); break;

            case 'admin': navigate('/admin'); break;

            case 'customizer': navigate('/creation'); break;

            case 'blog': navigate('/blog'); break;

            case 'contact': navigate('/contact'); break;

            default: navigate('/galerie');

        }

    };



    // --- FULLSCREEN ON SCROLL (FEED) ---

    useEffect(() => {

        if (view === 'feed') {

            if (window.innerWidth < 1024) {

                document.documentElement.style.scrollSnapType = 'y mandatory';

                document.body.style.scrollSnapType = 'y mandatory';

                // Align snap point 64px (4rem) + safe area from bottom

                document.documentElement.style.scrollPaddingBottom = 'calc(4rem + env(safe-area-inset-bottom))';

                document.body.style.scrollPaddingBottom = 'calc(4rem + env(safe-area-inset-bottom))';

            }

        } else {

            setScrollUiVisible(true);

            document.documentElement.style.scrollSnapType = '';

            document.body.style.scrollSnapType = '';

            document.documentElement.style.scrollPaddingBottom = '';

            document.body.style.scrollPaddingBottom = '';

            return;

        }



        const handleScroll = () => {

            const currentScrollY = window.scrollY;

            // Only hide after 20px and when scrolling down

            if (currentScrollY > lastScrollYRef.current && currentScrollY > 20) {

                setScrollUiVisible(false);

            } else if (currentScrollY < lastScrollYRef.current || currentScrollY < 10) {

                setScrollUiVisible(true);

            }

            lastScrollYRef.current = currentScrollY;

        };



        window.addEventListener('scroll', handleScroll, { passive: true });

        return () => {

            window.removeEventListener('scroll', handleScroll);

            document.documentElement.style.scrollSnapType = '';

            document.body.style.scrollSnapType = '';

            document.documentElement.style.scrollPaddingBottom = '';

            document.body.style.scrollPaddingBottom = '';

        };

    }, [view]);



    // --- DRAFT CHECK ON ENTRY ---
    useEffect(() => {
        const searchParams = new URLSearchParams(window.location.search);
        if (searchParams.get('checkDraft') === 'true') {
            const hasDraft = localStorage.getItem('stylelink_draft_project');
            if (hasDraft) {
                setIsResumeDraftModalOpen(true);
                // Clean up URL parameter without refreshing
                const newUrl = window.location.pathname + window.location.search.replace(/[?&]checkDraft=true/, '').replace(/^&/, '?');
                window.history.replaceState({}, '', newUrl);
            }
        }
    }, [location.pathname]);

    // --- MAGIC LINK & ROUTE PARSING ---

    useEffect(() => {

        const searchParams = new URLSearchParams(window.location.search);



        // Priority: Route params > Query params

        const productParam = routeProductType || searchParams.get('product'); // e.g. hoodie_black

        const templateParam = searchParams.get('template');

        const promoParam = searchParams.get('promo');

        const sharedPostId = routePostId || searchParams.get('post');



        // --- HANDLE SHORT LINK RESOLUTION ---

        if (shortId) {

            const resolveShortLink = async () => {

                try {

                    const docSnap = await getDoc(doc(db, 'shortLinks', shortId));

                    if (docSnap.exists()) {

                        const data = docSnap.data();

                        if (data.sharedDesignId) {

                            const sharedDesign = await designSharingService.getSharedDesign(data.sharedDesignId);

                            if (sharedDesign) {

                                setCustomizerProductType(sharedDesign.productType);

                                setCustomizerInitialState(sharedDesign);

                                setCustomizerKey(Date.now());

                                if (view !== 'customizer') setView('customizer');

                            }

                        } else if (data.postId) {

                            const specificPost = await postService.getPostById(data.postId);

                            if (specificPost) {

                                setCustomizerProductType(specificPost.tags?.[0]?.productType || specificPost.customization?.productType || 'tshirt');

                                setCustomizerInitialState(specificPost.customization || null);

                                setIsRemixMode(true);

                                setRemixPostId(data.postId);

                                setPosts([specificPost]);

                                setCustomizerKey(Date.now());

                                if (view !== 'customizer') setView('customizer');

                            }

                        }

                    }

                } catch (e) {

                    console.error("Short link resolution failed:", e);

                }

            };

            resolveShortLink();

        }



        let shouldRemount = false;



        // --- HANDLE SHARED POST (REMIX) ---

        if (sharedPostId) {

            const loadPostForRemix = async () => {

                const specificPost = await postService.getPostById(sharedPostId);



                if (specificPost) {

                    setCustomizerProductType(specificPost.tags?.[0]?.productType || specificPost.customization?.productType || 'tshirt');

                    setCustomizerInitialState(specificPost.customization || null);

                    setIsRemixMode(true);

                    setRemixPostId(sharedPostId);

                    setPosts([specificPost]); // Focus view on the shared post

                    setCustomizerKey(Date.now());



                    // Only redirect if we're not already on a customizer-matching path

                    if (view !== 'customizer') {

                        navigate(`/remix/${sharedPostId}`);

                    }

                }

            };

            loadPostForRemix();

        }



        if (productParam) {

            // FIX: Check for exact match first (handles IDs with underscores like 'hoodie_jhk422')

            if (productDatabase[productParam]) {

                setCustomizerProductType(productParam);

                shouldRemount = true;

                if (view !== 'customizer') {

                    setView('customizer');

                }

            } else {

                // Compound ID logic: Try to find a known product ID at the start of the string

                // This handles cases like 'hoodie_jhk422_000000' where the product ID itself has an underscore.

                // CRITICAL FIX: Sort keys by length DESCENDING to ensure 'hoodie_jhk422' matches before 'hoodie'

                const knownProducts = Object.keys(productDatabase).sort((a, b) => b.length - a.length);

                const matchingKey = knownProducts.find(key => productParam.startsWith(key + '_'));



                if (matchingKey) {

                    setCustomizerProductType(matchingKey);

                    shouldRemount = true;



                    let colorPart = productParam.slice(matchingKey.length + 1);

                    if (colorPart) {

                        // Simple mapping for common URL friendly names to Hex

                        if (colorPart === 'black') colorPart = '#000000';

                        else if (colorPart === 'white') colorPart = '#FFFFFF';

                        else if (colorPart === 'navy') colorPart = '#1C2331';

                        else if (colorPart === 'grey' || colorPart === 'gray') colorPart = '#808080';

                        else if (!colorPart.startsWith('#')) colorPart = '#' + colorPart;



                        setInitialMagicColor(colorPart);

                    }

                } else {

                    // Fallback Legacy behavior: Try to split type_color (e.g. hoodie_black)

                    // This assumes the product ID does NOT have an underscore if it wasn't matched above.

                    const parts = productParam.split('_');

                    if (parts.length >= 1) {

                        const pType = parts[0];

                        setCustomizerProductType(pType);

                        shouldRemount = true;



                        if (parts.length >= 2) {

                            let colorCode = parts[1];

                            if (colorCode === 'black') colorCode = '#000000';

                            else if (colorCode === 'white') colorCode = '#FFFFFF';

                            else if (colorCode === 'navy') colorCode = '#1C2331';

                            else if (colorCode === 'grey' || colorCode === 'gray') colorCode = '#808080';

                            else if (!colorCode.startsWith('#')) colorCode = '#' + colorCode;



                            setInitialMagicColor(colorCode);

                        }

                    }

                }



                if (view !== 'customizer') {

                    setView('customizer');

                }

            }

        }



        if (templateParam) {

            const decodedTemplate = decodeURIComponent(templateParam);

            setInitialMagicTemplate(decodedTemplate);

            shouldRemount = true;

            if (!view || (view as string) === 'feed') {

                setView('customizer');

            }

        }



        // PROMO LOGIC

        const savedPromo = sessionStorage.getItem('activePromo');

        if (promoParam) {

            setActivePromo(promoParam);

            sessionStorage.setItem('activePromo', promoParam);

        } else if (savedPromo) {

            setActivePromo(savedPromo);

        }



        if (shouldRemount) {

            setCustomizerKey(Date.now());

        }



        // --- PAYMENT SUCCESS HANDLING ---

        const paymentSuccess = searchParams.get('payment_success');

        if (paymentSuccess === 'true') {

            alert("Paiement réussi ! Merci pour votre commande.");

            setCart([]);

            window.history.replaceState({}, '', window.location.pathname);

        }

    }, [routeProductType, routePostId]);



    // Fetch posts on load (Standard)

    useEffect(() => {

        const loadPosts = async () => {

            console.log('[CustomizerApp] Loading initial posts...');

            // Initial load: 12 posts to fill the gallery properly

            const { posts: fetchedPosts, lastDoc } = await postService.getPosts(null, 12);

            console.log('[CustomizerApp] Fetched posts:', fetchedPosts.length, 'lastDoc:', !!lastDoc);

            setLastPostDoc(lastDoc);

            setHasMorePosts(fetchedPosts.length === 12);



            const allPosts = [...fetchedPosts, ...mockPosts];



            // Only update posts if not in deep-link focus mode

            const searchParams = new URLSearchParams(window.location.search);

            if (!searchParams.get('post') && !routePostId) {

                console.log('[CustomizerApp] Setting posts:', allPosts.length);

                if (allPosts.length > 0) setPosts(allPosts);

                else setPosts(mockPosts);

            }



            const referralCode = searchParams.get('ref');

            if (referralCode) {

                sessionStorage.setItem('referralCode', referralCode);

            }

        };



        // Defer post loading by 500ms for PageSpeed/CLS optimization

        const timer = setTimeout(() => {

            loadPosts();

        }, 500);



        return () => clearTimeout(timer);

    }, [routePostId]);



    // Load more posts function for pagination

    const loadMorePosts = async () => {

        if (!hasMorePosts || isLoadingMore || !lastPostDoc) return;



        setIsLoadingMore(true);

        try {

            const { posts: newPosts, lastDoc } = await postService.getPosts(lastPostDoc, 24);

            if (newPosts.length > 0) {

                setPosts(prev => [...prev, ...newPosts]);

                setLastPostDoc(lastDoc);

                setHasMorePosts(newPosts.length === 24);

            } else {

                setHasMorePosts(false);

            }

        } catch (error) {

            console.error('Error loading more posts:', error);

        } finally {

            setIsLoadingMore(false);

        }

    };



    // LOAD PRODUCT DIMENSIONS AND PRICING RULES

    useEffect(() => {

        const loadSettings = async () => {

            try {

                // Load product dimensions

                const dimensionsDoc = await getDoc(doc(db, 'settings', 'dimensions'));

                if (dimensionsDoc.exists()) {

                    setProductDimensions(dimensionsDoc.data() as Record<string, Record<string, number>>);

                }



                // Load pricing rules (V2)

                const pricingDoc = await getDoc(doc(db, 'settings', 'pricing_rules_v2'));

                if (pricingDoc.exists()) {

                    const data = pricingDoc.data();

                    if (data?.bundledData) {

                        try {

                            setPricingRules(JSON.parse(data.bundledData) as PricingRules);

                            console.log("✅ Pricing Rules V2 (Bundled) loaded.");

                        } catch (e) {

                            console.error("Failed to parse pricing bundledData:", e);

                        }

                    } else {

                        setPricingRules(data as PricingRules);

                        console.log("✅ Pricing Rules V2 (Flat) loaded.");

                    }

                }



                // Load banner settings

                const bannerDoc = await getDoc(doc(db, 'settings', 'banner'));

                if (bannerDoc.exists()) {

                    setBannerSettings(bannerDoc.data() as { enabled: boolean, text: string });

                }



                // Load general settings (print margin)

                const generalDoc = await getDoc(doc(db, 'settings', 'general'));

                if (generalDoc.exists()) {

                    const data = generalDoc.data();

                    if (data.printMargin !== undefined) {

                        setPrintMargin(data.printMargin);

                    }

                }

            } catch (e) {

                console.error("Error loading settings:", e);

            }

        };

        loadSettings();

    }, []);

    // Total pieces in cart (sum of all sizes for all items)

    const totalPieces = cart.reduce((total, item) => {

        return total + Object.values(item.sizes).reduce((sum, qty) => sum + (qty as number), 0);

    }, 0);



    // --- CART PERSISTENCE (Async / IndexedDB) ---

    // Load initial cart (Full data)

    useEffect(() => {

        const hydrateCart = async () => {

            const savedFull = await cartPersistence.loadCart();

            if (savedFull && savedFull.length > 0) {

                setCart(savedFull);

            }

        };

        hydrateCart();

    }, []);



    // Save on change

    useEffect(() => {

        if (!cart) return;

        cartPersistence.saveCart(cart);

    }, [cart]);



    // --- SEO: DYNAMIC TITLE & META ---

    useEffect(() => {

        let title = "signeedclub - AI Fashion Studio";

        switch (view) {

            case 'feed':

                title = "signeedclub - Feed";

                break;

            case 'customizer':

                title = "signeedclub - Studio de Création";

                break;

            case 'cart':

                title = `signeedclub - Panier(${cart.length})`;

                break;

            case 'profile':

                title = user ? `signeedclub - Profil de ${user.username || 'Membre'} ` : "signeedclub - Mon Profil";

                break;

            case 'admin':

                title = "signeedclub - Admin";

                break;

        }

        document.title = title;

    }, [view, cart.length, user]);



    // Reset AI Promo when leaving customizer

    useEffect(() => {

        if (view !== 'customizer' && showAiPromo) {

            setShowAiPromo(false);

        }

    }, [view, showAiPromo]);



    useEffect(() => {

        const unsubscribe = authService.onAuthStateChanged((user) => {

            setUser(user);

            if (user) {

                if ((view as string) === 'key_selection') setView('feed');



                // Auto-activate SNDFREE for specific user

                if (user.email === 'logosigneed@gmail.com') {

                    setActivePromo('SNDFREE');

                }

            }

        });



        if ((window as any).aistudio && (window as any).aistudio.hasSelectedApiKey) {

            (window as any).aistudio.hasSelectedApiKey().then((hasKey: boolean) => {

                if (!hasKey) setView('key_selection');

            });

        }



        return () => unsubscribe();

    }, []);



    // --- BROWSER NAVIGATION & HISTORY MANAGED BY REACT ROUTER NOW ---

    // Manual handling removed to prevent conflicts.



    // Exit Warning (Prevent accidental leave)

    useEffect(() => {

        const handleBeforeUnload = (e: BeforeUnloadEvent) => {

            // Check if user is in "middle of something" could be added here

            // But user requested generic warning or return to feed.

            // Modern browsers require preventDefault() and setting returnValue to show the dialog.

            e.preventDefault();

            e.returnValue = '';

        };



        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => window.removeEventListener('beforeunload', handleBeforeUnload);

    }, []);



    const handleLogin = (loggedInUser: User) => {

    };





    const [forceAiOpen, setForceAiOpen] = useState(false);



    const handleCustomize = (productType: string, initialState?: CartItem, postId?: string, triggerAi?: boolean, asNewVariant?: boolean) => {

        setCustomizerProductType(productType);

        setCustomizerInitialState(initialState || null);

        setIsRemixMode(!!postId);

        setRemixPostId(postId || null);

        setCustomizerKey(Date.now()); // Reset customizer state

        setForceAiOpen(!!triggerAi);



        // CLEAR MAGIC PROPS if we are editing an existing item to prevent overrides

        if (initialState) {

            setInitialMagicColor(null);

            setInitialMagicTemplate(null);

            if (!asNewVariant) {
                setEditingItemId(initialState.id); // Set editing item ID only if NOT a new variant
            } else {
                setEditingItemId(null); // Ensure we are NOT in edit mode for new variant
            }

        }



        // PERSIST AI RESULT: Restore if present in item, otherwise clear

        if (initialState?.aiImageUrl) {

            setAiResult(initialState.aiImageUrl);

        } else {

            setAiResult(null);

        }



        setView('customizer')

    };



    const handleGenerateAi = async (params: {

        userPhoto: string,

        preview: string,

        productName: string,

        color: string,

        style: string,

        category: string,

        side: 'front' | 'back',

        currentItemState?: CartItem // [NEW] Pass the item to match in cart

    }) => {

        const genId = Date.now().toString();

        setCurrentGenerationId(genId);

        setAiGenerating(true);
        setAiResult(null);

        // [NEW] Mark target cart item as generating if we are editing one
        if (editingItemId) {
            setCart(prev => prev.map(item =>
                item.id === editingItemId ? { ...item, isAiGenerating: true, generationId: genId } : item
            ));
        }



        try {

            const result = await geminiService.generateTryOnImage(
                params.userPhoto,
                params.preview,
                `${params.productName} (${params.color})`,
                `${params.side === 'back' ? 'back view, ' : ''}${params.style}`,
                params.category,
                params.side,
                (params as any).logo || null,
                null,
                null, // designCompositeBase64
                (params as any).designLayout,
                (params as any).logoColor
            );





            const watermarkedResult = await addWatermark(result);

            // --- OPTIMIZATION (LCP FIX): Use Blob URL for immediate rendering to avoid DOM bloat ---
            try {
                const blob = dataURLtoBlob(watermarkedResult);
                if (blob) {
                    const blobUrl = URL.createObjectURL(blob);
                    setAiResult(blobUrl);
                } else {
                    setAiResult(watermarkedResult);
                }
            } catch (e) {
                setAiResult(watermarkedResult);
            }

            // Log to Firestore and get permanent URL
            const permanentUrl = await postService.logGeneration(user?.id || 'guest_session', user?.email || 'guest', watermarkedResult, params.style, params.category);

            setAiResult(permanentUrl);
            console.log("AI Generation Finished. Permanent URL:", permanentUrl);



            // AUTO-UPDATE CART ITEMS (Smart Sync: find all items matching this design)

            setCart(prev => prev.map(cartItem => {
                // [FIX] Precise targeting: use generationId OR model matching (which includes color)
                const matchesGenId = (cartItem.generationId === genId);
                const matchesModel = (params.currentItemState && isSameModel(cartItem, params.currentItemState));

                if (matchesGenId || (cartItem.isAiGenerating && matchesModel)) {

                    console.log("Updating Cart Item with AI image:", cartItem.id);

                    return {
                        ...cartItem, // Keep original item in cart (ID, sizes)
                        ...(params.currentItemState ? {
                            // Only update design properties from current state
                            color: params.currentItemState.color,
                            productType: params.currentItemState.productType,
                            originalLogoUrlFront: params.currentItemState.originalLogoUrlFront,
                            predefinedLogoUrlFront: params.currentItemState.predefinedLogoUrlFront,
                            processedLogoUrlFront: params.currentItemState.processedLogoUrlFront,
                            textFront: params.currentItemState.textFront,
                            logoPositionXFront: params.currentItemState.logoPositionXFront,
                            logoPositionYFront: params.currentItemState.logoPositionYFront,
                            logoSizeFront: params.currentItemState.logoSizeFront,
                            // ... other design properties
                            originalLogoUrlBack: params.currentItemState.originalLogoUrlBack,
                            predefinedLogoUrlBack: params.currentItemState.predefinedLogoUrlBack,
                            processedLogoUrlBack: params.currentItemState.processedLogoUrlBack,
                            textBack: params.currentItemState.textBack,
                            logoPositionXBack: params.currentItemState.logoPositionXBack,
                            logoPositionYBack: params.currentItemState.logoPositionYBack,
                            logoSizeBack: params.currentItemState.logoSizeBack
                        } : {}),
                        aiImageUrl: permanentUrl, // Legacy fallback
                        ...(params.side === 'back' ? { aiImageUrlBack: permanentUrl } : { aiImageUrlFront: permanentUrl }),
                        isAiGenerating: false,
                        // Clear technical preview to force dynamic DesignThumbnail with NEW state
                        previewImageUrlFront: null,
                        previewImageUrlBack: null
                    };

                }

                return cartItem;

            }));



        } catch (e: any) {

            console.error("AI Error in App:", e);

            // alert("Erreur de génération : " + e.message); // Removed redundant alert



            // In case of error, stop loader in cart too

            setCart(prev => prev.map(cartItem => {

                if (cartItem.generationId === genId) return { ...cartItem, isAiGenerating: false };

                return cartItem;

            }));



            throw e; // RE-THROW for child components (CustomizerView)

        } finally {

            setAiGenerating(false);

            setCurrentGenerationId(null);

            // SCROLL FIX: Force unlock mobile scrolling

            document.body.style.overflow = '';

            document.documentElement.style.overflow = '';

        }

    };



    const handleAddToCart = (item: CartItem) => {

        const itemToStore = {
            ...item,
            id: editingItemId ? item.id : crypto.randomUUID(), // Force new ID unless editing
            aiImageUrl: aiResult || item.aiImageUrl, // EXPLICITLY PERIST AI IMAGE
            isAiGenerating: aiGenerating,
            generationId: currentGenerationId || undefined
        };



        if (editingItemId) {

            // REPLACE/MERGE existing item

            setCart(prev => {

                // Remove the item being edited

                const others = prev.filter(i => i.id !== editingItemId);



                // Check if the NEW version matches another existing item

                const existingIndex = others.findIndex(i => isSameModel(i, itemToStore));



                if (existingIndex !== -1) {

                    // Merge with the existing one

                    const merged = [...others];

                    const existing = merged[existingIndex];

                    const newSizes = { ...existing.sizes };



                    Object.entries(itemToStore.sizes).forEach(([size, qty]) => {

                        newSizes[size] = (newSizes[size] || 0) + qty;

                    });



                    merged[existingIndex] = { ...existing, sizes: newSizes };

                    return merged;

                }



                // Otherwise just add it

                return [...others, itemToStore];

            });

            setEditingItemId(null); // Clear edit mode

        } else {

            // ADD new item - Check for duplicates

            setCart(prev => {

                const existingIndex = prev.findIndex(i => isSameModel(i, itemToStore));

                if (existingIndex !== -1) {

                    const merged = [...prev];

                    const existing = merged[existingIndex];

                    const newSizes = { ...existing.sizes };



                    Object.entries(itemToStore.sizes).forEach(([size, qty]) => {

                        newSizes[size] = (newSizes[size] || 0) + qty;

                    });



                    merged[existingIndex] = { ...existing, sizes: newSizes };

                    return merged;

                }

                return [...prev, itemToStore];

            });

        }

        setView('cart');

    };

    const handleRemoveFromCart = (id: string) => {

        setCart(cart.filter(item => item.id !== id));

    };



    const handleAddToWishlist = async (productId: string, color: string) => {

        if (!user) return;

        const itemKey = `${productId}| ${color} `;

        const currentWishlist = user.wishlist || [];

        if (!currentWishlist.includes(itemKey)) {

            const newWishlist = [...currentWishlist, itemKey];

            const updatedUser = { ...user, wishlist: newWishlist };

            setUser(updatedUser);

            await authService.updateUser(user.id, { wishlist: newWishlist });

        }

    };







    const handleUpdatePost = async (postId: string, customization: CartItem) => {

        if (!user || !user.isAdmin) return;

        try {

            await updateDoc(doc(db, 'posts', postId), {

                customization: customization,

                // Also update the tags to match the new product type

                tags: [{ id: 't_' + Date.now(), position: { x: 50, y: 50 }, productType: customization.productType }]

            });



            // Update local state

            setPosts(prev => prev.map(p => {

                if (p.id === postId) {

                    return {

                        ...p,

                        customization: customization,

                        tags: [{ id: 't_' + Date.now(), position: { x: 50, y: 50 }, productType: customization.productType }]

                    };

                }

                return p;

            }));



            alert("✅ Création mise à jour avec succès !");

            setView('feed');

        } catch (error) {

            console.error("Error updating post:", error);

            alert("Erreur lors de la mise à jour.");

        }

    };



    const handleValidatePost = async (postId: string) => {

        if (!user) return;

        const saved = user.savedPostIds || [];



        if (saved.includes(postId)) {

            return;

        }



        const newSaved = [...saved, postId];

        const updatedUser = { ...user, savedPostIds: newSaved };

        setUser(updatedUser);

        await authService.updateUser(user.id, { savedPostIds: newSaved });

        await postService.validatePost(postId, user.id, true);



        setPosts(prevPosts => prevPosts.map(p => {

            if (p.id === postId) {

                return { ...p, validations: (p.validations || 0) + 1 };

            }

            return p;

        }));

    };



    const handleRemoveValidation = async (postId: string) => {

        if (!user) return;

        const saved = user.savedPostIds || [];

        const newSaved = saved.filter(id => id !== postId);

        const updatedUser = { ...user, savedPostIds: newSaved };

        setUser(updatedUser);

        await authService.updateUser(user.id, { savedPostIds: newSaved });

        await postService.validatePost(postId, user.id, false);

    };



    const handleDeletePost = async (postId: string) => {

        // Removed native confirm for better UX/Reliability (or could use custom modal later)

        if (!confirm("Êtes-vous sûr de vouloir supprimer cette création ?")) return;



        try {

            await postService.archivePost(postId);



            // Update local state: mark as archived instead of removing

            setPosts(prev => prev.map(p => {

                if (p.id === postId) return { ...p, archived: true };

                return p;

            }));

            // alert("Création supprimée du profil.");

        } catch (e) {

            console.error("Error archiving post:", e);

            alert("Erreur lors de la suppression. Veuillez réessayer.");

        }

    };



    const handlePublish = async (image: string, caption: string, productType: string, customization: CartItem, styleCategory?: string, stylePrompt?: string) => {

        if (!user) return;



        const newPost: Post = {

            id: 'p_' + Date.now(),

            user: user,

            imageUrl: image,

            caption: caption,

            tags: [{ id: 't_' + Date.now(), position: { x: 50, y: 50 }, productType: productType }],

            comments: [],

            type: 'ai',

            status: 'approved',

            customization: customization,

            creditsEarned: 0,

            validations: 0,

            createdAt: serverTimestamp(),

            styleCategory: styleCategory,

            stylePrompt: stylePrompt

        };



        try {

            await postService.createPost(newPost);

            // Use local timestamp for immediate UI update to avoid "createdAt missing" issues

            setPosts([{ ...newPost, createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 } as any }, ...posts]);



            if (isRemixMode && remixPostId) {

                console.log(`Remixed post ${remixPostId}. Original creator rewarded.`);

            }



            setView('feed');

        } catch (error) {

            console.error("Error publishing post:", error);

            alert("Erreur lors de la publication.");

        }

    };



    const handleUpdateUser = async (updatedUser: Partial<User>) => {

        if (!user) return;

        const newUser = { ...user, ...updatedUser };

        setUser(newUser);

        await authService.updateUser(user.id, updatedUser);

    };



    const handleDeductCredits = (amount: number) => {
        if (!user) return false;
        if (user.isAdmin) return true; // Admin has unlimited credits
        if (user.credits < amount) {
            alert("Crédits insuffisants ! Achetez des produits pour en gagner.");
            return false;
        }
        handleUpdateUser({ credits: user.credits - amount });
        return true;
    };

    const handleTogglePrivacy = async (postId: string, isPrivate: boolean) => {
        try {
            await postService.updatePost(postId, { isPrivate });
            setPosts(prev => prev.map(p => p.id === postId ? { ...p, isPrivate } : p));
        } catch (e) {
            console.error("Toggle privacy failed:", e);
            alert("Erreur lors du changement de visibilité.");
        }
    };








    // --- CHECKOUT & PAYMENT LOGIC ---

    const [isPaymentContactModalOpen, setIsPaymentContactModalOpen] = useState(false);

    const [isPaymentLoading, setIsPaymentLoading] = useState(false);



    // Step 1: User clicks "Pay" -> Open Contact Form

    const handleInitiatePurchase = () => {

        if (cart.length === 0) return;

        setIsPaymentContactModalOpen(true);

    };



    // Step 2: User submits Contact Form -> Proceed to Mollie

    const handleConfirmPurchase = async (contactData: { name: string, email: string, phone: string, address: string, city: string, zip: string, createAccount?: boolean, password?: string }) => {

        setIsPaymentLoading(true);

        try {

            // Handle Auto-Registration if requested

            if (contactData.createAccount && contactData.password && !user) {

                try {

                    const defaultUsername = contactData.email.split('@')[0];

                    const newUser = await authService.register(contactData.email, contactData.password, defaultUsername);

                    setUser(newUser);

                } catch (regError: any) {

                    alert("Erreur lors de la création du compte : " + regError.message);

                    setIsPaymentLoading(false);

                    return;

                }

            }



            // Calculate Totals properly (sharing logic with CartView)

            const totals = calculateTotals();

            const totalAmount = totals.total;



            console.log("Payment Initiation - Form Data:", contactData);

            console.log("Payment Initiation - Totals:", totals);



            // Prepare Items for Mollie (Line Items)

            // Ensure we're sending values with 2 decimals if needed, but Mollie expects currency + value

            const itemsForMollie = cart.map(item => {

                const product = productsMapping?.[item.productType] || productDatabase[item.productType];

                const unitPrice = item.calculatedPrice || product.price;

                const itemQty = (Object.values(item.sizes) as number[]).reduce((a, b) => a + b, 0);



                return {

                    name: `${product.name} - ${item.color} (x${itemQty})`,

                    quantity: itemQty,

                    unitPrice: {

                        currency: 'EUR',

                        value: unitPrice.toFixed(2)

                    },

                    totalAmount: {

                        currency: 'EUR',

                        value: (unitPrice * itemQty).toFixed(2)

                    }

                };

            });



            // Add Services as line items if any

            if (totals.servicesTotal > 0) {

                itemsForMollie.push({

                    name: "Services (Retouche/Modernisation)",

                    quantity: 1,

                    unitPrice: { currency: 'EUR', value: totals.servicesTotal.toFixed(2) },

                    totalAmount: { currency: 'EUR', value: totals.servicesTotal.toFixed(2) }

                });

            }



            // Add Shipping as line item

            if (totals.shipping > 0) {

                itemsForMollie.push({

                    name: "Frais de livraison (Belgique)",

                    quantity: 1,

                    unitPrice: { currency: 'EUR', value: totals.shipping.toFixed(2) },

                    totalAmount: { currency: 'EUR', value: totals.shipping.toFixed(2) }

                });

            }



            // Add Discount as negative line item? Mollie APIs depend on version.

            // Safer to just adjust totalAmount of the request but better to show it.

            // Mollie Orders API supports discounts. If using Payments API, we just send total.

            // Assuming current backend implementation (`createMolliePayment`) uses Payments API where we just send `amount`.

            // But if it uses Orders API, we pass line items.

            // ZERO AMOUNT CHECK (BYPASS MOLLIE)

            if (totalAmount <= 0) {

                console.log("💰 Free Order Detected. Bypassing Payment Gateway.");



                // DIRECTLY SAVE ORDER

                try {

                    await addDoc(collection(db, 'orders'), {

                        userId: user ? user.id : 'guest',

                        email: contactData.email,

                        contactInfo: contactData,

                        items: itemsForMollie,

                        totalAmount: 0,

                        status: 'paid', // Auto-paid

                        createdAt: serverTimestamp(),

                        paymentMethod: 'promo_free',

                        checkoutUrl: 'skipped'

                    });

                } catch (dbError) {

                    console.error("Failed to save free order:", dbError);

                    alert("Erreur lors de l'enregistrement de la commande gratuite. Veuillez contacter le support.");

                    setIsPaymentLoading(false);

                    return;

                }



                // SIMULATE SUCCESS REDIRECT

                console.log("Redirecting to Success...");

                setIsPaymentLoading(false);

                // Use replace to avoid back-button loop

                window.location.href = window.location.pathname + '?payment_success=true';

                return;

            }



            const amountString = (typeof totalAmount === 'number' && !isNaN(totalAmount)) ? totalAmount.toFixed(2) : "0.00";

            console.log("💰 Payment Amount Check:", { raw: totalAmount, formatted: amountString, type: typeof totalAmount });

            console.log("📦 Payment Payload Items:", itemsForMollie);



            const response = await fetch('https://us-central1-signeedclub-d2d08.cloudfunctions.net/createMolliePayment', {

                method: 'POST',

                headers: { 'Content-Type': 'application/json' },

                body: JSON.stringify({

                    amount: amountString, // FIX: Safe String

                    metadata: {

                        userId: user ? user.id : 'guest',

                        cartId: 'temp_' + Date.now(),

                        contactName: contactData.name,

                        contactEmail: contactData.email,

                        contactPhone: contactData.phone,

                        shippingAddress: `${contactData.address}, ${contactData.zip} ${contactData.city} `

                    },

                    // Passing items in body for backend to potentially use in description or Orders API

                    items: itemsForMollie,

                    description: `Projet signeedclub - ${itemsForMollie.length} actifs par ${contactData.name} `

                }),

            });



            if (!response.ok) {

                const errText = await response.text();

                throw new Error(`HTTP ${response.status}: ${errText} `);

            }



            const data = await response.json();

            console.log("Mollie Response Data:", data);



            if (data.checkoutUrl) {

                // SAVE ORDER TO FIRESTORE

                try {

                    await addDoc(collection(db, 'orders'), {

                        userId: user ? user.id : 'guest',

                        email: contactData.email, // Use confirmed email from form

                        contactInfo: contactData, // Save full contact info

                        items: itemsForMollie,

                        totalAmount: totals.total,

                        status: 'pending',

                        createdAt: serverTimestamp(),

                        checkoutUrl: data.checkoutUrl

                    });

                } catch (dbError) {

                    console.error("Failed to save order:", dbError);

                }



                // Redirect

                console.log("Redirecting to:", data.checkoutUrl);

                setIsPaymentLoading(false); // Important to reset before redirect if possible, although page will unload

                window.location.href = data.checkoutUrl;

            } else {

                throw new Error("Erreur, pas de Checkout URL dans la réponse Mollie. Détails: " + JSON.stringify(data));

            }



        } catch (error: any) {

            console.error("Mollie Error Details:", error);

            alert("Erreur de paiement : " + (error.message || "Une erreur inconnue est survenue lors de la communication avec Mollie."));

            setIsPaymentLoading(false);

        } finally {

            // isPaymentLoading is handled in success (href change) and catch

        }

    };



    // --- QUOTE MODAL STATE ---

    const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);



    const handleRequestQuote = () => {

        // Removed strict auth check to allow guest quotes

        if (cart.length === 0) return;

        setIsQuoteModalOpen(true);

    };



    const handleSubmitQuote = async (formData: { name: string, email: string, phone: string, message: string, address?: string, city?: string, zip?: string, createAccount?: boolean, password?: string }) => {

        setIsQuoteSubmitting(true);

        try {

            // Handle Auto-Registration

            if (formData.createAccount && formData.password && !user) {

                try {

                    // Use email prefix as default username

                    const defaultUsername = formData.email.split('@')[0];

                    const newUser = await authService.register(formData.email, formData.password, defaultUsername);

                    setUser(newUser);

                    // Continue with sending quote as logged in user

                } catch (regError: any) {

                    alert("Erreur lors de la création du compte : " + regError.message);

                    return; // Stop if registration fails

                }

            }



            // HELPER: Render Text to Image (High Res)

            const renderTextToImage = (textConfig: any): string | null => {

                if (!textConfig || !textConfig.text) return null;

                try {

                    const canvas = document.createElement('canvas');

                    canvas.width = 1000; // High resolution for print

                    canvas.height = 1000;

                    const ctx = canvas.getContext('2d');

                    if (!ctx) return null;



                    // Scale font size (assuming editor base is around ~300-400px wide, so *3 multiplier for 1000px)

                    // Basic heuristic: 24px in editor -> ~72px in HD

                    const fontSize = (textConfig.fontSize || 24) * 4;



                    ctx.fillStyle = textConfig.color || '#000000';

                    ctx.font = `${textConfig.fontWeight || 'normal'} ${fontSize}px ${textConfig.fontFamily || 'Inter'} `;

                    ctx.textAlign = 'center';

                    ctx.textBaseline = 'middle';



                    if (textConfig.letterSpacing) {

                        canvas.style.letterSpacing = `${textConfig.letterSpacing} px`; // Canvas doesn't support letterSpacing natively easily, ignoring for MVP or using distinct fillText

                    }



                    // Position: Map % to Canvas Size

                    const x = (textConfig.position?.x ?? 50) / 100 * canvas.width;

                    const y = (textConfig.position?.y ?? 50) / 100 * canvas.height;



                    const textStr = textConfig.textTransform === 'uppercase' ? textConfig.text.toUpperCase() : textConfig.text;



                    // APPLY EFFECTS

                    if (textConfig.shadow) {

                        ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';

                        ctx.shadowBlur = 4;

                        ctx.shadowOffsetX = 2;

                        ctx.shadowOffsetY = 2;

                    }



                    if (textConfig.outline) {

                        // Stroke first

                        ctx.lineWidth = 3; // Thicker for larger high-res canvas (1000px)

                        ctx.strokeStyle = (textConfig.color === '#000000' || textConfig.color === 'black') ? 'white' : 'black';

                        if (textConfig.shadow) {

                            // Reset shadow for outline if desired, or keep it.

                            // Usually outline doesn't have shadow in simple editors, but here it's fine.

                            // Actually, stroke shouldn't necessarily have the same shadow.

                            ctx.shadowColor = 'transparent';

                        }

                        ctx.strokeText(textStr, x, y);



                        // Restore shadow for fill if needed

                        if (textConfig.shadow) {

                            ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';

                        }

                    }



                    ctx.fillText(textStr, x, y);



                    // Add outline if white for visibility? No, strictly what's on screen.



                    return canvas.toDataURL('image/png');

                } catch (e) {

                    console.error("Error rendering text to image", e);

                    return null;

                }

            };



            // Collect original logo files for attachments

            const logoAttachments: { filename: string, content: string, encoding: string }[] = [];



            cart.forEach((item, index) => {

                // --- ATTACH LOGOS (For Production) ---

                const logoFront = item.processedLogoUrlFront_original || item.originalLogoUrlFront;

                if (logoFront && logoFront.startsWith('data:image')) {

                    const match = logoFront.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);

                    if (match) {

                        const ext = match[1] === 'jpeg' ? 'jpg' : match[1];

                        logoAttachments.push({

                            filename: `Logo_Face_Article${index + 1}.${ext} `,

                            content: match[2],

                            encoding: 'base64'

                        });

                    }

                }



                // --- ATTACH TEXT AS IMAGE (Front) ---

                if (item.textFront && item.textFront.text) {

                    const textImg = renderTextToImage(item.textFront);

                    if (textImg && textImg.startsWith('data:image')) {

                        const match = textImg.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);

                        if (match) {

                            logoAttachments.push({

                                filename: `Texte_Face_Article${index + 1}.png`,

                                content: match[2],

                                encoding: 'base64'

                            });

                        }

                    }

                }



                const logoBack = item.processedLogoUrlBack_original || item.originalLogoUrlBack;

                if (logoBack && logoBack.startsWith('data:image')) {

                    const match = logoBack.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);

                    if (match) {

                        const ext = match[1] === 'jpeg' ? 'jpg' : match[1];

                        logoAttachments.push({

                            filename: `Logo_Dos_Article${index + 1}.${ext} `,

                            content: match[2],

                            encoding: 'base64'

                        });

                    }

                }



                // --- ATTACH TEXT AS IMAGE (Back) ---

                if (item.textBack && item.textBack.text) {

                    const textImg = renderTextToImage(item.textBack);

                    if (textImg && textImg.startsWith('data:image')) {

                        const match = textImg.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);

                        if (match) {

                            logoAttachments.push({

                                filename: `Texte_Dos_Article${index + 1}.png`,

                                content: match[2],

                                encoding: 'base64'

                            });

                        }

                    }

                }



                // --- ATTACH PREVIEWS (For Email Visuals via CID) ---

                const previewFront = item.previewImageUrlFront;

                if (previewFront && previewFront.startsWith('data:image')) {

                    const match = previewFront.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);

                    if (match) {

                        logoAttachments.push({

                            filename: `Apercu_Face_Article${index + 1}.png`,

                            content: match[2],

                            encoding: 'base64',

                            // cid: `preview_front_${ index } ` // Backend might need explicit contentId field if it maps strictly, but usually filename matching works if cid is used in src

                        });

                    }

                }



                const previewBack = item.previewImageUrlBack;

                if (previewBack && previewBack.startsWith('data:image')) {

                    const match = previewBack.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);

                    if (match) {

                        logoAttachments.push({

                            filename: `Apercu_Dos_Article${index + 1}.png`,

                            content: match[2],

                            encoding: 'base64'

                        });

                    }

                }

            });



            // OPTIMIZATION: Deep clean base64 strings to prevent payload errors

            const cleanItem = (obj: any): any => {

                if (obj === undefined) return null; // FIX: Firebase doesn't support undefined

                if (!obj) return obj;

                if (typeof obj === 'string') {

                    if (obj.startsWith('data:image')) return '[Base64 Data Removed]';

                    return obj;

                }

                if (Array.isArray(obj)) {

                    return obj.map(cleanItem);

                }

                if (typeof obj === 'object') {

                    const newObj: any = {};

                    for (const key in obj) {

                        newObj[key] = cleanItem(obj[key]);

                    }

                    return newObj;

                }

                return obj;

            };



            // Clean the cart for the payload (removes all base64)

            const optimizedCart = cart.map(item => cleanItem(item));



            // Mapping cart to the structure expected by the new backend function

            const cartItemsPayload = optimizedCart.map((item, index) => {

                // Flatten sizes

                const sizeStr = Object.entries(item.sizes)

                    .filter(([_, qty]) => (qty as number) > 0)

                    .map(([s, q]) => `${s} (${q})`)

                    .join(', ');



                const totalQty = (Object.values(item.sizes) as number[]).reduce((a, b) => a + b, 0);



                // Use CID references for images so they show inline in the email

                const hasBackContent = item.originalLogoUrlBack || item.predefinedLogoUrlBack || (item.textBack && item.textBack.text);



                return {

                    name: productsMapping?.[item.productType]?.name || productDatabase[item.productType]?.name || item.productType,

                    size: sizeStr,

                    quantity: totalQty,

                    previewImageUrl: `cid:Apercu_Face_Article${index + 1}.png`,

                    previewImageUrlBack: hasBackContent ? `cid:Apercu_Dos_Article${index + 1}.png` : null

                };

            });



            // Calculate Total

            const totalAmount = optimizedCart.reduce((sum, item) => {

                const product = productsMapping?.[item.productType] || productDatabase[item.productType];

                const itemQty = (Object.values(item.sizes) as number[]).reduce((a, b) => a + b, 0);

                return sum + (itemQty * (item.calculatedPrice || (product ? product.price : 0)));

            }, 0) + 20; // + Shipping (simplified)



            // Send Email via Cloud Function

            const response = await fetch('https://us-central1-signeedclub-d2d08.cloudfunctions.net/sendQuoteEmail', {

                method: 'POST',

                headers: { 'Content-Type': 'application/json' },

                body: JSON.stringify({

                    ...formData,

                    cartItems: cartItemsPayload, // Use payload prepared above

                    total: totalAmount,

                    logoAttachments: logoAttachments

                }),

            });



            // SAVE QUOTE TO FIRESTORE

            try {

                // Fix: Use JSON serialization to strip undefined/nested issues and use optimizedCart to avoid base64

                const safeCart = JSON.parse(JSON.stringify(optimizedCart));



                await addDoc(collection(db, 'quotes'), {

                    userId: user ? user.id : 'guest',

                    formData: formData,

                    cart: safeCart, // Save CLEANED cart

                    status: 'new',

                    createdAt: serverTimestamp()

                });

            } catch (dbError) {

                console.error("Failed to save quote:", dbError);

            }



            // Handle non-JSON responses (e.g., HTML error pages) gracefully

            const text = await response.text();

            let data;

            try {

                data = JSON.parse(text);

            } catch (e) {

                console.error("Non-JSON response:", text);

                throw new Error("Réponse serveur invalide (pas de JSON)");

            }



            if (response.ok) { // Firebase Functions return 200 on success usually

                alert(`Votre demande de devis a bien été envoyée! Vous recevrez un email de confirmation.`);

                setIsQuoteModalOpen(false);

                setShowAiPromo(true);

                setView('feed');

            } else {

                console.error("Erreur envoi:", data);

                alert("Une erreur est survenue : " + (data.message || "Inconnue"));

            }

        } catch (error: any) {

            console.error("Erreur réseau:", error);

            alert("Erreur lors de l'envoi : " + error.message);

        } finally {

            setIsQuoteSubmitting(false);

        }

    };



    const handleLogout = async () => {

        await authService.logout();

        setUser(null);

        window.location.reload();

    };



    const handleAddToCartBatch = (items: CartItem[]) => {

        setCart(prevCart => {
            let newCart = [...prevCart];

            // [NEW] If editing an existing item, remove it from the cart before adding the new batch
            if (editingItemId) {
                newCart = newCart.filter(i => i.id !== editingItemId);
            }



            items.forEach(newItem => {
                const taggedItem = {
                    ...newItem,
                    id: crypto.randomUUID(), // Always force new ID for batch items unless matched
                    isAiGenerating: aiGenerating,
                    generationId: currentGenerationId || undefined
                };

                const existingIndex = newCart.findIndex(i => isSameModel(i, taggedItem));

                if (existingIndex !== -1) {
                    const existing = newCart[existingIndex];
                    const mergedSizes = { ...existing.sizes };

                    Object.entries(taggedItem.sizes).forEach(([size, qty]) => {
                        mergedSizes[size] = (mergedSizes[size] || 0) + Number(qty);
                    });

                    newCart[existingIndex] = { ...existing, sizes: mergedSizes };
                } else {
                    newCart.push(taggedItem);
                }
            });

            return newCart;
        });

        setCustomizerInitialState(null); // Clear initial state so persistence loads from localStorage on return
        setView('cart');
    };



    const handleUpdateCartItem = (itemId: string, size: string, delta: number) => {

        setCart(prevCart => prevCart.map(item => {

            if (item.id === itemId) {

                const newSizes = { ...item.sizes };

                const currentQty = newSizes[size] || 0;

                const newQty = Math.max(0, currentQty + delta);



                if (newQty === 0) {

                    delete newSizes[size];

                } else {

                    newSizes[size] = newQty;

                }



                return { ...item, sizes: newSizes };

            }

            return item;

        }).filter(item => Object.keys(item.sizes).length > 0));

    };



    // --- REWARDS LOGIC ---

    const handleRedeemRewards = async (selectedIds: number[], cost: number) => {

        if (!user) return;

        if ((user.credits || 0) < cost && !user.isAdmin) {

            alert("Solde insuffisant.");

            return;

        }



        try {

            // Deduct credits

            const newBalance = (user.credits || 0) - cost;

            handleUpdateUser({ credits: newBalance });



            // Record transaction

            await addDoc(collection(db, 'redemptions'), {

                userId: user.id,

                email: user.email,

                username: user.username,

                rewardIds: selectedIds,

                cost: cost,

                timestamp: serverTimestamp(),

                status: 'pending' // pending manual fulfillment

            });



            alert("Félicitations ! Vos récompenses ont été débloquées avec succès. Vous recevrez un email de confirmation.");

            setView('feed');

        } catch (e) {

            console.error("Redemption error:", e);

            alert("Erreur lors de l'échange.");

        }

    };



    const handleApplyPromoCode = async (code: string): Promise<boolean> => {

        if (!user) return false;



        const normalizedCode = code.trim().toLowerCase();



        if (normalizedCode === 'welcome5') {

            const usedCodes = user.usedCodes || [];

            if (usedCodes.includes(normalizedCode)) {

                alert("Ce code a déjà été utilisé !");

                return false;

            }



            try {

                const newCredits = (user.credits || 0) + 5;

                const newUsedCodes = [...usedCodes, normalizedCode];



                await handleUpdateUser({

                    credits: newCredits,

                    usedCodes: newUsedCodes

                });



                alert("Code activé avec succès ! +5 Crédits ajoutés.");

                return true;

            } catch (e) {

                console.error("Promo code error:", e);

                alert("Erreur lors de l'activation du code.");

                return false;

            }

        } else if (normalizedCode === 'sndfree') {

            if (user.email === 'logosigneed@gmail.com') {

                setActivePromo('SNDFREE');

                alert("Code SNDFREE activé ! 100% de réduction appliquée.");

                return true;

            } else {

                alert("Ce code est réservé à un utilisateur spécifique.");

                return false;

            }

        }



        alert("Code promo invalide.");

        return false;

    };



    const handleToggleFollow = async (targetUserId?: string) => {

        if (!user) {

            setIsLoginModalOpen(true);

            return;

        }



        const idToToggle = targetUserId || (viewedUser ? viewedUser.id : null);

        if (!idToToggle) return;



        const currentFollowing = user.following || [];

        const isFollowing = currentFollowing.includes(idToToggle);



        let newFollowing;

        if (isFollowing) {

            newFollowing = currentFollowing.filter(id => id !== idToToggle);

        } else {

            newFollowing = [...currentFollowing, idToToggle];

        }



        const updatedUser = { ...user, following: newFollowing };

        setUser(updatedUser);

        setUser(updatedUser);

        await authService.updateUser(user.id, { following: newFollowing });

    };



    const handleSaveToProfile = async (imageUrl: string, prompt: string, style: string, customization?: CartItem) => {

        if (!user) return;

        try {

            // 1. Log the generation (existing behavior)

            const uploadedImageUrl = await postService.logGeneration(user.id, user.email, imageUrl, prompt, style);



            // 2. Create a proper Post with the full customization data

            const newPost: Post = {

                id: 'p_' + Date.now(),

                user: user,

                imageUrl: uploadedImageUrl,

                caption: `Ma création sur Signaid !`,

                tags: [{ id: 't_' + Date.now(), position: { x: 50, y: 50 }, productType: customization?.productType || customizerProductType || 'tshirt' }],

                comments: [],

                type: 'ai',

                status: 'approved',

                customization: customization || undefined,

                creditsEarned: 0,

                validations: 0,

                createdAt: serverTimestamp(),

                styleCategory: style,

                stylePrompt: prompt

            };



            await postService.createPost(newPost);

            setPosts([{ ...newPost, createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 } as any }, ...posts]);

        } catch (e) {

            console.error("Failed to save to profile", e);

            throw e;

        }

    };



    const renderView = () => {

        switch (view as string) {

            case 'feed':

                return (

                    <>

                        <FeedView

                            posts={posts.filter(p => !p.archived)}

                            onCustomize={handleCustomize}

                            cartCount={cart.length}

                            onGoToCart={() => setView('cart')}

                            onValidate={handleValidatePost}

                            userSavedPosts={user ? (user.savedPostIds || []) : []}

                            onViewProfile={(u) => { setViewedUser(u); setView('profile'); }}

                            onGoToRewards={() => setView('rewards')}

                            onLoadMore={loadMorePosts}

                            hasMorePosts={hasMorePosts}

                            isLoadingMore={isLoadingMore}

                        />

                    </>

                );

            case 'customizer':

                return (

                    <CustomizerView

                        setIsMenuVisible={setIsGlobalMenuVisible}

                        key={customizerKey} // Force reset when key changes

                        initialProductType={customizerProductType}

                        initialState={customizerInitialState || undefined}

                        isRemixMode={isRemixMode}

                        onAddToCart={handleAddToCart}

                        onAddToCartBatch={handleAddToCartBatch}

                        onBack={() => setView('feed')}

                        onPublish={handlePublish}

                        onAddToWishlist={handleAddToWishlist}

                        setIsQuoteModalOpen={setIsQuoteModalOpen} // Ensure prop name matches if existing, or just pass user

                        user={user} // Pass full user object to avoid ReferenceError

                        onGoToRewards={() => setView('rewards')}

                        userCredits={user ? user.credits || 0 : 0}

                        productDimensions={productDimensions}

                        onDeductCredits={handleDeductCredits}

                        isGuest={!user}

                        onAuthRequired={() => setIsLoginModalOpen(true)} // UPDATED

                        onUpdateUser={(updates) => setUser(prev => prev ? { ...prev, ...updates } : null)}

                        initialAiPromo={showAiPromo}

                        initialStyleCategory={remixPostId ? posts.find(p => p.id === remixPostId)?.styleCategory : undefined}

                        initialStylePrompt={remixPostId ? posts.find(p => p.id === remixPostId)?.stylePrompt : undefined}

                        pricingRules={pricingRules}

                        initialColor={initialMagicColor || undefined}

                        initialTemplate={initialMagicTemplate || undefined}

                        remixPostId={remixPostId}

                        aiGenerating={aiGenerating}

                        aiResult={aiResult}

                        onGenerateAi={handleGenerateAi}

                        setAiResult={setAiResult}

                        cartCount={cart.length}

                        onGoToCart={() => setView('cart')}

                        initialAiModalOpen={forceAiOpen}

                        onSaveToProfile={handleSaveToProfile}

                        onUpdatePost={handleUpdatePost}

                        products={productsMapping || productDatabase}

                        printMargin={printMargin}

                    />

                );

            case 'cart':

                return <CartView

                    cart={cart}

                    onRemove={handleRemoveFromCart}

                    onBack={() => setView('customizer')}

                    onPurchase={handleInitiatePurchase}

                    isExpress={isExpress}

                    setIsExpress={setIsExpress}

                    onEdit={(item: CartItem, triggerAi?: boolean) => {

                        setEditingItemId(item.id);

                        handleCustomize(item.productType, item, undefined, triggerAi);

                    }}

                    onAddVariant={(item) => handleCustomize(item.productType, item, undefined, false, true)}

                    pricingRules={pricingRules}

                    onUpdateItem={handleUpdateCartItem}

                    isGuest={!user}

                    onAuthRequired={() => setIsLoginModalOpen(true)}

                    notifyGroupOrder={notifyGroupOrder}

                    setNotifyGroupOrder={setNotifyGroupOrder}

                    user={user}

                    promoCode={promoCode}

                    setPromoCode={setPromoCode}

                    promoError={promoError}

                    promoSuccess={promoSuccess}

                    handleApplyPromo={handleApplyPromo}

                    calculateTotals={calculateTotals}
                    productsMapping={productsMapping}
                    discount={discount}
                />;

            case 'key_selection':

                return <ApiKeySelectionView onKeySelected={() => { window.location.reload(); }} />;

            case 'admin':

                return user ? (

                    <AdminView

                        user={user}

                        onBack={() => setView('profile')}

                        productDimensions={productDimensions}

                        onUpdateDimensions={(dims) => setProductDimensions(dims)}

                        onUpdatePrintMargin={(margin) => setPrintMargin(margin)}

                        initialPrintMargin={printMargin}

                    />

                ) : (

                    <AuthModalContent onLogin={handleLogin} onBack={() => setView('feed')} isModal={false} />

                );

            case 'rewards':

                return (

                    <RewardsView

                        userBalance={user ? user.credits || 0 : 0}

                        onRedeem={handleRedeemRewards}

                        onBack={() => setView('profile')}

                        onApplyPromoCode={handleApplyPromoCode}

                    />

                );

            case 'contact':

                return <ContactView />;



            case 'profile':

                const targetUser = viewedUser || user;

                if (!targetUser) return <AuthView onLogin={handleLogin} onBack={() => setView('feed')} />;

                const isOwnProfile = !!user && user.id === targetUser.id;

                return (

                    <>

                        <ProfileView

                            user={targetUser}

                            posts={posts}

                            onUpdateUser={handleUpdateUser}

                            onPostClick={(post) => handleCustomize(post.customization?.productType || post.tags?.[0]?.productType || 'tshirt', post.customization, post.id)}

                            onBack={() => setView('feed')}

                            onLogout={handleLogout}

                            onProductClick={(type, color) => handleCustomize(type, undefined, undefined)}

                            onRemoveValidation={handleRemoveValidation}

                            isOwnProfile={isOwnProfile}

                            onAdmin={() => setView('admin')}

                            onDeletePost={handleDeletePost}

                            onGoToRewards={() => setView('rewards')}

                            isFollowing={user ? (user.following || []).includes(targetUser.id) : false}

                            onToggleFollow={handleToggleFollow}

                            onTogglePrivacy={handleTogglePrivacy}

                            customizerProductType={customizerProductType}

                        />

                        {/* Show Admin Button only for logosigneed@gmail.com */}

                        {user && (user.email === 'logosigneed@gmail.com') && (

                            <button

                                onClick={() => setView('admin')}

                                className="w-full py-4 bg-gray-800 text-white font-bold rounded-xl mt-4 hover:bg-gray-900 transition-colors flex items-center justify-center gap-2"

                            >

                                <i className="fa-solid fa-lock"></i> Administration

                            </button>

                        )}



                    </>

                );

            default:

                return <div className="flex items-center justify-center h-screen">Chargement...</div>;

        }

    };

    return (
        <div className={`min-h-[100dvh] lg:overflow-visible flex flex-col text-gray-900 font-sans w-full ${view === 'feed' ? 'bg-gray-100' : 'bg-gray-50'}`}>
            {/* MOBILE NAVBAR (Fixed Top) */}
            {(view as string) !== 'key_selection' && (
                <MobileNavbar
                    onMenuClick={() => setIsMenuOpen(true)}
                    onCartClick={() => setView('cart')}
                    cartCount={totalPieces}
                />
            )}

            <UniversalMenu
                isOpen={isMenuOpen}
                onClose={() => setIsMenuOpen(false)}
                onNavigate={(v) => {
                    if (v === 'customizer') handleNavToCustomizer('tshirt');
                    else setView(v as any);
                }}
                user={user}
                activePage={view as string}
            />

            {(view as string) !== 'key_selection' && (

                <div className="hidden lg:block">

                    <DesktopNavbar

                        activeView={view}

                        onChangeView={(v) => {

                            if (v === 'customizer') handleNavToCustomizer('tshirt');

                            else setView(v);

                        }}

                        cartCount={totalPieces}

                        showPlusBadge={true}

                        user={user}

                        onLogout={handleLogout}

                        onLoginClick={() => setIsLoginModalOpen(true)}

                        onLoginSuccess={setUser}

                    />

                </div>

            )}



            {/* PROMO BANNER - DYNAMICALLY LOADED FROM ADMIN */}

            {bannerSettings.enabled && bannerSettings.text && isGlobalMenuVisible && (view === 'customizer' || view === 'feed' || view === 'cart') && (
                <>
                    <style>{`
                        @keyframes marquee-infinite {
                            0% { transform: translateX(0); }
                            100% { transform: translateX(-25%); }
                        }
                        .animate-marquee-infinite {
                            display: inline-flex;
                            animation: marquee-infinite 25s linear infinite;
                            will-change: transform;
                        }
                        .animate-marquee-infinite:hover {
                            animation-play-state: paused;
                        }
                    `}</style>
                    <div
                        data-layout-id="promo-banner"
                        className={`w-full bg-gradient-to-r from-orange-600 via-red-500 to-orange-600 bg-[length:200%_auto] animate-gradient text-white text-xs lg:text-sm font-bold py-1 overflow-hidden shadow-md z-[1100] fixed top-0 left-0 flex-shrink-0 flex items-center transition-all duration-500 ease-in-out
                            ${(!scrollUiVisible && view === 'feed') ? '-translate-y-full opacity-0' : 'translate-y-0 opacity-100'}
                        `}
                    >
                        <div className="animate-marquee-infinite whitespace-nowrap flex items-center">
                            <span className="mx-8">{bannerSettings.text}</span>
                            <span className="mx-8">{bannerSettings.text}</span>
                            <span className="mx-8">{bannerSettings.text}</span>
                            <span className="mx-8">{bannerSettings.text}</span>
                        </div>
                    </div>
                </>
            )}



            <main

                data-layout-id={view === 'feed' ? "app-main-feed" : "app-main"}

                className={`flex-grow flex flex-col ${view === 'feed' ? 'bg-gray-100' : 'bg-white lg:pb-32'} pb-0 relative z-10 transition-all duration-500

                    ${bannerSettings.enabled && bannerSettings.text ? 'pt-[104px] lg:pt-[112px]' : 'pt-[64px] lg:pt-[80px]'}

                `}

            >

                <div className={`mx-auto transition-all min-h-full flex flex-col ${view === 'feed' ? 'max-w-full w-full' : (view === 'customizer' ? 'max-w-full justify-start' : 'max-w-md lg:max-w-6xl shadow-2xl relative overflow-hidden lg:shadow-none lg:overflow-visible')}`}>



                    {renderView()}



                    {/* PAYMENT CONTACT MODAL */}

                    <QuoteModal

                        isOpen={isPaymentContactModalOpen}

                        onClose={() => setIsPaymentContactModalOpen(false)}

                        onSubmit={handleConfirmPurchase}

                        initialEmail={user?.email || ''}

                        initialName={user?.username || ''} // Using username as name proxy if available

                        isGuest={!user}

                        isLoading={isPaymentLoading}

                        title="Adresse de facturation"

                        subtitle="Veuillez confirmer vos coordonnées pour la commande."

                        submitLabel="Procéder au paiement (Mollie)"

                    />



                    {/* QUOTE MODAL */}

                    <QuoteModal

                        isOpen={isQuoteModalOpen}

                        onClose={() => setIsQuoteModalOpen(false)}

                        onSubmit={handleSubmitQuote}

                        initialEmail={user?.email || ''}

                        initialName={user?.username || ''}

                        isGuest={!user}

                        isLoading={isQuoteSubmitting}

                    // Using defaults for title/labels ("Demander un devis" etc.)

                    />

                </div>

            </main>

            {isLoginModalOpen && (

                <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-start justify-center p-4 pt-20 sm:pt-4 sm:items-center animate-fade-in overflow-y-auto">

                    <div className="w-full max-w-md">

                        <AuthModalContent

                            onLogin={(u) => { setUser(u); setIsLoginModalOpen(false); }}

                            onBack={() => setIsLoginModalOpen(false)}

                            isModal={true}

                        />

                    </div>

                </div>

            )}



            {/* PROMO POPUP - REMOVED (MANAGED BY ADMIN BANNER NOW) */}



            {/* RESUME DRAFT MODAL */}
            {isResumeDraftModalOpen && (
                <div className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-8 shadow-2xl animate-fade-in relative text-gray-800">
                        <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <i className="fa-solid fa-shirt text-orange-600 text-3xl"></i>
                        </div>
                        <h3 className="text-2xl font-black text-center text-gray-900 mb-2 uppercase tracking-tight">Projet en cours !</h3>
                        <p className="text-center text-gray-500 mb-8 font-medium">
                            Vous avez un design en attente. Souhaitez-vous le reprendre ou en créer un nouveau ?
                        </p>
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={handleResumeProject}
                                className="w-full py-4 bg-orange-600 hover:bg-orange-500 text-white font-black rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-sm"
                            >
                                <i className="fa-solid fa-rotate-left"></i>
                                Reprendre le projet
                            </button>
                            <button
                                onClick={handleNewProject}
                                className="w-full py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-[10px]"
                            >
                                <i className="fa-solid fa-plus"></i>
                                Nouveau projet
                            </button>
                            <button
                                onClick={() => setIsResumeDraftModalOpen(false)}
                                className="w-full py-2 text-gray-400 font-bold hover:text-gray-600 transition-all text-[9px] uppercase tracking-widest"
                            >
                                Annuler
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* QUOTE LOADING OVERLAY - PONG GAME */}

            {isQuoteSubmitting && (

                <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">

                    <LoadingScreen message="Votre demande de devis est en cours d'envoi..." />

                </div>

            )}

            {/* ADMIN LAYOUT EDITOR - Desktop Only */}

            <div className="hidden lg:block">



            </div>



            {/* Mobile Navbar removed from here (moved to top) */}





        </div>

    );

};







export default CustomizerApp;