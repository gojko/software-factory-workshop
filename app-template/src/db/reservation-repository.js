const SELECT_RESERVATION = `
SELECT
	reservations.code AS code,
	reservations.room_number AS roomNumber,
	reservations.room_type_id AS roomTypeId,
	room_types.name AS roomTypeName,
	reservations.arrival_at AS arrivalAt,
	reservations.departure_at AS departureAt,
	reservations.nights AS nights,
	reservations.guests AS guests,
	reservations.guest_name AS guestName,
	reservations.guest_email AS guestEmail,
	reservations.status AS status,
	reservations.total_cents AS totalCents
FROM reservations
JOIN room_types ON room_types.id = reservations.room_type_id
`;

const toReservation = (row) => ({ ...row });
const escapeLike = (text) => text.replace(/[\\%_]/g, (character) => `\\${character}`);

export const createReservationRepository = function (database) {
	const insertRow = database.prepare(
		`INSERT INTO reservations (
			code, room_number, room_type_id, arrival_at, departure_at, nights, guests,
			guest_name, guest_email, status, total_cents
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
	);
	const selectByCode = database.prepare(`${SELECT_RESERVATION} WHERE reservations.code = ?`);
	const selectCodeExists = database.prepare('SELECT 1 AS found FROM reservations WHERE code = ?');
	const selectByGuestName = database.prepare(
		`${SELECT_RESERVATION}
		WHERE reservations.guest_name LIKE ? ESCAPE '\\'
		ORDER BY reservations.arrival_at, reservations.room_number`
	);
	const selectFromArrival = database.prepare(
		`${SELECT_RESERVATION}
		WHERE reservations.arrival_at >= ?
		ORDER BY reservations.arrival_at, reservations.room_number`
	);
	const selectExistsForRoomType = database.prepare(
		'SELECT 1 AS found FROM reservations WHERE room_type_id = ? LIMIT 1'
	);
	const selectByRoomNumbers = database.prepare(
		`${SELECT_RESERVATION}
		WHERE reservations.room_number BETWEEN ? AND ?
		ORDER BY reservations.room_number, reservations.arrival_at`
	);
	const selectConfirmedOverlapping = database.prepare(
		`${SELECT_RESERVATION}
		WHERE reservations.status = 'Confirmed'
			AND reservations.arrival_at < ?
			AND reservations.departure_at > ?
		ORDER BY reservations.arrival_at, reservations.room_number`
	);

	return {
		insert(fields) {
			insertRow.run(
				fields.code,
				fields.roomNumber,
				fields.roomTypeId,
				fields.arrivalAt,
				fields.departureAt,
				fields.nights,
				fields.guests,
				fields.guestName,
				fields.guestEmail,
				fields.status,
				fields.totalCents
			);
			return toReservation(selectByCode.get(fields.code));
		},
		existsForRoomType(roomTypeId) {
			return selectExistsForRoomType.get(roomTypeId) !== undefined;
		},
		findConfirmedOverlapping(arrivalAt, departureAt) {
			return selectConfirmedOverlapping.all(departureAt, arrivalAt).map(toReservation);
		},
		codeExists(code) {
			return selectCodeExists.get(code) !== undefined;
		},
		findByCode(code) {
			const row = selectByCode.get(code);
			return row === undefined ? undefined : toReservation(row);
		},
		searchByGuestName(text) {
			return selectByGuestName.all(`%${escapeLike(text)}%`).map(toReservation);
		},
		listFromArrival(fromAt) {
			return selectFromArrival.all(fromAt).map(toReservation);
		},
		findByRoomNumbers(first, last) {
			return selectByRoomNumbers.all(first, last).map(toReservation);
		}
	};
};
