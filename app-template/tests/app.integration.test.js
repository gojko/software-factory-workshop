import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, test } from '@jest/globals';

describe('the web app', () => {
	let underTest;

	beforeEach(() => {
		underTest = new URL(process.env.APP_URL);
	});

	test('returns the greeting message when the greeting API is called', async () => {
		const response = await fetch(new URL('/api/greeting', underTest));

		expect(response.status).toEqual(200);
		expect(await response.json()).toEqual({ message: 'Hello, world!' });
	});

	test('returns the home page as HTML when the root path is requested', async () => {
		const response = await fetch(new URL('/', underTest));

		expect(response.status).toEqual(200);
		expect(response.headers.get('content-type')).toEqual('text/html; charset=utf-8');
		expect(await response.text()).toContain('<h1 id="greeting">');
	});

	test('returns the stylesheet as CSS when the stylesheet is requested', async () => {
		const response = await fetch(new URL('/styles.css', underTest));

		expect(response.status).toEqual(200);
		expect(response.headers.get('content-type')).toEqual('text/css; charset=utf-8');
	});

	test('returns the page script as JavaScript when the script is requested', async () => {
		const response = await fetch(new URL('/app.js', underTest));

		expect(response.status).toEqual(200);
		expect(response.headers.get('content-type')).toEqual('text/javascript; charset=utf-8');
	});

	test('returns 404 when the path does not exist', async () => {
		const response = await fetch(new URL(`/${randomUUID()}`, underTest));

		expect(response.status).toEqual(404);
	});
});
