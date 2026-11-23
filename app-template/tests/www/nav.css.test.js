import { beforeEach, describe, expect, test } from '@jest/globals';
import { mountNav } from '../../src/www/nav.js';

describe('mountNav', () => {
	beforeEach(() => {
		document.body.innerHTML = '<main id="content"></main>';
	});

	test('puts a nav with the page links at the start of body when mounted', () => {
		mountNav('/search.html');

		const nav = document.body.firstElementChild;
		expect(nav.tagName).toEqual('NAV');
		const links = [...nav.querySelectorAll('a')].map((a) => [a.textContent, a.getAttribute('href')]);
		expect(links).toEqual([
			['Search', '/search.html'],
			['Reservations', '/reservations.html'],
			['Set up', '/rooms.html']
		]);
	});

	test('puts the Set up link last, pushed to the right, when mounted', () => {
		mountNav('/search.html');

		const last = document.querySelector('nav').lastElementChild;
		expect(last.textContent).toEqual('Set up');
		expect(last.getAttribute('href')).toEqual('/rooms.html');
		expect(last.classList.contains('nav-end')).toBe(true);
	});

	test('marks only the link of the current path when mounted', () => {
		mountNav('/rooms.html');

		const current = [...document.querySelectorAll('nav a')]
			.filter((a) => a.getAttribute('aria-current') === 'page')
			.map((a) => a.getAttribute('href'));
		expect(current).toEqual(['/rooms.html']);
	});

	test('marks no link when the path is not in the nav', () => {
		mountNav('/other.html');

		expect(document.querySelectorAll('nav [aria-current]').length).toEqual(0);
	});

	test('keeps one nav when mounted twice', () => {
		mountNav('/search.html');
		mountNav('/rooms.html');

		expect(document.querySelectorAll('nav').length).toEqual(1);
		expect(document.querySelector('nav [aria-current="page"]').getAttribute('href')).toEqual('/rooms.html');
	});
});
