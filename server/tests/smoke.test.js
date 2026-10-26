import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

describe("LabOps project smoke checks", () => {
  it("defines all seven required Mongoose models", async () => {
    const source = await readFile(
      new URL("../models/index.js", import.meta.url),
      "utf8",
    );
    for (const model of [
      "User",
      "Laboratory",
      "Asset",
      "Reservation",
      "Maintenance",
      "Notification",
      "ActivityLog",
    ])
      assert.match(source, new RegExp(`model\\(["']${model}["']`));
  });
  it("uses environment variables for MongoDB and JWT configuration", async () => {
    const source = await readFile(
      new URL("../server.js", import.meta.url),
      "utf8",
    );
    assert.match(source, /process\.env\.MONGO_URI/);
    assert.match(source, /process\.env\.JWT_SECRET/);
  });
});
