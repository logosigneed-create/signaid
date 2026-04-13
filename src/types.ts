// Type definitions for the application

export interface User {
    id: string;
    email: string;
    username: string;
    avatarUrl: string;
    credits: number;
    isAdmin?: boolean;
    wishlist?: string[];
    savedPostIds?: string[];
    purchaseHistory?: CartItem[];
    referralCode?: string;
    usedCodes?: string[];
    following?: string[];
    likedProducts?: string[];
    dislikedProducts?: string[];
    bannerUrl?: string;
    websiteLink?: string;
    bio?: string;
}

export interface Post {
    id: string;
    user: User;
    imageUrl: string;
    caption: string;
    tags: Tag[];
    comments: Comment[];
    type: 'photo' | 'ai';
    status: 'pending' | 'approved' | 'rejected';
    customization?: CartItem;
    creditsEarned?: number;
    validations?: number;
    archived?: boolean;
    createdAt?: any;
    styleCategory?: string;
    stylePrompt?: string;
    isPrivate?: boolean;
}

export interface Tag {
    id: string;
    position: { x: number; y: number };
    productType: string;
}

export interface Comment {
    id: string;
    user: User;
    text: string;
    timestamp: Date;
}

export interface Product {
    name: string;
    price: number;
    images: { [color: string]: string };
    backImages: { [color: string]: string };
    sizes: string[];
    category?: 'vêtement' | 'objet' | 'pack';
    slideImage?: string;
    supplierLink?: string;
    reference?: string;
    sizeChart?: { [size: string]: string };
    boxQuantity?: number;
    boxPrice?: number;
    weight?: number;
    sizePrices?: { [size: string]: number };
}

export interface GeneralSettings {
    printMargin?: number;
}


export interface LogoConfig {
    originalUrl?: string | null;
    processedUrl?: string | null;
    processedUrl_original?: string | null;
    processedUrl_white?: string | null;
    processedUrl_black?: string | null;
    processedUrl_noBackground?: string | null;
    predefinedUrl?: string | null;
    isPredefined?: boolean;
    position: { x: number; y: number };
    size: number;
    aspectRatio?: number;
    activeColor?: string;
    activeColorName?: string;
    inverted?: boolean;
    backgroundRemoved?: boolean;
    backgroundRemovalMode?: 'white' | 'all' | 'black';
}

export interface TextConfig {
    lines: string[];
    text: string;
    fontSize: number;
    fontFamily: string;
    fontWeight: string;
    textTransform?: 'none' | 'uppercase' | 'lowercase';
    color: string;
    position: { x: number; y: number };
    letterSpacing: number;
    lineHeight?: number;
    shadow?: boolean;
    outline?: boolean;
    curve?: number;
    curveStyle?: 'flat' | 'arc' | 'upright';
    scaleY?: number;
    scaleX?: number;
    noFill?: boolean;
    outlineColor?: string;
    outlineWidth?: number;
}

export interface CartItem {
    id: string;
    productType: string;
    color: string;
    sizes: { [size: string]: number };

    // Logos - Legacy (Slot 1)
    processedLogoUrlFront?: string | null;
    processedLogoUrlBack?: string | null;
    processedLogoUrlFront_original?: string | null;
    processedLogoUrlBack_original?: string | null;
    processedLogoUrlFront_white?: string | null;
    processedLogoUrlFront_black?: string | null;
    processedLogoUrlFront_noBackground?: string | null;
    processedLogoUrlBack_white?: string | null;
    processedLogoUrlBack_black?: string | null;
    processedLogoUrlBack_noBackground?: string | null;
    originalLogoUrlFront?: string | null;
    originalLogoUrlBack?: string | null;
    predefinedLogoUrlFront?: string | null;
    predefinedLogoUrlBack?: string | null;
    isPredefinedLogoFront?: boolean;
    isPredefinedLogoBack?: boolean;

    logoPositionXFront: number;
    logoPositionYFront: number;
    logoPositionXBack: number;
    logoPositionYBack: number;
    logoSizeFront: number;
    logoSizeBack: number;
    logoAspectRatioFront?: number;
    logoAspectRatioBack?: number;
    activeLogoColorFront?: string;
    activeLogoColorBack?: string;
    activeLogoColorFrontName?: string;
    activeLogoColorBackName?: string;
    logoInvertedFront?: boolean;
    logoInvertedBack?: boolean;
    backgroundRemovedFront?: boolean;
    backgroundRemovedBack?: boolean;
    backgroundRemovalModeFront?: 'white' | 'all' | 'black';
    backgroundRemovalModeBack?: 'white' | 'all' | 'black';

    // Logos - Multi-slot (Slot 2 & 3)
    logoFront2?: LogoConfig;
    logoBack2?: LogoConfig;
    logoFront3?: LogoConfig;
    logoBack3?: LogoConfig;

    // Text
    textFront: TextConfig;
    textBack: TextConfig;
    textFront2?: TextConfig;
    textBack2?: TextConfig;
    textFront3?: TextConfig;
    textBack3?: TextConfig;

    // Legacy fields - keeping optional for compatibility if needed, but main logic uses TextConfig objects
    textPositionXFront?: number;
    textPositionYFront?: number;
    textPositionXBack?: number;
    textPositionYBack?: number;
    textSizeFront?: number;
    textSizeBack?: number;
    textColorFront?: string;
    textColorBack?: string;
    textFontFamilyFront?: string;
    textFontFamilyBack?: string;
    textFontWeightFront?: string;
    textFontWeightBack?: string;
    textTransformFront?: string;
    textTransformBack?: string;
    textLetterSpacingFront?: number;
    textLetterSpacingBack?: number;

    // Services
    serviceRetouche?: boolean;
    serviceModernisation?: boolean;
    calculatedPrice?: number;
    previewImageUrlFront?: string | null;
    previewImageUrlBack?: string | null;
    aiImageUrl?: string | null;
    aiImageUrlFront?: string | null;
    aiImageUrlBack?: string | null;
    isRetouchingService?: boolean;
    isModernizationService?: boolean;
    isAiGenerating?: boolean;
    generationId?: string;

    // Logo Service Request Fields
    activityName?: string;
    description?: string;
    referenceLogo?: string | null;
    catalogReferences?: string;
    notes?: string;
}

export interface CustomizationState {
    productType: string;
    color: string;
    logoUrl?: string;
    text?: string;
}

export interface ChatMessage {
    role: 'user' | 'model';
    parts: { text: string }[];
}

export interface PredefinedLogo {
    code: string;
    url: string | string[];
    name: string;
}

export type StyleCategory = "Trends" | "Réaliste" | "Art & Peinture" | "Pop & Graphique" | "Digital & Futuriste" | "Fun & Rétro" | "Custom";

export interface ProductDatabase {
    [key: string]: Product;
}

// Product (slug/ref) -> Size -> Color -> Price OR Product -> Price
export type PricingRules = Record<string, number | Record<string, Record<string, number>>>;
// Structure: productType -> size -> color -> price
// Note: We can also use product.sizePrices as a simpler override.

export interface LogoCreationData {
    activityName: string;
    description: string;
    referenceLogo: string | null;
    type: 'creation' | 'redesign';
    catalogReferences?: string;
}

export interface PriceTier {
    minQty: number;
    maxQty: number | null; // null for "X+"
    price: number;
}

export type BatchSessionStatus = 'OPEN' | 'LOCKED' | 'ORDERED' | 'COMPLETED';

export interface BatchSession {
    id: string;
    startDate: any; // Firestore Timestamp
    endDate: any; // Firestore Timestamp
    currentTotalQuantity: number;
    status: BatchSessionStatus;
    tiers: PriceTier[];
}

export interface Order {
    id: string;
    userId: string;
    items: CartItem[];
    totalAmount: number;
    status: 'pending' | 'paid' | 'shipped' | 'cancelled';
    createdAt: any;
    batchSessionId?: string;
    cashbackStatus?: 'pending' | 'credited' | 'none';
    cashbackAmount?: number;
}
