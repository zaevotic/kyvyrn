import type { Engine } from "./engine";

export interface GlobalConfig {
  viewMode: "grid" | "list";
  theme: "dark" | "light";
  defaultEngine: Engine;
  titlebar?: boolean;
}
