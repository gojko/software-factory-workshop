import { bookRoom, cancelBooking, startBooking } from '../booking.js';
import { addDays, dayInputValue, formatInstant, stayInstants } from '../dates.js';
import { formatCents } from '../money.js';
import { runSearch } from '../search.js';

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

export function mountSearchScreen(root, { store, api, clock }) {
	const form = element('form', { class: 'search-form' });
	form.append(
		labelledInput('Arrival', 'arrivalDay', { type: 'date' }),
		labelledInput('Departure', 'departureDay', { type: 'date' }),
		labelledInput('Guests', 'guests', { type: 'number', min: '1', max: '4', step: '1' }),
		element('button', { type: 'submit' }, 'Search')
	);
	const results = element('section', { class: 'results' });
	const bookingArea = element('section', { class: 'booking' });
	const confirmationArea = element('section', { class: 'confirmation-area' });
	const status = element('p', { class: 'status', role: 'status' });
	const dialogStatus = element('p', { class: 'dialog-status', role: 'status' });
	root.replaceChildren(form, results, bookingArea, confirmationArea, status);

	form.addEventListener('submit', async (event) => {
		event.preventDefault();
		const { settings } = store.getState();
		const days = stayInstants(
			{ arrivalDay: form.elements.arrivalDay.value, departureDay: form.elements.departureDay.value },
			settings
		);
		await runSearch(store, api, {
			arrivalAt: days ? days.arrivalAt : null,
			departureAt: days ? days.departureAt : null,
			guests: form.elements.guests.value
		});
	});

	const renderResults = (state) => {
		if (state.results === null) {
			results.replaceChildren();
			return;
		}
		const { settings } = state;
		const zone = { timeZone: settings.timeZone };
		const stay = element(
			'p',
			{ class: 'stay' },
			`${formatInstant(state.values.arrivalAt, zone)} to ${formatInstant(state.values.departureAt, zone)}`
		);
		if (state.results.length === 0) {
			results.replaceChildren(stay, element('p', { class: 'empty' }, 'No room type is available for this stay.'));
			return;
		}
		const table = element('table');
		const headRow = element('tr');
		for (const title of ['Room type', 'Free rooms', 'Nights', 'Price per night', 'Total price', '']) {
			headRow.append(element('th', {}, title));
		}
		const head = element('thead');
		head.append(headRow);
		const body = element('tbody');
		for (const item of state.results) {
			const row = element('tr');
			const bookButton = element('button', { type: 'button', class: 'book' }, 'Book');
			bookButton.addEventListener('click', () => startBooking(store, item.roomTypeId));
			const action = element('td');
			action.append(bookButton);
			row.append(
				element('td', {}, item.roomTypeName),
				element('td', {}, String(item.freeRooms)),
				element('td', {}, String(item.nights)),
				element('td', { class: 'money' }, formatCents(item.pricePerNightCents, { currency: settings.currency })),
				element('td', { class: 'money' }, formatCents(item.totalCents, { currency: settings.currency })),
				action
			);
			body.append(row);
		}
		table.append(head, body);
		results.replaceChildren(stay, table);
	};

	let shownBooking = null;
	const renderBooking = (state) => {
		if (state.booking === shownBooking) return;
		shownBooking = state.booking;
		if (!state.booking) {
			bookingArea.replaceChildren();
			return;
		}
		const chosen = (state.results ?? []).find((item) => item.roomTypeId === state.booking.roomTypeId);
		const dialog = element('dialog', { class: 'booking-dialog' });
		dialog.addEventListener('close', () => {
			if (store.getState().booking) cancelBooking(store);
		});
		const bookingForm = element('form', { class: 'booking-form' });
		const cancel = element('button', { type: 'button', class: 'cancel' }, 'Cancel');
		cancel.addEventListener('click', () => cancelBooking(store));
		const actions = element('div', { class: 'dialog-actions' });
		actions.append(cancel, element('button', { type: 'submit' }, 'Confirm booking'));
		bookingForm.append(
			element('h2', {}, chosen ? `Book ${chosen.roomTypeName}` : 'Book room'),
			labelledInput('Guest name', 'guestName', { type: 'text', maxlength: '100' }),
			labelledInput('Guest email', 'guestEmail', { type: 'email', maxlength: '254' }),
			actions
		);
		bookingForm.addEventListener('submit', async (event) => {
			event.preventDefault();
			await bookRoom(store, api, {
				guestName: bookingForm.elements.guestName.value,
				guestEmail: bookingForm.elements.guestEmail.value
			});
		});
		dialog.append(bookingForm, dialogStatus);
		bookingArea.replaceChildren(dialog);
		dialog.showModal();
	};

	let shownConfirmation = null;
	const renderConfirmation = (state) => {
		if (state.confirmation === shownConfirmation) return;
		shownConfirmation = state.confirmation;
		const reservation = state.confirmation;
		if (!reservation) {
			confirmationArea.replaceChildren();
			return;
		}
		const zone = { timeZone: state.settings.timeZone };
		const box = element('section', { class: 'confirmation' });
		const list = element('dl');
		const facts = [
			['Confirmation code', reservation.code, 'code'],
			['Room number', String(reservation.roomNumber), 'room-number'],
			['Room type', reservation.roomTypeName, 'room-type'],
			['Arrival', formatInstant(reservation.arrivalAt, zone), 'arrival'],
			['Departure', formatInstant(reservation.departureAt, zone), 'departure'],
			['Guests', String(reservation.guests), 'guests'],
			['Total price', formatCents(reservation.totalCents, { currency: state.settings.currency }), 'total']
		];
		for (const [title, value, name] of facts) {
			list.append(element('dt', {}, title), element('dd', { class: name }, value));
		}
		box.append(element('h2', {}, 'Booking confirmed'), list);
		confirmationArea.replaceChildren(box);
	};

	let shownValues = null;
	const renderForm = (state) => {
		const { timeZone } = state.settings;
		form.elements.arrivalDay.setAttribute('min', dayInputValue(clock.now(), timeZone));
		form.elements.departureDay.setAttribute(
			'min',
			dayInputValue(addDays(state.values.arrivalAt, 1, timeZone), timeZone)
		);
		if (state.values !== shownValues) {
			shownValues = state.values;
			form.elements.arrivalDay.value = dayInputValue(state.values.arrivalAt, timeZone);
			form.elements.departureDay.value = dayInputValue(state.values.departureAt, timeZone);
			form.elements.guests.value = state.values.guests;
		}
	};

	const render = (state) => {
		renderForm(state);
		renderResults(state);
		renderBooking(state);
		renderConfirmation(state);
		const message = state.status ? state.status.message : '';
		status.textContent = message;
		dialogStatus.textContent = message;
		for (const line of [status, dialogStatus]) {
			if (state.status) {
				line.setAttribute('data-kind', state.status.kind);
			} else {
				line.removeAttribute('data-kind');
			}
		}
	};

	render(store.getState());
	return store.subscribe(render);
}
