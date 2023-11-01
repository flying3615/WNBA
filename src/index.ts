import fs from "fs";
import {resolve} from "path";
import {
    checkLockFileExist,
    courtsEvaluator,
    createBookedLockFile,
    formatDateString, getDateFromThisWeekDay,
    getDayOfWeek,
    getFutureDate
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
        const {ourStartDate, ourCourtId, ourEndDate, diffHours} = await findPlayTimeSpan(apiHelperKK);
        if (diffHours > 2) {
            console.log("Booking span is more than 2 hours.");
            //     A,B 2 hours;
            const ourMidDateObj1 = new Date(ourStartDate);
            ourMidDateObj1.setHours(ourMidDateObj1.getHours() + 2);
            const ourMidDate1 = ourMidDateObj1.toISOString();
            console.log("Booking first 1.5 hours double");
            await apiHelperKK.bookCourt(ourCourtId, ourStartDate, ourMidDate1, [playerIds[0], playerIds[1], playerIds[3]]);

            const apiHelperTT = new ApiHelper(apiHost, host);
            const loginSuccess = await apiHelperTT.login(tomcatName, tomcatPassword);
            if (!loginSuccess) {
                console.log("TT login failed, please check username and password.");
                return;
            }
            console.log("Logged in with Tomcat");
            //     C,D rest hours;
            console.log("Booking rest time double");
            (await apiHelperTT.bookCourt(ourCourtId, ourMidDate1, ourEndDate, [playerIds[2], playerIds[4]])).result && createBookedLockFile();
        } else if (diffHours === 2) {
            console.log("Booking span equals to 2 hours.");
            await apiHelperKK.bookCourt(ourCourtId, ourStartDate, ourEndDate, playerIds) && createBookedLockFile();
        } else {
            console.log("Booking span less than 2 hours, skip booking today.");
        }
    } catch (e) {
        console.error(e);
    }
};

const bookForSaturdays = async () => {
    if(dayOfWeek == "Saturday") {
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
    for(const courtId of courtIds) {
        const bookResult = await apiHelperKK.bookCourt(courtId, ourStartDateTime1, ourEndDateTime1, [playerIds[0], playerIds[1]]);

        if (bookResult.result) {
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
            return;
        }
    }
};

bookForSaturdays()
    .then(() => {
        const existingLockFile = checkLockFileExist();
        if (!existingLockFile) {
            return run();
        } else {
            // if exists, but not equal as today's, means it's old one, delete it then do the job
            const todayLockFileName = `${formatDateString(new Date())}.lock`;
            if (todayLockFileName !== existingLockFile) {
                console.log("trying to book", todayLockFileName, existingLockFile);
                fs.unlinkSync(existingLockFile);
                return run();
            } else {
                console.log("same date lock exists, today has been booked");
            }
        }
    }).then(() => console.log("DONE"))
    .catch(e => console.error(e));

