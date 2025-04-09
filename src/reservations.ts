/**
 * This utility module is responsible for fetching reservations from the Facilitron API.
 */
const axios = require('axios');
const {CookieJar} = require('tough-cookie');
const {wrapper} = require('axios-cookiejar-support');

type LoginParams = {
    email: string;
    login_client_id: string;
    login_method: string;
    password: string;
};

export interface Reservation extends ReservationPayload  {
    url: string; // Optional: URL to the reservation details, if available
    icalFeed: string;
}

/** This is the structure of the Reservations returned from the Facilitron API */
type ReservationPayload = {
    _id: string; // reservation ID
    approved_date: Date; // ISO date string
    created: Date; // ISO date string
    last_date: Date;
    event_name?: string; // Name of the event
    renter: { last_name: string };
    owner: { name: string; };
    total?: number; // Cost of the reservation, ensure this is a number
}

export type Reservations = Reservation[];

/**
 * Request Headers
 */
const headers2 = {
    'Accept': '*/*',
    'Accept-Encoding': 'gzip, deflate, br, zstd',
    'Accept-Language': 'en-US,en;q=0.9',
    'Connection': 'keep-alive',
    'Content-Type': 'application/json;charset=utf-8',
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36'
}
const headers =
    {
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Content-Type': 'application/json;charset=utf-8',
        'Host': 'www.facilitron.com',
        'Origin': 'https://www.facilitron.com',
        'Referer': 'https://www.facilitron.com/dashboard/reservations',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-origin',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
        'sec-ch-ua': '"Google Chrome";v="135", "Not-A.Brand";v="8", "Chromium";v="135"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"macOS"'
    }

export default async function fetchReservations(): Promise<Reservations> {
    const loginUrl = 'https://www.facilitron.com/accounts/login';
    const reservationsUrl = 'https://www.facilitron.com/api/reservations/dashboard_myreservations';

    const jar = new CookieJar();
    const client = wrapper(axios.create({
        jar,
        withCredentials: true, // Important for maintaining the session
        timeout: 10000, // 10 seconds
        headers: headers // Use the defined headers for consistency
    }));

    if (process.env.FACILITRON_EMAIL === undefined || process.env.FACILITRON_PASSWORD === undefined) {
        throw new Error('Environment variables FACILITRON_EMAIL and/or FACILITRON_PASSWORD are not set. Please set them before running this script.');
    }

    const loginParams: LoginParams = {
        email: process.env.FACILITRON_EMAIL || '',
        login_client_id: '', // This may need to be dynamic based on the actual form
        login_method: 'local',
        password: process.env.FACILITRON_PASSWORD || '',
    };
    const loginResponse = await client.post(loginUrl, loginParams);

    if (loginResponse.status !== 200) {
        throw new Error('Failed to log in');
    }

    const reservationsResponse = await client.post(reservationsUrl,
        {
            "ownerids": ["60b6ab18d0b5260058950367"],
            "start": 0,
            "limit": -1,
            "page": "reservations"
        });
    if (reservationsResponse.status !== 200) {
        throw new Error(`Failed to fetch reservations: ${reservationsResponse.status} ${reservationsResponse.statusText}`);
    }
    if (reservationsResponse.data.reservations === undefined) {
        /**
         * Handle the case where the reservations data is undefined
         */
        console.error('Reservations data is undefined:', JSON.stringify(reservationsResponse.data, null, 2));
        throw new Error('Failed to fetch reservations: No reservations data found in the response');
    }
    if (!Array.isArray(reservationsResponse.data.reservations)) {
        /**
         * Handle the case where reservations is not an array
         */
        console.error('Reservations data is not an array:', JSON.stringify(reservationsResponse.data.reservations, null, 2));
        throw new Error('Failed to fetch reservations: Reservations data is not an array');
    }
    return reservationsResponse.data.reservations.map((reservationObj: ReservationPayload) => {
        return { ...reservationObj,
            // Construct the reservation URL based on the reservation ID or other logic
            approved_date: new Date(reservationObj.approved_date),
            created: new Date(reservationObj.created),
            last_date: new Date(reservationObj.last_date),
            url: `https://www.facilitron.com/reservation/${reservationObj._id}`,
            icalFeed: `https://www.facilitron.com/icalendar/reservation/${reservationObj._id}`
        } as Reservation;
    }, {} as Reservations);
}