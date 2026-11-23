import { beforeEach, describe, expect, test, jest } from '@jest/globals';
import { randomUUID } from 'node:crypto';
import { createStore } from '../../src/www/store.js';
import {
	addRoomType,
	changeBaseRate,
	loadRoomTypes,
	removeRoomType
} from '../../src/www/room-type-commands.js';

const roomType = (overrides = {}) => ({
	id: 1,
	name: randomUUID(),
	maxOccupancy: 2,
	baseRateCents: 10000,
	extraGuestCents: 2500,
	...overrides
});

describe('room type commands', () => {
	let store;
	let api;

	beforeEach(() => {
		store = createStore({ roomTypes: [], ranges: [], status: null });
		api = { get: jest.fn(), send: jest.fn() };
	});

	describe('loadRoomTypes', () => {
		test('puts the room types of the API into the state when the call succeeds', async () => {
			const types = [roomType({ id: 1 }), roomType({ id: 2 })];
			api.get.mockResolvedValue(types);

			await loadRoomTypes(store, api);

			expect(api.get).toHaveBeenCalledWith('/api/room-types');
			expect(store.getState().roomTypes).toEqual(types);
		});

		test('sets an error status with the message when the API refuses', async () => {
			api.get.mockRejectedValue(new Error('server down'));

			await loadRoomTypes(store, api);

			expect(store.getState().status).toEqual({ kind: 'error', message: 'server down' });
		});
	});

	describe('addRoomType', () => {
		const values = () => ({
			name: ' Suite ',
			maxOccupancy: '4',
			baseRate: '120.50',
			extraGuestRate: '15'
		});

		test('sends whole cents and loads the list again when the values are valid', async () => {
			const created = roomType({ id: 7, name: 'Suite' });
			api.send.mockResolvedValue(created);
			api.get.mockResolvedValue([created]);

			await addRoomType(store, api, values());

			expect(api.send).toHaveBeenCalledWith('POST', '/api/room-types', {
				name: 'Suite',
				maxOccupancy: 4,
				baseRateCents: 12050,
				extraGuestCents: 1500
			});
			expect(store.getState().roomTypes).toEqual([created]);
			expect(store.getState().status.kind).toEqual('success');
		});

		test('sets an error status and sends nothing when the base rate does not parse', async () => {
			await addRoomType(store, api, { ...values(), baseRate: 'abc' });

			expect(api.send).not.toHaveBeenCalled();
			expect(store.getState().status.kind).toEqual('error');
		});

		test('sets an error status and sends nothing when the extra-guest rate does not parse', async () => {
			await addRoomType(store, api, { ...values(), extraGuestRate: '' });

			expect(api.send).not.toHaveBeenCalled();
			expect(store.getState().status.kind).toEqual('error');
		});

		test('sets an error status and sends nothing when the maximum guests is not a whole number', async () => {
			await addRoomType(store, api, { ...values(), maxOccupancy: '2.5' });

			expect(api.send).not.toHaveBeenCalled();
			expect(store.getState().status.kind).toEqual('error');
		});

		test('sets an error status with the message when the API refuses', async () => {
			api.send.mockRejectedValue(new Error('a room type named "Suite" exists already'));

			await addRoomType(store, api, values());

			expect(store.getState().status).toEqual({
				kind: 'error',
				message: 'a room type named "Suite" exists already'
			});
		});
	});

	describe('changeBaseRate', () => {
		test('sends whole cents and replaces the room type in the state when the text parses', async () => {
			const before = roomType({ id: 3 });
			const after = { ...before, baseRateCents: 9950 };
			store.setState({ roomTypes: [before] });
			api.send.mockResolvedValue(after);

			await changeBaseRate(store, api, 3, '99,50');

			expect(api.send).toHaveBeenCalledWith('PUT', '/api/room-types/3/base-rate', {
				baseRateCents: 9950
			});
			expect(store.getState().roomTypes).toEqual([after]);
		});

		test('sets an error status and sends nothing when the text does not parse', async () => {
			await changeBaseRate(store, api, 3, 'free');

			expect(api.send).not.toHaveBeenCalled();
			expect(store.getState().status.kind).toEqual('error');
		});

		test('sets an error status with the message when the API refuses', async () => {
			api.send.mockRejectedValue(new Error('room type 3 does not exist'));

			await changeBaseRate(store, api, 3, '10');

			expect(store.getState().status).toEqual({
				kind: 'error',
				message: 'room type 3 does not exist'
			});
		});
	});

	describe('removeRoomType', () => {
		test('deletes the room type and loads room types and ranges again when it succeeds', async () => {
			const remaining = [roomType({ id: 2 })];
			const ranges = [{ first: 101, last: 105, roomTypeId: 2, roomTypeName: 'x' }];
			api.send.mockResolvedValue(null);
			api.get.mockImplementation(async (path) => {
				if (path === '/api/room-types') return remaining;
				if (path === '/api/room-ranges') return ranges;
				throw new Error(`unexpected ${path}`);
			});

			await removeRoomType(store, api, 1);

			expect(api.send).toHaveBeenCalledWith('DELETE', '/api/room-types/1');
			expect(store.getState().roomTypes).toEqual(remaining);
			expect(store.getState().ranges).toEqual(ranges);
		});

		test('sets an error status with the message and keeps the lists when the API refuses', async () => {
			const types = [roomType({ id: 1 })];
			store.setState({ roomTypes: types });
			api.send.mockRejectedValue(new Error('room type 1 has reservations'));

			await removeRoomType(store, api, 1);

			expect(store.getState().status).toEqual({
				kind: 'error',
				message: 'room type 1 has reservations'
			});
			expect(store.getState().roomTypes).toEqual(types);
			expect(api.get).not.toHaveBeenCalled();
		});
	});
});
