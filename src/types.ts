// Type definitions for the application

export interface User {
    id: string;
    email: string;
    username: string;
    avatarUrl: string;
    credits: number;
    slug?: string; // Unique URL slug (e.g. "fabrizio" for signaid.eu/fabrizio)
    totalSales?: number; // Total units sold
    revenue?: number; // Total revenue generated in EUR
    ordersCount?: number; // Total orders count
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
    aiDisabled?: boolean;
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
    isHd?: boolean;
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
    isHdFront?: boolean;
    isHdBack?: boolean;

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


// ============================================================================
// Types, Interfaces & Utilitaires exportés depuis Dropper StudioComposer
// (Formats d'affiche, layers, mannequins, layouts, dynamic themes, etc.)
// ============================================================================

export interface ArtistProfile {
  id?: string;
  name?: string;
  slug?: string;
  bio?: string;
  avatarUrl?: string;
  bannerUrl?: string;
  genres?: string[];
  socials?: Record<string, string>;
  [key: string]: any;
}

export interface Portal {
  id?: string;
  slug?: string;
  title?: string;
  description?: string;
  theme?: string;
  [key: string]: any;
}

export type { TextSegment, CanvasMultiColorTextOptions } from './utils/textSegmenter';
export {
  parseTextSegments,
  getCleanDisplayText,
  extractWordsFromText,
  isWordHighlighted,
  toggleWordInText,
  drawMultiColorTextOnCanvas,
} from './utils/textSegmenter';

export type MusicGenre =
  | 'Techno & Industrial'
  | 'Hard Groove & Acid'
  | 'House & Deep Minimal'
  | 'Rap & Trap Drill'
  | 'Afrobeats & Amapiano'
  | 'Drum & Bass / Jungle'
  | 'Electro & Synthwave'
  | 'Dub & Sound-System'
  | string;

export type VisualPalette =
  | 'acid-techno'
  | 'cyber-noir'
  | 'analog-retro'
  | 'brutalist-red'
  | 'y2k-chrome'
  | 'emerald-rave';

export type TshirtColor = 'black' | 'white';

export type DjBlendMode = 'duotone-rave' | 'cutout-vignette' | 'monochrome-silver' | 'clean-original';

export type TypographyStyle = 'futur' | 'techno' | 'urban' | 'FUTUR' | 'HARD' | 'URBAN';

export type LogoColorMode =
  | 'auto'
  | 'neon'
  | 'original'
  | 'white'
  | 'black'
  | 'knockout_black'
  | 'screen';

export type FocusedTarget =
  | 'decor'
  | 'subject'
  | 'logo'
  | 'headline'
  | 'djName'
  | 'date'
  | 'location'
  | 'headerTagline'
  | 'eventName'
  | 'punchline'
  | 'headlineBadgeText'
  | 'timeSlot'
  | 'venue'
  | null;

export interface DynamicTheme {
  primaryAccent: string;
  secondaryAccent: string;
  glowColor?: string;
}

export interface LogoTransformState {
  logoUrl?: string | null;
  logoPositionX: number; // en pourcentage (0% à 100%)
  logoPositionY: number; // en pourcentage (0% à 100%)
  logoScale: number;     // facteur d'échelle (0.2 à 2.5)
  logoOpacity: number;   // opacité (0.1 à 1.0)
  logoRotation?: number; // rotation éventuelle (-180° à 180°, par défaut 0)
}

export interface LogoPlacement {
  x: number; // Pourcentage horizontal (0 à 100)
  y: number; // Pourcentage vertical (0 à 100)
  scale: number; // Échelle relative (ex: 1 = taille standard)
}

export interface TextScales {
  headerTagline?: number;  // Surtitre (défaut: 1.0)
  eventName?: number;      // Événement (défaut: 1.0)
  punchline?: number;      // Sous-titre (défaut: 1.0)
  headlineBadge?: number;  // Badge (défaut: 1.0)
  djName?: number;         // Nom Artiste (défaut: 1.0)
  infoBadge?: number;      // Cartouche Date/Lieu (défaut: 1.0)
}

export interface TextOffsetsY {
  headerTagline?: number;  // Décalage vertical Surtitre (Axe Y en cqi, défaut: 0)
  eventName?: number;      // Décalage vertical Événement (Axe Y en cqi, défaut: 0)
  punchline?: number;      // Décalage vertical Sous-titre (Axe Y en cqi, défaut: 0)
  headlineBadge?: number;  // Décalage vertical Badge (Axe Y en cqi, défaut: 0)
  djName?: number;         // Décalage vertical Nom Artiste (Axe Y en cqi, défaut: 0)
  infoBadge?: number;      // Décalage vertical Cartouche Date/Lieu (Axe Y en cqi, défaut: 0)
}

export interface TextOffsetsX {
  headerTagline?: number;  // Décalage horizontal Surtitre (Axe X en %, défaut: 0)
  eventName?: number;      // Décalage horizontal Titre Événement (Axe X en %, défaut: 0)
  punchline?: number;      // Décalage horizontal Sous-titre (Axe X en %, défaut: 0)
  headlineBadge?: number;  // Décalage horizontal Badge (Axe X en %, défaut: 0)
  djName?: number;         // Décalage horizontal Nom Artiste (Axe X en %, défaut: 0)
  infoBadge?: number;      // Décalage horizontal Cartouche Date/Lieu (Axe X en %, défaut: 0)
}

export interface TextAlignments {
  headerTagline?: 'left' | 'center' | 'right';
  eventName?: 'left' | 'center' | 'right';
  punchline?: 'left' | 'center' | 'right';
  headlineBadge?: 'left' | 'center' | 'right';
  djName?: 'left' | 'center' | 'right';
  infoBadge?: 'left' | 'center' | 'right';
}

export interface TextColors {
  headerTagline?: string;  // Couleur Surtitre (défaut '#FFFFFF' ou '#000000')
  eventName?: string;      // Couleur Titre Événement (défaut '#FFFFFF' ou '#000000')
  punchline?: string;      // Couleur Sous-titre (défaut '#FFFFFF' ou '#000000')
  headlineBadge?: string;  // Couleur Badge (défaut '#FFFFFF' ou '#000000')
  djName?: string;         // Couleur Artiste / Intervenant (défaut '#FFFFFF' ou '#000000')
  infoBadge?: string;      // Couleur Cartouche Date/Lieu (défaut '#FFFFFF' ou '#000000')
}

export type TextFontWeight = 'normal' | 'semibold' | 'bold' | 'black';

export function resolveFontWeight(weight?: string | number): number {
  if (typeof weight === 'number') return weight;
  switch (weight) {
    case 'normal': return 400;
    case 'semibold': return 600;
    case 'bold': return 800;
    case 'black': return 900;
    default: return 800;
  }
}

export interface PosterTextItem {
  id: string;
  type: 'surtitre' | 'titre' | 'soustitre' | 'info' | 'custom';
  label: string;
  text: string;
  maxLength: number; // 25 pour titre/surtitre/soustitre, plus souple pour info
  x: number; // Offset horizontal en % (-50 à +50, défaut 0)
  y: number; // Position verticale en %
  align: 'left' | 'center' | 'right';
  color: string;
  accentColor?: string; // Couleur d'accentuation pour les mots mis en valeur
  highlightedWords?: string[]; // Liste des mots spécifiques à accentuer
  layerPosition?: 'behind_subject' | 'front_subject'; // Profondeur relative au Sujet (z-index)
  fontSizeScale?: number; // Ajustement d'échelle local (optionnel)
  isInline?: boolean; // Positionnement absolu / inline sur le même axe Y horizontal
  isVisible: boolean;
  letterSpacing?: number; // Espacement interlettres en px (0 à 15px)
  fontWeight?: TextFontWeight | number; // Graisse typographique ('normal' | 'semibold' | 'bold' | 'black')
  hasBackgroundPill?: boolean; // Capsule / Halo de contraste sombre translucide
}

export type LayoutTemplateId = 'duality_campaign' | 'headliner_event' | 'minimal_brand';

export interface DualityCampaignSlots {
  topTextLeft: string;
  topTextRight: string;
  bottomTitle: string;
  bottomAccent: string;
}

export interface HeadlinerEventSlots {
  artistName: string;
  subRole: string;
  datePlace: string;
  ticketCta?: string;
}

export interface MinimalBrandSlots {
  brandName: string;
  tagline: string;
  releaseDate: string;
}

export function resolveLayoutTemplateId(data?: { layoutTemplate?: LayoutTemplateId; compositionTemplate?: string } | null): LayoutTemplateId {
  if (data?.layoutTemplate) {
    if (data.layoutTemplate === 'headliner_event' || data.layoutTemplate === 'minimal_brand' || data.layoutTemplate === 'duality_campaign') {
      return data.layoutTemplate;
    }
  }
  if (data?.compositionTemplate === 'headliner') return 'headliner_event';
  if (data?.compositionTemplate === 'minimalist') return 'minimal_brand';
  return 'duality_campaign';
}

export function resolveDualityCampaignSlots(data?: any): DualityCampaignSlots {
  return {
    topTextLeft: data?.templateData?.topTextLeft ?? data?.dualityCampaignSlots?.topTextLeft ?? data?.topTextLeft ?? data?.topDualLeft ?? data?.headerTagline ?? 'DESCENDRE DANS LA RUE.',
    topTextRight: data?.templateData?.topTextRight ?? data?.dualityCampaignSlots?.topTextRight ?? data?.topTextRight ?? data?.topDualRight ?? data?.headlineBadgeText ?? 'SE FAIRE ENTENDRE AUTREMENT.',
    bottomTitle: data?.templateData?.bottomTitle ?? data?.dualityCampaignSlots?.bottomTitle ?? data?.bottomTitle ?? data?.mainTitle ?? data?.eventName ?? 'CHOISISSEZ',
    bottomAccent: data?.templateData?.bottomAccent ?? data?.dualityCampaignSlots?.bottomAccent ?? data?.bottomAccent ?? data?.accentWord ?? data?.punchline ?? 'VOTRE VOIE.',
  };
}

export function resolveHeadlinerEventSlots(data?: any): HeadlinerEventSlots {
  return {
    artistName: data?.headlinerEventSlots?.artistName ?? data?.artistName ?? data?.djName ?? data?.eventName ?? 'AMELIE LENS',
    subRole: data?.headlinerEventSlots?.subRole ?? data?.subRole ?? data?.punchline ?? 'VOCAL MELODIC TECHNO',
    datePlace: data?.headlinerEventSlots?.datePlace ?? data?.datePlace ?? (data?.date && data?.venue ? `${data.date} // ${data.venue}` : (data?.date || data?.venue || 'SAMEDI 24 OCTOBRE // CLUB VISION ROOM')),
    ticketCta: data?.headlinerEventSlots?.ticketCta ?? data?.ticketCta ?? 'BILLETTERIE DISPONIBLE',
  };
}

export function resolveMinimalBrandSlots(data?: any): MinimalBrandSlots {
  return {
    brandName: data?.minimalBrandSlots?.brandName ?? data?.brandName ?? data?.eventName ?? data?.djName ?? 'SIGNAID STUDIO',
    tagline: data?.minimalBrandSlots?.tagline ?? data?.tagline ?? data?.punchline ?? data?.headerTagline ?? 'L\'IMPACT VISUEL SANS CONCESSION',
    releaseDate: data?.minimalBrandSlots?.releaseDate ?? data?.releaseDate ?? data?.date ?? 'COLLECTION AUTOMNE 2026',
  };
}

export interface EventInput {
  eventName: string;
  djName: string;
  genre?: MusicGenre;
  headerTagline?: string;
  typographyStyle?: TypographyStyle;
  accentColor?: string;
  punchline: string;
  headlineBadgeText?: string;
  // --- GABARITS DE COMPOSITION INTELLIGENTS & SLOTS FERMÉS ---
  layoutTemplate?: LayoutTemplateId;
  templateData?: {
    topTextLeft?: string;
    topTextRight?: string;
    bottomTitle?: string;
    bottomAccent?: string;
    [key: string]: any;
  };
  dualityCampaignSlots?: DualityCampaignSlots;
  headlinerEventSlots?: HeadlinerEventSlots;
  minimalBrandSlots?: MinimalBrandSlots;
  topTextLeft?: string;
  topTextRight?: string;
  bottomTitle?: string;
  bottomAccent?: string;
  artistName?: string;
  subRole?: string;
  datePlace?: string;
  ticketCta?: string;
  brandName?: string;
  tagline?: string;
  releaseDate?: string;
  compositionTemplate?: 'campaign_dual' | 'headliner' | 'minimalist' | 'custom_legacy';
  topDualLeft?: string;
  topDualRight?: string;
  mainTitle?: string;
  accentWord?: string;
  venue: string;
  location?: string;
  date: string;
  timeSlot?: string;
  time?: string;
  ticketPrice?: string;
  lineup?: string;
  colorPalette?: VisualPalette;
  tshirtColor?: TshirtColor;
  themeColor?: string;
  primaryColor?: string;
  // --- SECOND SUJET (DUO / B2B) ---
  secondaryDjPhoto?: string;
  rawSecondaryDjPhoto?: string;
  secondaryDjPhotoScale?: number;
  secondaryDjPhotoOffsetX?: number;
  secondaryDjPhotoOffsetY?: number;
  subject2Scale?: number;
  subject2OffsetX?: number;
  subject2OffsetY?: number;
  // 📌 Ancrage relatif du Sujet 2 au Sujet 1 (mêmes conventions que le logo)
  secondaryIsPinnedToSubject?: boolean;
  secondaryRelativeOffsetX?: number;
  secondaryRelativeOffsetY?: number;
  secondaryRelativeScale?: number;
  /** Ordre de superposition des deux sujets (défaut : le Sujet 2 passe devant). */
  subjectStackOrder?: 'secondary-front' | 'primary-front';
  foregroundSubject?: 'subject1' | 'subject2';
  subjectLayerOrder?: '1_over_2' | '2_over_1';
  flyerConfig?: any;
  secondaryDjPhotoOpacity?: number;
  secondarySubjectFadeIntensity?: number;
  secondarySubjectBrightness?: number;
  secondarySubjectContrast?: number;
  secondarySubjectSaturation?: number;
  secondarySubjectHueRotate?: number;
  secondarySubjectShadowOffsetX?: number;
  secondarySubjectShadowOffsetY?: number;
  secondarySubjectShadowBlur?: number;
  secondarySubjectShadowColor?: string;
  secondarySubjectShadowOpacity?: number;
  subjectPrompt?: string;
  secondarySubjectPrompt?: string;
  // Nouveaux champs pour les liens interactifs de la page dédiée (signaid.eu)
  venueAddress?: string;     // Adresse complète pour le lien direct Google Maps
  venueMapsUrl?: string;     // URL directe Google Maps personnalisée ou mémorisée
  artistSocialUrl?: string;  // Lien profil Instagram / TikTok de l'artiste principal
  instagramHandle?: string;  // Handle Instagram de l'artiste
  organizationUrl?: string;  // Site web vitrine ou lien de billetterie officielle
  artistUrl?: string;        // URL cliquable vers la page/hub de l'artiste
  calendarUrl?: string;      // URL directe Google Agenda personnalisée ou générée
  textUrls?: Record<string, string>; // URLs cliquables dédiées par élément textuel du template
  platformBadge?: string;    // Badge plateforme de diffusion (ex: TIKTOK LIVE)
  id?: string;               // Identifiant unique de projet / affiche
  projectId?: string;        // ID de projet cloud / session
  eventId?: string;          // ID d'événement cloud / session
  slug?: string;             // Slug public unifié du portail (/hub/:slug)
  isDeployed?: boolean;      // Statut de mise en ligne du portail
  status?: string;           // Statut du projet (En ligne, in_production, etc.)
  printOrder?: {
    status: 'in_production' | 'pending' | 'shipped' | 'delivered';
    trackingUrl?: string | null;
    orderedAt?: string;
    packageType?: string;
    quantity?: number;
    priceEur?: number;
    stripeSessionId?: string | null;
  };
  flyer300DpiUrl?: string;   // Fichier 300 DPI haute résolution

  // Logo & Refonte options (Affiche)
  logoImage?: string; // Uploaded logo data URL
  logoUrl?: string | null;
  logoPositionX?: number; // en pourcentage (0% à 100%)
  logoPositionY?: number; // en pourcentage (0% à 100%)
  logoScale?: number; // facteur d'échelle (0.2 à 2.5, défaut 0.6)
  // 📌 Ancrage relatif (parenting) du logo au Sujet 1.
  // Offsets exprimés en % de la hauteur du canevas, à l'échelle 1 du sujet, relatifs au point d'ancrage
  // du sujet (bas-centre). relativeScale est multiplié par l'échelle du sujet à l'affichage.
  isPinnedToSubject?: boolean;
  relativeOffsetX?: number;
  relativeOffsetY?: number;
  relativeScale?: number;
  logoOpacity?: number; // opacité (0.1 à 1.0, défaut 1.0)
  logoRotation?: number; // rotation éventuelle (-180° à 180°, défaut 0)
  logoColorMode?: LogoColorMode; // 👈 Intégration Signaid v24 (original, white, black, knockout_black, screen)
  logoBlendMode?: 'normal' | 'screen' | 'overlay';
  isPhoneScreen?: boolean; // Rendu rétroéclairé écran smartphone
  isLogoRedesignRequested?: boolean;
  redesignedLogoSvg?: string;

  // Marquage Exclusif Textile / Vêtement (DTF)
  tshirtCustomLogo?: string; // Logo exclusif vêtement (n'apparaît jamais sur l'affiche)
  rawTshirtLogoOriginal?: string; // Source brute sans perte pour recalculs
  tshirtLogoColorMode?: LogoColorMode; // Traitement chromatique dédié vêtement
  tshirtLogoScale?: number; // Échelle spécifique sur poitrine/dos (0.3 à 2.5)
  tshirtLogoOffsetY?: number; // Positionnement vertical spécifique (-25 à +25)
  tshirtPreviewImage?: string; // Image rendu mannequin IA ou mockup pour le Hub public
  tshirtPreviewImages?: {
    front?: string | null;
    back?: string | null;
  };
  tshirtBackCustomLogo?: string;
  tshirtBackLogoDisabled?: boolean;
  tshirtPreviewImagesLogoHash?: string;
  tshirtBackLogoScale?: number;
  tshirtBackLogoOffsetY?: number;
  tshirtSide?: 'front' | 'back'; // Vue courante face ou dos
  tshirtFrontPlacement?: LogoPlacement; // Coordonnées et échelle logo sur gabarit face
  tshirtBackPlacement?: LogoPlacement; // Coordonnées et échelle logo sur gabarit dos
  flyerImageUrl?: string; // Visuel complet compilé du flyer au format A3 (Option A)
  previewImages?: {
    a3?: string | null;
    post?: string | null;
    story?: string | null;
    banner?: string | null;
    [key: string]: any;
  };

  // Background & Ambiance image options
  ambiancePrompt?: string;
  ambianceEngine?: string;
  backgroundImage?: string;
  backgroundUrl?: string;
  bgImage?: string;
  customBackground?: string;
  bgPrompt?: string;
  backgroundOpacity?: number;
  backgroundBlur?: number;
  backgroundBrightness?: number; // 0.3 to 1.8 (default 1.0)
  backgroundTone?: number; // 0 = Fond Blanc Pur (#ffffff), 1 = Fond Noir Pur (#000000), défaut 0.8
  isBackgroundToneEnabled?: boolean; // par défaut true si défini, ou false
  backgroundOffsetX?: number; // Décalage horizontal du décor en % (-40 à +40)
  backgroundOffsetY?: number; // Décalage vertical du décor en % (-40 à +40)
  backgroundScale?: number; // Facteur d'échelle du décor (défaut 1.0)

  // DJ photo options & clean AI integration
  djPhoto?: string;
  djPhotoBlendMode?: DjBlendMode;
  djPhotoOpacity?: number;
  djPhotoScale?: number;
  djPhotoOffsetY?: number;
  djPhotoOffsetX?: number;
  subjectScale?: number;
  subjectPositionX?: number;
  subjectPositionY?: number;
  logoOffsetY?: number;
  logoPosition?: string;

  // Layout & Composition Mode
  layoutMode?: 'raw' | 'embellished';

  // Palette de contraste intelligent renvoyée par l'IA
  dynamicTheme?: DynamicTheme;

  // Raw originals for toggling back to montage brut
  rawDjPhoto?: string;
  rawLogoImage?: string;
  isSubjectBackgroundRemoved?: boolean;
  isLogoBackgroundRemoved?: boolean;
  isSubjectGradientFade?: boolean;
  isSubjectHarmonized?: boolean;
  isSubjectMerged?: boolean; // Vrai lorsque le sujet a été fusionné de manière générative dans le décor (Google Imagen 3)
  backupBeforeMerge?: {
    backgroundImage?: string;
  backgroundUrl?: string;
    customBackground?: string;
    bgImage?: string;
    djPhoto?: string;
    rawDjPhoto?: string;
    isSubjectBackgroundRemoved?: boolean;
    isSubjectHarmonized?: boolean;
    subjectBrightness?: number;
    subjectContrast?: number;
    subjectSaturation?: number;
    subjectHueRotate?: number;
    subjectShadowOffsetX?: number;
    subjectShadowOffsetY?: number;
    subjectShadowBlur?: number;
    subjectShadowColor?: string;
    subjectShadowOpacity?: number;
    subjectBlendMode?: string;
  };
  subjectFadeIntensity?: number;

  // Paramètres d'ajustement & d'harmonisation IA du calque sujet (lumière, filtres, ombre portée)
  subjectBrightness?: number; // 0.5 à 1.5 (défaut 1.0)
  subjectContrast?: number; // 0.5 à 1.5 (défaut 1.0)
  subjectSaturation?: number; // 0.0 à 2.0 (défaut 1.0)
  subjectHueRotate?: number; // -180 à 180 deg (défaut 0, rotation chromatique pour réchauffer/refroidir)
  subjectShadowOffsetX?: number; // -50 à 50 px (décalage ombre selon direction lumière décor)
  subjectShadowOffsetY?: number; // 0 à 60 px (hauteur ombre portée)
  subjectShadowBlur?: number; // 0 à 60 px (douceur / diffusion ombre)
  subjectShadowColor?: string; // couleur ombre (e.g. rgba(0,0,0,0.65))
  subjectShadowOpacity?: number; // 0 à 1 (opacité ombre portée)
  subjectBlendMode?: string; // mode de fusion ('normal' | 'overlay' | 'soft-light' | 'multiply')
  subjectLightingSummary?: string; // Résumé visuel IA de la lumière du décor
  subjectLightingDirection?: string; // Direction dominante source lumière (ex: top-left)
  subjectLightingTemperature?: string; // Température de couleur (warm | cool | neutral)
  formatTransforms?: {
    post?: FormatTransformConfig;
    a3?: FormatTransformConfig;
    story?: FormatTransformConfig;
    banner?: FormatTransformConfig;
    tshirt?: FormatTransformConfig;
    [key: string]: FormatTransformConfig | undefined;
  };

  // Support des transforms du logo par format (héritage intelligent depuis le Post 1:1 maître et overrides locaux)
  logoFormatTransforms?: Partial<Record<'post' | 'story' | 'banner' | 'a3', LogoFormatTransform>> | Record<string, LogoFormatTransform>;

  // Échelles de texte globales et par format (indépendance par format / override)
  textScales?: TextScales;
  formatTextScales?: Partial<Record<'post' | 'story' | 'banner' | 'a3', TextScales>> | Record<string, TextScales>;

  // Décalages verticaux (Axe Y) globaux et par format (indépendance par format / override)
  textOffsetsY?: TextOffsetsY;
  formatTextOffsetsY?: Partial<Record<'post' | 'story' | 'banner' | 'a3', TextOffsetsY>> | Record<string, TextOffsetsY>;

  // Décalages horizontaux (Axe X en %) indépendants par segment textuel
  textOffsetsX?: TextOffsetsX;
  formatTextOffsetsX?: Partial<Record<'post' | 'story' | 'banner' | 'a3', TextOffsetsX>> | Record<string, TextOffsetsX>;

  // Espacement vertical global (interligne) et alignement horizontal des calques
  textLineSpacing?: number; // en cqi (défaut 0.8 cqi, plage 0 à 4 cqi)
  formatTextLineSpacing?: Partial<Record<'post' | 'story' | 'banner' | 'a3', number>> | Record<string, number>;
  textAlignment?: 'left' | 'center' | 'right'; // défaut 'center'
  formatTextAlignment?: Partial<Record<'post' | 'story' | 'banner' | 'a3', 'left' | 'center' | 'right'>> | Record<string, 'left' | 'center' | 'right'>;

  // Alignements horizontaux indépendants par segment textuel
  textAlignments?: TextAlignments;
  formatTextAlignments?: Partial<Record<'post' | 'story' | 'banner' | 'a3', TextAlignments>> | Record<string, TextAlignments>;

  // Couleurs des textes indépendantes par segment textuel et par format (Bascule Noir / Blanc)
  textColors?: TextColors;
  formatTextColors?: Partial<Record<'post' | 'story' | 'banner' | 'a3', TextColors>> | Record<string, TextColors>;

  // Ordre de superposition Titre / Sujet (défaut: le Sujet passe devant le grand titre)
  titleLayerOrder?: 'behind-subject' | 'front-subject';
  isVirgin?: boolean; // Indicateur d'état Studio 100% vierge (empêche l'écrasement ou l'injection de démo)

  // Réglages dimensionnels du Cartouche (Échelle/Largeur et Padding interne)
  cartoucheScale?: number;     // Facteur de dimension/largeur (0.5 à 2.0 = 50% à 200%, défaut: 1.0)
  cartouchePadding?: number;   // Facteur de marges internes (0.5 à 2.5 = 50% à 250%, défaut: 1.0)

  // Calques de textes modulaires et dynamiques (Étape 5)
  posterTexts?: PosterTextItem[];
}

export interface BackgroundFormatTransform {
  offsetX: number;
  offsetY: number;
  scale: number;
}

export interface FormatTransformConfig {
  scale: number;
  offsetY: number;
  offsetX?: number;
  alignX?: 'center' | 'left' | 'right';
  isCustom?: boolean;
  background?: BackgroundFormatTransform;
}

export type FormatTransform = FormatTransformConfig;

export function getDefaultBackgroundTransform(formatKey: 'post' | 'story' | 'banner' | 'a3' | string): BackgroundFormatTransform {
  switch (formatKey) {
    case 'story':
      // Story (9:16) : centrage automatique optimisé sur la hauteur avec scale: 1.0
      return { offsetX: 0, offsetY: 0, scale: 1.0 };
    case 'banner':
      // Bannière (16:9) : centrage automatique optimisé sur la largeur avec scale: 1.0
      return { offsetX: 0, offsetY: 0, scale: 1.0 };
    case 'post':
    case 'a3':
    case 'flyer':
    default:
      // Post (1:1) / Flyer : centrage neutre
      return { offsetX: 0, offsetY: 0, scale: 1.0 };
  }
}

export function resolveBackgroundTransformForFormat(
  input: EventInput,
  formatKey: 'post' | 'story' | 'banner' | 'a3' | string
): BackgroundFormatTransform {
  const resolvedKey = (['post', 'story', 'banner', 'a3'].includes(formatKey) ? formatKey : 'a3') as 'post' | 'story' | 'banner' | 'a3';
  const configured = input.formatTransforms?.[resolvedKey]?.background ||
    (resolvedKey === 'a3' ? (input.formatTransforms as any)?.flyer?.background : undefined);
  if (configured) {
    return {
      offsetX: typeof configured.offsetX === 'number' ? configured.offsetX : 0,
      offsetY: typeof configured.offsetY === 'number' ? configured.offsetY : 0,
      scale: typeof configured.scale === 'number' ? configured.scale : 1.0,
    };
  }
  // Rétrocompatibilité Post 1:1
  if (resolvedKey === 'post' && (typeof input.backgroundOffsetX === 'number' || typeof input.backgroundOffsetY === 'number' || typeof input.backgroundScale === 'number')) {
    return {
      offsetX: input.backgroundOffsetX ?? 0,
      offsetY: input.backgroundOffsetY ?? 0,
      scale: input.backgroundScale ?? 1.0,
    };
  }
  return getDefaultBackgroundTransform(resolvedKey);
}

export function getDefaultFormatTransforms(
  masterScale: number = 1.0,
  masterOffsetY: number = 0,
  masterOffsetX: number = 0
): Record<'post' | 'a3' | 'story' | 'banner' | 'tshirt', FormatTransformConfig> {
  return {
    post: {
      scale: Number((masterScale * 1.0).toFixed(2)),
      offsetY: masterOffsetY + 0,
      offsetX: masterOffsetX + 0,
      alignX: 'center',
      isCustom: false,
    },
    a3: {
      scale: Number((masterScale * 1.0).toFixed(2)),
      offsetY: 0,
      offsetX: masterOffsetX + 0,
      alignX: 'center',
      isCustom: false,
    },
    story: {
      scale: Number((masterScale * 1.08).toFixed(2)),
      offsetY: Number((masterOffsetY * 1.10 - 5).toFixed(1)),
      offsetX: masterOffsetX + 0,
      alignX: 'center',
      isCustom: false,
    },
    banner: {
      scale: Number((masterScale * 0.70).toFixed(2)),
      offsetY: Number((masterOffsetY * 0.70 + 8).toFixed(1)),
      offsetX: masterOffsetX + 0,
      alignX: 'center',
      isCustom: false,
    },
    tshirt: {
      scale: Number((masterScale * 1.0).toFixed(2)),
      offsetY: masterOffsetY + 0,
      offsetX: masterOffsetX + 0,
      alignX: 'center',
      isCustom: false,
    },
  };
}

export interface LogoFormatTransform {
  x: number;          // Position X en % (0-100)
  y: number;          // Position Y en % (0-100)
  scale: number;      // Échelle relative (ex: 1.0)
  isCustom?: boolean; // True si modifié spécifiquement sur ce format
}

/**
 * Résout la position et l'échelle du logo pour le format actif (previewFormat) :
 * - Si post (Format Maître 1:1) : prend les coordonnées maîtresses.
 * - Si dérivé avec isCustom: true : utilise ses coordonnées custom.
 * - Si dérivé en mode hérité : calcule l'occupation d'espace proportionnel (bounding box scaling)
 *   adapté au ratio du canvas (Story 9:16, Bannière, Flyers A3).
 */
export function resolveLogoTransformForFormat(
  input: Partial<EventInput>,
  previewFormat?: string
): LogoFormatTransform & { isCustom: boolean } {
  const masterX = typeof input.logoPositionX === 'number' ? input.logoPositionX : 85.2;
  const masterY = typeof input.logoOffsetY === 'number' ? input.logoOffsetY : (typeof input.logoPositionY === 'number' ? input.logoPositionY : 11.9);
  const masterScale = typeof input.logoScale === 'number' ? input.logoScale : 0.8;

  if (!previewFormat || previewFormat === 'post') {
    const postConfig = input.logoFormatTransforms?.post;
    if (postConfig && postConfig.isCustom) {
      return {
        x: postConfig.x,
        y: typeof input.logoOffsetY === 'number' ? input.logoOffsetY : postConfig.y,
        scale: typeof input.logoScale === 'number' ? input.logoScale : postConfig.scale,
        isCustom: true,
      };
    }
    return {
      x: masterX,
      y: masterY,
      scale: masterScale,
      isCustom: false,
    };
  }

  const formatKey = previewFormat as 'story' | 'banner' | 'a3';
  const customConfig = input.logoFormatTransforms?.[formatKey];
  const isLegacyDemoA3 =
    formatKey === 'a3' &&
    customConfig &&
    Math.abs((customConfig.x ?? 0) - 64.9) < 0.5 &&
    Math.abs((customConfig.y ?? 0) - 62.5) < 0.5;

  if (customConfig && customConfig.isCustom && !isLegacyDemoA3) {
    return {
      x: customConfig.x,
      y: formatKey === 'a3' && typeof input.logoOffsetY === 'number' ? input.logoOffsetY : customConfig.y,
      scale: formatKey === 'a3' && typeof input.logoScale === 'number' ? input.logoScale : customConfig.scale,
      isCustom: true,
    };
  }

  // Calcul par ancrage relatif au bord (ex: coin haut-droit)
  const fromRight = masterX > 50;
  const fromBottom = masterY > 50;
  const marginX = fromRight ? (100 - masterX) : masterX;
  const marginY = fromBottom ? (100 - masterY) : masterY;

  // Calcul d'occupation proportionnelle par conservation rigoureuse des marges d'ancrage aux bords :
  const projectedX = fromRight ? (100 - marginX) : marginX;
  const projectedY = fromBottom ? (100 - marginY) : marginY;
  const scaleFactor = 1.0;

  return {
    x: Number(projectedX.toFixed(1)),
    y: Number(projectedY.toFixed(1)),
    scale: Number((masterScale * scaleFactor).toFixed(2)),
    isCustom: false,
  };
}

export function resolveUnifiedEventSlug(input?: Partial<EventInput> | null): string {
  if (!input) return 'portail-interactif-signaid';
  const raw = (input.djName || input.eventName || 'portail-interactif-signaid')
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (!raw || raw === 'titre-1' || raw === 'titre-2' || raw === 'titre-1-titre-2') {
    return 'portail-interactif-signaid';
  }
  return raw;
}

/**
 * Met à jour le transform du logo :
 * - Si post (ou non spécifié) : met à jour le Maître (logoPositionX, logoPositionY, logoScale).
 *   Tous les formats non customisés recalculent automatiquement leur projection.
 * - Si dérivé (story, banner, a3) : marque isCustom: true et enregistre pour ce format.
 */
export function updateLogoTransform(
  prev: EventInput,
  previewFormat: string,
  updates: Partial<LogoFormatTransform>
): EventInput {
  const currentResolved = resolveLogoTransformForFormat(prev, previewFormat || 'post');

  if (!previewFormat || previewFormat === 'post') {
    const newX = updates.x !== undefined ? updates.x : currentResolved.x;
    const newY = updates.y !== undefined ? updates.y : currentResolved.y;
    const newScale = updates.scale !== undefined ? updates.scale : currentResolved.scale;

    const nextFormatTransforms = { ...(prev.logoFormatTransforms || {}) };
    nextFormatTransforms.post = {
      ...(nextFormatTransforms.post || {}),
      x: newX,
      y: newY,
      scale: newScale,
      isCustom: true,
    };
    const isLegacyDemoA3 =
      nextFormatTransforms.a3 &&
      Math.abs((nextFormatTransforms.a3.x ?? 0) - 64.9) < 0.5 &&
      Math.abs((nextFormatTransforms.a3.y ?? 0) - 62.5) < 0.5;
    if (!nextFormatTransforms.a3 || !nextFormatTransforms.a3.isCustom || isLegacyDemoA3) {
      nextFormatTransforms.a3 = {
        x: newX,
        y: newY,
        scale: newScale,
        isCustom: false,
      };
    }

    return {
      ...prev,
      logoPositionX: newX,
      logoPositionY: newY,
      logoOffsetY: newY,
      logoScale: newScale,
      logoFormatTransforms: nextFormatTransforms,
    };
  }

  const formatKey = previewFormat as 'story' | 'banner' | 'a3';
  const newX = updates.x !== undefined ? updates.x : currentResolved.x;
  const newY = updates.y !== undefined ? updates.y : currentResolved.y;
  const newScale = updates.scale !== undefined ? updates.scale : currentResolved.scale;

  return {
    ...prev,
    ...(formatKey === 'a3'
      ? {
        logoPositionX: newX,
        logoPositionY: newY,
        logoOffsetY: newY,
        logoScale: newScale,
      }
      : {}),
    logoFormatTransforms: {
      ...(prev.logoFormatTransforms || {}),
      [formatKey]: {
        x: newX,
        y: newY,
        scale: newScale,
        isCustom: true,
      },
    },
  };
}

/**
 * Réinitialise le transform d'un format dérivé pour rétablir l'héritage automatique depuis le maître.
 */
export function resetLogoTransformForFormat(
  prev: EventInput,
  previewFormat: string
): EventInput {
  if (!previewFormat || previewFormat === 'post') return prev;
  const formatKey = previewFormat as 'story' | 'banner' | 'a3';
  const masterX = typeof prev.logoPositionX === 'number' ? prev.logoPositionX : 85.2;
  const masterY = typeof prev.logoPositionY === 'number' ? prev.logoPositionY : 11.9;
  const masterScale = typeof prev.logoScale === 'number' ? prev.logoScale : 0.8;
  const updatedTransforms = {
    ...(prev.logoFormatTransforms || {}),
    [formatKey]: {
      x: masterX,
      y: masterY,
      scale: masterScale,
      isCustom: false,
    },
  };

  return {
    ...prev,
    logoFormatTransforms: updatedTransforms,
  };
}

/**
 * Résout dynamiquement le filtre visuel du logo en fonction du décor :
 * - Tonalité du décor (fond sombre vs fond clair/lumineux)
 * - Thème et style graphique (FUTUR, HARD, URBAN)
 * - Couleur d'accent et halo néon
 * - Mode de couleur du logo ('auto', 'neon', 'white', 'black', 'original', 'knockout_black')
 */
export function resolveDynamicLogoFilter(
  input: Partial<EventInput>,
  options?: {
    forceMode?: LogoColorMode;
    disableGlow?: boolean;
  }
): string {
  const isToneActive = input.isBackgroundToneEnabled !== false;
  const currentTone =
    typeof input.backgroundTone === 'number'
      ? input.backgroundTone
      : typeof input.backgroundOpacity === 'number'
        ? input.backgroundOpacity
        : 0.8;
  const isLightCanvas = isToneActive && currentTone < 0.48;

  const mode = options?.forceMode || input.logoColorMode || 'auto';

  // Détermination de la couleur d'accentuation (dynamique ou preset)
  const primaryColor =
    input.accentColor && /^#[0-9A-Fa-f]{6}$/.test(input.accentColor)
      ? input.accentColor
      : input.dynamicTheme?.primaryAccent && /^#[0-9A-Fa-f]{6}$/.test(input.dynamicTheme.primaryAccent)
        ? input.dynamicTheme.primaryAccent
        : '#FF6B00';

  // Style graphique normalisé
  const normStyle = (input.typographyStyle || '').toUpperCase();
  const normTag = (input.headerTagline || '').toUpperCase();
  const isHard = normStyle === 'HARD' || normStyle === 'TECHNO' || normTag.includes('HARD');
  const isUrban = normStyle === 'URBAN' || normTag.includes('URBAN');

  // Configuration du halo selon le style graphique
  const glowShadow = options?.disableGlow
    ? ''
    : isHard
      ? `drop-shadow(0 0 6px ${primaryColor}) drop-shadow(0 0 14px ${primaryColor}99) `
      : isUrban
        ? `drop-shadow(0 0 8px ${primaryColor}) drop-shadow(0 0 16px ${primaryColor}80) `
        : `drop-shadow(0 0 8px ${primaryColor}) drop-shadow(0 0 18px ${primaryColor}99) `;

  switch (mode) {
    case 'auto': {
      if (isLightCanvas) {
        // Décor clair / lumineux : bascule instantanée sur la version sombre contrastée
        return 'brightness(0) drop-shadow(0 2px 10px rgba(0,0,0,0.35))';
      }
      // Décor sombre : bascule instantanée sur la version claire lumineuse avec halo néon accordé
      return `brightness(0) invert(1) ${glowShadow}drop-shadow(0 4px 18px rgba(0,0,0,0.9))`;
    }

    case 'neon': {
      if (isLightCanvas) {
        return `brightness(0) drop-shadow(0 0 4px ${primaryColor}) drop-shadow(0 2px 10px rgba(0,0,0,0.35))`;
      }
      return `brightness(0) invert(1) drop-shadow(0 0 3px ${primaryColor}) drop-shadow(0 0 10px ${primaryColor}) drop-shadow(0 0 22px ${primaryColor}cc) drop-shadow(0 4px 18px rgba(0,0,0,0.9))`;
    }

    case 'white': {
      if (isLightCanvas) {
        return 'brightness(0) invert(1) drop-shadow(0 0 2px #000000) drop-shadow(0 2px 14px rgba(0,0,0,0.85))';
      }
      return `brightness(0) invert(1) drop-shadow(0 0 8px ${primaryColor}60) drop-shadow(0 4px 18px rgba(0,0,0,0.85))`;
    }

    case 'black': {
      if (!isLightCanvas) {
        return `brightness(0) drop-shadow(0 0 2px rgba(255,255,255,0.9)) drop-shadow(0 0 8px ${primaryColor}60) drop-shadow(0 4px 18px rgba(0,0,0,0.9))`;
      }
      return 'brightness(0) drop-shadow(0 2px 10px rgba(0,0,0,0.25))';
    }

    case 'knockout_black': {
      if (isLightCanvas) {
        return 'brightness(0) drop-shadow(0 2px 10px rgba(0,0,0,0.3))';
      }
      return `brightness(0) invert(1) drop-shadow(0 0 8px ${primaryColor}70) drop-shadow(0 4px 18px rgba(0,0,0,0.85))`;
    }

    case 'screen': {
      return 'drop-shadow(0 0 10px rgba(249, 115, 22, 0.5)) drop-shadow(0 0 20px rgba(249, 115, 22, 0.25))';
    }

    case 'original':
    default: {
      if (isLightCanvas) {
        return 'contrast(1.05) drop-shadow(0 2px 8px rgba(0,0,0,0.35))';
      }
      return `contrast(1.05) drop-shadow(0 0 8px ${primaryColor}50) drop-shadow(0 4px 18px rgba(0,0,0,0.85))`;
    }
  }
}

/**
 * Logique de gestion du filtre de tonalité / teinte selon la valeur du curseur (tone)
 * - 0 : Neutre au centre (aucun filtre forcé)
 * - > 0 : Vers le clair/blanc
 * - < 0 : Vers le sombre/noir
 */
export const getToneFilter = (val: number): string => {
  if (val === 0) return 'none'; // Neutre au centre
  if (val > 0) return `brightness(${1 + val * 0.01}) contrast(${1 + val * 0.005})`; // Vers le clair/blanc
  return `brightness(${1 + val * 0.01}) grayscale(${Math.abs(val)}%)`; // Vers le sombre/noir
};

/**
 * Résout le filtre CSS à partir de la valeur de tonalité (normalisée 0..1 avec 0.5 au centre ou -100..100)
 */
export const resolveToneFilter = (tone?: number): string => {
  if (typeof tone !== 'number') return 'none';
  // Si normalisé entre 0 et 1 (0 = blanc, 0.5 = neutre, 1 = noir)
  if (tone >= 0 && tone <= 1) {
    if (Math.abs(tone - 0.5) < 0.02) return 'none';
    // Vers le blanc (< 0.5) -> val > 0 ; Vers le noir (> 0.5) -> val < 0
    const val = Math.round((0.5 - tone) * 100);
    return getToneFilter(val);
  }
  // Si valeur entre 0 et 100 avec 50 au centre
  if (tone > 1 && tone <= 100) {
    if (Math.abs(tone - 50) < 1) return 'none';
    return getToneFilter(50 - tone);
  }
  return getToneFilter(tone);
};

export interface ToneOverlayState {
  isNeutral: boolean;
  color: string;
  opacity: number;
  display: 'none' | 'block';
  filterCss: string;
}

/**
 * RÈGLE STRICTE TONALITÉ DU DÉCOR :
 * Calcule l'état du calque d'overlay blanc/noir et le filtre CSS associé selon la position du curseur de tonalité.
 * - Échelle standard StudioComposer 0..1 (0 = blanc 100%, 0.5 = neutre 50%, 1 = noir 100%)
 * - Échelle 0..100 (0 = blanc 100%, 50 = neutre 50%, 100 = noir 100%)
 * - Échelle bipolaire -100..100 ou -1..1 (0 = neutre)
 *
 * RÈGLES IMPÉRATIVES :
 * 1. Lorsque le curseur est positionné au centre (50% ou 0 selon l'échelle) :
 *    - L'opacité du calque d'overlay doit être exactement égale à 0 (opacity: 0).
 *    - Le calque d'overlay doit avoir display: 'none'.
 * 2. Aucun filtre CSS (brightness, contrast ou filter) ne doit altérer l'image source brute lorsque le curseur est en position neutre (filter: 'none').
 */
export function computeToneOverlay(
  tone?: number,
  isToneActive: boolean = true,
  backgroundBrightness?: number
): ToneOverlayState {
  // Si la tonalité est explicitement désactivée
  if (!isToneActive) {
    return {
      isNeutral: true,
      color: 'transparent',
      opacity: 0,
      display: 'none',
      filterCss: 'none',
    };
  }

  const val = typeof tone === 'number' ? tone : 0.5;

  let isNeutral = false;
  let color = 'transparent';
  let opacity = 0;

  // 1. Échelle 0..100 (centre exact à 50%)
  if (val > 1 && val <= 100) {
    if (Math.abs(val - 50) < 1 || val === 50) {
      isNeutral = true;
    } else if (val < 50) {
      color = '#ffffff';
      opacity = (50 - val) / 50;
    } else {
      color = '#000000';
      opacity = (val - 50) / 50;
    }
  }
  // 2. Échelle standard normalisée 0..1 (centre exact à 0.5 ou 50%)
  else if (val >= 0 && val <= 1) {
    if (Math.abs(val - 0.5) < 0.02 || val === 0.5) {
      isNeutral = true;
    } else if (val < 0.5) {
      color = '#ffffff';
      opacity = (0.5 - val) * 2;
    } else {
      color = '#000000';
      opacity = (val - 0.5) * 2;
    }
  }
  // 3. Échelle bipolaire centrée sur 0 (-100..100 ou -1..1)
  else {
    if (Math.abs(val) < 0.02 || val === 0) {
      isNeutral = true;
    } else if (val > 0) {
      color = '#ffffff';
      const maxScale = Math.abs(val) <= 1 ? 1 : 100;
      opacity = val / maxScale;
    } else {
      color = '#000000';
      const maxScale = Math.abs(val) <= 1 ? 1 : 100;
      opacity = Math.abs(val) / maxScale;
    }
  }

  // RÈGLE STRICTE 1 : En position neutre (centre), l'opacité est exactement égale à 0 et display 'none'
  if (isNeutral || opacity <= 0.0001) {
    return {
      isNeutral: true,
      color: 'transparent',
      opacity: 0,
      display: 'none',
      filterCss: 'none', // RÈGLE STRICTE 2 : Aucun filtre CSS ne doit altérer l'image source brute
    };
  }

  // RÈGLE STRICTE 2 : Si non neutre, calcul des filtres optionnels si actifs
  let filterCss = 'none';
  const resolvedFilter = resolveToneFilter(val);
  const hasToneFilter = Boolean(resolvedFilter && resolvedFilter !== 'none');
  const hasBrightness = typeof backgroundBrightness === 'number' && Math.abs(backgroundBrightness - 1.0) > 0.01;

  if (hasBrightness && hasToneFilter) {
    filterCss = `brightness(${backgroundBrightness}) ${resolvedFilter}`;
  } else if (hasBrightness) {
    filterCss = `brightness(${backgroundBrightness})`;
  } else if (hasToneFilter) {
    filterCss = resolvedFilter;
  }

  return {
    isNeutral: false,
    color,
    opacity: Math.max(0, Math.min(1, Number(opacity.toFixed(4)))),
    display: 'block',
    filterCss,
  };
}

export const DEFAULT_TEXT_SCALES: Required<TextScales> = {
  headerTagline: 1.0,
  eventName: 1.0,
  punchline: 1.0,
  headlineBadge: 1.0,
  djName: 1.0,
  infoBadge: 1.0,
};

/**
 * Résout les échelles de texte actives selon le format :
 * - Si post (Format Maître 1:1) ou tshirt : prend input.textScales (ou 1.0 par défaut).
 * - Si format dérivé (story, banner, a3) : vérifie si un override existe dans input.formatTextScales[previewFormat].
 *   Si oui, fusionne avec le format Maître pour garantir la continuité visuelle.
 */
export function resolveTextScalesForFormat(
  input: Partial<EventInput>,
  previewFormat?: string
): Required<TextScales> {
  const masterScales: Required<TextScales> = {
    headerTagline: input.textScales?.headerTagline ?? 1.0,
    eventName: input.textScales?.eventName ?? 1.0,
    punchline: input.textScales?.punchline ?? 1.0,
    headlineBadge: input.textScales?.headlineBadge ?? 1.0,
    djName: input.textScales?.djName ?? 1.0,
    infoBadge: input.textScales?.infoBadge ?? 1.0,
  };

  if (!previewFormat || previewFormat === 'post' || previewFormat === 'tshirt') {
    return masterScales;
  }

  const formatKey = previewFormat as 'story' | 'banner' | 'a3';
  const customScales = input.formatTextScales?.[formatKey];

  // Calcul d'occupation proportionnelle de la bounding box selon le ratio :
  const formatMultipliers: Record<'story' | 'banner' | 'a3', number> = {
    story: 0.92,  // 9:16 : largeur plus étroite, adaptation proportionnelle pour éviter les débordements
    banner: 0.82, // 16:9 : hauteur réduite et colonnes compactes
    a3: 0.98,     // 1:1.414 : proportion équilibrée
  };

  const multiplier = formatMultipliers[formatKey] ?? 1.0;

  return {
    headerTagline: customScales?.headerTagline ?? Number((masterScales.headerTagline * multiplier).toFixed(2)),
    eventName: customScales?.eventName ?? Number((masterScales.eventName * multiplier).toFixed(2)),
    punchline: customScales?.punchline ?? Number((masterScales.punchline * multiplier).toFixed(2)),
    headlineBadge: customScales?.headlineBadge ?? Number((masterScales.headlineBadge * multiplier).toFixed(2)),
    djName: customScales?.djName ?? Number((masterScales.djName * multiplier).toFixed(2)),
    infoBadge: customScales?.infoBadge ?? Number((masterScales.infoBadge * multiplier).toFixed(2)),
  };
}

/**
 * Met à jour une échelle de texte :
 * - Si post (Format Maître) : met à jour input.textScales et synchronise formatTextScales.a3.
 * - Si dérivé (story, banner, a3) : enregistre l'override dans input.formatTextScales[previewFormat].
 */
export function updateTextScaleForFormat(
  prev: EventInput,
  previewFormat: string,
  field: keyof TextScales,
  value: number
): EventInput {
  const rounded = Math.round(value * 100) / 100;
  const baseMasterScales: Required<TextScales> = {
    headerTagline: prev.textScales?.headerTagline ?? 1.0,
    eventName: prev.textScales?.eventName ?? 1.0,
    punchline: prev.textScales?.punchline ?? 1.0,
    headlineBadge: prev.textScales?.headlineBadge ?? 1.0,
    djName: prev.textScales?.djName ?? 1.0,
    infoBadge: prev.textScales?.infoBadge ?? 1.0,
  };

  if (!previewFormat || previewFormat === 'post' || previewFormat === 'tshirt') {
    const updatedMasterScales: Required<TextScales> = {
      ...baseMasterScales,
      [field]: rounded,
    };
    const nextFormatTextScales = { ...(prev.formatTextScales || {}) };
    if (nextFormatTextScales.a3) {
      nextFormatTextScales.a3 = {
        ...baseMasterScales,
        ...nextFormatTextScales.a3,
        [field]: rounded,
      };
    }
    return {
      ...prev,
      textScales: updatedMasterScales,
      formatTextScales: nextFormatTextScales,
    };
  }

  const formatKey = previewFormat as 'story' | 'banner' | 'a3';
  const currentFormatScales = prev.formatTextScales?.[formatKey] || { ...baseMasterScales };

  return {
    ...prev,
    ...(formatKey === 'a3'
      ? {
        textScales: {
          ...baseMasterScales,
          [field]: rounded,
        },
      }
      : {
        textScales: baseMasterScales,
      }),
    formatTextScales: {
      ...(prev.formatTextScales || {}),
      [formatKey]: {
        ...baseMasterScales,
        ...currentFormatScales,
        [field]: rounded,
      },
    },
  };
}

/**
 * Réinitialise les échelles de texte d'un format dérivé pour rétablir l'héritage depuis le format Maître.
 */
export function resetTextScalesForFormat(
  prev: EventInput,
  previewFormat: string
): EventInput {
  if (!previewFormat || previewFormat === 'post' || previewFormat === 'tshirt') {
    return {
      ...prev,
      textScales: { ...DEFAULT_TEXT_SCALES },
      formatTextScales: {
        ...(prev.formatTextScales || {}),
        a3: { ...DEFAULT_TEXT_SCALES },
      },
    };
  }

  const formatKey = previewFormat as 'story' | 'banner' | 'a3';
  const masterScales: Required<TextScales> = {
    headerTagline: prev.textScales?.headerTagline ?? 1.0,
    eventName: prev.textScales?.eventName ?? 1.0,
    punchline: prev.textScales?.punchline ?? 1.0,
    headlineBadge: prev.textScales?.headlineBadge ?? 1.0,
    djName: prev.textScales?.djName ?? 1.0,
    infoBadge: prev.textScales?.infoBadge ?? 1.0,
  };
  const updatedFormatScales = {
    ...(prev.formatTextScales || {}),
    [formatKey]: { ...masterScales },
  };

  return {
    ...prev,
    textScales: masterScales,
    formatTextScales: updatedFormatScales,
  };
}

export const DEFAULT_TEXT_OFFSETS_Y: Required<TextOffsetsY> = {
  headerTagline: 0,
  eventName: 0,
  punchline: 0,
  headlineBadge: 0,
  djName: 0,
  infoBadge: 0,
};

/**
 * Mappe un identifiant de champ textuel (template, rôle sémantique ou id de calque)
 * vers la clé canonique correspondante dans TextOffsetsY.
 */
export function mapFieldToTextOffsetKey(field: string | null | undefined): keyof TextOffsetsY {
  if (!field) return 'eventName';
  if (['topTextLeft', 'topDualLeft', 'headerTagline', 'tagline', 'text-surtitre', 'surtitre'].includes(field)) return 'headerTagline';
  if (['topTextRight', 'topDualRight', 'headlineBadgeText', 'headlineBadge', 'badge', 'text-badge'].includes(field)) return 'headlineBadge';
  if (['bottomTitle', 'mainTitle', 'eventName', 'headline', 'artistName', 'brandName', 'text-titre', 'titre'].includes(field)) return 'eventName';
  if (['bottomAccent', 'accentWord', 'punchline', 'subRole', 'text-soustitre', 'soustitre'].includes(field)) return 'punchline';
  if (['infoBadge', 'date', 'timeSlot', 'venue', 'datePlace', 'releaseDate', 'ticketCta', 'cartouche'].includes(field)) return 'infoBadge';
  if (['djName', 'text-dj', 'dj'].includes(field)) return 'djName';
  return 'eventName';
}

/**
 * Résout les décalages verticaux (axe Y) des textes selon le format :
 * - Si post (Format Maître 1:1) ou tshirt : prend input.textOffsetsY (ou 0 par défaut).
 * - Si format dérivé (story, banner, a3) : vérifie si un override existe dans input.formatTextOffsetsY[previewFormat].
 *   Si oui, fusionne avec le format Maître pour garantir la continuité visuelle.
 */
export function resolveTextOffsetsYForFormat(
  input: Partial<EventInput>,
  previewFormat?: string
): Required<TextOffsetsY> {
  const masterOffsets: Required<TextOffsetsY> = {
    headerTagline: input.textOffsetsY?.headerTagline ?? 0,
    eventName: input.textOffsetsY?.eventName ?? 0,
    punchline: input.textOffsetsY?.punchline ?? 0,
    headlineBadge: input.textOffsetsY?.headlineBadge ?? 0,
    djName: input.textOffsetsY?.djName ?? 0,
    infoBadge: input.textOffsetsY?.infoBadge ?? 0,
  };

  if (!previewFormat || previewFormat === 'post' || previewFormat === 'tshirt') {
    return masterOffsets;
  }

  const formatKey = previewFormat as 'story' | 'banner' | 'a3';
  const customOffsets = input.formatTextOffsetsY?.[formatKey];

  // Calcul d'expansion / compression verticale proportionnelle de la bounding box :
  const yMultipliers: Record<'story' | 'banner' | 'a3', number> = {
    story: 1.25,  // Canvas plus haut, espacement vertical proportionnel
    banner: 0.65, // Canvas très bas, resserrement vertical proportionnel
    a3: 1.10,     // Canvas A3 légèrement plus haut
  };

  const yMult = yMultipliers[formatKey] ?? 1.0;

  return {
    headerTagline: customOffsets?.headerTagline ?? Number((masterOffsets.headerTagline * yMult).toFixed(1)),
    eventName: customOffsets?.eventName ?? Number((masterOffsets.eventName * yMult).toFixed(1)),
    punchline: customOffsets?.punchline ?? Number((masterOffsets.punchline * yMult).toFixed(1)),
    headlineBadge: customOffsets?.headlineBadge ?? Number((masterOffsets.headlineBadge * yMult).toFixed(1)),
    djName: customOffsets?.djName ?? Number((masterOffsets.djName * yMult).toFixed(1)),
    infoBadge: customOffsets?.infoBadge ?? Number((masterOffsets.infoBadge * yMult).toFixed(1)),
  };
}

/**
 * Met à jour un décalage vertical (axe Y) d'un élément textuel :
 * - Si post (Format Maître) : met à jour input.textOffsetsY et synchronise formatTextOffsetsY.a3.
 * - Si dérivé (story, banner, a3) : enregistre l'override dans input.formatTextOffsetsY[previewFormat].
 */
export function updateTextOffsetYForFormat(
  prev: EventInput,
  previewFormat: string,
  field: keyof TextOffsetsY,
  value: number
): EventInput {
  const rounded = Math.round(value * 10) / 10;
  const baseMasterOffsets: Required<TextOffsetsY> = {
    headerTagline: prev.textOffsetsY?.headerTagline ?? 0,
    eventName: prev.textOffsetsY?.eventName ?? 0,
    punchline: prev.textOffsetsY?.punchline ?? 0,
    headlineBadge: prev.textOffsetsY?.headlineBadge ?? 0,
    djName: prev.textOffsetsY?.djName ?? 0,
    infoBadge: prev.textOffsetsY?.infoBadge ?? 0,
  };

  if (!previewFormat || previewFormat === 'post' || previewFormat === 'tshirt') {
    const updatedMasterOffsets: Required<TextOffsetsY> = {
      ...baseMasterOffsets,
      [field]: rounded,
    };
    const nextFormatTextOffsetsY = { ...(prev.formatTextOffsetsY || {}) };
    if (nextFormatTextOffsetsY.a3) {
      nextFormatTextOffsetsY.a3 = {
        ...baseMasterOffsets,
        ...nextFormatTextOffsetsY.a3,
        [field]: rounded,
      };
    }
    return {
      ...prev,
      textOffsetsY: updatedMasterOffsets,
      formatTextOffsetsY: nextFormatTextOffsetsY,
    };
  }

  const formatKey = previewFormat as 'story' | 'banner' | 'a3';
  const currentFormatOffsets = prev.formatTextOffsetsY?.[formatKey] || { ...baseMasterOffsets };

  return {
    ...prev,
    ...(formatKey === 'a3'
      ? {
        textOffsetsY: {
          ...baseMasterOffsets,
          [field]: rounded,
        },
      }
      : {
        textOffsetsY: baseMasterOffsets,
      }),
    formatTextOffsetsY: {
      ...(prev.formatTextOffsetsY || {}),
      [formatKey]: {
        ...baseMasterOffsets,
        ...currentFormatOffsets,
        [field]: rounded,
      },
    },
  };
}

/**
 * Met à jour simultanément l'ensemble des décalages verticaux (axe Y) des textes pour le format actif :
 * - Si post (Format Maître) : met à jour input.textOffsetsY et synchronise formatTextOffsetsY.a3.
 * - Si dérivé (story, banner, a3) : enregistre les overrides dans input.formatTextOffsetsY[previewFormat].
 */
export function updateAllTextOffsetsYForFormat(
  prev: EventInput,
  previewFormat: string,
  offsets: Partial<TextOffsetsY>
): EventInput {
  const baseMasterOffsets: Required<TextOffsetsY> = {
    headerTagline: prev.textOffsetsY?.headerTagline ?? 0,
    eventName: prev.textOffsetsY?.eventName ?? 0,
    punchline: prev.textOffsetsY?.punchline ?? 0,
    headlineBadge: prev.textOffsetsY?.headlineBadge ?? 0,
    djName: prev.textOffsetsY?.djName ?? 0,
    infoBadge: prev.textOffsetsY?.infoBadge ?? 0,
  };

  const updatedMasterOffsets: Required<TextOffsetsY> = { ...baseMasterOffsets };
  (Object.keys(offsets) as Array<keyof TextOffsetsY>).forEach((field) => {
    const val = offsets[field];
    if (typeof val === 'number') {
      updatedMasterOffsets[field] = Math.round(val * 10) / 10;
    }
  });

  if (!previewFormat || previewFormat === 'post' || previewFormat === 'tshirt') {
    const nextFormatTextOffsetsY = { ...(prev.formatTextOffsetsY || {}) };
    if (nextFormatTextOffsetsY.a3) {
      nextFormatTextOffsetsY.a3 = {
        ...baseMasterOffsets,
        ...nextFormatTextOffsetsY.a3,
        ...updatedMasterOffsets,
      };
    }
    return {
      ...prev,
      textOffsetsY: updatedMasterOffsets,
      formatTextOffsetsY: nextFormatTextOffsetsY,
    };
  }

  const formatKey = previewFormat as 'story' | 'banner' | 'a3';
  const currentFormatOffsets = prev.formatTextOffsetsY?.[formatKey] || { ...baseMasterOffsets };
  const mergedFormatOffsets: Required<TextOffsetsY> = {
    ...baseMasterOffsets,
    ...currentFormatOffsets,
    ...updatedMasterOffsets,
  };

  return {
    ...prev,
    ...(formatKey === 'a3'
      ? {
        textOffsetsY: updatedMasterOffsets,
      }
      : {
        textOffsetsY: baseMasterOffsets,
      }),
    formatTextOffsetsY: {
      ...(prev.formatTextOffsetsY || {}),
      [formatKey]: mergedFormatOffsets,
    },
  };
}

/**
 * Applique un déplacement synchronisé sur l'axe Y à l'ensemble des éléments sélectionnés (textes et logo)
 */
export function updateSynchronizedYOffsets(
  prev: EventInput,
  previewFormat: string,
  newTextOffsets: Partial<TextOffsetsY>,
  newLogoY?: number
): EventInput {
  let updated = updateAllTextOffsetsYForFormat(prev, previewFormat, newTextOffsets);
  if (typeof newLogoY === 'number') {
    updated = updateLogoTransform(updated, previewFormat, { y: Math.round(newLogoY * 10) / 10 });
  }
  return updated;
}

/**
 * Réinitialise les décalages verticaux (axe Y) d'un format dérivé pour rétablir l'héritage depuis le format Maître.
 */
export function resetTextOffsetsYForFormat(
  prev: EventInput,
  previewFormat: string
): EventInput {
  if (!previewFormat || previewFormat === 'post' || previewFormat === 'tshirt') {
    return {
      ...prev,
      textOffsetsY: { ...DEFAULT_TEXT_OFFSETS_Y },
      formatTextOffsetsY: {
        ...(prev.formatTextOffsetsY || {}),
        a3: { ...DEFAULT_TEXT_OFFSETS_Y },
      },
    };
  }

  const formatKey = previewFormat as 'story' | 'banner' | 'a3';
  const masterOffsets: Required<TextOffsetsY> = {
    headerTagline: prev.textOffsetsY?.headerTagline ?? 0,
    eventName: prev.textOffsetsY?.eventName ?? 0,
    punchline: prev.textOffsetsY?.punchline ?? 0,
    headlineBadge: prev.textOffsetsY?.headlineBadge ?? 0,
    djName: prev.textOffsetsY?.djName ?? 0,
    infoBadge: prev.textOffsetsY?.infoBadge ?? 0,
  };
  const updatedFormatOffsets = {
    ...(prev.formatTextOffsetsY || {}),
    [formatKey]: { ...masterOffsets },
  };

  return {
    ...prev,
    textOffsetsY: masterOffsets,
    formatTextOffsetsY: updatedFormatOffsets,
  };
}

export const DEFAULT_TEXT_OFFSETS_X: Required<TextOffsetsX> = {
  headerTagline: 0,
  eventName: 0,
  punchline: 0,
  headlineBadge: 0,
  djName: 0,
  infoBadge: 0,
};

export const DEFAULT_TEXT_ALIGNMENTS: Required<TextAlignments> = {
  headerTagline: 'center',
  eventName: 'center',
  punchline: 'center',
  headlineBadge: 'center',
  djName: 'center',
  infoBadge: 'center',
};

/**
 * Résout les décalages horizontaux (axe X en %) des textes selon le format :
 * - Si post (Format Maître 1:1) ou tshirt : prend input.textOffsetsX (ou 0 par défaut).
 * - Si format dérivé (story, banner, a3) : vérifie si un override existe dans input.formatTextOffsetsX[previewFormat].
 */
export function resolveTextOffsetsXForFormat(
  input: Partial<EventInput>,
  previewFormat?: string
): Required<TextOffsetsX> {
  const masterOffsetsX: Required<TextOffsetsX> = {
    headerTagline: input.textOffsetsX?.headerTagline ?? 0,
    eventName: input.textOffsetsX?.eventName ?? 0,
    punchline: input.textOffsetsX?.punchline ?? 0,
    headlineBadge: input.textOffsetsX?.headlineBadge ?? 0,
    djName: input.textOffsetsX?.djName ?? 0,
    infoBadge: input.textOffsetsX?.infoBadge ?? 0,
  };

  if (!previewFormat || previewFormat === 'post' || previewFormat === 'tshirt') {
    return masterOffsetsX;
  }

  const formatKey = previewFormat as 'story' | 'banner' | 'a3';
  const customOffsets = input.formatTextOffsetsX?.[formatKey];

  return {
    headerTagline: customOffsets?.headerTagline ?? masterOffsetsX.headerTagline,
    eventName: customOffsets?.eventName ?? masterOffsetsX.eventName,
    punchline: customOffsets?.punchline ?? masterOffsetsX.punchline,
    headlineBadge: customOffsets?.headlineBadge ?? masterOffsetsX.headlineBadge,
    djName: customOffsets?.djName ?? masterOffsetsX.djName,
    infoBadge: customOffsets?.infoBadge ?? masterOffsetsX.infoBadge,
  };
}

/**
 * Met à jour un décalage horizontal (axe X en %) d'un élément textuel :
 * - Si post (Format Maître) : met à jour input.textOffsetsX et synchronise formatTextOffsetsX.a3.
 * - Si dérivé (story, banner, a3) : enregistre l'override dans input.formatTextOffsetsX[previewFormat].
 */
export function updateTextOffsetXForFormat(
  prev: EventInput,
  previewFormat: string,
  field: keyof TextOffsetsX,
  value: number
): EventInput {
  const rounded = Math.round(value * 10) / 10;
  const baseMasterOffsetsX: Required<TextOffsetsX> = {
    headerTagline: prev.textOffsetsX?.headerTagline ?? 0,
    eventName: prev.textOffsetsX?.eventName ?? 0,
    punchline: prev.textOffsetsX?.punchline ?? 0,
    headlineBadge: prev.textOffsetsX?.headlineBadge ?? 0,
    djName: prev.textOffsetsX?.djName ?? 0,
    infoBadge: prev.textOffsetsX?.infoBadge ?? 0,
  };

  if (!previewFormat || previewFormat === 'post' || previewFormat === 'tshirt') {
    const updatedMasterOffsetsX: Required<TextOffsetsX> = {
      ...baseMasterOffsetsX,
      [field]: rounded,
    };
    const nextFormatTextOffsetsX = { ...(prev.formatTextOffsetsX || {}) };
    if (nextFormatTextOffsetsX.a3) {
      nextFormatTextOffsetsX.a3 = {
        ...baseMasterOffsetsX,
        ...nextFormatTextOffsetsX.a3,
        [field]: rounded,
      };
    }
    return {
      ...prev,
      textOffsetsX: updatedMasterOffsetsX,
      formatTextOffsetsX: nextFormatTextOffsetsX,
    };
  }

  const formatKey = previewFormat as 'story' | 'banner' | 'a3';
  const currentFormatOffsets = prev.formatTextOffsetsX?.[formatKey] || { ...baseMasterOffsetsX };

  return {
    ...prev,
    ...(formatKey === 'a3'
      ? {
        textOffsetsX: {
          ...baseMasterOffsetsX,
          [field]: rounded,
        },
      }
      : {
        textOffsetsX: baseMasterOffsetsX,
      }),
    formatTextOffsetsX: {
      ...(prev.formatTextOffsetsX || {}),
      [formatKey]: {
        ...baseMasterOffsetsX,
        ...currentFormatOffsets,
        [field]: rounded,
      },
    },
  };
}

/**
 * Réinitialise les décalages horizontaux (axe X) d'un format dérivé pour rétablir l'héritage depuis le format Maître.
 */
export function resetTextOffsetsXForFormat(
  prev: EventInput,
  previewFormat: string
): EventInput {
  if (!previewFormat || previewFormat === 'post' || previewFormat === 'tshirt') {
    return {
      ...prev,
      textOffsetsX: { ...DEFAULT_TEXT_OFFSETS_X },
      formatTextOffsetsX: {
        ...(prev.formatTextOffsetsX || {}),
        a3: { ...DEFAULT_TEXT_OFFSETS_X },
      },
    };
  }

  const formatKey = previewFormat as 'story' | 'banner' | 'a3';
  const masterOffsets: Required<TextOffsetsX> = {
    headerTagline: prev.textOffsetsX?.headerTagline ?? 0,
    eventName: prev.textOffsetsX?.eventName ?? 0,
    punchline: prev.textOffsetsX?.punchline ?? 0,
    headlineBadge: prev.textOffsetsX?.headlineBadge ?? 0,
    djName: prev.textOffsetsX?.djName ?? 0,
    infoBadge: prev.textOffsetsX?.infoBadge ?? 0,
  };
  const updatedFormatOffsets = {
    ...(prev.formatTextOffsetsX || {}),
    [formatKey]: { ...masterOffsets },
  };

  return {
    ...prev,
    textOffsetsX: masterOffsets,
    formatTextOffsetsX: updatedFormatOffsets,
  };
}

/**
 * Résout les alignements horizontaux des textes par élément :
 * - Utilise input.textAlignments si défini pour ce segment, ou retombe sur l'alignement global résolu.
 */
export function resolveTextAlignmentsForFormat(
  input: Partial<EventInput>,
  previewFormat?: string
): Required<TextAlignments> {
  const globalAlign = resolveTextAlignmentForFormat(input, previewFormat);
  const masterAlignments: Required<TextAlignments> = {
    headerTagline: input.textAlignments?.headerTagline ?? globalAlign,
    eventName: input.textAlignments?.eventName ?? globalAlign,
    punchline: input.textAlignments?.punchline ?? globalAlign,
    headlineBadge: input.textAlignments?.headlineBadge ?? globalAlign,
    djName: input.textAlignments?.djName ?? globalAlign,
    infoBadge: input.textAlignments?.infoBadge ?? globalAlign,
  };

  if (!previewFormat || previewFormat === 'post' || previewFormat === 'tshirt') {
    return masterAlignments;
  }

  const formatKey = previewFormat as 'story' | 'banner' | 'a3';
  const customAlignments = input.formatTextAlignments?.[formatKey];

  return {
    headerTagline: customAlignments?.headerTagline ?? masterAlignments.headerTagline,
    eventName: customAlignments?.eventName ?? masterAlignments.eventName,
    punchline: customAlignments?.punchline ?? masterAlignments.punchline,
    headlineBadge: customAlignments?.headlineBadge ?? masterAlignments.headlineBadge,
    djName: customAlignments?.djName ?? masterAlignments.djName,
    infoBadge: customAlignments?.infoBadge ?? masterAlignments.infoBadge,
  };
}

/**
 * Met à jour l'alignement horizontal d'un segment de texte spécifique.
 */
export function updateTextAlignmentForField(
  prev: EventInput,
  previewFormat: string,
  field: keyof TextAlignments,
  alignment: 'left' | 'center' | 'right'
): EventInput {
  const globalAlign = resolveTextAlignmentForFormat(prev, previewFormat);
  const baseMasterAlignments: Required<TextAlignments> = {
    headerTagline: prev.textAlignments?.headerTagline ?? globalAlign,
    eventName: prev.textAlignments?.eventName ?? globalAlign,
    punchline: prev.textAlignments?.punchline ?? globalAlign,
    headlineBadge: prev.textAlignments?.headlineBadge ?? globalAlign,
    djName: prev.textAlignments?.djName ?? globalAlign,
    infoBadge: prev.textAlignments?.infoBadge ?? globalAlign,
  };

  if (!previewFormat || previewFormat === 'post' || previewFormat === 'tshirt') {
    const updatedMasterAlignments: Required<TextAlignments> = {
      ...baseMasterAlignments,
      [field]: alignment,
    };
    const nextFormatTextAlignments = { ...(prev.formatTextAlignments || {}) };
    if (nextFormatTextAlignments.a3) {
      nextFormatTextAlignments.a3 = {
        ...baseMasterAlignments,
        ...nextFormatTextAlignments.a3,
        [field]: alignment,
      };
    }
    return {
      ...prev,
      textAlignments: updatedMasterAlignments,
      formatTextAlignments: nextFormatTextAlignments,
    };
  }

  const formatKey = previewFormat as 'story' | 'banner' | 'a3';
  const currentFormatAlignments = prev.formatTextAlignments?.[formatKey] || { ...baseMasterAlignments };

  return {
    ...prev,
    formatTextAlignments: {
      ...(prev.formatTextAlignments || {}),
      [formatKey]: {
        ...baseMasterAlignments,
        ...currentFormatAlignments,
        [field]: alignment,
      },
    },
  };
}

/**
 * Résout l'espacement interligne global selon le format (défaut 0.8 cqi).
 */
export function resolveTextLineSpacingForFormat(
  input: Partial<EventInput>,
  previewFormat?: string
): number {
  if (!previewFormat || previewFormat === 'post' || previewFormat === 'tshirt') {
    return input.textLineSpacing ?? 0.8;
  }
  const formatKey = previewFormat as 'story' | 'banner' | 'a3';
  return input.formatTextLineSpacing?.[formatKey] ?? input.textLineSpacing ?? 0.8;
}

/**
 * Met à jour l'espacement interligne global pour le format actif.
 */
export function updateTextLineSpacingForFormat(
  prev: EventInput,
  previewFormat: string,
  spacing: number
): EventInput {
  const rounded = Math.round(spacing * 10) / 10;
  if (!previewFormat || previewFormat === 'post' || previewFormat === 'tshirt') {
    const nextFormatLineSpacing = { ...(prev.formatTextLineSpacing || {}) };
    if (nextFormatLineSpacing.a3 !== undefined) {
      nextFormatLineSpacing.a3 = rounded;
    }
    return {
      ...prev,
      textLineSpacing: rounded,
      formatTextLineSpacing: nextFormatLineSpacing,
    };
  }

  const formatKey = previewFormat as 'story' | 'banner' | 'a3';
  return {
    ...prev,
    formatTextLineSpacing: {
      ...(prev.formatTextLineSpacing || {}),
      [formatKey]: rounded,
    },
  };
}

/**
 * Résout l'alignement horizontal global selon le format (défaut 'center').
 */
export function resolveTextAlignmentForFormat(
  input: Partial<EventInput>,
  previewFormat?: string
): 'left' | 'center' | 'right' {
  if (!previewFormat || previewFormat === 'post' || previewFormat === 'tshirt') {
    return input.textAlignment ?? 'center';
  }
  const formatKey = previewFormat as 'story' | 'banner' | 'a3';
  return input.formatTextAlignment?.[formatKey] ?? input.textAlignment ?? 'center';
}

/**
 * Met à jour l'alignement horizontal global pour le format actif.
 */
export function updateTextAlignmentForFormat(
  prev: EventInput,
  previewFormat: string,
  alignment: 'left' | 'center' | 'right'
): EventInput {
  const allAligned: Required<TextAlignments> = {
    headerTagline: alignment,
    eventName: alignment,
    punchline: alignment,
    headlineBadge: alignment,
    djName: alignment,
    infoBadge: alignment,
  };

  if (!previewFormat || previewFormat === 'post' || previewFormat === 'tshirt') {
    const nextFormatAlignment = { ...(prev.formatTextAlignment || {}) };
    if (nextFormatAlignment.a3 !== undefined) {
      nextFormatAlignment.a3 = alignment;
    }
    const nextFormatTextAlignments = { ...(prev.formatTextAlignments || {}) };
    if (nextFormatTextAlignments.a3) {
      nextFormatTextAlignments.a3 = allAligned;
    }
    return {
      ...prev,
      textAlignment: alignment,
      formatTextAlignment: nextFormatAlignment,
      textAlignments: allAligned,
      formatTextAlignments: nextFormatTextAlignments,
    };
  }

  const formatKey = previewFormat as 'story' | 'banner' | 'a3';
  return {
    ...prev,
    formatTextAlignment: {
      ...(prev.formatTextAlignment || {}),
      [formatKey]: alignment,
    },
    formatTextAlignments: {
      ...(prev.formatTextAlignments || {}),
      [formatKey]: allAligned,
    },
  };
}

/**
 * Aligne et centre horizontalement instantanément l'ensemble des calques :
 * - Textes : alignement horizontal 'center'
 * - Logo : recentré sur l'axe X (50%)
 * - Sujet : recentré sur l'axe X (50% / 'center')
 */
export function centerAllLayersForFormat(
  prev: EventInput,
  previewFormat: string
): EventInput {
  let updated = updateTextAlignmentForFormat(prev, previewFormat, 'center');
  updated = resetTextOffsetsXForFormat(updated, previewFormat);
  const nextFormatTextAlignments = { ...(updated.formatTextAlignments || {}) };
  if (previewFormat && previewFormat !== 'post' && previewFormat !== 'tshirt') {
    delete (nextFormatTextAlignments as Record<string, unknown>)[previewFormat];
  }
  updated = {
    ...updated,
    textAlignments: { ...DEFAULT_TEXT_ALIGNMENTS },
    formatTextAlignments: nextFormatTextAlignments,
  };
  updated = updateLogoTransform(updated, previewFormat, { x: 50 });
  const formatKey = (previewFormat || 'post') as 'post' | 'a3' | 'story' | 'banner' | 'tshirt';
  const existingTransforms = updated.formatTransforms?.[formatKey] || {
    scale: 1.0,
    offsetY: 0,
    offsetX: 0,
    alignX: 'center',
  };
  return {
    ...updated,
    subjectPositionX: 0,
    djPhotoOffsetX: 0,
    logoPositionX: 50,
    formatTransforms: {
      ...(updated.formatTransforms || {}),
      [formatKey]: {
        ...existingTransforms,
        offsetX: 0,
        alignX: 'center',
        isCustom: true,
      },
    },
  };
}

/**
 * Réinitialise globalement les positions des textes :
 * - Tous les décalages d'axe Y sont remis à 0
 * - Tous les décalages d'axe X sont remis à 0
 * - L'espacement interligne est remis à sa valeur standard (0.8 cqi)
 */
export function resetAllTextPositionsForFormat(
  prev: EventInput,
  previewFormat: string
): EventInput {
  let updated = resetTextOffsetsYForFormat(prev, previewFormat);
  updated = resetTextOffsetsXForFormat(updated, previewFormat);
  updated = updateTextLineSpacingForFormat(updated, previewFormat, 0.8);
  return updated;
}

export const DEFAULT_TEXT_COLORS: Required<TextColors> = {
  headerTagline: '#FFFFFF',
  eventName: '#FFFFFF',
  punchline: '#FFFFFF',
  headlineBadge: '#FFFFFF',
  djName: '#FFFFFF',
  infoBadge: '#FFFFFF',
};

/**
 * Résout la couleur de chaque élément textuel selon le format :
 * - Si post (Format Maître 1:1) ou tshirt : prend input.textColors (ou '#FFFFFF' / '#000000' selon la tonalité).
 * - Si format dérivé (story, banner, a3) : vérifie si un override existe dans input.formatTextColors[previewFormat].
 */
export function resolveTextColorsForFormat(
  input: Partial<EventInput>,
  previewFormat?: string
): Required<TextColors> {
  const isLight =
    input.isBackgroundToneEnabled !== false &&
    typeof input.backgroundTone === 'number' &&
    input.backgroundTone < 0.48;
  const defaultFallback = isLight ? '#000000' : '#FFFFFF';

  // Synchronisation prioritaire depuis posterTexts si disponible
  const titleItemFromList = Array.isArray(input.posterTexts)
    ? input.posterTexts.find((i: PosterTextItem) => i.type === 'titre' && i.isVisible !== false)
    : undefined;
  const surtitreItemFromList = Array.isArray(input.posterTexts)
    ? input.posterTexts.find((i: PosterTextItem) => i.type === 'surtitre' && i.isVisible !== false)
    : undefined;
  const soustitreItemFromList = Array.isArray(input.posterTexts)
    ? input.posterTexts.find((i: PosterTextItem) => i.type === 'soustitre' && i.isVisible !== false)
    : undefined;

  const masterColors: Required<TextColors> = {
    headerTagline: surtitreItemFromList?.color ?? input.textColors?.headerTagline ?? defaultFallback,
    eventName: titleItemFromList?.color ?? input.textColors?.eventName ?? defaultFallback,
    punchline: soustitreItemFromList?.color ?? input.textColors?.punchline ?? defaultFallback,
    headlineBadge: input.textColors?.headlineBadge ?? defaultFallback,
    djName: input.textColors?.djName ?? defaultFallback,
    infoBadge: input.textColors?.infoBadge ?? defaultFallback,
  };

  if (!previewFormat || previewFormat === 'post' || previewFormat === 'tshirt') {
    return masterColors;
  }

  const formatKey = previewFormat as 'story' | 'banner' | 'a3';
  const customColors = input.formatTextColors?.[formatKey];

  return {
    headerTagline: customColors?.headerTagline ?? masterColors.headerTagline,
    eventName: customColors?.eventName ?? masterColors.eventName,
    punchline: customColors?.punchline ?? masterColors.punchline,
    headlineBadge: customColors?.headlineBadge ?? masterColors.headlineBadge,
    djName: customColors?.djName ?? masterColors.djName,
    infoBadge: customColors?.infoBadge ?? masterColors.infoBadge,
  };
}

/**
 * Met à jour la couleur d'un segment de texte spécifique pour le format actif.
 */
export function updateTextColorForFormat(
  prev: EventInput,
  previewFormat: string,
  field: keyof TextColors,
  color: string
): EventInput {
  const baseMasterColors = resolveTextColorsForFormat(prev, 'post');

  const updatedPosterTexts = Array.isArray(prev.posterTexts)
    ? prev.posterTexts.map((item) => {
        if (field === 'eventName' && item.type === 'titre') return { ...item, color };
        if (field === 'headerTagline' && item.type === 'surtitre') return { ...item, color };
        if (field === 'punchline' && item.type === 'soustitre') return { ...item, color };
        if (field === 'headlineBadge' && item.id === 'text-badge') return { ...item, color };
        if (field === 'djName' && item.id === 'text-dj') return { ...item, color };
        return item;
      })
    : prev.posterTexts;

  if (!previewFormat || previewFormat === 'post' || previewFormat === 'tshirt') {
    const updatedMasterColors: Required<TextColors> = {
      ...baseMasterColors,
      [field]: color,
    };
    const nextFormatTextColors = { ...(prev.formatTextColors || {}) };
    if (nextFormatTextColors.a3) {
      nextFormatTextColors.a3 = {
        ...baseMasterColors,
        ...nextFormatTextColors.a3,
        [field]: color,
      };
    }
    return {
      ...prev,
      posterTexts: updatedPosterTexts,
      textColors: updatedMasterColors,
      formatTextColors: nextFormatTextColors,
    };
  }

  const formatKey = previewFormat as 'story' | 'banner' | 'a3';
  const currentFormatColors = prev.formatTextColors?.[formatKey] || { ...baseMasterColors };

  return {
    ...prev,
    posterTexts: updatedPosterTexts,
    ...(formatKey === 'a3'
      ? {
        textColors: {
          ...baseMasterColors,
          [field]: color,
        },
      }
      : {
        textColors: baseMasterColors,
      }),
    formatTextColors: {
      ...(prev.formatTextColors || {}),
      [formatKey]: {
        ...baseMasterColors,
        ...currentFormatColors,
        [field]: color,
      },
    },
  };
}

/**
 * Bascule globalement ou applique une couleur à l'ensemble des segments textuels de l'affiche (Noir ⇄ Blanc).
 */
export function toggleAllTextColorsForFormat(
  prev: EventInput,
  previewFormat: string,
  targetColor?: '#FFFFFF' | '#000000'
): EventInput {
  const current = resolveTextColorsForFormat(prev, previewFormat);
  const whiteCount = Object.values(current).filter((c) => (c || '').toUpperCase() === '#FFFFFF').length;
  const newColor = targetColor ?? (whiteCount >= 3 ? '#000000' : '#FFFFFF');

  const newColors: Required<TextColors> = {
    headerTagline: newColor,
    eventName: newColor,
    punchline: newColor,
    headlineBadge: newColor,
    djName: newColor,
    infoBadge: newColor,
  };

  const updatedPosterTexts = Array.isArray(prev.posterTexts)
    ? prev.posterTexts.map((item) => {
        if (item.type === 'titre') return { ...item, color: newColors.eventName };
        if (item.type === 'surtitre') return { ...item, color: newColors.headerTagline };
        if (item.type === 'soustitre') return { ...item, color: newColors.punchline };
        return { ...item, color: newColor };
      })
    : prev.posterTexts;

  if (!previewFormat || previewFormat === 'post' || previewFormat === 'tshirt') {
    return {
      ...prev,
      posterTexts: updatedPosterTexts,
      textColors: newColors,
      formatTextColors: {
        ...(prev.formatTextColors || {}),
        a3: newColors,
      },
    };
  }

  const formatKey = previewFormat as 'story' | 'banner' | 'a3';
  return {
    ...prev,
    posterTexts: updatedPosterTexts,
    formatTextColors: {
      ...(prev.formatTextColors || {}),
      [formatKey]: newColors,
    },
  };
}

/**
 * Réinitialise les couleurs des textes du format pour rétablir les valeurs par défaut.
 */
export function resetTextColorsForFormat(
  prev: EventInput,
  previewFormat: string
): EventInput {
  const isLight =
    prev.isBackgroundToneEnabled !== false &&
    typeof prev.backgroundTone === 'number' &&
    prev.backgroundTone < 0.48;
  const defaultFallback = isLight ? '#000000' : '#FFFFFF';
  const defaultColors: Required<TextColors> = {
    headerTagline: defaultFallback,
    eventName: defaultFallback,
    punchline: defaultFallback,
    headlineBadge: defaultFallback,
    djName: defaultFallback,
    infoBadge: defaultFallback,
  };

  const updatedPosterTexts = Array.isArray(prev.posterTexts)
    ? prev.posterTexts.map((item) => {
        if (item.type === 'titre') return { ...item, color: defaultColors.eventName };
        if (item.type === 'surtitre') return { ...item, color: defaultColors.headerTagline };
        if (item.type === 'soustitre') return { ...item, color: defaultColors.punchline };
        return { ...item, color: defaultFallback };
      })
    : prev.posterTexts;

  if (!previewFormat || previewFormat === 'post' || previewFormat === 'tshirt') {
    return {
      ...prev,
      posterTexts: updatedPosterTexts,
      textColors: { ...defaultColors },
      formatTextColors: {
        ...(prev.formatTextColors || {}),
        a3: { ...defaultColors },
      },
    };
  }

  const formatKey = previewFormat as 'story' | 'banner' | 'a3';
  return {
    ...prev,
    posterTexts: updatedPosterTexts,
    formatTextColors: {
      ...(prev.formatTextColors || {}),
      [formatKey]: { ...defaultColors },
    },
  };
}

/**
 * Rétrocompatibilité & Normalisation Modulaire :
 * Si posterTexts est déjà présent (tableau défini, même vide), le renvoie tel quel
 * sans jamais ressusciter les blocs supprimés par l'utilisateur.
 * Sinon, initialise une seule fois depuis l'ancien schéma Firestore/local
 * (title, eventName, subtitle, punchline, headerTagline, surtitre, etc.).
 */
export function ensurePosterTexts(input: Partial<EventInput> & Record<string, any>): PosterTextItem[] {
  if (Array.isArray(input.posterTexts)) {
    return input.posterTexts;
  }

  const items: PosterTextItem[] = [];

  // 1. Surtitre
  const rawSurtitre = input.headerTagline ?? input.surtitre ?? '';
  const surtitreText = typeof rawSurtitre === 'string' ? rawSurtitre.trim() : '';
  items.push({
    id: 'text-surtitre',
    type: 'surtitre',
    label: 'Surtitre',
    text: surtitreText || 'SURTITRE',
    maxLength: 25,
    x: input.textOffsetsX?.headerTagline ?? 0,
    y: input.textOffsetsY?.headerTagline ?? 0,
    align: input.textAlignments?.headerTagline ?? input.textAlignment ?? 'center',
    color: input.textColors?.headerTagline ?? '#FFFFFF',
    accentColor: input.accentColor || '#E11D48',
    layerPosition: 'front_subject',
    fontSizeScale: input.textScales?.headerTagline ?? 1.0,
    isVisible: true,
    letterSpacing: 3,
    fontWeight: 'bold',
    hasBackgroundPill: false,
  });

  // 2. Titre Principal
  const rawTitre = input.eventName ?? input.title ?? '';
  const titreText = typeof rawTitre === 'string' ? rawTitre.trim() : '';
  items.push({
    id: 'text-titre',
    type: 'titre',
    label: 'Titre Principal',
    text: titreText || 'TITRE ÉVÉNEMENT',
    maxLength: 25,
    x: input.textOffsetsX?.eventName ?? 0,
    y: input.textOffsetsY?.eventName ?? 0,
    align: input.textAlignments?.eventName ?? input.textAlignment ?? 'center',
    color: input.textColors?.eventName ?? '#FFFFFF',
    accentColor: input.accentColor || '#E11D48',
    layerPosition: input.titleLayerOrder === 'front-subject' ? 'front_subject' : 'behind_subject',
    fontSizeScale: input.textScales?.eventName ?? 1.0,
    isVisible: true,
    letterSpacing: 2,
    fontWeight: 'bold',
    hasBackgroundPill: false,
  });

  // 3. Sous-titre
  const rawSousTitre = input.punchline ?? input.subtitle ?? input.soustitre ?? '';
  const sousTitreText = typeof rawSousTitre === 'string' ? rawSousTitre.trim() : '';
  items.push({
    id: 'text-soustitre',
    type: 'soustitre',
    label: 'Sous-titre',
    text: sousTitreText || 'Sous-titre ou thématique de l\'événement',
    maxLength: 25,
    x: input.textOffsetsX?.punchline ?? 0,
    y: input.textOffsetsY?.punchline ?? 0,
    align: input.textAlignments?.punchline ?? input.textAlignment ?? 'center',
    color: input.textColors?.punchline ?? '#FFFFFF',
    accentColor: input.accentColor || '#E11D48',
    layerPosition: 'front_subject',
    fontSizeScale: input.textScales?.punchline ?? 1.0,
    isVisible: true,
    letterSpacing: 1,
    fontWeight: 'semibold',
    hasBackgroundPill: false,
  });

  // 4. Tagline / Info libre additionnelle si définie
  const rawBadge = input.headlineBadgeText ?? '';
  const badgeText = typeof rawBadge === 'string' ? rawBadge.trim() : '';
  if (badgeText) {
    items.push({
      id: 'text-badge',
      type: 'info',
      label: 'Tagline / Badge',
      text: badgeText,
      maxLength: 25,
      x: input.textOffsetsX?.headlineBadge ?? 0,
      y: input.textOffsetsY?.headlineBadge ?? 18,
      align: input.textAlignments?.headlineBadge ?? 'center',
      color: input.textColors?.headlineBadge ?? '#FFFFFF',
      accentColor: input.accentColor || '#E11D48',
      layerPosition: 'front_subject',
      fontSizeScale: input.textScales?.headlineBadge ?? 1.0,
      isVisible: true,
      letterSpacing: 1,
      fontWeight: 'semibold',
      hasBackgroundPill: false,
    });
  }

  // 5. Artiste / Intervenant additionnel si défini
  const rawDj = input.djName ?? '';
  const djText = typeof rawDj === 'string' ? rawDj.trim() : '';
  if (djText) {
    items.push({
      id: 'text-dj',
      type: 'info',
      label: 'Artiste / Intervenant',
      text: djText,
      maxLength: 25,
      x: input.textOffsetsX?.djName ?? 0,
      y: input.textOffsetsY?.djName ?? 26,
      align: input.textAlignments?.djName ?? 'center',
      color: input.textColors?.djName ?? '#FFFFFF',
      accentColor: input.accentColor || '#E11D48',
      layerPosition: 'front_subject',
      fontSizeScale: input.textScales?.djName ?? 1.0,
      isVisible: true,
      letterSpacing: 1,
      fontWeight: 'semibold',
      hasBackgroundPill: false,
    });
  }

  return items;
}

/**
 * Crée un nouvel élément PosterTextItem prêt à être injecté
 */
export function createNewPosterTextItem(
  type: 'surtitre' | 'titre' | 'soustitre' | 'info' | 'custom'
): PosterTextItem {
  const uniqueId = `text-${type}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  switch (type) {
    case 'surtitre':
      return {
        id: uniqueId,
        type: 'surtitre',
        label: 'Surtitre',
        text: 'NOUVEAU SURTITRE',
        maxLength: 25,
        x: 0,
        y: -18,
        align: 'center',
        color: '#FFFFFF',
        accentColor: '#E11D48',
        layerPosition: 'front_subject',
        fontSizeScale: 1.0,
        isVisible: true,
        letterSpacing: 3,
        fontWeight: 'bold',
        hasBackgroundPill: false,
      };
    case 'titre':
      return {
        id: uniqueId,
        type: 'titre',
        label: 'Titre Principal',
        text: 'NOUVEAU TITRE',
        maxLength: 25,
        x: 0,
        y: -2,
        align: 'center',
        color: '#FFFFFF',
        accentColor: '#E11D48',
        layerPosition: 'behind_subject',
        fontSizeScale: 1.0,
        isVisible: true,
        letterSpacing: 2,
        fontWeight: 'bold',
        hasBackgroundPill: false,
      };
    case 'soustitre':
      return {
        id: uniqueId,
        type: 'soustitre',
        label: 'Sous-titre',
        text: 'Nouveau sous-titre',
        maxLength: 25,
        x: 0,
        y: 12,
        align: 'center',
        color: '#FFFFFF',
        accentColor: '#E11D48',
        layerPosition: 'front_subject',
        fontSizeScale: 1.0,
        isVisible: true,
        letterSpacing: 1,
        fontWeight: 'semibold',
        hasBackgroundPill: false,
      };
    case 'info':
    case 'custom':
    default:
      return {
        id: uniqueId,
        type: type,
        label: type === 'info' ? 'Info / Badge' : 'Texte libre',
        text: 'Information libre',
        maxLength: 60,
        x: 0,
        y: 20,
        align: 'center',
        color: '#FFFFFF',
        accentColor: '#E11D48',
        layerPosition: 'front_subject',
        fontSizeScale: 1.0,
        isVisible: true,
        letterSpacing: 1,
        fontWeight: 'semibold',
        hasBackgroundPill: false,
      };
  }
}

export interface VisualAsset {
  formatName: string;
  aspectRatio: string;
  ratioClass: string;
  widthMm: number;
  heightMm: number;
  description: string;
  svgContent: string;
}

export interface PrintCutFile {
  svgCutFile: string;
  dimensionsMm: { width: number; height: number };
  pressTemperatureC: number;
  pressDurationSeconds: number;
  peelType: 'Chaud (Hot Peel)' | 'Froid (Cold Peel)';
  textileRecommendation: string;
  colorLayers: string[];
}

export interface SocialCopywriting {
  captionInstagram: string;
  punchlines: string[];
  hashtags: string[];
  storyPollIdeas: string[];
  coldPitchDM: string;
}

export interface GeneratedPack {
  id: string;
  createdAt: string;
  input: EventInput;
  creativeConcept: {
    artDirection: string;
    atmosphere: string;
    typographyPairing: string;
    colorHexes: string[];
  };
  artworkSvg: string;
  posterVisual: VisualAsset;
  storyVisual: VisualAsset;
  squareVisual: VisualAsset;
  bannerVisual: VisualAsset;
  tshirtChestVisual: VisualAsset;
  tshirtBackVisual: VisualAsset;
  printCutFile: PrintCutFile;
  copywriting: SocialCopywriting;
  downloadToken: string;
  generationCostEur?: number;
  isUnlocked?: boolean;
}

export type PackageType =
  | 'digital_starter'
  | 'digital_pack'
  | 'physical_merch_pack'
  | 'box_merch_50';

export interface OrderRecord {
  id: string;
  createdAt: string;
  packId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  packageType: PackageType;
  tshirtSize?: 'S' | 'M' | 'L' | 'XL' | 'XXL';
  tshirtQty?: number;
  tshirtColor?: TshirtColor;
  shippingAddress?: string;
  hasLogoRedesign?: boolean;
  logoRedesignPriceEur?: number;
  trackingNumber?: string;
  trackingUrl?: string;
  estimatedDeliveryDate?: string;
  totalEur: number;
  status: 'sent_by_email' | 'to_press' | 'pressed' | 'dispatched' | 'in_production' | 'awaiting_logo_redesign';
  downloadToken: string;
  emailSentAt?: string;
  packSnapshot: GeneratedPack;
}

export interface ProspectLead {
  id: string;
  igHandle: string;
  displayName: string;
  category: 'DJ Résident' | 'Bar / Club Musical' | 'Collectif / Sound-System';
  followers: number;
  city: string;
  genre: MusicGenre;
  bio: string;
  lastEventDetected: string;
  status: 'scraped' | 'mockup_ready' | 'pitch_sent';
  tailoredPitch?: string;
}

/**
 * Nettoie et purge les caractères parasites comme les crochets ([...])
 * et les guillemets ("...", «...», “...”) tout en préservant scrupuleusement
 * les espaces (y compris les espaces en cours de saisie et les espaces multiples).
 */
export function sanitizeStudioText(val?: string | null): string {
  if (val === null || val === undefined) return '';
  let cleaned = String(val);
  // Retirer les crochets englobants ou isolés : [ TEXTE ] -> TEXTE
  cleaned = cleaned.replace(/^\[\s*(.*?)\s*\]$/g, '$1');
  // Retirer les guillemets englobants : "TEXTE", «TEXTE», “TEXTE” -> TEXTE
  cleaned = cleaned.replace(/^["“”«»]\s*(.*?)\s*["“”«»]$/g, '$1');
  // Supprimer tout crochet résiduel au début ou à la fin
  cleaned = cleaned.replace(/^\[+|\]+$/g, '');
  // Supprimer tout guillemet résiduel au début ou à la fin
  cleaned = cleaned.replace(/^["“”«»]+|["“”«»]+$/g, '');
  return cleaned;
}

// Données par défaut officielles extraites pour le studio
export const DEFAULT_STUDIO_DATA = {
  bgImage: '/demo/signaid-backgroundImage.webp',
  backgroundImage: '/demo/signaid-backgroundImage.webp',
  customBackground: '',
  bgPrompt: 'Technologie ville',
  ambiancePrompt: 'Technologie ville, futuristic dark aesthetics, sharp cybernetic glow, deep black contrast with neon lime highlights, accent color #F2F2F2',
  backgroundTone: 0.5, // 0.5 = Neutre au centre
  isBackgroundToneEnabled: true,
  backgroundOpacity: 1.0,
  backgroundBrightness: 1.0,
  backgroundOffsetX: 0,
  backgroundOffsetY: 0,

  djPhoto: '/demo/artist-demo.webp',
  subjectScale: 1.0,
  djPhotoScale: 1.23,
  subjectPositionX: 0,
  subjectPositionY: 15,
  djPhotoOffsetY: 15,
  isSubjectHarmonized: false,
  subjectBrightness: 1.0,
  subjectContrast: 1.0,
  subjectSaturation: 1.0,
  subjectHueRotate: 0,
  subjectShadowOffsetX: 0,
  subjectShadowOffsetY: 20,
  subjectShadowBlur: 30,
  subjectShadowColor: 'rgba(0,0,0,0.65)',
  subjectShadowOpacity: 0.65,
  subjectBlendMode: 'normal',
  subjectLightingSummary: '',

  logoUrl: undefined,
  logoImage: undefined,
  logoPositionX: 85.2,
  logoPositionY: 11.9,
  logoScale: 0.8,
  logoOpacity: 1,
  logoRotation: 0,
  logoOffsetY: 11.9,
  logoPosition: 'top-right' as const,
  logoColorMode: 'original' as const,

  headerTagline: 'DÉPLOIE TON',
  eventName: 'PORTAIL INTERACTIF - SIGNAID',
  punchline: 'EN MOINS DE 5 MINUTES',
  headlineBadgeText: 'AGENDA ET MERCH INTÉGRÉS',
  djName: 'SIGNAID',

  platformBadge: 'SIGNAID.EU // WEB APP OFFICIELLE',
  artistUrl: 'https://wa.me/32479359439?text=Hello%20Signaid%2C%20je%20souhaite%20r%C3%A9server%20une%20d%C3%A9mo',
  artistSocialUrl: 'https://wa.me/32479359439?text=Hello%20Signaid%2C%20je%20souhaite%20r%C3%A9server%20une%20d%C3%A9mo',
  instagramHandle: 'signaid',
  venueMapsUrl: '',

  date: '',
  time: '',
  timeSlot: '',
  venue: '',
  location: '',

  flyerImageUrl: '/assets/FLYER_A3_SIGNAID (1).jpg',
  previewImages: {
    a3: '/assets/FLYER_A3_SIGNAID (1).jpg',
  },
  layoutTemplate: 'duality_campaign' as LayoutTemplateId,
  dualityCampaignSlots: {
    topTextLeft: 'DESCENDRE DANS LA RUE.',
    topTextRight: 'SE FAIRE ENTENDRE AUTREMENT.',
    bottomTitle: 'CHOISISSEZ',
    bottomAccent: 'VOTRE VOIE.',
  },
  headlinerEventSlots: {
    artistName: 'SIGNAID',
    subRole: 'PORTAIL INTERACTIF',
    datePlace: 'AGENDA & MERCH // SIGNAID.EU',
    ticketCta: 'DEMO DISPONIBLE',
  },
  minimalBrandSlots: {
    brandName: 'SIGNAID',
    tagline: 'L\'IMPACT VISUEL SANS CONCESSION',
    releaseDate: 'COLLECTION 2026',
  },
  textLineSpacing: 0.8,
  textAlignment: 'center' as const,
  textColors: { ...DEFAULT_TEXT_COLORS },
};

export const INITIAL_DEMO_STATE: EventInput = {
  id: 'proj_1791966923967',
  projectId: 'proj_1791966923967',
  flyerImageUrl: DEFAULT_STUDIO_DATA.flyerImageUrl,
  previewImages: DEFAULT_STUDIO_DATA.previewImages,

  bgImage: DEFAULT_STUDIO_DATA.bgImage,
  backgroundImage: DEFAULT_STUDIO_DATA.backgroundImage,
  customBackground: '',
  bgPrompt: DEFAULT_STUDIO_DATA.bgPrompt,
  ambiancePrompt: DEFAULT_STUDIO_DATA.ambiancePrompt,
  ambianceEngine: 'Gemini AI Image',
  backgroundTone: DEFAULT_STUDIO_DATA.backgroundTone,
  isBackgroundToneEnabled: DEFAULT_STUDIO_DATA.isBackgroundToneEnabled,
  backgroundOpacity: DEFAULT_STUDIO_DATA.backgroundOpacity,
  backgroundBrightness: DEFAULT_STUDIO_DATA.backgroundBrightness,

  djPhoto: DEFAULT_STUDIO_DATA.djPhoto,
  subjectScale: DEFAULT_STUDIO_DATA.subjectScale,
  djPhotoScale: DEFAULT_STUDIO_DATA.djPhotoScale,
  subjectPositionX: DEFAULT_STUDIO_DATA.subjectPositionX,
  subjectPositionY: 15,
  djPhotoOffsetY: 15,
  isSubjectBackgroundRemoved: true,
  isSubjectGradientFade: true,
  isSubjectHarmonized: DEFAULT_STUDIO_DATA.isSubjectHarmonized,
  subjectFadeIntensity: 15,
  subjectBrightness: DEFAULT_STUDIO_DATA.subjectBrightness,
  subjectContrast: DEFAULT_STUDIO_DATA.subjectContrast,
  subjectSaturation: DEFAULT_STUDIO_DATA.subjectSaturation,
  subjectHueRotate: DEFAULT_STUDIO_DATA.subjectHueRotate,
  subjectShadowOffsetX: DEFAULT_STUDIO_DATA.subjectShadowOffsetX,
  subjectShadowOffsetY: DEFAULT_STUDIO_DATA.subjectShadowOffsetY,
  subjectShadowBlur: DEFAULT_STUDIO_DATA.subjectShadowBlur,
  subjectShadowColor: DEFAULT_STUDIO_DATA.subjectShadowColor,
  subjectShadowOpacity: DEFAULT_STUDIO_DATA.subjectShadowOpacity,
  subjectBlendMode: DEFAULT_STUDIO_DATA.subjectBlendMode,
  subjectLightingSummary: DEFAULT_STUDIO_DATA.subjectLightingSummary,

  logoUrl: undefined,
  logoImage: undefined,
  logoPositionX: DEFAULT_STUDIO_DATA.logoPositionX,
  logoPositionY: DEFAULT_STUDIO_DATA.logoPositionY,
  logoScale: DEFAULT_STUDIO_DATA.logoScale,
  logoOpacity: DEFAULT_STUDIO_DATA.logoOpacity,
  logoRotation: DEFAULT_STUDIO_DATA.logoRotation,
  logoOffsetY: 11.9,
  logoPosition: 'top-right',
  logoColorMode: 'original',

  headerTagline: DEFAULT_STUDIO_DATA.headerTagline,
  eventName: DEFAULT_STUDIO_DATA.eventName,
  punchline: DEFAULT_STUDIO_DATA.punchline,
  headlineBadgeText: DEFAULT_STUDIO_DATA.headlineBadgeText,
  djName: DEFAULT_STUDIO_DATA.djName,

  platformBadge: DEFAULT_STUDIO_DATA.platformBadge,
  artistUrl: DEFAULT_STUDIO_DATA.artistUrl,
  artistSocialUrl: DEFAULT_STUDIO_DATA.artistUrl,
  instagramHandle: 'signaid',
  venueMapsUrl: DEFAULT_STUDIO_DATA.venueMapsUrl,

  date: DEFAULT_STUDIO_DATA.date,
  time: DEFAULT_STUDIO_DATA.time,
  timeSlot: DEFAULT_STUDIO_DATA.timeSlot,
  venue: DEFAULT_STUDIO_DATA.venue,
  location: DEFAULT_STUDIO_DATA.location,

  typographyStyle: 'futur',
  accentColor: '#FF6B00',
  tshirtLogoScale: 1.0,
  tshirtLogoOffsetY: 0,
  tshirtLogoColorMode: 'original',
  tshirtBackLogoScale: 1.0,
  tshirtBackLogoOffsetY: 0,
  tshirtCustomLogo: undefined,
  tshirtBackCustomLogo: undefined,
  tshirtBackLogoDisabled: false,
  tshirtSide: 'front',
  tshirtFrontPlacement: { x: 68, y: 34, scale: 1 },
  tshirtBackPlacement: { x: 50, y: 38, scale: 1 },
  dynamicTheme: {
    primaryAccent: '#FF6B00',
    secondaryAccent: '#00f0ff',
    glowColor: '#FF6B00',
  },
  formatTransforms: {
    post: { scale: 1.23, offsetY: 15, alignX: 'center', isCustom: true },
    a3: { scale: 1.0, offsetY: 0, alignX: 'center', isCustom: false },
    story: { scale: 1.23, offsetY: -19, alignX: 'center', isCustom: true },
    banner: { scale: 1.28, offsetY: 29, alignX: 'center', isCustom: true },
    tshirt: { scale: 1.0, offsetY: 15, alignX: 'center', isCustom: false },
  },
  logoFormatTransforms: {
    story: { x: 51.2, y: 63.3, scale: 2.5, isCustom: true },
    a3: { x: 64.9, y: 62.5, scale: 0.65, isCustom: true },
    banner: { x: 92.4, y: 9.4, scale: 0.85, isCustom: true },
  },
  textScales: { ...DEFAULT_TEXT_SCALES },
  formatTextScales: {},
  cartoucheScale: 1.0,
  cartouchePadding: 1.0,
  textOffsetsY: { ...DEFAULT_TEXT_OFFSETS_Y },
  formatTextOffsetsY: {},
  textLineSpacing: 0.8,
  formatTextLineSpacing: {},
  textAlignment: 'center',
  formatTextAlignment: {},
  posterTexts: [
    {
      id: 'text-surtitre',
      type: 'surtitre',
      label: 'Surtitre',
      text: '',
      maxLength: 25,
      x: 0,
      y: 0,
      align: 'center',
      color: '#FFFFFF',
      fontSizeScale: 1.0,
      isVisible: true,
    },
    {
      id: 'text-titre',
      type: 'titre',
      label: 'Titre Principal',
      text: '',
      maxLength: 25,
      x: 0,
      y: 0,
      align: 'center',
      color: '#FFFFFF',
      fontSizeScale: 1.0,
      isVisible: true,
    },
    {
      id: 'text-soustitre',
      type: 'soustitre',
      label: 'Sous-titre',
      text: '',
      maxLength: 25,
      x: 0,
      y: 0,
      align: 'center',
      color: '#FFFFFF',
      fontSizeScale: 1.0,
      isVisible: true,
    },
  ],
};

export const SE_FAIRE_ENTENDRE_PROJECT: EventInput = {
  id: 'proj_se_faire_entendre',
  projectId: 'proj_se_faire_entendre',
  layoutTemplate: 'duality_campaign' as LayoutTemplateId,
  compositionTemplate: 'campaign_dual',
  dualityCampaignSlots: {
    topTextLeft: 'DESCENDRE DANS LA RUE.',
    topTextRight: 'SE FAIRE ENTENDRE AUTREMENT.',
    bottomTitle: 'CHOISISSEZ',
    bottomAccent: 'VOTRE VOIE.',
  },
  headlinerEventSlots: {
    artistName: 'SIGNAID',
    subRole: 'STREET ACTION',
    datePlace: 'BRUXELLES // STREET ACTION',
    ticketCta: 'BILLETTERIE',
  },
  minimalBrandSlots: {
    brandName: 'SIGNAID',
    tagline: 'SE FAIRE ENTENDRE AUTREMENT',
    releaseDate: 'EDITION 2026',
  },
  topDualLeft: 'DESCENDRE DANS LA RUE.',
  topDualRight: 'SE FAIRE ENTENDRE AUTREMENT.',
  mainTitle: 'CHOISISSEZ',
  accentWord: 'VOTRE VOIE',
  eventName: 'CHOISISSEZ',
  headerTagline: 'DESCENDRE DANS LA RUE.',
  punchline: 'VOTRE VOIE',
  headlineBadgeText: 'SE FAIRE ENTENDRE AUTREMENT.',
  djName: 'SIGNAID',
  venue: 'BRUXELLES // STREET ACTION',
  location: 'Bruxelles, Belgique',
  date: '2026',
  time: '20:00',
  timeSlot: '20:00 - LATE',
  typographyStyle: 'futur',
  accentColor: '#FF6B00',
  bgImage: '/assets/decor-ville-futuriste.jpg',
  backgroundImage: '/assets/decor-ville-futuriste.jpg',
  customBackground: '',
  flyerImageUrl: '/assets/decor-ville-futuriste.jpg',
  previewImages: {
    post: '/assets/decor-ville-futuriste.jpg',
    story: '/assets/decor-ville-futuriste.jpg',
    a3: '/assets/decor-ville-futuriste.jpg',
    banner: '/assets/decor-ville-futuriste.jpg',
  },
  backgroundTone: 0.5,
  isBackgroundToneEnabled: true,
  backgroundOpacity: 1.0,
  backgroundBrightness: 1.0,
  backgroundOffsetX: 0,
  backgroundOffsetY: 0,
  djPhoto: '/demo/artist-demo.webp',
  subjectScale: 1.0,
  djPhotoScale: 1.23,
  subjectPositionX: 0,
  subjectPositionY: 15,
  djPhotoOffsetY: 15,
  isSubjectBackgroundRemoved: true,
  isSubjectGradientFade: true,
  subjectFadeIntensity: 15,
  logoUrl: '/demo/signaid-logoUrl.png',
  logoImage: '/demo/signaid-logoImage.png',
  logoPositionX: 50,
  logoPositionY: 64,
  logoScale: 0.75,
  logoOpacity: 1,
  logoRotation: 0,
  logoOffsetY: 64,
  logoPosition: 'center',
  logoColorMode: 'original',
  instagramHandle: 'signaid',
  artistUrl: 'https://signaid.eu',
  artistSocialUrl: 'https://signaid.eu',
  tshirtLogoScale: 1.0,
  tshirtLogoOffsetY: 0,
  tshirtLogoColorMode: 'original',
  tshirtBackLogoScale: 1.0,
  tshirtBackLogoOffsetY: 0,
  tshirtSide: 'front',
  tshirtFrontPlacement: { x: 50, y: 35, scale: 1 },
  tshirtBackPlacement: { x: 50, y: 38, scale: 1 },
  dynamicTheme: {
    primaryAccent: '#FF6B00',
    secondaryAccent: '#FFFFFF',
    glowColor: '#FF6B00',
  },
  textLineSpacing: 0.8,
  textAlignment: 'center',
  textColors: {
    ...DEFAULT_TEXT_COLORS,
    headerTagline: '#000000',
    eventName: '#FFFFFF',
    punchline: '#FFFFFF',
    headlineBadge: '#FFFFFF',
  },
  posterTexts: [
    {
      id: 'text-surtitre',
      type: 'surtitre',
      label: 'Surtitre',
      text: 'Se faire entendre',
      maxLength: 25,
      x: 0,
      y: 0,
      align: 'center',
      color: '#000000',
      accentColor: '#FF6B00',
      layerPosition: 'front_subject',
      isVisible: true,
      fontSizeScale: 1.1,
      letterSpacing: 3,
      fontWeight: 'bold',
      hasBackgroundPill: false,
    },
    {
      id: 'text-titre',
      type: 'titre',
      label: 'Titre Principal',
      text: 'AUTREMENT.',
      maxLength: 25,
      x: 0,
      y: 0,
      align: 'center',
      color: '#FFFFFF',
      accentColor: '#FF6B00',
      layerPosition: 'behind_subject',
      isVisible: true,
      fontSizeScale: 1.0,
      letterSpacing: 2,
      fontWeight: 'bold',
      hasBackgroundPill: false,
    },
    {
      id: 'text-soustitre',
      type: 'soustitre',
      label: 'Sous-titre',
      text: 'SIGNAID',
      maxLength: 25,
      x: 0,
      y: 20,
      align: 'center',
      color: '#FFFFFF',
      accentColor: '#FF6B00',
      layerPosition: 'front_subject',
      isVisible: true,
      fontSizeScale: 1.15,
      letterSpacing: 2,
      fontWeight: 'bold',
      hasBackgroundPill: false,
    },
    {
      id: 'text-force',
      type: 'info',
      label: 'Accroche Bas',
      text: 'VOTRE VISIBILITÉ EST UNE FORCE.',
      maxLength: 35,
      x: 0,
      y: 28,
      align: 'center',
      color: '#FFFFFF',
      accentColor: '#FF6B00',
      layerPosition: 'front_subject',
      isVisible: true,
      fontSizeScale: 0.9,
      letterSpacing: 2,
      fontWeight: 'semibold',
      hasBackgroundPill: false,
    },
  ],
};

/**
 * État par défaut d'un Studio 100% Vierge :
 * Aucun visuel de démonstration (pas de fond, pas d'artiste, pas de logo),
 * aucun texte d'exemple injecté, tous les curseurs et formats réinitialisés à leurs valeurs neutres.
 */
export const BLANK_STUDIO_DATA: EventInput = {
  id: '',
  projectId: '',
  isVirgin: true,

  // Textes stricts vides
  headerTagline: '',
  eventName: '',
  punchline: '',
  headlineBadgeText: '',
  djName: '',

  // Informations événementielles vides
  date: '',
  time: '',
  timeSlot: '',
  venue: '',
  location: '',
  ticketPrice: '',
  lineup: '',

  // Liens et badges vides
  platformBadge: '',
  artistUrl: '',
  artistSocialUrl: '',
  instagramHandle: '',
  venueMapsUrl: '',
  venueAddress: '',
  organizationUrl: '',
  calendarUrl: '',
  textUrls: {},

  // Visuels stricts vides (aucun asset de démonstration)
  bgImage: '',
  backgroundImage: '',
  customBackground: '',
  bgPrompt: '',
  ambiancePrompt: '',
  ambianceEngine: 'Gemini AI Image',
  backgroundTone: 0.5,
  isBackgroundToneEnabled: true,
  backgroundOpacity: 1.0,
  backgroundBrightness: 1.0,
  backgroundOffsetX: 0,
  backgroundOffsetY: 0,

  djPhoto: '',
  rawDjPhoto: '',
  secondaryDjPhoto: '',
  rawSecondaryDjPhoto: '',
  subjectScale: 1.0,
  djPhotoScale: 1.0,
  subjectPositionX: 0,
  subjectPositionY: 0,
  djPhotoOffsetY: 0,
  djPhotoOffsetX: 0,
  isSubjectBackgroundRemoved: false,
  isSubjectGradientFade: true,
  isSubjectHarmonized: false,
  subjectFadeIntensity: 15,
  subjectBrightness: 1.0,
  subjectContrast: 1.0,
  subjectSaturation: 1.0,
  subjectHueRotate: 0,
  subjectShadowOffsetX: 0,
  subjectShadowOffsetY: 20,
  subjectShadowBlur: 30,
  subjectShadowColor: 'rgba(0,0,0,0.65)',
  subjectShadowOpacity: 0.65,
  subjectBlendMode: 'normal',
  subjectLightingSummary: '',

  logoUrl: undefined,
  logoImage: undefined,
  rawLogoImage: undefined,
  logoPositionX: 85.2,
  logoPositionY: 11.9,
  logoScale: 0.8,
  logoOpacity: 1,
  logoRotation: 0,
  logoOffsetY: 11.9,
  logoPosition: 'top-right',
  logoColorMode: 'original',

  // Merch vêtement vide
  tshirtCustomLogo: undefined,
  rawTshirtLogoOriginal: undefined,
  tshirtBackCustomLogo: undefined,
  tshirtBackLogoDisabled: false,
  tshirtLogoScale: 1.0,
  tshirtLogoOffsetY: 0,
  tshirtLogoColorMode: 'original',
  tshirtBackLogoScale: 1.0,
  tshirtBackLogoOffsetY: 0,
  tshirtSide: 'front',
  tshirtColor: 'black',
  tshirtFrontPlacement: { x: 68, y: 34, scale: 1 },
  tshirtBackPlacement: { x: 50, y: 38, scale: 1 },
  tshirtPreviewImage: undefined,
  tshirtPreviewImages: { front: null, back: null },

  // Affiches compilées vides
  flyerImageUrl: '',
  previewImages: {},

  // Typographie & Style neutres
  typographyStyle: 'futur',
  accentColor: '#FF6B00',
  themeColor: '#FF6B00',
  primaryColor: '#FF6B00',
  layoutTemplate: 'duality_campaign',
  templateData: {
    topTextLeft: 'DESCENDRE DANS LA RUE.',
    topTextRight: 'SE FAIRE ENTENDRE AUTREMENT.',
    bottomTitle: 'CHOISISSEZ',
    bottomAccent: 'VOTRE VOIE.',
  },
  dualityCampaignSlots: {
    topTextLeft: 'DESCENDRE DANS LA RUE.',
    topTextRight: 'SE FAIRE ENTENDRE AUTREMENT.',
    bottomTitle: 'CHOISISSEZ',
    bottomAccent: 'VOTRE VOIE.',
  },
  headlinerEventSlots: {
    artistName: 'AMELIE LENS',
    subRole: 'VOCAL MELODIC TECHNO',
    datePlace: 'SAMEDI 24 OCTOBRE // CLUB VISION ROOM',
    ticketCta: 'BILLETTERIE DISPONIBLE',
  },
  minimalBrandSlots: {
    brandName: 'SIGNAID STUDIO',
    tagline: 'L\'IMPACT VISUEL SANS CONCESSION',
    releaseDate: 'COLLECTION AUTOMNE 2026',
  },
  dynamicTheme: {
    primaryAccent: '#FF6B00',
    secondaryAccent: '#00f0ff',
    glowColor: '#FF6B00',
  },

  // Transforms géométriques neutres (scale: 1.0, offsetY: 0, offsetX: 0)
  formatTransforms: getDefaultFormatTransforms(1.0, 0, 0),
  logoFormatTransforms: {
    story: { x: 85.2, y: 11.9, scale: 0.8, isCustom: false },
    a3: { x: 85.2, y: 11.9, scale: 0.8, isCustom: false },
    banner: { x: 85.2, y: 11.9, scale: 0.8, isCustom: false },
  },
  textScales: { ...DEFAULT_TEXT_SCALES },
  formatTextScales: {},
  cartoucheScale: 1.0,
  cartouchePadding: 1.0,
  textOffsetsY: { ...DEFAULT_TEXT_OFFSETS_Y },
  formatTextOffsetsY: {},
  textLineSpacing: 0.8,
  formatTextLineSpacing: {},
  textAlignment: 'center',
  formatTextAlignment: {},
  posterTexts: [
    {
      id: 'text-surtitre',
      type: 'surtitre',
      label: 'Surtitre',
      text: '',
      maxLength: 25,
      x: 0,
      y: -16,
      align: 'center',
      color: '#FFFFFF',
      fontSizeScale: 1.0,
      isVisible: true,
    },
    {
      id: 'text-titre',
      type: 'titre',
      label: 'Titre Principal',
      text: '',
      maxLength: 25,
      x: 0,
      y: -4,
      align: 'center',
      color: '#FFFFFF',
      fontSizeScale: 1.0,
      isVisible: true,
    },
    {
      id: 'text-soustitre',
      type: 'soustitre',
      label: 'Sous-titre',
      text: '',
      maxLength: 25,
      x: 0,
      y: 8,
      align: 'center',
      color: '#FFFFFF',
      fontSizeScale: 1.0,
      isVisible: true,
    },
  ],
};

/**
 * Crée une instance neuve d'un espace de travail 100% vierge
 */
export function createBlankEventInput(customId?: string): EventInput {
  const id = customId || `proj_${Date.now()}`;
  return {
    ...BLANK_STUDIO_DATA,
    id,
    projectId: id,
    isVirgin: true,
  };
}

export const initialEventInput: EventInput = {
  ...BLANK_STUDIO_DATA,
  isVirgin: true,
};

declare global {
  interface Window {
    dataLayer?: any[];
    gtag?: (...args: any[]) => void;
  }
}

/* ════════════════════════════════════════════════════════════════════════════
 * 📌 ANCRAGE RELATIF / PARENTING (Logo & Sujet 2 → Sujet 1)
 *
 * Méthode de projection :
 *  - Le Sujet 1 est rendu via `translate(offsetX%, offsetY%) scale(s)` avec transform-origin
 *    « bottom center ». Son point d'ancrage (origine du repère enfant) est donc, en % du canevas :
 *        anchorX = 50 + offsetX (+ décalage d'alignement)      anchorY = 100 + offsetY
 *  - Un enfant stocke un vecteur (relX, relY) exprimé en % de la HAUTEUR du canevas, à l'échelle 1.
 *    La hauteur est l'unité commune car le sujet est contraint en hauteur (max-h-full) : c'est ce qui
 *    évite toute dérive lors des changements de ratio (1:1, 9:16, A3, 16:9).
 *  - Projection :   x% = anchorX + relX · s / aspect        (aspect = largeur / hauteur du format)
 *                   y% = anchorY + relY · s
 *                   échelle finale = relativeScale · s
 *  - Projection inverse (drag / curseurs) : relX = (x − anchorX) · aspect / s ; relY = (y − anchorY) / s
 * ════════════════════════════════════════════════════════════════════════════ */

export const FORMAT_ASPECT_RATIO: Record<string, number> = {
  post: 1,
  tshirt: 1,
  a3: 297 / 420,
  story: 9 / 16,
  banner: 16 / 9,
};

export function getFormatAspectRatio(format?: string): number {
  return FORMAT_ASPECT_RATIO[format || 'post'] ?? 1;
}

export interface SubjectAnchorTransform {
  offsetX?: number;
  offsetY: number;
  scale: number;
  alignX?: 'center' | 'left' | 'right';
}

/** Point d'ancrage (bas-centre) du Sujet 1 en % du canevas. */
export function getSubjectAnchorPoint(
  tr: SubjectAnchorTransform,
  previewFormat?: string
): { x: number; y: number } {
  const isBanner = previewFormat === 'banner';
  let alignShift = 0;
  if (tr.alignX === 'right') alignShift = isBanner ? 5 : 30;
  else if (tr.alignX === 'left') alignShift = isBanner ? -5 : -30;
  return {
    x: 50 + (tr.offsetX ?? 0) + alignShift,
    y: 100 + tr.offsetY,
  };
}

function safeSubjectScale(tr: SubjectAnchorTransform): number {
  return tr.scale > 0.01 ? tr.scale : 0.01;
}

/** Canevas (%) → vecteur relatif normalisé. */
export function canvasToRelative(
  point: { x: number; y: number },
  tr: SubjectAnchorTransform,
  previewFormat?: string
): { relX: number; relY: number } {
  const a = getSubjectAnchorPoint(tr, previewFormat);
  const s = safeSubjectScale(tr);
  const aspect = getFormatAspectRatio(previewFormat);
  return {
    relX: Math.round(((point.x - a.x) * aspect / s) * 100) / 100,
    relY: Math.round(((point.y - a.y) / s) * 100) / 100,
  };
}

/** Vecteur relatif normalisé → canevas (%). */
export function relativeToCanvas(
  rel: { relX: number; relY: number },
  tr: SubjectAnchorTransform,
  previewFormat?: string
): { x: number; y: number } {
  const a = getSubjectAnchorPoint(tr, previewFormat);
  const s = safeSubjectScale(tr);
  const aspect = getFormatAspectRatio(previewFormat);
  return {
    x: a.x + (rel.relX * s) / aspect,
    y: a.y + rel.relY * s,
  };
}

/**
 * Résolution du logo avec ancrage : si `isPinnedToSubject` est actif (et qu'un Sujet 1 existe),
 * la position dérive du Sujet 1 ; sinon on retombe sur resolveLogoTransformForFormat (comportement historique).
 */
export function resolvePinnedLogoTransform(
  input: Partial<EventInput>,
  previewFormat: string | undefined,
  subjectTr?: SubjectAnchorTransform | null
): LogoFormatTransform & { isCustom: boolean; isPinned: boolean } {
  if (input.isPinnedToSubject && subjectTr && input.djPhoto) {
    const pos = relativeToCanvas(
      { relX: input.relativeOffsetX ?? 0, relY: input.relativeOffsetY ?? 0 },
      subjectTr,
      previewFormat
    );
    const relScale = typeof input.relativeScale === 'number' ? input.relativeScale : 0.8;
    return {
      x: Number(pos.x.toFixed(2)),
      y: Number(pos.y.toFixed(2)),
      scale: Number((relScale * safeSubjectScale(subjectTr)).toFixed(3)), // finalLogoScale = logo.scale × subject.scale
      isCustom: true,
      isPinned: true,
    };
  }
  return { ...resolveLogoTransformForFormat(input, previewFormat), isPinned: false };
}

/** Active l'épinglage en conservant exactement la position/taille visuelles courantes. */
export function pinLogoToSubject(
  prev: EventInput,
  previewFormat: string,
  subjectTr: SubjectAnchorTransform
): EventInput {
  const cur = resolveLogoTransformForFormat(prev, previewFormat);
  const rel = canvasToRelative({ x: cur.x, y: cur.y }, subjectTr, previewFormat);
  return {
    ...prev,
    isPinnedToSubject: true,
    relativeOffsetX: rel.relX,
    relativeOffsetY: rel.relY,
    relativeScale: Number((cur.scale / safeSubjectScale(subjectTr)).toFixed(3)),
  };
}

/** Désactive l'épinglage en « figeant » la position courante dans les coordonnées canevas. */
export function unpinLogoFromSubject(
  prev: EventInput,
  previewFormat: string,
  subjectTr: SubjectAnchorTransform
): EventInput {
  const cur = resolvePinnedLogoTransform(prev, previewFormat, subjectTr);
  return updateLogoTransform(
    { ...prev, isPinnedToSubject: false },
    previewFormat,
    { x: cur.x, y: cur.y, scale: cur.scale }
  );
}

/**
 * Mise à jour d'un logo épinglé. x/y sont en % canevas (drag, boutons de position) et sont reconvertis
 * en offsets relatifs ; relativeScale remplace logo.scale (multiplié ensuite par l'échelle du sujet).
 */
export function updatePinnedLogoTransform(
  prev: EventInput,
  previewFormat: string,
  subjectTr: SubjectAnchorTransform,
  updates: { x?: number; y?: number; relativeScale?: number }
): EventInput {
  const cur = resolvePinnedLogoTransform(prev, previewFormat, subjectTr);
  const x = Math.max(0, Math.min(100, updates.x ?? cur.x));
  const y = Math.max(0, Math.min(100, updates.y ?? cur.y));
  const rel = canvasToRelative({ x, y }, subjectTr, previewFormat);
  return {
    ...prev,
    relativeOffsetX: rel.relX,
    relativeOffsetY: rel.relY,
    ...(updates.relativeScale !== undefined ? { relativeScale: updates.relativeScale } : {}),
  };
}

/** Transformation effective (offsetX/offsetY/scale) du Sujet 2, épinglée ou non. */
export function resolveSecondarySubjectTransform(
  input: Partial<EventInput>,
  previewFormat: string | undefined,
  subjectTr?: SubjectAnchorTransform | null
): { offsetX: number; offsetY: number; scale: number; isPinned: boolean } {
  if (input.secondaryIsPinnedToSubject && subjectTr && input.djPhoto) {
    const pos = relativeToCanvas(
      { relX: input.secondaryRelativeOffsetX ?? 0, relY: input.secondaryRelativeOffsetY ?? 0 },
      subjectTr,
      previewFormat
    );
    const relScale = typeof input.secondaryRelativeScale === 'number' ? input.secondaryRelativeScale : 1;
    return {
      // Le Sujet 2 est lui aussi ancré bas-centre : offset = point d'ancrage − (50, 100)
      offsetX: Number((pos.x - 50).toFixed(2)),
      offsetY: Number((pos.y - 100).toFixed(2)),
      scale: Number((relScale * safeSubjectScale(subjectTr)).toFixed(3)),
      isPinned: true,
    };
  }
  return {
    offsetX: input.subject2OffsetX ?? input.secondaryDjPhotoOffsetX ?? 25,
    offsetY: input.subject2OffsetY ?? input.secondaryDjPhotoOffsetY ?? 0,
    scale: input.subject2Scale ?? input.secondaryDjPhotoScale ?? 1.0,
    isPinned: false,
  };
}

export function pinSecondaryToSubject(
  prev: EventInput,
  previewFormat: string,
  subjectTr: SubjectAnchorTransform
): EventInput {
  const offX = prev.subject2OffsetX ?? prev.secondaryDjPhotoOffsetX ?? 25;
  const offY = prev.subject2OffsetY ?? prev.secondaryDjPhotoOffsetY ?? 0;
  const scale = prev.subject2Scale ?? prev.secondaryDjPhotoScale ?? 1.0;
  const rel = canvasToRelative({ x: 50 + offX, y: 100 + offY }, subjectTr, previewFormat);
  return {
    ...prev,
    secondaryIsPinnedToSubject: true,
    secondaryRelativeOffsetX: rel.relX,
    secondaryRelativeOffsetY: rel.relY,
    secondaryRelativeScale: Number((scale / safeSubjectScale(subjectTr)).toFixed(3)),
  };
}

export function unpinSecondaryFromSubject(
  prev: EventInput,
  previewFormat: string,
  subjectTr: SubjectAnchorTransform
): EventInput {
  const cur = resolveSecondarySubjectTransform(prev, previewFormat, subjectTr);
  return {
    ...prev,
    secondaryIsPinnedToSubject: false,
    secondaryDjPhotoOffsetX: cur.offsetX,
    secondaryDjPhotoOffsetY: cur.offsetY,
    secondaryDjPhotoScale: cur.scale,
    subject2OffsetX: cur.offsetX,
    subject2OffsetY: cur.offsetY,
    subject2Scale: cur.scale,
  };
}

/**
 * Écrit une transformation du Sujet 2 : si épinglé → en offsets relatifs, sinon dans les champs historiques.
 * `offsetX/offsetY` sont toujours exprimés en repère canevas (même convention que translate(%)).
 * `scale` est l'échelle finale souhaitée en mode libre, ou l'échelle relative en mode épinglé.
 */
export function applySecondarySubjectUpdate(
  prev: EventInput,
  previewFormat: string,
  subjectTr: SubjectAnchorTransform,
  updates: { offsetX?: number; offsetY?: number; scale?: number }
): EventInput {
  if (!prev.secondaryIsPinnedToSubject || !prev.djPhoto) {
    return {
      ...prev,
      ...(updates.offsetX !== undefined ? { secondaryDjPhotoOffsetX: updates.offsetX, subject2OffsetX: updates.offsetX } : {}),
      ...(updates.offsetY !== undefined ? { secondaryDjPhotoOffsetY: updates.offsetY, subject2OffsetY: updates.offsetY } : {}),
      ...(updates.scale !== undefined ? { secondaryDjPhotoScale: updates.scale, subject2Scale: updates.scale } : {}),
    };
  }
  const cur = resolveSecondarySubjectTransform(prev, previewFormat, subjectTr);
  const rel = canvasToRelative(
    { x: 50 + (updates.offsetX ?? cur.offsetX), y: 100 + (updates.offsetY ?? cur.offsetY) },
    subjectTr,
    previewFormat
  );
  return {
    ...prev,
    secondaryRelativeOffsetX: rel.relX,
    secondaryRelativeOffsetY: rel.relY,
    ...(updates.scale !== undefined ? { secondaryRelativeScale: updates.scale } : {}),
  };
}
