import { beforeEach, describe, expect, test, jest } from '@jest/globals';
import { randomUUID } from 'node:crypto';
import { createStore } from '../../src/www/store.js';
import { createSearchState } from '../../src/www/search.js';
import { ApiError } from '../../src/www/api-client.js';
import { bookRoom, cancelBooking, startBooking } from '../../src/www/booking.js';

const settings = { timeZone: 'Europe/Berlin', checkInMinutes: 900, checkOutMinutes: 660, currency: 'EUR' };
const clock = { now: () => Date.UTC(2030, 0, 15, 9, 0) };
const ARRIVAL_AT = Date.UTC(2030, 0, 15, 14, 0);
const DEPARTURE_AT = Date.UTC(2030, 0, 16, 10, 0);

describe('startBooking and cancelBooking', () => {
	let underTest;

	beforeEach(() => {
		underTest = createStore(createSearchState(clock, settings));
	});

	test('sets the booking of the room type and clears an old status', () => {
		underTest.setState({ status: { kind: 'error', message: 'old' } });

		startBooking(underTest, 7);

		expect(underTest.getState()).toEqual(
			expect.objectContaining({ booking: { roomTypeId: 7 }, status: null })
		);
	});

	test('clears the booking', () => {
		startBooking(underTest, 7);

		cancelBooking(underTest);

		expect(underTest.getState().booking).toBeNull();
	});
});

describe('bookRoom', () => {
	let underTest;
	let api;
	const reservation = { code: 'ABC123', roomNumber: 101, roomTypeName: 'Single' };

	beforeEach(() => {
		underTest = createStore({ ...createSearchState(clock, settings), results: [] });
		underTest.setState({ values: { arrivalAt: ARRIVAL_AT, departureAt: DEPARTURE_AT, guests: '2' } });
		api = { get: jest.fn(), send: jest.fn() };
		startBooking(underTest, 7);
	});

	test('sends the room type, the stay, the guests and the guest data', async () => {
		api.send.mockResolvedValue(reservation);
		const guestName = randomUUID();

		await bookRoom(underTest, api, { guestName: `  ${guestName} `, guestEmail: 'a@b.com' });

		expect(api.send).toHaveBeenCalledWith('POST', '/api/reservations', {
			roomTypeId: 7,
			arrivalAt: ARRIVAL_AT,
			departureAt: DEPARTURE_AT,
			guests: 2,
			guestName,
			guestEmail: 'a@b.com'
		});
	});

	test('stores the confirmation and clears the booking when the API answers', async () => {
		api.send.mockResolvedValue(reservation);

		await bookRoom(underTest, api, { guestName: 'Ann', guestEmail: 'a@b.com' });

		expect(underTest.getState()).toEqual(
			expect.objectContaining({ confirmation: reservation, booking: null, status: null })
		);
	});

	test('sets an error status and sends nothing when the name is empty', async () => {
		await bookRoom(underTest, api, { guestName: '   ', guestEmail: 'a@b.com' });

		expect(api.send).not.toHaveBeenCalled();
		expect(underTest.getState().status).toEqual({ kind: 'error', message: expect.any(String) });
		expect(underTest.getState().booking).toEqual({ roomTypeId: 7 });
	});

	test.each(['', 'ann', 'ann@host', 'ann@.com', '@host.com', 'a b@host.com'])(
		'sets an error status and sends nothing when the email is "%s"',
		async (guestEmail) => {
			await bookRoom(underTest, api, { guestName: 'Ann', guestEmail });

			expect(api.send).not.toHaveBeenCalled();
			expect(underTest.getState().status.kind).toEqual('error');
		}
	);

	test('sets the message and searches again when the API answers 409', async () => {
		api.send.mockRejectedValue(new ApiError(409, 'No room of this type is free'));
		api.get.mockResolvedValue([{ roomTypeId: 8 }]);

		await bookRoom(underTest, api, { guestName: 'Ann', guestEmail: 'a@b.com' });

		expect(api.get).toHaveBeenCalledWith('/api/availability', {
			arrivalAt: ARRIVAL_AT,
			departureAt: DEPARTURE_AT,
			guests: 2
		});
		expect(underTest.getState().results).toEqual([{ roomTypeId: 8 }]);
	});

	test('keeps the message of the 409 after the new search', async () => {
		api.send.mockRejectedValue(new ApiError(409, 'No room of this type is free'));
		api.get.mockResolvedValue([]);

		await bookRoom(underTest, api, { guestName: 'Ann', guestEmail: 'a@b.com' });

		expect(underTest.getState().status).toEqual({ kind: 'error', message: 'No room of this type is free' });
		expect(underTest.getState().confirmation).toBeNull();
	});

	test('sets the error status and does not search when the API answers 400', async () => {
		api.send.mockRejectedValue(new ApiError(400, 'Guest name is required'));

		await bookRoom(underTest, api, { guestName: 'Ann', guestEmail: 'a@b.com' });

		expect(api.get).not.toHaveBeenCalled();
		expect(underTest.getState().status).toEqual({ kind: 'error', message: 'Guest name is required' });
		expect(underTest.getState().booking).toEqual({ roomTypeId: 7 });
	});

	test('sends nothing when no booking was started', async () => {
		cancelBooking(underTest);

		await bookRoom(underTest, api, { guestName: 'Ann', guestEmail: 'a@b.com' });

		expect(api.send).not.toHaveBeenCalled();
	});
});
