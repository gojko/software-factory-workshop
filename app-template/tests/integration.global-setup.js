import { createApp } from '../src/app.js';
import { openDatabase } from '../src/db/open-database.js';
import { buildFrontend } from '../src/www/build.js';

const HOST = '127.0.0.1';

export default async function () {
	await buildFrontend();
	const database = openDatabase(':memory:');
	const server = createApp(database).listen(0, HOST);
	await new Promise((resolve) => server.once('listening', resolve));
	globalThis.integrationServer = server;
	process.env.APP_URL = `http://${HOST}:${server.address().port}`;
}
