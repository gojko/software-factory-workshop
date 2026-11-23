import { removeRange, setRange } from '../room-commands.js';

const element = (tag, attributes = {}, text) => {
	const node = document.createElement(tag);
	for (const [name, value] of Object.entries(attributes)) {
		node.setAttribute(name, value);
	}
	if (text !== undefined) node.textContent = text;
	return node;
};

const labelled = (label, control) => {
	const wrapper = element('label', {}, label);
	wrapper.append(control);
	return wrapper;
};

export function mountRoomsScreen(root, { store, api }) {
	const table = element('table', { class: 'room-ranges' });
	const head = element('thead');
	const headRow = element('tr');
	for (const title of ['First room', 'Last room', 'Room type', '']) {
		headRow.append(element('th', {}, title));
	}
	head.append(headRow);
	const body = element('tbody');
	table.append(head, body);

	const form = element('form', { class: 'set-range' });
	const select = element('select', { name: 'roomTypeId', required: '' });
	form.append(
		labelled('First room', element('input', { name: 'first', type: 'number', min: '1', step: '1', required: '' })),
		labelled('Last room', element('input', { name: 'last', type: 'number', min: '1', step: '1', required: '' })),
		labelled('Room type', select),
		element('button', { type: 'submit' }, 'Set range')
	);
	const status = element('p', { role: 'status' });

	root.replaceChildren(table, form, status);

	form.addEventListener('submit', async (event) => {
		event.preventDefault();
		await setRange(store, api, {
			first: form.elements.first.value,
			last: form.elements.last.value,
			roomTypeId: form.elements.roomTypeId.value
		});
		if (store.getState().status?.kind === 'success') {
			form.elements.first.value = '';
			form.elements.last.value = '';
		}
	});

	const renderRow = (range) => {
		const row = element('tr');
		row.append(
			element('td', {}, String(range.first)),
			element('td', {}, String(range.last)),
			element('td', {}, range.roomTypeName)
		);
		const remove = element('button', { type: 'button', class: 'remove' }, 'Remove');
		remove.setAttribute('aria-label', `Remove rooms ${range.first} to ${range.last}`);
		remove.addEventListener('click', () => {
			removeRange(store, api, range);
		});
		const cell = element('td');
		cell.append(remove);
		row.append(cell);
		return row;
	};

	const render = (state) => {
		body.replaceChildren(...state.ranges.map(renderRow));
		const chosen = select.value;
		select.replaceChildren(
			...state.roomTypes.map((type) => element('option', { value: String(type.id) }, type.name))
		);
		if (chosen && state.roomTypes.some((type) => String(type.id) === chosen)) select.value = chosen;
		status.textContent = state.status ? state.status.message : '';
		if (state.status) {
			status.setAttribute('data-kind', state.status.kind);
		} else {
			status.removeAttribute('data-kind');
		}
	};

	render(store.getState());
	return store.subscribe(render);
}
