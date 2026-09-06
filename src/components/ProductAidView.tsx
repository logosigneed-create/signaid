import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
    Sparkles, Upload, ArrowLeft, Download, Layers, Palette, RefreshCw, 
    Wand2, Check, AlertCircle, ShoppingBag, Eye, EyeOff, Plus, Trash2, Copy, 
    ExternalLink, FileText, CheckCircle2, Shield, Settings2, Box, Tag, Euro,
    Key, X, Sliders
} from 'lucide-react';
import { 
    generateProductAidImage, refinePromptWithAI, extractDominantColor, 
    extractProductSpecsFromText, ProductAidImage, getGeminiApiKey,
    setGeminiApiKey, testGeminiApiKey, isApiKeyUsable
} from '../services/productAidService';
import { 
    saveProductToAuditPortal, fetchCustomAuditProducts, 
    deleteProductFromAuditPortal, getMergedAuditCatalog, formatCatalogAsTsCode 
} from '../services/auditCatalogService';
import { AuditProductEntry, AUDIT_PORTAIL_CONFIG } from '../config/audit-portail';

export const ProductAidView: React.FC = () => {
    const navigate = useNavigate();
    const garmentInputRef = useRef<HTMLInputElement>(null);
    const templateInputRef = useRef<HTMLInputElement>(null);
    const mockupFrontInputRef = useRef<HTMLInputElement>(null);
    const mockupBackInputRef = useRef<HTMLInputElement>(null);

    // Active tab: 'audit-form' | 'ai-studio' | 'active-catalog'
    const [activeTab, setActiveTab] = useState<'audit-form' | 'ai-studio' | 'active-catalog'>('audit-form');

    // === AI Studio States ===
    const [garmentImage, setGarmentImage] = useState<ProductAidImage | null>(null);
    const [shapeReference, setShapeReference] = useState<ProductAidImage | null>(null);
    const [prompt, setPrompt] = useState<string>('');
    const [position, setPosition] = useState<string>('Vue de Face (Front view)');
    const [selectedColor, setSelectedColor] = useState<string>('#F97316');
    const [useAIEnhance, setUseAIEnhance] = useState<boolean>(true);
    const [isRefining, setIsRefining] = useState<boolean>(false);
    const [isGenerating, setIsGenerating] = useState<boolean>(false);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // === Audit Form States ===
    const [supplierRawText, setSupplierRawText] = useState<string>('');
    const [isExtractingSpecs, setIsExtractingSpecs] = useState<boolean>(false);
    const [isSavingProduct, setIsSavingProduct] = useState<boolean>(false);
    const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
    const [copiedJson, setCopiedJson] = useState<boolean>(false);

    // === API Key Modal States ===
    const [isKeyModalOpen, setIsKeyModalOpen] = useState<boolean>(false);
    const [apiKeyInput, setApiKeyInput] = useState<string>(() => getGeminiApiKey());
    const [showApiKey, setShowApiKey] = useState<boolean>(false);
    const [isTestingKey, setIsTestingKey] = useState<boolean>(false);
    const [keyTestStatus, setKeyTestStatus] = useState<{ type: 'idle' | 'success' | 'error'; message: string }>({ type: 'idle', message: '' });

    // Dérivé réactif : la clé courante est-elle exploitable ?
    const apiKeyIsUsable = isApiKeyUsable(apiKeyInput);

    // Auto-ouvre la modale de configuration si aucune clé valide n'est définie au montage
    useEffect(() => {
        if (!isApiKeyUsable(getGeminiApiKey())) {
            setIsKeyModalOpen(true);
        }
    }, []);

    const handleSaveApiKey = () => {
        setGeminiApiKey(apiKeyInput);
        setKeyTestStatus({ type: 'success', message: 'Clé API enregistrée localement dans le navigateur !' });
        setTimeout(() => {
            setIsKeyModalOpen(false);
            setKeyTestStatus({ type: 'idle', message: '' });
        }, 1500);
    };

    const handleTestApiKey = async () => {
        setIsTestingKey(true);
        setKeyTestStatus({ type: 'idle', message: '' });
        try {
            const res = await testGeminiApiKey(apiKeyInput);
            if (res.success) {
                setKeyTestStatus({ type: 'success', message: 'Connexion établie avec succès avec Gemini 2.5 Flash !' });
            } else {
                setKeyTestStatus({ type: 'error', message: res.message });
            }
        } catch (e: any) {
            setKeyTestStatus({ type: 'error', message: e?.message || 'Erreur de connexion.' });
        } finally {
            setIsTestingKey(false);
        }
    };

    const handleResetApiKey = () => {
        if (typeof window !== 'undefined') {
            localStorage.removeItem('signaid_gemini_api_key');
        }
        const defaultEnv = (import.meta as any).env?.VITE_GEMINI_API_KEY || (import.meta as any).env?.VITE_GOOGLE_GENAI_API_KEY || '';
        setApiKeyInput(defaultEnv);
        setKeyTestStatus({ type: 'idle', message: 'Clé réinitialisée aux variables d\'environnement.' });
    };

    // Form fields
    const [formProduct, setFormProduct] = useState<AuditProductEntry>({
        id: '',
        sku: 'BYBB011-BLK',
        supplierRef: 'BYBB011',
        supplierName: 'L-Shop-Team',
        brand: 'Build Your Brand',
        model: 'Basic Tank',
        title: 'Débardeur Vision Room',
        category: 'Textile / Sans Manches',
        garmentType: 'tank_top',
        composition: '100% Coton peigné (Jersey simple)',
        weightGsm: 140,
        fit: 'Coupe standard (Regular fit), col rond ras du cou',
        features: [
            'Sans étiquette de marque au col (Tear-away / Label-free)',
            'Maille fine idéale pour impression numérique directe (DTG) et sérigraphie',
            'Finitions renforcées aux emmanchures et au col'
        ],
        sizes: ['S', 'M', 'L', 'XL', 'XXL'],
        colors: [
            { name: 'Noir', hex: '#000000', isPrimary: true },
            { name: 'Blanc', hex: '#ffffff', isPrimary: false }
        ],
        pricing: {
            costPriceHt: 4.85,
            retailPriceTtc: 27.99,
            currency: 'EUR',
            marginEstimated: 18.48
        },
        mockups: {
            front: '/merch/visionroom/tank-front.png',
            back: '/merch/visionroom/tank-back.png'
        },
        printSpecs: {
            printableAreas: ['front', 'back', 'chest_left'],
            recommendedTechnique: 'DTG',
            maxPrintWidthMm: 280,
            maxPrintHeightMm: 400
        },
        status: 'active'
    });

    // === Catalog Management States ===
    const [activeCatalog, setActiveCatalog] = useState<AuditProductEntry[]>([]);
    const [isLoadingCatalog, setIsLoadingCatalog] = useState<boolean>(false);

    const loadCatalog = useCallback(async () => {
        setIsLoadingCatalog(true);
        try {
            const merged = await getMergedAuditCatalog();
            setActiveCatalog(merged);
        } catch (e) {
            console.error("Erreur chargement catalogue:", e);
        } finally {
            setIsLoadingCatalog(false);
        }
    }, []);

    useEffect(() => {
        loadCatalog();
    }, [loadCatalog]);

    // Handle File Upload for AI Studio
    const handleFileUpload = async (file: File, type: 'garment' | 'template') => {
        setError(null);
        const reader = new FileReader();
        reader.onload = async () => {
            const base64 = reader.result as string;
            const imgData: ProductAidImage = {
                base64,
                mimeType: file.type || 'image/png',
                previewUrl: URL.createObjectURL(file)
            };

            if (type === 'garment') {
                setGarmentImage(imgData);
                try {
                    const dominant = await extractDominantColor(base64);
                    setSelectedColor(dominant);
                } catch (e) {
                    console.warn(e);
                }
            } else {
                setShapeReference(imgData);
            }
        };
        reader.readAsDataURL(file);
    };

    // AI Prompt Optimizer
    const handleOptimizePrompt = async () => {
        if (!prompt.trim()) return;
        setIsRefining(true);
        setError(null);
        try {
            const refined = await refinePromptWithAI(prompt);
            setPrompt(refined);
        } catch (err: any) {
            setError("Impossible d'optimiser le prompt pour le moment.");
        } finally {
            setIsRefining(false);
        }
    };

    // Generate Product in AI Studio
    const handleGenerate = async () => {
        if (!garmentImage) {
            setError("Veuillez d'abord charger l'image d'un vêtement ou d'un produit.");
            return;
        }

        setIsGenerating(true);
        setError(null);

        try {
            let finalPrompt = prompt;
            if (useAIEnhance && prompt.trim()) {
                finalPrompt = await refinePromptWithAI(prompt);
            }

            const result = await generateProductAidImage(
                garmentImage,
                finalPrompt || "Photorealistic high quality textile product mockup, perfectly rendered fabrics, studio lighting",
                shapeReference,
                position,
                selectedColor
            );

            setGeneratedImage(result);
        } catch (err: any) {
            console.error(err);
            setError(err.message || "La génération du produit a échoué. Veuillez réessayer.");
        } finally {
            setIsGenerating(false);
        }
    };

    // Extract specs using AI
    const handleExtractSupplierSpecs = async () => {
        if (!supplierRawText.trim()) {
            setError("Veuillez coller un descriptif ou fiche technique fournisseur.");
            return;
        }

        setIsExtractingSpecs(true);
        setError(null);
        try {
            const extracted = await extractProductSpecsFromText(supplierRawText);
            setFormProduct(prev => ({
                ...prev,
                ...extracted,
                mockups: {
                    front: prev.mockups?.front || '',
                    back: prev.mockups?.back || ''
                }
            }));
            setSaveSuccessMessage("Fiche technique extraite et auto-remplie avec succès par l'IA !");
            setTimeout(() => setSaveSuccessMessage(null), 4000);
        } catch (err: any) {
            setError(err.message || "Erreur lors de l'extraction des données.");
        } finally {
            setIsExtractingSpecs(false);
        }
    };

    // Handle Mockup Images (Front / Back)
    const handleMockupUpload = (file: File, view: 'front' | 'back') => {
        const reader = new FileReader();
        reader.onload = () => {
            const base64 = reader.result as string;
            setFormProduct(prev => ({
                ...prev,
                mockups: {
                    ...prev.mockups,
                    [view]: base64
                }
            }));
        };
        reader.readAsDataURL(file);
    };

    // Integrate Product into Audit Portal
    const handleSaveToAuditPortal = async () => {
        if (!formProduct.title || !formProduct.sku) {
            setError("Veuillez renseigner au minimum le Titre et la Référence SKU du produit.");
            return;
        }

        setIsSavingProduct(true);
        setError(null);
        try {
            const productId = formProduct.id || `prod_${formProduct.sku.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now().toString(36)}`;
            const finalProduct: AuditProductEntry = {
                ...formProduct,
                id: productId,
                pricing: {
                    costPriceHt: Number(formProduct.pricing.costPriceHt) || 0,
                    retailPriceTtc: Number(formProduct.pricing.retailPriceTtc) || 0,
                    currency: formProduct.pricing.currency || 'EUR',
                    marginEstimated: Math.max(0, Number(((Number(formProduct.pricing.retailPriceTtc) || 0) / 1.2 - (Number(formProduct.pricing.costPriceHt) || 0)).toFixed(2)))
                }
            };

            await saveProductToAuditPortal(finalProduct);
            await loadCatalog();
            setSaveSuccessMessage(`Produit « ${finalProduct.title} » (${finalProduct.sku}) intégré avec succès à l'Audit Portail !`);
        } catch (err: any) {
            setError(err.message || "Erreur lors de l'intégration du produit.");
        } finally {
            setIsSavingProduct(false);
        }
    };

    // Delete a product
    const handleDeleteProduct = async (id: string, title: string) => {
        if (!confirm(`Confirmer la suppression du produit « ${title} » de l'Audit Portail ?`)) return;
        try {
            await deleteProductFromAuditPortal(id);
            await loadCatalog();
        } catch (e) {
            console.error("Erreur suppression:", e);
        }
    };

    // Copy TS code
    const handleCopyTsConfig = () => {
        const code = formatCatalogAsTsCode(activeCatalog);
        navigator.clipboard.writeText(code);
        setCopiedJson(true);
        setTimeout(() => setCopiedJson(false), 3000);
    };

    return (
        <div className="min-h-screen bg-neutral-950 text-white font-sans flex flex-col">
            {/* Header */}
            <header className="border-b border-neutral-800 bg-neutral-900/90 backdrop-blur sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 py-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link to="/" className="p-2 hover:bg-neutral-800 rounded-xl transition-colors">
                            <ArrowLeft className="w-5 h-5 text-neutral-400" />
                        </Link>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-orange-400 via-amber-400 to-yellow-500 bg-clip-text text-transparent">
                                    ProductAid
                                </span>
                                <span className="text-[11px] bg-orange-500/20 text-orange-400 px-2.5 py-0.5 rounded-full border border-orange-500/30 flex items-center gap-1 font-semibold">
                                    <Sparkles className="w-3 h-3" /> AUDIT & STUDIO PIPELINE
                                </span>
                            </div>
                            <p className="text-xs text-neutral-400">Intégration textile autonome pour l'Audit Portail & les Mockups 3D</p>
                        </div>
                    </div>

                    {/* Navigation Tabs */}
                    <div className="flex items-center gap-1.5 bg-neutral-950 p-1 rounded-xl border border-neutral-800">
                        <button 
                            onClick={() => setActiveTab('audit-form')}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                activeTab === 'audit-form' 
                                    ? 'bg-orange-600 text-white shadow-md shadow-orange-600/30' 
                                    : 'text-neutral-400 hover:text-white'
                            }`}
                        >
                            <Box className="w-3.5 h-3.5" /> Intégrer un Produit
                        </button>
                        <button 
                            onClick={() => setActiveTab('ai-studio')}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                activeTab === 'ai-studio' 
                                    ? 'bg-orange-600 text-white shadow-md shadow-orange-600/30' 
                                    : 'text-neutral-400 hover:text-white'
                            }`}
                        >
                            <Sparkles className="w-3.5 h-3.5" /> Studio Mockup IA
                        </button>
                        <button 
                            onClick={() => setActiveTab('active-catalog')}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                activeTab === 'active-catalog' 
                                    ? 'bg-orange-600 text-white shadow-md shadow-orange-600/30' 
                                    : 'text-neutral-400 hover:text-white'
                            }`}
                        >
                            <FileText className="w-3.5 h-3.5" /> Catalogue Actif ({activeCatalog.length})
                        </button>
                    </div>

                    {/* Direct Links & Settings */}
                    <div className="flex items-center gap-2.5">
                        <button 
                            onClick={() => {
                                setApiKeyInput(getGeminiApiKey());
                                setKeyTestStatus({ type: 'idle', message: '' });
                                setIsKeyModalOpen(true);
                            }}
                            className="text-xs bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 hover:text-white px-3 py-2 rounded-xl border border-neutral-700 transition-all flex items-center gap-1.5 font-medium"
                            title="Configurer la Clé API Google Gemini"
                        >
                            <Key className="w-3.5 h-3.5 text-amber-400" />
                            <span className="hidden sm:inline">Clé Gemini</span>
                        </button>

                        <Link 
                            to="/portail-audit" 
                            className="text-xs bg-orange-600/90 hover:bg-orange-500 text-white px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 font-medium shadow-md shadow-orange-600/20"
                        >
                            <Eye className="w-3.5 h-3.5" /> Voir Audit Portail
                        </Link>
                    </div>
                </div>
            </header>

            {/* Modal: Gemini API Key Configuration */}
            {isKeyModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-neutral-900 border border-neutral-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 relative animate-in fade-in zoom-in-95 duration-200">
                        <button 
                            onClick={() => setIsKeyModalOpen(false)}
                            className="absolute top-4 right-4 text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-800 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                                <Key className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-bold text-base text-white">Paramètres Clé API Gemini</h3>
                                <p className="text-xs text-neutral-400">Pour l'extraction IA et la génération de mockups 3D</p>
                            </div>
                        </div>

                        <div className="space-y-3 pt-2">
                            <div>
                                <label className="text-xs font-semibold text-neutral-300 block mb-1.5">
                                    Clé Google AI Studio (Gemini 2.5 Flash / Flash-Image)
                                </label>
                                <div className="relative">
                                    <input 
                                        type={showApiKey ? "text" : "password"}
                                        value={apiKeyInput}
                                        onChange={(e) => setApiKeyInput(e.target.value)}
                                        placeholder="AIzaSy..."
                                        className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded-xl p-3 pr-10 text-xs font-mono text-neutral-200 placeholder:text-neutral-600 focus:outline-none"
                                    />
                                    <button 
                                        type="button"
                                        onClick={() => setShowApiKey(!showApiKey)}
                                        className="absolute right-3 top-3 text-neutral-500 hover:text-neutral-300"
                                    >
                                        {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            {/* Indicateur de statut de clé */}
                            {apiKeyInput.trim() ? (
                                <div className={`flex items-center gap-2 text-[11px] px-3 py-2 rounded-xl border ${apiKeyIsUsable ? 'bg-emerald-950/60 border-emerald-700/50 text-emerald-400' : 'bg-red-950/60 border-red-700/50 text-red-400'}`}>
                                    {apiKeyIsUsable 
                                        ? <><CheckCircle2 className="w-3.5 h-3.5 shrink-0" /><span>Format valide – cliquez "Tester" pour confirmer la connexion à Gemini.</span></>
                                        : <><AlertCircle className="w-3.5 h-3.5 shrink-0" /><span>Clé non valide ou révoquée. Générez une nouvelle clé sur <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="underline text-red-300 hover:text-red-200">Google AI Studio →</a></span></>
                                    }
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 text-[11px] px-3 py-2 rounded-xl border bg-amber-950/60 border-amber-700/50 text-amber-400">
                                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                    <span>Aucune clé configurée. Obtenez-en une gratuitement sur <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="underline text-amber-300 hover:text-amber-200">Google AI Studio →</a></span>
                                </div>
                            )}

                            <p className="text-[11px] text-neutral-400 leading-relaxed bg-neutral-950/60 p-3 rounded-xl border border-neutral-800/80">
                                💡 <strong>Résilience autonome :</strong> Si aucune clé n'est fournie ou si la clé est invalide, Signaid bascule automatiquement sur l'<strong>analyseur déterministe local</strong> pour extraire immédiatement les caractéristiques textiles sans interruption.
                            </p>

                            {keyTestStatus.message && (
                                <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                                    keyTestStatus.type === 'success' 
                                        ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/50' 
                                        : keyTestStatus.type === 'error'
                                        ? 'bg-red-950/80 text-red-300 border border-red-500/50'
                                        : 'bg-neutral-800 text-neutral-300 border border-neutral-700'
                                }`}>
                                    {keyTestStatus.type === 'success' && <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />}
                                    {keyTestStatus.type === 'error' && <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />}
                                    <span>{keyTestStatus.message}</span>
                                </div>
                            )}

                            <div className="flex items-center justify-between gap-2 pt-2">
                                <button 
                                    type="button"
                                    onClick={handleResetApiKey}
                                    className="px-3 py-2 text-xs text-neutral-400 hover:text-red-400 hover:bg-neutral-800 rounded-xl transition-colors"
                                >
                                    Effacer
                                </button>
                                <div className="flex items-center gap-2">
                                    <button 
                                        type="button"
                                        onClick={handleTestApiKey}
                                        disabled={isTestingKey || !apiKeyInput.trim()}
                                        className="px-3.5 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold rounded-xl transition-colors disabled:opacity-40 flex items-center gap-1.5"
                                    >
                                        {isTestingKey ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-amber-400" />}
                                        <span>Tester</span>
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={handleSaveApiKey}
                                        className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-amber-600/30 flex items-center gap-1.5"
                                    >
                                        <Check className="w-4 h-4" />
                                        <span>Enregistrer</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Global Notifications */}
            {saveSuccessMessage && (
                <div className="max-w-7xl mx-auto px-4 mt-4 w-full">
                    <div className="bg-emerald-950/80 border border-emerald-500/50 rounded-2xl p-4 text-xs text-emerald-200 flex items-center justify-between shadow-lg shadow-emerald-950/40">
                        <div className="flex items-center gap-3">
                            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                            <span className="font-medium text-sm">{saveSuccessMessage}</span>
                        </div>
                        <Link 
                            to="/portail-audit" 
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3.5 py-1.5 rounded-lg transition-colors flex items-center gap-1 text-xs"
                        >
                            Ouvrir l'Audit <ExternalLink className="w-3 h-3" />
                        </Link>
                    </div>
                </div>
            )}

            {error && (
                <div className="max-w-7xl mx-auto px-4 mt-4 w-full">
                    <div className="bg-red-950/80 border border-red-500/50 rounded-2xl p-4 text-xs text-red-200 flex items-center gap-3 shadow-lg shadow-red-950/40">
                        <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                        <span>{error}</span>
                    </div>
                </div>
            )}

            {/* Main Body */}
            <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6">
                
                {/* TAB 1: FORMULAIRE D'INTÉGRATION AUDIT PORTAIL */}
                {activeTab === 'audit-form' && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        
                        {/* Left Col: AI Extractor & Specs Form */}
                        <div className="lg:col-span-7 space-y-6">
                            
                            {/* Card 1: AI Instant Extractor */}
                            <div className="bg-gradient-to-b from-neutral-900 to-neutral-900/80 border border-orange-500/30 rounded-2xl p-5 shadow-xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
                                
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-lg bg-orange-500/20 text-orange-400 flex items-center justify-center">
                                            <Wand2 className="w-4 h-4" />
                                        </div>
                                        <h3 className="font-bold text-sm text-neutral-100">Extraction IA Instantanée Fournisseur</h3>
                                    </div>
                                    <span className="text-[10px] text-orange-400 font-mono bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20">
                                        L-Shop / Printwear / Stanley
                                    </span>
                                </div>
                                <p className="text-xs text-neutral-400 mb-3">
                                    Collez ici la description brute, le tableau de caractéristiques ou le texte de la page produit fournisseur. Gemini remplira instantanément la fiche technique ci-dessous.
                                </p>
                                <textarea 
                                    value={supplierRawText}
                                    onChange={(e) => setSupplierRawText(e.target.value)}
                                    placeholder="Ex: Référence BYBB011 - Basic Tank Build Your Brand - 140 g/m² - 100% coton peigné - Tailles S à XXL - Col rond ras du cou - Prix HT 4.85€..."
                                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-xs text-neutral-200 placeholder:text-neutral-600 focus:border-orange-500 focus:outline-none min-h-[95px] resize-none font-mono"
                                />
                                <div className="mt-3 flex items-center justify-end">
                                    <button 
                                        onClick={handleExtractSupplierSpecs}
                                        disabled={isExtractingSpecs || !supplierRawText.trim()}
                                        className="bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-md shadow-orange-600/30 flex items-center gap-2 disabled:opacity-50"
                                    >
                                        {isExtractingSpecs ? (
                                            <>
                                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                                <span>Extraction par l'IA en cours...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles className="w-3.5 h-3.5" />
                                                <span>Auto-remplir la Fiche Technique</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Card 2: Detailed Technical Form */}
                            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xl space-y-5">
                                <h3 className="font-bold text-sm text-neutral-200 flex items-center gap-2 border-b border-neutral-800 pb-3">
                                    <Tag className="w-4 h-4 text-orange-400" />
                                    Données Produit & Pipeline Textile
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Title */}
                                    <div className="md:col-span-2">
                                        <label className="text-xs text-neutral-400 block mb-1 font-medium">Titre Commercial (Audit & Boutique)</label>
                                        <input 
                                            type="text"
                                            value={formProduct.title}
                                            onChange={(e) => setFormProduct({...formProduct, title: e.target.value})}
                                            placeholder="Ex: Débardeur Vision Room"
                                            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-xs text-neutral-200 focus:border-orange-500 focus:outline-none"
                                        />
                                    </div>

                                    {/* SKU */}
                                    <div>
                                        <label className="text-xs text-neutral-400 block mb-1 font-medium">SKU / Référence Unique</label>
                                        <input 
                                            type="text"
                                            value={formProduct.sku}
                                            onChange={(e) => setFormProduct({...formProduct, sku: e.target.value})}
                                            placeholder="Ex: BYBB011-BLK"
                                            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-xs text-neutral-200 font-mono focus:border-orange-500 focus:outline-none"
                                        />
                                    </div>

                                    {/* Supplier Ref */}
                                    <div>
                                        <label className="text-xs text-neutral-400 block mb-1 font-medium">Référence Fabricant</label>
                                        <input 
                                            type="text"
                                            value={formProduct.supplierRef}
                                            onChange={(e) => setFormProduct({...formProduct, supplierRef: e.target.value})}
                                            placeholder="Ex: BYBB011"
                                            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-xs text-neutral-200 font-mono focus:border-orange-500 focus:outline-none"
                                        />
                                    </div>

                                    {/* Brand */}
                                    <div>
                                        <label className="text-xs text-neutral-400 block mb-1 font-medium">Marque Textile Vierge</label>
                                        <input 
                                            type="text"
                                            value={formProduct.brand}
                                            onChange={(e) => setFormProduct({...formProduct, brand: e.target.value})}
                                            placeholder="Ex: Build Your Brand"
                                            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-xs text-neutral-200 focus:border-orange-500 focus:outline-none"
                                        />
                                    </div>

                                    {/* Supplier Name */}
                                    <div>
                                        <label className="text-xs text-neutral-400 block mb-1 font-medium">Fournisseur</label>
                                        <input 
                                            type="text"
                                            value={formProduct.supplierName}
                                            onChange={(e) => setFormProduct({...formProduct, supplierName: e.target.value})}
                                            placeholder="Ex: L-Shop-Team"
                                            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-xs text-neutral-200 focus:border-orange-500 focus:outline-none"
                                        />
                                    </div>

                                    {/* Garment Type */}
                                    <div>
                                        <label className="text-xs text-neutral-400 block mb-1 font-medium">Type de Gabarit / Vêtement</label>
                                        <select 
                                            value={formProduct.garmentType}
                                            onChange={(e: any) => setFormProduct({...formProduct, garmentType: e.target.value})}
                                            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-xs text-neutral-200 focus:border-orange-500 focus:outline-none"
                                        >
                                            <option value="tank_top">Débardeur / Sans manches (tank_top)</option>
                                            <option value="tshirt_oversize">T-Shirt Heavyweight Oversize (tshirt_oversize)</option>
                                            <option value="tshirt">T-Shirt Classique (tshirt)</option>
                                            <option value="polo">Polo Premium (polo)</option>
                                            <option value="sweat">Hoodie / Sweat (sweat)</option>
                                            <option value="business_card">Carte de Visite / Papeterie (business_card)</option>
                                        </select>
                                    </div>

                                    {/* Weight GSM */}
                                    <div>
                                        <label className="text-xs text-neutral-400 block mb-1 font-medium">Grammage (g/m²)</label>
                                        <input 
                                            type="number"
                                            value={formProduct.weightGsm || ''}
                                            onChange={(e) => setFormProduct({...formProduct, weightGsm: Number(e.target.value)})}
                                            placeholder="Ex: 140 ou 230"
                                            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-xs text-neutral-200 focus:border-orange-500 focus:outline-none"
                                        />
                                    </div>

                                    {/* Composition */}
                                    <div className="md:col-span-2">
                                        <label className="text-xs text-neutral-400 block mb-1 font-medium">Composition du Tissu</label>
                                        <input 
                                            type="text"
                                            value={formProduct.composition}
                                            onChange={(e) => setFormProduct({...formProduct, composition: e.target.value})}
                                            placeholder="Ex: 100% Coton peigné Ringspun"
                                            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-xs text-neutral-200 focus:border-orange-500 focus:outline-none"
                                        />
                                    </div>

                                    {/* Fit */}
                                    <div className="md:col-span-2">
                                        <label className="text-xs text-neutral-400 block mb-1 font-medium">Coupe / Finitions</label>
                                        <input 
                                            type="text"
                                            value={formProduct.fit}
                                            onChange={(e) => setFormProduct({...formProduct, fit: e.target.value})}
                                            placeholder="Ex: Coupe standard Regular fit avec col ras du cou"
                                            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-xs text-neutral-200 focus:border-orange-500 focus:outline-none"
                                        />
                                    </div>

                                    {/* Pricing HT */}
                                    <div>
                                        <label className="text-xs text-neutral-400 block mb-1 font-medium flex items-center gap-1">
                                            <Euro className="w-3 h-3 text-neutral-500" /> Prix d'Achat Fournisseur HT (€)
                                        </label>
                                        <input 
                                            type="number"
                                            step="0.01"
                                            value={formProduct.pricing.costPriceHt}
                                            onChange={(e) => setFormProduct({
                                                ...formProduct, 
                                                pricing: { ...formProduct.pricing, costPriceHt: Number(e.target.value) }
                                            })}
                                            placeholder="4.85"
                                            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-xs text-neutral-200 focus:border-orange-500 focus:outline-none"
                                        />
                                    </div>

                                    {/* Pricing TTC */}
                                    <div>
                                        <label className="text-xs text-neutral-400 block mb-1 font-medium flex items-center gap-1">
                                            <Euro className="w-3 h-3 text-neutral-500" /> Prix de Vente Cible TTC (€)
                                        </label>
                                        <input 
                                            type="number"
                                            step="0.01"
                                            value={formProduct.pricing.retailPriceTtc}
                                            onChange={(e) => setFormProduct({
                                                ...formProduct, 
                                                pricing: { ...formProduct.pricing, retailPriceTtc: Number(e.target.value) }
                                            })}
                                            placeholder="27.99"
                                            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-xs text-neutral-200 focus:border-orange-500 focus:outline-none"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Col: Mockups Upload, Preview & Final Button */}
                        <div className="lg:col-span-5 space-y-6">
                            
                            {/* Card 3: Mockups Images (Front & Back) */}
                            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xl space-y-4">
                                <h3 className="font-bold text-sm text-neutral-200 flex items-center gap-2 border-b border-neutral-800 pb-3">
                                    <Layers className="w-4 h-4 text-orange-400" />
                                    Mockups Gabarits (Face & Dos)
                                </h3>
                                <p className="text-xs text-neutral-400">
                                    Définissez les images sources du textile vierge détouré. Elles serviront de support direct pour la projection du logo.
                                </p>

                                {/* Front Mockup */}
                                <div>
                                    <label className="text-xs font-semibold text-neutral-300 block mb-2">Vue FACE (Chemin ou Upload)</label>
                                    <div className="flex gap-2">
                                        <input 
                                            type="text"
                                            value={formProduct.mockups.front}
                                            onChange={(e) => setFormProduct({
                                                ...formProduct,
                                                mockups: { ...formProduct.mockups, front: e.target.value }
                                            })}
                                            placeholder="/merch/visionroom/tank-front.png"
                                            className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl p-2 text-xs text-neutral-200 font-mono focus:border-orange-500 focus:outline-none"
                                        />
                                        <button 
                                            onClick={() => mockupFrontInputRef.current?.click()}
                                            className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-xl text-xs font-semibold"
                                        >
                                            Upload
                                        </button>
                                        <input 
                                            ref={mockupFrontInputRef}
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={(e) => e.target.files?.[0] && handleMockupUpload(e.target.files[0], 'front')}
                                        />
                                    </div>
                                    {formProduct.mockups.front && (
                                        <div className="mt-2 h-24 bg-neutral-950 rounded-xl border border-neutral-800 flex items-center justify-center p-2">
                                            <img src={formProduct.mockups.front} alt="Mockup Face" className="max-h-full max-w-full object-contain" />
                                        </div>
                                    )}
                                </div>

                                {/* Back Mockup */}
                                <div>
                                    <label className="text-xs font-semibold text-neutral-300 block mb-2">Vue DOS (Chemin ou Upload)</label>
                                    <div className="flex gap-2">
                                        <input 
                                            type="text"
                                            value={formProduct.mockups.back}
                                            onChange={(e) => setFormProduct({
                                                ...formProduct,
                                                mockups: { ...formProduct.mockups, back: e.target.value }
                                            })}
                                            placeholder="/merch/visionroom/tank-back.png"
                                            className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl p-2 text-xs text-neutral-200 font-mono focus:border-orange-500 focus:outline-none"
                                        />
                                        <button 
                                            onClick={() => mockupBackInputRef.current?.click()}
                                            className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-xl text-xs font-semibold"
                                        >
                                            Upload
                                        </button>
                                        <input 
                                            ref={mockupBackInputRef}
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={(e) => e.target.files?.[0] && handleMockupUpload(e.target.files[0], 'back')}
                                        />
                                    </div>
                                    {formProduct.mockups.back && (
                                        <div className="mt-2 h-24 bg-neutral-950 rounded-xl border border-neutral-800 flex items-center justify-center p-2">
                                            <img src={formProduct.mockups.back} alt="Mockup Dos" className="max-h-full max-w-full object-contain" />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Card 4: Action Button & Integration */}
                            <div className="bg-gradient-to-b from-neutral-900 to-neutral-900/90 border border-neutral-800 rounded-2xl p-6 shadow-xl space-y-4">
                                <div className="space-y-1">
                                    <h4 className="font-bold text-sm text-white">Validation & Déploiement Local</h4>
                                    <p className="text-xs text-neutral-400">
                                        Cette action injecte immédiatement le produit dans Firestore et le cache local de l'Audit Portail.
                                    </p>
                                </div>

                                <button 
                                    onClick={handleSaveToAuditPortal}
                                    disabled={isSavingProduct}
                                    className="w-full bg-gradient-to-r from-orange-600 via-amber-600 to-orange-500 hover:from-orange-500 hover:to-amber-500 text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-xl shadow-orange-600/30 flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                                >
                                    {isSavingProduct ? (
                                        <>
                                            <RefreshCw className="w-4 h-4 animate-spin" />
                                            <span>Enregistrement dans l'Audit...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="w-4 h-4" />
                                            <span>🚀 Intégrer à l'Audit Portail</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                    </div>
                )}

                {/* TAB 2: STUDIO MOCKUP IA */}
                {activeTab === 'ai-studio' && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        <div className="lg:col-span-5 space-y-5">
                            {/* Step 1: Garment Image */}
                            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-xl">
                                <div className="flex items-center justify-between mb-3">
                                    <label className="text-sm font-semibold flex items-center gap-2">
                                        <span className="w-6 h-6 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center text-xs font-bold">1</span>
                                        Image du Produit / Matière
                                    </label>
                                    {garmentImage && (
                                        <button 
                                            onClick={() => setGarmentImage(null)} 
                                            className="text-xs text-neutral-400 hover:text-red-400 transition-colors"
                                        >
                                            Changer
                                        </button>
                                    )}
                                </div>

                                {garmentImage ? (
                                    <div className="relative group rounded-xl overflow-hidden border border-neutral-700 bg-neutral-950 aspect-video flex items-center justify-center">
                                        <img src={garmentImage.previewUrl || garmentImage.base64} alt="Produit" className="max-h-full max-w-full object-contain" />
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <button 
                                                onClick={() => garmentInputRef.current?.click()}
                                                className="bg-white/20 hover:bg-white/30 backdrop-blur px-3 py-1.5 rounded-lg text-xs font-medium"
                                            >
                                                Remplacer l'image
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div 
                                        onClick={() => garmentInputRef.current?.click()}
                                        className="border-2 border-dashed border-neutral-700 hover:border-orange-500/60 rounded-xl p-6 text-center cursor-pointer transition-colors bg-neutral-950/50 hover:bg-neutral-950"
                                    >
                                        <Upload className="w-8 h-8 text-neutral-500 mx-auto mb-2 group-hover:text-orange-400" />
                                        <p className="text-xs font-medium text-neutral-300">Glissez ou cliquez pour charger un produit</p>
                                        <p className="text-[10px] text-neutral-500 mt-1">Photo de vêtement, tissu, texture ou modèle existant (PNG, JPG)</p>
                                    </div>
                                )}
                                <input 
                                    ref={garmentInputRef} 
                                    type="file" 
                                    accept="image/*" 
                                    className="hidden" 
                                    onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'garment')} 
                                />
                            </div>

                            {/* Step 2: Shape Template */}
                            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-xl">
                                <div className="flex items-center justify-between mb-3">
                                    <label className="text-sm font-semibold flex items-center gap-2">
                                        <span className="w-6 h-6 rounded-full bg-neutral-800 text-neutral-400 flex items-center justify-center text-xs font-bold">2</span>
                                        Gabarit de Référence / Silhouette (Optionnel)
                                    </label>
                                    {shapeReference && (
                                        <button 
                                            onClick={() => setShapeReference(null)} 
                                            className="text-xs text-neutral-400 hover:text-red-400 transition-colors"
                                        >
                                            Supprimer
                                        </button>
                                    )}
                                </div>

                                {shapeReference ? (
                                    <div className="relative group rounded-xl overflow-hidden border border-neutral-700 bg-neutral-950 aspect-video flex items-center justify-center">
                                        <img src={shapeReference.previewUrl || shapeReference.base64} alt="Gabarit" className="max-h-full max-w-full object-contain" />
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <button 
                                                onClick={() => templateInputRef.current?.click()}
                                                className="bg-white/20 hover:bg-white/30 backdrop-blur px-3 py-1.5 rounded-lg text-xs font-medium"
                                            >
                                                Remplacer
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div 
                                        onClick={() => templateInputRef.current?.click()}
                                        className="border-2 border-dashed border-neutral-800 hover:border-neutral-600 rounded-xl p-5 text-center cursor-pointer transition-colors bg-neutral-950/30 hover:bg-neutral-950/60"
                                    >
                                        <Layers className="w-6 h-6 text-neutral-500 mx-auto mb-1.5" />
                                        <p className="text-xs font-medium text-neutral-400">Ajouter un gabarit / contour de référence</p>
                                        <p className="text-[10px] text-neutral-500 mt-1">L'IA épousera strictement la silhouette de ce gabarit</p>
                                    </div>
                                )}
                                <input 
                                    ref={templateInputRef} 
                                    type="file" 
                                    accept="image/*" 
                                    className="hidden" 
                                    onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'template')} 
                                />
                            </div>

                            {/* Step 3: Options */}
                            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-xl space-y-4">
                                <label className="text-sm font-semibold flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-full bg-neutral-800 text-neutral-400 flex items-center justify-center text-xs font-bold">3</span>
                                    Options de Rendu
                                </label>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <span className="text-xs text-neutral-400 block mb-1.5 flex items-center gap-1.5">
                                            <Palette className="w-3.5 h-3.5 text-neutral-500" /> Couleur Dominante
                                        </span>
                                        <div className="flex items-center gap-2 bg-neutral-950 border border-neutral-800 rounded-xl p-2">
                                            <input 
                                                type="color" 
                                                value={selectedColor} 
                                                onChange={(e) => setSelectedColor(e.target.value)}
                                                className="w-7 h-7 rounded border-0 cursor-pointer bg-transparent"
                                            />
                                            <span className="text-xs font-mono text-neutral-300 uppercase">{selectedColor}</span>
                                        </div>
                                    </div>

                                    <div>
                                        <span className="text-xs text-neutral-400 block mb-1.5">Angle de Vue</span>
                                        <select 
                                            value={position}
                                            onChange={(e) => setPosition(e.target.value)}
                                            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-xs text-neutral-200 focus:border-orange-500 focus:outline-none"
                                        >
                                            <option value="Vue de Face (Front view)">Vue de Face</option>
                                            <option value="Vue de Dos (Back view)">Vue de Dos</option>
                                            <option value="Vue 3/4 Profil (Side profile)">Vue 3/4 Profil</option>
                                            <option value="Vue Porté / Mannequin Studio (Model studio shot)">Porté sur Mannequin</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Step 4: Prompt */}
                            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-xl space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-semibold flex items-center gap-2">
                                        <span className="w-6 h-6 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center text-xs font-bold">4</span>
                                        Instructions & Textures
                                    </label>
                                    <button 
                                        onClick={handleOptimizePrompt}
                                        disabled={isRefining || !prompt.trim()}
                                        className="text-xs text-orange-400 hover:text-orange-300 flex items-center gap-1 disabled:opacity-40 transition-opacity"
                                    >
                                        <Wand2 className={`w-3.5 h-3.5 ${isRefining ? 'animate-spin' : ''}`} />
                                        {isRefining ? "Optimisation..." : "Optimiser par IA"}
                                    </button>
                                </div>

                                <textarea 
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    placeholder="Ex: Coton lourd 350g/m², coutures renforcées, finition mate avec texture fine..."
                                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-xs text-neutral-200 placeholder:text-neutral-600 focus:border-orange-500 focus:outline-none min-h-[85px] resize-none"
                                />

                                <button 
                                    onClick={handleGenerate}
                                    disabled={isGenerating || !garmentImage}
                                    className="w-full bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-lg shadow-orange-600/30 flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {isGenerating ? (
                                        <>
                                            <RefreshCw className="w-4 h-4 animate-spin" />
                                            <span>Génération du produit en cours...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="w-4 h-4" />
                                            <span>Générer le Produit avec l'IA</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Right Col: Studio Result */}
                        <div className="lg:col-span-7 flex flex-col">
                            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xl flex-1 flex flex-col">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-base font-bold text-neutral-200 flex items-center gap-2">
                                        <Sparkles className="w-4 h-4 text-orange-400" />
                                        Rendu Produit Haute Définition
                                    </h3>
                                    {generatedImage && (
                                        <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2.5 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                                            <Check className="w-3 h-3" /> Prêt à être utilisé
                                        </span>
                                    )}
                                </div>

                                <div className="flex-1 min-h-[420px] bg-neutral-950 rounded-xl border border-neutral-800/80 flex items-center justify-center relative overflow-hidden group">
                                    {isGenerating ? (
                                        <div className="text-center p-8 space-y-3">
                                            <div className="w-14 h-14 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin mx-auto"></div>
                                            <p className="text-sm font-semibold text-neutral-300">Génération en cours avec Gemini 2.5 Image...</p>
                                        </div>
                                    ) : generatedImage ? (
                                        <img 
                                            src={generatedImage} 
                                            alt="Produit Généré" 
                                            className="max-h-[500px] max-w-full object-contain rounded-lg shadow-2xl transition-transform duration-300 group-hover:scale-105" 
                                        />
                                    ) : (
                                        <div className="text-center p-8 text-neutral-600 space-y-2">
                                            <Layers className="w-12 h-12 mx-auto text-neutral-700" />
                                            <p className="text-sm font-medium text-neutral-400">Aucun mockup généré</p>
                                            <p className="text-xs text-neutral-600 max-w-xs mx-auto">Chargez une image et cliquez sur « Générer le Produit avec l'IA ».</p>
                                        </div>
                                    )}
                                </div>

                                {generatedImage && (
                                    <div className="mt-4 pt-4 border-t border-neutral-800 flex flex-wrap items-center justify-between gap-3">
                                        <a 
                                            href={generatedImage} 
                                            download="signaid-productaid-mockup.png"
                                            className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold rounded-xl transition-colors flex items-center gap-2"
                                        >
                                            <Download className="w-4 h-4" /> Télécharger l'image
                                        </a>

                                        <button 
                                            onClick={() => {
                                                setFormProduct(prev => ({
                                                    ...prev,
                                                    mockups: { ...prev.mockups, front: generatedImage }
                                                }));
                                                setActiveTab('audit-form');
                                            }}
                                            className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2"
                                        >
                                            <Box className="w-4 h-4" /> Utiliser comme Mockup Face dans l'Audit
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 3: CATALOGUE ACTIF & EXPORT */}
                {activeTab === 'active-catalog' && (
                    <div className="space-y-6">
                        <div className="flex flex-wrap items-center justify-between gap-4 bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-xl">
                            <div>
                                <h3 className="font-bold text-base text-white flex items-center gap-2">
                                    <Box className="w-5 h-5 text-orange-400" />
                                    Produits Actifs dans l'Audit ({activeCatalog.length})
                                </h3>
                                <p className="text-xs text-neutral-400">
                                    Liste des références textiles et objets promotionnels synchronisés avec GenericAuditPage et ProductPortal.
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <button 
                                    onClick={handleCopyTsConfig}
                                    className="bg-neutral-800 hover:bg-neutral-700 text-neutral-200 px-4 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 border border-neutral-700"
                                >
                                    {copiedJson ? (
                                        <>
                                            <Check className="w-4 h-4 text-emerald-400" />
                                            <span className="text-emerald-400">JSON Copié !</span>
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="w-4 h-4" />
                                            <span>Copier JSON pour audit-portail.ts</span>
                                        </>
                                    )}
                                </button>
                                <Link 
                                    to="/portail-audit" 
                                    className="bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-orange-600/30"
                                >
                                    <Eye className="w-4 h-4" /> Ouvrir l'Audit Portail
                                </Link>
                            </div>
                        </div>

                        {/* Catalog Cards Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {activeCatalog.map((prod) => (
                                <div 
                                    key={prod.id} 
                                    className="bg-neutral-900 border border-neutral-800 hover:border-neutral-700 rounded-2xl overflow-hidden shadow-xl flex flex-col transition-all"
                                >
                                    {/* Mockup Previews */}
                                    <div className="bg-neutral-950 p-4 border-b border-neutral-800 grid grid-cols-2 gap-2 h-44">
                                        <div className="h-full flex items-center justify-center bg-neutral-900/50 rounded-xl p-2 relative">
                                            {prod.mockups?.front ? (
                                                <img src={prod.mockups.front} alt="Face" className="max-h-full max-w-full object-contain" />
                                            ) : (
                                                <span className="text-[10px] text-neutral-600">Pas de vue Face</span>
                                            )}
                                            <span className="absolute bottom-1 left-1.5 text-[9px] bg-black/70 px-1.5 py-0.5 rounded text-neutral-400">FACE</span>
                                        </div>
                                        <div className="h-full flex items-center justify-center bg-neutral-900/50 rounded-xl p-2 relative">
                                            {prod.mockups?.back ? (
                                                <img src={prod.mockups.back} alt="Dos" className="max-h-full max-w-full object-contain" />
                                            ) : (
                                                <span className="text-[10px] text-neutral-600">Pas de vue Dos</span>
                                            )}
                                            <span className="absolute bottom-1 left-1.5 text-[9px] bg-black/70 px-1.5 py-0.5 rounded text-neutral-400">DOS</span>
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                                        <div>
                                            <div className="flex items-center justify-between gap-2 mb-1">
                                                <span className="text-[10px] font-mono text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20">
                                                    {prod.sku}
                                                </span>
                                                <span className="text-[10px] text-neutral-400 bg-neutral-800 px-2 py-0.5 rounded">
                                                    {prod.brand}
                                                </span>
                                            </div>
                                            <h4 className="font-bold text-sm text-white">{prod.title}</h4>
                                            <p className="text-xs text-neutral-400 mt-1 line-clamp-2">{prod.composition} - {prod.weightGsm} g/m²</p>
                                        </div>

                                        <div className="pt-3 border-t border-neutral-800/80 flex items-center justify-between">
                                            <div>
                                                <span className="text-[10px] text-neutral-500 block">Prix Cible TTC</span>
                                                <span className="text-sm font-extrabold text-emerald-400">{prod.pricing?.retailPriceTtc?.toFixed(2)} €</span>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-[10px] text-neutral-500 block">Achat HT</span>
                                                <span className="text-xs font-medium text-neutral-300">{prod.pricing?.costPriceHt?.toFixed(2)} €</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between gap-2 pt-2">
                                            <button 
                                                onClick={() => {
                                                    setFormProduct(prod);
                                                    setActiveTab('audit-form');
                                                }}
                                                className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                                            >
                                                Modifier
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteProduct(prod.id, prod.title)}
                                                className="p-1.5 text-neutral-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                                title="Supprimer"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

            </main>
        </div>
    );
};

export default ProductAidView;