/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Glisser-déposer haute performance des calques Sujet (Sujet 1 / Sujet 2 Duo-B2B).
 *
 * Principe : pendant le geste, AUCUN setState n'est déclenché. La position est
 * appliquée directement sur le style `transform` des calques concernés (DOM),
 * cadencée par requestAnimationFrame (1 écriture max par frame, transform GPU).
 * L'état React n'est mis à jour qu'UNE seule fois, au relâchement du pointeur.
 * Résultat : zéro re-render des composants géants (App / StudioComposer)
 * pendant la manipulation, même avec deux sujets chargés.
 */

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { EventInput, FormatTransform } from '../types';

export type SubjectLayerKey = 'primary' | 'secondary';

/** Ordre de superposition des deux sujets (défaut : le Sujet 2 passe devant). */
export type SubjectStackOrder = 'secondary-front' | 'primary-front';

/** Événement global permettant de sélectionner l'onglet Sujet 1 / Sujet 2 du panneau de réglages. */
export const SELECT_SUBJECT_EVENT = 'signaid:select-subject';

/** Décalage X par défaut du second sujet (placé à droite du premier). */
export const DEFAULT_SECONDARY_OFFSET_X = 25;

export const SUBJECT_DRAG_CLAMP_X: [number, number] = [-80, 80];
export const SUBJECT_DRAG_CLAMP_Y: [number, number] = [-60, 200];

export const buildSubjectLayerTransform = (x: number, y: number, scale: number) =>
  `translate(${x}%, ${y}%) scale(${scale})`;

export const isSecondarySubjectInFront = (input: Pick<EventInput, 'subjectStackOrder'>) =>
  input.subjectStackOrder !== 'primary-front';

/**
 * Classes z-index des deux calques sujets selon l'ordre choisi.
 * Les deux restent sous les textes (z-50) et au-dessus de l'harmonisation (z-19).
 */
export const getSubjectLayerZClasses = (input: Pick<EventInput, 'subjectStackOrder'>) => {
  const secondaryFront = isSecondarySubjectInFront(input);
  return {
    primary: secondaryFront ? 'z-20' : 'z-[21]',
    secondary: secondaryFront ? 'z-[21]' : 'z-20',
  };
};

/**
 * Applique un nouveau décalage (X/Y en %) au Sujet 1 pour un format donné.
 * Fonction pure partagée par le canevas Studio (mobile) et le grand canevas desktop.
 */
export function applyPrimarySubjectOffset(
  prev: EventInput,
  format: string,
  x: number,
  y: number,
  fallback: Pick<FormatTransform, 'scale' | 'alignX'>
): EventInput {
  const existingFmt = prev.formatTransforms?.[format as keyof NonNullable<EventInput['formatTransforms']>];
  return {
    ...prev,
    ...(format === 'post' || format === 'a3'
      ? {
        djPhotoOffsetY: y,
        subjectPositionY: y,
        djPhotoOffsetX: x,
        subjectPositionX: x,
      }
      : {}),
    formatTransforms: {
      ...(prev.formatTransforms || {}),
      [format]: {
        ...existingFmt,
        scale: existingFmt?.scale ?? fallback.scale,
        offsetY: y,
        offsetX: x,
        alignX: existingFmt?.alignX ?? fallback.alignX ?? 'center',
        isCustom: true,
      },
    },
  };
}

export interface BeginSubjectDragOptions {
  layer: SubjectLayerKey;
  initialX: number;
  initialY: number;
  scale: number;
  /** Appelé une seule fois au relâchement si le sujet a été déplacé. */
  onCommit: (x: number, y: number) => void;
  /** Appelé au relâchement si le geste était un simple tap / clic (sans déplacement). */
  onTap?: () => void;
  clampX?: [number, number];
  clampY?: [number, number];
}

interface ActiveSubjectDrag {
  opts: BeginSubjectDragOptions;
  pointerId: number;
  captureEl: HTMLElement;
  layers: HTMLElement[];
  savedStyles: Array<{ transition: string; willChange: string }>;
  startX: number;
  startY: number;
  lastClientX: number;
  lastClientY: number;
  width: number;
  height: number;
  hasMoved: boolean;
  currentX: number;
  currentY: number;
  rafId: number | null;
}

const MOVE_THRESHOLD_PX = 3;

const clamp = (v: number, [min, max]: [number, number]) => Math.max(min, Math.min(max, v));

const resolvePosterContainer = (el: HTMLElement): HTMLElement | null =>
  (el.closest('[data-poster-container="true"]') as HTMLElement | null) ||
  (el.closest('[class*="@container"]') as HTMLElement | null);

export function useSubjectLayerDrag() {
  const [draggingLayer, setDraggingLayer] = useState<SubjectLayerKey | null>(null);
  const dragRef = useRef<ActiveSubjectDrag | null>(null);
  const listenersRef = useRef<{
    move: (e: PointerEvent) => void;
    up: (e: PointerEvent) => void;
  } | null>(null);

  const applyToLayers = (drag: ActiveSubjectDrag) => {
    const transform = buildSubjectLayerTransform(drag.currentX, drag.currentY, drag.opts.scale);
    for (const layer of drag.layers) {
      layer.style.transform = transform;
    }
  };

  const computePosition = (drag: ActiveSubjectDrag) => {
    const deltaX = drag.lastClientX - drag.startX;
    const deltaY = drag.lastClientY - drag.startY;
    const nextX = Math.round((drag.opts.initialX + (deltaX / drag.width) * 100) * 10) / 10;
    const nextY = Math.round((drag.opts.initialY + (deltaY / drag.height) * 100) * 10) / 10;
    drag.currentX = clamp(nextX, drag.opts.clampX ?? SUBJECT_DRAG_CLAMP_X);
    drag.currentY = clamp(nextY, drag.opts.clampY ?? SUBJECT_DRAG_CLAMP_Y);
  };

  const detachListeners = () => {
    const listeners = listenersRef.current;
    if (!listeners) return;
    window.removeEventListener('pointermove', listeners.move);
    window.removeEventListener('pointerup', listeners.up);
    window.removeEventListener('pointercancel', listeners.up);
    listenersRef.current = null;
  };

  const restoreLayerStyles = (drag: ActiveSubjectDrag) => {
    drag.layers.forEach((layer, i) => {
      const saved = drag.savedStyles[i];
      layer.style.transition = saved?.transition ?? '';
      layer.style.willChange = saved?.willChange ?? '';
    });
  };

  const finishDrag = (cancelled: boolean) => {
    const drag = dragRef.current;
    if (!drag) return;
    dragRef.current = null;
    detachListeners();

    if (drag.rafId !== null) {
      cancelAnimationFrame(drag.rafId);
      drag.rafId = null;
    }
    try {
      drag.captureEl.releasePointerCapture(drag.pointerId);
    } catch { /* capture déjà libérée */ }

    if (drag.hasMoved) {
      computePosition(drag);
      applyToLayers(drag);
      restoreLayerStyles(drag);
      setDraggingLayer(null);
      drag.opts.onCommit(drag.currentX, drag.currentY);
    } else {
      restoreLayerStyles(drag);
      if (!cancelled) drag.opts.onTap?.();
    }
  };

  const beginSubjectDrag = useCallback(
    (e: ReactPointerEvent<HTMLElement>, opts: BeginSubjectDragOptions) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      e.stopPropagation();
      e.preventDefault();

      // Sécurité : clôture d'un éventuel geste précédent resté orphelin
      if (dragRef.current) finishDrag(true);

      const captureEl = e.currentTarget;
      const container = resolvePosterContainer(captureEl);
      const rect = container?.getBoundingClientRect();
      const scope: ParentNode = container || document;
      const layers = Array.from(
        scope.querySelectorAll<HTMLElement>(`[data-subject-layer="${opts.layer}"]`)
      );

      try {
        captureEl.setPointerCapture(e.pointerId);
      } catch { /* navigateurs sans capture */ }

      dragRef.current = {
        opts,
        pointerId: e.pointerId,
        captureEl,
        layers,
        savedStyles: layers.map((l) => ({ transition: l.style.transition, willChange: l.style.willChange })),
        startX: e.clientX,
        startY: e.clientY,
        lastClientX: e.clientX,
        lastClientY: e.clientY,
        width: rect && rect.width > 0 ? rect.width : 400,
        height: rect && rect.height > 0 ? rect.height : 400,
        hasMoved: false,
        currentX: opts.initialX,
        currentY: opts.initialY,
        rafId: null,
      };

      const move = (ev: PointerEvent) => {
        const drag = dragRef.current;
        if (!drag || ev.pointerId !== drag.pointerId) return;
        drag.lastClientX = ev.clientX;
        drag.lastClientY = ev.clientY;

        if (!drag.hasMoved) {
          if (Math.hypot(ev.clientX - drag.startX, ev.clientY - drag.startY) <= MOVE_THRESHOLD_PX) return;
          drag.hasMoved = true;
          for (const layer of drag.layers) {
            layer.style.transition = 'none';
            layer.style.willChange = 'transform';
          }
          setDraggingLayer(drag.opts.layer);
        }

        if (drag.rafId === null) {
          drag.rafId = requestAnimationFrame(() => {
            const current = dragRef.current;
            if (!current) return;
            current.rafId = null;
            computePosition(current);
            applyToLayers(current);
          });
        }
      };

      const up = (ev: PointerEvent) => {
        const drag = dragRef.current;
        if (!drag || ev.pointerId !== drag.pointerId) return;
        drag.lastClientX = ev.clientX;
        drag.lastClientY = ev.clientY;
        finishDrag(ev.type === 'pointercancel');
      };

      listenersRef.current = { move, up };
      window.addEventListener('pointermove', move, { passive: true });
      window.addEventListener('pointerup', up);
      window.addEventListener('pointercancel', up);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // Si un re-render externe survient pendant le geste, on ré-applique la position live
  useLayoutEffect(() => {
    const drag = dragRef.current;
    if (drag?.hasMoved) applyToLayers(drag);
  });

  useEffect(() => () => {
    detachListeners();
    const drag = dragRef.current;
    if (drag?.rafId != null) cancelAnimationFrame(drag.rafId);
    dragRef.current = null;
  }, []);

  return { draggingLayer, beginSubjectDrag };
}
