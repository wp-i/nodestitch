# Nodestitch: Product Definition and Delivery Gates

Updated: 2026-08-10

## 0. One-sentence product

Nodestitch is a lightweight, local-first Windows desktop planner for maintaining
an ongoing plan as an ordered line of concise text nodes.

## 1. Confirmed requirements

- The interaction model is visually comparable to Ant Design's Timeline: a
  sequence of nodes connected as one readable progression.
- The product is a lightweight desktop application, taking engineering and
  delivery discipline from `desktop-taskBoard` without inheriting its
  sword/shield product rules or window behavior by accident.
- The product has exactly one single-axis timeline that keeps growing as nodes
  are appended.
- A user can add node text, edit it in place, and drag nodes into a new manual
  order.
- Every active node displays when it was added. This creation timestamp is
  generated automatically and cannot be edited.
- Each node uses one circular marker as a user-defined category. The only
  colors are green, blue, and red; green is the default. The product assigns no
  fixed status or label meaning to any color.
- Deleting an active node archives its complete content in history instead of
  erasing it.
- The main timeline has one icon-only `View history` control with an accessible
  name. Archived nodes are view-only in the confirmed MVP and have no restore,
  hard-delete, or per-node action.
- The app uses a normal small desktop window rather than the passive widget
  behavior of `desktop-taskBoard`.
- The timeline represents continuous task planning rather than a one-off static
  document.
- The project is expected to become open source.

## 2. Working technical baseline

These engineering choices keep one coherent implementation path while the
remaining details below are resolved:

- Tauri 2 + React + TypeScript.
- Windows 10 is the first real acceptance platform.
- Local-first, single-user storage.
- Domain state, persistence, window behavior, and React rendering remain
  separate boundaries.
- SQLite is the preferred persistence implementation unless the eventual data
  model proves that a simpler atomic document store is sufficient.

No application scaffolding should start until Gate A is accepted.

## 3. Confirmed domain

An active node contains:

- a stable node ID;
- explicit manual order independent of the rendered DOM;
- exact user-owned text;
- an immutable `createdAt` timestamp captured when creation succeeds;
- one marker color from `green`, `blue`, or `red`, defaulting to `green`.

An archived node preserves the complete active-node snapshot plus an internal
`archivedAt` timestamp for deterministic history ordering. Moving a node to
history is one atomic domain mutation; it is not a hard delete.

Manual ordering remains domain state. Creation time is display metadata and
never automatically changes manual order.

## 4. Confirmed interaction behavior

- New nodes append to the end of the single timeline.
- A successful add captures `createdAt` once. Text edits, color changes, and
  drag reordering preserve that value.
- Double-clicking existing node content enters inline editing. Keyboard users
  can enter the same editor from the focused reorder control. The node surface
  does not show a native hover `title` for this gesture.
- Nodes can be reordered by dragging.
- The app uses ordinary desktop focus and discoverability in a normal small
  window.
- One icon-only history clock stays in the same position in both views. Its
  first click opens archived nodes and its next click returns to the active
  timeline; there is no separate back-arrow action.
- The add action is icon-only. Active nodes expose direct reorder and archive
  controls and do not use a per-node action dropdown.
- History is read-only in the MVP. It does not expose restore, hard-delete, or
  per-history-node actions.
- Timeline rows do not move, expand, or animate on hover.

### 4.1 Confirmed visual direction

- Use a restrained, iOS-inspired visual language adapted to a compact desktop
  window rather than reproducing a web component library or phone shell.
- Open the normal desktop window at 520 x 760 logical pixels. Keep it resizable
  to the accepted 320 x 500 minimum, but use an opaque rectangular surface with
  no custom outer border, corner clipping, or transparent-window shadow.
- Default to less visible text. Do not show a generic timeline heading, node
  count, redundant control labels, or explanatory copy when context and a
  conventional symbol are sufficient.
- Icon-only controls retain accessible names, keyboard focus, and equivalent
  keyboard behavior, but do not use HTML `title` hover tooltips.
- The custom title bar contains minimize and close only. The regular window
  remains resizable but is not maximizable and exposes no fullscreen action.
- The compact color control shows only filled green, blue, and red circles.
  It has no visible label, outline ring, or checkmark; the current choice is
  distinguished by a restrained size or opacity difference.
- The application, installer, and desktop shortcut share one single-axis
  timeline product mark; the mark must not be a letterform. Its accepted palette
  is deep neutral graphite with a light timeline and no blue filled background.
  The active-node archive action uses a trash glyph and must not resemble a
  download action.

## 5. Confirmed metadata behavior

### 5.1 Creation-time display

Follow the proven `desktop-taskBoard` behavior:

- store the successful creation time as a numeric timestamp;
- show `HH:mm` when the node was created today;
- show `MM/DD HH:mm` for an older node;
- expose an ISO timestamp through the semantic `time` element;
- never expose creation time as an editable control.

### 5.2 User-defined color categories

Green, blue, and red are intentionally neutral categories. Users choose their
own convention, so the product must not name them `planned`, `in progress`,
`blocked`, or assign any other workflow semantics.

The visible interface remains a filled colored circle with no visible label,
outline ring, or checkmark. Accessibility text identifies the literal selection
(`Green category`, `Blue category`, or `Red category`) without interpreting it.

## 6. Explicit non-goals for the MVP

- Accounts, cloud sync, collaboration, and sharing.
- AI generation or automatic planning.
- Calendar integration, reminders, recurring tasks, or notifications. A node's
  displayed date does not imply any of these features.
- Semantic statuses, text tags, or marker colors beyond the accepted neutral
  three-color mechanism.
- Kanban boards, Gantt charts, mind maps, or a general graph editor.
- Themes, plugin systems, cross-platform abstractions, or extensive settings.
- Import/export formats before local data integrity is proven.

## 7. Architecture ownership

- **Domain layer:** node identity, order, text/color mutations, immutable
  creation time, archival, and invariants.
- **Persistence layer:** durable load/write behavior and migrations.
- **Desktop layer:** Tauri lifecycle, window rules, and filesystem/database
  locations.
- **Presentation layer:** timeline rendering, editing interactions, accessible
  controls, and user-visible errors.

React renders authoritative domain state and sends mutation requests. It must
not retain an independent canonical node list.

## 8. Delivery gates

### Gate A: Product behavior acceptance

- Define editing commit/cancel behavior and the compact three-color selection
  control.
- Approve a simple interaction wireframe and the initial window dimensions.

### Gate B: Minimal product shell

- Scaffold one Tauri 2 + React + TypeScript application.
- Establish domain, persistence, desktop, and presentation boundaries.
- Render the accepted empty state and sample timeline without persistence.
- Verify the actual window and visual hierarchy on Windows 10.

### Gate C: Node CRUD, ordering, and history

- Add, edit, archive, and drag nodes according to accepted behavior.
- Preserve stable IDs, deterministic manual order, immutable creation times,
  and marker colors.
- Provide the single history entry point and a read-only archived-node view.
- Cover empty text, long text, rapid edits, keyboard use, and large node counts.
- Unit-test domain mutations, timestamp formatting/immutability, color
  constraints, and archival behavior; manually verify the real editing and
  drag flows.

### Gate D: Local persistence

- Persist accepted domain state atomically.
- Restore the same content and ordering across process restarts.
- Surface read/write failures without silently losing user data.
- Exercise migration and corruption behavior against the real persistence
  implementation.

### Gate E: Windows desktop and packaging

- Implement only the accepted window model.
- Verify focus, startup, resize, display scaling, and shutdown behavior on real
  Windows 10.
- Build and test the selected installer path on the exact environments claimed
  as supported.

### Gate F: Open-source readiness

- Select and add an explicit license with the owner's approval.
- Add contribution, security, and code-of-conduct policies as appropriate.
- Audit dependencies, copied sources, assets, notices, generated files, and
  repository metadata.
- Remove secrets, machine paths, user data, and internal-only artifacts before
  publication.

## 9. Naming baseline

- Product: `Nodestitch`
- Folder/repository stem: `nodestitch`
- Package stem: `nodestitch`
- Public bundle identifier: `app.nodestitch.desktop`.
- Public repository URL: recorded after GitHub repository creation.

The name describes text nodes stitched into one continuing planning line.

## 10. Implementation status (2026-08-10)

- **Gate A — accepted.** The owner approved the restrained iOS-inspired
  wireframe, icon-only controls, three unlabeled marker colors, double-click
  editing, and the compact regular-window model.
- **Gate B — complete.** One Tauri 2 + React + TypeScript application now owns
  the product. Domain, application, persistence, desktop, and presentation
  boundaries are explicit. The empty and populated surfaces were inspected in
  the real undecorated window on Windows 10 build 19045 at 200% display scale.
- **Gate C — complete for the confirmed MVP.** Add, exact-text edit, color
  change, native drag ordering, Alt+Arrow ordering, archive, icon-only history,
  and read-only history are implemented. Automated interaction coverage is in
  place, and real-window double-click editing plus drag ordering were confirmed
  by reading the committed SQLite result. A ten-node real-window pass confirmed
  correct top/bottom scrolling and long-text wrapping at both 420 and 320
  logical-pixel widths. At 320 pixels, the scroll container measured 308 pixels
  for both `clientWidth` and `scrollWidth`, with zero node-level horizontal
  overflow. After the default-size revision, a second ten-node pass at 520 x
  760 measured 510 pixels for both content `clientWidth` and `scrollWidth`,
  with zero node-level overflow and the composer fully visible at the bottom.
- **Gate D — complete.** The Rust boundary stores one versioned timeline
  document in SQLite using an immediate transaction. Real-file tests cover
  migration, restart restoration, corrupt JSON, validation failure, and a
  forced SQLite write failure that preserves the previous commit.
- **Gate E — complete for the current Windows 10 acceptance environment.**
  Startup, focus, resizing to the 320 logical-pixel minimum, 200% scaling,
  release executable startup, and graceful close were exercised on Windows 10
  build 19045. The revised default window measured 520 x 760 logical pixels
  (1040 x 1520 physical pixels at DPI 192), and inspection confirmed no outer
  CSS border, corner clipping, shadow, or horizontal overflow. The x64 NSIS
  installer was built and exercised through install, desktop-shortcut launch,
  and uninstall. Its shortcut targeted the installed executable and a bundled
  Nodestitch ICO whose SHA-256 matched the source icon; uninstall removed the
  shortcut, installation directory, and registry entry. A clean-machine or
  WebView2-missing environment has not been tested and is not claimed. After
  the icon revision, the current build was installed and retained with its
  desktop shortcut. A cold launch from that shortcut reported PE subsystem 2,
  zero `ConsoleWindowClass` windows, and exactly one visible titled application
  window (`Tauri Window`, `Nodestitch`). The installer also removed the two
  superseded blue icon resources during upgrade.
- **Motion verification.** Entry uses a 320 ms ease-out, removal uses a 240 ms
  collapse/fade, and committed reordering uses a 300 ms FLIP transition. On the
  same Windows 10 machine at 200% scaling with ten nodes, 900 ms
  `requestAnimationFrame` samples recorded no frame interval above 25 ms for
  either add or archive. Fast SQLite commits did not expose the delayed saving
  indicator, avoiding a one-frame status flash. Reduced-motion preferences
  bypass non-essential motion.
- **Gate F — in progress.** The owner approved the MIT License and the public
  bundle identifier is finalized as `app.nodestitch.desktop`. Contribution,
  security, conduct, CI, ignore, dependency, copied-source, asset, secret, and
  machine-path checks are in place. The MIT-licensed `desktop-taskBoard`
  installer-hook pattern is recorded in `THIRD_PARTY_NOTICES.md`. Record and
  verify the final public repository URL when the GitHub repository is created.
