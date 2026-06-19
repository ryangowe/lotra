import { resolve } from "node:path";
import { homedir } from "node:os";

export const PORT_DIR =
  process.env.LOTRA_PORT_DIR ?? resolve(homedir(), ".lotra");
export const PORT_FILE = resolve(PORT_DIR, "port");
export const DEFAULT_PORT = Number(process.env.LOTRA_PORT) || 17249;
export const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
