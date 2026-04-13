import { db, storage } from '../firebaseConfig';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import {
    collection,
    addDoc,
    getDocs,
    query,
    orderBy,
    doc,
    getDoc,
    updateDoc,
    increment,
    arrayUnion,
    arrayRemove,
    runTransaction,
    setDoc,
    serverTimestamp,
    where,
    startAfter,
    limit
} from 'firebase/firestore';
import { Post } from '../types';

class PostService {
    private postsCollection = collection(db, 'posts');

    async uploadImage(base64Image: string): Promise<string> {
        try {
            const filename = `posts/${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
            const storageRef = ref(storage, filename);
            await uploadString(storageRef, base64Image, 'data_url');
            return await getDownloadURL(storageRef);
        } catch (error) {
            console.error("Error uploading image:", error);
            throw error;
        }
    }

    // Recursive helper to find and upload Base64 strings
    private async processObjectForUpload(obj: any): Promise<any> {
        if (!obj) return obj;
        if (typeof obj === 'string') {
            if (obj.startsWith('data:image')) {
                console.log("Uploading Base64 string to Storage...");
                return await this.uploadImage(obj);
            }
            return obj;
        }
        if (Array.isArray(obj)) {
            return await Promise.all(obj.map(item => this.processObjectForUpload(item)));
        }
        if (typeof obj === 'object' && obj !== null) {
            const newObj: any = {};
            for (const key in obj) {
                const value = await this.processObjectForUpload(obj[key]);
                if (value !== undefined) {
                    newObj[key] = value;
                }
            }
            return newObj;
        }
        return obj;
    }

    async createPost(post: Post): Promise<void> {
        try {
            console.log("Starting strict sanitization of post data...");
            // 2. Recursively sanitize the ENTIRE object
            const cleanData = await this.processObjectForUpload(post);

            console.log("DEBUG - Post sanitized (postService.ts). No Base64 should remain.");

            // 3. Save to Firestore
            await setDoc(doc(db, 'posts', cleanData.id), {
                ...cleanData,
                createdAt: new Date()
            });
        } catch (error) {
            console.error("Error creating post:", error);
            throw error;
        }
    }

    async getPostById(postId: string): Promise<Post | null> {
        try {
            // Try direct doc access first
            const docSnap = await getDoc(doc(this.postsCollection, postId));
            if (docSnap.exists()) {
                const data = docSnap.data();
                const { createdAt, ...postData } = data;
                const post = postData as Post;
                if (!post.status) post.status = 'pending';
                return post;
            }

            // Fallback: Query by "id" field
            const q = query(this.postsCollection, where("id", "==", postId), limit(1));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                const data = querySnapshot.docs[0].data();
                const { createdAt, ...postData } = data;
                const post = postData as Post;
                if (!post.status) post.status = 'pending';
                return post;
            }

            return null;
        } catch (error) {
            console.error(`Error fetching post ${postId}:`, error);
            return null;
        }
    }

    async getPosts(lastDoc: any = null, limitCount: number = 12): Promise<{ posts: Post[], lastDoc: any }> {
        try {
            // OPTIMIZATION: Restore server-side orderBy to reduce client-side processing
            // and ensure we only fetch THE latest items, not a random set limited to X.
            let q;
            if (lastDoc) {
                q = query(this.postsCollection, orderBy('createdAt', 'desc'), startAfter(lastDoc), limit(limitCount));
            } else {
                q = query(this.postsCollection, orderBy('createdAt', 'desc'), limit(limitCount));
            }

            const querySnapshot = await getDocs(q);
            let posts = this.processDocs(querySnapshot);

            console.log(`[PostService] Fetched ${posts.length} posts (Server-Side Ordered).`);
            const lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];
            return { posts, lastDoc: lastVisible };

        } catch (error) {
            console.error("Error fetching posts:", error);
            // Fallback for missing index error (if user hasn't clicked the link yet)
            console.warn("Retrying without server-side sort (Index might be missing)...");
            const qFallback = lastDoc 
                ? query(this.postsCollection, startAfter(lastDoc), limit(limitCount))
                : query(this.postsCollection, limit(limitCount));
            
            const querySnapshot = await getDocs(qFallback);
            let posts = this.processDocs(querySnapshot);
            posts.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
            
            const lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];
            return { posts, lastDoc: lastVisible };
        }
    }

    private processDocs(querySnapshot: any): Post[] {
        const posts: Post[] = [];
        querySnapshot.forEach((doc: any) => {
            const data = doc.data();
            // Ensure status is present, default to 'pending' if missing (legacy data)
            const post = { ...data, id: doc.id } as Post;
            if (!post.status) post.status = 'pending';
            posts.push(post);
        });
        return posts; // No need to reverse if specific order is handled or irrelevant in fallback
    }

    async validatePost(postId: string, userId: string, isValidation: boolean): Promise<void> {
        // Optimisation: try direct update first if PostID == DocID
        try {
            await updateDoc(doc(this.postsCollection, postId), {
                validations: increment(isValidation ? 1 : -1)
            });
            return;
        } catch (e: any) {
            // Continue if not found
        }

        const q = query(this.postsCollection, where("id", "==", postId));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const docRef = querySnapshot.docs[0].ref;
            await updateDoc(docRef, {
                validations: increment(isValidation ? 1 : -1)
            });
        }
    }

    async archivePost(postId: string): Promise<void> {
        // Try direct update first (most common case now)
        try {
            await updateDoc(doc(this.postsCollection, postId), { archived: true });
            return;
        } catch (error: any) {
            console.log(`Failed to archive by direct ID ${postId}, trying search...`);
            // Ignore not-found, verify others
            if (error.code !== 'not-found') throw error;
        }

        // Fallback: Find by field "id"
        const q = query(this.postsCollection, where("id", "==", postId));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            // Found it!
            const docRef = querySnapshot.docs[0].ref;
            console.log(`Found post ${postId} with doc ID ${docRef.id}, archiving...`);
            await updateDoc(docRef, { archived: true });
        } else {
            console.error(`Post with ID ${postId} not found in Firestore.`);
            throw new Error(`Post with ID ${postId} not found`);
        }
    }

    async updatePost(postId: string, data: Partial<Post>): Promise<void> {
        try {
            await updateDoc(doc(this.postsCollection, postId), data);
            return;
        } catch (error: any) {
            if (error.code !== 'not-found') throw error;
        }

        const q = query(this.postsCollection, where("id", "==", postId));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const docRef = querySnapshot.docs[0].ref;
            await updateDoc(docRef, data);
        } else {
            throw new Error(`Post with ID ${postId} not found`);
        }
    }

    async updatePostPrivacy(postId: string, isPrivate: boolean): Promise<void> {
        return this.updatePost(postId, { isPrivate });
    }


    async incrementView(postId: string): Promise<void> {
        try {
            // 1. Get User IP (Client Side View)
            const ipResponse = await fetch('https://api.ipify.org?format=json');
            const { ip } = await ipResponse.json();

            if (!ip) return;

            // 2. Reference to the Unique View Doc
            // Note: We need the actual DOC ID, not the custom "id" field.
            // Assumption: postId passed here IS the doc ID (if using new items) OR we find it.
            // For robustness, we check if we can write to direct ID.

            let docRef = doc(this.postsCollection, postId);

            // Verify if direct ID works or if we need to query
            // Strategy: Try to read/write to subcollection. If fails (parent not found?), resolve real ID.
            // Actually, for strict correctness with "id" vs "docId", let's resolve.
            // Optimization: Try-catch block.

            try {
                // Try to write to subcollection of 'postId' (assuming it's the docKey)
                const viewRef = doc(db, 'posts', postId, 'unique_views', ip);
                // We use a transaction or simple set. Simple set is easier.
                // If document exists, we stop.
                // We can use runTransaction to be atomic.
                await runTransaction(db, async (transaction) => {
                    const sfDoc = await transaction.get(viewRef);
                    if (!sfDoc.exists()) {
                        // New View!
                        transaction.set(viewRef, { timestamp: serverTimestamp() });
                        transaction.update(docRef, { views: increment(1) });
                    }
                });
                return;
            } catch (e) {
                // If ID was invalid for doc reference (e.g. it was a legacy custom ID), we might fail or if parent doesn't exist?
                // actually subcollections can exist even if parent doc doesn't technically matter for path, but logical link matters.
            }

            // Fallback: Resolve Real Doc ID
            const q = query(this.postsCollection, where("id", "==", postId));
            const querySnapshot = await getDocs(q);
            if (querySnapshot.empty) return;

            docRef = querySnapshot.docs[0].ref;
            const viewRef = doc(db, 'posts', docRef.id, 'unique_views', ip);

            await runTransaction(db, async (transaction) => {
                const sfDoc = await transaction.get(viewRef);
                if (!sfDoc.exists()) {
                    transaction.set(viewRef, { timestamp: serverTimestamp() });
                    transaction.update(docRef, { views: increment(1) });
                }
            });

        } catch (error) {
            console.error("Error incrementing view:", error);
            // Silent fail is acceptable for analytics
        }
    }

    async logGeneration(userId: string, userEmail: string, base64Image: string, prompt: string, styleCategory: string): Promise<string> {
        try {
            // 1. Upload Image to separate folder
            const filename = `generated_history/${userId}_${Date.now()}.jpg`;
            const storageRef = ref(storage, filename);
            await uploadString(storageRef, base64Image, 'data_url');
            const imageUrl = await getDownloadURL(storageRef);

            // 2. Log to Firestore
            await addDoc(collection(db, 'generation_logs'), {
                userId,
                userEmail, // Passed directly
                imageUrl,
                prompt,
                styleCategory,
                timestamp: serverTimestamp()
            });
            console.log("Generation archived successfully.");
            return imageUrl;
        } catch (error) {
            console.error("Failed to archive generation:", error);
            return base64Image; // Fallback to base64 if upload fails
        }
    }
}

export const postService = new PostService();
