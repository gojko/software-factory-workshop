import { createApp } from '../src/app.js';

const HOST = '127.0.0.1';

export default async function () {
	const server = createApp().listen(0, HOST);
	await new Promise((resolve) => server.once('listening', resolve));
	globalThis.integrationServer = server;
	process.env.APP_URL = `http://${HOST}:${server.address().port}`;
}
