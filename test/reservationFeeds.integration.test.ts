// src/fetchAndCombine.unit.test.ts

// Add InternalAxiosRequestConfig to imports if needed for casting/clarity, though often not required if structured correctly
import axios, { AxiosResponse, AxiosRequestConfig, AxiosHeaders, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { fetchAndCombineIcalData } from '../src/server';
import assert from "node:assert";
import {Reservation} from "../src/reservations";
import * as reservationsModule from "../src/reservations";
import {mocked} from "jest-mock";
import ICAL from "ical.js";

jest.mock('../src/reservations', () => ({
    fetchReservations: jest.fn()
}));

describe('Facilitron Feeds', () => {
    const urls = [
        "https://www.facilitron.com/icalendar/reservation/HRK7KAAUHE9H",
        "https://www.facilitron.com/icalendar/reservation/66EQ84QE3QU4",
    ];
    it('should contain ical events', async () => {
        // This test should be used to test against real feeds, but for demonstration purposes,
        (reservationsModule.fetchReservations as jest.Mock).mockResolvedValue([
            {
                _id: 'HRK7KAAUHE9H',
                icalFeed: urls[0],
                created: '2021-06-07T15:57:56.312Z',
                owner: { name: 'NCSD'},
                renter: { last_name: 'Doe' },
                url: 'https://www.facilitron.com/icalendar/reservation/HRK7KAAUHE9H'
            },
            {
                _id: '66EQ84QE3QU4',
                icalFeed: urls[1],
                created: '2021-06-07T15:57:56.312Z',
                owner: { name: 'NCSD'},
                renter: { last_name: 'Smith' },
                url: 'https://www.facilitron.com/icalendar/reservation/66EQ84QE3QU4'
            }
        ] as Reservation[]);

        const result = await fetchAndCombineIcalData();

        const jcal = ICAL.Component.fromString(result);
        const events = jcal.getAllSubcomponents('vevent');
        assert.strictEqual(events.length, 17, 'Should contain 17 VEVENT occurrences');
        assert.equal(events[0].getFirstPropertyValue('summary'), 'Milwaukie High School on Lake Road Varsity Turf Baseball Field/Soccer Field', 'First event should match expected summary');
        assert.equal(events[1].getFirstPropertyValue('summary'), 'Rex Putnam High School on Field - Football', 'Second event should match expected summary');
        assert.equal(events[0].getFirstPropertyValue('description'),
            'Milwaukie High School - Lake Road Varsity Turf Baseball Field/Soccer Field for Soccer Practice reserved by Doe on Jun 7\nhttps://www.facilitron.com/icalendar/reservation/HRK7KAAUHE9H');
        assert.equal(events[1].getFirstPropertyValue('description'),
            'Rex Putnam High School - Field - Football for OYSA Winter Soccer Gsmes reserved by Smith on Jun 7\nhttps://www.facilitron.com/icalendar/reservation/66EQ84QE3QU4');
        assert.equal(events[0].getFirstPropertyValue('dtstart')?.toString(), '2025-03-20T01:00:00Z', 'First event should have the correct start time');
        assert.equal(events[1].getFirstPropertyValue('dtstart')?.toString(), '2025-01-25T16:00:00Z', 'Second event should have the correct start time');

    });
});