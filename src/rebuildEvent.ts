import ICAL from "ical.js";
import {Feed} from "./downloadFeeds";

export default function rebuildEvents(calendar: ICAL.Component, feed: Feed): number {
    let count = 0;
    for (const event of [...feed.events]) {
        ++count;
        const summaryProperty = event.getFirstProperty('summary') || event.addPropertyWithValue('summary', '');
        const descriptionProperty = event.getFirstProperty('description') || event.addPropertyWithValue('description', '');
        const locationProperty = event.getFirstProperty('location') || event.addPropertyWithValue('location', '');

        const fieldMatch = summaryProperty?.getFirstValue()?.toString()?.match(/^([^(]*)\(([^)]+)\)/); // Match the content inside parentheses
        const location = fieldMatch ? fieldMatch[2].trim() : feed.reservation.owner?.name;
        const fieldName = fieldMatch ? fieldMatch[1].trim() : 'Main';
        const createdDate =
            new Intl.DateTimeFormat('en-US', {
                month: 'short',
                day: 'numeric'
            }).format(new Date(feed.reservation.created));

        descriptionProperty.setValue(`${location} - ${fieldName} reserved by ${feed.reservation.renter.last_name} on ${createdDate}\n${feed.reservation.url}`);
        locationProperty.setValue(location);
        summaryProperty.setValue(location + ' on ' + fieldName);
        event.addPropertyWithValue('URL', feed.reservation.url)
        calendar.addSubcomponent(event); // Add the event to the calendar
    }
    return count;
}