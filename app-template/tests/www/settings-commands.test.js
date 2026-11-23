import { beforeEach, describe, expect, test, jest } from '@jest/globals';
import { randomUUID } from 'node:crypto';
import { createStore } from '../../src/www/store.js';
import { createRoomsState, loadSettings, saveSettings } from '../../src/www/settings-commands.js';

const settings = (overrides = {}) => ({
	timeZone: 'Europe/Berlin',
	checkInMinutes: 900,
	checkOutMinutes: 660,
	currency: 'EUR',
	...overrides
});

const values = (overrides = {}) => ({
	timeZone: 'Europe/Berlin',
	checkIn: '15:00',
	checkOut: '11:00',
	currency: 'EUR',
	...overrides
});

describe('createRoomsState', () => {
	test('returns the empty state of the Rooms page', () => {
		expect(createRoomsState()).toEqual({
			roomTypes: [],
			ranges: [],
			settings: null,
			status: null,
			settingsStatus: null
		});
	});
});

describe('settings commands', () => {
	let store;
	let api;

	beforeEach(() => {
		store = createStore(createRoomsState());
		api = { get: jest.fn(), send: jest.fn() };
	});

	describe('loadSettings', () => {
		test('puts the settings of the API into the state when the call succeeds', async () => {
			const loaded = settings({ timeZone: randomUUID() });
			api.get.mockResolvedValue(loaded);

			await loadSettings(store, api);

			expect(api.get).toHaveBeenCalledWith('/api/settings');
			expect(store.getState().settings).toEqual(loaded);
		});

		test('sets an error in the settings status when the API refuses', async () => {
			api.get.mockRejectedValue(new Error('Server is down'));

			await loadSettings(store, api);

			expect(store.getState().settingsStatus).toEqual({ kind: 'error', message: 'Server is down' });
		});
	});

	describe('saveSettings', () => {
		test('sends the times as minutes when the texts are valid', async () => {
			api.send.mockResolvedValue(settings());

			await saveSettings(store, api, values());

			expect(api.send).toHaveBeenCalledWith('PUT', '/api/settings', {
				timeZone: 'Europe/Berlin',
				checkInMinutes: 900,
				checkOutMinutes: 660,
				currency: 'EUR'
			});
		});

		test('stores the answer and a success message when the call succeeds', async () => {
			const answer = settings({ timeZone: 'Asia/Tokyo', currency: 'JPY' });
			api.send.mockResolvedValue(answer);

			await saveSettings(store, api, values({ timeZone: 'Asia/Tokyo', currency: 'JPY' }));

			expect(store.getState().settings).toEqual(answer);
			expect(store.getState().settingsStatus).toEqual(expect.objectContaining({ kind: 'success' }));
		});

		test('sends nothing and sets an error when the check-in time does not parse', async () => {
			await saveSettings(store, api, values({ checkIn: '25:00' }));

			expect(api.send).not.toHaveBeenCalled();
			expect(store.getState().settingsStatus).toEqual(expect.objectContaining({ kind: 'error' }));
		});

		test('sends nothing and sets an error when the check-out time is empty', async () => {
			await saveSettings(store, api, values({ checkOut: '' }));

			expect(api.send).not.toHaveBeenCalled();
			expect(store.getState().settingsStatus).toEqual(expect.objectContaining({ kind: 'error' }));
		});

		test('sets the message of the API and keeps the settings when the API refuses', async () => {
			const current = settings();
			store.setState({ settings: current });
			api.send.mockRejectedValue(new Error('currency must be a known currency code like EUR'));

			await saveSettings(store, api, values({ currency: 'XXX' }));

			expect(store.getState().settings).toEqual(current);
			expect(store.getState().settingsStatus).toEqual({
				kind: 'error',
				message: 'currency must be a known currency code like EUR'
			});
		});
	});
});
