import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock xarray-ts so no real store is opened; fromHttp echoes the URL and
// openDataset resolves a distinct stub per call so we can assert identity.
vi.mock("xarray-ts", () => ({
  fromHttp: vi.fn((url: string) => ({ url })),
  openDataset: vi.fn((store: unknown) => Promise.resolve({ store })),
}));

import { openDataset, fromHttp } from "xarray-ts";
import { openClimateDataset } from "~/composables/useClimateDataset";

describe("openClimateDataset", () => {
  beforeEach(() => {
    // Reset call history (the module-level cache persists, so each test uses
    // distinct URLs to avoid cross-test cache hits).
    vi.clearAllMocks();
  });

  it("opens the dataset on the first call, going through fromHttp", async () => {
    const url = "https://example.com/first.zarr";
    const ds = await openClimateDataset(url);

    expect(fromHttp).toHaveBeenCalledWith(url);
    expect(openDataset).toHaveBeenCalledTimes(1);
    // openDataset receives the store produced by fromHttp.
    expect(openDataset).toHaveBeenCalledWith({ url });
    expect(ds).toBeDefined();
  });

  it("caches per URL: a repeat call returns the same promise without reopening", () => {
    const url = "https://example.com/cached.zarr";

    const p1 = openClimateDataset(url);
    const p2 = openClimateDataset(url);

    expect(p2).toBe(p1); // same cached promise instance
    expect(openDataset).toHaveBeenCalledTimes(1);
  });

  it("opens a separate dataset for each distinct URL", () => {
    const a = openClimateDataset("https://example.com/a.zarr");
    const b = openClimateDataset("https://example.com/b.zarr");

    expect(b).not.toBe(a);
    expect(openDataset).toHaveBeenCalledTimes(2);
  });
});
