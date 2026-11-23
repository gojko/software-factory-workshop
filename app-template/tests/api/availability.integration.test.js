import { randomInt, randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, test } from '@jest/globals';
import { instantOf, localDayOf, nextDayOf } from '../../src/domain/zoned-time.js';

const TIME_ZONE = 'Europe/Berlin';
const CHECK_IN_MINUTES = 15 * 60;
const CHECK_OUT_MINUTES = 11 * 60;
const DAYS_AHEAD = 365;
const MS_PER_DAY = 86400000;

describe('the availability route', () => {
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

	const createTypeWithRooms = async ({ maxOccupancy, roomCount }) => {
		const response = await send('POST', '/api/room-types', {
			name: randomUUID(),
			maxOccupancy,
			baseRateCents: 10000,
			extraGuestCents: 2500
		});
		const type = await response.json();
		const first = randomInt(10000, 90000);
		await send('PUT', '/api/room-ranges', { first, last: first + roomCount - 1, roomTypeId: type.id });
		return type;
	};

	const search = (query) => send('GET', `/api/availability?${new URLSearchParams(query)}`);

	const validQuery = (overrides = {}) => ({
		arrivalAt: arrivalOn(0),
		departureAt: departureOn(3),
		guests: 2,
		...overrides
	});

	beforeEach(() => {
		underTest = new URL(process.env.APP_URL);
		firstDay = localDayOf(Date.now() + DAYS_AHEAD * MS_PER_DAY, TIME_ZONE);
	});

	test('shows free rooms, nights, price per night and total when a type is available', async () => {
		const type = await createTypeWithRooms({ maxOccupancy: 2, roomCount: 4 });

		const response = await search(validQuery());

		expect(response.status).toEqual(200);
		const entries = await response.json();
		expect(entries.find((entry) => entry.roomTypeName === type.name)).toEqual({
			roomTypeId: type.id,
			roomTypeName: type.name,
			freeRooms: 4,
			nights: 3,
			pricePerNightCents: 12500,
			totalCents: 37500
		});
	});

	test('omits a type with a smaller maximum occupancy when more guests are searched', async () => {
		const single = await createTypeWithRooms({ maxOccupancy: 1, roomCount: 2 });
		const double = await createTypeWithRooms({ maxOccupancy: 2, roomCount: 2 });

		const entries = await (await search(validQuery({ guests: 2 }))).json();

		expect(entries.map((entry) => entry.roomTypeName)).not.toContain(single.name);
		expect(entries.map((entry) => entry.roomTypeName)).toContain(double.name);
	});

	test('returns 400 with a message when the arrival day is in the past', async () => {
		const twoDaysAgo = Date.now() - 2 * MS_PER_DAY;

		const response = await search(validQuery({ arrivalAt: twoDaysAgo }));

		expect(response.status).toEqual(400);
		expect(await response.json()).toEqual({ error: 'arrival day must not be in the past' });
	});

	test('returns 400 when the stay has 31 nights', async () => {
		const response = await search(
			validQuery({ arrivalAt: instantOf(firstDay, 8 * 60, TIME_ZONE), departureAt: departureOn(31) })
		);

		expect(response.status).toEqual(400);
		expect(await response.json()).toEqual({ error: 'stay must have at most 30 nights' });
	});

	test('returns 400 when the stay has 0 nights', async () => {
		const response = await search(
			validQuery({ departureAt: instantOf(firstDay, 18 * 60, TIME_ZONE) })
		);

		expect(response.status).toEqual(400);
		expect(await response.json()).toEqual({ error: 'stay must have at least 1 night' });
	});

	test('returns 400 when guests is 5', async () => {
		const response = await search(validQuery({ guests: 5 }));

		expect(response.status).toEqual(400);
		expect(await response.json()).toEqual({ error: 'guests must be at most 4' });
	});

	test('returns 400 when guests is not a number', async () => {
		const response = await search(validQuery({ guests: 'two' }));

		expect(response.status).toEqual(400);
		expect(await response.json()).toEqual({ error: 'guests must be a whole number' });
	});

	test('returns 400 when a date is missing', async () => {
		const response = await search({ arrivalAt: arrivalOn(0), guests: 2 });

		expect(response.status).toEqual(400);
		expect(await response.json()).toEqual({ error: 'departureAt must be a whole number of milliseconds' });
	});
});
