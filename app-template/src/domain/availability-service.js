import { freeRoomsOf } from './free-rooms.js';
import { pricePerNightCents, totalPriceCents } from './price.js';
import { validateStay } from './stay.js';

export const createAvailabilityService = function ({ roomTypes, rooms, reservations, clock, settings }) {
	return {
		search({ arrivalAt, departureAt, guests }) {
			const { timeZone } = settings.get();
			const stayLength = validateStay(
				{ arrivalAt, departureAt, guests },
				{ nowMs: clock.now(), timeZone }
			);
			const overlapping = reservations.findConfirmedOverlapping(arrivalAt, departureAt);
			const free = freeRoomsOf(rooms.list(), overlapping);

			return roomTypes
				.list()
				.filter((type) => type.maxOccupancy >= guests)
				.map((type) => ({
					roomTypeId: type.id,
					roomTypeName: type.name,
					freeRooms: free.filter((room) => room.roomTypeId === type.id).length,
					nights: stayLength.nights,
					pricePerNightCents: pricePerNightCents(type, guests),
					totalCents: totalPriceCents(type, guests, stayLength)
				}))
				.filter((item) => item.freeRooms > 0)
				.sort((a, b) => a.totalCents - b.totalCents || a.roomTypeName.localeCompare(b.roomTypeName));
		}
	};
};
