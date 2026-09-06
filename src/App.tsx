import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect, lazy, Suspense } from 'react';
import { logAnalyticsEvent, AnalyticsEvents } from './services/analyticsService';
import { PremiumChatWidget } from './components/PremiumChatWidget';
import { CookieConsent } from './components/CookieConsent';
import { RequirePremium } from './components/RequirePremium';

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
        return new Promise(() => {});
      }
      throw err;
    }
  });

// CODE SPLITTING: Lazy load heavy components to reduce initial bundle
const LandingPage = safeLazy(() => import('./LandingPage'));
const BtpLandingPage = safeLazy(() => import('./BtpLandingPage'));
const GenericAuditPage = safeLazy(() => import('./GenericAuditPage'));
const CustomizerApp = safeLazy(() => import('./CustomizerApp'));
const FlyerPage = safeLazy(() => import('./components/FlyerPage'));
const ConditionsGeneralesPage = safeLazy(() => import('./components/LegalPages').then(m => ({ default: m.ConditionsGenerales })));
const ConfidentialitePage = safeLazy(() => import('./components/LegalPages').then(m => ({ default: m.Confidentialite })));
const CookiesPage = safeLazy(() => import('./components/LegalPages').then(m => ({ default: m.CookiesPage })));
const BlogPage = safeLazy(() => import('./components/BlogPage'));
const BlogPageGeometry = safeLazy(() => import('./components/BlogPageGeometry'));
const BlogDesignStyle = safeLazy(() => import('./components/BlogDesignStyle'));
const BlogBrandAsset = safeLazy(() => import('./components/BlogBrandAsset'));
const BlogIndex = safeLazy(() => import('./components/BlogIndex'));
const ProductPortal = safeLazy(() => import('./ProductPortal'));
const PortalPage = safeLazy(() => import('./PortalPage'));
const PreviewPage = safeLazy(() => import('./components/PreviewPage'));
const ProfileRedirect = safeLazy(() => import('./components/ProfileRedirect'));
const ArtistProfileView = safeLazy(() => import('./components/ArtistProfileView'));
const BrandOnboardingForm = safeLazy(() => import('./components/BrandOnboardingForm'));
const VitrineHome = safeLazy(() => import('./app/page'));
const VitrineLogin = safeLazy(() => import('./app/vitrine-admin/page'));
const VitrineDashboard = safeLazy(() => import('./app/vitrine-admin/dashboard/page'));
const ProductAidView = safeLazy(() => import('./components/ProductAidView'));
import { GenericSkeleton } from './components/Skeletons';

const LoadingSpinner = () => <GenericSkeleton />;

const ScrollToTop = () => {
    const { pathname } = useLocation();

    useEffect(() => {
        window.scrollTo(0, 0);
        logAnalyticsEvent(AnalyticsEvents.PAGE_VIEW, { page_path: pathname });
    }, [pathname]);

    return null;
};

export default function App() {
    const hostname = typeof window !== 'undefined' ? window.location.hostname.toLowerCase() : '';
    const isDjdfazzDomain = hostname.includes('djdfazz');

    if (isDjdfazzDomain) {
        return (
            <BrowserRouter>
                <ScrollToTop />
                <Suspense fallback={<LoadingSpinner />}>
                    <Routes>
                        <Route path="*" element={<ArtistProfileView overrideSlug="djdfazz" />} />
                    </Routes>
                </Suspense>
            </BrowserRouter>
        );
    }

    return (
        <BrowserRouter>
            <ScrollToTop />
            <Suspense fallback={<LoadingSpinner />}>
                <Routes>
                    <Route path="/" element={<VitrineHome />} />
                    <Route path="/demo-vitrine" element={<Navigate to="/" replace />} />
                    
                    {/* AUTONOMOUS BRAND ONBOARDING ROUTES */}
                    <Route path="/creer-profil" element={<BrandOnboardingForm />} />
                    <Route path="/onboarding" element={<BrandOnboardingForm />} />
                    <Route path="/nouveau-profil" element={<BrandOnboardingForm />} />
                    
                    {/* BTP SPECIFIC ROUTES */}
                    <Route path="/btp" element={<LandingPage />} />
                    <Route path="/btp-audit" element={<BtpLandingPage />} />
                    <Route path="/portail-audit" element={<GenericAuditPage />} />
                    <Route path="/audit-8f198p5" element={<GenericAuditPage />} />
                    <Route path="/audit-:auditId" element={<GenericAuditPage />} />
                    <Route path="/audit/:auditId" element={<GenericAuditPage />} />
                    <Route path="/portail-shop" element={<ProductPortal />} />
                    <Route path="/preview/:previewId" element={<ProductPortal />} />
                    
                    <Route path="/portal" element={<PortalPage />} />
                    <Route path="/portal-dotation" element={<ProductPortal />} />

                    {/* UNIQUE VITRINE ADMIN ROUTE (signaid.eu/vitrine-admin) */}
                    <Route path="/vitrine-admin" element={<VitrineDashboard />} />
                    <Route path="/vitrine-admin/dashboard" element={<Navigate to="/vitrine-admin" replace />} />
                    <Route path="/admin-dashboard" element={<Navigate to="/vitrine-admin" replace />} />
                    <Route path="/admin" element={<Navigate to="/vitrine-admin" replace />} />
                    
                    {/* PRODUCTAID & AUDIT PIPELINE STUDIO (signaid.eu/productaid) */}
                    <Route path="/productaid" element={<ProductAidView />} />
                    <Route path="/product-aid" element={<Navigate to="/productaid" replace />} />
                    
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
                    
                    <Route path="/inthedark" element={<FlyerPage overrideSlug="inthedark" />} />
                    <Route path="/in-the-dark" element={<FlyerPage overrideSlug="inthedark" />} />
                    
                    {/* Flyer Rave Old School */}
                    <Route path="/raveoldschool" element={<FlyerPage overrideSlug="raveoldschool" />} />
                    <Route path="/rave-old-school" element={<Navigate to="/raveoldschool" replace />} />
                    
                    {/* Flyer 13 Ans de Vision Room */}
                    <Route path="/13ansvr" element={<FlyerPage overrideSlug="13ansvr" />} />
                    <Route path="/13ans-vr" element={<Navigate to="/13ansvr" replace />} />
                    
                    {/* Flyer Kermesse de Courrière */}
                    <Route path="/courriere11-14" element={<FlyerPage overrideSlug="courriere11-14" />} />
                    <Route path="/courriere" element={<FlyerPage overrideSlug="courriere11-14" />} />
                    
                    {/* Flyer Electronic Wood */}
                    <Route path="/electronicwood" element={<FlyerPage overrideSlug="electronicwood" />} />
                    <Route path="/electronic-wood" element={<Navigate to="/electronicwood" replace />} />
                    
                    <Route path="/flyer" element={<FlyerPage />} />
                    <Route path="/flyer/:flyerSlug" element={<FlyerPage />} />
                    <Route path="/flyer-inthedark" element={<FlyerPage overrideSlug="inthedark" />} />
                    <Route path="/flyer-13ansvr" element={<FlyerPage overrideSlug="13ansvr" />} />
                    <Route path="/flyer-courriere" element={<FlyerPage overrideSlug="courriere11-14" />} />
                    <Route path="/flyer-electronicwood" element={<FlyerPage overrideSlug="electronicwood" />} />
                    
                    <Route path="/conditions-generales" element={<ConditionsGeneralesPage />} />
                    <Route path="/confidentialite" element={<ConfidentialitePage />} />
                    <Route path="/cookies" element={<CookiesPage />} />
                    
                    <Route path="/blog" element={<BlogIndex />} />
                    <Route path="/blog/ia-imprimerie" element={<BlogPage />} />
                    <Route path="/blog/analyse-geometrique" element={<BlogPageGeometry />} />
                    <Route path="/blog/style-accessible-vs-pro" element={<BlogDesignStyle />} />
                    <Route path="/blog/logo-generique-danger" element={<BlogBrandAsset />} />
                    
                    {/* CUSTOM SLUG ROUTES FOR AUDIT AND SHOP (ex: /portail-shop/aaronh, /portail-audit/aaronh, /aaronh/shop, /aaronh/audit) */}
                    <Route path="/portail-shop/:slug" element={<ProductPortal />} />
                    <Route path="/portail-audit/:slug" element={<GenericAuditPage />} />
                    <Route path="/:slug/audit" element={<GenericAuditPage />} />
                    <Route path="/:slug/shop" element={<ProductPortal />} />

                    {/* DYNAMIC ARTIST SLUG ROUTE (ex: signaid.eu/aaronh, signaid.eu/thementalist, signaid.eu/djdfazz) */}
                    <Route path="/:slug" element={<ArtistProfileView />} />
                </Routes>
            </Suspense>
            <PremiumChatWidget />
            <CookieConsent />
        </BrowserRouter>
    );
}
