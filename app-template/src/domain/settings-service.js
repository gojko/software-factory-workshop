import { ValidationError } from './errors.js';
import { requireText, requireWholeNumber } from './validation.js';

const MAX_MINUTE = 1439;
const CURRENCY_PATTERN = /^[A-Z]{3}$/;
const CURRENCY_DECIMALS = 2;
const KNOWN_CURRENCIES = new Set(Intl.supportedValuesOf('currency'));

const requireTimeZone = (value) => {
	const timeZone = requireText(value, 'timeZone');
	try {
		return new Intl.DateTimeFormat('en', { timeZone }).resolvedOptions().timeZone;
	} catch {
		throw new ValidationError('timeZone must be a time zone name like Europe/Berlin');
	}
};

const requireCurrency = (value) => {
	if (typeof value !== 'string' || !CURRENCY_PATTERN.test(value)) {
		throw new ValidationError('currency must be a three-letter upper-case code like EUR');
	}
	if (!KNOWN_CURRENCIES.has(value)) {
		throw new ValidationError('currency must be a known currency code like EUR');
	}
	const { minimumFractionDigits, maximumFractionDigits } = new Intl.NumberFormat('en', {
		style: 'currency',
		currency: value
	}).resolvedOptions();
	if (minimumFractionDigits !== CURRENCY_DECIMALS || maximumFractionDigits !== CURRENCY_DECIMALS) {
		throw new ValidationError(`currency must have exactly ${CURRENCY_DECIMALS} decimal digits`);
	}
	return value;
};

export const createSettingsService = function ({ settings }) {
	return {
		get() {
			return settings.get();
		},
		update(input) {
			if (typeof input !== 'object' || input === null) {
				throw new ValidationError('settings must be an object');
			}
			const fields = {
				timeZone: requireTimeZone(input.timeZone),
				checkInMinutes: requireWholeNumber(input.checkInMinutes, 'checkInMinutes', {
					min: 0,
					max: MAX_MINUTE
				}),
				checkOutMinutes: requireWholeNumber(input.checkOutMinutes, 'checkOutMinutes', {
					min: 0,
					max: MAX_MINUTE
				}),
				currency: requireCurrency(input.currency)
			};
			return settings.update(fields);
		}
	};
};
