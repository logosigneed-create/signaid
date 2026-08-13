import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { doc, getDoc, collection, query, where, limit, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export interface ProfileLink {
  id: string;
  title: string;
  type: 'booking' | 'whatsapp' | 'email' | 'social' | 'custom' | 'merch';
  url?: string;
  platform?: string;
  icon?: string;
  bgColor?: string;
  textColor?: string;
  enabled: boolean;
}

export interface ArtistProfile {
  id: string;
  companyName: string;
  slug: string;
  logoUrl?: string;
  livePhotoUrl?: string;
  presentation?: string;
  photoDescription?: string;
  contactEmail?: string;
  whatsapp?: string;
  socials?: { platform: string; url: string }[];
  customLinks?: ProfileLink[];
  accentColor?: string;
  theme?: 'dark' | 'light';
  totalSales?: number;
  revenue?: number;
  ordersCount?: number;
  invertLogoInLightMode?: boolean;
}

export interface ProductItem {
  id: string;
  name: string;
  price: number;
  imageUrl?: string;
  frontImageUrl?: string;
  backImageUrl?: string;
  images?: Record<string, string>;
  description?: string;
  sizes?: string[];
  colors?: string[];
  category?: string;
  garment?: string;
}

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('BtpAuditDB', 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('heavy_assets')) {
        db.createObjectStore('heavy_assets');
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const dbGet = async (key: string): Promise<any> => {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction('heavy_assets', 'readonly');
      const store = tx.objectStore('heavy_assets');
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
};

export interface CartLine {
  id: string;
  productId: string;
  name: string;
  price: number;
  size: string;
  color: string;
  quantity: number;
  previewImageUrl?: string;
}

export function getOptimizedImageUrl(url?: string, width = 400): string {
  if (!url || typeof url !== 'string') return '';
  const cleanUrl = url.trim();
  if (!cleanUrl) return '';

  return cleanUrl;
}

const SocialIcon = ({ platform, color }: { platform: string; color?: string }) => {
  const p = platform.toLowerCase();
  const fill = color || 'currentColor';
  if (p.includes("instagram")) return <svg width="20" height="20" fill={fill} viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>;
  if (p.includes("facebook")) return <svg width="20" height="20" fill={fill} viewBox="0 0 24 24"><path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z"/></svg>;
  if (p.includes("spotify")) return <svg width="20" height="20" fill={fill} viewBox="0 0 24 24"><path d="M12 0C5.376 0 0 5.376 0 12s5.376 12 12 12 12-5.376 12-12S18.624 0 12 0zm5.521 17.341c-.22.359-.688.472-1.047.251-2.87-1.753-6.482-2.15-10.738-1.176-.407.094-.816-.164-.91-.571-.093-.406.164-.816.571-.91 4.659-1.066 8.653-.615 11.873 1.35.359.221.472.689.251 1.056zm1.474-3.277c-.277.45-.867.591-1.317.315-3.284-2.018-8.291-2.604-12.176-1.425-.506.154-1.041-.137-1.196-.643-.154-.506.137-1.04.643-1.195 4.437-1.347 9.967-.698 13.73 1.631.45.276.591.866.316 1.317zm.126-3.414C15.228 8.249 8.8 8.036 5.123 9.151c-.624.19-1.282-.164-1.472-.789-.19-.624.165-1.282.789-1.472 4.225-1.283 11.317-1.034 15.772 1.611.56.332.744 1.054.412 1.614-.332.56-1.054.743-1.614.412z"/></svg>;
  if (p.includes("soundcloud")) return <svg width="20" height="20" fill={fill} viewBox="0 0 24 24"><path d="M1.175 12.225c-.062 0-.115.05-.125.112l-.463 3.638.463 3.65c.01.062.063.112.125.112.063 0 .115-.05.125-.112l.538-3.65-.538-3.638c-.01-.062-.062-.112-.125-.112zm2.087-1.375c-.075 0-.137.062-.15.137l-.4 5.013.4 5.012c.013.075.075.138.15.138.075 0 .138-.063.15-.138l.463-5.012-.463-5.013c-.012-.075-.075-.137-.15-.137zm2.113-1.35c-.088 0-.163.075-.175.163l-.363 6.362.363 6.363c.012.087.087.162.175.162.087 0 .162-.075.175-.162l.4-6.363-.4-6.362c-.013-.088-.088-.163-.175-.163zm2.125-.863c-.1 0-.188.088-.2.188l-.325 7.225.325 7.225c.012.1.1.188.2.188.1 0 .188-.088.2-.188l.363-7.225-.363-7.225c-.012-.1-.1-.188-.2-.188zm2.137-.712c-.112 0-.212.1-.225.212l-.287 7.938.287 7.937c.013.113.113.213.225.213.113 0 .213-.1.225-.213l.325-7.937-.325-7.938c-.012-.112-.112-.212-.225-.212zm10.738.937c-1.35 0-2.587.563-3.488 1.463-.262.262-.487.55-.675.862h-.05c-.088 0-.162.075-.175.163l-.187 6.425.187 6.425c.013.088.087.163.175.163.038 0 .075-.013.1-.038 1.05 1.05 2.488 1.7 4.113 1.7 3.2 0 5.8-2.6 5.8-5.8 0-3.2-2.6-5.8-5.8-5.8z"/></svg>;
  if (p.includes("tiktok")) return <svg width="20" height="20" fill={fill} viewBox="0 0 24 24"><path d="M12.525.02c1.31 0 2.591.21 3.795.602v4.54a7.08 7.08 0 0 1-2.31-.41V17.5a5.5 5.5 0 1 1-6.14-5.46v4.61a.9.9 0 1 0 .64 1.41V4.54A7.08 7.08 0 0 1 12.525.02z"/></svg>;
  if (p.includes("youtube")) return <svg width="20" height="20" fill={fill} viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>;
  if (p.includes("whatsapp")) return <svg width="20" height="20" fill={fill} viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>;
  if (p.includes("email") || p.includes("gmail") || p.includes("booking") || p.includes("contact")) return <svg width="20" height="20" fill={fill} viewBox="0 0 24 24"><path d="M24 4.5v15c0 .85-.65 1.5-1.5 1.5H21V7.387l-9 6.463-9-6.463V21H1.5C.65 21 0 20.35 0 19.5v-15c0-.425.162-.8.431-1.068C.7 3.16 1.075 3 1.5 3H3.9l8.1 5.812L20.1 3h2.4c.425 0 .8.162 1.069.432.269.268.431.643.431 1.068z"/></svg>;
  return <svg width="20" height="20" fill={fill} viewBox="0 0 24 24"><path d="M12 0c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm-1 18h-2v-6h-2v-2h4v8zm1-9.75c-.69 0-1.25-.56-1.25-1.25s.56-1.25 1.25-1.25 1.25.56 1.25 1.25-.56 1.25-1.25 1.25z"/></svg>;
};

export default function ArtistProfileView({ overrideSlug }: { overrideSlug?: string }) {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  
  const hostname = typeof window !== 'undefined' ? window.location.hostname.toLowerCase() : '';
  const domainSlug = hostname.includes('djdfazz') ? 'fabrizio' : undefined;

  const uidParam = searchParams.get('uid') || searchParams.get('id');
  const targetIdentifier = overrideSlug || domainSlug || slug || uidParam;

  const [artist, setArtist] = useState<ArtistProfile | null>(null);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerZip, setCustomerZip] = useState('');
  const [customerCity, setCustomerCity] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');

  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // État du formulaire de Booking
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [bookingName, setBookingName] = useState('');
  const [bookingEmail, setBookingEmail] = useState('');
  const [bookingPhone, setBookingPhone] = useState('');
  const [bookingDate, setBookingDate] = useState('');
  const [bookingLocation, setBookingLocation] = useState('');
  const [bookingMessage, setBookingMessage] = useState('');
  const [isSendingBooking, setIsSendingBooking] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState<string | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);
  
  const paymentSuccess = searchParams.get('payment_success') === 'true';
  const paymentCanceled = searchParams.get('payment_canceled') === 'true';

  // Récupération intégrale via la Cloud Function getUserBySlug (avec cache sessionStorage pour accès instantané)
  useEffect(() => {
    async function fetchArtistData() {
      if (!targetIdentifier) return;

      const swrKey = `fast_artist_cache_v7_${targetIdentifier}`;
      const cached = localStorage.getItem(swrKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed && parsed.artist && parsed.products && parsed.products.some((p: any) => p.imageUrl && p.imageUrl.length > 100 && !p.imageUrl.includes('/assets/'))) {
            setArtist(parsed.artist);
            setProducts(parsed.products || []);
            setLoading(false);
          }
        } catch (e) {}
      } else {
        setLoading(true);
      }
      setError(null);

      const isRealImg = (url?: string | null) => url && typeof url === 'string' && (url.includes('firebasestorage') || url.startsWith('data:') || url.length > 100);

      const compressBase64Image = (base64Str: string, maxWidth = 800, quality = 0.82): Promise<string> => {
        return new Promise((resolve) => {
          if (!base64Str || typeof base64Str !== 'string' || !base64Str.startsWith('data:image')) {
            return resolve(base64Str);
          }
          if (base64Str.length < 200000) {
            return resolve(base64Str);
          }
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            let width = img.width;
            let height = img.height;
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0, width, height);
              const compressed = canvas.toDataURL('image/webp', quality);
              resolve(compressed.length < base64Str.length ? compressed : base64Str);
            } else {
              resolve(base64Str);
            }
          };
          img.onerror = () => resolve(base64Str);
          img.src = base64Str;
        });
      };

      let cloudMockupsCache: any[] | null = null;

      const getCloudMockups = async () => {
        if (cloudMockupsCache !== null) return cloudMockupsCache;
        try {
          const q = query(collection(db, 'btp_projects'), where('projectId', '==', 'audit-8f198p5'));
          const qSnap = await getDocs(q);
          if (!qSnap.empty) {
            const bData = qSnap.docs[0].data();
            if (bData.mockups && bData.mockups.length > 0) {
              cloudMockupsCache = bData.mockups;
              return cloudMockupsCache;
            }
          }

          const cfgKeys = ['guest_ms3ijgnco2xnid', 'fabrizio', 'djdfazz', 'audit-8f198p5'];
          for (const key of cfgKeys) {
            const cfgSnap = await getDoc(doc(db, 'SiteConfigs', key));
            if (cfgSnap.exists()) {
              const cData = cfgSnap.data();
              if (cData.mockups && cData.mockups.length > 0) {
                cloudMockupsCache = cData.mockups;
                return cloudMockupsCache;
              }
            }
          }
        } catch (e) {
          console.warn("Error fetching cloud mockups:", e);
        }
        cloudMockupsCache = [];
        return cloudMockupsCache;
      };

      const getBestAiImage = async (item: any, identifier: string, cfgProducts?: any) => {
        const isTshirt = item.id?.includes('tshirt') || item.garment === 'tshirt' || item.name?.toLowerCase().includes('t-shirt') || item.id === 'tFront' || item.id === 'prod-0';
        const isPolo = item.id?.includes('polo') || item.garment === 'polo' || item.name?.toLowerCase().includes('polo') || item.id === 'pFront' || item.id === 'prod-1';
        const isHoodie = item.id?.includes('sweat') || item.id?.includes('hoodie') || item.garment === 'sweat' || item.name?.toLowerCase().includes('hoodie') || item.id === 'hFront' || item.id === 'prod-2';

        // 0. ABSOLUTE PRIORITY: Check cfgProducts (SiteConfigs/{clientSlug}.products) for aiImageUrl from Firebase Storage
        if (cfgProducts) {
          let priorityUrl: string | null = null;
          if (isTshirt && cfgProducts.tshirt?.aiImageUrl) priorityUrl = cfgProducts.tshirt.aiImageUrl;
          else if (isPolo && cfgProducts.polo?.aiImageUrl) priorityUrl = cfgProducts.polo.aiImageUrl;
          else if (isHoodie && cfgProducts.hoodie?.aiImageUrl) priorityUrl = cfgProducts.hoodie.aiImageUrl;

          if (priorityUrl && typeof priorityUrl === 'string' && priorityUrl.length > 10) {
            return priorityUrl;
          }
        }

        let candidate = item.ai || item.mechanical || item.imageStudio || item.imageFront || item.imageUrl || item.frontImageUrl;
        if (isRealImg(candidate) && candidate.startsWith('https://firebasestorage.googleapis.com')) return candidate;

        // 1. Try matching with cloud mockups from Firestore (audit-8f198p5 / SiteConfigs)
        const cloudMockups = await getCloudMockups();
        if (cloudMockups && cloudMockups.length > 0) {
          const match = cloudMockups.find((m: any) => {
            if (isTshirt && (m.id === 'tFront' || m.garment === 'tshirt')) return true;
            if (isPolo && (m.id === 'pFront' || m.garment === 'polo')) return true;
            if (isHoodie && (m.id === 'hFront' || m.garment === 'sweat')) return true;
            return m.id === item.id;
          });

          if (match) {
            candidate = match.ai || match.mechanical || match.imageFront || match.imageStudio || match.imageUrl;
            if (isRealImg(candidate)) return candidate;
          }
        }

        if (isRealImg(candidate)) return candidate;

        // 2. Try IDB key lookup
        const possibleIds = [
          item.id,
          isTshirt ? 'tFront' : null,
          isPolo ? 'pFront' : null,
          isHoodie ? 'hFront' : null,
          item.garment === 'business_card' || item.id?.includes('card') ? 'cardFront' : null
        ].filter(Boolean);

        for (const pid of possibleIds) {
          let idbAi = await dbGet(`audit-8f198p5_ai_${pid}`);
          if (!idbAi) idbAi = await dbGet(`guest_ms3ijgnco2xnid_ai_${pid}`);
          if (!idbAi && pid) idbAi = await dbGet(`${identifier}_ai_${pid}`);
          if (isRealImg(idbAi)) {
            candidate = idbAi;
            break;
          }
        }

        if (isRealImg(candidate) && candidate.startsWith('data:image')) {
          candidate = await compressBase64Image(candidate, 800, 0.82);
        }

        return isRealImg(candidate) ? candidate : null;
      };

      const loadFromFirestoreFallback = async (identifier: string) => {
        try {
          const { getStoredConfig } = await import('../lib/store');
          let cfg: any = await getStoredConfig(identifier);
          if (!cfg || !cfg.companyName || cfg.companyName === 'Votre Entreprise' || !cfg.products) {
            if (identifier === 'fabrizio' || identifier === 'djdfazz' || identifier.includes('djdfazz')) {
              cfg = await getStoredConfig('guest_ms3ijgnco2xnid');
              if (!cfg || !cfg.products) {
                cfg = await getStoredConfig('fabrizio');
              }
              if (!cfg || !cfg.products) {
                cfg = await getStoredConfig('djdfazz');
              }
            }
          }

          let cloudMockups: any[] = [];
          if (identifier === 'fabrizio' || identifier === 'djdfazz' || identifier.includes('djdfazz')) {
            try {
              const q = query(collection(db, 'btp_projects'), where('projectId', '==', 'audit-8f198p5'));
              const qSnap = await getDocs(q);
              if (!qSnap.empty) {
                const bData = qSnap.docs[0].data();
                if (bData.mockups && bData.mockups.length > 0) {
                  cloudMockups = bData.mockups;
                }
              }
            } catch (bErr) {
              console.warn("Error fetching btp_projects audit-8f198p5 for fabrizio:", bErr);
            }
          }

          const idbSessionStr = await dbGet('session_obj_audit-8f198p5');
          const idbSession = idbSessionStr ? JSON.parse(idbSessionStr) : null;
          const idbMockups = idbSession?.mockups || [];

          const rawProducts = cloudMockups.length > 0 ? cloudMockups : (idbMockups.length > 0 ? idbMockups : (cfg?.mockups || cfg?.items || cfg?.products || []));

          if (cfg && (cfg.companyName || cfg.logoUrl || rawProducts.length > 0)) {
            const logo = cfg.logoUrl || cfg.logoAdaptedUrl || cfg.logoA?.adaptedRemastered || cfg.logoA?.adapted || cfg.logoA?.original || '/logo.png';
            const fallbackArtist: ArtistProfile = {
              id: identifier,
              slug: identifier,
              companyName: cfg.companyName || cfg.name || 'Fabrizio (DJ & Producteur - D-FAZZ)',
              presentation: cfg.presentation || cfg.presentationText || cfg.heroSubtitle || 'DJ, Producteur & Artiste Électro',
              logoUrl: logo,
              contactEmail: cfg.contactEmail || cfg.email || '',
              whatsapp: cfg.whatsappNumber || cfg.whatsapp || '',
              accentColor: cfg.accentColor || '#f97316',
              theme: 'dark',
              ...cfg
            };

            let fetchedProducts: ProductItem[] = [];
            if (rawProducts && rawProducts.length > 0) {
              fetchedProducts = await Promise.all(rawProducts.map(async (d: any, idx: number) => {
                let img = await getBestAiImage(d, identifier, cfg?.products);

                if (!isRealImg(img)) {
                  if (d.id?.includes('tshirt') || d.garment === 'tshirt' || d.id === 'tFront') img = '/assets/tshirt-black-JHK170.png';
                  else if (d.id?.includes('polo') || d.garment === 'polo' || d.id === 'pFront') img = '/assets/polo-black-JHK510.png';
                  else if (d.id?.includes('sweat') || d.id?.includes('hoodie') || d.garment === 'sweat' || d.id === 'hFront') img = '/assets/hoodie-black-JHK421.png';
                  else img = logo;
                }

                return {
                  id: d.id || `prod-${idx}`,
                  name: d.title || d.name || 'Article Merch',
                  price: Number(d.price || (d.id?.includes('basic') ? 25 : 39)),
                  images: d.images || {},
                  imageUrl: img,
                  frontImageUrl: img,
                  backImageUrl: d.mechanical || d.backImageUrl || '',
                  sizes: d.sizes || ['S', 'M', 'L', 'XL'],
                  colors: d.colors || ['Noir', 'Blanc'],
                  category: d.garment || d.category || 'Merch',
                  garment: d.garment || d.category || 'Merch'
                };
              }));
            } else {
              fetchedProducts = [
                {
                  id: 'tshirt-black',
                  name: 'T-Shirt Pro Black Edition (Logo DJ Fabrizio)',
                  price: 29,
                  imageUrl: logo,
                  frontImageUrl: logo,
                  backImageUrl: '',
                  sizes: ['S', 'M', 'L', 'XL', 'XXL'],
                  colors: ['Noir'],
                  category: 'T-Shirt',
                  garment: 'tshirt'
                },
                {
                  id: 'hoodie-black',
                  name: 'Hoodie Premium DJ Fabrizio',
                  price: 49,
                  imageUrl: logo,
                  frontImageUrl: logo,
                  backImageUrl: '',
                  sizes: ['S', 'M', 'L', 'XL'],
                  colors: ['Noir'],
                  category: 'Sweat',
                  garment: 'sweat'
                },
                {
                  id: 'cap-black',
                  name: 'Casquette Brodée D-FAZZ',
                  price: 22,
                  imageUrl: logo,
                  frontImageUrl: logo,
                  backImageUrl: '',
                  sizes: ['Taille Unique'],
                  colors: ['Noir'],
                  category: 'Accessoires',
                  garment: 'epi'
                }
              ];
            }

            console.log(`[DJDFAZZ_DEBUG] Target Identifier: "${identifier}"`);
            console.log(`[DJDFAZZ_DEBUG] Loaded SiteConfigs payload:`, cfg);
            console.log(`[DJDFAZZ_DEBUG] Products exact values:`, fetchedProducts.map(p => ({
              id: p.id,
              name: p.name,
              category: p.category,
              imageUrl: p.imageUrl,
              aiImageUrl: (cfg?.products as any)?.[p.category || p.garment]?.aiImageUrl || null,
              logoUrl: cfg?.logoUrl || null
            })));

            setArtist(fallbackArtist);
            setProducts(fetchedProducts);
            localStorage.setItem(swrKey, JSON.stringify({ artist: fallbackArtist, products: fetchedProducts }));
            return true;
          }
        } catch (e) {
          console.warn("Firestore client fallback error:", e);
        }
        return false;
      };

      const fetchWithTimeout = async (url: string, timeoutMs = 6000) => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
          const res = await fetch(url, { signal: controller.signal, cache: 'no-store' });
          clearTimeout(timer);
          return res;
        } catch (err) {
          clearTimeout(timer);
          throw err;
        }
      };

      try {
        const timestamp = Date.now();
        const primaryUrl = `https://getuserbyslug-r5zxdnaotq-uc.a.run.app?slug=${encodeURIComponent(targetIdentifier)}&_t=${timestamp}`;
        const secondaryUrl = `https://us-central1-signaid-prod.cloudfunctions.net/getUserBySlug?slug=${encodeURIComponent(targetIdentifier)}&_t=${timestamp}`;

        let response: Response | null = null;
        try {
          response = await fetchWithTimeout(primaryUrl, 5000);
        } catch (e) {
          try {
            response = await fetchWithTimeout(secondaryUrl, 5000);
          } catch (e2) {}
        }

        if (!response || !response.ok) {
          const loaded = await loadFromFirestoreFallback(targetIdentifier);
          if (loaded) {
            setLoading(false);
            return;
          }
          if (!artist) setError(`Aucun artiste ou DJ trouvé pour "${targetIdentifier}".`);
          setLoading(false);
          return;
        }

        const data = await response.json();

        if (!data.success || !data.artist) {
          const loaded = await loadFromFirestoreFallback(targetIdentifier);
          if (loaded) {
            setLoading(false);
            return;
          }
          if (!artist) setError(data.error || `Aucun artiste ou DJ trouvé pour "${targetIdentifier}".`);
          setLoading(false);
          return;
        }

        setArtist(data.artist);

        const fetchedProducts: ProductItem[] = await Promise.all((data.products || []).map(async (d: any, idx: number) => {
          let img = await getBestAiImage(d, targetIdentifier, data.artist?.products || data.products);

          if (!isRealImg(img)) {
            if (d.id?.includes('tshirt') || d.garment === 'tshirt' || d.name?.toLowerCase().includes('t-shirt')) img = '/assets/tshirt-black-JHK170.png';
            else if (d.id?.includes('polo') || d.garment === 'polo' || d.name?.toLowerCase().includes('polo')) img = '/assets/polo-black-JHK510.png';
            else if (d.id?.includes('sweat') || d.id?.includes('hoodie') || d.garment === 'sweat' || d.name?.toLowerCase().includes('hoodie')) img = '/assets/hoodie-black-JHK421.png';
            else img = data.artist?.logoUrl || '/logo.png';
          }

          return {
            id: d.id || `prod-${idx}`,
            name: d.name || 'Article Merch',
            price: Number(d.price || 0),
            images: d.images || {},
            imageUrl: img,
            frontImageUrl: img,
            backImageUrl: d.backImageUrl || '',
            sizes: d.sizes || ['S', 'M', 'L', 'XL'],
            colors: d.colors || ['Noir', 'Blanc'],
            category: d.category || d.garment || 'Merch',
            garment: d.garment || d.category || 'Merch'
          };
        }));

        setProducts(fetchedProducts);
        localStorage.setItem(swrKey, JSON.stringify({ artist: data.artist, products: fetchedProducts }));
      } catch (err: any) {
        console.warn('Error loading profile from API, trying Firestore fallback:', err);
        const loaded = await loadFromFirestoreFallback(targetIdentifier);
        if (!loaded && !artist) {
          setError('Erreur lors du chargement de la page.');
        }
      } finally {
        setLoading(false);
      }
    }

    fetchArtistData();
  }, [slug, uidParam, overrideSlug, domainSlug, targetIdentifier]);

  // Ajouter un produit au panier
  const addToCart = (product: ProductItem, selectedSize: string, selectedColor: string) => {
    const cartId = `${product.id}-${selectedSize}-${selectedColor}`;
    setCart(prev => {
      const existing = prev.find(item => item.id === cartId);
      if (existing) {
        return prev.map(item => item.id === cartId ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, {
        id: cartId,
        productId: product.id,
        name: product.name,
        price: product.price,
        size: selectedSize,
        color: selectedColor,
        quantity: 1,
        previewImageUrl: product.imageUrl
      }];
    });
  };

  const removeFromCart = (cartId: string) => {
    setCart(prev => prev.filter(item => item.id !== cartId));
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  // 2. Déclenchement de la session de paiement Mollie (POST /api/checkout)
  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0 || !artist) return;

    if (!customerName.trim() || !customerEmail.trim() || !customerAddress.trim() || !customerCity.trim()) {
      setCheckoutError("Veuillez remplir tous les champs obligatoires (Nom, Email, Adresse, Ville).");
      return;
    }

    setIsCheckingOut(true);
    setCheckoutError(null);

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.map(item => ({
            id: item.productId,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            size: item.size,
            color: item.color,
            previewImageUrl: item.previewImageUrl
          })),
          artistSlug: artist.slug,
          artistId: artist.id,
          customerInfo: {
            name: customerName,
            email: customerEmail,
            phone: customerPhone,
            address: customerAddress,
            zip: customerZip,
            city: customerCity,
            notes: customerNotes
          }
        })
      });

      const data = await response.json();

      if (!response.ok || !data.checkoutUrl) {
        throw new Error(data.error || 'Impossible de créer la session de paiement');
      }

      // Redirection sécurisée vers Mollie Checkout
      window.location.href = data.checkoutUrl;
    } catch (err: any) {
      console.error('Checkout error:', err);
      setCheckoutError(err.message || 'Erreur lors du paiement');
      setIsCheckingOut(false);
    }
  };

  // 3. Traitement du Formulaire de Booking / Lead Generation
  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!artist) return;
    if (!bookingName.trim() || (!bookingEmail.trim() && !bookingPhone.trim())) {
      setBookingError("Veuillez renseigner votre nom et au moins un moyen de contact (Email ou Téléphone).");
      return;
    }

    setIsSendingBooking(true);
    setBookingError(null);
    setBookingSuccess(null);

    const payload = {
      artistSlug: artist.slug,
      artistId: artist.id,
      name: bookingName,
      email: bookingEmail,
      phone: bookingPhone,
      date: bookingDate,
      location: bookingLocation,
      message: bookingMessage
    };

    try {
      let response: Response | null = null;
      const endpoints = [
        'https://us-central1-signaid-prod.cloudfunctions.net/sendBookingEmail',
        '/api/booking'
      ];

      for (const url of endpoints) {
        try {
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          const ct = res.headers.get('content-type') || '';
          if (res.ok && ct.includes('application/json')) {
            response = res;
            break;
          }
        } catch (e) {
          console.warn(`[Booking Fetch Warn] ${url} failed:`, e);
        }
      }

      if (!response) {
        throw new Error("Impossible de contacter le serveur d'envoi de booking.");
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Erreur lors de l\'envoi de la demande.');
      }

      setBookingSuccess("Demande envoyée avec succès à l'artiste");
      setBookingName('');
      setBookingEmail('');
      setBookingPhone('');
      setBookingDate('');
      setBookingLocation('');
      setBookingMessage('');
    } catch (err: any) {
      console.error('Booking submission error:', err);
      setBookingError(err.message || 'Erreur réseau lors de la demande de booking.');
    } finally {
      setIsSendingBooking(false);
    }
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#050505',
        color: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1.5rem',
        fontFamily: '"Inter", system-ui, sans-serif'
      }}>
        <style>{`
          @keyframes pulseGlow {
            0%, 100% { opacity: 0.5; transform: scale(0.98); }
            50% { opacity: 1; transform: scale(1.04); }
          }
          @keyframes pulseOpacity {
            0%, 100% { opacity: 0.6; }
            50% { opacity: 0.3; }
          }
          .skeleton-box {
            background-color: rgba(255, 255, 255, 0.08);
            animation: pulseOpacity 1.5s ease-in-out infinite;
            border-radius: 12px;
          }
        `}</style>
        
        <div style={{ maxWidth: '480px', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          
          {/* Avatar Skeleton */}
          <div style={{ position: 'relative', width: '110px', height: '110px', borderRadius: '50%', marginBottom: '1.5rem', border: '3px solid rgba(255, 51, 102, 0.4)', animation: 'pulseGlow 2s infinite ease-in-out', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#111' }}>
            <span style={{ fontSize: '2rem' }}>⚡</span>
          </div>

          {/* Title & Slug Skeleton */}
          <div className="skeleton-box" style={{ width: '210px', height: '24px', marginBottom: '0.75rem', borderRadius: '8px' }} />
          <div className="skeleton-box" style={{ width: '120px', height: '14px', marginBottom: '1.5rem', borderRadius: '6px' }} />

          {/* Social Pictograms Bar Skeleton */}
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.75rem' }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="skeleton-box" style={{ width: '38px', height: '38px', borderRadius: '50%' }} />
            ))}
          </div>

          {/* Bio Box Skeleton */}
          <div className="skeleton-box" style={{ width: '100%', height: '70px', marginBottom: '2rem', borderRadius: '14px' }} />

          {/* Buttons Stack Skeleton */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', width: '100%', marginBottom: '2.5rem' }}>
            <div className="skeleton-box" style={{ width: '100%', height: '52px', borderRadius: '12px' }} />
            <div className="skeleton-box" style={{ width: '100%', height: '52px', borderRadius: '12px' }} />
            <div className="skeleton-box" style={{ width: '100%', height: '52px', borderRadius: '12px' }} />
          </div>

          {/* Status Spinner */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#ff3366', fontSize: '0.8rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⚙</span>
            <span>Chargement de la vitrine...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !artist) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0a0a0a', color: '#fff', fontFamily: 'sans-serif', padding: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#ff3366' }}>404 - Page Non Trouvée</h2>
        <p style={{ color: '#888', marginBottom: '2rem' }}>{error || "Artiste introuvable"}</p>
        <a href="/" style={{ color: '#fff', border: '1px solid #333', padding: '0.75rem 1.5rem', textDecoration: 'none', borderRadius: '4px' }}>Retour à l'accueil</a>
      </div>
    );
  }

  const getEffectiveTheme = (cfgTheme?: 'dark' | 'light' | 'auto') => {
    if (cfgTheme === 'light') return 'light';
    if (cfgTheme === 'dark') return 'dark';
    try {
      const brusselsTimeStr = new Date().toLocaleString("en-US", { timeZone: "Europe/Brussels", hour: 'numeric', hour12: false });
      const hour = parseInt(brusselsTimeStr, 10);
      const brusselsHour = isNaN(hour) ? new Date().getHours() : hour;
      return (brusselsHour >= 7 && brusselsHour < 22) ? 'light' : 'dark';
    } catch (e) {
      const hour = new Date().getHours();
      return (hour >= 7 && hour < 22) ? 'light' : 'dark';
    }
  };

  const effectiveTheme = getEffectiveTheme(artist.theme);
  const isLight = effectiveTheme === 'light';
  const pageBg = isLight ? '#f8fafc' : '#050505';
  const mainTextColor = isLight ? '#0f172a' : '#ffffff';
  const subTextColor = isLight ? '#475569' : '#c5c5c5';
  const bioBg = isLight ? '#ffffff' : 'rgba(255, 255, 255, 0.03)';
  const bioBorder = isLight ? '1px solid rgba(15, 23, 42, 0.12)' : '1px solid rgba(255, 255, 255, 0.08)';
  const headerBorder = isLight ? '1px solid #e2e8f0' : '1px solid #1a1a1a';
  const cardBg = isLight ? '#ffffff' : '#0d0d0d';
  const cardBorder = isLight ? '1px solid #cbd5e1' : '1px solid #1a1a1a';

  const getContrastingTextColor = (bgColor?: string, defaultColor?: string) => {
    const fallback = defaultColor || (isLight ? '#0f172a' : '#ffffff');
    if (!bgColor) return fallback;
    const clean = bgColor.trim().toLowerCase();
    
    if (clean === '#ffffff' || clean === '#fff' || clean === '#f8fafc' || clean === '#f1f5f9' || clean === '#e2e8f0' || clean === 'white') {
      return '#0f172a';
    }
    if (clean === '#000000' || clean === '#000' || clean === '#121212' || clean === '#050505' || clean === '#0f172a' || clean === '#18181b' || clean === 'black') {
      return '#ffffff';
    }
    if (clean.startsWith('#') && (clean.length === 7 || clean.length === 4)) {
      let hex = clean.substring(1);
      if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      const yiq = (r * 299 + g * 587 + b * 114) / 1000;
      return yiq >= 150 ? '#0f172a' : '#ffffff';
    }
    return fallback;
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: pageBg, color: mainTextColor, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', width: '100%', overflowX: 'hidden' }}>
      
      {/* STYLES RESPONSIVES MOBILE-FIRST */}
      <style>{`
        html, body {
          overflow-x: hidden !important;
          max-width: 100vw !important;
          margin: 0;
          padding: 0;
        }

        .profile-container {
          width: 100% !important;
          max-width: 100vw !important;
          box-sizing: border-box !important;
        }

        .artist-header-box {
          max-width: 540px !important;
          width: 100% !important;
          margin: 0 auto !important;
          padding: 2.5rem 1rem 1.75rem 1rem !important;
          box-sizing: border-box !important;
        }

        .artist-main-title {
          font-size: clamp(1.4rem, 6vw, 2.2rem) !important;
          word-break: break-word !important;
        }

        .linktree-btn {
          min-height: 50px !important;
          padding: 0.85rem 1.25rem !important;
          width: 100% !important;
          box-sizing: border-box !important;
        }

        .profile-main-layout {
          max-width: 1600px !important;
          width: 100% !important;
          margin: 0 auto !important;
          padding: 2rem 1.5rem 4rem 1.5rem !important;
          display: grid !important;
          grid-template-columns: 1fr !important;
          gap: 2.5rem !important;
          box-sizing: border-box !important;
        }

        @media (min-width: 900px) {
          .profile-main-layout.has-cart {
            grid-template-columns: 1fr 380px !important;
          }
        }

        .merch-responsive-grid {
          display: grid !important;
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)) !important;
          gap: 1.5rem !important;
        }

        @media (max-width: 640px) {
          .merch-responsive-grid {
            grid-template-columns: 1fr !important;
            gap: 1.25rem !important;
          }

          .mobile-cart-bar {
            display: flex !important;
          }

          .cart-aside-panel {
            position: relative !important;
            top: 0 !important;
            width: 100% !important;
          }
        }
      `}</style>
      
      {/* NOTIFICATIONS PAIEMENT */}
      {paymentSuccess && (
        <div style={{ backgroundColor: '#10b981', color: '#fff', padding: '1rem', textAlign: 'center', fontWeight: 'bold', fontSize: '0.9rem' }}>
          ✓ Paiement confirmé ! Votre commande a été transmise à l'usine d'impression.
        </div>
      )}
      {paymentCanceled && (
        <div style={{ backgroundColor: '#ef4444', color: '#fff', padding: '1rem', textAlign: 'center', fontWeight: 'bold', fontSize: '0.9rem' }}>
          ✕ Le paiement a été annulé. Aucun montant n'a été débité.
        </div>
      )}

      {/* HEADER ARTISTE - STYLE LINKTREE BIO */}
      <header className="artist-header-box" style={{ borderBottom: headerBorder, textAlign: 'center' }}>
        
        {/* AVATAR / IMAGE PROFIL */}
        <div style={{ position: 'relative', display: 'inline-block', marginBottom: '1.25rem' }}>
          <img 
            src={getOptimizedImageUrl(artist.logoUrl, 220) || '/logo.png'} 
            alt={artist.companyName} 
            width="110"
            height="110"
            loading="eager"
            decoding="async"
            {...({ fetchpriority: "high" } as any)}
            style={{ 
              width: '110px', 
              height: '110px', 
              objectFit: 'cover', 
              borderRadius: '50%', 
              border: `3px solid ${artist.accentColor || '#ff3366'}`,
              boxShadow: `0 0 25px ${artist.accentColor ? `${artist.accentColor}55` : 'rgba(255, 51, 102, 0.4)'}`,
              filter: isLight && artist.invertLogoInLightMode !== false ? 'invert(1) hue-rotate(180deg)' : 'none',
              transition: 'filter 0.3s ease'
            }} 
          />
          <span style={{ position: 'absolute', bottom: '6px', right: '6px', backgroundColor: '#38bdf8', color: '#000', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 'bold' }} title="Profil Officiel Vérifié">
            ✓
          </span>
        </div>

        {/* NOM DE L'ARTISTE & SLUG */}
        <h1 className="artist-main-title" style={{ fontWeight: '900', letterSpacing: '-0.02em', margin: '0 0 0.3rem 0', textTransform: 'uppercase', color: mainTextColor }}>
          {artist.companyName}
        </h1>
        
        <div style={{ fontSize: '0.85rem', color: artist.accentColor || '#ff3366', fontWeight: '800', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '1rem' }}>
          @{artist.slug || 'artiste'}
        </div>

        {/* BARRE DE PICTOGRAMMES POUR SUIVRE DIRECTEMENT L'ARTISTE */}
        {(() => {
          const followItems: { id: string; name: string; url: string; platform: string; color: string }[] = [];
          
          if (artist.socials && artist.socials.length > 0) {
            artist.socials.forEach((s, idx) => {
              if (s && s.platform) {
                let url = s.url ? s.url.trim() : '';
                if (!url || url === '#') {
                  if (s.platform.toLowerCase().includes('facebook')) {
                    url = 'https://www.facebook.com/djdfazz';
                  }
                }
                if (url) {
                  const fullUrl = url.startsWith('http') ? url : `https://${url}`;
                  let color = '#ffffff';
                  const p = s.platform.toLowerCase();
                  if (p.includes('instagram')) color = '#E1306C';
                  else if (p.includes('facebook')) color = '#1877F2';
                  else if (p.includes('tiktok')) color = isLight ? '#0f172a' : '#ffffff';
                  else if (p.includes('spotify')) color = '#1DB954';
                  else if (p.includes('soundcloud')) color = '#FF5500';
                  else if (p.includes('youtube')) color = '#FF0000';
                  
                  followItems.push({
                    id: `social-${idx}`,
                    name: `Suivre sur ${s.platform}`,
                    url: fullUrl,
                    platform: s.platform,
                    color
                  });
                }
              }
            });
          }

          if (!followItems.some(i => i.platform.toLowerCase().includes('facebook'))) {
            followItems.push({
              id: 'social-fb-default',
              name: 'Suivre sur Facebook',
              url: 'https://www.facebook.com/djdfazz',
              platform: 'Facebook',
              color: '#1877F2'
            });
          }

          const waNum = (artist.whatsapp || '+32488861539').replace(/\D/g, '');
          if (waNum && !followItems.some(i => i.platform.toLowerCase().includes('whatsapp'))) {
            followItems.push({
              id: 'social-wa-default',
              name: 'Rejoindre sur WhatsApp',
              url: `https://wa.me/${waNum}?text=${encodeURIComponent(`Bonjour ${artist.companyName}, je vous suis depuis votre vitrine.`)}`,
              platform: 'WhatsApp',
              color: '#25D366'
            });
          }

          if (artist.contactEmail && !followItems.some(i => i.platform.toLowerCase().includes('email'))) {
            followItems.push({
              id: 'social-email-default',
              name: 'Envoyer un Email',
              url: `mailto:${artist.contactEmail}`,
              platform: 'Contact Email',
              color: artist.accentColor || (isLight ? '#0f172a' : '#ffffff')
            });
          }

          if (followItems.length === 0) return null;

          const pictogramColor = isLight ? '#000000' : '#ffffff';

          return (
            <div 
              className="artist-follow-pictograms-bar"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexWrap: 'wrap',
                gap: '1.25rem',
                margin: '0 auto 1.5rem auto',
                padding: '0.2rem 0.5rem'
              }}
            >
              {followItems.map((item) => (
                <a
                  key={item.id}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={item.name}
                  aria-label={item.name}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0.25rem',
                    backgroundColor: 'transparent',
                    border: 'none',
                    boxShadow: 'none',
                    color: pictogramColor,
                    transition: 'transform 0.2s ease, opacity 0.2s ease',
                    cursor: 'pointer',
                    opacity: 0.9
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.22)';
                    e.currentTarget.style.opacity = '1';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.opacity = '0.9';
                  }}
                >
                  <SocialIcon platform={item.platform} color={pictogramColor} />
                </a>
              ))}
            </div>
          );
        })()}

        {/* PRÉSENTATION / BIO */}
        {artist.presentation && (
          <p style={{ 
            color: subTextColor, 
            fontSize: '0.9rem', 
            maxWidth: '580px', 
            margin: '0 auto 1.75rem auto', 
            lineHeight: '1.6', 
            backgroundColor: bioBg, 
            padding: '1rem 1.25rem', 
            borderRadius: '12px', 
            border: bioBorder 
          }}>
            {artist.presentation}
          </p>
        )}

        {/* PHOTO D'AMBIANCE / LIVE PHOTO */}
        {artist.livePhotoUrl && (
          <div style={{ marginBottom: '1.75rem', borderRadius: '14px', overflow: 'hidden', border: '1px solid rgba(255, 255, 255, 0.1)', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
            <img 
              src={artist.livePhotoUrl} 
              alt={`Ambiance ${artist.companyName}`} 
              width="600"
              height="260"
              decoding="async"
              {...({ fetchpriority: "high" } as any)}
              style={{ width: '100%', maxHeight: '260px', objectFit: 'cover' }} 
            />
          </div>
        )}

        {/* EMPILEMENT COMPLET DES LIENS & BOUTONS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', width: '100%', margin: '0 auto' }}>
          {(() => {
            const buttons: React.ReactNode[] = [];
            const customTypes = new Set<string>();
            const customUrls = new Set<string>();

            // 1. Rend tous les liens customLinks activés
            if (artist.customLinks && artist.customLinks.length > 0) {
              artist.customLinks
                .filter(link => link.enabled !== false)
                .forEach((link, idx) => {
                  if (link.type) customTypes.add(link.type.toLowerCase());
                  if (link.platform) customTypes.add(link.platform.toLowerCase());
                  if (link.title) customTypes.add(link.title.toLowerCase());
                  if (link.url) customUrls.add(link.url.toLowerCase().trim());

                  if (link.type === 'booking') {
                    const bg = link.bgColor || artist.accentColor || '#ff3366';
                    const textCl = link.textColor || getContrastingTextColor(bg, '#ffffff');
                    buttons.push(
                      <button
                        key={`custom-${link.id || idx}`}
                        type="button"
                        onClick={() => {
                          setBookingSuccess(null);
                          setBookingError(null);
                          setIsBookingModalOpen(true);
                        }}
                        className="linktree-btn"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          backgroundColor: bg,
                          border: isLight && !link.bgColor ? '1px solid rgba(15, 23, 42, 0.15)' : 'none',
                          color: textCl,
                          borderRadius: '12px',
                          fontSize: '0.98rem',
                          fontWeight: '900',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          cursor: 'pointer',
                          boxShadow: `0 6px 20px ${link.bgColor ? `${link.bgColor}44` : artist.accentColor ? `${artist.accentColor}44` : 'rgba(255, 51, 102, 0.35)'}`,
                          transition: 'all 0.2s ease-in-out'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                          <span style={{ fontSize: '1.2rem' }}>{link.icon || '📅'}</span>
                          <span>{link.title || 'Booking / Événement'}</span>
                        </div>
                        <span style={{ fontSize: '1rem', fontWeight: 'bold' }}>➔</span>
                      </button>
                    );
                  } else if (link.type === 'whatsapp') {
                    const waNum = (link.url || artist.whatsapp || '+32488861539').replace(/\D/g, '');
                    const bg = link.bgColor || '#25D366';
                    const textCl = link.textColor || getContrastingTextColor(bg, '#ffffff');
                    buttons.push(
                      <a
                        key={`custom-${link.id || idx}`}
                        href={`https://wa.me/${waNum}?text=${encodeURIComponent(`Bonjour ${artist.companyName}, je vous contacte depuis votre vitrine.`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="linktree-btn"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          backgroundColor: bg,
                          color: textCl,
                          borderRadius: '12px',
                          fontSize: '0.95rem',
                          fontWeight: '800',
                          textDecoration: 'none',
                          boxShadow: '0 4px 15px rgba(37, 211, 102, 0.3)'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                          <SocialIcon platform="WhatsApp" color={textCl} />
                          <span>{link.title || 'WhatsApp Direct'}</span>
                        </div>
                        <span style={{ fontSize: '1rem', fontWeight: 'bold' }}>💬</span>
                      </a>
                    );
                  } else if (link.type === 'email') {
                    const defaultBg = isLight ? '#ffffff' : '#121212';
                    const bg = link.bgColor || defaultBg;
                    const textCl = link.textColor || getContrastingTextColor(bg, isLight ? '#0f172a' : '#ffffff');
                    const borderCl = isLight ? '1px solid rgba(15, 23, 42, 0.15)' : '1px solid rgba(255, 255, 255, 0.12)';
                    buttons.push(
                      <a
                        key={`custom-${link.id || idx}`}
                        href={`mailto:${link.url || artist.contactEmail}?subject=Contact depuis la vitrine ${encodeURIComponent(artist.companyName)}`}
                        className="linktree-btn"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          backgroundColor: bg,
                          border: borderCl,
                          color: textCl,
                          borderRadius: '12px',
                          fontSize: '0.95rem',
                          fontWeight: '700',
                          textDecoration: 'none',
                          boxShadow: isLight ? '0 4px 12px rgba(0,0,0,0.05)' : '0 4px 15px rgba(0, 0, 0, 0.3)',
                          transition: 'all 0.2s ease-in-out'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                          <SocialIcon platform="Contact Email" color={textCl} />
                          <span>{link.title || 'Contact Direct'}</span>
                        </div>
                        <span style={{ fontSize: '1rem', color: textCl, fontWeight: 'bold' }}>✉</span>
                      </a>
                    );
                  } else {
                    const targetUrl = link.url ? (link.url.startsWith('http') ? link.url : `https://${link.url}`) : '#';
                    const defaultBg = isLight ? '#ffffff' : '#121212';
                    const bg = link.bgColor || defaultBg;
                    const textCl = link.textColor || getContrastingTextColor(bg, isLight ? '#0f172a' : '#ffffff');
                    const borderCl = isLight ? '1px solid rgba(15, 23, 42, 0.15)' : `1px solid ${artist.accentColor ? `${artist.accentColor}35` : 'rgba(255, 255, 255, 0.12)'}`;

                    buttons.push(
                      <a
                        key={`custom-${link.id || idx}`}
                        href={targetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="linktree-btn"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          backgroundColor: bg,
                          border: borderCl,
                          color: textCl,
                          borderRadius: '12px',
                          fontSize: '0.95rem',
                          fontWeight: '700',
                          textDecoration: 'none',
                          boxShadow: isLight ? '0 4px 12px rgba(0,0,0,0.05)' : '0 4px 15px rgba(0, 0, 0, 0.3)',
                          transition: 'all 0.2s ease-in-out'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                          {link.platform ? (
                            <SocialIcon platform={link.platform} color={textCl} />
                          ) : (
                            <span style={{ fontSize: '1.2rem' }}>{link.icon || '🔗'}</span>
                          )}
                          <span>{link.title}</span>
                        </div>
                        <span style={{ fontSize: '1rem', color: textCl, fontWeight: 'bold' }}>↗</span>
                      </a>
                    );
                  }
                });
            }

            // 2. Bouton Booking par défaut si non présent dans customLinks
            const hasBookingCustom = Array.from(customTypes).some(t => t.includes('booking'));
            if (!hasBookingCustom) {
              buttons.push(
                <button
                  key="std-booking"
                  type="button"
                  onClick={() => {
                    setBookingSuccess(null);
                    setBookingError(null);
                    setIsBookingModalOpen(true);
                  }}
                  className="linktree-btn"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: artist.accentColor || '#ff3366',
                    border: 'none',
                    color: getContrastingTextColor(artist.accentColor || '#ff3366', '#ffffff'),
                    borderRadius: '12px',
                    fontSize: '0.98rem',
                    fontWeight: '900',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    cursor: 'pointer',
                    boxShadow: `0 6px 20px ${artist.accentColor ? `${artist.accentColor}66` : 'rgba(255, 51, 102, 0.45)'}`,
                    transition: 'all 0.2s ease-in-out'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                    <span style={{ fontSize: '1.2rem' }}>📅</span>
                    <span>Booking / Événement</span>
                  </div>
                  <span style={{ fontSize: '1rem', fontWeight: 'bold' }}>➔</span>
                </button>
              );
            }

            // 3. Bouton WhatsApp Direct par défaut si non présent dans customLinks
            const hasWhatsappCustom = Array.from(customTypes).some(t => t.includes('whatsapp'));
            const waNum = (artist.whatsapp || '+32488861539').replace(/\D/g, '');
            if (!hasWhatsappCustom && waNum) {
              buttons.push(
                <a
                  key="std-whatsapp"
                  href={`https://wa.me/${waNum}?text=${encodeURIComponent(`Bonjour ${artist.companyName}, je vous contacte depuis votre vitrine.`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="linktree-btn"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: '#25D366',
                    color: '#ffffff',
                    borderRadius: '12px',
                    fontSize: '0.95rem',
                    fontWeight: '800',
                    textDecoration: 'none',
                    boxShadow: '0 4px 15px rgba(37, 211, 102, 0.3)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                    <SocialIcon platform="WhatsApp" color="#ffffff" />
                    <span>WhatsApp Direct</span>
                  </div>
                  <span style={{ fontSize: '1rem', fontWeight: 'bold' }}>💬</span>
                </a>
              );
            }

            // 4. Boutons Réseaux Sociaux (Instagram, TikTok, Facebook...) si non présents dans customLinks
            if (artist.socials && artist.socials.length > 0) {
              artist.socials
                .filter(s => s && ((s.url && s.url.trim() !== '' && s.url !== '#') || s.platform.toLowerCase().includes('facebook')))
                .forEach((s, idx) => {
                  let rawUrl = s.url;
                  if (!rawUrl || rawUrl.trim() === '' || rawUrl === '#') {
                    if (s.platform.toLowerCase().includes('facebook')) {
                      rawUrl = 'https://www.facebook.com/djdfazz';
                    }
                  }
                  const targetUrl = rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`;
                  const isDup = customUrls.has(targetUrl.toLowerCase().trim()) || Array.from(customTypes).some(t => t.includes(s.platform.toLowerCase()));
                  if (!isDup) {
                    const defaultBg = isLight ? '#ffffff' : '#121212';
                    const textCl = isLight ? '#0f172a' : '#ffffff';
                    const borderCl = isLight ? '1px solid rgba(15, 23, 42, 0.15)' : `1px solid ${artist.accentColor ? `${artist.accentColor}35` : 'rgba(255, 255, 255, 0.12)'}`;

                    buttons.push(
                      <a
                        key={`std-social-${idx}`}
                        href={targetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="linktree-btn"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          backgroundColor: defaultBg,
                          border: borderCl,
                          color: textCl,
                          borderRadius: '12px',
                          fontSize: '0.95rem',
                          fontWeight: '700',
                          textDecoration: 'none',
                          boxShadow: isLight ? '0 4px 12px rgba(0,0,0,0.05)' : '0 4px 15px rgba(0, 0, 0, 0.3)',
                          transition: 'all 0.2s ease-in-out'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                          <SocialIcon platform={s.platform} color={s.platform.toLowerCase().includes('facebook') ? '#1877F2' : (artist.accentColor || textCl)} />
                          <span>{s.platform}</span>
                        </div>
                        <span style={{ fontSize: '1rem', color: artist.accentColor || textCl, fontWeight: 'bold' }}>↗</span>
                      </a>
                    );
                  }
                });
            }



            // 5. Bouton Contact Email par défaut si non présent dans customLinks
            const hasEmailCustom = Array.from(customTypes).some(t => t.includes('email') || t.includes('contact'));
            if (!hasEmailCustom && artist.contactEmail) {
              buttons.push(
                <a
                  key="std-email"
                  href={`mailto:${artist.contactEmail}?subject=Contact depuis la vitrine ${encodeURIComponent(artist.companyName)}`}
                  className="linktree-btn"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: isLight ? '#ffffff' : '#121212',
                    border: isLight ? '1px solid rgba(15, 23, 42, 0.15)' : '1px solid rgba(255, 255, 255, 0.12)',
                    color: isLight ? '#0f172a' : '#ffffff',
                    borderRadius: '12px',
                    fontSize: '0.95rem',
                    fontWeight: '700',
                    textDecoration: 'none',
                    boxShadow: isLight ? '0 4px 12px rgba(0,0,0,0.05)' : '0 4px 15px rgba(0, 0, 0, 0.3)',
                    transition: 'all 0.2s ease-in-out'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                    <SocialIcon platform="Contact Email" color={isLight ? '#0f172a' : '#ffffff'} />
                    <span>Contact Direct</span>
                  </div>
                  <span style={{ fontSize: '1rem', color: isLight ? '#0f172a' : '#ffffff', fontWeight: 'bold' }}>✉</span>
                </a>
              );
            }

            return buttons;
          })()}
        </div>
      </header>

      {/* GRILLE SHOP & PANIER RESPONSIVES */}
      <main className={`profile-main-layout ${cart.length > 0 ? 'has-cart' : ''}`}>
        
        {/* PRODUCTIONS / BOUTIQUE */}
        <section>
          <h2 style={{ fontSize: '1rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#666', marginBottom: '1.25rem' }}>
            Merch & Collections Officielle ({products.length})
          </h2>

          <div className="merch-responsive-grid">
            {products.map(prod => (
              <ProductCard key={prod.id} product={prod} onAddToCart={addToCart} accentColor={artist.accentColor} isLightMode={isLight} artistLogo={artist.logoUrl} />
            ))}
          </div>
        </section>

        {/* SECTION PANIER & FORMULAIRE PAIEMENT */}
        {cart.length > 0 && (
          <aside id="cart-aside-section" className="cart-aside-panel" style={{ backgroundColor: isLight ? '#ffffff' : '#111', border: isLight ? '1px solid #cbd5e1' : '1px solid #222', padding: '1.25rem', borderRadius: '12px', height: 'fit-content', position: 'sticky', top: '1.5rem', boxShadow: isLight ? '0 10px 30px rgba(0,0,0,0.06)' : '0 10px 30px rgba(0,0,0,0.5)' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: '800', textTransform: 'uppercase', margin: '0 0 1rem 0', borderBottom: isLight ? '1px solid #e2e8f0' : '1px solid #222', paddingBottom: '0.65rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: mainTextColor }}>
              <span>Panier ({cart.reduce((s, i) => s + i.quantity, 0)})</span>
              <span style={{ fontSize: '0.75rem', color: subTextColor, fontWeight: 'normal' }}>Livraison Garantie</span>
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '1.25rem', maxHeight: '220px', overflowY: 'auto' }}>
              {cart.map(item => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', backgroundColor: isLight ? '#f1f5f9' : '#161616', padding: '0.6rem 0.75rem', borderRadius: '6px' }}>
                  <div>
                    <div style={{ fontWeight: 'bold', color: mainTextColor }}>{item.name}</div>
                    <div style={{ color: subTextColor, fontSize: '0.75rem' }}>Taille: {item.size} | Qte: {item.quantity}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontWeight: '700', color: artist.accentColor || '#ff3366' }}>{(item.price * item.quantity).toFixed(2)} €</span>
                    <button 
                      onClick={() => removeFromCart(item.id)} 
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1.1rem', padding: '0 0.2rem' }}
                      title="Supprimer"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ borderTop: '1px solid #222', paddingTop: '0.85rem', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.15rem', fontWeight: '900' }}>
                <span>TOTAL</span>
                <span style={{ color: artist.accentColor || '#ff3366' }}>{cartTotal.toFixed(2)} €</span>
              </div>
            </div>

            {/* FORMULAIRE COORDONNÉES ET LIVRAISON CLIENT */}
            <form onSubmit={handleCheckout} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', color: '#888', borderBottom: '1px solid #222', paddingBottom: '0.35rem', marginBottom: '0.25rem' }}>
                Coordonnées & Livraison
              </div>

              <div>
                <input 
                  type="text"
                  required
                  placeholder="Nom complet *"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <input 
                  type="email"
                  required
                  placeholder="Email *"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  style={inputStyle}
                />
                <input 
                  type="tel"
                  placeholder="Téléphone"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div>
                <input 
                  type="text"
                  required
                  placeholder="Adresse de livraison (Rue, N°) *"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <input 
                  type="text"
                  required
                  placeholder="Code Postal *"
                  value={customerZip}
                  onChange={(e) => setCustomerZip(e.target.value)}
                  style={inputStyle}
                />
                <input 
                  type="text"
                  required
                  placeholder="Ville *"
                  value={customerCity}
                  onChange={(e) => setCustomerCity(e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div>
                <input 
                  type="text"
                  placeholder="Note de livraison (Étage, digicode...)"
                  value={customerNotes}
                  onChange={(e) => setCustomerNotes(e.target.value)}
                  style={inputStyle}
                />
              </div>

              {checkoutError && (
                <p style={{ color: '#ef4444', fontSize: '0.8rem', margin: '0.25rem 0' }}>{checkoutError}</p>
              )}

              {/* BOUTON PAIEMENT STRIPE */}
              <button
                type="submit"
                disabled={isCheckingOut}
                style={{
                  width: '100%',
                  backgroundColor: artist.accentColor || '#ff3366',
                  color: '#fff',
                  border: 'none',
                  padding: '1rem',
                  fontWeight: '900',
                  fontSize: '0.85rem',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  borderRadius: '6px',
                  cursor: isCheckingOut ? 'not-allowed' : 'pointer',
                  opacity: isCheckingOut ? 0.6 : 1,
                  marginTop: '0.5rem',
                  boxShadow: `0 4px 15px ${artist.accentColor ? `${artist.accentColor}55` : 'rgba(255, 51, 102, 0.4)'}`
                }}
              >
                {isCheckingOut ? 'Redirection vers la caisse...' : `Payer ${cartTotal.toFixed(2)} € (Carte / Bancontact)`}
              </button>
            </form>
          </aside>
        )}
      </main>

      {/* STICKY BOTTOM BAR SMARTPHONE (ACCÈS RAPIDE AU PANIER) */}
      {cart.length > 0 && (
        <div 
          className="mobile-cart-bar"
          style={{
            display: 'none',
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: '#121212',
            borderTop: `2px solid ${artist.accentColor || '#ff3366'}`,
            padding: '0.8rem 1.25rem',
            zIndex: 999,
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 -10px 25px rgba(0,0,0,0.85)'
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.75rem', color: '#aaa', fontWeight: '700', textTransform: 'uppercase' }}>
              Panier ({cart.reduce((s, i) => s + i.quantity, 0)} article{cart.reduce((s, i) => s + i.quantity, 0) > 1 ? 's' : ''})
            </span>
            <span style={{ fontSize: '1.1rem', fontWeight: '900', color: '#ffffff' }}>
              {cartTotal.toFixed(2)} €
            </span>
          </div>
          <button
            onClick={() => {
              const cartEl = document.getElementById('cart-aside-section');
              if (cartEl) cartEl.scrollIntoView({ behavior: 'smooth' });
            }}
            style={{
              backgroundColor: artist.accentColor || '#ff3366',
              color: '#ffffff',
              border: 'none',
              padding: '0.7rem 1.25rem',
              borderRadius: '100px',
              fontWeight: '900',
              fontSize: '0.8rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              cursor: 'pointer',
              boxShadow: `0 4px 15px ${artist.accentColor ? `${artist.accentColor}66` : 'rgba(255, 51, 102, 0.4)'}`
            }}
          >
            Valider ➔
          </button>
        </div>
      )}

      {/* FOOTER - LIEN CRÉATION PROFIL & INFRASTRUCTURE */}
      <footer style={{ 
        borderTop: '1px solid #1a1a1a', 
        padding: '3rem 1.5rem', 
        textAlign: 'center', 
        backgroundColor: '#030303', 
        marginTop: '4rem' 
      }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.8rem' }}>
          <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.15em', color: '#666', fontWeight: '700' }}>
            ⚡ PROPULSÉ PAR SIGNAID
          </span>
          <p style={{ fontSize: '0.88rem', color: '#aaa', margin: 0, lineHeight: 1.5 }}>
            Vous êtes artiste, créateur ou DJ ? Créez votre profil officiel & votre boutique de merch sans aucun stock.
          </p>
          <a
            href="/?showcase=true"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#ffffff',
              padding: '0.75rem 1.5rem',
              borderRadius: '100px',
              fontSize: '0.8rem',
              fontWeight: '800',
              textDecoration: 'none',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              transition: 'all 0.3s ease',
              marginTop: '0.4rem'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = artist.accentColor || '#ff3366';
              e.currentTarget.style.borderColor = artist.accentColor || '#ff3366';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <span>Créer mon Profil & Boutique</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </a>
        </div>
      </footer>

      {/* MODALE FORMULAIRE DE BOOKING & GÉNÉRATION DE LEADS */}
      {isBookingModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: '#111111',
            border: `1.5px solid ${artist.accentColor || '#ff3366'}`,
            borderRadius: '16px',
            maxWidth: '520px',
            width: '100%',
            padding: '1.75rem',
            boxShadow: `0 20px 50px ${artist.accentColor ? `${artist.accentColor}44` : 'rgba(255, 51, 102, 0.35)'}`,
            position: 'relative',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #222', paddingBottom: '0.85rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '900', textTransform: 'uppercase', color: '#fff' }}>
                  Booking — {artist.companyName}
                </h3>
                <span style={{ fontSize: '0.78rem', color: '#aaa' }}>Demande de prestation & d'événement</span>
              </div>
              <button
                type="button"
                onClick={() => setIsBookingModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#888', fontSize: '1.5rem', cursor: 'pointer', padding: '0 0.5rem' }}
              >
                ✕
              </button>
            </div>

            {bookingSuccess ? (
              <div style={{ textAlign: 'center', padding: '1.5rem 1rem' }}>
                <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🎉</div>
                <h4 style={{ color: '#10b981', fontSize: '1.2rem', margin: '0 0 0.5rem 0', fontWeight: '900' }}>
                  {bookingSuccess}
                </h4>
                <p style={{ color: '#ccc', fontSize: '0.88rem', lineHeight: '1.5', marginBottom: '1.5rem' }}>
                  Votre demande d'événement a bien été enregistrée et transmise directement au management de <strong>{artist.companyName}</strong>.
                </p>
                <button
                  type="button"
                  onClick={() => setIsBookingModalOpen(false)}
                  style={{
                    backgroundColor: artist.accentColor || '#ff3366',
                    color: '#fff',
                    border: 'none',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '8px',
                    fontWeight: '900',
                    cursor: 'pointer'
                  }}
                >
                  Fermer
                </button>
              </div>
            ) : (
              <form onSubmit={handleBookingSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', color: '#888', marginBottom: '0.35rem' }}>
                    Nom / Organisation / Promoteur *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Club Le Titan, Jean Dupont..."
                    value={bookingName}
                    onChange={(e) => setBookingName(e.target.value)}
                    style={inputStyle}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', color: '#888', marginBottom: '0.35rem' }}>
                      Email *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="contact@club.com"
                      value={bookingEmail}
                      onChange={(e) => setBookingEmail(e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', color: '#888', marginBottom: '0.35rem' }}>
                      Téléphone
                    </label>
                    <input
                      type="tel"
                      placeholder="+33 6 12 34 56 78"
                      value={bookingPhone}
                      onChange={(e) => setBookingPhone(e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', color: '#888', marginBottom: '0.35rem' }}>
                      Date Souhaitée *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: 15 Octobre 2026"
                      value={bookingDate}
                      onChange={(e) => setBookingDate(e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', color: '#888', marginBottom: '0.35rem' }}>
                      Lieu / Ville / Club *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: L'Aéronef, Lille"
                      value={bookingLocation}
                      onChange={(e) => setBookingLocation(e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', color: '#888', marginBottom: '0.35rem' }}>
                    Message / Détails de l'événement
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Horaire estimé, type de soirée, budget prévisionnel..."
                    value={bookingMessage}
                    onChange={(e) => setBookingMessage(e.target.value)}
                    style={{ ...inputStyle, resize: 'vertical' }}
                  />
                </div>

                {bookingError && (
                  <div style={{ color: '#ef4444', fontSize: '0.8rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '0.5rem', borderRadius: '4px' }}>
                    {bookingError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSendingBooking}
                  style={{
                    width: '100%',
                    backgroundColor: artist.accentColor || '#ff3366',
                    color: '#ffffff',
                    border: 'none',
                    padding: '0.95rem',
                    fontWeight: '900',
                    fontSize: '0.85rem',
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    borderRadius: '6px',
                    cursor: isSendingBooking ? 'not-allowed' : 'pointer',
                    opacity: isSendingBooking ? 0.6 : 1,
                    marginTop: '0.5rem',
                    boxShadow: `0 4px 15px ${artist.accentColor ? `${artist.accentColor}55` : 'rgba(255, 51, 102, 0.4)'}`
                  }}
                >
                  {isSendingBooking ? 'Transmission en cours...' : 'Envoyer la demande ➔'}
                </button>

                {artist.whatsapp && (
                  <div style={{ textAlign: 'center', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid #222' }}>
                    <span style={{ fontSize: '0.75rem', color: '#888', display: 'block', marginBottom: '0.35rem' }}>Ou préférez-vous échanger en direct ?</span>
                    <a
                      href={`https://wa.me/${artist.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Bonjour ${artist.companyName}, je souhaite réserver une date.`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#25D366', fontSize: '0.82rem', fontWeight: 'bold', textDecoration: 'none' }}
                    >
                      💬 Contacter via WhatsApp Direct
                    </a>
                  </div>
                )}
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  backgroundColor: '#1a1a1a',
  border: '1px solid #333',
  color: '#fff',
  padding: '0.55rem 0.75rem',
  fontSize: '0.8rem',
  borderRadius: '4px',
  outline: 'none',
  boxSizing: 'border-box'
};

const STUDIO_PLACEMENTS: Record<string, { front: { bg: string; x: string; y: string; w: string }; back: { bg: string; x: string; y: string; w: string } }> = {
  tshirt: {
    front: { bg: '/assets/models/male_tshirt_front.png', x: '64%', y: '32%', w: '18%' },
    back: { bg: '/assets/models/male_tshirt_back.png', x: '50%', y: '38%', w: '32%' }
  },
  polo: {
    front: { bg: '/assets/models/male_polo_front.png', x: '64%', y: '32%', w: '16%' },
    back: { bg: '/assets/models/male_polo_back.png', x: '50%', y: '38%', w: '32%' }
  },
  sweat: {
    front: { bg: '/assets/models/male_hoodie_front.png', x: '64%', y: '38%', w: '18%' },
    back: { bg: '/assets/models/male_hoodie_back.png', x: '50%', y: '46%', w: '32%' }
  },
  hoodie: {
    front: { bg: '/assets/models/male_hoodie_front.png', x: '64%', y: '38%', w: '18%' },
    back: { bg: '/assets/models/male_hoodie_back.png', x: '50%', y: '46%', w: '32%' }
  }
};

// Composant Carte Produit
function ProductCard({ product, onAddToCart, accentColor, isLightMode, artistLogo }: { product: ProductItem; onAddToCart: (p: ProductItem, size: string, color: string) => void; accentColor?: string; isLightMode?: boolean; artistLogo?: string }) {
  const [selectedSize, setSelectedSize] = useState(product.sizes?.[0] || 'L');
  const [selectedColor, setSelectedColor] = useState(product.colors?.[0] || 'Noir');
  const [currentView, setCurrentView] = useState<'front' | 'back'>('front');

  const garmentKey = (product.garment || product.category || 'tshirt').toLowerCase();
  const studioConfig = STUDIO_PLACEMENTS[garmentKey] || STUDIO_PLACEMENTS['tshirt'];

  const hasBackImage = Boolean(
    (product.backImageUrl && product.backImageUrl.trim() !== '' && product.backImageUrl.trim() !== '""' && product.backImageUrl !== product.frontImageUrl) ||
    studioConfig.back?.bg
  );

  const activeView = hasBackImage ? currentView : 'front';
  const rawActiveUrl = (activeView === 'back' && product.backImageUrl) ? product.backImageUrl : (product.frontImageUrl || product.imageUrl);
  const activeImageUrl = getOptimizedImageUrl(rawActiveUrl, 400);

  const isLogoOnly = !activeImageUrl || activeImageUrl === artistLogo || activeImageUrl.includes('logo_');
  const viewStudio = studioConfig[activeView] || studioConfig.front;
  const logoToOverlay = artistLogo || (isLogoOnly ? activeImageUrl : '') || '/logo.png';

  return (
    <div style={{ backgroundColor: isLightMode ? '#ffffff' : '#0d0d0d', border: isLightMode ? '1px solid #cbd5e1' : '1px solid #1a1a1a', borderRadius: '8px', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: isLightMode ? '0 4px 15px rgba(0,0,0,0.05)' : 'none' }}>
      <div style={{ height: '210px', backgroundColor: isLightMode ? '#f1f5f9' : '#141414', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.5rem', position: 'relative', overflow: 'hidden' }}>
        
        {/* SELECTEUR VUE FACE / DOS */}
        {hasBackImage && (
          <div style={{ position: 'absolute', top: '0.6rem', right: '0.6rem', display: 'flex', gap: '0.25rem', backgroundColor: 'rgba(0,0,0,0.7)', padding: '0.2rem 0.3rem', borderRadius: '4px', zIndex: 5, border: '1px solid rgba(255,255,255,0.1)' }}>
            <button
              type="button"
              onClick={() => setCurrentView('front')}
              style={{
                backgroundColor: activeView === 'front' ? (accentColor || '#ff3366') : 'transparent',
                color: '#fff',
                border: 'none',
                padding: '0.2rem 0.45rem',
                fontSize: '0.65rem',
                fontWeight: '900',
                borderRadius: '3px',
                cursor: 'pointer'
              }}
            >
              FACE
            </button>
            <button
              type="button"
              onClick={() => setCurrentView('back')}
              style={{
                backgroundColor: activeView === 'back' ? (accentColor || '#ff3366') : 'transparent',
                color: '#fff',
                border: 'none',
                padding: '0.2rem 0.45rem',
                fontSize: '0.65rem',
                fontWeight: '900',
                borderRadius: '3px',
                cursor: 'pointer'
              }}
            >
              DOS
            </button>
          </div>
        )}

        {isLogoOnly ? (
          <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img 
              src={viewStudio.bg} 
              alt={product.name} 
              style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} 
            />
            {logoToOverlay && (
              <img 
                src={logoToOverlay} 
                alt="Logo Studio" 
                style={{
                  position: 'absolute',
                  top: viewStudio.y,
                  left: viewStudio.x,
                  width: viewStudio.w,
                  transform: 'translate(-50%, -50%)',
                  objectFit: 'contain',
                  filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.5))'
                }}
              />
            )}
          </div>
        ) : activeImageUrl ? (
          <img 
            src={activeImageUrl} 
            alt={product.name} 
            width="312"
            height="312"
            loading="lazy"
            decoding="async"
            style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain', transition: 'all 0.3s ease' }} 
          />
        ) : (
          <div style={{ color: isLightMode ? '#94a3b8' : '#444', fontSize: '0.8rem' }}>Visuel Merch</div>
        )}
      </div>

      <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: '700', margin: '0 0 0.5rem 0', color: isLightMode ? '#0f172a' : '#fff' }}>{product.name}</h3>
        <div style={{ fontSize: '1.1rem', fontWeight: '900', color: accentColor || '#ff3366', marginBottom: '1rem' }}>
          {product.price.toFixed(2)} €
        </div>

        {/* SELECTEUR TAILLE */}
        {product.sizes && product.sizes.length > 0 && (
          <div style={{ marginBottom: '1rem' }}>
            <span style={{ fontSize: '0.7rem', color: isLightMode ? '#64748b' : '#666', textTransform: 'uppercase', display: 'block', marginBottom: '0.35rem' }}>Taille</span>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {product.sizes.map(size => (
                <button
                  key={size}
                  onClick={() => setSelectedSize(size)}
                  style={{
                    backgroundColor: selectedSize === size ? (accentColor || '#ff3366') : (isLightMode ? '#f1f5f9' : '#181818'),
                    color: selectedSize === size ? '#fff' : (isLightMode ? '#475569' : '#aaa'),
                    border: isLightMode ? '1px solid #cbd5e1' : '1px solid #282828',
                    borderRadius: '3px',
                    padding: '0.25rem 0.5rem',
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={() => onAddToCart(product, selectedSize, selectedColor)}
          style={{
            marginTop: 'auto',
            width: '100%',
            backgroundColor: isLightMode ? '#0f172a' : '#ffffff',
            color: isLightMode ? '#ffffff' : '#000000',
            border: 'none',
            padding: '0.65rem',
            fontWeight: '800',
            fontSize: '0.75rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          + Ajouter au Panier
        </button>
      </div>
    </div>
  );
}
