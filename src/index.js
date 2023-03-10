const {chromium} = require('playwright');

const bookingButtonSelector = "body > ui-view > app-route > div > main > home-route > div > div > cards > div > card:nth-child(2) > div > card-home-welcome > section > div.HomeActionButtons > div:nth-child(2) > action-button > a";
const nextDayButton = "body > ui-view > app-route > div > main > ui-view > booking-view-route > div > div.Container.Container--flex.NumAreas--6 > cards > div > card > div > booking-grid-header > header > booking-grid-nav > h1 > button:nth-child(3)";
const dateSelector = "body > ui-view > app-route > div > main > ui-view > booking-view-route > div > div.Container.Container--flex.NumAreas--6 > cards > div > card > div > booking-grid-header > header > booking-grid-nav > h1 > span > span.BookingGridNav-month.BookingGridNav-month--full.ng-binding";

const profileIcon = "body > ui-view > app-route > div > app-header > header > nav > a.UserMenu-toggle.NavBar-item.ng-scope";
const signOutButton = "body > ui-view > app-route > div > app-header > header > div > div.UserMenu-options > button";

const bookingGridSelector = "body > ui-view > app-route > div > main > ui-view > booking-view-route > div > div.Container.Container--flex.NumAreas--6 > cards > div > card > div > booking-grid > div";
const bookingSlotAvailableSelector = "booking-grid-slot";
const bookingSlotEventSelector = "booking-grid-slot-event";
const bookingSlotPeopleSelector = "booking-grid-slot-people";

const year = 2023

// Weekdays: 16:00-22:00
// Weekends: 09:00-18:00

let browser, context, page, dateObj

const login = async () => {

    browser = await chromium.launch({headless: false});
    context = await browser.newContext();
    page = await context.newPage();

    // 导航到登录页面
    await page.goto('https://bookings.wnba.org.nz/login/credentials', {waitUntil: 'networkidle'});
    await page.waitForSelector('text=Sign in', {state: 'visible'});

    // 填写登录表单并提交
    const usernameInput = await page.$('input[name=username]');
    await usernameInput.type('bla');

    const passwordInput = await page.$('input[name=password]');
    await passwordInput.type('bla');

    const submitButton = await page.$('button[type=submit]');
    await submitButton.click();

    const bookingButton = await page.waitForSelector(bookingButtonSelector)
    await bookingButton.click()

    // 等待登录成功，例如，页面出现欢迎信息
    return await page.waitForSelector('.UserMenu-toggle');
}

const getDate = async () => {
    const bookingDate = await (await page.waitForSelector(dateSelector)).textContent();
    dateObj = new Date(`${bookingDate} ${year}`);
}

const isWeekend = async () => {
    const dayOfWeek = dateObj.getDay();
    return dayOfWeek === 6 || dayOfWeek === 0;
}

const extractTime = (str) => {
    const pattern = /\b\d{2}:\d{2}\b/;
    const match = str.match(pattern);
    if (match) {
        return match[0];
    } else {
        new Error("wrong time format")
    }
}

const calculatePlus30MinutesTime = (inputTime) => {
    const inputMinutes = 30;
    const isoDate = dateObj.toISOString().slice(0, 10);
    const dateTime = new Date(`${isoDate}T${inputTime}:00`);

// Extract hours and minutes from the Date object
    let hours = dateTime.getHours();
    let minutes = dateTime.getMinutes();

// Add inputMinutes to the minutes
    minutes += inputMinutes;

// Handle case where minutes >= 60
    if (minutes >= 60) {
        hours += 1;
        minutes %= 60;
    }

// Format the hours and minutes as a string
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;

}

const checkAndBookSlots = async () => {
    // Wait for the network to finish loading
    await page.waitForTimeout(3000);
    await getDate();
    console.log(dateObj, "is weekend? " + await isWeekend());

    const bookingGrid = await page.waitForSelector(bookingGridSelector);

    const courts = await bookingGrid.$$(">div")
    let index = 0

    for (const court of courts) {
        let maxTimePerCourt = 0;
        let currentTime = 0
        let startTime = "";
        let endTime = "";
        const slotsPerCourt = await court.$$(`>${bookingSlotAvailableSelector}`)

        for (const slot of slotsPerCourt) {
            const peopleBookedSlot = await slot.$(bookingSlotPeopleSelector);
            const eventBookedSlot = await slot.$(bookingSlotEventSelector);
            if (peopleBookedSlot || eventBookedSlot) {
                currentTime = 0;
                startTime = "";
            } else {
                const currentSlotTime = extractTime((await slot.textContent()).trim()); // output like: "16:00"
                if (currentSlotTime) {
                    if (startTime === "") {
                        startTime = currentSlotTime
                    }
                    // 1 slot is 30 minutes
                    currentTime += 30;
                    if (currentTime > maxTimePerCourt) {
                        maxTimePerCourt = currentTime;
                    }
                    endTime = calculatePlus30MinutesTime(currentSlotTime);
                }

            }
        }

        if(maxTimePerCourt===0) {
            console.log(`=====court ${++index} is fully booked!==========`)
        } else {
            console.log(`=====court ${++index} max play time ${maxTimePerCourt} minutes, from ${startTime === "" ? "now" : startTime} to ${endTime}==========`)

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