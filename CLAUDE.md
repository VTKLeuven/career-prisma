# CLAUDE.md

## Read `docs/` before you start

This repository documents itself in [`docs/`](docs/). **Read it before planning
or writing code**, beginning with
[`docs/design-decisions.md`](docs/design-decisions.md) for what the project is
and why it is shaped this way. [`docs/README.md`](docs/README.md) indexes the
rest: architecture, data model, auth, operations, conventions.

## Then read `AGENTS.md`

[`AGENTS.md`](AGENTS.md) holds the working rules for agents in this repo — the
project summary, the commands, and the handful of constraints that are easy to
violate. It is the single source; this file deliberately does not duplicate it,
so it cannot drift.

The short version, if you read nothing else:

- Database access goes through `src/lib/repos/` only — never import `prisma`
  elsewhere.
- There is no middleware; every admin page, action and route authorizes itself.
- Pushing to `main` deploys to production.
- `npm run build` is the only automated check — there are no tests.
