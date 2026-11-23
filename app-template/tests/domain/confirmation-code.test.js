import { describe, expect, test } from '@jest/globals';
import { generateConfirmationCode } from '../../src/domain/confirmation-code.js';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

describe('generateConfirmationCode', () => {
	test('returns 6 characters when called with the default randomInt', () => {
		const underTest = generateConfirmationCode();

		expect(underTest).toHaveLength(6);
	});

	test('returns a known code when randomInt is fixed', () => {
		const randomInt = sequenceOf([0, 1, 2, 31, 8, 9]);

		const underTest = generateConfirmationCode(randomInt);

		expect(underTest).toEqual('ABC9JK');
	});

	test('asks randomInt for a number below the alphabet size', () => {
		const seen = [];

		generateConfirmationCode((max) => {
			seen.push(max);
			return 0;
		});

		expect(seen).toEqual(Array(6).fill(ALPHABET.length));
	});

	test('returns only alphabet characters over 1000 draws with the default randomInt', () => {
		const codes = Array.from({ length: 1000 }, () => generateConfirmationCode());

		const characters = codes.join('');

		expect(characters).toHaveLength(6000);
		expect([...characters].every((character) => ALPHABET.includes(character))).toEqual(true);
	});
});

function sequenceOf(values) {
	let index = 0;
	return () => values[index++];
}
