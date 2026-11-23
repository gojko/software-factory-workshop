import { beforeEach, describe, expect, test } from '@jest/globals';
import {
	addDays,
	dayInputValue,
	formatInstant,
	instantOf,
	minutesToTimeInput,
	stayInstants,
	timeInputToMinutes,
	timeInputValue,
	todayStart
} from '../../src/www/dates.js';

const BERLIN = 'Europe/Berlin';
const NEW_YORK = 'America/New_York';

describe('formatInstant', () => {
	const instant = 1781562600000;

	test('returns the day of the hotel zone when the machine zone differs', () => {
		expect(formatInstant(instant, { timeZone: BERLIN, locale: 'en-GB', style: 'day' })).toEqual('16 Jun 2026');
		expect(formatInstant(instant, { timeZone: NEW_YORK, locale: 'en-GB', style: 'day' })).toEqual('15 Jun 2026');
	});

	test('returns the time of the hotel zone when style is time', () => {
		expect(formatInstant(instant, { timeZone: BERLIN, locale: 'en-GB', style: 'time' })).toEqual('00:30');
		expect(formatInstant(instant, { timeZone: NEW_YORK, locale: 'en-GB', style: 'time' })).toEqual('18:30');
	});

	test('returns day and time when style is dayTime', () => {
		const text = formatInstant(instant, { timeZone: BERLIN, locale: 'en-GB', style: 'dayTime' });

		expect(text).toContain('16 Jun 2026');
		expect(text).toContain('00:30');
	});

	test('returns day and time when style is missing', () => {
		const text = formatInstant(instant, { timeZone: BERLIN, locale: 'en-GB' });

		expect(text).toContain('16 Jun 2026');
		expect(text).toContain('00:30');
	});
});

describe('dayInputValue and timeInputValue', () => {
	const instant = 1781562600000;

	test('returns the day of the zone in YYYY-MM-DD form', () => {
		expect(dayInputValue(instant, BERLIN)).toEqual('2026-06-16');
		expect(dayInputValue(instant, NEW_YORK)).toEqual('2026-06-15');
	});

	test('returns the time of the zone in HH:mm form', () => {
		expect(timeInputValue(instant, BERLIN)).toEqual('00:30');
		expect(timeInputValue(instant, NEW_YORK)).toEqual('18:30');
	});

	test.each([
		['2026-03-28', BERLIN],
		['2026-03-29', BERLIN],
		['2026-10-25', BERLIN],
		['2026-03-08', NEW_YORK],
		['2026-11-01', NEW_YORK],
		['2026-12-31', NEW_YORK]
	])('returns %s again when the day goes through instantOf at 15:00 in %s', (day, zone) => {
		expect(dayInputValue(instantOf(day, 900, zone), zone)).toEqual(day);
	});
});

describe('instantOf', () => {
	test('returns the instant of the wall time in the zone when the time is plain', () => {
		expect(instantOf('2026-03-28', 900, BERLIN)).toEqual(1774706400000);
		expect(instantOf('2026-06-15', 270, NEW_YORK)).toEqual(1781512200000);
	});

	test('returns the first instant after the gap when the Berlin time does not exist', () => {
		expect(instantOf('2026-03-29', 150, BERLIN)).toEqual(1774746000000);
	});

	test('returns the first instant after the gap when the New York time does not exist', () => {
		expect(instantOf('2026-03-08', 150, NEW_YORK)).toEqual(1772953200000);
	});

	test('returns the first of the two instants when the Berlin time happens twice', () => {
		expect(instantOf('2026-10-25', 150, BERLIN)).toEqual(1792888200000);
	});

	test('returns the first of the two instants when the New York time happens twice', () => {
		expect(instantOf('2026-11-01', 90, NEW_YORK)).toEqual(1793511000000);
	});

	test.each([[''], [undefined], [null], ['2026-02-30'], ['2026-13-01'], ['15.06.2026'], ['abc']])(
		'returns null when the day is %p',
		(day) => {
			expect(instantOf(day, 900, BERLIN)).toBeNull();
		}
	);
});

describe('todayStart', () => {
	test('returns the midnight of the day of the clock in the zone', () => {
		const clock = { now: () => 1781562600000 };

		expect(todayStart(clock, BERLIN)).toEqual(instantOf('2026-06-16', 0, BERLIN));
		expect(todayStart(clock, NEW_YORK)).toEqual(instantOf('2026-06-15', 0, NEW_YORK));
	});

	test('returns a midnight that shows 00:00 in the zone', () => {
		const clock = { now: () => 1774790000000 };

		expect(timeInputValue(todayStart(clock, BERLIN), BERLIN)).toEqual('00:00');
	});
});

describe('addDays', () => {
	test('keeps 15:00 when the days cross the Berlin spring change', () => {
		const start = instantOf('2026-03-28', 900, BERLIN);

		const result = addDays(start, 1, BERLIN);

		expect(result).toEqual(1774789200000);
		expect(dayInputValue(result, BERLIN)).toEqual('2026-03-29');
		expect(timeInputValue(result, BERLIN)).toEqual('15:00');
	});

	test('keeps 15:00 when the days cross the Berlin autumn change', () => {
		const result = addDays(instantOf('2026-10-24', 900, BERLIN), 2, BERLIN);

		expect(dayInputValue(result, BERLIN)).toEqual('2026-10-26');
		expect(timeInputValue(result, BERLIN)).toEqual('15:00');
	});

	test('keeps 15:00 when the days cross the New York changes', () => {
		const spring = addDays(instantOf('2026-03-07', 900, NEW_YORK), 3, NEW_YORK);
		const autumn = addDays(instantOf('2026-11-02', 900, NEW_YORK), -3, NEW_YORK);

		expect(`${dayInputValue(spring, NEW_YORK)} ${timeInputValue(spring, NEW_YORK)}`).toEqual('2026-03-10 15:00');
		expect(`${dayInputValue(autumn, NEW_YORK)} ${timeInputValue(autumn, NEW_YORK)}`).toEqual('2026-10-30 15:00');
	});

	test('returns the same instant when days is 0', () => {
		const start = instantOf('2026-03-28', 900, BERLIN);

		expect(addDays(start, 0, BERLIN)).toEqual(start);
	});

	test('moves across month and year ends', () => {
		const result = addDays(instantOf('2026-12-31', 660, NEW_YORK), 1, NEW_YORK);

		expect(dayInputValue(result, NEW_YORK)).toEqual('2027-01-01');
		expect(timeInputValue(result, NEW_YORK)).toEqual('11:00');
	});
});

describe('stayInstants', () => {
	let settings;

	beforeEach(() => {
		settings = { timeZone: BERLIN, checkInMinutes: 900, checkOutMinutes: 660, currency: 'EUR' };
	});

	test('returns the instants at the standard check-in and check-out times', () => {
		const result = stayInstants({ arrivalDay: '2026-03-28', departureDay: '2026-03-30' }, settings);

		expect(result).toEqual({
			arrivalAt: instantOf('2026-03-28', 900, BERLIN),
			departureAt: instantOf('2026-03-30', 660, BERLIN)
		});
	});

	test.each([
		[{ arrivalDay: '', departureDay: '2026-03-30' }],
		[{ arrivalDay: '2026-03-28', departureDay: '' }],
		[{ arrivalDay: '2026-03-28' }],
		[{ arrivalDay: 'nonsense', departureDay: '2026-03-30' }]
	])('returns null when a day is empty or invalid in %p', (days) => {
		expect(stayInstants(days, settings)).toBeNull();
	});
});

describe('minutesToTimeInput and timeInputToMinutes', () => {
	test('returns 900 when the text is 15:00', () => {
		expect(timeInputToMinutes('15:00')).toEqual(900);
	});

	test('returns 11:00 when the minutes are 660', () => {
		expect(minutesToTimeInput(660)).toEqual('11:00');
	});

	test('returns padded text when the minutes are small', () => {
		expect(minutesToTimeInput(0)).toEqual('00:00');
		expect(minutesToTimeInput(65)).toEqual('01:05');
		expect(minutesToTimeInput(1439)).toEqual('23:59');
	});

	test.each([[''], ['25:00'], ['12:60'], ['9:00'], ['12'], ['12:5'], ['ab:cd'], ['12:00:00'], [null], [undefined], [900]])(
		'returns null when the text is %p',
		(text) => {
			expect(timeInputToMinutes(text)).toBeNull();
		}
	);

	test('returns whole minutes for the first and last minute of the day', () => {
		expect(timeInputToMinutes('00:00')).toEqual(0);
		expect(timeInputToMinutes('23:59')).toEqual(1439);
	});
});
