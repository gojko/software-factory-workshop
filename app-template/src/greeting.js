const DEFAULT_NAME = 'world';

export const createGreeting = function (name = DEFAULT_NAME) {
	return { message: `Hello, ${name}!` };
};
