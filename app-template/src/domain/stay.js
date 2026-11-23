import { ValidationError } from './errors.js';
import { stayLengthOf } from './stay-length.js';
import { requireInstant, requireWholeNumber } from './validation.js';
import { localDayOf } from './zoned-time.js';

const MAX_NIGHTS = 30;
const MAX_SPAN_MS = 32 * 86400000;
const MIN_GUESTS = 1;
const MAX_GUESTS = 4;

export function validateStay({ arrivalAt, departureAt, guests }, { nowMs, timeZone }) {
	requireInstant(arrivalAt, 'arrivalAt');
	requireInstant(departureAt, 'departureAt');

	if (localDayOf(arrivalAt, timeZone) < localDayOf(nowMs, timeZone)) {
		throw new ValidationError('arrival day must not be in the past');
	}
	if (departureAt <= arrivalAt) {
		throw new ValidationError('departure must be after arrival');
	}
	if (departureAt - arrivalAt > MAX_SPAN_MS) {
		throw new ValidationError('arrival and departure must be at most 32 days apart');
	}

	const stayLength = stayLengthOf(arrivalAt, departureAt, timeZone);
	if (stayLength.nights < 1) {
		throw new ValidationError('stay must have at least 1 night');
	}
	if (stayLength.nights > MAX_NIGHTS) {
		throw new ValidationError(`stay must have at most ${MAX_NIGHTS} nights`);
	}

	requireWholeNumber(guests, 'guests', { min: MIN_GUESTS, max: MAX_GUESTS });
	return stayLength;
}
