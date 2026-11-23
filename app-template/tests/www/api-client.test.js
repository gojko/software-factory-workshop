import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { ApiError, createApiClient } from '../../src/www/api-client.js';

function jsonResponse(status, body) {
	return {
		ok: status >= 200 && status < 300,
		status,
		json: async () => {
			if (body === undefined) throw new Error('no body');
			return body;
		}
	};
}

describe('createApiClient', () => {
	let fetchFunction;
	let underTest;

	beforeEach(() => {
		fetchFunction = jest.fn();
		underTest = createApiClient(fetchFunction);
	});

	test('returns parsed JSON when get answers 200', async () => {
		const body = { id: randomUUID() };
		fetchFunction.mockResolvedValue(jsonResponse(200, body));

		const result = await underTest.get('/api/rooms');

		expect(result).toEqual(body);
		expect(fetchFunction).toHaveBeenCalledWith('/api/rooms', expect.objectContaining({ method: 'GET' }));
	});

	test('appends the query string when get has a query', async () => {
		fetchFunction.mockResolvedValue(jsonResponse(200, []));

		await underTest.get('/api/rooms', { from: '2026-01-01', to: '2026-01-05', skip: undefined });

		expect(fetchFunction).toHaveBeenCalledWith(
			'/api/rooms?from=2026-01-01&to=2026-01-05',
			expect.anything()
		);
	});

	test('sends the body as JSON when send has a body', async () => {
		const body = { name: randomUUID() };
		fetchFunction.mockResolvedValue(jsonResponse(201, { id: 1 }));

		const result = await underTest.send('POST', '/api/rooms', body);

		expect(result).toEqual({ id: 1 });
		expect(fetchFunction).toHaveBeenCalledWith(
			'/api/rooms',
			expect.objectContaining({
				method: 'POST',
				body: JSON.stringify(body),
				headers: expect.objectContaining({ 'Content-Type': 'application/json' })
			})
		);
	});

	test('sends no body when send has none', async () => {
		fetchFunction.mockResolvedValue(jsonResponse(204));

		await underTest.send('DELETE', '/api/rooms/1');

		expect(fetchFunction.mock.calls[0][1].body).toBeUndefined();
	});

	test('returns null when the answer has status 204', async () => {
		fetchFunction.mockResolvedValue(jsonResponse(204));

		expect(await underTest.send('DELETE', '/api/rooms/1')).toBeNull();
	});

	test('throws ApiError with status and error text when the answer is bad', async () => {
		const message = randomUUID();
		fetchFunction.mockResolvedValue(jsonResponse(409, { error: message }));

		const error = await underTest.send('POST', '/api/rooms', {}).catch((e) => e);

		expect(error).toBeInstanceOf(ApiError);
		expect(error).toEqual(expect.objectContaining({ status: 409, message }));
	});

	test('throws ApiError with a generic message when the bad answer has no error text', async () => {
		fetchFunction.mockResolvedValue(jsonResponse(500));

		const error = await underTest.get('/api/rooms').catch((e) => e);

		expect(error).toBeInstanceOf(ApiError);
		expect(error.status).toEqual(500);
		expect(error.message.length).toBeGreaterThan(0);
	});
});
