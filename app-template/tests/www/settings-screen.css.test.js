import { beforeEach, describe, expect, test, jest } from '@jest/globals';
import { randomUUID } from 'node:crypto';
import { createStore } from '../../src/www/store.js';
import { createRoomsState } from '../../src/www/settings-commands.js';
import { mountSettingsScreen } from '../../src/www/screens/settings-screen.js';

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const settings = (overrides = {}) => ({
	timeZone: 'Europe/Berlin',
	checkInMinutes: 900,
	checkOutMinutes: 660,
	currency: 'EUR',
	...overrides
});

describe('mountSettingsScreen', () => {
	let root;
	let store;
	let api;

	beforeEach(() => {
		document.body.innerHTML = '<section id="root"></section>';
		root = document.getElementById('root');
		store = createStore(createRoomsState());
		api = { get: jest.fn(), send: jest.fn() };
		mountSettingsScreen(root, { store, api });
	});

	const field = (name) => root.querySelector('form').elements[name];

	test('shows the settings of the state in the fields', () => {
		store.setState({ settings: settings({ timeZone: 'Asia/Tokyo', checkInMinutes: 870, currency: 'JPY' }) });

		expect(field('timeZone').value).toEqual('Asia/Tokyo');
		expect(field('checkIn').value).toEqual('14:30');
		expect(field('checkOut').value).toEqual('11:00');
		expect(field('currency').value).toEqual('JPY');
	});

	test('offers the known time zones and currencies in datalists', () => {
		const zones = root.querySelector(`datalist[id="${field('timeZone').getAttribute('list')}"]`);
		const currencies = root.querySelector(`datalist[id="${field('currency').getAttribute('list')}"]`);

		expect([...zones.options].map((option) => option.value)).toContain('Europe/Berlin');
		expect([...currencies.options].map((option) => option.value)).toContain('EUR');
	});

	test('shows a note that the zone decides the date and the nights', () => {
		expect(root.textContent).toMatch(/today's date/);
		expect(root.textContent).toMatch(/nights/);
	});

	test('calls the API with minutes when the form is submitted', async () => {
		api.send.mockResolvedValue(settings({ currency: 'USD' }));
		store.setState({ settings: settings() });
		field('currency').value = 'USD';
		field('checkIn').value = '15:00';
		field('checkOut').value = '11:00';

		root.querySelector('form').dispatchEvent(new Event('submit', { cancelable: true }));
		await flush();

		expect(api.send).toHaveBeenCalledWith(
			'PUT',
			'/api/settings',
			expect.objectContaining({ checkInMinutes: 900, checkOutMinutes: 660, currency: 'USD' })
		);
		expect(field('currency').value).toEqual('USD');
	});

	test('shows a refusal of the API as text in the status region', async () => {
		const message = randomUUID();
		api.send.mockRejectedValue(new Error(message));
		store.setState({ settings: settings() });

		root.querySelector('form').dispatchEvent(new Event('submit', { cancelable: true }));
		await flush();

		const status = root.querySelector('[role="status"]');
		expect(status.textContent).toEqual(message);
		expect(status.children.length).toEqual(0);
	});

	test('shows an error and sends nothing when a time is empty', async () => {
		store.setState({ settings: settings() });
		field('checkIn').value = '';

		root.querySelector('form').dispatchEvent(new Event('submit', { cancelable: true }));
		await flush();

		expect(api.send).not.toHaveBeenCalled();
		expect(root.querySelector('[role="status"]').textContent).not.toEqual('');
	});
});
