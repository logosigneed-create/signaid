import React, { useState, useEffect } from 'react';
import { User, PricingRules } from '../types';
import { db } from '../firebaseConfig';
import { collection, getDocs, query, orderBy, limit, doc, updateDoc, setDoc, getDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { productDatabase } from '../constants';

export function AdminView({ user, onBack, productDimensions, onUpdateDimensions }: { user: User, onBack: () => void, productDimensions: Record<string, Record<string, number>>, onUpdateDimensions: (dims: Record<string, Record<string, number>>) => void }) {
    const [orders, setOrders] = useState<any[]>([]);
    const [quotes, setQuotes] = useState<any[]>([]);
    const [messages, setMessages] = useState<any[]>([]);
    const [usersList, setUsersList] = useState<User[]>([]);
    const [pricingRules, setPricingRules] = useState<PricingRules>({});
    const [loading, setLoading] = useState(true);

    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Dynamic Title for Admin
    useEffect(() => {
        document.title = "Signaid - Admin Dashboard";
    }, []);

    // DEBUG: Log current user
    console.log("Admin View Current User:", user);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setErrorMsg(null);

            // Log start
            console.log("Starting Fetch...");

            // Helper for robust fetching
            const fetchCollection = async (
                name: string,
                setter: Function,
                sortField: string,
                limitCount: number
            ) => {
                try {
                    console.log(`Fetching ${name}...`);
                    const q = query(collection(db, name), limit(limitCount));
                    const snapshot = await getDocs(q);
                    console.log(`${name} fetched: ${snapshot.size} docs`); // Log count
                    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                    // Client-side Sort
                    data.sort((a: any, b: any) => {
                        const tA = a[sortField]?.seconds || 0;
                        const tB = b[sortField]?.seconds || 0;
                        return tB - tA;
                    });

                    setter(data);
                } catch (err: any) {
                    console.error(`Error fetching ${name}:`, err);
                    setErrorMsg(prev => `${prev ? prev + ' | ' : ''}Err ${name}: ${err.message}`);
                }
            };

            await Promise.all([
                fetchCollection('orders', setOrders, 'createdAt', 50),
                fetchCollection('quotes', setQuotes, 'createdAt', 50),
                fetchCollection('contact_messages', setMessages, 'timestamp', 50),
                // Users fetch (no sort needed usually, or add if needed)
                (async () => {
                    try {
                        const usersQuery = query(collection(db, 'users'), limit(50));
                        const usersSnapshot = await getDocs(usersQuery);
                        setUsersList(usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User)));
                    } catch (e: any) {
                        console.error("Error fetching users:", e);
                        setErrorMsg(prev => `${prev ? prev + ' | ' : ''}Err Users: ${e.message}`);
                    }
                })(),
                // Pricing
                (async () => {
                    try {
                        const pricingDoc = await getDoc(doc(db, 'settings', 'pricing'));
                        if (pricingDoc.exists()) {
                            setPricingRules(pricingDoc.data() as PricingRules);
                        }
                    } catch (e) { console.error("Pricing err:", e); }
                })()
            ]);

            setLoading(false);
        };
        fetchData();
    }, []);

    const handleUpdateUserCredits = async (userId: string, newCredits: number) => {
        try {
            await updateDoc(doc(db, "users", userId), { credits: newCredits });
            setUsersList(prev => prev.map(u => u.id === userId ? { ...u, credits: newCredits } : u));
            alert("Crédits mis à jour !");
        } catch (e) {
            console.error("Error updating credits:", e);
            alert("Erreur lors de la mise à jour.");
        }
    };



    const authorizedEmails = ['logosigneed@gmail.com'];
    if (!user.email || !authorizedEmails.includes(user.email)) {
        return <div className="p-8 text-center text-red-500">Accès non autorisé.</div>;
    }

    return (
        <div className="flex flex-col h-full bg-gray-50 overflow-y-auto">
            <div className="bg-white p-4 shadow-sm flex items-center gap-4 sticky top-0 z-10">
                <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100">
                    <i className="fa-solid fa-arrow-left"></i>
                </button>
                <div className="flex-1">
                    <h2 className="text-xl font-black">Admin Dashboard</h2>
                    <div className="text-xs font-mono text-gray-400">
                        User: {user?.email} | Status: {loading ? 'Loading...' : 'Ready'} | Debug: V12.3
                    </div>
                </div>
            </div>

            <div className="p-4 space-y-8 max-w-6xl mx-auto w-full">
                {errorMsg && (
                    <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl mb-6 text-sm font-mono break-all">
                        <strong>Debug Info:</strong> {errorMsg}
                    </div>
                )}

                {/* PRICING CONFIGURATION SECTION */}
                <section>
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <i className="fa-solid fa-tags text-green-600"></i> Configuration des Prix Spécifiques
                    </h3>
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <p className="text-sm text-gray-500 mb-4">
                            Définissez un prix de base pour chaque type de produit. Ce prix s'appliquera par défaut à toutes les tailles et couleurs sauf si une règle plus spécifique existe.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                            {Object.entries(productDatabase).map(([type, product]) => {
                                const currentPriceRule = pricingRules[type];
                                const currentPrice = typeof currentPriceRule === 'number' ? currentPriceRule : '';

                                return (
                                    <div key={type} className="border border-gray-200 rounded-lg p-4 flex flex-col gap-3">
                                        <div className="flex items-center gap-3">
                                            {/* @ts-ignore */}
                                            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-600">
                                                <i className={`fa-solid ${type === 'hoodie' ? 'fa-user-astronaut' : 'fa-shirt'}`}></i>
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-gray-800">{product.name}</h4>
                                                <span className="text-xs text-gray-400">Prix catalogue: {product.price}€</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <label className="text-sm font-medium text-gray-600 whitespace-nowrap">Nouveau Prix:</label>
                                            <input
                                                type="number"
                                                className="w-full border border-gray-300 rounded px-3 py-2 outline-none focus:border-green-500 font-bold text-green-700"
                                                placeholder={product.price.toString()}
                                                value={currentPrice}
                                                onChange={(e) => {
                                                    const val = parseFloat(e.target.value);
                                                    setPricingRules(prev => ({
                                                        ...prev,
                                                        [type]: isNaN(val) ? undefined : val // If empty/NaN, remove the rule (undefined) or keep it empty? undefined removes key.
                                                    } as PricingRules));
                                                }}
                                            />
                                            <span className="text-gray-500 font-bold">€</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="flex justify-end">
                            <button
                                onClick={async () => {
                                    try {
                                        // Filter out undefined/null values before saving if needed, but Firestore handles merge?
                                        // setDoc with simple object replacing the old one.
                                        // We want to KEEP other keys if we only edit one? No, this state is full representation.
                                        await setDoc(doc(db, 'settings', 'pricing'), pricingRules);
                                        alert("Prix sauvegardés !");
                                    } catch (e) {
                                        console.error("Error saving pricing:", e);
                                        alert("Erreur lors de la sauvegarde.");
                                    }
                                }}
                                className="bg-green-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-green-700 shadow-lg transition-transform hover:scale-105"
                            >
                                <i className="fa-solid fa-save mr-2"></i> Sauvegarder les Prix
                            </button>
                        </div>



                    </div>
                </section>

                {/* ORDERS SECTION */}
                <section>
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <i className="fa-solid fa-shopping-cart text-green-600"></i> Dernières Commandes (Mollie)
                    </h3>
                    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-100 text-gray-600 border-b">
                                <tr>
                                    <th className="p-3">Date</th>
                                    <th className="p-3">Email</th>
                                    <th className="p-3">Montant</th>
                                    <th className="p-3">Status</th>
                                    <th className="p-3">Articles</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {orders.map(order => (
                                    <tr key={order.id} className="hover:bg-gray-50">
                                        <td className="p-3 text-gray-500 text-xs">
                                            {order.createdAt ? new Date(order.createdAt.seconds * 1000).toLocaleString('fr-FR', { timeZone: 'Europe/Paris', dateStyle: 'short', timeStyle: 'short' }) : 'N/A'}
                                        </td>
                                        <td className="p-3 font-medium">{order.email}</td>
                                        <td className="p-3 font-bold">{order.totalAmount} €</td>
                                        <td className="p-3">
                                            <span className={`px-2 py-1 rounded-full text-xs ${order.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                {order.status}
                                            </span>
                                        </td>
                                        <td className="p-3 text-xs text-gray-500 max-w-xs truncate">
                                            {order.items?.map((i: any) => `${i.quantity}x ${i.name}`).join(', ')}
                                        </td>
                                    </tr>
                                ))}
                                {orders.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-gray-400">Aucune commande.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* QUOTES SECTION */}
                <section>
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <i className="fa-solid fa-file-invoice text-blue-600"></i> Derniers Devis
                    </h3>
                    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-100 text-gray-600 border-b">
                                <tr>
                                    <th className="p-3">Date</th>
                                    <th className="p-3">Nom</th>
                                    <th className="p-3">Email</th>
                                    <th className="p-3">Phone</th>
                                    <th className="p-3">Message</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {quotes.map(quote => (
                                    <tr key={quote.id} className="hover:bg-gray-50">
                                        <td className="p-3 text-gray-500 text-xs">
                                            {quote.createdAt ? new Date(quote.createdAt.seconds * 1000).toLocaleString('fr-FR', { timeZone: 'Europe/Paris', dateStyle: 'short', timeStyle: 'short' }) : 'N/A'}
                                        </td>
                                        <td className="p-3 font-medium">{quote.formData?.name}</td>
                                        <td className="p-3">{quote.formData?.email}</td>
                                        <td className="p-3">{quote.formData?.phone}</td>
                                        <td className="p-3 text-xs text-gray-500 max-w-xs truncate">{quote.formData?.message}</td>
                                    </tr>
                                ))}
                                {quotes.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-gray-400">Aucun devis.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* MESSAGES SECTION */}
                <section>
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <i className="fa-solid fa-envelope text-orange-600"></i> Messages de Contact
                        <button
                            onClick={async () => {
                                try {
                                    await addDoc(collection(db, 'contact_messages'), {
                                        name: 'TEST ADMIN',
                                        email: 'test@admin.com',
                                        message: 'Ceci est un test depuis le dashboard le ' + new Date().toLocaleString(),
                                        timestamp: serverTimestamp(),
                                        status: 'test'
                                    });
                                    alert("Message test envoyé ! Rafraîchissez pour voir.");
                                } catch (e: any) {
                                    alert("Erreur envoi test: " + e.message);
                                }
                            }}
                            className="ml-4 text-xs bg-gray-200 hover:bg-gray-300 text-gray-700 px-2 py-1 rounded"
                        >
                            <i className="fa-solid fa-bug"></i> Test Msg
                        </button>
                    </h3>
                    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                        {loading && (
                            <div className="p-4 text-center text-gray-400">
                                <i className="fa-solid fa-circle-notch fa-spin mr-2"></i> Chargement...
                            </div>
                        )}
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-100 text-gray-600 border-b">
                                <tr>
                                    <th className="p-3">Date</th>
                                    <th className="p-3">Nom</th>
                                    <th className="p-3">Email</th>
                                    <th className="p-3">Message</th>
                                    <th className="p-3">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {messages.map(msg => (
                                    <tr key={msg.id} className="hover:bg-gray-50">
                                        <td className="p-3 text-gray-500 text-xs">
                                            {msg.timestamp ? new Date(msg.timestamp.seconds * 1000).toLocaleString('fr-FR', { timeZone: 'Europe/Paris', dateStyle: 'short', timeStyle: 'short' }) : 'N/A'}
                                        </td>
                                        <td className="p-3 font-bold">{msg.name}</td>
                                        <td className="p-3">
                                            <a href={`mailto:${msg.email}`} className="text-blue-600 underline hover:text-blue-800 font-medium">
                                                {msg.email}
                                            </a>
                                        </td>
                                        <td className="p-3 text-gray-600 max-w-md truncate" title={msg.message}>{msg.message}</td>
                                        <td className="p-3 flex items-center gap-2">
                                            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-bold uppercase">{msg.status || 'Nouveau'}</span>
                                            <a
                                                href={`mailto:${msg.email}?subject=Réponse SignAid : ${msg.name}&body=Bonjour ${msg.name},%0D%0A%0D%0ANous avons bien reçu votre message :%0D%0A"${msg.message}"%0D%0A%0D%0A Cordialement,%0D%0AL'équipe SignAid`}
                                                className="bg-blue-100 text-blue-600 px-2 py-1 rounded hover:bg-blue-200 text-xs font-bold flex items-center gap-1 transition-colors"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                <i className="fa-solid fa-reply"></i> Gmail
                                            </a>
                                        </td>
                                    </tr>
                                ))}
                                {messages.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-gray-400">Aucun message.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* USERS SECTION */}
                <section>
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <i className="fa-solid fa-users text-purple-600"></i> Utilisateurs & Crédits
                    </h3>
                    <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-8">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-100 text-gray-600 border-b">
                                <tr>
                                    <th className="p-3">Utilisateur</th>
                                    <th className="p-3">Email</th>
                                    <th className="p-3">Crédits Actuels</th>
                                    <th className="p-3">Modifier Crédits</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {usersList.map(u => (
                                    <tr key={u.id} className="hover:bg-gray-50">
                                        <td className="p-3 font-bold flex items-center gap-2">
                                            <img src={u.avatarUrl} className="w-6 h-6 rounded-full" />
                                            {u.username}
                                        </td>
                                        <td className="p-3 text-gray-500">{u.email}</td>
                                        <td className="p-3 font-bold text-orange-500">{u.credits || 0}</td>
                                        <td className="p-3">
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="number"
                                                    className="w-20 border rounded px-2 py-1 text-sm outline-none focus:border-orange-500"
                                                    defaultValue={u.credits || 0}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            const val = parseInt(e.currentTarget.value);
                                                            if (!isNaN(val)) handleUpdateUserCredits(u.id, val);
                                                        }
                                                    }}
                                                />
                                                <button
                                                    className="bg-orange-500 text-white px-2 py-1 rounded text-xs hover:bg-orange-600"
                                                    onClick={(e) => {
                                                        const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                                                        const val = parseInt(input.value);
                                                        if (!isNaN(val)) handleUpdateUserCredits(u.id, val);
                                                    }}
                                                >
                                                    OK
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* DIMENSIONS CONFIGURATION SECTION */}
                <section>
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <i className="fa-solid fa-ruler-combined text-blue-500"></i> Configuration des Tailles (cm)
                    </h3>
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <p className="text-sm text-gray-500 mb-4">Définissez la HAUTEUR (en cm) de chaque vêtement pour chaque taille. Cette valeur sera utilisée pour calculer la taille réelle du logo.</p>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {Object.entries(productDatabase).map(([type, product]) => (
                                <div key={type} className="border border-gray-200 rounded-lg p-4">
                                    <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                                        {/* @ts-ignore */}
                                        <i className={`fa-solid ${type === 'hoodie' ? 'fa-user-astronaut' : 'fa-shirt'}`}></i>
                                        {product.name}
                                    </h4>
                                    <div className="flex flex-col gap-2">
                                        {product.sizes.map(size => {
                                            const currentHeight = productDimensions?.[type]?.[size] || 0;
                                            return (
                                                <div key={size} className="flex items-center justify-between font-mono text-sm">
                                                    <span className="font-bold w-8">{size}</span>
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="number"
                                                            className="w-20 border border-gray-300 rounded px-2 py-1 outline-none focus:border-blue-500 text-right"
                                                            placeholder="Hauteur cm"
                                                            value={currentHeight || ''}
                                                            onChange={(e) => {
                                                                const val = parseFloat(e.target.value);
                                                                onUpdateDimensions({
                                                                    ...productDimensions,
                                                                    [type]: {
                                                                        ...(productDimensions[type] || {}),
                                                                        [size]: isNaN(val) ? 0 : val
                                                                    }
                                                                });
                                                            }}
                                                        />
                                                        <span className="text-gray-400 text-xs">cm</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-6 flex justify-end">
                            <button
                                onClick={async () => {
                                    try {
                                        await setDoc(doc(db, 'settings', 'dimensions'), productDimensions);
                                        alert("Configurations sauvegardées !");
                                    } catch (e) {
                                        console.error("Error saving dimensions:", e);
                                        alert("Erreur lors de la sauvegarde.");
                                    }
                                }}
                                className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 shadow-lg transition-transform hover:scale-105"
                            >
                                <i className="fa-solid fa-save mr-2"></i> Sauvegarder les Tailles
                            </button>
                        </div>
                    </div>
                </section>


            </div>
        </div>
    );
};
