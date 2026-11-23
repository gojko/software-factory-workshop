const toRoomType = (row) =>
	row && {
		id: row.id,
		name: row.name,
		maxOccupancy: row.max_occupancy,
		baseRateCents: row.base_rate_cents,
		extraGuestCents: row.extra_guest_cents
	};

export const createRoomTypeRepository = function (database) {
	const selectAll = database.prepare('SELECT * FROM room_types ORDER BY name COLLATE NOCASE, id');
	const selectCount = database.prepare('SELECT COUNT(*) AS n FROM room_types');
	const selectById = database.prepare('SELECT * FROM room_types WHERE id = ?');
	const selectByName = database.prepare('SELECT * FROM room_types WHERE name = ? COLLATE NOCASE');
	const insertRow = database.prepare(
		`INSERT INTO room_types (name, max_occupancy, base_rate_cents, extra_guest_cents)
		VALUES (?, ?, ?, ?)`
	);
	const updateRow = database.prepare(
		`UPDATE room_types
		SET name = ?, max_occupancy = ?, base_rate_cents = ?, extra_guest_cents = ?
		WHERE id = ?`
	);
	const updateRate = database.prepare('UPDATE room_types SET base_rate_cents = ? WHERE id = ?');
	const deleteRow = database.prepare('DELETE FROM room_types WHERE id = ?');

	const findById = (id) => toRoomType(selectById.get(id));

	return {
		list: () => selectAll.all().map(toRoomType),
		count: () => selectCount.get().n,
		findById,
		findByName: (name) => toRoomType(selectByName.get(name)),
		insert(fields) {
			const { lastInsertRowid } = insertRow.run(
				fields.name,
				fields.maxOccupancy,
				fields.baseRateCents,
				fields.extraGuestCents
			);
			return findById(Number(lastInsertRowid));
		},
		update(id, fields) {
			updateRow.run(
				fields.name,
				fields.maxOccupancy,
				fields.baseRateCents,
				fields.extraGuestCents,
				id
			);
			return findById(id);
		},
		updateBaseRate(id, baseRateCents) {
			updateRate.run(baseRateCents, id);
			return findById(id);
		},
		remove(id) {
			deleteRow.run(id);
		}
	};
};
