import {chromium} from "playwright";
import _ from 'lodash';
import {
    bookingButtonSelector,
    bookingGridSelector,
    chooseStadiumPassNextBtnSelector,
    bookingSlotAvailableSelector,
    bookingSlotEventSelector,
    bookingSlotPeopleSelector,
    dateSelector,
    nextDayButton,
    partnerOptionSelector,
    partnersInputSelector,
    profileIcon,
    signOutButton,
    stadiumPassRadioSelector,
    year,
    selectedPartnerNextBtnSelector,
    bookingConditionCheckBox1,
    bookingConditionCheckBox2,
    confirmBookingBtnSelector, closeBookingModalBtnSelector, finalCloseBookingModalBtnSelector, userName, password
} from "./constant.mjs";
import {calculatePlus30MinutesTime, extractTime, isPeakTime, isSuitableTime} from "./util.mjs";

// Weekdays: 16:00-22:00, +1, after 21:00
// Weekends: 09:00-18:00, +2, after 16:00

let browser, context, page, dateObj

const login = async () => {
    browser = await chromium.launch({headless: true});
    context = await browser.newContext();
    page = await context.newPage();

    // 导航到登录页面
    await page.goto('https://bookings.wnba.org.nz/login/credentials', {waitUntil: 'networkidle'});
    await page.waitForSelector('text=Sign in', {state: 'visible'});

    // 填写登录表单并提交
    const usernameInput = await page.$('input[name=username]');
    await usernameInput.type(userName);

    const passwordInput = await page.$('input[name=password]');
    await passwordInput.type(password);

    const submitButton = await page.$('button[type=submit]');
    await submitButton.click();

    const bookingButton = await page.waitForSelector(bookingButtonSelector)
    await bookingButton.click()

    // 等待登录成功，例如，页面出现欢迎信息
    return await page.waitForSelector('.UserMenu-toggle');
}

const getDate = async () => {
    const bookingDate = await (await page.waitForSelector(dateSelector)).textContent();
    console.log("booking Date = ", bookingDate)
    const date = new Date(`${bookingDate} ${year}`);
    dateObj = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

async function selectStadiumPassOption() {
    const stadiumPassOption = await page.waitForSelector(stadiumPassRadioSelector);
    await stadiumPassOption.click();

    // go to next step
    const nextBtn1 = await page.waitForSelector(chooseStadiumPassNextBtnSelector);
    await nextBtn1.click();
}

async function selectPartners() {
    const partnerInput = await page.waitForSelector(partnersInputSelector);
    await partnerInput.type('Ivan Shi');

    const partner = await page.waitForSelector(partnerOptionSelector)
    await partner.click();

    // go to next step
    const nextBtn2 = await page.waitForSelector(selectedPartnerNextBtnSelector);
    await nextBtn2.click();
}

async function acceptConditionAndConfirmBooking() {
    const conditionCheckbox1 = await page.waitForSelector(bookingConditionCheckBox1)
    await conditionCheckbox1.click();

    try {
        // sometime not show???
        const conditionCheckbox2 = await page.waitForSelector(bookingConditionCheckBox2, {timeout: 3000})
        await conditionCheckbox2.click();
    } catch (e) {
        console.error("alert by 30 min early checkbox not show up")
    }

    // confirm booking
    const confirmBookingBtn = await page.waitForSelector(confirmBookingBtnSelector);
    await confirmBookingBtn.click();
}

async function closeModals() {
    const closeModalBtn = await page.waitForSelector(closeBookingModalBtnSelector)
    await closeModalBtn.click();

    const finalCloseModalBtn = await page.waitForSelector(finalCloseBookingModalBtnSelector)
    await finalCloseModalBtn.click();
}

async function bookIt(orderedCourt) {

    console.log(`booking court ${orderedCourt.court} form ${orderedCourt.startTime} to ${orderedCourt.endTime}`)

    for (const slot of orderedCourt.peakTimeSlots) {
        // peak time booking
        await slot.click();

        await selectStadiumPassOption();
        await selectPartners();
        await acceptConditionAndConfirmBooking();
        await closeModals();
    }

    // off-peak booking
    await orderedCourt.startOffPeakSlot.click();
    await orderedCourt.endOffPeakSlot.click();

    await selectStadiumPassOption();
    await selectPartners();
    await acceptConditionAndConfirmBooking();
    await closeModals();
}

const checkAndBookSlots = async () => {
    // Wait for the network to finish loading
    await page.waitForTimeout(3000);
    // init dateObj
    await getDate();
    const bookingGrid = await page.waitForSelector(bookingGridSelector);

    const courts = await bookingGrid.$$(">div")
    let index = 0

    const courtsToTime = [];

    for (const court of courts) {
        let maxTimePerCourt = 0;
        let currentTime = 0
        let startTime = "";
        let endTime = "";
        let startOffPeakSlot, endOffPeakSlot;
        let peakTimeSlots = [];
        const slotsPerCourt = await court.$$(`>${bookingSlotAvailableSelector}`)

        for (const slot of slotsPerCourt) {
            const peopleBookedSlot = await slot.$(bookingSlotPeopleSelector);
            const eventBookedSlot = await slot.$(bookingSlotEventSelector);
            if (peopleBookedSlot || eventBookedSlot) {
                currentTime = 0;
                startTime = "";
                startOffPeakSlot = null;
            } else {
                const currentSlotTime = extractTime((await slot.textContent()).trim()); // output like: "16:00"
                // Weekdays: 16:00-22:00, +1, after 21:00, peak time 21:00-22:00
                // Weekends: 09:00-18:00, +2, after 16:00, peak time 16:00-17:00
                if (currentSlotTime && isSuitableTime(currentSlotTime, dateObj)) {
                    if (startTime === "") {
                        if (isPeakTime(currentSlotTime, dateObj)) {
                            peakTimeSlots.push(slot);
                        } else {
                            // the first off-peak start time
                            startOffPeakSlot = slot;
                        }
                        startTime = currentSlotTime
                    }
                    // 1 slot is 30 minutes
                    currentTime += 30;
                    if (currentTime > maxTimePerCourt) {
                        maxTimePerCourt = currentTime;
                    }
                    endTime = calculatePlus30MinutesTime(currentSlotTime, dateObj);
                    endOffPeakSlot = slot;
                }
            }
        }

        if (maxTimePerCourt === 0) {
            console.log(`=====court ${++index} is fully booked!==========`)
        } else {
            console.log(`=====court ${++index} max play time ${maxTimePerCourt} minutes, from ${startTime === "" ? "now" : startTime} to ${endTime}==========`)
            courtsToTime.push({
                court: index,
                time: maxTimePerCourt,
                startTime,
                endTime,
                startOffPeakSlot,
                endOffPeakSlot,
                peakTimeSlots
            })
        }
    }

    // sort courts by time per day
    if (courtsToTime.length > 0) {
        const mostSuitableCourt = _.orderBy(courtsToTime, ['time'], ['desc'])[0]
        // only book the court where can play more than 2 hours
        if (mostSuitableCourt.time >= 120) {
            await bookIt(mostSuitableCourt)
        } else {
            console.log("There is no suitable court on this day, skip it....")
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
        await login()
        console.log('Logged in successfully!');
        const bookingDate = await (await page.waitForSelector(dateSelector)).textContent();
        console.log("Today is ", bookingDate)
        for (let i = 1; i <= 8; i++) {
            if (i !== 8) {
                // go to the last day
                await goToNextDay();
            } else {
                await checkAndBookSlots()
            }
        }
        await logout()
    } catch (e) {
        console.log(e)
    } finally {
        await browser.close();
    }
})();