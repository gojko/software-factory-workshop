import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { createAvailabilityService } from '../../src/domain/availability-service.js';
import { ValidationError } from '../../src/domain/errors.js';
import { instantOf } from '../../src/domain/zoned-time.js';

const BERLIN = 'Europe/Berlin';
const at = (day, hour) => instantOf(day, hour * 60, BERLIN);
const NOW = at('2026-11-22', 10);
const arrivalAt = at('2026-12-01', 15);
const departureAt = at('2026-12-03', 11);

const single = { id: 1, name: 'Single', maxOccupancy: 1, baseRateCents: 8000, extraGuestCents: 0 };
const double = { id: 2, name: 'Double', maxOccupancy: 2, baseRateCents: 12000, extraGuestCents: 3000 };
const suite = { id: 3, name: 'Suite', maxOccupancy: 4, baseRateCents: 12000, extraGuestCents: 1000 };

const roomsOf = (roomTypeId, first, count) =>
	Array.from({ length: count }, (_, index) => ({ number: first + index, roomTypeId }));

describe('createAvailabilityService search', () => {
	let roomTypes;
	let rooms;
	let reservations;
	let clock;
	let settings;
	let underTest;

	beforeEach(() => {
		roomTypes = { list: jest.fn(() => [single, double]) };
		rooms = { list: jest.fn(() => [...roomsOf(1, 101, 2), ...roomsOf(2, 201, 2)]) };
		reservations = { findConfirmedOverlapping: jest.fn(() => []) };
		clock = { now: jest.fn(() => NOW) };
		settings = { get: jest.fn(() => ({ timeZone: BERLIN })) };
		underTest = createAvailabilityService({ roomTypes, rooms, reservations, clock, settings });
	});

	test('returns the free rooms, nights and prices of a type', () => {
		const result = underTest.search({ arrivalAt, departureAt, guests: 2 });

		expect(result).toEqual([
			{
				roomTypeId: 2,
				roomTypeName: 'Double',
				freeRooms: 2,
				nights: 2,
				pricePerNightCents: 15000,
				totalCents: 30000
			}
		]);
	});

	test('hides the Single for 2 guests', () => {
		const result = underTest.search({ arrivalAt, departureAt, guests: 2 });

		expect(result.map((item) => item.roomTypeName)).toEqual(['Double']);
	});

	test('reads the reservations that overlap the stay', () => {
		underTest.search({ arrivalAt, departureAt, guests: 1 });

		expect(reservations.findConfirmedOverlapping).toHaveBeenCalledWith(arrivalAt, departureAt);
	});

	test('returns 19 free rooms when 3 of 22 are reserved', () => {
		rooms.list.mockReturnValue(roomsOf(1, 101, 22));
		reservations.findConfirmedOverlapping.mockReturnValue([
			{ roomNumber: 101 },
			{ roomNumber: 102 },
			{ roomNumber: 103 }
		]);

		const result = underTest.search({ arrivalAt, departureAt, guests: 1 });

		expect(result).toEqual([expect.objectContaining({ roomTypeId: 1, freeRooms: 19 })]);
	});

	test('leaves out a type with no free room', () => {
		reservations.findConfirmedOverlapping.mockReturnValue([{ roomNumber: 101 }, { roomNumber: 102 }]);

		const result = underTest.search({ arrivalAt, departureAt, guests: 1 });

		expect(result.map((item) => item.roomTypeId)).toEqual([2]);
	});

	test('sorts by total price, cheapest first', () => {
		const result = underTest.search({ arrivalAt, departureAt, guests: 1 });

		expect(result.map((item) => item.roomTypeName)).toEqual(['Single', 'Double']);
	});

	test('sorts equal totals by room type name', () => {
		roomTypes.list.mockReturnValue([suite, double]);
		rooms.list.mockReturnValue([...roomsOf(3, 301, 1), ...roomsOf(2, 201, 1)]);

		const result = underTest.search({ arrivalAt, departureAt, guests: 1 });

		expect(result.map((item) => item.roomTypeName)).toEqual(['Double', 'Suite']);
	});

	test('throws ValidationError when the stay is invalid', () => {
		expect(() =>
			underTest.search({ arrivalAt: departureAt, departureAt: arrivalAt, guests: 1 })
		).toThrow(ValidationError);
	});

	test('does not read reservations when the guests are invalid', () => {
		expect(() => underTest.search({ arrivalAt, departureAt, guests: 9 })).toThrow(ValidationError);
		expect(reservations.findConfirmedOverlapping).not.toHaveBeenCalled();
	});

	test('checks the stay with the time of the clock and the time zone of the settings', () => {
		clock.now.mockReturnValue(at('2026-12-02', 10));

		expect(() => underTest.search({ arrivalAt, departureAt, guests: 1 })).toThrow(ValidationError);
		expect(settings.get).toHaveBeenCalled();
	});
});
