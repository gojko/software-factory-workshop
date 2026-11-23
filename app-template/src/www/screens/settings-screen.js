import { minutesToTimeInput } from '../dates.js';
import { saveSettings } from '../settings-commands.js';

const element = (tag, attributes = {}, text) => {
	const node = document.createElement(tag);
	for (const [name, value] of Object.entries(attributes)) {
		node.setAttribute(name, value);
	}
	if (text !== undefined) node.textContent = text;
	return node;
};

const datalist = (id, values) => {
	const list = element('datalist', { id });
	list.append(...values.map((value) => element('option', { value })));
	return list;
};

const labelled = (label, input) => {
	const wrapper = element('label', {}, label);
	wrapper.append(input);
	return wrapper;
};

export function mountSettingsScreen(root, { store, api }) {
	const timeZone = element('input', {
		name: 'timeZone',
		type: 'text',
		list: 'settings-time-zones',
		required: '',
		autocomplete: 'off'
	});
	const checkIn = element('input', { name: 'checkIn', type: 'time', required: '' });
	const checkOut = element('input', { name: 'checkOut', type: 'time', required: '' });
	const currency = element('input', {
		name: 'currency',
		type: 'text',
		list: 'settings-currencies',
		required: '',
		autocomplete: 'off'
	});

	const form = element('form', { class: 'hotel-settings' });
	form.append(
		labelled('Time zone', timeZone),
		datalist('settings-time-zones', Intl.supportedValuesOf('timeZone')),
		labelled('Check-in time', checkIn),
		labelled('Check-out time', checkOut),
		labelled('Currency', currency),
		datalist('settings-currencies', Intl.supportedValuesOf('currency')),
		element('button', { type: 'submit' }, 'Save')
	);
	const note = element(
		'p',
		{ class: 'note' },
		"The time zone decides today's date and the nights of a stay."
	);
	const status = element('p', { role: 'status' });

	root.replaceChildren(form, note, status);

	form.addEventListener('submit', async (event) => {
		event.preventDefault();
		await saveSettings(store, api, {
			timeZone: timeZone.value,
			checkIn: checkIn.value,
			checkOut: checkOut.value,
			currency: currency.value
		});
	});

	let shown = null;
	const render = (state) => {
		if (state.settings !== shown) {
			shown = state.settings;
			if (shown) {
				timeZone.value = shown.timeZone;
				checkIn.value = minutesToTimeInput(shown.checkInMinutes);
				checkOut.value = minutesToTimeInput(shown.checkOutMinutes);
				currency.value = shown.currency;
			}
		}
		status.textContent = state.settingsStatus ? state.settingsStatus.message : '';
		if (state.settingsStatus) {
			status.setAttribute('data-kind', state.settingsStatus.kind);
		} else {
			status.removeAttribute('data-kind');
		}
	};

	render(store.getState());
	return store.subscribe(render);
}
