import express, {Request, Response} from 'express';
import axios, {AxiosError} from 'axios';

// --- Configuration ---
// Array of iCal subscription URLs to aggregate
export const ICAL_URLS: string[] = [
    // Replace these with your actual iCal subscription URLs
    "https://www.facilitron.com/icalendar/reservation/MYK4GJWWY43C",
    "https://www.facilitron.com/icalendar/reservation/JSTJ7CRSRQHW",
    "https://www.facilitron.com/icalendar/reservation/UXRJRCYCKUUN",
    "https://www.facilitron.com/icalendar/reservation/36W9SWPN9DU5",
    "https://www.facilitron.com/icalendar/reservation/NUKKUM4YM8DK",
    "https://www.facilitron.com/icalendar/reservation/66EQ84QE3QU4",
    "https://www.facilitron.com/icalendar/reservation/CPK64ZHU7FHA",
    "https://www.facilitron.com/icalendar/reservation/QXGSUWM7QQ7B",
    "https://www.facilitron.com/icalendar/reservation/HRK7KAAUHE9H",
    "https://www.facilitron.com/icalendar/reservation/UQUZTQRMKP6J",
    "https://www.facilitron.com/icalendar/reservation/PAMB32FHSYXF",
    "https://www.facilitron.com/icalendar/reservation/UMC9YW2JK3PW",
    "https://www.facilitron.com/icalendar/reservation/DDDSBMQ7TCM6",
    "https://www.facilitron.com/icalendar/reservation/7HCUSET625RN",
    "https://www.facilitron.com/icalendar/reservation/FZS5YAGHTU48",
    "https://www.facilitron.com/icalendar/reservation/YDSUFFK4RKAW",
    "https://www.facilitron.com/icalendar/reservation/ZGTAPSRJRZ3N",
    "https://www.facilitron.com/icalendar/reservation/9QS2TPAJ4KCF",
    "https://www.facilitron.com/icalendar/reservation/U4ARJ922PCJN",
    "https://www.facilitron.com/icalendar/reservation/GFY7SDG6CH78",
    "https://www.facilitron.com/icalendar/reservation/BTHDU9ZRXZXR",
    "https://www.facilitron.com/icalendar/reservation/Y988H68U422E",
    "https://www.facilitron.com/icalendar/reservation/WSTQBQ42HGPG",
    "https://www.facilitron.com/icalendar/reservation/M3GQEZFX7RTC",
    "https://www.facilitron.com/icalendar/reservation/A5N5HQF7PSHM",
    "https://www.facilitron.com/icalendar/reservation/SFB3SGJAUBKM"
];

const PORT: number = parseInt(process.env.PORT || '8080', 10);
const HOST: string = process.env.HOST || '0.0.0.0'; // Listen on all available interfaces

type Feed = {
    id: string; // The reservation id
    content: string; // The actual content of the iCal feed
}

// --- Helper Function to Fetch and Process iCal Data ---
export async function fetchAndCombineIcalData(urls: string[]): Promise<string> {
    const fetchPromises = urls.map(async (url) => {
        try {
            const response = await axios.get(url, {
                // Set a reasonable timeout
                timeout: 10000, // 10 seconds
                // Important: Treat the response as plain text
                responseType: 'text',
                // Mimic a common calendar client User-Agent if needed
                headers: {
                    'User-Agent': 'NodeIcalAggregator/1.0',
                }
            });

            if (response.status === 200 && typeof response.data === 'string') {
                const id = url.match(/reservation\/(.*)$/)?.[1]; // Extract the reservation ID from the URL
                return <Feed>{id: id, content: response.data};
            } else {
                console.warn(`Failed to fetch ${url}: Status ${response.status}`);
                return null; // Indicate failure for this URL
            }
        } catch (error) {
            const axiosError = error as AxiosError;
            if (axiosError.isAxiosError) {
                console.error(`Error fetching ${url}: ${axiosError.message} (Status: ${axiosError.response?.status})`);
            } else {
                console.error(`Unexpected error fetching ${url}:`, error);
            }
            return null; // Indicate failure for this URL
        }
    });

    // Wait for all fetch requests to complete
    const results: (Feed | null)[] = await Promise.all(fetchPromises);

    // Filter out null results (failed fetches) and empty strings
    const reservationFeeds = results.filter((feed): feed is Feed => !!feed && feed.content.trim() !== '');

    if (reservationFeeds.length === 0) {
        console.warn("No valid iCal data could be fetched from any source.");
        // Return a minimal valid empty calendar
        return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//NodeIcalAggregator//EN
CALSCALE:GREGORIAN
END:VCALENDAR`;
    }

    // --- Combine the iCal data ---
    // The most robust way is to extract events (VEVENT blocks)
    // and wrap them in a single VCALENDAR block.

    let combinedEvents = '';
    const eventRegex = /BEGIN:VEVENT([\s\S]*?)END:VEVENT/g; // Regex to find VEVENT blocks

    reservationFeeds.forEach((feed, index) => {
        let match;
        let foundEventsInFile = false;
        // Reset lastIndex for each new content string
        eventRegex.lastIndex = 0;
        while ((match = eventRegex.exec(feed.content)) !== null) {
            let event = match[0]; // Full VEVENT block including BEGIN and END
            const fieldMatch = event.match(/SUMMARY:.*\(([^)]+)\)/);
            if (fieldMatch) {
                /**
                 * Replace the SUMMARY field with the content inside parentheses, if it exists.
                 */
                const description = fieldMatch[1].trim(); // Extract the content inside parentheses
                event = event.replace(fieldMatch[0], `SUMMARY:${description}`);
            }
            event = event.replace("END:VEVENT",
                "URL:https://www.facilitron.com/dashboard/reservation/" + feed.id + "\r\nEND:VEVENT"); // Ensure each VEVENT block ends with CRLF for proper formatting in iCalendar
            combinedEvents += event + '\r\n'; // Add the full event block + standard CRLF
            foundEventsInFile = true;
        }
        if (!foundEventsInFile) {
            console.warn(`No VEVENT blocks found in content from URL index ${index}. Content might be invalid or empty.`);
        }
    });

    // Construct the final iCal string
    // Adding common properties. You might want to customize PRODID
    return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//YourCompanyName//NodeIcalAggregator//EN
CALSCALE:GREGORIAN
${combinedEvents.trim()}
END:VCALENDAR`;
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
        const combinedIcal = await fetchAndCombineIcalData(ICAL_URLS);

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