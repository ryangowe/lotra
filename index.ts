#!/usr/bin/env bun
import { ensureDaemon } from "./src/server/daemon.ts";
import { runCli } from "./src/cli/cli.ts";

const daemonUrl = await ensureDaemon();
await runCli(daemonUrl);
