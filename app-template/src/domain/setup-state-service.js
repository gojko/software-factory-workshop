export const createSetupStateService = function ({ roomTypes, rooms }) {
	const state = () => {
		if (roomTypes.count() === 0) {
			return { state: 'unconfigured' };
		}
		if (rooms.count() === 0) {
			return { state: 'needs-rooms' };
		}
		return { state: 'ready' };
	};

	return { state };
};
