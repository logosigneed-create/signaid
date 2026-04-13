import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

import {
    getProxiedUrl,
    resizeImage,
    tintImage,
    removeBackground,
    getCroppedImg,
    urlToBase64,
    addWatermark,
    hexToRgb,
    dataURLtoBlob,
    cleanCartItem
} from '../utils/helpers';
import { getOptimizedImageUrl } from '../utils/imageUtils';

import {
    productDatabase,
    SPECIAL_CODES,
    PREDEFINED_LOGOS,
    PLACEMENT_PRESETS,
    STYLE_MATRIX,
    POSE_IMAGES
} from '../constants';

import {
    CartItem,
    User,
    PredefinedLogo,
    StyleCategory,
    PricingRules
} from '../types';


import { DraggableElement } from '../components/DraggableElement';
import { TextRenderer } from '../components/TextRenderer';
import { PongGame } from '../components/PongGame';
import { geminiService } from '../services/geminiService';
import { db } from '../firebaseConfig';
import { collection, addDoc, serverTimestamp, doc, updateDoc, increment } from 'firebase/firestore';
import { postService } from '../services/postService';
import { uploadImageBlob } from '../services/storageService';

// @ts-ignore
// html2canvas dynamic import
// @ts-ignore
// import html2canvas from 'html2canvas';

// Lazy load GuestLimitModal to avoid circular dependencies if any, or just import
import { GuestLimitModal } from '../components/GuestLimitModal';
import { SignPongRewardModal } from '../components/SignPongRewardModal';
import { logAnalyticsEvent, AnalyticsEvents } from '../services/analyticsService';

// Polyfill for crypto.randomUUID() for Safari/iOS compatibility
const generateUUID = (): string => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    // Fallback for browsers that don't support crypto.randomUUID()
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

// --- HELPER: Process Logo Color for AI (Canvas Baking) ---
const processLogoColor = async (url: string, color: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) return reject('No ctx');

            // 1. Draw original
            ctx.drawImage(img, 0, 0);

            // 2. Apply Color if not original
            if (color !== 'original' && color !== 'transparent') {
                // Use a temporary canvas to generate the color mask
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = canvas.width;
                tempCanvas.height = canvas.height;
                const tctx = tempCanvas.getContext('2d');
                if (tctx) {
                    // Fill with target color
                    tctx.fillStyle = color === 'black' ? '#000000' :
                        color === 'white' ? '#FFFFFF' :
                            color === 'red' ? '#EF4444' :
                                color === 'blue' ? '#3B82F6' : color;
                    tctx.fillRect(0, 0, canvas.width, canvas.height);

                    // Destination-in: keeps source only where destination intersects
                    tctx.globalCompositeOperation = 'destination-in';
                    tctx.drawImage(img, 0, 0);

                    // Clear main canvas and draw tinted result
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(tempCanvas, 0, 0);
                }
            }

            resolve(canvas.toDataURL());
        };
        img.onerror = (err) => reject(err);
        img.src = url;
    });
};

export
    function CustomizerView({ initialProductType, initialState, isRemixMode, onAddToCart, onAddToCartBatch, onBack, onPublish, onAddToWishlist, userCredits, onDeductCredits, isGuest, onAuthRequired, user, onUpdateUser, initialAiPromo, initialAiModalOpen, productDimensions, initialStyleCategory, initialStylePrompt, setIsQuoteModalOpen, onGoToRewards, setIsMenuVisible, pricingRules, initialColor, initialTemplate, remixPostId, aiGenerating, aiResult, onGenerateAi, setAiResult, cartCount, onGoToCart }: {
        initialProductType: string,
        initialState?: CartItem,
        isRemixMode?: boolean,
        onAddToCart: (item: CartItem) => void,
        onAddToCartBatch: (items: CartItem[]) => void,
        onBack: () => void,
        onPublish: (image: string, caption: string, productType: string, customization: CartItem, styleCategory?: string, stylePrompt?: string) => void,
        onAddToWishlist: (productId: string, color: string) => void,
        userCredits: number,
        onDeductCredits: (amount: number) => boolean,
        isGuest: boolean,
        onAuthRequired: () => void,
        user: User | null,
        onUpdateUser: (u: Partial<User>) => void,
        setIsQuoteModalOpen?: (v: boolean) => void;
        initialAiPromo?: boolean;
        productDimensions?: Record<string, Record<string, number>>;
        initialStyleCategory?: string;
        initialStylePrompt?: string;
        onGoToRewards: () => void;
        setIsMenuVisible?: (visible: boolean) => void;
        pricingRules?: PricingRules;
        initialColor?: string;
        initialTemplate?: string;
        remixPostId?: string | null;
        initialAiModalOpen?: boolean;
        aiGenerating?: boolean;
        aiResult?: string | null;
        onGenerateAi?: (params: any) => Promise<void>;
        setAiResult?: (val: string | null) => void;
        cartCount?: number;
        onGoToCart?: () => void;
    }) {

    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isAiViewVisible, setIsAiViewVisible] = useState(false); // New state for AI View Toggle
    const [showPongSignupModal, setShowPongSignupModal] = useState(false); // Game Over Signup Overlay
    const [showAllSizes, setShowAllSizes] = useState(false);
    const [showSizeError, setShowSizeError] = useState(false);


    const [cameraTimerDelay, setCameraTimerDelay] = useState<number>(3); // 0, 3, 10
    const [shakeSizes, setShakeSizes] = useState(false);
    const [isRemovingBackground, setIsRemovingBackground] = useState(false);
    const [selectedStyleName, setSelectedStyleName] = useState<string>('');

    // MAGIC LINK EFFECTS
    useEffect(() => {
        if (initialColor) {
            // Wait for product load or state init if needed, but setState usually works
            // Access internal state setter if available or via prop effect ???
            // The state is internal: const [selectedColor, setSelectedColor] = useState(...)
            // I need to find where selectedColor is defined.
        }
    }, [initialColor]);



    useEffect(() => {
        if (initialAiPromo || initialAiModalOpen) {
            // Delay slightly to allow render
            setTimeout(() => {
                setAiModalOpen(true);
            }, 500);
        }
    }, [initialAiPromo, initialAiModalOpen]);

    const getDefaultText = () => ({
        lines: [''], text: '', fontSize: 24, fontFamily: 'Inter', fontWeight: '700',
        textTransform: 'none' as any, color: '#000000', position: { x: 50, y: 50 }, letterSpacing: 0,
        curve: 0, lineHeight: 1.2, shadow: false, outline: false, curveStyle: 'flat' as const
    });

    const defaultState: CartItem = {
        id: generateUUID(),
        productType: initialProductType,
        color: initialColor || '#000000', // USE MAGIC COLOR
        sizes: {},
        logoSizeFront: 100, logoPositionXFront: 50, logoPositionYFront: 30,
        originalLogoUrlFront: null, processedLogoUrlFront_original: null,
        textFront: getDefaultText(),
        logoSizeBack: 100, logoPositionXBack: 50, logoPositionYBack: 30,
        originalLogoUrlBack: null, processedLogoUrlBack_original: null,
        textBack: getDefaultText(),
        textFront2: getDefaultText(),
        textBack2: getDefaultText(),
        activeLogoColorFront: 'original', backgroundRemovedFront: false, logoInvertedFront: false as boolean,
        activeLogoColorBack: 'original', backgroundRemovedBack: false, logoInvertedBack: false as boolean,
        processedLogoUrlFront_white: null, processedLogoUrlFront_black: null, processedLogoUrlFront_noBackground: null,
        processedLogoUrlBack_white: null, processedLogoUrlBack_black: null, processedLogoUrlBack_noBackground: null,
        isPredefinedLogoFront: false, predefinedLogoUrlFront: null,
        isPredefinedLogoBack: false, predefinedLogoUrlBack: null,
        serviceRetouche: false, serviceModernisation: false
    };


    // --- PERSISTENCE LOGIC START ---
    const STORAGE_KEY = 'stylelink_draft_project';
    const getSavedState = (): CartItem | null => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            return saved ? JSON.parse(saved) : null;
        } catch (e) {
            console.error("Failed to load saved state", e);
            return null;
        }
    };

    const [item, setItem] = useState<CartItem>(() => {
        if (initialState) return { ...initialState, id: generateUUID() };
        // If magic link props are present, prioritize them over saved state OR merge them
        const saved = getSavedState();
        if (saved && !initialColor && !initialTemplate) return saved; // Only load saved if NOT a magic link
        return defaultState; // Use default state (with magic props) if magic link is active
    });

    // --- EFFECT: Clear AI result if color changes to avoid wrong-color AI images ---
    const lastColorRef = useRef(item.color);
    useEffect(() => {
        if (item.color !== lastColorRef.current) {
            if (aiResult && setAiResult) {
                setAiResult(null);
            }
            lastColorRef.current = item.color;
        }
    }, [item.color, aiResult, setAiResult]);

    // EFFECT: Apply Magic Template
    useEffect(() => {
        if (initialTemplate) {
            // Simulate adding a logo
            const loadMagicTemplate = async () => {
                try {
                    // We treat it as a predefined logo or uploaded image
                    // Let's set it as front logo
                    setItem(prev => ({
                        ...prev,
                        originalLogoUrlFront: initialTemplate,
                        processedLogoUrlFront_original: initialTemplate,
                        activeLogoColorFront: 'original',
                        logoSizeFront: 120 // slightly larger default
                    }));
                } catch (e) {
                    console.error("Failed to load magic template", e);
                }
            };
            loadMagicTemplate();
        }
    }, [initialTemplate]);

    // EFFECT: Update color if prop changes late
    useEffect(() => {
        if (initialColor && item.color !== initialColor) {
            setItem(prev => ({ ...prev, color: initialColor }));
        }
    }, [initialColor]);

    // Save to local storage on change

    // Save to local storage on change
    // Save to local storage on change
    useEffect(() => {
        if (!initialState) { // Only auto-save if working on a new/draft project
            try {
                // Prepare clean version for LS to prevent quota crash
                // We use cleanCartItem which recursively removes all base64 images
                const clean = cleanCartItem(item);
                localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
            } catch (e) {
                console.warn("Draft save quota warning", e);
            }
        }
    }, [item, initialState]);

    // SYNC URL WITH PRODUCT STATE
    useEffect(() => {
        if (!initialProductType) return; // Don't run on very first mount if not ready

        const cleanColor = (item.color || 'black').replace('#', '');
        const currentParams = new URLSearchParams(window.location.search);

        // Update product param
        currentParams.set('product', `${item.productType}_${cleanColor}`);

        // SYNC POST ID (Remix Mode)
        // Harden: Read from URL if prop is missing during initial load/async state
        const urlPostId = new URLSearchParams(window.location.search).get('post');
        const effectiveRemixId = remixPostId || urlPostId;

        if (effectiveRemixId) {
            currentParams.set('post', effectiveRemixId);
        } else if (isRemixMode === false) {
            // Only delete if we are explicitly NOT in remix mode
            currentParams.delete('post');
        }

        // Preserve other params (promo, template if still valid?) 
        // Logic: Replace current URL without reload
        const newUrl = `${window.location.pathname}?${currentParams.toString()}`;
        window.history.replaceState({ ...window.history.state }, '', newUrl);

    }, [item.productType, item.color, remixPostId]);

    // --- PERSISTENCE LOGIC END ---

    const [isBack, setIsBack] = useState(initialState?.previewImageUrlBack ? true : false);
    const [activeView, setActiveView] = useState<'front' | 'back' | 'model'>(initialState?.aiImageUrl ? 'model' : (initialState?.previewImageUrlBack ? 'back' : 'front'));
    const [cameraModalOpen, setCameraModalOpen] = useState(false);
    const [activeEl, setActiveEl] = useState<string | null>(null);
    const [aiModalOpen, setAiModalOpen] = useState(initialAiModalOpen || !!initialState?.aiImageUrl);
    const [isDesktopSizeOpen, setIsDesktopSizeOpen] = useState(false); // Desktop Size Dropdown State
    const [showSizeGuide, setShowSizeGuide] = useState(false);

    // --- IP & ADMIN BYPASS ---
    const [userIp, setUserIp] = useState('');
    const ADMIN_IPS = [
        '178.51.238.204',
        'localhost',
        '127.0.0.1'
    ];
    useEffect(() => {
        fetch('https://api.ipify.org?format=json')
            .then(res => res.json())
            .then(data => {
                console.log("Detected IP for Credit Check:", data.ip);
                setUserIp(data.ip);
            })
            .catch(e => console.warn("Failed IP detect", e));
    }, []);

    // Lock Body Scroll when AI Modal is open
    useEffect(() => {
        if (aiModalOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [aiModalOpen]);

    useEffect(() => {
        if (setIsMenuVisible) {
            setIsMenuVisible(!aiModalOpen);
        }
    }, [aiModalOpen, setIsMenuVisible]);
    const [lastUserImage, setLastUserImage] = useState<string | null>(null);
    const [uploadedGarment, setUploadedGarment] = useState<string | null>(null);


    const previewRef = useRef<HTMLDivElement>(null);

    const [publishCaption, setPublishCaption] = useState('');
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
    const [countdown, setCountdown] = useState<number | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [selectedSizes, setSelectedSizes] = useState<Record<string, number>>(initialState?.sizes || {});
    // Preview Size for Real World Dimensions
    const [previewSize, setPreviewSize] = useState<string>('L');

    // --- ZOOM LOGIC ---
    const [specialCodeFront, setSpecialCodeFront] = useState('');
    const [specialCodeBack, setSpecialCodeBack] = useState('');
    const [showLogoGallery, setShowLogoGallery] = useState(false);
    const [filteredLogos, setFilteredLogos] = useState<PredefinedLogo[]>([]);
    const [pendingElement, setPendingElement] = useState<{ type: 'logo' | 'text', content?: string, predefined?: boolean } | null>(null);

    const [activeStyleCategory, setActiveStyleCategory] = useState<StyleCategory>((initialStyleCategory as StyleCategory) || ('Réaliste' as StyleCategory));
    const [selectedStylePrompt, setSelectedStylePrompt] = useState(initialStylePrompt || "");
    const [customStylePrompt, setCustomStylePrompt] = useState(initialStylePrompt || '');

    // Update state if props change
    useEffect(() => {
        if (initialStyleCategory) setActiveStyleCategory(initialStyleCategory as StyleCategory);
        if (initialStylePrompt) {
            setSelectedStylePrompt(initialStylePrompt);
            setCustomStylePrompt(initialStylePrompt);
        }
    }, [initialStyleCategory, initialStylePrompt]);
    const [selectedPose, setSelectedPose] = useState<'front' | 'back' | null>('front');

    const [zoomLevel, setZoomLevel] = useState(1);

    const [activePanel, setActivePanel] = useState<'none' | 'import' | 'text' | 'code' | 'category' | 'ai'>('none');
    const [textOptionsOpen, setTextOptionsOpen] = useState(false);
    const [workshopOpen, setWorkshopOpen] = useState(false);
    const [uploadedLogoPreview, setUploadedLogoPreview] = useState<string | null>(null);
    const [codeLogoPreview, setCodeLogoPreview] = useState<string | null>(null);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [guestLimitModalOpen, setGuestLimitModalOpen] = useState(false);

    // Pong Game Rewards Logic (Moved here to access aiGenerating)
    const [pongScore, setPongScore] = useState(0);
    const [pongRewardModalOpen, setPongRewardModalOpen] = useState(false);
    const wasGeneratingRef = useRef(false);

    useEffect(() => {
        if (!aiGenerating && wasGeneratingRef.current) {
            // Just finished generation
            // If user is guest and scored points
            if (!user && pongScore > 0) {
                // Reduced timeout to ensure it appears promptly
                setTimeout(() => setPongRewardModalOpen(true), 100);
            }
        }
        wasGeneratingRef.current = !!aiGenerating;
    }, [aiGenerating, user, pongScore]);

    // NEW STATES FOR REFINEMENTS
    const [isModifying, setIsModifying] = useState(false);
    const [modificationPrompt, setModificationPrompt] = useState('');
    const [feedbackGiven, setFeedbackGiven] = useState(false);
    const [feedbackComment, setFeedbackComment] = useState('');
    const [showFeedbackInput, setShowFeedbackInput] = useState(false);
    const [isCapturing, setIsCapturing] = useState(false);
    const [showGuides, setShowGuides] = useState(false);
    // FLASH STATE
    const [flashActive, setFlashActive] = useState(false);

    // AI RESULT PERSISTENCE
    useEffect(() => {
        const saved = localStorage.getItem('lastAiResult');
        if (saved && !aiResult) {
            // Optional: Auto-restore or just set a flag? 
            // Let's just set it if we are in AI mode? No, better to have a button.
            // For now, let's just Log it or have a state "canRestore"
        }
    }, []);

    // Save Result
    useEffect(() => {
        if (aiResult) {
            localStorage.setItem('lastAiResult', aiResult);
        }
    }, [aiResult]);

    const restoreLastAiResult = () => {
        const saved = localStorage.getItem('lastAiResult');
        if (saved) setAiResult(saved);
    };



    const currentAiResult = (isBack ? item.aiImageUrlBack : item.aiImageUrlFront);

    // --- GUEST AI CACHE (Contextual Persistence) ---
    // Stores the last AI generation result for guests, per view (Front/Back).
    const [guestAiCache, setGuestAiCache] = useState<{
        front?: { productId: string; color: string; result: string };
        back?: { productId: string; color: string; result: string };
    }>({});

    // 1. INVALIDATION & SYNC: Handle Context Changes
    // TEMPORARILY DISABLED - This useEffect was causing infinite loops after AI generation
    // TODO: Reimplement cache logic without circular dependencies
    /*
    useEffect(() => {
        const currentSide = isBack ? 'back' : 'front';

        // A. INVALIDATION: If Product or Color changes, wipe invalid slots
        setGuestAiCache(prev => {
            const next = { ...prev };
            let changed = false;
            (['front', 'back'] as const).forEach(view => {
                if (next[view]) {
                    if (next[view]!.productId !== item.productType || next[view]!.color !== item.color) {
                        delete next[view];
                        changed = true;
                    }
                }
            });
            return changed ? next : prev;
        });

        // B. HYDRATION / SAVE: If we have an external result (e.g. from Post or Prop), SAVE it to cache
        if (aiResult) {
            setGuestAiCache(prev => {
                const existing = prev[currentSide];
                if (!existing || existing.result !== aiResult) {
                    return {
                        ...prev,
                        [currentSide]: { productId: item.productType, color: item.color, result: aiResult }
                    };
                }
                return prev;
            });
        }
    }, [item.productType, item.color, isBack]);
    */



    // CROPPER STATE
    const [crop, setCrop] = useState<Crop>();
    const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
    const [croppingImage, setCroppingImage] = useState<string | null>(null);
    const cropImgRef = useRef<HTMLImageElement>(null);

    const onCropComplete = (c: PixelCrop) => {
        setCompletedCrop(c);
    };

    const handleCropSave = async () => {
        if (croppingImage && completedCrop && cropImgRef.current) {
            try {
                // CORRECT SCALING: Map displayed pixels (DOM) to natural image pixels
                const appImage = cropImgRef.current;
                const scaleX = appImage.naturalWidth / appImage.width;
                const scaleY = appImage.naturalHeight / appImage.height;

                const scaledCrop = {
                    x: completedCrop.x * scaleX,
                    y: completedCrop.y * scaleY,
                    width: completedCrop.width * scaleX,
                    height: completedCrop.height * scaleY,
                };

                const croppedImage = await getCroppedImg(croppingImage, scaledCrop);

                // Auto-place the cropped logo
                const defaults = { x: 50, y: 40, scale: 100 };
                const targetIsBack = isBack;

                const updates = targetIsBack ? {
                    // Update processed version AND original for display
                    processedLogoUrlBack_original: croppedImage,
                    originalLogoUrlBack: croppedImage,

                    // Reset other processed states
                    backgroundRemovedBack: false, logoInvertedBack: false,
                    processedLogoUrlBack: null, // Clear active processed image
                    activeLogoColorBack: 'original', // RESET COLOR
                    processedLogoUrlBack_white: null, processedLogoUrlBack_black: null, processedLogoUrlBack_noBackground: null
                } : {
                    processedLogoUrlFront_original: croppedImage,
                    originalLogoUrlFront: croppedImage,

                    backgroundRemovedFront: false, logoInvertedFront: false,
                    processedLogoUrlFront: null, // Clear active processed image
                    activeLogoColorFront: 'original', // RESET COLOR
                    processedLogoUrlFront_white: null, processedLogoUrlFront_black: null, processedLogoUrlFront_noBackground: null
                };

                updateItem(updates);
                setUploadedLogoPreview(croppedImage);
                setActiveEl('logo');

                setPendingElement(null); // Clear any pending
                setCroppingImage(null); // Close modal
                setCrop(undefined);
            } catch (e) {
                console.error(e);
            }
        }
    };

    // SWIPE STATE
    const [touchStart, setTouchStart] = useState<{ x: number, y: number } | null>(null);
    const [touchEnd, setTouchEnd] = useState<{ x: number, y: number } | null>(null);


    useEffect(() => {
        const logo = isBack
            ? (item.predefinedLogoUrlBack || item.processedLogoUrlBack_original || item.originalLogoUrlBack)
            : (item.predefinedLogoUrlFront || item.processedLogoUrlFront_original || item.originalLogoUrlFront);

        const previewUrl = Array.isArray(logo) ? logo[0] : logo;
        setUploadedLogoPreview(previewUrl || null);
    }, [isBack, item.predefinedLogoUrlBack, item.originalLogoUrlBack, item.predefinedLogoUrlFront, item.originalLogoUrlFront, item.processedLogoUrlBack_original, item.processedLogoUrlFront_original]);

    // Flatten styles for single line display
    const allStyles = useMemo(() => {
        const list: { category: string, style: any }[] = [];
        Object.entries(STYLE_MATRIX).forEach(([cat, styles]) => {
            styles.forEach(s => list.push({ category: cat, style: s }));
        });
        return list;
    }, []);

    const handleStyleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const container = e.currentTarget;
        const containerLeft = container.getBoundingClientRect().left;

        // Find the first visible element to update category
        const children = Array.from(container.children) as HTMLElement[];
        for (const child of children) {
            const rect = child.getBoundingClientRect();
            // If the element is mostly visible (e.g. crossed the left edge + padding)
            if (rect.right > containerLeft + 50) {
                const cat = child.getAttribute('data-category');
                if (cat) {
                    setActiveStyleCategory(cat as StyleCategory);
                }
                break;
            }
        }
    };

    const product = productDatabase[item.productType];
    if (!product) {
        return <div className="p-8 text-center">Produit introuvable. <button onClick={onBack} className="text-orange-500 underline">Retour</button></div>;
    }

    const updateItem = (updates: Partial<CartItem>) => setItem(prev => ({ ...prev, ...updates }));

    const updateText = (updates: any) => {
        const isText2 = activeEl === 'text2';
        const targetKey = isBack ? (isText2 ? 'textBack2' : 'textBack') : (isText2 ? 'textFront2' : 'textFront');
        // @ts-ignore
        const currentText = item[targetKey] || getDefaultText();
        const newText = { ...currentText, ...updates };
        // @ts-ignore
        updateItem({ [targetKey]: newText });
    };

    const removeText = () => {
        const emptyText = getDefaultText();
        const isText2 = activeEl === 'text2';
        const targetKey = isBack ? (isText2 ? 'textBack2' : 'textBack') : (isText2 ? 'textFront2' : 'textFront');
        // @ts-ignore
        updateItem({ [targetKey]: emptyText });
        setTextOptionsOpen(false);
        setActiveEl(null);
    };

    const removeLogo = () => {
        const wasPredefined = isBack ? item.isPredefinedLogoBack : item.isPredefinedLogoFront;
        if (isBack) {
            updateItem({
                originalLogoUrlBack: null, processedLogoUrlBack_original: null,
                isPredefinedLogoBack: false, predefinedLogoUrlBack: null
            });
        } else {
            updateItem({
                originalLogoUrlFront: null, processedLogoUrlFront_original: null,
                isPredefinedLogoFront: false, predefinedLogoUrlFront: null
            });
        }
        setUploadedLogoPreview(null);
        setCodeLogoPreview(null);
        setActiveEl(null);

        // If it was a predefined logo, go back to code panel
        if (wasPredefined) {
            setActivePanel('code');
            // Ensure gallery stays visible if code exists
            if (isBack ? specialCodeBack : specialCodeFront) {
                setShowLogoGallery(true);
            }
        }
    };

    const colors = Object.keys(product.images);
    const currentIndex = colors.indexOf(item.color);
    const prevIndex = (currentIndex - 1 + colors.length) % colors.length;
    const nextIndex = (currentIndex + 1) % colors.length;
    const visibleIndices = [prevIndex, currentIndex, nextIndex];

    const handleTouchStart = (e: React.TouchEvent) => {
        setTouchEnd(null);
        setTouchStart({ x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY });
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        setTouchEnd({ x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY });
    };

    const handleTouchEnd = () => {
        if (!touchStart || !touchEnd) return;
        const xDist = touchStart.x - touchEnd.x;
        const yDist = touchStart.y - touchEnd.y;

        if (Math.abs(yDist) > Math.abs(xDist)) return; // Vertical scroll, ignore

        const minSwipeDistance = 50;

        if (xDist > minSwipeDistance) {
            updateItem({ color: colors[nextIndex] });
        }
        if (xDist < -minSwipeDistance) {
            updateItem({ color: colors[prevIndex] });
        }
    };


    useEffect(() => {
        const code = isBack ? specialCodeBack.trim().toUpperCase() : specialCodeFront.trim().toUpperCase();
        if (SPECIAL_CODES[code]) {
            const logoCode = SPECIAL_CODES[code];
            const logos = PREDEFINED_LOGOS.filter(l => l.name === logoCode || l.code === code);
            setFilteredLogos(logos);
            setShowLogoGallery(true);
            if (logos.length > 0) {
                const url = Array.isArray(logos[0].url) ? logos[0].url[0] : logos[0].url;
                setCodeLogoPreview(url);
            }
        } else {
            setShowLogoGallery(false);
            setFilteredLogos([]);
            setCodeLogoPreview(null);
        }
        // Clear pending import when switching sides to allow fresh import
        setUploadedLogoPreview(null);
        setPendingElement(null);
    }, [specialCodeFront, specialCodeBack, isBack]);

    // Unified handler for both File Input and Camera
    const processLogoUpdate = (dataUrl: string) => {
        // DIRECT UPLOAD (Skip initial crop)
        // Auto-Fit: Scale to ~90% of area (approx 230 scale for typical logo)
        const defaults = { x: 50, y: 40, scale: 230 };
        const updates = isBack ? {
            originalLogoUrlBack: dataUrl,
            processedLogoUrlBack_original: dataUrl,
            isPredefinedLogoBack: false,
            predefinedLogoUrlBack: null,
            logoPositionXBack: defaults.x, logoPositionYBack: defaults.y, logoSizeBack: defaults.scale,
            backgroundRemovedBack: false, logoInvertedBack: false,
            processedLogoUrlBack: null, // CLEAR PROCESSED IMAGE
            // Reset processed variants
            processedLogoUrlBack_white: null, processedLogoUrlBack_black: null, processedLogoUrlBack_noBackground: null
        } : {
            originalLogoUrlFront: dataUrl,
            processedLogoUrlFront_original: dataUrl,
            isPredefinedLogoFront: false,
            predefinedLogoUrlFront: null,
            logoPositionXFront: defaults.x, logoPositionYFront: defaults.y, logoSizeFront: defaults.scale,
            backgroundRemovedFront: false, logoInvertedFront: false,
            processedLogoUrlFront: null, // CLEAR PROCESSED IMAGE
            // Reset processed variants
            processedLogoUrlFront_white: null, processedLogoUrlFront_black: null, processedLogoUrlFront_noBackground: null
        };

        updateItem(updates);
        setUploadedLogoPreview(dataUrl);
        setActiveEl('logo');
        logAnalyticsEvent('upload_design', { user_type: isGuest ? 'guest' : 'member' });
        // Close modal if open
        setCameraModalOpen(false);
        // Close import panel (optional, maybe keep open for editing?)
        // setActivePanel('none'); 
    };

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                const res = ev.target?.result as string;
                processLogoUpdate(res);
            };
            reader.readAsDataURL(e.target.files[0]);
            e.target.value = '';
        }
    };

    const handleGarmentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                setUploadedGarment(ev.target?.result as string);
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    const handlePredefinedLogoSelect = (url: string) => {
        // Use proxy to ensure CORS headers for html2canvas
        const proxiedUrl = getProxiedUrl(url);
        setCodeLogoPreview(url); // Update the preview to show the selected logo
        setPendingElement({ type: 'logo', content: proxiedUrl, predefined: true });
        // Ensure panel stays open or correct state is maintained if needed
    };

    const handleLogoColorChange = async (colorName: string) => {
        const sideKey = isBack ? 'Back' : 'Front';
        // @ts-ignore
        // SMART SOURCE SELECTION:
        // If background is removed, we want to tint the TRANSPARENT version, not the original square.
        // @ts-ignore
        const backgroundRemoved = isBack ? item.backgroundRemovedBack : item.backgroundRemovedFront;
        // @ts-ignore
        const transparentUrl = isBack ? item.processedLogoUrlBack_noBackground : item.processedLogoUrlFront_noBackground;

        // If BG is removed and we have the transparent source, use it!
        // Otherwise fallback to original.
        const sourceUrl = (backgroundRemoved && transparentUrl)
            ? transparentUrl
            : (item[`processedLogoUrl${sideKey}_original`] || item[`originalLogoUrl${sideKey}`]);

        if (!sourceUrl) return;

        // Optimistic UI update for state (DraggableElement will use CSS filter temporarily if processed url is missing)
        updateItem(isBack ? { activeLogoColorBack: colorName } : { activeLogoColorFront: colorName });

        let newProcessedUrl = null;

        if (colorName === 'original' || colorName === 'transparent') {
            // Revert to source
            // @ts-ignore
            newProcessedUrl = item[`processedLogoUrl${sideKey}_noBackground`] || item[`processedLogoUrl${sideKey}_original`];
        } else {
            // Check cache
            const cacheKey = `processedLogoUrl${sideKey}_${colorName}${backgroundRemoved ? '_nobg' : ''}`;
            // @ts-ignore
            if (item[cacheKey]) {
                // @ts-ignore
                newProcessedUrl = item[cacheKey];
            } else {
                // Generate
                try {
                    // Use the SOURCE URL (transparent if applicable)
                    newProcessedUrl = await processLogoColor(sourceUrl, colorName);
                } catch (e) {
                    console.error("Color processing failed", e);
                }
            }
        }

        const updates: any = {};
        // Set the MAIN property that DraggableElement checks
        updates[`processedLogoUrl${sideKey}`] = newProcessedUrl;

        // Configure flags so DraggableElement knows to use the processed URL and disable CSS filter
        // If we have a processed URL (baked color), we disable the CSS filter logic implicitly via DraggableElement logic,
        // but we keeps activeLogoColor set so UI shows selection.

        // Save to cache
        if (colorName !== 'original' && colorName !== 'transparent' && newProcessedUrl) {
            updates[`processedLogoUrl${sideKey}_${colorName}`] = newProcessedUrl;
        }

        updateItem(updates);
    };

    const applyPlacement = (zone: 'heart' | 'center', side: 'front' | 'back' = isBack ? 'back' : 'front') => {
        if (!pendingElement) return;
        const presets = PLACEMENT_PRESETS[item.productType] || PLACEMENT_PRESETS['default'];
        const settings = presets[zone];

        const targetIsBack = side === 'back';
        if (targetIsBack !== isBack) {
            setIsBack(targetIsBack);
            setActiveEl(null);
        }

        if (pendingElement.type === 'logo') {
            const updates = targetIsBack ? {
                originalLogoUrlBack: pendingElement.predefined ? null : pendingElement.content,
                processedLogoUrlBack_original: pendingElement.content!,
                isPredefinedLogoBack: pendingElement.predefined,
                predefinedLogoUrlBack: pendingElement.predefined ? pendingElement.content : null,
                logoSizeBack: settings.scale, logoPositionXBack: settings.x, logoPositionYBack: settings.y,
                backgroundRemovedBack: false, logoInvertedBack: false,
                processedLogoUrlBack: null, // CLEAR PROCESSED IMAGE
                activeLogoColorBack: 'original' // RESET COLOR
            } : {
                originalLogoUrlFront: pendingElement.predefined ? null : pendingElement.content,
                processedLogoUrlFront_original: pendingElement.content!,
                isPredefinedLogoFront: pendingElement.predefined,
                predefinedLogoUrlFront: pendingElement.predefined ? pendingElement.content : null,
                logoSizeFront: settings.scale, logoPositionXFront: settings.x, logoPositionYFront: settings.y,
                backgroundRemovedFront: false, logoInvertedFront: false,
                processedLogoUrlFront: null, // CLEAR PROCESSED IMAGE
                activeLogoColorFront: 'original' // RESET COLOR
            };
            updateItem(updates);
            setActiveEl('logo');
        } else {
            const newText = targetIsBack ? { ...item.textBack } : { ...item.textFront };
            newText.text = 'VOTRE TEXTE';
            newText.position = { x: 50, y: settings.y };
            newText.fontSize = zone === 'heart' ? 16 : 24;
            updateItem(targetIsBack ? { textBack: newText } : { textFront: newText });
            setActiveEl('text');
            setTextOptionsOpen(true);
        }
        setPendingElement(null);
        setUploadedLogoPreview(null);
        setActivePanel('none'); // Close panel to show result clearly
    };

    const updateSizeQuantity = (size: string, delta: number) => {
        setSelectedSizes(prev => {
            const current = prev[size] || 0;
            const next = Math.max(0, current + delta);
            const newSizes = { ...prev, [size]: next };
            if (next === 0) delete newSizes[size];
            return newSizes;
        });
    };

    const generatePreview = async (): Promise<string> => {
        if (!previewRef.current) return '';
        setActiveEl(null);
        const originalZoom = zoomLevel;
        setZoomLevel(1);
        await new Promise(resolve => setTimeout(resolve, 300));

        try {
            await document.fonts.ready; // Ensure fonts are loaded
            const html2canvasModule = await import('html2canvas');
            const html2canvas = html2canvasModule.default;
            const canvas = await html2canvas(previewRef.current, {
                useCORS: true, allowTaint: false, backgroundColor: null, scale: 2,
                onclone: (doc) => {
                    // Force font visibility in clone if needed
                    const style = doc.createElement('style');
                    style.innerHTML = '.font-loaded { opacity: 1 !important; }'; // Example fallback
                    doc.head.appendChild(style);
                }
            });
            setZoomLevel(originalZoom);
            return canvas.toDataURL('image/jpeg', 0.6); // Use compressed JPEG for better storage efficiency
        } catch (e) {
            console.error("Preview Error", e);
            setZoomLevel(originalZoom);
            // Convert fallback URL to base64 to ensure API receives valid data
            const fallbackUrl = getProxiedUrl(isBack ? product.backImages[item.color] : product.images[item.color]);
            return await urlToBase64(fallbackUrl);
        }
    };

    const handleClaimPongRewards = () => {
        const credits = Math.min(Math.floor(pongScore / 5), 5);
        localStorage.setItem('pending_pong_credits', credits.toString());
        setPongRewardModalOpen(false);
        onAuthRequired(); // Trigger Auth Modal
    };

    const handleAiTryOn = async (userPhoto: string, promptOverride?: string) => {
        // --- 1. VERIFICATIONS (Quotas & Validité) ---

        // BYPASS CHECK (Admin/IP)
        const isBypassed = ADMIN_IPS.includes(userIp) || (user && user.email === 'logosigneed@gmail.com');

        if (!isBypassed) {
            // CHECK REGISTERED USER CREDITS
            if (user) {
                if ((userCredits || 0) <= 0) {
                    setGuestLimitModalOpen(true);
                    return;
                }
            }
            // CHECK GUEST QUOTA
            else {
                const storageKey = 'guest_ai_quota';
                let data = { count: 0, resetTime: 0 };
                try {
                    const stored = localStorage.getItem(storageKey);
                    if (stored) data = JSON.parse(stored);
                } catch (e) { }

                const now = Date.now();
                // Reset if time expired
                const effectiveCount = (now > data.resetTime) ? 0 : data.count;

                if (effectiveCount >= 1) {
                    setGuestLimitModalOpen(true);
                    return;
                }
            }
        }

        if (!userPhoto || userPhoto === 'data:,' || userPhoto.length < 100) {
            alert("Erreur: Impossible de récupérer l'image. Veuillez réessayer ou utiliser une autre méthode (Upload/Caméra).");
            return;
        }

        if (!isGuest) {
            setAiModalOpen(false); // Close modal only for members to show progress on main page
        }
        setFeedbackGiven(false); // Reset feedback for new generation
        setShowFeedbackInput(false);
        setFeedbackComment('');
        setPongScore(0); // Reset Pong Score 

        logAnalyticsEvent(AnalyticsEvents.GENERATE_AI_START, {
            category: activeStyleCategory,
            style: selectedStylePrompt || 'custom',
            user_type: isGuest ? 'guest' : 'member'
        });

        try {
            const preview = await generatePreview();
            const resizedUserPhoto = await resizeImage(userPhoto, 800);

            let finalStyle = promptOverride;
            let finalCategory = activeStyleCategory as string;

            if (!finalStyle) {
                if (!selectedStylePrompt && customStylePrompt.trim()) {
                    finalStyle = customStylePrompt;
                    finalCategory = 'Custom';
                } else {
                    finalStyle = selectedStylePrompt;
                    const found = allStyles.find(s => s.style.prompt === selectedStylePrompt);
                    if (found && found.style.glasses) {
                        finalStyle += `. ${found.style.glasses}`;
                    }
                }
            }

            if (onGenerateAi) {
                await onGenerateAi({
                    userPhoto: resizedUserPhoto,
                    preview,
                    productName: product.name,
                    color: item.color,
                    style: finalStyle || '',
                    category: finalCategory,
                    side: isBack ? 'back' : 'front',
                    currentItemState: item
                });
            }

            // --- QUOTA DEDUCTION ---
            if (user) {
                onDeductCredits(1);
            } else {
                const storageKey = 'guest_ai_quota';
                let data = { count: 0, resetTime: Date.now() + (48 * 60 * 60 * 1000) };
                try {
                    const stored = localStorage.getItem(storageKey);
                    if (stored) data = JSON.parse(stored);
                } catch (e) { }

                const now = Date.now();
                if (now > data.resetTime) {
                    data = { count: 0, resetTime: now + (48 * 60 * 60 * 1000) };
                }

                data.count += 1;
                localStorage.setItem(storageKey, JSON.stringify(data));
            }

            // For Guests, we KEEP the modal open to show the Result directly in it!
            // And we DO NOT change the activeView (meaning the product stays visible behind the modal)
            if (!isGuest) {
                setAiModalOpen(false);
                setIsAiViewVisible(true);
                setActiveView('model');
            }

            setCapturedImage(null);

        } catch (e: any) {
            console.error("AI Error Trigger:", e);
        }
    };

    const [postCaption, setPostCaption] = useState('');

    // Auto-add Hashtag when AI Result is ready
    useEffect(() => {
        if (aiResult && selectedStyleName) {
            const hashtag = '#' + selectedStyleName.replace(/\s+/g, '');
            setPostCaption(prev => {
                if (prev.includes(hashtag)) return prev;
                return (prev ? prev + ' ' : '') + hashtag;
            });
        }
    }, [aiResult, selectedStyleName]);

    const [isSavingPost, setIsSavingPost] = useState(false);
    const [toast, setToast] = useState<{ msg: string, type: 'success' | 'error' } | null>(null);

    const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const handleAddToProfile = async () => {
        if (isGuest) {
            // Updated to direct trigger as per user request
            onAuthRequired();
            return;
        }

        if (!aiResult) return;

        setIsSavingPost(true);
        try {
            const postUser: User = {
                id: user?.id || generateUUID(),
                email: user?.email || '',
                username: user?.username || 'Designer',
                avatarUrl: user?.avatarUrl || '',
                credits: userCredits || 0
            };

            await postService.createPost({
                id: generateUUID(),
                user: postUser,
                imageUrl: aiResult,
                caption: postCaption || `Ma création SignAid - ${product.name}`,
                tags: [{ id: generateUUID(), position: { x: 50, y: 50 }, productType: item.productType }],
                customization: item,
                comments: [],
                type: 'ai',
                status: 'approved', // Auto-approve for registered users
                validations: 0,
                archived: false,
                createdAt: new Date(),
                styleCategory: activeStyleCategory,
                stylePrompt: activeStyleCategory === 'Custom' ? customStylePrompt : selectedStylePrompt
            });
            showToast("Création partagée dans la Galerie !", 'success');
            setPostCaption('');
        } catch (error) {
            console.error("Error saving to profile:", error);
            alert("Erreur lors de la sauvegarde sur votre profil.");
        } finally {
            setIsSavingPost(false);
        }
    };

    const handleFeedback = async (isPositive: boolean) => {
        if (feedbackGiven) return;
        try {
            await addDoc(collection(db, 'feedback'), {
                userId: user?.id,
                email: user?.email,
                positive: isPositive,
                comment: feedbackComment,
                timestamp: serverTimestamp(),
                imageUrl: aiResult
            });
            // Reward user
            if (user?.id) {
                const userRef = doc(db, 'users', user.id);
                await updateDoc(userRef, {
                    credits: increment(1)
                });
                onUpdateUser({ credits: (userCredits || 0) + 1 });
            }
            setFeedbackGiven(true);
            setShowFeedbackInput(false);
            alert("Merci pour votre avis ! +1 Crédit ajouté.");
        } catch (e) {
            alert("Erreur lors de la suppression.");
        }
    };

    useEffect(() => { if (isCameraOpen && videoRef.current && cameraStream) videoRef.current.srcObject = cameraStream; }, [cameraStream, isCameraOpen]);
    useEffect(() => { return () => { if (cameraStream) cameraStream.getTracks().forEach(t => t.stop()); }; }, [cameraStream]);

    const startCamera = async () => {
        try {
            if (cameraStream) cameraStream.getTracks().forEach(track => track.stop());
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facingMode } });
            setCameraStream(stream);
            setIsCameraOpen(true);
            setCapturedImage(null);
        } catch (err: any) {
            console.error("Camera error:", err);
            let message = "Accès caméra refusé.";

            if (err.name === 'NotAllowedError') {
                message = "Accès caméra refusé. Veuillez autoriser l'accès à la caméra dans les paramètres de votre navigateur.";
            } else if (err.name === 'NotFoundError') {
                message = "Aucune caméra détectée sur cet appareil.";
            } else if (err.name === 'NotReadableError') {
                message = "La caméra est déjà utilisée par une autre application.";
            } else if (err.name === 'OverconstrainedError') {
                message = "La caméra ne supporte pas les paramètres demandés.";
            } else if (err.name === 'SecurityError') {
                message = "Accès caméra bloqué. Utilisez HTTPS ou localhost.";
            }

            alert(message);
        }
    };
    const stopCamera = () => { if (cameraStream) { cameraStream.getTracks().forEach(track => track.stop()); setCameraStream(null); } setIsCameraOpen(false); };
    const toggleCamera = () => setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    // FIX: Add isCameraOpen to dependency array to trigger startCamera when modal opens
    useEffect(() => { if (isCameraOpen) startCamera(); }, [facingMode, isCameraOpen]);

    useEffect(() => {
        if (countdown === null) return;
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(prev => (prev as number) - 1), 1000);
            return () => clearTimeout(timer);
        } else if (countdown === 0) {
            // FLASH & CAPTURE SEQUENCE
            setFlashActive(true);

            // 1. Wait for flash to fully render/light up face (100-300ms)
            setTimeout(() => {
                capturePhoto();

                // 2. Keep flash on a bit longer for visual effect, then turn off
                setTimeout(() => {
                    setFlashActive(false);
                    setCountdown(null);
                }, 500);
            }, 200);
        }
    }, [countdown]);

    const capturePhoto = () => {
        if (videoRef.current) {
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                // MIRRORING RESTORED
                if (facingMode === 'user') { ctx.translate(canvas.width, 0); ctx.scale(-1, 1); }
                ctx.drawImage(videoRef.current, 0, 0);
                stopCamera(); setCapturedImage(canvas.toDataURL('image/jpeg'));
            }
        }
    };

    const changeProductType = (dir: 'next' | 'prev') => {
        const types = Object.keys(productDatabase);
        const idx = types.indexOf(item.productType);
        const newIdx = dir === 'next' ? (idx + 1) % types.length : (idx - 1 + types.length) % types.length;
        const newType = types[newIdx];

        // Only update productType and adjust color if needed, keeping other customizations
        updateItem({
            productType: newType,
            color: productDatabase[newType].images[item.color] ? item.color : Object.keys(productDatabase[newType].images)[0]
        });

        // Resets
        if (setAiResult) setAiResult(null);
        setIsAiViewVisible(false);
        setActiveEl(null);
    };

    // --- PRICE CALCULATION LOGIC ---

    const realHeightCm: number = (productDimensions as any)?.height || 70;
    const realWidthCm = realHeightCm * 0.75;
    const getDims = (sizePct: number, ratio: number) => {
        const effectiveSize = sizePct || 50;
        if (!ratio) return { w: 0, h: 0, area: 0 };
        const w = realWidthCm * (effectiveSize / 100);
        const h = w / ratio;
        return { w, h, area: w * h };
    };

    const frontDims = getDims(item.logoSizeFront, item.logoAspectRatioFront || 1);
    const backDims = getDims(item.logoSizeBack, item.logoAspectRatioBack || 1);

    // Check for content presence
    const hasFrontContent = item.originalLogoUrlFront || item.predefinedLogoUrlFront || item.processedLogoUrlFront;
    const hasBackContent = item.originalLogoUrlBack || item.predefinedLogoUrlBack || item.processedLogoUrlBack;

    const isFrontBig = hasFrontContent && (frontDims.w > 35 || frontDims.h > 35);
    const isBackBig = hasBackContent && (backDims.w > 35 || backDims.h > 35);

    const totalArea = (hasFrontContent ? frontDims.area : 0) + (hasBackContent ? backDims.area : 0);
    const isTotalAreaBig = totalArea > 1250;

    let extraCharge = 0;
    if (isFrontBig || isBackBig || isTotalAreaBig) {
        extraCharge += 5;
    }

    const handleAddToCartAction = async () => {
        if (isCapturing) return;
        setIsCapturing(true);
        try {
            const hasSizes = Object.values(selectedSizes).some(qty => (qty as number) > 0);
            if (!hasSizes) {
                setShakeSizes(true);
                setShowSizeError(true);
                setTimeout(() => {
                    setShowSizeError(false);
                    setShakeSizes(false);
                }, 3000);
                return;
            }

            let frontPreview: string | undefined = undefined;
            let backPreview: string | undefined = undefined;

            // Capture screen for "Ghost" (flat) previews in the Cart
            // This ensures the technical view is correct and not obscured/hidden, even if an AI result exists.
            const startSideIsBack = isBack;

            // 1. Capture CURRENT Side immediately (Reliable)
            setActiveEl(null);
            await new Promise(resolve => setTimeout(resolve, 100)); // Short frame delay
            const firstSidePreview = await generatePreview();

            if (startSideIsBack) {
                backPreview = firstSidePreview;
            } else {
                frontPreview = firstSidePreview;
            }

            // 2. Check if OTHER side needs capture
            const needsFront = startSideIsBack && (item.originalLogoUrlFront || item.predefinedLogoUrlFront || item.textFront?.text);
            const needsBack = !startSideIsBack && (item.originalLogoUrlBack || item.predefinedLogoUrlBack || item.textBack?.text);

            if (needsFront) {
                setIsBack(false);
                // Wait longer for loading on switch
                await new Promise(resolve => setTimeout(resolve, 1200));
                frontPreview = await generatePreview();
                setIsBack(true); // Return to original
            } else if (needsBack) {
                setIsBack(true);
                await new Promise(resolve => setTimeout(resolve, 1200)); // Wait longer for loading on switch
                backPreview = await generatePreview();
                setIsBack(false); // Return to original
            }

            // Upload AI Image if present
            let finalAiImageUrl: string | undefined = undefined;
            if (aiResult) {
                try {
                    const blob = dataURLtoBlob(aiResult);
                    if (blob) {
                        // console.log("Uploading AI image...", blob.size);
                        finalAiImageUrl = await uploadImageBlob(blob, 'ai_generations');
                    } else {
                        finalAiImageUrl = aiResult; // Fallback
                    }
                } catch (e) {
                    console.error("Failed to upload AI image, falling back to base64", e);
                    finalAiImageUrl = aiResult;
                }
            } else {
                finalAiImageUrl = undefined;
            }

            // Calculate Final Price (Logic moved to render body for UI access)
            const basePrice = product ? product.price : 0;
            const currentFinalPrice = basePrice + extraCharge;

            // Create a separate item for each selected size
            const itemsToAdd: CartItem[] = [];
            Object.entries(selectedSizes).forEach(([size, qty]) => {
                if ((qty as number) > 0) {
                    // Create a deep copy for each size to ensure they are unique items in cart
                    const newItem = {
                        ...item,
                        id: generateUUID(), // New ID for each cart line
                        sizes: { [size]: qty },
                        previewImageUrlFront: frontPreview,
                        previewImageUrlBack: backPreview,
                        aiImageUrl: finalAiImageUrl, // Use the uploaded URL or fallback
                        calculatedPrice: currentFinalPrice
                    };

                    // AI Result is already set in aiImageUrl above. No need to overwrite preview images or logo urls.
                    logAnalyticsEvent(AnalyticsEvents.ADD_TO_CART, {
                        item_id: item.id,
                        item_name: product.name,
                        color: item.color,
                        quantity: qty,
                        size: size,
                        price: currentFinalPrice,
                        user_type: isGuest ? 'guest' : 'member'
                    });
                    itemsToAdd.push(newItem);
                }
            });

            if (itemsToAdd.length > 0) {
                onAddToCartBatch(itemsToAdd);
            }

            setSelectedSizes({});
            // alert("Ajouté au panier !"); // Removed as onAddToCartBatch will likely switch view
        } finally {
            setIsCapturing(false);
        }
    };

    const activeText = (activeEl === 'text2')
        ? (isBack ? (item.textBack2 || getDefaultText()) : (item.textFront2 || getDefaultText()))
        : (isBack ? item.textBack : item.textFront);

    const handleTextButtonClick = () => {
        // Toggle panel
        setActivePanel(activePanel === 'text' ? 'none' : 'text');

        if (!activeText.text) {
            const isText2 = activeEl === 'text2';
            const targetKey = isBack ? (isText2 ? 'textBack2' : 'textBack') : (isText2 ? 'textFront2' : 'textFront');
            // @ts-ignore
            const newText = { ...(item[targetKey] || getDefaultText()) };
            newText.text = ''; // Default empty, visual placeholder handled by DraggableElement
            newText.position = { x: 50, y: isText2 ? 60 : 40 }; // Offset second text slightly
            // @ts-ignore
            updateItem({ [targetKey]: newText });
            setActiveEl(isText2 ? 'text2' : 'text');
            setTextOptionsOpen(true);
        } else {
            setTextOptionsOpen(!textOptionsOpen);
            setActiveEl('text');
        }
    };

    const handleImportButtonClick = () => {
        setActivePanel(activePanel === 'import' ? 'none' : 'import');
    };

    const handleCameraButtonClick = () => {
        document.getElementById('hidden-camera-input')?.click();
    };

    const handleCodeButtonClick = () => {
        setActivePanel(activePanel === 'code' ? 'none' : 'code');
    };

    const autoCenterGarment = () => {
        setZoomLevel(1);
        if (previewRef.current) {
            const rect = previewRef.current.getBoundingClientRect();
            const viewportHeight = window.innerHeight || document.documentElement.clientHeight;

            // Check if element is reasonably visible (e.g., top is within the viewing area)
            // We use a lenient check: if the top is somewhere in the viewport or slightly above, we consider it 'seen'.
            // If it's way off screen (e.g. user scrolled far down), we recenter.

            const isVisible = (
                rect.top >= -100 &&
                rect.bottom <= (viewportHeight + 100)
            );

            // Additional check: If the user is viewing the 'bottom' of the page (options), 
            // rect.top might be very negative.

            if (!isVisible) {
                previewRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    };



    // --- UI HELPERS: History & Click Outside ---
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            const panel = target.closest('.animate-fade-in');
            const toggleBtn = target.closest('button');
            const canvasEl = target.closest('.relative.w-full.md\\:max-w-\\[60\\%\\].aspect-\\[3\\/4\\]');

            // If active panel open, and click is NOT in panel
            if (activePanel !== 'none' && !panel && !toggleBtn) {
                setActivePanel('none');
            }

            // If an element is active, and we click outside the canvas or elements
            // Note: DraggableElements stop propagation, so if we are here, we didn't click an element.
            if (activeEl && !panel && !toggleBtn && !canvasEl) {
                setActiveEl(null);
            }

            // Close desktop size dropdown (Disabled for Size Guide persistence as requested)
            // if (isDesktopSizeOpen && !(target.closest('.size-dropdown-container'))) {
            //     setIsDesktopSizeOpen(false);
            // }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [activePanel, isDesktopSizeOpen]);

    // Handle Mobile Back Button
    useEffect(() => {
        const handlePopState = (e: PopStateEvent) => {
            if (aiModalOpen) {
                e.preventDefault();
                setAiModalOpen(false);
            } else if (activePanel !== 'none' || activeEl) {
                e.preventDefault();
                setActivePanel('none');
                setActiveEl(null);
            }
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [activePanel, activeEl, aiModalOpen]);

    // Push state when opening panel/selecting
    // Push state when opening panel/selecting OR AI Modal
    useEffect(() => {
        if (activePanel !== 'none' || activeEl || aiModalOpen) {
            history.pushState({ modal: true }, '');
        }
    }, [activePanel, activeEl, aiModalOpen]);

    const handleCanvasClick = (e: React.MouseEvent) => {
        // Any click that reaches here should deselect (since elements stop propagation)
        setActiveEl(null);
        setActivePanel('none');
    };

    const handlePredefinedLogoClick = (logo: PredefinedLogo) => {
        // Use proxied URL for predefined logos to avoid CORS issues if any (though usually strictly local or S3)
        // But here we use the URL directly as it's likely from the public folder or absolute
        const rawUrl = Array.isArray(logo.url) ? logo.url[0] : logo.url;
        const logoUrl = getProxiedUrl(rawUrl);

        setUploadedLogoPreview(logoUrl);
        updateItem(isBack ? {
            predefinedLogoUrlBack: logoUrl,
            originalLogoUrlBack: null,
            // processedLogoUrlBack: undefined, // Removed as not in CartItem
            logoPositionXBack: 50, logoPositionYBack: 40, logoSizeBack: 100,
            backgroundRemovedBack: false, logoInvertedBack: false, // Reset flags
            processedLogoUrlBack: null, // CLEAR PROCESSED IMAGE
            activeLogoColorBack: 'original' // RESET COLOR
        } : {
            predefinedLogoUrlFront: logoUrl,
            originalLogoUrlFront: null,
            // processedLogoUrlFront: undefined, // Removed as not in CartItem
            logoPositionXFront: 50, logoPositionYFront: 40, logoSizeFront: 100,
            backgroundRemovedFront: false, logoInvertedFront: false, // Reset flags
            processedLogoUrlFront: null, // CLEAR PROCESSED IMAGE
            activeLogoColorFront: 'original' // RESET COLOR
        });
        setActiveEl('logo');
    };

    return (
        <div className="flex flex-col h-full w-full max-w-7xl mx-auto relative pb-24 bg-white overflow-x-hidden scrollbar-hide">
            {pendingElement && (
                <div className="fixed inset-0 z-[100] bg-white/90 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl border border-gray-200 p-6 w-full max-w-sm shadow-2xl">
                        <h3 className="text-xl font-bold text-gray-900 mb-2 text-center">Placement</h3>
                        <div className="grid grid-cols-2 gap-4 my-6">
                            <button onClick={() => applyPlacement('heart')} className="p-4 bg-gray-100 rounded-xl text-gray-800 font-bold hover:bg-orange-100 hover:text-orange-600 border border-gray-200 hover:border-orange-300 transition-all flex flex-col items-center justify-center gap-2">
                                <i className="fa-solid fa-heart text-xl"></i>
                                <span>CÅ“ur</span>
                            </button>
                            <button onClick={() => applyPlacement('center')} className="p-4 bg-gray-100 rounded-xl text-gray-800 font-bold hover:bg-orange-100 hover:text-orange-600 border border-gray-200 hover:border-orange-300 transition-all flex flex-col items-center justify-center gap-2">
                                <i className="fa-regular fa-square text-xl"></i>
                                <span>Centre</span>
                            </button>
                        </div>
                        <button onClick={() => { setPendingElement(null); setUploadedLogoPreview(null); }} className="w-full text-gray-500 text-sm hover:text-gray-900">Annuler</button>
                    </div>
                </div>
            )
            }

            <div className="hidden md:flex w-full h-14 items-center justify-center border-b border-gray-100 bg-white sticky top-0 z-40 shadow-sm">
                {/* Desktop: Back Button Left + Selector Center */}
                <div className="hidden md:flex items-center justify-between w-full px-6">
                    <button onClick={() => window.open(window.location.origin, '_blank')} className="text-gray-900 hover:text-orange-500 flex items-center gap-2 font-bold">
                        <i className="fa-solid fa-arrow-left"></i> Retour
                    </button>

                    <div className="flex items-center gap-6 absolute left-1/2 -translate-x-1/2">
                        <button onClick={() => changeProductType('prev')} className="text-orange-600 hover:text-orange-800 p-2 font-black text-2xl transition-transform hover:scale-120">
                            <i className="fa-solid fa-chevron-left"></i>
                        </button>
                        <h2 className="text-xl font-black text-orange-600 uppercase tracking-widest min-w-[280px] text-center">{product.name}</h2>
                        <button onClick={() => changeProductType('next')} className="text-orange-600 hover:text-orange-800 p-2 font-black text-2xl transition-transform hover:scale-120">
                            <i className="fa-solid fa-chevron-right"></i>
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Selector Header (Original style restored) */}
            <div className="md:hidden w-full flex flex-col bg-white border-b border-orange-100 shadow-sm transition-all">
                <div className="w-full flex items-center justify-center gap-6 py-3 px-4">
                    <button onClick={() => changeProductType('prev')} className="text-orange-600 p-2 font-black text-xl">
                        <i className="fa-solid fa-chevron-left"></i>
                    </button>
                    <h2 className="text-lg font-black text-orange-600 uppercase tracking-widest flex-1 text-center whitespace-nowrap overflow-hidden text-ellipsis">{product.name}</h2>
                    <button onClick={() => changeProductType('next')} className="text-orange-600 p-2 font-black text-xl">
                        <i className="fa-solid fa-chevron-right"></i>
                    </button>
                </div>
            </div>


            {/* MAIN CONTENT AREA - Fixed Mobile Scrolling */}
            <div className="flex-1 relative flex flex-col items-center justify-start md:justify-center p-4 bg-white overflow-y-auto overflow-x-hidden w-full scrollbar-hide">

                {/* 1. HERO PRODUCT (Perfectly Centered) */}
                <div className="relative w-full max-w-[400px] aspect-[3/4] flex items-center justify-center z-10 mt-[-10vh] lg:mt-[-5vh]" style={{ aspectRatio: '3/4', minHeight: '400px' }}>

                    {/* COLOR SELECTOR - LEFT (DESKTOP ONLY NOW) */}
                    <button
                        onClick={() => updateItem({ color: colors[prevIndex] })}
                        className="hidden lg:flex absolute -left-28 bottom-4 group flex-col items-center gap-3 transition-all hover:scale-105"
                    >
                        <div className="w-20 h-28 rounded-2xl overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.1)] border border-gray-100 bg-white p-1">
                            <img
                                src={getProxiedUrl(getOptimizedImageUrl(isBack ? product.backImages[colors[prevIndex]] : product.images[colors[prevIndex]], 200))}
                                className="w-full h-full object-contain opacity-80 group-hover:opacity-100 transition-opacity"
                                alt="Précédent"
                            />
                        </div>
                        <div className="w-8 h-8 flex items-center justify-center bg-white rounded-full shadow-md text-gray-400 group-hover:text-orange-500 border border-gray-100 transition-colors">
                            <i className="fa-solid fa-chevron-left text-xs"></i>
                        </div>
                    </button>

                    {/* MAIN CANVAS */}
                    <div
                        ref={previewRef}
                        onClick={handleCanvasClick}
                        className="relative w-full aspect-[3/4] bg-white select-none p-6"
                        style={{ transform: `scale(${zoomLevel})` }}
                    >
                        <div
                            className="w-full h-full relative"
                            style={{ top: '20px' }}
                        >
                            {/* ALIGNMENT GUIDES (6x6 Grid) */}
                            {showGuides && (
                                <div className="absolute inset-0 z-[100] pointer-events-none overflow-hidden">
                                    {/* Vertical Lines (5 lines for 6 divisions) */}
                                    {[1, 2, 3, 4, 5].map(i => (
                                        <div key={`v-${i}`} className="absolute top-0 bottom-0 w-[1px] bg-orange-500/20" style={{ left: `${(i * 100) / 6}%` }}></div>
                                    ))}
                                    {/* Horizontal Lines (5 lines for 6 divisions) */}
                                    {[1, 2, 3, 4, 5].map(i => (
                                        <div key={`h-${i}`} className="absolute left-0 right-0 h-[1px] bg-orange-500/20" style={{ top: `${(i * 100) / 6}%` }}></div>
                                    ))}
                                    {/* Center Axis (More prominent) */}
                                    <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-orange-500/40 -translate-x-1/2"></div>
                                    <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-orange-500/40 -translate-y-1/2"></div>
                                    <div className="absolute left-1/2 top-1/2 w-4 h-4 border border-orange-500/50 rounded-full -translate-x-1/2 -translate-y-1/2"></div>
                                </div>
                            )}
                            <img
                                src={getProxiedUrl(getOptimizedImageUrl(isBack ? product.backImages[item.color] : product.images[item.color], 800))}
                                className="w-full h-full object-contain pointer-events-none select-none"
                                alt="product"
                                crossOrigin="anonymous"
                                loading="eager"
                                // @ts-ignore - React requires lowercase fetchpriority
                                fetchpriority="high"
                            />

                            {/* Overlays (Logo & Texts) */}
                            {(isBack ? (item.predefinedLogoUrlBack || item.originalLogoUrlBack) : (item.predefinedLogoUrlFront || item.originalLogoUrlFront)) && (
                                <DraggableElement
                                    id={isBack ? "logoBack" : "logoFront"} type="logo" item={item} side={isBack ? "Back" : "Front"}
                                    isActive={activeEl === 'logo'} setActive={() => setActiveEl('logo')}
                                    onOpenOptions={() => setActivePanel('import')} onUpdate={updateItem} onSaveHistory={() => { }}
                                    isEditable={true} realHeight={productDimensions?.[item.productType]?.[previewSize]}
                                />
                            )}
                            {(isBack ? item.textBack.text : item.textFront.text) && (
                                <DraggableElement
                                    id={isBack ? "textBack" : "textFront"} type="text" item={item} side={isBack ? "Back" : "Front"}
                                    isActive={activeEl === 'text'} setActive={() => setActiveEl('text')}
                                    onOpenOptions={() => setActivePanel('text')} onUpdate={updateItem} onSaveHistory={() => { }}
                                    isEditable={true} realHeight={productDimensions?.[item.productType]?.[previewSize]}
                                />
                            )}
                            {(isBack ? item.textBack2?.text : item.textFront2?.text) && (
                                <DraggableElement
                                    id={isBack ? "textBack2" : "textFront2"} type="text" item={item} side={isBack ? "Back" : "Front"}
                                    isActive={activeEl === 'text2'} setActive={() => setActiveEl('text2')}
                                    onOpenOptions={() => setActivePanel('text')} onUpdate={updateItem} onSaveHistory={() => { }}
                                    isEditable={true} realHeight={productDimensions?.[item.productType]?.[previewSize]}
                                />
                            )}
                        </div>
                    </div>

                    {/* COLOR SELECTOR - RIGHT (DESKTOP ONLY NOW) */}
                    <button
                        onClick={() => updateItem({ color: colors[nextIndex] })}
                        className="hidden lg:flex absolute -right-28 bottom-4 group flex-col items-center gap-3 transition-all hover:scale-105"
                    >
                        <div className="w-20 h-28 rounded-2xl overflow-hidden shadow-[0_10px_30_rgba(0,0,0,0.1)] border border-gray-100 bg-white p-1">
                            <img
                                src={getProxiedUrl(getOptimizedImageUrl(isBack ? product.backImages[colors[nextIndex]] : product.images[colors[nextIndex]], 200))}
                                className="w-full h-full object-contain opacity-80 group-hover:opacity-100 transition-opacity"
                                alt="Suivant"
                            />
                        </div>
                        <div className="w-8 h-8 flex items-center justify-center bg-white rounded-full shadow-md text-gray-400 group-hover:text-orange-500 border border-gray-100 transition-colors">
                            <i className="fa-solid fa-chevron-right text-xs"></i>
                        </div>
                    </button>
                </div>


                {/* 2. VERTICAL OPTIONS BAR (Desktop Floating Right) */}
                <div className="hidden lg:flex fixed right-8 top-1/2 -translate-y-1/2 z-40">
                    <div
                        className="bg-white/90 backdrop-blur-2xl border border-gray-100 p-3 rounded-[2rem] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.15)] flex flex-col gap-4 items-center"
                        style={{ position: 'relative', left: '-1px', top: '78px', transition: 'none' }}
                    >
                        {/* 2.1 UPLOAD / IMAGE */}
                        <button
                            onClick={() => { handleImportButtonClick(); autoCenterGarment(); }}
                            className="w-11 h-11 flex items-center justify-center rounded-xl hover:bg-orange-50 text-gray-700 hover:text-orange-600 transition-all hover:scale-110 active:scale-95 group relative"
                            title="Image / Couleurs"
                        >
                            <i className={`fa-solid ${(isBack ? item.predefinedLogoUrlBack || item.originalLogoUrlBack : item.originalLogoUrlFront || item.predefinedLogoUrlFront) ? 'fa-palette' : 'fa-image'} text-xl`}></i>
                        </button>

                        {/* 2.2 TEXT TOOL */}
                        <button
                            onClick={() => { handleTextButtonClick(); autoCenterGarment(); }}
                            className="w-11 h-11 flex items-center justify-center rounded-xl hover:bg-orange-50 text-gray-700 hover:text-orange-600 transition-all hover:scale-110 active:scale-95"
                            title="Ajouter du Texte"
                        >
                            <i className="fa-solid fa-font text-xl"></i>
                        </button>

                        {/* 2.3 SIZE GUIDE */}
                        <div className="relative group">
                            <button
                                onClick={(e) => { e.stopPropagation(); setIsDesktopSizeOpen(!isDesktopSizeOpen); if (!isDesktopSizeOpen) autoCenterGarment(); }}
                                className={`w-11 h-11 flex items-center justify-center rounded-xl transition-all ${isDesktopSizeOpen ? 'bg-orange-600 text-white shadow-lg shadow-orange-200' : 'hover:bg-orange-50 text-gray-700 hover:text-orange-600'} hover:scale-110`}
                                title="Guide des Tailles"
                            >
                                <i className="fa-solid fa-ruler-vertical text-xl"></i>
                            </button>
                            {isDesktopSizeOpen && (
                                <div className="absolute right-full mr-6 top-0 bg-white rounded-2xl shadow-2xl border border-gray-100 p-2 flex flex-col gap-1 items-center min-w-[100px] animate-fade-in-right">
                                    {product.sizes.map((s: string) => (
                                        <button
                                            key={s}
                                            onClick={(e) => { e.stopPropagation(); setPreviewSize(s); setSelectedSizes({ [s]: 1 }); }}
                                            className={`w-full py-3 px-4 rounded-xl text-xs font-black uppercase transition-all ${previewSize === s ? 'bg-orange-600 text-white' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="w-10 h-[1px] bg-gray-100 my-1"></div>

                        {/* 2.4 FACE / BACK SWITCH */}
                        <button
                            onClick={() => { setIsBack(!isBack); setActiveView(isBack ? 'front' : 'back'); autoCenterGarment(); }}
                            className="w-11 h-11 flex items-center justify-center rounded-xl hover:bg-orange-50 text-gray-700 hover:text-orange-600 transition-all hover:scale-110 active:scale-95"
                            title="Changer de Vue"
                        >
                            <i className={`fa-solid fa-arrows-rotate text-xl transition-transform duration-500 ${isBack ? 'rotate-180' : ''}`}></i>
                        </button>

                        {/* 2.5 TOGGLE GUIDES (Profiles Only) */}
                        {user && !isGuest && (
                            <>
                                <div className="w-10 h-[1px] bg-gray-100 my-1"></div>
                                <button
                                    onClick={() => { setShowGuides(!showGuides); autoCenterGarment(); }}
                                    className={`w-11 h-11 flex items-center justify-center rounded-xl transition-all hover:bg-orange-50 ${showGuides ? 'bg-orange-50 text-gray-700' : 'text-gray-700 hover:text-orange-600'} hover:scale-110`}
                                    title="Afficher la grille"
                                >
                                    <i className="fa-solid fa-table-cells text-xl"></i>
                                </button>
                            </>
                        )}

                        <div className="w-10 h-[1px] bg-gray-100 my-1"></div>

                        <button
                            onClick={() => {
                                autoCenterGarment();
                                if (aiGenerating) { setAiModalOpen(true); return; }
                                if (aiResult) { setActiveView('model'); setAiModalOpen(true); return; }
                                setAiModalOpen(true);
                            }}
                            className={`w-11 h-11 flex items-center justify-center rounded-xl transition-all hover:scale-110 active:scale-95 shadow-md relative overflow-hidden ${aiGenerating ? 'bg-orange-100 text-orange-400' : (aiResult ? 'ring-2 ring-orange-500 ring-offset-2' : 'bg-gray-900 text-white hover:bg-black')}`}
                            title="Studio IA"
                        >
                            {aiResult ? (
                                <>
                                    <img src={aiResult} alt="AI Result" className="absolute inset-0 w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                        <i className="fa-solid fa-wand-magic-sparkles text-white text-sm drop-shadow-lg"></i>
                                    </div>
                                </>
                            ) : aiGenerating ? (
                                <i className="fa-solid fa-circle-notch fa-spin text-xl"></i>
                            ) : (
                                <i className="fa-solid fa-wand-magic-sparkles text-xl"></i>
                            )}
                        </button>
                    </div>
                </div>


                {/* 3. MOBILE BOTTOM BAR (Displayed only on Mobile) */}
                <div className="lg:hidden w-full max-w-lg bg-white/80 backdrop-blur-xl border border-white/50 p-4 rounded-[2rem] shadow-xl flex items-center justify-between gap-4 mt-6">
                    <button onClick={handleImportButtonClick} className="flex-1 flex flex-col items-center gap-1">
                        <i className={`fa-solid ${(isBack ? item.predefinedLogoUrlBack || item.originalLogoUrlBack : item.originalLogoUrlFront || item.predefinedLogoUrlFront) ? 'fa-palette' : 'fa-image'} text-xl text-orange-500`}></i>
                        <span className="text-[8px] font-black uppercase">Image</span>
                    </button>
                    <button
                        onClick={() => { if (aiGenerating) { setAiModalOpen(true); return; } if (aiResult) { setActiveView('model'); setAiModalOpen(true); return; } setAiModalOpen(true); }}
                        className={`flex-[1.5] py-3 rounded-2xl font-black text-xs flex items-center justify-center gap-2 relative overflow-hidden ${aiResult ? 'ring-2 ring-orange-500' : 'bg-gray-900 text-white'}`}
                    >
                        {aiResult ? (
                            <>
                                <img src={aiResult} alt="AI Result" className="absolute inset-0 w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-2">
                                    <i className="fa-solid fa-wand-magic-sparkles text-white drop-shadow-lg"></i>
                                    <span className="text-white font-bold drop-shadow-lg">IA</span>
                                </div>
                            </>
                        ) : aiGenerating ? (
                            /* ADDED: Show spinner/active state when generating in mobile button too */
                            <div className="flex items-center gap-2 text-orange-400">
                                <i className="fa-solid fa-circle-notch fa-spin"></i>
                                <span>IA...</span>
                            </div>
                        ) : (
                            <><i className="fa-solid fa-wand-magic-sparkles"></i> IA</>
                        )}
                    </button>
                    <button onClick={handleTextButtonClick} className="flex-1 flex flex-col items-center gap-1">
                        <i className="fa-solid fa-font text-xl text-orange-500"></i>
                        <span className="text-[8px] font-black uppercase">Texte</span>
                    </button>
                    <button onClick={() => { setIsBack(!isBack); setActiveView(isBack ? 'front' : 'back'); }} className="flex-1 flex flex-col items-center gap-1">
                        <i className="fa-solid fa-arrows-rotate text-xl text-orange-500"></i>
                        <span className="text-[8px] font-black uppercase">{isBack ? 'Face' : 'Dos'}</span>
                    </button>
                </div>

                <div className="hidden">
                    <input id="hidden-file-input" type="file" accept="image/*" onChange={handleLogoUpload} />
                    <input id="hidden-camera-input" type="file" accept="image/*" capture="environment" onChange={handleLogoUpload} />
                </div>

                {/* MOBILE COLOR SELECTOR (CAROUSEL WITH ARROWS) - MOVED TO BOTTOM */}
                <div className="lg:hidden w-full flex items-center justify-center gap-2 py-2 mt-4 pb-8">

                    {/* LEFT ARROW */}
                    <button
                        onClick={() => updateItem({ color: colors[prevIndex] })}
                        className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-orange-500 transition-colors"
                    >
                        <i className="fa-solid fa-chevron-left text-lg"></i>
                    </button>

                    {/* THUMBNAILS CONTAINER */}
                    <div className="flex items-center gap-3">
                        {/* PREVIOUS COLOR */}
                        <button
                            onClick={() => updateItem({ color: colors[prevIndex] })}
                            className="w-12 h-14 flex-shrink-0 transition-all active:scale-95"
                        >
                            <img
                                src={getProxiedUrl(getOptimizedImageUrl(isBack ? product.backImages[colors[prevIndex]] : product.images[colors[prevIndex]], 200))}
                                className="w-full h-full object-contain"
                                alt="Précédent"
                            />
                        </button>

                        {/* CURRENT COLOR */}
                        <div className="w-12 h-14 flex-shrink-0 relative z-10 transition-all active:scale-95">
                            <img
                                src={getProxiedUrl(getOptimizedImageUrl(isBack ? product.backImages[item.color] : product.images[item.color], 200))}
                                className="w-full h-full object-contain filter drop-shadow-sm"
                                alt="Actuel"
                            />
                        </div>

                        {/* NEXT COLOR */}
                        <button
                            onClick={() => updateItem({ color: colors[nextIndex] })}
                            className="w-12 h-14 flex-shrink-0 transition-all active:scale-95"
                        >
                            <img
                                src={getProxiedUrl(getOptimizedImageUrl(isBack ? product.backImages[colors[nextIndex]] : product.images[colors[nextIndex]], 200))}
                                className="w-full h-full object-contain"
                                alt="Suivant"
                            />
                        </button>
                    </div>

                    {/* RIGHT ARROW */}
                    <button
                        onClick={() => updateItem({ color: colors[nextIndex] })}
                        className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-orange-500 transition-colors"
                    >
                        <i className="fa-solid fa-chevron-right text-lg"></i>
                    </button>
                </div>
            </div>


            {/* TOOLS PANEL CONTAINER */}
            <div className="w-full relative mt-2">
                {/* PANELS - FLOW CONTENT (Replaced Absolute) */}
                <div className="w-full z-50">
                    {/* IMPORT/COLOR PANEL */}
                    {activePanel === 'import' && (
                        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in" onClick={(e) => { if (e.target === e.currentTarget) setActivePanel('none'); }}>
                            <div className="w-full max-w-sm bg-white border border-gray-200 p-6 rounded-2xl shadow-2xl flex flex-col gap-4 relative">
                                <button onClick={() => setActivePanel('none')} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"><i className="fa-solid fa-times text-gray-500"></i></button>
                                {((isBack ? item.predefinedLogoUrlBack || item.originalLogoUrlBack : item.originalLogoUrlFront || item.predefinedLogoUrlFront)) ? (
                                    <>
                                        {/* LOGO ACTIVE: COLOR OPTIONS */}
                                        <div className="flex flex-col gap-4">
                                            <h3 className="font-bold text-gray-800 text-lg">Options Image</h3>
                                        </div>

                                        {/* 4 MAIN ACTIONS ROW */}
                                        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2">
                                            {/* REMOVE BG */}
                                            <button
                                                onClick={async () => {
                                                    if (isRemovingBackground) return; // Prevent double click

                                                    const targetIsBack = isBack;
                                                    const currentRemoved = targetIsBack ? item.backgroundRemovedBack : item.backgroundRemovedFront;
                                                    let url = targetIsBack ? (item.processedLogoUrlBack_original || item.originalLogoUrlBack || item.predefinedLogoUrlBack) : (item.processedLogoUrlFront_original || item.originalLogoUrlFront || item.predefinedLogoUrlFront);
                                                    if (Array.isArray(url)) url = url[0];

                                                    if (!currentRemoved && url) {
                                                        setIsRemovingBackground(true);
                                                        try {
                                                            const processed = await removeBackground(url, ((targetIsBack ? item.backgroundRemovalModeBack : item.backgroundRemovalModeFront) as any) || 'white');
                                                            // Save to _noBackground so we can use it for tinting later
                                                            updateItem(targetIsBack
                                                                ? { backgroundRemovedBack: true, processedLogoUrlBack: processed, processedLogoUrlBack_noBackground: processed }
                                                                : { backgroundRemovedFront: true, processedLogoUrlFront: processed, processedLogoUrlFront_noBackground: processed }
                                                            );
                                                        } catch (e: any) {
                                                            console.error("Bg removal failed", e);
                                                            if (e.message === "CRÉDITS_INSUFFISANTS") {
                                                                alert("Impossible de détacher l'arrière-plan : Quota API remove.bg épuisé. Veuillez contacter l'administrateur ou mettre à jour la clé API.");
                                                            } else {
                                                                alert(`Erreur lors du détourage : ${e.message || "Veuillez réessayer"}`);
                                                            }
                                                        } finally {
                                                            setIsRemovingBackground(false);
                                                        }
                                                    } else {
                                                        // Restore original when toggling off
                                                        updateItem(targetIsBack
                                                            ? { backgroundRemovedBack: false, processedLogoUrlBack: item.processedLogoUrlBack_original || item.originalLogoUrlBack, processedLogoUrlBack_noBackground: null }
                                                            : { backgroundRemovedFront: false, processedLogoUrlFront: item.processedLogoUrlFront_original || item.originalLogoUrlFront, processedLogoUrlFront_noBackground: null }
                                                        );
                                                    }
                                                }}
                                                className={`flex-1 min-w-[70px] py-3 rounded-xl font-bold text-[10px] border flex flex-col items-center justify-center gap-1 transition-all ${(isBack ? item.backgroundRemovedBack : item.backgroundRemovedFront) || isRemovingBackground ? 'bg-orange-500 text-white border-orange-500 shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                                            >
                                                {isRemovingBackground ? (
                                                    <i className="fa-solid fa-circle-notch fa-spin text-lg"></i>
                                                ) : (
                                                    <i className="fa-solid fa-wand-magic-sparkles text-lg"></i>
                                                )}
                                                <span>{isRemovingBackground ? 'Traitement' : 'Détourage'}</span>
                                            </button>
                                            {/* BLACK */}
                                            <button
                                                onClick={() => handleLogoColorChange('black')}
                                                className={`flex-1 min-w-[70px] py-3 rounded-xl font-bold text-[10px] border flex flex-col items-center justify-center gap-1 transition-all ${(isBack ? item.activeLogoColorBack : item.activeLogoColorFront) === 'black' ? 'bg-gray-900 text-white border-gray-900 shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                                            >
                                                <i className="fa-solid fa-circle text-lg text-black"></i>
                                                <span>Noir</span>
                                            </button>

                                            {/* WHITE */}
                                            <button
                                                onClick={() => handleLogoColorChange('white')}
                                                className={`flex-1 min-w-[70px] py-3 rounded-xl font-bold text-[10px] border flex flex-col items-center justify-center gap-1 transition-all ${(isBack ? item.activeLogoColorBack : item.activeLogoColorFront) === 'white' ? 'bg-gray-100 text-gray-900 border-gray-300 shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                                            >
                                                <i className="fa-regular fa-circle text-lg text-gray-400"></i>
                                                <span>Blanc</span>
                                            </button>

                                            {/* ORIGINAL */}
                                            <button
                                                onClick={() => {
                                                    const targetIsBack = isBack;
                                                    updateItem(targetIsBack
                                                        ? { activeLogoColorBack: 'original', logoInvertedBack: false, backgroundRemovedBack: false, processedLogoUrlBack: null, processedLogoUrlBack_original: null }
                                                        : { activeLogoColorFront: 'original', logoInvertedFront: false, backgroundRemovedFront: false, processedLogoUrlFront: null, processedLogoUrlFront_original: null }
                                                    );
                                                }}
                                                className={`flex-1 min-w-[70px] py-3 rounded-xl font-bold text-[10px] border flex flex-col items-center justify-center gap-1 transition-all ${(isBack ? item.activeLogoColorBack : item.activeLogoColorFront) === 'original' ? 'bg-blue-50 text-blue-600 border-blue-200 shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                                            >
                                                <i className="fa-solid fa-rotate-left text-lg"></i>
                                                <span>Original</span>
                                            </button>
                                        </div>

                                        {/* COPY & DELETE ACTIONS */}
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => {
                                                    const url = isBack
                                                        ? (item.originalLogoUrlBack || item.processedLogoUrlBack_original)
                                                        : (item.originalLogoUrlFront || item.processedLogoUrlFront_original);
                                                    if (url) {
                                                        setCroppingImage(url);
                                                    }
                                                }}
                                                className="flex-1 py-2 bg-gray-50 text-gray-600 font-bold rounded-lg border border-gray-200 hover:bg-gray-102 flex items-center justify-center gap-2 text-[10px]"
                                            >
                                                <i className="fa-solid fa-crop"></i> Rogner
                                            </button>
                                            <button
                                                onClick={() => {
                                                    const targetIsBack = !isBack;
                                                    const targetData = targetIsBack ?
                                                        { originalLogoUrlBack: item.originalLogoUrlFront, predefinedLogoUrlBack: item.predefinedLogoUrlFront, processedLogoUrlBack: item.processedLogoUrlFront, processedLogoUrlBack_original: item.processedLogoUrlFront_original, isPredefinedLogoBack: item.isPredefinedLogoFront, logoPositionXBack: item.logoPositionXFront, logoPositionYBack: item.logoPositionYFront, logoSizeBack: item.logoSizeFront, activeLogoColorBack: item.activeLogoColorFront, logoInvertedBack: item.logoInvertedFront, backgroundRemovedBack: item.backgroundRemovedFront, backgroundRemovalModeBack: item.backgroundRemovalModeFront } :
                                                        { originalLogoUrlFront: item.originalLogoUrlBack, predefinedLogoUrlFront: item.predefinedLogoUrlBack, processedLogoUrlFront: item.processedLogoUrlBack, processedLogoUrlFront_original: item.processedLogoUrlBack_original, isPredefinedLogoFront: item.isPredefinedLogoBack, logoPositionXFront: item.logoPositionXBack, logoPositionYFront: item.logoPositionYBack, logoSizeFront: item.logoSizeBack, activeLogoColorFront: item.activeLogoColorBack, logoInvertedFront: item.logoInvertedBack, backgroundRemovedFront: item.backgroundRemovedBack, backgroundRemovalModeFront: item.backgroundRemovalModeBack };

                                                    updateItem(targetData);
                                                    alert("Copié !");
                                                }}
                                                className="flex-1 py-2 bg-gray-50 text-gray-600 font-bold rounded-lg border border-gray-200 hover:bg-gray-100 flex items-center justify-center gap-2 text-[10px]"
                                            >
                                                <i className="fa-regular fa-copy"></i> Copier
                                            </button>

                                            <button
                                                onClick={() => {
                                                    setActivePanel('none');
                                                    const targetIsBack = isBack;
                                                    setPendingElement(null);
                                                    updateItem(targetIsBack ? { originalLogoUrlBack: null, predefinedLogoUrlBack: null, processedLogoUrlBack: null, processedLogoUrlBack_original: null } : { originalLogoUrlFront: null, predefinedLogoUrlFront: null, processedLogoUrlFront: null, processedLogoUrlFront_original: null });
                                                }}
                                                className="flex-1 py-2 bg-red-50 text-red-500 font-bold rounded-lg border border-red-100 hover:bg-red-100 flex items-center justify-center gap-2 text-[10px]"
                                            >
                                                <i className="fa-solid fa-trash"></i> Supprimer
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        {/* NO LOGO: SHOW UPLOAD OPTIONS */}
                                        <div className="flex flex-col gap-4">
                                            <h3 className="font-bold text-gray-800 text-lg">Ajouter un design</h3>
                                        </div>
                                        <div className="grid grid-cols-1 gap-4">
                                            <div
                                                onClick={() => document.getElementById('hidden-file-input')?.click()}
                                                className="flex flex-col items-center justify-center gap-2 p-8 border-2 border-dashed border-gray-300 rounded-2xl hover:border-orange-500 hover:bg-orange-50 cursor-pointer transition-colors group"
                                            >
                                                <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                    <i className="fa-solid fa-image text-orange-500 text-2xl"></i>
                                                </div>
                                                <span className="font-black text-gray-800 uppercase tracking-widest text-sm">Choisir une image</span>
                                                <span className="text-[10px] text-gray-400">PNG, JPG acceptés</span>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    {/* TEXT PANEL - UPDATED WITH HUE SLIDER */}
                    {activePanel === 'text' && (
                        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/10 backdrop-blur-sm p-4 animate-fade-in" onClick={(e) => { if (e.target === e.currentTarget) setActivePanel('none'); }}>
                            <div className="w-full max-w-sm flex flex-col relative pointer-events-none">

                                {/* TOP BLOCK: HEADER & TABS */}
                                <div className="bg-white p-5 rounded-t-2xl shadow-xl pointer-events-auto relative z-20">
                                    <div className="flex justify-between items-center pb-2 border-b border-gray-100 pr-2">
                                        <h3 className="font-bold text-gray-800 text-lg">Options Texte</h3>
                                        <button onClick={() => setActivePanel('none')} className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"><i className="fa-solid fa-times text-gray-500"></i></button>
                                    </div>

                                    {/* TEXT SELECTOR TABS */}
                                    <div className="flex bg-gray-100 p-1 rounded-lg mt-4">
                                        <button
                                            onClick={() => setActiveEl('text')}
                                            className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${activeEl !== 'text2' ? 'bg-white shadow text-orange-600' : 'text-gray-500 hover:bg-gray-200'}`}
                                        >
                                            Texte 1
                                        </button>
                                        <button
                                            onClick={() => {
                                                setActiveEl('text2');
                                                const txt2 = isBack ? item.textBack2 : item.textFront2;
                                                if (!txt2 || !txt2.text) {
                                                    const newText = getDefaultText();
                                                    newText.text = '';
                                                    newText.position = { x: 50, y: 60 };
                                                    // @ts-ignore
                                                    updateItem(isBack ? { textBack2: newText } : { textFront2: newText });
                                                }
                                            }}
                                            className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${activeEl === 'text2' ? 'bg-white shadow text-orange-600' : 'text-gray-500 hover:bg-gray-200'}`}
                                        >
                                            {((isBack ? item.textBack2?.text : item.textFront2?.text)) ? 'Texte 2' : '+ Ajouter Texte 2'}
                                        </button>
                                    </div>

                                    <label className="text-[10px] text-gray-400 font-bold uppercase mb-1 mt-4 block">Votre Message</label>
                                </div>

                                {/* MIDDLE BLOCK: TRANSPARENT HOLE */}
                                <div className="pointer-events-auto py-2 z-10 relative">
                                    <div style={{ position: 'relative', width: '100%', minHeight: '80px', backgroundColor: 'transparent', borderRadius: '0.5rem', overflow: 'hidden', border: '2px dashed rgba(255,255,255,0.5)', boxShadow: '0 0 0 100vw rgba(0,0,0,0.5)' }}>
                                        {/* Note: Box shadow 100vw simulates the dimming OUTSIDE the hole, but we already have a modal overlay. 
                                            Actually, to make the "Hole" clear, we need to counter the overlay? Impossible via CSS alone if overlay is a parent.
                                            But here we just make the input area transparent so we see THROUGH the modal overlay (which is only 40% dark) to the garment.
                                            I'll remove the huge box-shadow to avoid potential overflow clipping issues.
                                        */}

                                        {/* WYSIWYG Preview Render */}
                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-2">
                                            <TextRenderer
                                                textObj={activeText}
                                                style={{
                                                    fontSize: Math.min(activeText.fontSize, 32) + 'px'
                                                }}
                                            />
                                        </div>

                                        {/* Transparent Textarea */}
                                        <textarea
                                            value={activeText.text === 'VOTRE TEXTE' ? '' : activeText.text}
                                            autoFocus
                                            onFocus={() => {
                                                if (activePanel === 'text' && !activeEl) setActiveEl('text');
                                            }}
                                            onChange={(e) => updateText({ text: e.target.value })}
                                            onInput={(e) => {
                                                const target = e.target as HTMLTextAreaElement;
                                                target.style.height = 'auto';
                                                target.style.height = target.scrollHeight + 'px';
                                            }}
                                            className="w-full h-full p-3 border-none bg-transparent outline-none focus:ring-0 z-10 relative text-transparent caret-white resize-none overflow-hidden placeholder-white/50"
                                            style={{
                                                fontFamily: activeText.fontFamily || 'Inter',
                                                fontSize: `${Math.min(activeText.fontSize || 24, 32)}px`,
                                                fontWeight: activeText.fontWeight || '700',
                                                color: 'transparent',
                                                textTransform: activeText.textTransform || 'none',
                                                letterSpacing: `${activeText.letterSpacing || 0}px`,
                                                lineHeight: activeText.lineHeight || 1.2,
                                                textAlign: 'center',
                                                minHeight: '80px'
                                            }}
                                            rows={1}
                                            placeholder="Écrivez ici..."
                                        />
                                    </div>
                                </div>

                                {/* BOTTOM BLOCK: CONTROLS */}
                                <div className="bg-white p-5 rounded-b-2xl shadow-xl pointer-events-auto flex flex-col gap-4 relative z-20">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] text-gray-400 italic">Double-cliquez sur le design pour éditer aussi</span>
                                        {activeText.text && (
                                            <button onClick={removeText} className="text-red-500 text-xs hover:underline flex items-center gap-1">
                                                <i className="fa-solid fa-trash"></i> Effacer
                                            </button>
                                        )}
                                    </div>

                                    {/* CONTROLS CAROUSEL */}
                                    <div className="relative">
                                        <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-white to-transparent pointer-events-none z-10 md:hidden"></div>
                                        <div className="absolute right-2 top-1/2 -translate-y-1/2 text-orange-500 animate-pulse pointer-events-none z-20 md:hidden">
                                            <i className="fa-solid fa-chevron-right text-sm"></i>
                                        </div>

                                        <div className="flex overflow-x-auto gap-4 pb-2 scrollbar-none snap-x h-40 items-start">

                                            {/* FONT FAMILY */}
                                            <div className="flex flex-col flex-shrink-0 min-w-[140px] snap-start h-full">
                                                <label className="text-[10px] text-gray-400 font-bold uppercase mb-1">Police</label>
                                                <div className="flex flex-col gap-1 overflow-y-auto pr-1 h-full">
                                                    <button onClick={() => updateText({ fontFamily: 'Inter' })} className={`text-left text-xs p-1 rounded ${activeText.fontFamily === 'Inter' ? 'bg-orange-100 text-orange-700' : 'hover:bg-gray-50'}`}>Standard (Inter)</button>
                                                    <button onClick={() => updateText({ fontFamily: 'Roboto' })} className={`text-left text-xs p-1 rounded ${activeText.fontFamily === 'Roboto' ? 'bg-orange-100 text-orange-700' : 'hover:bg-gray-50'}`} style={{ fontFamily: 'Roboto' }}>Moderne (Roboto)</button>
                                                    <button onClick={() => updateText({ fontFamily: 'Montserrat' })} className={`text-left text-xs p-1 rounded ${activeText.fontFamily === 'Montserrat' ? 'bg-orange-100 text-orange-700' : 'hover:bg-gray-50'}`} style={{ fontFamily: 'Montserrat' }}>Géométrique</button>
                                                    <button onClick={() => updateText({ fontFamily: 'Playfair Display' })} className={`text-left text-xs p-1 rounded font-serif ${activeText.fontFamily === 'Playfair Display' ? 'bg-orange-100 text-orange-700' : 'hover:bg-gray-50'}`}>Élégant (Serif)</button>
                                                    <button onClick={() => updateText({ fontFamily: 'monospace' })} className={`text-left text-xs p-1 rounded font-mono ${activeText.fontFamily === 'monospace' ? 'bg-orange-100 text-orange-700' : 'hover:bg-gray-50'}`}>Techno (Mono)</button>
                                                    <button onClick={() => updateText({ fontFamily: 'Bebas Neue' })} className={`text-left text-xs p-1 rounded ${activeText.fontFamily === 'Bebas Neue' ? 'bg-orange-100 text-orange-700' : 'hover:bg-gray-50'}`} style={{ fontFamily: 'Bebas Neue' }}>Impact</button>
                                                    <button onClick={() => updateText({ fontFamily: 'Bangers' })} className={`text-left text-xs p-1 rounded ${activeText.fontFamily === 'Bangers' ? 'bg-orange-100 text-orange-700' : 'hover:bg-gray-50'}`} style={{ fontFamily: 'Bangers' }}>Comic</button>
                                                    <button onClick={() => updateText({ fontFamily: 'Permanent Marker' })} className={`text-left text-xs p-1 rounded ${activeText.fontFamily === 'Permanent Marker' ? 'bg-orange-100 text-orange-700' : 'hover:bg-gray-50'}`} style={{ fontFamily: 'Permanent Marker' }}>Marker</button>
                                                    <button onClick={() => updateText({ fontFamily: 'Lobster' })} className={`text-left text-xs p-1 rounded ${activeText.fontFamily === 'Lobster' ? 'bg-orange-100 text-orange-700' : 'hover:bg-gray-50'}`} style={{ fontFamily: 'Lobster' }}>Manuscrit</button>
                                                    <button onClick={() => updateText({ fontFamily: 'Pacifico' })} className={`text-left text-xs p-1 rounded ${activeText.fontFamily === 'Pacifico' ? 'bg-orange-100 text-orange-700' : 'hover:bg-gray-50'}`} style={{ fontFamily: 'Pacifico' }}>Décontracté</button>
                                                    <button onClick={() => updateText({ fontFamily: 'Dancing Script' })} className={`text-left text-xs p-1 rounded ${activeText.fontFamily === 'Dancing Script' ? 'bg-orange-100 text-orange-700' : 'hover:bg-gray-50'}`} style={{ fontFamily: 'Dancing Script' }}>Cursive</button>
                                                    <button onClick={() => updateText({ fontFamily: 'Oswald' })} className={`text-left text-xs p-1 rounded ${activeText.fontFamily === 'Oswald' ? 'bg-orange-100 text-orange-700' : 'hover:bg-gray-50'}`} style={{ fontFamily: 'Oswald' }}>Urbain</button>
                                                    <button onClick={() => updateText({ fontFamily: 'Graduate' })} className={`text-left text-xs p-1 rounded ${activeText.fontFamily === 'Graduate' ? 'bg-orange-100 text-orange-700' : 'hover:bg-gray-50'}`} style={{ fontFamily: 'Graduate' }}>College</button>
                                                </div>
                                            </div>

                                            <div className="w-[1px] bg-gray-100 flex-shrink-0 h-full"></div>

                                            {/* STYLE */}
                                            <div className="flex flex-col flex-shrink-0 min-w-[100px] snap-start">
                                                <label className="text-[10px] text-gray-400 font-bold uppercase mb-1">Style</label>
                                                <div className="flex flex-col gap-2">
                                                    <div className="flex gap-2">
                                                        <button onClick={() => updateText({ fontWeight: activeText.fontWeight === '700' ? '400' : '700' })} className={`flex-1 py-1 rounded border text-xs font-bold ${activeText.fontWeight === '700' ? 'bg-gray-800 text-white border-gray-800' : 'bg-white border-gray-300 text-gray-600'}`}>B</button>
                                                        <button onClick={() => updateText({ textTransform: activeText.textTransform === 'uppercase' ? 'none' : 'uppercase' })} className={`flex-1 py-1 rounded border text-xs font-bold ${activeText.textTransform === 'uppercase' ? 'bg-gray-800 text-white border-gray-800' : 'bg-white border-gray-300 text-gray-600'}`}>AA</button>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button onClick={() => updateText({ shadow: !activeText.shadow })} className={`flex-1 py-1 rounded border text-xs font-bold ${activeText.shadow ? 'bg-orange-500 text-white border-orange-500' : 'bg-white border-gray-300 text-gray-600'}`}>Omb</button>
                                                        <button onClick={() => updateText({ outline: !activeText.outline })} className={`flex-1 py-1 rounded border text-xs font-bold ${activeText.outline ? 'bg-orange-500 text-white border-orange-500' : 'bg-white border-gray-300 text-gray-600'}`}>Con</button>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="w-[1px] bg-gray-100 flex-shrink-0 h-full"></div>

                                            {/* COLOR */}
                                            <div className="flex flex-col flex-shrink-0 min-w-[120px] snap-start">
                                                <label className="text-[10px] text-gray-400 font-bold uppercase mb-1">Couleur</label>
                                                <div className="flex flex-wrap gap-1">
                                                    {['#000000', '#FFFFFF', '#EF4444', '#3B82F6', '#F59E0B', '#10B981', '#8B5CF6'].map(c => (
                                                        <button key={c} onClick={() => updateText({ color: c })} className={`w-6 h-6 rounded-full border ${activeText.color === c ? 'ring-2 ring-orange-500 scale-110' : 'border-gray-300'}`} style={{ backgroundColor: c }} />
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="w-[1px] bg-gray-100 flex-shrink-0 h-full"></div>

                                            {/* SPACING */}
                                            <div className="flex flex-col flex-shrink-0 min-w-[120px] snap-start">
                                                <label className="text-[10px] text-gray-400 font-bold uppercase mb-1">Espacement & Courbe</label>
                                                <div className="flex flex-col gap-3">
                                                    <div className="flex items-center gap-2">
                                                        <i className="fa-solid fa-arrows-left-right text-gray-400 text-xs w-4"></i>
                                                        <input type="range" min="-2" max="10" step="1" value={activeText.letterSpacing || 0} onChange={(e) => updateText({ letterSpacing: parseInt(e.target.value) })} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-600" title="Espacement Lettres" />
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <i className="fa-solid fa-arrows-up-down text-gray-400 text-xs w-4"></i>
                                                        <input type="range" min="0.8" max="2.5" step="0.1" value={activeText.lineHeight || 1.2} onChange={(e) => updateText({ lineHeight: parseFloat(e.target.value) })} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-600" title="Espacement Lignes" />
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <i className="fa-solid fa-bezier-curve text-gray-400 text-xs w-4"></i>
                                                        <input type="range" min="-100" max="100" step="5" value={activeText.curve || 0} onChange={(e) => {
                                                            const val = parseInt(e.target.value);
                                                            updateText({
                                                                curve: val,
                                                                curveStyle: (activeText.curveStyle === 'flat' && val !== 0) ? 'arc' : activeText.curveStyle
                                                            });
                                                        }} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-600" title="Courbure" />
                                                    </div>
                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                        <button
                                                            onClick={() => updateText({ curve: 0, curveStyle: 'flat' })}
                                                            className={`flex-1 text-[10px] py-1 rounded border ${(!activeText.curve || activeText.curve === 0) ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-300'}`}
                                                        >
                                                            Plat
                                                        </button>
                                                        <button
                                                            onClick={() => updateText({ curve: activeText.curve === 0 ? 50 : activeText.curve, curveStyle: 'arc' })}
                                                            className={`flex-1 text-[10px] py-1 rounded border ${activeText.curve && activeText.curve !== 0 && activeText.curveStyle !== 'upright' ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-600 border-gray-300'}`}
                                                        >
                                                            Courbe
                                                        </button>
                                                        <button
                                                            onClick={() => updateText({ curve: activeText.curve === 0 ? 50 : activeText.curve, curveStyle: 'upright' })}
                                                            className={`flex-1 text-[10px] py-1 rounded border ${activeText.curve && activeText.curve !== 0 && activeText.curveStyle === 'upright' ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-600 border-gray-300'}`}
                                                        >
                                                            Droit
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* CODE PANEL */}
                    {activePanel === 'code' && (
                        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in" onClick={(e) => { if (e.target === e.currentTarget) setActivePanel('none'); }}>
                            <div className="w-full max-w-sm bg-white border border-gray-200 p-6 rounded-2xl shadow-2xl flex flex-col gap-4 relative">
                                <div className="flex justify-between items-center pb-2 border-b border-gray-100 pr-8">
                                    <h3 className="font-bold text-gray-800 text-lg">Entrez un Code</h3>
                                    <button onClick={() => setActivePanel('none')} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"><i className="fa-solid fa-times text-gray-500"></i></button>
                                </div>
                                <div className="flex flex-col items-center w-full">
                                    <label className="text-[10px] text-gray-400 font-bold uppercase mb-2">Entrez votre code spécial</label>
                                    <div className="flex gap-2 w-full max-w-sm">
                                        <input
                                            type="text"
                                            value={isBack ? specialCodeBack : specialCodeFront}
                                            onChange={(e) => isBack ? setSpecialCodeBack(e.target.value) : setSpecialCodeFront(e.target.value)}
                                            className="flex-1 p-3 bg-gray-50 border border-gray-300 rounded-lg text-center font-mono text-lg font-bold tracking-widest focus:border-orange-500 outline-none uppercase"
                                            placeholder="CODE..."
                                        />
                                    </div>
                                </div>

                                {(codeLogoPreview || filteredLogos.length > 0) && (
                                    <div className="flex flex-col gap-4 border-t border-gray-100 pt-4 mt-2">
                                        <div className="flex gap-4">

                                            {/* Selected Code Logo Preview */}
                                            {codeLogoPreview && (
                                                <div className="flex flex-col items-center gap-2 flex-shrink-0">
                                                    <div className="h-24 w-24 bg-gray-100 border border-gray-300 rounded-lg p-2 shadow-inner flex items-center justify-center relative">
                                                        <img
                                                            src={getProxiedUrl(codeLogoPreview)}
                                                            className={`w-full h-full object-contain pointer-events-none select-none ${(isBack ? item.activeLogoColorBack : item.activeLogoColorFront) === 'white' ? 'brightness-0 invert' : ''} ${(isBack ? item.activeLogoColorBack : item.activeLogoColorFront) === 'black' ? 'brightness-0' : ''}`}
                                                            style={{
                                                                filter: (isBack ? item.activeLogoColorBack : item.activeLogoColorFront) === 'red' ? 'sepia(1) saturate(100) hue-rotate(-50deg)' :
                                                                    (isBack ? item.activeLogoColorBack : item.activeLogoColorFront) === 'blue' ? 'sepia(1) saturate(100) hue-rotate(180deg)' : undefined
                                                            }}
                                                            alt="Selected Code Logo"
                                                        />
                                                    </div>

                                                    {/* Color Options */}
                                                    <div className="flex flex-wrap gap-1 justify-center">
                                                        {[
                                                            { name: 'original', color: 'transparent', label: 'Origine' },
                                                            { name: 'black', color: '#000000', label: 'Noir' },
                                                            { name: 'white', color: '#ffffff', label: 'Blanc' },
                                                            { name: 'red', color: '#EF4444', label: 'Red' },
                                                        ].map(c => {
                                                            const activeColor = isBack ? item.activeLogoColorBack : item.activeLogoColorFront;
                                                            const isActive = activeColor === c.name || (!activeColor && c.name === 'original');
                                                            return (
                                                                <button
                                                                    key={c.name}
                                                                    onClick={() => handleLogoColorChange(c.name)}
                                                                    className={`w-4 h-4 rounded-full border ${isActive ? 'ring-1 ring-orange-500 scale-125' : 'border-gray-200'}`}
                                                                    style={{ backgroundColor: c.color === 'transparent' ? 'white' : c.color }}
                                                                />
                                                            )
                                                        })}
                                                    </div>
                                                    <p className="text-[9px] text-gray-400 italic text-center mt-1">Recommandé : Fond transparent</p>

                                                    <div className="flex flex-col w-full gap-1 mt-1">
                                                        <button
                                                            onClick={() => { setPendingElement({ type: 'logo', content: getProxiedUrl(codeLogoPreview), predefined: true }); }}
                                                            className="py-1 px-3 bg-green-50 text-green-600 border border-green-200 rounded-lg hover:bg-green-100 font-bold text-[10px]"
                                                        >
                                                            Placer
                                                        </button>
                                                        <button
                                                            onClick={() => { setSpecialCodeFront(''); setSpecialCodeBack(''); removeLogo(); }}
                                                            className="py-1 px-3 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 font-bold text-[10px]"
                                                        >
                                                            Annuler
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Gallery */}
                                            {filteredLogos.length > 0 && (
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-bold text-gray-500 uppercase mb-2">Logos disponibles</p>
                                                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
                                                        {filteredLogos.map((logo: { url: string | string[] }, idx: number) => {
                                                            const urls = Array.isArray(logo.url) ? logo.url : [logo.url];
                                                            return urls.map((url: string, urlIdx: number) => (
                                                                <button
                                                                    key={`${idx}-${urlIdx}`}
                                                                    onClick={(e) => { e.stopPropagation(); handlePredefinedLogoSelect(url); }}
                                                                    className={`flex-shrink-0 w-20 h-20 border rounded-lg p-2 flex items-center justify-center transition-all shadow-sm group relative ${codeLogoPreview === url ? 'bg-gray-700 border-orange-500 ring-2 ring-orange-500' : 'bg-gray-800 border-gray-700 hover:border-orange-500'}`}
                                                                >
                                                                    <img src={url} alt="logo" className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform" />
                                                                    {codeLogoPreview === url && (
                                                                        <div className="absolute top-1 right-1 w-4 h-4 bg-orange-500 rounded-full border-2 border-white"></div>
                                                                    )}
                                                                </button>
                                                            ));
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}


                </div>

                <div className="lg:col-span-3 space-y-6 order-2 lg:order-3 flex flex-col h-full relative z-10">


                    {/* --- AI SECTION REMOVED (Moved to Main View Replacement) --- */}

                    {/* --- DESKTOP SIZE SELECTOR (RESTORED FROM V5 BACKUP) --- */}
                    <div className="bg-white p-3 rounded-2xl border border-gray-200 shadow-sm mb-6">
                        <h3 className={`font-bold text-sm uppercase tracking-wider mb-3 text-center transition-colors ${shakeSizes ? 'text-red-500' : 'text-gray-900'}`}>Tailles</h3>
                        <div className={`flex flex-wrap gap-3 justify-center ${shakeSizes ? 'animate-shake' : ''}`}>
                            {product.sizes.filter((s: string) => !['XXL', '2XL', '3XL', '4XL', '5XL', '6XL', '7XL', '8XL', '9XL', '10XL'].includes(s)).map((size: string) => {
                                const qty = selectedSizes[size] || 0;
                                return (
                                    <div key={size} className={`flex items-center rounded-lg border transition-all overflow-hidden mb-2 ${qty > 0 ? 'bg-gray-900 border-gray-900 shadow-md ring-2 ring-offset-2 ring-gray-900' : 'bg-white border-gray-200 hover:border-orange-500'}`}>
                                        {qty > 0 ? (
                                            <>
                                                <button onClick={() => updateSizeQuantity(size, -1)} className="w-10 h-10 flex items-center justify-center text-white hover:bg-gray-700 transition-colors font-bold text-lg">-</button>
                                                <div className="h-10 px-3 flex items-center justify-center bg-gray-900 text-white font-bold text-sm min-w-[3rem] border-x border-gray-700">
                                                    {size}<span className="text-xs ml-1 opacity-70">x{qty}</span>
                                                </div>
                                                <button onClick={() => updateSizeQuantity(size, 1)} className="w-10 h-10 flex items-center justify-center text-white hover:bg-gray-700 transition-colors font-bold text-lg">+</button>
                                            </>
                                        ) : (
                                            <button
                                                onClick={() => updateSizeQuantity(size, 1)}
                                                className="w-14 h-10 flex items-center justify-center text-gray-600 font-bold text-sm hover:bg-gray-50 transition-colors"
                                            >
                                                {size}
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* LARGE SIZES TOGGLE */}
                        <div className="mt-1 border-t border-gray-100 pt-2">
                            <button
                                onClick={() => setShowAllSizes(!showAllSizes)}
                                className="w-full flex items-center justify-center gap-2 text-sm font-bold text-orange-600 hover:text-orange-700 transition-colors"
                            >
                                <span>{showAllSizes ? "Masquer les grandes tailles" : "Voir les grandes tailles (2XL - 10XL)"}</span>
                                <i className={`fa-solid fa-chevron-${showAllSizes ? 'up' : 'down'}`}></i>
                            </button>

                            {showAllSizes && (
                                <div className="flex flex-wrap gap-3 justify-center mt-4 animate-fade-in">
                                    {product.sizes.filter((s: string) => ['XXL', '2XL', '3XL', '4XL', '5XL', '6XL', '7XL', '8XL', '9XL', '10XL'].includes(s)).map((size: string) => {
                                        const qty = selectedSizes[size] || 0;
                                        return (
                                            <div key={size} className={`flex items-center rounded-lg border transition-all overflow-hidden mb-2 ${qty > 0 ? 'bg-orange-50 border-orange-200 ring-2 ring-offset-2 ring-orange-200' : 'bg-white border-gray-200 hover:border-orange-500'}`}>
                                                {qty > 0 ? (
                                                    <>
                                                        <button onClick={() => updateSizeQuantity(size, -1)} className="w-10 h-10 flex items-center justify-center text-orange-600 hover:bg-orange-100 transition-colors font-bold text-lg">-</button>
                                                        <div className="h-10 px-3 flex items-center justify-center bg-orange-50 text-orange-800 font-bold text-sm min-w-[3rem] border-x border-orange-200">
                                                            {size}<span className="text-xs ml-1 opacity-70">x{qty}</span>
                                                        </div>
                                                        <button onClick={() => updateSizeQuantity(size, 1)} className="w-10 h-10 flex items-center justify-center text-orange-600 hover:bg-orange-100 transition-colors font-bold text-lg">+</button>
                                                    </>
                                                ) : (
                                                    <button
                                                        onClick={() => updateSizeQuantity(size, 1)}
                                                        className="w-14 h-10 flex items-center justify-center text-gray-500 font-bold text-sm hover:bg-orange-50 transition-colors"
                                                    >
                                                        {size}
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="mt-6"></div>

                    {/* ADD TO CART ACTION */}
                    <div className="relative group mb-4">
                        {showSizeError && (
                            <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-lg animate-bounce whitespace-nowrap z-50">
                                Veuillez choisir une taille d'abord !
                            </div>
                        )}
                        <button
                            onClick={handleAddToCartAction}
                            disabled={isCapturing}
                            className={`w-full py-5 font-black text-lg uppercase tracking-widest shadow-xl transform transition-all rounded-2xl flex items-center justify-center gap-3 ${isCapturing ? 'bg-gray-400 text-white cursor-not-allowed' : (Object.values(selectedSizes).some(qty => (qty as number) > 0)
                                ? 'bg-gray-900 text-white hover:bg-black hover:-translate-y-1'
                                : 'bg-white text-gray-300 border-2 border-gray-100 cursor-pointer')}`}
                        >
                            {isCapturing ? (
                                <i className="fa-solid fa-circle-notch fa-spin"></i>
                            ) : (
                                <i className="fa-solid fa-cart-plus"></i>
                            )}
                            <span>TEST CONNEXION TV</span>
                        </button>
                    </div>
                </div>

                {/* KEEP ORIGINAL SIDEBAR CONTAINER ONLY FOR MOBILE OR AS HIDDEN SIBLING TO AVOID DRIFT */}
                <div className="lg:hidden">
                    <div className="space-y-6 order-2 flex flex-col h-full relative z-10 p-6">
                        {/* Mobile sizes are handled by the bottom bar of mobile view or similar */}
                    </div>
                </div>
            </div>

            {
                aiModalOpen && (
                    // Wrapper moved down
                    null
                )
            }



            {/* AI STUDIO "PAGE" OVERLAY - MODAL STYLE */}
            {
                aiModalOpen && (
                    <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center animate-fade-in p-4 overflow-y-auto">
                        <div className={`bg-white w-full ${aiResult ? "max-w-md" : "max-w-2xl"} rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden relative transition-all duration-300`}>

                            {/* STUDIO HEADER */}
                            <div className="w-full bg-white border-b border-gray-100 p-4 flex items-center justify-between sticky top-0 z-50">
                                <button
                                    onClick={() => setAiModalOpen(false)}
                                    className="flex items-center gap-2 text-gray-600 font-bold hover:text-orange-500 transition-colors"
                                >
                                    {aiResult ? <i className="fa-solid fa-xmark text-lg"></i> : <i className="fa-solid fa-arrow-left"></i>}
                                    <span>{aiResult ? "Fermer" : "Retour"}</span>
                                </button>
                                <h3 className="text-lg font-black italic">Studio <span className="text-orange-500">IA</span></h3>
                                <div className="w-20"></div> {/* Spacer for center alignment */}
                            </div>

                            <div className="w-full flex-1 overflow-y-auto p-4 space-y-6 text-center">
                                {/* Content Body */}
                                {!aiResult ? (
                                    <>
                                        {!isCameraOpen && !capturedImage && !aiGenerating && !previewImage && (
                                            <>

                                                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm text-left w-full">
                                                    <p className="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center gap-2">
                                                        <i className="fa-solid fa-palette"></i> 1. Style & Atmosphère
                                                    </p>

                                                    <div className="flex flex-wrap gap-2 mb-4 border-b border-gray-100 pb-2">
                                                        {Object.keys(STYLE_MATRIX).concat(["Custom"]).map((category) => (
                                                            <button
                                                                key={category}
                                                                onClick={() => {
                                                                    setActiveStyleCategory(category as StyleCategory);
                                                                    document.getElementById(`category-${category}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                                                }}
                                                                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${activeStyleCategory === category ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                                            >
                                                                {category}
                                                            </button>
                                                        ))}
                                                    </div>
                                                    <p className="text-xs text-gray-400 italic mb-2">
                                                        Note : L'IA génère parfois des visages très similaires. Pour un rendu plus réaliste ou pour masquer les imperfections, nous vous recommandons d'intégrer l'option "Lunettes".
                                                    </p>

                                                    <div className="animate-fade-in relative group">
                                                        {/* Left Arrow (Desktop Only) */}
                                                        <button
                                                            onClick={() => {
                                                                const container = document.getElementById('style-container');
                                                                if (container) container.scrollBy({ left: -300, behavior: 'smooth' });
                                                            }}
                                                            className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-white/80 backdrop-blur rounded-full shadow-lg border border-gray-100 items-center justify-center text-gray-700 hover:text-orange-500 hover:scale-110 transition-all -ml-5 opacity-0 group-hover:opacity-100"
                                                        >
                                                            <i className="fa-solid fa-chevron-left"></i>
                                                        </button>

                                                        {/* Right Arrow (Desktop Only) */}
                                                        <button
                                                            onClick={() => {
                                                                const container = document.getElementById('style-container');
                                                                if (container) container.scrollBy({ left: 300, behavior: 'smooth' });
                                                            }}
                                                            className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-white/80 backdrop-blur rounded-full shadow-lg border border-gray-100 items-center justify-center text-gray-700 hover:text-orange-500 hover:scale-110 transition-all -mr-5 opacity-0 group-hover:opacity-100"
                                                        >
                                                            <i className="fa-solid fa-chevron-right"></i>
                                                        </button>

                                                        <div
                                                            className="flex overflow-x-auto gap-4 pb-4 -mx-4 px-4 scrollbar-hide snap-x snap-mandatory items-center"
                                                            id="style-container"
                                                            onScroll={handleStyleScroll}
                                                        >
                                                            {/* All Styles Flattened */}
                                                            {allStyles.map((item, idx) => {
                                                                const isFirstOfCategory = idx === 0 || allStyles[idx - 1].category !== item.category;
                                                                return (
                                                                    <button
                                                                        key={`${item.category}-${item.style.name}`}
                                                                        id={isFirstOfCategory ? `category-${item.category}` : undefined}
                                                                        data-category={item.category}
                                                                        onClick={() => { setSelectedStyleName(item.style.name); setSelectedStylePrompt(item.style.prompt); setCustomStylePrompt(item.style.prompt); setActiveStyleCategory(item.category as StyleCategory); }}
                                                                        className={`flex-shrink-0 w-40 h-60 rounded-xl border transition-all relative overflow-hidden group snap-start ${selectedStylePrompt === item.style.prompt ? 'border-orange-500 ring-2 ring-orange-500 ring-offset-2' : 'border-gray-200 hover:border-gray-300'}`}
                                                                    >
                                                                        <img
                                                                            src={getProxiedUrl(getOptimizedImageUrl(item.style.image, 200))}
                                                                            alt={item.style.name}
                                                                            className="absolute inset-0 w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-110"
                                                                        />
                                                                        <div className={`absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent transition-opacity ${selectedStylePrompt === item.style.prompt ? 'opacity-90' : 'opacity-70 group-hover:opacity-80'}`} />

                                                                        <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30">
                                                                            <i className={`fa-solid ${item.style.icon || 'fa-star'} text-xs text-white`}></i>
                                                                        </div>

                                                                        <div className="absolute bottom-0 left-0 w-full p-3 text-left">
                                                                            {selectedStylePrompt === item.style.prompt && (
                                                                                <div className="mb-1 w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center">
                                                                                    <i className="fa-solid fa-check text-[8px] text-white"></i>
                                                                                </div>
                                                                            )}
                                                                            <span className={`text-xs font-bold uppercase text-white leading-tight block shadow-black drop-shadow-md`}>{item.style.name}</span>
                                                                        </div>
                                                                    </button>
                                                                );
                                                            })}

                                                            {/* Custom Prompt Section - Moved to End */}
                                                            <div
                                                                id="category-Custom"
                                                                data-category="Custom"
                                                                className="flex-shrink-0 w-72 h-60 bg-gray-50 rounded-xl border border-gray-200 p-4 flex flex-col justify-center snap-start relative"
                                                            >
                                                                <h4 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                                                                    <i className="fa-solid fa-pen-fancy text-orange-500"></i>
                                                                    Personnalisé
                                                                </h4>
                                                                <p className="text-[10px] text-gray-400 mb-2">Décrivez l'ambiance de vos rêves...</p>
                                                                <textarea
                                                                    value={customStylePrompt}
                                                                    onChange={(e) => { setCustomStylePrompt(e.target.value); setSelectedStylePrompt(''); setSelectedStyleName(''); setActiveStyleCategory('Custom'); }}
                                                                    placeholder="Ex: Cyberpunk, Jungle, Vintage..."
                                                                    className="w-full p-2 bg-white border border-gray-200 rounded-lg text-xs outline-none focus:border-orange-500 font-medium h-32 resize-none"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col w-full text-left">
                                                    <div className="flex justify-between items-center mb-3">
                                                        <p className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
                                                            <i className="fa-solid fa-camera"></i> 2. Votre Photo
                                                        </p>
                                                        {/* Integrated Pose Selection */}
                                                        <div className="hidden"></div> {/* Removed Pose Selection Here */}
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4 flex-1">
                                                        <button onClick={() => setIsCameraOpen(true)} className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-orange-500 hover:bg-orange-50 transition-all group">
                                                            <i className="fa-solid fa-camera text-2xl text-gray-400 group-hover:text-orange-500 mb-2"></i>
                                                            <div className="font-bold text-gray-700 text-xs">Caméra</div>
                                                        </button>
                                                        <div
                                                            onClick={() => document.getElementById('ai-gallery-input')?.click()}
                                                            className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-orange-500 hover:bg-orange-50 transition-all group cursor-pointer"
                                                        >
                                                            <i className="fa-solid fa-image text-2xl text-gray-400 group-hover:text-orange-500 mb-2"></i>
                                                            <div className="font-bold text-gray-700 text-xs">Galerie</div>
                                                            <input id="ai-gallery-input" type="file" hidden accept="image/*" onChange={(e) => {
                                                                if (e.target.files?.[0]) {
                                                                    const r = new FileReader();
                                                                    r.onload = (ev) => setPreviewImage(ev.target?.result as string);
                                                                    r.readAsDataURL(e.target.files[0]);
                                                                }
                                                            }} />
                                                        </div>
                                                    </div>

                                                    {/* RESTORE HISTORY BUTTON */}
                                                    {(!previewImage && !isCameraOpen && localStorage.getItem('lastAiResult')) && (
                                                        <div className="mt-4 pt-4 border-t border-gray-100 flex justify-center">
                                                            <button
                                                                onClick={restoreLastAiResult}
                                                                className="text-xs font-bold text-orange-500 hover:underline flex items-center gap-2"
                                                            >
                                                                <i className="fa-solid fa-clock-rotate-left"></i> Restaurer la dernière image générée
                                                            </button>
                                                        </div>
                                                    )}

                                                </div>
                                            </>
                                        )}




                                        {isCameraOpen && (
                                            <div className="relative bg-black rounded-2xl overflow-hidden aspect-[3/4] shadow-2xl max-w-sm mx-auto md:max-h-[70vh]">
                                                <video
                                                    ref={videoRef}
                                                    autoPlay
                                                    playsInline
                                                    className="w-full h-full object-cover"
                                                    style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
                                                />
                                                <div className="absolute top-4 left-0 w-full flex justify-between px-4 z-20">
                                                    {/* TIMER TOGGLE */}
                                                    <button onClick={() => setCameraTimerDelay(prev => prev === 0 ? 3 : (prev === 3 ? 10 : 0))} className="w-10 h-10 rounded-full bg-black/50 backdrop-blur text-white flex items-center justify-center border border-white/20">
                                                        {cameraTimerDelay === 0 ? <i className="fa-solid fa-stopwatch-20"></i> : <span className="font-bold text-xs">{cameraTimerDelay}s</span>}
                                                    </button>

                                                    <div className="flex gap-2 bg-black/50 p-1 rounded-xl backdrop-blur-md">
                                                        <button
                                                            onClick={() => setSelectedPose('front')}
                                                            className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all flex items-center gap-2 ${selectedPose === 'front' ? 'bg-white text-orange-600' : 'text-gray-300 hover:text-white'}`}
                                                        >
                                                            <img src={getProxiedUrl(POSE_IMAGES.front)} className="w-5 h-5 object-contain" alt="Face" />
                                                            Face
                                                        </button>
                                                        <button
                                                            onClick={() => setSelectedPose('back')}
                                                            className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all flex items-center gap-2 ${selectedPose === 'back' ? 'bg-white text-orange-600' : 'text-gray-300 hover:text-white'}`}
                                                        >
                                                            <img src={getProxiedUrl(POSE_IMAGES.back)} className="w-5 h-5 object-contain" alt="Dos" />
                                                            Dos
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="absolute bottom-6 left-0 w-full flex justify-center gap-8 items-center z-20">
                                                    <button onClick={stopCamera} className="w-12 h-12 rounded-full bg-white/20 backdrop-blur text-white"><i className="fa-solid fa-xmark"></i></button>
                                                    <button onClick={() => {
                                                        // START TIMER
                                                        setCountdown(cameraTimerDelay === 0 ? 0 : cameraTimerDelay);
                                                    }} className="w-20 h-20 rounded-full bg-white border-4 border-gray-300 flex items-center justify-center transition-transform active:scale-95">
                                                        {countdown !== null && countdown > 0 ? (
                                                            <span className="text-2xl font-black text-red-500">{countdown}</span>
                                                        ) : (
                                                            <div className="w-16 h-16 bg-white rounded-full border-2 border-red-500"></div>
                                                        )}
                                                    </button>
                                                    <button onClick={toggleCamera} className="w-12 h-12 rounded-full bg-white/20 backdrop-blur text-white"><i className="fa-solid fa-rotate"></i></button>
                                                </div>

                                                {/* FLASH OVERLAY - Use 90% opacity to prevent browser from optimizing out the video rendering underneath (Black Frame issue) */}
                                                <div className={`absolute inset-0 bg-white/90 pointer-events-none transition-opacity duration-300 z-[100] ${flashActive ? 'opacity-100' : 'opacity-0'}`}></div>
                                                {countdown !== null && countdown > 0 && (
                                                    <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none bg-black/20 backdrop-blur-[1px]">
                                                        <div className="text-white text-9xl font-black animate-ping drop-shadow-2xl filter drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)]">
                                                            {countdown}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {capturedImage && (
                                            <div className="space-y-4">
                                                {aiGenerating ? (
                                                    <div className="w-full aspect-[3/4] max-w-sm mx-auto rounded-xl overflow-hidden shadow-2xl relative z-0 isolate border-4 border-gray-900 bg-gray-900 md:max-h-[80vh] short-screen-h" style={{ aspectRatio: '3/4', minHeight: '300px' }}>
                                                        {/* Sharp Background Image (Fix Doublon) */}
                                                        <div className="absolute inset-0 z-0">
                                                            <img src={capturedImage} className="w-full h-full object-cover opacity-60" alt="Background" />
                                                        </div>
                                                        {/* Pong Game Overlay */}
                                                        <div className="relative z-10 w-full h-full flex flex-col items-center justify-center">
                                                            <div className="absolute top-4 w-full text-center z-20">
                                                                <p className="text-[10px] text-white/90 font-bold uppercase tracking-widest bg-black/40 px-3 py-1 rounded-full inline-block backdrop-blur-sm border border-white/10">
                                                                    Fais un maximum de points pour gagner des réductions
                                                                </p>
                                                            </div>
                                                            <PongGame
                                                                onScore={setPongScore}
                                                                transparent={true}
                                                                width={Math.min(300, window.innerWidth - 48)}
                                                                height={Math.min(300, window.innerWidth - 48)}
                                                            />
                                                            <div className="absolute bottom-4 text-white/80 text-xs font-bold uppercase tracking-widest">
                                                                Création en cours...
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : aiResult ? (
                                                    <>
                                                        <img
                                                            src={aiResult}
                                                            className="w-full rounded-xl shadow-lg md:max-h-[65vh] short-screen-h object-contain bg-gray-100 max-w-sm mx-auto"
                                                            alt="AI Result"
                                                        />
                                                        <div className="max-w-sm mx-auto space-y-3">
                                                            <button
                                                                onClick={() => { setCapturedImage(null); setAiModalOpen(false); }}
                                                                className="w-full py-4 bg-green-600 text-white font-bold rounded-xl shadow-lg hover:bg-green-500 animate-pulse"
                                                            >
                                                                <i className="fa-solid fa-check mr-2"></i>
                                                                Je valide !
                                                            </button>
                                                            <button
                                                                onClick={() => setAiResult && setAiResult(null)}
                                                                className="w-full py-3 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50"
                                                            >
                                                                <i className="fa-solid fa-rotate-left mr-2"></i>
                                                                Réessayer (Garder la photo)
                                                            </button>
                                                            <button
                                                                onClick={() => { setCapturedImage(null); if (setAiResult) setAiResult(null); setIsCameraOpen(true); }}
                                                                className="text-gray-500 underline self-center w-full text-center italic text-xs"
                                                            >
                                                                Reprendre une photo
                                                            </button>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <>
                                                        <img
                                                            src={capturedImage}
                                                            className="w-full rounded-xl shadow-lg md:max-h-[65vh] short-screen-h object-contain bg-gray-100 max-w-sm mx-auto"
                                                            alt="Captured"
                                                        />
                                                        <div className="max-w-sm mx-auto space-y-3">
                                                            <button onClick={() => handleAiTryOn(capturedImage)} className="w-full py-4 bg-orange-600 text-white font-bold rounded-xl shadow-lg hover:bg-orange-500 animate-pulse">Générer le rendu (1 crédit)</button>
                                                            <button onClick={() => setCapturedImage(null)} className="text-gray-500 underline self-center w-full text-center italic">Reprendre</button>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        )}

                                        {/* Intermediate Preview Modal */}
                                        {previewImage && (
                                            <div className="fixed inset-0 z-[200] bg-white animate-fade-in overflow-y-auto pb-safe">
                                                <div className="flex flex-col items-center justify-start min-h-screen p-4 sm:p-6 pt-4">
                                                    <h3 className="text-xl sm:text-2xl font-black text-gray-900 mb-2 sm:mb-4">Aperçu Photo</h3>
                                                    <div className="relative w-full max-w-sm aspect-[3/4] rounded-xl overflow-hidden shadow-2xl mb-4 sm:mb-6 bg-gray-100 md:max-h-[70vh] short-screen-h">
                                                        <img src={previewImage} className="w-full h-full object-contain" alt="Preview" />
                                                        {aiGenerating && (
                                                            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm">
                                                                <div className="absolute top-2 w-full text-center">
                                                                    <p className="text-[10px] text-white/90 font-bold uppercase tracking-widest bg-black/40 px-3 py-1 rounded-full inline-block backdrop-blur-sm border border-white/10">
                                                                        Fais un maximum de points pour gagner des réductions
                                                                    </p>
                                                                </div>
                                                                <PongGame
                                                                    onScore={setPongScore}
                                                                    transparent={true}
                                                                    width={Math.min(300, window.innerWidth - 64)}
                                                                    height={Math.min(300, window.innerWidth - 64)}
                                                                />
                                                                <div className="absolute bottom-4 bg-black/60 text-white px-4 py-2 rounded-full text-[10px] font-bold backdrop-blur">
                                                                    Points gagnés = Réductions
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="w-full max-w-sm space-y-3">
                                                        {aiGenerating ? (
                                                            <div className="w-full py-6 text-center">
                                                                <div className="inline-flex items-center gap-3 px-6 py-3 bg-orange-50 text-orange-600 rounded-full border border-orange-100 shadow-sm animate-pulse font-bold">
                                                                    <i className="fa-solid fa-wand-magic-sparkles fa-spin"></i>
                                                                    Création de votre style...
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                {/* POSE SELECTION - BEFORE VALIDATION */}
                                                                <div className="flex gap-2 sm:gap-4 justify-center mb-3 sm:mb-4">
                                                                    <button
                                                                        onClick={() => setSelectedPose('front')}
                                                                        className={`flex-1 py-2 sm:py-3 px-1 sm:px-2 rounded-xl border-2 font-bold transition-all flex flex-col items-center gap-1 ${selectedPose === 'front' ? 'border-orange-500 bg-orange-50 text-orange-600' : 'border-gray-200 text-gray-500'}`}
                                                                    >
                                                                        <img src={getProxiedUrl(POSE_IMAGES.front)} className="w-6 h-6 sm:w-8 sm:h-8 object-contain" alt="Face" />
                                                                        <span className="text-xs sm:text-sm">Face</span>
                                                                    </button>
                                                                    <button
                                                                        onClick={() => setSelectedPose('back')}
                                                                        className={`flex-1 py-2 sm:py-3 px-1 sm:px-2 rounded-xl border-2 font-bold transition-all flex flex-col items-center gap-1 ${selectedPose === 'back' ? 'border-orange-500 bg-orange-50 text-orange-600' : 'border-gray-200 text-gray-500'}`}
                                                                    >
                                                                        <img src={getProxiedUrl(POSE_IMAGES.back)} className="w-6 h-6 sm:w-8 sm:h-8 object-contain" alt="Dos" />
                                                                        <span className="text-xs sm:text-sm">Dos</span>
                                                                    </button>
                                                                </div>

                                                                <button
                                                                    onClick={() => {
                                                                        if (!selectedPose) { alert('Veuillez d\'abord choisir une pose (Face ou Dos).'); return; }
                                                                        handleAiTryOn(previewImage)
                                                                    }}
                                                                    className="w-full py-3 sm:py-4 bg-orange-600 text-white font-bold rounded-xl shadow-lg hover:bg-orange-500 flex items-center justify-center gap-2 animate-pulse text-sm sm:text-base"
                                                                >
                                                                    <i className="fa-solid fa-check"></i> Valider & Générer (1 crédit)
                                                                </button>
                                                                <button
                                                                    onClick={() => setPreviewImage(null)}
                                                                    className="w-full py-2 sm:py-3 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 text-sm sm:text-base"
                                                                >
                                                                    Annuler
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="w-full max-w-lg bg-white p-6 rounded-2xl shadow-2xl border border-gray-100">
                                        <h3 className="text-2xl font-bold text-gray-900 mb-4 text-center">Résultat IA</h3>
                                        <div className="relative rounded-xl overflow-hidden shadow-inner bg-gray-50 mb-6">
                                            {aiResult && (
                                                <img src={aiResult} className="w-full h-auto object-contain max-h-[60vh] mx-auto" alt="Résultat IA" />
                                            )}
                                            <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded backdrop-blur-sm">Généré par Gemini</div>
                                        </div>

                                        {/* RESTORE BUTTON (If result matches saved, or just general utility) */}
                                        {(!aiResult && localStorage.getItem('lastAiResult') && !isCameraOpen && !previewImage) && (
                                            <div className="mb-4 flex justify-center">
                                                <button
                                                    onClick={restoreLastAiResult}
                                                    className="text-xs font-bold text-orange-500 hover:underline flex items-center gap-2 bg-orange-50 px-4 py-2 rounded-full border border-orange-100"
                                                >
                                                    <i className="fa-solid fa-clock-rotate-left"></i> Restaurer la dernière création
                                                </button>
                                            </div>
                                        )}

                                        <div className="space-y-4">
                                            <input
                                                type="text"
                                                value={postCaption}
                                                onChange={(e) => setPostCaption(e.target.value)}
                                                placeholder="Une légende pour votre profil..."
                                                className="w-full p-3 border border-gray-300 rounded-xl focus:border-orange-500 outline-none bg-gray-50"
                                            />

                                            <div className="flex flex-col gap-3 w-full">

                                                {/* Primary CTA Frame */}
                                                <button
                                                    onClick={handleAddToProfile}
                                                    disabled={isSavingPost}
                                                    className={`w-full py-4 bg-gray-900 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 ${isSavingPost ? 'opacity-50 cursor-not-allowed' : 'hover:bg-black'}`}
                                                >
                                                    {isSavingPost ? (
                                                        <i className="fa-solid fa-circle-notch fa-spin"></i>
                                                    ) : (
                                                        <i className="fa-solid fa-user-plus"></i>
                                                    )}
                                                    {isSavingPost ? "Chargement..." : "Ajouter au profil"}
                                                </button>
                                            </div>

                                            {/* Close Temporarily Button */}
                                            <button
                                                onClick={() => setAiModalOpen(false)}
                                                className="w-full py-3 bg-white border-2 border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center justify-center gap-2"
                                            >
                                                <i className="fa-solid fa-eye-slash"></i> Fermer momentanément
                                            </button>
                                            <p className="text-[10px] text-gray-400 text-center italic">
                                                Vous pouvez réouvrir le Studio IA pour retrouver votre résultat
                                            </p>
                                        </div>
                                    </div>

                                )
                                }
                            </div>
                        </div>
                    </div>
                )
            }

            {/* MAIN MENU OVERLAY - REMOVED in favor of UniversalMenu */}

            {/* SIGN PONG REWARD MODAL */}
            <SignPongRewardModal
                isOpen={pongRewardModalOpen}
                score={pongScore}
                onClose={() => setPongRewardModalOpen(false)}
                onClaim={handleClaimPongRewards}
            />

            {/* GUEST LIMIT MODAL */}
            <GuestLimitModal
                isOpen={guestLimitModalOpen}
                onClose={() => setGuestLimitModalOpen(false)}
                onJoinClub={() => {
                    if (setIsMenuVisible) setIsMenuVisible(false);
                    if (user) {
                        onGoToRewards();
                    } else {
                        onAuthRequired();
                    }
                }}
                onNotifyMe={(email) => { setGuestLimitModalOpen(false); alert("Notification activée !"); }}
                isMember={!!user}
            />

            {/* CROPPER MODAL */}
            {
                croppingImage && (
                    <div className="fixed inset-0 z-[110] bg-black md:bg-black/90 flex flex-col items-center justify-center animate-fade-in p-4 overflow-auto">
                        <div className="bg-white p-4 rounded-xl max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-y-auto">
                            <h3 className="text-lg font-bold text-gray-900 mb-4 text-center">Rogner l'image</h3>

                            <div className="flex-1 overflow-auto bg-gray-50 rounded-lg flex justify-center mb-4 border border-gray-200">
                                <ReactCrop
                                    crop={crop}
                                    onChange={(c) => setCrop(c)}
                                    onComplete={(c) => setCompletedCrop(c)}
                                    className="max-h-[60vh] object-contain"
                                >
                                    <img
                                        ref={cropImgRef}
                                        src={croppingImage}
                                        alt="Crop target"
                                        className="max-h-[60vh] object-contain"
                                    />
                                </ReactCrop>
                            </div>

                            <div className="flex gap-3 justify-center w-full">
                                <button
                                    onClick={() => { setCroppingImage(null); setUploadedLogoPreview(null); }}
                                    className="px-6 py-3 bg-gray-100 text-gray-500 font-bold rounded-xl hover:bg-gray-200 transition-colors"
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={handleCropSave}
                                    className="px-6 py-3 bg-gray-900 text-white font-bold rounded-xl shadow-lg border-2 border-transparent hover:border-orange-500 transition-all"
                                >
                                    <i className="fa-solid fa-crop-simple mr-2"></i>Valider
                                </button>
                            </div>
                            <p className="text-center text-xs text-gray-400 mt-2">
                                Utilisez les poignées autour de l'image pour rogner.
                            </p>
                        </div>
                    </div>
                )
            }
            {
                toast && (
                    <div className={`fixed top-24 left-1/2 -translate-x-1/2 px-6 py-4 rounded-2xl shadow-2xl z-[200] flex items-center gap-3 animate-fade-in ${toast.type === 'success' ? 'bg-gray-900 text-white border border-gray-800' : 'bg-red-500 text-white'}`}>
                        <i className={`fa-solid ${toast.type === 'success' ? 'fa-check-circle text-orange-500 text-xl' : 'fa-circle-exclamation text-xl'}`}></i>
                        <span className="font-bold text-sm">{toast.msg}</span>
                    </div>
                )
            }
        </div >
    );
};



