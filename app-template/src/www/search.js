import { addDays, dayInputValue, stayInstants, todayStart } from './dates.js';

const MAX_GUESTS = 4;

const errorStatus = (message) => ({ kind: 'error', message });
const messageOf = (error) => (error && error.message) || 'Something went wrong';

export function createSearchState(clock, settings) {
	const { timeZone } = settings;
	const today = todayStart(clock, timeZone);
	const tomorrow = addDays(today, 1, timeZone);
	const { arrivalAt, departureAt } = stayInstants(
		{ arrivalDay: dayInputValue(today, timeZone), departureDay: dayInputValue(tomorrow, timeZone) },
		settings
	);
	return {
		values: { arrivalAt, departureAt, guests: '1' },
		settings,
		results: null,
		booking: null,
		confirmation: null,
		status: null
	};
}

const parseGuests = (value) => {
	const text = typeof value === 'number' ? String(value) : value;
	if (typeof text !== 'string' || !/^\d{1,3}$/.test(text.trim())) return null;
	return Number(text.trim());
};

export async function runSearch(store, api, values) {
	const { arrivalAt, departureAt } = values;
	const guests = parseGuests(values.guests);
	if (!Number.isInteger(arrivalAt)) {
		store.setState({ status: errorStatus('Choose a valid arrival day') });
		return;
	}
	if (!Number.isInteger(departureAt)) {
		store.setState({ status: errorStatus('Choose a valid departure day') });
		return;
	}
	if (guests === null || guests < 1 || guests > MAX_GUESTS) {
		store.setState({ status: errorStatus(`Guests must be a whole number from 1 to ${MAX_GUESTS}`) });
		return;
	}
	if (departureAt <= arrivalAt) {
		store.setState({ status: errorStatus('Departure must be after arrival') });
		return;
	}
	try {
		const results = await api.get('/api/availability', { arrivalAt, departureAt, guests });
		store.setState({
			values: { arrivalAt, departureAt, guests: String(values.guests).trim() },
			results,
			status: null
		});
	} catch (error) {
		store.setState({ status: errorStatus(messageOf(error)) });
	}
}
