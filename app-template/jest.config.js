const PROJECT_ROOTS = ['<rootDir>/src', '<rootDir>/tests'];
const INTEGRATION_TEST = '\\.integration\\.test\\.js$';
const BROWSER_TEST = '\\.css\\.test\\.js$';

export default {
	projects: [
		{
			displayName: 'unit',
			roots: PROJECT_ROOTS,
			testPathIgnorePatterns: ['/node_modules/', INTEGRATION_TEST, BROWSER_TEST],
			transform: {}
		},
		{
			displayName: 'browser',
			roots: PROJECT_ROOTS,
			testRegex: BROWSER_TEST,
			testEnvironment: 'jsdom',
			transform: {}
		},
		{
			displayName: 'integration',
			roots: PROJECT_ROOTS,
			testRegex: INTEGRATION_TEST,
			globalSetup: '<rootDir>/tests/integration.global-setup.js',
			globalTeardown: '<rootDir>/tests/integration.global-teardown.js',
			transform: {}
		},
		{
			displayName: 'tooling',
			roots: ['<rootDir>/.claude/workflow/src', '<rootDir>/.claude/workflow/tests'],
			transform: {}
		}
	]
};
