import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  execute: vi.fn(async (statement: unknown) => {
    const sql = typeof statement === "string"
      ? statement
      : String((statement as { sql?: unknown }).sql ?? "");
    if (sql.includes("ON CONFLICT(slug) DO UPDATE SET")) throw new Error("database unavailable");
    return { rows: [] };
  }),
}));

vi.mock("@libsql/client", () => ({
  createClient: () => ({ execute: mocks.execute }),
}));

import { githubPublicIssuesGuide } from "@/data/golden-guides/github-public-issues";
import { saveGuide } from "@/lib/db";

describe("database persistence failures", () => {
  const testDir = path.join(os.tmpdir(), `oauth-workbench-db-failure-${process.pid}`);
  const fallbackPath = path.join(testDir, "guides-fallback.json");

  beforeAll(() => {
    fs.mkdirSync(testDir, { recursive: true });
    process.env.GUIDES_FALLBACK_FILE = fallbackPath;
  });

  afterAll(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
    delete process.env.GUIDES_FALLBACK_FILE;
  });

  it("does not return or write a canonical guide when the database upsert fails", async () => {
    const guide = { ...githubPublicIssuesGuide, slug: "db-upsert-failure-test" };

    await expect(saveGuide(guide)).rejects.toThrow("Failed to persist guide");
    expect(fs.existsSync(fallbackPath)).toBe(false);
  });
});
