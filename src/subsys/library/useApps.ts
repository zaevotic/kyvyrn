import { useState, useEffect, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { AppDetails } from "../../types/app";
import type { Engine } from "../../types/engine";

export function useApps() {
  const [apps, setApps] = useState<AppDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const iconUrlsRef = useRef<Map<string, string>>(new Map());

  const loadApps = useCallback(async () => {
    try {
      setLoading(true);
      const rawApps = await invoke<AppDetails[]>("load_apps");

      // Load icons asynchronously for each app
      const appsWithIcons = await Promise.all(
        rawApps.map(async (app) => {
          if (iconUrlsRef.current.has(app.id)) {
            return { ...app, iconUrl: iconUrlsRef.current.get(app.id) };
          }

          try {
            const bytes = await invoke<number[]>("get_icon_bytes", {
              appId: app.id,
            });
            const blob = new Blob([new Uint8Array(bytes)], {
              type: "image/png",
            });
            const url = URL.createObjectURL(blob);
            iconUrlsRef.current.set(app.id, url);
            return { ...app, iconUrl: url };
          } catch {
            return app;
          }
        })
      );

      setApps(appsWithIcons);
    } catch (err) {
      console.error("Failed to load apps:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadApps();

    return () => {
      // Clean up object URLs on unmount
      iconUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      iconUrlsRef.current.clear();
    };
  }, [loadApps]);

  const createApp = useCallback(
    async (params: {
      name: string;
      url: string;
      description?: string;
      engine: Engine;
    }) => {
      const id = Date.now().toString();
      const app: AppDetails = {
        id,
        name: params.name.trim(),
        url: params.url.trim(),
        description: (params.description || "").trim(),
        created_at: Date.now(),
        engine: params.engine,
      };

      try {
        await invoke("fetch_site_icon", {
          appId: app.id,
          url: app.url,
        });
      } catch (err) {
        console.warn("Icon fetch warning (will proceed without icon):", err);
      }

      await invoke("save_app", {
        app: {
          ...app,
          folder: "",
        },
      });

      await loadApps();
      return id;
    },
    [loadApps]
  );

  const updateApp = useCallback(
    async (id: string, name: string, url: string, engine: Engine) => {
      await invoke("update_app_config", {
        id,
        name: name.trim(),
        url: url.trim(),
        engine,
      });

      setApps((prev) =>
        prev.map((app) =>
          app.id === id
            ? { ...app, name: name.trim(), url: url.trim(), engine }
            : app
        )
      );
    },
    []
  );

  const setAppIconUrl = useCallback((appId: string, iconUrl: string) => {
    const prev = iconUrlsRef.current.get(appId);
    if (prev) {
      URL.revokeObjectURL(prev);
    }
    iconUrlsRef.current.set(appId, iconUrl);

    setApps((prevApps) =>
      prevApps.map((app) => (app.id === appId ? { ...app, iconUrl } : app))
    );
  }, []);

  const deleteApp = useCallback(async (id: string) => {
    await invoke("delete_app", { id });

    const iconUrl = iconUrlsRef.current.get(id);
    if (iconUrl) {
      URL.revokeObjectURL(iconUrl);
      iconUrlsRef.current.delete(id);
    }

    setApps((prev) => prev.filter((app) => app.id !== id));
  }, []);

  const launchApp = useCallback(async (app: AppDetails) => {
    try {
      if (app.engine.kind === "chromium") {
        await invoke("open_chromium_app_window", {
          id: app.id,
          title: app.name,
          url: app.url,
          browser: app.engine.browser,
        });
      } else {
        await invoke("open_app_window", {
          id: app.id,
          label: `app-${app.id}`,
          title: app.name,
          url: app.url,
        });
      }
    } catch (err) {
      console.error("Failed to launch app:", err);
      alert(`Failed to launch ${app.name}`);
    }
  }, []);

  return {
    apps,
    loading,
    loadApps,
    createApp,
    updateApp,
    setAppIconUrl,
    deleteApp,
    launchApp,
  };
}
