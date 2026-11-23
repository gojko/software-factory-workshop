import { beforeEach, describe, expect, test, jest } from '@jest/globals';
import { createStore } from '../../src/www/store.js';
import { createSearchState, runSearch } from '../../src/www/search.js';

const settings = { timeZone: 'Europe/Berlin', checkInMinutes: 900, checkOutMinutes: 660, currency: 'EUR' };
const clock = { now: () => Date.UTC(2030, 0, 15, 9, 0) };
const ARRIVAL_AT = Date.UTC(2030, 0, 15, 14, 0);
const DEPARTURE_AT = Date.UTC(2030, 0, 16, 10, 0);

describe('createSearchState', () => {
	test('returns today 15:00 and tomorrow 11:00 of the hotel zone as the default stay', () => {
		const underTest = createSearchState(clock, settings);

		expect(underTest).toEqual({
			values: { arrivalAt: ARRIVAL_AT, departureAt: DEPARTURE_AT, guests: '1' },
			settings,
			results: null,
			booking: null,
			confirmation: null,
			status: null
		});
	});

	test('uses the hotel zone day when the clock is already tomorrow in that zone', () => {
		const lateClock = { now: () => Date.UTC(2030, 0, 15, 23, 30) };

		const underTest = createSearchState(lateClock, settings);

		expect(underTest.values.arrivalAt).toEqual(Date.UTC(2030, 0, 16, 14, 0));
		expect(underTest.values.departureAt).toEqual(Date.UTC(2030, 0, 17, 10, 0));
	});
});

describe('runSearch', () => {
	let store;
	let api;

	beforeEach(() => {
		store = createStore(createSearchState(clock, settings));
		api = { get: jest.fn(), send: jest.fn() };
	});

	const good = (overrides = {}) => ({ arrivalAt: ARRIVAL_AT, departureAt: DEPARTURE_AT, guests: '2', ...overrides });

	test.each([
		['arrival is not a number', { arrivalAt: null }],
		['arrival is not a whole number', { arrivalAt: 1.5 }],
		['departure is not a number', { departureAt: 'x' }],
		['departure is not a whole number', { departureAt: DEPARTURE_AT + 0.5 }],
		['guests is empty', { guests: '' }],
		['guests is not a whole number', { guests: '1.5' }],
		['guests is below 1', { guests: '0' }],
		['guests is above 4', { guests: '5' }],
		['departure is not after arrival', { departureAt: ARRIVAL_AT }],
		['departure is before arrival', { departureAt: ARRIVAL_AT - 1000 }]
	])('sets an error status and sends nothing when %s', async (_name, change) => {
		await runSearch(store, api, good(change));

		expect(api.get).not.toHaveBeenCalled();
		expect(store.getState().status).toEqual(expect.objectContaining({ kind: 'error' }));
		expect(store.getState().status.message).not.toEqual('');
		expect(store.getState().results).toBeNull();
	});

	test('calls the availability API with the three values when they are good', async () => {
		api.get.mockResolvedValue([]);

		await runSearch(store, api, good());

		expect(api.get).toHaveBeenCalledWith('/api/availability', {
			arrivalAt: ARRIVAL_AT,
			departureAt: DEPARTURE_AT,
			guests: 2
		});
	});

	test('stores the results and the searched values when the call succeeds', async () => {
		const results = [
			{ roomTypeId: 1, roomTypeName: 'Single', freeRooms: 3, nights: 1, pricePerNightCents: 8000, totalCents: 8000 }
		];
		api.get.mockResolvedValue(results);

		await runSearch(store, api, good());

		expect(store.getState().results).toEqual(results);
		expect(store.getState().values).toEqual(good());
		expect(store.getState().status).toBeNull();
	});

	test('clears an earlier error status when the call succeeds', async () => {
		api.get.mockResolvedValue([]);
		await runSearch(store, api, good({ guests: '9' }));

		await runSearch(store, api, good());

		expect(store.getState().status).toBeNull();
		expect(store.getState().results).toEqual([]);
	});

	test('sets an error status with the message when the API refuses', async () => {
		api.get.mockRejectedValue(new Error('Arrival must be in the future'));

		await runSearch(store, api, good());

		expect(store.getState().status).toEqual({ kind: 'error', message: 'Arrival must be in the future' });
		expect(store.getState().results).toBeNull();
	});
});
