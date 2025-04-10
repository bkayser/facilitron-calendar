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
                last_date: new Date('2028-03-20T01:00:00Z'),
                url: 'https://www.facilitron.com/icalendar/reservation/HRK7KAAUHE9H'
            },
            {
                _id: '66EQ84QE3QU4',
                icalFeed: urls[1],
                created: new Date('2021-06-07T15:57:56.312Z'),
                owner: { name: 'Rex Putnam High School'},
                renter: { last_name: 'Smith' },
                last_date: new Date('2028-04-20T01:00:00Z'),
                url: 'https://www.facilitron.com/icalendar/reservation/66EQ84QE3QU4'
            }
        ] as Reservation[]);

        const result = await aggregateReservations(new Date('2025-01-01T00:00:00Z'));

        const jcal = ICAL.Component.fromString(result);
        const events = jcal.getAllSubcomponents('vevent');
        assert.strictEqual(events.length, 17, 'Should contain 17 VEVENT occurrences');
        assert.equal(events[0].getFirstPropertyValue('summary'), 'Rex Putnam High School');
        assert.equal(events[1].getFirstPropertyValue('summary'), 'Rex Putnam High School');
        assert.equal(events[16].getFirstPropertyValue('summary'), 'Milwaukie High School');

        assert.equal(events[0].getFirstPropertyValue('description'),
            'Soccer at Rex Putnam High School (Field - Football) reserved by Smith on Jun 7\n'+
            'https://www.facilitron.com/icalendar/reservation/66EQ84QE3QU4');
        assert.equal(events[1].getFirstPropertyValue('description'),
            'Soccer at Rex Putnam High School (Field - Football) reserved by Smith on Jun 7\n' +
            'https://www.facilitron.com/icalendar/reservation/66EQ84QE3QU4');
        assert.equal(events[16].getFirstPropertyValue('description'),
            "Soccer at Milwaukie High School (Lake Road Varsity Turf Baseball Field/Soccer Field) reserved by Doe on Jun 7\n" +
            "https://www.facilitron.com/icalendar/reservation/HRK7KAAUHE9H");
        assert.equal(events[0].getFirstPropertyValue('dtstart')?.toString(), '2025-01-25T09:00:00');
        assert.equal(events[1].getFirstPropertyValue('dtstart')?.toString(), '2025-01-26T09:00:00');
        assert.equal(events[16].getFirstPropertyValue('dtstart')?.toString(), '2025-03-19T18:00:00');

    });
});