import express, {Request, Response} from 'express';
import {fetchReservations, Reservations} from './reservations';
import {downloadFeeds, Feed} from "./downloadFeeds";
import Property from "ical.js/dist/types/property";
import ICAL from "ical.js";
import rebuildEvents from "./rebuildEvent"; // Ensure this is the correct path to your reservations module
// --- Configuration ---


const PORT: number = parseInt(process.env.PORT || '8080', 10);
const HOST: string = process.env.HOST || '0.0.0.0'; // Listen on all available interfaces

// --- Helper Function to Fetch and Process iCal Data ---
export async function fetchAndCombineIcalData(): Promise<string> {
    const calendar = new ICAL.Component('VCALENDAR');
    calendar.addPropertyWithValue('VERSION', '2.0');
    calendar.addPropertyWithValue('CALSCALE', 'GREGORIAN');
    calendar.addPropertyWithValue('PRODID', '-//NodeIcalAggregator//EN');
    calendar.addPropertyWithValue('METHOD', 'PUBLISH');
    calendar.addPropertyWithValue('TIMEZONE-ID', 'America/Los_Angeles');
    calendar.addPropertyWithValue('X-WR-TIMEZONE', 'America/Los_Angeles');
    calendar.addPropertyWithValue('X-WR-CALNAME', 'Facilitron Reservations Calendar');
    calendar.addPropertyWithValue('X-WR-CALDESC', 'Combined events across a set of Facilitron reservations');

    const reservations: Reservations = await fetchReservations(); // Ensure we have the latest reservations before fetching iCal data
    const feeds: Feed[] = await downloadFeeds(reservations); // Use the reservations to fetch feeds
    feeds.forEach((feed, index) => {
        if (rebuildEvents(calendar, feed) === 0) {
            console.warn(`No VEVENT blocks found in content from URL index ${index}. Content might be invalid or empty.`);
        }
    });
    // Return the combined iCal data as a string
    return calendar.toString();
}


// --- Express Application Setup ---
const app = express();

// Middleware for logging requests
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// --- Route Definition ---
app.get('/reservations.ical', async (req: Request, res: Response) => {
    try {
        const combinedIcal = await fetchAndCombineIcalData();

        res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="reservations.ics"'); // Suggest filename
        // Prevent caching to ensure clients always get fresh data
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');

        res.status(200).send(combinedIcal);

    } catch (error) {
        console.error('Error generating combined iCal feed:', error);
        res.status(500).send('Internal Server Error: Could not generate iCal feed.');
    }
});

// --- Default Route for Root Path ---
app.get('/', (req: Request, res: Response) => {
    res.status(200).send('iCal Aggregator is running. Access the feed at /reservations.ical');
});
// Important: Check if the module is run directly (node server.js)
// This prevents the server from starting automatically when imported by tests.
if (require.main === module) {
    app.listen(PORT, HOST, () => {
        console.log(`🚀 iCal Aggregator Server listening on http://${HOST}:${PORT}`);
        console.log(`📅 Feed available at http://${HOST}:${PORT}/reservations.ical`);
    });
}