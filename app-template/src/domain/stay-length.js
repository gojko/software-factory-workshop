import { instantOf, localDayOf, nextDayOf } from './zoned-time.js';

const MS_PER_HOUR = 3600000;

export function stayLengthOf(arrivalAt, departureAt, timeZone) {
	if (!(departureAt > arrivalAt)) {
		return { nights: 0, hours: 0 };
	}

	const lastDay = localDayOf(departureAt, timeZone);
	let nights = 0;
	for (let day = localDayOf(arrivalAt, timeZone); day <= lastDay; day = nextDayOf(day)) {
		const midnight = instantOf(day, 0, timeZone);
		if (arrivalAt <= midnight && midnight < departureAt) {
			nights += 1;
		}
	}
	return { nights, hours: (departureAt - arrivalAt) / MS_PER_HOUR };
}
