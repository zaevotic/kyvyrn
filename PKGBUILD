# Maintainer: zaevo
pkgname=kyvyrn
pkgver=0.1.0
pkgrel=1
pkgdesc="Lightweight Linux web app manager (Chromium PWA + WebKit micro-runners)"
arch=('x86_64')
url="https://github.com/serpmillers/kyvyrn"
license=('MIT')
depends=('webkit2gtk-4.1' 'gtk3' 'hicolor-icon-theme')
makedepends=('cargo' 'npm' 'nodejs')
optdepends=(
    'brave-bin: Chromium engine support'
    'google-chrome: Chromium engine support'
    'chromium: Chromium engine support'
)

build() {
    cd "$startdir"
    npm install
    npx tauri build --no-bundle
    cargo build --release --manifest-path src-tauri/Cargo.toml --bin kyvyrn-runner
}

package() {
    cd "$startdir"

    # Install binaries
    install -Dm755 src-tauri/target/release/kyvyrn "$pkgdir/usr/bin/kyvyrn"
    install -Dm755 src-tauri/target/release/kyvyrn-runner "$pkgdir/usr/lib/kyvyrn/kyvyrn-runner"

    # Install desktop icons (all standard resolutions)
    for size in 16 24 32 48 64 96 128 256 512; do
        if [ -f "src-tauri/icons/${size}x${size}.png" ]; then
            install -Dm644 "src-tauri/icons/${size}x${size}.png" "$pkgdir/usr/share/icons/hicolor/${size}x${size}/apps/kyvyrn.png"
        fi
    done
    install -Dm644 src-tauri/icons/512x512.png "$pkgdir/usr/share/pixmaps/kyvyrn.png"

    # Install desktop launcher
    install -d "$pkgdir/usr/share/applications"
    cat <<EOF > "$pkgdir/usr/share/applications/kyvyrn.desktop"
[Desktop Entry]
Version=1.0
Type=Application
Name=Kyvyrn
Comment=Lightweight Web App Manager
Exec=kyvyrn
Icon=kyvyrn
Terminal=false
StartupWMClass=Kyvyrn
Categories=Utility;DesktopUtility;System;
EOF
}
