import { randomInt, randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, test } from '@jest/globals';

describe('the room and room range routes', () => {
	let underTest;

	const send = (method, path, body) =>
		fetch(new URL(path, underTest), {
			method,
			headers: { 'content-type': 'application/json' },
			body: body === undefined ? undefined : JSON.stringify(body)
		});

	const createType = async () => {
		const response = await send('POST', '/api/room-types', {
			name: randomUUID(),
			maxOccupancy: 2,
			baseRateCents: 10000,
			extraGuestCents: 2500
		});
		return response.json();
	};

	const randomBlock = () => {
		const first = randomInt(10000, 90000);
		return { first, last: first + 9 };
	};

	const listRanges = async () => (await send('GET', '/api/room-ranges')).json();

	beforeEach(() => {
		underTest = new URL(process.env.APP_URL);
	});

	test('creates the rooms and lists one range when a range is set', async () => {
		const type = await createType();
		const { first, last } = randomBlock();

		const response = await send('PUT', '/api/room-ranges', { first, last, roomTypeId: type.id });

		expect(response.status).toEqual(200);
		expect(await response.json()).toEqual({ first, last, roomTypeId: type.id });
		const rooms = await (await send('GET', '/api/rooms')).json();
		expect(rooms.filter((room) => room.roomTypeId === type.id)).toHaveLength(10);
		expect(rooms).toContainEqual({ number: first, roomTypeId: type.id });
		expect(await listRanges()).toContainEqual({
			first,
			last,
			roomTypeId: type.id,
			roomTypeName: type.name
		});
	});

	test('changes only the rooms of the part when another type is set for part of the block', async () => {
		const type = await createType();
		const other = await createType();
		const { first, last } = randomBlock();
		await send('PUT', '/api/room-ranges', { first, last, roomTypeId: type.id });

		const response = await send('PUT', '/api/room-ranges', {
			first: first + 3,
			last: first + 5,
			roomTypeId: other.id
		});

		expect(response.status).toEqual(200);
		const ranges = await listRanges();
		expect(ranges).toContainEqual({
			first,
			last: first + 2,
			roomTypeId: type.id,
			roomTypeName: type.name
		});
		expect(ranges).toContainEqual({
			first: first + 3,
			last: first + 5,
			roomTypeId: other.id,
			roomTypeName: other.name
		});
		expect(ranges).toContainEqual({
			first: first + 6,
			last,
			roomTypeId: type.id,
			roomTypeName: type.name
		});
	});

	test('returns 400 when first is larger than last', async () => {
		const type = await createType();
		const { first } = randomBlock();

		const response = await send('PUT', '/api/room-ranges', {
			first: first + 5,
			last: first,
			roomTypeId: type.id
		});

		expect(response.status).toEqual(400);
		expect(typeof (await response.json()).error).toEqual('string');
	});

	test('returns 404 when the room type does not exist', async () => {
		const { first, last } = randomBlock();

		const response = await send('PUT', '/api/room-ranges', {
			first,
			last,
			roomTypeId: 999999999
		});

		expect(response.status).toEqual(404);
		expect(typeof (await response.json()).error).toEqual('string');
	});

	test('removes the rooms and returns 204 when a range is deleted', async () => {
		const type = await createType();
		const { first, last } = randomBlock();
		await send('PUT', '/api/room-ranges', { first, last, roomTypeId: type.id });

		const response = await send('DELETE', `/api/room-ranges?first=${first}&last=${last}`);

		expect(response.status).toEqual(204);
		const rooms = await (await send('GET', '/api/rooms')).json();
		expect(rooms.filter((room) => room.roomTypeId === type.id)).toEqual([]);
	});

	test('returns 400 when the deleted range has a text value', async () => {
		const response = await send('DELETE', '/api/room-ranges?first=abc&last=5');

		expect(response.status).toEqual(400);
	});
});
