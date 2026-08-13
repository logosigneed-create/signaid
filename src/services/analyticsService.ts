import { analytics } from "../firebaseConfig";
import { logEvent } from "firebase/analytics";

// Safe wrapper to prevent crashes if analytics fails to init
export const logAnalyticsEvent = async (eventName: string, eventParams?: { [key: string]: any }) => {
    try {
        if (analytics) {
            logEvent(analytics, eventName, eventParams);
            if (process.env.NODE_ENV === 'development') {
                console.log(`[Analytics] ${eventName}`, eventParams);
            }
        }
    } catch (e) {
        console.warn("[Analytics] Failed to log event", e);
    }
};

export const AnalyticsEvents = {
    PAGE_VIEW: 'page_view',
    VIEW_ITEM: 'view_item',
    ADD_TO_CART: 'add_to_cart',
    REMOVE_FROM_CART: 'remove_from_cart',
    BEGIN_CHECKOUT: 'begin_checkout',
    PURCHASE: 'purchase',
    GENERATE_AI_START: 'generate_ai_start',
    GENERATE_AI_COMPLETE: 'generate_ai_complete',
    SIGN_UP: 'sign_up',
    LOGIN: 'login',
    MOVE_DESIGN_ELEMENT: 'move_design_element'
};
