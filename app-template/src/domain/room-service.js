import { ConflictError, NotFoundError, ValidationError } from './errors.js';
import { requireWholeNumber } from './validation.js';

const MIN_ROOM_NUMBER = 1;
const MAX_ROOM_NUMBER = 99999;
const MAX_RANGE_SIZE = 1000;

const requireRange = (input) => {
	if (typeof input !== 'object' || input === null) {
		throw new ValidationError('range must be an object');
	}
	const first = requireWholeNumber(input.first, 'first', {
		min: MIN_ROOM_NUMBER,
		max: MAX_ROOM_NUMBER
	});
	const last = requireWholeNumber(input.last, 'last', {
		min: MIN_ROOM_NUMBER,
		max: MAX_ROOM_NUMBER
	});
	if (first > last) {
		throw new ValidationError('first must not be larger than last');
	}
	if (last - first + 1 > MAX_RANGE_SIZE) {
		throw new ValidationError(`a range must hold at most ${MAX_RANGE_SIZE} room numbers`);
	}
	return { first, last };
};

export const createRoomService = function ({ roomTypes, rooms, reservations, transaction }) {
	const refuseReserved = (affectedRooms, first, last, action) => {
		if (affectedRooms.length === 0) {
			return;
		}
		const affected = new Set(affectedRooms.map((room) => room.number));
		const blocking = reservations
			.findByRoomNumbers(first, last)
			.filter((reservation) => affected.has(reservation.roomNumber))
			.sort((a, b) => a.roomNumber - b.roomNumber)[0];
		if (blocking) {
			throw new ConflictError(
				`Room ${blocking.roomNumber} cannot be ${action} because it has the reservation ${blocking.code}`
			);
		}
	};

	return {
		list: () => rooms.list(),
		listRanges() {
			const names = new Map(roomTypes.list().map((type) => [type.id, type.name]));
			const ranges = [];
			for (const room of rooms.list()) {
				const current = ranges.at(-1);
				if (current && current.roomTypeId === room.roomTypeId && current.last + 1 === room.number) {
					current.last = room.number;
				} else {
					ranges.push({
						first: room.number,
						last: room.number,
						roomTypeId: room.roomTypeId,
						roomTypeName: names.get(room.roomTypeId)
					});
				}
			}
			return ranges;
		},
		setRange(input) {
			const { first, last } = requireRange(input);
			const roomTypeId = requireWholeNumber(input.roomTypeId, 'roomTypeId', { min: 1 });
			return transaction(() => {
				if (!roomTypes.findById(roomTypeId)) {
					throw new NotFoundError(`Room type ${roomTypeId} does not exist`);
				}
				const changing = rooms
					.findInRange(first, last)
					.filter((room) => room.roomTypeId !== roomTypeId);
				refuseReserved(changing, first, last, 'changed');
				for (let number = first; number <= last; number += 1) {
					rooms.upsert(number, roomTypeId);
				}
				return { first, last, roomTypeId };
			});
		},
		removeRange(input) {
			const { first, last } = requireRange(input);
			transaction(() => {
				const existing = rooms.findInRange(first, last);
				if (existing.length === 0) {
					return;
				}
				refuseReserved(existing, first, last, 'removed');
				rooms.removeInRange(first, last);
			});
		}
	};
};
