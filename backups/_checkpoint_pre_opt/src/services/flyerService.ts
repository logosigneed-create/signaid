import { db } from '../firebaseConfig';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export interface FlyerHotspot {
    id: string;
    url: string;
    label?: string; // Ajout du label (CTA text)
    x: number;
    y: number;
    w: number;
    h: number;
}

export interface FlyerPage {
    image: string;
    hotspots: FlyerHotspot[];
}

export interface FlyerConfig {
    theme: any;
    globalLink: string;
    pages: {
        recto: FlyerPage;
        verso: FlyerPage;
    };
}

const FLYER_CONFIG_DOC = doc(db, 'settings', 'flyer');

export const flyerService = {
    async getFlyerConfig(): Promise<FlyerConfig | null> {
        try {
            const snap = await getDoc(FLYER_CONFIG_DOC);
            if (snap.exists()) {
                return snap.data() as FlyerConfig;
            }
            return null;
        } catch (error) {
            console.error('Error fetching flyer config:', error);
            throw error;
        }
    },

    async saveFlyerConfig(config: FlyerConfig): Promise<void> {
        try {
            await setDoc(FLYER_CONFIG_DOC, config);
        } catch (error) {
            console.error('Error saving flyer config:', error);
            throw error;
        }
    }
};
