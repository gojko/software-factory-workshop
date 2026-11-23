import { parseAmountToCents } from './money.js';

const errorStatus = (message) => ({ kind: 'error', message });
const successStatus = (message) => ({ kind: 'success', message });

const messageOf = (error) => (error && error.message) || 'Something went wrong';

const parseWholeNumber = (text) => {
	if (typeof text !== 'string' || !/^\d{1,9}$/.test(text.trim())) return null;
	return Number(text.trim());
};

export async function loadRoomTypes(store, api) {
	try {
		const roomTypes = await api.get('/api/room-types');
		store.setState({ roomTypes });
	} catch (error) {
		store.setState({ status: errorStatus(messageOf(error)) });
	}
}

export async function addRoomType(store, api, values) {
	const maxOccupancy = parseWholeNumber(values.maxOccupancy);
	const baseRateCents = parseAmountToCents(values.baseRate);
	const extraGuestCents = parseAmountToCents(values.extraGuestRate);
	if (maxOccupancy === null) {
		store.setState({ status: errorStatus('Maximum guests must be a whole number') });
		return;
	}
	if (baseRateCents === null) {
		store.setState({ status: errorStatus('Base rate must be an amount, for example 120.50') });
		return;
	}
	if (extraGuestCents === null) {
		store.setState({ status: errorStatus('Extra-guest rate must be an amount, for example 15.00') });
		return;
	}
	try {
		await api.send('POST', '/api/room-types', {
			name: typeof values.name === 'string' ? values.name.trim() : values.name,
			maxOccupancy,
			baseRateCents,
			extraGuestCents
		});
		const roomTypes = await api.get('/api/room-types');
		store.setState({ roomTypes, status: successStatus('Room type added') });
	} catch (error) {
		store.setState({ status: errorStatus(messageOf(error)) });
	}
}

export async function changeBaseRate(store, api, id, text) {
	const baseRateCents = parseAmountToCents(text);
	if (baseRateCents === null) {
		store.setState({ status: errorStatus('Base rate must be an amount, for example 120.50') });
		return;
	}
	try {
		const updated = await api.send('PUT', `/api/room-types/${id}/base-rate`, { baseRateCents });
		store.setState((state) => ({
			roomTypes: state.roomTypes.map((type) => (type.id === id ? updated : type)),
			status: successStatus('Base rate changed')
		}));
	} catch (error) {
		store.setState({ status: errorStatus(messageOf(error)) });
	}
}

export async function removeRoomType(store, api, id) {
	try {
		await api.send('DELETE', `/api/room-types/${id}`);
		const [roomTypes, ranges] = await Promise.all([
			api.get('/api/room-types'),
			api.get('/api/room-ranges')
		]);
		store.setState({ roomTypes, ranges, status: successStatus('Room type removed') });
	} catch (error) {
		store.setState({ status: errorStatus(messageOf(error)) });
	}
}
