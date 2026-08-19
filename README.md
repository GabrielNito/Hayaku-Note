# Hayaku Note

Notes. No account, no login, no friction between you and the next note.

Reading is always free. Writing — creating, saving, deleting, renaming — always asks for a 6-digit PIN, no exceptions.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/gabrielnito/hayaku-note&env=DATABASE_URL,PIN_HASH&envDescription=See+how+to+generate+each+value+in+the+section+below&project-name=hayaku-note&repository-name=hayaku-note)
![License](https://img.shields.io/badge/license-MIT-black)
![Stack](https://img.shields.io/badge/stack-Next.js%20%2B%20Bun%20%2B%20Prisma-black)

---

## What this is

A minimal space built for one thing: taking notes in class. Folders and markdown files in a tree, an editor with formatting shortcuts like `#`, `-`, `` ``` `` as you type, and a light/dark theme.

- **No account.** There's no user, no session. What exists is a 6-digit PIN that any write action (create, save, delete, rename) asks for — on the spot, every time, never cached.
- **No lock-in.** All content is stored as plain markdown. If you ever want to leave, your data is already in the format you want.
- **No cost.** Runs entirely on the free tiers of Vercel + Neon.

## Status

This is v1 — fully implemented with folder/file tree, PIN-gated writes, security policies, Google Authenticator (TOTP), markdown editor, image paste, quick open, command bar, and settings management; see [`docs/TASKS.md`](./docs/TASKS.md) for future plans.

## Stack

| | |
|---|---|
| Framework | [Next.js](https://nextjs.org) 16 (App Router) |
| Runtime | [Bun](https://bun.sh) |
| UI | [shadcn/ui](https://ui.shadcn.com) + Tailwind |
| Editor | [Tiptap](https://tiptap.dev) + `tiptap-markdown` |
| ORM | [Prisma](https://www.prisma.io) |
| Database | [Neon](https://neon.tech) (serverless Postgres) |
| Deploy | [Vercel](https://vercel.com) |

Full architecture in [`docs/SPEC.md`](./docs/SPEC.md), design system in [`docs/DESIGN.md`](./docs/DESIGN.md).

## Run your own

**1. Fork this repo**, or click the deploy button above directly.

**2. Database:** create a free project on [Neon](https://neon.tech) and copy the connection string.

**3. Generate your PIN hash.** With Bun installed, from the project root:

```bash
bun run scripts/generate-pin-hash.ts
# prompts for a 6-digit PIN and prints the corresponding bcrypt hash
```

**4. Environment variables:**

| Variable | Description |
|---|---|
| `DATABASE_URL` | Neon connection string |
| `PIN_HASH` | Hash generated in step 3 — never put the plain PIN here |

| `SETTINGS_SETUP_KEY` | One-time secret used to enroll Google Authenticator. Define it directly, for example: `SETTINGS_SETUP_KEY=uma-chave-longa-e-aleatoria` |
| `TOTP_ENCRYPTION_KEY` | Base64 key with 32 bytes used to encrypt the Authenticator secret |

Generate `TOTP_ENCRYPTION_KEY` with `openssl rand -base64 32`, and add its output directly to the environment, for example: `TOTP_ENCRYPTION_KEY=<output-do-comando>`. Do not hash either settings variable. Remove the setup key after the first enrollment. To recover from a lost Authenticator, clear `totpSecretCriptografado` and `totpConfiguradoEm` in the single `Configuracao` record, set a new setup key, and enroll again.

**5. Local dev:**

```bash
bun install
bunx prisma migrate deploy
bun dev
```

**6. Run with Docker (App + PostgreSQL Database):**

```bash
# 1. Copy env file
cp .env.example .env

# 2. Generate secrets and add them to .env
bun run generate:secrets 123456

# 3. Start containers
docker compose up -d
```
Open `http://localhost:3000`. Database migrations and table syncing run automatically on container startup!

**7. Deploy:** connect the repo to Vercel, set the two env vars, done. No extra CI, no build config — it's a standard Next.js app.

## Why it exists

This project exists to remove friction from taking notes in class: open the site, write, done. No login to wait on, no workspace structure designed for something else, no free-plan limits interrupting you mid-semester. And since content is plain markdown, it's never locked into this project — if you ever leave, your data is already in the format you want.

## Contributing

Feel free to open issues or PRs, but the scope is deliberately small (see the "Out of scope" section in [`SPEC.md`](./SPEC.md)) — features like multi-user support, draggable blocks, or generic file attachments probably won't land here; that's what forks are for.

## License

MIT — use it, modify it, ship it, no permission needed.
