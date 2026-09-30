import { useState, useEffect } from "react";
import type { AppDetails } from "../types/app";
import type { Engine } from "../types/engine";
import { useIcon } from "../subsys/icon/useIcon";
import { prettyBrowserName } from "../subsys/engine/useBrowsers";

interface ConfigDrawerProps {
  app: AppDetails | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, name: string, url: string, engine: Engine) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onIconUpdated: (appId: string, newIconUrl: string) => void;
  availableBrowsers: string[];
}

export function ConfigDrawer({
  app,
  isOpen,
  onClose,
  onSave,
  onDelete,
  onIconUpdated,
  availableBrowsers,
}: ConfigDrawerProps) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [engine, setEngine] = useState<Engine>({ kind: "webkit" });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { refreshing, uploading, refreshIcon, uploadIcon } = useIcon();

  useEffect(() => {
    if (app) {
      setName(app.name);
      setUrl(app.url);
      setEngine(app.engine);
    }
  }, [app]);

  if (!isOpen || !app) return null;

  const isWebkit = engine.kind === "webkit";
  const isChromium = engine.kind === "chromium";
  const selectedBrowser = isChromium ? engine.browser : availableBrowsers[0] || "brave";

  const handleSave = async () => {
    if (!name.trim() || !url.trim() || saving) return;
    setSaving(true);
    try {
      await onSave(app.id, name, url, engine);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (deleting) return;
    if (confirm(`Remove ${app.name}? This cannot be undone.`)) {
      setDeleting(true);
      try {
        await onDelete(app.id);
        onClose();
      } finally {
        setDeleting(false);
      }
    }
  };

  const handleRefreshIcon = async () => {
    const newUrl = await refreshIcon(app.id, url || app.url);
    if (newUrl) {
      onIconUpdated(app.id, newUrl);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const newUrl = await uploadIcon(app.id, file);
    if (newUrl) {
      onIconUpdated(app.id, newUrl);
    }
  };

  return (
    <div
      className="cfg-overlay open"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="cfg-panel" onClick={(e) => e.stopPropagation()}>
        <div className="cfg-head">
          <div>
            <h2>{app.name}</h2>
            <p>{app.url}</p>
          </div>
          <button type="button" className="icon-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="field">
          <label>name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="field">
          <label>url</label>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </div>

        <div className="field">
          <label>engine</label>
          <div className="opt-row">
            <div
              className={`opt-card ${isWebkit ? "selected" : ""}`}
              onClick={() => setEngine({ kind: "webkit" })}
            >
              <div className="t">WebView</div>
              <div className="d">system engine</div>
            </div>
            <div
              className={`opt-card ${isChromium ? "selected" : ""}`}
              onClick={() =>
                setEngine({ kind: "chromium", browser: selectedBrowser })
              }
            >
              <div className="t">Chromium</div>
              <div className="d">{prettyBrowserName(selectedBrowser)}</div>
            </div>
          </div>

          {isChromium && availableBrowsers.length > 0 && (
            <div className="browser-pick" style={{ marginTop: "10px" }}>
              {availableBrowsers.map((b) => (
                <span
                  key={b}
                  className={engine.browser === b ? "on" : ""}
                  onClick={() => setEngine({ kind: "chromium", browser: b })}
                >
                  {prettyBrowserName(b)}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="divider"></div>

        <div className="field">
          <label>icon</label>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              type="button"
              className="btn btn-ghost"
              style={{ flex: 1 }}
              disabled={refreshing}
              onClick={handleRefreshIcon}
            >
              {refreshing ? "refreshing..." : "refresh"}
            </button>
            <label
              className="btn btn-ghost"
              style={{ flex: 1, cursor: "pointer", textAlign: "center" }}
            >
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                disabled={uploading}
                style={{ display: "none" }}
              />
              <span>{uploading ? "uploading..." : "upload"}</span>
            </label>
          </div>
        </div>

        <button
          type="button"
          className="btn btn-primary btn-block"
          style={{ marginTop: "6px" }}
          disabled={saving}
          onClick={handleSave}
        >
          {saving ? "saving..." : "save configuration"}
        </button>

        <div className="divider"></div>

        <button
          type="button"
          className="btn btn-block"
          style={{
            background: "var(--danger-soft)",
            color: "var(--danger)",
            borderColor: "transparent",
          }}
          disabled={deleting}
          onClick={handleDelete}
        >
          {deleting ? "removing..." : "remove app"}
        </button>
      </div>
    </div>
  );
}
