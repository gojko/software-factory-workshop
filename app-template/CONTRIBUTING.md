# Contributing

## Project layout

```
workspace/
├── src/                  server code (Node.js, Express)
├── public/               browser code, served as static files (vanilla HTML, CSS, JS)
├── tests/                project tests (jest)
│   ├── *.test.js         unit tests: check the logic of one module in isolation
│   └── *.integration.test.js  integration tests: check that the app works as a whole, through HTTP
├── plans/                plans, their .plan.json sidecars and .progress.jsonl records
├── .claude/
│   ├── agents/           workflow-worker, workflow-gate, workflow-check
│   ├── commands/         /impact-analysis, /plan-execution, /execute, /regulator
│   ├── settings.local.json  hooks, environment, permissions
│   └── workflow/         tooling: regulator, workflow generator, lint rules and hooks
│       ├── bin/          entry points the hooks and commands run
│       ├── src/          tooling source
│       └── tests/        tooling tests
├── eslint.config.js      lint configuration, with the local plugin
├── jest.config.js        keeps the unit, integration and tooling tests apart, so each set can run on its own
├── makefile              build targets (run `make help`)
└── package.json          dependencies and dev dependencies
```

Put server code in `src/`, browser code in `public/` and tests in `tests/`.
Keep logic that does not need HTTP in its own modules in `src/`, so unit tests
can check it without a server. Change files under `.claude/workflow/` only to
change the tooling itself.

## Tests

- Unit tests give fast feedback. Keep them fast: no server, no network, no
  state shared between tests.
- Integration tests prove that the parts work together. They are slower. Reach
  the app at `process.env.APP_URL`; do not start the app in a test. All
  integration tests share one app, so do not make a test depend on data from
  another test.
- The file name decides which set a test is in.
- Naming: `*.test.js` for unit tests, `*.integration.test.js` for integration tests, `*.css.test.js` for browser tests, `*.performance.test.js` for performance tests.
- Use `jest` node environment when possible
- Call primary object under test `underTest`
- NEVER mock platform libraries; use Hexagonal architecture with ports/adapters
- Integration tests use `process.env` for infrastructure references
- Structure: `describe`/`test` blocks, arrange-act-assert flow
- Multiple `const` allowed in tests at arrange-act-assert boundaries
- Inline simple initialization with `expect` statement
- Use `beforeEach` for mocks/setup; single `underTest` instance
- Group 3+ tests with common arrange in `describe` with shared `beforeEach`
- Use `jest.fn()` for mocks, `toEqual` for strings, `randomUUID()` for test data
- Test usual scenarios + critical edge cases
- Use `expect(mock).toHaveBeenCalledWith(expect.objectContaining({...}))` for partial matching, not `mock.calls[0][0]`
- ⚠️ Test names describe outcome: "returns X when Y", "throws error when Z" (NOT "handles X")
  - Good: `test('returns chunks without error when text contains newlines')`
  - Bad: `test('handles newline characters')`

## Commands

- Run `make help` to list the makefile targets and what each one does.
- Run `jest <test files>` and `eslint <files>` from `$PATH` to check single
  files.

## Rules

- Write a failing test before the code that makes it pass.
- Use ES modules, in `src/` and in `public/`.
- Do not add a front-end framework or a build step: the browser loads the files
  in `public/` as they are.
- Plans live in `plans/`. Use `/impact-analysis`, `/plan-execution` and
  `/execute` to analyse, plan and run a change.
