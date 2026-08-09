# Contributing to Nodestitch

Thanks for helping improve Nodestitch. Keep contributions focused on its small,
local-first timeline-planning scope and read `AGENTS.md` before changing code.

## Development workflow

1. Create a focused branch from `main`.
2. Install dependencies with `npm ci`.
3. Make the smallest coherent change and add product-behavior tests.
4. Run the verification commands below.
5. Open a pull request that explains the behavior change and its evidence.

```powershell
npm test
npm run build
cargo test --manifest-path src-tauri/Cargo.toml
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings
```

Visual or window-behavior changes also need real Windows evidence. Do not add
accounts, cloud sync, telemetry, AI, or new planning systems without an agreed
product-scope change.

## Reporting defects

Include the Windows version, display scale, reproduction steps, expected and
actual behavior, and screenshots when layout or interaction is involved. Never
attach a database or screenshot containing private task text without removing
that content first.
