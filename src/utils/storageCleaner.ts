import { ref, deleteObject } from 'firebase/storage';
import { storage } from '../firebaseConfig';

/**
 * Safely deletes a file from Firebase Storage given its public HTTP URL or gs:// URI.
 * Fails silently in case the file doesn't exist or permission is denied, to prevent breaking app flows.
 */
export async function deleteStorageFileByUrl(fileUrl: string | null | undefined): Promise<boolean> {
    if (!fileUrl || typeof fileUrl !== 'string') return false;

    // Safety checks: Only target Firebase Storage URLs
    if (!fileUrl.includes('firebasestorage.googleapis.com') && !fileUrl.startsWith('gs://')) {
        return false;
    }

    // Never attempt to delete local assets, data URIs, or non-firebase images
    if (fileUrl.startsWith('/assets/') || fileUrl.startsWith('data:')) {
        return false;
    }

    try {
        const fileRef = ref(storage, fileUrl);
        await deleteObject(fileRef);
        console.log(`[StorageCleaner] Purged orphan file: ${fileUrl.substring(0, 90)}...`);
        return true;
    } catch (e) {
        console.warn(`[StorageCleaner] Silent catch: Could not delete orphan file (${fileUrl.substring(0, 90)}...):`, e);
        return false;
    }
}
