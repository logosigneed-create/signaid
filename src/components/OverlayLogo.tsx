import React, { useRef, useState, useEffect } from 'react';
import {
  EventInput,
  resolveLogoTransformForFormat,
  updateLogoTransform,
  resetLogoTransformForFormat,
  resolveDynamicLogoFilter,
  resolvePinnedLogoTransform,
  updatePinnedLogoTransform,
  type SubjectAnchorTransform,
} from '../types';

export { resolveLogoTransformForFormat, updateLogoTransform, resetLogoTransformForFormat };

interface OverlayLogoProps {
  input: EventInput;
  setInput?: React.Dispatch<React.SetStateAction<EventInput>>;
  isBanner?: boolean;
  disabled?: boolean;
  isActive?: boolean;
  isExporting?: boolean;
  getLogoFilter?: () => string | undefined;
  previewFormat?: 'post' | 'a3' | 'story' | 'banner' | 'tshirt' | string;
  onLogoClick?: () => void;
  isGroupSelected?: boolean;
  /** Transformation courante du Sujet 1 (référence du parenting si le logo est épinglé). */
  subjectTransform?: SubjectAnchorTransform | null;
}

export const OverlayLogo: React.FC<OverlayLogoProps> = ({
  input,
  setInput,
  isBanner = false,
  disabled = false,
  isActive,
  isExporting = false,
  getLogoFilter,
  previewFormat = 'post',
  onLogoClick,
  isGroupSelected = false,
  subjectTransform,
}) => {
  const isDraggingRef = useRef(false);
  const [isDragging, setIsDragging] = useState(false);
  const hasMovedRef = useRef(false);
  const startPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragContainerRef = useRef<HTMLElement | null>(null);
  const dragOffsetPercentRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const activeLogo =
    input.isLogoRedesignRequested && input.redesignedLogoSvg
      ? input.redesignedLogoSvg.startsWith('data:')
        ? input.redesignedLogoSvg
        : `data:image/svg+xml;utf8,${encodeURIComponent(input.redesignedLogoSvg)}`
      : input.logoUrl || input.logoImage;

  // Global listener to ensure drag always cleanly terminates if pointer capture is lost
  useEffect(() => {
    const handleGlobalPointerUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        setIsDragging(false);
        dragContainerRef.current = null;
      }
    };
    window.addEventListener('pointerup', handleGlobalPointerUp);
    window.addEventListener('pointercancel', handleGlobalPointerUp);
    return () => {
      window.removeEventListener('pointerup', handleGlobalPointerUp);
      window.removeEventListener('pointercancel', handleGlobalPointerUp);
    };
  }, []);

  if (!activeLogo) return null;

  const isActuallyActive = isExporting ? false : (isActive !== undefined ? isActive : !disabled);
  const effectiveGroupSelected = isExporting ? false : isGroupSelected;

  // 📌 Si le logo est épinglé au Sujet 1, sa position/échelle dérivent du sujet (parenting)
  const resolvedTransform = resolvePinnedLogoTransform(input, previewFormat, subjectTransform);
  const isPinned = resolvedTransform.isPinned;
  const posX = resolvedTransform.x;
  const posY = resolvedTransform.y;
  const scale = resolvedTransform.scale;
  const opacity = typeof input.logoOpacity === 'number' ? input.logoOpacity : 1;
  const rotation = typeof input.logoRotation === 'number' ? input.logoRotation : 0;

  const filterStyle = getLogoFilter
    ? getLogoFilter()
    : resolveDynamicLogoFilter(input);

  // Amélioration Composant Smartphone / Écran rétroéclairé :
  // Détection du visuel superposé sur l'écran du téléphone (parenting, mode screen, ou position écran 50%/64%)
  const isOnPhoneScreen = Boolean(
    input.isPhoneScreen ||
    input.logoBlendMode === 'screen' ||
    input.logoColorMode === 'screen' ||
    (isPinned && input.logoBlendMode !== 'normal') ||
    (Math.abs(posX - 50) < 14 && Math.abs(posY - 64) < 16 && input.logoColorMode !== 'white' && input.logoColorMode !== 'black')
  );

  const phoneScreenFilter = 'drop-shadow(0 0 10px rgba(249, 115, 22, 0.5))';

  const canDrag = Boolean(setInput && !disabled);

  const handleLogoDragStart = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!canDrag || e.button !== 0) return;

    if (!isActuallyActive && onLogoClick) {
      onLogoClick();
    }

    e.preventDefault();
    e.stopPropagation();

    hasMovedRef.current = false;
    startPosRef.current = { x: e.clientX, y: e.clientY };

    const container = e.currentTarget.parentElement;
    if (!container) return;

    dragContainerRef.current = container;
    isDraggingRef.current = true;
    setIsDragging(true);

    const rect = container.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      const pointerPercentX = ((e.clientX - rect.left) / rect.width) * 100;
      const pointerPercentY = ((e.clientY - rect.top) / rect.height) * 100;

      dragOffsetPercentRef.current = {
        x: pointerPercentX - posX,
        y: pointerPercentY - posY,
      };
    }

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}

    const handleWindowPointerMove = (moveEvt: PointerEvent) => {
      if (!isDraggingRef.current || !dragContainerRef.current || !setInput) return;
      const dist = Math.hypot(moveEvt.clientX - startPosRef.current.x, moveEvt.clientY - startPosRef.current.y);
      if (dist > 3) {
        hasMovedRef.current = true;
      }
      const cRect = dragContainerRef.current.getBoundingClientRect();
      if (cRect.width <= 0 || cRect.height <= 0) return;

      const pX = ((moveEvt.clientX - cRect.left) / cRect.width) * 100;
      const pY = ((moveEvt.clientY - cRect.top) / cRect.height) * 100;

      let nX = pX - dragOffsetPercentRef.current.x;
      let nY = pY - dragOffsetPercentRef.current.y;

      nX = Math.max(0, Math.min(100, nX));
      nY = Math.max(0, Math.min(100, nY));

      const rX = Math.round(nX * 10) / 10;
      const rY = Math.round(nY * 10) / 10;

      setInput((prev) =>
        prev.isPinnedToSubject && subjectTransform
          ? updatePinnedLogoTransform(prev, previewFormat, subjectTransform, { x: rX, y: rY })
          : updateLogoTransform(prev, previewFormat, { x: rX, y: rY })
      );
    };

    const handleWindowPointerUp = () => {
      window.removeEventListener('pointermove', handleWindowPointerMove);
      window.removeEventListener('pointerup', handleWindowPointerUp);
      window.removeEventListener('pointercancel', handleWindowPointerUp);
      const didMove = hasMovedRef.current;
      isDraggingRef.current = false;
      setIsDragging(false);
      dragContainerRef.current = null;
      if (!didMove && onLogoClick) {
        onLogoClick();
      }
    };

    window.addEventListener('pointermove', handleWindowPointerMove);
    window.addEventListener('pointerup', handleWindowPointerUp);
    window.addEventListener('pointercancel', handleWindowPointerUp);
  };

  const handleLogoDragMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current || !dragContainerRef.current || !setInput) return;

    e.preventDefault();
    e.stopPropagation();

    const dist = Math.hypot(e.clientX - startPosRef.current.x, e.clientY - startPosRef.current.y);
    if (dist > 3) {
      hasMovedRef.current = true;
    }

    const rect = dragContainerRef.current.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const pointerPercentX = ((e.clientX - rect.left) / rect.width) * 100;
    const pointerPercentY = ((e.clientY - rect.top) / rect.height) * 100;

    let newX = pointerPercentX - dragOffsetPercentRef.current.x;
    let newY = pointerPercentY - dragOffsetPercentRef.current.y;

    newX = Math.max(0, Math.min(100, newX));
    newY = Math.max(0, Math.min(100, newY));

    const roundedX = Math.round(newX * 10) / 10;
    const roundedY = Math.round(newY * 10) / 10;

    setInput((prev) =>
      prev.isPinnedToSubject && subjectTransform
        ? updatePinnedLogoTransform(prev, previewFormat, subjectTransform, { x: roundedX, y: roundedY })
        : updateLogoTransform(prev, previewFormat, { x: roundedX, y: roundedY })
    );
  };

  const handleLogoDragEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    const didMove = hasMovedRef.current;
    isDraggingRef.current = false;
    setIsDragging(false);
    dragContainerRef.current = null;

    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {}

    if (!didMove && onLogoClick) {
      onLogoClick();
    }
  };

  const handleDivClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!hasMovedRef.current && onLogoClick) {
      e.stopPropagation();
      onLogoClick();
    }
  };

  return (
    <div
      onContextMenu={(e) => e.preventDefault()}
      className={`absolute ${isPinned ? 'z-[22]' : 'z-35'} select-none -webkit-touch-callout-none transition-all duration-150 ${
        !disabled && !isExporting
          ? isActuallyActive
            ? isDragging
              ? 'cursor-grabbing pointer-events-auto touch-none ring-1 ring-dashed ring-lime-400 shadow-[0_0_15px_rgba(163,230,53,0.5)] rounded-lg'
              : 'cursor-grab active:cursor-grabbing pointer-events-auto touch-none ring-1 ring-dashed ring-lime-400/80 hover:ring-lime-400 shadow-[0_0_12px_rgba(163,230,53,0.3)] rounded-lg'
            : onLogoClick
              ? 'cursor-pointer pointer-events-auto hover:ring-1 hover:ring-dashed hover:ring-lime-400/70 rounded-lg'
              : 'pointer-events-none'
          : 'pointer-events-none'
      } ${
        effectiveGroupSelected
          ? 'ring-2 ring-lime-400/90 shadow-[0_0_15px_rgba(163,230,53,0.85)] rounded-xl scale-[1.03]'
          : ''
      }`}
      style={{
        left: `${posX}%`,
        top: `${posY}%`,
        transform: `translate(-50%, -50%) scale(${scale}) rotate(${rotation}deg)`,
        opacity: opacity,
        width: isBanner ? '18cqb' : '18cqi',
        height: isBanner ? '18cqb' : '18cqi',
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none',
        pointerEvents: (!disabled && !isExporting) ? 'auto' : 'none',
      }}
      onPointerDown={canDrag ? handleLogoDragStart : undefined}
      onPointerMove={canDrag ? handleLogoDragMove : undefined}
      onPointerUp={canDrag ? handleLogoDragEnd : undefined}
      onPointerCancel={canDrag ? handleLogoDragEnd : undefined}
      onClick={handleDivClick}
      data-pinned-to-subject={isPinned ? 'true' : undefined}
      title={!disabled && !isExporting ? (canDrag ? "Glisser pour repositionner ou cliquer pour configurer" : "Cliquer pour configurer le logo") : undefined}
    >
      {isOnPhoneScreen && (
        <div
          data-phone-screen-aura="true"
          className="absolute inset-[-15%] rounded-full pointer-events-none opacity-45 blur-md"
          style={{
            background: 'radial-gradient(circle, rgba(249, 115, 22, 0.45) 0%, rgba(249, 115, 22, 0.1) 60%, transparent 80%)',
            mixBlendMode: 'screen',
          }}
        />
      )}
      <img
        src={activeLogo}
        crossOrigin="anonymous"
        alt="Logo"
        draggable={false}
        width={200}
        height={200}
        loading="eager"
        fetchPriority="high"
        decoding="async"
        onContextMenu={(e) => e.preventDefault()}
        className={`w-full h-full object-contain pointer-events-none select-none -webkit-touch-callout-none transition-[filter] duration-200 ${
          isOnPhoneScreen ? '' : 'drop-shadow-md'
        }`}
        style={{
          WebkitTouchCallout: 'none',
          WebkitUserSelect: 'none',
          userSelect: 'none',
          touchAction: 'none',
          mixBlendMode: isOnPhoneScreen ? 'screen' : 'normal',
          filter: isOnPhoneScreen
            ? (filterStyle && filterStyle !== 'none'
                ? `${phoneScreenFilter} ${filterStyle}`
                : phoneScreenFilter)
            : (filterStyle || undefined),
        }}
      />
    </div>
  );
};
