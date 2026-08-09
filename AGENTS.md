# Nodestitch Rule Gate

These rules are mandatory for every change in this repository and apply to all
descendant files and directories.

## Product scope and architecture

- Build the Windows 10 desktop product defined in `PROJECT_HANDOFF.md`.
- Use one stack only: Tauri 2 + React + TypeScript. Do not create or retain a
  parallel WPF, Electron, browser-product, or second prototype path.
- Keep the product local-first and single-user. Do not add cloud sync,
  accounts, telemetry, AI, collaboration, or cross-platform abstractions
  unless the product scope is explicitly changed.
- The confirmed MVP is one continuously growing, single-axis timeline. Its
  nodes support text, an immutable creation timestamp, a three-color marker,
  create, inline edit,
  archive-on-delete, and drag reordering.
- Marker color is exactly `green`, `blue`, or `red`, defaults to `green`, and
  is the only confirmed classification mechanism. Colors have no built-in
  status or label meaning; each user decides how to interpret them. Do not add
  a fourth color or parallel tag/status system without explicit product
  approval.
- Do not invent reminders, priorities, dependencies, attachments, rich text,
  or additional planning systems before those behaviors are accepted.
- Do not implement unresolved product choices listed in `PROJECT_HANDOFF.md`
  by silently choosing one interpretation.
- Keep window control, timeline/domain state, and persistence behind explicit
  boundaries. React components must not become a second source of truth.

## Domain and data rules

- A node must have a stable identity independent of its visible order.
- Ordering is domain state, not a side effect of DOM position or render order.
- Active nodes contain a stable ID, explicit order, exact user-owned text, an
  immutable `createdAt` timestamp, and one allowed marker color. Set
  `createdAt` when creation succeeds; editing, recoloring, and reordering must
  never change it.
- Format `createdAt` like `desktop-taskBoard`: show `HH:mm` for a node created
  today and `MM/DD HH:mm` otherwise. It is display-only and must never render
  as an input.
- Preserve user-entered text exactly except for behavior explicitly specified
  and tested. Do not silently normalize or discard content.
- Persistence writes must be atomic. A failed mutation must not leave memory
  and disk in contradictory states.
- Deleting an active node must atomically move its complete snapshot into
  history; it must not erase the record. History is read-only in the confirmed
  MVP and is reached from one `View history` entry point. Do not add restore,
  hard-delete, or per-history-node actions without product approval.
- UI components may request mutations and render state; they may not own a
  parallel authoritative node collection.

## Change protocol

- Before editing, state the observed or requested behavior, the owning layer,
  the smallest permitted file range, and how the result will be verified.
- For defects, trace the complete flow and locate the earliest incorrect stage.
  Fix that owner with the smallest coherent change.
- Never stack fallbacks, special cases, retries, downstream compensation, or
  test-only branches over a wrong implementation. Remove superseded paths.
- Do not mix unrelated cleanup or refactors into a focused change. Preserve
  user-owned or unrelated worktree changes.
- Follow the implementation gates in `PROJECT_HANDOFF.md`; do not implement a
  later gate before its prerequisites are accepted.

## Evidence and testing

- Never fabricate a passing test, screenshot, recording, log, build, or manual
  result. Report skipped, mocked, partial, and unrun checks as such.
- Never weaken or rewrite a test merely to make an implementation pass. Tests
  must assert product behavior and reproduce confirmed failures when relevant.
- A successful process exit is not sufficient evidence. Inspect the produced
  UI, state, or artifact and keep failures visible until their root cause is
  closed.
- Unit-test domain ordering, timestamp immutability/formatting, color
  constraints, mutation, and archival behavior. Integration-test the real
  persistence boundary rather than replacing it entirely with mocks.
- DOM checks cannot replace real Windows 10 interaction. Window behavior,
  focus, editing, keyboard flow, resizing, drag interactions, transparency,
  and visual quality require real Windows screenshots or recordings before the
  applicable acceptance gate can pass.
- Do not claim clean-machine, installer, WebView2-missing, startup, or
  persistence validation until that exact path has actually been exercised.

## Open-source discipline

- Keep the canonical product name `Nodestitch` and repository/package stem
  `nodestitch` unless a deliberate rename updates every product surface at
  once.
- Prefer original code and a small, documented dependency set. Record every
  copied third-party source, asset, font, and license.
- Do not copy code or assets from `desktop-taskBoard` without recording their
  source and verifying that their license permits reuse.
- Never commit secrets, machine-specific absolute paths, generated installers,
  dependency directories, or user data.
- Do not add telemetry or network access without explicit product approval and
  documentation of what data leaves the device.

## Visual and interaction language

- Use a restrained, iOS-inspired visual language adapted to a small desktop
  window. Do not reproduce a web component library wholesale or imitate a
  literal phone frame.
- Visible copy is a cost. Omit redundant page titles, counters, tags, control
  labels, and explanatory text when context plus a conventional symbol is
  sufficient. Do not remove semantic names: every icon-only control still
  needs an accessible label and keyboard focus.
- The primary surface does not show a generic `Timeline` heading or node-count
  copy. Add and history actions are icon-only. Icon controls use accessible
  names but no HTML `title` tooltip.
- The history clock remains in the same position while history is visible and
  toggles back to the active timeline when clicked again. Do not add a separate
  back-arrow action.
- The custom title bar exposes minimize and close only. The window is resizable
  but not maximizable; do not add maximize or fullscreen controls.
- The product mark uses the single-axis timeline metaphor. Do not replace it
  with a letterform, monogram, or the product-name initial. Its accepted palette
  is deep neutral graphite with a light timeline; do not reintroduce a blue
  filled background.
- The active-node archive action uses a conventional trash/delete glyph. Do
  not use a download, save, inbox, or transfer glyph for that action.
- Timeline rows must not move, expand, or animate on hover. Hover feedback may
  change color or surface immediately, but it must not change layout.
- Double-clicking a node body enters inline editing. A node's trailing controls
  are direct drag-reorder and archive actions; do not add a per-node dropdown
  menu for the confirmed MVP.
- Node text does not use a hover `title` to advertise double-click editing;
  retain the interaction itself without adding tooltip copy.
- Color controls are visually unlabeled filled circles. Do not add outline
  rings or checkmarks. Indicate the current choice with a restrained size or
  opacity difference, retain `aria-pressed`, and keep the literal color name in
  the accessible label.

## Delivery

- Keep the experience lightweight: the primary create/edit/archive/reorder flow
  must be obvious and fast without configuration screens or feature layers.
- The visual marker may expose its literal color name for accessibility, such
  as `Green category`, but must not assign product semantics to that color.
- Treat accessibility, keyboard use, empty state, long text, large node counts,
  and persistence failures as product behavior, not optional polish.
- Report unresolved decisions and unverified acceptance rows explicitly. Never
  expand scope to hide a failed gate.
