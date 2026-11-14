import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

test("check-deploy-experience accepts the repository's JSONC Wrangler config", () => {
  const result = spawnSync(process.execPath, ["scripts/check-deploy-experience.mjs"], {
    encoding: "utf8",
  });

  assert.equal(
    result.status,
    0,
    `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
  );
});
