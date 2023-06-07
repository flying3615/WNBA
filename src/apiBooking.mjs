// court 1 5aadd66e87c6b800048a290d
// court 2 5aadd66e87c6b800048a290e
// court 3 5aadd66e87c6b800048a290f
// court 4 5aadd66e87c6b800048a2910
// court 5 5aadd66e87c6b800048a2911
// court 6 5aadd66e87c6b800048a2912

import {checkLockFileExist, createBookedLockFile, readLines} from "./util.mjs";
import fs from "fs";

// Monday skip
// Tuesday 20 pm-23 pm @ court 6
// Tuesday 20 pm-23 pm @ court 2
// Wednesday 21 pm-23:30 pm @ court 5
// Thursday 19:30 pm-22:30 pm @ court 5
// Friday skip
// Saturday 18:00pm-22:00pm
// Saturday 19:00pm-22:00pm @ court 2
const bookingTime = {
    Tuesday: {startTime: "20:00", endTime: "23:00"},
    Wednesday: {startTime: "21:00", endTime: "23:00"},
    Thursday: {startTime: "19:30", endTime: "22:30"},
    Saturday: {startTime: "18:00", endTime: "22:00"},
    Sunday: {startTime: "19:00", endTime: "22:00"},
}

const courts = [
    "5aadd66e87c6b800048a290e", //court 2
    "5aadd66e87c6b800048a290f", //court 3
    "5aadd66e87c6b800048a2910", //court 4
    "5aadd66e87c6b800048a2911", //court 5
    "5aadd66e87c6b800048a2912", //court 6
    "5aadd66e87c6b800048a290d", //court 1
]

const courtOrder = [
    2,3,4,5,6,1
]


export const inProductEnv = false;
const apiHost = await readLines(inProductEnv ? "/home/ubuntu/WNBA/api.txt" : "../api.txt")
const host = await readLines(inProductEnv ? "/home/ubuntu/WNBA/host.txt" : "../host.txt")
const credentials = await readLines(inProductEnv ? "/home/ubuntu/WNBA/login.txt" : "../login.txt")
const playerIds = await readLines(inProductEnv ? "/home/ubuntu/WNBA/playerIds.txt" : "../playerIds.txt")

function getFutureDate() {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + 6);
    return futureDate;
}

function getDayOfWeek(date) {
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return daysOfWeek[date.getDay()];
}

function formatDateString(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

const sevenDayLater = getFutureDate();
const dayOfWeek = getDayOfWeek(sevenDayLater);
const todayLockFileName = `${formatDateString(new Date())}.lock`;
const login = async () => {
    return await fetch(`https://${apiHost}/auth/token`, {
        "headers": {
            "accept": "application/json, text/plain, */*",
            "accept-language": "en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7",
            "content-type": "application/json;charset=UTF-8",
            "sec-ch-ua": "\"Not.A/Brand\";v=\"8\", \"Chromium\";v=\"114\", \"Microsoft Edge\";v=\"114\"",
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": "\"Windows\"",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "cross-site",
            "x-api-version": "2023-05-31",
            "x-club": "wnba",
            "x-hostname": `${host}`,
            "x-version": "7acb8ea",
            "cookie": "refreshToken.wnba=f0d0c52d86d1ee43568e78566bf1198b9dc3c6944d2e9ab5",
            "Referer": `https://${host}/`,
            "Referrer-Policy": "strict-origin-when-cross-origin"
        },
        "body": `{\"username\":\"${credentials[0]}\",\"password\":\"${credentials[1]}\",\"clientId\":\"helloclub-client\",\"grantType\":\"password\"}`,
        "method": "POST"
    });
}
const bookCourt = async (court, startTime, endTime, token) => {
    return await fetch(`https://${apiHost}/booking`, {
        "headers": {
            "accept": "application/json, text/plain, */*",
            "accept-language": "en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7",
            "authorization": `Bearer ${token}`,
            "content-type": "application/json;charset=UTF-8",
            "sec-ch-ua": "\"Not.A/Brand\";v=\"8\", \"Chromium\";v=\"114\", \"Microsoft Edge\";v=\"114\"",
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": "\"Windows\"",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "cross-site",
            "x-api-version": "2023-05-31",
            "x-club": "wnba",
            "x-hostname": `${host}`,
            "x-version": "7acb8ea",
            "Referer": `https://${host}/`,
            "Referrer-Policy": "strict-origin-when-cross-origin"
        },
        "body": `{\"members\":[\"${playerIds[0]}\",\"${playerIds[1]}\"],\"area\":\"${court}\",\"activity\":\"5aadd66e87c6b800048a2908\",\"startDate\":\"${startTime}\",\"endDate\":\"${endTime}\",\"mode\":\"615fcc5a03fdff65ad87ada7\",\"recurrence\":null,\"visitors\":[],\"sendConfirmationEmail\":true,\"forOthers\":false,\"reminderTime\":30,\"sendReminderEmail\":true}`,
        "method": "POST"
    });
}
const run = async () => {
    const loginResponse = await login()
    const data = await loginResponse.json();
    if (loginResponse.ok) {
        const token = data.access_token;
        const bookingSpan = bookingTime[dayOfWeek]

        const startDate = `${formatDateString(sevenDayLater)}T${bookingSpan.startTime}:00.000Z`
        const endDate = `${formatDateString(sevenDayLater)}T${bookingSpan.endTime}:00.000Z`
        let index = 0
        for (const court of courts) {
            console.log(`Booking for court ${courtOrder[index++]} from ${startDate} to ${endDate}`)
            const bookResponse = await bookCourt(court, startDate, endDate, token)
            const bookResult = await bookResponse.json()

            if (bookResponse.ok && !!bookResult.bookedOn) {
                console.log(`Booking successfully, booked on ${bookResult.bookedOn}`)
                createBookedLockFile();
                break
            }

            if (bookResult.code) {
                console.log(`Booking Unsuccessfully, ${bookResult.message}`)
            }
        }
    } else {
        console.log("Login Unsuccessful")
    }
}

const existingLockFile = checkLockFileExist();
if (!existingLockFile) {
    run().then(r => console.log("DONE")).catch(e => console.error(e))
} else {
    // if exists, but not equal as today's, means it's old one, delete it then do the job
    if (todayLockFileName !== existingLockFile) {
        console.log("trying to book", todayLockFileName, existingLockFile)
        fs.unlinkSync(existingLockFile);
        run().then(r => console.log("DONE")).catch(e => console.error(e))
    } else {
        console.log("same date lock exists, today has been booked")
    }
}