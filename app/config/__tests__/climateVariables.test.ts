import { describe, it, expect } from "vitest";
import {
  CLIMATE_VARIABLES,
  getAvailableClimateVariables,
  getClimateVariableConfig,
} from "~/config/climateVariables";

describe("CLIMATE_VARIABLES", () => {
  it("contains exactly 3 variables", () => {
    expect(CLIMATE_VARIABLES).toHaveLength(3);
  });

  it("has tasmax, tasmin, pr in order", () => {
    expect(CLIMATE_VARIABLES.map((v) => v.varName)).toEqual([
      "tasmax",
      "tasmin",
      "pr",
    ]);
  });

  it("each variable has all required fields", () => {
    for (const v of CLIMATE_VARIABLES) {
      expect(v.varName).toBeTruthy();
      expect(v.label).toBeTruthy();
      expect(v.clim).toHaveLength(2);
      expect(v.colormap.length).toBeGreaterThan(0);
      expect(v.climUnit).toBeTruthy();
      expect(v.unitConverter).toBeDefined();
      expect(v.whatAboutMe).toBeDefined();
    }
  });

  it("clim ranges are ordered lower < upper", () => {
    for (const v of CLIMATE_VARIABLES) {
      expect(v.clim[0]).toBeLessThan(v.clim[1]);
    }
  });

  it("whatAboutMe has all UI fields", () => {
    for (const v of CLIMATE_VARIABLES) {
      const {
        introMetric,
        headlineMetric,
        chartTitleMetric,
        axisLabel,
        unitLabel,
      } = v.whatAboutMe;
      expect(introMetric).toBeTruthy();
      expect(headlineMetric).toBeTruthy();
      expect(chartTitleMetric).toBeTruthy();
      expect(axisLabel).toBeTruthy();
      expect(unitLabel).toBeTruthy();
    }
  });
});

describe("getClimateVariableConfig", () => {
  it("returns tasmax config by name", () => {
    const config = getClimateVariableConfig("tasmax");
    expect(config.varName).toBe("tasmax");
    expect(config.label).toBe("Max Temperature");
  });

  it("returns tasmin config by name", () => {
    const config = getClimateVariableConfig("tasmin");
    expect(config.varName).toBe("tasmin");
  });

  it("returns pr config by name", () => {
    const config = getClimateVariableConfig("pr");
    expect(config.varName).toBe("pr");
  });

  it("falls back to the first variable for an unrecognised name", () => {
    // Cast to bypass TypeScript — exercises the defensive fallback branch.
    const config = getClimateVariableConfig("unknown" as "tasmax");
    expect(config.varName).toBe("tasmax");
  });
});

describe("getAvailableClimateVariables", () => {
  it("keeps only curated variables present in the dataset, in curated order", () => {
    // A realistic data_vars listing includes store-only containers with no
    // curated entry (rotated_pole, time_bnds) — those must be dropped.
    const names = ["pr", "rotated_pole", "tasmax", "time_bnds", "tasmin"];
    const available = getAvailableClimateVariables(names);
    expect(available.map((v) => v.varName)).toEqual(["tasmax", "tasmin", "pr"]);
  });

  it("drops curated variables absent from the dataset", () => {
    const available = getAvailableClimateVariables(["tasmax"]);
    expect(available.map((v) => v.varName)).toEqual(["tasmax"]);
  });

  it("returns an empty array when no curated variables are present", () => {
    expect(getAvailableClimateVariables(["rotated_pole", "time_bnds"])).toEqual(
      [],
    );
  });
});
