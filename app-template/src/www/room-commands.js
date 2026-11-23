const errorStatus = (message) => ({ kind: 'error', message });
const successStatus = (message) => ({ kind: 'success', message });

const messageOf = (error) => (error && error.message) || 'Something went wrong';

const parseWholeNumber = (text) => {
	if (typeof text !== 'string' || !/^\d{1,9}$/.test(text.trim())) return null;
	return Number(text.trim());
};

export async function loadRanges(store, api) {
	try {
		const ranges = await api.get('/api/room-ranges');
		store.setState({ ranges });
	} catch (error) {
		store.setState({ status: errorStatus(messageOf(error)) });
	}
}

export async function setRange(store, api, values) {
	const first = parseWholeNumber(values.first);
	const last = parseWholeNumber(values.last);
	const roomTypeId = parseWholeNumber(values.roomTypeId);
	if (first === null) {
		store.setState({ status: errorStatus('First room must be a whole number') });
		return;
	}
	if (last === null) {
		store.setState({ status: errorStatus('Last room must be a whole number') });
		return;
	}
	if (roomTypeId === null) {
		store.setState({ status: errorStatus('Choose a room type') });
		return;
	}
	if (first > last) {
		store.setState({ status: errorStatus('First room must not be larger than the last room') });
		return;
	}
	try {
		await api.send('PUT', '/api/room-ranges', { first, last, roomTypeId });
		const ranges = await api.get('/api/room-ranges');
		store.setState({ ranges, status: successStatus('Range set') });
	} catch (error) {
		store.setState({ status: errorStatus(messageOf(error)) });
	}
}

export async function removeRange(store, api, range) {
	try {
		await api.send('DELETE', `/api/room-ranges?first=${range.first}&last=${range.last}`);
		const ranges = await api.get('/api/room-ranges');
		store.setState({ ranges, status: successStatus('Range removed') });
	} catch (error) {
		store.setState({ status: errorStatus(messageOf(error)) });
	}
}
