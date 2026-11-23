import { ConflictError, NotFoundError, ValidationError } from './errors.js';
import { freeRoomsOf } from './free-rooms.js';
import { totalPriceCents } from './price.js';
import { validateStay } from './stay.js';
import { requireEmail, requireText, requireWholeNumber } from './validation.js';

const MAX_NAME_LENGTH = 100;
const MAX_CODE_TRIES = 10;
const NO_ROOM_MESSAGE = 'No room of this type is free any more for these dates. Please search again.';

export const createBookingService = function ({
	roomTypes,
	rooms,
	reservations,
	settings,
	transaction,
	clock,
	generateCode
}) {
	const newCode = () => {
		for (let attempt = 0; attempt < MAX_CODE_TRIES; attempt += 1) {
			const code = generateCode();
			if (!reservations.codeExists(code)) {
				return code;
			}
		}
		throw new Error('could not find an unused confirmation code');
	};

	return {
		book(input) {
			if (typeof input !== 'object' || input === null) {
				throw new ValidationError('reservation must be an object');
			}
			const roomTypeId = requireWholeNumber(input.roomTypeId, 'roomTypeId');
			const guestName = requireText(input.guestName, 'guestName', { maxLength: MAX_NAME_LENGTH });
			const guestEmail = requireEmail(input.guestEmail, 'guestEmail');
			const { arrivalAt, departureAt, guests } = input;
			const { timeZone } = settings.get();
			const stayLength = validateStay({ arrivalAt, departureAt, guests }, { nowMs: clock.now(), timeZone });

			const roomType = roomTypes.findById(roomTypeId);
			if (!roomType) {
				throw new NotFoundError(`room type ${roomTypeId} does not exist`);
			}
			if (guests > roomType.maxOccupancy) {
				throw new ValidationError(
					`guests must be at most ${roomType.maxOccupancy} for room type ${roomType.name}`
				);
			}

			return transaction(() => {
				const ofType = rooms.list().filter((room) => room.roomTypeId === roomTypeId);
				const overlapping = reservations.findConfirmedOverlapping(arrivalAt, departureAt);
				const free = freeRoomsOf(ofType, overlapping);
				if (free.length === 0) {
					throw new ConflictError(NO_ROOM_MESSAGE);
				}
				const roomNumber = Math.min(...free.map((room) => room.number));

				return reservations.insert({
					code: newCode(),
					roomNumber,
					roomTypeId,
					arrivalAt,
					departureAt,
					nights: stayLength.nights,
					guests,
					guestName,
					guestEmail,
					status: 'Confirmed',
					totalCents: totalPriceCents(roomType, guests, stayLength)
				});
			});
		}
	};
};
