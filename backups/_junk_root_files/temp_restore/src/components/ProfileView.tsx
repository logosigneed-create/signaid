import React, { useState, useRef, useEffect } from 'react';
import { User, Post } from '../types';
import { authService } from '../services/authService';
import { resizeImage } from '../utils/helpers';
import { Link } from 'react-router-dom';

export const ProfileView: React.FC<{
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
    isOwnProfile: boolean,
    isFollowing?: boolean, // [NEW]
    onToggleFollow?: (userId?: string) => void // [NEW] Update signal to accept ID for "unfollow from list"
}> = ({ user, posts, onUpdateUser, onPostClick, onBack, onLogout, onAdmin, onProductClick, onRemoveValidation, onDeletePost, onGoToRewards, isOwnProfile, isFollowing, onToggleFollow }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState(user.username);
    const [activeTab, setActiveTab] = useState<'creations' | 'support'>('creations');
    const [selectedPost, setSelectedPost] = useState<Post | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const getTime = (date: any) => {
        if (!date) return 0;
        if (date.seconds) return date.seconds * 1000;
        if (date.toDate && typeof date.toDate === 'function') return date.toDate().getTime();
        if (date instanceof Date) return date.getTime();
        const d = new Date(date);
        return isNaN(d.getTime()) ? 0 : d.getTime();
    };

    const sortedAllUserPosts = React.useMemo(() => {
        return posts
            .filter(p => p.user.id === user.id)
            .sort((a, b) => getTime(b.createdAt) - getTime(a.createdAt));
    }, [posts, user.id]);

    const visibleUserPosts = React.useMemo(() => {
        return sortedAllUserPosts.filter(p => !p.archived);
    }, [sortedAllUserPosts]);

    // For products, we show all posts (including archived), as they are part of the user's collection/portfolio that they want to keep
    const productPosts = isOwnProfile ? sortedAllUserPosts : visibleUserPosts;

    // For Main Tab, we use visibleUserPosts
    const userPosts = visibleUserPosts;
    const totalCredits = user.credits || 0;

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
        onUpdateUser({ username: editName });
        setIsEditing(false);
    };

    return (
        <div className="max-w-2xl lg:max-w-5xl mx-auto p-4 pb-24 animate-fade-in text-gray-800 scrollbar-hide">
            {/* Profile Header Removed - Handled by Global Header */}

            <div className="bg-white rounded-2xl p-6 border border-gray-200 mb-8 flex flex-col items-center relative overflow-hidden shadow-md max-w-xl mx-auto">
                <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-r from-orange-100 to-gray-200"></div>

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
                        <div className="flex items-center justify-center gap-2 mb-2">
                            <span className="text-gray-500 text-xl font-bold">@</span>
                            <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="bg-gray-100 border border-gray-300 rounded px-2 py-1 text-gray-900 font-bold text-xl text-center focus:border-orange-500 outline-none w-40"
                            />
                            <button onClick={handleSaveProfile} className="text-green-500 hover:text-green-600 ml-2 p-1">
                                <i className="fa-solid fa-check"></i>
                            </button>
                        </div>
                    ) : (
                        <h1 className="text-2xl font-bold text-gray-900 mb-2 flex items-center justify-center gap-2">
                            @{user.username}
                            {!isOwnProfile && onToggleFollow && (
                                <button
                                    onClick={() => onToggleFollow()}
                                    className={`ml-3 text-xs font-bold px-3 py-1 rounded-full border transition-colors ${isFollowing
                                        ? 'bg-orange-50 text-orange-600 border-orange-200'
                                        : 'bg-gray-900 text-white border-gray-900'
                                        }`}
                                >
                                    {isFollowing ? 'Soutenu' : 'Soutenir'}
                                </button>
                            )}
                            {isOwnProfile && (
                                <button onClick={() => setIsEditing(true)} className="text-gray-400 hover:text-orange-500 text-xs p-1">
                                    <i className="fa-solid fa-pen"></i>
                                </button>
                            )}
                        </h1>
                    )}

                    <div className="flex justify-center gap-8 mt-6">
                        <div className="text-center">
                            <span className="block text-2xl font-black text-gray-900">{userPosts.length}</span>
                            <span className="text-xs text-gray-500 uppercase tracking-wider">Créations</span>
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
                    <i className="fa-solid fa-shirt mr-2"></i> Créations
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
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
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
                            <p className="text-gray-600 mb-2">Vous n'avez pas encore publié de design.</p>

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
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                            {userPosts.map(post => (
                                <div
                                    key={post.id}
                                    onClick={() => setSelectedPost(post)}
                                    className="aspect-[3/4] bg-white rounded-xl overflow-hidden relative group cursor-pointer border border-gray-200 hover:border-orange-500 transition-all shadow-sm"
                                >
                                    <img src={post.imageUrl} className="w-full h-full object-cover transition-transform group-hover:scale-105" alt="Post" />
                                    <div className="absolute bottom-0 left-0 w-full p-2 bg-gradient-to-t from-black/80 to-transparent">
                                        <div className="flex items-center gap-1 text-white text-[10px]">
                                            <i className="fa-solid fa-heart text-orange-500"></i>
                                            <span>{post.validations || 0}</span>
                                        </div>
                                    </div>
                                    {isOwnProfile && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onDeletePost(post.id); }}
                                            className="absolute top-2 right-2 w-6 h-6 bg-black/50 hover:bg-red-500 text-white rounded-full flex items-center justify-center transition-colors"
                                        >
                                            <i className="fa-solid fa-trash text-[10px]"></i>
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )
                )
            }

            {/* FULL SCREEN POST MODAL */}
            {/* FULL SCREEN POST MODAL (Immersive Style) */}
            {/* FULL SCREEN POST MODAL (Immersive Style - FIXED Z-INDEX & LAYOUT) */}
            {/* FULL SCREEN POST MODAL (Immersive Style - OPTIMIZED LAYOUT) */}
            {/* FULL SCREEN POST MODAL (Immersive Style - RESPONSIVE & SPACED) */}
            {selectedPost && (
                <div className="fixed top-20 md:top-0 left-0 right-0 bottom-0 z-[100] bg-black/85 backdrop-blur-md animate-fade-in touch-none overflow-hidden flex flex-col items-center justify-center">

                    {/* Responsive Container (Full on Mobile, Boxed on Desktop) */}
                    <div className="relative w-full h-full md:w-auto md:h-auto md:max-w-4xl md:max-h-[70vh] md:aspect-square flex flex-col md:rounded-2xl md:overflow-hidden md:shadow-2xl md:bg-black">

                        {/* Image Container */}
                        <div className="relative flex-1 w-full bg-black/20 p-0 md:p-8">
                            <img
                                src={selectedPost.imageUrl}
                                className="w-full h-full object-contain object-top"
                                alt="Full Preview"
                            />
                        </div>

                        {/* Close Button (Floating) */}
                        <button
                            onClick={() => setSelectedPost(null)}
                            className="absolute top-4 right-4 w-12 h-12 bg-black/40 backdrop-blur-md rounded-full text-white flex items-center justify-center z-[10000] hover:bg-black/60 transition-colors border border-white/20 shadow-lg"
                        >
                            <i className="fa-solid fa-xmark text-xl"></i>
                        </button>

                        {/* Bottom Actions Overlay */}
                        <div className="absolute bottom-0 left-0 w-full p-6 pb-24 md:pb-8 bg-gradient-to-t from-black via-black/80 to-transparent z-[10000]">
                            <div className="flex flex-col gap-6 max-w-md mx-auto w-full">
                                <h3 className="text-white text-center font-bold text-shadow-md mb-2 opacity-95 text-sm uppercase tracking-widest">Choisir le produit</h3>

                                <button
                                    onClick={() => {
                                        onPostClick(selectedPost);
                                        setSelectedPost(null);
                                    }}
                                    className="w-full py-5 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl shadow-xl shadow-orange-500/20 transition-all flex items-center justify-center gap-4 active:scale-95 text-lg"
                                >
                                    <i className="fa-solid fa-wand-magic-sparkles text-2xl"></i>
                                    <span className="uppercase tracking-wider">Personnaliser ce design</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>

    );
};
