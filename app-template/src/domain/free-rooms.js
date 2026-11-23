export function freeRoomsOf(rooms, overlappingReservations) {
	const held = new Set(overlappingReservations.map((reservation) => reservation.roomNumber));
	return rooms.filter((room) => !held.has(room.number));
}
