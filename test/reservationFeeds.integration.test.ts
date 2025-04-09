// src/fetchAndCombine.unit.test.ts

// Add InternalAxiosRequestConfig to imports if needed for casting/clarity, though often not required if structured correctly
import aggregateReservations from "../src/aggregateReservations";
import assert from "node:assert";
import reservationsModule, {Reservation} from "../src/reservations";
import ICAL from "ical.js";

jest.mock('../src/reservations', () => ({
    __esModule: true, // Ensures ES module compatibility
    default: jest.fn(),
    Reservation: jest.requireActual('../src/reservations').Reservation, // Preserve named exports if needed
}));

describe('Facilitron Feeds', () => {
    const urls = [
        "https://www.facilitron.com/icalendar/reservation/HRK7KAAUHE9H",
        "https://www.facilitron.com/icalendar/reservation/66EQ84QE3QU4",
    ];
    it('should contain ical events', async () => {
        // This test should be used to test against real feeds, but for demonstration purposes,
        (reservationsModule as jest.Mock).mockResolvedValue([
            {
                _id: 'HRK7KAAUHE9H',
                icalFeed: urls[0],
                created: new Date('2021-06-07T15:57:56.312Z'),
                owner: { name: 'Milwaukie High School'},
                renter: { last_name: 'Doe' },
                url: 'https://www.facilitron.com/icalendar/reservation/HRK7KAAUHE9H'
            },
            {
                _id: '66EQ84QE3QU4',
                icalFeed: urls[1],
                created: new Date('2021-06-07T15:57:56.312Z'),
                owner: { name: 'Rex Putnam High School'},
                renter: { last_name: 'Smith' },
                url: 'https://www.facilitron.com/icalendar/reservation/66EQ84QE3QU4'
            }
        ] as Reservation[]);

        const result = await aggregateReservations();

        const jcal = ICAL.Component.fromString(result);
        const events = jcal.getAllSubcomponents('vevent');
        assert.strictEqual(events.length, 17, 'Should contain 17 VEVENT occurrences');
        assert.equal(events[0].getFirstPropertyValue('summary'), 'Rex Putnam High School on Field - Football');
        assert.equal(events[1].getFirstPropertyValue('summary'), 'Rex Putnam High School on Field - Football');
        assert.equal(events[16].getFirstPropertyValue('summary'), 'Milwaukie High School on Lake Road Varsity Turf Baseball Field/Soccer Field');

        assert.equal(events[0].getFirstPropertyValue('description'),
            'Rex Putnam High School - Field - Football for Soccer reserved by Smith on Jun 7\n'+
            'https://www.facilitron.com/icalendar/reservation/66EQ84QE3QU4');
        assert.equal(events[1].getFirstPropertyValue('description'),
            'Rex Putnam High School - Field - Football for Soccer reserved by Smith on Jun 7\n' +
            'https://www.facilitron.com/icalendar/reservation/66EQ84QE3QU4');
        assert.equal(events[16].getFirstPropertyValue('description'),
            "Milwaukie High School - Lake Road Varsity Turf Baseball Field/Soccer Field for Soccer reserved by Doe on Jun 7\n" +
            "https://www.facilitron.com/icalendar/reservation/HRK7KAAUHE9H");
        assert.equal(events[0].getFirstPropertyValue('dtstart')?.toString(), '2025-01-25T16:00:00Z');
        assert.equal(events[1].getFirstPropertyValue('dtstart')?.toString(), '2025-01-26T16:00:00Z');
        assert.equal(events[16].getFirstPropertyValue('dtstart')?.toString(), '2025-03-20T01:00:00Z');

    });
});