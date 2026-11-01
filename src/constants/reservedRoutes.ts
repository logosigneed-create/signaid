/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Liste stricte des routes système et mots réservés de la plateforme Signaid / Dropper.
 * Aucun profil/événement public ne peut utiliser ces identifiants au premier niveau.
 */

export const RESERVED_SYSTEM_ROUTES = [
  '',
  'studio',
  'creer-profil',
  'customizer',
  'admin',
  'audit',
  'dropper',
  'hub',
  'shop',
  'api',
  'login',
  'assets',
  'favicon.ico',
  'composer',
  'generator',
  'atelier',
  'workshop',
  'auth',
  'e',
  'event',
  'events',
  'scan',
  'models',
  'demo',
  'fonts',
  'icons',
  'images',
  'ads.txt',
  'app-ads.txt',
  'robots.txt',
  'manifest.json',
  'sitemap.xml',
] as const;

export const RESERVED_SYSTEM_ROUTES_SET = new Set<string>(
  RESERVED_SYSTEM_ROUTES.map((r) => r.toLowerCase())
);

/**
 * Vérifie si un segment d'URL correspond à une route ou ressource système réservée.
 */
export function isReservedSlug(slug: string | null | undefined): boolean {
  if (!slug) return true;
  const clean = slug
    .toLowerCase()
    .trim()
    .replace(/^\/+|\/+$/g, '')
    .split('/')[0]
    .split('?')[0];
  return RESERVED_SYSTEM_ROUTES_SET.has(clean);
}

/**
 * Normalise un slug pour la recherche en base Firestore
 */
export function sanitizeSlug(rawSlug: string | null | undefined): string {
  if (!rawSlug) return '';
  return rawSlug
    .toLowerCase()
    .trim()
    .replace(/^\/+|\/+$/g, '')
    .split('/')[0]
    .split('?')[0]
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
