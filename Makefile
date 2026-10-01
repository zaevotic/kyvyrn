.PHONY: all help arch build-arch deb build-deb rpm build-rpm clean

# Default target
all: help

help:
	@echo "Kyvyrn Build & Package Automation"
	@echo "=================================="
	@echo "  make arch        - Build and install on Arch Linux (makepkg -fsi)"
	@echo "  make deb         - Build and install .deb on Debian / Ubuntu (apt install)"
	@echo "  make rpm         - Build and install .rpm on Fedora / RHEL (dnf install)"
	@echo ""
	@echo "Build-only targets (without installing):"
	@echo "  make build-arch  - Build Arch package (.pkg.tar.zst)"
	@echo "  make build-deb   - Build Debian package (.deb)"
	@echo "  make build-rpm   - Build RPM package (.rpm)"
	@echo "  make clean       - Clean build artifacts"

# --- Arch Linux ---
arch:
	makepkg -fsi

build-arch:
	makepkg -f

# --- Debian / Ubuntu (.deb) ---
build-deb:
	npm install
	cargo build --release --manifest-path src-tauri/Cargo.toml --bin kyvyrn-runner
	cargo tauri build --bundles deb

deb: build-deb
	sudo apt install $$(ls -t src-tauri/target/release/bundle/deb/kyvyrn_*.deb | head -n 1)

# --- Fedora / RHEL / openSUSE (.rpm) ---
build-rpm:
	npm install
	cargo build --release --manifest-path src-tauri/Cargo.toml --bin kyvyrn-runner
	cargo tauri build --bundles rpm

rpm: build-rpm
	sudo dnf install $$(ls -t src-tauri/target/release/bundle/rpm/kyvyrn-*.rpm | head -n 1)

# --- Cleanup ---
clean:
	rm -rf dist src-tauri/target pkg src *.pkg.tar.zst
