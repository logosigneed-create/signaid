import { initializeApp } from 'firebase/app';
import { getAuth as _getAuth, Auth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics as _getAnalytics } from 'firebase/analytics';

export const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "YOUR_API_KEY",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "YOUR_AUTH_DOMAIN",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "YOUR_PROJECT_ID",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "signaid-prod-assets",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "YOUR_MESSAGING_SENDER_ID",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "YOUR_APP_ID",
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || undefined
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Public data services
export const db = getFirestore(app);
export const storage = getStorage(app);

// Lazy Auth instance so Auth iframe is ONLY loaded when Auth service is accessed
let _authInstance: Auth | null = null;
export const getAuthInstance = (): Auth => {
    if (!_authInstance) {
        _authInstance = _getAuth(app);
    }
    return _authInstance;
};

// Proxy export for backwards compatibility with `import { auth } from './firebaseConfig'`
export const auth = new Proxy({} as Auth, {
    get(_target, prop: keyof Auth) {
        const instance = getAuthInstance();
        const value = instance[prop];
        return typeof value === 'function' ? value.bind(instance) : value;
    }
});

// Safe Analytics instance (only if measurementId exists in env and browser environment)
let _analyticsInstance: any = null;
if (typeof window !== 'undefined' && firebaseConfig.measurementId && firebaseConfig.measurementId !== 'YOUR_MEASUREMENT_ID') {
    try {
        _analyticsInstance = _getAnalytics(app);
    } catch (e) {
        console.warn('[Analytics] Initialization skipped:', e);
    }
}
export const analytics = _analyticsInstance;

export default app;
