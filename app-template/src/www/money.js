const AMOUNT_PATTERN = /^(\d+)(?:[.,](\d{1,2}))?$/;

export function parseAmountToCents(text) {
	if (typeof text !== 'string') return null;
	const match = AMOUNT_PATTERN.exec(text.trim());
	if (!match) return null;
	const units = Number(match[1]);
	const cents = Number((match[2] ?? '').padEnd(2, '0'));
	const total = units * 100 + cents;
	return Number.isSafeInteger(total) ? total : null;
}

export function formatCents(cents, { currency, locale } = {}) {
	if (!currency) throw new Error('currency is required');
	const sign = cents < 0 ? '-' : '';
	const absolute = Math.abs(cents);
	const units = Math.floor(absolute / 100);
	const rest = String(absolute % 100).padStart(2, '0');
	const decimal = `${sign}${units}.${rest}`;
	const formatter = new Intl.NumberFormat(locale, {
		style: 'currency',
		currency,
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
	});
	return formatter.format(decimal);
}
