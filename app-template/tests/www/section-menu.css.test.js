import { beforeEach, describe, expect, test } from '@jest/globals';
import { mountSectionMenu } from '../../src/www/section-menu.js';

describe('mountSectionMenu', () => {
	let menu;
	const visible = () => [...document.querySelectorAll('section')].filter((s) => !s.hidden).map((s) => s.id);

	beforeEach(() => {
		window.location.hash = '';
		document.body.innerHTML = `
			<aside id="menu"></aside>
			<section id="one"><h2>One</h2></section>
			<section id="two"><h2>Two</h2></section>
			<section id="three"><h2>Three</h2></section>`;
		menu = document.getElementById('menu');
	});

	const mount = () => mountSectionMenu(menu, [
		{ id: 'one', label: 'First' },
		{ id: 'two', label: 'Second' },
		{ id: 'three', label: 'Third' }
	]);

	test('lists a link for each section when mounted', () => {
		mount();

		const links = [...menu.querySelectorAll('a')].map((a) => [a.textContent, a.getAttribute('href')]);
		expect(links).toEqual([['First', '#one'], ['Second', '#two'], ['Third', '#three']]);
	});

	test('shows only the first section when the hash is empty', () => {
		mount();

		expect(visible()).toEqual(['one']);
		expect(menu.querySelector('[aria-current="true"]').textContent).toEqual('First');
	});

	test('shows only the section of the hash when the hash names one', () => {
		window.location.hash = '#three';

		mount();

		expect(visible()).toEqual(['three']);
		expect(menu.querySelector('[aria-current="true"]').textContent).toEqual('Third');
	});

	test('shows the first section when the hash names no section', () => {
		window.location.hash = '#nothing';

		mount();

		expect(visible()).toEqual(['one']);
	});

	test('switches the visible section when the hash changes', () => {
		mount();

		window.location.hash = '#two';
		window.dispatchEvent(new Event('hashchange'));

		expect(visible()).toEqual(['two']);
		expect(menu.querySelectorAll('[aria-current="true"]').length).toEqual(1);
		expect(menu.querySelector('[aria-current="true"]').textContent).toEqual('Second');
	});
});
