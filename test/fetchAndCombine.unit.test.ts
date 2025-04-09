import axios, {AxiosError, AxiosHeaders, AxiosResponse, InternalAxiosRequestConfig} from 'axios';
import {mocked} from 'jest-mock';
import {fetchAndCombineIcalData} from '../src/server';
import assert from 'node:assert';
import * as reservationsModule from '../src/reservations';
import ICAL from "ical.js";
import {Reservation} from "../src/reservations";

jest.mock('../src/reservations', () => ({
    fetchReservations: jest.fn()
}));

jest.mock('axios');

const mockedAxiosGet = mocked(axios.get);

describe('fetchAndCombineIcalData', () => {
    const urls = [
        "https://www.facilitron.com/icalendar/reservation/YIUDOAWWY43C",
        "https://www.facilitron.com/icalendar/reservation/MYK4GJWWY43C"
    ];
    function createMockCalendar() {
        const calendar = new ICAL.Component('VCALENDAR');
        calendar.addPropertyWithValue('VERSION', '2.0');
        calendar.addPropertyWithValue('PRODID', '-//NodeIcalAggregator//EN');
        return calendar;
    }

    function addMockIcalEvent(
        calendar: ICAL.Component,
        uid: string,
        summary: string): ICAL.Component {
        const event = new ICAL.Component('VEVENT');
        event.addPropertyWithValue('UID', uid);
        event.addPropertyWithValue('SUMMARY', summary);
        event.addPropertyWithValue('DTSTART', '20250405T100000Z');
        event.addPropertyWithValue('DTEND', '20250405T110000Z');
        calendar.addSubcomponent(event);
        return calendar;
    }

    const mockIcalData1 = createMockCalendar();
    addMockIcalEvent(mockIcalData1,'reservation1.1','Event 1 from Source 1');

    const mockIcalData2 = createMockCalendar();
    addMockIcalEvent(mockIcalData2,'reservation2.1','Practice - Baseball (Milwaukie High)');
    addMockIcalEvent(mockIcalData2,'reservation2.2','Game - Turf (Rex Putnam)');
    addMockIcalEvent(mockIcalData2,'reservation2.3','Event 4 from Source 2');

    const mockIcalData3 = createMockCalendar();
    addMockIcalEvent(mockIcalData3, 'reservation3.1', 'Soccer practice - Field - Soccer - Southwest (Lot Whitcomb Elementary School)');
    addMockIcalEvent(mockIcalData3, 'reservation3.2', 'Practice - Field - Football (Rex Putnam High School)');

    beforeEach(() => {
        mockedAxiosGet.mockReset();
        (reservationsModule.fetchReservations as jest.Mock).mockClear();
    });

    it('should combine events from multiple successful fetches', async () => {
        (reservationsModule.fetchReservations as jest.Mock).mockResolvedValue([
            {
                _id: 'YIUDOAWWY43C',
                icalFeed: urls[0],
                created: '2021-06-07T15:57:56.312Z',
                owner: { name: 'NCSD'},
                renter: { last_name: 'Doe' }
            },
            {
                _id: 'MYK4GJWWY43C',
                icalFeed: urls[1],
                created: '2021-06-07T15:57:56.312Z',
                owner: { name: 'NCSD'},
                renter: { last_name: 'Smith' }
            }
        ] as Reservation[]);

        mockedAxiosGet.mockImplementation((async (url): Promise<AxiosResponse<string>> => {
            // Define request headers inline for the config object
            const requestHeaders = new AxiosHeaders({'Accept': 'text/calendar'});

            if (url === urls[0]) {
                const response: AxiosResponse<string> = {
                    data: mockIcalData1.toString(),
                    status: 200,
                    statusText: 'OK',
                    headers: {'content-type': 'text/calendar'}, // Response headers
                    // Construct config inline, ensuring headers is present
                    config: {headers: requestHeaders} as InternalAxiosRequestConfig // Request config
                };
                return Promise.resolve(response);
            }
            if (url === urls[1]) {
                const response: AxiosResponse<string> = {
                    data: mockIcalData2.toString(),
                    status: 200,
                    statusText: 'OK',
                    headers: {'content-type': 'text/calendar'}, // Response headers
                    // Construct config inline
                    config: {headers: requestHeaders} as InternalAxiosRequestConfig // Request config
                };
                return Promise.resolve(response);
            }
            const error = new AxiosError(`Unexpected URL requested in mock: ${url}`);
            // Ensure error config also conforms
            error.config = {headers: requestHeaders} as InternalAxiosRequestConfig;
            return Promise.reject(error);
        }) as jest.Mock);

        const result = await fetchAndCombineIcalData();
        const jcal = ICAL.Component.fromString(result);
        const events = jcal.getAllSubcomponents('vevent');
        assert.strictEqual(jcal.getAllProperties().length, 8, 'Expected 8 properties in the VCALENDAR object');
        assert.strictEqual(events.length, 4, 'Expected 4 VEVENT components in the VCALENDAR object');

        assert.equal(events[0].getFirstPropertyValue('summary'), 'NCSD on Main');
        assert.equal(events[1].getFirstPropertyValue('summary'), 'Milwaukie High on Baseball');
        assert.equal(events[2].getFirstPropertyValue('summary'), 'Rex Putnam on Turf');
        assert.equal(events[3].getFirstPropertyValue('summary'), 'NCSD on Main');

    });

    it('clean up the summary field', async () => {
        const urls = ["https://www.facilitron.com/icalendar/reservation/MYK4GJWWY43C"];
        (reservationsModule.fetchReservations as jest.Mock).mockResolvedValue([
            {
                _id: 'YIUDOAWWY43C',
                icalFeed: urls[0],
                created: '2021-06-07T15:57:56.312Z',
                owner: { name: 'NCSD'},
                renter: { last_name: 'Doe' }
            }
        ]);
        mockedAxiosGet.mockImplementation((async (url): Promise<AxiosResponse<string>> => {
            const requestHeaders = new AxiosHeaders({'Accept': 'text/calendar'});

            const response: AxiosResponse<string> = {
                data: mockIcalData3.toString(),
                status: 200,
                statusText: 'OK',
                headers: {'content-type': 'text/calendar'}, // Response headers
                // Construct config inline, ensuring headers is present
                config: {headers: requestHeaders} as InternalAxiosRequestConfig // Request config
            };
            return Promise.resolve(response);
        }) as jest.Mock);

        const result = await fetchAndCombineIcalData();
        const jcal = ICAL.Component.fromString(result);
        const events = jcal.getAllSubcomponents('vevent');
        assert.strictEqual(jcal.getAllProperties().length, 8, 'Expected 8 properties in the VCALENDAR object');
        assert.strictEqual(events.length, 2, 'Expected 2 VEVENT components in the VCALENDAR object');

        assert.equal(events[0].getFirstPropertyValue('summary'), 'Lot Whitcomb Elementary School on Field - Soccer - Southwest');

    });

    it('should handle partial failures gracefully', async () => {
        const urls = [
            "https://www.facilitron.com/icalendar/reservation/MYIUDOAWWY43C",
            "https://www.failitron.com/icalendar/reservation/MYK4GJWWY43C"];

        mockedAxiosGet.mockImplementation((async (url): Promise<AxiosResponse<string>> => {
            const requestHeaders = new AxiosHeaders({'Accept': 'text/calendar'});

            if (url === urls[0]) {
                const response: AxiosResponse<string> = {
                    data: mockIcalData1.toString(), status: 200, statusText: 'OK',
                    headers: {'content-type': 'text/calendar'},
                    config: {headers: requestHeaders} as InternalAxiosRequestConfig
                };
                return Promise.resolve(response);
            }
            if (url === urls[1]) {
                const error = new AxiosError('Not Found', '404');
                // Construct the config for the error correctly
                const errorConfig = {headers: requestHeaders} as InternalAxiosRequestConfig;
                error.config = errorConfig;
                error.response = { // Mock the response within the error
                    data: 'Not Found', status: 404, statusText: 'Not Found',
                    headers: {}, config: errorConfig // Use the same config here
                };
                return Promise.reject(error);
            }
            const error = new AxiosError(`Unexpected URL requested in mock: ${url}`);
            error.config = {headers: requestHeaders} as InternalAxiosRequestConfig;
            return Promise.reject(error);
        }) as jest.Mock);

        const result = await fetchAndCombineIcalData();
        // ... assertions ...
    });

    // Apply similar changes to config objects in other tests...

    it('should handle responses with no VEVENT blocks', async () => {
        const urls = [
            "https://www.facilitron.com/icalendar/reservation/MYIUDOAWWY43C",
            "https://www.emptytron.com/icalendar/reservation/MYK4GJWWY43C"];
        mockedAxiosGet.mockImplementation((async (url): Promise<AxiosResponse<string>> => {
            const requestHeaders = new AxiosHeaders({'Accept': 'text/calendar'});
            if (url === urls[0]) {
                const response: AxiosResponse<string> = {
                    data: mockIcalData1.toString(), status: 200, statusText: 'OK',
                    headers: {'content-type': 'text/calendar'},
                    config: {headers: requestHeaders} as InternalAxiosRequestConfig
                };
                return Promise.resolve(response);
            }
            if (url === urls[1]) {
                const response: AxiosResponse<string> = {
                    data: createMockCalendar().toString(), status: 200, statusText: 'OK',
                    headers: {'content-type': 'text/calendar'},
                    config: {headers: requestHeaders} as InternalAxiosRequestConfig
                };
                return Promise.resolve(response);
            }
            const error = new AxiosError(`Unexpected URL requested in mock: ${url}`);
            error.config = {headers: requestHeaders} as InternalAxiosRequestConfig;
            return Promise.reject(error);
        }) as jest.Mock);

        const result = await fetchAndCombineIcalData();
        // ... assertions ...
    });


    it('should handle non-200 status codes as failures', async () => {
        const urls = [
            "https://www.facilitron.com/icalendar/reservation/MYIUDOAWWY43C",
            "https://www.errortron.com/icalendar/reservation/MYK4GJWWY43C"];
        mockedAxiosGet.mockImplementation((async (url): Promise<AxiosResponse<string>> => {
            const requestHeaders = new AxiosHeaders({'Accept': 'text/calendar'});
            if (url === urls[0]) {
                const response: AxiosResponse<string> = {
                    data: mockIcalData1.toString(), status: 200, statusText: 'OK',
                    headers: {'content-type': 'text/calendar'},
                    config: {headers: requestHeaders} as InternalAxiosRequestConfig
                };
                return Promise.resolve(response);
            }
            if (url === urls[1]) {
                const response: AxiosResponse<string> = { // Still RESOLVE, but with status 500
                    data: 'Server Error', status: 500, statusText: 'Internal Server Error',
                    headers: {},
                    config: {headers: requestHeaders} as InternalAxiosRequestConfig // Use correct config structure
                };
                return Promise.resolve(response);
            }
            const error = new AxiosError(`Unexpected URL requested in mock: ${url}`);
            error.config = {headers: requestHeaders} as InternalAxiosRequestConfig;
            return Promise.reject(error);
        }) as jest.Mock);

        const result = await fetchAndCombineIcalData();
        // ... assertions ...
    });

});