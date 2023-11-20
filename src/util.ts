import readline from "readline";
import fs from "fs";
import * as events from "events";

export const courtsEvaluator = {
    "5aadd66e87c6b800048a290e": 2,
    "5aadd66e87c6b800048a290f": 3,
    "5aadd66e87c6b800048a2910": 4,
    "5aadd66e87c6b800048a2911": 5,
    "5aadd66e87c6b800048a2912": -6,
    "5aadd66e87c6b800048a290d": -1,
};
export const extractTime = (str: string) => {
    const pattern = /\b\d{2}:\d{2}\b/;
    const match = str.match(pattern);
    if (match) {
        return match[0];
    } else {
        new Error("wrong time format");
    }
};


export const calculatePlus30MinutesTime = (inputTime: string, dateObj: Date) => {
    const inputMinutes = 30;
    const isoDate = dateObj.toISOString().slice(0, 10);
    const dateTime = new Date(`${isoDate}T${inputTime}:00`);

// Extract hours and minutes from the Date object
    let hours = dateTime.getHours();
    let minutes = dateTime.getMinutes();

// Add inputMinutes to the minutes
    minutes += inputMinutes;

// Handle case where minutes >= 60
    if (minutes >= 60) {
        hours += 1;
        minutes %= 60;
    }

// Format the hours and minutes as a string
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
};

export const isWeekend = (dateObj: Date) => {
    const dayOfWeek = dateObj.getDay();
    return dayOfWeek === 6 || dayOfWeek === 0;
};

export const isSuitableTime = (currentSlotTime: string, dateObj: Date) => {
    const hour = parseInt(currentSlotTime.split(":")[0]);
    const minutes = parseInt(currentSlotTime.split(":")[1]);
    if (hour === 23 && minutes === 30) {
        // booking no later than 23:30
        return false;
    }

    if (isWeekend(dateObj) && hour >= 16) {
        //after 16:00
        return true;
    }
    return !isWeekend(dateObj) && hour >= 21;
};

export const isPeakTime = (currentSlotTime: string, dateObj: Date) => {
    const hour = parseInt(currentSlotTime.split(":")[0]);
    return isWeekend(dateObj) && hour === 16 || !isWeekend(dateObj) && hour === 21;
};

export const readLines = async (filePath: string) => {
    const lines = [] as string[];
    const rl = readline.createInterface({
        input: fs.createReadStream(filePath),
    });

    rl.on("line", (line) => {
        lines.push(line);
    });

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    await events.once(rl, "close");

    return lines;
};

export const createBookedLockFile = (lockName?: string) => {
    const filename = lockName ? `${lockName}` : `${formatDateString(new Date())}.lock`;
    fs.writeFile(filename, "", function (err) {
        if (err) {
            console.log(err);
        } else {
            console.log(`Booked lock file ${filename} created successfully.`);
        }
    });
};

export const checkLockFileExist = (suffix?: string) => {
    const directory = "./";
    try {
        const files = fs.readdirSync(directory);
        const lockFiles = files.filter(file =>
            suffix ? file.endsWith(`.${suffix}`) : file.endsWith(".lock"));
        if (lockFiles.length > 0) {
            console.log(`Found ${lockFiles[0]} file in current directory`);
            return lockFiles[0];
        } else {
            console.log(`No .lock files found in ${directory}.`);
            return null;
        }
    } catch (err) {
        console.error(`Failed to read directory ${directory}: ${err}`);
    }
};

export const getFutureDate = (daysLater: number) => {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + daysLater);
    return futureDate;
};

export const formatDateString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};


type DayInWeek = "Sunday" | "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday"
const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export const getDayOfWeek = (date: Date) => {
    return daysOfWeek[date.getDay()];
};

export const getDateFromThisWeekDay = (day: DayInWeek) => {
    const today = new Date();
    const todayIndex = today.getDay();
    const targetIndex = daysOfWeek.indexOf(day);
    let dayDiff = targetIndex - todayIndex;
    dayDiff = dayDiff > 0 ? dayDiff : 7 + dayDiff;
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + dayDiff);
    return futureDate;
};

/**
 * Run callback function intensively until callback return true or forLong time reached
 * @param callback
 * @param interval
 * @param forLong
 */
export const intensivelyRun = (callback: () => Promise<boolean>, interval = 15 * 1000, forLong = 1000 * 60 * 10) => {
    const startTime = new Date();
    let result = false;

    const task = setInterval(async () => {
        const now = new Date();
        if (now.getTime() - startTime.getTime() > forLong) {
            clearInterval(task);
            console.log("++++++++++++Daily booking timeout unsuccessfully++++++++++");
            return;
        }
        result = await callback();
        console.log("Intensively running book result: ", result);
        if (result) {
            clearInterval(task);
            console.log("++++++++++++Daily booking successfully++++++++++");
            createBookedLockFile();
        }
    }, interval);

};