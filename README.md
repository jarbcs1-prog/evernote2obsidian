# Evernote 2 Obsidian Exporter

A **zero-config**, self-contained web app that converts Evernote export files (`.enex`) to Obsidian-compatible Markdown with YAML frontmatter.

No database. No external services. No auth. Just drag, drop and download.

## Features

- **Zero dependencies** — runs with `pnpm dev`, no MySQL, no external API keys
- **ENEX parsing** — reads Evernote XML exports, extracts notes, resources, timestamps and metadata
- **ENML to Markdown** — converts Evernote Markup Language to GitHub-flavored Markdown
- **YAML frontmatter** — generates frontmatter with title, tags, created/updated dates, author, source URL and GPS coordinates
- **Attachment handling** — deduplicates images and files by MD5 hash, stores in `_resources/` folders
- **Stack support** — `Stack@@@Notebook.enex` files create `Stack/Notebook/` folder hierarchies
- **ZIP packaging** — downloads a single ZIP containing all notes and attachments
- **Modern UI** — drag-and-drop upload, real-time status, instant download

## Quick Start

```bash
# Install
pnpm install

# Run — that's it, no config needed
pnpm dev

# Open http://localhost:3000
```

## Commands

| Command | Description |
|---|---|
| `pnpm dev` | Development server with hot reload |
| `pnpm build` | Build client (Vite) + type-check server |
| `pnpm start` | Run production server |
| `pnpm check` | TypeScript type checking |
| `pnpm format` | Format code with Prettier |

## How It Works

1. **Upload** — Drop one or more `.enex` files onto the page
2. **Convert** — Click "Convert Files"; each file is parsed, converted and packaged
3. **Download** — Click "Download ZIP" to get a folder-structured archive
4. **Import** — Extract the ZIP into your Obsidian vault

### Folder Structure

```
Notebook Name/
├── Note Title 1.md
├── Note Title 2.md
└── _resources/
    ├── image.png
    └── document.pdf
```

### Stack Support

Evernote stacks use the `@@@` separator in filenames:

| Filename | Folder path |
|---|---|
| `Work.enex` | `Work/*.md` |
| `Work@@@Projects.enex` | `Work/Projects/*.md` |

### YAML Frontmatter

Each note gets:

```yaml
---
title: Note Title
tags: [tag1, tag2]
created: 2024-01-15T10:30:00Z
updated: 2024-01-20T15:45:00Z
author: Author Name
sourceUrl: https://...
location:
  latitude: 37.7749
  longitude: -122.4194
---
```

## Project Structure

```
evernote-exporter/
├── server/
│   ├── index.ts            # Express server entry point
│   ├── storage.ts          # Local file storage
│   └── utils/
│       ├── enexParser.ts   # ENEX XML parsing
│       ├── enmlToMarkdown.ts # ENML → Markdown conversion
│       └── conversionService.ts # Conversion pipeline
├── client/
│   ├── index.html
│   └── src/
│       ├── App.tsx         # React app
│       ├── main.tsx        # Entry point
│       ├── pages/Upload.tsx # Upload UI
│       ├── components/ui/  # Radix UI + Tailwind components
│       └── index.css       # Global styles
├── vite.config.ts           # Vite configuration
├── tsconfig.json           # Client TypeScript config
├── tsconfig.server.json    # Server TypeScript config
└── package.json
```

## Environment Variables

Optional — only needed if you want a non-default port:

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Server port |

All other functionality is zero-config.

## Known Limitations

- **Large ENEX files** — Files over 200 MB may timeout; split large exports into multiple `.enex` files
- **Embedded web pages** — Complex HTML may not render perfectly in Markdown
- **Handwriting notes** — Stored as image resources, not text
- **Note links** — Cross-note links are not automatically converted

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Tailwind CSS 4, Radix UI, Sonner |
| Backend | Express, TypeScript |
| Build | Vite + esbuild |
| Storage | Local filesystem (`./.storage/`) |

## License

MIT
