import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect, lazy, Suspense } from 'react';
import { logAnalyticsEvent, AnalyticsEvents } from './services/analyticsService';

// CODE SPLITTING: Lazy load heavy components to reduce initial bundle
const LandingPage = lazy(() => import('./LandingPage'));
const CustomizerApp = lazy(() => import('./CustomizerApp'));

const LoadingSpinner = () => (
    <div className="flex items-center justify-center min-h-screen bg-black text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
    </div>
);

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
                </Routes>
            </Suspense>
        </BrowserRouter>
    );
}
