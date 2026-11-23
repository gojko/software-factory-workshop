# Contributing

## Project layout

```
workspace/
├── src/                  server and browser code, one folder per layer
│   ├── db/               DB layer: SQLite adapters, schema, repositories (the most critical layer: it holds the stored data)
│   ├── domain/           core logic and ports: services, price rules, validation; no HTTP, no SQL
│   ├── api/              API layer: Express routers and HTTP wiring
│   ├── www/              frontend layer: browser code (vanilla JS, ES modules): a small store for page state, commands that call the API and update it, widgets that render from it; bundled by esbuild into public/dist/
│   └── server.js, app.js composition root: wires the server layers together
├── public/               static files served as they are: HTML and CSS, tracked in git; public/dist/ holds the built bundle and is git-ignored
├── tests/                project tests (jest), one folder per layer, same names as above
│   ├── db/               tests of the DB layer
│   ├── domain/           tests of the core logic
│   ├── api/              tests of the API layer
│   ├── www/              tests of the frontend layer (*.css.test.js and similar)
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

Put server code and browser JavaScript in `src/`, static HTML and CSS in
`public/` and tests in `tests/`.
Keep the layers apart, so a reader can see from the path how critical a change
is:

- Put every file in the folder of its layer: `src/db/`, `src/domain/`,
  `src/api/` for the server and `src/www/` for the frontend JavaScript.
  `public/` holds only static HTML and CSS, and the built bundle.
- Put the tests of a layer in the matching folder under `tests/`. The suffix
  still sets the kind of test, so `tests/db/*.integration.test.js` checks a DB
  integration and `tests/domain/*.test.js` is a unit test of core logic.
- A layer depends only on the layer to its inside: `api` uses `domain`,
  `db` implements ports of `domain`. `domain` imports neither `db` nor `api`.
  Only `src/app.js` and `src/server.js` wire the layers together.

Keep logic that does not need HTTP in its own modules in `src/domain/`, so
unit tests can check it without a server. Change files under `.claude/workflow/` only to
change the tooling itself.

## Tests

- Unit tests give fast feedback. Keep them fast: no server, no network, no
  state shared between tests.
- Integration tests prove that the parts work together. They are slower. Reach
  the app at `process.env.APP_URL`; do not start the app in a test. All
  integration tests share one app, so do not make a test depend on data from
  another test.
- The file name decides which set a test is in.
- Naming: `*.test.js` for unit tests, `*.integration.test.js` for integration tests, `*.css.test.js` for browser tests (the `browser` jest project runs them in jsdom), `*.performance.test.js` for performance tests.
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
- Use ES modules, in `src/`.
- Do not add a front-end framework. The only build step is the esbuild bundle
  of `src/www/` into `public/dist/`. `make start` runs it.
- `src/www/` imports nothing from the server layers (`db`, `domain`, `api`).
- Plans live in `plans/`. Use `/impact-analysis`, `/plan-execution` and
  `/execute` to analyse, plan and run a change.
