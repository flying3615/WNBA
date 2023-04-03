import {chromium} from "playwright";
import _ from 'lodash';
import fs from 'fs'
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
    confirmBookingBtnSelector,
    finalCloseBookingModalBtnSelector,
    errorMessageShouldNotInModal, PinBookingOkBtn
} from "./constant.mjs";
import {
    calculatePlus30MinutesTime,
    checkLockFileExist, createBookedLockFile,
    extractTime,
    isPeakTime,
    isSuitableTime,
    readLines
} from "./util.mjs";
import {firefox} from "playwright-extra";

// Weekdays: 16:00-22:00, +1, after 21:00
// Weekends: 09:00-18:00, +2, after 16:00

let browser, context, page, dateObj

const date = new Date();
const month = date.getMonth() + 1;
const day = date.getDate();

const todayLockFileName = `${year}-${month}-${day}.lock`;

export const inProductEnv = false;
const DEBUGGING = false;

let loggedIn = null;

// console.log with timestamp
console.logCopy = console.log.bind(console);
console.log = function (data) {
    const currentDate = '[' + new Date().toString() + '] ';
    this.logCopy(currentDate, data);
};

const host = await readLines(inProductEnv ? "/home/ubuntu/hello-club/host.txt" : "../host.txt")

export const login = async () => {
    browser = await chromium.launch({headless: inProductEnv});
    context = await browser.newContext();
    page = await context.newPage();

    await page.goto(`https://${host}/login/credentials`, {waitUntil: 'networkidle'});
    await page.waitForSelector('text=Sign in', {state: 'visible'});

    const credentials = await readLines(inProductEnv ? "/home/ubuntu/hello-club/login.txt" : "../login.txt")

    const usernameInput = await page.$('input[name=username]');
    await usernameInput.type(credentials[0]);

    const passwordInput = await page.$('input[name=password]');
    await passwordInput.type(credentials[1]);

    const submitButton = await page.$('button[type=submit]');
    await submitButton.click();

    const bookingButton = await page.waitForSelector(bookingButtonSelector)
    await bookingButton.click()

    return await page.waitForSelector('.UserMenu-toggle');
}

export const login_google = async () => {
    browser = await firefox.launch({headless: inProductEnv});
    page = await browser.newPage({storageState: inProductEnv ? "/home/ubuntu/hello-club/setup/storage-state.json" : "../setup/storage-state.json"});

    await page.goto(`https://${host}/`);
    const bookingButton = await page.waitForSelector(bookingButtonSelector)
    await bookingButton.click()

    return await page.waitForSelector('.UserMenu-toggle');
}

const getDate = async () => {
    const bookingDate = await (await page.waitForSelector(dateSelector)).textContent();
    dateObj = new Date(`${bookingDate} ${year}`);
    console.log(`booking Date: ${bookingDate} ${year}`)
}

const selectStadiumPassOption = async () => {
    console.log("1. select stadium pass option")
    const stadiumPassOption = await page.waitForSelector(stadiumPassRadioSelector);
    await stadiumPassOption.click();

    // go to next step
    const nextBtn1 = await page.waitForSelector(chooseStadiumPassNextBtnSelector);
    await nextBtn1.click();
    await checkBookingError();
}

const checkBookingError = async () => {
    try {
        await page.waitForSelector(errorMessageShouldNotInModal, {timeout: 1000});
    } catch (error) {
        throw Error("Error appears during booking...");
    }
}

const selectPartners = async () => {
    console.log("2. select partners")
    const partners = await readLines(inProductEnv ? "/home/ubuntu/hello-club/partners.txt" : "../partners.txt")
    for (const name of partners) {
        const partnerInput = await page.waitForSelector(partnersInputSelector);
        await partnerInput.type(name);
        try {
            const partner = await page.waitForSelector(partnerOptionSelector)
            await partner.click();
            console.log("add player " + name)
        } catch (e) {
            console.error(`Couldn't select partner ${name}`, e);
        }
    }

    // go to next step
    const nextBtn2 = await page.waitForSelector(selectedPartnerNextBtnSelector);
    await nextBtn2.click();
    await checkBookingError();
}

const acceptConditionAndConfirmBooking = async () => {
    console.log("3. accept T&Cs")
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

const closeModals = async () => {
    console.log("4. close confirm modal")
    const pinBookingOkBtn = await page.waitForSelector(PinBookingOkBtn)
    await pinBookingOkBtn.click();

    const finalCloseModalBtn = await page.waitForSelector(finalCloseBookingModalBtnSelector)
    await finalCloseModalBtn.click();

    // throw exception sometimes
    // const closeModalBtn = await page.waitForSelector(closeBookingModalBtnSelector)
    // await closeModalBtn.click();
}

const bookIt = async (orderedCourt) => {
    console.log(`booking court ${orderedCourt.court} form ${orderedCourt.startTime} to ${orderedCourt.endTime}`)
    // peak time booking
    if (orderedCourt.peakTimeSlots && orderedCourt.peakTimeSlots.length > 0) {
        // slot has to be clicked one by one
        let index=0;
        for (const slot of orderedCourt.peakTimeSlots) {
            try {
                console.log(`0. select peak time slot ${++index}`)
                slot.click();
                await selectStadiumPassOption();
                await selectPartners();
                await acceptConditionAndConfirmBooking();
                await closeModals();
            } catch (e) {
                console.error(e)
            }
        }
    }

    // off-peak booking
    try {
        console.log("0. select off-peak time slots")
        await orderedCourt.startOffPeakSlot.click();
        await orderedCourt.endOffPeakSlot.click();
        await selectStadiumPassOption();
        await selectPartners();
        await acceptConditionAndConfirmBooking();
        await closeModals();
    } catch (e) {
        console.error(e)
    } finally {
        createBookedLockFile();
    }
}

const checkAndBookSlots = async () => {
    // Wait for the network to finish loading
    await page.waitForTimeout(3000);
    // init dateObj
    await getDate();

    const bookingWeekDay = dateObj.getDay()
    // we don't book on Monday, Tuesday, Thursday & Friday
    if([1,2,4,5].includes(bookingWeekDay)) {
        console.log("We don't book on Monday, Tuesday, Thursday & Friday")
        return;
    }

    const bookingGrid = await page.waitForSelector(bookingGridSelector);

    const courts = await bookingGrid.$$(">div")
    let index = 0

    const courtObjs = [];

    for (const court of courts) {
        let maxTimePerCourt = 0;
        let currentTime = 0
        let startTime = "";
        let startOffPeakTime = "";
        let endTime = "";
        let startOffPeakSlot = null;
        let endOffPeakSlot = null;
        let peakTimeSlots = [];
        const slotsPerCourt = await court.$$(`>${bookingSlotAvailableSelector}`)

        for (const slot of slotsPerCourt) {
            const peopleBookedSlot = await slot.$(bookingSlotPeopleSelector);
            const eventBookedSlot = await slot.$(bookingSlotEventSelector);
            if (peopleBookedSlot || eventBookedSlot) {
                currentTime = 0;
                startTime = "";
                startOffPeakTime = "";
                startOffPeakSlot = null;
            } else {
                const currentSlotTime = extractTime((await slot.textContent()).trim()); // output like: "16:00"
                // Weekdays: 16:00-22:00, +1, after 21:00, peak time 21:00-22:00
                // Weekends: 09:00-18:00, +2, after 16:00, peak time 16:00-17:00
                if (currentSlotTime && isSuitableTime(currentSlotTime, dateObj)) {
                    if (isPeakTime(currentSlotTime, dateObj)) {
                        // put all peak time slots
                        peakTimeSlots.push(slot);
                        if (startTime === "") {
                            // record the start time
                            startTime = currentSlotTime
                        }
                    } else {
                        if (startOffPeakTime === "") {
                            // the first off-peak start time slot
                            startOffPeakSlot = slot;
                            // record the first off-peak time
                            startOffPeakTime = currentSlotTime
                            if (startTime === "") {
                                // if still no start time, then it should be the first slot of off-peak time
                                startTime = startOffPeakTime;
                            }
                        }
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
        let oldFloor
        switch (index){
            case 0: oldFloor = 0; break // old rubber
            case 1: oldFloor = -1; break // no rubber
            case 2: oldFloor = 1; break
            case 3: oldFloor = 1; break
            case 4: oldFloor = 2; break // preferable
            case 5: oldFloor = 0;  break // old rubber
        }

        if (maxTimePerCourt === 0) {
            console.log(`=====court ${++index} is fully booked!==========`)
        } else {
            console.log(`=====court ${++index} max play time ${maxTimePerCourt} minutes, from ${startTime === "" ? "now" : startTime} to ${endTime}==========`)
            courtObjs.push({
                court: index,
                oldFloor: oldFloor,
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
    if (courtObjs.length > 0) {
        const mostSuitableCourt = _.orderBy(courtObjs, ['time', 'oldFloor'], ['desc', 'desc'])[0]
        // only book the court where can play more than 2 hours
        if (mostSuitableCourt.time >= 120) {
            if (DEBUGGING) {
                console.log("in debug mode, skip the real booking....")
                return;
            }
            await bookIt(mostSuitableCourt)
        } else {
            console.log("There is no suitable court on this day, will try 1 hour later....")
        }
    }
}

const goToNextDay = async () => {
    try {
        await page.waitForLoadState('networkidle');
        const nextDayLink = await page.waitForSelector(nextDayButton, {timeout: 5000})
        console.log('Go to next day.....');
        await nextDayLink.click()
    } catch (e) {
        throw new Error("latest day has not been opened for booking...")
    }
}

const logout = async () => {
    const profile = await page.waitForSelector(profileIcon)
    await profile.click()

    const singOut = await page.waitForSelector(signOutButton)
    await singOut.click()
    console.log('Logged out successfully!');
}

const bookingJob = async () => {
    console.log('Logged in successfully!');
    for (let i = 0; i <= 7; i++) {
        if (i < 7) {
            // go to the latest day
            await goToNextDay();
        } else {
            await checkAndBookSlots()
        }
    }
}

(async () => {
    try {
        const existingLockFile = checkLockFileExist();
        if (!existingLockFile) {
            // if there is no booking lock, then make a book
            loggedIn = await login()
            // loggedIn = await login_google()
            await bookingJob()
        } else {
            // if exists, but not equal as today's, means it's old one, delete it then do the job
            if (todayLockFileName !== existingLockFile) {
                fs.unlinkSync(existingLockFile);
                loggedIn = await login()
                // loggedIn = await login_google()
                await bookingJob()
            }
        }
    } catch (e) {
        console.error(e)
    } finally {
        loggedIn && await logout()
        browser && await browser.close();
    }
})();