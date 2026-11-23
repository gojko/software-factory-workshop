const toSettings = (row) => ({
	timeZone: row.time_zone,
	checkInMinutes: row.check_in_minutes,
	checkOutMinutes: row.check_out_minutes,
	currency: row.currency
});

export const createSettingsRepository = function (database) {
	const select = database.prepare('SELECT * FROM hotel_settings WHERE id = 1');
	const update = database.prepare(
		`UPDATE hotel_settings
		SET time_zone = ?, check_in_minutes = ?, check_out_minutes = ?, currency = ?
		WHERE id = 1`
	);
	const get = () => toSettings(select.get());
	return {
		get,
		update(fields) {
			update.run(fields.timeZone, fields.checkInMinutes, fields.checkOutMinutes, fields.currency);
			return get();
		}
	};
};
