import fs from "fs";
import {resolve} from "path";
import {
    checkLockFileExist,
    courtsEvaluator,
    createBookedLockFile,
    formatDateString, getDateFromThisWeekDay,
    getDayOfWeek,
    getFutureDate, intensivelyRun
} from "./util.js";
import {ApiHelper} from "./api/apiHelper.js";
import {getBookingAndEventTimes} from "./api/bookTimeChecker.js";
import {load} from "ts-dotenv";
import {fileURLToPath} from "url";
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
    TOMCAT_NAME: String,
    TOMCAT_PASSWORD: String,
}, {
    path: resolve(__dirname, ".env"),
});


// console.log with timestamp
(console as any).logCopy = console.log.bind(console);
console.log = function (data, data2) {
    const currentDate = "[" + new Date().toString() + "] ";
    data2 ? this.logCopy(currentDate, data, data2) : this.logCopy(currentDate, data);
};


enum bookingTime {
    Tuesday,
    Wednesday,
    Thursday,
    // Friday,
    Saturday,
    Sunday,
}

const sixDayLater = getFutureDate(6);
const sevenDayLater = getFutureDate(7);
const dayOfWeek = getDayOfWeek(sevenDayLater);
const playerIds = env.PLAYER_IDS.split(",");
const apiHost = env.API_HOSTNAME;
const host = env.HOSTNAME;
const kafkaName = env.KAFKA_NAME;
const kafkaPassword = env.KAFKA_PASSWORD;
const tomcatName = env.TOMCAT_NAME;
const tomcatPassword = env.TOMCAT_PASSWORD;
const token = env.TOKEN;

const findPlayTimeSpan = async (apiHelper: ApiHelper) => {
    // find out today already booked time span per courtId
    const alreadyOccupiedTimesByCourtId =
        await getBookingAndEventTimes(formatDateString(sixDayLater), formatDateString(sevenDayLater), apiHelper);

    //The time shift need to after 13 hours, so have to filter out the booking time endDate is after 11:00:00
    const afterFilteredOccupiedTimesByCourtId = alreadyOccupiedTimesByCourtId.map((value) => {
        const afterFiltered = value.bookingTimes.filter((time) => {
            return new Date(time.endDate).getTime() <= new Date(`${formatDateString(sevenDayLater)}T11:30:00.000Z`).getTime();
        });
        return {courtId: value.courtId, bookingTimes: afterFiltered};
    });


    const latestEndingTimePerCourt = afterFilteredOccupiedTimesByCourtId.map((value) => {
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

    let ourStartDate = earliestEndTimePerCourt.latestEndTime;
    // check if it's Sunday, the start time should be from 8:00:00
    if (dayOfWeek == "Sunday") {
        console.log("On Sunday, start booking from 8 pm");
        ourStartDate = `${formatDateString(sevenDayLater)}T07:00:00.000Z`;
    }

    const ourCourtId = earliestEndTimePerCourt.courtId;

    // Check start hour + 4 hours if is later than 11:00:00
    const endDateAfterFourHours = new Date(ourStartDate);
    endDateAfterFourHours.setHours(endDateAfterFourHours.getHours() + 4);

    let ourEndDate: string;
    if (endDateAfterFourHours.getTime() > new Date(`${formatDateString(sevenDayLater)}T11:00:00.000Z`).getTime()) {
        ourEndDate = `${formatDateString(sevenDayLater)}T11:00:00.000Z`;
    } else {
        ourEndDate = endDateAfterFourHours.toISOString();
    }

    const timeDiff = new Date(ourEndDate).getTime() - new Date(ourStartDate).getTime();
    const diffHours = timeDiff / (1000 * 3600);
    return {ourStartDate, ourCourtId, ourEndDate, diffHours};
};

const runBooking = async (apiHelperKK: ApiHelper) => {
    const {ourStartDate, ourCourtId, ourEndDate, diffHours} = await findPlayTimeSpan(apiHelperKK);

    const Ivan = playerIds[0];
    const Gabriel = playerIds[1];
    const Jianwei = playerIds[2];
    const Angelia =  playerIds[3];
    const Hazel = playerIds[4];
    
    if (diffHours > 2) {
        console.log("Booking span is more than 2 hours.");
        const ourMidDateObj1 = new Date(ourStartDate);
        ourMidDateObj1.setHours(ourMidDateObj1.getHours() + 2);
        const ourMidDate1 = ourMidDateObj1.toISOString();
        console.log("Booking first 2 hours");
        await apiHelperKK.bookCourt(ourCourtId, ourStartDate, ourMidDate1, [Ivan, Gabriel]);

        const apiHelperTT = new ApiHelper(apiHost, host);
        const loginSuccess = await apiHelperTT.login(tomcatName, tomcatPassword);
        if (!loginSuccess) {
            console.log("TT login failed, please check username and password.");
            return;
        }
        console.log("Logged in with Tomcat");
        console.log("Booking rest time");
        return (await apiHelperTT.bookCourt(ourCourtId, ourMidDate1, ourEndDate, [Jianwei, Hazel]));

    } else if (diffHours === 2) {
        console.log("Booking span equals to 2 hours.");
        return await apiHelperKK.bookCourt(ourCourtId, ourStartDate, ourEndDate, [Ivan, Gabriel]);
    } else {
        console.log("Booking span less than 2 hours, skip booking today.");
        return true;
    }
};

const run = async () => {

    console.log("++++++++++++Daily booking start++++++++++");
    if (bookingTime[dayOfWeek] == undefined) {
        console.log(`We don't book on ${dayOfWeek} today`);
        return;
    }

    const apiHelperKK = new ApiHelper(apiHost, host);

    if (!token) {
        console.log("No token found, use username and password to login.");
        const loginSuccess = await apiHelperKK.login(kafkaName, kafkaPassword);
        if (!loginSuccess) {
            console.log("KK Login failed, please check username and password.");
            return;
        }
        console.log("Logged in with Kafka");
    } else {
        console.log("Use token to login.", token);
    }

    try {
        const firstRunResult = await runBooking(apiHelperKK);
        if (firstRunResult) {
            createBookedLockFile();
        } else {
            intensivelyRun(async () => {
                if (await runBooking(apiHelperKK)) {
                    createBookedLockFile();
                    return true;
                }
            });
        }
    } catch (e) {
        console.error(e);
    }
};

const bookForSaturdays = async () => {
    if (dayOfWeek == "Saturday") {
        console.log("Today is Saturday, skip Saturday checking book....");
        return;
    }

    console.log("-----Try to book on this Saturday--------");
    const thisSaturdayDate = getDateFromThisWeekDay("Saturday");
    const saturdayString = formatDateString(thisSaturdayDate);

    const existingLockSaturdayFile = checkLockFileExist("lock_Saturday");
    if (existingLockSaturdayFile) {
        if (existingLockSaturdayFile.includes(saturdayString)) {
            console.log("Saturday lock exists");
            return;
        } else {
            console.log("Saturday lock exists, but not for this week, remove it....");
            fs.unlinkSync(existingLockSaturdayFile);
        }
    }

    const apiHelperKK = new ApiHelper(apiHost, host);
    const loginSuccessKK = await apiHelperKK.login(kafkaName, kafkaPassword);
    if (!loginSuccessKK) {
        console.log("KK login failed, please check username and password.");
        return;
    }
    const ourStartDateTime1 = `${saturdayString}T07:30:00.000Z`;
    const ourEndDateTime1 = `${saturdayString}T09:30:00.000Z`;

    const courtIds = Object.keys(courtsEvaluator);
    for (const courtId of courtIds) {
        await apiHelperKK.bookCourt(courtId, ourStartDateTime1, ourEndDateTime1, [playerIds[0], playerIds[1]]);
        console.log("Book Saturday successfully, try second part booking");
        createBookedLockFile(`${saturdayString}.lock_Saturday`);
        const apiHelperTT = new ApiHelper(apiHost, host);
        const loginSuccessTT = await apiHelperTT.login(tomcatName, tomcatPassword);
        if (!loginSuccessTT) {
            console.log("TT login failed, please check username and password.");
            return;
        }
        const ourStartDateTime2 = `${saturdayString}T09:30:00.000Z`;
        const ourEndDateTime2 = `${saturdayString}T11:00:00.000Z`;
        await apiHelperTT.bookCourt(courtId, ourStartDateTime2, ourEndDateTime2, [playerIds[2], playerIds[3]]);
    }
};
// bookForSaturdays().then();
const runForEveryDay = async () => {
    const existingLockFile = checkLockFileExist();
    if (!existingLockFile) {
        return run();
    } else {
        // if exists, but not equal as today's, means it's old one, delete it then do the job
        const todayLockFileName = `${formatDateString(new Date())}.lock`;
        if (todayLockFileName !== existingLockFile) {
            console.log("trying to book", todayLockFileName, existingLockFile);
            // delete lock file
            fs.unlinkSync(existingLockFile);
            return run();
        } else {
            console.log("same date lock exists, today has been booked");
        }
    }
};

runForEveryDay().then();

