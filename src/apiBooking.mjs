import {
    checkLockFileExist,
    createBookedLockFile,
    formatDateString,
    getDayOfWeek,
    getFutureDate,
} from "./util.mjs";
import fs from "fs";
import {checkTimeAvailable, getBookingAndEventTimes} from "./findFreeTime.mjs";
import {ApiHelper} from "./api/api.mjs";

// console.log with timestamp
console.logCopy = console.log.bind(console);
console.log = function (data, data2) {
    const currentDate = '[' + new Date().toString() + '] ';
    data2 ? this.logCopy(currentDate, data, data2) : this.logCopy(currentDate, data);
};


// Monday skip
// Tuesday 20 pm-23 pm @ court 6
// Tuesday 20 pm-23 pm @ court 2
// Wednesday 21 pm-23:30 pm @ court 5
// Thursday 19:30 pm-22:30 pm @ court 5
// Friday skip
// Saturday 18:00pm-22:00pm
// Saturday 19:00pm-22:00pm @ court 2
// minus 12 hours, all afternoon
const bookingTime = {
    Tuesday: {startTime: "08:00", endTime: "11:30"},
    Wednesday: {startTime: "09:30", endTime: "11:30"},
    Thursday: {startTime: "07:30", endTime: "11:30"},
    Friday: {startTime: "10:00", endTime: "11:30"},
    Saturday: {startTime: "07:00", endTime: "11:30"},
    Sunday: {startTime: "07:00", endTime: "11:30"},
}

const courts = [
    "5aadd66e87c6b800048a290e", //court 2
    "5aadd66e87c6b800048a290f", //court 3
    "5aadd66e87c6b800048a2910", //court 4
    "5aadd66e87c6b800048a2911", //court 5
    "5aadd66e87c6b800048a2912", //court 6
    "5aadd66e87c6b800048a290d", //court 1
]

const courtOrder = [2, 3, 4, 5, 6, 1]

export const inProductEnv = false;

const sixDayLater = getFutureDate(6);
const sevenDayLater = getFutureDate(7);
const dayOfWeek = getDayOfWeek(sevenDayLater);

const run = async () => {
    // get our trying book time span
    const ourBookingSpan = bookingTime[dayOfWeek]

    if (!ourBookingSpan) {
        console.log(`We don't book on ${dayOfWeek}`)
        return
    }

    const apiHelper = await new ApiHelper()

    if (await apiHelper.login()) {
        // find out today already booked time span per courtId
        const alreadyOccupiedTimesByCourtId =
            await getBookingAndEventTimes(formatDateString(sixDayLater), formatDateString(sevenDayLater), apiHelper)

        const ourStartDate = `${formatDateString(sevenDayLater)}T${ourBookingSpan.startTime}:00.000Z`
        const ourEndDate = `${formatDateString(sevenDayLater)}T${ourBookingSpan.endTime}:00.000Z`
        let index = 0
        for (const courtId of courts) {
            console.log(`Booking for court ${courtOrder[index++]} from ${new Date(ourStartDate)} to ${new Date(ourEndDate)}`)
            // check if any endTime is later than our booking start time.
            if (!checkTimeAvailable(courtId, ourStartDate, alreadyOccupiedTimesByCourtId)) {
                console.log("This court is not suitable for our time, try next one...")
                continue
            }
            if (await apiHelper.bookCourt(courtId, ourStartDate, ourEndDate)) {
                createBookedLockFile();
                break
            }
        }
    } else {
        console.log("Login Unsuccessful")
    }
}

const existingLockFile = checkLockFileExist();
if (!existingLockFile) {
    run().then(() => console.log("DONE")).catch(e => console.error(e))
} else {
    // if exists, but not equal as today's, means it's old one, delete it then do the job
    const todayLockFileName = `${formatDateString(new Date())}.lock`;
    if (todayLockFileName !== existingLockFile) {
        console.log("trying to book", todayLockFileName, existingLockFile)
        fs.unlinkSync(existingLockFile);
        run().then(() => console.log("DONE")).catch(e => console.error(e))
    } else {
        console.log("same date lock exists, today has been booked")
    }
}