import { describe, expect, test } from '@jest/globals';
import { stayLengthOf } from '../../src/domain/stay-length.js';
import { instantOf } from '../../src/domain/zoned-time.js';

const BERLIN = 'Europe/Berlin';
const at = (day, hour, minute, timeZone) => instantOf(day, hour * 60 + minute, timeZone);
const nightsOf = (arrival, departure, timeZone) =>
	stayLengthOf(at(...arrival, timeZone), at(...departure, timeZone), timeZone).nights;

describe('stayLengthOf in Europe/Berlin', () => {
	test('returns 1 night for 15:00 to 11:00 on the next day', () => {
		expect(nightsOf(['2026-12-01', 15, 0], ['2026-12-02', 11, 0], BERLIN)).toEqual(1);
	});

	test('returns 1 night when the departure on the next day is late', () => {
		expect(nightsOf(['2026-12-01', 15, 0], ['2026-12-02', 16, 0], BERLIN)).toEqual(1);
	});

	test('returns 2 nights for 15:00 to 11:00 two days later', () => {
		expect(nightsOf(['2026-12-01', 15, 0], ['2026-12-03', 11, 0], BERLIN)).toEqual(2);
	});

	test('returns 1 night when the arrival is at 23:00 and the departure at 02:00', () => {
		expect(nightsOf(['2026-12-01', 23, 0], ['2026-12-02', 2, 0], BERLIN)).toEqual(1);
	});

	test('counts the midnight when the arrival is exactly 00:00', () => {
		expect(nightsOf(['2026-12-02', 0, 0], ['2026-12-02', 11, 0], BERLIN)).toEqual(1);
	});

	test('does not count the midnight when the departure is exactly 00:00', () => {
		expect(nightsOf(['2026-12-01', 15, 0], ['2026-12-02', 0, 0], BERLIN)).toEqual(0);
	});

	test('returns 0 nights when arrival and departure are on the same day', () => {
		expect(nightsOf(['2026-12-01', 9, 0], ['2026-12-01', 18, 0], BERLIN)).toEqual(0);
	});

	test('returns 0 nights when the departure equals the arrival', () => {
		const instant = at('2026-12-01', 15, 0, BERLIN);

		expect(stayLengthOf(instant, instant, BERLIN)).toEqual({ nights: 0, hours: 0 });
	});

	test('returns 0 nights and 0 hours when the departure is before the arrival', () => {
		const arrival = at('2026-12-03', 15, 0, BERLIN);
		const departure = at('2026-12-01', 11, 0, BERLIN);

		expect(stayLengthOf(arrival, departure, BERLIN)).toEqual({ nights: 0, hours: 0 });
	});

	test('returns 30 nights for a stay of 30 days', () => {
		expect(nightsOf(['2026-12-01', 15, 0], ['2026-12-31', 11, 0], BERLIN)).toEqual(30);
	});

	test('returns the elapsed time in hours', () => {
		const arrival = at('2026-12-01', 15, 0, BERLIN);
		const departure = at('2026-12-02', 11, 0, BERLIN);

		expect(stayLengthOf(arrival, departure, BERLIN)).toEqual({ nights: 1, hours: 20 });
	});

	test('returns fractions of an hour in hours', () => {
		const arrival = at('2026-12-01', 15, 0, BERLIN);
		const departure = at('2026-12-01', 15, 30, BERLIN);

		expect(stayLengthOf(arrival, departure, BERLIN).hours).toEqual(0.5);
	});
});

describe('stayLengthOf over clock changes', () => {
	test('returns 2 nights over the spring change in Europe/Berlin', () => {
		expect(nightsOf(['2026-03-28', 15, 0], ['2026-03-30', 11, 0], BERLIN)).toEqual(2);
	});

	test('returns 1 night for the stay that contains the 23-hour day in Europe/Berlin', () => {
		expect(nightsOf(['2026-03-29', 15, 0], ['2026-03-30', 11, 0], BERLIN)).toEqual(1);
	});

	test('returns 2 nights over the autumn change in Europe/Berlin', () => {
		expect(nightsOf(['2026-10-24', 15, 0], ['2026-10-26', 11, 0], BERLIN)).toEqual(2);
	});

	test('returns 1 night for the stay that contains the 25-hour day in Europe/Berlin', () => {
		expect(nightsOf(['2026-10-25', 15, 0], ['2026-10-26', 11, 0], BERLIN)).toEqual(1);
	});

	test('returns 2 nights over the spring change in America/New_York', () => {
		expect(nightsOf(['2026-03-07', 15, 0], ['2026-03-09', 11, 0], 'America/New_York')).toEqual(2);
	});

	test('returns 2 nights over the autumn change in America/New_York', () => {
		expect(nightsOf(['2026-10-31', 15, 0], ['2026-11-02', 11, 0], 'America/New_York')).toEqual(2);
	});

	test('returns 1 night over the night with the change in America/New_York', () => {
		expect(nightsOf(['2026-03-07', 15, 0], ['2026-03-08', 11, 0], 'America/New_York')).toEqual(1);
	});

	test('returns 1 night when the zone skips midnight', () => {
		expect(nightsOf(['2026-03-07', 15, 0], ['2026-03-08', 11, 0], 'America/Havana')).toEqual(1);
	});

	test('returns 2 nights over the day on which the zone skips midnight', () => {
		expect(nightsOf(['2026-03-07', 15, 0], ['2026-03-09', 11, 0], 'America/Havana')).toEqual(2);
	});
});
