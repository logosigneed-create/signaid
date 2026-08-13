"use client";

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function LoginPage() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/vitrine-admin/dashboard" + window.location.search, { replace: true });
  }, [navigate]);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#020617', color: '#64748b', fontFamily: 'monospace' }}>
      REDIRECTION VERS LA CONSOLE...
    </div>
  );
}
