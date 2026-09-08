/**
 * Pipeline Data Source : Configuration d'Entrée Audit & Portail Produits
 * Ce fichier constitue le point d'entrée unique (Single Source of Truth)
 * pour l'alimentation des audits de marque, des portails boutiques,
 * des mockups 3D / studio et du routage de production fournisseur.
 */

export interface AuditProductEntry {
  id: string;
  sku: string;
  supplierRef: string;
  supplierName: string;
  brand: string;
  model: string;
  title: string;
  category: string;
  garmentType: 'tank_top' | 'tshirt_oversize' | 'tshirt' | 'polo' | 'sweat' | 'business_card';
  composition: string;
  weightGsm: number;
  fit: string;
  features: string[];
  sizes: string[];
  colors: {
    name: string;
    hex: string;
    isPrimary: boolean;
  }[];
  pricing: {
    costPriceHt: number;      // Prix d'achat HT indicatif fournisseur
    retailPriceTtc: number;   // Prix de vente public cible TTC
    currency: string;
    marginEstimated: number;  // Marge brute estimée en €
  };
  mockups: {
    front: string;
    back: string;
    preview?: string;
  };
  frontImageUrl?: string;
  backImageUrl?: string;
  printSpecs: {
    printableAreas: ('front' | 'back' | 'chest_left' | 'chest_right' | 'neck')[];
    recommendedTechnique: 'DTG' | 'ScreenPrint' | 'Embroidery' | 'DTF';
    maxPrintWidthMm: number;
    maxPrintHeightMm: number;
  };
  status: 'active' | 'draft' | 'archived';
}

export interface AuditPortailConfig {
  version: string;
  lastUpdated: string;
  environment: 'local' | 'staging' | 'production';
  targetAudience: string;
  portalId: string;
  brandProfile: {
    companyName: string;
    slug: string;
    sector: string;
    primaryColor: string;
  };
  catalog: AuditProductEntry[];
}

export const AUDIT_PORTAIL_CONFIG: AuditPortailConfig = {
  version: "2.4.0",
  lastUpdated: "2026-09-04",
  environment: "local",
  targetAudience: "Vision Room Official Merchandising and Audit Portal",
  portalId: "clubvisionroom",
  brandProfile: {
    companyName: "Club Vision Room",
    slug: "clubvisionroom",
    sector: "Musique et Evenementiel Electronique",
    primaryColor: "#3b82f6"
  },
  catalog: [
    {
      id: "visionroom-basic-tank",
      sku: "BYBB011-BLK",
      supplierRef: "BYBB011",
      supplierName: "L-Shop-Team",
      brand: "Build Your Brand",
      model: "Basic Tank",
      title: "Débardeur Vision Room",
      category: "Textile / Sans Manches",
      garmentType: "tank_top",
      composition: "100% Coton peigné (Jersey simple)",
      weightGsm: 140,
      fit: "Coupe standard (Regular fit), col rond ras du cou",
      features: [
        "Sans étiquette de marque au col (Tear-away / Label-free)",
        "Maille fine idéale pour impression numérique directe (DTG) et sérigraphie",
        "Finitions renforcées aux emmanchures et au col"
      ],
      sizes: ["S", "M", "L", "XL", "XXL"],
      colors: [
        { name: "Noir", hex: "#000000", isPrimary: true },
        { name: "Blanc", hex: "#ffffff", isPrimary: false },
        { name: "Heather Grey", hex: "#9ca3af", isPrimary: false }
      ],
      pricing: {
        costPriceHt: 4.85,
        retailPriceTtc: 27.99,
        currency: "EUR",
        marginEstimated: 18.48
      },
      mockups: {
        front: "/merch/visionroom/tank-front.webp",
        back: "/merch/visionroom/tank-back.webp",
        preview: "/imported_products/VETEMENTS/debardeur/BYBB011/debardeur-black-BYBB011.png"
      },
      printSpecs: {
        printableAreas: ["front", "back", "chest_left"],
        recommendedTechnique: "DTG",
        maxPrintWidthMm: 280,
        maxPrintHeightMm: 400
      },
      status: "active"
    },
    {
      id: "visionroom-heavyweight-tee",
      sku: "NX7200-BLK",
      supplierRef: "NX7200",
      supplierName: "L-Shop-Team",
      brand: "Next Level Apparel",
      model: "Unisex Heavyweight T-Shirt",
      title: "T-Shirt Heavyweight Oversize",
      category: "Streetwear / Boxy Cut",
      garmentType: "tshirt_oversize",
      composition: "100% Coton peigné Ringspun (Jersey simple haute densité)",
      weightGsm: 230,
      fit: "Coupe Oversize Streetwear avec épaules tombantes (Drop Shoulders)",
      features: [
        "Grammage ultra-lourd 230 g/m² (6.8 oz/yd²)",
        "Col rond large en côtes 1x1 épais et indéformable",
        "Bande de propreté d'épaule à épaule",
        "Étiquette détachable (Tear-away label) pour rebranding direct"
      ],
      sizes: ["XS", "S", "M", "L", "XL", "XXL", "3XL"],
      colors: [
        { name: "Noir", hex: "#000000", isPrimary: true },
        { name: "Graphite Black", hex: "#1c1917", isPrimary: false },
        { name: "Midnight Navy", hex: "#1e293b", isPrimary: false }
      ],
      pricing: {
        costPriceHt: 7.50,
        retailPriceTtc: 34.99,
        currency: "EUR",
        marginEstimated: 21.66
      },
      mockups: {
        front: "/merch/visionroom/oversize-front.webp",
        back: "/merch/visionroom/oversize-back.webp",
        preview: "/imported_products/VETEMENTS/tshirt/NX7200/tshirt-black-NX7200.png"
      },
      printSpecs: {
        printableAreas: ["front", "back", "chest_left", "neck"],
        recommendedTechnique: "DTG",
        maxPrintWidthMm: 350,
        maxPrintHeightMm: 450
      },
      status: "active"
    },
    {
      id: "visionroom-heavyweight-tee-white",
      sku: "NX7200-WHT",
      supplierRef: "NX7200",
      supplierName: "L-Shop-Team",
      brand: "Next Level Apparel",
      model: "Unisex Heavyweight T-Shirt",
      title: "T-Shirt Heavyweight Oversize Blanc",
      category: "Streetwear / Boxy Cut",
      garmentType: "tshirt_oversize",
      composition: "100% Coton peigné Ringspun (Jersey simple haute densité)",
      weightGsm: 230,
      fit: "Coupe Oversize Streetwear avec épaules tombantes (Drop Shoulders)",
      features: [
        "Grammage ultra-lourd 230 g/m² (6.8 oz/yd²)",
        "Col rond large en côtes 1x1 épais et indéformable",
        "Bande de propreté d'épaule à épaule",
        "Étiquette détachable (Tear-away label) pour rebranding direct",
        "Zone d'impression dos déverrouillée A3+ (350x450mm) pour visuel vertical complet (icône + sous-texte)"
      ],
      sizes: ["XS", "S", "M", "L", "XL", "XXL", "3XL"],
      colors: [
        { name: "Blanc", hex: "#ffffff", isPrimary: true }
      ],
      pricing: {
        costPriceHt: 7.50,
        retailPriceTtc: 34.99,
        currency: "EUR",
        marginEstimated: 21.66
      },
      mockups: {
        front: "/assets/tshirt-white-NX7200.png",
        back: "/assets/tshirt-white-NX7200-dos.png",
        preview: "/assets/tshirt-white-NX7200.png"
      },
      frontImageUrl: "/assets/tshirt-white-NX7200.png",
      backImageUrl: "/assets/tshirt-white-NX7200-dos.png",
      printSpecs: {
        printableAreas: ["front", "back", "chest_left", "neck"],
        recommendedTechnique: "DTG",
        maxPrintWidthMm: 350,
        maxPrintHeightMm: 450
      },
      status: "active"
    }
  ]
};

export default AUDIT_PORTAIL_CONFIG;
