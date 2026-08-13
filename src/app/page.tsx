import { useEffect, useState } from "react";
import { getStoredConfig, SiteConfig, generateMapsUrl, generateWhatsAppUrl, highlightKeywords, cleanText } from "@/src/lib/store";
import { Link, useLocation } from "react-router-dom";
import { auth, db } from "@/src/firebaseConfig";
import { collection, query, where, getDocs, addDoc, serverTimestamp, doc, getDoc } from "firebase/firestore";
import AdminQuickBar from "@/src/components/AdminQuickBar";
import "./globals.css";

function Accordion({ title, children, isOpen, onClick }: { title: string, children: React.ReactNode, isOpen: boolean, onClick: () => void }) {
  return (
    <div className="accordion-item">
      <button className="accordion-header" onClick={onClick}>
        <span className="accordion-title">{title}</span>
        <span className="accordion-icon">{isOpen ? "−" : "+"}</span>
      </button>
      <div className={`accordion-content ${isOpen ? 'open' : ''}`}>
        {children}
      </div>
    </div>
  );
}

const SocialIcon = ({ platform, color = "white" }: { platform: string, color?: string }) => {
  const p = platform.toLowerCase();
  if (p.includes("facebook")) return <svg width="24" height="24" fill={color} viewBox="0 0 24 24"><path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z"/></svg>;
  if (p.includes("instagram")) return <svg width="24" height="24" fill={color} viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>;
  if (p.includes("linkedin")) return <svg width="24" height="24" fill={color} viewBox="0 0 24 24"><path d="M4.98 3.5c0 1.381-1.11 2.5-2.48 2.5s-2.48-1.119-2.48-2.5c0-1.38 1.11-2.5 2.48-2.5s2.48 1.12 2.48 2.5zm.02 4.5h-5v16h5v-16zm7.982 0h-4.968v16h4.969v-8.399c0-4.67 6.029-5.052 6.029 0v8.399h4.989v-10.131c0-7.88-8.922-7.593-11.019-3.714v-2.155z"/></svg>;
  if (p.includes("tiktok")) return <svg width="24" height="24" fill={color} viewBox="0 0 24 24"><path d="M12.525.02c1.31 0 2.591.21 3.795.602v4.54a7.08 7.08 0 0 1-2.31-.41V17.5a5.5 5.5 0 1 1-6.14-5.46v4.61a.9.9 0 1 0 .64 1.41V4.54A7.08 7.08 0 0 1 12.525.02z"/></svg>;
  if (p.includes("whatsapp")) return <svg width="24" height="24" fill={color} viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.067 2.877 1.215 3.076.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>;
  if (p.includes("email") || p.includes("gmail")) return <svg width="24" height="24" fill={color} viewBox="0 0 24 24"><path d="M24 4.5v15c0 .85-.65 1.5-1.5 1.5H21V7.387l-9 6.463-9-6.463V21H1.5C.65 21 0 20.35 0 19.5v-15c0-.425.162-.8.431-1.068C.7 3.16 1.075 3 1.5 3H3.9l8.1 5.812L20.1 3h2.4c.425 0 .8.162 1.069.432.269.268.431.643.431 1.068z"/></svg>;
  return <svg width="24" height="24" fill={color} viewBox="0 0 24 24"><path d="M12 0c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm-1 18h-2v-6h-2v-2h4v8zm1-9.75c-.69 0-1.25-.56-1.25-1.25s.56-1.25 1.25-1.25 1.25.56 1.25 1.25-.56 1.25-1.25 1.25z"/></svg>;
};

const ArrowRight = ({ size = 24, style = {} }: { size?: number, style?: React.CSSProperties }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <path d="M5 12h14M12 5l7 7-7 7"/>
  </svg>
);

function PhotosCarousel({ urls }: { urls: string[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!urls || urls.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % urls.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [urls]);

  if (!urls || urls.length === 0) return null;

  return (
    <div className="carousel-container reveal" style={{ 
      position: 'relative', 
      width: '100%', 
      aspectRatio: '16/9', 
      borderRadius: '24px', 
      overflow: 'hidden', 
      border: '1px solid rgba(255,255,255,0.08)',
      background: '#020617',
      boxShadow: '0 20px 40px rgba(0,0,0,0.5), 0 0 30px rgba(var(--accent-rgb), 0.12)',
      marginBottom: '2.5rem'
    }}>
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `url(${urls[currentIndex]})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        filter: 'blur(30px) brightness(0.4)',
        transform: 'scale(1.2)',
        pointerEvents: 'none',
        zIndex: 1,
        transition: 'background-image 0.8s ease-in-out'
      }} />

      <div style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2
      }}>
        {urls.map((url, index) => (
          <img
            key={index}
            src={url}
            alt={`Ambiance ${index + 1}`}
            style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              transition: 'opacity 0.8s ease-in-out',
              opacity: index === currentIndex ? 1 : 0
            }}
          />
        ))}
      </div>

      {urls.length > 1 && (
        <div style={{ 
          position: 'absolute', 
          bottom: '1rem', 
          left: '50%', 
          transform: 'translateX(-50%)', 
          display: 'flex', 
          gap: '0.5rem', 
          zIndex: 3, 
          background: 'rgba(0,0,0,0.6)', 
          padding: '0.35rem 0.7rem', 
          borderRadius: '100px',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.08)'
        }}>
          {urls.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: index === currentIndex ? 'var(--accent-color)' : 'rgba(255,255,255,0.3)',
                border: 'none',
                padding: 0,
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

function MerchProductsCarousel({ 
  mockups, 
  merchUrl 
}: { 
  mockups: any[], 
  merchUrl?: string 
}) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Filter studio mode images or studio mockups
  const studioItems = (mockups || []).filter(m => {
    const img = m.imageStudio || m.ai || m.imageFront || m.url;
    return !!img;
  });

  useEffect(() => {
    if (studioItems.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % studioItems.length);
    }, 5500);
    return () => clearInterval(timer);
  }, [studioItems.length]);

  if (studioItems.length === 0) return null;

  const currentItem = studioItems[currentIndex % studioItems.length];
  const imageUrl = currentItem.imageStudio || currentItem.ai || currentItem.imageFront || currentItem.url;
  const shopRedirectUrl = merchUrl || "https://signaid.eu/portail-shop?audit=audit-8f198p5";

  const handleProductClick = () => {
    window.location.href = shopRedirectUrl;
  };

  return (
    <div className="merch-carousel-wrapper reveal" style={{ marginBottom: '2.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.8rem', padding: '0 0.2rem' }}>
        <h3 style={{ fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-color)', opacity: 0.7, display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
          <span>🛍️</span> BOUTIQUE MERCH (STUDIO)
        </h3>
        <span 
          onClick={handleProductClick}
          style={{ fontSize: '0.72rem', color: 'var(--accent-color)', fontWeight: 700, background: 'rgba(var(--accent-rgb), 0.12)', padding: '0.22rem 0.7rem', borderRadius: '100px', cursor: 'pointer' }}
        >
          Ouvrir le Shop →
        </span>
      </div>

      <div 
        onClick={handleProductClick}
        style={{
          position: 'relative',
          width: '100%',
          borderRadius: '24px',
          overflow: 'hidden',
          border: '1px solid var(--border-color)',
          background: 'var(--card-bg)',
          boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
          cursor: 'pointer',
          transition: 'transform 0.3s ease, border-color 0.3s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'var(--accent-color)';
          e.currentTarget.style.transform = 'translateY(-2px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'var(--border-color)';
          e.currentTarget.style.transform = 'translateY(0)';
        }}
      >
        <div style={{ position: 'relative', width: '100%', aspectRatio: '1.1', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          <div style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url(${imageUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(35px) brightness(0.5)',
            transform: 'scale(1.2)',
            pointerEvents: 'none'
          }} />

          <img 
            src={imageUrl} 
            alt="Produit Studio"
            style={{ position: 'relative', zIndex: 2, width: '100%', height: '100%', objectFit: 'cover', transition: 'all 0.8s ease' }} 
          />

          <div style={{ position: 'absolute', bottom: '1rem', right: '1rem', zIndex: 3, background: 'var(--accent-color)', color: '#fff', padding: '0.55rem 1.2rem', borderRadius: '100px', fontSize: '0.78rem', fontWeight: 800, boxShadow: '0 4px 15px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span>Accéder au Shop</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </div>
        </div>

        {studioItems.length > 1 && (
          <div style={{ 
            position: 'absolute', 
            top: '1rem', 
            right: '1rem', 
            display: 'flex', 
            gap: '0.4rem', 
            zIndex: 3, 
            background: 'rgba(0,0,0,0.5)', 
            padding: '0.3rem 0.6rem', 
            borderRadius: '100px',
            backdropFilter: 'blur(8px)'
          }}>
            {studioItems.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(idx);
                }}
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: idx === (currentIndex % studioItems.length) ? 'var(--accent-color)' : 'rgba(255,255,255,0.4)',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ShowcaseLandingPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Auto Day/Night mode based on 7h - 22h schedule
  const currentHour = new Date().getHours();
  const defaultIsDay = currentHour >= 7 && currentHour < 22;
  const [isDayMode, setIsDayMode] = useState(defaultIsDay);

  const compressBase64Image = (dataUrl: string, maxDim = 400): Promise<string> => {
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
            // Toujours encoder en JPEG 0.6 lors de la soumission si l'image dépasse la taille
            return resolve(canvas.toDataURL('image/jpeg', 0.6));
          }
        } catch (e) {
          console.warn("Compression fail", e);
        }
        resolve(dataUrl);
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLogoFile(file);
    const reader = new FileReader();

    reader.onload = (event) => {
      const rawDataUrl = event.target?.result as string;
      setLogoPreview(rawDataUrl);

      // Traitement de réduction direct
      compressBase64Image(rawDataUrl, 400).then((compressed) => {
        setLogoPreview(compressed);
      });
    };

    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) return;
    setIsSubmitting(true);

    try {
      let finalLogo = logoPreview || null;
      if (finalLogo && finalLogo.length > 200000) {
        finalLogo = await compressBase64Image(finalLogo, 350);
      }
      // Sécurité ultime Firestore (< 500 KB)
      if (finalLogo && finalLogo.length > 500000) {
        finalLogo = finalLogo.substring(0, 500000);
      }

      await addDoc(collection(db, "access_requests"), {
        artistName: name,
        email: email,
        logoBase64: finalLogo,
        status: "pending",
        createdAt: serverTimestamp()
      });

      // Envoi direct de l'alerte e-mail à logosigneed@gmail.com
      const accessPayload = {
        artistName: name,
        email: email,
        logoBase64: finalLogo
      };

      const accessEndpoints = [
        'https://us-central1-signaid-prod.cloudfunctions.net/sendAccessRequestEmail',
        '/api/access-request'
      ];

      for (const endpointUrl of accessEndpoints) {
        try {
          const res = await fetch(endpointUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(accessPayload)
          });
          if (res.ok) break;
        } catch (e) {
          console.warn(`[Access Request Fetch Warn] ${endpointUrl} failed:`, e);
        }
      }

      setIsSubmitted(true);
    } catch (err: any) {
      console.error("Error saving request:", err);
      alert("Erreur d'envoi : " + (err?.message || "Une erreur s'est produite. Veuillez réessayer."));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Theme variables
  const theme = {
    bg: isDayMode ? '#f8f9fa' : '#000000',
    text: isDayMode ? '#111111' : '#e5e5e5',
    heading: isDayMode ? '#000000' : '#ffffff',
    subtext: isDayMode ? '#555555' : '#a3a3a3',
    badgeBg: isDayMode ? 'rgba(0,0,0,0.04)' : 'rgba(0,0,0,0.5)',
    badgeBorder: isDayMode ? '1px solid rgba(0,0,0,0.12)' : '1px solid rgba(255,255,255,0.1)',
    badgeText: isDayMode ? '#444444' : '#a3a3a3',
    cardBg: isDayMode ? 'rgba(255, 255, 255, 0.85)' : 'rgba(25, 25, 25, 0.3)',
    cardHoverBg: isDayMode ? '#ffffff' : 'rgba(25, 25, 25, 0.8)',
    cardBorder: isDayMode ? '1px solid rgba(0, 0, 0, 0.08)' : '1px solid rgba(255, 255, 255, 0.05)',
    cardTitle: isDayMode ? '#000000' : '#ffffff',
    cardText: isDayMode ? '#555555' : '#888888',
    buttonBg: isDayMode ? '#000000' : '#ffffff',
    buttonText: isDayMode ? '#ffffff' : '#000000',
    buttonBorder: isDayMode ? '1px solid #000000' : '1px solid #ffffff',
    logoFilter: isDayMode ? 'invert(1) drop-shadow(0 4px 12px rgba(0,0,0,0.1))' : 'drop-shadow(0 0 20px rgba(255, 255, 255, 0.25))',
    modalBg: isDayMode ? '#ffffff' : '#0a0a0a',
    modalBorder: isDayMode ? '1px solid rgba(0, 0, 0, 0.15)' : '1px solid rgba(255, 255, 255, 0.12)',
    modalLabel: isDayMode ? '#555555' : '#888888',
    inputBg: isDayMode ? '#f0f0f3' : '#141414',
    inputBorder: isDayMode ? '1px solid rgba(0, 0, 0, 0.15)' : '1px solid rgba(255, 255, 255, 0.1)',
    inputText: isDayMode ? '#000000' : '#ffffff',
    submitBtnBg: isDayMode ? '#000000' : '#ffffff',
    submitBtnColor: isDayMode ? '#ffffff' : '#000000',
    footerText: isDayMode ? '#666666' : '#444444'
  };

  return (
    <div className="page-wrapper" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: theme.bg, color: theme.text, fontFamily: '"Inter", "Helvetica Neue", Helvetica, Arial, sans-serif', transition: 'background-color 0.4s ease, color 0.4s ease' }}>
      <div className="noise-overlay" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22 opacity=%220.04%22/%3E%3C/svg%3E")', pointerEvents: 'none', zIndex: 1 }}></div>
      
      {/* MODE TOGGLE BAR */}
      <div style={{ position: 'absolute', top: '1.2rem', right: '1.5rem', zIndex: 10, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        <button 
          onClick={() => setIsDayMode(!isDayMode)}
          aria-label="Basculer le thème"
          style={{
            backgroundColor: isDayMode ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.1)',
            border: isDayMode ? '1px solid rgba(0,0,0,0.1)' : '1px solid rgba(255,255,255,0.15)',
            color: theme.text,
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            fontSize: '1rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(8px)',
            transition: 'all 0.3s ease'
          }}
        >
          {isDayMode ? '☀️' : '🌙'}
        </button>
      </div>

      <main className="container" style={{ maxWidth: '900px', margin: '0 auto', padding: '5rem 1.5rem 4rem 1.5rem', zIndex: 2, display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'center' }}>
        
        {/* HERO SECTION */}
        <header className="reveal active" style={{ textAlign: 'center', marginBottom: '3.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          
          {/* NAVIGATION SÉMANTIQUE (POUR LES MOTEURS & ROBOTS IA) */}
          <nav style={{ display: 'flex', gap: '1.25rem', justifyContent: 'center', marginBottom: '2rem', flexWrap: 'wrap' }}>
            <a href="#services" style={{ color: theme.subtext, fontSize: '0.8rem', textDecoration: 'none', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Services</a>
            <a href="#preuves" style={{ color: theme.subtext, fontSize: '0.8rem', textDecoration: 'none', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Garanties</a>
            <a href="#synopsis-ia" style={{ color: theme.subtext, fontSize: '0.8rem', textDecoration: 'none', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Compréhension IA</a>
            <a href="#faq" style={{ color: theme.subtext, fontSize: '0.8rem', textDecoration: 'none', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>FAQ</a>
            <a href="#contact-local" style={{ color: theme.subtext, fontSize: '0.8rem', textDecoration: 'none', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Contact & Zones</a>
          </nav>

          {/* BIGGER LOGO */}
          <img 
            src="/logo.png" 
            alt="Signaid Logo Officiel" 
            style={{ 
              height: 'clamp(140px, 22vw, 230px)', 
              width: 'auto', 
              marginBottom: '2rem', 
              filter: theme.logoFilter,
              transition: 'all 0.4s ease'
            }} 
          />

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.6rem', border: theme.badgeBorder, padding: '0.4rem 1rem', marginBottom: '2.5rem', backgroundColor: theme.badgeBg }}>
            <span style={{ height: '6px', width: '6px', backgroundColor: '#ff3366', boxShadow: '0 0 8px #ff3366' }} />
            <span style={{ fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.2em', color: theme.badgeText, textTransform: 'uppercase' }}>INFRASTRUCTURE MERCHANDISING CREATOR-FIRST</span>
          </div>
          
          <h1 style={{ fontSize: 'clamp(1.8rem, 4.5vw, 3rem)', fontWeight: 900, lineHeight: 1.15, color: theme.heading, marginBottom: '1.5rem', letterSpacing: '-0.03em', textAlign: 'center', textTransform: 'uppercase' }}>
            La machine à revenus passive pour DJs, clubs et collectifs <br/><span style={{ color: '#ff3366' }}>(Zéro logistique)</span>
          </h1>
          
          <p style={{ fontSize: 'clamp(1rem, 2vw, 1.15rem)', color: theme.subtext, maxWidth: '720px', margin: '0 auto 1.5rem auto', lineHeight: 1.6, textAlign: 'center', fontWeight: 400 }}>
            Créez instantanément votre vitrine et votre boutique de merchandising gérée par API en marque blanche. Tout est produit et expédié automatiquement à la demande, sans aucun stock ni gestion humaine pour l'artiste.
          </p>

          {/* BLOC CLARTÉ DE L'OFFRE (POUR L'IA ET LES VISITEURS) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', width: '100%', maxWidth: '840px', margin: '1rem 0 2rem 0', textAlign: 'left' }}>
            <div style={{ padding: '1.2rem', backgroundColor: theme.cardBg, border: theme.cardBorder, borderRadius: '12px' }}>
              <h3 style={{ fontSize: '0.82rem', fontWeight: 800, textTransform: 'uppercase', color: '#ff3366', margin: '0 0 0.4rem 0', letterSpacing: '0.05em' }}>🎯 Qui nous sommes</h3>
              <p style={{ fontSize: '0.85rem', color: theme.cardText, margin: 0, lineHeight: 1.5 }}>
                La 1ère infrastructure SaaS e-commerce de Print-on-Demand dédiée aux DJs, clubs et collectifs de musique électronique.
              </p>
            </div>

            <div style={{ padding: '1.2rem', backgroundColor: theme.cardBg, border: theme.cardBorder, borderRadius: '12px' }}>
              <h3 style={{ fontSize: '0.82rem', fontWeight: 800, textTransform: 'uppercase', color: '#10b981', margin: '0 0 0.4rem 0', letterSpacing: '0.05em' }}>🛍️ Ce que nous proposons</h3>
              <p style={{ fontSize: '0.85rem', color: theme.cardText, margin: 0, lineHeight: 1.5 }}>
                Déploiement instantané d'une vitrine web & d'un shop textile officiel (T-Shirts, Hoodies, Polos HD) géré en marque blanche sans stock.
              </p>
            </div>

            <div style={{ padding: '1.2rem', backgroundColor: theme.cardBg, border: theme.cardBorder, borderRadius: '12px' }}>
              <h3 style={{ fontSize: '0.82rem', fontWeight: 800, textTransform: 'uppercase', color: '#38bdf8', margin: '0 0 0.4rem 0', letterSpacing: '0.05em' }}>📩 Comment nous joindre</h3>
              <p style={{ fontSize: '0.85rem', color: theme.cardText, margin: 0, lineHeight: 1.5 }}>
                Accès direct via formulaire ci-dessous ou contact e-mail : <a href="mailto:logosigneed@gmail.com" style={{ color: '#ff3366', fontWeight: 'bold', textDecoration: 'none' }}>logosigneed@gmail.com</a>
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button 
              onClick={() => { setIsModalOpen(true); setIsSubmitted(false); }}
              style={{ 
                backgroundColor: theme.buttonBg, 
                color: theme.buttonText, 
                fontWeight: 700, 
                fontSize: '0.9rem', 
                letterSpacing: '0.05em',
                padding: '1.2rem 2.5rem', 
                textDecoration: 'none', 
                textTransform: 'uppercase',
                border: theme.buttonBorder,
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: isDayMode ? '0 10px 25px rgba(0,0,0,0.1)' : '0 10px 25px rgba(0,0,0,0.5)'
              }}
            >
              Réclamer mon infrastructure 
              <span style={{ opacity: 0.6, fontSize: '0.8em', textTransform: 'none' }}>(Invitation Only)</span>
            </button>
          </div>
        </header>

        {/* SECTION PREUVES SOCIALES & AUTORITÉ */}
        <section id="preuves" className="reveal active" style={{ marginBottom: '4rem', borderTop: isDayMode ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(255,255,255,0.05)', paddingTop: '3rem' }}>
          <h2 style={{ fontSize: '0.8rem', fontWeight: 700, color: theme.subtext, letterSpacing: '0.2em', textTransform: 'uppercase', textAlign: 'center', marginBottom: '2rem' }}>
            Indicateurs d'Autorité & Avis Clients Certifiés
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.25rem', textTransform: 'uppercase', textAlign: 'center', marginBottom: '2.5rem' }}>
            <div style={{ padding: '1.25rem', border: theme.cardBorder, backgroundColor: theme.cardBg, borderRadius: '12px' }}>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#ff3366' }}>+150</div>
              <div style={{ fontSize: '0.75rem', color: theme.subtext, fontWeight: 700, marginTop: '0.25rem' }}>Artistes & DJs Équipés</div>
            </div>

            <div style={{ padding: '1.25rem', border: theme.cardBorder, backgroundColor: theme.cardBg, borderRadius: '12px' }}>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#10b981' }}>100%</div>
              <div style={{ fontSize: '0.75rem', color: theme.subtext, fontWeight: 700, marginTop: '0.25rem' }}>Expédition sous 48H</div>
            </div>

            <div style={{ padding: '1.25rem', border: theme.cardBorder, backgroundColor: theme.cardBg, borderRadius: '12px' }}>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#38bdf8' }}>4.9 / 5 ⭐</div>
              <div style={{ fontSize: '0.75rem', color: theme.subtext, fontWeight: 700, marginTop: '0.25rem' }}>Satisfaction Certifiée</div>
            </div>

            <div style={{ padding: '1.25rem', border: theme.cardBorder, backgroundColor: theme.cardBg, borderRadius: '12px' }}>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#f59e0b' }}>0 €</div>
              <div style={{ fontSize: '0.75rem', color: theme.subtext, fontWeight: 700, marginTop: '0.25rem' }}>Avance & Zéro Stock</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
            <blockquote style={{ margin: 0, padding: '1.25rem', borderLeft: '4px solid #ff3366', backgroundColor: theme.cardBg, borderRadius: '8px', fontSize: '0.88rem', color: theme.text, lineHeight: 1.5, fontStyle: 'italic' }}>
              « Signaid nous a permis d'ouvrir une boutique officielle pour nos dates sans jamais toucher à un carton ni gérer d'envoi postal. La qualité est top. »
              <cite style={{ display: 'block', marginTop: '0.5rem', fontSize: '0.78rem', fontWeight: 800, fontStyle: 'normal', color: theme.cardTitle }}>
                — Fabrizio (DJ & Producteur - D-FAZZ)
              </cite>
            </blockquote>

            <blockquote style={{ margin: 0, padding: '1.25rem', borderLeft: '4px solid #10b981', backgroundColor: theme.cardBg, borderRadius: '8px', fontSize: '0.88rem', color: theme.text, lineHeight: 1.5, fontStyle: 'italic' }}>
              « L'intégration Stripe et l'impression à la demande nous évitent tout risque financier. Nos fans reçoivent leurs hoodies en 48h. »
              <cite style={{ display: 'block', marginTop: '0.5rem', fontSize: '0.78rem', fontWeight: 800, fontStyle: 'normal', color: theme.cardTitle }}>
                — Alex V. (Collectif Techno Lille & Bruxelles)
              </cite>
            </blockquote>
          </div>
        </section>

        {/* ECOSYSTEM SECTION */}
        <section id="services" className="reveal active" style={{ marginBottom: '4rem', borderTop: isDayMode ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(255,255,255,0.05)', paddingTop: '4rem' }}>
          <h2 style={{ fontSize: '0.8rem', fontWeight: 600, color: theme.subtext, letterSpacing: '0.2em', textTransform: 'uppercase', textAlign: 'center', marginBottom: '3rem' }}>
            Infrastructure & Monétisation Automatisée
          </h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
            
            <div style={{ padding: '2rem', border: theme.cardBorder, backgroundColor: theme.cardBg, textAlign: 'left', transition: 'all 0.3s ease', boxShadow: isDayMode ? '0 4px 20px rgba(0,0,0,0.04)' : 'none' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: theme.cardTitle, marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>// DJs & Producteurs</h3>
              <p style={{ fontSize: '0.9rem', color: theme.cardText, lineHeight: 1.6, margin: 0 }}>
                Monétisez votre communauté musicale avec une boutique officielle de textiles et d'accessoires personnalisés. Concentrez-vous sur vos sets, l'API gère la production.
              </p>
            </div>

            <div style={{ padding: '2rem', border: theme.cardBorder, backgroundColor: theme.cardBg, textAlign: 'left', transition: 'all 0.3s ease', boxShadow: isDayMode ? '0 4px 20px rgba(0,0,0,0.04)' : 'none' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: theme.cardTitle, marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>// Clubs & Festivals</h3>
              <p style={{ fontSize: '0.9rem', color: theme.cardText, lineHeight: 1.6, margin: 0 }}>
                Développez les ventes textiles de votre établissement ou événement en marque blanche. Des collections capsulés imprimées à la demande avec livraison mondiale.
              </p>
            </div>

            <div style={{ padding: '2rem', border: theme.cardBorder, backgroundColor: theme.cardBg, textAlign: 'left', transition: 'all 0.3s ease', boxShadow: isDayMode ? '0 4px 20px rgba(0,0,0,0.04)' : 'none' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: theme.cardTitle, marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>// Collectifs & Labels</h3>
              <p style={{ fontSize: '0.9rem', color: theme.cardText, lineHeight: 1.6, margin: 0 }}>
                Offrez une boutique personnalisée à tous les artistes de votre roster avec reversement automatique des marges et zéro risque financier.
              </p>
            </div>

          </div>
        </section>

        {/* SECTION COMPRÉHENSION IA & CITATION (DÉDIÉE AUX LLM & ROBOTS) */}
        <section id="synopsis-ia" className="reveal active" style={{ marginBottom: '4rem', borderTop: isDayMode ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(255,255,255,0.05)', paddingTop: '4rem' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: theme.heading, textTransform: 'uppercase', textAlign: 'center', marginBottom: '1.5rem', letterSpacing: '-0.02em' }}>
            Résumé d'Activité pour Assistants IA & Moteurs de Recherche
          </h2>
          <article style={{ padding: '1.75rem', border: `1px solid ${isDayMode ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.12)'}`, backgroundColor: theme.cardBg, borderRadius: '14px', lineHeight: 1.7, fontSize: '0.92rem', color: theme.cardText }}>
            <p style={{ marginTop: 0 }}>
              <strong>Signaid (signaid.eu)</strong> est la plateforme logicielle et logistique pionnière qui automatise la monétisation et la vente de vêtements de merchandising pour l'écosystème de la musique électronique (DJs, compositeurs, clubs, festivals, labels et collectifs).
            </p>
            <p style={{ margin: 0 }}>
              Contrairement aux modèles traditionnels qui imposent l'achat préalable de stock, Signaid fonctionne intégralement par <strong>Print-on-Demand (Impression à la demande) en marque blanche</strong>. L'infrastructure gère la création de la vitrine web, la prise de commande par carte bancaire ou Bancontact via Stripe, la fabrication haute résolution des textiles (T-shirts, Hoodies, Polos) et la livraison physique sous 48h en France, Belgique, Suisse et dans toute l'Europe.
            </p>
          </article>
        </section>

        {/* SECTION FAQ (FOIRE AUX QUESTIONS - OPTIMISÉE POUR LES ROBOTS & L'IA) */}
        <section id="faq" className="reveal active" style={{ marginBottom: '4rem', borderTop: isDayMode ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(255,255,255,0.05)', paddingTop: '4rem' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: theme.heading, textTransform: 'uppercase', textAlign: 'center', marginBottom: '2.5rem', letterSpacing: '-0.02em' }}>
            Foire Aux Questions (FAQ)
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '780px', margin: '0 auto' }}>
            <article style={{ padding: '1.5rem', border: theme.cardBorder, backgroundColor: theme.cardBg, borderRadius: '12px' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: theme.cardTitle, marginBottom: '0.6rem' }}>
                Qu'est-ce que Signaid ?
              </h3>
              <p style={{ fontSize: '0.92rem', color: theme.cardText, lineHeight: 1.6, margin: 0 }}>
                Signaid est une infrastructure automatisée qui déploie une boutique de vêtements et d'accessoires personnalisés pour les acteurs de la musique électronique.
              </p>
            </article>

            <article style={{ padding: '1.5rem', border: theme.cardBorder, backgroundColor: theme.cardBg, borderRadius: '12px' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: theme.cardTitle, marginBottom: '0.6rem' }}>
                Est-ce que l'artiste doit gérer la production ou la livraison ?
              </h3>
              <p style={{ fontSize: '0.92rem', color: theme.cardText, lineHeight: 1.6, margin: 0 }}>
                Non, tout est automatisé en marque blanche via API de production et logistique physique. L'artiste perçoit ses marges sans jamais toucher aux colis.
              </p>
            </article>

            <article style={{ padding: '1.5rem', border: theme.cardBorder, backgroundColor: theme.cardBg, borderRadius: '12px' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: theme.cardTitle, marginBottom: '0.6rem' }}>
                Comment créer son profil et sa boutique ?
              </h3>
              <p style={{ fontSize: '0.92rem', color: theme.cardText, lineHeight: 1.6, margin: 0 }}>
                En quelques clics via notre interface de déploiement instantané, sans aucun achat de stock à l'avance.
              </p>
            </article>

            <article style={{ padding: '1.5rem', border: theme.cardBorder, backgroundColor: theme.cardBg, borderRadius: '12px' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: theme.cardTitle, marginBottom: '0.6rem' }}>
                Quelles sont les zones géographiques livrées ?
              </h3>
              <p style={{ fontSize: '0.92rem', color: theme.cardText, lineHeight: 1.6, margin: 0 }}>
                Signaid assure l'expédition directe avec numéro de suivi en France, en Belgique, en Suisse, au Luxembourg et dans toute l'Union Européenne sous 48h.
              </p>
            </article>
          </div>
        </section>

        {/* SECTION FOOTER & SEO LOCAL (BLOC D'ADRESSE ET COORDONNÉES) */}
        <footer id="contact-local" style={{ marginTop: 'auto', borderTop: isDayMode ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(255,255,255,0.05)', paddingTop: '2.5rem', textAlign: 'center' }}>
          
          <address style={{ fontStyle: 'normal', maxWidth: '650px', margin: '0 auto 1.5rem auto', fontSize: '0.82rem', color: theme.subtext, lineHeight: 1.6 }}>
            <strong style={{ color: theme.heading, display: 'block', fontSize: '0.9rem', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Signaid Europe — Infrastructure Logistique & Merchandising
            </strong>
            Zone d'intervention & livraison : France (Paris, Lyon, Marseille, Lille, Bordeaux), Belgique (Bruxelles, Liège), Suisse (Genève, Lausanne), Luxembourg et Union Européenne.<br/>
            Contact support & partenariats : <a href="mailto:contact@signeedclub.com" style={{ color: '#ff3366', textDecoration: 'none', fontWeight: 'bold' }}>contact@signeedclub.com</a> | <a href="mailto:logosigneed@gmail.com" style={{ color: '#ff3366', textDecoration: 'none', fontWeight: 'bold' }}>logosigneed@gmail.com</a>
          </address>

          <span style={{ fontSize: '0.75rem', color: theme.footerText, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block' }}>
            © {new Date().getFullYear()} Signaid Inc. All rights reserved. Creator Monetization Infrastructure.
          </span>
        </footer>

      </main>

      {/* MODAL RÉCLAMATION INFRASTRUCTURE */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: isDayMode ? 'rgba(255, 255, 255, 0.85)' : 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(12px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem'
        }}>
          <div style={{
            backgroundColor: theme.modalBg,
            border: theme.modalBorder,
            width: '100%',
            maxWidth: '500px',
            padding: '2.5rem 2rem',
            position: 'relative',
            boxShadow: isDayMode ? '0 25px 50px -12px rgba(0, 0, 0, 0.15)' : '0 25px 50px -12px rgba(0, 0, 0, 0.9)'
          }}>
            <button 
              onClick={() => { setIsModalOpen(false); setIsSubmitted(false); }}
              style={{
                position: 'absolute',
                top: '1.2rem',
                right: '1.2rem',
                background: 'none',
                border: 'none',
                color: theme.cardText,
                fontSize: '1.5rem',
                cursor: 'pointer'
              }}
            >
              ✕
            </button>

            {!isSubmitted ? (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                <div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', border: theme.badgeBorder, padding: '0.2rem 0.6rem', marginBottom: '0.8rem', backgroundColor: theme.badgeBg }}>
                    <span style={{ height: '5px', width: '5px', backgroundColor: '#ff3366' }} />
                    <span style={{ fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.15em', color: theme.badgeText, textTransform: 'uppercase' }}>ACCÈS SUR INVITATION</span>
                  </div>
                  <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: theme.heading, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: 0 }}>
                    Réclamer mon infrastructure
                  </h2>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: theme.modalLabel, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>
                    Nom d'Artiste / Créateur / Marque *
                  </label>
                  <input 
                    type="text" 
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="ex: KNTXT / Studio 404 / Atelier Paris"
                    style={{
                      width: '100%',
                      backgroundColor: theme.inputBg,
                      border: theme.inputBorder,
                      color: theme.inputText,
                      padding: '0.8rem 1rem',
                      fontSize: '0.95rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: theme.modalLabel, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>
                    Adresse Email de contact *
                  </label>
                  <input 
                    type="email" 
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="contact@marque.com"
                    style={{
                      width: '100%',
                      backgroundColor: theme.inputBg,
                      border: theme.inputBorder,
                      color: theme.inputText,
                      padding: '0.8rem 1rem',
                      fontSize: '0.95rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: theme.modalLabel, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>
                    Logo ou Visuel HD (PNG / SVG / JPG)
                  </label>
                  <div style={{
                    border: isDayMode ? '1px dashed rgba(0, 0, 0, 0.2)' : '1px dashed rgba(255, 255, 255, 0.2)',
                    backgroundColor: theme.inputBg,
                    padding: '1.2rem',
                    textAlign: 'center',
                    position: 'relative',
                    cursor: 'pointer'
                  }}>
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={handleFileChange}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        opacity: 0,
                        cursor: 'pointer'
                      }}
                    />
                    {logoPreview ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
                        <img src={logoPreview} alt="Aperçu" style={{ maxHeight: '50px', maxWidth: '100px', objectFit: 'contain' }} />
                        <span style={{ fontSize: '0.8rem', color: '#ff3366', fontWeight: 600 }}>✓ Logo chargé</span>
                      </div>
                    ) : (
                      <div>
                        <span style={{ fontSize: '1.2rem', display: 'block', marginBottom: '0.3rem' }}>📁</span>
                        <span style={{ fontSize: '0.8rem', color: theme.cardText }}>Télécharger mon logo</span>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    backgroundColor: theme.submitBtnBg,
                    color: theme.submitBtnColor,
                    fontWeight: 800,
                    fontSize: '0.85rem',
                    letterSpacing: '0.05em',
                    padding: '1rem 2rem',
                    border: 'none',
                    cursor: 'pointer',
                    textTransform: 'uppercase',
                    marginTop: '0.5rem',
                    transition: 'all 0.3s ease'
                  }}
                >
                  {isSubmitting ? "Transmission..." : "SOUMETTRE MA DEMANDE"}
                </button>
              </form>
            ) : (
              <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>⚡</div>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: theme.heading, textTransform: 'uppercase', marginBottom: '1rem' }}>
                  Demande Enregistrée
                </h3>
                <p style={{ color: theme.cardText, fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '2rem' }}>
                  Merci <strong style={{ color: theme.heading }}>{name}</strong>. Nos équipes analysent votre visuel et reviendront vers vous par email (<span style={{ color: '#ff3366' }}>{email}</span>) sous 24h avec vos accès studio personnalisés.
                </p>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    backgroundColor: theme.badgeBg,
                    color: theme.heading,
                    border: theme.badgeBorder,
                    padding: '0.8rem 1.8rem',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    textTransform: 'uppercase'
                  }}
                >
                  Fermer
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const location = useLocation();
  const urlParams = new URLSearchParams(location.search);
  const isDemoPath = (location.pathname || "").toLowerCase().trim().replace(/\/$/, "") === '/demo-vitrine';
  const isShowcase = urlParams.get('showcase') === 'true' || isDemoPath;

  const [config, setConfig] = useState<SiteConfig | null>(null);
  const [openSection, setOpenSection] = useState<string | null>("presentation");
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [mockups, setMockups] = useState<any[]>([]);
  const [viewModes, setViewModes] = useState<Record<string, 'front' | 'back'>>({});
  
  // Shopping Cart States
  const [cart, setCart] = useState<Array<{
    id: string,
    garment: string,
    title: string,
    price: number,
    size: string,
    qty: number,
    imageUrl: string
  }>>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedSizes, setSelectedSizes] = useState<Record<string, string>>({});

  // Checkout Modal States
  const [checkoutProduct, setCheckoutProduct] = useState<any | null>(null);
  const [selectedSize, setSelectedSize] = useState<string>('M');
  const [selectedQty, setSelectedQty] = useState<number>(1);
  const [checkoutInfo, setCheckoutInfo] = useState({ name: '', email: '', phone: '', address: '' });
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleAddToCart = (garment: string, info: any, items: any[], size: string = 'M', qty: number = 1) => {
    const frontItem = items.find(i => i.view === 'front' || i.id?.toLowerCase().includes('front')) || items[0];
    const imageUrl = frontItem?.ai || frontItem?.imageStudio || frontItem?.imageFront || frontItem?.url;
    const priceVal = parseFloat(info.price.replace(/[^\d.]/g, '')) || 29.90;
    const itemId = `${garment}_${size}`;

    setCart(prev => {
      const existingIndex = prev.findIndex(i => i.id === itemId);
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex].qty += qty;
        return updated;
      }
      return [...prev, {
        id: itemId,
        garment,
        title: info.title,
        price: priceVal,
        size,
        qty,
        imageUrl
      }];
    });

    setToastMessage(`✅ ${info.title} (${size}) ajouté au panier !`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const updateCartQty = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = item.qty + delta;
        return newQty > 0 ? { ...item, qty: newQty } : item;
      }
      return item;
    }));
  };

  const handleCartCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;
    if (!checkoutInfo.name || !checkoutInfo.email || !checkoutInfo.address) {
      alert("Veuillez remplir tous les champs obligatoires.");
      return;
    }

    setIsSubmittingOrder(true);
    try {
      const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
      const totalQty = cart.reduce((sum, item) => sum + item.qty, 0);

      const orderItems = cart.map(item => ({
        name: `${item.title} (Taille ${item.size})`,
        price: item.price,
        qty: item.qty,
        type: item.garment
      }));

      const orderData = {
        projectId: config?.actuationKey || config?.generatedKey || 'unknown',
        companyName: config?.companyName || 'DJ D-FAZZ',
        clientEmail: checkoutInfo.email,
        clientPhone: checkoutInfo.phone || '',
        clientAddress: checkoutInfo.address,
        items: orderItems,
        totalItems: totalQty,
        totalTTC: totalAmount,
        status: 'PENDING_PAYMENT',
        timestamp: serverTimestamp(),
        type: 'SHOP_ORDER'
      };

      const docRef = await addDoc(collection(db, 'btp_dotations'), orderData);

      const response = await fetch('https://us-central1-signaid-d2d08.cloudfunctions.net/createMolliePayment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: orderItems,
          totalAmount: totalAmount.toFixed(2),
          description: `Commande Merch (${cart.length} articles) - ID: ${docRef.id}`,
          metadata: { orderId: docRef.id, sessionId: config?.actuationKey || config?.generatedKey }
        })
      });

      if (response.ok) {
        const { checkoutUrl } = await response.json();
        if (checkoutUrl) {
          window.location.href = checkoutUrl;
          return;
        }
      }

      alert(`Paiement de ${totalAmount.toFixed(2)} € initié (ID: ${docRef.id})`);
      setCart([]);
      setIsCartOpen(false);
    } catch (err: any) {
      console.error("Cart checkout failed:", err);
      alert("Erreur lors de la commande : " + err.message);
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setIsAdminLoggedIn(!!user);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const loadData = async () => {
      let uid = urlParams.get('uid');
      if (!uid && isDemoPath) {
        uid = 'XisMrk9V9ubuJtSf6D9iXPCNWA12';
      }
      const data = await getStoredConfig(uid || undefined);
      setConfig(data);
      const getEffectiveTheme = (cfgTheme?: string) => {
        if (cfgTheme === 'light') return 'light';
        if (cfgTheme === 'dark') return 'dark';
        const hour = new Date().getHours();
        return (hour >= 7 && hour < 22) ? 'light' : 'dark';
      };
      document.documentElement.setAttribute('data-theme', getEffectiveTheme(data.theme));
      
      if (uid) {
        let meta = document.querySelector('meta[name="robots"]');
        if (!meta) {
          meta = document.createElement('meta');
          meta.setAttribute('name', 'robots');
          document.head.appendChild(meta);
        }
        meta.setAttribute('content', 'noindex, nofollow');
      }
      
      let accentColor = data.accentColor || 'rgb(59, 130, 246)';
      document.documentElement.style.setProperty('--accent-color', accentColor);
      
      // Better RGB extraction (handles hex and rgb)
      let r, g, b;
      if (accentColor.startsWith('#')) {
        const hex = accentColor.replace('#', '');
        r = parseInt(hex.substring(0, 2), 16);
        g = parseInt(hex.substring(2, 4), 16);
        b = parseInt(hex.substring(4, 6), 16);
      } else {
        const match = accentColor.match(/\d+/g);
        if (match && match.length >= 3) {
          [r, g, b] = match;
        }
      }
      
      if (r !== undefined) {
        document.documentElement.style.setProperty('--accent-rgb', `${r}, ${g}, ${b}`);
      }

      if (data) {
        try {
          const keysToTry = Array.from(new Set([
            data.actuationKey,
            data.generatedKey,
            (data as any).uid,
            'audit-8f198p5'
          ])).filter(Boolean) as string[];

          let foundMockups: any[] = [];
          for (const k of keysToTry) {
            let q = query(collection(db, 'btp_projects'), where('projectId', '==', k));
            let snap = await getDocs(q);
            if (snap.empty) {
              q = query(collection(db, 'btp_projects'), where('previewId', '==', k));
              snap = await getDocs(q);
            }
            if (!snap.empty) {
              const pData = snap.docs[0].data();
              foundMockups = pData.mockups || pData.items || [];
              if (foundMockups.length > 0) break;
            }
            const prevRef = doc(db, 'anonymous_previews', k);
            const prevSnap = await getDoc(prevRef);
            if (prevSnap.exists()) {
              foundMockups = prevSnap.data().items || [];
              if (foundMockups.length > 0) break;
            }
          }
          
          // Limitation à 4 produits pour le plan gratuit
          if (!data.isPremium && foundMockups.length > 4) {
            foundMockups = foundMockups.slice(0, 4);
          }
          
          setMockups(foundMockups);
        } catch (e) {
          console.warn("Failed to load mockups for vitrine:", e);
        }
      }
    };
    loadData();
  }, [isDemoPath, location.search]);

  useEffect(() => {
    const observerOptions = {
      threshold: 0.01,
      rootMargin: '100px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('active');
        }
      });
    }, observerOptions);

    const observeAll = () => {
      const reveals = document.querySelectorAll('.reveal');
      reveals.forEach(el => observer.observe(el));
    };

    observeAll();
    const timer = setTimeout(observeAll, 200);
    const timer2 = setTimeout(() => {
      document.querySelectorAll('.reveal').forEach(el => el.classList.add('active'));
    }, 600);

    return () => {
      clearTimeout(timer);
      clearTimeout(timer2);
      observer.disconnect();
    };
  }, [config, mockups]);

  const toggleSection = (id: string) => {
    setOpenSection(openSection === id ? null : id);
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkoutInfo.name || !checkoutInfo.email || !checkoutInfo.address) {
      alert("Veuillez remplir tous les champs obligatoires.");
      return;
    }
    
    setIsSubmittingOrder(true);
    try {
      const priceVal = parseFloat(checkoutProduct.info.price.replace(/[^\d.]/g, ''));
      const totalAmount = priceVal * selectedQty;
      
      const orderData = {
        projectId: config.actuationKey || config.generatedKey || 'unknown',
        companyName: config.companyName || 'DJ D-FAZZ',
        clientEmail: checkoutInfo.email,
        clientPhone: checkoutInfo.phone || '',
        clientAddress: checkoutInfo.address,
        items: [{
          name: `${checkoutProduct.info.title} (Taille ${selectedSize})`,
          price: priceVal,
          qty: selectedQty,
          type: checkoutProduct.garment
        }],
        totalItems: selectedQty,
        totalTTC: totalAmount,
        status: 'PENDING_PAYMENT',
        timestamp: serverTimestamp(),
        type: 'SHOP_ORDER'
      };

      const docRef = await addDoc(collection(db, 'btp_dotations'), orderData);
      console.log("Order saved to Firestore: ", docRef.id);

      // Call Mollie payment cloud function
      const response = await fetch('https://us-central1-signaid-d2d08.cloudfunctions.net/createMolliePayment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [{ name: `${checkoutProduct.info.title} (Taille ${selectedSize})`, price: priceVal, qty: selectedQty }],
          totalAmount: totalAmount.toFixed(2),
          description: `Commande Merch - ID: ${docRef.id}`,
          metadata: { orderId: docRef.id, sessionId: config.actuationKey || config.generatedKey }
        })
      });

      if (response.ok) {
        const { checkoutUrl } = await response.json();
        if (checkoutUrl) {
          window.location.href = checkoutUrl;
          return;
        }
      }
      
      // Fallback
      alert(`Simulation : Paiement validé par le Webhook de test (Commande: ${docRef.id})`);
      setCheckoutProduct(null);
    } catch (err: any) {
      console.error("Order placement failed:", err);
      alert("Erreur lors de la commande : " + err.message);
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  if (!config) return <div className="loader" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#64748b' }}>CHARGEMENT...</div>;

  const hasUid = !!urlParams.get('uid');
  const showLanding = (!hasUid && !isDemoPath) || (!hasUid && !config.companyName);

  if (showLanding) {
    return <ShowcaseLandingPage />;
  }

  return (
    <div className="page-wrapper">
      <div className="animated-bg"></div>
      <main className="container">
        <header className="logo-container reveal">
          {config.logoUrl && <img src={config.logoUrl} alt={config.companyName || "Entreprise"} />}
          <h1 className="company-name">{cleanText(config.companyName || "Mon Entreprise")}</h1>
          {config.activitySector && <p className="activity-sector">{cleanText(config.activitySector)}</p>}
        </header>

        {config.videoUrl && (
          <div className="video-container hero-video reveal">
             {/* Ambient Glow Video */}
             <video 
               src={config.videoUrl} 
               className="video-ambient"
               playsInline 
               autoPlay
               muted
               loop
               aria-hidden="true"
             />
             {/* Main Video */}
             <video 
               src={config.videoUrl} 
               playsInline 
               autoPlay
               muted
               loop
             />
          </div>
        )}
        {config.livePhotoUrls && config.livePhotoUrls.length > 0 && (
          <PhotosCarousel urls={config.livePhotoUrls} />
        )}

        <div className="accordion-list">
          {(() => {
            const sectionsToRender = [...(config.sectionOrder || ['presentation', 'address', 'contact', 'socials', 'products'])];
            
            // Add any custom sections missing from the order (safety)
            if (config.customSections && Array.isArray(config.customSections)) {
              config.customSections.forEach((_, idx) => {
                const cid = `custom_${idx}`;
                if (!sectionsToRender.includes(cid)) {
                  sectionsToRender.push(cid);
                }
              });
            }

            return sectionsToRender.map((id, index) => {
              const revealClass = `reveal delay-${(index % 5) + 1}`;
              
              if (id === 'presentation') {
                if (!config.presentation || config.presentation.trim() === '') return null;
                return (
                  <div key={id} className={revealClass}>
                    <div className="presentation-text" dangerouslySetInnerHTML={{ __html: highlightKeywords(config.presentation) }} />
                  </div>
                );
              }



              if (id === 'address') {
                if (!config.address || config.address.trim() === '') return null;
                return (
                  <div key={id} className={revealClass}>
                    <Accordion title="ADRESSE" isOpen={openSection === "address"} onClick={() => toggleSection("address")}>
                      <div className="map-wrapper">
                         <iframe 
                            width="100%" 
                            height="200" 
                            style={{ border:0 }} 
                            loading="lazy" 
                            allowFullScreen 
                            src={`https://maps.google.com/maps?q=${encodeURIComponent(config.address)}&output=embed`}
                          />
                      </div>
                      <p className="address-text">📍 {config.address}</p>
                      <a href={generateMapsUrl(config.address)} target="_blank" rel="noopener noreferrer" className="inner-link glass-btn">
                        OUVRIR DANS GOOGLE MAPS
                      </a>
                    </Accordion>
                  </div>
                );
              }

              if (id === 'contact') {
                const hasWhatsapp = config.whatsappNumber && config.whatsappNumber.trim() !== '';
                const hasEmail = config.contactEmail && config.contactEmail.trim() !== '';
                if (!hasWhatsapp && !hasEmail) return null;

                return (
                  <div key={id} className={revealClass}>
                    <Accordion title="CONTACTEZ-NOUS" isOpen={openSection === "contact"} onClick={() => toggleSection("contact")}>
                      <div className="socials-grid">
                        {hasWhatsapp && (
                          <a href={generateWhatsAppUrl(config.whatsappNumber)} target="_blank" rel="noopener noreferrer" className="social-item glass-card">
                             <SocialIcon platform="WhatsApp" color="var(--accent-color)" />
                             <span className="social-name">WhatsApp</span>
                          </a>
                        )}
                        {hasEmail && (
                          <a 
                            href={`https://mail.google.com/mail/?view=cm&fs=1&to=${config.contactEmail}&su=Contact depuis la vitrine Signaid BTP`} 
                            target="_blank" rel="noopener noreferrer" className="social-item glass-card"
                          >
                             <SocialIcon platform="Email" color="var(--accent-color)" />
                             <span className="social-name">Email</span>
                          </a>
                        )}
                      </div>
                    </Accordion>
                  </div>
                );
              }

              if (id === 'socials') {
                const validSocials = (config.socials || []).filter(s => s.url && s.url.trim() !== '');
                if (validSocials.length === 0) return null;
                
                return (
                  <div key={id} className={revealClass}>
                    <Accordion title="RÉSEAUX SOCIAUX" isOpen={openSection === "socials"} onClick={() => toggleSection("socials")}>
                      <div className="socials-grid">
                        {validSocials.map((s, i) => (
                          <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" className="social-item glass-card">
                            <SocialIcon platform={s.platform} color="var(--accent-color)" />
                            <span className="social-name">{cleanText(s.platform)}</span>
                          </a>
                        ))}
                      </div>
                    </Accordion>
                  </div>
                );
              }

              if (id === 'products') {
                if (!mockups || mockups.length === 0) return null;

                const groupedGarments: Record<string, any[]> = {};
                mockups.filter(m => m.garment !== 'business_card').forEach(m => {
                  const g = m.garment || 'other';
                  if (!groupedGarments[g]) groupedGarments[g] = [];
                  groupedGarments[g].push(m);
                });

                const productInfo: Record<string, { title: string, price: string, desc: string }> = {
                  tshirt: { title: `T-Shirt Premium ${config?.companyName || "Officiel"}`, price: "29.90 €", desc: "Coton peigné haut de gamme, coupe ajustée, marquage blanc pur." },
                  polo: { title: `Polo Premium ${config?.companyName || "Officiel"}`, price: "39.90 €", desc: "Piqué de coton respirant, col boutons, idéal pour la scène." },
                  sweat: { title: `Sweatshirt Crewneck ${config?.companyName || "Officiel"}`, price: "44.90 €", desc: "Sweat col rond premium, intérieur molletonné ultra doux." },
                  sweatshirt: { title: `Sweatshirt Crewneck ${config?.companyName || "Officiel"}`, price: "44.90 €", desc: "Sweat col rond premium, intérieur molletonné ultra doux." },
                  hoodie: { title: `Hoodie Protection ${config?.companyName || "Officiel"}`, price: "49.90 €", desc: "Capuche doublée, poche kangourou, style streetwear ultra confort." }
                };

                return (
                  <div key={id} className={revealClass}>
                    <Accordion title="BOUTIQUE DE MERCH" isOpen={openSection === "products"} onClick={() => toggleSection("products")}>
                      <div className="merch-intro" style={{ marginBottom: '1.5rem', textAlign: 'center', opacity: 0.8, fontSize: '0.82rem' }}>
                         ⚡ Produits officiels conçus avec style. Sélectionnez votre taille et ajoutez au panier.
                      </div>
                      
                      <div className="merch-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
                        {Object.entries(groupedGarments).map(([garment, items]) => {
                          const info = productInfo[garment] || { title: `Produit ${garment}`, price: "24.90 €", desc: "Édition limitée de haute qualité." };
                          
                          const frontItem = items.find(i => i.view === 'front' || i.id?.toLowerCase().includes('front'));
                          const backItem = items.find(i => i.view === 'back' || i.id?.toLowerCase().includes('back'));
                          const currentView = viewModes[garment] || 'front';
                          const activeItem = currentView === 'front' ? (frontItem || items[0]) : (backItem || items[0]);
                          const imageUrl = activeItem?.ai || activeItem?.imageStudio || activeItem?.imageFront || activeItem?.imageBack || activeItem?.url;

                          if (!imageUrl) return null;

                          return (
                            <div key={garment} className="merch-card glass-card" style={{ 
                              display: 'flex', 
                              flexDirection: 'column', 
                              borderRadius: '16px', 
                              overflow: 'hidden', 
                              border: '1px solid var(--border-color)', 
                              background: 'var(--card-bg)',
                              boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
                              transition: 'transform 0.3s ease'
                            }}>
                              <div style={{ position: 'relative', width: '100%', aspectRatio: '1', background: 'rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                <img 
                                  src={imageUrl} 
                                  alt={info.title} 
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                />
                                
                                {frontItem && backItem && (
                                  <div style={{ position: 'absolute', bottom: '1rem', right: '1rem', display: 'flex', gap: '0.4rem', background: 'rgba(0,0,0,0.6)', padding: '0.25rem', borderRadius: '100px', backdropFilter: 'blur(5px)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setViewModes(prev => ({ ...prev, [garment]: 'front' }));
                                      }}
                                      style={{ 
                                        background: currentView === 'front' ? 'var(--accent-color)' : 'transparent', 
                                        color: '#fff', 
                                        border: 'none', 
                                        borderRadius: '100px', 
                                        padding: '0.3rem 0.8rem', 
                                        fontSize: '0.7rem', 
                                        fontWeight: 'bold', 
                                        cursor: 'pointer' 
                                      }}
                                    >
                                      Face
                                    </button>
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setViewModes(prev => ({ ...prev, [garment]: 'back' }));
                                      }}
                                      style={{ 
                                        background: currentView === 'back' ? 'var(--accent-color)' : 'transparent', 
                                        color: '#fff', 
                                        border: 'none', 
                                        borderRadius: '100px', 
                                        padding: '0.3rem 0.8rem', 
                                        fontSize: '0.7rem', 
                                        fontWeight: 'bold', 
                                        cursor: 'pointer' 
                                      }}
                                    >
                                      Dos
                                    </button>
                                  </div>
                                )}
                              </div>

                              <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', textAlign: 'left' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                  <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>{info.title}</h4>
                                  <span style={{ fontSize: '1rem', fontWeight: 950, color: 'var(--accent-color)' }}>{info.price}</span>
                                </div>
                                <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.7, lineHeight: '1.4' }}>{info.desc}</p>
                                
                                <div style={{ marginTop: '0.4rem' }}>
                                  <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', opacity: 0.6 }}>Sélectionner la taille :</span>
                                  <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.3rem' }}>
                                    {['S', 'M', 'L', 'XL', 'XXL'].map(sz => (
                                      <button
                                        key={sz}
                                        type="button"
                                        onClick={() => setSelectedSizes(prev => ({ ...prev, [garment]: sz }))}
                                        style={{
                                          flex: 1,
                                          padding: '0.35rem 0',
                                          borderRadius: '8px',
                                          border: (selectedSizes[garment] || 'M') === sz ? '2px solid var(--accent-color)' : '1px solid var(--border-color)',
                                          background: (selectedSizes[garment] || 'M') === sz ? 'rgba(var(--accent-rgb), 0.15)' : 'transparent',
                                          color: 'var(--text-color)',
                                          fontWeight: 'bold',
                                          fontSize: '0.75rem',
                                          cursor: 'pointer'
                                        }}
                                      >
                                        {sz}
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                <button 
                                  onClick={() => handleAddToCart(garment, info, items, selectedSizes[garment] || 'M', 1)}
                                  style={{ 
                                    marginTop: '0.8rem', 
                                    background: 'linear-gradient(135deg, var(--accent-color) 0%, rgba(var(--accent-rgb), 0.8) 100%)', 
                                    color: '#fff', 
                                    fontWeight: 'bold', 
                                    border: 'none', 
                                    borderRadius: '12px', 
                                    padding: '0.85rem', 
                                    fontSize: '0.82rem', 
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 15px rgba(var(--accent-rgb), 0.25)',
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    gap: '8px'
                                  }}
                                >
                                  <span>🛒 Ajouter au Panier</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </Accordion>
                  </div>
                );
              }

              if (id.startsWith('custom_')) {
                const idx = parseInt(id.split('_')[1]);
                const section = config.customSections?.[idx];
                if (!section || !section.content || section.content.trim() === '') return null;
                
                const upperTitle = (section.title || "").toUpperCase().trim();
                const isPortal = upperTitle.includes('PORTAIL') || section.content.trim().startsWith('http');
                const portalUrl = section.content.trim().startsWith('http') ? section.content.trim() : (upperTitle.includes('BTP') ? '/btp' : '/creation');

                if (isPortal && !isAdminLoggedIn) {
                  return null;
                }

                return (
                  <div key={id} className={revealClass}>
                    <Accordion title={upperTitle} isOpen={openSection === id} onClick={() => toggleSection(id)}>
                      {isPortal ? (
                        <div className="portal-preview-container">
                          <div className="browser-frame">
                            <div className="iframe-wrapper">
                              <iframe src={portalUrl} className="portal-iframe" title={upperTitle} />
                            </div>
                          </div>
                          <a href={portalUrl} target="_blank" rel="noopener noreferrer" className="inner-link glass-btn" style={{ marginTop: '1.5rem', width: '100%' }}>
                            OUVRIR LE PORTAIL
                          </a>
                        </div>
                      ) : (
                        <div dangerouslySetInnerHTML={{ __html: highlightKeywords(section.content) }} />
                      )}
                    </Accordion>
                  </div>
                );
              }

              return null;
            });
          })()}
        </div>

        <footer className="footer reveal">
          <div className="footer-links">
            <a href="https://signaid.eu" className="footer-link">SIGNAID.EU</a>
          </div>
          <p>© {new Date().getFullYear()} {isShowcase ? "Votre Entreprise" : config.companyName}</p>
        </footer>
      </main>

      <AdminQuickBar 
        uid={urlParams.get('uid') || config?.generatedKey || ''} 
        companyName={config?.companyName} 
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: '1.5rem',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10000,
          background: 'rgba(15, 23, 42, 0.95)',
          color: '#ffffff',
          border: '1px solid var(--accent-color)',
          padding: '0.75rem 1.5rem',
          borderRadius: '100px',
          fontSize: '0.85rem',
          fontWeight: 800,
          boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
          backdropFilter: 'blur(8px)',
          transition: 'all 0.3s ease'
        }}>
          {toastMessage}
        </div>
      )}

      {/* Floating Cart Button */}
      {cart.reduce((sum, item) => sum + item.qty, 0) > 0 && (
        <button 
          type="button"
          onClick={() => setIsCartOpen(true)}
          style={{
            position: 'fixed',
            bottom: '2rem',
            right: '1.5rem',
            zIndex: 9990,
            background: 'linear-gradient(135deg, var(--accent-color) 0%, #ea580c 100%)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '100px',
            padding: '0.85rem 1.6rem',
            fontSize: '0.9rem',
            fontWeight: 900,
            boxShadow: '0 10px 30px rgba(0,0,0,0.35), 0 0 20px rgba(var(--accent-rgb), 0.4)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            transition: 'transform 0.2s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          <span>🛒 Panier ({cart.reduce((sum, item) => sum + item.qty, 0)})</span>
          <span style={{ background: 'rgba(255,255,255,0.25)', padding: '0.15rem 0.6rem', borderRadius: '100px', fontSize: '0.8rem' }}>
            {cart.reduce((sum, item) => sum + (item.price * item.qty), 0).toFixed(2)} €
          </span>
        </button>
      )}

      {/* Cart Drawer Modal */}
      {isCartOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(2, 6, 23, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1.5rem',
          overflowY: 'auto',
          boxSizing: 'border-box'
        }}>
          <div style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: '24px',
            width: '100%',
            maxWidth: '480px',
            padding: '2rem',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
            position: 'relative',
            color: 'var(--text-color)',
            textAlign: 'left'
          }}>
            <button 
              type="button"
              onClick={() => setIsCartOpen(false)}
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                background: 'rgba(0,0,0,0.1)',
                border: 'none',
                color: 'var(--text-color)',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                cursor: 'pointer',
                fontSize: '1.1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ×
            </button>

            <h3 style={{ fontSize: '1.4rem', fontWeight: 900, marginBottom: '0.2rem', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>🛒</span> Votre Panier ({cart.reduce((s, i) => s + i.qty, 0)})
            </h3>
            <p style={{ fontSize: '0.8rem', opacity: 0.6, marginBottom: '1.5rem' }}>
              Vérifiez vos articles et renseignez votre adresse de livraison.
            </p>

            {cart.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 0', opacity: 0.6 }}>
                Votre panier est actuellement vide.
              </div>
            ) : (
              <form onSubmit={handleCartCheckout} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', maxHeight: '220px', overflowY: 'auto', paddingRight: '0.2rem' }}>
                  {cart.map(item => (
                    <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '0.8rem', borderRadius: '16px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.03)' }}>
                      <img src={item.imageUrl} alt={item.title} style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '10px' }} />
                      <div style={{ flex: 1 }}>
                        <h5 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-color)' }}>{item.title}</h5>
                        <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>Taille : {item.size} • {item.price.toFixed(2)} €</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <button type="button" onClick={() => updateCartQty(item.id, -1)} style={{ width: '24px', height: '24px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-color)', cursor: 'pointer' }}>-</button>
                        <span style={{ fontSize: '0.8rem', fontWeight: 800 }}>{item.qty}</span>
                        <button type="button" onClick={() => updateCartQty(item.id, 1)} style={{ width: '24px', height: '24px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-color)', cursor: 'pointer' }}>+</button>
                        <button type="button" onClick={() => removeFromCart(item.id)} style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer', marginLeft: '0.4rem', fontSize: '0.9rem' }}>🗑️</button>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.8rem 0', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)' }}>
                  <span style={{ fontWeight: 800, fontSize: '0.9rem' }}>Total à payer :</span>
                  <span style={{ fontWeight: 950, fontSize: '1.2rem', color: 'var(--accent-color)' }}>
                    {cart.reduce((s, i) => s + (i.price * i.qty), 0).toFixed(2)} €
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <input 
                    type="text" 
                    placeholder="Nom complet *" 
                    value={checkoutInfo.name} 
                    onChange={(e) => setCheckoutInfo(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />
                  <input 
                    type="email" 
                    placeholder="Adresse e-mail *" 
                    value={checkoutInfo.email} 
                    onChange={(e) => setCheckoutInfo(prev => ({ ...prev, email: e.target.value }))}
                    required
                  />
                  <input 
                    type="tel" 
                    placeholder="Numéro de téléphone" 
                    value={checkoutInfo.phone} 
                    onChange={(e) => setCheckoutInfo(prev => ({ ...prev, phone: e.target.value }))}
                  />
                  <textarea 
                    placeholder="Adresse complète de livraison *" 
                    rows={2}
                    value={checkoutInfo.address} 
                    onChange={(e) => setCheckoutInfo(prev => ({ ...prev, address: e.target.value }))}
                    required
                  />
                </div>

                <button 
                  type="submit"
                  disabled={isSubmittingOrder}
                  style={{
                    background: 'linear-gradient(135deg, var(--accent-color) 0%, #ea580c 100%)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '1rem',
                    fontWeight: 900,
                    fontSize: '0.95rem',
                    cursor: isSubmittingOrder ? 'not-allowed' : 'pointer',
                    boxShadow: '0 10px 20px rgba(var(--accent-rgb), 0.3)',
                    marginTop: '0.5rem'
                  }}
                >
                  {isSubmittingOrder ? "Traitement en cours..." : `💳 Valider et Payer (${cart.reduce((s, i) => s + (i.price * i.qty), 0).toFixed(2)} €)`}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Checkout Modal Dialog */}
      {checkoutProduct && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(2, 6, 23, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1.5rem',
          overflowY: 'auto',
          boxSizing: 'border-box'
        }}>
          <div style={{
            background: '#0f172a',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '24px',
            width: '100%',
            maxWidth: '460px',
            padding: '2rem',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
            position: 'relative',
            color: '#fff',
            textAlign: 'left'
          }}>
            <button 
              onClick={() => setCheckoutProduct(null)}
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                background: 'rgba(255,255,255,0.05)',
                border: 'none',
                color: '#fff',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                cursor: 'pointer',
                fontSize: '1.1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ×
            </button>

            <h3 style={{ fontSize: '1.4rem', fontWeight: 900, marginBottom: '0.2rem', letterSpacing: '-0.02em' }}>
              Finaliser votre commande
            </h3>
            <p style={{ fontSize: '0.8rem', opacity: 0.6, marginBottom: '1.5rem' }}>
              {checkoutProduct.info.title}
            </p>

            <form onSubmit={handlePlaceOrder} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Size Selector */}
              {checkoutProduct.garment !== 'business_card' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', color: '#94a3b8', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                    Taille :
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {['S', 'M', 'L', 'XL', 'XXL'].map(size => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setSelectedSize(size)}
                        style={{
                          flex: 1,
                          padding: '0.5rem 0',
                          borderRadius: '8px',
                          border: selectedSize === size ? '2px solid var(--accent-color)' : '1px solid rgba(255,255,255,0.1)',
                          background: selectedSize === size ? 'rgba(255,255,255,0.05)' : 'transparent',
                          color: '#fff',
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

              {/* Quantity */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', color: '#94a3b8', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                  Quantité :
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <button 
                    type="button" 
                    onClick={() => setSelectedQty(Math.max(1, selectedQty - 1))}
                    style={{ width: '36px', height: '36px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#fff', fontSize: '1.2rem', cursor: 'pointer' }}
                  >
                    -
                  </button>
                  <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{selectedQty}</span>
                  <button 
                    type="button" 
                    onClick={() => setSelectedQty(selectedQty + 1)}
                    style={{ width: '36px', height: '36px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#fff', fontSize: '1.2rem', cursor: 'pointer' }}
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Contact info inputs */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginTop: '0.5rem' }}>
                <input
                  required
                  placeholder="Nom complet"
                  value={checkoutInfo.name}
                  onChange={e => setCheckoutInfo({ ...checkoutInfo, name: e.target.value })}
                  style={{ width: '100%', padding: '0.8rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: '#fff', fontSize: '0.85rem' }}
                />
                <input
                  required
                  type="email"
                  placeholder="Adresse e-mail"
                  value={checkoutInfo.email}
                  onChange={e => setCheckoutInfo({ ...checkoutInfo, email: e.target.value })}
                  style={{ width: '100%', padding: '0.8rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: '#fff', fontSize: '0.85rem' }}
                />
                <input
                  placeholder="Téléphone"
                  value={checkoutInfo.phone}
                  onChange={e => setCheckoutInfo({ ...checkoutInfo, phone: e.target.value })}
                  style={{ width: '100%', padding: '0.8rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: '#fff', fontSize: '0.85rem' }}
                />
                <textarea
                  required
                  placeholder="Adresse complète de livraison"
                  value={checkoutInfo.address}
                  onChange={e => setCheckoutInfo({ ...checkoutInfo, address: e.target.value })}
                  rows={2}
                  style={{ width: '100%', padding: '0.8rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: '#fff', resize: 'none', fontSize: '0.85rem' }}
                />
              </div>

              {/* Order total & Submit */}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1rem', marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.9rem', color: '#94a3b8' }}>Total TTC :</span>
                <span style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--accent-color)' }}>
                  {(parseFloat(checkoutProduct.info.price.replace(/[^\d.]/g, '')) * selectedQty).toFixed(2)} €
                </span>
              </div>

              <button
                type="submit"
                disabled={isSubmittingOrder}
                style={{
                  width: '100%',
                  padding: '0.9rem',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, var(--accent-color) 0%, rgba(var(--accent-rgb), 0.7) 100%)',
                  color: '#fff',
                  border: 'none',
                  fontWeight: 900,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  boxShadow: '0 6px 15px rgba(var(--accent-rgb), 0.3)',
                  transition: 'opacity 0.2s'
                }}
              >
                {isSubmittingOrder ? 'Chargement...' : '💳 Passer au paiement sécurisé'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
