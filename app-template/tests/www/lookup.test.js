import { beforeEach, describe, expect, test, jest } from '@jest/globals';
import { createStore } from '../../src/www/store.js';
import { createLookupState, findReservations, listReservations } from '../../src/www/lookup.js';

const settings = { timeZone: 'Europe/Berlin', checkInMinutes: 900, checkOutMinutes: 660, currency: 'EUR' };
const clock = { now: () => Date.UTC(2030, 0, 15, 9, 0) };
const TODAY_START = Date.UTC(2030, 0, 14, 23, 0);

const reservation = (overrides = {}) => ({
	id: 1,
	code: 'ABC123',
	roomNumber: 101,
	roomTypeName: 'Single',
	guestName: 'Ada Lovelace',
	arrivalAt: Date.UTC(2030, 0, 15, 14, 0),
	departureAt: Date.UTC(2030, 0, 16, 10, 0),
	guests: 1,
	totalCents: 8000,
	...overrides
});

describe('createLookupState', () => {
	test('returns the start of today in the hotel zone as from', () => {
		const underTest = createLookupState(clock, settings);

		expect(underTest).toEqual({ query: '', from: TODAY_START, settings, reservations: null, status: null });
	});
});

describe('findReservations', () => {
	let store;
	let api;

	beforeEach(() => {
		store = createStore(createLookupState(clock, settings));
		api = { get: jest.fn(), send: jest.fn() };
	});

	test('calls the API with the query when the text is given', async () => {
		api.get.mockResolvedValue([]);

		await findReservations(store, api, 'lovelace');

		expect(api.get).toHaveBeenCalledWith('/api/reservations', { query: 'lovelace' });
	});

	test('trims the text before it sends the query', async () => {
		api.get.mockResolvedValue([]);

		await findReservations(store, api, '  abc123 ');

		expect(api.get).toHaveBeenCalledWith('/api/reservations', { query: 'abc123' });
	});

	test.each([['empty', ''], ['blank', '   '], ['not text', undefined]])(
		'sets an error status and sends nothing when the text is %s',
		async (_name, text) => {
			await findReservations(store, api, text);

			expect(api.get).not.toHaveBeenCalled();
			expect(store.getState().status).toEqual(expect.objectContaining({ kind: 'error' }));
			expect(store.getState().status.message).not.toEqual('');
			expect(store.getState().reservations).toBeNull();
		}
	);

	test('stores the reservations and the query when the call succeeds', async () => {
		const found = [reservation()];
		api.get.mockResolvedValue(found);

		await findReservations(store, api, 'ABC123');

		expect(store.getState().reservations).toEqual(found);
		expect(store.getState().query).toEqual('ABC123');
		expect(store.getState().status).toBeNull();
	});

	test('clears an earlier error status when the call succeeds', async () => {
		api.get.mockResolvedValue([]);
		await findReservations(store, api, '');

		await findReservations(store, api, 'ABC123');

		expect(store.getState().status).toBeNull();
	});

	test('sets an error status with the message when the API refuses', async () => {
		api.get.mockRejectedValue(new Error('Server down'));

		await findReservations(store, api, 'ABC123');

		expect(store.getState().status).toEqual({ kind: 'error', message: 'Server down' });
	});
});

describe('listReservations', () => {
	let store;
	let api;

	beforeEach(() => {
		store = createStore(createLookupState(clock, settings));
		api = { get: jest.fn(), send: jest.fn() };
	});

	test('calls the API with the from instant', async () => {
		api.get.mockResolvedValue([]);

		await listReservations(store, api, TODAY_START);

		expect(api.get).toHaveBeenCalledWith('/api/reservations', { from: TODAY_START });
	});

	test.each([['null', null], ['text', 'x'], ['fraction', 1.5], ['negative', -1]])(
		'sets an error status and sends nothing when from is %s',
		async (_name, fromAt) => {
			await listReservations(store, api, fromAt);

			expect(api.get).not.toHaveBeenCalled();
			expect(store.getState().status).toEqual(expect.objectContaining({ kind: 'error' }));
		}
	);

	test('stores the reservations and from when the call succeeds', async () => {
		const found = [reservation()];
		api.get.mockResolvedValue(found);

		await listReservations(store, api, TODAY_START + 1000);

		expect(store.getState().reservations).toEqual(found);
		expect(store.getState().from).toEqual(TODAY_START + 1000);
		expect(store.getState().status).toBeNull();
	});

	test('sets an error status with the message when the API refuses', async () => {
		api.get.mockRejectedValue(new Error('Server down'));

		await listReservations(store, api, TODAY_START);

		expect(store.getState().status).toEqual({ kind: 'error', message: 'Server down' });
	});
});
