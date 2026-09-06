"use client";

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function LoginPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hasVisionQuery = (window.location.search || '').toLowerCase().includes('vision');
    if (hasVisionQuery && !params.get('tab') && !params.get('uid')) {
      params.set('tab', 'prospects');
      if (!params.get('search')) {
        params.set('search', 'vision');
      }
    }
    const query = params.toString() ? `?${params.toString()}` : '';
    navigate(`/vitrine-admin/dashboard${query}`, { replace: true });
  }, [navigate]);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#020617', color: '#64748b', fontFamily: 'monospace' }}>
      REDIRECTION VERS LA CONSOLE...
    </div>
  );
}
