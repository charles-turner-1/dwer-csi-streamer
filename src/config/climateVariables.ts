import {
  COLORMAP_PRECIP,
  COLORMAP_TEMP,
} from "@/composables/useZarrDirectMap";
import {
  kelvinToCelsius,
  precipToMmPerDay,
  type UnitConverter,
} from "@/utils/unitConversion";

export type ClimateVariableName = "tasmax" | "tasmin" | "pr";

export interface ClimateVariableUi {
  introMetric: string;
  headlineMetric: string;
  chartTitleMetric: string;
  axisLabel: string;
  unitLabel: string;
}

export interface ClimateVariableConfig {
  varName: ClimateVariableName;
  label: string;
  clim: [number, number];
  colormap: string[];
  climUnit: string;
  unitConverter: UnitConverter;
  whatAboutMe: ClimateVariableUi;
}

export const CLIMATE_VARIABLES: readonly ClimateVariableConfig[] = [
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
] as const;

export function getClimateVariableConfig(varName: ClimateVariableName) {
  const match = CLIMATE_VARIABLES.find((v) => v.varName === varName);
  if (match) return match;
  return CLIMATE_VARIABLES[0]!;
}
