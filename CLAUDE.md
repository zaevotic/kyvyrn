# appdrawer

## Stack
- Tauri v2 (Rust backend) + React + TypeScript
- Tailwind CSS v4, used only for layout utilities — colors and radii come from CSS variables, never Tailwind's palette or `rounded-*` scale
- Font: JetBrains Mono (`--mono`) only, bundled locally as a static asset — no Google Fonts CDN, no runtime network dependency (this is a desktop app, it must render offline)
- No icon library. UI chrome uses terminal-native glyphs (`✕ ⚙ ↺ ◐ → ↵`) and hand-drawn inline SVG only where a glyph can't do the job (the engine dots, the dashed add-tile). Do not introduce `lucide-react` or similar — it reads as SaaS chrome, not launcher chrome.
- Tauri `invoke()` from `@tauri-apps/api/core` (v2 import path) for all IPC — never `@tauri-apps/api/tauri` (v1, removed)

## Design System

### Typography Scale (Strict Custom Px Scaling)
No named Tailwind sizes. Explicit px only:
- Field inputs, body copy, choice-card descriptions: `text-[13px]`
- Muted hints, settings sub-labels, onboarding eyebrows, statusline: `text-[11px]`
- Tile names, panel values, review-line rows: `text-[12.5px]`
- Micro tags, engine-type labels, workspace-tab numbers: `text-[10px]`
- Panel/column headers (`Your apps`, `Settings`): `text-[17px]`
- Config-drawer and choice-card titles: `text-[15px]` / `text-[13.5px]`
- Brand wordmark (`appdrawer`): `text-[14px]`, weight 700
- Onboarding step headline: `text-[20px]`

### Spacing Rhythm
- Topbar padding: `10px 14px`
- Column header padding: `22px 26px 14px`
- Grid gap (library tiles): `10px`
- Add-app / config drawer padding: `22px 22px 18px` / `20px 20px 18px`
- Field stack spacing: `margin-bottom: 16px` per field
- Settings rows: `padding: 12px 14px`, `margin-bottom: 8px`

### Color Tokens (CSS variables — dark is default, `[data-theme="light"]` overrides)
**Backgrounds**
- `--bg` — `#121316` (void — app shell backdrop)
- `--panel` — `#1a1c20` (primary panel / topbar / statusline)
- `--panel-2` — `#202329` (inputs, inactive segments, tab rail)
- `--panel-3` — `#26292f` (reserved for future high-density active layers)

**Borders**
- `--border` — `#33373e` (base dividers, panel edges)
- `--border-soft` — `#26292f` (grid backdrop lines, subtle row dividers)

**Text**
- `--text` — `#e9e6dd` (bone — primary labels, values)
- `--text-dim` — `#9a9ea6` (secondary labels, unselected tabs)
- `--text-faint` — `#5c6067` (hints, timestamps, placeholder chrome)

**Accent (amber — the one interactive color)**
- `--accent` — `#d99a5b` (selected state text, active tab, primary button fill)
- `--accent-dim` — `#a97a48` (hover state on filled buttons)
- `--accent-soft` — `rgba(217,154,91,0.12)` (selected-state background wash)

**Secondary accents (status only — never for interactive chrome)**
- `--sage` — `#7c9885` / `--sage-soft` — `rgba(124,152,133,0.14)` — reserved for the WebView engine-type dot and "done" onboarding step
- `--danger` — `#c56a5f` / `--danger-soft` — `rgba(197,106,95,0.12)` — destructive actions only (Remove App)

### Component Invariants
- **Layout framework:** fixed shell of `topbar → main → statusline`. New surfaces are tiling panes, not floating modals: the add-app form is a pushed-in right column, the onboarding wizard is a sliding horizontal track, the per-app config is a right-side drawer. Nothing centers itself on a scrim except the config drawer's own backdrop.
- **Font stack harmony:** everything is `--mono`. There is no secondary sans or display face — this is a utility, not a marketing surface. If a future screen genuinely needs prose-weight body text, that's a decision to raise explicitly, not to default into.
- **Corners & depth:** `--radius: 3px` everywhere. No drop shadows, no blur. Borders carry all the separation.
- **Interactive states:** selected/active = `var(--accent)` text over an `var(--accent-soft)` background wash. Ghost/ secondary buttons use `var(--border)` framing with `var(--text-dim)` text.
- **Engine indicator:** a single dot before the engine label — `--sage` for WebView, `--accent` for Chromium. This is the only place both colors appear on the same element; don't extend that pairing elsewhere.
- **Storage is never a user-facing choice.** It is always derived from the engine: Chromium engine → PWA shortcut (`--app=` launch via the browser); WebView engine → compiled binary + `.desktop` entry. This rule lives in exactly one place in the backend (see `storage/` below) — do not add a storage picker to onboarding, the add-app form, or settings. Those surfaces may *display* the derived value, never collect it.
- **Onboarding is two steps, not three:** engine choice → review. The review pane shows the derived storage format read-only.

## Kernel/Subsystem-Inspired Architecture
This app manipulates real OS-level launcher artifacts (`.desktop` files, XDG directories, browser app-mode processes), so the codebase mirrors that domain instead of a generic `components/` / `utils/` split. Frontend is the *display server*, backend is the *kernel*.

### Frontend (`src/`)
- **`src/ui/`** — the window-manager layer: structural shell and visual primitives with no business logic (`Topbar.tsx`, `WorkspaceTabs.tsx`, `Statusline.tsx`, `Panel.tsx`, `Tile.tsx`, `OnboardingTrack.tsx`, `ConfigDrawer.tsx`)
- **`src/subsys/engine/`** — engine selection UI and browser-detection state (`EnginePicker.tsx`, `useBrowsers.ts`)
- **`src/subsys/storage/`** — display-only formatting of the derived storage value; contains no derivation logic itself (`storageLabel.ts` just maps the backend's answer to copy)
- **`src/subsys/library/`** — app CRUD state and grid wiring (`useApps.ts`)
- **`src/subsys/config/`** — global config load/save (`useGlobalConfig.ts`)
- **`src/subsys/icon/`** — icon fetch/refresh/upload (`useIcon.ts`)
- **`src/types/`** — shared TS types (`Engine`, `GlobalConfig`, `AppDetails`)

### Backend (`src-tauri/src/`)
- **`src-tauri/src/commands/`** — the syscall table. Thin IPC entry points only, each one delegates to a subsystem module below — no logic lives here.
- **`src-tauri/src/engine/`** — Chromium browser discovery (`detect.rs`), app-window launch (`launch.rs`)
- **`src-tauri/src/storage/`** — the one place the engine→format rule is implemented: `.desktop` file writer (`desktop_entry.rs`), PWA shortcut generator (`pwa.rs`), compiled-webview builder and cache (`compile.rs`)
- **`src-tauri/src/config/`** — global config persistence (`store.rs`)
- **`src-tauri/src/icon/`** — favicon fetch and cache (`fetch.rs`, `cache.rs`)