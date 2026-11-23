export function createStore(initialState) {
	let state = { ...initialState };
	const listeners = new Set();

	function getState() {
		return state;
	}

	function setState(change) {
		const patch = typeof change === 'function' ? change(state) : change;
		state = { ...state, ...patch };
		const current = state;
		for (const listener of [...listeners]) {
			if (listeners.has(listener)) {
				listener(current);
			}
		}
	}

	function subscribe(listener) {
		const entry = (value) => listener(value);
		listeners.add(entry);
		return () => {
			listeners.delete(entry);
		};
	}

	return { getState, setState, subscribe };
}
