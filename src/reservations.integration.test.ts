// src/fetchAndCombine.unit.test.ts

// Add InternalAxiosRequestConfig to imports if needed for casting/clarity, though often not required if structured correctly
import axios, { AxiosResponse, AxiosRequestConfig, AxiosHeaders, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { fetchAndCombineIcalData, ICAL_URLS } from './server';
import assert from "node:assert";
import {Reservation, Reservations} from "./reservations";

describe ('Reservations', () => {
    it('should be accurately scraped from Facilitron', async () => {
        // This test is to ensure that the fetchReservations function works correctly
        const { fetchReservations } = require('./reservations');
        const reservations: Reservations = await fetchReservations();
        const keys: String[] = Object.keys(reservations);
        assert.ok(keys.length >= 50, 'Reservations should be 50 or more');
        const aReservation = Object.values(reservations)[1]; // Get the first reservation for further testing
        assert.ok(typeof aReservation.id === 'string', 'Reservation ID should be a string');
    });
});