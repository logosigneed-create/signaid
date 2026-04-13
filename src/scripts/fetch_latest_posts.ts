
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { firebaseConfig } from '../firebaseConfig';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function fetchLatestPosts() {
    console.log('Fetching latest posts...');
    try {
        const postsRef = collection(db, 'posts');
        const q = query(postsRef, orderBy('createdAt', 'desc'), limit(5));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            console.log('No posts found.');
            return;
        }

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            console.log(`--------------------------------------------------`);
            console.log(`Post ID: ${doc.id}`);
            console.log(`Created At: ${new Date(data.createdAt).toLocaleString()}`);
            console.log(`User ID: ${data.userId}`);
            console.log(`Product Type: ${data.productType || data.customization?.productType}`);
            console.log(`Caption: ${data.caption}`);
            console.log(`Tags: ${JSON.stringify(data.tags)}`);
            // console.log(`Customization: ${JSON.stringify(data.customization, null, 2)}`);
        });
    } catch (error) {
        console.error('Error fetching posts:', error);
    }
}

fetchLatestPosts();
