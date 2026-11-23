import { beforeEach, describe, expect, test } from '@jest/globals';
import { jest } from '@jest/globals';
import { ValidationError } from '../../src/domain/errors.js';
import { createSettingsService } from '../../src/domain/settings-service.js';

const VALID = {
	timeZone: 'Europe/Berlin',
	checkInMinutes: 900,
	checkOutMinutes: 660,
	currency: 'EUR'
};

describe('createSettingsService', () => {
	let settings;
	let underTest;

	beforeEach(() => {
		settings = { get: jest.fn(), update: jest.fn() };
		underTest = createSettingsService({ settings });
	});

	test('returns the stored settings when get is called', () => {
		settings.get.mockReturnValue(VALID);

		expect(underTest.get()).toEqual(VALID);
	});

	test('stores the three values and the currency when the input is valid', () => {
		settings.update.mockImplementation((fields) => fields);

		const result = underTest.update(VALID);

		expect(settings.update).toHaveBeenCalledWith(VALID);
		expect(result).toEqual(VALID);
	});

	test('accepts the limits 0 and 1439 when the times are at the edges', () => {
		settings.update.mockImplementation((fields) => fields);

		const result = underTest.update({ ...VALID, checkInMinutes: 0, checkOutMinutes: 1439 });

		expect(result).toEqual(expect.objectContaining({ checkInMinutes: 0, checkOutMinutes: 1439 }));
	});

	test.each([
		['an unknown zone name', { timeZone: 'Mars/Olympus' }],
		['a zone that is not text', { timeZone: 5 }],
		['a missing zone', { timeZone: undefined }],
		['a check-in time of 1440', { checkInMinutes: 1440 }],
		['a negative check-out time', { checkOutMinutes: -1 }],
		['a check-in time with a fraction', { checkInMinutes: 10.5 }],
		['a check-out time of 1440', { checkOutMinutes: 1440 }],
		['the currency JPY with no decimal digits', { currency: 'JPY' }],
		['the unknown currency ABC', { currency: 'ABC' }],
		['a lower-case currency', { currency: 'eur' }],
		['a currency with four letters', { currency: 'EURO' }],
		['a currency that is not text', { currency: 3 }]
	])('throws ValidationError when the input has %s', (name, change) => {
		expect(() => underTest.update({ ...VALID, ...change })).toThrow(ValidationError);
		expect(settings.update).not.toHaveBeenCalled();
	});

	test('throws ValidationError when the input is not an object', () => {
		expect(() => underTest.update(undefined)).toThrow(ValidationError);
	});
});
