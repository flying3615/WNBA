
import fs from "fs";

import {checkLockFileExist, createBookedLockFile, formatDateString, getDayOfWeek, getFutureDate} from "../util";
import {ApiHelper} from "./apiHelper";
import {getBookingAndEventTimes} from "./bookTimeChecker";

// console.log with timestamp
// console.logCopy = console.log.bind(console);
// console.log = function (data, data2) {
//     const currentDate = '[' + new Date().toString() + '] ';
//     data2 ? this.logCopy(currentDate, data, data2) : this.logCopy(currentDate, data);
// };

// Monday skip
// Tuesday 20 pm-23 pm @ court 6
// Tuesday 20 pm-23 pm @ court 2
// Wednesday 21 pm-23:30 pm @ court 5
// Thursday 19:30 pm-22:30 pm @ court 5
// Friday skip
// Saturday 18:00pm-22:00pm
// Saturday 19:00pm-22:00pm @ court 2
// minus 12 hours, all afternoon


enum bookingTime {
    Tuesday,
    Wednesday,
    Thursday,
    Friday,
    Saturday,
    Sunday,
}

export const courtsEvaluator = [
    {
        courtId: "5aadd66e87c6b800048a290e",//court 2
        value: 2,
    },
    {
        courtId: "5aadd66e87c6b800048a290f", //court 3
        value: 3,
    },
    {
        courtId: "5aadd66e87c6b800048a2910", //court 4
        value: 4,
    },
    {
        courtId: "5aadd66e87c6b800048a2911", //court 5
        value: 5,
    },
    {
        courtId: "5aadd66e87c6b800048a2912", //court 6
        value: -6,
    },
    {
        courtId: "5aadd66e87c6b800048a290d", //court 1
        value: -1,
    }
];

export const inProductEnv = false;

const sixDayLater = getFutureDate(6);
const sevenDayLater = getFutureDate(7);
const dayOfWeek = getDayOfWeek(sevenDayLater);

const run = async () => {

    if (!bookingTime[dayOfWeek]) {
        console.log(`We don't book on ${dayOfWeek}`);
        return;
    }

    const apiHelper = await new ApiHelper(inProductEnv);

    if (await apiHelper.login()) {
        // find out today already booked time span per courtId
        const alreadyOccupiedTimesByCourtId =
            await getBookingAndEventTimes(formatDateString(sixDayLater), formatDateString(sevenDayLater), apiHelper);

      
        const latestEndingTimePerCourt = alreadyOccupiedTimesByCourtId.map((value) => {
            // find the booking time with the latest end time for a specific court
            const sortedTime = value.bookingTimes.sort((a, b) => {
                return new Date(b.endDate).getTime() - new Date(a.endDate).getTime();
            });
            console.log(`Court ${value.courtId} has latest end book time: ${sortedTime[0].endDate}`);
            return {
                courtId: value.courtId,
                latestEndTime: sortedTime[0].endDate,
            };
        });
        
        // find the earliest end time among all courts
        const earliestEndTimePerCourt = latestEndingTimePerCourt.sort((a, b) => {
            const courtAWeight = courtsEvaluator.find((value) => value.courtId === a.courtId).value;
            const courtBWeight = courtsEvaluator.find((value) => value.courtId === b.courtId).value;
            // if same end time, then sort by court weight desc
            return new Date(a.latestEndTime).getTime() - new Date(b.latestEndTime).getTime() || courtBWeight - courtAWeight;
        })[0];

        const ourStartDate = earliestEndTimePerCourt.latestEndTime;
        const ourCourtId = earliestEndTimePerCourt.courtId;
        const ourEndDate = `${formatDateString(sevenDayLater)}T11:30:00.000Z`;
        if (await apiHelper.bookCourt(ourCourtId, ourStartDate, ourEndDate)) {
            createBookedLockFile();
        }
    } else {
        console.log("Login Unsuccessful");
    }
};

const existingLockFile = checkLockFileExist();
if (!existingLockFile) {
    run().then(() => console.log("DONE")).catch(e => console.error(e));
} else {
    // if exists, but not equal as today's, means it's old one, delete it then do the job
    const todayLockFileName = `${formatDateString(new Date())}.lock`;
    if (todayLockFileName !== existingLockFile) {
        console.log("trying to book", todayLockFileName, existingLockFile);
        fs.unlinkSync(existingLockFile);
        run().then(() => console.log("DONE")).catch(e => console.error(e));
    } else {
        console.log("same date lock exists, today has been booked");
    }
}