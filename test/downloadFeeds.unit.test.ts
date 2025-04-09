// src/combineFeeds.unit.test.ts

import axios, {AxiosError, InternalAxiosRequestConfig} from 'axios';
import {mocked} from 'jest-mock';
import {Reservation} from '../src/reservations';
import {downloadFeeds} from "../src/downloadFeeds";

jest.mock('axios');
const mockedAxiosGet = mocked(axios.get);

describe('downloadFeeds', () => {
    const mockReservation1: Reservation = {
        _id: '1',
        approved_date: new Date('2023-01-01'),
        created: new Date('2021-06-07T15:57:56.312Z'),
        last_date: new Date('2021-06-07T15:57:56.312Z'),
        event_name: 'Event 1',
        total: 100,
        renter: { last_name: 'Doe' },
        owner: { name: 'NCSD' },
        url: 'https://example.com/icalendar/reservation/1',
        icalFeed: 'https://example.com/icalendar/reservation/1'
    };

    const mockReservation2: Reservation = {
        _id: '2',
        approved_date: new Date('2023-01-02'),
        created: new Date('2021-06-07T15:57:56.312Z'),
        last_date: new Date('2021-06-07T15:57:56.312Z'),
        event_name: 'Event 2',
        renter: { last_name: 'Doe' },
        owner: { name: 'NCSD' },
        total: 200,
        url: 'https://example.com/icalendar/reservation/2',
        icalFeed: 'https://example.com/icalendar/reservation/2'
    };

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
END:VCALENDAR`;

    beforeEach(() => {
        mockedAxiosGet.mockClear();
    });

    it('should download and return feeds for valid reservations', async () => {
        mockedAxiosGet.mockImplementation(async (url, config?): Promise<any> => {
            const requestHeaders = {'Accept': 'text/calendar'};

            if (url === mockReservation1.icalFeed) {
                return {
                    data: mockIcalData1,
                    status: 200,
                    statusText: 'OK',
                    headers: {'content-type': 'text/calendar'},
                    config: {headers: requestHeaders} as InternalAxiosRequestConfig
                };
            }

            if (url === mockReservation2.icalFeed) {
                return {
                    data: mockIcalData2,
                    status: 200,
                    statusText: 'OK',
                    headers: {'content-type': 'text/calendar'},
                    config: {headers: requestHeaders} as InternalAxiosRequestConfig
                };
            }

            const error = new AxiosError(`Unexpected URL requested in mock: ${url}`);
            error.config = {headers: requestHeaders} as InternalAxiosRequestConfig;
            return Promise.reject(error);
        });

        const reservations = [mockReservation1, mockReservation2];
        const feeds = (await Promise.all(downloadFeeds(reservations))).filter(feed => feed !== null);

        expect(feeds).toHaveLength(2);
        expect(feeds[0].reservation).toEqual(mockReservation1);
        expect(feeds[1].reservation).toEqual(mockReservation2);
        expect(feeds[0].events).toHaveLength(1);        expect(feeds[1].events.length).toBeGreaterThan(0);
        expect(feeds[1].events).toHaveLength(1);        expect(feeds[1].events.length).toBeGreaterThan(0);
        expect(feeds[1].events[0].getAllProperties()[0].name).toEqual('uid');
        expect(feeds[1].events[0].getAllProperties('uid')[0].getFirstValue()).toEqual('event2@source2');
        expect(feeds[1].events[0].getAllProperties()[1].name).toEqual('summary');
        expect(feeds[1].events[0].getAllProperties('summary')[0].getFirstValue()).toEqual('Event 2 from Source 2');
    });

    it('should handle failed fetches gracefully', async () => {
        mockedAxiosGet.mockImplementation(async (url, config?): Promise<any> => {
            const requestHeaders = {'Accept': 'text/calendar'};

            if (url === mockReservation1.url) {
                return {
                    data: mockIcalData1,
                    status: 200,
                    statusText: 'OK',
                    headers: {'content-type': 'text/calendar'},
                    config: {headers: requestHeaders} as InternalAxiosRequestConfig
                };
            }

            if (url === mockReservation2.url) {
                const error = new AxiosError('Not Found', '404');
                error.config = {headers: requestHeaders} as InternalAxiosRequestConfig;
                error.response = {
                    data: 'Not Found',
                    status: 404,
                    statusText: 'Not Found',
                    headers: {},
                    config: error.config
                };
                return Promise.reject(error);
            }

            const error = new AxiosError(`Unexpected URL requested in mock: ${url}`);
            error.config = {headers: requestHeaders} as InternalAxiosRequestConfig;
            return Promise.reject(error);
        });

        const reservations = [mockReservation1, mockReservation2];
        const feeds = (await Promise.all(downloadFeeds(reservations))).filter(feed => feed !== null);
        expect(feeds).toHaveLength(1);
        expect(feeds[0].reservation).toEqual(mockReservation1);
    });
});