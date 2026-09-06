import React, { useState, useEffect } from 'react';
import { 
    HardHat, 
    Calendar, 
    MapPin, 
    MessageSquare, 
    Mail, 
    ShieldCheck, 
    ChevronRight, 
    ExternalLink,
    LayoutGrid,
    Zap,
    Users,
    Settings,
    LogOut
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SEO } from './components/SEO';
import { BRANDING } from './constants/branding';

const PortalPage: React.FC = () => {
    const navigate = useNavigate();
    const [userEmail, setUserEmail] = useState<string | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        const email = localStorage.getItem('btp_last_email');
        setUserEmail(email);
        if (email === BRANDING.contact.adminEmail || email === 'nicolas@signaid.be') {
            setIsAdmin(true);
        }
    }, []);

    const portalCards = [
        {
            id: 'btp-audit',
            title: "Signaid BTP",
            subtitle: "AUDIT DE MARQUE CHANTIER",
            description: "Analysez la visibilité de votre logo sur les équipements de sécurité fluo et bicolores.",
            icon: <HardHat className="w-8 h-8" />,
            path: "/btp-audit",
            color: "from-orange-500 to-orange-700",
            status: "ACTIF"
        },
        {
            id: 'dotation',
            title: "Espace Dotation",
            subtitle: "GESTION DES ÉQUIPES",
            description: "Commandez les packs de vêtements pour vos ouvriers en fonction de leurs tailles.",
            icon: <Users className="w-8 h-8" />,
            path: "/portal?mode=dotation",
            color: "from-blue-600 to-indigo-800",
            status: "ACTIF"
        },
        {
            id: 'studio',
            title: "IA Studio",
            subtitle: "CRÉATION DE MERCH",
            description: "Générez des designs uniques pour votre communication d'entreprise.",
            icon: <Zap className="w-8 h-8" />,
            path: "/galerie",
            color: "from-zinc-700 to-zinc-900",
            status: "STUDIO V24"
        }
    ];

    const contactButtons = [
        {
            label: BRANDING.address.street,
            icon: <MapPin className="w-5 h-5" />,
            url: BRANDING.address.mapsUrl,
            color: "bg-white/5 hover:bg-white/10 text-zinc-300"
        },
        {
            label: "Prendre RDV",
            icon: <Calendar className="w-5 h-5" />,
            url: BRANDING.contact.calendar,
            color: "bg-orange-600 hover:bg-orange-500 text-white"
        },
        {
            label: "WhatsApp",
            icon: <MessageSquare className="w-5 h-5" />,
            url: BRANDING.contact.whatsapp,
            color: "bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366]"
        },
        {
            label: "Email",
            icon: <Mail className="w-5 h-5" />,
            url: `mailto:${BRANDING.contact.email}`,
            color: "bg-blue-500/10 hover:bg-blue-500/20 text-blue-400"
        }
    ];

    return (
        <div className="min-h-screen bg-[#020202] text-zinc-100 font-sans selection:bg-orange-500 selection:text-black italic uppercase overflow-x-hidden">
            <SEO title="Mon Portail IA" description="Accédez à vos outils de branding et gestion BTP." />

            {/* BACKGROUND GRADIENTS */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-600/10 blur-[120px] rounded-full animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '2s' }}></div>
            </div>

            {/* HEADER */}
            <header className="relative z-10 p-8 flex justify-between items-center max-w-7xl mx-auto border-b border-white/5 backdrop-blur-md sticky top-0">
                <div className="flex items-center gap-4 cursor-pointer hover:scale-105 transition-transform" onClick={() => navigate('/')}>
                    <div className="w-10 h-10 bg-orange-600 flex items-center justify-center font-black text-black text-xl shadow-[4px_4px_0_white]">S</div>
                    <span className="font-black text-xl tracking-tight hidden sm:block">SIGNAID <span className="text-orange-600">PRO</span></span>
                </div>

                <div className="flex items-center gap-4">
                    {userEmail ? (
                        <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-2 rounded-full backdrop-blur-sm">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            <span className="text-[10px] font-black tracking-widest">{userEmail.toUpperCase()}</span>
                            <button 
                                onClick={() => { localStorage.removeItem('btp_last_email'); window.location.reload(); }}
                                className="ml-2 p-1 hover:text-orange-600 transition-colors"
                            >
                                <LogOut size={14} />
                            </button>
                        </div>
                    ) : (
                        <button 
                            onClick={() => navigate('/btp-audit')}
                            className="bg-white/5 border border-white/10 px-6 py-2 rounded-full font-black text-[10px] tracking-widest hover:bg-orange-600 hover:text-black transition-all"
                        >
                            SE CONNECTER
                        </button>
                    )}
                </div>
            </header>

            <main className="relative z-10 max-w-7xl mx-auto p-6 pt-16 pb-32">
                {/* HERO TITLE */}
                <div className="mb-20 text-center sm:text-left">
                    <h1 className="text-6xl md:text-8xl font-black italic tracking-tighter leading-[0.8] uppercase mb-4">
                        MON PORTAIL <br />
                        <span className="text-orange-600">INTELLIGENT IA.</span>
                    </h1>
                    <p className="text-zinc-500 font-bold text-xs tracking-[0.5em] uppercase italic">Écosystème de production • Signaid Studio</p>
                </div>

                {/* MAIN CARDS */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
                    {portalCards.map((card) => (
                        <div 
                            key={card.id}
                            onClick={() => navigate(card.path)}
                            className="group relative bg-zinc-950 border border-white/5 p-8 overflow-hidden cursor-pointer hover:border-orange-600/50 transition-all duration-500"
                        >
                            {/* Card Background Glow */}
                            <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${card.color} opacity-10 blur-3xl group-hover:opacity-30 transition-opacity`}></div>
                            
                            <div className="relative z-10 h-full flex flex-col justify-between">
                                <div className="space-y-6">
                                    <div className={`w-14 h-14 bg-gradient-to-br ${card.color} flex items-center justify-center text-white shadow-xl group-hover:scale-110 transition-transform duration-500`}>
                                        {card.icon}
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-orange-600 font-black text-[9px] tracking-[0.3em]">{card.subtitle}</p>
                                        <h2 className="text-3xl font-black italic tracking-tighter uppercase">{card.title}</h2>
                                        <p className="text-zinc-500 font-medium text-xs normal-case leading-relaxed">{card.description}</p>
                                    </div>
                                </div>
                                
                                <div className="mt-8 flex items-center justify-between">
                                    <span className="text-[10px] font-black tracking-widest text-zinc-700">{card.status}</span>
                                    <div className="w-10 h-10 border border-white/10 flex items-center justify-center group-hover:bg-white group-hover:text-black transition-all">
                                        <ChevronRight size={20} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* INTERACTIVE LINKS SECTION */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center border-t border-white/5 pt-20">
                    <div className="lg:col-span-5 space-y-6">
                        <div className="inline-flex items-center gap-3 px-4 py-1.5 bg-orange-600/10 border border-orange-600/20 text-orange-600 text-[10px] font-black tracking-[0.3em] uppercase italic">
                            <ShieldCheck size={14} /> CERTIFIÉ SIGNAID PRO
                        </div>
                        <h2 className="text-4xl font-black italic tracking-tighter uppercase leading-none">
                            Besoin d'un <span className="text-orange-600">Accompagnement ?</span>
                        </h2>
                        <p className="text-zinc-400 font-medium text-sm normal-case leading-relaxed">
                            Nos experts en branding BTP sont disponibles pour optimiser votre visibilité sur chantier. Prenez rendez-vous ou contactez-nous directement.
                        </p>
                    </div>

                    <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {contactButtons.map((btn, idx) => (
                            <a 
                                key={idx}
                                href={btn.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`flex items-center gap-4 p-5 border border-white/5 ${btn.color} transition-all duration-300 group`}
                            >
                                <div className="w-10 h-10 flex items-center justify-center border border-current/20 group-hover:rotate-12 transition-transform">
                                    {btn.icon}
                                </div>
                                <div className="flex-1">
                                    <p className="font-black text-xs tracking-widest uppercase italic">{btn.label}</p>
                                    <div className="h-px w-0 group-hover:w-full bg-current transition-all duration-500 mt-1 opacity-50"></div>
                                </div>
                                <ExternalLink size={14} className="opacity-30 group-hover:opacity-100 transition-opacity" />
                            </a>
                        ))}
                    </div>
                </div>

                {/* ADMIN SECTION (CONDITIONAL) */}
                {isAdmin && (
                    <div className="mt-32 p-12 bg-zinc-950 border-2 border-dashed border-zinc-800 hover:border-blue-600/50 transition-all group">
                        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
                            <div className="space-y-4 text-center md:text-left">
                                <div className="flex items-center gap-3 justify-center md:justify-start text-blue-500 font-black text-[10px] tracking-widest uppercase">
                                    <Settings className="animate-spin-slow" size={18} /> PANNEAU ADMINISTRATION
                                </div>
                                <h3 className="text-4xl font-black italic tracking-tighter uppercase">Gestion des <span className="text-blue-500">Commandes.</span></h3>
                                <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Accès privilégié : Suivi des dotations et audits en cours.</p>
                            </div>
                            <button 
                                onClick={() => navigate('/admin')}
                                className="px-10 py-6 bg-blue-600 text-white font-black text-xl italic tracking-tighter uppercase hover:bg-white hover:text-black transition-all shadow-[8px_8px_0_rgba(37,99,235,0.2)]"
                            >
                                ACCÉDER AU BACK-OFFICE
                            </button>
                        </div>
                    </div>
                )}
            </main>

            {/* FOOTER */}
            <footer className="relative z-10 p-12 border-t border-white/5 bg-black/50 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8 text-zinc-600 font-black text-[9px] tracking-[0.4em] uppercase italic">
                    <div className="flex items-center gap-6">
                        <span>© 2024 SIGNAID SYSTEM</span>
                        <div className="w-1 h-1 bg-zinc-800 rounded-full"></div>
                        <span>V24.8.2-PRO</span>
                    </div>
                    <div className="flex gap-8">
                        <a href="#" className="hover:text-orange-600 transition-colors">CONDITIONS</a>
                        <a href="#" className="hover:text-orange-600 transition-colors">PRIVACY</a>
                        <a href="#" className="hover:text-orange-600 transition-colors">SUPPORT</a>
                    </div>
                </div>
            </footer>

            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                .animate-spin-slow { animation: spin-slow 8s linear infinite; }
            `}} />
        </div>
    );
};

export default PortalPage;
