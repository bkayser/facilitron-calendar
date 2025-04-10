import express, {Request, Response} from 'express';
import aggregateReservations from "./aggregateReservations"; // Ensure this is the correct path to your reservations module
import { subDays, format } from 'date-fns'; // For easy date calculation
import path from 'path';
const PORT: number = parseInt(process.env.PORT || '8080', 10);
const HOST: string = process.env.HOST || '0.0.0.0'; // Listen on all available interfaces

// --- Express Application Setup ---
const app = express();
// --- Configuration ---
app.set('view engine', 'ejs'); // Set EJS as the templating engine
app.set('views', path.join(__dirname, 'views')); // Tell Express where to find view files

// Middleware for logging requests
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// --- Route Definition ---
app.get('/reservations.ical', async (req: Request, res: Response) => {
    try {
        const { start_date:startDateParam, location:locationsParam } = req.query;

        const defaultDate = new Date();
        defaultDate.setDate(defaultDate.getDate() - 90);
        const startDate = startDateParam ? new Date(startDateParam as string) : defaultDate;
        const locations: string[] = locationsParam
            ? (Array.isArray(locationsParam)
                ? locationsParam.map(String)
                : [String(locationsParam)])
            : [];
        const combinedIcal = await aggregateReservations(startDate, locations);
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

app.get('/', (req, res) => {
    // Calculate default date (30 days ago)
    const today = new Date();
    const defaultDateRaw = subDays(today, 30);
    // Format as YYYY-MM-DD for the HTML date input value
    const defaultDateValue = format(defaultDateRaw, 'yyyy-MM-dd');
    const locations = [
        'Rex Putnam',
        'Lot Whitcomb',
        'Milwaukie',
        'Schellenberg',
        'Oak Grove',
        'Ann-Toni',
        'Clackamas',
        'Nelson',
        'Linwood',
        'View Acres',
        'Elementary',
        'High School',
        'Middle School'
        ];
    res.render('index', {
        defaultDate: defaultDateValue, // Pass default date to the template
        locations: locations            // Pass locations list to the template
    });
});

// Important: Check if the module is run directly (node server.js)
// This prevents the server from starting automatically when imported by tests.
if (require.main === module) {
    app.listen(PORT, HOST, () => {
        console.log(`🚀 iCal Aggregator Server version 1 listening on http://${HOST}:${PORT}`);
        console.log(`📅 Feed available at http://${HOST}:${PORT}/reservations.ical`);
    });
}