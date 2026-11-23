import { dayInputValue, formatInstant, instantOf } from '../dates.js';
import { findReservations, listReservations } from '../lookup.js';
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
	wrapper.append(element('input', { name, ...attributes }));
	return wrapper;
};

const COLUMNS = ['Code', 'Guest', 'Room', 'Room type', 'Arrival', 'Departure', 'Guests', 'Total'];

export function mountReservationsScreen(root, { store, api }) {
	const findForm = element('form', { class: 'find-form' });
	findForm.append(
		labelledInput('Code or guest name', 'query', { type: 'search', autocomplete: 'off' }),
		element('button', { type: 'submit' }, 'Search')
	);
	const listForm = element('form', { class: 'list-form' });
	listForm.append(
		labelledInput('Arriving from', 'day', { type: 'date', required: '' }),
		element('button', { type: 'submit' }, 'List')
	);
	const results = element('section', { class: 'results' });
	const status = element('p', { class: 'status', role: 'status' });
	root.replaceChildren(findForm, listForm, results, status);

	findForm.addEventListener('submit', async (event) => {
		event.preventDefault();
		await findReservations(store, api, findForm.elements.query.value);
	});

	listForm.addEventListener('submit', async (event) => {
		event.preventDefault();
		const { settings } = store.getState();
		await listReservations(store, api, instantOf(listForm.elements.day.value, 0, settings.timeZone));
	});

	const renderRow = (reservation, settings) => {
		const zone = { timeZone: settings.timeZone };
		const row = element('tr');
		const values = [
			reservation.code,
			reservation.guestName,
			String(reservation.roomNumber),
			reservation.roomTypeName,
			formatInstant(reservation.arrivalAt, zone),
			formatInstant(reservation.departureAt, zone),
			String(reservation.guests),
			formatCents(reservation.totalCents, { currency: settings.currency })
		];
		for (const value of values) {
			row.append(element('td', {}, value));
		}
		return row;
	};

	const renderResults = (state) => {
		if (state.reservations === null) {
			results.replaceChildren();
			return;
		}
		if (state.reservations.length === 0) {
			results.replaceChildren(element('p', { class: 'empty' }, 'No reservation was found.'));
			return;
		}
		const table = element('table');
		const head = element('thead');
		const headRow = element('tr');
		for (const title of COLUMNS) {
			headRow.append(element('th', {}, title));
		}
		head.append(headRow);
		const body = element('tbody');
		body.append(...state.reservations.map((reservation) => renderRow(reservation, state.settings)));
		table.append(head, body);
		results.replaceChildren(table);
	};

	const render = (state) => {
		const day = dayInputValue(state.from, state.settings.timeZone);
		if (listForm.elements.day.getAttribute('data-from') !== String(state.from)) {
			listForm.elements.day.value = day;
			listForm.elements.day.setAttribute('data-from', String(state.from));
		}
		renderResults(state);
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
