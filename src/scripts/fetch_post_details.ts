import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import * as fs from 'fs';

const firebaseConfig = {
    apiKey: "AIzaSyCSBJf55JkrUtB844YXKlGypj2TkRDwUIY",
    authDomain: "signaid-d2d08.firebaseapp.com",
    projectId: "signaid-d2d08",
    storageBucket: "signaid-d2d08.firebasestorage.app",
    messagingSenderId: "214213761718",
    appId: "1:214213761718:web:2545a0dc2f796e1d9e6417"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function fetchProducts() {
    try {
        const querySnapshot = await getDocs(collection(db, 'products'));
        const products: any = [];
        querySnapshot.forEach((doc) => {
            products.push({ id: doc.id, ...doc.data() });
        });
        fs.writeFileSync('products_data.json', JSON.stringify(products, null, 2));
        console.log('Successfully wrote to products_data.json');
    } catch (error) {
        console.error('Error fetching products:', error);
    }
}

fetchProducts().then(() => process.exit(0));
