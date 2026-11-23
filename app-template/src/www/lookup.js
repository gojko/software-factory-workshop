import { todayStart } from './dates.js';

const errorStatus = (message) => ({ kind: 'error', message });
const messageOf = (error) => (error && error.message) || 'Something went wrong';

export function createLookupState(clock, settings) {
	return {
		query: '',
		from: todayStart(clock, settings.timeZone),
		settings,
		reservations: null,
		status: null
	};
}

export async function findReservations(store, api, text) {
	const query = typeof text === 'string' ? text.trim() : '';
	if (query === '') {
		store.setState({ status: errorStatus('Enter a reservation code or part of the guest name') });
		return;
	}
	try {
		const reservations = await api.get('/api/reservations', { query });
		store.setState({ query, reservations, status: null });
	} catch (error) {
		store.setState({ status: errorStatus(messageOf(error)) });
	}
}

export async function listReservations(store, api, fromAt) {
	if (!Number.isInteger(fromAt) || fromAt < 0) {
		store.setState({ status: errorStatus('Choose a valid day') });
		return;
	}
	try {
		const reservations = await api.get('/api/reservations', { from: fromAt });
		store.setState({ from: fromAt, reservations, status: null });
	} catch (error) {
		store.setState({ status: errorStatus(messageOf(error)) });
	}
}
