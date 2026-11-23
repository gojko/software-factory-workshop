import { randomUUID } from 'node:crypto';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, test } from '@jest/globals';
import { openDatabase } from '../../src/db/open-database.js';
import { createReservationRepository } from '../../src/db/reservation-repository.js';
import { resetTestDatabase } from '../../src/db/reset-test-db.js';
import { seedTestData } from '../../src/db/seed.js';

const DAY = 86400000;

describe('resetTestDatabase', () => {
	let folder;
	let file;
	const underTest = resetTestDatabase;

	beforeEach(() => {
		folder = mkdtempSync(join(tmpdir(), `reset-test-db-${randomUUID()}-`));
		file = join(folder, 'nested', `${randomUUID()}.db`);
	});

	afterEach(() => {
		rmSync(folder, { recursive: true, force: true });
	});

	test('ends with 3 room types, 20 rooms and 0 reservations when the file holds a reservation', () => {
		const database = openDatabase(file);
		seedTestData(database);
		createReservationRepository(database).insert({
			code: randomUUID(),
			roomNumber: 101,
			roomTypeId: database.prepare('SELECT room_type_id AS id FROM rooms WHERE number = 101').get().id,
			arrivalAt: 10 * DAY,
			departureAt: 12 * DAY,
			nights: 2,
			guests: 1,
			guestName: 'Ada Lovelace',
			guestEmail: 'ada@example.com',
			status: 'Confirmed',
			totalCents: 16000
		});
		database.close();

		const counts = underTest(file);

		expect(counts).toEqual(expect.objectContaining({ file, roomTypes: 3, rooms: 20, reservations: 0 }));
	});

	test('creates the file with the seed when the file is missing', () => {
		const counts = underTest(file);

		expect(existsSync(file)).toEqual(true);
		expect(counts).toEqual(expect.objectContaining({ roomTypes: 3, rooms: 20, reservations: 0 }));
	});

	test('gives the same counts when it runs two times in a row', () => {
		const first = underTest(file);

		const second = underTest(file);

		expect(second).toEqual(first);
	});
});
