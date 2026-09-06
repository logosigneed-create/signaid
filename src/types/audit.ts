// Type definitions for Audit and Portal V24

export type FlowState = 'LANDING' | 'CLEAN_CHECK' | 'SALES_AUDIT' | 'AUDIT' | 'RESULT' | 'ERROR' | 'INBOUND_WAITING';

export type LogoColorMode = 'original' | 'white' | 'black' | 'knockout_black';

export interface UserData {
    companyName: string;
    email: string;
    activity: string;
    phone: string;
    website: string;
    tva: string;
    showActivity: boolean;
    showPhone: boolean;
    showWebsite: boolean;
    showVat: boolean;
}

export interface MockupItem {
    id: string;
    title: string;
    base: string;
    ai: string | null;
    aiRemastered: string | null;
    isGenerating: boolean;
    view: 'front' | 'back';
    garment: 'tshirt' | 'tshirt_basic' | 'polo' | 'sweat' | 'tank_top' | 'tshirt_oversize' | 'tshirt_bicolore' | 'veste' | 'business_card' | 'banner';
    mechanical?: string | null;
    model?: string;
    selected: boolean;
    imageUrl?: string | null;
    frontImageUrl?: string | null;
    backImageUrl?: string | null;
    [key: string]: any;
}

export interface BtpLogo {
    id: 'A' | 'B';
    original: string | null;
    adapted: string | null;
    remastered: string | null;
    activeUrl?: string | null;
    mode?: 'original' | 'adapted' | 'adaptedBlack' | 'remastered';
}