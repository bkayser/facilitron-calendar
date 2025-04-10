import ICAL from "ical.js";
import { Feed } from './downloadFeeds';

// Define the time zone data for 'America/Los_Angeles'
const pacificTimeZoneData = `
BEGIN:VTIMEZONE
TZID:America/Los_Angeles
BEGIN:STANDARD
DTSTART:18831118T120702
TZOFFSETFROM:-0752
TZOFFSETTO:-0800
TZNAME:PST
END:STANDARD
BEGIN:DAYLIGHT
DTSTART:19180331T020000
TZOFFSETFROM:-0800
TZOFFSETTO:-0700
TZNAME:PDT
END:DAYLIGHT
END:VTIMEZONE
`;

// Register the time zone with TimezoneService

export default function rebuildEvents(feed: Feed): ICAL.Component[] {
    const pacificTimeZoneComponent = ICAL.Component.fromString(pacificTimeZoneData);
    const pacificTimeZone = ICAL.Timezone.fromData(pacificTimeZoneComponent);
    return feed.events.map(event => {
        const summaryProperty = event.getFirstProperty('summary') || event.addPropertyWithValue('summary', '');
        const descriptionProperty = event.getFirstProperty('description') || event.addPropertyWithValue('description', '');
        const locationProperty = event.getFirstProperty('location') || event.addPropertyWithValue('location', '');

        const fieldMatch = summaryProperty?.getFirstValue()?.toString()?.match(/^(.*?) - ([^(]*)\(([^)]+)\)/); // Match the content inside parentheses
        const location = feed.reservation.owner.name;
        const fieldName = fieldMatch ? fieldMatch[2].trim() : 'Main';
        const eventName = feed.reservation.event_name || 'Soccer';
        const createdDate =
            new Intl.DateTimeFormat('en-US', {
                month: 'short',
                day: 'numeric'
            }).format(feed.reservation.created);

        descriptionProperty.setValue(`${eventName} at ${location} (${fieldName}) reserved by ${feed.reservation.renter.last_name} on ${createdDate}\n${feed.reservation.url}`);
        locationProperty.setValue(location);
        summaryProperty.setValue(location);
        event.addPropertyWithValue('URL', feed.reservation.url);
        // Convert start and end times to local timezone
        const startTimeLocal = (event.getFirstPropertyValue('dtstart') as ICAL.Time);
        const endTimeLocal = (event.getFirstPropertyValue('dtend') as ICAL.Time);
        event.removeProperty('dtstart');
        event.removeProperty('dtend');
        event.addPropertyWithValue('dtstart', startTimeLocal.convertToZone(pacificTimeZone));
        event.addPropertyWithValue('dtend', endTimeLocal.convertToZone(pacificTimeZone));
        return event;
    });
}