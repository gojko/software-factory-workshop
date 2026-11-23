

const MS_PER_MINUTE = 60000;
const MS_PER_DAY = 86400000;

const partsFormatters = new Map();

function partsFormatterFor(timeZone) {
	let formatter = partsFormatters.get(timeZone);
	if (!formatter) {
		formatter = new Intl.DateTimeFormat('en-US', {
			timeZone,
			hourCycle: 'h23',
			year: 'numeric',
			month: 'numeric',
			day: 'numeric',
			hour: 'numeric',
			minute: 'numeric',
			second: 'numeric'
		});
		partsFormatters.set(timeZone, formatter);
	}
	return formatter;
}

function mod(value, divisor) {
	return ((value % divisor) + divisor) % divisor;
}

function daysFromCivil(year, month, day) {
	const y = month <= 2 ? year - 1 : year;
	const era = Math.floor(y / 400);
	const yearOfEra = y - era * 400;
	const dayOfYear = Math.floor((153 * (month + (month > 2 ? -3 : 9)) + 2) / 5) + day - 1;
	const dayOfEra = yearOfEra * 365 + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100) + dayOfYear;
	return era * 146097 + dayOfEra - 719468;
}

function civilFromDays(days) {
	const z = days + 719468;
	const era = Math.floor(z / 146097);
	const dayOfEra = z - era * 146097;
	const yearOfEra = Math.floor(
		(dayOfEra - Math.floor(dayOfEra / 1460) + Math.floor(dayOfEra / 36524) - Math.floor(dayOfEra / 146096)) / 365
	);
	const dayOfYear = dayOfEra - (365 * yearOfEra + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100));
	const shifted = Math.floor((5 * dayOfYear + 2) / 153);
	const day = dayOfYear - Math.floor((153 * shifted + 2) / 5) + 1;
	const month = shifted < 10 ? shifted + 3 : shifted - 9;
	const year = yearOfEra + era * 400 + (month <= 2 ? 1 : 0);
	return { year, month, day };
}

function wallFields(ms, timeZone) {
	const fields = {};
	for (const part of partsFormatterFor(timeZone).formatToParts(ms)) {
		if (part.type !== 'literal') {
			fields[part.type] = Number(part.value);
		}
	}
	return fields;
}

function wallMsOf(ms, timeZone) {
	const f = wallFields(ms, timeZone);
	const days = daysFromCivil(f.year, f.month, f.day);
	return days * MS_PER_DAY + (f.hour * 3600 + f.minute * 60 + f.second) * 1000;
}

function offsetAt(ms, timeZone) {
	return wallMsOf(ms, timeZone) - Math.floor(ms / 1000) * 1000;
}

function pad(value, width) {
	return String(value).padStart(width, '0');
}

function dayText({ year, month, day }) {
	return `${pad(year, 4)}-${pad(month, 2)}-${pad(day, 2)}`;
}

function parseDay(text) {
	if (typeof text !== 'string') {
		return null;
	}
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
	if (!match) {
		return null;
	}
	const year = Number(match[1]);
	const month = Number(match[2]);
	const day = Number(match[3]);
	const days = daysFromCivil(year, month, day);
	const back = civilFromDays(days);
	if (back.year !== year || back.month !== month || back.day !== day) {
		return null;
	}
	return days;
}

function instantOfWall(days, minutesOfDay, timeZone) {
	const wallMs = days * MS_PER_DAY + minutesOfDay * MS_PER_MINUTE;
	const offsetBefore = offsetAt(wallMs - MS_PER_DAY, timeZone);
	const offsetAfter = offsetAt(wallMs + MS_PER_DAY, timeZone);

	const valid = [...new Set([offsetBefore, offsetAfter])]
		.map((offset) => ({ offset, instant: wallMs - offset }))
		.filter(({ offset, instant }) => offsetAt(instant, timeZone) === offset)
		.map(({ instant }) => instant);
	if (valid.length > 0) {
		return Math.min(...valid);
	}

	let low = wallMs - offsetAfter;
	let high = wallMs - offsetBefore;
	if (low > high) {
		[low, high] = [high, low];
	}
	while (high - low > 1) {
		const middle = Math.floor((low + high) / 2);
		if (offsetAt(middle, timeZone) === offsetAfter) {
			high = middle;
		} else {
			low = middle;
		}
	}
	return high;
}

const STYLE_OPTIONS = {
	day: { year: 'numeric', month: 'short', day: 'numeric' },
	time: { hour: '2-digit', minute: '2-digit' },
	dayTime: { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
};

export function formatInstant(ms, { timeZone, locale, style = 'dayTime' }) {
	const options = STYLE_OPTIONS[style] ?? STYLE_OPTIONS.dayTime;
	return new Intl.DateTimeFormat(locale, { ...options, timeZone }).format(ms);
}

export function dayInputValue(ms, timeZone) {
	const { year, month, day } = wallFields(ms, timeZone);
	return dayText({ year, month, day });
}

export function timeInputValue(ms, timeZone) {
	const { hour, minute } = wallFields(ms, timeZone);
	return `${pad(hour, 2)}:${pad(minute, 2)}`;
}

export function instantOf(dayTextValue, minutesOfDay, timeZone) {
	const days = parseDay(dayTextValue);
	if (days === null) {
		return null;
	}
	return instantOfWall(days, minutesOfDay, timeZone);
}

export function todayStart(clock, timeZone) {
	return instantOf(dayInputValue(clock.now(), timeZone), 0, timeZone);
}

export function addDays(ms, days, timeZone) {
	const f = wallFields(ms, timeZone);
	const minutesOfDay = f.hour * 60 + f.minute;
	const subMinuteMs = mod(ms, MS_PER_MINUTE);
	const targetDays = daysFromCivil(f.year, f.month, f.day) + days;
	return instantOfWall(targetDays, minutesOfDay, timeZone) + subMinuteMs;
}

export function stayInstants({ arrivalDay, departureDay }, settings) {
	const arrivalAt = instantOf(arrivalDay, settings.checkInMinutes, settings.timeZone);
	const departureAt = instantOf(departureDay, settings.checkOutMinutes, settings.timeZone);
	if (arrivalAt === null || departureAt === null) {
		return null;
	}
	return { arrivalAt, departureAt };
}

export function minutesToTimeInput(minutes) {
	return `${pad(Math.floor(minutes / 60), 2)}:${pad(minutes % 60, 2)}`;
}

export function timeInputToMinutes(text) {
	if (typeof text !== 'string') {
		return null;
	}
	const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(text);
	if (!match) {
		return null;
	}
	return Number(match[1]) * 60 + Number(match[2]);
}
