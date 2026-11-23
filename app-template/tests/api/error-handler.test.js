import { randomUUID } from 'node:crypto';
import { describe, expect, test } from '@jest/globals';
import { errorResponseOf } from '../../src/api/error-handler.js';
import { ConflictError, NotFoundError, ValidationError } from '../../src/domain/errors.js';

describe('errorResponseOf', () => {
	test.each([
		['ValidationError', ValidationError, 400],
		['NotFoundError', NotFoundError, 404],
		['ConflictError', ConflictError, 409]
	])('returns the message with the status of a %s', (name, ErrorType, status) => {
		const message = randomUUID();

		const underTest = errorResponseOf(new ErrorType(message));

		expect(underTest).toEqual({ status, body: { error: message } });
	});

	test('returns 400 with a fixed message when the body parser failed on invalid JSON', () => {
		const error = Object.assign(new SyntaxError(randomUUID()), { status: 400, type: 'entity.parse.failed' });

		const underTest = errorResponseOf(error);

		expect(underTest).toEqual({
			status: 400,
			body: { error: 'The request body is not valid JSON.' }
		});
	});

	test('returns 500 with a fixed message when the error is unknown', () => {
		const underTest = errorResponseOf(new Error(randomUUID()));

		expect(underTest).toEqual({
			status: 500,
			body: { error: 'The server could not complete the request.' }
		});
	});

	test('returns 500 without the real error text when the error is unknown', () => {
		const secret = randomUUID();

		const underTest = errorResponseOf(new Error(secret));

		expect(JSON.stringify(underTest)).not.toContain(secret);
	});

	test('returns 500 when the thrown value is not an error', () => {
		const underTest = errorResponseOf(undefined);

		expect(underTest.status).toEqual(500);
	});
});
