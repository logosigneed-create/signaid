
interface Adjustment {
    x?: number;
    y: number;
    scale: number;
}

interface AdjustmentMap {
    [selector: string]: Adjustment;
}

const STORAGE_KEYS = {
    MOBILE: 'layout_adjustments_v5_mobile',
    DESKTOP: 'layout_adjustments_v5_desktop'
};

const DEFAULT_CONFIG = {
    mobile: {
        "[data-layout-id=\"app-main\"]": { x: 1, y: -70, scale: 1 },
        "[data-layout-id=\"app-main-feed\"]": { x: 0, y: 0, scale: 1 },
        "button.text-[10px]": { x: 0, y: 0, scale: 1 },
        "[data-layout-id=\"desktop-navbar\"]": { x: 0, y: 0, scale: 1 },
        "[data-layout-id=\"customizer-options-panel\"]": { x: 0, y: 0, scale: 1 },
        "div.h-screen": { x: 0, y: 0, scale: 1 },
        "button.text-gray-900": { x: 0, y: 0, scale: 1 },
        "[data-layout-id=\"mobile-navbar\"]": { x: 0, y: 0, scale: 1 },
        "div.md:hidden": { x: 0, y: 0, scale: 1 },
        "i.fa-solid": { x: 0, y: 0, scale: 1 },
        "#root": { x: 0, y: 0, scale: 1 }
    },
    desktop: {
        "[data-layout-id=\"app-main\"]": { x: 0, y: 0, scale: 1 },
        "[data-layout-id=\"app-main-feed\"]": { x: 0, y: 0, scale: 1 },
        "nav.flex": { x: 0, y: 0, scale: 1 },
        "div.hidden": { x: 0, y: 1, scale: 1 },
        "[data-layout-id=\"customizer-right-sidebar\"]": { x: 0, y: 0, scale: 1 },
        "div.fixed": { x: 0, y: 0, scale: 1 },
        "i.fa-solid": { x: 0, y: 0, scale: 1 },
        "[data-layout-id=\"customizer-options-panel\"]": { x: 0, y: 0, scale: 1 },
        "[data-layout-id=\"desktop-navbar\"]": { x: 0, y: 0, scale: 1 },
        "[data-layout-id=\"mobile-navbar\"]": { x: 0, y: 0, scale: 1 },
        "[data-layout-id=\"garment-selector-desktop\"]": { x: 0, y: 0, scale: 1 },
        "[data-layout-id=\"size-selector-desktop\"]": { x: 0, y: 0, scale: 1 },
        "[data-layout-id=\"back-button-desktop\"]": { x: 0, y: 0, scale: 1 },
        "[data-layout-id=\"color-selector-desktop\"]": { x: 0, y: 0, scale: 1 },
        "[data-layout-id=\"feed-actions-sidebar\"]": { x: 0, y: 0, scale: 1 },
        "[data-layout-id=\"feed-post-info\"]": { x: 0, y: 0, scale: 1 },
        "[data-layout-id=\"feed-arrow-left\"]": { x: 0, y: 0, scale: 1 },
        "[data-layout-id=\"feed-arrow-right\"]": { x: 0, y: 0, scale: 1 }
    }
};

const STYLE_ID = 'admin-layout-styles';

export const getSavedAdjustments = () => {
    let mobile: AdjustmentMap = { ...DEFAULT_CONFIG.mobile };
    let desktop: AdjustmentMap = { ...DEFAULT_CONFIG.desktop };

    try {
        const m = localStorage.getItem(STORAGE_KEYS.MOBILE);
        if (m) mobile = { ...mobile, ...JSON.parse(m) };

        const d = localStorage.getItem(STORAGE_KEYS.DESKTOP);
        if (d) desktop = { ...desktop, ...JSON.parse(d) };
    } catch (e) {
        console.error("Layout Init Error:", e);
    }
    return { mobile, desktop };
};

const buildRules = (adjustments: AdjustmentMap) => {
    return Object.entries(adjustments).map(([selector, { x, y, scale }]) => {
        return `${selector} { transform: translate(${x || 0}px, ${y}px) scale(${scale}) !important; }`;
    }).join('\n');
};

export const generateAndInjectStyles = (mobile: AdjustmentMap, desktop: AdjustmentMap) => {
    const mobileRules = buildRules(mobile);
    const desktopRules = buildRules(desktop);

    const css = `
        /* GENERATED LAYOUT STYLES V3 (Pre-Render) */
        @media (max-width: 1023px) {
            ${mobileRules}
        }
        @media (min-width: 1024px) {
            ${desktopRules}
        }
    `;

    let styleEl = document.getElementById(STYLE_ID);
    if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = STYLE_ID;
        document.head.appendChild(styleEl);
    }
    styleEl.innerHTML = css;
};

export const initializeLayout = () => {
    const { mobile, desktop } = getSavedAdjustments();
    if (Object.keys(mobile).length > 0 || Object.keys(desktop).length > 0) {
        generateAndInjectStyles(mobile, desktop);
        console.log("🎨 Layout styles injected successfully (Pre-render).");
    }
};

export const saveAdjustments = (isDesktop: boolean, newMap: AdjustmentMap) => {
    const key = isDesktop ? STORAGE_KEYS.DESKTOP : STORAGE_KEYS.MOBILE;
    localStorage.setItem(key, JSON.stringify(newMap));

    // Refresh styles immediately
    const { mobile, desktop } = getSavedAdjustments();
    // Optimization: We could just pass the new map instead of reading again, 
    // but reading ensures we have the full picture (sync)
    generateAndInjectStyles(mobile, desktop);
};
