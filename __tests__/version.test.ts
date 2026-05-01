import { describe, it, expect } from "vitest";
import { isNewerVersion } from "@/lib/version";

describe("isNewerVersion", () => {
  it("detects newer major version", () => {
    expect(isNewerVersion("0.1.3", "1.0.0")).toBe(true);
  });

  it("detects newer minor version", () => {
    expect(isNewerVersion("0.1.3", "0.2.0")).toBe(true);
  });

  it("detects newer patch version", () => {
    expect(isNewerVersion("0.1.3", "0.1.4")).toBe(true);
  });

  it("returns false for same version", () => {
    expect(isNewerVersion("0.1.3", "0.1.3")).toBe(false);
  });

  it("returns false for older version", () => {
    expect(isNewerVersion("0.2.0", "0.1.9")).toBe(false);
  });

  it("handles v prefix on latest", () => {
    expect(isNewerVersion("0.1.3", "v0.2.0")).toBe(true);
  });

  it("handles v prefix on current", () => {
    expect(isNewerVersion("v0.1.3", "0.2.0")).toBe(true);
  });

  it("handles v prefix on both", () => {
    expect(isNewerVersion("v0.1.3", "v0.1.3")).toBe(false);
  });
});
