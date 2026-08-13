import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect, lazy, Suspense } from 'react';
import { logAnalyticsEvent, AnalyticsEvents } from './services/analyticsService';
import { PremiumChatWidget } from './components/PremiumChatWidget';
import { CookieConsent } from './components/CookieConsent';
import { RequirePremium } from './components/RequirePremium';

// Helper for safe lazy loading (reloads on chunk failure after new deployments)
const safeLazy = (importFn: () => Promise<any>) =>
  lazy(async () => {
    const isRefreshed = sessionStorage.getItem('chunk_refreshed');
    try {
      const comp = await importFn();
      sessionStorage.removeItem('chunk_refreshed');
      return comp;
    } catch (err) {
      if (!isRefreshed) {
        sessionStorage.setItem('chunk_refreshed', 'true');
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
const VitrineHome = safeLazy(() => import('./app/page'));
const VitrineLogin = safeLazy(() => import('./app/vitrine-admin/page'));
const VitrineDashboard = safeLazy(() => import('./app/vitrine-admin/dashboard/page'));
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
                        <Route path="*" element={<ArtistProfileView overrideSlug="fabrizio" />} />
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
                    <Route path="/demo-vitrine" element={<VitrineHome />} />
                    
                    {/* BTP SPECIFIC ROUTES */}
                    <Route path="/btp" element={<LandingPage />} />
                    <Route path="/btp-audit" element={<BtpLandingPage />} />
                    <Route path="/portail-audit" element={<GenericAuditPage />} />
                    <Route path="/portail-shop" element={<ProductPortal />} />
                    <Route path="/preview/:previewId" element={<ProductPortal />} />
                    
                    <Route path="/portal" element={<PortalPage />} />
                    <Route path="/portal-dotation" element={<ProductPortal />} />

                    {/* VITRINE ADMIN ROUTES */}
                    <Route path="/vitrine-admin" element={<VitrineLogin />} />
                    <Route path="/vitrine-admin/dashboard" element={<RequirePremium><VitrineDashboard /></RequirePremium>} />
                    <Route path="/admin-dashboard" element={<RequirePremium><VitrineDashboard /></RequirePremium>} />
                    
                    <Route path="/galerie" element={<CustomizerApp />} />
                    <Route path="/panier" element={<CustomizerApp />} />
                    <Route path="/profil" element={<ProfileRedirect />} />
                    <Route path="/recompense" element={<CustomizerApp />} />
                    <Route path="/admin" element={<RequirePremium><CustomizerApp /></RequirePremium>} />
                    <Route path="/creation" element={<RequirePremium><CustomizerApp /></RequirePremium>} />
                    <Route path="/creation/:productType" element={<RequirePremium><CustomizerApp /></RequirePremium>} />
                    <Route path="/creation/:productType/:postId" element={<CustomizerApp />} />
                    <Route path="/remix/:postId" element={<CustomizerApp />} />
                    <Route path="/s/:shortId" element={<CustomizerApp />} />
                    <Route path="/contact" element={<CustomizerApp />} />
                    
                    <Route path="/inthedark" element={<FlyerPage />} />
                    <Route path="/in-the-dark" element={<FlyerPage />} />
                    
                    <Route path="/conditions-generales" element={<ConditionsGeneralesPage />} />
                    <Route path="/confidentialite" element={<ConfidentialitePage />} />
                    <Route path="/cookies" element={<CookiesPage />} />
                    
                    <Route path="/blog" element={<BlogIndex />} />
                    <Route path="/blog/ia-imprimerie" element={<BlogPage />} />
                    <Route path="/blog/analyse-geometrique" element={<BlogPageGeometry />} />
                    <Route path="/blog/style-accessible-vs-pro" element={<BlogDesignStyle />} />
                    <Route path="/blog/logo-generique-danger" element={<BlogBrandAsset />} />
                    
                    {/* DYNAMIC ARTIST SLUG ROUTE (ex: signaid.eu/fabrizio) */}
                    <Route path="/:slug" element={<ArtistProfileView />} />
                </Routes>
            </Suspense>
            <PremiumChatWidget />
            <CookieConsent />
        </BrowserRouter>
    );
}
