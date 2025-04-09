import express, {Request, Response} from 'express';
import aggregateReservations from "./aggregateReservations"; // Ensure this is the correct path to your reservations module

const PORT: number = parseInt(process.env.PORT || '8080', 10);
const HOST: string = process.env.HOST || '0.0.0.0'; // Listen on all available interfaces

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

        const { startDateParam, locationsParam } = req.query;

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