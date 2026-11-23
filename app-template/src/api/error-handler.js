import { ConflictError, NotFoundError, ValidationError } from '../domain/errors.js';

const INVALID_JSON_MESSAGE = 'The request body is not valid JSON.';
const SERVER_ERROR_MESSAGE = 'The server could not complete the request.';

const isBodyParseError = (error) =>
	error instanceof SyntaxError && error.status === 400;

export const errorResponseOf = (error) => {
	if (error instanceof ValidationError) {
		return { status: 400, body: { error: error.message } };
	}
	if (error instanceof NotFoundError) {
		return { status: 404, body: { error: error.message } };
	}
	if (error instanceof ConflictError) {
		return { status: 409, body: { error: error.message } };
	}
	if (isBodyParseError(error)) {
		return { status: 400, body: { error: INVALID_JSON_MESSAGE } };
	}
	return { status: 500, body: { error: SERVER_ERROR_MESSAGE } };
};

export const createErrorHandler = () => (error, request, response, next) => {
	const { status, body } = errorResponseOf(error);
	if (status === 500) {
		console.error(error);
	}
	if (response.headersSent) {
		next(error);
		return;
	}
	response.status(status).json(body);
};
