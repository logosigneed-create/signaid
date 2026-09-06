import { useEffect, useState } from "react";
import { auth, db } from "../firebaseConfig";
import { deleteDoc, doc } from "firebase/firestore";

export default function AdminQuickBar({ uid, companyName }: { uid?: string; companyName?: string }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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

  if (!isAdmin || !uid) return null;

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
