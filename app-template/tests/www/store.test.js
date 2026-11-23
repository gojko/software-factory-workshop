import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, test } from '@jest/globals';
import { createStore } from '../../src/www/store.js';

describe('createStore', () => {
	let initial;
	let underTest;

	beforeEach(() => {
		initial = { name: randomUUID(), count: 1 };
		underTest = createStore(initial);
	});

	test('returns the initial state when getState is called', () => {
		expect(underTest.getState()).toEqual(initial);
	});

	test('merges the patch over the state when setState gets an object', () => {
		const name = randomUUID();

		underTest.setState({ name });

		expect(underTest.getState()).toEqual({ name, count: 1 });
	});

	test('passes the old state to the function when setState gets a function', () => {
		underTest.setState((state) => ({ count: state.count + 1 }));

		expect(underTest.getState()).toEqual({ name: initial.name, count: 2 });
	});

	test('keeps the old state object unchanged when setState is called', () => {
		const before = underTest.getState();

		underTest.setState({ count: 5 });

		expect(before).toEqual(initial);
		expect(underTest.getState()).not.toBe(before);
	});

	test('calls subscribers in order with the new state when setState is called', () => {
		const calls = [];
		underTest.subscribe((state) => calls.push(['first', state]));
		underTest.subscribe((state) => calls.push(['second', state]));

		underTest.setState({ count: 7 });

		const expected = { name: initial.name, count: 7 };
		expect(calls).toEqual([['first', expected], ['second', expected]]);
	});

	test('does not call a listener when it has unsubscribed', () => {
		const calls = [];
		const unsubscribe = underTest.subscribe(() => calls.push('called'));
		unsubscribe();

		underTest.setState({ count: 2 });

		expect(calls).toEqual([]);
	});

	describe('when a listener unsubscribes another during an announcement', () => {
		let calls;
		let unsubscribeSecond;

		beforeEach(() => {
			calls = [];
			underTest.subscribe(() => {
				calls.push('first');
				unsubscribeSecond();
			});
			unsubscribeSecond = underTest.subscribe(() => calls.push('second'));
			underTest.subscribe(() => calls.push('third'));
		});

		test('does not call the removed listener afterwards', () => {
			underTest.setState({ count: 2 });

			expect(calls).toEqual(['first', 'third']);
		});

		test('keeps the store working when the next change is announced', () => {
			underTest.setState({ count: 2 });
			calls.length = 0;

			underTest.setState({ count: 3 });

			expect(calls).toEqual(['first', 'third']);
			expect(underTest.getState().count).toEqual(3);
		});
	});
});
