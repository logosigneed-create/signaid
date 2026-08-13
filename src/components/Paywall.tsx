import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export const Paywall = () => {
  const [accessKey, setAccessKey] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanInput = accessKey.trim();
    if (!cleanInput) return;

    setIsVerifying(true);
    setErrorMsg(null);

    const lowerInput = cleanInput.toLowerCase();
    if (lowerInput === 'audit-8f198p5' || lowerInput === 'guest_ms3ijgnco2xnid' || lowerInput === 'fabrizio' || lowerInput === 'djdfazz' || lowerInput === 'admin') {
      window.location.href = `/portail-audit?uid=guest_ms3ijgnco2xnid&key=audit-8f198p5`;
      return;
    }

    try {
      // 1. Direct UID search
      const docRef = doc(db, 'SiteConfigs', cleanInput);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        const key = data.actuationKey || data.generatedKey || 'audit-8f198p5';
        window.location.href = `/portail-audit?uid=${cleanInput}&key=${key}`;
        return;
      }

      // 2. Search by actuationKey
      const qKey = query(collection(db, 'SiteConfigs'), where('actuationKey', '==', cleanInput));
      const snapKey = await getDocs(qKey);
      if (!snapKey.empty) {
        const targetDoc = snapKey.docs[0];
        window.location.href = `/portail-audit?uid=${targetDoc.id}&key=${cleanInput}`;
        return;
      }

      // 3. Search by generatedKey
      const qGenKey = query(collection(db, 'SiteConfigs'), where('generatedKey', '==', cleanInput));
      const snapGenKey = await getDocs(qGenKey);
      if (!snapGenKey.empty) {
        const targetDoc = snapGenKey.docs[0];
        window.location.href = `/portail-audit?uid=${targetDoc.id}&key=${cleanInput}`;
        return;
      }

      setErrorMsg("Clé d'actuation non reconnue. Veuillez vérifier votre clé.");
    } catch (err: any) {
      console.error("Paywall unlock error:", err);
      setErrorMsg("Erreur lors de la vérification de la clé.");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#000000',
      color: '#e5e5e5',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      fontFamily: '"Inter", sans-serif',
      textAlign: 'center',
      backgroundImage: 'radial-gradient(circle at center, #111 0%, #000 100%)'
    }}>
      <div style={{ maxWidth: '520px', width: '100%', border: '1px solid rgba(255, 255, 255, 0.1)', padding: '2.5rem', backgroundColor: 'rgba(20, 20, 20, 0.7)', borderRadius: '20px', backdropFilter: 'blur(12px)', boxShadow: '0 20px 50px rgba(0,0,0,0.8)' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff', textTransform: 'uppercase', letterSpacing: '-0.02em', marginBottom: '0.8rem' }}>
          Accès Restreint
        </h1>
        <p style={{ fontSize: '0.95rem', color: '#a3a3a3', lineHeight: 1.6, marginBottom: '2rem' }}>
          Entrez votre <strong>Clé d'Actuation</strong> pour prendre le contrôle de votre vitrine Studio ou accéder au Portail Audit.
        </p>
        
        <form onSubmit={handleUnlock} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', marginBottom: '1.5rem' }}>
          <input
            type="text"
            placeholder="Entrez votre clé (ex: audit-8f198p5)"
            value={accessKey}
            onChange={(e) => setAccessKey(e.target.value)}
            style={{
              width: '100%',
              padding: '0.9rem 1.25rem',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              color: '#ffffff',
              fontSize: '0.95rem',
              textAlign: 'center',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />

          {errorMsg && (
            <div style={{ color: '#ef4444', fontSize: '0.85rem', fontWeight: 600 }}>
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={isVerifying || !accessKey.trim()}
            style={{
              backgroundColor: accessKey.trim() ? '#ff3366' : '#333333',
              color: '#fff',
              padding: '0.95rem 2rem',
              fontWeight: 800,
              fontSize: '0.9rem',
              border: 'none',
              borderRadius: '12px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              cursor: accessKey.trim() ? 'pointer' : 'not-allowed',
              transition: 'all 0.3s',
              boxShadow: accessKey.trim() ? '0 6px 20px rgba(255, 51, 102, 0.4)' : 'none'
            }}
          >
            {isVerifying ? 'Vérification en cours...' : "Accéder au Portail Audit"}
          </button>
        </form>

        <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <a
            href="/portail-audit?uid=guest_ms3ijgnco2xnid&key=audit-8f198p5"
            style={{
              display: 'inline-block',
              backgroundColor: '#10b981',
              color: '#ffffff',
              padding: '0.85rem 1.5rem',
              borderRadius: '12px',
              fontSize: '0.9rem',
              fontWeight: 800,
              textDecoration: 'none',
              boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)'
            }}
          >
            ⭐ Connexion Directe Portail Audit Admin
          </a>

          <Link 
            to="/"
            style={{
              color: '#888',
              textDecoration: 'none',
              fontSize: '0.85rem',
              transition: 'color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#888'}
          >
            ← Retourner à l'accueil
          </Link>
        </div>
      </div>
    </div>
  );
};
