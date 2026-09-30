import type { Engine } from "../../types/engine";
import { prettyBrowserName } from "./useBrowsers";

interface EnginePickerProps {
  value: Engine;
  onChange: (engine: Engine) => void;
  availableBrowsers: string[];
}

export function EnginePicker({
  value,
  onChange,
  availableBrowsers,
}: EnginePickerProps) {
  const isWebkit = value.kind === "webkit";
  const isChromium = value.kind === "chromium";
  const selectedBrowser = isChromium ? value.browser : availableBrowsers[0] || "brave";

  const handleSelectWebkit = () => {
    onChange({ kind: "webkit" });
  };

  const handleSelectChromium = (browser?: string) => {
    const targetBrowser = browser || (isChromium ? value.browser : availableBrowsers[0] || "chromium");
    onChange({ kind: "chromium", browser: targetBrowser });
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <div
          onClick={handleSelectWebkit}
          className={`flex-1 p-[9px_10px] cursor-pointer text-[12px] border transition-colors ${
            isWebkit
              ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
              : "border-[var(--border)] text-[var(--text-dim)] hover:border-[var(--text-faint)]"
          }`}
          style={{ borderRadius: "var(--radius)" }}
        >
          <div className="font-semibold mb-[2px]">WebView</div>
          <div
            className={`text-[10.5px] leading-[1.3] ${
              isWebkit ? "text-[var(--accent-dim)]" : "text-[var(--text-faint)]"
            }`}
          >
            Lightweight, system engine
          </div>
        </div>

        <div
          onClick={() => handleSelectChromium(selectedBrowser)}
          className={`flex-1 p-[9px_10px] cursor-pointer text-[12px] border transition-colors ${
            isChromium
              ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
              : "border-[var(--border)] text-[var(--text-dim)] hover:border-[var(--text-faint)]"
          }`}
          style={{ borderRadius: "var(--radius)" }}
        >
          <div className="font-semibold mb-[2px]">Chromium</div>
          <div
            className={`text-[10.5px] leading-[1.3] ${
              isChromium ? "text-[var(--accent-dim)]" : "text-[var(--text-faint)]"
            }`}
          >
            {availableBrowsers.length > 0
              ? `Detected (${availableBrowsers.length})`
              : "Brave, Chrome, etc."}
          </div>
        </div>
      </div>

      {isChromium && availableBrowsers.length > 0 && (
        <div className="flex gap-[6px] flex-wrap mt-1">
          {availableBrowsers.map((b) => {
            const isCurrent = isChromium && value.browser === b;
            return (
              <button
                key={b}
                type="button"
                onClick={() => handleSelectChromium(b)}
                className={`text-[11px] px-[9px] py-[5px] border cursor-pointer font-mono transition-colors ${
                  isCurrent
                    ? "border-[var(--accent)] text-[var(--accent)] bg-[var(--accent-soft)]"
                    : "border-[var(--border)] text-[var(--text-dim)] hover:border-[var(--text-faint)] bg-[var(--panel-2)]"
                }`}
                style={{ borderRadius: "var(--radius)" }}
              >
                {prettyBrowserName(b)}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
