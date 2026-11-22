import { randomUUID } from 'node:crypto';
import { describe, expect, test } from '@jest/globals';
import { createGreeting as underTest } from '../src/greeting.js';

describe('createGreeting', () => {
	test('returns a greeting for the world when no name is given', () => {
		expect(underTest()).toEqual({ message: 'Hello, world!' });
	});

	test('returns a greeting with the name when a name is given', () => {
		const name = randomUUID();

		const result = underTest(name);

		expect(result).toEqual({ message: `Hello, ${name}!` });
	});
});
