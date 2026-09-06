import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, storage } from '../firebaseConfig';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { sanitizeForFirestore } from '../utils/firestoreSanitizer';
import { saveStoredConfig, SiteConfig, defaultConfig } from '../lib/store';
import { processLogoImage } from '../utils/logoProcessor';

// Helper to convert brand name to a clean URL slug
const slugify = (text: string): string => {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[^a-z0-9]+/g, '-')     // replace non-alphanumeric with -
    .replace(/^-+|-+$/g, '')         // remove leading/trailing -
    .substring(0, 40);
};

// Curated atmosphere banner presets
const BANNER_PRESETS = [
  { id: 'dark-studio', name: 'Atelier & Studio', url: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=1200&auto=format&fit=crop&q=80' },
  { id: 'nightlife', name: 'Nightlife & Scène', url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1200&auto=format&fit=crop&q=80' },
  { id: 'streetwear', name: 'Streetwear & Mode', url: 'https://images.unsplash.com/photo-1523398002811-999ca8dec234?w=1200&auto=format&fit=crop&q=80' },
  { id: 'minimalist', name: 'Minimaliste', url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=1200&auto=format&fit=crop&q=80' },
  { id: 'urban', name: 'Art Urbain', url: 'https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?w=1200&auto=format&fit=crop&q=80' }
];

export default function BrandOnboardingForm() {
  const navigate = useNavigate();

  // Form State
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Step 1: Identité
  const [brandName, setBrandName] = useState('');
  const [slug, setSlug] = useState('');
  const [isSlugManual, setIsSlugManual] = useState(false);
  const [sector, setSector] = useState('Créateur & Média');
  const [presentation, setPresentation] = useState('');

  // Step 2: Visuel & Thème
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [darkPreviewUrl, setDarkPreviewUrl] = useState<string | null>(null);
  const [lightPreviewUrl, setLightPreviewUrl] = useState<string | null>(null);
  const [autoRemoveBg, setAutoRemoveBg] = useState(true);
  const [autoInvertOnDark, setAutoInvertOnDark] = useState(true);

  const [coverPreview, setCoverPreview] = useState<string | null>(BANNER_PRESETS[0].url);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('dark-studio');
  const [needsLogoCreation, setNeedsLogoCreation] = useState(false);
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>('dark');
  const [accentColor, setAccentColor] = useState('#ff3366');

  // Step 3: Contact & Réseaux
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [cityCountry, setCityCountry] = useState('');
  const [instagram, setInstagram] = useState('');
  const [tiktok, setTiktok] = useState('');
  const [spotify, setSpotify] = useState('');
  const [youtube, setYoutube] = useState('');
  const [soundcloud, setSoundcloud] = useState('');
  const [website, setWebsite] = useState('');
  const [isDetectingSocials, setIsDetectingSocials] = useState(false);
  const [detectionMessage, setDetectionMessage] = useState<string | null>(null);

  // Auto-slug sync when brand name changes
  useEffect(() => {
    if (!isSlugManual && brandName) {
      setSlug(slugify(brandName));
    }
  }, [brandName, isSlugManual]);

  // Live processed preview generation
  useEffect(() => {
    if (!logoPreview) {
      setDarkPreviewUrl(null);
      setLightPreviewUrl(null);
      return;
    }
    processLogoImage(logoPreview, true, {
      removeWhiteBg: autoRemoveBg,
      invertBlackToWhiteOnDark: autoInvertOnDark
    }).then(res => setDarkPreviewUrl(res));

    processLogoImage(logoPreview, false, {
      removeWhiteBg: autoRemoveBg,
      invertBlackToWhiteOnDark: false
    }).then(res => setLightPreviewUrl(res));
  }, [logoPreview, autoRemoveBg, autoInvertOnDark]);

  // Image compression utility
  const compressBase64Image = (dataUrl: string, maxDim = 800): Promise<string> => {
    return new Promise((resolve) => {
      if (!dataUrl || !dataUrl.startsWith('data:image')) return resolve(dataUrl);
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            return resolve(canvas.toDataURL('image/png', 0.9));
          }
        } catch (e) {
          console.warn("Compression notice", e);
        }
        resolve(dataUrl);
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  };

  const handleDetectSocialLinks = async () => {
    if (!brandName || brandName.trim().length < 2) {
      setDetectionMessage("⚠️ Veuillez d'abord renseigner le nom de votre marque ou projet à l'étape 1.");
      return;
    }

    setIsDetectingSocials(true);
    setDetectionMessage(null);

    try {
      const targetBrand = brandName.trim();
      let resData: any = null;

      try {
        const response = await fetch('https://us-central1-signaid-prod.cloudfunctions.net/detectSocialLinks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ brandName: targetBrand })
        });
        if (response.ok) {
          resData = await response.json();
        }
      } catch (apiErr) {
        console.warn("API detectSocialLinks fallback:", apiErr);
      }

      const cleanHandle = targetBrand
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9._]/g, '');

      const links = resData?.links || {
        instagram: `https://www.instagram.com/${cleanHandle}`,
        tiktok: `https://www.tiktok.com/@${cleanHandle}`,
        spotify: `https://open.spotify.com/search/${encodeURIComponent(targetBrand)}`,
        youtube: `https://www.youtube.com/@${cleanHandle}`,
        soundcloud: `https://soundcloud.com/${cleanHandle}`,
        website: ''
      };

      let addedCount = 0;
      let preservedCount = 0;

      if (links.instagram) {
        if (!instagram.trim()) { setInstagram(links.instagram); addedCount++; }
        else { preservedCount++; }
      }
      if (links.tiktok) {
        if (!tiktok.trim()) { setTiktok(links.tiktok); addedCount++; }
        else { preservedCount++; }
      }
      if (links.spotify) {
        if (!spotify.trim()) { setSpotify(links.spotify); addedCount++; }
        else { preservedCount++; }
      }
      if (links.youtube) {
        if (!youtube.trim()) { setYoutube(links.youtube); addedCount++; }
        else { preservedCount++; }
      }
      if (links.soundcloud) {
        if (!soundcloud.trim()) { setSoundcloud(links.soundcloud); addedCount++; }
        else { preservedCount++; }
      }
      if (links.website) {
        if (!website.trim()) { setWebsite(links.website); addedCount++; }
        else { preservedCount++; }
      }

      if (addedCount > 0) {
        setDetectionMessage(`✨ ${addedCount} réseau(x) auto-complété(s) pour "${targetBrand}" ${preservedCount > 0 ? `(${preservedCount} champ(s) existant(s) préservé(s))` : ''}. Tous les champs restent modifiables.`);
      } else if (preservedCount > 0) {
        setDetectionMessage(`ℹ️ Vos ${preservedCount} réseaux déjà renseignés ont été conservés intacts.`);
      } else {
        setDetectionMessage(`✨ Liens générés pour "${targetBrand}". Vous pouvez les modifier librement.`);
      }
      setTimeout(() => setDetectionMessage(null), 8000);
    } catch (e: any) {
      setDetectionMessage("Erreur lors de la détection. Vous pouvez renseigner vos liens manuellement.");
    } finally {
      setIsDetectingSocials(false);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      const rawDataUrl = event.target?.result as string;
      compressBase64Image(rawDataUrl, 600).then((compressed) => {
        setLogoPreview(compressed);
      });
    };
    reader.readAsDataURL(file);
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedPresetId('custom');
    const reader = new FileReader();
    reader.onload = (event) => {
      const rawDataUrl = event.target?.result as string;
      compressBase64Image(rawDataUrl, 1200).then((compressed) => {
        setCoverPreview(compressed);
      });
    };
    reader.readAsDataURL(file);
  };

  // Upload image directly to Cloud Storage via client SDK
  const uploadImageToCloud = async (base64Data: string, uid: string, folder: string): Promise<string> => {
    try {
      if (!base64Data || !base64Data.startsWith('data:')) return base64Data;
      const storageRef = ref(storage, `brands/${uid}/${folder}/${Date.now()}_${folder}.png`);
      await uploadString(storageRef, base64Data, 'data_url', {
        contentType: 'image/png',
        cacheControl: 'public, max-age=31536000'
      });
      return await getDownloadURL(storageRef);
    } catch (err) {
      console.warn("Cloud Storage direct upload fallback:", err);
    }
    return base64Data;
  };

  // Canvas Textile Mockup Generator with Transparent and Inverted Logo
  const generateTextileMockup = async (
    garmentBaseUrl: string,
    logoDataUrl: string,
    type: 'tshirt' | 'polo' | 'hoodie' = 'tshirt',
    isDarkGarment: boolean = true,
    view: 'front' | 'back' = 'front'
  ): Promise<string> => {
    if (!logoDataUrl) return garmentBaseUrl;

    const processedLogo = await processLogoImage(logoDataUrl, isDarkGarment, {
      removeWhiteBg: autoRemoveBg,
      invertBlackToWhiteOnDark: isDarkGarment && autoInvertOnDark
    });

    return new Promise((resolve) => {
      const imgGarment = new Image();
      const imgLogo = new Image();
      imgGarment.crossOrigin = 'anonymous';
      imgLogo.crossOrigin = 'anonymous';

      let loadedCount = 0;
      const onLoaded = () => {
        loadedCount++;
        if (loadedCount < 2) return;

        try {
          const canvas = document.createElement('canvas');
          canvas.width = 1200;
          canvas.height = 1200;
          const ctx = canvas.getContext('2d');
          if (!ctx) return resolve(garmentBaseUrl);

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          // 1. Draw Garment Base
          ctx.drawImage(imgGarment, 0, 0, 1200, 1200);

          // 2. Position & Scale on Chest or Upper Back
          let posX = 0.50;
          let posY = view === 'back' ? 0.38 : 0.44;
          let scale = view === 'back' ? 0.35 : 0.28;

          if (view === 'front') {
            if (type === 'polo') {
              posX = 0.63;
              posY = 0.36;
              scale = 0.16;
            } else if (type === 'hoodie') {
              posX = 0.50;
              posY = 0.46;
              scale = 0.28;
            }
          } else {
            if (type === 'hoodie') {
              posY = 0.46;
              scale = 0.35;
            }
          }

          const logoW = canvas.width * scale;
          const logoH = logoW * (imgLogo.height / imgLogo.width);
          const logoX = (canvas.width * posX) - (logoW / 2);
          const logoY = (canvas.height * posY) - (logoH / 2);

          // Subtle realistic shadow on fabric
          ctx.save();
          ctx.shadowColor = 'rgba(0,0,0,0.2)';
          ctx.shadowBlur = 6;
          ctx.shadowOffsetY = 3;
          ctx.drawImage(imgLogo, logoX, logoY, logoW, logoH);
          ctx.restore();

          resolve(canvas.toDataURL('image/png', 0.9));
        } catch (err) {
          console.warn('Mockup composite error:', err);
          resolve(garmentBaseUrl);
        }
      };

      imgGarment.onload = onLoaded;
      imgGarment.onerror = () => resolve(garmentBaseUrl);
      imgLogo.onload = onLoaded;
      imgLogo.onerror = () => resolve(garmentBaseUrl);

      imgGarment.src = garmentBaseUrl;
      imgLogo.src = processedLogo;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandName.trim() || !email.trim()) {
      setErrorMsg("Veuillez renseigner au moins le nom de votre marque et une adresse email.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const cleanSlug = slug.trim() || slugify(brandName) || `brand-${Date.now().toString(36)}`;
      const segment = () => Math.random().toString(36).substring(2, 8).toUpperCase();
      const newUid = `audit-${Date.now().toString(36)}${Math.random().toString(36).substring(2, 6)}`;
      const actuationKey = `SG-${segment()}-${segment()}`;

      // Upload Logo or handle fallback
      let finalLogoUrl = logoPreview || "";
      if (finalLogoUrl && finalLogoUrl.startsWith('data:image')) {
        finalLogoUrl = await uploadImageToCloud(finalLogoUrl, newUid, 'logos');
      }

      // Upload Cover Banner or handle fallback
      let finalCoverUrl = coverPreview || BANNER_PRESETS[0].url;
      if (finalCoverUrl && finalCoverUrl.startsWith('data:image')) {
        finalCoverUrl = await uploadImageToCloud(finalCoverUrl, newUid, 'covers');
      }

      // Build Socials Array
      const socialsList: { platform: string; url: string; enabled?: boolean }[] = [];
      if (instagram.trim()) socialsList.push({ platform: 'Instagram', url: instagram.startsWith('http') ? instagram : `https://instagram.com/${instagram.replace('@', '')}`, enabled: true });
      if (tiktok.trim()) socialsList.push({ platform: 'TikTok', url: tiktok.startsWith('http') ? tiktok : `https://tiktok.com/@${tiktok.replace('@', '')}`, enabled: true });
      if (spotify.trim()) socialsList.push({ platform: 'Spotify', url: spotify.startsWith('http') ? spotify : `https://open.spotify.com/search/${encodeURIComponent(spotify)}`, enabled: true });
      if (youtube.trim()) socialsList.push({ platform: 'YouTube', url: youtube.startsWith('http') ? youtube : `https://youtube.com/${youtube}`, enabled: true });
      if (soundcloud.trim()) socialsList.push({ platform: 'SoundCloud', url: soundcloud.startsWith('http') ? soundcloud : `https://soundcloud.com/${soundcloud}`, enabled: true });
      if (whatsapp.trim()) socialsList.push({ platform: 'WhatsApp', url: `https://wa.me/${whatsapp.replace(/[^0-9]/g, '')}`, enabled: true });

      // Generate Textile Mockups with Logo Composited on Fabric (Front AND Back)
      const rawLogoToUse = logoPreview || finalLogoUrl;
      const tshirtMockup = rawLogoToUse ? await generateTextileMockup('/assets/tshirt-black-JHK170.png', rawLogoToUse, 'tshirt', true, 'front') : '/assets/tshirt-black-JHK170.png';
      const tshirtMockupBack = rawLogoToUse ? await generateTextileMockup('/assets/tshirt-black-JHK170-dos.png', rawLogoToUse, 'tshirt', true, 'back') : '/assets/tshirt-black-JHK170-dos.png';

      const poloMockup = rawLogoToUse ? await generateTextileMockup('/assets/polo-black-JHK510.png', rawLogoToUse, 'polo', true, 'front') : '/assets/polo-black-JHK510.png';
      const poloMockupBack = rawLogoToUse ? await generateTextileMockup('/assets/polo-black-JHK510-dos.png', rawLogoToUse, 'polo', true, 'back') : '/assets/polo-black-JHK510-dos.png';

      const hoodieMockup = rawLogoToUse ? await generateTextileMockup('/assets/hoodie-black-JHK421.png', rawLogoToUse, 'hoodie', true, 'front') : '/assets/hoodie-black-JHK421.png';
      const hoodieMockupBack = rawLogoToUse ? await generateTextileMockup('/assets/hoodie-black-JHK421-dos.png', rawLogoToUse, 'hoodie', true, 'back') : '/assets/hoodie-black-JHK421-dos.png';

      // Assemble Default Mockup Products
      const defaultMockups = [
        {
          id: 'tshirt-oversize-black',
          name: `${brandName} T-Shirt Premium`,
          title: `${brandName} T-Shirt Premium`,
          price: 29.99,
          category: 'tshirt',
          garment: 'tshirt',
          imageFront: tshirtMockup,
          frontImageUrl: tshirtMockup,
          aiImageUrl: tshirtMockup,
          imageBack: tshirtMockupBack,
          backImageUrl: tshirtMockupBack,
          colors: ['#000000', '#ffffff'],
          sizes: ['S', 'M', 'L', 'XL'],
          description: 'Coton biologique lourd 240g/m², coupe oversize streetwear, sérigraphie numérique HD.'
        },
        {
          id: 'polo-pique-black',
          name: `${brandName} Polo Premium`,
          title: `${brandName} Polo Premium`,
          price: 35.00,
          category: 'polo',
          garment: 'polo',
          imageFront: poloMockup,
          frontImageUrl: poloMockup,
          aiImageUrl: poloMockup,
          imageBack: poloMockupBack,
          backImageUrl: poloMockupBack,
          colors: ['#000000', '#ffffff'],
          sizes: ['S', 'M', 'L', 'XL'],
          description: 'Maille piquée 100% coton peigné, impression DTF haute définition sur poitrine.'
        },
        {
          id: 'hoodie-heavy-black',
          name: `${brandName} Hoodie Premium`,
          title: `${brandName} Hoodie Premium`,
          price: 45.00,
          category: 'hoodie',
          garment: 'sweat',
          imageFront: hoodieMockup,
          frontImageUrl: hoodieMockup,
          aiImageUrl: hoodieMockup,
          imageBack: hoodieMockupBack,
          backImageUrl: hoodieMockupBack,
          colors: ['#000000', '#2d3748'],
          sizes: ['S', 'M', 'L', 'XL'],
          description: 'Molleton gratté haute densité, capuche doublée, finitions atelier haute résistance.'
        }
      ];

      // Assemble SiteConfig
      const newConfig: SiteConfig = {
        ...defaultConfig,
        companyName: brandName.trim(),
        slug: cleanSlug,
        activitySector: sector,
        sector: sector,
        presentation: presentation.trim() || `Boutique officielle et vitrine de la marque ${brandName}. Textiles haute qualité imprimés à la demande et expédiés sous 48h.`,
        logoUrl: finalLogoUrl,
        livePhotoUrl: finalCoverUrl,
        livePhotoUrls: finalCoverUrl ? [finalCoverUrl] : [],
        logoOverlayColor: 'original',
        logoScale: 100,
        coverHeight: 280,
        coverZoom: 100,
        contactEmail: email.trim(),
        whatsappNumber: whatsapp.trim(),
        whatsapp: whatsapp.trim(),
        address: cityCountry.trim() || 'France / Europe',
        merchUrl: website.trim() || `https://signaid.eu/${cleanSlug}`,
        socials: socialsList,
        theme: themeMode,
        accentColor: accentColor,
        isGuest: true,
        status: "actuated",
        generatedKey: actuationKey,
        actuationKey: actuationKey,
        mockups: defaultMockups,
        items: defaultMockups,
        products: {
          tshirt: { name: `${brandName} T-Shirt Premium`, price: 29.99, imageFront: tshirtMockup, aiImageUrl: tshirtMockup, imageBack: tshirtMockupBack, backImageUrl: tshirtMockupBack },
          polo: { name: `${brandName} Polo Premium`, price: 35.00, imageFront: poloMockup, aiImageUrl: poloMockup, imageBack: poloMockupBack, backImageUrl: poloMockupBack },
          hoodie: { name: `${brandName} Hoodie Premium`, price: 45.00, imageFront: hoodieMockup, aiImageUrl: hoodieMockup, imageBack: hoodieMockupBack, backImageUrl: hoodieMockupBack }
        },
        createdAt: new Date().toISOString()
      };

      // 1. Save to Firestore (SiteConfigs, anonymous_previews, configs)
      await saveStoredConfig(newConfig, newUid);

      // 2. If user needs logo creation, create an access request record and trigger alert email
      if (needsLogoCreation) {
        try {
          await addDoc(collection(db, "access_requests"), sanitizeForFirestore({
            artistName: brandName,
            email: email,
            logoBase64: null,
            needsLogoCreation: true,
            slug: cleanSlug,
            uid: newUid,
            status: "pending",
            createdAt: serverTimestamp()
          }));

          fetch('https://us-central1-signaid-prod.cloudfunctions.net/sendAccessRequestEmail', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              artistName: brandName,
              email: email,
              needsLogoCreation: true,
              slug: cleanSlug
            })
          }).catch(() => null);
        } catch (reqErr) {
          console.warn("Access request log notice:", reqErr);
        }
      }

      // 3. Store ownership session in localStorage
      localStorage.setItem('owned_guest_uid', newUid);
      localStorage.setItem('owned_guest_slug', cleanSlug);
      localStorage.setItem('owned_actuation_key', actuationKey);

      // 4. Redirect to dynamic vitrine
      window.location.href = `/${cleanSlug}`;
    } catch (err: any) {
      console.error("Onboarding submission failed:", err);
      setErrorMsg("Une erreur s'est produite lors de la création : " + (err?.message || "Veuillez réessayer."));
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#020617',
      color: '#f8fafc',
      fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      overflowX: 'hidden'
    }}>
      {/* Background Gradient Orbs */}
      <div style={{ position: 'fixed', top: '-10%', left: '-10%', width: '50vw', height: '50vw', background: 'radial-gradient(circle, rgba(255,51,102,0.15) 0%, transparent 70%)', filter: 'blur(80px)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'fixed', bottom: '-10%', right: '-10%', width: '50vw', height: '50vw', background: 'radial-gradient(circle, rgba(56,189,248,0.1) 0%, transparent 70%)', filter: 'blur(80px)', pointerEvents: 'none', zIndex: 0 }} />

      {/* Header */}
      <header style={{ padding: '1.5rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', position: 'relative', zIndex: 10 }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none', color: '#fff' }}>
          <img src="/logo.png" alt="Signaid" style={{ height: '32px', width: 'auto' }} />
          <span style={{ fontWeight: 900, letterSpacing: '0.05em', fontSize: '1.1rem' }}>SIGNAID</span>
        </a>
        <a href="/" style={{ color: '#94a3b8', fontSize: '0.85rem', textDecoration: 'none', fontWeight: 600, transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = '#fff'} onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}>
          ← Retour à l'accueil
        </a>
      </header>

      {/* Main Container */}
      <main style={{ flex: 1, maxWidth: '840px', width: '100%', margin: '0 auto', padding: '3rem 1.5rem 5rem 1.5rem', position: 'relative', zIndex: 10 }}>
        
        {/* Title & Stepper Header */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.3rem 0.8rem', background: 'rgba(255, 51, 102, 0.1)', border: '1px solid rgba(255, 51, 102, 0.3)', borderRadius: '100px', color: '#ff3366', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>
            <span>⚡ Création Instantanée • Zéro Stock</span>
          </div>
          <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', fontWeight: 900, letterSpacing: '-0.03em', margin: '0 0 0.8rem 0', textTransform: 'uppercase' }}>
            Lancez Votre Vitrine & Boutique Textile
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.95rem', margin: 0, maxWidth: '640px', marginInline: 'auto', lineHeight: 1.6 }}>
            Renseignez l'identité de votre marque. Votre vitrine interactive, votre bannière d'ambiance et vos vêtements prêts-à-porter personnalisés seront générés instantanément.
          </p>
        </div>

        {/* Step Tabs Indicator */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', background: 'rgba(15, 23, 42, 0.6)', padding: '0.4rem', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)' }}>
          {[
            { id: 1, label: '1. Identité' },
            { id: 2, label: '2. Logo, Bannière & Thème' },
            { id: 3, label: '3. Contact & Lancement' }
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setStep(t.id as any)}
              style={{
                flex: 1,
                padding: '0.75rem',
                borderRadius: '10px',
                border: 'none',
                background: step === t.id ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
                color: step === t.id ? '#ffffff' : '#64748b',
                fontWeight: 700,
                fontSize: '0.82rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Error Box */}
        {errorMsg && (
          <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '12px', padding: '1rem', color: '#fca5a5', fontSize: '0.88rem', marginBottom: '1.5rem' }}>
            ⚠️ {errorMsg}
          </div>
        )}

        {/* Form Form Card */}
        <form onSubmit={handleSubmit} style={{ background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '2rem', boxShadow: '0 20px 40px rgba(0,0,0,0.5)', backdropFilter: 'blur(20px)' }}>
          
          {/* STEP 1: IDENTITÉ DE MARQUE */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', marginBottom: '0.5rem' }}>
                  Nom de votre Marque / Studio / Projet *
                </label>
                <input
                  type="text"
                  required
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder="ex: Atelier Nord / Studio 404 / KNTXT"
                  style={{
                    width: '100%',
                    padding: '0.9rem 1.2rem',
                    background: 'rgba(2, 6, 23, 0.7)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '10px',
                    color: '#ffffff',
                    fontSize: '1rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8' }}>
                    Adresse URL de votre Vitrine (Slug) *
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsSlugManual(!isSlugManual)}
                    style={{ background: 'none', border: 'none', color: '#38bdf8', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}
                  >
                    {isSlugManual ? "Mode Automatique" : "Modifier manuellement"}
                  </button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(2, 6, 23, 0.7)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', overflow: 'hidden' }}>
                  <span style={{ padding: '0.9rem 0.5rem 0.9rem 1.2rem', color: '#64748b', fontSize: '0.9rem', userSelect: 'none' }}>
                    signaid.eu/
                  </span>
                  <input
                    type="text"
                    required
                    value={slug}
                    disabled={!isSlugManual}
                    onChange={(e) => setSlug(slugify(e.target.value))}
                    placeholder="votre-marque"
                    style={{
                      flex: 1,
                      padding: '0.9rem 1.2rem 0.9rem 0',
                      background: 'transparent',
                      border: 'none',
                      color: '#38bdf8',
                      fontSize: '0.95rem',
                      fontWeight: 700,
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', marginBottom: '0.5rem' }}>
                  Secteur d'Activité *
                </label>
                <select
                  value={sector}
                  onChange={(e) => setSector(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.9rem 1.2rem',
                    background: 'rgba(2, 6, 23, 0.9)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '10px',
                    color: '#ffffff',
                    fontSize: '0.95rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="Créateur & Média">Créateur de Contenu & Média</option>
                  <option value="Musique & DJ">Musique, DJ & Événementiel</option>
                  <option value="Coach & Sport">Coach, Sport & Fitness</option>
                  <option value="Studio & Freelance">Studio Créatif, Design & Freelance</option>
                  <option value="Marque Émergente">Marque de Prêt-à-Porter / Streetwear</option>
                  <option value="Entreprise & BTP">Entreprise, BTP & Artisans</option>
                  <option value="Autre">Autre Activité Indépendante</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', marginBottom: '0.5rem' }}>
                  Présentation / Bio (Optionnel)
                </label>
                <textarea
                  rows={3}
                  value={presentation}
                  onChange={(e) => setPresentation(e.target.value)}
                  placeholder="Décrivez brièvement votre projet ou l'esprit de votre marque..."
                  style={{
                    width: '100%',
                    padding: '0.9rem 1.2rem',
                    background: 'rgba(2, 6, 23, 0.7)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '10px',
                    color: '#ffffff',
                    fontSize: '0.95rem',
                    outline: 'none',
                    resize: 'vertical',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    if (!brandName.trim()) {
                      setErrorMsg("Veuillez renseigner le nom de votre marque.");
                      return;
                    }
                    setErrorMsg(null);
                    setStep(2);
                  }}
                  style={{
                    background: '#ffffff',
                    color: '#000000',
                    fontWeight: 800,
                    fontSize: '0.85rem',
                    letterSpacing: '0.05em',
                    padding: '0.9rem 2rem',
                    borderRadius: '10px',
                    border: 'none',
                    cursor: 'pointer',
                    textTransform: 'uppercase'
                  }}
                >
                  Suivant : Logo, Bannière & Thème →
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: LOGO, BANNIÈRE & THÈME */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              
              {/* SECTION A: BANNIÈRE D'AMBIANCE DE COUVERTURE */}
              <div style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#38bdf8' }}>
                    1. Photo de Couverture / Bannière d'Ambiance
                  </label>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Format 16:9 paysage recommandé</span>
                </div>

                {/* Banner Preview Area */}
                <div style={{
                  position: 'relative',
                  width: '100%',
                  height: '160px',
                  borderRadius: '14px',
                  overflow: 'hidden',
                  border: '1px solid rgba(255,255,255,0.15)',
                  marginBottom: '1rem',
                  backgroundImage: coverPreview ? `url(${coverPreview})` : 'none',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}>
                  {/* Subtle overlay gradient */}
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 60%)' }} />
                  
                  {/* Upload button over banner */}
                  <label style={{
                    position: 'absolute',
                    bottom: '12px',
                    right: '12px',
                    background: 'rgba(15, 23, 42, 0.85)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    backdropFilter: 'blur(10px)',
                    color: '#fff',
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem'
                  }}>
                    <span>📷 Téléverser ma photo</span>
                    <input type="file" accept="image/*" onChange={handleCoverChange} style={{ display: 'none' }} />
                  </label>
                </div>

                {/* Preset Banner Selectors */}
                <div>
                  <span style={{ display: 'block', fontSize: '0.72rem', color: '#94a3b8', marginBottom: '0.5rem', fontWeight: 600 }}>
                    Ou choisissez une ambiance prête à l'emploi :
                  </span>
                  <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.3rem' }}>
                    {BANNER_PRESETS.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setSelectedPresetId(p.id);
                          setCoverPreview(p.url);
                        }}
                        style={{
                          flex: '0 0 auto',
                          padding: '0.45rem 0.8rem',
                          borderRadius: '8px',
                          border: selectedPresetId === p.id ? '1.5px solid #38bdf8' : '1px solid rgba(255,255,255,0.1)',
                          background: selectedPresetId === p.id ? 'rgba(56,189,248,0.15)' : 'rgba(255,255,255,0.03)',
                          color: selectedPresetId === p.id ? '#38bdf8' : '#cbd5e1',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* SECTION B: LOGO DANS LA BULLE AVATAR */}
              <div style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#ff3366', marginBottom: '0.5rem' }}>
                  2. Logo de Marque (Bulle Avatar & Impression Textile)
                </label>

                {!needsLogoCreation && (
                  <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '0.8rem' }}>
                    {/* Circle Avatar Preview */}
                    <div style={{
                      width: '100px',
                      height: '100px',
                      borderRadius: '50%',
                      background: themeMode === 'dark' ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                      border: `3px solid ${accentColor}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '10px',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                      flexShrink: 0
                    }}>
                      {logoPreview ? (
                        <img src={logoPreview} alt="Aperçu Logo" style={{ maxWidth: '80%', maxHeight: '80%', objectFit: 'contain' }} />
                      ) : (
                        <span style={{ fontSize: '1.8rem' }}>🖼️</span>
                      )}
                    </div>

                    {/* Drag and drop upload zone */}
                    <div style={{
                      flex: 1,
                      minWidth: '220px',
                      border: '2px dashed rgba(255, 255, 255, 0.2)',
                      backgroundColor: 'rgba(2, 6, 23, 0.5)',
                      padding: '1.5rem',
                      textAlign: 'center',
                      borderRadius: '12px',
                      position: 'relative',
                      cursor: 'pointer'
                    }}>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoChange}
                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                      />
                      {logoPreview ? (
                        <div>
                          <span style={{ fontSize: '0.88rem', color: '#10b981', fontWeight: 700, display: 'block', marginBottom: '0.2rem' }}>✓ Logo chargé avec succès</span>
                          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Cliquez pour changer de logo (PNG ou JPG)</span>
                        </div>
                      ) : (
                        <div>
                          <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#ffffff', display: 'block', marginBottom: '0.2rem' }}>Glissez votre logo ici ou parcourez vos fichiers</span>
                          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>PNG transparent ou JPEG avec fond</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* LOGO PROCESSING OPTIONS & DUAL PREVIEW */}
                {logoPreview && !needsLogoCreation && (
                  <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '1rem', marginBottom: '0.8rem' }}>
                    <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#38bdf8', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                      ✨ Optimisation Automatique de l'Impression Textile
                    </span>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.82rem', color: '#f8fafc', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={autoRemoveBg}
                          onChange={(e) => setAutoRemoveBg(e.target.checked)}
                          style={{ accentColor: '#38bdf8', width: '16px', height: '16px' }}
                        />
                        <span><strong>Détourage automatique</strong> (retire le carré blanc / fond plein pour ne garder que le visuel)</span>
                      </label>

                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.82rem', color: '#f8fafc', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={autoInvertOnDark}
                          onChange={(e) => setAutoInvertOnDark(e.target.checked)}
                          style={{ accentColor: '#38bdf8', width: '16px', height: '16px' }}
                        />
                        <span><strong>Passage du noir en blanc sur textile sombre</strong> (pour que le texte reste ultra lisible sans altérer les couleurs)</span>
                      </label>
                    </div>

                    {/* Dual Swatch Preview */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      <div style={{ background: '#0a0a0a', border: '1px solid #333', borderRadius: '8px', padding: '0.75rem', textAlign: 'center' }}>
                        <span style={{ display: 'block', fontSize: '0.68rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem' }}>Sur Textile Noir / Foncé</span>
                        <div style={{ height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {darkPreviewUrl && <img src={darkPreviewUrl} alt="Aperçu textile sombre" style={{ maxHeight: '55px', maxWidth: '100%', objectFit: 'contain' }} />}
                        </div>
                      </div>

                      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.75rem', textAlign: 'center' }}>
                        <span style={{ display: 'block', fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem' }}>Sur Textile Blanc / Clair</span>
                        <div style={{ height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {lightPreviewUrl && <img src={lightPreviewUrl} alt="Aperçu textile clair" style={{ maxHeight: '55px', maxWidth: '100%', objectFit: 'contain' }} />}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Checkbox "Je n'ai pas de logo" */}
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.85rem 1rem',
                  background: needsLogoCreation ? 'rgba(255, 51, 102, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                  border: `1px solid ${needsLogoCreation ? 'rgba(255, 51, 102, 0.4)' : 'rgba(255, 255, 255, 0.08)'}`,
                  borderRadius: '10px',
                  cursor: 'pointer',
                  userSelect: 'none'
                }}>
                  <input
                    type="checkbox"
                    checked={needsLogoCreation}
                    onChange={(e) => {
                      setNeedsLogoCreation(e.target.checked);
                      if (e.target.checked) {
                        setLogoFile(null);
                        setLogoPreview(null);
                      }
                    }}
                    style={{ accentColor: '#ff3366', width: '18px', height: '18px' }}
                  />
                  <div>
                    <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: needsLogoCreation ? '#ff3366' : '#f8fafc' }}>
                      Je n'ai pas encore de logo vectoriel / J'ai besoin d'une création de logo
                    </span>
                    <span style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                      Notre studio graphique vectorisera votre concept pour l'impression textile HD.
                    </span>
                  </div>
                </label>
              </div>

              {/* SECTION C: THÈME & COULEURS */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', marginBottom: '0.5rem' }}>
                    Thème Visuel
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => setThemeMode('dark')}
                      style={{
                        flex: 1,
                        padding: '0.75rem',
                        borderRadius: '8px',
                        background: themeMode === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.3)',
                        border: `1.5px solid ${themeMode === 'dark' ? accentColor : 'rgba(255,255,255,0.1)'}`,
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        cursor: 'pointer'
                      }}
                    >
                      🌙 Dark Mode
                    </button>
                    <button
                      type="button"
                      onClick={() => setThemeMode('light')}
                      style={{
                        flex: 1,
                        padding: '0.75rem',
                        borderRadius: '8px',
                        background: themeMode === 'light' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.3)',
                        border: `1.5px solid ${themeMode === 'light' ? accentColor : 'rgba(255,255,255,0.1)'}`,
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        cursor: 'pointer'
                      }}
                    >
                      ☀️ Light Mode
                    </button>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', marginBottom: '0.5rem' }}>
                    Couleur d'Accent
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <input
                      type="color"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      style={{ width: '45px', height: '42px', border: 'none', borderRadius: '8px', cursor: 'pointer', background: 'transparent' }}
                    />
                    <span style={{ fontSize: '0.85rem', fontFamily: 'monospace', color: '#94a3b8' }}>{accentColor}</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  style={{ background: 'transparent', color: '#94a3b8', fontWeight: 700, fontSize: '0.85rem', padding: '0.9rem 1.5rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }}
                >
                  ← Étape Précédente
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  style={{ background: '#ffffff', color: '#000000', fontWeight: 800, fontSize: '0.85rem', letterSpacing: '0.05em', padding: '0.9rem 2rem', borderRadius: '10px', border: 'none', cursor: 'pointer', textTransform: 'uppercase' }}
                >
                  Suivant : Coordonnées & Réseaux →
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: CONTACT, RÉSEAUX & SOUMISSION */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', marginBottom: '0.5rem' }}>
                    Email de Contact Principal *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="contact@votre-marque.com"
                    style={{ width: '100%', padding: '0.9rem 1.2rem', background: 'rgba(2, 6, 23, 0.7)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', color: '#ffffff', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', marginBottom: '0.5rem' }}>
                    Numéro WhatsApp / Téléphone
                  </label>
                  <input
                    type="tel"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="+33 6 00 00 00 00"
                    style={{ width: '100%', padding: '0.9rem 1.2rem', background: 'rgba(2, 6, 23, 0.7)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', color: '#ffffff', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', marginBottom: '0.5rem' }}>
                  Ville & Pays
                </label>
                <input
                  type="text"
                  value={cityCountry}
                  onChange={(e) => setCityCountry(e.target.value)}
                  placeholder="Paris, France / Bruxelles, Belgique"
                  style={{ width: '100%', padding: '0.9rem 1.2rem', background: 'rgba(2, 6, 23, 0.7)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', color: '#ffffff', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              {/* Social Links Sub-section with Auto-detect Button */}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', color: '#38bdf8', letterSpacing: '0.05em' }}>
                    🔗 Réseaux Sociaux & Plateformes (Optionnel)
                  </span>

                  <button
                    type="button"
                    onClick={handleDetectSocialLinks}
                    disabled={isDetectingSocials}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      background: isDetectingSocials 
                        ? 'rgba(56, 189, 248, 0.15)' 
                        : 'linear-gradient(135deg, rgba(56, 189, 248, 0.25) 0%, rgba(99, 102, 241, 0.25) 100%)',
                      border: '1px solid rgba(56, 189, 248, 0.4)',
                      color: '#38bdf8',
                      padding: '0.55rem 1.1rem',
                      borderRadius: '100px',
                      fontSize: '0.82rem',
                      fontWeight: 800,
                      cursor: isDetectingSocials ? 'wait' : 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 2px 10px rgba(56, 189, 248, 0.15)'
                    }}
                  >
                    {isDetectingSocials ? (
                      <>
                        <span style={{ display: 'inline-block' }}>⏳</span>
                        <span>Recherche de vos profils en cours...</span>
                      </>
                    ) : (
                      <>
                        <span>✨</span>
                        <span>Détecter mes réseaux automatiquement</span>
                      </>
                    )}
                  </button>
                </div>

                {detectionMessage && (
                  <div style={{
                    marginBottom: '1rem',
                    padding: '0.65rem 1rem',
                    borderRadius: '8px',
                    background: detectionMessage.includes('⚠️') ? 'rgba(234, 179, 8, 0.15)' : 'rgba(34, 197, 94, 0.15)',
                    border: detectionMessage.includes('⚠️') ? '1px solid rgba(234, 179, 8, 0.3)' : '1px solid rgba(34, 197, 94, 0.3)',
                    color: detectionMessage.includes('⚠️') ? '#fde047' : '#4ade80',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    {detectionMessage}
                  </div>
                )}
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', color: '#94a3b8', marginBottom: '0.3rem' }}>Instagram</label>
                    <input type="text" value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="@moncompte ou URL" style={{ width: '100%', padding: '0.75rem 1rem', background: 'rgba(2, 6, 23, 0.7)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#ffffff', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', color: '#94a3b8', marginBottom: '0.3rem' }}>TikTok</label>
                    <input type="text" value={tiktok} onChange={(e) => setTiktok(e.target.value)} placeholder="@moncompte" style={{ width: '100%', padding: '0.75rem 1rem', background: 'rgba(2, 6, 23, 0.7)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#ffffff', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', color: '#94a3b8', marginBottom: '0.3rem' }}>Spotify / Apple Music</label>
                    <input type="text" value={spotify} onChange={(e) => setSpotify(e.target.value)} placeholder="Lien artiste ou titre" style={{ width: '100%', padding: '0.75rem 1rem', background: 'rgba(2, 6, 23, 0.7)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#ffffff', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', color: '#94a3b8', marginBottom: '0.3rem' }}>YouTube</label>
                    <input type="text" value={youtube} onChange={(e) => setYoutube(e.target.value)} placeholder="Chaîne ou vidéo" style={{ width: '100%', padding: '0.75rem 1rem', background: 'rgba(2, 6, 23, 0.7)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#ffffff', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', color: '#94a3b8', marginBottom: '0.3rem' }}>SoundCloud</label>
                    <input type="text" value={soundcloud} onChange={(e) => setSoundcloud(e.target.value)} placeholder="Profil SoundCloud" style={{ width: '100%', padding: '0.75rem 1rem', background: 'rgba(2, 6, 23, 0.7)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#ffffff', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', color: '#94a3b8', marginBottom: '0.3rem' }}>Site Web / Portfolio</label>
                    <input type="text" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://..." style={{ width: '100%', padding: '0.75rem 1rem', background: 'rgba(2, 6, 23, 0.7)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#ffffff', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  style={{ background: 'transparent', color: '#94a3b8', fontWeight: 700, fontSize: '0.85rem', padding: '0.9rem 1.5rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }}
                >
                  ← Étape Précédente
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    background: accentColor || '#ff3366',
                    color: '#ffffff',
                    fontWeight: 900,
                    fontSize: '0.95rem',
                    letterSpacing: '0.05em',
                    padding: '1.1rem 2.5rem',
                    borderRadius: '12px',
                    border: 'none',
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    textTransform: 'uppercase',
                    boxShadow: '0 10px 25px rgba(255, 51, 102, 0.4)',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    opacity: isSubmitting ? 0.7 : 1
                  }}
                >
                  {isSubmitting ? "⚡ GÉNÉRATION & DÉPLOIEMENT..." : "🚀 PUBLIER MA VITRINE & MON SHOP"}
                </button>
              </div>
            </div>
          )}

        </form>

      </main>
    </div>
  );
}
