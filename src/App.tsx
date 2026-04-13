import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect, lazy, Suspense } from 'react';
import { logAnalyticsEvent, AnalyticsEvents } from './services/analyticsService';
import { PremiumChatWidget } from './components/PremiumChatWidget';
import { CookieConsent } from './components/CookieConsent';

// CODE SPLITTING: Lazy load heavy components to reduce initial bundle
const LandingPage = lazy(() => import('./LandingPage'));
import CustomizerApp from './CustomizerApp';
// const CustomizerApp = lazy(() => import('./CustomizerApp'));
const FlyerPage = lazy(() => import('./components/FlyerPage'));
const ConditionsGeneralesPage = lazy(() => import('./components/LegalPages').then(m => ({ default: m.ConditionsGenerales })));
const ConfidentialitePage = lazy(() => import('./components/LegalPages').then(m => ({ default: m.Confidentialite })));
const CookiesPage = lazy(() => import('./components/LegalPages').then(m => ({ default: m.CookiesPage })));
const BlogPage = lazy(() => import('./components/BlogPage'));
const BlogPageGeometry = lazy(() => import('./components/BlogPageGeometry'));
const BlogDesignStyle = lazy(() => import('./components/BlogDesignStyle'));
const BlogBrandAsset = lazy(() => import('./components/BlogBrandAsset'));
const BlogIndex = lazy(() => import('./components/BlogIndex'));
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
    return (
        <BrowserRouter>
            <ScrollToTop />
            <Suspense fallback={<LoadingSpinner />}>
                <Routes>
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/instructions" element={<LandingPage />} />
                    <Route path="/inthedark" element={<FlyerPage />} />
                    <Route path="/in-the-dark" element={<FlyerPage />} />
                    <Route path="/galerie" element={<CustomizerApp />} />
                    <Route path="/panier" element={<CustomizerApp />} />
                    <Route path="/profil" element={<CustomizerApp />} />
                    <Route path="/recompense" element={<CustomizerApp />} />
                    <Route path="/admin" element={<CustomizerApp />} />
                    <Route path="/creation" element={<CustomizerApp />} />
                    <Route path="/creation/:productType" element={<CustomizerApp />} />
                    <Route path="/creation/:productType/:postId" element={<CustomizerApp />} />
                    <Route path="/remix/:postId" element={<CustomizerApp />} />
                    <Route path="/s/:shortId" element={<CustomizerApp />} />
                    <Route path="/contact" element={<CustomizerApp />} />
                    <Route path="/conditions-generales" element={<ConditionsGeneralesPage />} />
                    <Route path="/confidentialite" element={<ConfidentialitePage />} />
                    <Route path="/cookies" element={<CookiesPage />} />
                    <Route path="/blog" element={<BlogIndex />} />
                    <Route path="/blog/ia-imprimerie" element={<BlogPage />} />
                    <Route path="/blog/analyse-geometrique" element={<BlogPageGeometry />} />
                    <Route path="/blog/style-accessible-vs-pro" element={<BlogDesignStyle />} />
                    <Route path="/blog/logo-generique-danger" element={<BlogBrandAsset />} />
                </Routes>
            </Suspense>
            <PremiumChatWidget />
            <CookieConsent />
        </BrowserRouter>
    );
}
