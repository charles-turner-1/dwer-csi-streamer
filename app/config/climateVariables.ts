import { COLORMAP_PRECIP, COLORMAP_TEMP } from "~/composables/useZarrDirectMap";
import {
  kelvinToCelsius,
  precipToMmPerDay,
  type UnitConverter,
} from "~/utils/unitConversion";

export interface ClimateVariableUi {
  introMetric: string;
  headlineMetric: string;
  chartTitleMetric: string;
  axisLabel: string;
  unitLabel: string;
}

export interface ClimateVariableConfig {
  // `string` rather than `ClimateVariableName`: the name union is *derived* from
  // `CLIMATE_VARIABLES` below, so referencing it here would be circular. The
  // literal `varName`s survive via `as const satisfies` on the array.
  varName: string;
  label: string;
  clim: [number, number];
  colormap: string[];
  climUnit: string;
  unitConverter: UnitConverter;
  whatAboutMe: ClimateVariableUi;
}

export const CLIMATE_VARIABLES = [
  {
    varName: "tasmax",
    label: "Max Temperature",
    clim: [6.85, 51.85],
    colormap: COLORMAP_TEMP,
    climUnit: " °C",
    unitConverter: kelvinToCelsius,
    whatAboutMe: {
      introMetric: "maximum temperatures",
      headlineMetric: "average daily maximum temperature",
      chartTitleMetric: "Maximum temperature",
      axisLabel: "Temperature (°C)",
      unitLabel: "°C",
    },
  },
  {
    varName: "tasmin",
    label: "Min Temperature",
    clim: [-3.15, 36.85],
    colormap: COLORMAP_TEMP,
    climUnit: " °C",
    unitConverter: kelvinToCelsius,
    whatAboutMe: {
      introMetric: "minimum temperatures",
      headlineMetric: "average daily minimum temperature",
      chartTitleMetric: "Minimum temperature",
      axisLabel: "Temperature (°C)",
      unitLabel: "°C",
    },
  },
  {
    varName: "pr",
    label: "Precipitation",
    clim: [0, 8.64],
    colormap: COLORMAP_PRECIP,
    climUnit: " mm/day",
    unitConverter: precipToMmPerDay,
    whatAboutMe: {
      introMetric: "precipitation",
      headlineMetric: "average daily precipitation",
      chartTitleMetric: "Precipitation",
      axisLabel: "Precipitation (mm/day)",
      unitLabel: "mm/day",
    },
  },
] as const satisfies readonly ClimateVariableConfig[];

// Derived from the curated list rather than hand-written, so it can never drift
// from CLIMATE_VARIABLES: "tasmax" | "tasmin" | "pr".
export type ClimateVariableName = (typeof CLIMATE_VARIABLES)[number]["varName"];

export function getClimateVariableConfig(varName: ClimateVariableName) {
  const match = CLIMATE_VARIABLES.find((v) => v.varName === varName);
  if (match) return match;
  return CLIMATE_VARIABLES[0]!;
}

// Intersect the curated presentation registry with the variable names actually
// present in an opened dataset (e.g. `Object.keys(ds.data_vars)`), preserving the
// curated order. Variables in the store without a curated entry (grid-mapping
// containers, bounds, ...) are dropped. The return type is left inferred so each
// element keeps its literal `varName` (a `ClimateVariableName`).
export function getAvailableClimateVariables(
  datasetVarNames: Iterable<string>,
) {
  const present = new Set(datasetVarNames);
  return CLIMATE_VARIABLES.filter((v) => present.has(v.varName));
}
