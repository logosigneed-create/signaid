import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { User, Post } from '../types';
import { authService } from '../services/authService';
import { postService } from '../services/postService';
import { designSharingService } from '../services/designSharingService';
import { resizeImage, getProxiedUrl } from '../utils/helpers';
import { getOptimizedImageUrl } from '../utils/imageUtils';
import { LazyImage } from './LazyImage';
import { Link } from 'react-router-dom';
import { productDatabase } from '../constants';
import { downloadTechnicalPackage } from '../utils/technicalExport';

// --- SUB-COMPONENT: PostPreviewModal ---
// Extracted to be outside of ProfileView to respect hooks rules and improve performance.
const PostPreviewModal: React.FC<{
    post: Post;
    user: User;
    isOwnProfile: boolean;
    onClose: () => void;
    onPostClick: (post: Post) => void;
    onTogglePrivacy?: (postId: string, isPrivate: boolean) => void;
    onDeletePost: (postId: string) => void;
}> = ({ post, user, isOwnProfile, onClose, onPostClick, onTogglePrivacy, onDeletePost }) => {
    const [viewMode, setViewMode] = useState<'front' | 'back'>(post.customization?.previewImageUrlFront ? 'front' : (post.customization?.previewImageUrlBack ? 'back' : 'front'));
    
    // Administration States (Moved inside modal as they are specific to this view)
    const [exportFront, setExportFront] = useState(true);
    const [exportBack, setExportBack] = useState(true);
    const [exportMode, setExportMode] = useState<'quick' | 'manual'>('quick');
    const [selectedElements, setSelectedElements] = useState<string[]>([]);
    const [exportSize, setExportSize] = useState('L');

    const hasFront = !!post.customization?.previewImageUrlFront || !!post.imageUrl;
    const hasBack = !!post.customization?.previewImageUrlBack;
    const currentImg = viewMode === 'front' ? (post.customization?.previewImageUrlFront || post.imageUrl) : (post.customization?.previewImageUrlBack || post.imageUrl);

    const handleDownloadAdminPackage = async (p: Post) => {
        if (!p.customization) {
            alert("Ce projet n'a pas de données de personnalisation éditables.");
            return;
        }
        await downloadTechnicalPackage(p.customization, productDatabase, {
            front: exportFront,
            back: exportBack,
            size: exportSize,
            elements: exportMode === 'manual' ? selectedElements : undefined
        });
    };

    return createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in p-4" onClick={onClose}>
            <button
                onClick={(e) => { e.stopPropagation(); onClose(); }}
                className="fixed top-6 right-6 z-[100000] w-12 h-12 bg-white/40 hover:bg-white/60 backdrop-blur-md rounded-full text-gray-800 flex items-center justify-center transition-all border border-white/20 shadow-xl"
            >
                <i className="fa-solid fa-xmark text-xl"></i>
            </button>

            <div
                onClick={(e) => e.stopPropagation()}
                style={{ maxWidth: '600px', maxHeight: '520px', width: '90%', height: 'auto', margin: 'auto' }}
                className="relative bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row transition-all duration-300"
            >
                {/* Image Section */}
                <div className="relative w-full md:flex-1 bg-gray-50 flex items-center justify-center overflow-hidden p-4 md:p-6 md:min-h-0 min-h-[300px]">
                    <img
                        src={currentImg}
                        className="w-full h-full object-contain drop-shadow-2xl animate-fade-in"
                        style={{ maxHeight: '460px' }}
                        key={viewMode}
                        alt="Post Preview"
                    />

                    {hasFront && hasBack && (
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 bg-white/50 backdrop-blur-md p-1 rounded-full border border-white/30 shadow-lg z-30">
                            <button
                                onClick={() => setViewMode('front')}
                                className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${viewMode === 'front' ? 'bg-orange-600 text-white shadow-md' : 'text-gray-600 hover:bg-white/50'}`}
                            >
                                Devant
                            </button>
                            <button
                                onClick={() => setViewMode('back')}
                                className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${viewMode === 'back' ? 'bg-orange-600 text-white shadow-md' : 'text-gray-600 hover:bg-white/50'}`}
                            >
                                Dos
                            </button>
                        </div>
                    )}
                </div>

                {/* Sidebar */}
                <div className="w-full md:w-[220px] bg-white flex flex-col justify-between p-5 shrink-0 border-t md:border-t-0 md:border-l border-gray-100">
                    <div className="overflow-y-auto custom-scrollbar pr-1">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-8 h-8 rounded-full bg-gray-100 overflow-hidden border border-gray-200">
                                <img src={post.user?.avatarUrl || "https://ui-avatars.com/api/?name=" + (post.user?.username || "User")} className="w-full h-full object-cover" alt="Avatar" />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900 text-xs">@{post.user?.username || 'Membre'}</h3>
                                <p className="text-[10px] text-gray-400">Créateur</p>
                            </div>
                        </div>

                        {post.stylePrompt && (
                            <div className="mb-4 p-3 bg-gray-50 rounded-xl border border-gray-100">
                                <p className="text-[9px] uppercase font-bold text-gray-400 mb-1 tracking-wider">Style</p>
                                <p className="text-xs font-medium text-gray-800 italic line-clamp-3">"{post.stylePrompt}"</p>
                            </div>
                        )}

                        {isOwnProfile && user.email === 'logosigneed@gmail.com' && (
                            <div className="mb-4 bg-orange-50 p-4 rounded-2xl border border-orange-100">
                                <p className="text-[9px] uppercase font-black text-orange-400 tracking-wider mb-2">Administration</p>

                                <div className="flex bg-orange-100/50 p-1 rounded-xl mb-3">
                                    <button
                                        onClick={() => setExportMode('quick')}
                                        className={`flex-1 py-1 px-2 text-[9px] font-black rounded-lg transition-all ${exportMode === 'quick' ? 'bg-orange-600 text-white shadow-sm' : 'text-orange-600'}`}
                                    >
                                        RAPIDE
                                    </button>
                                    <button
                                        onClick={() => {
                                            setExportMode('manual');
                                            const els = [];
                                            if (post.customization?.originalLogoUrlFront) els.push('LOGO_F1');
                                            if (post.customization?.logoFront2?.originalUrl) els.push('LOGO_F2');
                                            if (post.customization?.logoFront3?.originalUrl) els.push('LOGO_F3');
                                            if (post.customization?.originalLogoUrlBack) els.push('LOGO_B1');
                                            if (post.customization?.logoBack2?.originalUrl) els.push('LOGO_B2');
                                            if (post.customization?.logoBack3?.originalUrl) els.push('LOGO_B3');
                                            if (post.customization?.textFront?.text) els.push('TEXT_F1');
                                            if (post.customization?.textFront2?.text) els.push('TEXT_F2');
                                            if (post.customization?.textBack?.text) els.push('TEXT_B1');
                                            if (post.customization?.textBack2?.text) els.push('TEXT_B2');
                                            setSelectedElements(els);
                                        }}
                                        className={`flex-1 py-1 px-2 text-[9px] font-black rounded-lg transition-all ${exportMode === 'manual' ? 'bg-orange-600 text-white shadow-sm' : 'text-orange-600'}`}
                                    >
                                        MANUEL
                                    </button>
                                </div>

                                {exportMode === 'quick' ? (
                                    <div className="grid grid-cols-2 gap-2 mb-3">
                                        <div onClick={() => setExportFront(!exportFront)} className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all border ${exportFront ? 'bg-white border-orange-200 shadow-sm' : 'bg-transparent border-transparent opacity-50'}`}>
                                            <i className={`fa-solid ${exportFront ? 'fa-square-check text-orange-600' : 'fa-square text-gray-300'}`}></i>
                                            <span className="text-[10px] font-bold">Face</span>
                                        </div>
                                        <div onClick={() => setExportBack(!exportBack)} className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all border ${exportBack ? 'bg-white border-orange-200 shadow-sm' : 'bg-transparent border-transparent opacity-50'}`}>
                                            <i className={`fa-solid ${exportBack ? 'fa-square-check text-orange-600' : 'fa-square text-gray-300'}`}></i>
                                            <span className="text-[10px] font-bold">Dos</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="mb-3 max-h-[120px] overflow-y-auto pr-1 custom-scrollbar space-y-1 bg-white/50 p-2 rounded-xl border border-orange-100">
                                        {[
                                            { id: 'LOGO_F1', label: 'Logo 1 Devant' },
                                            { id: 'LOGO_F2', label: 'Logo 2 Devant' },
                                            { id: 'LOGO_F3', label: 'Logo 3 Devant' },
                                            { id: 'LOGO_B1', label: 'Logo 1 Dos' },
                                            { id: 'LOGO_B2', label: 'Logo 2 Dos' },
                                            { id: 'LOGO_B3', label: 'Logo 3 Dos' },
                                            { id: 'TEXT_F1', label: 'Texte 1 Face' },
                                            { id: 'TEXT_F2', label: 'Texte 2 Face' },
                                            { id: 'TEXT_B1', label: 'Texte 1 Dos' },
                                            { id: 'TEXT_B2', label: 'Texte 2 Dos' }
                                        ].map(el => {
                                            const isActive = (id: string) => {
                                                if (id === 'LOGO_F1') return !!post.customization?.originalLogoUrlFront;
                                                if (id === 'LOGO_F2') return !!post.customization?.logoFront2?.originalUrl;
                                                if (id === 'LOGO_F3') return !!post.customization?.logoFront3?.originalUrl;
                                                if (id === 'LOGO_B1') return !!post.customization?.originalLogoUrlBack;
                                                if (id === 'LOGO_B2') return !!post.customization?.logoBack2?.originalUrl;
                                                if (id === 'LOGO_B3') return !!post.customization?.logoBack3?.originalUrl;
                                                if (id === 'TEXT_F1') return !!post.customization?.textFront?.text;
                                                if (id === 'TEXT_F2') return !!post.customization?.textFront2?.text;
                                                if (id === 'TEXT_B1') return !!post.customization?.textBack?.text;
                                                if (id === 'TEXT_B2') return !!post.customization?.textBack2?.text;
                                                return false;
                                            };
                                            if (!isActive(el.id)) return null;
                                            return (
                                                <div key={el.id} onClick={() => setSelectedElements(prev => prev.includes(el.id) ? prev.filter(i => i !== el.id) : [...prev, el.id])} className="flex items-center justify-between p-1.5 hover:bg-orange-50 rounded-lg cursor-pointer transition-colors">
                                                    <span className="text-[10px] font-bold text-gray-700">{el.label}</span>
                                                    <i className={`fa-solid ${selectedElements.includes(el.id) ? 'fa-check-circle text-orange-600' : 'fa-circle text-gray-200'} text-xs`}></i>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                <div className="mb-3">
                                    <label className="text-[8px] uppercase font-bold text-orange-400 block mb-1 ml-1">Taille Référence</label>
                                    <select value={exportSize} onChange={(e) => setExportSize(e.target.value)} className="w-full bg-white border border-orange-100 rounded-lg py-1 px-2 text-[10px] font-bold focus:outline-none shadow-sm">
                                        {['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL'].map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>

                                <button onClick={() => handleDownloadAdminPackage(post)} className="w-full py-2 bg-orange-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-orange-700 active:scale-95 transition-all shadow-md">
                                    <i className="fa-solid fa-file-export mr-2"></i> Télécharger Pack
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col gap-2">
                        <button
                            onClick={() => onPostClick(post)}
                            className="w-full py-3 bg-gray-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black active:scale-95 transition-all shadow-xl"
                        >
                            Modifier
                        </button>
                        {isOwnProfile && (
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl border border-gray-100">
                                <div className="flex flex-col">
                                    <span className="text-[9px] uppercase font-black text-gray-400 tracking-wider">Visibilité</span>
                                    <span className={`text-[10px] font-black uppercase ${post.isPrivate ? 'text-orange-600' : 'text-gray-900'}`}>{post.isPrivate ? 'Privé' : 'Public'}</span>
                                </div>
                                <div onClick={() => onTogglePrivacy?.(post.id, !post.isPrivate)} className={`relative w-10 h-5 rounded-full cursor-pointer transition-all duration-300 ${!post.isPrivate ? 'bg-orange-600' : 'bg-gray-300'}`}>
                                    <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-md transition-all duration-300 transform ${!post.isPrivate ? 'translate-x-5' : 'translate-x-0'}`}></div>
                                </div>
                            </div>
                        )}
                        {isOwnProfile && (
                            <button onClick={() => { if(confirm("Supprimer ce design ?")) onDeletePost(post.id); onClose(); }} className="w-full py-2 text-[9px] font-bold text-red-500 bg-red-50 hover:bg-red-100 rounded-xl transition-colors">
                                <i className="fa-solid fa-trash-can mr-2"></i> Supprimer
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export const ProfileView: React.FC<{
    user: User,
    posts: Post[],
    onUpdateUser: (updatedUser: Partial<User>) => void | Promise<void>,
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
    onToggleFollow?: (userId: string) => void;
    isFollowing?: boolean;
    isGuest?: boolean;
    onLoginRequest?: () => void;
}> = ({ user, posts, onUpdateUser, onPostClick, onBack, onLogout, onAdmin, onProductClick, onRemoveValidation, onDeletePost, onGoToRewards, onTogglePrivacy, isOwnProfile, isFollowing, onToggleFollow, isGuest, onLoginRequest }) => {

    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState(user.username);
    const [editBio, setEditBio] = useState(user.bio || '');
    const [editLink, setEditLink] = useState(user.websiteLink || '');
    const [activeTab, setActiveTab] = useState<'creations' | 'support' | 'quotes'>('creations');
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

    const [fetchedPosts, setFetchedPosts] = useState<Post[]>([]);
    const [fetchedShared, setFetchedShared] = useState<any[]>([]);
    const [fetchedQuotes, setFetchedQuotes] = useState<any[]>([]);
    const [isFetchingPosts, setIsFetchingPosts] = useState(false);


    useEffect(() => {
        const fetchAllUserContent = async () => {
            if (!user.id) return;
            setIsFetchingPosts(true);
            try {
                const [pResults, sResults] = await Promise.all([
                    postService.getUserPosts(user.id, user.username),
                    designSharingService.getUserSharedDesigns(user.id)
                ]);
                setFetchedPosts(pResults);
                setFetchedShared(sResults);

                // Fetch Quotes
                const { collection, query, where, getDocs, orderBy } = await import('firebase/firestore');
                const { db } = await import('../firebaseConfig');
                let qList: any[] = [];
                try {
                    const qQuotes = query(collection(db, 'quotes'), where("userId", "==", user.id), orderBy('createdAt', 'desc'));
                    const qSnap = await getDocs(qQuotes);
                    qSnap.forEach(d => qList.push({ ...d.data(), id: d.id }));
                } catch (e) {
                    console.warn("Quotes index missing, falling back to unordered:", e);
                    const qFallback = query(collection(db, 'quotes'), where("userId", "==", user.id));
                    const qSnapFallback = await getDocs(qFallback);
                    qSnapFallback.forEach(d => qList.push({ ...d.data(), id: d.id }));
                    qList.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
                }
                setFetchedQuotes(qList);

            } catch (err) {
                console.error("Error loading profile content:", err);
            } finally {
                setIsFetchingPosts(false);
            }
        };
        fetchAllUserContent();
    }, [user.id, user.username]);

    const sortedAllUserPosts = React.useMemo(() => {
        // Merge prop posts with fetched posts to ensure real-time updates for newly created items
        // while also showing older/private items fetched from the service.
        // Start with a clone of fetchedPosts
        let combinedMap = new Map<string, Post>();
        fetchedPosts.forEach(p => combinedMap.set(p.id, p));

        // Overwrite or Add items from the posts PROP (most up-to-date local state)
        posts.forEach(p => {
            const postUserId = p.user?.id || (p as any).userId;
            const postUsername = p.user?.username;
            
            const isMatch = (postUserId && postUserId === user.id) || 
                             (postUsername && (postUsername.toLowerCase() === user.username.toLowerCase() || 
                                              postUsername.toLowerCase() === ('@' + user.username).toLowerCase() || 
                                              ('@' + postUsername).toLowerCase() === user.username.toLowerCase()));

            if (isMatch) {
                combinedMap.set(p.id, p);
            }
        });

        return Array.from(combinedMap.values())
            .sort((a, b) => {
                const timeA = getTime(a.createdAt);
                const timeB = getTime(b.createdAt);
                const diff = timeB - timeA;
                if (diff === 0) {
                    return (b.id || "").localeCompare(a.id || "");
                }
                return diff;
            });
    }, [fetchedPosts, posts, user.id, user.username]);



    const visibleUserPosts = React.useMemo(() => {
        return sortedAllUserPosts.filter(p => {
            // NEVER show archived posts in the main grid
            if (p.archived) return false;
            if (isOwnProfile) return true; // Show private items only to the owner
            return !p.isPrivate; // Show only active public posts to others
        });
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
                    onClick={() => setActiveTab('quotes')}
                    className={`flex-1 pb-3 font-bold text-sm ${activeTab === 'quotes' ? 'text-orange-600 border-b-2 border-orange-600' : 'text-gray-400'}`}
                >
                    <i className="fa-solid fa-file-invoice mr-2"></i> Mes Devis
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
                                     <LazyImage
                                        src={post.customization?.previewImageUrlFront || post.imageUrl}
                                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                        alt="Post"
                                    />
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
                activeTab === 'quotes' && (
                    fetchedQuotes.length === 0 ? (
                        <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200 border-dashed">
                            <p className="text-gray-500 mb-2">Vous n'avez aucun devis en cours.</p>
                            <p className="text-[10px] text-gray-400">Configurez un produit et cliquez sur "Demander un devis" !</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4">
                            {fetchedQuotes.map((quote) => (
                                <div key={quote.id} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-orange-50/50 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-110"></div>
                                    <div className="relative z-10">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h4 className="font-black text-gray-900 uppercase tracking-tight text-sm">Devis #{quote.id.slice(-6)}</h4>
                                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                                                    {quote.createdAt?.toDate ? quote.createdAt.toDate().toLocaleDateString() : 'Date inconnue'}
                                                </p>
                                            </div>
                                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                                quote.status === 'validated' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'
                                            }`}>
                                                {quote.status === 'validated' ? 'Validé' : 'En attente'}
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {quote.cart?.map((item: any, idx: number) => (
                                                <div key={idx} className="flex flex-col gap-1 items-center bg-gray-50 p-2 rounded-xl border border-gray-100">
                                                    {item.previewImageUrl ? (
                                                        <img src={item.previewImageUrl} className="w-12 h-12 object-contain" alt="Produit" />
                                                    ) : (
                                                        <div className="w-12 h-12 flex items-center justify-center bg-gray-200 rounded-lg">
                                                            <i className="fa-solid fa-shirt text-gray-400 text-xl"></i>
                                                        </div>
                                                    )}
                                                    <span className="text-[8px] font-black uppercase text-gray-500">{item.productType}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )
                )
            }

            {
                activeTab === 'creations' && (
                    (userPosts.length === 0 && fetchedShared.length === 0) ? (
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
                                        src={getProxiedUrl(getOptimizedImageUrl(post.customization?.previewImageUrlFront || post.imageUrl, 400), { width: 400, quality: 80 })}
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
                                            {post.isPrivate && !post.archived && (
                                                <div className="flex items-center gap-1 text-white text-[10px] bg-black/40 px-2 py-0.5 rounded-full backdrop-blur-sm mt-1">
                                                    <i className="fa-solid fa-lock text-[8px]"></i>
                                                    <span>Privé</span>
                                                </div>
                                            )}
                                            {post.archived && (
                                                <div className="flex items-center gap-1 text-white text-[10px] bg-red-600/80 px-2 py-0.5 rounded-full backdrop-blur-sm mt-1">
                                                    <i className="fa-solid fa-trash-can text-[8px]"></i>
                                                    <span>Archivé</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}

                            {/* [NEW] Render Shared Designs that are not Posts */}
                            {fetchedShared.map(shared => {
                                // Skip if already represented in userPosts
                                if (userPosts.some(up => up.id === shared.id)) return null;

                                return (
                                    <div
                                        key={shared.id}
                                        onClick={() => onPostClick({ ...shared, imageUrl: shared.previewImageUrl || '' } as any)}
                                        className="aspect-[3/4] bg-gray-50 rounded-xl overflow-hidden relative group cursor-pointer border border-gray-100 hover:border-orange-500 transition-all shadow-sm flex flex-col items-center justify-center p-4"
                                    >
                                        {shared.previewImageUrl ? (
                                            <img src={shared.previewImageUrl} className="w-full h-full object-cover opacity-60 group-hover:opacity-100" />
                                        ) : (
                                            <>
                                                <i className="fa-solid fa-link text-3xl text-gray-300 mb-2"></i>
                                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest text-center">Design Partagé</span>
                                            </>
                                        )}
                                        <div className="absolute top-2 right-2 bg-blue-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full">Lien</div>
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <span className="bg-white text-gray-900 px-3 py-1.5 rounded-full font-bold text-[10px] shadow-lg">Éditer</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )
                )
            }

            {/* FULL SCREEN POST MODAL */}
            {selectedPost && (
                <PostPreviewModal 
                    post={selectedPost} 
                    user={user}
                    isOwnProfile={isOwnProfile}
                    onClose={() => setSelectedPost(null)}
                    onPostClick={onPostClick}
                    onTogglePrivacy={onTogglePrivacy}
                    onDeletePost={onDeletePost}
                />
            )}

        </div>
    );
};
