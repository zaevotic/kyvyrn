<!-- BEGIN:tauri-agent-rules -->
# This is Tauri v2, not v1

Import paths, command registration, and the plugin system all changed between Tauri v1 and v2. `@tauri-apps/api/core` is the v2 import — if you find yourself reaching for `@tauri-apps/api/tauri` or a v1-style `allowlist` in `tauri.conf.json`, stop and check `node_modules/@tauri-apps/api` / the Rust crate docs before writing more code. Training data skews v1.
<!-- END:tauri-agent-rules -->

# Agent Rules — appdrawer

## Execution & Step Control
- Verify path structures locally (both `src/` and `src-tauri/src/`) before editing — don't assume a file exists in the subsystem you'd expect.
- Do not run `cargo tauri dev`, spawn watchers, or launch the compiled app in the background unless the task specifically requires it.
- Read `CLAUDE.md` to sync with the design tokens and the kernel/subsystem layout before proposing an execution plan.

## Before writing any code
- Respect the kernel/subsystem split. Read `CLAUDE.md` before creating a new file so it lands in the right `src/ui/`, `src/subsys/*/`, or `src-tauri/src/*/` location — not a generic `components/` or `utils/`.
- The engine → storage-format rule (Chromium → PWA shortcut, WebView → compiled + `.desktop`) lives once, in `src-tauri/src/storage/`. If a task seems to need that logic anywhere else — a picker, a settings toggle, a second copy of the mapping — that's a sign to stop and flag it, not to add it.
- Check the target component before modifying it — don't assume class names or prop shapes from memory.
- Prefer editing existing files over creating new ones.

## Styling & Typography Invariants
- Exact px font sizes (`text-[13px]`, `text-[11px]`) — never Tailwind named sizes.
- Colors: always the CSS tokens (`var(--accent)`, `var(--text-dim)`, `var(--border)`) — never hardcoded hex, never Tailwind's default palette.
- One typeface: `--mono` (JetBrains Mono), bundled locally. Do not add a second family for "readability" — if body copy genuinely needs a non-mono face, raise it, don't just add it.
- Icons: terminal glyphs first (`✕ ⚙ ↺ ◐`), inline SVG only when a glyph can't express it. No icon library.
- Corners: `--radius: 3px` everywhere, no shadows, no blur.

## Filesystem Safety (this app writes real desktop-integration files)
- Never let a task write `.desktop` entries, cached binaries, or icons to the operator's real `~/.local/share/applications/` or `~/.local/share/appdrawer/` while testing — point dev builds at a sandboxed `XDG_DATA_HOME` instead.
- Never delete or overwrite an existing `.desktop` file outside that sandbox without explicit confirmation from the operator.

## Workspace & Git Hygiene
- Never add `Co-Authored-By: Claude` or any other agentic signature to commit messages.
- Never commit `MIGRATION.md` or `INSPIRATION.md` — local workspace assets only.
- Strict commit format: lowercase, atomic, `type: short description`.
- Allowed types: `feat:` new panels or features, `fix:` layout/style corrections, `docs:` markdown updates, `style:` token/font/spacing tweaks, `refactor:` rearranging component or module trees.

## Verification
- Never use `curl` or server-side fetches to verify visual layout.
- Complete the execution plan and ask the operator to check the running app window themselves.