import { createApiClient } from '../api-client.js';
import { createLookupState } from '../lookup.js';
import { mountNav } from '../nav.js';
import { mountReservationsScreen } from '../screens/reservations-screen.js';
import { createStore } from '../store.js';

const api = createApiClient();
const root = document.getElementById('reservations-widget');

mountNav('/reservations.html');

try {
	const settings = await api.get('/api/settings');
	const clock = Date;
	const store = createStore(createLookupState(clock, settings));
	mountReservationsScreen(root, { store, api, clock });
} catch (error) {
	const message = document.createElement('p');
	message.setAttribute('role', 'status');
	message.setAttribute('data-kind', 'error');
	message.textContent = (error && error.message) || 'Something went wrong';
	root.replaceChildren(message);
}
