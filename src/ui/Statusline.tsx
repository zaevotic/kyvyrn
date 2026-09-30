import { useState, useEffect } from "react";
import type { ScreenType } from "./WorkspaceTabs";

interface StatuslineProps {
  activeScreen: ScreenType;
}

const LABELS: Record<ScreenType, string> = {
  library: "1 / library",
  add: "2 / add app",
  settings: "3 / settings",
};

export function Statusline({ activeScreen }: StatuslineProps) {
  const [time, setTime] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="statusline">
      <span>{LABELS[activeScreen]}</span>
      <div className="keys">
        <span>
          <b>↵</b> launch
        </span>
        <span>
          <b>⌘,</b> config
        </span>
        <span>
          <b>1-3</b> switch
        </span>
        {time && <span>{time}</span>}
      </div>
    </div>
  );
}
