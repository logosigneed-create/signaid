import { db, storage } from '../firebaseConfig';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { collection, doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { CartItem } from '../types';

class DesignSharingService {
    private sharedDesignsCollection = collection(db, 'sharedDesigns');
    private shortLinksCollection = collection(db, 'shortLinks');

    /**
     * Uploads a base64/data URL to Firebase Storage.
     */
    async uploadImage(dataUrl: string, folder: string = 'shared_media'): Promise<string> {
        try {
            const filename = `${folder}/${Date.now()}_${Math.random().toString(36).substring(7)}.png`;
            const storageRef = ref(storage, filename);
            await uploadString(storageRef, dataUrl, 'data_url');
            return await getDownloadURL(storageRef);
        } catch (error) {
            console.error("Error uploading shared media:", error);
            throw error;
        }
    }

    /**
     * Recursively find and upload all data: URLs in an object.
     */
    private async processObjectForUpload(obj: any): Promise<any> {
        if (!obj) return obj;

        if (typeof obj === 'string') {
            if (obj.startsWith('data:image')) {
                console.log("[DesignSharing] Uploading local asset to Storage...");
                return await this.uploadImage(obj);
            }
            return obj;
        }

        if (Array.isArray(obj)) {
            return await Promise.all(obj.map(item => this.processObjectForUpload(item)));
        }

        if (typeof obj === 'object' && obj !== null) {
            // Don't recurse into special objects like Firestore FieldValues
            if (obj.constructor && obj.constructor.name !== 'Object' && obj.constructor.name !== 'Array') {
                return obj;
            }

            const newObj: any = {};
            for (const key in obj) {
                const processed = await this.processObjectForUpload(obj[key]);
                if (processed !== undefined) {
                    newObj[key] = processed;
                }
            }
            return newObj;
        }

        return obj;
    }

    /**
     * Persists a design state and returns a short shareable ID.
     */
    async createSharedDesign(item: CartItem, metadata?: { productId?: string; productType?: string; color?: string; userId?: string }): Promise<string> {
        try {
            console.log("[DesignSharing] Processing design for sharing...");

            // 1. Clean data: upload all local media
            const cleanItem = await this.processObjectForUpload(item);

            // 2. Save design state to Firestore
            const designId = `sd_${Date.now()}_${Math.random().toString(36).substring(7)}`;
            const finalDesignData = await this.processObjectForUpload({
                ...cleanItem,
                ...metadata,
                createdAt: serverTimestamp(),
                isShared: true
            });
            await setDoc(doc(this.sharedDesignsCollection, designId), finalDesignData);

            // 3. Generate a short ID for the link
            const shortId = Math.random().toString(36).substring(2, 8).toUpperCase();
            const finalShortLinkData = await this.processObjectForUpload({
                sharedDesignId: designId,
                productType: item.productType,
                ...metadata,
                createdAt: serverTimestamp(),
                source: 'customizer_share'
            });
            await setDoc(doc(this.shortLinksCollection, shortId), finalShortLinkData);

            console.log(`[DesignSharing] Design shared successfully. Link ID: ${shortId}`);
            return shortId;
        } catch (error) {
            console.error("Failed to share design:", error);
            throw error;
        }
    }

    /**
     * Retrieves a shared design by its ID.
     */
    async getSharedDesign(designId: string): Promise<CartItem | null> {
        try {
            const docSnap = await getDoc(doc(this.sharedDesignsCollection, designId));
            if (docSnap.exists()) {
                return docSnap.data() as CartItem;
            }
            return null;
        } catch (error) {
            console.error("Error fetching shared design:", error);
            return null;
        }
    }

    /**
     * Retrieves all shared designs for a specific user.
     */
    async getUserSharedDesigns(userId: string): Promise<any[]> {
        try {
            const { query, where, getDocs, orderBy } = await import('firebase/firestore');
            const q = query(this.sharedDesignsCollection, where("userId", "==", userId), orderBy('createdAt', 'desc'));
            const snapshot = await getDocs(q);
            const designs: any[] = [];
            snapshot.forEach(doc => {
                designs.push({ ...doc.data(), id: doc.id });
            });
            return designs;
        } catch (error) {
            console.warn("Shared designs index missing, falling back to unordered query:", error);
            const { query, where, getDocs } = await import('firebase/firestore');
            const qFallback = query(this.sharedDesignsCollection, where("userId", "==", userId));
            const snapshot = await getDocs(qFallback);
            const designs: any[] = [];
            snapshot.forEach(doc => {
                designs.push({ ...doc.data(), id: doc.id });
            });
            designs.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
            return designs;
        }
    }
}

export const designSharingService = new DesignSharingService();
