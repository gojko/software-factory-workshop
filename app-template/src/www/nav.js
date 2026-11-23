const LINKS = [
	{ label: 'Search', href: '/search.html' },
	{ label: 'Reservations', href: '/reservations.html' },
	{ label: 'Set up', href: '/rooms.html', className: 'nav-end' }
];

export const mountNav = function (currentPath) {
	for (const old of document.querySelectorAll('body > nav')) {
		old.remove();
	}
	const nav = document.createElement('nav');
	for (const { label, href, className } of LINKS) {
		const link = document.createElement('a');
		link.href = href;
		link.textContent = label;
		if (className) {
			link.className = className;
		}
		if (href === currentPath) {
			link.setAttribute('aria-current', 'page');
		}
		nav.append(link);
	}
	document.body.prepend(nav);
};
