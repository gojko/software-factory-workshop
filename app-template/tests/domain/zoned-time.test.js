import { describe, expect, test } from '@jest/globals';
import { instantOf, localDayOf } from '../../src/domain/zoned-time.js';

const utc = (year, month, day, hour = 0, minute = 0) => Date.UTC(year, month - 1, day, hour, minute);

describe('localDayOf', () => {
	test('returns the hotel day when the instant is on the previous day in UTC', () => {
		expect(localDayOf(utc(2026, 12, 1, 23, 30), 'Asia/Tokyo')).toEqual('2026-12-02');
	});

	test('returns the hotel day when the instant is on the next day in UTC', () => {
		expect(localDayOf(utc(2026, 12, 2, 3, 0), 'America/New_York')).toEqual('2026-12-01');
	});

	test('returns the first day of the local day at exactly local midnight', () => {
		expect(localDayOf(utc(2026, 11, 30, 23, 0), 'Europe/Berlin')).toEqual('2026-12-01');
	});

	test('returns the last minute of the previous local day one minute before local midnight', () => {
		expect(localDayOf(utc(2026, 11, 30, 22, 59), 'Europe/Berlin')).toEqual('2026-11-30');
	});

	test('returns a zero padded day', () => {
		expect(localDayOf(utc(2026, 1, 5, 12, 0), 'UTC')).toEqual('2026-01-05');
	});
});

describe('instantOf', () => {
	test('returns the instant of a local time in winter', () => {
		expect(instantOf('2026-12-01', 15 * 60, 'Europe/Berlin')).toEqual(utc(2026, 12, 1, 14, 0));
	});

	test('returns the instant of a local time in summer', () => {
		expect(instantOf('2026-07-01', 15 * 60, 'Europe/Berlin')).toEqual(utc(2026, 7, 1, 13, 0));
	});

	test('returns the first instant after the gap when the time does not exist', () => {
		expect(instantOf('2026-03-29', 2 * 60 + 30, 'Europe/Berlin')).toEqual(utc(2026, 3, 29, 1, 0));
	});

	test('returns the first of the two instants when the time happens twice', () => {
		expect(instantOf('2026-10-25', 2 * 60 + 30, 'Europe/Berlin')).toEqual(utc(2026, 10, 25, 0, 30));
	});

	test('returns the first instant after the gap when the zone skips midnight', () => {
		expect(instantOf('2026-03-08', 0, 'America/Havana')).toEqual(utc(2026, 3, 8, 5, 0));
	});

	test('returns the local midnight of a day inside a 25-hour day', () => {
		expect(instantOf('2026-10-26', 0, 'Europe/Berlin')).toEqual(utc(2026, 10, 25, 23, 0));
	});

	test('round-trips with localDayOf', () => {
		const instant = instantOf('2026-12-24', 0, 'Asia/Tokyo');

		expect(localDayOf(instant, 'Asia/Tokyo')).toEqual('2026-12-24');
		expect(localDayOf(instant - 1, 'Asia/Tokyo')).toEqual('2026-12-23');
	});
});
