import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebaseConfig';

// const storage = getStorage(app); // Storage is now imported directly

// Polyfill for crypto.randomUUID() for Safari/iOS compatibility
const generateUUID = (): string => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    // Fallback for browsers that don't support crypto.randomUUID()
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

/**
 * Uploads a Blob to Firebase Storage and returns the public download URL.
 * @param blob The image blob to upload
 * @param path The storage path (optional, defaults to 'cart_images')
 */
export const uploadImageBlob = async (blob: Blob, folder: string = 'cart_images'): Promise<string> => {
    try {
        const uniqueId = generateUUID();
        const extension = blob.type.split('/')[1] || 'jpg';
        const fullPath = `${folder}/${uniqueId}.${extension}`;
        const storageRef = ref(storage, fullPath);

        const snapshot = await uploadBytes(storageRef, blob);
        const downloadURL = await getDownloadURL(snapshot.ref);

        return downloadURL;
    } catch (error) {
        console.error("Error uploading image:", error);
        throw new Error("Failed to upload image.");
    }
};
