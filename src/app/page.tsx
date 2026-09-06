import { useEffect, useState } from "react";
import { getStoredConfig, SiteConfig, generateMapsUrl, generateWhatsAppUrl, highlightKeywords, cleanText } from "@/src/lib/store";
import { Link, useLocation } from "react-router-dom";
import { auth, db } from "@/src/firebaseConfig";
import { collection, query, where, getDocs, addDoc, serverTimestamp, doc, getDoc, limit } from "firebase/firestore";
import { sanitizeForFirestore } from "@/src/utils/firestoreSanitizer";
import AdminQuickBar from "@/src/components/AdminQuickBar";
import ShowcaseCarousel from "@/src/components/ShowcaseCarousel";
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

const SocialIcon = ({ platform, color, size = 22 }: { platform: string, color?: string, size?: number }) => {
  const p = (platform || '').toLowerCase().trim();

  // TikTok - Official Monochrome Glyph Image
  if (p.includes('tiktok') || p.includes('tik')) {
    const isLightColor = color && (color.toLowerCase() === '#ffffff' || color.toLowerCase() === 'white' || color.toLowerCase() === 'rgb(255, 255, 255)');
    return (
      <img
        src="/assets/icons/tiktok-logo.png"
        alt="TikTok"
        className="object-contain"
        style={{
          width: `${size}px`,
          height: `${size}px`,
          objectFit: 'contain',
          display: 'inline-block',
          verticalAlign: 'middle',
          filter: isLightColor ? 'brightness(0) invert(1)' : 'none'
        }}
      />
    );
  }

  // SoundCloud - Official Image Picto
  if (p.includes('soundcloud') || p.includes('sound')) {
    const isLightColor = color && (color.toLowerCase() === '#ffffff' || color.toLowerCase() === 'white' || color.toLowerCase() === 'rgb(255, 255, 255)');
    return (
      <img
        src="/assets/icons/soundcloud-logo.png"
        alt="SoundCloud"
        className="object-contain"
        style={{
          width: `${size}px`,
          height: `${size}px`,
          objectFit: 'contain',
          display: 'inline-block',
          verticalAlign: 'middle',
          filter: isLightColor ? 'brightness(0) invert(1)' : 'none'
        }}
      />
    );
  }

  // SoundCloud - Iconic Cloud with Soundwaves
  if (p.includes('soundcloud') || p.includes('sound')) {
    const fill = color || '#FF5500';
    return (
      <svg width={size} height={size} fill={fill} viewBox="0 0 24 24">
        <path d="M1.5 12c-.28 0-.5.22-.5.5v3c0 .28.22.5.5.5s.5-.22.5-.5v-3c0-.28-.22-.5-.5-.5zm2-2c-.28 0-.5.22-.5.5v7c0 .28.22.5.5.5s.5-.22.5-.5v-7c0-.28-.22-.5-.5-.5zm2-2c-.28 0-.5.22-.5.5v11c0 .28.22.5.5.5s.5-.22.5-.5V8.5c0-.28-.22-.5-.5-.5zm2-1c-.28 0-.5.22-.5.5v13c0 .28.22.5.5.5s.5-.22.5-.5V7.5c0-.28-.22-.5-.5-.5zm2-1c-.28 0-.5.22-.5.5v15c0 .28.22.5.5.5s.5-.22.5-.5V6.5c0-.28-.22-.5-.5-.5zm10.75 3c-1.38 0-2.58.74-3.25 1.83-.34-.21-.73-.33-1.15-.33-.12 0-.24.01-.35.03v10.47h8.25c2.48 0 4.5-2.02 4.5-4.5s-2.02-4.5-4.5-4.5c-.32 0-.63.04-.93.1-.65-1.84-2.42-3.1-4.57-3.1z"/>
      </svg>
    );
  }

  // Instagram
  if (p.includes('insta')) {
    const fill = color || '#E1306C';
    return (
      <svg width={size} height={size} fill={fill} viewBox="0 0 24 24">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.441-1.44z"/>
      </svg>
    );
  }

  // YouTube
  if (p.includes('youtube') || p.includes('yt')) {
    const fill = color || '#FF0000';
    return (
      <svg width={size} height={size} fill={fill} viewBox="0 0 24 24">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
      </svg>
    );
  }

  // Facebook
  if (p.includes('facebook') || p.includes('fb')) {
    const fill = color || '#1877F2';
    return (
      <svg width={size} height={size} fill={fill} viewBox="0 0 24 24">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    );
  }

  // WhatsApp
  if (p.includes('whatsapp') || p.includes('whats') || p.includes('wa.me')) {
    const fill = color || '#25D366';
    return (
      <svg width={size} height={size} fill={fill} viewBox="0 0 24 24">
        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
      </svg>
    );
  }

  // Apple Music
  if (p.includes('apple') || p.includes('itunes') || p.includes('applemusic')) {
    const fill = color || '#FC3C44';
    return (
      <svg width={size} height={size} fill={fill} viewBox="0 0 24 24">
        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.176 7.424l-6.353 1.27v7.502c-.52-.303-1.127-.478-1.777-.478-1.922 0-3.48 1.558-3.48 3.48s1.558 3.48 3.48 3.48 3.48-1.558 3.48-3.48V10.74l4.65-0.93v4.394c-.52-.303-1.127-.478-1.777-.478-1.922 0-3.48 1.558-3.48 3.48s1.558 3.48 3.48 3.48 3.48-1.558 3.48-3.48V7.424h-1.72z"/>
      </svg>
    );
  }

  // Beatport
  if (p.includes('beatport')) {
    const fill = color || '#00FF83';
    return (
      <svg width={size} height={size} fill={fill} viewBox="0 0 24 24">
        <path d="M19.167 10.378c-.767-1.144-2.067-1.89-3.528-1.89h-3.306v6.027h3.306c1.461 0 2.761-.745 3.528-1.89.767-1.144.767-2.617 0-3.762zM7.667 6.486v11.028h2.333V6.486H7.667zm4.666-4.486v4.486h3.306c2.478 0 4.678 1.267 5.972 3.206 1.294 1.939 1.294 4.433 0 6.372-1.294 1.939-3.494 3.206-5.972 3.206h-5.639V2h2.333z"/>
      </svg>
    );
  }

  // Mixcloud
  if (p.includes('mixcloud')) {
    const fill = color || '#5000ff';
    return (
      <svg width={size} height={size} fill={fill} viewBox="0 0 24 24">
        <path d="M2.28 15.65c-.75 0-1.37-.5-1.56-1.2l-.72-2.66c-.19-.7.22-1.42.92-1.61.7-.19 1.42.22 1.61.92l.72 2.66c.19.7-.22 1.42-.92 1.61-.15.04-.3.06-.45.06zm4.8 1.3c-.75 0-1.37-.5-1.56-1.2l-1.32-4.9c-.19-.7.22-1.42.92-1.61.7-.19 1.42.22 1.61.92l1.32 4.9c.19.7-.22 1.42-.92 1.61-.15.04-.3.06-.45.06zm4.8 1.3c-.75 0-1.37-.5-1.56-1.2l-1.92-7.14c-.19-.7.22-1.42.92-1.61.7-.19 1.42.22 1.61.92l1.92 7.14c.19.7-.22 1.42-.92 1.61-.15.04-.3.06-.45.06zm10.74-6.47c-.24-2.58-2.4-4.58-5.02-4.58-1.57 0-2.98.72-3.92 1.84l.64 2.37c.54-.7 1.37-1.15 2.31-1.15 1.62 0 2.94 1.32 2.94 2.94 0 .2-.02.4-.06.59l-.02.13.13.04c1.23.36 2.14 1.49 2.14 2.82 0 1.62-1.32 2.94-2.94 2.94h-2.12l.64 2.37h1.48c2.93 0 5.31-2.38 5.31-5.31 0-2.22-1.37-4.13-3.32-4.92l-.2-.08z"/>
      </svg>
    );
  }

  // Deezer
  if (p.includes('deezer')) {
    const fill = color || '#A238FF';
    return (
      <svg width={size} height={size} fill={fill} viewBox="0 0 24 24">
        <path d="M18.8 6.4h3.6v2.4h-3.6V6.4zm0 3.6h3.6v2.4h-3.6v-2.4zm0 3.6h3.6V16h-3.6v-2.4zm0 3.6h3.6v2.4h-3.6v-2.4zM12.6 10h3.6v2.4h-3.6V10zm0 3.6h3.6V16h-3.6v-2.4zm0 3.6h3.6v2.4h-3.6v-2.4zM6.4 13.6H10V16H6.4v-2.4zm0 3.6H10v2.4H6.4v-2.4zM1.6 17.2h3.6v2.4H1.6v-2.4z"/>
      </svg>
    );
  }

  // Email / Booking
  if (p.includes('mail') || p.includes('contact') || p.includes('book') || p.includes('gmail')) {
    const fill = color || '#3B82F6';
    return (
      <svg width={size} height={size} fill={fill} viewBox="0 0 24 24">
        <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
      </svg>
    );
  }

  // X / Twitter
  if (p.includes('twitter') || p.includes('x.com') || p === 'x') {
    const fill = color || 'currentColor';
    return (
      <svg width={size} height={size} fill={fill} viewBox="0 0 24 24">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    );
  }

  // LinkedIn
  if (p.includes('linkedin')) {
    const fill = color || '#0A66C2';
    return (
      <svg width={size} height={size} fill={fill} viewBox="0 0 24 24">
        <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
      </svg>
    );
  }

  // Snapchat
  if (p.includes('snap')) {
    const fill = color || '#FFFC00';
    return (
      <svg width={size} height={size} fill={fill} viewBox="0 0 24 24">
        <path d="M12.002 0c-4.227 0-7.393 2.825-7.393 6.786 0 .807.135 1.833.344 2.475.12.368.04.607-.156.763-.25.197-.73.35-1.282.502-.455.125-.87.24-.988.543-.13.335.12.72.63.99.822.433 1.83.67 2.296 1.488.163.284.09.684-.047 1.135-.183.606-.445 1.472-.11 2.052.287.498 1.05.748 2.046.748.435 0 .934-.048 1.486-.145.71-.124 1.42-.4 2.09-.4.636 0 1.25.228 1.94.39.57.133 1.18.232 1.85.232 1.01 0 1.77-.25 2.06-.75.33-.58.07-1.45-.11-2.05-.14-.45-.21-.85-.05-1.14.47-.82 1.48-1.06 2.3-1.49.51-.27.76-.66.63-1-.12-.3-.53-.42-.99-.54-.55-.15-1.03-.3-1.28-.5-.2-.16-.28-.4-.16-.76.21-.64.34-1.67.34-2.48C19.395 2.825 16.229 0 12.002 0z"/>
      </svg>
    );
  }

  // Discord
  if (p.includes('disc')) {
    const fill = color || '#5865F2';
    return (
      <svg width={size} height={size} fill={fill} viewBox="0 0 24 24">
        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
      </svg>
    );
  }

  // Twitch
  if (p.includes('twitch')) {
    const fill = color || '#9146FF';
    return (
      <svg width={size} height={size} fill={fill} viewBox="0 0 24 24">
        <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"/>
      </svg>
    );
  }

  // Telegram
  if (p.includes('tele') || p.includes('tg')) {
    const fill = color || '#229ED9';
    return (
      <svg width={size} height={size} fill={fill} viewBox="0 0 24 24">
        <path d="M12 0C5.37 0 0 5.37 0 12s5.37 12 12 12 12-5.37 12-12S18.63 0 12 0zm5.56 8.16l-1.97 9.28c-.15.65-.53.81-1.08.5l-3-2.21-1.45 1.4c-.16.16-.3.3-.61.3l.22-3.05 5.56-5.02c.24-.22-.05-.34-.38-.13l-6.87 4.33-2.96-.92c-.64-.2-.66-.64.13-.95l11.57-4.46c.54-.2 1 .12.84.93z"/>
      </svg>
    );
  }

  // Phone
  if (p.includes('tel') || p.includes('phone') || p.includes('appel')) {
    const fill = color || '#10B981';
    return (
      <svg width={size} height={size} fill={fill} viewBox="0 0 24 24">
        <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
      </svg>
    );
  }

  // Shop / Merch
  if (p.includes('shop') || p.includes('boutique') || p.includes('merch')) {
    const fill = color || '#F59E0B';
    return (
      <svg width={size} height={size} fill={fill} viewBox="0 0 24 24">
        <path d="M19 6h-2c0-2.76-2.24-5-5-5S7 3.24 7 6H5c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-7-3c1.66 0 3 1.34 3 3H9c0-1.66 1.34-3 3-3zm7 17H5V8h14v12zm-7-8c-1.66 0-3-1.34-3-3H7c0 2.76 2.24 5 5 5s5-2.24 5-5h-2c0 1.66-1.34 3-3 3z"/>
      </svg>
    );
  }

  // Website / Globe
  const fill = color || '#64748B';
  return (
    <svg width={size} height={size} fill={fill} viewBox="0 0 24 24">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
    </svg>
  );
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
      backgroundColor: '#020617',
      boxShadow: '0 20px 40px rgba(0,0,0,0.5), 0 0 30px rgba(var(--accent-rgb), 0.12)',
      marginBottom: '2.5rem'
    }}>
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundColor: '#020617',
        backgroundImage: `url(${urls[currentIndex]})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
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
  const [needsLogoCreation, setNeedsLogoCreation] = useState(false);
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

      await addDoc(collection(db, "access_requests"), sanitizeForFirestore({
        artistName: name,
        email: email,
        logoBase64: finalLogo,
        needsLogoCreation: needsLogoCreation,
        status: "pending",
        createdAt: serverTimestamp()
      }));

      // Envoi direct de l'alerte e-mail à logosigneed@gmail.com
      const accessPayload = {
        artistName: name,
        email: email,
        logoBase64: finalLogo,
        needsLogoCreation: needsLogoCreation
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
            <span style={{ fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.2em', color: theme.badgeText, textTransform: 'uppercase' }}>INFRASTRUCTURE TEXTILE & MERCHANDISING EN MARQUE BLANCHE</span>
          </div>
          
          <h1 style={{ fontSize: 'clamp(1.8rem, 4.5vw, 3rem)', fontWeight: 900, lineHeight: 1.15, color: theme.heading, marginBottom: '1.5rem', letterSpacing: '-0.03em', textAlign: 'center', textTransform: 'uppercase' }}>
            Votre marque sur textile premium, <br/><span style={{ color: '#ff3366' }}>sans stock ni logistique.</span>
          </h1>
          
          <p style={{ fontSize: 'clamp(1rem, 2vw, 1.15rem)', color: theme.subtext, maxWidth: '740px', margin: '0 auto 1.5rem auto', lineHeight: 1.6, textAlign: 'center', fontWeight: 400 }}>
            Nous déployons votre boutique officielle et gérons l'impression à la demande ainsi que l'expédition en 48h. Concentrez-vous sur votre activité, on s'occupe de la matière.
          </p>

          {/* BLOC CLARTÉ DE L'OFFRE (POUR L'IA ET LES VISITEURS) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', width: '100%', maxWidth: '840px', margin: '1rem 0 2rem 0', textAlign: 'left' }}>
            <div style={{ padding: '1.2rem', backgroundColor: theme.cardBg, border: theme.cardBorder, borderRadius: '12px' }}>
              <h3 style={{ fontSize: '0.82rem', fontWeight: 800, textTransform: 'uppercase', color: '#ff3366', margin: '0 0 0.4rem 0', letterSpacing: '0.05em' }}>🎯 Pour qui ?</h3>
              <p style={{ fontSize: '0.85rem', color: theme.cardText, margin: 0, lineHeight: 1.5 }}>
                Créateurs, coachs, freelances, studios, collectifs et marques émergentes qui souhaitent monétiser leur audience ou équiper leurs équipes avec du textile prêt-à-porter de haute qualité.
              </p>
            </div>

            <div style={{ padding: '1.2rem', backgroundColor: theme.cardBg, border: theme.cardBorder, borderRadius: '12px' }}>
              <h3 style={{ fontSize: '0.82rem', fontWeight: 800, textTransform: 'uppercase', color: '#10b981', margin: '0 0 0.4rem 0', letterSpacing: '0.05em' }}>🛍️ Ce que nous proposons</h3>
              <p style={{ fontSize: '0.85rem', color: theme.cardText, margin: 0, lineHeight: 1.5 }}>
                Déploiement instantané d'une vitrine web & d'une boutique textile premium (T-Shirts, Hoodies, Polos HD) gérée en marque blanche sans avance de stock.
              </p>
            </div>

            <div style={{ padding: '1.2rem', backgroundColor: theme.cardBg, border: theme.cardBorder, borderRadius: '12px' }}>
              <h3 style={{ fontSize: '0.82rem', fontWeight: 800, textTransform: 'uppercase', color: '#38bdf8', margin: '0 0 0.4rem 0', letterSpacing: '0.05em' }}>📩 Comment démarrer</h3>
              <p style={{ fontSize: '0.85rem', color: theme.cardText, margin: 0, lineHeight: 1.5 }}>
                Accès direct via le formulaire ci-dessous ou contact e-mail : <a href="mailto:logosigneed@gmail.com" style={{ color: '#ff3366', fontWeight: 'bold', textDecoration: 'none' }}>logosigneed@gmail.com</a>
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <a 
              href="/creer-profil"
              style={{ 
                backgroundColor: theme.buttonBg, 
                color: theme.buttonText, 
                fontWeight: 800, 
                fontSize: '0.92rem', 
                letterSpacing: '0.05em', 
                padding: '1.2rem 2.5rem', 
                textDecoration: 'none', 
                textTransform: 'uppercase', 
                border: theme.buttonBorder, 
                cursor: 'pointer', 
                transition: 'all 0.3s ease', 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '0.6rem', 
                boxShadow: isDayMode ? '0 10px 25px rgba(0,0,0,0.1)' : '0 10px 25px rgba(0,0,0,0.5)',
                borderRadius: '8px'
              }}
            >
              🚀 Créer mon profil & ma boutique
              <span style={{ opacity: 0.6, fontSize: '0.8em', textTransform: 'none' }}>(Autonome • 2 min)</span>
            </a>

            <button 
              onClick={() => { setIsModalOpen(true); setIsSubmitted(false); }}
              style={{ 
                backgroundColor: 'transparent', 
                color: theme.heading, 
                fontWeight: 700, 
                fontSize: '0.88rem', 
                letterSpacing: '0.05em', 
                padding: '1.2rem 2rem', 
                textDecoration: 'none', 
                textTransform: 'uppercase', 
                border: isDayMode ? '1px solid rgba(0,0,0,0.2)' : '1px solid rgba(255,255,255,0.2)', 
                cursor: 'pointer', 
                transition: 'all 0.3s ease', 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '0.5rem',
                borderRadius: '8px'
              }}
            >
              Demande rapide par email
            </button>
          </div>
        </header>

        {/* SECTION PREUVES SOCIALES & PROFILS ARTISTES EN EXEMPLE */}
        <section id="preuves" className="reveal active" style={{ marginBottom: '4rem', borderTop: isDayMode ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(255,255,255,0.05)', paddingTop: '3rem' }}>
          <h2 style={{ fontSize: '0.8rem', fontWeight: 700, color: theme.subtext, letterSpacing: '0.2em', textTransform: 'uppercase', textAlign: 'center', marginBottom: '1.25rem' }}>
            Profils Créateurs, Indépendants & Marques
          </h2>
          <div style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto 2.5rem auto', fontSize: '0.95rem', color: theme.text, lineHeight: 1.6 }}>
            Découvrez comment nos créateurs et indépendants exploitent Signaid pour valoriser leur marque et monétiser leur audience sans aucun stock.
          </div>

          {/* CAROUSEL COVER FLOW DES PROFILS ARTISTES & CRÉATEURS */}
          <ShowcaseCarousel isLightMode={isDayMode} />

          {/* CHIFFRES CLÉS & STATS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.25rem', textTransform: 'uppercase', textAlign: 'center' }}>
            <div style={{ padding: '1.25rem', border: theme.cardBorder, backgroundColor: theme.cardBg, borderRadius: '12px' }}>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#ff3366' }}>+250</div>
              <div style={{ fontSize: '0.75rem', color: theme.subtext, fontWeight: 700, marginTop: '0.25rem' }}>Créateurs & Marques Équipés</div>
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
        </section>

        {/* ECOSYSTEM SECTION */}
        <section id="services" className="reveal active" style={{ marginBottom: '4rem', borderTop: isDayMode ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(255,255,255,0.05)', paddingTop: '4rem' }}>
          <h2 style={{ fontSize: '0.8rem', fontWeight: 600, color: theme.subtext, letterSpacing: '0.2em', textTransform: 'uppercase', textAlign: 'center', marginBottom: '3rem' }}>
            Infrastructure Textile & Monétisation Automatisée
          </h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
            
            <div style={{ padding: '2rem', border: theme.cardBorder, backgroundColor: theme.cardBg, textAlign: 'left', transition: 'all 0.3s ease', boxShadow: isDayMode ? '0 4px 20px rgba(0,0,0,0.04)' : 'none' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: theme.cardTitle, marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>// Créateurs & Médias</h3>
              <p style={{ fontSize: '0.9rem', color: theme.cardText, lineHeight: 1.6, margin: 0 }}>
                Monétisation d'audience, drops & collections capsules. Offrez à votre communauté des pièces exclusives (t-shirts, hoodies, casquettes) produites et livrées à la commande.
              </p>
            </div>

            <div style={{ padding: '2rem', border: theme.cardBorder, backgroundColor: theme.cardBg, textAlign: 'left', transition: 'all 0.3s ease', boxShadow: isDayMode ? '0 4px 20px rgba(0,0,0,0.04)' : 'none' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: theme.cardTitle, marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>// Coachs, Freelances & Studios</h3>
              <p style={{ fontSize: '0.9rem', color: theme.cardText, lineHeight: 1.6, margin: 0 }}>
                Identité visuelle tangible, crédibilité client & merchandising d'équipe. Habillez vos clients et vos collaborateurs avec des vêtements de qualité supérieure arborant fièrement votre logo.
              </p>
            </div>

            <div style={{ padding: '2rem', border: theme.cardBorder, backgroundColor: theme.cardBg, textAlign: 'left', transition: 'all 0.3s ease', boxShadow: isDayMode ? '0 4px 20px rgba(0,0,0,0.04)' : 'none' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: theme.cardTitle, marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>// Collectifs, Marques & Artistes</h3>
              <p style={{ fontSize: '0.9rem', color: theme.cardText, lineHeight: 1.6, margin: 0 }}>
                Lancement de marque sans risque d'invendus & marge nette directe. Lancez vos collections de prêt-à-porter avec impression HD, encaissement automatisé et expédition sous 48h.
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
              <strong>Signaid (signaid.eu)</strong> est la plateforme logicielle et logistique pionnière qui automatise la création de vitrines digitales et la vente de vêtements de merchandising personnalisé pour les créateurs de contenu, coachs, freelances, studios, artistes, collectifs et marques émergentes.
            </p>
            <p style={{ margin: 0 }}>
              Contrairement aux modèles traditionnels qui imposent l'achat préalable de stock, Signaid fonctionne intégralement par <strong>Print-on-Demand (Impression à la demande) en marque blanche</strong>. L'infrastructure gère la création de la vitrine web interactive, la prise de commande sécurisée par carte bancaire ou Bancontact via Stripe/Mollie, la fabrication haute résolution des textiles prêt-à-porter (T-shirts, Hoodies, Polos) et la livraison physique rapide sous 48h en France, Belgique, Suisse et dans toute l'Europe.
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
                Signaid est une infrastructure automatisée qui déploie une vitrine web et une boutique de vêtements & accessoires personnalisés haute définition pour valoriser votre marque.
              </p>
            </article>

            <article style={{ padding: '1.5rem', border: theme.cardBorder, backgroundColor: theme.cardBg, borderRadius: '12px' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: theme.cardTitle, marginBottom: '0.6rem' }}>
                Est-ce que je dois gérer la production, les stocks ou les colis ?
              </h3>
              <p style={{ fontSize: '0.92rem', color: theme.cardText, lineHeight: 1.6, margin: 0 }}>
                Non, tout est 100% automatisé en impression à la demande (Print-on-Demand). Les articles sont fabriqués et expédiés directement à vos clients en marque blanche. Vous touchez vos marges sans aucune contrainte logistique.
              </p>
            </article>

            <article style={{ padding: '1.5rem', border: theme.cardBorder, backgroundColor: theme.cardBg, borderRadius: '12px' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: theme.cardTitle, marginBottom: '0.6rem' }}>
                Et si je n'ai pas encore de logo vectoriel ?
              </h3>
              <p style={{ fontSize: '0.92rem', color: theme.cardText, lineHeight: 1.6, margin: 0 }}>
                Aucun problème : cochez simplement l'option lors de votre demande. Notre studio de design peut vectoriser votre logo existant ou concevoir une identité visuelle complète prête pour l'impression textile HD.
              </p>
            </article>

            <article style={{ padding: '1.5rem', border: theme.cardBorder, backgroundColor: theme.cardBg, borderRadius: '12px' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: theme.cardTitle, marginBottom: '0.6rem' }}>
                Quelles sont les zones géographiques livrées ?
              </h3>
              <p style={{ fontSize: '0.92rem', color: theme.cardText, lineHeight: 1.6, margin: 0 }}>
                Signaid assure la fabrication et l'expédition directe avec numéro de suivi en France, en Belgique, en Suisse, au Luxembourg et dans toute l'Union Européenne sous 48h.
              </p>
            </article>
          </div>
        </section>

        {/* SECTION FOOTER & SEO LOCAL (BLOC D'ADRESSE ET COORDONNÉES) */}
        <footer id="contact-local" style={{ marginTop: 'auto', borderTop: isDayMode ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(255,255,255,0.05)', paddingTop: '2.5rem', paddingBottom: 'calc(4rem + env(safe-area-inset-bottom, 24px))', textAlign: 'center', position: 'relative', zIndex: 10 }}>
          
          <address style={{ fontStyle: 'normal', maxWidth: '650px', margin: '0 auto 1.5rem auto', fontSize: '0.82rem', color: theme.subtext, lineHeight: 1.6 }}>
            <strong style={{ color: theme.heading, display: 'block', fontSize: '0.9rem', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Signaid Europe — Infrastructure Textile & Merchandising en Marque Blanche
            </strong>
            Zone d'intervention & livraison : France (Paris, Lyon, Marseille, Lille, Bordeaux), Belgique (Bruxelles, Liège), Suisse (Genève, Lausanne), Luxembourg et Union Européenne.<br/>
            Contact support & partenariats : <a href="mailto:contact@signeedclub.com" style={{ color: '#ff3366', textDecoration: 'none', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', minHeight: '36px', padding: '0.2rem 0.5rem', touchAction: 'manipulation' }}>contact@signeedclub.com</a> | <a href="mailto:logosigneed@gmail.com" style={{ color: '#ff3366', textDecoration: 'none', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', minHeight: '36px', padding: '0.2rem 0.5rem', touchAction: 'manipulation' }}>logosigneed@gmail.com</a>
          </address>

          <span style={{ fontSize: '0.75rem', color: theme.footerText, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block' }}>
            © {new Date().getFullYear()} Signaid Inc. All rights reserved. Creator & Independent Brand Infrastructure.
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
                    <span style={{ fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.15em', color: theme.badgeText, textTransform: 'uppercase' }}>CRÉATION INSTANTANÉE • ZÉRO STOCK</span>
                  </div>
                  <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: theme.heading, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: '0 0 0.5rem 0' }}>
                    Lancer ma boutique textile
                  </h2>
                  <div style={{ padding: '0.6rem 0.8rem', background: isDayMode ? 'rgba(56, 189, 248, 0.1)' : 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.25)', borderRadius: '8px', fontSize: '0.8rem', color: isDayMode ? '#0284c7' : '#7dd3fc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <span>✨ Configurez directement votre vitrine complète :</span>
                    <a href="/creer-profil" style={{ color: '#ff3366', fontWeight: 800, textDecoration: 'none' }}>
                      Créateur Autonome ➔
                    </a>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: theme.modalLabel, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>
                    Nom de Marque / Créateur / Activité *
                  </label>
                  <input 
                    type="text" 
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="ex: Studio Design / Nomad Creative / Atelier Paris / Marque"
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
                    placeholder="contact@votre-marque.com"
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
                    Logo ou Visuel HD (Optionnel)
                  </label>
                  
                  {!needsLogoCreation && (
                    <div style={{
                      border: isDayMode ? '1px dashed rgba(0, 0, 0, 0.2)' : '1px dashed rgba(255, 255, 255, 0.2)',
                      backgroundColor: theme.inputBg,
                      padding: '1.2rem',
                      textAlign: 'center',
                      position: 'relative',
                      cursor: 'pointer',
                      borderRadius: '8px',
                      marginBottom: '0.6rem'
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
                          <span style={{ fontSize: '0.8rem', color: theme.cardText }}>Télécharger mon logo (PNG / SVG / JPG)</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Passerelle création de logo */}
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    fontSize: '0.8rem',
                    color: needsLogoCreation ? '#ff3366' : theme.modalLabel,
                    fontWeight: 600,
                    cursor: 'pointer',
                    userSelect: 'none',
                    padding: '0.3rem 0'
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
                      style={{
                        accentColor: '#ff3366',
                        width: '16px',
                        height: '16px',
                        cursor: 'pointer'
                      }}
                    />
                    <span>Je n'ai pas encore de logo vectoriel / J'ai besoin d'une création de logo</span>
                  </label>
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
                  {isSubmitting ? "Transmission..." : "LANCER MA BOUTIQUE"}
                </button>
              </form>
            ) : (
              <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>⚡</div>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: theme.heading, textTransform: 'uppercase', marginBottom: '1rem' }}>
                  Demande Enregistrée
                </h3>
                <p style={{ color: theme.cardText, fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '2rem' }}>
                  Merci <strong style={{ color: theme.heading }}>{name}</strong>. {needsLogoCreation ? "Notre équipe de design va étudier votre projet d'identité visuelle et vous recontactera par email (" : "Nos équipes analysent votre visuel et reviendront vers vous par email ("}<span style={{ color: '#ff3366' }}>{email}</span>) sous 24h avec vos accès personnalisés.
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
  const isShowcase = urlParams.get('showcase') === 'true';

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

      const docRef = await addDoc(collection(db, 'btp_dotations'), sanitizeForFirestore(orderData));

      const response = await fetch('https://us-central1-signaid-prod.cloudfunctions.net/createMolliePayment', {
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
      if (uid === 'audit-8f198p5' || uid === 'guest_ms3ijgnco2xnid' || uid === 'fabrizio' || uid === 'djdfazz') {
        window.location.replace('/guest_ms3ijgnco2xnid');
        return;
      }
      if (uid) {
        window.location.replace(`/${uid}`);
        return;
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

          const fetchMockupsFast = async () => {
            const lookups = keysToTry.map(async (k) => {
              try {
                const [qProj, qPrev, docSnap] = await Promise.all([
                  getDocs(query(collection(db, 'btp_projects'), where('projectId', '==', k), limit(1))).catch(() => null),
                  getDocs(query(collection(db, 'btp_projects'), where('previewId', '==', k), limit(1))).catch(() => null),
                  getDoc(doc(db, 'anonymous_previews', k)).catch(() => null)
                ]);
                if (qProj && !qProj.empty) return qProj.docs[0].data().mockups || qProj.docs[0].data().items || [];
                if (qPrev && !qPrev.empty) return qPrev.docs[0].data().mockups || qPrev.docs[0].data().items || [];
                if (docSnap && docSnap.exists()) return docSnap.data().items || [];
              } catch {}
              return [];
            });
            const results = await Promise.all(lookups);
            return results.find(r => r && r.length > 0) || [];
          };

          const timeoutPromise = new Promise<any[]>((resolve) => setTimeout(() => resolve([]), 1500));
          let foundMockups = await Promise.race([fetchMockupsFast(), timeoutPromise]);

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

  }, [location.search]);

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

      const docRef = await addDoc(collection(db, 'btp_dotations'), sanitizeForFirestore(orderData));
      console.log("Order saved to Firestore: ", docRef.id);

      // Call Mollie payment cloud function
      const response = await fetch('https://us-central1-signaid-prod.cloudfunctions.net/createMolliePayment', {
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
  const showLanding = !hasUid || !config.companyName;

  if (showLanding) {
    return <ShowcaseLandingPage />;
  }

  return (
    <div className="page-wrapper">
      <div className="animated-bg"></div>
      <main className="container">
        <header className="logo-container reveal">
          {(() => {
            const rawA = typeof config.logoA === 'string' ? config.logoA : ((config.logoA as any)?.adaptedRemastered || (config.logoA as any)?.adapted || (config.logoA as any)?.original);
            const effLogo = config.logoUrl || config.auditLogoUrl || config.logoAdaptedUrl || rawA || '';
            return effLogo ? <img src={effLogo} alt={config.companyName || "Entreprise"} /> : null;
          })()}
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
            <a href="https://signaid.eu" target="_blank" rel="noopener noreferrer" className="footer-link">SIGNAID.EU</a>
            <Link to="/vitrine-admin" className="footer-link">ADMINISTRATION</Link>
          </div>
          <p style={{ margin: 0, opacity: 0.5, fontSize: '0.75rem' }}>© {new Date().getFullYear()} {isShowcase ? "Votre Entreprise" : config.companyName}</p>
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
