import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, test } from '@jest/globals';

describe('the room type routes', () => {
	let underTest;

	const send = (method, path, body) =>
		fetch(new URL(path, underTest), {
			method,
			headers: { 'content-type': 'application/json' },
			body: body === undefined ? undefined : JSON.stringify(body)
		});

	const validType = (overrides = {}) => ({
		name: randomUUID(),
		maxOccupancy: 2,
		baseRateCents: 10000,
		extraGuestCents: 2500,
		...overrides
	});

	const list = async () => (await send('GET', '/api/room-types')).json();

	beforeEach(() => {
		underTest = new URL(process.env.APP_URL);
	});

	test('returns 201 and lists the type when a room type is created', async () => {
		const input = validType();

		const response = await send('POST', '/api/room-types', input);

		const created = await response.json();
		expect(response.status).toEqual(201);
		expect(created).toEqual({ id: expect.any(Number), ...input });
		expect(await list()).toContainEqual(created);
	});

	test.each([
		['the name is empty', { name: '' }],
		['the occupancy is 0', { maxOccupancy: 0 }],
		['the base rate is negative', { baseRateCents: -1 }],
		['the extra guest price is negative', { extraGuestCents: -1 }]
	])('returns 400 and stores nothing when %s', async (reason, overrides) => {
		const input = validType(overrides);
		const before = await list();

		const response = await send('POST', '/api/room-types', input);

		expect(response.status).toEqual(400);
		expect(typeof (await response.json()).error).toEqual('string');
		expect(await list()).toEqual(before);
	});

	test('returns 409 when the name exists in other letter case', async () => {
		const input = validType({ name: `Suite-${randomUUID()}` });
		await send('POST', '/api/room-types', input);

		const response = await send('POST', '/api/room-types', {
			...input,
			name: input.name.toUpperCase()
		});

		expect(response.status).toEqual(409);
		expect(typeof (await response.json()).error).toEqual('string');
	});

	test('returns the updated type when a room type is replaced', async () => {
		const created = await (await send('POST', '/api/room-types', validType())).json();
		const changed = validType({ maxOccupancy: 4 });

		const response = await send('PUT', `/api/room-types/${created.id}`, changed);

		expect(response.status).toEqual(200);
		expect(await response.json()).toEqual({ id: created.id, ...changed });
	});

	test('changes only the base rate when the base rate is updated', async () => {
		const created = await (await send('POST', '/api/room-types', validType())).json();

		const response = await send('PUT', `/api/room-types/${created.id}/base-rate`, {
			baseRateCents: 15000
		});

		expect(response.status).toEqual(200);
		expect(await response.json()).toEqual({ ...created, baseRateCents: 15000 });
		expect(await list()).toContainEqual({ ...created, baseRateCents: 15000 });
	});

	test('returns 400 when the new base rate is negative', async () => {
		const created = await (await send('POST', '/api/room-types', validType())).json();

		const response = await send('PUT', `/api/room-types/${created.id}/base-rate`, {
			baseRateCents: -5
		});

		expect(response.status).toEqual(400);
		expect(await list()).toContainEqual(created);
	});

	test('returns 404 when the base rate of an unknown id is updated', async () => {
		const response = await send('PUT', '/api/room-types/999999999/base-rate', {
			baseRateCents: 100
		});

		expect(response.status).toEqual(404);
	});

	test('returns 204 and removes the type when a room type is deleted', async () => {
		const created = await (await send('POST', '/api/room-types', validType())).json();

		const response = await send('DELETE', `/api/room-types/${created.id}`);

		expect(response.status).toEqual(204);
		expect(await list()).not.toContainEqual(created);
	});

	test('returns 404 when an unknown id is deleted', async () => {
		const response = await send('DELETE', '/api/room-types/999999999');

		expect(response.status).toEqual(404);
		expect(typeof (await response.json()).error).toEqual('string');
	});

	test('returns 404 when the id is not a number', async () => {
		const response = await send('DELETE', `/api/room-types/${randomUUID()}`);

		expect(response.status).toEqual(404);
	});
});
