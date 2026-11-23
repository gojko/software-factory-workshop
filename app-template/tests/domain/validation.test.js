import { describe, expect, test } from '@jest/globals';
import { ValidationError } from '../../src/domain/errors.js';
import {
	requireEmail,
	requireInstant,
	requireText,
	requireWholeNumber
} from '../../src/domain/validation.js';

const refusal = (fn) => {
	try {
		fn();
	} catch (error) {
		return error;
	}
	return null;
};

describe('requireText', () => {
	test('returns the trimmed text when the value is text', () => {
		expect(requireText('  hello  ', 'Title')).toEqual('hello');
	});

	test.each([[42], [null], [undefined], [{}]])('throws ValidationError starting with the label when value is %p', (value) => {
		const error = refusal(() => requireText(value, 'Title'));

		expect(error).toBeInstanceOf(ValidationError);
		expect(error.message).toMatch(/^Title /);
	});

	test('throws ValidationError when the text is empty after trimming', () => {
		const error = refusal(() => requireText('   ', 'Title'));

		expect(error).toBeInstanceOf(ValidationError);
		expect(error.message).toMatch(/^Title /);
	});

	test('returns the text when its trimmed length equals maxLength', () => {
		expect(requireText(' abc ', 'Title', { maxLength: 3 })).toEqual('abc');
	});

	test('throws ValidationError when the trimmed text is longer than maxLength', () => {
		const error = refusal(() => requireText('abcd', 'Title', { maxLength: 3 }));

		expect(error).toBeInstanceOf(ValidationError);
		expect(error.message).toMatch(/^Title .*3/);
	});
});

describe('requireWholeNumber', () => {
	test('returns the number when it is whole and in range', () => {
		expect(requireWholeNumber(5, 'Count', { min: 1, max: 10 })).toEqual(5);
	});

	test('returns the number when it equals the bounds', () => {
		expect(requireWholeNumber(1, 'Count', { min: 1, max: 10 })).toEqual(1);
		expect(requireWholeNumber(10, 'Count', { min: 1, max: 10 })).toEqual(10);
	});

	test('returns the number when no range is given', () => {
		expect(requireWholeNumber(-7, 'Count')).toEqual(-7);
	});

	test.each([['5'], [null], [undefined], [1.5], [NaN], [Infinity], [true]])('throws ValidationError starting with the label when value is %p', (value) => {
		const error = refusal(() => requireWholeNumber(value, 'Count', { min: 0, max: 10 }));

		expect(error).toBeInstanceOf(ValidationError);
		expect(error.message).toMatch(/^Count /);
	});

	test('throws ValidationError when the number is below min', () => {
		const error = refusal(() => requireWholeNumber(0, 'Count', { min: 1, max: 10 }));

		expect(error).toBeInstanceOf(ValidationError);
		expect(error.message).toMatch(/^Count .*1/);
	});

	test('throws ValidationError when the number is above max', () => {
		const error = refusal(() => requireWholeNumber(11, 'Count', { min: 1, max: 10 }));

		expect(error).toBeInstanceOf(ValidationError);
		expect(error.message).toMatch(/^Count .*10/);
	});
});

describe('requireEmail', () => {
	test('returns the address when it has the form name@host.tld', () => {
		expect(requireEmail('anna@example.com', 'Email')).toEqual('anna@example.com');
	});

	test.each([['plain'], ['a@b'], ['@example.com'], ['a@.com'], ['a b@example.com'], ['a@exa mple.com'], [42], [null]])('throws ValidationError starting with the label when value is %p', (value) => {
		const error = refusal(() => requireEmail(value, 'Email'));

		expect(error).toBeInstanceOf(ValidationError);
		expect(error.message).toMatch(/^Email /);
	});

	test('returns the address when it is 254 characters long', () => {
		const address = `${'a'.repeat(254 - '@example.com'.length)}@example.com`;

		expect(requireEmail(address, 'Email')).toEqual(address);
	});

	test('throws ValidationError when the address is longer than 254 characters', () => {
		const address = `${'a'.repeat(255 - '@example.com'.length)}@example.com`;

		const error = refusal(() => requireEmail(address, 'Email'));

		expect(error).toBeInstanceOf(ValidationError);
		expect(error.message).toMatch(/^Email .*254/);
	});
});

describe('requireInstant', () => {
	test.each([[0], [1700000000000]])('returns %p when it is a non-negative whole number', (value) => {
		expect(requireInstant(value, 'Start')).toEqual(value);
	});

	test.each([[-1], [1.5], ['1700000000000'], [null], [NaN]])('throws ValidationError starting with the label when value is %p', (value) => {
		const error = refusal(() => requireInstant(value, 'Start'));

		expect(error).toBeInstanceOf(ValidationError);
		expect(error.message).toMatch(/^Start /);
	});
});
