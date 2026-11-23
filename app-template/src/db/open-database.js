import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { applySchema } from './schema.js';

const MEMORY = ':memory:';

export const openDatabase = function (file) {
	if (file !== MEMORY) {
		mkdirSync(dirname(file), { recursive: true });
	}
	const database = new DatabaseSync(file);
	database.exec('PRAGMA foreign_keys = ON');
	applySchema(database);
	return database;
};

export const createTransactionRunner = function (database) {
	return function transaction(work) {
		if (database.isTransaction) {
			return work();
		}
		database.exec('BEGIN');
		try {
			const result = work();
			database.exec('COMMIT');
			return result;
		} catch (error) {
			database.exec('ROLLBACK');
			throw error;
		}
	};
};
