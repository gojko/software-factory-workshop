import { describe, expect, test } from '@jest/globals';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const COMPANION_SUFFIXES = ['', '-journal', '-wal', '-shm'];

describe('make clean-db', () => {
	test('removes the database file and its companions when they exist', () => {
		const file = join(mkdtempSync(join(tmpdir(), 'clean-db-')), `${randomUUID()}.db`);
		for (const suffix of COMPANION_SUFFIXES) {
			writeFileSync(`${file}${suffix}`, 'x');
		}

		const result = spawnSync('make', ['clean-db'], { env: { ...process.env, DB_FILE: file }, encoding: 'utf8' });

		expect(result.status).toEqual(0);
		expect(COMPANION_SUFFIXES.map((suffix) => existsSync(`${file}${suffix}`))).toEqual([false, false, false, false]);
	});

	test('succeeds when the database does not exist', () => {
		const file = join(mkdtempSync(join(tmpdir(), 'clean-db-')), `${randomUUID()}.db`);

		const result = spawnSync('make', ['clean-db'], { env: { ...process.env, DB_FILE: file }, encoding: 'utf8' });

		expect(result.status).toEqual(0);
	});
});
