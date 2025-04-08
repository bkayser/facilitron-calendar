/**
 * This utility module is responsible for downloading iCal feeds from given reservation URLs and returning the combined iCal data.
 */
import axios, {AxiosError} from 'axios';
import {Reservation} from './reservations';
import ICAL from "ical.js";
import Component from "ical.js/dist/types/component"; // Ensure this is the correct path to your reservations module
export type Feed = {
    reservation: Reservation; // The reservation object associated with this iCal feed
    events: Component[];
}

// --- Helper Function to Fetch and Process iCal Data ---
export async function downloadFeeds(reservations: Reservation[]){

    const feedPromises = reservations.map(async (reservation: Reservation ) : Promise<Feed | null> => {
        try {
            const response = await axios.get(reservation.icalFeed, {
                // Set a reasonable timeout
                timeout: 10000, // 10 seconds
                // Important: Treat the response as plain text
                responseType: 'text',
                // Mimic a common calendar client User-Agent if needed
                headers: {
                    'User-Agent': 'NodeIcalAggregator/1.0',
                }
            });

            if (response.status === 200 && typeof response.data === 'string') {
                const jcalData = new ICAL.Component(ICAL.parse(response.data));
                return <Feed>{reservation: reservation, events: jcalData.getAllSubcomponents()};
            } else {
                console.warn(`Failed to fetch ${reservation.url}: Status ${response.status}`);
                return null; // Indicate failure for this URL
            }
        } catch (error) {
            const axiosError = error as AxiosError;
            if (axiosError.isAxiosError) {
                console.error(`Error fetching ${reservation.url}: ${axiosError.message} (Status: ${axiosError.response?.status})`);
            } else {
                console.error(`Unexpected error fetching ${reservation.url}:`, error);
            }
            return null; // Indicate failure for this URL
        }
    });
    const results: (Feed | null)[] = await Promise.all(feedPromises);
    return results.filter((result): result is Feed => result !== null); // Filter out null values to return only successful feeds
}