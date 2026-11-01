/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Droppaid.ai / Signaid - Gemini 3.8 Flash Vision Segmentation Service
 * Isole le sujet principal au premier plan et convertit le polygone normalisé (0-1000).
 */

export interface PolygonPoint {
  x: number;
  y: number;
}

export interface SegmentSubjectResult {
  subjects: Array<{
    polygon: PolygonPoint[];
  }>;
}

export interface SegmentSubjectResponse {
  success: boolean;
  data: SegmentSubjectResult;
  cutoutImageBase64?: string;
  error?: string;
}

/**
 * Appelle l'endpoint sécurisé /api/segment-subject propulsé par Gemini 3.8 Flash Vision
 */
export async function segmentSubject(
  imageBase64: string,
  options: { includeCutout?: boolean } = {}
): Promise<SegmentSubjectResponse> {
  const response = await fetch('/api/segment-subject', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      imageBase64,
      includeCutout: options.includeCutout ?? false,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.error || `Erreur serveur HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Convertit un polygone normalisé [0-1000] en attribut 'points' SVG ou chemin SVG pour viewBox="0 0 W H"
 */
export function polygonToSvgPoints(polygon: PolygonPoint[], width: number, height: number): string {
  if (!polygon || polygon.length === 0) return '';
  return polygon
    .map((pt) => `${Math.round((pt.x / 1000) * width)},${Math.round((pt.y / 1000) * height)}`)
    .join(' ');
}

/**
 * Applique un tracé de découpage (clip path) à un contexte Canvas 2D à partir du polygone normalisé
 */
export function applyPolygonClipToCanvas(
  ctx: CanvasRenderingContext2D,
  polygon: PolygonPoint[],
  width: number,
  height: number
): void {
  if (!polygon || polygon.length < 3) return;

  ctx.beginPath();
  const startX = (polygon[0].x / 1000) * width;
  const startY = (polygon[0].y / 1000) * height;
  ctx.moveTo(startX, startY);

  for (let i = 1; i < polygon.length; i++) {
    const px = (polygon[i].x / 1000) * width;
    const py = (polygon[i].y / 1000) * height;
    ctx.lineTo(px, py);
  }

  ctx.closePath();
}
