import readline from "readline";
import fs from "fs";
import * as events from "events";

export const extractTime = (str) => {
    const pattern = /\b\d{2}:\d{2}\b/;
    const match = str.match(pattern);
    if (match) {
        return match[0];
    } else {
        new Error("wrong time format")
    }
}


export const calculatePlus30MinutesTime = (inputTime, dateObj) => {
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
}

export const isWeekend = (dateObj) => {
    const dayOfWeek = dateObj.getDay();
    return dayOfWeek === 6 || dayOfWeek === 0;
}

export const isSuitableTime = (currentSlotTime, dateObj) => {
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
}

export const isPeakTime = (currentSlotTime, dateObj) => {
    const hour = parseInt(currentSlotTime.split(":")[0]);
    return isWeekend(dateObj) && hour === 16 || !isWeekend(dateObj) && hour === 21
}

export const readLines = async (filePath) => {
    const lines = [];
    const rl = readline.createInterface({
        input: fs.createReadStream(filePath),
    });

    rl.on('line', (line) => {
        lines.push(line)
    });

    await events.once(rl, 'close');

    return lines;
}

export const createBookedLockFile = ()=>{
    const date = new Date();
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();

    const filename = `${year}-${month}-${day}.lock`;

    fs.writeFile(filename, '', function(err) {
        if (err) {
            console.log(err);
        } else {
            console.log(`Booked lock file ${filename} created successfully.`);
        }
    });
}

export const checkLockFileExist = () => {
    const directory = './';
    try {
        const files = fs.readdirSync(directory);
        const lockFiles = files.filter(file => file.endsWith('.lock'));
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
}