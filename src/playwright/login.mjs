import { firefox } from 'playwright-extra';
import * as fs from "fs";



async function globalSetup() {
    const host = "bookings.wnba.org.nz"
    const browser = await firefox.launch({headless: false});
    // const page = await browser.newPage({ storageState: 'setup/storage-state.json' });
    const page = await browser.newPage();
    // Open log in page on tested site
    await page.goto(`https://${host}/login`);
    await page.getByText('Google').click();
    // Click redirects page to Google auth form,
    // parse host page
    const html = await page.locator('body').innerHTML();

    // New Google sign in form
    await page.fill('input[type="email"]', "");
    await page.locator('#identifierNext >> button').click();
    await page.fill('#password >> input[type="password"]', "");
    await page.locator('button >> nth=1').click();


    // Wait for redirect back to tested site after authentication
    await page.waitForURL(`https://${host}/`);
    // Save signed in state

    await page.context().storageState({path: './setup/storage-state.json'});
    await page.goto(`https://${host}/profile`);
    await page.waitForTimeout(5000);
    // await browser.close();
}


const checkLogin = async () => {
    const host = "bookings.wnba.org.nz"
    const browser = await firefox.launch({headless: false});
    const page = await browser.newPage({storageState: 'setup/storage-state.json'});

    await page.context().storageState({path: './setup/storage-state.json'});
    await page.goto(`https://${host}/profile`);
    await page.waitForTimeout(5000);
    // await browser.close();

}

const testLogin = (async () => {
    const path = "./setup/storage-state.json"
    function existsSync(path) {
        try {
            fs.accessSync(path);
            return true;
        } catch (e) {
            return false;
        }
    }

    if (!existsSync(path)) {
        await globalSetup()
    } else {
        await checkLogin()
    }

})()
