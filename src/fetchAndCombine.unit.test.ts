// src/fetchAndCombine.unit.test.ts

// Add InternalAxiosRequestConfig to imports if needed for casting/clarity, though often not required if structured correctly
import axios, { AxiosResponse, AxiosRequestConfig, AxiosHeaders, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { mocked } from 'jest-mock';
import { fetchAndCombineIcalData, ICAL_URLS } from './server';
import assert from "node:assert";

jest.mock('axios');
const mockedAxiosGet = mocked(axios.get);

describe('fetchAndCombineIcalData', () => {

    // --- Ensure these constants are defined here ---
    const mockIcalData1 = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Source 1//EN
CALSCALE:GREGORIAN
BEGIN:VEVENT
UID:event1@source1
SUMMARY:Event 1 from Source 1
DTSTART:20250405T100000Z
DTEND:20250405T110000Z
END:VEVENT
END:VCALENDAR`;

    const mockIcalData2 = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Source 2//EN
CALSCALE:GREGORIAN
BEGIN:VEVENT
UID:event2@source2
SUMMARY:Event 2 from Source 2
DTSTART:20250406T120000Z
DTEND:20250406T130000Z
END:VEVENT
BEGIN:VEVENT
UID:event3@source2
SUMMARY:Event 3 from Source 2
DTSTART:20250407T140000Z
DTEND:20250407T150000Z
END:VEVENT
END:VCALENDAR`;

    const mockIcalData3 = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Source 2//EN
CALSCALE:GREGORIAN
BEGIN:VEVENT
UID:event2@source2
SUMMARY:Soccer practice - Field - Soccer - Southwest (Lot Whitcomb Elementary School)
DTSTART:20250406T120000Z
DTEND:20250406T130000Z
END:VEVENT
BEGIN:VEVENT
UID:event3@source2
SUMMARY:Practice - Field - Football (Rex Putnam High School)
DTSTART:20250407T140000Z
DTEND:20250407T150000Z
END:VEVENT
END:VCALENDAR`;

    const mockEmptyIcal = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Empty Source//EN
CALSCALE:GREGORIAN
END:VCALENDAR`;

    const minimalExpectedEmptyResult = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//YourCompanyName//NodeIcalAggregator//EN
CALSCALE:GREGORIAN
END:VCALENDAR`;
    // --- End of constant definitions ---


    beforeEach(() => {
        mockedAxiosGet.mockClear();
    });

    it('should combine events from multiple successful fetches', async () => {
        const urls = [
            "https://www.facilitron.com/icalendar/reservation/YIUDOAWWY43C",
            "https://www.facilitron.com/icalendar/reservation/MYK4GJWWY43C"];

        mockedAxiosGet.mockImplementation( (async (url): Promise<AxiosResponse<string>> => {

            // Define request headers inline for the config object
            const requestHeaders = new AxiosHeaders({'Accept': 'text/calendar'});

            if (url === urls[0]) {
                const response: AxiosResponse<string> = {
                    data: mockIcalData1,
                    status: 200,
                    statusText: 'OK',
                    headers: { 'content-type': 'text/calendar' }, // Response headers
                    // Construct config inline, ensuring headers is present
                    config: { headers: requestHeaders } as InternalAxiosRequestConfig // Request config
                };
                return Promise.resolve(response);
            }
            if (url === urls[1]) {
                const response: AxiosResponse<string> = {
                    data: mockIcalData2,
                    status: 200,
                    statusText: 'OK',
                    headers: { 'content-type': 'text/calendar' }, // Response headers
                    // Construct config inline
                    config: { headers: requestHeaders } as InternalAxiosRequestConfig // Request config
                };
                return Promise.resolve(response);
            }
            const error = new AxiosError(`Unexpected URL requested in mock: ${url}`);
            // Ensure error config also conforms
            error.config = { headers: requestHeaders } as InternalAxiosRequestConfig;
            return Promise.reject(error);
        }) as jest.Mock );

        const result = await fetchAndCombineIcalData(urls);
        assert.ok(result, 'Result should not be null or undefined');
        assert.ok(typeof result === 'string', 'Result should be a string when combining iCal data');
        // Check for the combined events in the result
        assert.ok(result.includes('BEGIN:VCALENDAR'), 'Result should include the iCalendar start marker');
        assert.ok(result.includes('END:VCALENDAR'), 'Result should include the iCalendar end marker');
        // Ensure both events from source 1 and source 2 are present
        const veventCount = (result.match(/BEGIN:VEVENT/g) || []).length;
        assert.ok(veventCount === 3, `Expected 3 VEVENT occurrences, but found ${veventCount}`);
        // Ensure the content from both sources is present
        assert.ok(result.includes('SUMMARY:Event 1 from Source 1'), 'Result should include Event 1 from Source 1');
        assert.ok(result.includes('SUMMARY:Event 2 from Source 2'), 'Result should include Event 2 from Source 2');
        assert.ok(result.includes('URL:https://www.facilitron.com/dashboard/reservation/YIUDOAWWY43C'), 'Result should include the res url');
    });

    it('clean up the summary field', async () => {
        const urls = ["https://www.facilitron.com/icalendar/reservation/MYK4GJWWY43C"];

        mockedAxiosGet.mockImplementation( (async (url): Promise<AxiosResponse<string>> => {

            // Define request headers inline for the config object
            const requestHeaders = new AxiosHeaders({'Accept': 'text/calendar'});

            const response: AxiosResponse<string> = {
                data: mockIcalData3,
                status: 200,
                statusText: 'OK',
                headers: { 'content-type': 'text/calendar' }, // Response headers
                // Construct config inline, ensuring headers is present
                config: { headers: requestHeaders } as InternalAxiosRequestConfig // Request config
            };
            return Promise.resolve(response);
        }) as jest.Mock );

        const result = await fetchAndCombineIcalData(urls);
        assert.ok(result, 'Result should not be null or undefined');
        assert.ok(typeof result === 'string', 'Result should be a string when combining iCal data');
        // Check for the combined events in the result
        assert.ok(result.includes('BEGIN:VCALENDAR'), 'Result should include the iCalendar start marker');
        assert.ok(result.includes('END:VCALENDAR'), 'Result should include the iCalendar end marker');
        // Ensure both events from source 1 and source 2 are present
        const veventCount = (result.match(/BEGIN:VEVENT/g) || []).length;
        assert.ok(veventCount === 2, `Expected 2 VEVENT occurrences, but found ${veventCount}`);
        // Ensure the content from both sources is present
        assert.ok(result.includes('SUMMARY:Lot Whitcomb Elementary School'), 'Result should include Event 1 from Source 1');
        assert.ok(result.includes('SUMMARY:Rex Putnam High School'), 'Result should include Event 1 from Source 1');
    });

    it('should handle partial failures gracefully', async () => {
        const urls = [
            "https://www.facilitron.com/icalendar/reservation/MYIUDOAWWY43C",
            "https://www.failitron.com/icalendar/reservation/MYK4GJWWY43C"];

        mockedAxiosGet.mockImplementation( (async (url): Promise<AxiosResponse<string>> => {
            const requestHeaders = new AxiosHeaders({'Accept': 'text/calendar'});

            if (url === urls[0]) {
                const response: AxiosResponse<string> = {
                    data: mockIcalData1, status: 200, statusText: 'OK',
                    headers: { 'content-type': 'text/calendar' },
                    config: { headers: requestHeaders } as InternalAxiosRequestConfig
                };
                return Promise.resolve(response);
            }
            if (url === urls[1]) {
                const error = new AxiosError('Not Found', '404');
                // Construct the config for the error correctly
                const errorConfig = { headers: requestHeaders } as InternalAxiosRequestConfig;
                error.config = errorConfig;
                error.response = { // Mock the response within the error
                    data: 'Not Found', status: 404, statusText: 'Not Found',
                    headers: {}, config: errorConfig // Use the same config here
                };
                return Promise.reject(error);
            }
            const error = new AxiosError(`Unexpected URL requested in mock: ${url}`);
            error.config = { headers: requestHeaders } as InternalAxiosRequestConfig;
            return Promise.reject(error);
        }) as jest.Mock );

        const result = await fetchAndCombineIcalData(urls);
        // ... assertions ...
    });

    // Apply similar changes to config objects in other tests...

    it('should handle responses with no VEVENT blocks', async () => {
        const urls = [
            "https://www.facilitron.com/icalendar/reservation/MYIUDOAWWY43C",
            "https://www.emptytron.com/icalendar/reservation/MYK4GJWWY43C"];
        mockedAxiosGet.mockImplementation( (async (url): Promise<AxiosResponse<string>> => {
            const requestHeaders = new AxiosHeaders({'Accept': 'text/calendar'});
            if (url === urls[0]) {
                const response: AxiosResponse<string> = {
                    data: mockIcalData1, status: 200, statusText: 'OK',
                    headers: { 'content-type': 'text/calendar' },
                    config: { headers: requestHeaders } as InternalAxiosRequestConfig
                };
                return Promise.resolve(response);
            }
            if (url === urls[1]) {
                const response: AxiosResponse<string> = {
                    data: mockEmptyIcal, status: 200, statusText: 'OK',
                    headers: { 'content-type': 'text/calendar' },
                    config: { headers: requestHeaders } as InternalAxiosRequestConfig
                };
                return Promise.resolve(response);
            }
            const error = new AxiosError(`Unexpected URL requested in mock: ${url}`);
            error.config = { headers: requestHeaders } as InternalAxiosRequestConfig;
            return Promise.reject(error);
        }) as jest.Mock );

        const result = await fetchAndCombineIcalData(urls);
        // ... assertions ...
    });


    it('should handle non-200 status codes as failures', async () => {
        const urls = [
            "https://www.facilitron.com/icalendar/reservation/MYIUDOAWWY43C",
            "https://www.errortron.com/icalendar/reservation/MYK4GJWWY43C"];
        mockedAxiosGet.mockImplementation( (async (url): Promise<AxiosResponse<string>> => {
            const requestHeaders = new AxiosHeaders({'Accept': 'text/calendar'});
            if (url === urls[0]) {
                const response: AxiosResponse<string> = {
                    data: mockIcalData1, status: 200, statusText: 'OK',
                    headers: { 'content-type': 'text/calendar' },
                    config: { headers: requestHeaders } as InternalAxiosRequestConfig
                };
                return Promise.resolve(response);
            }
            if (url === urls[1]) {
                const response: AxiosResponse<string> = { // Still RESOLVE, but with status 500
                    data: 'Server Error', status: 500, statusText: 'Internal Server Error',
                    headers: {},
                    config: { headers: requestHeaders } as InternalAxiosRequestConfig // Use correct config structure
                };
                return Promise.resolve(response);
            }
            const error = new AxiosError(`Unexpected URL requested in mock: ${url}`);
            error.config = { headers: requestHeaders } as InternalAxiosRequestConfig;
            return Promise.reject(error);
        }) as jest.Mock );

        const result = await fetchAndCombineIcalData(urls);
        // ... assertions ...
    });

});