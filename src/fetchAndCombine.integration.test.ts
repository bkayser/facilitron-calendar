// src/fetchAndCombine.unit.test.ts

// Add InternalAxiosRequestConfig to imports if needed for casting/clarity, though often not required if structured correctly
import axios, { AxiosResponse, AxiosRequestConfig, AxiosHeaders, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { fetchAndCombineIcalData, ICAL_URLS } from './server';
import assert from "node:assert";


describe('InvokeFacilitronFeeds', () => {

    it('should handle the real feeds', async () => {
        // This test should be used to test against real feeds, but for demonstration purposes,

        const result = await fetchAndCombineIcalData(ICAL_URLS);

        assert.ok(result, 'Result should not be null or undefined when using real feeds');
        assert.ok(typeof result === 'string', 'Result should be a string when using real feeds');
        // You can also check for minimal structure of the returned iCal data
        assert.ok(result.includes('BEGIN:VCALENDAR'), 'Result should include the iCalendar start marker');

        // Count the number of VEVENT occurrences
        const expectedCount = 400;
        const veventCount = (result.match(/BEGIN:VEVENT/g) || []).length;
        assert.ok(veventCount > expectedCount, `Expected at least ${expectedCount} VEVENT occurrences, but found ${veventCount}`);

        assert.ok(result.includes('END:VCALENDAR'), 'Result should include the iCalendar end marker');

    });
});