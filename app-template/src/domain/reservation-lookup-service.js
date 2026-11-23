import { requireInstant, requireText } from './validation.js';

const byArrivalThenRoom = (a, b) => a.arrivalAt - b.arrivalAt || a.roomNumber - b.roomNumber;

export const createReservationLookupService = function ({ reservations }) {
	return {
		find(query) {
			const text = requireText(query, 'Query');
			const byCode = reservations.findByCode(text.toUpperCase());
			const byName = reservations.searchByGuestName(text);
			const joined = new Map();
			for (const found of [...(byCode ? [byCode] : []), ...byName]) {
				joined.set(found.code, found);
			}
			return [...joined.values()].sort(byArrivalThenRoom);
		},

		listFrom(from) {
			return reservations.listFromArrival(requireInstant(from, 'From'));
		}
	};
};
