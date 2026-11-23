import { createApiClient } from '../api-client.js';
import { mountNav } from '../nav.js';
import { createSearchState } from '../search.js';
import { mountSearchScreen } from '../screens/search-screen.js';
import { createStore } from '../store.js';

const api = createApiClient();
const root = document.getElementById('search-widget');

mountNav('/search.html');

try {
	const settings = await api.get('/api/settings');
	const clock = Date;
	const store = createStore(createSearchState(clock, settings));
	mountSearchScreen(root, { store, api, clock });
} catch (error) {
	const message = document.createElement('p');
	message.setAttribute('role', 'status');
	message.setAttribute('data-kind', 'error');
	message.textContent = (error && error.message) || 'Something went wrong';
	root.replaceChildren(message);
}
