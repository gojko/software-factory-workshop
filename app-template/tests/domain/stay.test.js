import { describe, expect, test } from '@jest/globals';
import { ValidationError } from '../../src/domain/errors.js';
import { validateStay } from '../../src/domain/stay.js';
import { instantOf } from '../../src/domain/zoned-time.js';

const BERLIN = 'Europe/Berlin';
const at = (day, hour, minute = 0) => instantOf(day, hour * 60 + minute, BERLIN);
const nowMs = at('2026-11-22', 10);
const context = { nowMs, timeZone: BERLIN };

const validate = (arrivalAt, departureAt, guests = 1) =>
	validateStay({ arrivalAt, departureAt, guests }, context);
const refusal = (arrivalAt, departureAt, guests = 1) => {
	try {
		validate(arrivalAt, departureAt, guests);
	} catch (error) {
		return error;
	}
	return undefined;
};

describe('validateStay with a valid stay', () => {
	test('returns 1 night for an arrival today after now', () => {
		const underTest = validate(at('2026-11-22', 15), at('2026-11-23', 11));

		expect(underTest).toEqual({ nights: 1, hours: 20 });
	});

	test('accepts an arrival earlier today than now', () => {
		expect(validate(at('2026-11-22', 8), at('2026-11-23', 11)).nights).toEqual(1);
	});

	test('accepts 30 nights', () => {
		expect(validate(at('2026-12-01', 15), at('2026-12-31', 11)).nights).toEqual(30);
	});

	test('accepts guests 1 and 4', () => {
		expect(validate(at('2026-12-01', 15), at('2026-12-02', 11), 1).nights).toEqual(1);
		expect(validate(at('2026-12-01', 15), at('2026-12-02', 11), 4).nights).toEqual(1);
	});
});

describe('validateStay with an invalid stay', () => {
	test('throws a ValidationError when the arrival is yesterday', () => {
		const error = refusal(at('2026-11-21', 15), at('2026-11-23', 11));

		expect(error).toBeInstanceOf(ValidationError);
		expect(error.message).toEqual('arrival day must not be in the past');
	});

	test('throws when the arrival is yesterday just before midnight', () => {
		expect(refusal(at('2026-11-21', 23, 59), at('2026-11-23', 11)).message).toEqual(
			'arrival day must not be in the past'
		);
	});

	test('throws when arrivalAt is not a whole number of milliseconds', () => {
		const error = refusal(1.5, at('2026-12-02', 11));

		expect(error).toBeInstanceOf(ValidationError);
		expect(error.message).toEqual('arrivalAt must be a whole number of milliseconds');
	});

	test('throws when departureAt is missing', () => {
		expect(refusal(at('2026-12-01', 15), undefined).message).toEqual(
			'departureAt must be a whole number of milliseconds'
		);
	});

	test('throws when the departure is before the arrival', () => {
		const error = refusal(at('2026-12-01', 15), at('2026-12-01', 14));

		expect(error).toBeInstanceOf(ValidationError);
		expect(error.message).toEqual('departure must be after arrival');
	});

	test('throws when the departure equals the arrival', () => {
		expect(refusal(at('2026-12-01', 15), at('2026-12-01', 15)).message).toEqual(
			'departure must be after arrival'
		);
	});

	test('throws when no midnight is crossed (0 nights)', () => {
		const error = refusal(at('2026-12-01', 15), at('2026-12-01', 18));

		expect(error).toBeInstanceOf(ValidationError);
		expect(error.message).toEqual('stay must have at least 1 night');
	});

	test('throws when the stay has 31 nights', () => {
		const error = refusal(at('2026-12-01', 15), at('2027-01-01', 11));

		expect(error).toBeInstanceOf(ValidationError);
		expect(error.message).toEqual('stay must have at most 30 nights');
	});

	test('throws before counting when the instants are more than 32 days apart', () => {
		const error = refusal(at('2026-12-01', 15), at('2027-06-01', 11));

		expect(error).toBeInstanceOf(ValidationError);
		expect(error.message).toEqual('arrival and departure must be at most 32 days apart');
	});

	test.each([0, 5, 1.5, -1, '2', null])('throws when guests is %p', (guests) => {
		const error = refusal(at('2026-12-01', 15), at('2026-12-02', 11), guests);

		expect(error).toBeInstanceOf(ValidationError);
		expect(error.message).toMatch(/^guests must be/);
	});

	test('reports the arrival day before the guests', () => {
		expect(refusal(at('2026-11-21', 15), at('2026-11-23', 11), 0).message).toEqual(
			'arrival day must not be in the past'
		);
	});
});
