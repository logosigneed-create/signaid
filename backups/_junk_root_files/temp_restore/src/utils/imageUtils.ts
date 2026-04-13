/**
 * Utility to optimize Firebase Storage image URLs by selecting the appropriate resized version.
 * 
 * Logic:
 * 1. Checks if the URL is from Firebase Storage.
 * 2. Selects the closest available size suffix based on the requested width.
 * 3. Injects the suffix into the URL.
 * 
 * Available suffixes (assumed configured in Firebase Extension):
 * - _200x200
 * - _400x400
 * - _800x800
 * 
 * @param url The original image URL
 * @param width The desired display width
 * @returns The optimized URL or the original if not optimizable
 */
export const getOptimizedImageUrl = (url: string, width: number): string => {
    if (!url || typeof url !== 'string') return url;
    if (!url.includes('firebasestorage.googleapis.com')) return url;

    // Avoid double-optimizing if already optimized (simple check)
    if (url.match(/_\d+x\d+\./)) return url;

    // Determine the best suffix based on width
    // We assume 3 tiers: Small (200), Medium (400), Large (800+)
    let suffix = '';
    if (width <= 200) {
        suffix = '_200x200';
    } else if (width <= 400) {
        suffix = '_400x400';
    } else {
        suffix = '_800x800';
    }

    try {
        // Firebase URLs format: .../filename.ext?params
        // We need to insert suffix before .ext

        // 1. Split URL and query params
        const [baseUrl, queryParams] = url.split('?');
        if (!baseUrl) return url;

        // 2. Find the extension position
        const lastDotIndex = baseUrl.lastIndexOf('.');
        if (lastDotIndex === -1) return url; // No extension found

        // 3. Construct new base URL
        const newBaseUrl = baseUrl.substring(0, lastDotIndex) + suffix + baseUrl.substring(lastDotIndex);

        // 4. Reattach query params
        return queryParams ? `${newBaseUrl}?${queryParams}` : newBaseUrl;

    } catch (e) {
        console.warn('Error optimizing image URL:', e);
        return url;
    }
};
