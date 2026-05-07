# Evernote to Obsidian Converter

A web application that converts Evernote export files (`.enex`) to Obsidian-compatible Markdown with YAML frontmatter and attachment support.

## Features

- **ENEX parsing** — Reads Evernote XML exports, extracts notes, resources, timestamps and metadata
- **YAML frontmatter** — Generates frontmatter with title, tags, created/updated dates
- **Attachment handling** — Extracts images, PDFs, documents and saves them to `attachments/` folders
- **ZIP packaging** — Downloads a single ZIP containing all notebooks and attachments
- **Modern UI** — Upload, convert, and download with a simple interface

## Quick Start

```bash
# Install dependencies
npm install

# Run the app
npm run dev

# Open http://localhost:3000
```

## How It Works

1. **Upload** — Upload an `.enex` file
2. **Convert** — The server parses the file and converts to Markdown
3. **Download** — Download a ZIP with organized notebooks and attachments
4. **Import** — Extract the ZIP into your Obsidian vault

### Folder Structure

```
Notebook Name/
├── Note Title 1.md
├── Note Title 2.md
└── attachments/
    ├── image.png
    └── document.pdf
```

### YAML Frontmatter

Each note includes:

```yaml
---
title: Note Title
created: 2024-01-15
updated: 2024-01-20
tags:
  - tag1
  - tag2
---
```

## Commands

| Command | Description |
|---|---|
| `npm run dev` | Development server with hot reload |
| `npm run build` | Build client (Vite) + type-check server |
| `npm run start` | Run production server |
| `npm run check` | TypeScript type checking |

## Exporting from Evernote

**Note:** Evernote does not have a native Linux desktop app. Use one of these methods:

1. **Evernote Desktop** (Windows/Mac) — Right-click notebook → Export → ENEX
2. **evernote-backup** (Linux) — CLI tool that uses Evernote API:
   ```bash
   pipx install evernote-backup
   evernote-backup init-db
   evernote-backup sync
   evernote-backup export output_dir/
   ```
3. **Evernote Web** — Can export individual notes only (not full notebooks)

## Project Structure

```
evernote2obsidian/
├── server/
│   ├── index.ts          # Express server entry point
│   ├── enex-parser.ts    # ENEX XML parsing
│   └── converter.ts      # Conversion to Markdown
├── client/
│   ├── index.html
│   └── src/
│       ├── App.tsx       # React app
│       ├── main.tsx      # Entry point
│       └── index.css     # Global styles
├── vite.config.ts        # Vite configuration
├── tsconfig.json         # TypeScript config
└── package.json
```

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 7 |
| Backend | Express, TypeScript |
| Build | Vite, tsx |

## License

MIT