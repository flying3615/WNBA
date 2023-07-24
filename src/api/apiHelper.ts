import {courtsEvaluator} from "./main";

export class ApiHelper {
    private token: string;
    private readonly apiHost: string;
    private readonly host: string;

    constructor(apiHost: string, host: string, token?: string) {
        this.apiHost = apiHost;
        this.host = host;
        this.token = token;
    }


    async login(username: string, password: string) {

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
                "Referer": `https://${this.host}`,
                "Referrer-Policy": "strict-origin-when-cross-origin"
            },
            "body": `{"username":"${username}","password":"${password}","clientId":"helloclub-client","grantType":"password"}`,
            "method": "POST"
        });

        const data = await loginResponse.json();
        if (loginResponse.ok) {
            this.token = data.access_token;
            return true;
        }
        return false;
    }

    async bookCourt(court: string, startTime: string, endTime: string, playerIds: string[]) {

        const singleMode = "615fcc5a03fdff65ad87ada7";
        const doubleMode = "615fcc9db35243a097257517";

        if (!playerIds) {
            throw Error("No player found");
        }

        const playerList = playerIds.filter(p=>p!=="").map(p=>`"${p}"`).join(",");

        const playMode = playerIds.length > 2 ? doubleMode : singleMode;

        const body = `{"members":[${playerList}],"area":"${court}","activity":"5aadd66e87c6b800048a2908","startDate":"${startTime}","endDate":"${endTime}","mode":"${playMode}","recurrence":null,"visitors":[],"sendConfirmationEmail":true,"forOthers":false,"reminderTime":30,"sendReminderEmail":true}`

        console.log(body)

        const bookResponse = await fetch(`https://${this.apiHost}/booking`, {
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
                "Referer": `https://${this.host}`,
                "Referrer-Policy": "strict-origin-when-cross-origin"
            },
            "body": body,
            "method": "POST"
        });

        const bookResult = await bookResponse.json();

        const courtNumber = Math.abs(courtsEvaluator[court]);
        if (bookResponse.ok && !!bookResult.bookedOn) {
            console.log(`Booking successfully, booked court ${courtNumber} on ${bookResult.bookedOn} from ${startTime} to ${endTime}`);
            return true;
        } else {
            // TODO send email
            console.log(`Booking Unsuccessfully, failed to booked court ${courtNumber} from ${startTime} to ${endTime} due to ${bookResult.message}`);
            return false;
        }
    }


    async getAllEvents(startDate: string, endDate: string) {

        if (!this.token) {
            throw Error("Not login yet");
        }

        const eventsResponse = await fetch(`https://${this.apiHost}/event?activity=5aadd66e87c6b800048a2908&isRemoved=false&fromDate=${startDate}T12:00:00.000Z&toDate=${endDate}T11:59:59.999Z`, {
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
                "Referer": `https://${this.host}`,
                "Referrer-Policy": "strict-origin-when-cross-origin"
            },
            "body": null,
            "method": "GET"
        });

        return await eventsResponse.json();
    }

    async getAllBookings(startDate: string, endDate: string) {
        const bookingsResponse = await fetch(`https://${this.apiHost}/booking?activity=5aadd66e87c6b800048a2908&isRemoved=false&fromDate=${startDate}T12:00:00.000Z&toDate=${endDate}T11:59:59.999Z`, {
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
                "Referer": `https://${this.host}`,
                "Referrer-Policy": "strict-origin-when-cross-origin"
            },
            "body": null,
            "method": "GET"
        });
        return await bookingsResponse.json();
    }

}
