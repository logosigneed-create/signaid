import React, { useRef } from 'react';

// Types pour les outils (à adapter selon votre projet)
export interface ToolItem {
    id: string;
    icon: string; // Classe FontAwesome (ex: 'fa-image')
    label: string;
    action?: () => void;
    className?: string; // Ajout pour les animations (pulse, bounce, etc.)
    disabled?: boolean; // NEW: Support for disabled state
    badge?: string | number; // NEW: Support for badges (e.g. +5)
}

interface CreationToolbarProps {
    onToolSelect: (toolId: string) => void;
    activeToolId: string | null;
    tools: ToolItem[];
}

const CreationToolbar: React.FC<CreationToolbarProps> = ({ onToolSelect, activeToolId, tools }) => {
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Fonction de défilement fluide
    const scroll = (direction: 'left' | 'right') => {
        if (scrollContainerRef.current) {
            const scrollAmount = 200; // Scroll de ~2-3 items
            scrollContainerRef.current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            });
        }
    };

    return (
        <div style={styles.container} data-layout-id="mobile-bottom-nav">
            {/* Flèche Gauche */}
            <button onClick={() => scroll('left')} style={styles.scrollButton}>
                <i className="fa-solid fa-chevron-left"></i>
            </button>

            {/* Conteneur défilant */}
            <div ref={scrollContainerRef} style={styles.toolsContainer} className="hide-scrollbar">
                {tools.map((tool) => {
                    const isActive = activeToolId === tool.id;
                    const isDisabled = tool.disabled;

                    return (
                        <button
                            key={tool.id}
                            disabled={isDisabled}
                            onClick={(e) => {
                                if (isDisabled) return;
                                e.stopPropagation(); // Restored to prevent handleClickOutside from deselecting image
                                onToolSelect(tool.id);
                                if (tool.action) tool.action();
                            }}
                            className={tool.className || ''}
                            style={{
                                ...styles.toolButton,
                                backgroundColor: isActive ? '#E85D25' : 'transparent', // Inactif = transparent
                                color: isActive ? '#000000' : '#444444', // Texte plus sombre pour contraste sur fond transp
                                boxShadow: isActive ? '0 4px 10px rgba(232, 93, 37, 0.3)' : 'none',
                                transform: isActive ? 'scale(1.05)' : 'scale(1)',
                                opacity: isDisabled ? 0.5 : 1, // Visual feedback for disabled
                                cursor: isDisabled ? 'not-allowed' : 'pointer'
                            }}
                        >
                            {/* Icône */}
                            <div style={styles.iconWrapper}>
                                <i className={`fa-solid ${tool.icon}`} style={{ fontSize: '18px' }}></i>
                            </div>

                            {/* Label */}
                            <span style={{
                                ...styles.label,
                                color: isActive ? '#000000' : '#888888',
                                fontWeight: isActive ? 800 : 500
                            }}>
                                {tool.label}
                            </span>

                            {/* Badge */}
                            {tool.badge !== undefined && (
                                <div style={styles.badge}>
                                    {tool.badge}
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Flèche Droite */}
            <button onClick={() => scroll('right')} style={styles.arrowButton}>
                <i className="fa-solid fa-chevron-right"></i>
            </button>
        </div>
    );
};

// Styles CSS-in-JS pour garantir la stabilité et le design demandé
const styles: { [key: string]: React.CSSProperties } = {
    container: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        maxWidth: '100%',
        height: '65px', // Hauteur fixe réduite
        backgroundColor: 'rgba(255, 255, 255, 0.4)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        borderRadius: '20px',
        boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
        border: '1px solid rgba(255, 255, 255, 0.18)',
        padding: '3px',
        gap: '3px',
        overflow: 'hidden', // Empêche le débordement
        position: 'relative',
        zIndex: 50
    },
    toolsContainer: {
        display: 'flex',
        alignItems: 'center',
        gap: '0px', // Pas d'espace supplémentaire, on gère via padding des boutons
        overflowX: 'auto',
        scrollSnapType: 'x mandatory', // Snap pour "un au centre"
        scrollBehavior: 'smooth',
        scrollbarWidth: 'none', // Firefox
        msOverflowStyle: 'none', // IE/Edge
        height: '100%',
        padding: '0',
        flex: 1, // Prend tout l'espace disponible entre les flèches
    },
    scrollButton: {
        width: '30px',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
        border: 'none',
        color: '#888',
        cursor: 'pointer',
        zIndex: 10,
        fontSize: '14px',
    },
    arrowButton: {
        width: '30px',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
        border: 'none',
        color: '#888',
        cursor: 'pointer',
        zIndex: 10,
        fontSize: '14px',
    },
    toolButton: {
        // PROPRIÉTÉ CRITIQUE POUR LA STABILITÉ (Layout Shift)
        flex: '0 0 33.333%', // Force 1/3 exact
        width: '33.333%',    // Fallback
        minWidth: '33.333%', // Empêche le rétrécissement sur petits écrans
        maxWidth: '33.333%', // Empêche l'agrandissement

        scrollSnapAlign: 'center', // Centre l'élément
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '16px',
        border: 'none',
        cursor: 'pointer',
        transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
        padding: '2px', // Réduit le padding pour éviter que le contenu ne pousse
        userSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'manipulation', // Improves tap recognition on mobile
        zIndex: 100, // Ensure button is above backing layers
        pointerEvents: 'auto', // Explicitly allow clicks
    },
    iconWrapper: {
        marginBottom: '4px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '20px',
    },
    label: {
        fontSize: '8px', // Légèrement réduit pour les petits écrans
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        textAlign: 'center',
        width: '100%',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
    badge: {
        position: 'absolute',
        top: '5px',
        right: '5px',
        backgroundColor: '#E85D25',
        color: '#FFFFFF',
        fontSize: '8px',
        fontWeight: 900,
        minWidth: '16px',
        height: '16px',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 4px',
        border: '1.5px solid #FFFFFF',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        zIndex: 110
    }
};

export default CreationToolbar;
