import { describe, expect, test } from '@jest/globals';
import { freeRoomsOf } from '../../src/domain/free-rooms.js';

describe('freeRoomsOf', () => {
	const rooms = [
		{ number: 101, roomTypeId: 1 },
		{ number: 102, roomTypeId: 1 },
		{ number: 201, roomTypeId: 2 }
	];

	test('returns all rooms when no reservation overlaps', () => {
		const underTest = freeRoomsOf(rooms, []);

		expect(underTest).toEqual(rooms);
	});

	test('leaves out the rooms whose number a reservation holds', () => {
		const underTest = freeRoomsOf(rooms, [{ roomNumber: 102 }]);

		expect(underTest).toEqual([rooms[0], rooms[2]]);
	});

	test('returns no room when every room is held', () => {
		const held = rooms.map((room) => ({ roomNumber: room.number }));

		expect(freeRoomsOf(rooms, held)).toEqual([]);
	});

	test('counts a room once when two reservations hold it', () => {
		const underTest = freeRoomsOf(rooms, [{ roomNumber: 101 }, { roomNumber: 101 }]);

		expect(underTest).toEqual([rooms[1], rooms[2]]);
	});

	test('ignores reservations of unknown room numbers', () => {
		expect(freeRoomsOf(rooms, [{ roomNumber: 999 }])).toEqual(rooms);
	});
});
