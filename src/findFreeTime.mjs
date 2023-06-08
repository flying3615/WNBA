import _ from 'lodash';

const getAllEvents = async (startDate, endDate, apiHost, token, host) => {
    const eventsResponse = await fetch(`https://${apiHost}/event?fromDate=${startDate}T12:00:00.000Z&toDate=${endDate}T11:59:59.999Z`, {
        "headers": {
            "accept": "application/json, text/plain, */*",
            "authorization": `Bearer ${token}`,
            "sec-ch-ua": "\"Not.A/Brand\";v=\"8\", \"Chromium\";v=\"114\", \"Microsoft Edge\";v=\"114\"",
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": "\"Windows\"",
            "x-api-version": "2023-05-31",
            "x-club": "wnba",
            "x-hostname": `${host}`,
            "x-version": "a64316f",
            "Referer": `https://${host}/`,
            "Referrer-Policy": "strict-origin-when-cross-origin"
        },
        "body": null,
        "method": "GET"
    });

    return await eventsResponse.json()

}

const getAllBookings = async (startDate, endDate, apiHost, token, host) => {
    const bookingsResponse = await fetch(`https://${apiHost}/booking?fromDate=${startDate}T12:00:00.000Z&toDate=${endDate}T11:59:59.999Z`, {
        "headers": {
            "accept": "application/json, text/plain, */*",
            "authorization": `Bearer ${token}`,
            "sec-ch-ua": "\"Not.A/Brand\";v=\"8\", \"Chromium\";v=\"114\", \"Microsoft Edge\";v=\"114\"",
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": "\"Windows\"",
            "x-api-version": "2023-05-31",
            "x-club": "wnba",
            "x-hostname": `${host}`,
            "x-version": "a64316f",
            "Referer": `https://${host}/`,
            "Referrer-Policy": "strict-origin-when-cross-origin"
        },
        "body": null,
        "method": "GET"
    });
    return await bookingsResponse.json()
}

export const getBookingAndEventTimes = async (startDate, endDate, apiHost, token, host) => {
    // const eventJsonString = await fs.readFile("../setup/events.json", "utf8")
    // const rawEvents = JSON.parse(eventJsonString);
    const rawEvents = await getAllEvents(startDate, endDate, apiHost, token, host)
    let eventResult = []
    if (rawEvents.events) {
        eventResult = extractEventTimes(rawEvents.events)
    } else {
        console.log("No event found ", rawEvents)
    }


    // const bookingJsonString = await fs.readFile("../setup/bookings.json", "utf8")
    // const rawBookings = JSON.parse(bookingJsonString);
    const rawBookings = await getAllBookings(startDate, endDate, apiHost, token, host)
    let bookingResult = []
    if (rawBookings.bookings) {
        bookingResult = extractBookingTimes(rawBookings.bookings)
    } else {
        console.log("No booking found ", rawBookings)
    }

    return eventResult.map(eventObj => {
        const sameCourtForBooking = bookingResult.find(bookingObj => bookingObj.courtId === eventObj.courtId)
        const peopleBookingTimes = sameCourtForBooking.bookingTimes ? sameCourtForBooking.bookingTimes : []
        const eventBookingTimes = eventObj.bookingTimes ? eventObj.bookingTimes : []
        return {
            courtId: eventObj.courtId,
            bookingTimes: [...eventBookingTimes, ...peopleBookingTimes]
        }
    })
}


const extractBookingTimes = (rawBookings) => {
    const bookings = rawBookings.map(booking => {
        return {
            courtName: booking.area.name,
            courtId: booking.area.id,
            startDate: booking.startDate,
            endDate: booking.endDate,
            name: booking.mode.name,
        }
    })

    return (_.chain(bookings).groupBy("courtId")).map((bookingObjs, courtId) => {
        return {
            courtId,
            bookingTimes: bookingObjs.map(obj => {
                return {
                    startDate: obj.startDate,
                    endDate: obj.endDate,
                    type: "booking",
                    name: obj.name,
                }
            })
        }
    }).value()
}

const extractEventTimes = (rawEvents) => {
    const result = []
    rawEvents.map(event => {
        event.areas.forEach((court) => {
            const courtEvent = result.find(r => r.courtId === court.id)
            if (courtEvent) {
                courtEvent.bookingTimes.push({
                    startDate: event.startDate,
                    endDate: event.endDate,
                    type: "event",
                    name: event.name,
                })
            } else {
                result.push({
                    courtId: court.id,
                    bookingTimes: [{
                        startDate: event.startDate,
                        endDate: event.endDate,
                        type: "event",
                        name: event.name,
                    }]
                })
            }
        })
    })

    return result
}


