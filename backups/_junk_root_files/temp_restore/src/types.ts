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
    slideImage?: string;
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
}

export interface CartItem {
    id: string;
    productType: string;
    color: string;
    sizes: { [size: string]: number };

    // Logos
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
    // Removed duplicate processedLogoUrlBack_white
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

    // Text
    textFront: TextConfig;
    textBack: TextConfig;
    textFront2?: TextConfig;
    textBack2?: TextConfig;

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
    previewImageUrlFront?: string;
    previewImageUrlBack?: string;
    aiImageUrl?: string;
    aiImageUrlFront?: string | null;
    aiImageUrlBack?: string | null;
    isRetouchingService?: boolean;
    isModernizationService?: boolean;
    isAiGenerating?: boolean;
    generationId?: string;
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

// Product -> Size -> Color -> Price OR Product -> Price
export type PricingRules = Record<string, number | Record<string, Record<string, number>>>;
// Structure: productType -> size -> color -> price
