import readline from "readline";
import fs from "fs";

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
    const timeSlot = parseInt(currentSlotTime.split(":"));
    const hour = timeSlot[0];
    const minutes = timeSlot[1];

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

export const readLines = (filePath) => {
    const lines = [];
    const rl = readline.createInterface({
        input: fs.createReadStream(filePath),
    });

    rl.on('line', (line) => {
        lines.push(line)
    });

    rl.on('close', () => {
        rl.close();
    });

    return lines;
}