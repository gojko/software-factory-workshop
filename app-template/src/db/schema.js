const SCHEMA = `
CREATE TABLE IF NOT EXISTS room_types (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	name TEXT NOT NULL UNIQUE COLLATE NOCASE,
	max_occupancy INTEGER NOT NULL,
	base_rate_cents INTEGER NOT NULL,
	extra_guest_cents INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS rooms (
	number INTEGER PRIMARY KEY,
	room_type_id INTEGER NOT NULL REFERENCES room_types (id)
);

CREATE TABLE IF NOT EXISTS hotel_settings (
	id INTEGER PRIMARY KEY CHECK (id = 1),
	time_zone TEXT NOT NULL,
	check_in_minutes INTEGER NOT NULL,
	check_out_minutes INTEGER NOT NULL,
	currency TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS reservations (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	code TEXT NOT NULL UNIQUE,
	room_number INTEGER NOT NULL REFERENCES rooms (number),
	room_type_id INTEGER NOT NULL REFERENCES room_types (id),
	arrival_at INTEGER NOT NULL,
	departure_at INTEGER NOT NULL,
	nights INTEGER NOT NULL,
	guests INTEGER NOT NULL,
	guest_name TEXT NOT NULL,
	guest_email TEXT NOT NULL,
	status TEXT NOT NULL,
	total_cents INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS reservations_arrival_at ON reservations (arrival_at);
CREATE INDEX IF NOT EXISTS reservations_room_stay
	ON reservations (room_number, arrival_at, departure_at);
`;

const DEFAULT_CHECK_IN_MINUTES = 900;
const DEFAULT_CHECK_OUT_MINUTES = 660;
const DEFAULT_CURRENCY = 'EUR';

export const applySchema = function (database) {
	database.exec(SCHEMA);
	database
		.prepare(
			`INSERT INTO hotel_settings (id, time_zone, check_in_minutes, check_out_minutes, currency)
			SELECT 1, ?, ?, ?, ?
			WHERE NOT EXISTS (SELECT 1 FROM hotel_settings)`
		)
		.run(
			Intl.DateTimeFormat().resolvedOptions().timeZone,
			DEFAULT_CHECK_IN_MINUTES,
			DEFAULT_CHECK_OUT_MINUTES,
			DEFAULT_CURRENCY
		);
};
