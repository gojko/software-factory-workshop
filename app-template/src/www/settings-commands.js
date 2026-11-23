import { timeInputToMinutes } from './dates.js';

const errorStatus = (message) => ({ kind: 'error', message });
const successStatus = (message) => ({ kind: 'success', message });

const messageOf = (error) => (error && error.message) || 'Something went wrong';

export function createRoomsState() {
	return { roomTypes: [], ranges: [], settings: null, status: null, settingsStatus: null };
}

export async function loadSettings(store, api) {
	try {
		const settings = await api.get('/api/settings');
		store.setState({ settings });
	} catch (error) {
		store.setState({ settingsStatus: errorStatus(messageOf(error)) });
	}
}

export async function saveSettings(store, api, values) {
	const checkInMinutes = timeInputToMinutes(values.checkIn);
	const checkOutMinutes = timeInputToMinutes(values.checkOut);
	if (checkInMinutes === null) {
		store.setState({ settingsStatus: errorStatus('Check-in time must be a time like 15:00') });
		return;
	}
	if (checkOutMinutes === null) {
		store.setState({ settingsStatus: errorStatus('Check-out time must be a time like 11:00') });
		return;
	}
	const trim = (text) => (typeof text === 'string' ? text.trim() : text);
	try {
		const settings = await api.send('PUT', '/api/settings', {
			timeZone: trim(values.timeZone),
			checkInMinutes,
			checkOutMinutes,
			currency: trim(values.currency)
		});
		store.setState({ settings, settingsStatus: successStatus('Settings saved') });
	} catch (error) {
		store.setState({ settingsStatus: errorStatus(messageOf(error)) });
	}
}
