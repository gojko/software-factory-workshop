import { randomInt as cryptoRandomInt } from 'node:crypto';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;

export function generateConfirmationCode(randomInt = cryptoRandomInt) {
	let code = '';
	for (let index = 0; index < CODE_LENGTH; index += 1) {
		code += ALPHABET[randomInt(ALPHABET.length)];
	}
	return code;
}
