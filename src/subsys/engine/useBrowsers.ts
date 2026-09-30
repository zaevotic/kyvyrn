import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";

const BROWSER_NAMES: Record<string, string> = {
  "brave": "Brave",
  "brave-browser": "Brave",
  "brave-browser-stable": "Brave (Stable)",
  "brave-browser-nightly": "Brave (Nightly)",
  "google-chrome": "Google Chrome",
  "google-chrome-stable": "Google Chrome",
  "chromium": "Chromium",
  "chromium-browser": "Chromium",
  "vivaldi": "Vivaldi",
  "opera": "Opera",
  "microsoft-edge": "Microsoft Edge",
};

export function prettyBrowserName(cmd: string): string {
  return BROWSER_NAMES[cmd] ?? cmd;
}

export function useBrowsers() {
  const [browsers, setBrowsers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBrowsers = useCallback(async () => {
    try {
      setLoading(true);
      const detected = await invoke<string[]>("detect_chromium_browsers");
      setBrowsers(detected);
    } catch {
      setBrowsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBrowsers();
  }, [fetchBrowsers]);

  return { browsers, loading, refetch: fetchBrowsers };
}
