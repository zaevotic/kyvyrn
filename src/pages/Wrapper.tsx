import { useState, useEffect } from "react";
import type { AppDetails } from "../types/app";
import type { Engine } from "../types/engine";
import { Topbar } from "../ui/Topbar";
import { type ScreenType } from "../ui/WorkspaceTabs";
import { Tile, AddTile } from "../ui/Tile";
import { Statusline } from "../ui/Statusline";
import { ConfigDrawer } from "../ui/ConfigDrawer";
import { OnboardingTrack } from "../ui/OnboardingTrack";
import { useBrowsers, prettyBrowserName } from "../subsys/engine/useBrowsers";
import { useGlobalConfig } from "../subsys/config/useGlobalConfig";
import { useApps } from "../subsys/library/useApps";
import { getStorageInfo } from "../subsys/storage/storageLabel";

function guessAppNameFromUrl(rawUrl: string): string {
  try {
    let clean = rawUrl.trim();
    if (!clean.startsWith("http://") && !clean.startsWith("https://")) {
      clean = "https://" + clean;
    }
    const host = new URL(clean).hostname.replace(/^www\./, "");
    const parts = host.split(".");
    if (parts.length > 0 && parts[0]) {
      return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
    }
  } catch {}
  return "";
}

export default function Wrapper() {
  const [activeScreen, setActiveScreen] = useState<ScreenType>("library");
  const [showSetup, setShowSetup] = useState(false);

  // Global preferences
  const { config, updateConfig, toggleTheme } = useGlobalConfig();

  // Browsers
  const { browsers } = useBrowsers();

  // Library & Apps
  const {
    apps,
    createApp,
    updateApp,
    setAppIconUrl,
    deleteApp,
    launchApp,
  } = useApps();

  // Config Drawer
  const [configApp, setConfigApp] = useState<AppDetails | null>(null);

  // Add App Form State
  const [newUrl, setNewUrl] = useState("");
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newEngine, setNewEngine] = useState<Engine>({ kind: "webkit" });
  const [creating, setCreating] = useState(false);

  // Initialize engine with global default once config is loaded
  useEffect(() => {
    if (config.defaultEngine) {
      setNewEngine(config.defaultEngine);
    }
  }, [config.defaultEngine]);

  // First visit onboarding check
  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem("kyvyrn_setup_done");
    if (!hasSeenOnboarding) {
      setShowSetup(true);
    }
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT";

      if (e.key === "Escape") {
        if (configApp) {
          setConfigApp(null);
        } else if (showSetup) {
          setShowSetup(false);
        }
        return;
      }

      if (isInput) return;

      if (e.key === "1") {
        setActiveScreen("library");
      } else if (e.key === "2") {
        setActiveScreen("add");
      } else if (e.key === "3") {
        setActiveScreen("settings");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [configApp, showSetup]);

  const handleUrlChange = (val: string) => {
    setNewUrl(val);
    if (!newName.trim() || newName === guessAppNameFromUrl(newUrl)) {
      const guessed = guessAppNameFromUrl(val);
      if (guessed) setNewName(guessed);
    }
  };

  const handleCreateApp = async () => {
    if (!newUrl.trim() || !newName.trim() || creating) return;

    setCreating(true);
    try {
      await createApp({
        name: newName,
        url: newUrl,
        description: newDescription,
        engine: newEngine,
      });

      setNewUrl("");
      setNewName("");
      setNewDescription("");
      setNewEngine(config.defaultEngine || { kind: "webkit" });
      setActiveScreen("library");
    } catch (err) {
      console.error("Failed to create app:", err);
      alert("Failed to create app.");
    } finally {
      setCreating(false);
    }
  };

  const isNewWebkit = newEngine.kind === "webkit";
  const isNewChromium = newEngine.kind === "chromium";
  const selectedNewBrowser = isNewChromium
    ? newEngine.browser
    : browsers[0] || "brave";

  const newStorageInfo = getStorageInfo(newEngine);

  return (
    <>
      <div className="bg-grid"></div>

      <div className="shell">
        {/* TOPBAR */}
        <Topbar
          activeScreen={activeScreen}
          onSelectScreen={setActiveScreen}
          onOpenSetup={() => setShowSetup(true)}
          onToggleTheme={toggleTheme}
        />

        {/* MAIN BODY */}
        <div className="main">
          {/* SCREEN 1: LIBRARY */}
          <div
            className={`screen ${activeScreen === "library" ? "active" : ""}`}
            id="screen-library"
          >
            <div className="col-title">
              <h1>your apps</h1>
              <span className="count">{apps.length} installed</span>
            </div>
            <div className="lib-body">
              {config.viewMode === "grid" ? (
                <div className="grid">
                  {apps.map((app) => (
                    <Tile
                      key={app.id}
                      app={app}
                      onLaunch={launchApp}
                      onConfigure={setConfigApp}
                    />
                  ))}
                  <AddTile onClick={() => setActiveScreen("add")} />
                </div>
              ) : (
                /* List View */
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {apps.map((app) => {
                    const isChromium = app.engine.kind === "chromium";
                    return (
                      <div
                        key={app.id}
                        onClick={() => launchApp(app)}
                        className="tile"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "12px 14px",
                          textAlign: "left",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "12px",
                            minWidth: 0,
                          }}
                        >
                          <div
                            className="ico"
                            style={{
                              width: "36px",
                              height: "36px",
                              margin: 0,
                              borderRadius: "6px",
                              fontSize: "15px",
                              flexShrink: 0,
                            }}
                          >
                            {app.iconUrl ? (
                              <img
                                src={app.iconUrl}
                                alt={app.name}
                                onError={(e) => {
                                  e.currentTarget.style.display = "none";
                                }}
                              />
                            ) : (
                              <span>{(app.name[0] || "?").toUpperCase()}</span>
                            )}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div className="name" style={{ fontSize: "13px" }}>
                              {app.name}
                            </div>
                            <div
                              style={{
                                fontSize: "11px",
                                color: "var(--text-faint)",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                maxWidth: "400px",
                              }}
                            >
                              {app.description || app.url}
                            </div>
                          </div>
                        </div>

                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "14px",
                            flexShrink: 0,
                          }}
                        >
                          <div
                            className={`eng ${isChromium ? "chrome" : ""}`}
                            style={{ marginTop: 0 }}
                          >
                            <i></i>
                            {app.engine.kind === "chromium"
                              ? `chromium (${prettyBrowserName(
                                  app.engine.browser
                                )})`
                              : "webview"}
                          </div>

                          <button
                            type="button"
                            className="icon-btn"
                            style={{ width: "26px", height: "26px" }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfigApp(app);
                            }}
                          >
                            ⚙
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  <div
                    onClick={() => setActiveScreen("add")}
                    className="tile add"
                    style={{
                      flexDirection: "row",
                      minHeight: "44px",
                      padding: "10px",
                    }}
                  >
                    <div className="plus" style={{ fontSize: "16px" }}>
                      +
                    </div>
                    <div className="name">new app</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* SCREEN 2: ADD APP */}
          <div
            className={`screen ${activeScreen === "add" ? "active" : ""}`}
            id="screen-add"
          >
            <div className="add-wrap">
              <div className="lib-mini">
                <div className="col-title">
                  <h1>your apps</h1>
                </div>
                <div className="lib-body">
                  <div className="grid">
                    {apps.map((app) => (
                      <div
                        key={app.id}
                        className="tile"
                        style={{ padding: "10px 8px" }}
                      >
                        <div
                          className="ico"
                          style={{
                            width: "32px",
                            height: "32px",
                            marginBottom: "6px",
                            fontSize: "13px",
                          }}
                        >
                          {app.iconUrl ? (
                            <img src={app.iconUrl} alt="" />
                          ) : (
                            <span>{app.name[0]}</span>
                          )}
                        </div>
                        <div className="name" style={{ fontSize: "11px" }}>
                          {app.name}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="add-col">
                <div className="col-title" style={{ padding: "0 0 16px" }}>
                  <h1 style={{ fontSize: "15px" }}>new app</h1>
                </div>

                <div className="field">
                  <label>site url</label>
                  <input
                    type="text"
                    value={newUrl}
                    onChange={(e) => handleUrlChange(e.target.value)}
                    placeholder="example.com"
                  />
                </div>

                <div className="field">
                  <label>name</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="App Name"
                  />
                </div>

                <div className="field">
                  <label>
                    description{" "}
                    <span style={{ color: "var(--text-faint)" }}>
                      (optional)
                    </span>
                  </label>
                  <textarea
                    rows={2}
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Short description"
                  />
                </div>

                <div className="field">
                  <label>engine</label>
                  <div className="opt-row">
                    <div
                      className={`opt-card ${isNewWebkit ? "selected" : ""}`}
                      onClick={() => setNewEngine({ kind: "webkit" })}
                    >
                      <div className="t">WebView</div>
                      <div className="d">system engine</div>
                    </div>
                    <div
                      className={`opt-card ${isNewChromium ? "selected" : ""}`}
                      onClick={() =>
                        setNewEngine({
                          kind: "chromium",
                          browser: selectedNewBrowser,
                        })
                      }
                    >
                      <div className="t">Chromium</div>
                      <div className="d">
                        {prettyBrowserName(selectedNewBrowser)}
                      </div>
                    </div>
                  </div>

                  {isNewChromium && browsers.length > 0 && (
                    <div className="browser-pick" style={{ marginTop: "10px" }}>
                      {browsers.map((b) => (
                        <span
                          key={b}
                          className={
                            isNewChromium && newEngine.browser === b ? "on" : ""
                          }
                          onClick={() =>
                            setNewEngine({ kind: "chromium", browser: b })
                          }
                        >
                          {prettyBrowserName(b)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="field">
                  <label>storage</label>
                  <div
                    className="hint"
                    style={{ marginTop: "-2px", marginBottom: "8px" }}
                  >
                    automatic — follows the engine above
                  </div>
                  <div
                    className="opt-card selected"
                    style={{ cursor: "default" }}
                  >
                    <div className="t">{newStorageInfo.title}</div>
                    <div className="d">{newStorageInfo.description}</div>
                  </div>
                </div>

                <div style={{ flex: 1 }}></div>

                <button
                  type="button"
                  disabled={creating || !newUrl.trim() || !newName.trim()}
                  onClick={handleCreateApp}
                  className="btn btn-primary btn-block"
                >
                  {creating ? "creating..." : "create app →"}
                </button>
              </div>
            </div>
          </div>

          {/* SCREEN 3: SETTINGS */}
          <div
            className={`screen ${activeScreen === "settings" ? "active" : ""}`}
            id="screen-settings"
          >
            <div className="add-wrap">
              <div className="lib-mini">
                <div className="col-title">
                  <h1>your apps</h1>
                </div>
                <div className="lib-body">
                  <div className="grid">
                    {apps.map((app) => (
                      <div
                        key={app.id}
                        className="tile"
                        style={{ padding: "10px 8px" }}
                      >
                        <div
                          className="ico"
                          style={{
                            width: "32px",
                            height: "32px",
                            marginBottom: "6px",
                            fontSize: "13px",
                          }}
                        >
                          {app.iconUrl ? (
                            <img src={app.iconUrl} alt="" />
                          ) : (
                            <span>{app.name[0]}</span>
                          )}
                        </div>
                        <div className="name" style={{ fontSize: "11px" }}>
                          {app.name}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="add-col">
                <div className="col-title" style={{ padding: "0 0 16px" }}>
                  <h1 style={{ fontSize: "15px" }}>settings</h1>
                </div>

                <div className="set-group">
                  <h3>defaults</h3>

                  <div className="set-row">
                    <div>
                      <div className="lbl">default engine</div>
                      <div className="sub">
                        used for new apps unless overridden
                      </div>
                    </div>
                    <div className="seg">
                      <button
                        type="button"
                        className={
                          config.defaultEngine.kind === "webkit" ? "on" : ""
                        }
                        onClick={() =>
                          updateConfig({ defaultEngine: { kind: "webkit" } })
                        }
                      >
                        WebView
                      </button>
                      <button
                        type="button"
                        className={
                          config.defaultEngine.kind === "chromium" ? "on" : ""
                        }
                        onClick={() =>
                          updateConfig({
                            defaultEngine: {
                              kind: "chromium",
                              browser: browsers[0] || "chromium",
                            },
                          })
                        }
                      >
                        Chromium
                      </button>
                    </div>
                  </div>

                  {browsers.length > 0 && (
                    <div className="set-row">
                      <div>
                        <div className="lbl">chromium browser</div>
                        <div className="sub">detected on this system</div>
                      </div>
                      <div className="seg">
                        {browsers.map((b) => {
                          const isSelected =
                            config.defaultEngine.kind === "chromium" &&
                            config.defaultEngine.browser === b;
                          return (
                            <button
                              key={b}
                              type="button"
                              className={isSelected ? "on" : ""}
                              onClick={() =>
                                updateConfig({
                                  defaultEngine: {
                                    kind: "chromium",
                                    browser: b,
                                  },
                                })
                              }
                            >
                              {prettyBrowserName(b)}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="set-row">
                    <div>
                      <div className="lbl">storage format</div>
                      <div className="sub">
                        chromium apps → PWA shortcut · webview apps → compiled +
                        .desktop, automatic per app
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: "11px",
                        color: "var(--text-faint)",
                        border: "1px solid var(--border)",
                        borderRadius: "2px",
                        padding: "3px 8px",
                      }}
                    >
                      auto
                    </span>
                  </div>
                </div>

                <div className="set-group">
                  <h3>appearance</h3>

                  <div className="set-row">
                    <div>
                      <div className="lbl">view mode</div>
                      <div className="sub">library layout</div>
                    </div>
                    <div className="seg">
                      <button
                        type="button"
                        className={config.viewMode === "grid" ? "on" : ""}
                        onClick={() => updateConfig({ viewMode: "grid" })}
                      >
                        Grid
                      </button>
                      <button
                        type="button"
                        className={config.viewMode === "list" ? "on" : ""}
                        onClick={() => updateConfig({ viewMode: "list" })}
                      >
                        List
                      </button>
                    </div>
                  </div>

                  <div className="set-row">
                    <div>
                      <div className="lbl">theme</div>
                      <div className="sub">
                        follows manual toggle, not system
                      </div>
                    </div>
                    <div className="seg">
                      <button
                        type="button"
                        className={config.theme === "dark" ? "on" : ""}
                        onClick={() => updateConfig({ theme: "dark" })}
                      >
                        Dark
                      </button>
                      <button
                        type="button"
                        className={config.theme === "light" ? "on" : ""}
                        onClick={() => updateConfig({ theme: "light" })}
                      >
                        Light
                      </button>
                    </div>
                  </div>

                  <div className="set-row">
                    <div>
                      <div className="lbl">window titlebar</div>
                      <div className="sub">
                        native window decorations on web apps
                      </div>
                    </div>
                    <div className="seg">
                      <button
                        type="button"
                        className={config.titlebar !== false ? "on" : ""}
                        onClick={() => updateConfig({ titlebar: true })}
                      >
                        Show
                      </button>
                      <button
                        type="button"
                        className={config.titlebar === false ? "on" : ""}
                        onClick={() => updateConfig({ titlebar: false })}
                      >
                        Hide
                      </button>
                    </div>
                  </div>
                </div>

                <div className="set-group">
                  <h3>onboarding</h3>

                  <div className="set-row">
                    <div>
                      <div className="lbl">first-run setup</div>
                      <div className="sub">
                        re-run the engine &amp; storage wizard
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => setShowSetup(true)}
                    >
                      replay ↺
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* STATUSLINE FOOTER */}
        <Statusline activeScreen={activeScreen} />
      </div>

      {/* CONFIG SIDE DRAWER */}
      <ConfigDrawer
        app={configApp}
        isOpen={Boolean(configApp)}
        onClose={() => setConfigApp(null)}
        onSave={updateApp}
        onDelete={deleteApp}
        onIconUpdated={setAppIconUrl}
        availableBrowsers={browsers}
      />

      {/* ONBOARDING SETUP WIZARD */}
      <OnboardingTrack
        isOpen={showSetup}
        onClose={() => {
          localStorage.setItem("kyvyrn_setup_done", "true");
          setShowSetup(false);
        }}
        onComplete={(engine) => {
          updateConfig({ defaultEngine: engine });
          localStorage.setItem("kyvyrn_setup_done", "true");
        }}
        availableBrowsers={browsers}
        initialEngine={config.defaultEngine || { kind: "webkit" }}
      />
    </>
  );
}
