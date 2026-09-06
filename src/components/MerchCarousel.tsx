import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';

export interface MerchItem {
  id: string;
  name: string;
  title?: string;
  price: number;
  currency?: string;
  imageUrl?: string;
  imageFront?: string;
  imageBack?: string;
  frontImageUrl?: string;
  backImageUrl?: string;
  ai?: string | null;
  aiRemastered?: string | null;
  aiBack?: string | null;
  aiRemasteredBack?: string | null;
  mechanical?: string | null;
  base?: string | null;
  images?: Record<string, string>;
  category?: string;
  garment?: string;
  description?: string;
  sizes?: string[];
  colors?: string[];
  color?: string;
  supplierRef?: string;
  actionUrl?: string;
  badge?: string;
  isAvailable?: boolean;
}

/**
 * Fiche produit Débardeur calibrée pour le portail Vision Room
 * Référence Fournisseur L-Shop-Team / Build Your Brand : BYBB011 (Basic Tank)
 */
export const VISION_ROOM_BASIC_TANK: MerchItem = {
  id: 'visionroom-basic-tank',
  name: 'Débardeur Vision Room',
  title: 'Débardeur Vision Room',
  category: 'Textile / Sans Manches',
  supplierRef: 'BYBB011',
  sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL', '5XL'],
  color: 'Noir',
  colors: ['Noir', 'Blanc'],
  price: 27.99,
  currency: '€',
  imageUrl: 'https://firebasestorage.googleapis.com/v0/b/signaid-d2d08.firebasestorage.app/o/btp_mockups%2Fclubvisionroom%2Fweb%2FtankFront_1788698451810.png?alt=media&token=32465cf4-7a0c-48aa-a010-08c999a7d0d1',
  frontImageUrl: 'https://firebasestorage.googleapis.com/v0/b/signaid-d2d08.firebasestorage.app/o/btp_mockups%2Fclubvisionroom%2Fweb%2FtankFront_1788698451810.png?alt=media&token=32465cf4-7a0c-48aa-a010-08c999a7d0d1',
  backImageUrl: 'https://firebasestorage.googleapis.com/v0/b/signaid-d2d08.firebasestorage.app/o/btp_mockups%2Fclubvisionroom%2Fweb%2FtankBack_1788693827691.png?alt=media&token=042abb56-7970-4a26-92dc-2de88698e7a6',
  imageFront: 'https://firebasestorage.googleapis.com/v0/b/signaid-d2d08.firebasestorage.app/o/btp_mockups%2Fclubvisionroom%2Fweb%2FtankFront_1788698451810.png?alt=media&token=32465cf4-7a0c-48aa-a010-08c999a7d0d1',
  imageBack: 'https://firebasestorage.googleapis.com/v0/b/signaid-d2d08.firebasestorage.app/o/btp_mockups%2Fclubvisionroom%2Fweb%2FtankBack_1788693827691.png?alt=media&token=042abb56-7970-4a26-92dc-2de88698e7a6',
  images: {
    front: 'https://firebasestorage.googleapis.com/v0/b/signaid-d2d08.firebasestorage.app/o/btp_mockups%2Fclubvisionroom%2Fweb%2FtankFront_1788698451810.png?alt=media&token=32465cf4-7a0c-48aa-a010-08c999a7d0d1',
    back: 'https://firebasestorage.googleapis.com/v0/b/signaid-d2d08.firebasestorage.app/o/btp_mockups%2Fclubvisionroom%2Fweb%2FtankBack_1788693827691.png?alt=media&token=042abb56-7970-4a26-92dc-2de88698e7a6',
    face: 'https://firebasestorage.googleapis.com/v0/b/signaid-d2d08.firebasestorage.app/o/btp_mockups%2Fclubvisionroom%2Fweb%2FtankFront_1788698451810.png?alt=media&token=32465cf4-7a0c-48aa-a010-08c999a7d0d1',
    dos: 'https://firebasestorage.googleapis.com/v0/b/signaid-d2d08.firebasestorage.app/o/btp_mockups%2Fclubvisionroom%2Fweb%2FtankBack_1788693827691.png?alt=media&token=042abb56-7970-4a26-92dc-2de88698e7a6',
    black_front: 'https://firebasestorage.googleapis.com/v0/b/signaid-d2d08.firebasestorage.app/o/btp_mockups%2Fclubvisionroom%2Fweb%2FtankFront_1788698451810.png?alt=media&token=32465cf4-7a0c-48aa-a010-08c999a7d0d1',
    black_back: 'https://firebasestorage.googleapis.com/v0/b/signaid-d2d08.firebasestorage.app/o/btp_mockups%2Fclubvisionroom%2Fweb%2FtankBack_1788693827691.png?alt=media&token=042abb56-7970-4a26-92dc-2de88698e7a6',
    white_front: 'https://firebasestorage.googleapis.com/v0/b/signaid-d2d08.firebasestorage.app/o/btp_mockups%2Fclubvisionroom%2Fweb%2FtankWhiteFront_1788693827692.png?alt=media&token=3602273b-ef06-4dbd-8dae-809894d7e147',
    white_back: 'https://firebasestorage.googleapis.com/v0/b/signaid-d2d08.firebasestorage.app/o/btp_mockups%2Fclubvisionroom%2Fweb%2FtankWhiteBack_1788693827694.png?alt=media&token=0e6b5a90-6ffe-499d-9a91-71043c6cb636',
  },
  ai: 'https://firebasestorage.googleapis.com/v0/b/signaid-d2d08.firebasestorage.app/o/btp_mockups%2Fclubvisionroom%2Fweb%2FtankFront_1788698451810.png?alt=media&token=32465cf4-7a0c-48aa-a010-08c999a7d0d1',
  aiRemastered: 'https://firebasestorage.googleapis.com/v0/b/signaid-d2d08.firebasestorage.app/o/btp_mockups%2Fclubvisionroom%2Fweb%2FtankFront_1788698451810.png?alt=media&token=32465cf4-7a0c-48aa-a010-08c999a7d0d1',
  aiBack: 'https://firebasestorage.googleapis.com/v0/b/signaid-d2d08.firebasestorage.app/o/btp_mockups%2Fclubvisionroom%2Fweb%2FtankBack_1788693827691.png?alt=media&token=042abb56-7970-4a26-92dc-2de88698e7a6',
  aiRemasteredBack: 'https://firebasestorage.googleapis.com/v0/b/signaid-d2d08.firebasestorage.app/o/btp_mockups%2Fclubvisionroom%2Fweb%2FtankBack_1788693827691.png?alt=media&token=042abb56-7970-4a26-92dc-2de88698e7a6',
  garment: 'tank_top',
  description: 'Débardeur Build Your Brand Basic Tank (BYBB011) en jersey simple 100% coton, 140 g/m², coupe standard col rond sans étiquette au col.',
  badge: 'Capsule Officielle',
  isAvailable: true,
};

/**
 * Fiche produit T-Shirt Heavyweight Oversize pour le portail Vision Room
 * Référence Fournisseur L-Shop-Team / Next Level Apparel : NX7200 (Unisex Heavyweight T-Shirt)
 */
export const VISION_ROOM_HEAVYWEIGHT_TEE: MerchItem = {
  id: 'visionroom-heavyweight-tee',
  name: 'T-Shirt Heavyweight Oversize',
  title: 'T-Shirt Heavyweight Oversize',
  category: 'Streetwear / Boxy Cut',
  supplierRef: 'NX7200',
  sizes: ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'],
  color: 'Noir',
  colors: ['Noir'],
  price: 34.99,
  currency: '€',
  imageUrl: 'https://firebasestorage.googleapis.com/v0/b/signaid-d2d08.firebasestorage.app/o/btp_mockups%2Fclubvisionroom%2Fweb%2FheavyFront_1788693827695.png?alt=media&token=65d0698f-0070-4fc8-a827-0861153b2113',
  frontImageUrl: 'https://firebasestorage.googleapis.com/v0/b/signaid-d2d08.firebasestorage.app/o/btp_mockups%2Fclubvisionroom%2Fweb%2FheavyFront_1788693827695.png?alt=media&token=65d0698f-0070-4fc8-a827-0861153b2113',
  backImageUrl: 'https://firebasestorage.googleapis.com/v0/b/signaid-d2d08.firebasestorage.app/o/btp_mockups%2Fclubvisionroom%2Fweb%2FheavyBack_1788693827696.png?alt=media&token=5645a2aa-48ba-43ba-ad68-1916f9d238e3',
  imageFront: 'https://firebasestorage.googleapis.com/v0/b/signaid-d2d08.firebasestorage.app/o/btp_mockups%2Fclubvisionroom%2Fweb%2FheavyFront_1788693827695.png?alt=media&token=65d0698f-0070-4fc8-a827-0861153b2113',
  imageBack: 'https://firebasestorage.googleapis.com/v0/b/signaid-d2d08.firebasestorage.app/o/btp_mockups%2Fclubvisionroom%2Fweb%2FheavyBack_1788693827696.png?alt=media&token=5645a2aa-48ba-43ba-ad68-1916f9d238e3',
  images: {
    front: 'https://firebasestorage.googleapis.com/v0/b/signaid-d2d08.firebasestorage.app/o/btp_mockups%2Fclubvisionroom%2Fweb%2FheavyFront_1788693827695.png?alt=media&token=65d0698f-0070-4fc8-a827-0861153b2113',
    back: 'https://firebasestorage.googleapis.com/v0/b/signaid-d2d08.firebasestorage.app/o/btp_mockups%2Fclubvisionroom%2Fweb%2FheavyBack_1788693827696.png?alt=media&token=5645a2aa-48ba-43ba-ad68-1916f9d238e3',
    face: 'https://firebasestorage.googleapis.com/v0/b/signaid-d2d08.firebasestorage.app/o/btp_mockups%2Fclubvisionroom%2Fweb%2FheavyFront_1788693827695.png?alt=media&token=65d0698f-0070-4fc8-a827-0861153b2113',
    dos: 'https://firebasestorage.googleapis.com/v0/b/signaid-d2d08.firebasestorage.app/o/btp_mockups%2Fclubvisionroom%2Fweb%2FheavyBack_1788693827696.png?alt=media&token=5645a2aa-48ba-43ba-ad68-1916f9d238e3',
  },
  ai: 'https://firebasestorage.googleapis.com/v0/b/signaid-d2d08.firebasestorage.app/o/btp_mockups%2Fclubvisionroom%2Fweb%2FheavyFront_1788693827695.png?alt=media&token=65d0698f-0070-4fc8-a827-0861153b2113',
  aiRemastered: 'https://firebasestorage.googleapis.com/v0/b/signaid-d2d08.firebasestorage.app/o/btp_mockups%2Fclubvisionroom%2Fweb%2FheavyFront_1788693827695.png?alt=media&token=65d0698f-0070-4fc8-a827-0861153b2113',
  aiBack: 'https://firebasestorage.googleapis.com/v0/b/signaid-d2d08.firebasestorage.app/o/btp_mockups%2Fclubvisionroom%2Fweb%2FheavyBack_1788693827696.png?alt=media&token=5645a2aa-48ba-43ba-ad68-1916f9d238e3',
  aiRemasteredBack: 'https://firebasestorage.googleapis.com/v0/b/signaid-d2d08.firebasestorage.app/o/btp_mockups%2Fclubvisionroom%2Fweb%2FheavyBack_1788693827696.png?alt=media&token=5645a2aa-48ba-43ba-ad68-1916f9d238e3',
  garment: 'tshirt_oversize',
  description: 'T-Shirt Unisexe Heavyweight Next Level Apparel (NX7200) en 100% coton peigné ringspun 230 g/m², coupe oversize streetwear avec épaules tombantes et col épais.',
  badge: 'Premium Streetwear',
  isAvailable: true,
};

/**
 * Collection Merchandising Complète Vision Room
 */
export const VISION_ROOM_MERCH_COLLECTION: MerchItem[] = [
  VISION_ROOM_BASIC_TANK,
  VISION_ROOM_HEAVYWEIGHT_TEE,
];

export interface MerchCarouselProps {
  items: MerchItem[];
  title?: string;
  subtitle?: string;
  currency?: string;
  accentColor?: string;
  isLightMode?: boolean;
  onAddToCart?: (item: MerchItem, selectedSize: string, selectedColor: string) => void;
  onItemClick?: (item: MerchItem) => void;
  shopUrl?: string;
  artistLogoA?: string;
  artistLogoB?: string;
  artistName?: string;
  className?: string;
  showIndicators?: boolean;
}

/**
 * Placeholder SVG de secours élégant pour éviter tout affichage brisé si une image échoue au chargement.
 */
const FallbackProductImage = ({
  name,
  isLightMode,
  accentColor
}: {
  name: string;
  isLightMode?: boolean;
  accentColor?: string;
}) => {
  return (
    <div
      className={`w-full h-full flex flex-col items-center justify-center p-4 select-none ${isLightMode ? 'bg-slate-100 text-slate-500' : 'bg-zinc-900 text-zinc-400'
        }`}
    >
      <svg
        className="w-12 h-12 mb-2 opacity-60"
        viewBox="0 0 24 24"
        fill="none"
        stroke={accentColor || 'currentColor'}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20.38 3.46L16 2a4 4 0 01-8 0L3.62 3.46a2 2 0 00-1.34 2.23l.58 3.47a1 1 0 00.99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 002-2V10h2.15a1 1 0 00.99-.84l.58-3.47a2 2 0 00-1.34-2.23z" />
      </svg>
      <span className="text-[11px] font-bold tracking-wider uppercase opacity-75 text-center line-clamp-1 max-w-[90%]">
        {name || 'Produit Officiel'}
      </span>
      <span className="text-[9px] opacity-50 mt-0.5">Visuel en cours</span>
    </div>
  );
};

/**
 * Carte Produit Individuelle du Carrousel avec :
 * - `snap-always snap-center` (magnétisme forcé inviolable).
 * - Contrôles d'achat (tailles, prix, bouton d'ajout, face/dos) actifs uniquement sur la carte centrale.
 * - Cartes latérales épurées avec opacité atténuée et clic interactif pour centrer.
 */
export function MerchProductCard({
  product,
  isActive = true,
  onCardClick,
  onAddToCart,
  accentColor = '#ff3366',
  isLightMode = false,
  artistLogoA,
  artistLogoB,
  artistName,
}: {
  product: MerchItem;
  isActive?: boolean;
  onCardClick?: () => void;
  onAddToCart?: (p: MerchItem, size: string, color: string) => void;
  accentColor?: string;
  isLightMode?: boolean;
  artistLogoA?: string;
  artistLogoB?: string;
  artistName?: string;
}) {
  const [selectedSize, setSelectedSize] = useState<string>(product.sizes?.[0] || 'L');
  const [selectedColor, setSelectedColor] = useState<string>(product.color || product.colors?.[0] || 'Noir');
  const [currentView, setCurrentView] = useState<'front' | 'back'>('front');
  const [imgError, setImgError] = useState<boolean>(false);
  const [isAddedRecently, setIsAddedRecently] = useState<boolean>(false);

  const isCard = product.garment?.includes('card');
  const isPolo = product.garment?.includes('polo');
  const isHoodie = product.garment?.includes('hoodie') || product.garment?.includes('sweat');
  const isTank = product.garment?.includes('tank') || product.garment?.includes('debardeur') || product.category?.toLowerCase().includes('sans manches');
  const isOversize = product.garment?.includes('oversize') || product.category?.toLowerCase().includes('streetwear') || product.category?.toLowerCase().includes('boxy');
  const isWhite = Boolean(
    product.color?.toLowerCase().includes('blanc') ||
    product.color?.toLowerCase().includes('white') ||
    product.id?.toLowerCase().includes('white') ||
    product.name?.toLowerCase().includes('blanc') ||
    product.title?.toLowerCase().includes('blanc')
  );

  const defaultFrontUrl = isPolo
    ? '/assets/models/male_polo_front.png'
    : isHoodie
      ? '/assets/models/male_hoodie_front.png'
      : isCard
        ? '/assets/card-base.svg'
        : isTank
          ? '/assets/tank-black-BYBB011.png'
          : isOversize
            ? '/assets/tshirt-black-NX7200.png'
            : '/assets/models/male_tshirt_front.png';

  const defaultBackUrl = isPolo
    ? '/assets/models/male_polo_back.png'
    : isHoodie
      ? '/assets/models/male_hoodie_back.png'
      : isTank
        ? '/assets/tank-black-BYBB011-dos.png'
        : isOversize
          ? '/assets/tshirt-black-NX7200-dos.png'
          : '/assets/models/male_tshirt_back.png';

  const isBatSnapshot = (url?: string | null) => {
    if (!url || typeof url !== 'string') return false;
    const l = url.toLowerCase();
    return l.includes('_snapshot_') || l.includes('/snapshot') || l.includes('clubvision_tshirt_front') || l.includes('clubvision_polo_front') || l.includes('clubvision_hoodie_front') || l.includes('clubvision_tshirt_back') || l.includes('clubvision_polo_back') || l.includes('clubvision_hoodie_back');
  };

  const isVision = Boolean(
    (artistName || '').toLowerCase().includes('vision') ||
    product.id?.toLowerCase().includes('vision') ||
    product.name?.toLowerCase().includes('vision')
  );

  const clubVisionStudioFront = isVision
    ? (isPolo
      ? 'https://firebasestorage.googleapis.com/v0/b/signaid-d2d08.firebasestorage.app/o/btp_mockups%2Fclubvisionroom%2Fweb%2FpFront_1788693827686.png?alt=media&token=c94713f8-4ca2-4cdb-b959-82d5ae6d2c4b'
      : (isHoodie
        ? 'https://firebasestorage.googleapis.com/v0/b/signaid-d2d08.firebasestorage.app/o/btp_mockups%2Fclubvisionroom%2Fweb%2FhFront_1788693827689.png?alt=media&token=f1affb8b-0f66-4f8e-899b-b1da4c825f8c'
        : (isTank
          ? (isWhite ? 'https://firebasestorage.googleapis.com/v0/b/signaid-d2d08.firebasestorage.app/o/btp_mockups%2Fclubvisionroom%2Fweb%2FtankWhiteFront_1788693827692.png?alt=media&token=3602273b-ef06-4dbd-8dae-809894d7e147' : 'https://firebasestorage.googleapis.com/v0/b/signaid-d2d08.firebasestorage.app/o/btp_mockups%2Fclubvisionroom%2Fweb%2FtankFront_1788698451810.png?alt=media&token=32465cf4-7a0c-48aa-a010-08c999a7d0d1')
          : (isOversize
            ? 'https://firebasestorage.googleapis.com/v0/b/signaid-d2d08.firebasestorage.app/o/btp_mockups%2Fclubvisionroom%2Fweb%2FheavyFront_1788693827695.png?alt=media&token=65d0698f-0070-4fc8-a827-0861153b2113'
            : 'https://firebasestorage.googleapis.com/v0/b/signaid-d2d08.firebasestorage.app/o/btp_mockups%2Fclubvisionroom%2Fweb%2FtFront_1788693827681.png?alt=media&token=351044ba-98e5-4139-b194-e182b80fb846'))))
    : null;

  const clubVisionStudioBack = isVision
    ? (isPolo
      ? 'https://firebasestorage.googleapis.com/v0/b/signaid-d2d08.firebasestorage.app/o/btp_mockups%2Fclubvisionroom%2Fweb%2FpBack_1788693827687.png?alt=media&token=cdc6ba8f-418a-4ea7-9629-523e3f607012'
      : (isHoodie
        ? 'https://firebasestorage.googleapis.com/v0/b/signaid-d2d08.firebasestorage.app/o/btp_mockups%2Fclubvisionroom%2Fweb%2FhBack_1788693827690.png?alt=media&token=ee00ba8d-0a66-45c6-856c-fe6a4b122320'
        : (isTank
          ? (isWhite ? 'https://firebasestorage.googleapis.com/v0/b/signaid-d2d08.firebasestorage.app/o/btp_mockups%2Fclubvisionroom%2Fweb%2FtankWhiteBack_1788693827694.png?alt=media&token=0e6b5a90-6ffe-499d-9a91-71043c6cb636' : 'https://firebasestorage.googleapis.com/v0/b/signaid-d2d08.firebasestorage.app/o/btp_mockups%2Fclubvisionroom%2Fweb%2FtankBack_1788693827691.png?alt=media&token=042abb56-7970-4a26-92dc-2de88698e7a6')
          : (isOversize
            ? 'https://firebasestorage.googleapis.com/v0/b/signaid-d2d08.firebasestorage.app/o/btp_mockups%2Fclubvisionroom%2Fweb%2FheavyBack_1788693827696.png?alt=media&token=5645a2aa-48ba-43ba-ad68-1916f9d238e3'
            : 'https://firebasestorage.googleapis.com/v0/b/signaid-d2d08.firebasestorage.app/o/btp_mockups%2Fclubvisionroom%2Fweb%2FtBack_1788693827685.png?alt=media&token=43c3717a-2294-4098-9b61-24dfb79df8c0'))))
    : null;

  // Résolution prioritaire absolue de l'image (stricte conformité audit : Studio > AI > Front > ImageUrl > Mechanical > Base > Static Fallback)
  const item = product as any;
  const rawFrontCandidate = (
    item.imageStudio ||
    (!isBatSnapshot(item.aiRemastered) ? item.aiRemastered : null) ||
    (!isBatSnapshot(item.ai) ? item.ai : null) ||
    (!isBatSnapshot(item.frontImageUrl) ? item.frontImageUrl : null) ||
    (!isBatSnapshot(item.imageFront) ? item.imageFront : null) ||
    (!isBatSnapshot(item.imageUrl) ? item.imageUrl : null) ||
    item.realAiSnapshotUrl ||
    item.images?.front ||
    item.images?.face ||
    item.images?.recto ||
    item.aiRemastered ||
    item.ai ||
    item.frontImageUrl ||
    item.imageFront ||
    item.imageUrl ||
    clubVisionStudioFront ||
    item.mechanical ||
    item.base
  );
  const frontImageCandidate = (isBatSnapshot(rawFrontCandidate) && clubVisionStudioFront)
    ? clubVisionStudioFront
    : (isBatSnapshot(rawFrontCandidate) ? null : rawFrontCandidate);

  const rawBackCandidate = (
    item.imageStudioBack ||
    (!isBatSnapshot(item.aiRemasteredBack) ? item.aiRemasteredBack : null) ||
    (!isBatSnapshot(item.aiBack) ? item.aiBack : null) ||
    (currentView === 'back' && !isBatSnapshot(item.aiRemastered) ? item.aiRemastered : null) ||
    (currentView === 'back' && !isBatSnapshot(item.ai) ? item.ai : null) ||
    (!isBatSnapshot(item.backImageUrl) ? item.backImageUrl : null) ||
    (!isBatSnapshot(item.imageBack) ? item.imageBack : null) ||
    item.images?.back ||
    item.images?.dos ||
    item.images?.verso ||
    item.aiRemasteredBack ||
    item.aiBack ||
    item.backImageUrl ||
    item.imageBack ||
    item.imageUrl ||
    clubVisionStudioBack ||
    item.mechanical ||
    item.base
  );
  const backImageCandidate = (isBatSnapshot(rawBackCandidate) && clubVisionStudioBack)
    ? clubVisionStudioBack
    : (isBatSnapshot(rawBackCandidate) ? null : rawBackCandidate);

  const hasBackImage = !isCard && Boolean(
    (backImageCandidate && backImageCandidate.trim() !== '') ||
    defaultBackUrl
  );
  const activeView = hasBackImage ? currentView : 'front';

  const currentImg = activeView === 'back'
    ? (backImageCandidate && backImageCandidate.trim() ? backImageCandidate : defaultBackUrl)
    : (frontImageCandidate && frontImageCandidate.trim() ? frontImageCandidate : defaultFrontUrl);

  const isAiRender = activeView === 'back'
    ? Boolean(backImageCandidate && !isBatSnapshot(backImageCandidate) && (backImageCandidate.includes('_ai_') || backImageCandidate.includes('studio') || backImageCandidate.includes('firebasestorage') || backImageCandidate.includes('btp_mockups') || item.aiRemasteredBack || item.aiBack))
    : Boolean(frontImageCandidate && !isBatSnapshot(frontImageCandidate) && (frontImageCandidate.includes('_ai_') || frontImageCandidate.includes('studio') || frontImageCandidate.includes('firebasestorage') || frontImageCandidate.includes('btp_mockups') || item.aiRemastered || item.ai));

  const isTemplateGarment = !isAiRender && (
    !currentImg ||
    currentImg.includes('JHK') ||
    currentImg.includes('BYBB') ||
    currentImg.includes('NX7200') ||
    currentImg.includes('card-base') ||
    currentImg.includes('neutral') ||
    currentImg.includes('bctw') ||
    currentImg.includes('/models/male_')
  );

  const fallbackLogo = activeView === 'front' ? (artistLogoB || artistLogoA) : (artistLogoA || artistLogoB);
  const showFallbackOverlay = !imgError && isTemplateGarment && Boolean(fallbackLogo && fallbackLogo.trim() !== '');

  const overlayTop = activeView === 'front'
    ? (isPolo ? '41%' : (isHoodie ? '43%' : (isTank ? '41%' : (isOversize ? '41%' : '41%'))))
    : (isHoodie ? '46%' : (isPolo ? '40%' : (isTank ? '40%' : (isOversize ? '40%' : '40%'))));
  const overlayLeft = activeView === 'front'
    ? (isPolo ? '60%' : (isHoodie ? '59.5%' : (isTank ? '50%' : (isOversize ? '59.5%' : '59.5%'))))
    : '50%';
  const overlayWidth = activeView === 'front'
    ? (isPolo ? '11%' : (isHoodie ? '12%' : (isTank ? '18%' : (isOversize ? '12%' : '12%'))))
    : (isHoodie ? '28%' : (isTank ? '26%' : (isOversize ? '28%' : '28%')));

  const handleAction = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isActive) return;
    if (onAddToCart) {
      onAddToCart(product, selectedSize, selectedColor);
      setIsAddedRecently(true);
      setTimeout(() => setIsAddedRecently(false), 1400);
    } else if (product.actionUrl) {
      window.open(product.actionUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <article
      data-carousel-item
      onClick={onCardClick}
      className={`shrink-0 snap-always snap-center w-[280px] min-w-[280px] max-w-[280px] flex flex-col rounded-2xl overflow-hidden transition-all duration-300 border select-none group ${isActive
          ? 'scale-100 opacity-100 shadow-xl'
          : 'scale-95 opacity-70 cursor-pointer hover:opacity-90'
        } ${isLightMode
          ? 'bg-white border-slate-200/90'
          : 'bg-[#0f0f12] border-white/10'
        }`}
      style={{
        scrollSnapStop: 'always',
        boxShadow: isLightMode
          ? isActive ? '0 12px 32px -4px rgba(0, 0, 0, 0.12)' : '0 4px 12px -2px rgba(0, 0, 0, 0.05)'
          : isActive ? '0 12px 36px -4px rgba(0, 0, 0, 0.8)' : '0 6px 16px -4px rgba(0, 0, 0, 0.5)'
      }}
    >
      {/* CADRE IMAGE AVEC RATIO CARRÉ PARFAIT & FOND STUDIO */}
      <div
        className={`relative w-full aspect-square flex items-center justify-center overflow-hidden transition-colors ${isLightMode ? 'bg-slate-100/80' : 'bg-[#16161a]'
          }`}
      >
        {/* BADGE OFFICIEL / CATÉGORIE SI DISPONIBLE */}
        {product.badge && (
          <div
            className="absolute top-2.5 left-2.5 z-10 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider text-white shadow-md backdrop-blur-md"
            style={{ backgroundColor: accentColor }}
          >
            {product.badge}
          </div>
        )}

        {/* BASCULE FACE / DOS (VISIBLE UNIQUEMENT SUR CARTE CENTRALE ACTIVE) */}
        {hasBackImage && (
          <div
            className={`absolute top-2.5 right-2.5 z-20 flex items-center gap-1 bg-black/60 backdrop-blur-md p-1 rounded-lg border border-white/15 shadow-md transition-opacity duration-300 ${isActive ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
              }`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setCurrentView('front')}
              className={`px-2 py-0.5 text-[10px] font-black rounded uppercase transition-all duration-150 ${activeView === 'front'
                  ? 'text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white'
                }`}
              style={{
                backgroundColor: activeView === 'front' ? accentColor : 'transparent'
              }}
              aria-label="Voir la face avant"
            >
              Face
            </button>
            <button
              type="button"
              onClick={() => setCurrentView('back')}
              className={`px-2 py-0.5 text-[10px] font-black rounded uppercase transition-all duration-150 ${activeView === 'back'
                  ? 'text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white'
                }`}
              style={{
                backgroundColor: activeView === 'back' ? accentColor : 'transparent'
              }}
              aria-label="Voir le dos"
            >
              Dos
            </button>
          </div>
        )}

        {/* CONTENEUR DE L'IMAGE AVEC GESTION FALLBACK ONERROR */}
        <div className="relative w-full h-full flex items-center justify-center">
          {!imgError && currentImg ? (
            <img
              src={currentImg}
              alt={`${product.name} - ${artistName || 'Merchandising'}`}
              loading="lazy"
              decoding="async"
              onError={() => setImgError(true)}
              className="w-full h-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <FallbackProductImage
              name={product.name}
              isLightMode={isLightMode}
              accentColor={accentColor}
            />
          )}

          {/* SUPERPOSITION FALLBACK SI GABARIT TEXTILE VIERGE */}
          {showFallbackOverlay && fallbackLogo && (
            <div
              className="absolute pointer-events-none z-10 flex items-center justify-center transition-transform duration-300 group-hover:scale-105"
              style={{
                top: overlayTop,
                left: overlayLeft,
                transform: 'translate(-50%, -50%)',
                width: overlayWidth
              }}
            >
              <img
                src={fallbackLogo}
                alt=""
                className="w-full h-auto max-h-full object-contain drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)]"
              />
            </div>
          )}
        </div>
      </div>

      {/* INFORMATIONS PRODUIT & ACTIONS DIRECTES */}
      <div className="p-4 flex flex-col flex-1 justify-between gap-3">
        <div>
          <h3
            className={`font-bold text-sm tracking-tight truncate transition-colors ${isLightMode ? 'text-slate-900' : 'text-white'
              }`}
            title={product.title || product.name}
          >
            {product.title || product.name}
          </h3>

          <div className={`flex items-baseline justify-between mt-1 transition-opacity duration-300 ${isActive ? 'opacity-100' : 'opacity-0'
            }`}>
            <span
              className="text-base sm:text-lg font-black tracking-tight"
              style={{ color: accentColor }}
            >
              {product.price.toFixed(2)} {product.currency || '€'}
            </span>

            {product.category && (
              <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${isLightMode ? 'bg-slate-100 text-slate-500' : 'bg-white/5 text-zinc-400'
                }`}>
                {product.category}
              </span>
            )}
          </div>
        </div>

        {/* SÉLECTEUR DE TAILLES (VISIBLE UNIQUEMENT SUR LA CARTE CENTRALE) */}
        <div className={`transition-opacity duration-300 min-h-[28px] flex items-center ${isActive ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}>
          {product.sizes && product.sizes.length > 0 && (
            <div
              className="flex flex-row items-center gap-1.5 flex-nowrap overflow-x-auto py-0.5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
              onClick={(e) => e.stopPropagation()}
            >
              {product.sizes.map((size) => {
                const isSelected = selectedSize === size;
                return (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setSelectedSize(size)}
                    className={`min-w-[28px] h-6 px-1.5 text-[11px] font-bold rounded-md transition-all duration-150 flex items-center justify-center border shrink-0 ${isSelected
                        ? 'text-white border-transparent shadow-sm'
                        : isLightMode
                          ? 'bg-slate-100 text-slate-600 border-slate-200 hover:border-slate-300'
                          : 'bg-zinc-800 text-zinc-400 border-zinc-700/60 hover:text-white hover:border-zinc-500'
                      }`}
                    style={{
                      backgroundColor: isSelected ? accentColor : undefined
                    }}
                  >
                    {size}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* BOUTON D'ACTION DIRECT (VISIBLE UNIQUEMENT SUR LA CARTE CENTRALE) */}
        <div className={`transition-opacity duration-300 ${isActive ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}>
          <button
            type="button"
            onClick={handleAction}
            className={`w-full py-2.5 px-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all duration-150 flex items-center justify-center gap-2 active:scale-95 shadow-sm ${isAddedRecently
                ? 'bg-emerald-600 text-white'
                : isLightMode
                  ? 'bg-slate-900 text-white hover:bg-slate-800'
                  : 'bg-white text-slate-950 hover:bg-zinc-100'
              }`}
            style={{
              backgroundColor: isAddedRecently
                ? '#10b981'
                : undefined
            }}
            aria-label={`Ajouter ${product.name} au panier`}
          >
            {isAddedRecently ? (
              <>
                <svg className="w-3.5 h-3.5 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>Ajouté !</span>
              </>
            ) : (
              <>
                <span className="text-sm">🛍️</span>
                <span>+ Ajouter au panier</span>
              </>
            )}
          </button>
        </div>
      </div>
    </article>
  );
}

/**
 * Composant de Carrousel de Merchandising Natif :
 * - Magnétisme forcé inviolable (`snap-always snap-center`) anti-blocage intermédiaire.
 * - Wrapper unifié max-w-[560px] centré sur mobile, tablette et desktop.
 * - Détection infaillible de la carte active via `getBoundingClientRect()`.
 * - Snap Lock automatique en fin de défilement (auto-alignement propre).
 */
export default function MerchCarousel({
  items = [],
  title = "Merch & Collection Officielle",
  subtitle,
  currency = '€',
  accentColor = '#ff3366',
  isLightMode = false,
  onAddToCart,
  onItemClick,
  shopUrl,
  artistLogoA,
  artistLogoB,
  artistName,
  className = '',
  showIndicators = true,
}: MerchCarouselProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isJumpingRef = useRef<boolean>(false);
  const snapLockTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const itemCount = items.length;

  const [activeVirtualIndex, setActiveVirtualIndex] = useState<number>(itemCount);
  const [activeIndex, setActiveIndex] = useState<number>(0);

  // Duplication virtuelle pour boucle infinie : 3 ensembles de cartes (gauche, milieu, droite)
  const repeatCount = useMemo(() => {
    if (itemCount <= 1) return 1;
    return 3;
  }, [itemCount]);

  const virtualItems = useMemo(() => {
    if (itemCount === 0) return [];
    if (itemCount === 1) {
      return [{ item: items[0], virtualKey: `single-${items[0].id}`, originalIndex: 0 }];
    }
    const list = [];
    for (let r = 0; r < repeatCount; r++) {
      for (let i = 0; i < itemCount; i++) {
        list.push({
          item: items[i],
          virtualKey: `rep-${r}-${items[i].id}-${i}`,
          originalIndex: i,
        });
      }
    }
    return list;
  }, [items, itemCount, repeatCount]);

  // Initialisation du scroll au centre exact (premier élément de l'ensemble central)
  const initScrollPosition = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el || itemCount <= 1) return;

    const cards = el.querySelectorAll('[data-carousel-item]');
    const middleIndex = itemCount; // premier élément du 2ème ensemble
    if (cards[middleIndex]) {
      const targetCard = cards[middleIndex] as HTMLElement;
      const targetScroll = targetCard.offsetLeft - (el.clientWidth - targetCard.clientWidth) / 2;
      el.style.scrollBehavior = 'auto';
      el.scrollLeft = targetScroll;
      el.style.scrollBehavior = '';
      setActiveVirtualIndex(middleIndex);
      setActiveIndex(0);
    }
  }, [itemCount]);

  // Détection robuste et infaillible de la carte active la plus proche du centre exact
  const updateActiveCard = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container || isJumpingRef.current || itemCount === 0) return;

    const containerRect = container.getBoundingClientRect();
    const containerCenter = containerRect.left + containerRect.width / 2;
    const cards = Array.from(container.querySelectorAll('[data-carousel-item]')) as HTMLElement[];
    if (!cards.length) return;

    let closestIndex = 0;
    let minDistance = Infinity;

    cards.forEach((card, index) => {
      const cardRect = card.getBoundingClientRect();
      const cardCenter = cardRect.left + cardRect.width / 2;
      const distance = Math.abs(containerCenter - cardCenter);

      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = index;
      }
    });

    setActiveVirtualIndex(closestIndex);
    setActiveIndex(closestIndex % itemCount);

    // Recentrage silencieux si l'utilisateur atteint le jeu de cartes de gauche (Set 0) ou droite (Set 2)
    if (itemCount > 1) {
      const firstSetCard = cards[0];
      const secondSetCard = cards[itemCount];
      if (firstSetCard && secondSetCard) {
        const singleSetWidth = secondSetCard.offsetLeft - firstSetCard.offsetLeft;
        if (singleSetWidth > 0) {
          if (closestIndex < itemCount) {
            isJumpingRef.current = true;
            container.style.scrollBehavior = 'auto';
            container.style.scrollSnapType = 'none';
            container.scrollLeft += singleSetWidth;
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                container.style.scrollBehavior = '';
                container.style.scrollSnapType = '';
                isJumpingRef.current = false;
              });
            });
          } else if (closestIndex >= 2 * itemCount) {
            isJumpingRef.current = true;
            container.style.scrollBehavior = 'auto';
            container.style.scrollSnapType = 'none';
            container.scrollLeft -= singleSetWidth;
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                container.style.scrollBehavior = '';
                container.style.scrollSnapType = '';
                isJumpingRef.current = false;
              });
            });
          }
        }
      }
    }
  }, [itemCount]);

  // Snap Lock automatique : réalignement automatique vers le centre si le scroll s'est arrêté avec un léger décalage
  const autoSnapToActive = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container || isJumpingRef.current) return;

    const containerRect = container.getBoundingClientRect();
    const containerCenter = containerRect.left + containerRect.width / 2;
    const cards = Array.from(container.querySelectorAll('[data-carousel-item]')) as HTMLElement[];
    if (!cards.length) return;

    let closestIndex = 0;
    let minDistance = Infinity;

    cards.forEach((card, index) => {
      const cardRect = card.getBoundingClientRect();
      const cardCenter = cardRect.left + cardRect.width / 2;
      const distance = Math.abs(containerCenter - cardCenter);

      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = index;
      }
    });

    // Si le décalage résiduel dépasse 3px, verrouiller le centrage
    if (minDistance > 3 && cards[closestIndex]) {
      const targetCard = cards[closestIndex];
      const targetScroll = targetCard.offsetLeft - (container.clientWidth - targetCard.clientWidth) / 2;
      container.scrollTo({
        left: targetScroll,
        behavior: 'smooth',
      });
    }
  }, []);

  const handleScroll = useCallback(() => {
    updateActiveCard();

    if (snapLockTimeoutRef.current) {
      clearTimeout(snapLockTimeoutRef.current);
    }
    snapLockTimeoutRef.current = setTimeout(() => {
      autoSnapToActive();
    }, 100);
  }, [updateActiveCard, autoSnapToActive]);

  useEffect(() => {
    initScrollPosition();
    const timer = setTimeout(initScrollPosition, 60);
    const handleResize = () => {
      initScrollPosition();
      updateActiveCard();
    };
    window.addEventListener('resize', handleResize, { passive: true });

    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scrollend', autoSnapToActive, { passive: true });
    }

    return () => {
      clearTimeout(timer);
      if (snapLockTimeoutRef.current) clearTimeout(snapLockTimeoutRef.current);
      window.removeEventListener('resize', handleResize);
      if (container) {
        container.removeEventListener('scrollend', autoSnapToActive);
      }
    };
  }, [initScrollPosition, updateActiveCard, autoSnapToActive]);

  // Clic interactif sur une carte : la centrer immédiatement
  const handleCardClick = (virtualIndex: number, product: MerchItem) => {
    if (virtualIndex === activeVirtualIndex) {
      onItemClick?.(product);
      return;
    }
    const cardElements = scrollContainerRef.current?.querySelectorAll('[data-carousel-item]');
    if (cardElements && cardElements[virtualIndex]) {
      const targetCard = cardElements[virtualIndex] as HTMLElement;
      const el = scrollContainerRef.current;
      if (el) {
        const targetScroll = targetCard.offsetLeft - (el.clientWidth - targetCard.clientWidth) / 2;
        el.scrollTo({
          left: targetScroll,
          behavior: 'smooth',
        });
      }
    }
  };

  // Pas de Défilement des Flèches (< et >) calibré sur 1 carte + gap (280px + 16px = 296px)
  const handleScrollStep = (direction: 'left' | 'right') => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const firstCard = el.querySelector('[data-carousel-item]') as HTMLElement;
    const step = firstCard ? firstCard.offsetWidth + 16 : 296;

    el.scrollBy({
      left: direction === 'right' ? step : -step,
      behavior: 'smooth',
    });
  };

  // Scroll direct vers un index spécifique via les dots
  const scrollToIndex = (originalIdx: number) => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const cards = el.querySelectorAll('[data-carousel-item]');
    const targetVirtualIndex = itemCount > 1 ? itemCount + originalIdx : originalIdx;

    if (cards[targetVirtualIndex]) {
      const targetCard = cards[targetVirtualIndex] as HTMLElement;
      const targetScroll = targetCard.offsetLeft - (el.clientWidth - targetCard.clientWidth) / 2;
      el.scrollTo({
        left: targetScroll,
        behavior: 'smooth',
      });
    }
  };

  if (!items || items.length === 0) {
    return null;
  }

  return (
    <section
      className={`w-full max-w-[560px] mx-auto overflow-hidden relative px-4 flex flex-col items-center my-6 select-none ${className}`}
      aria-label={title}
    >
      {/* EN-TÊTE DU CARROUSEL : TITRE, COMPTEUR & ACTIONS */}
      <div className="w-full flex items-center justify-between gap-3 mb-3.5">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <h2
              className={`text-sm sm:text-base font-black uppercase tracking-wider flex items-center gap-2 ${isLightMode ? 'text-slate-900' : 'text-white'
                }`}
            >
              <span>{title}</span>
              <span
                className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: `${accentColor}20`,
                  color: accentColor,
                }}
              >
                {itemCount}
              </span>
            </h2>
          </div>
          {subtitle && (
            <p className={`text-xs mt-0.5 ${isLightMode ? 'text-slate-500' : 'text-zinc-400'}`}>
              {subtitle}
            </p>
          )}
        </div>

        {/* LIEN SHOP COMPLET & BOUTONS FLÈCHES DESKTOP */}
        <div className="flex items-center gap-2">
          {shopUrl && (
            <a
              href={shopUrl}
              className="text-xs font-black tracking-wide inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border transition-all duration-150 hover:brightness-110 active:scale-95"
              style={{
                color: accentColor,
                borderColor: `${accentColor}40`,
                backgroundColor: `${accentColor}12`,
              }}
            >
              <span>Voir tout</span>
              <span className="text-[11px]">➔</span>
            </a>
          )}

          {/* FLÈCHES DE NAVIGATION DESKTOP & MOBILES */}
          <div className="flex items-center gap-1.5 ml-1">
            <button
              type="button"
              onClick={() => handleScrollStep('left')}
              className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all duration-150 ${isLightMode
                  ? 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50 shadow-sm active:scale-90'
                  : 'bg-zinc-800 text-white border-white/10 hover:bg-zinc-700 shadow-md active:scale-90'
                }`}
              aria-label="Produit précédent"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => handleScrollStep('right')}
              className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all duration-150 ${isLightMode
                  ? 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50 shadow-sm active:scale-90'
                  : 'bg-zinc-800 text-white border-white/10 hover:bg-zinc-700 shadow-md active:scale-90'
                }`}
              aria-label="Produit suivant"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* CONTENEUR DU CARROUSEL SCROLLABLE : SNAP-MANDATORY & PADDING DYNAMIQUE CALC(50% - 140px) */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="relative flex w-full overflow-x-auto scroll-smooth snap-x snap-mandatory gap-4 py-2 overscroll-x-contain touch-pan-x [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        style={{
          WebkitOverflowScrolling: 'touch',
          scrollSnapType: 'x mandatory',
          paddingLeft: 'calc(50% - 140px)',
          paddingRight: 'calc(50% - 140px)',
        }}
        tabIndex={0}
        role="region"
        aria-label="Carrousel de merchandising"
      >
        {virtualItems.map((v, vIndex) => (
          <MerchProductCard
            key={v.virtualKey}
            product={v.item}
            isActive={vIndex === activeVirtualIndex}
            onCardClick={() => handleCardClick(vIndex, v.item)}
            accentColor={accentColor}
            isLightMode={isLightMode}
            artistLogoA={artistLogoA}
            artistLogoB={artistLogoB}
            artistName={artistName}
            onAddToCart={onAddToCart}
          />
        ))}
      </div>

      {/* INDICATEURS DE POSITION (PAGES/DOTS COMPACTS) */}
      {showIndicators && itemCount > 1 && (
        <div className="flex sm:hidden items-center justify-center gap-1.5 mt-3 px-4">
          {items.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => scrollToIndex(idx)}
              className={`h-1.5 rounded-full transition-all duration-200 ${idx === activeIndex
                  ? 'w-5'
                  : 'w-1.5 opacity-30 hover:opacity-60'
                }`}
              style={{
                backgroundColor: idx === activeIndex ? accentColor : isLightMode ? '#94a3b8' : '#71717a',
              }}
              aria-label={`Aller au produit ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
