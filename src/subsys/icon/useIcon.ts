import { useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";

export function useIcon() {
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fetchIconBlobUrl = useCallback(async (appId: string): Promise<string | null> => {
    try {
      const bytes = await invoke<number[]>("get_icon_bytes", { appId });
      const blob = new Blob([new Uint8Array(bytes)], { type: "image/png" });
      return URL.createObjectURL(blob);
    } catch {
      return null;
    }
  }, []);

  const refreshIcon = useCallback(
    async (appId: string, url: string): Promise<string | null> => {
      setRefreshing(true);
      try {
        await invoke("refresh_site_icon", { appId, url });
        return await fetchIconBlobUrl(appId);
      } catch (err) {
        console.error("Failed to refresh icon:", err);
        return null;
      } finally {
        setRefreshing(false);
      }
    },
    [fetchIconBlobUrl]
  );

  const uploadIcon = useCallback(
    async (appId: string, file: File): Promise<string | null> => {
      setUploading(true);
      try {
        const buffer = await file.arrayBuffer();
        const bytes = Array.from(new Uint8Array(buffer));
        await invoke("save_app_icon", { appId, iconBytes: bytes });
        return await fetchIconBlobUrl(appId);
      } catch (err) {
        console.error("Failed to upload icon:", err);
        return null;
      } finally {
        setUploading(false);
      }
    },
    [fetchIconBlobUrl]
  );

  return {
    refreshing,
    uploading,
    fetchIconBlobUrl,
    refreshIcon,
    uploadIcon,
  };
}
