import { beforeEach, describe, expect, test, jest } from '@jest/globals';
import { createStore } from '../../src/www/store.js';
import { createLookupState } from '../../src/www/lookup.js';
import { mountReservationsScreen } from '../../src/www/screens/reservations-screen.js';
import { formatCents } from '../../src/www/money.js';
import { formatInstant } from '../../src/www/dates.js';

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const settings = { timeZone: 'Europe/Berlin', checkInMinutes: 900, checkOutMinutes: 660, currency: 'EUR' };
const clock = { now: () => Date.UTC(2030, 0, 15, 9, 0) };
const zone = { timeZone: settings.timeZone };

const reservation = (overrides = {}) => ({
	id: 1,
	code: 'ABC123',
	roomNumber: 101,
	roomTypeName: 'Single',
	guestName: 'Ada Lovelace',
	arrivalAt: Date.UTC(2030, 0, 15, 14, 0),
	departureAt: Date.UTC(2030, 0, 16, 10, 0),
	guests: 2,
	totalCents: 8000,
	...overrides
});

describe('mountReservationsScreen', () => {
	let root;
	let store;
	let api;

	beforeEach(() => {
		document.body.innerHTML = '<section id="root"></section>';
		root = document.getElementById('root');
		store = createStore(createLookupState(clock, settings));
		api = { get: jest.fn(), send: jest.fn() };
		mountReservationsScreen(root, { store, api, clock });
	});

	const searchForm = () => root.querySelector('form.find-form');
	const listForm = () => root.querySelector('form.list-form');
	const status = () => root.querySelector('[role="status"]');
	const rows = () => [...root.querySelectorAll('.results tbody tr')].map((row) =>
		[...row.querySelectorAll('td')].map((cell) => cell.textContent)
	);

	test('fills the day input with the day of the from instant', () => {
		expect(listForm().elements.day.value).toEqual('2030-01-15');
	});

	test('shows no rows and no message before a lookup', () => {
		expect(root.querySelector('.results tbody')).toBeNull();
		expect(root.querySelector('.empty')).toBeNull();
		expect(status().textContent).toEqual('');
	});

	test('shows the fields of each reservation in a row', () => {
		const found = reservation();

		store.setState({ reservations: [found] });

		expect(rows()).toEqual([
			[
				'ABC123',
				'Ada Lovelace',
				'101',
				'Single',
				formatInstant(found.arrivalAt, zone),
				formatInstant(found.departureAt, zone),
				'2',
				formatCents(8000, { currency: 'EUR' })
			]
		]);
	});

	test('shows one row for each reservation in the order of the state', () => {
		store.setState({
			reservations: [reservation({ code: 'AAA111' }), reservation({ code: 'BBB222' })]
		});

		expect(rows().map((row) => row[0])).toEqual(['AAA111', 'BBB222']);
	});

	test('shows the guest name as text and not as markup', () => {
		store.setState({ reservations: [reservation({ guestName: '<b>Eve</b>' })] });

		expect(rows()[0][1]).toEqual('<b>Eve</b>');
		expect(root.querySelector('.results b')).toBeNull();
	});

	test('shows the message that no reservation was found when the answer is empty', () => {
		store.setState({ reservations: [] });

		expect(root.querySelector('.results .empty').textContent).toEqual('No reservation was found.');
		expect(root.querySelector('.results tbody')).toBeNull();
	});

	test('calls the API with the query when the search form is submitted', async () => {
		api.get.mockResolvedValue([]);
		searchForm().elements.query.value = 'lovelace';

		searchForm().requestSubmit();
		await flush();

		expect(api.get).toHaveBeenCalledWith('/api/reservations', { query: 'lovelace' });
	});

	test('shows the error in the status region and sends nothing when the search text is empty', async () => {
		searchForm().elements.query.value = '';

		searchForm().requestSubmit();
		await flush();

		expect(api.get).not.toHaveBeenCalled();
		expect(status().textContent).not.toEqual('');
	});

	test('calls the API with the start of the chosen day in the hotel zone when List is submitted', async () => {
		api.get.mockResolvedValue([]);
		listForm().elements.day.value = '2030-02-01';

		listForm().requestSubmit();
		await flush();

		expect(api.get).toHaveBeenCalledWith('/api/reservations', { from: Date.UTC(2030, 0, 31, 23, 0) });
	});

	test('shows the rows of the answer after a search', async () => {
		api.get.mockResolvedValue([reservation()]);
		searchForm().elements.query.value = 'ABC123';

		searchForm().requestSubmit();
		await flush();

		expect(rows().length).toEqual(1);
	});

	test('shows a refusal of the API as text in the status region', async () => {
		api.get.mockRejectedValue(new Error('refused <b>now</b>'));
		searchForm().elements.query.value = 'x';

		searchForm().requestSubmit();
		await flush();

		expect(status().textContent).toEqual('refused <b>now</b>');
		expect(status().querySelector('b')).toBeNull();
	});

	test('clears the status region when the status is null', () => {
		store.setState({ status: { kind: 'error', message: 'x' } });
		store.setState({ status: null });

		expect(status().textContent).toEqual('');
	});
});
