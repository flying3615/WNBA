import { firefox } from 'playwright-extra';
import {readLines} from "./util.mjs";
import {inProductEnv} from "./index.mjs";
(async function globalSetup() {
    const host = await readLines(inProductEnv ? "/home/ubuntu/hello-club/host.txt" : "../host.txt")
    const browser = await firefox.launch({ headless: false });
    const page = await browser.newPage({ storageState: 'setup/storage-state.json' });

    // // Open log in page on tested site
    // await page.goto(`https://${host}/login`);
    // await page.getByText('Google').click();
    // // Click redirects page to Google auth form,
    // // parse host page
    // const html = await page.locator('body').innerHTML();
    //
    //
    // // New Google sign in form
    // await page.fill('input[type="email"]', "");
    // await page.locator('#identifierNext >> button').click();
    // await page.fill('#password >> input[type="password"]', "");
    // await page.locator('button >> nth=1').click();


    // Wait for redirect back to tested site after authentication
    // await page.waitForURL(`https://${host}/`);
    // Save signed in state
    // await page.context().storageState({ path: './setup/storage-state.json' });
    await page.goto(`https://${host}/profile`);
    // await browser.close();
})()
