import { beforeEach, describe, expect, test, jest } from '@jest/globals';
import { randomUUID } from 'node:crypto';
import { createStore } from '../../src/www/store.js';
import { mountRoomTypesScreen } from '../../src/www/screens/room-types-screen.js';

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const roomType = (overrides = {}) => ({
	id: 1,
	name: randomUUID(),
	maxOccupancy: 2,
	baseRateCents: 10000,
	extraGuestCents: 2500,
	...overrides
});

describe('mountRoomTypesScreen', () => {
	let root;
	let store;
	let api;

	beforeEach(() => {
		document.body.innerHTML = '<section id="root"></section>';
		root = document.getElementById('root');
		store = createStore({
			roomTypes: [],
			ranges: [],
			settings: { currency: 'EUR' },
			status: null
		});
		api = { get: jest.fn(), send: jest.fn() };
		mountRoomTypesScreen(root, { store, api });
	});

	const rows = () => [...root.querySelectorAll('tbody tr')];
	const cells = (row) => [...row.querySelectorAll('td')].slice(0, 4).map((td) => td.textContent);

	const fillAddForm = (values) => {
		const form = root.querySelector('form.add-room-type');
		for (const [name, value] of Object.entries(values)) {
			form.elements[name].value = value;
		}
		return form;
	};

	test('shows a row with name, guests and formatted money for each room type in the state', () => {
		store.setState({
			roomTypes: [
				roomType({ id: 1, name: 'Single', maxOccupancy: 1, baseRateCents: 8000, extraGuestCents: 0 }),
				roomType({ id: 2, name: 'Double', maxOccupancy: 3, baseRateCents: 12050, extraGuestCents: 1500 })
			]
		});

		expect(rows().map(cells)).toEqual([
			['Single', '1', formatEur(8000), formatEur(0)],
			['Double', '3', formatEur(12050), formatEur(1500)]
		]);
	});

	test('leaves the money cells empty when the settings are not loaded', () => {
		store.setState({ settings: null, roomTypes: [roomType({ name: 'Single' })] });

		const [row] = rows();
		expect(cells(row)).toEqual(['Single', '2', '', '']);
	});

	test('removes a row when the room type leaves the state', () => {
		store.setState({ roomTypes: [roomType({ id: 1 }), roomType({ id: 2 })] });
		store.setState({ roomTypes: [roomType({ id: 2 })] });

		expect(rows().length).toEqual(1);
	});

	test('calls the API with whole cents when the add form is submitted', async () => {
		api.send.mockResolvedValue({});
		api.get.mockResolvedValue([]);
		const form = fillAddForm({
			name: 'Suite',
			maxOccupancy: '4',
			baseRate: '120.50',
			extraGuestRate: '15'
		});

		form.requestSubmit();
		await flush();

		expect(api.send).toHaveBeenCalledWith('POST', '/api/room-types', {
			name: 'Suite',
			maxOccupancy: 4,
			baseRateCents: 12050,
			extraGuestCents: 1500
		});
	});

	test('clears the add form when the room type was added', async () => {
		api.send.mockResolvedValue({});
		api.get.mockResolvedValue([]);
		const form = fillAddForm({ name: 'Suite', maxOccupancy: '4', baseRate: '1', extraGuestRate: '1' });

		form.requestSubmit();
		await flush();

		expect(form.elements.name.value).toEqual('');
	});

	test('keeps the typed values when the API refuses the add form', async () => {
		api.send.mockRejectedValue(new Error('refused'));
		const form = fillAddForm({ name: 'Suite', maxOccupancy: '4', baseRate: '1', extraGuestRate: '1' });

		form.requestSubmit();
		await flush();

		expect(form.elements.name.value).toEqual('Suite');
	});

	test('calls the API with whole cents when the base rate control is submitted', async () => {
		store.setState({ roomTypes: [roomType({ id: 5 })] });
		api.send.mockResolvedValue(roomType({ id: 5, baseRateCents: 9950 }));
		const rateForm = root.querySelector('form.change-base-rate');
		rateForm.elements.baseRate.value = '99.50';

		rateForm.requestSubmit();
		await flush();

		expect(api.send).toHaveBeenCalledWith('PUT', '/api/room-types/5/base-rate', { baseRateCents: 9950 });
	});

	test('calls the API to remove the room type when its remove button is clicked', async () => {
		store.setState({ roomTypes: [roomType({ id: 5 })] });
		api.send.mockResolvedValue(null);
		api.get.mockResolvedValue([]);

		root.querySelector('button.remove').click();
		await flush();

		expect(api.send).toHaveBeenCalledWith('DELETE', '/api/room-types/5');
	});

	test('shows the text of an error status in the status region', () => {
		store.setState({ status: { kind: 'error', message: 'a room type named "Suite" exists already' } });

		expect(root.querySelector('[role="status"]').textContent).toEqual(
			'a room type named "Suite" exists already'
		);
	});

	test('clears the status region when the status is null', () => {
		store.setState({ status: { kind: 'error', message: 'x' } });
		store.setState({ status: null });

		expect(root.querySelector('[role="status"]').textContent).toEqual('');
	});

	test('shows a room type name with markup as text and creates no element when rendered', () => {
		store.setState({ roomTypes: [roomType({ name: '<b>x</b>' })] });

		const [row] = rows();
		expect(row.querySelector('td').textContent).toEqual('<b>x</b>');
		expect(root.querySelector('b')).toBeNull();
	});
});

function formatEur(cents) {
	return new Intl.NumberFormat(undefined, {
		style: 'currency',
		currency: 'EUR',
		minimumFractionDigits: 2
	}).format(cents / 100);
}
