import {ApiHelper} from "./apiHelper";
import _ from "lodash";

type Court = { name: string; id: string; }
type RawBooking = { area: Court; startDate: string; endDate: string; mode: { name: string; }; }
type RawEvent = { areas: Court[]; startDate: string; endDate: string; name: string; }
type BookingTime = { endDate: string; name: string; type: string; startDate: string }
type BookedTimeByCourt = { bookingTimes: BookingTime[]; courtId: string }

export const getBookingAndEventTimes = async (startDate: string, endDate: string, apiHelper: ApiHelper) => {
    // const eventJsonString = await fs.readFile("../setup/events.json", "utf8")
    // const rawEvents = JSON.parse(eventJsonString);
    const rawEvents = await apiHelper.getAllEvents(startDate, endDate);
    let eventResult:BookedTimeByCourt[] = [];
    if (rawEvents.events) {
        eventResult = extractEventTimes(rawEvents.events);
        console.log("All events today", JSON.stringify(eventResult, null, 2));
    } else {
        console.log("No event found ", rawEvents);
    }

    // const bookingJsonString = await fs.readFile("../setup/bookings.json", "utf8")
    // const rawBookings = JSON.parse(bookingJsonString);
    const rawBookings = await apiHelper.getAllBookings(startDate, endDate);
    let bookingResult: BookedTimeByCourt[];
    if (rawBookings.bookings) {
        bookingResult = extractBookingTimes(rawBookings.bookings);
        console.log("All bookings today", JSON.stringify(bookingResult, null, 2));
    } else {
        console.log("No booking found ", rawBookings);
    }

    return eventResult.map(eventObj => {
        const sameCourtForBooking = bookingResult.find(bookingObj => bookingObj.courtId === eventObj.courtId);
        const peopleBookingTimes = sameCourtForBooking?.bookingTimes ?? [];
        const eventBookingTimes = eventObj?.bookingTimes ?? [];
        return {
            courtId: eventObj.courtId,
            bookingTimes: [...eventBookingTimes, ...peopleBookingTimes]
        };
    });
};

export const checkTimeAvailable = (courtId: string, ourStartDate: string, alreadyOccupiedTimesByCourtId:BookedTimeByCourt[]) => {
    if (alreadyOccupiedTimesByCourtId.length > 0) {
        const occupiedTimePerCourt = alreadyOccupiedTimesByCourtId.find(occ => occ.courtId === courtId);
        // check any of booking end time is later than our start time
        const unAvailable = occupiedTimePerCourt?.bookingTimes.some(bookedTime => {
            return new Date(bookedTime.endDate).getTime() > new Date(ourStartDate).getTime();
        });
        return !unAvailable;
    }
    console.log("Can't find already booked time");
    return false;
};

const extractBookingTimes = (rawBookings: RawBooking[]): BookedTimeByCourt[] => {
    const bookings = rawBookings.map((booking: RawBooking) => {
        return {
            courtName: booking.area.name,
            courtId: booking.area.id,
            startDate: booking.startDate,
            endDate: booking.endDate,
            name: booking.mode.name,
        };
    });

    return (_.chain(bookings).groupBy("courtId")).map((bookingObjs, courtId) => {
        return {
            courtId,
            bookingTimes: bookingObjs.map(obj => {
                return {
                    startDate: obj.startDate,
                    endDate: obj.endDate,
                    type: "booking",
                    name: obj.name,
                };
            })
        };
    }).value();
};

const extractEventTimes = (rawEvents: RawEvent[]): BookedTimeByCourt[] => {
    const result: BookedTimeByCourt[] = [];
    rawEvents.map((event: RawEvent) => {
        event.areas.forEach((court) => {
            const courtEvent = result.find(r => r.courtId === court.id);
            if (courtEvent) {
                courtEvent.bookingTimes.push({
                    startDate: event.startDate,
                    endDate: event.endDate,
                    type: "event",
                    name: event.name,
                });
            } else {
                result.push({
                    courtId: court.id,
                    bookingTimes: [{
                        startDate: event.startDate,
                        endDate: event.endDate,
                        type: "event",
                        name: event.name,
                    }]
                });
            }
        });
    });

    return result;
};


