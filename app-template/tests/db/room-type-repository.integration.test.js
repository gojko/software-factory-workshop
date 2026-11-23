import { randomUUID } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, test } from '@jest/globals';
import { openDatabase } from '../../src/db/open-database.js';
import { createRoomTypeRepository } from '../../src/db/room-type-repository.js';

const makeFields = (overrides = {}) => ({
	name: randomUUID(),
	maxOccupancy: 2,
	baseRateCents: 10000,
	extraGuestCents: 1500,
	...overrides
});

describe('createRoomTypeRepository', () => {
	let database;
	let underTest;

	beforeEach(() => {
		database = openDatabase(':memory:');
		underTest = createRoomTypeRepository(database);
	});

	afterEach(() => {
		database.close();
	});

	test('returns the stored type with an id when insert is called', () => {
		const fields = makeFields();

		const result = underTest.insert(fields);

		expect(result).toEqual({ id: expect.any(Number), ...fields });
		expect(underTest.findById(result.id)).toEqual(result);
	});

	test('returns the types ordered by name when list is called', () => {
		underTest.insert(makeFields({ name: 'Suite' }));
		underTest.insert(makeFields({ name: 'Double' }));
		underTest.insert(makeFields({ name: 'Single' }));

		const result = underTest.list().map((type) => type.name);

		expect(result).toEqual(['Double', 'Single', 'Suite']);
	});

	test('returns an empty array when list is called on an empty table', () => {
		expect(underTest.list()).toEqual([]);
	});

	test('returns the type when findByName differs only in case', () => {
		const stored = underTest.insert(makeFields({ name: 'Deluxe Double' }));

		expect(underTest.findByName('deluxe DOUBLE')).toEqual(stored);
	});

	test('returns undefined when findByName gets an unknown name', () => {
		expect(underTest.findByName(randomUUID())).toBeUndefined();
	});

	test('returns undefined when findById gets an unknown id', () => {
		expect(underTest.findById(9999)).toBeUndefined();
	});

	test('changes only the base rate when updateBaseRate is called', () => {
		const stored = underTest.insert(makeFields());

		const result = underTest.updateBaseRate(stored.id, 25000);

		expect(result).toEqual({ ...stored, baseRateCents: 25000 });
		expect(underTest.findById(stored.id)).toEqual(result);
	});

	test('changes all fields when update is called', () => {
		const stored = underTest.insert(makeFields());
		const fields = makeFields({ maxOccupancy: 4, baseRateCents: 33300, extraGuestCents: 2200 });

		const result = underTest.update(stored.id, fields);

		expect(result).toEqual({ id: stored.id, ...fields });
		expect(underTest.findById(stored.id)).toEqual(result);
	});

	test('removes the type when remove is called', () => {
		const stored = underTest.insert(makeFields());
		const other = underTest.insert(makeFields());

		underTest.remove(stored.id);

		expect(underTest.findById(stored.id)).toBeUndefined();
		expect(underTest.findById(other.id)).toEqual(other);
	});

	test('returns the number of types when count is called', () => {
		expect(underTest.count()).toEqual(0);

		underTest.insert(makeFields());
		underTest.insert(makeFields());

		expect(underTest.count()).toEqual(2);
	});
});
