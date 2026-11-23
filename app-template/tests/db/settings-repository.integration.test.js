import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, test } from '@jest/globals';
import { openDatabase } from '../../src/db/open-database.js';
import { createSettingsRepository } from '../../src/db/settings-repository.js';

describe('createSettingsRepository with a memory database', () => {
	let database;
	let underTest;

	beforeEach(() => {
		database = openDatabase(':memory:');
		underTest = createSettingsRepository(database);
	});

	afterEach(() => {
		database.close();
	});

	test('returns the default settings when the database is new', () => {
		expect(underTest.get()).toEqual({
			timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
			checkInMinutes: 900,
			checkOutMinutes: 660,
			currency: 'EUR'
		});
	});

	test('returns the stored settings when update is called', () => {
		const fields = {
			timeZone: 'Asia/Tokyo',
			checkInMinutes: 840,
			checkOutMinutes: 600,
			currency: 'USD'
		};

		expect(underTest.update(fields)).toEqual(fields);
		expect(underTest.get()).toEqual(fields);
	});

	test('keeps one settings row when update is called twice', () => {
		underTest.update({
			timeZone: 'UTC',
			checkInMinutes: 1,
			checkOutMinutes: 2,
			currency: 'EUR'
		});
		underTest.update({
			timeZone: 'Europe/Berlin',
			checkInMinutes: 3,
			checkOutMinutes: 4,
			currency: 'EUR'
		});

		expect(database.prepare('SELECT COUNT(*) AS n FROM hotel_settings').get().n).toEqual(1);
	});
});

describe('createSettingsRepository with a file', () => {
	let root;
	let file;

	beforeEach(() => {
		root = mkdtempSync(join(tmpdir(), 'settings-repository-'));
		file = join(root, randomUUID(), 'hotel.db');
	});

	afterEach(() => {
		rmSync(root, { recursive: true, force: true });
	});

	test('returns the stored values when the file is opened again', () => {
		const fields = {
			timeZone: 'America/New_York',
			checkInMinutes: 780,
			checkOutMinutes: 540,
			currency: 'USD'
		};
		const first = openDatabase(file);
		createSettingsRepository(first).update(fields);
		first.close();

		const second = openDatabase(file);
		const result = createSettingsRepository(second).get();
		second.close();

		expect(result).toEqual(fields);
	});
});
