import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Cropper from 'react-easy-crop';
// import { Point, Area } from 'react-easy-crop/types';
type Point = { x: number, y: number };
type Area = { width: number, height: number, x: number, y: number };

import {
    getProxiedUrl,
    resizeImage,
    tintImage,
    removeBackground,
    getCroppedImg,
    urlToBase64,
    addWatermark,
    hexToRgb
} from '../utils/helpers';

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
    StyleCategory
} from '../types';

import { DraggableElement } from './DraggableElement';
// PongGame import removed
import { geminiService } from '../services/geminiService';
import { db } from '../firebaseConfig';
import { collection, addDoc, serverTimestamp, doc, updateDoc, increment } from 'firebase/firestore';

// @ts-ignore
import html2canvas from 'html2canvas';


export
    function CustomizerView({ initialProductType, initialState, isRemixMode, onAddToCart, onAddToCartBatch, onBack, onPublish, onAddToWishlist, userCredits, onDeductCredits, isGuest, onAuthRequired, user, onUpdateUser, initialAiPromo, products, productDimensions, initialStyleCategory, initialStylePrompt, setIsQuoteModalOpen, onGoToRewards, setIsMenuVisible }: {
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
        products?: Record<string, any>;
        productDimensions?: Record<string, Record<string, number>>;
        initialStyleCategory?: string;
        initialStylePrompt?: string;
        onGoToRewards: () => void;
        setIsMenuVisible?: (visible: boolean) => void;
    }) {

    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const allProducts = useMemo(() => ({ ...productDatabase, ...products }), [products]);



    useEffect(() => {
        if (initialAiPromo) {
            // Promo auto-open removed to avoid intrusive popups
        }
    }, [initialAiPromo]);

    const getDefaultText = () => ({
        lines: [''], text: '', fontSize: 24, fontFamily: 'Inter', fontWeight: '700',
        textTransform: 'none' as const, color: '#000000', position: { x: 50, y: 50 }, letterSpacing: 0
    });

    const defaultState: CartItem = {
        id: crypto.randomUUID(),
        productType: initialProductType,
        color: '#000000',
        sizes: {},
        logoSizeFront: 100, logoPositionXFront: 50, logoPositionYFront: 30,
        originalLogoUrlFront: null, processedLogoUrlFront_original: null,
        textFront: getDefaultText(),
        logoSizeBack: 100, logoPositionXBack: 50, logoPositionYBack: 30,
        originalLogoUrlBack: null, processedLogoUrlBack_original: null,
        textBack: getDefaultText(),
        activeLogoColorFront: 'original', backgroundRemovedFront: false, logoInvertedFront: false,
        activeLogoColorBack: 'original', backgroundRemovedBack: false, logoInvertedBack: false,
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
        const saved = getSavedState();
        const initialType = (initialState?.productType || initialProductType || 'tshirt');
        
        // Validation: If saved exists, ensure it refers to a valid product
        if (saved && saved.productType && allProducts[saved.productType]) {
            return { ...saved, id: crypto.randomUUID() };
        }
        
        if (initialState) return { ...initialState, id: crypto.randomUUID() };
        return defaultState;
    });

    // Save to local storage on change
    useEffect(() => {
        if (!initialState) { // Only auto-save if working on a new/draft project
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(item));
            } catch (e) {
                console.warn("LocalStorage quota exceeded. Failed to save draft.", e);
                // Optional: Clear specific heavy keys or notify user
            }
        }
    }, [item, initialState]);
    // --- PERSISTENCE LOGIC END ---

    const [isBack, setIsBack] = useState(false);
    const [activeEl, setActiveEl] = useState<string | null>(null);
    const [aiModalOpen, setAiModalOpen] = useState(false);

    useEffect(() => {
        if (setIsMenuVisible) {
            setIsMenuVisible(!aiModalOpen);
        }
    }, [aiModalOpen, setIsMenuVisible]);
    const [aiGenerating, setAiGenerating] = useState(false);
    const [aiResult, setAiResult] = useState<string | null>(null);
    const [lastUserImage, setLastUserImage] = useState<string | null>(null);
    const [uploadedGarment, setUploadedGarment] = useState<string | null>(null);


    const previewRef = useRef<HTMLDivElement>(null);

    const [publishCaption, setPublishCaption] = useState('');
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
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

    const [activeStyleCategory, setActiveStyleCategory] = useState<StyleCategory>(initialStyleCategory as StyleCategory || 'Réaliste');
    const [selectedStylePrompt, setSelectedStylePrompt] = useState(initialStylePrompt || "");
    const [customStylePrompt, setCustomStylePrompt] = useState(initialStyleCategory === 'Custom' ? initialStylePrompt || '' : '');

    // Update state if props change
    useEffect(() => {
        if (initialStyleCategory) setActiveStyleCategory(initialStyleCategory as StyleCategory);
        if (initialStylePrompt) {
            if (initialStyleCategory === 'Custom') setCustomStylePrompt(initialStylePrompt);
            else setSelectedStylePrompt(initialStylePrompt);
        }
    }, [initialStyleCategory, initialStylePrompt]);
    const [selectedPose, setSelectedPose] = useState<'front' | 'back' | null>('front');

    const [zoomLevel, setZoomLevel] = useState(1);
    const zoomIn = () => setZoomLevel(prev => Math.min(prev + 0.1, 2));
    const zoomOut = () => setZoomLevel(prev => Math.max(prev - 0.1, 0.5));

    const [activePanel, setActivePanel] = useState<'none' | 'import' | 'text' | 'code'>('none');
    const [textOptionsOpen, setTextOptionsOpen] = useState(false);
    const [workshopOpen, setWorkshopOpen] = useState(false);
    const [uploadedLogoPreview, setUploadedLogoPreview] = useState<string | null>(null);
    const [codeLogoPreview, setCodeLogoPreview] = useState<string | null>(null);
    const [previewImage, setPreviewImage] = useState<string | null>(null);

    // NEW STATES FOR REFINEMENTS
    const [isModifying, setIsModifying] = useState(false);
    const [modificationPrompt, setModificationPrompt] = useState('');
    const [feedbackGiven, setFeedbackGiven] = useState(false);
    const [feedbackComment, setFeedbackComment] = useState('');
    const [showFeedbackInput, setShowFeedbackInput] = useState(false);

    // CROPPER STATE
    const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppingImage, setCroppingImage] = useState<string | null>(null);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

    const onCropComplete = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const handleCropSave = async () => {
        if (croppingImage && croppedAreaPixels) {
            try {
                const croppedImage = await getCroppedImg(croppingImage, croppedAreaPixels);
                // Set as pending element
                const isLogo = true; // Assuming logo upload for now
                setPendingElement({ type: 'logo', content: croppedImage, predefined: false });
                setUploadedLogoPreview(croppedImage);
                setCroppingImage(null); // Close modal
                setZoom(1);
            } catch (e) {
                console.error("Crop error:", e);
                alert("Erreur lors du recadrage.");
            }
        }
    };

    // SWIPE STATE
    const [touchStart, setTouchStart] = useState<{ x: number, y: number } | null>(null);
    const [touchEnd, setTouchEnd] = useState<{ x: number, y: number } | null>(null);


    useEffect(() => {
        const logo = isBack
            ? (item.predefinedLogoUrlBack || item.originalLogoUrlBack)
            : (item.predefinedLogoUrlFront || item.originalLogoUrlFront);

        const previewUrl = Array.isArray(logo) ? logo[0] : logo;
        setUploadedLogoPreview(previewUrl || null);
    }, [isBack, item.predefinedLogoUrlBack, item.originalLogoUrlBack, item.predefinedLogoUrlFront, item.originalLogoUrlFront]);

    // Flatten styles for single line display
    const allStyles = useMemo(() => {
        const list: { category: string, style: any }[] = [];
        Object.entries(STYLE_MATRIX).forEach(([cat, styles]) => {
            styles.forEach((s: any) => list.push({ category: cat, style: s }));
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


    const updateItem = (updates: Partial<CartItem>) => setItem(prev => ({ ...prev, ...updates }));

    const updateText = (updates: any) => {
        const currentText = isBack ? item.textBack : item.textFront;
        const newText = { ...currentText, ...updates };
        updateItem(isBack ? { textBack: newText } : { textFront: newText });
    };

    const removeText = () => {
        const emptyText = getDefaultText();
        updateItem(isBack ? { textBack: emptyText } : { textFront: emptyText });
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
            setAiResult(null);
        }
        if (xDist < -minSwipeDistance) {
            updateItem({ color: colors[prevIndex] });
            setAiResult(null);
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

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                const res = ev.target?.result as string;
                // DIRECT PLACEMENT (Bypass Cropping Modal)
                // Use default 'center' placement logic manually or reuse logic
                const defaults = {
                    x: 50, y: 40, scale: 100
                };

                const targetIsBack = isBack;
                const updates = targetIsBack ? {
                    originalLogoUrlBack: res,
                    processedLogoUrlBack_original: res,
                    isPredefinedLogoBack: false,
                    predefinedLogoUrlBack: null,
                    logoPositionXBack: defaults.x, logoPositionYBack: defaults.y, logoSizeBack: defaults.scale,
                    backgroundRemovedBack: false, logoInvertedBack: false
                } : {
                    originalLogoUrlFront: res,
                    processedLogoUrlFront_original: res,
                    isPredefinedLogoFront: false,
                    predefinedLogoUrlFront: null,
                    logoPositionXFront: defaults.x, logoPositionYFront: defaults.y, logoSizeFront: defaults.scale,
                    backgroundRemovedFront: false, logoInvertedFront: false
                };

                updateItem(updates);
                setUploadedLogoPreview(res);
                setActiveEl('logo');

                // Reset file input
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
        
        // DIRECT PLACEMENT instead of popup
        const presets = PLACEMENT_PRESETS[item.productType] || PLACEMENT_PRESETS['default'];
        const settings = presets['center'];

        const updates = isBack ? {
            originalLogoUrlBack: null,
            processedLogoUrlBack_original: proxiedUrl,
            isPredefinedLogoBack: true,
            predefinedLogoUrlBack: proxiedUrl,
            logoSizeBack: settings.scale, logoPositionXBack: settings.x, logoPositionYBack: settings.y,
            backgroundRemovedBack: false, logoInvertedBack: false
        } : {
            originalLogoUrlFront: null,
            processedLogoUrlFront_original: proxiedUrl,
            isPredefinedLogoFront: true,
            predefinedLogoUrlFront: proxiedUrl,
            logoSizeFront: settings.scale, logoPositionXFront: settings.x, logoPositionYFront: settings.y,
            backgroundRemovedFront: false, logoInvertedFront: false
        };
        updateItem(updates);
        setActiveEl('logo');
        setActivePanel('none');
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
                backgroundRemovedBack: false, logoInvertedBack: false
            } : {
                originalLogoUrlFront: pendingElement.predefined ? null : pendingElement.content,
                processedLogoUrlFront_original: pendingElement.content!,
                isPredefinedLogoFront: pendingElement.predefined,
                predefinedLogoUrlFront: pendingElement.predefined ? pendingElement.content : null,
                logoSizeFront: settings.scale, logoPositionXFront: settings.x, logoPositionYFront: settings.y,
                backgroundRemovedFront: false, logoInvertedFront: false
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
            const currentQty = prev[size] || 0;
            const newQty = Math.max(0, currentQty + delta);
            const newSizes = { ...prev };
            if (newQty === 0) delete newSizes[size];
            else newSizes[size] = newQty;
            return newSizes;
        });
    };

    const generatePreview = async (): Promise<string> => {
        if (!previewRef.current) return '';
        setActiveEl(null);
        const originalZoom = zoomLevel;
        setZoomLevel(1);
        await new Promise(resolve => setTimeout(resolve, 100));

        try {
            const canvas = await html2canvas(previewRef.current, {
                useCORS: true, allowTaint: false, backgroundColor: null, scale: 2
            });
            setZoomLevel(originalZoom);
            return canvas.toDataURL('image/png');
        } catch (e) {
            console.error("Preview Error", e);
            setZoomLevel(originalZoom);
            // Convert fallback URL to base64 to ensure API receives valid data
            const fallbackUrl = getProxiedUrl(isBack ? product.backImages[item.color] : product.images[item.color]);
            return await urlToBase64(fallbackUrl);
        }
    };

    const handleAiTryOn = async (userPhoto: string, promptOverride?: string) => {
        if (!user) {
            // alert("Veuillez vous inscrire ou vous connecter pour utiliser le Studio IA.");
            onAuthRequired(); // Trigger login modal directly to preserve state
            return;
        }


        if (!userPhoto || userPhoto === 'data:,' || userPhoto.length < 100) {
            alert("Erreur: Impossible de récupérer l'image. Veuillez réessayer ou utiliser une autre méthode (Upload/Caméra).");
            return;
        }

        setAiGenerating(true);
        setLastUserImage(userPhoto);
        setFeedbackGiven(false); // Reset feedback for new generation
        setShowFeedbackInput(false);
        setFeedbackComment('');

        try {
            const preview = await generatePreview();
            const resizedUserPhoto = await resizeImage(userPhoto, 800);

            let finalStyle = promptOverride || selectedStylePrompt;
            if (!promptOverride && activeStyleCategory === 'Custom' && customStylePrompt.trim()) {
                finalStyle = customStylePrompt;
            } else if (!promptOverride && selectedStylePrompt) {
                const found = allStyles.find(s => s.style.prompt === selectedStylePrompt);
                if (found && found.style.glasses) {
                    finalStyle += `. ${found.style.glasses}`;
                }
            }

            // --- APPEL VERS LE SERVEUR GEMINI ---
            const result = await geminiService.generateTryOnImage(
                resizedUserPhoto,
                preview,
                `${item.color} ${product.name} avec design`,
                finalStyle || "Studio lighting",
                activeStyleCategory,
                (selectedPose || 'front') as 'front' | 'back',
                uploadedGarment
            );

            const watermarkedResult = await addWatermark(result);

            setAiResult(watermarkedResult);
            onDeductCredits(1);
            setCapturedImage(null);

            if (finalStyle) {
                const tags = finalStyle.split(',')[0].split(' ').map(w => '#' + w.replace(/[^a-zA-Z0-9]/g, '')).join(' ');
                setPublishCaption(prev => prev + ' ' + tags);
            }

        } catch (e: any) {
            console.error("AI Error", e);
            alert("Erreur de gÃ©nÃ©ration : " + e.message);
        }
        setAiGenerating(false);
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
        } catch (err) { alert("Accès caméra refusé."); }
    };
    const stopCamera = () => { if (cameraStream) { cameraStream.getTracks().forEach(track => track.stop()); setCameraStream(null); } setIsCameraOpen(false); };
    const toggleCamera = () => setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    // FIX: Add isCameraOpen to dependency array to trigger startCamera when modal opens
    useEffect(() => { if (isCameraOpen) startCamera(); }, [facingMode, isCameraOpen]);

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
        const types = Object.keys(allProducts).filter(k => k !== 'catalogue');
        const idx = types.indexOf(item.productType);
        const newIdx = dir === 'next' ? (idx + 1) % types.length : (idx - 1 + types.length) % types.length;
        const newType = types[newIdx];
        updateItem({ productType: newType, color: allProducts[newType].images[item.color] ? item.color : Object.keys(allProducts[newType].images)[0] });
        setAiResult(null);
    };


    const handleAddToCartAction = async () => {
        if (Object.keys(selectedSizes).length === 0) { alert('Sélectionnez une taille.'); return; }

        // Capture logic: Force capture of both sides
        const originalSide = isBack; // Save current side

        // 1. Capture Front
        setIsBack(false);
        setActiveEl(null);
        await new Promise(resolve => setTimeout(resolve, 200)); // Wait for render
        const frontPreview = await generatePreview();

        // 2. Capture Back
        setIsBack(true);
        setActiveEl(null);
        await new Promise(resolve => setTimeout(resolve, 200)); // Wait for render
        const backPreview = await generatePreview();

        // Restore original side
        setIsBack(originalSide);

        // Create a separate item for each selected size
        const itemsToAdd: CartItem[] = [];
        Object.entries(selectedSizes).forEach(([size, qty]) => {
            if ((qty as number) > 0) {
                // Create a deep copy for each size to ensure they are unique items in cart
                const newItem = {
                    ...item,
                    id: crypto.randomUUID(), // New ID for each cart line
                    sizes: { [size]: qty },
                    previewImageUrlFront: frontPreview,
                    previewImageUrlBack: backPreview,
                    calculatedPrice: finalPrice,
                    aiImageUrl: aiResult // Associate AI image only if currently displayed
                };
                itemsToAdd.push(newItem);
            }
        });

        if (itemsToAdd.length > 0) {
            onAddToCartBatch(itemsToAdd);
        }

        setSelectedSizes({});
        // alert("Ajouté au panier !"); // Removed as onAddToCartBatch will likely switch view
    };

    const activeText = isBack ? item.textBack : item.textFront;

    const handleTextButtonClick = () => {
        // Toggle panel
        setActivePanel(activePanel === 'text' ? 'none' : 'text');

        if (!activeText.text) {
            const newText = isBack ? { ...item.textBack } : { ...item.textFront };
            newText.text = ''; // Default empty, visual placeholder handled by DraggableElement
            newText.position = { x: 50, y: 40 };
            updateItem(isBack ? { textBack: newText } : { textFront: newText });
            setActiveEl('text');
            setTextOptionsOpen(true);
        } else {
            setTextOptionsOpen(!textOptionsOpen);
            setActiveEl('text');
        }
    };

    const handleImportButtonClick = () => {
        setActivePanel(activePanel === 'import' ? 'none' : 'import');
    };

    const handleCodeButtonClick = () => {
        setActivePanel(activePanel === 'code' ? 'none' : 'code');
    };

    // --- UI HELPERS: History & Click Outside ---
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            // Close active panel if clicking on backdrop or canvas (handled by explicit canvas click, but this covers global)
            // Checking if target is inside a panel
            const target = e.target as HTMLElement;
            const panel = target.closest('.animate-fade-in'); // Our panels have this class
            const toggleBtn = target.closest('button'); // Don't close if clicking same toggle button (handled by toggle logic)

            // If active panel open, and click is NOT in panel
            if (activePanel !== 'none' && !panel && !toggleBtn) {
                setActivePanel('none');
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [activePanel]);

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
        if (e.target === e.currentTarget) {
            // Clicked on empty canvas area
            setActiveEl(null);
            setActivePanel('none');
        }
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
            backgroundRemovedBack: false, logoInvertedBack: false // Reset flags
        } : {
            predefinedLogoUrlFront: logoUrl,
            originalLogoUrlFront: null,
            // processedLogoUrlFront: undefined, // Removed as not in CartItem
            logoPositionXFront: 50, logoPositionYFront: 40, logoSizeFront: 100,
            backgroundRemovedFront: false, logoInvertedFront: false // Reset flags
        });
        setActiveEl('logo');
    };

    // --- PRODUCT & DERIVED STATE (Must be after ALL hooks) ---
    const product = allProducts[item.productType];
    
    // Derived state from product MUST be guarded if product is missing
    const colors = product ? Object.keys(product.images) : [];
    const currentIndex = product ? colors.indexOf(item.color) : -1;
    const prevIndex = product ? (currentIndex - 1 + colors.length) % colors.length : -1;
    const nextIndex = product ? (currentIndex + 1) % colors.length : -1;
    const visibleIndices = product ? [prevIndex, currentIndex, nextIndex] : [];

    const realHeightCm = productDimensions?.[item.productType]?.height || 70;
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
    const finalPrice = product ? (product.price + extraCharge) : 0;

    return (
        <div className="flex flex-col h-full w-full max-w-7xl mx-auto relative pb-24 bg-white overflow-x-hidden scrollbar-hide">
            {!product ? (
                <div className="p-8 text-center min-h-screen flex items-center justify-center flex-col gap-4">
                    <p className="text-xl font-bold text-gray-800">Produit introuvable.</p>
                    <button onClick={onBack} className="px-6 py-2 bg-orange-500 text-white rounded-xl font-bold shadow-lg">Retour</button>
                </div>
            ) : (
                <>
                    {/* Popups removed as requested */}
            {/* Popups removed as requested */}

            {/* Desktop Top Bar */}
            <div className="hidden lg:flex w-full items-center justify-between px-4 py-6 border-b border-gray-100 mb-4 bg-white sticky top-0 z-40 shadow-sm relative">
                <button onClick={() => window.open(window.location.origin, '_blank')} className="text-gray-900 hover:text-orange-500"><i className="fa-solid fa-arrow-left"></i> Retour</button>
                <div className="flex items-center gap-4 absolute left-1/2 -translate-x-1/2 font-black text-orange-600 uppercase tracking-wider text-xl">
                    <button onClick={() => changeProductType('prev')} className="hover:text-orange-800 p-2"><i className="fa-solid fa-chevron-left"></i></button>
                    <h2>{product.name}</h2>
                    <button onClick={() => changeProductType('next')} className="hover:text-orange-800 p-2"><i className="fa-solid fa-chevron-right"></i></button>
                </div>
            </div>

            {/* Mobile Product Selector (Sticky top-0) */}
            <div className="lg:hidden sticky top-0 z-50 w-full flex flex-col items-center bg-white border-b border-gray-100 py-3 shadow-sm px-4">
                <div className="w-full flex items-center justify-between mb-1">
                    <button onClick={() => window.open(window.location.origin, '_blank')} className="text-gray-900 text-lg"><i className="fa-solid fa-arrow-left"></i></button>
                    <div className="flex items-center gap-4 flex-1 justify-center">
                        <button onClick={() => changeProductType('prev')} className="text-orange-600 font-bold p-1"><i className="fa-solid fa-chevron-left"></i></button>
                        <div className="text-center">
                            <h2 className="text-sm font-black text-orange-600 uppercase tracking-widest leading-none mb-1">{product.name}</h2>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">REF: {product.reference || 'STYLINK'}</p>
                        </div>
                        <button onClick={() => changeProductType('next')} className="text-orange-600 font-bold p-1"><i className="fa-solid fa-chevron-right"></i></button>
                    </div>
                    <button onClick={() => setIsMenuOpen(true)} className="text-gray-900 text-lg"><i className="fa-solid fa-bars"></i></button>
                </div>
                <a href={product.supplierLink} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-500 font-bold underline">Info</a>
            </div>


            <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 lg:grid-cols-12 gap-8 bg-white scrollbar-hide">
                <div className="lg:col-span-3 space-y-6 order-3 lg:order-1">
                </div>

                <div className="lg:col-span-6 flex flex-col items-center order-1 lg:order-2">

                    <div className="w-full mb-4 flex items-center justify-center gap-2 px-2 relative z-30">
                        {/* Left Variant */}
                        <button
                            onClick={() => { updateItem({ color: colors[visibleIndices[0]] }); setAiResult(null); }}
                            className="lg:hidden w-12 h-12 rounded-full border-2 border-white shadow-md transition-all transform hover:scale-110 overflow-hidden bg-white flex items-center justify-center flex-shrink-0 z-20"
                        >
                            <img src={getProxiedUrl(product.images[colors[visibleIndices[0]]])} className="w-full h-full object-contain" alt="prev" />
                        </button>

                        <div className="flex-1 max-w-lg relative">
                            {/* Current Variant INDICATOR (Mobile only floating) */}
                            <div className="lg:hidden absolute -top-4 left-1/2 -translate-x-1/2 z-20 bg-black/80 text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest pointer-events-none">
                                {colors[visibleIndices[1]]}
                            </div>
                            
                            <div
                                ref={previewRef}
                                onClick={handleCanvasClick}
                                className="relative w-full aspect-[3/4] bg-white rounded-3xl overflow-hidden shadow-2xl border border-gray-100 transition-all duration-300 select-none touch-pan-y"
                                style={{ transform: `scale(${zoomLevel})` }}
                            >
                                {/* Size Selector for Preview (Overlay) */}
                                <div className="absolute top-4 left-4 z-40 bg-white/80 backdrop-blur rounded-lg px-2 py-1 shadow-sm border border-gray-100 flex items-center gap-2" data-html2canvas-ignore="true">
                                    <i className="fa-solid fa-ruler-combined text-gray-400 text-xs"></i>
                                    <select
                                        value={previewSize}
                                        onChange={(e) => {
                                            const newSize = e.target.value;
                                            setPreviewSize(newSize);
                                            setSelectedSizes({ [newSize]: 1 });
                                        }}
                                        className="bg-transparent text-xs font-bold text-gray-700 outline-none cursor-pointer"
                                    >
                                        {product.sizes.map((s: string) => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>

                                {/* Controls (Desktop Only absolute) */}
                                <div className="absolute top-4 right-4 hidden lg:flex flex-col gap-2 z-40" data-html2canvas-ignore="true">
                                    <button onClick={() => setIsBack(!isBack)} className="w-10 h-10 bg-white/80 backdrop-blur rounded-full shadow text-gray-700 flex items-center justify-center hover:bg-white font-bold text-xs flex-col leading-none py-1 group">
                                        <span className="group-hover:text-orange-500 transition-colors">{isBack ? 'DOS' : 'FACE'}</span>
                                        <i className="fa-solid fa-rotate text-[10px] mt-0.5 text-gray-400 group-hover:text-orange-500"></i>
                                    </button>
                                </div>

                                {/* Canvas Content (Images, Logos, Text) */}
                                {aiResult ? (
                                    <img src={aiResult} className="w-full h-full object-contain pointer-events-none select-none relative z-0" alt="ai-result" />
                                ) : (
                                    <>
                                        <img
                                            src={getProxiedUrl(isBack ? product.backImages[item.color] : product.images[item.color])}
                                            className="w-full h-full object-contain pointer-events-none select-none relative z-0"
                                            alt="product"
                                            crossOrigin="anonymous"
                                        />
                                        {((isBack ? item.predefinedLogoUrlBack || item.originalLogoUrlBack : item.predefinedLogoUrlFront || item.originalLogoUrlFront)) && (
                                            <DraggableElement id={isBack ? "logoBack" : "logoFront"} type="logo" item={item} side={isBack ? "Back" : "Front"} isActive={activeEl === 'logo'} setActive={() => { setActiveEl('logo'); setActivePanel('import'); }} onUpdate={updateItem} onSaveHistory={() => { }} isEditable={true} realHeight={productDimensions?.[item.productType]?.[previewSize]} />
                                        )}
                                        {((isBack ? item.textBack.text : item.textFront.text)) && (
                                            <DraggableElement id={isBack ? "textBack" : "textFront"} type="text" item={item} side={isBack ? "Back" : "Front"} isActive={activeEl === 'text'} setActive={() => { setActiveEl('text'); setActivePanel('text'); }} onUpdate={updateItem} onSaveHistory={() => { }} isEditable={true} realHeight={productDimensions?.[item.productType]?.[previewSize]} />
                                        )}
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Right Variant */}
                        <button
                            onClick={() => { updateItem({ color: colors[visibleIndices[2]] }); setAiResult(null); }}
                            className="lg:hidden w-12 h-12 rounded-full border-2 border-white shadow-md transition-all transform hover:scale-110 overflow-hidden bg-white flex items-center justify-center flex-shrink-0 z-20"
                        >
                            <img src={getProxiedUrl(product.images[colors[visibleIndices[2]]])} className="w-full h-full object-contain" alt="next" />
                        </button>
                    </div>

                    {/* View Controls (Mobile Sticky Bar under Garment) */}
                    <div className="lg:hidden w-full flex items-center justify-center gap-6 py-4 bg-white border-b border-gray-50 mb-4 z-40">
                        <button onClick={() => setIsBack(!isBack)} className="flex flex-col items-center gap-1 group">
                            <div className="w-12 h-12 rounded-full border border-gray-200 flex items-center justify-center text-gray-700 bg-white shadow-sm group-active:scale-95 transition-transform">
                                <i className="fa-solid fa-rotate"></i>
                            </div>
                            <span className="text-[10px] font-bold text-gray-500 uppercase">{isBack ? 'Face' : 'Dos'}</span>
                        </button>
                        <div className="flex items-center gap-4 bg-gray-50 rounded-full px-4 py-2 border border-gray-100">
                            <button onClick={zoomOut} className="text-gray-500 p-1"><i className="fa-solid fa-magnifying-glass-minus"></i></button>
                            <span className="text-[10px] font-black text-gray-800 w-8 text-center">{Math.round(zoomLevel * 100)}%</span>
                            <button onClick={zoomIn} className="text-gray-500 p-1"><i className="fa-solid fa-magnifying-glass-plus"></i></button>
                        </div>
                    </div>

                    {/* OPTIONS GRID (Compact Horizontal) */}
                    {activePanel === 'none' && (
                        <div className="w-full mb-6 grid grid-cols-5 gap-1 relative z-30 bg-white p-2 rounded-xl border border-gray-100 shadow-sm mt-4 lg:hidden">
                            {/* IMAGE */}
                            <button
                                onClick={handleImportButtonClick}
                                className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-gray-50 transition-all border border-transparent hover:border-gray-100"
                            >
                                <i className="fa-solid fa-upload text-gray-500 text-sm"></i>
                                <span className="text-[8px] font-black uppercase text-gray-500">IMAGE</span>
                                <input id="hidden-file-input" type="file" hidden accept="image/*" onChange={handleLogoUpload} />
                            </button>

                            {/* TEXTE */}
                            <button
                                onClick={handleTextButtonClick}
                                className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-gray-50 transition-all border border-transparent hover:border-gray-100"
                            >
                                <i className="fa-solid fa-font text-gray-500 text-sm"></i>
                                <span className="text-[8px] font-black uppercase text-gray-500">TEXTE</span>
                            </button>

                            {/* VALIDER (Jump to cart/finalize) */}
                            <button
                                onClick={() => document.getElementById('cart-section')?.scrollIntoView({ behavior: 'smooth' })}
                                className="flex flex-col items-center gap-1 p-2 rounded-lg bg-orange-50 transition-all border border-orange-100"
                            >
                                <i className="fa-solid fa-check text-orange-600 text-sm"></i>
                                <span className="text-[8px] font-black uppercase text-orange-600">VALIDER</span>
                            </button>

                            {/* MESURE (Size selection) */}
                            <button
                                onClick={() => document.getElementById('size-selector')?.scrollIntoView({ behavior: 'smooth' })}
                                className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-gray-50 transition-all border border-transparent hover:border-gray-100"
                            >
                                <i className="fa-solid fa-ruler-combined text-gray-500 text-sm"></i>
                                <span className="text-[8px] font-black uppercase text-gray-500">MESURE</span>
                            </button>

                            {/* GROUPE (Predefined / Batch info) */}
                            <button
                                onClick={() => setActivePanel('code')}
                                className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-gray-50 transition-all border border-transparent hover:border-gray-100"
                            >
                                <i className="fa-solid fa-users text-gray-500 text-sm"></i>
                                <span className="text-[8px] font-black uppercase text-gray-500">GROUPE</span>
                            </button>
                        </div>
                    )}

                    {/* DESKTOP BUTTONS GRID */}
                    {activePanel === 'none' && (
                        <div className="hidden lg:grid w-full mb-6 grid grid-cols-3 gap-3 relative z-30 bg-white p-2 rounded-2xl border border-gray-100 shadow-sm mt-4">
                            <div className="flex flex-col gap-2 items-center justify-start h-full">
                                <button
                                    onClick={handleImportButtonClick}
                                    className={`w-full flex items-center justify-center gap-2 p-3 rounded-xl transition-all text-gray-500 border border-gray-100 hover:text-gray-900 hover:bg-gray-50`}
                                >
                                    {((isBack ? item.predefinedLogoUrlBack || item.originalLogoUrlBack : item.predefinedLogoUrlFront || item.originalLogoUrlFront)) ? (
                                        <>
                                            <i className={`fa-solid fa-palette text-lg text-gray-500`}></i>
                                            <span className="text-xs font-bold uppercase">Couleur</span>
                                        </>
                                    ) : (
                                        <>
                                            <i className={`fa-solid fa-upload text-lg text-gray-500`}></i>
                                            <span className="text-xs font-bold uppercase">Importer</span>
                                        </>
                                    )}
                                </button>
                                <input id="hidden-file-input" type="file" hidden accept="image/*" onChange={handleLogoUpload} />
                            </div>

                            <div className="flex flex-col gap-2 items-center justify-start h-full">
                                <button
                                    onClick={handleTextButtonClick}
                                    className={`w-full flex items-center justify-center gap-2 p-3 rounded-xl transition-all text-gray-500 border border-gray-100 hover:text-gray-900 hover:bg-gray-50`}
                                >
                                    <i className={`fa-solid fa-font text-lg text-gray-500`}></i>
                                    <span className="text-xs font-bold uppercase">Texte</span>
                                </button>
                            </div>

                            <div className="flex flex-col gap-2 items-center justify-start h-full">
                                <button
                                    onClick={handleCodeButtonClick}
                                    className={`w-full flex items-center justify-center gap-2 p-3 rounded-xl transition-all text-gray-500 border border-gray-100 hover:text-gray-900 hover:bg-gray-50`}
                                >
                                    <i className={`fa-solid fa-barcode text-lg text-gray-500`}></i>
                                    <span className="text-xs font-bold uppercase">Code</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* TOOLS PANEL CONTAINER */}
                    <div className="w-full relative mt-2">
                        {/* PANELS - FLOW CONTENT (Replaced Absolute) */}
                        <div className="w-full z-50">
                            {/* IMPORT/COLOR PANEL */}
                            {activePanel === 'import' && (
                                <div className="w-full bg-white border border-gray-200 p-4 rounded-xl shadow-2xl flex flex-col gap-4 animate-fade-in">
                                    {((isBack ? item.predefinedLogoUrlBack || item.originalLogoUrlBack : item.predefinedLogoUrlFront || item.originalLogoUrlFront)) ? (
                                        // LOGO ACTIVE: COLOR OPTIONS
                                        <div className="flex flex-col gap-4">
                                            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                                                <h3 className="font-bold text-gray-800">Options Image</h3>
                                                <button onClick={() => setActivePanel('none')}><i className="fa-solid fa-times text-gray-400"></i></button>
                                            </div>

                                            {/* HUE SLIDER */}
                                            <div className="flex flex-col gap-2">
                                                <label className="text-[10px] text-gray-400 font-bold uppercase">Teinte (Couleur)</label>
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max="360"
                                                    className="w-full h-4 rounded-full appearance-none cursor-pointer"
                                                    style={{
                                                        background: 'linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #00f 83%, #f00 100%)'
                                                    }}
                                                    onChange={(e) => {
                                                        const hue = parseInt(e.target.value);
                                                        const color = `hsl(${hue}, 100%, 50%)`;
                                                        // Convert HSL to Hex for simplicity or canvas
                                                        // A temporary canvas or helper to get hex from HSL would be good, 
                                                        // but standard CSS colors work in current tintImage implementation?
                                                        // Wait, tintImage accepts "color" string which ctx.fillStyle accepts. HSL works.

                                                        // Apply Tint
                                                        const targetIsBack = isBack;
                                                        let url = targetIsBack ? (item.originalLogoUrlBack || item.predefinedLogoUrlBack) : (item.originalLogoUrlFront || item.predefinedLogoUrlFront);
                                                        if (Array.isArray(url)) url = url[0];

                                                        if (url) {
                                                            tintImage(getProxiedUrl(url), color).then(tinted => {
                                                                updateItem(targetIsBack
                                                                    ? { processedLogoUrlBack_original: tinted, activeLogoColorBack: color, logoInvertedBack: false, backgroundRemovedBack: false, processedLogoUrlBack: null }
                                                                    : { processedLogoUrlFront_original: tinted, activeLogoColorFront: color, logoInvertedFront: false, backgroundRemovedFront: false, processedLogoUrlFront: null }
                                                                );
                                                            });
                                                        }
                                                    }}
                                                />
                                            </div>

                                            {/* PRESETS & ACTION BUTTONS */}
                                            <div className="grid grid-cols-3 gap-2">
                                                <button
                                                    onClick={() => updateItem(isBack ? { activeLogoColorBack: 'black', logoInvertedBack: false } : { activeLogoColorFront: 'black', logoInvertedFront: false })}
                                                    className="p-2 border rounded-lg flex flex-col items-center gap-1 hover:bg-gray-50"
                                                >
                                                    <div className="w-6 h-6 rounded-full bg-black border border-gray-200"></div>
                                                    <span className="text-[10px] font-bold">Noir</span>
                                                </button>
                                                <button
                                                    onClick={() => updateItem(isBack ? { activeLogoColorBack: 'white', logoInvertedBack: false } : { activeLogoColorFront: 'white', logoInvertedFront: false })}
                                                    className="p-2 border rounded-lg flex flex-col items-center gap-1 hover:bg-gray-50"
                                                >
                                                    <div className="w-6 h-6 rounded-full bg-white border border-gray-200"></div>
                                                    <span className="text-[10px] font-bold">Blanc</span>
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        // RESET / ORIGINAL
                                                        const targetIsBack = isBack;
                                                        updateItem(targetIsBack
                                                            ? { activeLogoColorBack: 'original', logoInvertedBack: false, backgroundRemovedBack: false, processedLogoUrlBack: null, processedLogoUrlBack_original: null }
                                                            : { activeLogoColorFront: 'original', logoInvertedFront: false, backgroundRemovedFront: false, processedLogoUrlFront: null, processedLogoUrlFront_original: null }
                                                        );
                                                    }}
                                                    className="p-2 border rounded-lg flex flex-col items-center gap-1 hover:bg-gray-50"
                                                >
                                                    <i className="fa-solid fa-rotate-left text-lg text-gray-500"></i>
                                                    <span className="text-[10px] font-bold">Original</span>
                                                </button>
                                            </div>

                                            {/* COPY BUTTON */}
                                            <button
                                                onClick={() => {
                                                    const targetIsBack = !isBack;
                                                    if (targetIsBack) {
                                                        // Copy Front -> Back
                                                        updateItem({
                                                            originalLogoUrlBack: item.originalLogoUrlFront,
                                                            predefinedLogoUrlBack: item.predefinedLogoUrlFront,
                                                            processedLogoUrlBack: item.processedLogoUrlFront,
                                                            processedLogoUrlBack_original: item.processedLogoUrlFront_original,
                                                            isPredefinedLogoBack: item.isPredefinedLogoFront,
                                                            logoPositionXBack: item.logoPositionXFront,
                                                            logoPositionYBack: item.logoPositionYFront,
                                                            logoSizeBack: item.logoSizeFront,
                                                            activeLogoColorBack: item.activeLogoColorFront,
                                                            logoInvertedBack: item.logoInvertedFront,
                                                            backgroundRemovedBack: item.backgroundRemovedFront,
                                                            backgroundRemovalModeBack: item.backgroundRemovalModeFront
                                                        });
                                                        alert("Copié sur le dos !");
                                                    } else {
                                                        // Copy Back -> Front
                                                        updateItem({
                                                            originalLogoUrlFront: item.originalLogoUrlBack,
                                                            predefinedLogoUrlFront: item.predefinedLogoUrlBack,
                                                            processedLogoUrlFront: item.processedLogoUrlBack,
                                                            processedLogoUrlFront_original: item.processedLogoUrlBack_original,
                                                            isPredefinedLogoFront: item.isPredefinedLogoBack,
                                                            logoPositionXFront: item.logoPositionXBack,
                                                            logoPositionYFront: item.logoPositionYBack,
                                                            logoSizeFront: item.logoSizeBack,
                                                            activeLogoColorFront: item.activeLogoColorBack,
                                                            logoInvertedFront: item.logoInvertedBack,
                                                            backgroundRemovedFront: item.backgroundRemovedBack,
                                                            backgroundRemovalModeFront: item.backgroundRemovalModeBack
                                                        });
                                                        alert("Copié sur la face !");
                                                    }
                                                }}
                                                className="w-full py-3 bg-gray-100 text-gray-800 font-bold rounded-lg border border-gray-200 hover:bg-gray-200 flex items-center justify-center gap-2 text-sm"
                                            >
                                                <i className="fa-regular fa-copy"></i> Copier sur {isBack ? 'la Face' : 'le Dos'}
                                            </button>

                                            {/* DELETE BUTTON */}
                                            <button
                                                onClick={() => {
                                                    const targetIsBack = isBack;
                                                    setPendingElement(null); // Clear pending if any
                                                    updateItem(targetIsBack
                                                        ? { originalLogoUrlBack: null, predefinedLogoUrlBack: null, processedLogoUrlBack: null, processedLogoUrlBack_original: null }
                                                        : { originalLogoUrlFront: null, predefinedLogoUrlFront: null, processedLogoUrlFront: null, processedLogoUrlFront_original: null }
                                                    );
                                                    setActivePanel('none');
                                                }}
                                                className="w-full py-3 bg-red-50 text-red-500 font-bold rounded-lg border border-red-100 hover:bg-red-100 flex items-center justify-center gap-2 text-sm"
                                            >
                                                <i className="fa-solid fa-trash"></i> Supprimer le design
                                            </button>

                                            <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-gray-100">
                                                {/* NEGATIVE / INVERT */}
                                                <button
                                                    onClick={() => updateItem(isBack ? { logoInvertedBack: !item.logoInvertedBack } : { logoInvertedFront: !item.logoInvertedFront })}
                                                    className={`px-3 py-2 rounded-lg font-bold text-xs border flex items-center justify-center gap-2 ${(isBack ? item.logoInvertedBack : item.logoInvertedFront)
                                                        ? 'bg-gray-900 text-white border-gray-900'
                                                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                                        }`}
                                                >
                                                    <i className="fa-solid fa-circle-half-stroke"></i> Négatif
                                                </button>

                                                {/* REMOVE BG */}
                                                <button
                                                    onClick={async () => {
                                                        const targetIsBack = isBack;
                                                        const currentRemoved = targetIsBack ? item.backgroundRemovedBack : item.backgroundRemovedFront;

                                                        // Define URL for processing
                                                        let url = targetIsBack ? (item.processedLogoUrlBack_original || item.originalLogoUrlBack || item.predefinedLogoUrlBack) : (item.processedLogoUrlFront_original || item.originalLogoUrlFront || item.predefinedLogoUrlFront);
                                                        if (Array.isArray(url)) url = url[0];

                                                        if (!currentRemoved && url) {
                                                            // ENABLE
                                                            // Determine source image: Processed (Tinted) OR Original/Predefined
                                                            // AND considerations for Negative: Negative is usually applied via CSS filter `invert(1)` in typical implementation, 
                                                            // BUT `removeWhiteBackground` works on pixel data. CSS invert is visual only unless we draw it inverted.
                                                            // If user wants to remove BG *from* negative, it implies removing "Black" background? 
                                                            // OR does it simply mean: Apply negative filter, THEN remove white? (White becomes black, so removing white does nothing).
                                                            // Interpretation: "Remove White Background" on an Inverted Image (White -> Black, Black -> White) means removing the NEW White (old Black)?
                                                            // This makes sense.
                                                            // So: Effect 1 (Invert) makes it filter-ready for Effect 2 (Remove White).
                                                            // So we just need to ensure we can apply both. `updateItem` supports both flags.
                                                            // The order of operations in `DraggableElement` or render determines result.
                                                            // Typically `removeWhiteBackground` physically alters the image source. `invert` is a CSS filter.
                                                            // If I physically alter the source (transparent), then invert, transparent becomes ?? (Invert of alpha 0 is still alpha 0 usually? Or white? CSS filter drop-shadow might show).

                                                            // SAFE BET: Just enable the flag and let the existing visual pipeline handle it, ensuring buttons are available.
                                                            const modeVal = (targetIsBack ? item.backgroundRemovalModeBack : item.backgroundRemovalModeFront) || 'white';
                                                            const mode = (modeVal === 'all' ? 'white' : modeVal) as 'white' | 'black';
                                                            const processed = await removeBackground(url, mode);
                                                            updateItem(targetIsBack
                                                                ? { backgroundRemovedBack: true, processedLogoUrlBack: processed }
                                                                : { backgroundRemovedFront: true, processedLogoUrlFront: processed }
                                                            );
                                                        } else {
                                                            // DISABLE
                                                            updateItem(targetIsBack
                                                                ? { backgroundRemovedBack: false, processedLogoUrlBack: null }
                                                                : { backgroundRemovedFront: false, processedLogoUrlFront: null }
                                                            );
                                                        }
                                                    }}
                                                    className={`px-3 py-2 rounded-lg font-bold text-xs border flex items-center justify-center gap-2 ${(isBack ? item.backgroundRemovedBack : item.backgroundRemovedFront)
                                                        ? 'bg-orange-500 text-white border-orange-500'
                                                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                                        }`}
                                                >
                                                    <i className="fa-solid fa-wand-magic-sparkles"></i> Détourer
                                                </button>

                                                {/* REMOVAL MODE TOGGLE REMOVED - AUTOMATIC API DETECTION */}
                                            </div>
                                        </div>
                                    ) : (
                                        // NO LOGO: SHOW UPLOAD OPTIONS
                                        <div className="flex flex-col gap-4">
                                            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                                                <h3 className="font-bold text-gray-800">Ajouter un design</h3>
                                                <button onClick={() => setActivePanel('none')}><i className="fa-solid fa-times text-gray-400"></i></button>
                                            </div>
                                            <div className="grid grid-cols-1 gap-4">
                                                <label className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-gray-300 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors group">
                                                    <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                        <i className="fa-solid fa-cloud-arrow-up text-orange-500 text-xl"></i>
                                                    </div>
                                                    <span className="font-bold text-gray-700 text-sm">Importer</span>
                                                    <span className="text-[10px] text-gray-400 text-center">PNG, JPG</span>
                                                    <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                                                </label>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* TEXT PANEL - UPDATED WITH HUE SLIDER */}
                            {activePanel === 'text' && (
                                <div className="w-full bg-white border border-gray-200 p-4 rounded-xl shadow-2xl flex flex-col gap-4 animate-fade-in">
                                    <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                                        <h3 className="font-bold text-gray-800">Options Texte</h3>
                                        <button onClick={() => setActivePanel('none')}><i className="fa-solid fa-times text-gray-400"></i></button>
                                    </div>

                                    <div className="flex flex-col">
                                        <label className="text-[10px] text-gray-400 font-bold uppercase mb-1">Votre Message</label>
                                        <div className="flex gap-2">
                                            <textarea
                                                value={activeText.text === 'VOTRE TEXTE' ? '' : activeText.text}
                                                autoFocus
                                                onFocus={() => { if (activePanel === 'text') setActiveEl('text'); }}
                                                onChange={(e) => updateText({ text: e.target.value })}
                                                className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:border-orange-500 outline-none resize-none bg-gray-50 min-h-[80px]"
                                                rows={2}
                                                placeholder="Ecrivez ici..."
                                            />
                                        </div>
                                        <div className="flex justify-between items-center mt-2">
                                            <span className="text-[10px] text-gray-400 italic">Double-cliquez sur le design pour éditer aussi</span>
                                            {activeText.text && (
                                                <button onClick={removeText} className="text-red-500 text-xs hover:underline flex items-center gap-1">
                                                    <i className="fa-solid fa-trash"></i> Effacer
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* CONTROLS GRID */}
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                        <div className="flex flex-col">
                                            <label className="text-[10px] text-gray-400 font-bold uppercase mb-1">Police</label>
                                            <div className="flex flex-col gap-1">
                                                <button onClick={() => updateText({ fontFamily: 'Inter' })} className={`text-left text-xs p-1 rounded ${activeText.fontFamily === 'Inter' ? 'bg-orange-100 text-orange-700' : 'hover:bg-gray-50'}`}>Standard (Inter)</button>
                                                <button onClick={() => updateText({ fontFamily: 'Playfair Display' })} className={`text-left text-xs p-1 rounded font-serif ${activeText.fontFamily === 'Playfair Display' ? 'bg-orange-100 text-orange-700' : 'hover:bg-gray-50'}`}>Elégant (Serif)</button>
                                                <button onClick={() => updateText({ fontFamily: 'monospace' })} className={`text-left text-xs p-1 rounded font-mono ${activeText.fontFamily === 'monospace' ? 'bg-orange-100 text-orange-700' : 'hover:bg-gray-50'}`}>Techno (Mono)</button>
                                                <button onClick={() => updateText({ fontFamily: 'Bangers' })} className={`text-left text-xs p-1 rounded ${activeText.fontFamily === 'Bangers' ? 'bg-orange-100 text-orange-700' : 'hover:bg-gray-50'}`} style={{ fontFamily: 'Bangers' }}>Comic</button>
                                                <button onClick={() => updateText({ fontFamily: 'Lobster' })} className={`text-left text-xs p-1 rounded ${activeText.fontFamily === 'Lobster' ? 'bg-orange-100 text-orange-700' : 'hover:bg-gray-50'}`} style={{ fontFamily: 'Lobster' }}>Manuscrit</button>
                                                <button onClick={() => updateText({ fontFamily: 'Oswald' })} className={`text-left text-xs p-1 rounded ${activeText.fontFamily === 'Oswald' ? 'bg-orange-100 text-orange-700' : 'hover:bg-gray-50'}`} style={{ fontFamily: 'Oswald' }}>Urbain</button>
                                            </div>
                                        </div>
                                        <div className="flex flex-col">
                                            <label className="text-[10px] text-gray-400 font-bold uppercase mb-1">Style</label>
                                            <div className="flex gap-2 mb-2">
                                                <button onClick={() => updateText({ fontWeight: activeText.fontWeight === '700' ? '400' : '700' })} className={`flex-1 py-1 rounded border text-xs font-bold ${activeText.fontWeight === '700' ? 'bg-gray-800 text-white border-gray-800' : 'bg-white border-gray-300 text-gray-600'}`}>B</button>
                                                <button onClick={() => updateText({ textTransform: activeText.textTransform === 'uppercase' ? 'none' : 'uppercase' })} className={`flex-1 py-1 rounded border text-xs font-bold ${activeText.textTransform === 'uppercase' ? 'bg-gray-800 text-white border-gray-800' : 'bg-white border-gray-300 text-gray-600'}`}>AA</button>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => updateText({ shadow: !activeText.shadow })} className={`flex-1 py-1 rounded border text-xs font-bold ${activeText.shadow ? 'bg-orange-500 text-white border-orange-500' : 'bg-white border-gray-300 text-gray-600'}`}>Omb</button>
                                                <button onClick={() => updateText({ outline: !activeText.outline })} className={`flex-1 py-1 rounded border text-xs font-bold ${activeText.outline ? 'bg-orange-500 text-white border-orange-500' : 'bg-white border-gray-300 text-gray-600'}`}>Con</button>
                                            </div>
                                        </div>
                                        <div className="flex flex-col">
                                            <label className="text-[10px] text-gray-400 font-bold uppercase mb-1">Couleur</label>
                                            <div className="flex flex-wrap gap-1">
                                                {['#000000', '#FFFFFF', '#EF4444', '#3B82F6', '#F59E0B', '#10B981', '#8B5CF6'].map(c => (
                                                    <button key={c} onClick={() => updateText({ color: c })} className={`w-5 h-5 rounded-full border ${activeText.color === c ? 'ring-2 ring-orange-500 scale-110' : 'border-gray-300'}`} style={{ backgroundColor: c }} />
                                                ))}
                                            </div>
                                        </div>
                                        <div className="flex flex-col">
                                            <label className="text-[10px] text-gray-400 font-bold uppercase mb-1">Espacement</label>
                                            <div className="flex flex-col gap-2">
                                                <div className="flex items-center gap-2">
                                                    <i className="fa-solid fa-arrows-left-right text-gray-400 text-xs w-4"></i>
                                                    <input type="range" min="-2" max="10" step="1" value={activeText.letterSpacing || 0} onChange={(e) => updateText({ letterSpacing: parseInt(e.target.value) })} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-600" title="Espacement Lettres" />
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <i className="fa-solid fa-arrows-up-down text-gray-400 text-xs w-4"></i>
                                                    <input type="range" min="0.8" max="2.5" step="0.1" value={activeText.lineHeight || 1.2} onChange={(e) => updateText({ lineHeight: parseFloat(e.target.value) })} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-600" title="Espacement Lignes" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* CODE PANEL */}
                            {activePanel === 'code' && (
                                <div className="w-full bg-white border border-gray-200 p-4 rounded-xl shadow-2xl flex flex-col gap-4 animate-fade-in">
                                    <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                                        <h3 className="font-bold text-gray-800">Entrez un Code</h3>
                                        <button onClick={() => setActivePanel('none')}><i className="fa-solid fa-times text-gray-400"></i></button>
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
                                                                        onClick={() => updateItem(isBack ? { activeLogoColorBack: c.name } : { activeLogoColorFront: c.name })}
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
                                                            {filteredLogos.map((logo, idx) => {
                                                                const urls = Array.isArray(logo.url) ? logo.url : [logo.url];
                                                                return urls.map((url, urlIdx) => (
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
                            )}
                        </div>
                    </div>
                </div>
                        <div className="lg:col-span-3 space-y-6 order-2 lg:order-3 flex flex-col h-full">




                            <div id="size-selector" className="lg:hidden p-6 bg-gray-50 rounded-3xl border border-gray-100">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-lg font-black text-gray-900 uppercase tracking-wider">Taille et Quantité</h3>
                                    <button className="text-blue-500 font-bold text-xs underline">Guide des tailles</button>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {product.sizes.map((size: string) => (
                                        <div key={size} className="flex flex-col gap-2">
                                            <button
                                                onClick={() => updateSizeQuantity(size, (selectedSizes[size] || 0) > 0 ? -1 : 1)}
                                                className={`p-4 rounded-xl font-black transition-all border-2 ${selectedSizes[size] ? 'bg-orange-600 border-orange-600 text-white shadow-lg shadow-orange-200' : 'bg-white border-gray-100 text-gray-900 hover:border-orange-300'}`}
                                            >
                                                {size}
                                            </button>
                                            {selectedSizes[size] ? (
                                                <div className="flex items-center justify-center gap-2 bg-white rounded-lg border border-gray-100 py-1">
                                                    <button onClick={() => updateSizeQuantity(size, -1)} className="text-gray-400 p-1"><i className="fa-solid fa-minus text-[10px]"></i></button>
                                                    <span className="text-xs font-bold text-gray-900">{selectedSizes[size]}</span>
                                                    <button onClick={() => updateSizeQuantity(size, 1)} className="text-orange-500 p-1"><i className="fa-solid fa-plus text-[10px]"></i></button>
                                                </div>
                                            ) : <div className="h-7"></div>}
                                        </div>
                                    ))}
                                </div>

                            </div>


                            <div className="hidden lg:block bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                                <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wider mb-3 text-center">Tailles</h3>
                                <div className="flex flex-wrap gap-3 justify-center">
                                    {product.sizes.map((size: string) => {
                                        const qty = selectedSizes[size] || 0;
                                        return (
                                            <div key={size} className={`flex items-center rounded-lg border transition-all overflow-hidden mb-2 ${qty > 0 ? 'bg-gray-900 border-gray-900 shadow-md ring-2 ring-offset-2 ring-gray-900' : 'bg-white border-gray-200 hover:border-orange-500'}`}>
                                                {qty > 0 ? (
                                                    <>
                                                        <button onClick={() => updateSizeQuantity(size, -1)} className="w-12 h-12 flex items-center justify-center text-white hover:bg-gray-700 transition-colors font-bold text-xl">-</button>
                                                        <div className="h-12 px-4 flex items-center justify-center bg-gray-900 text-white font-bold text-lg min-w-[4rem] border-x border-gray-700">
                                                            {size}<span className="text-sm ml-2 font-normal opacity-70">x{qty}</span>
                                                        </div>
                                                        <button onClick={() => updateSizeQuantity(size, 1)} className="w-12 h-12 flex items-center justify-center text-white hover:bg-gray-700 transition-colors font-bold text-xl">+</button>
                                                    </>
                                                ) : (
                                                    <button
                                                        onClick={() => updateSizeQuantity(size, 1)}
                                                        className="w-16 h-12 flex items-center justify-center text-gray-600 font-bold text-base hover:bg-gray-50 transition-colors"
                                                    >
                                                        {size}
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div id="cart-section" className="lg:hidden p-6 bg-white rounded-3xl border border-gray-100 shadow-sm mt-auto">
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Prix Total TTC</p>
                                        <p className="text-3xl font-black text-gray-900">{finalPrice.toFixed(2)}Ã¢â€šÂ¬</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center"><i className="fa-brands fa-facebook-messenger"></i></button>
                                        <button className="w-10 h-10 rounded-full bg-green-50 text-green-600 flex items-center justify-center"><i className="fa-brands fa-whatsapp"></i></button>
                                    </div>
                                </div>
                                <button
                                    onClick={handleAddToCartAction}
                                    className="w-full py-4 bg-orange-600 text-white font-black text-lg uppercase tracking-widest rounded-xl shadow-xl shadow-orange-100 hover:bg-orange-500 transform active:scale-95 transition-all"
                                >
                                    AJOUTER AU PANIER
                                </button>
                            </div>

                            <div className="flex-1"></div>

                            <button
                                onClick={handleAddToCartAction}
                                className="hidden lg:flex w-full py-5 bg-gray-900 text-white font-black text-lg uppercase tracking-widest hover:bg-black shadow-xl transform transition-all hover:-translate-y-1 rounded-xl items-center justify-center gap-3"
                            >
                                Ajouter Ã  mon panier
                            </button>

                            <div className="bg-gradient-to-br from-orange-50 to-white p-5 rounded-2xl border border-orange-100 shadow-sm text-center relative overflow-hidden">
                                <div className="absolute top-0 right-0 bg-orange-500 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg">
                                    <i className="fa-solid fa-coins mr-1"></i>{userCredits}
                                </div>
                                <h3 className="font-bold text-gray-900 mb-2 flex items-center justify-center gap-2">
                                    <i className="fa-solid fa-wand-magic-sparkles text-orange-500"></i> Essayage Virtuel
                                </h3>
                                <p className="text-xs text-gray-500 mb-4">Visualisez ce design sur vous grÃƒÂ¢ce Ãƒ l'IA.</p>
                                <button onClick={() => setAiModalOpen(true)} className="w-full py-3 bg-white border border-orange-200 text-orange-600 font-bold rounded-xl hover:bg-orange-50 transition-colors shadow-sm">
                                    Lancer l'IA (1 crédit)
                                </button>
                            </div>
                        </div>
                    </div>




                    {/* AI STUDIO "PAGE" OVERLAY */}
                    {
                        aiModalOpen && (
                            <div className="fixed inset-0 z-[150] bg-white flex flex-col items-center justify-start animate-fade-in overflow-y-auto pb-safe">
                                {/* STUDIO HEADER */}
                                <div className="w-full bg-white border-b border-gray-100 p-4 flex items-center justify-between sticky top-0 z-50 shadow-sm">
                                    <button
                                        onClick={() => setAiModalOpen(false)}
                                        className="flex items-center gap-2 text-gray-600 font-bold hover:text-orange-500 transition-colors"
                                    >
                                        <i className="fa-solid fa-arrow-left"></i>
                                        <span>Retour Création</span>
                                    </button>
                                    <h3 className="text-lg font-black italic">Studio <span className="text-orange-500">IA</span></h3>
                                    <div className="w-20"></div> {/* Spacer for center alignment */}
                                </div>

                                <div className="w-full max-w-2xl p-4 space-y-6 text-center pt-8">
                                    {/* Content Body */}
                                    {!aiResult ? (
                                        <>
                                            {!isCameraOpen && !capturedImage && !aiGenerating && (
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
                                                                className="flex overflow-x-auto gap-4 pb-4 -mx-2 px-4 scrollbar-hide snap-x snap-mandatory items-center"
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
                                                                            onClick={() => { setSelectedStylePrompt(item.style.prompt); setCustomStylePrompt(''); setActiveStyleCategory(item.category as StyleCategory); }}
                                                                            className={`flex-shrink-0 w-40 h-52 rounded-xl border transition-all relative overflow-hidden group snap-start ${selectedStylePrompt === item.style.prompt ? 'border-orange-500 ring-2 ring-orange-500 ring-offset-2' : 'border-gray-200 hover:border-gray-300'}`}
                                                                        >
                                                                            <img
                                                                                src={getProxiedUrl(item.style.image)}
                                                                                alt={item.style.name}
                                                                                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
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
                                                                    className="flex-shrink-0 w-72 h-52 bg-gray-50 rounded-xl border border-gray-200 p-4 flex flex-col justify-center snap-start relative"
                                                                >
                                                                    <h4 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                                                                        <i className="fa-solid fa-pen-fancy text-orange-500"></i>
                                                                        Personnalisé
                                                                    </h4>
                                                                    <p className="text-[10px] text-gray-400 mb-2">Décrivez l'ambiance de vos rêves...</p>
                                                                    <textarea
                                                                        value={customStylePrompt}
                                                                        onChange={(e) => { setCustomStylePrompt(e.target.value); setSelectedStylePrompt(''); setActiveStyleCategory('Custom'); }}
                                                                        placeholder="Ex: Cyberpunk, Jungle, Vintage..."
                                                                        className="w-full p-2 bg-white border border-gray-200 rounded-lg text-xs outline-none focus:border-orange-500 font-medium h-24 resize-none"
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
                                                            <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-orange-500 hover:bg-orange-50 transition-all group cursor-pointer">
                                                                <i className="fa-solid fa-image text-2xl text-gray-400 group-hover:text-orange-500 mb-2"></i>
                                                                <div className="font-bold text-gray-700 text-xs">Galerie</div>
                                                                <input type="file" hidden accept="image/*" onChange={(e) => {
                                                                    if (e.target.files?.[0]) {
                                                                        const r = new FileReader();
                                                                        r.onload = (ev) => setPreviewImage(ev.target?.result as string);
                                                                        r.readAsDataURL(e.target.files[0]);
                                                                    }
                                                                }} />
                                                            </label>
                                                        </div>
                                                    </div>
                                                </>
                                            )}


                                            {aiGenerating && (
                                                <div className="fixed inset-0 z-[200] bg-white/95 backdrop-blur-md flex flex-col items-center justify-center p-6 animate-fade-in">
                                                    <div className="relative w-full max-w-sm aspect-[3/4] magic-glow-garment shadow-2xl overflow-hidden rounded-[2.5rem] border border-orange-100/50">
                                                        <img 
                                                            src={lastUserImage || capturedImage || previewImage || ''} 
                                                            className="w-full h-full object-cover" 
                                                            alt="processing" 
                                                        />
                                                        {/* Scanning Line Animation */}
                                                        <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-transparent via-orange-500 to-transparent shadow-[0_0_20px_rgba(249,115,22,1)] animate-scanning-line z-40"></div>
                                                        
                                                        {/* Organic Magic Effect Overlay (Fluid/Glow) */}
                                                        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent mix-blend-overlay"></div>
                                                    </div>
                                                    
                                                    <div className="mt-10 text-center space-y-2">
                                                        <div className="flex items-center justify-center gap-3">
                                                            <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></div>
                                                            <p className="text-xl font-black text-gray-900 uppercase tracking-tighter italic">Studio <span className="text-orange-500">IA</span></p>
                                                            <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse delay-75"></div>
                                                        </div>
                                                        <p className="text-sm font-bold text-gray-600">Génération de votre essayage...</p>
                                                        <p className="text-[10px] text-gray-400 font-medium max-w-[200px] mx-auto leading-relaxed">
                                                            Notre intelligence artificielle fusionne votre photo et le design pour un rendu unique.
                                                        </p>
                                                    </div>
                                                </div>
                                            )}

                                            {isCameraOpen && (
                                                <div className="relative bg-black rounded-2xl overflow-hidden aspect-[3/4] shadow-2xl">
                                                    <video
                                                        ref={videoRef}
                                                        autoPlay
                                                        playsInline
                                                        className="w-full h-full object-cover"
                                                        style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
                                                    />
                                                    <div className="absolute top-4 left-0 w-full flex justify-center z-20">
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
                                                        <button onClick={capturePhoto} className="w-20 h-20 rounded-full bg-white border-4 border-gray-300 flex items-center justify-center"><div className="w-16 h-16 bg-white rounded-full border-2 border-red-500"></div></button>
                                                        <button onClick={toggleCamera} className="w-12 h-12 rounded-full bg-white/20 backdrop-blur text-white"><i className="fa-solid fa-rotate"></i></button>
                                                    </div>
                                                </div>
                                            )}

                                            {capturedImage && !aiGenerating && (
                                                <div className="space-y-4">
                                                    <img src={capturedImage} className="w-full rounded-xl shadow-lg max-h-[60vh] object-contain bg-gray-100" alt="Captured" />
                                                    <button onClick={() => handleAiTryOn(capturedImage)} className="w-full py-4 bg-orange-600 text-white font-bold rounded-xl shadow-lg hover:bg-orange-500 animate-pulse">Générer le rendu (1 crédit)</button>
                                                    <button onClick={() => setCapturedImage(null)} className="text-gray-500 underline">Reprendre</button>
                                                </div>
                                            )}

                                            {/* Intermediate Preview Modal */}
                                            {previewImage && !aiGenerating && (
                                                <div className="fixed inset-0 z-[60] bg-white flex flex-col items-center justify-center p-6 animate-fade-in">
                                                    <h3 className="text-2xl font-black text-gray-900 mb-4">Aperçu Photo</h3>
                                                    <div className="relative w-full max-w-sm aspect-[3/4] rounded-xl overflow-hidden shadow-2xl mb-6 bg-gray-100">
                                                        <img src={previewImage} className="w-full h-full object-cover" alt="Preview" />
                                                    </div>
                                                    <div className="w-full max-w-sm space-y-3">
                                                        {/* POSE SELECTION - BEFORE VALIDATION */}
                                                        <div className="flex gap-4 justify-center mb-4">
                                                            <button
                                                                onClick={() => setSelectedPose('front')}
                                                                className={`flex-1 py-3 px-2 rounded-xl border-2 font-bold transition-all flex flex-col items-center gap-1 ${selectedPose === 'front' ? 'border-orange-500 bg-orange-50 text-orange-600' : 'border-gray-200 text-gray-500'}`}
                                                            >
                                                                <img src={getProxiedUrl(POSE_IMAGES.front)} className="w-8 h-8 object-contain" alt="Face" />
                                                                <span>Face</span>
                                                            </button>
                                                            <button
                                                                onClick={() => setSelectedPose('back')}
                                                                className={`flex-1 py-3 px-2 rounded-xl border-2 font-bold transition-all flex flex-col items-center gap-1 ${selectedPose === 'back' ? 'border-orange-500 bg-orange-50 text-orange-600' : 'border-gray-200 text-gray-500'}`}
                                                            >
                                                                <img src={getProxiedUrl(POSE_IMAGES.back)} className="w-8 h-8 object-contain" alt="Dos" />
                                                                <span>Dos</span>
                                                            </button>
                                                        </div>

                                                        <button
                                                            onClick={() => {
                                                                if (!selectedPose) { alert('Veuillez d\'abord choisir une pose (Face ou Dos).'); return; }
                                                                handleAiTryOn(previewImage)
                                                            }}
                                                            className="w-full py-4 bg-orange-600 text-white font-bold rounded-xl shadow-lg hover:bg-orange-500 flex items-center justify-center gap-2 animate-pulse"
                                                        >
                                                            <i className="fa-solid fa-check"></i> Valider & Générer (1 crédit)
                                                        </button>
                                                        <button
                                                            onClick={() => setPreviewImage(null)}
                                                            className="w-full py-3 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200"
                                                        >
                                                            Annuler
                                                        </button>
                                                    </div>
                                                </div>

                                            )}
                                        </>
                                    ) : (
                                        <div className="w-full max-w-lg bg-white p-6 rounded-2xl shadow-2xl border border-gray-100">
                                            <h3 className="text-2xl font-bold text-gray-900 mb-4 text-center">Résultat IA</h3>
                                            <div className="relative rounded-xl overflow-hidden shadow-inner bg-gray-50 mb-6">
                                                <img src={aiResult} className="w-full h-auto" alt="Result" />
                                                <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded backdrop-blur-sm">Généré par Gemini</div>
                                            </div>
                                            <div className="space-y-3">
                                                <input
                                                    type="text"
                                                    placeholder="Ajouter une légende..."
                                                    className="w-full p-3 border border-gray-300 rounded-xl focus:border-orange-500 outline-none bg-gray-50"
                                                    value={publishCaption}
                                                    onChange={e => setPublishCaption(e.target.value)}
                                                />
                                                <button
                                                    onClick={() => {
                                                        onPublish(aiResult, publishCaption, item.productType, item, activeStyleCategory, activeStyleCategory === 'Custom' ? customStylePrompt : selectedStylePrompt);
                                                        setAiModalOpen(false);
                                                    }}
                                                    className="w-full py-4 bg-gray-900 text-white font-bold rounded-xl shadow-lg hover:bg-gray-800"
                                                >
                                                    Publier sur le Feed
                                                </button>

                                                <button
                                                    onClick={() => {
                                                        if (window.confirm("Attention, l'image sera perdue. Voulez-vous continuer ?")) {
                                                            setAiResult(null);
                                                        }
                                                    }}
                                                    className="w-full py-3 bg-white text-gray-500 font-bold rounded-xl border border-gray-200 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                                                >
                                                    Ne pas publier (Retour Studio)
                                                </button>

                                                {/* FEEDBACK SYSTEM - REPLACES GENERATE NEW INITIALLY */}
                                                {!feedbackGiven && (
                                                    <div className="flex flex-col gap-2 mt-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                                                        <p className="text-center text-xs font-bold text-gray-500 uppercase">Donnez votre avis</p>
                                                        <div className="flex gap-4 justify-center">
                                                            <button onClick={() => { setShowFeedbackInput(true); }} className="w-12 h-12 rounded-full bg-white border border-gray-200 hover:border-green-500 hover:text-green-500 shadow-sm flex items-center justify-center text-xl transition-colors">
                                                                <i className="fa-solid fa-thumbs-up"></i>
                                                            </button>
                                                            <button onClick={() => { setShowFeedbackInput(true); }} className="w-12 h-12 rounded-full bg-white border border-gray-200 hover:border-red-500 hover:text-red-500 shadow-sm flex items-center justify-center text-xl transition-colors">
                                                                <i className="fa-solid fa-thumbs-down"></i>
                                                            </button>
                                                        </div>
                                                        {showFeedbackInput && (
                                                            <div className="flex gap-2 mt-2 animate-fade-in">
                                                                <input
                                                                    type="text"
                                                                    placeholder="Un commentaire (optionnel)..."
                                                                    className="flex-1 p-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-orange-500"
                                                                    value={feedbackComment}
                                                                    onChange={(e) => setFeedbackComment(e.target.value)}
                                                                />
                                                                <button onClick={() => handleFeedback(true)} className="px-4 py-2 bg-orange-500 text-white font-bold rounded-lg text-xs">Envoyer</button>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* MODIFY / ROTATE SECTION */}
                                                {lastUserImage && (
                                                    <div className="mt-4">
                                                        {!isModifying ? (
                                                            <div className="grid grid-cols-2 gap-3">
                                                                <button
                                                                    onClick={() => setIsModifying(true)}
                                                                    className="py-3 bg-white border-2 border-orange-100 text-orange-600 font-bold rounded-xl hover:bg-orange-50 hover:border-orange-200 transition-colors flex items-center justify-center gap-2"
                                                                >
                                                                    <i className="fa-solid fa-wand-magic-sparkles"></i> Modifier
                                                                </button>
                                                                <button
                                                                    onClick={() => { setAiResult(null); handleAiTryOn(lastUserImage); }}
                                                                    className="py-3 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 flex items-center justify-center gap-2"
                                                                >
                                                                    <i className="fa-solid fa-rotate-right"></i> Refaire
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <div className="flex flex-col gap-3 p-4 bg-orange-50 rounded-xl border border-orange-100 animate-fade-in">
                                                                <label className="text-xs font-bold text-orange-800 uppercase">Modifier la génération</label>
                                                                <textarea
                                                                    className="w-full p-3 border border-orange-200 rounded-lg text-sm outline-none focus:border-orange-500 h-24 resize-none"
                                                                    placeholder="Ex: Ajouter un ciel étoilé, rendre plus sombre..."
                                                                    value={modificationPrompt}
                                                                    onChange={(e) => setModificationPrompt(e.target.value)}
                                                                ></textarea>
                                                                <div className="flex gap-2">
                                                                    <button
                                                                        onClick={() => setIsModifying(false)}
                                                                        className="flex-1 py-2 bg-white text-gray-600 font-bold rounded-lg border border-gray-200 hover:bg-gray-50"
                                                                    >
                                                                        Annuler
                                                                    </button>
                                                                    <button
                                                                        onClick={() => { handleAiTryOn(lastUserImage, modificationPrompt); setIsModifying(false); }}
                                                                        className="flex-1 py-2 bg-orange-500 text-white font-bold rounded-lg hover:bg-orange-600"
                                                                    >
                                                                        Générer
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                    )
                                    }
                                </div>
                            </div>
                        )
                    }


                    {/* MAIN MENU OVERLAY - REMOVED in favor of UniversalMenu */}

                    {/* CROPPER MODAL */}
                    {
                        croppingImage && (
                            <div className="fixed inset-0 z-[110] bg-black md:bg-black/80 flex flex-col md:items-center md:justify-center animate-fade-in">
                                <div className="relative flex-1 bg-black/90 w-full h-full md:max-w-[600px] md:max-h-[600px] md:rounded-t-2xl md:overflow-hidden">
                                    <Cropper
                                        image={croppingImage}
                                        crop={crop}
                                        zoom={zoom}
                                        aspect={undefined} // Free crop
                                        onCropChange={setCrop}
                                        onCropComplete={onCropComplete}
                                        onZoomChange={setZoom}
                                    />
                                </div>
                                <div className="p-4 bg-white flex flex-col gap-4 pb-safe border-t border-gray-100 md:w-[600px] md:rounded-b-2xl">
                                    <div className="flex items-center gap-4">
                                        <i className="fa-solid fa-magnifying-glass-minus text-gray-400"></i>
                                        <input
                                            type="range"
                                            value={zoom}
                                            min={1}
                                            max={3}
                                            step={0.1}
                                            onChange={(e) => setZoom(Number(e.target.value))}
                                            className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
                                        />
                                        <i className="fa-solid fa-magnifying-glass-plus text-gray-400"></i>
                                    </div>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => { setCroppingImage(null); setUploadedLogoPreview(null); }}
                                            className="flex-1 py-3 bg-gray-100 text-gray-500 font-bold rounded-xl hover:bg-gray-200 transition-colors"
                                        >
                                            Annuler
                                        </button>
                                        <button
                                            onClick={handleCropSave}
                                            className="flex-1 py-3 bg-gray-900 text-white font-bold rounded-xl shadow-lg border-2 border-transparent hover:border-orange-500 transition-all"
                                        >
                                            <i className="fa-solid fa-crop-simple mr-2"></i>Valider
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )
                    }
                </>
            )}
        </div>
    );
};



