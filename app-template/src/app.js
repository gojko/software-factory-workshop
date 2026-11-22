import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { createGreeting } from './greeting.js';

const PUBLIC_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');

export const createApp = function () {
	const app = express();
	app.get('/api/greeting', (request, response) => {
		response.json(createGreeting());
	});
	app.use(express.static(PUBLIC_DIR));
	return app;
};
