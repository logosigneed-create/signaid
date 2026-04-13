/**
 * Migration Script: Convert Base64 images to Firebase Storage URLs
 * 
 * This script:
 * 1. Fetches all posts from Firestore
 * 2. Identifies posts with Base64 imageUrl (starting with 'data:')
 * 3. Uploads each Base64 image to Firebase Storage
 * 4. Updates the Firestore document with the new Storage URL
 * 
 * Run with: npx ts-node scripts/migrateBase64ToStorage.ts
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import * as path from 'path';

// Initialize Firebase Admin
// You'll need to download your service account key from Firebase Console
// and save it as 'serviceAccountKey.json' in the scripts folder
const serviceAccount = require('./serviceAccountKey.json');

initializeApp({
    credential: cert(serviceAccount),
    storageBucket: 'signaid-d2d08.appspot.com'
});

const db = getFirestore();
const bucket = getStorage().bucket();

interface Post {
    id: string;
    imageUrl?: string;
    [key: string]: any;
}

/**
 * Convert Base64 data URL to a Buffer
 */
function base64ToBuffer(dataUrl: string): { buffer: Buffer; mimeType: string } {
    const matches = dataUrl.match(/^data:(.+);base64,(.+)$/);
    if (!matches) {
        throw new Error('Invalid Base64 data URL');
    }
    return {
        mimeType: matches[1],
        buffer: Buffer.from(matches[2], 'base64')
    };
}

/**
 * Get file extension from MIME type
 */
function getExtension(mimeType: string): string {
    const map: Record<string, string> = {
        'image/jpeg': '.jpg',
        'image/png': '.png',
        'image/gif': '.gif',
        'image/webp': '.webp',
        'image/svg+xml': '.svg'
    };
    return map[mimeType] || '.png';
}

/**
 * Upload Base64 image to Firebase Storage and return the public URL
 */
async function uploadBase64ToStorage(postId: string, dataUrl: string): Promise<string> {
    const { buffer, mimeType } = base64ToBuffer(dataUrl);
    const extension = getExtension(mimeType);
    const fileName = `posts/${postId}/image${extension}`;

    const file = bucket.file(fileName);

    await file.save(buffer, {
        metadata: {
            contentType: mimeType,
            cacheControl: 'public, max-age=31536000'
        }
    });

    // Make the file publicly accessible
    await file.makePublic();

    // Return the public URL
    return `https://storage.googleapis.com/${bucket.name}/${fileName}`;
}

/**
 * Main migration function
 */
async function migrateBase64Images() {
    console.log('🚀 Starting Base64 to Firebase Storage migration...\n');

    // Fetch all posts
    const postsSnapshot = await db.collection('posts').get();
    const posts: Post[] = postsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));

    console.log(`📦 Found ${posts.length} total posts\n`);

    // Filter posts with Base64 images
    const base64Posts = posts.filter(p => p.imageUrl?.startsWith('data:'));
    console.log(`🔍 Found ${base64Posts.length} posts with Base64 images\n`);

    if (base64Posts.length === 0) {
        console.log('✅ No Base64 images to migrate!');
        return;
    }

    let successCount = 0;
    let errorCount = 0;

    for (const post of base64Posts) {
        try {
            console.log(`📤 Migrating post ${post.id}...`);

            // Upload to Storage
            const newUrl = await uploadBase64ToStorage(post.id, post.imageUrl!);

            // Update Firestore document
            await db.collection('posts').doc(post.id).update({
                imageUrl: newUrl,
                imageUrlMigratedAt: new Date(),
                originalImageUrlBackup: post.imageUrl?.substring(0, 100) + '...' // Keep first 100 chars as backup reference
            });

            console.log(`   ✅ Success: ${newUrl}`);
            successCount++;
        } catch (error) {
            console.error(`   ❌ Error migrating post ${post.id}:`, error);
            errorCount++;
        }
    }

    console.log('\n' + '='.repeat(50));
    console.log('📊 Migration Summary:');
    console.log(`   ✅ Success: ${successCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log('='.repeat(50));
}

// Run the migration
migrateBase64Images()
    .then(() => {
        console.log('\n🎉 Migration complete!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Migration failed:', error);
        process.exit(1);
    });
