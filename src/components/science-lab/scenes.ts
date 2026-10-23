import type { ComponentType } from "react";
import { DayNight } from "./DayNight";
import { Floating } from "./Floating";
import { Germs } from "./Germs";
import { Light } from "./Light";
import { Butterfly, Frog } from "./LifeCycles";
import { Photosynthesis } from "./Photosynthesis";
import { Electricity } from "./Electricity";
import { HumanBody } from "./HumanBody";
import { Matter } from "./Matter";
import { Hydel } from "./Hydel";
import { Magnets } from "./Magnets";
import { MoonPhases } from "./MoonPhases";
import { PlantGrowth } from "./PlantGrowth";
import { Skeleton } from "./Skeleton";
import { SolarSystem } from "./SolarSystem";
import type { SceneProps } from "./types";
import { WaterCycle } from "./WaterCycle";
import { Weather } from "./Weather";

/** Lesson id (from `LAB_LESSONS`) -> its animated scene. */
export const SCENES: Record<string, ComponentType<SceneProps>> = {
  body: HumanBody,
  plant: PlantGrowth,
  "water-cycle": WaterCycle,
  weather: Weather,
  "day-night": DayNight,
  matter: Matter,
  moon: MoonPhases,
  magnets: Magnets,
  "solar-system": SolarSystem,
  skeleton: Skeleton,
  electricity: Electricity,
  hydel: Hydel,
  butterfly: Butterfly,
  frog: Frog,
  photosynthesis: Photosynthesis,
  germs: Germs,
  light: Light,
  floating: Floating,
};
