import { chromium } from 'playwright';

(async () => {
    console.log('Starting browser...');
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    const targetUrl = 'https://signaid-d2d08.web.app/?quoteId=Test1234&quoteItemIdx=0';
    console.log(`Navigating to: ${targetUrl}`);

    await page.goto(targetUrl);

    // Wait for potential redirect
    try {
        // Wait for URL to contain '/creation' or timeout after 5 seconds
        await page.waitForURL('**/creation**', { timeout: 10000 });
    } catch (e) {
        console.log('Timeout waiting for redirect.');
    }

    const finalUrl = page.url();
    console.log(`Final URL: ${finalUrl}`);

    if (finalUrl.includes('/creation')) {
        console.log('SUCCESS: Redirect to /creation verified.');
    } else {
        console.log('FAIL: Did not redirect to /creation.');
    }

    await browser.close();
})();
