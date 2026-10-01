# Kyvyrn

Kyvyrn is a lightweight, Linux-first desktop app manager that turns web apps into clean, native-feeling applications — without Electron overhead.

Built with **Tauri v2 (Rust), React 19, TypeScript, and Vite**, Kyvyrn manages both **Chromium PWA shortcuts** and **autonomous WebKit desktop apps** with full system launcher integration.

---

## Features

- **Dual-Engine Architecture**:
  - **WebKit (WebView)**: Standalone, segregated processes with isolated session data (`webkit_data/`) and autonomous micro-runners deployed to user space.
  - **Chromium (PWA)**: Standalone app-mode launches (`--app=`) with isolated per-app profiles (`profile/`).
- **System Desktop Launcher Integration**:
  - Automatically writes and synchronizes XDG `.desktop` entries in `~/.local/share/applications/`.
  - Scrapes, standardizes, and caches icons (including SVG rasterization via `resvg`) in `~/.local/share/kyvyrn/icons/`.
- **Package Manager Independence**:
  - Web apps run independently of the Kyvyrn manager. If Kyvyrn is uninstalled (e.g. via `paru -Rns kyvyrn`), all generated apps and desktop shortcuts remain 100% functional.
- **Runtime Window Customization**:
  - Instant toggle for native window titlebars/decorations (`Show` / `Hide`) — perfect for tiling window managers like Hyprland, Sway, and i3.
  - Topbar drag region support (`data-tauri-drag-region`).
- **CLI & Package Manager Interface**:
  - Full terminal command-line interface (`kyvyrn install`, `kyvyrn list`, `kyvyrn rm`, `kyvyrn launch`, `kyvyrn info`, `kyvyrn config`).
  - Manage web applications seamlessly from the terminal or the React GUI with zero IPC overhead.
- **Smart Chromium Discovery**: Automatically detects Brave, Chrome, Chromium, Vivaldi, Opera, and Edge.
- **Lightweight by Design**: Zero Electron bloat. Clean JetBrains Mono terminal-inspired design tokens.

---

## CLI Usage (Package Manager)

Kyvyrn functions as both a standalone desktop GUI and a command-line web app package manager:

```bash
# Launch the GUI Manager
kyvyrn

# Install / Add a web application
kyvyrn install https://chatgpt.com --name "ChatGPT"
kyvyrn -i https://web.whatsapp.com -n "WhatsApp" -e chromium -b brave

# List all installed web applications
kyvyrn list
kyvyrn -l

# Launch an application by name or ID
kyvyrn launch chatgpt

# View detailed application metadata and paths
kyvyrn info instagram

# Remove / Uninstall an application
kyvyrn rm chatgpt
kyvyrn -r 1790806955888

# View and update global preferences
kyvyrn config
kyvyrn config titlebar hide
```

### Command Flags

| Flag | Description |
| :--- | :--- |
| `-n, --name <NAME>` | Set custom application display name (default: derived from URL) |
| `-e, --engine <ENGINE>` | Engine type: `webkit` (default) or `chromium` |
| `-b, --browser <BROWSER>` | Target Chromium binary (e.g. `brave`, `google-chrome`, `chromium`) |
| `-i, --icon <PATH>` | Local image path to use as icon |
| `--titlebar <show\|hide>` | Explicitly show or hide the window titlebar / decorations |
| `--no-titlebar` | Shorthand for `--titlebar hide` |

---

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Vanilla CSS tokens with Tailwind CSS layout utilities
- **Desktop Backend**: Tauri v2 (Rust)
- **SVG & Image Codecs**: `resvg`, `tiny-skia`, `image`
- **Typography**: JetBrains Mono

---

## Project Structure

```
kyvyrn/
├── index.html
├── package.json
├── vite.config.ts
├── src/
│   ├── App.tsx                       # Root component
│   ├── index.css                     # Design tokens & core styles
│   ├── main.tsx                      # React entry point
│   ├── ui/                           # Structural UI primitives
│   │   ├── Topbar.tsx                # App header & draggable region
│   │   ├── Tile.tsx                  # Library app tiles
│   │   ├── WorkspaceTabs.tsx         # Tab navigation rail
│   │   ├── ConfigDrawer.tsx          # Per-app configuration pane
│   │   └── OnboardingTrack.tsx       # App creation wizard
│   ├── subsys/                       # Subsystems
│   │   ├── engine/                   # Engine detection & picker
│   │   ├── library/                  # App CRUD & state hooks (useApps)
│   │   ├── config/                   # Global preferences (useGlobalConfig)
│   │   └── icon/                     # Icon upload & refresh hooks
│   ├── pages/
│   │   └── Wrapper.tsx               # Main application view & settings
│   └── types/                        # Shared TypeScript interfaces
└── src-tauri/                        # Tauri v2 Backend (Rust)
    ├── Cargo.toml                    # Package manifest & [[bin]] targets
    ├── tauri.conf.json               # Tauri v2 configuration
    └── src/
        ├── main.rs                   # Kyvyrn manager entry point & IPC router
        ├── bin/
        │   └── runner.rs             # Autonomous standalone WebKit micro-runner
        ├── commands/                 # IPC handlers
        │   ├── configs.rs            # App CRUD & desktop entry lifecycle
        │   ├── global_config.rs      # Global preferences & live titlebar toggle
        │   ├── icons.rs              # Icon fetch, SVG rasterize & caching
        │   ├── chromium.rs           # Chromium process spawning
        │   └── webview.rs            # WebKit process spawning
        ├── net/
        │   └── http.rs               # HTTP client for favicons & assets
        └── utils/
            ├── browser.rs            # Chromium browser detection
            ├── desktop.rs            # .desktop entry generation & runner deployment
            ├── paths.rs              # XDG directory & path resolution
            └── url.rs                # URL normalization
```

---

## How It Works

### 1. Storage & XDG Locations

All user applications and configs follow standard XDG directories:

- **App Data**: `~/.local/share/kyvyrn/Apps/{name}-{id}/`
  - `config.json` — App metadata, URL, and engine configuration
  - `runner` — Standalone autonomous WebKit runner binary
  - `webkit_data/` — Isolated cookies, storage, and cache for WebKit apps
  - `profile/` — Isolated browser profile directory for Chromium apps
- **Cached Icons**: `~/.local/share/kyvyrn/icons/{id}.png`
- **Desktop Entries**: `~/.local/share/applications/kyvyrn-{id}.desktop`
- **Global Settings**: `~/.config/kyvyrn/config.json`

---

## Getting Started

### Prerequisites

- **Node.js** (v18+) & **npm**
- **Rust** (latest stable) & **Cargo**
- **Tauri v2 CLI**:
  ```bash
  cargo install tauri-cli --version "^2.0"
  ```

### System Dependencies (Linux)

#### Arch Linux
```bash
sudo pacman -S webkit2gtk-4.1 gtk3 base-devel
```

#### Ubuntu / Debian
```bash
sudo apt update
sudo apt install libwebkit2gtk-4.1-dev libgtk-3-dev librsvg2-dev build-essential
```

#### Fedora / RHEL
```bash
sudo dnf install webkit2gtk4.1-devel gtk3-devel librsvg2-devel
```

---

## Native Installation by Distro

Kyvyrn provides a single-command build and install workflow across all major package managers:

### 1. Arch Linux (`pacman`)
```bash
# Using Makefile
make arch

# Or directly with makepkg
makepkg -si

# To uninstall
sudo pacman -Rns kyvyrn
# or: paru -Rns kyvyrn
```

### 2. Debian / Ubuntu (`apt` / `.deb`)
```bash
# Using Makefile (builds runner, packages .deb, and installs via apt)
make deb

# Or manually with cargo tauri
npm install
cargo build --release --manifest-path src-tauri/Cargo.toml --bin kyvyrn-runner
cargo tauri build --bundles deb
sudo apt install ./src-tauri/target/release/bundle/deb/kyvyrn_*.deb

# To uninstall
sudo apt remove kyvyrn
```

### 3. Fedora / RHEL / openSUSE (`dnf` / `.rpm`)
```bash
# Using Makefile (builds runner, packages .rpm, and installs via dnf)
make rpm

# Or manually with cargo tauri
npm install
cargo build --release --manifest-path src-tauri/Cargo.toml --bin kyvyrn-runner
cargo tauri build --bundles rpm
sudo dnf install ./src-tauri/target/release/bundle/rpm/kyvyrn-*.rpm

# To uninstall
sudo dnf remove kyvyrn
```

---

## Development & Building

### Running in Development

```bash
cargo tauri dev
```

### Building for Production

```bash
cargo tauri build
```

Binary outputs:
- **Manager GUI**: `src-tauri/target/release/kyvyrn`
- **Micro-Runner**: `src-tauri/target/release/kyvyrn-runner`
- **Packages**: `src-tauri/target/release/bundle/` (`.deb`, `.rpm`, or `.tar.gz`)

---

## License

MIT
