
const ROOMS_TAB_URL = '/rooms.html#room-ranges';
const SEARCH_URL = '/search.html';
const GREETING_FALLBACK = 'The greeting could not be loaded.';

export function screenForSetupState(state) {
	if (state === 'needs-rooms') return 'rooms';
	if (state === 'ready') return 'search';
	return 'hello';
}

const showHello = async (root, api) => {
	const heading = root.querySelector('#greeting');
	if (!heading) return;
	try {
		const { message } = await api.get('/api/greeting');
		heading.textContent = message;
	} catch {
		heading.textContent = GREETING_FALLBACK;
	}
};

const readScreen = async (api) => {
	try {
		const { state } = await api.get('/api/setup-state');
		return screenForSetupState(state);
	} catch {
		return 'hello';
	}
};

const redirect = (url) => window.location.replace(url);

export async function mountLanding(root, { api, navigate = redirect }) {
	const screen = await readScreen(api);

	if (screen === 'rooms') {
		navigate(ROOMS_TAB_URL);
		return;
	}
	if (screen === 'search') {
		navigate(SEARCH_URL);
		return;
	}
	await showHello(root, api);
}
