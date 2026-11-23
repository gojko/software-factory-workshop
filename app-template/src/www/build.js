import { readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const HERE = dirname(fileURLToPath(import.meta.url));
const PAGES_DIR = join(HERE, 'pages');
const DEFAULT_OUTDIR = join(HERE, '..', '..', 'public', 'dist');

export const buildFrontend = async function ({ outdir = DEFAULT_OUTDIR } = {}) {
	const entries = await readdir(PAGES_DIR, { withFileTypes: true });
	const entryPoints = entries
		.filter((entry) => entry.isFile() && entry.name.endsWith('.js'))
		.map((entry) => join(PAGES_DIR, entry.name));

	await build({
		entryPoints,
		outdir,
		bundle: true,
		format: 'esm',
		target: 'es2022',
		logLevel: 'silent'
	});

	return { outdir, entryPoints };
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const { outdir, entryPoints } = await buildFrontend({});
	console.log(`Built ${entryPoints.length} page(s) into ${outdir}`);
}
