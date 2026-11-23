import { ConflictError, NotFoundError, ValidationError } from './errors.js';
import { requireText, requireWholeNumber } from './validation.js';

const MAX_NAME_LENGTH = 100;
const MIN_OCCUPANCY = 1;
const MAX_OCCUPANCY = 20;

const requireBaseRate = (value) => requireWholeNumber(value, 'baseRateCents', { min: 0 });

const requireFields = (input) => {
	if (typeof input !== 'object' || input === null) {
		throw new ValidationError('room type must be an object');
	}
	return {
		name: requireText(input.name, 'name', { maxLength: MAX_NAME_LENGTH }),
		maxOccupancy: requireWholeNumber(input.maxOccupancy, 'maxOccupancy', {
			min: MIN_OCCUPANCY,
			max: MAX_OCCUPANCY
		}),
		baseRateCents: requireBaseRate(input.baseRateCents),
		extraGuestCents: requireWholeNumber(input.extraGuestCents, 'extraGuestCents', { min: 0 })
	};
};

export const createRoomTypeService = function ({ roomTypes, rooms, reservations, transaction }) {
	const requireExisting = (id) => {
		const existing = roomTypes.findById(id);
		if (!existing) {
			throw new NotFoundError(`room type ${id} does not exist`);
		}
		return existing;
	};

	const requireFreeName = (name, ownId) => {
		const sameName = roomTypes.findByName(name);
		if (sameName && sameName.id !== ownId) {
			throw new ConflictError(`a room type named "${sameName.name}" exists already`);
		}
	};

	return {
		list() {
			return roomTypes.list();
		},
		add(input) {
			const fields = requireFields(input);
			return transaction(() => {
				requireFreeName(fields.name);
				return roomTypes.insert(fields);
			});
		},
		update(id, input) {
			const fields = requireFields(input);
			return transaction(() => {
				requireExisting(id);
				requireFreeName(fields.name, id);
				return roomTypes.update(id, fields);
			});
		},
		updateBaseRate(id, baseRateCents) {
			const rate = requireBaseRate(baseRateCents);
			return transaction(() => {
				requireExisting(id);
				return roomTypes.updateBaseRate(id, rate);
			});
		},
		remove(id) {
			transaction(() => {
				requireExisting(id);
				if (reservations.existsForRoomType(id)) {
					throw new ConflictError(
						'room type cannot be removed because reservations exist for it'
					);
				}
				rooms.removeByRoomType(id);
				roomTypes.remove(id);
			});
		}
	};
};
