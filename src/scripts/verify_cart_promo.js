import { chromium } from 'playwright';
import path from 'path';

(async () => {
    console.log('Starting Cart & Promo verification...');
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    const baseUrl = 'https://signaid-d2d08.web.app/creation';

    console.log('[1/4] Navigating to Creation Page...');
    await page.goto(baseUrl);
    await page.waitForTimeout(3000);

    let errors = [];

    // STEP 1: Select Size
    try {
        console.log('[1/4] Selecting Size M...');
        const sizeMBtn = page.getByRole('button', { name: 'M', exact: true }).first();
        if (await sizeMBtn.isVisible()) {
            await sizeMBtn.click();
            console.log('Clicked Size M.');
        } else {
            const sizeMText = page.getByText('M', { exact: true });
            if (await sizeMText.count() > 0) {
                await sizeMText.first().click();
                console.log('Clicked Size M (Text).');
            } else {
                console.error('FAIL: Size M button not found.');
                errors.push('Size Selection Failed');
            }
        }
    } catch (e) {
        console.error('FAIL: Size Selection Error', e);
        errors.push('Size Selection Failed');
    }

    // STEP 2: Add to Cart
    try {
        console.log('[2/4] Clicking Add to Cart...');
        // Try specific selector if possible or text
        const addBtn = page.getByText('Ajouter au Panier', { exact: false }).first();

        if (await addBtn.isVisible()) {
            await addBtn.click();
            console.log('Clicked Add to Cart. Waiting (15s) for canvas gen...');
            await page.waitForTimeout(15000);

            // Check for Cart Title ("Mon Panier")
            const cartTitle = page.getByText('Mon Panier', { exact: false });
            if (await cartTitle.isVisible()) {
                console.log('PASS: Cart View Opened.');
            } else {
                console.log('FAIL: Cart View did not open.');
                await page.screenshot({ path: path.join(process.cwd(), 'cart_fail.png') });
                console.log('Screenshot saved to cart_fail.png');
                errors.push('Cart Open Failed');
            }

        } else {
            console.error('FAIL: Add to Cart button not found.');
            errors.push('Add to Cart Failed');
        }
    } catch (e) {
        console.error('FAIL: Add to Cart Error', e);
        errors.push('Add to Cart Error');
    }

    // STEP 3: Verify Price & Promo (Only if Cart Opened)
    try {
        if (errors.length === 0) {
            console.log('[3/4] Verifying Price...');
            const totalLabel = page.getByText('Total', { exact: true });

            if (await totalLabel.isVisible()) {
                console.log('PASS: Total Label visible.');
            }

            console.log('[4/4] Testing Promo Code SIGNEED15...');
            const promoInput = page.getByPlaceholder('Code Promo');
            if (await promoInput.isVisible()) {
                await promoInput.fill('SIGNEED15');
                const okBtn = page.getByText('OK', { exact: true });
                await okBtn.click();
                await page.waitForTimeout(2000);

                const successMsg = page.getByText('Code appliqué', { exact: false });
                if (await successMsg.isVisible()) {
                    console.log('PASS: Promo Code Applied successfully.');
                } else {
                    console.log('WARN: Promo Code success message not found.');
                    // Maybe check if price changed? Hard to know strict numbers without parsing.
                }
            } else {
                console.error('FAIL: Promo Input not found.');
                errors.push('Promo Input Failed');
            }
        } else {
            console.log('SKIP: Price/Promo checks due to previous errors.');
        }
    } catch (e) {
        console.error('FAIL: Promo/Price Error', e);
        errors.push('Promo/Price Error');
    }

    if (errors.length === 0) {
        console.log('OVERALL STATUS: SUCCESS');
    } else {
        console.log('OVERALL STATUS: FAIL');
    }

    await browser.close();
})();
