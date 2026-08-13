import { useEffect, useState } from "react";
import { auth, db } from "../firebaseConfig";
import { deleteDoc, doc } from "firebase/firestore";

export default function AdminQuickBar({ uid, companyName }: { uid?: string; companyName?: string }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const checkIsAdmin = () => {
      const isMaster = sessionStorage.getItem("master_admin_session") === "true";
      const isAuthAdmin = auth.currentUser?.email === "logosigneed@gmail.com";
      setIsAdmin(isMaster || isAuthAdmin);
    };
    checkIsAdmin();
    const unsub = auth.onAuthStateChanged(() => checkIsAdmin());
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
        window.location.href = "/vitrine-admin/dashboard?tab=prospects";
      } catch (err: any) {
        console.error("Failed to delete prospect", err);
        alert("Erreur lors de la suppression du prospect : " + (err?.message || err));
      } finally {
        setIsDeleting(false);
      }
    }
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: '1.2rem',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 99999,
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
      fontWeight: 700
    }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#f87171' }}>
        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }} />
        <span>ADMIN : {companyName || uid}</span>
      </span>

      <button
        onClick={() => window.location.href = `/vitrine-admin/dashboard?uid=${uid}`}
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
  );
}
