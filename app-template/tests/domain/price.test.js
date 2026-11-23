import { describe, expect, test } from '@jest/globals';
import { pricePerNightCents, totalPriceCents } from '../../src/domain/price.js';

const roomType = (baseRateCents, extraGuestCents) => ({ baseRateCents, extraGuestCents });
const stayOf = (nights) => ({ nights, hours: nights * 24 });

describe('pricePerNightCents', () => {
	test('returns the base rate for 1 guest', () => {
		expect(pricePerNightCents(roomType(8000, 2500), 1)).toEqual(8000);
	});

	test('adds the surcharge once per guest beyond the first', () => {
		expect(pricePerNightCents(roomType(8000, 2500), 3)).toEqual(13000);
	});

	test('returns 0 when base rate and surcharge are 0', () => {
		expect(pricePerNightCents(roomType(0, 0), 4)).toEqual(0);
	});
});

describe('totalPriceCents', () => {
	test('returns the price per night for 1 guest and 1 night', () => {
		expect(totalPriceCents(roomType(8000, 2500), 1, stayOf(1))).toEqual(8000);
	});

	test('returns the price per night times the nights for 3 guests and 2 nights', () => {
		expect(totalPriceCents(roomType(8000, 2500), 3, stayOf(2))).toEqual(26000);
	});

	test('returns 268500 for base 8950, no surcharge, 4 guests and 30 nights', () => {
		expect(totalPriceCents(roomType(8950, 0), 4, stayOf(30))).toEqual(268500);
	});

	test('returns 0 when base rate and surcharge are 0', () => {
		expect(totalPriceCents(roomType(0, 0), 2, stayOf(5))).toEqual(0);
	});

	test('does not use the hours of the stay', () => {
		expect(totalPriceCents(roomType(8000, 0), 1, { nights: 2, hours: 3 })).toEqual(16000);
	});

	test('returns a whole number for large amounts', () => {
		expect(Number.isInteger(totalPriceCents(roomType(999999, 12345), 4, stayOf(30)))).toEqual(true);
	});
});
