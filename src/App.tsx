import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { Shirt } from 'lucide-react';
import { auth } from './firebaseConfig';
import { AuthProvider } from './contexts/AuthContext';
import { logAnalyticsEvent, AnalyticsEvents } from './services/analyticsService';

import { Header } from './components/Header';
import { ProjectManagerModal } from './components/ProjectManagerModal';
import { AuthModal } from './components/AuthModal';
import { StudioComposer } from './components/StudioComposer';
import { FlyerPosterRenderer } from './components/FlyerPosterRenderer';
import { MerchPreview } from './components/MerchPreview';
import { PremiumChatWidget } from './components/PremiumChatWidget';
import { CookieConsent } from './components/CookieConsent';
import { RequirePremium } from './components/RequirePremium';
import { GenericSkeleton } from './components/Skeletons';

import {
    EventInput,
    createBlankEventInput,
    DEFAULT_STUDIO_DATA,
    initialEventInput,
    resetLogoTransformForFormat,
} from './types';

// Helper for safe lazy loading (reloads on chunk failure after new deployments)
const safeLazy = (importFn: () => Promise<any>) =>
    lazy(async () => {
        try {
            return await importFn();
        } catch (err: any) {
            const errMsg = String(err?.message || err || '');
            const isChunkError =
                errMsg.includes('dynamically imported module') ||
                errMsg.includes('Loading chunk') ||
                errMsg.includes('Failed to fetch') ||
                errMsg.includes('Importing a module script failed') ||
                errMsg.includes('CSS_CHUNK_LOAD_FAILED');

            const lastReload = parseInt(sessionStorage.getItem('safe_lazy_reload') || '0', 10);
            const now = Date.now();

            if (isChunkError && (now - lastReload > 8000)) {
                sessionStorage.setItem('safe_lazy_reload', String(now));
                window.location.reload();
                return new Promise(() => { });
            }
            throw err;
        }
    });

// 1. IMPORTS DES MODULES PRINCIPAUX (CODE SPLITTING SÉCURISÉ)
const LandingPage = safeLazy(() => import('./pages/LandingPage').catch(() => import('./LandingPage')));
const DropperLanding = safeLazy(() => import('./pages/DropperLanding'));
const BrandOnboardingForm = safeLazy(() => import('./components/BrandOnboardingForm'));
const AdminView = safeLazy(() => import('./pages/AdminDashboard').catch(() => import('./components/AdminView').then(m => ({ default: (m as any).AdminView || (m as any).default || m }))));
const CustomizerView = safeLazy(() => import('./pages/MerchCustomizer').catch(() => import('./CustomizerApp')).catch(() => import('./components/CustomizerView').then(m => ({ default: (m as any).CustomizerView || (m as any).default || m }))));
const LiveHub = safeLazy(() => import('./pages/LiveHub').catch(() => import('./PortalPage')));
const ArtistProfileView = safeLazy(() => import('./components/ArtistProfileView'));

// Modules secondaires & utilitaires
const BtpLandingPage = safeLazy(() => import('./BtpLandingPage'));
const GenericAuditPage = safeLazy(() => import('./GenericAuditPage'));
const CustomizerApp = safeLazy(() => import('./CustomizerApp'));
const FlyerPage = safeLazy(() => import('./components/FlyerPage'));
const ConditionsGeneralesPage = safeLazy(() => import('./components/LegalPages').then(m => ({ default: (m as any).ConditionsGenerales })));
const ConfidentialitePage = safeLazy(() => import('./components/LegalPages').then(m => ({ default: (m as any).Confidentialite })));
const CookiesPage = safeLazy(() => import('./components/LegalPages').then(m => ({ default: (m as any).CookiesPage })));
const BlogPage = safeLazy(() => import('./components/BlogPage'));
const BlogPageGeometry = safeLazy(() => import('./components/BlogPageGeometry'));
const BlogDesignStyle = safeLazy(() => import('./components/BlogDesignStyle'));
const BlogBrandAsset = safeLazy(() => import('./components/BlogBrandAsset'));
const BlogIndex = safeLazy(() => import('./components/BlogIndex'));
const ProductPortal = safeLazy(() => import('./ProductPortal'));
const PortalPage = safeLazy(() => import('./PortalPage'));
const ProfileRedirect = safeLazy(() => import('./components/ProfileRedirect'));
const ProductAidView = safeLazy(() => import('./components/ProductAidView'));

const LoadingSpinner = () => <GenericSkeleton />;

const ScrollToTop = () => {
    const { pathname } = useLocation();

    useEffect(() => {
        window.scrollTo(0, 0);
        logAnalyticsEvent(AnalyticsEvents.PAGE_VIEW, { page_path: pathname });
    }, [pathname]);

    return null;
};

// 2. GARDE D'EXCLUSION SUR LA ROUTE RACINE /:slug
// Slugs système réservés ne devant JAMAIS être interceptés par ArtistProfileView
const RESERVED = ['studio', 'admin', 'creer-profil', 'customizer', 'dropper', 'hub', 'api', 'assets', 'login', 'shop', 'audit'];

/**
 * Route dynamique /:slug pour les profils vitrines d'artistes (ex: signaid.eu/aaronh)
 * - Exclut strictement les slugs système réservés (redirige vers / si réservé)
 * - Monte TOUJOURS ArtistProfileView avec le paramètre slug
 * - Conserve la priorité absolue aux photos réelles (tshirtPreviewImages)
 * - Interdiction stricte de monter StudioComposer sur cette route
 */
function DynamicArtistProfileRoute() {
    const { slug } = useParams<{ slug: string }>();
    const cleanSlug = (slug || '').toLowerCase().trim();

    // Si le slug est réservé ou vide, ne pas intercepter comme profil vitrine
    if (!cleanSlug || RESERVED.includes(cleanSlug)) {
        return <Navigate to="/" replace />;
    }

    // Monter STRICTEMENT ArtistProfileView avec le paramètre slug
    // Conserver la priorité absolue aux photos réelles (tshirtPreviewImages)
    // Interdiction stricte de monter StudioComposer sur cette route
    return <ArtistProfileView overrideSlug={cleanSlug} />;
}

/**
 * Route /studio et /studio/:slug
 * Restaure l'architecture Studio Desktop à double colonne :
 * - Colonne gauche/centrale (Desktop ≥ 920px) : Canvas interactif temps réel FlyerPosterRenderer
 *   avec switcher de formats (Post, Story, Bannière, A3) et cadrage proportionnel strict.
 * - Colonne droite (ou plein écran mobile) : StudioComposer (volet d'accordéons et réglages).
 */
function StudioComposerRoute() {
    const { slug } = useParams<{ slug?: string }>();
    const [input, setInput] = useState<EventInput>(() => {
        try {
            return createBlankEventInput(slug || '');
        } catch {
            return (DEFAULT_STUDIO_DATA as any) || (initialEventInput as any) || {};
        }
    });

    const [previewFormat, setPreviewFormat] = useState<'post' | 'a3' | 'story' | 'banner' | 'tshirt'>('post');
    const [isProjectsOpen, setIsProjectsOpen] = useState<boolean>(false);
    const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);
    const [activeTab, setActiveTab] = useState<'generator' | 'checkout' | 'workshop' | 'prospecting'>('generator');
    const [activeSection, setActiveSection] = useState<any>('decor');

    const [isDayMode, setIsDayMode] = useState<boolean>(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('signaid_studio_daymode') === 'true';
        }
        return false;
    });

    const handleToggleDayMode = useCallback(() => {
        setIsDayMode((prev) => {
            const next = !prev;
            if (typeof window !== 'undefined') {
                localStorage.setItem('signaid_studio_daymode', String(next));
                document.documentElement.classList.toggle('dark', !next);
            }
            return next;
        });
    }, []);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            document.documentElement.classList.toggle('dark', !isDayMode);
        }
    }, [isDayMode]);

    const getAspectRatio = (fmt: string): string => {
        switch (fmt) {
            case 'story':
                return '9 / 16';
            case 'banner':
                return '16 / 9';
            case 'a3':
                return '1 / 1.414';
            case 'tshirt':
            case 'post':
            default:
                return '1 / 1';
        }
    };

    const handleUpdateTransform = useCallback((newScale: number, newOffsetY: number) => {
        setInput((prev) => ({
            ...prev,
            djPhotoScale: newScale,
            djPhotoOffsetY: newOffsetY,
            formatTransforms: {
                ...(prev.formatTransforms || {}),
                [previewFormat]: {
                    ...((prev.formatTransforms || {})[previewFormat] || {}),
                    scale: newScale,
                    offsetY: newOffsetY,
                    isCustom: true,
                },
            },
        }));
    }, [previewFormat]);

    const handleResetFormatToMaster = useCallback(() => {
        setInput((prev) => resetLogoTransformForFormat(prev, previewFormat));
    }, [previewFormat]);

    const handleUpdateSubjectPosition = useCallback((pos: { x: number; y: number }) => {
        setInput((prev) => {
            const existing = prev.formatTransforms?.[previewFormat];
            return {
                ...prev,
                djPhotoOffsetX: pos.x,
                djPhotoOffsetY: pos.y,
                subjectPositionX: pos.x,
                subjectPositionY: pos.y,
                formatTransforms: {
                    ...(prev.formatTransforms || {}),
                    [previewFormat]: {
                        ...(existing || {}),
                        scale: existing?.scale ?? prev.djPhotoScale ?? 1.0,
                        offsetX: pos.x,
                        offsetY: pos.y,
                        isCustom: true,
                    },
                },
            };
        });
    }, [previewFormat]);

    const FORMAT_OPTIONS = [
        { key: 'post', label: 'Post (1:1)' },
        { key: 'story', label: 'Story (9:16)' },
        { key: 'banner', label: 'Bannière (16:9)' },
        { key: 'a3', label: 'Flyer' },
    ] as const;

    return (
        <div className={`h-screen w-full ${isDayMode ? 'bg-zinc-100 text-zinc-900' : 'bg-zinc-950 text-white'} flex flex-col overflow-hidden`}>
            {/* 1. VRAIE BARRE DE NAVIGATION DU HAUT ORIGINALE */}
            <Header
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                isDayMode={isDayMode}
                onToggleDayMode={handleToggleDayMode}
                onOpenProjects={() => setIsProjectsOpen(true)}
                onOpenAuthModal={() => setIsAuthOpen(true)}
            />

            {/* 2. ESPACE DE TRAVAIL : GAUCHE = RÉGLAGES, DROITE = VISUEL */}
            <div className="flex-1 w-full flex flex-col min-[920px]:flex-row min-h-0 overflow-hidden">
                {/* COLONNE GAUCHE : Panneau Accordéons & Réglages StudioComposer (Fixe et stable lors du changement de format) */}
                <aside className={`w-full min-[920px]:w-[440px] lg:w-[480px] xl:w-[520px] shrink-0 flex-none border-b min-[920px]:border-b-0 min-[920px]:border-r ${isDayMode ? 'border-zinc-300 bg-white/95 text-zinc-900' : 'border-zinc-800/80 bg-zinc-900/40 text-white'} min-h-0 overflow-y-auto p-4 sm:p-6 order-2 min-[920px]:order-1`}>
                    <StudioComposer
                        input={input}
                        setInput={setInput}
                        previewFormat={previewFormat}
                        onSelectFormat={setPreviewFormat}
                        onUpdateTransform={handleUpdateTransform}
                        onResetFormatToMaster={handleResetFormatToMaster}
                        isUnlocked={true}
                        isDayMode={isDayMode}
                        onActiveSectionChange={setActiveSection}
                        onTriggerPayment={() => { }}
                    />
                </aside>

                {/* COLONNE DROITE : Canvas Interactif Desktop */}
                <main className={`flex-1 min-w-0 min-h-0 flex flex-col items-center justify-center p-6 lg:p-8 ${isDayMode ? 'bg-zinc-200/60' : 'bg-zinc-950/80'} overflow-y-auto relative select-none order-1 min-[920px]:order-2`}>
                    <div className="w-full max-w-2xl flex flex-col items-center justify-center my-auto">
                        {/* Sélecteur de format rapide au-dessus du canvas */}
                        <div className={`mb-4 flex items-center gap-1 ${isDayMode ? 'bg-white border-zinc-300' : 'bg-zinc-950 border-zinc-800'} border rounded-xl p-1 text-xs font-mono shadow-lg`}>
                            {FORMAT_OPTIONS.map((fmt) => (
                                <button
                                    key={fmt.key}
                                    type="button"
                                    onClick={() => setPreviewFormat(fmt.key)}
                                    className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer uppercase ${previewFormat === fmt.key
                                            ? (isDayMode ? 'bg-zinc-900 text-lime-400 shadow-sm' : 'bg-zinc-800 text-lime-400 shadow-sm')
                                            : (isDayMode ? 'text-zinc-600 hover:text-black' : 'text-zinc-400 hover:text-white')
                                        }`}
                                >
                                    {fmt.label}
                                </button>
                            ))}
                            <button
                                type="button"
                                onClick={() => setPreviewFormat('tshirt')}
                                className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer uppercase flex items-center gap-1.5 ${
                                    previewFormat === 'tshirt'
                                        ? (isDayMode ? 'bg-zinc-900 text-lime-400 shadow-sm' : 'bg-zinc-800 text-lime-400 shadow-sm')
                                        : (isDayMode ? 'text-zinc-600 hover:text-black' : 'text-zinc-400 hover:text-white')
                                }`}
                                title="Aperçu des maquettes vêtements Stand Merch"
                            >
                                <Shirt className="w-3.5 h-3.5" />
                                <span>Stand Merch</span>
                            </button>
                        </div>

                        {/* Conteneur d'affiche avec ratio d'aspect dynamique */}
                        <div
                            className={`relative w-full rounded-2xl overflow-hidden border ${isDayMode ? 'border-zinc-300 bg-white' : 'border-zinc-800 bg-zinc-900'} shadow-2xl flex items-center justify-center transition-all duration-300`}
                            style={{
                                aspectRatio: getAspectRatio(previewFormat),
                                maxHeight: 'calc(100vh - 180px)',
                            }}
                        >
                            {previewFormat === 'tshirt' ? (
                                <div className="w-full h-full p-2 flex items-center justify-center">
                                    <MerchPreview
                                        input={input}
                                        interactive={true}
                                        onPlacementChange={(placement, side) => {
                                            setInput((prev) => ({
                                                ...prev,
                                                ...(side === 'back'
                                                    ? { tshirtBackPlacement: placement, tshirtBackLogoScale: placement.scale }
                                                    : { tshirtFrontPlacement: placement, tshirtLogoScale: placement.scale }
                                                ),
                                            }));
                                        }}
                                        showSideToggle={true}
                                        showViewToggle={true}
                                    />
                                </div>
                            ) : (
                                <FlyerPosterRenderer
                                    projectData={input}
                                    setInput={setInput}
                                    format={previewFormat}
                                    isInteractive={true}
                                    activeSection={activeSection}
                                    onVisualElementClick={(section) => {
                                        if (section) setActiveSection(section as any);
                                    }}
                                    onUpdateSubjectPosition={handleUpdateSubjectPosition}
                                    layoutTemplate={input.layoutTemplate || 'duality_campaign'}
                                    templateData={input.templateData}
                                />
                            )}
                        </div>

                        {/* Légende sous le canvas */}
                        <div className={`mt-4 flex items-center justify-between w-full px-2 text-xs font-mono ${isDayMode ? 'text-zinc-600' : 'text-zinc-500'}`}>
                            <span>Format actif : <strong className={`${isDayMode ? 'text-zinc-900' : 'text-zinc-300'} uppercase`}>{previewFormat === 'a3' ? 'Flyer' : previewFormat}</strong></span>
                            <span>Aperçu interactif haute fidélité</span>
                        </div>
                    </div>
                </main>
            </div>

            {/* 3. MODALES NATIVES (Projets & Authentification) */}
            {isProjectsOpen && (
                <ProjectManagerModal
                    isOpen={isProjectsOpen}
                    onClose={() => setIsProjectsOpen(false)}
                    currentInput={input}
                    onLoadProject={(loadedInput: EventInput) => {
                        if (loadedInput) {
                            setInput(loadedInput);
                        }
                        setIsProjectsOpen(false);
                    }}
                />
            )}

            {isAuthOpen && (
                <AuthModal
                    isOpen={isAuthOpen}
                    onClose={() => setIsAuthOpen(false)}
                    onSuccess={() => setIsAuthOpen(false)}
                />
            )}
        </div>
    );
}

export default function App() {
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (!user) {
                try {
                    await signInAnonymously(auth);
                } catch (err) {
                    console.warn("[App] Initial anonymous signIn notice:", err);
                }
            }
        });
        return () => unsubscribe();
    }, []);

    const hostname = typeof window !== 'undefined' ? window.location.hostname.toLowerCase() : '';
    const isDjdfazzDomain = hostname.includes('djdfazz');

    if (isDjdfazzDomain) {
        return (
            <BrowserRouter>
                <ScrollToTop />
                <AuthProvider>
                    <Suspense fallback={<LoadingSpinner />}>
                        <Routes>
                            <Route path="*" element={<ArtistProfileView overrideSlug="djdfazz" />} />
                        </Routes>
                    </Suspense>
                </AuthProvider>
            </BrowserRouter>
        );
    }

    return (
        <BrowserRouter>
            <ScrollToTop />
            <AuthProvider>
                <Suspense fallback={<LoadingSpinner />}>
                    <Routes>
                        {/* ======================================================== */}
                        {/* 3. ORDONNANCEMENT STRICT DES ROUTES PRINCIPALES         */}
                        {/* ======================================================== */}

                        {/* / ➔ LandingPage */}
                        <Route path="/" element={<LandingPage />} />

                        {/* /dropper ➔ DropperLanding */}
                        <Route path="/dropper" element={<DropperLanding />} />

                        {/* /studio et /studio/:slug ➔ StudioComposer */}
                        <Route path="/studio" element={<StudioComposerRoute />} />
                        <Route path="/studio/:slug" element={<StudioComposerRoute />} />

                        {/* /creer-profil ➔ BrandOnboardingForm */}
                        <Route path="/creer-profil" element={<BrandOnboardingForm />} />
                        <Route path="/onboarding" element={<BrandOnboardingForm />} />
                        <Route path="/nouveau-profil" element={<BrandOnboardingForm />} />

                        {/* /admin ➔ AdminView */}
                        <Route path="/admin" element={<AdminView />} />
                        <Route path="/admin-dashboard" element={<Navigate to="/admin" replace />} />
                        <Route path="/vitrine-admin" element={<AdminView />} />
                        <Route path="/vitrine-admin/dashboard" element={<Navigate to="/admin" replace />} />

                        {/* /customizer ➔ CustomizerView */}
                        <Route path="/customizer" element={<CustomizerView />} />
                        <Route path="/customizer/:slug" element={<CustomizerView />} />
                        <Route path="/merch" element={<CustomizerView />} />
                        <Route path="/merch/:slug" element={<CustomizerView />} />

                        {/* /hub/:slug ➔ LiveHub */}
                        <Route path="/hub/:slug" element={<LiveHub />} />
                        <Route path="/hub" element={<LiveHub slug="portail-interactif-signaid" />} />
                        <Route path="/e/:slug" element={<LiveHub />} />
                        <Route path="/event/:slug" element={<LiveHub />} />

                        {/* ======================================================== */}
                        {/* ROUTES SECONDAIRES & ANCIENNES REDIRECTIONS              */}
                        {/* ======================================================== */}
                        <Route path="/demo-vitrine" element={<Navigate to="/" replace />} />

                        {/* BTP & Audits */}
                        <Route path="/btp" element={<LandingPage />} />
                        <Route path="/btp-audit" element={<BtpLandingPage />} />
                        <Route path="/portail-audit" element={<GenericAuditPage />} />
                        <Route path="/audit-8f198p5" element={<GenericAuditPage />} />
                        <Route path="/audit-:auditId" element={<GenericAuditPage />} />
                        <Route path="/audit/:auditId" element={<GenericAuditPage />} />
                        <Route path="/audit" element={<GenericAuditPage />} />
                        <Route path="/portail-shop" element={<ProductPortal />} />
                        <Route path="/preview/:previewId" element={<ProductPortal />} />

                        {/* Portails & Dotation */}
                        <Route path="/portal" element={<PortalPage />} />
                        <Route path="/portal-dotation" element={<ProductPortal />} />

                        {/* ProductAid Studio */}
                        <Route path="/productaid" element={<ProductAidView />} />
                        <Route path="/product-aid" element={<Navigate to="/productaid" replace />} />

                        {/* Galerie & Panier */}
                        <Route path="/galerie" element={<CustomizerApp />} />
                        <Route path="/panier" element={<CustomizerApp />} />
                        <Route path="/profil" element={<ProfileRedirect />} />
                        <Route path="/recompense" element={<CustomizerApp />} />
                        <Route path="/creation" element={<RequirePremium><CustomizerApp /></RequirePremium>} />
                        <Route path="/creation/:productType" element={<RequirePremium><CustomizerApp /></RequirePremium>} />
                        <Route path="/creation/:productType/:postId" element={<CustomizerApp />} />
                        <Route path="/remix/:postId" element={<CustomizerApp />} />
                        <Route path="/s/:shortId" element={<CustomizerApp />} />
                        <Route path="/contact" element={<CustomizerApp />} />

                        {/* Flyers Dédiés */}
                        <Route path="/inthedark" element={<FlyerPage overrideSlug="inthedark" />} />
                        <Route path="/in-the-dark" element={<FlyerPage overrideSlug="inthedark" />} />
                        <Route path="/raveoldschool" element={<FlyerPage overrideSlug="raveoldschool" />} />
                        <Route path="/rave-old-school" element={<Navigate to="/raveoldschool" replace />} />
                        <Route path="/13ansvr" element={<FlyerPage overrideSlug="13ansvr" />} />
                        <Route path="/13ans-vr" element={<Navigate to="/13ansvr" replace />} />
                        <Route path="/courriere11-14" element={<FlyerPage overrideSlug="courriere11-14" />} />
                        <Route path="/courriere" element={<FlyerPage overrideSlug="courriere11-14" />} />
                        <Route path="/electronicwood" element={<FlyerPage overrideSlug="electronicwood" />} />
                        <Route path="/electronic-wood" element={<Navigate to="/electronicwood" replace />} />
                        <Route path="/flyer" element={<FlyerPage />} />
                        <Route path="/flyer/:flyerSlug" element={<FlyerPage />} />
                        <Route path="/flyer-inthedark" element={<FlyerPage overrideSlug="inthedark" />} />
                        <Route path="/flyer-13ansvr" element={<FlyerPage overrideSlug="13ansvr" />} />
                        <Route path="/flyer-courriere" element={<FlyerPage overrideSlug="courriere11-14" />} />
                        <Route path="/flyer-electronicwood" element={<FlyerPage overrideSlug="electronicwood" />} />

                        {/* Mentions Légales & Pages d'information */}
                        <Route path="/conditions-generales" element={<ConditionsGeneralesPage />} />
                        <Route path="/confidentialite" element={<ConfidentialitePage />} />
                        <Route path="/cookies" element={<CookiesPage />} />

                        {/* Articles de Blog */}
                        <Route path="/blog" element={<BlogIndex />} />
                        <Route path="/blog/ia-imprimerie" element={<BlogPage />} />
                        <Route path="/blog/analyse-geometrique" element={<BlogPageGeometry />} />
                        <Route path="/blog/style-accessible-vs-pro" element={<BlogDesignStyle />} />
                        <Route path="/blog/logo-generique-danger" element={<BlogBrandAsset />} />

                        {/* Routes personnalisées d'audit et shop */}
                        <Route path="/portail-shop/:slug" element={<ProductPortal />} />
                        <Route path="/portail-audit/:slug" element={<GenericAuditPage />} />
                        <Route path="/:slug/audit" element={<GenericAuditPage />} />
                        <Route path="/:slug/shop" element={<ProductPortal />} />

                        {/* ======================================================== */}
                        {/* ROUTE DYNAMIQUE /:SLUG POUR VITRINES ARTISTES            */}
                        {/* En DERNIER avant le repli 404 (*)                        */}
                        {/* ======================================================== */}
                        <Route path="/:slug" element={<DynamicArtistProfileRoute />} />

                        {/* ======================================================== */}
                        {/* REPLI 404 ÉPURÉ                                          */}
                        {/* ======================================================== */}
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </Suspense>
                <PremiumChatWidget />
            </AuthProvider>
            <CookieConsent />
        </BrowserRouter>
    );
}