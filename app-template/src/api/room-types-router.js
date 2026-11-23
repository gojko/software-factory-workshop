import { Router } from 'express';
import { NotFoundError } from '../domain/errors.js';

const toId = (text) => {
	if (!/^\d{1,15}$/.test(text)) {
		throw new NotFoundError(`room type ${text} does not exist`);
	}
	return Number(text);
};

export const createRoomTypesRouter = function (roomTypeService) {
	const router = Router();
	router.get('/api/room-types', (request, response) => {
		response.json(roomTypeService.list());
	});
	router.post('/api/room-types', (request, response) => {
		response.status(201).json(roomTypeService.add(request.body));
	});
	router.put('/api/room-types/:id', (request, response) => {
		response.json(roomTypeService.update(toId(request.params.id), request.body));
	});
	router.put('/api/room-types/:id/base-rate', (request, response) => {
		const { baseRateCents } = request.body ?? {};
		response.json(roomTypeService.updateBaseRate(toId(request.params.id), baseRateCents));
	});
	router.delete('/api/room-types/:id', (request, response) => {
		roomTypeService.remove(toId(request.params.id));
		response.status(204).end();
	});
	return router;
};
