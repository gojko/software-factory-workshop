import { afterEach, beforeEach, describe, expect, test } from '@jest/globals';

const FIXED = {
	timeZone: 'Europe/Berlin',
	checkInMinutes: 900,
	checkOutMinutes: 660,
	currency: 'EUR'
};

describe('the settings routes', () => {
	let underTest;
	let before;

	const put = (body) =>
		fetch(new URL('/api/settings', underTest), {
			method: 'PUT',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(body)
		});

	beforeEach(async () => {
		underTest = new URL(process.env.APP_URL);
		before = await (await fetch(new URL('/api/settings', underTest))).json();
	});

	afterEach(async () => {
		await put(before);
	});

	test('returns the four settings when GET is called', async () => {
		const response = await fetch(new URL('/api/settings', underTest));
		const body = await response.json();

		expect(response.status).toEqual(200);
		expect(Object.keys(body).sort()).toEqual([
			'checkInMinutes',
			'checkOutMinutes',
			'currency',
			'timeZone'
		]);
	});

	test('returns the updated settings when PUT is called with valid values', async () => {
		const changed = { ...FIXED, timeZone: 'Asia/Tokyo', checkInMinutes: 840 };

		const response = await put(changed);

		expect(response.status).toEqual(200);
		expect(await response.json()).toEqual(changed);
		const read = await fetch(new URL('/api/settings', underTest));
		expect(await read.json()).toEqual(changed);
	});

	test('returns 400 and keeps the settings when the time zone is unknown', async () => {
		const response = await put({ ...FIXED, timeZone: 'Mars/Olympus' });

		expect(response.status).toEqual(400);
		expect(await response.json()).toEqual({ error: expect.any(String) });
		const read = await fetch(new URL('/api/settings', underTest));
		expect(await read.json()).toEqual(before);
	});

	test('returns 400 when a time is 1440', async () => {
		const response = await put({ ...FIXED, checkInMinutes: 1440 });

		expect(response.status).toEqual(400);
	});

	test('returns 400 when the currency is JPY', async () => {
		const response = await put({ ...FIXED, currency: 'JPY' });

		expect(response.status).toEqual(400);
	});
});
