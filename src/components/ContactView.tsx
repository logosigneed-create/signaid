import React, { useState } from 'react';
import { logAnalyticsEvent } from '../services/analyticsService';
import { db } from '../firebaseConfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { sanitizeForFirestore } from '../utils/firestoreSanitizer';

import emailjs from '@emailjs/browser';

// --- CONFIGURATION EMAILJS ---
// Pour activer les notifications :
// 1. Créez un compte sur https://www.emailjs.com/
// 2. Créez un "Email Service" (Gmail) -> SERVICE_ID
// 3. Créez un "Email Template" -> TEMPLATE_ID
// 4. Récupérez votre "Public Key" -> PUBLIC_KEY
const EMAILJS_CONFIG = {
    SERVICE_ID: "service_e0xn0lc",
    TEMPLATE_ID: "template_yujevvw",
    PUBLIC_KEY: "6B9hT2cj9B_3tFtKd"    // User provided Key
};

export const ContactView: React.FC = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !message) {
            setError("L'email et le message sont requis.");
            return;
        }

        setSending(true);
        setError('');

        try {
            // STEP 1: FIRESTORE
            console.log("Step 1: Save to Firestore...");
            try {
                await addDoc(collection(db, 'contact_messages'), sanitizeForFirestore({
                    name,
                    email,
                    message,
                    timestamp: serverTimestamp(),
                    status: 'new'
                }));
                console.log("Firestore Save Success");
            } catch (fsErr: any) {
                console.error("Firestore Error:", fsErr);
                throw new Error("Erreur Sauvegarde Base de Données: " + (fsErr.message || fsErr));
            }

            // STEP 2: EMAILJS
            if (EMAILJS_CONFIG.PUBLIC_KEY !== "YOUR_PUBLIC_KEY") {
                console.log("Step 2: Send Email...");
                try {
                    const emailResult = await emailjs.send(
                        EMAILJS_CONFIG.SERVICE_ID,
                        EMAILJS_CONFIG.TEMPLATE_ID,
                        {
                            from_name: name,
                            from_email: email,
                            message: message,
                            to_email: 'logosigneed@gmail.com'
                        },
                        EMAILJS_CONFIG.PUBLIC_KEY
                    );
                    console.log("EmailJS Success:", emailResult);
                } catch (emailError: any) {
                    // We DO NOT BLOCK the process if email fails, but we warn
                    console.error("EmailJS FAILED:", emailError);
                    alert("Avertissement: Message enregistré mais l'alerte email a échoué.\nErreur: " + (emailError.text || emailError.message || JSON.stringify(emailError)));
                }
            }

            // STEP 3: ANALYTICS & RESET
            try {
                logAnalyticsEvent('contact_form_submit', { name, email, message });
            } catch (e: any) {
                console.warn("Analytics Failed:", e);
            }

            setSent(true);
            setName('');
            setEmail('');
            setMessage('');

        } catch (err: any) {
            console.error("GLOBAL ERROR:", err);
            // Robust Error Display
            let errMsg = "Erreur inconnue";
            if (typeof err === "string") errMsg = err;
            else if (err?.message) errMsg = err.message;
            else {
                try {
                    errMsg = JSON.stringify(err);
                } catch (e) {
                    errMsg = "Objet Erreur non-convertible";
                }
            }
            setError("Erreur: " + errMsg);
        } finally {
            setSending(false);
        }
    };

    if (sent) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center animate-fade-in">
                <div className="w-20 h-20 bg-green-100 text-green-500 rounded-full flex items-center justify-center text-3xl mb-6 shadow-sm">
                    <i className="fa-solid fa-check"></i>
                </div>
                <h2 className="text-3xl font-black text-gray-900 mb-4">Message Envoyé !</h2>
                <p className="text-gray-600 max-w-md mx-auto mb-8 text-lg">
                    Merci de nous avoir contactés. L'équipe SIGNAID reviendra vers vous très rapidement à l'adresse fournie.
                </p>
                <button
                    onClick={() => setSent(false)}
                    className="px-8 py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-black transition-all"
                >
                    Envoyer un autre message
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-[1025px] mx-auto p-4 md:p-12 animate-fade-in">
            <div className="text-center mb-8">
                <h1 className="text-3xl md:text-5xl font-black text-gray-900 mb-2 tracking-tight">
                    Contact <span className="text-orange-600">Pro</span>
                </h1>
                <p className="text-gray-500 text-lg">
                    Une question sur la production, un partenariat ou un problème technique ?
                    <br />Écrivez-nous directement.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="p-4 bg-red-50 text-red-600 rounded-lg text-sm font-bold flex items-center gap-2">
                                <i className="fa-solid fa-circle-exclamation"></i>
                                {error}
                            </div>
                        )}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Nom & Prénom</label>
                            <input
                                type="text"
                                placeholder="Votre nom"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-orange-500 transition-colors"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Adresse Email *</label>
                            <input
                                type="email"
                                placeholder="votre@email.com"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                required
                                className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-orange-500 transition-colors"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Message *</label>
                            <textarea
                                placeholder="Comment pouvons-nous vous aider ?"
                                value={message}
                                onChange={e => setMessage(e.target.value)}
                                required
                                rows={5}
                                className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-orange-500 transition-colors resize-none"
                            ></textarea>
                        </div>

                        <button
                            type="submit"
                            disabled={sending}
                            className="w-full py-4 bg-gray-900 text-white font-bold text-lg rounded-xl hover:bg-black transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                        >
                            {sending ? (
                                <>
                                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                                    Envoi en cours...
                                </>
                            ) : (
                                <>
                                    <i className="fa-solid fa-paper-plane text-orange-400"></i>
                                    Envoyer le message
                                </>
                            )}
                        </button>
                    </form>
                </div>

                <div className="space-y-8 mt-4">
                    <div className="flex items-start gap-4 p-6 bg-orange-50 rounded-2xl border border-orange-100">
                        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-orange-500 text-xl shadow-sm shrink-0">
                            <i className="fa-solid fa-envelope"></i>
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-gray-900 mb-1">Email Direct</h3>
                            <p className="text-gray-600 mb-2 text-sm leading-relaxed">
                                Préférez-vous passer par votre client mail ?
                            </p>
                            <a href="mailto:info@signaid.eu" className="text-orange-600 font-bold hover:underline">
                                info@signaid.eu
                            </a>
                        </div>
                    </div>

                    <div className="flex items-start gap-4 p-6 bg-zinc-50 rounded-2xl border border-gray-200">
                        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-gray-800 text-xl shadow-sm shrink-0">
                            <i className="fa-brands fa-whatsapp"></i>
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-gray-900 mb-1">Support Rapide</h3>
                            <p className="text-gray-600 text-sm leading-relaxed mb-2">
                                Une réponse urgente ? Contactez l'équipe de production sur le canal dédié aux membres.
                            </p>
                            <a href="https://wa.me/32479359439?text=Bonjour%20Signeed!%20J'ai%20une%20question%20sur%20mon%20projet." target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-green-600 font-bold hover:underline">
                                <i className="fa-brands fa-whatsapp"></i> +32 479 35 94 39
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
