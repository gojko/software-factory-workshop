import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, test } from '@jest/globals';

describe('the setup state route', () => {
	let underTest;

	const send = (method, path, body) =>
		fetch(new URL(path, underTest), {
			method,
			headers: { 'content-type': 'application/json' },
			body: body === undefined ? undefined : JSON.stringify(body)
		});

	beforeEach(() => {
		underTest = new URL(process.env.APP_URL);
	});

	test('returns 200 and one of the three states', async () => {
		const response = await send('GET', '/api/setup-state');

		const body = await response.json();
		expect(response.status).toEqual(200);
		expect(['unconfigured', 'needs-rooms', 'ready']).toContain(body.state);
	});

	test('returns a state other than unconfigured when a room type exists', async () => {
		const created = await send('POST', '/api/room-types', {
			name: randomUUID(),
			maxOccupancy: 2,
			baseRateCents: 10000,
			extraGuestCents: 2500
		});

		const response = await send('GET', '/api/setup-state');

		const body = await response.json();
		expect(created.status).toEqual(201);
		expect(response.status).toEqual(200);
		expect(body.state).not.toEqual('unconfigured');
	});
});
