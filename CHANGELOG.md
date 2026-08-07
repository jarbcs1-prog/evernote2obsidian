# Changelog

All notable changes to this project will be documented in this file.

## [1.0.0] — 2026-05-07

### Added
- Zero-config ENEX to Obsidian conversion — no database, no external services
- ENEX XML parsing with note, tag, resource, and metadata extraction
- ENML to GitHub-flavored Markdown conversion
- YAML frontmatter generation (title, tags, dates, author, source URL, GPS)
- Attachment deduplication by MD5 hash
- `_resources/` folder for notebook attachments
- `@@@` stack naming convention support (`Stack@@@Notebook.enex` → `Stack/Notebook/`)
- ZIP packaging of all converted notes and attachments
- Drag-and-drop file upload
- Dark/light theme toggle
- Clean, responsive UI built with React 19 and Tailwind CSS 4

### Removed
- MySQL/Drizzle database dependency
- Manus OAuth authentication
- Built-in Forge storage API dependency
- tRPC server and router complexity
- Conversion history (stateless by design)

### Changed
- Simplified to single-page Express + React app
- All storage is now local filesystem (`.storage/` directory)
- Removed ~90% of dependencies