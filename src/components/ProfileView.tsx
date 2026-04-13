import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { User, Post } from '../types';
import { authService } from '../services/authService';
import { postService } from '../services/postService';
import { resizeImage, getProxiedUrl } from '../utils/helpers';
import { getOptimizedImageUrl } from '../utils/imageUtils';
import { LazyImage } from './LazyImage';
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
    onTogglePrivacy?: (postId: string, isPrivate: boolean) => void,
    isOwnProfile: boolean,
    isFollowing?: boolean;
    onToggleFollow?: (userId: string) => void;
    isGuest?: boolean;
    onLoginRequest?: () => void;
}> = ({ user, posts, onUpdateUser, onPostClick, onBack, onLogout, onAdmin, onProductClick, onRemoveValidation, onDeletePost, onGoToRewards, onTogglePrivacy, isOwnProfile, isFollowing, onToggleFollow, isGuest, onLoginRequest }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState(user.username);
    const [editBio, setEditBio] = useState(user.bio || '');
    const [editLink, setEditLink] = useState(user.websiteLink || '');
    const [activeTab, setActiveTab] = useState<'creations' | 'support'>('creations');
    const [selectedPost, setSelectedPost] = useState<Post | null>(null);
    const [activeOverlayPostId, setActiveOverlayPostId] = useState<string | null>(null);
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
            .sort((a, b) => {
                const timeA = getTime(a.createdAt);
                const timeB = getTime(b.createdAt);
                const diff = timeB - timeA;

                // If dates are equal (or invalid/0), fall back to ID to ensure deterministic order (Newest/Highest ID first assumption)
                // This prevents the 'shuffled' order from App.tsx leaking into the Profile view
                if (diff === 0) {
                    return (b.id || "").localeCompare(a.id || "");
                }
                return diff;
            });
    }, [posts, user.id]);

    const visibleUserPosts = React.useMemo(() => {
        return sortedAllUserPosts.filter(p => !p.archived && (isOwnProfile || !p.isPrivate));
    }, [sortedAllUserPosts, isOwnProfile]);

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

    // Sync selectedPost when props change for instant toggle
    useEffect(() => {
        if (selectedPost) {
            const updated = posts.find(p => p.id === selectedPost.id);
            if (updated && updated.isPrivate !== selectedPost.isPrivate) {
                setSelectedPost(updated);
            }
        }
    }, [posts, selectedPost]);

    // Keep edit state in sync with user prop
    useEffect(() => {
        setEditName(user.username);
        setEditBio(user.bio || '');
        setEditLink(user.websiteLink || '');
    }, [user.username, user.bio, user.websiteLink]);

    const handleSaveProfile = async () => {
        if (!editName.trim()) {
            alert("Le nom d'utilisateur ne peut pas être vide.");
            return;
        }

        try {
            await onUpdateUser({ username: editName.trim(), bio: editBio, websiteLink: editLink });
            setIsEditing(false);
        } catch (e) {
            console.error(e);
            alert("Erreur lors de la sauvegarde.");
        }
    };

    return (
        <div
            data-layout-id="profile-container"
            className="max-w-[1025px] mx-auto p-4 pb-24 animate-fade-in text-gray-800 scrollbar-hide relative"
        >
            {/* Profile Header Removed - Handled by Global Header */}
            <div className="relative bg-white rounded-[2rem] border border-gray-100 mb-8 flex flex-col shadow-2xl max-w-xl mx-auto mt-6 overflow-hidden animate-fade-in shadow-orange-500/10">
                {/* Premium Banner Background */}
                <div className="h-28 w-full bg-gradient-to-br from-orange-400 via-rose-400 to-orange-500 relative">
                    <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                </div>

                <div className="px-6 pb-6 pt-0 relative">
                    {/* Floating Avatar Area */}
                    <div className="flex justify-start -mt-12 mb-4 relative z-10 items-end gap-4">
                        <div className="relative group">
                            <div className="w-24 h-24 rounded-full p-1.5 bg-white shadow-xl border border-gray-100 overflow-hidden transform hover:scale-105 transition-transform duration-300">
                                <img src={user.avatarUrl} className="w-full h-full rounded-full object-cover bg-gray-50" alt="Avatar" />
                            </div>
                            {isOwnProfile && !isGuest && (
                                <>
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="absolute bottom-0 right-0 bg-gray-900 text-white w-8 h-8 flex items-center justify-center rounded-full hover:bg-orange-600 transition-all shadow-lg border-2 border-white scale-90 hover:scale-110 active:scale-95"
                                        title="Changer la photo"
                                    >
                                        <i className="fa-solid fa-camera text-xs"></i>
                                    </button>
                                    <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleAvatarChange} />
                                </>
                            )}
                        </div>

                        {/* Top Action (Mobile/Side) */}
                        {!isEditing && isOwnProfile && !isGuest && (
                            <div className="pb-1">
                                <button 
                                    onClick={() => setIsEditing(true)} 
                                    className="bg-white/90 backdrop-blur-sm px-4 py-1.5 rounded-full border border-gray-200 text-[10px] font-black uppercase tracking-widest text-gray-700 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 transition-all shadow-sm"
                                >
                                    Modifier
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Content Section */}
                    <div className="flex flex-col gap-1 mb-5">
                        {isEditing ? (
                            <div className="flex flex-col gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100 mt-2">
                                <div className="space-y-1">
                                    <label className="text-[10px] uppercase font-black text-gray-400 tracking-wider">Nom d'utilisateur</label>
                                    <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-inner">
                                        <span className="text-orange-500 font-black">@</span>
                                        <input
                                            type="text"
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            placeholder="Pseudo"
                                            className="bg-transparent text-gray-900 font-bold text-sm focus:outline-none w-full"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] uppercase font-black text-gray-400 tracking-wider">Biographie</label>
                                    <textarea
                                        value={editBio}
                                        onChange={(e) => setEditBio(e.target.value)}
                                        placeholder="Un petit mot sur vous..."
                                        className="w-full bg-white border border-gray-200 rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-orange-100 resize-none h-20 shadow-inner"
                                    />
                                </div>
                                <div className="flex gap-2 pt-2">
                                    <button onClick={handleSaveProfile} className="flex-1 bg-orange-600 text-white py-3 rounded-xl font-black text-xs hover:bg-orange-700 shadow-md shadow-orange-200 transition-all">Enregistrer</button>
                                    <button onClick={() => setIsEditing(false)} className="px-6 bg-gray-200 text-gray-700 py-3 rounded-xl font-black text-xs hover:bg-gray-300 transition-all">Annuler</button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <h2 className="text-2xl font-black text-gray-900 tracking-tight leading-none group flex items-center gap-2">
                                        @{user.username}
                                        {userPosts.length > 5 && (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[8px] font-black bg-orange-100 text-orange-600 uppercase tracking-widest border border-orange-200">
                                                <i className="fa-solid fa-certificate mr-1"></i> Créateur
                                            </span>
                                        )}
                                    </h2>
                                </div>
                                {user.bio ? (
                                    <p className="text-xs text-gray-500 font-medium leading-relaxed italic max-w-md">
                                        {user.bio}
                                    </p>
                                ) : isOwnProfile && !isGuest && (
                                    <button onClick={() => setIsEditing(true)} className="text-[10px] text-gray-400 italic hover:text-orange-500 transition-colors uppercase tracking-widest font-bold">Ajouter une bio...</button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Follow/Login/Admin Buttons (Original Logic) */}
                    {!isEditing && (
                        <div className="flex gap-2 mb-4">
                            {!isOwnProfile && !isGuest && onToggleFollow && (
                                <button
                                    onClick={() => onToggleFollow(user.id)}
                                    className={`text-[11px] font-bold px-4 py-1.5 rounded-full border transition-all shadow-sm ${isFollowing
                                        ? 'bg-orange-50 text-orange-600 border-orange-200'
                                        : 'bg-gray-900 text-white border-gray-900'
                                        }`}
                                >
                                    {isFollowing ? 'Soutenu' : 'Soutenir'}
                                </button>
                            )}
                            {isGuest && (
                                <button
                                    onClick={onLoginRequest}
                                    className="bg-orange-600 text-white px-4 py-1.5 rounded-full text-[11px] font-bold shadow-sm hover:bg-orange-700 transition flex items-center gap-2"
                                >
                                    <i className="fa-solid fa-right-to-bracket"></i> Se connecter
                                </button>
                            )}
                            {isOwnProfile && user.email === 'logosigneed@gmail.com' && (
                                <button
                                    onClick={onAdmin}
                                    className="bg-gray-900 text-white px-4 py-1.5 rounded-full text-[11px] font-bold shadow-sm hover:bg-gray-800 transition flex items-center gap-2"
                                >
                                    <i className="fa-solid fa-lock"></i> Administration
                                </button>
                            )}
                        </div>
                    )}

                    {/* Statistics Row - Card Layout */}
                    {!isEditing && (
                        <div className="grid grid-cols-2 gap-3 mt-4">
                            <div className="bg-gray-50/50 rounded-2xl p-4 border border-gray-100 flex flex-col items-center hover:bg-white hover:shadow-lg hover:border-orange-100 transition-all duration-300 group">
                                <span className="text-2xl font-black text-gray-900 group-hover:text-orange-600 transition-colors uppercase tracking-tight">{userPosts.length}</span>
                                <span className="text-[10px] text-gray-400 uppercase tracking-[0.2em] font-black mt-1">Actifs</span>
                            </div>
                            <div 
                                onClick={isGuest ? onLoginRequest : onGoToRewards}
                                className="bg-orange-50/50 rounded-2xl p-4 border border-orange-100 flex flex-col items-center cursor-pointer hover:bg-orange-600 hover:shadow-lg shadow-orange-200 group transition-all duration-300"
                            >
                                <span className="text-2xl font-black text-orange-600 group-hover:text-white transition-colors">{user.credits || 0}</span>
                                <span className="text-[10px] text-orange-400 group-hover:text-white/80 uppercase tracking-[0.2em] font-black mt-1">Crédits</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* External Links Bar */}
            {!isEditing && user.websiteLink && (
                <div className="flex justify-center mb-6 -mt-3 animate-fade-in relative z-10">
                    <a
                        href={user.websiteLink.startsWith('http') ? user.websiteLink : `https://${user.websiteLink}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-orange-600 font-bold hover:underline flex items-center gap-1.5 bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-full border border-orange-100 shadow-sm"
                    >
                        <i className="fa-solid fa-link text-[10px]"></i>
                        {user.websiteLink.replace(/^https?:\/\//, '')}
                    </a>
                </div>
            )}



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
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-3">
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
                                            className="absolute top-2 right-2 w-6 h-6 bg-black/50 hover:bg-red-500 text-white rounded-full flex items-center justify-center transition-colors z-10"
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
                        <div className="grid grid-cols-3 gap-3">
                            {userPosts.map(post => (
                                <div
                                    key={post.id}
                                    onClick={() => setActiveOverlayPostId(activeOverlayPostId === post.id ? null : post.id)}
                                    className={`aspect-[3/4] bg-white rounded-xl overflow-hidden relative group cursor-pointer border transition-all shadow-sm ${activeOverlayPostId === post.id ? 'border-orange-500 ring-2 ring-orange-100' : 'border-gray-200 hover:border-orange-500'}`}
                                >
                                    <LazyImage
                                        src={getProxiedUrl(getOptimizedImageUrl(post.imageUrl, 400), { width: 400, quality: 80 })}
                                        className={`w-full h-full object-cover transition-transform duration-300 ${activeOverlayPostId === post.id ? 'scale-105 blur-[2px] brightness-50' : 'group-hover:scale-105'}`}
                                        alt="Post"
                                    />

                                    {/* Overlay Actions */}
                                    {activeOverlayPostId === post.id && (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 animate-fade-in z-20">
                                            {isOwnProfile && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); onPostClick(post); }}
                                                    className="bg-white text-gray-900 px-3 py-1.5 rounded-full font-bold text-[10px] shadow-lg hover:bg-orange-500 hover:text-white transition-all flex items-center gap-1 transform hover:scale-105"
                                                >
                                                    <i className="fa-solid fa-pen"></i> Éditer
                                                </button>
                                            )}

                                            <button
                                                onClick={(e) => { e.stopPropagation(); setSelectedPost(post); setActiveOverlayPostId(null); }}
                                                className="bg-white/20 backdrop-blur-md text-white border border-white/30 px-3 py-1.5 rounded-full font-bold text-[10px] hover:bg-white hover:text-gray-900 transition-all flex items-center gap-1"
                                            >
                                                <i className="fa-solid fa-eye"></i> Voir
                                            </button>

                                            {isOwnProfile && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); onDeletePost(post.id); }}
                                                    className="bg-red-500/80 text-white px-3 py-1.5 rounded-full text-[10px] hover:bg-red-600 transition-all font-bold"
                                                >
                                                    <i className="fa-solid fa-trash mr-1"></i> Supprimer
                                                </button>
                                            )}

                                            {isOwnProfile && onTogglePrivacy && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); onTogglePrivacy(post.id, !post.isPrivate); }}
                                                    className={`px-3 py-1.5 rounded-full font-bold text-[10px] shadow-lg transition-all flex items-center gap-1 transform hover:scale-105 ${post.isPrivate ? 'bg-orange-500 text-white' : 'bg-gray-800 text-white hover:bg-orange-500'}`}
                                                >
                                                    <i className={`fa-solid ${post.isPrivate ? 'fa-lock-open' : 'fa-lock'}`}></i>
                                                    {post.isPrivate ? 'Rendre Public' : 'Rendre Privé'}
                                                </button>
                                            )}
                                        </div>
                                    )}

                                    {!activeOverlayPostId && (
                                        <div className="absolute bottom-0 left-0 w-full p-2 bg-gradient-to-t from-black/80 to-transparent pointer-events-none">
                                            <div className="flex items-center gap-1 text-white text-[10px]">
                                                <i className="fa-solid fa-heart text-orange-500"></i>
                                                <span>{post.validations || 0}</span>
                                            </div>
                                            {post.isPrivate && (
                                                <div className="flex items-center gap-1 text-white text-[10px] bg-black/40 px-2 py-0.5 rounded-full backdrop-blur-sm mt-1">
                                                    <i className="fa-solid fa-lock text-[8px]"></i>
                                                    <span>Privé</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )
                )
            }

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
                            maxWidth: '600px',
                            maxHeight: '520px',
                            width: '90%',
                            height: 'auto',
                            margin: 'auto'
                        }}
                        className="relative bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row transition-all duration-300"
                    >
                        {/* Image Section - Light Background */}
                        <div className="relative w-full md:flex-1 bg-gray-50 flex items-center justify-center overflow-hidden p-4 md:p-6 md:min-h-0">
                            <img
                                src={selectedPost.imageUrl}
                                className="w-full h-full object-contain drop-shadow-lg"
                                style={{ maxHeight: '460px' }}
                                alt="Post Preview"
                            />
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
                            </div>

                            <div className="mt-2 md:mt-auto">
                                <button
                                    onClick={() => {
                                        onPostClick(selectedPost);
                                        setSelectedPost(null);
                                    }}
                                    className="w-full py-2.5 bg-gray-900 hover:bg-black text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 group text-xs text-nowrap"
                                >
                                    <i className="fa-solid fa-wand-magic-sparkles text-orange-500 group-hover:rotate-12 transition-transform"></i>
                                    <span>Remixer ce design</span>
                                </button>

                                {isOwnProfile && onTogglePrivacy && (
                                    <div className="mt-4 p-4 bg-gray-50 rounded-2xl border border-gray-100 animate-fade-in">
                                        <div className="flex items-center justify-between mb-1">
                                            <div className="flex flex-col">
                                                <span className="text-[9px] uppercase font-black text-gray-400 tracking-wider mb-0.5">Visibilité</span>
                                                <span className={`text-xs font-black transition-colors flex items-center gap-1.5 ${selectedPost.isPrivate ? 'text-orange-600' : 'text-gray-900'}`}>
                                                    {selectedPost.isPrivate ? (
                                                        <><i className="fa-solid fa-lock text-[10px]"></i> PRIVÉ</>
                                                    ) : (
                                                        <><i className="fa-solid fa-globe text-[10px]"></i> PUBLIC</>
                                                    )}
                                                </span>
                                            </div>
                                            
                                            <div
                                                onClick={async (e) => { 
                                                    e.stopPropagation(); 
                                                    const newVal = !selectedPost.isPrivate;
                                                    // Instant feedback: Update local selectedPost state immediately
                                                    setSelectedPost(prev => prev ? { ...prev, isPrivate: newVal } : null);
                                                    await onTogglePrivacy(selectedPost.id, newVal); 
                                                }}
                                                className={`relative w-11 h-6 rounded-full cursor-pointer transition-all duration-300 ${!selectedPost.isPrivate ? 'bg-orange-600' : 'bg-gray-300'}`}
                                            >
                                                <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-md transition-all duration-300 transform flex items-center justify-center ${!selectedPost.isPrivate ? 'translate-x-5' : 'translate-x-0'}`}>
                                                    <i className={`fa-solid ${!selectedPost.isPrivate ? 'fa-globe text-orange-600' : 'fa-lock text-gray-400'} text-[8px]`}></i>
                                                </div>
                                            </div>

                                        </div>
                                        <p className="text-[9px] text-gray-400 opacity-80 mt-1">
                                            {selectedPost.isPrivate 
                                                ? "Masqué de la galerie." 
                                                : "Visible par tous."}
                                        </p>

                                        <button
                                            onClick={(e) => { e.stopPropagation(); onDeletePost(selectedPost.id); }}
                                            className="w-full py-2 mt-3 text-[10px] font-bold text-red-500 bg-red-50 hover:bg-red-100 rounded-xl transition-colors border border-red-100 flex items-center justify-center gap-2"
                                        >
                                            <i className="fa-solid fa-trash-can"></i>
                                            Supprimer
                                        </button>
                                    </div>
                                )}
                                
                                <p className="text-center text-[9px] text-gray-400 mt-2">
                                    Créez votre version unique
                                </p>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};
