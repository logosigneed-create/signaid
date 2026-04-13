import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

import { getProxiedUrl, resizeImage, hexToRgb, tintImage, removeBackground, removeSpecificColor, getCroppedImg, urlToBase64, addWatermark, cleanCartItem, compressCartForStorage, isSameModel, calculateBaseUnitPrice, calculateMarkingFee, dataURLtoBlob, trimImage } from '../utils/helpers';
import { getOptimizedImageUrl } from '../utils/imageUtils';
import CreationToolbar, { ToolItem } from './CreationToolbar';
import { LazyImage } from './LazyImage';

import {
    SPECIAL_CODES,
    PREDEFINED_LOGOS,
    PLACEMENT_PRESETS,
    STYLE_MATRIX,
    POSE_IMAGES,
    COLOR_NAMES
} from '../constants';

import {
    CartItem,
    User,
    PredefinedLogo,
    StyleCategory,
    PricingRules,
    LogoCreationData,
    ProductDatabase,
    TextConfig
} from '../types';


import { DraggableElement } from './DraggableElement';
import { TextRenderer } from './TextRenderer';
import { PongGame } from './PongGame';
import { LoadingScreen } from './LoadingScreen';
import { geminiService } from '../services/geminiService';
import { db } from '../firebaseConfig';
import { collection, addDoc, serverTimestamp, doc, updateDoc, increment } from 'firebase/firestore';
import { postService } from '../services/postService';
import { uploadImageBlob } from '../services/storageService';
import { vtonService } from '../services/vtonService';
import { designSharingService } from '../services/designSharingService';
import { ShareDesignModal } from './ShareDesignModal';

// @ts-ignore
// html2canvas dynamic import
// @ts-ignore
// import html2canvas from 'html2canvas';

// Lazy load GuestLimitModal to avoid circular dependencies if any, or just import
import { GuestLimitModal } from './GuestLimitModal';
import { SignPongRewardModal } from './SignPongRewardModal';
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
    function CustomizerView({ initialProductType, initialState, isRemixMode, onAddToCart, onAddToCartBatch, onBack, onPublish, onAddToWishlist, userCredits, onDeductCredits, isGuest, onAuthRequired, user, onUpdateUser, initialAiPromo, initialAiModalOpen, initialUploadOpen, productDimensions, initialStyleCategory, initialStylePrompt, setIsQuoteModalOpen, onGoToRewards, setIsMenuVisible, pricingRules, printMargin = 15, initialColor, initialTemplate, remixPostId, aiGenerating, aiResult, onGenerateAi, setAiResult, cartCount, onGoToCart, onSaveToProfile, activeLogoService, initialMode, isServiceMode, onRequestLogoService, onOpenAtelier, onUpdatePost, products }: {
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
        printMargin?: number;
        initialColor?: string;
        initialTemplate?: string;
        remixPostId?: string | null;
        initialAiModalOpen?: boolean;
        initialUploadOpen?: boolean;
        aiGenerating?: boolean;
        aiResult?: string | null;
        onGenerateAi?: (params: any) => Promise<void>;
        setAiResult?: (val: string | null) => void;
        cartCount?: number;
        onGoToCart?: () => void;
        onSaveToProfile: (imageUrl: string, prompt: string, style: string, customization?: CartItem) => Promise<void>;
        activeLogoService?: LogoCreationData | null;
        initialMode?: 'upload' | 'service' | null;
        isServiceMode?: boolean;
        onRequestLogoService?: () => void;
        onOpenAtelier?: () => void;
        onUpdatePost?: (postId: string, customization: CartItem) => Promise<void>;
        products: any;
    }) {
    const [isUpdatingPost, setIsUpdatingPost] = useState(false);
    const navigate = useNavigate();
    const sizeSelectionRef = useRef<HTMLDivElement>(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isAiViewVisible, setIsAiViewVisible] = useState(false); // New state for AI View Toggle
    const [showAiResultModal, setShowAiResultModal] = useState(false);
    const [captureLoading, setCaptureLoading] = useState(false);
    const [showAllSizes, setShowAllSizes] = useState(false);
    const [showSizeError, setShowSizeError] = useState(false);


    const [cameraTimerDelay, setCameraTimerDelay] = useState<number>(3); // 0, 3, 10
    const [shakeSizes, setShakeSizes] = useState(false);
    const [isRemovingBackground, setIsRemovingBackground] = useState(false);
    const [isPickingColor, setIsPickingColor] = useState(false);
    const [selectedStyleName, setSelectedStyleName] = useState<string>('');
    const [aiStep, setAiStep] = useState<'prompt' | 'input' | 'result'>('prompt');
    const [selectedAiPrompt, setSelectedAiPrompt] = useState<string>('');
    const [isGeneratingLocal, setIsGeneratingLocal] = useState(false);
    const [sharingLoading, setSharingLoading] = useState(false);
    const [shareShortId, setShareShortId] = useState<string | null>(null);


    // Load saved AI Result
    const [savedAiResult, setSavedAiResult] = useState<string | null>(() => {
        try {
            return localStorage.getItem('stylelink_draft_ai_result');
        } catch (e) {
            return null;
        }
    });

    // Initialize aiResult with prop or saved
    // We can't easily change the prop-based initialization if 'aiResult' is passed from parent, 
    // but 'setAiResult' is likely local if not controlled.
    // However, CustomizerView receives 'aiResult' as prop.
    // If it's controlled, we should trigger onGenerateAi or similar?
    // Looking at props: `aiResult` and `setAiResult` are optional.
    // If they are provided, parent controls it. If not, we need local state.
    // But the code uses `aiResult` directly.
    // Let's assume if it is null, we try to use saved.
    // Actually, we should probably effect-update it if we found a saved one and the prop is null.


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
                // Auto-skip to input step when triggered externally (from cart/choice modal)
                if (initialAiModalOpen) {
                    setAiStep('input');
                }
            }, 500);
        }
    }, [initialAiPromo, initialAiModalOpen]);

    // TRIGGER UPLOAD ON MOUNT IF REQUESTED
    useEffect(() => {
        if (initialUploadOpen) {
            setTimeout(() => {
                triggerUniversalInput(null, true);
            }, 1200); // 1.2s delay to ensure "Option A/B" modal fully closes
        }
    }, [initialUploadOpen]);

    // HANDLE INITIAL MODE (Service / Upload from Navbar)
    // FIX: Only trigger onOpenAtelier on FIRST mount with service mode, not on every initialMode change
    const hasOpenedAtelierRef = useRef(false);
    useEffect(() => {
        if (initialMode === 'service' && onOpenAtelier && !hasOpenedAtelierRef.current && !activeLogoService) {
            hasOpenedAtelierRef.current = true;
            setTimeout(() => {
                onOpenAtelier();
            }, 500);
        } else if (initialMode === 'upload') {
            setTimeout(() => {
                triggerUniversalInput(null, true);
            }, 500);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialMode, onOpenAtelier]);

    const getDefaultText = (): TextConfig => ({
        lines: [''], text: '', fontSize: 24, fontFamily: 'Inter', fontWeight: '700',
        textTransform: 'none' as any, color: '#000000', position: { x: 50, y: 50 }, letterSpacing: 0,
        curve: 0, lineHeight: 1.2, shadow: false, outline: false, curveStyle: 'flat', scaleY: 1
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
        logoFront2: undefined, logoBack2: undefined,
        logoFront3: undefined, logoBack3: undefined,
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
        let base: CartItem;
        if (initialState) {
            base = { ...initialState, id: generateUUID() };
        } else {
            const saved = getSavedState();
            if (saved) {
                // [FIX] Adopt personalization (logos, text) from draft even if productType mismatch
                // This ensures logos persist when the user changes product via URL or carousel
                base = {
                    ...defaultState,
                    ...saved,
                    productType: initialProductType, // Ensure correct product from URL/prop
                    color: saved.productType === initialProductType ? saved.color : (initialColor || defaultState.color)
                };
            } else {
                base = defaultState;
            }
        }

        if (isServiceMode && activeLogoService) {
            return {
                ...base,
                serviceModernisation: true, // Mapped to 100€ service (Logo de l'atelier)
                activityName: activeLogoService.activityName,
                description: activeLogoService.description,
                catalogReferences: activeLogoService.catalogReferences,
                referenceLogo: activeLogoService.referenceLogo,
                notes: `⚠️ SERVICE MODE : ${activeLogoService.activityName}\n- Ref: ${activeLogoService.catalogReferences || 'None'}\n- Desc: ${activeLogoService.description}`
            };
        }
        return base;
    });

    // AI STUDIO & STANDARD UPLOAD HANDLING
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        console.log(`[Upload] File detected: ${file?.name} (${file?.type}), Size: ${file?.size}`);

        if (file) {
            const reader = new FileReader();
            reader.onload = async (event) => {
                if (event.target?.result) {
                    let result = event.target.result as string;

                    // NEW: Auto-crop transparent backgrounds
                    try {
                        const trimmed = await trimImage(result);
                        if (trimmed && trimmed.dataUrl) result = trimmed.dataUrl;
                    } catch (err) {
                        console.warn("Auto-crop failed, using original", err);
                    }

                    // Check if we are in AI Mode
                    if (aiModalOpen || isAiViewVisible) {
                        console.log(`[AI Studio] Image captured for AI processing.`);
                        setCapturedImage(result);
                        setAiStep('input'); // Confirm step
                    } else {
                        // STANDARD UPLOAD MODE (Option A / Direct Import)
                        console.log(`[Standard Upload] Direct placement (Crop skipped by default).`);

                        // Directly place the image
                        const finalImage = result;
                        const targetIsBack = isBack; // Assuming existing state

                        const updates = targetIsBack ? {
                            originalLogoUrlBack: finalImage,
                            processedLogoUrlBack_original: finalImage,
                            processedLogoUrlBack: null,
                            backgroundRemovedBack: false, logoInvertedBack: false,
                            activeLogoColorBack: 'original',
                            processedLogoUrlBack_white: null, processedLogoUrlBack_black: null, processedLogoUrlBack_noBackground: null
                        } : {
                            originalLogoUrlFront: finalImage,
                            processedLogoUrlFront_original: finalImage,
                            processedLogoUrlFront: null,
                            backgroundRemovedFront: false, logoInvertedFront: false,
                            activeLogoColorFront: 'original',
                            processedLogoUrlFront_white: null, processedLogoUrlFront_black: null, processedLogoUrlFront_noBackground: null
                        };

                        updateItem(updates);
                        setUploadedLogoPreview(finalImage);
                        setActiveEl('logo');
                        setPendingElement(null);
                        setCroppingImage(result);
                    }
                } else {
                    console.error("[Upload] FileReader load event triggered but result is null.");
                }
            };
            reader.onerror = (error) => {
                console.error(`[Upload] FileReader error:`, error);
                alert("Erreur lors de la lecture de l'image. Veuillez réessayer.");
            };
            reader.readAsDataURL(file);
        }
        // Critical: Reset input so same file can be selected again
        e.target.value = '';
    };

    // --- HELPER: Universal Input Trigger (Mobile vs Desktop) ---
    /**
     * @param e Event
     * @param forceGallery If true, forces file picker instead of camera on mobile
     */
    const triggerUniversalInput = (e?: any, forceGallery = false) => {
        if (e && e.stopPropagation) e.stopPropagation();

        // More robust mobile detection
        const isMobile = /iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

        // Choice: Use camera input only if on mobile AND not forcing gallery (e.g. AI Studio vs standard Upload)
        const inputId = (isMobile && !forceGallery) ? 'hidden-camera-input-mobile' : 'hidden-file-input-desktop';

        console.log(`[Universal Input] Triggering: ${inputId} (isMobile: ${isMobile}, forceGallery: ${forceGallery})`);

        const input = document.getElementById(inputId);
        if (input) {
            input.click();
        } else {
            console.error(`[Universal Input] Element not found: ${inputId}`);
            // Fallback: try the other one
            const fallbackId = (isMobile && !forceGallery) ? 'hidden-file-input-desktop' : 'hidden-camera-input-mobile';
            document.getElementById(fallbackId)?.click();
        }
    };

    // --- EFFECT: Switch to Canvas if color changes, but KEEP AI result for toggle ---
    const lastColorRef = useRef(item.color);
    useEffect(() => {
        if (item.color !== lastColorRef.current) {
            // Un-toggle AI view so user sees the new color on the 3D model immediately
            setIsAiViewVisible(false);

            // WE NO LONGER CLEAR AI RESULT HERE. 
            // This allows the user to "toggle" back to the old AI result momentarily.
            lastColorRef.current = item.color;
        }
    }, [item.color]);

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

    // Save to local storage on change with DEBOUNCE
    useEffect(() => {
        const timer = setTimeout(() => {
            try {
                // Prepare clean version for LS to prevent quota crash
                const clean = cleanCartItem(item);
                localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));

                if (aiResult) {
                    if (aiResult.length < 2000000) { // 2MB roughly
                        localStorage.setItem('stylelink_draft_ai_result', aiResult);
                    }
                } else {
                    localStorage.removeItem('stylelink_draft_ai_result');
                }
            } catch (e) {
                console.warn("Draft save quota warning", e);
            }
        }, 1000); // 1 second debounce

        return () => clearTimeout(timer);
    }, [item, aiResult]);

    // Restore AI Result on mount if prop is null
    useEffect(() => {
        if (!aiResult && setAiResult) {
            const saved = localStorage.getItem('stylelink_draft_ai_result');
            if (saved) {
                setAiResult(saved);
            }
        }
    }, []);


    // --- PERSISTENCE LOGIC END ---

    const [isBack, setIsBack] = useState(initialState?.previewImageUrlBack ? true : false);
    const [activeView, setActiveView] = useState<'front' | 'back'>('front');

    // AI Color Warning State
    const [targetColor, setTargetColor] = useState<string | null>(null);
    // Mobile-specific state
    const [cameraModalOpen, setCameraModalOpen] = useState(false);
    const [activeEl, setActiveEl] = useState<string | null>(null);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [activeToolId, setActiveToolId] = useState<string | null>(null);
    const [showCartTooltip, setShowCartTooltip] = useState(false);
    const [aiModalOpen, setAiModalOpen] = useState(initialAiModalOpen);
    const [showValidateOptions, setShowValidateOptions] = useState(false);
    const [isDesktopSizeOpen, setIsDesktopSizeOpen] = useState(false); // Desktop Size Dropdown State
    const [showSizeGuide, setShowSizeGuide] = useState(false);

    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [processedProductImages, setProcessedProductImages] = useState<Record<string, {
        dataUrl: string,
        widthRatio: number,
        heightRatio: number,
        cropTop: number,
        cropLeft: number,
        originalWidth: number,
        originalHeight: number
    }>>({});
    const [lastUserImage, setLastUserImage] = useState<string | null>(null);
    const [uploadedGarment, setUploadedGarment] = useState<string | null>(null);
    const [isCapturing, setIsCapturing] = useState(false);
    const [flashActive, setFlashActive] = useState(false);

    // SYNC URL WITH PRODUCT STATE
    useEffect(() => {
        if (!initialProductType) return; // Don't run on very first mount if not ready

        const currentParams = new URLSearchParams(window.location.search);
        const urlProduct = currentParams.get('product');

        // GUARD: If internal state is the default (tshirt) but the URL requested something else,
        // DO NOT overwrite the URL yet. Wait for CustomizerApp to finish its resolution from Firestore.
        if (item.productType === 'tshirt' && urlProduct && !urlProduct.startsWith('tshirt')) {
            console.log('[Sync] Blocking URL overwrite - waiting for product resolution from database...', urlProduct);
            return;
        }

        const cleanColor = (item.color || 'black').replace('#', '');

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
        // Logic: Replace current URL without reload using navigate to trigger router updates
        const newSearch = `?${currentParams.toString()}`;
        navigate({ search: newSearch }, { replace: true });

    }, [item.productType, item.color, remixPostId, navigate, initialProductType, isRemixMode]);

    // --- AUTO-CROP PRODUCT IMAGES ---
    useEffect(() => {
        if (!products || !item.productType) return;

        const side = isBack ? 'back' : 'front';
        const color = item.color || 'black';
        const cacheKey = `${item.productType}_${color}_${side}`;

        if (processedProductImages[cacheKey]) return;

        const productData = products[item.productType];
        if (!productData) return;

        const rawUrl = isBack ?
            (productData.backImages && (productData.backImages[color] || Object.values(productData.backImages)[0])) || (productData.images[color] || Object.values(productData.images)[0])
            :
            (productData.images[color] || Object.values(productData.images)[0]);

        if (!rawUrl) return;

        const processProductImage = async () => {
            try {
                // Use optimized and proxied URL for processing
                const urlToProcess = getProxiedUrl(getOptimizedImageUrl(rawUrl, 800));
                const trimmed = await trimImage(urlToProcess);
                if (trimmed && trimmed.dataUrl) {
                    setProcessedProductImages(prev => ({
                        ...prev,
                        [cacheKey]: trimmed // Store full object
                    }));
                }
            } catch (err) {
                console.warn(`[Auto-Crop] Failed for ${cacheKey}`, err);
            }
        };

        processProductImage();
    }, [item.productType, item.color, isBack, products, processedProductImages]);

    // --- OVERLAY DRAG STATES ---
    const [isGrouped, setIsGrouped] = useState(false);
    const dragSnapshots = useRef<any>(null);
    const [groupElementDims, setGroupElementDims] = useState<{ [id: string]: { w: number, h: number } }>({});

    const handleReportDimensions = useCallback((id: string, w: number, h: number) => {
        setGroupElementDims(prev => {
            if (prev[id]?.w === w && prev[id]?.h === h) return prev;
            return { ...prev, [id]: { w, h } };
        });
    }, []);
    const [panelOffsets, setPanelOffsets] = useState<{ [key: string]: { x: number, y: number } }>({
        import: { x: 0, y: 0 },
        text: { x: 0, y: 0 },
        code: { x: 0, y: 0 }
    });
    const [userIp, setUserIp] = useState('');
    const ADMIN_IPS = [
        '178.51.238.204',
        'localhost',
        '127.0.0.1'
    ];
    const dragRef = useRef<{ isDragging: boolean, startX: number, startY: number, initialX: number, initialY: number, activeId: string | null }>({
        isDragging: false,
        startX: 0,
        startY: 0,
        initialX: 0,
        initialY: 0,
        activeId: null
    });

    // --- UNDO/REDO SYSTEM ---
    const [undoStack, setUndoStack] = useState<CartItem[]>([]);
    const [redoStack, setRedoStack] = useState<CartItem[]>([]);

    const saveHistory = useCallback(() => {
        setUndoStack(prev => {
            // Limit history to 30 steps
            const newHistory = [...prev, JSON.parse(JSON.stringify(item))];
            if (newHistory.length > 30) return newHistory.slice(newHistory.length - 30);
            return newHistory;
        });
        setRedoStack([]); // Clear redo stack on new action
    }, [item]);

    const undo = useCallback(() => {
        if (undoStack.length === 0) return;
        const last = undoStack[undoStack.length - 1];
        setRedoStack(prev => [...prev, JSON.parse(JSON.stringify(item))]);
        setUndoStack(prev => prev.slice(0, prev.length - 1));
        setItem(last);
    }, [undoStack, item]);

    const redo = useCallback(() => {
        if (redoStack.length === 0) return;
        const next = redoStack[redoStack.length - 1];
        setUndoStack(prev => [...prev, JSON.parse(JSON.stringify(item))]);
        setRedoStack(prev => prev.slice(0, prev.length - 1));
        setItem(next);
    }, [redoStack, item]);

    const handlePanelDragStart = (e: React.PointerEvent, panelId: string) => {
        // Only trigger on header, not on inputs
        if ((e.target as HTMLElement).closest('input, button, textarea, .no-drag')) return;

        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        dragRef.current = {
            isDragging: true,
            startX: e.clientX,
            startY: e.clientY,
            initialX: panelOffsets[panelId].x,
            initialY: panelOffsets[panelId].y,
            activeId: panelId
        };
    };

    const handlePanelDragMove = (e: React.PointerEvent) => {
        if (!dragRef.current.isDragging || !dragRef.current.activeId) return;

        const dx = e.clientX - dragRef.current.startX;
        const dy = e.clientY - dragRef.current.startY;

        const activeId = dragRef.current.activeId;
        setPanelOffsets(prev => ({
            ...prev,
            [activeId]: {
                x: dragRef.current.initialX + dx,
                y: Math.max(-400, dragRef.current.initialY + dy) // Allow dragging up (negative Y) to reveal scrollable content
            }
        }));
    };

    const handlePanelDragEnd = (e: React.PointerEvent) => {
        if (!dragRef.current.isDragging) return;
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
        dragRef.current.isDragging = false;
        dragRef.current.activeId = null;
    };

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
        if (aiModalOpen || previewImage) {
            if (document.body) document.body.style.overflow = 'hidden';
        } else {
            if (document.body) document.body.style.overflow = '';
        }
        return () => { if (document.body) document.body.style.overflow = ''; };
    }, [aiModalOpen, previewImage]);

    useEffect(() => {
        if (setIsMenuVisible) {
            // Hide global menu on mobile when in customizer to make room for sticky bar
            const isMobileView = window.innerWidth < 1024;
            if (isMobileView) {
                setIsMenuVisible(false);
            } else {
                setIsMenuVisible(!aiModalOpen);
            }
        }
        return () => {
            if (setIsMenuVisible) setIsMenuVisible(true);
        };
    }, [aiModalOpen, setIsMenuVisible]);


    const previewRef = useRef<HTMLDivElement>(null);

    const [publishCaption, setPublishCaption] = useState('');
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
    const [countdown, setCountdown] = useState<number | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [selectedSizes, setSelectedSizes] = useState<Record<string, number>>(() => {
        return initialState?.sizes || {};
    });
    // Preview Size for Real World Dimensions
    const [previewSize, setPreviewSize] = useState<string>('L');
    const [colorPage, setColorPage] = useState(0);

    // --- ZOOM LOGIC ---
    const [specialCodeFront, setSpecialCodeFront] = useState('');
    const [specialCodeBack, setSpecialCodeBack] = useState('');
    const [showLogoGallery, setShowLogoGallery] = useState(false);
    const [filteredLogos, setFilteredLogos] = useState<PredefinedLogo[]>([]);
    const [pendingElement, setPendingElement] = useState<{ type: 'logo' | 'text', content?: string, predefined?: boolean } | null>(null);

    const [activeStyleCategory, setActiveStyleCategory] = useState<StyleCategory>((initialStyleCategory as StyleCategory) || ('Réaliste' as StyleCategory));

    const toolScrollRef = useRef<HTMLDivElement>(null);
    const colorScrollRef = useRef<HTMLDivElement>(null);
    const aiCategoryScrollRef = useRef<HTMLDivElement>(null);
    const aiStyleScrollRef = useRef<HTMLDivElement>(null);
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

    const [zoomLevel, setZoomLevel] = useState(0.8);
    const zoomIntervalRef = useRef<NodeJS.Timeout | null>(null);

    const [showGuides, setShowGuides] = useState(false);
    const [isMeasureToolActive, setIsMeasureToolActive] = useState(false);
    const [activePanel, setActivePanel] = useState<'none' | 'import' | 'text' | 'code' | 'category' | 'ai' | 'service_summary'>('none');

    // Auto-scroll to panel on Mobile when active
    useEffect(() => {
        if (activePanel !== 'none' && window.innerWidth < 1024) {
            setTimeout(() => {
                let el = null;
                if (activePanel === 'import') el = document.querySelector('[data-layout-id="desktop-panel-import"]');
                if (activePanel === 'text') el = document.querySelector('[data-layout-id="desktop-panel-text"]');
                if (activePanel === 'code') el = document.querySelector('[data-layout-id="desktop-panel-code"]');

                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 100);
        }
    }, [activePanel]);

    // Center active color in mobile carousel
    useEffect(() => {
        if (colorScrollRef.current && window.innerWidth < 1024) {
            const container = colorScrollRef.current;
            // Use querySelector because the buttons are rendered dynamically
            const activeItem = container.querySelector(`[data-color="${item.color}"]`);
            if (activeItem) {
                activeItem.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            }
        }
    }, [item.color]);
    const [textOptionsOpen, setTextOptionsOpen] = useState(false);
    const [workshopOpen, setWorkshopOpen] = useState(false);
    useEffect(() => {
        if (isServiceMode && activeLogoService) {
            setWorkshopOpen(true);
            // Force Import Panel Open (Standard "Atelier" Panel)
            setActivePanel('service_summary');
            // Sync Data
            setItem(prev => ({
                ...prev,
                serviceModernisation: true,
                activityName: activeLogoService.activityName,
                description: activeLogoService.description,
                catalogReferences: activeLogoService.catalogReferences,
                referenceLogo: activeLogoService.referenceLogo,
                notes: `⚠️ SERVICE MODE : ${activeLogoService.activityName}\n- Ref: ${activeLogoService.catalogReferences || 'None'}\n- Desc: ${activeLogoService.description}`
            }));
        }
    }, [isServiceMode, activeLogoService]);

    // Handle initial mode navigation
    useEffect(() => {
        if (initialMode === 'upload') {
            setActivePanel('import');
        } else if (initialMode === 'service') {
            setActivePanel('service_summary');
            setWorkshopOpen(true);
        }
    }, [initialMode]);

    const handleAddToCart = () => {
        // Validation for Sizes
        const totalQty = Object.values(selectedSizes).reduce((acc, qty) => acc + qty, 0);
        if (totalQty === 0) {
            setShowSizeError(true);
            // Flash shake
            setShakeSizes(true);
            setTimeout(() => setShakeSizes(false), 500);

            // If on mobile, scroll to size selector
            if (window.innerWidth < 1024) {
                const el = document.getElementById('size-selector-mobile');
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            return;
        }

        onAddToCart(item);
    };
    const [uploadedLogoPreview, setUploadedLogoPreview] = useState<string | null>(null);
    const [codeLogoPreview, setCodeLogoPreview] = useState<string | null>(null);
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
    // AI RESULT PERSISTENCE
    useEffect(() => {
        const saved = localStorage.getItem('stylelink_draft_ai_result');
        if (saved && !aiResult) {
            // Optional: Auto-restore or just set a flag? 
            // Let's just log it or have a state "canRestore"
        }
    }, []);

    // Save Result
    useEffect(() => {
        if (aiResult) {
            localStorage.setItem('stylelink_draft_ai_result', aiResult);
        }
    }, [aiResult]);

    const restoreLastAiResult = () => {
        const saved = localStorage.getItem('stylelink_draft_ai_result');
        if (saved && setAiResult) setAiResult(saved);
    };



    const currentAiResult = (isBack ? item.aiImageUrlBack : item.aiImageUrlFront);

    // --- GUEST AI CACHE (Contextual Persistence) ---
    // Stores the last AI generation result for guests, per view (Front/Back).
    const [guestAiCache, setGuestAiCache] = useState<{
        front?: { productId: string; color: string; result: string };
        back?: { productId: string; color: string; result: string };
    }>({});

    // Flatten styles for single line display - Filter out styles WITHOUT images
    const allStyles = useMemo(() => {
        const list: { category: string, style: any }[] = [];
        Object.entries(STYLE_MATRIX).forEach(([cat, styles]) => {
            // Only add styles that have a truthy image property
            styles.filter(s => s.image).forEach(s => list.push({ category: cat, style: s }));
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
        if (croppingImage && cropImgRef.current) {
            try {
                let finalImage = croppingImage;

                // Only crop if a valid crop area exists
                if (completedCrop?.width && completedCrop?.height) {
                    console.log("[Crop] Starting crop save...", completedCrop);
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

                    finalImage = await getCroppedImg(croppingImage, scaledCrop);
                } else {
                    console.log("[Crop] No crop area selected. Using full image.");
                }

                // Auto-place the cropped logo
                const targetIsBack = isBack;

                const updates = targetIsBack ? {
                    // Update processed version AND original for display
                    processedLogoUrlBack_original: finalImage,
                    originalLogoUrlBack: finalImage,

                    // Reset other processed states
                    backgroundRemovedBack: false, logoInvertedBack: false,
                    processedLogoUrlBack: null, // Clear active processed image
                    activeLogoColorBack: 'original', // RESET COLOR
                    processedLogoUrlBack_white: null, processedLogoUrlBack_black: null, processedLogoUrlBack_noBackground: null
                } : {
                    processedLogoUrlFront_original: finalImage,
                    originalLogoUrlFront: finalImage,

                    backgroundRemovedFront: false, logoInvertedFront: false,
                    processedLogoUrlFront: null, // Clear active processed image
                    activeLogoColorFront: 'original', // RESET COLOR
                    processedLogoUrlFront_white: null, processedLogoUrlFront_black: null, processedLogoUrlFront_noBackground: null
                };

                updateItem(updates);
                setUploadedLogoPreview(finalImage);
                setActiveEl('logo');

                setPendingElement(null); // Clear any pending
                setCroppingImage(null); // Close modal
                setCrop(undefined);
            } catch (e) {
                console.error("[Crop Save Error]", e);
                alert("Une erreur est survenue lors de la validation du logo. Veuillez réessayer ou utiliser une autre image.");
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

    const product = products[item.productType];

    const updateItem = useCallback((updates: Partial<CartItem>) => {
        setItem(prev => ({ ...prev, ...updates }));
    }, []);

    // Helper for simple actions that should be undoable immediately (color change, etc.)
    const updateItemUndoable = useCallback((updates: Partial<CartItem>) => {
        saveHistory();
        setItem(prev => ({ ...prev, ...updates }));
    }, [saveHistory]);

    const activePricing = useMemo(() => {
        if (!product) return { total: 0, subtotal: 0, services: 0, pieces: 0, garmentPart: 0, markingPart: 0 };
        let subtotal = 0;
        let pieces = 0;

        // Calculate total pieces first to handle lot pricing (bulk discounts) correctly
        const totalQty = Object.values(selectedSizes).reduce((a, b) => (a as number) + (b as number), 0);

        Object.entries(selectedSizes).forEach(([size, quantity]) => {
            const qty = quantity as number;
            if (qty <= 0) return;

            const p = calculateBaseUnitPrice(product, size, item.color, pricingRules, totalQty);
            subtotal += qty * p;
            pieces += qty;
        });

        let services = 0;
        if (item.serviceRetouche || item.isRetouchingService) services += 50;
        if (item.serviceModernisation || item.isModernizationService) services += 100;

        // NEW PRICING LOGIC: Additive fees instead of percentage split
        const combinedFee = calculateMarkingFee(item);

        const garmentPart = subtotal; // Subtotal represents the textile price before fees
        const markingPart = combinedFee * pieces; // Fee per piece (Total marking for all pieces)
        const total = garmentPart + markingPart + services;

        return { total, subtotal: garmentPart, services, pieces, garmentPart, markingPart };
    }, [selectedSizes, item.serviceRetouche, item.serviceModernisation, item.isRetouchingService, item.isModernizationService, item.calculatedPrice, item.color, item.productType, product, pricingRules]);

    const getGroupBoundingBox = () => {
        if (!isGrouped) return null;

        const elements = isBack
            ? [
                { id: 'logo', x: item.logoPositionXBack, y: item.logoPositionYBack, active: !!(item.predefinedLogoUrlBack || item.originalLogoUrlBack) },
                { id: 'logoBack2', x: item.logoBack2?.position.x || 0, y: item.logoBack2?.position.y || 0, active: !!(item.logoBack2?.originalUrl || item.logoBack2?.predefinedUrl) },
                { id: 'logoBack3', x: item.logoBack3?.position.x || 0, y: item.logoBack3?.position.y || 0, active: !!(item.logoBack3?.originalUrl || item.logoBack3?.predefinedUrl) },
                { id: 'text', x: item.textBack.position.x, y: item.textBack.position.y, active: !!item.textBack.text },
                { id: 'text2', x: item.textBack2?.position.x, y: item.textBack2?.position.y, active: !!item.textBack2?.text },
                { id: 'text3', x: item.textBack3?.position.x, y: item.textBack3?.position.y, active: !!item.textBack3?.text }
            ]
            : [
                { id: 'logo', x: item.logoPositionXFront, y: item.logoPositionYFront, active: !!(item.predefinedLogoUrlFront || item.originalLogoUrlFront) },
                { id: 'logoFront2', x: item.logoFront2?.position.x || 0, y: item.logoFront2?.position.y || 0, active: !!(item.logoFront2?.originalUrl || item.logoFront2?.predefinedUrl) },
                { id: 'logoFront3', x: item.logoFront3?.position.x || 0, y: item.logoFront3?.position.y || 0, active: !!(item.logoFront3?.originalUrl || item.logoFront3?.predefinedUrl) },
                { id: 'text', x: item.textFront.position.x, y: item.textFront.position.y, active: !!item.textFront.text },
                { id: 'text2', x: item.textFront2?.position.x, y: item.textFront2?.position.y, active: !!item.textFront2?.text },
                { id: 'text3', x: item.textFront3?.position.x, y: item.textFront3?.position.y, active: !!item.textFront3?.text }
            ];

        const activeElements = elements.filter(e => e.active);
        if (activeElements.length === 0) return null;

        const realHeight = productDimensions?.[item.productType]?.[previewSize] || 70;
        const realWidth = realHeight * 0.75; // Aspect Ratio 3:4
        const CM_TO_PERCENT = 100 / realWidth;

        let minX = 100, minY = 100, maxX = 0, maxY = 0;

        activeElements.forEach(el => {
            const dims = groupElementDims[el.id] || { w: 5, h: 5 }; // Fallback
            const hw = (dims.w * CM_TO_PERCENT) / 2;
            const hh = (dims.h * CM_TO_PERCENT) / 2;

            minX = Math.min(minX, (el.x ?? 0) - hw);
            minY = Math.min(minY, (el.y ?? 0) - hh);
            maxX = Math.max(maxX, (el.x ?? 0) + hw);
            maxY = Math.max(maxY, (el.y ?? 0) + hh);
        });

        const widthCm = (maxX - minX) / CM_TO_PERCENT;
        const heightCm = (maxY - minY) / CM_TO_PERCENT;
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;

        return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY, widthCm, heightCm, centerX, centerY };
    };

    const handleDragStart = (id: string) => {
        if (isBack) {
            dragSnapshots.current = {
                logo: { x: item.logoPositionXBack, y: item.logoPositionYBack },
                logoBack2: { x: item.logoBack2?.position.x || 0, y: item.logoBack2?.position.y || 0 },
                logoBack3: { x: item.logoBack3?.position.x || 0, y: item.logoBack3?.position.y || 0 },
                text: { x: item.textBack.position.x, y: item.textBack.position.y },
                text2: { x: item.textBack2?.position.x, y: item.textBack2?.position.y },
                text3: { x: item.textBack3?.position.x, y: item.textBack3?.position.y }
            };
        } else {
            dragSnapshots.current = {
                logo: { x: item.logoPositionXFront, y: item.logoPositionYFront },
                logoFront2: { x: item.logoFront2?.position.x || 0, y: item.logoFront2?.position.y || 0 },
                logoFront3: { x: item.logoFront3?.position.x || 0, y: item.logoFront3?.position.y || 0 },
                text: { x: item.textFront.position.x, y: item.textFront.position.y },
                text2: { x: item.textFront2?.position.x, y: item.textFront2?.position.y },
                text3: { x: item.textFront3?.position.x, y: item.textFront3?.position.y }
            };
        }
    };

    const handleDragUpdate = (dx: number, dy: number) => {
        if (!dragSnapshots.current) return;
        const s = dragSnapshots.current;
        const updates: any = {};

        const move = (old: { x: number, y: number }) => ({
            x: Math.min(100, Math.max(0, old.x + dx)),
            y: Math.min(100, Math.max(0, old.y + dy))
        });

        if (isBack) {
            if (s.logo) { updates.logoPositionXBack = move(s.logo).x; updates.logoPositionYBack = move(s.logo).y; }
            if (s.logoBack2 && item.logoBack2) updates.logoBack2 = { ...item.logoBack2, position: move(s.logoBack2) };
            if (s.logoBack3 && item.logoBack3) updates.logoBack3 = { ...item.logoBack3, position: move(s.logoBack3) };
            if (s.text) updates.textBack = { ...item.textBack, position: move(s.text) };
            if (s.text2 && item.textBack2) updates.textBack2 = { ...item.textBack2, position: move(s.text2) };
            if (s.text3 && item.textBack3) updates.textBack3 = { ...item.textBack3, position: move(s.text3) };
        } else {
            if (s.logo) { updates.logoPositionXFront = move(s.logo).x; updates.logoPositionYFront = move(s.logo).y; }
            if (s.logoFront2 && item.logoFront2) updates.logoFront2 = { ...item.logoFront2, position: move(s.logoFront2) };
            if (s.logoFront3 && item.logoFront3) updates.logoFront3 = { ...item.logoFront3, position: move(s.logoFront3) };
            if (s.text) updates.textFront = { ...item.textFront, position: move(s.text) };
            if (s.text2 && item.textFront2) updates.textFront2 = { ...item.textFront2, position: move(s.text2) };
            if (s.text3 && item.textFront3) updates.textFront3 = { ...item.textFront3, position: move(s.text3) };
        }

        updateItem(updates);
    };

    const groupResizeInfo = useRef<any>(null);
    const handleGroupResizeStart = (e: React.MouseEvent | React.TouchEvent) => {
        const box = getGroupBoundingBox();
        if (!box) return;

        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

        // Snapshot all elements
        const snapshot: any = {};
        if (isBack) {
            snapshot.logo = { size: item.logoSizeBack, x: item.logoPositionXBack, y: item.logoPositionYBack, active: !!(item.predefinedLogoUrlBack || item.originalLogoUrlBack) };
            snapshot.text = { size: item.textBack.fontSize, x: item.textBack.position.x, y: item.textBack.position.y, active: !!item.textBack.text };
            snapshot.text2 = { size: item.textBack2?.fontSize || 0, x: item.textBack2?.position.x || 0, y: item.textBack2?.position.y || 0, active: !!item.textBack2?.text };
            snapshot.text3 = { size: item.textBack3?.fontSize || 0, x: item.textBack3?.position.x || 0, y: item.textBack3?.position.y || 0, active: !!item.textBack3?.text };
        } else {
            snapshot.logo = { size: item.logoSizeFront, x: item.logoPositionXFront, y: item.logoPositionYFront, active: !!(item.predefinedLogoUrlFront || item.originalLogoUrlFront) };
            snapshot.text = { size: item.textFront.fontSize, x: item.textFront.position.x, y: item.textFront.position.y, active: !!item.textFront.text };
            snapshot.text2 = { size: item.textFront2?.fontSize || 0, x: item.textFront2?.position.x || 0, y: item.textFront2?.position.y || 0, active: !!item.textFront2?.text };
            snapshot.text3 = { size: item.textFront3?.fontSize || 0, x: item.textFront3?.position.x || 0, y: item.textFront3?.position.y || 0, active: !!item.textFront3?.text };
        }

        groupResizeInfo.current = {
            startX: clientX,
            startY: clientY,
            box,
            snapshot
        };

        const previewRect = document.getElementById('preview-container')?.getBoundingClientRect();
        if (!previewRect) return;

        // Calculate center once
        const centerX = box.centerX * (previewRect.width / 100) + previewRect.left;
        const centerY = box.centerY * (previewRect.height / 100) + previewRect.top;

        const handleMove = (me: MouseEvent | TouchEvent) => {
            if (!groupResizeInfo.current) return;
            const info = groupResizeInfo.current;
            const curX = 'touches' in me ? me.touches[0].clientX : (me as MouseEvent).clientX;
            const curY = 'touches' in me ? me.touches[0].clientY : (me as MouseEvent).clientY;

            const startDist = Math.hypot(info.startX - centerX, info.startY - centerY);
            const curDist = Math.hypot(curX - centerX, curY - centerY);
            if (startDist < 5) return;

            const scale = curDist / startDist;
            const updates: Partial<CartItem> = {};

            Object.entries(info.snapshot).forEach(([id, data]: [string, any]) => {
                if (!data.active) return;

                const relX = data.x - info.box.centerX;
                const relY = data.y - info.box.centerY;

                const newX = info.box.centerX + relX * scale;
                const newY = info.box.centerY + relY * scale;
                const newSize = data.size * scale;

                if (id === 'logo') {
                    if (isBack) {
                        updates.logoPositionXBack = newX;
                        updates.logoPositionYBack = newY;
                        updates.logoSizeBack = newSize;
                    } else {
                        updates.logoPositionXFront = newX;
                        updates.logoPositionYFront = newY;
                        updates.logoSizeFront = newSize;
                    }
                } else {
                    const key = id === 'text' ? (isBack ? 'textBack' : 'textFront') : (id === 'text2' ? (isBack ? 'textBack2' : 'textFront2') : (isBack ? 'textBack3' : 'textFront3'));
                    // Use functional update to avoid stale item closure
                    setItem(prev => {
                        const currentText = (prev as any)[key];
                        return {
                            ...prev,
                            [key]: {
                                ...currentText,
                                position: { x: newX, y: newY },
                                fontSize: newSize
                            }
                        };
                    });
                }
            });

            // For logo, we can batch it
            if (Object.keys(updates).length > 0) {
                updateItem(updates);
            }
        };

        const handleUp = () => {
            groupResizeInfo.current = null;
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('mouseup', handleUp);
            window.removeEventListener('touchmove', handleMove);
            window.removeEventListener('touchend', handleUp);
        };

        window.addEventListener('mousemove', handleMove);
        window.addEventListener('mouseup', handleUp);
        window.addEventListener('touchmove', handleMove, { passive: false });
        window.addEventListener('touchend', handleUp);
    };

    const updateText = (updates: any) => {
        const isText2 = activeEl === 'text2';
        const isText3 = activeEl === 'text3';
        const targetKey = isBack
            ? (isText3 ? 'textBack3' : (isText2 ? 'textBack2' : 'textBack'))
            : (isText3 ? 'textFront3' : (isText2 ? 'textFront2' : 'textFront'));
        // @ts-ignore
        const currentText = item[targetKey] || getDefaultText();
        const newText = { ...currentText, ...updates };
        // @ts-ignore
        updateItemUndoable({ [targetKey]: newText });
    };

    const removeText = () => {
        const emptyText = getDefaultText();
        const isText2 = activeEl === 'text2';
        const isText3 = activeEl === 'text3';
        const targetKey = isBack
            ? (isText3 ? 'textBack3' : (isText2 ? 'textBack2' : 'textBack'))
            : (isText3 ? 'textFront3' : (isText2 ? 'textFront2' : 'textFront'));
        // @ts-ignore
        updateItemUndoable({ [targetKey]: emptyText });
        setTextOptionsOpen(false);
        setActiveEl(null);
    };

    const removeLogo = () => {
        const wasPredefined = isBack ? item.isPredefinedLogoBack : item.isPredefinedLogoFront;
        if (isBack) {
            updateItemUndoable({
                originalLogoUrlBack: null, processedLogoUrlBack_original: null,
                isPredefinedLogoBack: false, predefinedLogoUrlBack: null
            });
        } else {
            updateItemUndoable({
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

    const colors = product ? Object.keys(product.images) : [];
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
        const defaults = { x: 50, y: 40, scale: 50 };
        const updates = isBack ? {
            originalLogoUrlBack: dataUrl,
            processedLogoUrlBack_original: dataUrl,
            isPredefinedLogoBack: false,
            predefinedLogoUrlBack: null,
            logoPositionXBack: defaults.x, logoPositionYBack: defaults.y, logoSizeBack: defaults.scale,
            backgroundRemovedBack: false, logoInvertedBack: false,
            processedLogoUrlBack: null,
            processedLogoUrlBack_white: null, processedLogoUrlBack_black: null, processedLogoUrlBack_noBackground: null,
            activeLogoColorBack: 'original'
        } : {
            originalLogoUrlFront: dataUrl,
            processedLogoUrlFront_original: dataUrl,
            isPredefinedLogoFront: false,
            predefinedLogoUrlFront: null,
            logoPositionXFront: defaults.x, logoPositionYFront: defaults.y, logoSizeFront: defaults.scale,
            backgroundRemovedFront: false, logoInvertedFront: false,
            processedLogoUrlFront: null,
            processedLogoUrlFront_white: null, processedLogoUrlFront_black: null, processedLogoUrlFront_noBackground: null,
            activeLogoColorFront: 'original'
        };
        updateItem(updates);
        setUploadedLogoPreview(dataUrl);
        setActiveEl('logo');
        logAnalyticsEvent('upload_design', { user_type: isGuest ? 'guest' : 'member' });
        setCameraModalOpen(false);
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
        updateItemUndoable(isBack
            ? { predefinedLogoUrlBack: url, originalLogoUrlBack: null, processedLogoUrlBack: null, processedLogoUrlBack_original: url, isPredefinedLogoBack: true, logoPositionXBack: 50, logoPositionYBack: 50, activeLogoColorBack: 'original' }
            : { predefinedLogoUrlFront: url, originalLogoUrlFront: null, processedLogoUrlFront: null, processedLogoUrlFront_original: url, isPredefinedLogoFront: true, logoPositionXFront: 50, logoPositionYFront: 50, activeLogoColorFront: 'original' }
        );
        setCodeLogoPreview(url);
        setActiveEl('logo');
    };

    const handleLogoColorChange = async (colorName: string) => {
        const sideKey = isBack ? 'Back' : 'Front';

        let sourceUrl: string | null = null;
        let backgroundRemoved = false;
        let transparentUrl: string | null = null;
        let originalUrl: string | null = null;

        backgroundRemoved = isBack ? (item.backgroundRemovedBack ?? false) : (item.backgroundRemovedFront ?? false);
        transparentUrl = isBack ? (item.processedLogoUrlBack_noBackground ?? null) : (item.processedLogoUrlFront_noBackground ?? null);
        originalUrl = (item as any)[`processedLogoUrl${sideKey}_original`] || (item as any)[`originalLogoUrl${sideKey}`] || (item as any)[`predefinedLogoUrl${sideKey}`];

        sourceUrl = (backgroundRemoved && transparentUrl) ? transparentUrl : originalUrl;
        if (!sourceUrl) return;

        // Optimistic UI update
        updateItemUndoable(isBack ? { activeLogoColorBack: colorName } : { activeLogoColorFront: colorName });

        let newProcessedUrl = null;
        if (colorName === 'original' || colorName === 'transparent') {
            newProcessedUrl = transparentUrl || originalUrl;
        } else {
            try {
                newProcessedUrl = await processLogoColor(sourceUrl, colorName);
            } catch (e) {
                console.error("Color processing failed", e);
            }
        }

        const updates: any = {};
        updates[`processedLogoUrl${sideKey}`] = newProcessedUrl;
        updateItem(updates); // No undo here as it's the second part of the same action
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
                processedLogoUrlBack: null,
                activeLogoColorBack: 'original'
            } : {
                originalLogoUrlFront: pendingElement.predefined ? null : pendingElement.content,
                processedLogoUrlFront_original: pendingElement.content!,
                isPredefinedLogoFront: pendingElement.predefined,
                predefinedLogoUrlFront: pendingElement.predefined ? pendingElement.content : null,
                logoSizeFront: settings.scale, logoPositionXFront: settings.x, logoPositionYFront: settings.y,
                backgroundRemovedFront: false, logoInvertedFront: false,
                processedLogoUrlFront: null,
                activeLogoColorFront: 'original'
            };
            updateItemUndoable(updates);
            setActiveEl('logo');
        } else {
            const newText = targetIsBack ? { ...item.textBack } : { ...item.textFront };
            newText.text = 'VOTRE TEXTE';
            newText.position = { x: 50, y: settings.y };
            newText.fontSize = zone === 'heart' ? 16 : 24;
            updateItemUndoable(targetIsBack ? { textBack: newText } : { textFront: newText });
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
        await new Promise(resolve => setTimeout(resolve, 800)); // Standardized delay for transitions

        // --- PRE-BAKE SVGs (Fix for iOS/WebKit <textPath> bug) ---
        // We must replace SVGs with Canvases in the REAL DOM before html2canvas runs, 
        // because we need to await the async image loading.
        const originalSvgs: { parent: Element, svg: Node, placeholder: HTMLCanvasElement }[] = [];
        const svgs = previewRef.current.querySelectorAll('svg');

        if (svgs.length > 0) {
            try {
                const svgPromises = Array.from(svgs).map(svg => {
                    return new Promise<void>((resolve) => {
                        const rect = svg.getBoundingClientRect();
                        const width = rect.width || parseInt(svg.getAttribute('width') || '0');
                        const height = rect.height || parseInt(svg.getAttribute('height') || '0');

                        if (width <= 0 || height <= 0) {
                            resolve();
                            return;
                        }

                        const serializer = new XMLSerializer();
                        const svgString = serializer.serializeToString(svg);
                        const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
                        const url = URL.createObjectURL(svgBlob);

                        const img = new Image();
                        img.onload = () => {
                            const canvas = document.createElement('canvas');
                            canvas.width = width;
                            canvas.height = height;
                            canvas.className = svg.className.baseVal || '';
                            canvas.style.cssText = svg.style.cssText;

                            const ctx = canvas.getContext('2d');
                            if (ctx) {
                                ctx.drawImage(img, 0, 0, width, height);
                                if (svg.parentNode) {
                                    // Swap in DOM
                                    originalSvgs.push({ parent: svg.parentNode as Element, svg: svg, placeholder: canvas });
                                    svg.parentNode.replaceChild(canvas, svg);
                                }
                            }
                            URL.revokeObjectURL(url);
                            resolve();
                        };
                        img.onerror = () => resolve(); // Don't block if fail
                        img.src = url;
                    });
                });

                // Wait for all SVGs to be rasterized
                await Promise.all(svgPromises);
            } catch (e) {
                console.error("SVG Pre-Bake Error", e);
            }
        }

        try {
            console.log("--- STUDIO IA: CAPTURING DESIGN (v2 - html2canvas) ---");
            await document.fonts.ready; // Ensure fonts are loaded

            // USE HTML2CANVAS FOR BETTER CORS HANDLING AND STABILITY
            // @ts-ignore
            const html2canvas = (await import('html2canvas')).default;

            if (!previewRef.current) throw new Error("Preview ref missing");

            const canvas = await html2canvas(previewRef.current, {
                useCORS: true,
                allowTaint: false,
                scale: 2,
                backgroundColor: '#ffffff',
                logging: false, // Set to true for debugging if needed
                onclone: (clonedDoc: Document) => {
                    // Remove problematic elements from the clone before capture
                    const node = clonedDoc.getElementById('preview-container');
                    if (node) {
                        // Ensure it's visible for capture
                        node.style.display = 'block';
                    }

                    // Hide any active dashed borders / measurement overlays during capture
                    const dashedElements = clonedDoc.querySelectorAll('[style*="dashed"]');
                    dashedElements.forEach((el: any) => {
                        el.style.border = 'none';
                    });

                    const measurementLines = clonedDoc.querySelectorAll('.border-dashed');
                    measurementLines.forEach((el: any) => {
                        el.style.display = 'none';
                    });
                }
            });

            const dataUrl = canvas.toDataURL('image/webp', 0.82);

            if (!dataUrl || dataUrl.length < 2000) {
                throw new Error("Capture logic produced an invalid image result.");
            }

            setZoomLevel(originalZoom);
            return dataUrl;
        } catch (error) {
            console.error("Preview Capture Error:", error);
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
        setPreviewImage(null); // CRITICAL: Close preview overlay to unlock scroll 

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
                setAiStep('result'); // Switch to result view immediately to show the premium loading UI
                try {
                    if (finalCategory === 'Sans Filtre') {
                        console.log("--- STUDIO IA: SANS FILTRE MODE (v2) ---");
                        // Extract current logo for better fidelity
                        const currentLogoUrl = isBack
                            ? (item.processedLogoUrlBack || item.originalLogoUrlBack || item.predefinedLogoUrlBack)
                            : (item.processedLogoUrlFront || item.originalLogoUrlFront || item.predefinedLogoUrlFront);

                        let logoBase64 = null;
                        if (currentLogoUrl) {
                            try {
                                logoBase64 = await urlToBase64(getProxiedUrl(Array.isArray(currentLogoUrl) ? currentLogoUrl[0] : currentLogoUrl));
                            } catch (e) {
                                console.warn("Failed to convert logo to base64 for VTON hint", e);
                            }
                        }

                        setIsGeneratingLocal(true);
                        const vtonResult = await vtonService.generateVTONImage(
                            resizedUserPhoto,
                            preview,
                            finalStyle || 'Standard',
                            logoBase64 || undefined
                        );

                        if (!vtonResult || !vtonResult.startsWith('data:image')) {
                            throw new Error("L'IA n'a pas renvoyé d'image valide.");
                        }

                        // @ts-ignore
                        if (setAiResult) setAiResult(vtonResult);
                    } else {
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

                    if (!isGuest) {
                        setShowAiResultModal(true);
                    }
                } catch (err) {
                    console.error("AI Generation failed inside Studio IA:", err);
                    alert("La génération IA a échoué. Cause: " + (err instanceof Error ? err.message : String(err)));
                    setAiStep('input'); // Revert to input step on failure
                    return;
                } finally {
                    setIsGeneratingLocal(false);
                }
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
                // setActiveView('model'); // Removed: Invalid type
            }

            setCapturedImage(null);
            setPreviewImage(null);

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
            // Call onSaveToProfile which will handle both Firestore save and local state update
            await onSaveToProfile(
                aiResult,
                activeStyleCategory === 'Custom' ? customStylePrompt : selectedStylePrompt,
                activeStyleCategory,
                item
            );
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
        const types = Object.keys(products);
        const idx = types.indexOf(item.productType);
        const newIdx = dir === 'next' ? (idx + 1) % types.length : (idx - 1 + types.length) % types.length;
        const newType = types[newIdx];

        // Only update productType and adjust color if needed, keeping other customizations
        updateItem({
            productType: newType,
            color: products[newType].images[item.color] ? item.color : Object.keys(products[newType].images)[0]
        });

        // Resets - [FIX] DO NOT CLEAR AI result when swapping product
        // if (setAiResult) setAiResult(null); 
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

    const frontDims = getDims(item.logoSizeFront ?? 50, item.logoAspectRatioFront || 1);
    const backDims = getDims(item.logoSizeBack ?? 50, item.logoAspectRatioBack || 1);

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

    // ATELIER CHARGES
    // Fees are now handled globally in CustomizerApp.calculateTotals to avoid per-item multiplication


    // --- EXPORT & PUBLISH LOGIC ---
    const handleExportAction = async (format: 'png' | 'pdf' = 'png') => {
        if (isCapturing) return;
        setIsCapturing(true);
        try {
            // Force Front View for export if desired, or current view
            const image = await generatePreview();

            if (format === 'png') {
                const link = document.createElement('a');
                link.href = image;
                link.download = `signaid_creation_${item.productType}_${Date.now()}.png`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            } else if (format === 'pdf') {
                // PDF Logic (Simulated via Print or jsPDF if available)
                // For now, trigger print dialog which allows saving as PDF
                const win = window.open('', '_blank');
                if (win) {
                    win.document.write(`<img src="${image}" style="width:100%;"/>`);
                    win.document.close();
                    win.focus();
                    setTimeout(() => win.print(), 500);
                }
            }
        } catch (e) {
            console.error("Export failed", e);
            alert("Erreur lors de l'exportation.");
        } finally {
            setIsCapturing(false);
        }
    };

    const handlePublishAction = async () => {
        if (isCapturing) return;
        setIsCapturing(true);
        try {
            // 1. CAPTURE PREVIEWS (Front & Back)
            // Save current side to restore later
            const initialSideWasBack = isBack;

            // Variables to hold captures
            let frontCapture: string | undefined = undefined;
            let backCapture: string | undefined = undefined;

            // Helper to capture current view
            const captureCurrentSide = async () => {
                // Deselect active element to clean up view
                setActiveEl(null);
                // Wait for UI to update (remove selection box)
                await new Promise(r => setTimeout(r, 200));

                // Use generatePreview which handles html-to-image
                return await generatePreview();
            };

            // CAPTURE STRATEGY:
            // 1. Capture current side first (fastest feedback)
            const firstCapture = await captureCurrentSide();
            if (initialSideWasBack) {
                backCapture = firstCapture;
            } else {
                frontCapture = firstCapture;
            }

            // 2. Determine if we NEED the other side
            // Check content specific to sides
            const hasFrontContent = item.originalLogoUrlFront || item.predefinedLogoUrlFront || (item.textFront?.text && item.textFront.text.trim() !== '') || (item.aiImageUrl && !isBack);
            // Note: AI Image usually applies to Front unless specified otherwise, but strict check is better. 
            // For now, let's assume if we are on Back, we might want Front if it has content.

            const hasBackContent = item.originalLogoUrlBack || item.predefinedLogoUrlBack || (item.textBack?.text && item.textBack.text.trim() !== '');

            // 3. Switch and capture if needed
            if (initialSideWasBack && hasFrontContent) {
                // We are on Back, need Front
                setIsBack(false);
                setActiveView('front');
                // Wait for re-render and image load
                await new Promise(r => setTimeout(r, 1000));
                frontCapture = await captureCurrentSide();
            } else if (!initialSideWasBack && hasBackContent) {
                // We are on Front, need Back
                setIsBack(true);
                setActiveView('back');
                // Wait for re-render
                await new Promise(r => setTimeout(r, 1000));
                backCapture = await captureCurrentSide();
            }

            // Restore initial view if changed
            if (isBack !== initialSideWasBack) {
                setIsBack(initialSideWasBack);
                setActiveView(initialSideWasBack ? 'back' : 'front');
            }

            // 2. PREPARE CUSTOMIZATION OBJECT
            const publishedItem = {
                ...item,
                previewImageUrlFront: frontCapture || item.previewImageUrlFront,
                previewImageUrlBack: backCapture || item.previewImageUrlBack
            };

            // 3. PUBLISH
            // Using a default caption or prompt user
            const caption = `Ma création ${product.name} sur Signaid !`;
            if (onPublish) {
                // Pass the UPDATED item with captured previews as the "customization" object
                // The first argument 'image' is the main post image. We use the Front capture or the First capture.
                const mainImage = frontCapture || backCapture || firstCapture;
                onPublish(mainImage, caption, item.productType, publishedItem, activeStyleCategory, selectedStyleName);
            } else {
                console.warn("onPublish prop missing");
            }
        } catch (e) {
            console.error("Publish failed", e);
            alert("Erreur lors de la publication.");
        } finally {
            setIsCapturing(false);
        }
    };

    const handleAddToCartAction = async () => {
        // DEBUG: Immediate feedback
        // showToast("Ajout panier...", "success"); 

        if (isCapturing) {
            console.warn("Cart Click Blocked: Capture in progress");
            return;
        }
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

                // Show new tooltip
                setShowCartTooltip(true);
                setTimeout(() => setShowCartTooltip(false), 3000);

                // Alert to force feedback
                alert("Veuillez sélectionner une taille !");

                // Scroll to size selector
                // Scroll to size selector
                const isMobile = window.innerWidth < 1024;
                const sizeSelector = document.getElementById(isMobile ? 'size-selector-mobile' : 'size-selector-desktop');

                if (sizeSelector) {
                    sizeSelector.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    sizeSelector.style.animation = 'pulse 0.5s ease-in-out';
                    setTimeout(() => {
                        sizeSelector.style.animation = '';
                    }, 500);
                }
                setIsCapturing(false);
                return;
            }




            let frontPreview: string | undefined = undefined;
            let backPreview: string | undefined = undefined;

            // Capture screen for "Ghost" (flat) previews in the Cart
            // This ensures the technical view is correct and not obscured/hidden, even if an AI result exists.
            const startSideIsBack = isBack;

            // 1. Capture CURRENT Side immediately (Reliable)
            setActiveEl(null);
            await new Promise(resolve => setTimeout(resolve, 500)); // Increased frame delay
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
                await new Promise(resolve => setTimeout(resolve, 2000));
                frontPreview = await generatePreview();
                setIsBack(true); // Return to original
            } else if (needsBack) {
                setIsBack(true);
                await new Promise(resolve => setTimeout(resolve, 2000)); // Wait longer for loading on switch
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

            // CALCULATE ADDITIVE FEE (Same logic as useMemo for activePricing)
            const combinedFee = calculateMarkingFee(item);
            const totalQty = Object.values(selectedSizes).reduce((a, b) => (a as number) + (b as number), 0);

            // Create a separate item for each selected size
            const itemsToAdd: CartItem[] = [];
            Object.entries(selectedSizes).forEach(([size, qty]) => {
                const quantity = qty as number;
                if (quantity > 0) {
                    const baseUnitPrice = calculateBaseUnitPrice(product, size, item.color, pricingRules, totalQty);
                    const itemUnitPrice = baseUnitPrice + combinedFee;

                    const newItem = {
                        ...item,
                        id: generateUUID(), // New ID for each cart line
                        sizes: { [size]: quantity },
                        previewImageUrlFront: frontPreview,
                        previewImageUrlBack: backPreview,
                        aiImageUrl: finalAiImageUrl, // Use the uploaded URL or fallback
                        calculatedPrice: itemUnitPrice
                    };

                    logAnalyticsEvent(AnalyticsEvents.ADD_TO_CART, {
                        item_id: item.id,
                        item_name: product.name,
                        color: item.color,
                        quantity: quantity,
                        size: size,
                        price: itemUnitPrice,
                        user_type: isGuest ? 'guest' : 'member'
                    });
                    itemsToAdd.push(newItem);
                }
            });

            if (itemsToAdd.length > 0) {
                onAddToCartBatch(itemsToAdd);
            } else {
                // FALLBACK: If "One Size" product (no sizes defined in matrix), add 1 unit of default
                if (!product?.sizes || product.sizes.length === 0) {
                    const baseUnitPrice = calculateBaseUnitPrice(product, 'OS', item.color, pricingRules, 1);
                    const itemUnitPrice = baseUnitPrice + combinedFee;
                    const defaultItem = {
                        ...item,
                        id: generateUUID(),
                        sizes: { 'OS': 1 },
                        previewImageUrlFront: frontPreview,
                        previewImageUrlBack: backPreview,
                        aiImageUrl: finalAiImageUrl,
                        calculatedPrice: itemUnitPrice
                    };
                    onAddToCartBatch([defaultItem]);
                } else {
                    alert("⚠️ Veuillez sélectionner une taille avant d'ajouter au panier.");
                    setToast({ type: 'error', msg: "Selectionnez une taille !" });
                }
            }

            setSelectedSizes({});
            // SUCCESS NOTIFICATION
            setToast({ type: 'success', msg: "Produit ajouté au panier !" });
            // alert("Ajouté au panier !"); // Removed as onAddToCartBatch will likely switch view
        } finally {
            setIsCapturing(false);
        }
    };

    const handleShareDesign = async () => {
        if (sharingLoading || isCapturing) return;
        setSharingLoading(true);
        try {
            // 1. Capture Preview
            setActiveEl(null);
            await new Promise(r => setTimeout(r, 400));
            const currentViewImg = await generatePreview();

            // Prepare design object for sharing
            const shareableItem: CartItem = {
                ...item,
                previewImageUrlFront: isBack ? item.previewImageUrlFront : currentViewImg,
                previewImageUrlBack: isBack ? currentViewImg : item.previewImageUrlBack,
            };

            // 2. Create Shared Design
            const shortId = await designSharingService.createSharedDesign(shareableItem, {
                productId: product.id,
                productType: item.productType,
                color: item.color,
                userId: user?.id || 'guest'
            });

            setShareShortId(shortId);
        } catch (error) {
            console.error("Error sharing design:", error);
            setToast({ type: 'error', msg: "Erreur lors de la génération du lien." });
        } finally {
            setSharingLoading(false);
        }
    };

    const activeText = (activeEl === 'text2')
        ? (isBack ? (item.textBack2 || getDefaultText()) : (item.textFront2 || getDefaultText()))
        : (activeEl === 'text3')
            ? (isBack ? (item.textBack3 || getDefaultText()) : (item.textFront3 || getDefaultText()))
            : (isBack ? item.textBack : item.textFront);

    const handleTextButtonClick = () => {
        // Toggle Panel Check
        const isTextOpen = activePanel === 'text';

        if (isTextOpen) {
            // FIX: If already open, clicking "Text" again should "Reset" view, not close.
            // Users think it's broken if it closes.
            setPanelOffsets(prev => ({ ...prev, text: { x: 0, y: 0 } })); // Force visible
            if (!activeEl) {
                setActiveEl('text'); // Select default text
            }
        } else {
            // Open Logic
            setActivePanel('text');

            if (!activeText.text) {
                const isText2 = activeEl === 'text2';
                const targetKey = isBack ? (isText2 ? 'textBack2' : 'textBack') : (isText2 ? 'textFront2' : 'textFront');
                // @ts-ignore
                const newText = { ...(item[targetKey] || getDefaultText()) };
                newText.text = '';
                newText.position = { x: 50, y: isText2 ? 60 : 40 };
                // @ts-ignore
                updateItem({ [targetKey]: newText });
                setActiveEl(isText2 ? 'text2' : 'text');
                setTextOptionsOpen(true);
                setPanelOffsets(prev => ({ ...prev, text: { x: 0, y: 0 } }));
            } else {
                setTextOptionsOpen(!textOptionsOpen);
                setActiveEl('text');
                setPanelOffsets(prev => ({ ...prev, text: { x: 0, y: 0 } }));
            }
        }
    };

    const handleImportButtonClick = (e?: any) => {
        // Force stop propagation to prevent carousel drag interference
        if (e) {
            e.stopPropagation();
            e.preventDefault();
        }

        const hasLogo = isBack
            ? (item.predefinedLogoUrlBack || item.originalLogoUrlBack || item.processedLogoUrlBack)
            : (item.originalLogoUrlFront || item.predefinedLogoUrlFront || item.processedLogoUrlFront);

        console.log("Mobile Option Clicked", { hasLogo, activePanel });

        // LOGIC FIX: If panel is already open AND activeEl matches, then close. Otherwise OPEN.
        const isPanelOpen = activePanel === 'import';

        if (isPanelOpen) {
            // USER REQUEST FIX: If panel is already "open", clicking the button again means "SHOW ME THE OPTIONS" (Reset/Verify).
            // It should NOT close it, because users get confused if they lost the panel.
            // Force reset visibility and ensure selection.
            setPanelOffsets(prev => ({ ...prev, import: { x: 0, y: 0 } }));

            // Re-assert selection if logo exists
            if (hasLogo) {
                // Determine which logo to select? Usually 'logo'.
                // If activeEl is already 'logo', maybe blink it?
                if (activeEl !== 'logo') {
                    setActiveEl('logo');
                }
            }
            // Do NOT close.
        } else {
            // OPEN PANEL & RESET POSITION
            setPanelOffsets(prev => ({ ...prev, import: { x: 0, y: 0 } }));

            if (hasLogo) {
                // Delayed selection to allow panel open animation/render to start
                setTimeout(() => setActiveEl('logo'), 50);
                setActivePanel('import');
            } else {
                setActivePanel('import'); // Show upload
            }
        }
    };

    const handleCameraButtonClick = () => {
        triggerUniversalInput();
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
            // FIX: Removed .animate-fade-in in R3.5, so we must check for data-layout-id or the fixed container
            const panel = target.closest('[data-layout-id^="desktop-panel"]'); // Matches desktop-panel-import, desktop-panel-text
            const toggleBtn = target.closest('button');
            const canvasEl = target.closest('.relative.w-full.md\\:max-w-\\[60\\%\\].aspect-\\[3\\/4\\]');

            // If active panel open, and click is NOT in panel
            if (activePanel !== 'none' && !panel && !toggleBtn) {
                // Double check if we are clicking a toolbar item (sometimes specific classes used)
                setActivePanel('none');
            }

            // If an element is active, and we click outside the canvas or elements
            // Note: DraggableElements stop propagation, so if we are here, we didn't click an element.
            if (activeEl && !panel && !toggleBtn && !canvasEl) {
                setActiveEl(null);
            }

            // Close desktop size dropdown (Disabled for Size Guide persistence as requested)
            // if (isDesktopSizeOpen && !(target.closest('.size-dropdown-container'))) {
            //     setIsDesktopSizeOpen(false);
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

    // --- MOBILE TOOL CAROUSEL STATE & LOGIC (After Handlers) ---
    const hasContent = !!(isBack
        ? (item.predefinedLogoUrlBack || item.originalLogoUrlBack || (item.textBack?.text && item.textBack?.text !== ''))
        : (item.predefinedLogoUrlFront || item.originalLogoUrlFront || (item.textFront?.text && item.textFront?.text !== '')));

    // Fix: Define hasAiResult before usage
    const hasAiResult = !!aiResult;

    // Force Step 3 (Cart/Validation) if AI Result exists
    const currentStep = (hasAiResult) ? 3 : (hasContent || isServiceMode ? 2 : 1);

    // --- MOBILE TOOL CAROUSEL STATE & LOGIC ---
    // REMOVED useMemo to prevent Stale Closures on handlers (activePanel, item, etc.)
    const mobileTools = [
        { id: 'flip', icon: 'fa-arrows-rotate', label: (isBack ? 'Face' : 'Dos') as string, action: () => { setIsBack(!isBack); setActiveView(isBack ? 'front' : 'back'); } },
        { id: 'image', icon: 'fa-image', label: 'Image', action: handleImportButtonClick },
        {
            id: 'ai',
            icon: 'fa-wand-magic-sparkles',
            label: aiResult ? 'Voir IA' : 'IA',
            action: () => {
                if (aiResult) {
                    setShowAiResultModal(true);
                } else {
                    setAiModalOpen(true);
                }
            },
            className: `animate-bounce-ia !bg-orange-600 !text-white !scale-110 shadow-lg`
        },
        { id: 'text', icon: 'fa-font', label: 'Texte', action: handleTextButtonClick },
        {
            id: 'cart',
            icon: 'fa-cart-shopping',
            label: 'Panier',
            action: handleAddToCartAction,
            className: showCartTooltip ? 'animate-bounce' : '',
            disabled: isCapturing,
            badge: (cartCount || 0) > 0 ? `+${cartCount}` : undefined
        },
        {
            id: 'export',
            icon: 'fa-download',
            label: 'Export',
            action: () => handleExportAction('png')
        }
    ];

    const scrollCarousel = (ref: React.RefObject<HTMLDivElement>, direction: 'left' | 'right') => {
        if (!ref.current) return;
        const container = ref.current;
        // Use a larger scroll amount for the AI Studio carousels if needed
        const isAiCarousel = ref === aiCategoryScrollRef || ref === aiStyleScrollRef;
        const scrollAmount = isAiCarousel ? container.clientWidth * 0.8 : container.clientWidth / 3;
        container.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
    };

    const nextTool = () => {
        const container = toolScrollRef.current;
        if (!container) return;
        const isAtEnd = container.scrollLeft + container.clientWidth >= container.scrollWidth - 10;
        if (isAtEnd) {
            container.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
            scrollCarousel(toolScrollRef, 'right');
        }
    };
    const prevTool = () => {
        const container = toolScrollRef.current;
        if (!container) return;
        if (container.scrollLeft <= 10) {
            container.scrollTo({ left: container.scrollWidth, behavior: 'smooth' });
        } else {
            scrollCarousel(toolScrollRef, 'left');
        }
    };

    const handleColorChangeRequest = (newColor: string) => {
        updateItem({ color: newColor });
    };

    const nextColor = () => {
        const currentIndex = colors.indexOf(item.color);
        const nextIndex = (currentIndex + 1) % colors.length;
        handleColorChangeRequest(colors[nextIndex]);
    };
    const prevColor = () => {
        const currentIndex = colors.indexOf(item.color);
        const prevIndex = (currentIndex - 1 + colors.length) % colors.length;
        handleColorChangeRequest(colors[prevIndex]);
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
    const dynamicStyles = `
        @keyframes pulse-orange {
            0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(232, 93, 37, 0.4); }
            70% { transform: scale(1.05); box-shadow: 0 0 0 10px rgba(232, 93, 37, 0); }
            100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(232, 93, 37, 0); }
        }
        .animate-pulse-create {
            animation: pulse-orange 2s infinite;
        }
        @keyframes bounce-ia {
            0%, 20%, 50%, 80%, 100% {transform: translateY(0) scale(1);}
            40% {transform: translateY(-10px) scale(1.1);}
            60% {transform: translateY(-5px) scale(1.05);}
        }
        .animate-bounce-ia {
            animation: bounce-ia 2s infinite;
        }
        .hero-btn-glow {
            box-shadow: 0 0 20px rgba(232, 93, 37, 0.4);
            animation: pulse-orange 2s infinite !important;
        }
    `;


    if (!product) {
        return <div className="p-8 text-center">Produit introuvable. <button onClick={onBack} className="text-orange-500 underline">Retour</button></div>;
    }

    return (
        <div className="flex flex-col min-h-[100dvh] lg:h-full w-full max-w-[1025px] mx-auto relative lg:pb-24 bg-transparent overflow-hidden lg:overflow-visible justify-start" style={{ touchAction: 'pan-y' }}>
            <style>{dynamicStyles}</style>
            {pendingElement && (
                <div className="fixed inset-0 z-[100] bg-white/90 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl border border-gray-200 p-6 w-full max-w-sm shadow-2xl">
                        <h3 className="text-xl font-bold text-gray-900 mb-2 text-center">Placement</h3>
                        <div className="grid grid-cols-2 gap-4 my-6">
                            <button onClick={() => applyPlacement('heart')} className="p-4 bg-gray-100 rounded-xl text-gray-800 font-bold hover:bg-orange-100 hover:text-orange-600 border border-gray-200 hover:border-orange-300 transition-all flex flex-col items-center justify-center gap-2">
                                <i className="fa-solid fa-heart text-xl"></i>
                                <span>Cœur</span>
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

            {/* Hidden Input for Mobile Camera (Environment) */}
            <input
                type="file"
                accept="image/*"
                capture="environment"
                id="hidden-camera-input-mobile"
                className="sr-only" // Changed from 'hidden' to ensure label triggers work reliably
                onChange={handleImageUpload}
                tabIndex={-1}
            />
            {/* Hidden Input for Desktop/File Upload (No Capture) */}
            <input
                type="file"
                accept="image/*"
                id="hidden-file-input-desktop"
                className="sr-only" // Changed from 'hidden'
                onChange={handleImageUpload}
                tabIndex={-1}
            />

            <div className="hidden lg:flex w-full h-14 items-center justify-center bg-transparent z-40">
                {/* Desktop: Back Button Left + Selector Center */}
                <div className="hidden lg:flex items-center justify-center w-full px-6 relative">

                    <div data-layout-id="garment-selector-desktop" className="flex items-center gap-6">
                        <button onClick={() => changeProductType('prev')} className="text-orange-600 hover:text-orange-800 p-2 font-black text-2xl transition-transform hover:scale-120">
                            <i data-layout-id="garment-selector-prev" className="fa-solid fa-chevron-left"></i>
                        </button>
                        <div className="flex flex-col items-center min-w-[280px]">
                            <h2 className="text-xl font-black text-orange-600 uppercase tracking-widest text-center">{product.name}</h2>
                            <div className="flex items-center gap-2 -mt-1">
                                <span className="text-xs font-bold text-gray-500">{product.reference}</span>
                                {product.supplierLink && (
                                    <a href={product.supplierLink} target="_blank" rel="noopener noreferrer" className="text-[10px] flex items-center gap-1 text-gray-400 hover:text-blue-600 transition-colors" title="Fiche Technique">
                                        <i className="fa-solid fa-file-contract"></i> Info
                                    </a>
                                )}
                            </div>
                        </div>
                        <button onClick={() => changeProductType('next')} className="text-orange-600 hover:text-orange-800 p-2 font-black text-2xl transition-transform hover:scale-120">
                            <i data-layout-id="garment-selector-next" className="fa-solid fa-chevron-right"></i>
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Selector Header (Original style restored) - Fixed Height */}
            <div data-layout-id="garment-selector-mobile" className="lg:hidden w-full flex flex-col bg-transparent transition-all flex-shrink-0 shadow-none z-50 min-h-[48px] border-none mb-2">
                <div className="w-full flex items-center justify-center gap-6 py-1 px-4">
                    <button onClick={() => changeProductType('prev')} className="text-orange-600 p-2 font-black text-xl">
                        <i className="fa-solid fa-chevron-left"></i>
                    </button>
                    <div className="flex-1 flex flex-col items-center overflow-hidden">
                        <h2 className="text-lg font-black text-orange-600 uppercase tracking-widest text-center whitespace-nowrap overflow-hidden text-ellipsis w-full">{product.name}</h2>
                        <div className="flex items-center gap-2 -mt-0.5">
                            <span className="text-[10px] font-bold text-gray-500">{product.reference}</span>
                            {product.supplierLink && (
                                <a href={product.supplierLink} target="_blank" rel="noopener noreferrer" className="text-[9px] flex items-center gap-1 text-gray-400 hover:text-blue-600 transition-colors" title="Fiche Technique">
                                    <i className="fa-solid fa-file-contract"></i> Info
                                </a>
                            )}
                        </div>
                    </div>
                    <button onClick={() => changeProductType('next')} className="text-orange-600 p-2 font-black text-xl">
                        <i className="fa-solid fa-chevron-right"></i>
                    </button>
                </div>
            </div>




            {/* MAIN CONTENT AREA - Fixed Mobile Scrolling (Strict Flex) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 lg:gap-8 items-start lg:mt-0 w-full max-w-[1025px] mx-auto px-4 lg:px-0">
                <div className="lg:col-span-12 space-y-4 order-1">
                    <div className="flex-1 relative flex flex-col items-center justify-center p-0 lg:p-2 pb-24 lg:pb-48 bg-transparent lg:bg-white overflow-visible w-full scrollbar-hide min-h-[100vh] lg:min-h-0">

                        {/* 1. HERO PRODUCT (Full Flex Mobile) */}
                        {/* 1. HERO PRODUCT (Full Flex Mobile) */}
                        {/* 1. HERO PRODUCT (Full Flex Mobile) */}
                        {/* 1. HERO PRODUCT (Full Flex Mobile) */}
                        {/* 1. HERO PRODUCT (Full Flex Mobile) */}

                        <div className="mobile-product-container relative flex-1 w-full lg:w-[450px] lg:h-auto lg:aspect-[3/4] flex items-center justify-center z-10 m-0 mt-0 lg:mt-[-5vh] lg:mb-10 shadow-none lg:shadow-none min-h-[50vh] h-auto lg:mx-auto">

                            {/* LEFT SELECTOR - LAYERS */}
                            {colors.length > 1 && (
                                <>
                                    {/* Layer 1: Thumbnail (BEHIND Garment but visible area) */}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleColorChangeRequest(colors[prevIndex]); }}
                                        className="hidden lg:flex absolute -left-32 top-1/2 -translate-y-1/2 group flex-col items-center gap-3 transition-all hover:scale-105 z-50 pointer-events-auto"
                                    >
                                        <div className="w-8 h-8 opacity-0"></div> {/* Spacer for Arrow */}
                                        <div className="w-40 h-56 flex items-center justify-center p-1">
                                            <img
                                                src={getProxiedUrl(getOptimizedImageUrl(isBack ? product.backImages[colors[prevIndex]] : product.images[colors[prevIndex]], 200))}
                                                className="w-full h-full object-contain transition-opacity dropdown-shadow-md"
                                                alt="Précédent"
                                            />
                                        </div>
                                    </button>
                                    {/* Layer 2: Arrow (In Front and further out) */}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleColorChangeRequest(colors[prevIndex]); }}
                                        className="hidden lg:flex absolute -left-40 top-1/2 -translate-y-1/2 group flex-col items-center gap-3 transition-all hover:scale-110 z-[60] pointer-events-none"
                                    >
                                        <div className="w-10 h-10 flex items-center justify-center bg-white rounded-full shadow-xl text-gray-500 group-hover:text-orange-600 border border-gray-100 transition-colors pointer-events-auto">
                                            <i className="fa-solid fa-chevron-left text-sm"></i>
                                        </div>
                                        <div className="w-40 h-56 opacity-0"></div> {/* Spacer for Thumbnail */}
                                    </button>
                                </>
                            )}

                            {/* MOBILE LEFT SELECTOR */}
                            {colors.length > 1 && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleColorChangeRequest(colors[prevIndex]); }}
                                    className="lg:hidden absolute left-0 top-1/2 -translate-y-1/2 z-40 p-2 pl-1"
                                >
                                    <div className="w-10 h-14 relative flex items-center justify-center rounded-r-lg border-y border-r border-gray-100 shadow-sm overflow-hidden">
                                        <img
                                            src={getProxiedUrl(getOptimizedImageUrl(isBack ? product.backImages[colors[prevIndex]] : product.images[colors[prevIndex]], 200))}
                                            className="absolute inset-0 w-full h-full object-cover opacity-90"
                                            alt="Précédent"
                                        />
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                                            <i className="fa-solid fa-chevron-left text-white drop-shadow-md text-xs font-bold"></i>
                                        </div>
                                    </div>
                                </button>
                            )}


                            {/* ZOOM CONTROLS (Mobile Only - Desktop uses Chapeau) */}
                            <div className="lg:hidden absolute bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-auto">
                                <button
                                    onPointerDown={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        // Immediate action
                                        setZoomLevel(prev => Math.min(prev + 0.05, 3));
                                        // Continuous action
                                        zoomIntervalRef.current = setInterval(() => {
                                            setZoomLevel(prev => Math.min(prev + 0.05, 3));
                                        }, 100);
                                    }}
                                    onPointerUp={() => {
                                        if (zoomIntervalRef.current) clearInterval(zoomIntervalRef.current);
                                    }}
                                    onPointerLeave={() => {
                                        if (zoomIntervalRef.current) clearInterval(zoomIntervalRef.current);
                                    }}
                                    className="w-10 h-10 bg-white/90 backdrop-blur-md rounded-full shadow-lg flex items-center justify-center text-gray-700 hover:text-orange-600 active:scale-95 transition-all border border-gray-200"
                                >
                                    <i className="fa-solid fa-plus text-lg"></i>
                                </button>
                                <button
                                    onPointerDown={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        // Immediate action
                                        setZoomLevel(prev => Math.max(prev - 0.05, 0.5));
                                        // Continuous action
                                        zoomIntervalRef.current = setInterval(() => {
                                            setZoomLevel(prev => Math.max(prev - 0.05, 0.5));
                                        }, 100);
                                    }}
                                    onPointerUp={() => {
                                        if (zoomIntervalRef.current) clearInterval(zoomIntervalRef.current);
                                    }}
                                    onPointerLeave={() => {
                                        if (zoomIntervalRef.current) clearInterval(zoomIntervalRef.current);
                                    }}
                                    className="w-10 h-10 bg-white/90 backdrop-blur-md rounded-full shadow-lg flex items-center justify-center text-gray-700 hover:text-orange-600 active:scale-95 transition-all border border-gray-200"
                                >
                                    <i className="fa-solid fa-minus text-lg"></i>
                                </button>
                            </div>

                            {/* MAIN CANVAS */}
                            <div
                                data-layout-id="main-canvas-container"
                                ref={previewRef}
                                onClick={handleCanvasClick}
                                className="relative w-full h-full lg:aspect-[3/4] bg-transparent lg:bg-transparent select-none p-0 lg:p-6 flex items-center justify-center z-20"
                                style={{ transform: `scale(${zoomLevel})` }}
                            >
                                <div
                                    id="preview-container"
                                    className="w-full h-full relative"
                                    style={{ top: '0px' }}
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

                                    {/* SignPong Overlay - Visible during generation */}
                                    {(aiGenerating || isGeneratingLocal) && (
                                        <div className="absolute inset-0 z-[200] flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm rounded-2xl overflow-hidden animate-fade-in">
                                            <div className="absolute top-10 left-0 right-0 text-center z-20 pointer-events-none">
                                                <h3 className="text-white text-xl font-black uppercase tracking-widest animate-pulse mb-2 shadow-sm">Magie en cours...</h3>
                                                <div className="inline-flex items-center gap-2 bg-orange-600 px-4 py-1.5 rounded-full shadow-xl border border-orange-500/50">
                                                    <i className="fa-solid fa-wand-sparkles text-white text-xs animate-spin-slow"></i>
                                                    <span className="text-white text-[10px] font-black uppercase tracking-wider">SignPong : Gagne des crédits !</span>
                                                </div>
                                            </div>
                                            <div className="w-full h-full">
                                                {isGeneratingLocal ? (
                                                    <div className="flex items-center justify-center w-full h-full">
                                                        <div className="flex flex-col items-center gap-4 bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/20">
                                                            <i className="fa-solid fa-circle-notch fa-spin text-4xl text-orange-500"></i>
                                                            <span className="text-white font-bold uppercase tracking-widest text-xs">Génération...</span>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <PongGame onScore={setPongScore} transparent={true} />
                                                )}
                                            </div>
                                        </div>
                                    )}
                                    {item.productType === 'catalogue' ? (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200 z-50">
                                            <div className="w-32 h-32 bg-orange-100 rounded-full flex items-center justify-center mb-6 shadow-inner animate-pulse-subtle">
                                                <i className="fa-solid fa-book-open text-6xl text-orange-500"></i>
                                            </div>
                                            <h3 className="text-2xl font-black text-gray-800 uppercase tracking-tight mb-3">Catalogue Complet</h3>
                                            <p className="text-sm font-bold text-gray-400 mb-8 max-w-sm leading-relaxed">
                                                Accédez à plus de 10 000 références (T-shirts, Sweats, Polos...) pour votre projet.
                                            </p>
                                            <a
                                                href="https://signeed.printwear.store/fr/home"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="px-8 py-4 bg-orange-600 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl hover:bg-orange-700 hover:scale-105 transition-all flex items-center gap-3 group"
                                            >
                                                <span>Ouvrir le Catalogue</span>
                                                <i className="fa-solid fa-arrow-up-right-from-square group-hover:translate-x-1 transition-transform"></i>
                                            </a>
                                            <p className="mt-6 text-xs font-bold text-gray-500 uppercase tracking-wide max-w-xs">
                                                <i className="fa-solid fa-circle-info mr-1 text-orange-500"></i>
                                                Tous les produits du catalogue peuvent être ajoutés sur simple demande.
                                            </p>
                                            <p className="mt-2 text-[10px] font-bold text-gray-300 uppercase">Ouverture dans un nouvel onglet</p>
                                        </div>
                                    ) : (
                                        <>
                                            {(() => {
                                                const cacheKey = `${item.productType}_${item.color}_${isBack ? 'back' : 'front'}`;
                                                const metadata = processedProductImages[cacheKey];
                                                const rawUrl = getProxiedUrl(getOptimizedImageUrl(
                                                    (isBack ?
                                                        (product.backImages && (product.backImages[item.color] || Object.values(product.backImages)[0])) || (product.images[item.color] || Object.values(product.images)[0])
                                                        :
                                                        (product.images[item.color] || Object.values(product.images)[0])
                                                    )
                                                    , 800
                                                ));

                                                if (!metadata) {
                                                    return (
                                                        <img
                                                            src={rawUrl}
                                                            className="w-full h-full object-contain pointer-events-none select-none relative z-30 opacity-50"
                                                            alt="product-loading"
                                                        />
                                                    );
                                                }

                                                // STANDARD SCALING LOGIC
                                                // We want all products to be at the same "World Scale"
                                                const WORKSPACE_HEIGHT_CM = 85; // Reference height (90cm)
                                                const realHeight = (productDimensions?.[item.productType]?.[previewSize]) || 70;

                                                // 1. Calculate how tall the ORIGINAL mockup would be in our workspace
                                                // realHeight is the height of the garment CONTENT (the trimmed part)
                                                const mockupHeightCm = realHeight / metadata.heightRatio;
                                                const displayMockupHeightPercent = (mockupHeightCm / WORKSPACE_HEIGHT_CM) * 100;

                                                // 2. Display height of the TRIMMED image
                                                const displayTrimmedHeightPercent = displayMockupHeightPercent * metadata.heightRatio;
                                                const displayTrimmedWidthPercent = displayMockupHeightPercent * (metadata.originalWidth / metadata.originalHeight) * metadata.widthRatio * (metadata.originalHeight / metadata.originalWidth);
                                                // Simplified: width should follow aspect ratio of the trimmed image
                                                const trimmedAspectRatio = (metadata.originalWidth * metadata.widthRatio) / (metadata.originalHeight * metadata.heightRatio);

                                                // 3. Position to center the ORIGINAL mockup box
                                                const mockupTopPercent = (100 - displayMockupHeightPercent) / 2;
                                                const trimmedTopPercent = mockupTopPercent + (metadata.cropTop / metadata.originalHeight) * displayMockupHeightPercent;

                                                return (
                                                    <img
                                                        src={metadata.dataUrl}
                                                        className="absolute pointer-events-none select-none z-30 left-1/2 -translate-x-1/2 transition-all duration-300"
                                                        style={{
                                                            height: `${displayTrimmedHeightPercent}%`,
                                                            top: `${trimmedTopPercent}%`,
                                                            width: 'auto', // Preserve aspect ratio
                                                        }}
                                                        alt={`product-${isBack ? 'back' : 'front'}`}
                                                    />
                                                );
                                            })()}

                                            {/* Overlays (Logo & Texts) */}
                                            {(isBack ? item.predefinedLogoUrlBack || item.originalLogoUrlBack : item.predefinedLogoUrlFront || item.originalLogoUrlFront) && (
                                                <DraggableElement
                                                    id={isBack ? "logoBack" : "logoFront"} type="logo" item={item} side={isBack ? "Back" : "Front"}
                                                    isActive={activeEl === 'logo'} setActive={() => setActiveEl('logo')}
                                                    onOpenOptions={() => setActivePanel('import')} onUpdate={updateItem} onSaveHistory={saveHistory}
                                                    isEditable={true} realHeight={productDimensions?.[item.productType]?.[previewSize]}
                                                    showDimensions={isMeasureToolActive}
                                                    onDragStart={() => handleDragStart(isBack ? "logoBack" : "logoFront")}
                                                    onDragUpdate={handleDragUpdate}
                                                    onReportDimensions={(w, h) => handleReportDimensions('logo', w, h)}
                                                />
                                            )}
                                            {/* Legacy Slot 1 Helper (already handled above) */}

                                            {(isBack ? item.textBack.text : item.textFront.text) && (
                                                <DraggableElement
                                                    id={isBack ? "textBack" : "textFront"} type="text" item={item} side={isBack ? "Back" : "Front"}
                                                    isActive={activeEl === 'text'} setActive={() => setActiveEl('text')}
                                                    onOpenOptions={() => setActivePanel('text')} onUpdate={updateItem} onSaveHistory={saveHistory}
                                                    isEditable={true} realHeight={productDimensions?.[item.productType]?.[previewSize]}
                                                    showDimensions={isMeasureToolActive}
                                                    onDragStart={() => handleDragStart(isBack ? "textBack" : "textFront")}
                                                    onDragUpdate={handleDragUpdate}
                                                    onReportDimensions={(w, h) => handleReportDimensions('text', w, h)}
                                                />
                                            )}

                                            {/* Slot 2 Text */}
                                            {(isBack ? item.textBack2?.text : item.textFront2?.text) && (
                                                <DraggableElement
                                                    id={isBack ? "textBack2" : "textFront2"} type="text" item={item} side={isBack ? "Back" : "Front"}
                                                    isActive={activeEl === 'text2'} setActive={() => setActiveEl('text2')}
                                                    onOpenOptions={() => setActivePanel('text')} onUpdate={updateItem} onSaveHistory={saveHistory}
                                                    isEditable={true} realHeight={productDimensions?.[item.productType]?.[previewSize]}
                                                    showDimensions={isMeasureToolActive}
                                                    onDragStart={() => handleDragStart(isBack ? "textBack2" : "textFront2")}
                                                    onDragUpdate={handleDragUpdate}
                                                    onReportDimensions={(w, h) => handleReportDimensions('text2', w, h)}
                                                />
                                            )}

                                            {/* Slot 3 Text */}
                                            {(isBack ? item.textBack3?.text : item.textFront3?.text) && (
                                                <DraggableElement
                                                    id={isBack ? "textBack3" : "textFront3"} type="text" item={item} side={isBack ? "Back" : "Front"}
                                                    isActive={activeEl === 'text3'} setActive={() => setActiveEl('text3')}
                                                    onOpenOptions={() => setActivePanel('text')} onUpdate={updateItem} onSaveHistory={saveHistory}
                                                    isEditable={true} realHeight={productDimensions?.[item.productType]?.[previewSize]}
                                                    showDimensions={isMeasureToolActive}
                                                    onDragStart={() => handleDragStart(isBack ? "textBack3" : "textFront3")}
                                                    onDragUpdate={handleDragUpdate}
                                                    onReportDimensions={(w, h) => handleReportDimensions('text3', w, h)}
                                                />
                                            )}

                                            {/* Group Selection Frame */}
                                            {isGrouped && (() => {
                                                const box = getGroupBoundingBox();
                                                if (!box) return null;
                                                return (
                                                    <div
                                                        style={{
                                                            position: 'absolute',
                                                            left: `${box.minX}%`,
                                                            top: `${box.minY}%`,
                                                            width: `${box.width}%`,
                                                            height: `${box.height}%`,
                                                            border: '2px dashed #f97316',
                                                            pointerEvents: 'none',
                                                            zIndex: 45
                                                        }}
                                                    >
                                                        {isMeasureToolActive && (
                                                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap pointer-events-none shadow-lg z-[60]">
                                                                {box.widthCm.toFixed(1)} x {box.heightCm.toFixed(1)} cm
                                                            </div>
                                                        )}
                                                        {/* Single handle for group resizing */}
                                                        <div
                                                            className="absolute -bottom-2 -right-2 w-6 h-6 bg-orange-500 rounded-full cursor-nwse-resize z-[100] shadow-md border-2 border-white pointer-events-auto"
                                                            onMouseDown={handleGroupResizeStart}
                                                            onTouchStart={handleGroupResizeStart}
                                                        />
                                                    </div>
                                                );
                                            })()}
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* COLOR SELECTOR - RIGHT (DESKTOP ONLY NOW) */}
                            {/* RIGHT SELECTOR - LAYERS */}
                            {colors.length > 1 && (
                                <>
                                    {/* Layer 1: Thumbnail */}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleColorChangeRequest(colors[nextIndex]); }}
                                        className="hidden lg:flex absolute -right-32 top-1/2 -translate-y-1/2 group flex-col items-center gap-3 transition-all hover:scale-105 z-50 pointer-events-auto"
                                    >
                                        <div className="w-8 h-8 opacity-0"></div> {/* Spacer for Arrow */}
                                        <div className="w-40 h-56 flex items-center justify-center p-1">
                                            <img
                                                src={getProxiedUrl(getOptimizedImageUrl(isBack ? product.backImages[colors[nextIndex]] : product.images[colors[nextIndex]], 200))}
                                                className="w-full h-full object-contain transition-opacity drop-shadow-md"
                                                alt="Suivant"
                                            />
                                        </div>
                                    </button>
                                    {/* Layer 2: Arrow */}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleColorChangeRequest(colors[nextIndex]); }}
                                        className="hidden lg:flex absolute -right-40 top-1/2 -translate-y-1/2 group flex-col items-center gap-3 transition-all hover:scale-110 z-[60] pointer-events-none"
                                    >
                                        <div className="w-10 h-10 flex items-center justify-center bg-white rounded-full shadow-xl text-gray-500 group-hover:text-orange-600 border border-gray-100 transition-colors pointer-events-auto">
                                            <i className="fa-solid fa-chevron-right text-sm"></i>
                                        </div>
                                        <div className="w-40 h-56 opacity-0"></div> {/* Spacer for Thumbnail */}
                                    </button>
                                </>
                            )}

                            {/* MOBILE RIGHT SELECTOR */}
                            {colors.length > 1 && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleColorChangeRequest(colors[nextIndex]); }}
                                    className="lg:hidden absolute right-0 top-1/2 -translate-y-1/2 z-40 p-2 pr-1"
                                >
                                    <div className="w-10 h-14 relative flex items-center justify-center rounded-l-lg border-y border-l border-gray-100 shadow-sm overflow-hidden">
                                        <img
                                            src={getProxiedUrl(getOptimizedImageUrl(isBack ? product.backImages[colors[nextIndex]] : product.images[colors[nextIndex]], 200))}
                                            className="absolute inset-0 w-full h-full object-cover opacity-90"
                                            alt="Suivant"
                                        />
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                                            <i className="fa-solid fa-chevron-right text-white drop-shadow-md text-xs font-bold"></i>
                                        </div>
                                    </div>
                                </button>
                            )}

                            {/* VALIDATION CHOICE OVERLAY - Centered on garment */}
                            {showValidateOptions && (
                                <div
                                    className="absolute inset-0 z-[80] flex items-center justify-center animate-fade-in"
                                    onClick={() => setShowValidateOptions(false)}
                                >
                                    <div className="absolute inset-0 bg-black/30 backdrop-blur-sm rounded-2xl"></div>
                                    <div
                                        className="relative z-10 w-72 bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/30 overflow-hidden"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <div className="text-center pt-5 pb-3 px-4">
                                            <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">Que souhaitez-vous faire ?</h3>
                                        </div>
                                        <div className="flex flex-col gap-0">
                                            <button
                                                onClick={() => {
                                                    setShowValidateOptions(false);
                                                    sizeSelectionRef.current?.scrollIntoView({ behavior: 'smooth' });
                                                    setShakeSizes(true);
                                                    setTimeout(() => setShakeSizes(false), 600);
                                                    setShowSizeError(true);
                                                    setTimeout(() => setShowSizeError(false), 3000);
                                                }}
                                                className="w-full px-5 py-4 flex items-center gap-3 hover:bg-gray-50 transition-colors border-t border-gray-100 group"
                                            >
                                                <div className="w-12 h-12 rounded-xl bg-gray-900 text-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                                                    <i className="fa-solid fa-cart-plus text-lg"></i>
                                                </div>
                                                <div className="text-left">
                                                    <span className="text-sm font-black text-gray-900 block">Ajouter au Panier</span>
                                                    <span className="text-[10px] text-gray-400 font-bold">Choisir tailles & commander</span>
                                                </div>
                                            </button>
                                            <button
                                                onClick={() => { setShowValidateOptions(false); setAiModalOpen(true); }}
                                                className="w-full px-5 py-4 flex items-center gap-3 hover:bg-orange-50 transition-colors border-t border-gray-100 group"
                                            >
                                                <div className="w-12 h-12 rounded-xl bg-orange-600 text-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                                                    <i className="fa-solid fa-wand-sparkles text-lg"></i>
                                                </div>
                                                <div className="text-left">
                                                    <span className="text-sm font-black text-gray-900 block">Générer avec IA</span>
                                                    <span className="text-[10px] text-gray-400 font-bold">Essayage virtuel & preview</span>
                                                </div>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ADMIN VALIDATION BUTTON moved below */}
                        </div>

                        {/* 2. HORIZONTAL OPTIONS BAR (Moved below main canvas) */}
                        <div className="hidden lg:flex w-full justify-center -mt-16 relative z-40">
                            <div
                                data-layout-id="customizer-right-sidebar"
                                className="bg-white/90 backdrop-blur-2xl border border-gray-100 px-6 py-3 rounded-full shadow-[0_10px_30px_-10px_rgba(0,0,0,0.1)] flex flex-row gap-4 items-center"
                            >


                                <button onClick={handleImportButtonClick} className="w-11 h-11 flex items-center justify-center rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all hover:scale-110" title="Image">
                                    <i className="fa-solid fa-image text-xl"></i>
                                </button>
                                <button onClick={handleTextButtonClick} className="w-11 h-11 flex items-center justify-center rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all hover:scale-110" title="Texte">
                                    <i className="fa-solid fa-font text-xl"></i>
                                </button>

                                <div className="relative mx-2 flex flex-col items-center">
                                    {/* CHAPEAU - Floating Glassmorphic Bubble (View + Zoom) */}
                                    <div className="absolute -top-28 left-1/2 -translate-x-1/2 mb-5 bg-white/80 backdrop-blur-xl border border-gray-100 rounded-full shadow-lg px-3 py-1.5 flex items-center gap-2 z-50">
                                        <button
                                            onClick={() => { setIsBack(!isBack); setActiveView(isBack ? 'front' : 'back'); autoCenterGarment(); }}
                                            className="w-8 h-8 flex items-center justify-center rounded-full bg-white text-gray-500 border border-gray-100 shadow-sm transition-all hover:scale-110 hover:text-orange-600"
                                            title="Changer de vue"
                                        >
                                            <i className={`fa-solid fa-arrows-rotate text-sm transition-transform ${isBack ? 'rotate-180' : ''}`}></i>
                                        </button>
                                        <div className="w-[1px] h-5 bg-gray-200"></div>
                                        <button
                                            onPointerDown={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setZoomLevel(prev => Math.min(prev + 0.05, 3));
                                                zoomIntervalRef.current = setInterval(() => {
                                                    setZoomLevel(prev => Math.min(prev + 0.05, 3));
                                                }, 100);
                                            }}
                                            onPointerUp={() => { if (zoomIntervalRef.current) clearInterval(zoomIntervalRef.current); }}
                                            onPointerLeave={() => { if (zoomIntervalRef.current) clearInterval(zoomIntervalRef.current); }}
                                            className="w-8 h-8 flex items-center justify-center rounded-full bg-white text-gray-500 border border-gray-100 shadow-sm transition-all hover:scale-110 hover:text-orange-600"
                                            title="Zoom +"
                                        >
                                            <i className="fa-solid fa-plus text-sm"></i>
                                        </button>
                                        <button
                                            onPointerDown={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setZoomLevel(prev => Math.max(prev - 0.05, 0.5));
                                                zoomIntervalRef.current = setInterval(() => {
                                                    setZoomLevel(prev => Math.max(prev - 0.05, 0.5));
                                                }, 100);
                                            }}
                                            onPointerUp={() => { if (zoomIntervalRef.current) clearInterval(zoomIntervalRef.current); }}
                                            onPointerLeave={() => { if (zoomIntervalRef.current) clearInterval(zoomIntervalRef.current); }}
                                            className="w-8 h-8 flex items-center justify-center rounded-full bg-white text-gray-500 border border-gray-100 shadow-sm transition-all hover:scale-110 hover:text-orange-600"
                                            title="Zoom -"
                                        >
                                            <i className="fa-solid fa-minus text-sm"></i>
                                        </button>
                                    </div>
                                    {/* VALIDER LE DESIGN BUTTON */}
                                    <button
                                        onClick={() => setShowValidateOptions(!showValidateOptions)}
                                        className="px-6 h-12 flex items-center justify-center gap-2 rounded-xl bg-green-600 text-white font-black shadow-lg hover:scale-110 hover:bg-green-700 transition-all"
                                    >
                                        <span>VALIDER LE DESIGN</span>
                                        <i className={`fa-solid fa-chevron-${showValidateOptions ? 'up' : 'down'} text-xs ml-1`}></i>
                                    </button>
                                </div>
                                <button
                                    onClick={() => {
                                        const nextState = !isMeasureToolActive;
                                        setIsMeasureToolActive(nextState);
                                        setShowGuides(!showGuides);
                                        if (nextState) setShowSizeGuide(true);
                                    }}
                                    className={`w-11 h-11 flex items-center justify-center rounded-xl transition-all hover:scale-110 ${isMeasureToolActive ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                    title="Mesures"
                                >
                                    <i className="fa-solid fa-ruler-combined text-xl"></i>
                                </button>
                                <button
                                    onClick={() => setIsGrouped(!isGrouped)}
                                    className={`w-11 h-11 flex items-center justify-center rounded-xl transition-all hover:scale-110 ${isGrouped ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                    title="Grouper les éléments"
                                >
                                    <i className="fa-solid fa-object-group text-xl"></i>
                                </button>
                                {/* CART BUTTON REMOVED - Handled by VALIDER LE DESIGN */}
                            </div>
                        </div>

                        {/* 3. SIZE SELECTOR & ADD TO CART (Moved from right panel to bottom center) */}
                        <div ref={sizeSelectionRef} className="hidden lg:flex flex-col items-center w-full max-w-xl mx-auto mt-4 gap-4 px-4">
                            {/* 2.5 AI RESULT THUMBNAIL (DESKTOP) */}


                            {/* ATELIER / SERVICES SECTION (MOVED UP FOR VISIBILITY) */}
                            <div className="w-full bg-white rounded-2xl border border-gray-100 shadow-sm mb-4 overflow-hidden">
                                <button
                                    onClick={() => setWorkshopOpen(!workshopOpen)}
                                    className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                                >
                                    <div className="flex items-center gap-2">
                                        <i className="fa-solid fa-scissors text-gray-500"></i>
                                        <span className="font-bold text-gray-900 text-sm uppercase tracking-wider">Atelier / Services</span>
                                    </div>
                                    <i className={`fa-solid fa-chevron-${workshopOpen ? 'up' : 'down'} text-gray-400`}></i>
                                </button>

                                {workshopOpen && (
                                    <div className="p-4 space-y-3 animate-fade-in border-t border-gray-100 bg-gray-50/50">
                                        {isServiceMode && (item.activityName || item.description) && (
                                            <div className="mb-4 p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 shadow-sm">
                                                <h4 className="text-[10px] font-black text-indigo-900 uppercase tracking-widest mb-2 flex items-center gap-2">
                                                    <i className="fa-solid fa-circle-info"></i>
                                                    Résumé de votre demande
                                                </h4>
                                                <div className="space-y-1">
                                                    {item.activityName && (
                                                        <p className="text-xs font-bold text-indigo-700">
                                                            Nom: <span className="text-gray-700">{item.activityName}</span>
                                                        </p>
                                                    )}
                                                    {activeLogoService?.type && (
                                                        <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mt-1">
                                                            Type : <span className="text-gray-900">{activeLogoService.type === 'creation' ? 'Création de Logo' : 'Refonte de Logo'}</span>
                                                        </p>
                                                    )}
                                                    {item.description && (
                                                        <p className="text-[10px] font-medium text-gray-600 leading-tight">
                                                            Description: {item.description}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        <div
                                            onClick={() => updateItem({ serviceRetouche: !item.serviceRetouche })}
                                            className={`flex items-center justify-between p-3 bg-white rounded-lg border transition-all cursor-pointer hover:border-orange-200 ${item.serviceRetouche ? 'border-orange-500 ring-1 ring-orange-500' : 'border-gray-100'}`}
                                        >
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-gray-800">Retouche Pro</span>
                                                <span className="text-[10px] text-gray-500">Retrait fond + Amélioration définition + Optimisation impression ({(cartCount || 0) >= 10 ? 'OFFERT' : '+50€'})</span>
                                            </div>
                                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${item.serviceRetouche ? 'bg-orange-500 border-orange-500' : 'bg-white border-gray-200'}`}>
                                                {item.serviceRetouche && <i className="fa-solid fa-check text-[10px] text-white"></i>}
                                            </div>
                                        </div>

                                        <div
                                            onClick={() => updateItem({ serviceModernisation: !item.serviceModernisation })}
                                            className={`flex items-center justify-between p-3 bg-white rounded-lg border transition-all cursor-pointer hover:border-orange-200 ${item.serviceModernisation ? 'border-orange-500 ring-1 ring-orange-500' : 'border-gray-100'}`}
                                        >
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-gray-800">Modernisation / Refonte</span>
                                                <span className="text-[10px] text-gray-500">Redesign complet du logo + Vectorisation ({(cartCount || 0) >= 10 ? 'OFFERT' : '+100€'})</span>
                                            </div>
                                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${item.serviceModernisation ? 'bg-orange-500 border-orange-500' : 'bg-white border-gray-200'}`}>
                                                {item.serviceModernisation && <i className="fa-solid fa-check text-[10px] text-white"></i>}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* SIZE SELECTOR */}
                        <div data-layout-id="size-selector-desktop" id="size-selector-desktop" className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm w-full">
                            <div className="mb-3 px-2 flex items-center justify-between">
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-3 mb-1">
                                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Choix des tailles</h4>
                                        <button
                                            onClick={() => setShowSizeGuide(true)}
                                            className="text-[9px] font-bold text-gray-400 hover:text-orange-600 transition-colors flex items-center gap-1 border-b border-gray-200 border-dotted"
                                        >
                                            <i className="fa-solid fa-ruler-vertical"></i>
                                            Guide des tailles (Mesures)
                                        </button>
                                    </div>
                                    <p className="text-[9px] font-bold text-orange-600 mt-1 uppercase italic">Plusieurs tailles/quantités possibles par projet</p>
                                </div>
                                {Object.values(selectedSizes).some(qty => (qty as number) > 0) && (
                                    <div className="bg-orange-50 px-2 py-0.5 rounded text-[10px] font-black text-orange-700 animate-pulse">
                                        {Object.values(selectedSizes).reduce((acc, qty) => acc + (qty as number), 0)} PIÈCES
                                    </div>
                                )}
                            </div>
                            <div data-layout-id="size-selector-container" className={`flex flex-wrap gap-2 justify-center ${shakeSizes ? 'animate-shake' : ''}`}>
                                {(product.sizes || ["XS", "S", "M", "L", "XL", "XXL", "3XL"]).filter((s: string) => !['4XL', '5XL', '6XL', '7XL', '8XL', '9XL', '10XL'].includes(s)).map((size: string) => {
                                    const qty = selectedSizes[size] || 0;
                                    return (
                                        <div key={size} className={`flex items-center rounded-lg border transition-all overflow-hidden mb-1 ${qty > 0 ? 'bg-gray-900 border-gray-900 shadow-md ring-1 ring-offset-1 ring-gray-900' : 'bg-white border-gray-200 hover:border-orange-500'}`}>
                                            {qty > 0 ? (
                                                <>
                                                    <button onClick={() => updateSizeQuantity(size, -1)} className="w-10 h-10 flex items-center justify-center text-white hover:bg-gray-700 transition-colors font-bold text-lg">-</button>
                                                    <div className="h-10 px-3 flex items-center justify-center bg-gray-900 text-white font-bold text-xs min-w-[3rem] border-x border-gray-700">
                                                        {size}<span className="text-[10px] ml-1 opacity-70">x{qty}</span>
                                                    </div>
                                                    <button onClick={() => updateSizeQuantity(size, 1)} className="w-10 h-10 flex items-center justify-center text-white hover:bg-gray-700 transition-colors font-bold text-lg">+</button>
                                                </>
                                            ) : (
                                                <button
                                                    onClick={() => {
                                                        updateSizeQuantity(size, 1);
                                                    }}
                                                    className="w-14 h-10 flex items-center justify-center text-gray-600 font-bold text-xs hover:bg-orange-50 transition-colors"
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
                                    className="w-full flex items-center justify-center gap-2 text-[10px] font-bold text-orange-600 hover:text-orange-700 transition-colors"
                                >
                                    <span>{showAllSizes ? "Masquer grandes tailles" : "Voir + tailles (4XL+)"}</span>
                                    <i className={`fa-solid fa-chevron-${showAllSizes ? 'up' : 'down'}`}></i>
                                </button>

                                {showAllSizes && (
                                    <div className="flex flex-wrap gap-2 justify-center mt-3 animate-fade-in">
                                        {(product.sizes || []).filter((s: string) => ['4XL', '5XL', '6XL', '7XL', '8XL', '9XL', '10XL'].includes(s)).map((size: string) => {
                                            const qty = selectedSizes[size] || 0;
                                            return (
                                                <div key={size} className={`flex items-center rounded-lg border transition-all overflow-hidden mb-1 ${qty > 0 ? 'bg-orange-50 border-orange-200 ring-1 ring-offset-1 ring-orange-200' : 'bg-white border-gray-200 hover:border-orange-500'}`}>
                                                    {qty > 0 ? (
                                                        <>
                                                            <button onClick={() => updateSizeQuantity(size, -1)} className="w-10 h-10 flex items-center justify-center text-orange-600 hover:bg-orange-100 transition-colors font-bold text-lg">-</button>
                                                            <div className="h-10 px-3 flex items-center justify-center bg-orange-50 text-orange-800 font-bold text-xs min-w-[3rem] border-x border-orange-200">
                                                                {size}<span className="text-[10px] ml-1 opacity-70">x{qty}</span>
                                                            </div>
                                                            <button onClick={() => updateSizeQuantity(size, 1)} className="w-10 h-10 flex items-center justify-center text-orange-600 hover:bg-orange-100 transition-colors font-bold text-lg">+</button>
                                                        </>
                                                    ) : (
                                                        <button
                                                            onClick={() => updateSizeQuantity(size, 1)}
                                                            className="w-14 h-10 flex items-center justify-center text-gray-500 font-bold text-xs hover:bg-orange-50 transition-colors"
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

                        {/* 2.5 AI RESULT THUMBNAIL (DESKTOP) - MOVED BELOW SIZES */}
                        {(aiGenerating || isGeneratingLocal || aiResult) && (
                            <div className="w-full flex flex-col items-center gap-3 mt-4 mb-2 animate-fade-in">
                                {(aiGenerating || isGeneratingLocal) ? (
                                    <div className="w-24 aspect-[9/16] rounded-2xl border-2 border-orange-200 border-dashed flex flex-col items-center justify-center bg-orange-50 text-orange-500 animate-pulse">
                                        <i className="fa-solid fa-circle-notch fa-spin text-2xl mb-2"></i>
                                        <span className="text-[10px] font-black uppercase text-center px-2 mt-2">Génération en cours...</span>
                                    </div>
                                ) : aiResult ? (
                                    <>
                                        <div className="relative">
                                            <div
                                                onClick={() => setShowAiResultModal(true)}
                                                className="w-24 aspect-[9/16] rounded-2xl border-2 border-orange-500 overflow-hidden shadow-2xl cursor-pointer transform hover:scale-110 transition-all relative group bg-white"
                                            >
                                                <img src={aiResult} className="w-full h-full object-cover" alt="AI Preview" />
                                                <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                    <i className="fa-solid fa-expand text-white text-xl"></i>
                                                </div>
                                            </div>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); if (setAiResult) setAiResult(null); }}
                                                className="absolute -top-3 -right-3 w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 z-10"
                                                title="Supprimer la création IA"
                                            >
                                                <i className="fa-solid fa-times text-sm"></i>
                                            </button>
                                        </div>
                                        <span className="text-[11px] font-black text-orange-600 uppercase tracking-widest">Voir ma création IA en HD</span>
                                    </>
                                ) : null}
                            </div>
                        )}



                        {/* ADD TO CART ACTION */}
                        <div className="relative group w-full max-w-md">
                            {showSizeError && (
                                <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-lg animate-bounce whitespace-nowrap z-50">
                                    Veuillez choisir une taille d'abord !
                                </div>
                            )}
                            {/* REAL-TIME PRICE DISPLAY (DESKTOP) */}
                            {activePricing.total > 0 && (
                                <div className="mb-4 p-4 bg-gray-50 rounded-2xl border border-gray-100 animate-fade-in">
                                    <div className="flex justify-between items-end mb-1">
                                        <span className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">Total Estimé</span>
                                        <span className="text-3xl font-black text-gray-900 leading-none">
                                            {activePricing.total.toFixed(2)}€
                                        </span>
                                    </div>
                                    <div className="flex flex-col gap-0.5 border-t border-gray-200 mt-2 pt-2">
                                        <div className="flex justify-between text-[11px] text-gray-400 font-medium">
                                            <span>Vêtement ({activePricing.pieces} p.)</span>
                                            <span>{activePricing.garmentPart.toFixed(2)}€</span>
                                        </div>
                                        <div className="flex justify-between text-[11px] text-gray-400 font-medium">
                                            <span>Production + Forfait Impression</span>
                                            <span>{activePricing.markingPart.toFixed(2)}€</span>
                                        </div>
                                        {activePricing.services > 0 && (
                                            <div className="flex justify-between text-[11px] text-orange-500 font-bold">
                                                <span>Services Atelier</span>
                                                <span>+{activePricing.services.toFixed(2)}€</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-3 w-full">
                                <button
                                    onClick={handleShareDesign}
                                    disabled={sharingLoading}
                                    className="flex-1 py-5 bg-gray-100 hover:bg-gray-200 text-gray-900 font-bold rounded-2xl transition-all flex items-center justify-center gap-2"
                                >
                                    <i className={`fa-solid ${sharingLoading ? 'fa-spinner fa-spin' : 'fa-share-nodes'}`}></i>
                                    {sharingLoading ? 'Partager' : 'Partager'}
                                </button>
                                <button
                                    onClick={handleAddToCart}
                                    disabled={Object.values(selectedSizes).every(q => q === 0)}
                                    className={`flex-[2] py-5 rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl transition-all flex items-center justify-center gap-3 active:scale-95 ${Object.values(selectedSizes).every(q => q === 0)
                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-50'
                                        : 'bg-gray-900 text-white hover:bg-black hover:shadow-gray-900/40'
                                        }`}
                                >
                                    <span>Ajouter</span>
                                    <i className="fa-solid fa-cart-shopping"></i>
                                </button>
                            </div>

                            {/* ADMIN VALIDATION BUTTON (DESKTOP) */}
                            {user?.isAdmin && isRemixMode && remixPostId && (
                                <button
                                    onClick={async () => {
                                        if (isUpdatingPost) return;
                                        setIsUpdatingPost(true);
                                        try {
                                            await onUpdatePost?.(remixPostId, item);
                                        } catch (e) {
                                            console.error(e);
                                        } finally {
                                            setIsUpdatingPost(false);
                                        }
                                    }}
                                    disabled={isUpdatingPost}
                                    className="w-full mt-4 py-4 bg-green-600 hover:bg-green-700 text-white font-black text-lg uppercase tracking-widest shadow-xl transform transition-all rounded-2xl flex items-center justify-center gap-3 lg:ml-[55px] lg:mt-[35px]"
                                >
                                    {isUpdatingPost ? (
                                        <i className="fa-solid fa-circle-notch fa-spin"></i>
                                    ) : (
                                        <i className="fa-solid fa-check-double"></i>
                                    )}
                                    <span>{isUpdatingPost ? "MISE À JOUR..." : "Valider les modifications"}</span>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* --- MOBILE TOOLS & COLORS (INLINE) --- */}
                    <div className="lg:hidden w-full px-4 mt-auto mb-6 flex flex-col gap-4 relative z-50">

                        {/* 2.5 AI RESULT THUMBNAIL (MOVED ABOVE TOOLBAR) */}


                        {/* 1. TOOLS BAR CAROUSEL OR STEP 3 HERO */}
                        {currentStep === 3 ? (
                            <div className="flex items-center justify-between gap-4 w-full h-[85px] px-4 bg-white/40 backdrop-blur-xl rounded-3xl border border-white/20 shadow-2xl animate-fade-in mt-4">
                                <button
                                    onClick={() => {
                                        const nextState = !isMeasureToolActive;
                                        setIsMeasureToolActive(nextState);
                                        setShowGuides(!showGuides);
                                        if (nextState) setShowSizeGuide(true);
                                    }}
                                    className={`w-14 h-14 flex flex-col items-center justify-center rounded-2xl transition-all ${isMeasureToolActive ? 'bg-orange-600 text-white shadow-lg' : 'bg-white/90 text-gray-500 shadow-sm'}`}
                                >
                                    <i className="fa-solid fa-ruler-combined text-lg"></i>
                                    <span className="text-[8px] font-bold mt-1 uppercase">Mesures</span>
                                </button>

                                <button
                                    onClick={handleAddToCartAction}
                                    disabled={isCapturing}
                                    className="relative flex-1 h-[60px] bg-gray-900 text-white font-black rounded-2xl shadow-xl flex flex-col items-center justify-center gap-0 hero-btn-glow transform active:scale-95 transition-all"
                                >
                                    {showSizeError && (
                                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-red-600 text-white text-[10px] uppercase font-bold px-3 py-1.5 rounded-full shadow-lg whitespace-nowrap animate-bounce z-50">
                                            Choix taille requis !
                                            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-red-600 rotate-45"></div>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2">
                                        <i className={`fa-solid ${isCapturing ? 'fa-circle-notch fa-spin' : 'fa-cart-plus'} text-orange-500 text-lg`}></i>
                                        <div className="flex flex-col items-center">
                                            <span className="text-sm tracking-[0.1em] leading-tight">
                                                {isCapturing ? "WAIT..." : (
                                                    Object.values(selectedSizes).reduce((acc, qty) => acc + (qty as number), 0) > 0
                                                        ? `AJOUTER (${Object.values(selectedSizes).reduce((acc, qty) => acc + (qty as number), 0)})`
                                                        : "PANIER"
                                                )}
                                            </span>
                                            {activePricing.total > 0 && !isCapturing && (
                                                <span className="text-[10px] font-black text-orange-400 leading-none mt-0.5">
                                                    {activePricing.total.toFixed(2)}€
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <span className="text-[8px] font-bold opacity-60 uppercase tracking-widest">Valider ma création</span>
                                </button>

                                <button
                                    onClick={() => setShowSizeGuide(true)}
                                    className="w-14 h-14 flex flex-col items-center justify-center rounded-2xl bg-white/90 text-gray-500 shadow-sm hover:text-orange-600 transition-all active:scale-95"
                                >
                                    <i className="fa-solid fa-ruler-vertical text-lg"></i>
                                    <span className="text-[8px] font-bold mt-1 uppercase">Tailles</span>
                                </button>
                            </div>
                        ) : (
                            <div style={{ position: 'relative', zIndex: 200 }}>
                                <CreationToolbar
                                    tools={mobileTools}
                                    activeToolId={activePanel}
                                    onToolSelect={() => { }}
                                />
                            </div>)}

                        <div className="hidden">
                            <input id="hidden-file-input" type="file" accept="image/*" onChange={handleLogoUpload} />
                            <input id="hidden-camera-input" type="file" accept="image/*" capture="environment" onChange={handleLogoUpload} />
                        </div>

                        {/* 3. MOBILE SIZE SELECTOR & CART */}
                        <div className="mobile-size-cart-container lg:hidden" id="size-selector-mobile">
                            <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm w-full">
                                <div className="mb-2 px-1 flex items-center justify-between">
                                    <div className="flex flex-col">
                                        <button
                                            onClick={() => setShowSizeGuide(true)}
                                            className="text-[9px] font-bold text-gray-400 hover:text-orange-600 transition-colors flex items-center gap-1 border-b border-gray-200 border-dotted w-fit mb-1"
                                        >
                                            <i className="fa-solid fa-ruler-vertical"></i>
                                            Guide des tailles (Mesures)
                                        </button>
                                        <p className="text-[9px] font-bold text-orange-600 uppercase italic">Multi-tailles et quantités cumulables</p>
                                    </div>
                                    {Object.values(selectedSizes).some(qty => (qty as number) > 0) && (
                                        <div className="bg-orange-50 px-2 py-0.5 rounded text-[9px] font-black text-orange-700">
                                            {Object.values(selectedSizes).reduce((acc, qty) => acc + (qty as number), 0)} PIÈCES
                                        </div>
                                    )}
                                </div>
                                <div className="flex flex-wrap gap-2 justify-center">
                                    {(product.sizes || ["XS", "S", "M", "L", "XL", "XXL", "3XL"]).filter((s: string) => {
                                        if (showAllSizes) return true;
                                        return !['4XL', '5XL', '6XL', '7XL', '8XL', '9XL', '10XL'].includes(s);
                                    }).map((size: string) => {
                                        const qty = selectedSizes[size] || 0;
                                        return (
                                            <div key={size} className={`flex items-center rounded-lg border transition-all overflow-hidden ${qty > 0 ? 'bg-gray-900 border-gray-900 shadow-md' : 'bg-white border-gray-200'}`}>
                                                {qty > 0 ? (
                                                    <>
                                                        <button onClick={() => updateSizeQuantity(size, -1)} className="w-8 h-8 flex items-center justify-center text-white font-bold">-</button>
                                                        <div className="h-8 px-2 flex items-center justify-center bg-gray-900 text-white font-bold text-[10px] min-w-[2.5rem]">
                                                            {size}<span className="text-[8px] ml-0.5 opacity-70">x{qty}</span>
                                                        </div>
                                                        <button onClick={() => updateSizeQuantity(size, 1)} className="w-8 h-8 flex items-center justify-center text-white font-bold">+</button>
                                                    </>
                                                ) : (
                                                    <button onClick={() => updateSizeQuantity(size, 1)} className="w-10 h-8 flex items-center justify-center text-gray-600 font-bold text-[10px]">
                                                        {size}
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}

                                    {/* TOGGLE BUTTON FOR MORE SIZES */}
                                    <button
                                        onClick={() => setShowAllSizes(!showAllSizes)}
                                        className="h-8 px-3 flex items-center justify-center bg-gray-100 text-gray-600 font-bold text-[10px] rounded-lg border border-gray-200 hover:bg-gray-200 transition-colors"
                                    >
                                        {showAllSizes ? 'Voir -' : 'Voir +'}
                                    </button>
                                </div>
                            </div>

                            {/* Size guide link moved to top */}
                        </div>

                        {/* MOBILE AI STUDIO RESULT & LOADING STATE */}
                        {(aiGenerating || isGeneratingLocal || aiResult) && (
                            <div className="w-full bg-white/80 backdrop-blur-md rounded-2xl border border-white/20 shadow-lg px-4 py-3 flex flex-col gap-2 lg:hidden mt-2">
                                <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-2">
                                        <i className="fa-solid fa-wand-magic-sparkles text-orange-500 text-xs"></i>
                                        <span className="text-[10px] font-black text-gray-800 uppercase tracking-widest">Résultat IA</span>
                                    </div>
                                </div>
                                {(aiGenerating || isGeneratingLocal) ? (
                                    <div className="flex items-center justify-center p-4 bg-orange-50 rounded-xl border border-orange-100 w-32 mx-auto aspect-[9/16]">
                                        <div className="flex flex-col items-center gap-2 text-center">
                                            <i className="fa-solid fa-circle-notch fa-spin text-orange-500 text-2xl"></i>
                                            <span className="text-[10px] font-bold text-orange-700 uppercase">Génération en cours...</span>
                                        </div>
                                    </div>
                                ) : aiResult ? (
                                    <div className="relative w-full flex justify-center">
                                        <div
                                            onClick={() => setShowAiResultModal(true)}
                                            className="relative w-32 aspect-[9/16] rounded-xl overflow-hidden border-2 border-orange-500 cursor-pointer group shadow-sm bg-gray-50"
                                        >
                                            <img src={aiResult!} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" alt="AI Generated Result" />
                                            <div className="absolute inset-0 bg-black/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <i className="fa-solid fa-expand text-white text-3xl drop-shadow-md"></i>
                                            </div>
                                            <div className="absolute top-2 left-2 flex items-center gap-1 bg-green-500 px-2 py-1 rounded-full shadow-md">
                                                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                                                <span className="text-[9px] font-black text-white uppercase">Cliquer pour voir</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); if (setAiResult) setAiResult(null); }}
                                            className="absolute -top-3 -right-3 w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 z-10"
                                            title="Supprimer la création IA"
                                        >
                                            <i className="fa-solid fa-times text-sm"></i>
                                        </button>
                                    </div>
                                ) : null}
                            </div>
                        )}

                        {/* MOBILE ATELIER SECTION (MOVED TO BOTTOM) */}
                        <div className="w-full bg-white/80 backdrop-blur-md rounded-2xl border border-white/20 shadow-lg px-4 py-3 flex flex-col gap-2">
                            <button
                                onClick={() => setWorkshopOpen(!workshopOpen)}
                                className="flex items-center justify-between w-full"
                            >
                                <div className="flex items-center gap-2">
                                    <i className="fa-solid fa-scissors text-gray-400 text-xs"></i>
                                    <span className="text-[10px] font-black text-gray-800 uppercase tracking-widest">Options Atelier</span>
                                </div>
                                <i className={`fa-solid fa-chevron-${workshopOpen ? 'up' : 'down'} text-gray-400 text-[10px]`}></i>
                            </button>

                            {workshopOpen && (
                                <div className="flex flex-col gap-2 mt-2 animate-fade-in border-t border-gray-100 pt-2">
                                    {isServiceMode && (item.activityName || item.description) && (
                                        <div className="mb-2 p-3 bg-indigo-50/50 rounded-xl border border-indigo-100">
                                            <h4 className="text-[8px] font-black text-indigo-900 uppercase tracking-widest mb-1">Résumé</h4>
                                            <div className="flex flex-col gap-0.5">
                                                <p className="text-[10px] font-bold text-indigo-700 truncate">{item.activityName}</p>
                                                {activeLogoService?.type && (
                                                    <p className="text-[9px] font-black text-indigo-600 uppercase tracking-tighter">
                                                        {activeLogoService.type === 'creation' ? 'Création de Logo' : 'Refonte de Logo'}
                                                    </p>
                                                )}
                                            </div>
                                            <p className="text-[9px] text-gray-500 line-clamp-2">{item.description}</p>
                                        </div>
                                    )}
                                    <div
                                        onClick={() => updateItem({ serviceRetouche: !item.serviceRetouche })}
                                        className={`flex items-center justify-between p-2 rounded-xl border transition-all ${item.serviceRetouche ? 'bg-orange-600 border-orange-600 text-white' : 'bg-white border-gray-100 text-gray-600'}`}
                                    >
                                        <span className="text-[10px] font-bold">Retouche Pro (Retrait fond + Amélio. déf.) ({(cartCount || 0) >= 10 ? 'OFFERT' : '+50€'})</span>
                                        {item.serviceRetouche && <i className="fa-solid fa-check text-[10px]"></i>}
                                    </div>
                                    <div
                                        onClick={() => updateItem({ serviceModernisation: !item.serviceModernisation })}
                                        className={`flex items-center justify-between p-2 rounded-xl border transition-all ${item.serviceModernisation ? 'bg-orange-600 border-orange-600 text-white' : 'bg-white border-gray-100 text-gray-600'}`}
                                    >
                                        <span className="text-[10px] font-bold">Modernisation (Redesign complet) ({(cartCount || 0) >= 10 ? 'OFFERT' : '+100€'})</span>
                                        {item.serviceModernisation && <i className="fa-solid fa-check text-[10px]"></i>}
                                    </div>
                                </div>
                            )}
                        </div>
                        {/* END ATELIER */}
                    </div>

                </div>



            </div>

            {/* UNIVERSAL MODAL PORTALS */}
            <div className="tools-portals-container">
                {/* SIZE GUIDE MODAL */}
                {showSizeGuide && createPortal(
                    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                        <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl relative max-h-[80vh] overflow-y-auto">
                            <button
                                onClick={() => setShowSizeGuide(false)}
                                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200"
                            >
                                <i className="fa-solid fa-xmark"></i>
                            </button>

                            <h3 className="text-xl font-black text-gray-900 mb-1 flex items-center gap-2">
                                <i className="fa-solid fa-ruler-combined text-orange-600"></i>
                                Guide des Tailles
                            </h3>
                            <div className="mb-4">
                                <p className="text-sm font-bold text-gray-700 uppercase tracking-tight">{product.name}</p>
                                {product.reference && (
                                    <p className="text-[10px] font-black text-orange-600 bg-orange-50 px-2 py-0.5 rounded inline-block">
                                        REF: {product.reference}
                                    </p>
                                )}
                            </div>

                            <div className="bg-orange-50 p-3 rounded-lg border border-orange-100 mb-4">
                                <p className="text-xs text-orange-800 font-bold flex items-start gap-2">
                                    <i className="fa-solid fa-circle-info mt-0.5"></i>
                                    <span>Le choix de la taille adapte automatiquement la dimension de l'impression.</span>
                                </p>
                            </div>

                            <p className="text-sm text-gray-500 mb-4">Hauteur estimée (épaule à bas) en cm :</p>

                            <div className="grid grid-cols-2 gap-2 text-sm">
                                {(product.sizeChart ? Object.entries(product.sizeChart) : [
                                    ['S', '69'], ['M', '71'], ['L', '74'], ['XL', '76'],
                                    ['2XL', '79'], ['3XL', '81'], ['4XL', '84'], ['5XL', '86'],
                                    ['6XL', '89'], ['7XL', '91'], ['8XL', '94'], ['9XL', '96'],
                                    ['10XL', '99']
                                ]).map(([size, value]) => (
                                    <button
                                        key={size}
                                        onClick={() => {
                                            setPreviewSize(size);
                                            // Set this size as default (1 unit)
                                            setSelectedSizes({ [size]: 1 });
                                            setShowSizeGuide(false);
                                        }}
                                        className="flex justify-between items-center p-2 bg-gray-50 rounded border border-gray-100 hover:bg-orange-50 hover:border-orange-200 hover:text-orange-600 transition-colors cursor-pointer w-full"
                                    >
                                        <span className={`font-bold ${previewSize === size ? 'text-orange-600' : 'text-gray-900'}`}>
                                            {size}
                                            {previewSize === size && <i className="fa-solid fa-check ml-2 text-xs"></i>}
                                        </span>
                                        <span className="text-gray-600">{String(value)} cm</span>
                                    </button>
                                ))}
                            </div>

                            <p className="text-[10px] text-gray-400 mt-4 text-center italic">
                                * Tolérance de +/- 2cm selon la fabrication.
                            </p>

                            <button
                                onClick={() => setShowSizeGuide(false)}
                                className="w-full mt-6 py-3 bg-gray-900 text-white font-bold rounded-xl"
                            >
                                Compris
                            </button>
                        </div>
                    </div>,
                    document.body
                )}

                {/* AI RESULT PREVIEW MODAL */}
                {showAiResultModal && aiResult && createPortal(
                    <div className="fixed inset-0 z-[10001] bg-black/95 backdrop-blur-md flex items-center justify-center animate-fade-in p-4 md:p-8">
                        <button
                            onClick={() => setShowAiResultModal(false)}
                            className="absolute top-4 right-4 md:top-8 md:right-8 w-12 h-12 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full text-white z-50 transition-colors"
                        >
                            <i className="fa-solid fa-xmark text-xl"></i>
                        </button>

                        <div className="flex flex-col md:flex-row w-full h-full max-w-7xl mx-auto gap-6 md:gap-12 items-center justify-center">

                            {/* IMAGE CONTAINER */}
                            <div className="flex-1 w-full h-full max-h-[65vh] md:max-h-[85vh] flex items-center justify-center relative">
                                <div className="h-full max-w-[90vw] aspect-[9/16] relative rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/10 bg-black/20">
                                    <img src={aiResult} className="w-full h-full object-cover" alt="AI HD" />
                                </div>
                            </div>

                            {/* BUTTONS CONTAINER */}
                            <div className="w-full md:w-96 flex-shrink-0 flex flex-col gap-4 bg-white/5 backdrop-blur-xl p-6 rounded-3xl border border-white/10">
                                <h3 className="text-2xl font-black text-white mb-2 uppercase tracking-tight text-center">VOTRE CRÉATION IA</h3>

                                <button
                                    onClick={() => { setCapturedImage(null); setShowAiResultModal(false); }}
                                    className="w-full py-5 bg-green-500 text-white font-black uppercase tracking-widest rounded-2xl shadow-[0_0_30px_rgba(34,197,94,0.3)] hover:bg-green-400 transition-all hover:scale-[1.02] flex items-center justify-center gap-3"
                                >
                                    <i className="fa-solid fa-check text-xl"></i>
                                    UTILISER CE DESIGN
                                </button>

                                <button
                                    onClick={() => {
                                        if (setAiResult) setAiResult(null);
                                        setShowAiResultModal(false);
                                    }}
                                    className="w-full py-4 bg-white/10 text-white font-bold rounded-2xl hover:bg-white/20 transition-all flex items-center justify-center gap-3"
                                >
                                    <i className="fa-solid fa-rotate-left"></i>
                                    RECOMMENCER
                                </button>

                                {/* ADD TO PROFILE BUTTON */}
                                <button
                                    onClick={async () => {
                                        if (!user) {
                                            onAuthRequired();
                                        } else {
                                            const btn = document.getElementById('btn-save-profile-studio');
                                            if (btn) {
                                                const originalText = btn.innerHTML;
                                                btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> SAUVEGARDE...';
                                                try {
                                                    await onSaveToProfile(aiResult || '', selectedAiPrompt || customStylePrompt, selectedStyleName || activeStyleCategory, item);
                                                    btn.innerHTML = '<i class="fa-solid fa-check"></i> SAUVEGARDÉ !';
                                                    btn.classList.remove('bg-white/10', 'text-white', 'border-white/20');
                                                    btn.classList.add('bg-orange-500', 'text-white', 'border-orange-500');
                                                    setTimeout(() => {
                                                        if (btn) {
                                                            btn.innerHTML = originalText;
                                                            btn.classList.add('bg-white/10', 'text-white', 'border-white/20');
                                                            btn.classList.remove('bg-orange-500', 'text-white', 'border-orange-500');
                                                        }
                                                    }, 3000);
                                                } catch (e) {
                                                    console.error(e);
                                                    btn.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> ERREUR';
                                                    setTimeout(() => btn.innerHTML = originalText, 2000);
                                                }
                                            }
                                        }
                                    }}
                                    id="btn-save-profile-studio"
                                    className="w-full py-4 bg-white/5 border border-white/10 text-white font-bold rounded-2xl hover:bg-white/10 transition-all flex items-center justify-center gap-3 mt-4"
                                >
                                    <i className={`fa-solid ${user ? 'fa-heart' : 'fa-lock'}`}></i>
                                    {user ? 'SAUVEGARDER' : 'SE CONNECTER POUR SAUVEGARDER'}
                                </button>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}



                {/* IMPORT/COLOR PANEL */}
                {
                    activePanel === 'import' && createPortal(
                        <div data-layout-id="desktop-panel-import" className="fixed inset-0 z-[9999] flex items-end lg:items-start justify-center lg:justify-end bg-transparent lg:pt-16 p-0 lg:p-4 pointer-events-none" style={{ display: 'flex', opacity: 1, visibility: 'visible', top: 0 }}>
                            <div
                                className="w-full lg:max-w-sm bg-white lg:border border-gray-200 p-6 rounded-t-2xl lg:rounded-2xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)] lg:shadow-2xl flex flex-col gap-4 relative pointer-events-auto touch-none select-none cursor-grab active:cursor-grabbing lg:translate-x-0 lg:translate-y-0"
                                style={{
                                    // MOBILE SAFETY: Ignore offsets on mobile, fix at bottom. Desktop uses transform.
                                    transform: window.innerWidth >= 1024 ? `translate(${panelOffsets.import.x}px, ${panelOffsets.import.y}px)` : 'none',
                                    marginTop: '0'
                                }}
                                onPointerDown={(e) => handlePanelDragStart(e, 'import')}
                                onPointerMove={handlePanelDragMove}
                                onPointerUp={handlePanelDragEnd}
                            >
                                {/* NEW: Handle visual indicator */}
                                <div className="absolute top-2 left-1/2 -translate-x-1/2 w-8 h-1 bg-gray-200 rounded-full cursor-grab active:cursor-grabbing"></div>

                                <button onClick={() => setActivePanel('none')} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full hover:bg-gray-200 transition-colors no-drag"><i className="fa-solid fa-times text-gray-500"></i></button>

                                {/* LOGO SLOTS REMOVED - FORCED SINGLE LOGO */}

                                {(() => {
                                    const logoData = {
                                        originalUrl: isBack ? item.originalLogoUrlBack : item.originalLogoUrlFront,
                                        predefinedUrl: isBack ? item.predefinedLogoUrlBack : item.predefinedLogoUrlFront,
                                        processedUrl: isBack ? item.processedLogoUrlBack : item.processedLogoUrlFront,
                                        processedUrl_original: isBack ? item.processedLogoUrlBack_original : item.processedLogoUrlFront_original,
                                        backgroundRemoved: isBack ? item.backgroundRemovedBack : item.backgroundRemovedFront,
                                        activeColor: isBack ? item.activeLogoColorBack : item.activeLogoColorFront,
                                        inverted: isBack ? item.logoInvertedBack : item.logoInvertedFront
                                    };

                                    const hasContent = !!(logoData.originalUrl || logoData.predefinedUrl || logoData.processedUrl);

                                    if (croppingImage) {
                                        return (
                                            <div className="flex flex-col h-full animate-fade-in no-drag">
                                                <div className="flex-none flex flex-col gap-3 z-20 mb-4">
                                                    <div className="flex justify-between items-center mt-1">
                                                        <h3 className="text-xl font-black text-gray-900">ROGNER</h3>
                                                        <button onClick={() => { setCroppingImage(null); setUploadedLogoPreview(null); }} className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full hover:bg-gray-200">
                                                            <i className="fa-solid fa-xmark text-gray-500"></i>
                                                        </button>
                                                    </div>
                                                    <div className="flex gap-3">
                                                        <button onClick={() => { setCroppingImage(null); setUploadedLogoPreview(null); }} className="flex-1 py-3 bg-gray-100 text-gray-500 font-bold rounded-xl hover:bg-gray-200 transition-colors text-xs uppercase tracking-wide">
                                                            Annuler
                                                        </button>
                                                        <button onClick={handleCropSave} className="flex-1 py-3 bg-gray-900 text-white font-bold rounded-xl shadow-lg hover:bg-black transition-all text-xs uppercase tracking-wide flex items-center justify-center gap-2">
                                                            <i className="fa-solid fa-check"></i> Valider
                                                        </button>
                                                    </div>
                                                    <p className="text-[10px] text-gray-400 text-center font-bold uppercase tracking-widest mt-1">Glissez sur l'image pour cadrer</p>
                                                </div>

                                                <div className="flex-1 overflow-hidden bg-gray-50 rounded-xl flex items-center justify-center border border-gray-200 relative min-h-[300px]">
                                                    <ReactCrop
                                                        crop={crop}
                                                        onChange={(c) => setCrop(c)}
                                                        onComplete={(c) => setCompletedCrop(c)}
                                                        className="max-h-full"
                                                    >
                                                        <img ref={cropImgRef} src={croppingImage} alt="Crop target" className="max-h-[40vh] object-contain mx-auto" style={{ maxWidth: '100%' }} />
                                                    </ReactCrop>
                                                </div>
                                            </div>
                                        );
                                    }

                                    if (hasContent) {
                                        return (
                                            <>
                                                {/* LOGO ACTIVE: COLOR OPTIONS */}
                                                <div className="flex items-center justify-between gap-4 mb-2 pr-10">
                                                    <h3 className="font-bold text-gray-800 text-lg">Options Logo</h3>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={undo}
                                                            disabled={undoStack.length === 0}
                                                            className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all ${undoStack.length === 0 ? 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed' : 'bg-white text-gray-600 border-gray-200 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 shadow-sm active:scale-90'}`}
                                                            title="Annuler"
                                                        >
                                                            <i className="fa-solid fa-rotate-left"></i>
                                                        </button>
                                                        <button
                                                            onClick={redo}
                                                            disabled={redoStack.length === 0}
                                                            className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all ${redoStack.length === 0 ? 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed' : 'bg-white text-gray-600 border-gray-200 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 shadow-sm active:scale-90'}`}
                                                            title="Répéter"
                                                        >
                                                            <i className="fa-solid fa-rotate-right"></i>
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2 no-drag">
                                                    <button
                                                        onClick={async () => {
                                                            if (isPickingColor) return;
                                                            let url = logoData.processedUrl_original || logoData.originalUrl || logoData.predefinedUrl;
                                                            if (Array.isArray(url)) url = url[0];
                                                            if (!url) return;

                                                            if (!('EyeDropper' in window)) {
                                                                alert("Votre navigateur ne supporte pas l'outil pipette.");
                                                                return;
                                                            }

                                                            try {
                                                                setIsPickingColor(true);
                                                                // @ts-ignore
                                                                const eyeDropper = new window.EyeDropper();
                                                                const result = await eyeDropper.open();
                                                                const hex = result.sRGBHex;

                                                                const processed = await removeSpecificColor(url, hex, 30);

                                                                updateItem(isBack
                                                                    ? { backgroundRemovedBack: true, processedLogoUrlBack: processed, processedLogoUrlBack_original: processed, processedLogoUrlBack_noBackground: processed }
                                                                    : { backgroundRemovedFront: true, processedLogoUrlFront: processed, processedLogoUrlFront_original: processed, processedLogoUrlFront_noBackground: processed }
                                                                );
                                                            } catch (e: any) {
                                                                console.error("Color picking/removal failed", e);
                                                            } finally {
                                                                setIsPickingColor(false);
                                                            }
                                                        }}
                                                        className={`flex-1 h-14 rounded-xl border font-bold transition-all flex flex-col items-center justify-center gap-1 ${isPickingColor ? 'bg-orange-50 text-orange-600 border-orange-200' : 'bg-white text-gray-600 border-gray-200'}`}
                                                    >
                                                        {isPickingColor ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-eye-dropper"></i>}
                                                        <span className="text-[10px]">RETIRER</span>
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            let url = logoData.processedUrl_original || logoData.originalUrl || logoData.predefinedUrl;
                                                            if (Array.isArray(url)) url = url[0];
                                                            if (url) setCroppingImage(url);
                                                        }}
                                                        className="flex-1 h-14 rounded-xl border border-gray-200 bg-white font-bold text-gray-600 transition-all flex flex-col items-center justify-center gap-1 hover:bg-gray-50 active:scale-95"
                                                    >
                                                        <i className="fa-solid fa-crop-simple"></i>
                                                        <span className="text-[10px]">ROGNER</span>
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            const sourceIsBack = isBack;
                                                            if (sourceIsBack) {
                                                                // Copy BACK -> FRONT
                                                                updateItem({
                                                                    originalLogoUrlFront: item.originalLogoUrlBack,
                                                                    predefinedLogoUrlFront: item.predefinedLogoUrlBack,
                                                                    processedLogoUrlFront: item.processedLogoUrlBack,
                                                                    processedLogoUrlFront_original: item.processedLogoUrlBack_original,
                                                                    processedLogoUrlFront_noBackground: item.processedLogoUrlBack_noBackground,
                                                                    backgroundRemovedFront: item.backgroundRemovedBack,
                                                                    activeLogoColorFront: item.activeLogoColorBack,
                                                                    logoInvertedFront: item.logoInvertedBack,
                                                                    logoSizeFront: item.logoSizeBack,
                                                                    logoPositionXFront: item.logoPositionXBack,
                                                                    logoPositionYFront: item.logoPositionYBack,
                                                                    logoAspectRatioFront: item.logoAspectRatioBack
                                                                });
                                                            } else {
                                                                // Copy FRONT -> BACK
                                                                updateItem({
                                                                    originalLogoUrlBack: item.originalLogoUrlFront,
                                                                    predefinedLogoUrlBack: item.predefinedLogoUrlFront,
                                                                    processedLogoUrlBack: item.processedLogoUrlFront,
                                                                    processedLogoUrlBack_original: item.processedLogoUrlFront_original,
                                                                    processedLogoUrlBack_noBackground: item.processedLogoUrlFront_noBackground,
                                                                    backgroundRemovedBack: item.backgroundRemovedFront,
                                                                    activeLogoColorBack: item.activeLogoColorFront,
                                                                    logoInvertedBack: item.logoInvertedFront,
                                                                    logoSizeBack: item.logoSizeFront,
                                                                    logoPositionXBack: item.logoPositionXFront,
                                                                    logoPositionYBack: item.logoPositionYFront,
                                                                    logoAspectRatioBack: item.logoAspectRatioFront
                                                                });
                                                            }
                                                        }}
                                                        className="flex-1 h-14 rounded-xl border border-gray-200 bg-white font-bold text-gray-600 transition-all flex flex-col items-center justify-center gap-1 hover:bg-gray-50 active:scale-95"
                                                    >
                                                        <i className="fa-solid fa-copy"></i>
                                                        <span className="text-[10px]">COPIER</span>
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            const cleanup = isBack ? {
                                                                originalLogoUrlBack: null, processedLogoUrlBack_original: null,
                                                                isPredefinedLogoBack: false, predefinedLogoUrlBack: null,
                                                                processedLogoUrlBack: null, processedLogoUrlBack_noBackground: null,
                                                                processedLogoUrlBack_white: null, processedLogoUrlBack_black: null
                                                            } : {
                                                                originalLogoUrlFront: null, processedLogoUrlFront_original: null,
                                                                isPredefinedLogoFront: false, predefinedLogoUrlFront: null,
                                                                processedLogoUrlFront: null, processedLogoUrlFront_noBackground: null,
                                                                processedLogoUrlFront_white: null, processedLogoUrlFront_black: null
                                                            };
                                                            updateItem(cleanup);
                                                            setActiveEl(null);
                                                            setUploadedLogoPreview(null);
                                                        }}
                                                        className="flex-1 h-14 rounded-xl border border-red-100 bg-red-50 font-bold text-red-500 flex flex-col items-center justify-center gap-1"
                                                    >
                                                        <i className="fa-solid fa-trash-can"></i>
                                                        <span className="text-[10px]">SUPPR.</span>
                                                    </button>
                                                </div>

                                                {/* LOGO COLOR PALETTE */}
                                                <div className="flex flex-col gap-2 mt-4 no-drag">
                                                    <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Couleur du Logo</label>
                                                    <div className="flex flex-wrap gap-2">
                                                        <button
                                                            onClick={() => handleLogoColorChange('original')}
                                                            className={`w-10 h-10 rounded-xl border-2 transition-all hover:scale-105 shadow-sm flex flex-col items-center justify-center ${logoData.activeColor === 'original' || !logoData.activeColor ? 'bg-orange-500 border-orange-500 text-white shadow-md' : 'bg-white border-gray-100 text-gray-400 hover:border-orange-200'}`}
                                                            title="Original"
                                                        >
                                                            <i className="fa-solid fa-droplet-slash text-xs"></i>
                                                            <span className="text-[8px] font-bold mt-0.5">ORIGIN</span>
                                                        </button>
                                                        {['#000000', '#FFFFFF', '#EF4444', '#3B82F6', '#F59E0B', '#10B981', '#8B5CF6', '#EC4899', '#FFD700'].map(c => (
                                                            <button
                                                                key={c}
                                                                onClick={() => handleLogoColorChange(c)}
                                                                className={`w-10 h-10 rounded-xl border-2 transition-all hover:scale-105 shadow-sm ${logoData.activeColor === c ? 'ring-2 ring-orange-500 ring-offset-2 scale-105 border-white' : 'border-gray-100'}`}
                                                                style={{ backgroundColor: c }}
                                                                title={c}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>

                                                <div className="mt-auto pt-4 border-t border-gray-100 no-drag">
                                                    <button
                                                        onClick={() => triggerUniversalInput(null, true)}
                                                        className="w-full py-4 bg-orange-500 text-white font-bold rounded-2xl shadow-lg shadow-orange-200 hover:bg-orange-600 transition-all flex items-center justify-center gap-3"
                                                    >
                                                        <i className="fa-solid fa-cloud-arrow-up text-xl"></i>
                                                        REMPLACER L'IMAGE
                                                    </button>
                                                </div>
                                            </>
                                        );
                                    } else {
                                        return (
                                            <div className="flex flex-col gap-4 py-2 no-drag">
                                                <div className="text-center">
                                                    <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-2">
                                                        <i className="fa-solid fa-image text-2xl text-orange-500"></i>
                                                    </div>
                                                    <h3 className="text-lg font-bold text-gray-800">Logo</h3>
                                                    <p className="text-gray-500 text-xs">Importez une image pour personnaliser</p>
                                                </div>

                                                <button
                                                    onClick={() => triggerUniversalInput(null, true)}
                                                    className="w-full py-4 bg-orange-500 text-white font-black rounded-2xl shadow-xl shadow-orange-100 hover:bg-orange-600 transition-all flex items-center justify-center gap-4"
                                                >
                                                    <i className="fa-solid fa-cloud-arrow-up text-xl"></i>
                                                    CHARGER MON LOGO
                                                </button>

                                                <div className="flex flex-col gap-3">
                                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Atelier Logo</h4>
                                                    <button
                                                        onClick={onOpenAtelier || (() => { })}
                                                        className="flex flex-row items-center text-left p-4 rounded-xl border-2 border-indigo-100 bg-indigo-50/30 hover:border-indigo-500 transition-all group gap-4 relative"
                                                    >
                                                        <div className="absolute top-2 right-2 bg-indigo-600 text-white text-[8px] font-black px-2 py-1 rounded-full uppercase">Offre</div>
                                                        <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center shrink-0 text-indigo-600"><i className="fa-solid fa-wand-magic-sparkles"></i></div>
                                                        <div className="flex flex-col">
                                                            <h3 className="text-xs font-black text-indigo-600 uppercase">Logo Service</h3>
                                                            <p className="text-[10px] text-gray-500 leading-tight">Refonte par nos graphistes.</p>
                                                        </div>
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    }
                                })()}
                            </div>
                        </div>,
                        document.body
                    )
                }

                {/* TEXT PANEL */}
                {
                    activePanel === 'text' && createPortal(
                        <div data-layout-id="desktop-panel-text" className="fixed inset-0 z-[9999] flex items-start justify-end bg-transparent pt-16 p-4 pointer-events-none" style={{ display: 'flex', opacity: 1, visibility: 'visible', top: 0 }}>
                            <div
                                className="w-full max-w-sm flex flex-col relative pointer-events-auto touch-none select-none cursor-grab active:cursor-grabbing lg:translate-x-0 lg:translate-y-0"
                                style={{
                                    // MOBILE SAFETY: Ignore offsets on mobile, center fixed. Desktop uses transform.
                                    transform: window.innerWidth >= 1024 ? `translate(${panelOffsets.text.x}px, ${panelOffsets.text.y}px)` : 'none',
                                    marginTop: window.innerWidth < 1024 ? '10vh' : '0'
                                }}
                                onPointerDown={(e) => handlePanelDragStart(e, 'text')}
                                onPointerMove={handlePanelDragMove}
                                onPointerUp={handlePanelDragEnd}
                            >
                                <div className="bg-white p-4 rounded-t-2xl shadow-xl relative z-20 border-b border-gray-100">
                                    {/* NEW: Handle visual indicator */}
                                    <div className="absolute top-2 left-1/2 -translate-x-1/2 w-8 h-1 bg-gray-200 rounded-full cursor-grab active:cursor-grabbing"></div>

                                    <div className="flex justify-between items-center mt-1">
                                        <h3 className="font-bold text-gray-800 text-lg">Options Texte</h3>
                                        <button onClick={() => setActivePanel('none')} className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full hover:bg-gray-200 transition-colors no-drag"><i className="fa-solid fa-times text-gray-500"></i></button>
                                    </div>
                                </div>

                                <div className="pointer-events-auto py-2 z-10 relative">
                                    <div className="relative w-full bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
                                        <textarea
                                            value={activeText.text === 'VOTRE TEXTE' ? '' : activeText.text}
                                            autoFocus
                                            onChange={(e) => updateText({ text: e.target.value })}
                                            className="w-full h-16 p-3 bg-transparent outline-none focus:ring-0 text-gray-800 resize-none text-center font-medium"
                                            placeholder="Écrivez votre texte ici..."
                                        />
                                    </div>
                                </div>

                                <div className="bg-white p-3 shadow-xl pointer-events-auto flex flex-col gap-3 relative z-20 no-drag overflow-y-auto" style={{ maxHeight: '55vh' }}>
                                    <div className="flex justify-between items-center">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-gray-400 italic">Écrivez ci-dessous, modifiez sur le vêtement</span>
                                            <span className="text-[9px] text-gray-400">Double-cliquez sur le texte pour modifier le contenu</span>
                                        </div>
                                        {activeText.text && (
                                            <button onClick={removeText} className="text-red-500 text-xs hover:underline flex items-center gap-1">
                                                <i className="fa-solid fa-trash"></i> Effacer
                                            </button>
                                        )}
                                    </div>

                                    {/* ROW 1: Police (Horizontal Scroll) */}
                                    <div>
                                        <label className="text-[10px] text-gray-400 font-bold uppercase mb-1 block">Police</label>
                                        <div className="flex overflow-x-auto gap-1.5 pb-1 scrollbar-none">
                                            {['Inter', 'Roboto', 'Montserrat', 'Playfair Display', 'Bebas Neue', 'Permanent Marker', 'Lobster', 'Pacifico', 'Graduate'].map(f => (
                                                <button key={f} onClick={() => updateText({ fontFamily: f })} className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full border transition-all ${activeText.fontFamily === f ? 'bg-orange-600 text-white border-orange-600 shadow-sm' : 'bg-white border-gray-200 text-gray-600 hover:border-orange-300'}`} style={{ fontFamily: f }}>{f === 'Graduate' ? 'College' : f}</button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* ROW 2: Couleur (Horizontal Scroll) */}
                                    <div>
                                        <label className="text-[10px] text-gray-400 font-bold uppercase mb-1 block">Couleur</label>
                                        <div className="flex overflow-x-auto gap-2 pb-1 scrollbar-none">
                                            {['#000000', '#FFFFFF', '#EF4444', '#3B82F6', '#F59E0B', '#10B981', '#8B5CF6', '#EC4899', '#F97316', '#6B7280'].map(c => (
                                                <button key={c} onClick={() => updateText({ color: c })} className={`flex-shrink-0 w-8 h-8 rounded-full border-2 transition-all ${activeText.color === c ? 'ring-2 ring-orange-500 ring-offset-2 scale-110' : 'border-gray-200 hover:scale-110'}`} style={{ backgroundColor: c }} />
                                            ))}
                                        </div>
                                    </div>

                                    {/* ROW 3: Style + Effets (Horizontal Scroll) */}
                                    <div>
                                        <label className="text-[10px] text-gray-400 font-bold uppercase mb-1 block">Style & Effets</label>
                                        <div className="flex overflow-x-auto gap-1.5 pb-1 scrollbar-none">
                                            <button onClick={() => updateText({ fontWeight: activeText.fontWeight === '700' ? '400' : '700' })} className={`flex-shrink-0 px-3 py-1.5 rounded-full border text-xs font-bold transition-all ${activeText.fontWeight === '700' ? 'bg-gray-800 text-white border-gray-800' : 'bg-white border-gray-200 text-gray-600'}`}>Gras</button>
                                            <button onClick={() => updateText({ textTransform: activeText.textTransform === 'uppercase' ? 'none' : 'uppercase' })} className={`flex-shrink-0 px-3 py-1.5 rounded-full border text-xs font-bold transition-all ${activeText.textTransform === 'uppercase' ? 'bg-gray-800 text-white border-gray-800' : 'bg-white border-gray-200 text-gray-600'}`}>MAJ</button>
                                            <button onClick={() => updateText({ outline: !activeText.outline })} className={`flex-shrink-0 px-3 py-1.5 rounded-full border text-xs font-bold flex items-center gap-1 transition-all ${activeText.outline ? 'bg-gray-800 text-white border-gray-800' : 'bg-white border-gray-200 text-gray-600'}`}><i className="fa-regular fa-square"></i> Contour</button>
                                            <button onClick={() => updateText({ noFill: !activeText.noFill })} className={`flex-shrink-0 px-3 py-1.5 rounded-full border text-xs font-bold flex items-center gap-1 transition-all ${activeText.noFill ? 'bg-gray-800 text-white border-gray-800' : 'bg-white border-gray-200 text-gray-600'}`}><i className="fa-solid fa-droplet-slash"></i> Sans Remplissage</button>
                                        </div>
                                    </div>

                                    {/* ROW 3.5: Couleur Contour (Conditional) */}
                                    {activeText.outline && (
                                        <div className="animate-fade-in">
                                            <label className="text-[10px] text-gray-400 font-bold uppercase mb-1 block">Couleur Contour</label>
                                            <div className="flex overflow-x-auto gap-2 pb-1 scrollbar-none">
                                                {['#000000', '#FFFFFF', '#EF4444', '#3B82F6', '#F59E0B', '#10B981', '#8B5CF6', '#EC4899', '#F97316', '#6B7280'].map(c => (
                                                    <button key={c} onClick={() => updateText({ outlineColor: c })} className={`flex-shrink-0 w-6 h-6 rounded-full border-2 transition-all ${activeText.outlineColor === c ? 'ring-2 ring-orange-500 ring-offset-2 scale-110' : 'border-gray-200 hover:scale-110'}`} style={{ backgroundColor: c }} />
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* ROW 4: Arc / Flexion */}
                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <label className="text-[10px] text-gray-400 font-bold uppercase flex items-center gap-1">
                                                <i className="fa-solid fa-bezier-curve"></i> Arc / Flexion
                                            </label>
                                            <span className="text-[10px] text-gray-400 font-bold">{activeText.curve || 0}</span>
                                        </div>
                                        {/* Style toggle: Arc vs Arche */}
                                        <div className="flex gap-1.5 mb-2">
                                            <button onClick={() => updateText({ curveStyle: 'arc' })} className={`flex-1 px-3 py-1.5 rounded-full border text-xs font-bold transition-all flex items-center justify-center gap-1 ${(!activeText.curveStyle || activeText.curveStyle === 'arc') ? 'bg-orange-600 text-white border-orange-600' : 'bg-white border-gray-200 text-gray-600'}`}><i className="fa-solid fa-bezier-curve"></i> Arc</button>
                                            <button onClick={() => updateText({ curveStyle: 'upright' })} className={`flex-1 px-3 py-1.5 rounded-full border text-xs font-bold transition-all flex items-center justify-center gap-1 ${activeText.curveStyle === 'upright' ? 'bg-orange-600 text-white border-orange-600' : 'bg-white border-gray-200 text-gray-600'}`}><i className="fa-solid fa-text-height"></i> Arche</button>
                                        </div>
                                        <input
                                            type="range"
                                            min="-180"
                                            max="180"
                                            step="10"
                                            value={activeText.curve || 0}
                                            onChange={(e) => updateText({ curve: parseInt(e.target.value) })}
                                            className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
                                        />
                                    </div>

                                    {/* ROW 4: Espacement */}
                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <label className="text-[10px] text-gray-400 font-bold uppercase">Espacement lettres</label>
                                            <span className="text-[10px] text-gray-400 font-bold">{activeText.letterSpacing || 0}</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="-5"
                                            max="50"
                                            step="1"
                                            value={activeText.letterSpacing || 0}
                                            onChange={(e) => updateText({ letterSpacing: parseInt(e.target.value) })}
                                            className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
                                        />
                                    </div>

                                    {/* ROW 6: Hauteur lettres (scaleY) */}
                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <label className="text-[10px] text-gray-400 font-bold uppercase flex items-center gap-1">
                                                <i className="fa-solid fa-text-height"></i> Hauteur lettres
                                            </label>
                                            <span className="text-[10px] text-gray-400">{Math.round((activeText.scaleY || 1) * 100)}%</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="50"
                                            max="250"
                                            step="5"
                                            value={Math.round((activeText.scaleY || 1) * 100)}
                                            onChange={(e) => updateText({ scaleY: parseInt(e.target.value) / 100 })}
                                            className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
                                        />
                                    </div>

                                    {/* ROW 7: Largeur lettres (scaleX) */}
                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <label className="text-[10px] text-gray-400 font-bold uppercase flex items-center gap-1">
                                                <i className="fa-solid fa-text-width"></i> Largeur lettres
                                            </label>
                                            <span className="text-[10px] text-gray-400">{Math.round((activeText.scaleX || 1) * 100)}%</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="50"
                                            max="250"
                                            step="5"
                                            value={Math.round((activeText.scaleX || 1) * 100)}
                                            onChange={(e) => updateText({ scaleX: parseInt(e.target.value) / 100 })}
                                            className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
                                        />
                                    </div>

                                    {/* T1/T2/T3 Tabs */}
                                    <div className="flex bg-gray-100 p-1 rounded-lg gap-1 mt-2">
                                        <button onClick={() => setActiveEl('text')} className={`flex-1 py-1.5 text-xs font-bold rounded-md ${activeEl === 'text' ? 'bg-white shadow text-orange-600' : 'text-gray-500'}`}>T1</button>
                                        <button onClick={() => setActiveEl('text2')} className={`flex-1 py-1.5 text-xs font-bold rounded-md ${activeEl === 'text2' ? 'bg-white shadow text-orange-600' : 'text-gray-500'}`}>T2</button>
                                        <button onClick={() => setActiveEl('text3')} className={`flex-1 py-1.5 text-xs font-bold rounded-md ${activeEl === 'text3' ? 'bg-white shadow text-orange-600' : 'text-gray-500'}`}>T3</button>
                                    </div>
                                    <button onClick={() => setActivePanel('none')} className="w-full py-4 bg-gray-900 text-white font-black uppercase tracking-widest rounded-xl shadow-lg hover:bg-black transition-all">Valider</button>
                                </div>
                            </div>
                        </div>,
                        document.body
                    )
                }

                {/* CODE PANEL */}
                {
                    activePanel === 'code' && createPortal(
                        <div data-layout-id="desktop-panel-code" className="fixed inset-0 z-[9999] flex items-start justify-center bg-black/60 backdrop-blur-sm pt-16 p-4 animate-fade-in" onClick={(e) => { if (e.target === e.currentTarget) setActivePanel('none'); }}>
                            <div className="w-full h-full sm:h-auto sm:max-w-sm bg-white border border-gray-200 p-6 sm:rounded-2xl shadow-2xl flex flex-col gap-4 relative overflow-y-auto">
                                <div className="flex justify-between items-center pb-2 border-b border-gray-100 pr-8">
                                    <h3 className="font-bold text-gray-800 text-lg">Entrez un Code</h3>
                                    <button onClick={() => setActivePanel('none')} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"><i className="fa-solid fa-times text-gray-500"></i></button>
                                </div>
                                <div className="flex flex-col items-center w-full">
                                    <label className="text-[10px] text-gray-400 font-bold uppercase mb-2">Entrez votre code spécial</label>
                                    <input
                                        type="text"
                                        value={isBack ? specialCodeBack : specialCodeFront}
                                        onChange={(e) => isBack ? setSpecialCodeBack(e.target.value) : setSpecialCodeFront(e.target.value)}
                                        className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg text-center font-mono text-lg font-bold focus:border-orange-500 outline-none uppercase"
                                        placeholder="CODE..."
                                    />
                                </div>

                                {(codeLogoPreview || filteredLogos.length > 0) && (
                                    <div className="flex flex-col gap-4 border-t border-gray-100 pt-4 mt-2">
                                        <div className="flex gap-4">
                                            {codeLogoPreview && (
                                                <div className="flex flex-col items-center gap-2 flex-shrink-0">
                                                    <div className="h-24 w-24 bg-gray-100 border border-gray-300 rounded-lg p-2 flex items-center justify-center relative">
                                                        <img src={getProxiedUrl(codeLogoPreview)} className="max-w-full max-h-full object-contain" alt="Selected Code Logo" />
                                                    </div>
                                                    <button onClick={() => setPendingElement({ type: 'logo', content: getProxiedUrl(codeLogoPreview), predefined: true })} className="py-1 px-3 bg-green-50 text-green-600 border border-green-200 rounded-lg font-bold text-[10px]">Placer</button>
                                                </div>
                                            )}
                                            {filteredLogos.length > 0 && (
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-bold text-gray-500 uppercase mb-2">Galerie</p>
                                                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
                                                        {filteredLogos.map((logo: any, idx: number) => (
                                                            <button key={idx} onClick={() => handlePredefinedLogoSelect(Array.isArray(logo.url) ? logo.url[0] : logo.url)} className="flex-shrink-0 w-16 h-16 border rounded-lg p-2 bg-gray-800 hover:border-orange-500"><img src={getProxiedUrl(Array.isArray(logo.url) ? logo.url[0] : logo.url)} className="max-w-full max-h-full object-contain" /></button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>,
                        document.body
                    )
                }

                {/* AI STUDIO "PAGE" OVERLAY - FULLSCREEN FLOW */}
                {
                    aiModalOpen && createPortal(
                        <div data-layout-id="ai-modal-fullscreen" className="fixed inset-0 h-[100dvh] z-[10000] bg-white animate-fade-in flex flex-col overflow-hidden">
                            {/* HEADER - Always visible */}
                            <div className="flex-none p-4 flex justify-between items-center border-b border-gray-100 bg-white/95 backdrop-blur-md sticky top-0 z-50">
                                <h3 className="text-lg font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
                                    <i className="fa-solid fa-wand-magic-sparkles text-orange-500"></i>
                                    Studio IA
                                </h3>
                                <button
                                    onClick={() => setAiModalOpen(false)}
                                    className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                                >
                                    <i className="fa-solid fa-times text-gray-500"></i>
                                </button>
                            </div>

                            {/* CONTENT AREA */}
                            <div className="flex-1 overflow-y-auto overflow-x-hidden relative bg-white">

                                {/* STEP 1: PROMPT SELECTION */}
                                {aiStep === 'prompt' && (
                                    <div className="flex-1 flex flex-col p-4 pb-32 animate-fade-in">
                                        <div className="text-center mb-6 mt-2">
                                            <h2 className="text-2xl font-black text-gray-900 mb-1 uppercase tracking-tight">Studio Créatif IA</h2>
                                            <p className="text-gray-500 text-xs font-medium uppercase tracking-widest">Étape 1 : Choisis ton style</p>
                                        </div>

                                        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm text-left w-full mb-6">
                                            <p className="text-[10px] font-black text-gray-400 uppercase mb-3 tracking-widest flex items-center gap-2">
                                                <i className="fa-solid fa-layer-group text-orange-500"></i>
                                                Catégories & Ambiances
                                            </p>

                                            <div className="relative group/cat">
                                                <div className="flex overflow-x-auto gap-2 mb-4 border-b border-gray-100 pb-3 scrollbar-hide scroll-smooth" ref={aiCategoryScrollRef}>
                                                    {Object.keys(STYLE_MATRIX)
                                                        .filter(cat => STYLE_MATRIX[cat].some(s => s.image)) // Filter out empty/image-less categories
                                                        .concat(["Custom"]).map((category) => (
                                                            <button
                                                                key={category}
                                                                onClick={() => {
                                                                    setActiveStyleCategory(category as StyleCategory);
                                                                    document.getElementById(`category-${category}`)?.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'center' });
                                                                }}
                                                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap border-2 ${activeStyleCategory === category ? 'bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-200' : 'bg-gray-50 border-transparent text-gray-500 hover:bg-gray-100'}`}
                                                            >
                                                                {category}
                                                            </button>
                                                        ))}
                                                </div>

                                                {/* Category Nav Arrows */}
                                                <button
                                                    onClick={() => scrollCarousel(aiCategoryScrollRef, 'left')}
                                                    className="absolute left-0 top-1/2 -translate-y-full z-10 w-8 h-8 flex items-center justify-center bg-white/90 backdrop-blur-sm border border-gray-200 rounded-full shadow-md text-gray-800 opacity-0 group-hover/cat:opacity-100 transition-opacity translate-x-1 lg:flex hidden"
                                                >
                                                    <i className="fa-solid fa-chevron-left text-[10px]"></i>
                                                </button>
                                                <button
                                                    onClick={() => scrollCarousel(aiCategoryScrollRef, 'right')}
                                                    className="absolute right-0 top-1/2 -translate-y-full z-10 w-8 h-8 flex items-center justify-center bg-white/90 backdrop-blur-sm border border-gray-200 rounded-full shadow-md text-gray-800 opacity-0 group-hover/cat:opacity-100 transition-opacity -translate-x-1 lg:flex hidden"
                                                >
                                                    <i className="fa-solid fa-chevron-right text-[10px]"></i>
                                                </button>
                                            </div>

                                            <div className="relative group">
                                                {/* Styles Carousel */}
                                                <div
                                                    className="flex overflow-x-auto gap-4 pb-4 -mx-2 px-2 scrollbar-hide snap-x snap-mandatory items-center scroll-smooth"
                                                    id="style-container"
                                                    onScroll={handleStyleScroll}
                                                    ref={aiStyleScrollRef}
                                                >
                                                    {allStyles.map((item, idx) => {
                                                        const isFirstOfCategory = idx === 0 || allStyles[idx - 1].category !== item.category;
                                                        return (
                                                            <button
                                                                key={`${item.category}-${item.style.name}`}
                                                                id={isFirstOfCategory ? `category-${item.category}` : undefined}
                                                                data-category={item.category}
                                                                onClick={() => {
                                                                    setSelectedStylePrompt(item.style.prompt);
                                                                    setCustomStylePrompt(item.style.prompt);
                                                                    setActiveStyleCategory(item.category as StyleCategory);
                                                                }}
                                                                className={`flex-shrink-0 w-36 h-48 rounded-2xl border-4 transition-all relative overflow-hidden group snap-start ${selectedStylePrompt === item.style.prompt ? 'border-orange-500 shadow-xl scale-95' : 'border-transparent bg-gray-100 hover:border-gray-200'}`}
                                                            >
                                                                <LazyImage
                                                                    src={getProxiedUrl(item.style.image)}
                                                                    alt={item.style.name}
                                                                    loading="lazy"
                                                                    className="absolute inset-0 w-full h-full"
                                                                    imageClassName="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                                                />
                                                                <div className={`absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent transition-opacity ${selectedStylePrompt === item.style.prompt ? 'opacity-90' : 'opacity-60 group-hover:opacity-75'}`} />

                                                                <div className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30">
                                                                    <i className={`fa-solid ${item.style.icon || 'fa-star'} text-xs text-white`}></i>
                                                                </div>

                                                                <div className="absolute bottom-0 left-0 w-full p-4 text-left">
                                                                    <span className="text-[10px] font-black uppercase text-white/70 block mb-0.5 tracking-widest">{item.category}</span>
                                                                    <span className="text-xs font-black uppercase text-white leading-tight block drop-shadow-md">{item.style.name}</span>
                                                                </div>
                                                            </button>
                                                        );
                                                    })}

                                                    {/* Custom Prompt Card */}
                                                    <div
                                                        id="category-Custom"
                                                        data-category="Custom"
                                                        className={`flex-shrink-0 w-64 h-48 rounded-2xl border-4 p-4 flex flex-col justify-center snap-start transition-all ${activeStyleCategory === 'Custom' ? 'border-orange-500 bg-orange-50' : 'border-dashed border-gray-200 bg-gray-50'}`}
                                                    >
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center">
                                                                <i className="fa-solid fa-wand-sparkles text-white text-xs"></i>
                                                            </div>
                                                            <div>
                                                                <h4 className="text-xs font-black text-gray-900 uppercase">Sur-mesure</h4>
                                                                <p className="text-[10px] text-gray-400 font-bold uppercase">Personnalise ton prompt</p>
                                                            </div>
                                                        </div>
                                                        <textarea
                                                            value={customStylePrompt}
                                                            onChange={(e) => {
                                                                setCustomStylePrompt(e.target.value);
                                                                setSelectedStylePrompt('');
                                                                setActiveStyleCategory('Custom');
                                                            }}
                                                            placeholder="Décris l'ambiance désirée..."
                                                            className="flex-1 w-full p-3 bg-white border border-gray-200 rounded-xl text-xs outline-none focus:border-orange-500 font-bold resize-none shadow-inner"
                                                        />
                                                    </div>
                                                </div>

                                                {/* Styles Nav Arrows */}
                                                <button
                                                    onClick={() => scrollCarousel(aiStyleScrollRef, 'left')}
                                                    className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 flex items-center justify-center bg-white/90 backdrop-blur-sm border border-gray-200 rounded-full shadow-lg text-gray-800 opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 lg:flex hidden"
                                                >
                                                    <i className="fa-solid fa-chevron-left"></i>
                                                </button>
                                                <button
                                                    onClick={() => scrollCarousel(aiStyleScrollRef, 'right')}
                                                    className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 flex items-center justify-center bg-white/90 backdrop-blur-sm border border-gray-200 rounded-full shadow-lg text-gray-800 opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 lg:flex hidden"
                                                >
                                                    <i className="fa-solid fa-chevron-right"></i>
                                                </button>
                                            </div>
                                        </div>

                                        {/* Validate Button */}
                                        <div className="fixed bottom-0 left-0 w-full p-6 bg-gradient-to-t from-white via-white/90 to-transparent pt-12 z-[60]">
                                            <button
                                                onClick={() => {
                                                    if (!selectedStylePrompt && !customStylePrompt) {
                                                        alert("Choisis un style ou écris une description !");
                                                        return;
                                                    }
                                                    setAiStep('input');
                                                }}
                                                className="w-full py-5 bg-black text-white rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-2xl active:scale-95 transition-all text-sm group"
                                            >
                                                <span>Suivant : Ta Photo</span>
                                                <i className="fa-solid fa-camera group-hover:translate-x-1 transition-transform"></i>
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* STEP 2: INPUT METHOD (SignPong / Camera) */}
                                {aiStep === 'input' && (
                                    <div className="h-full flex flex-col items-center justify-center p-6 animate-slide-up">
                                        {/* Back Button - Relocated & Renamed */}
                                        <div className="w-full flex justify-start mb-4">
                                            <button onClick={() => setAiStep('prompt')} className="text-gray-500 hover:text-gray-900 flex items-center gap-2 font-bold z-10 uppercase tracking-widest text-sm">
                                                <i className="fa-solid fa-arrow-left"></i> STUDIO IA
                                            </button>
                                        </div>

                                        {!capturedImage ? (
                                            <div className="w-full max-w-none md:max-w-sm flex flex-col gap-6 items-center">
                                                {/* UI Unification (Round 24) & Desktop Camera (Round 45) */}
                                                {isCameraOpen ? (
                                                    // CAMERA LIVE VIEW OVERLAY
                                                    <div className="fixed inset-0 z-[10020] bg-black flex flex-col items-center justify-center">
                                                        <video ref={videoRef} autoPlay playsInline muted className={`w-full h-full object-cover ${facingMode === 'user' ? '-scale-x-100' : ''}`} ></video>

                                                        {/* Flash Overlay */}
                                                        <div className={`absolute inset-0 bg-white z-[10030] transition-opacity duration-500 pointer-events-none ${flashActive ? 'opacity-100' : 'opacity-0'}`}></div>

                                                        {/* Countdown */}
                                                        {countdown !== null && (
                                                            <div className="absolute inset-0 flex items-center justify-center z-[10040]">
                                                                <span className="text-9xl font-black text-white drop-shadow-2xl animate-ping">{countdown === 0 ? 'CHEESE!' : countdown}</span>
                                                            </div>
                                                        )}

                                                        {/* Controls */}
                                                        <div className="absolute top-4 right-4 z-[10050]">
                                                            <button onClick={stopCamera} className="w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 pointer-events-auto">
                                                                <i className="fa-solid fa-times"></i>
                                                            </button>
                                                        </div>

                                                        <div className="absolute bottom-0 w-full p-8 pb-12 flex items-center justify-center gap-8 z-[10050] bg-gradient-to-t from-black/80 to-transparent">
                                                            <button
                                                                onClick={toggleCamera}
                                                                className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white border border-white/20 hover:bg-white/20"
                                                                title="Changer de caméra"
                                                            >
                                                                <i className="fa-solid fa-rotate"></i>
                                                            </button>

                                                            <button
                                                                onClick={() => setCountdown(3)}
                                                                disabled={countdown !== null}
                                                                className="w-20 h-20 rounded-full bg-white border-4 border-gray-300 flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.3)] hover:scale-105 active:scale-95 transition-all"
                                                            >
                                                                <div className="w-16 h-16 rounded-full bg-white border-2 border-black/10"></div>
                                                            </button>

                                                            <div className="w-12 h-12"></div> {/* Spacer for symmetry */}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    // INPUT SELECTION (Camera vs File)
                                                    (() => {
                                                        const isMobile = window.innerWidth < 1024;

                                                        if (isMobile) {
                                                            // MOBILE: Show Camera AND Gallery Options
                                                            return (
                                                                <div className="w-full flex flex-col gap-4">
                                                                    <button
                                                                        onClick={() => triggerUniversalInput()}
                                                                        className="w-full py-8 bg-gray-900 rounded-3xl flex flex-col items-center justify-center gap-4 shadow-xl active:scale-95 transition-transform cursor-pointer"
                                                                    >
                                                                        <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center border border-white/20 animate-pulse">
                                                                            <i className="fa-solid fa-camera text-3xl text-white"></i>
                                                                        </div>
                                                                        <div className="text-center">
                                                                            <h3 className="text-xl font-black text-white uppercase tracking-widest">Appareil Photo</h3>
                                                                            <p className="text-white/60 text-xs">Prendre une photo</p>
                                                                        </div>
                                                                    </button>

                                                                    <div className="relative w-full flex items-center gap-4 py-2">
                                                                        <div className="h-px bg-gray-300 flex-1"></div>
                                                                        <span className="text-gray-400 font-bold text-xs uppercase">OU</span>
                                                                        <div className="h-px bg-gray-300 flex-1"></div>
                                                                    </div>

                                                                    <button
                                                                        onClick={() => document.getElementById('hidden-file-input-desktop')?.click()}
                                                                        className="w-full py-6 bg-white border-2 border-gray-200 rounded-3xl flex items-center justify-center gap-3 text-gray-700 font-bold shadow-sm hover:bg-gray-50 active:scale-95 transition-transform cursor-pointer"
                                                                    >
                                                                        <i className="fa-solid fa-images text-xl text-gray-400"></i>
                                                                        <span>Choisir dans la galerie</span>
                                                                    </button>
                                                                </div>
                                                            );
                                                        } else {
                                                            // DESKTOP: "Upload" AND "Webcam" Cards
                                                            return (
                                                                <div className="w-full flex gap-4">
                                                                    {/* Option 1: Webcam */}
                                                                    <button
                                                                        onClick={startCamera}
                                                                        className="flex-1 py-12 bg-white border-4 border-dashed border-gray-300 rounded-3xl flex flex-col items-center justify-center gap-6 hover:bg-orange-50 hover:border-orange-300 transition-all group"
                                                                    >
                                                                        <div className="w-20 h-20 rounded-full bg-orange-100 flex items-center justify-center group-hover:bg-orange-200 transition-colors shadow-sm">
                                                                            <i className="fa-solid fa-camera text-3xl text-orange-500"></i>
                                                                        </div>
                                                                        <div className="text-center">
                                                                            <h3 className="text-lg font-black text-gray-800 uppercase tracking-widest group-hover:text-orange-700">Webcam</h3>
                                                                            <p className="text-gray-500 font-medium mt-2 text-xs">Prendre une photo</p>
                                                                        </div>
                                                                    </button>

                                                                    {/* Option 2: Upload */}
                                                                    <button
                                                                        onClick={() => document.getElementById('hidden-file-input-desktop')?.click()}
                                                                        className="flex-1 py-12 bg-white border-4 border-dashed border-gray-300 rounded-3xl flex flex-col items-center justify-center gap-6 hover:bg-gray-50 hover:border-gray-400 transition-all group cursor-pointer"
                                                                    >
                                                                        <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-gray-200 transition-colors">
                                                                            <i className="fa-solid fa-cloud-arrow-up text-3xl text-gray-400 group-hover:text-gray-600"></i>
                                                                        </div>
                                                                        <div className="text-center">
                                                                            <h3 className="text-lg font-black text-gray-800 uppercase tracking-widest group-hover:text-gray-900">Importer</h3>
                                                                            <p className="text-gray-500 font-medium mt-2 text-xs">Fichier image</p>
                                                                        </div>
                                                                    </button>
                                                                </div>
                                                            );
                                                        }
                                                    })()
                                                )}
                                            </div>
                                        ) : (
                                            /* Review / SignPong Mode */
                                            <div className="w-full h-full flex flex-col">
                                                <div className="flex-1 relative rounded-2xl overflow-hidden shadow-xl bg-black">
                                                    <div className="absolute inset-0 border-[12px] border-black/20 z-20 pointer-events-none"></div>
                                                    <img src={capturedImage} className={`w-full h-full object-contain bg-black transition-all duration-500 ${aiGenerating ? 'blur-md scale-105 opacity-50' : ''}`} alt="Captured" />

                                                    {/* SignPong Overlay - Full Border Version */}
                                                    {(aiGenerating || isGeneratingLocal) && (
                                                        <div className="absolute inset-0 z-30 flex items-center justify-center p-0">
                                                            <LoadingScreen message="Un instant..." />
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex-none p-4 flex gap-3">
                                                    <button onClick={() => setCapturedImage(null)} className="flex-1 py-4 bg-gray-200 text-gray-700 font-bold rounded-xl">
                                                        Reprendre
                                                    </button>
                                                    <button
                                                        onClick={() => handleAiTryOn(capturedImage)} // This triggers generation -> result
                                                        className="flex-[2] py-4 bg-orange-600 text-white font-bold rounded-xl shadow-lg hover:bg-orange-500 animate-pulse"
                                                    >
                                                        Générer (1 crédit) <i className="fa-solid fa-bolt ml-1"></i>
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* STEP 3: RESULT OR GENERATING */}
                                {(aiGenerating || isGeneratingLocal || (aiStep === 'result' || (aiResult && aiStep !== 'prompt' && aiStep !== 'input'))) && (
                                    <div className="h-full flex flex-col bg-black">
                                        {(aiGenerating || isGeneratingLocal) ? (
                                            <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden">
                                                {capturedImage && (
                                                    <img
                                                        src={capturedImage}
                                                        className="absolute inset-0 w-full h-full object-cover blur-xl opacity-30 scale-110"
                                                        alt="Blur background"
                                                    />
                                                )}
                                                <div className="relative z-10 flex flex-col items-center justify-center w-full h-full">
                                                    <div className="absolute top-12 left-0 right-0 text-center z-20">
                                                        <h3 className="text-white text-2xl font-black uppercase tracking-widest animate-pulse mb-2">Magie en cours...</h3>
                                                        <div className="inline-flex items-center gap-2 bg-orange-600 px-4 py-1.5 rounded-full shadow-lg">
                                                            <i className="fa-solid fa-wand-sparkles text-white text-xs animate-spin-slow"></i>
                                                            <span className="text-white text-[10px] font-black uppercase tracking-wider">SignPong : Gagne des crédits !</span>
                                                        </div>
                                                    </div>

                                                    <div className="w-full h-full">
                                                        <LoadingScreen message="Un instant..." />
                                                    </div>
                                                </div>
                                            </div>
                                        ) : aiResult ? (
                                            /* Final Result View */
                                            <div className="flex-1 flex flex-col relative animate-fade-in">
                                                <div className="flex-1 bg-black relative flex items-center justify-center py-4">
                                                    <div className="h-full max-w-[90vw] aspect-[9/16] relative rounded-2xl overflow-hidden shadow-2xl">
                                                        <img src={aiResult} className="w-full h-full object-cover" alt="AI Result" />
                                                    </div>
                                                </div>
                                                <div className="flex-none bg-black/80 backdrop-blur-md p-6 pt-8 pb-10 flex flex-col gap-3 rounded-t-3xl -mt-6 z-10 border-t border-white/10">
                                                    <h3 className="text-white font-bold text-center mb-2">🔥 Résultat généré !</h3>
                                                    <button
                                                        onClick={() => { setCapturedImage(null); setAiModalOpen(false); }}
                                                        className="w-full py-4 bg-green-500 text-white font-black uppercase tracking-widest rounded-xl shadow-[0_0_20px_rgba(34,197,94,0.4)] hover:bg-green-400 transition-all hover:scale-[1.02]"
                                                    >
                                                        Utiliser ce design
                                                    </button>
                                                    <button
                                                        onClick={() => { setAiResult && setAiResult(null); setAiStep('input'); }}
                                                        className="w-full py-3 bg-white/10 border border-white/20 text-white font-bold rounded-xl hover:bg-white/20"
                                                    >
                                                        Réessayer
                                                    </button>

                                                    {/* ADD TO PROFILE BUTTON */}
                                                    <button
                                                        onClick={async () => {
                                                            if (!user) {
                                                                onAuthRequired();
                                                            } else {
                                                                const btn = document.getElementById('btn-save-profile-studio');
                                                                if (btn) {
                                                                    const originalText = btn.innerHTML;
                                                                    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> SAUVEGARDE...';
                                                                    try {
                                                                        await onSaveToProfile(aiResult || '', selectedAiPrompt || customStylePrompt, selectedStyleName || activeStyleCategory, item);
                                                                        btn.innerHTML = '<i class="fa-solid fa-check"></i> SAUVEGARDÉ !';
                                                                        btn.classList.remove('bg-white/10', 'text-white', 'border-white/20');
                                                                        btn.classList.add('bg-green-500', 'text-white', 'border-green-500');
                                                                        setTimeout(() => {
                                                                            if (btn) {
                                                                                btn.innerHTML = originalText;
                                                                                btn.classList.add('bg-white/10', 'text-white', 'border-white/20');
                                                                                btn.classList.remove('bg-green-500', 'text-white', 'border-green-500');
                                                                            }
                                                                        }, 3000);
                                                                    } catch (e) {
                                                                        console.error(e);
                                                                        btn.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> ERREUR';
                                                                        setTimeout(() => btn.innerHTML = originalText, 2000);
                                                                    }
                                                                }
                                                            }
                                                        }}
                                                        id="btn-save-profile-studio"
                                                        className="w-full py-3 bg-white/10 border border-white/20 text-white font-bold rounded-xl hover:bg-white/20 flex items-center justify-center gap-2 mt-2"
                                                    >
                                                        <i className={`fa-solid ${user ? 'fa-heart' : 'fa-lock'}`}></i>
                                                        {user ? 'AJOUTER À MA GALERIE' : 'SE CONNECTER POUR SAUVEGARDER'}
                                                    </button>
                                                </div>
                                            </div>
                                        ) : null}
                                    </div>
                                )}
                            </div>
                        </div>,
                        document.body
                    )
                }

                {/* MODALS & OVERLAYS */}
                <SignPongRewardModal
                    isOpen={pongRewardModalOpen}
                    score={pongScore}
                    onClose={() => setPongRewardModalOpen(false)}
                    onClaim={handleClaimPongRewards}
                />

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
                    onNotifyMe={() => { setGuestLimitModalOpen(false); alert("Notification activée !"); }}
                    isMember={!!user}
                />


                {
                    toast && (
                        <div className={`fixed top-24 left-1/2 -translate-x-1/2 px-6 py-4 rounded-2xl shadow-2xl z-[200] flex items-center gap-3 animate-fade-in ${toast.type === 'success' ? 'bg-gray-900 text-white border border-gray-800' : 'bg-red-500 text-white'}`}>
                            <i className={`fa-solid ${toast?.type === 'success' ? 'fa-check-circle text-green-500 text-xl' : 'fa-circle-exclamation text-xl'}`}></i>
                            <span className="font-bold text-sm">{toast?.msg}</span>
                        </div>
                    )
                }

                {/* TRUE FULLSCREEN PREVIEW OVERLAY - HIGHEST Z-INDEX */}
                {
                    previewImage && createPortal(
                        <div className="fixed inset-0 z-[10000] bg-black/90 backdrop-blur-sm animate-fade-in flex items-center justify-center p-0 md:p-8">
                            <div className="relative w-full max-w-md h-full md:max-h-[85vh] md:rounded-3xl bg-black shadow-2xl overflow-hidden flex flex-col">
                                {/* Close Option (Momentary) */}
                                <button
                                    onClick={() => setPreviewImage(null)}
                                    className="absolute top-6 right-6 z-[10010] w-12 h-12 bg-black/40 backdrop-blur-md border border-white/20 rounded-full flex items-center justify-center text-white text-xl hover:bg-black/60 active:scale-90 transition-all shadow-2xl"
                                    title="Fermer l'aperçu"
                                >
                                    <i className="fa-solid fa-xmark"></i>
                                </button>

                                {/* 1. Full Surface Image with subtle frame/border */}
                                <div className="absolute inset-0 border-[12px] border-black/20 z-10 pointer-events-none"></div>
                                <img src={previewImage} className="absolute inset-0 w-full h-full object-cover" alt="Preview" />

                                {/* 2. Header Overlay (Stylized) */}
                                <div className="absolute top-0 left-0 w-full z-[10001] flex flex-col items-center justify-center pt-14 pb-16 px-6 bg-gradient-to-b from-black/90 via-black/40 to-transparent pointer-events-none">
                                    <h3 className="text-3xl sm:text-4xl font-black text-white drop-shadow-2xl uppercase tracking-[0.2em] text-center">
                                        Aperçu Photo
                                    </h3>
                                    <div className="w-12 h-1 bg-orange-600 rounded-full mt-3 shadow-lg"></div>
                                </div>

                                {/* 3. Loading/Game Overlay */}
                                {aiGenerating && (
                                    <div className="absolute inset-0 z-[10002] flex flex-col items-center justify-center bg-black/40 backdrop-blur-md">
                                        <div className="absolute top-20 w-full text-center z-20">
                                            <h2 className="text-white text-2xl font-black uppercase tracking-[0.3em] mb-2 animate-pulse">Design en cours</h2>
                                            <p className="text-[10px] text-white/90 font-bold uppercase tracking-widest bg-orange-600 px-4 py-2 rounded-full inline-block shadow-xl">
                                                SignPong : 1 Point = 1 Crédit
                                            </p>
                                        </div>
                                        <div className="w-full h-full">
                                            <LoadingScreen message="Un instant..." />
                                        </div>
                                    </div>
                                )}

                                {/* 4. Actions Bottom Bar (Float Glassmorphism) */}
                                {!aiGenerating && (
                                    <div className="absolute bottom-0 left-0 w-full flex flex-col gap-3 p-8 pb-12 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-[10003]">
                                        <button
                                            onClick={() => handleAiTryOn(previewImage)}
                                            className="w-full py-5 bg-orange-600 text-white font-black uppercase tracking-widest rounded-2xl shadow-2xl hover:bg-orange-500 active:scale-95 transition-all"
                                        >
                                            Générer le rendu (1 crédit)
                                        </button>
                                        <button
                                            onClick={() => setPreviewImage(null)}
                                            className="w-full py-4 text-white/70 font-bold uppercase tracking-wider text-sm hover:text-white transition-colors"
                                        >
                                            Annuler
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>,
                        document.body
                    )
                }

                {/* MOBILE STICKY PRICE & ACTION BAR */}
                {
                    window.innerWidth < 1024 && activePricing.total > 0 && !previewImage && !aiGenerating && (
                        createPortal(
                            <div className="fixed bottom-0 left-0 w-full z-[1000] bg-white/90 backdrop-blur-xl border-t border-gray-100 shadow-[0_-10px_25px_-5px_rgba(0,0,0,0.1)] px-4 py-3 pb-safe animate-slide-up">
                                <div className="flex items-center justify-between gap-4 max-w-lg mx-auto">
                                    <div className="flex flex-col">
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total:</span>
                                            <span className="text-2xl font-black text-gray-900">{activePricing.total.toFixed(2)}€</span>
                                        </div>
                                        <div className="flex gap-2 text-[8px] font-bold uppercase tracking-tighter text-gray-400 whitespace-nowrap">
                                            <span>👕 {activePricing.garmentPart.toFixed(2)}€</span>
                                            <span>✨ {activePricing.markingPart.toFixed(2)}€</span>
                                            {activePricing.services > 0 && <span className="text-orange-500">🛠️ {activePricing.services.toFixed(2)}€</span>}
                                        </div>
                                        {/* Action Buttons */}
                                        <div className="flex gap-2 w-full mt-4">
                                            <button
                                                onClick={handleShareDesign}
                                                disabled={sharingLoading}
                                                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-900 font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                                            >
                                                <i className={`fa-solid ${sharingLoading ? 'fa-spinner fa-spin' : 'fa-share-nodes'}`}></i>
                                                {sharingLoading ? 'Génération...' : 'Partager'}
                                            </button>
                                            <button
                                                onClick={handleAddToCartAction}
                                                disabled={isCapturing}
                                                className="flex-[2] py-4 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl shadow-lg shadow-orange-500/20 transition-all flex items-center justify-center gap-2"
                                            >
                                                <i className={`fa-solid ${isCapturing ? 'fa-spinner fa-spin' : 'fa-cart-plus'}`}></i>
                                                {isCapturing ? 'Capture...' : 'Ajouter au Panier'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>,
                            document.body
                        )
                    )
                }

                {/* Share Design Modal */}
                {shareShortId && (
                    <ShareDesignModal
                        shortId={shareShortId}
                        onClose={() => setShareShortId(null)}
                    />
                )}
            </div>
        </div >
    );
};