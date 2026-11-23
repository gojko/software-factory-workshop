import { Router } from 'express';

export const createSettingsRouter = function (settingsService) {
	const router = Router();
	router.get('/api/settings', (request, response) => {
		response.json(settingsService.get());
	});
	router.put('/api/settings', (request, response) => {
		response.json(settingsService.update(request.body));
	});
	return router;
};
