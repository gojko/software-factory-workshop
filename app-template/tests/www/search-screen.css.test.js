import { beforeEach, describe, expect, test, jest } from '@jest/globals';
import { createStore } from '../../src/www/store.js';
import { createSearchState } from '../../src/www/search.js';
import { mountSearchScreen } from '../../src/www/screens/search-screen.js';
import { formatCents } from '../../src/www/money.js';

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

window.HTMLDialogElement.prototype.showModal = function () {
	this.setAttribute('open', '');
};
window.HTMLDialogElement.prototype.close = function () {
	if (!this.hasAttribute('open')) return;
	this.removeAttribute('open');
	this.dispatchEvent(new Event('close'));
};

const settings = { timeZone: 'Europe/Berlin', checkInMinutes: 900, checkOutMinutes: 660, currency: 'EUR' };
const clock = { now: () => Date.UTC(2030, 0, 15, 9, 0) };

const result = (overrides = {}) => ({
	roomTypeId: 1,
	roomTypeName: 'Single',
	freeRooms: 2,
	nights: 3,
	pricePerNightCents: 8000,
	totalCents: 24000,
	...overrides
});

describe('mountSearchScreen', () => {
	let root;
	let store;
	let api;

	beforeEach(() => {
		document.body.innerHTML = '<section id="root"></section>';
		root = document.getElementById('root');
		store = createStore(createSearchState(clock, settings));
		api = { get: jest.fn(), send: jest.fn() };
		mountSearchScreen(root, { store, api, clock });
	});

	const form = () => root.querySelector('form.search-form');
	const status = () => root.querySelector('.status[role="status"]');
	const rows = () => [...root.querySelectorAll('.results tbody tr')].map((row) =>
		[...row.querySelectorAll('td:not(:has(button))')].map((cell) => cell.textContent)
	);

	test('fills the day inputs and guests from the default state', () => {
		expect(form().elements.arrivalDay.value).toEqual('2030-01-15');
		expect(form().elements.departureDay.value).toEqual('2030-01-16');
		expect(form().elements.guests.value).toEqual('1');
	});

	test('sets min hints on the day inputs', () => {
		expect(form().elements.arrivalDay.getAttribute('min')).toEqual('2030-01-15');
		expect(form().elements.departureDay.getAttribute('min')).toEqual('2030-01-16');
	});

	test('shows no results before a search', () => {
		expect(root.querySelector('.results tbody')).toBeNull();
		expect(status().textContent).toEqual('');
	});

	test('calls the API with the instants of the chosen days when the form is submitted', async () => {
		api.get.mockResolvedValue([]);
		form().elements.arrivalDay.value = '2030-02-01';
		form().elements.departureDay.value = '2030-02-04';
		form().elements.guests.value = '3';

		form().dispatchEvent(new Event('submit', { cancelable: true }));
		await flush();

		expect(api.get).toHaveBeenCalledWith('/api/availability', {
			arrivalAt: Date.UTC(2030, 1, 1, 14, 0),
			departureAt: Date.UTC(2030, 1, 4, 10, 0),
			guests: 3
		});
	});

	test('shows an error and sends nothing when a day is empty', async () => {
		form().elements.arrivalDay.value = '';

		form().dispatchEvent(new Event('submit', { cancelable: true }));
		await flush();

		expect(api.get).not.toHaveBeenCalled();
		expect(status().textContent).not.toEqual('');
		expect(status().getAttribute('data-kind')).toEqual('error');
	});

	test('keeps what the clerk typed when an error status is shown', async () => {
		form().elements.guests.value = '9';

		form().dispatchEvent(new Event('submit', { cancelable: true }));
		await flush();

		expect(form().elements.guests.value).toEqual('9');
	});

	test('shows the results in the order of the API', () => {
		store.setState({
			results: [
				result({ roomTypeName: 'Suite', freeRooms: 1, nights: 3, pricePerNightCents: 30000, totalCents: 90000 }),
				result({ roomTypeName: 'Basic', freeRooms: 5, nights: 3, pricePerNightCents: 5000, totalCents: 15000 })
			]
		});

		expect(rows()).toEqual([
			['Suite', '1', '3', formatCents(30000, { currency: 'EUR' }), formatCents(90000, { currency: 'EUR' })],
			['Basic', '5', '3', formatCents(5000, { currency: 'EUR' }), formatCents(15000, { currency: 'EUR' })]
		]);
	});

	test('shows the stay in the hotel zone above the results', () => {
		store.setState({ results: [result()] });

		const text = root.querySelector('.results').textContent;

		expect(text).toContain('Jan 15, 2030');
		expect(text).toContain('03:00');
		expect(text).toContain('Jan 16, 2030');
		expect(text).toContain('11:00');
	});

	test('shows that no room type is available when the result is empty', () => {
		store.setState({ results: [] });

		expect(root.querySelector('.results').textContent).toContain('No room type is available');
		expect(root.querySelectorAll('.results tbody tr')).toHaveLength(0);
	});

	test('shows the text of an error in the status region', () => {
		store.setState({ status: { kind: 'error', message: 'Arrival must be in the future' } });

		expect(status().textContent).toEqual('Arrival must be in the future');
	});

	test('replaces the results when a new search answers', async () => {
		api.get.mockResolvedValue([result({ roomTypeName: 'Double' })]);

		form().dispatchEvent(new Event('submit', { cancelable: true }));
		await flush();

		expect(rows().map((row) => row[0])).toEqual(['Double']);
	});

	describe('booking', () => {
		const bookingForm = () => root.querySelector('form.booking-form');
		const reservation = {
			code: 'K7M2QX',
			roomNumber: 104,
			roomTypeName: 'Single',
			arrivalAt: Date.UTC(2030, 0, 15, 14, 0),
			departureAt: Date.UTC(2030, 0, 16, 10, 0),
			guests: 2,
			totalCents: 24000
		};

		beforeEach(() => {
			store.setState({ results: [result({ roomTypeId: 3 })] });
		});

		test('opens the booking form when the Book button is clicked', () => {
			expect(bookingForm()).toBeNull();

			root.querySelector('.results button.book').click();

			expect(bookingForm()).not.toBeNull();
			expect(bookingForm().elements.guestName).toBeDefined();
			expect(bookingForm().elements.guestEmail).toBeDefined();
			expect(store.getState().booking).toEqual({ roomTypeId: 3 });
		});

		test('shows the booking form in an open modal dialog when the Book button is clicked', () => {
			root.querySelector('.results button.book').click();

			const dialog = bookingForm().closest('dialog');
			expect(dialog).not.toBeNull();
			expect(dialog.hasAttribute('open')).toBe(true);
		});

		test('groups Cancel before Confirm in one actions row at the end of the form', () => {
			root.querySelector('.results button.book').click();

			const actions = bookingForm().lastElementChild;
			expect(actions.className).toEqual('dialog-actions');
			expect([...actions.children].map((b) => b.textContent)).toEqual(['Cancel', 'Confirm booking']);
		});

		test('closes the dialog and clears the booking when the dialog is dismissed', () => {
			root.querySelector('.results button.book').click();

			bookingForm().closest('dialog').close();

			expect(store.getState().booking).toBeNull();
			expect(bookingForm()).toBeNull();
		});

		test('shows the error inside the dialog when the email is refused', async () => {
			root.querySelector('.results button.book').click();
			bookingForm().elements.guestName.value = 'Ann Guest';
			bookingForm().elements.guestEmail.value = 'ann';

			bookingForm().dispatchEvent(new Event('submit', { cancelable: true }));
			await flush();

			const inDialog = bookingForm().closest('dialog').querySelector('[role="status"]');
			expect(inDialog.textContent).toEqual('Enter a valid guest email');
		});

		test('closes the booking form when Cancel is clicked', () => {
			root.querySelector('.results button.book').click();

			bookingForm().querySelector('button.cancel').click();

			expect(bookingForm()).toBeNull();
		});

		test('sends the reservation when the booking form is submitted', async () => {
			api.send.mockResolvedValue(reservation);
			root.querySelector('.results button.book').click();
			bookingForm().elements.guestName.value = 'Ann Guest';
			bookingForm().elements.guestEmail.value = 'ann@example.com';

			bookingForm().dispatchEvent(new Event('submit', { cancelable: true }));
			await flush();

			expect(api.send).toHaveBeenCalledWith(
				'POST',
				'/api/reservations',
				expect.objectContaining({ roomTypeId: 3, guestName: 'Ann Guest', guestEmail: 'ann@example.com' })
			);
			expect(bookingForm()).toBeNull();
		});

		test('keeps what the clerk typed when the email is refused', async () => {
			root.querySelector('.results button.book').click();
			bookingForm().elements.guestName.value = 'Ann Guest';
			bookingForm().elements.guestEmail.value = 'ann';

			bookingForm().dispatchEvent(new Event('submit', { cancelable: true }));
			await flush();

			expect(api.send).not.toHaveBeenCalled();
			expect(bookingForm().elements.guestName.value).toEqual('Ann Guest');
			expect(status().getAttribute('data-kind')).toEqual('error');
		});

		test('shows the code and room number as text in the confirmation', () => {
			store.setState({ confirmation: reservation });

			const text = root.querySelector('.confirmation').textContent;

			expect(text).toContain('K7M2QX');
			expect(text).toContain('104');
			expect(text).toContain('Single');
			expect(text).toContain('Jan 15, 2030');
			expect(text).toContain(formatCents(24000, { currency: 'EUR' }));
		});

		test('does not parse the code as HTML in the confirmation', () => {
			store.setState({ confirmation: { ...reservation, code: '<b>x</b>' } });

			expect(root.querySelector('.confirmation b')).toBeNull();
			expect(root.querySelector('.confirmation .code').textContent).toEqual('<b>x</b>');
		});
	});
});
