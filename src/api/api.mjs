import {readLines} from "../util.mjs";
import {inProductEnv} from "../apiBooking.mjs";

export class ApiHelper {
    token;
    constructor() {
        return (async () => {
            this.apiHost = (await readLines(inProductEnv ? "/home/ubuntu/WNBA/api.txt" : "../api.txt"))[0]
            this.host = (await readLines(inProductEnv ? "/home/ubuntu/WNBA/host.txt" : "../host.txt"))[0]
            this.credentials = await readLines(inProductEnv ? "/home/ubuntu/WNBA/login.txt" : "../login.txt")
            this.playerIds = await readLines(inProductEnv ? "/home/ubuntu/WNBA/playerIds.txt" : "../playerIds.txt")
            return this
        })()
    }

    async login() {
        const loginResponse = await fetch(`https://${this.apiHost}/auth/token`, {
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
                "x-hostname": `${this.host}`,
                "x-version": "7acb8ea",
                "cookie": "refreshToken.wnba=f0d0c52d86d1ee43568e78566bf1198b9dc3c6944d2e9ab5",
                "Referer": `https://${this.host}/`,
                "Referrer-Policy": "strict-origin-when-cross-origin"
            },
            "body": `{\"username\":\"${this.credentials[0]}\",\"password\":\"${this.credentials[1]}\",\"clientId\":\"helloclub-client\",\"grantType\":\"password\"}`,
            "method": "POST"
        });

        const data = await loginResponse.json()
        if (loginResponse.ok) {
            this.token = data.access_token;
            return true
        }
        return false
    }

    async bookCourt(court, startTime, endTime) {

        if(!this.token) {
            throw Error("Not login yet")
        }

        const bookResponse =  await fetch(`https://${this.apiHost}/booking`, {
            "headers": {
                "accept": "application/json, text/plain, */*",
                "accept-language": "en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7",
                "authorization": `Bearer ${this.token}`,
                "content-type": "application/json;charset=UTF-8",
                "sec-ch-ua": "\"Not.A/Brand\";v=\"8\", \"Chromium\";v=\"114\", \"Microsoft Edge\";v=\"114\"",
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": "\"Windows\"",
                "sec-fetch-dest": "empty",
                "sec-fetch-mode": "cors",
                "sec-fetch-site": "cross-site",
                "x-api-version": "2023-05-31",
                "x-club": "wnba",
                "x-hostname": `${this.host}`,
                "x-version": "7acb8ea",
                "Referer": `https://${this.host}/`,
                "Referrer-Policy": "strict-origin-when-cross-origin"
            },
            "body": `{\"members\":[\"${this.playerIds[0]}\",\"${this.playerIds[1]}\"],\"area\":\"${court}\",\"activity\":\"5aadd66e87c6b800048a2908\",\"startDate\":\"${startTime}\",\"endDate\":\"${endTime}\",\"mode\":\"615fcc5a03fdff65ad87ada7\",\"recurrence\":null,\"visitors\":[],\"sendConfirmationEmail\":true,\"forOthers\":false,\"reminderTime\":30,\"sendReminderEmail\":true}`,
            "method": "POST"
        });

        const bookResult = await bookResponse.json()

        if(bookResponse.ok && !!bookResult.bookedOn) {
            console.log(`Booking successfully, booked on ${bookResult.bookedOn}`)
            return true
        } else {
            console.log(`Booking Unsuccessfully, ${bookResult.message}`)
            return false
        }
    }


    async getAllEvents(startDate, endDate) {

        if(!this.token) {
            throw Error("Not login yet")
        }

        const eventsResponse = await fetch(`https://${this.apiHost}/event?fromDate=${startDate}T12:00:00.000Z&toDate=${endDate}T11:59:59.999Z`, {
            "headers": {
                "accept": "application/json, text/plain, */*",
                "authorization": `Bearer ${this.token}`,
                "sec-ch-ua": "\"Not.A/Brand\";v=\"8\", \"Chromium\";v=\"114\", \"Microsoft Edge\";v=\"114\"",
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": "\"Windows\"",
                "x-api-version": "2023-05-31",
                "x-club": "wnba",
                "x-hostname": `${this.host}`,
                "x-version": "a64316f",
                "Referer": `https://${this.host}/`,
                "Referrer-Policy": "strict-origin-when-cross-origin"
            },
            "body": null,
            "method": "GET"
        });

        return await eventsResponse.json()
    }

    async getAllBookings(startDate, endDate) {
        const bookingsResponse = await fetch(`https://${this.apiHost}/booking?fromDate=${startDate}T12:00:00.000Z&toDate=${endDate}T11:59:59.999Z`, {
            "headers": {
                "accept": "application/json, text/plain, */*",
                "authorization": `Bearer ${this.token}`,
                "sec-ch-ua": "\"Not.A/Brand\";v=\"8\", \"Chromium\";v=\"114\", \"Microsoft Edge\";v=\"114\"",
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": "\"Windows\"",
                "x-api-version": "2023-05-31",
                "x-club": "wnba",
                "x-hostname": `${this.host}`,
                "x-version": "a64316f",
                "Referer": `https://${this.host}/`,
                "Referrer-Policy": "strict-origin-when-cross-origin"
            },
            "body": null,
            "method": "GET"
        });
        return await bookingsResponse.json()
    }

}
