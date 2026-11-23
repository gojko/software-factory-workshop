import { Router } from 'express';

export const createSetupRouter = function (setupStateService) {
	const router = Router();
	router.get('/api/setup-state', (request, response) => {
		response.json(setupStateService.state());
	});
	return router;
};
