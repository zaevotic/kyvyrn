import { WorkspaceTabs, type ScreenType } from "./WorkspaceTabs";

interface TopbarProps {
  activeScreen: ScreenType;
  onSelectScreen: (screen: ScreenType) => void;
  onOpenSetup: () => void;
  onToggleTheme: () => void;
}

export function Topbar({
  activeScreen,
  onSelectScreen,
  onOpenSetup,
  onToggleTheme,
}: TopbarProps) {
  return (
    <div className="topbar" data-tauri-drag-region>
      <div className="topbar-left" data-tauri-drag-region>
        <div className="brand" data-tauri-drag-region>appdrawer</div>
      </div>

      <WorkspaceTabs
        activeScreen={activeScreen}
        onSelectScreen={onSelectScreen}
      />

      <div className="topbar-right">
        <button
          type="button"
          onClick={onOpenSetup}
          className="replay-btn"
          title="Setup wizard"
        >
          ↺ <span className="lbl">setup</span>
        </button>
        <button
          type="button"
          onClick={onToggleTheme}
          className="icon-btn"
          title="Toggle theme"
        >
          ◐
        </button>
      </div>
    </div>
  );
}
