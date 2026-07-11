import { describe, it, expect } from "vitest";
import { computeAddOnRequestState } from "./addOnRequestState";

describe("computeAddOnRequestState", () => {
  it("returns 'active' when the client has an active row for this catalog item", () => {
    const rows = [{ add_on_catalog_id: "catalog-1", status: "active" }];
    expect(computeAddOnRequestState(rows, "catalog-1")).toBe("active");
  });

  it("returns 'requested' when the only row is pending review", () => {
    const rows = [{ add_on_catalog_id: "catalog-1", status: "requested" }];
    expect(computeAddOnRequestState(rows, "catalog-1")).toBe("requested");
  });

  it("returns 'requestable' when there is no row for this catalog item", () => {
    const rows = [{ add_on_catalog_id: "catalog-2", status: "active" }];
    expect(computeAddOnRequestState(rows, "catalog-1")).toBe("requestable");
  });

  it("returns 'requestable' when the only row was cancelled", () => {
    const rows = [{ add_on_catalog_id: "catalog-1", status: "cancelled" }];
    expect(computeAddOnRequestState(rows, "catalog-1")).toBe("requestable");
  });

  it("prefers 'active' over 'requested' when both exist for the same item", () => {
    const rows = [
      { add_on_catalog_id: "catalog-1", status: "cancelled" },
      { add_on_catalog_id: "catalog-1", status: "requested" },
      { add_on_catalog_id: "catalog-1", status: "active" },
    ];
    expect(computeAddOnRequestState(rows, "catalog-1")).toBe("active");
  });
});
