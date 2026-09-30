import type { Engine } from "../../types/engine";

export interface StorageInfo {
  key: "pwa" | "compiled";
  title: string;
  description: string;
}

export function getStorageInfo(engine: Engine): StorageInfo {
  if (engine.kind === "chromium") {
    return {
      key: "pwa",
      title: "PWA shortcut → .desktop",
      description:
        "Chromium apps launch via the browser's --app mode, linked with a .desktop entry.",
    };
  }

  return {
    key: "compiled",
    title: "Compiled webview → .desktop",
    description:
      "WebView apps build once on save, cached under ~/.local/share/appdrawer/apps/.",
  };
}
