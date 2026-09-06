import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Zap, Send, CheckCircle2, Building2, Globe2, Mail } from 'lucide-react';
import { SEO } from './components/SEO';
import { db } from './firebaseConfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const LandingPage: React.FC = () => {
    const navigate = useNavigate();

    // Form states
    const [projectName, setProjectName] = useState('');
    const [socialLink, setSocialLink] = useState('');
    const [email, setEmail] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const scrollToForm = () => {
        const formElement = document.getElementById('candidature-form');
        if (formElement) {
            formElement.scrollIntoView({ behavior: 'smooth' });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMessage('');

        if (!projectName.trim()) {
            setErrorMessage('Veuillez renseigner le nom de votre projet ou entreprise.');
            return;
        }

        if (!email.trim() || !email.includes('@')) {
            setErrorMessage('Veuillez renseigner une adresse email valide.');
            return;
        }

        setIsSubmitting(true);
        try {
            await addDoc(collection(db, 'prospect_requests'), {
                projectName: projectName.trim(),
                socialLink: socialLink.trim(),
                email: email.trim().toLowerCase(),
                status: 'pending',
                source: 'landing_page',
                createdAt: serverTimestamp(),
                submittedAt: new Date().toISOString()
            });

            setIsSubmitted(true);
        } catch (err: any) {
            console.error('Erreur enregistrement prospect_requests:', err);
            setErrorMessage("Une erreur est survenue lors de l'envoi de votre candidature. Veuillez réessayer.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#111111] text-white font-sans selection:bg-orange-500/30 overflow-x-hidden uppercase">
            <SEO 
                title="Signaid | Candidature & Audit d'Autorité BTP"
                description="Déposez votre candidature pour auditer votre logo. Transformez l'image de vos équipes de chantier."
            />

            {/* SECTION 1 : LE HOOK (HERO) */}
            <section className="relative min-h-screen flex flex-col items-center justify-center px-4 py-16 md:py-24 border-b-8 border-orange-600">
                {/* Background Texture Overlay */}
                <div className="absolute inset-0 opacity-10 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/asphalt-dark.png')]"></div>
                
                <div className="max-w-5xl mx-auto text-center relative z-10 w-full">
                    <div className="inline-block bg-orange-600 text-black font-black px-4 py-1 mb-6 md:mb-8 uppercase tracking-[0.2em] text-xs md:text-sm skew-x-[-10deg]">
                        Système Propriétaire Signaid
                    </div>
                    
                    <h1 className="text-4xl md:text-7xl lg:text-8xl font-black tracking-tighter leading-[0.95] mb-6 md:mb-10 uppercase italic text-white">
                        Votre image sur chantier <br />
                        <span className="text-orange-500">vous fait-elle perdre des contrats ?</span>
                    </h1>

                    <p className="text-lg md:text-2xl text-gray-400 font-bold max-w-3xl mx-auto leading-tight mb-10 md:mb-14 uppercase">
                        80% des PME du bâtiment utilisent des logos amateurs. Postulez pour faire auditer votre identité visuelle et <span className="text-white underline decoration-orange-600 underline-offset-8">imposez votre autorité</span>.
                    </p>

                    {/* FORMULAIRE DE CANDIDATURE / CONTACT DIRECT */}
                    <div id="candidature-form" className="max-w-xl mx-auto bg-zinc-950/95 border-2 border-orange-600/60 p-6 md:p-8 shadow-[0_20px_50px_rgba(249,115,22,0.2)] text-left backdrop-blur-md rounded-sm">
                        {isSubmitted ? (
                            <div className="text-center py-6 space-y-4">
                                <CheckCircle2 className="mx-auto text-green-500" size={54} />
                                <h3 className="text-2xl md:text-3xl font-black text-white italic tracking-tight">
                                    CANDIDATURE REÇUE AVEC SUCCÈS !
                                </h3>
                                <p className="text-gray-300 font-medium text-sm md:text-base leading-relaxed normal-case">
                                    Notre équipe analyse l'éligibilité de votre projet <strong className="text-orange-500 uppercase">{projectName}</strong>. Vous recevrez une notification par email à <strong className="text-white normal-case">{email}</strong> avec vos identifiants d'accès personnalisés.
                                </p>
                                <button
                                    onClick={() => {
                                        setIsSubmitted(false);
                                        setProjectName('');
                                        setSocialLink('');
                                        setEmail('');
                                    }}
                                    className="mt-4 px-6 py-2.5 bg-zinc-900 border border-zinc-700 text-xs font-bold text-gray-300 hover:text-white uppercase tracking-wider"
                                >
                                    Déposer une autre candidature
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="border-b border-zinc-800 pb-3 mb-4">
                                    <h3 className="text-xl md:text-2xl font-black text-white uppercase italic tracking-tight">
                                        Demande d'accès & Candidature
                                    </h3>
                                    <p className="text-xs text-gray-400 font-medium tracking-wide normal-case mt-1">
                                        Accès privé sur validation. Remplissez ce formulaire pour soumettre votre dossier.
                                    </p>
                                </div>

                                {errorMessage && (
                                    <div className="p-3 bg-red-950/80 border border-red-500/50 text-red-300 text-xs font-bold uppercase tracking-wide">
                                        ⚠️ {errorMessage}
                                    </div>
                                )}

                                <div>
                                    <label className="block text-xs font-black text-gray-300 mb-1 tracking-wider">
                                        Nom du Projet / Entreprise <span className="text-orange-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                                        <input
                                            type="text"
                                            required
                                            value={projectName}
                                            onChange={(e) => setProjectName(e.target.value)}
                                            placeholder="Ex: BATIMENT PRO TP, DJ FAZZ..."
                                            className="w-full bg-zinc-900 border border-zinc-700 pl-10 pr-4 py-3 text-sm text-white placeholder-zinc-500 font-bold focus:outline-none focus:border-orange-500 uppercase"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-black text-gray-300 mb-1 tracking-wider">
                                        Lien Réseau Social / Site Web
                                    </label>
                                    <div className="relative">
                                        <Globe2 className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                                        <input
                                            type="text"
                                            value={socialLink}
                                            onChange={(e) => setSocialLink(e.target.value)}
                                            placeholder="Instagram, LinkedIn, Facebook, URL..."
                                            className="w-full bg-zinc-900 border border-zinc-700 pl-10 pr-4 py-3 text-sm text-white placeholder-zinc-500 font-bold focus:outline-none focus:border-orange-500 normal-case"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-black text-gray-300 mb-1 tracking-wider">
                                        Adresse E-mail <span className="text-orange-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                                        <input
                                            type="email"
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="contact@entreprise.com"
                                            className="w-full bg-zinc-900 border border-zinc-700 pl-10 pr-4 py-3 text-sm text-white placeholder-zinc-500 font-bold focus:outline-none focus:border-orange-500 normal-case"
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full group mt-4 relative inline-flex items-center justify-center px-8 py-4 bg-orange-600 text-black font-black text-lg md:text-xl uppercase tracking-tighter hover:bg-white transition-all duration-300 shadow-[0_10px_30px_rgba(249,115,22,0.3)] active:scale-98 cursor-pointer disabled:opacity-50"
                                >
                                    {isSubmitting ? (
                                        <span>Traitement en cours...</span>
                                    ) : (
                                        <>
                                            <span>Soumettre ma candidature</span>
                                            <Send className="ml-3 group-hover:translate-x-1 transition-transform" size={20} />
                                        </>
                                    )}
                                </button>
                            </form>
                        )}
                    </div>
                    
                    <div className="mt-8 flex items-center justify-center gap-6 text-gray-500 font-bold uppercase text-xs tracking-widest">
                        <span className="flex items-center gap-2 text-gray-500"><ShieldCheck size={16} /> Validation Manuelle</span>
                        <span className="flex items-center gap-2 text-gray-500"><Zap size={16} /> Réponse sous 24h</span>
                    </div>
                </div>
            </section>

            {/* SECTION 2 : LA PREUVE RAPIDE */}
            <section className="py-24 bg-[#1a1a1a] px-4">
                <div className="max-w-6xl mx-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                        <div className="space-y-12 text-left">
                            <h2 className="text-4xl md:text-5xl font-black uppercase italic tracking-tighter border-l-8 border-orange-600 pl-6 text-white">
                                Le Système <span className="text-orange-500 text-6xl block">Signaid</span>
                            </h2>
                            
                            <div className="space-y-8">
                                <div className="flex gap-6 items-start">
                                    <div className="bg-white text-black w-10 h-10 flex items-center justify-center font-black text-xl flex-shrink-0">1</div>
                                    <p className="text-xl font-bold text-gray-300 uppercase leading-none pt-2 text-left">Vous déposez votre candidature avec votre projet.</p>
                                </div>
                                <div className="flex gap-6 items-start">
                                    <div className="bg-white text-black w-10 h-10 flex items-center justify-center font-black text-xl flex-shrink-0">2</div>
                                    <p className="text-xl font-bold text-gray-300 uppercase leading-none pt-2 text-left">Notre équipe valide l'accès et calibre votre identité de marque.</p>
                                </div>
                                <div className="flex gap-6 items-start">
                                    <div className="bg-orange-600 text-black w-10 h-10 flex items-center justify-center font-black text-xl flex-shrink-0">3</div>
                                    <p className="text-xl font-bold text-white uppercase leading-none pt-2 text-left">Vous visualisez votre équipement premium prêt pour le terrain.</p>
                                </div>
                            </div>
                        </div>

                        {/* PLACEHOLDER VIDÉO */}
                        <div className="relative aspect-video bg-black border-4 border-zinc-800 flex items-center justify-center group overflow-hidden shadow-2xl">
                            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1541888946425-d81bb19480c5?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80')] bg-cover bg-center grayscale opacity-40"></div>
                            <div className="relative z-10 text-center">
                                <div className="w-20 h-20 bg-orange-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform cursor-pointer shadow-lg outline outline-offset-4 outline-orange-600/30">
                                    <div className="w-0 h-0 border-t-[10px] border-t-transparent border-l-[18px] border-l-black border-b-[10px] border-b-transparent ml-1"></div>
                                </div>
                                <span className="text-white font-black uppercase tracking-widest text-xs">Démo Système (15s)</span>
                            </div>
                            {/* SCANNER EFFECT ANIMATION PREVIEW */}
                            <div className="absolute top-0 left-0 w-full h-1 bg-orange-500 shadow-[0_0_15px_#f97316] animate-scan pointer-events-none"></div>
                        </div>
                    </div>
                </div>
            </section>

            {/* SECTION 3 : LE RAPPEL DU CTA */}
            <section className="py-32 px-4 bg-black text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
                
                <div className="relative z-10 max-w-4xl mx-auto text-center">
                    <h2 className="text-5xl md:text-7xl font-black uppercase italic mb-12 tracking-tighter leading-none">
                        Prêt à passer <br />
                        <span className="text-orange-500">en mode premium ?</span>
                    </h2>
                    
                    <button 
                        onClick={scrollToForm}
                        className="group relative inline-flex items-center justify-center px-12 py-8 bg-white text-black font-black text-2xl md:text-4xl uppercase tracking-tighter hover:bg-orange-600 hover:text-white transition-all duration-300 shadow-2xl active:scale-95 cursor-pointer"
                    >
                        Postuler pour un audit
                        <Zap className="ml-4 fill-current" size={32} />
                    </button>
                    
                    <p className="mt-8 text-zinc-600 font-bold uppercase tracking-[0.3em] text-xs">
                        Places limitées • Revue manuelle des candidatures
                    </p>
                </div>
            </section>
            
            {/* FOOTER SIMPLE */}
            <footer className="py-12 bg-[#0a0a0a] border-t border-zinc-900 px-4 text-center space-y-4 relative z-10" style={{ paddingBottom: 'calc(4rem + env(safe-area-inset-bottom, 24px))' }}>
                <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">
                    © {new Date().getFullYear()} SIGNAID BTP • SOLUTIONS D'IDENTIFICATION POUR LE BÂTIMENT
                </p>
                <div className="flex justify-center gap-4 flex-wrap">
                    <button 
                        onClick={() => navigate('/portal')} 
                        className="inline-flex items-center justify-center min-h-[44px] px-6 py-2.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-orange-500 hover:border-orange-500/40 transition-all font-bold text-xs uppercase tracking-wider touch-manipulation cursor-pointer"
                    >
                        Accès Portail
                    </button>
                    <button 
                        onClick={scrollToForm} 
                        className="inline-flex items-center justify-center min-h-[44px] px-6 py-2.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-orange-500 hover:border-orange-500/40 transition-all font-bold text-xs uppercase tracking-wider touch-manipulation cursor-pointer"
                    >
                        Déposer Candidature
                    </button>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
