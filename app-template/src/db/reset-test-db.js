import { rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { openDatabase } from './open-database.js';
import { seedTestData } from './seed.js';

const DEFAULT_FILE = 'data/hotel.db';
const COMPANION_SUFFIXES = ['', '-journal', '-wal', '-shm'];

const count = (database, table) => database.prepare(`SELECT COUNT(*) AS total FROM ${table}`).get().total;

export const resetTestDatabase = function (file) {
	for (const suffix of COMPANION_SUFFIXES) {
		rmSync(`${file}${suffix}`, { force: true });
	}
	const database = openDatabase(file);
	try {
		seedTestData(database);
		return {
			file,
			roomTypes: count(database, 'room_types'),
			rooms: count(database, 'rooms'),
			reservations: count(database, 'reservations')
		};
	} finally {
		database.close();
	}
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const { file, roomTypes, rooms, reservations } = resetTestDatabase(process.env.DB_FILE ?? DEFAULT_FILE);
	console.log(`Reset ${file}: ${roomTypes} room types, ${rooms} rooms, ${reservations} reservations`);
}
