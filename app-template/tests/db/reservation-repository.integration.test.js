import { randomUUID } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, test } from '@jest/globals';
import { openDatabase } from '../../src/db/open-database.js';
import { createReservationRepository } from '../../src/db/reservation-repository.js';

const DAY = 86400000;

describe('createReservationRepository', () => {
	let database;
	let underTest;
	let doubleTypeId;
	let suiteTypeId;

	const addRoomType = (name) =>
		Number(
			database
				.prepare(
					'INSERT INTO room_types (name, max_occupancy, base_rate_cents, extra_guest_cents) VALUES (?, 2, 10000, 2000)'
				)
				.run(name).lastInsertRowid
		);
	const addRoom = (number, roomTypeId) =>
		database.prepare('INSERT INTO rooms (number, room_type_id) VALUES (?, ?)').run(number, roomTypeId);
	const fieldsFor = (overrides) => ({
		code: randomUUID(),
		roomNumber: 101,
		roomTypeId: doubleTypeId,
		arrivalAt: 10 * DAY,
		departureAt: 12 * DAY,
		nights: 2,
		guests: 2,
		guestName: 'Ada Lovelace',
		guestEmail: 'ada@example.com',
		status: 'Confirmed',
		totalCents: 20000,
		...overrides
	});

	beforeEach(() => {
		database = openDatabase(':memory:');
		doubleTypeId = addRoomType('Double');
		suiteTypeId = addRoomType('Suite');
		addRoom(101, doubleTypeId);
		addRoom(102, doubleTypeId);
		addRoom(103, doubleTypeId);
		addRoom(201, suiteTypeId);
		underTest = createReservationRepository(database);
	});

	afterEach(() => {
		database.close();
	});

	describe('insert', () => {
		test('returns the stored reservation with its room type name', () => {
			const fields = fieldsFor({});

			expect(underTest.insert(fields)).toEqual({ ...fields, roomTypeName: 'Double' });
		});

		test('throws error when the code is already stored', () => {
			const code = randomUUID();
			underTest.insert(fieldsFor({ code }));

			expect(() => underTest.insert(fieldsFor({ code, roomNumber: 102 }))).toThrow(/UNIQUE/);
		});
	});

	describe('existsForRoomType', () => {
		test('returns true only for the room type that has a reservation', () => {
			underTest.insert(fieldsFor({}));

			expect(underTest.existsForRoomType(doubleTypeId)).toEqual(true);
			expect(underTest.existsForRoomType(suiteTypeId)).toEqual(false);
		});
	});

	describe('findConfirmedOverlapping', () => {
		const HOUR = 3600000;
		let stay;

		beforeEach(() => {
			stay = fieldsFor({ arrivalAt: 10 * DAY + 15 * HOUR, departureAt: 12 * DAY + 11 * HOUR });
			underTest.insert(stay);
		});

		test('returns an empty array when the search arrives at the departure instant', () => {
			expect(underTest.findConfirmedOverlapping(12 * DAY + 15 * HOUR, 14 * DAY)).toEqual([]);
		});

		test('returns an empty array when the search departs at the arrival instant', () => {
			expect(underTest.findConfirmedOverlapping(8 * DAY, 10 * DAY + 11 * HOUR)).toEqual([]);
		});

		test('returns the reservation when the search overlaps its end', () => {
			const result = underTest.findConfirmedOverlapping(11 * DAY, 13 * DAY);

			expect(result.map((reservation) => reservation.code)).toEqual([stay.code]);
		});

		test('returns the reservation when the search lies inside the stay', () => {
			const result = underTest.findConfirmedOverlapping(11 * DAY, 11 * DAY + 2 * HOUR);

			expect(result.map((reservation) => reservation.code)).toEqual([stay.code]);
		});

		test('returns the reservation when the search covers the stay', () => {
			const result = underTest.findConfirmedOverlapping(9 * DAY, 14 * DAY);

			expect(result.map((reservation) => reservation.code)).toEqual([stay.code]);
		});

		test('returns the reservation when the search arrives early on the departure day', () => {
			const result = underTest.findConfirmedOverlapping(12 * DAY + 10 * HOUR, 14 * DAY);

			expect(result.map((reservation) => reservation.code)).toEqual([stay.code]);
		});

		test('returns the reservation when it departs late and the search arrives at 15:00 that day', () => {
			const late = fieldsFor({
				roomNumber: 102,
				arrivalAt: 10 * DAY + 15 * HOUR,
				departureAt: 12 * DAY + 16 * HOUR
			});
			underTest.insert(late);

			const result = underTest.findConfirmedOverlapping(12 * DAY + 15 * HOUR, 14 * DAY);

			expect(result.map((reservation) => reservation.code)).toEqual([late.code]);
		});

		test('does not return a reservation with another status than Confirmed', () => {
			const cancelled = fieldsFor({
				roomNumber: 102,
				status: 'Cancelled',
				arrivalAt: 10 * DAY + 15 * HOUR,
				departureAt: 12 * DAY + 11 * HOUR
			});
			underTest.insert(cancelled);

			const result = underTest.findConfirmedOverlapping(11 * DAY, 13 * DAY);

			expect(result.map((reservation) => reservation.code)).toEqual([stay.code]);
		});

		test('orders the result by arrival, then room number', () => {
			const earlier = fieldsFor({ roomNumber: 103, arrivalAt: 9 * DAY, departureAt: 11 * DAY });
			const sameArrival = fieldsFor({
				roomNumber: 102,
				arrivalAt: stay.arrivalAt,
				departureAt: stay.departureAt
			});
			underTest.insert(sameArrival);
			underTest.insert(earlier);

			const result = underTest.findConfirmedOverlapping(9 * DAY, 14 * DAY);

			expect(result.map((reservation) => reservation.code)).toEqual([
				earlier.code,
				stay.code,
				sameArrival.code
			]);
		});
	});

	describe('codeExists', () => {
		test('returns true only for a stored code', () => {
			const fields = fieldsFor({});
			underTest.insert(fields);

			expect(underTest.codeExists(fields.code)).toEqual(true);
			expect(underTest.codeExists(randomUUID())).toEqual(false);
		});
	});

	describe('findByCode', () => {
		test('returns the reservation with its room type name when the code matches exactly', () => {
			const fields = fieldsFor({});
			underTest.insert(fields);
			underTest.insert(fieldsFor({ roomNumber: 102 }));

			expect(underTest.findByCode(fields.code)).toEqual({ ...fields, roomTypeName: 'Double' });
		});

		test('returns undefined when only a part of a code is given', () => {
			const fields = fieldsFor({});
			underTest.insert(fields);

			expect(underTest.findByCode(fields.code.slice(0, 8))).toEqual(undefined);
		});

		test('returns undefined when the code is unknown', () => {
			expect(underTest.findByCode(randomUUID())).toEqual(undefined);
		});
	});

	describe('searchByGuestName', () => {
		const addGuest = (guestName, roomNumber) => {
			const fields = fieldsFor({ guestName, roomNumber });
			underTest.insert(fields);
			return fields;
		};

		test('returns the names that contain the text, not case-sensitive', () => {
			const meier = addGuest('Anna Meier', 101);
			const lang = addGuest('Meinhard Lang', 102);
			addGuest('Ada Lovelace', 103);

			const result = underTest.searchByGuestName('mei');

			expect(result.map((reservation) => reservation.code)).toEqual([meier.code, lang.code]);
		});

		test('finds the text in the middle of a guest name', () => {
			const meier = addGuest('Anna Meier', 101);

			const result = underTest.searchByGuestName('NA ME');

			expect(result.map((reservation) => reservation.code)).toEqual([meier.code]);
		});

		test('matches a percent sign as plain text', () => {
			addGuest('Anna Meier', 101);
			const percent = addGuest('Fifty% Off', 102);

			const result = underTest.searchByGuestName('%');

			expect(result.map((reservation) => reservation.code)).toEqual([percent.code]);
		});

		test('matches an underscore as plain text', () => {
			addGuest('Anna Meier', 101);
			const underscore = addGuest('Jo_Ann', 102);

			const result = underTest.searchByGuestName('_');

			expect(result.map((reservation) => reservation.code)).toEqual([underscore.code]);
		});

		test('matches the escape character as plain text', () => {
			addGuest('Anna Meier', 101);
			const backslash = addGuest('Back\\slash', 102);

			const result = underTest.searchByGuestName('\\');

			expect(result.map((reservation) => reservation.code)).toEqual([backslash.code]);
		});

		test('orders the result by arrival, then room number', () => {
			const later = fieldsFor({
				guestName: 'Mei Later',
				roomNumber: 101,
				arrivalAt: 20 * DAY,
				departureAt: 21 * DAY
			});
			const second = fieldsFor({ guestName: 'Mei Second', roomNumber: 102 });
			const first = fieldsFor({ guestName: 'Mei First', roomNumber: 101 });
			[later, second, first].forEach((fields) => underTest.insert(fields));

			const result = underTest.searchByGuestName('mei');

			expect(result.map((reservation) => reservation.code)).toEqual([
				first.code,
				second.code,
				later.code
			]);
		});

		test('returns an empty array when no name contains the text', () => {
			addGuest('Anna Meier', 101);

			expect(underTest.searchByGuestName('xyz')).toEqual([]);
		});
	});

	describe('listFromArrival', () => {
		test('leaves out a reservation that arrives before the instant and includes one that arrives at it', () => {
			const before = fieldsFor({ roomNumber: 101, arrivalAt: 10 * DAY - 1, departureAt: 12 * DAY });
			const exact = fieldsFor({ roomNumber: 102, arrivalAt: 10 * DAY });
			const after = fieldsFor({ roomNumber: 103, arrivalAt: 11 * DAY, departureAt: 13 * DAY });
			[after, before, exact].forEach((fields) => underTest.insert(fields));

			const result = underTest.listFromArrival(10 * DAY);

			expect(result.map((reservation) => reservation.code)).toEqual([exact.code, after.code]);
		});

		test('orders two reservations of one day by room number', () => {
			const room103 = fieldsFor({ roomNumber: 103 });
			const room101 = fieldsFor({ roomNumber: 101 });
			underTest.insert(room103);
			underTest.insert(room101);

			const result = underTest.listFromArrival(0);

			expect(result.map((reservation) => reservation.code)).toEqual([room101.code, room103.code]);
		});

		test('returns an empty array when every reservation arrives before the instant', () => {
			underTest.insert(fieldsFor({}));

			expect(underTest.listFromArrival(11 * DAY)).toEqual([]);
		});
	});

	describe('findByRoomNumbers', () => {
		test('includes both ends of the range and orders by room number, then arrival', () => {
			const second103 = fieldsFor({ roomNumber: 103, arrivalAt: 20 * DAY, departureAt: 21 * DAY });
			const first103 = fieldsFor({ roomNumber: 103, arrivalAt: 10 * DAY, departureAt: 11 * DAY });
			const only101 = fieldsFor({ roomNumber: 101 });
			const only102 = fieldsFor({ roomNumber: 102 });
			const outside = fieldsFor({ roomNumber: 201, roomTypeId: suiteTypeId });
			[second103, outside, only102, first103, only101].forEach((fields) => underTest.insert(fields));

			const result = underTest.findByRoomNumbers(101, 103);

			expect(result.map((reservation) => reservation.code)).toEqual([
				only101.code,
				only102.code,
				first103.code,
				second103.code
			]);
		});

		test('returns an empty array when no reservation is in the range', () => {
			underTest.insert(fieldsFor({ roomNumber: 201, roomTypeId: suiteTypeId }));

			expect(underTest.findByRoomNumbers(101, 103)).toEqual([]);
		});
	});
});
