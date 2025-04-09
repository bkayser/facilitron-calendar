import ICAL from "ical.js";
import { Feed } from './downloadFeeds';

export default function rebuildEvents(feed: Feed): ICAL.Component[] {
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

        descriptionProperty.setValue(`${location} - ${fieldName} for ${eventName} reserved by ${feed.reservation.renter.last_name} on ${createdDate}\n${feed.reservation.url}`);
        locationProperty.setValue(location);
        summaryProperty.setValue(location + ' on ' + fieldName);
        event.addPropertyWithValue('URL', feed.reservation.url)
        return event;
    });
}