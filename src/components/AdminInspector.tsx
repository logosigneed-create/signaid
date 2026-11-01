/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';

export const AdminInspector: React.FC = () => {
    // Vérifie si l'utilisateur est bien sur une route /admin
    const [isAdminRoute, setIsAdminRoute] = useState(false);
    const [isAltPressed, setIsAltPressed] = useState(false);
    const [hoveredRect, setHoveredRect] = useState<DOMRect | null>(null);
    const [targetLabel, setTargetLabel] = useState<string>('');
    const [copied, setCopied] = useState(false);

    // 1. Détection de la route /admin
    useEffect(() => {
        const checkRoute = () => {
            setIsAdminRoute(window.location.pathname.toLowerCase().includes('/admin'));
        };

        checkRoute();
        window.addEventListener('popstate', checkRoute);
        return () => window.removeEventListener('popstate', checkRoute);
    }, []);

    // 2. Détection de la touche 'Alt' (seulement si sur /admin)
    useEffect(() => {
        if (!isAdminRoute) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Alt') {
                setIsAltPressed(true);
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.key === 'Alt') {
                setIsAltPressed(false);
                setHoveredRect(null);
                setTargetLabel('');
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [isAdminRoute]);

    // 3. Capture et ciblage de l'élément survolé
    useEffect(() => {
        if (!isAdminRoute || !isAltPressed) return;

        const handleMouseMove = (e: MouseEvent) => {
            const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
            if (!el || el.id === 'admin-inspector-overlay') return;

            const rect = el.getBoundingClientRect();
            setHoveredRect(rect);

            // Priorité du libellé technique :
            // 1. data-element / data-name
            // 2. id
            // 3. title / aria-label
            // 4. Balise + première classe CSS significative
            const firstClass = el.className && typeof el.className === 'string'
                ? el.className.split(' ').find(c => !c.includes(':') && c.length > 2)
                : '';

            const technicalName =
                el.getAttribute('data-element') ||
                el.getAttribute('data-name') ||
                el.id ||
                el.getAttribute('aria-label') ||
                el.getAttribute('title') ||
                `<${el.tagName.toLowerCase()}${firstClass ? `.${firstClass}` : ''}>`;

            setTargetLabel(technicalName);
        };

        // 4. Clic gauche pour copier le nom technique
        const handleClick = (e: MouseEvent) => {
            if (targetLabel) {
                e.preventDefault();
                e.stopPropagation();
                navigator.clipboard.writeText(targetLabel);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
            }
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('click', handleClick, true);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('click', handleClick, true);
        };
    }, [isAdminRoute, isAltPressed, targetLabel]);

    // Si on n'est pas sur /admin ou que la touche Alt n'est pas enfoncée : rien n'est injecté
    if (!isAdminRoute || !isAltPressed || !hoveredRect) return null;

    return (
        <div id="admin-inspector-overlay" className="pointer-events-none fixed inset-0 z-[9999]">
            {/* Cadre de surbrillance néon autour de l'élément visé */}
            <div
                className="absolute border-2 border-lime-400 bg-lime-400/10 transition-all duration-75 rounded shadow-[0_0_15px_rgba(57,255,20,0.4)]"
                style={{
                    top: hoveredRect.top,
                    left: hoveredRect.left,
                    width: hoveredRect.width,
                    height: hoveredRect.height,
                }}
            />

            {/* Étiquette d'inspection au-dessus de l'élément */}
            <div
                className="absolute font-mono text-[11px] font-bold py-1 px-2.5 rounded-lg bg-zinc-950 text-lime-400 border border-lime-400 shadow-xl flex items-center gap-1.5 whitespace-nowrap pointer-events-auto"
                style={{
                    top: Math.max(8, hoveredRect.top - 32),
                    left: hoveredRect.left,
                }}
            >
                <span className="text-zinc-500 uppercase text-[9px]">[ALT + Clic]</span>
                <span>{targetLabel}</span>
                {copied && (
                    <span className="bg-lime-400 text-black px-1.5 py-0.2 rounded text-[10px] uppercase font-black animate-bounce">
                        Copié !
                    </span>
                )}
            </div>
        </div>
    );
};