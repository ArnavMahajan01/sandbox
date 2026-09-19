import { additionalFiles } from "@trigger.dev/build/extensions/core";
import { defineConfig } from "@trigger.dev/sdk";

export default defineConfig({
  project: "proj_ftnvnivhtmtzkpjlknlj",
  runtime: "node-24",
  logLevel: "log",
  // The max compute seconds a task is allowed to run. If the task run exceeds this duration, it will be stopped.
  // You can override this on an individual task.
  // See https://trigger.dev/docs/runs/max-duration
  maxDuration: 3600,
  retries: {
    enabledInDev: true,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 10000,
      factor: 2,
      randomize: true,
    },
  },
  dirs: ["./src/trigger"],
  build: {
    // The runtime folder is never imported — its files are copied onto each
    // sandbox via the filesystem — so bundle it into the deployed task.
    extensions: [additionalFiles({ files: ["lib/games/runtime/**/*"] })],
  },
});
