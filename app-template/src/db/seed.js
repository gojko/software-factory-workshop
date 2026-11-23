import { createRoomRepository } from './room-repository.js';
import { createRoomTypeRepository } from './room-type-repository.js';

const ROOM_TYPES = [
	{ name: 'Single', maxOccupancy: 1, baseRateCents: 8000, extraGuestCents: 0, first: 101, last: 108 },
	{ name: 'Double', maxOccupancy: 2, baseRateCents: 11000, extraGuestCents: 2500, first: 201, last: 209 },
	{ name: 'Suite', maxOccupancy: 4, baseRateCents: 22000, extraGuestCents: 3000, first: 301, last: 303 }
];

export const seedTestData = function (database) {
	const roomTypes = createRoomTypeRepository(database);
	const rooms = createRoomRepository(database);
	for (const { first, last, ...fields } of ROOM_TYPES) {
		const roomType = roomTypes.insert(fields);
		for (let number = first; number <= last; number += 1) {
			rooms.upsert(number, roomType.id);
		}
	}
};
