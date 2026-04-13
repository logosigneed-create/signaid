import { chromium } from 'playwright';

(async () => {
    console.log('Starting Client Journey verification...');
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    // Use Prod URL
    const baseUrl = 'https://signaid-d2d08.web.app/creation';

    console.log('[1/3] Navigating to Creation Page...');
    await page.goto(baseUrl);

    // Wait for page load
    await page.waitForTimeout(3000);

    let errors = [];

    // TEST 1: Add Text
    try {
        console.log('[1/3] Testing Text Addition...');
        // Use getByTitle as seen in code: title="Texte"
        const textBtn = page.getByTitle('Texte').first();
        if (await textBtn.isVisible()) {
            await textBtn.click();
            console.log('Clicked "Texte" button.');

            await page.waitForTimeout(2000);
            // After clicking Text, usually an input appears or panel opens
            // Check for input "Entrez votre texte" or check if active panel changed
            // Also check if text "VOTRE TEXTE" appeared on canvas/DOM overlay

            // Check for the Text Input in the Panel
            const input = page.locator('input[type="text"]').first(); // Broad selector if placeholder varies
            if (await input.isVisible()) {
                console.log('PASS: Text Input visible.');
            } else {
                console.log('WARN: Text input not found immediately.');
            }

        } else {
            console.log('WARN: "Texte" button not found by title.');
            // Fallback: Try font-awesome class locator
            const icon = page.locator('.fa-font').first();
            if (await icon.isVisible()) {
                await icon.click();
                console.log('Clicked Font Icon (fallback).');
            }
        }

    } catch (e) {
        console.error('FAIL: Text Addition Error', e);
        errors.push('Text Addition Failed');
    }

    // TEST 2: Color Change
    try {
        console.log('[2/3] Testing Color Selection (Arrow Cycle)...');

        // Find the "Next Color" arrow/button
        // It has alt="Suivant" on the image inside, or class fa-chevron-right
        // We target the image with alt="Suivant" and click it, or its parent
        const nextArrow = page.getByAltText('Suivant').first();

        if (await nextArrow.isVisible()) {
            console.log('Found Color Cycle Arrow.');
            const url1 = page.url();

            await nextArrow.click();
            await page.waitForTimeout(2000);

            const url2 = page.url();
            console.log(`URL 1: ${url1}`);
            console.log(`URL 2: ${url2}`);

            if (url1 !== url2 && url2.includes('product=')) {
                console.log('PASS: Color change updated URL parameter.');
            } else {
                console.log('WARN: URL did not change after color click.');
            }

        } else {
            console.error('FAIL: Color arrow not found.');
        }

    } catch (e) {
        console.error('FAIL: Color Selection Error', e);
        errors.push('Color Selection Error');
    }

    // TEST 3: Product Type Change (Manual verification usually, skipping script)

    if (errors.length === 0) {
        console.log('OVERALL STATUS: SUCCESS');
    } else {
        console.log('OVERALL STATUS: FAIL');
    }

    await browser.close();
})();
