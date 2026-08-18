# docs/

Orientation for anyone — human or agent — landing in this repository.

Start with **[design-decisions.md](design-decisions.md)**: what the project is
and the handful of choices that explain why the code looks the way it does.

| File | Read it when |
|---|---|
| [design-decisions.md](design-decisions.md) | You are new here. Start at the top. |
| [architecture.md](architecture.md) | You need to know where code goes |
| [data-model.md](data-model.md) | You are touching the database |
| [auth.md](auth.md) | You are touching login, sessions, or access control |
| [operations.md](operations.md) | You are building, running, or deploying |
| [conventions.md](conventions.md) | You are about to write code |

Also in the repo root, and still accurate:

- `SETUP.md` — full install, Docker, environment table
- `MIGRATION.md` — the record of the Directus → Prisma migration
- `k6/README.md` — load testing

Keep these files current. If you make a decision an agent would otherwise
have to reverse-engineer from the code, write it down here.
