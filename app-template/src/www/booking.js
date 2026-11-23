import { runSearch } from './search.js';

const CONFLICT = 409;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+\.[^\s@]+$/;

const errorStatus = (message) => ({ kind: 'error', message });
const messageOf = (error) => (error && error.message) || 'Something went wrong';

export function startBooking(store, roomTypeId) {
	store.setState({ booking: { roomTypeId }, confirmation: null, status: null });
}

export function cancelBooking(store) {
	store.setState({ booking: null, status: null });
}

export async function bookRoom(store, api, values) {
	const { booking, values: stay } = store.getState();
	if (!booking) return;
	const guestName = typeof values.guestName === 'string' ? values.guestName.trim() : '';
	const guestEmail = typeof values.guestEmail === 'string' ? values.guestEmail.trim() : '';
	if (guestName === '') {
		store.setState({ status: errorStatus('Enter the guest name') });
		return;
	}
	if (!EMAIL_PATTERN.test(guestEmail)) {
		store.setState({ status: errorStatus('Enter a valid guest email') });
		return;
	}
	try {
		const reservation = await api.send('POST', '/api/reservations', {
			roomTypeId: booking.roomTypeId,
			arrivalAt: stay.arrivalAt,
			departureAt: stay.departureAt,
			guests: Number(stay.guests),
			guestName,
			guestEmail
		});
		store.setState({ confirmation: reservation, booking: null, status: null });
	} catch (error) {
		if (error && error.status === CONFLICT) {
			store.setState({ booking: null });
			await runSearch(store, api, stay);
			store.setState({ status: errorStatus(messageOf(error)) });
			return;
		}
		store.setState({ status: errorStatus(messageOf(error)) });
	}
}
