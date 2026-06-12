import { ensureDaemon } from "./src/daemon.ts";
import { runCli } from "./src/cli.ts";

const daemonUrl = await ensureDaemon();
await runCli(daemonUrl);
