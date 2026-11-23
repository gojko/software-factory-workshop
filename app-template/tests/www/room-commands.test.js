import { beforeEach, describe, expect, test, jest } from '@jest/globals';
import { createStore } from '../../src/www/store.js';
import { loadRanges, removeRange, setRange } from '../../src/www/room-commands.js';

const range = (overrides = {}) => ({
	first: 101,
	last: 122,
	roomTypeId: 1,
	roomTypeName: 'Single',
	...overrides
});

describe('room commands', () => {
	let store;
	let api;

	beforeEach(() => {
		store = createStore({ roomTypes: [], ranges: [], status: null });
		api = { get: jest.fn(), send: jest.fn() };
	});

	describe('loadRanges', () => {
		test('puts the ranges of the API into the state when the call succeeds', async () => {
			const ranges = [range(), range({ first: 123, last: 149, roomTypeId: 2, roomTypeName: 'Double' })];
			api.get.mockResolvedValue(ranges);

			await loadRanges(store, api);

			expect(api.get).toHaveBeenCalledWith('/api/room-ranges');
			expect(store.getState().ranges).toEqual(ranges);
		});

		test('sets an error status with the message when the API refuses', async () => {
			api.get.mockRejectedValue(new Error('server down'));

			await loadRanges(store, api);

			expect(store.getState().status).toEqual({ kind: 'error', message: 'server down' });
		});
	});

	describe('setRange', () => {
		const values = () => ({ first: '101', last: '122', roomTypeId: '1' });

		test('sends whole numbers and loads the ranges again when the values are valid', async () => {
			const ranges = [range()];
			api.send.mockResolvedValue({ first: 101, last: 122, roomTypeId: 1 });
			api.get.mockResolvedValue(ranges);

			await setRange(store, api, values());

			expect(api.send).toHaveBeenCalledWith('PUT', '/api/room-ranges', {
				first: 101,
				last: 122,
				roomTypeId: 1
			});
			expect(api.get).toHaveBeenCalledWith('/api/room-ranges');
			expect(store.getState().ranges).toEqual(ranges);
			expect(store.getState().status.kind).toEqual('success');
		});

		test('accepts a single room when first equals last', async () => {
			api.send.mockResolvedValue({});
			api.get.mockResolvedValue([]);

			await setRange(store, api, { first: '150', last: '150', roomTypeId: '3' });

			expect(api.send).toHaveBeenCalledWith('PUT', '/api/room-ranges', {
				first: 150,
				last: 150,
				roomTypeId: 3
			});
		});

		test.each([
			['first is missing', { first: '', last: '5', roomTypeId: '1' }],
			['last is undefined', { first: '1', roomTypeId: '1' }],
			['the room type is missing', { first: '1', last: '5', roomTypeId: '' }],
			['first is not numeric', { first: 'abc', last: '5', roomTypeId: '1' }],
			['last is not a whole number', { first: '1', last: '5.5', roomTypeId: '1' }],
			['the room type is negative', { first: '1', last: '5', roomTypeId: '-1' }],
			['first is larger than last', { first: '10', last: '5', roomTypeId: '1' }]
		])('sets an error status and sends nothing when %s', async (_name, input) => {
			await setRange(store, api, input);

			expect(api.send).not.toHaveBeenCalled();
			expect(store.getState().status.kind).toEqual('error');
		});

		test('sets an error status with the conflict message when the API refuses', async () => {
			const message = 'room 105 has reservation ABC123';
			api.send.mockRejectedValue(new Error(message));

			await setRange(store, api, values());

			expect(store.getState().status).toEqual({ kind: 'error', message });
			expect(api.get).not.toHaveBeenCalled();
		});
	});

	describe('removeRange', () => {
		test('deletes the range and loads the ranges again when it succeeds', async () => {
			api.send.mockResolvedValue(null);
			api.get.mockResolvedValue([]);

			await removeRange(store, api, range({ first: 101, last: 105 }));

			expect(api.send).toHaveBeenCalledWith('DELETE', '/api/room-ranges?first=101&last=105');
			expect(store.getState().ranges).toEqual([]);
			expect(store.getState().status.kind).toEqual('success');
		});

		test('sets an error status with the message and keeps the ranges when the API refuses', async () => {
			const ranges = [range()];
			store.setState({ ranges });
			const message = 'room 105 has reservation ABC123';
			api.send.mockRejectedValue(new Error(message));

			await removeRange(store, api, range());

			expect(store.getState().status).toEqual({ kind: 'error', message });
			expect(store.getState().ranges).toEqual(ranges);
			expect(api.get).not.toHaveBeenCalled();
		});
	});
});
