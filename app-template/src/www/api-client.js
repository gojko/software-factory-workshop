export class ApiError extends Error {
	constructor(status, message) {
		super(message);
		this.name = 'ApiError';
		this.status = status;
	}
}

function withQuery(path, query) {
	if (!query) return path;
	const params = new URLSearchParams();
	for (const [key, value] of Object.entries(query)) {
		if (value !== undefined && value !== null) params.append(key, String(value));
	}
	const text = params.toString();
	return text ? `${path}?${text}` : path;
}

async function readBody(response) {
	try {
		return await response.json();
	} catch {
		return null;
	}
}

export function createApiClient(fetchFunction = (...args) => globalThis.fetch(...args)) {
	async function request(method, path, body) {
		const options = { method, headers: { Accept: 'application/json' } };
		if (body !== undefined) {
			options.headers['Content-Type'] = 'application/json';
			options.body = JSON.stringify(body);
		}
		const response = await fetchFunction(path, options);
		if (response.status === 204) return null;
		const parsed = await readBody(response);
		if (!response.ok) {
			const message = parsed && typeof parsed.error === 'string' && parsed.error
				? parsed.error
				: `Request failed with status ${response.status}`;
			throw new ApiError(response.status, message);
		}
		return parsed;
	}

	return {
		get: (path, query) => request('GET', withQuery(path, query)),
		send: (method, path, body) => request(method, path, body)
	};
}
