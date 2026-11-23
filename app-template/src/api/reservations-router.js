import { Router } from 'express';
import { ValidationError } from '../domain/errors.js';

export const createReservationsRouter = function (bookingService, lookupService) {
	const router = Router();
	router.post('/api/reservations', (request, response) => {
		response.status(201).json(bookingService.book(request.body));
	});
	router.get('/api/reservations', (request, response) => {
		const { query, from } = request.query;
		if ((query === undefined) === (from === undefined)) {
			throw new ValidationError('give exactly one of query and from');
		}
		response.json(query === undefined ? lookupService.listFrom(Number(from)) : lookupService.find(query));
	});
	return router;
};
