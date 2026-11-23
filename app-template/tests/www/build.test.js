import { randomUUID } from 'node:crypto';
import { existsSync, statSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, test } from '@jest/globals';
import { buildFrontend } from '../../src/www/build.js';

describe('buildFrontend', () => {
	let outdir;

	beforeEach(() => {
		outdir = join(tmpdir(), randomUUID());
	});

	afterEach(async () => {
		await rm(outdir, { recursive: true, force: true });
	});

	test('writes a non-empty landing.js into outdir when built', async () => {
		await buildFrontend({ outdir });

		expect(existsSync(join(outdir, 'landing.js'))).toEqual(true);
		expect(statSync(join(outdir, 'landing.js')).size).toBeGreaterThan(0);
	});

	test('builds again without error when outdir already holds a build', async () => {
		await buildFrontend({ outdir });

		await buildFrontend({ outdir });

		expect(statSync(join(outdir, 'landing.js')).size).toBeGreaterThan(0);
	});
});
