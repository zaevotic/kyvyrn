export type ScreenType = "library" | "add" | "settings";

interface WorkspaceTabsProps {
  activeScreen: ScreenType;
  onSelectScreen: (screen: ScreenType) => void;
}

const TABS: { id: ScreenType; num: string; label: string }[] = [
  { id: "library", num: "1", label: "library" },
  { id: "add", num: "2", label: "add app" },
  { id: "settings", num: "3", label: "settings" },
];

export function WorkspaceTabs({
  activeScreen,
  onSelectScreen,
}: WorkspaceTabsProps) {
  return (
    <div className="ws-tabs" role="tablist">
      {TABS.map((tab) => {
        const isActive = activeScreen === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSelectScreen(tab.id)}
            className={`ws-tab ${isActive ? "active" : ""}`}
          >
            <span className="num">{tab.num}</span>
            <span className="lbl">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
