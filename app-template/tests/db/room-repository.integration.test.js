import { afterEach, beforeEach, describe, expect, test } from '@jest/globals';
import { openDatabase } from '../../src/db/open-database.js';
import { createRoomRepository } from '../../src/db/room-repository.js';

describe('createRoomRepository', () => {
	let database;
	let underTest;
	let singleId;
	let doubleId;

	const insertType = (name) =>
		Number(
			database
				.prepare(
					'INSERT INTO room_types (name, max_occupancy, base_rate_cents, extra_guest_cents) VALUES (?, 2, 10000, 0)'
				)
				.run(name).lastInsertRowid
		);

	beforeEach(() => {
		database = openDatabase(':memory:');
		underTest = createRoomRepository(database);
		singleId = insertType('Single');
		doubleId = insertType('Double');
	});

	afterEach(() => {
		database.close();
	});

	test('returns the stored room when upsert creates a room', () => {
		underTest.upsert(101, singleId);

		expect(underTest.list()).toEqual([{ number: 101, roomTypeId: singleId }]);
	});

	test('changes the room type when upsert is called for an existing number', () => {
		underTest.upsert(101, singleId);
		underTest.upsert(101, doubleId);

		expect(underTest.list()).toEqual([{ number: 101, roomTypeId: doubleId }]);
	});

	test('returns rooms ordered by number when list is called', () => {
		underTest.upsert(300, singleId);
		underTest.upsert(5, singleId);
		underTest.upsert(20, doubleId);

		expect(underTest.list().map((room) => room.number)).toEqual([5, 20, 300]);
	});

	test('returns rooms including both ends when findInRange is called', () => {
		[1, 2, 3, 4, 5].forEach((number) => underTest.upsert(number, singleId));

		expect(underTest.findInRange(2, 4).map((room) => room.number)).toEqual([2, 3, 4]);
	});

	test('returns an empty array when findInRange finds no room', () => {
		underTest.upsert(1, singleId);

		expect(underTest.findInRange(10, 20)).toEqual([]);
	});

	test('removes only rooms in the range when removeInRange is called', () => {
		[1, 2, 3, 4, 5].forEach((number) => underTest.upsert(number, singleId));

		underTest.removeInRange(2, 4);

		expect(underTest.list().map((room) => room.number)).toEqual([1, 5]);
	});

	test('removes every room of the type when removeByRoomType is called', () => {
		underTest.upsert(1, singleId);
		underTest.upsert(2, doubleId);
		underTest.upsert(3, singleId);

		underTest.removeByRoomType(singleId);

		expect(underTest.list()).toEqual([{ number: 2, roomTypeId: doubleId }]);
	});

	test('returns the number of rooms when count is called', () => {
		expect(underTest.count()).toEqual(0);

		underTest.upsert(1, singleId);
		underTest.upsert(2, doubleId);

		expect(underTest.count()).toEqual(2);
	});
});
