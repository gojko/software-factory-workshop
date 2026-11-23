import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { randomUUID } from 'node:crypto';
import { ConflictError, NotFoundError, ValidationError } from '../../src/domain/errors.js';
import { createRoomTypeService } from '../../src/domain/room-type-service.js';

const VALID = { name: 'Single', maxOccupancy: 1, baseRateCents: 8000, extraGuestCents: 0 };

describe('createRoomTypeService', () => {
	let roomTypes;
	let rooms;
	let reservations;
	let transaction;
	let underTest;

	beforeEach(() => {
		roomTypes = {
			list: jest.fn(),
			findById: jest.fn(),
			findByName: jest.fn(),
			insert: jest.fn((fields) => ({ id: 1, ...fields })),
			update: jest.fn((id, fields) => ({ id, ...fields })),
			updateBaseRate: jest.fn(),
			remove: jest.fn()
		};
		rooms = { removeByRoomType: jest.fn() };
		reservations = { existsForRoomType: jest.fn().mockReturnValue(false) };
		transaction = jest.fn((work) => work());
		underTest = createRoomTypeService({ roomTypes, rooms, reservations, transaction });
	});

	describe('list', () => {
		test('returns the stored room types when list is called', () => {
			const stored = [{ id: 1, ...VALID }];
			roomTypes.list.mockReturnValue(stored);

			expect(underTest.list()).toEqual(stored);
		});
	});

	describe('add', () => {
		test('stores and returns the room type when the input is valid', () => {
			const result = underTest.add(VALID);

			expect(roomTypes.insert).toHaveBeenCalledWith(VALID);
			expect(result).toEqual({ id: 1, ...VALID });
		});

		test('stores the trimmed name when the name has spaces around it', () => {
			underTest.add({ ...VALID, name: '  Single  ' });

			expect(roomTypes.insert).toHaveBeenCalledWith(expect.objectContaining({ name: 'Single' }));
		});

		test('accepts the limits when values are at the edges', () => {
			const input = {
				name: 'x'.repeat(100),
				maxOccupancy: 20,
				baseRateCents: 0,
				extraGuestCents: 0
			};

			underTest.add(input);

			expect(roomTypes.insert).toHaveBeenCalledWith(input);
		});

		test('throws ConflictError and stores nothing when the name exists in other case', () => {
			roomTypes.findByName.mockReturnValue({ id: 5, ...VALID });

			expect(() => underTest.add({ ...VALID, name: 'single' })).toThrow(ConflictError);
			expect(roomTypes.findByName).toHaveBeenCalledWith('single');
			expect(roomTypes.insert).not.toHaveBeenCalled();
		});

		test.each([
			['the name is empty', { name: '  ' }],
			['the name is not text', { name: 5 }],
			['the name has 101 characters', { name: 'x'.repeat(101) }],
			['the occupancy is 0', { maxOccupancy: 0 }],
			['the occupancy is 21', { maxOccupancy: 21 }],
			['the occupancy is not whole', { maxOccupancy: 1.5 }],
			['the base rate is negative', { baseRateCents: -1 }],
			['the base rate is not whole', { baseRateCents: 10.5 }],
			['the surcharge is negative', { extraGuestCents: -1 }],
			['the surcharge is missing', { extraGuestCents: undefined }]
		])('throws ValidationError and stores nothing when %s', (_label, change) => {
			expect(() => underTest.add({ ...VALID, ...change })).toThrow(ValidationError);
			expect(roomTypes.insert).not.toHaveBeenCalled();
		});

		test('throws ValidationError when the input is not an object', () => {
			expect(() => underTest.add(null)).toThrow(ValidationError);
		});
	});

	describe('update', () => {
		const id = 3;

		beforeEach(() => {
			roomTypes.findById.mockReturnValue({ id, ...VALID });
		});

		test('stores and returns the changed room type when the input is valid', () => {
			const input = { ...VALID, name: 'Double', maxOccupancy: 2 };

			const result = underTest.update(id, input);

			expect(roomTypes.update).toHaveBeenCalledWith(id, input);
			expect(result).toEqual({ id, ...input });
		});

		test('allows the name of the type itself when only the case changes', () => {
			roomTypes.findByName.mockReturnValue({ id, ...VALID });

			underTest.update(id, { ...VALID, name: 'SINGLE' });

			expect(roomTypes.update).toHaveBeenCalledWith(id, expect.objectContaining({ name: 'SINGLE' }));
		});

		test('throws ConflictError and changes nothing when another type has the name', () => {
			roomTypes.findByName.mockReturnValue({ id: 99, ...VALID });

			expect(() => underTest.update(id, VALID)).toThrow(ConflictError);
			expect(roomTypes.update).not.toHaveBeenCalled();
		});

		test('throws NotFoundError when the id is unknown', () => {
			roomTypes.findById.mockReturnValue(undefined);

			expect(() => underTest.update(randomUUID(), VALID)).toThrow(NotFoundError);
			expect(roomTypes.update).not.toHaveBeenCalled();
		});

		test('throws ValidationError and changes nothing when the input is invalid', () => {
			expect(() => underTest.update(id, { ...VALID, maxOccupancy: 0 })).toThrow(ValidationError);
			expect(roomTypes.update).not.toHaveBeenCalled();
		});
	});

	describe('updateBaseRate', () => {
		test('changes only the base rate and returns the room type when the id exists', () => {
			roomTypes.findById.mockReturnValue({ id: 3, ...VALID });
			roomTypes.updateBaseRate.mockReturnValue({ id: 3, ...VALID, baseRateCents: 11000 });

			const result = underTest.updateBaseRate(3, 11000);

			expect(roomTypes.updateBaseRate).toHaveBeenCalledWith(3, 11000);
			expect(roomTypes.update).not.toHaveBeenCalled();
			expect(result).toEqual({ id: 3, ...VALID, baseRateCents: 11000 });
		});

		test('accepts 0 when the base rate is free', () => {
			roomTypes.findById.mockReturnValue({ id: 3, ...VALID });

			underTest.updateBaseRate(3, 0);

			expect(roomTypes.updateBaseRate).toHaveBeenCalledWith(3, 0);
		});

		test.each([[-1], [10.5], ['100'], [undefined]])(
			'throws ValidationError when the base rate is %p',
			(value) => {
				roomTypes.findById.mockReturnValue({ id: 3, ...VALID });

				expect(() => underTest.updateBaseRate(3, value)).toThrow(ValidationError);
				expect(roomTypes.updateBaseRate).not.toHaveBeenCalled();
			}
		);

		test('throws NotFoundError when the id is unknown', () => {
			roomTypes.findById.mockReturnValue(undefined);

			expect(() => underTest.updateBaseRate(9, 100)).toThrow(NotFoundError);
			expect(roomTypes.updateBaseRate).not.toHaveBeenCalled();
		});
	});

	describe('remove', () => {
		test('removes the rooms and then the type in one transaction when no reservation exists', () => {
			const calls = [];
			roomTypes.findById.mockReturnValue({ id: 4, ...VALID });
			rooms.removeByRoomType.mockImplementation(() => calls.push('rooms'));
			roomTypes.remove.mockImplementation(() => calls.push('type'));

			underTest.remove(4);

			expect(transaction).toHaveBeenCalledTimes(1);
			expect(reservations.existsForRoomType).toHaveBeenCalledWith(4);
			expect(rooms.removeByRoomType).toHaveBeenCalledWith(4);
			expect(roomTypes.remove).toHaveBeenCalledWith(4);
			expect(calls).toEqual(['rooms', 'type']);
		});

		test('throws ConflictError that mentions reservations and removes nothing when one exists', () => {
			roomTypes.findById.mockReturnValue({ id: 4, ...VALID });
			reservations.existsForRoomType.mockReturnValue(true);

			expect(() => underTest.remove(4)).toThrow(ConflictError);
			expect(() => underTest.remove(4)).toThrow(/reservations exist/);
			expect(rooms.removeByRoomType).not.toHaveBeenCalled();
			expect(roomTypes.remove).not.toHaveBeenCalled();
		});

		test('throws NotFoundError and removes nothing when the id is unknown', () => {
			roomTypes.findById.mockReturnValue(undefined);

			expect(() => underTest.remove(4)).toThrow(NotFoundError);
			expect(rooms.removeByRoomType).not.toHaveBeenCalled();
			expect(roomTypes.remove).not.toHaveBeenCalled();
		});
	});
});
