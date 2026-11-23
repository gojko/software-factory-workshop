import { beforeEach, describe, expect, test, jest } from '@jest/globals';
import { createStore } from '../../src/www/store.js';
import { mountRoomsScreen } from '../../src/www/screens/rooms-screen.js';

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('mountRoomsScreen', () => {
	let root;
	let store;
	let api;

	beforeEach(() => {
		document.body.innerHTML = '<section id="root"></section>';
		root = document.getElementById('root');
		store = createStore({
			roomTypes: [
				{ id: 1, name: 'Single' },
				{ id: 2, name: 'Double' }
			],
			ranges: [],
			status: null
		});
		api = { get: jest.fn(), send: jest.fn() };
		mountRoomsScreen(root, { store, api });
	});

	const rows = () => [...root.querySelectorAll('tbody tr')];
	const cells = (row) => [...row.querySelectorAll('td')].slice(0, 3).map((td) => td.textContent);

	test('shows a row with first, last and room type name for each range in the state', () => {
		store.setState({
			ranges: [
				{ first: 101, last: 122, roomTypeId: 1, roomTypeName: 'Single' },
				{ first: 150, last: 150, roomTypeId: 2, roomTypeName: 'Double' }
			]
		});

		expect(rows().map(cells)).toEqual([
			['101', '122', 'Single'],
			['150', '150', 'Double']
		]);
	});

	test('removes a row when the range leaves the state', () => {
		store.setState({
			ranges: [
				{ first: 1, last: 2, roomTypeId: 1, roomTypeName: 'Single' },
				{ first: 5, last: 6, roomTypeId: 1, roomTypeName: 'Single' }
			]
		});
		store.setState({ ranges: [{ first: 5, last: 6, roomTypeId: 1, roomTypeName: 'Single' }] });

		expect(rows().length).toEqual(1);
	});

	test('offers the room types of the state as options of the form', () => {
		const options = [...root.querySelectorAll('form.set-range select option')];

		expect(options.map((option) => [option.value, option.textContent])).toEqual([
			['1', 'Single'],
			['2', 'Double']
		]);
	});

	test('updates the options when the room types change', () => {
		store.setState({ roomTypes: [{ id: 9, name: 'Suite' }] });

		const options = [...root.querySelectorAll('form.set-range select option')];
		expect(options.map((option) => option.textContent)).toEqual(['Suite']);
	});

	test('calls the API with whole numbers when the form is submitted', async () => {
		api.send.mockResolvedValue({});
		api.get.mockResolvedValue([]);
		const form = root.querySelector('form.set-range');
		form.elements.first.value = '101';
		form.elements.last.value = '122';
		form.elements.roomTypeId.value = '2';

		form.requestSubmit();
		await flush();

		expect(api.send).toHaveBeenCalledWith('PUT', '/api/room-ranges', {
			first: 101,
			last: 122,
			roomTypeId: 2
		});
	});

	test('keeps the typed values when the API refuses the form', async () => {
		api.send.mockRejectedValue(new Error('refused'));
		const form = root.querySelector('form.set-range');
		form.elements.first.value = '101';
		form.elements.last.value = '122';

		form.requestSubmit();
		await flush();

		expect(form.elements.first.value).toEqual('101');
	});

	test('clears the form when the range was set', async () => {
		api.send.mockResolvedValue({});
		api.get.mockResolvedValue([]);
		const form = root.querySelector('form.set-range');
		form.elements.first.value = '101';
		form.elements.last.value = '122';

		form.requestSubmit();
		await flush();

		expect(form.elements.first.value).toEqual('');
	});

	test('calls the API to remove the range when its remove button is clicked', async () => {
		store.setState({ ranges: [{ first: 101, last: 105, roomTypeId: 1, roomTypeName: 'Single' }] });
		api.send.mockResolvedValue(null);
		api.get.mockResolvedValue([]);

		root.querySelector('button.remove').click();
		await flush();

		expect(api.send).toHaveBeenCalledWith('DELETE', '/api/room-ranges?first=101&last=105');
	});

	test('shows a conflict message as text in the status region', async () => {
		const message = 'room 105 has reservation <b>ABC123</b>';
		api.send.mockRejectedValue(new Error(message));
		const form = root.querySelector('form.set-range');
		form.elements.first.value = '101';
		form.elements.last.value = '122';

		form.requestSubmit();
		await flush();

		const status = root.querySelector('[role="status"]');
		expect(status.textContent).toEqual(message);
		expect(status.querySelector('b')).toBeNull();
	});

	test('clears the status region when the status is null', () => {
		store.setState({ status: { kind: 'error', message: 'x' } });
		store.setState({ status: null });

		expect(root.querySelector('[role="status"]').textContent).toEqual('');
	});
});
