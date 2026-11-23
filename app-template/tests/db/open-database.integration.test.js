import { randomUUID } from 'node:crypto';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { afterEach, beforeEach, describe, expect, test } from '@jest/globals';
import { createTransactionRunner, openDatabase } from '../../src/db/open-database.js';

const INSERT_ROOM_TYPE =
	'INSERT INTO room_types (name, max_occupancy, base_rate_cents, extra_guest_cents) VALUES (?, 2, 10000, 1000)';

describe('openDatabase with a memory database', () => {
	let underTest;

	beforeEach(() => {
		underTest = openDatabase(':memory:');
	});

	afterEach(() => {
		underTest.close();
	});

	test('returns a DatabaseSync when opened', () => {
		expect(underTest).toBeInstanceOf(DatabaseSync);
	});

	test('creates all four tables when opened', () => {
		const names = underTest
			.prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
			.all()
			.map((row) => row.name);

		expect(names).toEqual(
			expect.arrayContaining(['room_types', 'rooms', 'hotel_settings', 'reservations'])
		);
	});

	test('inserts the default settings row when opened', () => {
		const rows = underTest.prepare('SELECT * FROM hotel_settings').all();

		expect(rows).toHaveLength(1);
		expect(rows[0]).toEqual(
			expect.objectContaining({
				id: 1,
				time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone,
				check_in_minutes: 900,
				check_out_minutes: 660,
				currency: 'EUR'
			})
		);
	});

	test('refuses a room that names a missing room type', () => {
		expect(() =>
			underTest.prepare('INSERT INTO rooms (number, room_type_id) VALUES (?, ?)').run(101, 999)
		).toThrow(/FOREIGN KEY/);
	});

	test('refuses a room type name that differs only in case', () => {
		const insert = underTest.prepare(INSERT_ROOM_TYPE);
		insert.run('Double');

		expect(() => insert.run('DOUBLE')).toThrow(/UNIQUE/);
	});

	test('refuses a settings row when the id is not 1', () => {
		expect(() =>
			underTest
				.prepare(
					"INSERT INTO hotel_settings (id, time_zone, check_in_minutes, check_out_minutes, currency) VALUES (2, 'UTC', 1, 2, 'EUR')"
				)
				.run()
		).toThrow(/CHECK/);
	});
});

describe('openDatabase with a file', () => {
	let root;
	let file;

	beforeEach(() => {
		root = mkdtempSync(join(tmpdir(), 'open-database-'));
		file = join(root, randomUUID(), 'nested', 'hotel.db');
	});

	afterEach(() => {
		rmSync(root, { recursive: true, force: true });
	});

	test('creates the missing folder when the file is opened', () => {
		const underTest = openDatabase(file);
		underTest.close();

		expect(existsSync(file)).toEqual(true);
	});

	test('keeps changed settings when the file is opened again', () => {
		const first = openDatabase(file);
		first.prepare("UPDATE hotel_settings SET time_zone = 'Asia/Tokyo', currency = 'JPY'").run();
		first.close();

		const underTest = openDatabase(file);
		const row = underTest.prepare('SELECT * FROM hotel_settings').get();
		underTest.close();

		expect(row).toEqual(
			expect.objectContaining({ id: 1, time_zone: 'Asia/Tokyo', currency: 'JPY' })
		);
	});

	test('keeps its rows when an existing file is opened again', () => {
		const name = randomUUID();
		const first = openDatabase(file);
		first.prepare(INSERT_ROOM_TYPE).run(name);
		first.close();

		const underTest = openDatabase(file);
		const rows = underTest.prepare('SELECT name FROM room_types').all();
		underTest.close();

		expect(rows.map((row) => row.name)).toEqual([name]);
	});
});

describe('createTransactionRunner', () => {
	let database;
	let underTest;

	const countRoomTypes = () =>
		database.prepare('SELECT COUNT(*) AS total FROM room_types').get().total;

	beforeEach(() => {
		database = openDatabase(':memory:');
		underTest = createTransactionRunner(database);
	});

	afterEach(() => {
		database.close();
	});

	test('returns the result of the work', () => {
		const result = randomUUID();

		expect(underTest(() => result)).toEqual(result);
	});

	test('commits the changes when the work succeeds', () => {
		underTest(() => database.prepare(INSERT_ROOM_TYPE).run(randomUUID()));

		expect(countRoomTypes()).toEqual(1);
		expect(database.isTransaction).toEqual(false);
	});

	test('rolls back and rethrows when the work throws', () => {
		const failure = new Error(randomUUID());

		expect(() =>
			underTest(() => {
				database.prepare(INSERT_ROOM_TYPE).run(randomUUID());
				throw failure;
			})
		).toThrow(failure);
		expect(countRoomTypes()).toEqual(0);
		expect(database.isTransaction).toEqual(false);
	});

	test('runs the work directly when a transaction is already open', () => {
		const failure = new Error(randomUUID());

		expect(() =>
			underTest(() => {
				database.prepare(INSERT_ROOM_TYPE).run(randomUUID());
				underTest(() => database.prepare(INSERT_ROOM_TYPE).run(randomUUID()));
				throw failure;
			})
		).toThrow(failure);
		expect(countRoomTypes()).toEqual(0);
	});
});
