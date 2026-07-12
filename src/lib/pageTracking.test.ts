import { describe, it, expect } from "vitest";
import { shouldTrackPath } from "./pageTracking";

describe("shouldTrackPath", () => {
  it("tracks public pages", () => {
    expect(shouldTrackPath("/")).toBe(true);
    expect(shouldTrackPath("/services")).toBe(true);
    expect(shouldTrackPath("/blog/some-post")).toBe(true);
    expect(shouldTrackPath("/advertise")).toBe(true);
    expect(shouldTrackPath("/bounty")).toBe(true);
  });

  it("skips admin routes", () => {
    expect(shouldTrackPath("/admin")).toBe(false);
    expect(shouldTrackPath("/admin/login")).toBe(false);
    expect(shouldTrackPath("/admin/clients/abc")).toBe(false);
  });

  it("skips portal routes", () => {
    expect(shouldTrackPath("/portal")).toBe(false);
    expect(shouldTrackPath("/portal/messages")).toBe(false);
  });
});
