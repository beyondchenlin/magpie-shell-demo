# Library (native Linux, magpie 0.1.1240)

Frameless window shots. Library is a **plugin** (Plugins › Built-in › Library); when On it appears in the top nav between Agents and Providers.

## Shots

| File | What |
|------|------|
| 01-instructions.png | Instructions tab: Shared instructions card, Default (Empty, In use), + New set; AGENTS empty (“None of your agents reads…”, Cursor note) |
| 02-default-set-open.png | Default set expanded: name field + Markdown textarea placeholder; Chevron down; Markdown · Ctrl+S |
| 03-instructions-agents.png | Same Instructions chrome; agents section focus |

Tabs also present (not deep-shot yet): MCP servers, Skills, Hooks, RTK. Header acts: Library folder, Backups.

## Demo consumption (v0.1.31)

- `LibraryView` Instructions 1:1 empty + open set + New set + Ctrl/Cmd+S mock save toast
- Feature flag `localStorage magpie.feature.library` from Plugins Built-in toggle
- MCP/Skills/Hooks/RTK: placeholder until nested capture
