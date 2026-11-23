import { createApiClient } from '../api-client.js';
import { loadRanges } from '../room-commands.js';
import { loadRoomTypes } from '../room-type-commands.js';
import { mountNav } from '../nav.js';
import { mountSectionMenu } from '../section-menu.js';
import { mountRoomsScreen } from '../screens/rooms-screen.js';
import { mountRoomTypesScreen } from '../screens/room-types-screen.js';
import { mountSettingsScreen } from '../screens/settings-screen.js';
import { createRoomsState, loadSettings } from '../settings-commands.js';
import { createStore } from '../store.js';

const store = createStore(createRoomsState());
const api = createApiClient();

mountNav('/rooms.html');
mountSectionMenu(document.getElementById('section-menu'), [
	{ id: 'hotel-settings', label: 'General' },
	{ id: 'room-types', label: 'Room types' },
	{ id: 'room-ranges', label: 'Room ranges' }
]);
mountRoomTypesScreen(document.getElementById('room-types-widget'), { store, api });
mountRoomsScreen(document.getElementById('room-ranges-widget'), { store, api });
mountSettingsScreen(document.getElementById('settings-widget'), { store, api });

loadSettings(store, api);
loadRoomTypes(store, api);
loadRanges(store, api);
