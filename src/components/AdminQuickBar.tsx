import { useEffect, useState } from "react";
import { auth, db } from "../firebaseConfig";
import { deleteDoc, doc, updateDoc } from "firebase/firestore";

export default function AdminQuickBar({ 
  uid, 
  companyName,
  currentTheme = 'auto',
  onThemeChange
}: { 
  uid?: string; 
  companyName?: string;
  currentTheme?: 'dark' | 'light' | 'auto';
  onThemeChange?: (newTheme: 'dark' | 'light' | 'auto') => void;
}) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [hasAdminContext, setHasAdminContext] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeTheme, setActiveTheme] = useState<'dark' | 'light' | 'auto'>(currentTheme || 'auto');
  const [isUpdatingTheme, setIsUpdatingTheme] = useState(false);

  useEffect(() => {
    if (currentTheme) setActiveTheme(currentTheme);
  }, [currentTheme]);

  useEffect(() => {
    const checkContext = () => {
      if (typeof window === 'undefined') return false;
      const params = new URLSearchParams(window.location.search);
      const hasPreviewParam = params.get('preview') === 'admin' || params.has('admin') || params.get('mode') === 'admin';
      const isFromVitrineAdmin = typeof document !== 'undefined' && (
        document.referrer.includes('/vitrine-admin') ||
        document.referrer.includes('/admin') ||
        window.location.pathname.startsWith('/vitrine-admin')
      );
      return Boolean(hasPreviewParam || isFromVitrineAdmin);
    };

    setHasAdminContext(checkContext());
  }, []);

  useEffect(() => {
    const checkIsAdmin = (user: any) => {
      const email = user?.email?.toLowerCase();
      const isAuthAdmin = email === "logosigneed@gmail.com" || email === "nicolas@signaid.be";
      setIsAdmin(Boolean(isAuthAdmin));
    };

    // Vérification initiale basée sur le currentUser Firebase
    checkIsAdmin(auth.currentUser);

    // Écoute des changements d'état d'authentification Firebase
    const unsub = auth.onAuthStateChanged((user) => checkIsAdmin(user));
    return () => unsub();
  }, []);

  // La barre ne s'affiche JAMAIS sur les URLs publiques directes pour les visiteurs ou prospects.
  // Elle ne doit s'afficher QUE si :
  // 1. L'utilisateur est authentifié avec des droits admin
  // ET
  // 2. L'URL contient explicitement '?preview=admin' OU provient de '/vitrine-admin'.
  if (!isAdmin || !hasAdminContext || !uid) return null;

  const handleToggleTheme = async () => {
    const nextTheme: 'dark' | 'light' | 'auto' = 
      activeTheme === 'auto' ? 'light' : (activeTheme === 'light' ? 'dark' : 'auto');
    
    setActiveTheme(nextTheme);
    onThemeChange?.(nextTheme);
    setIsUpdatingTheme(true);
    try {
      await updateDoc(doc(db, "SiteConfigs", uid), { theme: nextTheme });
      try {
        sessionStorage.setItem(`signaid_theme_${uid}`, nextTheme);
        localStorage.setItem(`signaid_theme_${uid}`, nextTheme);
      } catch {}
    } catch (e) {
      console.warn("Could not save theme change to Firestore:", e);
    } finally {
      setIsUpdatingTheme(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm(`⚠️ SUPPRESSION ADMINISTRATEUR\n\nVoulez-vous vraiment supprimer définitivement le profil prospect "${companyName || uid}" (${uid}) ?\nCette action est irréversible.`)) {
      setIsDeleting(true);
      try {
        await deleteDoc(doc(db, "SiteConfigs", uid));
        try { await deleteDoc(doc(db, "btp_projects", uid)); } catch {}
        try { await deleteDoc(doc(db, "anonymous_previews", uid)); } catch {}
        alert("✅ Profil prospect supprimé avec succès !");
        window.location.href = "/vitrine-admin?tab=prospects";
      } catch (err: any) {
        console.error("Failed to delete prospect", err);
        alert("Erreur lors de la suppression du prospect : " + (err?.message || err));
      } finally {
        setIsDeleting(false);
      }
    }
  };

  return (
    <div className="pointer-events-none" style={{ pointerEvents: 'none' }}>
      <div 
        className="pointer-events-auto"
        style={{
          position: 'fixed',
          bottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 99999,
          pointerEvents: 'auto',
          background: 'rgba(15, 23, 42, 0.95)',
          backdropFilter: 'blur(16px)',
          border: '1.5px solid rgba(239, 68, 68, 0.5)',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.7), 0 0 20px rgba(239, 68, 68, 0.3)',
          borderRadius: '100px',
          padding: '0.5rem 1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          color: '#ffffff',
          fontSize: '0.82rem',
          fontWeight: 700,
          maxWidth: '92vw',
          boxSizing: 'border-box'
        }}
      >
      <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#f87171' }}>
        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }} />
        <span>ADMIN : {companyName || uid}</span>
      </span>

      <button
        onClick={handleToggleTheme}
        disabled={isUpdatingTheme}
        title="Basculez le thème du profil : Auto (Jour/Nuit selon l'heure de Paris), Clair ou Sombre permanent."
        style={{
          background: activeTheme === 'light' ? 'rgba(234, 179, 8, 0.25)' : (activeTheme === 'dark' ? 'rgba(99, 102, 241, 0.25)' : 'rgba(255, 255, 255, 0.12)'),
          border: activeTheme === 'light' ? '1px solid rgba(234, 179, 8, 0.6)' : (activeTheme === 'dark' ? '1px solid rgba(99, 102, 241, 0.6)' : '1px solid rgba(255, 255, 255, 0.25)'),
          color: activeTheme === 'light' ? '#fde047' : (activeTheme === 'dark' ? '#a5b4fc' : '#ffffff'),
          padding: '0.4rem 0.9rem',
          borderRadius: '100px',
          fontWeight: 800,
          cursor: 'pointer',
          fontSize: '0.78rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.35rem',
          transition: 'all 0.2s ease'
        }}
      >
        <span>{activeTheme === 'light' ? '☀️ Mode Clair' : (activeTheme === 'dark' ? '🌙 Mode Sombre' : '🔄 Thème Auto')}</span>
      </button>

      <button
        onClick={() => window.location.href = `/vitrine-admin?uid=${uid}`}
        style={{
          background: 'rgba(79, 70, 229, 0.2)',
          border: '1px solid rgba(79, 70, 229, 0.5)',
          color: '#818cf8',
          padding: '0.4rem 0.9rem',
          borderRadius: '100px',
          fontWeight: 800,
          cursor: 'pointer',
          fontSize: '0.78rem'
        }}
      >
        ✏️ Éditer dans la Console
      </button>

      <button
        onClick={handleDelete}
        disabled={isDeleting}
        style={{
          background: 'rgba(239, 68, 68, 0.2)',
          border: '1px solid rgba(239, 68, 68, 0.6)',
          color: '#f87171',
          padding: '0.4rem 0.9rem',
          borderRadius: '100px',
          fontWeight: 800,
          cursor: 'pointer',
          fontSize: '0.78rem'
        }}
      >
        {isDeleting ? "Suppression..." : "🗑️ Supprimer ce Prospect"}
      </button>
    </div>
    </div>
  );
}
