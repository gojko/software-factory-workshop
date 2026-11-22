export default async function () {
	const server = globalThis.integrationServer;
	await new Promise((resolve) => server.close(resolve));
}
