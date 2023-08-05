import {courtsEvaluator} from "./main";

export class ApiHelper {
    private token: string;
    private readonly apiHost: string;
    private readonly host: string;
    private headers: any

    constructor(apiHost: string, host: string, token?: string) {
        this.apiHost = apiHost;
        this.host = host;
        this.token = token;

        this.headers = {
            "accept": "application/json, text/plain, */*",
            "authorization": `Bearer ${this.token}`,
            "accept-language": "en-GB,en-US;q=0.9,en;q=0.8",
            "content-type": "application/json;charset=UTF-8",
            "sec-ch-ua": "\"Not.A/Brand\";v=\"8\", \"Chromium\";v=\"114\", \"Microsoft Edge\";v=\"114\"",
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": "\"Windows\"",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "cross-site",
            "x-api-version": "2023-07-18",
            "x-club": "wnba",
            "x-hostname": `${this.host}`,
            "x-version": "9fd0072",
        }
    }


    async login(username: string, password: string) {

        const loginResponse = await fetch(`https://${this.apiHost}/auth/token`, {
            "headers": this.headers,
            "body": `{"username":"${username}","password":"${password}","clientId":"helloclub-client","grantType":"password"}`,
            "method": "POST"
        });

        const data = await loginResponse.json();
        if (loginResponse.ok) {
            this.token = data.access_token;

            this.headers = {
                "accept": "application/json, text/plain, */*",
                "authorization": `Bearer ${this.token}`,
                "accept-language": "en-GB,en-US;q=0.9,en;q=0.8",
                "content-type": "application/json;charset=UTF-8",
                "sec-ch-ua": "\"Not.A/Brand\";v=\"8\", \"Chromium\";v=\"114\", \"Microsoft Edge\";v=\"114\"",
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": "\"Windows\"",
                "sec-fetch-dest": "empty",
                "sec-fetch-mode": "cors",
                "sec-fetch-site": "cross-site",
                "x-api-version": "2023-07-18",
                "x-club": "wnba",
                "x-hostname": `${this.host}`,
                "x-version": "9fd0072",
            }
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

        const body = `{"members":[${playerList}],"area":"${court}","activity":"5aadd66e87c6b800048a2908","startDate":"${startTime}","endDate":"${endTime}","mode":"${playMode}","recurrence":null,"visitors":[],"sendConfirmationEmail":false,"forOthers":false,"reminderTime":30,"sendReminderEmail":false}`

        const bookResponse = await fetch(`https://${this.apiHost}/booking`, {
            "headers": this.headers,
            "referrer": `https://${this.host}/`,
            "referrerPolicy": "strict-origin-when-cross-origin",
            "body": body,
            "method": "POST",
            "mode": "cors",
            "credentials": "include"
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
            "headers": this.headers,
            "referrer": `https://${this.host}/`,
            "referrerPolicy": "strict-origin-when-cross-origin",
            "body": null,
            "method": "GET",
            "mode": "cors",
            "credentials": "include"
        });

        return await eventsResponse.json();
    }

    async getAllBookings(startDate: string, endDate: string) {
        const bookingsResponse = await fetch(`https://${this.apiHost}/booking?activity=5aadd66e87c6b800048a2908&isRemoved=false&fromDate=${startDate}T12:00:00.000Z&toDate=${endDate}T11:59:59.999Z`, {
            "headers": this.headers,
            "referrer": `https://${this.host}/`,
            "referrerPolicy": "strict-origin-when-cross-origin",
            "body": null,
            "method": "GET",
            "mode": "cors",
            "credentials": "include"
        });
        return await bookingsResponse.json();
    }

}
