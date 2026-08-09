# Nodestitch

Nodestitch is a lightweight, local-first desktop planner that turns an ongoing
plan into a simple line of editable text nodes.

## Core scope

- Maintain one continuously growing, single-axis timeline.
- Add node text with an automatic, read-only creation timestamp.
- Classify nodes with a green, blue, or red circular marker; green is the
  default, and users decide what each color means for their own workflow.
- Edit existing nodes in place and drag them into a new order.
- Archive deleted nodes into read-only history instead of erasing them.
- Reach archived nodes through one icon-only `View history` control.
- Persist the timeline locally across restarts.

The working application now covers this complete core loop. It deliberately
does not include accounts, sync, reminders, priorities, restore actions, or a
second status/tag system.

## Interaction language

- The window uses a compact, restrained iOS-inspired visual language without
  imitating a phone frame or Ant Design components.
- The regular desktop window opens at 520 x 760 logical pixels, remains
  resizable down to 320 x 500, and uses an opaque edge without a decorative
  outer border or transparent-window halo.
- The primary view has no generic timeline title, node count, color label, or
  text inside the history and add controls.
- Icon controls do not show native hover-title tooltips; their accessible names
  remain available to assistive technology.
- The history clock stays in place and toggles between history and the active
  timeline. The title bar contains minimize and close only, with no maximize or
  fullscreen action.
- The product mark is a light single-axis timeline on deep neutral graphite,
  without a lettermark or blue filled background. The node archive action uses
  a conventional trash glyph rather than a download symbol.
- Double-click node text to edit it in place. Press Enter to commit or Escape
  to cancel; Shift+Enter inserts a line break.
- Drag the grip to reorder. With the grip focused, Alt+Up/Down reorders and
  Enter starts editing.
- Click a node marker to cycle its color. Colors are intentionally semantic-free.
- Node entry, archival, and committed reordering use short iOS-style motion;
  reduced-motion preferences disable non-essential transitions, and fast local
  writes do not flash a transient saving indicator.

## Technical direction

- Tauri 2
- React
- TypeScript
- SQLite persistence behind an explicit repository boundary
- Windows 10 as the first acceptance platform

See [`PROJECT_HANDOFF.md`](PROJECT_HANDOFF.md) for confirmed requirements,
open product decisions, and implementation gates. Every contribution must also
follow [`AGENTS.md`](AGENTS.md).

## Development

Prerequisites are the standard Tauri 2 Windows toolchain, Node.js, npm, and
Rust. Install and run the desktop app with:

```powershell
npm install
npm run tauri dev
```

Useful verification commands:

```powershell
npm test
npm run build
cd src-tauri
cargo test
```

Build the Windows NSIS installer with `npm run tauri build`. The installer,
installed executable, and required desktop shortcut use the same Nodestitch
product mark; uninstalling removes the desktop shortcut. Build outputs,
screenshots, dependency directories, and local user data are ignored by Git.
Windows release builds use the GUI subsystem and must never expose a console
window during ordinary desktop-shortcut startup.

The production state owner is `TimelineController`; React subscribes to its
committed snapshot, while the Rust boundary validates and atomically writes one
versioned document to SQLite. Failed writes do not publish an in-memory state
that differs from disk. On Windows, the database lives in the application data
directory selected by Tauri for the bundle identifier.

## Name

Each node is stitched into one continuing plan: **Nodestitch**. The canonical
product name is `Nodestitch`; the repository, package, and folder stem is
`nodestitch`.

## Open-source status

Nodestitch is open-source software available under the
[MIT License](LICENSE). The public bundle identifier is
`app.nodestitch.desktop`. Adapted third-party implementation details and their
licenses are recorded in [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).

Contributions are welcome; see [`CONTRIBUTING.md`](CONTRIBUTING.md) and
[`SECURITY.md`](SECURITY.md) before opening a pull request or security report.
