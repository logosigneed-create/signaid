import { chromium } from 'playwright';

(async () => {
    console.log('Starting Mobile Layout verification...');
    // Emulate iPhone SE or similar
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        viewport: { width: 375, height: 667 },
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 12_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.0 Mobile/15E148 Safari/604.1'
    });
    const page = await context.newPage();

    const baseUrl = 'https://signaid-d2d08.web.app/creation';

    console.log('[1/2] Navigating to Creation Page (Mobile)...');
    await page.goto(baseUrl);
    await page.waitForTimeout(3000); // Wait for load

    let errors = [];

    try {
        console.log('[1/2] Checking Mobile Elements...');

        // 1. Check if Desktop specific elements are HIDDEN
        // The desktop size selector has id "size-selector-desktop"
        const desktopSelector = page.locator('#size-selector-desktop');
        if (await desktopSelector.isVisible()) {
            console.error('FAIL: Desktop Size Selector is VISIBLE on Mobile.');
            errors.push('Desktop Element Visible');
        } else {
            console.log('PASS: Desktop Size Selector is hidden.');
        }

        // 2. Check if Mobile Toolbar is VISIBLE
        // The mobile size selector has id "size-selector-mobile"
        const mobileSelector = page.locator('#size-selector-mobile');
        if (await mobileSelector.isVisible()) {
            console.log('PASS: Mobile Size Selector is visible.');
        } else {
            // It might be hidden if not scrolled or active? 
            // Wait, the mobile size selector is always at the bottom in the logic I read earlier?
            // Line 2998: <div className="mobile-size-cart-container lg:hidden" id="size-selector-mobile">
            console.error('FAIL: Mobile Size Selector not found.');
            errors.push('Mobile Element Missing');
        }

    } catch (e) {
        console.error('FAIL: Mobile Verification Error', e);
        errors.push('Mobile Verification Error');
    }

    if (errors.length === 0) {
        console.log('OVERALL STATUS: SUCCESS');
    } else {
        console.log('OVERALL STATUS: FAIL');
    }

    await browser.close();
})();
