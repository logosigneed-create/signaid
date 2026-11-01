/**
 * Cache-busting utility for Firebase Storage & BTP Mockup assets.
 * Appends dynamic session or on-demand timestamps to URLs (?v=...)
 * to ensure fresh asset downloads after storage overwrites.
 */

const getStoredSessionBuster = (): number => {
  if (typeof window === 'undefined') return 1;
  try {
    const existing = sessionStorage.getItem('signaid_asset_session_v');
    if (existing) {
      const parsed = parseInt(existing, 10);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    const now = Date.now();
    sessionStorage.setItem('signaid_asset_session_v', String(now));
    return now;
  } catch {
    return Date.now();
  }
};

let currentSessionBuster: number = getStoredSessionBuster();

/**
 * Returns current session timestamp.
 */
export function getSessionCacheBuster(): number {
  return currentSessionBuster;
}

/**
 * Refreshes session timestamp to force fresh downloads.
 */
export function refreshSessionCacheBuster(): number {
  currentSessionBuster = Date.now();
  try {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('signaid_asset_session_v', String(currentSessionBuster));
    }
  } catch {}
  return currentSessionBuster;
}

/**
 * Appends or updates dynamic cache buster parameter (?v=...) on storage URLs.
 */
export function withCacheBust(url?: string | null, customBuster?: number | string): string {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed || trimmed.startsWith('data:') || trimmed.startsWith('blob:')) return trimmed;

  // Cache busting is applied to remote storage and mockup assets
  const isTargetUrl = trimmed.includes('firebasestorage.googleapis.com') ||
                      trimmed.includes('storage.googleapis.com') ||
                      trimmed.includes('btp_mockups');

  if (!isTargetUrl) return trimmed;

  const buster = customBuster || currentSessionBuster;
  if (/[?&]v=/.test(trimmed)) {
    return trimmed.replace(/([?&]v=)[^&]+/, `$1${buster}`);
  }
  const sep = trimmed.includes('?') ? '&' : '?';
  return `${trimmed}${sep}v=${buster}`;
}
