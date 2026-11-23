import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { ConflictError, NotFoundError, ValidationError } from '../../src/domain/errors.js';
import { createRoomService } from '../../src/domain/room-service.js';

const SINGLE = { id: 1, name: 'Single' };
const DOUBLE = { id: 2, name: 'Double' };

const reservation = (roomNumber, code) => ({ roomNumber, code });

describe('createRoomService', () => {
	let roomTypes;
	let rooms;
	let reservations;
	let transaction;
	let underTest;

	beforeEach(() => {
		roomTypes = { list: jest.fn(), findById: jest.fn() };
		roomTypes.findById.mockImplementation((id) => [SINGLE, DOUBLE].find((type) => type.id === id));
		roomTypes.list.mockReturnValue([SINGLE, DOUBLE]);
		rooms = {
			list: jest.fn().mockReturnValue([]),
			findInRange: jest.fn().mockReturnValue([]),
			upsert: jest.fn(),
			removeInRange: jest.fn()
		};
		reservations = { findByRoomNumbers: jest.fn().mockReturnValue([]) };
		transaction = jest.fn((work) => work());
		underTest = createRoomService({ roomTypes, rooms, reservations, transaction });
	});

	describe('list', () => {
		test('returns the rooms of the repository when list is called', () => {
			const stored = [{ number: 101, roomTypeId: 1 }];
			rooms.list.mockReturnValue(stored);

			expect(underTest.list()).toEqual(stored);
		});
	});

	describe('listRanges', () => {
		test('returns an empty list when there are no rooms', () => {
			expect(underTest.listRanges()).toEqual([]);
		});

		test('joins consecutive rooms of one type into one range with the type name', () => {
			rooms.list.mockReturnValue([
				{ number: 101, roomTypeId: 1 },
				{ number: 102, roomTypeId: 1 },
				{ number: 103, roomTypeId: 1 }
			]);

			expect(underTest.listRanges()).toEqual([
				{ first: 101, last: 103, roomTypeId: 1, roomTypeName: 'Single' }
			]);
		});

		test('starts a new range when the room type changes', () => {
			rooms.list.mockReturnValue([
				{ number: 101, roomTypeId: 1 },
				{ number: 102, roomTypeId: 2 },
				{ number: 150, roomTypeId: 2 }
			]);

			expect(underTest.listRanges()).toEqual([
				{ first: 101, last: 101, roomTypeId: 1, roomTypeName: 'Single' },
				{ first: 102, last: 102, roomTypeId: 2, roomTypeName: 'Double' },
				{ first: 150, last: 150, roomTypeId: 2, roomTypeName: 'Double' }
			]);
		});

		test('starts a new range when a number is missing between two rooms of one type', () => {
			rooms.list.mockReturnValue([
				{ number: 101, roomTypeId: 1 },
				{ number: 103, roomTypeId: 1 }
			]);

			expect(underTest.listRanges()).toEqual([
				{ first: 101, last: 101, roomTypeId: 1, roomTypeName: 'Single' },
				{ first: 103, last: 103, roomTypeId: 1, roomTypeName: 'Single' }
			]);
		});
	});

	describe('setRange', () => {
		test('creates every room of the range when no room exists', () => {
			const result = underTest.setRange({ first: 101, last: 103, roomTypeId: 1 });

			expect(result).toEqual({ first: 101, last: 103, roomTypeId: 1 });
			expect(rooms.upsert.mock.calls).toEqual([
				[101, 1],
				[102, 1],
				[103, 1]
			]);
			expect(transaction).toHaveBeenCalledTimes(1);
		});

		test('creates a single room when first and last are equal', () => {
			underTest.setRange({ first: 150, last: 150, roomTypeId: 2 });

			expect(rooms.upsert.mock.calls).toEqual([[150, 2]]);
		});

		test('changes the type of existing rooms and creates the missing ones', () => {
			rooms.findInRange.mockReturnValue([
				{ number: 120, roomTypeId: 1 },
				{ number: 121, roomTypeId: 1 },
				{ number: 123, roomTypeId: 2 }
			]);

			underTest.setRange({ first: 120, last: 125, roomTypeId: 2 });

			expect(rooms.upsert.mock.calls).toEqual([
				[120, 2],
				[121, 2],
				[122, 2],
				[123, 2],
				[124, 2],
				[125, 2]
			]);
		});

		test('allows the request when a room with a reservation already has the type', () => {
			rooms.findInRange.mockReturnValue([
				{ number: 102, roomTypeId: 1 },
				{ number: 103, roomTypeId: 1 }
			]);
			reservations.findByRoomNumbers.mockReturnValue([reservation(103, 'ABC123')]);

			underTest.setRange({ first: 102, last: 103, roomTypeId: 1 });

			expect(rooms.upsert).toHaveBeenCalledTimes(2);
		});

		test('throws a conflict naming room and code when a room to change has a reservation', () => {
			rooms.findInRange.mockReturnValue([
				{ number: 102, roomTypeId: 1 },
				{ number: 103, roomTypeId: 1 }
			]);
			reservations.findByRoomNumbers.mockReturnValue([reservation(103, 'ABC123')]);

			expect(() => underTest.setRange({ first: 101, last: 105, roomTypeId: 2 })).toThrow(
				ConflictError
			);
			expect(() => underTest.setRange({ first: 101, last: 105, roomTypeId: 2 })).toThrow(
				/103.*ABC123/
			);
			expect(rooms.upsert).not.toHaveBeenCalled();
		});

		test('ignores a reservation of a room that is not in the range', () => {
			rooms.findInRange.mockReturnValue([{ number: 102, roomTypeId: 1 }]);
			reservations.findByRoomNumbers.mockReturnValue([reservation(103, 'ABC123')]);

			underTest.setRange({ first: 101, last: 105, roomTypeId: 2 });

			expect(rooms.upsert).toHaveBeenCalledTimes(5);
		});

		test('throws a not found error when the room type is unknown', () => {
			expect(() => underTest.setRange({ first: 1, last: 2, roomTypeId: 99 })).toThrow(
				NotFoundError
			);
			expect(rooms.upsert).not.toHaveBeenCalled();
		});

		test.each([
			['first is 0', { first: 0, last: 5, roomTypeId: 1 }],
			['first is 1.5', { first: 1.5, last: 5, roomTypeId: 1 }],
			['first is text', { first: '1', last: 5, roomTypeId: 1 }],
			['last is above 99999', { first: 1, last: 100000, roomTypeId: 1 }],
			['first is larger than last', { first: 10, last: 5, roomTypeId: 1 }],
			['the range holds 1001 numbers', { first: 1, last: 1001, roomTypeId: 1 }],
			['roomTypeId is missing', { first: 1, last: 2 }]
		])('throws a validation error when %s', (_name, input) => {
			expect(() => underTest.setRange(input)).toThrow(ValidationError);
			expect(rooms.upsert).not.toHaveBeenCalled();
		});

		test('accepts a range of exactly 1000 numbers', () => {
			underTest.setRange({ first: 99000, last: 99999, roomTypeId: 1 });

			expect(rooms.upsert).toHaveBeenCalledTimes(1000);
		});

		test('throws a validation error when the input is not an object', () => {
			expect(() => underTest.setRange(null)).toThrow(ValidationError);
		});
	});

	describe('removeRange', () => {
		test('removes the rooms of the range in one transaction', () => {
			rooms.findInRange.mockReturnValue([
				{ number: 101, roomTypeId: 1 },
				{ number: 102, roomTypeId: 1 }
			]);

			underTest.removeRange({ first: 101, last: 110 });

			expect(rooms.removeInRange).toHaveBeenCalledWith(101, 110);
			expect(transaction).toHaveBeenCalledTimes(1);
		});

		test('removes nothing and does not fail when no room exists in the range', () => {
			underTest.removeRange({ first: 101, last: 110 });

			expect(rooms.removeInRange).not.toHaveBeenCalled();
		});

		test('throws a conflict naming room and code when a room has a reservation', () => {
			rooms.findInRange.mockReturnValue([
				{ number: 101, roomTypeId: 1 },
				{ number: 105, roomTypeId: 1 }
			]);
			reservations.findByRoomNumbers.mockReturnValue([reservation(105, 'XYZ789')]);

			expect(() => underTest.removeRange({ first: 101, last: 110 })).toThrow(ConflictError);
			expect(() => underTest.removeRange({ first: 101, last: 110 })).toThrow(/105.*XYZ789/);
			expect(rooms.removeInRange).not.toHaveBeenCalled();
		});

		test('throws a validation error when first is larger than last', () => {
			expect(() => underTest.removeRange({ first: 10, last: 5 })).toThrow(ValidationError);
		});

		test('throws a validation error when the range holds more than 1000 numbers', () => {
			expect(() => underTest.removeRange({ first: 1, last: 1001 })).toThrow(ValidationError);
		});
	});
});
