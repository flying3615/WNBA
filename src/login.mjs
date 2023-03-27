import { firefox } from 'playwright-extra';
(async function globalSetup() {
    const browser = await firefox.launch({ headless: false });
    const page = await browser.newPage({ storageState: 'setup/storage-state.json' });

    // // Open log in page on tested site
    // await page.goto(`https://bookings.wnba.org.nz/login`);
    // await page.getByText('Google').click();
    // // Click redirects page to Google auth form,
    // // parse https://accounts.google.com/ page
    // const html = await page.locator('body').innerHTML();
    //
    //
    // // New Google sign in form
    // await page.fill('input[type="email"]', "gabriel.liu3615@gmail.com");
    // await page.locator('#identifierNext >> button').click();
    // await page.fill('#password >> input[type="password"]', "");
    // await page.locator('button >> nth=1').click();


    // Wait for redirect back to tested site after authentication
    // await page.waitForURL("https://bookings.wnba.org.nz/");
    // Save signed in state
    // await page.context().storageState({ path: './setup/storage-state.json' });
    await page.goto("https://bookings.wnba.org.nz/profile");
    // await browser.close();
})()
