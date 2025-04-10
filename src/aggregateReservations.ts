import fetchReservations from './reservations';
import ICAL from "ical.js";
import rebuildEvents from "./rebuildEvent";
import downloadFeeds from "./downloadFeeds"; // Ensure this is the correct path to your reservations module

// --- Helper Function to Fetch and Process iCal Data ---
export default async function aggregateReservations(startDate: Date = new Date(), locations: string[] = []) {
    const calendar = new ICAL.Component('VCALENDAR');
    calendar.addPropertyWithValue('VERSION', '2.0');
    calendar.addPropertyWithValue('CALSCALE', 'GREGORIAN');
    calendar.addPropertyWithValue('PRODID', '-//NodeIcalAggregator//EN');
    calendar.addPropertyWithValue('METHOD', 'PUBLISH');
    calendar.addPropertyWithValue('TIMEZONE-ID', 'America/Los_Angeles');
    calendar.addPropertyWithValue('X-WR-TIMEZONE', 'America/Los_Angeles');
    calendar.addPropertyWithValue('X-WR-CALNAME', 'Facilitron Reservations Calendar');
    calendar.addPropertyWithValue('X-WR-CALDESC', 'Combined events across a set of Facilitron reservations');

    const allReservations = await fetchReservations();
    const filteredReservations = allReservations.filter(reservation => {
        return reservation.last_date.getTime() > startDate.getTime() &&
            (locations.length === 0 || locations.some(location => reservation.owner.name.includes(location)));
    });

    const feedPromises = downloadFeeds(filteredReservations).map(async (feedPromise) => {
        const feed = await feedPromise;
        return feed && rebuildEvents(feed);
    });
    const feedEvents = await Promise.all(feedPromises);
    /* Combine all the event arrays stored in the completed feedPromises into a single array */
    const allEvents = feedEvents.filter(feed => feed !== null).flat();
    const sortedEvents = allEvents.sort((a, b) => {
        const aStart = a.getFirstPropertyValue('dtstart') as ICAL.Time;
        const bStart = b.getFirstPropertyValue('dtstart') as ICAL.Time;
        return aStart.toUnixTime() - bStart.toUnixTime();
    })
    for (const event of sortedEvents) {
        if ((event.getFirstPropertyValue('dtstart') as ICAL.Time).toJSDate().getTime() >= startDate.getTime()) {
            calendar.addSubcomponent(event);
        }
    }
    return calendar.toString();
}