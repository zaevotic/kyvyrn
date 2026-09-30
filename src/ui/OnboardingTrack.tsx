import { useState } from "react";
import type { Engine } from "../types/engine";
import { getStorageInfo } from "../subsys/storage/storageLabel";
import { prettyBrowserName } from "../subsys/engine/useBrowsers";

interface OnboardingTrackProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (engine: Engine) => void;
  availableBrowsers: string[];
  initialEngine: Engine;
}

export function OnboardingTrack({
  isOpen,
  onClose,
  onComplete,
  availableBrowsers,
  initialEngine,
}: OnboardingTrackProps) {
  const [step, setStep] = useState(0);
  const [selectedEngine, setSelectedEngine] = useState<Engine>(initialEngine);

  if (!isOpen) return null;

  const isWebkit = selectedEngine.kind === "webkit";
  const isChromium = selectedEngine.kind === "chromium";
  const selectedBrowser = isChromium ? selectedEngine.browser : availableBrowsers[0] || "brave";

  const storageInfo = getStorageInfo(selectedEngine);

  const handleSelectWebkit = () => {
    setSelectedEngine({ kind: "webkit" });
  };

  const handleSelectChromium = (browser?: string) => {
    const target = browser || (isChromium ? selectedEngine.browser : availableBrowsers[0] || "chromium");
    setSelectedEngine({ kind: "chromium", browser: target });
  };

  const handleNext = () => {
    if (step === 0) {
      setStep(1);
    } else {
      onComplete(selectedEngine);
      onClose();
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(0);
    }
  };

  return (
    <div className="onb-overlay open">
      <div className="onb-top">
        <div className="brand">
          appdrawer <span>/ first-run setup</span>
        </div>
        <div className="onb-steps">
          <div className={`onb-step-dot ${step === 0 ? "now" : "done"}`}>1</div>
          <div className={`onb-step-dot ${step === 1 ? "now" : ""}`}>2</div>
        </div>
        <button type="button" className="icon-btn" onClick={onClose}>
          ✕
        </button>
      </div>

      <div
        className="onb-track"
        style={{ transform: `translateX(-${step * 50}%)` }}
      >
        {/* STEP 1 */}
        <div className="onb-pane">
          <div className="onb-inner">
            <div className="onb-eyebrow">step 1 of 2</div>
            <h2>How should apps render?</h2>
            <p className="desc">
              This sets the default engine for new web apps. Storage follows
              automatically: webview apps get a compiled binary + .desktop entry,
              Chromium apps get a PWA shortcut. You can override the engine per
              app later.
            </p>

            <div
              className={`choice-card ${isWebkit ? "selected" : ""}`}
              onClick={handleSelectWebkit}
            >
              <div className="radio"></div>
              <div>
                <div className="ct">System WebView</div>
                <div className="cd">
                  Lightweight, no extra process — renders with the OS-provided
                  WebKit view. Best for simple tools and lower memory use.
                </div>
              </div>
            </div>

            <div
              className={`choice-card ${isChromium ? "selected" : ""}`}
              onClick={() => handleSelectChromium(selectedBrowser)}
            >
              <div className="radio"></div>
              <div>
                <div className="ct">Chromium browser</div>
                <div className="cd">
                  Launches through an installed browser&apos;s app mode for full
                  compatibility with sites that need it (DRM, extensions-adjacent
                  behavior).
                </div>
                {availableBrowsers.length > 0 && (
                  <div className="browser-pick">
                    {availableBrowsers.map((b) => (
                      <span
                        key={b}
                        className={
                          isChromium && selectedEngine.browser === b ? "on" : ""
                        }
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectChromium(b);
                        }}
                      >
                        {prettyBrowserName(b)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* STEP 2 */}
        <div className="onb-pane">
          <div className="onb-inner">
            <div className="onb-eyebrow">step 2 of 2</div>
            <h2>Review</h2>
            <p className="desc">
              Storage is derived from the engine, not chosen separately. You can
              change the default engine later in settings.
            </p>

            <div className="review-line">
              <span>default engine</span>
              <span>
                {isWebkit
                  ? "System WebView"
                  : `Chromium (${prettyBrowserName(selectedBrowser)})`}
              </span>
            </div>
            <div className="review-line">
              <span>storage format</span>
              <span>{storageInfo.title}</span>
            </div>
            <div className="review-line">
              <span>apps directory</span>
              <span>~/.local/share/appdrawer/</span>
            </div>
            <div className="review-line" style={{ borderBottom: "none" }}>
              <span>desktop entries</span>
              <span>~/.local/share/applications/</span>
            </div>
          </div>
        </div>
      </div>

      <div className="onb-nav">
        <button
          type="button"
          className="btn btn-ghost"
          style={{ visibility: step === 0 ? "hidden" : "visible" }}
          onClick={handleBack}
        >
          ← back
        </button>
        <button type="button" className="btn btn-primary" onClick={handleNext}>
          {step === 0 ? "continue →" : "enter drawer →"}
        </button>
      </div>
    </div>
  );
}
