import { afterEach, beforeEach, describe, expect, test } from '@jest/globals';
import { openDatabase } from '../../src/db/open-database.js';
import { createRoomRepository } from '../../src/db/room-repository.js';
import { createRoomTypeRepository } from '../../src/db/room-type-repository.js';
import { seedTestData } from '../../src/db/seed.js';

describe('seedTestData', () => {
	let database;
	let roomTypes;
	let rooms;

	beforeEach(() => {
		database = openDatabase(':memory:');
		roomTypes = createRoomTypeRepository(database);
		rooms = createRoomRepository(database);
		seedTestData(database);
	});

	afterEach(() => {
		database.close();
	});

	test('stores three room types with their guests and rates when called', () => {
		expect(
			roomTypes.list().map(({ name, maxOccupancy, baseRateCents, extraGuestCents }) => ({
				name,
				maxOccupancy,
				baseRateCents,
				extraGuestCents
			}))
		).toEqual([
			{ name: 'Double', maxOccupancy: 2, baseRateCents: 11000, extraGuestCents: 2500 },
			{ name: 'Single', maxOccupancy: 1, baseRateCents: 8000, extraGuestCents: 0 },
			{ name: 'Suite', maxOccupancy: 4, baseRateCents: 22000, extraGuestCents: 3000 }
		]);
	});

	test('stores 20 rooms with different numbers when called', () => {
		const numbers = rooms.list().map((room) => room.number);

		expect(numbers).toHaveLength(20);
		expect(new Set(numbers).size).toEqual(20);
	});

	test('gives every room type at least one room when called', () => {
		const usedTypeIds = new Set(rooms.list().map((room) => room.roomTypeId));

		expect(roomTypes.list().every((type) => usedTypeIds.has(type.id))).toEqual(true);
	});

	test('assigns room numbers to the types by floor when called', () => {
		const typeOf = (number) =>
			roomTypes.findById(rooms.list().find((room) => room.number === number).roomTypeId).name;

		expect([typeOf(101), typeOf(108), typeOf(201), typeOf(209), typeOf(301), typeOf(303)]).toEqual([
			'Single',
			'Single',
			'Double',
			'Double',
			'Suite',
			'Suite'
		]);
	});

	test('stores no reservation when called', () => {
		const { total } = database.prepare('SELECT COUNT(*) AS total FROM reservations').get();

		expect(total).toEqual(0);
	});
});
