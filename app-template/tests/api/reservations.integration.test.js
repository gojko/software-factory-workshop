import { randomInt, randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, test } from '@jest/globals';
import { instantOf, localDayOf, nextDayOf } from '../../src/domain/zoned-time.js';

const TIME_ZONE = 'Europe/Berlin';
const CHECK_IN_MINUTES = 15 * 60;
const CHECK_OUT_MINUTES = 11 * 60;
const DAYS_AHEAD = 365;
const MS_PER_DAY = 86400000;
const NO_ROOM_MESSAGE = 'No room of this type is free any more for these dates. Please search again.';

describe('the reservation routes', () => {
	let underTest;
	let firstDay;

	const send = (method, path, body) =>
		fetch(new URL(path, underTest), {
			method,
			headers: { 'content-type': 'application/json' },
			body: body === undefined ? undefined : JSON.stringify(body)
		});

	const dayAfter = (day, count) => {
		let result = day;
		for (let index = 0; index < count; index += 1) {
			result = nextDayOf(result);
		}
		return result;
	};

	const arrivalOn = (offset) => instantOf(dayAfter(firstDay, offset), CHECK_IN_MINUTES, TIME_ZONE);
	const departureOn = (offset) => instantOf(dayAfter(firstDay, offset), CHECK_OUT_MINUTES, TIME_ZONE);

	const createTypeWithRooms = async (roomCount) => {
		const response = await send('POST', '/api/room-types', {
			name: randomUUID(),
			maxOccupancy: 2,
			baseRateCents: 10000,
			extraGuestCents: 2500
		});
		const type = await response.json();
		const first = randomInt(10000, 90000);
		const last = first + roomCount - 1;
		await send('PUT', '/api/room-ranges', { first, last, roomTypeId: type.id });
		return { type, first, last };
	};

	const bookingOf = (roomTypeId, overrides = {}) => ({
		roomTypeId,
		arrivalAt: arrivalOn(0),
		departureAt: departureOn(3),
		guests: 2,
		guestName: `Guest ${randomUUID()}`,
		guestEmail: 'guest@example.com',
		...overrides
	});

	const book = (body) => send('POST', '/api/reservations', body);

	beforeEach(() => {
		underTest = new URL(process.env.APP_URL);
		firstDay = localDayOf(Date.now() + DAYS_AHEAD * MS_PER_DAY, TIME_ZONE);
	});

	test('gives the lowest room first and then the next when two bookings are made', async () => {
		const { type, first } = await createTypeWithRooms(3);

		const firstResponse = await book(bookingOf(type.id));
		const secondResponse = await book(bookingOf(type.id));

		expect(firstResponse.status).toEqual(201);
		expect(await firstResponse.json()).toEqual(
			expect.objectContaining({
				roomNumber: first,
				roomTypeId: type.id,
				status: 'Confirmed',
				nights: 3,
				guests: 2
			})
		);
		expect(secondResponse.status).toEqual(201);
		expect((await secondResponse.json()).roomNumber).toEqual(first + 1);
	});

	test('returns 409 with the message when no room is free any more', async () => {
		const { type } = await createTypeWithRooms(1);
		await book(bookingOf(type.id));

		const response = await book(bookingOf(type.id));

		expect(response.status).toEqual(409);
		expect(await response.json()).toEqual({ error: NO_ROOM_MESSAGE });
	});

	test('returns 400 when the email is invalid', async () => {
		const { type } = await createTypeWithRooms(1);

		const response = await book(bookingOf(type.id, { guestEmail: 'not-an-email' }));

		expect(response.status).toEqual(400);
	});

	describe('when a reservation exists', () => {
		let type;
		let first;
		let last;
		let reservation;
		let guestName;

		beforeEach(async () => {
			({ type, first, last } = await createTypeWithRooms(3));
			guestName = `Guest ${randomUUID()}`;
			reservation = await (await book(bookingOf(type.id, { guestName }))).json();
		});

		test('finds the reservation when searching by its code in lower case', async () => {
			const query = new URLSearchParams({ query: reservation.code.toLowerCase() });

			const response = await send('GET', `/api/reservations?${query}`);

			expect(response.status).toEqual(200);
			expect(await response.json()).toContainEqual(reservation);
		});

		test('finds the reservation when searching by part of the guest name', async () => {
			const query = new URLSearchParams({ query: guestName.slice(6, 30) });

			const response = await send('GET', `/api/reservations?${query}`);

			expect(response.status).toEqual(200);
			expect(await response.json()).toContainEqual(reservation);
		});

		test('lists the reservation when listing from its arrival instant', async () => {
			const query = new URLSearchParams({ from: String(reservation.arrivalAt) });

			const response = await send('GET', `/api/reservations?${query}`);

			expect(response.status).toEqual(200);
			expect(await response.json()).toContainEqual(reservation);
		});

		test('returns 400 when neither query nor from is given', async () => {
			const response = await send('GET', '/api/reservations');

			expect(response.status).toEqual(400);
		});

		test('returns 400 when both query and from are given', async () => {
			const query = new URLSearchParams({ query: 'abc', from: '0' });

			const response = await send('GET', `/api/reservations?${query}`);

			expect(response.status).toEqual(400);
		});

		test('returns 409 and keeps the type when a room type with a reservation is removed', async () => {
			const response = await send('DELETE', `/api/room-types/${type.id}`);

			expect(response.status).toEqual(409);
			const types = await (await send('GET', '/api/room-types')).json();
			expect(types.map((roomType) => roomType.id)).toContain(type.id);
		});

		test('returns 409 and keeps the type of the room when a range changes the reserved room', async () => {
			const other = (await createTypeWithRooms(1)).type;

			const response = await send('PUT', '/api/room-ranges', {
				first,
				last,
				roomTypeId: other.id
			});

			expect(response.status).toEqual(409);
			const rooms = await (await send('GET', '/api/rooms')).json();
			expect(rooms).toContainEqual({ number: reservation.roomNumber, roomTypeId: type.id });
		});

		test('returns 409 when a range with the reserved room is removed', async () => {
			const response = await send('DELETE', `/api/room-ranges?first=${first}&last=${last}`);

			expect(response.status).toEqual(409);
			const rooms = await (await send('GET', '/api/rooms')).json();
			expect(rooms).toContainEqual({ number: reservation.roomNumber, roomTypeId: type.id });
		});
	});
});
