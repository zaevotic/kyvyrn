import type { Engine } from "./engine";

export interface AppDetails {
  id: string;
  name: string;
  url: string;
  description: string;
  created_at: number;
  engine: Engine;
  folder?: string;
  iconUrl?: string;
  titlebar?: boolean;
}
