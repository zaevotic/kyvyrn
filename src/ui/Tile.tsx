import { useState } from "react";
import type { AppDetails } from "../types/app";

interface TileProps {
  app: AppDetails;
  onLaunch: (app: AppDetails) => void;
  onConfigure: (app: AppDetails) => void;
}

export function Tile({ app, onLaunch, onConfigure }: TileProps) {
  const isChromium = app.engine.kind === "chromium";
  const firstLetter = (app.name[0] || "?").toUpperCase();
  const [imgError, setImgError] = useState(false);

  return (
    <div
      onClick={() => onLaunch(app)}
      className="tile"
      data-name={app.name}
      data-url={app.url}
    >
      <div className="ico">
        {app.iconUrl && !imgError ? (
          <img
            src={app.iconUrl}
            alt={app.name}
            onError={() => setImgError(true)}
          />
        ) : (
          <span>{firstLetter}</span>
        )}
      </div>

      <div className="name" title={app.name}>
        {app.name}
      </div>

      <div className={`eng ${isChromium ? "chrome" : ""}`}>
        <i></i>
        {isChromium ? "chromium" : "webview"}
      </div>

      <button
        type="button"
        title="Configure app"
        onClick={(e) => {
          e.stopPropagation();
          onConfigure(app);
        }}
        className="cfg"
      >
        ⚙
      </button>
    </div>
  );
}

interface AddTileProps {
  onClick: () => void;
}

export function AddTile({ onClick }: AddTileProps) {
  return (
    <div onClick={onClick} className="tile add">
      <div className="plus">+</div>
      <div className="name">new app</div>
    </div>
  );
}
