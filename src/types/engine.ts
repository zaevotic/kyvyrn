export type Engine =
  | { kind: "webkit" }
  | { kind: "chromium"; browser: string };
