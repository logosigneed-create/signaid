"use client";

import React, { useEffect, useState } from "react";
import GenericAuditPage from "../../GenericAuditPage";
import { BrowserRouter } from "react-router-dom";

export default function PortailAuditPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <BrowserRouter>
      <React.Suspense fallback={null}>
        <GenericAuditPage />
      </React.Suspense>
    </BrowserRouter>
  );
}
