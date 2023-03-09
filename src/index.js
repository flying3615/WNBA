const {chromium} = require('playwright');

const bookingButtonSelector = "body > ui-view > app-route > div > main > home-route > div > div > cards > div > card:nth-child(2) > div > card-home-welcome > section > div.HomeActionButtons > div:nth-child(2) > action-button > a";
const nextDayButton = "body > ui-view > app-route > div > main > ui-view > booking-view-route > div > div.Container.Container--flex.NumAreas--6 > cards > div > card > div > booking-grid-header > header > booking-grid-nav > h1 > button:nth-child(3)";
const dateSelector = "body > ui-view > app-route > div > main > ui-view > booking-view-route > div > div.Container.Container--flex.NumAreas--6 > cards > div > card > div > booking-grid-header > header > booking-grid-nav > h1 > span";


const profileIcon = "body > ui-view > app-route > div > app-header > header > nav > a.UserMenu-toggle.NavBar-item.ng-scope";
const signOutButton = "body > ui-view > app-route > div > app-header > header > div > div.UserMenu-options > button";

const bookingGridSelector = "body > ui-view > app-route > div > main > ui-view > booking-view-route > div > div.Container.Container--flex.NumAreas--6 > cards > div > card > div > booking-grid > div";
const bookingSlotSelector = "booking-grid-slot";


let browser, context, page

const login = async () => {

    browser = await chromium.launch({headless: false});
    context = await browser.newContext();
    page = await context.newPage();

    // 导航到登录页面
    await page.goto('https://bookings.wnba.org.nz/login/credentials', {waitUntil: 'networkidle'});
    await page.waitForSelector('text=Sign in', {state: 'visible'});

    // 填写登录表单并提交
    const usernameInput = await page.$('input[name=username]');
    await usernameInput.type('kafofe8345@rolenot.com');

    const passwordInput = await page.$('input[name=password]');
    await passwordInput.type('!QAZxsw2');

    const submitButton = await page.$('button[type=submit]');
    await submitButton.click();

    const bookingButton = await page.waitForSelector(bookingButtonSelector)
    await bookingButton.click()

    // 等待登录成功，例如，页面出现欢迎信息
    return await page.waitForSelector('.UserMenu-toggle');
}

const checkAndBookSlots = async () => {
    await page.waitForLoadState('domcontentloaded');

    const bookingDate = await (await page.waitForSelector(dateSelector)).textContent()
    console.log(bookingDate)

    const bookingGrid = await page.waitForSelector(bookingGridSelector);

    const courts = await bookingGrid.$$(">div")
    let index = 0
    for (const court of courts) {
        const slotsPerCourt = await court.$$(`>${bookingSlotSelector}`)
        console.log(`==============court ${++index}===================`)
        for (const slot of slotsPerCourt) {
            console.log((await slot.textContent()).trim());
        }
    }

    return false;
}

const goToNextDay = async () => {
    await page.waitForLoadState('domcontentloaded');
    const nextDayLink = await page.waitForSelector(nextDayButton)
    console.log('Go to next day.....');
    await nextDayLink.click()
}

const logout = async () => {
    const profile = await page.waitForSelector(profileIcon)
    await profile.click()

    const singOut = await page.waitForSelector(signOutButton)
    await singOut.click()
    console.log('Logged out successfully!');

}

(async () => {
    try {
        if (await login()) {
            console.log('Logged in successfully!');

            for (let i = 1; i <= 3; i++) {
                const hasBooked = await checkAndBookSlots()
                if (!hasBooked) {
                    await goToNextDay();
                } else {
                    break;
                }
            }
            await logout()
        } else {
            throw Error("Can't login")
        }
    } finally {
        await browser.close();
    }


})();