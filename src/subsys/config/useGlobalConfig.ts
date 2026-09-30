import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { GlobalConfig } from "../../types/globalConfig";

const DEFAULT_CONFIG: GlobalConfig = {
  viewMode: "grid",
  theme: "dark",
  defaultEngine: { kind: "webkit" },
  titlebar: true,
};

export function useGlobalConfig() {
  const [config, setConfig] = useState<GlobalConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    invoke<GlobalConfig>("load_global_config")
      .then((loaded) => {
        if (loaded) {
          setConfig(loaded);
          document.body.setAttribute("data-theme", loaded.theme);
        }
      })
      .catch(() => {
        document.body.setAttribute("data-theme", "dark");
      })
      .finally(() => setLoading(false));
  }, []);

  const updateConfig = useCallback(
    async (patch: Partial<GlobalConfig>) => {
      const nextConfig: GlobalConfig = { ...config, ...patch };
      setConfig(nextConfig);

      if (patch.theme) {
        document.body.setAttribute("data-theme", patch.theme);
      }

      if (patch.titlebar !== undefined) {
        invoke("set_window_decorations", { decorations: patch.titlebar }).catch(() => {});
      }

      try {
        await invoke("save_global_config", { config: nextConfig });
      } catch (err) {
        console.error("Failed to save global config:", err);
      }
    },
    [config]
  );

  const toggleTheme = useCallback(() => {
    const nextTheme = config.theme === "dark" ? "light" : "dark";
    updateConfig({ theme: nextTheme });
  }, [config.theme, updateConfig]);

  return {
    config,
    loading,
    updateConfig,
    toggleTheme,
  };
}
