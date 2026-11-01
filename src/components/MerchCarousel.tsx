import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { CLUBVISION_MOCKUP_ASSETS, withCacheBust } from '../lib/localProfiles';

/**
 * Optimise les URLs d'images servies dans le carrousel :
 * - Force l'utilisation des variantes web optimisées (/web/) plutôt que les gabarits lourds d'impression (/print/).
 * - Écarte les fichiers mécaniques purs au profit du visuel final.
 */
export const optimizeMerchImage = (url?: string | null): string => {
  if (!url || typeof url !== 'string') return '';
  let clean = url.trim();
  if (!clean) return '';

  // Forcer les variantes web optimisées de Firebase Storage
  if (clean.includes('/print/')) {
    clean = clean.replace('/print/', '/web/');
  } else if (clean.includes('%2Fprint%2F')) {
    clean = clean.replace('%2Fprint%2F', '%2Fweb%2F');
  }

  // Éviter les rendus mécaniques bruts pour le rendu LCP carrousel
  if (clean.includes('_mech.png') && !clean.includes('logo_')) {
    clean = clean.replace('_mech.png', '.png');
  } else if (clean.includes('%2FE3520_front_mech.png')) {
    clean = clean.replace('%2FE3520_front_mech.png', '%2FE3520_front.png');
  } else if (clean.includes('%2FE3520_back_mech.png')) {
    clean = clean.replace('%2FE3520_back_mech.png', '%2FE3520_back.png');
  }

  return clean;
};

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
  ai?: string | boolean | null;
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
  imageUrl: CLUBVISION_MOCKUP_ASSETS.tankFront,
  frontImageUrl: CLUBVISION_MOCKUP_ASSETS.tankFront,
  backImageUrl: CLUBVISION_MOCKUP_ASSETS.tankBack,
  imageFront: CLUBVISION_MOCKUP_ASSETS.tankFront,
  imageBack: CLUBVISION_MOCKUP_ASSETS.tankBack,
  images: {
    front: CLUBVISION_MOCKUP_ASSETS.tankFront,
    back: CLUBVISION_MOCKUP_ASSETS.tankBack,
    face: CLUBVISION_MOCKUP_ASSETS.tankFront,
    dos: CLUBVISION_MOCKUP_ASSETS.tankBack,
    black_front: CLUBVISION_MOCKUP_ASSETS.tankFront,
    black_back: CLUBVISION_MOCKUP_ASSETS.tankBack,
    white_front: CLUBVISION_MOCKUP_ASSETS.tankWhiteFront,
    white_back: CLUBVISION_MOCKUP_ASSETS.tankWhiteBack,
  },
  ai: CLUBVISION_MOCKUP_ASSETS.tankFront,
  aiRemastered: CLUBVISION_MOCKUP_ASSETS.tankFront,
  aiBack: CLUBVISION_MOCKUP_ASSETS.tankBack,
  aiRemasteredBack: CLUBVISION_MOCKUP_ASSETS.tankBack,
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
  colors: ['Noir', 'Blanc'],
  price: 34.99,
  currency: '€',
  imageUrl: CLUBVISION_MOCKUP_ASSETS.heavyFront,
  frontImageUrl: CLUBVISION_MOCKUP_ASSETS.heavyFront,
  backImageUrl: CLUBVISION_MOCKUP_ASSETS.heavyBack,
  imageFront: CLUBVISION_MOCKUP_ASSETS.heavyFront,
  imageBack: CLUBVISION_MOCKUP_ASSETS.heavyBack,
  images: {
    front: CLUBVISION_MOCKUP_ASSETS.heavyFront,
    back: CLUBVISION_MOCKUP_ASSETS.heavyBack,
    black_front: CLUBVISION_MOCKUP_ASSETS.heavyFront,
    black_back: CLUBVISION_MOCKUP_ASSETS.heavyBack,
    white_front: CLUBVISION_MOCKUP_ASSETS.heavyWhiteFront,
    white_back: CLUBVISION_MOCKUP_ASSETS.heavyWhiteBack,
    face: CLUBVISION_MOCKUP_ASSETS.heavyFront,
    dos: CLUBVISION_MOCKUP_ASSETS.heavyBack,
  },
  ai: CLUBVISION_MOCKUP_ASSETS.heavyFront,
  aiRemastered: CLUBVISION_MOCKUP_ASSETS.heavyFront,
  aiBack: CLUBVISION_MOCKUP_ASSETS.heavyBack,
  aiRemasteredBack: CLUBVISION_MOCKUP_ASSETS.heavyBack,
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
  enabledProductIds?: string[];
  isPbsProfile?: boolean;
}

export const isProductEnabled = (product: any, enabledList?: string[] | null, isPbs?: boolean): boolean => {
  if (!product) return false;
  const pId = (product.id || '').toLowerCase();
  const pGarment = (product.garment || product.category || '').toLowerCase();
  const pSku = (product.sku || '').toLowerCase();
  const pProductId = (product.productId || '').toLowerCase();
  const pName = (product.name || product.title || '').toLowerCase();

  // Strict guard for PBS: ONLY E3520 (sport t-shirt) is enabled
  if (isPbs) {
    return pId.includes('e3520') || pGarment === 'sport_tshirt' || pSku.includes('e3520') || product.isSport === true || pName.includes('sport') || pId.includes('sport');
  }

  if (!enabledList || enabledList.length === 0) return true;
  if (enabledList.includes('__none__')) return false;

  const lowerList = enabledList.map(id => String(id).toLowerCase());

  // Direct match
  if (lowerList.includes(pId) || (pSku && lowerList.includes(pSku)) || (pProductId && lowerList.includes(pProductId))) {
    return true;
  }

  // Sport T-Shirt / E3520
  if (pGarment === 'sport_tshirt' || pId === 'e3520' || product.isSport) {
    return lowerList.some(id => 
      id.includes('e3520') || 
      id.includes('sportt') || 
      id.includes('sport_tshirt') ||
      id === 'prod_signaid_sportt_poly_mtzmb4zr'
    );
  }

  // Standard T-Shirt
  if (pGarment === 'tshirt' || pGarment === 'tshirt_basic') {
    return lowerList.some(id => 
      (id === 'tshirt' || id === 'tfront' || id === 'tback' || id === 'tshirt_front' || id === 'tshirt_back' || id.includes('tshirt_cotton') || id.includes('tshirt_basic') || id.includes('jhk170') || id === 'prod_tshirt') &&
      !id.includes('sport') && !id.includes('e3520')
    );
  }

  if (pGarment === 'polo') {
    return lowerList.some(id => id === 'polo' || id === 'pfront' || id === 'pback' || id.includes('polo') || id.includes('jhk510'));
  }

  if (pGarment === 'sweat' || pGarment === 'hoodie') {
    return lowerList.some(id => id === 'hoodie' || id === 'sweat' || id === 'hfront' || id === 'hback' || id.includes('hoodie') || id.includes('sweat') || id.includes('jhk421'));
  }

  if (pGarment === 'tank_top') {
    const isWhite = product.color === 'Blanc' || pId.includes('white');
    if (isWhite) {
      return lowerList.some(id => id === 'tank_top_white' || id === 'tankwhitefront' || id === 'tankwhiteback' || (id.includes('tank') && (id.includes('white') || id.includes('blanc'))));
    }
    return lowerList.some(id => (id === 'tank_top' || id === 'tankfront' || id === 'tankback' || id.includes('tank')) && !id.includes('white') && !id.includes('blanc'));
  }

  if (pGarment === 'tshirt_oversize') {
    const isWhite = product.color === 'Blanc' || pId.includes('white');
    if (isWhite) {
      return lowerList.some(id => id === 'tshirt_oversize_white' || id === 'heavywhitefront' || id === 'heavywhiteback' || ((id.includes('oversize') || id.includes('heavy')) && (id.includes('white') || id.includes('blanc'))));
    }
    return lowerList.some(id => (id === 'tshirt_oversize' || id === 'heavyfront' || id === 'heavyback' || id.includes('oversize') || id.includes('heavy')) && !id.includes('white') && !id.includes('blanc'));
  }

  return lowerList.includes(pGarment);
};

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
  const [imageLoaded, setImageLoaded] = useState<boolean>(false);
  const [isAddedRecently, setIsAddedRecently] = useState<boolean>(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

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
    product.title?.toLowerCase().includes('blanc') ||
    selectedColor?.toLowerCase().includes('blanc') ||
    selectedColor?.toLowerCase().includes('white')
  );

  const defaultFrontUrl = isPolo
    ? '/assets/models/male_polo_front.png'
    : isHoodie
      ? '/assets/models/male_hoodie_front.png'
      : isCard
        ? '/assets/card-base.svg'
        : isTank
          ? (isWhite ? '/merch/visionroom/tank-white-front.png' : '/assets/tank-black-BYBB011.png')
          : isOversize
            ? (isWhite ? '/assets/tshirt-white-NX7200.png' : '/assets/tshirt-black-NX7200.png')
            : '/assets/models/male_tshirt_front.png';

  const defaultBackUrl = isPolo
    ? '/assets/models/male_polo_back.png'
    : isHoodie
      ? '/assets/models/male_hoodie_back.png'
      : isTank
        ? (isWhite ? '/merch/visionroom/tank-white-back.png' : '/assets/tank-black-BYBB011-dos.png')
        : isOversize
          ? (isWhite ? '/assets/tshirt-white-NX7200-dos.png' : '/assets/tshirt-black-NX7200-dos.png')
          : '/assets/models/male_tshirt_back.png';

  const item = product as any;

  const isBatSnapshot = (url?: string | null) => {
    if (!url || typeof url !== 'string') return false;
    const l = url.toLowerCase();
    return l.includes('_snapshot_') || l.includes('/snapshot') ||
      l.includes('clubvision_tshirt_front') || l.includes('clubvision_polo_front') || l.includes('clubvision_hoodie_front') ||
      l.includes('clubvision_tshirt_back') || l.includes('clubvision_polo_back') || l.includes('clubvision_hoodie_back') ||
      l.startsWith('/assets/polo-') || l.startsWith('/assets/tshirt-') || l.startsWith('/assets/hoodie-');
  };

  const isVision = Boolean(
    (artistName || '').toLowerCase().includes('vision') ||
    product.id?.toLowerCase().includes('vision') ||
    product.name?.toLowerCase().includes('vision')
  );

  const isBlackUrlForWhite = (url?: string | null) => {
    if (!isWhite || !url || typeof url !== 'string') return false;
    const l = url.toLowerCase();
    // Do not flag white variants that happen to contain the letters
    if (l.includes('white') || l.includes('-wht') || l.includes('blanc')) return false;
    return l.includes('heavyfront') || l.includes('heavyback') ||
      l.includes('pfront') || l.includes('pback') ||
      l.includes('tfront') || l.includes('tback') ||
      l.includes('hfront') || l.includes('hback') ||
      l.includes('tankfront') || l.includes('tankback') ||
      l.includes('nx7200-blk') || l.includes('jhk510-blk') || l.includes('jhk170-blk') || l.includes('jhk421-blk') || l.includes('bybb011-blk');
  };

  // Résolution prioritaire absolue de l'image (stricte conformité audit : Studio > AI > Front > ImageUrl > Mechanical > Base > Static Fallback)
  const safeUrl = (v: any): string | null => (typeof v === 'string' && v.trim() !== '') ? v : null;
  const isValidUrl = (v: any): string | null => {
    const s = safeUrl(v);
    if (!s) return null;
    if (isBatSnapshot(s)) return null;
    if (isBlackUrlForWhite(s)) return null;
    return s;
  };

  const rawFrontCandidate = (
    safeUrl(item.imageStudio) ||
    (isWhite ? (isValidUrl(item.images?.white_front) || isValidUrl(item.white_front) || isValidUrl(item.heavyWhiteFront) || isValidUrl(item.heavy_white_front) || isValidUrl(item.pWhiteFront) || isValidUrl(item.tWhiteFront)) : null) ||
    isValidUrl(item.aiRemastered) ||
    isValidUrl(item.ai) ||
    isValidUrl(item.frontImage) ||
    isValidUrl(item.frontImageUrl) ||
    isValidUrl(item.imageFront) ||
    isValidUrl(item.imageUrl) ||
    safeUrl(item.realAiSnapshotUrl) ||
    (isWhite ? (safeUrl(item.images?.white_front) || safeUrl(item.white_front) || safeUrl(item.heavyWhiteFront) || safeUrl(item.heavy_white_front)) : null) ||
    safeUrl(item.images?.front) ||
    safeUrl(item.images?.face) ||
    safeUrl(item.images?.recto) ||
    safeUrl(item.aiRemastered) ||
    safeUrl(item.ai) ||
    safeUrl(item.frontImage) ||
    safeUrl(item.frontImageUrl) ||
    safeUrl(item.imageFront) ||
    safeUrl(item.imageUrl) ||
    safeUrl(item.mechanical) ||
    safeUrl(item.base)
  );
  const frontImageCandidate = isBatSnapshot(rawFrontCandidate) ? null : rawFrontCandidate;

  const rawBackCandidate = (
    safeUrl(item.imageStudioBack) ||
    (isWhite ? (isValidUrl(item.images?.white_back) || isValidUrl(item.white_back) || isValidUrl(item.heavyWhiteBack) || isValidUrl(item.heavy_white_back) || isValidUrl(item.pWhiteBack) || isValidUrl(item.tWhiteBack)) : null) ||
    isValidUrl(item.aiRemasteredBack) ||
    isValidUrl(item.aiBack) ||
    (currentView === 'back' ? isValidUrl(item.aiRemastered) : null) ||
    (currentView === 'back' ? isValidUrl(item.ai) : null) ||
    isValidUrl(item.backImage) ||
    isValidUrl(item.backImageUrl) ||
    isValidUrl(item.imageBack) ||
    (isWhite ? (safeUrl(item.images?.white_back) || safeUrl(item.white_back) || safeUrl(item.heavyWhiteBack) || safeUrl(item.heavy_white_back)) : null) ||
    safeUrl(item.images?.back) ||
    safeUrl(item.images?.dos) ||
    safeUrl(item.images?.verso) ||
    safeUrl(item.aiRemasteredBack) ||
    safeUrl(item.aiBack) ||
    safeUrl(item.backImage) ||
    safeUrl(item.backImageUrl) ||
    safeUrl(item.imageBack) ||
    safeUrl(item.imageUrl) ||
    safeUrl(item.mechanicalBack) ||
    safeUrl(item.baseBack) ||
    safeUrl(item.mechanical) ||
    safeUrl(item.base)
  );
  const backImageCandidate = isBatSnapshot(rawBackCandidate) ? null : rawBackCandidate;

  const hasBackImage = !isCard && Boolean(
    (typeof backImageCandidate === 'string' && backImageCandidate.trim() !== '') ||
    defaultBackUrl
  );
  const activeView = hasBackImage ? currentView : 'front';

  const currentImg = activeView === 'back'
    ? (typeof backImageCandidate === 'string' && backImageCandidate.trim() ? backImageCandidate : defaultBackUrl)
    : (typeof frontImageCandidate === 'string' && frontImageCandidate.trim() ? frontImageCandidate : defaultFrontUrl);

  const effectiveImg = useMemo(() => optimizeMerchImage(currentImg), [currentImg]);

  useEffect(() => {
    if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth > 0) {
      setImageLoaded(true);
      setImgError(false);
    } else {
      setImageLoaded(false);
      setImgError(false);
    }
  }, [effectiveImg]);

  const isAiRender = activeView === 'back'
    ? Boolean(typeof backImageCandidate === 'string' && !isBatSnapshot(backImageCandidate) && (backImageCandidate.includes('_ai_') || backImageCandidate.includes('studio') || backImageCandidate.includes('firebasestorage') || backImageCandidate.includes('btp_mockups') || (typeof item.aiRemasteredBack === 'string') || (typeof item.aiBack === 'string')))
    : Boolean(typeof frontImageCandidate === 'string' && !isBatSnapshot(frontImageCandidate) && (frontImageCandidate.includes('_ai_') || frontImageCandidate.includes('studio') || frontImageCandidate.includes('firebasestorage') || frontImageCandidate.includes('btp_mockups') || (typeof item.aiRemastered === 'string') || (typeof item.ai === 'string')));

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
      className={`shrink-0 snap-always snap-center w-[280px] min-w-[280px] max-w-[280px] flex flex-col rounded-2xl overflow-hidden transition-all duration-300 border select-none group touch-manipulation ${isActive
          ? 'scale-100 opacity-100 shadow-xl'
          : 'scale-95 opacity-70 cursor-pointer hover:opacity-90'
        } ${isLightMode
          ? 'bg-white border-slate-200/90'
          : 'bg-[#0f0f12] border-white/10'
        }`}
      style={{
        touchAction: 'pan-x pan-y',
        scrollSnapStop: 'always',
        boxShadow: isLightMode
          ? isActive ? '0 12px 32px -4px rgba(0, 0, 0, 0.12)' : '0 4px 12px -2px rgba(0, 0, 0, 0.05)'
          : isActive ? '0 12px 36px -4px rgba(0, 0, 0, 0.8)' : '0 6px 16px -4px rgba(0, 0, 0, 0.5)'
      }}
    >
      {/* CADRE IMAGE AVEC RATIO CARRÉ PARFAIT & FOND STUDIO */}
      <div
        className={`relative w-full aspect-square flex items-center justify-center overflow-hidden transition-colors touch-manipulation ${isLightMode ? 'bg-slate-100/80' : 'bg-[#16161a]'
          }`}
        style={{ touchAction: 'pan-x pan-y' }}
      >
        {/* BADGE OFFICIEL / CATÉGORIE SI DISPONIBLE */}
        {product.badge && product.badge.trim().toUpperCase() !== 'PACK' && (
          <div
            className="absolute top-2.5 left-2.5 z-10 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider text-white shadow-md backdrop-blur-md"
            style={{ backgroundColor: accentColor }}
          >
            {product.badge.replace(/\bpack\b/gi, '').trim()}
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

        {/* CONTENEUR DE L'IMAGE AVEC GESTION FALLBACK ONERROR & SQUELETTE IMMÉDIAT */}
        <div className="relative w-full h-full flex items-center justify-center touch-manipulation" style={{ touchAction: 'pan-x pan-y' }}>
          {/* SQUELETTE PLACEHOLDER CSS IMMÉDIAT (FOND GRIS AVEC ANIMATION PULSE) DÈS LE 1ER MILLIÈME DE SECONDE */}
          {!imageLoaded && !imgError && (
            <div
              className={`absolute inset-0 z-0 flex items-center justify-center animate-pulse transition-opacity duration-300 ${
                isLightMode ? 'bg-slate-200/90' : 'bg-[#18181f]'
              }`}
              aria-hidden="true"
            >
              <div className={`w-14 h-14 rounded-2xl ${isLightMode ? 'bg-slate-300/80' : 'bg-white/5'} animate-pulse`} />
            </div>
          )}

          {!imgError && effectiveImg ? (
            <img
              ref={(node) => {
                imgRef.current = node;
                if (node && node.complete && node.naturalWidth > 0 && !imageLoaded) {
                  setImageLoaded(true);
                }
              }}
              src={withCacheBust(effectiveImg)}
              alt={`${product.name} - ${artistName || 'Merchandising'}`}
              loading={isActive ? "eager" : "lazy"}
              decoding="async"
              {...({ fetchpriority: isActive ? "high" : undefined } as any)}
              onLoad={() => setImageLoaded(true)}
              onError={() => setImgError(true)}
              className="w-full h-full object-cover object-center transition-all duration-300 group-hover:scale-105 touch-manipulation relative z-10"
              style={{ touchAction: 'pan-x pan-y' }}
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
  enabledProductIds,
  isPbsProfile,
}: MerchCarouselProps) {
  const isPbs = isPbsProfile || (artistName || '').toLowerCase().trim() === 'pbs';
  const isVision = (artistName || '').toLowerCase().includes('vision');

  const visibleItems = useMemo(() => {
    let result = items || [];
    if (isPbs || (enabledProductIds && enabledProductIds.length > 0)) {
      result = result.filter(item => isProductEnabled(item, enabledProductIds, isPbs));
    }
    // Anti-contamination safeguard: Drop foreign Club Vision Room assets on other brands
    if (!isVision) {
      result = result.filter(item => {
        const s = ((item.name || '') + ' ' + (item.title || '') + ' ' + (item.imageUrl || '') + ' ' + (item.frontImageUrl || '') + ' ' + (item.id || '')).toLowerCase();
        return !s.includes('clubvision') && !s.includes('1787803061043') && !s.includes('heavyfront_fixed');
      });
    }
    return result;
  }, [items, enabledProductIds, isPbs, isVision]);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isJumpingRef = useRef<boolean>(false);
  const snapLockTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const itemCount = visibleItems.length;

  const [activeVirtualIndex, setActiveVirtualIndex] = useState<number>(itemCount > 1 ? itemCount : 0);
  const [activeIndex, setActiveIndex] = useState<number>(0);

  // Duplication virtuelle pour boucle infinie : 3 ensembles de cartes (gauche, milieu, droite)
  const repeatCount = useMemo(() => {
    if (itemCount <= 1) return 1;
    return 3;
  }, [itemCount]);

  const virtualItems = useMemo(() => {
    if (itemCount === 0) return [];
    if (itemCount === 1) {
      return [{ item: visibleItems[0], virtualKey: `single-${visibleItems[0].id}`, originalIndex: 0 }];
    }
    const list = [];
    for (let r = 0; r < repeatCount; r++) {
      for (let i = 0; i < itemCount; i++) {
        list.push({
          item: visibleItems[i],
          virtualKey: `rep-${r}-${visibleItems[i].id}-${i}`,
          originalIndex: i,
        });
      }
    }
    return list;
  }, [visibleItems, itemCount, repeatCount]);

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

  if (!visibleItems || visibleItems.length === 0) {
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
        className="relative flex w-full overflow-x-auto scroll-smooth snap-x snap-mandatory gap-4 py-2 overscroll-x-contain touch-manipulation [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        style={{
          touchAction: 'pan-x pan-y',
          overscrollBehaviorX: 'contain',
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
          {visibleItems.map((_, idx) => (
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
