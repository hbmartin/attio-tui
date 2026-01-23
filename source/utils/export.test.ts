import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { exportJsonToFile } from "./export.js";

describe("exportJsonToFile", () => {
  it("writes JSON to disk", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "attio-export-"));
    const filePath = join(tempDir, "record.json");

    try {
      await exportJsonToFile({
        data: { id: "record-1", count: 2 },
        filePath,
      });

      const contents = await readFile(filePath, "utf-8");
      expect(JSON.parse(contents)).toEqual({ id: "record-1", count: 2 });
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});
