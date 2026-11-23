import { addRoomType, changeBaseRate, removeRoomType } from '../room-type-commands.js';
import { formatCents } from '../money.js';

const element = (tag, attributes = {}, text) => {
	const node = document.createElement(tag);
	for (const [name, value] of Object.entries(attributes)) {
		node.setAttribute(name, value);
	}
	if (text !== undefined) node.textContent = text;
	return node;
};

const labelledInput = (label, name, attributes = {}) => {
	const wrapper = element('label', {}, label);
	const input = element('input', { name, required: '', ...attributes });
	wrapper.append(input);
	return wrapper;
};

const money = (cents, settings) => (settings ? formatCents(cents, { currency: settings.currency }) : '');

export function mountRoomTypesScreen(root, { store, api }) {
	const table = element('table', { class: 'room-types' });
	const head = element('thead');
	const headRow = element('tr');
	for (const title of ['Name', 'Maximum guests', 'Base rate', 'Extra-guest rate', 'Change base rate', '']) {
		headRow.append(element('th', {}, title));
	}
	head.append(headRow);
	const body = element('tbody');
	table.append(head, body);

	const form = element('form', { class: 'add-room-type' });
	form.append(
		labelledInput('Name', 'name', { type: 'text' }),
		labelledInput('Maximum guests', 'maxOccupancy', { type: 'number', min: '1', step: '1' }),
		labelledInput('Base rate', 'baseRate', { type: 'text', inputmode: 'decimal' }),
		labelledInput('Extra-guest rate', 'extraGuestRate', { type: 'text', inputmode: 'decimal' }),
		element('button', { type: 'submit' }, 'Add room type')
	);
	const status = element('p', { role: 'status' });

	root.replaceChildren(table, form, status);

	form.addEventListener('submit', async (event) => {
		event.preventDefault();
		const values = {};
		for (const name of ['name', 'maxOccupancy', 'baseRate', 'extraGuestRate']) {
			values[name] = form.elements[name].value;
		}
		await addRoomType(store, api, values);
		if (store.getState().status?.kind === 'success') form.reset();
	});

	const renderRow = (type, settings) => {
		const row = element('tr');
		row.append(
			element('td', {}, type.name),
			element('td', {}, String(type.maxOccupancy)),
			element('td', { class: 'money' }, money(type.baseRateCents, settings)),
			element('td', { class: 'money' }, money(type.extraGuestCents, settings))
		);

		const rateForm = element('form', { class: 'change-base-rate' });
		const rateInput = element('input', {
			name: 'baseRate',
			type: 'text',
			inputmode: 'decimal',
			required: '',
			'aria-label': `New base rate for ${type.name}`
		});
		rateForm.append(rateInput, element('button', { type: 'submit' }, 'Change'));
		rateForm.addEventListener('submit', async (event) => {
			event.preventDefault();
			await changeBaseRate(store, api, type.id, rateInput.value);
		});
		const rateCell = element('td');
		rateCell.append(rateForm);
		row.append(rateCell);

		const remove = element('button', { type: 'button', class: 'remove' }, 'Remove');
		remove.setAttribute('aria-label', `Remove ${type.name}`);
		remove.addEventListener('click', () => {
			removeRoomType(store, api, type.id);
		});
		const removeCell = element('td');
		removeCell.append(remove);
		row.append(removeCell);
		return row;
	};

	const render = (state) => {
		body.replaceChildren(...state.roomTypes.map((type) => renderRow(type, state.settings)));
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
