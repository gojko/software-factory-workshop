import { describe, expect, test } from '@jest/globals';
import { formatCents, parseAmountToCents } from '../../src/www/money.js';

describe('parseAmountToCents', () => {
	test.each([
		['89', 8900],
		['89.5', 8950],
		['89.50', 8950],
		['89,50', 8950],
		['0,5', 50],
		['  12.05 ', 1205],
		['0.07', 7],
		['19.99', 1999]
	])('returns %s as %d cents', (text, cents) => {
		expect(parseAmountToCents(text)).toEqual(cents);
	});

	test.each([[''], ['   '], ['-5'], ['-0.50'], ['1.234'], ['abc'], ['12abc'], ['1.2.3'], ['.'], ['1e3']])(
		'returns null when text is %p',
		(text) => {
			expect(parseAmountToCents(text)).toBeNull();
		}
	);

	test('returns null when the value is not a string', () => {
		expect(parseAmountToCents(undefined)).toBeNull();
	});
});

describe('formatCents', () => {
	test('shows 19.99 with the euro sign when currency is EUR', () => {
		const result = formatCents(1999, { currency: 'EUR', locale: 'en' });

		expect(result).toEqual('€19.99');
	});

	test('shows the dollar sign when currency is USD', () => {
		const result = formatCents(1999, { currency: 'USD', locale: 'en' });

		expect(result).toEqual('$19.99');
	});

	test('shows 0.05 when the amount is 5 cents', () => {
		expect(formatCents(5, { currency: 'USD', locale: 'en' })).toEqual('$0.05');
	});

	test('shows two decimals when the amount is whole units', () => {
		expect(formatCents(8900, { currency: 'USD', locale: 'en' })).toEqual('$89.00');
	});

	test('throws error when currency is missing', () => {
		expect(() => formatCents(100, {})).toThrow();
	});
});
