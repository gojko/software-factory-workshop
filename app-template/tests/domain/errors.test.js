import { randomUUID } from 'node:crypto';
import { describe, expect, test } from '@jest/globals';
import { ConflictError, NotFoundError, ValidationError } from '../../src/domain/errors.js';

describe.each([
	['ValidationError', ValidationError],
	['ConflictError', ConflictError],
	['NotFoundError', NotFoundError]
])('%s', (name, ErrorType) => {
	test('keeps its message', () => {
		const message = randomUUID();

		const underTest = new ErrorType(message);

		expect(underTest.message).toEqual(message);
	});

	test('sets its own name', () => {
		const underTest = new ErrorType(randomUUID());

		expect(underTest.name).toEqual(name);
	});

	test('is an Error', () => {
		const underTest = new ErrorType(randomUUID());

		expect(underTest).toBeInstanceOf(Error);
		expect(underTest).toBeInstanceOf(ErrorType);
	});
});
