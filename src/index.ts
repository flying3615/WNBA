import fs from "fs";
import {resolve} from "path";
import {
    checkLockFileExist,
    courtsEvaluator,
    createBookedLockFile,
    formatDateString,
    getDayOfWeek,
    getFutureDate
} from "./util.js";
import {ApiHelper} from "./api/apiHelper.js";
import {getBookingAndEventTimes} from "./api/bookTimeChecker.js";
import {load} from "ts-dotenv";
import { fileURLToPath } from "url";
import * as path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const env = load({
    TOKEN: {
        type: String,
        optional: true,
    },
    USE_TOKEN: Boolean,
    PLAYER_IDS: String,
    HOSTNAME: String,
    API_HOSTNAME: String,
    KAFKA_NAME: String,
    KAFKA_PASSWORD: String,
}, {
    path: resolve(__dirname, ".env"),
});


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



const sixDayLater = getFutureDate(6);
const sevenDayLater = getFutureDate(7);
const dayOfWeek = getDayOfWeek(sevenDayLater);

async function findPlayTimeSpan(apiHelper: ApiHelper) {
    // find out today already booked time span per courtId
    const alreadyOccupiedTimesByCourtId =
        await getBookingAndEventTimes(formatDateString(sixDayLater), formatDateString(sevenDayLater), apiHelper);

    const latestEndingTimePerCourt = alreadyOccupiedTimesByCourtId.map((value) => {
        // find the booking time with the latest end time for a specific court
        const sortedTime = value.bookingTimes.sort((a, b) => {
            return new Date(b.endDate).getTime() - new Date(a.endDate).getTime();
        });
        console.log(`Court ${Math.abs(courtsEvaluator[value.courtId])} has latest end book time: ${sortedTime[0].endDate}`);
        return {
            courtId: value.courtId,
            latestEndTime: sortedTime[0].endDate,
        };
    });

    // find the earliest end time among all courts
    const earliestEndTimePerCourt = latestEndingTimePerCourt.sort((a, b) => {
        const courtAWeight = courtsEvaluator[a.courtId];
        const courtBWeight = courtsEvaluator[b.courtId];

        // if same end time, then sort by court weight desc
        return new Date(a.latestEndTime).getTime() - new Date(b.latestEndTime).getTime() || courtBWeight - courtAWeight;
    })[0];

    const ourStartDate = earliestEndTimePerCourt.latestEndTime;
    const ourCourtId = earliestEndTimePerCourt.courtId;
    // hardcoded ending time
    const ourEndDate = `${formatDateString(sevenDayLater)}T11:00:00.000Z`;

    const timeDiff = new Date(ourEndDate).getTime() - new Date(ourStartDate).getTime();
    const diffHours = timeDiff / (1000 * 3600);
    return {ourStartDate, ourCourtId, ourEndDate, diffHours};
}

const run = async () => {

    if (bookingTime[dayOfWeek] == undefined) {
        console.log(`We don't book on ${dayOfWeek}`);
        return;
    }

    const playerIds = env.PLAYER_IDS.split(",");
    const apiHost = env.API_HOSTNAME;
    const host = env.HOSTNAME;
    const kafkaName = env.KAFKA_NAME;
    const kafkaPassword = env.KAFKA_PASSWORD;
    const token = env.TOKEN;
    const apiHelper = new ApiHelper(apiHost, host, token);
    if (!token) {
        console.log("No token found, use username and password to login.");
        const loginSuccess = await apiHelper.login(kafkaName, kafkaPassword);
        if (!loginSuccess) {
            console.log("Login failed, please check username and password.");
            return;
        }
    } else {
        console.log("Use token to login.", token);
    }

    try {
        const {ourStartDate, ourCourtId, diffHours} = await findPlayTimeSpan(apiHelper);
        // if (diffHours > 2) {
        //     // TODO need 2 logins to finish this function
        //     console.log("Booking span is more than 2 hours.");
        //
        //     //     A,B,C,D 1.5 hours;
        //     const ourMidDateObj1 = new Date(ourStartDate);
        //     ourMidDateObj1.setHours(ourMidDateObj1.getHours() + 1);
        //     ourMidDateObj1.setMinutes(ourMidDateObj1.getMinutes() + 30);
        //     const ourMidDate1 = ourMidDateObj1.toISOString();
        //     console.log("Booking first 1.5 hours double");
        //     await apiHelper.bookCourt(ourCourtId, ourStartDate, ourMidDate1, playerIds);
        //
        //     //     A,B 0.5 hours;
        //     console.log("Booking second 0.5 hour single");
        //     const ourMidDateObj2 = new Date(ourStartDate);
        //     ourMidDateObj2.setHours(ourMidDateObj2.getHours() + 2);
        //     const ourMidDate2 = ourMidDateObj2.toISOString();
        //     await apiHelper.bookCourt(ourCourtId, ourMidDate1, ourMidDate2, [playerIds[0], playerIds[1]]);
        //
        //     //     C,D 0.5 hours;
        //     console.log("Booking third 0.5 hour single");
        //     const ourMidDateObj3 = new Date(ourStartDate);
        //     ourMidDateObj3.setHours(ourMidDateObj3.getHours() + 2);
        //     ourMidDateObj3.setMinutes(ourMidDateObj3.getMinutes() + 30);
        //     const ourMidDate3 = ourMidDateObj3.toISOString();
        //     await apiHelper.bookCourt(ourCourtId, ourMidDate2, ourMidDate3, [playerIds[2], playerIds[3]]);
        //
        //     //     A,B,C,D rest hours;
        //     console.log("Booking rest time double");
        //     await apiHelper.bookCourt(ourCourtId, ourMidDate3, ourEndDate, playerIds) && createBookedLockFile();
        // } else {
        //     console.log("Booking span is less or equal to 2 hours.");

        const ourEndDateObj = new Date(ourStartDate);
        ourEndDateObj.setHours(ourEndDateObj.getHours() + 2);
        const ourCutOffDateObj = new Date(ourStartDate).setHours(11, 30, 0, 0);
        const ourEndDate = ourEndDateObj.toISOString();
        // check if ourEndDateObj is tomorrow or ourEndDateObj later than 11:00
        if(ourEndDateObj.getDate() !== new Date(ourStartDate).getDate() || ourEndDateObj.getTime() > ourCutOffDateObj) {
            console.log(`Earliest end time is ${ourEndDate}, booking span is less than 2 hours, skip today's booking`);
            return;
        }
        await apiHelper.bookCourt(ourCourtId, ourStartDate, ourEndDate, playerIds) && createBookedLockFile();
        // }
    } catch (e) {
        console.error(e);
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