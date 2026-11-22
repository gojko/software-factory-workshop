const showGreeting = async function () {
	const heading = document.getElementById('greeting');
	try {
		const response = await fetch('/api/greeting');
		const { message } = await response.json();
		heading.textContent = message;
	} catch {
		heading.textContent = 'The greeting could not be loaded.';
	}
};

showGreeting();
