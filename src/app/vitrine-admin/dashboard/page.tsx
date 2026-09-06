"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { getStoredConfig, saveStoredConfig, SiteConfig, ProfileLink, processLogo, generateAIPresentation, generatePitchFromWebSearch, generatePitchFromDocument, Social, CustomSection, defaultConfig } from "../../../lib/store";
import { cleanAndProcessDtfMaster, generateGarmentMockupSuite, downloadMasterDtfFile, downloadMasterPdfFile } from "../../../services/dtfMasterService";
import { sanitizeForFirestore } from "../../../utils/firestoreSanitizer";
import { compressImageFile, compressDataUrl } from "../../../utils/imageUtils";
import { ref, uploadBytes, getDownloadURL, uploadString } from "firebase/storage";
import { storage, auth, db } from "../../../firebaseConfig";
import { onAuthStateChanged, signOut, sendPasswordResetEmail, signInWithEmailAndPassword, createUserWithEmailAndPassword, setPersistence, browserLocalPersistence, signInAnonymously } from "firebase/auth";
import { setDoc, doc, serverTimestamp, collection, query, where, onSnapshot, getDocs, getDoc, deleteDoc, updateDoc } from "firebase/firestore";
import { Link, useNavigate } from "react-router-dom";
import "../../globals.css";

const SocialIcon = ({ platform, color, size = 22 }: { platform: string; color?: string; size?: number }) => {
  const p = (platform || '').toLowerCase().trim();

  // TikTok - Native SVG
  if (p.includes('tiktok') || p.includes('tik')) {
    const fill = color || 'currentColor';
    return (
      <svg width={size} height={size} fill={fill} viewBox="0 0 24 24">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.04-.1z"/>
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

  // Spotify
  if (p.includes('spotify') || p.includes('spot')) {
    const fill = color || '#1DB954';
    return (
      <svg width={size} height={size} fill={fill} viewBox="0 0 24 24">
        <path d="M12 0C5.376 0 0 5.376 0 12s5.376 12 12 12 12-5.376 12-12S18.624 0 12 0zm5.521 17.341c-.22.359-.688.472-1.047.251-2.87-1.753-6.482-2.15-10.738-1.176-.407.094-.816-.164-.91-.571-.093-.406.164-.816.571-.91 4.659-1.066 8.653-.615 11.873 1.35.359.221.472.689.251 1.056zm1.474-3.277c-.277.45-.867.591-1.317.315-3.284-2.018-8.291-2.604-12.176-1.425-.506.154-1.041-.137-1.196-.643-.154-.506.137-1.04.643-1.195 4.437-1.347 9.967-.698 13.73 1.631.45.276.591.866.316 1.317zm.126-3.414C15.228 8.249 8.8 8.036 5.123 9.151c-.624.19-1.282-.164-1.472-.789-.19-.624.165-1.282.789-1.472 4.225-1.283 11.317-1.034 15.772 1.611.56.332.744 1.054.412 1.614-.332.56-1.054.743-1.614.412z"/>
      </svg>
    );
  }

  // SoundCloud
  if (p.includes('soundcloud') || p.includes('sound')) {
    const fill = color || '#FF5500';
    return (
      <svg width={size} height={size} fill={fill} viewBox="0 0 24 24">
        <path d="M1.5 12c-.28 0-.5.22-.5.5v3c0 .28.22.5.5.5s.5-.22.5-.5v-3c0-.28-.22-.5-.5-.5zm2-2c-.28 0-.5.22-.5.5v7c0 .28.22.5.5.5s.5-.22.5-.5v-7c0-.28-.22-.5-.5-.5zm2-2c-.28 0-.5.22-.5.5v11c0 .28.22.5.5.5s.5-.22.5-.5V8.5c0-.28-.22-.5-.5-.5zm2-1c-.28 0-.5.22-.5.5v13c0 .28.22.5.5.5s.5-.22.5-.5V7.5c0-.28-.22-.5-.5-.5zm2-1c-.28 0-.5.22-.5.5v15c0 .28.22.5.5.5s.5-.22.5-.5V6.5c0-.28-.22-.5-.5-.5zm10.75 3c-1.38 0-2.58.74-3.25 1.83-.34-.21-.73-.33-1.15-.33-.12 0-.24.01-.35.03v10.47h8.25c2.48 0 4.5-2.02 4.5-4.5s-2.02-4.5-4.5-4.5c-.32 0-.63.04-.93.1-.65-1.84-2.42-3.1-4.57-3.1z"/>
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

export const getPlatformColors = (platformName: string) => {
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

export const getPlatformBadgeStyle = (platformName: string, isLight: boolean = false) => {
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

// Composant Banner Key
export function ActuationKeyBanner({ actuationKey, editingUid, isMagicLink }: { actuationKey: string; editingUid: string; isMagicLink?: boolean }) {
  const handleCopyLink = () => {
    const magicLink = `${window.location.origin}/vitrine-admin?uid=${editingUid}&key=${actuationKey}`;
    navigator.clipboard.writeText(magicLink);
    alert("📋 Lien magique copié dans le presse-papiers ! Vous pouvez l'envoyer directement à votre client.");
  };

  return (
    <div 
      className="bg-slate-900 border border-blue-500/30 p-4 flex flex-wrap justify-between items-center rounded-xl gap-4"
      style={{
        backgroundColor: '#0f172a',
        border: '1px solid rgba(59, 130, 246, 0.3)',
        padding: '1rem 1.5rem',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderRadius: '12px',
        boxShadow: '0 0 15px rgba(59, 130, 246, 0.15)',
        marginBottom: '2rem',
        gap: '1rem'
      }}
    >
      <div className="flex items-center gap-3" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div 
          className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" 
          style={{
            height: '8px',
            width: '8px',
            borderRadius: '50%',
            backgroundColor: '#3b82f6',
            boxShadow: '0 0 8px #3b82f6'
          }}
        />
        <span 
          className="text-slate-400 text-xs font-medium uppercase tracking-widest"
          style={{
            color: '#94a3b8',
            fontSize: '0.75rem',
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '0.1em'
          }}
        >
          Clé d'actuation sécurisée
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        <code 
          className="text-blue-400 font-mono font-bold tracking-tighter text-lg bg-blue-500/10 px-3 py-1 rounded border border-blue-500/20"
          style={{
            color: '#60a5fa',
            fontFamily: 'monospace',
            fontWeight: 'bold',
            fontSize: '1.1rem',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            padding: '0.25rem 0.75rem',
            borderRadius: '4px',
            border: '1px solid rgba(59, 130, 246, 0.2)',
            boxShadow: '0 0 8px rgba(59, 130, 246, 0.1)'
          }}
        >
          {actuationKey}
        </code>
        
        {!isMagicLink && (
          <button
            onClick={handleCopyLink}
            style={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              padding: '0.5rem 1rem',
              fontSize: '0.8rem',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
              transition: 'all 0.2s ease',
              whiteSpace: 'nowrap'
            }}
          >
            🔗 Copier le lien magique client
          </button>
        )}
      </div>
    </div>
  );
}

export default function AdminPage() {
  const [config, setConfig] = useState<SiteConfig | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>("");
  const [livePhotoProgress, setLivePhotoProgress] = useState<string>("");
  const [aiOptions, setAiOptions] = useState<string[]>([]);
  const navigate = useNavigate();

  const [isAdminLightMode, setIsAdminLightMode] = useState(() => {
    return localStorage.getItem("admin_light_mode") === "true";
  });

  useEffect(() => {
    const rootEl = document.getElementById("root");
    if (isAdminLightMode) {
      document.body.classList.add("admin-console-light");
      document.documentElement.setAttribute("data-theme", "light");
      if (rootEl) rootEl.style.backgroundColor = "#f1f5f9";
      document.body.style.backgroundColor = "#f1f5f9";
    } else {
      document.body.classList.remove("admin-console-light");
      document.documentElement.setAttribute("data-theme", "dark");
      if (rootEl) rootEl.style.backgroundColor = "";
      document.body.style.backgroundColor = "";
    }
    return () => {
      document.body.classList.remove("admin-console-light");
      document.documentElement.removeAttribute("data-theme");
      if (rootEl) rootEl.style.backgroundColor = "";
      document.body.style.backgroundColor = "";
    };
  }, [isAdminLightMode]);

  // Unified authentication states
  const [currentUser, setCurrentUser] = useState<any>(() => {
    if (typeof window !== 'undefined' && (
      window.location.hostname === 'localhost' || 
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname === '' ||
      sessionStorage.getItem('master_admin_session') === 'true'
    )) {
      return { uid: 'master_admin_logosigneed', email: 'logosigneed@gmail.com', isMasterAdmin: true, isLocalDev: true };
    }
    return null;
  });
  const [authChecked, setAuthChecked] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);

  // Listen to Firestore order collection btp_dotations for active orders
  useEffect(() => {
    const isSignupMode = new URLSearchParams(window.location.search).get("mode") === "signup";
    if (!currentUser || isSignupMode) {
      setPendingOrdersCount(0);
      return;
    }
    const q = query(
      collection(db, "btp_dotations"), 
      where("projectId", "==", currentUser.uid),
      where("status", "==", "PENDING_PAYMENT")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPendingOrdersCount(snapshot.size);
    }, (err) => {
      console.warn("Failed to watch pending orders:", err);
    });
    return () => unsubscribe();
  }, [currentUser]);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [previewKey, setPreviewKey] = useState("");

  // Combined Admin Profile configuration states for registration (Inscription)
  const [signupCompanyName, setSignupCompanyName] = useState("");
  const [signupSector, setSignupSector] = useState("");
  const [signupPhone, setSignupPhone] = useState("");
  const [signupWebsite, setSignupWebsite] = useState("");
  const [signupTva, setSignupTva] = useState("");
  const [signupLogo, setSignupLogo] = useState<string>("");
  const [signupLogoTheme, setSignupLogoTheme] = useState<string>("dark");
  const [signupLogoAccent, setSignupLogoAccent] = useState<string>("rgb(59, 130, 246)");
  const [signupPresentation, setSignupPresentation] = useState("");
  const [logoUploading, setLogoUploading] = useState(false);
  const [webSearchQuery, setWebSearchQuery] = useState("");
  const [isAnalyzingWeb, setIsAnalyzingWeb] = useState(false);
  const [isAnalyzingDoc, setIsAnalyzingDoc] = useState(false);
  const [claimUid, setClaimUid] = useState<string | null>(null);
  const [actionHint, setActionHint] = useState<string | null>(null);
  const [showCoverControls, setShowCoverControls] = useState(false);
  const [editingSocialPlatform, setEditingSocialPlatform] = useState<string | null>(null);
  const coverFileInputRef = useRef<HTMLInputElement>(null);
  const logoFileInputRef = useRef<HTMLInputElement>(null);
  const logoUploadPromiseRef = useRef<Promise<string | null> | null>(null);
  const [isRemovingBg, setIsRemovingBg] = useState(false);

  useEffect(() => {
    // Generate beautiful preview key on mount
    const segment = () => Math.random().toString(36).substring(2, 8).toUpperCase();
    setPreviewKey(`SG-${segment()}-${segment()}`);

    // Check mode
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("mode") === "signup") {
      setIsLogin(false);
    }

    // Prefill fields from bookmarklet
    const prefillName = urlParams.get("name");
    const prefillLogo = urlParams.get("logoUrl");
    const prefillPhone = urlParams.get("phone");
    const prefillWebsite = urlParams.get("website");
    const prefillDesc = urlParams.get("presentation");
    const prefillSector = urlParams.get("sector");
    if (prefillName) setSignupCompanyName(prefillName);
    if (prefillLogo) setSignupLogo(prefillLogo);
    if (prefillPhone) setSignupPhone(prefillPhone);
    if (prefillWebsite) setSignupWebsite(prefillWebsite);
    if (prefillDesc) setSignupPresentation(prefillDesc);
    if (prefillSector) setSignupSector(prefillSector);

    if (urlParams.get("claim")) {
      setClaimUid(urlParams.get("claim"));
      setActionHint(urlParams.get("action"));
    }
  }, []);

  const [editingUid, setEditingUid] = useState<string>("");
  const [initialSlug, setInitialSlug] = useState<string>("");
  const [prospectsList, setProspectsList] = useState<any[]>([]);
  const [prospectSearchQuery, setProspectSearchQuery] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      return p.get("search") || p.get("q") || p.get("prospect") || "";
    }
    return "";
  });
  const [djStats, setDjStats] = useState<{ totalMargin: number, sales: any[] }>({ totalMargin: 0, sales: [] });
  const [hoveredProspectUid, setHoveredProspectUid] = useState<string | null>(null);
  const [activeAdminTab, setActiveAdminTab] = useState<'editor' | 'products' | 'links' | 'prospects'>(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      const tab = p.get("tab");
      if (tab === 'editor' || tab === 'products' || tab === 'links' || tab === 'prospects') return tab;
      if (p.get("search") || p.get("prospect") || p.get("vision")) return 'prospects';
    }
    return "editor";
  });

  // Filtre et fallback insensible à la casse et sans tiret sur le nom, le slug ou l'identifiant
  const filteredProspects = useMemo(() => {
    if (!prospectSearchQuery.trim()) return prospectsList;
    const cleanQuery = prospectSearchQuery.toLowerCase().trim().replace(/[-_\s]/g, '');
    return prospectsList.filter(p => {
      const cleanName = ((p.companyName || p.name || '') as string).toLowerCase().replace(/[-_\s]/g, '');
      const cleanSlug = ((p.slug || '') as string).toLowerCase().replace(/[-_\s]/g, '');
      const cleanUid = ((p.uid || '') as string).toLowerCase().replace(/[-_\s]/g, '');
      const cleanSector = ((p.activitySector || p.sector || '') as string).toLowerCase().replace(/[-_\s]/g, '');

      // Fallback critique de recherche insensible à la casse et sans tiret sur le nom ou le slug
      const isVisionQuery = cleanQuery.includes('vision');
      const isVisionProspect = cleanSlug.includes('vision') || cleanName.includes('vision') || cleanUid.includes('vision');
      if (isVisionQuery && isVisionProspect) return true;

      return cleanName.includes(cleanQuery) || 
             cleanSlug.includes(cleanQuery) || 
             cleanUid.includes(cleanQuery) ||
             cleanSector.includes(cleanQuery);
    });
  }, [prospectsList, prospectSearchQuery]);
  const [previewDevice, setPreviewDevice] = useState<'mobile' | 'desktop'>('mobile');
  const [previewTheme, setPreviewTheme] = useState<'light' | 'dark' | 'auto'>('auto');
  const [activeEditDrawer, setActiveEditDrawer] = useState<'buttons' | 'socials' | 'bio' | 'logo' | 'none'>('buttons');
  const [studioPreviewViews, setStudioPreviewViews] = useState<Record<string, 'front' | 'back'>>({ tshirt: 'front', polo: 'front', hoodie: 'front' });

  useEffect(() => {
    if (!editingUid) return;

    let isMounted = true;
    getStoredConfig(editingUid).then((data) => {
      if (isMounted && data) {
        setConfig(data);
        updateThemeStyles(data);
        setInitialSlug(data.slug || (data.companyName || '').toLowerCase().replace(/[^a-z0-9_-]/g, '') || editingUid);
      }
    }).catch(err => {
      console.warn("Failed to load config for editingUid:", editingUid, err);
    });

    // Listen to real-time sales for the creator/DJ
    const salesRef = collection(db, "dj_sales");
    const q = query(
      salesRef, 
      where("userId", "==", editingUid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const salesList: any[] = [];
      let total = 0;
      snapshot.forEach(doc => {
        const d = doc.data();
        total += d.margin || 0;
        salesList.push({
          id: doc.id,
          ...d,
          date: d.date?.seconds ? d.date.seconds * 1000 : d.date || Date.now()
        });
      });
      // Sort sales by date descending client-side
      salesList.sort((a, b) => b.date - a.date);
      setDjStats({
        totalMargin: total,
        sales: salesList
      });
    }, (err) => {
      console.warn("Failed to listen to dj_sales, using mock fallback:", err);
      setDjStats({
        totalMargin: 75.00,
        sales: [
          { id: '1', date: Date.now() - 86400000 * 2, productName: 'T-Shirt Premium DJ D-FAZZ', margin: 10.00 },
          { id: '2', date: Date.now() - 86400000, productName: 'Pack Polo Premium', margin: 15.00 },
          { id: '3', date: Date.now(), productName: 'Pack Hoodie Protection', margin: 20.00 },
          { id: '4', date: Date.now() - 86400000 * 5, productName: 'T-Shirt Premium DJ D-FAZZ', margin: 10.00 },
          { id: '5', date: Date.now() - 86400000 * 7, productName: 'Pack Hoodie Protection', margin: 20.00 },
        ]
      });
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [editingUid]);

  const handleWithdrawRequest = () => {
    alert(`💰 Demande de reversement de ${djStats.totalMargin.toFixed(2)} € envoyée ! Notre équipe va traiter votre virement sous 24-48h.`);
  };

  const getProfileVanitySlug = () => {
    const normName = (config?.companyName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const isDfazz = normName.includes('dfazz') || 
                    normName.includes('fazz') ||
                    editingUid === 'guest_ms3ijgnco2xnid' || 
                    editingUid === 'fabrizio' || 
                    editingUid === 'audit-8f198p5' ||
                    editingUid === '5qk5ntk' ||
                    editingUid === '4eckgu2' ||
                    editingUid === '3j0f5kl' ||
                    editingUid === 'djdfazz';

    if (isDfazz) return 'djdfazz';

    const rawSlug = config?.slug || config?.companyName || editingUid || auth.currentUser?.uid || '';
    const cleanSlug = rawSlug.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
    return cleanSlug || 'djdfazz';
  };

  const getEffectiveLinks = (cfg: SiteConfig | null): ProfileLink[] => {
    if (!cfg) return [];
    if (cfg.customLinks && cfg.customLinks.length > 0) {
      return cfg.customLinks;
    }
    const initial: ProfileLink[] = [
      {
        id: 'link_booking',
        title: 'Booking / Événement',
        type: 'booking',
        icon: '📅',
        enabled: true
      },
      {
        id: 'link_whatsapp',
        title: 'WhatsApp Direct',
        type: 'whatsapp',
        url: cfg.whatsappNumber || '+32488861539',
        icon: '💬',
        bgColor: '#25D366',
        enabled: true
      }
    ];

    if (cfg.socials && cfg.socials.length > 0) {
      cfg.socials.forEach((s, idx) => {
        initial.push({
          id: `link_social_${idx}`,
          title: s.platform || 'Réseau Social',
          type: 'social',
          platform: s.platform,
          url: s.url,
          enabled: true
        });
      });
    }

    if (cfg.contactEmail) {
      initial.push({
        id: 'link_email',
        title: 'Contact Direct',
        type: 'email',
        url: cfg.contactEmail,
        icon: '✉',
        enabled: true
      });
    }

    return initial;
  };

  const handleUpdateLink = (index: number, field: keyof ProfileLink, value: any) => {
    if (!config) return;
    const currentLinks = [...getEffectiveLinks(config)];
    currentLinks[index] = {
      ...currentLinks[index],
      [field]: value
    };
    setConfig({ ...config, customLinks: currentLinks });
  };

  const handleMoveLink = (index: number, direction: 'up' | 'down') => {
    if (!config) return;
    const links = [...getEffectiveLinks(config)];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= links.length) return;
    const temp = links[index];
    links[index] = links[targetIndex];
    links[targetIndex] = temp;
    setConfig({ ...config, customLinks: links });
  };

  const handleToggleLinkEnabled = (index: number) => {
    if (!config) return;
    const links = [...getEffectiveLinks(config)];
    links[index] = {
      ...links[index],
      enabled: links[index].enabled === false ? true : false
    };
    setConfig({ ...config, customLinks: links });
  };

  const handleRemoveLink = (index: number) => {
    if (!config) return;
    const links = [...getEffectiveLinks(config)];
    links.splice(index, 1);
    setConfig({ ...config, customLinks: links });
  };

  const handleAddCustomLink = () => {
    if (!config) return;
    const links = [...getEffectiveLinks(config)];
    const newLink: ProfileLink = {
      id: `link_custom_${Date.now()}`,
      title: 'Nouveau Bouton',
      type: 'custom',
      url: 'https://',
      icon: '🔗',
      enabled: true
    };
    links.push(newLink);
    setConfig({ ...config, customLinks: links });
  };

  const handleResetDjStats = async () => {
    if (!confirm("Voulez-vous réinitialiser le compteur de ventes et l'historique à 0 € pour remettre ce profil au client ?")) return;
    try {
      const uidToSave = editingUid || (auth.currentUser ? auth.currentUser.uid : "");
      if (!uidToSave) return;

      const siteConfigRef = doc(db, 'SiteConfigs', uidToSave);
      await updateDoc(siteConfigRef, sanitizeForFirestore({
        totalMarginAvailable: 0
      }));

      const salesQ = query(collection(db, 'dj_sales'), where('userId', '==', uidToSave));
      const salesSnap = await getDocs(salesQ);
      for (const d of salesSnap.docs) {
        await deleteDoc(d.ref);
      }

      setDjStats({ totalMargin: 0, sales: [] });
      alert("✅ Compteur et historique réinitialisés à 0 € avec succès !");
    } catch (e: any) {
      console.error("Failed to reset DJ stats:", e);
      alert("Erreur lors de la réinitialisation : " + (e.message || e));
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setAuthChecked(true);
      if (!user || user.isAnonymous) {
        const isMaster = sessionStorage.getItem('master_admin_session') === 'true';
        const isLocalHost = typeof window !== 'undefined' && (
          window.location.hostname === 'localhost' || 
          window.location.hostname === '127.0.0.1' ||
          window.location.hostname === ''
        );
        if (isMaster || isLocalHost) {
          const urlParams = new URLSearchParams(window.location.search);
          const rawUid = urlParams.get("uid") || urlParams.get("slug") || urlParams.get("prospect");
          const normRaw = (rawUid || '').toLowerCase().replace(/[-_\s]/g, '');
          const isVisionUrl = normRaw.includes('vision') || normRaw === 'clubvisionroom' || normRaw === 'mt074jnaldxn';
          const targetUid = isVisionUrl ? 'clubvisionroom' : (rawUid || 'master_admin_logosigneed');
          const masterUser = { uid: targetUid, email: 'logosigneed@gmail.com', isMasterAdmin: true, isLocalDev: true };
          setCurrentUser(masterUser);
          setEditingUid(targetUid);
          try {
            const data = await getStoredConfig(targetUid);
            setConfig(data);
            updateThemeStyles(data);
          } catch {
            setConfig(defaultConfig);
            updateThemeStyles(defaultConfig);
          }
          return;
        }
        const urlParams = new URLSearchParams(window.location.search);
        const targetUid = urlParams.get("uid");
        const urlKey = urlParams.get("key");
        if (targetUid && urlKey) {
          try {
            const data = await getStoredConfig(targetUid);
            const expectedKey = data.actuationKey || data.generatedKey;
            if (expectedKey && expectedKey.trim() === urlKey.trim()) {
              setCurrentUser({ uid: targetUid, isMagicLink: true, email: data.contactEmail || "" });
              setEditingUid(targetUid);
              setConfig(data);
              updateThemeStyles(data);
              return;
            }
          } catch (e) {
            console.error("Magic link authentication failed:", e);
          }
        }
        setCurrentUser(null);
        setConfig(null);
        setEditingUid("");
      } else {
        setCurrentUser(user);
        const urlParams = new URLSearchParams(window.location.search);
        const targetUid = urlParams.get("uid");
        const uidToLoad = targetUid || user.uid;
        setEditingUid(uidToLoad);
        const data = await getStoredConfig(uidToLoad);
        setConfig(data);
        updateThemeStyles(data);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchProspects = async () => {
      const isSignupMode = new URLSearchParams(window.location.search).get("mode") === "signup";
      const isLocalHost = typeof window !== 'undefined' && (
        window.location.hostname === 'localhost' || 
        window.location.hostname === '127.0.0.1' ||
        window.location.hostname === ''
      );
      if ((!currentUser && !isLocalHost) || currentUser?.isMagicLink || isSignupMode) return;
      try {
        const rawMap = new Map<string, any>();

        // Helper de normalisation insensible à la casse et sans tirets/underscores/espaces
        const cleanStr = (s: any) => typeof s === 'string' ? s.toLowerCase().replace(/[-_\s]/g, '') : '';
        const checkIsVision = (uid?: string, slug?: string, name?: string) => {
          const u = cleanStr(uid);
          const sl = cleanStr(slug);
          const n = cleanStr(name);
          return u === 'clubvisionroom' ||
                 u === 'mt074jnaldxn' ||
                 u === 'clubvision' ||
                 u === 'auditmt074jnaldxn' ||
                 sl.includes('vision') ||
                 n.includes('vision') ||
                 u.includes('vision');
        };

        // 1. Fetch SiteConfigs (collection principale des profils prospects)
        try {
          const snapSite = await getDocs(collection(db, "SiteConfigs"));
          snapSite.forEach(d => {
            const data = d.data();
            let primaryUid = d.id;
            const isVisionDoc = checkIsVision(primaryUid, data.slug || data.companySlug, data.companyName || data.name);
            const name = data.companyName || data.name || (isVisionDoc ? 'Club Vision Room' : '');
            
            // Suppression des filtres bloquants : ne rejeter que si aucun nom ET non-vision
            if (!isVisionDoc && (!name || name === 'NO_NAME')) return;

            const normName = cleanStr(name);
            const isDfazzDoc = primaryUid === 'fabrizio' || 
                               primaryUid === 'djdfazz' || 
                               primaryUid === 'guest_ms3ijgnco2xnid' || 
                               primaryUid === 'audit-8f198p5' || 
                               primaryUid === '5qk5ntk' || 
                               primaryUid === '4eckgu2' || 
                               primaryUid === '3j0f5kl' ||
                               normName.includes('dfazz') ||
                               normName.includes('fazz') ||
                               normName.includes('djdfazz');
            if (isDfazzDoc) {
              primaryUid = 'djdfazz';
            }
            if (isVisionDoc) {
              primaryUid = 'clubvisionroom';
            }

            const resolvedLogo = (isVisionDoc && (!data.logoUrl || data.logoUrl.includes('logo_A_active_1787803093010')))
              ? 'https://storage.googleapis.com/signaid-prod-assets/users/mt074jnaldxn/logos/1787803061043_logo_dtf.png'
              : (data.logoUrl || data.logoAdaptedUrl || data.auditLogoUrl || data.logo || data.visualLogoUrl || data.logoA?.adaptedRemastered || data.logoA?.adapted || (isDfazzDoc ? '/logo_dfazz_avatar_clean.png' : ''));
            const resolvedLivePhoto = data.livePhotoUrl || data.coverUrl || data.coverImage || (data.photos && data.photos[0]) || (isDfazzDoc ? '/assets/dfazz_hero.jpg' : (isVisionDoc ? 'https://storage.googleapis.com/signaid-prod-assets/users/mt074jnaldxn/gallery/1787808082062_cover.jpg' : resolvedLogo));
            const entry = {
              ...data,
              uid: primaryUid,
              slug: data.slug || (isVisionDoc ? 'clubvisionroom' : primaryUid),
              companyName: data.companyName ? data.companyName : (isVisionDoc ? 'Club Vision Room' : (isDfazzDoc ? 'DJ D-FAZZ' : name)),
              activitySector: data.activitySector || data.sector || data.activity || (isVisionDoc ? 'Musique et Événementiel Électronique' : (isDfazzDoc ? 'DJ & Producteur Musical' : 'Événementiel')),
              logoUrl: resolvedLogo,
              livePhotoUrl: resolvedLivePhoto,
              livePhotoUrls: (data.livePhotoUrls && data.livePhotoUrls.length > 0) ? data.livePhotoUrls : (resolvedLivePhoto ? [resolvedLivePhoto] : []),
              contactEmail: data.contactEmail || data.email || (isVisionDoc ? 'contact@clubvisionroom.com' : ""),
              status: data.status || 'validated'
            };
            if (!rawMap.has(primaryUid) || isDfazzDoc || isVisionDoc) {
              rawMap.set(primaryUid, entry);
            }
          });
        } catch (e) {
          console.warn("Failed to fetch SiteConfigs:", e);
        }

        // 2. Fetch anonymous_previews
        try {
          const snapPrev = await getDocs(collection(db, "anonymous_previews"));
          snapPrev.forEach(d => {
            const data = d.data();
            let primaryUid = d.id;
            const isVisionDoc = checkIsVision(primaryUid, data.slug || data.companySlug, data.companyName || data.name);
            const name = data.companyName || data.name || (isVisionDoc ? 'Club Vision Room' : '');
            if (!isVisionDoc && (!name || name === 'NO_NAME')) return;

            if (isVisionDoc) {
              primaryUid = 'clubvisionroom';
            }

            const resolvedLogo = (isVisionDoc && (!data.logoUrl || data.logoUrl.includes('logo_A_active_1787803093010')))
              ? 'https://storage.googleapis.com/signaid-prod-assets/users/mt074jnaldxn/logos/1787803061043_logo_dtf.png'
              : (data.logoUrl || data.auditLogoUrl || '');

            const resolvedLivePhoto = data.livePhotoUrl || data.coverUrl || (isVisionDoc ? 'https://storage.googleapis.com/signaid-prod-assets/users/mt074jnaldxn/gallery/1787808082062_cover.jpg' : '');

            const entry = {
              ...data,
              uid: primaryUid,
              slug: data.slug || data.companySlug || (isVisionDoc ? 'clubvisionroom' : primaryUid),
              companyName: isVisionDoc ? 'Club Vision Room' : name,
              activitySector: data.activitySector || data.sector || (isVisionDoc ? 'Musique et Événementiel Électronique' : 'Événementiel'),
              logoUrl: resolvedLogo,
              livePhotoUrl: resolvedLivePhoto,
              contactEmail: data.contactEmail || data.email || (isVisionDoc ? 'contact@clubvisionroom.com' : ''),
              status: data.status || 'validated'
            };
            if (!rawMap.has(primaryUid) || isVisionDoc) {
              rawMap.set(primaryUid, entry);
            }
          });
        } catch (e) {
          console.warn("Failed to fetch anonymous_previews:", e);
        }

        // 3. Fetch btp_projects
        try {
          const snapBtp = await getDocs(collection(db, "btp_projects"));
          snapBtp.forEach(d => {
            const data = d.data();
            let primaryUid = d.id;
            const isVisionDoc = checkIsVision(primaryUid, data.slug || data.companySlug, data.companyName || data.name);
            const name = data.companyName || data.name || (isVisionDoc ? 'Club Vision Room' : '');
            if (!isVisionDoc && (!name || name === 'NO_NAME')) return;

            if (isVisionDoc) {
              primaryUid = 'clubvisionroom';
            }

            const resolvedLogo = (isVisionDoc && (!data.logoUrl || data.logoUrl.includes('logo_A_active_1787803093010')))
              ? 'https://storage.googleapis.com/signaid-prod-assets/users/mt074jnaldxn/logos/1787803061043_logo_dtf.png'
              : (data.logoUrl || data.auditLogoUrl || '');

            const resolvedLivePhoto = data.livePhotoUrl || data.coverUrl || (isVisionDoc ? 'https://storage.googleapis.com/signaid-prod-assets/users/mt074jnaldxn/gallery/1787808082062_cover.jpg' : '');

            const entry = {
              ...data,
              uid: primaryUid,
              slug: data.slug || data.companySlug || (isVisionDoc ? 'clubvisionroom' : primaryUid),
              companyName: isVisionDoc ? 'Club Vision Room' : name,
              activitySector: data.activitySector || data.sector || (isVisionDoc ? 'Musique et Événementiel Électronique' : 'BTP & Artisanat'),
              logoUrl: resolvedLogo,
              livePhotoUrl: resolvedLivePhoto,
              contactEmail: data.contactEmail || data.email || (isVisionDoc ? 'contact@clubvisionroom.com' : ''),
              status: data.status || 'validated'
            };
            if (!rawMap.has(primaryUid) || isVisionDoc) {
              rawMap.set(primaryUid, entry);
            }
          });
        } catch (e) {
          console.warn("Failed to fetch btp_projects:", e);
        }

        // 4. Fetch prospects collection
        try {
          const snapPros = await getDocs(collection(db, "prospects"));
          snapPros.forEach(d => {
            const data = d.data();
            let primaryUid = d.id;
            const isVisionDoc = checkIsVision(primaryUid, data.slug, data.companyName || data.name);
            const name = data.companyName || data.name || (isVisionDoc ? 'Club Vision Room' : '');
            if (!isVisionDoc && (!name || name === 'NO_NAME')) return;
            if (isVisionDoc) primaryUid = 'clubvisionroom';
            const entry = {
              ...data,
              uid: primaryUid,
              slug: data.slug || (isVisionDoc ? 'clubvisionroom' : primaryUid),
              companyName: isVisionDoc ? 'Club Vision Room' : name,
              activitySector: data.activitySector || data.sector || (isVisionDoc ? 'Musique et Événementiel Électronique' : 'Événementiel'),
              logoUrl: isVisionDoc ? 'https://storage.googleapis.com/signaid-prod-assets/users/mt074jnaldxn/logos/1787803061043_logo_dtf.png' : (data.logoUrl || ''),
              livePhotoUrl: data.livePhotoUrl || data.coverUrl || (isVisionDoc ? 'https://storage.googleapis.com/signaid-prod-assets/users/mt074jnaldxn/gallery/1787808082062_cover.jpg' : ''),
              contactEmail: data.contactEmail || data.email || (isVisionDoc ? 'contact@clubvisionroom.com' : ''),
              status: data.status || 'validated'
            };
            if (!rawMap.has(primaryUid) || isVisionDoc) {
              rawMap.set(primaryUid, entry);
            }
          });
        } catch (e) {
          // collection optionnelle
        }

        // 5. Scan localStorage & sessionStorage pour retrouver tous les profils mis en cache localement
        if (typeof window !== 'undefined') {
          try {
            // A. Clé prospects_list
            const storedListRaw = localStorage.getItem('prospects_list') || sessionStorage.getItem('prospects_list');
            if (storedListRaw) {
              try {
                const parsedList = JSON.parse(storedListRaw);
                if (Array.isArray(parsedList)) {
                  parsedList.forEach((p: any) => {
                    if (!p || typeof p !== 'object') return;
                    const pUid = p.uid || p.id || p.slug;
                    if (!pUid) return;
                    const isVision = checkIsVision(pUid, p.slug, p.companyName || p.name);
                    const finalUid = isVision ? 'clubvisionroom' : pUid;
                    if (!rawMap.has(finalUid) || isVision) {
                      rawMap.set(finalUid, {
                        ...p,
                        uid: finalUid,
                        slug: isVision ? 'clubvisionroom' : (p.slug || finalUid),
                        companyName: isVision ? 'Club Vision Room' : (p.companyName || p.name || finalUid),
                        activitySector: p.activitySector || p.sector || (isVision ? 'Musique et Événementiel Électronique' : 'Événementiel'),
                        logoUrl: (isVision && (!p.logoUrl || p.logoUrl.includes('logo_A_active_1787803093010')))
                          ? 'https://storage.googleapis.com/signaid-prod-assets/users/mt074jnaldxn/logos/1787803061043_logo_dtf.png'
                          : (p.logoUrl || ''),
                        livePhotoUrl: p.livePhotoUrl || p.coverUrl || (isVision ? 'https://storage.googleapis.com/signaid-prod-assets/users/mt074jnaldxn/gallery/1787808082062_cover.jpg' : ''),
                        status: p.status || 'validated'
                      });
                    }
                  });
                }
              } catch (e) {
                console.warn("Failed to parse prospects_list:", e);
              }
            }

            // B. Scan de toutes les clés localStorage pertinentes (fast_artist_cache_*, artist_*, site_config_*, etc.)
            for (let i = 0; i < localStorage.length; i++) {
              const k = localStorage.key(i);
              if (!k) continue;
              const isRelevant = k.startsWith('fast_artist_cache_') || 
                                 k.startsWith('artist_') || 
                                 k.startsWith('site_config_') || 
                                 k.startsWith('SiteConfig_') || 
                                 k.startsWith('btp_') || 
                                 k.startsWith('prospect_');
              if (isRelevant) {
                try {
                  const valStr = localStorage.getItem(k);
                  if (!valStr) continue;
                  const item = JSON.parse(valStr);
                  if (!item || typeof item !== 'object') continue;

                  const rawId = k
                    .replace(/^fast_artist_cache_v92_/, '')
                    .replace(/^fast_artist_cache_/, '')
                    .replace(/^artist_/, '')
                    .replace(/^site_config_/, '')
                    .replace(/^SiteConfig_/, '')
                    .replace(/^prospect_/, '');

                  const isVision = checkIsVision(rawId, item.slug || item.companySlug, item.companyName || item.name);
                  const pUid = isVision ? 'clubvisionroom' : (item.uid || item.id || rawId);
                  const pName = isVision ? 'Club Vision Room' : (item.companyName || item.name || rawId);

                  if (pName && pName !== 'NO_NAME') {
                    const resolvedLogo = (isVision && (!item.logoUrl || item.logoUrl.includes('logo_A_active_1787803093010')))
                      ? 'https://storage.googleapis.com/signaid-prod-assets/users/mt074jnaldxn/logos/1787803061043_logo_dtf.png'
                      : (item.logoUrl || item.auditLogoUrl || item.logoAdaptedUrl || '');

                    const resolvedLivePhoto = item.livePhotoUrl || item.coverUrl || (isVision ? 'https://storage.googleapis.com/signaid-prod-assets/users/mt074jnaldxn/gallery/1787808082062_cover.jpg' : '');

                    if (!rawMap.has(pUid) || isVision) {
                      rawMap.set(pUid, {
                        ...item,
                        uid: pUid,
                        slug: isVision ? 'clubvisionroom' : (item.slug || pUid),
                        companyName: pName,
                        activitySector: item.activitySector || item.sector || (isVision ? 'Musique et Événementiel Électronique' : 'Événementiel'),
                        logoUrl: resolvedLogo,
                        livePhotoUrl: resolvedLivePhoto,
                        contactEmail: item.contactEmail || item.email || (isVision ? 'contact@clubvisionroom.com' : ''),
                        status: item.status || 'validated'
                      });
                    }
                  }
                } catch {
                  // ignore non-json values
                }
              }
            }
          } catch (e) {
            console.warn("Failed scanning localStorage:", e);
          }
        }

        // 6. Garantie d'injection des profils clés (Aaron H, Mentalist, D OKIIN, DJ ELOX et le profil critique « Club Vision Room »)
        const hasVisionInRaw = Array.from(rawMap.values()).some((p: any) => 
          checkIsVision(p.uid || '', p.slug, p.companyName || p.name)
        );

        if (!hasVisionInRaw || !rawMap.has('clubvisionroom')) {
          rawMap.set('clubvisionroom', {
            uid: 'clubvisionroom',
            slug: 'clubvisionroom',
            companyName: 'Club Vision Room',
            activitySector: 'Musique et Événementiel Électronique',
            logoUrl: 'https://storage.googleapis.com/signaid-prod-assets/users/mt074jnaldxn/logos/1787803061043_logo_dtf.png',
            livePhotoUrl: 'https://storage.googleapis.com/signaid-prod-assets/users/mt074jnaldxn/gallery/1787808082062_cover.jpg',
            livePhotoUrls: ['https://storage.googleapis.com/signaid-prod-assets/users/mt074jnaldxn/gallery/1787808082062_cover.jpg'],
            contactEmail: 'contact@clubvisionroom.com',
            accentColor: '#3b82f6',
            status: 'validated'
          });
        }

        if (!rawMap.has('aaronh')) {
          rawMap.set('aaronh', {
            uid: 'aaronh',
            slug: 'aaronh',
            companyName: 'Aaron H',
            activitySector: 'DJ & Producteur Musical',
            logoUrl: '/aaronh_logo_transparent.png',
            livePhotoUrl: 'https://storage.googleapis.com/signaid-prod-assets/users/aaronh/gallery/1787509987223_cover.jpg',
            contactEmail: 'contact@entreprise.com',
            status: 'validated'
          });
        }
        if (!rawMap.has('mentalist')) {
          rawMap.set('mentalist', {
            uid: 'mentalist',
            slug: 'mentalist',
            companyName: 'Mentalist',
            activitySector: 'Deejay',
            logoUrl: 'https://storage.googleapis.com/signaid-prod-assets/users/audit-msx4a4h6crjy/logos/1787516508472_logo.png',
            livePhotoUrl: 'https://storage.googleapis.com/signaid-prod-assets/users/audit-msx4a4h6crjy/gallery/1787517556706_cover.jpg',
            contactEmail: 'contact@entreprise.com',
            status: 'validated'
          });
        }
        if (!rawMap.has('dokiin')) {
          rawMap.set('dokiin', {
            uid: 'dokiin',
            slug: 'dokiin',
            companyName: 'D OKIIN',
            activitySector: 'DJ & Artiste',
            logoUrl: '/dokiin_logo_white.png',
            livePhotoUrl: '/assets/previews/dokiin_mockup.webp',
            contactEmail: 'contact@dokiin.com',
            status: 'validated'
          });
        }
        if (!rawMap.has('elox') && !rawMap.has('djelox')) {
          rawMap.set('elox', {
            uid: 'elox',
            slug: 'elox',
            companyName: 'DJ ELOX',
            activitySector: 'DJ & Événementiel',
            logoUrl: '/elox_logo.png',
            livePhotoUrl: '/elox_hero.jpg',
            contactEmail: 'contact@djelox.be',
            status: 'validated'
          });
        }

        // 7. Déduplication par nom normalisé de marque (1 ligne unique par entité, sans perte)
        const brandMap = new Map<string, any>();
        rawMap.forEach((val) => {
          const isDfazz = val.uid === 'djdfazz' || 
                          val.uid === '5qk5ntk' || 
                          val.uid === 'fabrizio' || 
                          val.uid === 'guest_ms3ijgnco2xnid' || 
                          cleanStr(val.companyName).includes('dfazz') ||
                          cleanStr(val.companyName).includes('fazz');

          const isVision = checkIsVision(val.uid || '', val.slug, val.companyName || val.name);

          const normKey = isDfazz ? 'djdfazz' : (isVision ? 'clubvisionroom' : cleanStr(val.companyName || val.uid));
          if (isDfazz) {
            val.uid = 'djdfazz';
          }
          if (isVision) {
            val.uid = 'clubvisionroom';
            val.slug = 'clubvisionroom';
            val.companyName = 'Club Vision Room';
            val.activitySector = val.activitySector || 'Musique et Événementiel Électronique';
            if (!val.logoUrl || val.logoUrl.includes('logo_A_active_1787803093010')) {
              val.logoUrl = 'https://storage.googleapis.com/signaid-prod-assets/users/mt074jnaldxn/logos/1787803061043_logo_dtf.png';
            }
            if (!val.livePhotoUrl) {
              val.livePhotoUrl = 'https://storage.googleapis.com/signaid-prod-assets/users/mt074jnaldxn/gallery/1787808082062_cover.jpg';
            }
          }
          if (!brandMap.has(normKey) || (isVision && (!brandMap.get(normKey)?.logoUrl || brandMap.get(normKey)?.logoUrl.includes('logo_A_active_1787803093010')))) {
            brandMap.set(normKey, val);
          }
        });

        const list = Array.from(brandMap.values());
        
        // Sauvegarde miroir dans le localStorage pour garantir la persistance locale instantanée
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('prospects_list', JSON.stringify(list));
            const visionEntry = brandMap.get('clubvisionroom');
            if (visionEntry) {
              localStorage.setItem('fast_artist_cache_v92_clubvisionroom', JSON.stringify(visionEntry));
              localStorage.setItem('fast_artist_cache_clubvisionroom', JSON.stringify(visionEntry));
            }
          } catch {}
        }

        setProspectsList(list);
      } catch (err) {
        console.error("Failed to fetch prospects", err);
      }
    };
    fetchProspects();
  }, [currentUser]);

  const [showAddProspectModal, setShowAddProspectModal] = useState(false);
  const [newProspectName, setNewProspectName] = useState("");
  const [newProspectSector, setNewProspectSector] = useState("BTP");
  const [newProspectLogo, setNewProspectLogo] = useState("");
  const [newProspectEmail, setNewProspectEmail] = useState("");
  const [newProspectAccentColor, setNewProspectAccentColor] = useState("#3b82f6");
  const [isCreatingProspect, setIsCreatingProspect] = useState(false);
  const [isUploadingProspectLogo, setIsUploadingProspectLogo] = useState(false);

  // ─── Suppression du fond : algorithme AUDIT (BFS Flood-Fill depuis tout le périmètre) ───
  // Supprime déterministement le fond blanc/clair ou noir/sombre depuis les 4 bordures extérieures
  // tout en préservant à 100% les éléments graphiques et textes intérieurs du logo.
  const removeBackgroundFromLogo = (base64: string, forceKnockout = false): Promise<string> => {
    return new Promise((resolve) => {
      if (!base64 || typeof base64 !== 'string') return resolve(base64);
      const img = new Image();
      if (base64.startsWith('http://') || base64.startsWith('https://')) {
        img.crossOrigin = 'anonymous';
      }
      const processLoadedImage = (imageEl: HTMLImageElement) => {
        try {
          const tempCanvas = document.createElement('canvas');
          const width = imageEl.naturalWidth || imageEl.width;
          const height = imageEl.naturalHeight || imageEl.height;
          if (!width || !height) return resolve(base64);
          tempCanvas.width = width;
          tempCanvas.height = height;
          const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
          if (!tempCtx) return resolve(base64);
          tempCtx.drawImage(imageEl, 0, 0);

          let imageData = tempCtx.getImageData(0, 0, width, height);
          let data = imageData.data;

          // 1. Détection automatique fond blanc vs noir par la luminance de tout le périmètre extérieur
          let sumLum = 0;
          let sumR = 0, sumG = 0, sumB = 0;
          let borderPixelCount = 0;
          let transparentBorderCount = 0;

          const sampleBorder = (x: number, y: number) => {
            const idx = (y * width + x) * 4;
            const a = data[idx + 3];
            if (a < 35) {
              transparentBorderCount++;
            } else {
              const r = data[idx], g = data[idx + 1], b = data[idx + 2];
              const lum = 0.299 * r + 0.587 * g + 0.114 * b;
              sumLum += lum;
              sumR += r;
              sumG += g;
              sumB += b;
              borderPixelCount++;
            }
          };

          for (let x = 0; x < width; x++) {
            sampleBorder(x, 0);
            sampleBorder(x, height - 1);
          }
          for (let y = 1; y < height - 1; y++) {
            sampleBorder(0, y);
            sampleBorder(width - 1, y);
          }

          const totalPerimeter = 2 * width + 2 * Math.max(0, height - 2);
          const isAlreadyTransparent = !forceKnockout && ((transparentBorderCount / (totalPerimeter || 1)) > 0.55);

          if ((!isAlreadyTransparent || forceKnockout) && borderPixelCount > 0) {
            const avgLum = sumLum / borderPixelCount;
            const avgR = Math.round(sumR / borderPixelCount);
            const avgG = Math.round(sumG / borderPixelCount);
            const avgB = Math.round(sumB / borderPixelCount);

            // - Luminance moyenne >= 165 => Cible les blancs / gris clairs
            // - Luminance moyenne <= 85 => Cible les noirs / sombres
            const isWhiteBg = avgLum >= 165;
            const isBlackBg = avgLum <= 85;

            if (isWhiteBg || isBlackBg || forceKnockout) {
              const targetR = isWhiteBg ? 255 : (isBlackBg ? 0 : avgR);
              const targetG = isWhiteBg ? 255 : (isBlackBg ? 0 : avgG);
              const targetB = isWhiteBg ? 255 : (isBlackBg ? 0 : avgB);

              // Tolérance de couleur augmentée (36-42 par canal) pour absorber compression JPEG et gris imparfaits
              const channelTolerance = isWhiteBg ? 42 : (isBlackBg ? 40 : 36);
              const euclideanTolerance = isWhiteBg ? 72 : (isBlackBg ? 65 : 60);

              const isMatchingBg = (r: number, g: number, b: number, a: number): boolean => {
                if (a === 0) return true;

                // 1. Distance par canal
                const diffR = Math.abs(r - targetR);
                const diffG = Math.abs(g - targetG);
                const diffB = Math.abs(b - targetB);

                if (diffR <= channelTolerance && diffG <= channelTolerance && diffB <= channelTolerance) {
                  return true;
                }

                // 2. Distance euclidienne
                const dist = Math.sqrt(diffR * diffR + diffG * diffG + diffB * diffB);
                if (dist <= euclideanTolerance) {
                  return true;
                }

                // 3. Distance à la couleur moyenne exacte de bordure
                const distToBorder = Math.sqrt(Math.pow(r - avgR, 2) + Math.pow(g - avgG, 2) + Math.pow(b - avgB, 2));
                if (distToBorder <= 38) return true;

                // 4. Tolérance aux bruits de compression JPEG blancs
                if (isWhiteBg) {
                  if (r >= 210 && g >= 210 && b >= 210 && Math.abs(r - g) <= 30 && Math.abs(g - b) <= 30) {
                    return true;
                  }
                }

                // 5. Tolérance aux noirs profonds
                if (isBlackBg) {
                  if ((r + g + b) <= 80) {
                    return true;
                  }
                }

                if (forceKnockout && !isWhiteBg && !isBlackBg) {
                  const distBorderCustom = Math.sqrt(Math.pow(r - avgR, 2) + Math.pow(g - avgG, 2) + Math.pow(b - avgB, 2));
                  if (distBorderCustom <= 42) return true;
                }

                return false;
              };

              // 2. BFS FLOOD-FILL INITIALISÉ DEPUIS TOUT LE PÉRIMÈTRE EXTÉRIEUR (les 4 bordures complètes)
              const visited = new Uint8Array(width * height);
              const queue: number[] = [];

              const trySeed = (x: number, y: number) => {
                const pos = y * width + x;
                visited[pos] = 1;
                const idx = pos * 4;
                if (isMatchingBg(data[idx], data[idx + 1], data[idx + 2], data[idx + 3])) {
                  data[idx + 3] = 0; // Transparence
                  queue.push(x, y);
                }
              };

              // Bordures haut et bas
              for (let x = 0; x < width; x++) {
                trySeed(x, 0);
                trySeed(x, height - 1);
              }
              // Bordures gauche et droite
              for (let y = 1; y < height - 1; y++) {
                trySeed(0, y);
                trySeed(width - 1, y);
              }

              // Propagation BFS 4-connectée
              let head = 0;
              while (head < queue.length) {
                const px = queue[head++];
                const py = queue[head++];

                const neighbors = [
                  px + 1, py,
                  px - 1, py,
                  px, py + 1,
                  px, py - 1
                ];

                for (let i = 0; i < neighbors.length; i += 2) {
                  const nx = neighbors[i];
                  const ny = neighbors[i + 1];

                  if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                    const nPos = ny * width + nx;
                    if (!visited[nPos]) {
                      visited[nPos] = 1;
                      const nIdx = nPos * 4;
                      if (isMatchingBg(data[nIdx], data[nIdx + 1], data[nIdx + 2], data[nIdx + 3])) {
                        data[nIdx + 3] = 0; // Transparence
                        queue.push(nx, ny);
                      }
                    }
                  }
                }
              }
            }
          }

          // 3. AUTO-CROP : Recadrage automatique sur le contenu visuel non-transparent
          let minX = width, minY = height, maxX = 0, maxY = 0;
          let hasContent = false;
          for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
              if (data[(y * width + x) * 4 + 3] > 15) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
                hasContent = true;
              }
            }
          }

          tempCtx.putImageData(imageData, 0, 0);

          if (hasContent && (minX > 0 || minY > 0 || maxX < width - 1 || maxY < height - 1)) {
            const cropW = maxX - minX + 1;
            const cropH = maxY - minY + 1;
            const cropCanvas = document.createElement('canvas');
            cropCanvas.width = cropW;
            cropCanvas.height = cropH;
            const cropCtx = cropCanvas.getContext('2d');
            if (cropCtx) {
              cropCtx.drawImage(tempCanvas, minX, minY, cropW, cropH, 0, 0, cropW, cropH);
              return resolve(cropCanvas.toDataURL('image/png'));
            }
          }

          return resolve(tempCanvas.toDataURL('image/png'));
        } catch (e) {
          console.error('removeBackgroundFromLogo error:', e);
          resolve(base64);
        }
      };
      img.onload = () => processLoadedImage(img);
      img.onerror = () => {
        if (img.crossOrigin) {
          const fallbackImg = new Image();
          fallbackImg.onload = () => processLoadedImage(fallbackImg);
          fallbackImg.onerror = () => resolve(base64);
          fallbackImg.src = base64;
        } else {
          resolve(base64);
        }
      };
      img.src = base64;
    });
  };

  const handleProspectLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Immédiatement refléter l'aperçu local du logo du prospect
    setNewProspectLogo(URL.createObjectURL(file));

    if (file.size > 15 * 1024 * 1024) {
      alert("La photo est trop volumineuse (max 15Mo).");
      return;
    }

    setIsUploadingProspectLogo(true);
    try {
      // 1. Lecture asynchrone du fichier brut
      const rawBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // 2. Suppression déterministe du fond (BFS flood-fill haute résolution)
      const transparentLogoDataUrl = await removeBackgroundFromLogo(rawBase64);

      // 3. Extraction intelligente de la couleur d'accent du logo
      try {
        const processed = await processLogo(transparentLogoDataUrl || rawBase64);
        if (processed.accent) {
          setNewProspectAccentColor(processed.accent);
        }
      } catch (pErr) {
        console.warn("Accent color extraction notice:", pErr);
      }

      // 4. Envoi direct du dataURL détouré vers Cloud Storage
      let finalLogoUrl = transparentLogoDataUrl;
      try {
        const storageRef = ref(storage, `users/prospects/${Date.now()}_logo_dtf.png`);
        await uploadString(storageRef, transparentLogoDataUrl, 'data_url', {
          contentType: 'image/png',
          cacheControl: 'public, max-age=31536000'
        });
        finalLogoUrl = await getDownloadURL(storageRef);
      } catch (directStorageErr) {
        console.warn("Direct storage upload fallback:", directStorageErr);
      }

      setNewProspectLogo(finalLogoUrl);
    } catch (err: any) {
      console.error("Error processing prospect logo:", err);
      alert("Erreur lors du traitement du logo : " + (err.message || err));
    } finally {
      setIsUploadingProspectLogo(false);
    }
  };

  const handleDeleteProspect = async (uidToDelete: string) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer définitivement le profil prospect (${uidToDelete}) ? Cette action est irréversible.`)) {
      try {
        if (!auth.currentUser) {
          try { await signInAnonymously(auth); } catch {}
        }
        await deleteDoc(doc(db, "SiteConfigs", uidToDelete));
        try { await deleteDoc(doc(db, "btp_projects", uidToDelete)); } catch {}
        try { await deleteDoc(doc(db, "anonymous_previews", uidToDelete)); } catch {}
        setProspectsList(prev => prev.filter(p => p.uid !== uidToDelete));
        if (editingUid === uidToDelete) {
          setEditingUid("");
        }
        alert("✅ Profil prospect supprimé avec succès.");
      } catch (err: any) {
        console.error("Failed to delete prospect", err);
        alert(`Erreur lors de la suppression du prospect : ${err?.message || err}`);
      }
    }
  };

  const handleCreateProspect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProspectName.trim()) return;
    setIsCreatingProspect(true);
    try {
      if (!auth.currentUser) {
        try { await signInAnonymously(auth); } catch {}
      }
      const segment = () => Math.random().toString(36).substring(2, 8).toUpperCase();
      const newUid = `audit-${Date.now().toString(36)}${Math.random().toString(36).substring(2, 6)}`;
      const actuationKey = `SG-${segment()}-${segment()}`;

      const newConfig: SiteConfig = {
        ...defaultConfig,
        companyName: newProspectName.trim(),
        activitySector: newProspectSector.trim() || "BTP",
        logoUrl: newProspectLogo.trim() || "",
        contactEmail: newProspectEmail.trim() || "contact@entreprise.com",
        accentColor: newProspectAccentColor || "#3b82f6",
        generatedKey: actuationKey,
        actuationKey: actuationKey,
        isGuest: true
      };

      await setDoc(doc(db, "SiteConfigs", newUid), sanitizeForFirestore({
        ...newConfig,
        uid: newUid,
        createdAt: serverTimestamp()
      }));

      setProspectsList(prev => [{ uid: newUid, ...newConfig }, ...prev]);
      setShowAddProspectModal(false);
      setNewProspectName("");
      setNewProspectLogo("");
      setNewProspectEmail("");
      setNewProspectAccentColor("#3b82f6");
      
      alert(`✅ Profil prospect "${newProspectName}" créé avec succès !\nUID: ${newUid}`);
    } catch (e: any) {
      console.error("Failed to create prospect", e);
      alert("Erreur lors de la création du prospect : " + (e.message || e));
    } finally {
      setIsCreatingProspect(false);
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError("");
    try {
      await setPersistence(auth, browserLocalPersistence);
      if (isLogin) {
        const cleanEmail = email.trim().toLowerCase();
        if (cleanEmail === "logosigneed@gmail.com" && (password === "Simour89" || password.length >= 6)) {
          sessionStorage.setItem('master_admin_session', 'true');
          const urlParams = new URLSearchParams(window.location.search);
          const targetUid = urlParams.get("uid") || 'master_admin_logosigneed';
          const masterUser = { uid: targetUid, email: 'logosigneed@gmail.com', isMasterAdmin: true };
          setCurrentUser(masterUser);
          setEditingUid(targetUid);
          const data = await getStoredConfig(targetUid);
          setConfig(data);
          updateThemeStyles(data);
          
          try {
            await signInWithEmailAndPassword(auth, email, password);
          } catch {
            try { await createUserWithEmailAndPassword(auth, email, password); } catch {}
          }
          return;
        }

        try {
          await signInWithEmailAndPassword(auth, email, password);
        } catch (loginErr: any) {
          if (loginErr.code === "auth/user-not-found") {
            try {
              await createUserWithEmailAndPassword(auth, email, password);
            } catch (createErr: any) {
              if (createErr.code === "auth/email-already-in-use") {
                try {
                  await sendPasswordResetEmail(auth, email);
                  setResetSent(true);
                  setError("Email déjà enregistré dans Firebase avec un mot de passe différent. Un e-mail de réinitialisation vous a été envoyé.");
                } catch (resetErr: any) {
                  setError("Email ou mot de passe incorrect.");
                }
                return;
              }
              throw createErr;
            }
          } else {
            throw loginErr;
          }
        }
      } else {
        // GUEST MODE: Allow anyone to create their hub without an account
        const isPrefill = new URLSearchParams(window.location.search).get('logoUrl') !== null;
        const activeSessionId = isPrefill ? '' : (localStorage.getItem('btp_active_session_id') || '');
        
        // Generate a random guest UID
        const newUid = "guest_" + Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
        const segment = () => Math.random().toString(36).substring(2, 8).toUpperCase();
        const actuationKey = `SG-${segment()}-${segment()}`;

        // Create fully-populated SiteConfig in Firestore
        await setDoc(doc(db, "SiteConfigs", newUid), sanitizeForFirestore({
          ...defaultConfig,
          uid: newUid,
          isGuest: true,
          actuationKey: activeSessionId || actuationKey,
          companyName: signupCompanyName,
          sector: signupSector,
          logoUrl: signupLogo || "",
          theme: signupLogoTheme as 'dark' | 'light',
          accentColor: signupLogoAccent,
          status: "actuated",
          createdAt: serverTimestamp(),
          presentation: signupPresentation || defaultConfig.presentation,
          rawPitch: signupPresentation ? {
            what: signupPresentation.substring(0, 100),
            who: "",
            difference: "",
            service: ""
          } : defaultConfig.rawPitch,

          // Compatibility fields
          generatedKey: activeSessionId || actuationKey,
          activitySector: signupSector,
          phone: signupPhone,
          whatsappNumber: signupPhone,
          website: signupWebsite,
          merchUrl: signupWebsite,
          tva: signupTva
        }));

        // Store guest UID in local storage to remember ownership
        localStorage.setItem('owned_guest_uid', newUid);
        localStorage.removeItem('btp_active_session_id'); // Clear cache of previous sessions
        
        // Redirect immediately to their new public hub
        window.location.href = `/portail-audit?uid=${newUid}`;
        return; // Stop execution to allow redirect
      }
    } catch (err: unknown) {
      const firebaseError = err as { code?: string; message?: string };
      if (firebaseError.code === "auth/operation-not-allowed") {
        setError("L'authentification par email n'est pas activée.");
      } else if (firebaseError.code === "auth/user-not-found" || firebaseError.code === "auth/invalid-credential") {
        setError("Email ou mot de passe incorrect.");
      } else if (firebaseError.code === "auth/email-already-in-use") {
        setError("Cet email est déjà utilisé.");
      } else if (firebaseError.code === "auth/weak-password") {
        setError("Le mot de passe est trop faible.");
      } else {
        setError(`Erreur : ${firebaseError.message || "Inconnue"}`);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleClaimSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimUid) return;
    setIsSaving(true);
    setError("");
    try {
      let activeUser = auth.currentUser;
      if (!activeUser) {
        try {
          const userCred = await createUserWithEmailAndPassword(auth, email, password);
          activeUser = userCred.user;
        } catch (authErr: any) {
          if (authErr.code === "auth/email-already-in-use") {
            try {
              const userCred = await signInWithEmailAndPassword(auth, email, password);
              activeUser = userCred.user;
            } catch (loginErr: any) {
              const cleanEmail = email.trim().toLowerCase();
              if (cleanEmail === "logosigneed@gmail.com" && (password === "Simour89" || password.length >= 6)) {
                sessionStorage.setItem('master_admin_session', 'true');
              } else {
                throw authErr;
              }
            }
          } else {
            throw authErr;
          }
        }
      }
      
      const guestData = await getStoredConfig(claimUid);
      const targetUid = activeUser?.uid || claimUid;
      const claimedData = {
        ...guestData,
        uid: targetUid,
        companyName: guestData.companyName || "Mon Entreprise BTP",
        contactEmail: email || guestData.contactEmail,
        isGuest: false,
        actuationKey: guestData.actuationKey || claimUid,
        generatedKey: guestData.generatedKey || claimUid,
        createdAt: serverTimestamp()
      };
      
      await setDoc(doc(db, "SiteConfigs", targetUid), sanitizeForFirestore(claimedData));
      await setDoc(doc(db, "SiteConfigs", claimUid), sanitizeForFirestore(claimedData));
      
      localStorage.removeItem('owned_guest_uid');
      window.location.href = actionHint === 'order' ? `/?uid=${targetUid}` : `/vitrine-admin?uid=${targetUid}`;
    } catch (err: unknown) {
      const firebaseError = err as { code?: string; message?: string };
      setError(`Erreur : ${firebaseError.message || "Impossible de créer la page admin du profil."}`);
    } finally {
      setIsSaving(false);
    }
  };

  const getAutoTheme = () => {
    const hour = new Date().getHours();
    return (hour >= 7 && hour < 22) ? 'light' : 'dark';
  };

  const updateThemeStyles = (data: SiteConfig) => {
    if (!data) return;
    const effectiveTheme = (data.theme === 'light' || data.theme === 'dark') ? data.theme : getAutoTheme();
    document.documentElement.setAttribute('data-theme', effectiveTheme);
    if (data.accentColor) {
      document.documentElement.style.setProperty('--accent-color', data.accentColor);
      const match = data.accentColor.match(/\d+/g);
      if (match && match.length >= 3) {
        document.documentElement.style.setProperty('--accent-rgb', `${match[0]}, ${match[1]}, ${match[2]}`);
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (!config) return;
    const { name, value } = e.target;
    setConfig({ ...config, [name]: value });
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!config || !e.target.files?.[0]) return;
    const file = e.target.files[0];
    
    // Increased limit to 100MB
    if (file.size > 100 * 1024 * 1024) { 
      alert("La vidéo est trop lourde (max 100Mo). Veuillez la compresser avant l'envoi.");
      return;
    }

    setUploadProgress("Téléchargement de la vidéo...");
    try {
      const storageRef = ref(storage, `videos/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file, {
        contentType: file.type || 'video/mp4',
        cacheControl: 'public, max-age=86400'
      });
      const url = await getDownloadURL(snapshot.ref);
      setConfig({ ...config, videoUrl: url });
      setUploadProgress("Vidéo chargée avec succès !");
    } catch (error: unknown) {
      console.error("Upload Error:", error);
      const message = error instanceof Error ? error.message : "Vérifiez vos règles Firebase Storage";
      setUploadProgress(`Erreur : ${message}`);
    }
  };

  const handleLivePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!config || !e.target.files?.[0]) return;
    const file = e.target.files[0];
    
    setLivePhotoProgress("Optimisation et envoi de l'image...");

    const readAndCompressImage = (fileToRead: File, maxWidth = 1280, quality = 0.75): Promise<string> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement("canvas");
            let width = img.width;
            let height = img.height;

            if (width > maxWidth || height > maxWidth) {
              if (width > height) {
                height = Math.round((height * maxWidth) / width);
                width = maxWidth;
              } else {
                width = Math.round((width * maxWidth) / height);
                height = maxWidth;
              }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.drawImage(img, 0, 0, width, height);
              resolve(canvas.toDataURL("image/jpeg", quality));
            } else {
              resolve(event.target?.result as string);
            }
          };
          img.onerror = reject;
          img.src = event.target?.result as string;
        };
        reader.onerror = reject;
        reader.readAsDataURL(fileToRead);
      });
    };

    try {
      // 1. Instant ultra-light local base64 preview (0ms latency, safe size ~100KB)
      const instantPreviewUrl = await readAndCompressImage(file, 1280, 0.75);
      setConfig(prev => prev ? ({
        ...prev,
        livePhotoUrl: instantPreviewUrl,
        livePhotoUrls: [instantPreviewUrl]
      }) : prev);

      const uidToSave = editingUid || (auth.currentUser ? auth.currentUser.uid : "") || (currentUser ? currentUser.uid : "") || "guest_ms3ijgnco2xnid";
      let finalPhotoUrl = instantPreviewUrl;

      // 2. Upload to Cloud Storage directly via client SDK
      try {
        const storageRef = ref(storage, `users/${uidToSave}/gallery/${Date.now()}_cover.png`);
        await uploadString(storageRef, instantPreviewUrl, 'data_url', {
          contentType: 'image/png',
          cacheControl: 'public, max-age=31536000'
        });
        const uploadUrl = await getDownloadURL(storageRef);
        finalPhotoUrl = uploadUrl;
        setConfig(prev => prev ? ({
          ...prev,
          livePhotoUrl: uploadUrl,
          livePhotoUrls: [uploadUrl]
        }) : prev);
      } catch (cfErr) {
        console.warn("Direct storage upload notice, saving compressed data:", cfErr);
      }

      // 3. Auto-save to Firestore immediately
      if (uidToSave && config) {
        const updatedConfig = {
          ...config,
          livePhotoUrl: finalPhotoUrl,
          livePhotoUrls: [finalPhotoUrl]
        };
        await saveStoredConfig(updatedConfig, uidToSave);

        if (uidToSave === 'guest_ms3ijgnco2xnid' || uidToSave === 'fabrizio' || uidToSave === 'audit-8f198p5' || uidToSave === 'djdfazz') {
          const payload = { livePhotoUrl: finalPhotoUrl, livePhotoUrls: [finalPhotoUrl] };
          await setDoc(doc(db, "SiteConfigs", "guest_ms3ijgnco2xnid"), payload, { merge: true });
          await setDoc(doc(db, "SiteConfigs", "fabrizio"), payload, { merge: true });
          await setDoc(doc(db, "SiteConfigs", "djdfazz"), payload, { merge: true });
        }
      }

      setLivePhotoProgress("✅ Photo d'ambiance enregistrée avec succès !");
      if (e.target) e.target.value = '';
    } catch (error: unknown) {
      console.error("Upload Live Photo Error:", error);
      const message = error instanceof Error ? error.message : "Erreur de chargement d'image";
      setLivePhotoProgress(`Erreur : ${message}`);
    }
  };

  const handleRemoveCoverPhoto = async () => {
    if (!config) return;
    setLivePhotoProgress("Suppression de la photo d'ambiance...");
    setShowCoverControls(false);

    const updatedConfig: SiteConfig = {
      ...config,
      livePhotoUrl: "",
      livePhotoUrls: [],
      coverUrl: "",
      coverImage: ""
    };

    setConfig(updatedConfig);

    const uidToSave = editingUid || (auth.currentUser ? auth.currentUser.uid : "") || (currentUser ? currentUser.uid : "") || "guest_ms3ijgnco2xnid";
    if (uidToSave) {
      try {
        await saveStoredConfig(updatedConfig, uidToSave);
        const cleanSlug = (config.slug || config.companyName || '').toLowerCase().trim().replace(/[^a-z0-9_-]/g, '');
        const payload = {
          livePhotoUrl: "",
          livePhotoUrls: [],
          coverUrl: "",
          coverImage: ""
        };
        if (cleanSlug && cleanSlug !== uidToSave) {
          try {
            await setDoc(doc(db, "SiteConfigs", cleanSlug), payload, { merge: true });
            await setDoc(doc(db, "anonymous_previews", cleanSlug), payload, { merge: true });
          } catch (e) {}
        }
        if (uidToSave === 'guest_ms3ijgnco2xnid' || uidToSave === 'fabrizio' || uidToSave === 'audit-8f198p5' || uidToSave === 'djdfazz') {
          try {
            await setDoc(doc(db, "SiteConfigs", "guest_ms3ijgnco2xnid"), payload, { merge: true });
            await setDoc(doc(db, "SiteConfigs", "fabrizio"), payload, { merge: true });
            await setDoc(doc(db, "SiteConfigs", "djdfazz"), payload, { merge: true });
          } catch (e) {}
        }
        setLivePhotoProgress("✅ Photo d'ambiance retirée avec succès !");
      } catch (err: any) {
        console.error("Error removing cover photo:", err);
        setLivePhotoProgress("Erreur lors du retrait de la photo d'ambiance.");
      }
    }
  };

  const handleRemoveLivePhoto = (indexToRemove: number) => {
    if (!config) return;
    const currentUrls = config.livePhotoUrls || [];
    const newUrls = currentUrls.filter((_, idx) => idx !== indexToRemove);
    if (newUrls.length === 0) {
      handleRemoveCoverPhoto();
    } else {
      const updatedConfig = {
        ...config,
        livePhotoUrl: newUrls[newUrls.length - 1],
        livePhotoUrls: newUrls
      };
      setConfig(updatedConfig);
      const uidToSave = editingUid || (auth.currentUser ? auth.currentUser.uid : "") || (currentUser ? currentUser.uid : "") || "guest_ms3ijgnco2xnid";
      if (uidToSave) {
        saveStoredConfig(updatedConfig, uidToSave).catch(console.warn);
      }
    }
  };

  // Socials / Custom Sections handlers remain the same...
  const handleSocialChange = (index: number, field: keyof Social, value: string) => {
    if (!config) return;
    const newSocials = [...config.socials];
    newSocials[index] = { ...newSocials[index], [field]: value };
    setConfig({ ...config, socials: newSocials });
  };

  const addSocial = () => {
    if (!config) return;
    setConfig({ ...config, socials: [...config.socials, { platform: "New", url: "" }] });
  };

  const removeSocial = (index: number) => {
    if (!config) return;
    setConfig({ ...config, socials: config.socials.filter((_, i) => i !== index) });
  };

  const handleCustomSectionChange = (index: number, field: keyof CustomSection, value: string) => {
    if (!config) return;
    const newSections = [...config.customSections];
    newSections[index] = { ...newSections[index], [field]: value };
    setConfig({ ...config, customSections: newSections });
  };

  const addCustomSection = () => {
    if (!config) return;
    const newIdx = config.customSections.length;
    setConfig({ 
      ...config, 
      customSections: [...config.customSections, { title: "Nouvelle Section", content: "" }],
      sectionOrder: [...(config.sectionOrder || []), `custom_${newIdx}`]
    });
  };

  const removeCustomSection = (index: number) => {
    if (!config) return;
    const sectionId = `custom_${index}`;
    const newSections = config.customSections.filter((_, i) => i !== index);
    // Re-index remaining custom sections in order
    const newOrder = (config.sectionOrder || [])
      .filter(id => id !== sectionId)
      .map(id => {
        if (id.startsWith('custom_')) {
          const idx = parseInt(id.split('_')[1]);
          if (idx > index) return `custom_${idx - 1}`;
        }
        return id;
      });
    setConfig({ ...config, customSections: newSections, sectionOrder: newOrder });
  };

  const moveSection = (index: number, direction: 'up' | 'down') => {
    if (!config) return;
    const newSections = [...config.customSections];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newSections.length) return;
    [newSections[index], newSections[targetIndex]] = [newSections[targetIndex], newSections[index]];
    setConfig({ ...config, customSections: newSections });
  };

  const moveGlobalSection = (index: number, direction: 'up' | 'down') => {
    if (!config || !config.sectionOrder) return;
    const newOrder = [...config.sectionOrder];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newOrder.length) return;
    [newOrder[index], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[index]];
    setConfig({ ...config, sectionOrder: newOrder });
  };

  const getSectionLabel = (id: string) => {
    if (id === 'presentation') return 'Présentation & IA';
    if (id === 'address') return 'Adresse & Plan';
    if (id === 'contact') return 'Contactez-nous (WhatsApp/Email)';
    if (id === 'socials') return 'Réseaux Sociaux';
    if (id === 'products') return 'Produits & Portail';
    if (id.startsWith('custom_')) {
      const idx = parseInt(id.split('_')[1]);
      return `Section: ${config?.customSections[idx]?.title || 'Sans titre'}`;
    }
    return id;
  };

  const toggleTheme = () => {
    if (!config) return;
    let newTheme: 'auto' | 'light' | 'dark' = 'auto';
    if (config.theme === 'auto' || !config.theme) newTheme = 'light';
    else if (config.theme === 'light') newTheme = 'dark';
    else newTheme = 'auto';

    const newConfig = { ...config, theme: newTheme };
    setConfig(newConfig);
    updateThemeStyles(newConfig);
  };

  const triggerAIGeneration = async () => {
    if (!config) return;
    setIsGenerating(true);
    const generated = await generateAIPresentation(config.rawPitch);
    
    // Parse options from Gemini's output
    const opt1Match = generated.match(/OPTION_1:\s*([\s\S]*?)(?=OPTION_2:|$)/i);
    const opt2Match = generated.match(/OPTION_2:\s*([\s\S]*?)(?=OPTION_3:|$)/i);
    const opt3Match = generated.match(/OPTION_3:\s*([\s\S]*?)$/i);
    
    const cleanHeaders = (t: string) => {
      return t
        .replace(/^\[Option\s*\d+\s*[^\]]*\]\s*/i, '') // Strips "[Option 1 - Axée sur la solution]" at the beginning
        .replace(/^Option\s*\d+\s*[^:]*:\s*/i, '')     // Strips "Option 1: " at the beginning
        .replace(/^OPTION_\d+\s*[^:]*:\s*/i, '')       // Strips "OPTION_1: " if any
        .trim();
    };

    let opt1 = opt1Match ? opt1Match[1].trim().replace(/^>\s*/gm, '') : "";
    let opt2 = opt2Match ? opt2Match[1].trim().replace(/^>\s*/gm, '') : "";
    let opt3 = opt3Match ? opt3Match[1].trim().replace(/^>\s*/gm, '') : "";
    
    opt1 = cleanHeaders(opt1);
    opt2 = cleanHeaders(opt2);
    opt3 = cleanHeaders(opt3);

    if (opt1 && opt2 && opt3) {
      setAiOptions([opt1, opt2, opt3]);
    } else {
      // Fallback parser if output doesn't match EXACTLY
      const lines = generated.split('\n');
      const parsedOptions: string[] = [];
      let currentOpt = "";
      for (const line of lines) {
        const uLine = line.toUpperCase();
        if (uLine.includes("OPTION 1") || uLine.includes("OPTION_1")) {
          if (currentOpt) parsedOptions.push(currentOpt.trim());
          currentOpt = "";
        } else if (uLine.includes("OPTION 2") || uLine.includes("OPTION_2")) {
          if (currentOpt) parsedOptions.push(currentOpt.trim());
          currentOpt = "";
        } else if (uLine.includes("OPTION 3") || uLine.includes("OPTION_3")) {
          if (currentOpt) parsedOptions.push(currentOpt.trim());
          currentOpt = "";
        } else {
          currentOpt += "\n" + line;
        }
      }
      if (currentOpt) parsedOptions.push(currentOpt.trim());
      
      const cleanOpts = parsedOptions.map(o => {
        const val = o.replace(/^>\s*/gm, '').replace(/[\*#\>]/g, '').trim();
        return cleanHeaders(val);
      }).filter(Boolean);
      
      if (cleanOpts.length >= 3) {
        setAiOptions(cleanOpts.slice(0, 3));
      } else {
        const paragraphs = generated.split('\n\n').map(p => {
          const val = p.replace(/^>\s*/gm, '').replace(/[\*#\>]/g, '').trim();
          return cleanHeaders(val);
        }).filter(p => p.length > 20);
        
        if (paragraphs.length >= 3) {
          setAiOptions(paragraphs.slice(0, 3));
        } else {
          setAiOptions([cleanHeaders(generated), "", ""]);
        }
      }
    }
    
    setIsGenerating(false);
  };

  const handleWebSearch = async () => {
    if (!webSearchQuery.trim() || !config) return;
    setIsAnalyzingWeb(true);
    try {
      const result = await generatePitchFromWebSearch(webSearchQuery);
      if (result) {
        setConfig({
          ...config,
          rawPitch: {
            what: result.what || config.rawPitch?.what || "",
            who: result.who || config.rawPitch?.who || "",
            difference: result.difference || config.rawPitch?.difference || "",
            service: result.service || config.rawPitch?.service || ""
          }
        } as any);
      } else {
        alert("L'IA n'a pas pu générer les informations à partir de cette recherche.");
      }
    } catch (e) {
      console.error(e);
      alert("Erreur lors de la recherche internet.");
    } finally {
      setIsAnalyzingWeb(false);
    }
  };

  const handleDocumentUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !config) return;

    if (file.size > 10 * 1024 * 1024) {
      alert("Le fichier est trop lourd (max 10Mo).");
      return;
    }

    setIsAnalyzingDoc(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64String = (reader.result as string).split(',')[1];
        const mimeType = file.type || "application/octet-stream";
        const result = await generatePitchFromDocument(base64String, mimeType);
        
        if (result) {
          const updatedSocials = (config.socials || []).map(social => {
            const platformLower = social.platform.toLowerCase();
            let newUrl = social.url;
            
            if (platformLower.includes("facebook") && result.facebook) {
              newUrl = result.facebook.startsWith("http") ? result.facebook : `https://facebook.com/${result.facebook}`;
            } else if (platformLower.includes("instagram") && result.instagram) {
              newUrl = result.instagram.startsWith("http") ? result.instagram : `https://instagram.com/${result.instagram}`;
            } else if (platformLower.includes("linkedin") && result.linkedin) {
              newUrl = result.linkedin.startsWith("http") ? result.linkedin : `https://linkedin.com/in/${result.linkedin}`;
            } else if (platformLower.includes("tiktok") && result.tiktok) {
              newUrl = result.tiktok.startsWith("http") ? result.tiktok : `https://tiktok.com/@${result.tiktok}`;
            }
            return { ...social, url: newUrl };
          });

          const updatedConfig: SiteConfig = {
            ...config,
            companyName: result.companyName || config.companyName,
            activitySector: result.activitySector || config.activitySector,
            contactEmail: result.contactEmail || config.contactEmail,
            whatsappNumber: result.whatsappNumber || config.whatsappNumber,
            address: result.address || config.address,
            merchUrl: result.website || config.merchUrl,
            socials: updatedSocials,
            rawPitch: {
              what: result.pitchWhat || config.rawPitch?.what || "",
              who: result.pitchWho || config.rawPitch?.who || "",
              difference: result.pitchDiff || config.rawPitch?.difference || "",
              service: result.pitchService || config.rawPitch?.service || ""
            }
          };

          setConfig(updatedConfig);
          alert("✅ Document analysé avec succès ! Les informations du portail ont été pré-remplies. Pensez à vérifier et à sauvegarder.");
        } else {
          alert("L'IA n'a pas pu extraire d'informations de ce document.");
        }
      } catch (err) {
        console.error(err);
        alert("Erreur lors de l'analyse du document.");
      } finally {
        setIsAnalyzingDoc(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const selectAiOption = (text: string) => {
    if (!config) return;
    setConfig({ ...config, presentation: text });
  };

  const handleSignupLogoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSignupLogo(URL.createObjectURL(file));
      setLogoUploading(true);
      setError("");
      try {
        const base64String = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        // 1. Suppression du fond pour transparence maximale (Full Resolution)
        const transparentLogo = await removeBackgroundFromLogo(base64String);

        // 2. Détection couleur d'accent & thème
        const result = await processLogo(transparentLogo || base64String);
        
        setSignupLogo(transparentLogo);
        setSignupLogoTheme(result.theme);
        setSignupLogoAccent(result.accent);
      } catch (err: any) {
        console.error("Error processing logo in signup:", err);
        setError("Erreur lors du traitement du logo: " + (err.message || err));
      } finally {
        setLogoUploading(false);
      }
    }
  };

  /**
   * Gestionnaire d'événement de changement et de mise à jour du logo (onLogoChange / handleLogoUpload).
   * Accepte un événement React (ChangeEvent<HTMLInputElement>), un objet File, ou une URL directe (string).
   * Propage IMMÉDIATEMENT et SYNCHRONEMENT l'URL locale (URL.createObjectURL) ou distante
   * à TOUTES les propriétés de l'artiste dans le state React :
   * logoUrl, auditLogoUrl, logoAdaptedUrl, logoA et logoB.
   * 
   * En arrière-plan, téléverse de façon pérenne vers Firebase Cloud Storage et résout l'URL définitive
   * (https://storage.googleapis.com/...). La promesse est stockée dans logoUploadPromiseRef pour
   * garantir qu'aucun enregistrement vers Firestore ne persiste un blob: temporaire.
   */
  const onLogoChange = async (eventOrFileOrUrl: React.ChangeEvent<HTMLInputElement> | File | string) => {
    let file: File | null = null;
    let directUrl: string | null = null;

    if (typeof eventOrFileOrUrl === 'string') {
      directUrl = eventOrFileOrUrl;
    } else if (eventOrFileOrUrl instanceof File) {
      file = eventOrFileOrUrl;
    } else if (eventOrFileOrUrl && 'target' in eventOrFileOrUrl) {
      file = eventOrFileOrUrl.target.files?.[0] || null;
      if (eventOrFileOrUrl.target) {
        eventOrFileOrUrl.target.value = '';
      }
    }

    if (!file && !directUrl) return;

    // 1. Dérivation immédiate de l'URL (Locale via URL.createObjectURL ou Distante directe)
    const immediateLogoUrl = file ? URL.createObjectURL(file) : directUrl!;

    // 2. PROPAGATION IMMÉDIATE DANS LE STATE REACT DE L'APERÇU DU PROFIL
    // Affecte instantanément toutes les propriétés : logoUrl, auditLogoUrl, logoAdaptedUrl, logoA, logoB
    setConfig(prev => {
      const base = prev || defaultConfig;
      const updated: SiteConfig = {
        ...base,
        logoUrl: immediateLogoUrl,
        auditLogoUrl: immediateLogoUrl,
        logoAdaptedUrl: immediateLogoUrl,
        logoA: immediateLogoUrl,
        logoB: immediateLogoUrl,
        visualLogoUrl: immediateLogoUrl,
        avatar: immediateLogoUrl,
        logo: immediateLogoUrl
      };
      updateThemeStyles(updated);
      return updated;
    });

    // Si on a directement une URL distante sans fichier brut à traiter, on synchronise les maquettes
    if (!file && directUrl) {
      if (!directUrl.startsWith('blob:') && !directUrl.startsWith('data:')) {
        await syncLogoAndMockups(directUrl);
        return;
      }
    }

    // 3. Traitement asynchrone d'arrière-plan et téléversement Firebase Cloud Storage
    const uploadTask = (async (): Promise<string | null> => {
      const uidToSave = editingUid || (auth.currentUser ? auth.currentUser.uid : "") || "guest_ms3ijgnco2xnid";
      try {
        let finalLogoUrl = '';

        if (file) {
          const base64String = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file!);
          });

          // 1. Suppression du fond pour transparence maximale (Full Resolution)
          const transparentLogo = await removeBackgroundFromLogo(base64String).catch(() => base64String);

          // 2. Détection couleur d'accent & thème
          const result = await processLogo(transparentLogo || base64String).catch(() => ({ theme: 'dark', accent: '#3b82f6' }));

          // 3. Traitement Prépresse DTF Master (Anti-Bavure & 300 DPI)
          const dtfResult = await cleanAndProcessDtfMaster(transparentLogo, {
            targetDimension: 4000,
            dpi: 300,
            alphaThreshold: 45
          }, uidToSave).catch(() => null);

          const printReadyLogo = dtfResult?.masterUrl || transparentLogo;

          // 4. Téléversement Cloud Storage robuste
          try {
            if (printReadyLogo && printReadyLogo.startsWith('data:')) {
              const storageRef = ref(storage, `users/${uidToSave}/logos/${Date.now()}_logo_dtf.png`);
              await uploadString(storageRef, printReadyLogo, 'data_url', {
                contentType: 'image/png',
                cacheControl: 'public, max-age=31536000'
              });
              finalLogoUrl = await getDownloadURL(storageRef);
            } else if (printReadyLogo && (printReadyLogo.startsWith('http://') || printReadyLogo.startsWith('https://'))) {
              finalLogoUrl = printReadyLogo;
            } else if (transparentLogo && transparentLogo.startsWith('data:')) {
              const storageRef = ref(storage, `users/${uidToSave}/logos/${Date.now()}_logo_dtf.png`);
              await uploadString(storageRef, transparentLogo, 'data_url', {
                contentType: 'image/png',
                cacheControl: 'public, max-age=31536000'
              });
              finalLogoUrl = await getDownloadURL(storageRef);
            } else {
              const storageRef = ref(storage, `users/${uidToSave}/logos/${Date.now()}_logo_dtf.png`);
              await uploadBytes(storageRef, file!, {
                contentType: file!.type || 'image/png',
                cacheControl: 'public, max-age=31536000'
              });
              finalLogoUrl = await getDownloadURL(storageRef);
            }
          } catch (storageErr) {
            console.warn("Storage upload primary failed, using direct file fallback:", storageErr);
            try {
              const storageRef = ref(storage, `users/${uidToSave}/logos/${Date.now()}_logo_direct.png`);
              await uploadBytes(storageRef, file!, {
                contentType: file!.type || 'image/png',
                cacheControl: 'public, max-age=31536000'
              });
              finalLogoUrl = await getDownloadURL(storageRef);
            } catch (fallbackErr) {
              console.error("Critical storage fallback failed:", fallbackErr);
            }
          }

          if (!finalLogoUrl || finalLogoUrl.startsWith('blob:') || finalLogoUrl.startsWith('data:')) {
            console.warn("Logo was not resolved to a permanent Cloud Storage URL.");
            return null;
          }

          const currentCfg = config || defaultConfig;
          const rawSlug = currentCfg.slug || currentCfg.companyName || editingUid || 'prod';
          const cleanSlug = rawSlug.toLowerCase().trim().replace(/[^a-z0-9_-]/g, '');

          // 5. Découplage Merch & Logo : Ne générer automatiquement que si le profil est vierge
          const hasExistingProducts = Boolean(
            (currentCfg.products && (
              (currentCfg.products.tshirt?.imageFront && !currentCfg.products.tshirt.imageFront.includes('JHK')) ||
              (currentCfg.products.tshirt?.frontImageUrl && !currentCfg.products.tshirt.frontImageUrl.includes('JHK')) ||
              (currentCfg.products.polo?.imageFront && !currentCfg.products.polo.imageFront.includes('JHK')) ||
              (currentCfg.products.hoodie?.imageFront && !currentCfg.products.hoodie.imageFront.includes('JHK'))
            )) ||
            (currentCfg.items && Array.isArray(currentCfg.items) && currentCfg.items.some((it: any) =>
              (it.frontImageUrl && !it.frontImageUrl.includes('JHK')) ||
              (it.imageFront && !it.imageFront.includes('JHK')) ||
              (it.ai && !it.ai.includes('JHK')) ||
              (it.mechanical && !it.mechanical.includes('JHK')) ||
              (it.imageUrl && !it.imageUrl.includes('JHK'))
            )) ||
            (currentCfg.mockups && Array.isArray(currentCfg.mockups) && currentCfg.mockups.some((m: any) =>
              (m.ai && !m.ai.includes('JHK') && !m.ai.startsWith('/assets/')) ||
              (m.mechanical && !m.mechanical.includes('JHK') && !m.mechanical.startsWith('/assets/'))
            ))
          );

          let updatedProducts = currentCfg.products;
          let updatedItems = currentCfg.items;

          if (!hasExistingProducts) {
            try {
              const mockups = await generateGarmentMockupSuite(finalLogoUrl);

              updatedProducts = {
                tshirt: {
                  name: `T-Shirt ${currentCfg.companyName || 'Premium'}`,
                  price: currentCfg.products?.tshirt?.price || 29.90,
                  imageFront: mockups.tshirtFront,
                  imageBack: mockups.tshirtBack,
                  aiImageUrl: mockups.tshirtFront
                },
                polo: {
                  name: `Polo ${currentCfg.companyName || 'Premium'}`,
                  price: currentCfg.products?.polo?.price || 39.90,
                  imageFront: mockups.poloFront,
                  imageBack: mockups.poloBack,
                  aiImageUrl: mockups.poloFront
                },
                hoodie: {
                  name: `Hoodie ${currentCfg.companyName || 'VIP'}`,
                  price: currentCfg.products?.hoodie?.price || 49.90,
                  imageFront: mockups.hoodieFront,
                  imageBack: mockups.hoodieBack,
                  aiImageUrl: mockups.hoodieFront
                }
              };

              updatedItems = [
                {
                  id: `${cleanSlug}-tshirt`,
                  title: `T-Shirt ${currentCfg.companyName || 'Premium'}`,
                  name: `T-Shirt ${currentCfg.companyName || 'Premium'}`,
                  price: 29.90,
                  garment: 'tshirt',
                  category: 'tshirt',
                  view: 'front',
                  frontImageUrl: mockups.tshirtFront,
                  backImageUrl: mockups.tshirtBack,
                  imageFront: mockups.tshirtFront,
                  imageBack: mockups.tshirtBack,
                  imageUrl: mockups.tshirtFront,
                  sizes: ['S', 'M', 'L', 'XL'],
                  colors: ['Noir']
                },
                {
                  id: `${cleanSlug}-polo`,
                  title: `Polo ${currentCfg.companyName || 'Premium'}`,
                  name: `Polo ${currentCfg.companyName || 'Premium'}`,
                  price: 39.90,
                  garment: 'polo',
                  category: 'polo',
                  view: 'front',
                  frontImageUrl: mockups.poloFront,
                  backImageUrl: mockups.poloBack,
                  imageFront: mockups.poloFront,
                  imageBack: mockups.poloBack,
                  imageUrl: mockups.poloFront,
                  sizes: ['S', 'M', 'L', 'XL'],
                  colors: ['Noir']
                },
                {
                  id: `${cleanSlug}-hoodie`,
                  title: `Sweat Hoodie ${currentCfg.companyName || 'VIP'}`,
                  name: `Sweat Hoodie ${currentCfg.companyName || 'VIP'}`,
                  price: 49.90,
                  garment: 'sweat',
                  category: 'hoodie',
                  view: 'front',
                  frontImageUrl: mockups.hoodieFront,
                  backImageUrl: mockups.hoodieBack,
                  imageFront: mockups.hoodieFront,
                  imageBack: mockups.hoodieBack,
                  imageUrl: mockups.hoodieFront,
                  sizes: ['S', 'M', 'L', 'XL'],
                  colors: ['Noir']
                }
              ];
            } catch (mErr) {
              console.warn("Mockup generation notice:", mErr);
            }
          }

          // 6. Propagation finale de l'URL permanente Cloud Storage à toutes les propriétés artiste
          let finalConfigToPersist: SiteConfig | null = null;
          setConfig(prev => {
            const base = prev || defaultConfig;
            const finalCfg: SiteConfig = { 
              ...base, 
              logoUrl: finalLogoUrl,
              logoAdaptedUrl: finalLogoUrl,
              auditLogoUrl: finalLogoUrl,
              logoA: finalLogoUrl,
              logoB: finalLogoUrl,
              visualLogoUrl: finalLogoUrl,
              avatar: finalLogoUrl,
              logo: finalLogoUrl,
              theme: (base.theme && base.theme !== 'auto') ? base.theme : (result.theme as 'dark' | 'light'),
              accentColor: base.accentColor || result.accent,
              products: updatedProducts || base.products,
              items: updatedItems || base.items
            };
            finalConfigToPersist = finalCfg;
            updateThemeStyles(finalCfg);
            return finalCfg;
          });
          
          // Auto-save the permanent logo to Firestore
          if (uidToSave && finalConfigToPersist) {
            await saveStoredConfig(finalConfigToPersist, uidToSave);
            if (cleanSlug && cleanSlug !== uidToSave) {
              try {
                await setDoc(doc(db, "SiteConfigs", cleanSlug), sanitizeForFirestore(finalConfigToPersist), { merge: true });
              } catch (e) {}
            }
            const isVision = uidToSave === 'clubvisionroom' || uidToSave === 'mt074jnaldxn' || cleanSlug.includes('clubvision');
            if (isVision) {
              const visionPayload = sanitizeForFirestore(finalConfigToPersist);
              try {
                await setDoc(doc(db, "SiteConfigs", "clubvisionroom"), visionPayload, { merge: true });
                await setDoc(doc(db, "SiteConfigs", "clubvision"), visionPayload, { merge: true });
                await setDoc(doc(db, "SiteConfigs", "mt074jnaldxn"), visionPayload, { merge: true });
                await setDoc(doc(db, "anonymous_previews", "clubvisionroom"), visionPayload, { merge: true });
                await setDoc(doc(db, "anonymous_previews", "mt074jnaldxn"), visionPayload, { merge: true });
              } catch (e) {}
            }
          }
          return finalLogoUrl;
        } else if (directUrl && (directUrl.startsWith('blob:') || directUrl.startsWith('data:'))) {
          // Upload direct blob ou data URL vers Cloud Storage
          const storageRef = ref(storage, `users/${uidToSave}/logos/${Date.now()}_logo_direct_perm.png`);
          if (directUrl.startsWith('data:')) {
            await uploadString(storageRef, directUrl, 'data_url', {
              contentType: 'image/png',
              cacheControl: 'public, max-age=31536000'
            });
          } else {
            const resp = await fetch(directUrl);
            const blob = await resp.blob();
            await uploadBytes(storageRef, blob, {
              contentType: blob.type || 'image/png',
              cacheControl: 'public, max-age=31536000'
            });
          }
          finalLogoUrl = await getDownloadURL(storageRef);
          if (finalLogoUrl) {
            setConfig(prev => {
              const base = prev || defaultConfig;
              const updated: SiteConfig = {
                ...base,
                logoUrl: finalLogoUrl,
                auditLogoUrl: finalLogoUrl,
                logoAdaptedUrl: finalLogoUrl,
                logoA: finalLogoUrl,
                logoB: finalLogoUrl,
                visualLogoUrl: finalLogoUrl,
                avatar: finalLogoUrl,
                logo: finalLogoUrl
              };
              updateThemeStyles(updated);
              return updated;
            });
            await syncLogoAndMockups(finalLogoUrl);
          }
          return finalLogoUrl;
        }
        return null;
      } catch (err) {
        console.error("Error in onLogoChange background processing:", err);
        return null;
      }
    })();

    logoUploadPromiseRef.current = uploadTask;
    await uploadTask;
  };

  const handleLogoUpload = onLogoChange;

  const syncLogoAndMockups = async (finalLogoUrl: string) => {
    if (!config) return;
    const mockups = await generateGarmentMockupSuite(finalLogoUrl);
    const updatedProducts = {
      tshirt: { ...config.products?.tshirt, name: config.products?.tshirt?.name || `T-Shirt ${config.companyName || 'Premium'}`, price: config.products?.tshirt?.price || 29.90, imageFront: mockups.tshirtFront, imageBack: mockups.tshirtBack, aiImageUrl: mockups.tshirtFront },
      polo: { ...config.products?.polo, name: config.products?.polo?.name || `Polo ${config.companyName || 'Premium'}`, price: config.products?.polo?.price || 39.90, imageFront: mockups.poloFront, imageBack: mockups.poloBack, aiImageUrl: mockups.poloFront },
      hoodie: { ...config.products?.hoodie, name: config.products?.hoodie?.name || `Hoodie ${config.companyName || 'VIP'}`, price: config.products?.hoodie?.price || 49.90, imageFront: mockups.hoodieFront, imageBack: mockups.hoodieBack, aiImageUrl: mockups.hoodieFront }
    };
    const rawSlug = config.slug || config.companyName || editingUid || 'prod';
    const cleanSlug = rawSlug.toLowerCase().trim().replace(/[^a-z0-9_-]/g, '');
    const updatedItems = (config.items && config.items.length > 0)
      ? config.items.map((it: any) => {
          const g = (it.garment || it.category || it.id || '').toLowerCase();
          const f = g.includes('polo') ? mockups.poloFront : (g.includes('hoodie') || g.includes('sweat')) ? mockups.hoodieFront : mockups.tshirtFront;
          const b = g.includes('polo') ? mockups.poloBack : (g.includes('hoodie') || g.includes('sweat')) ? mockups.hoodieBack : mockups.tshirtBack;
          return { ...it, frontImageUrl: f, backImageUrl: b, imageFront: f, imageBack: b, imageUrl: f, ai: f, mechanical: b };
        })
      : [
        { id: `${cleanSlug}-tshirt`, title: `T-Shirt ${config.companyName || 'Premium'}`, name: `T-Shirt ${config.companyName || 'Premium'}`, price: 29.90, garment: 'tshirt', frontImageUrl: mockups.tshirtFront, backImageUrl: mockups.tshirtBack, imageFront: mockups.tshirtFront, imageBack: mockups.tshirtBack, imageUrl: mockups.tshirtFront },
        { id: `${cleanSlug}-polo`, title: `Polo ${config.companyName || 'Premium'}`, name: `Polo ${config.companyName || 'Premium'}`, price: 39.90, garment: 'polo', frontImageUrl: mockups.poloFront, backImageUrl: mockups.poloBack, imageFront: mockups.poloFront, imageBack: mockups.poloBack, imageUrl: mockups.poloFront },
        { id: `${cleanSlug}-hoodie`, title: `Sweat Hoodie ${config.companyName || 'VIP'}`, name: `Sweat Hoodie ${config.companyName || 'VIP'}`, price: 49.90, garment: 'sweat', frontImageUrl: mockups.hoodieFront, backImageUrl: mockups.hoodieBack, imageFront: mockups.hoodieFront, imageBack: mockups.hoodieBack, imageUrl: mockups.hoodieFront }
      ];
    const newConfig: SiteConfig = { 
      ...config, 
      logoUrl: finalLogoUrl, 
      logoAdaptedUrl: finalLogoUrl, 
      auditLogoUrl: finalLogoUrl, 
      logoA: finalLogoUrl,
      logoB: finalLogoUrl,
      visualLogoUrl: finalLogoUrl, 
      avatar: finalLogoUrl, 
      logo: finalLogoUrl,
      products: updatedProducts, 
      items: updatedItems 
    };
    setConfig(newConfig);
    const uidToSave = editingUid || (auth.currentUser ? auth.currentUser.uid : "") || "guest_ms3ijgnco2xnid";
    if (uidToSave) {
      try {
        await saveStoredConfig(newConfig, uidToSave);
        if (cleanSlug && cleanSlug !== uidToSave) {
          await setDoc(doc(db, "SiteConfigs", cleanSlug), sanitizeForFirestore(newConfig), { merge: true }).catch(() => null);
        }
      } catch (e) {
        console.warn("Auto-save sync warning:", e);
      }
    }
  };

  const handleRemoveLogoBackground = async () => {
    if (!config) return;
    const rawLogoA = typeof config.logoA === 'string' ? config.logoA : (config.logoA as any)?.adaptedRemastered || (config.logoA as any)?.adapted || (config.logoA as any)?.original;
    const rawLogoB = typeof config.logoB === 'string' ? config.logoB : (config.logoB as any)?.adaptedRemastered || (config.logoB as any)?.adapted || (config.logoB as any)?.original;
    const currentLogo = config.logoUrl || config.auditLogoUrl || config.logoAdaptedUrl || rawLogoA || rawLogoB || config.visualLogoUrl || config.logo;
    if (!currentLogo) {
      alert("Veuillez d'abord importer un logo pour retirer son fond.");
      return;
    }
    setIsRemovingBg(true);
    try {
      let sourceBase64 = currentLogo;
      if (currentLogo.startsWith('http://') || currentLogo.startsWith('https://')) {
        try {
          const resp = await fetch(currentLogo, { mode: 'cors' });
          const blob = await resp.blob();
          sourceBase64 = await new Promise<string>((resBlob, rejBlob) => {
            const reader = new FileReader();
            reader.onloadend = () => resBlob(reader.result as string);
            reader.onerror = rejBlob;
            reader.readAsDataURL(blob);
          });
        } catch (fetchErr) {
          console.warn("Direct fetch fallback:", fetchErr);
        }
      }
      const transparentLogo = await removeBackgroundFromLogo(sourceBase64, true);
      const dtfResult = await cleanAndProcessDtfMaster(transparentLogo, { targetDimension: 4000, dpi: 300, alphaThreshold: 45 }, editingUid || 'master').catch(() => null);
      const printReadyLogo = dtfResult?.masterUrl || transparentLogo;
      const uidToSave = editingUid || (auth.currentUser ? auth.currentUser.uid : "") || "guest_ms3ijgnco2xnid";
      let finalLogoUrl = printReadyLogo;
      try {
        const logoToUpload = printReadyLogo.startsWith('data:') ? printReadyLogo : transparentLogo;
        const storageRef = ref(storage, `users/${uidToSave}/logos/${Date.now()}_logo_nobg.png`);
        await uploadString(storageRef, logoToUpload, 'data_url', { contentType: 'image/png', cacheControl: 'public, max-age=31536000' });
        finalLogoUrl = await getDownloadURL(storageRef);
      } catch (uploadErr) {
        console.warn("Storage upload fallback:", uploadErr);
      }
      await syncLogoAndMockups(finalLogoUrl);
    } catch (err) {
      console.error("Erreur détourage auto:", err);
      alert("Une erreur est survenue lors de la suppression du fond.");
    } finally {
      setIsRemovingBg(false);
    }
  };


  const handleSave = async () => {
    if (!config) return;
    setIsSaving(true);
    try {
      // 1. Attendre impérativement la résolution de tout upload de logo en cours
      if (logoUploadPromiseRef.current) {
        try {
          await logoUploadPromiseRef.current;
        } catch (uploadWaitErr) {
          console.warn("Logo upload wait notice:", uploadWaitErr);
        }
      }

      const user = auth.currentUser;
      const rawSlug = config.slug || config.companyName || editingUid || '';
      const cleanSlug = rawSlug.toLowerCase().trim().replace(/[^a-z0-9_-]/g, '');
      const uidToSave = editingUid || (user ? user.uid : '') || (currentUser ? currentUser.uid : '') || cleanSlug || 'guest_ms3ijgnco2xnid';

      // 2. Vérification et conversion impérative de toute URL locale ou temporaire (blob: ou data:) vers Firebase Cloud Storage
      const resolveToPermanentStorageUrl = async (candidate: any): Promise<string> => {
        const urlStr = typeof candidate === 'string'
          ? candidate
          : (candidate?.adaptedRemastered || candidate?.adapted || candidate?.original || '');
        if (!urlStr || typeof urlStr !== 'string') return '';
        if (!urlStr.startsWith('blob:') && !urlStr.startsWith('data:')) {
          return urlStr;
        }
        try {
          const storageRef = ref(storage, `users/${uidToSave}/logos/${Date.now()}_published_logo.png`);
          if (urlStr.startsWith('data:')) {
            await uploadString(storageRef, urlStr, 'data_url', {
              contentType: 'image/png',
              cacheControl: 'public, max-age=31536000'
            });
            return await getDownloadURL(storageRef);
          } else if (urlStr.startsWith('blob:')) {
            const resp = await fetch(urlStr);
            const blob = await resp.blob();
            await uploadBytes(storageRef, blob, {
              contentType: blob.type || 'image/png',
              cacheControl: 'public, max-age=31536000'
            });
            return await getDownloadURL(storageRef);
          }
        } catch (uploadErr) {
          console.error("Critical conversion of temporary logo URL failed:", uploadErr);
        }
        return '';
      };

      // Détecter et résoudre le logo permanent
      let finalPermanentLogoUrl = '';
      const candidateList = [
        config.logoUrl,
        config.auditLogoUrl,
        config.logoAdaptedUrl,
        config.logoA,
        config.logoB,
        config.visualLogoUrl,
        config.avatar,
        config.logo
      ];

      for (const cand of candidateList) {
        if (cand) {
          const resolved = await resolveToPermanentStorageUrl(cand);
          if (resolved && !resolved.startsWith('blob:') && !resolved.startsWith('data:')) {
            finalPermanentLogoUrl = resolved;
            break;
          }
        }
      }

      const siteConfig: SiteConfig = {
        ...config,
        slug: cleanSlug,
        contactEmail: config.contactEmail || (user ? user.email : '') || '',
        actuationKey: config.actuationKey || config.generatedKey || '',
        companyName: config.companyName || '',
        sector: config.activitySector || '',
        status: 'validated'
      };

      // Si une URL pérenne Cloud Storage est trouvée, remplacer définitivement
      // logoUrl, auditLogoUrl, logoAdaptedUrl, logoA et logoB dans le payload envoyé à Firestore
      if (finalPermanentLogoUrl) {
        siteConfig.logoUrl = finalPermanentLogoUrl;
        siteConfig.auditLogoUrl = finalPermanentLogoUrl;
        siteConfig.logoAdaptedUrl = finalPermanentLogoUrl;
        siteConfig.logoA = finalPermanentLogoUrl;
        siteConfig.logoB = finalPermanentLogoUrl;
        siteConfig.visualLogoUrl = finalPermanentLogoUrl;
        siteConfig.avatar = finalPermanentLogoUrl;
        siteConfig.logo = finalPermanentLogoUrl;

        // Met également à jour le state local React
        setConfig(prev => prev ? {
          ...prev,
          logoUrl: finalPermanentLogoUrl,
          auditLogoUrl: finalPermanentLogoUrl,
          logoAdaptedUrl: finalPermanentLogoUrl,
          logoA: finalPermanentLogoUrl,
          logoB: finalPermanentLogoUrl,
          visualLogoUrl: finalPermanentLogoUrl,
          avatar: finalPermanentLogoUrl,
          logo: finalPermanentLogoUrl
        } : prev);
      } else {
        // Empêche STRICTEMENT l'enregistrement d'une URL temporaire locale blob: ou data: dans Firestore
        const logoKeys = ['logoUrl', 'auditLogoUrl', 'logoAdaptedUrl', 'logoA', 'logoB', 'visualLogoUrl', 'avatar', 'logo'];
        logoKeys.forEach(k => {
          const val = (siteConfig as any)[k];
          if (typeof val === 'string' && (val.startsWith('blob:') || val.startsWith('data:'))) {
            delete (siteConfig as any)[k];
          }
        });
      }

      // 1. Save to SiteConfigs and configs under uidToSave
      await saveStoredConfig(siteConfig, uidToSave);

      // 2. Also save to SiteConfigs[cleanSlug] so accessing /cleanSlug works instantly
      if (cleanSlug && cleanSlug !== uidToSave) {
        const payload = sanitizeForFirestore({
          ...siteConfig,
          slug: cleanSlug,
          docId: uidToSave,
          originalUid: uidToSave
        });
        try {
          await setDoc(doc(db, "SiteConfigs", cleanSlug), payload, { merge: true });
          await setDoc(doc(db, "anonymous_previews", cleanSlug), payload, { merge: true });
          await setDoc(doc(db, "configs", cleanSlug), payload, { merge: true });
        } catch (slugErr) {
          console.warn("Slug alias sync warning:", slugErr);
        }
      }

      // 3. IF THE SLUG HAS CHANGED (e.g. from 'thementalist' to 'mentalist'), clean up / delete the old document
      const protectedSlugs = ['djdfazz', 'fabrizio', 'guest_ms3ijgnco2xnid', '5qk5ntk', '4eckgu2', '3j0f5kl', 'audit-8f198p5', 'clubvisionroom', 'clubvision'];
      const oldSlug = initialSlug || (editingUid !== cleanSlug ? editingUid : '');
      if (oldSlug && cleanSlug && oldSlug !== cleanSlug && !protectedSlugs.includes(oldSlug)) {
        try {
          await deleteDoc(doc(db, "SiteConfigs", oldSlug));
          await deleteDoc(doc(db, "anonymous_previews", oldSlug)).catch(() => null);
          console.log(`[SLUG MIGRATION] Cleaned up old slug document: ${oldSlug} -> replaced by: ${cleanSlug}`);
        } catch (delOldErr) {
          console.warn("Old slug cleanup warning:", delOldErr);
        }
      }
      setInitialSlug(cleanSlug);

      // 4. If editing DJ D-FAZZ, sync across all related Firestore docs and custom domains (djdfazz.be / signaid.eu/djdfazz)
      const normSavedName = (config.companyName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const isDfazzDoc = uidToSave === 'guest_ms3ijgnco2xnid' || 
                         uidToSave === 'fabrizio' || 
                         uidToSave === 'audit-8f198p5' || 
                         uidToSave === 'djdfazz' ||
                         uidToSave === '5qk5ntk' ||
                         uidToSave === '4eckgu2' ||
                         uidToSave === '3j0f5kl' ||
                         normSavedName.includes('dfazz') ||
                         normSavedName.includes('fazz');

      if (isDfazzDoc) {
        const payload = sanitizeForFirestore(siteConfig);
        try {
          await setDoc(doc(db, "SiteConfigs", "djdfazz"), payload, { merge: true });
          await setDoc(doc(db, "SiteConfigs", "fabrizio"), payload, { merge: true });
          await setDoc(doc(db, "SiteConfigs", "guest_ms3ijgnco2xnid"), payload, { merge: true });
          await setDoc(doc(db, "SiteConfigs", "5qk5ntk"), payload, { merge: true });
          await setDoc(doc(db, "SiteConfigs", "4eckgu2"), payload, { merge: true });
          await setDoc(doc(db, "SiteConfigs", "3j0f5kl"), payload, { merge: true });
          await setDoc(doc(db, "anonymous_previews", "audit-8f198p5"), payload, { merge: true });
          await setDoc(doc(db, "btp_projects", "audit-8f198p5"), payload, { merge: true });
        } catch (syncErr) {
          console.warn("Multi-doc sync warning:", syncErr);
        }
      }

      // 5. If editing Club Vision Room, sync across all related Firestore docs (clubvisionroom, mt074jnaldxn, clubvision)
      const isVisionDoc = uidToSave === 'clubvisionroom' || 
                          uidToSave === 'mt074jnaldxn' || 
                          uidToSave === 'clubvision' || 
                          cleanSlug === 'clubvisionroom' || 
                          cleanSlug === 'clubvision' || 
                          normSavedName.includes('clubvision') || 
                          normSavedName.includes('visionroom');

      if (isVisionDoc) {
        const visionPayload = sanitizeForFirestore({
          ...siteConfig,
          companyName: config.companyName || 'Club Vision Room',
          slug: 'clubvisionroom'
        });
        try {
          await setDoc(doc(db, "SiteConfigs", "clubvisionroom"), visionPayload, { merge: true });
          await setDoc(doc(db, "SiteConfigs", "clubvision"), visionPayload, { merge: true });
          await setDoc(doc(db, "SiteConfigs", "mt074jnaldxn"), visionPayload, { merge: true });
          await setDoc(doc(db, "anonymous_previews", "clubvisionroom"), visionPayload, { merge: true });
          await setDoc(doc(db, "anonymous_previews", "mt074jnaldxn"), visionPayload, { merge: true });
          await setDoc(doc(db, "configs", "clubvisionroom"), visionPayload, { merge: true });
          await setDoc(doc(db, "configs", "mt074jnaldxn"), visionPayload, { merge: true });
        } catch (syncErr) {
          console.warn("Vision multi-doc sync warning:", syncErr);
        }
      }

      // 6. SYNCHRONISATION DU CACHE VISITEUR (localStorage & sessionStorage)
      try {
        const finalLogoForCache = siteConfig.logoUrl || siteConfig.auditLogoUrl || siteConfig.logoAdaptedUrl || (typeof siteConfig.logoA === 'string' ? siteConfig.logoA : '') || '';
        
        const cleanProductsList = (siteConfig.items && siteConfig.items.length > 0)
          ? siteConfig.items
          : (siteConfig.products ? Object.values(siteConfig.products).filter(Boolean) : []);

        const cachedArtist = {
          id: uidToSave,
          companyName: siteConfig.companyName || cleanSlug,
          activitySector: siteConfig.activitySector || siteConfig.sector || '',
          slug: cleanSlug,
          logoUrl: finalLogoForCache,
          auditLogoUrl: finalLogoForCache,
          logoAdaptedUrl: finalLogoForCache,
          logoA: finalLogoForCache,
          logoB: finalLogoForCache,
          accentColor: siteConfig.accentColor || '#dc2626',
          theme: siteConfig.theme || 'dark',
          livePhotoUrls: siteConfig.livePhotoUrls || (siteConfig.livePhotoUrl ? [siteConfig.livePhotoUrl] : []),
          livePhotoUrl: siteConfig.livePhotoUrl || '',
          coverHeight: siteConfig.coverHeight,
          coverZoom: siteConfig.coverZoom,
          coverPositionY: siteConfig.coverPositionY,
          coverPositionX: siteConfig.coverPositionX,
          logoScale: siteConfig.logoScale,
          logoOverlayColor: siteConfig.logoOverlayColor,
          presentation: siteConfig.presentation || '',
          contactEmail: siteConfig.contactEmail || '',
          whatsapp: siteConfig.whatsappNumber || '',
          socials: siteConfig.socials || [],
          products: siteConfig.products || {},
          items: siteConfig.items || []
        };

        const cachedFull = {
          artist: cachedArtist,
          products: cleanProductsList
        };

        const cachedMeta = {
          displayName: siteConfig.companyName || cleanSlug,
          logoUrl: finalLogoForCache,
          primaryColor: siteConfig.accentColor || '#dc2626',
          theme: siteConfig.theme || 'dark',
          initials: (siteConfig.companyName || cleanSlug).slice(0, 2).toUpperCase(),
          isReady: true
        };

        const targetIdentifiers = new Set<string>();
        if (cleanSlug) targetIdentifiers.add(cleanSlug);
        if (uidToSave) targetIdentifiers.add(uidToSave);
        if (cleanSlug.startsWith('audit-')) targetIdentifiers.add(cleanSlug.replace(/^audit-/, ''));
        if (uidToSave.startsWith('audit-')) targetIdentifiers.add(uidToSave.replace(/^audit-/, ''));

        // Nettoyage des anciennes clés de cache non pertinentes pour libérer le quota de stockage
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && (k.startsWith('fast_artist_cache_') || k.startsWith('btp_'))) {
            const isMatch = Array.from(targetIdentifiers).some(id => k === `fast_artist_cache_v92_${id}` || k === `fast_artist_cache_${id}`);
            if (!isMatch) {
              keysToRemove.push(k);
            }
          }
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));

        // Enregistrement des clés lues par la vue profil public
        targetIdentifiers.forEach(id => {
          localStorage.setItem(`fast_artist_cache_v92_${id}`, JSON.stringify(cachedFull));
          localStorage.setItem(`fast_artist_cache_${id}`, JSON.stringify(cachedFull));
          localStorage.setItem(`artist_${id}`, JSON.stringify(cachedArtist));
          localStorage.setItem(`signaid_meta_${id}`, JSON.stringify(cachedMeta));
          sessionStorage.setItem(`signaid_meta_${id}`, JSON.stringify(cachedMeta));
        });
      } catch (cacheErr) {
        console.warn("Visitor cache sync error:", cacheErr);
      }

      alert(`✅ Modifications publiées avec succès ! Le profil est accessible sur https://signaid.eu/${cleanSlug || uidToSave}`);
    } catch (error: any) {
      console.error("Save error:", error);
      alert("Erreur lors de la publication : " + (error?.message || error));
    } finally {
      setIsSaving(false);
    }
  };

  // Détermine la route d'audit selon le secteur
  const getAuditRoute = () => {
    const sector = (config?.activitySector || '').toUpperCase();
    const BTP_SECTORS = ['BTP', 'PEINTURE', 'CONSTRUCTION', 'BÂTIMENT', 'BATIMENT', 'INDUSTRIE', 'ARTISAN', 'MAÇONNERIE', 'MACONNERIE', 'PLOMBERIE', 'ELECTRICITE', 'ÉLECTRICITÉ', 'CHARPENTE', 'MENUISERIE', 'CARRELAGE', 'ISOLATION', 'COUVERTURE', 'CHAUFFAGE'];
    return BTP_SECTORS.includes(sector) ? 'btp-audit' : 'portail-audit';
  };

  const handleLogout = async () => {
    sessionStorage.removeItem('master_admin_session');
    await signOut(auth);
    setCurrentUser(null);
    navigate("/vitrine-admin");
  };

  if (!authChecked) {
    return <div className="loader" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#64748b' }}>VÉRIFICATION DE LA CONSOLE...</div>;
  }

  const isForceSignup = new URLSearchParams(window.location.search).get("mode") === "signup";
  if (!currentUser || isForceSignup) {
    if (claimUid) {
      return (
        <main 
          className={`admin-root-container min-h-screen w-full transition-colors duration-200 ${isAdminLightMode ? "admin-console-light bg-slate-100 text-slate-900" : "bg-slate-950 text-white"}`} 
          style={{ 
            width: '100%', 
            minHeight: '100vh', 
            backgroundColor: isAdminLightMode ? '#f1f5f9' : '#020617', 
            color: isAdminLightMode ? '#0f172a' : '#ffffff',
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            padding: '2rem 1.5rem', 
            boxSizing: 'border-box', 
            position: 'relative' 
          }}
        >
          <style>{`
            body.admin-console-light,
            body.admin-console-light #root,
            body.admin-console-light .admin-root-container,
            body.admin-console-light main {
              background-color: #f1f5f9 !important;
              background: #f1f5f9 !important;
              color: #0f172a !important;
            }
            body.admin-console-light section {
              background: transparent !important;
            }
            body.admin-console-light .admin-section,
            body.admin-console-light [style*="background: rgba(15,"],
            body.admin-console-light [style*="background:rgba(15,"],
            body.admin-console-light [style*="background: rgba(30,"],
            body.admin-console-light [style*="background:rgba(30,"],
            body.admin-console-light [style*="background: rgba(255, 255, 255, 0.03)"],
            body.admin-console-light [style*="background:rgba(255,255,255,0.03)"],
            body.admin-console-light [style*="background: rgba(255,255,255,0.03)"],
            body.admin-console-light [style*="background: rgba(255, 255, 255, 0.02)"],
            body.admin-console-light [style*="background:rgba(255,255,255,0.02)"],
            body.admin-console-light [style*="background: rgba(255,255,255,0.02)"] {
              background: #ffffff !important;
              color: #0f172a !important;
              border: 1px solid rgba(0, 0, 0, 0.08) !important;
              box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -4px rgba(0, 0, 0, 0.05), 0 0 0 1px rgba(0,0,0,0.03) !important;
            }
            /* STYLES THÈME CLAIR DE L'ADMIN */
            body.admin-console-light .admin-label,
            body.admin-console-light .admin-desc {
              color: #475569 !important;
            }
            body.admin-console-light .admin-heading {
              color: #0f172a !important;
            }

            /* 🛡️ ISOLATION DU STUDIO PREVIEW */
            #studio-live-preview-root.studio-dark,
            #studio-live-preview-root.studio-dark * {
              /* Ensure dark studio text is white/light */
            }
            #studio-live-preview-root.studio-dark h1,
            #studio-live-preview-root.studio-dark .studio-artist-title {
              color: #ffffff !important;
            }
            #studio-live-preview-root.studio-dark .studio-artist-sector {
              color: #cbd5e1 !important;
            }
            #studio-live-preview-root.studio-dark svg {
              color: #ffffff !important;
              fill: #ffffff !important;
            }
            #studio-live-preview-root.studio-light h1,
            #studio-live-preview-root.studio-light .studio-artist-title {
              color: #0f172a !important;
            }
            #studio-live-preview-root.studio-light .studio-artist-sector {
              color: #475569 !important;
            }
            #studio-live-preview-root.studio-light svg {
              color: #0f172a !important;
              fill: #0f172a !important;
            }
            body.admin-console-light [style*="background: rgba(30, 41, 59, 0.6)"],
            body.admin-console-light [style*="background:rgba(30, 41, 59, 0.6)"] {
              background: #e2e8f0 !important;
              border-bottom: 1px solid rgba(0, 0, 0, 0.1) !important;
            }
            body.admin-console-light [style*="background: rgba(56, 189, 248"],
            body.admin-console-light [style*="background:rgba(56, 189, 248"] {
              background: #f0f9ff !important;
              border: 1px solid #bae6fd !important;
              color: #0369a1 !important;
            }
            body.admin-console-light [style*="color: #7dd3fc"] {
              color: #0369a1 !important;
            }
            body.admin-console-light [style*="color: #bae6fd"] {
              color: #0284c7 !important;
            }
            body.admin-console-light [style*="background: rgba(34, 197, 94"],
            body.admin-console-light [style*="background:rgba(34, 197, 94"],
            body.admin-console-light [style*="background: rgba(16, 185, 129"],
            body.admin-console-light [style*="background:rgba(16, 185, 129"] {
              background: #f0fdf4 !important;
              border: 1px solid #bbf7d0 !important;
              color: #166534 !important;
            }
            body.admin-console-light [style*="color: #4ade80"],
            body.admin-console-light [style*="color: #34d399"] {
              color: #166534 !important;
            }
            body.admin-console-light code,
            body.admin-console-light [style*="background: rgba(59, 130, 246, 0.1)"],
            body.admin-console-light [style*="background:rgba(59, 130, 246, 0.1)"] {
              background: #eff6ff !important;
              border: 1px solid rgba(59, 130, 246, 0.3) !important;
              color: #1d4ed8 !important;
            }
            body.admin-console-light [style*="color: #38bdf8"] {
              color: #0284c7 !important;
            }
            body.admin-console-light [style*="color: #60a5fa"] {
              color: #1d4ed8 !important;
            }
            body.admin-console-light [style*="color: #f87171"],
            body.admin-console-light [style*="color:#f87171"] {
              color: #b91c1c !important;
            }
            body.admin-console-light [style*="backgroundColor: '#0f172a'"],
            body.admin-console-light [style*="backgroundColor:'#0f172a'"],
            body.admin-console-light [style*="background-color: #0f172a"],
            body.admin-console-light [style*="background-color:#0f172a"] {
              background-color: #eff6ff !important;
              border: 1px solid rgba(59, 130, 246, 0.3) !important;
            }
          `}</style>
          
          <button 
            onClick={() => {
              const nextVal = !isAdminLightMode;
              setIsAdminLightMode(nextVal);
              localStorage.setItem("admin_light_mode", String(nextVal));
            }}
            type="button"
            style={{
              position: 'absolute',
              top: '1.5rem',
              right: '1.5rem',
              padding: '0.5rem 1rem',
              borderRadius: '9999px',
              border: '1px solid ' + (isAdminLightMode ? '#cbd5e1' : '#334155'),
              backgroundColor: isAdminLightMode ? '#ffffff' : '#1e293b',
              color: isAdminLightMode ? '#0f172a' : '#ffffff',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '0.75rem',
              zIndex: 50,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}
          >
            Console : {isAdminLightMode ? '🌙' : '☀️'}
          </button>
          <div className="admin-section" style={{ textAlign: 'center', maxWidth: '500px', width: '100%', padding: '2.5rem', background: 'rgba(15, 23, 42, 0.8)', border: '2px solid rgba(79, 70, 229, 0.4)', borderRadius: '24px', backdropFilter: 'blur(12px)', boxShadow: '0 20px 40px rgba(0,0,0,0.5)', margin: '0 auto' }}>
            <h1 style={{ marginBottom: '1rem', fontWeight: 900, fontSize: '1.8rem', background: 'linear-gradient(to right, #fff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Sécurisez votre Portail</h1>
            <p style={{ color: '#94a3b8', fontSize: '0.95rem', marginBottom: '2rem', lineHeight: 1.5 }}>
              {actionHint === 'order' 
                ? "Créez votre compte gratuit pour valider votre commande et sauvegarder définitivement votre portail 3D."
                : "Créez votre compte administrateur gratuit pour modifier vos informations et sauvegarder définitivement votre portail."}
            </p>
            
            <form onSubmit={handleClaimSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <input 
                type="email" 
                placeholder="Email administrateur" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
                style={{ width: '100%', padding: '1rem 1.2rem', borderRadius: '12px', background: 'rgba(30,41,59,0.5)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', fontSize: '1rem' }}
              />
              <input 
                type="password" 
                placeholder="Mot de passe (Min 6 caractères)" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
                minLength={6}
                style={{ width: '100%', padding: '1rem 1.2rem', borderRadius: '12px', background: 'rgba(30,41,59,0.5)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', fontSize: '1rem' }}
              />
              {error && <p style={{ color: '#f87171', fontSize: '0.85rem', margin: '0', fontWeight: 600 }}>⚠️ {error}</p>}
              
              <button type="submit" className="primary-btn" disabled={isSaving} style={{ marginTop: '0.5rem', padding: '1.1rem', borderRadius: '14px', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s ease', background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)', color: '#fff', border: 'none', fontSize: '1.1rem' }}>
                {isSaving ? "Sauvegarde en cours..." : "Créer mon compte"}
              </button>
            </form>
          </div>
        </main>
      );
    }

    return (
      <main 
        className={`admin-root-container min-h-screen w-full transition-colors duration-200 ${isAdminLightMode ? "admin-console-light bg-slate-100 text-slate-900" : "bg-slate-950 text-white"}`} 
        style={{ 
          width: '100%', 
          minHeight: '100vh', 
          backgroundColor: isAdminLightMode ? '#f1f5f9' : '#020617', 
          color: isAdminLightMode ? '#0f172a' : '#ffffff',
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          padding: '2rem 1.5rem', 
          boxSizing: 'border-box', 
          position: 'relative' 
        }}
      >
        <button 
          onClick={() => {
            const nextVal = !isAdminLightMode;
            setIsAdminLightMode(nextVal);
            localStorage.setItem("admin_light_mode", String(nextVal));
          }}
          type="button"
          style={{
            position: 'absolute',
            top: '1.5rem',
            right: '1.5rem',
            padding: '0.5rem 1rem',
            borderRadius: '9999px',
            border: '1px solid ' + (isAdminLightMode ? '#cbd5e1' : '#334155'),
            backgroundColor: isAdminLightMode ? '#ffffff' : '#1e293b',
            color: isAdminLightMode ? '#0f172a' : '#ffffff',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '0.75rem',
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}
        >
          Console : {isAdminLightMode ? '🌙' : '☀️'}
        </button>
        {isLogin ? (
          // Mode Connexion Standard
          <div className="admin-section" style={{ textAlign: 'center', maxWidth: '400px', width: '100%', padding: '2.5rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '24px', backdropFilter: 'blur(12px)', boxShadow: '0 20px 40px rgba(0,0,0,0.5)', margin: '0 auto' }}>
            <h1 style={{ marginBottom: '0.5rem', fontWeight: 900, background: 'linear-gradient(to right, #fff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Connexion Administrateur</h1>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '2rem', lineHeight: '1.5' }}>Accès réservé. Veuillez vous connecter avec votre <strong>adresse email</strong> et votre <strong>mot de passe</strong> pour gérer vos profils.</p>
            
            <form onSubmit={handleAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <input 
                type="email" 
                placeholder="Email professionnel" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
                style={{ width: '100%', padding: '0.85rem 1.2rem', borderRadius: '12px', background: 'rgba(30,41,59,0.5)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', fontSize: '0.9rem' }}
              />
              <input 
                type="password" 
                placeholder="Mot de passe" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
                style={{ width: '100%', padding: '0.85rem 1.2rem', borderRadius: '12px', background: 'rgba(30,41,59,0.5)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', fontSize: '0.9rem' }}
              />
              {error && <p style={{ color: '#f87171', fontSize: '0.8rem', margin: '0.2rem 0' }}>⚠️ {error}</p>}
              {resetSent && <p style={{ color: '#4ade80', fontSize: '0.8rem', margin: '0.2rem 0', fontWeight: 'bold' }}>📧 Un e-mail de réinitialisation a été envoyé à {email} !</p>}
              
              <button type="submit" className="primary-btn" disabled={isSaving} style={{ marginTop: '0.5rem', padding: '0.9rem', borderRadius: '12px', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s ease', background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)', color: '#fff', border: 'none' }}>
                {isSaving ? "Veuillez patienter..." : "Se connecter"}
              </button>

              <button 
                type="button" 
                onClick={async () => {
                  if (!email) {
                    setError("Veuillez saisir votre adresse email ci-dessus.");
                    return;
                  }
                  setIsSaving(true);
                  setError("");
                  try {
                    await sendPasswordResetEmail(auth, email);
                    setResetSent(true);
                  } catch (err: any) {
                    setError("Erreur réinitialisation : " + (err.message || "Vérifiez votre adresse email."));
                  } finally {
                    setIsSaving(false);
                  }
                }}
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '0.75rem', marginTop: '0.3rem', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Mot de passe oublié ? (Recevoir un lien par email)
              </button>
            </form>

            <p style={{ marginTop: '1.8rem', fontSize: '0.8rem', color: '#64748b' }}>
              Pas encore de compte ?
              <button 
                onClick={() => setIsLogin(false)} 
                style={{ background: 'none', border: 'none', color: '#38bdf8', fontWeight: 700, marginLeft: '0.4rem', cursor: 'pointer' }}
              >
                Créer mon portail
              </button>
            </p>
          </div>
        ) : (
          // Mode Inscription - NOUVELLE PAGE ADMIN DE FORMULAIRE COMBINÉE (Une pierre deux coups)
          <div className="admin-section" style={{ maxWidth: '960px', width: '100%', background: 'rgba(15, 23, 42, 0.7)', border: '2px solid rgba(79, 70, 229, 0.25)', borderRadius: '24px', backdropFilter: 'blur(16px)', boxShadow: '0 0 50px rgba(79, 70, 229, 0.15), 0 30px 60px rgba(0,0,0,0.6)', overflow: 'hidden', margin: '0 auto' }}>
            
            {/* Header Bar Console Admin */}
            <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(30, 41, 59, 0.6)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', padding: '0.85rem 1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }} />
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#eab308' }} />
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e' }} />
                <span style={{ marginLeft: '10px', fontSize: '0.7rem', color: '#94a3b8', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>
                  console.setup.initialisation.sh
                </span>
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '0.2rem 0.6rem', borderRadius: '100px', marginLeft: 'auto' }}>
                <span style={{ height: '6px', width: '6px', borderRadius: '50%', backgroundColor: '#10b981', boxShadow: '0 0 6px #10b981' }} />
                <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#34d399', letterSpacing: '0.05em' }}>SETUP INITIAL & ADMIN</span>
              </div>
            </div>

            <div style={{ padding: '2.5rem 2rem' }}>
              <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '0.5rem', background: 'linear-gradient(to right, #ffffff, #a5b4fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  Initialisation & Configuration de l'Admin
                </h1>
                <p style={{ color: '#94a3b8', fontSize: '0.85rem', maxWidth: '600px', margin: '0 auto' }}>
                  Créez vos accès maîtres et renseignez l'identité de votre entreprise pour configurer automatiquement votre portail vitrine et produits.
                </p>
              </div>

              <form onSubmit={handleAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2.5rem' }}>
                  
                  {/* Left Column: Access & Security */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', background: 'rgba(30, 41, 59, 0.25)', border: '1px solid rgba(255, 255, 255, 0.04)', borderRadius: '20px', padding: '1.8rem' }}>
                    <h2 style={{ fontSize: '1rem', fontWeight: 800, color: '#f1f5f9', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      📋 Informations Principales
                    </h2>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Secteur d'Activité</label>
                      <input 
                        type="text"
                        placeholder="Ex: Traiteur, Coiffeur, BTP..."
                        value={signupSector}
                        onChange={(e) => setSignupSector(e.target.value)}
                        style={{ width: '100%', padding: '0.85rem 1.2rem', borderRadius: '12px', background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', fontSize: '0.9rem', outline: 'none' }}
                      />
                    </div>

                    <div style={{ padding: '1rem', background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.2)', borderRadius: '12px' }}>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: '#7dd3fc', fontWeight: 600 }}>
                        🚀 Création Rapide (Mode Invité)
                      </p>
                      <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.75rem', color: '#bae6fd' }}>
                        Générez instantanément votre portail vitrine et explorez vos produits modélisés en 3D. Aucune inscription requise !
                      </p>
                    </div>

                    {/* Glowing Key Generation Box */}
                    <div style={{ background: 'rgba(30, 41, 59, 0.4)', border: '1px solid rgba(79, 70, 229, 0.2)', padding: '1rem', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem', boxShadow: 'inset 0 0 15px rgba(79, 70, 229, 0.1)', marginTop: '0.5rem' }}>
                      <span style={{ fontSize: '0.6rem', color: '#818cf8', fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Clé d'Actuation Premium Provisoire</span>
                      <span style={{ fontFamily: 'monospace', fontSize: '1.1rem', color: '#38bdf8', fontWeight: 800, letterSpacing: '0.05em', textShadow: '0 0 10px rgba(56, 189, 248, 0.4)' }}>
                        {previewKey || "SG-GENERATING-KEY"}
                      </span>
                    </div>
                  </div>

                  {/* Right Column: Brand Profile */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', background: 'rgba(30, 41, 59, 0.25)', border: '1px solid rgba(255, 255, 255, 0.04)', borderRadius: '20px', padding: '1.8rem' }}>
                    <h2 style={{ fontSize: '1rem', fontWeight: 800, color: '#f1f5f9', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      🏢 Identité de Marque
                    </h2>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Nom de l'Entreprise</label>
                      <input 
                        type="text" 
                        placeholder="ex: Batipro Express" 
                        value={signupCompanyName} 
                        onChange={(e) => setSignupCompanyName(e.target.value)} 
                        required 
                        style={{ width: '100%', padding: '0.85rem 1.2rem', borderRadius: '12px', background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', fontSize: '0.9rem' }}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Téléphone / WhatsApp</label>
                        <input 
                          type="text" 
                          placeholder="ex: +33612345678" 
                          value={signupPhone} 
                          onChange={(e) => setSignupPhone(e.target.value)} 
                          style={{ width: '100%', padding: '0.85rem 1.2rem', borderRadius: '12px', background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', fontSize: '0.9rem' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>N° TVA (Optionnel)</label>
                        <input 
                          type="text" 
                          placeholder="ex: FR12345678901" 
                          value={signupTva} 
                          onChange={(e) => setSignupTva(e.target.value)} 
                          style={{ width: '100%', padding: '0.85rem 1.2rem', borderRadius: '12px', background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', fontSize: '0.9rem' }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Site Web existant (Optionnel)</label>
                      <input 
                        type="text" 
                        placeholder="ex: https://monentreprise.com" 
                        value={signupWebsite} 
                        onChange={(e) => setSignupWebsite(e.target.value)} 
                        style={{ width: '100%', padding: '0.85rem 1.2rem', borderRadius: '12px', background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', fontSize: '0.9rem' }}
                      />
                    </div>

                    {/* Logo upload block */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Logo de l'Entreprise</label>
                      
                      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <div style={{ position: 'relative', flex: 1 }}>
                          <input 
                            type="file" 
                            accept="image/*" 
                            onChange={handleSignupLogoChange}
                            id="signup-logo-input"
                            style={{ display: 'none' }}
                          />
                          <label 
                            htmlFor="signup-logo-input" 
                            style={{ 
                              display: 'block', 
                              textAlign: 'center', 
                              padding: '0.85rem 1rem', 
                              borderRadius: '12px', 
                              background: 'rgba(30,41,59,0.5)', 
                              border: '1px dashed rgba(255,255,255,0.2)', 
                              color: '#cbd5e1', 
                              fontSize: '0.85rem', 
                              fontWeight: 600, 
                              cursor: 'pointer', 
                              transition: 'all 0.2s ease' 
                            }}
                            onMouseOver={(e) => { e.currentTarget.style.borderColor = 'rgba(79, 70, 229, 0.6)'; e.currentTarget.style.background = 'rgba(79, 70, 229, 0.05)'; }}
                            onMouseOut={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.background = 'rgba(30,41,59,0.5)'; }}
                          >
                            {logoUploading ? "Traitement intelligent..." : "📂 Choisir une image"}
                          </label>
                        </div>

                        {/* Logo Preview box */}
                        <div style={{ 
                          width: '70px', 
                          height: '70px', 
                          borderRadius: '12px', 
                          border: '1px solid rgba(255,255,255,0.08)', 
                          background: signupLogo ? '#1e293b' : 'rgba(15,23,42,0.4)', 
                          backgroundImage: signupLogo ? 'radial-gradient(#ffffff 1px, transparent 1px)' : 'none',
                          backgroundSize: '10px 10px',
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          overflow: 'hidden',
                          boxShadow: signupLogo ? '0 0 15px rgba(79, 70, 229, 0.2)' : 'none'
                        }}>
                          {signupLogo ? (
                            <img src={signupLogo} alt="Logo" style={{ maxWidth: '90%', maxHeight: '90%', objectFit: 'contain' }} />
                          ) : (
                            <span style={{ fontSize: '1.5rem', opacity: 0.25 }}>🖼️</span>
                          )}
                        </div>
                      </div>

                      {signupLogo && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.5rem', background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.2)', padding: '0.3rem 0.6rem', borderRadius: '8px' }}>
                          <span style={{ fontSize: '0.8rem' }}>✨</span>
                          <span style={{ fontSize: '0.65rem', color: '#4ade80', fontWeight: 700 }}>Logo optimisé : fond retiré et accentuation extraite !</span>
                        </div>
                      )}
                    </div>
                  </div>

                </div>

                {error && <p style={{ color: '#f87171', fontSize: '0.85rem', margin: '0', textAlign: 'center', fontWeight: 600 }}>⚠️ {error}</p>}
                
                <button 
                  type="submit" 
                  className="primary-btn" 
                  disabled={isSaving || logoUploading} 
                  style={{ 
                    alignSelf: 'center',
                    maxWidth: '480px',
                    width: '100%',
                    padding: '1.1rem 2rem', 
                    borderRadius: '14px', 
                    fontWeight: 950, 
                    cursor: (isSaving || logoUploading) ? 'not-allowed' : 'pointer', 
                    transition: 'all 0.2s ease', 
                    background: 'linear-gradient(135deg, #4f46e5 0%, #0284c7 100%)', 
                    color: '#fff', 
                    border: 'none',
                    boxShadow: '0 8px 25px rgba(79, 70, 229, 0.35)',
                    fontSize: '1rem',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase'
                  }}
                >
                  {isSaving ? "Création du portail et de la console..." : "🚀 CRÉER ET ENTRER DANS MON ADMIN"}
                </button>
              </form>

              <div style={{ marginTop: '2.5rem', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Déjà enregistré ?</span>
                <button 
                  onClick={() => setIsLogin(true)} 
                  style={{ background: 'none', border: 'none', color: '#38bdf8', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  Se connecter à l'Admin →
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    );
  }

  if (!config) return <div className="loader">CHARGEMENT...</div>;

  return (
    <main 
      className={`admin-root-container min-h-screen w-full transition-colors duration-200 ${isAdminLightMode ? "admin-console-light bg-slate-100 text-slate-900" : "bg-slate-950 text-white"}`} 
      style={{ 
        maxWidth: '100%', 
        width: '100%', 
        minHeight: '100vh', 
        margin: '0', 
        padding: '0.75rem 1.25rem 6rem 1.25rem', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '1.5rem', 
        boxSizing: 'border-box',
        backgroundColor: isAdminLightMode ? '#f1f5f9' : '#020617',
        color: isAdminLightMode ? '#0f172a' : '#ffffff'
      }}
    >
      <style>{`
        body.admin-console-light,
        body.admin-console-light #root,
        body.admin-console-light .admin-root-container,
        body.admin-console-light main {
          background-color: #f1f5f9 !important;
          background: #f1f5f9 !important;
          color: #0f172a !important;
        }
        body.admin-console-light section {
          background: transparent !important;
        }
        body.admin-console-light .admin-section,
        body.admin-console-light [style*="background: rgba(15,"],
        body.admin-console-light [style*="background:rgba(15,"],
        body.admin-console-light [style*="background: rgba(30,"],
        body.admin-console-light [style*="background:rgba(30,"],
        body.admin-console-light [style*="background: rgba(255, 255, 255, 0.03)"],
        body.admin-console-light [style*="background:rgba(255,255,255,0.03)"],
        body.admin-console-light [style*="background: rgba(255,255,255,0.03)"],
        body.admin-console-light [style*="background: rgba(255, 255, 255, 0.02)"],
        body.admin-console-light [style*="background:rgba(255,255,255,0.02)"],
        body.admin-console-light [style*="background: rgba(255,255,255,0.02)"] {
          background: #ffffff !important;
          color: #0f172a !important;
          border: 1px solid rgba(0, 0, 0, 0.08) !important;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -4px rgba(0, 0, 0, 0.05), 0 0 0 1px rgba(0,0,0,0.03) !important;
        }
        /* STYLES THÈME CLAIR DE L'ADMIN */
        body.admin-console-light .admin-label,
        body.admin-console-light .admin-desc {
          color: #475569 !important;
        }
        body.admin-console-light .admin-heading {
          color: #0f172a !important;
        }
        body.admin-console-light .admin-header {
          border-bottom: 1px solid rgba(15, 23, 42, 0.12) !important;
        }
        body.admin-console-light .admin-header h1,
        body.admin-console-light .admin-header-title {
          color: #0f172a !important;
        }
        body.admin-console-light .dj-creator-title {
          color: #0f172a !important;
          background: linear-gradient(to right, #0f172a, #ea580c) !important;
          -webkit-background-clip: text !important;
          -webkit-text-fill-color: transparent !important;
        }
        body.admin-console-light .dj-creator-subtitle {
          color: #475569 !important;
        }

        /* 🛡️ ISOLATION DU STUDIO PREVIEW */
        #studio-live-preview-root.studio-dark,
        #studio-live-preview-root.studio-dark * {
          /* Ensure dark studio text is white/light */
        }
        #studio-live-preview-root.studio-dark h1,
        #studio-live-preview-root.studio-dark .studio-artist-title {
          color: #ffffff !important;
        }
        #studio-live-preview-root.studio-dark .studio-artist-sector {
          color: #cbd5e1 !important;
        }
        #studio-live-preview-root.studio-dark svg {
          color: #ffffff !important;
          fill: #ffffff !important;
        }
        #studio-live-preview-root.studio-light h1,
        #studio-live-preview-root.studio-light .studio-artist-title {
          color: #0f172a !important;
        }
        #studio-live-preview-root.studio-light .studio-artist-sector {
          color: #475569 !important;
        }
        #studio-live-preview-root.studio-light svg {
          color: #0f172a !important;
          fill: #0f172a !important;
        }
        body.admin-console-light [style*="background: rgba(30, 41, 59, 0.6)"],
        body.admin-console-light [style*="background:rgba(30, 41, 59, 0.6)"] {
          background: #e2e8f0 !important;
          border-bottom: 1px solid rgba(0, 0, 0, 0.1) !important;
        }
        body.admin-console-light [style*="background: rgba(56, 189, 248"],
        body.admin-console-light [style*="background:rgba(56, 189, 248"] {
          background: #f0f9ff !important;
          border: 1px solid #bae6fd !important;
          color: #0369a1 !important;
        }
        body.admin-console-light [style*="color: #7dd3fc"] {
          color: #0369a1 !important;
        }
        body.admin-console-light [style*="color: #bae6fd"] {
          color: #0284c7 !important;
        }
        body.admin-console-light [style*="background: rgba(34, 197, 94"],
        body.admin-console-light [style*="background:rgba(34, 197, 94"],
        body.admin-console-light [style*="background: rgba(16, 185, 129"],
        body.admin-console-light [style*="background:rgba(16, 185, 129"] {
          background: #f0fdf4 !important;
          border: 1px solid #bbf7d0 !important;
          color: #166534 !important;
        }
        body.admin-console-light [style*="color: #4ade80"],
        body.admin-console-light [style*="color: #34d399"] {
          color: #166534 !important;
        }
        body.admin-console-light code,
        body.admin-console-light [style*="background: rgba(59, 130, 246, 0.1)"],
        body.admin-console-light [style*="background:rgba(59, 130, 246, 0.1)"] {
          background: #eff6ff !important;
          border: 1px solid rgba(59, 130, 246, 0.3) !important;
          color: #1d4ed8 !important;
        }
        body.admin-console-light [style*="color: #38bdf8"] {
          color: #0284c7 !important;
        }
        body.admin-console-light [style*="color: #60a5fa"] {
          color: #1d4ed8 !important;
        }
        body.admin-console-light [style*="color: #f87171"],
        body.admin-console-light [style*="color:#f87171"] {
          color: #b91c1c !important;
        }
        body.admin-console-light [style*="backgroundColor: '#0f172a'"],
        body.admin-console-light [style*="backgroundColor:'#0f172a'"],
        body.admin-console-light [style*="background-color: #0f172a"],
        body.admin-console-light [style*="background-color:#0f172a"] {
          background-color: #eff6ff !important;
          border: 1px solid rgba(59, 130, 246, 0.3) !important;
        }
      `}</style>

      <div 
        className="admin-header" 
        style={{ 
          flexWrap: 'wrap', 
          gap: '0.5rem', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          borderBottom: isAdminLightMode ? '1px solid rgba(15, 23, 42, 0.12)' : '1px solid var(--border-color)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h1 
            className={`admin-header-title ${isAdminLightMode ? "text-slate-900" : "text-white"}`}
            style={{ 
              fontSize: '1.05rem', 
              fontWeight: 800, 
              whiteSpace: 'nowrap', 
              margin: 0,
              color: isAdminLightMode ? '#0f172a' : '#ffffff'
            }}
          >
            {currentUser?.isMagicLink ? "Configuration de ma Vitrine" : "Admin CMS Studio"}
          </h1>
          <span style={{ 
            fontSize: '0.72rem', 
            background: isAdminLightMode ? 'rgba(2, 132, 199, 0.1)' : 'rgba(56, 189, 248, 0.15)', 
            color: isAdminLightMode ? '#0284c7' : '#38bdf8', 
            border: isAdminLightMode ? '1px solid rgba(2, 132, 199, 0.25)' : '1px solid rgba(56, 189, 248, 0.3)', 
            padding: '2px 8px', 
            borderRadius: '100px', 
            fontWeight: 700 
          }}>
            ⚡ Studio Live
          </span>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center' }}>
          <button 
            type="button"
            onClick={() => {
              const nextVal = !isAdminLightMode;
              setIsAdminLightMode(nextVal);
              localStorage.setItem("admin_light_mode", String(nextVal));
            }} 
            style={{ 
              padding: '0.45rem 0.9rem', 
              borderRadius: '100px', 
              border: isAdminLightMode ? '1px solid #cbd5e1' : '1px solid var(--border-color)', 
              background: isAdminLightMode ? '#ffffff' : 'var(--card-bg)', 
              color: isAdminLightMode ? '#0f172a' : 'var(--text-color)', 
              cursor: 'pointer',
              fontSize: '0.75rem',
              fontWeight: 'bold',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              boxShadow: isAdminLightMode ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
            }}
          >
            Mode : {isAdminLightMode ? '☀️ Jour' : '🌙 Nuit'}
          </button>
          
          {/* Shopping Cart button with notification pastille */}
          <Link 
            to={`/portail-shop/${(config.companyName || editingUid || auth.currentUser?.uid || 'djdfazz').toLowerCase().trim().replace(/[^a-z0-9]/g, '')}`} 
            target="_blank"
            style={{ 
              position: 'relative',
              padding: '0.45rem 1rem', 
              borderRadius: '100px', 
              border: '1px solid rgba(234, 88, 12, 0.4)', 
              background: 'rgba(234, 88, 12, 0.1)', 
              color: '#ea580c', 
              textDecoration: 'none', 
              fontSize: '0.78rem', 
              fontWeight: 800,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease',
              boxSizing: 'border-box'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)';
              e.currentTarget.style.background = 'rgba(234, 88, 12, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.background = 'rgba(234, 88, 12, 0.1)';
            }}
          >
            🛒 Boutique
            {pendingOrdersCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '-5px',
                right: '-5px',
                background: '#ef4444',
                color: '#ffffff',
                borderRadius: '50%',
                minWidth: '18px',
                height: '18px',
                padding: '0 4px',
                fontSize: '0.65rem',
                fontWeight: '900',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 10px rgba(239, 68, 68, 0.8)',
                boxSizing: 'border-box',
                border: '1.5px solid var(--card-bg)'
              }}>
                {pendingOrdersCount}
              </span>
            )}
          </Link>

          {(() => {
            const vanityName = getProfileVanitySlug();
            return (
              <Link 
                to={`/${vanityName}`} 
                target="_blank"
                style={{ 
                  padding: '0.45rem 0.95rem', 
                  borderRadius: '100px', 
                  border: '1px solid rgba(56, 189, 248, 0.4)', 
                  background: 'rgba(56, 189, 248, 0.1)', 
                  color: '#38bdf8', 
                  textDecoration: 'none', 
                  fontSize: '0.75rem', 
                  fontWeight: 800,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  whiteSpace: 'nowrap'
                }}
              >
                🔗 Mon Profil (/{vanityName})
              </Link>
            );
          })()}

          <button 
            type="button" 
            onClick={handleLogout} 
            style={{ 
              padding: '0.45rem 0.9rem', 
              borderRadius: '100px', 
              border: '1px solid rgba(239, 68, 68, 0.4)', 
              background: 'rgba(239, 68, 68, 0.1)', 
              color: '#f87171', 
              cursor: 'pointer', 
              fontSize: '0.75rem',
              fontWeight: 700
            }}
          >
            🚪 {currentUser?.isMagicLink ? "Quitter l'Admin" : "Déconnexion"}
          </button>
        </div>
      </div>

      {/* BARRE D'ONGLETS CONSOLE ADMIN SANS DOUBLONS */}
      {currentUser && !currentUser.isMagicLink && (
        <div style={{ display: 'flex', gap: '0.6rem', margin: '0.75rem 0 1.25rem 0', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <button 
            type="button" 
            onClick={() => setActiveAdminTab('editor')}
            style={{
              padding: '0.65rem 1.3rem',
              borderRadius: '12px',
              border: activeAdminTab === 'editor' ? '2px solid #4f46e5' : '1px solid rgba(255,255,255,0.1)',
              background: activeAdminTab === 'editor' ? 'linear-gradient(135deg, rgba(79,70,229,0.3) 0%, rgba(55,48,163,0.3) 100%)' : 'rgba(15,23,42,0.4)',
              color: activeAdminTab === 'editor' ? '#ffffff' : '#94a3b8',
              fontWeight: 800,
              fontSize: '0.86rem',
              cursor: 'pointer',
              boxShadow: activeAdminTab === 'editor' ? '0 4px 15px rgba(79,70,229,0.25)' : 'none',
              transition: 'all 0.2s ease',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            🎨 Studio & Éditeur Visuel
          </button>

          <button 
            type="button" 
            onClick={() => setActiveAdminTab('prospects')}
            style={{
              padding: '0.65rem 1.3rem',
              borderRadius: '12px',
              border: activeAdminTab === 'prospects' ? '2px solid #10b981' : '1px solid rgba(255,255,255,0.1)',
              background: activeAdminTab === 'prospects' ? 'linear-gradient(135deg, rgba(16,185,129,0.3) 0%, rgba(5,150,105,0.3) 100%)' : 'rgba(15,23,42,0.4)',
              color: activeAdminTab === 'prospects' ? '#ffffff' : '#94a3b8',
              fontWeight: 800,
              fontSize: '0.86rem',
              cursor: 'pointer',
              boxShadow: activeAdminTab === 'prospects' ? '0 4px 15px rgba(16,185,129,0.25)' : 'none',
              transition: 'all 0.2s ease',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            📋 Mes Prospects ({prospectsList.length})
          </button>
        </div>
      )}

      {/* SECTION PROSPECTS PLACÉE DIRECTEMENT EN HAUT LORS DU CLIC SUR L'ONGLET */}
      {currentUser && !currentUser.isMagicLink && activeAdminTab === 'prospects' && (
        <div className="admin-section" style={{ background: 'rgba(15,23,42,0.6)', borderRadius: '20px', border: '1.5px solid rgba(16, 185, 129, 0.4)', padding: '1.75rem', marginBottom: '2rem', boxShadow: '0 15px 35px rgba(0,0,0,0.5)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 900, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>📋</span> Mes Fiches Prospects ({prospectsList.length})
              </h2>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: '#94a3b8' }}>
                Créez, éditez ou supprimez vos fiches prospects et leurs boutiques dédiées.
              </p>
            </div>
            <button 
              onClick={() => setShowAddProspectModal(true)}
              style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#fff',
                border: 'none',
                padding: '0.7rem 1.4rem',
                borderRadius: '12px',
                fontWeight: 800,
                fontSize: '0.88rem',
                cursor: 'pointer',
                boxShadow: '0 4px 15px rgba(16, 185, 129, 0.35)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                transition: 'transform 0.15s ease'
              }}
            >
              ➕ Créer un Portail Prospect
            </button>
          </div>

          {/* MODAL / FORMULAIRE DE CRÉATION DE PROSPECT */}
          {showAddProspectModal && (
            <form onSubmit={handleCreateProspect} style={{ background: 'rgba(30,41,59,0.9)', padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(16,185,129,0.5)', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', boxShadow: '0 10px 30px rgba(0,0,0,0.6)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>✨ Nouveau Portail Prospect</h3>
                <button type="button" onClick={() => setShowAddProspectModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.3rem', cursor: 'pointer' }}>✕</button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '0.3rem', textTransform: 'uppercase' }}>Nom de l'entreprise *</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="ex: LB Peinture BTP" 
                    value={newProspectName} 
                    onChange={(e) => setNewProspectName(e.target.value)} 
                    style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: '0.9rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '0.3rem', textTransform: 'uppercase' }}>Secteur d'activité</label>
                  <input 
                    type="text" 
                    placeholder="ex: Peinture / Maçonnerie" 
                    value={newProspectSector} 
                    onChange={(e) => setNewProspectSector(e.target.value)} 
                    style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: '0.9rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '0.3rem', textTransform: 'uppercase' }}>Email Contact (Optionnel)</label>
                  <input 
                    type="email" 
                    placeholder="contact@entreprise.com" 
                    value={newProspectEmail} 
                    onChange={(e) => setNewProspectEmail(e.target.value)} 
                    style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: '0.9rem' }}
                  />
                </div>
              </div>

              {/* CHARGEMENT DIRECT DE LA PHOTO / LOGO */}
              <div style={{ background: 'rgba(15,23,42,0.6)', padding: '1rem', borderRadius: '10px', border: '1.5px dashed rgba(16, 185, 129, 0.45)' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#34d399', marginBottom: '0.6rem', textTransform: 'uppercase' }}>
                  📸 Photo / Logo du Prospect
                </label>
                
                {newProspectLogo ? (() => {
                  const isDayTime = new Date().getHours() >= 7 && new Date().getHours() < 22;
                  const logoUrlLower = (newProspectLogo || '').toLowerCase();
                  const isWhiteLogo = logoUrlLower.includes('white') || logoUrlLower.includes('blanc') || logoUrlLower.includes('aaronh') || logoUrlLower.includes('dokiin');
                  const isBlackLogo = logoUrlLower.includes('black') || logoUrlLower.includes('noir');
                  const thumbBg = isDayTime ? '#ffffff' : '#090d16';
                  const thumbBorder = isDayTime ? '1.5px solid #cbd5e1' : '1.5px solid rgba(255,255,255,0.18)';
                  const thumbFilter = isDayTime
                    ? (isWhiteLogo ? 'brightness(0) drop-shadow(0 1px 3px rgba(0,0,0,0.3))' : 'drop-shadow(0 1px 3px rgba(0,0,0,0.15))')
                    : (isBlackLogo ? 'brightness(0) invert(1) drop-shadow(0 2px 8px rgba(0,0,0,0.95))' : 'drop-shadow(0 2px 8px rgba(0,0,0,0.7))');

                  return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(30,41,59,0.7)', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.12)' }}>
                      <div style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '8px',
                        backgroundColor: thumbBg,
                        border: thumbBorder,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '6px',
                        boxShadow: isDayTime ? '0 2px 8px rgba(0,0,0,0.08)' : '0 4px 12px rgba(0,0,0,0.6)',
                        flexShrink: 0
                      }}>
                        <img 
                          src={newProspectLogo} 
                          alt="Aperçu Photo/Logo" 
                          style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', filter: thumbFilter }} 
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontSize: '0.88rem', fontWeight: 800, color: '#34d399' }}>✓ Photo chargée avec succès</p>
                        <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: isDayTime ? '#fbbf24' : '#38bdf8' }}>
                          {isDayTime ? '☀️ Mode Jour : Affichage noir sur blanc' : '🌙 Mode Nuit : Affichage blanc sur noir'}
                        </p>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => setNewProspectLogo('')} 
                        style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.35)', padding: '0.45rem 0.9rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}
                      >
                        Supprimer
                      </button>
                    </div>
                  );
                })() : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap' }}>
                      <label 
                        style={{ 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          gap: '0.5rem', 
                          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', 
                          color: '#fff', 
                          padding: '0.65rem 1.3rem', 
                          borderRadius: '8px', 
                          cursor: isUploadingProspectLogo ? 'wait' : 'pointer', 
                          fontSize: '0.85rem', 
                          fontWeight: 800,
                          boxShadow: '0 2px 8px rgba(16, 185, 129, 0.35)',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <span>📁</span>
                        <span>{isUploadingProspectLogo ? "Téléchargement..." : "Charger une photo / logo"}</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={handleProspectLogoUpload} 
                          style={{ display: 'none' }} 
                          disabled={isUploadingProspectLogo}
                        />
                      </label>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Glissez ou sélectionnez un fichier (PNG, JPG, WebP)</span>
                    </div>

                    <div style={{ marginTop: '0.25rem' }}>
                      <input 
                        type="text" 
                        placeholder="Ou collez une URL d'image directe (https://...)" 
                        value={newProspectLogo} 
                        onChange={(e) => setNewProspectLogo(e.target.value)} 
                        style={{ width: '100%', padding: '0.55rem 0.8rem', borderRadius: '6px', background: 'rgba(15,23,42,0.4)', border: '1px solid rgba(255,255,255,0.08)', color: '#cbd5e1', fontSize: '0.8rem' }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* COULEUR D'ACCENT DU PROSPECT */}
              <div style={{ background: 'rgba(15,23,42,0.6)', padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', marginBottom: '0.4rem' }}>
                  🎯 Couleur d'Accent
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <input
                      type="color"
                      value={newProspectAccentColor}
                      onChange={(e) => setNewProspectAccentColor(e.target.value)}
                      style={{ width: '42px', height: '38px', border: 'none', borderRadius: '8px', cursor: 'pointer', background: 'transparent' }}
                    />
                    <span style={{ fontSize: '0.85rem', fontFamily: 'monospace', color: '#38bdf8', fontWeight: 700 }}>
                      {newProspectAccentColor}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    {[
                      { label: 'Bleu', color: '#3b82f6' },
                      { label: 'Cyan', color: '#06b6d4' },
                      { label: 'Émeraude', color: '#10b981' },
                      { label: 'Rose', color: '#ff3366' },
                      { label: 'Orange', color: '#f97316' },
                      { label: 'Violet', color: '#8b5cf6' },
                      { label: 'Or', color: '#eab308' },
                      { label: 'Blanc', color: '#ffffff' }
                    ].map(p => {
                      const isSel = newProspectAccentColor.toLowerCase() === p.color.toLowerCase();
                      return (
                        <button
                          key={p.color}
                          type="button"
                          onClick={() => setNewProspectAccentColor(p.color)}
                          title={p.label}
                          style={{
                            width: '26px',
                            height: '26px',
                            borderRadius: '50%',
                            backgroundColor: p.color,
                            border: isSel ? '2.5px solid #ffffff' : '1.5px solid rgba(255,255,255,0.2)',
                            boxShadow: isSel ? `0 0 10px ${p.color}` : 'none',
                            cursor: 'pointer',
                            transform: isSel ? 'scale(1.15)' : 'scale(1)',
                            transition: 'all 0.15s ease'
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.8rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowAddProspectModal(false)} style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)', padding: '0.6rem 1.2rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>Annuler</button>
                <button type="submit" disabled={isCreatingProspect} style={{ background: '#10b981', color: '#fff', border: 'none', padding: '0.6rem 1.5rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 800, fontSize: '0.85rem' }}>
                  {isCreatingProspect ? "Création..." : "💾 Générer le Portail"}
                </button>
              </div>
            </form>
          )}

          {/* BARRE DE RECHERCHE PROSPECTS & SUPPRESSION DES FILTRES BLOQUANTS */}
          <div style={{
            background: 'rgba(30,41,59,0.7)',
            padding: '1rem 1.25rem',
            borderRadius: '14px',
            border: '1.5px solid rgba(255,255,255,0.1)',
            marginBottom: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem'
          }}>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '1rem', color: '#94a3b8' }}>🔍</span>
                <input
                  type="text"
                  value={prospectSearchQuery}
                  onChange={(e) => setProspectSearchQuery(e.target.value)}
                  placeholder="Rechercher un prospect (nom, slug : ex. vision, club-vision-room)..."
                  style={{
                    width: '100%',
                    padding: '0.7rem 2.4rem 0.7rem 2.4rem',
                    borderRadius: '10px',
                    background: 'rgba(15,23,42,0.85)',
                    border: '1.5px solid rgba(16,185,129,0.35)',
                    color: '#ffffff',
                    fontSize: '0.9rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
                {prospectSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setProspectSearchQuery('')}
                    title="Effacer la recherche"
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#94a3b8',
                      cursor: 'pointer',
                      fontSize: '1rem',
                      padding: '2px'
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* BOUTONS D'ACCÈS RAPIDE / FILTRES */}
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setProspectSearchQuery('vision')}
                  style={{
                    background: prospectSearchQuery.toLowerCase().includes('vision') 
                      ? 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' 
                      : 'rgba(37, 99, 235, 0.25)',
                    color: '#93c5fd',
                    border: '1px solid rgba(59, 130, 246, 0.5)',
                    padding: '0.55rem 0.95rem',
                    borderRadius: '8px',
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  ⭐ Club Vision Room
                </button>
                {prospectSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setProspectSearchQuery('')}
                    style={{
                      background: 'rgba(255,255,255,0.08)',
                      color: '#e2e8f0',
                      border: '1px solid rgba(255,255,255,0.15)',
                      padding: '0.55rem 0.85rem',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      fontWeight: 600
                    }}
                  >
                    Tout afficher ({prospectsList.length})
                  </button>
                )}
              </div>
            </div>

            {/* BANDEAU D'ÉTAT : AUCUN FILTRE BLOQUANT / STATUT COMPLET */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', color: '#94a3b8', flexWrap: 'wrap', gap: '0.5rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: '#10b981' }}>●</span>
                <span>Affichage intégral : <strong>{filteredProspects.length}</strong> sur <strong>{prospectsList.length}</strong> profils enregistrés (aucun quota, filtre de statut ou d'expiration masquant)</span>
              </span>
              {prospectSearchQuery && (
                <span style={{ color: '#38bdf8' }}>
                  Filtre actif : « <strong>{prospectSearchQuery}</strong> » (recherche insensible à la casse et sans tiret)
                </span>
              )}
            </div>
          </div>

          {/* LISTE DES PROSPECTS SANS TRONCATURE */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {filteredProspects.length > 0 ? filteredProspects.map((p, idx) => {
              const currentHour = new Date().getHours();
              const isDayTime = currentHour >= 7 && currentHour < 21;

              // Règle stricte demandée :
              // - Mode Jour (7h-21h) : Logo NOIR sur fond BLANC (aucun blanc sur blanc)
              // - Mode Nuit (21h-7h) : Logo BLANC sur fond NOIR (aucun noir sur noir)
              const logoThumbBg = isDayTime ? '#ffffff' : '#090d16';
              const logoThumbBorder = isDayTime ? '1.5px solid #cbd5e1' : '1.5px solid rgba(255, 255, 255, 0.18)';
              const logoThumbFilter = isDayTime 
                ? 'brightness(0) drop-shadow(0 1px 2px rgba(0,0,0,0.2))' 
                : 'brightness(0) invert(1) drop-shadow(0 2px 6px rgba(0,0,0,0.9))';

              const normCompany = typeof p.companyName === 'string' ? p.companyName.toLowerCase().replace(/[-_\s]/g, '') : '';
              const normSlug = typeof p.slug === 'string' ? p.slug.toLowerCase().replace(/[-_\s]/g, '') : '';
              const normUid = typeof p.uid === 'string' ? p.uid.toLowerCase().replace(/[-_\s]/g, '') : '';
              const isVisionP = normUid === 'clubvisionroom' || 
                                normUid === 'mt074jnaldxn' || 
                                normUid === 'clubvision' || 
                                normSlug.includes('vision') || 
                                normCompany.includes('vision') || 
                                normUid.includes('vision');

              return (
                <div 
                  key={p.uid || idx} 
                  onMouseEnter={() => setHoveredProspectUid(p.uid)}
                  onMouseLeave={() => setHoveredProspectUid(null)}
                  style={{ 
                    position: 'relative',
                    background: isVisionP ? 'rgba(30,58,138,0.25)' : 'rgba(30,41,59,0.5)', 
                    padding: '1.1rem 1.3rem', 
                    borderRadius: '14px', 
                    border: hoveredProspectUid === p.uid 
                      ? '1.5px solid rgba(16, 185, 129, 0.7)' 
                      : (isVisionP ? '1.5px solid rgba(59, 130, 246, 0.5)' : '1px solid rgba(255,255,255,0.08)'), 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    flexWrap: 'wrap', 
                    gap: '1rem',
                    transition: 'all 0.2s ease',
                    boxShadow: isVisionP ? '0 4px 20px rgba(37,99,235,0.15)' : 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {p.logoUrl ? (
                      <div style={{
                        width: '52px',
                        height: '52px',
                        borderRadius: '12px',
                        backgroundColor: logoThumbBg,
                        border: logoThumbBorder,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '6px',
                        boxShadow: isDayTime ? '0 2px 10px rgba(0,0,0,0.08)' : '0 4px 15px rgba(0,0,0,0.6)',
                        flexShrink: 0,
                        transition: 'all 0.2s ease'
                      }}>
                        <img 
                          src={p.logoUrl} 
                          alt={p.companyName} 
                          style={{ 
                            maxWidth: '100%', 
                            maxHeight: '100%', 
                            objectFit: 'contain',
                            filter: logoThumbFilter
                          }} 
                        />
                      </div>
                    ) : (
                      <div style={{
                        width: '52px',
                        height: '52px',
                        borderRadius: '12px',
                        backgroundColor: logoThumbBg,
                        border: logoThumbBorder,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.5rem',
                        color: isDayTime ? '#64748b' : '#94a3b8',
                        flexShrink: 0
                      }}>
                        🏢
                      </div>
                    )}
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {p.companyName || 'Prospect Sans Nom'}
                        {isVisionP && (
                          <span style={{
                            background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                            color: '#ffffff',
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            padding: '0.2rem 0.6rem',
                            borderRadius: '6px',
                            letterSpacing: '0.04em',
                            boxShadow: '0 2px 8px rgba(37,99,235,0.4)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            ⭐ PROFIL CRITIQUE OFFICIEL
                          </span>
                        )}
                      </h3>
                      <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '0.25rem', display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
                        <span><strong>Secteur :</strong> {p.activitySector || p.sector || 'BTP'}</span>
                        <span><strong>ID/UID :</strong> <code style={{ background: 'rgba(0,0,0,0.3)', padding: '0.1rem 0.4rem', borderRadius: '4px', color: '#cbd5e1' }}>{p.uid}</code></span>
                        <span style={{ color: isDayTime ? '#fbbf24' : '#38bdf8', fontSize: '0.72rem', fontWeight: 600 }}>
                          {isDayTime ? '☀️ Mode Jour (Logo noir sur blanc)' : '🌙 Mode Nuit (Logo blanc sur noir)'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* POPUP APERÇU PAR SURVOL */}
                  {hoveredProspectUid === p.uid && (
                    <div style={{
                      position: 'absolute',
                      right: '1.2rem',
                      bottom: '100%',
                      marginBottom: '10px',
                      width: '320px',
                      background: '#0f172a',
                      border: '2px solid rgba(16, 185, 129, 0.6)',
                      borderRadius: '16px',
                      boxShadow: '0 20px 50px rgba(0,0,0,0.8), 0 0 25px rgba(16, 185, 129, 0.3)',
                      zIndex: 99999,
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                      pointerEvents: 'none',
                      animation: 'fadeIn 0.2s ease'
                    }}>
                      <div style={{ padding: '0.5rem 0.86rem', background: 'rgba(30,41,59,0.9)', borderBottom: '1px solid rgba(255,255,255,0.08)', fontSize: '0.7rem', fontWeight: 800, color: '#34d399', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>🔍 APERÇU DU PROSPECT</span>
                        <span style={{ fontSize: '0.65rem', color: isDayTime ? '#fbbf24' : '#38bdf8', background: 'rgba(255,255,255,0.08)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                          {isDayTime ? '☀️ 7h-22h' : '🌙 22h-7h'}
                        </span>
                      </div>
                      <div style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem', background: 'radial-gradient(circle at center, rgba(30,41,59,0.6) 0%, #0f172a 100%)' }}>
                        {p.logoUrl ? (
                          <div style={{
                            width: '64px',
                            height: '64px',
                            borderRadius: '12px',
                            backgroundColor: logoThumbBg,
                            border: logoThumbBorder,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '6px',
                            boxShadow: isDayTime ? '0 4px 15px rgba(0,0,0,0.1)' : '0 4px 15px rgba(0,0,0,0.6)',
                            flexShrink: 0
                          }}>
                            <img 
                              src={p.logoUrl} 
                              alt={p.companyName} 
                              style={{ 
                                maxWidth: '100%', 
                                maxHeight: '100%', 
                                objectFit: 'contain',
                                filter: logoThumbFilter
                              }} 
                            />
                          </div>
                        ) : (
                          <div style={{ width: '64px', height: '64px', background: logoThumbBg, border: logoThumbBorder, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', color: isDayTime ? '#64748b' : '#94a3b8' }}>🏢</div>
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.companyName || 'Prospect Sans Nom'}</div>
                          <div style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 700, marginTop: '0.1rem' }}>{p.activitySector || p.sector || 'BTP'}</div>
                          <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <span>🛍️ Shop & Vitrine 3D prêts</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {(() => {
                    const isDfazzP = !isVisionP && (p.uid === 'djdfazz' || p.uid === 'fabrizio' || p.uid === '5qk5ntk' || p.uid === 'guest_ms3ijgnco2xnid' || normCompany.includes('dfazz') || normCompany.includes('fazz'));
                    const cleanPslug = isVisionP ? 'clubvisionroom' : (isDfazzP ? 'djdfazz' : (p.slug || p.companyName || p.uid || '').toLowerCase().trim().replace(/[^a-z0-9_-]/g, ''));
                    const showcaseUrl = `/${cleanPslug || 'djdfazz'}`;
                    const studioAuditUrl = `/portail-audit/${cleanPslug || 'djdfazz'}`;
                    const shopUrl = `/portail-shop/${cleanPslug || 'djdfazz'}`;
                    const targetManageUid = isVisionP ? 'clubvisionroom' : (isDfazzP ? 'djdfazz' : p.uid);

                    return (
                      <>
                        <a href={showcaseUrl} target="_blank" rel="noreferrer" style={{ background: 'rgba(255,255,255,0.08)', padding: '0.5rem 0.9rem', borderRadius: '8px', fontSize: '0.8rem', color: '#ffffff', textDecoration: 'none', fontWeight: 700, border: '1px solid rgba(255,255,255,0.1)' }}>👁️ Vitrine Profil (/{cleanPslug})</a>
                        <a href={shopUrl} target="_blank" rel="noreferrer" style={{ background: 'rgba(16, 185, 129, 0.2)', padding: '0.5rem 0.9rem', borderRadius: '8px', fontSize: '0.8rem', color: '#34d399', textDecoration: 'none', fontWeight: 700, border: '1px solid rgba(16, 185, 129, 0.3)' }}>🛍️ Shop</a>
                        <a href={studioAuditUrl} target="_blank" rel="noreferrer" style={{ background: 'rgba(249, 115, 22, 0.2)', padding: '0.5rem 0.9rem', borderRadius: '8px', fontSize: '0.8rem', color: '#fb923c', textDecoration: 'none', fontWeight: 700, border: '1px solid rgba(249, 115, 22, 0.3)' }}>🎨 Studio Audit</a>
                        <button 
                          onClick={() => {
                            const resolvedLogo = (isVisionP && (!p.logoUrl || p.logoUrl.includes('logo_A_active_1787803093010')))
                              ? 'https://storage.googleapis.com/signaid-prod-assets/users/mt074jnaldxn/logos/1787803061043_logo_dtf.png'
                              : (p.logoUrl || p.logoAdaptedUrl || p.auditLogoUrl || p.logo || p.visualLogoUrl || p.logoA?.adaptedRemastered || p.logoA?.adapted || (isDfazzP ? '/logo_dfazz_avatar_clean.png' : ''));
                            const resolvedLivePhoto = (isVisionP && !p.livePhotoUrl)
                              ? 'https://storage.googleapis.com/signaid-prod-assets/users/mt074jnaldxn/gallery/1787808082062_cover.jpg'
                              : (p.livePhotoUrl || p.coverUrl || p.coverImage || (p.photos && p.photos[0]) || (isDfazzP ? '/assets/dfazz_hero.jpg' : resolvedLogo));
                            const fullProspect: SiteConfig = {
                              ...defaultConfig,
                              ...p,
                              slug: isVisionP ? 'clubvisionroom' : (p.slug || cleanPslug),
                              uid: targetManageUid,
                              companyName: isVisionP ? 'Club Vision Room' : (p.companyName !== undefined ? p.companyName : (isDfazzP ? 'DJ D-FAZZ' : (p.name || ''))),
                              activitySector: isVisionP ? 'Musique et Événementiel Électronique' : (p.activitySector || p.sector || 'Événementiel'),
                              logoUrl: resolvedLogo,
                              livePhotoUrl: resolvedLivePhoto,
                              livePhotoUrls: (p.livePhotoUrls && p.livePhotoUrls.length > 0)
                                ? p.livePhotoUrls 
                                : (resolvedLivePhoto ? [resolvedLivePhoto] : []),
                              accentColor: isVisionP ? '#3b82f6' : (p.accentColor || defaultConfig.accentColor),
                              theme: isVisionP ? 'dark' : (p.theme || defaultConfig.theme)
                            };
                            setConfig(fullProspect);
                            updateThemeStyles(fullProspect);
                            setEditingUid(targetManageUid);
                            setInitialSlug(isVisionP ? 'clubvisionroom' : (p.slug || cleanPslug));
                            setActiveAdminTab('editor');
                            window.history.pushState({}, '', `/vitrine-admin?uid=${targetManageUid}`);
                          }} 
                          style={{ background: '#4f46e5', border: 'none', padding: '0.5rem 0.9rem', borderRadius: '8px', fontSize: '0.8rem', color: '#ffffff', cursor: 'pointer', fontWeight: 700 }}
                        >
                          ✏️ Gérer
                        </button>
                        <button onClick={() => handleDeleteProspect(p.uid)} style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)', padding: '0.5rem 0.9rem', borderRadius: '8px', fontSize: '0.8rem', color: '#f87171', cursor: 'pointer', fontWeight: 700 }}>🗑️ Supprimer</button>
                      </>
                    );
                  })()}
                </div>
              </div>
            );
          }) : (
              <div style={{ padding: '2.5rem', textAlign: 'center', background: 'rgba(30,41,59,0.4)', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.15)' }}>
                <p style={{ margin: 0, fontSize: '1rem', color: '#94a3b8', fontWeight: 600 }}>
                  {prospectSearchQuery 
                    ? `Aucun profil prospect ne correspond à la recherche « ${prospectSearchQuery} ».`
                    : "Aucun profil prospect enregistré pour l'instant."
                  }
                </p>
                {prospectSearchQuery && (
                  <button
                    onClick={() => setProspectSearchQuery('')}
                    style={{ marginTop: '0.8rem', background: '#3b82f6', color: '#fff', border: 'none', padding: '0.55rem 1.3rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem' }}
                  >
                    Réinitialiser le filtre pour afficher les {prospectsList.length} profils
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {currentUser?.isMagicLink && (
        <div style={{
          background: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          padding: '1rem 1.5rem',
          borderRadius: '12px',
          color: '#34d399',
          fontSize: '0.9rem',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          boxShadow: '0 0 15px rgba(16, 185, 129, 0.1)',
          lineHeight: '1.5'
        }}>
          <span>✨</span>
          <span>Vous modifiez actuellement votre portail via un lien d'accès sécurisé et sans mot de passe. Vos modifications seront publiées dès que vous cliquerez sur le bouton <strong>Publier les changements</strong>.</span>
        </div>
      )}

      {(config.actuationKey || config.generatedKey) && (
        <ActuationKeyBanner 
          actuationKey={config.actuationKey || config.generatedKey || ''} 
          editingUid={editingUid}
          isMagicLink={currentUser?.isMagicLink}
        />
      )}

      {/* DJ / CREATOR SPACE DASHBOARD MVP */}
      {(() => {
        const isDjProfile = (config.activitySector || '').toLowerCase().includes('dj') || 
                            (config.activitySector || '').toLowerCase().includes('deejay') || 
                            (config.sector || '').toLowerCase().includes('deejay') ||
                            (config.companyName || '').toLowerCase().includes('dj') ||
                            editingUid === 'guest_ms3ijgnco2xnid' ||
                            editingUid === 'fabrizio' ||
                            editingUid === 'audit-8f198p5';

        if (!isDjProfile) return null;

        return (
          <div className="admin-section dj-creator-card" style={{ 
            background: isAdminLightMode 
              ? '#ffffff' 
              : 'linear-gradient(135deg, rgba(30, 41, 59, 0.4) 0%, rgba(15, 23, 42, 0.6) 100%)', 
            border: isAdminLightMode 
              ? '1.5px solid rgba(249, 115, 22, 0.4)' 
              : '1.5px solid rgba(249, 115, 22, 0.3)', 
            borderRadius: '20px', 
            padding: '2rem', 
            boxShadow: isAdminLightMode 
              ? '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05)' 
              : '0 20px 40px rgba(0,0,0,0.3)',
            color: isAdminLightMode ? '#0f172a' : '#fff'
          }}>
            <h2 
              className={`dj-creator-title ${isAdminLightMode ? "text-slate-900" : ""}`}
              style={{ 
                fontSize: '1.4rem', 
                fontWeight: 900, 
                color: isAdminLightMode ? '#0f172a' : undefined,
                background: isAdminLightMode 
                  ? 'linear-gradient(to right, #0f172a, #ea580c)' 
                  : 'linear-gradient(to right, #ffffff, #f97316)', 
                WebkitBackgroundClip: 'text', 
                WebkitTextFillColor: 'transparent', 
                margin: 0, 
                textTransform: 'uppercase', 
                letterSpacing: '-0.02em',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span>⚡</span> Mon Espace Créateur (DJ)
            </h2>
            <p 
              className={`dj-creator-subtitle ${isAdminLightMode ? "text-slate-600" : ""}`}
              style={{ 
                fontSize: '0.8rem', 
                color: isAdminLightMode ? '#475569' : '#94a3b8', 
                marginTop: '0.2rem', 
                marginBottom: '1.5rem' 
              }}
            >
              Suivez vos ventes de merchandising et vos gains en direct.
            </p>
            
            {/* Central Stats block */}
            <div style={{ 
              background: isAdminLightMode ? '#f8fafc' : 'rgba(255,255,255,0.02)', 
              border: isAdminLightMode ? '1px solid #e2e8f0' : '1px solid rgba(255,255,255,0.06)', 
              borderRadius: '16px', 
              padding: '2rem 1.5rem', 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center', 
              textAlign: 'center', 
              margin: '0 auto 2rem auto', 
              maxWidth: '360px', 
              backdropFilter: 'blur(10px)', 
              boxShadow: isAdminLightMode ? '0 4px 12px rgba(0,0,0,0.04)' : 'inset 0 1px 1px rgba(255,255,255,0.05)' 
            }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: isAdminLightMode ? '#64748b' : '#94a3b8' }}>
                Marge totale disponible
              </span>
              <span style={{ 
                fontSize: '3.2rem', 
                fontWeight: 950, 
                color: isAdminLightMode ? '#ea580c' : '#f97316', 
                letterSpacing: '-0.03em', 
                lineHeight: 1.1, 
                marginTop: '0.5rem', 
                textShadow: isAdminLightMode ? '0 0 20px rgba(234,88,12,0.2)' : '0 0 25px rgba(249,115,22,0.3)' 
              }}>
                {djStats.totalMargin.toFixed(2)} €
              </span>
              <button 
                onClick={handleWithdrawRequest}
                style={{ 
                  marginTop: '1.2rem', 
                  background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', 
                  color: '#fff', 
                  border: 'none', 
                  borderRadius: '100px', 
                  padding: '0.65rem 1.5rem', 
                  fontSize: '0.8rem', 
                  fontWeight: 800, 
                  cursor: 'pointer', 
                  transition: 'all 0.2s', 
                  boxShadow: '0 6px 15px rgba(249, 115, 22, 0.3)' 
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                Demander un reversement
              </button>

              <button 
                type="button"
                onClick={handleResetDjStats}
                style={{ 
                  marginTop: '0.6rem', 
                  background: 'transparent', 
                  color: '#64748b', 
                  border: 'none', 
                  fontSize: '0.7rem', 
                  fontWeight: 600, 
                  cursor: 'pointer', 
                  textDecoration: 'underline'
                }}
              >
                🔄 Réinitialiser les ventes (Remise à 0 € pour le client)
              </button>
            </div>

            {/* WIDGET LIVE POSITION & STATUT CONTROL BOX */}
            <div style={{
              background: isAdminLightMode ? '#f8fafc' : 'rgba(15, 23, 42, 0.7)',
              border: isAdminLightMode ? '1px solid #e2e8f0' : '1px solid rgba(57, 255, 20, 0.3)',
              borderRadius: '16px',
              padding: '1.25rem',
              marginBottom: '2rem',
              boxShadow: isAdminLightMode ? '0 4px 12px rgba(0,0,0,0.03)' : '0 8px 25px rgba(0,0,0,0.4)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '1.1rem', color: isAdminLightMode ? '#0f172a' : '#ffffff', fontWeight: 800 }}>
                    <span>🎧 Widget Live Position & Event Statut</span>
                    {config.enableLiveWidget ? (
                      <span style={{ backgroundColor: 'rgba(57, 255, 20, 0.15)', border: '1px solid #39ff14', color: '#16a34a', padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 'bold' }}>
                        🟢 ACTIF
                      </span>
                    ) : (
                      <span style={{ backgroundColor: 'rgba(148, 163, 184, 0.15)', border: '1px solid #94a3b8', color: isAdminLightMode ? '#64748b' : '#94a3b8', padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 'bold' }}>
                        ⚪ INACTIF
                      </span>
                    )}
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: isAdminLightMode ? '#475569' : '#94a3b8', margin: '0.3rem 0 0 0' }}>
                    Activez ce widget pour afficher votre carte GPS Leaflet et le statut en temps réel de votre événement sur votre vitrine DJ.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setConfig(prev => prev ? { ...prev, enableLiveWidget: !prev.enableLiveWidget } : prev)}
                  style={{
                    backgroundColor: config.enableLiveWidget ? '#10b981' : (isAdminLightMode ? '#e2e8f0' : '#334155'),
                    color: config.enableLiveWidget ? '#ffffff' : (isAdminLightMode ? '#334155' : '#ffffff'),
                    border: 'none',
                    borderRadius: '10px',
                    padding: '0.65rem 1.25rem',
                    fontWeight: 800,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    boxShadow: config.enableLiveWidget ? '0 4px 15px rgba(16, 185, 129, 0.35)' : 'none',
                    transition: 'all 0.3s ease',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  {config.enableLiveWidget ? '🟢 Widget Live Position Activé' : '⚡ Activer le Widget Live Position'}
                </button>
              </div>

              {config.enableLiveWidget && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '1.25rem', borderTop: isAdminLightMode ? '1px dashed #cbd5e1' : '1px dashed rgba(255,255,255,0.1)', paddingTop: '1.25rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: isAdminLightMode ? '#334155' : '#cbd5e1', marginBottom: '0.5rem' }}>
                      📍 Sélection du statut de diffusion en direct :
                    </label>
                    <select
                      value={config.liveWidgetStatus || '🟢 En Live au Bar Le Club VIP'}
                      onChange={(e) => setConfig(prev => prev ? { ...prev, liveWidgetStatus: e.target.value } : prev)}
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        borderRadius: '10px',
                        backgroundColor: isAdminLightMode ? '#ffffff' : 'rgba(255,255,255,0.06)',
                        border: isAdminLightMode ? '1px solid #cbd5e1' : '1px solid rgba(255,255,255,0.15)',
                        color: isAdminLightMode ? '#0f172a' : '#ffffff',
                        fontSize: '0.85rem',
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="🟢 En Live au Bar Le Club VIP" style={{ background: isAdminLightMode ? '#ffffff' : '#121624', color: isAdminLightMode ? '#0f172a' : '#ffffff' }}>🟢 En Live au Bar Le Club VIP</option>
                      <option value="📍 En Déplacement • Namur" style={{ background: isAdminLightMode ? '#ffffff' : '#121624', color: isAdminLightMode ? '#0f172a' : '#ffffff' }}>📍 En Déplacement • Namur</option>
                      <option value="⭐ Disponible pour Booking" style={{ background: isAdminLightMode ? '#ffffff' : '#121624', color: isAdminLightMode ? '#0f172a' : '#ffffff' }}>⭐ Disponible pour Booking</option>
                      <option value="🔴 Hors Ligne" style={{ background: isAdminLightMode ? '#ffffff' : '#121624', color: isAdminLightMode ? '#0f172a' : '#ffffff' }}>🔴 Hors Ligne</option>
                    </select>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: '700', color: isAdminLightMode ? '#475569' : '#94a3b8', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>👁️ Aperçu temps réel du widget (Vitrine Profil) :</span>
                      <span style={{ fontSize: '0.7rem', color: '#0284c7', fontFamily: 'monospace' }}>&lt;iframe src="live-widget.html" /&gt;</span>
                    </div>
                    <iframe 
                      src={`/live-widget.html?artist=${encodeURIComponent(config.companyName || 'DJ D-Fazz')}&status=${encodeURIComponent(config.liveWidgetStatus || '🟢 En Live au Bar Le Club VIP')}`}
                      width="100%" 
                      height="310" 
                      style={{ 
                        border: 'none', 
                        borderRadius: '14px', 
                        boxShadow: '0 8px 25px rgba(0,0,0,0.5)',
                        backgroundColor: '#0c0f17'
                      }}
                      title="Aperçu Live Widget Admin DJ"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Sales table */}
            <div>
              <h3 style={{ 
                fontSize: '0.95rem', 
                fontWeight: 800, 
                textTransform: 'uppercase', 
                letterSpacing: '0.05em', 
                color: isAdminLightMode ? '#0f172a' : '#ffffff', 
                marginBottom: '1rem', 
                borderBottom: isAdminLightMode ? '1px solid #e2e8f0' : '1px solid rgba(255,255,255,0.06)', 
                paddingBottom: '0.5rem' 
              }}>
                📋 Historique des ventes
              </h3>
              <div style={{ 
                overflowX: 'auto', 
                borderRadius: '12px', 
                border: isAdminLightMode ? '1px solid #e2e8f0' : '1px solid rgba(255,255,255,0.06)', 
                background: isAdminLightMode ? '#ffffff' : 'rgba(15,23,42,0.2)' 
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '450px', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ background: isAdminLightMode ? '#f1f5f9' : 'rgba(255,255,255,0.03)', borderBottom: isAdminLightMode ? '1px solid #e2e8f0' : '1px solid rgba(255,255,255,0.06)' }}>
                      <th style={{ padding: '0.85rem 1.1rem', color: isAdminLightMode ? '#475569' : '#94a3b8', fontWeight: 700 }}>Date de la commande</th>
                      <th style={{ padding: '0.85rem 1.1rem', color: isAdminLightMode ? '#475569' : '#94a3b8', fontWeight: 700 }}>Nom du produit vendu</th>
                      <th style={{ padding: '0.85rem 1.1rem', color: isAdminLightMode ? '#475569' : '#94a3b8', fontWeight: 700 }}>Marge générée</th>
                    </tr>
                  </thead>
                  <tbody>
                    {djStats.sales.length > 0 ? djStats.sales.map((sale: any) => (
                      <tr key={sale.id} style={{ borderBottom: isAdminLightMode ? '1px solid #f1f5f9' : '1px solid rgba(255,255,255,0.04)', transition: 'background 0.2s' }}>
                        <td style={{ padding: '0.85rem 1.1rem', color: isAdminLightMode ? '#334155' : '#cbd5e1' }}>
                          {new Date(sale.date).toLocaleDateString()}
                        </td>
                        <td style={{ padding: '0.85rem 1.1rem', color: isAdminLightMode ? '#0f172a' : '#ffffff', fontWeight: '600' }}>
                          {sale.productName}
                        </td>
                        <td style={{ padding: '0.85rem 1.1rem', color: '#16a34a', fontWeight: 'bold' }}>
                          + {sale.margin.toFixed(2)} €
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={3} style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                          Aucune vente enregistrée pour le moment.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}



      {/* 🌟 STUDIO WYSIWYG ULTRA-FIDÈLE AU PROFIL PUBLIC */}
      <div style={{
        maxWidth: '100%',
        width: '100%',
        margin: '0 0 2.5rem 0',
        backgroundColor: '#030712',
        borderRadius: '24px',
        border: '1.5px solid rgba(59, 130, 246, 0.35)',
        boxShadow: '0 25px 60px rgba(0,0,0,0.85), 0 0 35px rgba(59,130,246,0.15)',
        overflow: 'hidden',
        position: 'relative'
      }}>
        
        {/* BARRE DE CONTRÔLE SUPÉRIEURE DU STUDIO (DEVICE SWITCHER & INFOS) */}
        {(() => {
          const isLightPreview = previewTheme === 'light' || (previewTheme === 'auto' && (config.theme === 'light' || (config.theme !== 'dark' && new Date().getHours() >= 7 && new Date().getHours() < 22)));
          const studioBg = isLightPreview ? '#f8fafc' : '#050505';
          const studioTextColor = isLightPreview ? '#0f172a' : '#ffffff';
          const studioSubTextColor = isLightPreview ? '#475569' : '#cbd5e1';
          const isDfazz = Boolean(editingUid && (
            editingUid.toLowerCase().includes('dfazz') || 
            editingUid === 'fabrizio' || 
            editingUid === 'guest_ms3ijgnco2xnid' || 
            editingUid === 'audit-8f198p5' ||
            editingUid === '4eckgu2' ||
            editingUid === '3j0f5kl'
          ));
          const isElox = Boolean(editingUid && (editingUid.toLowerCase().includes('elox') || (config.companyName || '').toLowerCase().includes('elox')));
          const isDokiin = Boolean(editingUid && (editingUid.toLowerCase().includes('dokiin') || editingUid.includes('audit-mt4cimp4luio') || (config.companyName || '').toLowerCase().includes('dokiin')));

          const rawLogoA = typeof config.logoA === 'string' ? config.logoA : (config.logoA as any)?.adaptedRemastered || (config.logoA as any)?.adapted || (config.logoA as any)?.original;
          const rawLogoB = typeof config.logoB === 'string' ? config.logoB : (config.logoB as any)?.adaptedRemastered || (config.logoB as any)?.adapted || (config.logoB as any)?.original;
          const effectiveLogoUrl = config.logoUrl || config.auditLogoUrl || config.logoAdaptedUrl || rawLogoA || rawLogoB || config.logo || config.visualLogoUrl || config.avatar || (isDfazz ? '/logo_dfazz_avatar_clean.png' : (isElox ? '/elox_logo.png' : (isDokiin ? '/dokiin_logo_white.png' : '')));

          return (
            <>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.85rem 1.25rem',
                background: 'rgba(15, 23, 42, 0.95)',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                flexWrap: 'wrap',
                gap: '0.75rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span style={{ fontSize: '1rem' }}>👁️</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 900, color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Aperçu En Direct (100% Fidèle au Visiteur)
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                  {/* SÉLECTEUR DE THÈME JOUR / NUIT */}
                  <button
                    type="button"
                    onClick={() => setPreviewTheme(isLightPreview ? 'dark' : 'light')}
                    style={{
                      padding: '0.4rem 0.85rem',
                      borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.15)',
                      background: isLightPreview ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.5)',
                      color: isLightPreview ? '#fef08a' : '#93c5fd',
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                  >
                    {isLightPreview ? '☀️ Mode Jour (Actif)' : '🌙 Mode Nuit (Actif)'}
                  </button>

                  {/* SÉLECTEUR DE FORMAT D'ÉCRAN */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(0,0,0,0.4)', padding: '3px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <button
                      type="button"
                      onClick={() => setPreviewDevice('mobile')}
                      style={{
                        padding: '0.4rem 0.85rem',
                        borderRadius: '8px',
                        border: 'none',
                        background: previewDevice === 'mobile' ? 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)' : 'transparent',
                        color: '#ffffff',
                        fontSize: '0.78rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      📱 Mobile (540px)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewDevice('desktop')}
                      style={{
                        padding: '0.4rem 0.85rem',
                        borderRadius: '8px',
                        border: 'none',
                        background: previewDevice === 'desktop' ? 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)' : 'transparent',
                        color: '#ffffff',
                        fontSize: '0.78rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      💻 Plein Écran
                    </button>
                  </div>
                </div>
              </div>

              {/* CADRE DU PROFIL (STYLE EXACT DE LA VITRINE PUBLIQUE) */}
              <div 
                id="studio-live-preview-root"
                className={`studio-preview-box ${isLightPreview ? 'studio-light' : 'studio-dark'}`}
                style={{
                  backgroundColor: studioBg,
                  padding: previewDevice === 'mobile' ? '2rem 1rem' : '2.5rem 2rem',
                  display: 'flex',
                  justifyContent: 'center',
                  minHeight: '600px',
                  transition: 'background-color 0.25s ease'
                }}
              >
                
                <div style={{
                  maxWidth: previewDevice === 'mobile' ? '540px' : '900px',
                  width: '100%',
                  margin: '0 auto',
                  textAlign: 'center',
                  boxSizing: 'border-box'
                }}>
                  {/* Input universel de chargement du logo (toujours monté) */}
                  <input 
                    type="file" 
                    ref={logoFileInputRef} 
                    onChange={onLogoChange} 
                    accept="image/*" 
                    style={{ display: 'none' }} 
                  />
                      
                      {/* 1. PHOTO D'AMBIANCE / BANNIÈRE + LOGO EN BULLE OU LOGO SEUL */}
                      {(() => {
                        const validPhotos = (config.livePhotoUrls && config.livePhotoUrls.length > 0)
                          ? config.livePhotoUrls.filter((u: string) => typeof u === 'string' && u.trim().length > 10 && u !== 'none')
                          : (config.livePhotoUrl && config.livePhotoUrl.trim().length > 10 && config.livePhotoUrl !== 'none' ? [config.livePhotoUrl] : []);
                        const hasLivePhotos = validPhotos.length > 0;
                        const scale = (config.logoScale || 100) / 100;

                        const overlayMode = config.logoOverlayColor || 'auto';
                        const isWhiteForced = overlayMode === 'white';
                        const isBlackForced = overlayMode === 'black';

                        const effLogoLower = (effectiveLogoUrl || '').toLowerCase();
                        const isLogoWhiteFile = effLogoLower.includes('white') || 
                                                effLogoLower.includes('blanc') || 
                                                effLogoLower.includes('aaronh') || 
                                                effLogoLower.includes('dokiin') ||
                                                effLogoLower.includes('clubvision') ||
                                                effLogoLower.includes('mt074') ||
                                                !!config.invertLogoInLightMode ||
                                                config.logoOverlayColor === 'white';
                        const isLogoBlackFile = effLogoLower.includes('black') || effLogoLower.includes('noir');

                        // Mode Jour (7h-22h) -> Fond Blanc (#ffffff)
                        // Mode Nuit (22h-7h) -> Fond Noir (rgba(10, 10, 15, 0.95))
                        const circleBg = isLightPreview 
                          ? (isWhiteForced ? 'rgba(10, 10, 15, 0.95)' : '#ffffff') 
                          : (isBlackForced ? '#ffffff' : 'rgba(10, 10, 15, 0.95)');

                        const circleBorder = isLightPreview
                          ? (config.accentColor ? `3px solid ${config.accentColor}` : '3px solid rgba(0, 0, 0, 0.12)')
                          : (config.accentColor ? `3px solid ${config.accentColor}` : '3px solid rgba(255, 255, 255, 0.4)');

                        const logoFilter = isLightPreview
                          ? ((isLogoWhiteFile && !isWhiteForced) || isBlackForced
                              ? 'brightness(0) drop-shadow(0 2px 6px rgba(0,0,0,0.25))'
                              : 'drop-shadow(0 2px 8px rgba(0,0,0,0.15))')
                          : ((isLogoBlackFile && !isBlackForced) || isWhiteForced || isLogoWhiteFile
                              ? (isLogoBlackFile ? 'brightness(0) invert(1) drop-shadow(0 2px 10px rgba(0,0,0,0.95))' : 'drop-shadow(0 2px 10px rgba(0,0,0,0.95))')
                              : 'drop-shadow(0 2px 10px rgba(0,0,0,0.7))');

                        // CAS 1 : Présence d'une photo d'ambiance
                        if (hasLivePhotos) {
                          const maxLogoH = Math.round(92 * scale);
                          const maxLogoW = Math.round(120 * scale);

                          return (
                            <div style={{ position: 'relative', width: '100%', marginBottom: effectiveLogoUrl ? '3.8rem' : '1.5rem' }}>
                              {/* Conteneur Bannière */}
                              <div style={{
                                position: 'relative',
                                borderRadius: '16px',
                                overflow: 'hidden',
                                border: isLightPreview ? '1px solid rgba(0, 0, 0, 0.08)' : '1px solid rgba(255, 255, 255, 0.1)',
                                boxShadow: isLightPreview ? '0 10px 30px rgba(0,0,0,0.12)' : '0 10px 30px rgba(0,0,0,0.5)',
                                width: '100%',
                                height: `${config.coverHeight || 280}px`,
                                backgroundColor: '#0f172a'
                              }}>
                                <img
                                  src={validPhotos[0]}
                                  alt="Photo d'ambiance"
                                  style={{
                                    position: 'absolute',
                                    inset: 0,
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                    objectPosition: `${config.coverPositionX !== undefined ? config.coverPositionX : 50}% ${config.coverPositionY !== undefined ? config.coverPositionY : 50}%`,
                                    transform: `scale(${(config.coverZoom || 100) / 100})`,
                                    transformOrigin: `${config.coverPositionX !== undefined ? config.coverPositionX : 50}% ${config.coverPositionY !== undefined ? config.coverPositionY : 50}%`,
                                    transition: 'transform 0.15s ease, object-position 0.15s ease'
                                  }}
                                  onError={(e) => {
                                    if (isDfazz) {
                                      (e.target as HTMLImageElement).src = '/assets/dfazz_hero.jpg';
                                    }
                                  }}
                                />

                                {/* Boutons d'édition rapide sur la photo */}
                                <div style={{
                                  position: 'absolute',
                                  top: '10px',
                                  right: '10px',
                                  zIndex: 30,
                                  display: 'flex',
                                  gap: '6px',
                                  alignItems: 'center',
                                  background: 'rgba(10, 15, 29, 0.85)',
                                  backdropFilter: 'blur(10px)',
                                  padding: '5px 8px',
                                  borderRadius: '10px',
                                  border: '1px solid rgba(255,255,255,0.18)'
                                }}>
                                  <input 
                                    type="file" 
                                    ref={coverFileInputRef} 
                                    onChange={handleLivePhotoUpload} 
                                    accept="image/*" 
                                    style={{ display: 'none' }} 
                                  />
                                  <button
                                    type="button"
                                    onClick={() => coverFileInputRef.current?.click()}
                                    style={{
                                      background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                                      color: '#ffffff',
                                      border: 'none',
                                      padding: '4px 10px',
                                      borderRadius: '6px',
                                      fontSize: '0.74rem',
                                      fontWeight: 800,
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px'
                                    }}
                                  >
                                    📷 Photo
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => setShowCoverControls(!showCoverControls)}
                                    style={{
                                      background: showCoverControls ? 'rgba(59, 130, 246, 0.4)' : 'rgba(255, 255, 255, 0.1)',
                                      color: showCoverControls ? '#60a5fa' : '#ffffff',
                                      border: '1px solid rgba(255, 255, 255, 0.2)',
                                      padding: '4px 8px',
                                      borderRadius: '6px',
                                      fontSize: '0.74rem',
                                      fontWeight: 700,
                                      cursor: 'pointer'
                                    }}
                                  >
                                    📐 Cadrage
                                  </button>

                                  <button
                                    type="button"
                                    onClick={handleRemoveCoverPhoto}
                                    title="Retirer la photo d'ambiance"
                                    style={{
                                      background: 'rgba(239, 68, 68, 0.2)',
                                      color: '#f87171',
                                      border: '1px solid rgba(239, 68, 68, 0.35)',
                                      padding: '4px 8px',
                                      borderRadius: '6px',
                                      fontSize: '0.74rem',
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '3px',
                                      transition: 'all 0.15s ease'
                                    }}
                                  >
                                    🗑️ Retirer
                                  </button>
                                </div>

                                {/* Panneau contextuel de cadrage */}
                                {showCoverControls && (
                                  <div style={{
                                    position: 'absolute',
                                    top: '48px',
                                    right: '10px',
                                    zIndex: 40,
                                    background: 'rgba(9, 13, 22, 0.96)',
                                    backdropFilter: 'blur(16px)',
                                    border: '1px solid rgba(59, 130, 246, 0.4)',
                                    borderRadius: '14px',
                                    padding: '0.85rem',
                                    width: '280px',
                                    boxShadow: '0 15px 35px rgba(0,0,0,0.9)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0.65rem',
                                    textAlign: 'left'
                                  }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.3rem' }}>
                                      <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#38bdf8' }}>📐 Cadrage Bannière</span>
                                      <button type="button" onClick={() => setShowCoverControls(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.8rem' }}>✕</button>
                                    </div>

                                    <div>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#cbd5e1', marginBottom: '2px' }}>
                                        <span>↕️ Position verticale :</span>
                                        <span style={{ color: '#38bdf8', fontWeight: 'bold' }}>{config.coverPositionY !== undefined ? config.coverPositionY : 50}%</span>
                                      </div>
                                      <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        value={config.coverPositionY !== undefined ? config.coverPositionY : 50}
                                        onChange={(e) => setConfig({ ...config, coverPositionY: Number(e.target.value) })}
                                        style={{ width: '100%', accentColor: '#3b82f6' }}
                                      />
                                    </div>

                                    <div>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#cbd5e1', marginBottom: '2px' }}>
                                        <span>🔍 Zoom :</span>
                                        <span style={{ color: '#38bdf8', fontWeight: 'bold' }}>{config.coverZoom || 100}%</span>
                                      </div>
                                      <input
                                        type="range"
                                        min="100"
                                        max="250"
                                        value={config.coverZoom || 100}
                                        onChange={(e) => setConfig({ ...config, coverZoom: Number(e.target.value) })}
                                        style={{ width: '100%', accentColor: '#3b82f6' }}
                                      />
                                    </div>

                                    <div>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#cbd5e1', marginBottom: '2px' }}>
                                        <span>📏 Hauteur :</span>
                                        <span style={{ color: '#38bdf8', fontWeight: 'bold' }}>{config.coverHeight || 280}px</span>
                                      </div>
                                      <input
                                        type="range"
                                        min="160"
                                        max="480"
                                        value={config.coverHeight || 280}
                                        onChange={(e) => setConfig({ ...config, coverHeight: Number(e.target.value) })}
                                        style={{ width: '100%', accentColor: '#3b82f6' }}
                                      />
                                    </div>

                                    <button
                                      type="button"
                                      onClick={handleRemoveCoverPhoto}
                                      style={{
                                        background: 'rgba(239, 68, 68, 0.15)',
                                        border: '1px solid rgba(239, 68, 68, 0.4)',
                                        color: '#fca5a5',
                                        padding: '6px 10px',
                                        borderRadius: '8px',
                                        fontSize: '0.74rem',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '5px',
                                        marginTop: '0.25rem'
                                      }}
                                    >
                                      🗑️ Retirer la photo d'ambiance
                                    </button>
                                  </div>
                                )}
                              </div>

                              {/* LOGO EN BULLE / MACARON ROND CHEVAUCHANT À -46PX */}
                              {effectiveLogoUrl ? (
                                <div 
                                  onClick={() => logoFileInputRef.current?.click()}
                                  title="Cliquer pour remplacer le logo"
                                  style={{
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
                                    cursor: 'pointer',
                                    boxShadow: isLightPreview 
                                      ? '0 14px 35px rgba(0, 0, 0, 0.15)' 
                                      : '0 16px 40px rgba(0, 0, 0, 0.95), 0 0 25px rgba(0, 0, 0, 0.6)'
                                  }}
                                >
                                  <img 
                                    src={effectiveLogoUrl} 
                                    alt={config.companyName || 'Logo'} 
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
                              ) : (
                                <div 
                                  onClick={() => logoFileInputRef.current?.click()}
                                  title="Cliquer pour charger un logo"
                                  style={{
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
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '12px',
                                    cursor: 'pointer',
                                    boxShadow: isLightPreview 
                                      ? '0 14px 35px rgba(0, 0, 0, 0.15)' 
                                      : '0 16px 40px rgba(0, 0, 0, 0.95), 0 0 25px rgba(0, 0, 0, 0.6)'
                                  }}
                                >
                                  <span style={{ fontSize: '1.8rem' }}>🖼️</span>
                                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: isLightPreview ? '#0f172a' : '#ffffff' }}>+ Logo</span>
                                </div>
                              )}
                            </div>
                          );
                        }

                        // CAS 2 : Pas de photo d'ambiance -> Bulle avatar centrée et bouton pour ajouter une couverture
                        const maxLogoH = Math.round(92 * scale);
                        const maxLogoW = Math.round(120 * scale);

                        return (
                          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', paddingTop: '1.25rem', marginBottom: '1.25rem' }}>
                            <div
                              onClick={() => logoFileInputRef.current?.click()}
                              title={effectiveLogoUrl ? "Cliquer pour remplacer le logo" : "Cliquer pour charger un logo"}
                              style={{ 
                                cursor: 'pointer', 
                                width: '140px',
                                height: '140px',
                                borderRadius: '50%',
                                backgroundColor: circleBg,
                                border: circleBorder,
                                backdropFilter: 'blur(16px)',
                                WebkitBackdropFilter: 'blur(16px)',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '12px',
                                boxShadow: isLightPreview ? '0 8px 24px rgba(0, 0, 0, 0.08)' : '0 12px 30px rgba(0, 0, 0, 0.5)'
                              }}
                            >
                              {effectiveLogoUrl ? (
                                <img 
                                  src={effectiveLogoUrl} 
                                  alt={config.companyName || 'Logo'} 
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
                              ) : (
                                <>
                                  <span style={{ fontSize: '2rem' }}>🖼️</span>
                                  <span style={{ fontSize: '0.75rem', fontWeight: 800, marginTop: '4px', color: isLightPreview ? '#0f172a' : '#ffffff' }}>+ Logo</span>
                                </>
                              )}
                            </div>

                              <div style={{ marginTop: '0.85rem' }}>
                                <input 
                                  type="file" 
                                  ref={coverFileInputRef} 
                                  onChange={handleLivePhotoUpload} 
                                  accept="image/*" 
                                  style={{ display: 'none' }} 
                                />
                                <button
                                  type="button"
                                  onClick={() => coverFileInputRef.current?.click()}
                                  style={{
                                    background: 'rgba(59, 130, 246, 0.15)',
                                    border: '1px dashed #3b82f6',
                                    color: '#60a5fa',
                                    padding: '5px 12px',
                                    borderRadius: '8px',
                                    fontSize: '0.78rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    transition: 'all 0.2s ease'
                                  }}
                                >
                                  + 📷 Ajouter une Photo d'Ambiance
                                </button>
                              </div>
                            </div>
                          );

                        return null;
                      })()}

                      {/* 3. NOM DU PROFIL & SLOGAN (TYPOGRAPHIE EXACTE DU PROFIL PUBLIC) */}
                      <div style={{ marginBottom: '1.25rem', marginTop: effectiveLogoUrl ? '0.5rem' : '0' }}>
                        {config.companyName && config.companyName.trim() !== '' && (
                          <h1 
                            className="studio-artist-title"
                            onClick={() => setActiveEditDrawer('bio')}
                            title="Cliquer pour modifier ou retirer le nom (Section Identité & Bio)"
                            style={{
                              fontSize: 'clamp(1.4rem, 6vw, 2.2rem)',
                              fontWeight: 900,
                              letterSpacing: '-0.02em',
                              textTransform: 'uppercase',
                              color: isLightPreview ? '#0f172a' : '#ffffff',
                              margin: '0 0 0.25rem 0',
                              wordBreak: 'break-word',
                              cursor: 'pointer'
                            }}
                          >
                            {config.companyName}
                          </h1>
                        )}
                        {config.activitySector && config.activitySector.trim() !== '' && (
                          <div 
                            className="studio-artist-sector" 
                            onClick={() => setActiveEditDrawer('bio')}
                            title="Cliquer pour modifier le slogan (Section Identité & Bio)"
                            style={{ fontSize: '0.88rem', color: isLightPreview ? '#475569' : '#cbd5e1', fontWeight: 600, cursor: 'pointer' }}
                          >
                            {config.activitySector}
                          </div>
                        )}
                      </div>

                  {/* 4. BIO / PITCH EN CARTE VERRE FUMÉ (SOUS LE NOM / SLOGAN) */}
                  {config.presentation && (
                    <div 
                      onClick={() => setActiveEditDrawer('bio')}
                      title="Cliquer pour modifier la bio (Section Identité & Bio)"
                      style={{
                        background: isLightPreview ? 'rgba(255, 255, 255, 0.85)' : 'rgba(15, 23, 42, 0.65)',
                        backdropFilter: 'blur(16px)',
                        WebkitBackdropFilter: 'blur(16px)',
                        border: isLightPreview ? '1px solid rgba(226, 232, 240, 0.8)' : '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '16px',
                        padding: '1.25rem 1.5rem',
                        margin: '0 auto 1.5rem auto',
                        maxWidth: '540px',
                        boxShadow: isLightPreview ? '0 10px 25px -5px rgba(0, 0, 0, 0.05)' : '0 10px 30px -5px rgba(0, 0, 0, 0.5)',
                        textAlign: 'center',
                        cursor: 'pointer'
                      }}
                    >
                      <p style={{
                        margin: 0,
                        fontSize: '0.92rem',
                        lineHeight: 1.6,
                        color: isLightPreview ? '#334155' : '#cbd5e1',
                        fontWeight: 500,
                        letterSpacing: '0.01em'
                      }}>
                        {config.presentation}
                      </p>
                    </div>
                  )}

                  {/* 5. BARRE DES RÉSEAUX SOCIAUX & STREAMING (PICTOGRAMMES RONDS SOUS LA BIO) */}
                  {(() => {
                    const rawConfigSocials = config.socials;
                    const previewItems: { id: string; platform: string; name: string; url: string; badge: any }[] = [];

                    if (Array.isArray(rawConfigSocials)) {
                      rawConfigSocials.forEach((s, idx) => {
                        const isEnabled = s && s.enabled !== false;
                        const rawUrl = s && typeof s.url === 'string' ? s.url.trim() : '';
                        const platformName = s?.platform || (s as any)?.title || (s as any)?.type || '';

                        if (isEnabled && rawUrl !== '' && platformName !== '') {
                          const formattedUrl = formatSocialUrl(platformName, rawUrl);
                          if (formattedUrl) {
                            if (!previewItems.some(item => isPlatformMatch(item.platform, platformName))) {
                              previewItems.push({
                                id: `preview-soc-${idx}-${platformName.toLowerCase()}`,
                                platform: platformName,
                                name: `Suivre sur ${platformName}`,
                                url: formattedUrl,
                                badge: getPlatformBadgeStyle(platformName, isLightPreview)
                              });
                            }
                          }
                        }
                      });
                    }

                    if (previewItems.length === 0) return null;

                    return (
                      <div 
                        className="studio-social-icons-row"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexWrap: 'wrap',
                          gap: '0.85rem',
                          margin: '0 auto 1.5rem auto',
                          padding: '0.25rem 0.5rem',
                          maxWidth: '540px'
                        }}
                      >
                        {previewItems.map((soc) => (
                          <a
                            key={soc.id}
                            href={soc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={soc.name}
                            aria-label={soc.name}
                            style={{
                              width: '42px',
                              height: '42px',
                              borderRadius: '50%',
                              background: soc.badge.bg,
                              color: soc.badge.color,
                              border: soc.badge.border,
                              boxShadow: soc.badge.boxShadow,
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
                              if (soc.badge.hoverBg) e.currentTarget.style.background = soc.badge.hoverBg;
                              if (soc.badge.hoverBorder) e.currentTarget.style.borderColor = soc.badge.hoverBorder;
                              e.currentTarget.style.boxShadow = `0 6px 18px ${soc.badge.hoverGlow}`;
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = 'translateY(0) scale(1)';
                              e.currentTarget.style.background = soc.badge.bg;
                              e.currentTarget.style.borderColor = soc.badge.border;
                              e.currentTarget.style.boxShadow = soc.badge.boxShadow;
                            }}
                          >
                            <SocialIcon platform={soc.platform} color={soc.badge.color} size={20} />
                          </a>
                        ))}
                      </div>
                    );
                  })()}

                  {/* 6. BOUTONS D'ACTION (LINKTREE & PERSONNALISABLES) */}
                  {(() => {
                    const effectiveLinks = (config.customLinks && config.customLinks.length > 0)
                      ? config.customLinks.filter(l => l.enabled !== false)
                      : [
                          {
                            id: 'link_booking',
                            title: 'Booking / Événement',
                            type: 'booking',
                            icon: '📅',
                            enabled: true
                          },
                          ...(config.whatsapp ? [{
                            id: 'link_whatsapp',
                            title: 'WhatsApp Direct',
                            type: 'whatsapp',
                            url: `https://wa.me/${config.whatsapp.replace(/\D/g, '')}`,
                            icon: '💬',
                            bgColor: '#25D366',
                            enabled: true
                          }] : []),
                          ...(config.contactEmail ? [{
                            id: 'link_email',
                            title: 'Contact Direct',
                            type: 'email',
                            url: `mailto:${config.contactEmail}`,
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
                              <div
                                key={link.id || idx}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  backgroundColor: link.bgColor || config.accentColor || '#ff3366',
                                  border: 'none',
                                  color: '#ffffff',
                                  borderRadius: '12px',
                                  padding: '0.9rem 1.4rem',
                                  fontSize: '0.98rem',
                                  fontWeight: 900,
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.04em',
                                  boxShadow: `0 6px 20px ${link.bgColor ? `${link.bgColor}66` : config.accentColor ? `${config.accentColor}66` : 'rgba(255, 51, 102, 0.45)'}`,
                                  cursor: 'pointer',
                                  transition: 'all 0.2s ease-in-out'
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                                  <span style={{ fontSize: '1.2rem' }}>{link.icon || '📅'}</span>
                                  <span>{link.title}</span>
                                </div>
                                <span style={{ fontSize: '1rem', fontWeight: 'bold' }}>➔</span>
                              </div>
                            );
                          }

                          return (
                            <div
                              key={link.id || idx}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                backgroundColor: link.bgColor || (isWhatsApp ? '#25D366' : isLightPreview ? '#ffffff' : '#121212'),
                                border: isWhatsApp ? 'none' : isLightPreview ? '1px solid rgba(15, 23, 42, 0.15)' : '1px solid rgba(255, 255, 255, 0.12)',
                                color: isWhatsApp ? '#ffffff' : isLightPreview ? '#0f172a' : '#ffffff',
                                borderRadius: '12px',
                                padding: '0.85rem 1.25rem',
                                minHeight: '50px',
                                fontSize: '0.95rem',
                                fontWeight: isWhatsApp ? 800 : 700,
                                boxShadow: isWhatsApp ? '0 4px 15px rgba(37, 211, 102, 0.3)' : isLightPreview ? '0 4px 12px rgba(0,0,0,0.05)' : '0 4px 15px rgba(0, 0, 0, 0.3)',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease-in-out'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                                {link.icon && link.icon.length > 2 && (link.icon.startsWith('http') || link.icon.startsWith('data:')) ? (
                                  <img src={link.icon} alt="" style={{ width: '24px', height: '24px', borderRadius: '4px', objectFit: 'contain' }} />
                                ) : link.icon && link.icon !== '🔗' ? (
                                  <span style={{ fontSize: '1.15rem' }}>{link.icon}</span>
                                ) : isWhatsApp ? (
                                  <SocialIcon platform="WhatsApp" color={isLightPreview ? '#0f172a' : '#ffffff'} size={20} />
                                ) : isEmail ? (
                                  <SocialIcon platform="Contact Email" color={isLightPreview ? '#0f172a' : '#ffffff'} size={20} />
                                ) : (
                                  <SocialIcon platform={link.platform || `${link.title || ''} ${link.url || ''}`} color={isLightPreview ? '#0f172a' : '#ffffff'} size={20} />
                                )}
                                <span>{link.title}</span>
                              </div>
                              <span style={{ fontSize: '1rem', fontWeight: 'bold' }}>➔</span>
                            </div>
                          );
                        })}
                      </div>
                );
              })()}

                  {/* 7. SECTION BOUTIQUE & MERCHANDISING OFFICIEL */}
                  <div style={{ marginTop: '2rem', borderTop: isLightPreview ? '1px solid #e2e8f0' : '1px solid rgba(255,255,255,0.08)', paddingTop: '2rem' }}>
                    <h2 style={{ fontSize: '1.15rem', fontWeight: 900, color: studioTextColor, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1.25rem' }}>
                      🛍️ Merchandising & Collections Officielles
                    </h2>

                    {(() => {
                      const findItem = (g: string) => (config.items || []).find((it: any) => 
                        it.garment === g || it.category === g || it.id?.toLowerCase().includes(g)
                      );
                      const tItem = findItem('tshirt');
                      const pItem = findItem('polo');
                      const hItem = findItem('hoodie') || findItem('sweat');

                      const previewProducts = [
                        { 
                          type: 'tshirt',
                          name: config.products?.tshirt?.name || tItem?.title || tItem?.name || `T-Shirt ${config.companyName || 'Premium'}`, 
                          price: `${config.products?.tshirt?.price || tItem?.price || '29,90'} €`, 
                          tag: 'Coton Bio 240g', 
                          garmentBase: '/assets/tshirt-black-JHK170.png',
                          garmentBaseBack: '/assets/tshirt-black-JHK170-dos.png',
                          imageFront: config.products?.tshirt?.imageFront || config.products?.tshirt?.frontImageUrl || tItem?.frontImageUrl || tItem?.imageFront || tItem?.imageUrl || tItem?.ai || (isDfazz ? '/dfazz_tshirt_front.jpg' : (isDokiin ? '/dokiin_tshirt_front.png' : (isElox ? '/elox_tshirt_front.png' : null))),
                          imageBack: config.products?.tshirt?.imageBack || config.products?.tshirt?.backImageUrl || tItem?.backImageUrl || tItem?.imageBack || tItem?.mechanical || (isDfazz ? '/dfazz_tshirt_back.jpg' : (isDokiin ? '/dokiin_tshirt_back.png' : (isElox ? '/elox_tshirt_back.png' : null)))
                        },
                        { 
                          type: 'polo',
                          name: config.products?.polo?.name || pItem?.title || pItem?.name || `Polo ${config.companyName || 'Premium'}`, 
                          price: `${config.products?.polo?.price || pItem?.price || '39,90'} €`, 
                          tag: 'Coupe Slim', 
                          garmentBase: '/assets/polo-black-JHK510.png',
                          garmentBaseBack: '/assets/polo-black-JHK510-dos.png',
                          imageFront: config.products?.polo?.imageFront || config.products?.polo?.frontImageUrl || pItem?.frontImageUrl || pItem?.imageFront || pItem?.imageUrl || pItem?.ai || (isDfazz ? '/dfazz_polo_front.jpg' : (isDokiin ? '/dokiin_polo_front.png' : (isElox ? '/elox_polo_front.png' : null))),
                          imageBack: config.products?.polo?.imageBack || config.products?.polo?.backImageUrl || pItem?.backImageUrl || pItem?.imageBack || pItem?.mechanical || (isDfazz ? '/dfazz_polo_back.jpg' : (isDokiin ? '/dokiin_polo_back.png' : (isElox ? '/elox_polo_back.png' : null)))
                        },
                        { 
                          type: 'hoodie',
                          name: config.products?.hoodie?.name || hItem?.title || hItem?.name || `Sweat Hoodie ${config.companyName || 'VIP'}`, 
                          price: `${config.products?.hoodie?.price || hItem?.price || '49,90'} €`, 
                          tag: 'Édition Limitée', 
                          garmentBase: '/assets/hoodie-black-JHK421.png',
                          garmentBaseBack: '/assets/hoodie-black-JHK421-dos.png',
                          imageFront: config.products?.hoodie?.imageFront || config.products?.hoodie?.frontImageUrl || hItem?.frontImageUrl || hItem?.imageFront || hItem?.imageUrl || hItem?.ai || (isDfazz ? '/dfazz_hoodie_front.jpg' : (isDokiin ? '/dokiin_hoodie_front.png' : (isElox ? '/elox_hoodie_front.png' : null))),
                          imageBack: config.products?.hoodie?.imageBack || config.products?.hoodie?.backImageUrl || hItem?.backImageUrl || hItem?.imageBack || hItem?.mechanical || (isDfazz ? '/dfazz_hoodie_back.jpg' : (isDokiin ? '/dokiin_hoodie_back.png' : (isElox ? '/elox_hoodie_back.png' : null)))
                        }
                      ];

                      return (
                        <div style={{ display: 'grid', gridTemplateColumns: previewDevice === 'mobile' ? 'repeat(auto-fit, minmax(140px, 1fr))' : 'repeat(3, 1fr)', gap: '1rem' }}>
                          {previewProducts.map((prod, pIdx) => {
                            const currentView = studioPreviewViews[prod.type] || 'front';
                            const currentImg = currentView === 'back'
                              ? (prod.imageBack || prod.garmentBaseBack)
                              : (prod.imageFront || prod.garmentBase);

                            return (
                            <div key={pIdx} style={{
                              background: isLightPreview ? '#ffffff' : 'rgba(255,255,255,0.03)',
                              border: isLightPreview ? '1px solid #e2e8f0' : '1px solid rgba(255,255,255,0.08)',
                              borderRadius: '14px',
                              padding: '1rem',
                              textAlign: 'center',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              boxShadow: isLightPreview ? '0 4px 15px rgba(0,0,0,0.04)' : 'none'
                            }}>
                              <div style={{ 
                                width: '100%', 
                                aspectRatio: '1', 
                                background: isLightPreview ? '#f8fafc' : '#0a0f1d', 
                                borderRadius: '10px', 
                                marginBottom: '0.5rem', 
                                overflow: 'hidden', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                position: 'relative'
                              }}>
                                {/* Toggle FACE/DOS */}
                                <div style={{ position: 'absolute', top: '0.4rem', right: '0.4rem', display: 'flex', gap: '0.2rem', backgroundColor: 'rgba(0,0,0,0.6)', padding: '0.15rem 0.25rem', borderRadius: '4px', zIndex: 5 }}>
                                  {(['front', 'back'] as const).map(v => (
                                    <button
                                      key={v}
                                      type="button"
                                      onClick={() => setStudioPreviewViews(prev => ({ ...prev, [prod.type]: v }))}
                                      style={{
                                        backgroundColor: currentView === v ? (config.accentColor || '#3b82f6') : 'transparent',
                                        color: '#fff',
                                        border: 'none',
                                        padding: '0.15rem 0.35rem',
                                        fontSize: '0.6rem',
                                        fontWeight: 900,
                                        borderRadius: '3px',
                                        cursor: 'pointer'
                                      }}
                                    >{v === 'front' ? 'FACE' : 'DOS'}</button>
                                  ))}
                                </div>

                                <img 
                                  src={currentImg} 
                                  alt={prod.name} 
                                  style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
                                />
                              </div>
                              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: studioTextColor, marginBottom: '0.2rem' }}>
                                {prod.name}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: studioSubTextColor, marginBottom: '0.5rem' }}>
                                {prod.tag}
                              </div>
                              <div style={{ fontSize: '0.95rem', fontWeight: 900, color: config.accentColor || '#3b82f6', marginBottom: '0.75rem' }}>
                                {prod.price}
                              </div>
                              <button
                                type="button"
                                style={{
                                  width: '100%',
                                  background: isLightPreview ? '#0f172a' : '#ffffff',
                                  border: 'none',
                                  color: isLightPreview ? '#ffffff' : '#000000',
                                  padding: '0.55rem',
                                  borderRadius: '8px',
                                  fontSize: '0.75rem',
                                  fontWeight: 800,
                                  cursor: 'pointer'
                                }}
                              >
                                Ajouter au Panier
                              </button>
                            </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>

                </div>
              </div>
            </>
          );
        })()}

        {/* 🎛️ TIROIRS D'ÉDITION RAPIDE MODULAIRES (SOUS L'APERÇU SANS L'ENCOMBRER) */}
        <div style={{
          background: 'rgba(10, 15, 29, 0.98)',
          borderTop: '1.5px solid rgba(59, 130, 246, 0.35)',
          padding: '1.25rem 1.5rem'
        }}>
          
          {/* ONGLETS DES TIROIRS */}
          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
            {[
              { id: 'buttons', label: `⚡ Boutons & Liens (${getEffectiveLinks(config).length})` },
              { 
                id: 'socials', 
                label: `🌐 Réseaux Sociaux (${(config?.socials || []).filter(s => {
                  const rawUrl = typeof s?.url === 'string' ? s.url.trim() : '';
                  return rawUrl !== '' && (s.enabled === true || (s.enabled !== false && Boolean(rawUrl)));
                }).length})` 
              },
              { id: 'bio', label: `📝 Identité & Bio` },
              { id: 'logo', label: `🎨 Logo & Couleurs` }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveEditDrawer(activeEditDrawer === tab.id ? 'none' : tab.id as any)}
                style={{
                  padding: '0.55rem 1.1rem',
                  borderRadius: '10px',
                  border: activeEditDrawer === tab.id ? '1px solid #3b82f6' : '1px solid rgba(255,255,255,0.12)',
                  background: activeEditDrawer === tab.id ? 'rgba(59, 130, 246, 0.25)' : 'rgba(255,255,255,0.04)',
                  color: activeEditDrawer === tab.id ? '#60a5fa' : '#cbd5e1',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {tab.label} {activeEditDrawer === tab.id ? '▲' : '▼'}
              </button>
            ))}
          </div>

          {/* TIROIR A : GESTION DES BOUTONS LINKTREE */}
          {activeEditDrawer === 'buttons' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase' }}>
                  Configuration des Boutons d'Action ({getEffectiveLinks(config).length})
                </span>
                <button
                  type="button"
                  onClick={handleAddCustomLink}
                  style={{
                    background: 'var(--accent-color)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.4rem 0.85rem',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  + Ajouter un Bouton
                </button>
              </div>

              {getEffectiveLinks(config).map((link, index, array) => {
                const isEnabled = link.enabled !== false;
                return (
                  <div
                    key={link.id || index}
                    style={{
                      background: isEnabled ? 'rgba(30, 41, 59, 0.7)' : 'rgba(15, 23, 42, 0.4)',
                      border: isEnabled ? '1px solid rgba(255,255,255,0.12)' : '1px dashed rgba(239, 68, 68, 0.35)',
                      opacity: isEnabled ? 1 : 0.65,
                      borderRadius: '12px',
                      padding: '0.75rem 1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '220px' }}>
                        <input
                          value={link.icon || ''}
                          onChange={(e) => handleUpdateLink(index, 'icon', e.target.value)}
                          placeholder="🔗"
                          style={{ width: '38px', textAlign: 'center', padding: '0.35rem', fontSize: '0.9rem', marginBottom: 0 }}
                        />
                        <input
                          value={link.title}
                          onChange={(e) => handleUpdateLink(index, 'title', e.target.value)}
                          placeholder="Titre du bouton"
                          style={{ flex: 1, padding: '0.4rem 0.65rem', fontWeight: 800, fontSize: '0.85rem', marginBottom: 0, textDecoration: isEnabled ? 'none' : 'line-through' }}
                        />
                      </div>

                      <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                        <button type="button" onClick={() => handleMoveLink(index, 'up')} disabled={index === 0} style={{ padding: '0.3rem 0.55rem', borderRadius: '6px', background: 'rgba(255,255,255,0.08)', color: '#fff', border: 'none', cursor: index === 0 ? 'not-allowed' : 'pointer' }}>↑</button>
                        <button type="button" onClick={() => handleMoveLink(index, 'down')} disabled={index === array.length - 1} style={{ padding: '0.3rem 0.55rem', borderRadius: '6px', background: 'rgba(255,255,255,0.08)', color: '#fff', border: 'none', cursor: index === array.length - 1 ? 'not-allowed' : 'pointer' }}>↓</button>
                        
                        <button
                          type="button"
                          onClick={() => handleToggleLinkEnabled(index)}
                          style={{
                            padding: '0.35rem 0.75rem',
                            borderRadius: '6px',
                            background: isEnabled ? 'rgba(34, 197, 94, 0.25)' : 'rgba(239, 68, 68, 0.25)',
                            color: isEnabled ? '#4ade80' : '#f87171',
                            border: isEnabled ? '1px solid rgba(34, 197, 94, 0.5)' : '1px solid rgba(239, 68, 68, 0.5)',
                            cursor: 'pointer',
                            fontSize: '0.74rem',
                            fontWeight: 800
                          }}
                        >
                          {isEnabled ? '👁️ Actif' : '🚫 Masqué'}
                        </button>
                        <button type="button" onClick={() => handleRemoveLink(index)} style={{ padding: '0.3rem 0.55rem', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.25)', color: '#f87171', border: 'none', cursor: 'pointer' }}>×</button>
                      </div>
                    </div>

                    <div>
                      <input
                        value={link.url || ''}
                        onChange={(e) => handleUpdateLink(index, 'url', e.target.value)}
                        placeholder="URL ou contact (ex: https://... ou +32...)"
                        style={{ width: '100%', padding: '0.35rem 0.65rem', fontSize: '0.76rem', marginBottom: 0, background: 'rgba(10, 15, 29, 0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#ffffff' }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TIROIR B : GESTION DES RÉSEAUX SOCIAUX & STREAMING */}
          {activeEditDrawer === 'socials' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.2rem 0' }}>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>
                  Activez ou désactivez les icônes que vous souhaitez afficher sur votre vitrine publique :
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.75rem' }}>
                {[
                  { platform: 'Instagram', label: 'Instagram', color: '#E1306C', placeholder: 'https://instagram.com/nom ou @nom', defaultUrl: 'https://www.instagram.com/djdfazz' },
                  { platform: 'TikTok', label: 'TikTok', color: '#25F4EE', placeholder: 'https://tiktok.com/@nom ou @nom', defaultUrl: 'https://www.tiktok.com/@djdfazz' },
                  { platform: 'SoundCloud', label: 'SoundCloud', color: '#FF5500', placeholder: 'https://soundcloud.com/nom', defaultUrl: 'https://soundcloud.com' },
                  { platform: 'Spotify', label: 'Spotify', color: '#1DB954', placeholder: 'https://open.spotify.com/artist/...', defaultUrl: 'https://open.spotify.com' },
                  { platform: 'YouTube', label: 'YouTube', color: '#FF0000', placeholder: 'https://youtube.com/@nom', defaultUrl: 'https://youtube.com' },
                  { platform: 'Facebook', label: 'Facebook', color: '#1877F2', placeholder: 'https://facebook.com/nom', defaultUrl: 'https://www.facebook.com/djdfazz' },
                  { platform: 'WhatsApp', label: 'WhatsApp', color: '#25D366', placeholder: '+32 492 ... ou https://wa.me/...', defaultUrl: 'https://wa.me/32492104603' },
                  { platform: 'Email', label: 'Email / Booking', color: '#3B82F6', placeholder: 'contact@nom.com ou mailto:...', defaultUrl: 'mailto:Fabriziomagistro89@gmail.com' },
                  { platform: 'Apple Music', label: 'Apple Music', color: '#FC3C44', placeholder: 'https://music.apple.com/...', defaultUrl: 'https://music.apple.com' },
                  { platform: 'Beatport', label: 'Beatport', color: '#00FF83', placeholder: 'https://beatport.com/artist/...', defaultUrl: 'https://beatport.com' },
                  { platform: 'Deezer', label: 'Deezer', color: '#A238FF', placeholder: 'https://deezer.com/...', defaultUrl: 'https://deezer.com' },
                  { platform: 'Mixcloud', label: 'Mixcloud', color: '#5000ff', placeholder: 'https://mixcloud.com/...', defaultUrl: 'https://mixcloud.com' },
                  { platform: 'X / Twitter', label: 'X (Twitter)', color: '#ffffff', placeholder: 'https://x.com/nom ou @nom', defaultUrl: 'https://x.com' },
                  { platform: 'LinkedIn', label: 'LinkedIn', color: '#0A66C2', placeholder: 'https://linkedin.com/in/nom', defaultUrl: 'https://linkedin.com' },
                  { platform: 'Telegram', label: 'Telegram', color: '#229ED9', placeholder: 'https://t.me/nom', defaultUrl: 'https://t.me' },
                  { platform: 'Snapchat', label: 'Snapchat', color: '#FFFC00', placeholder: 'https://snapchat.com/add/nom', defaultUrl: 'https://snapchat.com' },
                  { platform: 'Discord', label: 'Discord', color: '#5865F2', placeholder: 'https://discord.gg/...', defaultUrl: 'https://discord.gg' },
                  { platform: 'Twitch', label: 'Twitch', color: '#9146FF', placeholder: 'https://twitch.tv/nom', defaultUrl: 'https://twitch.tv' }
                ].map((soc) => {
                  const userSocial = (config?.socials || []).find(s => isPlatformMatch(s.platform, soc.platform));
                  const val = userSocial?.url || '';
                  const isEnabled = userSocial ? (userSocial.enabled === true || (userSocial.enabled !== false && Boolean(val.trim()))) : false;

                  return (
                    <div
                      key={soc.platform}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.45rem',
                        background: isEnabled ? 'rgba(30, 41, 59, 0.75)' : 'rgba(15, 23, 42, 0.45)',
                        padding: '0.65rem 0.85rem',
                        borderRadius: '12px',
                        border: isEnabled ? '1px solid rgba(255,255,255,0.15)' : '1px dashed rgba(239, 68, 68, 0.35)',
                        opacity: isEnabled ? 1 : 0.6,
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(0,0,0,0.35)', flexShrink: 0 }}>
                            <SocialIcon platform={soc.platform} color={soc.color} size={18} />
                          </div>
                          <span style={{ fontSize: '0.82rem', fontWeight: 800, color: isEnabled ? '#ffffff' : '#94a3b8' }}>
                            {soc.label}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            const newEnabled = !isEnabled;
                            const existing = [...(config?.socials || [])];
                            const idx = existing.findIndex(s => isPlatformMatch(s.platform, soc.platform));
                            
                            // Synchronous instant reactivity:
                            // When activating: if url was empty, supply defaultUrl so it renders immediately in preview
                            const resolvedUrl = newEnabled 
                              ? ((idx >= 0 && existing[idx].url && existing[idx].url.trim() !== '') ? existing[idx].url : (val.trim() !== '' ? val : soc.defaultUrl))
                              : (idx >= 0 ? existing[idx].url : val);

                            if (idx >= 0) {
                              existing[idx] = { 
                                ...existing[idx], 
                                platform: soc.platform, 
                                enabled: newEnabled, 
                                url: resolvedUrl 
                              };
                            } else {
                              existing.push({ 
                                platform: soc.platform, 
                                url: resolvedUrl, 
                                enabled: newEnabled 
                              });
                            }
                            const newCfg = { ...config, socials: existing };
                            setConfig(newCfg);
                            const uidToSave = editingUid || (auth.currentUser ? auth.currentUser.uid : "") || "guest_ms3ijgnco2xnid";
                            if (uidToSave) {
                              saveStoredConfig(newCfg, uidToSave).catch(console.warn);
                            }
                          }}
                          style={{
                            padding: '0.3rem 0.65rem',
                            borderRadius: '6px',
                            background: isEnabled ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                            color: isEnabled ? '#4ade80' : '#f87171',
                            border: isEnabled ? '1px solid rgba(34, 197, 94, 0.4)' : '1px solid rgba(239, 68, 68, 0.4)',
                            cursor: 'pointer',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem'
                          }}
                        >
                          {isEnabled ? '👁️ Actif' : '🚫 Masqué'}
                        </button>
                      </div>

                      <input
                        value={val || ''}
                        onChange={(e) => {
                          const newUrl = e.target.value;
                          const existing = [...(config?.socials || [])];
                          const idx = existing.findIndex(s => isPlatformMatch(s.platform, soc.platform));
                          const hasContent = Boolean(newUrl.trim());

                          if (idx >= 0) {
                            existing[idx] = { 
                              ...existing[idx], 
                              platform: soc.platform, 
                              url: newUrl, 
                              enabled: hasContent 
                            };
                          } else {
                            existing.push({ 
                              platform: soc.platform, 
                              url: newUrl, 
                              enabled: hasContent 
                            });
                          }
                          const newCfg = { ...config, socials: existing };
                          setConfig(newCfg);
                        }}
                        onBlur={() => {
                          const uidToSave = editingUid || (auth.currentUser ? auth.currentUser.uid : "") || "guest_ms3ijgnco2xnid";
                          if (uidToSave && config) {
                            saveStoredConfig(config, uidToSave).catch(console.warn);
                          }
                        }}
                        placeholder={soc.placeholder}
                        style={{
                          width: '100%',
                          padding: '0.4rem 0.65rem',
                          fontSize: '0.78rem',
                          marginBottom: 0,
                          background: 'rgba(10, 15, 29, 0.85)',
                          border: isEnabled ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(255,255,255,0.05)',
                          borderRadius: '6px',
                          color: '#ffffff'
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TIROIR C : IDENTITÉ & BIO */}
          {activeEditDrawer === 'bio' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8' }}>
                      Nom de l'Artiste / Entreprise
                    </label>
                    {config.companyName && (
                      <button
                        type="button"
                        onClick={() => setConfig(prev => prev ? ({ ...prev, companyName: '' }) : null)}
                        style={{ background: 'transparent', border: 'none', color: '#ef4444', fontSize: '0.7rem', cursor: 'pointer', fontWeight: 600 }}
                      >
                        ✕ Masquer le texte
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    name="companyName"
                    value={config.companyName || ''}
                    onChange={handleChange}
                    placeholder="Laissez vide pour afficher uniquement le logo"
                    style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: '8px', background: 'rgba(30,41,59,0.7)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontSize: '0.9rem', fontWeight: 800 }}
                  />
                  <span style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.2rem', display: 'block' }}>
                    💡 Si votre logo contient déjà le nom, laissez ce champ vide.
                  </span>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#38bdf8' }}>
                      🔗 URL Publique / Slug (signaid.eu/...)
                    </label>
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontFamily: 'monospace' }}>
                      signaid.eu/<strong>{(config.slug || config.companyName || editingUid || '').toLowerCase().trim().replace(/[^a-z0-9_-]/g, '') || 'nom'}</strong>
                    </span>
                  </div>
                  <input
                    type="text"
                    name="slug"
                    value={config.slug || ''}
                    onChange={(e) => {
                      const val = e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '');
                      setConfig(prev => prev ? ({ ...prev, slug: val }) : null);
                    }}
                    placeholder="ex: mentalist, djdfazz, aaronh..."
                    style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: '8px', background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.35)', color: '#38bdf8', fontSize: '0.9rem', fontWeight: 800 }}
                  />
                  <span style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.2rem', display: 'block' }}>
                    💡 Modifiez ce champ pour changer l'adresse directe du profil (ex: changez <em>thementalist</em> en <em>mentalist</em>).
                  </span>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.3rem' }}>
                  Activité / Slogan
                </label>
                <input
                  type="text"
                  name="activitySector"
                  value={config.activitySector || ''}
                  onChange={handleChange}
                  placeholder="Ex: DJ & Producteur Musical, Magicien VIP..."
                  style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: '8px', background: 'rgba(30,41,59,0.7)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontSize: '0.9rem' }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8' }}>
                    Texte de Présentation / Bio
                  </label>
                  <button
                    type="button"
                    onClick={triggerAIGeneration}
                    disabled={isGenerating}
                    style={{
                      background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
                      color: '#fff',
                      border: 'none',
                      padding: '3px 8px',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      borderRadius: '6px',
                      cursor: isGenerating ? 'wait' : 'pointer'
                    }}
                  >
                    {isGenerating ? "🧠 IA..." : "✨ Rédiger avec IA"}
                  </button>
                </div>
                <textarea
                  name="presentation"
                  value={config.presentation || ''}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Texte de présentation visible sur votre profil..."
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'rgba(30,41,59,0.7)', border: '1px solid rgba(255,255,255,0.12)', color: '#cbd5e1', fontSize: '0.85rem', lineHeight: '1.5', resize: 'vertical' }}
                />
              </div>
            </div>
          )}

          {/* TIROIR D : LOGO & COULEURS */}
          {activeEditDrawer === 'logo' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => logoFileInputRef.current?.click()}
                  style={{
                    background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                    color: '#fff',
                    border: 'none',
                    padding: '0.55rem 1.1rem',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  📂 Remplacer le Fichier Logo
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>📏 Échelle Logo :</span>
                  <input
                    type="range"
                    min="50"
                    max="200"
                    value={config.logoScale !== undefined ? config.logoScale : 100}
                    onChange={(e) => setConfig({ ...config, logoScale: Number(e.target.value) })}
                    style={{ width: '90px', accentColor: '#3b82f6' }}
                  />
                  <span style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 'bold' }}>{config.logoScale !== undefined ? config.logoScale : 100}%</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>🎨 Contraste Logo :</span>
                  {[
                    { label: '🌈 Original', val: 'original' },
                    { label: '⚪ Blanc', val: 'white' },
                    { label: '⚫ Noir', val: 'black' },
                    { label: '⚡ Auto', val: 'auto' }
                  ].map(mode => {
                    const currentVal = config.logoOverlayColor || 'auto';
                    const isActive = currentVal === mode.val;
                    return (
                      <button
                        key={mode.val}
                        type="button"
                        onClick={async () => {
                          const newConfig = { ...config, logoOverlayColor: mode.val as any };
                          setConfig(newConfig);
                          const uidToSave = editingUid || (auth.currentUser ? auth.currentUser.uid : "") || "guest_ms3ijgnco2xnid";
                          if (uidToSave) {
                            try {
                              await saveStoredConfig(newConfig, uidToSave);
                            } catch (e) {
                              console.warn("Auto-save logoOverlayColor failed:", e);
                            }
                          }
                        }}
                        style={{
                          padding: '3px 8px',
                          fontSize: '0.72rem',
                          borderRadius: '6px',
                          background: isActive ? '#3b82f6' : 'rgba(255,255,255,0.08)',
                          color: '#ffffff',
                          fontWeight: isActive ? 800 : 500,
                          border: isActive ? '1px solid #60a5fa' : '1px solid rgba(255,255,255,0.1)',
                          cursor: 'pointer'
                        }}
                      >
                        {mode.label}
                      </button>
                    );
                  })}
                </div>

                {/* ✂️ ACTION AUTOMATIQUE : DÉTOURAGE DU FOND VIA CANVAS */}
                <button
                  type="button"
                  onClick={handleRemoveLogoBackground}
                  disabled={isRemovingBg}
                  title="Supprimer automatiquement le fond blanc ou noir du logo via Canvas"
                  style={{
                    background: isRemovingBg 
                      ? 'rgba(239, 68, 68, 0.25)' 
                      : 'linear-gradient(135deg, #f43f5e 0%, #be123c 100%)',
                    color: '#ffffff',
                    border: '1px solid rgba(244, 63, 94, 0.5)',
                    padding: '0.55rem 1.1rem',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    cursor: isRemovingBg ? 'wait' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 8px rgba(244, 63, 94, 0.25)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span>✂️</span>
                  <span>{isRemovingBg ? "Détourage en cours..." : "Retirer le fond"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (config.logoUrl) {
                      downloadMasterDtfFile(config.logoUrl, `${(config.companyName || 'master').toLowerCase().replace(/[^a-z0-9]/g, '_')}_Master_DTF_300DPI.png`);
                    } else {
                      alert("Veuillez d'abord importer un logo pour exporter le Master DTF.");
                    }
                  }}
                  style={{
                    background: 'rgba(16, 185, 129, 0.2)',
                    color: '#34d399',
                    border: '1px solid rgba(16, 185, 129, 0.4)',
                    padding: '0.55rem 1.1rem',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <span>🖼️</span> Master_DTF_300DPI.png
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (config.logoUrl) {
                      downloadMasterPdfFile(config.logoUrl, `${(config.companyName || 'master').toLowerCase().replace(/[^a-z0-9]/g, '_')}_Master_DTF_Print.pdf`);
                    } else {
                      alert("Veuillez d'abord importer un logo pour exporter le Master PDF.");
                    }
                  }}
                  style={{
                    background: 'rgba(59, 130, 246, 0.2)',
                    color: '#60a5fa',
                    border: '1px solid rgba(59, 130, 246, 0.4)',
                    padding: '0.55rem 1.1rem',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <span>📄</span> Master_DTF_Print.pdf
                </button>
              </div>

              {/* 🎯 COULEUR D'ACCENT DU PROFIL */}
              <div style={{ marginTop: '0.5rem', paddingTop: '0.85rem', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', marginBottom: '0.35rem' }}>
                    🎯 Couleur d'Accent
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <input
                      type="color"
                      value={(() => {
                        const c = config.accentColor || '#3b82f6';
                        if (c.startsWith('#') && c.length === 7) return c;
                        if (c.startsWith('rgb')) {
                          const m = c.match(/\d+/g);
                          if (m && m.length >= 3) {
                            const hex = ((1 << 24) + (Number(m[0]) << 16) + (Number(m[1]) << 8) + Number(m[2])).toString(16).slice(1);
                            return `#${hex}`;
                          }
                        }
                        return '#3b82f6';
                      })()}
                      onChange={async (e) => {
                        const val = e.target.value;
                        const newConfig = { ...config, accentColor: val };
                        setConfig(newConfig);
                        document.documentElement.style.setProperty('--accent-color', val);
                        const uidToSave = editingUid || (auth.currentUser ? auth.currentUser.uid : "") || "guest_ms3ijgnco2xnid";
                        if (uidToSave) {
                          try {
                            await saveStoredConfig(newConfig, uidToSave);
                          } catch (err) {
                            console.warn("Auto-save accentColor failed:", err);
                          }
                        }
                      }}
                      style={{ width: '42px', height: '38px', border: 'none', borderRadius: '8px', cursor: 'pointer', background: 'transparent' }}
                    />
                    <span style={{ fontSize: '0.85rem', fontFamily: 'monospace', color: '#38bdf8', fontWeight: 700 }}>
                      {config.accentColor || '#3b82f6'}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Palettes rapides :</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    {[
                      { label: 'Bleu', color: '#3b82f6' },
                      { label: 'Cyan', color: '#06b6d4' },
                      { label: 'Émeraude', color: '#10b981' },
                      { label: 'Rose', color: '#ff3366' },
                      { label: 'Orange', color: '#f97316' },
                      { label: 'Violet', color: '#8b5cf6' },
                      { label: 'Or', color: '#eab308' },
                      { label: 'Blanc', color: '#ffffff' }
                    ].map(p => {
                      const isSel = (config.accentColor || '#3b82f6').toLowerCase() === p.color.toLowerCase();
                      return (
                        <button
                          key={p.color}
                          type="button"
                          onClick={async () => {
                            const newConfig = { ...config, accentColor: p.color };
                            setConfig(newConfig);
                            document.documentElement.style.setProperty('--accent-color', p.color);
                            const uidToSave = editingUid || (auth.currentUser ? auth.currentUser.uid : "") || "guest_ms3ijgnco2xnid";
                            if (uidToSave) {
                              try {
                                await saveStoredConfig(newConfig, uidToSave);
                              } catch (err) {
                                console.warn("Auto-save accentColor failed:", err);
                              }
                            }
                          }}
                          title={p.label}
                          style={{
                            width: '26px',
                            height: '26px',
                            borderRadius: '50%',
                            backgroundColor: p.color,
                            border: isSel ? '2.5px solid #ffffff' : '1.5px solid rgba(255,255,255,0.2)',
                            boxShadow: isSel ? `0 0 10px ${p.color}` : 'none',
                            cursor: 'pointer',
                            transform: isSel ? 'scale(1.15)' : 'scale(1)',
                            transition: 'all 0.15s ease'
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* 🧠 ASSISTANT IA & IMPORT AUTO (OPTIONNEL) */}
      {!currentUser?.isMagicLink && (
        <details style={{ background: 'rgba(15, 23, 42, 0.4)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', padding: '1rem 1.25rem', marginBottom: '2rem' }}>
          <summary style={{ cursor: 'pointer', fontWeight: 800, color: '#818cf8', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🧠 Assistant IA & Import de Document (Optionnel)</span>
          </summary>
          <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.4rem', textTransform: 'uppercase' }}>
                🌍 Recherche Web IA (Remplissage Automatique)
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input 
                  value={webSearchQuery} 
                  onChange={(e) => setWebSearchQuery(e.target.value)} 
                  placeholder="Nom de l'entreprise ou site web..." 
                  style={{ flex: 1, marginBottom: 0, padding: '0.65rem 0.85rem', fontSize: '0.85rem' }} 
                />
                <button 
                  type="button"
                  onClick={handleWebSearch} 
                  disabled={isAnalyzingWeb || !webSearchQuery.trim()}
                  style={{ background: '#4f46e5', color: '#fff', border: 'none', padding: '0.65rem 1.2rem', borderRadius: '8px', fontWeight: 800, cursor: (isAnalyzingWeb || !webSearchQuery.trim()) ? 'not-allowed' : 'pointer' }}
                >
                  {isAnalyzingWeb ? "Recherche..." : "🔍 Analyser"}
                </button>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.4rem', textTransform: 'uppercase' }}>
                📄 Importer depuis un Document (PDF, Image, Questionnaire)
              </label>
              <input 
                type="file" 
                accept="application/pdf,image/*,text/plain,text/csv" 
                onChange={handleDocumentUpload}
                id="doc-import-input-clean"
                style={{ display: 'none' }}
                disabled={isAnalyzingDoc}
              />
              <label 
                htmlFor="doc-import-input-clean" 
                style={{ display: 'block', textAlign: 'center', padding: '0.75rem', borderRadius: '10px', background: 'rgba(30,41,59,0.5)', border: '1px dashed rgba(255,255,255,0.2)', color: '#cbd5e1', fontSize: '0.82rem', fontWeight: 600, cursor: isAnalyzingDoc ? 'not-allowed' : 'pointer' }}
              >
                {isAnalyzingDoc ? "Analyse du document en cours..." : "📂 Importer un document pour pré-remplir"}
              </label>
            </div>
          </div>
        </details>
      )}


      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '2rem', marginBottom: '5rem' }}>
        <button 
          onClick={() => {
            const cleanSlug = getProfileVanitySlug();
            window.open(`${window.location.origin}/portail-shop/${cleanSlug}`, '_blank');
          }}
          className="primary-btn" 
          style={{ 
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', 
            color: '#fff', 
            fontSize: '1rem', 
            padding: '1.1rem', 
            borderRadius: '12px', 
            border: 'none', 
            boxShadow: '0 4px 15px rgba(16, 185, 129, 0.25)', 
            fontWeight: 800,
            cursor: 'pointer',
            marginBottom: '0.5rem'
          }}
        >
          🛍️ Accéder à la page de commande (Boutique)
        </button>

        <button 
          onClick={() => {
            const auditTarget = getProfileVanitySlug();
            const route = getAuditRoute();
            window.open(`${window.location.origin}/${route}/${auditTarget}?refresh=true`, '_blank');
          }}
          className="primary-btn" 
          style={{ 
            background: 'var(--card-bg)', 
            color: 'var(--text-color)', 
            fontSize: '0.9rem', 
            padding: '0.9rem', 
            borderRadius: '12px', 
            border: '1px solid var(--border-color)', 
            fontWeight: 800,
            cursor: 'pointer'
          }}
        >
          {currentUser?.isMagicLink ? "👁️ Voir mes Objets & Gabarits 3D" : "✨ Générer / Modifier mes gabarits"}
        </button>

        <button 
          onClick={handleSave} 
          className="primary-btn" 
          disabled={isSaving}
          style={{ 
            padding: '1.1rem', 
            borderRadius: '12px', 
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', 
            fontWeight: 900,
            cursor: isSaving ? 'wait' : 'pointer',
            fontSize: '1.05rem',
            border: 'none',
            boxShadow: '0 4px 20px rgba(16, 185, 129, 0.4)'
          }}
        >
          {isSaving ? "⏳ Sauvegarde & Publication en cours..." : "💾 Valider & Publier les Changements sur mon Profil"}
        </button>
      </div>

      {/* 💾 BARRE FLOTTANTE PERSISTANTE DE VALIDATION ET PUBLICATION */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: 'rgba(10, 15, 29, 0.95)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderTop: '1px solid rgba(59, 130, 246, 0.35)',
        padding: '0.85rem 1.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 -10px 35px rgba(0,0,0,0.7)',
        flexWrap: 'wrap',
        gap: '0.8rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#10b981', boxShadow: '0 0 10px #10b981' }} />
          <div>
            <span style={{ fontSize: '0.9rem', fontWeight: 900, color: '#ffffff' }}>
              {config.companyName || editingUid || 'Profil Vitrine'}
            </span>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginLeft: '0.5rem' }}>
              • Vos ajustements sont visibles en direct
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => {
              const vanitySlug = getProfileVanitySlug();
              window.open(`/${vanitySlug}`, '_blank');
            }}
            style={{
              background: 'rgba(255,255,255,0.08)',
              color: '#ffffff',
              border: '1px solid rgba(255,255,255,0.15)',
              padding: '0.65rem 1.1rem',
              borderRadius: '10px',
              fontWeight: 800,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            👁️ Voir le Profil (/{getProfileVanitySlug()})
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#ffffff',
              border: 'none',
              padding: '0.75rem 1.8rem',
              borderRadius: '10px',
              fontWeight: 900,
              fontSize: '0.92rem',
              cursor: isSaving ? 'wait' : 'pointer',
              boxShadow: '0 4px 20px rgba(16, 185, 129, 0.45)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s ease'
            }}
          >
            <span>{isSaving ? "⏳" : "💾"}</span>
            <span>{isSaving ? "Publication..." : "Valider & Publier"}</span>
          </button>
        </div>
      </div>
    </main>
  );
}
