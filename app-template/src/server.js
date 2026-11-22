import { createApp } from './app.js';

const HOST = '0.0.0.0';

const port = Number(process.env.CONTAINER_PORT);

if (!port) {
	console.error('Set CONTAINER_PORT to the port the app listens on.');
	process.exit(1);
}

createApp().listen(port, HOST, () => {
	console.log(`The app is running on port ${port}`);
});
