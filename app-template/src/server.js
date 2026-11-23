import { createApp } from './app.js';
import { openDatabase } from './db/open-database.js';

const HOST = '0.0.0.0';
const DEFAULT_DB_FILE = 'data/hotel.db';

const port = Number(process.env.CONTAINER_PORT);

if (!port) {
	console.error('Set CONTAINER_PORT to the port the app listens on.');
	process.exit(1);
}

const database = openDatabase(process.env.DB_FILE || DEFAULT_DB_FILE);

createApp(database).listen(port, HOST, () => {
	console.log(`The app is running on port ${port}`);
});
