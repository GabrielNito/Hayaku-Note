# Hayaku Note

Notes. No account, no login, no friction between you and the next note.

Reading is always free. Writing — creating, saving, deleting, renaming — always asks for a 6-digit PIN, no exceptions.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/gabrielnito/hayaku-note&env=DATABASE_URL,PIN_HASH&envDescription=See+how+to+generate+each+value+in+the+section+below&project-name=hayaku-note&repository-name=hayaku-note)
![Docker](https://img.shields.io/badge/docker-compose%20ready-blue?logo=docker)
![License](https://img.shields.io/badge/license-MIT-black)
![Stack](https://img.shields.io/badge/stack-Next.js%20%2B%20Bun%20%2B%20Prisma-black)

---

## What this is

A minimal space built for one thing: taking notes in class. Folders and markdown files in a tree, an editor with formatting shortcuts like `#`, `-`, `` ``` `` as you type, and a light/dark theme.

- **No account.** There's no user, no session. What exists is a 6-digit PIN that any write action (create, save, delete, rename) asks for — on the spot, every time, never cached.
- **No lock-in.** All content is stored as plain markdown. If you ever want to leave, your data is already in the format you want.
- **Self-hostable.** Run locally, on your VPS with Docker Compose, or serverless with Vercel + Neon.

## Status

This is v1 — fully implemented with folder/file tree, PIN-gated writes, security policies, Google Authenticator (TOTP), markdown editor, image paste, quick open, command bar, and settings management; see [`docs/TASKS.md`](./docs/TASKS.md) for future plans.

## Stack

| Component | Technology |
|---|---|
| Framework | [Next.js](https://nextjs.org) 16 (App Router) |
| Runtime | [Bun](https://bun.sh) / [Node.js](https://nodejs.org) 22 |
| UI | [shadcn/ui](https://ui.shadcn.com) + Tailwind CSS v4 |
| Editor | [Tiptap](https://tiptap.dev) + `tiptap-markdown` |
| ORM | [Prisma](https://www.prisma.io) |
| Database | [PostgreSQL](https://www.postgresql.org) / [Neon](https://neon.tech) |
| Containerization | Docker & Docker Compose |

Full architecture in [`docs/SPEC.md`](./docs/SPEC.md), design system in [`docs/DESIGN.md`](./docs/DESIGN.md).

---

## 🐳 Quick Start with Docker (Recommended)

Run the full stack (Next.js web application + PostgreSQL database with automated schema migrations) in two minutes:

### 1. Clone & Setup Environment

```bash
cp .env.example .env
```

### 2. Generate Secrets

Generate your bcrypt PIN hash, settings setup key, and 32-byte TOTP key in one command:

```bash
bun run generate:secrets 123456
```
*(Replace `123456` with your desired 6-digit PIN)*

Copy the printed environment variables and paste them into your `.env` file.

> [!NOTE]
> In `.env` for Docker Compose, `$` signs in the bcrypt hash are escaped as `$$` (e.g. `PIN_HASH=$$2b$$10$$...`) to prevent Docker variable interpolation.

### 3. Start Containers

```bash
docker compose up -d
```

Open **`http://localhost:3000`** in your browser. Database migrations and schema syncing run automatically on container startup!

### Useful Docker Commands

```bash
# View live container logs
docker compose logs -f

# Check container status
docker compose ps

# Start only the database container (for local dev with bun dev)
docker compose up -d postgres

# Stop containers
docker compose down

# Rebuild containers after code modifications
docker compose up -d --build
```

---

## 💻 Local Development

**1. Install dependencies:**

```bash
bun install
```

**2. Start database (Docker or local):**

Run only the PostgreSQL container:

```bash
docker compose up -d postgres
```

*(Or use an existing local PostgreSQL instance / remote database like Neon).*

**3. Configure `.env`:**

```bash
cp .env.example .env
bun run generate:secrets 123456
```

Ensure `DATABASE_URL` matches your local Postgres instance in `.env`:

```env
DATABASE_URL="postgresql://hayaku:change_this_secret_password@localhost:5432/hayaku_db?schema=public"
```

**4. Run migrations & start dev server:**

```bash
bunx prisma db push
bun dev
```

---

## ☁️ Deploy to Vercel

1. Connect the repo to Vercel.
2. Set up a free serverless Postgres instance on [Neon](https://neon.tech).
3. Add environment variables in Vercel settings:
   - `DATABASE_URL`
   - `PIN_HASH`
   - `SETTINGS_SETUP_KEY`
   - `TOTP_ENCRYPTION_KEY`
4. Deploy!

---

## Why it exists

This project exists to remove friction from taking notes in class: open the site, write, done. No login to wait on, no workspace structure designed for something else, no free-plan limits interrupting you mid-semester. And since content is plain markdown, it's never locked into this project — if you ever leave, your data is already in the format you want.

## Contributing

Feel free to open issues or PRs, but the scope is deliberately small (see the "Out of scope" section in [`docs/SPEC.md`](./docs/SPEC.md)) — features like multi-user support, draggable blocks, or generic file attachments probably won't land here; that's what forks are for.

## License

MIT — use it, modify it, ship it, no permission needed.
