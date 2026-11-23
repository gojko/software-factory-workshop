import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { ValidationError } from '../../src/domain/errors.js';
import { createReservationLookupService } from '../../src/domain/reservation-lookup-service.js';

const reservation = (code, guestName, arrivalAt, roomNumber) => ({
	code,
	guestName,
	arrivalAt,
	roomNumber
});

const anna = reservation('AB3K9X', 'Anna Meier', 2000, 105);
const meinhard = reservation('CD4M8Y', 'Meinhard Lang', 1000, 102);
const sameDay = reservation('EF5N7Z', 'Meike Stein', 1000, 101);

describe('createReservationLookupService find', () => {
	let reservations;
	let underTest;

	beforeEach(() => {
		reservations = {
			findByCode: jest.fn(() => null),
			searchByGuestName: jest.fn(() => []),
			listFromArrival: jest.fn(() => [])
		};
		underTest = createReservationLookupService({ reservations });
	});

	test('returns the reservation when the code is given in lower case', () => {
		reservations.findByCode.mockReturnValue(anna);

		const result = underTest.find('ab3k9x');

		expect(reservations.findByCode).toHaveBeenCalledWith('AB3K9X');
		expect(result).toEqual([anna]);
	});

	test('trims the query before it searches', () => {
		underTest.find('  mei  ');

		expect(reservations.searchByGuestName).toHaveBeenCalledWith('mei');
		expect(reservations.findByCode).toHaveBeenCalledWith('MEI');
	});

	test('returns every reservation of the name search ordered by arrival then room number', () => {
		reservations.searchByGuestName.mockReturnValue([anna, meinhard, sameDay]);

		const result = underTest.find('mei');

		expect(result).toEqual([sameDay, meinhard, anna]);
	});

	test('returns a reservation once when the code and the name both find it', () => {
		reservations.findByCode.mockReturnValue(anna);
		reservations.searchByGuestName.mockReturnValue([anna, meinhard]);

		const result = underTest.find('ab3k9x');

		expect(result).toEqual([meinhard, anna]);
	});

	test('returns an empty list when nothing matches', () => {
		expect(underTest.find('zzz')).toEqual([]);
	});

	test.each(['', '   ', undefined, 42])('throws ValidationError when the query is %p', (query) => {
		expect(() => underTest.find(query)).toThrow(ValidationError);
	});
});

describe('createReservationLookupService listFrom', () => {
	let reservations;
	let underTest;

	beforeEach(() => {
		reservations = {
			findByCode: jest.fn(),
			searchByGuestName: jest.fn(),
			listFromArrival: jest.fn(() => [meinhard, anna])
		};
		underTest = createReservationLookupService({ reservations });
	});

	test('returns the reservations that arrive from the instant', () => {
		const result = underTest.listFrom(1000);

		expect(reservations.listFromArrival).toHaveBeenCalledWith(1000);
		expect(result).toEqual([meinhard, anna]);
	});

	test.each(['2026-12-01', 1.5, -1, undefined])('throws ValidationError when from is %p', (from) => {
		expect(() => underTest.listFrom(from)).toThrow(ValidationError);
		expect(reservations.listFromArrival).not.toHaveBeenCalled();
	});
});
