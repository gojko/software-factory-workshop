export const mountSectionMenu = function (menu, sections) {
	menu.replaceChildren();
	const list = document.createElement('ul');
	const links = new Map();
	for (const { id, label } of sections) {
		const item = document.createElement('li');
		const link = document.createElement('a');
		link.href = `#${id}`;
		link.textContent = label;
		item.append(link);
		list.append(item);
		links.set(id, link);
	}
	menu.append(list);

	const show = function () {
		const wanted = window.location.hash.slice(1);
		const current = links.has(wanted) ? wanted : sections[0].id;
		for (const { id } of sections) {
			document.getElementById(id).hidden = id !== current;
			if (id === current) {
				links.get(id).setAttribute('aria-current', 'true');
			} else {
				links.get(id).removeAttribute('aria-current');
			}
		}
	};

	window.addEventListener('hashchange', show);
	show();
};
