const toRoom = (row) => ({ number: row.number, roomTypeId: row.room_type_id });

export const createRoomRepository = function (database) {
	const selectAll = database.prepare('SELECT number, room_type_id FROM rooms ORDER BY number');
	const selectCount = database.prepare('SELECT COUNT(*) AS total FROM rooms');
	const selectInRange = database.prepare(
		'SELECT number, room_type_id FROM rooms WHERE number >= ? AND number <= ? ORDER BY number'
	);
	const upsert = database.prepare(
		`INSERT INTO rooms (number, room_type_id) VALUES (?, ?)
		ON CONFLICT (number) DO UPDATE SET room_type_id = excluded.room_type_id`
	);
	const deleteInRange = database.prepare('DELETE FROM rooms WHERE number >= ? AND number <= ?');
	const deleteByRoomType = database.prepare('DELETE FROM rooms WHERE room_type_id = ?');
	return {
		list: () => selectAll.all().map(toRoom),
		count: () => selectCount.get().total,
		findInRange: (first, last) => selectInRange.all(first, last).map(toRoom),
		upsert(number, roomTypeId) {
			upsert.run(number, roomTypeId);
		},
		removeInRange(first, last) {
			deleteInRange.run(first, last);
		},
		removeByRoomType(roomTypeId) {
			deleteByRoomType.run(roomTypeId);
		}
	};
};
