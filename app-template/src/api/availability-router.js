import { Router } from 'express';

export const createAvailabilityRouter = function (availabilityService) {
	const router = Router();
	router.get('/api/availability', (request, response) => {
		response.json(
			availabilityService.search({
				arrivalAt: Number(request.query.arrivalAt),
				departureAt: Number(request.query.departureAt),
				guests: Number(request.query.guests)
			})
		);
	});
	return router;
};
