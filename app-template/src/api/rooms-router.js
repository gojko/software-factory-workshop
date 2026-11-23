import { Router } from 'express';

export const createRoomsRouter = function (roomService) {
	const router = Router();
	router.get('/api/rooms', (request, response) => {
		response.json(roomService.list());
	});
	router.get('/api/room-ranges', (request, response) => {
		response.json(roomService.listRanges());
	});
	router.put('/api/room-ranges', (request, response) => {
		response.json(roomService.setRange(request.body));
	});
	router.delete('/api/room-ranges', (request, response) => {
		roomService.removeRange({
			first: Number(request.query.first),
			last: Number(request.query.last)
		});
		response.status(204).end();
	});
	return router;
};
