"use client";

import React, { useEffect, useState } from "react";
import ProductPortal from "../../ProductPortal";
import { BrowserRouter } from "react-router-dom";

export default function PortailShopPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <BrowserRouter>
      <ProductPortal />
    </BrowserRouter>
  );
}
