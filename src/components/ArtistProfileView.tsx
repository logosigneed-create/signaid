import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';
import AdminQuickBar from './AdminQuickBar';
import { processLogoImage } from '../utils/logoProcessor';
import MerchCarousel, { VISION_ROOM_MERCH_COLLECTION, VISION_ROOM_BASIC_TANK, VISION_ROOM_HEAVYWEIGHT_TEE } from './MerchCarousel';
import { SEED_PROFILES } from '../lib/localProfiles';

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
  activitySector?: string;
  slug: string;
  logoUrl?: string;
  logoAdaptedUrl?: string;
  logoA?: string;
  logoB?: string;
  auditLogoUrl?: string;
  logoPlacements?: Record<string, 'A' | 'B'>;
  livePhotoUrl?: string;
  livePhotoUrls?: string[];
  presentation?: string;
  photoDescription?: string;
  contactEmail?: string;
  whatsapp?: string;
  socials?: { platform: string; url: string; enabled?: boolean }[];
  customLinks?: ProfileLink[];
  accentColor?: string;
  theme?: 'dark' | 'light' | 'auto';
  totalSales?: number;
  revenue?: number;
  ordersCount?: number;
  invertLogoInLightMode?: boolean;
  logoOverlayColor?: 'auto' | 'white' | 'black' | 'original';
  logoScale?: number;
  coverHeight?: number;
  coverZoom?: number;
  coverPositionY?: number;
  coverPositionX?: number;
  enableLiveWidget?: boolean;
  liveWidgetStatus?: string;
}

export const getEffectiveTheme = (cfgTheme?: 'dark' | 'light' | 'auto' | string): 'dark' | 'light' => {
  if (cfgTheme === 'light') return 'light';
  if (cfgTheme === 'dark') return 'dark';
  try {
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Paris',
      hour: '2-digit',
      hour12: false
    });
    const parts = formatter.formatToParts(new Date());
    const hourPart = parts.find(p => p.type === 'hour');
    const hour = hourPart ? parseInt(hourPart.value, 10) : new Date().getHours();
    // Mode Jour: 07h00 à 21h59. Mode Nuit: 22h00 à 06h59
    return (hour >= 7 && hour < 22) ? 'light' : 'dark';
  } catch (e) {
    const hour = new Date().getHours();
    return (hour >= 7 && hour < 22) ? 'light' : 'dark';
  }
};

export interface ProductItem {
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
  images?: Record<string, string>;
  description?: string;
  sizes?: string[];
  colors?: string[];
  color?: string;
  category?: string;
  garment?: string;
  mechanical?: string | null;
  base?: string | null;
  isAvailable?: boolean;
}

export const isBackViewUrl = (u?: string | null) => {
  if (!u || typeof u !== 'string') return false;
  const l = u.toLowerCase();
  if (l.includes('front') || l.includes('face') || l.includes('recto') || l.includes('tfront') || l.includes('pfront') || l.includes('hfront') || l.includes('tankfront') || l.includes('heavyfront') || l.includes('heavywhitefront')) return false;
  return /(back|dos|verso|tback|pback|hback|tankback|heavyback|heavywhiteback)/i.test(l);
};

export const isAiRenderUrl = (u?: string | null) => {
  if (!u || typeof u !== 'string') return false;
  const l = u.toLowerCase();
  if (l.includes('jhk') || l.includes('bybb011.png') || l.includes('nx7200.png') || l.includes('card-base') || l.includes('neutral') || l.includes('snapshot')) return false;
  return l.includes('_ai_') || l.includes('/ai/') || l.includes('studio') || l.includes('pfront_ai') || l.includes('tankfront_ai') || l.includes('heavyfront_ai') || l.includes('heavywhitefront_ai') || l.includes('tankwhitefront_ai') || l.includes('firebasestorage') || l.includes('btp_mockups');
};

export const VISION_CLOUD_MOCKUPS = [
  { id: 'tFront', garment: 'tshirt', color: 'Noir', view: 'front', url: 'https://firebasestorage.googleapis.com/v0/b/signaid-d2d08.firebasestorage.app/o/btp_mockups%2Fclubvisionroom%2Fweb%2FtFront_1788693827681.png?alt=media&token=351044ba-98e5-4139-b194-e182b80fb846' },
  { id: 'tBack', garment: 'tshirt', color: 'Noir', view: 'back', url: 'https://firebasestorage.googleapis.com/v0/b/signaid-d2d08.firebasestorage.app/o/btp_mockups%2Fclubvisionroom%2Fweb%2FtBack_1788693827685.png?alt=media&token=43c3717a-2294-4098-9b61-24dfb79df8c0' },
  { id: 'pFront', garment: 'polo', color: 'Noir', view: 'front', url: 'https://firebasestorage.googleapis.com/v0/b/signaid-d2d08.firebasestorage.app/o/btp_mockups%2Fclubvisionroom%2Fweb%2FpFront_1788693827686.png?alt=media&token=c94713f8-4ca2-4cdb-b959-82d5ae6d2c4b' },
  { id: 'pBack', garment: 'polo', color: 'Noir', view: 'back', url: 'https://firebasestorage.googleapis.com/v0/b/signaid-d2d08.firebasestorage.app/o/btp_mockups%2Fclubvisionroom%2Fweb%2FpBack_1788693827687.png?alt=media&token=cdc6ba8f-418a-4ea7-9629-523e3f607012' },
  { id: 'hFront', garment: 'sweat', color: 'Noir', view: 'front', url: 'https://firebasestorage.googleapis.com/v0/b/signaid-d2d08.firebasestorage.app/o/btp_mockups%2Fclubvisionroom%2Fweb%2FhFront_1788693827689.png?alt=media&token=f1affb8b-0f66-4f8e-899b-b1da4c825f8c' },
  { id: 'hBack', garment: 'sweat', color: 'Noir', view: 'back', url: 'https://firebasestorage.googleapis.com/v0/b/signaid-d2d08.firebasestorage.app/o/btp_mockups%2Fclubvisionroom%2Fweb%2FhBack_1788693827690.png?alt=media&token=ee00ba8d-0a66-45c6-856c-fe6a4b122320' },
  { id: 'tankFront', garment: 'tank_top', color: 'Noir', view: 'front', url: 'https://firebasestorage.googleapis.com/v0/b/signaid-d2d08.firebasestorage.app/o/btp_mockups%2Fclubvisionroom%2Fweb%2FtankFront_1788698451810.png?alt=media&token=32465cf4-7a0c-48aa-a010-08c999a7d0d1' },
  { id: 'tankBack', garment: 'tank_top', color: 'Noir', view: 'back', url: 'https://firebasestorage.googleapis.com/v0/b/signaid-d2d08.firebasestorage.app/o/btp_mockups%2Fclubvisionroom%2Fweb%2FtankBack_1788693827691.png?alt=media&token=042abb56-7970-4a26-92dc-2de88698e7a6' },
  { id: 'heavyFront', garment: 'tshirt_oversize', color: 'Noir', view: 'front', url: 'https://firebasestorage.googleapis.com/v0/b/signaid-d2d08.firebasestorage.app/o/btp_mockups%2Fclubvisionroom%2Fweb%2FheavyFront_1788693827695.png?alt=media&token=65d0698f-0070-4fc8-a827-0861153b2113' },
  { id: 'heavyBack', garment: 'tshirt_oversize', color: 'Noir', view: 'back', url: 'https://firebasestorage.googleapis.com/v0/b/signaid-d2d08.firebasestorage.app/o/btp_mockups%2Fclubvisionroom%2Fweb%2FheavyBack_1788693827696.png?alt=media&token=5645a2aa-48ba-43ba-ad68-1916f9d238e3' },
  { id: 'tankWhiteFront', garment: 'tank_top', color: 'Blanc', view: 'front', url: 'https://firebasestorage.googleapis.com/v0/b/signaid-d2d08.firebasestorage.app/o/btp_mockups%2Fclubvisionroom%2Fweb%2FtankWhiteFront_1788693827692.png?alt=media&token=3602273b-ef06-4dbd-8dae-809894d7e147' },
  { id: 'tankWhiteBack', garment: 'tank_top', color: 'Blanc', view: 'back', url: 'https://firebasestorage.googleapis.com/v0/b/signaid-d2d08.firebasestorage.app/o/btp_mockups%2Fclubvisionroom%2Fweb%2FtankWhiteBack_1788693827694.png?alt=media&token=0e6b5a90-6ffe-499d-9a91-71043c6cb636' },
  { id: 'heavyWhiteFront', garment: 'tshirt_oversize', color: 'Blanc', view: 'front', url: '/assets/tshirt-white-NX7200.png' },
  { id: 'heavyWhiteBack', garment: 'tshirt_oversize', color: 'Blanc', view: 'back', url: '/assets/tshirt-white-NX7200-dos.png' }
];
export const extractSessionMockups = (targetId: string) => {
  const isVision = targetId === 'clubvisionroom' || targetId === 'visionroom' || targetId === '13ansvr' || targetId.toLowerCase().includes('vision');
  const cleanSlug = targetId.toLowerCase().replace(/^audit-/, '').trim();
  const sessionMockups: any[] = [];

  const seedData = (SEED_PROFILES as any)?.[cleanSlug] || (SEED_PROFILES as any)?.[targetId];
  if (seedData && Array.isArray(seedData.previewUrls)) {
    seedData.previewUrls.forEach((url: string, idx: number) => {
      const isTW = url.includes('tankWhiteFront') || url.includes('tankWhiteBack');
      const isHW = url.includes('heavyWhiteFront') || url.includes('heavyWhiteBack');
      const isT = !isTW && (url.includes('tankFront') || url.includes('tankBack') || url.includes('tank'));
      const isH = !isHW && (url.includes('heavyFront') || url.includes('heavyBack') || url.includes('heavy'));
      const isB = isBackViewUrl(url);
      const id = isTW ? (isB ? 'tankWhiteBack' : 'tankWhiteFront') : (isHW ? (isB ? 'heavyWhiteBack' : 'heavyWhiteFront') : (isT ? (isB ? 'tankBack' : 'tankFront') : (isH ? (isB ? 'heavyBack' : 'heavyFront') : (url.includes('hFront') || url.includes('hBack') ? (isB ? 'hBack' : 'hFront') : (url.includes('pFront') || url.includes('pBack') ? (isB ? 'pBack' : 'pFront') : (isB ? 'tBack' : 'tFront'))))));
      const garment = (isTW || isT) ? 'tank_top' : ((isHW || isH) ? 'tshirt_oversize' : (url.includes('hFront') || url.includes('hBack') ? 'sweat' : (url.includes('pFront') || url.includes('pBack') ? 'polo' : 'tshirt')));
      sessionMockups.push({
        id, garment, color: (isTW || isHW) ? 'Blanc' : 'Noir', view: isB ? 'back' : 'front',
        frontImageUrl: !isB ? url : undefined, backImageUrl: isB ? url : undefined,
        imageUrl: url, ai: url, aiRemastered: url, hasAi: true
      });
    });
  }

  if (typeof window !== 'undefined') {
    const keys = [
      'session_obj_clubvisionroom', 'btp_session_clubvisionroom', 'audit_session_clubvisionroom',
      `session_obj_${targetId}`, `btp_session_${targetId}`, `audit_session_${targetId}`,
      `session_obj_${cleanSlug}`, `btp_session_${cleanSlug}`, 'btp_active_session_data', 'auditSession'
    ];
    for (const k of keys) {
      try {
        const raw = localStorage.getItem(k) || sessionStorage.getItem(k);
        if (!raw) continue;
        const sData = JSON.parse(raw);
        const rawList = Array.isArray(sData.mockups) ? sData.mockups : (Array.isArray(sData.items) ? sData.items : []);
        rawList.forEach((m: any, idx: number) => {
          if (!m || typeof m !== 'object') return;
          const isB = m.view === 'back' || isBackViewUrl(m.id) || isBackViewUrl(m.title) || isBackViewUrl(m.imageUrl) || isBackViewUrl(m.url);
          const mAi = m.aiRemastered || m.ai || m.aiImageUrl || m.realAiSnapshotUrl || (isAiRenderUrl(m.frontImageUrl || m.imageUrl || m.url) ? (m.frontImageUrl || m.imageUrl || m.url) : null);
          const mAiB = m.aiRemasteredBack || m.aiBack || (isAiRenderUrl(m.backImageUrl || m.imageBack) ? (m.backImageUrl || m.imageBack) : null);
          let g = (m.garment || m.category || '').toLowerCase();
          if (g === 'sweatshirt' || g === 'hoodie') g = 'sweat';
          if (!g) {
            const mId = (m.id || '').toLowerCase();
            g = mId.includes('tank') ? 'tank_top' : (mId.includes('heavy') ? 'tshirt_oversize' : (mId.includes('polo') ? 'polo' : (mId.includes('hoodie') || mId.includes('sweat') ? 'sweat' : (mId.includes('cap') ? 'cap' : (mId.includes('tote') ? 'tote_bag' : 'tshirt')))));
          }
          const isW = m.color === 'Blanc' || m.color === 'white' || (typeof m.id === 'string' && m.id.toLowerCase().includes('white')) || (typeof m.title === 'string' && m.title.toLowerCase().includes('blanc'));
          sessionMockups.push({
            id: m.id || `session_mock_${idx}`,
            title: m.title || m.name, name: m.name || m.title, garment: g,
            view: isB ? 'back' : 'front', color: isW ? 'Blanc' : (m.color || 'Noir'), price: m.price,
            ai: mAi, aiRemastered: mAi, aiBack: mAiB, aiRemasteredBack: mAiB,
            frontImageUrl: !isB ? (mAi || m.frontImageUrl || m.imageFront || m.imageUrl || m.url) : undefined,
            backImageUrl: isB ? (mAi || mAiB || m.backImageUrl || m.imageBack || m.imageUrl || m.url) : (mAiB || m.backImageUrl || m.imageBack)
          });
        });
        if (sData.products && typeof sData.products === 'object') {
          Object.entries(sData.products).forEach(([gKey, p]: [string, any]) => {
            if (!p || typeof p !== 'object') return;
            const isW = p.color === 'Blanc' || p.color === 'white' || (typeof p.id === 'string' && p.id.toLowerCase().includes('white'));
            let g = (p.garment || gKey || '').toLowerCase();
            if (g === 'sweatshirt' || g === 'hoodie') g = 'sweat';
            const pAiF = p.aiRemastered || p.ai || p.aiImageUrl || (isAiRenderUrl(p.frontImageUrl || p.imageUrl) ? (p.frontImageUrl || p.imageUrl) : null);
            const pAiB = p.aiRemasteredBack || p.aiBack || (isAiRenderUrl(p.backImageUrl || p.imageBack) ? (p.backImageUrl || p.imageBack) : null);
            sessionMockups.push({
              id: p.id || `${g}Front`, title: p.name || p.title, name: p.name || p.title, garment: g,
              view: 'front', color: isW ? 'Blanc' : (p.color || 'Noir'), price: p.price,
              ai: pAiF, aiRemastered: pAiF, aiBack: pAiB, aiRemasteredBack: pAiB,
              frontImageUrl: pAiF || p.frontImageUrl || p.imageFront || p.imageUrl,
              backImageUrl: pAiB || p.backImageUrl || p.imageBack
            });
          });
        }
      } catch (e) { }
    }
  }

  if (isVision) {
    VISION_CLOUD_MOCKUPS.forEach(m => sessionMockups.push({
      id: m.id, garment: m.garment, color: m.color, view: m.view,
      frontImageUrl: m.view === 'front' ? m.url : undefined, backImageUrl: m.view === 'back' ? m.url : undefined,
      imageUrl: m.url, ai: m.url, aiRemastered: m.url, hasAi: true
    }));
  }

  return sessionMockups;
};

export const getMerchSlotCandidates = (pId: string, garment: string, color: string) => {
  const g = garment.toLowerCase();
  const isWhite = color === 'Blanc';
  const frontCandidates: string[] = [pId];
  const backCandidates: string[] = [];

  if (g === 'tshirt') {
    if (isWhite) {
      frontCandidates.push('tshirtWhiteFront', 'tWhiteFront', 'tshirt_white');
      backCandidates.push('tshirtWhiteBack', 'tWhiteBack');
    } else {
      frontCandidates.push('tFront', 'tshirtBlackFront', 'tshirtFront', 'tshirt', 'tshirt-pack', 'mockup_0');
      backCandidates.push('tBack', 'tshirtBlackBack', 'tshirtBack', 'mockup_1');
    }
  } else if (g === 'polo') {
    if (isWhite) {
      frontCandidates.push('poloWhiteFront', 'pWhiteFront', 'polo_white');
      backCandidates.push('poloWhiteBack', 'pWhiteBack');
    } else {
      frontCandidates.push('pFront', 'poloBlackFront', 'poloFront', 'polo', 'polo-pack', 'mockup_4');
      backCandidates.push('pBack', 'poloBlackBack', 'poloBack', 'mockup_5');
    }
  } else if (g === 'sweat' || g === 'hoodie') {
    if (isWhite) {
      frontCandidates.push('hoodieWhiteFront', 'hWhiteFront', 'sweatWhiteFront');
      backCandidates.push('hoodieWhiteBack', 'hWhiteBack', 'sweatWhiteBack');
    } else {
      frontCandidates.push('hFront', 'hoodieBlackFront', 'hoodieFront', 'sweatFront', 'hoodie', 'sweat', 'hoodie-pack', 'mockup_2');
      backCandidates.push('hBack', 'hoodieBlackBack', 'hoodieBack', 'sweatBack', 'mockup_3');
    }
  } else if (g === 'tank_top') {
    if (isWhite) {
      frontCandidates.push('tankWhiteFront', 'tankWhite', 'tank_top_white');
      backCandidates.push('tankWhiteBack');
    } else {
      frontCandidates.push('tankFront', 'tankBlackFront', 'tank_top', 'visionroom-basic-tank', 'tank', 'BYBB011', 'mockup_6');
      backCandidates.push('tankBack', 'tankBlackBack', 'mockup_7');
    }
  } else if (g === 'tshirt_oversize') {
    frontCandidates.push('heavyFront', 'heavyBlackFront', 'tshirt_oversize', 'visionroom-heavyweight-tee', 'heavy', 'NX7200', 'mockup_8');
    backCandidates.push('heavyBack', 'heavyBlackBack', 'mockup_9');
  } else if (g === 'cap') {
    frontCandidates.push('capFront', 'cap', 'casquette');
  } else if (g === 'tote_bag') {
    frontCandidates.push('toteBagFront', 'tote_bag', 'totebag');
  }
  return { frontCandidates, backCandidates };
};

export const createDynamicMerchProduct = (m: any, mBack: any, brandName: string): ProductItem => {
  const mGarment = (m.garment || 'tshirt').toLowerCase();
  const isWhite = m.color === 'Blanc' || (typeof m.id === 'string' && m.id.toLowerCase().includes('white')) || (typeof m.title === 'string' && m.title.toLowerCase().includes('blanc'));
  const mColor = isWhite ? 'Blanc' : 'Noir';

  const fImg = (typeof m.aiRemastered === 'string' && m.aiRemastered.trim() ? m.aiRemastered : null)
    || (typeof m.ai === 'string' && m.ai.trim() ? m.ai : null)
    || m.frontImageUrl
    || m.imageFront
    || m.imageUrl
    || m.mechanical
    || m.base
    || m.url;

  const bImg = mBack
    ? ((typeof mBack.aiRemastered === 'string' && mBack.aiRemastered.trim() ? mBack.aiRemastered : null)
      || (typeof mBack.ai === 'string' && mBack.ai.trim() ? mBack.ai : null)
      || mBack.backImageUrl
      || mBack.imageBack
      || mBack.imageUrl
      || mBack.mechanicalBack
      || mBack.mechanical
      || mBack.base
      || mBack.url)
    : ((typeof m.aiRemasteredBack === 'string' && m.aiRemasteredBack.trim() ? m.aiRemasteredBack : null)
      || (typeof m.aiBack === 'string' && m.aiBack.trim() ? m.aiBack : null)
      || m.backImageUrl
      || m.imageBack
      || m.imageUrl
      || m.mechanicalBack
      || m.mechanical
      || m.base
      || m.url);

  let defaultName = mGarment === 'tank_top'
    ? (isWhite ? 'Débardeur Blanc' : 'Débardeur')
    : mGarment === 'tshirt_oversize'
      ? 'T-Shirt Heavyweight Oversize'
      : mGarment === 'cap'
        ? 'Casquette Officielle'
        : mGarment === 'tote_bag'
          ? 'Tote Bag Officiel'
          : mGarment === 'sweat' || mGarment === 'hoodie'
            ? (isWhite ? 'Hoodie Blanc' : 'Hoodie Premium')
            : mGarment === 'polo'
              ? (isWhite ? 'Polo Blanc' : 'Polo Premium')
              : (isWhite ? 'T-Shirt Blanc' : 'T-Shirt Premium');

  let prodName = m.title || m.name;
  if (!prodName || prodName.toUpperCase().includes('FACE') || prodName.toUpperCase().includes('DOS')) {
    prodName = `${brandName} ${defaultName}`.trim();
  }

  const categoryName = mGarment === 'tank_top'
    ? 'Textile / Sans Manches'
    : mGarment === 'tshirt_oversize'
      ? 'Streetwear / Boxy Cut'
      : mGarment === 'cap' || mGarment === 'tote_bag'
        ? 'Accessoires'
        : mGarment === 'sweat' || mGarment === 'hoodie'
          ? 'Streetwear / Warm'
          : mGarment === 'polo'
            ? 'Textile / Business'
            : 'Textile / Coton Peigné';

  const defaultPrice = (mGarment === 'sweat' || mGarment === 'hoodie')
    ? 49.00
    : mGarment === 'polo'
      ? 39.00
      : mGarment === 'tshirt_oversize'
        ? 34.99
        : mGarment === 'tank_top'
          ? 27.99
          : mGarment === 'cap'
            ? 24.99
            : mGarment === 'tote_bag'
              ? 19.99
              : 29.99;

  return {
    id: `${mGarment}-${isWhite ? 'white' : 'black'}-${m.id || Date.now()}`,
    name: prodName,
    title: prodName,
    price: m.price && m.price <= 60 ? m.price : defaultPrice,
    currency: '€',
    garment: mGarment,
    category: categoryName,
    color: mColor,
    colors: [mColor],
    sizes: (mGarment === 'cap' || mGarment === 'tote_bag') ? ['Unique'] : ['S', 'M', 'L', 'XL', 'XXL'],
    frontImageUrl: fImg,
    backImageUrl: bImg || undefined,
    imageFront: fImg,
    imageBack: bImg || undefined,
    imageUrl: fImg,
    mechanical: m.mechanical || null,
    base: m.base || null,
    ai: (typeof m.aiRemastered === 'string' && m.aiRemastered.trim()) ? m.aiRemastered : ((typeof m.ai === 'string' && m.ai.trim()) ? m.ai : (isAiRenderUrl(fImg) ? fImg : (typeof m.ai === 'boolean' ? m.ai : null))),
    aiRemastered: (typeof m.aiRemastered === 'string' && m.aiRemastered.trim()) ? m.aiRemastered : ((typeof m.ai === 'string' && m.ai.trim()) ? m.ai : (isAiRenderUrl(fImg) ? fImg : null)),
    aiBack: (typeof mBack?.aiRemastered === 'string' && mBack.aiRemastered.trim()) ? mBack.aiRemastered : ((typeof mBack?.ai === 'string' && mBack.ai.trim()) ? mBack.ai : (isAiRenderUrl(bImg) ? bImg : null)),
    aiRemasteredBack: (typeof mBack?.aiRemastered === 'string' && mBack.aiRemastered.trim()) ? mBack.aiRemastered : ((typeof mBack?.ai === 'string' && mBack.ai.trim()) ? mBack.ai : (isAiRenderUrl(bImg) ? bImg : null)),
    images: {
      front: fImg,
      face: fImg,
      ...(bImg ? { back: bImg, dos: bImg } : {})
    },
    isAvailable: true
  };
};


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

export function getOptimizedImageUrl(url?: string, _width = 400): string {
  if (!url || typeof url !== 'string') return '';
  const cleanUrl = url.trim();
  if (!cleanUrl) return '';
  return cleanUrl;
}

const SocialIcon = ({ platform, color, size = 22 }: { platform: string; color?: string; size?: number }) => {
  const p = (platform || '').toLowerCase().trim();

  // TikTok - Native SVG
  if (p.includes('tiktok') || p.includes('tik')) {
    const fill = color || 'currentColor';
    return (
      <svg width={size} height={size} fill={fill} viewBox="0 0 24 24">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.04-.1z" />
      </svg>
    );
  }

  // Instagram
  if (p.includes('insta')) {
    const fill = color || '#E1306C';
    return (
      <svg width={size} height={size} fill={fill} viewBox="0 0 24 24">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.441-1.44z" />
      </svg>
    );
  }

  // Spotify
  if (p.includes('spotify') || p.includes('spot')) {
    const fill = color || '#1DB954';
    return (
      <svg width={size} height={size} fill={fill} viewBox="0 0 24 24">
        <path d="M12 0C5.376 0 0 5.376 0 12s5.376 12 12 12 12-5.376 12-12S18.624 0 12 0zm5.521 17.341c-.22.359-.688.472-1.047.251-2.87-1.753-6.482-2.15-10.738-1.176-.407.094-.816-.164-.91-.571-.093-.406.164-.816.571-.91 4.659-1.066 8.653-.615 11.873 1.35.359.221.472.689.251 1.056zm1.474-3.277c-.277.45-.867.591-1.317.315-3.284-2.018-8.291-2.604-12.176-1.425-.506.154-1.041-.137-1.196-.643-.154-.506.137-1.04.643-1.195 4.437-1.347 9.967-.698 13.73 1.631.45.276.591.866.316 1.317zm.126-3.414C15.228 8.249 8.8 8.036 5.123 9.151c-.624.19-1.282-.164-1.472-.789-.19-.624.165-1.282.789-1.472 4.225-1.283 11.317-1.034 15.772 1.611.56.332.744 1.054.412 1.614-.332.56-1.054.743-1.614.412z" />
      </svg>
    );
  }

  // YouTube
  if (p.includes('youtube') || p.includes('yt')) {
    const fill = color || '#FF0000';
    return (
      <svg width={size} height={size} fill={fill} viewBox="0 0 24 24">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    );
  }

  // Facebook
  if (p.includes('facebook') || p.includes('fb')) {
    const fill = color || '#1877F2';
    return (
      <svg width={size} height={size} fill={fill} viewBox="0 0 24 24">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    );
  }

  // WhatsApp
  if (p.includes('whatsapp') || p.includes('whats') || p.includes('wa.me')) {
    const fill = color || '#25D366';
    return (
      <svg width={size} height={size} fill={fill} viewBox="0 0 24 24">
        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
      </svg>
    );
  }

  // Apple Music
  if (p.includes('apple') || p.includes('itunes') || p.includes('applemusic')) {
    const fill = color || '#FC3C44';
    return (
      <svg width={size} height={size} fill={fill} viewBox="0 0 24 24">
        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.176 7.424l-6.353 1.27v7.502c-.52-.303-1.127-.478-1.777-.478-1.922 0-3.48 1.558-3.48 3.48s1.558 3.48 3.48 3.48 3.48-1.558 3.48-3.48V10.74l4.65-0.93v4.394c-.52-.303-1.127-.478-1.777-.478-1.922 0-3.48 1.558-3.48 3.48s1.558 3.48 3.48 3.48 3.48-1.558 3.48-3.48V7.424h-1.72z" />
      </svg>
    );
  }

  // Beatport
  if (p.includes('beatport')) {
    const fill = color || '#00FF83';
    return (
      <svg width={size} height={size} fill={fill} viewBox="0 0 24 24">
        <path d="M19.167 10.378c-.767-1.144-2.067-1.89-3.528-1.89h-3.306v6.027h3.306c1.461 0 2.761-.745 3.528-1.89.767-1.144.767-2.617 0-3.762zM7.667 6.486v11.028h2.333V6.486H7.667zm4.666-4.486v4.486h3.306c2.478 0 4.678 1.267 5.972 3.206 1.294 1.939 1.294 4.433 0 6.372-1.294 1.939-3.494 3.206-5.972 3.206h-5.639V2h2.333z" />
      </svg>
    );
  }

  // Mixcloud
  if (p.includes('mixcloud')) {
    const fill = color || '#5000ff';
    return (
      <svg width={size} height={size} fill={fill} viewBox="0 0 24 24">
        <path d="M2.28 15.65c-.75 0-1.37-.5-1.56-1.2l-.72-2.66c-.19-.7.22-1.42.92-1.61.7-.19 1.42.22 1.61.92l.72 2.66c.19.7-.22 1.42-.92 1.61-.15.04-.3.06-.45.06zm4.8 1.3c-.75 0-1.37-.5-1.56-1.2l-1.32-4.9c-.19-.7.22-1.42.92-1.61.7-.19 1.42.22 1.61.92l1.32 4.9c.19.7-.22 1.42-.92 1.61-.15.04-.3.06-.45.06zm4.8 1.3c-.75 0-1.37-.5-1.56-1.2l-1.92-7.14c-.19-.7.22-1.42.92-1.61.7-.19 1.42.22 1.61.92l1.92 7.14c.19.7-.22 1.42-.92 1.61-.15.04-.3.06-.45.06zm10.74-6.47c-.24-2.58-2.4-4.58-5.02-4.58-1.57 0-2.98.72-3.92 1.84l.64 2.37c.54-.7 1.37-1.15 2.31-1.15 1.62 0 2.94 1.32 2.94 2.94 0 .2-.02.4-.06.59l-.02.13.13.04c1.23.36 2.14 1.49 2.14 2.82 0 1.62-1.32 2.94-2.94 2.94h-2.12l.64 2.37h1.48c2.93 0 5.31-2.38 5.31-5.31 0-2.22-1.37-4.13-3.32-4.92l-.2-.08z" />
      </svg>
    );
  }

  // Deezer
  if (p.includes('deezer')) {
    const fill = color || '#A238FF';
    return (
      <svg width={size} height={size} fill={fill} viewBox="0 0 24 24">
        <path d="M18.8 6.4h3.6v2.4h-3.6V6.4zm0 3.6h3.6v2.4h-3.6v-2.4zm0 3.6h3.6V16h-3.6v-2.4zm0 3.6h3.6v2.4h-3.6v-2.4zM12.6 10h3.6v2.4h-3.6V10zm0 3.6h3.6V16h-3.6v-2.4zm0 3.6h3.6v2.4h-3.6v-2.4zM6.4 13.6H10V16H6.4v-2.4zm0 3.6H10v2.4H6.4v-2.4zM1.6 17.2h3.6v2.4H1.6v-2.4z" />
      </svg>
    );
  }

  // Email / Booking
  if (p.includes('mail') || p.includes('contact') || p.includes('book') || p.includes('gmail')) {
    const fill = color || '#3B82F6';
    return (
      <svg width={size} height={size} fill={fill} viewBox="0 0 24 24">
        <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
      </svg>
    );
  }

  // X / Twitter
  if (p.includes('twitter') || p.includes('x.com') || p === 'x') {
    const fill = color || 'currentColor';
    return (
      <svg width={size} height={size} fill={fill} viewBox="0 0 24 24">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    );
  }

  // LinkedIn
  if (p.includes('linkedin')) {
    const fill = color || '#0A66C2';
    return (
      <svg width={size} height={size} fill={fill} viewBox="0 0 24 24">
        <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
      </svg>
    );
  }

  // Snapchat
  if (p.includes('snap')) {
    const fill = color || '#FFFC00';
    return (
      <svg width={size} height={size} fill={fill} viewBox="0 0 24 24">
        <path d="M12.002 0c-4.227 0-7.393 2.825-7.393 6.786 0 .807.135 1.833.344 2.475.12.368.04.607-.156.763-.25.197-.73.35-1.282.502-.455.125-.87.24-.988.543-.13.335.12.72.63.99.822.433 1.83.67 2.296 1.488.163.284.09.684-.047 1.135-.183.606-.445 1.472-.11 2.052.287.498 1.05.748 2.046.748.435 0 .934-.048 1.486-.145.71-.124 1.42-.4 2.09-.4.636 0 1.25.228 1.94.39.57.133 1.18.232 1.85.232 1.01 0 1.77-.25 2.06-.75.33-.58.07-1.45-.11-2.05-.14-.45-.21-.85-.05-1.14.47-.82 1.48-1.06 2.3-1.49.51-.27.76-.66.63-1-.12-.3-.53-.42-.99-.54-.55-.15-1.03-.3-1.28-.5-.2-.16-.28-.4-.16-.76.21-.64.34-1.67.34-2.48C19.395 2.825 16.229 0 12.002 0z" />
      </svg>
    );
  }

  // Discord
  if (p.includes('disc')) {
    const fill = color || '#5865F2';
    return (
      <svg width={size} height={size} fill={fill} viewBox="0 0 24 24">
        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
      </svg>
    );
  }

  // Twitch
  if (p.includes('twitch')) {
    const fill = color || '#9146FF';
    return (
      <svg width={size} height={size} fill={fill} viewBox="0 0 24 24">
        <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z" />
      </svg>
    );
  }

  // Telegram
  if (p.includes('tele') || p.includes('tg')) {
    const fill = color || '#229ED9';
    return (
      <svg width={size} height={size} fill={fill} viewBox="0 0 24 24">
        <path d="M12 0C5.37 0 0 5.37 0 12s5.37 12 12 12 12-5.37 12-12S18.63 0 12 0zm5.56 8.16l-1.97 9.28c-.15.65-.53.81-1.08.5l-3-2.21-1.45 1.4c-.16.16-.3.3-.61.3l.22-3.05 5.56-5.02c.24-.22-.05-.34-.38-.13l-6.87 4.33-2.96-.92c-.64-.2-.66-.64.13-.95l11.57-4.46c.54-.2 1 .12.84.93z" />
      </svg>
    );
  }

  // Phone
  if (p.includes('tel') || p.includes('phone') || p.includes('appel')) {
    const fill = color || '#10B981';
    return (
      <svg width={size} height={size} fill={fill} viewBox="0 0 24 24">
        <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
      </svg>
    );
  }

  // Shop / Merch
  if (p.includes('shop') || p.includes('boutique') || p.includes('merch')) {
    const fill = color || '#F59E0B';
    return (
      <svg width={size} height={size} fill={fill} viewBox="0 0 24 24">
        <path d="M19 6h-2c0-2.76-2.24-5-5-5S7 3.24 7 6H5c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-7-3c1.66 0 3 1.34 3 3H9c0-1.66 1.34-3 3-3zm7 17H5V8h14v12zm-7-8c-1.66 0-3-1.34-3-3H7c0 2.76 2.24 5 5 5s5-2.24 5-5h-2c0 1.66-1.34 3-3 3z" />
      </svg>
    );
  }

  // Website / Globe
  const fill = color || '#64748B';
  return (
    <svg width={size} height={size} fill={fill} viewBox="0 0 24 24">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
    </svg>
  );
};

export const isPlatformMatch = (p1?: string, p2?: string): boolean => {
  if (!p1 || !p2) return false;
  const a = p1.toLowerCase().trim();
  const b = p2.toLowerCase().trim();
  if (a === b) return true;
  if (a.includes('insta') && b.includes('insta')) return true;
  if (a.includes('tik') && b.includes('tik')) return true;
  if (a.includes('sound') && b.includes('sound')) return true;
  if (a.includes('spot') && b.includes('spot')) return true;
  if ((a.includes('face') || a === 'fb') && (b.includes('face') || b === 'fb')) return true;
  if ((a.includes('whats') || a.includes('wa.me')) && (b.includes('whats') || b.includes('wa.me'))) return true;
  if ((a.includes('you') || a === 'yt') && (b.includes('you') || b === 'yt')) return true;
  if ((a.includes('twitter') || a === 'x' || a.startsWith('x ') || a.includes('/ x') || a.includes('x.com')) &&
    (b.includes('twitter') || b === 'x' || b.startsWith('x ') || b.includes('/ x') || b.includes('x.com'))) return true;
  if ((a.includes('apple') || a.includes('itunes')) && (b.includes('apple') || b.includes('itunes'))) return true;
  if (a.includes('beatport') && b.includes('beatport')) return true;
  if (a.includes('deezer') && b.includes('deezer')) return true;
  if (a.includes('mixcloud') && b.includes('mixcloud')) return true;
  if (a.includes('linkedin') && b.includes('linkedin')) return true;
  if ((a.includes('tele') || a === 'tg') && (b.includes('tele') || b === 'tg')) return true;
  if (a.includes('snap') && b.includes('snap')) return true;
  if (a.includes('disc') && b.includes('disc')) return true;
  if (a.includes('twitch') && b.includes('twitch')) return true;
  if ((a.includes('mail') || a.includes('contact') || a.includes('book')) &&
    (b.includes('mail') || b.includes('contact') || b.includes('book'))) return true;
  return false;
};

export const formatSocialUrl = (platform: string, rawUrl: string): string => {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  let url = rawUrl.trim();
  if (!url || url === '#') return '';

  const p = (platform || '').toLowerCase();

  // WhatsApp
  if (p.includes('whats') || p.includes('wa.me')) {
    if (url.startsWith('https://wa.me/') || url.startsWith('http://wa.me/')) return url;
    if (url.startsWith('wa.me/')) return `https://${url}`;
    const digits = url.replace(/\D/g, '');
    return digits ? `https://wa.me/${digits}` : '';
  }

  // Email
  if (p.includes('mail') || p.includes('contact') || p.includes('book')) {
    if (url.startsWith('mailto:')) return url;
    return `mailto:${url}`;
  }

  // Phone
  if (p.includes('tel') || p.includes('phone') || p.includes('appel')) {
    if (url.startsWith('tel:')) return url;
    return `tel:${url.replace(/\s+/g, '')}`;
  }

  // Handle @handle shortcuts
  if (url.startsWith('@')) {
    const handle = url.slice(1);
    if (p.includes('insta')) return `https://www.instagram.com/${handle}`;
    if (p.includes('tik')) return `https://www.tiktok.com/@${handle}`;
    if (p.includes('twitter') || p === 'x' || p.includes('x.com')) return `https://x.com/${handle}`;
    if (p.includes('face') || p === 'fb') return `https://www.facebook.com/${handle}`;
    if (p.includes('you') || p === 'yt') return `https://www.youtube.com/@${handle}`;
    if (p.includes('sound')) return `https://soundcloud.com/${handle}`;
    if (p.includes('twitch')) return `https://twitch.tv/${handle}`;
  }

  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  return `https://${url}`;
};

const getPlatformColors = (platformName: string) => {
  const p = (platformName || '').toLowerCase().trim();
  if (p.includes('instagram') || p.includes('insta')) {
    return { lightColor: '#E1306C', darkColor: '#E1306C', glow: 'rgba(225, 48, 108, 0.5)' };
  }
  if (p.includes('tiktok') || p.includes('tik')) {
    return { lightColor: '#000000', darkColor: '#ffffff', glow: 'rgba(37, 244, 238, 0.5)' };
  }
  if (p.includes('soundcloud') || p.includes('sound')) {
    return { lightColor: '#FF5500', darkColor: '#FF5500', glow: 'rgba(255, 85, 0, 0.5)' };
  }
  if (p.includes('spotify') || p.includes('spot')) {
    return { lightColor: '#1DB954', darkColor: '#1DB954', glow: 'rgba(29, 185, 84, 0.5)' };
  }
  if (p.includes('youtube') || p.includes('yt')) {
    return { lightColor: '#FF0000', darkColor: '#FF0000', glow: 'rgba(255, 0, 0, 0.5)' };
  }
  if (p.includes('facebook') || p.includes('fb')) {
    return { lightColor: '#1877F2', darkColor: '#1877F2', glow: 'rgba(24, 119, 242, 0.5)' };
  }
  if (p.includes('whatsapp') || p.includes('whats') || p.includes('wa.me')) {
    return { lightColor: '#25D366', darkColor: '#25D366', glow: 'rgba(37, 211, 102, 0.5)' };
  }
  if (p.includes('apple') || p.includes('itunes') || p.includes('applemusic')) {
    return { lightColor: '#FC3C44', darkColor: '#FC3C44', glow: 'rgba(252, 60, 68, 0.5)' };
  }
  if (p.includes('beatport')) {
    return { lightColor: '#00A355', darkColor: '#00FF83', glow: 'rgba(0, 255, 131, 0.5)' };
  }
  if (p.includes('deezer')) {
    return { lightColor: '#A238FF', darkColor: '#A238FF', glow: 'rgba(162, 56, 255, 0.5)' };
  }
  if (p.includes('mixcloud')) {
    return { lightColor: '#5000ff', darkColor: '#8A5CFF', glow: 'rgba(80, 0, 255, 0.5)' };
  }
  if (p.includes('mail') || p.includes('contact') || p.includes('book') || p.includes('gmail') || p.includes('email')) {
    return { lightColor: '#2563EB', darkColor: '#60A5FA', glow: 'rgba(59, 130, 246, 0.5)' };
  }
  if (p.includes('twitter') || p.includes('x.com') || p === 'x' || p.includes('x /')) {
    return { lightColor: '#0f172a', darkColor: '#ffffff', glow: 'rgba(255, 255, 255, 0.4)' };
  }
  if (p.includes('linkedin')) {
    return { lightColor: '#0A66C2', darkColor: '#38BDF8', glow: 'rgba(10, 102, 194, 0.5)' };
  }
  if (p.includes('tele') || p.includes('tg')) {
    return { lightColor: '#229ED9', darkColor: '#38BDF8', glow: 'rgba(34, 158, 217, 0.5)' };
  }
  if (p.includes('snap')) {
    return { lightColor: '#CA8A04', darkColor: '#FFFC00', glow: 'rgba(255, 252, 0, 0.5)' };
  }
  if (p.includes('disc')) {
    return { lightColor: '#5865F2', darkColor: '#818CF8', glow: 'rgba(88, 101, 242, 0.5)' };
  }
  if (p.includes('twitch')) {
    return { lightColor: '#9146FF', darkColor: '#A78BFA', glow: 'rgba(145, 70, 255, 0.5)' };
  }
  return { lightColor: '#334155', darkColor: '#ffffff', glow: 'rgba(255, 255, 255, 0.3)' };
};

const getPlatformBadgeStyle = (platformName: string, isLight: boolean = false) => {
  const { lightColor, darkColor, glow } = getPlatformColors(platformName);

  if (isLight) {
    return {
      bg: '#ffffff',
      color: lightColor,
      border: '1px solid rgba(0, 0, 0, 0.1)',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04)',
      hoverBg: '#ffffff',
      hoverBorder: `1px solid ${lightColor}`,
      hoverGlow: glow
    };
  }

  return {
    bg: 'rgba(255, 255, 255, 0.08)',
    color: darkColor,
    border: '1px solid rgba(255, 255, 255, 0.15)',
    boxShadow: '0 4px 14px rgba(0, 0, 0, 0.4)',
    hoverBg: 'rgba(255, 255, 255, 0.16)',
    hoverBorder: '1px solid rgba(255, 255, 255, 0.35)',
    hoverGlow: glow
  };
};

function ArtistPhotoCarousel({
  urls,
  companyName,
  style,
  coverHeight = 280,
  coverZoom = 100,
  coverPositionY = 50,
  coverPositionX = 50
}: {
  urls: string[];
  companyName: string;
  style?: React.CSSProperties;
  coverHeight?: number;
  coverZoom?: number;
  coverPositionY?: number;
  coverPositionX?: number;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [failedUrls, setFailedUrls] = useState<Set<string>>(new Set());

  const validUrls = (urls || []).filter(
    (u) => typeof u === 'string' && u.trim().length > 10 && u !== 'none' && !failedUrls.has(u)
  );

  useEffect(() => {
    if (!validUrls || validUrls.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % validUrls.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [validUrls]);

  if (!validUrls || validUrls.length === 0) return null;

  return (
    <div style={{
      borderRadius: '16px',
      overflow: 'hidden',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
      position: 'relative',
      width: '100%',
      height: `${coverHeight}px`,
      maxHeight: `${coverHeight}px`,
      backgroundColor: '#0f172a',
      ...style
    }}>
      {validUrls.map((url, idx) => (
        <img
          key={idx}
          src={url}
          alt={`Ambiance ${companyName} ${idx + 1}`}
          onError={() => {
            setFailedUrls((prev) => new Set(prev).add(url));
          }}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: `${coverPositionX}% ${coverPositionY}%`,
            transform: `scale(${coverZoom / 100})`,
            transformOrigin: `${coverPositionX}% ${coverPositionY}%`,
            transition: 'opacity 0.8s ease-in-out, transform 0.15s ease, object-position 0.15s ease',
            opacity: idx === currentIndex ? 1 : 0
          }}
        />
      ))}
      {validUrls.length > 1 && (
        <div style={{ position: 'absolute', bottom: '10px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '6px', zIndex: 3 }}>
          {validUrls.map((_, idx) => (
            <div
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              style={{
                width: idx === currentIndex ? '16px' : '6px',
                height: '6px',
                borderRadius: '3px',
                backgroundColor: idx === currentIndex ? '#ffffff' : 'rgba(255,255,255,0.4)',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export interface ProfileMeta {
  displayName: string;
  logoUrl?: string;
  avatarUrl?: string;
  primaryColor?: string;
  theme?: 'dark' | 'light' | 'auto';
  initials: string;
  isReady: boolean;
}

export const getInitialProfileMeta = (identifier: string): ProfileMeta => {
  const clean = identifier.replace(/^audit-/, '').replace(/[-_]/g, ' ').trim();
  const formattedName = clean ? clean.charAt(0).toUpperCase() + clean.slice(1) : 'Profil';
  const initials = clean.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase() || 'P';

  const defaultMeta: ProfileMeta = {
    displayName: formattedName,
    logoUrl: undefined,
    primaryColor: '#dc2626',
    theme: 'dark',
    initials,
    isReady: false
  };

  if (typeof window === 'undefined') return defaultMeta;

  // Tier 1 Fast Path A: Dedicated SessionStorage / LocalStorage metadata (0 ms)
  try {
    const metaStr = sessionStorage.getItem(`signaid_meta_${identifier}`) || localStorage.getItem(`signaid_meta_${identifier}`);
    if (metaStr) {
      const parsed = JSON.parse(metaStr);
      if (parsed && (parsed.displayName || parsed.logoUrl)) {
        return {
          displayName: parsed.displayName || formattedName,
          logoUrl: parsed.logoUrl,
          primaryColor: parsed.primaryColor || '#dc2626',
          theme: parsed.theme || 'dark',
          initials: parsed.initials || initials,
          isReady: true
        };
      }
    }
  } catch { }

  // Tier 1 Fast Path B: Full SWR cache if present (0 ms)
  try {
    const fullStr = localStorage.getItem(`fast_artist_cache_v92_${identifier}`) || localStorage.getItem(`fast_artist_cache_${identifier}`);
    if (fullStr) {
      const parsed = JSON.parse(fullStr);
      if (parsed && parsed.artist) {
        const rawA = typeof parsed.artist.logoA === 'string' ? parsed.artist.logoA : (parsed.artist.logoA?.adaptedRemastered || parsed.artist.logoA?.adapted || parsed.artist.logoA?.original);
        const effectiveLogo = parsed.artist.logoUrl || parsed.artist.auditLogoUrl || parsed.artist.logoAdaptedUrl || rawA || (parsed.artist as any).avatar;
        return {
          displayName: parsed.artist.companyName || formattedName,
          logoUrl: effectiveLogo,
          primaryColor: parsed.artist.accentColor || '#dc2626',
          theme: parsed.artist.theme || 'dark',
          initials,
          isReady: true
        };
      }
    }
  } catch { }

  // Tier 1 Fast Path B2: artist_${identifier} cache
  try {
    const artistStr = localStorage.getItem(`artist_${identifier}`);
    if (artistStr) {
      const parsed = JSON.parse(artistStr);
      if (parsed) {
        const rawA = typeof parsed.logoA === 'string' ? parsed.logoA : (parsed.logoA?.adaptedRemastered || parsed.logoA?.adapted || parsed.logoA?.original);
        const effectiveLogo = parsed.logoUrl || parsed.auditLogoUrl || parsed.logoAdaptedUrl || rawA || (parsed as any).avatar;
        return {
          displayName: parsed.companyName || formattedName,
          logoUrl: effectiveLogo,
          primaryColor: parsed.accentColor || '#dc2626',
          theme: parsed.theme || 'dark',
          initials,
          isReady: true
        };
      }
    }
  } catch { }

  // Tier 1 Fast Path C: Known static assets mapping
  const isAaron = clean.toLowerCase().includes('aaron');
  const isDokiin = clean.toLowerCase().includes('dokiin');
  const isMentalist = clean.toLowerCase().includes('mentalist');
  const isElox = clean.toLowerCase().includes('elox');
  const isDfazz = clean.toLowerCase().includes('dfazz') || clean.toLowerCase().includes('fabrizio');

  const fallbackLogo = isAaron
    ? '/aaronh_logo_transparent.png'
    : (isDokiin
      ? '/dokiin_logo_white.png'
      : (isElox
        ? '/elox_logo.png'
        : (isMentalist
          ? 'https://storage.googleapis.com/signaid-prod-assets/users/audit-msx4a4h6crjy/logos/1787516508472_logo.png'
          : (isDfazz ? '/logo_dfazz_avatar_clean.png' : undefined))));

  return {
    displayName: formattedName,
    logoUrl: fallbackLogo,
    primaryColor: '#dc2626',
    theme: 'dark',
    initials,
    isReady: !!fallbackLogo
  };
};

export default function ArtistProfileView({ overrideSlug }: { overrideSlug?: string }) {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();

  const hostname = typeof window !== 'undefined' ? window.location.hostname.toLowerCase() : '';
  const domainSlug = hostname.includes('djdfazz') ? 'fabrizio' : undefined;

  const uidParam = searchParams.get('uid') || searchParams.get('id') || searchParams.get('audit') || searchParams.get('slug');
  const targetIdentifier = overrideSlug || domainSlug || slug || uidParam || 'fabrizio';

  const [artist, setArtist] = useState<ArtistProfile | null>(null);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // TIER 1 : Metadata Fast-Path State (Nom, Logo, Couleurs < 50ms)
  const [profileMeta, setProfileMeta] = useState<ProfileMeta>(() => getInitialProfileMeta(targetIdentifier));

  const effectiveTheme = getEffectiveTheme(artist?.theme);
  const isLight = effectiveTheme === 'light';

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', effectiveTheme);
  }, [effectiveTheme]);

  const [processedAvatarUrl, setProcessedAvatarUrl] = useState<string>('');

  useEffect(() => {
    // Le logo a déjà été traité (fond supprimé) lors de l'upload via le dashboard ou l'audit.
    // On l'utilise directement sans re-passer par Canvas (qui pose des problèmes CORS sur les URLs Storage).
    const rawA = typeof artist?.logoA === 'string' ? artist.logoA : ((artist?.logoA as any)?.adaptedRemastered || (artist?.logoA as any)?.adapted || (artist?.logoA as any)?.original);
    const effLogo = artist?.logoUrl || artist?.auditLogoUrl || artist?.logoAdaptedUrl || rawA || '';
    setProcessedAvatarUrl(effLogo);
  }, [artist?.logoUrl, artist?.auditLogoUrl, artist?.logoAdaptedUrl, artist?.logoA]);

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

  const loadDirectFromFirestore = async (identifier: string) => {
    try {
      const isDfazz = identifier === 'fabrizio' || identifier === 'djdfazz' || identifier === 'dfazz' || identifier === 'audit-8f198p5' || identifier === 'guest_ms3ijgnco2xnid' || identifier.toLowerCase().includes('dfazz');
      const cleanId = identifier.replace(/^audit-/, '');
      const normId = identifier.toLowerCase().replace(/[^a-z0-9]/g, '');

      // Ultra-fast parallel lookups across collections
      const [
        scById,
        scByCleanId,
        scBySlug,
        prevById,
        prevByCleanId,
        prevByCompanySlug,
        prevByCleanUid,
        prevByPreviewId,
        btpById,
        btpByCleanId
      ] = await Promise.all([
        getDoc(doc(db, 'SiteConfigs', identifier)).catch(() => null),
        cleanId !== identifier ? getDoc(doc(db, 'SiteConfigs', cleanId)).catch(() => null) : Promise.resolve(null),
        normId ? getDocs(query(collection(db, 'SiteConfigs'), where('slug', '==', normId), limit(1))).catch(() => null) : Promise.resolve(null),
        getDoc(doc(db, 'anonymous_previews', identifier)).catch(() => null),
        cleanId !== identifier ? getDoc(doc(db, 'anonymous_previews', cleanId)).catch(() => null) : Promise.resolve(null),
        normId ? getDocs(query(collection(db, 'anonymous_previews'), where('companySlug', '==', normId), limit(1))).catch(() => null) : Promise.resolve(null),
        normId ? getDocs(query(collection(db, 'anonymous_previews'), where('cleanUid', '==', normId), limit(1))).catch(() => null) : Promise.resolve(null),
        getDocs(query(collection(db, 'anonymous_previews'), where('previewId', '==', identifier), limit(1))).catch(() => null),
        getDoc(doc(db, 'btp_projects', identifier)).catch(() => null),
        cleanId !== identifier ? getDoc(doc(db, 'btp_projects', cleanId)).catch(() => null) : Promise.resolve(null)
      ]);

      // Resolve siteConfig
      let siteData: any = null;
      if (scById?.exists()) siteData = scById.data();
      else if (scByCleanId?.exists()) siteData = scByCleanId.data();
      else if (scBySlug && !scBySlug.empty) siteData = scBySlug.docs[0].data();

      // Resolve preview
      let previewData: any = null;
      if (prevById?.exists()) previewData = prevById.data();
      else if (prevByCleanId?.exists()) previewData = prevByCleanId.data();
      else if (prevByCompanySlug && !prevByCompanySlug.empty) previewData = prevByCompanySlug.docs[0].data();
      else if (prevByCleanUid && !prevByCleanUid.empty) previewData = prevByCleanUid.docs[0].data();
      else if (prevByPreviewId && !prevByPreviewId.empty) previewData = prevByPreviewId.docs[0].data();
      else if (btpById?.exists()) previewData = btpById.data();
      else if (btpByCleanId?.exists()) previewData = btpByCleanId.data();

      // Fallbacks if docIdFromSite exists and wasn't found
      const docIdFromSite = siteData?.docId || siteData?.cleanUid || siteData?.auditId || siteData?.previewId;
      if (!previewData && docIdFromSite) {
        const [pDoc, bDoc] = await Promise.all([
          getDoc(doc(db, 'anonymous_previews', docIdFromSite)).catch(() => null),
          getDoc(doc(db, 'btp_projects', docIdFromSite)).catch(() => null)
        ]);
        if (pDoc?.exists()) previewData = pDoc.data();
        else if (bDoc?.exists()) previewData = bDoc.data();
      }

      if ((!siteData || (!siteData.livePhotoUrl && (!siteData.livePhotoUrls || siteData.livePhotoUrls.length === 0))) && isDfazz) {
        try {
          const fabSnap = await getDoc(doc(db, 'SiteConfigs', 'guest_ms3ijgnco2xnid'));
          if (fabSnap.exists()) {
            const fData = fabSnap.data();
            siteData = { ...fData, ...(siteData || {}) };
            if (fData.livePhotoUrl && (!siteData.livePhotoUrl || siteData.livePhotoUrl === '')) {
              siteData.livePhotoUrl = fData.livePhotoUrl;
              siteData.livePhotoUrls = fData.livePhotoUrls;
            }
          }
        } catch (e) { }
      }

      if (!previewData && isDfazz) {
        const defaultPrevSnap = await getDoc(doc(db, 'anonymous_previews', 'audit-8f198p5'));
        if (defaultPrevSnap.exists()) {
          previewData = defaultPrevSnap.data();
        }
      }

      // Parallel IndexedDB fetch
      const sidsToCheck = Array.from(new Set([identifier, cleanId, docIdFromSite].filter(Boolean)));
      const idbKeys = ['tFront', 'pFront', 'hFront', 'cardFront', 'tBack', 'pBack', 'hBack', 'cardBack', 'tankFront', 'tankBack', 'heavyFront', 'heavyBack'];
      const idbImages: Record<string, string> = {};

      await Promise.all(
        sidsToCheck.flatMap(sid =>
          idbKeys.map(async key => {
            if (idbImages[key]) return;
            try {
              const [aiVal, mechVal] = await Promise.all([
                dbGet(`${sid}_ai_${key}`).catch(() => null),
                dbGet(`${sid}_mech_${key}`).catch(() => null)
              ]);
              const val = (typeof aiVal === 'string' && aiVal.length > 50) ? aiVal : ((typeof mechVal === 'string' && mechVal.length > 50) ? mechVal : null);
              if (val && !val.toLowerCase().includes('dfazz') && !idbImages[key]) {
                idbImages[key] = val;
              }
            } catch (e) { }
          })
        )
      ); const prodsObj = (siteData?.products && typeof siteData.products === 'object' && !Array.isArray(siteData.products))
        ? siteData.products
        : (siteData?.productsMap && typeof siteData.productsMap === 'object' && !Array.isArray(siteData.productsMap))
          ? siteData.productsMap
          : ((previewData?.products && typeof previewData.products === 'object' && !Array.isArray(previewData.products))
            ? previewData.products
            : (previewData?.productsMap && typeof previewData.productsMap === 'object' && !Array.isArray(previewData.productsMap))
              ? previewData.productsMap
              : null);

      const prodsAsItems: any[] = [];
      if (prodsObj) {
        Object.entries(prodsObj).forEach(([garmentKey, p]: [string, any]) => {
          if (p && typeof p === 'object') {
            const gType = (garmentKey.includes('hoodie') || garmentKey.includes('sweat')) ? 'sweat' : (garmentKey.includes('polo') ? 'polo' : (garmentKey.includes('basic') ? 'tshirt_basic' : (garmentKey.includes('tank') ? 'tank_top' : (garmentKey.includes('heavy') ? 'tshirt_oversize' : 'tshirt'))));
            const item = p as any;
            const fImg = (typeof item.aiRemastered === 'string' && item.aiRemastered.trim() ? item.aiRemastered : null)
              || (typeof item.ai === 'string' && item.ai.trim() ? item.ai : null)
              || item.frontImageUrl
              || item.imageFront
              || item.imageUrl
              || item.aiImageUrl
              || item.mechanical
              || item.base;
            const bImg = (typeof item.aiRemasteredBack === 'string' && item.aiRemasteredBack.trim() ? item.aiRemasteredBack : null)
              || (typeof item.aiBack === 'string' && item.aiBack.trim() ? item.aiBack : null)
              || item.backImageUrl
              || item.imageBack
              || item.imageUrl
              || item.mechanicalBack
              || item.mechanical
              || item.base;
            if (fImg || bImg) {
              prodsAsItems.push({
                id: p.id || `${gType}-item`,
                title: p.name || p.title || `${siteData?.companyName || previewData?.companyName || 'Merch'} ${gType}`,
                name: p.name || p.title || `${siteData?.companyName || previewData?.companyName || 'Merch'} ${gType}`,
                garment: gType,
                price: p.price,
                ai: (typeof item.aiRemastered === 'string' && item.aiRemastered.trim()) ? item.aiRemastered : ((typeof item.ai === 'string' && item.ai.trim()) ? item.ai : (typeof item.ai === 'boolean' ? item.ai : null)),
                aiRemastered: (typeof item.aiRemastered === 'string' && item.aiRemastered.trim()) ? item.aiRemastered : ((typeof item.ai === 'string' && item.ai.trim()) ? item.ai : null),
                mechanical: item.mechanical || null,
                base: item.base || null,
                frontImageUrl: fImg,
                imageFront: fImg,
                backImageUrl: bImg,
                imageBack: bImg,
                imageUrl: fImg
              });
            }
          }
        });
      }

      const rawItemsList = [
        ...(prodsAsItems.length > 0 ? prodsAsItems : []),
        ...(Array.isArray(previewData?.items) ? previewData.items : []),
        ...(Array.isArray(siteData?.items) ? siteData.items : []),
        ...(Array.isArray(previewData?.products) ? previewData.products : []),
        ...(Array.isArray(siteData?.products) ? siteData.products : []),
        ...(Array.isArray(previewData?.mockups) ? previewData.mockups : (previewData?.mockups && typeof previewData.mockups === 'object' ? Object.values(previewData.mockups) : [])),
        ...(Array.isArray(siteData?.mockups) ? siteData.mockups : (siteData?.mockups && typeof siteData.mockups === 'object' ? Object.values(siteData.mockups) : []))
      ];

      const items = rawItemsList.filter((it: any) => {
        if (isDfazz) return true;
        const nameStr = (it.name || it.title || '').toLowerCase();
        const imgStr = (it.imageFront || it.frontImageUrl || it.aiImageUrl || it.imageUrl || it.ai || '').toLowerCase();
        if (nameStr.includes('d-fazz') || imgStr.includes('audit-8f198p5') || imgStr.includes('dfazz')) {
          return false;
        }
        return true;
      });

      const hasRealData = !!siteData || !!previewData || isDfazz || (items && items.length > 0) || !!prodsObj;
      if (!hasRealData) {
        return null;
      }

      if (hasRealData) {
        let rawLivePhotos: string[] = siteData?.livePhotoUrls || previewData?.livePhotoUrls || (siteData?.livePhotoUrl ? [siteData.livePhotoUrl] : (previewData?.livePhotoUrl ? [previewData.livePhotoUrl] : []));
        if (isDfazz && rawLivePhotos.length === 0) {
          rawLivePhotos = ['/assets/dfazz_hero.jpg'];
        }

        const isDokiin = cleanId.includes('dokiin') || cleanId.includes('audit-mt4cimp4luio');
        const isAaron = cleanId.includes('aaronh');
        const isMentalist = cleanId.includes('mentalist');
        const isElox = cleanId.includes('elox');

        let finalName = (siteData?.companyName !== undefined && siteData.companyName !== null)
          ? siteData.companyName.trim()
          : ((previewData?.companyName !== undefined && previewData.companyName !== null) ? previewData.companyName.trim() : (isDfazz ? 'DJ D-FAZZ' : (isDokiin ? 'D OKIIN' : (isAaron ? 'Aaron H' : (isMentalist ? 'Mentalist' : (isElox ? 'DJ ELOX' : ''))))));
        if (!isDfazz && (finalName.toUpperCase() === 'DJ D-FAZZ' || finalName.toLowerCase().includes('dfazz'))) {
          finalName = (siteData?.companyName && !siteData.companyName.toLowerCase().includes('dfazz')) ? siteData.companyName : (isDokiin ? 'D OKIIN' : (isAaron ? 'Aaron H' : (isMentalist ? 'Mentalist' : (isElox ? 'DJ ELOX' : ''))));
        }

        const rawSiteA = typeof siteData?.logoA === 'string' ? siteData.logoA : (siteData?.logoA?.adaptedRemastered || siteData?.logoA?.adapted || siteData?.logoA?.original);
        const rawPrevA = typeof previewData?.logoA === 'string' ? previewData.logoA : (previewData?.logoA?.adaptedRemastered || previewData?.logoA?.adapted || previewData?.logoA?.original);
        let finalLogo = siteData?.logoUrl || siteData?.auditLogoUrl || siteData?.logoAdaptedUrl || rawSiteA || previewData?.logoUrl || previewData?.auditLogoUrl || previewData?.logoAdaptedUrl || rawPrevA || (isDfazz ? '/logo_dfazz_avatar_clean.png' : (isDokiin ? '/dokiin_logo_white.png' : (isAaron ? '/aaronh_logo_transparent.png' : (isMentalist ? 'https://storage.googleapis.com/signaid-prod-assets/users/audit-msx4a4h6crjy/logos/1787516508472_logo.png' : (isElox ? '/elox_logo.png' : '')))));
        if (!isDfazz && (finalLogo.toLowerCase().includes('dfazz') || finalLogo.includes('audit-8f198p5') || finalLogo.includes('guest_ms3ijgnco2xnid'))) {
          finalLogo = isDokiin ? '/dokiin_logo_white.png' : (isAaron ? '/aaronh_logo_transparent.png' : (isMentalist ? 'https://storage.googleapis.com/signaid-prod-assets/users/audit-msx4a4h6crjy/logos/1787516508472_logo.png' : (isElox ? '/elox_logo.png' : '')));
        }

        const aaronHero = 'https://storage.googleapis.com/signaid-prod-assets/users/aaronh/gallery/1787509987223_cover.jpg';
        let finalLivePhoto = siteData?.livePhotoUrl || previewData?.livePhotoUrl || (rawLivePhotos.length > 0 ? rawLivePhotos[rawLivePhotos.length - 1] : (isDfazz ? '/assets/dfazz_hero.jpg' : (isDokiin ? '/assets/previews/dokiin_mockup.webp' : (isElox ? '/elox_hero.jpg' : (isAaron ? aaronHero : '')))));
        if (isAaron && !finalLivePhoto) {
          finalLivePhoto = aaronHero;
        }
        if (isDfazz && !finalLivePhoto) {
          finalLivePhoto = '/assets/dfazz_hero.jpg';
        }
        if (isDokiin && !finalLivePhoto) {
          finalLivePhoto = '/assets/previews/dokiin_mockup.webp';
        }
        if (isElox && !finalLivePhoto) {
          finalLivePhoto = '/elox_hero.jpg';
        }
        if (!isDfazz && (finalLivePhoto.toLowerCase().includes('dfazz') || finalLivePhoto.includes('audit-8f198p5') || finalLivePhoto.includes('guest_ms3ijgnco2xnid'))) {
          finalLivePhoto = isDokiin ? '/assets/previews/dokiin_mockup.webp' : (isElox ? '/elox_hero.jpg' : (isAaron ? aaronHero : ''));
        }

        const finalLivePhotoUrls = isDfazz && rawLivePhotos.length === 0
          ? ['/assets/dfazz_hero.jpg']
          : (isDokiin && rawLivePhotos.length === 0
            ? ['/assets/previews/dokiin_mockup.webp']
            : (isElox && rawLivePhotos.length === 0
              ? ['/elox_hero.jpg']
              : (isAaron && rawLivePhotos.length === 0
                ? [aaronHero]
                : (isDfazz ? rawLivePhotos : rawLivePhotos.filter(u => !u.toLowerCase().includes('dfazz'))))));

        let finalEmail = siteData?.contactEmail || (isDfazz ? 'Fabriziomagistro89@gmail.com' : (isElox ? 'contact@djelox.be' : ''));
        if (!isDfazz && finalEmail === 'Fabriziomagistro89@gmail.com') finalEmail = '';

        let finalWhatsapp = siteData?.whatsappNumber || (isDfazz ? '+32492104603' : '');
        if (!isDfazz && finalWhatsapp === '+32492104603') finalWhatsapp = '';

        const artistProfile: ArtistProfile = {
          id: identifier,
          companyName: finalName,
          activitySector: siteData?.activitySector || previewData?.activitySector || '',
          slug: siteData?.slug || cleanId,
          logoUrl: finalLogo,
          logoA: siteData?.logoA || previewData?.logoA || finalLogo || '',
          logoB: siteData?.logoB || previewData?.logoB || siteData?.logoAdaptedUrl || previewData?.logoAdaptedUrl || finalLogo || '',
          logoAdaptedUrl: siteData?.logoAdaptedUrl || previewData?.logoAdaptedUrl || siteData?.logoB || previewData?.logoB || finalLogo || '',
          logoPlacements: siteData?.logoPlacements || previewData?.logoPlacements || undefined,
          livePhotoUrl: finalLivePhoto,
          livePhotoUrls: finalLivePhotoUrls,
          presentation: siteData?.presentation || previewData?.presentation || (isElox ? 'DJ officiel, sets électroniques en clubs et festivals (Liège, Bruxelles, Dinant). Merchandising officiel et textile exclusif imprimé à la demande.' : ''),
          contactEmail: finalEmail,
          whatsapp: finalWhatsapp,
          socials: (() => {
            const rawSocialsConfig = Array.isArray(siteData?.socials) ? siteData.socials : (Array.isArray(previewData?.socials) ? previewData.socials : null);
            if (rawSocialsConfig !== null) {
              return rawSocialsConfig
                .filter((s: any) => s && s.enabled !== false && typeof s.url === 'string' && s.url.trim() !== '')
                .map((s: any) => ({
                  platform: s.platform || s.title || s.type || '',
                  url: s.url.trim()
                }))
                .filter((s: any) => s.platform && s.url);
            }
            return isDfazz ? [
              { platform: 'Facebook', url: 'https://facebook.com/djdfazz' },
              { platform: 'Instagram', url: 'https://instagram.com/djdfazz' },
              { platform: 'TikTok', url: 'https://tiktok.com/@djdfazz' },
              { platform: 'WhatsApp', url: 'https://wa.me/32492104603' },
              { platform: 'Email', url: 'mailto:Fabriziomagistro89@gmail.com' },
              { platform: 'Spotify', url: 'https://open.spotify.com' },
              { platform: 'SoundCloud', url: 'https://soundcloud.com' },
              { platform: 'YouTube', url: 'https://youtube.com' }
            ] : (isElox ? [
              { platform: 'Instagram', url: 'https://www.instagram.com/djelox' },
              { platform: 'TikTok', url: 'https://tiktok.com/@djelox' },
              { platform: 'SoundCloud', url: 'https://soundcloud.com/djelox' },
              { platform: 'YouTube', url: 'https://youtube.com/@djelox' },
              { platform: 'Spotify', url: 'https://open.spotify.com' }
            ] : []);
          })(),
          accentColor: siteData?.accentColor || (isDokiin ? '#38bdf8' : (isElox ? '#00ff88' : '#ea580c')),
          theme: isDokiin ? 'dark' : (isElox ? 'dark' : (siteData?.theme || previewData?.theme || 'auto')),
          logoOverlayColor: isDokiin ? 'white' : (isElox ? 'original' : (siteData?.logoOverlayColor || 'auto')),
          logoScale: siteData?.logoScale !== undefined ? siteData.logoScale : 100,
          coverHeight: siteData?.coverHeight !== undefined ? siteData.coverHeight : 300,
          coverZoom: siteData?.coverZoom !== undefined ? siteData.coverZoom : 100,
          coverPositionY: siteData?.coverPositionY !== undefined ? siteData.coverPositionY : 50,
          coverPositionX: siteData?.coverPositionX !== undefined ? siteData.coverPositionX : 50,
          enableLiveWidget: siteData?.enableLiveWidget !== undefined ? siteData.enableLiveWidget : (isDfazz || isElox),
          liveWidgetStatus: siteData?.liveWidgetStatus || (isDfazz ? '🟢 En Live au Bar Le Club VIP' : (isElox ? '🟢 En Tournée / Liège • Bruxelles • Dinant' : '')),
          customLinks: siteData?.customLinks || previewData?.customLinks || undefined
        };

        const defaultFrontMap: Record<string, string> = {
          tshirt: '/assets/tshirt-black-JHK170.png',
          tshirt_basic: '/assets/tshirt-grey-JHK170.png',
          polo: '/assets/polo-black-JHK510.png',
          sweat: '/assets/hoodie-black-JHK421.png',
          hoodie: '/assets/hoodie-black-JHK421.png',
          tank_top: '/assets/tank-black-BYBB011.png',
          tshirt_oversize: '/assets/tshirt-black-NX7200.png'
        };

        const defaultBackMap: Record<string, string> = {
          tshirt: '/assets/tshirt-black-JHK170-dos.png',
          tshirt_basic: '/assets/tshirt-grey-JHK170-dos.png',
          polo: '/assets/polo-black-JHK510-dos.png',
          sweat: '/assets/hoodie-black-JHK421-dos.png',
          hoodie: '/assets/hoodie-black-JHK421-dos.png',
          tank_top: '/assets/tank-black-BYBB011-dos.png',
          tshirt_oversize: '/assets/tshirt-black-NX7200-dos.png'
        };

        let parsedProducts: ProductItem[] = [];

        const isBackUrl = (u?: string | null) => {
          if (!u || typeof u !== 'string') return false;
          const lower = u.toLowerCase();
          if (lower.includes('front') || lower.includes('face') || lower.includes('recto') || lower.includes('tfront') || lower.includes('pfront') || lower.includes('hfront') || lower.includes('tankfront') || lower.includes('heavyfront')) {
            return false;
          }
          return /(back|dos|verso|tback|pback|hback|tankback|heavyback)/i.test(lower);
        };

        const isFrontUrl = (u?: string | null) => {
          if (!u || typeof u !== 'string') return false;
          const lower = u.toLowerCase();
          if (lower.includes('back') || lower.includes('dos') || lower.includes('verso') || lower.includes('tback') || lower.includes('pback') || lower.includes('hback') || lower.includes('tankback') || lower.includes('heavyback')) {
            return false;
          }
          return /(front|face|recto|tfront|pfront|hfront|tankfront|heavyfront)/i.test(lower);
        };

        const safeStr = (v: any): string | null => (typeof v === 'string' && v.trim() !== '') ? v : null;

        if (items && items.length > 0) {
          const grouped: Record<string, ProductItem> = {};
          items.forEach((it: any) => {
            let g = (it.garment || it.category || '').toLowerCase();
            if (g === 'sweatshirt' || g === 'hoodie') g = 'sweat';
            if (!g) {
              if (it.id?.includes('polo')) g = 'polo';
              else if (it.id?.includes('tank')) g = 'tank_top';
              else if (it.id?.includes('heavy')) g = 'tshirt_oversize';
              else if (it.id?.includes('tb') || it.id?.includes('basic')) g = 'tshirt_basic';
              else if (it.id?.includes('sweat') || it.id?.includes('hoodie')) g = 'sweat';
              else if (it.id?.includes('cap') || it.id?.includes('casquette')) g = 'cap';
              else if (it.id?.includes('tote') || it.id?.includes('sac')) g = 'tote_bag';
              else if (it.id?.includes('card')) g = 'business_card';
              else g = 'tshirt';
            }
            if (g === 'business_card' || g === 'card') return; // Exclure les cartes du merchandising textile

            const isBack = it.view === 'back' || (typeof it.id === 'string' && isBackUrl(it.id)) || (typeof it.title === 'string' && it.title.toUpperCase().includes('DOS'));
            const isWhite = it.color === 'Blanc' || it.color === 'white' || (typeof it.id === 'string' && it.id.toLowerCase().includes('white')) || (typeof it.title === 'string' && it.title.toLowerCase().includes('blanc')) || (typeof it.name === 'string' && it.name.toLowerCase().includes('blanc'));
            const itemKey = `${g}_${isWhite ? 'white' : 'black'}`;
            const colorName = isWhite ? 'Blanc' : 'Noir';
            const defaultName = g === 'polo' ? (isWhite ? 'Polo Blanc' : 'Polo Premium') : (g === 'sweat' ? (isWhite ? 'Hoodie Blanc' : 'Hoodie Premium') : (g === 'tank_top' ? (isWhite ? 'Débardeur Blanc' : 'Débardeur') : (g === 'tshirt_oversize' ? 'T-Shirt Heavyweight' : (g === 'cap' ? 'Casquette Officielle' : (g === 'tote_bag' ? 'Tote Bag Officiel' : (g === 'tshirt_basic' ? 'T-Shirt Léger' : (isWhite ? 'T-Shirt Blanc' : 'T-Shirt Premium')))))));

            const rawFront = safeStr(it.aiRemastered) || safeStr(it.ai) || safeStr(it.frontImageUrl) || safeStr(it.imageFront) || safeStr(it.imageUrl) || safeStr(it.realAiSnapshotUrl) || safeStr(it.imageStudio) || (idbImages[it.id] && !isBackUrl(idbImages[it.id]) ? idbImages[it.id] : null) || safeStr(it.mechanical) || safeStr(it.base);
            const candidateFront = (rawFront && !isBackUrl(rawFront)) ? rawFront : (idbImages[g === 'polo' ? 'pFront' : (g === 'sweat' ? 'hFront' : (g === 'tank_top' ? 'tankFront' : (g === 'tshirt_oversize' ? 'heavyFront' : 'tFront')))] || defaultFrontMap[g]);

            const rawBack = safeStr(it.aiRemasteredBack) || safeStr(it.aiBack) || safeStr(it.backImageUrl) || safeStr(it.imageBack) || (isBack ? (safeStr(it.aiRemastered) || safeStr(it.ai)) : null) || safeStr(it.realAiSnapshotUrl) || safeStr(it.imageUrl) || (idbImages[it.id] && !isFrontUrl(idbImages[it.id]) ? idbImages[it.id] : null) || safeStr(it.mechanicalBack) || safeStr(it.baseBack) || safeStr(it.mechanical) || safeStr(it.base);
            const candidateBack = (rawBack && !isFrontUrl(rawBack)) ? rawBack : (idbImages[g === 'polo' ? 'pBack' : (g === 'sweat' ? 'hBack' : (g === 'tank_top' ? 'tankBack' : (g === 'tshirt_oversize' ? 'heavyBack' : 'tBack')))] || defaultBackMap[g]);

            if (!grouped[itemKey]) {
              grouped[itemKey] = {
                id: `${g}-${isWhite ? 'white' : 'item'}-${it.id || Date.now()}`,
                name: (it.title && !it.title.includes('FACE') && !it.title.includes('DOS')) ? it.title : `${artistProfile.companyName} ${defaultName}`,
                price: it.price && it.price <= 60 ? it.price : (g === 'sweat' ? 49.00 : (g === 'polo' ? 39.00 : (g === 'tank_top' ? 27.99 : (g === 'tshirt_oversize' ? 34.99 : (g === 'cap' ? 24.99 : (g === 'tote_bag' ? 19.99 : (g === 'tshirt_basic' ? 25.00 : 29.99))))))),
                garment: g,
                color: colorName,
                colors: [colorName],
                ai: safeStr(it.aiRemastered) || safeStr(it.ai) || null,
                aiRemastered: safeStr(it.aiRemastered) || safeStr(it.ai) || null,
                frontImageUrl: isBack ? (defaultFrontMap[g] || defaultFrontMap.tshirt) : (candidateFront || defaultFrontMap[g]),
                backImageUrl: isBack ? (candidateBack || defaultBackMap[g]) : (defaultBackMap[g] || defaultBackMap.tshirt),
                sizes: (g === 'cap' || g === 'tote_bag') ? ['Unique'] : ['S', 'M', 'L', 'XL'],
                mechanical: safeStr(it.mechanical) || null,
                base: safeStr(it.base) || null,
              };
            } else {
              if (isBack) {
                if (candidateBack && candidateBack !== defaultBackMap[g]) {
                  grouped[itemKey].backImageUrl = candidateBack;
                }
              } else {
                if (candidateFront && candidateFront !== defaultFrontMap[g]) {
                  grouped[itemKey].frontImageUrl = candidateFront;
                  if (safeStr(it.aiRemastered) || safeStr(it.ai)) {
                    (grouped[itemKey] as any).ai = safeStr(it.aiRemastered) || safeStr(it.ai);
                    (grouped[itemKey] as any).aiRemastered = safeStr(it.aiRemastered) || safeStr(it.ai);
                  }
                }
                if (it.title && !it.title.includes('FACE') && !it.title.includes('DOS')) grouped[itemKey].name = it.title;
                if (it.price) grouped[itemKey].price = it.price <= 60 ? it.price : 49.00;
              }
              if (candidateFront && candidateFront !== defaultFrontMap[g]) {
                grouped[itemKey].frontImageUrl = candidateFront;
                if (safeStr(it.aiRemastered) || safeStr(it.ai)) {
                  (grouped[itemKey] as any).ai = safeStr(it.aiRemastered) || safeStr(it.ai);
                  (grouped[itemKey] as any).aiRemastered = safeStr(it.aiRemastered) || safeStr(it.ai);
                }
              }
              if (candidateBack && candidateBack !== defaultBackMap[g]) grouped[itemKey].backImageUrl = candidateBack;
              if (safeStr(it.mechanical)) (grouped[itemKey] as any).mechanical = safeStr(it.mechanical);
              if (safeStr(it.base)) (grouped[itemKey] as any).base = safeStr(it.base);
            }
          });
          parsedProducts = Object.values(grouped);
        }

        // Alignement avec prodsObj direct si présent
        if (prodsObj) {
          ['tshirt', 'polo', 'hoodie', 'sweat', 'tank_top', 'tshirt_oversize'].forEach(gKey => {
            const pEntry = prodsObj[gKey] || prodsObj[gKey === 'sweat' ? 'hoodie' : gKey];
            if (pEntry) {
              const targetG = (gKey === 'hoodie' || gKey === 'sweat') ? 'sweat' : gKey;
              let existing = parsedProducts.find(p => p.garment === targetG);
              const fImg = safeStr(pEntry.aiRemastered) || safeStr(pEntry.ai) || safeStr(pEntry.frontImageUrl) || safeStr(pEntry.imageFront) || safeStr(pEntry.imageUrl) || safeStr(pEntry.aiImageUrl) || safeStr(pEntry.mechanical) || safeStr(pEntry.base);
              const bImg = safeStr(pEntry.aiRemasteredBack) || safeStr(pEntry.aiBack) || safeStr(pEntry.backImageUrl) || safeStr(pEntry.imageBack) || safeStr(pEntry.mechanicalBack) || safeStr(pEntry.baseBack) || safeStr(pEntry.mechanical) || safeStr(pEntry.base);
              if (!existing && (fImg || bImg)) {
                existing = {
                  id: `${targetG}-pack`,
                  name: pEntry.name || `${artistProfile.companyName} ${targetG === 'polo' ? 'Polo Premium' : (targetG === 'sweat' ? 'Hoodie VIP' : (targetG === 'tank_top' ? 'Débardeur' : (targetG === 'tshirt_oversize' ? 'T-Shirt Heavyweight' : 'T-Shirt Premium')))}`,
                  price: (pEntry.price && pEntry.price <= 50) ? pEntry.price : (targetG === 'sweat' ? 49.00 : (targetG === 'polo' ? 39.00 : (targetG === 'tank_top' ? 27.99 : 29.99))),
                  garment: targetG,
                  ai: safeStr(pEntry.aiRemastered) || safeStr(pEntry.ai) || null,
                  aiRemastered: safeStr(pEntry.aiRemastered) || safeStr(pEntry.ai) || null,
                  frontImageUrl: fImg || defaultFrontMap[targetG],
                  backImageUrl: bImg || defaultBackMap[targetG],
                  sizes: ['S', 'M', 'L', 'XL'],
                  colors: ['Noir', 'Blanc'],
                  mechanical: safeStr(pEntry.mechanical) || null,
                  base: safeStr(pEntry.base) || null,
                };
                parsedProducts.push(existing);
              } else if (existing) {
                if (fImg && fImg !== defaultFrontMap[targetG]) {
                  existing.frontImageUrl = fImg;
                  if (safeStr(pEntry.aiRemastered) || safeStr(pEntry.ai)) {
                    (existing as any).ai = safeStr(pEntry.aiRemastered) || safeStr(pEntry.ai);
                    (existing as any).aiRemastered = safeStr(pEntry.aiRemastered) || safeStr(pEntry.ai);
                  }
                }
                if (bImg && bImg !== defaultBackMap[targetG]) {
                  existing.backImageUrl = bImg;
                }
                if (pEntry.price) existing.price = (pEntry.price <= 50) ? pEntry.price : 49.00;
                if (pEntry.name) existing.name = pEntry.name;
                if (safeStr(pEntry.mechanical)) (existing as any).mechanical = safeStr(pEntry.mechanical);
                if (safeStr(pEntry.base)) (existing as any).base = safeStr(pEntry.base);
              }
            }
          });
        }

        if (parsedProducts.length === 0) {
          parsedProducts = [
            {
              id: 'tshirt-pack',
              name: `${artistProfile.companyName} T-Shirt Premium`,
              price: 29.99,
              garment: 'tshirt',
              frontImageUrl: isDfazz ? '/dfazz_tshirt_front.jpg' : (idbImages['tFront'] || defaultFrontMap.tshirt),
              backImageUrl: isDfazz ? '/dfazz_tshirt_back.jpg' : (idbImages['tBack'] || defaultBackMap.tshirt),
              sizes: ['S', 'M', 'L', 'XL'],
              colors: ['Noir', 'Blanc']
            },
            {
              id: 'polo-pack',
              name: `${artistProfile.companyName} Polo Premium`,
              price: 35.00,
              garment: 'polo',
              frontImageUrl: isDfazz ? '/dfazz_polo_front.jpg' : (idbImages['pFront'] || defaultFrontMap.polo),
              backImageUrl: isDfazz ? '/dfazz_polo_back.jpg' : (idbImages['pBack'] || defaultBackMap.polo),
              sizes: ['S', 'M', 'L', 'XL'],
              colors: ['Noir', 'Blanc']
            },
            {
              id: 'hoodie-pack',
              name: `${artistProfile.companyName} Hoodie Premium`,
              price: 45.00,
              garment: 'sweat',
              frontImageUrl: isDfazz ? '/dfazz_hoodie_front.jpg' : (idbImages['hFront'] || defaultFrontMap.hoodie),
              backImageUrl: isDfazz ? '/dfazz_hoodie_back.jpg' : (idbImages['hBack'] || defaultBackMap.hoodie),
              sizes: ['S', 'M', 'L', 'XL'],
              colors: ['Noir', 'Blanc']
            }
          ];
        }

        return { artist: artistProfile, products: parsedProducts };
      }
    } catch (e) {
      console.warn("Direct Firestore load failed:", e);
    }
    return null;
  };

  const resolveUniversalAiProducts = (currentList: any[], targetId: string, companyName?: string) => {
    const sessionMockups = extractSessionMockups(targetId);

    let updatedList = (currentList || []).map((p: any) => {
      if (!p) return p;
      let pGarment = (p.garment || '').toLowerCase();
      if (pGarment === 'sweatshirt' || pGarment === 'hoodie') pGarment = 'sweat';
      if (!pGarment) {
        const idLower = (p.id || '').toLowerCase();
        if (idLower.includes('tank')) pGarment = 'tank_top';
        else if (idLower.includes('heavy')) pGarment = 'tshirt_oversize';
        else if (idLower.includes('polo')) pGarment = 'polo';
        else if (idLower.includes('hoodie') || idLower.includes('sweat')) pGarment = 'sweat';
        else if (idLower.includes('cap')) pGarment = 'cap';
        else if (idLower.includes('tote')) pGarment = 'tote_bag';
        else pGarment = 'tshirt';
      }

      const isWhite = p.color === 'Blanc' || p.color === 'white' || (typeof p.id === 'string' && p.id.toLowerCase().includes('white')) || (typeof p.name === 'string' && p.name.toLowerCase().includes('blanc'));
      const pColor = isWhite ? 'Blanc' : (p.color || 'Noir');
      const { frontCandidates, backCandidates } = getMerchSlotCandidates(p.id || '', pGarment, pColor);

      const mFront = sessionMockups.find(m => {
        if (!m || m.view === 'back' || isBackViewUrl(m.id)) return false;
        const mId = (m.id || '').toLowerCase();
        if (frontCandidates.some(c => mId === c.toLowerCase() || mId.includes(c.toLowerCase()))) return true;
        const mGarment = (m.garment || '').toLowerCase();
        const mColor = m.color || (mId.includes('white') ? 'Blanc' : 'Noir');
        return mGarment === pGarment && mColor === pColor;
      });

      const mBack = sessionMockups.find(m => {
        if (!m || (m.view !== 'back' && !isBackViewUrl(m.id))) return false;
        const mId = (m.id || '').toLowerCase();
        if (backCandidates.some(c => mId === c.toLowerCase() || mId.includes(c.toLowerCase()))) return true;
        const mGarment = (m.garment || '').toLowerCase();
        const mColor = m.color || (mId.includes('white') ? 'Blanc' : 'Noir');
        return mGarment === pGarment && mColor === pColor;
      });

      const safeStr = (v: any): string | null => (typeof v === 'string' && v.trim() !== '') ? v : null;

      const mFrontCandidate = safeStr(mFront?.aiRemastered) || safeStr(mFront?.ai) || (isAiRenderUrl(mFront?.frontImageUrl || mFront?.imageUrl || mFront?.url) ? (mFront?.frontImageUrl || mFront?.imageUrl || mFront?.url) : null) || safeStr(mFront?.frontImageUrl) || safeStr(mFront?.imageFront) || safeStr(mFront?.imageUrl) || safeStr(mFront?.url) || safeStr(mFront?.mechanical) || safeStr(mFront?.base);
      const mBackCandidate = safeStr(mBack?.aiRemasteredBack) || safeStr(mBack?.aiBack) || safeStr(mBack?.aiRemastered) || safeStr(mBack?.ai) || (isAiRenderUrl(mBack?.backImageUrl || mBack?.imageUrl || mBack?.url) ? (mBack?.backImageUrl || mBack?.imageUrl || mBack?.url) : null) || safeStr(mBack?.backImageUrl) || safeStr(mBack?.imageBack) || safeStr(mBack?.imageUrl) || safeStr(mBack?.url) || safeStr(mFront?.aiRemasteredBack) || safeStr(mFront?.aiBack) || safeStr(mBack?.mechanicalBack) || safeStr(mBack?.baseBack) || safeStr(mBack?.mechanical) || safeStr(mBack?.base);

      let aiFront = mFrontCandidate || safeStr(p.aiRemastered) || safeStr(p.ai) || safeStr(p.frontImageUrl) || safeStr(p.imageUrl) || safeStr(p.mechanical) || safeStr(p.base);
      let aiBack = mBackCandidate || safeStr(p.aiRemasteredBack) || safeStr(p.aiBack) || safeStr(p.backImageUrl) || safeStr(p.mechanicalBack) || safeStr(p.baseBack) || safeStr(p.mechanical) || safeStr(p.base);

      if (aiFront && typeof aiFront === 'string' && (aiFront.includes('snapshot') || aiFront.includes('jhk') || aiFront.includes('clubvision_tshirt_front') || aiFront.includes('clubvision_polo_front') || aiFront.includes('clubvision_hoodie_front'))) {
        aiFront = mFrontCandidate || null;
      }
      if (aiBack && typeof aiBack === 'string' && (aiBack.includes('snapshot') || aiBack.includes('jhk') || aiBack.includes('clubvision_tshirt_back') || aiBack.includes('clubvision_polo_back') || aiBack.includes('clubvision_hoodie_back'))) {
        aiBack = mBackCandidate || null;
      }

      const updated = { ...p, garment: pGarment, color: pColor };
      if (aiFront) {
        updated.ai = aiFront;
        updated.aiRemastered = aiFront;
        updated.frontImageUrl = aiFront;
        updated.imageFront = aiFront;
        updated.imageUrl = aiFront;
        updated.images = { ...(updated.images || {}), front: aiFront, face: aiFront, recto: aiFront };
      }
      if (aiBack) {
        updated.aiBack = aiBack;
        updated.aiRemasteredBack = aiBack;
        updated.backImageUrl = aiBack;
        updated.imageBack = aiBack;
        updated.images = { ...(updated.images || {}), back: aiBack, dos: aiBack, verso: aiBack };
      }
      if (safeStr(mFront?.mechanical || p.mechanical)) updated.mechanical = safeStr(mFront?.mechanical || p.mechanical);
      if (safeStr(mFront?.base || p.base)) updated.base = safeStr(mFront?.base || p.base);
      return updated;
    });

    const brandName = companyName || 'Collection';

    sessionMockups.forEach(m => {
      if (!m || m.view === 'back' || isBackViewUrl(m.id)) return;
      const mGarment = (m.garment || 'tshirt').toLowerCase();
      const isWhite = m.color === 'Blanc' || (typeof m.id === 'string' && m.id.toLowerCase().includes('white')) || (typeof m.title === 'string' && m.title.toLowerCase().includes('blanc'));
      const mColor = isWhite ? 'Blanc' : 'Noir';

      const exists = updatedList.some((p: any) => {
        if (!p) return false;
        if (p.id?.toLowerCase() === m.id?.toLowerCase()) return true;
        const pG = (p.garment || '').toLowerCase();
        const pC = p.color || (p.name?.toLowerCase().includes('blanc') || p.id?.toLowerCase().includes('white') ? 'Blanc' : 'Noir');
        return pG === mGarment && pC === mColor;
      });

      if (!exists) {
        const mBack = sessionMockups.find(mb => {
          if (!mb || (mb.view !== 'back' && !isBackViewUrl(mb.id))) return false;
          const mbGarment = (mb.garment || '').toLowerCase();
          const mbColor = mb.color || (mb.id?.toLowerCase().includes('white') ? 'Blanc' : 'Noir');
          if (m.id && mb.id) {
            const baseM = m.id.toLowerCase().replace(/front/i, '');
            const baseMb = mb.id.toLowerCase().replace(/back/i, '');
            if (baseM === baseMb) return true;
          }
          return mbGarment === mGarment && mbColor === mColor;
        });

        updatedList.push(createDynamicMerchProduct(m, mBack, brandName));
      }
    });

    return updatedList;
  };


  useEffect(() => {
    async function fetchArtistData() {
      if (!targetIdentifier) return;

      const swrKey = `fast_artist_cache_v95_${targetIdentifier}`;
      try {
        // Clear all previous artist cache versions to remove any stale references
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith('fast_artist_cache_') && k !== swrKey) {
            keysToRemove.push(k);
          }
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));
      } catch (e) { }

      const isDfazz = targetIdentifier === 'fabrizio' || targetIdentifier === 'djdfazz' || targetIdentifier === 'dfazz' || targetIdentifier === 'audit-8f198p5' || targetIdentifier === 'guest_ms3ijgnco2xnid' || targetIdentifier.toLowerCase().includes('dfazz');
      const isVision = targetIdentifier === 'clubvisionroom' || targetIdentifier === 'visionroom' || targetIdentifier === '13ansvr' || targetIdentifier.toLowerCase().includes('vision');

      const sanitizeProductList = (rawList: any[]) => {
        let list = (rawList || []).map((p: any) => {
          let pPrice = p.price;
          const isHoodieProd = p.garment === 'sweat' || p.garment === 'hoodie' || (p.title && p.title.toLowerCase().includes('hoodie')) || (p.name && p.name.toLowerCase().includes('hoodie')) || (typeof p.id === 'string' && (p.id.includes('hoodie') || p.id.includes('hFront')));
          if (isHoodieProd && (!pPrice || pPrice > 50)) {
            pPrice = 49.00;
          }
          return { ...p, price: pPrice };
        });

        const activeBrandName = profileMeta.displayName || artist?.companyName || targetIdentifier;
        list = resolveUniversalAiProducts(list, targetIdentifier, activeBrandName);

        return list.map((product: any) => {
          const safeStr = (v: any): string | null => (typeof v === 'string' && v.trim() !== '') ? v : null;
          const displayImage = (
            safeStr(product.aiRemastered) ||
            safeStr(product.ai) ||
            safeStr(product.frontImageUrl) ||
            safeStr(product.imageFront) ||
            safeStr(product.imageUrl) ||
            safeStr(product.mechanical) ||
            safeStr(product.base)
          );

          console.log("[DEBUG_MERCH_RENDER]", {
            productId: product.id,
            garment: product.garment,
            color: product.color,
            aiRemastered: product.aiRemastered,
            ai: product.ai,
            frontImageUrl: product.frontImageUrl,
            backImageUrl: product.backImageUrl,
            displaySelected: displayImage
          });

          return product;
        });
      };

      // TIER 1 : FAST-PATH METADATA RESOLUTION (< 50ms)
      const fetchTier1 = async () => {
        const cleanId = targetIdentifier.replace(/^audit-/, '');
        const normId = targetIdentifier.toLowerCase().replace(/[^a-z0-9]/g, '');

        try {
          const [scById, scByCleanId, scBySlug, prevById, prevByCleanId, prevByCompanySlug] = await Promise.all([
            getDoc(doc(db, 'SiteConfigs', targetIdentifier)).catch(() => null),
            cleanId !== targetIdentifier ? getDoc(doc(db, 'SiteConfigs', cleanId)).catch(() => null) : Promise.resolve(null),
            normId ? getDocs(query(collection(db, 'SiteConfigs'), where('slug', '==', normId), limit(1))).catch(() => null) : Promise.resolve(null),
            getDoc(doc(db, 'anonymous_previews', targetIdentifier)).catch(() => null),
            cleanId !== targetIdentifier ? getDoc(doc(db, 'anonymous_previews', cleanId)).catch(() => null) : Promise.resolve(null),
            normId ? getDocs(query(collection(db, 'anonymous_previews'), where('companySlug', '==', normId), limit(1))).catch(() => null) : Promise.resolve(null)
          ]);

          let d: any = null;
          if (scById?.exists()) d = scById.data();
          else if (scByCleanId?.exists()) d = scByCleanId.data();
          else if (scBySlug && !scBySlug.empty) d = scBySlug.docs[0].data();
          else if (prevById?.exists()) d = prevById.data();
          else if (prevByCleanId?.exists()) d = prevByCleanId.data();
          else if (prevByCompanySlug && !prevByCompanySlug.empty) d = prevByCompanySlug.docs[0].data();

          if (d) {
            const clean = targetIdentifier.replace(/^audit-/, '').replace(/[-_]/g, ' ').trim();
            const displayName = (d.companyName || d.displayName || clean).trim();
            const rawA = typeof d.logoA === 'string' ? d.logoA : (d.logoA?.adaptedRemastered || d.logoA?.adapted || d.logoA?.original);
            const logoUrl = d.logoUrl || d.auditLogoUrl || d.logoAdaptedUrl || rawA || d.avatar || undefined;
            const primaryColor = d.accentColor || '#dc2626';
            const theme = d.theme || 'dark';
            const initials = displayName.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase() || 'P';

            const resolvedMeta: ProfileMeta = {
              displayName,
              logoUrl,
              primaryColor,
              theme,
              initials,
              isReady: true
            };

            setProfileMeta(prev => ({ ...prev, ...resolvedMeta }));

            try {
              sessionStorage.setItem(`signaid_meta_${targetIdentifier}`, JSON.stringify(resolvedMeta));
              localStorage.setItem(`signaid_meta_${targetIdentifier}`, JSON.stringify(resolvedMeta));
            } catch { }
          }
        } catch (e) {
          console.warn('[Tier 1 Metadata Fetch]:', e);
        }
      };

      // Déclenchement immédiat du Tier 1 (Fast-Path)
      fetchTier1();

      // TIER 2 : FULL MERCH CATALOG & ASSETS PIPELINE
      const cached = localStorage.getItem(swrKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed && parsed.artist) {
            if (!isDfazz && (parsed.artist.companyName?.toUpperCase().includes('D-FAZZ') || parsed.artist.logoUrl?.toLowerCase().includes('dfazz'))) {
              localStorage.removeItem(swrKey);
              setLoading(true);
            } else {
              const rawA = typeof parsed.artist.logoA === 'string' ? parsed.artist.logoA : (parsed.artist.logoA?.adaptedRemastered || parsed.artist.logoA?.adapted || parsed.artist.logoA?.original);
              const effLogo = parsed.artist.logoUrl || parsed.artist.auditLogoUrl || parsed.artist.logoAdaptedUrl || rawA || (parsed.artist as any).avatar;
              setArtist(parsed.artist);
              setProducts(sanitizeProductList(parsed.products || []));
              setProfileMeta({
                displayName: parsed.artist.companyName || profileMeta.displayName,
                logoUrl: effLogo,
                primaryColor: parsed.artist.accentColor || profileMeta.primaryColor,
                theme: parsed.artist.theme || profileMeta.theme,
                initials: profileMeta.initials,
                isReady: true
              });
              setLoading(false);
            }
          }
        } catch (e) { }
      } else {
        setLoading(true);
      }
      setError(null);

      const fetchWithTimeout = async (url: string, timeoutMs = 2500) => {
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
        const safeCacheSave = (key: string, val: any) => {
          try {
            localStorage.setItem(key, JSON.stringify(val));
          } catch (storageErr) {
            try {
              const keysToRemove: string[] = [];
              for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (k && k.startsWith('fast_artist_cache_')) {
                  keysToRemove.push(k);
                }
              }
              keysToRemove.forEach(k => localStorage.removeItem(k));
              localStorage.setItem(key, JSON.stringify(val));
            } catch (e2) { }
          }
        };

        const timestamp = Date.now();
        const primaryUrl = `https://us-central1-signaid-prod.cloudfunctions.net/getUserBySlug?slug=${encodeURIComponent(targetIdentifier)}&_t=${timestamp}`;
        const secondaryUrl = `https://getuserbyslug-r5zxdnaotq-uc.a.run.app?slug=${encodeURIComponent(targetIdentifier)}&_t=${timestamp}`;

        let response: Response | null = null;
        try {
          response = await fetchWithTimeout(primaryUrl, 2500);
        } catch (e) {
          try {
            response = await fetchWithTimeout(secondaryUrl, 2500);
          } catch (e2) { }
        }

        if (response && response.ok) {
          const data = await response.json();
          if (data.success && data.artist) {
            const mergedArtist = {
              ...data.artist,
              livePhotoUrls: data.artist.livePhotoUrls || (data.artist.livePhotoUrl ? [data.artist.livePhotoUrl] : [])
            };
            const cleanProds = sanitizeProductList(data.products || []);
            const rawA = typeof mergedArtist.logoA === 'string' ? mergedArtist.logoA : (mergedArtist.logoA?.adaptedRemastered || mergedArtist.logoA?.adapted || mergedArtist.logoA?.original);
            const effLogo = mergedArtist.logoUrl || mergedArtist.auditLogoUrl || mergedArtist.logoAdaptedUrl || rawA || (mergedArtist as any).avatar;
            setArtist(mergedArtist);
            setProducts(cleanProds);
            setProfileMeta({
              displayName: mergedArtist.companyName || profileMeta.displayName,
              logoUrl: effLogo,
              primaryColor: mergedArtist.accentColor || profileMeta.primaryColor,
              theme: mergedArtist.theme || profileMeta.theme,
              initials: profileMeta.initials,
              isReady: true
            });
            safeCacheSave(swrKey, { artist: mergedArtist, products: cleanProds });
            setLoading(false);
            return;
          }
        }

        // Direct Firestore fallback with strict 2s timeout ONLY if API fails
        const directPromise = loadDirectFromFirestore(targetIdentifier);
        const directTimeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 2000));
        const directResult = await Promise.race([directPromise, directTimeout]);

        if (directResult) {
          const cleanProds = sanitizeProductList(directResult.products);
          const rawA = typeof directResult.artist.logoA === 'string' ? directResult.artist.logoA : ((directResult.artist.logoA as any)?.adaptedRemastered || (directResult.artist.logoA as any)?.adapted || (directResult.artist.logoA as any)?.original);
          const effLogo = directResult.artist.logoUrl || directResult.artist.auditLogoUrl || directResult.artist.logoAdaptedUrl || rawA || (directResult.artist as any).avatar;
          setArtist(directResult.artist);
          setProducts(cleanProds);
          setProfileMeta({
            displayName: directResult.artist.companyName || profileMeta.displayName,
            logoUrl: effLogo,
            primaryColor: directResult.artist.accentColor || profileMeta.primaryColor,
            theme: directResult.artist.theme || profileMeta.theme,
            initials: profileMeta.initials,
            isReady: true
          });
          safeCacheSave(swrKey, { artist: directResult.artist, products: cleanProds });
          setLoading(false);
          return;
        }

        throw new Error(`Ce profil n'est pas disponible actuellement.`);
      } catch (err: any) {
        console.warn('Error loading profile from API:', err);
        setArtist(null);
        setProducts([]);
        setError("Ce profil n'est pas disponible ou est en cours de configuration.");
      } finally {
        setLoading(false);
      }


    }

    fetchArtistData();
  }, [slug, uidParam, overrideSlug, domainSlug, targetIdentifier]);

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
        previewImageUrl: (product as any).aiRemastered || (product as any).ai || product.frontImageUrl || product.imageUrl || (product as any).mechanical || (product as any).base
      }];
    });
  };

  const removeFromCart = (cartId: string) => {
    setCart(prev => prev.filter(item => item.id !== cartId));
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

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
      const response = await fetch('https://us-central1-signaid-prod.cloudfunctions.net/createCheckout', {
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

      window.location.href = data.checkoutUrl;
    } catch (err: any) {
      console.error('Checkout error:', err);
      setCheckoutError(err.message || 'Erreur lors du paiement');
      setIsCheckingOut(false);
    }
  };

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

    const bookingLink = artist.customLinks?.find(l => l.type === 'booking' || l.id === 'link_booking');
    const bookingButtonEmail = bookingLink?.url ? bookingLink.url.replace(/^mailto:/i, '').trim() : '';

    const payload = {
      artistSlug: artist.slug,
      artistId: artist.id,
      bookingRecipientEmail: bookingButtonEmail || artist.contactEmail,
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

  useEffect(() => {
    if (!artist) return;
    const artistName = artist.companyName || targetIdentifier?.toUpperCase() || 'Artiste';
    const pageTitle = `${artistName} — Portail & Merchandising`;
    document.title = pageTitle;

    const desc = artist.presentation || `${artistName} — Portail officiel, liens directs et collection merchandising.`;
    const rawLogoA = typeof artist.logoA === 'string' ? artist.logoA : ((artist.logoA as any)?.adaptedRemastered || (artist.logoA as any)?.adapted || (artist.logoA as any)?.original);
    const effLogoForMeta = artist.logoUrl || artist.auditLogoUrl || artist.logoAdaptedUrl || rawLogoA || '';
    const img = (artist.livePhotoUrls && artist.livePhotoUrls[0]) || artist.livePhotoUrl || effLogoForMeta || 'https://signaid.eu/logo.png';
    const fullImg = img.startsWith('/') ? `https://signaid.eu${img}` : img;
    const pageUrl = window.location.href;

    const setMeta = (attr: string, key: string, content: string) => {
      let el = document.querySelector(`meta[${attr}="${key}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    setMeta('name', 'description', desc);
    setMeta('property', 'og:title', pageTitle);
    setMeta('property', 'og:description', desc);
    setMeta('property', 'og:image', fullImg);
    setMeta('property', 'og:url', pageUrl);
    setMeta('property', 'og:type', 'website');
    setMeta('name', 'twitter:card', 'summary_large_image');
    setMeta('name', 'twitter:title', pageTitle);
    setMeta('name', 'twitter:description', desc);
    setMeta('name', 'twitter:image', fullImg);
  }, [artist, targetIdentifier]);

  if (loading) {
    const rawLoadingA = typeof artist?.logoA === 'string' ? artist.logoA : ((artist?.logoA as any)?.adaptedRemastered || (artist?.logoA as any)?.adapted || (artist?.logoA as any)?.original);
    const displayName = artist?.companyName || profileMeta.displayName || targetIdentifier.replace(/^audit-/, '').replace(/[-_]/g, ' ').toUpperCase();
    const displayLogo = artist?.logoUrl || artist?.auditLogoUrl || artist?.logoAdaptedUrl || rawLoadingA || profileMeta.logoUrl;
    const displayInitials = profileMeta.initials || displayName.slice(0, 2).toUpperCase();
    const accentColor = artist?.accentColor || profileMeta.primaryColor || '#dc2626';

    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#09090b',
        color: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1.5rem',
        fontFamily: '"Inter", system-ui, sans-serif',
        userSelect: 'none'
      }}>
        <style>{`
          @keyframes profileBreathing {
            0%, 100% { opacity: 0.45; transform: scale(0.96); }
            50% { opacity: 1; transform: scale(1.03); }
          }
          @keyframes profileBarShimmer {
            0% { left: -40%; }
            100% { left: 100%; }
          }
        `}</style>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', maxWidth: '360px', width: '100%', textAlign: 'center' }}>
          {displayLogo ? (
            <div style={{
              width: '130px',
              height: '130px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: 'profileBreathing 1.8s ease-in-out infinite'
            }}>
              <img
                src={displayLogo}
                alt={displayName}
                style={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  objectFit: 'contain',
                  filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.6))'
                }}
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
          ) : (
            <div style={{
              width: '96px',
              height: '96px',
              borderRadius: '50%',
              backgroundColor: '#18181b',
              border: `1px solid ${accentColor}66`,
              boxShadow: `0 0 25px ${accentColor}26`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#f4f4f5',
              fontSize: '1.75rem',
              fontWeight: 800,
              letterSpacing: '0.05em',
              animation: 'profileBreathing 1.8s ease-in-out infinite'
            }}>
              {displayInitials}
            </div>
          )}

          <div style={{
            width: '120px',
            height: '2px',
            backgroundColor: '#27272a',
            borderRadius: '9999px',
            overflow: 'hidden',
            position: 'relative'
          }}>
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              height: '100%',
              width: '40%',
              backgroundColor: accentColor,
              borderRadius: '9999px',
              animation: 'profileBarShimmer 1.5s ease-in-out infinite'
            }} />
          </div>

          <span style={{
            color: '#71717a',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.25em',
            textTransform: 'uppercase',
            textAlign: 'center'
          }}>
            {displayName}
          </span>
        </div>
      </div>
    );
  }




  if (error || !artist) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#070b14',
        color: '#ffffff',
        fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
        padding: '2rem',
        textAlign: 'center'
      }}>
        <div style={{
          maxWidth: '460px',
          width: '100%',
          backgroundColor: 'rgba(15, 23, 42, 0.85)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '28px',
          padding: '2.5rem 2rem',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(20px)'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: 'rgba(255, 85, 0, 0.15)',
            border: '1px solid rgba(255, 85, 0, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.8rem',
            margin: '0 auto 1.5rem auto'
          }}>
            🔍
          </div>

          <h2 style={{ fontSize: '1.4rem', fontWeight: 900, marginBottom: '0.75rem', color: '#ffffff' }}>
            Profil non disponible
          </h2>

          <p style={{ color: '#94a3b8', fontSize: '0.92rem', lineHeight: 1.6, marginBottom: '2rem' }}>
            {error || "Ce profil n'est pas disponible ou est en cours de configuration."}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <a
              href="/"
              style={{
                backgroundColor: '#ffffff',
                color: '#0f172a',
                padding: '0.85rem 1.5rem',
                borderRadius: '14px',
                fontWeight: 800,
                fontSize: '0.9rem',
                textDecoration: 'none',
                transition: 'all 0.2s ease',
                boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
              }}
            >
              🏠 Retour à l'accueil
            </a>
            {Boolean(auth.currentUser?.email && (auth.currentUser.email === 'logosigneed@gmail.com' || auth.currentUser.email === 'nicolas@signaid.be')) && (
              <a
                href="/vitrine-admin"
                style={{
                  backgroundColor: 'rgba(255, 85, 0, 0.15)',
                  color: '#ff7733',
                  border: '1px solid rgba(255, 85, 0, 0.35)',
                  padding: '0.85rem 1.5rem',
                  borderRadius: '14px',
                  fontWeight: 800,
                  fontSize: '0.88rem',
                  textDecoration: 'none',
                  transition: 'all 0.2s ease'
                }}
              >
                👑 Espace Administration
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  const pageBg = isLight ? '#f8fafc' : '#050505';
  const mainTextColor = isLight ? '#0f172a' : '#ffffff';
  const subTextColor = isLight ? '#475569' : '#c5c5c5';
  const bioBg = isLight ? '#ffffff' : 'rgba(255, 255, 255, 0.03)';
  const bioBorder = isLight ? '1px solid rgba(15, 23, 42, 0.12)' : '1px solid rgba(255, 255, 255, 0.08)';
  const headerBorder = isLight ? '1px solid #e2e8f0' : '1px solid #1a1a1a';

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

  const rawLogoA = typeof artist.logoA === 'string'
    ? artist.logoA
    : ((artist.logoA as any)?.adaptedRemastered || (artist.logoA as any)?.adapted || (artist.logoA as any)?.original || '');
  const currentEffectiveLogo = artist.logoUrl || artist.auditLogoUrl || artist.logoAdaptedUrl || rawLogoA || '';

  return (
    <div style={{ minHeight: '100vh', backgroundColor: pageBg, color: mainTextColor, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', width: '100%', overflowX: 'hidden' }}>

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
          max-width: 1200px !important;
          width: 100% !important;
          margin: 0 auto !important;
          padding: 2rem 1.5rem 4rem 1.5rem !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          box-sizing: border-box !important;
        }

        .profile-main-layout > section {
          width: 100% !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
        }

        @media (min-width: 900px) {
          .profile-main-layout.has-cart {
            grid-template-columns: 1fr 380px !important;
          }
        }

        .merch-responsive-grid {
          display: flex !important;
          flex-wrap: wrap !important;
          justify-content: center !important;
          align-items: stretch !important;
          gap: 1.5rem !important;
          width: 100% !important;
          max-width: 1150px !important;
          margin: 0 auto !important;
        }

        .merch-responsive-grid > * {
          flex: 1 1 280px !important;
          max-width: 340px !important;
        }

        @media (max-width: 640px) {
          .merch-responsive-grid {
            gap: 1.25rem !important;
          }

          .merch-responsive-grid > * {
            flex: 1 1 100% !important;
            max-width: 100% !important;
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

      {paymentSuccess && (
        <div style={{ backgroundColor: '#10b981', color: '#fff', padding: '1rem', textAlign: 'center', fontWeight: 'bold', fontSize: '0.9rem' }}>
          ✓ Paiement confirmé ! Votre commande a été transmise à l'atelier de production.
        </div>
      )}
      {paymentCanceled && (
        <div style={{ backgroundColor: '#ef4444', color: '#fff', padding: '1rem', textAlign: 'center', fontWeight: 'bold', fontSize: '0.9rem' }}>
          ✕ Le paiement a été annulé. Aucun montant n'a été débité.
        </div>
      )}

      {/* HEADER ARTISTE BIO & LINKTREE */}
      <header className="artist-header-box" style={{ borderBottom: headerBorder, textAlign: 'center' }}>

        {/* 1. PHOTO D'AMBIANCE / BANNIÈRE AVEC LOGO DANS LA BULLE AVATAR (TOTALEMENT OPTIONNELLE) */}
        {(() => {
          const validPhotos = (artist.livePhotoUrls && artist.livePhotoUrls.length > 0
            ? artist.livePhotoUrls
            : (artist.livePhotoUrl ? [artist.livePhotoUrl] : []))
            .filter((u: string) => typeof u === 'string' && u.trim().length > 10 && u !== 'none');
          const hasLivePhotos = validPhotos.length > 0;

          const scale = (artist.logoScale || 100) / 100;
          const maxLogoH = Math.round(92 * scale);
          const maxLogoW = Math.round(120 * scale);
          const overlayMode = artist.logoOverlayColor || 'auto';
          const isWhiteForced = overlayMode === 'white';
          const isBlackForced = overlayMode === 'black';

          const rawLogoA = typeof artist.logoA === 'string' ? artist.logoA : ((artist.logoA as any)?.adaptedRemastered || (artist.logoA as any)?.adapted || (artist.logoA as any)?.original || '');
          const currentEffectiveLogo = artist.logoUrl || artist.auditLogoUrl || artist.logoAdaptedUrl || rawLogoA || '';
          const effLogoLower = currentEffectiveLogo.toLowerCase();
          const isLogoWhiteFile = effLogoLower.includes('white') ||
            effLogoLower.includes('blanc') ||
            effLogoLower.includes('aaronh') ||
            effLogoLower.includes('dokiin') ||
            effLogoLower.includes('clubvision') ||
            effLogoLower.includes('mt074') ||
            !!artist.invertLogoInLightMode ||
            artist.logoOverlayColor === 'white';
          const isLogoBlackFile = effLogoLower.includes('black') || effLogoLower.includes('noir');

          // Mode Jour (7h-22h / isLight):
          // Le fond du cercle est BLANC (#ffffff).
          // Mode Nuit (22h-7h / !isLight):
          // Le fond du cercle est NOIR (rgba(10, 10, 15, 0.95)).
          const circleBg = isLight
            ? (isWhiteForced ? 'rgba(10, 10, 15, 0.95)' : '#ffffff')
            : (isBlackForced ? '#ffffff' : 'rgba(10, 10, 15, 0.95)');

          const circleBorder = isLight
            ? (artist.accentColor ? `3px solid ${artist.accentColor}` : '3px solid rgba(0, 0, 0, 0.12)')
            : (artist.accentColor ? `3px solid ${artist.accentColor}` : '3px solid rgba(255, 255, 255, 0.4)');

          const logoFilter = isLight
            ? ((isLogoWhiteFile && !isWhiteForced) || isBlackForced
              ? 'brightness(0) drop-shadow(0 2px 6px rgba(0,0,0,0.25))'
              : 'drop-shadow(0 2px 8px rgba(0,0,0,0.15))')
            : ((isLogoBlackFile && !isBlackForced) || isWhiteForced || isLogoWhiteFile
              ? (isLogoBlackFile ? 'brightness(0) invert(1) drop-shadow(0 2px 10px rgba(0,0,0,0.95))' : 'drop-shadow(0 2px 10px rgba(0,0,0,0.95))')
              : 'drop-shadow(0 2px 10px rgba(0,0,0,0.7))');

          // CAS 1 : Présence d'une photo d'ambiance -> Bannière avec bulle avatar chevauchante
          if (hasLivePhotos && validPhotos.length > 0) {
            return (
              <div style={{ position: 'relative', width: '100%', marginBottom: currentEffectiveLogo ? '3.8rem' : '1.5rem' }}>
                {/* IMAGE DE BANNIÈRE */}
                <ArtistPhotoCarousel
                  urls={validPhotos}
                  companyName={artist.companyName}
                  style={{ marginBottom: 0 }}
                  coverHeight={artist.coverHeight}
                  coverZoom={artist.coverZoom}
                  coverPositionY={artist.coverPositionY}
                  coverPositionX={artist.coverPositionX}
                />

                {/* LOGO PAR-DESSUS DANS UN CADRE ROND FIXE */}
                {currentEffectiveLogo && (
                  <div style={{
                    position: 'absolute',
                    bottom: '-46px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 10,
                    width: '145px',
                    height: '145px',
                    borderRadius: '50%',
                    backgroundColor: circleBg,
                    border: circleBorder,
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '12px',
                    boxShadow: '0 14px 35px rgba(0, 0, 0, 0.4)'
                  }}>
                    <img
                      src={getOptimizedImageUrl(processedAvatarUrl || currentEffectiveLogo, 500)}
                      alt={artist.companyName}
                      style={{
                        maxHeight: `${maxLogoH}px`,
                        maxWidth: `${maxLogoW}px`,
                        width: `${Math.round(85 * scale)}%`,
                        height: 'auto',
                        objectFit: 'contain',
                        filter: logoFilter,
                        transition: 'all 0.15s ease'
                      }}
                    />
                  </div>
                )}
              </div>
            );
          }

          // CAS 2 : Pas de photo d'ambiance -> Aucun conteneur / placeholder de bannière, bulle avatar centrée épurée
          if (currentEffectiveLogo) {
            return (
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                width: '100%',
                paddingTop: '1.25rem',
                marginBottom: '0.75rem'
              }}>
                <div style={{
                  width: '140px',
                  height: '140px',
                  borderRadius: '50%',
                  backgroundColor: circleBg,
                  border: circleBorder,
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '12px',
                  boxShadow: isLight ? '0 8px 24px rgba(0, 0, 0, 0.08)' : '0 12px 30px rgba(0, 0, 0, 0.5)'
                }}>
                  <img
                    src={getOptimizedImageUrl(processedAvatarUrl || currentEffectiveLogo, 500)}
                    alt={artist.companyName}
                    style={{
                      maxHeight: `${maxLogoH}px`,
                      maxWidth: `${maxLogoW}px`,
                      width: `${Math.round(85 * scale)}%`,
                      height: 'auto',
                      objectFit: 'contain',
                      filter: logoFilter,
                      transition: 'all 0.15s ease'
                    }}
                  />
                </div>
              </div>
            );
          }

          return null;
        })()}

        {/* 3. NOM DU PROFIL & SLOGAN (TYPOGRAPHIE FIDÈLE AU STUDIO ADMIN) */}
        <div style={{ marginBottom: '1.25rem', marginTop: (processedAvatarUrl || currentEffectiveLogo) ? '0.5rem' : '0' }}>
          {artist.companyName && artist.companyName.trim() !== '' && (
            <h1 className="artist-main-title" style={{ fontSize: 'clamp(1.4rem, 6vw, 2.2rem)', fontWeight: '900', letterSpacing: '-0.02em', margin: '0 0 0.25rem 0', textTransform: 'uppercase', color: mainTextColor, wordBreak: 'break-word' }}>
              {artist.companyName}
            </h1>
          )}
          {artist.activitySector && artist.activitySector.trim() !== '' && (
            <div className="artist-sector" style={{ fontSize: '0.88rem', color: isLight ? '#475569' : '#cbd5e1', fontWeight: 600, marginBottom: '0.5rem' }}>
              {artist.activitySector}
            </div>
          )}
        </div>

        {/* 4. BIO / PITCH EN CARTE VERRE FUMÉ */}
        {artist.presentation && (
          <div
            style={{
              background: isLight ? 'rgba(255, 255, 255, 0.85)' : 'rgba(15, 23, 42, 0.65)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: isLight ? '1px solid rgba(226, 232, 240, 0.8)' : '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '16px',
              padding: '1.25rem 1.5rem',
              margin: '0 auto 1.5rem auto',
              maxWidth: '540px',
              boxShadow: isLight ? '0 10px 25px -5px rgba(0, 0, 0, 0.05)' : '0 10px 30px -5px rgba(0, 0, 0, 0.5)',
              textAlign: 'center'
            }}
          >
            <p style={{
              margin: 0,
              fontSize: '0.92rem',
              lineHeight: 1.6,
              color: isLight ? '#334155' : '#cbd5e1',
              fontWeight: 500,
              letterSpacing: '0.01em'
            }}>
              {artist.presentation}
            </p>
          </div>
        )}

        {/* 5. BARRE DES RÉSEAUX SOCIAUX & STREAMING (PICTOGRAMMES RONDS SOUS LA BIO) */}
        {(() => {
          const rawSocials = artist.socials;
          const followItems: { id: string; name: string; url: string; platform: string; color: string; badge: any }[] = [];

          if (Array.isArray(rawSocials)) {
            rawSocials.forEach((s: any, idx: number) => {
              const isEnabled = s && s.enabled !== false;
              const rawUrl = s && typeof s.url === 'string' ? s.url.trim() : '';
              const platformName = s?.platform || s?.title || s?.type || '';

              if (isEnabled && rawUrl !== '' && platformName !== '') {
                const formattedUrl = formatSocialUrl(platformName, rawUrl);
                if (formattedUrl) {
                  if (!followItems.some(item => isPlatformMatch(item.platform, platformName))) {
                    const badge = getPlatformBadgeStyle(platformName, isLight);
                    followItems.push({
                      id: `social-${idx}-${platformName.toLowerCase()}`,
                      name: `Suivre sur ${platformName}`,
                      url: formattedUrl,
                      platform: platformName,
                      color: badge.color,
                      badge
                    });
                  }
                }
              }
            });
          }

          if (followItems.length === 0) return null;

          return (
            <div
              className="artist-social-icons-row"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexWrap: 'wrap',
                gap: '0.85rem',
                margin: '0 auto 1.75rem auto',
                padding: '0.25rem 0.5rem',
                maxWidth: '540px'
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
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    background: item.badge.bg,
                    color: item.badge.color,
                    border: item.badge.border,
                    boxShadow: item.badge.boxShadow,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textDecoration: 'none',
                    cursor: 'pointer',
                    flexShrink: 0,
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-3px) scale(1.12)';
                    if (item.badge.hoverBg) e.currentTarget.style.background = item.badge.hoverBg;
                    if (item.badge.hoverBorder) e.currentTarget.style.borderColor = item.badge.hoverBorder;
                    e.currentTarget.style.boxShadow = `0 6px 18px ${item.badge.hoverGlow}`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0) scale(1)';
                    e.currentTarget.style.background = item.badge.bg;
                    e.currentTarget.style.borderColor = item.badge.border;
                    e.currentTarget.style.boxShadow = item.badge.boxShadow;
                  }}
                >
                  <SocialIcon platform={item.platform} color={item.badge.color} size={20} />
                </a>
              ))}
            </div>
          );
        })()}

        {/* BOUTONS D'ACTION (LINKTREE & PERSONNALISABLES) */}
        {(() => {
          const effectiveLinks = (artist.customLinks && artist.customLinks.length > 0)
            ? artist.customLinks.filter(l => l.enabled !== false)
            : [
              {
                id: 'link_booking',
                title: 'Booking / Événement',
                type: 'booking',
                icon: '📅',
                enabled: true
              },
              ...(artist.whatsapp ? [{
                id: 'link_whatsapp',
                title: 'WhatsApp Direct',
                type: 'whatsapp',
                url: `https://wa.me/${artist.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Bonjour ${artist.companyName}, je vous contacte depuis votre vitrine.`)}`,
                icon: '💬',
                bgColor: '#25D366',
                enabled: true
              }] : []),
              ...(artist.contactEmail ? [{
                id: 'link_email',
                title: 'Contact Direct',
                type: 'email',
                url: `mailto:${artist.contactEmail}?subject=Contact depuis la vitrine ${encodeURIComponent(artist.companyName)}`,
                icon: '✉',
                enabled: true
              }] : [])
            ].filter(l => l.enabled !== false);

          if (effectiveLinks.length === 0) return null;

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', width: '100%', margin: '0 auto' }}>
              {effectiveLinks.map((link, idx) => {
                const isBooking = link.type === 'booking';
                const isWhatsApp = link.type === 'whatsapp';
                const isEmail = link.type === 'email';

                if (isBooking) {
                  return (
                    <button
                      key={link.id || idx}
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
                        backgroundColor: link.bgColor || artist.accentColor || '#ff3366',
                        border: 'none',
                        color: getContrastingTextColor(link.bgColor || artist.accentColor || '#ff3366', '#ffffff'),
                        borderRadius: '12px',
                        fontSize: '0.98rem',
                        fontWeight: '900',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        cursor: 'pointer',
                        boxShadow: `0 6px 20px ${link.bgColor ? `${link.bgColor}66` : artist.accentColor ? `${artist.accentColor}66` : 'rgba(255, 51, 102, 0.45)'}`,
                        transition: 'all 0.2s ease-in-out'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                        <span style={{ fontSize: '1.2rem' }}>{link.icon || '📅'}</span>
                        <span>{link.title}</span>
                      </div>
                      <span style={{ fontSize: '1rem', fontWeight: 'bold' }}>➔</span>
                    </button>
                  );
                }

                let href = link.url || '#';
                if (isWhatsApp && !href.startsWith('http')) {
                  const num = href.replace(/\D/g, '') || (artist.whatsapp ? artist.whatsapp.replace(/\D/g, '') : '');
                  href = `https://wa.me/${num}?text=${encodeURIComponent(`Bonjour ${artist.companyName}, je vous contacte depuis votre vitrine.`)}`;
                } else if (isEmail && !href.startsWith('mailto:') && !href.startsWith('http')) {
                  href = `mailto:${href}?subject=Contact depuis la vitrine ${encodeURIComponent(artist.companyName)}`;
                }

                return (
                  <a
                    key={link.id || idx}
                    href={href}
                    target={href.startsWith('mailto:') ? '_self' : '_blank'}
                    rel="noopener noreferrer"
                    className="linktree-btn"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: link.bgColor || (isWhatsApp ? '#25D366' : isLight ? '#ffffff' : '#121212'),
                      border: isWhatsApp ? 'none' : isLight ? '1px solid rgba(15, 23, 42, 0.15)' : '1px solid rgba(255, 255, 255, 0.12)',
                      color: isWhatsApp ? '#ffffff' : isLight ? '#0f172a' : '#ffffff',
                      borderRadius: '12px',
                      fontSize: '0.95rem',
                      fontWeight: isWhatsApp ? '800' : '700',
                      textDecoration: 'none',
                      boxShadow: isWhatsApp ? '0 4px 15px rgba(37, 211, 102, 0.3)' : isLight ? '0 4px 12px rgba(0,0,0,0.05)' : '0 4px 15px rgba(0, 0, 0, 0.3)',
                      transition: 'all 0.2s ease-in-out'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                      {link.icon && link.icon.length > 2 && (link.icon.startsWith('http') || link.icon.startsWith('data:')) ? (
                        <img src={link.icon} alt="" style={{ width: '24px', height: '24px', borderRadius: '4px', objectFit: 'contain' }} />
                      ) : link.icon && link.icon !== '🔗' ? (
                        <span style={{ fontSize: '1.15rem' }}>{link.icon}</span>
                      ) : isWhatsApp ? (
                        <SocialIcon platform="WhatsApp" color={isLight ? '#0f172a' : '#ffffff'} size={20} />
                      ) : isEmail ? (
                        <SocialIcon platform="Contact Email" color={isLight ? '#0f172a' : '#ffffff'} size={20} />
                      ) : (
                        <SocialIcon platform={link.platform || `${link.title || ''} ${link.url || ''}`} color={isLight ? '#0f172a' : '#ffffff'} size={20} />
                      )}
                      <span>{link.title}</span>
                    </div>
                    <span style={{ fontSize: '1rem', fontWeight: 'bold' }}>➔</span>
                  </a>
                );
              })}
            </div>
          );
        })()}

      </header>

      {/* 3. NOUVEAU CARROUSEL DE MERCHANDISING NATIF (STRICTEMENT UNIQUE) */}
      {products && products.length > 0 && (
        <div className="w-full max-w-[560px] mx-auto flex flex-col items-center relative overflow-hidden px-4">
          <MerchCarousel
            items={products}
            title="Merch & Collections"
            subtitle="Capsules officielles & éditions limitées"
            accentColor={artist.accentColor || '#ff3366'}
            isLightMode={isLight}
            artistLogoA={artist.logoUrl || artist.auditLogoUrl || artist.logoAdaptedUrl || (typeof artist.logoA === 'string' ? artist.logoA : ((artist.logoA as any)?.adaptedRemastered || (artist.logoA as any)?.adapted || (artist.logoA as any)?.original)) || ''}
            artistLogoB={artist.logoB || artist.logoAdaptedUrl || artist.auditLogoUrl || (typeof artist.logoA === 'string' ? artist.logoA : ((artist.logoA as any)?.adaptedRemastered || (artist.logoA as any)?.adapted || (artist.logoA as any)?.original)) || artist.logoUrl || ''}
            artistName={artist.companyName}
            onAddToCart={addToCart}
            shopUrl={`/portail-shop/${artist.slug || (artist.companyName || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '') || artist.id}`}
          />
        </div>
      )}

      {/* PANIER (AFFICHÉ SI DES ARTICLES SONT AJOUTÉS) */}
      {cart.length > 0 && (
        <div className="w-full max-w-lg md:max-w-2xl mx-auto px-4 my-8">
          <aside id="cart-aside-section" className="cart-aside-panel" style={{ backgroundColor: isLight ? '#ffffff' : '#111', border: isLight ? '1px solid #cbd5e1' : '1px solid #222', padding: '1.25rem', borderRadius: '12px', height: 'fit-content', boxShadow: isLight ? '0 10px 30px rgba(0,0,0,0.06)' : '0 10px 30px rgba(0,0,0,0.5)' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, textTransform: 'uppercase', margin: '0 0 1rem 0', borderBottom: isLight ? '1px solid #e2e8f0' : '1px solid #222', paddingBottom: '0.65rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: mainTextColor }}>
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

            <form onSubmit={handleCheckout} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <input type="text" required placeholder="Nom complet *" value={customerName} onChange={(e) => setCustomerName(e.target.value)} style={inputStyle} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <input type="email" required placeholder="Email *" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} style={inputStyle} />
                <input type="tel" placeholder="Téléphone" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} style={inputStyle} />
              </div>
              <input type="text" required placeholder="Adresse de livraison (Rue, N°) *" value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} style={inputStyle} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <input type="text" required placeholder="Code Postal *" value={customerZip} onChange={(e) => setCustomerZip(e.target.value)} style={inputStyle} />
                <input type="text" required placeholder="Ville *" value={customerCity} onChange={(e) => setCustomerCity(e.target.value)} style={inputStyle} />
              </div>
              <input type="text" placeholder="Note de livraison" value={customerNotes} onChange={(e) => setCustomerNotes(e.target.value)} style={inputStyle} />

              {checkoutError && <p style={{ color: '#ef4444', fontSize: '0.8rem', margin: '0.25rem 0' }}>{checkoutError}</p>}

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
                  marginTop: '0.5rem'
                }}
              >
                {isCheckingOut ? 'Redirection vers la caisse...' : `Payer ${cartTotal.toFixed(2)} €`}
              </button>
            </form>
          </aside>
        </div>
      )}

      {/* FOOTER */}
      <footer style={{ borderTop: '1px solid #1a1a1a', padding: '3rem 1.5rem calc(4rem + env(safe-area-inset-bottom, 24px)) 1.5rem', textAlign: 'center', backgroundColor: '#030303', marginTop: '4rem', position: 'relative', zIndex: 10 }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.8rem' }}>
          <a
            href="https://signaid.eu"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '44px',
              padding: '0.6rem 1.4rem',
              borderRadius: '100px',
              backgroundColor: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#ffffff',
              fontSize: '0.78rem',
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              fontWeight: '800',
              textDecoration: 'none',
              cursor: 'pointer',
              touchAction: 'manipulation',
              transition: 'all 0.2s ease'
            }}
          >
            ⚡ PROPULSÉ PAR SIGNAID.EU
          </a>
          <p style={{ fontSize: '0.85rem', color: '#aaa', margin: 0 }}>
            Vous êtes artiste ou DJ ? Déployez votre profil et votre boutique sans stock.
          </p>
        </div>
      </footer>

      {/* MODALE DE BOOKING */}
      {isBookingModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '1rem' }}>
          <div style={{ backgroundColor: '#111111', border: `1.5px solid ${artist.accentColor || '#ff3366'}`, borderRadius: '16px', maxWidth: '520px', width: '100%', padding: '1.75rem', position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #222', paddingBottom: '0.85rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '900', textTransform: 'uppercase', color: '#fff' }}>Booking — {artist.companyName}</h3>
                <span style={{ fontSize: '0.78rem', color: '#aaa' }}>Demande de prestation</span>
              </div>
              <button type="button" onClick={() => setIsBookingModalOpen(false)} style={{ background: 'none', border: 'none', color: '#888', fontSize: '1.5rem', cursor: 'pointer' }}>✕</button>
            </div>

            {bookingSuccess ? (
              <div style={{ textAlign: 'center', padding: '1.5rem 1rem' }}>
                <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🎉</div>
                <h4 style={{ color: '#10b981', fontSize: '1.2rem', margin: '0 0 0.5rem 0', fontWeight: '900' }}>{bookingSuccess}</h4>
                <button type="button" onClick={() => setIsBookingModalOpen(false)} style={{ backgroundColor: artist.accentColor || '#ff3366', color: '#fff', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '8px', fontWeight: '900', cursor: 'pointer' }}>Fermer</button>
              </div>
            ) : (
              <form onSubmit={handleBookingSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <input type="text" required placeholder="Nom / Organisation *" value={bookingName} onChange={(e) => setBookingName(e.target.value)} style={inputStyle} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                  <input type="email" required placeholder="Email *" value={bookingEmail} onChange={(e) => setBookingEmail(e.target.value)} style={inputStyle} />
                  <input type="tel" placeholder="Téléphone" value={bookingPhone} onChange={(e) => setBookingPhone(e.target.value)} style={inputStyle} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                  <input type="text" required placeholder="Date Souhaitée *" value={bookingDate} onChange={(e) => setBookingDate(e.target.value)} style={inputStyle} />
                  <input type="text" required placeholder="Lieu / Ville / Club *" value={bookingLocation} onChange={(e) => setBookingLocation(e.target.value)} style={inputStyle} />
                </div>
                <textarea rows={3} placeholder="Message / Détails de l'événement..." value={bookingMessage} onChange={(e) => setBookingMessage(e.target.value)} style={{ ...inputStyle, resize: 'vertical' }} />

                {bookingError && <div style={{ color: '#ef4444', fontSize: '0.8rem' }}>{bookingError}</div>}

                <button type="submit" disabled={isSendingBooking} style={{ width: '100%', backgroundColor: artist.accentColor || '#ff3366', color: '#ffffff', border: 'none', padding: '0.95rem', fontWeight: '900', textTransform: 'uppercase', borderRadius: '6px', cursor: 'pointer' }}>
                  {isSendingBooking ? 'Transmission...' : 'Envoyer la demande ➔'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* BARRE D'OUTILS ADMIN FLOTTANTE QUAND CONNECTÉ DIRECTEMENT SUR LE PROFIL */}
      <AdminQuickBar uid={artist.id} companyName={artist.companyName} />
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