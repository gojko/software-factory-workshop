import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { createBookingService } from '../../src/domain/booking-service.js';
import { ConflictError, NotFoundError, ValidationError } from '../../src/domain/errors.js';
import { instantOf } from '../../src/domain/zoned-time.js';

const BERLIN = 'Europe/Berlin';
const at = (day, hour) => instantOf(day, hour * 60, BERLIN);
const NOW = at('2026-11-22', 10);
const arrivalAt = at('2026-12-01', 15);
const departureAt = at('2026-12-03', 11);

const single = { id: 1, name: 'Single', maxOccupancy: 1, baseRateCents: 8000, extraGuestCents: 0 };
const double = { id: 2, name: 'Double', maxOccupancy: 2, baseRateCents: 12000, extraGuestCents: 3000 };

const allRooms = [
	{ number: 101, roomTypeId: 1 },
	{ number: 102, roomTypeId: 1 },
	{ number: 103, roomTypeId: 1 },
	{ number: 201, roomTypeId: 2 }
];

const heldRoom = (roomNumber, from, to) => ({ roomNumber, arrivalAt: from, departureAt: to });

describe('createBookingService book', () => {
	let roomTypes;
	let rooms;
	let reservations;
	let settings;
	let transaction;
	let clock;
	let generateCode;
	let underTest;

	const request = (overrides = {}) => ({
		roomTypeId: 1,
		arrivalAt,
		departureAt,
		guests: 1,
		guestName: 'Ada Lovelace',
		guestEmail: 'ada@example.com',
		...overrides
	});

	beforeEach(() => {
		roomTypes = { findById: jest.fn((id) => [single, double].find((type) => type.id === id)) };
		rooms = { list: jest.fn(() => allRooms) };
		reservations = {
			findConfirmedOverlapping: jest.fn(() => []),
			codeExists: jest.fn(() => false),
			insert: jest.fn((fields) => ({ ...fields }))
		};
		settings = { get: jest.fn(() => ({ timeZone: BERLIN })) };
		transaction = jest.fn((work) => work());
		clock = { now: jest.fn(() => NOW) };
		generateCode = jest.fn(() => 'ABC234');
		underTest = createBookingService({
			roomTypes,
			rooms,
			reservations,
			settings,
			transaction,
			clock,
			generateCode
		});
	});

	test('stores a confirmed reservation in the lowest free room with the total price', () => {
		const result = underTest.book(request({ guestName: '  Ada Lovelace  ' }));

		expect(reservations.insert).toHaveBeenCalledWith({
			code: 'ABC234',
			roomNumber: 101,
			roomTypeId: 1,
			arrivalAt,
			departureAt,
			nights: 2,
			guests: 1,
			guestName: 'Ada Lovelace',
			guestEmail: 'ada@example.com',
			status: 'Confirmed',
			totalCents: 16000
		});
		expect(result).toEqual(expect.objectContaining({ code: 'ABC234', roomNumber: 101 }));
	});

	test('runs the check and the insert inside the transaction', () => {
		underTest.book(request());

		expect(transaction).toHaveBeenCalledTimes(1);
	});

	test('prices extra guests with the rules of the room type', () => {
		underTest.book(request({ roomTypeId: 2, guests: 2 }));

		expect(reservations.insert).toHaveBeenCalledWith(
			expect.objectContaining({ roomNumber: 201, totalCents: 30000 })
		);
	});

	test('assigns the next room when the lowest room is reserved', () => {
		reservations.findConfirmedOverlapping.mockReturnValue([heldRoom(101, arrivalAt, departureAt)]);

		underTest.book(request());

		expect(reservations.insert).toHaveBeenCalledWith(expect.objectContaining({ roomNumber: 102 }));
	});

	test('skips a reserved room in the middle of the range', () => {
		reservations.findConfirmedOverlapping.mockReturnValue([
			heldRoom(101, arrivalAt, departureAt),
			heldRoom(102, arrivalAt, departureAt)
		]);

		underTest.book(request());

		expect(reservations.insert).toHaveBeenCalledWith(expect.objectContaining({ roomNumber: 103 }));
	});

	test('ignores a reservation of another room type', () => {
		reservations.findConfirmedOverlapping.mockReturnValue([heldRoom(201, arrivalAt, departureAt)]);

		underTest.book(request());

		expect(reservations.insert).toHaveBeenCalledWith(expect.objectContaining({ roomNumber: 101 }));
	});

	test('reads the reservations that overlap the stay', () => {
		underTest.book(request());

		expect(reservations.findConfirmedOverlapping).toHaveBeenCalledWith(arrivalAt, departureAt);
	});

	describe('with a reservation of room 101 that departs at the start of the stay', () => {
		const earlier = { from: at('2026-11-29', 15), to: at('2026-12-01', 11) };

		test('gives room 101 when the stay starts at the departure instant', () => {
			const reservationsAt = (from, to) =>
				earlier.to > from && earlier.from < to ? [heldRoom(101, earlier.from, earlier.to)] : [];
			reservations.findConfirmedOverlapping.mockImplementation(reservationsAt);

			underTest.book(request({ arrivalAt: earlier.to, departureAt: at('2026-12-03', 11) }));

			expect(reservations.insert).toHaveBeenCalledWith(expect.objectContaining({ roomNumber: 101 }));
		});

		test('gives room 102 when the stay arrives before the departure instant', () => {
			const reservationsAt = (from, to) =>
				earlier.to > from && earlier.from < to ? [heldRoom(101, earlier.from, earlier.to)] : [];
			reservations.findConfirmedOverlapping.mockImplementation(reservationsAt);

			underTest.book(request({ arrivalAt: earlier.to - 1, departureAt: at('2026-12-03', 11) }));

			expect(reservations.insert).toHaveBeenCalledWith(expect.objectContaining({ roomNumber: 102 }));
		});
	});

	describe('when no room of the type is free', () => {
		beforeEach(() => {
			reservations.findConfirmedOverlapping.mockReturnValue([
				heldRoom(101, arrivalAt, departureAt),
				heldRoom(102, arrivalAt, departureAt),
				heldRoom(103, arrivalAt, departureAt)
			]);
		});

		test('throws a ConflictError with a clear message', () => {
			expect(() => underTest.book(request())).toThrow(
				new ConflictError('No room of this type is free any more for these dates. Please search again.')
			);
		});

		test('throws a ConflictError and inserts nothing', () => {
			expect(() => underTest.book(request())).toThrow(ConflictError);
			expect(reservations.insert).not.toHaveBeenCalled();
		});
	});

	describe('confirmation code', () => {
		test('does not reuse a code that exists', () => {
			generateCode.mockReturnValueOnce('TAKEN2').mockReturnValueOnce('FREE23');
			reservations.codeExists.mockImplementation((code) => code === 'TAKEN2');

			underTest.book(request());

			expect(reservations.insert).toHaveBeenCalledWith(expect.objectContaining({ code: 'FREE23' }));
		});

		test('throws an error when no free code is found in 10 tries', () => {
			reservations.codeExists.mockReturnValue(true);

			expect(() => underTest.book(request())).toThrow(Error);
			expect(generateCode).toHaveBeenCalledTimes(10);
			expect(reservations.insert).not.toHaveBeenCalled();
		});
	});

	describe('refusals', () => {
		test('throws a ValidationError when the email is invalid', () => {
			expect(() => underTest.book(request({ guestEmail: 'not-an-email' }))).toThrow(ValidationError);
			expect(reservations.insert).not.toHaveBeenCalled();
		});

		test('throws a ValidationError when the guest name has only spaces', () => {
			expect(() => underTest.book(request({ guestName: '   ' }))).toThrow(ValidationError);
		});

		test('throws a ValidationError when the room type id is not a whole number', () => {
			expect(() => underTest.book(request({ roomTypeId: 'x' }))).toThrow(ValidationError);
		});

		test('throws a ValidationError when the stay is invalid', () => {
			expect(() => underTest.book(request({ departureAt: arrivalAt }))).toThrow(ValidationError);
		});

		test('throws a ValidationError when the arrival is in the past', () => {
			expect(() => underTest.book(request({ arrivalAt: at('2026-11-01', 15) }))).toThrow(ValidationError);
		});

		test('throws a NotFoundError when the room type does not exist', () => {
			expect(() => underTest.book(request({ roomTypeId: 99 }))).toThrow(NotFoundError);
			expect(reservations.insert).not.toHaveBeenCalled();
		});

		test('throws a ValidationError when guests exceed the occupancy of the type', () => {
			expect(() => underTest.book(request({ roomTypeId: 2, guests: 3 }))).toThrow(ValidationError);
			expect(reservations.insert).not.toHaveBeenCalled();
		});

		test('throws a ValidationError when the body is not an object', () => {
			expect(() => underTest.book(null)).toThrow(ValidationError);
		});
	});
});
