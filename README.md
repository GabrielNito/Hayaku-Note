# Hayaku Note

A minimal, personal, zero-friction markdown notebook with instant keyboard navigation, granular security policies, and built-in AI assistance.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/gabrielnito/hayaku-note&env=DATABASE_URL,PIN_HASH,UPLOADTHING_TOKEN,SETTINGS_SETUP_KEY,TOTP_ENCRYPTION_KEY&project-name=hayaku-note&repository-name=hayaku-note)
![Docker](https://img.shields.io/badge/docker-compose%20ready-blue?logo=docker)
![License](https://img.shields.io/badge/license-MIT-black)
![Stack](https://img.shields.io/badge/stack-Next.js%20%2B%20Bun%20%2B%20Prisma%20%2B%20Tailwind-black)

[🇧🇷 Leia o README em Português](./docs/README_BR.md)

---

## What is Hayaku Note?

**Hayaku Note** was created to eliminate friction from personal note-taking and knowledge management. There are no traditional accounts, sign-up flows, or heavy workspace overhead. Instead, it provides an instant, keyboard-friendly workspace stored as pure Markdown in your own database — with optional granular PIN security for actions and TOTP-protected admin controls.

- **No login friction, no accounts.** No complex user tables or OAuth providers. Everyday writing and reading can be as open or locked down as you want, controlled via a 6-digit PIN.
- **Granular security policies.** Fully configurable via an admin panel protected by Google Authenticator (TOTP). Choose whether notes are public or private, require PIN per session/file, gate search, command bar, image uploads, or AI chat.
- **No vendor lock-in.** All content is stored as raw Markdown in PostgreSQL. Import and export single notes or full files anytime.
- **Context-aware AI Assistant.** Chat directly with your active note using Google Gemini, OpenAI, or Anthropic (bring your own API keys, encrypted at rest). AI can generate structured edit proposals with visual line-by-line diffs to accept or reject.
- **Keyboard-first & CLI Command Bar.** Fuzzy search (`Ctrl+P`), terminal-like Command Bar (`Ctrl+Shift+P`) with `touch`, `mkdir`, `rm`, `cp`, and `mv`, plus automatic Tab completion.
- **Zero hosting costs.** Designed to run 100% within the free tiers of Vercel, Neon, and Uploadthing.

---

## Features

- 📝 **Modern Tiptap Markdown Editor**: Auto-formatting shortcuts (`#`, `-`, `>`), task lists (`- [ ]`), GFM tables with dual visual/markdown editing modes, inline code, and syntax-highlighted code blocks (JS, TS, Python, Bash, SQL, JSON, HTML, CSS) with copy and language selection.
- 🖼️ **Image Drag & Drop / Paste**: Paste prints or drop images directly into notes with automatic cloud upload via Uploadthing and client-side resizable handles.
- 🤖 **Integrated AI Document Assistant**: Chat with your documents using Google Gemini, OpenAI, or Anthropic. Get line-by-line AI proposal diffs directly in your editor.
- ⚡ **CLI Command Bar & Quick Open**: Fast fuzzy file finder (`Ctrl+P`) and modal CLI (`Ctrl+Shift+P`) to quickly create, move, copy, and delete files and nested folders without touching the mouse.
- 📑 **Dynamic Document Index (Table of Contents)**: Auto-generated heading navigation (H1–H3) with smooth scrolling and responsive mobile sheet support.
- 🔒 **Granular Security & Google Authenticator (TOTP)**: Admin dashboard protected by 2FA (TOTP) to toggle PIN requirements for tree access, note reading, editing, deleting, moving/copying, exporting, searching, and AI chat.
- 🌓 **Instant Theme Toggle**: Seamless light and dark mode with system preference auto-detection (`Ctrl+D`).
- 📱 **Fully Responsive**: Optimized desktop resizable panels and mobile sheet navigation.

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Framework** | [Next.js](https://nextjs.org) 16 (App Router) + TypeScript | Fullstack React framework with Server Actions |
| **Runtime & Pkg Manager** | [Bun](https://bun.sh) | Fast package manager and local script runtime |
| **Styling & UI** | [Tailwind CSS](https://tailwindcss.com) v4 + [shadcn/ui](https://ui.shadcn.com) + [Lucide](https://lucide.dev) | Minimalist component system & responsive design |
| **Animations** | [Motion](https://motion.dev) | Smooth layout & sidebar transitions |
| **Editor** | [Tiptap](https://tiptap.dev) + `tiptap-markdown` + `lowlight` | Notion-style rich Markdown editor with code highlight |
| **Database & ORM** | [Neon](https://neon.tech) + [Prisma](https://www.prisma.io) | Serverless PostgreSQL database & type-safe ORM |
| **File Storage** | [Uploadthing](https://uploadthing.com) | Image paste & drag-and-drop upload |
| **AI Integration** | [Vercel AI SDK](https://sdk.vercel.ai) (`@ai-sdk/google`, `@ai-sdk/openai`, `@ai-sdk/anthropic`) | Contextual document chat and edit proposals |
| **Security & Cryptography** | `jose` (JWT) + `bcryptjs` + Node.js `crypto` (AES-256-GCM) | Scoped PIN sessions, TOTP validation, and encrypted API key storage |
| **Deploy** | [Vercel](https://vercel.com) | Zero-config serverless deployment |

Full specification in [`docs/SPEC.md`](./docs/SPEC.md) and design system in [`docs/DESIGN.md`](./docs/DESIGN.md).

## 🐳 Quick Start with Docker (Self-Hosted)

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

### 3. Start Containers
```bash
docker compose up -d
```

Open **`http://localhost:3000`** in your browser. Database schema migrations run automatically on container startup!

#### Useful Docker Commands
```bash
# View live container logs
docker compose logs -f

# Start only the database container (for local dev with bun dev)
docker compose up -d postgres

# Stop containers
docker compose down

# Rebuild containers after code modifications
docker compose up -d --build
```

---

## 💻 Local Development & Vercel Deploy

### 1. Prerequisites
- [Bun](https://bun.sh) installed locally
- A free account on [Neon](https://neon.tech) (PostgreSQL)
- (Optional) A free account on [Uploadthing](https://uploadthing.com) for image uploads

### 2. Fork & Clone
```bash
git clone https://github.com/YOUR_USERNAME/hayaku-note.git
cd hayaku-note
bun install
```

### 3. Generate PIN Hash and Encryption Keys

**a. Generate your 6-digit PIN hash:**
```bash
bun run scripts/generate-pin-hash.ts
# Follow the prompt and copy the generated bcrypt hash
```

**b. Generate your TOTP encryption key (32 bytes Base64):**
```bash
openssl rand -base64 32
# Copy the output key
```

### 4. Configure Environment Variables

Create a `.env` file based on `.env.example`:

```env
DATABASE_URL="postgresql://user:password@ep-xyz.us-east-2.aws.neon.tech/neondb?sslmode=require"
PIN_HASH="$2a$10$..."
UPLOADTHING_TOKEN="your-uploadthing-token"
SETTINGS_SETUP_KEY="choose-a-strong-secret-key"
TOTP_ENCRYPTION_KEY="your-generated-base64-32byte-key"
```

| Variable | Description |
|---|---|
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `PIN_HASH` | Bcrypt hash generated in step 3a — **never** put your plain PIN here |
| `UPLOADTHING_TOKEN` | Token from Uploadthing dashboard for image uploads |
| `SETTINGS_SETUP_KEY` | One-time secret key used to initially enroll Google Authenticator in Settings |
| `TOTP_ENCRYPTION_KEY` | 32-byte Base64 key used to encrypt the Authenticator secret and AI API keys (AES-256-GCM) |

> **Note on Settings Setup:** When you first open the Settings modal on the site, you will be prompted for your `SETTINGS_SETUP_KEY`. This will generate a QR code to scan with Google Authenticator. After enrolling, you can remove `SETTINGS_SETUP_KEY` from your environment.

### 5. Run Migrations & Start Development

```bash
bunx prisma migrate deploy
bun dev
```

Open [http://localhost:3000](http://localhost:3000) to view your notebook.

### 6. Deploy to Vercel

1. Push your repository to GitHub.
2. Import the project into [Vercel](https://vercel.com).
3. Add the 5 environment variables from Step 4.
4. Deploy!

---

## Keyboard Shortcuts

| Shortcut | Description |
|---|---|
| <kbd>Ctrl</kbd> / <kbd>Cmd</kbd> + <kbd>P</kbd> | Quick Open (fuzzy search files) |
| <kbd>Ctrl</kbd> / <kbd>Cmd</kbd> + <kbd>Shift</kbd> + <kbd>P</kbd> | Command Bar (modal CLI) |
| <kbd>Ctrl</kbd> / <kbd>Cmd</kbd> + <kbd>S</kbd> | Save active note (triggers PIN if required) |
| <kbd>Ctrl</kbd> / <kbd>Cmd</kbd> + <kbd>B</kbd> | Bold selection (inside editor) |
| <kbd>Ctrl</kbd> / <kbd>Cmd</kbd> + <kbd>Shift</kbd> + <kbd>B</kbd> | Toggle sidebar |
| <kbd>Ctrl</kbd> / <kbd>Cmd</kbd> + <kbd>/</kbd> | Toggle AI Chat |
| <kbd>Ctrl</kbd> / <kbd>Cmd</kbd> + <kbd>D</kbd> | Toggle light / dark theme |
| <kbd>Esc</kbd> | Close dialogs, command bar, or quick open |

**Command Bar CLI commands (`Ctrl+Shift+P`):**
- `touch path/to/note` — Create a new note (creates parent folders automatically)
- `mkdir path/to/folder` — Create a new folder
- `rm path/to/item` — Delete note or folder (and its uploaded images)
- `cp source destination` — Copy note or folder recursively
- `mv source destination` — Move or rename note/folder
- <kbd>Tab</kbd> — Autocomplete path segments

---

## Contributing

Contributions are welcome! If you find a bug or want to suggest improvements, feel free to open an issue or pull request. Please note that features like multi-user authentication, cloud sync accounts, or proprietary block types are intentionally out of scope (see [`docs/SPEC.md`](./docs/SPEC.md)).

---

## License

[MIT](./LICENSE.md) © [Gabriel Nito](https://github.com/GabrielNito)

