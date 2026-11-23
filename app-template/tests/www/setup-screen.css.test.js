import { beforeEach, describe, expect, test, jest } from '@jest/globals';
import { mountLanding, screenForSetupState } from '../../src/www/setup-screen.js';

const clock = { now: () => Date.UTC(2030, 0, 15, 9, 0) };

const fakeApi = (routes) => ({
	get: jest.fn(async (path) => {
		const answer = routes[path];
		if (answer instanceof Error) throw answer;
		return answer;
	}),
	send: jest.fn()
});

describe('screenForSetupState', () => {
	test.each([
		['unconfigured', 'hello'],
		['needs-rooms', 'rooms'],
		['ready', 'search'],
		['something-else', 'hello']
	])('returns the screen for the state %s', (state, screen) => {
		expect(screenForSetupState(state)).toEqual(screen);
	});

	test('returns hello when the state is missing', () => {
		expect(screenForSetupState(undefined)).toEqual('hello');
	});
});

describe('mountLanding', () => {
	let root;

	beforeEach(() => {
		document.body.innerHTML = `<main id="root">
			<h1 id="greeting">Loading…</h1>
			<p>Served by Express.</p>
			<a href="/rooms.html">Set up rooms</a>
		</main>`;
		root = document.getElementById('root');
	});

	test('shows the greeting and the setup link when the state is unconfigured', async () => {
		const api = fakeApi({
			'/api/setup-state': { state: 'unconfigured' },
			'/api/greeting': { message: 'Hello, hotel' }
		});

		await mountLanding(root, { api, clock });

		expect(root.querySelector('#greeting').textContent).toEqual('Hello, hotel');
		expect(root.querySelector('a[href="/rooms.html"]').textContent).toEqual('Set up rooms');
	});

	test('shows the fallback text when the greeting request fails', async () => {
		const api = fakeApi({
			'/api/setup-state': { state: 'unconfigured' },
			'/api/greeting': new Error('down')
		});

		await mountLanding(root, { api, clock });

		expect(root.querySelector('#greeting').textContent).toEqual('The greeting could not be loaded.');
	});

	test('shows the hello page when the state request fails', async () => {
		const api = fakeApi({
			'/api/setup-state': new Error('down'),
			'/api/greeting': { message: 'Hello, hotel' }
		});

		await mountLanding(root, { api, clock });

		expect(root.querySelector('#greeting').textContent).toEqual('Hello, hotel');
		expect(root.querySelector('a[href="/rooms.html"]')).not.toBeNull();
	});

	test('redirects to the rooms tab of the setup page when the state is needs-rooms', async () => {
		const api = fakeApi({ '/api/setup-state': { state: 'needs-rooms' } });
		const navigate = jest.fn();

		await mountLanding(root, { api, clock, navigate });

		expect(navigate).toHaveBeenCalledWith('/rooms.html#room-ranges');
		expect(root.querySelector('#room-types-widget')).toBeNull();
	});

	test('redirects to the search page when the state is ready', async () => {
		const api = fakeApi({ '/api/setup-state': { state: 'ready' } });
		const navigate = jest.fn();

		await mountLanding(root, { api, clock, navigate });

		expect(navigate).toHaveBeenCalledWith('/search.html');
		expect(root.querySelector('form.search-form')).toBeNull();
	});

	test('does not redirect when the state is unconfigured', async () => {
		const api = fakeApi({ '/api/setup-state': { state: 'unconfigured' }, '/api/greeting': { message: 'Hello' } });
		const navigate = jest.fn();

		await mountLanding(root, { api, clock, navigate });

		expect(navigate).not.toHaveBeenCalled();
	});
});
