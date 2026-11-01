/**
 * Utilitaires de suivi Google Analytics 4
 * ID de Mesure : G-ETTQHRF6FP
 * Permet un tracking asynchrone et résilient même si les scripts tiers sont bloqués.
 */

export const GA_MEASUREMENT_ID = 'G-ETTQHRF6FP';

/**
 * Envoie un événement de page_view à Google Analytics
 */
export const trackPageView = (path: string, title?: string) => {
  if (typeof window === 'undefined') return;
  if (typeof window.gtag === 'function') {
    window.gtag('event', 'page_view', {
      page_path: path,
      page_location: window.location.href,
      page_title: title || document.title,
      send_to: GA_MEASUREMENT_ID,
    });
  }
};

/**
 * Envoie un événement personnalisé à Google Analytics
 */
export const trackEvent = (action: string, params?: Record<string, any>) => {
  if (typeof window === 'undefined') return;
  if (typeof window.gtag === 'function') {
    window.gtag('event', action, params);
  }
};
