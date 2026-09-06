import { User } from '../types';
import { auth, db, storage } from '../firebaseConfig';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    signInWithPopup,
    GoogleAuthProvider,
    FacebookAuthProvider,
    User as FirebaseUser
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, query, where, getDocs, limit, collection, increment } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { sanitizeForFirestore } from '../utils/firestoreSanitizer';

class AuthService {
    private currentUser: User | null = null;
    private listeners: ((user: User | null) => void)[] = [];

    constructor() {
        // Initialize Firebase Auth listener - NON-BLOCKING
        onAuthStateChanged(auth, (firebaseUser) => {
            if (firebaseUser) {
                // IMMEDIATELY return basic user from Firebase Auth (no Firestore wait)
                this.currentUser = this.mapFirebaseUser(firebaseUser);
                this.notify(); // Notify listeners RIGHT AWAY with basic user

                // ASYNC: Load full user details from Firestore in background
                this.loadUserDetailsAsync(firebaseUser.uid, firebaseUser.email);
            } else {
                this.currentUser = null;
                this.notify();
            }
        });
    }

    // Load Firestore user details without blocking render
    private async loadUserDetailsAsync(uid: string, email: string | null) {
        try {
            const userDoc = await getDoc(doc(db, "users", uid));
            if (userDoc.exists()) {
                const userData = userDoc.data() as User;
                const userEmail = (email || userData.email || '').toLowerCase();
                const isAdmin = userData.isAdmin || ['logosigneed@gmail.com', 'contact@signaid.eu', 'alicia.g.gheerts@gmail.com'].includes(userEmail) || userData.username === 'SIGNAID';

                // Update with full user data
                this.currentUser = {
                    ...userData,
                    email: userEmail,
                    isAdmin: isAdmin
                };
                this.notify(); // Notify again with full data
            }
        } catch (error) {
            console.error('Error loading user details:', error);
            // Keep using basic user from Firebase Auth
        }
    }

    private mapFirebaseUser(firebaseUser: FirebaseUser): User {
        return {
            id: firebaseUser.uid,
            username: firebaseUser.displayName || 'User',
            email: firebaseUser.email || '',
            avatarUrl: firebaseUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${firebaseUser.uid}`,
            credits: 4, // Default welcome credits
            savedPostIds: [],
            wishlist: [],
            following: [],
            likedProducts: [],
            dislikedProducts: []
        };
    }

    async login(email: string, password: string): Promise<User> {
        try {
            await signInWithEmailAndPassword(auth, email, password);
            // The onAuthStateChanged listener will handle state update
            // We just wait a bit to ensure currentUser is populated
            await new Promise(resolve => setTimeout(resolve, 500));
            if (this.currentUser) return this.currentUser;
            throw new Error("Login successful but user data not loaded");
        } catch (error: any) {
            console.error("Login error:", error);
            throw error;
        }
    }

    async loginWithGoogle(): Promise<User> {
        try {
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
            await new Promise(resolve => setTimeout(resolve, 1000));
            if (this.currentUser) return this.currentUser;
            throw new Error("Google Login successful but user data not loaded");
        } catch (error: any) {
            console.error("Google Login error:", error);
            throw error;
        }
    }

    async loginWithFacebook(): Promise<User> {
        try {
            const provider = new FacebookAuthProvider();
            await signInWithPopup(auth, provider);
            await new Promise(resolve => setTimeout(resolve, 1000));
            if (this.currentUser) return this.currentUser;
            throw new Error("Facebook Login successful but user data not loaded");
        } catch (error: any) {
            console.error("Facebook Login error:", error);
            throw error;
        }
    }

    async register(email: string, password: string, username: string, referrerCode?: string): Promise<User> {
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const firebaseUser = userCredential.user;

            // Generate unique referral code for the new user
            // Simple generation: username + random 4 chars
            const uniqueSuffix = Math.random().toString(36).substring(2, 6);
            const newReferralCode = `${username.replace(/\s+/g, '').toLowerCase()}-${uniqueSuffix}`;

            const newUser: User = {
                id: firebaseUser.uid,
                username,
                email,
                avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
                credits: 4,
                savedPostIds: [],
                wishlist: [],
                following: [],
                likedProducts: [],
                dislikedProducts: [],
                referralCode: newReferralCode
            };

            // Handle Referral Logic
            if (referrerCode) {
                // Find referrer
                try {
                    const q = query(collection(db, "users"), where("referralCode", "==", referrerCode), limit(1));
                    const querySnapshot = await getDocs(q);

                    if (!querySnapshot.empty) {
                        const referrerDoc = querySnapshot.docs[0];
                        const referrerData = referrerDoc.data() as User;

                        // Give 5 credits to referrer
                        const referrerRef = doc(db, "users", referrerDoc.id);
                        await updateDoc(referrerRef, sanitizeForFirestore({
                            credits: increment(5)
                        }));
                        console.log(`Referral successful! 5 credits added to ${referrerData.username}`);
                    }
                } catch (err) {
                    console.error("Error processing referral:", err);
                    // Don't block registration if referral fails
                }
            }

            // Save user to Firestore
            await setDoc(doc(db, "users", firebaseUser.uid), sanitizeForFirestore(newUser));

            this.currentUser = newUser;
            this.notify();
            return newUser;
        } catch (error: any) {
            console.error("Registration error:", error);
            throw error;
        }
    }


    async logout(): Promise<void> {
        await signOut(auth);
        this.currentUser = null;
        this.notify();
    }

    async updateUser(userId: string, updates: Partial<User>): Promise<User> {
        if (this.currentUser && this.currentUser.id === userId) {
            await updateDoc(doc(db, "users", userId), sanitizeForFirestore(updates));
            this.currentUser = { ...this.currentUser, ...updates };
            this.notify();
            return this.currentUser;
        }
        throw new Error("User not found or unauthorized");
    }

    async toggleFollow(currentUserId: string, targetUserId: string): Promise<User> {
        if (!this.currentUser || this.currentUser.id !== currentUserId) {
            throw new Error("Unauthorized");
        }

        const following = this.currentUser.following || [];
        let newFollowing: string[];

        if (following.includes(targetUserId)) {
            newFollowing = following.filter(id => id !== targetUserId);
        } else {
            newFollowing = [...following, targetUserId];
        }

        await updateDoc(doc(db, "users", currentUserId), sanitizeForFirestore({ following: newFollowing }));
        this.currentUser = { ...this.currentUser, following: newFollowing };
        this.notify();
        return this.currentUser;
    }

    async likeProduct(userId: string, productId: string): Promise<User> {
        if (!this.currentUser || this.currentUser.id !== userId) {
            throw new Error("Unauthorized");
        }
        const liked = this.currentUser.likedProducts || [];
        if (!liked.includes(productId)) {
            const newLiked = [...liked, productId];
            await updateDoc(doc(db, "users", userId), sanitizeForFirestore({ likedProducts: newLiked }));
            this.currentUser = { ...this.currentUser, likedProducts: newLiked };
            this.notify();
        }
        return this.currentUser;
    }

    async dislikeProduct(userId: string, productId: string): Promise<User> {
        if (!this.currentUser || this.currentUser.id !== userId) {
            throw new Error("Unauthorized");
        }
        const disliked = this.currentUser.dislikedProducts || [];
        if (!disliked.includes(productId)) {
            const newDisliked = [...disliked, productId];
            await updateDoc(doc(db, "users", userId), sanitizeForFirestore({ dislikedProducts: newDisliked }));
            this.currentUser = { ...this.currentUser, dislikedProducts: newDisliked };
            this.notify();
        }
        return this.currentUser;
    }

    onAuthStateChanged(callback: (user: User | null) => void): () => void {
        this.listeners.push(callback);
        callback(this.currentUser);
        return () => {
            this.listeners = this.listeners.filter(l => l !== callback);
        };
    }

    private notify() {
        this.listeners.forEach(l => l(this.currentUser));
    }

    async uploadAvatar(userId: string, base64String: string): Promise<string> {
        if (!base64String || !userId) {
            throw new Error("Paramètres manquants pour l'upload Base64.");
        }

        const fileName = `avatar_${Date.now()}.jpg`;
        const storageRef = ref(storage, `users/${userId}/avatars/${fileName}`);

        try {
            const snapshot = await uploadString(storageRef, base64String, 'data_url', {
                contentType: 'image/jpeg',
                cacheControl: 'public, max-age=86400'
            });
            console.log('Upload Base64 réussi !', snapshot.metadata.fullPath);
            const downloadURL = await getDownloadURL(snapshot.ref);
            return downloadURL;
        } catch (error) {
            console.error("Erreur lors de l'upload Base64 vers Storage:", error);
            throw error;
        }
    }
}

export const authService = new AuthService();
