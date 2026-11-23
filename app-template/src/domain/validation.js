import { ValidationError } from './errors.js';

const MAX_EMAIL_LENGTH = 254;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

export function requireText(value, label, { maxLength } = {}) {
	if (typeof value !== 'string') {
		throw new ValidationError(`${label} must be text`);
	}
	const text = value.trim();
	if (text.length === 0) {
		throw new ValidationError(`${label} must not be empty`);
	}
	if (maxLength !== undefined && text.length > maxLength) {
		throw new ValidationError(`${label} must be at most ${maxLength} characters`);
	}
	return text;
}

export function requireWholeNumber(value, label, { min, max } = {}) {
	if (typeof value !== 'number' || !Number.isInteger(value)) {
		throw new ValidationError(`${label} must be a whole number`);
	}
	if (min !== undefined && value < min) {
		throw new ValidationError(`${label} must be at least ${min}`);
	}
	if (max !== undefined && value > max) {
		throw new ValidationError(`${label} must be at most ${max}`);
	}
	return value;
}

export function requireEmail(value, label) {
	if (typeof value !== 'string') {
		throw new ValidationError(`${label} must be text`);
	}
	if (value.length > MAX_EMAIL_LENGTH) {
		throw new ValidationError(`${label} must be at most ${MAX_EMAIL_LENGTH} characters`);
	}
	if (!EMAIL_PATTERN.test(value)) {
		throw new ValidationError(`${label} must be an email address like name@host.tld`);
	}
	return value;
}

export function requireInstant(value, label) {
	if (typeof value !== 'number' || !Number.isInteger(value)) {
		throw new ValidationError(`${label} must be a whole number of milliseconds`);
	}
	if (value < 0) {
		throw new ValidationError(`${label} must not be negative`);
	}
	return value;
}
